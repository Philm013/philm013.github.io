/**
 * @file main.js
 * @description Application entry point for InquiryOS.
 */

import { App } from './core/state.js';
import { initDB } from './core/storage.js';
import { loadNGSSData } from './core/ngss.js';
import { updateModeUI, switchMode } from './ui/renderer.js';
import { renderNavigation, toggleSidebar, showStudentModule, showTeacherModule } from './ui/navigation.js';
import { toast, copyCode, copyJoinLink, showJoinQR, closeQRCode } from './ui/utils.js';

// Auth / Login
import * as auth from './core/auth.js';

// Student Practices
import * as questions from './modules/questions.js';
import * as models from './modules/models.js';
import * as investigation from './modules/investigation.js';
import * as analysis from './modules/analysis.js';
import * as math from './modules/math.js';
import * as explanations from './modules/explanations.js';
import * as argument from './modules/argument.js';
import * as communication from './modules/communication.js';

// Teacher Tools
import * as dashboard from './teacher/dashboard.js';
import * as viewer from './teacher/viewer.js';
import * as noticeboard from './teacher/noticeboard.js';

// IMMEDIATE: Expose functions to global window object
// This MUST happen at the top level of the module so it is synchronous during script load.
window.App = App;
window.switchMode = switchMode;
window.updateModeUI = updateModeUI;
window.renderNavigation = renderNavigation;
window.toggleSidebar = toggleSidebar;
window.showStudentModule = showStudentModule;
window.showTeacherModule = showTeacherModule;
window.toast = toast;
window.copyCode = copyCode;
window.copyJoinLink = copyJoinLink;
window.showJoinQR = showJoinQR;
window.closeQRCode = closeQRCode;

// Expose all exported functions from modules
Object.assign(window, auth);
Object.assign(window, questions);
Object.assign(window, models);
Object.assign(window, investigation);
Object.assign(window, analysis);
Object.assign(window, math);
Object.assign(window, explanations);
Object.assign(window, argument);
Object.assign(window, communication);
Object.assign(window, dashboard);
Object.assign(window, viewer);
Object.assign(window, noticeboard);

/**
 * Initializes the application.
 */
async function init() {
    try {
        console.log('InquiryOS: Initializing...');
        
        // BACKGROUND: Storage and data
        await initDB();
        await loadNGSSData();
        
        // Routing logic for Class Code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const classCode = urlParams.get('class');
        if (classCode) {
            App.classCode = classCode.toUpperCase();
            toast(`Class code ${App.classCode} applied!`, 'info');
        }

        // Initialize Avatar Picker if element exists
        if (typeof window.renderAvatarPicker === 'function') {
            window.renderAvatarPicker();
        }

        console.log('InquiryOS: System Ready.');
    } catch (e) {
        console.error('InquiryOS Initialization Failed:', e);
    }
}

init();
