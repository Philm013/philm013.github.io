/**
 * @file explanations.js
 * @description Logic for the SEP6 module: Constructing Explanations. 
 * Implements the Claim-Evidence-Reasoning (CER) framework and links evidence artifacts.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';

/**
 * Renders the Explanations Practice module (CER workspace).
 * @returns {string} HTML content for the module.
 */
export function renderExplanationsModule() {
    return `
        <div class="max-w-5xl mx-auto">
            ${renderModuleHeader('Constructing Explanations (CER)', 'mdi:lightbulb-on', 'SEP6')}
            
            <div class="grid md:grid-cols-3 gap-6">
                <div class="bg-white rounded-xl shadow-sm border p-4">
                    <h3 class="font-semibold text-gray-900 mb-4">Select Evidence</h3>
                    <div class="space-y-2 max-h-96 overflow-y-auto custom-scrollbar" id="evidenceSelectionBank">
                        ${renderEvidenceSelectionBank()}
                    </div>
                </div>
                
                <div class="md:col-span-2 space-y-6">
                    ${renderCerField('Claim', 'C', 'red', 'My claim is...', App.work.claim, 'window.saveClaim')}
                    ${renderCerField('Evidence', 'E', 'blue', 'According to my data...', App.work.evidenceText, 'window.saveEvidenceText')}
                    ${renderCerField('Reasoning', 'R', 'green', 'This evidence supports my claim because...', App.work.reasoning, 'window.saveReasoning')}
                    
                    <div class="bg-white rounded-xl shadow-sm border p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <span class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-lg">M</span>
                                <h3 class="font-semibold text-gray-900">Model Explanations</h3>
                            </div>
                            <button onclick="window.showStudentModule('models')" class="text-xs text-primary font-bold hover:underline">View Model →</button>
                        </div>
                        <div class="space-y-4">
                            ${renderModelExplanationSummary()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the bank of evidence artifacts available for selection.
 * @returns {string} HTML content.
 */
function renderEvidenceSelectionBank() {
    const evidence = App.work.evidence || [];
    if (evidence.length === 0) {
        return `
            <div class="text-center py-8 text-gray-400">
                <span class="iconify text-3xl" data-icon="mdi:folder-open"></span>
                <p class="mt-2 text-sm">No evidence yet</p>
            </div>
        `;
    }
    
    return evidence.map(e => `
        <div onclick="window.toggleEvidenceSelection('${e.id}')" 
            class="evidence-card p-3 rounded-lg border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(e.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
            <div class="flex items-center gap-2">
                <span class="iconify text-lg text-purple-600" data-icon="${e.icon || 'mdi:file-document'}"></span>
                <span class="font-medium text-sm text-gray-900">${e.title}</span>
            </div>
            <p class="text-[10px] text-gray-500 mt-1 line-clamp-1">${e.description}</p>
        </div>
    `).join('');
}

/**
 * Renders a specific CER field (Claim, Evidence, or Reasoning).
 * @param {string} label - Field label.
 * @param {string} initial - Initial letter (C, E, or R).
 * @param {string} color - Color theme (red, blue, or green).
 * @param {string} placeholder - Textarea placeholder.
 * @param {string} value - Current value.
 * @param {string} onchange - Global function name to call on change.
 * @returns {string} HTML content.
 */
function renderCerField(label, initial, color, placeholder, value, onchange) {
    return `
        <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="w-10 h-10 bg-${color}-100 text-${color}-600 rounded-full flex items-center justify-center font-bold text-lg">${initial}</span>
                <h3 class="font-semibold text-gray-900">${label}</h3>
            </div>
            <textarea rows="3" 
                class="w-full px-4 py-3 border-2 border-${color}-200 rounded-lg focus:border-${color}-500 focus:outline-none transition-colors"
                placeholder="${placeholder}"
                onchange="${onchange}(this.value)">${value || ''}</textarea>
        </div>
    `;
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
