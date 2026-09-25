/** @returns {string} */
export function readEnvKey(name) {
  const raw = process.env[name];
  if (!raw || typeof raw !== "string") {
    return "";
  }
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function hasOpenAIKey() {
  return readEnvKey("OPENAI_API_KEY").length > 0;
}

export function hasGeminiKey() {
  return readEnvKey("GEMINI_API_KEY").length > 0;
}
