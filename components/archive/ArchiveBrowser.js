import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AmbientSoundEngine } from "@/lib/sensory/ambientEngine";
import { AudioMotionBridge } from "@/lib/sensory/audioMotionBridge";
import { ensureAudioRunning } from "@/lib/sensory/audioContext";
import {
  deleteArchiveEntry,
  listArchiveEntries,
} from "@/lib/archive/archiveStore";
import AmbientSoundscape from "@/components/sensory/AmbientSoundscape";
import styles from "@/styles/pages/archive.module.css";

const MoodGradientWebGL = dynamic(
  () => import("@/components/canvas/MoodGradientWebGL"),
  { ssr: false }
);

/** @param {number} ts */
function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ArchiveBrowser() {
  /** @type {[import('@/lib/archive/archiveStore').ArchiveEntry[], Function]} */
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [soundOn, setSoundOn] = useState(false);
  /** @type {'lyria' | 'synth' | null} */
  const [musicMode, setMusicMode] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const soundEngineRef = useRef(null);
  const motionBridgeRef = useRef(null);
  if (!motionBridgeRef.current) {
    motionBridgeRef.current = new AudioMotionBridge();
  }

  const refresh = useCallback(async () => {
    try {
      const list = await listArchiveEntries();
      setEntries(list);
      setSelectedId((prev) =>
        prev && list.some((e) => e.id === prev) ? prev : list[0]?.id ?? null
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "아카이브를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) || null,
    [entries, selectedId]
  );

  const stopSound = useCallback(() => {
    soundEngineRef.current?.stop();
    soundEngineRef.current = null;
    motionBridgeRef.current?.clear();
    setSoundOn(false);
    setMusicMode(null);
  }, []);

  useEffect(() => {
    stopSound();
    if (!selected?.audioBlob) {
      setAudioUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(selected.audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selected, stopSound]);

  useEffect(() => stopSound, [stopSound]);

  const toggleSound = async () => {
    if (!selected) {
      return;
    }
    if (soundOn) {
      stopSound();
      return;
    }
    await ensureAudioRunning().catch(() => {});
    if (audioUrl) {
      setMusicMode("lyria");
      setSoundOn(true);
      return;
    }
    const engine = new AmbientSoundEngine(
      selected.analysis?.music,
      selected.musicVarietySeed
    );
    await engine.play();
    soundEngineRef.current = engine;
    if (engine.analyser) {
      motionBridgeRef.current?.bindAnalyser(engine.analyser);
    }
    setMusicMode("synth");
    setSoundOn(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm("이 아카이브 항목을 삭제할까요?")) {
      return;
    }
    await deleteArchiveEntry(id);
    refresh();
  };

  if (loading) {
    return <p className={styles.empty}>아카이브 불러오는 중…</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p>아직 저장된 작업이 없습니다.</p>
        <p className={styles.dim}>
          <Link href="/canvas/sensory">이미지 인풋</Link> 또는{" "}
          <Link href="/canvas/text">텍스트 인풋</Link>에서 Generate하면 자동으로
          저장됩니다.
        </p>
      </div>
    );
  }

  const music = selected?.analysis?.music;

  return (
    <div className={styles.layout}>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={
                entry.id === selectedId ? styles.itemActive : styles.item
              }
              onClick={() => setSelectedId(entry.id)}
            >
              {entry.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.imageDataUrl} alt="" className={styles.thumb} />
              ) : (
                <span
                  className={styles.thumb}
                  style={{
                    background: `linear-gradient(135deg, ${entry.paletteHex.join(", ")})`,
                  }}
                />
              )}
              <span className={styles.itemBody}>
                <span className={styles.itemTitle}>{entry.title}</span>
                <span className={styles.itemMeta}>
                  {entry.source === "image" ? "이미지" : "텍스트"} ·{" "}
                  {formatDate(entry.createdAt)}
                  {entry.audioBlob ? " · 음원" : ""}
                </span>
                <span className={styles.swatches}>
                  {entry.paletteHex.map((hex, i) => (
                    <span
                      key={`${hex}-${i}`}
                      className={styles.swatch}
                      style={{ background: hex }}
                    />
                  ))}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <section className={styles.detail}>
          <div className={styles.glWrap}>
            <MoodGradientWebGL
              key={selected.id}
              paletteHex={selected.paletteHex}
              energy={selected.energy}
              visualSignature={selected.visualSignature}
              backgroundImageUrl={selected.imageDataUrl}
              motionBridgeRef={motionBridgeRef}
              shapeMode={selected.shapeMode}
            />
          </div>

          <div className={styles.detailBody}>
            <h2 className={styles.detailTitle}>{selected.title}</h2>
            <p className={styles.dim}>{formatDate(selected.createdAt)}</p>
            {selected.sourceText && (
              <p className={styles.sourceText}>{selected.sourceText}</p>
            )}
            {selected.analysis?.memoryImpression && (
              <p>{selected.analysis.memoryImpression}</p>
            )}
            {music && (
              <p className={styles.dim}>
                {music.mood} · {music.tempo}bpm ·{" "}
                {music.instruments?.join(", ")}
              </p>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={toggleSound}>
                {soundOn
                  ? "정지"
                  : audioUrl
                    ? "저장된 음원 재생"
                    : "Web Audio 앰비언트 재생"}
              </button>
              {audioUrl && (
                <a
                  className={styles.btn}
                  href={audioUrl}
                  download={`smo-${selected.id}.mp3`}
                >
                  MP3 다운로드
                </a>
              )}
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => onDelete(selected.id)}
              >
                삭제
              </button>
            </div>

            {music && (
              <AmbientSoundscape
                music={music}
                active={soundOn}
                audioUrl={musicMode === "lyria" ? audioUrl : null}
                engineRef={soundEngineRef}
                motionBridgeRef={motionBridgeRef}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
