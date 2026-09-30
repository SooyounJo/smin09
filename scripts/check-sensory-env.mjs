import fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const lines = envText.split(/\r?\n/).filter((l) => l.trim());
const keys = {};
for (const line of lines) {
  const i = line.indexOf("=");
  if (i < 1) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim();
  keys[k] = v.replace(/^["']|["']$/g, "");
}

function mask(v) {
  if (!v) return "MISSING";
  if (v.length < 12) return "SET(short)";
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

console.log("OPENAI", keys.OPENAI_API_KEY?.startsWith("sk-") ? mask(keys.OPENAI_API_KEY) : "INVALID");
console.log("GEMINI", keys.GEMINI_API_KEY?.startsWith("AIza") ? mask(keys.GEMINI_API_KEY) : "INVALID");
console.log("VISION_PROVIDER", keys.SENSORY_VISION_PROVIDER || "auto");
console.log("LYRIA_MODEL", keys.LYRIA_MODEL || "(default clip)");
console.log(
  "GEMINI duplicate lines",
  lines.filter((l) => l.startsWith("GEMINI_API_KEY=")).length
);
