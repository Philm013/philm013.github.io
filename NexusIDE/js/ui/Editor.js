/**
 * @file Editor.js
 * @description Wrapper for the CodeMirror editor, providing a high-level API for file editing, mode detection, and change tracking.
 */

/* global CodeMirror */

/**
 * Main editor class for NexusIDE. Handles instantiation and operational control of CodeMirror.
 */
export class Editor {
    /**
     * Creates a new Editor instance.
     * @param {string} elementId - ID of the textarea to replace.
     * @param {FileSystem} fileSystem - Project VFS.
     * @param {Function|null} [onChange=null] - Callback triggered on every edit.
     */
    constructor(elementId, fileSystem, onChange = null) {
        this.elementId = elementId;
        this.fs = fileSystem;
        /** @type {CodeMirror.Editor} The raw CodeMirror instance. */
        this.cm = null;
        /** @type {string|null} Path of the currently open file. */
        this.currentFile = null;
        /** @type {boolean} True if changes have been made since the last open/save. */
        this.unsavedChanges = false;
        this.onChange = onChange;
        
        this.init();
    }

    /**
     * Initializes CodeMirror with project-specific settings and event handlers.
     */
    init() {
        const isMobile = window.innerWidth < 768;
        this.cm = CodeMirror.fromTextArea(document.getElementById(this.elementId), {
            lineNumbers: true,
            mode: 'javascript',
            theme: 'monokai',
            indentUnit: 4,
            smartIndent: true,
            tabSize: 4,
            indentWithTabs: false,
            lineWrapping: localStorage.getItem('nexus_wordwrap') !== 'false',
            autoCloseBrackets: true,
            matchBrackets: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: { "Ctrl-Space": "autocomplete" },
            inputStyle: isMobile ? 'contenteditable' : 'textarea',
            spellcheck: isMobile,
            autocorrect: isMobile
        });

        this.cm.on('change', () => {
            this.unsavedChanges = true;
            if (this.onChange) this.onChange();
        });
    }

    /**
     * Directly sets a CodeMirror option.
     * @param {string} option 
     * @param {any} value 
     */
    setOption(option, value) {
        this.cm.setOption(option, value);
    }

    /**
     * Reads a file from VFS and loads its content into the editor.
     * Automatically detects and applies the correct syntax highlighting mode.
     * 
     * @param {string} path - The file path.
     * @param {boolean} [force=false] - Whether to reload even if the file is already open.
     */
    async openFile(path, force = false) {
        if (this.currentFile === path && !force) return;
        
        const content = await this.fs.readFile(path);
        if (content === null) {
            console.error('File not found:', path);
            return;
        }

        this.currentFile = path;
        
        // Detect mode
        let mode = 'javascript';
        if (path.endsWith('.html')) mode = 'htmlmixed';
        if (path.endsWith('.css')) mode = 'css';
        if (path.endsWith('.json')) mode = 'application/json';
        if (path.endsWith('.md')) mode = 'markdown';

        this.cm.setOption('mode', mode);
        this.cm.setValue(content);
        this.cm.clearHistory();
        this.unsavedChanges = false;
    }

    /** @returns {string} The current editor content. */
    getValue() {
        return this.cm.getValue();
    }

    /**
     * Sets the editor content directly.
     * @param {string} content 
     */
    setValue(content) {
        this.cm.setValue(content);
    }

    /** Force-refreshes the CodeMirror UI to ensure correct layout and scroll. */
    refresh() {
        this.cm.refresh();
    }
}
