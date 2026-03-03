/**
 * LiveDeck - Assets Service
 * 
 * Handles image uploads (base64), stock photo search (Unsplash/Pexels), 
 * and Iconify integration.
 */

const assets = {
    keys: {
        unsplash: '',
        pexels: ''
    },

    async init() {
        // Load keys from storage if available
        const saved = await db.getSetting('LiveDeck_AssetKeys');
        if (saved) this.keys = saved;
    },

    async saveKeys(keys) {
        this.keys = { ...this.keys, ...keys };
        await db.saveSetting('LiveDeck_AssetKeys', this.keys);
    },

    /**
     * Converts a File object to a base64 string.
     * @param {File} file 
     * @returns {Promise<string>}
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    /**
     * Search Unsplash for photos
     */
    async searchUnsplash(query, page = 1) {
        if (!this.keys.unsplash) throw new Error('Unsplash API key missing');
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=20&client_id=${this.keys.unsplash}`;
        const resp = await fetch(url);
        const data = await resp.json();
        return data.results.map(img => ({
            id: img.id,
            thumb: img.urls.small,
            full: img.urls.regular,
            author: img.user.name,
            provider: 'unsplash'
        }));
    },

    /**
     * Search Pexels for photos
     */
    async searchPexels(query, page = 1) {
        if (!this.keys.pexels) throw new Error('Pexels API key missing');
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
        const resp = await fetch(url, { headers: { 'Authorization': this.keys.pexels } });
        const data = await resp.json();
        return data.photos.map(img => ({
            id: img.id,
            thumb: img.src.medium,
            full: img.src.large,
            author: img.photographer,
            provider: 'pexels'
        }));
    },

    /**
     * Search Iconify
     */
    async searchIcons(query) {
        const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=64`;
        const resp = await fetch(url);
        const data = await resp.json();
        return data.icons.map(icon => ({
            id: icon,
            name: icon.split(':')[1] || icon,
            prefix: icon.split(':')[0],
            fullName: icon
        }));
    }
};
