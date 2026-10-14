import { useEffect, useRef, useState } from "react";

const VS = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FS = (mode) => `
#define MODE ${mode}
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_reveal;
uniform float u_dot;
uniform float u_glow;
uniform float u_bright;
uniform float u_led;
uniform vec2 u_imgScale;
uniform vec2 u_imgOffset;
uniform sampler2D u_img;
uniform sampler2D u_text;
uniform float u_textT;
uniform float u_sceneT;

const vec2 GRID = vec2(32.0, 64.0);

float hash21(vec2 q) {
  q = fract(q * vec2(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return s;
}

vec3 texAt(vec2 tc) {
  return texture2D(u_img, vec2(tc.x, 1.0 - tc.y)).rgb;
}

vec3 sampleImage(vec2 uv) {
  return texAt(uv * u_imgScale + u_imgOffset);
}

// 패널 uv 기준 원형 블러 (세로가 2배 길어 y 오프셋은 절반)
vec3 blurImage(vec2 uv, float r) {
  vec3 s = sampleImage(uv);
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float a = fi * 2.39996;
    float rr = r * sqrt((fi + 0.5) / 16.0);
    s += sampleImage(uv + vec2(cos(a), sin(a) * 0.5) * rr);
  }
  return s / 17.0;
}

#if MODE == 2
vec3 pattern(vec2 uv) {
  return blurImage(uv, 0.16) * 1.05;
}
#elif MODE == 3
// 블러에서 중앙의 둥근 사각형으로 빛이 모임. 테두리는 주황빛 (퍼지는 건 4번 시작에서)
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// x: 테두리에서 바깥쪽으로 0 → 1. 금빛 → 주황 → 다홍 → 어두운 적갈색
vec3 rimWarm(float x) {
  vec3 c0 = vec3(1.0, 0.86, 0.58);
  vec3 c1 = vec3(1.0, 0.52, 0.14);
  vec3 c2 = vec3(0.92, 0.24, 0.07);
  vec3 c3 = vec3(0.3, 0.08, 0.07);
  x = clamp(x, 0.0, 1.0) * 3.0;
  if (x < 1.0) return mix(c0, c1, x);
  if (x < 2.0) return mix(c1, c2, x - 1.0);
  return mix(c2, c3, x - 2.0);
}

vec3 pattern(vec2 uv) {
  float t = u_sceneT;
  vec3 blur = blurImage(uv, 0.16) * 1.05;

  float g = smoothstep(0.0, 4.5, t);
  g = 1.0 - pow(1.0 - g, 3.0);

  // 패널 가로 기준 좌표 (세로 비율 보정 → 화면에서 정사각형)
  float asp = u_res.y / u_res.x;
  vec2 p = (uv - vec2(0.5, 0.48)) * vec2(1.0, asp);
  float a = -0.05 + 0.04 * sin(t * 0.4);
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  p.x += p.y * 0.05;

  float size = mix(1.3, 0.34, g);
  float pulse = smoothstep(4.0, 5.0, t);
  size *= 1.0 + 0.025 * sin(t * 3.2) * pulse;
  float d = sdRoundBox(p, vec2(size), size * 0.32);

  // 왼쪽 아래 방향일수록 빛이 강하고 넓음
  vec2 dir = normalize(p + 1e-4);
  float bl = smoothstep(-0.3, 0.9, dot(dir, vec2(-0.7071, -0.7071)));

  vec3 bg = mix(blur, vec3(0.1, 0.08, 0.14) + blur * 0.1, g);

  float inside = smoothstep(0.004, -0.004, d);
  vec3 img = blurImage(uv, 0.08);
  vec3 interior = mix(img * 0.22, vec3(0.13, 0.06, 0.08), 0.5);
  interior = mix(interior, vec3(0.17, 0.08, 0.11), smoothstep(0.0, 0.8, dot(dir, vec2(0.7071, 0.7071))) * 0.4);
  interior *= 1.0 - 0.7 * smoothstep(-0.18, 0.0, d) * bl;

  float w = mix(0.06, 0.22, bl) * size / 0.34;
  float x = max(d, 0.0) / w;
  float glow = exp(-x * 1.5);
  vec3 rimCol = mix(rimWarm(x), rimWarm(x) * 0.7 + blurImage(uv, 0.2) * 0.4, 0.25);
  float strength = (0.45 + 0.55 * bl) * (1.0 + 0.15 * sin(t * 3.2) * pulse);

  vec3 col = mix(bg, interior, inside * g);
  col += rimCol * glow * strength * (1.0 - inside) * g * 1.15;
  // 안쪽 가장자리의 얇은 금빛 선
  col += vec3(1.0, 0.7, 0.35) * exp(-pow(d / 0.008, 2.0)) * (0.4 + 0.6 * bl) * g * 0.9;

  col += (hash21(gl_FragCoord.xy + fract(t) * 97.0) - 0.5) * 0.05;
  return max(col, 0.0);
}
#elif MODE == 4
// 빛모임에서 팍 터진 뒤, 화면을 거의 채우는 큰 둥근 사각형 안에서 빛이 일렁임
// 위는 어둡고, 가운데 아래로 하늘색 띠가 사선으로 흐르고, 맨 아래는 붉은 노을빛. 색은 원본 이미지에서 추출
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 vibrant(vec3 c, float k) {
  return max(mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, k), 0.0);
}

vec3 pattern(vec2 uv) {
  float st = u_sceneT;
  float t = u_time;
  float asp = u_res.y / u_res.x;
  vec2 p = (uv - vec2(0.5, 0.48)) * vec2(1.0, asp);
  float dist = length(p);

  // 원본 노을 이미지에서 뽑은 팔레트: 하늘 / 수평선 주황 / 아래 붉은빛 / 어두운 땅
  vec3 sky = vibrant(blurImage(vec2(0.65, 0.92), 0.06), 1.4) * 1.5;
  vec3 warm = vibrant(blurImage(vec2(0.2, 0.45), 0.04), 1.2) * 1.1;
  vec3 red = vibrant(blurImage(vec2(0.22, 0.39), 0.05), 1.3) * 1.6;
  vec3 dark = blurImage(vec2(0.5, 0.15), 0.1) * 0.8 + vec3(0.02, 0.015, 0.015);
  vec3 bgCol = vibrant(blurImage(vec2(0.5, 0.5), 0.03), 1.4) * 0.75 + red * 0.04;

  // 터짐: 약 1.4초 동안 중앙에서 화면 밖까지 빛의 띠가 퍼짐
  float bt = clamp(st / 1.4, 0.0, 1.0);
  float be = bt * bt * (3.0 - 2.0 * bt);
  float burstR = mix(0.12, 1.6, be);
  float front = exp(-pow((dist - burstR) / mix(0.05, 0.35, be), 2.0));
  float inner = smoothstep(burstR, burstR * 0.7, dist);
  float flash = 1.0 - bt;

  // 일렁임: 사각형 윤곽과 띠를 느리게 비틂
  vec2 w = vec2(
    fbm(p * 1.2 + vec2(t * 0.12, -t * 0.07)),
    fbm(p * 1.2 + vec2(4.7 - t * 0.09, t * 0.11))
  ) - 0.5;
  vec2 q = p + w * 0.08;

  vec2 box = vec2(0.47, 0.68) * (1.0 + 0.015 * sin(t * 0.5));
  float d = sdRoundBox(q - vec2(0.0, 0.03), box, 0.2);

  // 아래쪽 윤곽은 흐릿하게 번짐
  float lower = smoothstep(0.1, -0.7, q.y);
  float soft = mix(0.006, 0.22, lower);
  float inside = 1.0 - smoothstep(-soft, soft, d);

  // 안쪽: 위는 어두운 갈색
  vec3 interior = mix(dark, warm * 0.18, 0.5);

  // 아래쪽 붉은 노을빛
  float redAmt = smoothstep(-0.15, -0.75, q.y);
  interior = mix(interior, red, redAmt * 0.9);

  // 사선으로 흐르는 하늘색 띠
  float s = dot(q, normalize(vec2(-0.35, 1.0)));
  s += 0.07 * sin(q.x * 3.5 + t * 0.55) + (w.x + w.y) * 0.12;
  float bandC = -0.28 + 0.1 * sin(t * 0.27);
  float band = exp(-pow((s - bandC) / 0.2, 2.0));
  float core = exp(-pow((s - bandC + 0.02) / 0.08, 2.0));
  vec3 bandCol = mix(sky, sky * 0.4 + vec3(0.75), core * 0.6);
  interior = mix(interior, bandCol, band * 0.92);
  // 띠 아래 경계에 주황빛이 살짝 번짐
  interior += warm * exp(-pow((s - bandC + 0.22) / 0.1, 2.0)) * 0.35;

  // 테두리: 위·왼쪽은 하늘색 얇은 선, 아래는 붉은빛이 바깥으로 번짐
  float edge = exp(-abs(d) * 60.0) * (1.0 - lower);
  vec3 edgeCol = mix(sky * 1.3, warm, smoothstep(0.3, -0.3, q.y));
  float outGlow = exp(-max(d, 0.0) * 7.0) * smoothstep(0.0, 0.02, d);
  vec3 outside = bgCol + red * outGlow * (0.25 + 0.75 * lower) * 0.9;

  vec3 field = mix(outside, interior, inside);
  field += edgeCol * edge * 0.55;
  field *= 0.92 + 0.16 * fbm(q * 1.5 - t * 0.15);

  vec3 col = mix(dark * 0.3, field, inner);
  col += mix(warm, sky, 0.5 + 0.5 * sin(dist * 8.0 - st * 6.0)) * front * (1.3 + flash);
  col += vec3(1.0, 0.9, 0.8) * exp(-dist * dist * 30.0) * flash * 0.8;

  col += (hash21(gl_FragCoord.xy + fract(t) * 97.0) - 0.5) * 0.05;
  return max(col, 0.0);
}
#elif MODE == 5
const float TAU = 6.2831853;

float lines(float x, float per) {
  return smoothstep(0.3, 0.7, 0.5 + 0.5 * cos(TAU * x / per));
}

vec3 vibrant(vec3 c, float k) {
  return max(mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, k), 0.0);
}

vec3 pattern(vec2 uv) {
  float t = u_time * 0.4;
  float asp = u_res.y / u_res.x;

  // 앰비언트 라이트와 같은 팔레트 (원본 이미지에서 추출)
  vec3 sky = vibrant(blurImage(vec2(0.65, 0.92), 0.06), 1.4) * 1.5;
  vec3 warm = vibrant(blurImage(vec2(0.2, 0.45), 0.04), 1.2) * 1.1;
  vec3 red = vibrant(blurImage(vec2(0.22, 0.39), 0.05), 1.3) * 1.6;
  vec3 dark = blurImage(vec2(0.5, 0.15), 0.1) * 0.8 + vec3(0.02, 0.015, 0.015);
  vec3 purple = vibrant(blurImage(vec2(0.5, 0.5), 0.03), 1.4) * 0.75;

  // 앰비언트처럼 위는 보라·어두움, 가운데 하늘색 사선 띠, 아래는 주황·붉은빛. 띠는 물결처럼 흐름
  vec2 p = (uv - vec2(0.5, 0.48)) * vec2(1.0, asp);
  vec2 w = vec2(
    fbm(p * 1.2 + vec2(t * 0.3, -t * 0.2)),
    fbm(p * 1.2 + vec2(4.7 - t * 0.25, t * 0.3))
  ) - 0.5;
  vec2 q = p + w * 0.1;
  float s = dot(q, normalize(vec2(-0.35, 1.0)));
  s += 0.07 * sin(q.x * 3.5 + t * 1.4) + (w.x + w.y) * 0.12;
  float bandC = -0.28 + 0.1 * sin(t * 0.7);

  vec3 img = mix(dark, purple, smoothstep(0.1, 0.9, q.y));
  img = mix(img, red, smoothstep(-0.15, -0.75, q.y) * 0.9);
  float skyBand = exp(-pow((s - bandC) / 0.22, 2.0));
  float coreBand = exp(-pow((s - bandC + 0.02) / 0.08, 2.0));
  img = mix(img, mix(sky, sky * 0.4 + vec3(0.75), coreBand * 0.6), skyBand * 0.9);
  img += warm * exp(-pow((s - bandC + 0.22) / 0.1, 2.0)) * 0.4;
  img *= 0.9 + 0.2 * fbm(q * 1.5 - t * 0.4);

  // 주기가 LED 피치(1칸)에 가까운 줄 두 장 → LED 격자와 간섭해 큰 무아레 띠가 가로로 흐름
  vec2 P = uv * GRID;
  float wy = sin(P.x * 0.2 + t * 0.9) * 1.6 + sin(P.x * 0.07 - t * 0.5) * 2.4;
  float A = lines(P.x - t * 0.25 + sin(P.y * 0.12 + t * 0.4) * 1.2, 1.06 + 0.015 * sin(t * 0.1));
  float B = lines(P.y + wy, 1.04 + 0.01 * sin(t * 0.08));
  float m = A * B;
  float band = 0.5 * (A + B);

  // 밝기만 띠로 조절하고 색은 앰비언트 팔레트를 유지
  float luma = max(dot(img, vec3(0.299, 0.587, 0.114)), 0.04);
  vec3 hueCol = min(img / luma, vec3(1.8));
  vec3 col = img * (0.45 + 1.1 * m + 0.4 * band);

  // 부채꼴 패턴처럼 여러 점이 섞여 반짝임: 하늘색·주황·붉은빛·흰빛 중 하나
  vec2 id = floor(P);
  float h = hash21(id + 3.1);
  float tw = pow(0.5 + 0.5 * sin(u_time * (0.35 + h * 0.9) + h * TAU), 10.0);
  float k = fract(h * 2.7 + P.x / GRID.x * 0.6);
  vec3 pal = k < 0.35 ? sky : k < 0.6 ? warm : k < 0.85 ? red : sky * 0.3 + vec3(0.8);
  vec3 sp = mix(hueCol * 0.75, pal, 0.5);
  col += sp * tw * (0.25 + 0.8 * m) * 0.8;
  return col;
}
#else
vec3 pattern(vec2 uv) {
  return sampleImage(uv);
}
#endif

float reveal(vec2 uv) {
  float col = floor(uv.x * GRID.x);
  float n = 0.12 * fract(sin(col * 91.7) * 43758.5453)
          + 0.04 * sin(col * 0.9 + u_reveal * 6.0);
  float edge = u_reveal * 1.75 - 0.1;
  return smoothstep(edge, edge - 0.45, uv.y + n);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;

  if (u_led < 0.5) {
    gl_FragColor = vec4(pattern(uv) * u_bright * reveal(uv), 1.0);
    return;
  }

  vec2 g = uv * GRID;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  // 패널이 정확히 1:2가 아닐 때도 도트가 원형이 되도록 칸 비율 보정
  f.y *= (u_res.y / GRID.y) / (u_res.x / GRID.x);
  vec2 cuv = (id + 0.5) / GRID;

#if MODE == 1
  vec3 led = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
      led += sampleImage((id + (vec2(float(i), float(j)) + 0.5) / 3.0) / GRID);
    }
  }
  led /= 9.0;
#else
  vec3 led = pattern(cuv);
#endif

  float flicker = 1.0 + (hash21(id + floor(u_time * 10.0)) - 0.5) * 0.06;
  led *= u_bright * flicker * reveal(cuv);

#if MODE == 1
  // 텍스트 뒤: 위가 더 어둡고 아래로 갈수록 옅어지는 그라디언트
  float topShade = smoothstep(0.22, 0.06, cuv.y);
  topShade = topShade * topShade;
  topShade *= smoothstep(0.0, 1.2, u_textT);
  led *= mix(1.0, 0.4, topShade);

  // 왼쪽 열부터 차례로 써짐
  vec4 txt = texture2D(u_text, vec2(cuv.x, 1.0 - cuv.y));
  float ta = clamp(u_textT * 0.7 - cuv.x * 1.6, 0.0, 1.0);
  led = mix(led, vec3(1.0, 0.95, 0.88) * u_bright * flicker, txt.r * ta);
#endif

  float px = GRID.x / u_res.x;
  float d = length(f);
  float dsz = u_dot;
#if MODE == 5
  dsz *= mix(0.6, 1.15, hash21(id + 7.7));
#endif
  float core = 1.0 - smoothstep(dsz - px, dsz + px, d);
  float soft = MODE == 2 ? 1.0 : 0.0;
  float halo = exp(-d * d * mix(18.0, 9.0, soft)) * u_glow * (1.0 + soft * 0.8);

  vec3 board = vec3(0.012, 0.011, 0.014);
  vec3 unlit = vec3(0.045, 0.042, 0.05);
  vec3 col = board + unlit * core + led * (core + halo * 0.6);
  col += led * core * 0.12 * (1.0 - d / max(dsz, 0.01));
  gl_FragColor = vec4(col, 1.0);
}
`;

