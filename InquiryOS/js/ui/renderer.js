/**
 * @file renderer.js
 * @description Main UI rendering engine for InquiryOS. Handles view switching between student and teacher modes and individual practice modules.
 */

import { App, getInitialWorkState } from '../core/state.js';
import { dbGetByIndex, STORE_USERS } from '../core/storage.js';
import { renderNavigation } from './navigation.js';
import { saveToStorage } from '../core/sync.js';
import { toast, deepClone, renderInfoTip } from './utils.js';


// Import Student Module Renderers
import { renderOverviewModule } from '../modules/overview.js';
import { renderQuestionsModule } from '../modules/questions.js';
import { renderModelsModule, initModelCanvas } from '../modules/models.js';
import { renderInvestigationModule } from '../modules/investigation.js';
import { renderAnalysisModule, initChart } from '../modules/analysis.js';
import { renderMathModule } from '../modules/math.js';
import { renderExplanationsModule } from '../modules/explanations.js';
import { renderArgumentModule } from '../modules/argument.js';
import { renderCommunicationModule } from '../modules/communication.js';

// Import Teacher Module Renderers
import { 
    renderTeacherOverview, 
    renderTeacherSnapshots, 
    renderActivityDashboard,
    renderTeacherLessons,
    renderTeacherStudents,
    renderTeacherAccess,
    renderSessionSettings,
    forceAllToModule
} from '../teacher/dashboard.js';
import { renderTeacherNoticeBoard, renderModeration, renderCategoryManager } from '../teacher/noticeboard.js';
import { renderLiveModels, renderLiveData, renderLiveGeneric, initViewerCanvas, renderIconManager } from '../teacher/viewer.js';
import { renderNGSSBrowser } from '../core/ngss.js';

window.forceAllToModule = forceAllToModule;

/**
 * Switches the application between student and teacher modes.
 */
export function switchMode(mode) {
    App.mode = mode;
    updateModeUI();
    saveToStorage();
}

/**
 * Updates the global UI state, headers, and navigation.
 */
