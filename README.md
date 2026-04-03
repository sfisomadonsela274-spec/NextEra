# NexEra AI Training Platform

AI-powered 3D learning assets and natural language avatar animation for workplace training scenarios.

**Live Demo**: [https://nextera-rouge.vercel.app](https://nextera-rouge.vercel.app)

## Features

### Test 1: 3D Generation
- **Text-to-3D**: Describe a training object — get a procedural 3D model instantly
- **Keyword classification**: Objects are categorized (safety, tool, medical, vehicle) with correct materials and geometry
- **Procedural modeling**: Hard hats, fire extinguishers, wrenches, first-aid kits, safety vests, ladders — built from Three.js primitives
- **Educational summaries**: Each asset comes with training context explaining its workplace safety use
- **Interactive viewer**: Orbit, zoom, and examine models in a fully lit 3D stage
- **GLB export**: Download generated models as `.glb` files for reuse in other tools

### Test 2: Natural Language → Avatar Animation
- **Command parsing**: Natural language ("wave hello", "walk forward") mapped to 5 animations: idle, walk, wave, point, crouch
- **RobotExpressive avatar**: High-quality animated character from threejs.org with baked Mixamo-style motion clips
- **Procedural fallback**: If the CDN is unreachable, a built-in procedural humanoid takes over
- **Scene targeting**: Commands like "point at the fire extinguisher" resolve to scene object positions
- **Command log**: Tracks history with timestamps, target labels, and animation types
- **Quick commands**: One-click preset buttons for instant testing

## Architecture

```
src/
├── app/page.tsx              # Main UI — tabbed interface (3D Gen + Avatar)
├── components/
│   ├── three/
│   │   ├── Avatar.tsx                    # RobotExpressive GLB loader + procedural humanoid fallback
│   │   ├── AIGeneratedModelViewer.tsx    # Procedural 3D model generator with GLB export
│   │   ├── SceneCanvas.tsx               # R3F canvas with Stage lighting + OrbitControls
│   │   ├── SceneObjectMarkers.tsx        # Labeled 3D markers for scene objects
│   │   └── PlaceholderModel.tsx          # Animated idle placeholder
│   └── ui/
│       ├── CommandInput.tsx              # Natural language command input
│       ├── GenerationPanel.tsx           # 3D generation form
│       └── LoadingSpinner.tsx            # Loading indicator
└── lib/
    ├── ollama.ts             # Ollama integration (object + animation classification)
    ├── openai.ts             # Intent mapping (keyword fallback, model summaries)
    ├── procedural-model.ts   # Hard-coded procedural builders + GLB exporter
    └── 3d-utils.ts           # 3D format utilities
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **3D Engine**: Three.js + @react-three/fiber + @react-three/drei
- **Avatar**: Three.js `RobotExpressive` GLB (from threejs.org/examples CDN)
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel

## Setup

### Prerequisites

- Node.js 18+

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

No API keys required — everything runs locally out of the box.

## Usage

### Test 1: 3D Generation

1. Navigate to "3D Generation" tab
2. Type a training object name (e.g., "hard hat", "fire extinguisher")
3. Click "Generate 3D Model"
4. View the procedural 3D model with AI-generated educational context

**Try these prompts**:
- "hard hat" — Safety helmet
- "fire extinguisher" — Fire safety equipment
- "wrench" — Tool for fastening
- "first aid kit" — Medical emergency kit
- "safety vest" — High-visibility clothing
- "ladder" — Access equipment

### Test 2: Avatar Animation

1. Navigate to "Avatar Animation" tab
2. Type a natural language command
3. Watch the avatar perform the action

**Try these commands**:
- "wave hello" — Greeting animation
- "walk forward" — Walking locomotion
- "point at target" — Indicating direction
- "crouch down" — Low protective position
- "stop" or "wait" — Return to idle

## Limitations & Next Steps

### Current Limitations
- 3D models are built from geometric primitives (not photorealistic meshes)
- Avatar uses RobotExpressive from threejs.org examples (single character)
- No persistent storage of generated content
- Single-user (no authentication)
- **AI processing is keyword-based** — Ollama integration exists but falls back to keyword matching when no local LLM is running. Full LLM-powered classification and intent mapping require Ollama or an OpenAI API key
- **Image input is accepted but unused** — the UI supports drag-and-drop image upload, but the procedural model generator does not yet use the image for classification or geometry generation (Text-to-3D only)

### Next Steps
1. **3D Generation**:
   - Enable Ollama/OpenAI for LLM-powered object classification (currently keyword-based)
   - Image-to-3D: use uploaded images to drive model classification and geometry selection
   - Integrate Meshy.ai/Tripo for AI-generated photorealistic meshes
   - Expand object category library

2. **Avatar Animation**:
   - Enable Ollama/OpenAI for LLM-powered intent mapping (currently keyword fallback)
   - Ready Player Me or custom avatar creation for personalized characters
   - Multi-avatars and scenario scripting
   - Speech synthesis (avatar speaks the explanation)
   - Full scene interactions (walk to locations, pick up objects)

3. **Platform**:
   - User accounts and progress tracking
   - Learning module builder
   - Assessment/quiz integration
   - Collaboration features

## License

Proprietary — NexEra Internal Use
