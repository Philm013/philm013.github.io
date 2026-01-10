// app.js - Main application initialization and management

// For AI Instruction Modal: tracks the indicator being analyzed
let currentAnalyzingIndicator = { button: null, id: null, title: null };

// Keep track of the currently loaded rubric data
let currentRubricId = null;
let currentRubricData = null;
// Stores data for indicators selected to provide context in the AI chat
let chatSelectedIndicatorData = [];


/**
 * Centralized function to update the entire AI-related UI based on the current state.
 * It checks if the AI is initialized and if PDFs are loaded, then enables/disables
 * buttons and selectors accordingly, providing helpful tooltips and notifications.
 */
function updateAiFeatureUI() {
    const aiInitialized = !!window.genAiInstance;
    const pdfsLoaded = window.loadedPdfs && window.loadedPdfs.length > 0;

    const elementsToToggle = [
        ...document.querySelectorAll('.ai-analyze-btn'),
        document.getElementById('floatingQueryBtn')
    ];
    
    const selectorsToToggle = [
        ...document.querySelectorAll('.aiModelSelectorIndicator'),
        ...document.querySelectorAll('#aiModelSelectorChat')
    ];

    if (!aiInitialized) {
        // AI is not working at all (no valid key)
        elementsToToggle.forEach(el => {
            if (!el) return;
            el.disabled = true;
            el.title = "Set API Key in PDF menu to enable";
            el.style.opacity = "0.5";
            el.style.cursor = "not-allowed";
        });
        selectorsToToggle.forEach(sel => {
            if (!sel) return;
            sel.disabled = true;
            sel.title = "Set API Key in PDF menu to enable";
        });
        const floatingBtn = document.getElementById('floatingQueryBtn');
        if (floatingBtn) floatingBtn.style.display = 'none';
        showNotification("AI features disabled. Set your API Key in the 'Manage & Load PDFs' menu.", "info", 8000);
    } else if (!pdfsLoaded) {
        // AI is initialized, but no documents are loaded
        elementsToToggle.forEach(el => {
            if (!el) return;
            el.disabled = true;
            el.title = "Load at least one PDF to enable AI features";
            el.style.opacity = "0.5";
            el.style.cursor = "not-allowed";
        });
        selectorsToToggle.forEach(sel => {
            if (!sel) return;
            sel.disabled = false; // Selectors can be enabled
            sel.title = "Select AI model";
        });
        const floatingBtn = document.getElementById('floatingQueryBtn');
        if (floatingBtn) floatingBtn.style.display = 'none'; // Hide chat if no PDFs
        showNotification("AI is ready. Load PDFs to enable analysis and chat.", "info", 5000);
    } else {
        // AI is initialized AND PDFs are loaded - enable everything
        elementsToToggle.forEach(el => {
            if (!el) return;
            el.disabled = false;
            el.title = el.dataset.originalTitle || ''; // Restore original title
            el.style.opacity = "";
            el.style.cursor = "";
        });
        selectorsToToggle.forEach(sel => {
            if (!sel) return;
            sel.disabled = false;
            sel.title = "Select AI model";
        });
        const floatingBtn = document.getElementById('floatingQueryBtn');
        if (floatingBtn) floatingBtn.style.display = 'flex'; // Show chat button
    }
}


/**
 * Initializes the entire application.
 * Sets up UI elements, event listeners, database connection, AI services,
 * loads rubric data, and initializes the initial review state.
 * @async
 */
async function initApp() {
    try {
        console.log("[App] Waiting for SDK initialization promise...");
        if (window.sdkInitializationPromise) {
            await window.sdkInitializationPromise;
            console.log("[App] SDK initialization promise resolved.");
        } else {
            console.error("[App] SDK initialization promise not found on window object! AI might not initialize correctly.");
        }

        console.log("[App] Initializing Application Core...");

        // 1. Initialize Database
        await initDB();

        // 2. Initialize Review Data Structure and Core UI Logic
        // initReview() sets up generic event listeners; rubric-specific UI is rendered by loadRubric.
        initReview();

        // 3. Initialize Exports functionality
        initializeExports();

        // 4. Initialize AI Services and set up UI
        initializeAI(); // Checks window.genAiInstance and sets up the local 'genAI' in ai-analyzer.js
        updateAiFeatureUI(); // Centralized function to enable/disable all AI UI based on current state

        // 6. Setup Modals (generic structures are defined in HTML)
        setupLoadReviewModal();
        setupPdfLoadModal();
        setupPdfViewerModal();
        setupChatQueryModal();
        setupSelectIndicatorForChatModal();
        setupAiInstructionModal();
        setupEvidenceGuideModal(); // NEW: Call the setup function for the guide modal

        // 7. Setup Global Event Listeners (not tied to specific rubric structures)
        setupImportReview();
        setupImageViewer(); // Sets up the image viewer modal and its global click listener.
        setupPageLinkNavigation(); // Global listener for page links outside TinyMCE.

        // 8. Setup Rubric Selector and Load Default Rubric
        console.log("[App] Content of window.rubrics before setupRubricSelector:", Object.keys(window.rubrics));
        setupRubricSelector();
        // loadRubric() also calls createNewReview(), which renders the initial UI.

        console.log('[App] Application initialized successfully');

    } catch (error) {
        console.error('[App] FATAL: Error initializing application:', error);
        const body = document.body;
        if (body) {
            body.innerHTML = `<div style="padding: 20px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 5px; margin: 20px;">
                <h2>Application Initialization Failed</h2>
                <p>There was a critical error during startup. Please check the console for details and try refreshing the page.</p>
                <pre style="white-space: pre-wrap; word-break: break-all;">${sanitizeHTML(error.stack || error.message || 'Unknown error')}</pre>
            </div>`;
        }
        try { showNotification('Failed to initialize application: ' + (error.message || 'Unknown error'), 'error', 10000); } catch (e) { /* Silently fail if notification system itself failed */ }
    }
}

/**
 * Populates the rubric selector dropdown menu and sets up its change event listener.
 * Loads the default rubric after setup.
 */
function setupRubricSelector() {
    const selector = document.getElementById('rubricSelector');
    if (!selector) {
        console.error("Rubric selector element not found.");
        return;
    }

    selector.innerHTML = ''; // Clear existing options

    // Populate with loaded rubrics from window.rubrics
    const rubricIds = Object.keys(window.rubrics);
    if (rubricIds.length === 0) {
        console.error("[App] No rubric data loaded in window.rubrics! Cannot set up rubric selector.");
        selector.innerHTML = '<option value="">No rubrics found</option>';
        selector.disabled = true;
        showNotification("No rubric data loaded. Cannot start review.", "error", 0); // Persistent error
        return;
    }

    rubricIds.forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = window.rubrics[id].name || id; // Use rubric name or ID as text
        selector.appendChild(option);
    });

    // Set up change listener to load selected rubric
    selector.addEventListener('change', (event) => {
        const selectedRubricId = event.target.value;
        if (selectedRubricId && window.rubrics[selectedRubricId]) {
            // Prompt user before loading a new rubric if there's unsaved data
            if (isReviewModified()) { // isReviewModified() is from review.js
                if (!confirm("Switching rubrics will clear the current review. Make sure you have saved. Do you want to continue?")) {
                    selector.value = currentRubricId; // Revert selection if user cancels
                    return;
                }
            }
            loadRubric(selectedRubricId);
        }
    });

    // Load the initially selected or default rubric
    const defaultRubricId = selector.value || rubricIds[0]; // Use current value or first rubric
    if (defaultRubricId) {
        loadRubric(defaultRubricId);
    }

    console.log("[App] Rubric selector setup complete.");
}

