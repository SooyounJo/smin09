/**
 * @param {number} r 0-255
 * @param {number} g
 * @param {number} b
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) {
      tt += 1;
    }
    if (tt > 1) {
      tt -= 1;
    }
    if (tt < 1 / 6) {
      return p + (q - p) * 6 * tt;
    }
    if (tt < 1 / 2) {
      return q;
    }
    if (tt < 2 / 3) {
      return p + (q - p) * (2 / 3 - tt) * 6;
    }
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * @param {string} hex
 * @param {number} [satBoost] 0~1 추가 채도
 */
export function boostSaturationHex(hex, satBoost = 0.2) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  if (Number.isNaN(n)) {
    return hex;
  }
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const [h, s, l] = rgbToHsl(r, g, b);
  const s2 = Math.min(1, s + satBoost * (1 - s * 0.25));
  const l2 = Math.min(0.96, Math.max(0.42, l + 0.12 + satBoost * 0.08));
  const [rr, gg, bb] = hslToRgb(h, s2, l2);
  return `#${[rr, gg, bb].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * @param {string[]} paletteHex
 * @param {number} [satBoost]
 */
export function boostPaletteSaturation(paletteHex, satBoost = 0.28) {
  return paletteHex.map((hex) => boostSaturationHex(hex, satBoost));
}

/**
 * @typedef {import('@/lib/sensory/visualMotion').mergeMotionProfile extends (...args: any) => infer R ? R : never} MotionProfile
 */

function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 팔레트 + 이미지 구도·에너지로 WebGL 모션 시그니처 (이미지마다 다른 movement)
 * @param {string[]} paletteHex
 * @param {number} [energy]
 * @param {MotionProfile | null} [motion]
 * @param {{ memoryFingerprint?: string } | null} [opts]
 */
export function deriveVisualSignature(
  paletteHex,
  energy = 0.4,
  motion = null,
  opts = null
) {
  const memoryKey = opts?.memoryFingerprint
    ? fnv1a(opts.memoryFingerprint)
    : 0;

  const comp = motion
    ? [
        motion.subjectX?.toFixed(4),
        motion.subjectY?.toFixed(4),
        motion.dominantAngleDeg?.toFixed(2),
        motion.layoutStyle,
        motion.visualEnergy?.toFixed(4),
        motion.motionSpeed?.toFixed(4),
      ].join("|")
    : "default";

  const paletteKey = (paletteHex || []).join("|");
  const hash = fnv1a(`${comp}::${paletteKey}::${memoryKey}`);
  const hash2 = fnv1a(`${paletteKey}::${comp}::${memoryKey}::v2`);

  const layout = motion?.layoutStyle ?? (hash >> 4) % 4;
  const angle = motion?.angleRad ?? ((hash >> 8) % 360) * (Math.PI / 180);
  const rawFlow =
    motion?.flow ?? 0.14 + energy * 0.28 + (hash % 24) / 90;
  const flow = Math.min(0.48, Math.max(0.2, rawFlow * 0.95));

  const angleBucket = Math.floor((motion?.dominantAngleDeg ?? hash % 180) / 22.5);
  const energyBucket = Math.floor((motion?.visualEnergy ?? 0.5) * 7);
  const motionKind =
    (hash % 8 +
      layout * 3 +
      angleBucket +
      energyBucket +
      Math.floor((motion?.subjectX ?? 0.5) * 4) +
      (memoryKey % 8)) %
    8;

  const xBias = (hash2 % 100) / 100;
  const yBias = ((hash2 >> 8) % 100) / 100;
  let waveX = 2.2 + xBias * 6.5 + (motion?.visualEnergy ?? 0) * 1.2;
  let waveY = 1.8 + yBias * 6 + (motion?.motionSpeed ?? 0.5) * 1.1;
  if (motionKind % 3 === 0) {
    waveX *= 1.12;
  } else if (motionKind % 3 === 1) {
    waveY *= 1.12;
  } else {
    waveX *= 0.9;
    waveY *= 1.05;
  }

  return {
    style: motionKind,
    motionKind,
    layout,
    seed: ((hash % 6283) / 1000) * Math.PI * 2,
    seed2: ((hash2 % 6283) / 1000) * Math.PI * 2,
    angle,
    focusX: motion?.focusX ?? 0,
    focusY: motion?.focusY ?? 0,
    driftAmp:
      0.022 + (hash2 % 30) / 1200 + (motion?.motionSpeed ?? 0.3) * 0.045,
    waveX,
    waveY,
    warp: 0.05 + (hash % 28) / 160 + (motion?.motionSpeed ?? 0.3) * 0.05,
    ripple: 1.35 + ((hash >> 5) % 36) / 10 + (motion?.visualEnergy ?? 0) * 0.65,
    flow,
    accentPower: 4.5 + ((hash >> 6) % 9) + (motion?.visualEnergy ?? 0) * 2.5,
    domainWarp: Math.min(
      0.12,
      0.06 +
        ((hash >> 10) % 22) / 85 +
        (motion?.motionSpeed ?? 0.4) * 0.09
    ),
    satBoost: 1.18 + (hash % 14) / 70,
    brightness: 1.06 + (hash % 12) / 90,
  };
}
