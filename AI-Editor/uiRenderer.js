import { DESKTOP_MEDIA_QUERY, PREVIEWABLE_LANGUAGES, DEBOUNCE_INTERVALS } from './config.js';
import { toggleElementVisibility, debounce, escapeHtml } from './utils.js';
import { ApplicationStateService } from './state.js';
// Import ViewController functions including Rule handlers
import { handleFileSelect, handleTabSelect, handleTabClose, handleFileRename, handleFileDelete, handleRuleSelect, handleRuleDelete, handleRuleEdit } from './viewController.js';
import { CustomEditorService } from './editorService.js';
import { AIChatService } from './aiService.js'; // For markdown parsing

// --- UI Rendering Orchestrator ---
const UIRenderingOrchestratorInternal = (() => {
    // --- DOM Element References ---
    const fileListContainer = document.getElementById('file-list-display');
    const noFilesIndicator = fileListContainer?.querySelector('.no-files-indicator');
    // *** Get Rules List elements ***
    const rulesListContainer = document.getElementById('rules-list-display');
    const noRulesIndicator = rulesListContainer?.querySelector('.no-rules-indicator');

    const tabBarContainer = document.getElementById('tab-bar-navigation');
    const activeFileLabel = document.getElementById('active-file-indicator');
    const editorPreviewHost = document.getElementById('editor-preview-host');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const formatBtn = document.getElementById('format-code-action');
    const downloadBtn = document.getElementById('download-file-action');
    const addTabBtn = document.getElementById('add-tab-btn');
    const toggleViewEditIcon = toggleViewBtn?.querySelector('.edit-icon');
    const toggleViewPreviewIcon = toggleViewBtn?.querySelector('.preview-icon');

    // NEW: Dev PAD elements
    const padModal = document.getElementById('pad-modal');
    const padLog = document.getElementById('pad-log');
    const padInputArea = document.getElementById('pad-input-area');
    const padSendBtn = document.getElementById('pad-send-btn');
    const padInput = document.getElementById('pad-input');


    // --- Virtual DOM Node Creators ---

    // Creates VNode for a file list item
    const createFileListItemNode = (file, isActive) => ({
        type: 'li',
        props: {
            'data-file-id': file.id,
            title: file.name,
            class: `file-list-item-representation ${isActive ? 'is-active' : ''}`,
            role: 'button',
            tabindex: '0',
            'aria-selected': isActive ? 'true' : 'false'
        },
        events: {
             // Click anywhere except actions selects the file
             click: (e) => { if (!e.target.closest('.file-item-actions')) { handleFileSelect(file.id); } },
             // Allow selection with Enter/Space
             keydown: (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.file-item-actions')) { e.preventDefault(); handleFileSelect(file.id); } }
        },
        children: [
            { type: 'span', props: { class: 'file-item-name' }, children: [file.name] },
            { type: 'div', props: { class: 'file-item-actions' }, children: [
                 { type: 'button', props: { class: 'action-button rename-btn', title: `Rename ${file.name}`, 'aria-label': `Rename file ${file.name}` }, events: { click: (e) => handleFileRename(e, file.id) }, children: ['✏️'] },
                 { type: 'button', props: { class: 'action-button delete-btn', title: `Delete ${file.name}`, 'aria-label': `Delete file ${file.name}` }, events: { click: (e) => handleFileDelete(e, file.id) }, children: ['🗑️'] }
            ]}
        ]
    });

    // Creates VNode for a tab bar item
    const createTabBarItemNode = (file, isActive) => ({
        type: 'div',
        props: {
            'data-file-id': file.id,
            title: file.name,
            class: `tab-item-representation ${isActive ? 'is-active' : ''}`,
            role: 'tab',
            'aria-selected': isActive ? 'true' : 'false',
            tabindex: isActive ? '0' : '-1' // Only active tab is easily tabbable
        },
        events: {
             // Click tab (but not close button) to select
             click: (e) => { if (!e.target.closest('.tab-close-trigger')) { handleTabSelect(file.id); } }
        },
        children: [
            { type: 'span', props: { class: 'tab-item-filename' }, children: [file.name] },
            { type: 'button', props: { class: 'tab-close-trigger', title: `Close tab ${file.name}`, 'aria-label': `Close tab ${file.name}` }, events: { click: (e) => handleTabClose(e, file.id) }, children: ['×'] }
        ]
    });

     // *** Re-added: Creates VNode for a rule list item ***
     const createRuleListItemNode = (ruleName, ruleData) => ({
          type: 'li',
          props: {
               'data-rule-name': ruleName,
               'title': ruleData.description || ruleName, // Tooltip with description or name
               'class': `rule-list-item-representation`,
               'role': 'button', // Acts like a button for selection/viewing
               'tabindex': '0' // Make it keyboard focusable
          },
          events: {
               // Handle click to view/edit rule (unless clicking action buttons)
               click: (e) => { if (!e.target.closest('.rule-item-actions')) { handleRuleSelect(ruleName); } },
               // Handle keydown for accessibility (e.g., Enter/Space to view/edit)
               keydown: (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.rule-item-actions')) { e.preventDefault(); handleRuleSelect(ruleName); } }
          },
          children: [
               { type: 'span', props: { class: 'rule-item-name' }, children: [ruleName] },
               { type: 'div', props: { class: 'rule-item-actions' }, children: [
                    // Edit Button
                    { type: 'button', props: { class: 'action-button edit-btn', title: `Edit rule ${ruleName}`, 'aria-label': `Edit rule ${ruleName}` },
                        events: { click: (e) => handleRuleEdit(e, ruleName) },
                        children: ['✏️'] // Emoji or SVG icon
                    },
                    // Delete Button
                    { type: 'button', props: { class: 'action-button delete-btn', title: `Delete rule ${ruleName}`, 'aria-label': `Delete rule ${ruleName}` },
                        events: { click: (e) => handleRuleDelete(e, ruleName) },
                        children: ['🗑️'] // Emoji or SVG icon
                    }
               ]}
          ]
     });

    // --- DOM Manipulation Utilities ---

    // Creates a real DOM element from a virtual node
    const createDOMElement = (virtualNode) => {
        if (typeof virtualNode === 'string') {
            return document.createTextNode(virtualNode);
        }
        const element = document.createElement(virtualNode.type);
        // Set attributes and properties
        updateDOMProperties(element, {}, virtualNode.props || {});
        // Attach event listeners
        if (virtualNode.events) {
            Object.entries(virtualNode.events).forEach(([eventType, handler]) => {
                element.addEventListener(eventType, handler);
            });
        }
        // Recursively create and append children
        (virtualNode.children || []).forEach(childNode => {
            element.appendChild(createDOMElement(childNode));
        });
        return element;
    };

    // Updates attributes and properties on a DOM element based on new props
    const updateDOMProperties = (element, prevProps = {}, nextProps = {}) => {
        // Remove old properties/attributes
        Object.keys(prevProps).forEach(name => {
            // Don't remove internal props or listeners handled elsewhere
            if (!(name in nextProps) && name !== 'children' && name !== 'key' && typeof prevProps[name] !== 'function') {
                 if (name === 'class') element.className = ''; // Reset className specifically
                 else element.removeAttribute(name);
            }
        });
        // Add/Update new properties/attributes
        Object.entries(nextProps).forEach(([name, value]) => {
             // Don't handle internal props or listeners
             if (name !== 'children' && name !== 'key' && typeof value !== 'function') {
                // Only update if value changed
                if (prevProps[name] !== value) {
                    if (name === 'class') {
                        element.className = value; // Set className
                    } else if (typeof value === 'boolean') {
                        // Handle boolean attributes like 'hidden', 'disabled'
                         element.toggleAttribute(name, value);
                    } else if (value !== null && value !== undefined) {
                        element.setAttribute(name, value); // Set standard attribute
                    } else {
                        element.removeAttribute(name); // Remove attribute if value is null/undefined
                    }
                }
            }
        });
    };

    // Simple reconciliation: Remove all children and append new ones
    // Optionally keeps one specific node (like the addTabBtn).
    const reconcileSimple = (parentElement, newNodes, nodeToKeep = null) => {
         if (!parentElement) return;
         const fragment = document.createDocumentFragment();
         newNodes.forEach(newNode => {
             if (newNode) { 
                 fragment.appendChild(createDOMElement(newNode));
             }
         });
         
         parentElement.innerHTML = '';
         parentElement.appendChild(fragment);
         if(nodeToKeep) {
             parentElement.appendChild(nodeToKeep);
         }
    };

    // --- Rendering Functions ---

    // Renders the file list in the sidebar
    const renderFileList = (files, activeFileId) => {
        if (!fileListContainer) return;
        const sortedFiles = Object.values(files || {}).sort((a, b) => a.name.localeCompare(b.name));
        toggleElementVisibility(noFilesIndicator, sortedFiles.length === 0);
        const newNodes = sortedFiles.map(file => createFileListItemNode(file, file.id === activeFileId));
        reconcileSimple(fileListContainer, newNodes);
    };

     // *** Re-added: Renders the rule list in the sidebar ***
     const renderRulesList = (rules) => {
          if (!rulesListContainer || !noRulesIndicator) return;
          const ruleNames = Object.keys(rules || {}).sort((a, b) => a.localeCompare(b));
          toggleElementVisibility(noRulesIndicator, ruleNames.length === 0);
          const newNodes = ruleNames.map(name => createRuleListItemNode(name, rules[name]));
          reconcileSimple(rulesListContainer, newNodes); // Render rules into its container
     };

    // Renders the tab bar
    const renderTabBar = (openTabIds, files, activeFileId) => {
        if (!tabBarContainer || !addTabBtn) return;
        const isDesktop = DESKTOP_MEDIA_QUERY.matches;
        // Ensure tab bar and add button visibility matches desktop state
        toggleElementVisibility(tabBarContainer, isDesktop, 'flex');
        toggleElementVisibility(addTabBtn, isDesktop, 'flex');

        if (!isDesktop) {
            reconcileSimple(tabBarContainer, [], addTabBtn); // Clear tabs on mobile, keep button (hidden by CSS)
            return;
        }

        // Filter out IDs that might not exist in files registry anymore
        const validOpenTabIds = (openTabIds || []).filter(id => files[id]);

        const newNodes = validOpenTabIds
            .map(id => files[id] ? createTabBarItemNode(files[id], id === activeFileId) : null)
            .filter(Boolean);

        // Render tabs, making sure to keep the addTabBtn
        reconcileSimple(tabBarContainer, newNodes, addTabBtn);

        // Scroll the active tab into view after rendering
        if (activeFileId) {
            setTimeout(() => {
                const activeTabElement = tabBarContainer.querySelector(`.tab-item-representation[data-file-id="${activeFileId}"]`);
                activeTabElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }, 50); // Delay slightly to allow DOM update
        }
    };

    // Updates the label showing the currently active file name
    const updateActiveFileIndicator = (activeFileId, files) => {
        if (!activeFileLabel) return;
        const activeFile = files[activeFileId];
        const displayName = activeFile ? activeFile.name : "No Active Entity"; // Use term from your HTML
        activeFileLabel.textContent = displayName;
        activeFileLabel.title = displayName; // Tooltip
    };

    // Updates the enabled/disabled state and icons of action buttons
    const updateButtonStates = (activeFileId, files, viewMode) => {
        const activeFile = files[activeFileId];
        const isActiveFile = !!activeFile;
        const language = isActiveFile ? activeFile.language : null;
        const canPreview = isActiveFile && PREVIEWABLE_LANGUAGES.includes(language);

        // Enable/disable based on whether a file is active
        if (formatBtn) formatBtn.disabled = !isActiveFile; // Simplified: Enable if active, format function handles specific lang support
        if (downloadBtn) downloadBtn.disabled = !isActiveFile;
        if (toggleViewBtn) toggleViewBtn.disabled = !canPreview; // Only enable if previewable

        // Update toggle view button icon and title
        if (toggleViewBtn && toggleViewEditIcon && toggleViewPreviewIcon) {
            if (canPreview) {
                const isEditMode = viewMode === 'edit';
                toggleElementVisibility(toggleViewEditIcon, !isEditMode, 'inline');
                toggleElementVisibility(toggleViewPreviewIcon, isEditMode, 'inline');
                toggleViewBtn.title = isEditMode ? "Switch to Preview" : "Switch to Edit";
            } else {
                // If not previewable, always show edit icon and disable
                toggleElementVisibility(toggleViewEditIcon, true, 'inline');
                toggleElementVisibility(toggleViewPreviewIcon, false, 'inline');
                toggleViewBtn.title = "Preview N/A"; // Update title when disabled
            }
            toggleViewBtn.setAttribute('aria-label', toggleViewBtn.title); // Update aria-label for accessibility
        }
    };

    // Updates the CSS class on the host element to toggle editor/preview visibility
    const updateViewModeClass = (viewMode) => {
        if (!editorPreviewHost) return;
        editorPreviewHost.classList.remove('view-mode-edit', 'view-mode-preview');
        editorPreviewHost.classList.add(`view-mode-${viewMode}`);
    };

    // --- NEW: Dev PAD Rendering ---
    const renderPad = (padState) => {
        if (!padModal || !padLog || !padInputArea) return;

        toggleElementVisibility(padModal, padState.isVisible);
        if (!padState.isVisible) return;
        
        const padSendButton = document.getElementById('pad-send-btn');
        const padInputField = document.getElementById('pad-input');
        if (padSendButton) padSendButton.disabled = padState.isGenerating;
        if (padInputField) padInputField.disabled = padState.isGenerating;

        if (padState.isGenerating && padState.history.length === 0) {
            padLog.innerHTML = `<div class="pad-loading-placeholder">Initializing PAD... Analyzing project files...</div>`;
            toggleElementVisibility(padInputArea, false);
            return;
        }

        let historyHtml = '';
        padState.history.forEach(entry => {
            if (!entry || !entry.role) return;
            if (entry.role === 'user') {
                const userText = entry.parts.map(p => p.text).join('');
                historyHtml += `<div class="pad-message user"><div class="pad-message-content">${marked.parse(userText)}</div></div>`;
            } else if (entry.role === 'model') {
                const rawText = entry.parts.map(p => p.text).join('');
                let padData;
                try {
                    const jsonStart = rawText.indexOf('{');
                    const jsonEnd = rawText.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd > jsonStart) {
                        padData = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
                    }
                } catch(e) {
                     console.error("Error parsing PAD JSON from model response:", e, rawText);
                     padData = { projectTitle: "Parsing Error", projectStatement: "I encountered an issue preparing my response. Please check the browser console for details and try again.", clarificationQuestions: [] };
                }

                if (padData) {
                    let questionsFormHtml = '';
                    const hasQuestions = padData.clarificationQuestions && padData.clarificationQuestions.length > 0;

                    if (hasQuestions) {
                        const questionsHtml = padData.clarificationQuestions.map((q, i) => `
                            <div class="question-group">
                                <label for="pad-q-input-${i}">${escapeHtml(q)}</label>
                                <input type="text" id="pad-q-input-${i}" placeholder="Your answer...">
                            </div>`).join('');
                        
                        questionsFormHtml = `
                            <div class="pad-section pad-questions-form">
                                <form id="pad-questions-form">
                                    <h2>Archie's Questions:</h2>
                                    ${questionsHtml}
                                    <button type="submit" class="submit-answers-btn">Submit Answers</button>
                                </form>
                            </div>`;
                    }
                    toggleElementVisibility(padInputArea, !hasQuestions);

                    const renderList = (items) => (items || []).map(item => {
                        const content = item.risk ? `<strong>${escapeHtml(item.risk)}:</strong> ${marked.parseInline(String(item.mitigation || ''))}` : marked.parseInline(String(item));
                        return `<li>${content}</li>`;
                    }).join('');
                    
                    historyHtml += `
                        <div class="pad-message ai">
                            <div class="pad-rendered-content">
                                <div class="pad-section">
                                    <h1>${escapeHtml(padData.projectTitle || '')} <span>${escapeHtml(padData.padVersion || '')}</span></h1>
                                    <p>${marked.parse(String(padData.projectStatement || ''))}</p>
                                </div>
                                ${questionsFormHtml}
                                ${padData.actionItems?.length ? `<div class="pad-section"><h2>Action Items</h2><ul>${renderList(padData.actionItems)}</ul></div>` : ''}
                                ${padData.changelog?.length ? `<div class="pad-section"><h2>Changelog</h2><ul>${renderList(padData.changelog)}</ul></div>` : ''}
                                ${padData.assumptions?.length ? `<div class="pad-section"><h2>Assumptions</h2><ul>${renderList(padData.assumptions)}</ul></div>` : ''}
                                ${padData.risks?.length ? `<div class="pad-section"><h2>Risks</h2><ul>${renderList(padData.risks)}</ul></div>` : ''}
                            </div>
                        </div>`;
                }
            }
        });
        
        padLog.innerHTML = historyHtml;
        // Scroll to the bottom after rendering new content
        setTimeout(() => {
             padLog.scrollTop = padLog.scrollHeight;
        }, 0);
    };


    // --- Main Render Function ---
    // Calls all individual render functions based on the current state
    const renderAll = (state) => {
        if (!state) { console.warn("RenderAll called with no state."); return; }
        try {
            renderFileList(state.fileRegistry, state.activeFileId);
            renderRulesList(state.userRules); // *** Call Rules Rendering ***
            renderTabBar(state.openTabRegistry, state.fileRegistry, state.activeFileId);
            updateActiveFileIndicator(state.activeFileId, state.fileRegistry);
            updateButtonStates(state.activeFileId, state.fileRegistry, state.viewMode);
            updateViewModeClass(state.viewMode);
            renderPad(state.padState); // NEW: Render PAD view
        } catch (error) {
            console.error("Error during UI rendering:", error);
            // Potentially show an error to the user or attempt recovery
        }
    };

    // Debounced resize handler
     const debouncedResizeHandler = debounce(() => {
         console.log("Resize detected, re-rendering tab bar...");
         const currentState = ApplicationStateService.getState();
         // Only need to re-render things affected by width, like the tab bar visibility
         renderTabBar(currentState.openTabRegistry, currentState.fileRegistry, currentState.activeFileId);
         // Editor refresh is handled by editorService itself
     }, DEBOUNCE_INTERVALS.RESIZE);


    const init = () => {
        console.log("Initializing UIRenderingOrchestrator subscriptions...");
        ApplicationStateService.subscribe(renderAll); // Subscribe renderAll to state changes
        window.addEventListener('resize', debouncedResizeHandler);
        console.log("UIRenderingOrchestrator subscriptions initialized.");
    };

    // Public interface
    return {
        forceRender: () => renderAll(ApplicationStateService.getState()), // Force render with current state
        triggerInitialResizeRender: () => debouncedResizeHandler(), // Call debounced version once on init
        init
    };
})();

export const UIRenderingOrchestrator = UIRenderingOrchestratorInternal;