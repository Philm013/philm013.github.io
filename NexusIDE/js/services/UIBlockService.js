/**
 * @file UIBlockService.js
 * @description Manages a library of reusable UI components (blocks), both built-in and user-defined.
 */

/**
 * Service for retrieving and saving code snippets representing UI components.
 * Persists user blocks to 'user_ui_blocks.json' within the project VFS.
 */
export class UIBlockService {
    /**
     * Creates a new UIBlockService instance.
     * @param {FileSystem} fileSystem - The project VFS.
     */
    constructor(fileSystem) {
        this.fs = fileSystem;
        /** @type {string} */
        this.blocksPath = 'user_ui_blocks.json';
        /** @type {Array<Object>} Default built-in UI components. */
        this.defaultBlocks = [
            { 
                name: 'Navbar', 
                code: `<nav class="bg-white shadow p-4 flex justify-between">
    <div class="font-bold text-indigo-600">Logo</div>
    <div class="flex gap-4">
        <a href="#" class="text-slate-600 hover:text-indigo-600">Home</a>
        <a href="#" class="text-slate-600 hover:text-indigo-600">About</a>
    </div>
</nav>` 
            },
            { 
                name: 'Hero Section', 
                code: `<section class="py-20 text-center bg-slate-50 border-b">
    <h1 class="text-5xl font-bold mb-4">Big Idea</h1>
    <p class="text-xl text-slate-500 mb-8">Value proposition description goes here.</p>
    <button class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
        Get Started
    </button>
</section>` 
            },
            { 
                name: 'Feature Grid', 
                code: `<section class="py-16 grid grid-cols-1 md:grid-cols-3 gap-8 px-6">
    <div class="p-6 border rounded-2xl hover:border-indigo-500 transition">
        <h3 class="font-bold mb-2">Feature 1</h3>
        <p class="text-slate-500 text-sm">Detail about this feature and why it matters.</p>
    </div>
    <div class="p-6 border rounded-2xl hover:border-indigo-500 transition">
        <h3 class="font-bold mb-2">Feature 2</h3>
        <p class="text-slate-500 text-sm">Detail about this feature and why it matters.</p>
    </div>
    <div class="p-6 border rounded-2xl hover:border-indigo-500 transition">
        <h3 class="font-bold mb-2">Feature 3</h3>
        <p class="text-slate-500 text-sm">Detail about this feature and why it matters.</p>
    </div>
</section>` 
            }
        ];
    }

    /**
     * Retrieves the combined list of built-in and user-saved UI blocks.
     * @returns {Promise<Array<Object>>}
     */
    async getBlocks() {
        try {
            const userBlocksStr = await this.fs.readFile(this.blocksPath);
            const userBlocks = userBlocksStr ? JSON.parse(userBlocksStr) : [];
            return [...this.defaultBlocks, ...userBlocks];
        } catch (e) {
            console.error('Error loading blocks:', e);
            return this.defaultBlocks;
        }
    }

    /**
     * Saves a new UI block to the project's library.
     * @param {string} name - Display name for the block.
     * @param {string} code - The HTML/Tailwind code for the block.
     * @returns {Promise<boolean>} Success status.
     */
    async saveBlock(name, code) {
        try {
            const userBlocksStr = await this.fs.readFile(this.blocksPath);
            const userBlocks = userBlocksStr ? JSON.parse(userBlocksStr) : [];
            userBlocks.push({ name, code, id: Date.now() });
            await this.fs.writeFile(this.blocksPath, JSON.stringify(userBlocks, null, 4));
            return true;
        } catch (e) {
            console.error('Error saving block:', e);
            return false;
        }
    }
}
