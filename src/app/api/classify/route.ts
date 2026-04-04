import { NextResponse } from 'next/server';

// ─── NexEra AI Classification API — server-side only ───────
// 1. Try Ollama (local LLM, when OLLAMA_BASE_URL is set → dev mode)
// 2. Try Hugging Face (when HF_TOKEN is set → deployed mode)
// 3. Robust keyword fallback (always works)

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? '';
const HF_TOKEN = process.env.HF_TOKEN ?? '';
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const OLLAMA_MODEL = 'qwen2.5:1.5b-instruct'; // small, fast local model

export async function POST(request: Request) {
  let promptText: string;
  let imageUrl = '';
  let imageBase64 = '';

  try {
    const body = await request.json();
    promptText = (body.prompt ?? '').trim();
    imageUrl = body.imageUrl ?? '';
    imageBase64 = body.imageBase64 ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!promptText) {
    return NextResponse.json({ error: 'Empty prompt' }, { status: 400 });
  }

  // ── 1. Ollama (local dev only) ━━━━━━━━━━━━━━━━━━━━━━
  if (OLLAMA_BASE && promptText) {
    try {
      const result = await classifyViaOllama(promptText);
      if (result) return NextResponse.json(result);
    } catch (err: unknown) {
      console.warn('[API /classify] Ollama failed:', err);
    }
  }

  // ── 2. Hugging Face (deployed with HF_TOKEN) ━━━━━━━━━
  if (HF_TOKEN) {
    try {
      const result = await classifyViaHF(promptText, imageUrl, imageBase64);
      if (result) return NextResponse.json(result);
    } catch (err: unknown) {
      console.warn('[API /classify] HF failed:', err);
    }
  }

  // ── 3. Keyword fallback (always works) ━━━━━━━━━━━━━━━
  return NextResponse.json(keywordFallback(promptText));
}

// ─── Ollama ────────────────────────────────────────────────────

