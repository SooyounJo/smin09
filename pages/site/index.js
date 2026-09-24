import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { apiFetch } from "@/lib/api/client";
import styles from "@/styles/pages/site.module.css";

function SiteHomePage() {
  const [health, setHealth] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    apiFetch("/api/health")
      .then((data) => {
        if (!cancelled) {
          setHealth({ loading: false, data, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setHealth({ loading: false, data: null, error: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className={styles.hero}>
        <h1>CSS 기반 페이지</h1>
        <p>
          이 경로(`pages/site`) 아래 페이지는 공통 헤더·푸터 레이아웃과 CSS Module을
          사용합니다. 데이터는 API Route 또는 `NEXT_PUBLIC_API_BASE_URL`로 연결된
          백엔드를 호출하세요.
        </p>
      </section>

      <section className={styles.panel} aria-live="polite">
        <h2>API 연결 확인</h2>
        {health.loading && <p>로딩 중…</p>}
        {!health.loading && health.error && (
          <p className={styles.statusErr}>{health.error}</p>
        )}
        {!health.loading && health.data && (
          <>
            <p className={styles.statusOk}>연결됨</p>
            <pre className={styles.mono}>{JSON.stringify(health.data, null, 2)}</pre>
          </>
        )}
      </section>

      <p className={styles.linkRow}>
        <a href="/site/about">About 예제 페이지</a>
      </p>
    </>
  );
}

SiteHomePage.getLayout = function getLayout(page) {
  return (
    <MainLayout
      title="CSS 사이트 | sotest_0924"
      description="CSS Module 기반 UI 영역"
      activeSection="/site"
    >
      {page}
    </MainLayout>
  );
};

export default SiteHomePage;
