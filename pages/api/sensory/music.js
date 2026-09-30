import { buildLyriaPrompt } from "@/lib/sensory/buildMusicPrompt";
import { hasGeminiKey } from "@/lib/sensory/env";
import { generateLyriaMusic } from "@/lib/sensory/providers/lyriaMusic";
import { resolveLyriaModel } from "@/lib/sensory/resolveLyriaModel";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
    responseLimit: false,
  },
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasGeminiKey()) {
    return res.status(501).json({
      error: "GEMINI_API_KEY not configured",
      hint: "Lyria는 Google AI Studio 키(GEMINI_API_KEY)가 필요합니다. OpenAI Vision과 별도로 .env에 추가하세요.",
    });
  }

  const { analysis, imageDataUrl, varietySeed } = req.body || {};
  if (!analysis || typeof analysis !== "object") {
    return res.status(400).json({ error: "analysis object is required" });
  }

  const hasImage = typeof imageDataUrl === "string" && imageDataUrl.length > 0;
  const lyriaModel = resolveLyriaModel({ hasImage });
  const seed =
    typeof varietySeed === "string" && varietySeed.length > 0
      ? varietySeed
      : "";
  const prompt = buildLyriaPrompt(analysis, {
    model: lyriaModel,
    varietySeed: seed,
  });

  try {
    const result = await generateLyriaMusic({
      prompt,
      imageDataUrl: hasImage ? imageDataUrl : null,
    });

    if (!result) {
      return res.status(502).json({ error: "Lyria generation failed" });
    }

    const dataUrl = `data:${result.mimeType};base64,${result.base64}`;

    return res.status(200).json({
      provider: "lyria",
      model: result.model,
      mimeType: result.mimeType,
      dataUrl,
      lyrics: result.lyrics,
      promptUsed: prompt.slice(0, 500),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lyria failed";
    return res.status(502).json({ error: message });
  }
}
