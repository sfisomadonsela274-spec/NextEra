# NexEra AI Training Platform — Technical Documentation

## Overview

NexEra demonstrates two interactive AI-powered training prototypes:

| Prototype | What the user does | What the system returns |
|-----------|-------------------|------------------------|
| **Test 1 — AI-Generated 3D Asset** | Types a text description or uploads an image | A real GLB 3D model rendered in a Three.js viewer + AI educational summary |
| **Test 2 — Natural Language Avatar** | Types a command like "walk to the fire extinguisher" | The avatar animates and an AI explanation describes the action |

Both prototypes run entirely in the browser with no paid API keys required.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Next.js                       │
├───────────────────────────┬─────────────────────────────────┤
│  Test 1 — 3D Generation  │  Test 2 — Avatar Animation      │
│                           │                                  │
│  GenerationPanel          │  CommandInput                     │
│    → ollamaGenerate()     │    → mapCommandToAnimation()     │
│      (educational text)    │      (LLM intent + reasoning)    │
│                           │                                   │
│  AIGeneratedModelViewer    │  Avatar (GLB or procedural)      │
│    → Hunyuan3D-2 API       │    → AnimationMixer / lerp        │
│      (real .glb model)     │                                   │
│                           │                                   │
│  Three.js / React Three    │  Three.js / React Three           │
│  Fiber + @react-three/drei │  Fiber + @react-three/drei        │
├───────────────────────────┴─────────────────────────────────┤
│                     Ollama (localhost:11434)                  │
│          Structured JSON for reasoning & classification       │
└─────────────────────────────────────────────────────────────┘
```

---

## Test 1: AI-Generated 3D Asset Pipeline

### User Flow

1. User types a description (e.g., "a yellow hard hat") or uploads an image
2. `GenerationPanel` passes the prompt + optional base64 image to `AIGeneratedModelViewer`
3. `generateObjectDescription()` calls Ollama for an AI classification (category, color, geometry hints) + the educational summary
4. `generateWithHunyuan3D()` submits the task to **Hunyuan3D-2** on HuggingFace Spaces and polls until the `.glb` is ready
5. The GLB blob is loaded into a `<GLBModel>` component via `useGLTF` and rendered in the Three.js canvas
6. The user can **Download GLB** to save the asset

### Hunyuan3D-2 Integration (`src/lib/hunyuan3d.ts`)

Hunyuan3D-2 is a Tencent AI research model hosted free on HuggingFace Spaces at:
`https://huggingface.co/spaces/hysts/Hunyuan3D-2`

**No API key required.** The integration works in 3 steps:

1. **Submit** — POST `{ prompt, image? }` to `/api/submit` → receive `task_id`
2. **Poll** — GET `/api/status/{task_id}` every 5 seconds until `status === "completed"`
3. **Download** — fetch the returned `.glb` URL as a `Blob` and hand it to Three.js

Generation typically takes 30–90 seconds. The `ProgressOverlay` in the viewer shows real-time status messages.

### Why Hunyuan3D-2?

- **Free, no account or billing** — unlike Meshy.ai or Tripo AI which require paid accounts
- **Produces real .glb files** — not procedural approximations
- **Supports image-to-3D** — upload a photo of a real object and get a 3D model
- **Reliable public Space** — hosted by HuggingFace with reasonable rate limits

### Ollama Classification (`src/lib/ollama.ts`)

After submission, Ollama is called with a structured prompt to extract:
- `category` — safety_equipment, tool, medical, vehicle, etc.
- `description` — 2-sentence educational context for the training module
- `geometry` — box / cylinder / sphere / compound (used for the fallback procedural model)
- `material` — color, metalness, roughness (for the fallback model)

If Ollama is unavailable, the system falls back to keyword-based classification.

### Fallback Strategy

If Hunyuan3D-2 fails or times out (5 min max), the system could fall back to the procedural geometry builders in `src/lib/procedural-model.ts`. Currently the viewer shows an error state — a future enhancement would wire the fallback automatically.

### Files

| File | Role |
|------|------|
| `src/components/three/AIGeneratedModelViewer.tsx` | Main viewer: orchestrates generation, renders GLB or error/loading states |
| `src/lib/hunyuan3d.ts` | Hunyuan3D-2 Space API client: submit → poll → download |
| `src/lib/ollama.ts` | Ollama integration for classification + educational summaries |
| `src/components/ui/GenerationPanel.tsx` | Prompt input + image dropzone UI |

---

## Test 2: Natural Language → Avatar Animation

### User Flow

1. User types a command: `"walk to the table"`, `"wave hello"`, `"point at the fire extinguisher"`
2. `mapCommandToAnimation()` sends the command + scene object list to Ollama
3. The LLM reasons about the intent and returns structured JSON: `{ animation, reasoning, target }`
4. `Avatar` receives the `animation` prop and `targetPosition` (if walking/pointing to an object)
5. The avatar plays the animation and the AI explanation is displayed