/**
 * Loads and renders a specific rubric by its ID.
 * Updates the application state, renders the rubric UI, re-initializes relevant UI event listeners,
 * and starts a new review with the loaded rubric.
 * @param {string} rubricId - The ID of the rubric to load.
 */
function loadRubric(rubricId) {
    const rubricData = window.rubrics[rubricId];
    if (!rubricData) {
        console.error(`[App] Rubric data not found for ID: ${rubricId}`);
        showNotification(`Error loading rubric: "${rubricId}"`, "error");
        return;
    }

    console.log(`[App] Loading rubric: ${rubricData.name} (${rubricId})`);

    // 1. Update current rubric state
    currentRubricId = rubricId;
    // --- FIX: Explicitly assign to the window object for global access ---
    // This makes it available to other scripts like review.js that use `window.currentRubricData`.
    window.currentRubricData = rubricData;
    currentRubricData = rubricData; // Also update the local-scoped variable for consistency within app.js.


    // ---- Populate Grade Level dropdown based on rubric metadata ----
    const gradeLevelSelect = document.getElementById('gradeLevel');
    if (gradeLevelSelect) {
        const gradeLevelFieldDefinition = currentRubricData.metadataFields && currentRubricData.metadataFields.find(
            field => field.id === 'gradeLevel' && field.type === 'select' && Array.isArray(field.options)
        );

        gradeLevelSelect.innerHTML = ''; // Always clear existing options

        if (gradeLevelFieldDefinition && gradeLevelFieldDefinition.options.length > 0) {
            gradeLevelFieldDefinition.options.forEach(opt => {
                const optionElement = document.createElement('option');
                optionElement.value = opt.value;
                optionElement.textContent = opt.text;
                if (opt.selected) { // Handle default selection from rubric definition
                    optionElement.selected = true;
                }
                gradeLevelSelect.appendChild(optionElement);
            });
            gradeLevelSelect.disabled = false;
            console.log(`[App] Populated Grade Level dropdown from rubric: ${rubricId}`);
        } else {
            // Fallback if no valid grade level options are defined in the rubric
            const placeholderOption = document.createElement('option');
            placeholderOption.value = "";
            placeholderOption.textContent = currentRubricData.metadataFields ? "N/A for this rubric" : "Grade Level N/A";
            gradeLevelSelect.appendChild(placeholderOption);
            gradeLevelSelect.disabled = true; // Disable if no options or definition not found
            console.warn(`[App] Grade level options not found or malformed in rubric: ${rubricId}. Dropdown disabled.`);
        }
    } else {
        console.error("[App] Grade Level select element #gradeLevel not found in DOM.");
    }
    // ---- END Grade Level population ----

    // 2. Render the UI based on the selected rubric data (delegated to ui.js)
    renderRubricUI(rubricData);

    // 3. Re-setup UI event listeners that depend on the newly rendered rubric structure
    setupTabNavigation();       // Tabs are re-rendered
    setupIndicatorAccordions(); // Accordions are re-rendered
    setupScoringOptions();      // Scoring radio buttons are re-rendered
    setupEvidenceSection();     // Add/Remove evidence buttons are re-rendered
    setupAIAnalyzeButtons();    // AI analyze buttons within indicators

    // Setup tracking for metadata and summary notes after UI rendering
    setupMetadataFormTracking();
    setupSummaryNotesTracking();

    // 4. Start a new review using this rubric structure (delegated to review.js)
    createNewReview(rubricId);

    // 5. Update AI Model Selectors (if necessary, e.g., for rubric-specific models)
    populateAIModelSelectors();

    showNotification(`Rubric "${rubricData.name}" loaded. Started a new review.`, "info");
    console.log(`[App] Rubric loaded and new review created.`);
}

/**
 * Populates AI model selector dropdowns.
 * Currently sets default values based on predefined HTML options.
 * This function can be extended to dynamically populate models based on `currentRubricData` or other criteria.
 * Could also dynamically build the Model Selector based on available models on the SDK.
 */
function populateAIModelSelectors() {
    // For now, this function primarily ensures default selections are set.
    // It can be expanded to dynamically list models if AI capabilities change per rubric.
    const indicatorSelector = document.getElementById('aiModelSelectorIndicator');
    const chatSelector = document.getElementById('aiModelSelectorChat');

    // Set default selected options for indicator analysis model
    if (indicatorSelector) {
        if (indicatorSelector.querySelector('option[value="gemini-1.5-pro-latest"]')) {
            indicatorSelector.value = "gemini-1.5-pro-latest";
        } else if (indicatorSelector.options.length > 0) {
            indicatorSelector.value = indicatorSelector.options[0].value; // Fallback to the first option
        }
    }
    // Set default selected options for chat model
    if (chatSelector) {
        if (chatSelector.querySelector('option[value="gemini-1.5-pro-latest"]')) {
            chatSelector.value = "gemini-1.5-pro-latest";
        } else if (chatSelector.options.length > 0) {
            chatSelector.value = chatSelector.options[0].value; // Fallback to the first option
        }
    }
    // Event listeners for these selectors are typically global or set up elsewhere if their behavior is simple.
}


// ----------------------------------------------------------------------------
// --- Modal Setup Functions ---
// ----------------------------------------------------------------------------

/** NEW: Sets up the Evidence Guide Modal and its event listeners. */
function setupEvidenceGuideModal() {
    const modal = document.getElementById('evidenceGuideModal');
    const closeBtnTop = modal.querySelector('#closeEvidenceGuideModalBtn');
    const closeBtnBottom = modal.querySelector('#closeEvidenceGuideModalBtnBottom');
    const reviewContent = document.querySelector('.review-content');

    if (!modal || !closeBtnTop || !closeBtnBottom || !reviewContent) {
        console.error("Evidence Guide Modal or its components not found. Feature disabled.");
        return;
    }

    const closeModal = () => modal.style.display = 'none';

    closeBtnTop.addEventListener('click', closeModal);
    closeBtnBottom.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

  // Delegated listener for all "View Guide" buttons
    reviewContent.addEventListener('click', (event) => {
        const guideBtn = event.target.closest('.evidence-guide-btn');
        if (guideBtn) {
            const indicatorId = guideBtn.dataset.indicatorId;
            
            // Use the new function to get the indicator's config and its parent group context
            const { indicator: indicatorConfig, parentGroup } = findIndicatorWithContext(currentRubricData, indicatorId);

            if (indicatorConfig) {
                // Start with the specific indicator's guide, or an empty object if none exists
                const indicatorGuide = indicatorConfig.evidenceGuide || {};
                let finalEvidenceGuide = indicatorGuide;

                // If a parent group with an evidence guide exists, merge them.
                // The child's properties (e.g., scoringDetails) will overwrite the parent's, which is desired.
                if (parentGroup && parentGroup.evidenceGuide) {
                    finalEvidenceGuide = { ...parentGroup.evidenceGuide, ...indicatorGuide };
                }

                // **Crucial Fix**: Ensure the final guide object uses the specific sub-indicator's name for the modal title,
                // not the parent group's name that might have been inherited from the parent's evidenceGuide object.
                finalEvidenceGuide.indicatorName = indicatorConfig.name;
                
                // Only show the modal if there is actual guide content to display (more than just the name we added)
                if (Object.keys(finalEvidenceGuide).length > 1) { 
                    populateEvidenceGuideModal(finalEvidenceGuide);
                    modal.style.display = 'block';
                } else {
                    showNotification("Evidence guide not available for this indicator.", "warning");
                }
            } else {
                showNotification("Could not find configuration for this indicator.", "error");
            }
        }
    });
    console.log("Evidence Guide Modal setup complete.");
}
// ...

