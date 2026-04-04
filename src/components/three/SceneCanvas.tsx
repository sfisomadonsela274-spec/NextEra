'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';

interface SceneCanvasProps {
  children: React.ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
}

export default function SceneCanvas({ children, className, cameraPosition = [0, 1.5, 4]: SceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          // Firefox support
          const contentBoxSize = entry.contentBoxSize[0];
          setSize({ width: contentBoxSize.inlineSize, height: contentBoxSize.blockSize });
        } else {
          // Standard
          setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate responsive camera position based on container size
  const getCameraPosition = (): [number, number, number] => {
    const aspectRatio = size.width / size.height;
    const baseDistance = 4;

    // Adjust distance based on aspect ratio to keep object properly framed
    let distance = baseDistance;
    if (aspectRatio > 1.6) { // Wide screen
      distance = baseDistance * (1 + (aspectRatio - 1.6) * 0.3);
    } else if (aspectRatio < 0.6) { // Tall screen
      distance = baseDistance * (1 + (0.6 - aspectRatio) * 0.3);
    }

    return [0, 1.5, distance];
  };

  return (
    <div ref={containerRef} className={className}>
      <Canvas
        camera={{ position: getCameraPosition(), fov: 50 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        <Suspense fallback={null}>
          <Stage
            environment="city"
            intensity={0.6}
            shadows={false}
            adjustCamera={false}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <pointLight position={[-3, 3, 0]} intensity={0.5} color="#a855f7" />
            {children}
          </Stage>
        </Suspense>

        <OrbitControls
          enablePan={false}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}
