const DB_NAME = 'sirafiq-local';
const DB_VERSION = 6;
const STORE_META = 'meta';
const STORE_DIAGNOSTICS = 'diagnostics';
const STORE_SUPPORTS = 'supports';
const STORE_RECORDINGS = 'recordings';
const STORE_WRITINGS = 'writings';
const STORE_REVIEWS = 'reviews';
const STORE_EVENTS = 'learningEvents';

function ensureIndex(store, name, keyPath) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'key' });

      let diagnostics = db.objectStoreNames.contains(STORE_DIAGNOSTICS)
        ? request.transaction.objectStore(STORE_DIAGNOSTICS)
        : db.createObjectStore(STORE_DIAGNOSTICS, { keyPath: 'id', autoIncrement: true });
      ensureIndex(diagnostics, 'createdAt', 'createdAt');

      let supports = db.objectStoreNames.contains(STORE_SUPPORTS)
        ? request.transaction.objectStore(STORE_SUPPORTS)
        : db.createObjectStore(STORE_SUPPORTS, { keyPath: 'id', autoIncrement: true });
      ensureIndex(supports, 'createdAt', 'createdAt');
      ensureIndex(supports, 'category', 'category');
      ensureIndex(supports, 'kind', 'kind');
      ensureIndex(supports, 'titleSearch', 'titleSearch');

      let recordings = db.objectStoreNames.contains(STORE_RECORDINGS)
        ? request.transaction.objectStore(STORE_RECORDINGS)
        : db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id', autoIncrement: true });
      ensureIndex(recordings, 'createdAt', 'createdAt');
      ensureIndex(recordings, 'titleSearch', 'titleSearch');

      let writings = db.objectStoreNames.contains(STORE_WRITINGS)
        ? request.transaction.objectStore(STORE_WRITINGS)
        : db.createObjectStore(STORE_WRITINGS, { keyPath: 'id', autoIncrement: true });
      ensureIndex(writings, 'createdAt', 'createdAt');


      let reviews = db.objectStoreNames.contains(STORE_REVIEWS)
        ? request.transaction.objectStore(STORE_REVIEWS)
        : db.createObjectStore(STORE_REVIEWS, { keyPath: 'key' });
      ensureIndex(reviews, 'nextReview', 'nextReview');
      ensureIndex(reviews, 'domain', 'domain');
      ensureIndex(reviews, 'mastery', 'mastery');


      let events = db.objectStoreNames.contains(STORE_EVENTS)
        ? request.transaction.objectStore(STORE_EVENTS)
        : db.createObjectStore(STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
      ensureIndex(events, 'createdAt', 'createdAt');
      ensureIndex(events, 'domain', 'domain');
      ensureIndex(events, 'kind', 'kind');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB indisponible'));
    request.onblocked = () => reject(new Error('La base locale est bloquée par un autre onglet Sirāfiq.'));
  });
}

async function runRequest(storeName, mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    let settled = false;
    let request;
    try { request = operation(store); } catch (error) { db.close(); reject(error); return; }
    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => {
        if (settled) return; settled = true; db.close();
        reject(request.error || new Error('Erreur de stockage local'));
      };
    }
    tx.oncomplete = () => {
      if (settled) return; settled = true; db.close(); resolve(result);
    };
    tx.onerror = tx.onabort = () => {
      if (settled) return; settled = true; db.close();
      reject(tx.error || new Error('Transaction IndexedDB échouée'));
    };
  });
}

const titleSearch = value => String(value || '').trim().toLocaleLowerCase('fr');

