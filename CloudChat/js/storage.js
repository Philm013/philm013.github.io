// ── Model Cache (IndexedDB) & Persistent Storage ──────────────
export const ModelCacheDB = {
  name: 'LocalMind_Model_Cache_v1',
  async open() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.name, 2);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('model_cache')) db.createObjectStore('model_cache');
        if (!db.objectStoreNames.contains('model_download_chunks')) db.createObjectStore('model_download_chunks');
        if (!db.objectStoreNames.contains('model_download_meta')) db.createObjectStore('model_download_meta');
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
  },
  async saveDownloadChunkBatch(downloadKey, startIndex, chunks, state) {
    if (!Array.isArray(chunks) || chunks.length === 0) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['model_download_chunks', 'model_download_meta'], 'readwrite');
      const chunkStore = tx.objectStore('model_download_chunks');
      const metaStore = tx.objectStore('model_download_meta');

      for (let i = 0; i < chunks.length; i++) {
        chunkStore.put(chunks[i], `${downloadKey}:${startIndex + i}`);
      }

      metaStore.put({ key: downloadKey, ...state });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async getDownloadState(downloadKey) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('model_download_meta', 'readonly');
      const req = tx.objectStore('model_download_meta').get(downloadKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async getDownloadChunks(downloadKey, count) {
    if (!count) return [];
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('model_download_chunks', 'readonly');
      const store = tx.objectStore('model_download_chunks');
      const out = new Array(count);
      let remaining = count;

      for (let i = 0; i < count; i++) {
        const req = store.get(`${downloadKey}:${i}`);
        req.onsuccess = () => {
          out[i] = req.result;
          remaining -= 1;
          if (remaining === 0) resolve(out.filter(Boolean));
        };
        req.onerror = () => reject(req.error);
      }
    });
  },
  async clearDownload(downloadKey) {
    const state = await this.getDownloadState(downloadKey);
    const count = state?.nextChunkIndex || 0;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['model_download_chunks', 'model_download_meta'], 'readwrite');
      const chunkStore = tx.objectStore('model_download_chunks');
      const metaStore = tx.objectStore('model_download_meta');

      for (let i = 0; i < count; i++) {
        chunkStore.delete(`${downloadKey}:${i}`);
      }
      metaStore.delete(downloadKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
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
