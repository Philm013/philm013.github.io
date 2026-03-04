/**
 * @file renderer.js
 * @description Main UI rendering engine for InquiryOS. Handles view switching between student and teacher modes and individual practice modules.
 */

import { App, getInitialWorkState } from '../core/state.js';
import { dbGetByIndex, STORE_USERS } from '../core/storage.js';
import { renderNavigation } from './navigation.js';
import { saveToStorage } from '../core/sync.js';
import { toast, deepClone } from './utils.js';
import { getSeptipById, SEPTipsLibrary, getCccTipById } from '../core/tips_library.js';

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
    renderCoachingManager,
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
export function renderDesktopNav() {
    if (window.innerWidth <= 768 || App.mode !== 'student') return '';
    
    const modules = [
        { id: 'overview', icon: 'mdi:view-dashboard' },
        { id: 'questions', icon: 'mdi:help-circle' },
        { id: 'models', icon: 'mdi:cube-outline' },
        { id: 'investigation', icon: 'mdi:microscope' },
        { id: 'analysis', icon: 'mdi:chart-line' },
        { id: 'math', icon: 'mdi:calculator' },
        { id: 'explanations', icon: 'mdi:lightbulb-on' },
        { id: 'argument', icon: 'mdi:forum' },
        { id: 'communication', icon: 'mdi:share-variant' }
    ];
    
    const currentIndex = modules.findIndex(m => m.id === App.currentModule);
    
    return `
        <div class="desktop-nav-container" role="navigation" aria-label="Quick Practice Navigation">
            <button onclick="window.navigateModule(-1)" class="nav-arrow-btn" ${currentIndex === 0 ? 'disabled opacity-30' : ''} aria-label="Previous Practice">
                <span class="iconify" data-icon="mdi:chevron-up" aria-hidden="true" data-width="20" data-height="20"></span>
            </button>
            <div class="nav-dot-container">
                ${modules.map((m, i) => {
                    const locked = !App.teacherSettings.moduleAccess[m.id] && m.id !== 'overview';
                    const isActive = App.currentModule === m.id;
                    return `
                        <button onclick="${locked ? '' : `window.showStudentModule('${m.id}')`}" 
                            class="desktop-nav-dot ${isActive ? 'active' : ''} ${locked ? 'opacity-20' : ''}" 
                            title="${m.id.toUpperCase()}"
                            aria-label="Go to ${m.id}"
                            aria-current="${isActive ? 'step' : 'false'}"
                            ${locked ? 'aria-disabled="true"' : ''}></button>
                    `;
                }).join('')}
            </div>
            <button onclick="window.navigateModule(1)" class="nav-arrow-btn" ${currentIndex === modules.length - 1 ? 'disabled opacity-30' : ''} aria-label="Next Practice">
                <span class="iconify" data-icon="mdi:chevron-down" aria-hidden="true" data-width="20" data-height="20"></span>
            </button>
        </div>
    `;
}

export function renderStudentContent() {
    if (App.mode === 'teacher' && (App.viewingStudentId || App.isExemplarMode)) { renderTeacherContent(); return; }
    if (App.mode === 'student' && App.sharedData.currentPresentation) { renderPresentationLayer(); return; }
    renderStatusBanner();

    const content = document.getElementById('mainContent');
    if (!content) return;

    const isMobile = window.innerWidth <= 768;

    // Desktop Nav Overlay
    if (!isMobile) {
        let navContainer = document.getElementById('desktopNavOverlay');
        if (!navContainer) {
            navContainer = document.createElement('div');
            navContainer.id = 'desktopNavOverlay';
            document.body.appendChild(navContainer);
        }
        navContainer.innerHTML = renderDesktopNav();
    } else {
        document.getElementById('desktopNavOverlay')?.remove();
    }

    if (isMobile) {
        // Mobile: Full continuous stack for gesture navigation
        const scrollPos = content.scrollTop;
        content.innerHTML = renderStudentContentHtml();
        content.scrollTop = scrollPos;
        content.style.scrollSnapType = 'y mandatory';
    } else {
        // Desktop: Dashboard style - ONLY active module
        content.innerHTML = renderActiveModuleHtml();
        content.style.scrollSnapType = 'none'; // Grid handles layout
    }

    setTimeout(() => {
        initModelCanvas(); initChart(); if (window.initDataTableSortable) window.initDataTableSortable();
        if (isMobile) setupModuleObserver();
        updateUIForActiveModule(App.currentModule);
    }, 50);
}

/**
 * Renders ONLY the currently active module for Desktop Dashboard view.
 * Now allows CSS Grid to handle multi-panel layouts (Explanations side-by-side with Canvas, etc.)
 */
