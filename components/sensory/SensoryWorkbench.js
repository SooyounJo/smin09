import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmbientSoundEngine } from "@/lib/sensory/ambientEngine";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api/client";
import {
  boostPaletteSaturation,
  deriveVisualSignature,
} from "@/lib/sensory/colorAdjust";
import { ensureAudioRunning } from "@/lib/sensory/audioContext";
import { buildGoldenPalette } from "@/lib/sensory/goldenPalette";
import { harmonizeKeyPalette } from "@/lib/sensory/mergePalette";
import { compressImageForVision } from "@/lib/sensory/compressImage";
import { extractDominantColors } from "@/lib/sensory/extractColors";
import { extractImageComposition } from "@/lib/sensory/imageComposition";
import { mergeMotionProfile } from "@/lib/sensory/visualMotion";
import { EMPTY_ANALYSIS } from "@/lib/sensory/schema";
import AmbientSoundscape from "@/components/sensory/AmbientSoundscape";
import styles from "@/styles/pages/sensory.module.css";

const MoodGradientWebGL = dynamic(
  () => import("@/components/canvas/MoodGradientWebGL"),
  { ssr: false }
);

/** @param {ClipboardEvent} event */
function getImageFileFromClipboard(event) {
  const items = event.clipboardData?.items;
  if (!items) {
    return null;
  }
  for (const item of items) {
    if (!item.type.startsWith("image/")) {
      continue;
    }
    const blob = item.getAsFile();
    if (!blob) {
      continue;
    }
    const ext = item.type.split("/")[1] || "png";
    return new File([blob], `paste-${Date.now()}.${ext}`, { type: item.type });
  }
  return null;
}