const REVEAL_MS = 14000;
const FADE_MS = 3000;
const BURST_FADE_MS = 350;

const UNIFORMS = [
  "u_res",
  "u_time",
  "u_reveal",
  "u_dot",
  "u_glow",
  "u_bright",
  "u_led",
  "u_imgScale",
  "u_imgOffset",
  "u_img",
  "u_text",
  "u_textT",
  "u_sceneT",
];

const TEXT = "2020. 10. 17";
const TEXT_TOP = 5;
// 3×5 도트 폰트 (행마다 비트열)
const GLYPHS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["1", "1", "1", "1", "1"],
  2: ["111", "001", "111", "100", "111"],
  7: ["111", "001", "001", "001", "001"],
  ".": ["0", "0", "0", "0", "1"],
  " ": ["0", "0", "0", "0", "0"],
};

// 32×64 RGBA: r = 글자 도트
function buildTextMask() {
  const W = 32;
  const H = 64;
  const on = new Uint8Array(W * H);
  const chars = [...TEXT];
  const gapAfter = (i) =>
    i < chars.length - 1 && chars[i] !== " " && chars[i + 1] !== " " ? 1 : 0;
  const width = chars.reduce((s, c, i) => s + GLYPHS[c][0].length + gapAfter(i), 0);
  let x = Math.floor((W - width) / 2);
  chars.forEach((c, i) => {
    const g = GLYPHS[c];
    g.forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === "1") {
          on[(TEXT_TOP + ry) * W + x + rx] = 1;
        }
      });
    });
    x += g[0].length + gapAfter(i);
  });
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let cx = 0; cx < W; cx++) {
      const i = (y * W + cx) * 4;
      data[i] = on[y * W + cx] * 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

function startProgram(gl, mode) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VS);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FS(mode));
  gl.compileShader(fs);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return { mode, program, vs, fs, U: null, loc: -1, sceneStart: 0 };
}

