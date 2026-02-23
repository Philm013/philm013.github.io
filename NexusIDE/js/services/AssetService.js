/**
 * @file AssetService.js
 * @description Service for managing external and built-in assets, including Unsplash, Pexels, Iconify, and Emojis.
 */

import { builtinIcons, emojiCategories } from './AssetData.js';

/**
 * Handles asset searching, retrieval, and base64 encoding for portability.
 */
export class AssetService {
    /**
     * Creates a new AssetService instance.
     */
    constructor() {
        /** @type {string} */
        this.unsplashKey = localStorage.getItem('nexus_unsplash_key') || '';
        /** @type {string} */
        this.pexelsKey = localStorage.getItem('nexus_pexels_key') || '';
        /** @type {boolean} True if a remote image is currently being encoded to base64. */
        this.isEncoding = false;
        this.builtinIcons = builtinIcons;
        this.emojiCategories = emojiCategories;
        /** @type {Map<string, HTMLImageElement>} Cache for generated icon images to speed up canvas rendering. */
        this.imageCache = new Map();
    }

    /**
     * Sets and persists the Unsplash API key.
     * @param {string} key 
     */
    setUnsplashKey(key) {
        this.unsplashKey = key;
        localStorage.setItem('nexus_unsplash_key', key);
    }

    /**
     * Sets and persists the Pexels API key.
     * @param {string} key 
     */
    setPexelsKey(key) {
        this.pexelsKey = key;
        localStorage.setItem('nexus_pexels_key', key);
    }

    /**
     * Searches Unsplash for photos.
     * @param {string} query - The search term.
     * @param {number} [page=1] - The page number.
     * @returns {Promise<Array<{id: string, thumb: string, full: string, alt: string, author: string, provider: string}>>}
     */
    async searchUnsplash(query, page = 1) {
        if (!this.unsplashKey) throw new Error('Unsplash API Key missing.');
        
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=20&client_id=${this.unsplashKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Unsplash API limit reached or invalid key.');
        const data = await response.json();
        
        return data.results.map(img => ({
            id: img.id,
            thumb: img.urls.small,
            full: img.urls.regular,
            alt: img.alt_description || 'Stock photo',
            author: img.user.name,
            provider: 'unsplash'
        }));
    }

    /**
     * Searches Pexels for photos.
     * @param {string} query - The search term.
     * @param {number} [page=1] - The page number.
     * @returns {Promise<Array<{id: number, thumb: string, full: string, alt: string, author: string, provider: string}>>}
     */
    async searchPexels(query, page = 1) {
        if (!this.pexelsKey) throw new Error('Pexels API Key missing.');
        
        let url = `https://api.pexels.com/v1/curated?page=${page}&per_page=20`;
        if (query) {
            url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': this.pexelsKey }
        });
        if (!response.ok) throw new Error('Pexels API limit reached or invalid key.');
        const data = await response.json();
        
        return data.photos.map(photo => ({
            id: photo.id,
            thumb: photo.src.medium,
            full: photo.src.large,
            alt: photo.alt || 'Pexels photo',
            author: photo.photographer || 'Unknown',
            provider: 'pexels'
        }));
    }

    /**
     * Gets a list of curated images from Lorem Picsum.
     * @param {number} [page=1] - The page number.
     * @returns {Promise<Array>}
     */
    async getPicsum(page = 1) {
        const images = [];
        for (let i = 0; i < 20; i++) {
            const id = (page - 1) * 20 + i + 10;
            images.push({
                id: id,
                thumb: `https://picsum.photos/id/${id}/400/300`,
                full: `https://picsum.photos/id/${id}/1200/800`,
                alt: `Photo ${id}`,
                author: 'Lorem Picsum',
                provider: 'picsum'
            });
        }
        return images;
    }

    /**
     * Converts a remote image to a Base64 Data URL.
     * This ensures the image is "embedded" in the project for serverless portability.
     * 
     * @param {string} imageUrl - The URL of the image to fetch and encode.
     * @returns {Promise<string>} The Base64 data URL.
     */
    async getBase64(imageUrl) {
        this.isEncoding = true;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    this.isEncoding = false;
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            this.isEncoding = false;
            console.error('Base64 Conversion failed:', e);
            throw new Error('CORS restriction or network error during Base64 conversion.', { cause: e });
        }
    }

    /**
     * Searches for icons via the Iconify API.
     * @param {string} query - The search term.
     * @param {string} [prefix=''] - Optional collection prefix (e.g., 'mdi').
     * @returns {Promise<Array>}
     */
    async searchIcons(query, prefix = '') {
        try {
            let url;
            if (query) {
                url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=60`;
                if (prefix) url += `&prefix=${prefix}`;
            } else {
                const set = prefix || 'mdi';
                url = `https://api.iconify.design/collection?prefix=${set}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (query) {
                return data.icons ? data.icons.map(icon => ({
                    name: icon.split(':')[1] || icon,
                    prefix: icon.split(':')[0],
                    fullName: icon,
                    type: 'iconify'
                })) : [];
            } else {
                const iconNames = data.uncategorized || Object.values(data.categories || {}).flat().slice(0, 100);
                return iconNames.map(name => ({
                    name: name,
                    prefix: prefix || 'mdi',
                    fullName: `${prefix || 'mdi'}:${name}`,
                    type: 'iconify'
                }));
            }
        } catch (e) {
            console.error('Iconify API error:', e);
            return [];
        }
    }

    /**
     * Loads an icon data object into an HTMLImageElement for canvas rendering.
     * Caches results.
     * 
     * @param {Object} icon - Icon data (builtin or iconify).
     * @param {string} [color='#6366f1'] - Color for the icon.
     * @returns {Promise<HTMLImageElement|null>}
     */
    async getIconImage(icon, color = '#6366f1') {
        const colorHex = color.replace('#', '');
        const cacheKey = icon.type === 'iconify' 
            ? `iconify_${icon.fullName}_${colorHex}`
            : `builtin_${icon.name}_${colorHex}`;
        
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }
        
        return new Promise((resolve) => {
            const img = new Image();
            
            if (icon.type === 'iconify') {
                img.crossOrigin = 'anonymous';
                img.src = `https://api.iconify.design/${icon.fullName}.svg?color=%23${colorHex}`;
            } else {
                // Ensure builtin SVGs have xmlns and dimensions for better canvas compatibility
                let svgContent = icon.svg;
                if (!svgContent.startsWith('<svg')) {
                    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgContent}</svg>`;
                } else {
                    if (!svgContent.includes('xmlns=')) {
                        svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                    if (!svgContent.includes('width=')) {
                        svgContent = svgContent.replace('<svg', '<svg width="24" height="24"');
                    }
                }
                const finalSvg = svgContent
                    .replace(/stroke="currentColor"/g, `stroke="${color}"`)
                    .replace(/fill="currentColor"/g, `fill="${color}"`);
                
                // Using Blob for better reliability with SVGs in Image objects
                const blob = new Blob([finalSvg], { type: 'image/svg+xml' });
                img.src = URL.createObjectURL(blob);
            }
            
            img.onload = () => {
                this.imageCache.set(cacheKey, img);
                resolve(img);
            };
            
            img.onerror = (err) => {
                console.error("Failed to load icon image:", icon.name || icon.fullName, err);
                resolve(null);
            };
        });
    }
}
