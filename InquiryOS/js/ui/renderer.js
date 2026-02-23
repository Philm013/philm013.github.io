/**
 * @file renderer.js
 * @description Main UI rendering engine for InquiryOS. Handles view switching between student and teacher modes and individual practice modules.
 */

import { App, getInitialWorkState } from '../core/state.js';
import { dbGetByIndex, STORE_USERS } from '../core/storage.js';
import { renderNavigation } from './navigation.js';
import { saveToStorage } from '../core/sync.js';
import { ngssData } from '../core/state.js';
import { toast } from './utils.js';


// Import Student Module Renderers
import { renderQuestionsModule } from '../modules/questions.js';
import { renderModelsModule, initModelCanvas } from '../modules/models.js';
import { renderInvestigationModule } from '../modules/investigation.js';
import { renderAnalysisModule, initChart } from '../modules/analysis.js';
import { renderMathModule } from '../modules/math.js';
import { renderExplanationsModule } from '../modules/explanations.js';
import { renderArgumentModule } from '../modules/argument.js';
import { renderCommunicationModule } from '../modules/communication.js';

// Import Teacher Module Renderers (Consolidated)
import { 
    renderTeacherOverview, 
    renderTeacherSnapshots, 
    renderActivityDashboard,
    renderTeacherLessons,
    renderTeacherStudents,
    renderTeacherAccess,
    renderSessionSettings
} from '../teacher/dashboard.js';
import { renderTeacherNoticeBoard, renderModeration, renderCategoryManager } from '../teacher/noticeboard.js';
import { renderLiveModels, renderLiveData, renderLiveGeneric, initViewerCanvas, renderIconManager } from '../teacher/viewer.js';
import { renderNGSSBrowser } from '../core/ngss.js';

/**
 * Switches the application between student and teacher modes.
 * @param {string} mode - 'student' | 'teacher'.
 */
export function switchMode(mode) {
    App.mode = mode;
    updateModeUI();
    saveToStorage();
}

/**
 * Updates the global UI state, headers, and navigation based on the current mode and active student being viewed.
 */
