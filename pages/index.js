import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/pages/hub.module.css";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>smo text</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.page}>
        <h1 className={styles.title}>smo text</h1>
        <div className={styles.actions}>
          <Link href="/canvas/sensory" className={styles.actionBtn}>
            이미지 인풋
          </Link>
          <Link href="/canvas/text" className={styles.actionBtn}>
            텍스트 인풋
          </Link>
          <Link href="/archive" className={styles.actionBtn}>
            아카이브
          </Link>
          <Link href="/dot" className={styles.actionBtn}>
            dot · LED
          </Link>
          <Link href="/dot2" className={styles.actionBtn}>
            dot2 · LED 이미지
          </Link>
        </div>
      </div>
    </>
  );
}
