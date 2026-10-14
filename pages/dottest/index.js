import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/pages/dottest.module.css";
import { REGIONS, saveUserRecord, shrinkImage } from "@/lib/dottest/records";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DotTestPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [region, setRegion] = useState(REGIONS[0].id);
  const [place, setPlace] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await shrinkImage(file));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim() && !image) {
      setError("텍스트나 이미지를 하나 이상 넣어주세요.");
      return;
    }
    const record = saveUserRecord({
      id: `u${Date.now()}`,
      region,
      place: place.trim(),
      date,
      text: text.trim(),
      image,
    });
    router.push({ pathname: "/dottest/map", query: { focus: record.id } });
  };

  return (
    <>
      <Head>
        <title>dottest · 빛 기록</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div className={styles.root}>
        <header className={styles.header}>
          <Link href="/" className={styles.back}>←</Link>
          <h1>빛 기록 남기기</h1>
          <span />
        </header>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.imageInput}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="선택한 이미지" />
            ) : (
              <span>
                <b>＋</b>
                빛을 담은 사진 추가
              </span>
            )}
            <input type="file" accept="image/*" onChange={pickImage} />
          </label>

          <label className={styles.field}>
            <span>기록</span>
            <textarea
              rows={4}
              placeholder="그때 본 빛은 어땠나요?"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span>지역</span>
              <select value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>날짜</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          <label className={styles.field}>
            <span>장소 (선택)</span>
            <input
              type="text"
              placeholder="예: 광안리 해변"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.primary}>
            기록 저장
          </button>
        </form>

        <footer className={styles.bottomBar}>
          <Link href="/dottest/map" className={styles.bottomButton}>
            기록들
          </Link>
        </footer>
      </div>
    </>
  );
}
