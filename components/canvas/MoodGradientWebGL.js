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

  vec2 warpVec = vec2(
    sin(uv.y * u_ripple + t + u_seed),
    cos(uv.x * u_ripple * 0.85 - t * 0.8 + u_seed * 0.6)
  ) * u_domainWarp;
  vec2 wuv = uv + warpVec;
  vec2 pr = rotate(wuv - 0.5, u_angle);

  float waveA =
    sin(wuv.x * u_waveX + t + u_seed) * u_warp +
    sin(wuv.y * u_waveY - t * 0.9 + u_seed * 0.5) * u_warp;
  float waveB = sin((wuv.x + wuv.y) * u_ripple + t * 0.7) * (u_warp * 0.85);
  float waveC = sin(length(pr) * u_ripple * 2.0 - t * 1.1 + u_seed) * u_warp;

  float wave = waveA;
  if (u_style > 1.0 && u_style < 2.0) {
    wave = waveA * 0.55 + waveB * 1.15;
  } else if (u_style > 2.0 && u_style < 3.0) {
    wave = waveA * 0.4 + waveC * 1.25;
  } else if (u_style >= 3.0) {
    wave = waveB * 0.7 + waveC * 0.95 + sin(t * 0.4 + u_seed) * u_warp;
  }

  vec2 subject = vec2(u_focusX, u_focusY);
  vec2 c0 = subject * 0.92;
  vec2 c1 = -subject * 0.35 + vec2(0.15 * sin(u_seed), 0.12 * cos(u_seed * 0.7));
  if (u_layout > 0.5 && u_layout < 1.5) {
    c1 += vec2(0.22, 0.05);
  } else if (u_layout > 1.5 && u_layout < 2.5) {
    c1 += vec2(-0.22, 0.05);
  } else if (u_layout >= 2.5) {
    c1 += vec2(0.0, -0.18);
  }

  float fp = 1.0 - smoothstep(0.1, 0.8 + wave * 0.22, length(pr - c0));
  float fs = smoothstep(0.18, 0.62, dot(pr, normalize(c1)) + 0.35 + wave * 0.4);
  fs *= (1.0 - fp * 0.72);

  float fa = pow(
    max(0.0, sin(pr.x * (5.5 + u_ripple * 0.4) + t * 1.4 + u_seed)),
    u_accentPower
  );
  fa += pow(
    max(0.0, sin(pr.y * (4.8 + u_waveX * 0.25) - t * 1.1)),
    u_accentPower + 1.0
  ) * 0.45;
  fa = clamp(fa * (0.25 + u_energy * 0.35), 0.0, 1.0);

  float fux = smoothstep(0.52, 0.98, length(p)) * (1.0 - fp * 0.85);

  vec3 col = vec3(0.0);
  col += u_c0 * fp * W_PRIMARY;
  col += u_c1 * fs * W_SECONDARY;
  col += u_c2 * fa * W_ACCENT * 4.0;
  col += u_c3 * fux * W_AUX * 2.5;

  float wSum = fp * W_PRIMARY + fs * W_SECONDARY + fa * W_ACCENT * 4.0 + fux * W_AUX * 2.5;
  col /= max(wSum, 0.32);

  float m = clamp(wuv.y + wave, 0.0, 1.0);
  vec3 backbone = mix(u_c0, u_c1, smoothstep(0.15, 0.82, m));
  col = mix(backbone, col, 0.58);

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
    sig.style,
    sig.layout,
    sig.seed,
    sig.angle,
    sig.focusX,
    sig.focusY,
    sig.flow,
    sig.waveX,
    sig.accentPower,
  ].join("-");
}

/**
 * @param {{ paletteHex: string[], energy?: number, visualSignature?: object | null, backgroundImageUrl?: string | null }} props
 */
export default function MoodGradientWebGL({
  paletteHex,
  energy = 0.4,
  visualSignature,
  backgroundImageUrl,
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
      layout: 0,
      seed: 0,
      angle: 0,
      waveX: 6,
      waveY: 5,
      warp: 0.12,
      ripple: 3,
      flow: 0.5,
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
      satBoost: gl.getUniformLocation(program, "u_satBoost"),
      brightness: gl.getUniformLocation(program, "u_brightness"),
      colors: [0, 1, 2, 3].map((i) =>
        gl.getUniformLocation(program, `u_c${i}`)
      ),
    };

    let frameId = 0;
    const start = performance.now();

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
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.time, (now - start) / 1000);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.energy, energy);
      gl.uniform1f(uniforms.seed, sig.seed);
      gl.uniform1f(uniforms.waveX, sig.waveX);
      gl.uniform1f(uniforms.waveY, sig.waveY);
      gl.uniform1f(uniforms.warp, sig.warp);
      gl.uniform1f(uniforms.ripple, sig.ripple);
      gl.uniform1f(uniforms.flow, sig.flow);
      gl.uniform1f(uniforms.style, sig.style);
      gl.uniform1f(uniforms.layout, sig.layout ?? 0);
      gl.uniform1f(uniforms.angle, sig.angle ?? 0);
      gl.uniform1f(uniforms.accentPower, sig.accentPower ?? 6);
      gl.uniform1f(uniforms.domainWarp, sig.domainWarp ?? 0.15);
      gl.uniform1f(uniforms.focusX, sig.focusX ?? 0);
      gl.uniform1f(uniforms.focusY, sig.focusY ?? 0);
      gl.uniform1f(uniforms.hasPhoto, backgroundImageUrl ? 1 : 0);
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
  }, [paletteKey, energy, sigKey, paletteHex, visualSignature, backgroundImageUrl]);

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
