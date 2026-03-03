/**
 * @file main.js
 * @description Application entry point for InquiryOS.
 */

import { App } from './core/state.js';
import { initDB } from './core/storage.js';
import { loadNGSSData, addToPhenomenon, setNgssBrowserSection, setNgssFilter, toggleNgssDimFilter, filterNGSSResults, viewPeDetails, toggleNgssMobileFilters, clearAllNgssFilters, viewElementPes, clearNgssPeFocus, openNgssElementFilterModal, addNgssElementFilter, removeNgssElementFilter } from './core/ngss.js';
import { loadSimulationsData, searchSimulations } from './core/sims.js';
import * as renderer from './ui/renderer.js';
import * as sync from './core/sync.js';
import * as utils from './ui/utils.js';
import { renderNavigation, toggleSidebar, showStudentModule, showTeacherModule, initTouchNavigation } from './ui/navigation.js';
import { toast, copyCode, copyJoinLink, showJoinQR, closeQRCode, openSessionMenu, closeSessionMenu, leaveSession, exportSession, importSession, handleImportFile, saveCurrentSession, viewEvidence, closeEvidenceViewer, openGenericInput, closeGenericInput, submitGenericInput } from './ui/utils.js';

// Auth / Login
import * as auth from './core/auth.js';

// Student Practices
import * as overview from './modules/overview.js';
import * as questions from './modules/questions.js';
import { openIconPicker, closeIconPicker, searchIcons, selectIcon, selectIconForNode, openNodeTagPicker, updateNodeColor } from './modules/models.js';
import * as models from './modules/models.js';
import { openRowNoteModal, closeRowNoteModal, saveRowNote, toggleRowNote } from './modules/investigation.js';
import * as investigation from './modules/investigation.js';
import * as analysis from './modules/analysis.js';
import * as math from './modules/math.js';
import * as explanations from './modules/explanations.js';
import { openArgumentFeedback, saveArgumentFeedback, flagPost, deletePost } from './modules/argument.js';
import * as argument from './modules/argument.js';
import * as communication from './modules/communication.js';

// Teacher Tools
import { launchTemplate, applyTemplate, previewTemplate, previewPreset, closeLessonPreview, saveCurrentAsLesson, deleteLesson, launchLesson, applyLessonToCurrent, removeFromPhenomenon } from './teacher/dashboard.js';
import * as dashboard from './teacher/dashboard.js';
import { switchViewerModule, stopViewingStudent, viewStudentWork, setFeedbackSticker, closeCommentModal, deleteComment, startCommentDrag, renderViewerNodes, handleViewerPointerDown, handleViewerWheel, handleViewerClick, openTableRowFeedback, addDataRowSticker } from './teacher/viewer.js';
import * as viewer from './teacher/viewer.js';
import { clearAllPosts, toggleDefaultCategories } from './teacher/noticeboard.js';
import * as noticeboard from './teacher/noticeboard.js';
import * as media from './ui/media.js';

// IMMEDIATE: Expose functions to global window object
window.App = App;
window.renderNavigation = renderNavigation;
window.toggleSidebar = toggleSidebar;
window.showStudentModule = showStudentModule;
window.showTeacherModule = showTeacherModule;
window.initTouchNavigation = initTouchNavigation;
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
window.viewEvidence = viewEvidence;
window.closeEvidenceViewer = closeEvidenceViewer;
window.showLogin = () => window.showView('loginView');
window.restorePersistedSession = auth.restorePersistedSession;
window.clearPersistedSession = auth.clearPersistedSession;
window.showLandingPage = auth.showLandingPage;
window.startNewInquiry = auth.startNewInquiry;
window.resumeActiveSession = auth.resumeActiveSession;
window.initPanelNavigation = auth.initPanelNavigation;
window.scrollToPanel = auth.scrollToPanel;
window.scrollLoginPanel = auth.scrollLoginPanel;
window.selectRole = auth.selectRole;
window.goToLoginStep = auth.goToLoginStep;
window.renderAvatarPicker = auth.renderAvatarPicker;
window.selectLoginAvatar = auth.selectLoginAvatar;
window.finishOnboarding = auth.finishOnboarding;

