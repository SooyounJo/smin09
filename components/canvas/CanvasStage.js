import { useCallback, useEffect, useRef } from "react";
import styles from "@/styles/layouts/canvas.module.css";

/**
 * 2D 캔버스 스테이지. WebGL은 ref.current.getContext('webgl2') 등으로 확장 가능.
 */
export default function CanvasStage() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  const draw = useCallback((ctx, width, height, time) => {
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");
    gradient.addColorStop(1, "rgba(236, 72, 153, 0.25)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.18 + Math.sin(time * 0.002) * 12;

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(radius, 24), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Canvas stage — WebGL 컨텍스트로 교체 가능", cx, cy + radius + 28);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    const loop = (now) => {
      const parent = canvas.parentElement;
      if (parent) {
        draw(ctx, parent.clientWidth, parent.clientHeight, now - start);
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-label="실험용 캔버스 영역"
    />
  );
}
