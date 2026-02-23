/**
 * @file CodeAnalysisService.js
 * @description Provides static code analysis including symbol indexing (functions, classes, variables) and project dependency mapping.
 */

/**
 * Service for parsing files and extracting structural information to power the Symbols view and AI context.
 */
export class CodeAnalysisService {
    /**
     * Creates a new CodeAnalysisService instance.
     */
    constructor() {
        /** @type {Array<Object>} Flat table of all indexed symbols across the project. */
        this.symbolTable = [];
        
        /** @type {Object.<string, Array>} Language-specific regex patterns for symbol extraction. */
        this.symbolRegexPatterns = {
            javascript: [
                // Standard functions: function name()
                { type: 'function', regex: /function\s+([a-zA-Z0-9_$]+)\s*\(/gm, nameIndex: 1 },
                // Named function expressions: const x = function()
                { type: 'function', regex: /(?:const|let|var|async)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function\s*\(/gm, nameIndex: 1 },
                // Arrow functions: const x = () =>
                { type: 'function', regex: /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>/gm, nameIndex: 1 },
                // Classes: class Name
                { type: 'class', regex: /class\s+([a-zA-Z0-9_$]+)/gm, nameIndex: 1 },
                // Object/Class methods: methodName() {
                { type: 'method', regex: /^\s*(?:static\s+)?(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/gm, nameIndex: 1 },
                // Object property assignments: obj.prop = function/() =>
                { type: 'method', regex: /(?:this|[\w_$]+)\.([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)/gm, nameIndex: 1 },
                // Exports: export const/function x
                { type: 'function', regex: /export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_$]+)/gm, nameIndex: 1 }
            ],
            css: [
                { type: 'class', regex: /^\s*\.([a-zA-Z0-9_-]+)\s*\{/gm, nameIndex: 1 },
                { type: 'id', regex: /^\s*#([a-zA-Z0-9_-]+)\s*\{/gm, nameIndex: 1 },
                { type: 'variable', regex: /^\s*(--[a-zA-Z0-9_-]+)\s*:/gm, nameIndex: 1 }
            ],
            html: [
                { type: 'id', regex: /id=["']([^"'\s]+)["']/g, nameIndex: 1 },
                { type: 'tag', regex: /<([a-zA-Z0-9-]+)[^>]*\s+id=/g, nameIndex: 1 }
            ]
        };
        
        /** @type {Object.<string, string[]>} Mapping of files to their detected dependencies. */
        this.dependencies = {};
    }

    /**
     * Indexes a file by extracting symbols and mapping its dependencies.
     * @param {string} filePath - The project-relative path of the file.
     * @param {string} content - The file's text content.
     */
    indexFile(filePath, content) {
        this.symbolTable = this.symbolTable.filter(s => s.file !== filePath);
        
        let lang = 'javascript';
        if (filePath.endsWith('.css')) lang = 'css';
        if (filePath.endsWith('.html')) lang = 'html';

        const patterns = this.symbolRegexPatterns[lang] || this.symbolRegexPatterns.javascript;

        patterns.forEach(pattern => {
            let match;
            pattern.regex.lastIndex = 0;
            
            while ((match = pattern.regex.exec(content)) !== null) {
                const name = match[pattern.nameIndex || 1];
                const index = match.index;
                const line = content.substring(0, index).split('\n').length;
                
                this.symbolTable.push({
                    name: name,
                    type: pattern.type,
                    file: filePath,
                    line: line
                });
            }
        });

        this.mapDependencies(filePath, content);
    }

    /**
     * Identifies external references (imports, script srcs, etc.) within a file.
     * @param {string} file - The file path.
     * @param {string} content - The file content.
     */
    mapDependencies(file, content) {
        const deps = [];
        const patterns = [
            /import.*?from\s+['"](.*?)['"]/g,
            /src=['"](.*?)['"]/g,
            /href=['"](.*?)['"]/g
        ];

        patterns.forEach(p => {
            let m;
            while ((m = p.exec(content)) !== null) {
                const dep = m[1];
                if (dep && !dep.startsWith('http') && !dep.startsWith('data:')) {
                    deps.push(dep);
                }
            }
        });

        this.dependencies[file] = [...new Set(deps)];
    }

    /**
     * Returns the dependency list for a specific file.
     * @param {string} file 
     * @returns {string[]}
     */
    getDependencies(file) {
        return this.dependencies[file] || [];
    }

    /**
     * Searches for symbols matching a name across the entire project.
     * @param {string} name 
     * @returns {Object[]}
     */
    findSymbol(name) {
        return this.symbolTable.filter(s => s.name.includes(name));
    }

    /**
     * Returns all indexed symbols.
     * @returns {Object[]}
     */
    getAllSymbols() {
        return this.symbolTable;
    }

    /**
     * Returns symbols specifically for a given file.
     * @param {string} path 
     * @returns {Object[]}
     */
    getFileSymbols(path) {
        return this.symbolTable.filter(s => s.file === path);
    }

    /**
     * Retrieves a snippet of code around a symbol definition.
     * @param {string} path 
     * @param {string} symbolName 
     * @param {number} line 
     * @param {string} content 
     * @returns {string|null}
     */
    getSymbolDefinition(path, symbolName, line, content) {
        if (!content) return null;
        const lines = content.split('\n');
        const start = Math.max(0, line - 2);
        const end = Math.min(lines.length, line + 10);
        return lines.slice(start, end).join('\n');
    }
}
