/**
 * @file PADService.js
 * @description Manages the Project Architecture Document (PAD), acting as the central state for project requirements, tasks, and file structure.
 */

/**
 * Service for reading, parsing, and persisting the PROJECT_ARCHITECTURE.md file.
 * Bridges the gap between the markdown-based source of truth and interactive UI components.
 */
export class PADService {
    /**
     * Creates a new PADService instance.
     * @param {FileSystem} fileSystem - The project VFS.
     */
    constructor(fileSystem) {
        this.fs = fileSystem;
        /** @type {string} */
        this.padPath = 'PROJECT_ARCHITECTURE.md';
        /** @type {Object} The internal representation of the PAD data. */
        this.state = {
            objective: '',
            tasks: [],
            files: [],
            status: 'IDLE',
            userStories: [],
            contracts: [],
            executionLog: [],
            nextSteps: []
        };
    }

    /**
     * Initializes the service by reading and parsing the existing PAD, or creating a default one if missing.
     * @returns {Promise<void>}
     */
    async init() {
        const content = await this.fs.readFile(this.padPath);
        if (content) {
            this.parsePAD(content);
        } else {
            await this.createDefaultPAD();
        }
    }

    /**
     * Generates a basic boilerplate PAD for new projects.
     * @param {string} [objective="Build a modern web application."]
     * @returns {Promise<void>}
     */
    async createDefaultPAD(objective = "Build a modern web application.") {
        this.state.objective = objective;
        this.state.tasks = [
            { id: 'T1', feature: 'Setup', action: 'Create index.html boilerplate', status: 'PENDING', files: 'index.html' },
            { id: 'T2', feature: 'Design', action: 'Add Tailwind CSS CDN', status: 'PENDING', files: 'index.html' },
            { id: 'T3', feature: 'Logic', action: 'Implement core JS functionality', status: 'PENDING', files: 'main.js' }
        ];
        this.state.files = [
            { file: 'index.html', description: 'Main entry point' },
            { file: 'main.js', description: 'Application logic' }
        ];
        await this.savePAD();
    }

