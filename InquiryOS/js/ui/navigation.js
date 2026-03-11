/**
 * @file navigation.js
 * @description Handles application navigation, sidebar management, and module routing for both students and teachers.
 */

import { App } from '../core/state.js';
import { toast, calculateStudentProgress } from './utils.js';
import { renderStudentContent, renderTeacherContent, renderEvidenceBank } from './renderer.js';

// Accessibility Utilities State
let holdTimer = null;
const HOLD_DURATION = 600;

/**
 * Initializes accessibility utilities for mobile navigation.
 */
export function initAccessibilityUtilities() {
    const handle = document.getElementById('globalScrollHandle');
    if (!handle) return;

    handle.classList.remove('hidden');

    handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handle.classList.add('is-holding');
        holdTimer = setTimeout(() => {
            handle.classList.remove('is-holding');
            window.openQuickJump();
        }, HOLD_DURATION);
    });

    handle.addEventListener('pointerup', () => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
            if (handle.classList.contains('is-holding')) {
                handle.classList.remove('is-holding');
                window.scrollToNextPanel();
            }
        }
    });

    handle.addEventListener('pointerleave', () => {
        clearTimeout(holdTimer);
        holdTimer = null;
        handle.classList.remove('is-holding');
    });
}

/**
 * Scrolls the main content to the next snapped panel (Mobile) or next module (Desktop).
 */
window.scrollToNextPanel = () => {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        const container = document.getElementById('mainContent');
        if (!container) return;
        
        const panels = Array.from(container.querySelectorAll('[data-card-title]'));
        const currentScroll = container.scrollTop;
        const nextPanel = panels.find(p => p.offsetTop > currentScroll + 10);
        
        if (nextPanel) {
            nextPanel.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Wrap around to top if at end
            panels[0]?.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        // Desktop: Cycle to next module
        window.navigateModule(1);
    }
};

/**
 * Opens the 3/4 height Quick Jump menu.
 */
window.openQuickJump = () => {
    const drawer = document.getElementById('quickJumpDrawer');
    const overlay = document.getElementById('quickJumpOverlay');
    const content = document.getElementById('quickJumpContent');
    if (!drawer || !overlay || !content) return;

    const isTeacher = App.mode === 'teacher';
    const modules = isTeacher ? [
        { id: 'overview', icon: 'mdi:view-dashboard', label: 'Classroom Overview' },
        { id: 'lessons', icon: 'mdi:book-plus', label: 'Lesson Designer' },
        { id: 'snapshots', icon: 'mdi:camera-outline', label: 'Student Snapshots' },
        { id: 'access', icon: 'mdi:lock-open-variant', label: 'Access Controls' },
        { id: 'noticeboard', icon: 'mdi:bulletin-board', label: 'Inquiry Board' },
        { id: 'moderation', icon: 'mdi:shield-check', label: 'Moderation' },
        { id: 'ngss', icon: 'mdi:school', label: 'NGSS Navigator' },
        { id: 'settings', icon: 'mdi:cog', label: 'Settings' }
    ] : [
        { id: 'overview', icon: 'mdi:view-dashboard', label: 'Research Overview' },
        { id: 'questions', icon: 'mdi:help-circle', label: 'SEP1: Questions' },
        { id: 'models', icon: 'mdi:cube-outline', label: 'SEP2: Models' },
        { id: 'investigation', icon: 'mdi:microscope', label: 'SEP3: Investigations' },
        { id: 'analysis', icon: 'mdi:chart-line', label: 'SEP4: Analysis' },
        { id: 'math', icon: 'mdi:calculator', label: 'SEP5: Math' },
        { id: 'explanations', icon: 'mdi:lightbulb-on', label: 'SEP6: CER' },
        { id: 'argument', icon: 'mdi:forum', label: 'SEP7: Argument' },
        { id: 'communication', icon: 'mdi:share-variant', label: 'SEP8: Communication' }
    ];

    content.innerHTML = `
        <h3 class="text-xl font-black text-gray-900 uppercase mb-6 tracking-tight">Quick Jump</h3>
        <div class="grid grid-cols-1 gap-3">
            ${modules.map(m => `
                <button onclick="window.closeQuickJump(); ${isTeacher ? 'window.showTeacherModule' : 'window.showStudentModule'}('${m.id}')" 
                    class="w-full flex items-center gap-4 p-5 bg-gray-50 rounded-2xl active:bg-primary active:text-white transition-all group">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary group-active:bg-white/20 group-active:text-white shadow-sm">
                        <span class="iconify text-xl" data-icon="${m.icon}"></span>
                    </div>
                    <span class="text-sm font-black uppercase tracking-tight">${m.label}</span>
                </button>
            `).join('')}
        </div>
    `;

    drawer.classList.add('is-visible');
    overlay.classList.add('is-visible');
};

