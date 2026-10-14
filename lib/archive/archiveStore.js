const DB_NAME = "smo-archive";
const DB_VERSION = 1;
const STORE = "entries";

/**
 * @typedef {Object} ArchiveEntry
 * @property {string} id
 * @property {number} createdAt
 * @property {'image' | 'text'} source
 * @property {string} title
 * @property {string | null} sourceText
 * @property {string | null} imageDataUrl
 * @property {string[]} paletteHex
 * @property {{ id: string, labelKo: string, hex: string }[]} colorRoles
 * @property {object | null} visualSignature
 * @property {number} energy
 * @property {'image' | 'text'} shapeMode
 * @property {import('@/lib/sensory/schema').SensoryAnalysis} analysis
 * @property {string} musicVarietySeed
 * @property {Blob | null} audioBlob
 * @property {string | null} audioMimeType
 */

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB를 사용할 수 없는 환경입니다."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

/**
 * @template T
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} run
 * @returns {Promise<T>}
 */
async function withStore(mode, run) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function createArchiveId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** @param {ArchiveEntry} entry */
export function saveArchiveEntry(entry) {
  return withStore("readwrite", (store) => store.put(entry));
}

/**
 * @param {string} id
 * @param {Partial<ArchiveEntry>} patch
 */
export async function updateArchiveEntry(id, patch) {
  const current = await getArchiveEntry(id);
  if (!current) {
    return;
  }
  await saveArchiveEntry({ ...current, ...patch });
}

/** @param {string} id @returns {Promise<ArchiveEntry | undefined>} */
export function getArchiveEntry(id) {
  return withStore("readonly", (store) => store.get(id));
}

/** @returns {Promise<ArchiveEntry[]>} */
export async function listArchiveEntries() {
  const all = await withStore("readonly", (store) => store.getAll());
  return (all || []).sort((a, b) => b.createdAt - a.createdAt);
}

/** @param {string} id */
export function deleteArchiveEntry(id) {
  return withStore("readwrite", (store) => store.delete(id));
}

/** @param {string} dataUrl */
export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