export function updateModeUI() {
    try {
        const isTeacher = App.mode === 'teacher';
        const isFullscreen = App.modelState?.isFullscreen || false;
        document.body.classList.toggle('view-fullscreen', isFullscreen);
        
        const appView = document.getElementById('appView');
        if (appView) {
            appView.classList.toggle('view-student', !isTeacher);
            appView.classList.toggle('view-teacher', isTeacher);
            if (!isTeacher) {
                appView.setAttribute('data-current-module', App.currentModule);
            } else {
                appView.removeAttribute('data-current-module');
            }
        }

        let subtitle = isTeacher ? 'Teacher Mode' : 'Student Mode';
        if (isTeacher && App.viewingStudentId) subtitle = 'Viewing Student Work';
        
        const subtitleEl = document.getElementById('headerSubtitle');
        if (subtitleEl) subtitleEl.textContent = subtitle;
        
        const teacherGlobalEl = document.getElementById('teacherGlobalNav');
        if (teacherGlobalEl) {
            teacherGlobalEl.classList.toggle('hidden', !isTeacher);
            teacherGlobalEl.classList.toggle('flex', isTeacher);
        }

        const presentationEl = document.getElementById('presentationStatus');
        if (presentationEl) {
            presentationEl.classList.toggle('hidden', !App.sharedData.currentPresentation);
            presentationEl.classList.toggle('flex', !!App.sharedData.currentPresentation);
        }
        
        const studentNavEl = document.getElementById('teacherStudentNav');
        if (isTeacher && App.viewingStudentId && studentNavEl) {
            studentNavEl.classList.remove('hidden'); studentNavEl.classList.add('flex');
            dbGetByIndex(STORE_USERS, 'classCode', App.classCode).then(users => {
                const s = users.find(u => u.visitorId === App.viewingStudentId);
                const nameEl = document.getElementById('viewingName');
                const avatarEl = document.getElementById('viewingAvatar');
                if (s && nameEl && avatarEl) { nameEl.textContent = s.name; avatarEl.textContent = s.avatar || s.name.charAt(0).toUpperCase(); }
            });
        } else if (studentNavEl) {
            studentNavEl.classList.add('hidden'); studentNavEl.classList.remove('flex');
        }
        
        const headerIcon = document.getElementById('headerIcon');
        if (headerIcon) headerIcon.className = `w-10 h-10 rounded-xl flex items-center justify-center ${isTeacher ? 'bg-gradient-to-br from-teacher to-orange-500' : 'bg-gradient-to-br from-primary to-secondary'}`;
        
        const appHeader = document.getElementById('appHeader');
        if (appHeader) appHeader.className = `${isTeacher ? 'bg-red-50' : 'bg-white'} shadow-sm border-b flex-shrink-0`;
        
        const eb = document.getElementById('evidenceBank');
        if (eb) eb.style.display = (isTeacher && !App.viewingStudentId) ? 'none' : 'block';
        
        // Mobile Bottom Nav
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav && window.innerWidth <= 768) {
            const navItems = isTeacher ? [
                { id: 'overview', icon: 'mdi:view-dashboard', label: 'Home' },
                { id: 'snapshots', icon: 'mdi:camera-outline', label: 'Snaps' },
                { id: 'noticeboard', icon: 'mdi:bulletin-board', label: 'Board' },
                { id: 'students', icon: 'mdi:account-group', label: 'Class' }
            ] : [
                { id: 'overview', icon: 'mdi:view-dashboard', label: 'Home' },
                { id: 'questions', icon: 'mdi:help-circle', label: 'Quest' },
                { id: 'models', icon: 'mdi:cube-outline', label: 'Model' },
                { id: 'analysis', icon: 'mdi:chart-line', label: 'Data' },
                { id: 'explanations', icon: 'mdi:lightbulb-on', label: 'CER' }
            ];
            const current = isTeacher ? App.teacherModule : App.currentModule;
            const clickFn = isTeacher ? 'window.showTeacherModule' : 'window.showStudentModule';
            bottomNav.innerHTML = `
                <div class="flex justify-around items-center h-full w-full px-2">
                    ${navItems.map(item => `
                        <button onclick="${clickFn}('${item.id}')" class="flex flex-col items-center justify-center h-full transition-all ${current === item.id ? (isTeacher ? 'text-teacher scale-110' : 'text-primary scale-110') : 'text-gray-400'}">
                            <span class="iconify text-xl" data-icon="${item.icon}"></span>
                            <span class="text-[8px] font-black uppercase mt-1 tracking-tighter">${item.label}</span>
                        </button>
                    `).join('')}
                    <button onclick="window.toggleSidebar()" class="flex flex-col items-center justify-center h-full text-gray-400"><span class="iconify text-xl" data-icon="mdi:menu"></span><span class="text-[8px] font-black uppercase mt-1 tracking-tighter">More</span></button>
                </div>`;
        }

        renderNavigation();
        if (isTeacher) renderTeacherContent(); else renderStudentContent();
    } catch (e) { console.error('UI Error:', e); }
}

/**
 * Renders all student modules in a continuous vertical stack.
 */
export function renderStudentContent() {
    if (App.mode === 'teacher' && (App.isExemplarMode || App.viewingStudentId)) { renderTeacherContent(); return; }
    if (App.mode === 'student' && App.sharedData.currentPresentation) { renderPresentationLayer(); return; }
    renderStatusBanner();
    
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = renderStudentContentHtml();

    setTimeout(() => {
        initModelCanvas(); initChart(); if (window.initDataTableSortable) window.initDataTableSortable();
        setupModuleObserver();
        if (!App._isScrollingToModule) {
            const target = document.querySelector(`[data-card-title="${App.currentModule === 'overview' ? 'The Mystery' : getModuleFirstPanelTitle(App.currentModule)}"]`);
            if (target) { App._isScrollingToModule = true; target.scrollIntoView({ behavior: 'auto' }); setTimeout(() => { App._isScrollingToModule = false; }, 500); }
        }
    }, 50);
}

