/**
 * @file renderer.js
 * @description Main UI rendering engine for InquiryOS. Handles view switching between student and teacher modes and individual practice modules.
 */

import { App, getInitialWorkState } from '../core/state.js';
import { dbGetByIndex, STORE_USERS } from '../core/storage.js';
import { renderNavigation } from './navigation.js';
import { saveToStorage } from '../core/sync.js';
import { ngssData } from '../core/state.js';
import { toast, deepClone } from './utils.js';


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
        
        const teacherGlobalEl = document.getElementById('teacherGlobalNav');
        if (teacherGlobalEl) {
            teacherGlobalEl.classList.toggle('hidden', !isTeacher);
            teacherGlobalEl.classList.toggle('flex', isTeacher);
        }

        const presentationEl = document.getElementById('presentationStatus');
        if (presentationEl) {
            const isPresenting = !!App.sharedData.currentPresentation;
            presentationEl.classList.toggle('hidden', !isPresenting);
            presentationEl.classList.toggle('flex', isPresenting);
        }
        
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
        
        const eb = document.getElementById('evidenceBank');
        if (eb) eb.style.display = (isTeacher && !App.viewingStudentId) ? 'none' : 'block';
        
        // Update bottom nav for mobile
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav && window.innerWidth <= 768) {
            const isTeacher = App.mode === 'teacher';
            const centerContent = isTeacher ? `
                <button onclick="window.showTeacherModule('overview')" class="flex flex-col items-center justify-center h-full ${App.teacherModule === 'overview' ? 'text-teacher' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:view-dashboard"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">Home</span>
                </button>
                <button onclick="window.showTeacherModule('snapshots')" class="flex flex-col items-center justify-center h-full ${App.teacherModule === 'snapshots' ? 'text-teacher' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:camera-outline"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">Snaps</span>
                </button>
                <button onclick="window.showTeacherModule('noticeboard')" class="flex flex-col items-center justify-center h-full ${App.teacherModule === 'noticeboard' ? 'text-teacher' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:bulletin-board"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">Board</span>
                </button>
                <button onclick="window.showTeacherModule('students')" class="flex flex-col items-center justify-center h-full ${App.teacherModule === 'students' ? 'text-teacher' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:account-group"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">Class</span>
                </button>
            ` : `
                <button onclick="window.showStudentModule('questions')" class="flex flex-col items-center justify-center h-full ${App.currentModule === 'questions' ? 'text-primary' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:help-circle"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">Quest</span>
                </button>
                <button onclick="window.showStudentModule('models')" class="flex flex-col items-center justify-center h-full ${App.currentModule === 'models' ? 'text-primary' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:cube-outline"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">Model</span>
                </button>
                <button onclick="window.showStudentModule('analysis')" class="flex flex-col items-center justify-center h-full ${App.currentModule === 'analysis' ? 'text-primary' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:chart-line"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">Data</span>
                </button>
                <button onclick="window.showStudentModule('explanations')" class="flex flex-col items-center justify-center h-full ${App.currentModule === 'explanations' ? 'text-primary' : 'text-gray-400'}">
                    <span class="iconify text-2xl" data-icon="mdi:lightbulb-on"></span>
                    <span class="text-[9px] font-bold uppercase tracking-tighter">CER</span>
                </button>
            `;

            bottomNav.innerHTML = `
                <div class="flex-1 flex justify-around items-center h-full w-full">
                    ${centerContent}
                    <button onclick="window.toggleSidebar()" class="flex flex-col items-center justify-center h-full text-gray-400">
                        <span class="iconify text-2xl" data-icon="mdi:menu"></span>
                        <span class="text-[9px] font-bold uppercase tracking-tighter">More</span>
                    </button>
                </div>
            `;
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

    // Check for active presentation
    if (App.mode === 'student' && App.sharedData.currentPresentation) {
        renderPresentationLayer();
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
                <div class="pointer-events-none opacity-80 filter grayscale-[0.2] h-full">
                    ${html}
                </div>
                <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[160] bg-purple-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 whitespace-nowrap">
                    <span class="iconify text-xl" data-icon="mdi:eye"></span>
                    TEACHER EXAMPLE
                    <button onclick="window.toggleExemplarView()" class="ml-4 bg-white text-purple-600 px-4 py-1 rounded-full text-sm">Exit</button>
                </div>
            </div>
        `;
    } else {
        content.innerHTML = html;
    }
    
    setTimeout(() => {
        if (App.currentModule === 'models') initModelCanvas();
        if (App.currentModule === 'analysis') initChart();
        if (App.currentModule === 'investigation' && window.initDataTableSortable) {
            window.initDataTableSortable();
        }
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
        if (typeof result === 'string') {
            content.innerHTML = result;
        }
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
/**
 * Renders the consistent module header including Practice (SEP) tags, Coaching Tips, and fullscreen toggles.
 * @param {string} title - The module title.
 * @param {string} icon - Iconify icon ID.
 * @param {string} sep - NGSS Science & Engineering Practice ID (e.g., 'SEP1').
 * @param {string} [customButtons=''] - Additional HTML for action buttons.
 * @returns {string} HTML content for the header.
 */
export function renderModuleHeader(title, icon, sep, customButtons = '') {
    const isFullscreen = !!document.fullscreenElement;
    const sepData = ngssData.elements3D?.dimensions?.find(d => d.code === 'SEP')?.elements?.find(el => el.id === sep);
    const hasExemplar = !!App.teacherSettings.exemplars?.[App.currentModule];
    
    // Find active Crosscutting Concept (CCC) from teacher settings
    const activeCcc = App.teacherSettings?.categories?.find(c => c.id.startsWith('cat_'));

    return `
        <div class="mb-6 flex flex-col gap-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                    ${activeCcc ? `
                        <div class="relative group">
                            <span class="ngss-tag ngss-ccc cursor-help uppercase">${activeCcc.name}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="flex items-center gap-2">
                    ${hasExemplar && App.mode === 'student' ? `
                        <button onclick="window.toggleExemplarView()" class="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-bold flex items-center gap-2 transition-all">
                            <span class="iconify" data-icon="mdi:lightbulb-on"></span>
                            <span class="hidden sm:inline">${App.isViewingExemplar ? 'Back to My Work' : 'View Example'}</span>
                        </button>
                    ` : ''}
                    ${customButtons}
                    <button onclick="window.toggleModuleFullscreen()" class="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                        <span class="iconify" data-icon="${isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}"></span>
                    </button>
                </div>
            </div>

            <!-- Coaching Tips Section (For Students) -->
            ${App.mode === 'student' ? renderCoachingTips(sep, activeCcc) : ''}
        </div>
    `;
}

/**
 * Generates sleek, domain-agnostic coaching tips for students based on the active SEP and CCC.
 */
function renderCoachingTips(sep, ccc) {
    const sepTip = getCoachingTipsData(sep);
    const cccTip = ccc ? getCccTipsData(ccc.id) : null;
    
    if (!sepTip && !cccTip) return '';

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${sepTip ? `
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm group hover:shadow-md transition-all">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0 border border-blue-50 group-hover:scale-110 transition-transform">
                        <span class="iconify text-xl" data-icon="mdi:comment-quote"></span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-black text-primary uppercase tracking-widest">Practice: ${sepTip.label}</span>
                            <span class="w-1 h-1 rounded-full bg-blue-300"></span>
                            <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Action Tip</span>
                        </div>
                        <p class="text-xs font-medium text-gray-700 leading-relaxed italic">"${sepTip.text}"</p>
                        <div class="mt-2 flex items-center gap-1.5">
                            <span class="iconify text-blue-400 text-xs" data-icon="mdi:brain"></span>
                            <span class="text-[9px] font-bold text-gray-500 uppercase">${sepTip.mindset}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${cccTip ? `
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm group hover:shadow-md transition-all">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm shrink-0 border border-amber-50 group-hover:scale-110 transition-transform">
                        <span class="iconify text-xl" data-icon="mdi:telescope"></span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-black text-orange-600 uppercase tracking-widest">Concept: ${cccTip.label}</span>
                            <span class="w-1 h-1 rounded-full bg-orange-300"></span>
                            <span class="text-[9px] font-black text-amber-500 uppercase tracking-widest">Big Picture</span>
                        </div>
                        <p class="text-xs font-medium text-gray-700 leading-relaxed italic">"${cccTip.text}"</p>
                        <div class="mt-2 flex items-center gap-1.5">
                            <span class="iconify text-orange-400 text-xs" data-icon="mdi:lightbulb-on"></span>
                            <span class="text-[9px] font-bold text-gray-500 uppercase">${cccTip.mindset}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Repository of domain-agnostic scientific coaching tips and growth mindset prompts.
 */
function getCoachingTipsData(sep) {
    const repository = {
        'SEP1': {
            label: 'Asking Questions',
            text: "Don't worry about having the \"right\" question yet. Focus on what makes you curious—every great discovery started with someone noticing a pattern and wondering \"why?\"",
            mindset: 'Embrace Curiosity'
        },
        'SEP2': {
            label: 'Developing Models',
            text: "Your model is a tool for thinking, not a finished piece of art! If your model feels \"messy,\" that means you're working through the complex parts of the system. Keep iterating!",
            mindset: 'Iteration is Key'
        },
        'SEP3': {
            label: 'Planning Investigations',
            text: "Think about what you *can* control and what might change. A \"failed\" experiment is just data that tells you where to look next. How can we make our test more fair?",
            mindset: 'Learning from Failure'
        },
        'SEP4': {
            label: 'Analyzing Data',
            text: "Data can be noisy! Look for the \"patterns\" amidst the chaos. What do the numbers say when you step back? If the data is unexpected, that's where the real science begins.",
            mindset: 'Evidence-Based Thinking'
        },
        'SEP5': {
            label: 'Computational Thinking',
            text: "Math is the language we use to describe patterns in nature. Break the big problem into smaller pieces. Can you see a rule or relationship that stays the same?",
            mindset: 'Precision & Logic'
        },
        'SEP6': {
            label: 'Constructing Explanations',
            text: "Use your evidence like a lawyer! Connect what you *saw* (evidence) to *why* it happened (science ideas). It's okay if your initial idea changes as you learn more.",
            mindset: 'Revising our Thinking'
        },
        'SEP7': {
            label: 'Scientific Argument',
            text: "In science, we argue to get closer to the truth, not to \"win.\" Listen to other ideas—they might help you see a gap in your own evidence that you can fix!",
            mindset: 'Collaborative Growth'
        },
        'SEP8': {
            label: 'Communicating Information',
            text: "How can you make your findings clear to someone who wasn't there? Use diagrams, labels, and clear language. Your voice helps our scientific community grow.",
            mindset: 'Voice of Science'
        }
    };
    return repository[sep];
}

/**
 * Repository of Crosscutting Concept (CCC) coaching tips.
 */
function getCccTipsData(cccId) {
    const cccMap = {
        'cat_patterns': {
            label: 'Patterns',
            text: 'Look for things that repeat! Patterns help us predict what might happen next. Does this happen every time, or just under certain conditions?',
            mindset: 'Predictive Thinking'
        },
        'cat_causes': {
            label: 'Cause & Effect',
            text: 'Every effect has a cause. When you change one thing, what else reacts? Sometimes the cause is hidden, and we have to dig deeper to find the mechanism.',
            mindset: 'Logical Reasoning'
        },
        'cat_systems': {
            label: 'Systems',
            text: 'Nothing in science happens in isolation. How do the different parts of this system interact? What happens if you take one piece away?',
            mindset: 'Systems Thinking'
        },
        'cat_energy': {
            label: 'Energy & Matter',
            text: 'Track the flow! Where is the energy coming from, and where does it go? Matter is never lost, it just changes form. Follow the cycle.',
            mindset: 'Conservation Mindset'
        }
    };
    return cccMap[cccId];
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
 * Renders the presentation overlay when a teacher is presenting work to the class.
 */
export async function renderPresentationLayer() {
    const content = document.getElementById('mainContent');
    const pres = App.sharedData.currentPresentation;
    if (!content || !pres) return;

    content.innerHTML = `
        <div class="h-full flex flex-col -m-6 relative overflow-hidden bg-gray-900">
            <div class="absolute inset-0 z-0 opacity-20">
                <div class="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>
            
            <div class="relative z-10 p-6 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/10">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span class="iconify text-2xl" data-icon="mdi:presentation"></span>
                    </div>
                    <div>
                        <h2 class="text-white font-black text-xl uppercase tracking-tighter">Class Presentation</h2>
                        <p class="text-blue-400 text-xs font-bold uppercase tracking-widest mt-0.5">
                            ${pres.type === 'exemplar' ? 'Teacher Exemplar' : `Viewing Work: ${pres.studentName || 'Peer'}`}
                        </p>
                    </div>
                </div>
                <div class="px-4 py-2 bg-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-[0.2em]">
                    Focus Mode Active
                </div>
            </div>

            <div class="flex-1 relative overflow-hidden" id="presentationContainer">
                <div id="presentationContent" class="w-full h-full p-8 flex items-center justify-center text-white/50 italic">
                    Loading presented content...
                </div>
            </div>
        </div>
    `;

    // Load the specific content
    if (pres.type === 'exemplar') {
        const exemplar = App.teacherSettings.exemplars[pres.moduleId];
        if (exemplar) {
            // Temporarily swap work state to render the exemplar
            const originalWork = deepClone(App.work);
            App.work = deepClone(exemplar);
            const container = document.getElementById('presentationContent');
            if (container) {
                const renderers = {
                    questions: renderQuestionsModule,
                    models: renderModelsModule,
                    analysis: renderAnalysisModule,
                    explanations: renderExplanationsModule
                };
                const html = renderers[pres.moduleId]?.() || '<p>Content not available</p>';
                container.innerHTML = `<div class="w-full h-full overflow-auto p-8 bg-white rounded-[3rem] shadow-2xl relative">${html}<div class="readonly-overlay pointer-events-auto"></div></div>`;
                
                if (pres.moduleId === 'models') setTimeout(() => initModelCanvas(), 50);
                if (pres.moduleId === 'analysis') setTimeout(() => initChart(), 50);
            }
            App.work = originalWork;
        }
    } else {
        // Fetch student work
        const { dbGet, STORE_SESSIONS } = await import('../core/storage.js');
        const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + pres.visitorId);
        if (saved && saved.work) {
            const originalWork = deepClone(App.work);
            App.work = saved.work;
            const container = document.getElementById('presentationContent');
            if (container) {
                if (pres.type === 'model') {
                    const { renderLiveModels, initViewerCanvas } = await import('../teacher/viewer.js');
                    container.innerHTML = `<div class="w-full h-full relative">${await renderLiveModels()}</div>`;
                    setTimeout(() => initViewerCanvas(), 50);
                    // Hide the sub-header back button
                    container.querySelector('button[onclick*="stopViewingStudent"]')?.classList.add('hidden');
                } else if (pres.type === 'data') {
                    const { renderLiveData } = await import('../teacher/viewer.js');
                    container.innerHTML = `<div class="w-full h-full overflow-auto bg-gray-50 rounded-[3rem] p-8">${await renderLiveData()}</div>`;
                    container.querySelector('button[onclick*="stopViewingStudent"]')?.classList.add('hidden');
                }
            }
            App.work = originalWork;
        }
    }
}

/**
 * Toggles the student's view between their own work and the teacher's exemplar.
 */
export async function toggleExemplarView() {
    App.isViewingExemplar = !App.isViewingExemplar;
    if (App.isViewingExemplar) {
        // Cache current work
        App.studentWorkCache = deepClone(App.work);
        
        // Show exemplar
        const exemplar = App.teacherSettings.exemplars?.[App.currentModule];
        if (exemplar) {
            App.work = deepClone(exemplar);
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
        <div class="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in duration-500 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100/50 m-4">
            <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-50">
                <span class="iconify text-6xl text-gray-200" data-icon="${icon}"></span>
            </div>
            <h3 class="text-2xl font-black text-gray-400 uppercase tracking-tighter">${title}</h3>
            <p class="text-gray-400 mt-2 max-w-md mx-auto leading-relaxed font-medium text-sm">${message}</p>
            ${showQR ? `
                <div class="mt-10 flex flex-col items-center gap-4">
                    <button onclick="window.showJoinQR()" class="px-8 py-4 bg-primary text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:opacity-90 flex items-center gap-3 transition-all hover:-translate-y-1">
                        <span class="iconify text-2xl" data-icon="mdi:qrcode"></span>
                        Show Class QR Code
                    </button>
                    <div class="px-6 py-2 bg-white text-purple-600 rounded-xl border border-purple-100 font-mono font-black text-lg tracking-widest shadow-sm">
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
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
                toast('Fullscreen not supported', 'error');
            });
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
