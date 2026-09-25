import { hasGeminiKey, hasOpenAIKey } from "@/lib/sensory/env";

/**
 * @returns {'openai' | 'gemini' | null}
 */
export function resolveVisionProvider() {
  const hasOpenAI = hasOpenAIKey();
  const hasGemini = hasGeminiKey();
  const pref = (process.env.SENSORY_VISION_PROVIDER || "auto").toLowerCase();

  if (pref === "gemini") {
    if (hasGemini) {
      return "gemini";
    }
    if (hasOpenAI) {
      return "openai";
    }
    return null;
  }
  if (pref === "openai") {
    return hasOpenAI ? "openai" : null;
  }

  // auto: 키가 하나만 있으면 그쪽, 둘 다 있으면 Gemini 우선 (Google 단일 스택 편의)
  if (hasGemini && !hasOpenAI) {
    return "gemini";
  }
  if (hasOpenAI && !hasGemini) {
    return "openai";
  }
  if (hasGemini) {
    return "gemini";
  }
  if (hasOpenAI) {
    return "openai";
  }
  return null;
}
