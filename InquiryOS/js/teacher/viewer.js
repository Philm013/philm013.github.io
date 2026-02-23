/**
 * @file viewer.js
 * @description specialized logic for real-time monitoring and feedback on student models and data. 
 */

import { dbGet, dbGetByIndex, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveAndBroadcast, loadFromStorage, saveToStorage } from '../core/sync.js';
import { renderTeacherContent, updateModeUI } from '../ui/renderer.js';
import { toast, calculateStudentProgress } from '../ui/utils.js';

/**
 * Switches the teacher to view a specific student's work.
 */
export async function viewStudentWork(visitorId) {
    App.viewingStudentId = visitorId;
    App.viewerState.isMonitoring = true;
    
    // Load student work into App.work
    const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + visitorId);
    if (saved && saved.work) {
        App.work = saved.work;
    } else {
        toast('No work found for this student', 'warning');
    }
    
    updateModeUI();
    renderTeacherContent();
}

/**
 * Stops viewing a student's work and returns to general teacher dashboard.
 */
export async function stopViewingStudent() {
    App.viewingStudentId = null;
    App.viewerState.isMonitoring = false;
    
    // Reload teacher's own state (like phenomenon)
    await loadFromStorage();
    
    updateModeUI();
    renderTeacherContent();
}

export async function renderLiveModels() {
    if (!App.viewingStudentId) return renderStudentSelectionTiles('View Student Models', 'livemodels');
    
    const users = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const currentStudent = users.find(u => u.visitorId === App.viewingStudentId);

    return `
        <div class="h-full flex flex-col -m-6">
            <div class="bg-white border-b p-4 flex items-center justify-between shadow-sm shrink-0">
                <div class="flex items-center gap-3">
                    <button onclick="window.stopViewingStudent()" class="p-2 hover:bg-gray-100 rounded-lg"><span class="iconify" data-icon="mdi:arrow-left"></span></button>
                    <div>
                        <h3 class="font-bold">Viewing Model: ${currentStudent?.name || 'Student'}</h3>
                        <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">${!App.teacherSettings.showCommentsToStudents ? 'Feedback Hidden' : 'Feedback Visible to Student'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.presentToClass('model')" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2">
                        <span class="iconify" data-icon="mdi:presentation"></span>
                        Present
                    </button>
                </div>
            </div>
            <div id="viewerCanvas" class="flex-1 bg-slate-100 model-canvas relative overflow-hidden" onclick="window.handleViewerClick(event)">
                <div id="viewerCanvasContent" class="absolute inset-0 origin-top-left pointer-events-none">
                    <svg id="viewerPathsSvg" class="absolute inset-0 w-full h-full" style="z-index: 6; pointer-events: none;"></svg>
                    <svg id="viewerConnectionsSvg" class="connection-line">
                        <defs><marker id="viewerArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/></marker></defs>
                    </svg>
                    <div id="viewerShapesLayer" class="absolute inset-0" style="z-index: 5;"></div>
                    <div id="viewerNodesLayer" class="absolute inset-0" style="z-index: 10;"></div>
                    <div id="viewerCommentsLayer" class="absolute inset-0" style="z-index: 20;"></div>
                </div>
                <div class="readonly-overlay"></div>
                ${renderViewerToolbar()}
            </div>
        </div>
    `;
}

function renderViewerToolbar() {
    const stickers = ['⭐', '✅', '❓', '💡', '🎯', '👏'];
    return `
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border p-2 flex items-center gap-2 z-[60]">
            <button onclick="window.setViewerTool('comment')" class="p-3 rounded-xl hover:bg-primary/10 ${App.viewerState.addingComment ? 'bg-primary text-white' : 'text-primary'}">
                <span class="iconify text-xl" data-icon="mdi:comment-plus"></span>
            </button>
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            ${stickers.map(s => `<button onclick="window.setViewerSticker('${s}')" class="p-2 rounded-xl hover:bg-gray-100 ${App.viewerState.selectedSticker === s ? 'bg-blue-100' : ''}">${s}</button>`).join('')}
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            <button onclick="window.clearViewerFeedback()" class="p-3 text-red-500 hover:bg-red-50 rounded-xl"><span class="iconify text-xl" data-icon="mdi:delete-sweep"></span></button>
        </div>
    `;
}

