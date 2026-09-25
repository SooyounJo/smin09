/** @type {AudioContext | null} */
let sharedCtx = null;

export function getSharedAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
}

export async function ensureAudioRunning() {
  const ctx = getSharedAudioContext();
  if (!ctx) {
    throw new Error("Web Audio를 지원하지 않는 브라우저입니다.");
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  if (ctx.state !== "running") {
    await ctx.resume();
  }
  return ctx;
}
