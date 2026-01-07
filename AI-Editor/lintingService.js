// --- START OF FILE lintingService.js ---
/**
 * Linting Service using ESLint (via eslint4b for browser compatibility).
 * Currently supports JavaScript linting.
 */
export const LintingService = (() => {
    let linterInstance = null;
    let isESLintAvailable = false;

    // Initialize ESLint Linter
    try {
        if (typeof window.eslint4b !== 'undefined' && typeof window.eslint4b.Linter === 'function') {
            linterInstance = new window.eslint4b.Linter();
            isESLintAvailable = true;
            console.log("[LintingService] ESLint (eslint4b) Linter initialized.");
        } else {
            console.warn("[LintingService] ESLint (eslint4b.Linter) not found. JavaScript linting will be disabled.");
        }
    } catch (error) {
        console.error("[LintingService] Error initializing ESLint Linter:", error);
        isESLintAvailable = false;
    }

    /**
     * Lints JavaScript code using ESLint.
     * @param {string} content The code content to lint.
     * @returns {Array<{line: number, column: number, message: string, severity: string, ruleId: string | null}>} An array of lint error objects.
     */
    const lintJavaScript = (content) => {
        if (!isESLintAvailable || !linterInstance) {
            // console.warn("[LintingService] ESLint not available, skipping JS linting.");
            return [];
        }

        try {
            const config = {
                parserOptions: {
                    ecmaVersion: 2022, // Use a recent version like ES2022 or "latest"
                    sourceType: 'module',
                    ecmaFeatures: {
                        jsx: true, // Enable if you expect JSX
                    },
                },
                env: {
                    browser: true,
                    es2022: true, // Match ecmaVersion
                    node: false, // Explicitly disable node environment unless needed
                },
                rules: {
                    // Core Recommended-like Rules (subset based on common eslint:recommended)
                    'constructor-super': 'error',
                    'for-direction': 'error',
                    'getter-return': 'error',
                    'no-async-promise-executor': 'error',
                    'no-case-declarations': 'error',
                    'no-class-assign': 'error',
                    'no-compare-neg-zero': 'error',
                    'no-cond-assign': ['error', 'except-parens'], // Recommended is 'always' or 'except-parens'
                    'no-const-assign': 'error',
                    'no-constant-condition': ['warn', { checkLoops: false }], // Warn, allow `while(true)`
                    'no-control-regex': 'error',
                    'no-debugger': 'warn',
                    'no-delete-var': 'error',
                    'no-dupe-args': 'error',
                    'no-dupe-class-members': 'error',
                    'no-dupe-else-if': 'error',
                    'no-dupe-keys': 'error',
                    'no-duplicate-case': 'error',
                    'no-empty': ['warn', { allowEmptyCatch: true }],
                    'no-empty-character-class': 'error',
                    'no-empty-pattern': 'error',
                    'no-ex-assign': 'error',
                    'no-extra-boolean-cast': 'warn',
                    'no-extra-semi': 'warn',
                    'no-fallthrough': 'error',
                    'no-func-assign': 'error',
                    'no-global-assign': 'error',
                    'no-import-assign': 'error',
                    'no-invalid-regexp': 'error',
                    'no-irregular-whitespace': 'error',
                    'no-loss-of-precision': 'error',
                    'no-misleading-character-class': 'error',
                    'no-new-symbol': 'error',
                    'no-obj-calls': 'error',
                    'no-prototype-builtins': 'warn',
                    'no-redeclare': ['error', { builtinGlobals: true }],
                    'no-regex-spaces': 'error',
                    'no-self-assign': ['error', { props: true }],
                    'no-setter-return': 'error',
                    'no-shadow-restricted-names': 'error',
                    'no-sparse-arrays': 'warn',
                    'no-this-before-super': 'error',
                    'no-undef': ['error', { typeof: true }],
                    'no-unexpected-multiline': 'error',
                    'no-unreachable': 'warn',
                    'no-unsafe-finally': 'error',
                    'no-unsafe-negation': ['error', { enforceForOrderingRelations: true }],
                    'no-unsafe-optional-chaining': ['error', { disallowArithmeticOperators: true }],
                    'no-unused-labels': 'warn',
                    'no-unused-vars': ['warn', { vars: 'all', args: 'none', ignoreRestSiblings: true, caughtErrors: 'none' }],
                    'no-useless-backreference': 'error',
                    'no-useless-catch': 'warn',
                    'no-useless-escape': 'warn',
                    'no-var': 'warn',
                    'require-yield': 'error',
                    'use-isnan': ['error', { enforceForSwitchCase: true, enforceForIndexOf: true }],
                    'valid-typeof': ['error', { requireStringLiterals: true }],
                    'semi': ['warn', 'always'],

                    // Optional: some common best practices (can be opinionated)
                    'eqeqeq': ['warn', 'always', { null: 'ignore' }],
                    'no-alert': 'warn',
                    // 'curly': ['warn', 'multi-line'], // Example: enforce curly braces for multi-line blocks
                    // 'no-console': ['warn', { allow: ['warn', 'error', 'info'] }], // Example: restrict console usage
                },
            };

            const messages = linterInstance.verify(content, config, { filename: "file.js" });

            return messages.map(msg => ({
                line: msg.line,
                column: msg.column,
                message: msg.message,
                severity: msg.severity === 1 ? 'warning' : (msg.severity === 2 ? 'error' : 'info'),
                ruleId: msg.ruleId || null,
            }));
        } catch (error) {
            console.error("[LintingService] Error during ESLint verification:", error);
            return [{
                line: 1,
                column: 1,
                message: `Linting engine error: ${error.message}`,
                severity: 'error',
                ruleId: 'lint-engine-failure'
            }];
        }
    };

    /**
     * Lints code content. Currently only supports JavaScript.
     * @param {string} content The code content to lint.
     * @param {string} language The language of the code (e.g., 'javascript', 'python').
     * @returns {Array<{line: number, column: number, message: string, severity: string, ruleId: string | null}>} An array of lint error objects.
     */
    const lintCode = (content, language) => {
        if (!content) {
            return [];
        }

        const langLowerCase = language ? language.toLowerCase() : '';
        const jsMimeTypes = ['javascript', 'js', 'jsx', 'text/javascript', 'application/javascript', 'text/jsx', 'application/jsx'];

        if (jsMimeTypes.some(mime => langLowerCase.includes(mime))) {
            return lintJavaScript(content);
        } else {
            return []; // No linting for other languages
        }
    };

    return {
        lintCode,
        isLintingAvailableForJS: () => isESLintAvailable,
    };
})();
// --- END OF FILE lintingService.js ---