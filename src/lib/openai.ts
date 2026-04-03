import type { AnimationIntent, CommandResult, SceneObject } from '@/types';
import { ollamaGenerate, isOllamaAvailable } from '@/lib/ollama';

// ============================================
// NexEra — LLM Intent Mapping for Avatar Commands
// ============================================
// Uses Ollama to reason about natural language commands and map them
// to one of 5 animations: idle, walk, wave, point, crouch
//
// Prompt instructs the LLM to return structured JSON so we avoid
// fragile keyword/regex matching and get proper reasoning.

const VALID_ANIMATIONS: AnimationIntent['animation'][] = ['idle', 'walk', 'wave', 'point', 'crouch'];

export async function mapCommandToAnimation(
  command: string,
  sceneObjects: SceneObject[] = []
): Promise<CommandResult> {
  const available = await isOllamaAvailable();

  if (!available) {
    // Fallback to simple keyword matching if no LLM
    return keywordFallback(command, sceneObjects);
  }

  const sceneDesc = sceneObjects.length > 0
    ? `Scene objects: ${sceneObjects.map(o => `"${o.label}" at [${o.position.join(',')}]`).join(', ')}`
    : 'No scene objects defined.';

  const systemPrompt = `You are an intent classification system for an AI training avatar.
The avatar supports exactly 5 animations: idle, walk, wave, point, crouch.
"walk" is for moving toward a location.
"wave" is for greeting or getting attention.
"point" is for indicating a specific object or direction.
"crouch" is for demonstrating a low/protective posture.
"idle" is for stopping and returning to neutral stance.

Return ONLY valid JSON with this structure:
{
  "animation": "one of: idle|walk|wave|point|crouch",
  "reasoning": "1 sentence explaining why this animation fits the command",
  "target": "the scene object label the avatar should walk/point toward, or null"
}
${sceneDesc}

Command: "${command}"`;

  try {
    const response = await ollamaGenerate(command, 'minimax-m2.7:cloud', systemPrompt);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return keywordFallback(command, sceneObjects);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      animation: string;
      reasoning: string;
      target: string | null;
    };

    const animation = VALID_ANIMATIONS.includes(parsed.animation as AnimationIntent['animation'])
      ? (parsed.animation as AnimationIntent['animation'])
      : 'idle';

    const target = parsed.target
      ? sceneObjects.find(o => o.label.toLowerCase().includes(parsed.target!.toLowerCase()))
      : null;

    const intent: AnimationIntent = {
      animation,
      explanation: parsed.reasoning,
      confidence: 0.95,
      ...(target && {
        targetPosition: target.position,
        targetLabel: target.label,
      }),
    };

    console.log(`[LLM Intent] "${command}" → ${animation}${target ? ` → ${target.label}` : ''} (reasoning: ${parsed.reasoning})`);

    return { intent, raw: command };
  } catch (err) {
    console.warn('[Intent Mapping] LLM failed, using keyword fallback:', err);
    return keywordFallback(command, sceneObjects);
  }
}

// ─── Keyword fallback (used when Ollama unavailable) ─────────────────────────

const ANIMATION_KEYWORDS: Record<string, string[]> = {
  walk: ['walk', 'come', 'go', 'move', 'forward', 'approach'],
  wave: ['wave', 'hello', 'hi', 'greet', 'say hello'],
  point: ['point', 'look', 'see', 'indicate', 'show'],
  crouch: ['crouch', 'down', 'hide', 'squat', 'kneel'],
  idle: ['stop', 'wait', 'stay', 'idle', 'stand', 'rest'],
};

const ANIMATION_DESCRIPTIONS: Record<string, string> = {
  walk: 'Character walks forward to demonstrate movement or approach',
  walk_to: 'Character walks to the specified location',
  wave: 'Character waves to greet someone or acknowledge a presence',
  point: 'Character points to an object or direction for reference',
  point_at: 'Character points to the specified object',
  crouch: 'Character crouches down to demonstrate a low position or hiding',
  idle: 'Character returns to neutral idle stance',
};

const TARGET_PATTERNS = [
  /(?:walk|go|come|move)\s+(?:to|towards|into)\s+(?:the\s+)?(.+)/i,
  /(?:point|look|see|show|indicate)\s+(?:at|towards|to)\s+(?:the\s+)?(.+)/i,
];

function keywordFallback(command: string, sceneObjects: SceneObject[]): CommandResult {
  const lower = command.toLowerCase().trim();
  let animation = 'idle';
  let confidence = 0.3;

  for (const [anim, keywords] of Object.entries(ANIMATION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        animation = anim;
        confidence = 0.9;
        break;
      }
    }
    if (confidence > 0.5) break;
  }

  let target: { label: string; position: [number, number, number] } | null = null;
  for (const pattern of TARGET_PATTERNS) {
    const match = command.match(pattern);
    if (match) {
      const query = match[1].trim().toLowerCase();
      for (const obj of sceneObjects) {
        if (obj.label.toLowerCase().includes(query) || query.includes(obj.label.toLowerCase())) {
          target = { label: obj.label, position: obj.position };
          break;
        }
      }
    }
  }

  const key = target ? `${animation}_to` : animation;
  const explanation = ANIMATION_DESCRIPTIONS[key] ?? ANIMATION_DESCRIPTIONS[animation];

  const intent: AnimationIntent = {
    animation: animation as AnimationIntent['animation'],
    explanation,
    confidence,
    ...(target && { targetPosition: target.position, targetLabel: target.label }),
  };

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
