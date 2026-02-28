/**
 * @file noticeboard.js
 * @description specialized logic for the collaborative teacher view of the Notice & Wonder board. 
 */

import { App } from '../core/state.js';
import { dbGet, dbPut, dbGetByIndex, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveToStorage, saveAndBroadcast } from '../core/sync.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { updateSwipeDots } from '../ui/navigation.js';
import { toast, renderInfoTip } from '../ui/utils.js';

/**
 * Renders the consolidated Inquiry Collaboration Board for teachers.
 */
export async function renderTeacherNoticeBoard() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const studentList = allUsers.filter(u => u.mode === 'student');
    const activeTab = App.uiState?.activeTeacherInquiryTab || 'notices';
    
    const categories = [
        { id: 'notices', label: 'Notices', icon: 'mdi:eye', color: 'blue' },
        { id: 'wonders', label: 'Wonders', icon: 'mdi:lightbulb', color: 'yellow' },
        { id: 'ideas', label: 'Ideas', icon: 'mdi:thought-bubble', color: 'purple' },
        { id: 'testableQuestions', label: 'Questions', icon: 'mdi:comment-question', color: 'green' }
    ];
    
    let items = {};
    categories.forEach(cat => items[cat.id] = []);
    
    for (const student of studentList) {
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + student.visitorId);
        if (saved && saved.work) {
            categories.forEach(cat => {
                if (saved.work[cat.id]) {
                    items[cat.id] = items[cat.id].concat(saved.work[cat.id].map(item => ({ 
                        ...item, studentName: student.name, studentId: student.visitorId, originalCategory: cat.id 
                    })));
                }
            });
        }
    }
    
    Object.keys(items).forEach(k => items[k].sort((a, b) => b.time - a.time));

    return `
        <div class="panels-container">
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Classroom Board">
                <div class="sticky-panel-header">
                    <div class="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-200 w-full overflow-x-auto no-scrollbar">
                        <div class="px-2 shrink-0 border-r border-gray-200">
                            ${renderInfoTip('The heart of class collaboration! Review every student\'s Notices, Wonders, and Ideas in real-time. You can even move posts between categories if a student finds a "Testable Question" in their wonders!')}
                        </div>
                        ${categories.map(cat => `
                            <button onclick="window.switchTeacherInquiryTab('${cat.id}')" 
                                class="flex-1 min-w-[80px] py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-1.5 ${activeTab === cat.id ? `bg-white text-${cat.color === 'yellow' ? 'amber' : cat.color}-600 shadow-sm ring-1 ring-black/5` : 'text-gray-400'}">
                                <span class="iconify" data-icon="${cat.icon}"></span>
                                ${cat.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="flex-1 flex flex-col min-h-0">
                    <div id="teacherInquirySwiper" class="horizontal-snap-container md:block" onscroll="window.handleTeacherInquiryScroll(this)">
                        ${categories.map(cat => `
                            <div class="horizontal-snap-item flex flex-col" data-inquiry-tab="${cat.id}">
                                <div class="hidden md:flex p-4 border-b bg-gray-50/50 items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-${cat.color === 'yellow' ? 'amber' : cat.color}-50 text-${cat.color === 'yellow' ? 'amber' : cat.color}-600">
                                            <span class="iconify text-lg" data-icon="${cat.icon}"></span>
                                        </div>
                                        <h4 class="font-black text-sm uppercase text-gray-700">${cat.label}</h4>
                                    </div>
                                    <span class="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black">${items[cat.id]?.length || 0} Posts</span>
                                </div>
                                <div class="panel-content !bg-gray-50/10 !p-4 !justify-start">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        ${items[cat.id]?.map(item => renderTeacherBoardItem(item, categories)).join('') || '<div class="col-span-full py-20 text-center opacity-30 text-[10px] font-black uppercase tracking-widest border-2 border-dashed rounded-3xl">Empty</div>'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Swipe Indicators (Dots) -->
                    <div id="teacherInquiryDots" class="swipe-dots md:hidden border-t border-gray-50">
                        ${categories.map(cat => `
                            <button onclick="window.switchTeacherInquiryTab('${cat.id}')" 
                                class="swipe-dot ${activeTab === cat.id ? 'active' : ''}" 
                                aria-label="Go to ${cat.label}"></button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTeacherBoardItem(item, categories) {
    const tags = item.tags || [];
    return `
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
            <p class="text-sm font-bold text-gray-800 leading-snug mb-3">"${item.text}"</p>
            
            <div class="flex flex-wrap gap-1 mb-3">
                ${tags.map(tagId => renderTeacherTagBadge(tagId)).join('')}
            </div>

            <div class="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                <div class="flex items-center gap-2">
                    <div class="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[8px] font-black text-gray-500 uppercase">
                        ${item.studentName.charAt(0)}
                    </div>
                    <span class="text-[9px] font-black text-gray-400 uppercase truncate max-w-[80px]">${item.studentName}</span>
                </div>
                <div class="flex gap-1">
                    <select onchange="window.moveBoardItem('${item.studentId}', '${item.id}', '${item.originalCategory}', this.value)" 
                        class="text-[8px] font-black uppercase bg-gray-50 border-gray-200 rounded-lg px-2 py-1 outline-none">
                        <option value="" disabled selected>Move</option>
                        ${categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
    `;
}

function renderTeacherTagBadge(tagId) {
    const element = App.ngssData?.elementMap?.get(tagId);
    if (element) {
        const color = element.dimensionCode === 'SEP' ? 'blue' : element.dimensionCode === 'CCC' ? 'amber' : 'green';
        return `<span class="px-1.5 py-0.5 bg-${color}-50 text-${color}-600 rounded text-[7px] font-black uppercase border border-${color}-100">${tagId}</span>`;
    }
    const custom = (App.teacherSettings.categories || []).find(c => c.id === tagId);
    if (custom) return `<span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[7px] font-black uppercase border border-gray-200" style="color: ${custom.color}; border-color: ${custom.color}30; background: ${custom.color}10;">${custom.name}</span>`;
    return `<span class="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[7px] font-black uppercase border border-gray-200">${tagId}</span>`;
}

/**
 * Handles tab switching for teacher board.
 */
window.switchTeacherInquiryTab = (tabId) => {
    if (!App.uiState) App.uiState = {};
    App.uiState.activeTeacherInquiryTab = tabId;
    const swiper = document.getElementById('teacherInquirySwiper');
    if (swiper) {
        const target = swiper.querySelector(`[data-inquiry-tab="${tabId}"]`);
        if (target) {
            App._isScrollingToTab = true;
            swiper.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
            setTimeout(() => { 
                App._isScrollingToTab = false; 
                updateSwipeDots(swiper, 'teacherInquiryDots');
            }, 500);
        }
    }
    updateTeacherInquiryTabUI(tabId);
};

/**
 * Updates the visual state of teacher inquiry tab buttons.
 */
function updateTeacherInquiryTabUI(activeId) {
    document.querySelectorAll('[onclick^="window.switchTeacherInquiryTab"]').forEach(btn => {
        const match = btn.getAttribute('onclick').match(/'([^']+)'/);
        if (!match) return;
        const btnTab = match[1];
        const isActive = btnTab === activeId;
        const colorMap = { notices: 'blue', wonders: 'amber', ideas: 'purple', testableQuestions: 'green' };
        const color = colorMap[btnTab];
        
        btn.classList.remove('text-blue-600', 'text-amber-600', 'text-purple-600', 'text-green-600', 'bg-white', 'shadow-sm', 'text-gray-400');
        
        if (isActive) {
            btn.classList.add(`text-${color}-600`, 'bg-white', 'shadow-sm');
        } else {
            btn.classList.add('text-gray-400');
        }
    });
}

window.handleTeacherInquiryScroll = (el) => {
    if (App._isScrollingToTab) return;
    updateSwipeDots(el, 'teacherInquiryDots');
    const tabWidth = el.offsetWidth;
    const index = Math.round(el.scrollLeft / tabWidth);
    const tabs = ['notices', 'wonders', 'ideas', 'testableQuestions'];
    const activeId = tabs[index];
    if (activeId && App.uiState?.activeTeacherInquiryTab !== activeId) {
        if (!App.uiState) App.uiState = {};
        App.uiState.activeTeacherInquiryTab = activeId;
        updateTeacherInquiryTabUI(activeId);
    }
};

export async function clearAllPosts() {
    if (confirm('Clear discussion board?')) {
        App.sharedData.debatePosts = []; await saveToStorage(); await saveAndBroadcast('debatePosts', []); renderTeacherContent(); toast('Cleared', 'success');
    }
}

export const toggleDefaultCategories = async () => {
    App.teacherSettings.defaultCategoriesEnabled = !App.teacherSettings.defaultCategoriesEnabled;
    await saveToStorage(); renderTeacherContent();
};

export async function moveBoardItem(studentId, itemId, fromCat, toCat) {
    if (fromCat === toCat) return;
    try {
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + studentId);
        if (!saved?.work) return;
        let work = saved.work; const itemIndex = work[fromCat].findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;
        const [item] = work[fromCat].splice(itemIndex, 1);
        if (!work[toCat]) work[toCat] = []; work[toCat].push(item);
        await dbPut(STORE_SESSIONS, { code: App.classCode + ':work:' + studentId, work: work, timestamp: Date.now() });
        toast(`Moved to ${toCat}`, 'success'); renderTeacherContent();
    } catch (e) { console.error(e); }
}

export const addCategory = async () => { 
    const name = document.getElementById('newCategoryName')?.value.trim(); 
    const color = document.getElementById('newCategoryColor')?.value || '#3b82f6';
    if (name) { 
        App.teacherSettings.categories.push({ id: 'cat_' + Date.now(), name, color }); 
        await saveToStorage(); renderTeacherContent(); toast('Added', 'success');
    } 
};

export const updateCategoryName = async (id, name) => { const cat = App.teacherSettings.categories.find(c => c.id === id); if (cat) { cat.name = name; await saveToStorage(); } };
export const updateCategoryColor = async (id, color) => { const cat = App.teacherSettings.categories.find(c => c.id === id); if (cat) { cat.color = color; await saveToStorage(); renderTeacherContent(); } };
export const deleteCategory = async (id) => { if (confirm('Delete category?')) { App.teacherSettings.categories = App.teacherSettings.categories.filter(c => c.id !== id); await saveToStorage(); renderTeacherContent(); } };

export function renderModeration() {
    const posts = App.sharedData.debatePosts || [];
    const flaggedPosts = posts.filter(p => p.flagged);
    return `
        <div class="panels-container">
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Discussion Moderation">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-red-500">
                            <span class="iconify" data-icon="mdi:shield-account"></span>
                        </div>
                        <h3>Moderation</h3>
                        ${renderInfoTip('Ensure a safe and productive scientific environment. Review, edit, or delete posts from the collaborative board.')}
                    </div>
                </div>
                <div class="panel-content !justify-start">
                    <div class="flex justify-between items-center mb-6"><div class="flex gap-4"><div class="text-center"><p class="text-2xl font-black">${posts.length}</p><p class="text-[8px] font-black text-gray-400 uppercase">Posts</p></div><div class="text-center"><p class="text-2xl font-black text-red-600">${flaggedPosts.length}</p><p class="text-[8px] font-black text-red-400 uppercase">Flagged</p></div></div><button onclick="window.clearAllPosts()" class="text-[9px] font-black text-red-500 uppercase">Reset Board</button></div>
                    <div class="divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        ${posts.map(p => `
                            <div class="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group">
                                <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-sm shrink-0 font-black">${p.author.charAt(0)}</div>
                                <div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1"><span class="font-black text-gray-900 text-xs">${p.author}</span><span class="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[7px] font-black uppercase">${p.type}</span></div><p class="text-xs text-gray-700 leading-relaxed">${p.text}</p></div>
                                <div class="flex gap-1 opacity-0 group-hover:opacity-100"><button onclick="window.openArgumentFeedback('${p.id}')" class="p-2 text-blue-600"><span class="iconify" data-icon="mdi:comment-edit"></span></button><button onclick="window.deletePost('${p.id}')" class="p-2 text-red-500"><span class="iconify" data-icon="mdi:trash-can-outline"></span></button></div>
                            </div>`).join('') || '<div class="py-10 text-center opacity-30 text-[10px] font-black uppercase">No posts</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderCategoryManager() {
    const categories = App.teacherSettings.categories || [], defaultsEnabled = App.teacherSettings.defaultCategoriesEnabled;
    return `
        <div class="panels-container">
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Theme Settings">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-blue-500">
                            <span class="iconify" data-icon="mdi:cog"></span>
                        </div>
                        <h3>Themes</h3>
                        ${renderInfoTip('Themes help students categorize their thoughts. Enable defaults (Notices, Wonders, Ideas) or add your own custom tags.')}
                    </div>
                </div>
                <div class="panel-content !justify-start space-y-8">
                    <div class="hidden md:flex items-center justify-between mb-4 border-b pb-4">
                        <h3 class="font-black text-gray-900 uppercase text-sm">Theme Settings</h3>
                        ${renderInfoTip('Themes help students categorize their thoughts. Enable defaults (Notices, Wonders, Ideas) or add your own custom tags.')}
                    </div>
                    <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><span class="iconify text-xl" data-icon="mdi:eye"></span></div><div><h3 class="text-sm font-black text-gray-900">Inquiry Defaults</h3><p class="text-[8px] font-black text-gray-400 uppercase">N/W/I/Q</p></div></div>
                        <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" ${defaultsEnabled ? 'checked' : ''} onchange="window.toggleDefaultCategories()" class="sr-only peer"><div class="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div></label>
                    </div>
                    <div class="space-y-4">
                        <h3 class="text-[10px] font-black text-gray-900 uppercase tracking-widest ml-1">Custom Themes (Tags)</h3>
                        <div class="grid grid-cols-1 gap-2">
                            ${categories.map(cat => `<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm group"><input type="color" value="${cat.color}" onchange="window.updateCategoryColor('${cat.id}', this.value)" class="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent shrink-0"><input type="text" value="${cat.name}" onchange="window.updateCategoryName('${cat.id}', this.value)" class="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-bold text-gray-700 text-xs outline-none"><button onclick="window.deleteCategory('${cat.id}')" class="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><span class="iconify text-lg" data-icon="mdi:trash-can-outline"></span></button></div>`).join('') || '<p class="text-[10px] text-gray-400 italic text-center py-10 uppercase tracking-widest">No themes defined</p>'}
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white border-b flex flex-col h-full" data-card-title="New Theme">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-green-500">
                            <span class="iconify" data-icon="mdi:plus-circle"></span>
                        </div>
                        <h3>Add Tag</h3>
                        ${renderInfoTip('Create a new custom tag for students to use when labeling their inquiry board posts.')}
                    </div>
                </div>
                <div class="panel-content">
                    <div class="hidden md:flex items-center justify-between mb-6 border-b pb-4">
                        <h3 class="font-black text-gray-900 uppercase text-sm">Create New Tag</h3>
                        ${renderInfoTip('Create a new custom tag for students to use when labeling their inquiry board posts.')}
                    </div>
                    <div class="space-y-6"><input type="text" id="newCategoryName" placeholder="New Theme Name..." class="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none" onkeypress="if(event.key==='Enter')window.addCategory()">
                    <div class="flex gap-2"><input type="color" id="newCategoryColor" value="#3b82f6" class="w-14 h-14 rounded-2xl cursor-pointer border-none bg-transparent"><div class="flex-1 grid grid-cols-8 gap-1">${['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#64748b','#06b6d4'].map(c => `<button onclick="document.getElementById('newCategoryColor').value='${c}'" class="w-full aspect-square rounded-lg" style="background:${c}"></button>`).join('')}</div></div>
                    <button onclick="window.addCategory()" class="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg text-xs uppercase tracking-widest">Add Theme Tag</button></div>
                </div>
            </div>
        </div>
    `;
}
