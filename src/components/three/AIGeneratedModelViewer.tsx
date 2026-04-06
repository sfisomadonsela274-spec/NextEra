'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { generateWithHunyuan3D } from '@/lib/hunyuan3d';
import { generateObjectDescription } from '@/lib/ollama';
import { generateProceduralModel, exportToGLB } from '@/lib/procedural-model';
import { Html, useProgress } from '@react-three/drei';
import { downloadGLB } from '@/lib/procedural-model';

// ─── Direct 3D model render ───────────────────────────────────────────────────

interface ModelProps {
  model: THREE.Group;
  onLoaded?: () => void;
}

function Model({ model, onLoaded }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Clone the model
    const clone = model.clone();

    // Enable shadows
    clone.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    groupRef.current.add(clone);
    onLoaded?.();
  }, [model, onLoaded]);

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

// ─── GLB Loader ───────────────────────────────────────────────────────────────

const gltfLoader = new GLTFLoader();

function loadGLB(blob: Blob): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    gltfLoader.load(
      url,
      (gltf) => {
        URL.revokeObjectURL(url);
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      }
    );
  });
}

// ─── Main viewer ─────────────────────────────────────────────────────────────

interface AIGeneratedModelViewerProps {
  prompt: string;
  imageUrl?: string;       // base64 data-URL from uploaded image
  onDescriptionGenerated?: (desc: string) => void;
  onModelReady?: () => void;   // called when viewer finishes loading (resets panel spinner)
  useAI?: boolean;          // Use Hunyuan3D for real AI-generated models
}

export default function AIGeneratedModelViewer({
  prompt,
  imageUrl,
  onDescriptionGenerated,
  onModelReady,
  useAI = true, // Default to AI generation
}: AIGeneratedModelViewerProps) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Kick off generation whenever prompt changes
  useEffect(() => {
    if (!prompt.trim()) return;

    let cancelled = false;
    const controller = new AbortController();

    setModel(null);
    setBlob(null);
    setError(null);
    setIsGenerating(true);

    async function runAI() {
      setProgressMsg('Analyzing prompt...');

      try {
        // Get AI classification for description
        const classification = await generateObjectDescription(prompt);
        if (cancelled) return;
        onDescriptionGenerated?.(classification.description);

        if (cancelled) return;
        setProgressMsg('Generating 3D model with AI...');

        // Try Hunyuan3D for real 3D generation
        try {
          const glbBlob = await generateWithHunyuan3D({
            prompt,
            imageBase64: imageUrl,
            onProgress: (msg) => {
              if (!cancelled) setProgressMsg(msg);
            },
            signal: controller.signal,
          });

          if (cancelled) return;

          // Load GLB into Three.js
          setProgressMsg('Loading model...');
          const gltfScene = await loadGLB(glbBlob);

          if (cancelled) return;

          // Auto-scale and center
          const box = new THREE.Box3().setFromObject(gltfScene);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            gltfScene.scale.setScalar(2 / maxDim);
          }
          const center = new THREE.Vector3();
          box.getCenter(center);
          gltfScene.position.sub(center);
          gltfScene.position.y -= box.min.y * gltfScene.scale.y;

          setModel(gltfScene);
          setBlob(glbBlob);
          setProgressMsg('');
        } catch (aiErr) {
          // Hunyuan3D failed or timed out - fall back to procedural
          console.warn('Hunyuan3D failed, falling back to procedural:', aiErr);

          if (cancelled) return;
          setProgressMsg('Building fallback model...');

          const result = await generateProceduralModel(prompt, classification);
          if (cancelled) return;

          const resultBlob = await exportToGLB(result.geometry);
          if (cancelled) return;

          setModel(result.geometry);
          setBlob(resultBlob);
          setProgressMsg('');
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setProgressMsg('');
        }
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    }

    async function runProcedural() {
      setProgressMsg('Analyzing prompt...');

      try {
        const classification = await generateObjectDescription(prompt);
        if (cancelled) return;
        onDescriptionGenerated?.(classification.description);

        if (cancelled) return;
        setProgressMsg('Building 3D geometry...');

        const result = await generateProceduralModel(prompt, classification);
        if (cancelled) return;

        const resultBlob = await exportToGLB(result.geometry);
        if (cancelled) return;

        setModel(result.geometry);
        setBlob(resultBlob);
        setProgressMsg('');
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setProgressMsg('');
        }
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    }

    // Choose generation method
    if (useAI) {
      runAI();
    } else {
      runProcedural();
    }

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [prompt, useAI]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Success — render model with download button
  if (model && blob) {
    return (
      <>
        <Model model={model} onLoaded={onModelReady} />
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
