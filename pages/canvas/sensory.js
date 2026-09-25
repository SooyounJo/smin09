import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "@/styles/pages/sensory.module.css";

const SensoryWorkbench = dynamic(
  () => import("@/components/sensory/SensoryWorkbench"),
  { ssr: false, loading: () => <p className={styles.status}>로딩 중…</p> }
);

export default function SensoryPage() {
  return (
    <div className={styles.workbenchRoot}>
      <header className={styles.topNav}>
        <Link href="/canvas">← Canvas 목록</Link>
        <span>감각 심상 워크벤치</span>
        <Link href="/">홈</Link>
      </header>
      <SensoryWorkbench />
    </div>
  );
}
