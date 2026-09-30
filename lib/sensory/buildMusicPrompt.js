import {
  paletteSonicHint,
  pickAntiClicheLine,
  pickExtraTexture,
  pickLyriaArchetype,
} from "@/lib/sensory/musicVariety";

/**
 * @param {import('@/lib/sensory/schema').SensoryAnalysis} analysis
 * @param {{ model?: string, varietySeed?: string } | null} [opts]
 */
export function buildLyriaPrompt(analysis, opts = null) {
  const music = analysis?.music || {};
  const keywords = (analysis?.emotionKeywords || []).join(", ");
  const spatial = (analysis?.spatialKeywords || []).join(", ");
  const model = opts?.model || "";
  const varietySeed = opts?.varietySeed || "";
  const longForm = model.includes("3.5");
  const archetype = pickLyriaArchetype(analysis, varietySeed);
  const textureFocus = pickExtraTexture(analysis, varietySeed);
  const antiCliche = pickAntiClicheLine(analysis, varietySeed);
  const paletteHint = paletteSonicHint(analysis?.paletteHex);

  const tempoRaw = typeof music.tempo === "number" ? music.tempo : 72;
  const tempoFeel = Math.min(100, Math.max(50, Math.round(tempoRaw)));
  const energy =
    typeof music.energy === "number"
      ? Math.min(0.55, Math.max(0.12, music.energy))
      : 0.3;

  const memory = analysis?.memoryImpression?.trim();
  const situation = analysis?.situationGuess?.trim();

  return [
    longForm
      ? `Create a 90-second instrumental ${archetype.label} track for seamless background looping.`
      : `Create a 30-second instrumental ${archetype.label} track for seamless background looping.`,
    `Sonic direction: ${archetype.sonic}. Avoid generic stock "meditation app" sound — make this identity recognizable.`,
    "Instrumental only: no vocals, no lyrics, no rap, no EDM drop, no loud drums.",
    `Dynamics: ambient background, energy ${energy.toFixed(2)}, tempo feel ~${tempoFeel} BPM or free-time.`,
    `Primary textures — emphasize: ${textureFocus}.`,
    paletteHint,
    antiCliche,
    memory ? `Scene memory (Korean context OK): ${memory}` : "",
    situation ? `Situation: ${situation}` : "",
    music.description ? `Music brief: ${music.description}` : "",
    music.mood ? `Mood: ${music.mood}` : "",
    keywords ? `Emotion keywords: ${keywords}` : "",
    spatial ? `Space / place feeling: ${spatial}` : "",
    "Structure: evolve timbre every 8–15 seconds; no repeating 4-bar pop loop cliché.",
  ]
    .filter(Boolean)
    .join(" ");
}
