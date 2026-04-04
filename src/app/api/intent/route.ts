import { NextResponse } from 'next/server';

// ─── NexEra AI Intent (Command → Animation) API Route ─────────────────
// Uses Hugging Face Inference API (free tier) to interpret natural
// language commands and map them to avatar animations.
// Falls back to keyword-based mapping when HF token unavailable.

const HF_TOKEN = process.env.HF_TOKEN ?? '';
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

export async function POST(request: Request) {
  let command: string;
  try {
    const body = await request.json();
    command = (body.command ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!command) return NextResponse.json({ error: 'Empty command' }, { status: 400 });

  // Try HF when configured
  if (HF_TOKEN) {
    try {
      const intent = await mapIntentViaHF(command);
      return NextResponse.json(intent);
    } catch (err: unknown) {
      console.error('[API /intent] HF error:', err);
    }
  }

  return NextResponse.json(keywordFallback(command));
}

// ────────────────────────────────────────────────────────────────────────────────

async function mapIntentViaHF(command: string) {
  const ANIMATIONS = ['idle', 'walk', 'wave', 'point', 'crouch', 'posture', 'jump', 'celebrate', 'look_around', 'pick_up', 'open_door'];

  const res = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistralai/Mistral-Small-3.1-24B-Instruct-2503',
      messages: [
        {
          role: 'user',
          content: `You are a command interpreter for a 3D training avatar. Map this user command to one of these animations: ${ANIMATIONS.join(', ')}. Respond ONLY with a JSON object: {"animation": "<animation_name>", "confidence": 0.0-1.0, "explanation": "<1 sentence explaining the action>"}. Command: "${command}"`,
        },
      ],
      max_tokens: 200,
    }),
  });

  if (!res.ok) throw new Error(`HF API returned ${res.status}`);

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  let jsonStr = raw;
  const codeBlock = raw.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1];

  const parsed = JSON.parse(jsonStr);
  const anim = ANIMATIONS.includes(parsed.animation) ? parsed.animation : 'idle';
  return { animation: anim, confidence: parsed.confidence ?? 0.5, explanation: parsed.explanation ?? '' };
}

// ────────────────────────────────────────────────────────────────────────────────

function keywordFallback(command: string) {
  const lower = command.toLowerCase();

  const entries = Object.entries(keywordMap);
  for (const [anim, keywords] of entries) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { animation: anim, confidence: 0.9, explanation: descriptions[anim] };
      }
    }
  }
  return { animation: 'idle', confidence: 0.3, explanation: descriptions.idle };
}

const keywordMap: Record<string, string[]> = {
  walk: ['walk', 'come', 'go', 'move', 'forward', 'approach', 'step'],
  wave: ['wave', 'hello', 'hi', 'greet'],
  point: ['point', 'look', 'indicate', 'show', 'this', 'there'],
  crouch: ['crouch', 'down', 'hide', 'squat', 'kneel', 'duck'],
  posture: ['posture', 'stand', 'stance', 'form', 'correct'],
  jump: ['jump', 'hop', 'skip', 'bounce', 'leap'],
  celebrate: ['celebrate', 'cheer', 'victory', 'success'],
  look_around: ['look around', 'scan', 'observe', 'search', 'survey', 'examine'],
  pick_up: ['pick up', 'lift', 'grab', 'carry', 'hold', 'grab the'],
  open_door: ['open door', 'door', 'enter', 'open the', 'enter through'],
  idle: ['stop', 'wait', 'stay', 'idle', 'stand still', 'rest'],
};

const descriptions: Record<string, string> = {
  idle: 'The avatar returns to a neutral resting position, ready for the next instruction.',
  walk: 'Avatar walks forward to demonstrate movement, approach, or safe locomotion.',
  wave: 'Avatar waves to greet someone, demonstrating professional communication.',
  point: 'Avatar points to an object or direction, essential for directing attention during safety demos.',
  crouch: 'Avatar demonstrates a low protective position, critical for responding to overhead hazards.',
  posture: 'Avatar stands in the correct safety posture, demonstrating proper stance for workplace training.',
  jump: 'Avatar jumps to demonstrate agility, useful for emergency escape training.',
  celebrate: 'Avatar celebrates to demonstrate positive reinforcement, used in successful safety assessments.',
  look_around: 'Avatar scans the environment, teaching situational awareness and hazard identification.',
  pick_up: 'Avatar performs a pick-up motion with proper lifting technique, demonstrating safe handling of objects.',
  open_door: 'Avatar opens a door, demonstrating safe entry procedures and building access protocols.',
};
