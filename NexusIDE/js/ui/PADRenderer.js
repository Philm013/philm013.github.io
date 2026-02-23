/**
 * @file PADRenderer.js
 * @description Handles the visualization and interactive management of the Project Architecture Document (PAD).
 * Bridges the PAD state into reactive Tailwind-based UI components.
 */

/**
 * Renderer component for the Project Architecture Document.
 * Supports both full-page detail views and compact sidebar summaries.
 */
export class PADRenderer {
    /**
     * Creates a new PADRenderer instance.
     * @param {Object} nexus - The main IDE controller instance.
     */
    constructor(nexus) {
        this.nexus = nexus;
    }

    /**
     * Renders the full detail PAD into a container.
     * @param {HTMLElement} container 
     * @param {Object} state - The PAD state data.
     */
    render(container, state) {
        if (!container) return;
        container.innerHTML = this.getHTML(state, 'full');
    }

    /**
     * Renders a compact summary of the PAD (primarily used in the AI drawer).
     * @param {HTMLElement} container 
     * @param {Object} state - The PAD state data.
     */
    renderSummary(container, state) {
        if (!container) return;
        container.innerHTML = this.getHTML(state, 'summary');
    }

    /**
     * Generates the HTML string for the PAD based on current state and mode.
     * 
     * @param {Object} state - The internal PAD data from PADService.
     * @param {string} [mode='full'] - 'full' | 'summary'.
     * @returns {string} Tailwind-enabled HTML content.
     */
    getHTML(state, mode = 'full') {
        const isFull = mode === 'full';

        /** @private */
        const formatText = (text) => {
            if (!text) return '';
            const escaped = text.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            return escaped.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
        };
        
        /** @private */
        const getStatusBadge = (id, status, type) => {
            const s = status?.toUpperCase() || 'PENDING';
            const colors = { 
                'PENDING': 'bg-slate-500/10 text-slate-500 border-slate-500/20', 
                'IN PROGRESS': 'bg-amber-500/10 text-amber-500 border-amber-500/20', 
                'IN-PROGRESS': 'bg-amber-500/10 text-amber-500 border-amber-500/20', 
                'COMPLETED': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', 
                'DONE': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', 
                'PLANNING': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                'CODING': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                'REFINING': 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            };
            
            const onclick = isFull ? `onclick="window.Nexus.cyclePADStatus('${id}', '${s}', '${type}')"` : '';
            const cursor = isFull ? 'cursor-pointer hover:scale-105' : 'cursor-default';

            return `
                <button ${onclick} 
                        class="px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter transition-all active:scale-95 ${cursor} ${colors[s] || colors['PENDING']}">
                    ${s}
                </button>
            `;
        };

        const objectiveHtml = `
            <div class="${isFull ? 'p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-xl shadow-indigo-500/20' : 'p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20'} relative overflow-hidden">
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-xl ${isFull ? 'bg-white/20' : 'bg-indigo-600/20'} backdrop-blur-md flex items-center justify-center ${isFull ? 'text-white' : 'text-indigo-400'}">
                                <i class="fa-solid fa-map"></i>
                            </div>
                            <h2 class="${isFull ? 'text-xl text-white' : 'text-sm text-indigo-400'} font-black tracking-tight">${isFull ? 'Project Roadmap' : 'Objective'}</h2>
                        </div>
                        <div class="flex items-center gap-2">
                            ${getStatusBadge('project-status', state.status, 'project')}
                            ${!isFull ? `<button id="btn-ai-rearch" class="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all" title="Autonomous Re-Architecture"><i class="fa-solid fa-wand-magic-sparkles"></i></button>` : ''}
                        </div>
                    </div>
                    <div class="${isFull ? 'text-indigo-100 text-xs border-l-2 border-white/30' : 'text-slate-300 text-[11px] border-l border-indigo-500/30'} italic leading-relaxed pl-3 py-1" ${isFull ? 'contenteditable="true" onblur="window.Nexus.updatePADObjective(this)"' : ''}>
                        "${formatText(state.objective) || (isFull ? 'No objective set. Click to edit.' : 'No objective set.')}"
                    </div>
                </div>
                ${isFull ? '<div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>' : ''}
            </div>
        `;

        const storiesHtml = (state.userStories?.length > 0 || isFull) ? `
            <section>
                <div class="flex items-center justify-between px-2 mb-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <i class="fa-solid fa-users text-accent"></i> 1. User Stories
                    </h3>
                    ${isFull ? `<button class="p-1 text-accent hover:text-white transition-colors" onclick="window.Nexus.prepareChat('Add a new user story to my PAD: [Describe story here]', 'pad')"><i class="fa-solid fa-circle-plus"></i></button>` : ''}
                </div>
                <div class="grid gap-3">
                    ${state.userStories?.map(s => `
                        <div class="p-4 ${isFull ? 'bg-card border-main' : 'bg-slate-800/30 border-slate-800'} border rounded-2xl group hover:border-accent/30 transition-all shadow-sm">
                            <div class="flex justify-between items-start gap-4 mb-2">
                                <span class="text-[9px] font-black text-accent font-mono tracking-tighter">${s.featureid || s.id || 'F'}</span>
                                ${getStatusBadge(s.featureid || s.id, s.status, 'story')}
                            </div>
                            <div class="text-[11px] ${isFull ? 'font-bold text-main' : 'text-slate-300'} leading-snug" ${isFull ? `contenteditable="true" onblur="window.Nexus.updatePADStory('${s.featureid || s.id}', this)"` : ''}>
                                ${formatText(s.userstory) || ''}
                            </div>
                            ${!isFull ? `<div class="mt-2 text-[9px] opacity-50">Priority: ${s.priority || 'P1'}</div>` : ''}
                        </div>
                    `).join('') || '<div class="p-8 text-center text-slate-600 text-[10px] italic border-2 border-dashed border-main rounded-2xl">No stories defined.</div>'}
                </div>
            </section>
        ` : '';

        const blueprintHtml = (state.files?.length > 0 || state.contracts?.length > 0 || isFull) ? `
            <section>
                <div class="flex items-center justify-between px-2 mb-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <i class="fa-solid fa-layer-group text-indigo-500"></i> 2. Technical Blueprint
                    </h3>
                </div>
                <div class="space-y-4">
                    <div class="p-4 ${isFull ? 'bg-card border-main' : 'bg-slate-800/30 border-slate-800'} border rounded-2xl shadow-sm">
                        <div class="text-[9px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <i class="fa-solid fa-folder-tree text-[8px]"></i> File Architecture
                        </div>
                        <div class="space-y-2">
                            ${state.files?.map(f => `
                                <div class="text-[10px] font-mono flex items-start gap-2">
                                    <span class="text-indigo-400 font-bold shrink-0">${f.file || ''}</span>
                                    <span class="text-slate-500 leading-tight">${formatText(f.description) || ''}</span>
                                </div>
                            `).join('') || '<div class="text-[10px] italic text-slate-600">No files listed.</div>'}
                        </div>
                    </div>
                    
                    ${state.contracts?.length > 0 ? `
                    <div class="p-4 ${isFull ? 'bg-card border-main' : 'bg-slate-800/30 border-slate-800'} border rounded-2xl shadow-sm">
                        <div class="text-[9px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <i class="fa-solid fa-code text-[8px]"></i> Function Contracts
                        </div>
                        <div class="space-y-3">
                            ${state.contracts.map(c => `
                                <div class="font-mono">
                                    <div class="text-[10px] font-bold text-emerald-400">${c.function || ''}()</div>
                                    <div class="text-[8px] text-slate-500 mt-0.5">File: ${c.file || ''}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>` : ''}
                </div>
            </section>
        ` : '';

        const implementationHtml = `
            <section>
                <div class="flex items-center justify-between px-2 mb-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <i class="fa-solid fa-list-check text-emerald-500"></i> 3. Implementation
                    </h3>
                    ${isFull ? `<button class="p-1 text-emerald-500 hover:text-white transition-colors" onclick="window.Nexus.prepareChat('Add a new task to my implementation plan: [Describe task here]', 'pad')"><i class="fa-solid fa-circle-plus"></i></button>` : ''}
                </div>
                <div class="space-y-3">
                    ${state.tasks?.map(t => `
                        <div class="p-4 ${isFull ? 'bg-card border-main' : 'bg-slate-800/50 border-slate-700'} border rounded-2xl group hover:border-emerald-500/30 transition-all shadow-sm relative ${!isFull && (t.status === 'COMPLETED' || t.status === 'DONE') ? 'opacity-40 grayscale' : ''}">
                            <div class="flex justify-between items-center mb-3">
                                <div class="flex items-center gap-2">
                                    <div class="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-500">${t.id}</div>
                                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-tighter">${t.feature || 'Task'}</span>
                                </div>
                                ${getStatusBadge(t.id, t.status, 'task')}
                            </div>
                            <div class="text-[11px] font-bold ${isFull ? 'text-main' : 'text-white'} mb-2 leading-relaxed" ${isFull ? `contenteditable="true" onblur="window.Nexus.updatePADTask('${t.id}', this, 'action')"` : ''}>
                                ${formatText(t.action) || ''}
                            </div>
                            <div class="flex items-center gap-2 text-[8px] text-slate-500 font-mono">
                                <i class="fa-regular fa-file-code"></i>
                                <span ${isFull ? `contenteditable="true" onblur="window.Nexus.updatePADTask('${t.id}', this, 'files')"` : ''}>${formatText(t.files) || ''}</span>
                            </div>
                        </div>
                    `).join('') || '<div class="p-8 text-center text-slate-600 text-[10px] italic border-2 border-dashed border-main rounded-2xl">Plan is empty.</div>'}
                </div>
            </section>
        `;

        const nextStepsHtml = (state.nextSteps?.length > 0 || isFull) ? `
            <section>
                <div class="px-2 mb-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <i class="fa-solid fa-forward text-amber-500"></i> 4. Next Steps
                    </h3>
                </div>
                <div class="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                    ${state.nextSteps?.length > 0 ? `
                    <ul class="space-y-3">
                        ${state.nextSteps.map(step => `
                            <li class="flex items-start gap-3">
                                <div class="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                                <div class="text-xs text-slate-300 leading-relaxed">${formatText(step)}</div>
                            </li>
                        `).join('')}
                    </ul>` : '<div class="text-xs text-slate-600 italic">No next steps defined.</div>'}
                </div>
            </section>
        ` : '';

        const executionLogHtml = isFull ? `
            <section class="opacity-60">
                <div class="px-2 mb-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <i class="fa-solid fa-history"></i> 5. Execution Log
                    </h3>
                </div>
                <div class="space-y-2">
                    ${state.executionLog?.map(log => `
                        <div class="p-3 border-b border-main flex justify-between items-center gap-4">
                            <div class="text-[8px] font-mono text-slate-500 shrink-0">${log.timestamp || ''}</div>
                            <div class="text-[9px] text-slate-400 truncate text-right">${formatText(log.note) || ''}</div>
                        </div>
                    `).join('') || ''}
                </div>
            </section>
        ` : '';

        return `
            <div class="${isFull ? 'p-4 pb-32 space-y-8 bg-main min-h-full' : 'space-y-6 pb-10'}">
                ${objectiveHtml}
                ${storiesHtml}
                ${blueprintHtml}
                ${implementationHtml}
                ${nextStepsHtml}
                ${executionLogHtml}
            </div>
        `;
    }
}
