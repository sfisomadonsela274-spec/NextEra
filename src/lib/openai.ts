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
    return 'A high-impact thermoplastic shell designed to protect the wearer\'s head from falling objects, electrical hazards, and fixed-object impact. The internal suspension system absorbs kinetic energy on impact, making this one of the most critical pieces of Personal Protective Equipment (PPE) on any job site. Workers must inspect their hard hats daily for UV degradation, hairline cracks, and compromised suspension integrity per OSHA standards.';
  }
  if (/fire|extinguisher/.test(lower)) {
    return 'A pressurized device containing an extinguishing agent rated for specific fire classes (A, B, or C). Understanding which extinguisher type matches the hazard type — electrical, flammable liquid, or ordinary combustible — is critical for effective emergency response. Remember the PASS technique: Pull the pin, Aim low at the base, Squeeze the handle, and Sweep side to side.';
  }
  if (/wrench/.test(lower)) {
    return 'A hand tool designed to apply torque to hexagonal nuts, bolts, and pipe fittings by gripping opposing flats. Using the correctly sized wrench prevents rounding of fastener heads and reduces the risk of injury from sudden slippage. Wrenches should be inspected for cracked jaws, worn teeth, and handle deformation after heavy use.';
  }
  if (/screwdriver/.test(lower)) {
    return 'A hand tool used to drive or remove threaded fasteners by engaging the recessed head with a matching tip profile. Selecting the correct driver type — flathead, Phillips, Torx, or hex — is essential to prevent cam-out and fastener stripping that can lead to costly rework and hand injuries.';
  }
  if (/hammer/.test(lower)) {
    return 'A striking tool consisting of a weighted head attached to a handle, used for driving nails, shaping sheet metal, and breaking objects. Proper hammer selection — matching head weight and handle material to the task — improves accuracy and reduces repetitive strain on the wrist and forearm.';
  }
  if (/drill/.test(lower)) {
    return 'A powered rotary tool used to bore holes or drive screws with interchangeable bits. Selecting the correct rotation speed, bit material, and feed pressure ensures clean cuts and prevents motor overheating. Always secure the workpiece with clamps and wear eye protection before operation.';
  }
  if (/tool/.test(lower)) {
    return 'A hand or powered instrument designed to perform specific mechanical or construction operations on materials, fasteners, or assemblies. Proper tool selection, inspection, and technique is foundational to both craftsmanship quality and personal safety on any worksite.';
  }
  if (/vest|safety/.test(lower)) {
    return 'A high-visibility garment constructed with fluorescent material and retroreflective striping to maximize worker visibility in low-light and high-traffic environments. ANSI/ISEA 107 compliance dictates minimum visibility area and band placement. The vest must be worn zipped or fully fastened at all times to maintain proper coverage.';
  }
  if (/first aid/.test(lower)) {
    return 'A compact container holding sterile bandages, antiseptics, gauze, and specialty supplies for the immediate treatment of workplace injuries. OSHA mandates that first aid equipment be accessible, fully stocked, and maintained according to the workplace hazard assessment. Every worker should know the kit\'s location before an emergency occurs.';
  }
  if (/medkit/.test(lower)) {
    return 'A portable medical supply kit designed for rapid response to cuts, burns, sprains, and other common workplace injuries. Regular inventory checks and expiration date monitoring ensure readiness when it matters most.';
  }
  if (/defibrillator|AED/.test(lower)) {
    return 'An electronic device that delivers a controlled electrical shock to restore normal heart rhythm during sudden cardiac arrest. Defibrillation within 3-5 minutes of cardiac arrest increases survival rates by up to 70 percent. Workplace AED readiness and voice-guided pad placement saves lives while awaiting emergency services.';
  }
  if (/ladder/.test(lower)) {
    return 'An elevated access device consisting of vertical rails connected by horizontal rungs or steps, used for tasks above arm\'s reach. Proper ladder setup follows the 4-to-1 ratio: for every four feet of height, the base should be one foot away from the support surface. Always maintain three points of contact while climbing.';
  }
  if (/car|truck|vehicle/.test(lower)) {
    return 'A motorized transport asset designed for the movement of personnel or materials across the worksite or public roadways. Fleet safety programs emphasize pre-operation inspections, speed limits, seatbelt use, and proper load securing. Understanding right-of-way rules and vehicle blind spots is fundamental for operator certification.';
  }
  if (/forklift/.test(lower)) {
    return 'An industrial lift truck used to raise, lower, and transport palletized loads in warehouses and industrial facilities. OSHA requires operator certification with training on load center, stability triangle, and overhead clearance before any operation.';
  }
  if (/bike/.test(lower)) {
    return 'A two-wheeled human-powered or electric vehicle used for personal transport in campus or outdoor settings. Workplace bicycle safety includes helmet use, high-contrast visibility apparel, and yielding to motorized traffic on site roads.';
  }
  if (/table/.test(lower)) {
    return 'A sturdy flat-surface work station used for assembly, inspection, or training demonstrations. Tables serve as the central anchor point for group training scenarios where learners gather around to observe and practice hands-on skills.';
  }
  return { animation: 'idle' as AnimationIntent['animation'], confidence: 0.3, explanation: getDesc('idle') };
}

  return `A training asset used in workplace safety and professional skills development modules. This object is commonly featured in NexEra's educational content to support hands-on competency building, hazard recognition training, and practical assessment exercises.`;
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
