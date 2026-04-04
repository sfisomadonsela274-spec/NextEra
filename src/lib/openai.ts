import type { AnimationIntent, CommandResult } from '@/types';
import { generateProceduralModel, type GeneratedModelData } from '@/lib/procedural-model';
import { classifyObjectFallback } from '@/lib/ollama';

// ─── Test 1: text / image → 3D classification + summary ─

export async function generateViaAPI(
  prompt: string,
  imageUrl?: string,
  imageBase64?: string,
  onProgress?: (p: number) => void
): Promise<{ model: GeneratedModelData; summary: string }> {
  onProgress?.(10);

  // Client-side calls the server API route
  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageUrl, imageBase64 }),
    });

    if (res.ok) {
      onProgress?.(50);
      const data = await res.json();
      const classification = {
        category: data.classification.category,
        description: data.classification.description,
        geometry: prompt.toLowerCase(),
        material: data.classification.material,
      };
      const modelData = await generateProceduralModel(prompt, classification);
      onProgress?.(100);
      return { model: modelData, summary: data.summary ?? classification.description };
    }
  } catch (err) {
    console.warn('[generateViaAPI] API route failed, using local fallback:', err);
  }

  // Local fallback (always works)
  const classification = classifyObjectFallback(prompt);
  const modelData = await generateProceduralModel(prompt, classification);
  onProgress?.(100);
  return { model: modelData, summary: classification.description };
}

// ─── Test 2: command → animation intent ─────────────────────

export async function mapCommandToAnimation(command: string): Promise<CommandResult> {
  try {
    const res = await fetch('/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });

    if (res.ok) {
      const data = await res.json();
      const intent: AnimationIntent = {
        animation: data.animation as AnimationIntent['animation'],
        explanation: data.explanation,
        confidence: data.confidence,
      };
      return { intent, raw: command };
    }
  } catch (err) {
    console.warn('[mapCommandToAnimation] API failed, using fallback:', err);
  }

  // Local fallback — always works
  const { animation, explanation, confidence } = localKeywordMap(command);
  const intent: AnimationIntent = { animation, explanation, confidence };
  return { intent, raw: command };
}

function localKeywordMap(command: string): { animation: AnimationIntent['animation']; confidence: number; explanation: string } {
  const lower = command.toLowerCase().trim();

  const map: Record<string, string[]> = {
    walk: ['walk', 'come', 'go', 'move', 'forward', 'approach'],
    wave: ['wave', 'hello', 'hi', 'greet'],
    point: ['point', 'look', 'indicate', 'show', 'this'],
    crouch: ['crouch', 'down', 'hide', 'squat', 'kneel'],
    posture: ['posture', 'stance', 'correct form', 'stand tall', 'safety posture'],
    jump: ['jump', 'hop', 'skip', 'leap'],
    celebrate: ['celebrate', 'cheer', 'victory'],
    look_around: ['look around', 'scan', 'search', 'survey'],
    pick_up: ['pick up', 'lift', 'grab', 'carry'],
    open_door: ['open door', 'enter', 'open the'],
    idle: ['stop', 'wait', 'stay', 'rest'],
  };

  for (const [anim, keywords] of Object.entries(map)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return { animation: anim as AnimationIntent['animation'], confidence: 0.9, explanation: getDesc(anim) };
    }
  }
  return { animation: 'idle' as AnimationIntent['animation'], confidence: 0.3, explanation: getDesc('idle') };
}

function getDesc(anim: string): string {
  return ANIMATION_DESCRIPTIONS[anim as keyof typeof ANIMATION_DESCRIPTIONS] ??
    'Animation used for training demonstration.';
}

const ANIMATION_DESCRIPTIONS: Record<string, string> = {
  idle: 'Character returns to neutral idle stance',
  walk: 'Character walks forward to demonstrate movement or approach',
  wave: 'Character waves to greet someone or acknowledge a presence',
  point: 'Character points to an object or direction for reference',
  crouch: 'Character crouches down to demonstrate a low position or hiding',
  posture: 'Character stands tall in the correct safety posture for workplace training',
  jump: 'Character jumps to demonstrate agility and quick movement',
  celebrate: 'Character celebrates to show success or positive reinforcement',
  look_around: 'Character scans the environment, demonstrating situational awareness',
  pick_up: 'Character bends and picks up an object with proper lifting technique',
  open_door: 'Character approaches and opens a door to enter a room',
};
