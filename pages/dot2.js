import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/pages/dot2.module.css";

const LedImageMaskWebGL = dynamic(
  () => import("@/components/dot/LedImageMaskWebGL"),
  { ssr: false, loading: () => <div className={styles.placeholder} /> }
);

const MODES = [
  { id: 1, label: "원본" },
  { id: 2, label: "블러" },
  { id: 3, label: "빛 모임" },
  { id: 4, label: "앰비언트 라이트" },
  { id: 5, label: "무아레 웨이브" },
];

// Play: 1→5 순서. 3번에서 빛이 모이고, 4번 시작에서 팍 터지며 화면 전체가 일렁임
const PLAY_STEPS = [
  { mode: 1, ms: 21000 },
  { mode: 2, ms: 7000 },
  { mode: 3, ms: 7000 },
  { mode: 4, ms: 14000 },
  { mode: 5, ms: 12000 },
];

// 빛 모임이 터지는 4번부터 음원이 점점 커지고, Play 끝까지 들림
const MUSIC_SRC = "/dot2/night-driving.mp3";
const MUSIC_FROM_MODE = 4;
const MUSIC_VOLUME = 0.8;
const MUSIC_FADE_IN_MS = 5000;
const MUSIC_FADE_OUT_MS = 2500;

export default function Dot2Page() {
  const [mode, setMode] = useState(1);
  const [led, setLed] = useState(true);
  const [dot, setDot] = useState(0.33);
  const [glow, setGlow] = useState(0.45);
  const [bright, setBright] = useState(0.95);
  const [replayKey, setReplayKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timersRef = useRef([]);
  const audioRef = useRef(null);
  const fadeRafRef = useRef(0);

  const fadeAudio = useCallback((to, ms, onDone) => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelAnimationFrame(fadeRafRef.current);
    const from = audio.volume;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min((now - start) / ms, 1);
      audio.volume = from + (to - from) * k * k * (3 - 2 * k);
      if (k < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, []);

  const stopMusic = useCallback(
    (ms) => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      fadeAudio(0, ms, () => audio.pause());
    },
    [fadeAudio]
  );

  const stopPlay = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPlaying(false);
    stopMusic(600);
  }, [stopMusic]);

  const startPlay = () => {
    stopPlay();
    setPlaying(true);
    if (mode === 1) {
      setReplayKey((k) => k + 1);
    } else {
      setMode(1);
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(MUSIC_SRC);
      audioRef.current.preload = "auto";
    }
    let at = 0;
    PLAY_STEPS.forEach((step, i) => {
      if (i > 0) {
        timersRef.current.push(setTimeout(() => setMode(step.mode), at));
      }
      if (step.mode === MUSIC_FROM_MODE) {
        timersRef.current.push(
          setTimeout(() => {
            const audio = audioRef.current;
            cancelAnimationFrame(fadeRafRef.current);
            audio.currentTime = 0;
            audio.volume = 0;
            audio.play().catch(() => {});
            fadeAudio(MUSIC_VOLUME, MUSIC_FADE_IN_MS);
          }, at)
        );
      }
      at += step.ms;
    });
    timersRef.current.push(
      setTimeout(() => stopMusic(MUSIC_FADE_OUT_MS), at - MUSIC_FADE_OUT_MS)
    );
    timersRef.current.push(setTimeout(() => setPlaying(false), at));
  };

  const pickMode = (id) => {
    stopPlay();
    setMode(id);
  };

  useEffect(
    () => () => {
      stopPlay();
      cancelAnimationFrame(fadeRafRef.current);
      audioRef.current?.pause();
    },
    [stopPlay]
  );

  return (
    <>
      <Head>
        <title>dot2 · LED 이미지 마스크</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.root}>
        <header className={styles.topNav}>
          <Link href="/">← smo text</Link>
          <span>dot2 · LED 이미지</span>
          <Link href="/dot">dot</Link>
        </header>

        <main className={styles.main}>
          <div className={styles.stage}>
            <span aria-hidden="true" />
            <div className={styles.module}>
              <div className={styles.screws} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <LedImageMaskWebGL
                src="/dot2/sunset.png"
                mode={mode}
                led={led}
                dot={dot}
                glow={glow}
                bright={bright}
                replayKey={replayKey}
              />
            </div>
            <div className={styles.modes} role="group" aria-label="모션 모드">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={!playing && mode === m.id}
                  title={m.label}
                  onClick={() => pickMode(m.id)}
                >
                  <span className={styles.modeNum}>{m.id}</span>
                  <span className={styles.modeLabel}>{m.label}</span>
                </button>
              ))}
              <button
                type="button"
                className={styles.play}
                aria-pressed={playing}
                title="처음부터 전체 재생"
                onClick={startPlay}
              >
                <span className={styles.modeNum}>6</span>
                <span className={styles.modeLabel}>
                  {playing ? `▶ Play · ${mode}번` : "▶ Play"}
                </span>
              </button>
            </div>
          </div>

          <div className={styles.controls}>
            <div className={styles.row}>
              <button
                type="button"
                aria-pressed={led}
                onClick={() => setLed(true)}
              >
                LED 도트
              </button>
              <button
                type="button"
                aria-pressed={!led}
                onClick={() => setLed(false)}
              >
                이미지 원본
              </button>
              <button type="button" onClick={() => setReplayKey((k) => k + 1)}>
                ↻ 다시 시작
              </button>
            </div>
            <label className={styles.ctl}>
              <span>
                도트 크기 <output>{dot.toFixed(2)}</output>
              </span>
              <input
                type="range"
                min="0.2"
                max="0.5"
                step="0.01"
                value={dot}
                onChange={(e) => setDot(parseFloat(e.target.value))}
              />
            </label>
            <label className={styles.ctl}>
              <span>
                번짐 <output>{Math.round(glow * 100)}%</output>
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={glow}
                onChange={(e) => setGlow(parseFloat(e.target.value))}
              />
            </label>
            <label className={styles.ctl}>
              <span>
                밝기 <output>{Math.round(bright * 100)}%</output>
              </span>
              <input
                type="range"
                min="0.2"
                max="1.5"
                step="0.01"
                value={bright}
                onChange={(e) => setBright(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </main>
      </div>
    </>
  );
}
