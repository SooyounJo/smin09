/**
 * @typedef {'music' | 'scent'} PrimaryModality
 */

/**
 * @typedef {Object} SensoryAnalysis
 * @property {string} memoryImpression
 * @property {string} situationGuess
 * @property {string[]} emotionKeywords
 * @property {string[]} spatialKeywords
 * @property {string[]} paletteHex
 * @property {{ top: string[], heart: string[], base: string[], narrative: string }} scent
 * @property {{ tempo: number, energy: number, mood: string, instruments: string[], description: string }} music
 * @property {PrimaryModality} primaryModality
 * @property {string} primaryModalityReason
 * @property {{ subjectX: number, subjectY: number, dominantAngleDeg: number, motionSpeed: number, layoutStyle: number }} visualComposition
 * @property {boolean} mock
 */

export const EMPTY_ANALYSIS = {
  memoryImpression: "",
  situationGuess: "",
  emotionKeywords: [],
  spatialKeywords: [],
  paletteHex: ["#7c9cff", "#a78bfa", "#fbbf24", "#5eead4"],
  scent: {
    blendName: "",
    top: [],
    heart: [],
    base: [],
    mixRatioHint: "",
    narrative: "",
  },
  music: {
    tempo: 72,
    energy: 0.35,
    mood: "",
    instruments: [],
    description: "",
  },
  primaryModality: "music",
  primaryModalityReason: "",
  visualComposition: {
    subjectX: 0.5,
    subjectY: 0.5,
    dominantAngleDeg: 0,
    motionSpeed: 0.5,
    layoutStyle: 0,
  },
  mock: false,
};
