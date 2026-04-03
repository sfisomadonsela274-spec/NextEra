import type { AnimationIntent, CommandResult, SceneObject } from '@/types';
import { isOpenRouterAvailable } from './openrouter';

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
  let hasOpenRouter = false;
  try {
    hasOpenRouter = isOpenRouterAvailable();
    if (hasOpenRouter) {
      const { openrouterChat } = await import('./openrouter');

      const sceneDesc = sceneObjects.length > 0
        ? `Scene objects: ${sceneObjects.map(o => `"${o.label}" at [${o.position.join(',')}]`).join(', ')}`
        : 'No scene objects defined.';

      const response = await openrouterChat([
        {
          role: 'system',
          content: `You are an intent classification system for an AI training avatar.
The avatar supports exactly 5 animations: idle, walk, wave, point, crouch.
"walk" is for moving toward a location.
"wave" is for greeting or getting attention.
"point" is for indicating a specific object or direction.
"crouch" is for demonstrating a low/protective posture.
"idle" is for stopping and returning to neutral stance.

Return ONLY valid JSON with this structure:
{"animation": "one of: idle|walk|wave|point|crouch", "reasoning": "1 sentence explanation", "target": "scene object label or null"}`,
        },
        {
          role: 'user',
          content: `${sceneDesc}\n\nCommand: "${command}"`,
        },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
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

        console.log(`[LLM Intent] "${command}" → ${animation}${target ? ` → ${target.label}` : ''}`);

        return { intent, raw: command };
      }
    }
  } catch (err) {
    console.warn('[OpenRouter] Intent mapping failed, using keyword fallback:', err);
  }

  return keywordFallback(command, sceneObjects);
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
  let hasOpenRouter = false;
  try {
    hasOpenRouter = isOpenRouterAvailable();
    if (hasOpenRouter) {
      const { openrouterChat } = await import('./openrouter');
      const response = await openrouterChat([
        {
          role: 'system',
          content: 'You are an educational content specialist for workplace safety training. Respond with exactly 2 sentences.',
        },
        {
          role: 'user',
          content: `Describe the professional training use of "${prompt}" in exactly 2 sentences for workplace safety training.`,
        },
      ]);
      if (response.trim()) return response.trim();
    }
  } catch (err) {
    console.warn('[OpenRouter] Summary failed, using fallback:', err);
  }

  return summariesFallback(prompt);
}

function summariesFallback(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (/hard[ -]?hat|helmet/.test(lower)) {
    return 'A Personal Protective Equipment (PPE) head covering designed to protect against falling objects and impacts. Essential for construction sites, warehouses, and any environment where overhead hazards exist.';
  }
  if (/fire|extinguisher/.test(lower)) {
    return 'Portable fire suppression equipment used to extinguish small fires before they escalate. Critical for emergency response training in workplaces and public spaces.';
  }
  if (/wrench|screwdriver|hammer|drill|tool/.test(lower)) {
    return 'Hand tools used for mechanical and maintenance operations. Proper tool identification and usage is fundamental to workplace safety training.';
  }
  if (/first aid|medkit|defibrillator|AED/.test(lower)) {
    return 'Emergency medical supplies for immediate treatment of injuries. Workplace first aid awareness is a core competency in occupational health and safety programs.';
  }
  if (/vest|safety/.test(lower)) {
    return 'High-visibility apparel that ensures workers are seen in low-light or high-traffic environments. Mandatory in many industrial and roadway work zones.';
  }
  if (/ladder/.test(lower)) {
    return 'Access equipment for elevated work tasks. Proper ladder inspection, placement, and climbing technique are essential fall-prevention skills.';
  }
  if (/car|truck|vehicle|forklift|bike/.test(lower)) {
    return 'Motorized equipment requiring certified operator training. Safe vehicle operation around pedestrians and fixed obstacles is a core safety competency.';
  }

  return `A training asset used in workplace safety and skills development modules. This object is part of NexEra's educational content for professional competency building.`;
}
