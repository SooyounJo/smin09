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

/**
 * 팔레트 해시(미세 variation) + 이미지 구도·속도 프로필
 * @param {string[]} paletteHex
 * @param {number} [energy]
 * @param {MotionProfile | null} [motion]
 */
export function deriveVisualSignature(paletteHex, energy = 0.4, motion = null) {
  const str = (paletteHex || []).join("|");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash >>>= 0;

  const style = hash % 5;
  const layout = motion?.layoutStyle ?? (hash >> 4) % 4;
  const angle = motion?.angleRad ?? ((hash >> 8) % 360) * (Math.PI / 180);
  const flow = motion?.flow ?? 0.28 + energy * 0.5 + (hash % 18) / 70;

  return {
    style,
    layout,
    seed: ((hash % 6283) / 1000) * Math.PI * 2,
    angle,
    focusX: motion?.focusX ?? 0,
    focusY: motion?.focusY ?? 0,
    waveX: 4.5 + (hash % 48) / 7 + (motion?.visualEnergy ?? 0) * 1.2,
    waveY: 3.5 + ((hash >> 3) % 48) / 7 + (motion?.motionSpeed ?? 0.5) * 1.5,
    warp: 0.08 + (hash % 28) / 160 + (motion?.motionSpeed ?? 0.3) * 0.06,
    ripple: 2.2 + ((hash >> 5) % 36) / 9,
    flow,
    accentPower: 5.5 + ((hash >> 6) % 6) + (motion?.visualEnergy ?? 0) * 2,
    domainWarp:
      0.1 +
      ((hash >> 10) % 20) / 80 +
      (motion?.motionSpeed ?? 0.4) * 0.12,
    satBoost: 1.22 + (hash % 10) / 80,
    brightness: 1.08 + (hash % 8) / 100,
  };
}