/** NEW: Populates the evidence guide modal with data from the indicator config. */
function populateEvidenceGuideModal(guideData) {
    const titleEl = document.getElementById('evidenceGuideTitle');
    const contentEl = document.getElementById('evidenceGuideContent');

    if (!titleEl || !contentEl) return;

    // Use innerHTML to include the icon
    titleEl.innerHTML = `<i class="fas fa-book-reader"></i> Evidence Guide: ${sanitizeHTML(guideData.indicatorName || 'Details')}`;

    let html = '';

    // Helper for creating sections with titles and icons
    const createSection = (title, content, iconClass) => {
        if (!content) return '';
        const iconHtml = iconClass ? `<i class="fas ${iconClass}"></i>` : '';
        return `<div class="guide-section"><h3>${iconHtml} ${sanitizeHTML(title)}</h3><div class="guide-section-content">${content}</div></div>`;
    };

    // Helper for creating styled lists
    const createList = (items) => {
        if (!items || !Array.isArray(items) || items.length === 0) return '<p class="na-value">N/A</p>';
        return `<ul>${items.map(item => `<li>${sanitizeHTML(item)}</li>`).join('')}</ul>`;
    };

    // Special "hero" section for the guiding question
    if (guideData.guidingQuestion) {
        html += `<div class="guide-hero-section">
                    <h4><i class="fas fa-question-circle"></i> Guiding Question</h4>
                    <p>${sanitizeHTML(guideData.guidingQuestion)}</p>
                 </div>`;
    }

    // Regular sections
    html += createSection('Purpose', `<p>${sanitizeHTML(guideData.purpose)}</p>`, 'fa-bullseye');
    html += createSection('Research or Standards Connection', `<blockquote>${sanitizeHTML(guideData.researchConnection)}</blockquote>`, 'fa-flask');

    // Scoring Details rendered as a grid of cards
    if (guideData.scoringDetails && guideData.scoringDetails.length > 0) {
        let scoringHtml = '<div class="scoring-details-grid">';
        scoringHtml += guideData.scoringDetails
            .map(d => `
                <div class="scoring-detail-card">
                    <div class="scoring-detail-header">Score ${sanitizeHTML(String(d.score))}</div>
                    <div class="scoring-detail-body">${sanitizeHTML(d.text)}</div>
                </div>`)
            .join('');
        scoringHtml += '</div>';
        html += createSection('Scoring Details', scoringHtml, 'fa-star-half-alt');
    }

    // Evidence collection broken into two distinct sections
    if (guideData.evidenceCollection) {
        html += createSection('Locations to Review', createList(guideData.evidenceCollection.locationsToReview), 'fa-search-location');
        html += createSection('Record Evidence of the Following', createList(guideData.evidenceCollection.recordEvidence), 'fa-clipboard-list');
    }
    
    if (guideData.clusterMeeting && guideData.clusterMeeting.questions && guideData.clusterMeeting.questions.length > 0) {
        html += createSection('Cluster Meeting Questions', createList(guideData.clusterMeeting.questions), 'fa-users');
    }

    contentEl.innerHTML = html;
}

/**
 * Sets up the AI Instruction Modal.
 * Initializes TinyMCE for the custom instruction input and sets up event listeners
 * for opening, closing, and submitting instructions for AI analysis.
 */
function setupAiInstructionModal() {
    const modal = document.getElementById('aiInstructionModal');
    const closeBtn = document.getElementById('closeAiInstructionModalBtn');
    const cancelBtn = document.getElementById('cancelAiInstructionBtn');
    const startAnalysisBtn = document.getElementById('startAnalysisWithInstructionBtn');
    const instructionEditorContainerId = 'aiCustomInstruction'; // Textarea ID for TinyMCE
    const indicatorTitleDisplay = document.getElementById('indicatorTitleDisplay');

    // Check if TinyMCE library is available
    if (typeof tinymce === 'undefined') {
        console.error("TinyMCE library not available. AI Instruction Modal TinyMCE editor cannot be initialized.");
        if (modal) modal.style.display = 'none'; // Hide modal if dependencies are missing
        return;
    }

    if (!modal || !closeBtn || !cancelBtn || !startAnalysisBtn || !document.getElementById(instructionEditorContainerId) || !indicatorTitleDisplay) {
        console.error("AI Instruction Modal elements not found. Feature may be disabled.");
        if (modal) modal.style.display = 'none'; // Hide modal if elements are missing
        return;
    }

    // Initialize TinyMCE for the instruction input field
    const existingEditor = tinymce.get(instructionEditorContainerId);
    if (existingEditor) {
        existingEditor.remove(); // Remove any existing instance before re-initializing
    }
    tinymce.init({
        selector: `#${instructionEditorContainerId}`,
        plugins: 'autoresize lists link code wordcount help',
        toolbar: 'undo redo | bold italic | bullist numlist | link code',
        menubar: false,
        statusbar: true,
        min_height: 120,
        autoresize_bottom_margin: 10,
        promotion: false, // Disables TinyMCE cloud promotion
        content_style: 'body { font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; }'
    });

    const closeModal = () => {
        modal.style.display = 'none';
        const editor = tinymce.get(instructionEditorContainerId);
        if (editor) {
            editor.setContent(''); // Clear content on close
        }
        currentAnalyzingIndicator = { button: null, id: null, title: null }; // Reset state
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); }); // Close on outside click

    startAnalysisBtn.addEventListener('click', () => {
        const editor = tinymce.get(instructionEditorContainerId);
        const customInstructionText = editor ? editor.getContent({ format: 'text' }).trim() : "";
        if (currentAnalyzingIndicator.button && currentAnalyzingIndicator.id) {
            analyzeIndicatorWithAI(currentAnalyzingIndicator.id, currentAnalyzingIndicator.button, customInstructionText);
        }
        closeModal(); // Close modal after initiating analysis
    });
    console.log("AI Instruction Modal setup complete.");
}

/**
 * Sets up the "Load Review" modal.
 * Populates the list of saved reviews and handles review selection for loading and deletion.
 */
