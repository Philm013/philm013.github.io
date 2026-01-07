// --- START OF FILE codeAnalysisService.js ---
import { CustomEditorService } from './editorService.js'; // To get full file content if needed

export const CodeAnalysisService = (() => {
    const symbolRegexPatterns = {
        javascript: [
            // Function declarations: function foo(...), const foo = function(...), let foo = () => ..., async function foo(...)
            { type: 'function', regex: /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/gm, nameIndex: 1, detailIndex: 2 },
            { type: 'function', regex: /^(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function\s*\*?\s*\(([^)]*)\)/gm, nameIndex: 1, detailIndex: 2 },
            { type: 'function', regex: /^(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/gm, nameIndex: 1, detailIndex: 2 },
            // Class declarations: class Foo ..., export default class Foo ...
            { type: 'class', regex: /^(?:export\s+(?:default\s+)?)?class\s+([a-zA-Z0-9_$]+)\s*(?:extends\s+([a-zA-Z0-9_$.]+))?/gm, nameIndex: 1, detailIndex: 2 },
            // Variable/Constant declarations (top-level or exported, simple assignments)
            { type: 'variable', regex: /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*[^=]/gm, nameIndex: 1 },
            // Object properties that are functions (methods in object literals)
            { type: 'method', regex: /^\s*([a-zA-Z0-9_$]+)\s*:\s*(?:async\s*)?function\s*\*?\s*\(([^)]*)\)/gm, nameIndex: 1, detailIndex: 2 },
            { type: 'method', regex: /^\s*(?:async\s+)?\*?\s*([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{/gm, nameIndex: 1, detailIndex: 2 }, // Shorthand method syntax within objects/classes
        ],
        python: [
            // Function definitions: def foo(...):, async def foo(...):
            { type: 'function', regex: /^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/gm, nameIndex: 1, detailIndex: 2 },
            // Class definitions: class Foo(...):
            { type: 'class', regex: /^class\s+([a-zA-Z0-9_]+)(?:\(([^)]*)\))?:/gm, nameIndex: 1, detailIndex: 2 },
            // Top-level variable assignments (simple ones)
            { type: 'variable', regex: /^([a-zA-Z0-9_]+)\s*=[^=]/gm, nameIndex: 1 } // Avoid matching ==
        ],
        html: [
            // Tags with id: <div id="myId">
            { type: 'element_id', regex: /<([a-zA-Z0-9_-]+)\s+[^>]*?id=["']([^"'\s]+)["'][^>]*?>/g, nameIndex: 2, detailIndex: 1 },
            // Comment sections as notable landmarks (e.g., <!-- SECTION: Header -->)
            { type: 'comment_section', regex: /<!--\s*SECTION:\s*([^->\n]+)\s*-->/g, nameIndex: 1 }
        ],
        css: [
            // More specific and safer regexes for CSS rules:
            // Simple class, ID, element selectors (and common pseudo-classes/elements)
            { type: 'css_selector', regex: /^\s*([.#]?[a-zA-Z0-9_-]+(?:[:]{1,2}[a-zA-Z0-9_-]+(?:\([^)]+\))?)*)\s*\{/gm, nameIndex: 1 },
            // Attribute selectors (simplified to avoid excessive complexity in regex)
            { type: 'css_selector_attr', regex: /^\s*([a-zA-Z0-9_-]*\[[a-zA-Z0-9_:-]+(?:[~|^$*]?=["']?[^"']*["']?)?\])\s*\{/gm, nameIndex: 1 },
            // Combinators (descendant, child, sibling) - capture the primary selector part
            { type: 'css_selector_combinator', regex: /^\s*([.#]?[a-zA-Z0-9_-]+(?:[:]{1,2}[a-zA-Z0-9_-]+(?:\([^)]+\))?)*)\s*[,>\s+~]/gm, nameIndex: 1 },
            // CSS Custom Properties (Variables)
            { type: 'css_variable', regex: /^\s*(--[a-zA-Z0-9_-]+)\s*:/gm, nameIndex: 1 },
            // @ Rules (media, keyframes, font-face, etc.)
            // Made the content part non-greedy and more constrained to avoid over-matching on malformed inputs
            { type: 'at_rule', regex: /^(@(?:media|keyframes|font-face|supports|document|page|namespace|import|charset))\s*([^\{\n]*?)\s*\{?/gm, nameIndex:1, detailIndex: 2}
        ],
    };

    /**
     * Parses code content to extract basic symbols (functions, classes, etc.).
     * @param {string} fileId The ID of the file.
     * @param {string} content The code content.
     * @param {string} language The language of the code (e.g., 'javascript', 'python').
     * @returns {Array<{name: string, type: string, line: number, details?: string}>}
     */
    const parseCodeForSymbols = (fileId, content, language) => {
        if (!content || !language) return [];

        let langKey = language.toLowerCase();
        if (langKey.includes('/')) { 
            langKey = langKey.substring(langKey.lastIndexOf('/') + 1);
        }
        if (langKey === 'js') langKey = 'javascript'; 
        if (langKey === 'py') langKey = 'python';

        const langPatterns = symbolRegexPatterns[langKey];

        if (!langPatterns) {
            console.warn(`[CodeAnalysisService] No symbol patterns defined for language: ${language} (resolved to ${langKey})`);
            return [];
        }

        const symbols = [];
        const lines = content.split('\n');

        langPatterns.forEach(patternInfo => {
            // Create a new RegExp instance for each pattern to reset its lastIndex for global matches
            const regex = new RegExp(patternInfo.regex); 
            
            let match;
            // Defensive loop to prevent potential infinite loops with bad regexes on certain inputs,
            // though less likely with simplified patterns.
            let execCount = 0;
            const MAX_EXEC_COUNT_PER_PATTERN = content.length / 2 > 10000 ? 10000 : content.length / 2; // Heuristic limit

            try {
                while((match = regex.exec(content)) !== null) {
                    execCount++;
                    if (execCount > MAX_EXEC_COUNT_PER_PATTERN && MAX_EXEC_COUNT_PER_PATTERN > 0) { // Check MAX_EXEC_COUNT only if it's > 0
                        console.warn(`[CodeAnalysisService] Regex execution limit (${MAX_EXEC_COUNT_PER_PATTERN}) reached for pattern ${patternInfo.regex.source} on file ${fileId}. Aborting this pattern.`);
                        break; 
                    }

                    const symbolName = match[patternInfo.nameIndex || 1];
                    let symbolDetails = '';

                    if (patternInfo.detailIndex && match[patternInfo.detailIndex] !== undefined) {
                        symbolDetails = match[patternInfo.detailIndex].trim();
                    } else if (match[2] !== undefined) { 
                        symbolDetails = match[2].trim();
                    }

                    if (symbolName && symbolName.trim() !== '') { // Ensure symbol name is not empty
                        const matchStartIndex = match.index;
                        let currentPos = 0;
                        let lineNumber = 1;
                        for (let i = 0; i < lines.length; i++) {
                            if (matchStartIndex >= currentPos && matchStartIndex < currentPos + lines[i].length + 1) {
                                lineNumber = i + 1;
                                break;
                            }
                            currentPos += lines[i].length + 1; 
                        }

                        symbols.push({
                            name: symbolName.trim(),
                            type: patternInfo.type,
                            line: lineNumber, 
                            details: symbolDetails || undefined,
                        });
                    }
                    if (!regex.global) break;
                }
            } catch (regexError) {
                console.error(`[CodeAnalysisService] Error during regex execution for pattern ${patternInfo.regex.source} on file ${fileId}:`, regexError);
                // Continue to next pattern
            }
        });

        const sortedSymbols = symbols.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name) || a.type.localeCompare(b.type));
        const uniqueSymbols = [];
        const seen = new Set();
        for (const symbol of sortedSymbols) {
            const key = `${symbol.line}-${symbol.type}-${symbol.name}`; 
            if (!seen.has(key)) {
                uniqueSymbols.push(symbol);
                seen.add(key);
            }
        }
        return uniqueSymbols;
    };

    /**
     * Gets the definition (code content) of a specific symbol from a file.
     * Returns a snippet of lines around the symbol's declared line.
     * @param {string} fileId The ID of the file.
     * @param {string} symbolName The name of the symbol.
     * @param {number} symbolLine The 1-based line number where the symbol is declared.
     * @param {string} language The language of the file.
     * @returns {string} The code snippet for the symbol's definition or an error string.
     */
    const getSymbolDefinition = (fileId, symbolName, symbolLine, language) => {
        let startContext = 0; 
        let endContext = 5;   

        let langKey = language.toLowerCase();
        if (langKey.includes('/')) {
            langKey = langKey.substring(langKey.lastIndexOf('/') + 1);
        }

        switch (langKey) {
            case 'javascript':
            case 'python':
            case 'java': 
            case 'csharp':
            case 'c':
            case 'cpp':
                startContext = 2; 
                endContext = 15;  
                break;
            case 'html':
                startContext = 1;
                endContext = 3;   
                break;
            case 'css':
                startContext = 1;
                endContext = 10;  
                break;
            default:
                startContext = 0;
                endContext = 5;   
        }

        const startLineFetch = Math.max(1, symbolLine - startContext);
        const endLineFetch = symbolLine + endContext;

        const definitionSnippet = CustomEditorService.getContentByLineRange(startLineFetch, endLineFetch, fileId);

        if (definitionSnippet.startsWith("Error:")) {
            return definitionSnippet; 
        }
        return definitionSnippet;
    };

    return {
        parseCodeForSymbols,
        getSymbolDefinition,
    };
})();
// --- END OF FILE codeAnalysisService.js ---