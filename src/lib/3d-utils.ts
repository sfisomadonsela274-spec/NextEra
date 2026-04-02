import type { MeshyTaskResult } from '@/types';

// ============================================
// NexEra — 3D Generation API Utilities
// ============================================

const MESHY_API_KEY = process.env.MESHY_API_KEY ?? '';
const TRIPO_API_KEY = process.env.TRIPO_API_KEY ?? '';

const MESHY_BASE = 'https://api.meshy.ai/v1';
const TRIPO_BASE = 'https://api.tripoml.com/v1';

// ─── Meshy.ai ─────────────────────────────────────────────────────────────────
// Meshy supports text-to-3D and image-to-3D with polling

export async function generateWithMeshy(
  request: { prompt?: string; imageUrl?: string; onProgress?: (p: number) => void }
): Promise<string> {
  const { prompt, imageUrl, onProgress } = request;

  // Step 1: Create task
  const body: Record<string, unknown> = {};
  if (prompt) body.text_prompt = prompt;
  if (imageUrl) body.image_url = imageUrl;
  body.style = 'realistic';
  body.resolution = 'medium';

  const createRes = await fetch(`${MESHY_BASE}/text-to-3d`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) throw new Error(`Meshy create failed: ${createRes.status}`);
  const { task_id }: { task_id: string } = await createRes.json();

  // Step 2: Poll for completion (max 90s)
  for (let i = 0; i < 45; i++) {
    await sleep(2000);

    const pollRes = await fetch(`${MESHY_BASE}/text-to-3d/${task_id}`, {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
    });

    if (!pollRes.ok) continue;
    const result: MeshyTaskResult = await pollRes.json();

    if (onProgress && result.progress !== undefined) {
      onProgress(result.progress);
    }

    if (result.status === 'completed' && result.model_url) {
      return result.model_url;
    }
    if (result.status === 'failed') {
      throw new Error('Meshy generation failed');
    }
  }

  throw new Error('Meshy polling timed out');
}

// ─── Tripo AI ──────────────────────────────────────────────────────────────────

export async function generateWithTripo(
  request: { prompt?: string; imageUrl?: string; onProgress?: (p: number) => void }
): Promise<string> {
  const { prompt, imageUrl, onProgress } = request;

  // Step 1: Create job
  const body: Record<string, unknown> = {};
  if (prompt) body.prompt = prompt;
  if (imageUrl) body.image_url = imageUrl;

  const createRes = await fetch(`${TRIPO_BASE}/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TRIPO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) throw new Error(`Tripo create failed: ${createRes.status}`);
  const { job_id }: { job_id: string } = await createRes.json();

  // Step 2: Poll
  for (let i = 0; i < 45; i++) {
    await sleep(2000);

    const pollRes = await fetch(`${TRIPO_BASE}/job/${job_id}`, {
      headers: { Authorization: `Bearer ${TRIPO_API_KEY}` },
    });

    if (!pollRes.ok) continue;
    const result = await pollRes.json();

    if (onProgress && result.progress !== undefined) {
      onProgress(result.progress);
    }

    if (result.status === 'completed' && result.model_url) {
      return result.model_url;
    }
    if (result.status === 'failed') {
      throw new Error('Tripo generation failed');
    }
  }

  throw new Error('Tripo polling timed out');
}

// ─── Generation Router ─────────────────────────────────────────────────────────

export type GenerationProvider = 'meshy' | 'tripo';

export async function generate3DModel(
  request: { prompt?: string; imageUrl?: string; provider?: GenerationProvider; onProgress?: (p: number) => void }
): Promise<string> {
  const provider = request.provider ?? 'meshy';

  if (provider === 'tripo') {
    return generateWithTripo(request);
  }
  return generateWithMeshy(request);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── CORS-safe URL helper ──────────────────────────────────────────────────────

export function isCORSsafe(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'data:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

// Re-export types
export type { MeshyTaskResult } from '@/types';
