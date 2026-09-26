import {
  TEXT_SENSORY_SYSTEM_PROMPT,
  buildTextAnalyzeUserMessage,
} from "@/lib/sensory/promptText";
import { readEnvKey } from "@/lib/sensory/env";

/**
 * @param {{ memoryText: string }} input
 */
export async function analyzeTextWithOpenAI(input) {
  const apiKey = readEnvKey("OPENAI_API_KEY");
  if (!apiKey) {
    return null;
  }

  const model =
    process.env.OPENAI_TEXT_MODEL ||
    process.env.OPENAI_VISION_MODEL ||
    "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TEXT_SENSORY_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildTextAnalyzeUserMessage(input.memoryText),
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
