/**
 * @file dashboard.js
 * @description Core logic for the Teacher Dashboard in InquiryOS. 
 */

import { App, getInitialWorkState } from '../core/state.js';
import { dbGetAll, dbPut, dbDelete, dbGet, dbGetByIndex, dbGetByPrefix, STORE_LESSONS, STORE_USERS, STORE_SESSIONS } from '../core/storage.js';
import { saveToStorage, registerUser, saveAndBroadcast } from '../core/sync.js';
import { renderTeacherContent, updateModeUI, renderEmptyState } from '../ui/renderer.js';
import { toast, generateCode, calculateStudentProgress, deepClone, renderInfoTip } from '../ui/utils.js';
import { getNGSSTemplates } from '../core/ngss.js';
import { SEPTipsLibrary, CCCTipsLibrary } from '../core/tips_library.js';

export async function removeFromPhenomenon(peId) {
    if (App.teacherSettings.phenomenon.ngssStandards) {
        App.teacherSettings.phenomenon.ngssStandards = App.teacherSettings.phenomenon.ngssStandards.filter(id => id !== peId);
        await saveToStorage();
        renderTeacherContent();
        toast(`Removed ${peId}`, 'info');
    }
}

export async function resetClassSession() {
    if (confirm('Reset all focus, access controls, and active presentations for the whole class?')) {
        App.teacherSettings.forceModule = null;
        App.teacherSettings.guidedMode = false;
        App.teacherSettings.showFeedbackToStudents = true;
        Object.keys(App.teacherSettings.moduleAccess).forEach(k => { App.teacherSettings.moduleAccess[k] = true; });
        App.sharedData.currentPresentation = null;
        await saveToStorage();
        await saveAndBroadcast('debatePosts', App.sharedData.debatePosts || []);
        renderTeacherContent();
        toast('Class session reset to defaults', 'success');
    }
}

export async function stopPresentation() {
    App.sharedData.currentPresentation = null;
    await saveToStorage();
    renderTeacherContent();
    toast('Presentation stopped', 'info');
}

