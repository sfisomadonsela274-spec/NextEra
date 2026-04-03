// ============================================
// NexEra — OpenRouter AI Integration (free tier)
// ============================================
// Uses OpenRouter's free model tier for LLM-powered classification
// and intent mapping. Falls back to keywords if no API key.

// https://openrouter.ai/models?q=free
const MODEL = 'qwen/qwen-2.5-72b-instruct:free';
const BASE_URL = 'https://openrouter.ai/api/v1';

export function isOpenRouterAvailable(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function openrouterChat(
  messages: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://nextera-rouge.vercel.app',
      'X-Title': 'NexEra',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter error: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
