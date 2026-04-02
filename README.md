# NexEra AI Training Platform

Interactive prototypes demonstrating AI-powered 3D learning tools and AI-driven avatar animation for human training scenarios.

**Live Demo**: https://nextera-rouge.vercel.app

## Features

### Test 1: AI-Generated 3D Asset Pipeline
- **Text-to-3D**: Describe a training object and get a procedural 3D model
- **AI Classification**: Uses Ollama for object categorization and material assignment
- **Procedural Modeling**: Generates contextually appropriate geometry (hard hats, fire extinguishers, tools, etc.)
- **Educational Summaries**: AI generates training context for each asset
- **Interactive Viewer**: Rotate, zoom, and examine models in 3D

### Test 2: Natural Language → Avatar Animation
- **Intent Mapping**: Natural language commands mapped to animations
- **Procedural Humanoid**: Built-in animated character (no external assets needed)
- **Multi-animation Support**: Idle, walk, wave, point, crouch
- **Command Log**: Tracks command history with animation assignments
- **Quick Commands**: One-click preset commands for testing

## Architecture

```
src/
├── app/page.tsx              # Main UI with tabbed interface
├── components/
│   ├── three/
│   │   ├── Avatar.tsx                    # Procedural humanoid with animation
│   │   ├── ProceduralModelViewer.tsx     # AI-driven 3D model generator
│   │   ├── SceneCanvas.tsx               # Three.js canvas with controls
│   │   └── PlaceholderModel.tsx          # Animated placeholder
│   └── ui/
│       ├── CommandInput.tsx              # Natural language input
│       ├── GenerationPanel.tsx           # 3D generation form
│       └── LoadingSpinner.tsx           # Loading indicator
└── lib/
    ├── ollama.ts             # Ollama AI integration
    ├── openai.ts             # Intent mapping (legacy compatibility)
    ├── procedural-model.ts   # Procedural 3D geometry generation
    └── 3d-utils.ts           # 3D format utilities
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **3D Engine**: Three.js + @react-three/fiber + @react-three/drei
- **AI**: Ollama (local inference) with fallback keyword classification
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel

## Setup

### Prerequisites

- Node.js 18+
- Ollama (optional, for AI features)

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Ollama Setup (Optional)

For AI-powered object classification and summaries:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull minimax-m2.7:cloud

# Set base URL in .env.local
OLLAMA_BASE_URL=http://localhost:11434
```

Without Ollama, the system uses keyword-based fallback classification.

## API Keys

Create `.env.local` for external AI services:

```env
# Ollama (local - free)
OLLAMA_BASE_URL=http://localhost:11434

# Optional: For enhanced summaries via OpenAI
OPENAI_API_KEY=sk-...

# Optional: For cloud 3D generation (Meshy.ai, Tripo)
MESHY_API_KEY=...
TRIPO_API_KEY=...
```

## Usage

### Test 1: 3D Generation

1. Navigate to "3D Generation" tab
2. Type a training object name (e.g., "hard hat", "fire extinguisher")
3. Click "Generate 3D Model"
4. View the procedural 3D model with AI-generated educational context

**Try these prompts**:
- "hard hat" - Safety helmet
- "fire extinguisher" - Fire safety equipment
- "wrench" - Tool for fastening
- "first aid kit" - Medical emergency kit
- "safety vest" - High-visibility clothing
- "ladder" - Access equipment

### Test 2: Avatar Animation

1. Navigate to "Avatar Animation" tab
2. Type a natural language command
3. Watch the avatar perform the action

**Try these commands**:
- "wave hello" - Greeting animation
- "walk forward" - Walking locomotion
- "point at target" - Indicating direction
- "crouch down" - Low protective position
- "stop" or "wait" - Return to idle

## Limitations & Next Steps

### Current Limitations
- Procedural models are geometric primitives (not photorealistic meshes)
- Avatar animations are programmatic (not motion-captured)
- No persistent storage of generated content
- Single-user (no authentication)
- No mobile-optimized 3D controls

### Next Steps
1. **3D Generation**:
   - Integrate Meshy.ai/Tripo for AI-generated meshes
   - Add GLB export functionality
   - Support image-to-3D (upload a photo → generate model)
   - Add more object categories

2. **Avatar Animation**:
   - Add Mixamo/DeepMotion for realistic motion
   - Scene interactions (point at specific objects, walk to locations)
   - Multi-avatars and scenario scripting
   - Speech synthesis (avatar speaks the explanation)

3. **Platform**:
   - User accounts and progress tracking
   - Learning module builder
   - Assessment/quiz integration
   - Collaboration features

## License

Proprietary - NexEra Internal Use
