// db.js - Database setup and management using IndexedDB for storing reviews and associated PDFs.

// --- Database Configuration ---
/** @const {string} Name of the IndexedDB database. */
const DB_NAME = 'EdReportsReviewDB_NEW';
/** @const {number} Current version of the database schema. Increment for schema changes. */
const DB_VERSION = 4.0; // Version 2.0 adds a 'reviewPdfs' object store.
/** @const {string} Name of the object store for reviews. */
const REVIEW_STORE = 'reviews';
/** @const {string} Name of the new object store for PDFs. */
const PDF_STORE = 'reviewPdfs';

/** @type {IDBDatabase|null} Holds the database instance once initialized. */
let db = null;

/**
 * Initializes the IndexedDB database.
 * Checks for browser support and sets up the object store and indexes if needed.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance upon successful opening,
 * or rejects if an error occurs or IndexedDB is not supported.
 */
function initDB() {
    return new Promise((resolve, reject) => {
        // Check for IndexedDB browser support
        if (!('indexedDB' in window)) {
            const errorMsg = "IndexedDB is not supported by this browser. Reviews cannot be saved locally.";
            console.error(`[DB] ${errorMsg}`);
            showNotification(errorMsg, "error", 0); // Persistent notification
            reject('IndexedDB not supported');
            return;
        }

        console.log(`[DB] Opening database "${DB_NAME}" version ${DB_VERSION}...`);
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            const error = event.target.error;
            console.error('[DB] Database error:', error);
            showNotification(`Database error: ${error ? error.message : 'Unknown error'}`, "error", 0);
            reject(`Error opening database: ${error ? error.message : 'Unknown error'}`);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log(`[DB] Database "${DB_NAME}" opened successfully.`);
            resolve(db);
        };

        // Called when the database version changes or the database is first created.
        request.onupgradeneeded = (event) => {
            const currentDb = event.target.result; // Use currentDb within this scope
            const oldVersion = event.oldVersion;
            const newVersion = event.newVersion;
            const transaction = event.target.transaction;
            console.log(`[DB] Database upgrade needed from version ${oldVersion} to ${newVersion}.`);

            // --- Upgrade path for REVIEW_STORE ---
            if (!currentDb.objectStoreNames.contains(REVIEW_STORE)) {
                const reviewStore = currentDb.createObjectStore(REVIEW_STORE, { keyPath: 'id', autoIncrement: true });
                console.log(`[DB] Object store "${REVIEW_STORE}" created.`);
                reviewStore.createIndex('title', 'metadata.title', { unique: false });
                reviewStore.createIndex('date', 'metadata.date', { unique: false });
                reviewStore.createIndex('publisher', 'metadata.publisher', { unique: false });
                reviewStore.createIndex('rubricId', 'rubricId', { unique: false });
                console.log('[DB] Indexes for "reviews" store created.');
            } else if (oldVersion < 1.2) {
                const reviewStore = transaction.objectStore(REVIEW_STORE);
                if (!reviewStore.indexNames.contains('rubricId')) {
                    reviewStore.createIndex('rubricId', 'rubricId', { unique: false });
                    console.log('[DB] Index "rubricId" created on "reviews" store.');
                }
            }
            
            // --- NEW: Upgrade path for PDF_STORE (Version 2.0) ---
            if (oldVersion < 2.0) {
                 if (!currentDb.objectStoreNames.contains(PDF_STORE)) {
                    // Create a new object store for PDFs. 'id' will be our unique key for each PDF.
                    const pdfStore = currentDb.createObjectStore(PDF_STORE, { keyPath: 'id' });
                    // Create an index on 'reviewId' to allow efficiently fetching all PDFs for a given review.
                    pdfStore.createIndex('reviewId', 'reviewId', { unique: false });
                    console.log(`[DB] Object store "${PDF_STORE}" created with "reviewId" index.`);
                }
            }
            console.log(`[DB] Database upgrade to version ${newVersion} complete.`);
        };
    });
}

/**
 * Saves or updates a review's associated PDFs in the database.
 * This function first clears any existing PDFs for the given reviewId,
 * then saves the new list of PDFs.
 * @param {number} reviewId - The ID of the review these PDFs belong to.
 * @param {Array<{id: string, name: string, base64Data: string}>} pdfsToSave - The array of PDF objects from the session.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
function savePdfsForReview(reviewId, pdfsToSave) {
    return new Promise(async (resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        if (!reviewId) return reject('A valid reviewId is required to save PDFs.');

        const transaction = db.transaction([PDF_STORE], 'readwrite');
        const store = transaction.objectStore(PDF_STORE);

        // 1. Clear existing PDFs for this reviewId
        const index = store.index('reviewId');
        const getKeysRequest = index.getAllKeys(reviewId);

        getKeysRequest.onsuccess = () => {
            const keysToDelete = getKeysRequest.result;
            if (keysToDelete.length > 0) {
                console.log(`[DB] Deleting ${keysToDelete.length} old PDFs for review ID ${reviewId}.`);
                keysToDelete.forEach(key => store.delete(key));
            }

            // 2. Add new PDFs
            if (pdfsToSave && pdfsToSave.length > 0) {
                console.log(`[DB] Saving ${pdfsToSave.length} new PDFs for review ID ${reviewId}.`);
                pdfsToSave.forEach(pdf => {
                    // The 'id' in the pdf object is its unique key. We also add 'reviewId' for indexing.
                    store.put({ ...pdf, reviewId: reviewId });
                });
            }
        };

        getKeysRequest.onerror = (event) => reject(`Failed to get keys of old PDFs: ${event.target.error}`);
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(`Transaction error saving PDFs: ${event.target.error}`);
    });
}

/**
 * Retrieves all PDFs associated with a specific review from the database.
 * @param {number} reviewId - The ID of the review whose PDFs are to be retrieved.
 * @returns {Promise<Array<{id: string, name: string, base64Data: string}>>} A promise resolving with an array of PDF objects.
 */
