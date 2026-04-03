// ============================================
// NexEra — Ollama AI Integration
// ============================================
import { isOpenRouterAvailable } from './openrouter';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface OllamaModels {
  models: Array<{ name: string; model: string; size: number }>;
}

// Check if Ollama is available
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Generate text completion using Ollama
export async function ollamaGenerate(
  prompt: string,
  model: string = 'minimax-m2.7:cloud',
  system?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
  };

  if (system) {
    body.system = system;
  }

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status}`);
  }

  const data: OllamaResponse = await res.json();
  return data.response;
}

// Classify an object for 3D model generation.
// Uses OpenRouter LLM when API key is configured, falls back to keywords.
export async function generateObjectDescription(prompt: string): Promise<{
  category: string;
  description: string;
  geometry: string;
  material: { color: string; metalness: number; roughness: number };
}> {
  let available = false;
  try {
    available = isOpenRouterAvailable();
  } catch {
    available = false;
  }

  if (!available) return classifyObjectFallback(prompt);

  try {
    const { openrouterChat } = await import('./openrouter');
    const response = await openrouterChat([
      {
        role: 'system',
        content: 'You are a 3D asset classifier. Respond ONLY with valid JSON, no markdown.',
      },
      {
        role: 'user',
        content: `For the object "${prompt}", respond with a JSON object with this exact structure:
{
  "category": "one word category like: tool, safety_equipment, vehicle, furniture, electronics",
  "description": "2 sentence description of this object's training use",
  "geometry": "basic shape: box, cylinder, sphere, cone, or compound",
  "material": {"color": "hex color like #FFB300", "metalness": 0.0-1.0, "roughness": 0.0-1.0}
}`,
      },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category ?? 'generic',
        description: parsed.description ?? '',
        geometry: parsed.geometry ?? 'box',
        material: parsed.material ?? { color: '#8B5CF6', metalness: 0.2, roughness: 0.5 },
      };
    }
  } catch (err) {
    console.warn('[OpenRouter] Classification failed, using keyword fallback:', err);
  }

  return classifyObjectFallback(prompt);
}

function classifyObjectFallback(prompt: string): {
  category: string;
  description: string;
  geometry: string;
  material: { color: string; metalness: number; roughness: number };
} {
  const lower = prompt.toLowerCase();

  const descriptions: Record<string, { category: string; description: string; geometry: string; color: string; metalness: number; roughness: number }> = {
    'hard hat': {
      category: 'safety_equipment',
      description: 'A high-impact thermoplastic shell designed to protect the wearer\'s head from falling objects and electrical hazards. The internal suspension system absorbs force on impact, making this one of the most critical pieces of Personal Protective Equipment (PPE) on any job site. Workers should inspect their hard hats daily for cracks, UV degradation, and compromised suspension integrity.',
      geometry: 'compound',
      color: '#FFB300', metalness: 0.1, roughness: 0.7,
    },
    'helmet': {
      category: 'safety_equipment',
      description: 'A high-impact protective shell engineered to shield the wearer from falling debris, impact with fixed objects, and electrical hazards. The integrated suspension liner disperses kinetic energy across the cradle, reducing transmitted force to safe levels. Regular inspection for UV degradation, cracks, and suspension wear is mandatory per OSHA guidelines.',
      geometry: 'compound',
      color: '#FFB300', metalness: 0.1, roughness: 0.7,
    },
    'safety': {
      category: 'safety_equipment',
      description: 'Personal protective equipment designed to mitigate workplace hazards through engineered safety controls. Proper use, inspection, and maintenance of this equipment is fundamental to occupational health and safety programs. Workers should be trained on its function before exposure to the associated hazard.',
      geometry: 'compound',
      color: '#F6C800', metalness: 0.1, roughness: 0.7,
    },
    'fire': {
      category: 'safety_equipment',
      description: 'A pressurized device containing extinguishing agent designed to suppress Class A, B, or C fires before they escalate. Knowing the location, type, and proper use of this equipment is a basic workplace safety competency. In the event of a fire, remember to pull the pin, aim low, squeeze the handle, and sweep side to side.',
      geometry: 'cylinder',
      color: '#DC2626', metalness: 0.3, roughness: 0.5,
    },
    'extinguisher': {
      category: 'safety_equipment',
      description: 'A portable pressurized cylinder containing an extinguishing agent rated for specific fire classes. Understanding which extinguisher type matches the fire hazard (electrical, flammable liquid, or ordinary combustible) is critical for effective emergency response. Misclassifying the fire type can be dangerous.',
      geometry: 'cylinder',
      color: '#DC2626', metalness: 0.3, roughness: 0.5,
    },
    'alarm': {
      category: 'safety_equipment',
      description: 'An audible or visual warning device that alerts occupants to potential dangers such as fire, gas leaks, or security breaches. Regular testing and maintenance of alarm systems ensures reliable operation during actual emergencies. Workers should familiarize themselves with alarm sound patterns and evacuation procedures.',
      geometry: 'box',
      color: '#DC2626', metalness: 0.4, roughness: 0.5,
    },
    'wrench': {
      category: 'tool',
      description: 'A hand tool designed to apply torque to nuts, bolts, and fittings by gripping opposing flats. Using the correct wrench size prevents rounding of fastener heads and reduces the risk of injury from sudden slippage. Wrenches should be inspected for cracked jaws, worn teeth, and handle deformities after heavy use.',
      geometry: 'compound',
      color: '#6B7280', metalness: 0.8, roughness: 0.3,
    },
    'screwdriver': {
      category: 'tool',
      description: 'A hand tool used to drive or remove screws by engaging the recessed head with a matching tip profile. Selecting the correct driver type—flathead, Phillips, Torx, or hex—is essential to prevent cam-out and fastener stripping. Never use a screwdriver as a chisel, pry bar, or punch, as this can damage the tool and cause injury.',
      geometry: 'compound',
      color: '#6B7280', metalness: 0.8, roughness: 0.3,
    },
    'hammer': {
      category: 'tool',
      description: 'A striking tool consisting of a weighted head attached to a handle, used for driving nails, shaping metal, and breaking objects. The handle material and head weight are matched to the task—fiberglass for vibration reduction, steel for heavy demolition, wood for precision carpentry. Always match hammer weight to the nail or pin being driven.',
      geometry: 'compound',
      color: '#6B7280', metalness: 0.8, roughness: 0.3,
    },
    'drill': {
      category: 'tool',
      description: 'A powered rotary tool used to bore holes in materials or drive screws with interchangeable bits. Selecting the correct rotary speed, bit type, and feed pressure ensures clean work and prevents motor overheating or material splintering. Always secure the workpiece with clamps before operation and wear eye protection.',
      geometry: 'compound',
      color: '#6B7280', metalness: 0.8, roughness: 0.3,
    },
    'tool': {
      category: 'tool',
      description: 'A hand or powered instrument designed to perform specific mechanical operations on materials or fasteners. Proper tool selection and technique is foundational to craftsmanship and workplace safety. Improper tool usage is one of the leading causes of preventable injuries on construction and job sites.',
      geometry: 'compound',
      color: '#6B7280', metalness: 0.8, roughness: 0.3,
    },
    'car': {
      category: 'vehicle',
      description: 'A motorized four-wheeled vehicle used for personnel transport or fleet operations. Fleet vehicle safety requires pre-trip inspections, defensive driving practices, and adherence to load capacity limits. Understanding blind spots, emergency braking distances, and parking safety is essential.',
      geometry: 'compound',
      color: '#1E40AF', metalness: 0.6, roughness: 0.4,
    },
    'truck': {
      category: 'vehicle',
      description: 'A heavy-duty motor vehicle designed to transport cargo, materials, or personnel over varying distances. Operating a commercial truck requires specialized licensing, load balancing awareness, and extended stopping distance calculations. Regular brake, tire, and light inspections are critical pre-trip requirements.',
      geometry: 'compound',
      color: '#1E40AF', metalness: 0.6, roughness: 0.4,
    },
    'vehicle': {
      category: 'vehicle',
      description: 'A motorized transport asset designed for the movement of personnel or materials across the worksite or public roadways. Fleet safety programs emphasize pre-operation inspections, speed limits, seatbelt use, and proper load securing. Understanding right-of-way rules and vehicle blind spots is fundamental.',
      geometry: 'compound',
      color: '#1E40AF', metalness: 0.6, roughness: 0.4,
    },
    'forklift': {
      category: 'vehicle',
      description: 'An industrial lift truck used to raise, lower, and transport palletized loads in warehouses and industrial facilities. OSHA requires operator certification before driving a forklift, with training on load center, stability triangle, and overhead clearance. Pedestrian separation and horn usage at blind intersections are mandatory.',
      geometry: 'compound',
      color: '#D4A017', metalness: 0.5, roughness: 0.5,
    },
    'bike': {
      category: 'vehicle',
      description: 'A two-wheeled human-powered or electric vehicle used for personal transport in campus or outdoor settings. Workplace bicycle safety includes helmet use, visible high-contrast clothing at dusk, and yielding to motorized traffic on site roads. Electric bikes add battery safety and charging protocols.',
      geometry: 'compound',
      color: '#1E40AF', metalness: 0.4, roughness: 0.5,
    },
    'first aid': {
      category: 'medical',
      description: 'A compact container holding sterile supplies for the immediate treatment of workplace injuries such as cuts, abrasions, burns, and sprains. OSHA mandates that first aid equipment be readily accessible, fully stock, and maintained according to workplace hazard assessment. Workers should know the kit\'s location and inventory before an emergency occurs.',
      geometry: 'box',
      color: '#DC2626', metalness: 0.1, roughness: 0.6,
    },
    'medkit': {
      category: 'medical',
      description: 'A portable medical supply kit containing bandages, antiseptics, gauze, and specialty items for emergency injury treatment. Regular inventory checks and expiration date monitoring ensure the kit is ready when needed. A well-stocked medical kit is the first line of defense while wait for professional medical assistance.',
      geometry: 'box',
      color: '#DC2626', metalness: 0.1, roughness: 0.6,
    },
    'defibrillator': {
      category: 'medical',
      description: 'An electronic device that delivers an electrical shock to restore normal heart rhythm during cardiac arrest events. Understanding the location, activation sequence, and pad placement of an AED is critical because defibrillation within 3-5 minutes of cardiac arrest increases survival rates by up to 70%. Workplace AED readiness saves lives.',
      geometry: 'box',
      color: '#DC2626', metalness: 0.1, roughness: 0.6,
    },
    'AED': {
      category: 'medical',
      description: 'An Automated External Defibrillator that analyzes heart rhythm and delivers a life-saving shock during sudden cardiac arrest. The device provides voice-guided instructions, making it usable by untrained bystanders. Rapid deployment is the single most important factor in AED survival outcomes — every minute of delay reduces survival by approximately 10 percent.',
      geometry: 'box',
      color: '#FFFFFF', metalness: 0.1, roughness: 0.6,
    },
    'vest': {
      category: 'safety_equipment',
      description: 'A high-visibility garment constructed with fluorescent material and reflective tape to maximize worker visibility in low-light and high-traffic environments. ANSI/ISEA 107 compliance dictates minimum visibility area and retroreflective band placement based on risk exposure class. Workers must wear the vest zipped or fastened to maintain proper visibility coverage at all times.',
      geometry: 'compound',
      color: '#FF6600', metalness: 0.0, roughness: 0.9,
    },
    'ladder': {
      category: 'tool',
      description: 'An elevated access device consisting of vertical rails connected by horizontal rungs or steps. Proper ladder setup follows the 4-to-1 ratio rule: for every four feet of height, the base should be one foot away from the wall. Always maintain three points of contact while climbing and never exceed the ladder\'s load capacity rating.',
      geometry: 'compound',
      color: '#E6A200', metalness: 0.1, roughness: 0.7,
    },
  };

  // Try matching each keyword entry against the prompt
  for (const [keyword, entry] of Object.entries(descriptions)) {
    if (lower.includes(keyword)) {
      return {
        category: entry.category,
        description: entry.description,
        geometry: entry.geometry,
        material: { color: entry.color, metalness: entry.metalness, roughness: entry.roughness },
      };
    }
  }

  // Generic fallback that actually says something useful
  return {
    category: 'generic',
    description: `A training asset used in workplace safety and professional skills development modules. This object is commonly featured in NexEra's educational content to support hands-on competency building and hazard recognition training.`,
    geometry: 'box',
    material: { color: '#8B5CF6', metalness: 0.2, roughness: 0.5 },
  };
}

