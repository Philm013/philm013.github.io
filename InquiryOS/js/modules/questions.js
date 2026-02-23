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
    return `
        <div class="max-w-6xl mx-auto">
            ${renderModuleHeader('Asking Questions', 'mdi:help-circle', 'SEP1')}
            
            <div class="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-100 rounded-3xl p-6 md:p-8 mb-8 shadow-sm">
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-amber-100">
                        <span class="iconify text-amber-500 text-3xl" data-icon="mdi:eye"></span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-xl font-black text-gray-900">${p.title || 'Scientific Phenomenon'}</h3>
                            <span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase tracking-widest">Observe</span>
                        </div>
                        <p class="text-gray-600 leading-relaxed">${p.description || 'Observe the provided scientific phenomenon and document your initial thoughts below.'}</p>
                        ${p.tags?.length || p.ngssStandards?.length ? `
                            <div class="flex gap-2 mt-4 flex-wrap">
                                ${p.tags?.map(t => `<span class="px-3 py-1 bg-white text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">${t}</span>`).join('') || ''}
                                ${p.ngssStandards?.map(s => `<span class="px-3 py-1 bg-white text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-100 shadow-sm">${s}</span>`).join('') || ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                ${renderInputCard('I Notice...', 'mdi:eye', 'blue', 'noticeInput', 'window.addNotice()', renderNoticesList(), 'Physical observations')}
                ${renderInputCard('I Wonder...', 'mdi:lightbulb', 'yellow', 'wonderInput', 'window.addWonder()', renderWondersList(), 'Curious questions')}
                ${renderInputCard('Initial Ideas', 'mdi:thought-bubble', 'purple', 'ideaInput', 'window.addIdea()', renderIdeasList(), 'Early hypotheses')}
                ${renderInputCard('Testable Questions', 'mdi:comment-question', 'green', 'testableQuestionInput', 'window.addTestableQuestion()', renderTestableQuestionsList(), 'Investigatable')}
            </div>
            
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-black text-gray-900 flex items-center gap-3">
                        <span class="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                            <span class="iconify text-xl" data-icon="mdi:compass"></span>
                        </span>
                        Driving Questions
                    </h3>
                    <span class="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">Focus</span>
                </div>
                
                <div class="grid md:grid-cols-1 gap-8">
                    <div class="space-y-4">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Main Investigation Question</label>
                        <div class="relative group">
                            <input type="text" value="${App.work.mainQuestion || ''}" 
                                onchange="window.saveMainQuestion(this.value)"
                                placeholder="What is the core mystery we are trying to solve?"
                                class="w-full px-6 py-5 border-2 border-purple-100 bg-purple-50/30 rounded-2xl text-xl font-bold text-gray-800 focus:border-purple-500 focus:bg-white focus:outline-none transition-all placeholder:text-purple-200">
                            <span class="absolute right-6 top-1/2 -translate-y-1/2 iconify text-2xl text-purple-200 group-focus-within:text-purple-500" data-icon="mdi:target"></span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sub-Questions & Supporting Inquiries</label>
                            <button onclick="window.addSubQuestion()" class="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                <span class="iconify" data-icon="mdi:plus-circle"></span> Add New
                            </button>
                        </div>
                        <div class="grid md:grid-cols-2 gap-4">
                            ${(App.work.subQuestions || []).map((q, i) => `
                                <div class="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-purple-200 group transition-all flex items-center gap-3">
                                    <span class="text-xs font-black text-purple-300">${i + 1}</span>
                                    <input type="text" value="${q.text}" 
                                        onchange="window.updateSubQuestion('${q.id}', this.value)"
                                        placeholder="Specific aspect to investigate..."
                                        class="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none text-gray-700">
                                    <button onclick="window.deleteSubQuestion('${q.id}')" class="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity">
                                        <span class="iconify" data-icon="mdi:close-circle"></span>
                                    </button>
                                </div>
                            `).join('')}
                            ${App.work.subQuestions?.length === 0 ? `
                                <div class="md:col-span-2 py-8 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <p class="text-xs text-gray-400 font-medium">Break down your main question into smaller, manageable parts.</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderInputCard(title, icon, color, inputId, onAction, content, subtitle = '') {
    return `
        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-full">
            <div class="p-5 border-b border-gray-50 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-${color}-50 text-${color}-500 flex items-center justify-center">
                    <span class="iconify text-xl" data-icon="${icon}"></span>
                </div>
                <div>
                    <h3 class="font-bold text-gray-900">${title}</h3>
                    <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">${subtitle}</p>
                </div>
            </div>
            <div class="flex-1 p-4 space-y-3 overflow-y-auto min-h-[250px] max-h-[400px] custom-scrollbar bg-gray-50/30">
                ${content}
            </div>
            <div class="p-4 bg-white border-t border-gray-50">
                <div class="flex gap-2">
                    <input type="text" id="${inputId}" placeholder="Add..." 
                        class="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-${color}-500 focus:bg-white focus:outline-none transition-all"
                        onkeypress="if(event.key==='Enter')${onAction}">
                    <button onclick="${onAction}" class="w-10 h-10 flex items-center justify-center bg-${color}-500 text-white rounded-xl hover:opacity-90 transition-all shadow-sm shadow-${color}-100">
                        <span class="iconify" data-icon="mdi:plus"></span>
                    </button>
                </div>
            </div>
        </div>
    `;
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
            <p class="text-sm text-gray-700 leading-relaxed">${n.text}</p>
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
            <p class="text-sm text-gray-700 leading-relaxed">${w.text}</p>
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
            <p class="text-sm text-gray-700 leading-relaxed">${i.text}</p>
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
            <p class="text-sm text-gray-700 leading-relaxed">${q.text}</p>
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
