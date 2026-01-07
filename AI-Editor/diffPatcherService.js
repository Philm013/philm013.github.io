// --- START OF FILE diffPatcherService.js ---
export const DiffPatcherService = (() => {
    let dmpInstance = null;

    const getDmpInstance = () => {
        if (!dmpInstance) {
            if (typeof diff_match_patch === 'undefined') {
                console.error("[DiffPatcherService] diff_match_patch library not available globally.");
                return null;
            }
            dmpInstance = new diff_match_patch();
            // Adjust DMP settings if needed for better patch application
            // dmpInstance.Match_Threshold = 0.5; // Default is 0.5
            // dmpInstance.Match_Distance = 1000; // Default is 1000
            // dmpInstance.Patch_DeleteThreshold = 0.5; // Default is 0.5 (how closely deleted text must match)
        }
        return dmpInstance;
    };

    /**
     * Locates a chunk in text using before/after context strings and approximate line numbers.
     * The context strings MUST be exact matches, including newlines.
     * @param {string} fullText The full text to search within (should be newline-normalized to '\n').
     * @param {string} contextBefore The exact string expected before the chunk (newline-normalized).
     * @param {string} contextAfter The exact string expected after the chunk (newline-normalized).
     * @param {number} approxStartLine 1-based approximate start line for search hint (currently primarily for logging).
     * @param {number} approxEndLine 1-based approximate end line for search hint (currently primarily for logging).
     * @returns {{charStartIndex: number, charEndIndex: number, originalChunkText: string} | null}
     *          charStartIndex: character index in fullText where the chunk begins (after contextBefore).
     *          charEndIndex: character index in fullText where the chunk ends (before contextAfter).
     *          originalChunkText: the text of the located chunk.
     */
    const locateChunkByContext = (fullText, contextBefore, contextAfter, approxStartLine, approxEndLine) => {
        if (typeof fullText !== 'string' || typeof contextBefore !== 'string' || typeof contextAfter !== 'string') {
            console.error("[DiffPatcherService.locateChunkByContext] Invalid input types. fullText, contextBefore, and contextAfter must be strings.");
            return null;
        }
        // Special case: If adding to an empty file, contextBefore and contextAfter might be empty.
        // And the chunk is the whole file.
        if (contextBefore === "" && contextAfter === "" && fullText === "") {
            return {
                charStartIndex: 0,
                charEndIndex: 0, // End index is also 0 for an empty chunk in an empty file
                originalChunkText: ""
            };
        }
        
        // For non-empty files or contexts:
        if (contextBefore === "" && contextAfter === "") {
            // This case is ambiguous if fullText is not empty.
            // It implies the entire document is the chunk, which applyChangesViaFullContentDiff handles better.
            // However, if AI is forced to use this for full replacement of non-empty file:
            if (fullText !== "") {
                 console.warn("[DiffPatcherService.locateChunkByContext] Both context_before and context_after are empty for a non-empty file. Assuming entire file is the chunk.");
                 return {
                     charStartIndex: 0,
                     charEndIndex: fullText.length,
                     originalChunkText: fullText
                 };
            }
            // If fullText is also empty, already handled above.
        }


        let searchStartIndex = 0;
        // Find the end of context_before_chunk
        const chunkStartIndex = fullText.indexOf(contextBefore, searchStartIndex);
        if (chunkStartIndex === -1) {
            console.warn(`[DiffPatcherService.locateChunkByContext] context_before_chunk not found. Approx lines: ${approxStartLine}-${approxEndLine}. Context (first 50 chars): "${contextBefore.substring(0, 50)}..."`);
            return null;
        }
        const actualChunkCharStartIndex = chunkStartIndex + contextBefore.length;

        // Find the start of context_after_chunk, searching *after* where context_before_chunk ended
        const chunkEndIndex = fullText.indexOf(contextAfter, actualChunkCharStartIndex);
        if (chunkEndIndex === -1) {
            console.warn(`[DiffPatcherService.locateChunkByContext] context_after_chunk not found after context_before_chunk. Approx lines: ${approxStartLine}-${approxEndLine}. Context (first 50 chars): "${contextAfter.substring(0, 50)}..."`);
            return null;
        }
        // The located original chunk is the text between the end of contextBefore and the start of contextAfter
        const locatedOriginalChunkText = fullText.substring(actualChunkCharStartIndex, chunkEndIndex);

        return {
            charStartIndex: actualChunkCharStartIndex,
            charEndIndex: chunkEndIndex,
            originalChunkText: locatedOriginalChunkText
        };
    };


    /**
     * Applies changes to a specific chunk of content.
     * Locates the original chunk using context, diffs it with the new chunk content,
     * applies the resulting patch, and reconstructs the full document.
     * @param {string} originalFullFileContent The entire original content of the file.
     * @param {object} chunkUpdateDetails Details from the AI.
     * @param {number} chunkUpdateDetails.original_start_line Approximate start line.
     * @param {number} chunkUpdateDetails.original_end_line Approximate end line.
     * @param {string} chunkUpdateDetails.context_before_chunk Context string before.
     * @param {string} chunkUpdateDetails.context_after_chunk Context string after.
     * @param {string} chunkUpdateDetails.new_chunk_content New content for the chunk.
     * @param {string} fileNameForLogging Optional filename for logging.
     * @returns {{ success: boolean, newContent?: string, error?: string, message?: string }}
     */
    const applyChunkUpdate = (originalFullFileContent, chunkUpdateDetails, fileNameForLogging = "file") => {
        const dmp = getDmpInstance();
        if (!dmp) {
            return { success: false, error: "Diff library (diff_match_patch) is not available." };
        }

        const {
            original_start_line, original_end_line,
            context_before_chunk, context_after_chunk, new_chunk_content
        } = chunkUpdateDetails;

        // Basic validation of required parameters
        if (context_before_chunk === undefined || context_after_chunk === undefined) {
             return { success: false, error: `Missing context_before_chunk or context_after_chunk for "${fileNameForLogging}". These are required.`};
        }
        if (typeof new_chunk_content !== 'string') {
            return { success: false, error: `new_chunk_content for "${fileNameForLogging}" is not a string.`};
        }

        // Normalize all relevant text inputs (content and context strings)
        const normalizedOriginalFullContent = String(originalFullFileContent || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const normalizedContextBefore = String(context_before_chunk).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const normalizedContextAfter = String(context_after_chunk).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const normalizedNewChunkContent = String(new_chunk_content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // 1. Locate the original chunk using context
        const located = locateChunkByContext(
            normalizedOriginalFullContent,
            normalizedContextBefore,
            normalizedContextAfter,
            original_start_line,
            original_end_line
        );

        if (!located) {
            let errorMsg = `Could not locate the specified chunk in "${fileNameForLogging}" using the provided context.`;
            errorMsg += `\nContext Before (first 50): "${normalizedContextBefore.substring(0,50)}..."`;
            errorMsg += `\nContext After (first 50): "${normalizedContextAfter.substring(0,50)}..."`;
            errorMsg += `\n(Ensure context strings are exact, include newlines correctly, and uniquely bracket the target chunk).`;
            console.error("[DiffPatcherService.applyChunkUpdate] Chunk location failed. Full original content (first 500 chars):\n", normalizedOriginalFullContent.substring(0,500));
            return { success: false, error: errorMsg };
        }

        const { charStartIndex: chunkCharStartIndex, charEndIndex: chunkCharEndIndex, originalChunkText: locatedOriginalChunkText } = located;

        if (locatedOriginalChunkText === normalizedNewChunkContent) {
            return { success: true, newContent: normalizedOriginalFullContent, message: "Chunk content is identical; no changes applied." };
        }

        // 2. Diff the located original chunk against the AI's new chunk content
        const diffs = dmp.diff_main(locatedOriginalChunkText, normalizedNewChunkContent);
        dmp.diff_cleanupSemantic(diffs); // Optional: make diffs more human-readable

        // 3. Create patch objects from these diffs (for the chunk only)
        const patches = dmp.patch_make(locatedOriginalChunkText, diffs);

        if (!patches || patches.length === 0) {
            // This can happen if diff_main found no differences after cleanup.
             console.warn(`[DiffPatcherService.applyChunkUpdate] No patches generated for chunk in "${fileNameForLogging}", though content was initially different. This might mean the new chunk content is effectively the same as the old chunk after normalization/cleanup by DMP. Applying the new chunk content directly as a fallback.`);
            // Fallback: if no patches but text differs, directly use the new chunk content.
            // This handles cases where DMP might not generate a patch for subtle (but actual) differences
            // or if new_chunk_content is a full replacement for an empty original_chunk.
             const textBeforeChunk = normalizedOriginalFullContent.substring(0, chunkCharStartIndex);
             const textAfterChunk = normalizedOriginalFullContent.substring(chunkCharEndIndex);
             const finalNewContentDirect = textBeforeChunk + normalizedNewChunkContent + textAfterChunk;
             return { success: true, newContent: finalNewContentDirect, message: `Chunk in "${fileNameForLogging}" updated (no explicit patch needed, direct replacement).` };
        }

        // 4. Apply the generated patches to the located original chunk text
        const [patchedChunkText, resultsArray] = dmp.patch_apply(patches, locatedOriginalChunkText);
        const allPatchesApplied = resultsArray.every(result => result === true);

        if (!allPatchesApplied) {
            const failedHunksIndices = resultsArray.reduce((acc, val, idx) => {
                if (!val) acc.push(idx + 1);
                return acc;
            }, []);
            const failedHunksString = failedHunksIndices.join(', ');
            console.error(`[DiffPatcherService.applyChunkUpdate] DMP failed to apply one or more generated patch hunks WITHIN THE CHUNK for "${fileNameForLogging}". Failed hunk(s): ${failedHunksString}.`);
            console.error("[DiffPatcherService.applyChunkUpdate] Located Original Chunk Text (first 300 chars):\n", locatedOriginalChunkText.substring(0,300));
            console.error("[DiffPatcherService.applyChunkUpdate] AI's New Chunk Content (first 300 chars):\n", normalizedNewChunkContent.substring(0,300));
            console.error("[DiffPatcherService.applyChunkUpdate] Patches that failed (text format):\n", dmp.patch_toText(patches));
            return { success: false, error: `Failed to apply changes within the identified chunk of "${fileNameForLogging}". Some changes (hunk(s): ${failedHunksString}) could not be applied. Original chunk may have diverged too much from AI's expectation.` };
        }

        // 5. Reconstruct the full document content
        const textBeforeChunk = normalizedOriginalFullContent.substring(0, chunkCharStartIndex);
        const textAfterChunk = normalizedOriginalFullContent.substring(chunkCharEndIndex);

        const finalNewContent = textBeforeChunk + patchedChunkText + textAfterChunk;

        return { success: true, newContent: finalNewContent, message: `Chunk update applied successfully to "${fileNameForLogging}".` };
    };

    /**
     * Applies changes by diffing old content against the new full content,
     * creating patches, and then applying those patches. (Kept as a general utility)
     * @param {string} originalOldContent The original content of the file.
     * @param {string} newFullContent The complete, new proposed content for the file.
     * @param {string} fileNameForLogging (Optional) Filename for logging.
     * @returns {{ success: boolean, newContent?: string, error?: string, message?: string }}
     */
    const applyChangesViaFullContentDiff = (originalOldContent, newFullContent, fileNameForLogging = "file") => {
        const dmp = getDmpInstance();
        if (!dmp) {
            return { success: false, error: "Diff library (diff_match_patch) is not available." };
        }

        try {
            const normalizedOldContent = String(originalOldContent || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const normalizedNewFullContent = String(newFullContent || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            if (normalizedOldContent === normalizedNewFullContent) {
                return { success: true, newContent: normalizedOldContent, message: "No changes detected; content is identical." };
            }

            const diffs = dmp.diff_main(normalizedOldContent, normalizedNewFullContent);
            dmp.diff_cleanupSemantic(diffs);
            const patches = dmp.patch_make(normalizedOldContent, diffs);

            if (!patches || patches.length === 0) {
                console.warn(`[DiffPatcherService.applyChangesViaFullContentDiff] No patches generated for "${fileNameForLogging}", though content was initially different or diffs were empty. Assuming no effective change needed or content became identical after normalization/cleanup.`);
                return { success: true, newContent: normalizedNewFullContent, message: "No effective patches generated from full content diff, content may be effectively the same or already matches target." };
            }

            const [patchedText, resultsArray] = dmp.patch_apply(patches, normalizedOldContent);
            const allPatchesApplied = resultsArray.every(result => result === true);

            if (!allPatchesApplied) {
                const failedHunksIndices = resultsArray.reduce((acc, val, idx) => {
                    if (!val) acc.push(idx + 1);
                    return acc;
                }, []);
                const failedHunksString = failedHunksIndices.join(', ');
                console.error(`[DiffPatcherService.applyChangesViaFullContentDiff] DMP failed to apply one or more generated patch hunks for "${fileNameForLogging}". Failed hunk(s): ${failedHunksString}.`);
                return { success: false, error: `Failed to apply internally generated patch for "${fileNameForLogging}" (from full content diff). Some changes (hunk(s): ${failedHunksString}) could not be applied.` };
            }

            if (patchedText !== normalizedNewFullContent) {
                console.warn(`[DiffPatcherService.applyChangesViaFullContentDiff] Patched text for "${fileNameForLogging}" differs from the AI's proposed new full content after patch_apply. This may indicate fuzzy patching occurred due to slight content drift. Using the result of patch_apply.`);
            }
            return { success: true, newContent: patchedText, message: `Changes applied successfully to "${fileNameForLogging}" by diffing full content.` };

        } catch (error) {
            console.error(`[DiffPatcherService.applyChangesViaFullContentDiff] Exception during full content diff and patch application for "${fileNameForLogging}":`, error.message, error.stack, error);
            console.error("[DiffPatcherService] Inputs - Original Old Content (first 500 chars):\n", String(originalOldContent || '').substring(0, 500));
            console.error("[DiffPatcherService] Inputs - New Full Content (first 500 chars):\n", String(newFullContent || '').substring(0, 500));
            return {
                success: false,
                error: `Error applying changes for "${fileNameForLogging}" via full content diff: ${error.message || 'An unspecified error occurred in the diff library.'}.`
            };
        }
    };

    return {
        applyChunkUpdate,  // The new primary method for AI-driven chunk modifications
        applyChanges: applyChangesViaFullContentDiff, // Keep this alias for the full content diff utility
    };
})();
// --- END OF FILE DiffPatcherService.js ---