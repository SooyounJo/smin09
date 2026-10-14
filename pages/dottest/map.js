import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/pages/dottest.module.css";
import { loadAllRecords } from "@/lib/dottest/records";

const LightRecordMap = dynamic(() => import("@/components/dottest/LightRecordMap"), {
  ssr: false,
  loading: () => <div className={styles.map} />,
});

export default function DotTestMapPage() {
  const router = useRouter();
  const focusId = typeof router.query.focus === "string" ? router.query.focus : null;
  const [records, setRecords] = useState([]);
  const [year, setYear] = useState("all");

  useEffect(() => {
    setRecords(loadAllRecords());
  }, []);

  const years = useMemo(
    () => [...new Set(records.map((r) => r.date.slice(0, 4)))].sort(),
    [records]
  );
  const shown = useMemo(
    () => (year === "all" ? records : records.filter((r) => r.date.startsWith(year))),
    [records, year]
  );

  return (
    <>
      <Head>
        <title>dottest · 기록들</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div className={`${styles.root} ${styles.mapRoot}`}>
        <header className={styles.header}>
          <Link href="/dottest" className={styles.back}>←</Link>
          <h1>기록들</h1>
          <span className={styles.count}>{shown.length}</span>
        </header>

        <div className={styles.years} role="group" aria-label="시기">
          {["all", ...years].map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={year === y}
              onClick={() => setYear(y)}
            >
              {y === "all" ? "전체" : y}
            </button>
          ))}
        </div>

        <div className={styles.mapArea}>
          <LightRecordMap records={shown} focusId={focusId} />
        </div>

        <footer className={styles.bottomBar}>
          <Link href="/dottest/library" className={styles.bottomButton}>
            라이브러리
          </Link>
        </footer>
      </div>
    </>
  );
}
