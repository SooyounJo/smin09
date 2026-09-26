import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api/client";
import { AmbientSoundEngine } from "@/lib/sensory/ambientEngine";
import { AudioMotionBridge } from "@/lib/sensory/audioMotionBridge";
import { ensureAudioRunning } from "@/lib/sensory/audioContext";
import { boostPaletteSaturation, deriveVisualSignature } from "@/lib/sensory/colorAdjust";
import { buildGoldenPalette } from "@/lib/sensory/goldenPalette";
import { harmonizeKeyPalette } from "@/lib/sensory/mergePalette";
import { mergeMotionProfile } from "@/lib/sensory/visualMotion";
import AmbientSoundscape from "@/components/sensory/AmbientSoundscape";
import styles from "@/styles/pages/sensory.module.css";

const MoodGradientWebGL = dynamic(
  () => import("@/components/canvas/MoodGradientWebGL"),
  { ssr: false }
);

const DEFAULT_LOCAL = {
  subjectX: 0.5,
  subjectY: 0.5,
  dominantAngleDeg: 0,
  motionSpeed: 0.4,
  layoutStyle: 0,
  visualEnergy: 0.45,
};

export default function TextSensoryWorkbench() {
  const [memoryText, setMemoryText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [colorRoles, setColorRoles] = useState([]);
  const [visualSignature, setVisualSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [soundOn, setSoundOn] = useState(false);
  const [soundError, setSoundError] = useState(null);
  const [lyriaAudioUrl, setLyriaAudioUrl] = useState(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicMode, setMusicMode] = useState(null);
  const soundEngineRef = useRef(null);
  const motionBridgeRef = useRef(null);
  if (!motionBridgeRef.current) {
    motionBridgeRef.current = new AudioMotionBridge();
  }
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    apiFetch("/api/sensory/status")
      .then(setApiStatus)
      .catch(() => setApiStatus({ ready: false }));
  }, []);

  useEffect(() => {
    return () => {
      soundEngineRef.current?.stop();
    };
  }, []);

  const colorSwatches = useMemo(() => {
    if (colorRoles.length) {
      return colorRoles.map((r) => r.hex);
    }
    return analysis?.paletteHex?.slice(0, 4) || [];
  }, [colorRoles, analysis]);

  const primary = analysis?.primaryModality || "music";
  const showResults = Boolean(analysis && !loading);

  const onGenerate = useCallback(async () => {
    const trimmed = memoryText.trim();
    if (trimmed.length < 8) {
      setError("기억에 대한 글을 조금 더 적어 주세요.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setColorRoles([]);
    setVisualSignature(null);
    setSoundOn(false);
    setSoundError(null);
    setLyriaAudioUrl(null);
    setMusicMode(null);
    soundEngineRef.current?.stop();
    motionBridgeRef.current?.clear();
    setLoading(true);

    try {
      const result = await apiFetch("/api/sensory/analyze-text", {
        method: "POST",
        body: JSON.stringify({ memoryText: trimmed }),
      });

      if (result?.provider === "mock" || result?.mock) {
        setError(result.hint || "API 키 미설정 — mock 데이터로 표시합니다.");
      }

      const aiPalette =
        result?.paletteHex?.length >= 4
          ? result.paletteHex.slice(0, 4)
          : ["#7c9cff", "#a78bfa", "#fbbf24", "#5eead4"];
      const harmonized = harmonizeKeyPalette(aiPalette, aiPalette, 0.2);
      const golden = buildGoldenPalette(aiPalette, harmonized);
      const vivid = boostPaletteSaturation(golden.hexList, 0.28);
      const energy = result?.music?.energy ?? 0.35;

      setColorRoles(
        golden.roles.map((role, i) => ({ ...role, hex: vivid[i] || role.hex }))
      );

      const motion = mergeMotionProfile(
        DEFAULT_LOCAL,
        result?.visualComposition,
        result?.music
      );
      setVisualSignature(
        deriveVisualSignature(vivid, energy, motion, {
          memoryFingerprint: trimmed,
        })
      );
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setLoading(false);
    }
  }, [memoryText]);

  const playSynthFallback = async () => {
    soundEngineRef.current?.stop();
    const engine = new AmbientSoundEngine(analysis.music);
    await engine.play();
    soundEngineRef.current = engine;
    if (engine.analyser) {
      motionBridgeRef.current?.bindAnalyser(engine.analyser);
    }
    setMusicMode("synth");
    setSoundOn(true);
  };

  const toggleSoundscape = async () => {
    if (!analysis?.music) {
      return;
    }
    setSoundError(null);
    if (soundOn) {
      soundEngineRef.current?.stop();
      soundEngineRef.current = null;
      setSoundOn(false);
      setMusicMode(null);
      motionBridgeRef.current?.clear();
      return;
    }

    await ensureAudioRunning().catch(() => {});

    if (apiStatus?.lyriaReady) {
      setMusicLoading(true);
      try {
        let url = lyriaAudioUrl;
        if (!url) {
          const result = await apiFetch("/api/sensory/music", {
            method: "POST",
            body: JSON.stringify({ analysis, imageDataUrl: null }),
          });
          if (typeof result?.dataUrl !== "string") {
            throw new Error("Lyria 응답에 오디오가 없습니다.");
          }
          url = result.dataUrl;
          setLyriaAudioUrl(url);
        }
        soundEngineRef.current?.stop();
        soundEngineRef.current = null;
        setMusicMode("lyria");
        setSoundOn(true);
      } catch (e) {
        const lyriaReason =
          e instanceof Error ? e.message : "Lyria 생성에 실패했습니다.";
        try {
          await playSynthFallback();
          setSoundError(
            `${lyriaReason} — Web Audio 앰비언트로 대체 재생 중입니다.`
          );
        } catch (fallbackErr) {
          setSoundError(
            fallbackErr instanceof Error
              ? fallbackErr.message
              : "사운드 재생에 실패했습니다."
          );
          setSoundOn(false);
        }
      } finally {
        setMusicLoading(false);
      }
      return;
    }

    try {
      await playSynthFallback();
    } catch (e) {
      setSoundError(
        e instanceof Error ? e.message : "사운드 재생에 실패했습니다."
      );
      setSoundOn(false);
    }
  };

  return (
    <div className={styles.workbench}>
      <section className={`${styles.left} ${styles.leftMinimal}`}>
        <textarea
          className={styles.memoryInput}
          value={memoryText}
          onChange={(e) => setMemoryText(e.target.value)}
          placeholder="기억, 말투, 그때의 공간과 감정을 자유롭게 적어 주세요…"
          rows={14}
          disabled={loading}
        />
        <button
          type="button"
          className={styles.generateBtn}
          onClick={onGenerate}
          disabled={loading || memoryText.trim().length < 8}
        >
          {loading ? "분석 중…" : "Generate"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </section>

      <section className={styles.right}>
        {!showResults && !loading && (
          <div className={styles.placeholder}>
            좌측에 기억을 적고 <strong>Generate</strong>를 누르면 감성 키워드 ·
            컬러 · 음악 · 향 심상이 만들어집니다.
          </div>
        )}

        {loading && (
          <div className={styles.placeholder}>기억 분석 · 감각 심상 생성 중…</div>
        )}

        {showResults && analysis && (
          <>
            <div className={styles.glSection}>
              <div className={styles.glWrap}>
                <MoodGradientWebGL
                  paletteHex={colorSwatches}
                  energy={analysis?.music?.energy ?? 0.35}
                  visualSignature={visualSignature}
                  backgroundImageUrl={null}
                  motionBridgeRef={motionBridgeRef}
                  shapeMode="text"
                />
                <div className={styles.glOverlay}>
                  <span className={styles.modalityBadge}>
                    1순위: {primary === "scent" ? "향기" : "음악"}
                  </span>
                  <p className={styles.modalityReason}>
                    {analysis.primaryModalityReason}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.resultGrid}>
              <article className={styles.card}>
                <h2>분석 · 감성 키워드</h2>
                <p>{analysis.memoryImpression}</p>
                <p className={styles.dim}>{analysis.situationGuess}</p>
                <ol className={styles.pipelineList}>
                  <li>
                    <strong>감성 키워드 5</strong>
                    <div className={styles.tags}>
                      {analysis.emotionKeywords.map((kw) => (
                        <span key={kw} className={styles.tag}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </li>
                  <li>
                    <strong>공간 컬러 → 키워드 조정 → 컬러픽</strong>
                    <p className={styles.dim}>
                      공간: {analysis.spatialKeywords.join(" · ")}
                    </p>
                  </li>
                  <li>
                    <strong>말투·기억 정리 → 키워드 조정 → 음악화</strong>
                    <p className={styles.dim}>{analysis.music?.description}</p>
                  </li>
                  <li>
                    <strong>장소 향 추측 → 키워드 조정 → 향기화</strong>
                    <p className={styles.dim}>{analysis.scent?.narrative}</p>
                  </li>
                </ol>
              </article>

              <article
                className={
                  primary === "scent" ? styles.cardPrimary : styles.card
                }
              >
                <h2>향기화</h2>
                {analysis.scent?.blendName && (
                  <p className={styles.blendTitle}>{analysis.scent.blendName}</p>
                )}
                {analysis.scent?.mixRatioHint && (
                  <p className={styles.dim}>{analysis.scent.mixRatioHint}</p>
                )}
                <ul className={styles.noteList}>
                  <li>
                    <strong>Top</strong>
                    <ul className={styles.noteSubList}>
                      {(analysis.scent?.top || []).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </li>
                  <li>
                    <strong>Heart</strong>
                    <ul className={styles.noteSubList}>
                      {(analysis.scent?.heart || []).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </li>
                  <li>
                    <strong>Base</strong>
                    <ul className={styles.noteSubList}>
                      {(analysis.scent?.base || []).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </article>

              <article
                className={
                  primary === "music" ? styles.cardPrimary : styles.card
                }
              >
                <h2>음악화</h2>
                <p>{analysis.music?.description}</p>
                <p className={styles.dim}>
                  {analysis.music?.mood} · {analysis.music?.tempo}bpm ·{" "}
                  {analysis.music?.instruments?.join(", ")}
                </p>
                <button
                  type="button"
                  className={styles.soundBtn}
                  onClick={toggleSoundscape}
                  disabled={musicLoading}
                >
                  {musicLoading
                    ? "Lyria 생성 중…"
                    : soundOn
                      ? "사운드스케이프 정지"
                      : "사운드스케이프 재생"}
                </button>
                {soundError && <p className={styles.error}>{soundError}</p>}
                <AmbientSoundscape
                  music={analysis.music}
                  active={soundOn}
                  audioUrl={musicMode === "lyria" ? lyriaAudioUrl : null}
                  engineRef={soundEngineRef}
                  motionBridgeRef={motionBridgeRef}
                />
              </article>

              <article className={styles.card}>
                <h2>키 컬러</h2>
                <p className={styles.dim}>공간 추측 · 감성 키워드 조정</p>
                <div className={styles.swatchesLarge}>
                  {(colorRoles.length
                    ? colorRoles
                    : colorSwatches.map((hex, i) => ({
                        id: String(i),
                        labelKo: "색",
                        hex,
                      }))
                  ).map((role) => (
                    <div key={role.id} className={styles.colorChip}>
                      <span
                        className={styles.swatch}
                        style={{ background: role.hex }}
                      />
                      <span>
                        {role.labelKo} <code>{role.hex}</code>
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
