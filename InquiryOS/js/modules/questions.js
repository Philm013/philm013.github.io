/**
 * @file questions.js
 * @description Logic for the SEP1 module: Asking Questions and Defining Problems.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';
import { SEPTipsLibrary, CCCTipsLibrary } from '../core/tips_library.js';

/**
 * Renders the Questions Practice module.
 */
export function renderQuestionsModule() {
    const p = App.teacherSettings.phenomenon;
    const activeTab = App.uiState?.activeInquiryTab || 'notices';
    
    const categories = [
        { id: 'notices', label: 'Notices', icon: 'mdi:eye', color: 'blue', action: 'window.addNotice()', inputId: 'noticeInput', listRenderer: renderNoticesList },
        { id: 'wonders', label: 'Wonders', icon: 'mdi:lightbulb', color: 'yellow', action: 'window.addWonder()', inputId: 'wonderInput', listRenderer: renderWondersList },
        { id: 'ideas', label: 'Ideas', icon: 'mdi:thought-bubble', color: 'purple', action: 'window.addIdea()', inputId: 'ideaInput', listRenderer: renderIdeasList }
    ];

    return `
        <div class="panels-container">
            <!-- 1. Phenomenon Panel -->
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Phenomenon">
                ${renderModuleHeader('Phenomenon', 'mdi:help-circle', 'SEP1', '', 'Observe the mystery and gather initial facts.')}

                <div class="panel-content space-y-4 overflow-y-auto">
                    <p class="text-sm md:text-base text-gray-700 leading-relaxed font-medium italic">"${p.description || 'Observe and document your thoughts.'}"</p>
                    ${p.media?.length > 0 ? `
                        <div class="grid grid-cols-2 gap-2">
                            ${p.media.slice(0, 4).map(m => `
                                <button onclick="window.viewMediaDetail('${m.id}')" class="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 active:scale-95 transition-all">
                                    <img src="${m.thumb}" class="w-full h-full object-cover" loading="lazy">
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="flex flex-wrap gap-1">
                        ${(p.ngssStandards || []).map(s => `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black border border-blue-100 uppercase">${s}</span>`).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 2. Overhauled Inquiry Board -->
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Inquiry Board">
                ${renderModuleHeader('Inquiry Board', 'mdi:bulletin-board', 'SEP1', '', 'Document observations, questions, and initial ideas.')}
                
                <div class="flex-1 flex flex-col min-h-0 bg-gray-50/30">
                    <div class="grid grid-cols-3 gap-px bg-gray-200 border-b shrink-0">
                        ${categories.map(cat => `
                            <button onclick="window.switchInquiryTab('${cat.id}')" 
                                class="py-3 px-2 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === cat.id ? 'bg-white text-primary' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}">
                                ${cat.label}
                            </button>
                        `).join('')}
                    </div>

                    <div class="flex-1 overflow-y-auto p-4">
                        <div class="space-y-3">
                            ${categories.find(c => c.id === activeTab).listRenderer()}
                        </div>
                    </div>

                    <div class="p-4 bg-white border-t border-gray-100 shrink-0">
                        <div class="flex gap-2">
                            <input type="text" id="activeInquiryInput" 
                                placeholder="Add ${activeTab}..." 
                                class="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
                                onkeypress="if(event.key==='Enter') window.quickAddInquiry()">
                            <button onclick="window.quickAddInquiry()" 
                                class="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg active:scale-95 transition-all">
                                <span class="iconify text-lg" data-icon="mdi:plus" data-width="20" data-height="20"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 3. Driving Questions Panel -->
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Driving Questions">
                ${renderModuleHeader('Focus Questions', 'mdi:compass', 'SEP1', '', 'Define the main mystery you want to solve.')}
                
                <div class="panel-content space-y-6 overflow-y-auto">
                    <div class="space-y-2">
                        <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Main Mystery</label>
                        <textarea onchange="window.saveMainQuestion(this.value)"
                            placeholder="What is the core mystery?"
                            class="w-full px-4 py-3 bg-purple-50/30 border-2 border-purple-100 rounded-xl text-sm font-bold text-gray-900 focus:border-purple-500 focus:bg-white outline-none transition-all shadow-inner"
                            rows="2">${App.work.mainQuestion || ''}</textarea>
                    </div>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Supporting Inquiries</label>
                            <button onclick="window.addSubQuestion()" class="p-1 text-purple-600 hover:bg-purple-50 rounded-lg">
                                <span class="iconify" data-icon="mdi:plus-circle" data-width="16" data-height="16"></span>
                            </button>
                        </div>
                        <div class="space-y-2">
                            ${(App.work.subQuestions || []).map((q) => `
                                <div class="flex items-center gap-2 group">
                                    <input type="text" value="${q.text}" onchange="window.updateSubQuestion('${q.id}', this.value)" 
                                        class="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium outline-none focus:border-purple-300" placeholder="Supporting question...">
                                    <button onclick="window.deleteSubQuestion('${q.id}')" class="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><span class="iconify text-lg" data-icon="mdi:close-circle"></span></button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.quickAddInquiry = () => {
    const activeTab = App.uiState?.activeInquiryTab || 'notices';
    const input = document.getElementById('activeInquiryInput');
    const val = input?.value.trim();
    if (!val) return;

    const map = { notices: 'notices', wonders: 'wonders', ideas: 'ideas' };
    const category = map[activeTab];
    if (!App.work[category]) App.work[category] = [];
    
    App.work[category].push({ id: (category[0] + '_' + Date.now()), text: val, time: Date.now(), tags: [] });
    input.value = '';
    saveAndBroadcast(category, App.work[category]);
    renderStudentContent();
};

window.switchInquiryTab = (tabId) => {
    if (!App.uiState) App.uiState = {};
    App.uiState.activeInquiryTab = tabId;
    renderStudentContent();
};

function renderInquiryItem(item, category, color) {
    return `
        <div class="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-${color}-200 transition-all group relative">
            <p class="text-xs font-bold text-gray-700 leading-snug cursor-pointer pr-6" onclick="window.editInquiryItem('${item.id}', '${category}')">"${item.text}"</p>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <button onclick="window.showTagPicker('${item.id}', '${category}')" class="text-[7px] font-black text-gray-400 uppercase tracking-widest hover:text-primary flex items-center gap-1">
                    <span class="iconify" data-icon="mdi:tag-outline" data-width="10" data-height="10"></span> ${item.tags?.length || 'Tag'}
                </button>
                ${category === 'wonders' ? `
                    <button onclick="window.promoteWonderToTestable('${item.id}')" class="text-[7px] font-black text-green-500 uppercase tracking-widest hover:bg-green-50 px-1.5 py-0.5 rounded">Promote</button>
                ` : ''}
            </div>
            <button onclick="window.deleteInquiryItem('${category}', '${item.id}')" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-200 hover:text-red-500">
                <span class="iconify" data-icon="mdi:close-circle" data-width="14" data-height="14"></span>
            </button>
        </div>
    `;
}

export function renderNoticesList() { return (App.work.notices || []).map(n => renderInquiryItem(n, 'notices', 'blue')).join('') || `<p class="text-[9px] text-gray-300 text-center py-4 uppercase font-black">No notices</p>`; }
export function renderWondersList() { return (App.work.wonders || []).map(w => renderInquiryItem(w, 'wonders', 'amber')).join('') || `<p class="text-[9px] text-gray-300 text-center py-4 uppercase font-black">No wonders</p>`; }
export function renderIdeasList() { return (App.work.ideas || []).map(i => renderInquiryItem(i, 'ideas', 'purple')).join('') || `<p class="text-[9px] text-gray-300 text-center py-4 uppercase font-black">No ideas</p>`; }
export function renderTestableQuestionsList() { return (App.work.testableQuestions || []).map(q => renderInquiryItem(q, 'testableQuestions', 'green')).join('') || `<p class="text-[9px] text-gray-300 text-center py-4 uppercase font-black">No testable questions</p>`; }

export async function saveMainQuestion(val) { App.work.mainQuestion = val; await saveAndBroadcast('mainQuestion', val); }
export async function addSubQuestion() { if (!App.work.subQuestions) App.work.subQuestions = []; App.work.subQuestions.push({ id: 'sq_' + Date.now(), text: '' }); renderStudentContent(); }
export async function updateSubQuestion(id, val) { const q = App.work.subQuestions.find(x => x.id === id); if (q) q.text = val; await saveAndBroadcast('subQuestions', App.work.subQuestions); }
export async function deleteSubQuestion(id) { App.work.subQuestions = App.work.subQuestions.filter(x => x.id !== id); await saveAndBroadcast('subQuestions', App.work.subQuestions); renderStudentContent(); }
export async function deleteInquiryItem(category, id) { App.work[category] = App.work[category].filter(i => i.id !== id); await saveAndBroadcast(category, App.work[category]); renderStudentContent(); }
export async function promoteWonderToTestable(id) { const wonder = App.work.wonders.find(w => w.id === id); if (!wonder) return; if (!App.work.testableQuestions) App.work.testableQuestions = []; App.work.testableQuestions.push({ id: 'tq_' + Date.now(), text: wonder.text, time: Date.now(), tags: [] }); await saveAndBroadcast('testableQuestions', App.work.testableQuestions); renderStudentContent(); toast('Promoted!', 'success'); }
export async function editInquiryItem(id, category) { const list = App.work[category]; const item = list.find(i => i.id === id); if (!item) return; window.openGenericInput('Edit Contribution', 'Update your thoughts...', item.text, async (newText) => { if (newText === null || newText === undefined) return; if (!newText.trim()) App.work[category] = list.filter(i => i.id !== id); else item.text = newText.trim(); await saveAndBroadcast(category, App.work[category]); renderStudentContent(); }); }

/**
 * Toggles a tag on an inquiry contribution.
 */
export async function toggleContributionTag(id, category, tagId) {
    const list = App.work[category];
    const item = list.find(i => i.id === id);
    if (!item) return;

    if (!item.tags) item.tags = [];
    const idx = item.tags.indexOf(tagId);
    if (idx > -1) item.tags.splice(idx, 1);
    else item.tags.push(tagId);

    await saveAndBroadcast(category, App.work[category]);
    showTagPicker(id, category); // Refresh picker UI
    renderStudentContent(); // Refresh main UI
}

/**
 * Opens the tag picker for a contribution.
 */
export function showTagPicker(id, category) {
    const item = App.work[category]?.find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('tagPickerModal');
    const content = document.getElementById('tagPickerContent');
    if (!modal || !content) return;

    const currentTags = item.tags || [];

    let html = `
        <div class="space-y-6">
            <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <p class="text-xs font-bold text-gray-700 italic">"${item.text}"</p>
            </div>
            
            <div class="space-y-4">
                <h4 class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Practice 1: Asking Questions</h4>
                <div class="grid grid-cols-1 gap-2">
                    ${SEPTipsLibrary['SEP1'].elements.map(tag => {
                        const active = currentTags.includes(tag.id);
                        return `
                            <button onclick="window.toggleContributionTag('${id}', '${category}', '${tag.id}')" 
                                class="flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${active ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-gray-50 text-gray-600 hover:border-blue-100'} text-left">
                                <span class="iconify text-xl" data-icon="${active ? 'mdi:check-circle' : 'mdi:tag-outline'}"></span>
                                <div>
                                    <p class="text-[10px] font-black uppercase tracking-tight">${tag.label}</p>
                                    <p class="text-[8px] opacity-70 leading-tight">${tag.mindset}</p>
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="space-y-4">
                <h4 class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Crosscutting Concepts</h4>
                <div class="grid grid-cols-2 gap-2">
                    ${Object.entries(CCCTipsLibrary).map(([, ccc]) => {
                        const tag = ccc.elements[0]; // Just use the first element of each CCC for now as a tag
                        const active = currentTags.includes(tag.id);
                        return `
                            <button onclick="window.toggleContributionTag('${id}', '${category}', '${tag.id}')" 
                                class="flex flex-col gap-1 p-3 rounded-xl border-2 transition-all ${active ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-gray-50 text-gray-600 hover:border-green-100'} text-left">
                                <div class="flex items-center gap-2">
                                    <span class="iconify" data-icon="${ccc.icon}"></span>
                                    <p class="text-[9px] font-black uppercase tracking-tight">${ccc.title}</p>
                                </div>
                                <p class="text-[8px] opacity-70 leading-tight">${tag.mindset}</p>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    content.innerHTML = html;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.closeTagPicker = () => {
    const modal = document.getElementById('tagPickerModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};
