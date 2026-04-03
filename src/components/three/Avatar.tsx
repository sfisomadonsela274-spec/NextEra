'use client';

import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AnimationIntent } from '@/types';

const MODEL_URL = 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

// Map our animation intents to RobotExpressive clip names
const ANIMATION_MAP: Record<AnimationIntent['animation'], string[]> = {
  idle: ['Idle'],
  walk: ['Walk', 'Walking'],
  wave: ['Wave'],
  point: ['Point'],
  crouch: ['Crouch'],
};

interface AvatarProps {
  animation: AnimationIntent['animation'];
  targetPosition?: [number, number, number];
  onAnimationStart?: (anim: string) => void;
  avatarGlbUrl?: string;
}

export default function Avatar({ animation, targetPosition, onAnimationStart }: AvatarProps) {
  return <RobotAvatar animation={animation} targetPosition={targetPosition} onAnimationStart={onAnimationStart} />;
}

// ─── RobotExpressive GLB avatar with built-in animations ─────────────────────

function RobotAvatar({ animation, targetPosition, onAnimationStart }: { animation: AnimationIntent['animation']; targetPosition?: [number, number, number]; onAnimationStart?: (anim: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const clipsRef = useRef<THREE.AnimationClip[]>([]);
  const targetRef = useRef(targetPosition);
  const lastActionRef = useRef('');

  useEffect(() => { targetRef.current = targetPosition; }, [targetPosition]);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Load GLB model
  useEffect(() => {
    if (!groupRef.current) return;
    let cancelled = false;

    async function loadModel() {
      try {
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();

        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(MODEL_URL, resolve, undefined, reject);
        });

        if (cancelled) return;

        const model = gltf.scene;

        // Auto-scale to fit ~2 units
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          model.scale.setScalar(2 / maxDim);
        }

        // Center: bottom sits on y=0
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;

        // Setup animation mixer
        if (gltf.animations.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(model);
          clipsRef.current = gltf.animations;

          // Play first animation (Idle)
          const idleClip = gltf.animations.find((c: THREE.AnimationClip) =>
            c.name.toLowerCase().includes('idle')
          ) || gltf.animations[0];
          const action = mixerRef.current.clipAction(idleClip);
          action.play();
          currentActionRef.current = action;
          lastActionRef.current = idleClip.name;
        }

        // Enable shadows
        model.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        (groupRef.current as THREE.Group).add(model);
        setLoaded(true);
      } catch (err) {
        console.error('[RobotAvatar] Load error:', err);
        if (!cancelled) setError(true);
      }
    }

    loadModel();
    return () => { cancelled = true; };
  }, []);

  // Handle animation changes
  useEffect(() => {
    if (!mixerRef.current || !currentActionRef.current) return;
    if (lastActionRef.current.toLowerCase().includes(animation)) return;

    const targetNames = ANIMATION_MAP[animation];
    const clips = clipsRef.current;

    let targetClip: THREE.AnimationClip | null = null;
    for (const clip of clips) {
      const name = clip.name.toLowerCase();
      if (targetNames.some(tn => name.includes(tn.toLowerCase()))) {
        targetClip = clip;
        break;
      }
    }

    if (targetClip) {
      const newAction = mixerRef.current.clipAction(targetClip);
      newAction.reset().fadeIn(0.3).play();
      currentActionRef.current?.fadeOut(0.3);
      currentActionRef.current = newAction;
      lastActionRef.current = targetClip.name;
    }

    onAnimationStart?.(animation);
  }, [animation, onAnimationStart]);

  // Update mixer each frame
  useEffect(() => {
    if (!mixerRef.current) return;
    const clock = new THREE.Clock();
    let frameId: number;

    function tick() {
      frameId = requestAnimationFrame(tick);
      mixerRef.current?.update(clock.getDelta());

      // Walk toward target position
      const target = targetRef.current;
      const group = groupRef.current;
      if (target && group) {
        const dx = target[0] - group.position.x;
        const dz = target[2] - group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.05) {
          const speed = 0.8;
          group.position.x += (dx / dist) * speed * clock.getDelta();
          group.position.z += (dz / dist) * speed * clock.getDelta();
          group.rotation.y = Math.atan2(dx, dz);
    }
      }
    }
    tick();
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Fallback: procedural humanoid
  if (error) {
    return <ProceduralHumanoid animation={animation} targetPosition={targetPosition} onAnimationStart={onAnimationStart} />;
  }

  if (!loaded) {
    return (
      <group ref={groupRef}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#a855f7" wireframe />
        </mesh>
        <Html center position={[0, 0.8, 0]}>
          <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading avatar...</div>
        </Html>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      {/* Walk toward target logic is driven in the animation loop below */}
    </group>
  );
}

// ─── Procedural humanoid (fallback when RobotExpressive fails) ───────────────

function ProceduralHumanoid({ animation, targetPosition, onAnimationStart }: { animation: AnimationIntent['animation']; targetPosition?: [number, number, number]; onAnimationStart?: (anim: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const animState = useRef({ time: 0, currentAnimation: animation });
  const targetRef = useRef(targetPosition);

  useEffect(() => { targetRef.current = targetPosition; }, [targetPosition]);
  useEffect(() => { animState.current.currentAnimation = animation; onAnimationStart?.(animation); }, [animation, onAnimationStart]);

  // Build humanoid once
  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    const skinMat = new THREE.MeshStandardMaterial({ color: '#FDB07D', roughness: 0.8 });
    const clothMat = new THREE.MeshStandardMaterial({ color: '#3B82F6', roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#1E3A8A', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#1F2937', roughness: 0.6 });

    const parts = {
      head: null as THREE.Group | null,
      torso: null as THREE.Group | null,
      leftArm: null as THREE.Group | null,
      rightArm: null as THREE.Group | null,
      leftLeg: null as THREE.Group | null,
      rightLeg: null as THREE.Group | null,
    };

    const head = new THREE.Group(); head.position.y = 1.5;
    head.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skinMat), { castShadow: true }));
    group.add(head); parts.head = head;

    const torso = new THREE.Group(); torso.position.y = 1.1;
    torso.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), clothMat), { castShadow: true }));
    group.add(torso); parts.torso = torso;

    for (const [side, x] of [['leftArm', -0.2], ['rightArm', 0.2]] as const) {
      const arm = new THREE.Group(); arm.position.set(x, 1.3, 0);
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), clothMat);
      a.position.y = -0.15; a.castShadow = true; arm.add(a);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
      h.position.y = -0.32; h.castShadow = true; arm.add(h);
      group.add(arm); (parts as any)[side] = arm;

    }

    for (const [side, x] of [['leftLeg', -0.08], ['rightLeg', 0.08]] as const) {
      const leg = new THREE.Group(); leg.position.set(x, 0.9, 0);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), pantsMat);
      l.position.y = -0.2; l.castShadow = true; leg.add(l);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.15), shoeMat);
      f.position.set(0, -0.42, 0.03); f.castShadow = true; leg.add(f);
      group.add(leg); (parts as any)[side] = leg;
    }

    const clock = new THREE.Clock();
    let frameId: number;
    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function tick() {
      frameId = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      animState.current.time += dt;

      const t = animState.current.time;
      const anim = animState.current.currentAnimation;
      if (!parts.torso || !parts.head || !parts.leftArm || !parts.rightArm || !parts.leftLeg || !parts.rightLeg) return;

      switch (anim) {
        case 'idle': {
          const breathe = Math.sin(t * 2) * 0.01;
          parts.torso.position.y = lerp(parts.torso.position.y, 1.1 + breathe, 0.1);
          parts.head.position.y = lerp(parts.head.position.y, 1.5 + breathe * 0.5, 0.1);
          parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, 0.1);
          parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, 0.1);
          parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, 0.1);
          parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0, 0.1);
          parts.leftLeg.rotation.x = lerp(parts.leftLeg.rotation.x, 0, 0.1);
          parts.rightLeg.rotation.x = lerp(parts.rightLeg.rotation.x, 0, 0.1);
          group.position.y = lerp(group.position.y, 0, 0.1);
          break;
        }
        case 'walk': {
          const swing = Math.sin(t * 4) * 0.4;
          parts.leftLeg.rotation.x = lerp(parts.leftLeg.rotation.x, swing, 0.15);
          parts.rightLeg.rotation.x = lerp(parts.rightLeg.rotation.x, -swing, 0.15);
          parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -swing * 0.5, 0.15);
          parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, swing * 0.5, 0.15);
          parts.torso.position.y = lerp(parts.torso.position.y, 1.1 + Math.abs(Math.sin(t * 4)) * 0.03, 0.1);
          parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, 0.1);
          parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, 0.1);
          parts.head.rotation.x = lerp(parts.head.rotation.x, 0, 0.1);
          const target = targetRef.current;
          if (target) {
            const dx = target[0] - group.position.x;
            const dz = target[2] - group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 0.05) {
              const speed = 0.8;
              group.position.x += (dx / dist) * speed * dt;
              group.position.z += (dz / dist) * speed * dt;
              group.rotation.y = Math.atan2(dx, dz);
            }
          }
          break;
        }
        case 'wave': {
          parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -Math.PI * 0.8, 0.15);
          parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, 0.3, 0.15);
          parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, 0.1);
          parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0, 0.1);
          parts.leftLeg.rotation.x = lerp(parts.leftLeg.rotation.x, 0, 0.1);
          parts.rightLeg.rotation.x = lerp(parts.rightLeg.rotation.x, 0, 0.1);
          if (parts.rightArm.children.length > 1) {
            parts.rightArm.children[1].position.x = Math.sin(t * 12) * 0.05;
          }
          parts.torso.position.y = lerp(parts.torso.position.y, 1.1, 0.1);
          parts.head.position.y = lerp(parts.head.position.y, 1.5, 0.1);
          group.position.y = lerp(group.position.y, 0, 0.1);
          parts.head.rotation.x = lerp(parts.head.rotation.x, 0, 0.1);
          break;
        }
        case 'point': {
          parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -Math.PI * 0.3, 0.15);
          parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -Math.PI / 2, 0.15);
          parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.1, 0.1);
          parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, 0.1);
          parts.head.rotation.x = lerp(parts.head.rotation.x, 0.2, 0.1);
          parts.leftLeg.rotation.x = lerp(parts.leftLeg.rotation.x, 0, 0.1);
          parts.rightLeg.rotation.x = lerp(parts.rightLeg.rotation.x, 0, 0.1);
          parts.torso.position.y = lerp(parts.torso.position.y, 1.1, 0.1);
          parts.head.position.y = lerp(parts.head.position.y, 1.5, 0.1);
          group.position.y = lerp(group.position.y, 0, 0.1);
          break;
        }
        case 'crouch': {
          parts.leftLeg.rotation.x = lerp(parts.leftLeg.rotation.x, 0.5, 0.15);
          parts.rightLeg.rotation.x = lerp(parts.rightLeg.rotation.x, 0.5, 0.15);
          parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.2, 0.1);
          parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -0.2, 0.1);
          parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0, 0.1);
          parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, 0.1);
          parts.torso.position.y = lerp(parts.torso.position.y, 0.8, 0.15);
          parts.head.position.y = lerp(parts.head.position.y, 1.2, 0.15);
          parts.head.rotation.x = lerp(parts.head.rotation.x, 0.2, 0.1);
          break;
        }
      }
    }

    tick();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return <group ref={groupRef} />;
}
