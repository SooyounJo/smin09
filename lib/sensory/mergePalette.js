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
  const l = (max + min) / 2;
  let s = 0;
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

function padPalette(list, fallback) {
  const out = list.filter(Boolean).slice(0, 4);
  while (out.length < 4) {
    out.push(fallback[out.length % fallback.length]);
  }
  return out;
}

function sortByHue(hexList) {
  return [...hexList].sort((a, b) => {
    const ha = rgbToHsl(...hexToRgb(a))[0];
    const hb = rgbToHsl(...hexToRgb(b))[0];
    return ha - hb;
  });
}

/** @param {string} a @param {string} b @param {number} t 0=a, 1=b */
function blendHex(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t
  );
}

/**
 * AI 팔레트를 이미지 추출색에 붙임 — 키 컬러가 사진과 크게 어긋나지 않게
 * @param {string[]} extracted
 * @param {string[]} aiPalette
 * @param {number} [aiWeight] AI 쪽 비중 (낮을수록 추출색에 가까움)
 */
export function harmonizeKeyPalette(extracted, aiPalette, aiWeight = 0.38) {
  const fallback = padPalette(extracted, ["#888888"]);
  const ex = sortByHue(padPalette(extracted, fallback));
  const ai = sortByHue(padPalette(aiPalette, ex));

  let weight = aiWeight;
  let delta = 0;
  for (let i = 0; i < 4; i += 1) {
    const [er, eg, eb] = hexToRgb(ex[i]);
    const [ar, ag, ab] = hexToRgb(ai[i]);
    delta +=
      Math.abs(er - ar) + Math.abs(eg - ag) + Math.abs(eb - ab);
  }
  if (delta / 5 > 180) {
    weight = Math.min(weight, 0.28);
  }

  return ex.map((hex, i) => blendHex(hex, ai[i], weight));
}
