/**
 * @file storage.js
 * @description IndexedDB storage layer for InquiryOS session and user data.
 */

const DB_NAME = 'InquiryOS_DB';
const DB_VERSION = 4;

/** @constant {string} Store name for class sessions and work data */
export const STORE_SESSIONS = 'sessions';
/** @constant {string} Store name for user's personal session library */
export const STORE_LIBRARY = 'library';
/** @constant {string} Store name for class user/participant registry */
export const STORE_USERS = 'users';
/** @constant {string} Store name for saved lesson presets */
export const STORE_LESSONS = 'lessons';

let db = null;
let dbReady = false;

/**
 * Initializes the IndexedDB database and creates object stores if they don't exist.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            dbReady = true;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            if (!database.objectStoreNames.contains(STORE_SESSIONS)) {
                const sessionsStore = database.createObjectStore(STORE_SESSIONS, { keyPath: 'code' });
                sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            if (!database.objectStoreNames.contains(STORE_LIBRARY)) {
                database.createObjectStore(STORE_LIBRARY, { keyPath: 'code' });
            }
            
            if (!database.objectStoreNames.contains(STORE_LESSONS)) {
                database.createObjectStore(STORE_LESSONS, { keyPath: 'id' });
            }

            if (database.objectStoreNames.contains(STORE_USERS)) {
                database.deleteObjectStore(STORE_USERS);
            }
            const usersStore = database.createObjectStore(STORE_USERS, { keyPath: 'visitorId' });
            usersStore.createIndex('classCode', 'classCode', { unique: false });
            
            console.log('IndexedDB schema created/updated');
        };
    });
}

/**
 * Checks if the database is initialized and ready for operations.
 * @returns {boolean}
 */
export function isDBReady() {
    return dbReady;
}

/**
 * Adds or updates an item in the specified object store.
 * @param {string} storeName - The name of the object store.
 * @param {Object} data - The data to store.
 * @returns {Promise<any>} A promise that resolves with the result of the put operation.
 */
export function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db || !dbReady) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Retrieves an item from the specified object store by its key.
 * @param {string} storeName - The name of the object store.
 * @param {any} key - The key of the item to retrieve.
 * @returns {Promise<Object|null>} A promise that resolves with the item or null if not found.
 */
export function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db || !dbReady) {
            resolve(null);
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Retrieves all items from the specified object store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<Array>} A promise that resolves with an array of all items.
 */
export function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        if (!db || !dbReady) {
            resolve([]);
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Deletes an item from the specified object store by its key.
 * @param {string} storeName - The name of the object store.
 * @param {any} key - The key of the item to delete.
 * @returns {Promise<void>}
 */
export function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db || !dbReady) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Retrieves items from an object store using an index.
 * @param {string} storeName - The name of the object store.
 * @param {string} indexName - The name of the index to search.
 * @param {any} value - The value to match in the index.
 * @returns {Promise<Array>} A promise that resolves with the matching items.
 */
export function dbGetByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        if (!db || !dbReady) {
            resolve([]);
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch (e) {
            resolve([]);
        }
    });
}
