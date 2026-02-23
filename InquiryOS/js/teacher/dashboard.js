/**
 * @file dashboard.js
 * @description Core logic for the Teacher Dashboard in InquiryOS. 
 */

import { App, getInitialWorkState } from '../core/state.js';
import { dbGetAll, dbPut, dbDelete, dbGet, dbGetByIndex, STORE_LESSONS, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveToStorage, registerUser, loadFromStorage } from '../core/sync.js';
import { renderTeacherContent, updateModeUI, renderStudentContent } from '../ui/renderer.js';
import { renderNavigation } from '../ui/navigation.js';
import { toast, generateCode, calculateStudentProgress } from '../ui/utils.js';

/**
 * Renders the primary teacher dashboard overview.
 */
export function renderTeacherOverview() {
    const phenomenon = App.teacherSettings?.phenomenon || { title: '', description: '', tags: [], ngssStandards: [] };
    const counts = {
        notices: App.work?.notices?.length || 0,
        wonders: App.work?.wonders?.length || 0,
        nodes: App.work?.modelNodes?.length || 0,
        posts: App.sharedData?.debatePosts?.length || 0
    };

    return `
        <div class="max-w-5xl mx-auto">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Teacher Dashboard</h2>
            </div>
            
            <div class="grid md:grid-cols-4 gap-4 mb-6">
                ${renderStatTile('Notices', counts.notices, 'mdi:eye', 'blue')}
                ${renderStatTile('Wonders', counts.wonders, 'mdi:lightbulb', 'yellow')}
                ${renderStatTile('Model Nodes', counts.nodes, 'mdi:cube-outline', 'green')}
                ${renderStatTile('Posts', counts.posts, 'mdi:forum', 'purple')}
            </div>

            <div class="grid md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm border p-6">
                    <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span class="iconify text-primary" data-icon="mdi:account-plus"></span>
                        Join Session
                    </h3>
                    <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                        <p class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Class Code</p>
                        <div class="flex items-center justify-between">
                            <code class="text-2xl font-mono font-black text-primary">${App.classCode}</code>
                            <button onclick="window.copyJoinLink()" class="p-2 bg-primary text-white rounded-lg hover:bg-blue-600">
                                <span class="iconify" data-icon="mdi:content-copy"></span>
                            </button>
                        </div>
                    </div>
                    <button onclick="window.showJoinQR()" class="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold shadow-lg hover:opacity-90">
                        Show QR Code for Students
                    </button>
                </div>

                <div class="bg-white rounded-xl shadow-sm border p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                            <span class="iconify text-primary" data-icon="mdi:flask-outline"></span>
                            Class Phenomenon
                        </h3>
                        <button onclick="window.showTeacherModule('ngss')" class="text-xs font-bold text-primary hover:underline">Browse Standards</button>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs font-bold text-gray-400 uppercase">Title</label>
                            <input type="text" value="${phenomenon.title}" onchange="window.updatePhenomenon('title', this.value)"
                                class="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-gray-400 uppercase">Description</label>
                            <textarea onchange="window.updatePhenomenon('description', this.value)"
                                class="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" rows="2">${phenomenon.description}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStatTile(label, count, icon, color) {
    return `
        <div class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center">
                    <span class="iconify text-${color}-600 text-2xl" data-icon="${icon}"></span>
                </div>
                <div>
                    <p class="text-2xl font-bold">${count}</p>
                    <p class="text-sm text-gray-600">${label}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Updates phenomenon details.
 */
window.updatePhenomenon = async (key, val) => {
    App.teacherSettings.phenomenon[key] = val;
    await saveToStorage();
    toast('Phenomenon updated!', 'success');
};

/**
 * Renders Student Snapshots with real-time progress.
 */
export async function renderTeacherSnapshots() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    
    let studentData = [];
    for (const s of students) {
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + s.visitorId);
        studentData.push({ student: s, work: saved ? saved.work : null });
    }

    return `
        <div class="max-w-7xl mx-auto">
            <div class="mb-8 flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-bold text-gray-900">Student Snapshots</h2>
                    <p class="text-gray-600">Monitoring ${students.length} students.</p>
                </div>
                <button onclick="window.exportToPDF()" class="px-4 py-2 bg-red-600 text-white rounded-lg font-bold flex items-center gap-2">
                    <span class="iconify" data-icon="mdi:file-pdf-box"></span> Export Report
                </button>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                ${studentData.map(data => {
                    const w = data.work || {};
                    const progress = calculateStudentProgress(w);
                    return `
                        <div class="bg-white rounded-2xl shadow-lg border p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">${data.student.name.charAt(0)}</div>
                                    <div>
                                        <h3 class="font-bold text-gray-900">${data.student.name}</h3>
                                        <p class="text-xs text-gray-500">${progress}% Complete</p>
                                    </div>
                                </div>
                                <button onclick="window.viewStudentWork('${data.student.visitorId}')" class="text-primary font-bold text-sm hover:underline">View Detail →</button>
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl">
                                <div>
                                    <p class="text-[10px] font-bold text-gray-400 uppercase">Question</p>
                                    <p class="italic line-clamp-2">${w.mainQuestion || 'None'}</p>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-gray-400 uppercase">Claim</p>
                                    <p class="line-clamp-2">${w.claim || 'None'}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Renders the Lesson Designer.
 */
