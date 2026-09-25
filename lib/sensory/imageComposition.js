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

/**
 * @typedef {Object} LocalImageComposition
 * @property {number} subjectX 0–1 (left→right)
 * @property {number} subjectY 0–1 (top→bottom)
 * @property {number} dominantAngleDeg
 * @property {number} motionSpeed 0–1
 * @property {number} layoutStyle 0–3
 * @property {number} visualEnergy 0–1
 */

/**
 * @param {string} dataUrl
 * @returns {Promise<LocalImageComposition>}
 */
export function extractImageComposition(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = 96;
        const h = 96;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unsupported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let sumW = 0;
        let sumX = 0;
        let sumY = 0;
        let gradSum = 0;
        let gradCount = 0;
        let sin2 = 0;
        let cos2 = 0;
        let orientWeight = 0;
        let lumVar = 0;
        const lumSamples = [];

        const lumAt = (x, y) => {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        };

        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            if (a < 128) {
              continue;
            }
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const [, s, l] = rgbToHsl(r, g, b);
            if (l < 0.06 || l > 0.98) {
              continue;
            }
            const weight = (0.35 + s * 1.8) * (1 - Math.abs(l - 0.48));
            sumW += weight;
            sumX += (x / (w - 1)) * weight;
            sumY += (y / (h - 1)) * weight;
            lumSamples.push(l);
          }
        }

        for (let y = 1; y < h - 1; y += 2) {
          for (let x = 1; x < w - 1; x += 2) {
            const gx = lumAt(x + 1, y) - lumAt(x - 1, y);
            const gy = lumAt(x, y + 1) - lumAt(x, y - 1);
            const mag = Math.hypot(gx, gy);
            if (mag < 0.02) {
              continue;
            }
            gradSum += mag;
            gradCount += 1;
            const angle = Math.atan2(gy, gx);
            sin2 += Math.sin(2 * angle) * mag;
            cos2 += Math.cos(2 * angle) * mag;
            orientWeight += mag;
          }
        }

        const meanLum =
          lumSamples.reduce((a, b) => a + b, 0) / Math.max(lumSamples.length, 1);
        for (const l of lumSamples) {
          lumVar += (l - meanLum) ** 2;
        }
        lumVar /= Math.max(lumSamples.length, 1);

        const subjectX = sumW > 0 ? sumX / sumW : 0.5;
        const subjectY = sumW > 0 ? sumY / sumW : 0.5;

        let dominantAngleDeg = 0;
        if (orientWeight > 0) {
          dominantAngleDeg =
            (Math.atan2(sin2 / orientWeight, cos2 / orientWeight) / 2) *
            (180 / Math.PI);
          if (dominantAngleDeg < 0) {
            dominantAngleDeg += 180;
          }
        }

        const visualEnergy = Math.min(
          1,
          Math.sqrt(lumVar) * 3.2 + (gradCount ? gradSum / gradCount : 0) * 2.5
        );
        const motionSpeed = Math.min(
          1,
          0.25 + visualEnergy * 0.45 + (gradCount ? gradSum / gradCount : 0) * 1.2
        );

        let layoutStyle = 0;
        const dx = subjectX - 0.5;
        const dy = subjectY - 0.5;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.12) {
          layoutStyle = 0;
        } else if (Math.abs(dx) > Math.abs(dy)) {
          layoutStyle = dx > 0 ? 1 : 2;
        } else {
          layoutStyle = dy > 0 ? 3 : 1;
        }

        resolve({
          subjectX,
          subjectY,
          dominantAngleDeg,
          motionSpeed,
          layoutStyle,
          visualEnergy,
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}
