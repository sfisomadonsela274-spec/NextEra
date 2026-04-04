'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AnimationIntent } from '@/types';

// Public GLB models with animations
const AVATAR_MODELS = [
  'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
];

// Animation name mapping for RobotExpressive
const ANIMATION_MAP: Record<AnimationIntent['animation'], string> = {
  idle: 'Idle',
  walk: 'Walking',
  wave: 'Wave',
  point: 'Point',
  crouch: 'Crouch',
  posture: 'Standing',
  jump: 'Jump',
  celebrate: 'Celebrate',
  look_around: 'LookAround',
  pick_up: 'PickUp',
  open_door: 'OpenDoor',
};

interface AvatarProps {
  animation: AnimationIntent['animation'];
  onAnimationStart?: (anim: string) => void;
}

export default function Avatar({ animation, onAnimationStart }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const clipsRef = useRef<THREE.AnimationClip[]>([]);
  const rafRef = useRef<number>(0); // Single persistent rAF
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

        for (const url of AVATAR_MODELS) {
          try {
            const gltf = await new Promise<any>((resolve, reject) => {
              loader.load(url, resolve, undefined, reject);
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

            // Center
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;

            // Setup animation mixer
            if (gltf.animations.length > 0) {
              mixerRef.current = new THREE.AnimationMixer(model);
              clipsRef.current = gltf.animations;

              const firstClip = gltf.animations[0];
              const action = mixerRef.current.clipAction(firstClip);
              action.play();
              currentActionRef.current = action;
            }

            groupRef.current!.add(model);
            setLoaded(true);
            return;
          } catch {
            continue;
          }
        }

        if (!cancelled) setError(true);
      } catch (err) {
        console.error('[Avatar] Load error:', err);
        if (!cancelled) setError(true);
      }
    }

    loadModel();
    return () => { cancelled = true; };
  }, []);

  // Single persistent animation frame loop — runs for the lifetime of the component
  // Works for both GLB model mixer AND procedural humanoid
  useEffect(() => {
    const clock = new THREE.Clock();

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const delta = clock.getDelta();
      mixerRef.current?.update(delta);
    }

    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Handle animation changes (GLB model clips)
  useEffect(() => {
    if (!mixerRef.current || !currentActionRef.current) return;

    const targetName = ANIMATION_MAP[animation];
    const clips = clipsRef.current;

    let targetClip: THREE.AnimationClip | null = null;

    for (const clip of clips as THREE.AnimationClip[]) {
      if (clip.name.toLowerCase().includes(targetName.toLowerCase())) {
        targetClip = clip;
        break;
      }
    }

    if (!targetClip) {
      const lower = targetName.toLowerCase();
      if (animation === 'idle') {
        for (const clip of clips) {
          const name = clip.name.toLowerCase();
          if (name.includes('idle') || name.includes('stand') || name.includes('rest')) {
            targetClip = clip;
            break;
          }
        }
      } else if (animation === 'walk') {
        for (const clip of clips) {
          const name = clip.name.toLowerCase();
          if (name.includes('walk') || name.includes('run') || name.includes('move')) {
            targetClip = clip;
            break;
          }
        }
      }
    }

    if (targetClip) {
      const newAction = mixerRef.current.clipAction(targetClip);
      newAction.reset().fadeIn(0.3).play();
      currentActionRef.current?.fadeOut(0.3);
      currentActionRef.current = newAction;
    }

    onAnimationStart?.(animation);
  }, [animation, onAnimationStart]);

  // Fallback procedural humanoid when model fails to load
  if (error) {
    return <ProceduralHumanoid animation={animation} />;
  }

  if (!loaded) {
    return (
      <group ref={groupRef} position={[0, -0.5, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#a855f7" wireframe />
        </mesh>
      </group>
    );
  }

  return <group ref={groupRef} />;
}

// Procedural humanoid fallback
function ProceduralHumanoid({ animation }: { animation: AnimationIntent['animation'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const animRef = useRef<{ time: number }>({ time: 0 });
  const partsRef = useRef<{
    torso: THREE.Mesh | null;
    head: THREE.Mesh | null;
    leftShoulder: THREE.Group | null;
    rightShoulder: THREE.Group | null;
    leftHip: THREE.Group | null;
    rightHip: THREE.Group | null;
    rightHand: THREE.Mesh | null;
  }>({ torso: null, head: null, leftShoulder: null, rightShoulder: null, leftHip: null, rightHip: null, rightHand: null });

  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    const skinMat = new THREE.MeshStandardMaterial({ color: '#FDB07D', roughness: 0.8 });
    const clothMat = new THREE.MeshStandardMaterial({ color: '#3B82F6', roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#1E3A8A', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#1F2937', roughness: 0.6 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skinMat);
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);
    partsRef.current.head = head;

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), clothMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    group.add(torso);
    partsRef.current.torso = torso;

    // Arms
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.2, 1.3, 0);
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), clothMat);
    leftArm.position.y = -0.15;
    leftShoulder.add(leftArm);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
    leftHand.position.y = -0.32;
    leftShoulder.add(leftHand);
    group.add(leftShoulder);
    partsRef.current.leftShoulder = leftShoulder;

    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.2, 1.3, 0);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), clothMat);
    rightArm.position.y = -0.15;
    rightShoulder.add(rightArm);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
    rightHand.position.y = -0.32;
    rightShoulder.add(rightHand);
    group.add(rightShoulder);
    partsRef.current.rightShoulder = rightShoulder;
    partsRef.current.rightHand = rightHand;

    // Legs
    const leftHip = new THREE.Group();
    leftHip.position.set(-0.08, 0.9, 0);
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), pantsMat);
    leftLeg.position.y = -0.2;
    leftHip.add(leftLeg);
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.15), shoeMat);
    leftFoot.position.set(0, -0.42, 0.03);
    leftHip.add(leftFoot);
    group.add(leftHip);
    partsRef.current.leftHip = leftHip;

    const rightHip = new THREE.Group();
    rightHip.position.set(0.08, 0.9, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), pantsMat);
    rightLeg.position.y = -0.2;
    rightHip.add(rightLeg);
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.15), shoeMat);
    rightFoot.position.set(0, -0.42, 0.03);
    rightHip.add(rightFoot);
    group.add(rightHip);
    partsRef.current.rightHip = rightHip;

    return () => { group.remove(...group.children); };
  }, []);

  // Animation loop — resets time safely when animation prop changes
  useEffect(() => {
    if (!groupRef.current) return;

    // Reset time when animation changes so procedural motions feel fresh
    animRef.current.time = 0;

    const clock = new THREE.Clock();
    let frameId = 0;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function tick() {
      frameId = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      animRef.current.time += dt;

      const t = animRef.current.time;
      const { torso, head, leftShoulder, rightShoulder, leftHip, rightHip } = partsRef.current;
      if (!torso || !head || !leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

      const rhs = partsRef.current.rightHand;

      switch (animation) {
        case 'idle': {
          const breathe = Math.sin(t * 2) * 0.01;
          torso.position.y = 1.1 + breathe;
          head.position.y = 1.5 + breathe * 0.5;
          leftShoulder.rotation.z = lerp(leftShoulder.rotation.z, 0, 0.1);
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, 0, 0.1);
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0, 0.1);
          break;
        }
        case 'walk': {
          const swing = Math.sin(t * 4) * 0.4;
          leftHip.rotation.x = swing;
          rightHip.rotation.x = -swing;
          leftShoulder.rotation.x = -swing * 0.5;
          rightShoulder.rotation.x = swing * 0.5;
          groupRef.current!.position.y = Math.abs(Math.sin(t * 4)) * 0.03;
          break;
        }
        case 'wave': {
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, -Math.PI * 0.8, 0.15);
          rightShoulder.rotation.x = lerp(rightShoulder.rotation.x, 0.3, 0.15);
          if (rightShoulder.rotation.z < -Math.PI * 0.5) {
            rightShoulder.children[1].position.x = Math.sin(t * 12) * 0.05;
          }
          leftShoulder.rotation.z = lerp(leftShoulder.rotation.z, 0, 0.1);
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0, 0.1);
          break;
        }
        case 'point': {
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, -Math.PI * 0.3, 0.15);
          rightShoulder.rotation.x = lerp(rightShoulder.rotation.x, -Math.PI / 2, 0.15);
          leftShoulder.rotation.x = lerp(leftShoulder.rotation.x, 0.1, 0.1);
          head.rotation.x = lerp(head.rotation.x, 0.2, 0.1);
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0, 0.1);
          break;
        }
        case 'crouch': {
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0.5, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0.5, 0.1);
          leftShoulder.rotation.x = lerp(leftShoulder.rotation.x, -0.2, 0.1);
          rightShoulder.rotation.x = lerp(rightShoulder.rotation.x, -0.2, 0.1);
          groupRef.current!.position.y = lerp(groupRef.current!.position.y, -0.3, 0.1);
          torso.position.y = lerp(torso.position.y, 0.8, 0.1);
          head.position.y = lerp(head.position.y, 1.2, 0.1);
          break;
        }
        case 'posture': {
          const chestUp = 1.18 + Math.sin(t * 0.5) * 0.02;
          torso.position.y = lerp(torso.position.y, chestUp, 0.1);
          head.position.y = lerp(head.position.y, 1.6, 0.1);
          leftShoulder.rotation.z = lerp(leftShoulder.rotation.z, -0.15, 0.1);
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, 0.15, 0.1);
          leftShoulder.rotation.x = lerp(leftShoulder.rotation.x, -0.1, 0.1);
          rightShoulder.rotation.x = lerp(rightShoulder.rotation.x, -0.1, 0.1);
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0, 0.1);
          head.rotation.x = lerp(head.rotation.x, 0, 0.1);
          break;
        }
        case 'jump': {
          const phase = (t * 3) % (Math.PI * 2);
          const jumpHeight = Math.max(0, Math.sin(phase));
          groupRef.current!.position.y = jumpHeight * 0.3;
          if (jumpHeight < 0.1) {
            leftHip.rotation.x = lerp(leftHip.rotation.x, 0.6, 0.1);
            rightHip.rotation.x = lerp(rightHip.rotation.x, 0.6, 0.1);
          } else {
            leftHip.rotation.x = lerp(leftHip.rotation.x, -0.3, 0.1);
            rightHip.rotation.x = lerp(rightHip.rotation.x, -0.3, 0.1);
          }
          leftShoulder.rotation.z = lerp(leftShoulder.rotation.z, jumpHeight > 0.1 ? -Math.PI * 0.6 : 0, 0.15);
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, jumpHeight > 0.1 ? Math.PI * 0.6 : 0, 0.15);
          break;
        }
        case 'celebrate': {
          const armSwing = Math.sin(t * 4) * 0.3;
          leftShoulder.rotation.z = lerp(leftShoulder.rotation.z, -Math.PI * 0.7 + armSwing, 0.15);
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, Math.PI * 0.7 + armSwing, 0.15);
          head.rotation.y = Math.sin(t * 2) * 0.3;
          groupRef.current!.position.y = Math.abs(Math.sin(t * 8)) * 0.08;
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0, 0.1);
          break;
        }
        case 'look_around': {
          head.rotation.y = Math.sin(t * 1.2) * 0.8;
          head.rotation.x = Math.sin(t * 0.6) * 0.15;
          torso.rotation.y = Math.sin(t * 0.8) * 0.2;
          leftShoulder.rotation.z = lerp(leftShoulder.rotation.z, 0, 0.1);
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, 0, 0.1);
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0, 0.1);
          break;
        }
        case 'pick_up': {
          const lerpTarget = Math.sin(t * 2) * 0.5;
          leftHip.rotation.x = lerp(leftHip.rotation.x, lerpTarget * 0.8, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, lerpTarget * 0.8, 0.1);
          torso.position.y = lerp(torso.position.y, 0.7 + lerpTarget * -0.2, 0.1);
          head.position.y = lerp(head.position.y, 1.1, 0.1);
          leftShoulder.rotation.x = lerp(leftShoulder.rotation.x, lerpTarget * 1.5, 0.15);
          rightShoulder.rotation.x = lerp(rightShoulder.rotation.x, lerpTarget * 1.5, 0.15);
          groupRef.current!.position.y = lerp(groupRef.current!.position.y, lerpTarget * -0.15, 0.1);
          break;
        }
        case 'open_door': {
          const reachT = (Math.sin(t * 1.5) + 1) / 2;
          rightShoulder.rotation.z = lerp(rightShoulder.rotation.z, -Math.PI * 0.3, reachT * 0.15 + 0.05);
          rightShoulder.rotation.x = lerp(rightShoulder.rotation.x, -Math.PI / 3, reachT * 0.15 + 0.05);
          if (rhs) {
            rhs.position.z = Math.sin(t * 1.5) * 0.15;
          }
          torso.rotation.y = lerp(torso.rotation.y, reachT * 0.3, 0.1);
          head.rotation.y = lerp(head.rotation.y, reachT * 0.2, 0.1);
          leftShoulder.rotation.z = lerp(leftShoulder.rotation.z, 0, 0.1);
          leftHip.rotation.x = lerp(leftHip.rotation.x, 0, 0.1);
          rightHip.rotation.x = lerp(rightHip.rotation.x, 0, 0.1);
          break;
        }
      }
    }

    tick();
    return () => cancelAnimationFrame(frameId);
  }, [animation]);

  return <group ref={groupRef} />;
}