export async function renderTeacherOverview() {
    const phenomenon = App.teacherSettings?.phenomenon || { title: '', description: '', tags: [], ngssStandards: [] };
    const stats = App.classStats || { notices: 0, wonders: 0, nodes: 0, posts: 0 };
    
    // Fetch active student count for more informative stats
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const activeStudents = allUsers.filter(u => u.mode === 'student' && (Date.now() - u.lastSeen < 30000));

    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 p-4 hidden md:block">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Classroom Command</h2>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time lesson control</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="px-4 py-2 bg-green-50 text-green-600 rounded-xl border border-green-100 flex items-center gap-3">
                            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span class="text-[10px] font-black uppercase tracking-widest">${activeStudents.length} Students Online</span>
                        </div>
                        <div class="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center gap-2">
                            <span class="iconify" data-icon="mdi:sync"></span>
                            <span class="text-[10px] font-black uppercase tracking-widest">Auto-Sync Active</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Stats Row -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-6 mb-6">
                <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">
                        <span class="iconify" data-icon="mdi:eye"></span>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Notices</p>
                        <p class="text-xl font-black text-gray-900">${stats.notices}</p>
                    </div>
                </div>
                <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl">
                        <span class="iconify" data-icon="mdi:lightbulb"></span>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Wonders</p>
                        <p class="text-xl font-black text-gray-900">${stats.wonders}</p>
                    </div>
                </div>
                <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl">
                        <span class="iconify" data-icon="mdi:cube-outline"></span>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Model Nodes</p>
                        <p class="text-xl font-black text-gray-900">${stats.nodes}</p>
                    </div>
                </div>
                <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl">
                        <span class="iconify" data-icon="mdi:forum"></span>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Discussion</p>
                        <p class="text-xl font-black text-gray-900">${stats.posts}</p>
                    </div>
                </div>
            </div>

            <div class="panels-container lg:grid lg:grid-cols-12 gap-6 flex-1 px-4 md:px-6 pb-6">
                <div class="lg:col-span-7 flex flex-col h-full" data-card-title="Lesson Focus">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0 border border-amber-400">
                                <span class="iconify" data-icon="mdi:flask-outline"></span>
                            </div>
                            <h3 class="truncate">${phenomenon.title || 'Lesson Focus'}</h3>
                            ${renderInfoTip('Set the stage for your lesson! Update the title, description, and scientific media that students will see in their "Mystery" section.')}
                        </div>
                    </div>
                    <div class="panel-content space-y-6 flex-1 min-h-0">
                        <div class="space-y-4">
                            <div>
                                <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1.5">Mystery Title</label>
                                <input type="text" id="phenomTitle" value="${phenomenon.title || ''}" onchange="window.updatePhenomenon()"
                                    placeholder="Enter Title..." class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner">
                            </div>
                            <div>
                                <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1.5">Contextual Description</label>
                                <textarea id="phenomDesc" onchange="window.updatePhenomenon()"
                                    placeholder="Provide background info..." class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-amber-500 focus:bg-white transition-all resize-none min-h-[120px] shadow-inner">${phenomenon.description || ''}</textarea>
                            </div>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phenomenon Media</h4>
                                    <button onclick="window.openMediaPicker()" class="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase hover:bg-black transition-all">Add Media</button>
                                </div>
                                <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                                    ${(phenomenon.media || []).map(m => `
                                        <div class="group relative aspect-square bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                            <img src="${m.thumb}" class="w-full h-full object-cover" loading="lazy">
                                            <div class="absolute inset-0 bg-red-500/90 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <button onclick="window.removeMediaFromPhenomenon('${m.id}')" class="p-2 text-white"><span class="iconify text-xl" data-icon="mdi:trash-can-outline"></span></button>
                                            </div>
                                        </div>`).join('') || `
                                        <div class="col-span-full py-8 text-center">
                                            <span class="iconify text-3xl text-gray-200 mx-auto mb-2" data-icon="mdi:image-plus-outline"></span>
                                            <p class="text-[9px] font-black text-gray-300 uppercase">No Media Attached</p>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-5 flex flex-col h-full" data-card-title="Alignment & Controls">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-blue-500">
                                <span class="iconify" data-icon="mdi:school"></span>
                            </div>
                            <h3>Standards Alignment</h3>
                        </div>
                    </div>
                    <div class="panel-content space-y-6 flex-1 min-h-0">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Class Focus Standards</h4>
                                <button onclick="window.showTeacherModule('ngss')" class="text-[9px] font-black text-blue-600 uppercase hover:underline">Browse Library</button>
                            </div>
                            <div class="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                ${phenomenon.ngssStandards?.length > 0 ? phenomenon.ngssStandards.map(peId => {
                                    const pe = App.ngssData?.peMap?.get(peId);
                                    return `
                                        <div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
                                            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[9px] font-black font-mono border border-blue-200 shrink-0">${peId}</span>
                                            <p class="text-[10px] font-bold text-gray-700 truncate flex-1">${pe?.description || 'Loading...'}</p>
                                            <button onclick="window.removeFromPhenomenon('${peId}')" class="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all p-1">
                                                <span class="iconify" data-icon="mdi:close"></span>
                                            </button>
                                        </div>`;
                                }).join('') : `<div class="py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100"><p class="text-[10px] font-black text-gray-300 uppercase">Link standards to guide inquiry</p></div>`}
                            </div>
                        </div>
                        
                        <div class="pt-4 border-t border-gray-100 space-y-3">
                            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Quick Actions</label>
                            <div class="grid grid-cols-1 gap-2">
                                <button onclick="window.showTeacherModule('noticeboard')" class="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center justify-center gap-3">
                                    <span class="iconify text-lg" data-icon="mdi:bulletin-board"></span>
                                    Open Inquiry Board
                                </button>
                                <button onclick="window.showTeacherModule('access')" class="w-full py-4 bg-orange-50 text-orange-600 border border-orange-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all flex items-center justify-center gap-3">
                                    <span class="iconify text-lg" data-icon="mdi:lock-open-variant"></span>
                                    Manage Class Permissions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export async function renderTeacherSnapshots() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    const classData = await dbGetByPrefix(STORE_SESSIONS, App.classCode + ':work:');
    const workMap = new Map(classData.map(item => [item.code, item.work]));
    const studentData = students.map(s => ({ student: s, work: workMap.get(App.classCode + ':work:' + s.visitorId) || null }));

    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 hidden md:block"><h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Snapshots</h2><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time Activity</p></div>
            <div class="panels-container flex-1">
                <div class="bg-white border-b flex flex-col h-full" data-card-title="Activity Snapshots">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center shrink-0 border border-blue-500">
                                <span class="iconify" data-icon="mdi:camera-outline"></span>
                            </div>
                            <h3>Activity Snapshots</h3>
                            ${renderInfoTip('Get a quick bird-eye view of every student\'s work. See their current module, progress percentage, and latest scientific claims.')}
                        </div>
                    </div>
                    <div class="panel-content !p-0">
                        <div class="hidden md:flex items-center justify-between p-6 border-b bg-gray-50/30">
                            <h3 class="font-black text-gray-900 uppercase text-sm">Activity Snapshots</h3>
                            ${renderInfoTip('Get a quick bird-eye view of every student\'s work. See their current module, progress percentage, and latest scientific claims.')}
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 md:p-6">
                            ${studentData.length > 0 ? studentData.map(data => {
                                const w = data.work || {};
                                const progress = calculateStudentProgress(w);
                                return `
                                    <div class="bg-white p-4 border-b md:border md:rounded-2xl flex flex-col gap-4">
                                        <div class="flex justify-between items-center"><div class="flex items-center gap-2"><div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-primary font-bold text-xs">${data.student.avatar || data.student.name.charAt(0).toUpperCase()}</div><span class="text-sm font-black text-gray-700 truncate max-w-[120px]">${data.student.name}</span></div><div class="flex items-center gap-2"><span class="text-[8px] font-bold text-gray-400 uppercase">${w.currentModule || 'Start'}</span><span class="text-[10px] font-black text-primary">${progress}%</span></div></div>
                                        <div class="grid grid-cols-2 gap-2"><div class="bg-gray-50 rounded-lg p-2 border border-gray-100 min-h-[40px]"><p class="text-[7px] font-black text-gray-400 uppercase mb-1">Question</p><p class="text-[10px] font-bold text-gray-800 line-clamp-1 italic">${w.mainQuestion || '...'}</p></div><div class="bg-blue-50/50 rounded-lg p-2 border border-blue-100 min-h-[40px]"><p class="text-[7px] font-black text-blue-400 uppercase mb-1">Claim</p><p class="text-[10px] font-bold text-blue-900 line-clamp-1">${w.claim || '...'}</p></div></div>
                                        <button onclick="window.viewStudentWork('${data.student.visitorId}')" class="w-full py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">Inspect Work</button>
                                    </div>`;
                            }).join('') : `<div class="col-span-full py-20">${renderEmptyState('No Active Students', 'Waiting for students...', 'mdi:account-group-outline', true)}</div>`}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export async function renderTeacherLessons() {
    const lessons = await dbGetAll(STORE_LESSONS);
    const templates = getNGSSTemplates();
    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 hidden md:block"><h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Lesson Designer</h2><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Activity Presets</p></div>
            <div class="panels-container flex-1">
                <div class="bg-white border-b flex flex-col" data-card-title="NGSS Blueprints">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-blue-500">
                                <span class="iconify" data-icon="mdi:school"></span>
                            </div>
                            <h3>Domain Blueprints</h3>
                            ${renderInfoTip('Use these pre-built templates to quickly launch high-quality inquiry lessons aligned to specific NGSS domains.')}
                        </div>
                    </div>
                    <div class="panel-content space-y-6">
                        <div class="hidden md:flex items-center justify-between mb-4 border-b pb-4">
                            <h3 class="font-black text-gray-900 uppercase text-sm">Domain Blueprints</h3>
                            ${renderInfoTip('Use these pre-built templates to quickly launch high-quality inquiry lessons aligned to specific NGSS domains.')}
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${templates.map(t => `<div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col group relative overflow-hidden"><div class="mb-4 flex items-center justify-between"><div class="w-10 h-10 bg-${t.color}-50 text-${t.color}-600 rounded-xl flex items-center justify-center"><span class="iconify text-xl" data-icon="${t.icon}"></span></div><span class="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[8px] font-black uppercase">${t.domain}</span></div><h4 class="text-base font-black text-gray-900 mb-2">${t.name}</h4><p class="text-[10px] text-gray-500 leading-relaxed mb-6 line-clamp-2 italic">"${t.settings.phenomenon.description}"</p><div class="flex gap-2"><button onclick="window.previewTemplate('${t.id}')" class="flex-1 py-2 bg-blue-50 text-primary rounded-lg text-[9px] font-black uppercase">Preview</button><button onclick="window.applyTemplate('${t.id}')" class="flex-1 py-2 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase">Apply</button></div></div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="bg-white border-b flex flex-col h-full" data-card-title="My Presets">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-purple-500">
                                <span class="iconify" data-icon="mdi:folder-heart"></span>
                            </div>
                            <h3>My Presets</h3>
                            ${renderInfoTip('Save your custom-configured lessons here to reuse them with different classes or in future school years.')}
                        </div>
                    </div>
                    <div class="panel-content space-y-6">
                        <div class="hidden md:flex items-center justify-between mb-4 border-b pb-4">
                            <h3 class="font-black text-gray-900 uppercase text-sm">Domain Blueprints</h3>
                            ${renderInfoTip('Use these pre-built templates to quickly launch high-quality inquiry lessons aligned to specific NGSS domains.')}
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${lessons.map(l => `<div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col group"><div class="flex justify-between items-start mb-4"><div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-primary"><span class="iconify text-xl" data-icon="mdi:lightbulb-variant"></span></div><button onclick="window.deleteLesson('${l.id}')" class="text-gray-300 hover:text-red-500 p-1"><span class="iconify" data-icon="mdi:delete-outline"></span></button></div><h3 class="text-base font-black text-gray-900 mb-1">${l.name}</h3><p class="text-[10px] text-gray-500 mb-6 line-clamp-2 italic flex-1">"${l.settings.phenomenon.description}"</p><button onclick="window.applyLessonToCurrent('${l.id}')" class="w-full py-2.5 bg-primary text-white rounded-xl text-[9px] font-black uppercase shadow-md">Launch Preset</button></div>`).join('')}
                            ${lessons.length === 0 ? `<div class="col-span-full py-12 text-center opacity-30 border-2 border-dashed rounded-2xl"><p class="text-[9px] font-black uppercase">No custom presets saved</p></div>` : ''}
                        </div>
                        <div class="pt-4"><button onclick="window.saveCurrentAsLesson()" class="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl text-[9px] font-black uppercase border border-gray-200">Save Current Class as Preset</button></div>
                    </div>
                </div>
            </div>
        </div>`;
}

export async function renderTeacherStudents() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    const now = Date.now();
    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 hidden md:block"><h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Students</h2><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Management</p></div>
            <div class="panels-container flex-1">
                <div class="bg-white border-b flex flex-col h-full" data-card-title="Student Roster">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center shrink-0 border border-blue-500">
                                <span class="iconify" data-icon="mdi:account-group"></span>
                            </div>
                            <h3>Student Roster (${students.length})</h3>
                            ${renderInfoTip('Manage your class registry. See who is currently online and jump to individual work boards.')}
                        </div>
                    </div>
                    <div class="panel-content !p-0">
                        <div class="hidden md:flex items-center justify-between p-6 border-b bg-gray-50/30">
                            <h3 class="font-black text-gray-900 uppercase text-sm">Student Roster</h3>
                            ${renderInfoTip('Manage your class registry. See who is currently online and jump to individual work boards.')}
                        </div>
                        <div class="divide-y divide-gray-100">
                            ${students.map(s => {
                                const isOnline = now - s.lastSeen < 15000;
                                return `<div class="flex items-center justify-between p-4 bg-white active:bg-gray-50"><div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 relative">${s.avatar || s.name.charAt(0).toUpperCase()}<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}"></span></div><div class="min-w-0"><p class="font-black text-gray-900 text-sm truncate">${s.name}</p><p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">${isOnline ? 'Active Now' : 'Away'}</p></div></div><div class="flex items-center gap-2"><button onclick="window.viewStudentWork('${s.visitorId}')" class="px-3 py-1.5 bg-blue-50 text-primary rounded-lg text-[9px] font-black uppercase">Monitor</button><button onclick="window.kickStudent('${s.visitorId}')" class="p-2 text-gray-300 hover:text-red-500"><span class="iconify" data-icon="mdi:account-remove"></span></button></div></div>`;
                            }).join('')}
                            ${students.length === 0 ? renderEmptyState('No Students', 'Invite your class.', 'mdi:account-group', true) : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export async function renderTeacherAccess() {
    const modules = [{ id: 'questions', label: '1. Questions', icon: 'mdi:help-circle' }, { id: 'models', label: '2. Models', icon: 'mdi:cube-outline' }, { id: 'investigation', label: '3. Investigation', icon: 'mdi:microscope' }, { id: 'analysis', label: '4. Analysis', icon: 'mdi:chart-line' }, { id: 'math', label: '5. Math', icon: 'mdi:calculator' }, { id: 'explanations', label: '6. Explanations', icon: 'mdi:lightbulb-on' }, { id: 'argument', label: '7. Argument', icon: 'mdi:forum' }, { id: 'communication', label: '8. Communication', icon: 'mdi:share-variant' }];
    const classData = await dbGetByPrefix(STORE_SESSIONS, App.classCode + ':work:');
    const studentWorks = classData.map(item => item.work).filter(Boolean);
    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 hidden md:block"><h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Access Control</h2><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Class Governance</p></div>
            <div class="panels-container flex-1">
                                <div class="bg-white border-b flex flex-col h-full" data-card-title="Guided Mode">
                                    <div class="sticky-panel-header md:hidden">
                                        <div class="flex items-center gap-2">
                                            <div class="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center shrink-0 border border-orange-400">
                                                <span class="iconify" data-icon="mdi:map-marker-path"></span>
                                            </div>
                                            <h3>Guided Mode</h3>
                                            ${renderInfoTip('Guided Mode forces all students to follow your current focus. They cannot move to other modules until you let them!')}
                                        </div>
                                    </div>
                    <div class="panel-content flex flex-col">
                        <div class="hidden md:flex items-center justify-between mb-6 border-b pb-4">
                            <h3 class="font-black text-gray-900 uppercase text-sm">Guided Mode</h3>
                            ${renderInfoTip('Guided Mode forces all students to follow your current focus. They cannot move to other modules until you let them!')}
                        </div>
                        <div class="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100 mb-6">
                            <div class="flex items-center justify-between mb-6"><div><p class="font-bold text-orange-800">Linear Flow</p><p class="text-[9px] text-orange-600 uppercase font-black">Step-by-step guidance</p></div><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" ${App.teacherSettings.guidedMode ? 'checked' : ''} onchange="window.toggleGuidedMode()" class="sr-only peer"><div class="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6"></div></label></div>
                            ${App.teacherSettings.guidedMode ? `<div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-orange-100 shadow-sm"><button onclick="window.guidedMove(-1)" class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center" ${App.teacherSettings.forceModule === 'questions' ? 'disabled' : ''}><span class="iconify text-xl" data-icon="mdi:chevron-left"></span></button><div class="flex-1 text-center"><span class="text-[8px] font-black text-orange-400 uppercase block">Current Focus</span><span class="font-black text-gray-900 text-sm uppercase">${App.teacherSettings.forceModule || 'Questions'}</span></div><button onclick="window.guidedMove(1)" class="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center" ${App.teacherSettings.forceModule === 'communication' ? 'disabled' : ''}><span class="iconify text-xl" data-icon="mdi:chevron-right"></span></button></div>` : '<p class="text-[10px] text-orange-400 italic text-center">Enable Guided Mode to lock progression.</p>'}
                        </div>
                        <div class="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100">
                            <div class="flex items-center justify-between"><div><p class="font-bold text-blue-800">Feedback Loop</p><p class="text-[9px] text-blue-600 uppercase font-black">Show comments to students</p></div><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" ${App.teacherSettings.showFeedbackToStudents ? 'checked' : ''} onchange="window.toggleFeedbackVisibility()" class="sr-only peer"><div class="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6"></div></label></div>
                        </div>
                    </div>
                </div>
                                <div class="bg-white border-b flex flex-col h-full" data-card-title="Permissions">
                                    <div class="sticky-panel-header md:hidden">
                                        <div class="flex items-center gap-3 flex-1">
                                            <div class="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-green-500">
                                                <span class="iconify" data-icon="mdi:lock-open-variant"></span>
                                            </div>
                                            <h3>Permissions</h3>
                                            ${renderInfoTip('Use the checkboxes to lock or unlock specific scientific practices. Use "Focus" to jump everyone to a specific module.')}
                                        </div><div class="flex gap-1"><button onclick="window.setAllAccess(true)" class="p-1.5 bg-green-50 text-green-600 rounded-lg"><span class="iconify" data-icon="mdi:lock-open"></span></button><button onclick="window.setAllAccess(false)" class="p-1.5 bg-red-50 text-red-600 rounded-lg"><span class="iconify" data-icon="mdi:lock"></span></button></div></div>
                    <div class="panel-content !p-0">
                        <div class="hidden md:flex items-center justify-between p-6 border-b bg-gray-50/30">
                            <h3 class="font-black text-gray-900 uppercase text-sm">Class Permissions</h3>
                            ${renderInfoTip('Use the checkboxes to lock or unlock specific scientific practices. Use "Focus" to jump everyone to a specific module.')}
                        </div>
                        <div class="divide-y divide-gray-100">
                            ${modules.map(m => {
                                const isLocked = !App.teacherSettings.moduleAccess[m.id];
                                const activeCount = studentWorks.filter(w => {
                                    if (m.id === 'questions') return w.notices?.length > 0 || w.wonders?.length > 0;
                                    if (m.id === 'models') return w.modelNodes?.length > 0;
                                    if (m.id === 'analysis') return w.dataTable?.rows?.some(r => Object.values(r).some(v => v));
                                    return false;
                                }).length;
                                return `<div class="flex items-center justify-between p-4 bg-white active:bg-gray-50"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center ${!isLocked ? 'text-primary' : 'text-gray-300'}"><span class="iconify text-xl" data-icon="${m.icon}"></span></div><div><p class="font-bold text-gray-800 text-xs">${m.label}</p><p class="text-[8px] font-black text-gray-400 uppercase">${activeCount} Active</p></div></div><div class="flex items-center gap-2"><button onclick="window.openExemplarEditor('${m.id}')" class="px-2 py-1 text-[8px] font-black rounded-lg border border-purple-100 text-purple-600 uppercase hover:bg-purple-50" title="Modify Exemplar">Exemplar</button><button onclick="window.forceAllToModule('${m.id}')" class="px-2 py-1 text-[8px] font-black rounded-lg border uppercase ${App.teacherSettings.forceModule === m.id ? 'bg-teacher text-white border-teacher' : 'text-teacher border-red-100'}">Focus</button><label class="relative inline-flex items-center cursor-pointer scale-90"><input type="checkbox" ${!isLocked ? 'checked' : ''} onchange="window.toggleAccess('${m.id}')" class="sr-only peer"><div class="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div></label></div></div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export async function toggleGuidedMode() {
    App.teacherSettings.guidedMode = !App.teacherSettings.guidedMode;
    if (App.teacherSettings.guidedMode && !App.teacherSettings.forceModule) {
        App.teacherSettings.forceModule = 'questions';
    }
    await saveToStorage();
    renderTeacherContent();
    toast(App.teacherSettings.guidedMode ? 'Guided Mode Enabled' : 'Guided Mode Disabled', 'info');
}

export async function guidedMove(direction) {
    const modules = ['questions', 'models', 'investigation', 'analysis', 'math', 'explanations', 'argument', 'communication'];
    const current = App.teacherSettings.forceModule || 'questions';
    let idx = modules.indexOf(current);
    idx = Math.max(0, Math.min(modules.length - 1, idx + direction));
    App.teacherSettings.forceModule = modules[idx];
    await saveToStorage();
    renderTeacherContent();
}

export async function toggleAccess(moduleId) {
    App.teacherSettings.moduleAccess[moduleId] = !App.teacherSettings.moduleAccess[moduleId];
    await saveToStorage();
    renderTeacherContent();
}

export async function openExemplarEditor(moduleId) {
    App.isExemplarMode = true;
    App.viewerState.isMonitoring = false;
    App.viewingStudentId = null;
    App.currentModule = moduleId;
    
    if (!App.teacherSettings.exemplars) App.teacherSettings.exemplars = {};
    if (!App.teacherSettings.exemplars[moduleId]) {
        App.teacherSettings.exemplars[moduleId] = getInitialWorkState();
    }
    
    App.work = App.teacherSettings.exemplars[moduleId];
    updateModeUI();
    toast(`Editing Exemplar: ${moduleId}`, 'info');
}

export async function renderSessionSettings() {
    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 hidden md:block"><h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Session Settings</h2><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Platform Configuration</p></div>
            <div class="panels-container flex-1 px-4 md:px-6 pb-6">
                <div class="bg-white border-b flex flex-col full-bleed-panel" data-card-title="API Configurations">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-blue-500">
                                <span class="iconify" data-icon="mdi:api"></span>
                            </div>
                            <h3>API Connections</h3>
                            ${renderInfoTip('Connect to external services like Unsplash or Pexels to enable scientific media searching within the platform.')}
                        </div>
                    </div>
                    <div class="panel-content space-y-8 !p-6 md:!p-8">
                        <div class="hidden md:flex items-center justify-between mb-4 border-b pb-4">
                            <h3 class="font-black text-gray-900 uppercase text-sm">System Connections</h3>
                            ${renderInfoTip('Connect to external services like Unsplash or Pexels to enable scientific media searching within the platform.')}
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-3"><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unsplash Key</label><div class="flex gap-2"><input type="password" id="unsplashKey" value="${App.teacherSettings.keys?.unsplash || ''}" class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm shadow-inner"><button onclick="window.saveApiKey('unsplash')" class="px-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase shadow-md">Save</button></div></div><div class="space-y-3"><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pexels Key</label><div class="flex gap-2"><input type="password" id="pexelsKey" value="${App.teacherSettings.keys?.pexels || ''}" class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm shadow-inner"><button onclick="window.saveApiKey('pexels')" class="px-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase shadow-md">Save</button></div></div>
                        </div>
                    </div>
                </div>
                <div class="bg-white border-b flex flex-col flex-1 full-bleed-panel" data-card-title="Preferences">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-purple-500">
                                <span class="iconify" data-icon="mdi:cog"></span>
                            </div>
                            <h3>Preferences</h3>
                            ${renderInfoTip('Fine-tune the classroom environment. Toggle features like anonymous posting, default asset visibility, and peer replies.')}
                        </div>
                    </div>
                    <div class="panel-content !p-0">
                        <div class="hidden md:flex items-center justify-between p-6 border-b bg-gray-50/30">
                            <h3 class="font-black text-gray-900 uppercase text-sm">Classroom Preferences</h3>
                            ${renderInfoTip('Fine-tune the classroom environment. Toggle features like anonymous posting, default asset visibility, and peer replies.')}
                        </div>
                        <div class="divide-y divide-gray-100">
                            ${[
                                { id: 'anonymousMode', label: 'Anonymous Board', desc: 'Hide student names' },
                                { id: 'allowStudentReplies', label: 'Student Replies', desc: 'Allow peer comments' },
                                { id: 'showAllIcons', label: 'Full Icon Library', desc: 'Access 200k+ icons' },
                                { id: 'showDefaultIcons', label: 'Default Icon Set', desc: 'Enable standard science icons' },
                                { id: 'showDefaultEmojis', label: 'Default Emoji Set', desc: 'Enable standard symbols' },
                                { id: 'defaultCategoriesEnabled', label: 'Inquiry Defaults', desc: 'Notice, Wonder, Ideas' },
                                { id: 'showSepTips', label: 'SEP Coaching', desc: 'Display practice tips' },
                                { id: 'showCccTips', label: 'CCC Coaching', desc: 'Display concept tips' }
                            ].map(pref => `<div class="flex items-center justify-between p-5 bg-white active:bg-gray-50 transition-colors"><div><p class="font-bold text-gray-800 text-sm">${pref.label}</p><p class="text-[10px] text-gray-400 font-bold uppercase">${pref.desc}</p></div><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" onchange="window.toggleTeacherSetting('${pref.id}')" ${App.teacherSettings[pref.id] ? 'checked' : ''} class="sr-only peer"><div class="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6 shadow-inner"></div></label></div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

export async function renderCoachingManager() {
    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 hidden md:block">
                <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Coaching Architect</h2>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Practice Guidance & Logic</p>
            </div>
            <div class="panels-container flex-1 px-4 md:px-6 pb-6">
                <div class="flex flex-col bg-white border-b full-bleed-panel h-full" data-card-title="Coaching Library" data-teacher-module="coaching">
                    <div class="sticky-panel-header">
                        <div class="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-200 w-full overflow-x-auto no-scrollbar">
                            <div class="px-2 shrink-0 border-r border-gray-200">
                                <div class="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                                    <span class="iconify" data-icon="mdi:human-male-board"></span>
                                </div>
                            </div>
                            <!-- SEP Tabs -->
                            <div class="flex items-center gap-1 border-r border-gray-200 px-2">
                                ${Object.keys(SEPTipsLibrary).map(sepKey => `
                                    <button onclick="window.switchCoachingLibTab('${sepKey}')" 
                                        class="min-w-[50px] py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${App.uiState?.coachingLibTab === sepKey ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-primary'}">
                                        ${sepKey}
                                    </button>
                                `).join('')}
                            </div>
                            <!-- CCC Tabs -->
                            <div class="flex items-center gap-1 px-2">
                                ${Object.keys(CCCTipsLibrary).map(cccKey => `
                                    <button onclick="window.switchCoachingLibTab('${cccKey}')" 
                                        class="min-w-[50px] py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${App.uiState?.coachingLibTab === cccKey ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-amber-500'}">
                                        ${cccKey.replace('cat_', 'CCC ')}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 flex flex-col min-h-0">
                        <div id="coachingLibSwiper" class="horizontal-snap-container" onscroll="window.handleCoachingLibScroll(this)">
                            ${(() => {
                                const combinedKeys = [...Object.keys(SEPTipsLibrary), ...Object.keys(CCCTipsLibrary)];
                                return combinedKeys.map(key => {
                                    const isCcc = key.startsWith('cat_');
                                    const library = isCcc ? CCCTipsLibrary : SEPTipsLibrary;
                                    const item = library[key];
                                    const activeTipId = App.teacherSettings.activeTips?.[key];
                                    const customTipsForKey = (App.teacherSettings.customTips || []).filter(t => isCcc ? t.ccc === key : t.sep === key);
                                    
                                    return `
                                        <div class="horizontal-snap-item flex flex-col h-full" data-coaching-tab="${key}">
                                            <!-- Panel Header (Desktop Only) -->
                                            <div class="hidden md:flex p-6 border-b bg-gray-50/50 items-center justify-between shrink-0">
                                                <div class="flex items-center gap-4">
                                                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl ${isCcc ? 'text-amber-500' : 'text-primary'} shadow-sm border border-gray-100">
                                                        <span class="iconify" data-icon="${item.icon}"></span>
                                                    </div>
                                                    <div>
                                                        <h4 class="font-black text-lg uppercase text-gray-800 leading-tight">${item.title}</h4>
                                                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${key} • Select 1 Active Guidance</p>
                                                    </div>
                                                </div>
                                                <button onclick="window.addCustomTip('${key}')" class="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                                    <span class="iconify text-lg" data-icon="mdi:plus"></span> Add Custom Tip
                                                </button>
                                            </div>

                                            <!-- Content -->
                                            <div class="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar space-y-8">
                                                <!-- Defaults & Random logic -->
                                                <div class="flex gap-3">
                                                    <button onclick="window.setCoachingTip('${key}', null); App.teacherSettings.randomCoachingTips = true; window.saveToStorage(); renderTeacherContent();" 
                                                        class="flex-1 p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${!activeTipId && App.teacherSettings.randomCoachingTips ? 'border-primary bg-blue-50' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}">
                                                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary">
                                                            <span class="iconify text-xl" data-icon="mdi:shuffle-variant"></span>
                                                        </div>
                                                        <div class="text-left">
                                                            <span class="text-xs font-black text-gray-900 block uppercase">Random Selection</span>
                                                            <span class="text-[9px] text-gray-500 font-bold uppercase">Library fallback mode</span>
                                                        </div>
                                                    </button>
                                                    <button onclick="window.setCoachingTip('${key}', 'none');" 
                                                        class="flex-1 p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${activeTipId === 'none' ? 'border-gray-400 bg-gray-100' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}">
                                                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-gray-400">
                                                            <span class="iconify text-xl" data-icon="mdi:eye-off-outline"></span>
                                                        </div>
                                                        <div class="text-left">
                                                            <span class="text-xs font-black text-gray-900 block uppercase">No Guidance</span>
                                                            <span class="text-[9px] text-gray-500 font-bold uppercase">Hide tips for this ${isCcc ? 'concept' : 'practice'}</span>
                                                        </div>
                                                    </button>
                                                </div>

                                                <!-- Library List -->
                                                <div class="space-y-4">
                                                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block">Element-Level Guidance (Library)</label>
                                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        ${item.elements.map(tip => `
                                                            <label class="flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all cursor-pointer ${activeTipId === tip.id ? 'border-primary bg-blue-50 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}">
                                                                <input type="radio" name="tip_${key}" value="${tip.id}" ${activeTipId === tip.id ? 'checked' : ''} onchange="window.setCoachingTip('${key}', '${tip.id}')" class="mt-1 w-5 h-5 text-primary">
                                                                <div class="flex-1">
                                                                    <div class="flex items-center justify-between mb-1">
                                                                        <span class="text-xs font-black text-gray-900 uppercase tracking-tight">${tip.label}</span>
                                                                        <span class="text-[9px] font-black text-primary uppercase">${tip.mindset || 'Guidance'}</span>
                                                                    </div>
                                                                    <p class="text-[10px] text-gray-600 leading-relaxed italic">"${tip.text}"</p>
                                                                </div>
                                                            </label>
                                                        `).join('')}
                                                    </div>
                                                </div>

                                                <!-- Custom List -->
                                                <div class="space-y-4">
                                                    <div class="flex items-center justify-between px-2">
                                                        <label class="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] block">Your Custom Tips</label>
                                                        <button onclick="window.addCustomTip('${key}')" class="md:hidden text-primary font-black text-[10px] uppercase tracking-widest">+ Add New</button>
                                                    </div>
                                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        ${customTipsForKey.map(tip => `
                                                            <div class="flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all cursor-pointer ${activeTipId === tip.id ? 'border-primary bg-blue-50 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}">
                                                                <input type="radio" name="tip_${key}" value="${tip.id}" ${activeTipId === tip.id ? 'checked' : ''} onchange="window.setCoachingTip('${key}', '${tip.id}')" class="mt-1 w-5 h-5 text-primary">
                                                                <div class="flex-1 min-w-0">
                                                                    <div class="flex justify-between items-start">
                                                                        <span class="text-xs font-black text-gray-900 block mb-1 uppercase tracking-tight">${tip.label}</span>
                                                                        <button onclick="window.deleteCustomTip('${tip.id}')" class="text-gray-300 hover:text-red-500 transition-colors">
                                                                            <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                                                                        </button>
                                                                    </div>
                                                                    <p class="text-[10px] text-gray-600 leading-relaxed italic">"${tip.text}"</p>
                                                                    <div class="mt-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">${tip.mindset}</div>
                                                                </div>
                                                            </div>
                                                        `).join('')}
                                                        ${customTipsForKey.length === 0 ? `
                                                            <button onclick="window.addCustomTip('${key}')" class="col-span-full py-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-[10px] font-black text-gray-300 uppercase tracking-widest hover:border-gray-200 hover:text-gray-400 transition-all flex flex-col items-center gap-2">
                                                                <span class="iconify text-2xl" data-icon="mdi:plus-circle-outline"></span>
                                                                Add Custom Guidance
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('');
                            })()}
                        </div>
                        
                        <!-- Swipe Indicators (Dots) -->
                        <div id="coachingLibDots" class="swipe-dots md:hidden border-t border-gray-50">
                            ${(() => {
                                const combinedKeys = [...Object.keys(SEPTipsLibrary), ...Object.keys(CCCTipsLibrary)];
                                return combinedKeys.map(key => `
                                    <button onclick="window.switchCoachingLibTab('${key}')" 
                                        class="swipe-dot ${App.uiState?.coachingLibTab === key ? 'active' : ''}" 
                                        aria-label="Go to ${key}"></button>
                                `).join('');
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

window.openTipManager = async (key) => {
    if (App.mode !== 'teacher') return;
    const { SEPTipsLibrary, CCCTipsLibrary } = await import('../core/tips_library.js');
    
    const isCcc = key.startsWith('cat_');
    const library = isCcc ? CCCTipsLibrary : SEPTipsLibrary;
    const item = library[key];
    
    if (!item) { toast(`No tips for this ${isCcc ? 'concept' : 'practice'}`, 'info'); return; }

    const activeTipId = App.teacherSettings.activeTips?.[key];
    const customTipsForKey = (App.teacherSettings.customTips || []).filter(t => isCcc ? t.ccc === key : t.sep === key);

    const modal = document.createElement('div');
    modal.id = 'tipSelectorModal';
    modal.className = 'fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
        <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div class="p-8 border-b bg-gray-50/50 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 ${isCcc ? 'bg-amber-500' : 'bg-primary'} text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl">
                        <span class="iconify" data-icon="${item.icon}"></span>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-gray-900 uppercase leading-tight">Coach's Corner</h3>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">${isCcc ? 'Concept' : 'Practice'} Tip for ${item.title}</p>
                    </div>
                </div>
                <button onclick="document.getElementById('tipSelectorModal').remove()" class="p-3 hover:bg-gray-200 rounded-2xl transition-all">
                    <span class="iconify text-2xl" data-icon="mdi:close"></span>
                </button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div class="grid grid-cols-1 gap-3">
                    <!-- Library Tips -->
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Library Guidance</p>
                    ${item.elements.map(tip => `
                        <label class="flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all cursor-pointer ${activeTipId === tip.id ? 'border-primary bg-blue-50' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}">
                            <input type="radio" name="active_tip" value="${tip.id}" ${activeTipId === tip.id ? 'checked' : ''} 
                                onchange="window.setCoachingTip('${key}', '${tip.id}'); document.getElementById('tipSelectorModal').remove();" class="mt-1 w-5 h-5 text-primary border-gray-300 focus:ring-primary">
                            <div>
                                <span class="text-sm font-black text-gray-900 block mb-1 uppercase tracking-tight">${tip.label}</span>
                                <span class="text-xs text-gray-600 block leading-relaxed italic">"${tip.text}"</span>
                            </div>
                        </label>
                    `).join('')}
                    
                    <!-- Custom Tips -->
                    ${customTipsForKey.length > 0 ? `
                        <p class="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] ml-2 mt-4">Your Custom Tips</p>
                        ${customTipsForKey.map(tip => `
                            <label class="flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all cursor-pointer ${activeTipId === tip.id ? 'border-primary bg-blue-50' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}">
                                <input type="radio" name="active_tip" value="${tip.id}" ${activeTipId === tip.id ? 'checked' : ''} 
                                    onchange="window.setCoachingTip('${key}', '${tip.id}'); document.getElementById('tipSelectorModal').remove();" class="mt-1 w-5 h-5 text-primary border-gray-300 focus:ring-primary">
                                <div class="flex-1">
                                    <span class="text-sm font-black text-gray-900 block mb-1 uppercase tracking-tight">${tip.label}</span>
                                    <span class="text-xs text-gray-600 block leading-relaxed italic">"${tip.text}"</span>
                                </div>
                            </label>
                        `).join('')}
                    ` : ''}
                </div>
            </div>
            
            <div class="p-8 bg-gray-50 border-t flex flex-col gap-3">
                <div class="flex gap-3">
                    <button onclick="window.addCustomTip('${key}')" class="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2">
                        <span class="iconify" data-icon="mdi:plus-circle"></span> Add Custom Guidance
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="window.setCoachingTip('${key}', null); App.teacherSettings.randomCoachingTips = true; window.saveToStorage(); document.getElementById('tipSelectorModal').remove();" 
                        class="py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all">
                        Randomize
                    </button>
                    <button onclick="window.setCoachingTip('${key}', 'none'); document.getElementById('tipSelectorModal').remove();" 
                        class="py-4 bg-white border-2 border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-red-500 hover:border-red-100 transition-all">
                        Hide Coaching
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

/**
 * Coaching Library Tab Management
 */
window.switchCoachingLibTab = (tabId) => {
    if (!App.uiState) App.uiState = {};
    App.uiState.coachingLibTab = tabId;
    const swiper = document.getElementById('coachingLibSwiper');
    if (swiper) {
        const target = swiper.querySelector(`[data-coaching-tab="${tabId}"]`);
        if (target) {
            App._isScrollingToCoachingLib = true;
            swiper.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
            
            // Manually update active states without full re-render
            document.querySelectorAll('[onclick*="switchCoachingLibTab"]').forEach(btn => {
                const btnTabId = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
                const isActive = btnTabId === tabId;
                if (btn.classList.contains('min-w-[50px]')) { // Library Tabs
                    const isCcc = btnTabId.startsWith('cat_');
                    btn.className = `min-w-[50px] py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${isActive ? (isCcc ? 'bg-amber-500 text-white shadow-sm' : 'bg-primary text-white shadow-sm') : 'text-gray-400 hover:text-primary'}`;
                } else if (btn.classList.contains('swipe-dot')) { // Dots
                    btn.classList.toggle('active', isActive);
                }
            });

            setTimeout(() => { 
                App._isScrollingToCoachingLib = false; 
            }, 500);
        }
    }
};

window.handleCoachingLibScroll = (el) => {
    if (App._isScrollingToCoachingLib) return;
    const width = el.offsetWidth;
    const index = Math.round(el.scrollLeft / width);
    const tabs = [...Object.keys(SEPTipsLibrary), ...Object.keys(CCCTipsLibrary)];
    const activeId = tabs[index];
    if (activeId && App.uiState?.coachingLibTab !== activeId) {
        if (!App.uiState) App.uiState = {};
        App.uiState.coachingLibTab = activeId;
        
        // Update active states
        document.querySelectorAll('[onclick*="switchCoachingLibTab"]').forEach(btn => {
            const btnTabId = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
            const isActive = btnTabId === activeId;
            if (btn.classList.contains('min-w-[50px]')) {
                const isCcc = btnTabId.startsWith('cat_');
                btn.className = `min-w-[50px] py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${isActive ? (isCcc ? 'bg-amber-500 text-white shadow-sm' : 'bg-primary text-white shadow-sm') : 'text-gray-400 hover:text-primary'}`;
            } else if (btn.classList.contains('swipe-dot')) {
                btn.classList.toggle('active', isActive);
            }
        });
    }
};

export async function addCustomTip(key) {
    const modal = document.getElementById('genericInputModal'); if (!modal) return;
    const titleEl = document.getElementById('genericInputTitle');
    const contentEl = document.getElementById('genericInputContent');
    const actionEl = document.getElementById('genericInputActions');

    titleEl.textContent = 'Add Custom Tip';
    contentEl.innerHTML = `
        <div class="space-y-4">
            <div class="space-y-2">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Label / Title</label>
                <input type="text" id="customTipLabel" placeholder="e.g. Mystery Focus" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold">
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tip Text</label>
                <textarea id="customTipText" placeholder="What should the student do?..." class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm min-h-[100px]"></textarea>
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mindset Tag</label>
                <input type="text" id="customTipMindset" placeholder="e.g. Critical Thinking" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
            </div>
        </div>
    `;
    actionEl.innerHTML = `<button onclick="window.saveCustomTip('${key}')" class="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">Save Tip</button>`;
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

export async function saveCustomTip(key) {
    const label = document.getElementById('customTipLabel')?.value.trim();
    const text = document.getElementById('customTipText')?.value.trim();
    const mindset = document.getElementById('customTipMindset')?.value.trim() || 'Custom';
    
    if (!label || !text) { toast('Label and Text are required', 'error'); return; }
    
    const isCcc = key.startsWith('cat_');
    const tip = { id: 'ct_' + Date.now(), [isCcc ? 'ccc' : 'sep']: key, label, text, mindset };
    if (!App.teacherSettings.customTips) App.teacherSettings.customTips = [];
    App.teacherSettings.customTips.push(tip);
    
    document.getElementById('genericInputModal')?.classList.add('hidden');
    const { saveToStorage } = await import('../core/sync.js');
    await saveToStorage();
    renderTeacherContent();
    toast('Custom tip added!', 'success');
}

export async function deleteCustomTip(tipId) {
    if (!confirm('Delete this custom tip?')) return;
    App.teacherSettings.customTips = (App.teacherSettings.customTips || []).filter(t => t.id !== tipId);
    
    // If the deleted tip was active, reset to default library tip
    Object.keys(App.teacherSettings.activeTips).forEach(k => {
        if (App.teacherSettings.activeTips[k] === tipId) {
            App.teacherSettings.activeTips[k] = null; 
        }
    });

    const { saveToStorage } = await import('../core/sync.js');
    await saveToStorage();
    renderTeacherContent();
    toast('Tip deleted', 'info');
}

export async function setCoachingTip(key, tipId) {
    if (!App.teacherSettings.activeTips) App.teacherSettings.activeTips = {};
    App.teacherSettings.activeTips[key] = tipId;
    const { saveToStorage } = await import('../core/sync.js');
    await saveToStorage();
    renderTeacherContent();
}

export async function previewTemplate(templateId) {
    const templates = getNGSSTemplates();
    const t = templates.find(x => x.id === templateId);
    if (t) renderPreviewModal(t.name, t.icon, t.color, t.settings, () => launchTemplate(t.id), () => applyTemplate(t.id));
}

export async function previewPreset(lessonId) {
    const l = await dbGet(STORE_LESSONS, lessonId);
    if (l) renderPreviewModal(l.name, 'mdi:lightbulb-variant', 'blue', l.settings, () => launchLesson(l.id), () => applyLessonToCurrent(l.id));
}

function renderPreviewModal(name, icon, color, settings, onLaunch, onApply) {
    const modal = document.getElementById('lessonPreviewModal'); if (!modal) return;
    document.getElementById('previewIcon').className = `w-14 h-14 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center text-3xl shadow-sm border border-white`;
    document.getElementById('previewIcon').innerHTML = `<span class="iconify" data-icon="${icon}"></span>`;
    document.getElementById('previewTitle').textContent = name;
    document.getElementById('previewContent').innerHTML = `<div class="space-y-6"><div class="p-6 bg-gray-50 rounded-3xl border border-gray-100"><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Phenomenon Overview</label><h4 class="text-lg font-black text-gray-900 mb-2">${settings.phenomenon?.title || 'Untitled'}</h4><p class="text-sm text-gray-600 leading-relaxed italic">"${settings.phenomenon?.description || ''}"</p></div></div>`;
    document.getElementById('previewActions').innerHTML = `<button onclick="window.closeLessonPreview()" class="px-6 py-3 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl transition-all">Cancel</button><button id="previewLaunchBtn" class="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all">Launch New</button><button id="previewApplyBtn" class="px-8 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:opacity-90 transition-all">Apply to Current</button>`;
    document.getElementById('previewLaunchBtn').onclick = () => { window.closeLessonPreview(); onLaunch(); };
    document.getElementById('previewApplyBtn').onclick = () => { window.closeLessonPreview(); onApply(); };
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

export function closeLessonPreview() { document.getElementById('lessonPreviewModal')?.classList.add('hidden'); }

export async function launchTemplate(templateId) {
    const templates = getNGSSTemplates();
    const t = templates.find(x => x.id === templateId);
    if (t && confirm('Launch new session with this template?')) {
        App.classCode = generateCode(); App.teacherSettings = deepClone(t.settings);
        App.work = getInitialWorkState(); await saveToStorage(); await registerUser(); updateModeUI(); toast('Template Launched!', 'success');
    }
}

export async function applyTemplate(templateId) {
    const templates = getNGSSTemplates();
    const t = templates.find(x => x.id === templateId);
    if (t && confirm('Apply template to current class?')) {
        App.teacherSettings = deepClone(t.settings); await saveToStorage(); updateModeUI(); toast('Template Applied!', 'success');
    }
}

export async function saveCurrentAsLesson() {
    window.openGenericInput('Save Preset', 'Enter name...', App.teacherSettings.phenomenon.title, async (name) => {
        if (!name) return;
        const lesson = { id: 'l_' + Date.now(), name, settings: deepClone(App.teacherSettings), timestamp: Date.now() };
        await dbPut(STORE_LESSONS, lesson); toast('Preset Saved!', 'success'); renderTeacherContent();
    });
}

export async function deleteLesson(id) { if (confirm('Delete lesson?')) { await dbDelete(STORE_LESSONS, id); renderTeacherContent(); } }

export async function launchLesson(lessonId) {
    const l = await dbGet(STORE_LESSONS, lessonId);
    if (l && confirm('Start new session?')) {
        App.classCode = generateCode(); App.teacherSettings = deepClone(l.settings);
        App.work = getInitialWorkState(); await saveToStorage(); await registerUser(); updateModeUI(); toast('Launched!', 'success');
    }
}

export async function applyLessonToCurrent(lessonId) {
    const l = await dbGet(STORE_LESSONS, lessonId);
    if (l && confirm('Apply to this class?')) { App.teacherSettings = deepClone(l.settings); await saveToStorage(); updateModeUI(); toast('Applied!', 'success'); }
}

export async function saveApiKey(provider) {
    const input = document.getElementById(`${provider}Key`); if (!input) return;
    if (!App.teacherSettings.keys) App.teacherSettings.keys = {};
    App.teacherSettings.keys[provider] = input.value.trim();
    await saveToStorage(); toast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} Key Saved`, 'success');
}

export const toggleTeacherSetting = async (k) => { App.teacherSettings[k] = !App.teacherSettings[k]; await saveToStorage(); renderTeacherContent(); };
export const updateTeacherSetting = async (k, v) => { App.teacherSettings[k] = v; await saveToStorage(); renderTeacherContent(); };
export async function toggleFeedbackVisibility() { App.teacherSettings.showFeedbackToStudents = !App.teacherSettings.showFeedbackToStudents; await saveToStorage(); renderTeacherContent(); toast(App.teacherSettings.showFeedbackToStudents ? 'Feedback Visible' : 'Feedback Hidden', 'info'); }
export async function setAllAccess(status) { Object.keys(App.teacherSettings.moduleAccess).forEach(k => { App.teacherSettings.moduleAccess[k] = status; }); await saveToStorage(); renderTeacherContent(); toast(status ? 'Unlocked' : 'Locked', 'info'); }
export async function forceAllToCurrent() {
    let target = null;
    if (App.teacherModule === 'livemodels') target = 'models';
    else if (App.teacherModule === 'livedata') target = 'analysis';
    else if (App.teacherModule === 'noticeboard') target = 'questions';
    if (target) await forceAllToModule(target);
    else toast('Select a module first', 'warning');
}
export const forceAllToModule = async (moduleId) => { App.teacherSettings.forceModule = (App.teacherSettings.forceModule === moduleId) ? null : moduleId; await saveToStorage(); renderTeacherContent(); };

export async function renderActivityDashboard() {
    const isMonitoring = App.viewerState.isMonitoring;
    return `
        <div class="h-full flex flex-col -m-6">
            <div class="bg-gray-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl z-50">
                <div class="flex items-center gap-6">
                    <button onclick="window.exitActivityDashboard()" class="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all"><span class="iconify text-2xl" data-icon="mdi:arrow-left"></span></button>
                    <div><div class="flex items-center gap-2"><h2 class="font-black text-2xl uppercase tracking-tighter">${App.currentModule}</h2><span class="px-2 py-0.5 bg-orange-500 text-white rounded text-[10px] font-black uppercase">Guided</span></div><p class="text-xs text-gray-400 font-bold uppercase mt-1">Command Center</p></div>
                </div>
                <div class="flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    <button onclick="window.toggleDashboardMode(false)" class="px-6 py-3 rounded-xl text-sm font-black transition-all ${!isMonitoring ? 'bg-white text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-white'}">Edit Exemplar</button>
                    <button onclick="window.toggleDashboardMode(true)" class="px-6 py-3 rounded-xl text-sm font-black transition-all ${isMonitoring ? 'bg-white text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-white'}">Monitor Class</button>
                </div>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50 p-8">
                <div class="max-w-7xl mx-auto h-full">${isMonitoring ? await renderMonitorView() : `<div class="bg-white rounded-[40px] shadow-sm border border-gray-100 min-h-full flex flex-col overflow-hidden"><div class="p-8 border-b border-gray-50 bg-orange-50/30 flex items-center justify-between"><div><h3 class="text-xl font-black text-gray-900 uppercase">Class Exemplar Editor</h3><p class="text-xs text-gray-500 font-bold uppercase mt-1">Creating reference work</p></div><div class="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-orange-100 text-orange-600 text-[10px] font-black uppercase shadow-sm"><span class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>LIVE</div></div><div class="flex-1 p-8">${window.renderStudentContentHtml()}</div></div>`}</div>
            </div>
        </div>`;
}

async function renderMonitorView() {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    const classData = await dbGetByPrefix(STORE_SESSIONS, App.classCode + ':work:');
    const workMap = new Map(classData.map(item => [item.code, item.work]));
    const htmls = students.map(s => {
        const isOnline = (Date.now() - s.lastSeen < 15000);
        const work = workMap.get(App.classCode + ':work:' + s.visitorId);
        const progress = work ? calculateStudentProgress(work) : 0;
        return `
            <div class="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group">
                <div class="flex items-center justify-between mb-6"><div class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white group-hover:scale-110 transition-transform">${s.avatar || s.name.charAt(0).toUpperCase()}</div><span class="w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}"></span></div>
                <h4 class="font-black text-gray-900 text-lg mb-1">${s.name}</h4>
                <div class="flex items-center gap-2 mb-6"><div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-primary" style="width:${progress}%"></div></div><span class="text-[10px] font-black text-primary">${progress}%</span></div>
                <button onclick="window.viewStudentWork('${s.visitorId}')" class="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">View Work Board</button>
            </div>`;
    });
    return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${htmls.join('')}${students.length === 0 ? `<div class="col-span-full">${renderEmptyState('No students', 'Waiting for join...', 'mdi:monitor-dashboard', true)}</div>` : ''}</div>`;
}

export async function openActivityDashboard() {
    App.isExemplarMode = true; App.viewerState.isMonitoring = false; App.viewingStudentId = null; App.currentModule = App.teacherSettings.forceModule || 'questions';
    if (!App.teacherSettings.exemplars[App.currentModule]) App.teacherSettings.exemplars[App.currentModule] = getInitialWorkState();
    App.work = App.teacherSettings.exemplars[App.currentModule];
    updateModeUI(); toast('Exemplar Mode', 'info');
}
