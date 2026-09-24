import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/pages/hub.module.css";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>sotest_0924</title>
        <meta
          name="description"
          content="Next.js Pages Router — CSS 페이지와 Canvas/WebGL 페이지 분리"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.page}>
        <div>
          <h1 className={styles.title}>sotest_0924</h1>
          <p className={styles.lead}>
            API 연동을 전제로 한 Next.js(Pages Router) 스타터입니다. 일반 UI는 CSS
            Module 영역에서, Canvas·WebGL은 별도 풀스크린 레이아웃에서
            개발합니다.
          </p>
        </div>
        <div className={styles.cards}>
          <Link href="/site" className={styles.card}>
            <span className={styles.cardTitle}>CSS 사이트 영역</span>
            <span className={styles.cardDesc}>
              레이아웃·폼·목록 등 전통적인 웹 UI. `lib/api/client`로 BFF 또는
              외부 API 호출.
            </span>
            <span className={styles.cardCta}> /site 로 이동 →</span>
          </Link>
          <Link href="/canvas" className={styles.card}>
            <span className={styles.cardTitle}>Canvas / WebGL 영역</span>
            <span className={styles.cardDesc}>
              SSR 없이 클라이언트 전용 캔버스. WebGL 컨텍스트·three.js 등을 이
              트리에 추가.
            </span>
            <span className={styles.cardCta}> /canvas 로 이동 →</span>
          </Link>
        </div>
      </div>
    </>
  );
}