export async function renderTeacherLessons() {
    const lessons = await dbGetAll(STORE_LESSONS);
    return `
        <div class="max-w-5xl mx-auto">
            <div class="mb-8 flex items-center justify-between">
                <h2 class="text-3xl font-bold text-gray-900">Lesson Designer</h2>
                <button onclick="window.saveCurrentAsLesson()" class="px-6 py-3 bg-primary text-white rounded-xl font-bold">Save Current as Preset</button>
            </div>
            <div class="grid md:grid-cols-2 gap-6">
                ${lessons.map(l => `
                    <div class="bg-white rounded-2xl border p-6 shadow-sm flex flex-col h-full">
                        <div class="flex justify-between items-start mb-4">
                            <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-primary">
                                <span class="iconify text-2xl" data-icon="mdi:lightbulb-variant"></span>
                            </div>
                            <button onclick="window.deleteLesson('${l.id}')" class="text-red-400 hover:text-red-600 p-1">
                                <span class="iconify text-xl" data-icon="mdi:delete-outline"></span>
                            </button>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">${l.name}</h3>
                        <p class="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">${l.settings.phenomenon.description}</p>
                        <div class="space-y-3 pt-4 border-t">
                            <button onclick="window.launchLesson('${l.id}')" class="w-full py-3 bg-gradient-to-r from-teacher to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm">
                                <span class="iconify" data-icon="mdi:rocket-launch"></span>
                                Start New Session
                            </button>
                            <button onclick="window.applyLessonToCurrent('${l.id}')" class="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                                Apply to Current Class
                            </button>
                        </div>
                    </div>
                `).join('')}
                ${lessons.length === 0 ? '<div class="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed text-gray-400">No lesson presets saved yet.</div>' : ''}
            </div>
        </div>
    `;
}

/**
 * Renders Student Management view.
 */
export async function renderTeacherStudents() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    const now = Date.now();

    return `
        <div class="max-w-6xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Student Manager</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${students.map(s => {
                    const isOnline = now - s.lastSeen < 15000;
                    return `
                        <div class="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all">
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white">
                                    ${s.avatar || s.name.charAt(0).toUpperCase()}
                                </div>
                                <span class="px-2 py-1 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} rounded-full text-[10px] font-black uppercase tracking-wider">
                                    ${isOnline ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                            <h3 class="font-bold text-gray-900 text-lg">${s.name}</h3>
                            <p class="text-xs text-gray-400 mb-4 uppercase font-bold">Last active: ${new Date(s.lastSeen).toLocaleTimeString()}</p>
                            <button onclick="window.viewStudentWork('${s.visitorId}')" class="w-full py-3 bg-blue-50 text-primary rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">Monitor Progress</button>
                        </div>
                    `;
                }).join('')}
                ${students.length === 0 ? '<div class="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed text-gray-400">No students joined yet.</div>' : ''}
            </div>
        </div>
    `;
}

/**
 * Renders Access Control.
 */
