import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/pages/archive.module.css";

const ArchiveBrowser = dynamic(
  () => import("@/components/archive/ArchiveBrowser"),
  { ssr: false, loading: () => <p className={styles.empty}>로딩 중…</p> }
);

export default function ArchivePage() {
  return (
    <>
      <Head>
        <title>archive · smo text</title>
      </Head>
      <div className={styles.root}>
        <header className={styles.topNav}>
          <Link href="/">← smo text</Link>
          <span>아카이브</span>
          <span />
        </header>
        <ArchiveBrowser />
      </div>
    </>
  );
}
