import {
  TEXT_SENSORY_SYSTEM_PROMPT,
  buildTextAnalyzeUserMessage,
} from "@/lib/sensory/promptText";
import { readEnvKey } from "@/lib/sensory/env";

/**
 * @param {{ memoryText: string }} input
 */
export async function analyzeTextWithGemini(input) {
  const apiKey = readEnvKey("GEMINI_API_KEY");
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${TEXT_SENSORY_SYSTEM_PROMPT}\n\n${buildTextAnalyzeUserMessage(input.memoryText)}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.65,
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
