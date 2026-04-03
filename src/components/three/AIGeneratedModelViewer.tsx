'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { generateWithHunyuan3D } from '@/lib/hunyuan3d';
import { generateObjectDescription } from '@/lib/ollama';
import { Html, useGLTF } from '@react-three/drei';
import { downloadGLB } from '@/lib/procedural-model';

// ─── GLB loader inside R3F context ────────────────────────────────────────────

interface GLBModelProps {
  url: string;
  onLoaded?: () => void;
}

function GLBModel({ url, onLoaded }: GLBModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Clone scene so we can transform it independently
    const clone = scene.clone();

    // Auto-scale to fit ~2 units bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      clone.scale.setScalar(2 / maxDim);
    }

    // Center: move so bottom sits on y=0
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= box.min.y;

    // Enable shadows
    clone.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    groupRef.current.add(clone);
    onLoaded?.();
  }, [scene, onLoaded]);

  return <group ref={groupRef} />;
}

// ─── Progress overlay ─────────────────────────────────────────────────────────

function ProgressOverlay({ message }: { message: string }) {
  return (
    <Html center>
      <div style={{
        background: 'rgba(10, 10, 20, 0.85)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: 12,
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: 200,
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(99,102,241,0.3)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#e8e8f0', fontSize: 13, margin: 0 }}>{message}</p>
      </div>
    </Html>
  );
}

// ─── Main viewer ─────────────────────────────────────────────────────────────

interface AIGeneratedModelViewerProps {
  prompt: string;
  imageUrl?: string;       // base64 data-URL from uploaded image
  onDescriptionGenerated?: (desc: string) => void;
  onModelReady?: () => void;   // called when viewer finishes loading (resets panel spinner)
}

export default function AIGeneratedModelViewer({
  prompt,
  imageUrl,
  onDescriptionGenerated,
  onModelReady,
}: AIGeneratedModelViewerProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Kick off generation whenever prompt changes
  useEffect(() => {
    if (!prompt.trim()) return;

    let cancelled = false;
    const controller = new AbortController();
    abortRef.current = controller;

    setBlob(null);
    setError(null);
    setProgressMsg('Initializing...');

    async function run() {
      try {
        // 1. Get AI classification + description
        const classification = await generateObjectDescription(prompt);
        if (cancelled) return;
        onDescriptionGenerated?.(classification.description);

        // 2. Call Hunyuan3D-2
        const resultBlob = await generateWithHunyuan3D({
          prompt,
          imageBase64: imageUrl,
          onProgress: (msg) => {
            if (!cancelled) setProgressMsg(msg);
          },
          signal: controller.signal,
        });

        if (cancelled) return;

        // 3. Revoke previous object URL, create new one
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        const url = URL.createObjectURL(resultBlob);
        if (cancelled) { URL.revokeObjectURL(url); return; }

        setBlob(resultBlob);
        setObjectUrl(url);
        setProgressMsg('');
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setProgressMsg('');
        }
      }
    }

    run();
    return () => { cancelled = true; controller.abort(); };
  }, [prompt, imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Download handler
  async function handleDownload() {
    if (!blob) return;
    const filename = `nextera-${prompt.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}.glb`;
    downloadGLB(blob, filename);
  }

  // Loading state — show animated placeholder + progress
  if (progressMsg) {
    return (
      <group position={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#6366f1" wireframe />
        </mesh>
        <ProgressOverlay message={progressMsg} />
      </group>
    );
  }

  // Error state
  if (error) {
    return (
      <group position={[0, 0.3, 0]}>
        <Html center>
          <div style={{
            background: 'rgba(20,10,10,0.85)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 12,
            padding: '12px 20px',
            maxWidth: 260,
          }}>
            <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 4px' }}>Generation failed</p>
            <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{error}</p>
          </div>
        </Html>
      </group>
    );
  }

  // Success — render GLB model with download button
  if (objectUrl) {
    return (
      <>
        <GLBModel url={objectUrl} onLoaded={onModelReady} />
        <Html position={[0, -1.0, 0]} center>
          <button
            onClick={handleDownload}
            style={{
              background: 'rgba(99, 102, 241, 0.9)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download GLB
          </button>
        </Html>
      </>
    );
  }

  // Initial idle
  return (
    <mesh position={[0, 0.3, 0]}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color="#6B7280" />
    </mesh>
  );
}
