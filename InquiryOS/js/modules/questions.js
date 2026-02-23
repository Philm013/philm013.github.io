/**
 * @file questions.js
 * @description Logic for the SEP1 module: Asking Questions and Defining Problems.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { renderNavigation } from '../ui/navigation.js';
import { toast } from '../ui/utils.js';

export function renderQuestionsModule() {
    const p = App.teacherSettings.phenomenon;
    const categories = [];
    
    // Default categories if enabled
    if (App.teacherSettings.defaultCategoriesEnabled !== false) {
        categories.push({ id: 'notices', label: 'I Notice...', icon: 'mdi:eye', color: 'blue', subtitle: 'Observations', action: 'window.addNotice()', inputId: 'noticeInput', listRenderer: renderNoticesList });
        categories.push({ id: 'wonders', label: 'I Wonder...', icon: 'mdi:lightbulb', color: 'yellow', subtitle: 'Questions', action: 'window.addWonder()', inputId: 'wonderInput', listRenderer: renderWondersList });
        categories.push({ id: 'ideas', label: 'Initial Ideas', icon: 'mdi:thought-bubble', color: 'purple', subtitle: 'Hypotheses', action: 'window.addIdea()', inputId: 'ideaInput', listRenderer: renderIdeasList });
        categories.push({ id: 'testableQuestions', label: 'Testable Questions', icon: 'mdi:comment-question', color: 'green', subtitle: 'Inquiries', action: 'window.addTestableQuestion()', inputId: 'testableQuestionInput', listRenderer: renderTestableQuestionsList });
    }

    // Custom categories
    const customCats = (App.teacherSettings.categories || []).map(cat => ({
        id: cat.id,
        label: cat.name,
        icon: 'mdi:folder-star',
        color: 'primary',
        hex: cat.color,
        subtitle: 'Theme',
        action: `window.addCustomItem('${cat.id}')`,
        inputId: `input_${cat.id}`,
        listRenderer: () => renderCustomList(cat.id, cat.color)
    }));

    const allCategories = [...categories, ...customCats];

    return `
        <div class="h-full flex flex-col space-y-6">
            <div class="shrink-0 px-2">
                ${renderModuleHeader('Asking Questions', 'mdi:help-circle', 'SEP1')}
            </div>
            
            <div class="shrink-0 bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-100 rounded-3xl p-6 shadow-sm relative overflow-hidden mx-2">
                <div class="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16"></div>
                <div class="flex flex-col md:flex-row gap-5 relative">
                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-amber-100 text-amber-50">
                        <span class="iconify text-2xl text-amber-500" data-icon="mdi:eye"></span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-lg font-black text-gray-900">${p.title || 'Scientific Phenomenon'}</h3>
                            <span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase tracking-widest">Focus</span>
                        </div>
                        <p class="text-sm text-gray-600 leading-relaxed max-w-4xl line-clamp-2 md:line-clamp-none">${p.description || 'Observe the provided scientific phenomenon and document your initial thoughts below.'}</p>
                    </div>
                </div>
            </div>
            
            <div class="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar pb-4">
                <div class="flex flex-nowrap gap-4 px-2 h-full items-stretch">
                    ${allCategories.map(cat => `
                        <div class="w-80 shrink-0 h-full">
                            ${renderInputCard(cat.label, cat.icon, cat.color, cat.inputId, cat.action, cat.listRenderer(), cat.subtitle, cat.hex)}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="shrink-0 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mx-2 mb-2">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-black text-gray-900 flex items-center gap-3">
                        <span class="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                            <span class="iconify text-lg" data-icon="mdi:compass"></span>
                        </span>
                        Driving Questions
                    </h3>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="md:col-span-1 space-y-2">
                        <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Main Question</label>
                        <div class="relative group">
                            <input type="text" value="${App.work.mainQuestion || ''}" 
                                onchange="window.saveMainQuestion(this.value)"
                                placeholder="Core mystery..."
                                class="w-full px-4 py-3 border-2 border-purple-100 bg-purple-50/30 rounded-xl text-sm font-bold text-gray-800 focus:border-purple-500 focus:bg-white focus:outline-none transition-all">
                        </div>
                    </div>

                    <div class="md:col-span-2 space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Supporting Inquiries</label>
                            <button onclick="window.addSubQuestion()" class="text-[9px] font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                <span class="iconify" data-icon="mdi:plus-circle"></span> Add
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2 max-h-24 overflow-y-auto no-scrollbar">
                            ${(App.work.subQuestions || []).map((q, i) => `
                                <div class="px-3 py-2 bg-gray-50 rounded-xl border border-transparent hover:border-purple-200 group transition-all flex items-center gap-2 max-w-[200px]">
                                    <input type="text" value="${q.text}" 
                                        onchange="window.updateSubQuestion('${q.id}', this.value)"
                                        placeholder="Specific aspect..."
                                        class="flex-1 bg-transparent border-none text-[11px] font-medium focus:outline-none text-gray-700 min-w-0">
                                    <button onclick="window.deleteSubQuestion('${q.id}')" class="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity flex-shrink-0">
                                        <span class="iconify" data-icon="mdi:close-circle"></span>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderInputCard(title, icon, color, inputId, onAction, content, subtitle = '', hex = '') {
    const borderStyle = hex ? `border-top: 4px solid ${hex};` : '';
    const iconStyle = hex ? `background: ${hex}10; color: ${hex};` : '';
    const btnStyle = hex ? `background: ${hex};` : '';

    return `
        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-full practice-card" style="${borderStyle}">
            <div class="p-4 border-b border-gray-50 flex items-center gap-3 shrink-0">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center ${hex ? '' : `bg-${color}-50 text-${color}-500`}" style="${iconStyle}">
                    <span class="iconify text-xl" data-icon="${icon}"></span>
                </div>
                <div>
                    <h3 class="font-bold text-gray-900 text-sm">${title}</h3>
                    <p class="text-[9px] text-gray-400 font-black uppercase tracking-widest">${subtitle}</p>
                </div>
            </div>
            <div class="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar bg-gray-50/20">
                ${content}
            </div>
            <div class="p-3 bg-white border-t border-gray-50 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="${inputId}" placeholder="Add..." 
                        class="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-${color}-500 focus:bg-white focus:outline-none transition-all"
                        onkeypress="if(event.key==='Enter')${onAction}">
                    <button onclick="${onAction}" class="w-8 h-8 flex items-center justify-center text-white rounded-xl hover:opacity-90 transition-all shadow-sm ${hex ? '' : `bg-${color}-500`}" style="${btnStyle}">
                        <span class="iconify" data-icon="mdi:plus"></span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

export function renderCustomList(catId, hex) {
    const list = App.work[catId] || [];
    if (!list.length) return `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale py-10">
            <span class="iconify text-4xl mb-2" data-icon="mdi:folder-outline"></span>
            <p class="text-[9px] font-black uppercase tracking-widest">Empty</p>
        </div>
    `;
    return list.map(item => `
        <div class="group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-primary/30 transition-all relative">
            <p class="text-sm text-gray-700 leading-relaxed cursor-pointer" onclick="window.editInquiryItem('${item.id}', '${catId}')">${item.text}</p>
            <button onclick="window.deleteCustomItem('${catId}', '${item.id}')" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                <span class="iconify" data-icon="mdi:close-circle"></span>
            </button>
        </div>
    `).join('');
}

export async function addCustomItem(catId) {
    const input = document.getElementById(`input_${catId}`);
    if (!input?.value.trim()) return;
    if (!App.work[catId]) App.work[catId] = [];
    App.work[catId].push({ id: 'ci_' + Date.now(), text: input.value.trim(), time: Date.now() });
    input.value = ''; await saveAndBroadcast(catId, App.work[catId]); renderStudentContent();
}

export async function deleteCustomItem(catId, id) {
    App.work[catId] = App.work[catId].filter(i => i.id !== id);
    await saveAndBroadcast(catId, App.work[catId]); renderStudentContent();
}

export function renderNoticesList() {
    if (!App.work.notices?.length) return `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale py-10">
            <span class="iconify text-4xl mb-2" data-icon="mdi:eye-outline"></span>
            <p class="text-[10px] font-black uppercase tracking-widest">No notices yet</p>
        </div>
    `;
    return App.work.notices.filter(n => !n.hidden).map(n => `
        <div class="group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 transition-all relative">
            <p class="text-sm text-gray-700 leading-relaxed cursor-pointer" onclick="window.editInquiryItem('${n.id}', 'notices')">${n.text}</p>
            <button onclick="window.deleteNotice('${n.id}')" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                <span class="iconify" data-icon="mdi:close-circle"></span>
            </button>
        </div>
    `).join('');
}

export function renderWondersList() {
    if (!App.work.wonders?.length) return `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale py-10">
            <span class="iconify text-4xl mb-2" data-icon="mdi:lightbulb-outline"></span>
            <p class="text-[10px] font-black uppercase tracking-widest">No wonders yet</p>
        </div>
    `;
    return App.work.wonders.filter(w => !w.hidden).map(w => `
        <div class="group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-yellow-200 transition-all relative">
            <p class="text-sm text-gray-700 leading-relaxed cursor-pointer" onclick="window.editInquiryItem('${w.id}', 'wonders')">${w.text}</p>
            <div class="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                <button onclick="window.promoteToQuestion('${w.id}')" class="text-[9px] font-black text-purple-500 uppercase tracking-widest hover:underline">Focus</button>
                <button onclick="window.promoteWonderToTestable('${w.id}')" class="text-[9px] font-black text-green-500 uppercase tracking-widest hover:underline">Testable</button>
            </div>
            <button onclick="window.deleteWonder('${w.id}')" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                <span class="iconify" data-icon="mdi:close-circle"></span>
            </button>
        </div>
    `).join('');
}

export function renderIdeasList() {
    if (!App.work.ideas?.length) return `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale py-10">
            <span class="iconify text-4xl mb-2" data-icon="mdi:thought-bubble-outline"></span>
            <p class="text-[10px] font-black uppercase tracking-widest">No ideas yet</p>
        </div>
    `;
    return App.work.ideas.map(i => `
        <div class="group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-purple-200 transition-all relative">
            <p class="text-sm text-gray-700 leading-relaxed cursor-pointer" onclick="window.editInquiryItem('${i.id}', 'ideas')">${i.text}</p>
            <button onclick="window.deleteIdea('${i.id}')" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                <span class="iconify" data-icon="mdi:close-circle"></span>
            </button>
        </div>
    `).join('');
}

export function renderTestableQuestionsList() {
    if (!App.work.testableQuestions?.length) return `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale py-10">
            <span class="iconify text-4xl mb-2" data-icon="mdi:comment-question-outline"></span>
            <p class="text-[10px] font-black uppercase tracking-widest">No questions yet</p>
        </div>
    `;
    return App.work.testableQuestions.map(q => `
        <div class="group p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-green-200 transition-all relative">
            <p class="text-sm text-gray-700 leading-relaxed cursor-pointer" onclick="window.editInquiryItem('${q.id}', 'testableQuestions')">${q.text}</p>
            <button onclick="window.deleteTestableQuestion('${q.id}')" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                <span class="iconify" data-icon="mdi:close-circle"></span>
            </button>
        </div>
    `).join('');
}


export async function addNotice() {
    const input = document.getElementById('noticeInput');
    if (!input?.value.trim()) return;
    App.work.notices.push({ id: 'n_' + Date.now(), text: input.value.trim(), time: Date.now() });
    input.value = ''; await saveAndBroadcast('notices', App.work.notices); renderStudentContent();
}

export async function addWonder() {
    const input = document.getElementById('wonderInput');
    if (!input?.value.trim()) return;
    App.work.wonders.push({ id: 'w_' + Date.now(), text: input.value.trim(), time: Date.now() });
    input.value = ''; await saveAndBroadcast('wonders', App.work.wonders); renderStudentContent();
}

export async function addIdea() {
    const input = document.getElementById('ideaInput');
    if (!input?.value.trim()) return;
    if (!App.work.ideas) App.work.ideas = [];
    App.work.ideas.push({ id: 'i_' + Date.now(), text: input.value.trim(), time: Date.now() });
    input.value = ''; await saveAndBroadcast('ideas', App.work.ideas); renderStudentContent();
}

export async function addTestableQuestion() {
    const input = document.getElementById('testableQuestionInput');
    if (!input?.value.trim()) return;
    if (!App.work.testableQuestions) App.work.testableQuestions = [];
    App.work.testableQuestions.push({ id: 'tq_' + Date.now(), text: input.value.trim(), time: Date.now() });
    input.value = ''; await saveAndBroadcast('testableQuestions', App.work.testableQuestions); renderStudentContent();
}

export async function deleteNotice(id) { App.work.notices = App.work.notices.filter(n => n.id !== id); await saveAndBroadcast('notices', App.work.notices); renderStudentContent(); }
export async function deleteWonder(id) { App.work.wonders = App.work.wonders.filter(w => w.id !== id); await saveAndBroadcast('wonders', App.work.wonders); renderStudentContent(); }
export async function deleteIdea(id) { App.work.ideas = App.work.ideas.filter(i => i.id !== id); await saveAndBroadcast('ideas', App.work.ideas); renderStudentContent(); }
export async function deleteTestableQuestion(id) { App.work.testableQuestions = App.work.testableQuestions.filter(q => q.id !== id); await saveAndBroadcast('testableQuestions', App.work.testableQuestions); renderStudentContent(); }

/**
 * UI: Allows students to edit their existing inquiry contributions.
 */
