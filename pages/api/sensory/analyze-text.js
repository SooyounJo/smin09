import { buildMockTextAnalysis } from "@/lib/sensory/mockTextAnalysis";
import { normalizeSensoryAnalysis } from "@/lib/sensory/parseResponse";
import { analyzeTextWithGemini } from "@/lib/sensory/providers/geminiText";
import { analyzeTextWithOpenAI } from "@/lib/sensory/providers/openaiText";
import { resolveVisionProvider } from "@/lib/sensory/resolveVisionProvider";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { memoryText } = req.body || {};
  if (typeof memoryText !== "string" || memoryText.trim().length < 8) {
    return res.status(400).json({
      error: "memoryText is required (at least a few characters)",
    });
  }

  const providerChoice = resolveVisionProvider();

  if (!providerChoice) {
    const mock = buildMockTextAnalysis(memoryText);
    return res.status(200).json({
      ...mock,
      provider: "mock",
      hint:
        "OPENAI_API_KEY 또는 GEMINI_API_KEY를 .env에 넣고 dev 서버를 재시작하세요.",
    });
  }

  try {
    let raw = null;
    const provider = providerChoice;

    if (providerChoice === "gemini") {
      raw = await analyzeTextWithGemini({ memoryText });
    } else {
      raw = await analyzeTextWithOpenAI({ memoryText });
    }

    if (!raw) {
      const mock = buildMockTextAnalysis(memoryText);
      return res.status(200).json({ ...mock, provider: "mock" });
    }

    const analysis = normalizeSensoryAnalysis(raw, { mock: false });
    return res.status(200).json({ ...analysis, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return res.status(502).json({ error: message });
  }
}