function getPdfsForReview(reviewId) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        if (!reviewId) return resolve([]); // No ID, no PDFs

        const transaction = db.transaction([PDF_STORE], 'readonly');
        const store = transaction.objectStore(PDF_STORE);
        const index = store.index('reviewId');
        const request = index.getAll(reviewId);

        request.onsuccess = () => {
            const pdfs = request.result || [];
            console.log(`[DB] Retrieved ${pdfs.length} PDFs for review ID ${reviewId}.`);
            resolve(pdfs);
        };
        request.onerror = (event) => reject(`Error getting PDFs for review: ${event.target.error}`);
    });
}


/**
 * Saves a review to the database.
 * If `reviewData.id` is present, it updates the existing review; otherwise, it adds a new review.
 * Automatically adds/updates a `lastModified` timestamp.
 * @param {object} reviewData - The review object to save. Must include `rubricId`.
 * @returns {Promise<number>} A promise resolving with the ID of the saved/updated review.
 * @throws {Error} If database is not initialized, no data is provided, or `rubricId` is missing.
 */
function saveReview(reviewData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('Database not initialized. Cannot save review.');
        }
        if (!reviewData) {
            return reject('No review data provided to save.');
        }
        if (!reviewData.rubricId) {
            showNotification("Warning: Saving review without a Rubric ID. This may cause issues loading it later.", "warning", 8000);
        }

        reviewData.lastModified = new Date().toISOString();

        const transaction = db.transaction([REVIEW_STORE], 'readwrite');
        const store = transaction.objectStore(REVIEW_STORE);
        let request;

        if (reviewData.id) {
            request = store.put(reviewData);
        } else {
            const reviewCopy = { ...reviewData };
            delete reviewCopy.id;
            request = store.add(reviewCopy);
        }

        request.onsuccess = (event) => {
            const savedId = event.target.result;
            resolve(savedId);
        };

        request.onerror = (event) => {
            reject(`Failed to save review: ${event.target.error}`);
        };
    });
}

/**
 * Deletes a review and its associated PDFs from the database.
 * @param {number|string} id - The ID of the review to delete.
 * @returns {Promise<boolean>} A promise resolving to true on successful deletion.
 */
function deleteReview(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        if (id === undefined || id === null) return reject('Invalid review ID provided for deletion.');
        
        console.log(`[DB] Deleting review ID ${id} and its associated PDFs.`);
        // Use a single transaction for both stores to ensure atomicity
        const transaction = db.transaction([REVIEW_STORE, PDF_STORE], 'readwrite');
        const reviewStore = transaction.objectStore(REVIEW_STORE);
        const pdfStore = transaction.objectStore(PDF_STORE);

        // 1. Delete the review text data
        reviewStore.delete(id);

        // 2. Delete associated PDFs
        const pdfIndex = pdfStore.index('reviewId');
        const pdfKeysRequest = pdfIndex.getAllKeys(id);
        
        pdfKeysRequest.onsuccess = () => {
            const keysToDelete = pdfKeysRequest.result;
            if (keysToDelete.length > 0) {
                 console.log(`[DB] Deleting ${keysToDelete.length} PDFs for review ID ${id}.`);
                 keysToDelete.forEach(key => pdfStore.delete(key));
            }
        };
        pdfKeysRequest.onerror = (e) => console.error('Error finding PDFs to delete:', e.target.error);

        transaction.oncomplete = () => {
            console.log(`[DB] Delete transaction for review ID ${id} completed.`);
            resolve(true);
        };

        transaction.onerror = (event) => {
            reject(`Failed to delete review and its PDFs: ${event.target.error}`);
        };
    });
}

/**
 * Retrieves a specific review from the database by its ID.
 * @param {number|string} id - The ID of the review to retrieve.
 * @returns {Promise<object|null>} A promise resolving with the review object if found,
 * or null if not found. Rejects on database error.
 */
function getReview(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized. Cannot get review.');
            return;
        }
        if (id === undefined || id === null) {
            reject('Invalid review ID provided for retrieval.');
            return;
        }

        const transaction = db.transaction([REVIEW_STORE], 'readonly');
        const store = transaction.objectStore(REVIEW_STORE);
        const request = store.get(id);

        request.onsuccess = (event) => {
            resolve(request.result || null);
        };

        request.onerror = (event) => {
            reject(`Failed to retrieve review: ${event.target.error}`);
        };
    });
}

/**
 * Retrieves all reviews stored in the database.
 * @returns {Promise<object[]>} A promise resolving with an array of all review objects.
 */
function getAllReviews() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized. Cannot get all reviews.');
            return;
        }

        const transaction = db.transaction([REVIEW_STORE], 'readonly');
        const store = transaction.objectStore(REVIEW_STORE);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(request.result || []);
        };

        request.onerror = (event) => {
            reject(`Failed to retrieve reviews: ${event.target.error}`);
        };
    });
}


// --- Expose DB functions ---
window.initDB = initDB;
window.saveReview = saveReview;
window.deleteReview = deleteReview;
window.getReview = getReview;
window.getAllReviews = getAllReviews;
// NEW: Expose PDF management functions
window.savePdfsForReview = savePdfsForReview;
window.getPdfsForReview = getPdfsForReview;