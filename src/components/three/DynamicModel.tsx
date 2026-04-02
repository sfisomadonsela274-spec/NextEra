'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface DynamicModelProps {
  url: string;
}

export default function DynamicModel({ url }: DynamicModelProps) {
  const [scene, setScene] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    let cancelled = false;

    async function load() {
      try {
        // Use dynamic import to avoid Turbopack module issues
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();

        const normalizedUrl = url.startsWith('data:') ? url : url;

        loader.load(
          normalizedUrl,
          (gltf) => {
            if (cancelled) return;
            const model = gltf.scene;

            // Auto-scale to fit in ~2 unit bounding box
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
              model.scale.setScalar(2 / maxDim);
            }

            // Center bottom at y=0
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;

            setScene(model);
          },
          undefined,
          () => {
            if (!cancelled) setError(true);
          }
        );
      } catch (err) {
        if (!cancelled) {
          setError(true);
          console.error('[DynamicModel]', err);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (groupRef.current && scene) {
      groupRef.current.add(scene);
    }
    return () => {
      if (groupRef.current && scene) {
        groupRef.current.remove(scene);
      }
    };
  }, [scene]);

  if (error) {
    return (
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
  }

  if (!scene) return null;

  return <group ref={groupRef} />;
}