export function updateModeUI() {
    try {
        const isTeacher = App.mode === 'teacher';
        const isFullscreen = App.modelState?.isFullscreen || false;
        
        document.body.classList.toggle('view-fullscreen', isFullscreen);
        
        let subtitle = isTeacher ? 'Teacher Mode' : 'Student Mode';
        if (isTeacher && App.viewingStudentId) {
            subtitle = 'Viewing Student Work';
        }
        
        const subtitleEl = document.getElementById('headerSubtitle');
        if (subtitleEl) subtitleEl.textContent = subtitle;
        
        const studentNavEl = document.getElementById('teacherStudentNav');
        const viewingNameEl = document.getElementById('viewingName');
        const viewingAvatarEl = document.getElementById('viewingAvatar');
        
        if (isTeacher && App.viewingStudentId && studentNavEl) {
            studentNavEl.classList.remove('hidden');
            studentNavEl.classList.add('flex');
            
            dbGetByIndex(STORE_USERS, 'classCode', App.classCode).then(users => {
                const s = users.find(u => u.visitorId === App.viewingStudentId);
                if (s && viewingNameEl && viewingAvatarEl) {
                    viewingNameEl.textContent = s.name;
                    viewingAvatarEl.textContent = s.avatar || s.name.charAt(0).toUpperCase();
                }
            });
        } else if (studentNavEl) {
            studentNavEl.classList.add('hidden');
            studentNavEl.classList.remove('flex');
        }
        
        const headerIcon = document.getElementById('headerIcon');
        if (headerIcon) headerIcon.className = `w-10 h-10 rounded-xl flex items-center justify-center ${isTeacher ? 'bg-gradient-to-br from-teacher to-orange-500' : 'bg-gradient-to-br from-primary to-secondary'}`;
        
        const appHeader = document.getElementById('appHeader');
        if (appHeader) appHeader.className = `${isTeacher ? 'bg-red-50' : 'bg-white'} shadow-sm border-b flex-shrink-0`;
        
        const studentBtn = document.getElementById('studentModeBtn');
        if (studentBtn) studentBtn.className = `mode-btn px-4 py-2 rounded-lg text-sm font-medium ${!isTeacher ? 'bg-white shadow text-primary' : 'text-gray-600 hover:bg-white/50'}`;
        
        const teacherBtn = document.getElementById('teacherModeBtn');
        if (teacherBtn) teacherBtn.className = `mode-btn px-4 py-2 rounded-lg text-sm font-medium ${isTeacher ? 'bg-white shadow text-teacher' : 'text-gray-600 hover:bg-white/50'}`;
        
        const eb = document.getElementById('evidenceBank');
        if (eb) eb.style.display = (isTeacher && !App.viewingStudentId) ? 'none' : 'block';
        
        // Update bottom nav for mobile
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) {
            if (isTeacher) {
                bottomNav.innerHTML = `
                    <button onclick="window.showTeacherModule('overview')" class="flex flex-col items-center gap-1 ${App.teacherModule === 'overview' ? 'text-teacher' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:view-dashboard"></span>
                        <span class="text-[10px] font-medium">Overview</span>
                    </button>
                    <button onclick="window.showTeacherModule('snapshots')" class="flex flex-col items-center gap-1 ${App.teacherModule === 'snapshots' ? 'text-teacher' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:camera-outline"></span>
                        <span class="text-[10px] font-medium">Snapshots</span>
                    </button>
                    <button onclick="window.showTeacherModule('noticeboard')" class="flex flex-col items-center gap-1 ${App.teacherModule === 'noticeboard' ? 'text-teacher' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:bulletin-board"></span>
                        <span class="text-[10px] font-medium">Board</span>
                    </button>
                    <button onclick="window.showTeacherModule('students')" class="flex flex-col items-center gap-1 ${App.teacherModule === 'students' ? 'text-teacher' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:account-group"></span>
                        <span class="text-[10px] font-medium">Students</span>
                    </button>
                    <button onclick="window.toggleSidebar()" class="flex flex-col items-center gap-1 text-gray-500">
                        <span class="iconify text-2xl" data-icon="mdi:menu"></span>
                        <span class="text-[10px] font-medium">More</span>
                    </button>
                `;
            } else {
                bottomNav.innerHTML = `
                    <button onclick="window.showStudentModule('questions')" class="flex flex-col items-center gap-1 ${App.currentModule === 'questions' ? 'text-primary' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:help-circle"></span>
                        <span class="text-[10px] font-medium">Questions</span>
                    </button>
                    <button onclick="window.showStudentModule('models')" class="flex flex-col items-center gap-1 ${App.currentModule === 'models' ? 'text-primary' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:cube-outline"></span>
                        <span class="text-[10px] font-medium">Models</span>
                    </button>
                    <button onclick="window.showStudentModule('analysis')" class="flex flex-col items-center gap-1 ${App.currentModule === 'analysis' ? 'text-primary' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:chart-line"></span>
                        <span class="text-[10px] font-medium">Data</span>
                    </button>
                    <button onclick="window.showStudentModule('explanations')" class="flex flex-col items-center gap-1 ${App.currentModule === 'explanations' ? 'text-primary' : 'text-gray-500'}">
                        <span class="iconify text-2xl" data-icon="mdi:lightbulb-on"></span>
                        <span class="text-[10px] font-medium">CER</span>
                    </button>
                    <button onclick="window.toggleSidebar()" class="flex flex-col items-center gap-1 text-gray-500">
                        <span class="iconify text-2xl" data-icon="mdi:menu"></span>
                        <span class="text-[10px] font-medium">More</span>
                    </button>
                `;
            }
        }

        renderNavigation();
        if (isTeacher) {
            renderTeacherContent();
        } else {
            renderStudentContent();
        }
    } catch (e) {
        console.error('Error updating UI:', e);
    }
}

/**
 * Renders the content for the currently active student module.
 */
export function renderStudentContent() {
    if (App.mode === 'teacher' && (App.isExemplarMode || App.viewingStudentId)) {
        renderTeacherContent();
        return;
    }

    renderStatusBanner();
    
    // Force module if set by teacher
    if (App.mode === 'student' && App.teacherSettings.forceModule && App.currentModule !== App.teacherSettings.forceModule) {
        App.currentModule = App.teacherSettings.forceModule;
        renderNavigation();
    }

    const content = document.getElementById('mainContent');
    if (!content) return;
    
    const appView = document.getElementById('appView');
    if (appView) {
        appView.className = 'view active ' + (App.mode === 'teacher' ? 'view-teacher' : 'view-student');
        appView.classList.add('view-' + App.currentModule);
    }

    const renderers = {
        questions: renderQuestionsModule,
        models: renderModelsModule,
        investigation: renderInvestigationModule,
        analysis: renderAnalysisModule,
        math: renderMathModule,
        explanations: renderExplanationsModule,
        argument: renderArgumentModule,
        communication: renderCommunicationModule
    };
    
    const html = renderers[App.currentModule]?.() || '<p>Module not found</p>';
    
    if (App.isViewingExemplar) {
        content.innerHTML = `
            <div class="relative min-h-full">
                <div class="absolute inset-0 z-[150] bg-white/10 pointer-events-auto cursor-not-allowed"></div>
                <div class="pointer-events-none opacity-80 filter grayscale-[0.2]">
                    ${html}
                </div>
                <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[160] bg-purple-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3">
                    <span class="iconify text-xl" data-icon="mdi:eye"></span>
                    TEACHER EXAMPLE VIEW
                    <button onclick="window.toggleExemplarView()" class="ml-4 bg-white text-purple-600 px-4 py-1 rounded-full text-sm">Return to My Work</button>
                </div>
            </div>
        `;
    } else {
        content.innerHTML = html;
    }
    
    setTimeout(() => {
        if (App.currentModule === 'models') initModelCanvas();
        if (App.currentModule === 'analysis') initChart();
    }, 50);
}

