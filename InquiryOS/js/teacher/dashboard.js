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
                    <div class="flex flex-col gap-4">
                        <div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Join Link</p>
                            <div class="flex gap-2">
                                <input type="text" readonly id="joinLinkInput" 
                                    value="${window.location.origin}${window.location.pathname}?class=${App.classCode}"
                                    class="flex-1 bg-white border rounded px-3 py-2 text-sm text-gray-600 font-mono">
                                <button onclick="window.copyJoinLink()" class="p-2 bg-primary text-white rounded-lg hover:bg-blue-600" title="Copy Link">
                                    <span class="iconify" data-icon="mdi:content-copy"></span>
                                </button>
                            </div>
                        </div>
                        <button onclick="window.showJoinQR()" class="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold shadow-lg hover:opacity-90 flex items-center justify-center gap-2">
                            <span class="iconify text-xl" data-icon="mdi:qrcode"></span>
                            Show QR Code for Students
                        </button>
                    </div>
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
                            <label class="text-sm font-medium text-gray-700 block mb-1">Title</label>
                            <input type="text" id="phenomTitle" value="${phenomenon.title || ''}" onchange="window.updatePhenomenon()"
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-700 block mb-1">Description</label>
                            <textarea id="phenomDesc" rows="3" onchange="window.updatePhenomenon()"
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all">${phenomenon.description || ''}</textarea>
                        </div>

                        <div class="pt-4 border-t border-gray-100">
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Linked Standards</p>
                            <div class="space-y-2">
                                ${phenomenon.ngssStandards?.length > 0 ? phenomenon.ngssStandards.map(peId => `
                                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg group">
                                        <span class="text-xs font-bold text-gray-700">${peId}</span>
                                        <button onclick="window.removeFromPhenomenon('${peId}')" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span class="iconify" data-icon="mdi:close-circle"></span>
                                        </button>
                                    </div>
                                `).join('') : '<p class="text-xs text-gray-400 italic">No standards linked yet</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Updates phenomenon details.
 */
export const updatePhenomenon = async () => {
    if (!App.teacherSettings) App.teacherSettings = { phenomenon: {} };
    if (!App.teacherSettings.phenomenon) App.teacherSettings.phenomenon = {};

    App.teacherSettings.phenomenon = {
        title: document.getElementById('phenomTitle')?.value || '',
        description: document.getElementById('phenomDesc')?.value || '',
        tags: App.teacherSettings.phenomenon.tags || [],
        ngssStandards: App.teacherSettings.phenomenon.ngssStandards || []
    };
    
    await saveToStorage();
    toast('Phenomenon updated!', 'success');
    renderTeacherContent();
};

/**
 * Removes a standard from the phenomenon.
 */
export const removeFromPhenomenon = async (peId) => {
    App.teacherSettings.phenomenon.ngssStandards = App.teacherSettings.phenomenon.ngssStandards.filter(id => id !== peId);
    await saveToStorage();
    toast(`Removed ${peId}`, 'info');
    renderTeacherContent();
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
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-bold text-gray-900">Student Snapshots</h2>
                    <p class="text-gray-500 mt-1">Monitoring the progress of ${students.length} students.</p>
                </div>
                <button onclick="window.exportToPDF()" class="px-5 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-red-700 transition-all">
                    <span class="iconify text-xl" data-icon="mdi:file-pdf-box"></span> 
                    Export Class Report
                </button>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                ${studentData.map(data => {
                    const w = data.work || {};
                    const progress = calculateStudentProgress(w);
                    return `
                        <div class="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-6">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                        ${data.student.avatar || data.student.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-gray-900 text-lg">${data.student.name}</h3>
                                        <div class="flex items-center gap-2 mt-1">
                                            <div class="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div class="h-full bg-primary" style="width:${progress}%"></div>
                                            </div>
                                            <span class="text-xs font-bold text-primary">${progress}%</span>
                                        </div>
                                    </div>
                                </div>
                                <button onclick="window.viewStudentWork('${data.student.visitorId}')" class="px-4 py-2 bg-blue-50 text-primary rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
                                    View Board →
                                </button>
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div>
                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Driving Question</p>
                                    <p class="italic text-gray-700 line-clamp-2">${w.mainQuestion || '<span class="text-gray-300">Not set</span>'}</p>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Claim</p>
                                    <p class="text-gray-700 line-clamp-2">${w.claim || '<span class="text-gray-300">No claim yet</span>'}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${students.length === 0 ? `
                    <div class="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                        <span class="iconify text-6xl text-gray-200 mb-4" data-icon="mdi:account-search-outline"></span>
                        <h3 class="text-lg font-bold text-gray-400">Waiting for Students</h3>
                        <p class="text-sm text-gray-400 mt-1">Invite students using class code: <span class="font-mono font-black text-primary">${App.classCode}</span></p>
                    </div>
                ` : ''}
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
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-bold text-gray-900">Lesson Designer</h2>
                    <p class="text-gray-500 mt-1">Create and manage activity presets for your classes.</p>
                </div>
                <button onclick="window.saveCurrentAsLesson()" class="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center gap-2">
                    <span class="iconify" data-icon="mdi:plus-circle"></span>
                    Save Current as Preset
                </button>
            </div>
            <div class="grid md:grid-cols-2 gap-6">
                ${lessons.map(l => `
                    <div class="bg-white rounded-2xl border p-6 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-4">
                            <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-primary">
                                <span class="iconify text-2xl" data-icon="mdi:lightbulb-variant"></span>
                            </div>
                            <button onclick="window.deleteLesson('${l.id}')" class="text-gray-300 hover:text-red-500 p-1 transition-colors">
                                <span class="iconify text-xl" data-icon="mdi:delete-outline"></span>
                            </button>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">${l.name}</h3>
                        <p class="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">${l.settings.phenomenon.description}</p>
                        <div class="space-y-3 pt-4 border-t border-gray-100">
                            <button onclick="window.launchLesson('${l.id}')" class="w-full py-3 bg-gradient-to-r from-teacher to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95">
                                <span class="iconify" data-icon="mdi:rocket-launch"></span>
                                Start New Session
                            </button>
                            <button onclick="window.applyLessonToCurrent('${l.id}')" class="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                Apply to Current Class
                            </button>
                        </div>
                    </div>
                `).join('')}
                ${lessons.length === 0 ? `
                    <div class="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                        <span class="iconify text-5xl text-gray-200 mb-4" data-icon="mdi:book-open-variant"></span>
                        <p class="text-gray-400 font-medium">No lesson presets saved yet.</p>
                        <p class="text-xs text-gray-400 mt-1">Current class settings can be saved as a template.</p>
                    </div>
                ` : ''}
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
            <div class="mb-8">
                <h2 class="text-3xl font-bold text-gray-900">Student Manager</h2>
                <p class="text-gray-500 mt-1">Manage and monitor students in class: <span class="font-mono font-black text-primary">${App.classCode}</span></p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${students.map(s => {
                    const isOnline = now - s.lastSeen < 15000;
                    return `
                        <div class="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all group">
                            <div class="flex items-center justify-between mb-4">
                                <div class="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white">
                                    ${s.avatar || s.name.charAt(0).toUpperCase()}
                                </div>
                                <div class="flex flex-col items-end">
                                    <span class="px-3 py-1 ${isOnline ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'} rounded-full text-[10px] font-black uppercase tracking-wider border">
                                        ${isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                    ${!isOnline ? `<p class="text-[10px] text-gray-400 mt-1 font-bold uppercase">${new Date(s.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>` : ''}
                                </div>
                            </div>
                            <h3 class="font-bold text-gray-900 text-xl mb-1">${s.name}</h3>
                            <p class="text-xs text-gray-400 mb-6 uppercase font-black tracking-widest flex items-center gap-1">
                                <span class="iconify" data-icon="mdi:identifier"></span>
                                ID: ${s.visitorId.split('_').pop()}
                            </p>
                            <div class="flex gap-2">
                                <button onclick="window.viewStudentWork('${s.visitorId}')" class="flex-1 py-3 bg-blue-50 text-primary rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                                    <span class="iconify" data-icon="mdi:television-guide"></span>
                                    Monitor
                                </button>
                                <button onclick="window.kickStudent('${s.visitorId}')" class="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors" title="Kick Student">
                                    <span class="iconify" data-icon="mdi:account-remove"></span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${students.length === 0 ? `
                    <div class="col-span-full py-24 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                        <span class="iconify text-6xl text-gray-200 mb-4" data-icon="mdi:account-group-outline"></span>
                        <h3 class="text-lg font-bold text-gray-400">Classroom is Empty</h3>
                        <p class="text-sm text-gray-400 mt-1">Students will appear here as they join.</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Placeholder for kicking students.
 */
window.kickStudent = (id) => {
    if (confirm('Are you sure you want to remove this student from the session?')) {
        // Implementation would involve marking the student as kicked in the database
        toast('Student removed (Simulated)', 'info');
    }
};


/**
 * Renders Access Control.
 */
export function renderTeacherAccess() {
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
        <div class="max-w-3xl mx-auto">
            <div class="mb-8">
                <h2 class="text-3xl font-bold text-gray-900">Access Control</h2>
                <p class="text-gray-500 mt-1">Control which modules students can access and focus their attention.</p>
            </div>
            
            <div class="bg-white rounded-2xl shadow-sm border p-6 mb-6">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span class="iconify text-primary" data-icon="mdi:eye-outline"></span>
                    Feedback Visibility
                </h3>
                <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-primary/20">
                    <div>
                        <p class="font-bold text-primary">Student Model Feedback</p>
                        <p class="text-xs text-blue-600">When disabled, students cannot see teacher comments or stickers on their models.</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" ${App.teacherSettings.showCommentsToStudents ? 'checked' : ''} 
                            onchange="window.toggleFeedbackVisibility()" class="sr-only peer">
                        <div class="w-14 h-7 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span class="iconify text-primary" data-icon="mdi:map-marker-path"></span>
                    Guided Lesson Mode
                </h3>
                <div class="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="font-bold text-orange-800">Linear Guided Experience</p>
                            <p class="text-xs text-orange-600">Walk students through each practice step-by-step.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" ${App.teacherSettings.guidedMode ? 'checked' : ''} 
                                onchange="window.toggleGuidedMode()" class="sr-only peer">
                            <div class="w-14 h-7 bg-gray-200 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                    </div>
                    
                    ${App.teacherSettings.guidedMode ? `
                        <div class="flex items-center gap-2 bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                            <button onclick="window.guidedMove(-1)" class="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30" ${App.teacherSettings.forceModule === 'questions' ? 'disabled' : ''}>
                                <span class="iconify" data-icon="mdi:chevron-left"></span>
                            </button>
                            <div class="flex-1 text-center">
                                <span class="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">Current Step</span>
                                <span class="font-bold text-gray-800 capitalize">${App.teacherSettings.forceModule || 'Questions'}</span>
                            </div>
                            <button onclick="window.guidedMove(1)" class="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-30" ${App.teacherSettings.forceModule === 'communication' ? 'disabled' : ''}>
                                <span class="iconify" data-icon="mdi:chevron-right"></span>
                            </button>
                        </div>
                        <div class="mt-4">
                            <button onclick="window.openActivityDashboard()" class="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all">
                                <span class="iconify text-xl" data-icon="mdi:presentation"></span>
                                Open Activity Dashboard & Exemplar
                            </button>
                        </div>
                        <div class="mt-3 flex justify-between px-1">
                            ${['questions', 'models', 'investigation', 'analysis', 'math', 'explanations', 'argument', 'communication'].map((m, i) => `
                                <div class="w-2 h-2 rounded-full ${App.teacherSettings.forceModule === m || (!App.teacherSettings.forceModule && m === 'questions') ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-orange-200'}"></div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border p-6">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span class="iconify text-primary" data-icon="mdi:lock-open-variant"></span>
                    Module Access
                </h3>
                <div class="space-y-3">
                    ${modules.map(m => `
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div class="flex-1 flex items-center gap-3">
                                <span class="iconify text-xl ${App.teacherSettings.moduleAccess[m.id] ? 'text-primary' : 'text-gray-400'}" data-icon="${m.icon}"></span>
                                <span class="font-medium text-sm md:text-base">${m.label}</span>
                            </div>
                            <div class="flex items-center gap-4 shrink-0">
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" ${App.teacherSettings.moduleAccess[m.id] ? 'checked' : ''} 
                                        onchange="window.toggleAccess('${m.id}')" class="sr-only peer">
                                    <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                                <button onclick="window.forceAllToModule('${m.id}')" 
                                    class="px-3 py-1 text-[10px] font-bold rounded-lg border-2 min-w-[60px] ${App.teacherSettings.forceModule === m.id ? 'bg-teacher text-white border-teacher' : 'text-teacher border-teacher/20 hover:bg-red-50'}"
                                    title="Force all students to this module">
                                    ${App.teacherSettings.forceModule === m.id ? 'FORCED' : 'FORCE'}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="mt-6 flex gap-4">
                    <button onclick="window.setAllAccess(true)" class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                        Unlock All
                    </button>
                    <button onclick="window.setAllAccess(false)" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                        Lock All
                    </button>
                    <button onclick="window.forceAllToModule(null)" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        Clear Forced Focus
                    </button>
                </div>
            </div>
        </div>
    `;
}

export function renderSessionSettings() {
    return `
        <div class="max-w-2xl mx-auto">
            <div class="mb-8">
                <h2 class="text-3xl font-bold text-gray-900">Session Settings</h2>
                <p class="text-gray-500 mt-1">Configure global class behavior and storage options.</p>
            </div>
            
            <div class="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10 space-y-10">
                <div class="space-y-6">
                    <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Interaction</h4>
                    <div class="grid gap-4">
                        <label class="flex items-center justify-between p-6 bg-gray-50 rounded-3xl cursor-pointer hover:bg-gray-100 transition-all group border-2 border-transparent hover:border-primary/10">
                            <div>
                                <p class="font-bold text-gray-800 text-lg">Show Teacher Responses</p>
                                <p class="text-xs text-gray-500 mt-1">Allow students to see your comments and stickers on their practice boards.</p>
                            </div>
                            <input type="checkbox" ${App.teacherSettings.showTeacherResponses ? 'checked' : ''} onchange="window.toggleTeacherSetting('showTeacherResponses')" class="w-7 h-7 rounded-xl text-primary focus:ring-offset-0 focus:ring-primary transition-all">
                        </label>
                        <label class="flex items-center justify-between p-6 bg-gray-50 rounded-3xl cursor-pointer hover:bg-gray-100 transition-all group border-2 border-transparent hover:border-primary/10">
                            <div>
                                <p class="font-bold text-gray-800 text-lg">Allow Peer Discussions</p>
                                <p class="text-xs text-gray-500 mt-1">Students can reply to each other on the shared Argument board.</p>
                            </div>
                            <input type="checkbox" ${App.teacherSettings.allowStudentReplies ? 'checked' : ''} onchange="window.toggleTeacherSetting('allowStudentReplies')" class="w-7 h-7 rounded-xl text-primary focus:ring-offset-0 focus:ring-primary transition-all">
                        </label>
                    </div>
                </div>

                <div class="border-t border-gray-100 pt-10">
                    <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-6">Data & Infrastructure</h4>
                    <div class="grid gap-6">
                        <div class="p-6 bg-green-50 rounded-3xl border-2 border-green-100 flex items-start gap-5">
                            <div class="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 flex-shrink-0 shadow-inner">
                                <span class="iconify text-3xl" data-icon="mdi:database-check"></span>
                            </div>
                            <div>
                                <p class="text-lg font-bold text-green-800">Local Persistence Active</p>
                                <p class="text-sm text-green-600 mt-1 leading-relaxed">InquiryOS uses **IndexedDB** technology to save your work directly in your browser. No account is needed, and data remains private to this device.</p>
                                <div class="mt-4 flex items-center gap-2">
                                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span class="text-[10px] font-black uppercase text-green-700 tracking-widest">Database Ready</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 flex items-start gap-5">
                            <div class="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0 shadow-inner">
                                <span class="iconify text-3xl" data-icon="mdi:sync"></span>
                            </div>
                            <div>
                                <p class="text-lg font-bold text-blue-800">Real-time Synchronization</p>
                                <p class="text-sm text-blue-600 mt-1 leading-relaxed">State is broadcasted across the local database every 2 seconds, ensuring teachers see student progress as it happens.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="pt-6 flex justify-center">
                    <button onclick="window.leaveSession()" class="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition-all flex items-center gap-2">
                        <span class="iconify text-xl" data-icon="mdi:logout"></span>
                        Leave Session & Reset App
                    </button>
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
    if (App.teacherSettings.guidedMode && !App.teacherSettings.forceModule) {
        App.teacherSettings.forceModule = 'questions';
    }
    await saveToStorage();
    renderTeacherContent();
    toast(App.teacherSettings.guidedMode ? 'Guided Lesson Mode Active' : 'Guided Lesson Mode Disabled', 'info');
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

export const forceAllToModule = async (moduleId) => {
    App.teacherSettings.forceModule = (App.teacherSettings.forceModule === moduleId) ? null : moduleId;
    await saveToStorage(); 
    renderTeacherContent();
};

export const toggleAccess = async (id) => { 
    App.teacherSettings.moduleAccess[id] = !App.teacherSettings.moduleAccess[id]; 
    await saveToStorage(); 
    renderTeacherContent(); 
};

export const toggleTeacherSetting = async (k) => { 
    App.teacherSettings[k] = !App.teacherSettings[k]; 
    await saveToStorage(); 
    renderTeacherContent(); 
};


/**
 * Toggles visibility of teacher comments/feedback for students.
 */
export async function toggleFeedbackVisibility() {
    App.teacherSettings.showCommentsToStudents = !App.teacherSettings.showCommentsToStudents;
    await saveToStorage();
    renderTeacherContent();
    toast(App.teacherSettings.showCommentsToStudents ? 'Feedback is now visible to students' : 'Feedback is now hidden from students', 'info');
}

/**
 * Bulk updates module access.
 * @param {boolean} status 
 */
export async function setAllAccess(status) {
    Object.keys(App.teacherSettings.moduleAccess).forEach(k => {
        App.teacherSettings.moduleAccess[k] = status;
    });
    await saveToStorage();
    renderTeacherContent();
    toast(status ? 'All modules unlocked' : 'All modules locked', 'info');
}

/**
 * Forces all students to the current teacher view's context.
 */
export async function forceAllToCurrent() {
    let target = null;
    if (App.teacherModule === 'livemodels') target = 'models';
    else if (App.teacherModule === 'livedata') target = 'analysis';
    else if (App.teacherModule === 'noticeboard') target = 'questions';
    
    if (target) {
        await forceAllToModule(target);
    } else {
        toast('Select a specific student module view first (Models, Data, or Noticeboard)', 'warning');
    }
}

/**
 * Opens the Activity Dashboard (Exemplar & Monitoring).
 */
export async function openActivityDashboard() {
    App.isExemplarMode = true;
    App.viewerState.isMonitoring = false;
    App.viewingStudentId = null;
    App.currentModule = App.teacherSettings.forceModule || 'questions';
    
    if (!App.teacherSettings.exemplars[App.currentModule]) {
        App.teacherSettings.exemplars[App.currentModule] = getInitialWorkState();
    }
    
    App.work = App.teacherSettings.exemplars[App.currentModule];
    updateModeUI();
    toast('Switched to Exemplar & Monitoring view', 'info');
}

