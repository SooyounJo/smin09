import { ensureAudioRunning } from "@/lib/sensory/audioContext";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** @type {WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>} */
const mediaSources = new WeakMap();

const BANDS = {
  bass: [20, 250],
  mid: [250, 2000],
  high: [2000, 10000],
};

/** 조용한 앰비언트도 반응하도록 밴드별 최근 피크로 정규화 */
const PEAK_FLOOR = 0.035;
const PEAK_DECAY = 0.996;
const BEAT_COOLDOWN_MS = 240;

function emptySnapshot() {
  return { level: 0, bass: 0, mid: 0, high: 0, pulse: 0, active: false };
}

/**
 * Lyria `<audio>` 또는 Web Audio 엔진 출력을 읽어 WebGL 모션에 쓸 스냅샷 제공
 */
export class AudioMotionBridge {
  constructor() {
    /** @type {{ level: number, bass: number, mid: number, high: number, pulse: number, active: boolean }} */
    this.snapshot = emptySnapshot();
    /** @type {AnalyserNode | null} */
    this.analyser = null;
    /** @type {Uint8Array | null} */
    this._freqData = null;
    /** @type {AudioContext | null} */
    this._ctx = null;
    /** @type {HTMLMediaElement | null} */
    this._mediaEl = null;
    this._resetDynamics();
  }

  _resetDynamics() {
    this._peaks = { level: PEAK_FLOOR, bass: PEAK_FLOOR, mid: PEAK_FLOOR, high: PEAK_FLOOR };
    this._bassSlow = 0;
    this._lastBeat = 0;
    /** @type {{ bass: [number, number], mid: [number, number], high: [number, number] } | null} */
    this._binRanges = null;
  }

  /** @param {AnalyserNode} analyser */
  _computeBinRanges(analyser) {
    const nyquist = analyser.context.sampleRate / 2;
    const count = analyser.frequencyBinCount;
    const toBin = (hz) =>
      Math.min(count - 1, Math.max(0, Math.round((hz / nyquist) * count)));
    /** @param {[number, number]} range */
    const range = ([lo, hi]) => {
      const a = toBin(lo);
      return /** @type {[number, number]} */ ([a, Math.max(a + 1, toBin(hi))]);
    };
    this._binRanges = {
      bass: range(BANDS.bass),
      mid: range(BANDS.mid),
      high: range(BANDS.high),
    };
  }

  /**
   * @param {AnalyserNode} analyser
   */
  bindAnalyser(analyser) {
    this._releaseMediaGraph();
    this._resetDynamics();
    this.analyser = analyser;
    this._freqData = new Uint8Array(analyser.frequencyBinCount);
    this._computeBinRanges(analyser);
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
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    this.analyser = analyser;
    this._freqData = new Uint8Array(analyser.frequencyBinCount);
    this._computeBinRanges(analyser);
    this.snapshot.active = true;
  }

  /** @param {'level' | 'bass' | 'mid' | 'high'} key @param {number} raw */
  _normalize(key, raw) {
    const peak = Math.max(raw, this._peaks[key] * PEAK_DECAY, PEAK_FLOOR);
    this._peaks[key] = peak;
    return clamp01(raw / peak);
  }

  /** @param {number} target @param {number} current */
  static _follow(current, target) {
    return lerp(current, target, target > current ? 0.35 : 0.1);
  }

  tick() {
    const snap = this.snapshot;
    if (!this.analyser || !this._freqData || !this._binRanges) {
      snap.level = lerp(snap.level, 0, 0.12);
      snap.bass = lerp(snap.bass, 0, 0.12);
      snap.mid = lerp(snap.mid, 0, 0.12);
      snap.high = lerp(snap.high, 0, 0.12);
      snap.pulse *= 0.9;
      if (snap.level < 0.01 && snap.bass < 0.01 && snap.pulse < 0.01) {
        snap.active = false;
      }
      return;
    }

    const data = this._freqData;
    this.analyser.getByteFrequencyData(data);

    /** @param {[number, number]} range */
    const avg = ([a, b]) => {
      let sum = 0;
      for (let i = a; i < b; i += 1) {
        sum += data[i];
      }
      return sum / Math.max(1, b - a) / 255;
    };

    const rawBass = avg(this._binRanges.bass);
    const rawMid = avg(this._binRanges.mid);
    const rawHigh = avg(this._binRanges.high);
    const rawLevel = rawBass * 0.45 + rawMid * 0.4 + rawHigh * 0.15;

    const bass = this._normalize("bass", rawBass);
    const mid = this._normalize("mid", rawMid);
    const high = this._normalize("high", rawHigh);
    const level = this._normalize("level", rawLevel);

    const now = performance.now();
    this._bassSlow = lerp(this._bassSlow, bass, 0.04);
    const onset = bass - this._bassSlow;
    if (
      onset > 0.16 &&
      bass > 0.45 &&
      now - this._lastBeat > BEAT_COOLDOWN_MS
    ) {
      this._lastBeat = now;
      snap.pulse = Math.max(snap.pulse, clamp01(0.55 + onset * 1.6));
    } else {
      snap.pulse *= 0.93;
    }

    const silent = rawLevel < 0.004;
    snap.level = AudioMotionBridge._follow(snap.level, silent ? 0 : level);
    snap.bass = AudioMotionBridge._follow(snap.bass, silent ? 0 : bass);
    snap.mid = AudioMotionBridge._follow(snap.mid, silent ? 0 : mid);
    snap.high = AudioMotionBridge._follow(snap.high, silent ? 0 : high);
    snap.active = true;
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
    this._resetDynamics();
    this.snapshot = emptySnapshot();
  }
}
