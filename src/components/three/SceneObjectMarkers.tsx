'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneObject } from '@/types';

interface SceneObjectMarkersProps {
  objects: SceneObject[];
  activeId?: string;
}

// Colors for different object types
const TYPE_COLORS: Record<string, string> = {
  safety: '#22c55e',
  medical: '#ef4444',
  tool: '#6b7280',
  furniture: '#8b5cf6',
};

function SceneMarker({ obj, active }: { obj: SceneObject; active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = TYPE_COLORS[obj.type] || '#6366f1';

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={obj.position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.8 : 0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
      {active && (
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      <Html center position={[0, 0.35, 0]}>
        <div
          style={{
            background: 'rgba(0,0,0,0.75)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            color: 'white',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {obj.label}
        </div>
      </Html>
    </group>
  );
}

export default function SceneObjectMarkers({ objects, activeId }: SceneObjectMarkersProps) {
  return (
    <group>
      {objects.map(obj => (
        <SceneMarker key={obj.id} obj={obj} active={obj.id === activeId} />
      ))}
    </group>
  );
}