export default function SensoryWorkbench() {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dominantColors, setDominantColors] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [displayPalette, setDisplayPalette] = useState([]);
  /** @type {[ { id: string, labelKo: string, hex: string }[], Function ]} */
  const [colorRoles, setColorRoles] = useState([]);
  const [visualSignature, setVisualSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [soundOn, setSoundOn] = useState(false);
  const [soundError, setSoundError] = useState(null);
  const soundEngineRef = useRef(null);
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    return () => {
      soundEngineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    apiFetch("/api/sensory/status")
      .then(setApiStatus)
      .catch(() => setApiStatus({ ready: false, provider: "unknown" }));
  }, []);

  const loadPreview = useCallback((file) => {
    if (!file?.type?.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setDominantColors([]);
    setDisplayPalette([]);
    setColorRoles([]);
    setVisualSignature(null);
    setSoundOn(false);
    setSoundError(null);
    soundEngineRef.current?.stop();

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        setPreviewUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onGenerate = useCallback(async () => {
    if (!previewUrl) {
      setError("먼저 이미지를 업로드하세요.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setSoundOn(false);
    setSoundError(null);
    soundEngineRef.current?.stop();
    setLoading(true);

    try {
      await ensureAudioRunning().catch(() => {});
      const visionUrl = await compressImageForVision(previewUrl);
      const colors = await extractDominantColors(visionUrl, 5);
      const localComposition = await extractImageComposition(visionUrl);
      setDominantColors(colors);

      const result = await apiFetch("/api/sensory/analyze", {
        method: "POST",
        body: JSON.stringify({
          imageDataUrl: visionUrl,
          dominantColors: colors,
          localComposition,
        }),
      });

      if (result?.provider === "mock" || result?.mock) {
        setError(
          result.hint ||
            "API 키가 서버에 로드되지 않았습니다. .env 확인 후 yarn dev 재시작."
        );
      }

      const aiPalette =
        result?.paletteHex?.length >= 4
          ? result.paletteHex.slice(0, 4)
          : colors.slice(0, 4);
      const harmonized = harmonizeKeyPalette(colors.slice(0, 4), aiPalette, 0.35);
      const golden = buildGoldenPalette(colors, harmonized);
      const vivid = boostPaletteSaturation(golden.hexList, 0.3);
      const energy = result?.music?.energy ?? 0.35;

      setDisplayPalette(vivid);
      setColorRoles(
        golden.roles.map((role, i) => ({ ...role, hex: vivid[i] || role.hex }))
      );
      const motion = mergeMotionProfile(
        localComposition,
        result?.visualComposition,
        result?.music
      );
      setVisualSignature(deriveVisualSignature(vivid, energy, motion));
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setLoading(false);
    }
  }, [previewUrl]);

  useEffect(() => {
    const onPaste = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const file = getImageFileFromClipboard(event);
      if (!file) {
        return;
      }
      event.preventDefault();
      loadPreview(file);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadPreview]);

  const onInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      loadPreview(file);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      loadPreview(file);
    }
  };

  const primary = analysis?.primaryModality ?? "music";
  const showResults = Boolean(analysis);

  const colorSwatches = useMemo(() => {
    if (displayPalette.length >= 4) {
      return displayPalette.slice(0, 4);
    }
    return EMPTY_ANALYSIS.paletteHex.slice(0, 4);
  }, [displayPalette]);

  const toggleSoundscape = async () => {
    if (!analysis?.music) {
      return;
    }
    setSoundError(null);
    if (soundOn) {
      soundEngineRef.current?.stop();
      soundEngineRef.current = null;
      setSoundOn(false);
      return;
    }
    try {
      soundEngineRef.current?.stop();
      const engine = new AmbientSoundEngine(analysis.music);
      await engine.play();
      soundEngineRef.current = engine;
      setSoundOn(true);
    } catch (e) {
      setSoundError(
        e instanceof Error ? e.message : "사운드 재생에 실패했습니다."
      );
      setSoundOn(false);
    }
  };

  return (
    <div className={styles.workbench}>
      <section className={styles.left}>
        <h1 className={styles.heading}>이미지 → 감각 심상</h1>
        <p className={styles.sub}>
          이미지 업로드 후 Generate로 감성 분석·WebGL·향·음악 심상을 생성합니다.
        </p>
        {apiStatus && (
          <p
            className={
              apiStatus.ready ? styles.apiReady : styles.apiNotReady
            }
          >
            {apiStatus.ready
              ? `Vision 연결됨 (${apiStatus.provider} · ${apiStatus.model})`
              : "Vision 미연결 — OPENAI_API_KEY 설정 후 dev 서버 재시작"}
          </p>
        )}

        <label
          className={styles.dropzone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={onInputChange}
          />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="업로드 미리보기" className={styles.preview} />
          ) : (
            <span>
              클릭 · 드래그 · <strong>Ctrl+V</strong> 붙여넣기로 이미지 업로드
            </span>
          )}
        </label>

        <button
          type="button"
          className={styles.generateBtn}
          onClick={onGenerate}
          disabled={!previewUrl || loading}
        >
          {loading ? "생성 중…" : "Generate"}
        </button>

        {dominantColors.length > 0 && (
          <div className={styles.row}>
            <span className={styles.label}>추출 컬러 (원본)</span>
            <div className={styles.swatches}>
              {dominantColors.map((hex) => (
                <span key={hex} className={styles.swatch} style={{ background: hex }} title={hex} />
              ))}
            </div>
          </div>
        )}

        {colorRoles.length > 0 && (
          <div className={styles.row}>
            <span className={styles.label}>키 컬러 (황금비 4역할)</span>
            <ul className={styles.roleList}>
              {colorRoles.map((role) => (
                <li key={role.id}>
                  <span
                    className={styles.swatch}
                    style={{ background: role.hex }}
                    title={role.hex}
                  />
                  <span>
                    {role.labelKo} <code>{role.hex}</code>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading && <p className={styles.status}>Vision API 분석 중…</p>}
        {error && <p className={styles.error}>{error}</p>}

        {analysis && (
          <div className={styles.metaBlock}>
            {analysis.mock && (
              <p className={styles.mockBadge}>데모 모드 (API 키 미설정 — mock 데이터)</p>
            )}
            <p>{analysis.memoryImpression}</p>
            <p className={styles.dim}>{analysis.situationGuess}</p>
            <div className={styles.tags}>
              {analysis.emotionKeywords.map((kw) => (
                <span key={kw} className={styles.tag}>
                  {kw}
                </span>
              ))}
            </div>
            <p className={styles.dim}>
              공간: {analysis.spatialKeywords.join(" · ")}
            </p>
          </div>
        )}
      </section>

      <section className={styles.right}>
        {!showResults && !loading && (
          <div className={styles.placeholder}>
            이미지를 올린 뒤 좌측 <strong>Generate</strong>를 누르면 키 컬러
            WebGL과 향·음악 심상이 표시됩니다.
          </div>
        )}

        {loading && !showResults && (
          <div className={styles.placeholder}>감각 심상 생성 중…</div>
        )}

        {showResults && (
          <>
            <div className={styles.glSection}>
              <div className={styles.glWrap}>
                <MoodGradientWebGL
                  paletteHex={colorSwatches}
                  energy={analysis?.music?.energy ?? 0.35}
                  visualSignature={visualSignature}
                  backgroundImageUrl={previewUrl}
                />
                <div className={styles.glOverlay}>
                  <span className={styles.modalityBadge}>
                    1순위: {primary === "scent" ? "향기" : "음악"}
                  </span>
                  <p className={styles.modalityReason}>
                    {analysis?.primaryModalityReason ||
                      "분석 후 우선 감각 채널이 표시됩니다."}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.resultGrid}>
              <article
                className={
                  primary === "scent" ? styles.cardPrimary : styles.card
                }
              >
                <h2>향기 노트</h2>
                {analysis?.scent?.blendName && (
                  <p className={styles.blendTitle}>{analysis.scent.blendName}</p>
                )}
                {analysis?.scent?.mixRatioHint && (
                  <p className={styles.dim}>{analysis.scent.mixRatioHint}</p>
                )}
                <p className={styles.dim}>{analysis?.scent?.narrative}</p>
                <ul className={styles.noteList}>
                  <li>
                    <strong>Top</strong>
                    <ul className={styles.noteSubList}>
                      {(analysis?.scent?.top || []).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </li>
                  <li>
                    <strong>Heart</strong>
                    <ul className={styles.noteSubList}>
                      {(analysis?.scent?.heart || []).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </li>
                  <li>
                    <strong>Base</strong>
                    <ul className={styles.noteSubList}>
                      {(analysis?.scent?.base || []).map((n) => (
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
                <p>{analysis?.music?.description}</p>
                <p className={styles.dim}>
                  {analysis?.music?.mood} · {analysis?.music?.tempo}bpm ·{" "}
                  {analysis?.music?.instruments?.join(", ")}
                </p>
                <button
                  type="button"
                  className={styles.soundBtn}
                  onClick={toggleSoundscape}
                  disabled={!analysis}
                >
                  {soundOn ? "사운드스케이프 정지" : "사운드스케이프 재생"}
                </button>
                {soundOn && (
                  <p className={styles.audioPlaying}>
                    재생 중 — 분석 tempo/energy 기반 앰비언트 (피아노·AI 곡 아님)
                  </p>
                )}
                {soundError && (
                  <p className={styles.error}>{soundError}</p>
                )}
                {analysis && (
                  <AmbientSoundscape
                    music={analysis.music}
                    active={soundOn}
                    audioUrl={null}
                    engineRef={soundEngineRef}
                  />
                )}
                <p className={styles.hint}>
                  「사운드스케이프 재생」 클릭 · 시스템/탭 볼륨 확인. 앰비언트
                  톤(220Hz대)이며 AI 곡은 아닙니다.
                </p>
              </article>

              <article className={styles.card}>
                <h2>키 컬러</h2>
                <p className={styles.dim}>황금비 hue · 명도 비율 — 4역할</p>
                <div className={styles.swatchesLarge}>
                  {(colorRoles.length ? colorRoles : colorSwatches.map((hex, i) => ({
                    id: String(i),
                    labelKo: "색",
                    hex,
                  }))).map((role) => (
                    <div key={role.id} className={styles.colorChip}>
                      <span className={styles.swatch} style={{ background: role.hex }} />
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
