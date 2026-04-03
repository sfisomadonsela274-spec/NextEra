'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { AnimationIntent } from '@/types';

// ─── Animation name mapping for GLB models (when available) ──────────────────

const ANIMATION_MAP: Record<AnimationIntent['animation'], string> = {
  idle: 'Idle',
  walk: 'Walking',
  wave: 'Wave',
  point: 'Point',
  crouch: 'Crouch',
};

interface AvatarProps {
  animation: AnimationIntent['animation'];
  targetPosition?: [number, number, number];
  onAnimationStart?: (anim: string) => void;
}

export default function Avatar({ animation, targetPosition, onAnimationStart }: AvatarProps) {
  // Always use the procedural humanoid — it's instant and responsive.
  return <ProceduralHumanoid animation={animation} targetPosition={targetPosition} onAnimationStart={onAnimationStart} />;
}

// ─── Procedural humanoid ────────────────────────────────────────────────────

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
