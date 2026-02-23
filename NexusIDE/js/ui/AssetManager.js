export class AssetManager {
    constructor() {
        this.container = document.getElementById('assets-grid');
        this.input = document.getElementById('asset-search');
        this.typeSelect = document.getElementById('asset-type');
        this.setup();
    }

    setup() {
        this.input.addEventListener('change', () => this.search());
        this.typeSelect.addEventListener('change', () => this.search());
    }

    async search() {
        const query = this.input.value;
        const type = this.typeSelect.value;
        this.container.innerHTML = '<div class="loading-spinner">Searching...</div>';

        if (type === 'icon') {
            await this.searchIcons(query);
        } else {
            await this.searchImages(query);
        }
    }

    async searchIcons(query) {
        try {
            const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=20`);
            const data = await res.json();
            this.renderIcons(data.icons);
        } catch (err) {
            console.error('Search icons failed:', err);
            this.container.innerHTML = 'Error searching icons';
        }
    }

    async searchImages() {
        // Requires Key, or use Lorem Picsum for demo
        // For this demo, let's use Picsum to avoid key requirement friction, 
        // but structured to support Unsplash if key is present (simulated)
        const images = [];
        for (let i = 0; i < 10; i++) {
            const id = Math.floor(Math.random() * 1000);
            images.push({
                thumb: `https://picsum.photos/id/${id}/200/200`,
                full: `https://picsum.photos/id/${id}/800/600`
            });
        }
        this.renderImages(images);
    }

    renderIcons(icons) {
        this.container.innerHTML = '';
        icons.forEach(icon => {
            const div = document.createElement('div');
            div.className = 'asset-item';
            div.innerHTML = `<img src="https://api.iconify.design/${icon}.svg" />`;
            div.onclick = () => this.insertCode(`<i class="iconify" data-icon="${icon}"></i>`);
            this.container.appendChild(div);
        });
    }

    renderImages(images) {
        this.container.innerHTML = '';
        images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'asset-item';
            div.innerHTML = `<img src="${img.thumb}" />`;
            div.onclick = () => this.insertCode(`<img src="${img.full}" alt="Stock Photo" />`);
            this.container.appendChild(div);
        });
    }

    insertCode(code) {
        // Dispatch event or use global editor instance (for simplicity here, we assume global 'editor' access or event bus)
        // In a real module system, we'd emit an event.
        // For now, let's just log it or try to find the editor if available globally
        console.log('Insert:', code);
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('insert-code', { detail: code }));
    }
}
