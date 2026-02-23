/**
 * @file noticeboard.js
 * @description specialized logic for the collaborative teacher view of the Notice & Wonder board. 
 */

import { App } from '../core/state.js';
import { dbGet, dbPut, dbGetByIndex, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveToStorage } from '../core/sync.js';
import { renderTeacherContent, renderModuleHeader, renderSectionHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

/**
 * Renders the consolidated Inquiry Collaboration Board for teachers.
 */
export async function renderTeacherNoticeBoard() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const studentList = allUsers.filter(u => u.mode === 'student');
    const phenomenon = App.teacherSettings?.phenomenon || { title: '', description: '', tags: [], ngssStandards: [] };
    
    // Determine active categories
    let activeCategories = [];
    if (App.teacherSettings.defaultCategoriesEnabled) {
        activeCategories = [
            { id: 'notices', label: 'Notices', icon: 'mdi:eye', color: 'blue' },
            { id: 'wonders', label: 'Wonders', icon: 'mdi:lightbulb', color: 'yellow' },
            { id: 'ideas', label: 'Ideas', icon: 'mdi:thought-bubble', color: 'purple' },
            { id: 'testableQuestions', label: 'Questions', icon: 'mdi:comment-question', color: 'green' }
        ];
    }
    
    const customCats = (App.teacherSettings.categories || []).map(c => ({
        id: c.id, label: c.name, icon: 'mdi:folder-star', color: 'primary', hex: c.color
    }));
    
    activeCategories = [...activeCategories, ...customCats];
    
    let items = {};
    activeCategories.forEach(cat => items[cat.id] = []);
    
    for (const student of studentList) {
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + student.visitorId);
        if (saved && saved.work) {
            activeCategories.forEach(cat => {
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
        <div class="max-w-full mx-auto pb-4 px-2 md:px-4">
            ${renderModuleHeader('Inquiry Board', 'mdi:bulletin-board', null)}

            <!-- Snappable Categories -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                ${activeCategories.map(cat => `
                    <div class="flex flex-col h-full bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100" data-card-title="${cat.label}">
                        ${renderSectionHeader(cat.label, cat.icon, cat.color === 'primary' ? 'blue' : cat.color)}
                        
                        <div class="flex-1 overflow-y-auto space-y-3 pr-1">
                        ${items[cat.id]?.map(item => `
                            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
                                <p class="text-sm font-bold text-gray-800 leading-snug mb-3">"${item.text}"</p>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                            ${item.studentName.charAt(0)}
                                        </div>
                                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${item.studentName}</span>
                                    </div>
                                    <div class="flex gap-1">
                                        <select onchange="window.moveBoardItem('${item.studentId}', '${item.id}', '${item.originalCategory}', this.value)" 
                                            class="text-[9px] font-black uppercase bg-gray-50 border-gray-200 rounded-lg px-2 py-1 focus:ring-0">
                                            <option value="" disabled selected>Move</option>
                                            ${activeCategories.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        `).join('') || '<div class="py-20 text-center opacity-30 text-xs font-black uppercase tracking-widest border-2 border-dashed rounded-3xl">No entries</div>'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}


export function renderModeration() {
    const posts = App.sharedData.debatePosts || [];
    const flaggedPosts = posts.filter(p => p.flagged);
    
    return `
        <div class="max-w-5xl mx-auto space-y-8">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tighter">Class Moderation</h2>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manage Discussions & Safety</p>
                </div>
                <div class="flex gap-4">
                    <div class="px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                        <p class="text-2xl font-black text-gray-900">${posts.length}</p>
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Posts</p>
                    </div>
                    <div class="px-6 py-3 bg-red-50 border border-red-100 rounded-2xl shadow-sm text-center">
                        <p class="text-2xl font-black text-red-600">${flaggedPosts.length}</p>
                        <p class="text-[9px] font-black text-red-400 uppercase tracking-widest">Flagged</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b bg-gray-50/50 flex items-center justify-between">
                    <h3 class="font-black text-gray-900 uppercase tracking-tight text-sm">Recent Activity</h3>
                    <button onclick="window.clearAllPosts()" class="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] hover:underline">Reset Entire Board</button>
                </div>
                
                <div class="divide-y divide-gray-100">
                    ${posts.map(p => `
                        <div class="p-6 flex items-start gap-6 hover:bg-gray-50/50 transition-colors group">
                            <div class="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-xl shrink-0 font-black">
                                ${p.author.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-1">
                                    <span class="font-black text-gray-900">${p.author}</span>
                                    <span class="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black uppercase tracking-widest">${p.type}</span>
                                    <span class="text-[10px] text-gray-400 font-medium">${new Date(p.time).toLocaleString()}</span>
                                    ${p.flagged ? '<span class="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase animate-pulse">Flagged</span>' : ''}
                                </div>
                                <p class="text-gray-700 font-medium leading-relaxed">${p.text}</p>
                                ${p.feedback ? `
                                    <div class="mt-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-2">
                                        <span class="text-lg">${p.feedback.sticker || '💬'}</span>
                                        <p class="text-xs text-blue-800 font-medium">${p.feedback.text}</p>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="window.openArgumentFeedback('${p.id}')" class="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all" title="Edit Feedback">
                                    <span class="iconify" data-icon="mdi:comment-edit"></span>
                                </button>
                                ${p.flagged ? `
                                    <button onclick="window.flagPost('${p.id}')" class="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all" title="Clear Flag">
                                        <span class="iconify" data-icon="mdi:flag-off"></span>
                                    </button>
                                ` : ''}
                                <button onclick="window.deletePost('${p.id}')" class="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all" title="Delete Post">
                                    <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                                </button>
                            </div>
                        </div>
                    `).join('') || `
                        <div class="py-20 text-center opacity-30 grayscale">
                            <span class="iconify text-6xl mb-4 mx-auto" data-icon="mdi:shield-check-outline"></span>
                            <p class="text-sm font-black uppercase tracking-widest">No activity to moderate</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Deletes all posts from the argument board.
 */
export async function clearAllPosts() {
    if (confirm('DANGER: This will permanently delete all posts from the class board. Continue?')) {
        App.sharedData.debatePosts = [];
        await saveToStorage();
        renderTeacherContent();
        toast('Discussion board reset', 'warning');
    }
}

export function renderCategoryManager() {
    const categories = App.teacherSettings.categories || [];
    const defaultsEnabled = App.teacherSettings.defaultCategoriesEnabled;
    
    return `
        <div class="max-w-4xl mx-auto space-y-8 pb-20">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tighter">Category Architect</h2>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Organize student contributions by scientific themes</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-6">
                    <!-- Default Categories Toggle -->
                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                    <span class="iconify text-2xl" data-icon="mdi:eye"></span>
                                </div>
                                <div>
                                    <h3 class="text-lg font-black text-gray-900">Scientific Inquiry Defaults</h3>
                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Notice, Wonder, Ideas, Questions</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${defaultsEnabled ? 'checked' : ''} 
                                    onchange="window.toggleDefaultCategories()" class="sr-only peer">
                                <div class="w-14 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>

                    <!-- Current Custom Categories -->
                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <h3 class="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                            <span class="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <span class="iconify" data-icon="mdi:view-column"></span>
                            </span>
                            Custom Categories
                        </h3>
                        
                        <div class="space-y-3" id="categoryList">
                            ${categories.map(cat => `
                                <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-[1.5rem] group border-2 border-transparent hover:border-primary/10 transition-all shadow-sm">
                                    <div class="relative">
                                        <input type="color" value="${cat.color}" onchange="window.updateCategoryColor('${cat.id}', this.value)" 
                                            class="w-12 h-12 rounded-xl cursor-pointer border-none shadow-inner bg-transparent">
                                        <div class="absolute inset-0 rounded-xl pointer-events-none border-2 border-white/20"></div>
                                    </div>
                                    <div class="flex-1">
                                        <input type="text" value="${cat.name}" onchange="window.updateCategoryName('${cat.id}', this.value)" 
                                            class="w-full bg-white border-2 border-gray-100 rounded-xl px-5 py-3 font-bold text-gray-700 focus:border-primary focus:outline-none transition-all shadow-sm">
                                    </div>
                                    <button onclick="window.deleteCategory('${cat.id}')" 
                                        class="p-3 bg-white text-gray-300 hover:text-red-500 rounded-xl border border-gray-100 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                        <span class="iconify text-xl" data-icon="mdi:trash-can-outline"></span>
                                    </button>
                                </div>
                            `).join('')}
                            
                            ${categories.length === 0 ? `
                                <div class="py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl opacity-30">
                                    <p class="font-black uppercase tracking-widest text-xs">No custom categories defined</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Create New -->
                <div class="space-y-6">
                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 sticky top-6">
                        <h3 class="text-lg font-black text-gray-900 mb-6">Add New Theme</h3>
                        <div class="space-y-6">
                            <div>
                                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Theme Name</label>
                                <input type="text" id="newCategoryName" placeholder="e.g. Energy Flow..." 
                                    class="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white focus:outline-none transition-all"
                                    onkeypress="if(event.key==='Enter')window.addCategory()">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Theme Color</label>
                                <div class="flex gap-2">
                                    <input type="color" id="newCategoryColor" value="#3b82f6" class="w-14 h-14 rounded-2xl cursor-pointer border-none shadow-sm bg-transparent">
                                    <div class="flex-1 grid grid-cols-4 gap-2">
                                        ${['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4'].map(c => `
                                            <button onclick="document.getElementById('newCategoryColor').value='${c}'" 
                                                class="w-full aspect-square rounded-lg border-2 border-white shadow-sm transition-transform hover:scale-110" 
                                                style="background:${c}"></button>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                            <button onclick="window.addCategory()" 
                                class="w-full py-5 bg-primary text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
                                <span class="iconify text-xl" data-icon="mdi:plus-circle"></span>
                                Add Category
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export const toggleDefaultCategories = async () => {
    App.teacherSettings.defaultCategoriesEnabled = !App.teacherSettings.defaultCategoriesEnabled;
    await saveToStorage();
    renderTeacherContent();
    toast(App.teacherSettings.defaultCategoriesEnabled ? 'Default categories enabled' : 'Default categories disabled', 'info');
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
        toast(`Moved to ${toCat}`, 'success'); window.renderTeacherNoticeBoard();
    } catch (e) { console.error(e); }
}

export const addCategory = async () => { 
    const name = document.getElementById('newCategoryName')?.value.trim(); 
    const color = document.getElementById('newCategoryColor')?.value || '#3b82f6';
    if (name) { 
        App.teacherSettings.categories.push({ id: 'cat_' + Date.now(), name, color }); 
        await saveToStorage(); 
        renderTeacherContent(); 
        toast('Category added!', 'success');
    } 
};

export const updateCategoryName = async (id, name) => { 
    const cat = App.teacherSettings.categories.find(c => c.id === id); 
    if (cat) { cat.name = name; await saveToStorage(); } 
};

export const updateCategoryColor = async (id, color) => { 
    const cat = App.teacherSettings.categories.find(c => c.id === id); 
    if (cat) { cat.color = color; await saveToStorage(); renderTeacherContent(); } 
};

export const deleteCategory = async (id) => { 
    if (confirm('Delete category? This will not delete student items, but they will be uncategorized.')) { 
        App.teacherSettings.categories = App.teacherSettings.categories.filter(c => c.id !== id); 
        await saveToStorage(); 
        renderTeacherContent(); 
    } 
};

