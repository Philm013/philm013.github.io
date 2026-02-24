/**
 * @file viewer.js
 * @description specialized logic for real-time monitoring and feedback on student models and data. 
 */

/* global Fuse */

import { App } from '../core/state.js';
import { dbGet, dbGetByIndex, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveAndBroadcast, loadFromStorage, saveToStorage } from '../core/sync.js';
import { renderTeacherContent, updateModeUI, renderEmptyState } from '../ui/renderer.js';
import { toast, calculateStudentProgress } from '../ui/utils.js';

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
    
    // Update the teacherModule to match if applicable for direct rendering
    if (moduleId === 'models') App.teacherModule = 'livemodels';
    else if (moduleId === 'analysis') App.teacherModule = 'livedata';
    else App.teacherModule = 'livegeneric'; // Generic renderer for other modules
    
    renderTeacherContent();
}

/**
 * Switches the teacher to view a specific student's work.
 */
export async function viewStudentWork(visitorId) {
    App.viewingStudentId = visitorId;
    App.viewerState.isMonitoring = true;
    
    // Default to models or current module
    if (!['models', 'analysis'].includes(App.currentModule)) {
        App.currentModule = 'models';
    }
    App.teacherModule = App.currentModule === 'models' ? 'livemodels' : 'livedata';
    
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
                    <div class="col-span-full">
                        ${renderEmptyState('No students found', 'Students need to join this session before you can monitor their work.', 'mdi:account-group-outline', true)}
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
        <div class="h-full flex flex-col -m-6">
            <div class="bg-gray-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl z-50 shrink-0">
                <div class="flex items-center gap-6">
                    <button onclick="window.stopViewingStudent()" class="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                        <span class="iconify text-2xl" data-icon="mdi:arrow-left"></span>
                    </button>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="font-black text-2xl uppercase tracking-tighter">${currentStudent?.name || 'Student'}</h2>
                            <span class="px-2 py-0.5 bg-primary text-white rounded text-[10px] font-black uppercase tracking-widest">Data Tables</span>
                        </div>
                        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Live Collection Monitoring</p>
                    </div>
                </div>
                ${renderViewerModuleTabs()}
                <div class="flex items-center gap-2">
                    <button onclick="window.presentToClass('data')" class="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
                        <span class="iconify text-lg" data-icon="mdi:presentation"></span>
                        Present
                    </button>
                </div>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50 p-8 custom-scrollbar">
                <div class="max-w-7xl mx-auto space-y-8">
                    <div class="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl">
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
                                                                                        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 transition-all ${dt.feedback?.[ri]?.sticker === s ? 'bg-blue-100 ring-2 ring-blue-400 scale-110' : ''}">
                                                                                        ${s}
                                                                                    </button>
                                                                                `).join('')}
                                                                                <button onclick="window.openTableRowFeedback(${ri})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 transition-all ${dt.feedback?.[ri]?.text ? 'bg-blue-50 ring-1 ring-blue-200' : ''}">
                                                                                    <span class="iconify" data-icon="mdi:comment-text-outline"></span>
                                                                                </button>
                                                                                <button onclick="window.addDataRowSticker(${ri}, null)" class="text-[10px] text-gray-300 hover:text-red-500">×</button>
                                                                            </div>
                                                                            ${dt.feedback?.[ri]?.text ? `<p class="text-[9px] text-blue-600 font-bold mt-1 max-w-[100px] truncate mx-auto">${dt.feedback[ri].text}</p>` : ''}
                                                                        </td>
                                        
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${dt.rows.length === 0 ? '<div class="py-20 text-center text-gray-300 italic">No data entered yet</div>' : ''}
                    </div>

                    ${dt.comment ? `
                        <div class="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 shadow-sm relative overflow-hidden">
                            <span class="absolute -top-4 -right-4 iconify text-8xl text-amber-100/50" data-icon="mdi:note-text"></span>
                            <h4 class="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 relative z-10">Student Table Notes</h4>
                            <p class="text-amber-900 font-medium leading-relaxed relative z-10">${dt.comment}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}


/**
 * UI: Opens feedback modal for a specific data table row.
 */
