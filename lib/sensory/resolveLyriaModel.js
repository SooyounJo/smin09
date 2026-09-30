/**
 * Google Gemini Interactions — Lyria 3 family
 * @see https://ai.google.dev/gemini-api/docs/music-generation
 *
 * @param {{ hasImage?: boolean }} [opts]
 * @returns {string}
 */
export function resolveLyriaModel(opts = {}) {
  const fromEnv = (process.env.LYRIA_MODEL || "").trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (opts.hasImage) {
    return "lyria-3.5";
  }
  return "lyria-3-clip-preview";
}
