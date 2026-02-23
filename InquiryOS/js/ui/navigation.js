/**
 * @file navigation.js
 * @description Handles application navigation, sidebar management, and module routing for both students and teachers.
 */

import { App } from '../core/state.js';
import { toast } from './utils.js';
import { renderStudentContent, renderTeacherContent, renderEvidenceBank } from './renderer.js';

/**
 * Toggles the visibility of the sidebar on mobile devices.
 */
export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

/**
 * Switches the current student module view.
 * @param {string} moduleId - ID of the module to show.
 */
export function showStudentModule(moduleId) {
    if (!App.teacherSettings.moduleAccess[moduleId]) {
        toast('This module is locked by your teacher', 'warning');
        return;
    }
    App.currentModule = moduleId;
    renderNavigation();
    renderStudentContent();
    
    if (window.innerWidth < 768) {
        toggleSidebar();
    }
}

/**
 * Switches the current teacher dashboard view.
 * @param {string} moduleId - ID of the teacher module to show.
 */
export function showTeacherModule(moduleId) {
    App.teacherModule = moduleId;
    renderNavigation();
    renderTeacherContent();
    
    if (window.innerWidth < 768) {
        toggleSidebar();
    }
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
                        { id: 'livemodels', icon: 'mdi:cube-outline', label: 'View: Models' },
                        { id: 'livedata', icon: 'mdi:table', label: 'View: Data Tables' },
                        { id: 'moderation', icon: 'mdi:shield-check', label: 'Moderation' },
                        { id: 'categories', icon: 'mdi:folder-multiple', label: 'Categories' },
                        { id: 'icons', icon: 'mdi:emoticon', label: 'Icon Library' },
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
            `;
        } else {
            const modules = [
                { id: 'questions', icon: 'mdi:help-circle', label: '1. Questions' },
                { id: 'models', icon: 'mdi:cube-outline', label: '2. Models' },
                { id: 'investigation', icon: 'mdi:microscope', label: '3. Investigation' },
                { id: 'analysis', icon: 'mdi:chart-line', label: '4. Analysis' },
                { id: 'math', icon: 'mdi:calculator', label: '5. Math' },
                { id: 'explanations', icon: 'mdi:lightbulb-on', label: '6. Explanations' },
                { id: 'argument', icon: 'mdi:forum', label: '7. Argument' },
                { id: 'communication', icon: 'mdi:share-variant', label: '8. Communication' }
            ];
            
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
            `;
            
            renderEvidenceBank();
        }
    } catch (e) {
        console.error('Error rendering navigation:', e);
    }
}
