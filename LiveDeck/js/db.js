/**
 * LiveDeck - Database Module (IndexedDB)
 * 
 * Optimized for large-scale data storage (Base64 images, complex decks).
 */

const db = {
    dbName: 'LiveDeck_DB',
    version: 2, // Bumped version for multiple stores
    instance: null,

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // Store for multiple decks
                if (!db.objectStoreNames.contains('decks')) {
                    db.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
                }
                // Store for global app state & settings
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = (e) => {
                this.instance = e.target.result;
                console.log('IndexedDB Initialized');
                resolve();
            };

            request.onerror = (e) => reject(e.target.error);
        });
    },

    /**
     * Settings / State Management
     */
    saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Deck Management
     */
    saveDeck(deck) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction(['decks'], 'readwrite');
            const store = transaction.objectStore('decks');
            const request = store.put(deck);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    getDeck(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction(['decks'], 'readonly');
            const store = transaction.objectStore('decks');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    getAllDecks() {
        return new Promise((resolve, reject) => {
            const transaction = this.instance.transaction(['decks'], 'readonly');
            const store = transaction.objectStore('decks');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};
