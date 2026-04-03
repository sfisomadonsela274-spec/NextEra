// ============================================
// NexEra — Hunyuan3D-2 via HuggingFace Spaces
// ============================================
// Free, no API key required — uses hf_hub Download
// to fetch the model output after async generation.
// Space: https://huggingface.co/spaces/hysts/Hunyuan3D-2
//
// API flow:
//  1. POST task to the Space with prompt (+ optional image)
//  2. Poll /status/{task_id} until "COMPLETED"
//  3. Fetch .glb from the returned URL

const SPACE_URL = 'https://hysts-hunyuan3d-2.hf.space';

export interface Hunyuan3DResult {
  task_id: string;
  status: 'processing' | 'completed' | 'failed';
  model_url?: string;
  message?: string;
}

export interface Hunyuan3DOptions {
  prompt: string;
  imageBase64?: string; // optional image as data-URL
  onProgress?: (msg: string) => void;
  signal?: AbortSignal;
}

// ─── Submit generation task ─────────────────────────────────────────────────

async function submitTask(opts: Hunyuan3DOptions): Promise<string> {
  const { prompt, imageBase64, signal } = opts;

  const body: Record<string, unknown> = {
    prompt,
    stream: false,
  };
  if (imageBase64) {
    body.image = imageBase64;
  }

  const res = await fetch(`${SPACE_URL}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Hunyuan3D submit failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // The Space returns { task_id: "..." } or similar
  return data.task_id ?? data.id ?? String(data);
}

// ─── Poll for completion ─────────────────────────────────────────────────────

async function pollTask(taskId: string, signal?: AbortSignal): Promise<Hunyuan3DResult> {
  const maxWait = 300_000; // 5 minutes
  const start = Date.now();

  while (true) {
    if (signal?.aborted) throw new Error('Aborted');
    if (Date.now() - start > maxWait) throw new Error('Hunyuan3D timed out after 5 minutes');

    try {
      const res = await fetch(`${SPACE_URL}/api/status/${encodeURIComponent(taskId)}`, {
        signal,
      });

      if (!res.ok) {
        // Space may return 404 while task is queued — keep polling
        await sleep(5_000);
        continue;
      }

      const data: Hunyuan3DResult = await res.json();

      if (data.status === 'completed') return data;
      if (data.status === 'failed') throw new Error(data.message ?? 'Generation failed');

      // processing / queued
      await sleep(5_000);
    } catch (err) {
      if ((err as Error).message === 'Aborted') throw err;
      // Network hiccup — wait and retry
      await sleep(5_000);
    }
  }
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Generate a 3D model using Hunyuan3D-2 via HuggingFace Spaces.
 * Returns a GLB Blob suitable for loading into Three.js.
 */
export async function generateWithHunyuan3D(
  opts: Hunyuan3DOptions
): Promise<Blob> {
  const { onProgress, signal } = opts;

  onProgress?.('Submitting to Hunyuan3D-2...');

  const taskId = await submitTask({ ...opts, signal });
  onProgress?.(`Task submitted: ${taskId.slice(0, 8)}...`);

  const result = await pollTask(taskId, signal);

  if (!result.model_url) {
    throw new Error('No model URL returned from Hunyuan3D');
  }

  onProgress?.('Downloading GLB...');

  const glbRes = await fetch(result.model_url, { signal });
  if (!glbRes.ok) {
    throw new Error(`Failed to download GLB: ${glbRes.status}`);
  }

  return glbRes.blob();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
