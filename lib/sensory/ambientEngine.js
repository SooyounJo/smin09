import { ensureAudioRunning, getSharedAudioContext } from "@/lib/sensory/audioContext";

/**
 * @param {import('@/lib/sensory/schema').SensoryAnalysis['music']} music
 */
export class AmbientSoundEngine {
  /** @param {import('@/lib/sensory/schema').SensoryAnalysis['music']} music */
  constructor(music) {
    this.music = music;
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {(OscillatorNode | AudioBufferSourceNode)[]} */
    this.sources = [];
    /** @type {GainNode | null} */
    this.master = null;
    /** @type {AnalyserNode | null} */
    this.analyser = null;
  }

  async play() {
    this.stop();

    const ctx = await ensureAudioRunning();
    this.ctx = ctx;

    const energy = this.music?.energy ?? 0.45;
    const tempo = this.music?.tempo ?? 72;

    const master = ctx.createGain();
    master.gain.value = 0.55 + energy * 0.25;
    this.master = master;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.88;
    this.analyser = analyser;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.connect(ctx.destination);
    master.connect(analyser);
    analyser.connect(compressor);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 9000;
    filter.Q.value = 0.4;
    filter.connect(master);

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 180;
    highpass.connect(filter);

    const root = 220 + (tempo / 140) * 110;
    const freqs = [root, root * 1.25, root * 1.5, root * 2];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = (0.28 - i * 0.04) * (0.85 + energy * 0.3);
      osc.connect(g);
      g.connect(highpass);
      osc.start();
      this.sources.push(osc);
    });

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.06 + energy * 0.05;
    noise.connect(noiseGain);
    noiseGain.connect(highpass);
    noise.start();
    this.sources.push(noise);
  }

  stop() {
    for (const node of this.sources) {
      try {
        node.stop();
      } catch {
        /* noop */
      }
      try {
        node.disconnect();
      } catch {
        /* noop */
      }
    }
    this.sources = [];
    if (this.master) {
      this.master.disconnect();
      this.master = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        /* noop */
      }
      this.analyser = null;
    }
    this.ctx = getSharedAudioContext();
  }
}
