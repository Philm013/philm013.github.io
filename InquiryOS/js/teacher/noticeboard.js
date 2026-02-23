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
        { id: 'notices', label: 'Notices', icon: 'mdi:eye', color: 'blue' },
        { id: 'wonders', label: 'Wonders', icon: 'mdi:lightbulb', color: 'yellow' },
        { id: 'ideas', label: 'Ideas', icon: 'mdi:thought-bubble', color: 'purple' },
        { id: 'testableQuestions', label: 'Testable Questions', icon: 'mdi:comment-question', color: 'green' }
    ];

    return `
        <div class="max-w-7xl mx-auto">
            <div class="mb-8 flex items-center justify-between">
                <div><h2 class="text-3xl font-black text-gray-900">Collaboration Board</h2><p class="text-gray-500">${studentList.length} students</p></div>
                <button onclick="window.renderTeacherNoticeBoard()" class="p-3 bg-white border rounded-xl hover:bg-gray-50 shadow-sm flex items-center gap-2"><span class="iconify" data-icon="mdi:refresh"></span>Refresh</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                ${categories.map(cat => `
                    <div class="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[700px] overflow-hidden">
                        <div class="p-5 border-b bg-gray-50 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-${cat.color}-100 text-${cat.color}-600 flex items-center justify-center">
                                <span class="iconify text-2xl" data-icon="${cat.icon}"></span>
                            </div>
                            <div><h3 class="font-bold text-gray-900">${cat.label}</h3><p class="text-[10px] text-gray-400 uppercase font-black">${items[cat.id].length} Items</p></div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            ${items[cat.id].map(item => `
                                <div class="group p-4 bg-white border-2 border-gray-50 rounded-2xl hover:border-${cat.color}-200 hover:shadow-md transition-all relative">
                                    <p class="text-gray-800 text-sm leading-relaxed mb-3">${item.text}</p>
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <div class="w-6 h-6 bg-${cat.color}-50 rounded-full flex items-center justify-center text-[10px] font-bold text-${cat.color}-600">${item.studentName.charAt(0)}</div>
                                            <span class="text-[10px] font-bold text-gray-400 uppercase">${item.studentName}</span>
                                        </div>
                                    </div>
                                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                        <select onchange="window.moveBoardItem('${item.studentId}', '${item.id}', '${item.originalCategory}', this.value)" class="text-[10px] bg-gray-50 border-gray-200 rounded px-1 py-0.5">
                                            <option value="" disabled selected>Move...</option>
                                            ${categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            `).join('') || `<div class="py-20 text-center text-gray-300 italic text-sm">No items yet</div>`}
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
        <div class="max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Category Manager</h2>
            <div class="bg-white rounded-2xl border p-6 space-y-4">
                ${App.teacherSettings.categories.map(cat => `
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
                        <input type="color" value="${cat.color}" onchange="window.updateCategoryColor('${cat.id}', this.value)" class="w-8 h-8 rounded border-0">
                        <input type="text" value="${cat.name}" onchange="window.updateCategoryName('${cat.id}', this.value)" class="flex-1 bg-white border rounded-lg px-3 py-1 text-sm font-medium">
                        <button onclick="window.deleteCategory('${cat.id}')" class="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                `).join('')}
                <button onclick="window.addCategory()" class="w-full py-3 bg-blue-50 text-primary font-bold rounded-xl hover:bg-blue-100 transition-colors">+ Add New Category</button>
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

window.deletePost = async (id) => { if (confirm('Delete post?')) { App.sharedData.debatePosts = App.sharedData.debatePosts.filter(p => p.id !== id); await saveToStorage(); renderTeacherContent(); } };
window.addCategory = async () => { const name = prompt('Category name:'); if (name) { App.teacherSettings.categories.push({ id: 'cat_' + Date.now(), name, color: '#3b82f6' }); await saveToStorage(); renderTeacherContent(); } };
window.updateCategoryName = async (id, name) => { const cat = App.teacherSettings.categories.find(c => c.id === id); if (cat) { cat.name = name; await saveToStorage(); } };
window.updateCategoryColor = async (id, color) => { const cat = App.teacherSettings.categories.find(c => c.id === id); if (cat) { cat.color = color; await saveToStorage(); renderTeacherContent(); } };
window.deleteCategory = async (id) => { if (confirm('Delete category?')) { App.teacherSettings.categories = App.teacherSettings.categories.filter(c => c.id !== id); await saveToStorage(); renderTeacherContent(); } };
