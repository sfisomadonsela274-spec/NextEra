'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { generateProceduralModel, exportToGLB, downloadGLB, type GeneratedModelData } from '@/lib/procedural-model';
import { generateObjectDescription } from '@/lib/ollama';
import { Html } from '@react-three/drei';

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
  const [downloading, setDownloading] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!prompt) return;

    let cancelled = false;
    setLoading(true);

    async function build() {
      try {
        // Get AI classification
        const classification = await generateObjectDescription(prompt);

        // Generate procedural model
        const data = await generateProceduralModel(prompt, classification);

        if (cancelled) return;

        setModelData(data);
        onModelGenerated?.(data);

        // Generate educational description
        onDescriptionGenerated?.(classification.description);
      } catch (err) {
        console.error('[ProceduralModel]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    build();
    return () => { cancelled = true; };
  }, [prompt, onModelGenerated, onDescriptionGenerated]);

  // Attach/detach model
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

  async function handleDownloadGLB() {
    if (!modelRef.current || downloading) return;
    setDownloading(true);
    try {
      const blob = await exportToGLB(modelRef.current);
      downloadGLB(blob, `${prompt.replace(/\s+/g, '-').toLowerCase()}.glb`);
    } catch (err) {
      console.error('[DownloadGLB]', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <group ref={groupRef}>
      {/* Download button overlay */}
      <Html position={[0, -1.2, 0]} center>
        <button
          onClick={handleDownloadGLB}
          disabled={downloading}
          style={{
            background: 'rgba(99, 102, 241, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: downloading ? 'wait' : 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {downloading ? (
            <>
              <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
              Exporting...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download GLB
            </>
          )}
        </button>
      </Html>
    </group>
  );
}