export function openTableRowFeedback(rowIndex) {
    App.editingRowIndex = rowIndex;
    const dt = App.work.dataTable;
    const feedback = dt.feedback?.[rowIndex] || { text: '', sticker: null };
    
    const modal = document.getElementById('commentModal');
    const input = document.getElementById('commentText');
    if (modal && input) {
        input.value = feedback.text || '';
        if (feedback.sticker) window.setFeedbackSticker(feedback.sticker);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        input.focus();
    }
}

/**
 * Adds a feedback sticker to a specific data row.
 */
export async function addDataRowSticker(rowIndex, emoji) {
    if (!App.work.dataTable.feedback) App.work.dataTable.feedback = {};
    
    if (emoji === null) {
        delete App.work.dataTable.feedback[rowIndex];
    } else {
        const current = App.work.dataTable.feedback[rowIndex] || { text: '' };
        App.work.dataTable.feedback[rowIndex] = { ...current, sticker: emoji };
    }
    await saveAndBroadcast('dataTable.feedback', App.work.dataTable.feedback);
    renderTeacherContent();
}


/**
 * UI: Renders the icon manager/curator view.
 */
export async function renderIconManager() {
    // Fetch all available collections if not already loaded
    if (!App.availableIconSets || App.availableIconSets.length === 0) {
        try {
            const res = await fetch('https://api.iconify.design/collections');
            const data = await res.json();
            
            const categories = {};
            App.availableIconSets = Object.keys(data).map(prefix => {
                const set = {
                    prefix,
                    name: data[prefix].name,
                    total: data[prefix].total,
                    category: data[prefix].category || 'Other'
                };
                if (!categories[set.category]) categories[set.category] = [];
                categories[set.category].push(set);
                return set;
            });
            App.iconCategories = categories;
        } catch (e) { console.error('Failed to load Iconify collections', e); }
    }

    // Comprehensive Preset Filters
    const presets = [
        { label: 'Science', query: 'science,nature,biology,chemistry,physics,lab,research,space,earth', icon: 'mdi:flask' },
        { label: 'Engineering', query: 'engineering,construction,tools,industrial,technology,structure,gear,robot', icon: 'mdi:cog' },
        { label: 'Diagramming', query: 'arrow,shape,flow,map,logic,math,symbol,chart,connector', icon: 'mdi:vector-polyline' },
        { label: 'Environment', query: 'ecology,weather,climate,water,energy,animal,plant', icon: 'mdi:leaf' }
    ];

    setTimeout(() => {
        window.onManagerCategoryChange();
    }, 100);

    return `
        <div class="max-w-6xl mx-auto">
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-black text-gray-900">Icon & Emoji Architect</h2>
                    <p class="text-gray-500 mt-1">Curate Modeling assets and search the global scientific library.</p>
                </div>
                <div class="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200">
                    <button onclick="window.toggleTeacherSetting('showAllIcons')" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${App.teacherSettings.showAllIcons ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}">
                        Global Search: ON
                    </button>
                    <button onclick="window.toggleTeacherSetting('showAllIcons')" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!App.teacherSettings.showAllIcons ? 'bg-white text-gray-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}">
                        Curated Only
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                <!-- Curated Lesson Bin -->
                <div class="xl:col-span-2 space-y-8" data-card-title="Curated Set">
                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <div class="flex items-center justify-between mb-8">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                                    <span class="iconify text-2xl" data-icon="mdi:briefcase-check"></span>
                                </div>
                                <div>
                                    <h3 class="text-xl font-black text-gray-900">Lesson Curated Set</h3>
                                    <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Icons & Emojis students see first</p>
                                </div>
                            </div>
                            <button onclick="window.clearAllCurated()" class="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all">Clear Active Set</button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Icons (${App.teacherSettings.lessonIcons?.length || 0})</label>
                                <div class="flex flex-wrap gap-2 p-4 bg-gray-50/50 rounded-3xl min-h-[120px] border border-gray-100 content-start">
                                    ${App.teacherSettings.lessonIcons?.length ? App.teacherSettings.lessonIcons.map(icon => `
                                        <button onclick="window.removeLessonIcon('${icon}')" class="p-3 bg-white rounded-xl border-2 border-primary hover:border-red-500 hover:bg-red-50 transition-all group relative shadow-sm">
                                            <span class="iconify text-xl" data-icon="${icon}"></span>
                                            <span class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 scale-75 transition-all">
                                                <span class="iconify" data-icon="mdi:close"></span>
                                            </span>
                                        </button>
                                    `).join('') : '<div class="m-auto text-center"><p class="text-gray-300 text-[10px] font-black uppercase tracking-widest">Add icons from below</p></div>'}
                                </div>
                            </div>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between px-1">
                                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Emoji Bank (${App.teacherSettings.lessonEmojis?.length || 0})</label>
                                    <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                                </div>
                                <div class="flex flex-wrap gap-2 p-6 bg-gray-50/50 rounded-[2rem] min-h-[160px] border-2 border-dashed border-gray-100 content-start">
                                    ${App.teacherSettings.lessonEmojis?.length ? App.teacherSettings.lessonEmojis.map(emoji => `
                                        <button onclick="window.removeLessonEmoji('${emoji}')" class="text-3xl p-3 bg-white rounded-2xl border-2 border-transparent hover:border-red-50 hover:text-red-500 transition-all group relative shadow-sm hover:-translate-y-1">
                                            ${emoji}
                                            <span class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 transition-all shadow-lg">
                                                <span class="iconify" data-icon="mdi:close"></span>
                                            </span>
                                        </button>
                                    `).join('') : '<div class="m-auto text-center"><p class="text-gray-300 text-[10px] font-black uppercase tracking-widest">Select from library</p></div>'}
                                </div>
                                
                                <div class="mt-4 space-y-3">
                                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Enable Domain Defaults</label>
                                    <div class="flex flex-wrap gap-2">
                                        ${Object.keys(App.teacherSettings.emojiSets).map(set => {
                                            const isActive = App.teacherSettings.activeEmojiSets?.includes(set);
                                            return `
                                                <button onclick="window.toggleEmojiSet('${set}')" 
                                                    class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${isActive ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-white border-gray-100 text-gray-400 hover:border-yellow-200'}">
                                                    ${set}
                                                </button>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Emoji Fast-Add -->
                <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex flex-col" data-card-title="Emoji Library">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <span class="iconify text-2xl" data-icon="mdi:sticker-emoji"></span>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-gray-900">Emoji Library</h3>
                            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">One-click scientific symbols</p>
                        </div>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto max-h-[300px] mb-6 pr-2 custom-scrollbar">
                        <div class="grid grid-cols-6 gap-2">
                            ${['🔬','🧪','⚗️','🧬','🌍','🌎','🌏','🔭','🌡️','🛰️','🚀','🪐','☄️','🌌','🌑','🌓','🌔','🌠','☀️','🌞','🌜','🌛','🌦️','🌧️','🌨️','❄️','🌪️','🌬️','🌫️','🌊','💧','🔥','🌋','🏔️','⛰️','🏜️','🏖️','🏝️','🏞️','🌲','🌳','🌴','🌵','🌿','☘️','🍀','🍁','🍂','🍃','🍄','🍄','🐚','🐚','🐚','🐚','🦀','🦞','🦐','🦑','🐙','🐟','🐠','🐡','🦈','🐳','🐋','🐬','🦭','🐊','🐢','🦎','🐍','🐲','🐉','🦕','🦖','🐵','🐒','🦍','🦧','🐶','🐕','🐺','🦊','🦝','🐱','🐈','🦁','🐯','🐅','🐆','🐴','🐎','🦄','🦓','🦌','🦬','🐮','🐂','🐃','🐄','🐷','🐖','🐗','🐽','🐏','🐑','🐐','🐪','🐫','🦙','🦒','🐘','🦣','🦏','🦛','🐭','🐁','🐀','🐹','🐰','🐇','🐿️','🦫','🦔','🦇','🐻','🐨','🐼','🦥','🦦','🦨','🦘','🦡','🐾','🦃','🐔','🐓','🐣','🐤','🐥','🐦','🐧','🕊️','🦅','🦆','🦉','🦤','🪶','🦩','🦜','🐸','🦋','🐛','🐜','🐝','🪲','🐞','🦗','🕷️','🕸️','🦂','🦟','🪰','🪱','🦠','🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🍵','🥤','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🧊','🏗️','🏢','🏭','🏠','🏘️','🏚️','🏠','🏡','🛣️','🛤️','🌉','⛓️','🔗','🖇️','📐','📏','🔩','🔧','🔨','⚒️','🛠️','⛏️','🧱','⚙️','⚖️','🔋','🔌','💻','⌨️','🖱️','🖨️','📱','📸','🎥','🔦','🕯️','💡','📖','📚','📓','📒','📔','📕','📗','📘','📙','📜','📄','📰','📊','📈','📉','📋','📌','📍','📎','📫','📬','📪','📬','📦','🗳️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🛡️','⚔️','🏹','🔧','🪛','🔩','⚙️','🗜️','⚖️','🦯','🔗','⛓️','🧰','🧲','🧪','🌡️','🧬','🔬','🔭','📡','🛸','🌌','🌌','🌌'].map(e => `
                                <button onclick="window.addLessonEmoji('${e}')" class="text-2xl p-2 bg-gray-50 hover:bg-white border border-transparent hover:border-yellow-200 hover:shadow-sm rounded-xl transition-all active:scale-90 flex items-center justify-center aspect-square">${e}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="mt-auto">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Batch Custom Add</label>
                        <div class="relative">
                            <input type="text" id="customEmojiInput" placeholder="Paste multiple emojis here..." 
                                class="w-full pl-4 pr-20 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium focus:border-primary focus:bg-white focus:outline-none transition-all">
                            <button onclick="window.addCustomEmojis()" class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Add</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Global Icon Navigator -->
            <div class="bg-white rounded-[3rem] shadow-xl border border-gray-100 p-8 md:p-12" data-card-title="Global Library">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-12">
                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-200">
                            <span class="iconify text-3xl" data-icon="mdi:magnify-plus"></span>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tight">Global Navigator</h3>
                            <p class="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Search 200,000+ open-source icons</p>
                        </div>
                    </div>
                    
                    <div class="flex-1 max-w-2xl">
                        <div class="relative group">
                            <input type="text" id="iconManagerSearch" placeholder="Search by keyword (e.g. 'DNA', 'Robot')..." 
                                class="w-full pl-8 pr-20 py-6 bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] text-xl font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300 shadow-inner"
                                onkeypress="if(event.key==='Enter')window.searchIconsForManager()">
                            <button onclick="window.searchIconsForManager()" class="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">
                                <span class="iconify text-2xl" data-icon="mdi:arrow-right"></span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    <div class="space-y-10">
                        <div class="space-y-4">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Quick Filters</label>
                            <div class="grid grid-cols-1 gap-2">
                                ${presets.map(p => `
                                    <button onclick="window.applyPresetFilter('${p.query}')" class="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-200 hover:bg-white transition-all text-left group">
                                        <span class="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform border border-gray-100">
                                            <span class="iconify text-xl" data-icon="${p.icon}"></span>
                                        </span>
                                        <span class="font-black text-gray-700 uppercase text-xs tracking-wider">${p.label}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-4">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Icon Libraries</label>
                            <select id="managerCategorySelect" onchange="window.onManagerCategoryChange()" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary focus:outline-none mb-2">
                                <option value="">All Categories</option>
                                ${Object.keys(App.iconCategories || {}).sort().map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            </select>
                            <div id="managerCollectionsList" class="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                <!-- Populated dynamically based on category -->
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-3">
                        <div id="iconManagerGrid" class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 min-h-[600px] max-h-[800px] overflow-y-auto p-10 bg-gray-50 rounded-[3rem] border-2 border-gray-100 shadow-inner custom-scrollbar content-start">
                            <div class="col-span-full py-40 text-center flex flex-col items-center opacity-20 grayscale">
                                <span class="iconify text-9xl mb-8" data-icon="mdi:library-search"></span>
                                <p class="text-xl font-black uppercase tracking-[0.3em]">Explore the Repository</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.onManagerCategoryChange = () => {
    const catSelect = document.getElementById('managerCategorySelect');
    const list = document.getElementById('managerCollectionsList');
    if (!catSelect || !list) return;
    
    const category = catSelect.value;
    let sets = [];
    
    if (category) {
        sets = App.iconCategories?.[category] || [];
    } else {
        // Default to popular sets if no category
        const topPrefixes = ['mdi', 'fa6-solid', 'lucide', 'tabler', 'ph', 'carbon', 'fluent', 'heroicons', 'bi', 'ri'];
        sets = (App.availableIconSets || []).filter(s => topPrefixes.includes(s.prefix));
    }

    list.innerHTML = `
        <button onclick="window.changeIconSet(null, '${category}')" 
            class="w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${!App.currentIconSet ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary'}">
            ${category ? 'All in ' + category : 'All Sources'}
        </button>
        ${sets.sort((a,b) => b.total - a.total).map(s => `
            <button onclick="window.changeIconSet('${s.prefix}', '${category}')" 
                class="w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${App.currentIconSet === s.prefix ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary'}">
                <div class="flex items-center justify-between">
                    <span>${s.name}</span>
                    <span class="opacity-50 text-[8px]">${(s.total/1000).toFixed(1)}k</span>
                </div>
            </button>
        `).join('')}
    `;

    // Trigger search with new category constraints
    window.searchIconsForManager();
};

/**
 * Loads icons from Iconify for the manager view with fuzzy search support.
 */
export async function loadIconsForManager() {
    const grid = document.getElementById('iconManagerGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="col-span-full py-32 flex flex-col items-center justify-center h-full"><span class="iconify animate-spin text-6xl text-primary mb-4" data-icon="mdi:loading"></span><p class="text-primary font-black uppercase tracking-widest text-xs">Accessing Repository...</p></div>';
    
    const prefixes = App.currentIconSet || null;
    const category = App.currentIconCategory || null;
    const searchInput = document.getElementById('iconManagerSearch');
    let query = searchInput?.value.trim() || '';
    
    // If no query and no prefix/category, default to 'science' search
    if (!query && !prefixes && !category) {
        query = 'science';
    }

    try {
        let allIcons = [];
        
        if (prefixes && !query) {
            // BROWSE MODE: Fetch collection info
            const res = await fetch(`https://api.iconify.design/collection?prefix=${prefixes}`);
            const data = await res.json();
            if (data.uncategorized) allIcons = data.uncategorized.slice(0, 150).map(name => `${prefixes}:${name}`);
            else if (data.categories) {
                Object.values(data.categories).forEach(catIcons => {
                    if (allIcons.length < 150) allIcons = [...allIcons, ...catIcons.slice(0, 20).map(name => `${prefixes}:${name}`)];
                });
            }
        } else {
            // SEARCH MODE with Comma Splitting
            const terms = query.split(',').map(t => t.trim()).filter(t => t.length > 0);
            const results = await Promise.all(terms.map(async (term) => {
                // Style theme constraints
                let themePrefixes = '';
                const theme = App.teacherSettings.iconTheme || 'solid';
                if (theme === 'solid') themePrefixes = 'mdi,fa6-solid,material-symbols,ph-fill';
                else if (theme === 'outline') themePrefixes = 'line-md,lucide,tabler,ph,heroicons-outline';
                else if (theme === 'colorful') themePrefixes = 'logos,skill-icons,flat-color-icons,noto';

                let url = `https://api.iconify.design/search?query=${encodeURIComponent(term)}&limit=100`;
                
                // Prioritize theme prefixes if global search is on or if no specific set selected
                if (prefixes) {
                    url += `&prefix=${prefixes}`;
                } else if (themePrefixes && !category) {
                    url += `&prefixes=${themePrefixes}`;
                } else if (category && App.iconCategories?.[category]) {
                    const catPrefixes = App.iconCategories[category].map(s => s.prefix).join(',');
                    url += `&prefixes=${catPrefixes}`;
                }

                const response = await fetch(url);
                const data = await response.json();
                return data.icons || [];
            }));

            // Combine and De-duplicate
            allIcons = [...new Set(results.flat())].slice(0, 200);

            // Apply Fuse.js fuzzy matching if available
            if (typeof Fuse !== 'undefined' && allIcons.length > 0 && query) {
                const fuse = new Fuse(allIcons, { threshold: 0.4, distance: 100 });
                const fuzzyResults = fuse.search(terms[0] || ''); // Fuzzy match on first term
                if (fuzzyResults.length > 0) {
                    const fuzzyIcons = fuzzyResults.map(r => r.item);
                    allIcons = [...new Set([...fuzzyIcons, ...allIcons])].slice(0, 150);
                }
            }
        }

        if (allIcons.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-32 text-center opacity-30 grayscale"><span class="iconify text-6xl mb-4" data-icon="mdi:alert-circle-outline"></span><p class="text-sm font-bold uppercase tracking-widest">No matching icons found.</p></div>';
            return;
        }

        grid.innerHTML = allIcons.map(icon => {
            const isSelected = App.teacherSettings.lessonIcons?.includes(icon);
            const parts = icon.split(':');
            const prefix = parts[0];
            const name = parts[1];
            
            return `
                <div class="relative group">
                    <button onclick="window.addLessonIcon('${icon}')" 
                        class="w-full aspect-square rounded-2xl transition-all flex items-center justify-center relative ${isSelected ? 'bg-primary text-white shadow-xl shadow-blue-200 ring-4 ring-primary/20 scale-105' : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-primary border border-gray-100 shadow-sm hover:scale-110 hover:shadow-lg'}"
                        title="${icon}">
                        <span class="iconify text-3xl" data-icon="${icon}"></span>
                        ${isSelected ? '<span class="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm"></span>' : ''}
                    </button>
                    
                    <div class="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div class="relative">
                            <span class="iconify text-gray-400 bg-white rounded-full" data-icon="mdi:information"></span>
                            <div class="absolute bottom-full left-0 mb-2 w-40 p-2 bg-gray-900 text-white text-[9px] rounded-lg shadow-2xl">
                                <p class="font-black text-blue-400 uppercase tracking-widest mb-1 border-b border-white/10 pb-1">${prefix}</p>
                                <p class="opacity-70">${name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Icon search error:', e);
        grid.innerHTML = '<div class="col-span-full py-32 text-center text-red-400"><span class="iconify text-6xl mb-4" data-icon="mdi:wifi-off"></span><p class="font-black uppercase tracking-widest text-xs">Failed to connect to Iconify API.</p></div>';
    }
}

export const applyPresetFilter = (query) => {
    const input = document.getElementById('iconManagerSearch');
    if (input) input.value = query;
    loadIconsForManager();
};

export const clearAllCurated = async () => {
    if (confirm('Clear the entire curated icon and emoji set? Default practicing tools will be used.')) {
        App.teacherSettings.lessonIcons = [];
        App.teacherSettings.lessonEmojis = [];
        await saveToStorage();
        renderTeacherContent();
        toast('Curated set cleared', 'info');
    }
};

export const changeIconSet = async (prefix, category) => { 
    App.currentIconSet = prefix; 
    App.currentIconCategory = category;
    // Don't fully re-render teacher content, just update the grid
    document.querySelectorAll('#managerCollectionsList button').forEach(b => b.classList.remove('bg-primary', 'text-white'));
    // This is handled by renderTeacherContent but let's just do it directly to prevent scroll reset
    // Actually, renderTeacherContent is fine, but it resets the whole tab. We can just load icons if we want.
    // For now, let's stick to the simple re-render.
    renderTeacherContent(); 
    setTimeout(() => { loadIconsForManager(); }, 50);
};

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

export const toggleEmojiSet = async (set) => {
    if (!App.teacherSettings.activeEmojiSets) App.teacherSettings.activeEmojiSets = ['general'];
    const idx = App.teacherSettings.activeEmojiSets.indexOf(set);
    if (idx > -1) {
        if (App.teacherSettings.activeEmojiSets.length > 1) {
            App.teacherSettings.activeEmojiSets.splice(idx, 1);
        } else {
            toast('At least one set must be active', 'warning');
            return;
        }
    } else {
        App.teacherSettings.activeEmojiSets.push(set);
    }
    await saveToStorage();
    renderTeacherContent();
    toast(`${set.charAt(0).toUpperCase() + set.slice(1)} emojis toggled`, 'success');
};

/**
 * Re-renders all elements on the teacher's viewer canvas.
 */
export function initViewerCanvas() {
    const content = document.getElementById('viewerCanvasContent');
    if (!content) return;
    
    // Apply local viewer transforms
    if (!App.viewerState.pan) App.viewerState.pan = { x: 0, y: 0 };
    if (!App.viewerState.zoom) App.viewerState.zoom = 1;
    content.style.transform = `translate(${App.viewerState.pan.x}px, ${App.viewerState.pan.y}px) scale(${App.viewerState.zoom})`;

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
            <div class="comment-bubble group/comment" style="left:${c.x}px; top:${c.y}px; cursor: move;" 
                onpointerdown="window.startCommentDrag(event, '${c.id}')">
                <div class="flex items-start gap-3">
                    ${c.sticker ? `<div class="w-10 h-10 bg-white rounded-xl shadow-inner border border-gray-100 flex items-center justify-center text-2xl shrink-0">${c.sticker}</div>` : ''}
                    <div class="flex-1 min-w-[120px]">
                        <p class="font-black text-[9px] text-red-600 uppercase mb-1 tracking-widest">${c.author}</p>
                        <p class="text-xs font-medium text-gray-700 leading-relaxed">${c.text || 'Checked!'}</p>
                    </div>
                </div>
                <button onclick="window.deleteComment('${c.id}')" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/comment:opacity-100 transition-opacity shadow-sm">×</button>
            </div>
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
 * Broadcasts the current student's work to the whole class as a presentation.
 */
export async function presentToClass(type) {
    if (!App.viewingStudentId) return;
    
    const users = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const s = users.find(u => u.visitorId === App.viewingStudentId);
    
    App.sharedData.currentPresentation = {
        type: type, // 'model' | 'data'
        visitorId: App.viewingStudentId,
        studentName: s ? s.name : 'Student',
        moduleId: App.currentModule,
        timestamp: Date.now()
    };
    
    await saveToStorage();
    await saveAndBroadcast('debatePosts', App.sharedData.debatePosts); // Triggers sync
    toast(`Now presenting ${s ? s.name : 'student'}'s ${type} to the class!`, 'success');
}

/**
 * UI: Closes the comment modal and resets state.
 */
export function closeCommentModal() {
    const modal = document.getElementById('commentModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    App.viewerState.addingComment = false;
    App.viewerState.commentPosition = null;
    App.viewerState.selectedSticker = null;
    App.editingPostId = null;
    App.editingRowIndex = null;
    
    // Reset sticker UI
    document.querySelectorAll('.feedback-sticker-btn').forEach(b => b.classList.remove('bg-blue-100', 'border-primary'));
}

/**
 * UI: Sets the sticker to be attached to the feedback.
 */
export function setFeedbackSticker(sticker) {
    App.viewerState.selectedSticker = (App.viewerState.selectedSticker === sticker) ? null : sticker;
    document.querySelectorAll('.feedback-sticker-btn').forEach(b => {
        const isSelected = b.dataset.sticker === App.viewerState.selectedSticker;
        b.classList.toggle('bg-blue-100', isSelected);
        b.classList.toggle('border-primary', isSelected);
    });
}

export async function saveComment() {
    // 1. Check for Argument Post feedback
    if (App.editingPostId) {
        const argument = await import('../modules/argument.js');
        return argument.saveArgumentFeedback();
    }

    // 2. Check for Data Table row feedback
    if (App.editingRowIndex !== null && App.editingRowIndex !== undefined && App.teacherModule === 'livedata') {
        const val = document.getElementById('commentText')?.value.trim();
        const sticker = App.viewerState.selectedSticker;
        if (!App.work.dataTable.feedback) App.work.dataTable.feedback = {};
        App.work.dataTable.feedback[App.editingRowIndex] = { text: val, sticker, time: Date.now() };
        await saveAndBroadcast('dataTable.feedback', App.work.dataTable.feedback);
        closeCommentModal();
        renderTeacherContent();
        toast('Row feedback updated', 'success');
        return;
    }

    const val = document.getElementById('commentText')?.value.trim();
    if (App.viewerState.commentPosition) {
        if (!App.work.modelComments) App.work.modelComments = [];
        
        const comment = { 
            id: 'c_' + Date.now(), 
            text: val || '', 
            sticker: App.viewerState.selectedSticker,
            x: App.viewerState.commentPosition.x, 
            y: App.viewerState.commentPosition.y, 
            author: App.user.name, 
            time: Date.now() 
        };
        
        App.work.modelComments.push(comment);
        await saveAndBroadcast('modelComments', App.work.modelComments);
        
        closeCommentModal();
        renderTeacherContent();
        toast('Feedback posted!', 'success');
    }
}

/**
 * Starts dragging a feedback comment.
 */
export function startCommentDrag(event, id) {
    if (event.target.closest('button')) return; // Don't drag if clicking delete button
    event.preventDefault();
    event.stopPropagation();
    
    const comment = App.work.modelComments.find(c => c.id === id);
    if (!comment) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const initX = comment.x;
    const initY = comment.y;
    const zoom = App.viewerState.zoom || 1;

    const onPointerMove = (e) => {
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;
        comment.x = initX + dx;
        comment.y = initY + dy;
        renderViewerNodes();
    };

    const onPointerUp = async () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        await saveAndBroadcast('modelComments', App.work.modelComments);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
}

/**
 * Re-renders viewer elements.
 */
export function renderViewerNodes() {
    initViewerCanvas();
}

/**
 * Deletes a specific feedback comment.
 */
export async function deleteComment(id) {
    App.work.modelComments = (App.work.modelComments || []).filter(c => c.id !== id);
    await saveAndBroadcast('modelComments', App.work.modelComments);
    renderViewerNodes();
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
    if (App.viewerState.isPanning) return;
    const canvas = document.getElementById('viewerCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate coords relative to transformed content
    const x = (e.clientX - rect.left - (App.viewerState.pan?.x || 0)) / (App.viewerState.zoom || 1);
    const y = (e.clientY - rect.top - (App.viewerState.pan?.y || 0)) / (App.viewerState.zoom || 1);
    
    if (App.viewerState.addingComment) { 
        App.viewerState.commentPosition = { x, y }; 
        const modal = document.getElementById('commentModal');
        if (modal) {
            modal.classList.remove('hidden'); 
            modal.classList.add('flex');
            document.getElementById('commentText')?.focus();
        }
    }
};

/**
 * Panning logic for the viewer.
 */
export function handleViewerPointerDown(e) {
    if (!App.viewerState.addingComment && !App.viewerState.selectedSticker) {
        App.viewerState.isPanning = true;
        const startX = e.clientX - (App.viewerState.pan?.x || 0);
        const startY = e.clientY - (App.viewerState.pan?.y || 0);

        const onPointerMove = (moveEvent) => {
            if (!App.viewerState.pan) App.viewerState.pan = { x: 0, y: 0 };
            App.viewerState.pan.x = moveEvent.clientX - startX;
            App.viewerState.pan.y = moveEvent.clientY - startY;
            initViewerCanvas();
        };

        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            setTimeout(() => { App.viewerState.isPanning = false; }, 50);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }
}

/**
 * Zooming logic for the viewer.
 */
export function handleViewerWheel(e) {
    e.preventDefault();
    if (!App.viewerState.pan) App.viewerState.pan = { x: 0, y: 0 };
    if (!App.viewerState.zoom) App.viewerState.zoom = 1;

    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const newZoom = Math.min(Math.max(0.1, App.viewerState.zoom + delta * zoomSpeed), 5);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = (mouseX - App.viewerState.pan.x) / App.viewerState.zoom;
    const dy = (mouseY - App.viewerState.pan.y) / App.viewerState.zoom;

    App.viewerState.pan.x = mouseX - dx * newZoom;
    App.viewerState.pan.y = mouseY - dy * newZoom;
    App.viewerState.zoom = newZoom;

    initViewerCanvas();
}

export const setViewerTool = (t) => { 
    App.viewerState.addingComment = (t === 'comment'); 
    App.viewerState.selectedSticker = null; 
    renderTeacherContent(); 
};

