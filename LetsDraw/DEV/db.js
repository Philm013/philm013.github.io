export const DB = {
    dbName: 'PeerDrawDB_v2',
    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = e => e.target.result.createObjectStore('boards', { keyPath: 'id' });
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = e => reject(`IndexedDB error: ${e.target.errorCode}`);
        });
    },
    async save(id, snapshot) {
        try {
            const db = await this.init();
            const tx = db.transaction('boards', 'readwrite');
            tx.objectStore('boards').put({ id, snapshot, updatedAt: Date.now() });
            return tx.complete;
        } catch (e) {
            console.error("Failed to save to DB:", e);
        }
    },
    async getAll() {
        try {
            const db = await this.init();
            return new Promise(resolve => {
                const req = db.transaction('boards', 'readonly').objectStore('boards').getAll();
                req.onsuccess = () => resolve(req.result.sort((a, b) => b.updatedAt - a.updatedAt));
                req.onerror = () => resolve([]);
            });
        } catch (e) {
            console.error("Failed to get all from DB:", e);
            return [];
        }
    }
};