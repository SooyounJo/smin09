import { SENSORY_SYSTEM_PROMPT, buildAnalyzeUserText } from "@/lib/sensory/prompt";
import { readEnvKey } from "@/lib/sensory/env";

/**
 * @param {{ imageDataUrl: string, dominantColors: string[], localComposition?: object }} input
 */
export async function analyzeWithGemini(input) {
  const apiKey = readEnvKey("GEMINI_API_KEY");
  if (!apiKey) {
    return null;
  }

  const match = input.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }

  const [, mime, base64] = match;
  const model = process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${SENSORY_SYSTEM_PROMPT}\n\n${buildAnalyzeUserText(input.dominantColors, input.localComposition)}`,
            },
            { inline_data: { mime_type: mime, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty Gemini response");
  }
  return JSON.parse(text);
}
