'use client';

import { useGLTF, Center } from '@react-three/drei';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface ModelViewerProps {
  url: string;
  scale?: number;
  className?: string;
}

export default function ModelViewer({ url, scale = 1 }: ModelViewerProps) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const gltf = await new THREE.ObjectLoader().loadAsync(url);
        if (!cancelled) {
          // Auto-scale to reasonable size
          const box = new THREE.Box3().setFromObject(gltf);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = maxDim > 0 ? 2 / maxDim : 1;
          gltf.scale.setScalar(targetScale * scale);
          setModel(gltf);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load 3D model');
          console.error('[ModelViewer]', err);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url, scale]);

  if (error) return null;
  if (!model) return null;

  return (
    <Center>
      <primitive object={model} />
    </Center>
  );
}

// ─── Alternative: useGLTF-based loader for standard GLB files ──────────────────

interface GLBModelProps {
  url: string;
  scale?: number;
}

export function GLBModel({ url, scale = 1 }: GLBModelProps) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.scale.setScalar(scale);
  }, [scene, scale]);

  return <primitive object={scene} />;
}
