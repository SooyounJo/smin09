import { readEnvKey } from "@/lib/sensory/env";

const INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

/**
 * @param {unknown} json
 * @returns {string | null}
 */
export function extractAudioBase64(json) {
  if (!json || typeof json !== "object") {
    return null;
  }
  const o = /** @type {Record<string, unknown>} */ (json);

  const direct = o.output_audio ?? o.outputAudio;
  if (direct && typeof direct === "object") {
    const data = /** @type {{ data?: string }} */ (direct).data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
  }

  const steps = o.steps ?? o.interaction?.steps;
  if (!Array.isArray(steps)) {
    return null;
  }

  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (!step || typeof step !== "object") {
      continue;
    }
    const blocks =
      step.content ??
      step.contents ??
      step.model_output ??
      step.modelOutput ??
      [];
    const list = Array.isArray(blocks) ? blocks : [blocks];
    for (const block of list) {
      if (!block || typeof block !== "object") {
        continue;
      }
      const b = /** @type {Record<string, unknown>} */ (block);
      if (b.type === "audio" && typeof b.data === "string") {
        return b.data;
      }
      if (b.inline_data && typeof b.inline_data === "object") {
        const d = /** @type {{ data?: string }} */ (b.inline_data).data;
        if (d) {
          return d;
        }
      }
    }
  }
  return null;
}

/**
 * @param {{ prompt: string, imageDataUrl?: string | null }} input
 */
export async function generateLyriaMusic(input) {
  const apiKey = readEnvKey("GEMINI_API_KEY");
  if (!apiKey) {
    return null;
  }

  const model =
    process.env.LYRIA_MODEL || "lyria-3-clip-preview";

  /** @type {unknown} */
  let bodyInput = input.prompt;

  if (input.imageDataUrl) {
    const match = input.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const [, mime, data] = match;
      bodyInput = [
        { type: "text", text: input.prompt },
        { type: "image", mime_type: mime, data },
      ];
    }
  }

  const response = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: bodyInput,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text.slice(0, 400);
    try {
      const parsed = JSON.parse(text);
      const msg =
        parsed?.error?.message ??
        parsed?.[0]?.error?.message ??
        parsed?.message;
      if (typeof msg === "string") {
        detail = msg;
      }
    } catch {
      /* keep raw slice */
    }
    if (response.status === 402) {
      throw new Error(
        `Lyria 결제 크레딧이 부족합니다(402). AI Studio에서 Billing·선불 크레딧을 충전해야 Lyria를 쓸 수 있습니다. (${detail})`
      );
    }
    throw new Error(`Lyria error ${response.status}: ${detail}`);
  }

  const json = await response.json();
  const base64 = extractAudioBase64(json);
  if (!base64) {
    throw new Error("Lyria response had no audio data");
  }

  return {
    base64,
    mimeType: "audio/mpeg",
    model,
    lyrics: json.output_text ?? json.outputText ?? null,
  };
}
