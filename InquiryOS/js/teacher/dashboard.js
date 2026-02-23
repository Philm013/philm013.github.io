/**
 * @file dashboard.js
 * @description Core logic for the Teacher Dashboard in InquiryOS. 
 */

import { App, getInitialWorkState } from '../core/state.js';
import { dbGetAll, dbPut, dbDelete, dbGet, dbGetByIndex, STORE_LESSONS, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveToStorage, registerUser, loadFromStorage, saveAndBroadcast } from '../core/sync.js';
import { renderTeacherContent, updateModeUI, renderStudentContent, renderEmptyState } from '../ui/renderer.js';
import { renderNavigation } from '../ui/navigation.js';
import { toast, generateCode, calculateStudentProgress } from '../ui/utils.js';
import { getNGSSTemplates } from '../core/ngss.js';

function renderStatTile(label, count, icon, color) {
    return `
        <div class="bg-white rounded-3xl shadow-sm p-6 border border-gray-50 flex items-center gap-4">
            <div class="w-14 h-14 bg-${color}-50 rounded-2xl flex items-center justify-center text-${color}-600 shadow-sm border border-${color}-100">
                <span class="iconify text-3xl" data-icon="${icon}"></span>
            </div>
            <div>
                <p class="text-2xl font-black text-gray-900">${count}</p>
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${label}</p>
            </div>
        </div>
    `;
}

/**
 * Resets all class focus, access controls, and guided mode to default state.
 */
export async function resetClassSession() {
    if (confirm('Reset all focus, access controls, and active presentations for the whole class?')) {
        App.teacherSettings.forceModule = null;
        App.teacherSettings.guidedMode = false;
        App.teacherSettings.showFeedbackToStudents = true;
        
        // Reset module access to all open
        Object.keys(App.teacherSettings.moduleAccess).forEach(k => {
            App.teacherSettings.moduleAccess[k] = true;
        });
        
        // Clear presentations
        App.sharedData.currentPresentation = null;
        
        await saveToStorage();
        await saveAndBroadcast('debatePosts', App.sharedData.debatePosts); // Triggers full broadcast
        
        renderTeacherContent();
        toast('Class session reset to defaults', 'success');
    }
}

/**
 * Stops the current class presentation.
 */
export async function stopPresentation() {
    App.sharedData.currentPresentation = null;
    await saveToStorage();
    renderTeacherContent();
    toast('Presentation stopped', 'info');
}

/**
 * Renders the primary teacher dashboard overview.
 */