/**
 * Returns the HTML for all student modules as a string.
 */
export function renderStudentContentHtml() {
    const modules = ['overview', 'questions', 'models', 'investigation', 'analysis', 'math', 'explanations', 'argument', 'communication'];
    const renderers = { overview: renderOverviewModule, questions: renderQuestionsModule, models: renderModelsModule, investigation: renderInvestigationModule, analysis: renderAnalysisModule, math: renderMathModule, explanations: renderExplanationsModule, argument: renderArgumentModule, communication: renderCommunicationModule };

    return modules.map(id => {
        const isLocked = !App.teacherSettings.moduleAccess[id] && id !== 'overview';
        return isLocked ? '' : renderers[id]();
    }).join('');
}

window.renderStudentContentHtml = renderStudentContentHtml;

function getModuleFirstPanelTitle(moduleId) {
    const map = { overview: 'The Mystery', questions: 'Phenomenon', models: 'Model Canvas', investigation: 'Experimental Variables', analysis: 'Chart Designer', math: 'Calculator', explanations: 'Evidence Bank', argument: 'Argument Board', communication: 'Poster Builder' };
    return map[moduleId];
}

function setupModuleObserver() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    const observer = new IntersectionObserver((entries) => {
        if (App._isScrollingToModule) return;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const moduleId = findModuleByPanelTitle(entry.target.dataset.cardTitle);
                if (moduleId && App.currentModule !== moduleId) { App.currentModule = moduleId; updateUIForActiveModule(moduleId); }
            }
        });
    }, { root: content, rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    content.querySelectorAll('[data-card-title]').forEach(panel => observer.observe(panel));
}

function findModuleByPanelTitle(title) {
    const reverseMap = { 
        'The Mystery': 'overview', 'Scientific Story': 'overview', 'Research Progress': 'overview', 'Quick Actions': 'overview', 
        'Phenomenon': 'questions', 'Inquiry Board': 'questions', 'Driving Questions': 'questions', 
        'Classroom Board': 'noticeboard',
        'Model Canvas': 'models', 'Model Explanations': 'models', 
        'Experimental Variables': 'investigation', 'Data Collection Table': 'investigation', 
        'Chart Designer': 'analysis', 'Statistical Summary': 'analysis', 
        'Calculator': 'math', 'Mathematical Assets': 'math', 'Unit Conversion': 'math', 'Computational Log': 'math', 
        'Evidence Bank': 'explanations', 'Scientific Claim': 'explanations', 'Evidence Description': 'explanations', 'Reasoning': 'explanations', 
        'Argument Board': 'argument', 
        'Poster Builder': 'communication' 
    };
    return reverseMap[title];
}

function updateUIForActiveModule(moduleId) {
    const header = document.querySelector('#appHeader h1');
    if (header) {
        const labels = { 
            overview: 'Research Overview', 
            questions: 'Asking Questions', 
            models: 'Developing & Using Models', 
            investigation: 'Planning Investigations', 
            analysis: 'Analyzing & Interpreting Data', 
            math: 'Using Math & Thinking', 
            explanations: 'Constructing Explanations', 
            argument: 'Argument from Evidence', 
            communication: 'Communicating Information' 
        };
        header.textContent = labels[moduleId] || 'InquiryOS';
    }

    const appView = document.getElementById('appView');
    if (appView && App.mode === 'student') {
        appView.setAttribute('data-current-module', moduleId);
    }
    
    // Toggle has-dots for scroll handle positioning on mobile
    const modulesWithDots = ['questions'];
    document.body.classList.toggle('has-dots', modulesWithDots.includes(moduleId) && window.innerWidth <= 768);

    document.querySelectorAll('.nav-btn, #bottomNav button').forEach(btn => {
        const btnModule = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (btnModule) {
            const isActive = btnModule === moduleId;
            btn.classList.toggle('active', isActive);
            if (btn.querySelector('.iconify')) btn.classList.toggle('text-primary', isActive);
        }
    });
}

