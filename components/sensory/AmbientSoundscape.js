import { useEffect, useRef } from "react";
import { AmbientSoundEngine } from "@/lib/sensory/ambientEngine";

/**
 * active는 부모에서 클릭으로 토글. 실제 play()는 SensoryWorkbench 클릭 핸들러에서 호출 권장.
 * @param {{ music: import('@/lib/sensory/schema').SensoryAnalysis['music'], active: boolean, audioUrl?: string | null, engineRef?: import('react').MutableRefObject<AmbientSoundEngine | null> }} props
 */
export default function AmbientSoundscape({
  music,
  active,
  audioUrl,
  engineRef,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!active && engineRef?.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
  }, [active, engineRef]);

  useEffect(() => {
    return () => {
      engineRef?.current?.stop();
    };
  }, [engineRef]);

  if (audioUrl && active) {
    return (
      <audio ref={audioRef} src={audioUrl} controls autoPlay loop>
        <track kind="captions" />
      </audio>
    );
  }

  if (active) {
    return (
      <p className="sensory-audio-status" aria-live="polite">
        앰비언트 재생 중 (Web Audio · AI 곡 아님)
      </p>
    );
  }

  return null;
}
