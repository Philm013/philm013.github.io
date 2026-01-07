import { DESKTOP_MEDIA_QUERY, APP_NAMESPACE } from './config.js';
import { deriveLanguageFromName, getMimeType, toggleElementVisibility } from './utils.js';
import { ApplicationStateService } from './state.js';
import { CustomEditorService } from './editorService.js';
import { AIChatService } from './aiService.js';

// --- View Controller (UI Interactions) ---
const ViewControllerInternal = (() => {
    // --- DOM Element References ---
    // Sidebar elements
    const sidebar = document.getElementById('sidebar-container');
    const sidebarOpenBtn = document.getElementById('sidebar-menu-toggle');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop-element');

    // File action buttons
    const createFileBtn = document.getElementById('create-file-btn');
    const loadFileBtn = document.getElementById('load-file-btn');
    const fileLoaderInput = document.getElementById('file-loader-input');

    const createRuleBtn = document.getElementById('create-rule-btn');

    // Editor action buttons
    const togglePadBtn = document.getElementById('toggle-pad-btn'); // NEW
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const formatCodeBtn = document.getElementById('format-code-action');
    const downloadFileBtn = document.getElementById('download-file-action');
    const fullscreenToggleBtn = document.getElementById('fullscreen-toggle-action');
    const addTabBtn = document.getElementById('add-tab-btn');

    const appContainer = document.getElementById('app-container');

    // AI Chat Modal elements
    const floatingAiChatBtn = document.getElementById('floating-ai-chat-trigger');
    const mainAiChatModal = document.getElementById('main-ai-chat-modal');
    const mainAiChatCloseBtn = document.getElementById('main-ai-chat-close-btn');
    const mainAiChatSendBtn = document.getElementById('main-ai-chat-send-btn');
    const mainAiChatInput = document.getElementById('main-ai-chat-input');
    const aiChatModalHeader = mainAiChatModal?.querySelector('.ai-chat-modal-header');

    // NEW: Dev PAD Modal elements
    const padModal = document.getElementById('pad-modal');
    const padModalCloseBtn = document.getElementById('pad-modal-close-btn');
    const padSendBtn = document.getElementById('pad-send-btn');
    const padInput = document.getElementById('pad-input');
    const padLog = document.getElementById('pad-log');

    const ruleEditorModal = document.getElementById('rule-editor-modal');
    const ruleEditorCloseBtn = document.getElementById('rule-editor-close-btn');
    const ruleEditorSaveBtn = document.getElementById('rule-editor-save-btn');
    const ruleEditorNameInput = document.getElementById('rule-editor-name');
    const ruleEditorDescriptionInput = document.getElementById('rule-editor-description');
    const ruleEditorContentTextarea = document.getElementById('rule-editor-content');
    let currentEditingRuleName = null;

    // --- Sidebar Management ---
    const openSidebar = () => {
        if (!DESKTOP_MEDIA_QUERY.matches) { // Only open overlay on mobile
            sidebar?.classList.add('is-open');
            sidebarBackdrop?.classList.add('is-visible');
            sidebarOpenBtn?.setAttribute('aria-expanded', 'true');
        } else {
            // On desktop, toggle the closed class
            toggleDesktopSidebar(false); // Explicitly open
        }
    };
    const closeSidebar = () => {
        if (!DESKTOP_MEDIA_QUERY.matches) { // Only close overlay on mobile
             sidebar?.classList.remove('is-open');
             sidebarBackdrop?.classList.remove('is-visible');
             sidebarOpenBtn?.setAttribute('aria-expanded', 'false');
        } else {
             // On desktop, toggle the closed class
             toggleDesktopSidebar(true); // Explicitly close
        }
    };
    // Toggle sidebar state on desktop (persisted)
     const toggleDesktopSidebar = (forceClose = null) => {
         if (!appContainer) return;
         let shouldBeClosed;
         if (forceClose === true) {
             shouldBeClosed = true;
         } else if (forceClose === false) {
             shouldBeClosed = false;
         } else {
             shouldBeClosed = !appContainer.classList.contains('desktop-sidebar-closed');
         }

         appContainer.classList.toggle('desktop-sidebar-closed', shouldBeClosed);
         localStorage.setItem(`${APP_NAMESPACE}_desktopSidebarClosed`, shouldBeClosed ? 'true' : 'false');
          // Refresh editor after animation might finish
          setTimeout(() => CustomEditorService.getEditorInstance()?.refresh(), 360); // Match CSS transition duration + buffer
     };


    // --- File/Tab Interaction Handlers ---
    const handleFileSelect = (fileId) => {
        ApplicationStateService.dispatch({ type: 'ACTIVATE_TAB_REQUESTED', payload: { id: fileId } });
        if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar(); // Close mobile sidebar on selection
    };
    const handleTabSelect = (fileId) => {
        ApplicationStateService.dispatch({ type: 'ACTIVATE_TAB_REQUESTED', payload: { id: fileId } });
    };
    const handleTabClose = (event, fileId) => {
        event.stopPropagation(); // Prevent tab selection when clicking close button
        ApplicationStateService.dispatch({ type: 'CLOSE_TAB_REQUESTED', payload: { id: fileId } });
    };

    // --- File Action Handlers ---
    const handleFileCreate = () => {
        ApplicationStateService.dispatch({ type: 'CREATE_FILE_REQUESTED' });
        if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar(); // Close mobile sidebar after action
    };
    const handleFileLoadRequest = () => {
        fileLoaderInput?.click(); // Trigger hidden file input
    };

    const handleFileLoad = async (event) => { // MODIFIED: Made async to handle multiple files sequentially
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        let lastFileIdLoaded = null;

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                // Use a Promise to handle FileReader's async nature within the loop
                await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const content = e.target.result;
                            const fileId = `${APP_NAMESPACE}_loaded_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}_${file.size}_${file.lastModified}`;
                            const fileName = file.name;
                            const fileLanguage = deriveLanguageFromName(fileName);
                            const currentState = ApplicationStateService.getState();
                            const existingFile = currentState.fileRegistry[fileId];

                            if (existingFile) {
                                if (existingFile.content === content) {
                                    AIChatService?.showNotification(`File "${fileName}" already open and content matches. Activating.`, "info");
                                    ApplicationStateService.dispatch({ type: 'ACTIVATE_TAB_REQUESTED', payload: { id: fileId } });
                                    lastFileIdLoaded = fileId;
                                } else if (confirm(`File "${fileName}" exists but content differs. Overwrite editor version with loaded file?`)) {
                                    ApplicationStateService.dispatch({ type: 'ADD_LOADED_FILE', payload: { id: fileId, name: fileName, content: content, language: fileLanguage } });
                                    AIChatService?.showNotification(`File "${fileName}" updated.`, "info");
                                    lastFileIdLoaded = fileId;
                                } else {
                                    AIChatService?.showNotification(`Load cancelled for "${fileName}".`, "info");
                                }
                            } else {
                                ApplicationStateService.dispatch({ type: 'ADD_LOADED_FILE', payload: { id: fileId, name: fileName, content: content, language: fileLanguage } });
                                AIChatService?.showNotification(`File "${fileName}" loaded.`, "success");
                                lastFileIdLoaded = fileId;
                            }
                            resolve(); // Resolve promise after processing this file
                        } catch (error) {
                            console.error(`Error processing loaded file "${fileName}":`, error);
                            AIChatService?.showNotification(`Error loading file "${fileName}": ${error.message}`, "error");
                            reject(error); // Reject promise on error
                        }
                    };
                    reader.onerror = (e) => {
                        console.error(`Error reading file "${file.name}":`, e.target.error);
                        AIChatService?.showNotification(`Error reading file "${file.name}": ${e.target.error}`, "error");
                        reject(e.target.error); // Reject promise on read error
                    };
                    reader.readAsText(file);
                });
            }

            // After all files are processed
            if (lastFileIdLoaded) {
                 // Optionally, activate the last successfully loaded file if multiple were selected
                 // ApplicationStateService.dispatch({ type: 'ACTIVATE_TAB_REQUESTED', payload: { id: lastFileIdLoaded } });
            }
            if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar();

        } catch (error) {
            // This catch block is for errors in the loop structure or unhandled rejections from the Promise
            console.error("Error during multiple file load process:", error);
            AIChatService?.showNotification("An error occurred while loading some files.", "error");
        } finally {
            event.target.value = null; // Reset input to allow loading same file(s) again
        }
    };

    const handleFileRename = (event, fileId) => {
        event.stopPropagation(); // Prevent file selection
        const file = ApplicationStateService.getState().fileRegistry[fileId];
        if (!file) return;
        const newName = prompt(`Enter new name for "${file.name}":`, file.name);
        // Check if name is valid, not empty, and actually changed
        if (newName !== null && newName.trim() !== '' && newName.trim() !== file.name) {
            ApplicationStateService.dispatch({ type: 'RENAME_FILE_REQUESTED', payload: { id: fileId, newName: newName.trim() } });
        } else if (newName !== null) {
             AIChatService?.showNotification("Invalid or unchanged filename.", "warning");
        } // If null, user cancelled
    };
    const handleFileDelete = (event, fileId) => {
        event.stopPropagation(); // Prevent file selection
        const file = ApplicationStateService.getState().fileRegistry[fileId];
        if (!file) return;
        if (confirm(`Delete "${file.name}"? This action cannot be undone.`)) {
            ApplicationStateService.dispatch({ type: 'DELETE_FILE_REQUESTED', payload: { id: fileId } });
            AIChatService?.showNotification(`File "${file.name}" deleted.`, "info");
        }
    };

    // --- Editor Action Handlers ---
    const handleToggleView = () => {
        const currentMode = ApplicationStateService.getState().viewMode;
        ApplicationStateService.dispatch({ type: 'SET_VIEW_MODE', payload: currentMode === 'edit' ? 'preview' : 'edit' });
    };
    const handleFormatCode = () => {
        CustomEditorService.formatContent(); // Call formatting service
    };
    const handleDownloadFile = () => {
         const state = ApplicationStateService.getState();
         const file = state.fileRegistry[state.activeFileId];
         if (!file) { AIChatService?.showNotification("No active file to download.", "warning"); return; }
         try {
             const content = CustomEditorService.getContent(); // Get current content from editor
             const blob = new Blob([content || ''], { type: getMimeType(file.language) });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = file.name; // Use current filename
             document.body.appendChild(a); // Append to body to ensure click works
             a.click(); // Simulate click
             document.body.removeChild(a); // Clean up link
             URL.revokeObjectURL(url); // Release object URL
         } catch (error) {
              console.error("Download failed:", error);
              AIChatService?.showNotification(`Download failed: ${error.message}`, "error");
         }
    };

    // --- Fullscreen Handling ---
    const handleFullscreenToggle = () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            appContainer?.requestFullscreen().catch(err => {
                 console.error("Fullscreen request failed:", err);
                 AIChatService?.showNotification(`Fullscreen failed: ${err.message}`, "error");
            });
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                 document.exitFullscreen();
            }
        }
    };
    // Syncs the fullscreen button icon based on current fullscreen state
    const syncFullscreenButton = () => {
         if (!fullscreenToggleBtn) return;
         const enterIcon = fullscreenToggleBtn.querySelector('.enter-fullscreen-icon');
         const exitIcon = fullscreenToggleBtn.querySelector('.exit-fullscreen-icon');
         if (!enterIcon || !exitIcon) return;

         const isFullscreen = !!document.fullscreenElement;
         toggleElementVisibility(enterIcon, !isFullscreen, 'inline');
         toggleElementVisibility(exitIcon, isFullscreen, 'inline');
         fullscreenToggleBtn.title = isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen";
         fullscreenToggleBtn.setAttribute('aria-label', fullscreenToggleBtn.title);
    };

    // --- AI Chat Modal ---
    const openAiChatModal = () => {
        if (!mainAiChatModal) return;
        mainAiChatModal.classList.add('is-visible');
        // Blur editor to prevent accidental typing while chat is open
        CustomEditorService.getEditorInstance()?.getInputField().blur();
        AIChatService.updateChatContextDisplay(); // Update context when opening
        // Focus input after a short delay for transition
        setTimeout(() => {
             mainAiChatInput?.focus();
             autoResizeChatInput(); // Adjust size on focus
        }, 100);
    };
    const closeAiChatModal = () => {
        if (!mainAiChatModal) return;
        mainAiChatModal.classList.remove('is-visible');
        // Return focus to editor when closing chat (optional, consider user preference)
        // CustomEditorService.getEditorInstance()?.focus();
    };
    // Dragging logic for AI Chat Modal
    let isDragging = false, dragOffsetX, dragOffsetY;
    const startDrag = (e) => {
         // Only allow dragging on desktop via the header, excluding controls
         if (!DESKTOP_MEDIA_QUERY.matches || e.target.closest('.header-controls, input, button, textarea, .ai-suggestion-actions') || !aiChatModalHeader?.contains(e.target)) return;
         isDragging = true;
         aiChatModalHeader?.classList.add('is-dragging');
         document.body.classList.add('is-dragging-modal'); // Prevent text selection during drag
         const modalContent = mainAiChatModal.querySelector('.ai-chat-modal-content');
         if (!modalContent) return;
         const rect = modalContent.getBoundingClientRect();
         // Calculate offset from top-left corner of the modal content
         dragOffsetX = e.clientX - rect.left;
         dragOffsetY = e.clientY - rect.top;
         // Add listeners to document to track mouse movement everywhere
         document.addEventListener('mousemove', onDrag);
         document.addEventListener('mouseup', endDrag, { once: true }); // Remove listener after mouse up
    };
    const onDrag = (e) => {
         if (!isDragging) return;
         e.preventDefault(); // Prevent default drag behavior (like text selection)
         const modalContent = mainAiChatModal.querySelector('.ai-chat-modal-content');
         if (!modalContent) return;
         // Calculate new position, constrained within viewport
         const vW = window.innerWidth, vH = window.innerHeight;
         const mW = modalContent.offsetWidth, mH = modalContent.offsetHeight;
         let newLeft = e.clientX - dragOffsetX;
         let newTop = e.clientY - dragOffsetY;
         // Clamp position to stay within viewport boundaries
         newLeft = Math.max(0, Math.min(newLeft, vW - mW));
         newTop = Math.max(0, Math.min(newTop, vH - mH));
         // Apply transform based on center offset (smoother for centered modals)
         // Apply transform. newLeft and newTop are the target absolute viewport coordinates for the modal's top-left.
         // This assumes modalContent's CSS places its origin (0,0 point for transforms) at the viewport center (e.g., using left: 50%, top: 50%).
         // The calculated transformX and transformY will then shift it from the center to place its top-left at (newLeft, newTop).
         const transformX = newLeft - vW / 2;
         const transformY = newTop - vH / 2;
         modalContent.style.transform = `translate(${transformX}px, ${transformY}px)`;
    };
    const endDrag = () => {
         if (!isDragging) return;
         isDragging = false;
         aiChatModalHeader?.classList.remove('is-dragging');
         document.body.classList.remove('is-dragging-modal');
         document.removeEventListener('mousemove', onDrag);
         // No need to remove mouseup listener as { once: true } was used
    };
    // Auto-resize chat input textarea based on content
    const autoResizeChatInput = () => {
        if(mainAiChatInput) {
            mainAiChatInput.style.height = 'auto'; // Reset height to calculate scroll height
            const minH = parseInt(getComputedStyle(mainAiChatInput).minHeight, 10) || 40; // Get min-height from CSS
            // Set height to scrollHeight or minHeight, whichever is larger, up to maxHeight
            mainAiChatInput.style.height = Math.max(minH, mainAiChatInput.scrollHeight) + 'px';
        }
    };
    window.autoResizeChatInput = autoResizeChatInput; // Expose globally if needed elsewhere
    
    // --- NEW: Dev PAD Modal ---
    const handleTogglePad = () => {
        ApplicationStateService.dispatch({ type: 'PAD_TOGGLE_VISIBILITY' });
    };
    
    const handlePadSend = () => {
        const prompt = padInput?.value.trim();
        if (prompt) {
            AIChatService.handleSendPadMessage(prompt);
            padInput.value = '';
            padInput.style.height = 'auto';
        }
    };
    
    const handlePadQuestionSubmit = (event) => {
        event.preventDefault();
        const form = event.target;
        const state = ApplicationStateService.getState();
        const pad = state.padState.currentPad;
        if (!pad || !pad.clarificationQuestions) return;

        let aggregatedAnswers = "Here are my answers to your questions:\n\n";
        pad.clarificationQuestions.forEach((q, index) => {
            const answerInput = form.querySelector(`#pad-q-input-${index}`);
            const answer = answerInput ? answerInput.value.trim() : "(Input not found)";
            aggregatedAnswers += `Q: ${q}\nA: ${answer || '(No answer provided)'}\n\n`;
        });
        
        AIChatService.handleSendPadMessage(aggregatedAnswers);
    };

    // --- Re-added: Rule Editor Modal ---
    const openRuleEditor = (ruleName = null) => {
         if (!ruleEditorModal || !ruleEditorNameInput || !ruleEditorDescriptionInput || !ruleEditorContentTextarea) {
             console.error("Rule editor modal elements not found.");
             return;
         }
         currentEditingRuleName = ruleName; // Store the name (null for new)
         if (ruleName) {
              // Edit existing rule
              const ruleData = ApplicationStateService.getState().userRules[ruleName];
              if (!ruleData) {
                   AIChatService?.showNotification(`Rule "${ruleName}" not found for editing.`, "warning");
                   return;
              }
              ruleEditorNameInput.value = ruleName;
              ruleEditorNameInput.readOnly = true; // Prevent changing name during edit
              ruleEditorDescriptionInput.value = ruleData.description || '';
              ruleEditorContentTextarea.value = ruleData.content || '';
              ruleEditorModal.querySelector('h2').textContent = "Edit Rule";
         } else {
              // Create new rule
              ruleEditorNameInput.value = '';
              ruleEditorNameInput.readOnly = false; // Allow entering name
              ruleEditorDescriptionInput.value = '';
              ruleEditorContentTextarea.value = '';
              ruleEditorModal.querySelector('h2').textContent = "Create New Rule";
         }
         ruleEditorModal.classList.add('is-visible');
         ruleEditorNameInput.focus(); // Focus name field first
    };

    const closeRuleEditor = () => {
         if (!ruleEditorModal) return;
         ruleEditorModal.classList.remove('is-visible');
         currentEditingRuleName = null; // Clear editing state
         // Clear fields on close to prevent stale data showing next time
         if(ruleEditorNameInput) ruleEditorNameInput.value = '';
         if(ruleEditorDescriptionInput) ruleEditorDescriptionInput.value = '';
         if(ruleEditorContentTextarea) ruleEditorContentTextarea.value = '';
         if(ruleEditorNameInput) ruleEditorNameInput.readOnly = false; // Ensure name is editable for next "create"
    };

    const handleRuleSave = () => {
        const name = ruleEditorNameInput?.value.trim();
        const description = ruleEditorDescriptionInput?.value.trim();
        const content = ruleEditorContentTextarea?.value; // Don't trim content usually

        if (!name) {
             AIChatService?.showNotification("Rule name cannot be empty.", "warning");
             ruleEditorNameInput?.focus();
             return;
        }

        const payload = { name, description, content };
        let actionType = 'ADD_RULE';
        let notificationMsg = `Rule "${name}" created.`;

        if (currentEditingRuleName) {
             // If editing, the name in payload *is* the existing name
             actionType = 'UPDATE_RULE';
             notificationMsg = `Rule "${name}" updated.`;
        } else {
             // If adding, check for duplicates *before* dispatching
              const existingRules = ApplicationStateService.getState().userRules;
              if (existingRules[name]) {
                  AIChatService?.showNotification(`Rule name "${name}" already exists.`, "warning");
                  ruleEditorNameInput?.focus();
                  return;
              }
             // actionType remains 'ADD_RULE'
        }

        ApplicationStateService.dispatch({ type: actionType, payload });
        AIChatService?.showNotification(notificationMsg, "success");
        closeRuleEditor(); // Close modal on successful save
    };

    // --- Re-added: Rule List Interaction Handlers ---
    const handleRuleSelect = (ruleName) => {
         console.log("Rule list item selected (view/edit):", ruleName);
         openRuleEditor(ruleName); // Open editor to view/edit
    };

    const handleRuleEdit = (event, ruleName) => {
         event.stopPropagation(); // Prevent selection handler if clicking button
         console.log("Rule edit button clicked:", ruleName);
         openRuleEditor(ruleName);
    };

    const handleRuleDelete = (event, ruleName) => {
         event.stopPropagation(); // Prevent selection handler if clicking button
         const ruleData = ApplicationStateService.getState().userRules[ruleName];
         if (!ruleData) return;

         if (confirm(`Are you sure you want to delete the rule "${ruleName}"?`)) {
             ApplicationStateService.dispatch({ type: 'DELETE_RULE', payload: { name: ruleName } });
             AIChatService?.showNotification(`Rule "${ruleName}" deleted.`, "info");
         }
    };

    const handleCreateRuleRequest = () => {
        openRuleEditor(); // Open editor for a new rule
        if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar(); // Close mobile sidebar after action
    };


    // --- Setup Event Listeners ---
    const setupEventListeners = () => {
        // Sidebar
        sidebarOpenBtn?.addEventListener('click', openSidebar);
        sidebarCloseBtn?.addEventListener('click', closeSidebar);
        sidebarBackdrop?.addEventListener('click', closeSidebar);

        // File Actions
        createFileBtn?.addEventListener('click', handleFileCreate);
        loadFileBtn?.addEventListener('click', handleFileLoadRequest);
        fileLoaderInput?.addEventListener('change', handleFileLoad);
        addTabBtn?.addEventListener('click', handleFileCreate); // Add tab button also creates a file

        // *** Add Rule Action Listeners ***
        createRuleBtn?.addEventListener('click', handleCreateRuleRequest);
        ruleEditorCloseBtn?.addEventListener('click', closeRuleEditor);
        ruleEditorSaveBtn?.addEventListener('click', handleRuleSave);
        ruleEditorModal?.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRuleEditor(); });


        // Editor Actions
        togglePadBtn?.addEventListener('click', handleTogglePad); // NEW
        toggleViewBtn?.addEventListener('click', handleToggleView);
        formatCodeBtn?.addEventListener('click', handleFormatCode);
        downloadFileBtn?.addEventListener('click', handleDownloadFile);
        fullscreenToggleBtn?.addEventListener('click', handleFullscreenToggle);

        // Fullscreen change listeners
        document.addEventListener('fullscreenchange', syncFullscreenButton);
        // Add vendor prefixes for broader compatibility
        document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
        document.addEventListener('mozfullscreenchange', syncFullscreenButton);
        document.addEventListener('MSFullscreenChange', syncFullscreenButton);

        // AI Chat Modal
        floatingAiChatBtn?.addEventListener('click', openAiChatModal);
        mainAiChatCloseBtn?.addEventListener('click', closeAiChatModal);
        mainAiChatSendBtn?.addEventListener('click', AIChatService.handleSendChatMessage);
        // Submit on Enter (but not Shift+Enter)
        mainAiChatInput?.addEventListener('keypress', (event) => {
             if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
                 event.preventDefault(); // Prevent default newline behavior
                 AIChatService.handleSendChatMessage();
             }
        });
        // Auto-resize textarea
        mainAiChatInput?.addEventListener('input', autoResizeChatInput);
        mainAiChatInput?.addEventListener('focus', autoResizeChatInput);
        mainAiChatInput?.addEventListener('mouseup', autoResizeChatInput); // Handle resize on paste/selection change
        // Dragging
        aiChatModalHeader?.addEventListener('mousedown', startDrag);
        
        // NEW: Dev PAD Listeners
        padModalCloseBtn?.addEventListener('click', handleTogglePad);
        padSendBtn?.addEventListener('click', handlePadSend);
        padInput?.addEventListener('keypress', (event) => {
             if (event.key === 'Enter' && !event.shiftKey) {
                 event.preventDefault();
                 handlePadSend();
             }
        });
        padInput?.addEventListener('input', () => {
            if (!padInput) return;
            padInput.style.height = 'auto';
            padInput.style.height = (padInput.scrollHeight) + 'px';
        });
        padLog?.addEventListener('submit', (event) => {
             if (event.target && event.target.id === 'pad-questions-form') {
                 handlePadQuestionSubmit(event);
             }
        });

        // Initial syncs
        syncFullscreenButton();
        autoResizeChatInput();
    };

    const init = () => {
        console.log("Initializing ViewController event listeners...");
        setupEventListeners(); // Call the setup function here
        console.log("ViewController event listeners initialized.");
    };

    // --- Public Interface ---
    return {
        // File/Tab handlers needed by UIRenderer
        handleFileSelect,
        handleTabSelect,
        handleTabClose,
        handleFileRename,
        handleFileDelete,
        // *** Expose Rule handlers for UIRenderer ***
        handleRuleSelect,
        handleRuleEdit,
        handleRuleDelete,
        // Other exports
        syncFullscreenButton,
        openAiChatModal,
        closeAiChatModal,
        init
    };
})();

// Export handlers needed by UIRenderer or other modules
export const {
    handleFileSelect,
    handleTabSelect,
    handleTabClose,
    handleFileRename,
    handleFileDelete,
    handleRuleSelect, // Export Rule handlers
    handleRuleEdit,
    handleRuleDelete,
    syncFullscreenButton,
    openAiChatModal,
    closeAiChatModal
} = ViewControllerInternal;

export const initViewController = ViewControllerInternal.init;