function setupLoadReviewModal() {
    const modal = document.getElementById('loadReviewModal');
    const loadReviewBtn = document.getElementById('loadReviewBtn'); // Button to open the modal

    if (!modal || !loadReviewBtn) {
        console.warn("Load Review Modal elements (trigger button or modal itself) not found. Feature disabled.");
        if (loadReviewBtn) loadReviewBtn.disabled = true;
        return;
    }

    const closeBtn = modal.querySelector('.close'); // Close button within the modal
    const savedReviewsList = document.getElementById('savedReviewsList'); // Container for review items

    loadReviewBtn.addEventListener('click', async () => {
        try {
            const reviews = await getAllReviews(); // Fetch all saved reviews from DB
            savedReviewsList.innerHTML = ''; // Clear previous list

            if (!reviews || reviews.length === 0) {
                savedReviewsList.innerHTML = '<p>No saved reviews found.</p>';
            } else {
                // Sort reviews by last modified date, newest first
                reviews.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
                reviews.forEach(review => {
                    const reviewItem = document.createElement('div');
                    reviewItem.className = 'saved-review-item';
                    const rubricName = window.rubrics[review.rubricId]?.name || review.rubricId || 'Unknown Rubric';
                    // Display review metadata, sanitizing user-entered content
                    reviewItem.innerHTML = `
                        <div class="review-item-content">
                            <div><strong>${sanitizeHTML(review.metadata?.title || 'Untitled Review')}</strong> (${sanitizeHTML(rubricName)})</div>
                            <div>Publisher: ${sanitizeHTML(review.metadata?.publisher || 'N/A')}</div>
                            <div>Date: ${review.metadata?.date ? formatDate(review.metadata.date) : 'N/A'}</div>
                            <div>Last modified: ${review.lastModified ? new Date(review.lastModified).toLocaleString() : 'N/A'}</div>
                        </div>
                        <div class="review-item-actions">
                            <button class="btn small danger delete-review" data-id="${review.id}">Delete</button>
                        </div>
                    `;
                    // Event listener for clicking the review item to load it
                    reviewItem.querySelector('.review-item-content').addEventListener('click', () => {
                        try {
                            // Check if the rubric for this review is available
                            if (!window.rubrics[review.rubricId]) {
                                showNotification(`Cannot load review "${sanitizeHTML(review.metadata?.title || 'Untitled')}". Rubric "${review.rubricId}" is not available.`, "error", 10000);
                                console.error(`Attempted to load review with unknown rubric ID: ${review.rubricId}`);
                                return; // Stop if rubric is missing
                            }
                            // Prompt user before loading if current review has unsaved changes
                            if (isReviewModified()) {
                                if (!confirm("Loading a different review will clear the current review. Make sure you have saved. Do you want to continue?")) {
                                    return; // Abort loading if user cancels
                                }
                            }
                            loadReviewData(review); // loadReviewData will call loadRubric if needed
                            modal.style.display = 'none';
                            showNotification('Review loaded successfully', 'success');
                        } catch (error) {
                            console.error('Error loading review:', error);
                            showNotification('Error loading review: ' + error.message, 'error');
                        }
                    });
                    // Event listener for the delete button
                    reviewItem.querySelector('.delete-review').addEventListener('click', async (e) => {
                        e.stopPropagation(); // Prevent loading the review when clicking delete
                        if (confirm(`Are you sure you want to delete the review "${sanitizeHTML(review.metadata?.title || 'Untitled Review')}"? This cannot be undone.`)) {
                            try {
                                await deleteReview(review.id);
                                reviewItem.remove(); // Remove item from the list UI
                                showNotification('Review deleted successfully', 'success');
                                if (savedReviewsList.children.length === 0 || savedReviewsList.textContent.trim() === '') {
                                    savedReviewsList.innerHTML = '<p>No saved reviews found.</p>'; // Update if list becomes empty
                                }
                            } catch (error) {
                                console.error('Error deleting review:', error);
                                showNotification('Failed to delete review: ' + error.message, 'error');
                            }
                        }
                    });
                    savedReviewsList.appendChild(reviewItem);
                });
            }
            modal.style.display = 'block'; // Show the modal
        } catch (error) {
            console.error('Error populating load review modal:', error);
            showNotification('Failed to load saved reviews list: ' + error.message, 'error');
            savedReviewsList.innerHTML = '<p>Error loading reviews.</p>'; // Display error within the modal
            modal.style.display = 'block'; // Still show modal to display the error
        }
    });
    // Setup modal close listeners
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => { // Close on outside click
        if (event.target === modal) modal.style.display = 'none';
    });
    console.log("Load Review Modal setup complete.");
}

/**
 * Sets up the PDF Load/Management Modal.
 * Handles UI for adding PDFs via URL or file input, manages the list of loaded PDFs,
 * and manages saving the user's Gemini API key.
 */
function setupPdfLoadModal() {
    const modal = document.getElementById('loadPdfModal');
    const loadPdfBtn = document.getElementById('loadPdfBtn');
    if (!modal || !loadPdfBtn) {
        console.warn("PDF Load Modal trigger or container not found. PDF management may be disabled.");
        return;
    }

    const closeBtnTop = modal.querySelector('#closePdfModalBtn');
    const closeBtnBottom = modal.querySelector('#closePdfModalBtnBottom');
    
    // PDF Loading elements
    const urlInput = document.getElementById('pdfUrlInput');
    const fileInput = document.getElementById('pdfFileInput');
    const addBtn = document.getElementById('addPdfConfirmBtn');
    const statusDiv = document.getElementById('pdfAddStatus');
    const listDiv = document.getElementById('loadedPdfsList');

    // API Key Settings elements
    const apiKeyInput = document.getElementById('geminiApiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyStatus = document.getElementById('apiKeyStatus');

    if (!closeBtnTop || !closeBtnBottom || !urlInput || !fileInput || !addBtn || !statusDiv || !listDiv || !apiKeyInput || !saveApiKeyBtn || !apiKeyStatus) {
        console.error("One or more PDF Load Modal elements not found inside #loadPdfModal. PDF Management disabled.");
        loadPdfBtn.disabled = true; // Disable trigger if modal is broken
        return;
    }

    // --- Modal Opening ---
    loadPdfBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        renderPdfList(); // Render the current list of PDFs when opening
        statusDiv.textContent = ''; // Clear previous status messages
        urlInput.value = '';
        fileInput.value = '';

        // Populate API Key from localStorage
        const storedKey = localStorage.getItem('geminiApiKey');
        if (storedKey) {
            apiKeyInput.value = storedKey;
            apiKeyStatus.textContent = "API Key is set.";
            apiKeyStatus.style.color = "green";
        } else {
            apiKeyInput.value = '';
            apiKeyStatus.textContent = "API Key not set.";
            apiKeyStatus.style.color = "red";
        }
    });

    // --- Modal Closing ---
    const closeModal = () => modal.style.display = 'none';
    closeBtnTop.addEventListener('click', closeModal);
    closeBtnBottom.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    // --- API Key Saving Logic ---
    saveApiKeyBtn.addEventListener('click', async () => {
        const newApiKey = apiKeyInput.value.trim();

        // If key is empty, clear it and disable AI
        if (!newApiKey) {
            localStorage.removeItem('geminiApiKey');
            apiKeyStatus.textContent = "API Key removed.";
            apiKeyStatus.style.color = 'orange';
            showNotification("API Key cleared. AI features disabled.", "warning");
            window.genAiInstance = null;
            initializeAI(); // This will fail and trigger UI disabling
            return;
        }

        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.textContent = 'Verifying...';
        apiKeyStatus.textContent = 'Verifying key...';
        apiKeyStatus.style.color = 'blue';

        const success = await window.initializeGeminiSDK(newApiKey);

        if (success) {
            localStorage.setItem('geminiApiKey', newApiKey);
            apiKeyStatus.textContent = "API Key saved.";
            apiKeyStatus.style.color = "green";
            showNotification("API Key saved. AI features enabled.", "success");
            
            initializeAI(); // Re-initialize the local genAI variable in ai-analyzer.js
            updateAiFeatureUI(); // Update UI based on new state
        } else {
            // This block will now likely only be hit if the SDK fails to load/import.
            apiKeyStatus.textContent = "Error initializing AI. Check console.";
            apiKeyStatus.style.color = "red";
            showNotification("Failed to initialize AI SDK. Check console for errors.", "error");
            window.genAiInstance = null;
            initializeAI(); // Clear the local genAI variable
            updateAiFeatureUI(); // Update UI to show AI is disabled
        }
        
        saveApiKeyBtn.disabled = false;
        saveApiKeyBtn.textContent = 'Save & Verify Key';
    });


    // --- PDF Adding Logic ---
    addBtn.addEventListener('click', async () => {
        addBtn.disabled = true; addBtn.textContent = 'Adding...'; statusDiv.textContent = 'Processing...';
        const file = fileInput.files[0];
        const url = urlInput.value.trim();
        let source = null;
        let sourceName = '';

        if (file) {
            source = file;
            sourceName = file.name;
        } else if (url) {
            source = url;
            try { sourceName = new URL(url).pathname.split('/').pop() || url; } catch (e) { sourceName = url; }
        }

        if (source) {
            try {
                await addPdfToList(source, sourceName);
                statusDiv.textContent = `Added: ${sourceName.substring(0, 50)}${sourceName.length > 50 ? '...' : ''}`;
                urlInput.value = ''; fileInput.value = ''; // Clear inputs on success

                // After adding a PDF, just update the entire AI UI state
                updateAiFeatureUI();

            } catch (error) {
                statusDiv.textContent = `Error: ${error.message}`;
                console.error("Error adding PDF:", error);
            }
        } else {
            statusDiv.textContent = "Please select a file or enter a URL.";
        }
        addBtn.disabled = false; addBtn.textContent = 'Add PDF';
        renderPdfList(); // Re-render the list after adding or attempting to add
    });

    // Ensure only one input (file or URL) is active
    fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) urlInput.value = ''; });
    urlInput.addEventListener('input', () => { if (urlInput.value) fileInput.value = ''; });

    // Delegated event listeners for actions on the loaded PDFs list (remove, view)
    listDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-pdf-btn')) {
            const pdfId = event.target.dataset.id;
            if (confirm('Are you sure you want to remove this PDF?')) {
                removePdf(pdfId); // removePdf also handles AI disabling if no PDFs remain
                renderPdfList();
            }
        } else if (event.target.classList.contains('view-pdf-btn')) {
            const pdfId = event.target.dataset.id;
            if (pdfId) {
                viewPdf(pdfId); // Opens PDF in viewer modal
            } else {
                console.warn("View PDF button clicked but no data-id found.");
            }
        }
    });
    console.log("PDF Load/Management Modal setup complete.");
}