export async function editInquiryItem(id, category) {
    const list = App.work[category];
    const item = list.find(i => i.id === id);
    if (!item) return;

    window.openGenericInput('Edit Item', 'Update your contribution...', item.text, async (newText) => {
        if (newText === null || newText === undefined) return;
        if (!newText.trim()) {
            // If empty, delete
            App.work[category] = list.filter(i => i.id !== id);
        } else {
            item.text = newText.trim();
        }
        await saveAndBroadcast(category, App.work[category]);
        renderStudentContent();
    });
}

export async function promoteToQuestion(id) {
    const wonder = App.work.wonders.find(w => w.id === id);
    if (!wonder) return;
    if (!App.work.mainQuestion) App.work.mainQuestion = wonder.text;
    else { if (!App.work.subQuestions) App.work.subQuestions = []; App.work.subQuestions.push({ id: 'sq_' + Date.now(), text: wonder.text }); }
    await saveAndBroadcast('mainQuestion', App.work.mainQuestion);
    await saveAndBroadcast('subQuestions', App.work.subQuestions);
    renderStudentContent(); toast('Promoted to Driving Question!', 'success');
}

export async function promoteWonderToTestable(id) {
    const wonder = App.work.wonders.find(w => w.id === id);
    if (!wonder) return;
    if (!App.work.testableQuestions) App.work.testableQuestions = [];
    App.work.testableQuestions.push({ id: 'tq_' + Date.now(), text: wonder.text, time: Date.now() });
    await saveAndBroadcast('testableQuestions', App.work.testableQuestions);
    renderStudentContent(); toast('Promoted to Testable Question!', 'success');
}

export async function saveMainQuestion(val) { App.work.mainQuestion = val; await saveAndBroadcast('mainQuestion', val); }
export async function addSubQuestion() { if (!App.work.subQuestions) App.work.subQuestions = []; App.work.subQuestions.push({ id: 'sq_' + Date.now(), text: '' }); renderStudentContent(); }
export async function updateSubQuestion(id, val) { const q = App.work.subQuestions.find(x => x.id === id); if (q) q.text = val; await saveAndBroadcast('subQuestions', App.work.subQuestions); }
export async function deleteSubQuestion(id) { App.work.subQuestions = App.work.subQuestions.filter(x => x.id !== id); await saveAndBroadcast('subQuestions', App.work.subQuestions); renderStudentContent(); }