/**
 * Closes the Quick Jump menu.
 */
window.closeQuickJump = () => {
    document.getElementById('quickJumpDrawer')?.classList.remove('is-visible');
    document.getElementById('quickJumpOverlay')?.classList.remove('is-visible');
};

/**
 * Navigates to the next or previous module.
 * @param {number} direction - 1 for next, -1 for previous.
 */
window.navigateModule = async (direction) => {
    const modules = ['overview', 'questions', 'models', 'investigation', 'analysis', 'math', 'explanations', 'argument', 'communication'];
    const currentIndex = modules.indexOf(App.currentModule);
    let nextIndex = currentIndex + direction;
    
    // Find next available (unlocked) module
    while (nextIndex >= 0 && nextIndex < modules.length) {
        const id = modules[nextIndex];
        if (App.teacherSettings.moduleAccess[id] || id === 'overview') {
            window.showStudentModule(id);
            
            // Refresh desktop nav to update active dot and arrow state
            const nav = document.getElementById('desktopNavOverlay');
            if (nav) {
                const { renderDesktopNav } = await import('./renderer.js');
                nav.innerHTML = renderDesktopNav();
            }
            return;
        }
        nextIndex += direction;
    }
};

/**
 * Coaching Tips Handlers
 */
window.switchCoachingTip = (index) => {
    if (!App.uiState) App.uiState = {};
    App.uiState.activeCoachingIndex = index;
    const swiper = document.getElementById('coachingSwiper');
    if (swiper) {
        const target = swiper.querySelector(`[data-tip-index="${index}"]`);
        if (target) {
            App._isScrollingToCoaching = true;
            swiper.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
            setTimeout(() => { 
                App._isScrollingToCoaching = false; 
                updateSwipeDots(swiper, 'coachingDots');
            }, 500);
        }
    }
    renderStudentContent();
};

window.handleCoachingScroll = (el) => {
    if (App._isScrollingToCoaching) return;
    updateSwipeDots(el, 'coachingDots');
    const width = el.offsetWidth;
    const index = Math.round(el.scrollLeft / width);
    if (!App.uiState) App.uiState = {};
    if (App.uiState.activeCoachingIndex !== index) {
        App.uiState.activeCoachingIndex = index;
        // Minor visual sync if buttons exist
    }
};

window.toggleRandomTips = async () => {
    App.teacherSettings.randomCoachingTips = !App.teacherSettings.randomCoachingTips;
    const { saveToStorage } = await import('../core/sync.js');
    await saveToStorage();
    renderStudentContent();
};

/**
 * Handles dot navigation for horizontal swipers.
 */
/**
 * Handles dot navigation for horizontal swipers.
 */
window.updateSwipeDots = (swiper, dotsId) => {
    const dotsContainer = document.getElementById(dotsId);
    if (!dotsContainer || !swiper) return;
    const width = swiper.offsetWidth;
    const index = Math.round(swiper.scrollLeft / width);
    const dots = dotsContainer.querySelectorAll('.swipe-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === index);
    });
};

window.jumpToInquiryTab = (tabId) => {
    window.switchInquiryTab(tabId);
};

/**
 * Syncs swipe dots with horizontal scroll position.
 */
