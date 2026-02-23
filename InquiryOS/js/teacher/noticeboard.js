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
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-black text-gray-900">Notice & Wonder Board</h2>
                    <p class="text-gray-500 mt-1">Live collaborative view of contributions from ${studentList.length} students.</p>
                </div>
                <button onclick="window.renderTeacherContent()" class="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm flex items-center gap-2 font-bold text-gray-600 transition-all active:scale-95">
                    <span class="iconify" data-icon="mdi:refresh"></span>
                    Refresh Board
                </button>
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
    return `
        <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Discussion Moderation</h2>
            <div class="bg-white rounded-2xl border p-6">
                ${(App.sharedData.debatePosts || []).map(p => `
                    <div class="p-4 border-b last:border-0 flex justify-between items-center group">
                        <div>
                            <p class="font-bold text-sm">${p.author} <span class="text-[10px] text-gray-400 font-normal uppercase ml-2">${p.type}</span></p>
                            <p class="text-gray-700 mt-1">${p.text}</p>
                        </div>
                        <button onclick="window.deletePost('${p.id}')" class="text-red-400 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                    </div>
                `).join('') || '<p class="text-gray-400 text-center py-8">No posts yet</p>'}
            </div>
        </div>
    `;
}

export function renderCategoryManager() {
    return `
        <div class="max-w-3xl mx-auto">
            <div class="mb-8">
                <h2 class="text-3xl font-black text-gray-900">Contribution Categories</h2>
                <p class="text-gray-500 mt-1">Customize the columns and tags used on the collaborative board.</p>
            </div>
            
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div class="space-y-4 mb-10" id="categoryList">
                    ${App.teacherSettings.categories.map(cat => `
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl group border-2 border-transparent hover:border-primary/10 transition-all">
                            <input type="color" value="${cat.color}" onchange="window.updateCategoryColor('${cat.id}', this.value)" 
                                class="w-10 h-10 rounded-xl cursor-pointer border-none shadow-sm">
                            <div class="flex-1">
                                <input type="text" value="${cat.name}" onchange="window.updateCategoryName('${cat.id}', this.value)" 
                                    class="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-2 font-bold text-gray-700 focus:border-primary focus:outline-none transition-all">
                            </div>
                            <button onclick="window.deleteCategory('${cat.id}')" 
                                class="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                <span class="iconify text-xl" data-icon="mdi:trash-can-outline"></span>
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="p-6 bg-blue-50/50 rounded-3xl border-2 border-dashed border-blue-100">
                    <h4 class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 ml-1">Create New Category</h4>
                    <div class="flex gap-3">
                        <input type="text" id="newCategoryName" placeholder="e.g. My Observations..." 
                            class="flex-1 px-5 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-medium focus:border-primary focus:outline-none transition-all"
                            onkeypress="if(event.key==='Enter')window.addCategory()">
                        <input type="color" id="newCategoryColor" value="#3b82f6" class="w-12 h-12 rounded-2xl cursor-pointer border-none shadow-sm">
                        <button onclick="window.addCategory()" 
                            class="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:-translate-y-0.5 transition-all">
                            Add Category
                        </button>
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

/**
 * Deletes a discussion post.
 */
export async function deletePost(id) {
    if (confirm('Delete this post?')) {
        App.sharedData.debatePosts = App.sharedData.debatePosts.filter(p => p.id !== id);
        await saveToStorage();
        renderTeacherContent();
        toast('Post deleted', 'info');
    }
}

