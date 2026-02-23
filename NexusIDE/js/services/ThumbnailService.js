/**
 * @file ThumbnailService.js
 * @description Manages the generation, storage, and retrieval of file preview thumbnails using the VisualEngine.
 */

import { VisualEngine } from './VisualEngine.js';

/**
 * Service for project visualization and background rendering of file previews.
 */
export class ThumbnailService {
    /**
     * Creates a new ThumbnailService instance.
     * @param {FileSystem} fileSystem - The project VFS.
     */
    constructor(fileSystem) {
        this.fs = fileSystem;
    }

    /**
     * Generates a thumbnail Data URL for raw HTML content.
     * @param {string} htmlContent - The code to render.
     * @returns {Promise<string|null>} The generated thumbnail image as a Data URL.
     */
    async generate(htmlContent) {
        return await VisualEngine.renderHTML(htmlContent);
    }

    /**
     * Saves a thumbnail Data URL to a hidden .meta file associated with the given path.
     * @param {string} path - The original file path (e.g., 'index.html').
     * @param {string} dataUrl - The thumbnail image data.
     * @returns {Promise<void>}
     */
    async saveThumbnail(path, dataUrl) {
        if (!dataUrl) return;
        const metaPath = path + '.meta';
        const meta = { thumbnail: dataUrl, timestamp: Date.now() };
        await this.fs.writeFile(metaPath, JSON.stringify(meta));
    }
    
    /**
     * Retrieves a stored thumbnail for a given file path.
     * @param {string} path - The original file path.
     * @returns {Promise<string|null>} The thumbnail Data URL, or null if not found.
     */
    async getThumbnail(path) {
        try {
            const metaStr = await this.fs.readFile(path + '.meta');
            if (metaStr) {
                const meta = JSON.parse(metaStr);
                return meta.thumbnail;
            }
        } catch (err) {
            console.error('Failed to read thumbnail meta:', err);
        }
        return null;
    }
}
