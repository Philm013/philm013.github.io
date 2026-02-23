/**
 * @file PatcherService.js
 * @description Provides intelligent file patching capabilities using fuzzy matching to apply code changes accurately even when line numbers shift.
 */

/* global diff_match_patch */

/**
 * Service for applying surgical updates to file content.
 * Wraps the Google diff-match-patch library.
 */
export class PatcherService {
    /**
     * Creates a new PatcherService instance.
     */
    constructor() {
        /** @type {diff_match_patch} */
        this.dmp = new diff_match_patch();
    }

    /**
     * Attempts to replace a block of code within a string using exact or fuzzy matching.
     * 
     * @param {string} fileContent - The current content of the file.
     * @param {string} searchBlock - The snippet of code to look for.
     * @param {string} replaceBlock - The new snippet to insert.
     * @returns {Object} Result object { success: boolean, content?: string, method?: string, error?: string }.
     */
    applyPatch(fileContent, searchBlock, replaceBlock) {
        // 1. Exact Match
        if (fileContent.includes(searchBlock)) {
            return {
                success: true,
                content: fileContent.replace(searchBlock, replaceBlock),
                method: 'exact'
            };
        }

        // 2. Fuzzy Match using DMP
        // We use patch_make and patch_apply to perform a fuzzy replacement
        try {
            const patches = this.dmp.patch_make(fileContent, searchBlock, replaceBlock);
            const [newContent, results] = this.dmp.patch_apply(patches, fileContent);
            
            if (results.every(r => r === true)) {
                return {
                    success: true,
                    content: newContent,
                    method: 'fuzzy'
                };
            }
        } catch (e) {
            console.error("DMP Patching failed:", e);
        }

        return { success: false, error: 'Could not locate search block with enough confidence.' };
    }
}
