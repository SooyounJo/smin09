import { EMPTY_ANALYSIS } from "@/lib/sensory/schema";

/**
 * @param {unknown} raw
 * @param {{ dominantColors?: string[], mock?: boolean }} [meta]
 * @returns {import('@/lib/sensory/schema').SensoryAnalysis}
 */
export function normalizeSensoryAnalysis(raw, meta = {}) {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_ANALYSIS, mock: Boolean(meta.mock) };
  }

  const o = /** @type {Record<string, unknown>} */ (raw);
  const paletteFromAi =
    o.paletteAdjustments &&
    typeof o.paletteAdjustments === "object" &&
    Array.isArray(/** @type {{ hex?: unknown }} */ (o.paletteAdjustments).hex)
      ? /** @type {{ hex: unknown[] }} */ (o.paletteAdjustments).hex
      : null;

  const paletteHex = sanitizeHexList(
    paletteFromAi || o.paletteHex,
    meta.dominantColors || EMPTY_ANALYSIS.paletteHex
  );

  const scentRaw =
    o.scent && typeof o.scent === "object"
      ? /** @type {Record<string, unknown>} */ (o.scent)
      : {};

  const musicRaw =
    o.music && typeof o.music === "object"
      ? /** @type {Record<string, unknown>} */ (o.music)
      : {};

  const visRaw =
    o.visualComposition && typeof o.visualComposition === "object"
      ? /** @type {Record<string, unknown>} */ (o.visualComposition)
      : {};

  return {
    memoryImpression: str(o.memoryImpression),
    situationGuess: str(o.situationGuess),
    emotionKeywords: strArray(o.emotionKeywords, 5),
    spatialKeywords: strArray(o.spatialKeywords, 6),
    paletteHex,
    scent: {
      blendName: str(scentRaw.blendName),
      top: strArray(scentRaw.top, 4),
      heart: strArray(scentRaw.heart, 4),
      base: strArray(scentRaw.base, 4),
      mixRatioHint: str(scentRaw.mixRatioHint),
      narrative: str(scentRaw.narrative),
    },
    music: {
      tempo: clampNum(musicRaw.tempo, 50, 140, 72),
      energy: clampNum(musicRaw.energy, 0, 1, 0.4),
      mood: str(musicRaw.mood),
      instruments: strArray(musicRaw.instruments, 5),
      description: str(musicRaw.description),
    },
    primaryModality: o.primaryModality === "scent" ? "scent" : "music",
    primaryModalityReason: str(o.primaryModalityReason),
    visualComposition: {
      subjectX: clampNum(visRaw.subjectX, 0, 1, 0.5),
      subjectY: clampNum(visRaw.subjectY, 0, 1, 0.5),
      dominantAngleDeg: clampNum(visRaw.dominantAngleDeg, 0, 180, 0),
      motionSpeed: clampNum(visRaw.motionSpeed, 0, 1, 0.5),
      layoutStyle: clampNum(visRaw.layoutStyle, 0, 3, 0),
    },
    mock: Boolean(meta.mock),
  };
}

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function strArray(v, max) {
  if (!Array.isArray(v)) {
    return [];
  }
  return v
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => x.trim())
    .slice(0, max);
}

function clampNum(v, min, max, fallback) {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

function sanitizeHexList(input, fallback) {
  const list = Array.isArray(input)
    ? input.filter((c) => typeof c === "string" && HEX.test(c))
    : [];
  if (list.length >= 4) {
    return list.slice(0, 4);
  }
  const merged = [...list];
  for (const c of fallback) {
    if (merged.length >= 4) {
      break;
    }
    if (!merged.includes(c)) {
      merged.push(c);
    }
  }
  while (merged.length < 4) {
    merged.push(fallback[merged.length % fallback.length]);
  }
  return merged.slice(0, 4);
}
