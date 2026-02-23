/**
 * @file FileSystem.js
 * @description Virtual File System (VFS) implementation using IndexedDB for persistent project storage in the browser.
 */

/**
 * Manages file storage, project isolation, and migration logic for NexusIDE.
 * Uses IndexedDB to store files indexed by project.
 */
export class FileSystem {
    /**
     * Creates a new FileSystem instance.
     * @param {string} [dbName='NexusIDE_DB'] - The name of the IndexedDB database.
     * @param {string} [storeName='files'] - The name of the object store for file data.
     */
    constructor(dbName = 'NexusIDE_DB', storeName = 'files') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
        /** @type {string} The name of the currently active project workspace. */
        this.currentProject = localStorage.getItem('nexus_current_project') || 'default';
    }

    /**
     * Initializes the IndexedDB database and ensures the necessary stores and indexes exist.
     * @returns {Promise<void>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 4); // Bump version for migration

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'path' });
                }
                const store = event.currentTarget.transaction.objectStore(this.storeName);
                if (!store.indexNames.contains('project')) {
                    store.createIndex('project', 'project', { unique: false });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                await this._migrateLegacy();
                resolve();
            };

            request.onerror = (event) => {
                reject('IndexedDB error: ' + event.target.errorCode);
            };
        });
    }

    /**
     * Migrates legacy file records (without project prefixes) to the new project-isolated path format.
     * @private
     * @returns {Promise<void>}
     */
    async _migrateLegacy() {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const records = request.result;
                let migrated = 0;
                for (const record of records) {
                    // If path is not prefixed with project:
                    if (!record.path.includes(':')) {
                        const originalPath = record.path;
                        const project = record.project || 'default';
                        store.delete(originalPath);
                        record.path = `${project}:${originalPath}`;
                        record.originalPath = originalPath;
                        store.put(record);
                        migrated++;
                    }
                }
                if (migrated > 0) console.log(`VFS: Migrated ${migrated} legacy files to project isolation.`);
                resolve();
            };
        });
    }

    /**
     * Sets the active project and persists the choice to LocalStorage.
     * @param {string} projectName - The name of the project to switch to.
     */
    async setProject(projectName) {
        this.currentProject = projectName;
        localStorage.setItem('nexus_current_project', projectName);
    }

    /**
     * Writes file content to the current project's storage.
     * @param {string} path - The relative path of the file.
     * @param {string} content - The text content to write.
     * @returns {Promise<void>}
     */
    async writeFile(path, content) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put({ 
                path: `${this.currentProject}:${path}`, 
                content: content, 
                project: this.currentProject,
                originalPath: path,
                timestamp: Date.now() 
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject('Error writing file');
        });
    }

    /**
     * Reads a file's content from the current project's storage.
     * @param {string} path - The relative path or absolute VFS key of the file.
     * @returns {Promise<string|null>} The file content, or null if not found.
     */
    async readFile(path) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const key = path.includes(':') ? path : `${this.currentProject}:${path}`;
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.content : null);
            };
            request.onerror = () => reject('Error reading file');
        });
    }

    /**
     * Deletes a file from the current project's storage.
     * @param {string} path - The relative path or absolute VFS key of the file.
     * @returns {Promise<void>}
     */
    async deleteFile(path) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const key = path.includes(':') ? path : `${this.currentProject}:${path}`;
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject('Error deleting file');
        });
    }

    /**
     * Lists all files belonging to the current active project.
     * @returns {Promise<string[]>} An array of relative file paths.
     */
    async listFiles() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('project');
            const request = index.getAll(this.currentProject);

            request.onsuccess = () => {
                const files = request.result.map(f => f.originalPath || f.path.split(':').slice(1).join(':')).sort();
                resolve(files);
            };
            request.onerror = () => reject('Error listing files');
        });
    }

    /**
     * Lists all unique project names currently stored in the database.
     * @returns {Promise<string[]>}
     */
    async listProjects() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const projects = [...new Set(request.result.map(f => f.project || 'default'))];
                resolve(projects);
            };
            request.onerror = () => reject('Error listing projects');
        });
    }

    /**
     * Permanently deletes a project and all its associated files.
     * @param {string} projectName - The name of the project to delete.
     * @returns {Promise<void>}
     */
    async deleteProject(projectName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('project');
            const request = index.getAllKeys(projectName);

            request.onsuccess = () => {
                const keys = request.result;
                let deleted = 0;
                if (keys.length === 0) resolve();
                keys.forEach(key => {
                    const delReq = store.delete(key);
                    delReq.onsuccess = () => {
                        deleted++;
                        if (deleted === keys.length) resolve();
                    };
                });
            };
            request.onerror = () => reject('Error deleting project');
        });
    }

    /**
     * Reads multiple files simultaneously.
     * @param {string[]} paths - An array of relative paths to read.
     * @returns {Promise<Object.<string, string>>} An object mapping paths to their contents.
     */
    async readMultiple(paths) {
        const results = {};
        for (const path of paths) {
            results[path] = await this.readFile(path);
        }
        return results;
    }
}
