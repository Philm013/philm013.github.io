/**
 * @file LintingService.js
 * @description Provides JavaScript linting capabilities using a browser-compatible build of ESLint.
 */

/**
 * Service for analyzing code quality and reporting syntax errors or style violations.
 * Currently supports JavaScript via ESLint.
 * 
 * @module LintingService
 */
export const LintingService = (() => {
    let linterInstance = null;
    let isESLintAvailable = false;

    try {
        // eslint-linter-browserify provides window.eslint.Linter
        if (typeof window.eslint !== 'undefined' && typeof window.eslint.Linter === 'function') {
            linterInstance = new window.eslint.Linter();
            isESLintAvailable = true;
            console.log("[LintingService] ESLint (browserify) initialized.");
        }
    } catch (error) {
        console.error("[LintingService] Init error:", error);
    }

    /**
     * Performs linting on JavaScript content.
     * @private
     * @param {string} content - The JS code to lint.
     * @returns {Array<Object>} List of linting messages (line, column, message, severity, ruleId).
     */
    const lintJavaScript = (content) => {
        if (!isESLintAvailable || !linterInstance) return [];

        try {
            const config = {
                parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
                env: { browser: true, es2022: true },
                rules: {
                    'no-undef': 'error',
                    'no-unused-vars': 'warn',
                    'semi': ['warn', 'always'],
                    'no-console': 'off'
                },
            };

            // Using the instance provided by the browserify build
            const messages = linterInstance.verify(content, config, { filename: "file.js" });

            return messages.map(msg => ({
                line: msg.line,
                column: msg.column,
                message: msg.message,
                severity: msg.severity === 1 ? 'warning' : 'error',
                ruleId: msg.ruleId
            }));
        } catch (error) {
            return [{ line: 1, column: 1, message: `Lint Error: ${error.message}`, severity: 'error' }];
        }
    };

    /**
     * Performs basic linting on CSS content.
     * @private
     */
    const lintCSS = (content) => {
        const issues = [];
        // Basic syntax check: matching braces
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            issues.push({ line: 1, column: 1, message: `Mismatched braces: ${openBraces} open, ${closeBraces} closed.`, severity: 'error' });
        }
        return issues;
    };

    return {
        /**
         * Main entry point for linting. Detects language by path extension.
         * @param {string} content - The code content.
         * @param {string} path - The file path.
         * @returns {Array<Object>} List of linting issues.
         */
        lintCode: (content, path) => {
            if (path.endsWith('.js')) return lintJavaScript(content);
            if (path.endsWith('.css')) return lintCSS(content);
            if (path.endsWith('.html')) {
                let issues = [];
                // Extract and lint JS
                const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
                let match;
                while ((match = scriptRegex.exec(content)) !== null) {
                    const scriptContent = match[1];
                    if (scriptContent.trim()) {
                        const lineOffset = content.substring(0, match.index).split('\n').length - 1;
                        const jsIssues = lintJavaScript(scriptContent);
                        issues = issues.concat(jsIssues.map(iss => ({ ...iss, line: iss.line + lineOffset, message: `[JS] ${iss.message}` })));
                    }
                }
                // Extract and lint CSS
                const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
                while ((match = styleRegex.exec(content)) !== null) {
                    const styleContent = match[1];
                    if (styleContent.trim()) {
                        const lineOffset = content.substring(0, match.index).split('\n').length - 1;
                        const cssIssues = lintCSS(styleContent);
                        issues = issues.concat(cssIssues.map(iss => ({ ...iss, line: iss.line + lineOffset, message: `[CSS] ${iss.message}` })));
                    }
                }
                return issues;
            }
            return [];
        }
    };
})();