export function updateSwipeDots(container, dotContainerId) {
    const dots = document.getElementById(dotContainerId);
    if (!dots) return;
    
    const width = container.offsetWidth;
    const index = Math.round(container.scrollLeft / width);
    
    dots.querySelectorAll('.swipe-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

/**
 * Toggles the visibility of the sidebar on mobile devices.
 */
export function toggleSidebar(forceState) {
    if (window.innerWidth > 768) return; // Sidebar is fixed on desktop
    
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        if (forceState === true) {
            sidebar.classList.add('open');
            overlay.classList.add('open');
        } else if (forceState === false) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        } else {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    }
}

/**
 * Ensures the sidebar is closed on mobile devices.
 */
export function closeSidebar() {
    toggleSidebar(false);
}

/**
 * Switches the current student module view.
 * @param {string} moduleId - ID of the module to show.
 */
export async function showStudentModule(moduleId) {
    if (!App.teacherSettings.moduleAccess[moduleId] && moduleId !== 'overview') {
        toast('This module is locked by your teacher', 'warning');
        return;
    }

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        closeSidebar();
    }

    // If student is currently viewing an exemplar, restore their work before switching
    if (App.isViewingExemplar && App.studentWorkCache) {
        App.work = App.studentWorkCache;
        App.studentWorkCache = null;
        App.isViewingExemplar = false;
    }

    App.currentModule = moduleId;
    
    // Update persistence
    const { persistSession } = await import('../core/auth.js');
    persistSession();
    
    if (isMobile) {
        // ... (Mobile logic remains same)
    } else {
        // Desktop Dashboard: Re-render and reset focus
        if (!App.uiState) App.uiState = {};
        App.uiState.focusedPanelId = null; // Reset to show first panel of new module
        renderNavigation();
        renderStudentContent();
    }
}

/**
 * Switches the current teacher dashboard view.
 * @param {string} moduleId - ID of the teacher module to show.
 */
export async function showTeacherModule(moduleId) {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        closeSidebar();
    }
    
    App.teacherModule = moduleId;
    App._editingAssetBank = null;

    // Update persistence
    const { persistSession } = await import('../core/auth.js');
    persistSession();

    // Determine if this is a "stacked" module that we need to scroll to
    const stackedModules = ['overview', 'lessons', 'snapshots', 'students', 'access', 'noticeboard', 'coaching', 'moderation', 'categories', 'icons', 'ngss', 'settings'];
    const isStacked = stackedModules.includes(moduleId);

    if (isStacked) {
        // Optimization: Check if stack is already in DOM
        const content = document.getElementById('mainContent');
        const hasStack = content.querySelector('.teacher-section');
        
        if (!hasStack) {
            await renderTeacherContent(true); // Force initial render
        }

        const scrollBehavior = hasStack ? 'smooth' : 'auto';
        App._isScrollingToModule = true;
        
        // Find target
        const target = document.querySelector(`[data-teacher-module="${moduleId}"]`);
        if (target) {
            target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
            // Allow time for smooth scroll to finish
            setTimeout(() => { App._isScrollingToModule = false; }, scrollBehavior === 'smooth' ? 800 : 50);
        } else {
            // Fallback if not found (shouldn't happen if hasStack is true)
            await renderTeacherContent();
            App._isScrollingToModule = false;
        }
    } else {
        // Live view or specialized tool (always re-renders)
        await renderTeacherContent();
    }

    renderNavigation();
}

/**
 * Renders the navigation sidebar content based on the current mode (Student vs Teacher).
 */
