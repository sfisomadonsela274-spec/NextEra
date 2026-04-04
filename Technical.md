# NexEra AI Training Platform - Technical Documentation

## System Overview

The NexEra AI Training Platform is a web-based interactive training system that combines AI-powered 3D asset generation with procedural avatar animation for human training scenarios. Built with Next.js 16, React Three Fiber, and AI integration.

## Core Architecture

### Frontend Stack
- **Framework**: Next.js 16 (App Router with Turbopack)
- **UI Library**: React 18 + Tailwind CSS 4
- **3D Rendering**: Three.js via @react-three/fiber and @react-three/drei
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Styling**: Utility-first CSS with Tailwind

### Backend Services
- **AI Integration**: Ollama (local LLM) for text understanding and generation
- **Fallback Systems**: Keyword-based classification when AI unavailable
- **Asset Generation**: Procedural 3D geometry creation
- **Deployment**: Vercel (serverless functions, global CDN)

## Component Breakdown

### 1. Avatar System (`src/components/three/Avatar.tsx`)
- **Primary Function**: Loads and animates 3D humanoid models
- **Model Source**: RobotExpressive GLB from Three.js examples
- **Animation System**: Three.js AnimationMixer with action blending
- **Fallback**: Procedural humanoid when GLB fails to load
- **Supported Animations**: Idle, walk, wave, point, crouch
- **Features**:
  - Automatic model scaling and centering
  - Cross-fading between animations
  - Error handling with procedural fallback
  - Animation intent mapping

### 2. 3D Model Viewer (`src/components/three/ProceduralModelViewer.tsx`)
- **Primary Function**: Generates and displays procedural 3D models
- **Geometry Types**: Box, sphere, cylinder, cone based on object classification
- **Material System**: AI-assigned colors and properties
- **Interactive Controls**: Orbit-based camera manipulation
- **Features**:
  - Text-to-shape mapping
  - Procedural detail generation
  - Educational context display
  - Loading states and error handling

### 3. Scene Container (`src/components/three/SceneCanvas.tsx`)
- **Primary Function**: Provides optimized 3D rendering environment
- **Lighting Setup**: 
  - Ambient light (0.4 intensity)
  - Directional light (1.2 intensity from [5,5,5])
  - Point light accent (0.5 intensity, purple)
- **Environment**: City HDRI for realistic lighting
- **Controls**: 
  - OrbitControls with constrained polar angles
  - Distance limits (2-10 units)
  - No panning (enablePan={false})
- **Performance**:
  - Adaptive DPR for device pixel ratio
  - Adaptive events for pointer handling
  - Shadow rendering enabled
  - Antialiasing for smooth edges

### 4. AI Integration Layer
#### Ollama Integration (`src/lib/ollama.ts`)
- **Purpose**: Local LLM for natural language understanding
- **Features**:
  - Object classification from text descriptions
  - Training context generation
  - Fallback to keyword matching
  - Error handling and timeouts
- **Configuration**: 
  - Base URL configurable via OLLAMA_BASE_URL
  - Default model: minimax-m2.7:cloud

#### Intent Mapping (`src/lib/openai.ts`)
- **Purpose**: Legacy compatibility for command interpretation
- **Function**: Maps natural language to avatar animations
- **Fallback**: Used when primary AI services unavailable

### 5. Procedural Generation (`src/lib/procedural-model.ts`)
- **Purpose**: Creates 3D geometries from textual descriptions
- **Supported Objects**:
  - Safety equipment (hard hat, safety vest, first aid kit)
  - Tools (wrench, ladder)
  - Emergency equipment (fire extinguisher)
  - Generic primitives for unknown objects
- **Features**:
  - Dimension scaling based on object type
  - Material assignment (color, roughness)
  - Positioning and orientation
  - GLB export utility (`src/lib/3d-utils.ts`)

## Data Flow

### 3D Generation Pipeline
1. User inputs object description (e.g., "hard hat")
2. Text sent to Ollama for classification
3. Classification returns object type and confidence
4. Procedural model generator creates appropriate geometry
5. Material properties assigned based on classification
6. Model rendered in viewer with interactive controls
7. AI-generated educational context displayed

### Avatar Animation Pipeline
1. User inputs command (e.g., "wave hello")
2. Text processed through intent mapping
3. Command translated to animation type (wave)
4. Avatar component receives animation prop
5. AnimationMixer cross-fades to target animation
6. Procedural fallback used if GLB unavailable
7. Animation loops until next command

## Deployment Configuration

