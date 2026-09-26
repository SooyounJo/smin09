/**
 * @param {import('@/lib/sensory/schema').SensoryAnalysis} analysis
 */
export function buildLyriaPrompt(analysis) {
  const music = analysis?.music || {};
  const keywords = (analysis?.emotionKeywords || []).join(", ");
  const spatial = (analysis?.spatialKeywords || []).join(", ");
  const instruments = (music.instruments || []).join(", ");

  return [
    "Create a 30-second instrumental ambient background track.",
    "No vocals, no lyrics, no sudden drops — continuous gentle soundscape for a sensory web experience.",
    music.description ? `Mood: ${music.description}` : "",
    music.mood ? `Label: ${music.mood}` : "",
    music.tempo ? `Approximate tempo: ${music.tempo} BPM` : "",
    instruments ? `Textures: ${instruments}` : "",
    keywords ? `Emotional keywords: ${keywords}` : "",
    spatial ? `Space feeling: ${spatial}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