/**
 * Renders the content for the currently active teacher module.
 */
export async function renderTeacherContent() {
    if (App.isExemplarMode) {
        const content = document.getElementById('mainContent');
        if (content) {
            content.innerHTML = await renderActivityDashboard();
            setTimeout(() => {
                if (App.currentModule === 'models') initModelCanvas();
                if (App.currentModule === 'analysis') initChart();
            }, 50);
        }
        return;
    }

    const content = document.getElementById('mainContent');
    if (!content) return;
    
    const renderers = {
        overview: renderTeacherOverview,
        lessons: renderTeacherLessons,
        snapshots: renderTeacherSnapshots,
        students: renderTeacherStudents,
        access: renderTeacherAccess,
        noticeboard: renderTeacherNoticeBoard,
        livemodels: renderLiveModels,
        livedata: renderLiveData,
        livegeneric: renderLiveGeneric,
        moderation: renderModeration,
        categories: renderCategoryManager,
        icons: renderIconManager,
        ngss: renderNGSSBrowser,
        settings: renderSessionSettings
    };
    
    const renderer = renderers[App.teacherModule];
    if (renderer) {
        const result = await renderer();
        if (typeof result === 'string') content.innerHTML = result;
    } else {
        content.innerHTML = '<p>Module not found</p>';
    }
    
    setTimeout(() => {
        if (App.teacherModule === 'livemodels') initViewerCanvas();
    }, 50);
}

/**
 * Renders the consistent module header including Practice (SEP) tags and fullscreen toggles.
 * @param {string} title - Module title.
 * @param {string} icon - Iconify icon ID.
 * @param {string} sep - NGSS Science & Engineering Practice ID (e.g., 'SEP1').
 * @param {string} [customButtons=''] - Additional HTML for action buttons.
 * @returns {string} HTML content for the header.
 */
