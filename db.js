const DB_NAME = 'sirafiq-local';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_DIAGNOSTICS = 'diagnostics';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_DIAGNOSTICS)) {
        const store = db.createObjectStore(STORE_DIAGNOSTICS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB indisponible'));
  });
}

function transactionPromise(db, storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Erreur de stockage local'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Transaction IndexedDB échouée'));
    };
  });
}

export async function writeLocalProbe() {
  const db = await openDb();
  const value = `sirafiq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await transactionPromise(db, STORE_META, 'readwrite', store => store.put({ key: 'localProbe', value, updatedAt: new Date().toISOString() }));
  const verifyDb = await openDb();
  const result = await transactionPromise(verifyDb, STORE_META, 'readonly', store => store.get('localProbe'));
  if (!result || result.value !== value) throw new Error('La donnée écrite n’a pas pu être relue');
  return result;
}

export async function addDiagnostic(record) {
  const db = await openDb();
  return transactionPromise(db, STORE_DIAGNOSTICS, 'readwrite', store => store.add(record));
}

export async function listDiagnostics() {
  const db = await openDb();
  return transactionPromise(db, STORE_DIAGNOSTICS, 'readonly', store => store.getAll());
}

export async function clearDiagnostics() {
  const db = await openDb();
  return transactionPromise(db, STORE_DIAGNOSTICS, 'readwrite', store => store.clear());
}

export async function testIndexedDbAvailability() {
  if (!('indexedDB' in window)) return false;
  try {
    await writeLocalProbe();
    return true;
  } catch {
    return false;
  }
}
