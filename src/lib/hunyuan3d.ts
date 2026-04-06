// ============================================
// NexEra — Hunyuan3D-2 via HuggingFace Spaces
// ============================================
// Free, no API key required — uses Gradio API
// to fetch the model output after async generation.
// Space: https://huggingface.co/spaces/tencent/Hunyuan3D-2
//
// API flow (Gradio pattern):
//  1. POST to /call/{endpoint} with prompt
//  2. GET /call/{endpoint}/{event_id} for status
//  3. Fetch .glb from the returned URL

const SPACE_URL = 'https://tencent-hunyuan3d-2.hf.space';

export interface Hunyuan3DResult {
  event_id: string;
  output?: {
    data: Array<{ url: string }>;
  };
  status: 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface Hunyuan3DOptions {
  prompt: string;
  imageBase64?: string; // optional image as data-URL
  onProgress?: (msg: string) => void;
  signal?: AbortSignal;
}

// ─── Submit generation task via Gradio API ────────────────────────────────────

async function submitGradioTask(opts: Hunyuan3DOptions): Promise<string> {
  const { prompt, imageBase64, signal } = opts;

  // Gradio API format: POST /call/{fn_index} with data array
  // For Hunyuan3D-2, the text-to-3D endpoint is typically fn_index=0
  const body = {
    data: [
      imageBase64 || null, // image input (optional)
      prompt,               // text prompt
    ],
  };

  const res = await fetch(`${SPACE_URL}/call/0`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    // Try alternative endpoint format
    const altRes = await fetch(`${SPACE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn_index: 0,
        data: [imageBase64 || null, prompt],
      }),
      signal,
    });

    if (!altRes.ok) {
      throw new Error(`Hunyuan3D submit failed: ${res.status}`);
    }

    const altData = await altRes.json();
    return altData.event_id ?? altData.task_id ?? 'task-' + Date.now();
  }

  const data = await res.json();
  return data.event_id ?? data.task_id ?? 'task-' + Date.now();
}

// ─── Poll for completion ─────────────────────────────────────────────────────

async function pollGradioTask(eventId: string, signal?: AbortSignal): Promise<{ glbUrl: string }> {
  const maxWait = 180_000; // 3 minutes
  const start = Date.now();

  while (true) {
    if (signal?.aborted) throw new Error('Aborted');
    if (Date.now() - start > maxWait) throw new Error('Hunyuan3D timed out after 3 minutes');

    try {
      // Gradio streaming API: GET /call/{fn_index}/{event_id}
      const res = await fetch(`${SPACE_URL}/call/0/${eventId}`, {
        signal,
      });

      if (!res.ok) {
        // Task might still be queued
        await sleep(3_000);
        continue;
      }

      // Parse SSE-like response or JSON
      const text = await res.text();

      // Check for completion marker
      if (text.includes('"status":"completed"') || text.includes('"status": "completed"')) {
        // Extract GLB URL from response
        const urlMatch = text.match(/"url":\s*"([^"]+\.glb[^"]*)"/);
        if (urlMatch) {
          return { glbUrl: urlMatch[1] };
        }

        // Try parsing as JSON
        try {
          const json = JSON.parse(text);
          if (json.output?.data?.[0]?.url) {
            return { glbUrl: json.output.data[0].url };
          }
          if (json.data?.[0]?.url) {
            return { glbUrl: json.data[0].url };
          }
        } catch {
          // Not JSON, continue polling
        }
      }

      if (text.includes('"status":"failed"') || text.includes('error')) {
        throw new Error('Hunyuan3D generation failed');
      }

      // Still processing
      await sleep(3_000);
    } catch (err) {
      if ((err as Error).message === 'Aborted') throw err;
      // Network hiccup — wait and retry
      await sleep(3_000);
    }
  }
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Generate a 3D model using Hunyuan3D-2 via HuggingFace Spaces.
 * Returns a GLB Blob suitable for loading into Three.js.
 *
 * Note: This may fail due to CORS or Space availability. The caller
 * should implement a fallback (e.g., procedural models).
 */
export async function generateWithHunyuan3D(
  opts: Hunyuan3DOptions
): Promise<Blob> {
  const { onProgress, signal } = opts;

  onProgress?.('Connecting to Hunyuan3D-2...');

  try {
    const eventId = await submitGradioTask({ ...opts, signal });
    onProgress?.(`Generating model... (${eventId.slice(0, 8)})`);

    const result = await pollGradioTask(eventId, signal);

    onProgress?.('Downloading 3D model...');

    // Handle relative URLs
    const glbUrl = result.glbUrl.startsWith('http')
      ? result.glbUrl
      : `${SPACE_URL}${result.glbUrl.startsWith('/') ? '' : '/'}${result.glbUrl}`;

    const glbRes = await fetch(glbUrl, { signal });
    if (!glbRes.ok) {
      throw new Error(`Failed to download GLB: ${glbRes.status}`);
    }

    onProgress?.('Model downloaded!');
    return glbRes.blob();
  } catch (err) {
    // Re-throw with context
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Hunyuan3D unavailable: ${message}. Using fallback.`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Alternative: Try HuggingFace Inference API ─────────────────────────────────

/**
 * Alternative method using @huggingface/inference SDK.
 * This may work better for CORS handling.
 */
export async function generateWithHuggingFaceInference(
  opts: Hunyuan3DOptions
): Promise<Blob> {
  const { prompt, onProgress, signal } = opts;

  onProgress?.('Calling HuggingFace Inference...');

  try {
    // Dynamic import to avoid bundling issues
    const { HfInference } = await import('@huggingface/inference');

    // Use a free inference endpoint for text-to-3D
    // Note: This requires a HuggingFace token for some models
    const hf = new HfInference();

    // Hunyuan3D-2 isn't directly available via inference API
    // Fall back to error
    throw new Error('HuggingFace Inference does not support Hunyuan3D-2 directly');
  } catch (err) {
    throw new Error(`HuggingFace Inference failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
