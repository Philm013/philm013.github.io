import { getGraphState } from './graph.js';
import { toast } from './ui.js';

const MAPS_STORAGE_KEY = 'visualKnowledgeTool_allMaps';
const TEMPLATES_STORAGE_KEY = 'visualKnowledgeTool_templates';

/**
 * Manages the IndexedDB database for chat messages.
 */
export const dbManager = {
    db: null,
    DB_VERSION: 3,
    /**
     * Opens and initializes the IndexedDB database and its object stores.
     * @returns {Promise<void>}
     */
    init: function() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('VisualKnowledgeDB', this.DB_VERSION);
            req.onerror = e => reject("DB Error: " + e.target.errorCode);
            req.onsuccess = e => {
                this.db = e.target.result;
                resolve();
            };
            req.onupgradeneeded = e => {
                const db = e.target.result;
                let store;
                if (!db.objectStoreNames.contains('chatMessages')) {
                    store = db.createObjectStore('chatMessages', { keyPath: 'id', autoIncrement: true });
                } else {
                    store = e.target.transaction.objectStore('chatMessages');
                }
                
                if (!store.indexNames.contains('mapId')) {
                    store.createIndex('mapId', 'mapId', { unique: false });
                }
                if (!store.indexNames.contains('nodeId')) {
                    store.createIndex('nodeId', 'nodeId', { unique: false });
                }
                if (!store.indexNames.contains('map_node')) {
                    store.createIndex('map_node', ['mapId', 'nodeId'], { unique: false });
                }

                if (!db.objectStoreNames.contains('projectSources')) {
                    const sStore = db.createObjectStore('projectSources', { keyPath: 'id', autoIncrement: true });
                    sStore.createIndex('mapId', 'mapId', { unique: false });
                }
            };
        });
    },
    _promisify: (request) => new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }),

    // --- Source CRUD ---
    saveSource: function(mapId, sourceData) {
        if (!mapId || !this.db) return Promise.resolve();
        const tx = this.db.transaction('projectSources', 'readwrite');
        return this._promisify(tx.objectStore('projectSources').add({ mapId, ...sourceData, timestamp: new Date() }));
    },
    getMapSources: function(mapId) {
        if (!mapId || !this.db) return Promise.resolve([]);
        const tx = this.db.transaction('projectSources', 'readonly');
        return this._promisify(tx.objectStore('projectSources').index('mapId').getAll(mapId));
    },
    deleteSource: function(sourceId) {
        if (!this.db) return Promise.resolve();
        const tx = this.db.transaction('projectSources', 'readwrite');
        return this._promisify(tx.objectStore('projectSources').delete(sourceId));
    },
    updateSource: function(sourceId, updateData) {
        if (!this.db) return Promise.resolve();
        const tx = this.db.transaction('projectSources', 'readwrite');
        const store = tx.objectStore('projectSources');
        return this._promisify(store.get(sourceId)).then(source => {
            if (!source) return;
            Object.assign(source, updateData);
            return this._promisify(store.put(source));
        });
    },
    deleteMapSources: async function(mapId) {
        if (!this.db) return;
        const tx = this.db.transaction('projectSources', 'readwrite');
        const store = tx.objectStore('projectSources');
        const keys = await this._promisify(store.index('mapId').getAllKeys(mapId));
        await Promise.all(keys.map(key => this._promisify(store.delete(key))));
    },
    /**
     * Saves a single chat message associated with a map ID and optional node ID.
     * @param {string} mapId - The ID of the map.
     * @param {object} messageObject - The message object to save (e.g., { role, content }).
     * @param {string|null} nodeId - The ID of the node this message belongs to.
     * @returns {Promise<IDBValidKey>}
     */
    saveMessage: function(mapId, messageObject, nodeId = null) {
        if (!mapId || !this.db) return Promise.resolve();
        const tx = this.db.transaction('chatMessages', 'readwrite');
        // IndexedDB keys cannot be null, use empty string for global messages
        const safeNodeId = nodeId === null ? "" : nodeId;
        return this._promisify(tx.objectStore('chatMessages').add({ mapId, nodeId: safeNodeId, ...messageObject, timestamp: new Date() }));
    },
    /**
     * Retrieves all chat messages for a given map ID and optional node ID.
     * @param {string} mapId - The ID of the map.
     * @param {string|null} nodeId - The ID of the node to filter by.
     * @returns {Promise<object[]>}
     */
    getMapMessages: function(mapId, nodeId = null) {
        if (!mapId || !this.db) return Promise.resolve([]);
        const tx = this.db.transaction('chatMessages', 'readonly');
        const store = tx.objectStore('chatMessages');
        
        // Use the compound index for efficient filtering
        const index = store.index('map_node');
        const safeNodeId = nodeId === null ? "" : nodeId;
        return this._promisify(index.getAll(IDBKeyRange.only([mapId, safeNodeId])));
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
        } catch (e) {
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
        const { nodes, links, nodeCounter, currentLayout, currentLinkStyle } = getGraphState();
        const activeStep = document.querySelector('.step-indicator.active');
        const researchStep = activeStep ? parseInt(activeStep.dataset.step) : 1;
        return {
            nodes: nodes.map(n => ({ 
                id: n.id, 
                label: n.label, 
                x: n.x, 
                y: n.y, 
                fx: n.fx, 
                fy: n.fy, 
                shape: n.shape, 
                color: n.color, 
                details: n.details || '',
                notecard: n.notecard || {}
            })),
            links: links.map(l => ({ 
                source: l.source.id, 
                target: l.target.id, 
                label: l.label,
                color: l.color,
                dashed: l.dashed
            })),
            counter: nodeCounter,
            layout: currentLayout,
            linkStyle: currentLinkStyle,
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
        await dbManager.deleteMapSources(mapId);
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
        } catch (e) {
            return {};
        }
    },
    saveAllCustom: (templates) => {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    },
    save: (name, graphData) => {
        if (!graphData || !graphData.nodes) {
            toast("Error: Cannot save empty template.");
            return;
        }
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

        const newLinks = (graphData.links || []).map(l => ({
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