export function renderModuleHeader(title, icon, sep, customButtons = '') {
    const isFullscreen = !!document.fullscreenElement;
    const sepData = ngssData.elements3D?.dimensions?.find(d => d.code === 'SEP')?.elements?.find(el => el.id === sep);
    
    return `
        <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <h2 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span class="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                        <span class="iconify text-white text-xl" data-icon="${icon}"></span>
                    </span>
                    ${title}
                </h2>
                ${sep ? `
                    <div class="relative group">
                        <span class="ngss-tag ngss-sep cursor-help">${sep}</span>
                        ${sepData ? `
                            <div class="absolute left-0 top-full mt-2 w-64 p-4 bg-white rounded-xl shadow-2xl border border-blue-100 z-[1000] hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                                <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Practice: ${sep}</p>
                                <p class="text-xs font-bold text-gray-900 mb-2">${sepData.name}</p>
                                <p class="text-[11px] text-gray-600 leading-relaxed">${sepData.description || ''}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="flex items-center gap-2">
                ${customButtons}
                <button onclick="window.toggleModuleFullscreen()" class="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                    <span class="iconify" data-icon="${isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}"></span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Renders the class status banner (Forced modules, feedback alerts, exemplars).
 */
export function renderStatusBanner() {
    const banner = document.getElementById('statusBanner');
    if (!banner || App.mode !== 'student') {
        if (banner) banner.classList.add('hidden');
        return;
    }
    
    let html = '';
    
    if (App.teacherSettings.forceModule) {
        const isGuided = App.teacherSettings.guidedMode;
        html += `
            <div class="${isGuided ? 'bg-orange-500' : 'bg-teacher'} text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold animate-pulse">
                <span class="iconify" data-icon="${isGuided ? 'mdi:map-marker-path' : 'mdi:lock'}"></span>
                <span>${isGuided ? 'GUIDED LESSON IN PROGRESS:' : 'TEACHER HAS FOCUSED THE CLASS ON:'} ${App.teacherSettings.forceModule.toUpperCase()}</span>
            </div>
        `;
    }
    
    if (App.teacherSettings.showFeedbackToStudents && (App.work.modelComments?.length > 0 || App.work.modelStickers?.length > 0)) {
        html += `
            <div class="bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold border-t border-blue-500">
                <span class="iconify" data-icon="mdi:comment-check"></span>
                <span>Teacher feedback is available on your model!</span>
                <button onclick="window.showStudentModule('models')" class="ml-2 px-2 py-0.5 bg-white text-blue-600 rounded text-xs">View Now</button>
            </div>
        `;
    }

    if (App.teacherSettings.exemplars?.[App.currentModule]) {
        const isViewing = App.isViewingExemplar;
        html += `
            <div class="bg-purple-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold border-t border-purple-500">
                <span class="iconify" data-icon="mdi:lightbulb-on"></span>
                <span>${isViewing ? 'YOU ARE VIEWING THE TEACHER EXAMPLE' : 'THE TEACHER HAS PROVIDED AN EXAMPLE'}</span>
                <button onclick="window.toggleExemplarView()" class="ml-2 px-3 py-0.5 bg-white text-purple-600 rounded-full text-xs">
                    ${isViewing ? 'Back to My Work' : 'View Teacher Example'}
                </button>
            </div>
        `;
    }

    if (html) {
        banner.innerHTML = html;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

/**
 * Renders the evidence bank list in the sidebar.
 */
export function renderEvidenceBank() {
    const list = document.getElementById('evidenceList');
    if (!list) return;
    
    if (App.work.evidence.length === 0) {
        list.innerHTML = '<p class="text-amber-600 italic">No evidence collected yet</p>';
    } else {
        list.innerHTML = App.work.evidence.map(e => `
            <div class="p-2 bg-white rounded border border-amber-200 hover:border-amber-400 cursor-pointer" onclick="window.viewEvidence('${e.id}')">
                <div class="flex items-center gap-2">
                    <span class="iconify text-amber-600" data-icon="${e.icon || 'mdi:file-document'}"></span>
                    <span class="font-medium truncate">${e.title}</span>
                </div>
            </div>
        `).join('');
    }
}

/**
 * Toggles the student's view between their own work and the teacher's exemplar.
 */
export async function toggleExemplarView() {
    App.isViewingExemplar = !App.isViewingExemplar;
    if (App.isViewingExemplar) {
        // Cache current work
        App.studentWorkCache = JSON.parse(JSON.stringify(App.work));
        
        // Show exemplar
        const exemplar = App.teacherSettings.exemplars?.[App.currentModule];
        if (exemplar) {
            App.work = JSON.parse(JSON.stringify(exemplar));
        } else {
            App.work = getInitialWorkState();
        }
        
        toast('Viewing Teacher Example', 'info');
    } else {
        // Restore work
        if (App.studentWorkCache) App.work = App.studentWorkCache;
        App.studentWorkCache = null;
        toast('Returned to My Work', 'info');
    }
    renderNavigation();
    renderStudentContent();
}

/**
 * Renders a consistent empty state placeholder with optional QR code support.
 */
export function renderEmptyState(title, message, icon = 'mdi:folder-open-outline', showQR = false) {
    return `
        <div class="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white">
                <span class="iconify text-6xl text-gray-200" data-icon="${icon}"></span>
            </div>
            <h3 class="text-2xl font-black text-gray-400 uppercase tracking-tighter">${title}</h3>
            <p class="text-gray-400 mt-2 max-w-md mx-auto leading-relaxed font-medium">${message}</p>
            ${showQR ? `
                <div class="mt-10 flex flex-col items-center gap-4">
                    <button onclick="window.showJoinQR()" class="px-8 py-4 bg-primary text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:opacity-90 flex items-center gap-3 transition-all hover:-translate-y-1">
                        <span class="iconify text-2xl" data-icon="mdi:qrcode"></span>
                        Show Class QR Code
                    </button>
                    <div class="px-6 py-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 font-mono font-black text-lg tracking-widest">
                        ${App.classCode}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Toggles fullscreen mode for the entire application container.
 */
export function toggleModuleFullscreen() {
    const el = document.getElementById('appView');
    if (!el) return;
    
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
}