export function renderActiveModuleHtml() {
    const renderers = { overview: renderOverviewModule, questions: renderQuestionsModule, models: renderModelsModule, investigation: renderInvestigationModule, analysis: renderAnalysisModule, math: renderMathModule, explanations: renderExplanationsModule, argument: renderArgumentModule, communication: renderCommunicationModule };
    const seps = { overview: '', questions: 'SEP1', models: 'SEP2', investigation: 'SEP3', analysis: 'SEP4', math: 'SEP5', explanations: 'SEP6', argument: 'SEP7', communication: 'SEP8' };
    
    const id = App.currentModule || 'overview';
    
    return `
        <div class="module-view-section active-dashboard" data-module-id="${id}">
            <div class="dashboard-content">
                ${renderCoachingBar(seps[id])}
                <div class="flex-1 min-h-0 overflow-hidden h-full">
                    ${renderers[id]()}
                </div>
            </div>
        </div>
    `;
}

/**
 * Returns the HTML for all student modules as a string (Mobile Stack).
 */
export function renderStudentContentHtml() {
    const modules = ['overview', 'questions', 'models', 'investigation', 'analysis', 'math', 'explanations', 'argument', 'communication'];
    const renderers = { overview: renderOverviewModule, questions: renderQuestionsModule, models: renderModelsModule, investigation: renderInvestigationModule, analysis: renderAnalysisModule, math: renderMathModule, explanations: renderExplanationsModule, argument: renderArgumentModule, communication: renderCommunicationModule };
    const seps = { overview: '', questions: 'SEP1', models: 'SEP2', investigation: 'SEP3', analysis: 'SEP4', math: 'SEP5', explanations: 'SEP6', argument: 'SEP7', communication: 'SEP8' };

    return modules.map(id => {
        const isLocked = !App.teacherSettings.moduleAccess[id] && id !== 'overview';
        if (isLocked) return '';
        const label = id.charAt(0).toUpperCase() + id.slice(1);
        return `
            <section class="module-view-section" data-module-id="${id}" aria-label="${label} Practice" role="region">
                ${renderCoachingBar(seps[id])}
                ${renderers[id]()}
            </section>
        `;
    }).join('');
}

window.renderStudentContentHtml = renderStudentContentHtml;

