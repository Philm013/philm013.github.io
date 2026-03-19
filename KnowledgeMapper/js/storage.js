import { toast } from './ui.js';

const MAPS_STORAGE_KEY = 'visualKnowledgeTool_allMaps';
const TEMPLATES_STORAGE_KEY = 'visualKnowledgeTool_templates';

/**
 * Manages the IndexedDB database for chat messages.
 */
export const dbManager = {
    db: null,
    DB_VERSION: 1,
    /**
     * Opens and initializes the IndexedDB database and its object stores.
     * @returns {Promise<void>}
     */
    init: function() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('VisualKnowledgeDB', this.DB_VERSION);
            req.onerror = () => reject("DB Error: " + req.error);
            req.onsuccess = e => {
                this.db = e.target.result;
                resolve();
            };
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('chatMessages')) {
                    const store = db.createObjectStore('chatMessages', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('mapId', 'mapId', { unique: false });
                }
            };
        });
    },
    _promisify: (request) => new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }),
    /**
     * Saves a single chat message associated with a map ID.
     * @param {string} mapId - The ID of the map.
     * @param {object} messageObject - The message object to save (e.g., { role, content }).
     * @returns {Promise<IDBValidKey>}
     */
    saveMessage: function(mapId, messageObject) {
        if (!mapId || !this.db) return Promise.resolve();
        const tx = this.db.transaction('chatMessages', 'readwrite');
        return this._promisify(tx.objectStore('chatMessages').add({ mapId, ...messageObject, timestamp: new Date() }));
    },
    /**
     * Retrieves all chat messages for a given map ID.
     * @param {string} mapId - The ID of the map.
     * @returns {Promise<object[]>}
     */
    getMapMessages: function(mapId) {
        if (!mapId || !this.db) return Promise.resolve([]);
        const tx = this.db.transaction('chatMessages', 'readonly');
        return this._promisify(tx.objectStore('chatMessages').index('mapId').getAll(mapId));
    },
    /**
     * Deletes all chat messages associated with a map ID.
     * @param {string} mapId - The ID of the map.
     * @returns {Promise<void>}
     */
    deleteMapMessages: async function(mapId) {
        if (!this.db) return;
        const tx = this.db.transaction('chatMessages', 'readwrite');
        const store = tx.objectStore('chatMessages');
        const index = store.index('mapId');
        const keys = await this._promisify(index.getAllKeys(mapId));
        await Promise.all(keys.map(key => this._promisify(store.delete(key))));
    },
};

/**
 * Manages map data (nodes, links, metadata) stored in localStorage.
 */
export const mapsManager = {
    /**
     * Retrieves the entire collection of maps from localStorage.
     * @returns {object}
     */
    getAll: () => {
        try {
            const maps = localStorage.getItem(MAPS_STORAGE_KEY);
            return maps ? JSON.parse(maps) : {};
        } catch {
            return {};
        }
    },
    /**
     * Saves the entire collection of maps back to localStorage.
     * @param {object} maps - The map collection object to save.
     */
    saveAll: (maps) => {
        localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(maps));
    },
    /**
     * Gets the current graph data in a serializable format.
     * @returns {object}
     */
    getCurrentGraphData: () => {
        const activeStep = document.querySelector('.step-indicator.active');
        const researchStep = activeStep ? parseInt(activeStep.dataset.step) : 1;
        
        let canvasData = null;
        if (window.tldrawEditor) {
            canvasData = window.tldrawEditor.store.getSnapshot();
        }

        return {
            canvasData,
            researchStep: researchStep,
            sources: window.projectSources || []
        };
    },

    /**
     * Saves the current state of an open map.
     * @param {string} currentMapId - The ID of the currently open map.
     */
    saveCurrent: (currentMapId) => {
        if (!currentMapId) return;
        const maps = mapsManager.getAll();
        if (!maps[currentMapId]) {
            console.error("Attempted to save a map that doesn't exist in storage:", currentMapId);
            return;
        }
        maps[currentMapId].graphData = mapsManager.getCurrentGraphData();
        maps[currentMapId].lastModified = Date.now();
        mapsManager.saveAll(maps);
        toast('Map Saved!');
    },
    /**
     * Creates a new map entry in storage and returns its ID.
     * @param {string} name - The name for the new map.
     * @param {object} graphData - The initial graph data for the map.
     * @returns {string} The ID of the newly created map.
     */
    create: (name, graphData) => {
        const maps = mapsManager.getAll();
        const newId = `map_${Date.now()}`;
        maps[newId] = { id: newId, name: name || 'Untitled Map', lastModified: Date.now(), graphData: graphData };
        mapsManager.saveAll(maps);
        return newId;
    },
    /**
     * Deletes a map and its associated chat history.
     * @param {string} mapId - The ID of the map to delete.
     * @param {Function} renderCallback - A callback to re-render the landing page.
     */
    delete: async (mapId, renderCallback) => {
        const maps = mapsManager.getAll();
        delete maps[mapId];
        mapsManager.saveAll(maps);
        await dbManager.deleteMapMessages(mapId);
        if (renderCallback) renderCallback();
    },
    /**
     * Renames a map.
     * @param {string} mapId - The ID of the map to rename.
     * @param {string} newName - The new name for the map.
     * @param {Function} renderCallback - A callback to re-render the landing page.
     */
    rename: (mapId, newName, renderCallback) => {
        const maps = mapsManager.getAll();
        if (maps[mapId] && newName) {
            maps[mapId].name = newName;
            mapsManager.saveAll(maps);
            if (renderCallback) renderCallback();
        }
    },
    /**
     * Creates a copy of an existing map.
     * @param {string} mapId - The ID of the map to duplicate.
     * @param {Function} renderCallback - A callback to re-render the landing page.
     */
    duplicate: (mapId, renderCallback) => {
        const maps = mapsManager.getAll();
        const originalMap = maps[mapId];
        if (originalMap) {
            const newId = `map_${Date.now()}`;
            const newMap = JSON.parse(JSON.stringify(originalMap));
            newMap.id = newId;
            newMap.name = `Copy of ${originalMap.name}`;
            newMap.lastModified = Date.now();
            maps[newId] = newMap;
            mapsManager.saveAll(maps);
            if (renderCallback) renderCallback();
        }
    }
};

/**
 * Manages custom templates stored in localStorage.
 */
export const templatesManager = {
    getCustom: () => {
        try {
            const t = localStorage.getItem(TEMPLATES_STORAGE_KEY);
            return t ? JSON.parse(t) : {};
        } catch {
            return {};
        }
    },
    saveAllCustom: (templates) => {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    },
    save: (name, graphData) => {
        const templates = templatesManager.getCustom();
        const idMap = new Map();
        let counter = 0;
        const nodesToProcess = JSON.parse(JSON.stringify(graphData.nodes)); // deep copy

        const newNodes = nodesToProcess.map(n => {
            const oldId = n.id;
            const newId = `node-${++counter}`;
            idMap.set(oldId, newId);
            n.id = newId;
            return n;
        });

        const newLinks = graphData.links.map(l => ({
            source: idMap.get(l.source),
            target: idMap.get(l.target),
            label: l.label
        })).filter(l => l.source && l.target);

        const newGraphData = { ...graphData, nodes: newNodes, links: newLinks, counter };
        const newId = `template_${Date.now()}`;
        templates[newId] = { id: newId, name, graphData: newGraphData };
        templatesManager.saveAllCustom(templates);
        toast(`Template "${name}" saved!`);
    },
    delete: (templateId) => {
        const templates = templatesManager.getCustom();
        delete templates[templateId];
        templatesManager.saveAllCustom(templates);
    }
};