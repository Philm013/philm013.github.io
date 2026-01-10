/**
 * FlipbookAI IndexedDB Helper
 *
 * Manages the database for storing PDFs and collections.
 * Database: FlipbookAIDB
 * Stores:
 *  - pdfs: { id (auto-incrementing), name, data (ArrayBuffer), dateAdded }
 *  - collections: { id (auto-incrementing), name, pdfIds (Array of pdf.id) }
 */
const db = (() => {
    const DB_NAME = 'FlipbookAIDB';
    const DB_VERSION = 1;
    const PDF_STORE = 'pdfs';
    const COLLECTION_STORE = 'collections';

    let dbInstance;

    /**
     * Initializes and opens the IndexedDB database.
     * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                return resolve(dbInstance);
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject("Error opening database.");
            };

            request.onupgradeneeded = (event) => {
                const tempDb = event.target.result;
                if (!tempDb.objectStoreNames.contains(PDF_STORE)) {
                    tempDb.createObjectStore(PDF_STORE, { keyPath: 'id', autoIncrement: true });
                }
                if (!tempDb.objectStoreNames.contains(COLLECTION_STORE)) {
                    const collectionStore = tempDb.createObjectStore(COLLECTION_STORE, { keyPath: 'id', autoIncrement: true });
                    collectionStore.createIndex('name', 'name', { unique: true });
                }
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                console.log("Database initialized successfully.");
                resolve(dbInstance);
            };
        });
    }

    /**
     * Adds a PDF to the database.
     * @param {string} name - The filename of the PDF.
     * @param {ArrayBuffer} data - The PDF file data.
     * @returns {Promise<number>} A promise that resolves with the new PDF's ID.
     */
    function addPdf(name, data) {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction([PDF_STORE], 'readwrite');
            const store = transaction.objectStore(PDF_STORE);
            const pdf = { name, data, dateAdded: new Date() };
            const request = store.add(pdf);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Error adding PDF: " + event.target.error);
        });
    }

    /**
     * Retrieves a single PDF by its ID.
     * @param {number} id - The ID of the PDF to retrieve.
     * @returns {Promise<object>} A promise that resolves with the PDF object {id, name, data, dateAdded}.
     */
    function getPdf(id) {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction([PDF_STORE], 'readonly');
            const store = transaction.objectStore(PDF_STORE);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Error getting PDF: " + event.target.error);
        });
    }

    /**
     * Retrieves all PDFs from the database.
     * @returns {Promise<Array<object>>} A promise that resolves with an array of all PDF objects.
     */
    function getAllPdfs() {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction([PDF_STORE], 'readonly');
            const store = transaction.objectStore(PDF_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Error getting all PDFs: " + event.target.error);
        });
    }

    /**
     * Deletes a PDF from the database.
     * @param {number} id - The ID of the PDF to delete.
     * @returns {Promise<void>}
     */
    function deletePdf(id) {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction([PDF_STORE], 'readwrite');
            const store = transaction.objectStore(PDF_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject("Error deleting PDF: " + event.target.error);
        });
    }


    /**
     * Creates a new, empty collection.
     * @param {string} name - The name of the new collection.
     * @returns {Promise<number>} A promise that resolves with the new collection's ID.
     */
    function addCollection(name) {
        return new Promise((resolve, reject) => {
            if (!name || name.trim() === '') {
                return reject("Collection name cannot be empty.");
            }
            const transaction = dbInstance.transaction([COLLECTION_STORE], 'readwrite');
            const store = transaction.objectStore(COLLECTION_STORE);
            const collection = { name, pdfIds: [] };
            const request = store.add(collection);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Error adding collection: " + event.target.error);
        });
    }

    /**
     * Retrieves all collections.
     * @returns {Promise<Array<object>>} A promise resolving with an array of collection objects.
     */
    function getAllCollections() {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction([COLLECTION_STORE], 'readonly');
            const store = transaction.objectStore(COLLECTION_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject("Error getting collections: " + event.target.error);
        });
    }

    /**
     * Updates a collection (e.g., adding/removing PDFs).
     * @param {object} collection - The collection object to update.
     * @returns {Promise<void>}
     */
    function updateCollection(collection) {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction([COLLECTION_STORE], 'readwrite');
            const store = transaction.objectStore(COLLECTION_STORE);
            const request = store.put(collection);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject("Error updating collection: " + event.target.error);
        });
    }

    /**
     * Deletes a collection. Does not delete the PDFs within it.
     * @param {number} id - The ID of the collection to delete.
     * @returns {Promise<void>}
     */
    function deleteCollection(id) {
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction([COLLECTION_STORE], 'readwrite');
            const store = transaction.objectStore(COLLECTION_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject("Error deleting collection: " + event.target.error);
        });
    }

    // Expose the public API
    return {
        initDB,
        addPdf,
        getPdf,
        getAllPdfs,
        deletePdf,
        addCollection,
        getAllCollections,
        updateCollection,
        deleteCollection
    };
})();
