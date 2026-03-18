/**
 * @file AIService.js
 * @description Integration with Google Gemini API for intelligent code generation, patching, and architectural management.
 */

/* global Diff */
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

/**
 * Service providing high-level AI capabilities including conversational chat, 
 * automated file patching, and PAD (Project Architecture Document) maintenance.
 */
export class AIService {
    /**
     * Creates a new AIService instance.
     * @param {FileSystem} fileSystem - The VFS instance for file operations.
     * @param {PatcherService} patcherService - The service for applying fuzzy patches.
     * @param {CodeAnalysisService} codeAnalysisService - The service for symbol indexing and analysis.
     */
    constructor(fileSystem, patcherService, codeAnalysisService) {
        this.fs = fileSystem;
        this.patcher = patcherService;
        this.analysis = codeAnalysisService;
        this.apiKey = localStorage.getItem('nexus_gemini_key') || '';
        this.modelName = localStorage.getItem('nexus_ai_model') || 'gemini-3-flash-preview';
        this.temperature = parseFloat(localStorage.getItem('nexus_ai_temp')) || 0.7;
        this.customInstructions = localStorage.getItem('nexus_ai_instructions') || '';
        
        /** @type {Object.<string, string>} Pre-defined system prompts for different AI operational modes. */
        this.prompts = {
            core: localStorage.getItem('nexus_prompt_core') || `You are "NexusAI", a world-class AI developer agent. Your purpose is to collaborate with a user to build and modify web projects.
**CARDINAL RULE: ALWAYS READ BEFORE YOU WRITE.**
Before you attempt to modify any file, you MUST first use 'readFile' to get its most up-to-date content. Basing changes on assumptions or stale data will cause failure.
WORKSPACE CONTEXT: Virtual File System (VFS) handles all project files. You operate via a proposal-based system.
MODIFICATION FORMAT: Always use 'applyPatch' for file changes. Provide EXACT original and new code blocks.`,
            
            pad: localStorage.getItem('nexus_prompt_pad') || `# Project Architecture Document (PAD) Template
You are the "Nexus PAD Architect". Your objective is to maintain the PROJECT_ARCHITECTURE.md as the absolute source of truth.
Follow this exact structure:

# PAD: [Project Name]
- **Status:** [PLANNING | CODING | REFINING]
- **Current Version:** v1.0.0
- **Last Updated:** [Date]

### Objective
> [Detailed machine-parseable goal describing the core value proposition and functionality]

### 1. User Stories & Features
| FeatureID | User Story | Priority | Status |
|-----------|------------|----------|--------|
| F-01 | As a user, I want to [action] so that [benefit] | P0 | PENDING |

### 2. Technical Blueprint
**2.1. File Architecture:**
| File Path | Description | Tech Stack |
|-----------|-------------|------------|
| index.html | Main entry point & layout | HTML5, Tailwind |
| css/style.css | Global variables & custom components | CSS3 |
| js/app.js | Application logic & state management | ES6+ |

**2.2. Function Contracts:**
| File | Function | Inputs | Outputs | Description | Status |
|------|----------|--------|---------|-------------|--------|
| app.js | init() | none | void | Initializes state and UI | PENDING |

### 3. Implementation Plan
| TaskID | Feature | Action | Target Files | Status |
|--------|---------|--------|--------------|--------|
| T1 | Scaffolding | Create core project structure | index.html, css/style.css, js/app.js | PENDING |

### 4. Next Steps
1. Define core UI components
2. Implement basic state management logic
3. Add interactive elements

### 5. Execution Log
| Timestamp | TaskID | Note |
|-----------|--------|------|

Always update statuses to COMPLETED as work progresses. If the user asks for a single file, DO NOT assume a full stack; respect existing files.`,
            
            ui: localStorage.getItem('nexus_prompt_ui') || `You are an Expert Frontend Developer and Tailwind CSS Master.
Generate semantic, highly responsive, modern HTML5 code using Tailwind utility classes.
Return ONLY raw HTML inside a single \`\`\`html code block.
Include Tailwind and FontAwesome CDNs if providing a full template.
Ensure layouts are mobile-first using responsive prefixes (sm:, md:). Use placeholder colors for images unless source provided.`,

            deconstruct: localStorage.getItem('nexus_prompt_deconstruct') || `You are the "Nexus Code Deconstructor". Your goal is to refactor a monolithic file into a clean, modular architecture.
PROCESS:
1.  **Analyze:** Read the target file. Identify all HTML structure, CSS rules, and JavaScript functions/classes.
2.  **Plan (PAD Update):**
    *   Update 'PROJECT_ARCHITECTURE.md' -> 'Technical Blueprint'.
    *   **File Architecture:** List every new file (e.g., js/utils.js, css/style.css).
    *   **Function Contracts:** List EVERY single function found in the monolith and map it to its new destination file. This is CRITICAL. The table must have: | File | Function | Inputs | Outputs | Status |
    *   **Symbol Map:** Create a new section "2.3. Symbol Map" listing exported variables/classes and their dependencies.
    *   **Imports/Exports:** In the description of "File Architecture", explicitly state which modules import what.
3.  **Execute:**
    *   Use 'createFile' to generate the new modular files with extracted code.
    *   Use 'applyPatch' or 'writeFile' to clean up the original file (e.g., removing extracted scripts/styles and adding <link>/<script type="module"> tags).
    *   Ensure all imports and exports are valid ES6 modules.
4.  **Finalize:** Mark the task as COMPLETED in the PAD.`,
            
            auditor: localStorage.getItem('nexus_prompt_auditor') || `You are the "Nexus Site Auditor & Automated Architect". You operate in a continuous, multi-step agentic loop.
**YOUR WORKFLOW:**
1. **Discover:** Take screenshots of the current view using the 'takeScreenshot' tool. Read the main page DOM using 'getPreviewDOM'. Use 'navigatePreview' to visit linked internal pages and take screenshots of those too.
2. **Analyze & Suggest:** Compare the visuals and code against modern best practices. Identify layout issues, missing styles, or broken links. Provide revision suggestions to the user or interpret their direct requests.
3. **Plan:** Present a step-by-step plan.
4. **Implement:** Use 'writeFile', 'applyPatch' to implement changes.
5. **Verify:** Use the 'lintFile' tool after modifying any file. If lint errors are found, fix them immediately. Take final screenshots to verify the visual fixes.`,
        };

        /** @type {Object.<string, {declaration: Object, handler: Function}>} Registry of available AI tools. */
        this.toolRegistry = {
            readFile: {
                declaration: { name: 'readFile', description: 'Reads the entire content of a file.', parameters: { type: 'OBJECT', properties: { path: { type: 'STRING' } }, required: ['path'] } },
                handler: async (args) => {
                    try {
                        const content = await this.fs.readFile(args.path);
                        return { success: !!content, content: content || "File is empty or not found." };
                    } catch (e) { return { success: false, error: e.message }; }
                }
            },
            writeFile: {
                declaration: { name: 'writeFile', description: 'Creates a new file or overwrites an existing one. Automatically runs linter and returns errors if any.', parameters: { type: 'OBJECT', properties: { path: { type: 'STRING' }, content: { type: 'STRING' } }, required: ['path', 'content'] } },
                handler: async (args) => {
                    try {
                        await this.fs.writeFile(args.path, args.content);
                        let lintResult = "";
                        if (window.Nexus) {
                            window.Nexus.refreshFileExplorer();
                            if (window.Nexus.state.currentFile === args.path) await window.Nexus.editor.openFile(args.path, true);
                            if (args.path === 'PROJECT_ARCHITECTURE.md') { await window.Nexus.pad.init(); if (window.Nexus.state.view === 'pad') window.Nexus.refreshPADUI(); }
                            const errors = window.Nexus.lint.lintCode(args.content, args.path);
                            if (errors.length > 0) lintResult = ` File written, but has linting errors: ${JSON.stringify(errors)}`;
                        }
                        return { success: true, message: `File ${args.path} written successfully.${lintResult}` };
                    } catch (e) { return { success: false, error: e.message }; }
                }
            },
            applyPatch: {
                declaration: { name: 'applyPatch', description: 'Applies a targeted change to a file. Automatically runs linter and returns errors if any.', parameters: { type: 'OBJECT', properties: { path: { type: 'STRING' }, explanation: { type: 'STRING' }, originalContent: { type: 'STRING' }, newContent: { type: 'STRING' } }, required: ['path', 'explanation', 'originalContent', 'newContent'] } },
                handler: async (args, isAutoMode) => {
                    return new Promise((resolve) => {
                        (async () => {
                            const currentContent = await this.fs.readFile(args.path);
                            if (!currentContent) return resolve({ success: false, error: `File ${args.path} not found.` });

                            if (isAutoMode) {
                                const updated = currentContent.replace(args.originalContent, args.newContent);
                                if (updated !== currentContent) {
                                    await this.fs.writeFile(args.path, updated);
                                    let lintResult = "";
                                    if (window.Nexus) {
                                        window.Nexus.updatePreview(); window.Nexus.refreshFileExplorer();
                                        if (window.Nexus.state.currentFile === args.path) await window.Nexus.editor.openFile(args.path, true);
                                        if (args.path === 'PROJECT_ARCHITECTURE.md') { await window.Nexus.pad.init(); window.Nexus.refreshPADUI(); }
                                        const errors = window.Nexus.lint.lintCode(updated, args.path);
                                        if (errors.length > 0) lintResult = ` Patch applied, but has linting errors: ${JSON.stringify(errors)}`;
                                    }
                                    return resolve({ success: true, message: `Patch applied automatically.${lintResult}` });
                                }
                            }
                            const proposal = this.createProposalUI(args, currentContent, resolve);
                            const container = document.getElementById('chat-history');
                            if (container) { container.appendChild(proposal); container.scrollTop = container.scrollHeight; }
                        })();
                    });
                }
            },
            listFiles: {
                declaration: { name: 'listFiles', description: 'Lists all files in the project.', parameters: { type: 'OBJECT', properties: {} } },
                handler: async () => {
                    const files = await this.fs.listFiles();
                    return { success: true, files };
                }
            },
            getSymbols: {
                declaration: { name: 'getSymbols', description: 'Gets functions/classes outline of a file.', parameters: { type: 'OBJECT', properties: { path: { type: 'STRING' } }, required: ['path'] } },
                handler: async (args) => {
                    const symbols = this.analysis.getFileSymbols(args.path);
                    return { success: true, symbols };
                }
            },
            grepFiles: {
                declaration: { name: 'grepFiles', description: 'Searches for a text pattern or regex in all project files.', parameters: { type: 'OBJECT', properties: { pattern: { type: 'STRING' }, isRegex: { type: 'BOOLEAN' } }, required: ['pattern'] } },
                handler: async (args) => {
                    const files = await this.fs.listFiles();
                    const results = []; const regex = args.isRegex ? new RegExp(args.pattern, 'i') : null; const pattern = args.pattern.toLowerCase();
                    for (const path of files) {
                        if (path.endsWith('.meta')) continue;
                        try {
                            const content = await this.fs.readFile(path); if (!content) continue;
                            const lines = content.split('\n');
                            lines.forEach((line, idx) => { if (regex ? regex.test(line) : line.toLowerCase().includes(pattern)) results.push({ file: path, line: idx + 1, content: line.trim() }); });
                        } catch (e) {}
                    }
                    return { success: true, results: results.slice(0, 50), count: results.length };
                }
            },
            lintFile: {
                declaration: { name: 'lintFile', description: 'Runs the linter on a specific file and returns the issues.', parameters: { type: 'OBJECT', properties: { path: { type: 'STRING' } }, required: ['path'] } },
                handler: async (args) => {
                    try {
                        const content = await this.fs.readFile(args.path); if (!content) return { success: false, error: "File not found or empty." };
                        const errors = window.Nexus ? window.Nexus.lint.lintCode(content, args.path) : [];
                        return { success: true, errors };
                    } catch (e) { return { success: false, error: e.message }; }
                }
            },
            takeScreenshot: {
                declaration: { name: 'takeScreenshot', description: 'Takes a screenshot of the current project preview.', parameters: { type: 'OBJECT', properties: {} } },
                handler: async () => {
                    try {
                        if (!window.Nexus) return { success: false, error: "Nexus not available." };
                        const frame = document.getElementById('preview-frame'); if (!frame) return { success: false, error: "Preview frame not found." };
                        const isHidden = frame.classList.contains('hidden'); if (isHidden) frame.classList.remove('hidden');
                        const imgData = await window.Nexus.capture.visual.constructor.renderElement(frame);
                        if (isHidden) frame.classList.add('hidden');
                        return { success: true, image: imgData ? "Image Captured" : "Capture Failed", data: imgData };
                    } catch (e) { return { success: false, error: e.message }; }
                }
            },
            navigatePreview: {
                declaration: { name: 'navigatePreview', description: 'Navigates the preview iframe to a specific path or URL.', parameters: { type: 'OBJECT', properties: { url: { type: 'STRING' } }, required: ['url'] } },
                handler: async (args) => {
                    try {
                        const frame = document.getElementById('preview-frame'); if (!frame) return { success: false, error: "Preview frame not found." };
                        frame.src = args.url;
                        return { success: true, message: `Navigated to ${args.url}.` };
                    } catch (e) { return { success: false, error: e.message }; }
                }
            },
            getPreviewDOM: {
                declaration: { name: 'getPreviewDOM', description: 'Gets the current HTML DOM of the preview iframe for analysis.', parameters: { type: 'OBJECT', properties: {} } },
                handler: async () => {
                    try {
                        const frame = document.getElementById('preview-frame'); if (!frame || !frame.contentDocument) return { success: false, error: "Preview DOM not accessible." };
                        return { success: true, dom: frame.contentDocument.body.innerHTML.substring(0, 50000) };
                    } catch (e) { return { success: false, error: e.message }; }
                }
            }
        };

        this.chatHistory = [];
        this.lastApiCallTimestamp = 0;
        this.MIN_API_CALL_INTERVAL_MS = 5000; 
        /** @type {GoogleGenerativeAI|null} Instance of the Gemini API client. */
        this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    }

