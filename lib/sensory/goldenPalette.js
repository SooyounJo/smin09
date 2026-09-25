/** 황금각 ≈ 137.508° */
const GOLDEN_ANGLE = 360 / ((1 + Math.sqrt(5)) / 2) ** 2;
const PHI = (1 + Math.sqrt(5)) / 2;

export const COLOR_ROLE_META = [
  { id: "primary", labelKo: "주요색", lightRatio: 1 / PHI },
  { id: "secondary", labelKo: "부주요색", lightRatio: 1 / (PHI * PHI) },
  { id: "accent", labelKo: "포인트", lightRatio: PHI / (PHI + 1) },
  { id: "auxiliary", labelKo: "보조색", lightRatio: 1 - 1 / PHI },
];

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) {
    return [128, 128, 128];
  }
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((x) => Math.round(Math.max(0, Math.min(255, x))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

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
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
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

function averageHsl(hexList) {
  let hSin = 0;
  let hCos = 0;
  let s = 0;
  let l = 0;
  let n = 0;
  for (const hex of hexList) {
    const [r, g, b] = hexToRgb(hex);
    const [hh, ss, ll] = rgbToHsl(r, g, b);
    hSin += Math.sin(hh * Math.PI * 2);
    hCos += Math.cos(hh * Math.PI * 2);
    s += ss;
    l += ll;
    n += 1;
  }
  if (!n) {
    return [0.55, 0.55, 0.62];
  }
  const h = (Math.atan2(hSin / n, hCos / n) / (Math.PI * 2) + 1) % 1;
  return [h, s / n, l / n];
}

function blendHex(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t
  );
}

function nearestHex(target, candidates) {
  const [tr, tg, tb] = hexToRgb(target);
  let best = candidates[0];
  let bestD = Infinity;
  for (const c of candidates) {
    const [r, g, b] = hexToRgb(c);
    const d = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * @param {string[]} extracted
 * @param {string[]} [tuned] AI/조율색
 * @returns {{ roles: { id: string, labelKo: string, hex: string }[], hexList: string[] }}
 */
export function buildGoldenPalette(extracted, tuned = []) {
  const base = averageHsl(extracted.length ? extracted : tuned);
  const [baseH, baseS, baseL] = base;
  const refs = [...extracted, ...tuned].filter(Boolean);

  const roles = COLOR_ROLE_META.map((meta, index) => {
    const hue = (baseH + (GOLDEN_ANGLE * index) / 360) % 1;
    const sat =
      index === 2
        ? Math.min(0.95, baseS * 1.15 + 0.12)
        : Math.min(0.9, baseS * 1.05 + 0.08);
    const light =
      index === 2
        ? Math.min(0.82, baseL * 0.55 + meta.lightRatio * 0.42 + 0.18)
        : Math.min(0.78, baseL * 0.45 + meta.lightRatio * 0.48 + 0.14);

    const ideal = rgbToHex(...hslToRgb(hue, sat, light));
    const anchor = refs.length ? nearestHex(ideal, refs) : ideal;
    const hex = blendHex(anchor, ideal, refs.length ? 0.42 : 1);

    return { id: meta.id, labelKo: meta.labelKo, hex };
  });

  return {
    roles,
    hexList: roles.map((r) => r.hex),
  };
}
