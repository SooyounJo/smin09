import { useEffect, useRef, useState } from "react";
import styles from "@/styles/pages/sensory.module.css";

const VS = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform float u_energy;
uniform float u_seed;
uniform float u_seed2;
uniform float u_motionKind;
uniform float u_driftAmp;
uniform float u_waveX;
uniform float u_waveY;
uniform float u_warp;
uniform float u_ripple;
uniform float u_flow;
uniform float u_style;
uniform float u_layout;
uniform float u_angle;
uniform float u_accentPower;
uniform float u_domainWarp;
uniform float u_focusX;
uniform float u_focusY;
uniform float u_hasPhoto;
uniform float u_shapeMode;
uniform float u_satBoost;
uniform float u_brightness;

const float W_PRIMARY = 0.618;
const float W_SECONDARY = 0.236;
const float W_ACCENT = 0.10;
const float W_AUX = 0.046;

vec3 saturate(vec3 c, float boost) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(l), c, boost);
}

vec2 rotate(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv.y = 1.0 - uv.y;
  vec2 p = uv - 0.5;

  float t = u_time * u_flow;
  float t2 = t * (0.55 + fract(u_seed2 * 0.17) * 0.18);
  float t3 = t * (0.62 + fract(u_seed2 * 0.41) * 0.2);
  float kind = floor(u_motionKind + 0.5);

  vec2 warpVec = vec2(
    sin(uv.y * u_ripple + t + u_seed),
    cos(uv.x * u_ripple * 0.85 - t * 0.58 + u_seed * 0.6)
  ) * u_domainWarp;

  if (kind >= 3.0 && kind < 5.0) {
    warpVec *= 1.08;
  }

  vec2 wuv = uv + warpVec;
  vec2 pr = rotate(wuv - 0.5, u_angle);

  if (u_shapeMode < 0.5) {
    vec2 ambientFlow = vec2(
      sin(uv.y * u_ripple * 0.75 + t * 0.95 + u_seed),
      cos(uv.x * u_ripple * 0.65 - t * 0.88 + u_seed2 * 0.5)
    ) * (u_domainWarp * 1.28 + u_warp * 0.48);
    wuv += ambientFlow;
    pr = rotate(wuv - 0.5, u_angle);
  }

  if (u_shapeMode > 0.5) {
    if (kind < 2.0) {
      vec2 smear = vec2(
        cos(uv.x * 4.2 + t2 + u_seed) * u_domainWarp * 0.35,
        sin(uv.y * 3.1 - t * 0.18 + u_seed2) * u_domainWarp * 0.22
      );
      wuv += smear;
    } else if (kind < 4.0) {
      wuv += vec2(
        sin(length(p) * 6.0 - t * 0.2 + u_seed) * u_domainWarp * 0.28,
        cos(pr.x * 3.5 + t3) * u_domainWarp * 0.18
      );
    } else if (kind < 6.0) {
      wuv += vec2(
        sin(uv.y * 2.2 + t2) * u_domainWarp * 0.15,
        cos(uv.x * 2.2 - t3) * u_domainWarp * 0.15
      );
    } else {
      wuv += vec2(
        sin(pr.y * 2.0 + t2) * u_domainWarp * 0.2,
        sin(pr.x * 2.0 - t3) * u_domainWarp * 0.2
      );
    }
    pr = rotate(wuv - 0.5, u_angle * (0.35 + fract(u_seed2) * 0.5));
  } else if (kind >= 5.0) {
    vec2 extraWarp = vec2(
      sin(pr.y * u_waveX + t2 + u_seed2),
      cos(pr.x * u_waveY - t3 + u_seed2 * 0.7)
    ) * u_domainWarp * 0.42;
    wuv += extraWarp;
    pr = rotate(wuv - 0.5, u_angle);
  }

  vec2 focalDrift =
    vec2(sin(t2 * 0.11 + u_seed2), cos(t3 * 0.09 + u_seed2 * 1.3)) * u_driftAmp;
  vec2 subject = vec2(u_focusX, u_focusY) + focalDrift;

  float waveA =
    sin(wuv.x * u_waveX + t + u_seed) * u_warp +
    sin(wuv.y * u_waveY - t * 0.48 + u_seed * 0.5) * u_warp;
  float waveB = sin((wuv.x + wuv.y) * u_ripple + t * 0.38) * (u_warp * 0.85);
  float waveC = sin(length(pr) * u_ripple * 2.0 - t * 0.55 + u_seed) * u_warp;
  float waveD = sin(pr.x * u_waveY - pr.y * u_waveX + t2 + u_seed2) * u_warp;
  float waveE =
    cos(length(pr - subject) * u_ripple * 2.8 + t3 + u_seed2) * u_warp;

  float wave = waveA;
  if (u_shapeMode > 0.5) {
    wave = waveC * 0.55 + waveE * 0.45 + waveD * 0.35;
  } else if (kind < 1.0) {
    wave = waveA * 0.95 + sin(t * 0.22 + u_seed) * u_warp * 0.2;
  } else if (kind < 2.0) {
    wave = sin(wuv.y * u_waveY - t * 0.55 + u_seed2) * u_warp * 0.95;
  } else if (kind < 3.0) {
    wave = waveC * 0.95 + waveE * 0.35;
  } else if (kind < 4.0) {
    wave = waveB * 0.9 + waveD * 0.65;
  } else if (kind < 5.0) {
    wave =
      sin(pr.x * u_waveX + t2) * u_warp * 0.65 +
      cos(pr.y * u_ripple + t3 + u_seed2) * u_warp * 0.6;
  } else if (kind < 6.0) {
    wave = waveD * 0.85 + sin(t * 0.28 + u_seed) * u_warp * 0.35;
  } else if (kind < 7.0) {
    wave = waveE * 0.85 + waveA * 0.3 + waveC * 0.25;
  } else {
    wave = waveB * 0.45 + waveC * 0.55 + waveD * 0.9 + waveE * 0.35;
  }

  float accentT = kind > 3.0 ? t3 : t;

  float fp;
  float fs;
  float fa;
  float fux;

  if (u_shapeMode > 0.5) {
    vec2 tp = pr;
    float lw = 0.032 + u_warp * 0.03;

    vec2 o1 = subject + vec2(0.24 * sin(t2 * 0.09 + u_seed), 0.1);
    vec2 o2 = subject + vec2(-0.2 * cos(t3 * 0.08), -0.12);
    vec2 o3 = subject + vec2(0.1 * sin(t * 0.05), 0.26);
    float orbs =
      smoothstep(0.34, 0.04, length(tp - o1)) +
      smoothstep(0.26, 0.0, length(tp - o2)) * 0.9 +
      smoothstep(0.22, 0.0, length(tp - o3)) * 0.85;
    orbs = clamp(orbs, 0.0, 1.0);

    float spineX =
      tp.x + sin(tp.y * (2.2 + u_ripple * 0.05) + t2 + u_seed) * (0.14 + u_driftAmp);
    float inkPillar = smoothstep(0.22, 0.0, abs(tp.x - spineX));
    inkPillar *= smoothstep(1.05, 0.08, abs(tp.y - subject.y));

    float c1 = tp.y - (0.12 + 0.08 * sin(tp.x * 3.2 + t2 + u_seed));
    float c2 = tp.y - (-0.08 + 0.1 * sin(tp.x * 2.6 - t3 + u_seed2));
    float c3 = tp.y - (0.28 + 0.06 * cos(tp.x * 4.0 + t * 0.12));
    float curves =
      smoothstep(lw, 0.0, abs(c1)) +
      smoothstep(lw * 0.9, 0.0, abs(c2)) * 0.92 +
      smoothstep(lw, 0.0, abs(c3)) * 0.85;
    curves = clamp(curves * smoothstep(0.58, 0.1, abs(tp.x)), 0.0, 1.0);

    float radial = length(tp - subject);
    float rings =
      smoothstep(0.08, 0.0, abs(radial - 0.18 - wave * 0.05)) +
      smoothstep(0.07, 0.0, abs(radial - 0.32 - sin(t2) * 0.02)) * 0.85 +
      smoothstep(0.06, 0.0, abs(radial - 0.46)) * 0.7;
    rings = clamp(rings, 0.0, 1.0);

    float ang = atan(tp.y - subject.y, tp.x - subject.x);
    float petals = sin(ang * 5.0 + t2 * 0.4 + u_seed) * 0.5 + 0.5;
    petals *= smoothstep(0.55, 0.12, radial);
    petals = clamp(petals, 0.0, 1.0);

    float diag = tp.x * 0.85 + tp.y * 0.52;
    float diagBands =
      smoothstep(0.06, 0.0, abs(diag - 0.05 - sin(t2) * 0.02)) +
      smoothstep(0.055, 0.0, abs(diag + 0.12)) * 0.9 +
      smoothstep(0.05, 0.0, abs(diag - 0.28)) * 0.82;
    diagBands = clamp(diagBands, 0.0, 1.0);

    float cell =
      sin(tp.x * (6.0 + u_waveX * 0.05) + accentT * 0.25) *
      sin(tp.y * (5.5 + u_waveY * 0.05) - t3 * 0.2);
    cell = smoothstep(0.15, 0.75, abs(cell));

    fp = 0.0;
    fs = 0.0;
    fa = 0.0;

    if (kind < 1.0) {
      fp = inkPillar * (0.85 + wave * 0.15);
      fs = rings * 0.55;
      fa = orbs * 0.35;
    } else if (kind < 2.0) {
      fp = orbs * 0.75;
      fs = curves * 0.9;
      fa = petals * 0.4;
    } else if (kind < 3.0) {
      fp = rings * 0.8;
      fs = orbs * 0.5;
      fa = cell * 0.35;
    } else if (kind < 4.0) {
      fp = petals * 0.75;
      fs = inkPillar * 0.45 + orbs * 0.35;
      fa = curves * 0.25;
    } else if (kind < 5.0) {
      fp = diagBands * 0.7;
      fs = orbs * 0.55;
      fa = rings * 0.3;
    } else if (kind < 6.0) {
      fp = orbs * 0.65;
      fs = cell * 0.75;
      fa = inkPillar * 0.35;
    } else if (kind < 7.0) {
      fp = inkPillar * 0.5 + curves * 0.45;
      fs = rings * 0.5;
      fa = diagBands * 0.3;
    } else {
      fp = max(orbs * 0.6, petals * 0.55);
      fs = max(curves * 0.5, diagBands * 0.45);
      fa = cell * 0.4 + rings * 0.2;
    }

    fp = clamp(fp, 0.0, 1.0);
    fs = clamp(fs * (1.0 - fp * 0.45), 0.0, 1.0);
    fa = clamp(
      fa * (0.16 + u_energy * 0.35) +
        pow(max(0.0, sin(length(tp) * 8.0 - accentT * 0.4 + u_seed2)), u_accentPower) * 0.2,
      0.0,
      1.0
    );
    fux = smoothstep(0.36, 0.96, length(p)) * (1.0 - fp * 0.6);
  } else {
    vec2 c0 = subject * 0.92;
    vec2 c1 = -subject * 0.35 + vec2(0.15 * sin(u_seed), 0.12 * cos(u_seed * 0.7));
    if (u_layout > 0.5 && u_layout < 1.5) {
      c1 += vec2(0.22, 0.05);
    } else if (u_layout > 1.5 && u_layout < 2.5) {
      c1 += vec2(-0.22, 0.05);
    } else if (u_layout >= 2.5) {
      c1 += vec2(0.0, -0.18);
    }

    fp = 1.0 - smoothstep(0.1, 0.8 + wave * 0.2, length(pr - c0));
    fs = smoothstep(0.18, 0.62, dot(pr, normalize(c1)) + 0.35 + wave * 0.34);
    fs *= (1.0 - fp * 0.72);

    fa = pow(
      max(0.0, sin(pr.x * (5.5 + u_ripple * 0.4) + accentT * 0.55 + u_seed)),
      u_accentPower
    );
    fa += pow(
      max(0.0, sin(pr.y * (4.8 + u_waveX * 0.25) - accentT * 0.45 + u_seed2 * 0.2)),
      u_accentPower + 1.0
    ) * 0.45;
    fa = clamp(fa * (0.25 + u_energy * 0.35), 0.0, 1.0);

    fux = smoothstep(0.52, 0.98, length(p)) * (1.0 - fp * 0.85);
  }

  vec3 col = vec3(0.0);
  col += u_c0 * fp * W_PRIMARY;
  col += u_c1 * fs * W_SECONDARY;
  col += u_c2 * fa * W_ACCENT * 4.0;
  col += u_c3 * fux * W_AUX * 2.5;

  float wSum = fp * W_PRIMARY + fs * W_SECONDARY + fa * W_ACCENT * 4.0 + fux * W_AUX * 2.5;
  col /= max(wSum, 0.32);

  float m;
  if (u_shapeMode > 0.5) {
    m = clamp(length(pr - subject) * 1.15 + wave * 0.12, 0.0, 1.0);
  } else {
    m = clamp(wuv.y + wave, 0.0, 1.0);
  }
  vec3 backbone = mix(u_c0, u_c1, smoothstep(0.15, 0.82, m));
  col = mix(backbone, col, u_shapeMode > 0.5 ? 0.48 : 0.58);

  col = saturate(col, u_satBoost) * u_brightness;
  if (u_hasPhoto > 0.5) {
    col = mix(col, col * 1.35, 0.65);
  }
  float vignette = 1.0 - dot(p, p) * 0.12;
  float veil = 0.72 + fp * 0.18 + fa * 0.14;
  float alpha = u_hasPhoto > 0.5 ? clamp(veil, 0.62, 0.92) : 1.0;
  gl_FragColor = vec4(col * vignette, alpha);
}
`;

function hexToRgbNorm(hex) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  if (Number.isNaN(n)) {
    return [0.4, 0.4, 0.9];
  }
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const DEFAULT_PALETTE = ["#7c9cff", "#a78bfa", "#f472b6", "#5eead4"];

function signatureKey(sig) {
  if (!sig) {
    return "default";
  }
  return [
    sig.motionKind ?? sig.style,
    sig.layout,
    sig.seed,
    sig.seed2,
    sig.angle,
    sig.focusX,
    sig.focusY,
    sig.driftAmp,
    sig.flow,
    sig.waveX,
    sig.waveY,
    sig.accentPower,
  ].join("-");
}

/**
 * @param {{ paletteHex: string[], energy?: number, visualSignature?: object | null, backgroundImageUrl?: string | null, motionBridgeRef?: import('react').MutableRefObject<import('@/lib/sensory/audioMotionBridge').AudioMotionBridge | null>, shapeMode?: 'image' | 'text' }} props
 */
export default function MoodGradientWebGL({
  paletteHex,
  energy = 0.4,
  visualSignature,
  backgroundImageUrl,
  motionBridgeRef,
  shapeMode = "image",
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [webglOk, setWebglOk] = useState(true);
  const paletteKey = (paletteHex || []).join(",");
  const sigKey = signatureKey(visualSignature);

  const colors =
    paletteHex?.length >= 4 ? paletteHex.slice(0, 4) : DEFAULT_PALETTE;

  useEffect(() => {
    const sig = visualSignature || {
      style: 0,
      motionKind: 0,
      layout: 0,
      seed: 0,
      seed2: 0,
      angle: 0,
      driftAmp: 0.05,
      waveX: 6,
      waveY: 5,
      warp: 0.12,
      ripple: 3,
      flow: 0.18,
      accentPower: 6,
      domainWarp: 0.15,
      focusX: 0,
      focusY: 0,
      satBoost: 1.2,
      brightness: 1.1,
    };
    const palette =
      paletteHex?.length >= 4 ? paletteHex.slice(0, 4) : DEFAULT_PALETTE;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return undefined;
    }

    const gl =
      canvas.getContext("webgl", {
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
      }) || canvas.getContext("experimental-webgl");

    if (!gl) {
      setWebglOk(false);
      return undefined;
    }

    setWebglOk(true);

    const vs = createShader(gl, gl.VERTEX_SHADER, VS);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) {
      setWebglOk(false);
      return undefined;
    }

    const program = gl.createProgram();
    if (!program) {
      setWebglOk(false);
      return undefined;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setWebglOk(false);
      return undefined;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      time: gl.getUniformLocation(program, "u_time"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      energy: gl.getUniformLocation(program, "u_energy"),
      seed: gl.getUniformLocation(program, "u_seed"),
      seed2: gl.getUniformLocation(program, "u_seed2"),
      motionKind: gl.getUniformLocation(program, "u_motionKind"),
      driftAmp: gl.getUniformLocation(program, "u_driftAmp"),
      waveX: gl.getUniformLocation(program, "u_waveX"),
      waveY: gl.getUniformLocation(program, "u_waveY"),
      warp: gl.getUniformLocation(program, "u_warp"),
      ripple: gl.getUniformLocation(program, "u_ripple"),
      flow: gl.getUniformLocation(program, "u_flow"),
      style: gl.getUniformLocation(program, "u_style"),
      layout: gl.getUniformLocation(program, "u_layout"),
      angle: gl.getUniformLocation(program, "u_angle"),
      accentPower: gl.getUniformLocation(program, "u_accentPower"),
      domainWarp: gl.getUniformLocation(program, "u_domainWarp"),
      focusX: gl.getUniformLocation(program, "u_focusX"),
      focusY: gl.getUniformLocation(program, "u_focusY"),
      hasPhoto: gl.getUniformLocation(program, "u_hasPhoto"),
      shapeMode: gl.getUniformLocation(program, "u_shapeMode"),
      satBoost: gl.getUniformLocation(program, "u_satBoost"),
      brightness: gl.getUniformLocation(program, "u_brightness"),
      colors: [0, 1, 2, 3].map((i) =>
        gl.getUniformLocation(program, `u_c${i}`)
      ),
    };

    let frameId = 0;
    const start = performance.now();
    let timeAccum = 0;
    let lastNow = start;

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 1 || h < 1) {
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const loop = (now) => {
      resize();
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;

      const bridge = motionBridgeRef?.current;
      bridge?.tick();
      const snap = bridge?.snapshot;
      const audioOn = Boolean(snap?.active);
      const level = audioOn ? snap.level : 0;
      const bass = audioOn ? snap.bass : 0;

      const imageAmbient = shapeMode !== "text";
      const timeRate = imageAmbient ? 0.72 : 0.52;
      timeAccum += dt * (timeRate + bass * (imageAmbient ? 0.22 : 0.14));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.time, timeAccum);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.energy, energy + level * 0.15);
      gl.uniform1f(uniforms.seed, sig.seed);
      gl.uniform1f(uniforms.seed2, sig.seed2 ?? sig.seed * 1.7);
      gl.uniform1f(uniforms.motionKind, sig.motionKind ?? sig.style ?? 0);
      gl.uniform1f(uniforms.driftAmp, sig.driftAmp ?? 0.05);
      gl.uniform1f(uniforms.waveX, sig.waveX);
      gl.uniform1f(uniforms.waveY, sig.waveY);
      const flowCap = imageAmbient ? 0.48 : 0.32;
      const flowAudio = imageAmbient ? 0.18 : 0.12;
      gl.uniform1f(uniforms.warp, sig.warp * (1 + level * (imageAmbient ? 0.28 : 0.18)));
      gl.uniform1f(uniforms.ripple, sig.ripple + bass * (imageAmbient ? 0.5 : 0.35));
      gl.uniform1f(
        uniforms.flow,
        Math.min(flowCap, sig.flow * (1 + level * flowAudio))
      );
      gl.uniform1f(uniforms.style, sig.style);
      gl.uniform1f(uniforms.layout, sig.layout ?? 0);
      gl.uniform1f(uniforms.angle, sig.angle ?? 0);
      gl.uniform1f(uniforms.accentPower, sig.accentPower ?? 6);
      gl.uniform1f(
        uniforms.domainWarp,
        (sig.domainWarp ?? 0.15) *
          (1 + level * (imageAmbient ? 0.25 : 0.15))
      );
      gl.uniform1f(uniforms.focusX, sig.focusX ?? 0);
      gl.uniform1f(uniforms.focusY, sig.focusY ?? 0);
      gl.uniform1f(uniforms.hasPhoto, backgroundImageUrl ? 1 : 0);
      gl.uniform1f(uniforms.shapeMode, shapeMode === "text" ? 1 : 0);
      gl.uniform1f(uniforms.satBoost, sig.satBoost ?? 1.2);
      gl.uniform1f(uniforms.brightness, sig.brightness ?? 1.1);
      palette.forEach((hex, i) => {
        const [r, g, b] = hexToRgbNorm(hex);
        gl.uniform3f(uniforms.colors[i], r, g, b);
      });
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [
    paletteKey,
    energy,
    sigKey,
    paletteHex,
    visualSignature,
    backgroundImageUrl,
    motionBridgeRef,
    shapeMode,
  ]);

  const cssFallback = {
    background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 62%, ${colors[1]} 85%, ${colors[2]} 100%)`,
  };

  return (
    <div ref={wrapRef} className={styles.glCanvasHost}>
      {backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImageUrl}
          alt=""
          className={styles.blurredPhotoBg}
          aria-hidden="true"
        />
      ) : null}
      {webglOk ? (
        <canvas
          ref={canvasRef}
          className={
            backgroundImageUrl ? styles.webglCanvasOverlay : styles.webglCanvas
          }
          aria-hidden="true"
        />
      ) : (
        <div
          className={styles.webglFallback}
          style={cssFallback}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
