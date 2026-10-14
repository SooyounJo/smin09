import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/pages/dottest.module.css";
import { REGIONS, formatDate, loadAllRecords } from "@/lib/dottest/records";

export default function DotTestLibraryPage() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    setRecords(loadAllRecords());
  }, []);

  const groups = useMemo(
    () =>
      REGIONS.map((region) => ({
        region,
        items: records.filter((r) => r.region === region.id),
      })).filter((g) => g.items.length > 0),
    [records]
  );

  return (
    <>
      <Head>
        <title>dottest · 라이브러리</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div className={styles.root}>
        <header className={styles.header}>
          <Link href="/dottest/map" className={styles.back}>←</Link>
          <h1>빛 모임 라이브러리</h1>
          <span className={styles.count}>{records.length}</span>
        </header>

        <main className={styles.library}>
          {groups.map(({ region, items }) => (
            <section key={region.id} className={styles.group}>
              <h2>
                {region.name}
                <small>{items.length}</small>
              </h2>
              <div className={styles.boxes}>
                {/* 데모: 어떤 박스를 눌러도 dot2 효과로 이동 */}
                {items.map((r) => (
                  <Link key={r.id} href="/dot2" className={styles.box}>
                    <span
                      className={styles.blob}
                      style={r.image ? { "--img": `url("${r.image}")` } : undefined}
                    >
                      <span className={styles.blobCore} />
                    </span>
                    <span className={styles.boxMeta}>
                      <b>{r.place || region.name}</b>
                      <small>{formatDate(r.date)}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </>
  );
}
