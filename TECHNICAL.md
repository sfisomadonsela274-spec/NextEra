# NexEra AI Training Platform — Technical Explanation

## What We Built

NexEra is an interactive AI-powered training platform demonstrating two core capabilities for human training scenarios:

1. **AI-Generated 3D Asset Pipeline** — Text descriptions → procedural 3D models with AI-generated educational context
2. **Natural Language Avatar Animation** — Voice/text commands mapped to animated humanoid characters

---

## Architecture & AI Logic

### 3D Generation Pipeline

```
User Input → Ollama Classification → Procedural Geometry Builder → Three.js Render
```

**Classification Flow** (`src/lib/ollama.ts`):
- Primary: Ollama local inference with structured JSON output
- Fallback: Keyword-based classification (hardcoded rules for safety equipment, tools, medical, vehicles)

**Procedural Modeling** (`src/lib/procedural-model.ts`):
- Composable geometry functions (hardHat, fireExtinguisher, wrench, etc.)
- Each builder returns a `THREE.Group` with proper materials (metalness, roughness)
- Auto-centering and scaling to fit a 2-unit bounding box

**Rendering** (`src/components/three/SceneCanvas.tsx`):
- React Three Fiber with @react-three/drei Stage/OrbitControls
- Dynamic imports (no SSR) to avoid Three.js hydration issues

### Avatar Animation System

```
Command → Keyword Detection → Animation State → Avatar Render
```

**Intent Mapping** (`src/lib/openai.ts`):
- Keyword matching against animation categories (walk, wave, point, crouch, idle)
- Multilingual support (English + Chinese keywords)
- Confidence scoring

**Avatar Component** (`src/components/three/Avatar.tsx`):
- Primary: Loads GLB from threejs.org examples (RobotExpressive)
- Fallback: Procedural humanoid built from BoxGeometry/SphereGeometry primitives
- AnimationMixer for GLB animations, manual lerp-based animation for procedural

---

## Why This Approach

**Procedural over AI-Generated Meshes**: Real AI mesh generation (Meshy.ai, Tripo) requires external paid APIs. Procedural geometry is free, instant, and deterministic — better for a demo. It also allows precise control over training-appropriate shapes.

**Ollama over OpenAI**: Local inference is free, private, and has no rate limits. The structured JSON output pattern works well for classification tasks. The fallback system ensures the app works even without Ollama running.

**Keyword over LLM Intent**: For a bounded set of 5 animations, keyword matching is faster, more predictable, and requires no AI call. LLM would add latency and inconsistency for simple mapping tasks.

---

## Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Three.js SSR incompatibility | Dynamic imports with `next/dynamic` and `ssr: false` |
| AI service unavailable | Keyword-based fallback classification system |
| GLB model loading failure | Procedural humanoid fallback with same animation system |
| Cross-browser 3D performance | AdaptiveDpr, adaptive event handling via @react-three/drei |

---

## Scaling Within NexEra's Platform

To productionize these capabilities:

**3D Generation**:
- Integrate Meshy.ai or Tripo API for AI-generated meshes (they offer free tiers)
- Add GLB export via GLTFExporter
- Implement image-to-3D using uploaded photos
- Store generated assets in object storage (S3/R2) with CDN delivery

**Avatar Animation**:
- Connect to Mixamo API for realistic motion-captured animations
- Add spatial awareness: avatar walks to pointed locations, interacts with scene objects
- Multi-avatar orchestration for group training scenarios
- Text-to-speech (Web Speech API or ElevenLabs) so avatars narrate training steps

**Platform Layer**:
- User authentication and progress tracking
- Scenario builder: chain animations + 3D models into training modules
- Assessment engine: quiz integration with 3D visual questions
- Real-time collaboration: multiple trainees in the same 3D scene

**Infrastructure**:
- 3D model generation is compute-heavy → queue with Redis + worker nodes
- Scene state coordination via WebSocket for multi-user
- Edge caching for 3D assets (Cloudflare Workers + R2)