// 컴파일 완료 시 uniform 위치를 채우고 true. 실패하면 throw.
function finishProgram(gl, entry) {
  if (entry.U) {
    return true;
  }
  const ext = gl.getExtension("KHR_parallel_shader_compile");
  if (ext && !gl.getProgramParameter(entry.program, ext.COMPLETION_STATUS_KHR)) {
    return false;
  }
  if (!gl.getProgramParameter(entry.program, gl.LINK_STATUS)) {
    throw new Error(
      gl.getShaderInfoLog(entry.fs) ||
        gl.getProgramInfoLog(entry.program) ||
        "shader compile failed"
    );
  }
  entry.U = {};
  UNIFORMS.forEach((n) => {
    entry.U[n] = gl.getUniformLocation(entry.program, n);
  });
  entry.loc = gl.getAttribLocation(entry.program, "p");
  gl.useProgram(entry.program);
  gl.uniform1i(entry.U.u_img, 0);
  gl.uniform1i(entry.U.u_text, 1);
  return true;
}

/**
 * 32×64 세로형 LED 도트 그리드에 이미지를 마스킹해 표시
 * mode: 1 원본 · 2 블러 · 3 빛 모임 · 4 앰비언트 · 5 무아레
 * @param {{ src: string, mode?: 1 | 2 | 3 | 4 | 5, led?: boolean, dot?: number, glow?: number, bright?: number, replayKey?: number }} props
 */
