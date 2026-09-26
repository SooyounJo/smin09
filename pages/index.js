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
        </div>
      </div>
    </>
  );
}