export async function renderTeacherOverview() {
    const phenomenon = App.teacherSettings?.phenomenon || { title: '', description: '', tags: [], ngssStandards: [] };
    const stats = App.classStats || { notices: 0, wonders: 0, nodes: 0, posts: 0 };

    return `
        <div class="max-w-5xl mx-auto space-y-6">
            <div class="bg-white rounded-[2.5rem] shadow-sm border p-8 md:p-10 relative overflow-hidden group" data-card-title="Phenomenon">
                <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
                
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative">
                    <div class="flex items-center gap-5">
                        <div class="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                            <span class="iconify text-3xl" data-icon="mdi:flask-outline"></span>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-gray-900">Class Phenomenon</h3>
                            <p class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Driving Inquiry Focus</p>
                        </div>
                    </div>
                    <button onclick="window.showTeacherModule('ngss')" class="px-6 py-2.5 bg-gray-50 text-primary rounded-xl text-sm font-black hover:bg-primary hover:text-white transition-all border border-primary/10">
                        Browse Standards
                    </button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                    <div class="lg:col-span-2 space-y-6">
                        <div class="relative">
                            <input type="text" id="phenomTitle" value="${phenomenon.title || ''}" onchange="window.updatePhenomenon()"
                                placeholder="Enter Phenomenon Title..."
                                class="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xl font-bold focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-300">
                        </div>
                        <div class="relative">
                            <textarea id="phenomDesc" rows="3" onchange="window.updatePhenomenon()"
                                placeholder="Describe the phenomenon or observation that drives this lesson..."
                                class="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-medium focus:border-primary focus:bg-white focus:outline-none transition-all resize-none placeholder:text-gray-300">${phenomenon.description || ''}</textarea>
                        </div>

                        <!-- Phenomenon Media Gallery -->
                        <div class="space-y-4 pt-4 border-t border-gray-100">
                            <div class="flex items-center justify-between">
                                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Media Assets</h4>
                                <button onclick="window.openMediaPicker()" class="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">+ Add Media</button>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                                ${(phenomenon.media || []).map(m => `
                                    <div class="group relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                        <img src="${m.thumb}" class="w-full h-full object-cover">
                                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onclick="window.removeMediaFromPhenomenon('${m.id}')" class="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                                <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                                            </button>
                                        </div>
                                        <div class="absolute bottom-1 left-1 px-1.5 py-0.5 bg-white/90 rounded text-[8px] font-black uppercase tracking-tighter">
                                            ${m.type}
                                        </div>
                                    </div>
                                `).join('')}
                                ${(phenomenon.media || []).length === 0 ? `
                                    <div onclick="window.openMediaPicker()" class="aspect-square rounded-xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 hover:text-primary hover:border-primary transition-all cursor-pointer">
                                        <span class="iconify text-2xl mb-1" data-icon="mdi:image-plus"></span>
                                        <span class="text-[8px] font-black uppercase">Add Media</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col">
                        <div class="flex items-center justify-between mb-4">
                            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Standards</p>
                            <span class="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest">${phenomenon.ngssStandards?.length || 0} PE</span>
                        </div>
                        <div class="space-y-2 flex-1 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
                            ${phenomenon.ngssStandards?.length > 0 ? phenomenon.ngssStandards.map(peId => `
                                <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 group/item shadow-sm">
                                    <span class="text-xs font-black text-gray-700 font-mono tracking-tighter">${peId}</span>
                                    <button onclick="window.removeFromPhenomenon('${peId}')" class="text-gray-300 hover:text-red-500 transition-colors">
                                        <span class="iconify" data-icon="mdi:close-circle"></span>
                                    </button>
                                </div>
                            `).join('') : `
                                <div class="h-full flex flex-col items-center justify-center opacity-30 py-4">
                                    <span class="iconify text-3xl mb-2" data-icon="mdi:link-variant-off"></span>
                                    <p class="text-[10px] font-black uppercase">No Standards Linked</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid md:grid-cols-4 gap-4" data-card-title="Class Stats">
                ${renderStatTile('Total Notices', stats.notices, 'mdi:eye', 'blue')}
                ${renderStatTile('Total Wonders', stats.wonders, 'mdi:lightbulb', 'yellow')}
                ${renderStatTile('Class Concepts', stats.nodes, 'mdi:cube-outline', 'green')}
                ${renderStatTile('Forum Posts', stats.posts, 'mdi:forum', 'purple')}
            </div>

            <div class="bg-white rounded-[2.5rem] shadow-sm border p-8 md:p-10" data-card-title="Access Management">
                <div class="flex items-center gap-5 mb-8">
                    <div class="w-14 h-14 bg-secondary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
                        <span class="iconify text-3xl" data-icon="mdi:account-plus"></span>
                    </div>
                    <div>
                        <h3 class="text-2xl font-black text-gray-900">Student Entry</h3>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Classroom Access Management</p>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-8 items-center">
                    <div class="space-y-4">
                        <div class="bg-gray-50 p-6 rounded-[2rem] border-2 border-gray-100 shadow-inner">
                            <p class="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-3">Join Link</p>
                            <div class="flex gap-2">
                                <input type="text" readonly id="joinLinkInput" 
                                    value="${window.location.origin}${window.location.pathname}?class=${App.classCode}"
                                    class="flex-1 bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono focus:border-primary outline-none transition-all">
                                <button onclick="window.copyJoinLink()" class="w-12 h-12 bg-primary text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 flex items-center justify-center" title="Copy Link">
                                    <span class="iconify text-xl" data-icon="mdi:content-copy"></span>
                                </button>
                            </div>
                        </div>
                        <button onclick="window.showJoinQR()" class="w-full py-5 bg-gradient-to-r from-primary to-secondary text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
                            <span class="iconify text-2xl" data-icon="mdi:qrcode"></span>
                            Display Join QR Code
                        </button>
                    </div>

                    <div class="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[2.5rem] p-8 bg-gray-50/30">
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Class Session Code</div>
                        <div class="text-6xl font-black text-primary tracking-tighter mb-2">${App.classCode}</div>
                        <div class="flex items-center gap-2 text-green-500 font-bold text-xs uppercase tracking-widest">
                            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Active Session
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
                    <div class="col-span-full">
                        ${renderEmptyState('Classroom is Empty', 'Students will appear here in real-time as they join the class session with your code.', 'mdi:account-search-outline', true)}
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
    const templates = getNGSSTemplates();
    
    return `
        <div class="max-w-6xl mx-auto space-y-12">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tighter">Lesson Designer</h2>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Activity Presets & NGSS Blueprints</p>
                </div>
                <button onclick="window.saveCurrentAsLesson()" class="px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-3">
                    <span class="iconify text-xl" data-icon="mdi:plus-circle"></span>
                    Save Current Class as Preset
                </button>
            </div>

            <section data-card-title="NGSS Blueprints">
                <div class="flex items-center gap-3 mb-6">
                    <span class="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                        <span class="iconify" data-icon="mdi:school"></span>
                    </span>
                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight">NGSS Domain Blueprints</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${templates.map(t => `
                        <div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col hover:shadow-xl transition-all group relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-32 h-32 bg-${t.color}-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                            <div class="mb-6 flex items-center justify-between">
                                <div class="w-14 h-14 bg-${t.color}-50 text-${t.color}-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <span class="iconify text-3xl" data-icon="${t.icon}"></span>
                                </div>
                                <span class="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[9px] font-black uppercase tracking-widest">${t.domain}</span>
                            </div>
                            <h4 class="text-xl font-black text-gray-900 mb-3">${t.name}</h4>
                            <p class="text-xs text-gray-500 leading-relaxed mb-8 flex-1 italic line-clamp-2">"${t.settings.phenomenon.description}"</p>
                            <div class="grid grid-cols-1 gap-2">
                                <button onclick="window.previewTemplate('${t.id}')" class="w-full py-3 bg-blue-50 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 mb-2">
                                    Preview Blueprint
                                </button>
                                <div class="grid grid-cols-2 gap-3">
                                    <button onclick="window.launchTemplate('${t.id}')" class="py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-lg shadow-gray-200">
                                        Launch New
                                    </button>
                                    <button onclick="window.applyTemplate('${t.id}')" class="py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary">
                                        Apply Here
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <section data-card-title="My Presets">
                <div class="flex items-center gap-3 mb-6">
                    <span class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <span class="iconify" data-icon="mdi:folder-heart"></span>
                    </span>
                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-tight">My Saved Presets</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${lessons.map(l => `
                        <div class="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col hover:shadow-xl transition-all group">
                            <div class="flex justify-between items-start mb-6">
                                <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-primary shadow-inner">
                                    <span class="iconify text-2xl" data-icon="mdi:lightbulb-variant"></span>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="window.previewPreset('${l.id}')" class="text-gray-400 hover:text-primary p-2 transition-colors">
                                        <span class="iconify text-xl" data-icon="mdi:eye-outline"></span>
                                    </button>
                                    <button onclick="window.deleteLesson('${l.id}')" class="text-gray-300 hover:text-red-500 p-2 transition-colors">
                                        <span class="iconify text-xl" data-icon="mdi:delete-outline"></span>
                                    </button>
                                </div>
                            </div>
                            <h3 class="text-xl font-black text-gray-900 mb-2">${l.name}</h3>
                            <p class="text-[11px] text-gray-500 mb-8 line-clamp-3 leading-relaxed flex-1 italic">"${l.settings.phenomenon.description}"</p>
                            <div class="space-y-3">
                                <button onclick="window.launchLesson('${l.id}')" class="w-full py-4 bg-gradient-to-r from-teacher to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-100 flex items-center justify-center gap-2 hover:opacity-95">
                                    <span class="iconify text-lg" data-icon="mdi:rocket-launch"></span>
                                    Launch Session
                                </button>
                                <button onclick="window.applyLessonToCurrent('${l.id}')" class="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100">
                                    Apply Settings
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    ${lessons.length === 0 ? `
                        <div class="col-span-full py-20 text-center bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                            <span class="iconify text-5xl text-gray-200 mb-4" data-icon="mdi:book-open-variant"></span>
                            <p class="text-sm font-black text-gray-400 uppercase tracking-widest">No custom presets saved</p>
                            <p class="text-[10px] text-gray-400 mt-1 font-bold uppercase">Save your current class setup to reuse it later.</p>
                        </div>
                    ` : ''}
                </div>
            </section>Section Template Added.
        </div>
    `;
}

export async function launchTemplate(templateId) {
    if (confirm('Launch a new class session with this template?')) {
        const templates = getNGSSTemplates();
        const t = templates.find(x => x.id === templateId);
        if (!t) return;
        App.classCode = generateCode();
        App.teacherSettings = JSON.parse(JSON.stringify(t.settings));
        App.work = getInitialWorkState();
        App.sharedData = { debatePosts: [] };
        await saveToStorage(); await registerUser(); updateModeUI(); toast('Template Launched!', 'success');
    }
}

export async function previewTemplate(templateId) {
    const templates = getNGSSTemplates();
    const t = templates.find(x => x.id === templateId);
    if (!t) return;
    renderPreviewModal(t.name, t.icon, t.color, t.settings, () => launchTemplate(t.id), () => applyTemplate(t.id));
}

export async function previewPreset(lessonId) {
    const l = await dbGet(STORE_LESSONS, lessonId);
    if (!l) return;
    renderPreviewModal(l.name, 'mdi:lightbulb-variant', 'blue', l.settings, () => launchLesson(l.id), () => applyLessonToCurrent(l.id));
}

function renderPreviewModal(name, icon, color, settings, onLaunch, onApply) {
    const modal = document.getElementById('lessonPreviewModal');
    if (!modal) return;

    const iconEl = document.getElementById('previewIcon');
    const titleEl = document.getElementById('previewTitle');
    const contentEl = document.getElementById('previewContent');
    const actionsEl = document.getElementById('previewActions');

    iconEl.className = `w-14 h-14 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center text-3xl shadow-sm border border-white`;
    iconEl.innerHTML = `<span class="iconify" data-icon="${icon}"></span>`;
    titleEl.textContent = name;

    const p = settings.phenomenon || {};
    const modules = settings.moduleAccess || {};

    contentEl.innerHTML = `
        <div class="space-y-6">
            <div class="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Phenomenon Overview</label>
                <h4 class="text-lg font-black text-gray-900 mb-2">${p.title || 'Untitled'}</h4>
                <p class="text-sm text-gray-600 leading-relaxed italic">"${p.description || 'No description provided.'}"</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                    <label class="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3">Linked Standards</label>
                    <div class="flex flex-wrap gap-2">
                        ${p.ngssStandards?.map(s => `<span class="px-2 py-1 bg-white text-blue-600 rounded-lg text-[9px] font-black border border-blue-100">${s}</span>`).join('') || '<span class="text-xs text-gray-400">None</span>'}
                    </div>
                </div>
                <div class="p-6 bg-purple-50/50 rounded-3xl border border-purple-100">
                    <label class="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-3">Module Permissions</label>
                    <div class="grid grid-cols-2 gap-y-1">
                        ${Object.keys(modules).map(m => `
                            <div class="flex items-center gap-2 text-[10px] font-bold ${modules[m] ? 'text-purple-700' : 'text-gray-300'}">
                                <span class="iconify" data-icon="${modules[m] ? 'mdi:check-circle' : 'mdi:minus-circle-outline'}"></span>
                                <span class="capitalize">${m}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    actionsEl.innerHTML = `
        <button onclick="window.closeLessonPreview()" class="px-6 py-3 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
        <button id="previewLaunchBtn" class="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all">Launch New Session</button>
        <button id="previewApplyBtn" class="px-8 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:opacity-90 transition-all">Apply to Current</button>
    `;

    document.getElementById('previewLaunchBtn').onclick = () => { window.closeLessonPreview(); onLaunch(); };
    document.getElementById('previewApplyBtn').onclick = () => { window.closeLessonPreview(); onApply(); };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function closeLessonPreview() {
    const modal = document.getElementById('lessonPreviewModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

export async function applyTemplate(templateId) {
    if (confirm('Apply this template to your current class?')) {
        const templates = getNGSSTemplates();
        const t = templates.find(x => x.id === templateId);
        if (t) {
            App.teacherSettings = JSON.parse(JSON.stringify(t.settings));
            await saveToStorage(); updateModeUI(); toast('Template Applied!', 'success');
        }
    }
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
                    <div class="col-span-full">
                        ${renderEmptyState('Classroom is Empty', 'Students will appear here as they join the active session.', 'mdi:account-group-outline', true)}
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
export async function renderTeacherAccess() {
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
    
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    const studentWorks = [];
    for (const s of students) {
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + s.visitorId);
        if (saved) studentWorks.push(saved.work);
    }

    return `
        <div class="max-w-5xl mx-auto space-y-6">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tighter">Access Control</h2>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Classroom Focus & Governance</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Guided Mode and Feedback -->
                <div class="space-y-6">
                    <div class="bg-white rounded-[2.5rem] shadow-sm border p-8">
                        <h3 class="font-black text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
                            <span class="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                                <span class="iconify" data-icon="mdi:map-marker-path"></span>
                            </span>
                            Guided Experience
                        </h3>
                        <div class="p-6 bg-orange-50 rounded-3xl border-2 border-orange-100">
                            <div class="flex items-center justify-between mb-6">
                                <div>
                                    <p class="font-bold text-orange-800">Linear Lesson Flow</p>
                                    <p class="text-[10px] text-orange-600 uppercase font-black tracking-widest">Walk students through step-by-step</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" ${App.teacherSettings.guidedMode ? 'checked' : ''} 
                                        onchange="window.toggleGuidedMode()" class="sr-only peer">
                                    <div class="w-14 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                            </div>
                            
                            ${App.teacherSettings.guidedMode ? `
                                <div class="flex items-center gap-4 bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
                                    <button onclick="window.guidedMove(-1)" class="w-10 h-10 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center" ${App.teacherSettings.forceModule === 'questions' ? 'disabled' : ''}>
                                        <span class="iconify text-xl" data-icon="mdi:chevron-left"></span>
                                    </button>
                                    <div class="flex-1 text-center">
                                        <span class="text-[9px] font-black text-orange-400 uppercase tracking-[0.2em] block mb-1">Current Focus</span>
                                        <span class="font-black text-gray-900 text-lg uppercase tracking-tight">${App.teacherSettings.forceModule || 'Questions'}</span>
                                    </div>
                                    <button onclick="window.guidedMove(1)" class="w-10 h-10 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-30 flex items-center justify-center" ${App.teacherSettings.forceModule === 'communication' ? 'disabled' : ''}>
                                        <span class="iconify text-xl" data-icon="mdi:chevron-right"></span>
                                    </button>
                                </div>
                                <div class="mt-4">
                                    <button onclick="window.openActivityDashboard()" class="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all">
                                        <span class="iconify text-lg" data-icon="mdi:presentation"></span>
                                        Open Command Dashboard
                                    </button>
                                </div>
                            ` : `
                                <p class="text-[11px] text-orange-400 font-bold leading-relaxed">Students can currently navigate freely within unlocked modules. Enable Guided Mode to lock them into specific Science Practices.</p>
                            `}
                        </div>
                    </div>

                    <div class="bg-white rounded-[2.5rem] shadow-sm border p-8">
                        <h3 class="font-black text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
                            <span class="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                <span class="iconify text-xl" data-icon="mdi:comment-check"></span>
                            </span>
                            Feedback Visibility
                        </h3>
                        <div class="flex items-center justify-between p-6 bg-blue-50 rounded-3xl border-2 border-blue-100">
                            <div>
                                <p class="font-bold text-blue-800">Student Feedback Loop</p>
                                <p class="text-[10px] text-blue-600 uppercase font-black tracking-widest">Allow students to see your grading/comments</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${App.teacherSettings.showFeedbackToStudents ? 'checked' : ''} 
                                    onchange="window.toggleFeedbackVisibility()" class="sr-only peer">
                                <div class="w-14 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Module Access Control -->
                <div class="bg-white rounded-[2.5rem] shadow-sm border p-8">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-black text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                            <span class="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                                <span class="iconify text-xl" data-icon="mdi:lock-open-variant"></span>
                            </span>
                            Module Permissions
                        </h3>
                        <div class="flex gap-2">
                            <button onclick="window.setAllAccess(true)" class="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-100" title="Unlock All">
                                <span class="iconify" data-icon="mdi:lock-open"></span>
                            </button>
                            <button onclick="window.setAllAccess(false)" class="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100" title="Lock All">
                                <span class="iconify" data-icon="mdi:lock"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        ${modules.map(m => {
                            const isLocked = !App.teacherSettings.moduleAccess[m.id];
                            // Simple activity heuristic
                            const activeCount = studentWorks.filter(w => {
                                if (m.id === 'questions') return w.notices?.length > 0 || w.wonders?.length > 0;
                                if (m.id === 'models') return w.modelNodes?.length > 0;
                                if (m.id === 'analysis') return w.dataTable?.rows?.some(r => Object.values(r).some(v => v));
                                return false;
                            }).length;

                            return `
                                <div class="flex flex-col p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center ${!isLocked ? 'text-primary shadow-sm border border-blue-50' : 'text-gray-300'}">
                                                <span class="iconify text-xl" data-icon="${m.icon}"></span>
                                            </div>
                                            <div>
                                                <p class="font-bold text-gray-800 text-sm">${m.label}</p>
                                                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${activeCount} Students Active</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <button onclick="window.forceAllToModule('${m.id}')" 
                                                class="px-3 py-1 text-[9px] font-black rounded-lg border-2 uppercase tracking-tighter transition-all ${App.teacherSettings.forceModule === m.id ? 'bg-teacher text-white border-teacher shadow-lg shadow-red-100' : 'text-teacher border-red-100 hover:bg-red-50'}">
                                                ${App.teacherSettings.forceModule === m.id ? 'Forced' : 'Focus'}
                                            </button>
                                            <label class="relative inline-flex items-center cursor-pointer scale-90">
                                                <input type="checkbox" ${!isLocked ? 'checked' : ''} 
                                                    onchange="window.toggleAccess('${m.id}')" class="sr-only peer">
                                                <div class="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>
                                    ${App.teacherSettings.exemplars?.[m.id] ? `
                                        <div class="mt-2 flex items-center gap-2 px-2 py-1 bg-purple-50 rounded-lg border border-purple-100">
                                            <span class="iconify text-[10px] text-purple-500" data-icon="mdi:lightbulb-on"></span>
                                            <span class="text-[9px] font-bold text-purple-600 uppercase">Exemplar Ready</span>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <button onclick="window.forceAllToModule(null)" class="w-full mt-6 py-3 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-200 transition-all">
                        Release Forced Module
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
                                <p class="font-bold text-gray-800 text-lg">Show Feedback & Grades</p>
                                <p class="text-xs text-gray-500 mt-1">Allow students to see your comments and stickers on their practice boards.</p>
                            </div>
                            <input type="checkbox" ${App.teacherSettings.showFeedbackToStudents ? 'checked' : ''} onchange="window.toggleFeedbackVisibility()" class="w-7 h-7 rounded-xl text-primary focus:ring-offset-0 focus:ring-primary transition-all">
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
            <div class="bg-gray-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl z-50">
                <div class="flex items-center gap-6">
                    <button onclick="window.exitActivityDashboard()" class="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                        <span class="iconify text-2xl" data-icon="mdi:arrow-left"></span>
                    </button>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="font-black text-2xl uppercase tracking-tighter">${App.currentModule}</h2>
                            <span class="px-2 py-0.5 bg-orange-500 text-white rounded text-[10px] font-black uppercase tracking-widest">Guided</span>
                        </div>
                        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Practice Command Center</p>
                    </div>
                </div>
                <div class="flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    <button onclick="window.toggleDashboardMode(false)" class="px-6 py-3 rounded-xl text-sm font-black transition-all ${!isMonitoring ? 'bg-white text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-white'}">
                        <span class="iconify inline mr-2" data-icon="mdi:pencil-box"></span>
                        Edit Exemplar
                    </button>
                    <button onclick="window.toggleDashboardMode(true)" class="px-6 py-3 rounded-xl text-sm font-black transition-all ${isMonitoring ? 'bg-white text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-white'}">
                        <span class="iconify inline mr-2" data-icon="mdi:monitor-dashboard"></span>
                        Monitor Class
                    </button>
                </div>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50 p-8 custom-scrollbar">
                <div class="max-w-7xl mx-auto h-full">
                    ${isMonitoring ? await renderMonitorView() : `
                        <div class="bg-white rounded-[40px] shadow-sm border border-gray-100 min-h-full flex flex-col overflow-hidden">
                            <div class="p-8 border-b border-gray-50 bg-orange-50/30 flex items-center justify-between">
                                <div>
                                    <h3 class="text-xl font-black text-gray-900">Class Exemplar Editor</h3>
                                    <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Creating reference work for students</p>
                                </div>
                                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                    Live to Class
                                </div>
                            </div>
                            <div class="flex-1 p-8">
                                ${window.renderStudentContentHtml()}
                            </div>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}


async function renderMonitorView() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    const now = Date.now();

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${await Promise.all(students.map(async s => {
                const isOnline = now - s.lastSeen < 15000;
                const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + s.visitorId);
                const progress = saved ? calculateStudentProgress(saved.work) : 0;
                
                return `
                    <div class="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group">
                        <div class="flex items-center justify-between mb-6">
                            <div class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white group-hover:scale-110 transition-transform">
                                ${s.avatar || s.name.charAt(0).toUpperCase()}
                            </div>
                            <span class="w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}"></span>
                        </div>
                        <h4 class="font-black text-gray-900 text-lg mb-1">${s.name}</h4>
                        <div class="flex items-center gap-2 mb-6">
                            <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div class="h-full bg-primary" style="width:${progress}%"></div>
                            </div>
                            <span class="text-[10px] font-black text-primary">${progress}%</span>
                        </div>
                        <button onclick="window.viewStudentWork('${s.visitorId}')" 
                            class="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                            View Work Board
                        </button>
                    </div>
                `;
            })).then(r => r.join(''))}
            ${students.length === 0 ? `
                <div class="col-span-full">
                    ${renderEmptyState('No students to monitor', 'Ask students to join the session to see their progress here.', 'mdi:monitor-dashboard', true)}
                </div>
            ` : ''}
        </div>
    `;
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
    window.openGenericInput('Save Preset', 'Enter template name...', App.teacherSettings.phenomenon.title, async (name) => {
        if (!name) return;
        const lesson = { id: 'l_' + Date.now(), name, settings: JSON.parse(JSON.stringify(App.teacherSettings)), timestamp: Date.now() };
        await dbPut(STORE_LESSONS, lesson); 
        toast('Preset Saved!', 'success'); 
        renderTeacherContent();
    });
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
    if (App.teacherSettings.guidedMode) {
        if (!App.teacherSettings.forceModule) {
            App.teacherSettings.forceModule = 'questions';
        }
    } else {
        App.teacherSettings.forceModule = null;
    }
    await saveToStorage();
    renderTeacherContent();
    toast(App.teacherSettings.guidedMode ? 'Guided Lesson Mode Active' : 'Guided Lesson Mode Disabled', 'info');
}

export async function guidedMove(dir) {
    const modules = ['questions', 'models', 'investigation', 'analysis', 'math', 'explanations', 'argument', 'communication'];
    let idx = modules.indexOf(App.teacherSettings.forceModule || 'questions');
    let next = Math.max(0, Math.min(modules.length - 1, idx + dir));
    
    const targetModule = modules[next];
    if (App.teacherSettings.forceModule === targetModule) return;

    if (App.isExemplarMode && !App.viewerState.isMonitoring) {
        App.teacherSettings.exemplars[App.currentModule] = JSON.parse(JSON.stringify(App.work));
    }
    
    App.teacherSettings.forceModule = App.currentModule = targetModule;
    
    if (App.isExemplarMode) {
        if (!App.viewerState.isMonitoring) {
            if (!App.teacherSettings.exemplars[App.currentModule]) {
                App.teacherSettings.exemplars[App.currentModule] = getInitialWorkState();
            }
            App.work = App.teacherSettings.exemplars[App.currentModule];
        } else {
            await loadFromStorage();
        }
    }
    
    await saveToStorage();
    renderNavigation();
    renderTeacherContent();
    toast(`Guided Class moved to ${targetModule.toUpperCase()}`, 'info');
}

export const forceAllToModule = async (moduleId) => {
    App.teacherSettings.forceModule = (App.teacherSettings.forceModule === moduleId) ? null : moduleId;
    await saveToStorage(); 
    renderTeacherContent();
};

export const toggleAccess = async (id) => { 
    App.teacherSettings.moduleAccess[id] = !App.teacherSettings.moduleAccess[id];
    await saveToStorage(); renderTeacherContent();
};

export async function renderSessionSettings() {
    return `
        <div class="max-w-4xl mx-auto space-y-12">
            <div>
                <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tighter">Session Settings</h2>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Platform Configuration & API Keys</p>
            </div>

            <section class="bg-white rounded-[2.5rem] shadow-sm border p-10" data-card-title="API Configurations">
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <span class="iconify text-2xl" data-icon="mdi:api"></span>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-gray-900">Third-Party Services</h3>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enrich your phenomenon with live media</p>
                    </div>
                </div>

                <div class="space-y-8">
                    <div class="grid md:grid-cols-2 gap-8">
                        <div class="space-y-4">
                            <label class="block">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unsplash API Key (Images)</span>
                                <div class="mt-2 flex gap-2">
                                    <input type="password" id="unsplashKey" value="${App.teacherSettings.keys?.unsplash || ''}" 
                                        class="flex-1 px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary focus:outline-none transition-all font-mono text-sm">
                                    <button onclick="window.saveApiKey('unsplash')" class="px-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-all">Save</button>
                                </div>
                            </label>
                            <p class="text-[10px] text-gray-400 leading-relaxed italic">Get a free key at <a href="https://unsplash.com/developers" target="_blank" class="text-primary underline">unsplash.com/developers</a></p>
                        </div>

                        <div class="space-y-4">
                            <label class="block">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pexels API Key (Videos)</span>
                                <div class="mt-2 flex gap-2">
                                    <input type="password" id="pexelsKey" value="${App.teacherSettings.keys?.pexels || ''}" 
                                        class="flex-1 px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary focus:outline-none transition-all font-mono text-sm">
                                    <button onclick="window.saveApiKey('pexels')" class="px-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-all">Save</button>
                                </div>
                            </label>
                            <p class="text-[10px] text-gray-400 leading-relaxed italic">Get a free key at <a href="https://www.pexels.com/api/" target="_blank" class="text-primary underline">pexels.com/api</a></p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="bg-white rounded-[2.5rem] shadow-sm border p-10" data-card-title="Preferences">
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                        <span class="iconify text-2xl" data-icon="mdi:cog"></span>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-gray-900">Classroom Preferences</h3>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global toggle controls</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${[
                        { id: 'anonymousMode', label: 'Anonymous Collaboration', desc: 'Hide student names on the board' },
                        { id: 'allowStudentReplies', label: 'Student Replies', desc: 'Allow students to comment on posts' },
                        { id: 'showAllIcons', label: 'Full Icon Library', desc: 'Allow access to all 200k+ icons' },
                        { id: 'defaultCategoriesEnabled', label: 'Standard SEP Categories', desc: 'Show Notice, Wonder, Ideas categories' }
                    ].map(pref => `
                        <div class="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <div>
                                <p class="text-sm font-black text-gray-800">${pref.label}</p>
                                <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">${pref.desc}</p>
                            </div>
                            <div class="relative inline-block w-12 h-7 transition duration-200 ease-in-out bg-gray-200 rounded-full">
                                <input type="checkbox" onchange="window.toggleTeacherSetting('${pref.id}')" 
                                    ${App.teacherSettings[pref.id] ? 'checked' : ''}
                                    class="absolute w-7 h-7 transition duration-200 ease-in-out bg-white border-2 border-gray-200 rounded-full appearance-none cursor-pointer checked:translate-x-5 checked:bg-primary checked:border-primary">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        </div>
    `;
}

export async function saveApiKey(provider) {
    const input = document.getElementById(`${provider}Key`);
    if (!input) return;
    if (!App.teacherSettings.keys) App.teacherSettings.keys = {};
    App.teacherSettings.keys[provider] = input.value.trim();
    await saveToStorage();
    toast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} Key Saved`, 'success');
}


export const toggleTeacherSetting = async (k) => { 
    App.teacherSettings[k] = !App.teacherSettings[k]; 
    await saveToStorage(); 
    renderTeacherContent(); 
};


/**
 * Toggles visibility of teacher comments/feedback for students.
 */
export async function toggleFeedbackVisibility() {
    App.teacherSettings.showFeedbackToStudents = !App.teacherSettings.showFeedbackToStudents;
    await saveToStorage();
    renderTeacherContent();
    toast(App.teacherSettings.showFeedbackToStudents ? 'Feedback is now visible to students' : 'Feedback is now hidden from students', 'info');
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

