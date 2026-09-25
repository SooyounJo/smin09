import { SENSORY_SYSTEM_PROMPT, buildAnalyzeUserText } from "@/lib/sensory/prompt";
import { readEnvKey } from "@/lib/sensory/env";

/**
 * @param {{ imageDataUrl: string, dominantColors: string[], localComposition?: object }} input
 */
export async function analyzeWithOpenAI(input) {
  const apiKey = readEnvKey("OPENAI_API_KEY");
  if (!apiKey) {
    return null;
  }

  const match = input.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }

  const [, mime, base64] = match;
  const dataUrl = `data:${mime};base64,${base64}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SENSORY_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildAnalyzeUserText(
                input.dominantColors,
                input.localComposition
              ),
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty OpenAI response");
  }
  return JSON.parse(content);
}
