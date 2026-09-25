/**
 * Vision API 전송용 — 용량·해상도 축소
 * @param {string} dataUrl
 * @param {number} [maxEdge]
 * @param {number} [quality]
 * @returns {Promise<string>}
 */
export function compressImageForVision(dataUrl, maxEdge = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unsupported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL("image/jpeg", quality);
      resolve(out);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}
