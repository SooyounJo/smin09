import { useEffect, useRef } from "react";
import { AmbientSoundEngine } from "@/lib/sensory/ambientEngine";

/**
 * active는 부모에서 클릭으로 토글. 실제 play()는 SensoryWorkbench 클릭 핸들러에서 호출 권장.
 * @param {{ music: import('@/lib/sensory/schema').SensoryAnalysis['music'], active: boolean, audioUrl?: string | null, engineRef?: import('react').MutableRefObject<AmbientSoundEngine | null>, motionBridgeRef?: import('react').MutableRefObject<import('@/lib/sensory/audioMotionBridge').AudioMotionBridge | null> }} props
 */
export default function AmbientSoundscape({
  music,
  active,
  audioUrl,
  engineRef,
  motionBridgeRef,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!active && engineRef?.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    if (!active) {
      motionBridgeRef?.current?.clear();
    }
  }, [active, engineRef, motionBridgeRef]);

  useEffect(() => {
    return () => {
      engineRef?.current?.stop();
      motionBridgeRef?.current?.clear();
    };
  }, [engineRef, motionBridgeRef]);

  useEffect(() => {
    const el = audioRef.current;
    const bridge = motionBridgeRef?.current;
    if (!active || !audioUrl || !el || !bridge) {
      return undefined;
    }

    const wire = () => {
      bridge.bindMediaElement(el).catch(() => {});
    };

    el.addEventListener("playing", wire);
    if (!el.paused && el.currentTime > 0) {
      wire();
    }

    return () => {
      el.removeEventListener("playing", wire);
    };
  }, [active, audioUrl, motionBridgeRef]);

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
        앰비언트 재생 중 (Web Audio 합성)
      </p>
    );
  }

  return null;
}
