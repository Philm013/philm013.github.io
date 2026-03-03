/**
 * @file explanations.js
 * @description Logic for the SEP6 module: Constructing Explanations. 
 * Implements the Claim-Evidence-Reasoning (CER) framework and links evidence artifacts.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader, renderEmptyState } from '../ui/renderer.js';
import { renderInfoTip } from '../ui/utils.js';

export function renderExplanationsModule() {
    return `
        <div class="panels-container">
            <!-- CER Workspace with Integrated Evidence Bank -->
            <div class="bg-white border-b flex flex-col h-full col-span-full" data-card-title="CER Workspace">
                ${renderModuleHeader('Constructing Explanations', 'mdi:lightbulb-on', 'SEP6', '', 'A claim is a statement that answers your driving question. Evidence supports it, and Reasoning explains why.')}
                
                <div class="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                    <!-- Integrated Evidence Bank -->
                    <div class="w-full md:w-80 bg-gray-50/50 border-r flex flex-col shrink-0">
                        <div class="p-4 border-b bg-white/50">
                            <h4 class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Evidence Bank</h4>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            ${renderEvidenceSelectionBank()}
                        </div>
                        <div class="p-3 bg-white border-t text-[8px] text-gray-400 italic text-center uppercase tracking-tighter">
                            Select items to link
                        </div>
                    </div>

                    <!-- Input Workspace -->
                    <div class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                        ${renderCerFieldUnified('Scientific Claim', 'C', 'red', 'Answer your question...', App.work.claim, 'window.saveClaim', 'A clear statement that answers the investigation.')}
                        ${renderCerFieldUnified('Evidence Description', 'E', 'blue', 'According to my data...', App.work.evidenceText, 'window.saveEvidenceText', 'Specific observations that support your claim.')}
                        ${renderCerFieldUnified('Reasoning', 'R', 'green', 'This supports my claim because...', App.work.reasoning, 'window.saveReasoning', 'Explain logic connecting evidence to claim.')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCerFieldUnified(label, initial, color, placeholder, value, onInput, tip) {
    const colors = { red: 'border-red-100 bg-red-50 text-red-600', blue: 'border-blue-100 bg-blue-50 text-blue-600', green: 'border-green-100 bg-green-50 text-green-600' }[color];
    return `
        <div class="space-y-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg ${colors} border flex items-center justify-center font-black text-xs shrink-0">${initial}</div>
                <div class="flex-1">
                    <h4 class="font-black text-gray-900 uppercase tracking-tight text-[10px] md:text-xs leading-none">${label}</h4>
                    <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">${tip}</p>
                </div>
            </div>
            <textarea oninput="${onInput}(this.value)" placeholder="${placeholder}" 
                class="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm md:text-base font-medium text-gray-700 outline-none focus:bg-white focus:border-primary/30 transition-all resize-none shadow-inner min-h-[100px] md:min-h-[120px]">${value || ''}</textarea>
        </div>
    `;
}

function renderEvidenceSelectionBank() {
    const evidence = App.work.evidence || [], modelExps = App.work.modelExplanations || [], generalExp = App.work.modelGeneralExplanation;
    let html = '';
    html += evidence.map(e => `
        <div onclick="window.toggleEvidenceSelection('${e.id}')" 
            class="p-3 rounded-xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(e.id) ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-white bg-white hover:border-purple-100 shadow-sm'}">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-white border border-gray-100 flex items-center justify-center text-purple-600 shrink-0 shadow-inner">
                    <span class="iconify" data-icon="${e.icon || 'mdi:file-document'}" data-width="14" data-height="14"></span>
                </div>
                <span class="font-bold text-[10px] text-gray-800 flex-1 truncate">${e.title}</span>
                ${App.work.selectedEvidence?.includes(e.id) ? '<span class="iconify text-purple-600" data-icon="mdi:check-circle" data-width="14" data-height="14"></span>' : ''}
            </div>
        </div>
    `).join('');
    
    if (generalExp) { 
        const id = 'exp_general'; 
        html += `<div onclick="window.toggleEvidenceSelection('${id}')" class="p-3 rounded-xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(id) ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-white bg-white hover:border-blue-100 shadow-sm'}"><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-md bg-white border border-gray-100 flex items-center justify-center text-blue-600 shrink-0"><span class="iconify" data-icon="mdi:comment-quote" data-width="14" data-height="14"></span></div><span class="font-bold text-[10px] text-gray-800 flex-1 truncate">Model Overview</span></div></div>`; 
    }
    
    html += modelExps.filter(x => x.text).map((exp, i) => { 
        const id = 'exp_' + exp.id; 
        return `<div onclick="window.toggleEvidenceSelection('${id}')" class="p-3 rounded-xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(id) ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-white bg-white hover:border-amber-100 shadow-sm'}"><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-md bg-white border border-gray-100 flex items-center justify-center text-amber-600 shrink-0"><span class="text-[10px] font-black">${i + 1}</span></div><span class="font-bold text-[10px] text-gray-800 flex-1 truncate">Model Point #${i + 1}</span></div></div>`; 
    }).join('');
    
    return html || renderEmptyState('Empty', 'Save work to use as evidence.', 'mdi:folder-open-outline');
}

export async function toggleEvidenceSelection(id) { if (!App.work.selectedEvidence) App.work.selectedEvidence = []; const index = App.work.selectedEvidence.indexOf(id); if (index > -1) App.work.selectedEvidence.splice(index, 1); else App.work.selectedEvidence.push(id); await saveAndBroadcast('selectedEvidence', App.work.selectedEvidence); renderStudentContent(); }
export async function saveClaim(text) { App.work.claim = text; await saveAndBroadcast('claim', text); }
export async function saveEvidenceText(text) { App.work.evidenceText = text; await saveAndBroadcast('evidenceText', text); }
export async function saveReasoning(text) { App.work.reasoning = text; await saveAndBroadcast('reasoning', text); }
