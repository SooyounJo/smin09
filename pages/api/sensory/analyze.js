import { buildMockAnalysis } from "@/lib/sensory/mockAnalysis";
import { normalizeSensoryAnalysis } from "@/lib/sensory/parseResponse";
import { resolveVisionProvider } from "@/lib/sensory/resolveVisionProvider";
import { analyzeWithGemini } from "@/lib/sensory/providers/geminiVision";
import { analyzeWithOpenAI } from "@/lib/sensory/providers/openaiVision";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageDataUrl, dominantColors, localComposition } = req.body || {};

  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return res.status(400).json({ error: "imageDataUrl is required" });
  }

  const colors = Array.isArray(dominantColors)
    ? dominantColors.filter((c) => typeof c === "string")
    : [];

  const providerChoice = resolveVisionProvider();

  if (!providerChoice) {
    const mock = buildMockAnalysis(colors);
    return res.status(200).json({
      ...mock,
      provider: "mock",
      hint:
        "OPENAI_API_KEY 또는 GEMINI_API_KEY를 .env에 넣고 dev 서버를 재시작하세요. SENSORY_VISION_PROVIDER=openai 권장.",
    });
  }

  try {
    let raw = null;
    const provider = providerChoice;

    const visionInput = {
      imageDataUrl,
      dominantColors: colors,
      localComposition,
    };
    if (providerChoice === "gemini") {
      raw = await analyzeWithGemini(visionInput);
    } else {
      raw = await analyzeWithOpenAI(visionInput);
    }

    if (!raw) {
      const mock = buildMockAnalysis(colors);
      return res.status(200).json({ ...mock, provider: "mock" });
    }

    const analysis = normalizeSensoryAnalysis(raw, {
      dominantColors: colors,
      mock: false,
    });

    return res.status(200).json({ ...analysis, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return res.status(502).json({ error: message });
  }
}