export default function LedImageMaskWebGL({
  src,
  mode = 1,
  led = true,
  dot = 0.15,
  glow = 0.45,
  bright = 0.95,
  replayKey = 0,
}) {
  const canvasRef = useRef(null);
  const paramsRef = useRef({ mode, led, dot, glow, bright });
  const revealStartRef = useRef(null);
  const [error, setError] = useState(null);

  paramsRef.current = { mode, led, dot, glow, bright };

  useEffect(() => {
    revealStartRef.current = null;
  }, [replayKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) {
      setError("이 브라우저에서 WebGL을 사용할 수 없습니다.");
      return undefined;
    }

    const programs = {};
    const getProgram = (m) => {
      if (!programs[m]) {
        programs[m] = startProgram(gl, m);
      }
      return programs[m];
    };
    getProgram(paramsRef.current.mode);
    let current = null;
    let previous = null;
    let fadeStart = 0;
    let previousReveal = 1;
    let previousTextT = 0;
    let modeReveal = false;
    let fadeMs = FADE_MS;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const textTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      32,
      64,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buildTextMask()
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.activeTexture(gl.TEXTURE0);

    // object-fit: cover 로 패널 비율에 맞춤
    let imgAspect = 0;
    const coverFit = (panelAspect) => {
      if (!imgAspect) {
        return [[1, 1], [0, 0]];
      }
      if (imgAspect > panelAspect) {
        const sx = panelAspect / imgAspect;
        return [[sx, 1], [(1 - sx) / 2, 0]];
      }
      const sy = imgAspect / panelAspect;
      return [[1, sy], [0, (1 - sy) / 2]];
    };
    let disposed = false;
    const img = new Image();
    img.onload = () => {
      if (disposed) {
        return;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      imgAspect = img.width / img.height;
      revealStartRef.current = null;
    };
    img.onerror = () => setError("이미지를 불러오지 못했습니다.");
    img.src = src;

    let frameId = 0;
    const start = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 2);
    const revealAt = (now) => {
      if (revealStartRef.current === null) {
        return 0;
      }
      return ease(Math.min(Math.max((now - revealStartRef.current) / REVEAL_MS, 0), 1));
    };
    const textAt = (now) => {
      if (revealStartRef.current === null) {
        return 0;
      }
      return Math.max((now - revealStartRef.current - REVEAL_MS) / 1000, 0);
    };

    const frame = (now) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      const p = paramsRef.current;

      let wanted;
      try {
        wanted = getProgram(p.mode);
        if (wanted !== current && finishProgram(gl, wanted)) {
          if (current) {
            const shown = Math.min((now - fadeStart) / fadeMs, 1);
            const nextFadeMs =
              current.mode === 3 && wanted.mode === 4 ? BURST_FADE_MS : FADE_MS;
            if (wanted === previous && shown < 1) {
              fadeStart = now - (1 - shown) * nextFadeMs;
            } else {
              fadeStart = now;
              wanted.sceneStart = now;
            }
            fadeMs = nextFadeMs;
            previous = current;
            previousReveal = revealAt(now);
            previousTextT = textAt(now);
            if (p.mode === 1) {
              revealStartRef.current = now;
              modeReveal = true;
            } else if (modeReveal) {
              revealStartRef.current = now - REVEAL_MS;
              modeReveal = false;
            }
          } else {
            wanted.sceneStart = now;
          }
          current = wanted;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "셰이더 오류");
        return;
      }
      if (!current) {
        frameId = requestAnimationFrame(frame);
        return;
      }
      const pending = [1, 2, 3, 4, 5].find((m) => !programs[m]);
      if (pending) {
        getProgram(pending);
      }

      if (revealStartRef.current === null) {
        revealStartRef.current = now;
      }
      const [scale, offset] = coverFit(canvas.width / Math.max(canvas.height, 1));
      const draw = (entry, reveal, textT) => {
        const U = entry.U;
        gl.useProgram(entry.program);
        gl.enableVertexAttribArray(entry.loc);
        gl.vertexAttribPointer(entry.loc, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(U.u_res, canvas.width, canvas.height);
        gl.uniform1f(U.u_time, (now - start) / 1000);
        gl.uniform1f(U.u_reveal, reveal);
        gl.uniform1f(U.u_textT, textT);
        if (U.u_sceneT) {
          gl.uniform1f(U.u_sceneT, (now - entry.sceneStart) / 1000);
        }
        gl.uniform1f(U.u_dot, p.dot);
        gl.uniform1f(U.u_glow, p.glow);
        gl.uniform1f(U.u_bright, p.bright);
        gl.uniform1f(U.u_led, p.led ? 1 : 0);
        gl.uniform2f(U.u_imgScale, scale[0], scale[1]);
        gl.uniform2f(U.u_imgOffset, offset[0], offset[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };

      const fade = previous ? Math.min((now - fadeStart) / fadeMs, 1) : 1;
      if (fade < 1) {
        gl.disable(gl.BLEND);
        draw(previous, previousReveal, previousTextT);
        const a = fade * fade * (3 - 2 * fade);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
        gl.blendColor(0, 0, 0, a);
        draw(current, revealAt(now), textAt(now));
        gl.disable(gl.BLEND);
      } else {
        previous = null;
        draw(current, revealAt(now), textAt(now));
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      gl.deleteTexture(tex);
      gl.deleteTexture(textTex);
      Object.values(programs).forEach((e) => {
        gl.deleteProgram(e.program);
        gl.deleteShader(e.vs);
        gl.deleteShader(e.fs);
      });
    };
  }, [src]);

  if (error) {
    return <p style={{ color: "#e0533a" }}>{error}</p>;
  }

  return <canvas ref={canvasRef} aria-label="LED 이미지 마스크" />;
}
