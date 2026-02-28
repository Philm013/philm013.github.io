/**
 * @file viewer.js
 * @description specialized logic for real-time monitoring and feedback on student models and data. 
 */

/* global Fuse */

import { App } from '../core/state.js';
import { dbGet, dbGetByIndex, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveAndBroadcast, loadFromStorage, saveToStorage } from '../core/sync.js';
import { renderTeacherContent, updateModeUI, renderEmptyState } from '../ui/renderer.js';
import { toast, calculateStudentProgress, renderInfoTip } from '../ui/utils.js';

/**
 * Renders the module navigation tabs for the student viewer.
 */
function renderViewerModuleTabs() {
    const modules = [
        { id: 'questions', label: '1. Questions', icon: 'mdi:help-circle' },
        { id: 'models', label: '2. Models', icon: 'mdi:cube-outline' },
        { id: 'investigation', label: '3. Investigation', icon: 'mdi:microscope' },
        { id: 'analysis', label: '4. Analysis', icon: 'mdi:chart-line' },
        { id: 'math', label: '5. Math', icon: 'mdi:calculator' },
        { id: 'explanations', label: '6. Explanations', icon: 'mdi:lightbulb-on' },
        { id: 'argument', label: '7. Argument', icon: 'mdi:forum' },
        { id: 'communication', label: '8. Communication', icon: 'mdi:share-variant' }
    ];

    return `
        <div class="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
            ${modules.map(m => `
                <button onclick="window.switchViewerModule('${m.id}')" 
                    class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${App.currentModule === m.id ? 'bg-white text-primary shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}">
                    <span class="iconify" data-icon="${m.icon}"></span>
                    <span class="hidden md:inline">${m.label.split('. ')[1]}</span>
                    <span class="md:hidden">${m.label.split('. ')[0]}</span>
                </button>
            `).join('')}
        </div>
    `;
}

/**
 * Switches the active module while viewing a student's work.
 */
export async function switchViewerModule(moduleId) {
    App.currentModule = moduleId;
    if (moduleId === 'models') App.teacherModule = 'livemodels';
    else if (moduleId === 'analysis') App.teacherModule = 'livedata';
    else App.teacherModule = 'livegeneric';
    renderTeacherContent();
}

/**
 * Switches the teacher to view a specific student's work.
 */
export async function viewStudentWork(visitorId) {
    App.viewingStudentId = visitorId;
    App.viewerState.isMonitoring = true;
    if (!['models', 'analysis'].includes(App.currentModule)) {
        App.currentModule = 'models';
    }
    App.teacherModule = App.currentModule === 'models' ? 'livemodels' : 'livedata';
    const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + visitorId);
    if (saved && saved.work) { App.work = saved.work; }
    updateModeUI();
    renderTeacherContent();
}