export function renderTeacherAccess() {
    const modules = [
        { id: 'questions', label: '1. Questions' },
        { id: 'models', label: '2. Models' },
        { id: 'investigation', label: '3. Investigation' },
        { id: 'analysis', label: '4. Analysis' },
        { id: 'math', label: '5. Math' },
        { id: 'explanations', label: '6. Explanations' },
        { id: 'argument', label: '7. Argument' },
        { id: 'communication', label: '8. Communication' }
    ];
    return `
        <div class="max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Module Access Control</h2>
            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden">
                ${modules.map(m => `
                    <div class="flex items-center justify-between p-5 border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <span class="font-bold text-gray-700">${m.label}</span>
                        <div class="flex items-center gap-4">
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${App.teacherSettings.moduleAccess[m.id] ? 'checked' : ''} 
                                    onchange="window.toggleAccess('${m.id}')" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                            <button onclick="window.forceAllToModule('${m.id}')" class="text-[10px] font-black uppercase px-2 py-1 border-2 rounded ${App.teacherSettings.forceModule === m.id ? 'bg-teacher text-white border-teacher' : 'text-teacher border-teacher/20'}">Force</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

export function renderSessionSettings() {
    return `
        <div class="max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Session Settings</h2>
            <div class="bg-white rounded-2xl border p-8 space-y-8 shadow-sm">
                <div class="space-y-4">
                    <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest">Student Interaction</h4>
                    <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                            <p class="font-bold text-gray-800">Show Teacher Responses</p>
                            <p class="text-xs text-gray-500">Allow students to see your comments on their boards</p>
                        </div>
                        <input type="checkbox" ${App.teacherSettings.showTeacherResponses ? 'checked' : ''} onchange="window.toggleTeacherSetting('showTeacherResponses')" class="w-6 h-6 rounded-lg text-primary">
                    </label>
                    <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                            <p class="font-bold text-gray-800">Allow Student-to-Student Replies</p>
                            <p class="text-xs text-gray-500">Students can reply to each other on Argument board</p>
                        </div>
                        <input type="checkbox" ${App.teacherSettings.allowStudentReplies ? 'checked' : ''} onchange="window.toggleTeacherSetting('allowStudentReplies')" class="w-6 h-6 rounded-lg text-primary">
                    </label>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the guided activity dashboard.
 */
export async function renderActivityDashboard() {
    const isMonitoring = App.viewerState.isMonitoring;
    return `
        <div class="h-full flex flex-col -m-6">
            <div class="bg-orange-600 text-white p-4 flex items-center justify-between shadow-lg z-50">
                <div class="flex items-center gap-4">
                    <button onclick="window.exitActivityDashboard()" class="p-2 hover:bg-orange-700 rounded-lg">
                        <span class="iconify text-xl" data-icon="mdi:arrow-left"></span>
                    </button>
                    <h2 class="font-bold text-lg uppercase tracking-tight">${App.currentModule}</h2>
                </div>
                <div class="flex items-center gap-1 bg-orange-700 p-1 rounded-xl">
                    <button onclick="window.toggleDashboardMode(false)" class="px-4 py-2 rounded-lg text-sm font-bold ${!isMonitoring ? 'bg-white text-orange-600 shadow' : 'text-white'}">Edit Exemplar</button>
                    <button onclick="window.toggleDashboardMode(true)" class="px-4 py-2 rounded-lg text-sm font-bold ${isMonitoring ? 'bg-white text-orange-600 shadow' : 'text-white'}">Monitor Class</button>
                </div>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50 p-6">
                ${isMonitoring ? await renderMonitorView() : `<div class="bg-white p-8 rounded-3xl shadow-sm border border-orange-100 min-h-full"><p class="text-orange-600 font-black mb-6 uppercase tracking-widest text-xs flex items-center gap-2"><span class="iconify" data-icon="mdi:pencil-box"></span> You are editing the class exemplar</p>${window.renderStudentContentHtml()}</div>`}
            </div>
        </div>
    `;
}

async function renderMonitorView() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    return `<div class="grid md:grid-cols-3 gap-6">${await Promise.all(students.map(async s => {
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + s.visitorId);
        const w = saved ? saved.work : {};
        return `<div class="bg-white rounded-2xl border p-4 shadow-sm">
            <div class="flex justify-between items-center mb-3"><span class="font-bold">${s.name}</span><span class="text-xs font-bold text-primary">${calculateStudentProgress(w)}%</span></div>
            <button onclick="window.viewStudentWork('${s.visitorId}')" class="w-full py-2 bg-blue-50 text-primary rounded-lg text-xs font-bold">View detail</button>
        </div>`;
    })).then(r => r.join(''))}</div>`;
}

/**
 * Reuses student module renderers for the exemplar editor.
 * @returns {string} HTML content.
 */
window.renderStudentContentHtml = () => {
    // We map existing renderers
    if (App.currentModule === 'questions') return window.renderQuestionsModule();
    if (App.currentModule === 'models') return window.renderModelsModule();
    if (App.currentModule === 'investigation') return window.renderInvestigationModule();
    if (App.currentModule === 'analysis') return window.renderAnalysisModule();
    if (App.currentModule === 'math') return window.renderMathModule();
    if (App.currentModule === 'explanations') return window.renderExplanationsModule();
    if (App.currentModule === 'argument') return window.renderArgumentModule();
    if (App.currentModule === 'communication') return window.renderCommunicationModule();
    return '<p>Renderer not found</p>';
};

export async function toggleDashboardMode(isMonitoring) {
    if (App.isExemplarMode && !App.viewerState.isMonitoring) {
        App.teacherSettings.exemplars[App.currentModule] = JSON.parse(JSON.stringify(App.work));
    }
    App.viewerState.isMonitoring = isMonitoring;
    if (!isMonitoring) {
        if (!App.teacherSettings.exemplars[App.currentModule]) App.teacherSettings.exemplars[App.currentModule] = getInitialWorkState();
        App.work = App.teacherSettings.exemplars[App.currentModule];
    } else { await loadFromStorage(); }
    updateModeUI(); renderTeacherContent();
}

export async function exitActivityDashboard() {
    App.isExemplarMode = false;
    if (!App.viewerState.isMonitoring) App.teacherSettings.exemplars[App.currentModule] = JSON.parse(JSON.stringify(App.work));
    App.viewingStudentId = null; await saveToStorage(); await loadFromStorage(); updateModeUI(); renderNavigation(); renderTeacherContent();
}

export async function saveCurrentAsLesson() {
    const name = prompt('Name:', App.teacherSettings.phenomenon.title); if (!name) return;
    const lesson = { id: 'l_' + Date.now(), name, settings: JSON.parse(JSON.stringify(App.teacherSettings)), timestamp: Date.now() };
    await dbPut(STORE_LESSONS, lesson); toast('Saved!', 'success'); renderTeacherContent();
}

export async function deleteLesson(id) { if (confirm('Delete lesson?')) { await dbDelete(STORE_LESSONS, id); renderTeacherContent(); } }

export async function launchLesson(lessonId) {
    if (confirm('Start new session?')) {
        const l = await dbGet(STORE_LESSONS, lessonId); if (!l) return;
        App.classCode = generateCode(); App.teacherSettings = JSON.parse(JSON.stringify(l.settings));
        App.work = getInitialWorkState(); App.sharedData = { debatePosts: [] };
        await saveToStorage(); await registerUser(); updateModeUI(); toast('Launched!', 'success');
    }
}

export async function applyLessonToCurrent(lessonId) {
    if (confirm('Apply to this class?')) {
        const l = await dbGet(STORE_LESSONS, lessonId); if (l) { App.teacherSettings = JSON.parse(JSON.stringify(l.settings)); await saveToStorage(); updateModeUI(); toast('Applied!', 'success'); }
    }
}

export async function toggleGuidedMode() {
    App.teacherSettings.guidedMode = !App.teacherSettings.guidedMode;
    App.teacherSettings.forceModule = App.teacherSettings.guidedMode ? 'questions' : null;
    await saveToStorage(); renderTeacherContent();
}

export async function guidedMove(dir) {
    const modules = ['questions', 'models', 'investigation', 'analysis', 'math', 'explanations', 'argument', 'communication'];
    let idx = modules.indexOf(App.teacherSettings.forceModule || 'questions');
    let next = Math.max(0, Math.min(modules.length - 1, idx + dir));
    if (App.isExemplarMode && !App.viewerState.isMonitoring) App.teacherSettings.exemplars[App.currentModule] = JSON.parse(JSON.stringify(App.work));
    App.teacherSettings.forceModule = App.currentModule = modules[next];
    if (App.isExemplarMode) {
        if (!App.viewerState.isMonitoring) {
            if (!App.teacherSettings.exemplars[App.currentModule]) App.teacherSettings.exemplars[App.currentModule] = getInitialWorkState();
            App.work = App.teacherSettings.exemplars[App.currentModule];
        } else await loadFromStorage();
    }
    await saveToStorage(); renderTeacherContent();
}

export async function forceAllToModule(moduleId) {
    App.teacherSettings.forceModule = (App.teacherSettings.forceModule === moduleId) ? null : moduleId;
    await saveToStorage(); renderTeacherContent();
}

window.toggleAccess = (id) => { App.teacherSettings.moduleAccess[id] = !App.teacherSettings.moduleAccess[id]; saveToStorage(); renderTeacherContent(); };
window.toggleTeacherSetting = (k) => { App.teacherSettings[k] = !App.teacherSettings[k]; saveToStorage(); renderTeacherContent(); };
