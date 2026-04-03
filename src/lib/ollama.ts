// ============================================
// NexEra — Ollama AI Integration
// ============================================

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

// Classify an object for 3D model generation using keyword matching.
export function generateObjectDescription(prompt: string): {
  category: string;
  description: string;
  geometry: string;
  material: { color: string; metalness: number; roughness: number };
} {
  return classifyObjectFallback(prompt);
}

function classifyObjectFallback(prompt: string): {
  category: string;
  description: string;
  geometry: string;
  material: { color: string; metalness: number; roughness: number };
} {
  const lower = prompt.toLowerCase();

  // Safety equipment
  if (/hard[ -]?hat|helmet|safety/.test(lower)) {
    return {
      category: 'safety_equipment',
      description: 'Personal protective equipment worn on the head to protect against falling objects and impacts. Essential for construction, industrial, and hazardous work environments.',
      geometry: 'compound',
      material: { color: '#FFB300', metalness: 0.1, roughness: 0.7 },
    };
  }

  // Fire safety
  if (/fire|extinguisher|alarm/.test(lower)) {
    return {
      category: 'safety_equipment',
      description: 'Fire safety equipment used to extinguish or control small fires. Critical for emergency response training in workplaces and public spaces.',
      geometry: 'cylinder',
      material: { color: '#DC2626', metalness: 0.3, roughness: 0.5 },
    };
  }

  // Tools
  if (/wrench|screwdriver|hammer|drill|tool/.test(lower)) {
    return {
      category: 'tool',
      description: 'Hand tool used for fastening or loosening hardware. Fundamental tool in mechanical, plumbing, and general maintenance work.',
      geometry: 'compound',
      material: { color: '#6B7280', metalness: 0.8, roughness: 0.3 },
    };
  }

  // Vehicle
  if (/car|truck|vehicle| forklift|bike/.test(lower)) {
    return {
      category: 'vehicle',
      description: 'Motorized vehicle used for transportation of goods or personnel. Requires certified operators with safety training.',
      geometry: 'compound',
      material: { color: '#1E40AF', metalness: 0.6, roughness: 0.4 },
    };
  }

  // Medical
  if (/first aid|medkit|defibrillator|AED/.test(lower)) {
    return {
      category: 'medical',
      description: 'Emergency medical equipment for initial treatment of injuries. Essential for workplace safety and emergency response training.',
      geometry: 'box',
      material: { color: '#DC2626', metalness: 0.1, roughness: 0.6 },
    };
  }

  // Default
  return {
    category: 'generic',
    description: `Training asset for ${prompt} - used in workplace safety and skills development modules.`,
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
    idle: 'The character returns to a neutral standing position, ready for the next instruction. This represents a resting state between training actions.',
    walk: 'The character demonstrates forward locomotion, important for showing safe movement patterns in work environments.',
    wave: 'The character performs a greeting gesture, useful for demonstrating professional communication in training scenarios.',
    point: 'The character points to indicate specific objects or areas, essential for directing attention during safety demonstrations.',
    crouch: 'The character demonstrates a low protective position, critical for showing proper response to overhead hazards.',
  };
  return explanations[animation] ?? 'Animation used for training demonstration.';
}
