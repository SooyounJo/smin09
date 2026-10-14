const STORAGE_KEY = "dottest.records.v1";

export const REGIONS = [
  { id: "seoul", name: "서울", lat: 37.5283, lng: 126.9326 },
  { id: "busan", name: "부산", lat: 35.1532, lng: 129.1187 },
  { id: "jeju", name: "제주", lat: 33.394, lng: 126.2397 },
  { id: "gangneung", name: "강릉", lat: 37.8055, lng: 128.9086 },
  { id: "yeosu", name: "여수", lat: 34.7398, lng: 127.7456 },
  { id: "jeonju", name: "전주", lat: 35.8151, lng: 127.153 },
  { id: "sokcho", name: "속초", lat: 38.1906, lng: 128.6024 },
  { id: "gyeongju", name: "경주", lat: 35.8346, lng: 129.2268 },
];

const DEMO_IMAGE = "/dot2/sunset.png";

export const DEMO_RECORDS = [
  { id: "d1", region: "busan", place: "광안리 해변", date: "2020-10-17", text: "다리 너머로 노을이 번지던 저녁" },
  { id: "d2", region: "seoul", place: "여의도 한강공원", date: "2021-05-03", text: "강물 위로 흩어지던 도시의 불빛" },
  { id: "d3", region: "jeju", place: "협재 해변", date: "2021-08-21", text: "수평선이 주황빛으로 녹아내림" },
  { id: "d4", region: "gangneung", place: "경포대", date: "2022-01-01", text: "새해 첫 해가 떠오르던 순간" },
  { id: "d5", region: "yeosu", place: "돌산대교", date: "2022-07-15", text: "여수 밤바다, 물결에 비친 조명" },
  { id: "d6", region: "jeonju", place: "한옥마을", date: "2023-04-09", text: "처마 끝에 걸린 늦은 오후의 빛" },
  { id: "d7", region: "sokcho", place: "영금정", date: "2023-11-25", text: "차가운 바다 위 분홍빛 하늘" },
  { id: "d8", region: "gyeongju", place: "동궁과 월지", date: "2024-09-14", text: "연못에 거꾸로 비친 누각의 불빛" },
  { id: "d9", region: "seoul", place: "남산", date: "2024-12-24", text: "야경이 점점이 켜지던 크리스마스이브" },
  { id: "d10", region: "busan", place: "해운대 달맞이길", date: "2025-06-02", text: "달빛이 바다에 길을 내던 밤" },
].map((r) => ({ ...r, image: DEMO_IMAGE, demo: true }));

export function regionOf(id) {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export function loadUserRecords() {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function loadAllRecords() {
  return [...loadUserRecords(), ...DEMO_RECORDS].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
}

export function saveUserRecord(record) {
  const list = [record, ...loadUserRecords()];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return record;
}

// localStorage 용량을 넘지 않도록 긴 변 640px JPEG로 줄임
export function shrinkImage(file, max = 640) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };
    img.src = url;
  });
}

export function formatDate(date) {
  return date.replaceAll("-", ". ");
}
