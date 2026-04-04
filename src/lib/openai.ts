import type { AnimationIntent, CommandResult } from '@/types';
import { ollamaGenerate, isOllamaAvailable } from '@/lib/ollama';
import { classifyObjectFallback } from '@/lib/ollama';
import * as THREE from 'three';
import { generateProceduralModel, type GeneratedModelData } from '@/lib/procedural-model';

// ─── NexEra AI Client Helpers ─────────────────────────────────────────
// All AI calls go through server API routes (Hugging Face Inference).
// If API routes fail (no HF token, network issues), we fall back to
// keyword classification + Ollama.

// ── Test 1: text / image → 3D classification + summary ────────────────

export async function generateViaAPI(
  prompt: string,
  imageUrl?: string,
  imageBase64?: string,
  onProgress?: (p: number) => void
): Promise<{ model: GeneratedModelData; summary: string }> {
  onProgress?.(10);

  // Try server-side classification first
  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        imageUrl,
        imageBase64,
      }),
    });

    if (res.ok) {
      onProgress?.(50);
      const data = await res.json();
      const classification = {
        ...data.classification,
        geometry: prompt.toLowerCase(), // pass the raw prompt for geometry selection
      };

      // Build actual 3D model
      const modelData = await generateProceduralModel(prompt, classification);
      onProgress?.(90);
      return { model: modelData, summary: data.summary ?? data.classification.description };
    }
  } catch (err) {
    console.warn('[AI] /api/classify failed, trying local fallback:', err);
  }

  // ── Local fallbacks: Ollama ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─

  try {
    const available = await isOllamaAvailable();
    if (available) {
      onProgress?.(60);
      const classification = await classifyObjectFallback(prompt);
      const modelData = await generateProceduralModel(prompt, classification);
      onProgress?.(95);
      return { model: modelData, summary: classification.description };
    }
  } catch {
    // continue
  }

  // ── Keyword fallback ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const classification = classifyObjectFallback(prompt);
  const modelData = await generateProceduralModel(prompt, classification);
  onProgress?.(100);
  const summary = `This ${prompt} is a training asset used in workplace safety. Featured in NexEra's human training modules.`;
  return { model: modelData, summary };
}

export async function generateModelSummary(prompt: string): Promise<string> {
  try {
    const available = await isOllamaAvailable();
    if (available) {
      const response = await ollamaGenerate(
        `You are an educational content specialist. Describe the professional training use of "${prompt}" in exactly 2 sentences for workplace safety training.`,
        'minimax-m2.7:cloud'
      );
      return response;
    }
  } catch (err) {
    console.warn('[AI Summary] Ollama failed, using fallback:', err);
  }
  return `This ${prompt} is a training asset used in workplace safety and skills development. It is commonly featured in NexEra's human training modules for educational purposes.`;
}

// ── Test 2: command → animation intent ──────────────────────────────────

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
        animation: data.animation,
        explanation: data.explanation,
        confidence: data.confidence,
      };
      console.log(`[Intent] "${command}" → ${data.animation} (${(data.confidence * 100).toFixed(0)}%)`);
      return { intent, raw: command };
    }
  } catch (err) {
    console.warn('[Intent] API failed, using fallback:', err);
  }

  // Local fallback (same behavior as /api/intent's keywordFallback)
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
    posture: ['posture', 'stance', 'correct form', 'stand tall'],
    jump: ['jump', 'hop', 'skip', 'leap'],
    celebrate: ['celebrate', 'cheer', 'victory'],
    look_around: ['look around', 'scan', 'search'],
    pick_up: ['pick up', 'lift', 'grab', 'carry'],
    open_door: ['open door', 'enter', 'open the'],
    idle: ['stop', 'wait', 'stay', 'rest'],
  };

  for (const [anim, keywords] of Object.entries(map)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return { animation: anim as AnimationIntent['animation'], confidence: 0.9, explanation: getDesc(anim) };
    }
  }
  return { animation: 'idle', confidence: 0.3, explanation: getDesc('idle') };
}

function getDesc(anim: string): string {
  return (
    ANIMATION_DESCRIPTIONS[anim as keyof typeof ANIMATION_DESCRIPTIONS] ??
    'Animation used for training demonstration.'
  );
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