### LLM Intent Mapping (`src/lib/openai.ts`)

The system uses Ollama with a structured system prompt that:
- Defines the 5 available animations and their meanings
- Lists scene objects with their 3D positions
- Asks for `{ animation, reasoning, target }` JSON output

Example exchange:
```
System: "The avatar supports: idle, walk, wave, point, crouch. Scene objects: "Fire Extinguisher" at [1.5, 0.8, -0.5]..."
User: "walk to the fire extinguisher"
LLM Response: {"animation": "walk", "reasoning": "The user wants the avatar to move towards the fire extinguisher location.", "target": "Fire Extinguisher"}
```

This replaces the fragile keyword/regex matching that was in the original implementation.

### Fallback

If Ollama is unavailable, a simple keyword matcher is used:
- `walk` matched by: walk, come, go, move, forward, approach
- `wave` matched by: wave, hello, hi, greet, say hello
- `point` matched by: point, look, see, indicate, show
- `crouch` matched by: crouch, down, hide, squat, kneel
- `idle` matched by: stop, wait, stay, idle, stand, rest

### Avatar Rendering (`src/components/three/Avatar.tsx`)

**Primary**: Loads `RobotExpressive.glb` from threejs.org via `GLTFLoader` + `THREE.AnimationMixer`

**Fallback**: Procedural humanoid built from Three.js primitives with lerp-based animation:
- `idle` — subtle breathing oscillation
- `walk` — leg/arm swing + lerp position toward `targetPosition`
- `wave` — right arm raised and oscillates
- `point` — right arm extended forward, head tilts
- `crouch` — knees bent, body lowered

### Scene Objects

Five labeled objects are positioned in the scene for targeting:
- Fire Extinguisher → `[1.5, 0.8, -0.5]`
- First Aid Kit → `[-1.2, 0.5, 0.5]`
- Hard Hat → `[0.8, 1.2, 0.8]`
- Wrench → `[-0.5, 0.3, -1.0]`
- Table → `[2.0, 0, 0]`

---

## How This Meets the Requirements

### Test 1 Requirements

| Requirement | Implementation |
|-------------|----------------|
| User text description | `GenerationPanel` text input |
| User image upload | Dropzone → base64 → passed to Hunyuan3D |
| AI processing | Ollama classification + Hunyuan3D-2 text/image-to-3D |
| Visible 3D outcome | Three.js canvas with loaded GLB model |
| User interaction | OrbitControls (rotate, zoom), Download GLB button |
| GLB conversion + materials | Hunyuan3D produces native GLB; auto-center + scale applied |
| Educational summary | Ollama `generateObjectDescription()` with fallback |
| Hosted playable demo | Next.js app deployable to Vercel |

### Test 2 Requirements

| Requirement | Implementation |
|-------------|----------------|
| Interpret text using AI | Ollama LLM with structured JSON output + keyword fallback |
| Map meaning to animation | `mapCommandToAnimation()` → `AnimationIntent` |
| Play animation on 3D avatar | `THREE.AnimationMixer` for GLB; lerp-based for procedural |
| AI explanation of action | LLM `reasoning` field displayed in context panel |
| Camera/scene controls | `OrbitControls` in `SceneCanvas` |
| Hosted playable demo | Next.js app deployable to Vercel |

---

## Running the Project

```bash
npm install
npm run dev
```

**Ollama** must be running at `localhost:11434` for AI features:
```bash
ollama serve
ollama pull minimax-m2.7:cloud
```

If Ollama is not running, both demos fall back to keyword-based logic and procedural models.

---

## Deployment

```bash
npm run build
npm start
```

Deploy to Vercel with `vercel deploy`. No environment variables are required (HuggingFace Spaces needs no key; Ollama falls back gracefully).

---

## Next Steps for Production

**3D Generation**:
- Add automatic fallback to procedural models if Hunyuan3D times out
- Wire Meshy.ai/Tripo AI as premium options for higher-quality output
- Add object storage (S3/R2) for persisting generated GLBs
- Support image upload via URL in addition to base64

**Avatar Animation**:
- Integrate Mixamo API for motion-captured animation clips
- Add text-to-speech (Web Speech API or ElevenLabs) for avatar narration
- Multi-avatar orchestration for group training scenarios
- Spatial pathfinding so avatars navigate around obstacles

**Platform**:
- User authentication and per-user asset/session management
- Scenario builder: chain animations + 3D models into multi-step training modules
- Assessment engine with quiz integration
- Real-time collaboration via WebSocket for multi-user in the same 3D scene