/**
 * Sets up the PDF Viewer Modal.
 * Handles displaying PDFs in an iframe and clearing resources on close.
 */
function setupPdfViewerModal() {
    const modal = document.getElementById('pdfViewerModal');
    const closeBtn = document.getElementById('closePdfViewerModalBtn');
    const iframe = document.getElementById('pdfViewerIframe');

    if (!modal || !closeBtn || !iframe) {
        console.error("PDF Viewer modal elements not found. Viewing disabled.");
        return;
    }

    const closeModal = () => {
        modal.style.display = 'none';
        iframe.src = 'about:blank'; // Clear the iframe content to prevent memory leaks
        // Revoke the Blob URL to free up memory if one was used
        if (typeof window.currentBlobUrl !== 'undefined' && window.currentBlobUrl) {
            URL.revokeObjectURL(window.currentBlobUrl);
            console.log("Revoked Blob URL on modal close:", window.currentBlobUrl);
            window.currentBlobUrl = null;
        }
    };

    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { // Close on outside click
        if (event.target === modal) closeModal();
    });
    console.log("PDF Viewer Modal setup complete.");
}

/**
 * Sets up the "Select Indicator for Chat" Modal.
 * This modal allows users to choose indicators whose details (title, criteria, evidence)
 * will be used as context for AI chat queries.
 */
function setupSelectIndicatorForChatModal() {
    const modal = document.getElementById('selectIndicatorForChatModal');
    const closeBtn = document.getElementById('closeSelectIndicatorForChatModalBtn');
    const cancelBtn = document.getElementById('cancelSelectIndicatorBtn');
    const addBtn = document.getElementById('addSelectedIndicatorsToChatBtn');
    const listContainer = document.getElementById('indicatorForChatList');

    if (!modal || !closeBtn || !cancelBtn || !addBtn || !listContainer) {
        console.error("Select Indicator for Chat Modal elements not found. Feature may be disabled.");
        const openModalBtn = document.getElementById('addIndicatorContextBtn');
        if (openModalBtn) openModalBtn.disabled = true; // Disable button that opens this modal
        return;
    }

    const closeModal = () => {
        modal.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); }); // Close on outside click

    addBtn.addEventListener('click', () => {
        collectAndSetIndicatorChatContext(); // Collect selected indicators and update context
        closeModal();
    });
    console.log("Select Indicator for Chat Modal setup complete.");
}

/**
 * Opens and populates the "Select Indicator for Chat" Modal with indicators from the current rubric.
 */
function openSelectIndicatorForChatModal() {
    if (!currentRubricData) {
        showNotification("No rubric loaded. Cannot select indicators.", "warning");
        return;
    }
    populateIndicatorForChatList(); // Populate the list with checkboxes for each indicator
    const modal = document.getElementById('selectIndicatorForChatModal');
    if (modal) modal.style.display = 'block';
}

/**
 * Populates the list of indicators in the "Select Indicator for Chat" modal.
 * Creates checkboxes for each indicator, allowing users to select them.
 */
function populateIndicatorForChatList() {
    const listDiv = document.getElementById('indicatorForChatList');
    if (!listDiv || !currentRubricData) return;

    listDiv.innerHTML = ''; // Clear previous list
    let hasIndicators = false;

    // Iterate through gateways, criteria, and items (indicators) of the current rubric
    currentRubricData.gateways.forEach(gateway => {
        gateway.criterionSections.forEach(criterion => {
            criterion.items.forEach(item => {
                const processIndicatorItem = (indicator, pathPrefix) => {
                    hasIndicators = true;
                    const listItem = document.createElement('div');
                    listItem.className = 'indicator-chat-list-item';
                    // Check if indicator is already selected for context
                    const isChecked = chatSelectedIndicatorData.some(s => s.id === indicator.id) ? 'checked' : '';
                    listItem.innerHTML = `
                        <label>
                            <input type="checkbox" value="${sanitizeHTML(indicator.id)}" data-indicator-name="${sanitizeHTML(indicator.name)}" ${isChecked}>
                            <span class="indicator-name">${sanitizeHTML(indicator.name)}</span>
                            <span class="indicator-path">(${sanitizeHTML(pathPrefix)}${sanitizeHTML(indicator.id)})</span>
                        </label>
                    `;
                    listDiv.appendChild(listItem);
                };

                if (item.type === 'group') { // Handle grouped indicators
                    item.items.forEach(subIndicator => {
                        processIndicatorItem(subIndicator, `${gateway.name} > ${criterion.name} > ${item.name} > `);
                    });
                } else { // Handle regular indicators
                    processIndicatorItem(item, `${gateway.name} > ${criterion.name} > `);
                }
            });
        });
    });

    if (!hasIndicators) {
        listDiv.innerHTML = '<p>No indicators found in the current rubric.</p>';
    }
}

/**
 * Collects details of selected indicators from the "Select Indicator for Chat" modal.
 * Updates the `chatSelectedIndicatorData` array with the title, criteria, and evidence
 * for each chosen indicator. This data is then used as context in AI chat queries.
 */
