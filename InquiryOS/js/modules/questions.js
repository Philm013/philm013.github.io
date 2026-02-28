/**
 * @file questions.js
 * @description Logic for the SEP1 module: Asking Questions and Defining Problems.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { updateSwipeDots } from '../ui/navigation.js';
import { toast, renderInfoTip } from '../ui/utils.js';

/**
 * Renders the Questions Practice module.
 */
export function renderQuestionsModule() {
    const p = App.teacherSettings.phenomenon;
    const activeTab = App.uiState?.activeInquiryTab || 'notices';
    
    const categories = [
        { id: 'notices', label: 'I Notice...', icon: 'mdi:eye', color: 'blue', action: 'window.addNotice()', inputId: 'noticeInput', listRenderer: renderNoticesList, info: 'Observations are facts about what you actually see, hear, or feel. Avoid opinions or explanations here!' },
        { id: 'wonders', label: 'I Wonder...', icon: 'mdi:lightbulb', color: 'yellow', action: 'window.addWonder()', inputId: 'wonderInput', listRenderer: renderWondersList, info: 'What questions come to mind? These often start with "Why" or "How does...".' },
        { id: 'ideas', label: 'Initial Ideas', icon: 'mdi:thought-bubble', color: 'purple', action: 'window.addIdea()', inputId: 'ideaInput', listRenderer: renderIdeasList, info: 'What are your first thoughts on how this works? This is like a "first draft" of an explanation.' },
        { id: 'testableQuestions', label: 'Questions', icon: 'mdi:comment-question', color: 'green', action: 'window.addTestableQuestion()', inputId: 'testableQuestionInput', listRenderer: renderTestableQuestionsList, info: 'A question is testable if you can design an experiment to find the answer through measurements.' }
    ];

    return `
        <div class="panels-container">
            <!-- 1. Phenomenon Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Phenomenon">
                <div class="p-2 md:p-0">
                    ${renderModuleHeader('Asking Questions', 'mdi:help-circle', 'SEP1', '', 'Carefully observe the mystery here. Use the text and media to gather initial facts before moving to the inquiry board.')}
                </div>

                <div class="panel-content space-y-6">
                    <div class="flex flex-col gap-4">
                        <p class="text-base md:text-lg text-gray-700 leading-relaxed font-medium italic">"${p.description || 'Observe and document your thoughts.'}"</p>
                        ${p.media?.length > 0 ? `
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                ${p.media.map(m => `
                                    <button onclick="window.viewMediaDetail('${m.id}')" class="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm active:scale-95 transition-all">
                                        <img src="${m.thumb}" class="w-full h-full object-cover" loading="lazy">
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="flex flex-wrap gap-2">
                            ${(p.ngssStandards || []).map(s => `<button onclick="window.viewPeDetails('${s}')" class="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black border border-blue-100 uppercase">${s}</button>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 2. Consolidated Inquiry Board Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Inquiry Board">
                <div class="sticky-panel-header">
                    <div class="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-200 w-full overflow-x-auto no-scrollbar">
                        <div class="px-2 shrink-0 border-r border-gray-200">
                            ${renderInfoTip('Scientists document their initial thoughts here. Swipe through the tabs to record your Notices, Wonders, and Ideas.')}
                        </div>
                        ${categories.map(cat => `
                            <button onclick="window.switchInquiryTab('${cat.id}')" 
                                class="flex-1 min-w-[80px] py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-1.5 ${activeTab === cat.id ? `bg-white text-${cat.color === 'yellow' ? 'amber' : cat.color}-600 shadow-sm ring-1 ring-black/5` : 'text-gray-400'}">
                                <span class="iconify" data-icon="${cat.icon}"></span>
                                ${cat.id === 'testableQuestions' ? 'Questions' : cat.label.replace('I ', '').replace('...', '')}
                                ${cat.info ? renderInfoTip(cat.info) : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="flex-1 flex flex-col min-h-0">
                    <!-- Horizontal Swiper for Mobile, Conditional for Desktop -->
                    <div id="inquirySwiper" class="horizontal-snap-container md:block" onscroll="window.handleInquiryScroll(this)">
                        ${categories.map(cat => `
                            <div class="horizontal-snap-item flex flex-col" data-inquiry-tab="${cat.id}">
                                <div class="hidden md:flex p-4 border-b bg-gray-50/50 items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-${cat.color === 'yellow' ? 'amber' : cat.color}-50 text-${cat.color === 'yellow' ? 'amber' : cat.color}-600 border border-${cat.color === 'yellow' ? 'amber' : cat.color}-100">
                                            <span class="iconify text-lg" data-icon="${cat.icon}"></span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <h4 class="font-black text-sm uppercase text-gray-700">${cat.label}</h4>
                                            ${cat.info ? renderInfoTip(cat.info) : ''}
                                        </div>
                                    </div>
                                    <button onclick="${cat.action}" class="px-4 py-1.5 bg-${cat.color === 'yellow' ? 'amber' : cat.color}-500 text-white rounded-lg text-[10px] font-black uppercase shadow-sm">Add New</button>
                                </div>
                                <div class="panel-content !bg-gray-50/10 !p-4 !justify-start">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        ${cat.listRenderer()}
                                    </div>
                                </div>
                                <!-- Mobile Add Input -->
                                <div class="p-4 bg-white border-t border-gray-50 md:hidden">
                                    <div class="flex gap-2">
                                        <input type="text" id="${cat.inputId}_mobile" placeholder="I noticed..." 
                                            class="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-${cat.color === 'yellow' ? 'amber' : cat.color}-500 outline-none transition-all"
                                            onkeypress="if(event.key==='Enter'){ document.getElementById('${cat.inputId}').value=this.value; ${cat.action}; this.value=''; }">
                                        <button onclick="document.getElementById('${cat.inputId}').value=document.getElementById('${cat.inputId}_mobile').value; ${cat.action}; document.getElementById('${cat.inputId}_mobile').value='';" 
                                            class="w-12 h-12 flex items-center justify-center bg-${cat.color === 'yellow' ? 'amber' : cat.color}-500 text-white rounded-xl shadow-md">
                                            <span class="iconify text-xl" data-icon="mdi:plus"></span>
                                        </button>
                                    </div>
                                </div>
                                <!-- Hidden desktop input for action sync -->
                                <input type="hidden" id="${cat.inputId}">
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Swipe Indicators (Dots) -->
                    <div id="inquiryDots" class="swipe-dots md:hidden border-t border-gray-50">
                        ${categories.map(cat => `
                            <button onclick="window.switchInquiryTab('${cat.id}')" 
                                class="swipe-dot ${activeTab === cat.id ? 'active' : ''}" 
                                aria-label="Go to ${cat.label}"></button>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 3. Driving Questions Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Driving Questions">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-2">
                        <span class="iconify text-purple-600" data-icon="mdi:compass"></span>
                        <h3>Driving Questions</h3>
                        ${renderInfoTip('Define the main mystery you want to solve. You can also add supporting inquiries that will help you reach your main answer.')}
                    </div>
                </div>
                <div class="panel-content space-y-8 md:space-y-10 md:justify-center">
                    <div class="hidden md:flex items-center gap-4 mb-4">
                        <div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <span class="iconify text-2xl" data-icon="mdi:compass"></span>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-gray-900 uppercase tracking-tight">Driving Questions</h3>
                            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Practice 1: Focus of Inquiry</p>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <label class="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1">The Main Mystery</label>
                        <input type="text" value="${App.work.mainQuestion || ''}" 
                            onchange="window.saveMainQuestion(this.value)"
                            placeholder="What is the core mystery?"
                            class="w-full px-5 py-5 bg-purple-50/30 border-2 border-purple-100 rounded-2xl text-lg md:text-2xl font-black text-gray-900 focus:border-purple-500 focus:bg-white outline-none transition-all shadow-inner">
                    </div>
                    <div class="space-y-4 md:space-y-6">
                        <div class="flex items-center justify-between">
                            <label class="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Supporting Inquiries</label>
                            <button onclick="window.addSubQuestion()" class="text-[10px] md:text-xs font-black text-purple-600 uppercase flex items-center gap-2 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-all">
                                <span class="iconify text-lg" data-icon="mdi:plus-circle"></span> Add Inquiry
                            </button>
                        </div>
                        <div class="space-y-3 max-h-[30vh] md:max-h-none overflow-y-auto pr-2 custom-scrollbar">
                            ${(App.work.subQuestions || []).map((q) => `
                                <div class="px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 group transition-all hover:bg-white hover:shadow-md hover:border-purple-200">
                                    <div class="w-2 h-2 rounded-full bg-purple-300"></div>
                                    <input type="text" value="${q.text}" onchange="window.updateSubQuestion('${q.id}', this.value)" class="flex-1 bg-transparent border-none text-sm md:text-base font-bold outline-none text-gray-700 min-w-0" placeholder="Supporting question...">
                                    <button onclick="window.deleteSubQuestion('${q.id}')" class="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><span class="iconify text-xl" data-icon="mdi:close-circle"></span></button>
                                </div>
                            `).join('')}
                            ${(App.work.subQuestions || []).length === 0 ? `<p class="text-[10px] text-gray-300 italic text-center py-4 uppercase font-bold tracking-widest">No supporting questions yet</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Handles tab switching within the Inquiry Board.
 */
window.switchInquiryTab = (tabId) => {
    if (!App.uiState) App.uiState = {};
    App.uiState.activeInquiryTab = tabId;
    const swiper = document.getElementById('inquirySwiper');
    if (swiper) {
        const target = swiper.querySelector(`[data-inquiry-tab="${tabId}"]`);
        if (target) {
            App._isScrollingToTab = true;
            swiper.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
            setTimeout(() => { 
                App._isScrollingToTab = false; 
                updateSwipeDots(swiper, 'inquiryDots');
            }, 500);
        }
    }
    updateInquiryTabUI(tabId);
};

/**
 * Updates the visual state of inquiry tab buttons.
 */
function updateInquiryTabUI(activeId) {
    document.querySelectorAll('[onclick^="window.switchInquiryTab"]').forEach(btn => {
        const match = btn.getAttribute('onclick').match(/'([^']+)'/);
        if (!match) return;
        const btnTab = match[1];
        const isActive = btnTab === activeId;
        const color = btnTab === 'notices' ? 'blue' : btnTab === 'wonders' ? 'amber' : btnTab === 'ideas' ? 'purple' : 'green';
        
        btn.classList.remove('text-blue-600', 'text-amber-600', 'text-purple-600', 'text-green-600', 'bg-white', 'shadow-sm', 'text-gray-400');
        
        if (isActive) {
            btn.classList.add(`text-${color === 'yellow' ? 'amber' : color}-600`, 'bg-white', 'shadow-sm');
        } else {
            btn.classList.add('text-gray-400');
        }
    });
}

/**
 * Updates the active tab state based on horizontal scroll position.
 */
window.handleInquiryScroll = (el) => {
    if (App._isScrollingToTab) return;
    updateSwipeDots(el, 'inquiryDots');
    const tabWidth = el.offsetWidth;
    const index = Math.round(el.scrollLeft / tabWidth);
    const tabs = ['notices', 'wonders', 'ideas', 'testableQuestions'];
    const activeId = tabs[index];
    if (activeId && App.uiState?.activeInquiryTab !== activeId) {
        if (!App.uiState) App.uiState = {};
        App.uiState.activeInquiryTab = activeId;
        updateInquiryTabUI(activeId);
    }
};

/**
 * Renders an inquiry item with the new tagging integration.
 */
function renderInquiryItem(item, category, borderColorClass) {
    const tags = item.tags || [];
    return `
        <div class="group p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:${borderColorClass} transition-all relative flex flex-col">
            <p class="text-sm font-bold text-gray-800 leading-snug cursor-pointer mb-3" onclick="window.editInquiryItem('${item.id}', '${category}')">"${item.text}"</p>
            
            <div class="flex flex-wrap gap-1 mb-3">
                ${tags.map(tagId => renderTagBadge(tagId)).join('')}
            </div>

            <div class="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                <button onclick="window.showTagPicker('${item.id}', '${category}')" class="px-2.5 py-1 bg-gray-50 text-[8px] font-black text-gray-400 uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-1">
                    <span class="iconify" data-icon="mdi:tag-outline"></span> Tag
                </button>
                ${category === 'wonders' ? `
                    <div class="flex gap-2">
                        <button onclick="window.promoteToQuestion('${item.id}')" class="text-[8px] font-black text-purple-500 uppercase tracking-widest hover:bg-purple-50 px-2 py-1 rounded-lg">Focus</button>
                        <button onclick="window.promoteWonderToTestable('${item.id}')" class="text-[8px] font-black text-green-500 uppercase tracking-widest hover:bg-green-50 px-2 py-1 rounded-lg">Testable</button>
                    </div>
                ` : ''}
            </div>

            <button onclick="window.deleteInquiryItem('${category}', '${item.id}')" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                <span class="iconify" data-icon="mdi:close-circle"></span>
            </button>
        </div>
    `;
}

function renderTagBadge(tagId) {
    // 1. Check for 3D Elements (SEP, CCC, DCI)
    const element = App.ngssData?.elementMap?.get(tagId);
    if (element) {
        const color = element.dimensionCode === 'SEP' ? 'blue' : element.dimensionCode === 'CCC' ? 'amber' : 'green';
        return `<span class="px-1.5 py-0.5 bg-${color}-50 text-${color}-600 rounded text-[7px] font-black uppercase border border-${color}-100">${tagId}</span>`;
    }
    
    // 2. Check for Teacher-defined Themes
    const custom = (App.teacherSettings.categories || []).find(c => c.id === tagId);
    if (custom) return `<span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[7px] font-black uppercase border border-gray-200" style="color: ${custom.color}; border-color: ${custom.color}30; background: ${custom.color}10;">${custom.name}</span>`;
    
    return `<span class="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[7px] font-black uppercase border border-gray-200">${tagId}</span>`;
}

/**
 * UI: Opens the unified tag picker featuring 3D Elements and Themes.
 */
export function showTagPicker(itemId, category) {
    const list = App.work[category];
    const item = list.find(i => i.id === itemId);
    if (!item) return;
    if (!item.tags) item.tags = [];

    const seps = Array.from(App.ngssData?.elementMap?.values() || []).filter(e => e.dimensionCode === 'SEP');
    const cccs = Array.from(App.ngssData?.elementMap?.values() || []).filter(e => e.dimensionCode === 'CCC');
    const dcis = Array.from(App.ngssData?.elementMap?.values() || []).filter(e => e.dimensionCode === 'DCI');
    const themes = App.teacherSettings.categories || [];

    const modal = document.createElement('div');
    modal.id = 'tagPickerModal';
    modal.className = 'fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-end justify-center animate-in slide-in-from-bottom duration-300';
    
    modal.innerHTML = `
        <div class="bg-white rounded-t-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div class="p-8 border-b bg-white flex items-center justify-between shrink-0">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-100">
                        <span class="iconify" data-icon="mdi:tag-multiple"></span>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-gray-900 uppercase">Scientific Tagging</h3>
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Link your thought to 3D Elements</p>
                    </div>
                </div>
                <button onclick="document.getElementById('tagPickerModal').remove()" class="p-2 hover:bg-gray-100 rounded-xl transition-all">
                    <span class="iconify text-2xl" data-icon="mdi:close"></span>
                </button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <!-- 1. Lesson Themes -->
                ${themes.length ? `
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">Lesson Themes</label>
                        <div class="grid grid-cols-2 gap-3">
                            ${themes.map(cat => `
                                <button onclick="window.toggleContributionTag('${itemId}', '${category}', '${cat.id}')" 
                                    class="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${item.tags.includes(cat.id) ? 'border-primary bg-primary/10' : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'}"
                                    style="${item.tags.includes(cat.id) ? `border-color: ${cat.color}; color: ${cat.color};` : ''}">
                                    <span class="iconify text-xl shrink-0" data-icon="mdi:folder-star"></span>
                                    <span class="text-[10px] font-black uppercase leading-tight">${cat.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 2. Science Practices -->
                <div>
                    <label class="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 block">Scientific Practices (SEP)</label>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${seps.map(p => `
                            <button onclick="window.toggleContributionTag('${itemId}', '${category}', '${p.code}')" 
                                class="flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${item.tags.includes(p.code) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}">
                                <span class="text-[9px] font-black uppercase leading-tight">${p.name.split(':')[0]}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 3. Core Ideas -->
                <div>
                    <label class="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] mb-4 block">Core Ideas (DCI)</label>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${dcis.map(d => `
                            <button onclick="window.toggleContributionTag('${itemId}', '${category}', '${d.code}')" 
                                class="flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${item.tags.includes(d.code) ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}">
                                <span class="text-[9px] font-black uppercase leading-tight">${d.code}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 4. Crosscutting Concepts -->
                <div>
                    <label class="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 block">Crosscutting Concepts (CCC)</label>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${cccs.map(c => `
                            <button onclick="window.toggleContributionTag('${itemId}', '${category}', '${c.code}')" 
                                class="flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${item.tags.includes(c.code) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}">
                                <span class="text-[9px] font-black uppercase leading-tight">${c.name.split(':')[0]}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="p-8 bg-gray-50 border-t">
                <button onclick="document.getElementById('tagPickerModal').remove()" class="w-full py-4 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:opacity-90 transition-all active:scale-95">Complete Tagging</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

export async function toggleContributionTag(itemId, category, tagId) {
    const list = App.work[category];
    const item = list.find(i => i.id === itemId);
    if (!item) return;
    if (!item.tags) item.tags = [];
    const index = item.tags.indexOf(tagId);
    if (index > -1) item.tags.splice(index, 1); else item.tags.push(tagId);
    await saveAndBroadcast(category, App.work[category]);
    const modal = document.getElementById('tagPickerModal');
    if (modal) { modal.remove(); showTagPicker(itemId, category); }
    renderStudentContent();
}

export async function deleteInquiryItem(category, id) { App.work[category] = App.work[category].filter(i => i.id !== id); await saveAndBroadcast(category, App.work[category]); renderStudentContent(); }
export async function addNotice() { const input = document.getElementById('noticeInput'); if (!input?.value.trim()) return; App.work.notices.push({ id: 'n_' + Date.now(), text: input.value.trim(), time: Date.now(), tags: [] }); input.value = ''; await saveAndBroadcast('notices', App.work.notices); renderStudentContent(); }
export async function addWonder() { const input = document.getElementById('wonderInput'); if (!input?.value.trim()) return; App.work.wonders.push({ id: 'w_' + Date.now(), text: input.value.trim(), time: Date.now(), tags: [] }); input.value = ''; await saveAndBroadcast('wonders', App.work.wonders); renderStudentContent(); }
export async function addIdea() { const input = document.getElementById('ideaInput'); if (!input?.value.trim()) return; if (!App.work.ideas) App.work.ideas = []; App.work.ideas.push({ id: 'i_' + Date.now(), text: input.value.trim(), time: Date.now(), tags: [] }); input.value = ''; await saveAndBroadcast('ideas', App.work.ideas); renderStudentContent(); }
export async function addTestableQuestion() { const input = document.getElementById('testableQuestionInput'); if (!input?.value.trim()) return; if (!App.work.testableQuestions) App.work.testableQuestions = []; App.work.testableQuestions.push({ id: 'tq_' + Date.now(), text: input.value.trim(), time: Date.now(), tags: [] }); input.value = ''; await saveAndBroadcast('testableQuestions', App.work.testableQuestions); renderStudentContent(); }
export async function editInquiryItem(id, category) { const list = App.work[category]; const item = list.find(i => i.id === id); if (!item) return; window.openGenericInput('Edit Contribution', 'Update your thoughts...', item.text, async (newText) => { if (newText === null || newText === undefined) return; if (!newText.trim()) App.work[category] = list.filter(i => i.id !== id); else item.text = newText.trim(); await saveAndBroadcast(category, App.work[category]); renderStudentContent(); }); }
export async function promoteToQuestion(id) { const wonder = App.work.wonders.find(w => w.id === id); if (!wonder) return; if (!App.work.mainQuestion) App.work.mainQuestion = wonder.text; else { if (!App.work.subQuestions) App.work.subQuestions = []; App.work.subQuestions.push({ id: 'sq_' + Date.now(), text: wonder.text }); } await saveAndBroadcast('mainQuestion', App.work.mainQuestion); await saveAndBroadcast('subQuestions', App.work.subQuestions); renderStudentContent(); toast('Promoted!', 'success'); }
export async function promoteWonderToTestable(id) { const wonder = App.work.wonders.find(w => w.id === id); if (!wonder) return; if (!App.work.testableQuestions) App.work.testableQuestions = []; App.work.testableQuestions.push({ id: 'tq_' + Date.now(), text: wonder.text, time: Date.now(), tags: [] }); await saveAndBroadcast('testableQuestions', App.work.testableQuestions); renderStudentContent(); toast('Promoted!', 'success'); }
export async function saveMainQuestion(val) { App.work.mainQuestion = val; await saveAndBroadcast('mainQuestion', val); }
export async function addSubQuestion() { if (!App.work.subQuestions) App.work.subQuestions = []; App.work.subQuestions.push({ id: 'sq_' + Date.now(), text: '' }); renderStudentContent(); }
export async function updateSubQuestion(id, val) { const q = App.work.subQuestions.find(x => x.id === id); if (q) q.text = val; await saveAndBroadcast('subQuestions', App.work.subQuestions); }
export async function deleteSubQuestion(id) { App.work.subQuestions = App.work.subQuestions.filter(x => x.id !== id); await saveAndBroadcast('subQuestions', App.work.subQuestions); renderStudentContent(); }

export function renderNoticesList() { if (!App.work.notices?.length) return '<div class="col-span-full py-20 text-center opacity-30 grayscale"><span class="iconify text-4xl mb-2 mx-auto" data-icon="mdi:eye-outline"></span><p class="text-[10px] font-black uppercase tracking-widest">No notices yet</p></div>'; return App.work.notices.filter(n => !n.hidden).map(n => renderInquiryItem(n, 'notices', 'border-blue-200')).join(''); }
export function renderWondersList() { if (!App.work.wonders?.length) return '<div class="col-span-full py-20 text-center opacity-30 grayscale"><span class="iconify text-4xl mb-2 mx-auto" data-icon="mdi:lightbulb-outline"></span><p class="text-[10px] font-black uppercase tracking-widest">No wonders yet</p></div>'; return App.work.wonders.filter(w => !w.hidden).map(w => renderInquiryItem(w, 'wonders', 'border-yellow-200')).join(''); }
export function renderIdeasList() { if (!App.work.ideas?.length) return '<div class="col-span-full py-20 text-center opacity-30 grayscale"><span class="iconify text-4xl mb-2 mx-auto" data-icon="mdi:thought-bubble-outline"></span><p class="text-[10px] font-black uppercase tracking-widest">No ideas yet</p></div>'; return App.work.ideas.map(i => renderInquiryItem(i, 'ideas', 'border-purple-200')).join(''); }
export function renderTestableQuestionsList() { if (!App.work.testableQuestions?.length) return '<div class="col-span-full py-20 text-center opacity-30 grayscale"><span class="iconify text-4xl mb-2 mx-auto" data-icon="mdi:comment-question-outline"></span><p class="text-[10px] font-black uppercase tracking-widest">No questions yet</p></div>'; return App.work.testableQuestions.map(q => renderInquiryItem(q, 'testableQuestions', 'border-green-200')).join(''); }
