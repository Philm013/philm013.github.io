/**
 * @file main.js
 * @description Application entry point for InquiryOS.
 */

import { App } from './core/state.js';
import { initDB } from './core/storage.js';
import { loadNGSSData } from './core/ngss.js';
import { loadSimulationsData, searchSimulations } from './core/sims.js';
import * as renderer from './ui/renderer.js';
import * as sync from './core/sync.js';
import * as utils from './ui/utils.js';
import * as ngss from './core/ngss.js';
import { renderNavigation, toggleSidebar, showStudentModule, showTeacherModule } from './ui/navigation.js';
import { toast, copyCode, copyJoinLink, showJoinQR, closeQRCode, openSessionMenu, closeSessionMenu, leaveSession, exportSession, importSession, handleImportFile, saveCurrentSession } from './ui/utils.js';

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
window.renderNavigation = renderNavigation;
window.toggleSidebar = toggleSidebar;
window.showStudentModule = showStudentModule;
window.showTeacherModule = showTeacherModule;
window.toast = toast;
window.copyCode = copyCode;
window.copyJoinLink = copyJoinLink;
window.showJoinQR = showJoinQR;
window.closeQRCode = closeQRCode;
window.openSessionMenu = openSessionMenu;
window.closeSessionMenu = closeSessionMenu;
window.leaveSession = leaveSession;
window.exportSession = exportSession;
window.importSession = importSession;
window.handleImportFile = handleImportFile;
window.saveCurrentSession = saveCurrentSession;
window.searchSimulations = searchSimulations;

import { openGenericInput, closeGenericInput, submitGenericInput } from './ui/utils.js';
window.openGenericInput = openGenericInput;
window.closeGenericInput = closeGenericInput;
window.submitGenericInput = submitGenericInput;

// Explicitly expose new functions
import { openIconPicker, closeIconPicker, searchIcons, selectIcon, selectIconForNode } from './modules/models.js';
import { switchViewerModule, stopViewingStudent } from './teacher/viewer.js';
import { launchTemplate, applyTemplate, previewTemplate, previewPreset, closeLessonPreview } from './teacher/dashboard.js';

window.openIconPicker = openIconPicker;
window.closeIconPicker = closeIconPicker;
window.searchIcons = searchIcons;
window.selectIcon = selectIcon;
window.selectIconForNode = selectIconForNode;
window.switchViewerModule = switchViewerModule;
window.stopViewingStudent = stopViewingStudent;
window.previewTemplate = previewTemplate;
window.previewPreset = previewPreset;
window.closeLessonPreview = closeLessonPreview;

import { editInquiryItem, addCustomItem, deleteCustomItem } from './modules/questions.js';
window.editInquiryItem = editInquiryItem;
window.addCustomItem = addCustomItem;
window.deleteCustomItem = deleteCustomItem;
import { viewStudentWork } from './teacher/viewer.js';
window.viewStudentWork = viewStudentWork;
window.launchTemplate = launchTemplate;
window.applyTemplate = applyTemplate;

import { clearAllPosts, toggleDefaultCategories } from './teacher/noticeboard.js';
window.clearAllPosts = clearAllPosts;
window.toggleDefaultCategories = toggleDefaultCategories;

import { setFeedbackSticker, closeCommentModal, deleteComment, startCommentDrag, renderViewerNodes, handleViewerPointerDown, handleViewerWheel, handleViewerClick, openTableRowFeedback, addDataRowSticker } from './teacher/viewer.js';
window.setFeedbackSticker = setFeedbackSticker;
window.closeCommentModal = closeCommentModal;
window.deleteComment = deleteComment;
window.startCommentDrag = startCommentDrag;
window.renderViewerNodes = renderViewerNodes;
window.handleViewerPointerDown = handleViewerPointerDown;
window.handleViewerWheel = handleViewerWheel;
window.handleViewerClick = handleViewerClick;
window.openTableRowFeedback = openTableRowFeedback;
window.addDataRowSticker = addDataRowSticker;

import { openRowNoteModal, closeRowNoteModal, saveRowNote, toggleRowNote } from './modules/investigation.js';
window.openRowNoteModal = openRowNoteModal;
window.closeRowNoteModal = closeRowNoteModal;
window.saveRowNote = saveRowNote;
window.toggleRowNote = toggleRowNote;

import { openArgumentFeedback, saveArgumentFeedback, flagPost, deletePost } from './modules/argument.js';
window.openArgumentFeedback = openArgumentFeedback;
window.saveArgumentFeedback = saveArgumentFeedback;
window.flagPost = flagPost;
window.deletePost = deletePost;

import * as media from './ui/media.js';
Object.assign(window, media);

// Expose all exported functions from modules
Object.assign(window, auth);
Object.assign(window, renderer);
Object.assign(window, sync);
Object.assign(window, utils);
Object.assign(window, ngss);
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
        await loadSimulationsData();
        
        // Routing logic for Class Code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const classCode = urlParams.get('class');
        if (classCode) {
            App.classCode = classCode.toUpperCase();
            const classInput = document.getElementById('loginClass');
            if (classInput) classInput.value = App.classCode;
            
            // Auto-select student role and move to step 2
            if (typeof window.selectRole === 'function') {
                window.selectRole('student');
            }
            
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
