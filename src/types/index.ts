// ============================================
// NexEra — Core Type Definitions
// ============================================

export interface GeneratedModel {
  id: string;
  url: string;
  prompt: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  progress?: number;
  createdAt: Date;
}

export interface ModelGenerationRequest {
  prompt: string;
  imageUrl?: string;
}

export interface AnimationIntent {
  animation: 'idle' | 'walk' | 'wave' | 'point' | 'crouch';
  explanation: string;
  confidence: number;
}

export interface CommandResult {
  intent: AnimationIntent | null;
  raw: string;
}

export interface AvatarState {
  currentAnimation: string;
  isTransitioning: boolean;
  position: [number, number, number];
}

// 3D Generation APIs
export interface MeshyTaskResult {
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  model_url?: string;
  progress?: number;
}

export interface TripoResult {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  model_url?: string;
}
