/**
 * @file noticeboard.js
 * @description specialized logic for the collaborative teacher view of the Notice & Wonder board. 
 */

import { App } from '../core/state.js';
import { dbGet, dbPut, dbGetByIndex, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveToStorage } from '../core/sync.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

/**
 * Renders the consolidated Inquiry Collaboration Board for teachers.
 */
export async function renderTeacherNoticeBoard() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const studentList = allUsers.filter(u => u.mode === 'student');
    const phenomenon = App.teacherSettings?.phenomenon || { title: '', description: '', tags: [], ngssStandards: [] };
    const linkedStandards = phenomenon.ngssStandards || [];
    
    let items = { notices: [], wonders: [], ideas: [], testableQuestions: [] };
    
    for (const student of studentList) {
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + student.visitorId);
        if (saved && saved.work) {
            ['notices', 'wonders', 'ideas', 'testableQuestions'].forEach(key => {
                if (saved.work[key]) {
                    items[key] = items[key].concat(saved.work[key].map(item => ({ 
                        ...item, studentName: student.name, studentId: student.visitorId, originalCategory: key 
                    })));
                }
            });
        }
    }
    
    Object.keys(items).forEach(k => items[k].sort((a, b) => b.time - a.time));

    const categories = [
        { id: 'notices', label: 'Notices', icon: 'mdi:eye', color: 'blue', desc: 'Observations' },
        { id: 'wonders', label: 'Wonders', icon: 'mdi:lightbulb', color: 'yellow', desc: 'Curiosities' },
        { id: 'ideas', label: 'Ideas', icon: 'mdi:thought-bubble', color: 'purple', desc: 'Initial Thoughts' },
        { id: 'testableQuestions', label: 'Questions', icon: 'mdi:comment-question', color: 'green', desc: 'Investigatable' }
    ];

    return `
        <div class="max-w-7xl mx-auto">
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 class="text-3xl font-black text-gray-900">Inquiry Collaboration Board</h2>
                    <p class="text-gray-500 mt-1">Live collaborative view of contributions from ${studentList.length} student scientists.</p>
                </div>
                <div class="flex flex-wrap gap-3 items-center">
                    <div class="flex -space-x-2 mr-4">
                        ${studentList.slice(0, 5).map(s => `
                            <div class="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold shadow-sm" title="${s.name}">
                                ${s.avatar || s.name.charAt(0).toUpperCase()}
                            </div>
                        `).join('')}
                        ${studentList.length > 5 ? `<div class="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-black shadow-sm">+${studentList.length - 5}</div>` : ''}
                    </div>
                    <button onclick="window.renderTeacherContent()" class="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-all flex items-center gap-2 font-bold active:scale-95">
                        <span class="iconify text-xl" data-icon="mdi:refresh"></span>
                        Refresh Board
                    </button>
                </div>
            </div>

            <!-- Dark Mode Phenomenon & standards section -->
            <div class="mb-8 p-8 bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 rounded-[2.5rem] text-white shadow-2xl border border-white/5 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-8 opacity-10">
                    <span class="iconify text-9xl" data-icon="mdi:microscope"></span>
                </div>
                
                <div class="flex flex-col lg:flex-row gap-10 relative z-10">
                    <div class="flex-1">
                        <div class="flex items-center gap-4 mb-6">
                            <span class="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                                <span class="iconify text-3xl text-blue-300" data-icon="mdi:flask-outline"></span>
                            </span>
                            <div>
                                <h3 class="text-2xl font-black tracking-tight">Active Phenomenon: ${phenomenon.title || 'Inquiry Project'}</h3>
                                <div class="flex gap-2 mt-1">
                                    ${phenomenon.tags?.map(t => `<span class="text-[10px] font-black uppercase tracking-widest text-blue-400/80">${t}</span>`).join(' • ') || '<span class="text-[10px] font-black uppercase tracking-widest text-blue-400/80">Scientific Exploration</span>'}
                                </div>
                            </div>
                        </div>
                        <p class="text-blue-100/70 text-lg leading-relaxed mb-6 font-medium">${phenomenon.description || 'Observe, question, and investigate the scientific mystery presented in class.'}</p>
                        <div class="flex gap-2">
                            <button onclick="window.showTeacherModule('overview')" class="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Edit Context</button>
                        </div>
                    </div>
                    
                    <div class="w-full lg:w-96 p-6 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10 flex flex-col">
                        <h4 class="text-xs font-black uppercase tracking-widest text-blue-300 mb-4 flex items-center gap-2">
                            <span class="iconify" data-icon="mdi:medal"></span>
                            Linked NGSS Dimensions
                        </h4>
                        <div class="space-y-3 flex-1">
                            ${linkedStandards.length > 0 ? linkedStandards.map(s => `
                                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group transition-all hover:bg-white/10">
                                    <div class="w-2 h-2 rounded-full bg-blue-400"></div>
                                    <span class="text-xs font-bold text-white">${s}</span>
                                    <span class="text-[10px] text-gray-400 ml-auto font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">PE</span>
                                </div>
                            `).join('') : `
                                <div class="py-10 text-center border-2 border-dashed border-white/10 rounded-2xl">
                                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">No Standards Linked</p>
                                    <button onclick="window.showTeacherModule('ngss')" class="mt-2 text-xs text-blue-400 font-bold hover:underline">Browse Standards</button>
                                </div>
                            `}
                        </div>
                        <div class="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 bg-blue-600 rounded-lg text-[9px] font-black uppercase">SEP1</span>
                                <span class="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Asking Questions</span>
                            </div>
                            <span class="iconify text-gray-600" data-icon="mdi:chevron-right"></span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                ${categories.map(cat => `
                    <div class="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[700px] overflow-hidden">
                        <div class="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-${cat.color}-100 text-${cat.color}-600 flex items-center justify-center shadow-sm">
                                <span class="iconify text-2xl" data-icon="${cat.icon}"></span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-bold text-gray-900 leading-tight">${cat.label}</h3>
                                <p class="text-[10px] text-gray-400 uppercase font-black tracking-widest">${items[cat.id].length} Total</p>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/20">
                            ${items[cat.id].map(item => `
                                <div class="group p-4 bg-white border-2 border-gray-50 rounded-2xl hover:border-${cat.color}-200 hover:shadow-md transition-all relative">
                                    <p class="text-gray-800 text-sm leading-relaxed mb-4">${item.text}</p>
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <div class="w-6 h-6 bg-${cat.color}-50 rounded-full flex items-center justify-center text-[10px] font-bold text-${cat.color}-600 border border-${cat.color}-100">
                                                ${item.studentName.charAt(0).toUpperCase()}
                                            </div>
                                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${item.studentName}</span>
                                        </div>
                                        <div class="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                            <select onchange="window.moveBoardItem('${item.studentId}', '${item.id}', '${item.originalCategory}', this.value)" 
                                                class="text-[9px] font-black uppercase bg-gray-50 border-gray-200 rounded-lg px-2 py-1 focus:ring-0 cursor-pointer">
                                                <option value="" disabled selected>Move...</option>
                                                ${categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            `).join('') || `
                                <div class="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale py-20">
                                    <span class="iconify text-6xl mb-4" data-icon="${cat.icon}"></span>
                                    <p class="text-xs font-black uppercase tracking-widest">Empty</p>
                                </div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
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
    
    return `
        <div class="max-w-4xl mx-auto space-y-8">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tighter">Category Architect</h2>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Organize student contributions by scientific themes</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Current Categories -->
                <div class="lg:col-span-2 space-y-4">
                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <h3 class="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                            <span class="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <span class="iconify" data-icon="mdi:view-column"></span>
                            </span>
                            Active Categories
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
                        <h3 class="text-lg font-black text-gray-900 mb-6">Create New</h3>
                        <div class="space-y-6">
                            <div>
                                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Category Name</label>
                                <input type="text" id="newCategoryName" placeholder="e.g. Observations..." 
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

