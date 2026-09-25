/**
 * @typedef {import('@/lib/sensory/imageComposition').LocalImageComposition} LocalImageComposition
 */

/**
 * @typedef {Object} AiVisualComposition
 * @property {number} [subjectX]
 * @property {number} [subjectY]
 * @property {number} [dominantAngleDeg]
 * @property {number} [motionSpeed]
 * @property {number} [layoutStyle]
 */

function clamp01(v, fallback = 0.5) {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngleDeg(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

/**
 * 로컬 이미지 분석 + Vision JSON + 음악 템포를 WebGL 모션 프로필로 합침
 * @param {LocalImageComposition} local
 * @param {AiVisualComposition | null | undefined} ai
 * @param {{ tempo?: number, energy?: number } | null | undefined} music
 */
export function mergeMotionProfile(local, ai, music) {
  const aiX = ai?.subjectX;
  const aiY = ai?.subjectY;
  const hasAi =
    typeof aiX === "number" &&
    !Number.isNaN(aiX) &&
    typeof aiY === "number" &&
    !Number.isNaN(aiY);

  const subjectX = hasAi
    ? lerp(local.subjectX, clamp01(aiX), 0.55)
    : local.subjectX;
  const subjectY = hasAi
    ? lerp(local.subjectY, clamp01(aiY), 0.55)
    : local.subjectY;

  const aiAngle =
    typeof ai?.dominantAngleDeg === "number" ? ai.dominantAngleDeg : null;
  const dominantAngleDeg = lerpAngleDeg(
    local.dominantAngleDeg,
    aiAngle ?? local.dominantAngleDeg,
    aiAngle != null ? 0.5 : 0
  );

  const tempo = music?.tempo ?? 72;
  const energy = music?.energy ?? 0.4;
  const tempoNorm = (tempo - 50) / 90;
  const aiSpeed =
    typeof ai?.motionSpeed === "number" ? clamp01(ai.motionSpeed) : null;

  const motionSpeed = clamp01(
    lerp(local.motionSpeed, aiSpeed ?? local.motionSpeed, aiSpeed != null ? 0.45 : 0) *
      0.35 +
      tempoNorm * 0.35 +
      energy * 0.3
  );

  const layoutStyle =
    typeof ai?.layoutStyle === "number" && ai.layoutStyle >= 0 && ai.layoutStyle <= 3
      ? Math.round(ai.layoutStyle)
      : local.layoutStyle;

  return {
    subjectX,
    subjectY,
    dominantAngleDeg,
    motionSpeed,
    layoutStyle,
    visualEnergy: local.visualEnergy,
    flow: 0.12 + motionSpeed * 0.65 + energy * 0.15,
    angleRad: (dominantAngleDeg * Math.PI) / 180,
    focusX: subjectX - 0.5,
    focusY: 0.5 - subjectY,
  };
}
