// dot2 배경 음원 생성: node --env-file=.env scripts/generate-dot2-music.mjs
import { writeFile } from "node:fs/promises";

function extractAudioBase64(json) {
  if (json?.output_audio?.data) return json.output_audio.data;
  const steps = json?.steps ?? json?.interaction?.steps ?? [];
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const blocks = steps[i]?.content ?? steps[i]?.contents ?? steps[i]?.model_output ?? [];
    for (const b of Array.isArray(blocks) ? blocks : [blocks]) {
      if (b?.type === "audio" && typeof b.data === "string") return b.data;
      if (b?.inline_data?.data) return b.inline_data.data;
    }
  }
  return null;
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY가 없습니다.");
  process.exit(1);
}

const model = (process.env.LYRIA_MODEL || "").trim() || "lyria-3-clip-preview";
const prompt =
  "Night driving. A 30-second instrumental track: warm analog synth pads, " +
  "soft pulsing bassline, gentle electronic drums, city lights passing by, " +
  "dreamy and cinematic, smooth steady tempo around 95 BPM. No vocals.";

const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/interactions",
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ model, input: prompt }),
  }
);

if (!response.ok) {
  console.error(`Lyria error ${response.status}: ${(await response.text()).slice(0, 600)}`);
  process.exit(1);
}

const base64 = extractAudioBase64(await response.json());
if (!base64) {
  console.error("응답에 오디오 데이터가 없습니다.");
  process.exit(1);
}

const out = new URL("../public/dot2/night-driving.mp3", import.meta.url);
await writeFile(out, Buffer.from(base64, "base64"));
console.log(`saved ${out.pathname} (model: ${model})`);
