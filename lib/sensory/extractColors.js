/**
 * 브라우저에서 이미지 dominant color 추출 (Vision API 보조 입력)
 * 채도 가중치로 하늘·벽 같은 넓은 저채도 영역보다 사진의 '색'을 잘 잡음
 * @param {string} dataUrl
 * @param {number} [count]
 * @returns {Promise<string[]>}
 */
export function extractDominantColors(dataUrl, count = 5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 80;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unsupported"));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map();

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) {
            continue;
          }
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const [, s, l] = rgbToHsl(r, g, b);
          if (l < 0.08 || l > 0.97) {
            continue;
          }
          const rq = r >> 3;
          const gq = g >> 3;
          const bq = b >> 3;
          const key = `${rq},${gq},${bq}`;
          const weight = 1 + s * 2.2 + (1 - Math.abs(l - 0.5)) * 0.5;
          const prev = buckets.get(key) || { r: 0, g: 0, b: 0, score: 0, n: 0 };
          prev.r += r * weight;
          prev.g += g * weight;
          prev.b += b * weight;
          prev.score += weight;
          prev.n += 1;
          buckets.set(key, prev);
        }

        const sorted = [...buckets.values()]
          .sort((a, b) => b.score - a.score)
          .slice(0, count * 4)
          .map((b) =>
            rgbToHex(
              b.r / b.score,
              b.g / b.score,
              b.b / b.score
            )
          );

        const unique = [];
        for (const hex of sorted) {
          if (!unique.some((u) => colorDistance(u, hex) < 28)) {
            unique.push(hex);
          }
          if (unique.length >= count) {
            break;
          }
        }

        while (unique.length < count) {
          unique.push("#6366f1");
        }
        resolve(unique.slice(0, count));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
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

function colorDistance(hexA, hexB) {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((x) => Math.round(x))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}