function setupModuleObserver() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    const observer = new IntersectionObserver((entries) => {
        if (App._isScrollingToModule) return;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                let moduleId = entry.target.dataset.moduleId;
                if (moduleId && App.currentModule !== moduleId) { 
                    App.currentModule = moduleId; 
                    updateUIForActiveModule(moduleId); 
                    const nav = document.getElementById('desktopNavOverlay');
                    if (nav) nav.innerHTML = renderDesktopNav();
                }
            }
        });
    }, { root: content, rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    
    content.querySelectorAll('.module-view-section').forEach(el => observer.observe(el));
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
export async function renderTeacherContent(force = false) {
    if (App.isExemplarMode && !App.viewingStudentId) {
        const content = document.getElementById('mainContent');
        if (content) {
            const scrollPos = content.scrollTop;
            content.innerHTML = await renderActivityDashboard();
            content.scrollTop = scrollPos;
            setTimeout(() => { if (App.currentModule === 'models') initModelCanvas(); if (App.currentModule === 'analysis') initChart(); content.scrollTop = scrollPos; }, 50);
        }
        return;
    }

    const content = document.getElementById('mainContent');
    if (!content) return;

    // Check if we are in a live view or specialized tool
    if (['livemodels', 'livedata', 'livegeneric'].includes(App.teacherModule) || App._editingAssetBank) {
        content.style.scrollSnapType = 'none';
        const liveRenderer = App._editingAssetBank ? renderIconManager : { livemodels: renderLiveModels, livedata: renderLiveData, livegeneric: renderLiveGeneric }[App.teacherModule];
        content.innerHTML = await liveRenderer();
        if (App.teacherModule === 'livemodels') setTimeout(() => initViewerCanvas(), 50);
        return;
    }

    // Stacked Dashboard Mode
    content.style.scrollSnapType = 'y mandatory';

    const modules = ['overview', 'lessons', 'snapshots', 'students', 'access', 'noticeboard', 'coaching', 'moderation', 'categories', 'icons', 'ngss', 'settings'];
    const renderers = { overview: renderTeacherOverview, lessons: renderTeacherLessons, snapshots: renderTeacherSnapshots, students: renderTeacherStudents, access: renderTeacherAccess, noticeboard: renderTeacherNoticeBoard, coaching: renderCoachingManager, moderation: renderModeration, categories: renderCategoryManager, icons: renderIconManager, ngss: renderNGSSBrowser, settings: renderSessionSettings };

    // Optimization: Check if stack is already built
    const sections = Array.from(content.querySelectorAll('.teacher-section'));
    if (sections.length === modules.length && !force) {
        // Update each section individually to preserve parent scroll position
        for (const id of modules) {
            const section = content.querySelector(`[data-teacher-module="${id}"]`);
            if (section) {
                const html = await renderers[id]();
                // Simple check to avoid unnecessary innerHTML writes (optional)
                if (section.innerHTML !== html) {
                    section.innerHTML = html;
                }
            }
        }
        setupTeacherModuleObserver();
        return;
    }

    // Full render (only if stack is missing or forced)
    const stack = await Promise.all(modules.map(async id => {
        const html = await renderers[id]();
        return `<div class="teacher-section w-full" data-teacher-module="${id}">${html}</div>`;
    }));

    content.innerHTML = stack.join('');
    
    // Only restore scroll position if we are not explicitly navigating/scrolling to a module
    if (!App._isScrollingToModule) {
        setTimeout(() => {
            setupTeacherModuleObserver();
        }, 50);
    } else {
        setTimeout(() => setupTeacherModuleObserver(), 50);
    }
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
        const labels = { overview: 'Classroom Command', lessons: 'Lesson Designer', snapshots: 'Activity Snapshots', students: 'Student Management', access: 'Access Control', noticeboard: 'Inquiry Board', coaching: 'Coaching Tips', moderation: 'Class Moderation', categories: 'Category Architect', icons: 'Asset Architect', ngss: 'NGSS Navigator', settings: 'Session Settings' };
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
    const isTeacher = App.mode === 'teacher';
    const activeCcc = App.teacherSettings?.categories?.find(c => c.id.startsWith('cat_'));
    
    return `
        <div class="sticky top-0 z-[80] flex flex-row items-center justify-between gap-2 p-3 bg-white/95 backdrop-blur-md border-b border-gray-100 shrink-0">
            <div class="flex items-center gap-2.5 overflow-hidden">
                <div class="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <span class="iconify text-white text-lg md:text-xl" data-icon="${icon}" data-width="20" data-height="20"></span>
                </div>
                <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-2">
                        <h2 class="text-xs md:text-sm font-black text-gray-900 truncate tracking-tight uppercase">${title}</h2>
                        ${sep ? `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] md:text-[8px] font-black border border-blue-100 uppercase tracking-widest">${sep}</span>` : ''}
                    </div>
                    ${activeCcc ? `
                        <div class="flex items-center gap-1">
                            <span class="text-[7px] md:text-[8px] font-black text-amber-600 uppercase tracking-widest truncate">${activeCcc.name}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="flex items-center gap-1.5 md:gap-2">
                ${App.teacherSettings.exemplars?.[App.currentModule] && App.mode === 'student' ? `
                    <button onclick="window.toggleExemplarView()" class="p-2 md:px-3 md:py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-purple-100 transition-all">
                        <span class="iconify" data-icon="mdi:lightbulb-on" data-width="14" data-height="14"></span>
                        <span class="hidden sm:inline">Exemplar</span>
                    </button>
                ` : ''}
                
                ${customButtons}
                
                ${infoTip ? `
                    <button onclick="window.toast('${infoTip}', 'info')" class="p-2 text-blue-400 hover:text-primary transition-colors">
                        <span class="iconify text-lg" data-icon="mdi:information-outline" data-width="18" data-height="18"></span>
                    </button>
                ` : ''}

                <button onclick="window.toggleModuleFullscreen()" class="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                    <span class="iconify text-lg md:text-xl" data-icon="${isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}" data-width="18" data-height="18"></span>
                </button>
            </div>
        </div>`;
}

export function renderCoachingBar(sepId) {
    const settings = App.teacherSettings;
    if (!settings.showSepTips && !settings.showCccTips) return '';
    if (App.mode !== 'student') return '';

    const activeCcc = App.teacherSettings?.categories?.find(c => c.id.startsWith('cat_'));
    
    let sepTip = null;
    const activeSepTipId = settings.activeTips?.[sepId];
    if (settings.showSepTips && activeSepTipId !== 'none') {
        sepTip = getSeptipById(activeSepTipId);
        if (!sepTip && settings.randomCoachingTips) {
            const elements = SEPTipsLibrary[sepId]?.elements || [];
            if (elements.length) sepTip = elements[Math.floor(Math.random() * elements.length)];
        }
    }

    let cccTip = null;
    const activeCccTipId = activeCcc ? settings.activeTips?.[activeCcc.id] : null;
    if (settings.showCccTips && activeCccTipId !== 'none') {
        cccTip = getCccTipById(activeCccTipId);
        if (!cccTip && activeCcc) cccTip = getCccTipById(activeCcc.id);
    }

    const tips = [];
    if (sepTip) tips.push({ type: 'Practice', ...sepTip });
    if (cccTip) tips.push({ type: 'Concept', ...cccTip });

    if (tips.length === 0) return '';

    return `
        <aside class="coaching-bar" aria-label="Scientific Coaching">
            <h3 class="coaching-bar-label">Coach's Corner</h3>
            <div class="flex gap-4 flex-1 min-w-0">
                ${tips.map(tip => `
                    <div class="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 min-w-0 max-w-md shadow-sm" role="note">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center ${tip.type === 'Practice' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} shrink-0">
                            <span class="iconify" data-icon="${tip.icon || (tip.type === 'Practice' ? 'mdi:comment-quote' : 'mdi:telescope')}" aria-hidden="true"></span>
                        </div>
                        <div class="min-w-0">
                            <p class="text-[8px] font-black uppercase text-gray-400 tracking-widest">${tip.type}: ${tip.label}</p>
                            <p class="text-xs text-gray-700 italic truncate" title="${tip.text}">"${tip.text}"</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </aside>
    `;
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
