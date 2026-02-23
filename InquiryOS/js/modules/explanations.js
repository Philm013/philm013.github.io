/**
 * @file explanations.js
 * @description Logic for the SEP6 module: Constructing Explanations. 
 * Implements the Claim-Evidence-Reasoning (CER) framework and links evidence artifacts.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader, renderEmptyState, renderSectionHeader } from '../ui/renderer.js';

/**
 * Renders the Explanations Practice module (CER workspace).
 * @returns {string} HTML content for the module.
 */
export function renderExplanationsModule() {
    return `
        <div class="max-w-6xl mx-auto">
            ${renderModuleHeader('Constructing Explanations', 'mdi:lightbulb-on', 'SEP6')}
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div class="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 flex flex-col overflow-hidden h-full lg:sticky lg:top-4" data-card-title="Evidence Bank">
                    <div class="flex items-center justify-between mb-8">
                        ${renderSectionHeader('Evidence Bank', 'mdi:folder-star', 'purple')}
                        <span class="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">${(App.work.evidence || []).length + (App.work.modelExplanations || []).length + (App.work.modelGeneralExplanation ? 1 : 0)} Items</span>
                    </div>
                    <div class="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar" id="evidenceSelectionBank">
                        ${renderEvidenceSelectionBank()}
                    </div>
                    <p class="text-[10px] text-gray-400 mt-6 leading-relaxed italic border-t border-gray-50 pt-4">Select items to link them to your explanation. Save work from other modules to build your bank.</p>
                </div>
                
                <div class="lg:col-span-2 space-y-8">
                    <div data-card-title="Claim">
                        ${renderCerField('Scientific Claim', 'C', 'red', 'Based on your inquiry, what is the answer to your driving question?', App.work.claim, 'window.saveClaim', 'A clear, concise statement that answers the investigation question.')}
                    </div>
                    <div data-card-title="Evidence">
                        ${renderCerField('Evidence Description', 'E', 'blue', 'According to my data and observations...', App.work.evidenceText, 'window.saveEvidenceText', 'Specific data and observations that support your claim.')}
                    </div>
                    <div data-card-title="Reasoning">
                        ${renderCerField('Reasoning & Justification', 'R', 'green', 'This evidence supports my claim because...', App.work.reasoning, 'window.saveReasoning', 'Explain how the evidence logically supports the claim using scientific principles.')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderEvidenceSelectionBank() {
    const evidence = App.work.evidence || [];
    const modelExps = App.work.modelExplanations || [];
    const generalExp = App.work.modelGeneralExplanation;
    
    let html = '';

    // 1. Regular Evidence
    html += evidence.map(e => `
        <div onclick="window.toggleEvidenceSelection('${e.id}')" 
            class="evidence-card p-4 rounded-2xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(e.id) ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-50 bg-white hover:border-purple-200 hover:shadow-sm'}">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-purple-600 shadow-inner">
                    <span class="iconify" data-icon="${e.icon || 'mdi:file-document'}"></span>
                </div>
                <span class="font-bold text-sm text-gray-800 flex-1 truncate">${e.title}</span>
                ${App.work.selectedEvidence?.includes(e.id) ? '<span class="iconify text-purple-600" data-icon="mdi:check-circle"></span>' : ''}
            </div>
            <p class="text-[10px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">${e.description}</p>
        </div>
    `).join('');

    // 2. Model General Explanation
    if (generalExp) {
        const id = 'exp_general';
        html += `
            <div onclick="window.toggleEvidenceSelection('${id}')" 
                class="evidence-card p-4 rounded-2xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(id) ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-50 bg-white hover:border-blue-200 hover:shadow-sm'}">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-blue-600 shadow-inner">
                        <span class="iconify" data-icon="mdi:comment-quote"></span>
                    </div>
                    <span class="font-bold text-sm text-gray-800 flex-1 truncate">Model Overview</span>
                    ${App.work.selectedEvidence?.includes(id) ? '<span class="iconify text-blue-600" data-icon="mdi:check-circle"></span>' : ''}
                </div>
                <p class="text-[10px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">${generalExp}</p>
            </div>
        `;
    }

    // 3. Model Points
    html += modelExps.filter(x => x.text).map((exp, i) => {
        const id = 'exp_' + exp.id;
        return `
            <div onclick="window.toggleEvidenceSelection('${id}')" 
                class="evidence-card p-4 rounded-2xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(id) ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-gray-50 bg-white hover:border-amber-200 hover:shadow-sm'}">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-amber-600 shadow-inner">
                        <span class="text-[10px] font-black">${i + 1}</span>
                    </div>
                    <span class="font-bold text-sm text-gray-800 flex-1 truncate">Model Point #${i + 1}</span>
                    ${App.work.selectedEvidence?.includes(id) ? '<span class="iconify text-amber-600" data-icon="mdi:check-circle"></span>' : ''}
                </div>
                <p class="text-[10px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">${exp.text}</p>
            </div>
        `;
    }).join('');

    if (!html) {
        return renderEmptyState('No Evidence Bank', 'Save work from other modules to build your bank.', 'mdi:folder-open-outline');
    }
    
    return html;
}


/**
 * Renders a summary of explanations provided in the Models module.
 * @returns {string} HTML content.
 */
function renderModelExplanationSummary() {
    let html = '';
    if (App.work.modelGeneralExplanation) {
        html += `
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p class="text-[10px] font-bold text-blue-400 uppercase mb-1">Overall Model</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">${App.work.modelGeneralExplanation}</p>
            </div>
        `;
    }
    
    const points = (App.work.modelExplanations || []).filter(x => x.text);
    if (points.length > 0) {
        html += points.map((exp, i) => `
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Point #${i + 1}</p>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">${exp.text}</p>
            </div>
        `).join('');
    }
    
    return html || '<p class="text-sm text-gray-400 italic">No model explanations written yet. Go to the Models module to add them.</p>';
}

/**
 * Links or unlinks a specific evidence artifact from the Evidence Bank to the current explanation.
 * @param {string} id - The ID of the evidence artifact.
 */
export async function toggleEvidenceSelection(id) {
    if (!App.work.selectedEvidence) App.work.selectedEvidence = [];
    const index = App.work.selectedEvidence.indexOf(id);
    if (index > -1) {
        App.work.selectedEvidence.splice(index, 1);
    } else {
        App.work.selectedEvidence.push(id);
    }
    await saveAndBroadcast('selectedEvidence', App.work.selectedEvidence);
    renderStudentContent();
}

/**
 * Persists the claim text to the application state and broadcasts it.
 * @param {string} text - The claim text.
 */
export async function saveClaim(text) {
    App.work.claim = text;
    await saveAndBroadcast('claim', text);
}

/**
 * Persists the evidence description text to the application state and broadcasts it.
 * @param {string} text - The evidence description.
 */
export async function saveEvidenceText(text) {
    App.work.evidenceText = text;
    await saveAndBroadcast('evidenceText', text);
}

/**
 * Persists the reasoning text to the application state and broadcasts it.
 * @param {string} text - The reasoning text.
 */
export async function saveReasoning(text) {
    App.work.reasoning = text;
    await saveAndBroadcast('reasoning', text);
}

/**
 * Helper to render a CER field with consistent styling and behavior.
 */
function renderCerField(label, initial, color, placeholder, value, onInput, tip) {
    const colorClasses = {
        red: 'border-red-100 bg-red-50/30 text-red-600',
        blue: 'border-blue-100 bg-blue-50/30 text-blue-600',
        green: 'border-green-100 bg-green-50/30 text-green-600'
    }[color];

    const ringClasses = {
        red: 'focus:ring-red-500/20 focus:border-red-500',
        blue: 'focus:ring-blue-500/20 focus:border-blue-500',
        green: 'focus:ring-green-500/20 focus:border-green-500'
    }[color];

    return `
        <div class="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${color}-500/5 to-transparent rounded-full -mr-16 -mt-16"></div>
            
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 rounded-2xl ${colorClasses} border flex items-center justify-center font-black text-2xl shadow-sm">
                        ${initial}
                    </div>
                    <div>
                        <h4 class="text-xl font-black text-gray-900">${label}</h4>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">${tip}</p>
                    </div>
                </div>
            </div>

            <div class="relative">
                <textarea 
                    oninput="${onInput}(this.value)"
                    placeholder="${placeholder}"
                    class="w-full min-h-[180px] p-8 bg-gray-50/50 border-2 border-gray-100 rounded-[2rem] text-lg font-medium text-gray-700 placeholder:text-gray-300 focus:outline-none focus:bg-white transition-all resize-none shadow-inner ${ringClasses}"
                >${value || ''}</textarea>
                
                <div class="absolute bottom-6 right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">Auto-saving to cloud</span>
                    <span class="iconify text-green-400 animate-pulse" data-icon="mdi:sync"></span>
                </div>
            </div>
        </div>
    `;
}