export async function writeLocalProbe() {
  const value = `sirafiq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = { key: 'localProbe', value, updatedAt: new Date().toISOString() };
  await runRequest(STORE_META, 'readwrite', store => store.put(payload));
  const result = await runRequest(STORE_META, 'readonly', store => store.get('localProbe'));
  if (!result || result.value !== value) throw new Error('La donnée écrite n’a pas pu être relue');
  return result;
}
export function addDiagnostic(record) { return runRequest(STORE_DIAGNOSTICS, 'readwrite', s => s.add(record)); }
export function listDiagnostics() { return runRequest(STORE_DIAGNOSTICS, 'readonly', s => s.getAll()); }
export function clearDiagnostics() { return runRequest(STORE_DIAGNOSTICS, 'readwrite', s => s.clear()); }
export async function testIndexedDbAvailability() { if (!('indexedDB' in window)) return false; try { await writeLocalProbe(); return true; } catch { return false; } }

export function addSupport(record) {
  if (!(record.blob instanceof Blob)) return Promise.reject(new Error('Le fichier source est absent'));
  return runRequest(STORE_SUPPORTS, 'readwrite', s => s.add({ ...record, titleSearch: titleSearch(record.title), createdAt: record.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }));
}
export function listSupports() { return runRequest(STORE_SUPPORTS, 'readonly', s => s.getAll()); }
export function getSupport(id) { return runRequest(STORE_SUPPORTS, 'readonly', s => s.get(Number(id))); }
export function deleteSupport(id) { return runRequest(STORE_SUPPORTS, 'readwrite', s => s.delete(Number(id))); }
export function countSupports() { return runRequest(STORE_SUPPORTS, 'readonly', s => s.count()); }

export function addRecording(record) {
  if (!(record.blob instanceof Blob)) return Promise.reject(new Error('L’enregistrement audio est absent'));
  const title = String(record.title || 'Enregistrement').trim();
  return runRequest(STORE_RECORDINGS, 'readwrite', s => s.add({ ...record, title, titleSearch: titleSearch(title), createdAt: record.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }));
}
export function listRecordings() { return runRequest(STORE_RECORDINGS, 'readonly', s => s.getAll()); }
export function getRecording(id) { return runRequest(STORE_RECORDINGS, 'readonly', s => s.get(Number(id))); }
export function deleteRecording(id) { return runRequest(STORE_RECORDINGS, 'readwrite', s => s.delete(Number(id))); }
export function countRecordings() { return runRequest(STORE_RECORDINGS, 'readonly', s => s.count()); }

export function addWriting(record) {
  if (!(record.blob instanceof Blob)) return Promise.reject(new Error('L’image du tracé est absente'));
  return runRequest(STORE_WRITINGS, 'readwrite', s => s.add({ ...record, createdAt: record.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }));
}
export function listWritings() { return runRequest(STORE_WRITINGS, 'readonly', s => s.getAll()); }
export function getWriting(id) { return runRequest(STORE_WRITINGS, 'readonly', s => s.get(Number(id))); }
export function deleteWriting(id) { return runRequest(STORE_WRITINGS, 'readwrite', s => s.delete(Number(id))); }
export function countWritings() { return runRequest(STORE_WRITINGS, 'readonly', s => s.count()); }


export function upsertReviewItem(record) {
  if (!record?.key) return Promise.reject(new Error('Clé de révision absente'));
  const now = new Date().toISOString();
  return runRequest(STORE_REVIEWS, 'readwrite', s => s.put({ ...record, updatedAt: now, createdAt: record.createdAt || now }));
}
export function listReviewItems() { return runRequest(STORE_REVIEWS, 'readonly', s => s.getAll()); }
export function getReviewItem(key) { return runRequest(STORE_REVIEWS, 'readonly', s => s.get(String(key))); }
export function deleteReviewItem(key) { return runRequest(STORE_REVIEWS, 'readwrite', s => s.delete(String(key))); }


export function addLearningEvent(record) {
  const now = new Date().toISOString();
  return runRequest(STORE_EVENTS, 'readwrite', s => s.add({ ...record, createdAt: record?.createdAt || now }));
}
export function listLearningEvents() { return runRequest(STORE_EVENTS, 'readonly', s => s.getAll()); }
export function countLearningEvents() { return runRequest(STORE_EVENTS, 'readonly', s => s.count()); }
export function clearLearningEvents() { return runRequest(STORE_EVENTS, 'readwrite', s => s.clear()); }
