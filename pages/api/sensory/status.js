import { resolveVisionProvider } from "@/lib/sensory/resolveVisionProvider";
import { hasGeminiKey, hasOpenAIKey } from "@/lib/sensory/env";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const provider = resolveVisionProvider();

  return res.status(200).json({
    ready: Boolean(provider),
    provider: provider || "mock",
    openaiKeySet: hasOpenAIKey(),
    geminiKeySet: hasGeminiKey(),
    model:
      provider === "openai"
        ? process.env.OPENAI_VISION_MODEL || "gpt-4o-mini"
        : provider === "gemini"
          ? process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash"
          : null,
  });
}