async function classifyViaOllama(prompt: string) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a 3D asset classifier. Respond ONLY with valid JSON. No markdown, no explanation.',
        },
        {
          role: 'user',
          content: `For the object "${prompt}", respond with this JSON only:
{"category":"tool|safety_equipment|medical|vehicle|furniture|electronics|generic","description":"2 sentences on training use","color":"#HEX","metalness":0.0-1.0,"roughness":0.0-1.0}`,
        },
      ],
      stream: false,
      options: { temperature: 0.1, num_predict: 200 },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}`);

  const data = await res.json();
  const raw: string = data.message?.content ?? '';
  const parsed = parseJSONFromText(raw);

  if (!parsed) return null;

  if (!parsed) return null;

  return buildResult(prompt, {
    category: String(parsed.category ?? 'generic'),
    description: String(parsed.description ?? ''),
    material: {
      color: String(parsed.color ?? '#8B5CF6'),
      metalness: Number(parsed.metalness ?? 0.2),
      roughness: Number(parsed.roughness ?? 0.5),
    },
  });
}

// ─── Hugging Face ──────────────────────────────────────────────

async function classifyViaHF(prompt: string, imageUrl: string, imageBase64: string) {
  let userContent: Array<{ type: string; text?: string; image_url?: { url: string } }>;

  if (imageBase64) {
    userContent = [
      { type: 'text', text: 'Classify this training object and return JSON only.' },
      { type: 'image_url', image_url: { url: imageBase64 } },
    ];
  } else if (imageUrl) {
    userContent = [
      { type: 'text', text: 'Classify this training object and return JSON only.' },
      { type: 'image_url', image_url: { url: imageUrl } },
    ];
  } else {
    userContent = [{ type: 'text', text: prompt }];
  }

  const res = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistralai/Mistral-Small-3.1-24B-Instruct-2503',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HF ${res.status}`);

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '';
  const codeBlock = raw.match(/```(?:json)?\n?([\s\S]*?)```/);
  const jsonStr = codeBlock ? codeBlock[1] : raw;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(jsonStr); } catch { return null; }

  return buildResult(prompt, {
    category: String(parsed.category ?? 'generic'),
    description: String(parsed.description ?? ''),
    material: {
      color: String(parsed.color ?? '#8B5CF6'),
      metalness: Number(parsed.metalness ?? 0.2),
      roughness: Number(parsed.roughness ?? 0.5),
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────

function parseJSONFromText(text: string): Record<string, unknown> | null {
  // Try fenced code block
  const block = text.match(/```(?:json)?\n?([\s\S]*?)```/);
  const jsonStr = block ? block[1] : text;
  // Find first { to last }
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try { return JSON.parse(jsonMatch[0]); } catch { return null; }
}

function buildResult(
  prompt: string,
  classification: {
    category: string;
    description: string;
    material: { color: string; metalness: number; roughness: number };
  }
) {
  return {
    classification,
    summary: summaries[classification.category] || genericSummary(prompt),
  };
}

function genericSummary(p: string) {
  return `This "${p.toLowerCase()}" is a training asset used in workplace safety and skills development modules.`;
}

const summaries: Record<string, string> = {
  safety_equipment: 'Essential personal protective equipment (PPE) for workplace safety training and hazard awareness.',
  tool: 'Practical hand tool featured in skills training — proper handling, inspection, and safe operation.',
  medical: 'Emergency medical equipment for first response training. All staff should know its location and use.',
  vehicle: 'Workplace vehicle/machinery requiring certified operators and safety awareness training.',
  furniture: 'Office/industrial furniture used in ergonomics and workspace safety training modules.',
  electronics: 'Electronic equipment covered in electrical safety and handling training programs.',
};

// ─── Keyword Fallback (always works, never fails) ─────────────

function keywordFallback(text: string) {
  const lower = text.toLowerCase().trim();

  const entries: [RegExp, string, string, string, string, number, number][] = [
    // regex,           category,     desc,                                                          summary,                                                          color,        metal, rough
    [/hard[ -]?hat|helmet/,              'safety_equipment', 'Personal protective headgear against falling objects in construction and industrial environments.', 'A hard hat protects against falling objects and impacts — one of the most critical pieces of PPE on any worksite.',    '#FFB300', 0.1, 0.7],
    [/fire.*extinguisher|fire.*alarm/,   'safety_equipment', 'Portable fire safety equipment for extinguishing small fires.', 'A fire extinguisher is essential for initial fire response — every trained worker should know the PASS method.',                        '#DC2626', 0.3, 0.5],
    [/safety.*vest|hi.*vis|high.*vis/,   'safety_equipment', 'High-visibility garment for hazardous areas.', 'A safety vest ensures workers are visible to vehicle operators in low-light or busy environments.',                                                   '#FF6600', 0.0, 0.9],
    [/first.*aid|medkit|defib|aed/,      'medical',          'Emergency medical supply kit for immediate treatment.', 'A first aid kit provides immediate response supplies — it must be accessible and contents regularly checked.',                   '#FFFFFF', 0.1, 0.6],
    [/wrench|screwdriver|hammer|drill/,  'tool',             'Hand tool for fastening, loosening, or shaping.', 'Using the right tool with proper technique prevents injuries and equipment damage on the worksite.',                            '#6B7280', 0.8, 0.3],
    [/ladder|scaffold|step.*stool/,      'tool',             'Access equipment for reaching elevated areas.', 'Falls from ladders are a top workplace injury — proper setup, inspection, and 3-point contact are critical.',                   '#E6A200', 0.1, 0.7],
    [/car|truck|forklift|vehicle/,       'vehicle',          'Workplace vehicle requiring trained operators.', 'Forklift and vehicle safety is mandatory — operators must be certified and follow site-specific traffic rules.',                '#1E40AF', 0.6, 0.4],
    [/cone|barrier|warning.*sign/,       'safety_equipment', 'Temporary warning device for hazard marking.', 'Cones and barriers create visual hazard zones — essential for site control and pedestrian safety.',                            '#FFA500', 0.0, 0.8],
    [/glove|boot|goggle|mask|respirator/,'safety_equipment', 'Personal protective equipment for specific body protection.', 'PPE is the last line of defense — proper selection, fitting, and inspection prevents workplace injuries.',                      '#374151', 0.1, 0.7],
    [/pipe|valve|pipe[ -]?wrench/,       'tool',             'Plumbing tool for connecting or controlling fluid flow.', 'Proper pipe and valve handling is critical in industrial safety to prevent leaks and hazardous material exposure.',             '#9CA3AF', 0.7, 0.3],
  ];

  for (const [regex, category, desc, summary, color, metal, rough] of entries) {
    if (regex.test(lower)) {
      return {
        classification: {
          category,
          description: desc,
          material: { color, metalness: metal, roughness: rough },
        },
        summary,
      };
    }
  }

  // Generic — always returns something
  return {
    classification: {
      category: 'generic',
      description: `Training asset representing "${text}" — used in NexEra's workplace safety and skills development modules.`,
      material: { color: '#8B5CF6', metalness: 0.2, roughness: 0.5 },
    },
    summary: `This "${text.toLowerCase()}" is used in NexEra's training modules to give learners hands-on experience with workplace safety content.`,
  };
}