export function renderNavigation() {
    try {
        const nav = document.getElementById('navContent');
        if (!nav) return;
        
        if (App.mode === 'teacher') {
            nav.innerHTML = `
                <h3 class="text-xs font-semibold text-gray-400 uppercase mb-3">Teacher Dashboard</h3>
                <ul class="space-y-1">
                    ${[
                        { id: 'overview', icon: 'mdi:view-dashboard', label: 'Overview' },
                        { id: 'lessons', icon: 'mdi:book-plus', label: 'Lesson Designer' },
                        { id: 'snapshots', icon: 'mdi:camera-outline', label: 'Student Snapshots' },
                        { id: 'students', icon: 'mdi:account-group', label: 'Students' },
                        { id: 'access', icon: 'mdi:lock-open-variant', label: 'Access Control' },
                        { id: 'noticeboard', icon: 'mdi:bulletin-board', label: 'Notice & Wonder Board' },
                        { id: 'coaching', icon: 'mdi:human-male-board', label: 'Coaching Tips' },
                        { id: 'livemodels', icon: 'mdi:cube-outline', label: 'View: Models' },
                        { id: 'livedata', icon: 'mdi:table', label: 'View: Data Tables' },
                        { id: 'moderation', icon: 'mdi:shield-check', label: 'Moderation' },
                        { id: 'categories', icon: 'mdi:folder-multiple', label: 'Categories' },
                        { id: 'icons', icon: 'mdi:emoticon', label: 'Asset Architect' },
                        { id: 'ngss', icon: 'mdi:school', label: 'NGSS Standards' },
                        { id: 'settings', icon: 'mdi:cog', label: 'Settings' }
                    ].map(m => `
                        <li>
                            <button onclick="window.showTeacherModule('${m.id}')" class="teacher-nav w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${App.teacherModule === m.id ? 'active' : 'text-gray-700 hover:bg-gray-100'}">
                                <span class="iconify" data-icon="${m.icon}"></span>
                                ${m.label}
                            </button>
                        </li>
                    `).join('')}
                </ul>
                
                <div class="mt-6 p-4 bg-gray-50 rounded-xl">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Class Stats</h4>
                    <div class="grid grid-cols-2 gap-2 text-center">
                        <div class="p-2 bg-blue-100 rounded-lg">
                            <p class="text-lg font-bold text-blue-700">${App.classStats?.notices || 0}</p>
                            <p class="text-[9px] text-blue-600 font-black uppercase">Notices</p>
                        </div>
                        <div class="p-2 bg-yellow-100 rounded-lg">
                            <p class="text-lg font-bold text-yellow-700">${App.classStats?.wonders || 0}</p>
                            <p class="text-[9px] text-yellow-600 font-black uppercase">Wonders</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const modules = [
                { id: 'overview', icon: 'mdi:view-dashboard', label: 'Overview' },
                { id: 'questions', icon: 'mdi:help-circle', label: '1. Questions' },
                { id: 'models', icon: 'mdi:cube-outline', label: '2. Models' },
                { id: 'investigation', icon: 'mdi:microscope', label: '3. Investigation' },
                { id: 'analysis', icon: 'mdi:chart-line', label: '4. Analysis' },
                { id: 'math', icon: 'mdi:calculator', label: '5. Math' },
                { id: 'explanations', icon: 'mdi:lightbulb-on', label: '6. Explanations' },
                { id: 'argument', icon: 'mdi:forum', label: '7. Argument' },
                { id: 'communication', icon: 'mdi:share-variant', label: '8. Communication' }
            ];
            
            const progress = calculateStudentProgress(App.work);
            
            nav.innerHTML = `
                <h3 class="text-xs font-semibold text-gray-400 uppercase mb-3">Science Practices</h3>
                <ul class="space-y-1">
                    ${modules.map(m => {
                        const locked = !App.teacherSettings.moduleAccess[m.id];
                        return `
                            <li>
                                <button onclick="${locked ? '' : `window.showStudentModule('${m.id}')`}" 
                                    class="nav-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${App.currentModule === m.id ? 'active' : 'text-gray-700 hover:bg-gray-100'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}">
                                    <span class="iconify" data-icon="${m.icon}"></span>
                                    <span class="flex-1 text-left">${m.label}</span>
                                    ${locked ? '<span class="iconify text-gray-400" data-icon="mdi:lock"></span>' : ''}
                                </button>
                            </li>
                        `;
                    }).join('')}
                </ul>
                
                <div class="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                    <h4 class="text-sm font-semibold text-gray-700 mb-2">Progress</h4>
                    <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-primary to-secondary transition-all" style="width:${progress}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">${progress}% Complete</p>
                </div>
            `;
            
            renderEvidenceBank();
        }
    } catch (e) {
        console.error('Error rendering navigation:', e);
    }
}

/**
 * Initializes touch gesture navigation for switching between modules on mobile.
 */
export function initTouchNavigation() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    const content = document.getElementById('mainContent');
    if (!content) return;

    const modules = [
        'overview', 'questions', 'models', 'investigation', 'analysis', 
        'math', 'explanations', 'argument', 'communication'
    ];

    content.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    content.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        if (App.mode !== 'student' || window.innerWidth > 768) return;
        if (['models', 'analysis', 'investigation'].includes(App.currentModule)) return;

        // Ensure it's a SIGNIFICANT horizontal swipe and NOT a vertical scroll
        if (Math.abs(deltaX) > Math.abs(deltaY) * 2 && Math.abs(deltaX) > 100) {
            const currentIndex = modules.indexOf(App.currentModule);
            if (deltaX < 0 && currentIndex < modules.length - 1) {
                showStudentModule(modules[currentIndex + 1]);
            } else if (deltaX > 0 && currentIndex > 0) {
                showStudentModule(modules[currentIndex - 1]);
            }
        }
    }, { passive: true });
}