window.openIconPicker = openIconPicker;
window.closeIconPicker = closeIconPicker;
window.searchIcons = searchIcons;
window.selectIcon = selectIcon;
window.selectIconForNode = selectIconForNode;
window.openNodeTagPicker = openNodeTagPicker;
window.updateNodeColor = updateNodeColor;
window.switchViewerModule = switchViewerModule;
window.stopViewingStudent = stopViewingStudent;
window.viewStudentWork = viewStudentWork;
window.previewTemplate = previewTemplate;
window.previewPreset = previewPreset;
window.closeLessonPreview = closeLessonPreview;
window.launchTemplate = launchTemplate;
window.applyTemplate = applyTemplate;
window.addToPhenomenon = addToPhenomenon;
window.removeFromPhenomenon = removeFromPhenomenon;
window.saveCurrentAsLesson = saveCurrentAsLesson;
window.deleteLesson = deleteLesson;
window.launchLesson = launchLesson;
window.applyLessonToCurrent = applyLessonToCurrent;
window.setNgssBrowserSection = setNgssBrowserSection;
window.setNgssFilter = setNgssFilter;
window.toggleNgssDimFilter = toggleNgssDimFilter;
window.filterNGSSResults = filterNGSSResults;
window.viewPeDetails = viewPeDetails;
window.toggleNgssMobileFilters = toggleNgssMobileFilters;
window.clearAllNgssFilters = clearAllNgssFilters;
window.viewElementPes = viewElementPes;
window.clearNgssPeFocus = clearNgssPeFocus;
window.openNgssElementFilterModal = openNgssElementFilterModal;
window.addNgssElementFilter = addNgssElementFilter;
window.removeNgssElementFilter = removeNgssElementFilter;
window.openGenericInput = openGenericInput;
window.closeGenericInput = closeGenericInput;
window.submitGenericInput = submitGenericInput;
window.editInquiryItem = questions.editInquiryItem;
window.showTagPicker = questions.showTagPicker;
window.toggleContributionTag = questions.toggleContributionTag;
window.deleteInquiryItem = questions.deleteInquiryItem;
window.clearAllPosts = clearAllPosts;
window.toggleDefaultCategories = toggleDefaultCategories;
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
window.openRowNoteModal = openRowNoteModal;
window.closeRowNoteModal = closeRowNoteModal;
window.saveRowNote = saveRowNote;
window.toggleRowNote = toggleRowNote;
window.openArgumentFeedback = openArgumentFeedback;
window.saveArgumentFeedback = saveArgumentFeedback;
window.flagPost = flagPost;
window.deletePost = deletePost;

/**
 * Switches between top-level application views (login, app, docs, support).
 */
window.showView = (viewId) => {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
        v.style.display = 'none';
    });
    
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        target.classList.remove('hidden');
        target.style.display = (viewId === 'appView') ? 'flex' : 'block';
        if (viewId === 'loginView' || viewId === 'docsView' || viewId === 'supportView') {
            target.scrollTo(0, 0);
            if (viewId === 'loginView') {
                const persisted = localStorage.getItem('inquiryos_active_session');
                if (persisted && typeof window.showLandingPage === 'function') {
                    window.showLandingPage();
                } else {
                    // New user flow - ensure hero/features/roles are visible
                    document.getElementById('heroPanel')?.classList.remove('hidden');
                    document.getElementById('featuresPanel')?.classList.remove('hidden');
                    document.getElementById('rolesPanel')?.classList.remove('hidden');
                    document.getElementById('landingPanel')?.classList.add('hidden');
                    if (typeof window.initPanelNavigation === 'function') {
                        window.initPanelNavigation();
                    }
                    if (typeof window.loadRecentSessions === 'function') {
                        window.loadRecentSessions();
                    }
                }
            }
        }
    }
};

// Map remaining exports to window
Object.assign(window, media);
Object.assign(window, auth);
Object.assign(window, renderer);
Object.assign(window, sync);
Object.assign(window, utils);
Object.assign(window, overview);
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
        await initDB();
        await loadNGSSData();
        await loadSimulationsData();
        
        const urlParams = new URLSearchParams(window.location.search);
        const classCode = urlParams.get('class');
        if (classCode) {
            App.classCode = classCode.toUpperCase();
            const classInput = document.getElementById('loginClass');
            if (classInput) classInput.value = App.classCode;
            if (typeof window.selectRole === 'function') {
                window.selectRole('student');
            }
            toast(`Class code ${App.classCode} applied!`, 'info');
        }

        if (typeof window.initTouchNavigation === 'function') {
            window.initTouchNavigation();
        }

        // Try to restore session first
        const sessionRestored = await window.restorePersistedSession();

        if (!sessionRestored) {
            if (typeof window.renderAvatarPicker === 'function') {
                window.renderAvatarPicker();
            }

            if (typeof window.loadRecentSessions === 'function') {
                await window.loadRecentSessions();
            }
        }
        
        // Initialize Accessibility Utilities
        const { initAccessibilityUtilities } = await import('./ui/navigation.js');
        initAccessibilityUtilities();

        console.log('InquiryOS: System Ready.');
    } catch (e) {
        console.error('InquiryOS Initialization Failed:', e);
    }
}

init();