/**
 * Renders all teacher modules in a continuous vertical stack.
 */
export async function renderTeacherContent() {
    if (App.isExemplarMode) {
        const content = document.getElementById('mainContent');
        if (content) {
            content.innerHTML = await renderActivityDashboard();
            setTimeout(() => { if (App.currentModule === 'models') initModelCanvas(); if (App.currentModule === 'analysis') initChart(); }, 50);
        }
        return;
    }

    const content = document.getElementById('mainContent');
    if (!content) return;
    
    if (['livemodels', 'livedata', 'livegeneric'].includes(App.teacherModule) || App._editingAssetBank) {
        content.style.scrollSnapType = 'none';
        const liveRenderer = App._editingAssetBank ? renderIconManager : { livemodels: renderLiveModels, livedata: renderLiveData, livegeneric: renderLiveGeneric }[App.teacherModule];
        content.innerHTML = await liveRenderer();
        if (App.teacherModule === 'livemodels') setTimeout(() => initViewerCanvas(), 50);
        return;
    }

    content.style.scrollSnapType = 'y mandatory';

    const modules = ['overview', 'lessons', 'snapshots', 'students', 'access', 'noticeboard', 'moderation', 'categories', 'icons', 'ngss', 'settings'];
    const renderers = { overview: renderTeacherOverview, lessons: renderTeacherLessons, snapshots: renderTeacherSnapshots, students: renderTeacherStudents, access: renderTeacherAccess, noticeboard: renderTeacherNoticeBoard, moderation: renderModeration, categories: renderCategoryManager, icons: renderIconManager, ngss: renderNGSSBrowser, settings: renderSessionSettings };

    const stack = await Promise.all(modules.map(async id => {
        const html = await renderers[id]();
        return `<div class="teacher-section w-full" data-teacher-module="${id}">${html}</div>`;
    }));

    content.innerHTML = stack.join('');

    setTimeout(() => {
        setupTeacherModuleObserver();
        if (!App._isScrollingToModule) {
            const target = document.querySelector(`[data-teacher-module="${App.teacherModule}"]`);
            if (target) { App._isScrollingToModule = true; target.scrollIntoView({ behavior: 'auto' }); setTimeout(() => { App._isScrollingToModule = false; }, 500); }
        }
    }, 50);
}

function setupTeacherModuleObserver() {
    const content = document.getElementById('mainContent');
    if (!content || App.mode !== 'teacher') return;
    const observer = new IntersectionObserver((entries) => {
        if (App._isScrollingToModule) return;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const moduleId = entry.target.dataset.teacherModule;
                if (moduleId && App.teacherModule !== moduleId) { App.teacherModule = moduleId; updateUIForActiveTeacherModule(moduleId); }
            }
        });
    }, { root: content, rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    content.querySelectorAll('.teacher-section').forEach(section => observer.observe(section));
}

function updateUIForActiveTeacherModule(moduleId) {
    const header = document.querySelector('#appHeader h1');
    if (header) {
        const labels = { overview: 'Classroom Command', lessons: 'Lesson Designer', snapshots: 'Activity Snapshots', students: 'Student Management', access: 'Access Control', noticeboard: 'Inquiry Board', moderation: 'Class Moderation', categories: 'Category Architect', icons: 'Asset Architect', ngss: 'NGSS Navigator', settings: 'Session Settings' };
        header.textContent = labels[moduleId] || 'InquiryOS';
    }

    // Toggle has-dots for scroll handle positioning on mobile
    const modulesWithDots = ['noticeboard'];
    document.body.classList.toggle('has-dots', modulesWithDots.includes(moduleId) && window.innerWidth <= 768);

    document.querySelectorAll('.teacher-nav, #bottomNav button').forEach(btn => {
        const btnModule = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (btnModule) {
            const isActive = btnModule === moduleId;
            btn.classList.toggle('active', isActive);
            if (btn.querySelector('.iconify')) btn.classList.toggle('text-teacher', isActive);
        }
    });
}

