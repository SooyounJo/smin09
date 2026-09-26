import { ensureAudioRunning } from "@/lib/sensory/audioContext";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** @type {WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>} */
const mediaSources = new WeakMap();

/**
 * Lyria `<audio>` 또는 Web Audio 엔진 출력을 읽어 WebGL 모션에 쓸 스냅샷 제공
 */
export class AudioMotionBridge {
  constructor() {
    /** @type {{ level: number, bass: number, active: boolean }} */
    this.snapshot = { level: 0, bass: 0, active: false };
    /** @type {AnalyserNode | null} */
    this.analyser = null;
    /** @type {Uint8Array | null} */
    this._freqData = null;
    /** @type {AudioContext | null} */
    this._ctx = null;
    /** @type {HTMLMediaElement | null} */
    this._mediaEl = null;
  }

  /**
   * @param {AnalyserNode} analyser
   */
  bindAnalyser(analyser) {
    this._releaseMediaGraph();
    this.analyser = analyser;
    this._freqData = new Uint8Array(analyser.frequencyBinCount);
    this.snapshot.active = true;
  }

  /**
   * @param {HTMLMediaElement} audioEl
   */
  async bindMediaElement(audioEl) {
    if (this._mediaEl === audioEl && this.analyser) {
      this.snapshot.active = true;
      return;
    }
    this.clear();

    const ctx = await ensureAudioRunning();
    this._ctx = ctx;
    this._mediaEl = audioEl;

    let source = mediaSources.get(audioEl);
    if (!source) {
      source = ctx.createMediaElementSource(audioEl);
      mediaSources.set(audioEl, source);
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.88;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    this.analyser = analyser;
    this._freqData = new Uint8Array(analyser.frequencyBinCount);
    this.snapshot.active = true;
  }

  tick() {
    if (!this.analyser || !this._freqData) {
      this.snapshot.level = lerp(this.snapshot.level, 0, 0.12);
      this.snapshot.bass = lerp(this.snapshot.bass, 0, 0.12);
      if (this.snapshot.level < 0.01 && this.snapshot.bass < 0.01) {
        this.snapshot.active = false;
      }
      return;
    }

    this.analyser.getByteFrequencyData(this._freqData);
    const len = this._freqData.length;
    const bassBins = Math.max(4, Math.floor(len * 0.14));
    let bassSum = 0;
    let total = 0;
    for (let i = 0; i < len; i += 1) {
      total += this._freqData[i];
      if (i < bassBins) {
        bassSum += this._freqData[i];
      }
    }

    const levelTarget = total / len / 255;
    const bassTarget = bassSum / bassBins / 255;

    this.snapshot.level = lerp(this.snapshot.level, levelTarget, 0.14);
    this.snapshot.bass = lerp(this.snapshot.bass, bassTarget, 0.14);
    this.snapshot.active = true;
  }

  _releaseMediaGraph() {
    if (this.analyser && this._mediaEl) {
      try {
        this.analyser.disconnect();
      } catch {
        /* noop */
      }
    }
    this._mediaEl = null;
  }

  clear() {
    this._releaseMediaGraph();
    this.analyser = null;
    this._freqData = null;
    this._ctx = null;
    this.snapshot = { level: 0, bass: 0, active: false };
  }
}
