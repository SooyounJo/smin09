import { ensureAudioRunning, getSharedAudioContext } from "@/lib/sensory/audioContext";
import { synthProfileFromMusic } from "@/lib/sensory/musicVariety";

/**
 * @param {import('@/lib/sensory/schema').SensoryAnalysis['music']} music
 */
export class AmbientSoundEngine {
  /**
   * @param {import('@/lib/sensory/schema').SensoryAnalysis['music']} music
   * @param {string} [varietySeed]
   */
  constructor(music, varietySeed = "") {
    this.music = music;
    this.varietySeed = varietySeed;
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

    const profile = synthProfileFromMusic(this.music, this.varietySeed);

    const master = ctx.createGain();
    master.gain.value = profile.masterGain;
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
    filter.frequency.value = profile.lpFreq;
    filter.Q.value = 0.35 + (this.music?.energy ?? 0.3) * 0.3;
    filter.connect(master);

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = profile.hpFreq;
    highpass.connect(filter);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = profile.lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = profile.lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.sources.push(lfo);

    profile.ratios.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = /** @type {OscillatorType} */ (profile.types[i] || "sine");
      osc.frequency.value = profile.rootBase * ratio;
      osc.detune.value = profile.detuneCents[i] ?? 0;
      const g = ctx.createGain();
      g.gain.value = (0.26 - i * 0.035) * (0.9 + (this.music?.energy ?? 0.3) * 0.25);
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
    noiseGain.gain.value = profile.noiseGain;
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