export async function stopViewingStudent() {
    App.viewingStudentId = null;
    App.viewerState.isMonitoring = false;
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
            <div class="bg-gray-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl z-50">
                <div class="flex items-center gap-6">
                    <button onclick="window.stopViewingStudent()" class="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                        <span class="iconify text-2xl" data-icon="mdi:arrow-left"></span>
                    </button>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="font-black text-2xl uppercase tracking-tighter">${currentStudent?.name || 'Student'}</h2>
                            <span class="px-2 py-0.5 bg-primary text-white rounded text-[10px] font-black uppercase tracking-widest">Model Viewer</span>
                        </div>
                        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">${!App.teacherSettings.showFeedbackToStudents ? 'Grading: Hidden' : 'Grading: Live'}</p>
                    </div>
                </div>
                ${renderViewerModuleTabs()}
                <div class="flex items-center gap-2">
                    <button onclick="window.presentToClass('model')" class="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
                        <span class="iconify text-lg" data-icon="mdi:presentation"></span>
                        Present
                    </button>
                </div>
            </div>
            <div id="viewerCanvas" class="flex-1 bg-slate-100 model-canvas relative overflow-hidden" 
                onclick="window.handleViewerClick(event)"
                onpointerdown="window.handleViewerPointerDown(event)"
                onwheel="window.handleViewerWheel(event)">
                <div id="viewerCanvasContent" class="absolute inset-0 origin-top-left pointer-events-none">
                    <svg id="viewerPathsSvg" class="absolute inset-0 w-full h-full" style="z-index: 6; pointer-events: none;"></svg>
                    <svg id="viewerConnectionsSvg" class="connection-line">
                        <defs><marker id="viewerArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/></marker></defs>
                    </svg>
                    <div id="viewerShapesLayer" class="absolute inset-0" style="z-index: 5;"></div>
                    <div id="viewerNodesLayer" class="absolute inset-0" style="z-index: 10;"></div>
                    <div id="viewerExplainLayer" class="absolute inset-0" style="z-index: 15;"></div>
                    <div id="viewerCommentsLayer" class="absolute inset-0" style="z-index: 20;"></div>
                </div>
                <div class="readonly-overlay"></div>
                ${renderViewerToolbar()}
            </div>
        </div>
    `;
}

export async function renderLiveGeneric() {
    if (!App.viewingStudentId) return renderStudentSelectionTiles('View Student Work', 'livegeneric');
    const users = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const currentStudent = users.find(u => u.visitorId === App.viewingStudentId);

    return `
        <div class="h-full flex flex-col -m-6">
            <div class="bg-gray-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl z-50">
                <div class="flex items-center gap-6">
                    <button onclick="window.stopViewingStudent()" class="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                        <span class="iconify text-2xl" data-icon="mdi:arrow-left"></span>
                    </button>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="font-black text-2xl uppercase tracking-tighter">${currentStudent?.name || 'Student'}</h2>
                            <span class="px-2 py-0.5 bg-primary text-white rounded text-[10px] font-black uppercase tracking-widest">Monitoring</span>
                        </div>
                        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Practice: ${App.currentModule.toUpperCase()}</p>
                    </div>
                </div>
                ${renderViewerModuleTabs()}
                <div class="flex items-center gap-2">
                    <button onclick="window.presentToClass('${App.currentModule}')" class="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
                        <span class="iconify text-lg" data-icon="mdi:presentation"></span>
                        Present
                    </button>
                </div>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50 p-8 custom-scrollbar">
                <div class="max-w-7xl mx-auto h-full bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 relative overflow-hidden">
                    <div class="readonly-overlay pointer-events-auto"></div>
                    <div class="pointer-events-none opacity-80 filter grayscale-[0.2]">
                        ${window.renderStudentContentHtml()}
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
                         <div class="bg-gray-900/80 backdrop-blur-md text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest flex items-center gap-4">
                            <span class="iconify text-2xl" data-icon="mdi:eye-outline"></span>
                            Monitor View Only
                         </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderViewerToolbar() {
    return `
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-[2rem] shadow-2xl p-2 flex items-center gap-2 z-[60] border border-white/10 backdrop-blur-xl">
            <button onclick="window.setViewerTool('comment')" 
                class="flex items-center gap-3 px-6 py-3 rounded-[1.5rem] transition-all ${App.viewerState.addingComment ? 'bg-primary text-white shadow-lg' : 'hover:bg-white/10 text-gray-400'}">
                <span class="iconify text-xl" data-icon="mdi:comment-plus"></span>
                <span class="text-xs font-black uppercase tracking-widest">Add Feedback</span>
            </button>
            <div class="w-px h-8 bg-white/10 mx-1"></div>
            <button onclick="window.clearViewerFeedback()" 
                class="p-3 text-red-400 hover:bg-red-500/20 rounded-full transition-all" title="Clear All Feedback">
                <span class="iconify text-xl" data-icon="mdi:delete-sweep"></span>
            </button>
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
                <p class="text-gray-500 mt-1">Select a student to monitor their work in real-time.</p>
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
                                <div class="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white group-hover:scale-110 transition-transform">${s.avatar || s.name.charAt(0).toUpperCase()}</div>
                                <span class="px-3 py-1 ${isOnline ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'} rounded-full text-[10px] font-black uppercase tracking-widest border">${isOnline ? 'ONLINE' : 'AWAY'}</span>
                            </div>
                            <h3 class="font-bold text-gray-900 text-xl mb-1">${s.name}</h3>
                            <div class="flex items-center gap-2 mt-4"><div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-primary" style="width:${progress}%"></div></div><span class="text-xs font-black text-primary">${progress}%</span></div>
                        </div>`;
                })).then(res => res.join(''))}
                ${students.length === 0 ? `<div class="col-span-full">${renderEmptyState('No students found', 'Waiting for students to join...', 'mdi:account-group-outline', true)}</div>` : ''}
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
        <div class="h-full flex flex-col -m-6">
            <div class="bg-gray-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl z-50 shrink-0">
                <div class="flex items-center gap-6">
                    <button onclick="window.stopViewingStudent()" class="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all"><span class="iconify text-2xl" data-icon="mdi:arrow-left"></span></button>
                    <div><div class="flex items-center gap-2"><h2 class="font-black text-2xl uppercase tracking-tighter">${currentStudent?.name || 'Student'}</h2><span class="px-2 py-0.5 bg-primary text-white rounded text-[10px] font-black uppercase tracking-widest">Data Monitor</span></div><p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Real-time Inspection</p></div>
                </div>
                ${renderViewerModuleTabs()}
                <div class="flex items-center gap-2"><button onclick="window.presentToClass('data')" class="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"><span class="iconify text-lg" data-icon="mdi:presentation"></span>Present</button></div>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50 p-8 custom-scrollbar">
                <div class="max-w-7xl mx-auto space-y-8">
                    <div class="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl">
                        <table class="w-full border-collapse">
                            <thead><tr class="bg-gray-50 border-b border-gray-100"><th class="border p-2 w-10"></th>${dt.columns.map(c => `<th class="p-5 text-left font-black text-gray-400 uppercase tracking-widest text-[10px] border-r border-gray-100 last:border-0">${c.name} ${c.unit ? `(${c.unit})` : ''}</th>`).join('')}<th class="p-5 text-center font-black text-gray-400 uppercase tracking-widest text-[10px] w-32">Feedback</th></tr></thead>
                            <tbody>
                                ${dt.rows.map((r, ri) => `<tr class="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors"><td class="border p-2 text-center text-gray-400 text-[10px]">${ri + 1}</td>${dt.columns.map(c => `<td class="p-5 text-sm text-gray-700 border-r border-gray-50 last:border-0">${r[c.id] || '<span class="text-gray-200">...</span>'}</td>`).join('')}<td class="p-2 text-center border-l border-gray-100"><div class="flex flex-wrap justify-center gap-1">${stickers.slice(0, 3).map(s => `<button onclick="window.addDataRowSticker(${ri}, '${s}')" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 transition-all ${dt.feedback?.[ri]?.sticker === s ? 'bg-blue-100 ring-2 ring-blue-400 scale-110' : ''}">${s}</button>`).join('')}<button onclick="window.openTableRowFeedback(${ri})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 transition-all ${dt.feedback?.[ri]?.text ? 'bg-blue-50 ring-1 ring-blue-200' : ''}"><span class="iconify" data-icon="mdi:comment-text-outline"></span></button><button onclick="window.addDataRowSticker(${ri}, null)" class="text-[10px] text-gray-300 hover:text-red-500">×</button></div>${dt.feedback?.[ri]?.text ? `<p class="text-[9px] text-blue-600 font-bold mt-1 max-w-[100px] truncate mx-auto">${dt.feedback[ri].text}</p>` : ''}</td></tr>`).join('')}
                            </tbody>
                        </table>
                        ${dt.rows.length === 0 ? '<div class="py-20 text-center text-gray-300 italic">No data entered yet</div>' : ''}
                    </div>
                    ${dt.comment ? `<div class="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 shadow-sm relative overflow-hidden"><span class="absolute -top-4 -right-4 iconify text-8xl text-amber-100/50" data-icon="mdi:note-text"></span><h4 class="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 relative z-10">Student Table Notes</h4><p class="text-amber-900 font-medium leading-relaxed relative z-10">${dt.comment}</p></div>` : ''}
                </div>
            </div>
        </div>
    `;
}

export async function renderIconManager() {
    const isEditing = App._editingAssetBank; // 'icon' | 'emoji' | null
    
    if (!App.availableIconSets || App.availableIconSets.length === 0) {
        try {
            const res = await fetch('https://api.iconify.design/collections');
            const data = await res.json();
            const categories = {};
            App.availableIconSets = Object.keys(data).map(prefix => {
                const set = { prefix, name: data[prefix].name, total: data[prefix].total, category: data[prefix].category || 'Other' };
                if (!categories[set.category]) categories[set.category] = [];
                categories[set.category].push(set);
                return set;
            });
            App.iconCategories = categories;
        } catch (e) { console.error(e); }
    }

    if (!isEditing) {
        const showDefIcons = App.teacherSettings.showDefaultIcons;
        const showDefEmojis = App.teacherSettings.showDefaultEmojis;

        return `
            <div class="h-full flex flex-col">
                <div class="shrink-0 md:p-6 p-4">
                    <h2 class="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">Asset Architect</h2>
                    <p class="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Curate Student Modeling Tools</p>
                </div>

                <div class="panels-container lg:grid lg:grid-cols-2 gap-6 flex-1 px-4 md:px-6 pb-10">
                    <!-- Icon Bank Panel -->
                    <div class="bg-white border md:rounded-3xl rounded-2xl overflow-hidden flex flex-col h-full shadow-sm" data-card-title="Icon Bank">
                        <div class="sticky-panel-header md:hidden">
                            <div class="flex items-center justify-between w-full">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0">
                                        <span class="iconify" data-icon="mdi:vector-square"></span>
                                    </div>
                                    <h3>Icon Bank</h3>
                                    ${renderInfoTip('Curate a set of high-quality vector icons for students to use in their scientific models.')}
                                </div>
                                <button onclick="window.startEditingBank('icon')" class="px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-black uppercase">Edit</button>
                            </div>
                        </div>
                        <div class="hidden md:flex p-4 md:p-6 border-b items-center justify-between bg-blue-50/30">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                                    <span class="iconify" data-icon="mdi:vector-square"></span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-black text-blue-900 uppercase text-sm md:text-base">Icon Bank</h3>
                                        <div class="hidden md:block">${renderInfoTip('Vector icons provide clean, professional symbols for modeling complex systems.')}</div>
                                    </div>
                                    <p class="text-[9px] font-bold text-blue-400 uppercase">Vector Graphics</p>
                                </div>
                            </div>
                            <button onclick="window.startEditingBank('icon')" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all">Edit</button>
                        </div>
                        <div class="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                            ${showDefIcons ? `
                                <div>
                                    <label class="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block ml-1">Global Defaults (Active)</label>
                                    <div class="flex flex-wrap gap-2 opacity-60">
                                        ${App.teacherSettings.defaultIcons?.map(icon => `<div class="p-2 bg-gray-50 rounded-lg border border-gray-100"><span class="iconify text-lg text-gray-400" data-icon="${icon}"></span></div>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            <div>
                                <label class="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 block ml-1">Lesson Specific Icons</label>
                                <div class="flex flex-wrap gap-2 content-start min-h-[100px]">
                                    ${App.teacherSettings.lessonIcons?.map(icon => `<div class="p-3 bg-white rounded-xl border-2 border-blue-100 relative group shadow-sm"><span class="iconify text-xl text-blue-600" data-icon="${icon}"></span><button onclick="window.removeLessonIcon('${icon}')" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-md transition-transform active:scale-90">×</button></div>`).join('') || '<div class="w-full py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl"><p class="text-[10px] text-gray-300 font-black uppercase">No specific icons added</p></div>'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Emoji Bank Panel -->
                    <div class="bg-white border md:rounded-3xl rounded-2xl overflow-hidden flex flex-col h-full shadow-sm" data-card-title="Emoji Bank">
                        <div class="sticky-panel-header md:hidden">
                            <div class="flex items-center justify-between w-full">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0">
                                        <span class="iconify" data-icon="mdi:sticker-emoji"></span>
                                    </div>
                                    <h3>Emoji Bank</h3>
                                    ${renderInfoTip('Select a set of universal symbols and emojis for students to use as stickers or concept markers.')}
                                </div>
                                <button onclick="window.startEditingBank('emoji')" class="px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-black uppercase">Edit</button>
                            </div>
                        </div>
                        <div class="hidden md:flex p-4 md:p-6 border-b flex items-center justify-between bg-amber-50/30">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg">
                                    <span class="iconify" data-icon="mdi:sticker-emoji"></span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-black text-amber-900 uppercase text-sm md:text-base">Emoji Bank</h3>
                                        <div class="hidden md:block">${renderInfoTip('Universal symbols are great for quick identification and making models more expressive.')}</div>
                                    </div>
                                    <p class="text-[9px] font-bold text-amber-400 uppercase">Universal Symbols</p>
                                </div>
                            </div>
                            <button onclick="window.startEditingBank('emoji')" class="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-amber-100 hover:scale-105 active:scale-95 transition-all">Edit</button>
                        </div>
                        <div class="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                            ${showDefEmojis ? `
                                <div>
                                    <label class="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block ml-1">Global Defaults (Active)</label>
                                    <div class="flex flex-wrap gap-2 opacity-60">
                                        ${App.teacherSettings.defaultEmojis?.map(e => `<div class="p-1 text-xl grayscale">${e}</div>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            <div>
                                <label class="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 block ml-1">Lesson Specific Emojis</label>
                                <div class="flex flex-wrap gap-2 content-start min-h-[100px]">
                                    ${App.teacherSettings.lessonEmojis?.map(e => `<div class="text-2xl p-2 bg-white rounded-xl border-2 border-amber-100 relative group shadow-sm">${e}<button onclick="window.removeLessonEmoji('${e}')" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-md transition-transform active:scale-90">×</button></div>`).join('') || '<div class="w-full py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl"><p class="text-[10px] text-gray-300 font-black uppercase">No specific emojis added</p></div>'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // LIBRARY EDIT MODE
    const isIcon = isEditing === 'icon';
    const presets = isIcon ? [
        { label: 'Cells', query: 'cell,bacteria,virus,microscope,organelle', icon: 'mdi:microscope' },
        { label: 'Atoms', query: 'atom,molecule,beaker,test-tube,flask', icon: 'mdi:flask' },
        { label: 'Space', query: 'planet,star,galaxy,rocket,moon,orbit', icon: 'mdi:rocket-launch' },
        { label: 'Sun & Cloud', query: 'sun,cloud,rain,snow,thermometer,wind', icon: 'mdi:weather-partly-cloudy' },
        { label: 'Energy', query: 'lightning,battery,bulb,cog,gear,engine', icon: 'mdi:cog' }
    ] : [
        { label: 'Life Science', category: 'life', query: 'cell,plant,animal,organism', icon: 'mdi:leaf' },
        { label: 'Physical', category: 'physical', query: 'energy,force,magnet,electricity', icon: 'mdi:flash' },
        { label: 'Earth & Space', category: 'earth', query: 'world,sun,planet,star', icon: 'mdi:earth' },
        { label: 'Tech & Tool', category: 'objects', query: 'robot,computer,tool,machine', icon: 'mdi:tools' },
        { label: 'Animals', category: 'nature', query: 'dog,cat,bird,fish', icon: 'mdi:paw' }
    ];

    setTimeout(() => { 
        if (isIcon) window.onManagerCategoryChange(); 
        else window.renderEmojiLibrary();
    }, 100);

    return `
        <div class="h-full flex flex-col -m-6 bg-gray-900 overflow-hidden">
            <div class="p-4 md:p-6 bg-gray-900 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 shrink-0 shadow-2xl z-50">
                <div class="flex items-center gap-4 md:gap-6">
                    <button onclick="window.stopEditingBank()" class="w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center transition-all">
                        <span class="iconify text-xl md:text-2xl text-white" data-icon="mdi:arrow-left"></span>
                    </button>
                    <div>
                        <h2 class="text-white font-black text-lg md:text-2xl uppercase tracking-tighter">${isIcon ? 'Icon' : 'Emoji'} Architect</h2>
                        <p class="text-[8px] md:text-xs text-blue-400 font-bold uppercase tracking-widest mt-0.5">Lesson Curation</p>
                    </div>
                </div>
                <div class="flex-1 md:max-w-xl w-full">
                    <div class="relative">
                        <input type="text" id="assetSearchInput" placeholder="Search ${isIcon ? '200k+ icons...' : 'universal symbols...'}" 
                            oninput="window.debouncedAssetSearch()"
                            class="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-white text-sm md:text-base font-bold focus:bg-white/10 outline-none transition-all placeholder:text-white/20">
                        <span class="iconify absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg md:text-xl" data-icon="mdi:magnify"></span>
                    </div>
                </div>
                <div class="flex items-center justify-between md:justify-end gap-3">
                    <div class="text-left md:text-right">
                        <p class="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Lesson Pool</p>
                        <p class="text-xs md:text-sm font-black text-white">${(isIcon ? App.teacherSettings.lessonIcons : App.teacherSettings.lessonEmojis)?.length || 0} Items</p>
                    </div>
                    <button onclick="window.stopEditingBank()" class="px-6 md:px-8 py-2 md:py-3 bg-primary text-white rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">Done</button>
                </div>
            </div>

            <div class="flex-1 flex overflow-hidden">
                <!-- Sidebar Filters (Horizontal on small, Vertical on md+) -->
                <div class="hidden md:flex w-72 border-r border-white/10 overflow-y-auto p-6 flex-col gap-8 bg-gray-900/50">
                    ${isIcon ? `
                        <div class="space-y-4">
                            <label class="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Icon Sources</label>
                            <select id="managerCategorySelect" onchange="window.onManagerCategoryChange()" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none">
                                <option value="">Main Collections</option>
                                ${Object.keys(App.iconCategories || {}).sort().map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            </select>
                            <div id="managerCollectionsList" class="flex flex-col gap-1 pr-2 custom-scrollbar-dark max-h-[400px] overflow-y-auto"></div>
                        </div>
                    ` : `
                        <div class="space-y-4">
                            <label class="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Emoji Categories</label>
                            <div class="flex flex-col gap-1">
                                <button onclick="window.setEmojiFilter('all')" class="emoji-filter-btn w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all bg-primary text-white shadow-lg" data-category="all">All Symbols</button>
                                ${[
                                    { id: 'life', label: 'Life Science' },
                                    { id: 'physical', label: 'Physical' },
                                    { id: 'earth', label: 'Earth & Space' },
                                    { id: 'nature', label: 'Animals & Nature' },
                                    { id: 'food', label: 'Food & Growth' },
                                    { id: 'objects', label: 'Tools & Objects' },
                                    { id: 'symbols', label: 'Math & Symbols' }
                                ].map(c => `<button onclick="window.setEmojiFilter('${c.id}')" class="emoji-filter-btn w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all text-white/40 hover:bg-white/5" data-category="${c.id}">${c.label}</button>`).join('')}
                            </div>
                        </div>
                    `}
                </div>

                <!-- Results Grid -->
                <div class="flex-1 flex flex-col bg-black/20 p-4 md:p-6 overflow-hidden">
                    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 shrink-0">
                        ${presets.map(p => `
                            <button onclick="${isIcon ? `window.applyAssetPreset('${p.query}')` : `window.setEmojiFilter('${p.category}', '${p.query}')`}" 
                                class="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[9px] md:text-[10px] font-black text-white/60 uppercase hover:bg-white/10 hover:text-white transition-all shrink-0 whitespace-nowrap">
                                <span class="iconify" data-icon="${p.icon}"></span>
                                ${p.label}
                            </button>
                        `).join('')}
                    </div>
                    <div id="assetManagerGrid" class="flex-1 grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4 overflow-y-auto pr-2 custom-scrollbar-dark content-start">
                        <!-- Populated via loadIconsForManager or renderEmojiLibrary -->
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.startEditingBank = (type) => {
    App._editingAssetBank = type;
    renderTeacherContent();
};

window.stopEditingBank = () => {
    App._editingAssetBank = null;
    renderTeacherContent();
};

window.debouncedAssetSearch = () => {
    clearTimeout(App._assetSearchTimer);
    App._assetSearchTimer = setTimeout(() => {
        if (App._editingAssetBank === 'icon') window.searchIconsForManager();
        else window.renderEmojiLibrary();
    }, 300);
};

window.applyAssetPreset = (q) => {
    const input = document.getElementById('assetSearchInput');
    if (input) {
        // Convert commas to spaces for a cleaner UI but the search logic will handle both
        input.value = q.replace(/,/g, ', ');
        if (App._editingAssetBank === 'icon') window.searchIconsForManager();
        else window.renderEmojiLibrary();
    }
};

/**
 * Metadata map for common scientific emojis to enable text-based searching.
 */
const EMOJI_KEYWORDS = {
    '🌲': 'tree,wood,forest,nature,life', '🌻': 'flower,plant,sun,growth,life', '🐟': 'fish,water,ocean,life,animal',
    '🐦': 'bird,fly,sky,life,animal', '🦋': 'butterfly,bug,insect,life', '🐝': 'bee,bug,insect,honey,life',
    '🍎': 'apple,food,fruit,growth', '🥩': 'meat,food,energy', '🧠': 'brain,think,human,body,life',
    '💀': 'skull,bone,dead,death,anatomy', '🦠': 'germ,virus,bacteria,micro,life', '🧬': 'dna,gene,bio,life',
    '🔬': 'microscope,lab,tool,science', '🌿': 'leaf,plant,nature,life', '🍄': 'mushroom,fungi,nature,life',
    '🐾': 'paw,track,animal,nature', '🌡️': 'thermometer,heat,temp,weather', '💧': 'water,liquid,wet,earth',
    '☀️': 'sun,light,star,weather,energy', '🌱': 'sprout,plant,growth,life', '💨': 'wind,air,gas,weather',
    '⚡': 'lightning,electricity,energy,weather', '🔋': 'battery,energy,power,physical', '🧱': 'brick,solid,matter',
    '⚙️': 'gear,machine,tool,engine', '⚖️': 'scale,balance,weight,force', '🌍': 'earth,world,planet,space',
    '🔭': 'telescope,star,space,tool', '🏗️': 'crane,build,engineering', '🌉': 'bridge,structure,engineering',
    '🔨': 'hammer,tool,force', '📏': 'ruler,measure,tool,math', '🔧': 'wrench,tool,engineering',
    '🔥': 'fire,heat,energy,chemical', '🌈': 'rainbow,light,refraction,weather', '📡': 'satellite,signal,tech,space',
    '🌕': 'moon,lunar,space,night', '🌋': 'volcano,earth,heat,lava', '🏔️': 'mountain,earth,geology',
    '🌊': 'wave,water,ocean,energy', '🏜️': 'desert,earth,dry', '💎': 'gem,crystal,matter,geology',
    '☄️': 'comet,space,star', '🛰️': 'satellite,space,tech', '🪐': 'saturn,planet,space',
    '🌌': 'galaxy,space,stars', '🌠': 'shooting star,space', '🌦️': 'rain,sun,weather',
    '❄️': 'snow,ice,cold,weather', '🌵': 'cactus,plant,desert,life', '🌴': 'palm,tree,plant,tropical',
    '🌑': 'new moon,space', '🌟': 'star,bright,space', '✨': 'sparkle,energy', '💥': 'explosion,energy,reaction',
    '🌬️': 'wind,weather,air', '🧊': 'ice,solid,cold,matter', '➕': 'plus,add,math', '➖': 'minus,subtract,math',
    '✖️': 'multiply,math', '➗': 'divide,math', '♾️': 'infinity,math', '🆔': 'id,identity,biology',
    '⚛️': 'atom,physics,matter', '⚕️': 'medical,health,biology', '☣️': 'biohazard,safety,biology',
    '☢️': 'radiation,physics,energy', '⚠️': 'warning,safety', '🚸': 'children,crossing',
    '✅': 'check,done,correct', '💠': 'diamond,shape', '🌀': 'cyclone,weather,spiral',
    '🔴': 'red,circle,shape', '🔵': 'blue,circle,shape', '🟢': 'green,circle,shape',
    '🟡': 'yellow,circle,shape', '🟠': 'orange,circle,shape', '🟣': 'purple,circle,shape',
    '⬜': 'white,square,shape', '⬛': 'black,square,shape', '🟥': 'red,square,shape',
    '🟦': 'blue,square,shape', '🟩': 'green,square,shape'
};

export async function renderEmojiLibrary() {
    const grid = document.getElementById('assetManagerGrid');
    if (!grid) return;

    const rawQuery = document.getElementById('assetSearchInput')?.value.trim().toLowerCase() || '';
    const keywords = rawQuery.split(/[\s,]+/).filter(k => k.length > 0);
    const activeCategory = App._emojiCategoryFilter || 'all';

    const emojiSets = {
        life: ['🌲', '🌻', '🐟', '🐦', '🦋', '🐝', '🍎', '🥩', '🧠', '💀', '🦠', '🧬', '🔬', '🌿', '🍄', '🐾', '🦴', '🦷', '👁️', '👂', '🐘', '🦒', '🐒', '🐢', '🦎', '🐍', '🐙', '🦑', '🦀', '🦐', '🦠', '🦖', '🦕', '🦍', '🦓', '🐪', '🐫', '🦙', '🦏', '🦛', '🐄', '🐖', '🐏', '🐑', '🐐', '🐎'],
        physical: ['🔋', '⚡', '💡', '🧲', '⚙️', '⚖️', '🔨', '📏', '🔧', '🧪', '🌡️', '🔥', '💨', '🌈', '📡', '🔊', '🔈', '🔦', '🕯️', '🧨', '⚛️', '🛸', '🚀', '💿', '💾', '💻', '🖥️', '⌨️', '🖱️', '🔌', '🔦', '🎛️', '⏱️', '⏲️', '🕰️', '⏰', '🧭', '🔬', '🔭'],
        earth: ['🌍', '🌎', '🌏', '☀️', '🌙', '☁️', '⛈️', '🌪️', '🌋', '🏔️', '🌊', '🏜️', '💎', '☄️', '🛰️', '🔭', '🪐', '🌌', '🌠', '🌦️', '❄️', '🌨️', '🌵', '🌴', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '⭐', '🌟', '✨', '☄️', '💥', '🌬️', '🧊', '🔥', '🌊', '💧', '💨', '⚡'],
        nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🐘', '🦏', '🦛', '🐪', '🐫', '🦙', '🦒', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐾', '🐉', '🐲'],
        food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🌮', '🥣', '🥗', '🍿', '🧂', '🍼', '🥛', '☕', '🍵', '🧃', '🥤', '🧋'],
        objects: ['🏗️', '🏢', '🏭', '🏠', '🌉', '⛓️', '🔗', '🔩', '🛠️', '📐', '💻', '🤖', '📱', '⌨️', '🖱️', '🕹️', '🔌', '⚙️', '🛰️', '🛸', '🚁', '🚜', '🚜', '🚲', '🛴', '🛵', '🏍️', '🏎️', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚚', '🚜', '🛠️', '⚒️', '⛏️', '🔨', '🔩', '⚙️', '🧱', '⛓️', '🪝', '🧰', '🔧', '🪜', '⚖️', '🦯', '🔗', '🧪', '🌡️', '🧬', '🔬', '🔭', '📡', '🛰️', '🛸'],
        symbols: ['➕', '➖', '✖️', '➗', '♾️', '🆔', '⚛️', '⚕️', '☣️', '☢️', '⚠️', '🚸', '〽️', '💹', '❇️', '✳️', '❎', '✅', '💠', '🌀', '⭕', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈']
    };

    let list = [];
    if (activeCategory === 'all') {
        Object.values(emojiSets).forEach(set => list = [...list, ...set]);
    } else {
        list = emojiSets[activeCategory] || [];
    }

    if (keywords.length > 0) {
        list = list.filter(e => {
            const meta = EMOJI_KEYWORDS[e] || '';
            // Match if ANY keyword matches metadata or the emoji itself
            return keywords.some(k => e.includes(k) || meta.includes(k));
        });
    }

    grid.innerHTML = list.map(e => {
        const isSelected = App.teacherSettings.lessonEmojis?.includes(e);
        return `<button onclick="window.addLessonEmoji('${e}')" class="aspect-square bg-white/5 border-2 rounded-2xl flex items-center justify-center text-3xl transition-all ${isSelected ? 'border-amber-500 bg-amber-500/20 scale-105 shadow-lg shadow-amber-500/20' : 'border-white/5 hover:border-white/20 hover:bg-white/10'}">${e}</button>`;
    }).join('');
}

window.setEmojiFilter = (cat, query = null) => {
    App._emojiCategoryFilter = cat;
    if (query) {
        const input = document.getElementById('assetSearchInput');
        if (input) input.value = query.replace(/,/g, ', ');
    }
    document.querySelectorAll('.emoji-filter-btn').forEach(btn => {
        const isActive = btn.dataset.category === cat;
        btn.classList.toggle('bg-primary', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('shadow-lg', isActive);
        btn.classList.toggle('text-white/40', !isActive);
        btn.classList.toggle('hover:bg-white/5', !isActive);
    });
    window.renderEmojiLibrary();
};

export async function loadIconsForManager() {
    const grid = document.getElementById('assetManagerGrid'); if (!grid) return;
    grid.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center"><span class="iconify animate-spin text-4xl text-primary mb-2" data-icon="mdi:loading"></span><p class="text-[10px] font-black uppercase text-primary">Searching Sources...</p></div>';
    
    const rawQuery = document.getElementById('assetSearchInput')?.value.trim() || '';
    // Aggregated search: join keywords with spaces for Iconify OR behavior
    const query = rawQuery.replace(/,/g, ' '); 
    
    const prefix = App.currentIconSet;
    const category = App.currentIconCategory;

    try {
        let icons = [];
        if (query) {
            // Search Mode
            let url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=150`;
            if (prefix) url += `&prefix=${prefix}`;
            else if (category) url += `&prefixes=${App.iconCategories[category].map(s => s.prefix).join(',')}`;
            const res = await fetch(url); const data = await res.json();
            icons = data.icons || [];
        } else if (prefix) {
            // Browsing Mode (Full Set)
            const res = await fetch(`https://api.iconify.design/collection?prefix=${prefix}`);
            const data = await res.json();
            if (data.uncategorized) icons = data.uncategorized.slice(0, 200).map(name => `${prefix}:${name}`);
            else if (data.categories) {
                Object.values(data.categories).forEach(catIcons => {
                    if (icons.length < 200) icons = [...icons, ...catIcons.slice(0, 50).map(name => `${prefix}:${name}`)];
                });
            }
        } else {
            // Default Browsing
            const res = await fetch(`https://api.iconify.design/search?query=science&limit=100&prefix=mdi`);
            const data = await res.json();
            icons = data.icons || [];
        }

        if (icons.length === 0) grid.innerHTML = '<div class="col-span-full py-20 text-center opacity-30 text-[10px] font-black uppercase text-white">No results found</div>';
        else grid.innerHTML = icons.map(icon => {
            const isSelected = App.teacherSettings.lessonIcons?.includes(icon);
            return `<button onclick="window.addLessonIcon('${icon}')" class="aspect-square bg-white/5 border-2 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary/20 scale-105 shadow-lg shadow-primary/20' : 'border-white/5 hover:border-white/20 hover:bg-white/10'}"><span class="iconify text-3xl ${isSelected ? 'text-white' : 'text-white/40'}" data-icon="${icon}"></span></button>`;
        }).join('');
    } catch (e) { grid.innerHTML = '<div class="col-span-full py-20 text-center text-red-400">Connection Error</div>'; }
}

export function openTableRowFeedback(rowIndex) {
    App.editingRowIndex = rowIndex;
    const feedback = App.work.dataTable.feedback?.[rowIndex] || { text: '', sticker: null };
    const modal = document.getElementById('commentModal');
    const input = document.getElementById('commentText');
    if (modal && input) {
        input.value = feedback.text || '';
        if (feedback.sticker) window.setFeedbackSticker(feedback.sticker);
        modal.classList.remove('hidden'); modal.classList.add('flex'); input.focus();
    }
}

export async function addDataRowSticker(rowIndex, emoji) {
    if (!App.work.dataTable.feedback) App.work.dataTable.feedback = {};
    if (emoji === null) delete App.work.dataTable.feedback[rowIndex];
    else { const current = App.work.dataTable.feedback[rowIndex] || { text: '' }; App.work.dataTable.feedback[rowIndex] = { ...current, sticker: emoji }; }
    await saveAndBroadcast('dataTable.feedback', App.work.dataTable.feedback); renderTeacherContent();
}

window.onManagerCategoryChange = () => {
    const category = document.getElementById('managerCategorySelect')?.value;
    const list = document.getElementById('managerCollectionsList');
    if (!list) return;
    const sets = category ? (App.iconCategories?.[category] || []) : (App.availableIconSets || []).filter(s => ['mdi', 'ph', 'bi', 'ri', 'fa6-solid', 'lucide', 'tabler'].includes(s.prefix));
    
    list.innerHTML = `
        <button onclick="window.changeIconSet(null, '${category}')" class="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!App.currentIconSet ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}">
            All in ${category || 'Main Sources'}
        </button>` + 
        sets.sort((a,b) => b.total - a.total).map(s => `
            <button onclick="window.changeIconSet('${s.prefix}', '${category}')" class="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${App.currentIconSet === s.prefix ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}">
                <div class="flex justify-between items-center">
                    <span>${s.name}</span>
                    <span class="opacity-30 text-[8px]">${(s.total/1000).toFixed(1)}k</span>
                </div>
            </button>`).join('');
    
    window.searchIconsForManager();
};

export const clearAllCurated = async () => { if (confirm('Clear set?')) { App.teacherSettings.lessonIcons = []; App.teacherSettings.lessonEmojis = []; await saveToStorage(); renderTeacherContent(); } };
export const changeIconSet = (p, c) => { App.currentIconSet = p; App.currentIconCategory = c; window.onManagerCategoryChange(); };
export const searchIconsForManager = () => loadIconsForManager();
export const addLessonIcon = async (icon) => { if (!App.teacherSettings.lessonIcons) App.teacherSettings.lessonIcons = []; const idx = App.teacherSettings.lessonIcons.indexOf(icon); if (idx > -1) App.teacherSettings.lessonIcons.splice(idx, 1); else App.teacherSettings.lessonIcons.push(icon); await saveToStorage(); if (App._editingAssetBank) renderTeacherContent(); };
export const removeLessonIcon = async (icon) => { App.teacherSettings.lessonIcons = (App.teacherSettings.lessonIcons || []).filter(i => i !== icon); await saveToStorage(); renderTeacherContent(); };
export const addLessonEmoji = async (e) => { if (!App.teacherSettings.lessonEmojis) App.teacherSettings.lessonEmojis = []; const idx = App.teacherSettings.lessonEmojis.indexOf(e); if (idx > -1) App.teacherSettings.lessonEmojis.splice(idx, 1); else App.teacherSettings.lessonEmojis.push(e); await saveToStorage(); if (App._editingAssetBank) renderEmojiLibrary(); else renderTeacherContent(); };
export const removeLessonEmoji = async (e) => { App.teacherSettings.lessonEmojis = (App.teacherSettings.lessonEmojis || []).filter(x => x !== e); await saveToStorage(); renderTeacherContent(); };
export const toggleShowAllIcons = async () => { App.teacherSettings.showAllIcons = !App.teacherSettings.showAllIcons; await saveToStorage(); renderTeacherContent(); };

export function initViewerCanvas() {
    const content = document.getElementById('viewerCanvasContent'); if (!content) return;
    content.style.transform = `translate(${App.viewerState.pan?.x || 0}px, ${App.viewerState.pan?.y || 0}px) scale(${App.viewerState.zoom || 1})`;
    const layers = { nodes: document.getElementById('viewerNodesLayer'), shapes: document.getElementById('viewerShapesLayer'), comments: document.getElementById('viewerCommentsLayer'), paths: document.getElementById('viewerPathsSvg'), conns: document.getElementById('viewerConnectionsSvg'), explain: document.getElementById('viewerExplainLayer') };
    if (layers.nodes) layers.nodes.innerHTML = App.work.modelNodes.map(n => `<div class="model-node absolute pointer-events-none border-2 rounded-xl p-3 bg-white shadow-sm flex items-center gap-2" style="left:${n.x}px; top:${n.y}px; width:${n.width || 120}px; border-color:${n.color}"><span class="text-xl">${n.icon?.includes(':') ? `<span class="iconify" data-icon="${n.icon}"></span>` : n.icon}</span><span class="text-xs font-bold truncate">${n.label}</span></div>`).join('');
    if (layers.shapes) layers.shapes.innerHTML = (App.work.modelShapes || []).map(s => `<div class="model-shape absolute pointer-events-none" style="left:${s.x}px; top:${s.y}px; width:${s.width}px; height:${s.height}px; transform: rotate(${s.rotation || 0}deg)"><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${window.getShapeSvgContent(s)}</svg></div>`).join('');
    if (layers.paths) layers.paths.innerHTML = (App.work.modelPaths || []).map(path => `<path d="${path.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')}" stroke="${path.color}" stroke-width="${path.width}" fill="none" />`).join('');
    if (layers.explain) layers.explain.innerHTML = (App.work.modelExplanations || []).map((p, i) => `<div class="absolute w-6 h-6 bg-primary text-white font-bold rounded-full flex items-center justify-center shadow-lg border border-white text-[10px] transform -translate-x-1/2 -translate-y-1/2" style="left:${p.x}px; top:${p.y}px;">${i + 1}</div>`).join('');
    if (layers.comments) layers.comments.innerHTML = (App.work.modelComments || []).map(c => `<div class="comment-bubble group/comment" style="left:${c.x}px; top:${c.y}px; cursor: move;" onpointerdown="window.startCommentDrag(event, '${c.id}')"><div class="flex items-start gap-3">${c.sticker ? `<div class="w-10 h-10 bg-white rounded-xl shadow-inner border border-gray-100 flex items-center justify-center text-2xl shrink-0">${c.sticker}</div>` : ''}<div class="flex-1 min-w-[120px]"><p class="font-black text-[9px] text-red-600 uppercase mb-1 tracking-widest">${c.author}</p><p class="text-xs font-medium text-gray-700 leading-relaxed">${c.text || 'Checked!'}</p></div></div><button onclick="window.deleteComment('${c.id}')" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/comment:opacity-100 transition-opacity shadow-sm">×</button></div>`).join('');
    if (layers.conns) { layers.conns.querySelectorAll('path').forEach(p => p.remove()); App.work.modelConnections.forEach(conn => { const from = App.work.modelNodes.find(n => n.id === conn.from); const to = App.work.modelNodes.find(n => n.id === conn.to); if (from && to) { const start = window.getHandlePosition(from, conn.fromHandle); const end = window.getHandlePosition(to, conn.toHandle); const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', `M ${start.x} ${start.y} Q ${(start.x+end.x)/2} ${start.y}, ${(start.x+end.x)/2} ${(start.y+end.y)/2} T ${end.x} ${end.y}`); path.setAttribute('stroke', '#64748b'); path.setAttribute('stroke-width', '2'); path.setAttribute('fill', 'none'); path.setAttribute('marker-end', 'url(#viewerArrowhead)'); layers.conns.appendChild(path); } }); }
}

export const renderViewerNodes = initViewerCanvas;

export async function presentToClass(type) { if (!App.viewingStudentId) return; const users = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode); const s = users.find(u => u.visitorId === App.viewingStudentId); App.sharedData.currentPresentation = { type, visitorId: App.viewingStudentId, studentName: s?.name || 'Student', moduleId: App.currentModule, timestamp: Date.now() }; await saveToStorage(); await saveAndBroadcast('debatePosts', App.sharedData.debatePosts); toast(`Presenting ${s?.name}'s ${type}!`, 'success'); }
export function closeCommentModal() { const m = document.getElementById('commentModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } App.viewerState.addingComment = false; App.viewerState.commentPosition = null; App.viewerState.selectedSticker = null; App.editingPostId = null; App.editingRowIndex = null; document.querySelectorAll('.feedback-sticker-btn').forEach(b => b.classList.remove('bg-blue-100', 'border-primary')); }
export function setFeedbackSticker(s) { App.viewerState.selectedSticker = (App.viewerState.selectedSticker === s) ? null : s; document.querySelectorAll('.feedback-sticker-btn').forEach(b => b.classList.toggle('bg-blue-100', b.dataset.sticker === App.viewerState.selectedSticker)); }
export async function saveComment() { if (App.editingPostId) { const arg = await import('../modules/argument.js'); return arg.saveArgumentFeedback(); } if (App.editingRowIndex !== null && App.teacherModule === 'livedata') { const val = document.getElementById('commentText')?.value.trim(); const sticker = App.viewerState.selectedSticker; if (!App.work.dataTable.feedback) App.work.dataTable.feedback = {}; App.work.dataTable.feedback[App.editingRowIndex] = { text: val, sticker, time: Date.now() }; await saveAndBroadcast('dataTable.feedback', App.work.dataTable.feedback); closeCommentModal(); renderTeacherContent(); toast('Feedback updated', 'success'); return; } const val = document.getElementById('commentText')?.value.trim(); if (App.viewerState.commentPosition) { if (!App.work.modelComments) App.work.modelComments = []; App.work.modelComments.push({ id: 'c_' + Date.now(), text: val || '', sticker: App.viewerState.selectedSticker, x: App.viewerState.commentPosition.x, y: App.viewerState.commentPosition.y, author: App.user.name, time: Date.now() }); await saveAndBroadcast('modelComments', App.work.modelComments); closeCommentModal(); renderTeacherContent(); toast('Feedback posted!', 'success'); } }
export function startCommentDrag(e, id) { if (e.target.closest('button')) return; e.preventDefault(); const comment = App.work.modelComments.find(c => c.id === id); if (!comment) return; const startX = e.clientX, startY = e.clientY, initX = comment.x, initY = comment.y, zoom = App.viewerState.zoom || 1; const onMove = (me) => { comment.x = initX + (me.clientX - startX) / zoom; comment.y = initY + (me.clientY - startY) / zoom; initViewerCanvas(); }; const onUp = async () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); await saveAndBroadcast('modelComments', App.work.modelComments); }; document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); }
export async function deleteComment(id) { App.work.modelComments = (App.work.modelComments || []).filter(c => c.id !== id); await saveAndBroadcast('modelComments', App.work.modelComments); initViewerCanvas(); }
export async function clearViewerFeedback() { if (confirm('Clear feedback?')) { App.work.modelComments = []; await saveAndBroadcast('modelComments', []); renderTeacherContent(); } }
export const handleViewerClick = (e) => { if (App.viewerState.isPanning) return; if (App.viewerState.addingComment) { const canvas = document.getElementById('viewerCanvas'); if (!canvas) return; const rect = canvas.getBoundingClientRect(); App.viewerState.commentPosition = { x: (e.clientX - rect.left - (App.viewerState.pan?.x || 0)) / (App.viewerState.zoom || 1), y: (e.clientY - rect.top - (App.viewerState.pan?.y || 0)) / (App.viewerState.zoom || 1) }; const modal = document.getElementById('commentModal'); if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); document.getElementById('commentText')?.focus(); } } };
export function handleViewerPointerDown(e) { if (!App.viewerState.addingComment && !App.viewerState.selectedSticker) { App.viewerState.isPanning = true; const startX = e.clientX - (App.viewerState.pan?.x || 0), startY = e.clientY - (App.viewerState.pan?.y || 0); const onMove = (me) => { if (!App.viewerState.pan) App.viewerState.pan = { x: 0, y: 0 }; App.viewerState.pan.x = me.clientX - startX; App.viewerState.pan.y = me.clientY - startY; initViewerCanvas(); }; const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); setTimeout(() => { App.viewerState.isPanning = false; }, 50); }; document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); } }
export function handleViewerWheel(e) { e.preventDefault(); const delta = -e.deltaY, zoomSpeed = 0.001, oldZoom = App.viewerState.zoom || 1, newZoom = Math.min(Math.max(0.1, oldZoom + delta * zoomSpeed), 5), rect = e.currentTarget.getBoundingClientRect(), mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top; App.viewerState.pan.x = mouseX - (mouseX - (App.viewerState.pan.x || 0)) * (newZoom / oldZoom); App.viewerState.pan.y = mouseY - (mouseY - (App.viewerState.pan.y || 0)) * (newZoom / oldZoom); App.viewerState.zoom = newZoom; initViewerCanvas(); }
export const setViewerTool = (t) => { App.viewerState.addingComment = (t === 'comment'); App.viewerState.selectedSticker = null; renderTeacherContent(); };
