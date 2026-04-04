import { NextResponse } from 'next/server';

// ─── NexEra AI Classification API Route ─────────────────────────────────
// Uses Hugging Face Inference API (free tier)
// Falls back to keyword-based classification when HF token unavailable.

const HF_TOKEN = process.env.HF_TOKEN ?? '';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

export async function POST(request: Request) {
  let promptText: string;
  let imageUrl: string;
  let imageBase64: string;

  try {
    const body = await request.json();
    promptText = (body.prompt ?? '').trim();
    imageUrl = body.imageUrl ?? '';
    imageBase64 = body.imageBase64 ?? ''; // base64 data URL
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // ── Try Hugging Face when token configured ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (HF_TOKEN && promptText) {
    try {
      const result = await classifyViaHF(promptText, imageUrl, imageBase64);
      return NextResponse.json(result);
    } catch (err: unknown) {
      console.error('[API /classify] HF error:', err);
    }
  }

  return NextResponse.json(keywordFallback(promptText));
}

// ────────────────────────────────────────────────────────────────────────────────

async function classifyViaHF(
  promptText: string,
  imageUrl: string,
  imageBase64: string
) {
  // Build messages — use multimodal content when image provided
  let userContent: Array<{ type: string; text?: string; image_url?: { url: string } }>;

  if (imageBase64) {
    userContent = [
      { type: 'text', text: `What training-relevant object is shown in this image?` },
      { type: 'image_url', image_url: { url: imageBase64 } },
    ];
  } else if (imageUrl) {
    userContent = [
      { type: 'text', text: `What training-relevant object is shown in this image?` },
      { type: 'image_url', image_url: { url: imageUrl } },
    ];
  } else {
    userContent = [{ type: 'text', text: promptText }];
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
      max_tokens: 500,
    }),
  });

  if (!res.ok) throw new Error(`HF API returned ${res.status}`);

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  // Parse JSON from response (may be wrapped in markdown)
  let jsonStr = raw;
  const codeBlock = raw.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1];

  const parsed = JSON.parse(jsonStr);

  const { geometry: _g, category, description, material } = parsed;
  const classification = {
    category: category ?? 'generic',
    description: description ?? '',
    material: material ?? { color: '#8B5CF6', metalness: 0.2, roughness: 0.5 },
  };

  const summary = generateSummary(promptText, classification);

  return { classification, summary };
}

// ──────────────────────────────────────────────────────────────────────

function generateSummary(
  promptText: string,
  classification: { category: string; description: string }
) {
  const summaries: Record<string, string> = {
    safety_equipment: `This ${promptText.toLowerCase()} is essential personal protective equipment (PPE) used in workplace safety training. It is commonly featured in NexEra's human training modules for safety compliance and hazard awareness.`,
    tool: `This ${promptText.toLowerCase()} is a practical hand tool featured in NexEra's skills training curriculum. Workers learn proper handling, inspection, and safe operation techniques through interactive training scenarios.`,
    medical: `This ${promptText.toLowerCase()} is essential emergency equipment for workplace first response training. All staff should know its location and basic operation during emergency scenarios.`,
  };
  return (
    summaries[classification.category] ??
    `This "${promptText.toLowerCase()}" is a training asset used in workplace safety and skills development modules. It provides hands-on educational experience for NexEra's human training programs.`
  );
}

function keywordFallback(text: string) {
  const lower = text.toLowerCase();

  if (/hard[ -]?hat|helmet|safety.*equipment/i.test(lower)) {
    return {
      classification: {
        category: 'safety_equipment',
        description: 'Personal protective equipment worn on the head to protect against falling objects and impacts in construction and industrial environments.',
        material: { color: '#FFB300', metalness: 0.1, roughness: 0.7 },
      },
      summary: 'A hard hat is essential personal protective headgear used in construction, manufacturing, and industrial environments to protect against falling objects, impacts, and electrical hazards.',
    };
  }

  if (/fire.*extinguisher|fire.*safety/i.test(lower)) {
    return {
      classification: {
        category: 'safety_equipment',
        description: 'Portable fire safety equipment used to extinguish small fires in their initial stages.',
        material: { color: '#DC2626', metalness: 0.3, roughness: 0.5 },
      },
      summary: 'A fire extinguisher is a critical piece of fire safety equipment that every workplace must have accessible, trained personnel should know how to operate it for small fire suppression.',
    };
  }

  if (/wrench|spanner|tool/i.test(lower)) {
    return {
      classification: {
        category: 'tool',
        description: 'Hand tool used for fastening or loosening bolts, nuts, and fittings.',
        material: { color: '#6B7280', metalness: 0.8, roughness: 0.3 },
      },
      summary: 'A wrench is a fundamental hand tool used in mechanical, plumbing, and maintenance work for turning bolts and nuts. Proper wrench selection and technique prevents injury and equipment damage.',
    };
  }

  if (/first.*aid|medkit|medical/i.test(lower)) {
    return {
      classification: {
        category: 'medical',
        description: 'Emergency medical supply kit containing bandages, antiseptics, and basic treatment supplies.',
        material: { color: '#FFFFFF', metalness: 0.1, roughness: 0.6 },
      },
      summary: 'A first aid kit contains essential emergency supplies for immediate response to workplace injuries. Every facility must maintain accessible, well-stocked kits with regularly checked contents.',
    };
  }

  if (/safety.*vest|hi.*vis|high.*visibility/i.test(lower)) {
    return {
      classification: {
        category: 'safety_equipment',
        description: 'High-visibility protective garment for workers in hazardous or vehicle-dense areas.',
        material: { color: '#FF6600', metalness: 0.0, roughness: 0.9 },
      },
      summary: 'A safety vest provides high-visibility protection for workers near vehicles, machinery, or in low-light conditions. It is required PPE in construction zones and roadside work areas.',
    };
  }

  if (/ladder|step.*tool|access/i.test(lower)) {
    return {
      classification: {
        category: 'tool',
        description: 'Portable climbing apparatus for reaching elevated work areas safely.',
        material: { color: '#E6A200', metalness: 0.1, roughness: 0.7 },
      },
      summary: 'A ladder is essential access equipment for elevated work. Proper ladder setup, inspection, and safe climbing techniques prevent falls, a leading cause of workplace injuries.',
    };
  }

  // Generic
  return {
    classification: {
      category: 'generic',
      description: `Training asset for "${text}" — used in workplace safety and skills development modules.`,
      material: { color: '#8B5CF6', metalness: 0.2, roughness: 0.5 },
    },
    summary: `This "${text}" is a training asset used in workplace safety and skills development. It is featured in NexEra's human training modules to provide hands-on educational experience.`,
  };
}