    /**
     * Updates the Gemini API key and re-initializes the generative model instance.
     * @param {string} key - The new API key.
     */
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('nexus_gemini_key', key);
        this.genAI = new GoogleGenerativeAI(key);
    }

    /**
     * Updates the AI configuration and persists settings to LocalStorage.
     * @param {string} model - Gemini model name (e.g., 'gemini-1.5-flash').
     * @param {number|string} temp - Sampling temperature.
     * @param {string} [instructions=''] - Global custom instructions for the AI.
     * @param {Object} [prompts={}] - Optional updates to specific mode prompts.
     */
    setConfig(model, temp, instructions = '', prompts = {}) {
        this.modelName = model;
        this.temperature = parseFloat(temp);
        this.customInstructions = instructions;
        
        localStorage.setItem('nexus_ai_model', model);
        localStorage.setItem('nexus_ai_temp', temp);
        localStorage.setItem('nexus_ai_instructions', instructions);

        if (prompts.core) { this.prompts.core = prompts.core; localStorage.setItem('nexus_prompt_core', prompts.core); }
        if (prompts.pad) { this.prompts.pad = prompts.pad; localStorage.setItem('nexus_prompt_pad', prompts.pad); }
        if (prompts.ui) { this.prompts.ui = prompts.ui; localStorage.setItem('nexus_prompt_ui', prompts.ui); }
        if (prompts.deconstruct) { this.prompts.deconstruct = prompts.deconstruct; localStorage.setItem('nexus_prompt_deconstruct', prompts.deconstruct); }
        if (prompts.auditor) { this.prompts.auditor = prompts.auditor; localStorage.setItem('nexus_prompt_auditor', prompts.auditor); }
    }

    /**
     * Lists available models from the Gemini API.
     * @returns {Promise<Array>} An array of model information objects.
     */
    async listModels() {
        if (!this.apiKey) return [];
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            const data = await response.json();
            return data.models || [];
        } catch (e) {
            console.error("Failed to list models:", e);
            return [];
        }
    }

    /**
     * Prunes dangling model responses from history that ended with tool calls but no execution yet.
     * Ensures the conversation can be resumed correctly.
     */
    cleanHistory() {
        if (this.chatHistory.length === 0) return;
        const last = this.chatHistory[this.chatHistory.length - 1];
        if (last.role === 'model' && last.parts.some(p => p.functionCall)) {
            console.warn("NexusAI: Pruning dangling model tool calls Turn.");
            this.chatHistory.pop();
            this.cleanHistory();
        }
    }

    /**
     * High-level method to get a completion from the AI, handling context injection and multimodal inputs.
     * 
     * @param {string} prompt - The user's input message.
     * @param {Array<{path: string, content: string}>} [fileContexts=[]] - Explict file contents to include.
     * @param {Array<Object>} [contextItems=[]] - Multimodal context (images, code blocks).
     * @param {boolean} [isAutoMode=false] - Whether to apply file changes without user confirmation.
     * @param {string} [mode='core'] - The operational mode (e.g., 'pad', 'deconstruct').
     * @returns {Promise<string>} The AI's final text response.
     */
    async getCompletion(prompt, fileContexts = [], contextItems = [], isAutoMode = false, mode = 'core') {
        if (!this.apiKey) throw new Error('API Key missing. Enter it in Settings.');
        if (!this.genAI) this.genAI = new GoogleGenerativeAI(this.apiKey);

        const systemPrompt = `${this.prompts[mode] || this.prompts.core}\n\nCUSTOM USER INSTRUCTIONS:\n${this.customInstructions}`;
        this.cleanHistory();

        // Handle @mentions in the prompt
        const mentionRegex = /@([\w.-]+)/g;
        let match;
        const mentionedFiles = new Set();
        while ((match = mentionRegex.exec(prompt)) !== null) mentionedFiles.add(match[1]);

        for (const fileName of mentionedFiles) {
            try {
                const content = await this.fs.readFile(fileName);
                if (content) fileContexts.push({ path: fileName, content });
            } catch {}
        }

        let contextStr = "";
        if (fileContexts.length > 0) {
            contextStr += "\n\nREFERENCED FILE CONTEXT:\n";
            fileContexts.forEach(f => { contextStr += `FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\`\n\n`; });
        }

        const userParts = [{ text: prompt + contextStr }];
        if (Array.isArray(contextItems) && contextItems.length > 0) {
            contextItems.forEach(item => {
                if (item.type === 'image') userParts.push({ inlineData: { mimeType: "image/png", data: item.content.split(',')[1] } });
                else if (item.type === 'code') userParts[0].text += `\n\n### CONTEXT BLOCK (Type: ${item.type}):\n\`\`\`\n${item.content}\n\`\`\``;
            });
        }

        this.chatHistory.push({ role: 'user', parts: userParts });
        return this.executeAILoop(systemPrompt, isAutoMode);
    }

    /**
     * Executes the generative loop, handling potential multi-turn function calling.
     * @private
     * @param {string} systemPrompt - The full system instruction.
     * @param {boolean} isAutoMode - Auto-apply flag.
     * @returns {Promise<string>} The final text response.
     */
    async executeAILoop(systemPrompt, isAutoMode) {
        let iterations = 0;
        const MAX_ITERATIONS = 12;

        const tools = [{
            functionDeclarations: Object.values(this.toolRegistry).map(t => t.declaration)
        }];

        const model = this.genAI.getGenerativeModel({ 
            model: this.modelName,
            systemInstruction: systemPrompt
        });

        while (iterations < MAX_ITERATIONS) {
            iterations++;
            
            const now = Date.now();
            const elapsed = now - this.lastApiCallTimestamp;
            if (elapsed < this.MIN_API_CALL_INTERVAL_MS) await new Promise(r => setTimeout(r, this.MIN_API_CALL_INTERVAL_MS - elapsed));
            this.lastApiCallTimestamp = Date.now();

            try {
                const result = await model.generateContent({
                    contents: this.chatHistory,
                    tools: tools,
                    generationConfig: { temperature: this.temperature, topP: 0.95 }
                });

                const content = result.response.candidates[0].content;
                this.chatHistory.push(content);

                const functionCalls = content.parts.filter(p => p.functionCall).map(p => p.functionCall);
                if (functionCalls.length === 0) return result.response.text();

                const functionResponses = [];
                const additionalParts = [];

                for (const call of functionCalls) {
                    const res = await this.handleFunctionCall(call, isAutoMode);
                    if (res.data && res.data.startsWith('data:image')) {
                        additionalParts.push({ inlineData: { mimeType: "image/png", data: res.data.split(',')[1] } });
                        delete res.data; 
                    }
                    functionResponses.push({ functionResponse: { name: call.name, response: res } });
                }
                this.chatHistory.push({ role: 'user', parts: [...functionResponses, ...additionalParts] });
            } catch (error) {
                console.error('AI Error:', error);
                if (this.chatHistory.length > 0 && this.chatHistory[this.chatHistory.length - 1].role === 'model') this.chatHistory.pop();
                throw error;
            }
        }
        return "Maximum iterations reached.";
    }

    /**
     * Routes Gemini tool calls to local system operations.
     * @private
     */
    async handleFunctionCall(call, isAutoMode) {
        const tool = this.toolRegistry[call.name];
        console.log(`AI Calling Tool: ${call.name}`, call.args);
        if (tool) return await tool.handler(call.args, isAutoMode);
        return { success: false, error: `Tool ${call.name} not found.` };
    }

    /**
     * Creates an interactive UI component for user review of proposed file patches.
     * @private
     */
    createProposalUI(args, currentContent, resolve) {
        const div = document.createElement('div');
        div.className = 'log-change-proposal slide-up';
        const diff = Diff.diffLines(args.originalContent, args.newContent);
        const diffHtml = diff.map(part => {
            const tag = part.added ? 'ins' : part.removed ? 'del' : 'span';
            return `<${tag}>${this.escapeHtml(part.value)}</${tag}>`;
        }).join('');

        div.innerHTML = `
            <div class="proposal-header">Proposal: ${args.path}</div>
            <div class="proposal-explanation">${this.escapeHtml(args.explanation)}</div>
            <div class="proposal-diff">${diffHtml}</div>
            <div class="proposal-actions">
                <button class="btn-proposal btn-proposal-apply">Apply Change</button>
                <button class="btn-proposal btn-proposal-reject">Reject</button>
            </div>
        `;

        div.querySelector('.btn-proposal-apply').onclick = async () => {
            const updated = currentContent.replace(args.originalContent, args.newContent);
            await this.fs.writeFile(args.path, updated);
            div.querySelector('.proposal-actions').innerHTML = '<span class="text-emerald-500 font-bold text-xs">APPLIED</span>';
            if (window.Nexus) {
                window.Nexus.updatePreview(); window.Nexus.refreshFileExplorer();
                if (window.Nexus.state.currentFile === args.path) await window.Nexus.editor.openFile(args.path, true);
                if (args.path === 'PROJECT_ARCHITECTURE.md') { await window.Nexus.pad.init(); window.Nexus.refreshPADUI(); }
            }
            resolve({ success: true, message: "User approved and applied the patch." });
        };
        div.querySelector('.btn-proposal-reject').onclick = () => {
            div.querySelector('.proposal-actions').innerHTML = '<span class="text-slate-500 font-bold text-xs">REJECTED</span>';
            resolve({ success: false, error: "User rejected the patch." });
        };
        return div;
    }

    /** Escapes HTML. @private */
    escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
}