export function renderModuleHeader(title, icon, sep, customButtons = '', infoTip = '') {
    const isFullscreen = !!document.fullscreenElement;
    const activeCcc = App.teacherSettings?.categories?.find(c => c.id.startsWith('cat_'));
    return `
        <div class="mb-0 md:mb-4 lg:mb-6 flex flex-col shrink-0 md:border-0 bg-white">
            <div class="flex flex-row items-center justify-between gap-2 p-2 md:p-0 sticky top-0 md:relative z-[70] md:z-0 bg-white border-b md:border-0">
                <div class="flex items-center gap-2 overflow-hidden">
                    <div class="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary to-secondary rounded-lg md:rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all">
                        <span class="iconify text-white text-lg md:text-xl lg:text-2xl" data-icon="${icon}"></span>
                    </div>
                    <div class="flex flex-col md:flex-row md:items-center md:gap-3 min-w-0">
                        <div class="flex items-center gap-2">
                            <h2 class="text-sm md:text-xl lg:text-3xl font-black text-gray-900 truncate tracking-tight leading-tight">${title}</h2>
                            ${infoTip ? renderInfoTip(infoTip) : ''}
                        </div>
                        <div class="flex items-center gap-1.5 mt-0.5 md:mt-0">
                            ${sep ? `<span class="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-50 text-blue-600 rounded text-[7px] md:text-[10px] lg:text-xs font-black border border-blue-100 uppercase tracking-widest">${sep}</span>` : ''}
                            ${activeCcc ? `<span class="px-1.5 py-0.5 md:px-2 md:py-1 bg-amber-50 text-amber-600 rounded text-[7px] md:text-[10px] lg:text-xs font-black border border-amber-100 uppercase tracking-widest">${activeCcc.name}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1 md:gap-2">
                    ${App.teacherSettings.exemplars?.[App.currentModule] && App.mode === 'student' ? `<button onclick="window.toggleExemplarView()" class="px-2 py-1.5 md:px-4 md:py-2 bg-purple-50 text-purple-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-purple-100 transition-all"><span class="iconify" data-icon="mdi:lightbulb-on"></span><span class="hidden sm:inline">Teacher Example</span></button>` : ''}
                    ${customButtons}
                    <button onclick="window.toggleModuleFullscreen()" class="p-2 text-gray-400 hover:text-gray-600 transition-colors"><span class="iconify text-xl" data-icon="${isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}"></span></button>
                </div>
            </div>
            ${App.mode === 'student' ? renderCoachingTips(sep, activeCcc) : ''}
        </div>`;
}

function renderCoachingTips(sep, ccc) {
    const sepTip = getCoachingTipsData(sep);
    const cccTip = ccc ? getCccTipsData(ccc.id) : null;
    if (!sepTip && !cccTip) return '';
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 p-2 md:p-0 mt-3 md:mt-4">
            ${sepTip ? `<div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-start gap-3 shadow-sm group hover:shadow-md transition-all">
                <div class="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0 border border-blue-50"><span class="iconify text-lg md:text-xl" data-icon="mdi:comment-quote"></span></div>
                <div class="flex-1 overflow-hidden"><div class="flex items-center gap-2 mb-0.5"><span class="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest">${sepTip.label}</span></div><p class="text-[10px] md:text-xs text-gray-700 leading-relaxed italic line-clamp-2 md:line-clamp-none">"${sepTip.text}"</p></div>
            </div>` : ''}
            ${cccTip ? `<div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-start gap-3 shadow-sm group hover:shadow-md transition-all">
                <div class="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl flex items-center justify-center text-orange-600 shadow-sm shrink-0 border border-amber-50"><span class="iconify text-lg md:text-xl" data-icon="mdi:telescope"></span></div>
                <div class="flex-1 overflow-hidden"><div class="flex items-center gap-2 mb-0.5"><span class="text-[8px] md:text-[10px] font-black text-orange-600 uppercase tracking-widest">${cccTip.label}</span></div><p class="text-[10px] md:text-xs text-gray-700 leading-relaxed italic line-clamp-2 md:line-clamp-none">"${cccTip.text}"</p></div>
            </div>` : ''}
        </div>`;
}

