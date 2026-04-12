// ── Model Cache (IndexedDB) & Persistent Storage ──────────────
export const ModelCacheDB = {
  name: 'LocalMind_Model_Cache_v1',
  async open() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.name, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains('model_cache')) db.createObjectStore('model_cache');
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  },
  async save(key, blob) {
    const db = await this.open();
    return new Promise((r, j) => {
      const tx = db.transaction('model_cache', 'readwrite');
      tx.objectStore('model_cache').put(blob, key);
      tx.oncomplete = () => r();
      tx.onerror = () => j(tx.error);
    });
  },
  async get(key) {
    const db = await this.open();
    const tx = db.transaction('model_cache', 'readonly');
    const req = tx.objectStore('model_cache').get(key);
    return new Promise(r => req.onsuccess = () => r(req.result));
  }
};

export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }
}

export async function purgeCache() {
  if (!confirm("Clear model cache? This will require a redownload.")) return;
  indexedDB.deleteDatabase(ModelCacheDB.name);
  location.reload();
}
window.purgeCache = purgeCache;