### Vercel Settings
- **Framework**: Next.js 16 (auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `.vercel/output`
- **Install Command**: `npm install`
- **Node Version**: 18.x (LTS)
- **Build Cache**: Enabled for faster rebuilds

### Environment Variables
Required in `.env.local` or Vercel Dashboard:
```
# Ollama Configuration (Optional)
OLLAMA_BASE_URL=http://localhost:11434

# OpenAI API Key (Optional, for enhanced summaries)
OPENAI_API_KEY=sk-...

# Cloud 3D Services (Optional)
MESHY_API_KEY=...
TRIPO_API_KEY=
```

### Build Process
1. Dependency installation (`npm ci`)
2. Next.js compilation (`next build`)
3. TypeScript checking (`tsc --noEmit`)
4. Static optimization
5. Output preparation for Vercel Edge Functions

## Performance Considerations

### Rendering Optimization
- **Instanced Rendering**: Not currently used (low object count)
- **Frustum Culling**: Automatic via Three.js
- **LOD System**: Simple scaling based on distance
- **Texture Atlasing**: Not applicable (procedural materials)
- **Shader Optimization**: Standard Three.js materials

### Bundle Optimization
- **Code Splitting**: Automatic via Next.js/Turbopack
- **Dynamic Imports**: Used for heavy 3D libraries
- **Tree Shaking**: Enabled in production builds
- **Asset Compression**: GLTFLoader optimized for web

### Memory Management
- **Texture Disposal**: Automatic when components unmount
- **Geometry Cleanup**: References removed on unmount
- **Animation Mixer**: Properly disposed when not needed
- **Event Listeners**: Cleaned up in useEffect return functions

## API Endpoints

### Current Implementation
This version is fully client-side with no custom API endpoints:
- All AI processing happens client-side (Ollama) or via fallbacks
- No server-side computation required for core functionality
- Static deployment possible (though AI features require local Ollama)

### Extensibility Points
1. **Backend AI Services**: Add API routes for:
   - Text-to-3D generation (Meshy/Tripo integration)
   - Enhanced natural language processing
   - Model storage and retrieval
   - User progress tracking

2. **Authentication**: 
   - Add `/api/auth` routes for user management
   - Implement session handling
   - Add protected routes for training modules

3. **Data Persistence**:
   - Add `/api/scores` for assessment tracking
   - Implement user-generated content storage
   - Add export/import functionality for scenarios

## Security Considerations

### Client-Side Security
- **XSS Protection**: React auto-escaping, sanitize user inputs
- **CSRF**: Not applicable (no state-changing endpoints)
- **CORS**: Not applicable (same-origin requests only)
- **Input Validation**: All user inputs validated before processing

### Deployment Security
- **Environment Variables**: Secrets stored in Vercel Dashboard
- **OIDC Tokens**: Automatic refresh for Vercel services
- **Headers**: Security headers configured via next.config.js
- **Content Security Policy**: Configurable via Vercel settings

### AI Service Security
- **Ollama**: Local-only by default, no external exposure
- **API Keys**: Stored encrypted in Vercel environment variables
- **Rate Limiting**: Application-level throttling if needed
- **Data Privacy**: No user data sent to external services without consent

## Development Workflow

### Local Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Optional: Install Ollama for AI features
4. Create `.env.local` from `.env.example`
5. Start development server: `npm run dev`

### Testing
- **Unit Tests**: Jest + React Testing Library (planned)
- **Integration Tests**: Cypress for user flows (planned)
- **Manual Testing**: 
  - Verify 3D generation with various inputs
  - Test avatar animations respond correctly
  - Confirm fallback systems work
  - Validate responsive design across devices

### Deployment
1. Push to main branch triggers Vercel preview deployment
2. Preview URL generated for each commit
3. Manual promotion to production via Vercel dashboard
4. Environment variables synced via `vercel env pull`

## Future Enhancements

### Phase 1: Improved Realism
- [ ] Integrate Mixamo for realistic avatar motions
- [ ] Add PBR materials for 3D models
- [ ] Implement soft shadows and ambient occlusion
- [ ] Add post-processing effects (bloom, tone mapping)

### Phase 2: Expanded Content
- [ ] Add more object categories (vehicles, machinery)
- [ ] Create scenario-based training modules
- [ ] Add assessment/quiz system
- [ ] Implement multi-language support

### Phase 3: Collaboration & Tracking
- [ ] Add user accounts and progress tracking
- [ ] Implement scenario sharing and collaboration
- [ ] Add instructor dashboard and controls
- [ ] Integrate with LMS systems (SCORM/xAPI)

### Phase 4: Advanced Features
- [ ] Voice command integration
- [ ] AR/VR mode support
- [ ] Real-time multi-user scenarios
- [ ] Physics-based interactions

## Troubleshooting Guide

### Common Issues
1. **3D Models Not Loading**
   - Check console for GLTFLoader errors
   - Verify network connectivity to model URLs
   - Confirm fallback procedural rendering works

2. **Animations Not Playing**
   - Verify animation clips are loaded in model
   - Check AnimationMixer initialization
   - Confirm animation names match mapping

3. **AI Features Not Working**
   - Confirm Ollama is running (if enabled)
   - Check OLLAMA_BASE_URL in .env.local
   - Verify keyword fallback is functioning
   - Check browser console for fetch errors

4. **Performance Issues**
   - Reduce shadow complexity if FPS low
   - Disable environment intensity for testing
   - Check for infinite loops in animation code
   - Verify React 18 concurrent mode compatibility

### Debugging Tools
- **React DevTools**: Component hierarchy and props
- **Three.js Inspector**: Scene graph and performance
- **Network Tab**: API calls and asset loading
- **Console.log**: Strategic logging in key locations
- **Performance Tab**: Frame rate and rendering time

## Contributing Guidelines

### Code Style
- Follow existing TypeScript conventions
- Use functional components with hooks
- Prefer Tailwind CSS over custom styles
- Comment complex logic and algorithms
- Keep components focused and single-responsibility

### Asset Guidelines
- Keep procedural geometries low-poly for performance
- Use standardized material properties
- Follow naming conventions for animations
- Test assets on target devices

### Documentation
- Update README for user-facing changes
- Add JSDoc for complex functions
- Document new environment variables
- Include usage examples for new features

## License
Proprietary - NexEra Internal Use