function getCoachingTipsData(sep) {
    const repository = {
        'SEP1': { label: 'Asking Questions', text: "Focus on what makes you curious—every great discovery started with a notice and wonder.", mindset: 'Embrace Curiosity' },
        'SEP2': { label: 'Developing Models', text: "Your model is a tool for thinking. It's okay if it feels messy while you work!", mindset: 'Iteration is Key' },
        'SEP3': { label: 'Investigations', text: "Think about what you can control. How can we make our test more fair?", mindset: 'Learning from Failure' },
        'SEP4': { label: 'Analyzing Data', text: "Data can be noisy! Look for the patterns amidst the chaos.", mindset: 'Evidence-Based Thinking' },
        'SEP5': { label: 'Math', text: "Math is the language of patterns. Break the big problem into smaller pieces.", mindset: 'Precision & Logic' },
        'SEP6': { label: 'Explanations', text: "Use your evidence like a lawyer! Connect what you saw to why it happened.", mindset: 'Revising our Thinking' },
        'SEP7': { label: 'Argument', text: "We argue to get closer to the truth. Listen to other ideas.", mindset: 'Collaborative Growth' },
        'SEP8': { label: 'Communication', text: "How can you make your findings clear to someone who wasn't there?", mindset: 'Voice of Science' }
    };
    return repository[sep];
}

function getCccTipsData(cccId) {
    const cccMap = {
        'cat_patterns': { label: 'Patterns', text: 'Look for things that repeat! Patterns help us predict what might happen next.', mindset: 'Predictive Thinking' },
        'cat_causes': { label: 'Cause & Effect', text: 'Every effect has a cause. When you change one thing, what else reacts?', mindset: 'Logical Reasoning' },
        'cat_systems': { label: 'Systems', text: 'How do the different parts interact? What happens if you take one piece away?', mindset: 'Systems Thinking' },
        'cat_energy': { label: 'Energy & Matter', text: 'Track the flow! Where is the energy coming from, and where does it go?', mindset: 'Conservation Mindset' }
    };
    return cccMap[cccId];
}

export function renderStatusBanner() {
    const banner = document.getElementById('statusBanner');
    if (!banner || App.mode !== 'student') { if (banner) banner.classList.add('hidden'); return; }
    let html = '';
    if (App.teacherSettings.forceModule) html += `<div class="bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold animate-pulse"><span class="iconify" data-icon="mdi:map-marker-path"></span><span>GUIDED: ${App.teacherSettings.forceModule.toUpperCase()}</span></div>`;
    if (App.teacherSettings.showFeedbackToStudents && (App.work.modelComments?.length > 0 || App.work.modelStickers?.length > 0)) html += `<div class="bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold border-t border-blue-500"><span class="iconify" data-icon="mdi:comment-check"></span><span>New Teacher feedback!</span><button onclick="window.showStudentModule('models')" class="ml-2 px-2 py-0.5 bg-white text-blue-600 rounded text-xs">View</button></div>`;
    if (App.teacherSettings.exemplars?.[App.currentModule]) html += `<div class="bg-purple-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold border-t border-purple-500"><span class="iconify" data-icon="mdi:lightbulb-on"></span><span>TEACHER EXAMPLE READY</span><button onclick="window.toggleExemplarView()" class="ml-2 px-3 py-0.5 bg-white text-purple-600 rounded-full text-xs">${App.isViewingExemplar ? 'Back' : 'View'}</button></div>`;
    if (html) { banner.innerHTML = html; banner.classList.remove('hidden'); } else banner.classList.add('hidden');
}

