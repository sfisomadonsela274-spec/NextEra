import type { AnimationIntent, CommandResult } from '@/types';
import { ollamaGenerate, isOllamaAvailable } from '@/lib/ollama';

// ============================================
// NexEra — Intent Mapping via Ollama
// ============================================

const ANIMATION_KEYWORDS: Record<string, string[]> = {
  walk: ['walk', 'come', 'go', 'move', 'forward', '前进', '走', '走过来', 'approach'],
  wave: ['wave', 'hello', 'hi', 'greet', '挥手', '打招呼', '你好', 'say hello'],
  point: ['point', 'look', 'see', 'this', '指', '看这里', '指向', 'indicate', 'show'],
  crouch: ['crouch', 'down', 'hide', 'squat', '蹲下', '躲避', 'kneel', 'crouch down'],
  idle: ['stop', 'wait', 'stay', 'idle', '停', '等待', 'stand', 'rest'],
};

const ANIMATION_DESCRIPTIONS: Record<string, string> = {
  walk: 'Character walks forward to demonstrate movement or approach',
  wave: 'Character waves to greet someone or acknowledge a presence',
  point: 'Character points to an object or direction for reference',
  crouch: 'Character crouches down to demonstrate a low position or hiding',
  idle: 'Character returns to neutral idle stance',
};

function detectAnimation(command: string): { animation: string; confidence: number } {
  const lower = command.toLowerCase().trim();

  for (const [anim, keywords] of Object.entries(ANIMATION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { animation: anim, confidence: 0.9 };
      }
    }
  }

  return { animation: 'idle', confidence: 0.3 };
}

export async function mapCommandToAnimation(command: string): Promise<CommandResult> {
  const { animation, confidence } = detectAnimation(command);

  const intent: AnimationIntent = {
    animation: animation as AnimationIntent['animation'],
    explanation: ANIMATION_DESCRIPTIONS[animation],
    confidence,
  };

  console.log(`[Intent Mapping] Command: "${command}" → Animation: ${animation} (${(confidence * 100).toFixed(0)}%)`);

  return { intent, raw: command };
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

  // Fallback
  return `This ${prompt} is a training asset used in workplace safety and skills development. It is commonly featured in NexEra's human training modules for educational purposes.`;
}
