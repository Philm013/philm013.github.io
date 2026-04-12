const js = require('@eslint/js');
const globals = require('globals');
const htmlPlugin = require('eslint-plugin-html');

module.exports = [
  // Base recommended rules for JS
  js.configs.recommended,
  {
    // Apply to JS and HTML files
    files: ['**/*.{js,html}'],
    plugins: { html: htmlPlugin },
    settings: {
      // Allow eslint-plugin-html to handle both classic and module scripts
      'html/xml-extensions': ['.xhtml'],
      'html/indent': '+2',
      'html/report-bad-indent': 'warn',
      'html/javascript-mime-types': ['text/javascript', 'application/javascript', 'module'],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Relax rules that are commonly violated in existing inline scripts
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      'no-new-func': 'warn',
      'no-eval': 'error',
    },
  },
  {
    // Node.js server files — add node globals
    files: ['**/server/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Ignore third-party and build directories
    ignores: [
      'node_modules/**',
      '**/LocalChatExampleComprehensive.html',
      '**/LocalChatExampleBasic.html',
      '**/LocalMind.html',
    ],
  },
];