// Generate animation explanation
export async function explainAnimation(command: string, animation: string): Promise<string> {
  const available = await isOllamaAvailable();

  if (!available) {
    return getAnimationExplanation(animation);
  }

  try {
    const response = await ollamaGenerate(
      `Explain in 2 sentences why the command "${command}" maps to the "${animation}" animation in a workplace safety training context.`,
      'minimax-m2.7:cloud'
    );
    return response;
  } catch {
    return getAnimationExplanation(animation);
  }
}

function getAnimationExplanation(animation: string): string {
  const explanations: Record<string, string> = {
    idle: 'The avatar returns to a neutral standing position with hands at its sides, representing a resting state between training actions. This is the default posture that indicates readiness to receive the next command.',
    walk: 'The avatar demonstrates forward locomotion with natural arm-leg swing coordination, showing safe movement patterns essential for navigating worksites, warehouses, and training environments.',
    wave: 'The avatar performs a greeting gesture by raising its right arm and oscillating the hand, demonstrating professional communication and attention-getting common in training scenarios.',
    point: 'The avatar extends its right arm forward with the index direction of motion, directing the learner\'s attention to a specific object or hazard — a key skill for safety demonstrations and hazard identification exercises.',
    crouch: 'The avatar lowers its body by bending at the knees and hips, demonstrating the protective posture required for avoiding overhead hazards, operating in low-clearance spaces, or practicing emergency response protocols.',
  };
  return explanations[animation] ?? 'The avatar performs an action in response to the user\'s natural language command.';
}
