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
            <!-- Evidence Bank Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Evidence Bank">
                <div class="p-2 md:p-0">
                    ${renderModuleHeader('Constructing Explanations', 'mdi:lightbulb-on', 'SEP6', '', 'Review and select your best work from other modules to use as evidence. Linked items help support your scientific claim with real data!')}
                </div>

                <div class="panel-content flex flex-col">
                    <div class="flex-1 overflow-y-auto space-y-3" id="evidenceSelectionBank">
                        ${renderEvidenceSelectionBank()}
                    </div>
                    <p class="text-[9px] text-gray-400 mt-4 italic text-center uppercase tracking-widest">Select items to link</p>
                </div>
            </div>
            
            ${renderCerField('Scientific Claim', 'C', 'red', 'Answer your question...', App.work.claim, 'window.saveClaim', 'A clear statement that answers the investigation.', 'A claim is a one-sentence statement that answers your driving question. It should not start with "I think."')}
            ${renderCerField('Evidence Description', 'E', 'blue', 'According to my data...', App.work.evidenceText, 'window.saveEvidenceText', 'Specific observations that support your claim.', 'Evidence is the data you collected. Use specific numbers or observations from your investigation!')}
            ${renderCerField('Reasoning', 'R', 'green', 'This supports my claim because...', App.work.reasoning, 'window.saveReasoning', 'Explain logic connecting evidence to claim.', 'Reasoning is the "bridge" that explains why your evidence supports your claim. It usually includes a scientific rule or principle.')}
        </div>
    `;
}

function renderEvidenceSelectionBank() {
    const evidence = App.work.evidence || [], modelExps = App.work.modelExplanations || [], generalExp = App.work.modelGeneralExplanation;
    let html = '';
    html += evidence.map(e => `<div onclick="window.toggleEvidenceSelection('${e.id}')" class="p-4 rounded-2xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(e.id) ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-50 bg-white hover:border-purple-200'}"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-purple-600 shadow-inner"><span class="iconify" data-icon="${e.icon || 'mdi:file-document'}"></span></div><span class="font-bold text-sm text-gray-800 flex-1 truncate">${e.title}</span>${App.work.selectedEvidence?.includes(e.id) ? '<span class="iconify text-purple-600" data-icon="mdi:check-circle"></span>' : ''}</div><p class="text-[10px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">${e.description}</p></div>`).join('');
    if (generalExp) { const id = 'exp_general'; html += `<div onclick="window.toggleEvidenceSelection('${id}')" class="p-4 rounded-2xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(id) ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-50 bg-white hover:border-blue-200'}"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-blue-600 shadow-inner"><span class="iconify" data-icon="mdi:comment-quote"></span></div><span class="font-bold text-sm text-gray-800 flex-1 truncate">Model Overview</span>${App.work.selectedEvidence?.includes(id) ? '<span class="iconify text-blue-600" data-icon="mdi:check-circle"></span>' : ''}</div><p class="text-[10px] text-gray-400 mt-2 line-clamp-2">${generalExp}</p></div>`; }
    html += modelExps.filter(x => x.text).map((exp, i) => { const id = 'exp_' + exp.id; return `<div onclick="window.toggleEvidenceSelection('${id}')" class="p-4 rounded-2xl border-2 cursor-pointer transition-all ${App.work.selectedEvidence?.includes(id) ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-gray-50 bg-white hover:border-amber-200'}"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-amber-600 shadow-inner"><span class="text-[10px] font-black">${i + 1}</span></div><span class="font-bold text-sm text-gray-800 flex-1 truncate">Model Point #${i + 1}</span>${App.work.selectedEvidence?.includes(id) ? '<span class="iconify text-amber-600" data-icon="mdi:check-circle"></span>' : ''}</div><p class="text-[10px] text-gray-400 mt-2 line-clamp-2">${exp.text}</p></div>`; }).join('');
    return html || renderEmptyState('No Evidence Bank', 'Save work from other modules.', 'mdi:folder-open-outline');
}

export async function toggleEvidenceSelection(id) { if (!App.work.selectedEvidence) App.work.selectedEvidence = []; const index = App.work.selectedEvidence.indexOf(id); if (index > -1) App.work.selectedEvidence.splice(index, 1); else App.work.selectedEvidence.push(id); await saveAndBroadcast('selectedEvidence', App.work.selectedEvidence); renderStudentContent(); }
export async function saveClaim(text) { App.work.claim = text; await saveAndBroadcast('claim', text); }
export async function saveEvidenceText(text) { App.work.evidenceText = text; await saveAndBroadcast('evidenceText', text); }
export async function saveReasoning(text) { App.work.reasoning = text; await saveAndBroadcast('reasoning', text); }

function renderCerField(label, initial, color, placeholder, value, onInput, tip, info) {
    const colors = { red: 'border-red-100 bg-red-50 text-red-600', blue: 'border-blue-100 bg-blue-50 text-blue-600', green: 'border-green-100 bg-green-50 text-green-600' }[color];
    return `
        <div class="bg-white border-b flex flex-col" data-card-title="${label}">
            <div class="sticky-panel-header md:hidden">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${colors} border flex items-center justify-center font-black text-xs">${initial}</div>
                    <h3 class="font-black text-gray-900 uppercase tracking-tight text-xs">${label}</h3>
                    ${info ? renderInfoTip(info) : ''}
                </div>
            </div>
            <div class="panel-content flex flex-col">
                <div class="flex items-center gap-2 mb-3 px-1">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${tip}</p>
                    ${info ? renderInfoTip(info) : ''}
                </div>
                <div class="flex-1 relative"><textarea oninput="${onInput}(this.value)" placeholder="${placeholder}" class="w-full h-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-base font-medium text-gray-700 outline-none focus:bg-white transition-all resize-none shadow-inner">${value || ''}</textarea></div>
            </div>
        </div>
    `;
}
