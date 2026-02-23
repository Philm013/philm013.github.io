import { DESKTOP_MEDIA_QUERY, APP_NAMESPACE, DEBOUNCE_INTERVALS } from './config.js';
import { deriveLanguageFromName, getMimeType, toggleElementVisibility, debounce, escapeHtml } from './utils.js';
import { ApplicationStateService } from './state.js';
import { CustomEditorService } from './editorService.js';
import { AIChatService } from './aiService.js';
import { TemplateService } from './templateService.js';

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
    const templatesBtn = document.getElementById('templates-btn'); // New

    // Editor action buttons
    const togglePadBtn = document.getElementById('toggle-pad-btn');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const formatCodeBtn = document.getElementById('format-code-action');
    const downloadFileBtn = document.getElementById('download-file-action');
    const fullscreenToggleBtn = document.getElementById('fullscreen-toggle-action');
    const addTabBtn = document.getElementById('add-tab-btn');
    const quickOpenBtn = document.getElementById('quick-open-btn'); // New
    const saveTemplateBtn = document.getElementById('save-template-btn'); // New

    const appContainer = document.getElementById('app-container');

    // AI Chat Modal elements
    const floatingAiChatBtn = document.getElementById('floating-ai-chat-trigger');
    const mainAiChatModal = document.getElementById('main-ai-chat-modal');
    const mainAiChatCloseBtn = document.getElementById('main-ai-chat-close-btn');
    const mainAiChatSendBtn = document.getElementById('main-ai-chat-send-btn');
    const mainAiChatInput = document.getElementById('main-ai-chat-input');
    const aiChatModalHeader = mainAiChatModal?.querySelector('.ai-chat-modal-header');

    // Assistant Tabs
    const assistantTabs = document.querySelectorAll('.assistant-tab');
    const assistantTabContents = document.querySelectorAll('.assistant-tab-content');

    // Dev PAD Modal elements (Keep for standalone if needed, but integration is preferred)
    const assistantPadLog = document.getElementById('assistant-pad-log');
    const assistantPadInput = document.getElementById('assistant-pad-input');
    const assistantPadSendBtn = document.getElementById('assistant-pad-send-btn');

    const handleAssistantTabSwitch = (tabId) => {
        assistantTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        assistantTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab-content`);
        });
        if (tabId === 'pad') {
            const state = ApplicationStateService.getState();
            if (!state.padState.currentPad && state.padState.history.length === 0) {
                AIChatService.handleSendPadMessage("Please analyze my open files and create an initial PAD.");
            }
        }
    };

    const ruleEditorModal = document.getElementById('rule-editor-modal');
    const ruleEditorCloseBtn = document.getElementById('rule-editor-close-btn');
    const ruleEditorSaveBtn = document.getElementById('rule-editor-save-btn');
    const ruleEditorNameInput = document.getElementById('rule-editor-name');
    const ruleEditorDescriptionInput = document.getElementById('rule-editor-description');
    const ruleEditorContentTextarea = document.getElementById('rule-editor-content');
    let currentEditingRuleName = null;

    // Templates Modal
    const templatesModal = document.getElementById('templates-modal');
    const templatesModalCloseBtn = document.getElementById('templates-modal-close-btn');
    const templatesGrid = document.getElementById('templates-grid');

    // Quick Open Modal
    const quickOpenModal = document.getElementById('quick-open-modal');
    const quickOpenInput = document.getElementById('quick-open-input');
    const quickOpenResults = document.getElementById('quick-open-results');

    // --- Sidebar Management ---
    const openSidebar = () => {
        if (!DESKTOP_MEDIA_QUERY.matches) {
            sidebar?.classList.add('is-open');
            sidebarBackdrop?.classList.add('is-visible');
            sidebarOpenBtn?.setAttribute('aria-expanded', 'true');
        } else {
            toggleDesktopSidebar(false);
        }
    };
    const closeSidebar = () => {
        if (!DESKTOP_MEDIA_QUERY.matches) {
             sidebar?.classList.remove('is-open');
             sidebarBackdrop?.classList.remove('is-visible');
             sidebarOpenBtn?.setAttribute('aria-expanded', 'false');
        } else {
             toggleDesktopSidebar(true);
        }
    };
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
          setTimeout(() => CustomEditorService.getEditorInstance()?.refresh(), 360);
     };


    // --- File/Tab Interaction Handlers ---
    const handleFileSelect = (fileId) => {
        ApplicationStateService.dispatch({ type: 'ACTIVATE_TAB_REQUESTED', payload: { id: fileId } });
        if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar();
    };
    const handleTabSelect = (fileId) => {
        ApplicationStateService.dispatch({ type: 'ACTIVATE_TAB_REQUESTED', payload: { id: fileId } });
    };
    const handleTabClose = (event, fileId) => {
        event.stopPropagation();
        ApplicationStateService.dispatch({ type: 'CLOSE_TAB_REQUESTED', payload: { id: fileId } });
    };

    // --- File Action Handlers ---
    const handleFileCreate = () => {
        ApplicationStateService.dispatch({ type: 'CREATE_FILE_REQUESTED' });
        if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar();
    };
    const handleFileLoadRequest = () => {
        fileLoaderInput?.click();
    };

    const handleFileLoad = async (event) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        let lastFileIdLoaded = null;

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    const fileName = file.name;
                    reader.onload = (e) => {
                        try {
                            const content = e.target.result;
                            const fileId = `${APP_NAMESPACE}_loaded_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}_${file.size}_${file.lastModified}`;
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
                            resolve();
                        } catch (error) {
                            console.error(`Error processing loaded file "${fileName}":`, error);
                            AIChatService?.showNotification(`Error loading file "${fileName}": ${error.message}`, "error");
                            reject(error);
                        }
                    };
                    reader.onerror = (e) => {
                        console.error(`Error reading file "${fileName}":`, e.target.error);
                        AIChatService?.showNotification(`Error reading file "${fileName}": ${e.target.error}`, "error");
                        reject(e.target.error);
                    };
                    reader.readAsText(file);
                });
            }
            if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar();

        } catch (error) {
            console.error("Error during multiple file load process:", error);
            AIChatService?.showNotification("An error occurred while loading some files.", "error");
        } finally {
            event.target.value = null;
        }
    };

    const handleFileRename = (event, fileId) => {
        event.stopPropagation();
        const file = ApplicationStateService.getState().fileRegistry[fileId];
        if (!file) return;
        const newName = prompt(`Enter new name for "${file.name}":`, file.name);
        if (newName !== null && newName.trim() !== '' && newName.trim() !== file.name) {
            ApplicationStateService.dispatch({ type: 'RENAME_FILE_REQUESTED', payload: { id: fileId, newName: newName.trim() } });
        } else if (newName !== null) {
             AIChatService?.showNotification("Invalid or unchanged filename.", "warning");
        }
    };
    const handleFileDelete = (event, fileId) => {
        event.stopPropagation();
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
        CustomEditorService.formatContent();
    };
    const handleDownloadFile = () => {
         const state = ApplicationStateService.getState();
         const file = state.fileRegistry[state.activeFileId];
         if (!file) { AIChatService?.showNotification("No active file to download.", "warning"); return; }
         try {
             const content = CustomEditorService.getContent();
             const blob = new Blob([content || ''], { type: getMimeType(file.language) });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = file.name;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
         } catch (error) {
              console.error("Download failed:", error);
              AIChatService?.showNotification(`Download failed: ${error.message}`, "error");
         }
    };

    // --- Fullscreen Handling ---
    const handleFullscreenToggle = () => {
        if (!document.fullscreenElement) {
            appContainer?.requestFullscreen().catch(err => {
                 console.error("Fullscreen request failed:", err);
                 AIChatService?.showNotification(`Fullscreen failed: ${err.message}`, "error");
            });
        } else {
            if (document.exitFullscreen) {
                 document.exitFullscreen();
            }
        }
    };
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
        CustomEditorService.getEditorInstance()?.getInputField().blur();
        AIChatService.updateChatContextDisplay();
        setTimeout(() => {
             mainAiChatInput?.focus();
             autoResizeChatInput();
        }, 100);
    };
    const closeAiChatModal = () => {
        if (!mainAiChatModal) return;
        mainAiChatModal.classList.remove('is-visible');
    };
    // Dragging logic for AI Chat Modal
    let isDragging = false, dragOffsetX, dragOffsetY;
    const startDrag = (e) => {
         if (!DESKTOP_MEDIA_QUERY.matches || e.target.closest('.header-controls, input, button, textarea, .ai-suggestion-actions') || !aiChatModalHeader?.contains(e.target)) return;
         isDragging = true;
         aiChatModalHeader?.classList.add('is-dragging');
         document.body.classList.add('is-dragging-modal');
         const modalContent = mainAiChatModal.querySelector('.ai-chat-modal-content');
         if (!modalContent) return;
         const rect = modalContent.getBoundingClientRect();
         dragOffsetX = e.clientX - rect.left;
         dragOffsetY = e.clientY - rect.top;
         document.addEventListener('mousemove', onDrag);
         document.addEventListener('mouseup', endDrag, { once: true });
    };
    const onDrag = (e) => {
         if (!isDragging) return;
         e.preventDefault();
         const modalContent = mainAiChatModal.querySelector('.ai-chat-modal-content');
         if (!modalContent) return;
         const vW = window.innerWidth, vH = window.innerHeight;
         const mW = modalContent.offsetWidth, mH = modalContent.offsetHeight;
         let newLeft = e.clientX - dragOffsetX;
         let newTop = e.clientY - dragOffsetY;
         newLeft = Math.max(0, Math.min(newLeft, vW - mW));
         newTop = Math.max(0, Math.min(newTop, vH - mH));
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
    };
    const autoResizeChatInput = () => {
        if(mainAiChatInput) {
            mainAiChatInput.style.height = 'auto';
            const minH = parseInt(getComputedStyle(mainAiChatInput).minHeight, 10) || 40;
            mainAiChatInput.style.height = Math.max(minH, mainAiChatInput.scrollHeight) + 'px';
        }
    };
    window.autoResizeChatInput = autoResizeChatInput;
    
    // --- Dev PAD Modal ---
    const handleTogglePad = () => {
        ApplicationStateService.dispatch({ type: 'PAD_TOGGLE_VISIBILITY' });
    };
    
    const handlePadSend = () => {
        const prompt = assistantPadInput?.value.trim();
        if (prompt) {
            AIChatService.handleSendPadMessage(prompt);
            assistantPadInput.value = '';
            assistantPadInput.style.height = 'auto';
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

    // --- Rule Editor Modal ---
    const openRuleEditor = (ruleName = null) => {
         if (!ruleEditorModal || !ruleEditorNameInput || !ruleEditorDescriptionInput || !ruleEditorContentTextarea) {
             console.error("Rule editor modal elements not found.");
             return;
         }
         currentEditingRuleName = ruleName;
         if (ruleName) {
              const ruleData = ApplicationStateService.getState().userRules[ruleName];
              if (!ruleData) {
                   AIChatService?.showNotification(`Rule "${ruleName}" not found for editing.`, "warning");
                   return;
              }
              ruleEditorNameInput.value = ruleName;
              ruleEditorNameInput.readOnly = true;
              ruleEditorDescriptionInput.value = ruleData.description || '';
              ruleEditorContentTextarea.value = ruleData.content || '';
              ruleEditorModal.querySelector('h2').textContent = "Edit Rule";
         } else {
              ruleEditorNameInput.value = '';
              ruleEditorNameInput.readOnly = false;
              ruleEditorDescriptionInput.value = '';
              ruleEditorContentTextarea.value = '';
              ruleEditorModal.querySelector('h2').textContent = "Create New Rule";
         }
         ruleEditorModal.classList.add('is-visible');
         ruleEditorNameInput.focus();
    };

    const closeRuleEditor = () => {
         if (!ruleEditorModal) return;
         ruleEditorModal.classList.remove('is-visible');
         currentEditingRuleName = null;
         if(ruleEditorNameInput) ruleEditorNameInput.value = '';
         if(ruleEditorDescriptionInput) ruleEditorDescriptionInput.value = '';
         if(ruleEditorContentTextarea) ruleEditorContentTextarea.value = '';
         if(ruleEditorNameInput) ruleEditorNameInput.readOnly = false;
    };

    const handleRuleSave = () => {
        const name = ruleEditorNameInput?.value.trim();
        const description = ruleEditorDescriptionInput?.value.trim();
        const content = ruleEditorContentTextarea?.value;

        if (!name) {
             AIChatService?.showNotification("Rule name cannot be empty.", "warning");
             ruleEditorNameInput?.focus();
             return;
        }

        const payload = { name, description, content };
        let actionType = 'ADD_RULE';
        let notificationMsg = `Rule "${name}" created.`;

        if (currentEditingRuleName) {
             actionType = 'UPDATE_RULE';
             notificationMsg = `Rule "${name}" updated.`;
        } else {
              const existingRules = ApplicationStateService.getState().userRules;
              if (existingRules[name]) {
                  AIChatService?.showNotification(`Rule name "${name}" already exists.`, "warning");
                  ruleEditorNameInput?.focus();
                  return;
              }
        }

        ApplicationStateService.dispatch({ type: actionType, payload });
        AIChatService?.showNotification(notificationMsg, "success");
        closeRuleEditor();
    };

    const handleRuleSelect = (ruleName) => {
         openRuleEditor(ruleName);
    };

    const handleRuleEdit = (event, ruleName) => {
         event.stopPropagation();
         openRuleEditor(ruleName);
    };

    const handleRuleDelete = (event, ruleName) => {
         event.stopPropagation();
         const ruleData = ApplicationStateService.getState().userRules[ruleName];
         if (!ruleData) return;

         if (confirm(`Are you sure you want to delete the rule "${ruleName}"?`)) {
             ApplicationStateService.dispatch({ type: 'DELETE_RULE', payload: { name: ruleName } });
             AIChatService?.showNotification(`Rule "${ruleName}" deleted.`, "info");
         }
    };

    const handleCreateRuleRequest = () => {
        openRuleEditor();
        if (!DESKTOP_MEDIA_QUERY.matches) closeSidebar();
    };

    // --- Templates Logic ---
    const renderTemplates = async () => {
        const templates = await TemplateService.getTemplates();
        templatesGrid.innerHTML = '';
        
        if (templates.length === 0) {
            templatesGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">No templates saved yet. Create one by clicking the save icon in the editor toolbar.</div>';
            return;
        }

        templates.forEach(tpl => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `
                <img class="template-thumbnail" src="${tpl.thumbnail || ''}" alt="${escapeHtml(tpl.name)}">
                <div class="template-info">
                    <div class="template-name" title="${escapeHtml(tpl.name)}">${escapeHtml(tpl.name)}</div>
                    <div style="font-size: 0.8em; color: var(--text-secondary);">${new Date(tpl.timestamp).toLocaleDateString()}</div>
                </div>
                <div class="template-actions">
                    <button class="delete-template-btn" title="Delete Template">🗑️</button>
                </div>
            `;
            
            card.addEventListener('click', () => handleTemplateLoad(tpl));
            card.querySelector('.delete-template-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                handleTemplateDelete(tpl.id);
            });
            
            templatesGrid.appendChild(card);
        });
    };

    const openTemplatesModal = () => {
        if (!templatesModal) return;
        renderTemplates();
        templatesModal.classList.remove('is-hidden');
    };

    const closeTemplatesModal = () => {
        if (templatesModal) templatesModal.classList.add('is-hidden');
    };

    const handleSaveTemplate = async () => {
        const activeFileId = ApplicationStateService.getState().activeFileId;
        if (!activeFileId) {
            AIChatService.showNotification("No active file to save as template.", "warning");
            return;
        }
        
        const content = CustomEditorService.getContent();
        if (!content) {
            AIChatService.showNotification("File is empty.", "warning");
            return;
        }

        const name = prompt("Enter a name for this template:");
        if (!name) return;

        AIChatService.showNotification("Generating thumbnail...", "info");
        const thumbnail = await TemplateService.generateThumbnail(content); // Now handled by TemplateService

        const templateData = {
            id: Date.now().toString(),
            name: name,
            content: content,
            thumbnail: thumbnail,
            timestamp: Date.now()
        };

        try {
            await TemplateService.saveTemplate(templateData);
            AIChatService.showNotification("Template saved!", "success");
        } catch (e) {
            console.error(e);
            AIChatService.showNotification("Failed to save template.", "error");
        }
    };

    const handleTemplateLoad = async (tpl) => {
        const fileId = ApplicationStateService.generateUniqueId();
        ApplicationStateService.dispatch({
            type: 'ADD_LOADED_FILE',
            payload: { 
                id: fileId, 
                name: `New ${tpl.name}.html`, // Assuming HTML, could infer from content or store extension
                content: tpl.content, 
                language: deriveLanguageFromName(`template.html`) 
            }
        });
        closeTemplatesModal();
        AIChatService.showNotification(`Template "${tpl.name}" loaded.`, "success");
    };

    const handleTemplateDelete = async (id) => {
        if (confirm("Are you sure you want to delete this template?")) {
            await TemplateService.deleteTemplate(id);
            renderTemplates();
        }
    };

    // --- Quick Open Logic ---
    const openQuickOpen = () => {
        if (!quickOpenModal) return;
        quickOpenModal.classList.remove('is-hidden');
        quickOpenInput.value = '';
        renderQuickOpenResults('');
        quickOpenInput.focus();
    };

    const closeQuickOpen = () => {
        if (quickOpenModal) quickOpenModal.classList.add('is-hidden');
    };

    const renderQuickOpenResults = (query) => {
        if (!quickOpenResults) return;
        const files = Object.values(ApplicationStateService.getState().fileRegistry);
        const filtered = files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
        
        quickOpenResults.innerHTML = '';
        filtered.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'quick-open-item';
            if (index === 0) li.classList.add('selected'); // Auto-select first
            li.innerHTML = `<span class="filename">${escapeHtml(file.name)}</span>`;
            li.addEventListener('click', () => {
                handleFileSelect(file.id);
                closeQuickOpen();
            });
            quickOpenResults.appendChild(li);
        });
    };

    const handleQuickOpenInput = debounce((e) => {
        renderQuickOpenResults(e.target.value);
    }, 100);

    const handleQuickOpenKeydown = (e) => {
        if (e.key === 'Escape') closeQuickOpen();
        if (e.key === 'Enter') {
            const selected = quickOpenResults.querySelector('.selected');
            if (selected) selected.click();
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = Array.from(quickOpenResults.querySelectorAll('.quick-open-item'));
            const currentIndex = items.findIndex(item => item.classList.contains('selected'));
            let nextIndex = currentIndex;
            
            if (e.key === 'ArrowDown') nextIndex = Math.min(items.length - 1, currentIndex + 1);
            if (e.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
            
            items.forEach(i => i.classList.remove('selected'));
            if (items[nextIndex]) {
                items[nextIndex].classList.add('selected');
                items[nextIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    };


    // --- Setup Event Listeners ---
    const setupEventListeners = () => {
        // ... existing listeners ...
        sidebarOpenBtn?.addEventListener('click', openSidebar);
        sidebarCloseBtn?.addEventListener('click', closeSidebar);
        sidebarBackdrop?.addEventListener('click', closeSidebar);
        createFileBtn?.addEventListener('click', handleFileCreate);
        loadFileBtn?.addEventListener('click', handleFileLoadRequest);
        fileLoaderInput?.addEventListener('change', handleFileLoad);
        addTabBtn?.addEventListener('click', handleFileCreate);
        createRuleBtn?.addEventListener('click', handleCreateRuleRequest);
        ruleEditorCloseBtn?.addEventListener('click', closeRuleEditor);
        ruleEditorSaveBtn?.addEventListener('click', handleRuleSave);
        ruleEditorModal?.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRuleEditor(); });
        togglePadBtn?.addEventListener('click', handleTogglePad);
        toggleViewBtn?.addEventListener('click', handleToggleView);
        formatCodeBtn?.addEventListener('click', handleFormatCode);
        downloadFileBtn?.addEventListener('click', handleDownloadFile);
        fullscreenToggleBtn?.addEventListener('click', handleFullscreenToggle);
        
        // --- NEW LISTENERS ---
        templatesBtn?.addEventListener('click', openTemplatesModal);
        templatesModalCloseBtn?.addEventListener('click', closeTemplatesModal);
        saveTemplateBtn?.addEventListener('click', handleSaveTemplate);
        quickOpenBtn?.addEventListener('click', openQuickOpen);
        quickOpenInput?.addEventListener('input', handleQuickOpenInput);
        quickOpenInput?.addEventListener('keydown', handleQuickOpenKeydown);
        
        // Global shortcut for Quick Open
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                openQuickOpen();
            }
            if (e.key === 'Escape') {
                closeQuickOpen();
                closeTemplatesModal();
            }
        });

        // Assistant Tabs
        assistantTabs.forEach(tab => {
            tab.addEventListener('click', () => handleAssistantTabSwitch(tab.dataset.tab));
        });

        // Integrated PAD Send
        assistantPadSendBtn?.addEventListener('click', () => {
            const prompt = assistantPadInput?.value.trim();
            if (prompt) {
                AIChatService.handleSendPadMessage(prompt);
                assistantPadInput.value = '';
                assistantPadInput.style.height = 'auto';
            }
        });
        assistantPadInput?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                assistantPadSendBtn?.click();
            }
        });

        // Fullscreen sync
        document.addEventListener('fullscreenchange', syncFullscreenButton);
        document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
        document.addEventListener('mozfullscreenchange', syncFullscreenButton);
        document.addEventListener('MSFullscreenChange', syncFullscreenButton);

        // AI Chat
        floatingAiChatBtn?.addEventListener('click', openAiChatModal);
        mainAiChatCloseBtn?.addEventListener('click', closeAiChatModal);
        mainAiChatSendBtn?.addEventListener('click', AIChatService.handleSendChatMessage);
        mainAiChatInput?.addEventListener('keypress', (event) => {
             if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
                 event.preventDefault();
                 AIChatService.handleSendChatMessage();
             }
        });
        mainAiChatInput?.addEventListener('input', autoResizeChatInput);
        mainAiChatInput?.addEventListener('focus', autoResizeChatInput);
        mainAiChatInput?.addEventListener('mouseup', autoResizeChatInput);
        aiChatModalHeader?.addEventListener('mousedown', startDrag);
        
        // Integrated PAD Send
        assistantPadSendBtn?.addEventListener('click', handlePadSend);
        
        assistantPadInput?.addEventListener('keypress', (event) => {
             if (event.key === 'Enter' && !event.shiftKey) {
                 event.preventDefault();
                 handlePadSend();
             }
        });
        assistantPadInput?.addEventListener('input', () => {
            if (!assistantPadInput) return;
            assistantPadInput.style.height = 'auto';
            assistantPadInput.style.height = (assistantPadInput.scrollHeight) + 'px';
        });
        assistantPadLog?.addEventListener('submit', (event) => {
             if (event.target && event.target.id === 'pad-questions-form') {
                 handlePadQuestionSubmit(event);
             }
        });

        syncFullscreenButton();
        autoResizeChatInput();
    };

    const init = () => {
        console.log("Initializing ViewController event listeners...");
        setupEventListeners();
        console.log("ViewController event listeners initialized.");
    };

    // --- Public Interface ---
    return {
        handleFileSelect,
        handleTabSelect,
        handleTabClose,
        handleFileRename,
        handleFileDelete,
        handleRuleSelect,
        handleRuleEdit,
        handleRuleDelete,
        syncFullscreenButton,
        openAiChatModal,
        closeAiChatModal,
        init
    };
})();

export const {
    handleFileSelect,
    handleTabSelect,
    handleTabClose,
    handleFileRename,
    handleFileDelete,
    handleRuleSelect,
    handleRuleEdit,
    handleRuleDelete,
    syncFullscreenButton,
    openAiChatModal,
    closeAiChatModal
} = ViewControllerInternal;

export const initViewController = ViewControllerInternal.init;
