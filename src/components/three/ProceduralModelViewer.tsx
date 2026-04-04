'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { generateProceduralModel, type GeneratedModelData } from '@/lib/procedural-model';

interface ProceduralModelViewerProps {
  prompt: string;
  onModelGenerated?: (data: GeneratedModelData) => void;
  onDescriptionGenerated?: (desc: string) => void;
}

export default function ProceduralModelViewer({
  prompt,
  onModelGenerated,
  onDescriptionGenerated,
}: ProceduralModelViewerProps) {
  const [modelData, setModelData] = useState<GeneratedModelData | null>(null);
  const [loading, setLoading] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!prompt) return;

    let cancelled = false;
    setLoading(true);

    async function build() {
      try {
        // ── Try server AI classification (HF via API route) ───────
        let classification: {
          category: string;
          description: string;
          material: { color: string; metalness: number; roughness: number };
          geometry?: string;
        } | null = null;

        try {
          const res = await fetch('/api/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });

          if (res.ok) {
            const apiData = await res.json();
            classification = {
              ...apiData.classification,
              geometry: prompt.toLowerCase(),
            };
            onDescriptionGenerated?.(apiData.summary ?? apiData.classification.description);
          }
        } catch {
          console.warn('[ProceduralModel] /api/classify failed, falling back');
        }

        // ── Local fallback ───────
        if (!classification) {
          const { generateObjectDescription } = await import('@/lib/ollama');
          const local = await generateObjectDescription(prompt);
          classification = {
            category: local.category,
            description: local.description,
            material: local.material,
            geometry: local.geometry,
          };
          onDescriptionGenerated?.(local.description);
        }

        // Procedural model
        const data = await generateProceduralModel(prompt, classification as Required<typeof classification>);
        if (cancelled) return;
        setModelData(data);
        onModelGenerated?.(data);
      } catch (err) {
        console.error('[ProceduralModel]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    build();
    return () => { cancelled = true; };
  }, [prompt, onModelGenerated, onDescriptionGenerated]);

  // Attach/detach
  useEffect(() => {
    if (!modelData || !groupRef.current) return;

    if (modelRef.current) {
      groupRef.current.remove(modelRef.current);
    }

    modelRef.current = modelData.geometry;
    groupRef.current.add(modelData.geometry);

    return () => {
      if (modelRef.current && groupRef.current) {
        groupRef.current.remove(modelRef.current);
      }
    };
  }, [modelData]);

  if (loading) {
    return (
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#8B5CF6" wireframe />
      </mesh>
    );
  }

  if (!modelData) {
    return (
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#6B7280" />
      </mesh>
    );
  }

  return <group ref={groupRef} />;
}