    /**
     * Parses the raw markdown text of a PAD file into the internal state object.
     * Uses regex and string splitting to identify logical sections.
     * 
     * @param {string} content - Raw markdown content.
     */
    parsePAD(content) {
        this.state.tasks = [];
        this.state.files = [];
        this.state.userStories = [];
        this.state.contracts = [];
        this.state.executionLog = [];
        this.state.nextSteps = [];
        this.state.objective = '';
        this.state.status = 'PLANNING';

        // Split by sections, handle both # and ###
        const sections = content.split(/\n(?=#+\s+)/);
        
        sections.forEach(section => {
            const lines = section.trim().split('\n');
            if (lines.length === 0) return;
            
            const titleLine = lines[0].toLowerCase();

            // Status parsing
            const statusMatch = section.match(/-\s+\*\*Status:\*\*\s*(.*)/i);
            if (statusMatch) this.state.status = statusMatch[1].trim().replace(/[\[\]]/g, '').toUpperCase();

            // Objective parsing
            if (titleLine.includes('objective')) {
                const objectiveLines = lines.slice(1)
                    .map(l => l.trim().replace(/^>\s*/, ''))
                    .filter(l => l && !l.startsWith('#'));
                this.state.objective = objectiveLines.join(' ');
            }

            if (titleLine.includes('user stories')) {
                this.state.userStories = this.parseTable(section);
            }

            if (titleLine.includes('technical blueprint') || titleLine.includes('architecture')) {
                const fileTable = this.parseTable(section, 'File Path');
                if (fileTable.length > 0) this.state.files = fileTable;
                
                const contractTable = this.parseTable(section, 'Function');
                if (contractTable.length > 0) this.state.contracts = contractTable;
            }

            if (titleLine.includes('implementation plan')) {
                this.state.tasks = this.parseTable(section, 'TaskID');
            }

            if (titleLine.includes('next steps')) {
                const steps = [];
                lines.slice(1).forEach(l => {
                    const m = l.trim().match(/^[\d-*.]+\s+(.*)/);
                    if (m) steps.push(m[1].trim());
                    else if (l.trim() && !l.startsWith('#')) steps.push(l.trim());
                });
                this.state.nextSteps = steps;
            }

            if (titleLine.includes('execution log')) {
                this.state.executionLog = this.parseTable(section, 'Timestamp');
            }
        });

        // Fallback for objective if not found in sections
        if (!this.state.objective) {
            const objMatch = content.match(/Objective\n>\s*(.*)/i);
            if (objMatch) this.state.objective = objMatch[1].trim();
        }
    }

    /**
     * Extracts data from a markdown table string into an array of objects.
     * 
     * @param {string} text - Section text containing a table.
     * @param {string|null} [headerKey=null] - Optional keyword to find the specific table start.
     * @returns {Array<Object>} List of rows as objects keyed by normalized headers.
     */
    parseTable(text, headerKey = null) {
        const lines = text.split('\n').map(l => l.trim());
        let tableStartIndex = -1;

        if (headerKey) {
            tableStartIndex = lines.findIndex(l => l.toLowerCase().includes(headerKey.toLowerCase()) && l.startsWith('|'));
        } else {
            tableStartIndex = lines.findIndex(l => l.startsWith('|'));
        }

        if (tableStartIndex === -1) return [];

        const tableLines = [];
        for (let i = tableStartIndex; i < lines.length; i++) {
            if (lines[i].startsWith('|')) {
                tableLines.push(lines[i]);
            } else if (tableLines.length > 0) {
                break;
            }
        }

        if (tableLines.length < 2) return [];

        const headerLine = tableLines[0];
        const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
        const results = [];

        let dataStartIndex = 1;
        if (tableLines[1] && tableLines[1].match(/^\|?\s*:?-+:?\s*\|/)) {
            dataStartIndex = 2;
        }

        for (let i = dataStartIndex; i < tableLines.length; i++) {
            const line = tableLines[i];
            const cells = line.split('|').map(c => c.trim());
            
            if (cells[0] === '') cells.shift();
            if (cells[cells.length - 1] === '') cells.pop();

            if (cells.length === headers.length) {
                const obj = {};
                headers.forEach((h, idx) => {
                    const key = h.replace(/\s+/g, '').toLowerCase();
                    let val = cells[idx] ? cells[idx].replace(/^`|`$/g, '') : '';
                    
                    if (key === 'taskid' || key === 'id') obj.id = val;
                    else if (key === 'targetfiles' || key === 'targetfile(s)' || key === 'files') obj.files = val;
                    else if (key === 'function' || key === 'functionname') obj.function = val;
                    else if (key === 'filepath' || key === 'file') obj.file = val;
                    else if (key === 'userstory' || key === 'story') obj.userstory = val;
                    else obj[key] = val;
                });
                results.push(obj);
            }
        }
        return results;
    }

    /**
     * Converts the internal state back into a markdown string and writes it to VFS.
     * @returns {Promise<void>}
     */
    async savePAD() {
        let content = `# Project Architecture Document (PAD)\n\n`;
        content += `- **Status:** ${this.state.status || 'PLANNING'}\n\n`;
        content += `### Objective\n> ${this.state.objective}\n\n`;
        
        content += `### 1. User Stories & Features\n| FeatureID | User Story | Priority | Status |\n|-----------|------------|----------|--------|\n`;
        (this.state.userStories || []).forEach(s => {
            content += `| ${s.featureid || s.id || 'F-xx'} | ${s.userstory || ''} | ${s.priority || 'P1'} | ${s.status || 'PENDING'} |\n`;
        });

        content += `\n### 2. Technical Blueprint\n**2.1. File Architecture:**\n| File Path | Description |\n|-----------|-------------|\n`;
        (this.state.files || []).forEach(f => {
            content += `| \`${f.file || f.filepath || f}\` | ${f.description || 'Auto-generated'} |\n`;
        });
        
        content += `\n**2.2. Function Contracts:**\n| File | Function | Inputs | Outputs | Status |\n|------|----------|--------|---------|--------|\n`;
        (this.state.contracts || []).forEach(c => {
            content += `| ${c.file || ''} | ${c.function || ''} | ${c.inputs || ''} | ${c.outputs || ''} | ${c.status || 'PENDING'} |\n`;
        });

        content += `\n### 3. Implementation Plan\n| TaskID | Feature | Action | Target Files | Status |\n|--------|---------|--------|--------------|--------|\n`;
        this.state.tasks.forEach(t => {
            content += `| ${t.id || t.taskid} | ${t.feature || ''} | ${t.action || ''} | ${t.files || t.targetfiles} | ${t.status || 'PENDING'} |\n`;
        });

        if (this.state.nextSteps && this.state.nextSteps.length > 0) {
            content += `\n### 4. Next Steps\n`;
            this.state.nextSteps.forEach((step, i) => {
                content += `${i + 1}. ${step}\n`;
            });
        }

        content += `\n### 5. Execution Log\n| Timestamp | TaskID | Note |\n|-----------|--------|------|\n`;
        (this.state.executionLog || []).forEach(log => {
            content += `| ${log.timestamp} | ${log.taskid || log.id || '-'} | ${log.note} |\n`;
        });
        content += `| ${new Date().toLocaleString()} | - | PAD Updated |\n`;

        await this.fs.writeFile(this.padPath, content);
    }

    /**
     * Updates the status of a specific task and saves the PAD.
     * @param {string} taskId 
     * @param {string} status - e.g., 'COMPLETED'
     * @returns {Promise<void>}
     */
    async updateTaskStatus(taskId, status) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = status.toUpperCase();
            await this.savePAD();
        }
    }

    /** @returns {Array<Object>} All tasks. */
    getTasks() { return this.state.tasks; }
    
    /** @returns {Object|null} The first PENDING task found. */
    getNextTask() { return this.state.tasks.find(t => t.status === 'PENDING'); }
}
