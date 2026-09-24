import Head from "next/head";
import SiteHeader from "@/components/layout/SiteHeader";
import styles from "@/styles/layouts/main.module.css";

export default function MainLayout({
  children,
  title = "sotest_0924",
  description = "CSS 기반 페이지",
  activeSection = "/site",
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.shell}>
        <SiteHeader activeSection={activeSection} />
        <main className={styles.content}>{children}</main>
        <footer className={styles.footer}>
          <p>일반 UI · CSS Module · API 연동용 페이지 영역</p>
        </footer>
      </div>
    </>
  );
}