export function renderEvidenceBank() {
    const list = document.getElementById('evidenceList'); if (!list) return;
    if (App.work.evidence.length === 0) list.innerHTML = '<p class="text-amber-600 italic text-xs">Empty</p>';
    else list.innerHTML = App.work.evidence.map(e => `<div class="p-2 bg-white rounded border border-amber-200" onclick="window.viewEvidence('${e.id}')"><div class="flex items-center gap-2 min-w-0"><span class="iconify text-amber-600" data-icon="${e.icon || 'mdi:file-document'}"></span><span class="text-xs font-medium truncate">${e.title}</span></div></div>`).join('');
}

export async function renderPresentationLayer() {
    const content = document.getElementById('mainContent');
    const pres = App.sharedData.currentPresentation;
    if (!content || !pres) return;
    content.innerHTML = `
        <div class="h-full flex flex-col -m-6 relative overflow-hidden bg-gray-900">
            <div class="relative z-10 p-4 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><span class="iconify text-xl" data-icon="mdi:presentation"></span></div>
                    <div><h2 class="text-white font-black text-sm uppercase">Presentation</h2><p class="text-blue-400 text-[10px] font-bold uppercase">${pres.studentName || 'Peer'}</p></div>
                </div>
                <div class="px-3 py-1 bg-white/10 rounded-lg text-white text-[8px] font-black uppercase">Focus Mode</div>
            </div>
            <div class="flex-1 relative overflow-hidden" id="presentationContainer">
                <div id="presentationContent" class="w-full h-full p-4 flex items-center justify-center text-white/50 italic">Loading...</div>
            </div>
        </div>`;

    const { dbGet, STORE_SESSIONS } = await import('../core/storage.js');
    const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + pres.visitorId);
    if (saved && saved.work) {
        const originalWork = deepClone(App.work); App.work = saved.work;
        const container = document.getElementById('presentationContent');
        if (container) {
            if (pres.type === 'model') {
                const { renderLiveModels, initViewerCanvas } = await import('../teacher/viewer.js');
                container.innerHTML = `<div class="w-full h-full relative">${await renderLiveModels()}</div>`;
                setTimeout(() => initViewerCanvas(), 50);
            } else if (pres.type === 'data') {
                const { renderLiveData } = await import('../teacher/viewer.js');
                container.innerHTML = `<div class="w-full h-full overflow-auto bg-gray-50 rounded-[2rem] p-4">${await renderLiveData()}</div>`;
            }
        }
        App.work = originalWork;
    }
}

export async function toggleExemplarView() {
    App.isViewingExemplar = !App.isViewingExemplar;
    if (App.isViewingExemplar) { App.studentWorkCache = deepClone(App.work); const ex = App.teacherSettings.exemplars?.[App.currentModule]; App.work = ex ? deepClone(ex) : getInitialWorkState(); }
    else { if (App.studentWorkCache) App.work = App.studentWorkCache; App.studentWorkCache = null; }
    renderNavigation(); renderStudentContent();
}

export function renderEmptyState(title, message, icon = 'mdi:folder-open-outline', showQR = false) {
    return `
        <div class="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 m-4">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm"><span class="iconify text-4xl text-gray-200" data-icon="${icon}"></span></div>
            <h3 class="text-lg font-black text-gray-400 uppercase">${title}</h3>
            <p class="text-gray-400 mt-1 max-w-md mx-auto text-xs font-medium">${message}</p>
            ${showQR ? `<button onclick="window.showJoinQR()" class="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase shadow-lg">Show QR</button>` : ''}
        </div>`;
}

export function toggleModuleFullscreen() {
    const el = document.getElementById('appView'); if (!el) return;
    if (!document.fullscreenElement) { if (el.requestFullscreen) el.requestFullscreen().catch(e => toast('Error', 'error')); }
    else { if (document.exitFullscreen) document.exitFullscreen(); }
}
