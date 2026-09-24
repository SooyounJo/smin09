import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/layouts/canvas.module.css";

export default function CanvasLayout({
  children,
  title = "Canvas · WebGL",
  description = "Canvas 및 WebGL 실험 페이지",
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            ← 홈
          </Link>
          <span className={styles.badge}>Canvas / WebGL</span>
        </div>
        <div className={styles.stageWrap}>{children}</div>
      </div>
    </>
  );
}