async function renderStudentSelectionTiles(title, targetModule) {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    const now = Date.now();

    return `
        <div class="max-w-6xl mx-auto py-8">
            <div class="mb-8">
                <h2 class="text-3xl font-black text-gray-900">${title}</h2>
                <p class="text-gray-500 mt-1">Select a student to monitor their ${targetModule === 'livemodels' ? 'model' : 'data table'} in real-time.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${await Promise.all(students.map(async s => {
                    const isOnline = now - s.lastSeen < 15000;
                    const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + s.visitorId);
                    const progress = saved ? calculateStudentProgress(saved.work) : 0;
                    
                    return `
                        <div onclick="window.viewStudentWork('${s.visitorId}')" 
                            class="p-6 bg-white rounded-3xl border-2 border-transparent hover:border-primary cursor-pointer transition-all shadow-sm hover:shadow-xl group">
                            <div class="flex items-start justify-between mb-6">
                                <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white group-hover:scale-110 transition-transform">
                                    ${s.avatar || s.name.charAt(0).toUpperCase()}
                                </div>
                                <span class="px-3 py-1 ${isOnline ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'} rounded-full text-[10px] font-black uppercase tracking-widest border">
                                    ${isOnline ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                            <h3 class="font-bold text-gray-900 text-xl mb-1">${s.name}</h3>
                            <div class="flex items-center gap-2 mt-4">
                                <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div class="h-full bg-primary" style="width:${progress}%"></div>
                                </div>
                                <span class="text-xs font-black text-primary">${progress}%</span>
                            </div>
                        </div>
                    `;
                })).then(res => res.join(''))}
                
                ${students.length === 0 ? `
                    <div class="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                        <span class="iconify text-6xl text-gray-200 mb-4" data-icon="mdi:account-group-outline"></span>
                        <h3 class="text-lg font-bold text-gray-400">No Students Connected</h3>
                        <p class="text-sm text-gray-400 mt-1">Ask students to join using code: <span class="font-mono font-black text-primary">${App.classCode}</span></p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

export async function renderLiveData() {
    if (!App.viewingStudentId) return renderStudentSelectionTiles('View Student Data', 'livedata');
    const dt = App.work.dataTable;
    const users = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const currentStudent = users.find(u => u.visitorId === App.viewingStudentId);
    const stickers = ['⭐', '✅', '❓', '💡', '🎯', '👏'];

    return `
        <div class="max-w-6xl mx-auto p-6">
            <div class="mb-8 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button onclick="window.stopViewingStudent()" class="p-2 bg-white border rounded-xl hover:bg-gray-50 shadow-sm transition-all"><span class="iconify" data-icon="mdi:arrow-left"></span></button>
                    <div>
                        <h2 class="text-2xl font-black text-gray-900">Data Table: ${currentStudent?.name || 'Student'}</h2>
                        <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Live Monitoring</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.presentToClass('data')" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2">
                        <span class="iconify" data-icon="mdi:presentation"></span>
                        Present
                    </button>
                    <button onclick="window.stopViewingStudent()" class="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all">Close Viewer</button>
                </div>
            </div>
            <div class="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                            <th class="border p-2 w-10"></th>
                            ${dt.columns.map(c => `
                                <th class="p-5 text-left font-black text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100 last:border-0">${c.name} ${c.unit ? `(${c.unit})` : ''}</th>
                            `).join('')}
                            <th class="p-5 text-center font-black text-gray-400 uppercase tracking-widest text-[10px] w-32">Feedback</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dt.rows.map((r, ri) => `
                            <tr class="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                                <td class="border p-2 text-center text-gray-400 text-[10px]">${ri + 1}</td>
                                ${dt.columns.map(c => `
                                    <td class="p-5 text-sm text-gray-700 border-r border-gray-50 last:border-0">${r[c.id] || '<span class="text-gray-200">...</span>'}</td>
                                `).join('')}
                                <td class="p-2 text-center border-l border-gray-100">
                                    <div class="flex flex-wrap justify-center gap-1">
                                        ${stickers.slice(0, 3).map(s => `
                                            <button onclick="window.addDataRowSticker(${ri}, '${s}')" 
                                                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 transition-all ${dt.feedback?.[ri] === s ? 'bg-blue-100 ring-2 ring-blue-400 scale-110' : ''}">
                                                ${s}
                                            </button>
                                        `).join('')}
                                        <button onclick="window.addDataRowSticker(${ri}, null)" class="text-[10px] text-gray-300 hover:text-red-500">×</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${dt.rows.length === 0 ? '<div class="py-20 text-center text-gray-300 italic">No data entered yet</div>' : ''}
            </div>
        </div>
    `;
}

/**
 * Adds a feedback sticker to a specific data row.
 */
export async function addDataRowSticker(rowIndex, emoji) {
    if (!App.work.dataTable.feedback) App.work.dataTable.feedback = {};
    if (emoji === null) {
        delete App.work.dataTable.feedback[rowIndex];
    } else {
        App.work.dataTable.feedback[rowIndex] = emoji;
    }
    await saveAndBroadcast('dataTable.feedback', App.work.feedback);
    renderTeacherContent();
}


export function renderIconManager() {
    const topPrefixes = ['mdi', 'fa6-solid', 'lucide', 'tabler', 'ph', 'carbon', 'fluent', 'heroicons', 'bi', 'ri'];
    const popularSets = App.availableIconSets.filter(s => topPrefixes.includes(s.prefix));

    return `
        <div class="max-w-5xl mx-auto">
            <div class="mb-8">
                <h2 class="text-3xl font-black text-gray-900">Icon & Emoji Library</h2>
                <p class="text-gray-500 mt-1">Curate Modeling assets available to students during practice.</p>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Curated Icons -->
                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-bold text-gray-900 flex items-center gap-2">
                            <span class="iconify text-primary" data-icon="mdi:palette-swatch"></span>
                            Lesson Icons (${App.teacherSettings.lessonIcons?.length || 0})
                        </h3>
                        <button onclick="window.clearLessonIcons()" class="text-xs font-black text-red-500 uppercase tracking-widest hover:underline">Clear All</button>
                    </div>
                    <div class="flex flex-wrap gap-2 p-4 bg-blue-50/50 rounded-2xl min-h-[120px] mb-4 border border-blue-50">
                        ${App.teacherSettings.lessonIcons?.length ? App.teacherSettings.lessonIcons.map(icon => `
                            <button onclick="window.removeLessonIcon('${icon}')" class="p-3 bg-white rounded-xl border-2 border-primary hover:border-red-500 hover:bg-red-50 transition-all group relative shadow-sm">
                                <span class="iconify text-xl" data-icon="${icon}"></span>
                                <span class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 scale-75 transition-all">
                                    <span class="iconify" data-icon="mdi:close"></span>
                                </span>
                            </button>
                        `).join('') : '<p class="text-blue-400 text-sm italic m-auto">No icons selected - using defaults</p>'}
                    </div>
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div>
                            <p class="text-sm font-bold text-gray-700">Allow Global Search</p>
                            <p class="text-[10px] text-gray-400 uppercase font-black">Let students browse all libraries</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" ${App.teacherSettings.showAllIcons ? 'checked' : ''} onchange="window.toggleShowAllIcons()" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                    </div>
                </div>

                <!-- Curated Emojis -->
                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-bold text-gray-900 flex items-center gap-2">
                            <span class="iconify text-yellow-500" data-icon="mdi:sticker-emoji"></span>
                            Lesson Emojis (${App.teacherSettings.lessonEmojis?.length || 0})
                        </h3>
                        <button onclick="window.clearLessonEmojis()" class="text-xs font-black text-red-500 uppercase tracking-widest hover:underline">Clear All</button>
                    </div>
                    <div class="flex flex-wrap gap-2 p-4 bg-yellow-50/50 rounded-2xl min-h-[120px] mb-6 border border-yellow-50">
                        ${App.teacherSettings.lessonEmojis?.length ? App.teacherSettings.lessonEmojis.map(emoji => `
                            <button onclick="window.removeLessonEmoji('${emoji}')" class="text-3xl p-2 bg-white rounded-xl border-2 border-transparent hover:border-red-500 hover:bg-red-50 transition-all group relative shadow-sm">
                                ${emoji}
                                <span class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 scale-75 transition-all">
                                    <span class="iconify" data-icon="mdi:close"></span>
                                </span>
                            </button>
                        `).join('') : '<p class="text-yellow-600 text-sm italic m-auto">No emojis selected</p>'}
                    </div>
                    <div class="flex flex-col gap-3">
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Add from Library</p>
                        <div class="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-2xl overflow-y-auto max-h-32 border border-gray-100">
                            ${['🔬','🧪','🧬','🌍','🔭','🌱','🔋','🌡️','🤖','🚀','🧠','🌋','🐳','🐝','☀️','🌪️','🔥','💧','💨','🧱','⚙️','⚖️','🍎','🥩','🌲','🌻','🐟','🐦','🦋','☁️','⛈️','💀','👾','🤖','📡','🛸','🛸'].map(e => `
                                <button onclick="window.addLessonEmoji('${e}')" class="text-2xl p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all active:scale-90">${e}</button>
                            `).join('')}
                        </div>
                        <div class="relative mt-2">
                            <input type="text" id="customEmojiInput" placeholder="Paste custom emojis..." class="w-full pl-4 pr-24 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:border-primary focus:bg-white focus:outline-none transition-all">
                            <button onclick="window.addCustomEmojis()" class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black">Add</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Library Browser -->
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <h3 class="text-xl font-black text-gray-900 mb-8">Icon Library Browser</h3>
                
                <div class="mb-8">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-4 block">Filter by Collection</label>
                    <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                        <button onclick="window.changeIconSet(null)" 
                            class="px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${!App.currentIconSet ? 'bg-primary border-primary text-white shadow-md shadow-blue-100' : 'bg-white border-gray-50 text-gray-400 hover:border-primary/30 hover:text-primary'}">
                            All Collections
                        </button>
                        ${popularSets.map(s => `
                            <button onclick="window.changeIconSet('${s.prefix}')" 
                                class="px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${App.currentIconSet === s.prefix ? 'bg-primary border-primary text-white shadow-md shadow-blue-100' : 'bg-white border-gray-50 text-gray-400 hover:border-primary/30 hover:text-primary'}">
                                ${s.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-8">
                    <div class="flex gap-3">
                        <div class="relative flex-1">
                            <span class="iconify absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" data-icon="mdi:magnify"></span>
                            <input type="text" id="iconManagerSearch" placeholder="Search across thousands of icons..." 
                                class="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-medium focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
                                onkeypress="if(event.key==='Enter')window.searchIconsForManager()">
                        </div>
                        <button onclick="window.searchIconsForManager()" class="px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:-translate-y-0.5 transition-all">
                            Search
                        </button>
                    </div>
                </div>
                
                <div id="iconManagerGrid" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 min-h-[300px] max-h-[600px] overflow-y-auto p-6 bg-gray-50/50 rounded-3xl border border-gray-50 custom-scrollbar">
                    <div class="col-span-full py-20 text-center flex flex-col items-center opacity-30 grayscale">
                        <span class="iconify text-6xl mb-4" data-icon="mdi:cloud-search-outline"></span>
                        <p class="text-sm font-bold uppercase tracking-widest">Select a collection or search to begin</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Loads icons from Iconify for the manager view.
 */
export async function loadIconsForManager() {
    const grid = document.getElementById('iconManagerGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="col-span-full py-20 flex items-center justify-center h-full"><span class="iconify animate-spin text-4xl text-primary" data-icon="mdi:loading"></span></div>';
    
    // We reuse the existing icon loading logic from search
    const prefixes = App.currentIconSet || null;
    const query = document.getElementById('iconManagerSearch')?.value.trim() || '';
    
    try {
        let url = `https://api.iconify.design/search?query=${encodeURIComponent(query || 'science')}&limit=150`;
        if (prefixes) url += `&prefixes=${prefixes}`;
        const response = await fetch(url);
        const data = await response.json();
        const icons = data.icons || [];

        if (icons.length === 0) {
            grid.innerHTML = '<p class="col-span-full text-center text-gray-400 py-20">No icons found. Try a different search.</p>';
            return;
        }

        grid.innerHTML = icons.map(icon => {
            const isSelected = App.teacherSettings.lessonIcons?.includes(icon);
            return `
                <button onclick="window.addLessonIcon('${icon}')" 
                    class="p-4 rounded-2xl transition-all aspect-square flex items-center justify-center ${isSelected ? 'bg-primary text-white shadow-lg shadow-blue-200 ring-4 ring-primary/20' : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-primary border border-gray-100 shadow-sm'}"
                    title="${icon}">
                    <span class="iconify text-2xl" data-icon="${icon}"></span>
                </button>
            `;
        }).join('');
    } catch (e) {
        grid.innerHTML = '<p class="col-span-full text-center text-red-400 py-20">Failed to connect to library. Check connection.</p>';
    }
}

export const changeIconSet = async (prefix) => { App.currentIconSet = prefix; renderTeacherContent(); loadIconsForManager(); };
export const searchIconsForManager = () => { loadIconsForManager(); };

export const addLessonIcon = async (icon) => {
    if (!App.teacherSettings.lessonIcons) App.teacherSettings.lessonIcons = [];
    if (!App.teacherSettings.lessonIcons.includes(icon)) {
        App.teacherSettings.lessonIcons.push(icon);
        await saveToStorage(); renderTeacherContent(); toast('Icon added to lesson', 'success');
    }
};

export const removeLessonIcon = async (icon) => {
    App.teacherSettings.lessonIcons = (App.teacherSettings.lessonIcons || []).filter(i => i !== icon);
    await saveToStorage(); renderTeacherContent(); toast('Icon removed', 'info');
};

export const clearLessonIcons = async () => {
    if (confirm('Clear all curated icons? Defaults will be used.')) {
        App.teacherSettings.lessonIcons = []; await saveToStorage(); renderTeacherContent();
    }
};

export const addLessonEmoji = async (emoji) => {
    if (!App.teacherSettings.lessonEmojis) App.teacherSettings.lessonEmojis = [];
    if (!App.teacherSettings.lessonEmojis.includes(emoji)) {
        App.teacherSettings.lessonEmojis.push(emoji);
        await saveAndBroadcast('lessonEmojis', App.teacherSettings.lessonEmojis);
        renderTeacherContent();
    }
};

export const addCustomEmojis = async () => {
    const input = document.getElementById('customEmojiInput');
    const val = input?.value.trim();
    if (!val) return;
    const emojis = val.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu);
    if (emojis) {
        emojis.forEach(e => {
            if (!App.teacherSettings.lessonEmojis.includes(e)) App.teacherSettings.lessonEmojis.push(e);
        });
        await saveAndBroadcast('lessonEmojis', App.teacherSettings.lessonEmojis);
        input.value = ''; renderTeacherContent(); toast('Emojis added!', 'success');
    }
};

export const removeLessonEmoji = async (emoji) => {
    App.teacherSettings.lessonEmojis = (App.teacherSettings.lessonEmojis || []).filter(e => e !== emoji);
    await saveAndBroadcast('lessonEmojis', App.teacherSettings.lessonEmojis); renderTeacherContent();
};

export const clearLessonEmojis = async () => {
    if (confirm('Clear all emojis?')) {
        App.teacherSettings.lessonEmojis = []; await saveAndBroadcast('lessonEmojis', []); renderTeacherContent();
    }
};

export const toggleShowAllIcons = async () => {
    App.teacherSettings.showAllIcons = !App.teacherSettings.showAllIcons;
    await saveToStorage(); renderTeacherContent();
};

/**
 * Re-renders all elements on the teacher's viewer canvas.
 */
export function initViewerCanvas() {
    const canvas = document.getElementById('viewerCanvasContent');
    if (!canvas) return;
    
    // We re-use student modeling render logic but in a read-only context
    const nodesLayer = document.getElementById('viewerNodesLayer');
    const shapesLayer = document.getElementById('viewerShapesLayer');
    const commentsLayer = document.getElementById('viewerCommentsLayer');
    const pathsSvg = document.getElementById('viewerPathsSvg');
    const connectionsSvg = document.getElementById('viewerConnectionsSvg');

    if (nodesLayer) {
        nodesLayer.innerHTML = App.work.modelNodes.map(n => `
            <div class="model-node absolute pointer-events-none border-2 rounded-xl p-3 bg-white shadow-sm flex items-center gap-2" 
                style="left:${n.x}px; top:${n.y}px; width:${n.width || 120}px; border-color:${n.color}">
                <span class="text-xl">${n.icon?.includes(':') ? `<span class="iconify" data-icon="${n.icon}"></span>` : n.icon}</span>
                <span class="text-xs font-bold truncate">${n.label}</span>
            </div>
        `).join('');
    }

    if (shapesLayer) {
        shapesLayer.innerHTML = (App.work.modelShapes || []).map(s => `
            <div class="model-shape absolute pointer-events-none" 
                style="left:${s.x}px; top:${s.y}px; width:${s.width}px; height:${s.height}px; transform: rotate(${s.rotation || 0}deg)">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${window.getShapeSvgContent(s)}
                </svg>
            </div>
        `).join('');
    }

    if (pathsSvg) {
        pathsSvg.innerHTML = (App.work.modelPaths || []).map(path => {
            const d = path.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
            return `<path d="${d}" stroke="${path.color}" stroke-width="${path.width}" fill="none" />`;
        }).join('');
    }

    if (commentsLayer) {
        commentsLayer.innerHTML = (App.work.modelComments || []).map(c => `
            <div class="comment-bubble" style="left:${c.x}px; top:${c.y}px;">
                <p class="font-bold text-[10px] text-red-600 uppercase mb-1">${c.author}</p>
                ${c.text}
            </div>
        `).join('') + (App.work.modelStickers || []).map(s => `
            <div class="absolute text-3xl pointer-events-none" style="left:${s.x}px; top:${s.y}px;">${s.emoji}</div>
        `).join('');
    }

    // Connections
    if (connectionsSvg) {
        connectionsSvg.querySelectorAll('path').forEach(p => p.remove());
        App.work.modelConnections.forEach(conn => {
            const fromNode = App.work.modelNodes.find(n => n.id === conn.from);
            const toNode = App.work.modelNodes.find(n => n.id === conn.to);
            if (fromNode && toNode) {
                const start = window.getHandlePosition(fromNode, conn.fromHandle);
                const end = window.getHandlePosition(toNode, conn.toHandle);
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${start.x} ${start.y} Q ${midX} ${start.y}, ${midX} ${midY} T ${end.x} ${end.y}`);
                path.setAttribute('stroke', '#64748b'); path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none'); path.setAttribute('marker-end', 'url(#viewerArrowhead)');
                connectionsSvg.appendChild(path);
            }
        });
    }
}

/**
 * Placeholder for presenting a student's work to the whole class.
 */
export async function presentToClass(type) {
    toast(`Presenting student ${type} to class (Simulated)`, 'success');
}

export async function saveComment() {
    const val = document.getElementById('commentText')?.value.trim();
    if (val && App.viewerState.commentPosition) {
        if (!App.work.modelComments) App.work.modelComments = [];
        App.work.modelComments.push({ id: 'c_' + Date.now(), text: val, x: App.viewerState.commentPosition.x, y: App.viewerState.commentPosition.y, author: App.user.name, time: Date.now() });
        await saveAndBroadcast('modelComments', App.work.modelComments);
        App.viewerState.addingComment = false;
        document.getElementById('commentModal').classList.add('hidden');
        renderTeacherContent();
        toast('Comment added!', 'success');
    }
}

export async function clearViewerFeedback() {
    if (confirm('Clear all feedback and stickers on this student model?')) {
        App.work.modelComments = [];
        App.work.modelStickers = [];
        await saveAndBroadcast('modelComments', []);
        await saveAndBroadcast('modelStickers', []);
        renderTeacherContent();
        toast('Feedback cleared', 'info');
    }
}


export const handleViewerClick = (e) => {
    const canvas = document.getElementById('viewerCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    if (App.viewerState.addingComment) { 
        App.viewerState.commentPosition = { x, y }; 
        const modal = document.getElementById('commentModal');
        if (modal) {
            modal.classList.remove('hidden'); 
            modal.classList.add('flex');
        }
    } else if (App.viewerState.selectedSticker) {
        if (!App.work.modelStickers) App.work.modelStickers = [];
        App.work.modelStickers.push({ id: 's_' + Date.now(), emoji: App.viewerState.selectedSticker, x: x-20, y: y-20 });
        saveAndBroadcast('modelStickers', App.work.modelStickers); 
        renderTeacherContent();
    }
};

export const setViewerTool = (t) => { 
    App.viewerState.addingComment = (t === 'comment'); 
    App.viewerState.selectedSticker = null; 
    renderTeacherContent(); 
};

export const setViewerSticker = (s) => { 
    App.viewerState.selectedSticker = (App.viewerState.selectedSticker === s) ? null : s; 
    App.viewerState.addingComment = false; 
    renderTeacherContent(); 
};

