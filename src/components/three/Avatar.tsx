'use client';

import { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { AnimationIntent } from '@/types';

interface AvatarProps {
  animation: AnimationIntent['animation'];
  targetPosition?: [number, number, number];
  onAnimationStart?: (anim: string) => void;
  avatarGlbUrl?: string;
}

export default function Avatar({ animation, targetPosition, onAnimationStart, avatarGlbUrl }: AvatarProps) {
  if (avatarGlbUrl) {
    return <RpmAvatar animation={animation} targetPosition={targetPosition} onAnimationStart={onAnimationStart} avatarGlbUrl={avatarGlbUrl} />;
  }
  return <ProceduralHumanoid animation={animation} targetPosition={targetPosition} onAnimationStart={onAnimationStart} />;
}

// ─── Ready Player Me GLB avatar with procedural animation ────────────────────

function RpmAvatar({ animation, targetPosition, onAnimationStart, avatarGlbUrl }: { animation: AnimationIntent['animation']; targetPosition?: [number, number, number]; onAnimationStart?: (anim: string) => void; avatarGlbUrl: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const bonesRef = useRef<Record<string, THREE.Object3D | null> | null>(null);
  const animState = useRef({ time: 0, currentAnimation: animation });
  const targetRef = useRef(targetPosition);

  // Sync
  useEffect(() => { targetRef.current = targetPosition; }, [targetPosition]);
  useEffect(() => { animState.current.currentAnimation = animation; onAnimationStart?.(animation); }, [animation, onAnimationStart]);

  // Load GLB
  const { scene, animations } = useGLTF(avatarGlbUrl);

  // Extract bone references on first load
  useEffect(() => {
    if (!groupRef.current) return;
    const bones: Record<string, THREE.Object3D> = {};
    scene.traverse(obj => {
      if (obj.name) bones[obj.name] = obj;
    });
    bonesRef.current = bones;
    groupRef.current.add(scene.clone());
  }, [scene]);

  // Animation loop
  useEffect(() => {
    const bones = bonesRef.current;
    if (!bones) return;

    const clock = new THREE.Clock();
    let frameId: number;

    // Find standard RPM bone names (case-insensitive)
    const find = (...names: string[]) => {
      for (const n of names) {
        for (const key of Object.keys(bones)) {
          if (key.toLowerCase().includes(n.toLowerCase())) return bones[key]!;
        }
      }
      return null;
    };

    const spine = find('Spine', 'Hips', 'Torso')!;
    const head = find('Head', 'head')!;
    const leftArm = find('LeftArm', 'LeftShoulder', 'LeftForeArm', 'Left_Shoulder')!;
    const rightArm = find('RightArm', 'RightShoulder', 'RightForeArm', 'Right_Shoulder')!;
    const leftLeg = find('LeftUpLeg', 'LeftLeg', 'LeftThigh', 'Left_UpLeg', 'Left_Shin')!;
    const rightLeg = find('RightUpLeg', 'RightLeg', 'RightThigh', 'Right_UpLeg', 'Right_Shin')!;

    if (!spine || !head || !leftArm || !rightArm || !leftLeg || !rightLeg) return;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function tick() {
      frameId = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      animState.current.time += dt;

      const t = animState.current.time;
      const anim = animState.current.currentAnimation;
      const group = groupRef.current!;

      switch (anim) {
        case 'idle': {
          const breathe = Math.sin(t * 2) * 0.01;
          head.rotation.x = lerp(head.rotation.x, 0.01, 0.1);
          head.rotation.z = lerp(head.rotation.z, 0, 0.1);
          leftArm.rotation.x = lerp(leftArm.rotation.x, 0, 0.1);
          leftArm.rotation.z = lerp(leftArm.rotation.z, -0.05, 0.1);
          rightArm.rotation.x = lerp(rightArm.rotation.x, 0, 0.1);
          rightArm.rotation.z = lerp(rightArm.rotation.z, 0.05, 0.1);
          leftLeg.rotation.x = lerp(leftLeg.rotation.x, 0, 0.1);
          rightLeg.rotation.x = lerp(rightLeg.rotation.x, 0, 0.1);
          spine.rotation.y = lerp(spine.rotation.y, Math.sin(t * 0.5) * 0.02, 0.05);
          spine.position.y = lerp(spine.position.y, spine.position.y + breathe * 0.5, 0.1);
          group.position.y = lerp(group.position.y, 0, 0.1);
          break;
        }
        case 'walk': {
          const swing = Math.sin(t * 4) * 0.4;
          leftLeg.rotation.x = lerp(leftLeg.rotation.x, swing, 0.15);
          rightLeg.rotation.x = lerp(rightLeg.rotation.x, -swing, 0.15);
          leftArm.rotation.x = lerp(leftArm.rotation.x, -swing * 0.5, 0.15);
          rightArm.rotation.x = lerp(rightArm.rotation.x, swing * 0.5, 0.15);
          leftArm.rotation.z = lerp(leftArm.rotation.z, 0, 0.1);
          rightArm.rotation.z = lerp(rightArm.rotation.z, 0, 0.1);
          head.rotation.x = lerp(head.rotation.x, 0, 0.1);
          spine.rotation.y = lerp(spine.rotation.y, 0, 0.1);
          group.position.y = Math.abs(Math.sin(t * 4)) * 0.03;

          // Move toward target
          const target = targetRef.current;
          if (target) {
            const dx = target[0] - group.position.x;
            const dz = target[2] - group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 0.05) {
              group.position.x += (dx / dist) * 0.8 * dt;
              group.position.z += (dz / dist) * 0.8 * dt;
              group.rotation.y = Math.atan2(dx, dz);
            }
          }
          break;
        }
        case 'wave': {
          rightArm.rotation.z = lerp(rightArm.rotation.z, -Math.PI * 0.8, 0.15);
          rightArm.rotation.x = lerp(rightArm.rotation.x, 0.3, 0.15);
          leftArm.rotation.z = lerp(leftArm.rotation.z, 0, 0.1);
          leftArm.rotation.x = lerp(leftArm.rotation.x, 0, 0.1);
          leftLeg.rotation.x = lerp(leftLeg.rotation.x, 0, 0.1);
          rightLeg.rotation.x = lerp(rightLeg.rotation.x, 0, 0.1);
          head.rotation.x = lerp(head.rotation.x, 0, 0.1);
          spine.rotation.y = lerp(spine.rotation.y, 0, 0.1);
          group.position.y = lerp(group.position.y, 0, 0.1);
          break;
        }
        case 'point': {
          rightArm.rotation.z = lerp(rightArm.rotation.z, -Math.PI * 0.3, 0.15);
          rightArm.rotation.x = lerp(rightArm.rotation.x, -Math.PI / 2, 0.15);
          leftArm.rotation.x = lerp(leftArm.rotation.x, 0, 0.1);
          leftArm.rotation.z = lerp(leftArm.rotation.z, 0, 0.1);
          leftLeg.rotation.x = lerp(leftLeg.rotation.x, 0, 0.1);
          rightLeg.rotation.x = lerp(rightLeg.rotation.x, 0, 0.1);
          head.rotation.x = lerp(head.rotation.x, 0.1, 0.1);
          spine.rotation.y = lerp(spine.rotation.y, 0, 0.1);
          group.position.y = lerp(group.position.y, 0, 0.1);
          break;
        }
        case 'crouch': {
          leftLeg.rotation.x = lerp(leftLeg.rotation.x, 0.5, 0.15);
          rightLeg.rotation.x = lerp(rightLeg.rotation.x, 0.5, 0.15);
          leftArm.rotation.x = lerp(leftArm.rotation.x, -0.2, 0.1);
          rightArm.rotation.x = lerp(rightArm.rotation.x, -0.2, 0.1);
          leftArm.rotation.z = lerp(leftArm.rotation.z, 0, 0.1);
          rightArm.rotation.z = lerp(rightArm.rotation.z, 0, 0.1);
          head.rotation.x = lerp(head.rotation.x, 0.2, 0.1);
          spine.rotation.y = lerp(spine.rotation.y, 0, 0.1);
          group.position.y = lerp(group.position.y, -0.3, 0.1);
          break;
        }
      }
    }

    tick();
    return () => cancelAnimationFrame(frameId);
  }, [animations]); // re-run if animations change (new GLB loaded)

  return <group ref={groupRef} />;
}

// ─── Procedural humanoid (fallback when no RPM avatar) ───────────────────────

function ProceduralHumanoid({ animation, targetPosition, onAnimationStart }: { animation: AnimationIntent['animation']; targetPosition?: [number, number, number]; onAnimationStart?: (anim: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const animState = useRef({ time: 0, currentAnimation: animation });
  const targetRef = useRef(targetPosition);

  // Sync target position
  useEffect(() => {
    targetRef.current = targetPosition;
  }, [targetPosition]);

  // Sync animation
  useEffect(() => {
    animState.current.currentAnimation = animation;
    onAnimationStart?.(animation);
  }, [animation, onAnimationStart]);

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

    // Head
    const head = new THREE.Group();
    head.position.y = 1.5;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skinMat);
    headMesh.castShadow = true;
    head.add(headMesh);
    group.add(head);
    parts.head = head;

    // Torso
    const torso = new THREE.Group();
    torso.position.y = 1.1;
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), clothMat);
    torsoMesh.castShadow = true;
    torso.add(torsoMesh);
    group.add(torso);
    parts.torso = torso;

    // Left arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.2, 1.3, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), clothMat);
    lArm.position.y = -0.15;
    lArm.castShadow = true;
    leftArm.add(lArm);
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
    lHand.position.y = -0.32;
    lHand.castShadow = true;
    leftArm.add(lHand);
    group.add(leftArm);
    parts.leftArm = leftArm;

    // Right arm
    const rightArm = new THREE.Group();
    rightArm.position.set(0.2, 1.3, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), clothMat);
    rArm.position.y = -0.15;
    rArm.castShadow = true;
    rightArm.add(rArm);
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
    rHand.position.y = -0.32;
    rHand.castShadow = true;
    rightArm.add(rHand);
    group.add(rightArm);
    parts.rightArm = rightArm;

    // Left leg
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.08, 0.9, 0);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), pantsMat);
    lLeg.position.y = -0.2;
    lLeg.castShadow = true;
    leftLeg.add(lLeg);
    const lFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.15), shoeMat);
    lFoot.position.set(0, -0.42, 0.03);
    lFoot.castShadow = true;
    leftLeg.add(lFoot);
    group.add(leftLeg);
    parts.leftLeg = leftLeg;

    // Right leg
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.08, 0.9, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), pantsMat);
    rLeg.position.y = -0.2;
    rLeg.castShadow = true;
    rightLeg.add(rLeg);
    const rFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.15), shoeMat);
    rFoot.position.set(0, -0.42, 0.03);
    rFoot.castShadow = true;
    rightLeg.add(rFoot);
    group.add(rightLeg);
    parts.rightLeg = rightLeg;

    // Animation loop — reads current animation from ref so it responds immediately
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

          // Move toward target
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
          // Waving hand wiggle
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
