import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/pages/dot.module.css";

export default function DotPage() {
  return (
    <>
      <Head>
        <title>dot · P2.5 32×64 LED</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.root}>
        <header className={styles.topNav}>
          <Link href="/">← smo text</Link>
          <span>dot · LED 패턴</span>
          <Link href="/archive">아카이브</Link>
        </header>
        <iframe
          title="P2.5 32×64 세로형 LED · 패턴 비교"
          src="/dot/index.html"
          className={styles.frame}
        />
      </div>
    </>
  );
}
