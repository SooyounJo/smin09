import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "@/styles/pages/sensory.module.css";

const TextSensoryWorkbench = dynamic(
  () => import("@/components/sensory/TextSensoryWorkbench"),
  { ssr: false, loading: () => <p className={styles.status}>로딩 중…</p> }
);

export default function TextInputPage() {
  return (
    <div className={styles.workbenchRoot}>
      <header className={styles.topNav}>
        <Link href="/">← smo text</Link>
        <span>텍스트 인풋</span>
        <span />
      </header>
      <TextSensoryWorkbench />
    </div>
  );
}