function collectAndSetIndicatorChatContext() {
    const selectedCheckboxes = document.querySelectorAll('#indicatorForChatList input[type="checkbox"]:checked');
    if (!currentRubricData) return;

    // Ensure current evidence data is up-to-date before collecting
    if (typeof window.updateEvidenceData === 'function') {
        window.updateEvidenceData(); // This function should be in review.js
    } else {
        console.warn("updateEvidenceData function not found. Evidence context might be stale.");
    }

    const newSelectedData = [];
    selectedCheckboxes.forEach(checkbox => {
        const indicatorId = checkbox.value;
        const indicatorConfig = findIndicatorConfig(currentRubricData, indicatorId); // From utils.js

        let gatewayIdForIndicator = null;
        // Find the gatewayId for this indicator to access its review data in `currentReview`
        for (const gw of currentRubricData.gateways) {
            if (findIndicatorsInGatewayConfig(gw).some(ind => ind.id === indicatorId)) {
                gatewayIdForIndicator = gw.id;
                break;
            }
        }

        if (indicatorConfig && gatewayIdForIndicator && currentReview.gateways[gatewayIdForIndicator]?.indicators[indicatorId]) {
            const indicatorReviewData = currentReview.gateways[gatewayIdForIndicator].indicators[indicatorId];
            
            // Combine strengths and gaps into a single evidence string for context
            let evidenceString = "No evidence entered yet.";
            const strengths = indicatorReviewData.strengths || [];
            const gaps = indicatorReviewData.gaps || [];
            if (strengths.length > 0 || gaps.length > 0) {
                let strengthText = strengths.map(e => e.text || "").join("\n<hr/>\n");
                let gapText = gaps.map(e => e.text || "").join("\n<hr/>\n");
                evidenceString = '';
                if (strengthText) evidenceString += `<strong>Strengths:</strong>\n${strengthText}`;
                if (gapText) evidenceString += `\n\n<strong>Gaps/Weaknesses:</strong>\n${gapText}`;
            }

            let criteriaString = "No specific scoring criteria listed.";
            if (indicatorConfig.scoringCriteria && indicatorConfig.scoringCriteria.length > 0) {
                criteriaString = indicatorConfig.scoringCriteria.map(c => `- ${c}`).join("\n");
            }

            newSelectedData.push({
                id: indicatorId,
                title: indicatorConfig.name,
                criteria: criteriaString,
                evidenceString: evidenceString, // Store potentially lengthy HTML string
                evidenceGuide: indicatorConfig.evidenceGuide || null // UPDATED: Include the evidence guide
            });
        }
    });
    chatSelectedIndicatorData = newSelectedData; // Update global context array
    renderSelectedIndicatorContextInChatDisplay(); // Update the display in the chat modal
}

/**
 * Renders the selected indicator context (titles) in the main chat query modal.
 * Provides a visual confirmation of which indicators are currently providing context.
 */
function renderSelectedIndicatorContextInChatDisplay() {
    const displayDiv = document.getElementById('chatSelectedIndicatorContext');
    if (!displayDiv) return;

    if (chatSelectedIndicatorData.length === 0) {
        displayDiv.innerHTML = '<p class="no-context">No indicator context added. Click "Add Indicator Context" to select.</p>';
    } else {
        let html = '<p><strong>Context for next query:</strong></p><ul>';
        chatSelectedIndicatorData.forEach(data => {
            html += `<li>${sanitizeHTML(data.title)} (ID: ${sanitizeHTML(data.id)})</li>`;
        });
        html += '</ul>';
        html += '<button id="clearIndicatorChatContextBtn" class="btn danger very-small clear-context-btn">Clear Context</button>';
        displayDiv.innerHTML = html;

        // Add event listener for the "Clear Context" button
        const clearBtn = document.getElementById('clearIndicatorChatContextBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearIndicatorChatContext);
        }
    }
}

/**
 * Clears the selected indicator context for the AI chat.
 * Resets `chatSelectedIndicatorData` and updates the display in the chat modal.
 */
function clearIndicatorChatContext() {
    chatSelectedIndicatorData = [];
    renderSelectedIndicatorContextInChatDisplay();
    showNotification("Indicator context for chat cleared.", "info");
}

/**
 * Sets up the Chat Query Modal.
 * Handles UI for submitting queries to the AI, displaying chat history,
 * model selection, and managing indicator context for queries.
 */
function setupChatQueryModal() {
    const floatingBtn = document.getElementById('floatingQueryBtn'); // Floating button to open chat
    const modal = document.getElementById('chatQueryModal');
    if (!floatingBtn || !modal) {
        console.warn("Floating chat button or chat query modal not found. Chat feature may be disabled.");
        return;
    }

    const closeBtn = document.getElementById('closeChatQueryModalBtn');
    const queryInput = document.getElementById('chatQueryInput');
    const submitBtn = document.getElementById('submitChatQueryBtn');
    const chatLog = document.getElementById('chatLog');
    const spinner = document.getElementById('chatQuerySpinner'); // Not directly used here, handled by appendThinkingMessage
    const modelSelector = document.getElementById('aiModelSelectorChat');
    const clearBtn = document.getElementById('clearBtn'); // Button to clear chat history
    const addIndicatorContextBtn = document.getElementById('addIndicatorContextBtn'); // Button to open indicator selection modal

    if (!closeBtn || !queryInput || !submitBtn || !chatLog || !spinner || !modelSelector || !clearBtn || !addIndicatorContextBtn) {
        console.error("One or more Chat Query Modal elements not found. Floating query disabled.");
        if (floatingBtn) floatingBtn.style.display = 'none';
        return;
    }

    setChatLogPlaceholder(chatLog); // Set initial placeholder message in chat log
    renderSelectedIndicatorContextInChatDisplay(); // Initialize display of selected indicator context

    floatingBtn.addEventListener('click', () => {
        // Pre-checks before opening the modal
        if (!genAI) {
            showNotification("AI service is not available.", "error");
            console.warn("Attempted to open chat modal, but genAI is null.");
            return;
        }
        if (loadedPdfs.length === 0) {
            showNotification("Load PDFs first using 'Manage & Load PDFs' to enable chat.", "warning");
            console.warn("Attempted to open chat modal, but no PDFs are loaded.");
            return;
        }
        // Enable/disable "Add Indicator Context" button based on rubric presence
        if (!currentRubricData) {
            addIndicatorContextBtn.disabled = true;
            addIndicatorContextBtn.title = "Load a rubric first";
        } else {
            addIndicatorContextBtn.disabled = false;
            addIndicatorContextBtn.title = "Add context from specific indicators to your query";
        }

        modal.style.display = 'block';
        chatLog.scrollTop = chatLog.scrollHeight; // Scroll to bottom
        queryInput.focus(); // Focus on the input field
    });

    addIndicatorContextBtn.addEventListener('click', openSelectIndicatorForChatModal); // Open indicator selection

    const closeModal = () => modal.style.display = 'none';
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); }); // Close on outside click

    submitBtn.addEventListener('click', async () => {
        const userMessage = queryInput.value.trim();
        const selectedModel = modelSelector.value;

        if (!userMessage) {
            showNotification("Please enter a question.", "warning");
            return;
        }
        if (!genAI) {
             showNotification("AI service is not available for chat.", "error");
             return;
        }
         if (loadedPdfs.length === 0) {
             showNotification("No PDFs loaded to chat about. Please load PDFs first.", "warning");
             return;
        }


        const thinkingId = `thinking_${generateUniqueId()}`;
        if (chatLog.querySelector('.chat-placeholder')) chatLog.innerHTML = ''; // Clear placeholder
        appendMessageToChat('user', userMessage); // Display user's message
        appendThinkingMessage(thinkingId); // Display "Thinking..." indicator
        queryInput.value = ''; // Clear input field

        submitBtn.disabled = true;
        queryInput.disabled = true;
        queryInput.placeholder = "AI is thinking...";

        try {
            // Get base prompt including chat history and selected indicator context
            const basePrompt = getChatHistoryForPrompt(chatSelectedIndicatorData);
            const fullPromptForAI = `${basePrompt}\nUser: ${userMessage}`; // Append current user message

            const aiResponseText = await customQueryWithAI(fullPromptForAI, selectedModel);
            updateThinkingMessage(thinkingId, aiResponseText || "(No response from AI)"); // Update "Thinking..." with AI response
        } catch (error) {
            console.error("Custom query API Error:", error);
            updateThinkingMessage(thinkingId, `Error: ${error.message}`);
            showNotification(`Query failed: ${error.message}`, "error");
        } finally {
            submitBtn.disabled = false;
            queryInput.disabled = false;
            queryInput.placeholder = "Type your question here...";
            if (chatLog) chatLog.scrollTop = chatLog.scrollHeight; // Scroll to latest message
        }
    });

    clearBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the chat history? This cannot be undone.")) {
            clearChatHistoryData(); // Clear internal chat history array
            setChatLogPlaceholder(chatLog); // Reset UI to placeholder
            showNotification("Chat history cleared.", "info");
            queryInput.focus();
        }
    });

    // Allow submitting message with Enter key (if Shift is not pressed)
    queryInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent newline in textarea
            if (!submitBtn.disabled) { // Only submit if not already processing
                submitBtn.click();
            }
        }
    });
    console.log("Floating Chat Query Modal setup complete.");
}

