import dynamic from "next/dynamic";
import Link from "next/link";
import CanvasLayout from "@/components/layout/CanvasLayout";
import styles from "@/styles/layouts/canvas.module.css";

const CanvasStage = dynamic(() => import("@/components/canvas/CanvasStage"), {
  ssr: false,
  loading: () => (
    <div className={styles.overlayPanel} style={{ pointerEvents: "auto" }}>
      캔버스 로딩 중…
    </div>
  ),
});

function CanvasHomePage() {
  return (
    <>
      <CanvasStage />
      <div className={styles.overlayPanel}>
        <Link href="/canvas/sensory" style={{ pointerEvents: "auto", textDecoration: "underline" }}>
          감각 심상 워크벤치 →
        </Link>
        <br />
        <strong>Canvas / WebGL 존</strong>
        <br />
        `components/canvas`에 WebGL 렌더러를 두고, API로 받은 데이터를
        useEffect / rAF 루프에서 반영하세요. CanvasStage는 dynamic import + ssr:
        false 로만 마운트됩니다.
      </div>
    </>
  );
}

CanvasHomePage.getLayout = function getLayout(page) {
  return (
    <CanvasLayout title="Canvas | sotest_0924">
      {page}
    </CanvasLayout>
  );
};

export default CanvasHomePage;
