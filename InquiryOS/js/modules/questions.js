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
        <div class="max-w-4xl mx-auto">
            ${renderModuleHeader('Asking Questions', 'mdi:help-circle', 'SEP1')}
            
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-6">
                <div class="flex gap-4">
                    <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span class="iconify text-amber-600 text-2xl" data-icon="mdi:eye"></span>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900">${p.title || 'Phenomenon'}</h3>
                        <p class="text-gray-700 mt-1">${p.description || 'Your teacher will set up the phenomenon.'}</p>
                        ${p.tags?.length || p.ngssStandards?.length ? `
                            <div class="flex gap-2 mt-3 flex-wrap">
                                ${p.tags?.map(t => `<span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">${t}</span>`).join('') || ''}
                                ${p.ngssStandards?.map(s => `<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-purple-200">${s}</span>`).join('') || ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6 mb-6">
                ${renderInputCard('I Notice...', 'mdi:eye', 'blue', 'noticeInput', 'window.addNotice()', renderNoticesList())}
                ${renderInputCard('I Wonder...', 'mdi:lightbulb', 'yellow', 'wonderInput', 'window.addWonder()', renderWondersList())}
                ${renderInputCard('Initial Ideas', 'mdi:thought-bubble', 'purple', 'ideaInput', 'window.addIdea()', renderIdeasList())}
                ${renderInputCard('Testable Questions', 'mdi:comment-question', 'green', 'testableQuestionInput', 'window.addTestableQuestion()', renderTestableQuestionsList())}
            </div>
            
            <div class="bg-white rounded-xl shadow-sm border p-6">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span class="iconify text-purple-500" data-icon="mdi:compass"></span>
                    Driving Questions
                </h3>
                <div class="mb-4">
                    <label class="text-sm text-gray-600 block mb-2">Main Investigation Question</label>
                    <input type="text" value="${App.work.mainQuestion || ''}" 
                        onchange="window.saveMainQuestion(this.value)"
                        placeholder="What is your main question?"
                        class="w-full px-4 py-3 border-2 border-purple-200 bg-purple-50 rounded-lg text-lg focus:ring-2 focus:ring-purple-500 focus:outline-none">
                </div>
                <div class="grid md:grid-cols-2 gap-4">
                    ${(App.work.subQuestions || []).map((q, i) => `
                        <div class="p-3 bg-gray-50 rounded-lg border group">
                            <div class="flex justify-between items-start">
                                <input type="text" value="${q.text}" 
                                    onchange="window.updateSubQuestion('${q.id}', this.value)"
                                    placeholder="Sub-question ${i + 1}"
                                    class="flex-1 bg-transparent border-none text-sm focus:outline-none">
                                <button onclick="window.deleteSubQuestion('${q.id}')" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                                    <span class="iconify" data-icon="mdi:close"></span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="window.addSubQuestion()" class="mt-4 text-sm text-purple-600 hover:underline flex items-center gap-1">
                    <span class="iconify" data-icon="mdi:plus"></span> Add Sub-Question
                </button>
            </div>
        </div>
    `;
}

function renderInputCard(title, icon, color, inputId, onAction, content) {
    return `
        <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span class="iconify text-${color}-500" data-icon="${icon}"></span>
                ${title}
            </h3>
            <div class="space-y-2 mb-4 max-h-64 overflow-y-auto custom-scrollbar">
                ${content}
            </div>
            <div class="flex gap-2">
                <input type="text" id="${inputId}" placeholder="${title}..." 
                    class="flex-1 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-${color}-500 focus:outline-none"
                    onkeypress="if(event.key==='Enter')${onAction}">
                <button onclick="${onAction}" class="px-4 py-2 bg-${color}-500 text-white rounded-lg hover:bg-${color}-600">
                    <span class="iconify" data-icon="mdi:plus"></span>
                </button>
            </div>
        </div>
    `;
}

export function renderNoticesList() {
    if (!App.work.notices?.length) return '<p class="text-gray-400 text-sm italic">What do you observe?</p>';
    return App.work.notices.filter(n => !n.hidden).map(n => `
        <div class="group p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div class="flex justify-between items-start">
                <p class="text-sm text-gray-700">${n.text}</p>
                <button onclick="window.deleteNotice('${n.id}')" class="opacity-0 group-hover:opacity-100 text-red-400 ml-2">×</button>
            </div>
        </div>
    `).join('');
}

export function renderWondersList() {
    if (!App.work.wonders?.length) return '<p class="text-gray-400 text-sm italic">What questions do you have?</p>';
    return App.work.wonders.filter(w => !w.hidden).map(w => `
        <div class="group p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <div class="flex justify-between items-start">
                <p class="text-sm text-gray-700">${w.text}</p>
                <button onclick="window.deleteWonder('${w.id}')" class="opacity-0 group-hover:opacity-100 text-red-400 ml-2">×</button>
            </div>
            <div class="flex gap-3 mt-2">
                <button onclick="window.promoteToQuestion('${w.id}')" class="text-[10px] font-bold text-purple-600 hover:underline">→ Driving Question</button>
                <button onclick="window.promoteWonderToTestable('${w.id}')" class="text-[10px] font-bold text-green-600 hover:underline">→ Make Testable</button>
            </div>
        </div>
    `).join('');
}

export function renderIdeasList() {
    if (!App.work.ideas?.length) return '<p class="text-gray-400 text-sm italic">Initial thoughts?</p>';
    return App.work.ideas.map(i => `<div class="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500 flex justify-between"><p class="text-sm text-gray-700">${i.text}</p><button onclick="window.deleteIdea('${i.id}')" class="text-red-400">×</button></div>`).join('');
}

export function renderTestableQuestionsList() {
    if (!App.work.testableQuestions?.length) return '<p class="text-gray-400 text-sm italic">Investigatable?</p>';
    return App.work.testableQuestions.map(q => `<div class="p-3 bg-green-50 rounded-lg border-l-4 border-green-500 flex justify-between"><p class="text-sm text-gray-700">${q.text}</p><button onclick="window.deleteTestableQuestion('${q.id}')" class="text-red-400">×</button></div>`).join('');
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