// ----------------------------------------------------------------------------
// --- Event Listener Setup Functions ---
// ----------------------------------------------------------------------------

/**
 * Sets up delegated event listeners for AI Analyze buttons within the review content area.
 * When an "AI Analyze" button is clicked, it opens the AI Instruction Modal.
 */
function setupAIAnalyzeButtons() {
    const reviewContent = document.querySelector('.review-content');
    if (!reviewContent) {
        console.error("Cannot find .review-content to delegate AI Analyze button listeners.");
        return;
    }
    // Use a flag to ensure the listener is only added once to reviewContent
    if (reviewContent._aiAnalyzeListenerAdded) return;

    reviewContent.addEventListener('click', (event) => {
        const button = event.target.closest('.ai-analyze-btn');
        if (button) {
            // Pre-checks for AI analysis
            if (!genAI) {
                showNotification("AI service is not available.", "error");
                console.warn("Attempted to analyze, but genAI is null.");
                return;
            }
            if (loadedPdfs.length === 0) {
                showNotification("Load PDFs first using 'Manage & Load PDFs'.", "warning");
                console.warn("Attempted to analyze, but no PDFs are loaded.");
                return;
            }
            if (!currentRubricData) {
                showNotification("Rubric data not loaded. Cannot perform analysis.", "error");
                console.warn("Attempted to analyze, but currentRubricData is null.");
                return;
            }

            const indicatorElement = button.closest('.indicator');
            if (indicatorElement) {
                const indicatorId = indicatorElement.getAttribute('data-indicator');
                // Get indicator title from rubric data for consistency, not from DOM
                const indicatorConfig = findIndicatorConfig(currentRubricData, indicatorId);
                const indicatorTitleText = indicatorConfig ? indicatorConfig.name : (indicatorElement.querySelector('.indicator-header h4')?.textContent?.trim() || `Indicator ${indicatorId}`);

                if (indicatorId) {
                    // Store details of the indicator being analyzed for the instruction modal
                    currentAnalyzingIndicator = { button: button, id: indicatorId, title: indicatorTitleText };
                    const instructionModal = document.getElementById('aiInstructionModal');
                    const titleDisplay = document.getElementById('indicatorTitleDisplay');
                    const instructionEditor = tinymce.get('aiCustomInstruction'); // Get TinyMCE instance

                    if (instructionModal && titleDisplay && instructionEditor) {
                        titleDisplay.innerHTML = `Analyzing: <strong>${sanitizeHTML(indicatorTitleText)}</strong>`;
                        instructionEditor.setContent(''); // Clear previous instructions
                        instructionModal.style.display = 'block';
                        // Focus the editor after a short delay to ensure modal is visible
                        setTimeout(() => { instructionEditor.focus(); }, 50);
                    } else {
                        // Fallback if modal components are missing or TinyMCE failed to initialize
                        console.warn("AI Instruction Modal or its TinyMCE editor not fully available, analyzing directly without instructions.");
                        analyzeIndicatorWithAI(indicatorId, button, ""); // Analyze directly with empty instruction
                    }
                } else {
                    console.error("Could not find indicator ID for AI analysis button.");
                    showNotification("Error triggering AI analysis: Indicator ID missing.", "error");
                }
            }
        }
    });
    reviewContent._aiAnalyzeListenerAdded = true; // Mark listener as added
    console.log("AI Analyze button listeners attached via delegation (with instruction modal).");
}

/**
 * Handles click events on page links (elements with class '.page-link').
 * Extracts page number and PDF ID (if available) and attempts to open the PDF
 * viewer to the specified page of the specified PDF.
 * @param {Event} event - The click event.
 */
function handlePageLinkClick(event) {
    event.preventDefault(); // Prevent default link navigation
    const pageLink = event.target.closest('.page-link');
    if (!pageLink) return;

    const pageNumStr = pageLink.dataset.page || pageLink.textContent; // Page number from data-page or link text
    const pageNum = parseInt(pageNumStr, 10);

    if (isNaN(pageNum)) {
        console.warn("Invalid page number in link:", pageNumStr);
        showNotification("Invalid page number in link.", "warning");
        return;
    }

    const linkPdfId = pageLink.dataset.pdfId; // PDF ID from data-pdf-id attribute
    let pdfToViewId = linkPdfId;
    let pdfName = "the document";

    if (!pdfToViewId) {
        // If link has no specific PDF ID, fall back to the first loaded PDF
        pdfToViewId = loadedPdfs.length > 0 ? loadedPdfs[0].id : null;
        const fallbackPdf = loadedPdfs.length > 0 ? loadedPdfs[0] : null;
        pdfName = fallbackPdf?.name || (loadedPdfs.length > 0 ? 'the first loaded document' : 'a document');
        console.log(`Link has no data-pdf-id, falling back to ${pdfName} (ID: ${pdfToViewId})`);
    } else {
        // If link specifies a PDF ID, try to get its name for notifications
        const linkedPdf = loadedPdfs.find(p => p.id === linkPdfId);
        if (linkedPdf) {
            pdfName = linkedPdf.name;
        } else {
            // PDF ID found in link, but that PDF is not currently loaded
            showNotification(`Error: PDF source for this link ("${pageLink.textContent}") is not currently loaded. (PDF ID: ${linkPdfId})`, "error", 8000);
            console.error(`Attempted to view PDF ID ${linkPdfId} from link, but it is not in loadedPdfs.`);
            return; // Stop if linked PDF isn't loaded
        }
        console.log(`Link specifies PDF ID ${linkPdfId} (${pdfName}). Using this PDF.`);
    }

    if (pdfToViewId) {
        console.log(`Attempting to view PDF ID ${pdfToViewId} at page ${pageNum}`);
        viewPdf(pdfToViewId, pageNum); // Call viewPdf to open the PDF viewer
    } else {
        console.warn("No PDF loaded or identified by link to navigate.");
        showNotification("No PDF loaded or identified by the link to navigate to page.", "warning");
    }
}

/**
 * Sets up event listeners for page links within a specific parent HTML element.
 * Useful for applying listeners to dynamically loaded content, like TinyMCE editor bodies.
 * Uses event delegation on the parent element.
 * @param {HTMLElement} parentElement - The parent element to attach the delegated listener to.
 */
function setupPageLinkNavigationForElement(parentElement) {
    if (!parentElement) return;
    // Use a flag on the element to prevent attaching multiple listeners
    if (parentElement._pageLinkListenerAttached) return;

    parentElement.addEventListener('click', handlePageLinkClick);
    parentElement._pageLinkListenerAttached = true; // Set flag

    console.log(`Applied page link listener to element:`, parentElement);
}

/**
 * Sets up a global event listener on the document body for page link navigation.
 * Catches clicks on '.page-link' elements that are NOT inside a TinyMCE iframe's body
 * (those are handled by `setupPageLinkNavigationForElement`).
 */
function setupPageLinkNavigation() {
    // Use a flag on document.body to prevent attaching multiple global listeners
    if (document.body._globalPageLinkListenerAdded) return;

    document.body.addEventListener('click', (event) => {
        const pageLink = event.target.closest('a.page-link');
        // Check if the click originated from within a TinyMCE editor iframe
        const isClickInsideTinymceIframe = event.target.ownerDocument !== document &&
            Array.from(tinymce.editors).some(editor =>
                editor && editor.getDoc && editor.getDoc() === event.target.ownerDocument
            );

        if (pageLink && !isClickInsideTinymceIframe) {
            console.log("Page link clicked on main document body (not TinyMCE iframe):", pageLink);
            handlePageLinkClick(event); // Use the common handler
        }
    });
    document.body._globalPageLinkListenerAdded = true; // Mark listener as added
    console.log("Global page link navigation listener setup complete on document.body.");
}

/**
 * Sets up the "Import Review" functionality.
 * Attaches an event listener to the import button, which triggers a hidden file input.
 * Handles file selection and calls the appropriate import function based on file type.
 */
function setupImportReview() {
    const importBtn = document.getElementById('importReviewBtn');
    if (!importBtn) {
        console.warn("Import button not found. Import feature disabled.");
        return;
    }
    // Use a flag to prevent adding multiple listeners
    if (importBtn._importListenerAdded) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.html'; // Currently supports HTML import only
    fileInput.style.display = 'none'; // Hidden input, triggered programmatically

    // Append to body only if not already present (e.g., from a previous setup call)
    if (!document.body.contains(fileInput)) { // More robust check
       document.body.appendChild(fileInput);
    }

    // Trigger the hidden file input when the import button is clicked
    importBtn.addEventListener('click', () => fileInput.click());

    // Handle file selection
    fileInput.addEventListener('change', async (event) => {
        if (event.target.files.length === 0) {
            console.log("No file selected for import.");
            return; // No file selected
        }
        const file = event.target.files[0];
        showNotification(`Importing "${file.name}"...`, 'info', 5000);

        try {
            const fileExtension = file.name.toLowerCase().split('.').pop();
            if (fileExtension === 'html') {
                await importReviewFromHTML(file); // Call HTML import logic (from review.js)
            } else {
                throw new Error('Unsupported file type. Please select an exported EdReports Review HTML file.');
            }
        } catch (error) {
            console.error('Error importing review:', error);
            showNotification('Failed to import review: ' + error.message, 'error', 8000);
        } finally {
            fileInput.value = ''; // Clear the file input to allow re-selecting the same file
        }
    });
    importBtn._importListenerAdded = true; // Mark listener as added
    console.log("Import review setup complete.");
}


// ----------------------------------------------------------------------------
// --- Chat UI Helper Functions ---
// ----------------------------------------------------------------------------

/**
 * Sets a placeholder message in the chat log if it's empty.
 * @param {HTMLElement} chatLogElement - The chat log container element.
 */
function setChatLogPlaceholder(chatLogElement) {
    if (chatLogElement) {
        const currentPlaceholder = chatLogElement.querySelector('.chat-placeholder');
        if (!currentPlaceholder && chatLogElement.children.length === 0) { // Add only if truly empty
            chatLogElement.innerHTML = '<div class="chat-placeholder">Ask a question about the loaded PDFs to start the chat!</div>';
        }
    }
}

/**
 * Appends a message to the chat log UI and adds it to the internal chat history.
 * @param {string} role - The role of the message sender ('user' or 'ai').
 * @param {string} text - The raw message text.
 */
function appendMessageToChat(role, text) {
    const logDiv = document.getElementById('chatLog');
    if (!logDiv) return;

    const placeholder = logDiv.querySelector('.chat-placeholder');
    if (placeholder) placeholder.remove(); // Remove placeholder if present

    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', role);

    let formattedContent;
    if (role === 'ai') {
        // For AI responses: Convert Markdown to HTML, sanitize, then linkify page numbers
        let htmlContent = markdownToHTML(text);    // Convert Markdown
        let sanitizedHtml = sanitizeHTML(htmlContent); // Sanitize potentially unsafe HTML
        formattedContent = linkifyPageNumbers(sanitizedHtml); // Create page links
    } else {
        // For user messages: Escape HTML to prevent injection, then convert newlines
        const tempDiv = document.createElement('div');
        tempDiv.textContent = text;
        formattedContent = tempDiv.innerHTML.replace(/\n/g, '<br>'); // Convert newlines to <br>
    }

    // Use innerHTML to render formatted content (which may include HTML tags)
    messageElement.innerHTML = `
        ${formattedContent}
        <span class="timestamp">${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
    `;

    // Ensure external links in AI messages open in new tabs
    if (role === 'ai') {
        messageElement.querySelectorAll('a:not(.page-link)').forEach(a => {
            if (!a.target) a.target = '_blank'; // Avoid overriding existing target attributes
        });
        // Page link click handling for '.page-link' is managed by global listeners.
    }

    logDiv.appendChild(messageElement);
    logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll to the latest message
    addMessageToHistory(role, text); // Add raw message to internal history array (ai-analyzer.js)
}

/**
 * Appends a "Thinking..." message to the chat log UI while waiting for an AI response.
 * @param {string} thinkingId - A unique ID for the "Thinking..." message element.
 */
function appendThinkingMessage(thinkingId) {
    const logDiv = document.getElementById('chatLog');
    if (!logDiv) return;

    const placeholder = logDiv.querySelector('.chat-placeholder');
    if (placeholder) placeholder.remove(); // Remove placeholder if present

    const thinkingElement = document.createElement('div');
    thinkingElement.id = thinkingId;
    thinkingElement.className = 'chat-message ai ai-pending'; // 'ai-pending' for styling spinner
    thinkingElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Thinking...`;

    logDiv.appendChild(thinkingElement);
    logDiv.scrollTop = logDiv.scrollHeight; // Scroll to the thinking indicator
    // Note: The "Thinking..." message itself is not added to chatHistory.
}

/**
 * Updates a "Thinking..." message in the chat log with the actual AI response or an error.
 * @param {string} thinkingId - The ID of the "Thinking..." message element to update.
 * @param {string} messageText - The AI response text or error message.
 */
function updateThinkingMessage(thinkingId, messageText) {
    const thinkingElement = document.getElementById(thinkingId);
    if (!thinkingElement) return;

    // Remove pending state and clear "Thinking..." content
    thinkingElement.classList.remove("ai-pending");
    thinkingElement.innerHTML = ''; // Clear spinner and text

    let formattedContent;
    if (messageText.startsWith("Error:")) {
        thinkingElement.classList.add('error'); // Style as an error message
        const tempDiv = document.createElement('div'); // For safe text insertion
        tempDiv.textContent = messageText;
        formattedContent = tempDiv.innerHTML;
        addMessageToHistory('ai', messageText); // Add error message to history
    } else {
        thinkingElement.classList.remove('error'); // Ensure no error styling
        thinkingElement.classList.add('ai'); // Ensure 'ai' class for consistent styling
        // Process AI response: Markdown to HTML, sanitize, then linkify
        let htmlContent = markdownToHTML(messageText);
        let sanitizedHtml = sanitizeHTML(htmlContent);
        formattedContent = linkifyPageNumbers(sanitizedHtml);
        addMessageToHistory('ai', messageText); // Add actual AI response to history
    }

    thinkingElement.innerHTML = `
       ${formattedContent}
       <span class="timestamp">${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
    `;

    // Ensure external links open in new tabs
    thinkingElement.querySelectorAll('a:not(.page-link)').forEach(a => {
        if (!a.target) a.target = '_blank';
    });
    // Page link click handling is global.

    // Scroll to the updated message
    if (thinkingElement.parentElement) {
         // Ensure scroll to bottom after content update, which might change height
        thinkingElement.parentElement.scrollTop = thinkingElement.parentElement.scrollHeight;
    }
}


// ----------------------------------------------------------------------------
// --- App Initialization Trigger ---
// ----------------------------------------------------------------------------

// Initialize the application once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);