// review.js - Manages review data structure, UI interactions related to review content,
//             saving/loading, and TinyMCE editor instances for evidence.

/**
 * @global
 * @type {object} currentReview - Holds the active review's data, including metadata,
 * gateway scores, indicator details (scores, evidence), and summary.
 * Initialized by `createInitialReviewData`.
 */
let currentReview = {
    id: null,
    rubricId: null,
    metadata: { title: '', publisher: '', gradeLevel: '', date: '', reviewerName: '' },
    gateways: {},
    summary: { notes: '', finalRating: 'Not Rated' }
};

/**
 * @global
 * @type {object|null} currentRubricData - Holds the configuration data for the currently loaded rubric.
 * Set by `loadRubric` in app.js.
 */
// This variable is declared in app.js and initialized to null.

/**
 * Initializes generic review UI event listeners that are not dependent on a specific rubric's structure.
 */
function initReview() {
    setupTabNavigation();
    setupIndicatorAccordions();
    setupScoringOptions();
    setupEvidenceSection();
    setupCollapsibleMetadata();
    setupMetadataFormTracking();
    setupSummaryNotesTracking();

    document.getElementById('saveBtn').addEventListener('click', saveCurrentReview);
    document.getElementById('newReviewBtn').addEventListener('click', () => {
        if (currentRubricId) {
            if (isReviewModified() && !confirm("Creating a new review will clear unsaved changes. Continue?")) return;
            createNewReview(currentRubricId);
        } else {
            showNotification("Please select a rubric first to create a new review.", "warning");
        }
    });
    console.log("[Review] Generic UI listeners initialized.");
}

/**
 * Sets up an event listener for the summary notes textarea to update `currentReview.summary.notes`.
 */
function setupSummaryNotesTracking() {
    const summaryNotesEl = document.getElementById('summaryNotes');
    if (summaryNotesEl) {
        if (summaryNotesEl._notesListenerAdded) return;
        summaryNotesEl.addEventListener('input', (event) => {
            if (!currentReview.summary) currentReview.summary = { notes: '', finalRating: 'Not Rated' };
            currentReview.summary.notes = event.target.value;
        });
        summaryNotesEl._notesListenerAdded = true;
    }
}

/**
 * Sets up tab navigation within the review content area.
 */
function setupTabNavigation() {
    const tabsContainer = document.querySelector('#rubricContent .tabs');
    if (!tabsContainer) return;
    if (tabsContainer._tabNavListenerAdded) return;

    tabsContainer.addEventListener('click', (event) => {
        const button = event.target.closest('.tab-btn');
        if (!button) return;
        const reviewContent = button.closest('.review-content');
        if (!reviewContent) return;

        reviewContent.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        reviewContent.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        const tabContent = reviewContent.querySelector(`#${tabId}`);
        if (tabContent) tabContent.classList.add('active');

        if (tabId === 'summary' && typeof updateGatewayScores === 'function') {
            updateGatewayScores();
        }
    });
    tabsContainer._tabNavListenerAdded = true;
}

/**
 * Sets up the collapsible functionality for the review metadata section.
 */
function setupCollapsibleMetadata() {
    const metadataSection = document.querySelector('.review-metadata');
    const toggleButton = document.querySelector('.review-metadata-toggle');
    if (metadataSection && toggleButton) {
        if (toggleButton._metaCollapseListenerAdded) return;
        toggleButton.addEventListener('click', () => {
            metadataSection.classList.toggle('collapsed');
            localStorage.setItem('metadataSectionCollapsed', metadataSection.classList.contains('collapsed'));
        });
        if (localStorage.getItem('metadataSectionCollapsed') === 'true') {
            metadataSection.classList.add('collapsed');
        }
        toggleButton._metaCollapseListenerAdded = true;
    }
}

/**
 * Imports a review from an HTML file.
 * @async
 * @param {File} file - The HTML file object to import.
 * @returns {Promise<object>} A promise that resolves with the imported review data.
 */
function importReviewFromHTML(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const htmlContent = event.target.result;
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');

                const importedReviewId = doc.querySelector('meta[name="reviewId"]')?.getAttribute('content');
                const importedRubricId = doc.querySelector('meta[name="rubricId"]')?.getAttribute('content');

                if (!importedRubricId || !window.rubrics[importedRubricId]) {
                    throw new Error(`Cannot import. The required rubric ("${importedRubricId || 'Unknown'}") is not available in this tool.`);
                }

                loadRubric(importedRubricId);
                let importedReviewData = currentReview; // Start with a fresh structure for the correct rubric
                importedReviewData.id = importedReviewId;
                importedReviewData.rubricId = importedRubricId;

                // Extract metadata
                const metaContainer = doc.querySelector('.metadata');
                if (metaContainer) {
                    importedReviewData.metadata.title = metaContainer.querySelector('.metadata-item:nth-child(1)')?.textContent.replace('Title:', '').trim();
                    importedReviewData.metadata.publisher = metaContainer.querySelector('.metadata-item:nth-child(2)')?.textContent.replace('Publisher:', '').trim();
                    importedReviewData.metadata.gradeLevel = metaContainer.querySelector('.metadata-item:nth-child(3)')?.textContent.replace('Grade Level:', '').trim();
                    importedReviewData.metadata.reviewDate = metaContainer.querySelector('.metadata-item:nth-child(4)')?.textContent.replace('Review Date:', '').trim();
                    importedReviewData.metadata.reviewerName = metaContainer.querySelector('.metadata-item:nth-child(5)')?.textContent.replace('Reviewer:', '').trim();
                }

                importedReviewData.summary.finalRating = doc.querySelector('.final-rating')?.textContent.replace('Final Rating:', '').trim();
                importedReviewData.summary.notes = doc.querySelector('.summary-notes pre')?.textContent.trim();

                // Extract evidence
                doc.querySelectorAll('.indicator').forEach(indicatorDiv => {
                    const indicatorId = indicatorDiv.dataset.indicator;
                    const indicatorConfig = findIndicatorConfig(window.rubrics[importedRubricId], indicatorId);
                    if (!indicatorConfig) return;

                    let gatewayIdForIndicator = null;
                    const gatewayContainingIndicator = window.rubrics[importedRubricId].gateways.find(gw => 
                        findIndicatorsInGatewayConfig(gw).some(ind => ind.id === indicatorId)
                    );
                    if (gatewayContainingIndicator) {
                        gatewayIdForIndicator = gatewayContainingIndicator.id;
                    }

                    if (!gatewayIdForIndicator) return;

                    const currentIndicatorData = importedReviewData.gateways[gatewayIdForIndicator].indicators[indicatorId];
                    currentIndicatorData.evidence = []; // Clear initial

                    // NEW: Import expectation statement from old format
                    const expectationElement = indicatorDiv.querySelector('.indicator-expectation-statement');
                    if (expectationElement) {
                        currentIndicatorData.expectation = sanitizeHTML(expectationElement.innerHTML).trim();
                    } else {
                        currentIndicatorData.expectation = ''; // Ensure it's initialized
                    }

                    // Import Strengths
                    indicatorDiv.querySelectorAll('.evidence-section.strengths .evidence-entry .evidence-text').forEach(el => {
                        if (!el.classList.contains('na-value')) currentIndicatorData.evidence.push({ type: 'strength', text: sanitizeHTML(el.innerHTML).trim() });
                    });
                    // Import Gaps
                    indicatorDiv.querySelectorAll('.evidence-section.gaps .evidence-entry .evidence-text').forEach(el => {
                        if (!el.classList.contains('na-value')) currentIndicatorData.evidence.push({ type: 'gap', text: sanitizeHTML(el.innerHTML).trim() });
                    });

                    // Import Score
                    if (!indicatorConfig.isNarrativeOnly) {
                        const scoreText = indicatorDiv.querySelector('div > strong')?.nextSibling?.textContent.trim();
                        if (scoreText && !isNaN(parseInt(scoreText))) currentIndicatorData.score = parseInt(scoreText);
                    }
                });

                setTimeout(async () => {
                    loadReviewData(importedReviewData);
                    // Save handling logic
                    if (importedReviewId) {
                        const existing = await getReview(importedReviewId);
                        if (existing && !confirm(`Review "${sanitizeHTML(existing.metadata?.title)}" already exists. Overwrite?`)) {
                            importedReviewData.id = null;
                            importedReviewData.metadata.title += " (Imported Copy)";
                        }
                    } else {
                        importedReviewData.id = null;
                    }
                    const savedId = await saveReview(importedReviewData);
                    currentReview.id = savedId;
                    showNotification(`Review "${sanitizeHTML(currentReview.metadata.title)}" imported and saved.`, 'success');
                    resolve(currentReview);
                }, 100);

            } catch (error) {
                reject(error);
            }
        };
        reader.readAsText(file);
    });
}

/**
 * Sets up accordion functionality for indicators and indicator groups.
 */
function setupIndicatorAccordions() {
    const reviewContent = document.querySelector('.review-content');
    if (!reviewContent) return;
    if (reviewContent._accordionListenerAdded) return;

    reviewContent.addEventListener('click', (event) => {
        const header = event.target.closest('.indicator-header, .main-indicator-group');
        if (!header) return;
        if (event.target.closest('.scoring-options, .ai-analyze-btn, .evidence-guide-btn')) return;

        const container = header.closest('.indicator, .indicator-group');
        if (!container) return;
        container.classList.toggle('open');

        if (container.classList.contains('open')) {
            setTimeout(() => {
                container.querySelectorAll('.tinymce-editor-placeholder').forEach(placeholder => {
                    const editor = tinymce.get(placeholder.id);
                    if (editor) editor.execCommand('mceRepaint');
                });
            }, 50);
        }
    });
    reviewContent._accordionListenerAdded = true;
}

/**
 * Sets up event listeners for scoring radio buttons using delegation.
 */
function setupScoringOptions() {
    const rubricContent = document.getElementById('rubricContent');
    if (!rubricContent) return;
    if (rubricContent._scoringListenerAdded) return;

    rubricContent.addEventListener('change', (event) => {
        const radio = event.target.closest('.scoring-options input[type="radio"]');
        if (radio) {
            event.stopPropagation();
            const indicatorElement = radio.closest('.indicator');
            const indicatorId = indicatorElement?.getAttribute('data-indicator');
            const value = parseInt(radio.value, 10);
            if (indicatorId && !isNaN(value)) {
                updateIndicatorScore(indicatorId, value);
            }
        }
    });
    rubricContent._scoringListenerAdded = true;
}

/**
 * Sets up event listeners for adding and removing evidence entries.
 */
function setupEvidenceSection() {
    const rubricContent = document.getElementById('rubricContent');
    if (!rubricContent) return;
    if (rubricContent._evidenceBtnListenerAdded) return;

    rubricContent.addEventListener('click', (event) => {
        const target = event.target.closest('.add-evidence, .remove-evidence');
        if (!target) return;

        if (target.classList.contains('add-evidence')) {
            const evidenceSection = target.closest('.evidence-section');
            if (evidenceSection) addEvidenceEntry(evidenceSection, '', true);
        } else if (target.classList.contains('remove-evidence')) {
            const evidenceEntry = target.closest('.evidence-entry');
            if (evidenceEntry) {
                const editorPlaceholder = evidenceEntry.querySelector('.tinymce-editor-placeholder');
                if (editorPlaceholder?.id) tinymce.get(editorPlaceholder.id)?.remove();
                evidenceEntry.remove();
                updateEvidenceData();
            }
        }
    });
    rubricContent._evidenceBtnListenerAdded = true;
}

/**
 * Updates `currentReview` by collecting evidence text from all TinyMCE editors.
 */
function updateEvidenceData() {
    if (!currentReview || !window.currentRubricData) return;

    window.currentRubricData.gateways.forEach(gatewayConfig => {
        const gatewayId = gatewayConfig.id;
        if (!currentReview.gateways[gatewayId]) return;

        findIndicatorsInGatewayConfig(gatewayConfig).forEach(indicatorConfig => {
            const indicatorId = indicatorConfig.id;
            const indicatorElement = document.querySelector(`.indicator[data-indicator="${indicatorId}"]`);
            if (!indicatorElement || !currentReview.gateways[gatewayId].indicators[indicatorId]) return;

            const currentIndicatorData = currentReview.gateways[gatewayId].indicators[indicatorId];
            currentIndicatorData.evidence = []; // Reset and repopulate for strengths/gaps
            currentIndicatorData.expectation = ''; // Reset for justification

            // Process Justification
            const expectationSection = indicatorElement.querySelector('.evidence-section.expectation');
            const expectationEntry = expectationSection?.querySelector('.evidence-entry');
            if (expectationEntry) {
                const editor = tinymce.get(expectationEntry.querySelector('.tinymce-editor-placeholder')?.id);
                if (editor?.initialized) {
                    currentIndicatorData.expectation = editor.getContent().trim();
                }
            }

            // Process strengths and gaps with a single loop
            ['strength', 'gap'].forEach(evidenceType => {
                const sectionSelector = `.evidence-section.${evidenceType}s`; // e.g., .evidence-section.strengths
                indicatorElement.querySelectorAll(`${sectionSelector} .evidence-entry`).forEach(entry => {
                    const editor = tinymce.get(entry.querySelector('.tinymce-editor-placeholder')?.id);
                    if (editor?.initialized) {
                        const content = editor.getContent().trim();
                        // TinyMCE can leave an empty paragraph with a bogus br tag
                        if (content && content !== '<p><br data-mce-bogus="1"></p>') {
                            currentIndicatorData.evidence.push({ type: evidenceType, text: content });
                        }
                    }
                });
            });
        });
    });
}

/**
 * Updates the score for a specific indicator in `currentReview`.
 */
function updateIndicatorScore(indicatorId, score) {
    if (!window.currentRubricData) return;
    const indicatorConfig = findIndicatorConfig(window.currentRubricData, indicatorId);
    if (!indicatorConfig) return;

    const gatewayConfig = window.currentRubricData.gateways.find(gw => findIndicatorsInGatewayConfig(gw).some(ind => ind.id === indicatorId));
    if (!gatewayConfig) return;

    const gatewayId = gatewayConfig.id;
    if (!currentReview.gateways[gatewayId]?.indicators[indicatorId]) return;

    currentReview.gateways[gatewayId].indicators[indicatorId].score = indicatorConfig.isNarrativeOnly ? null : score;
    updateGatewayScores();
}

/**
 * Recalculates and updates scores and ratings for all gateways and the final review rating.
 */
function updateGatewayScores() {
    if (!currentReview || !window.currentRubricData) return;

    window.currentRubricData.gateways.forEach(gatewayConfig => {
        const gatewayId = gatewayConfig.id;
        if (!currentReview.gateways[gatewayId]) return;

        let gatewayTotalScore = 0;
        let nonNegotiableFailed = false;
        findIndicatorsInGatewayConfig(gatewayConfig).forEach(indConfig => {
            const indData = currentReview.gateways[gatewayId].indicators[indConfig.id];
            if (indData && typeof indData.score === 'number') {
                gatewayTotalScore += indData.score;
            }
            if (indConfig.isNonNegotiable && (!indData || indData.score <= 0)) {
                nonNegotiableFailed = true;
            }
        });

        currentReview.gateways[gatewayId].score = gatewayTotalScore;
        let rating = calculateGatewayRating(gatewayTotalScore, gatewayConfig.ratingThresholds);
        if (nonNegotiableFailed) rating = 'Does Not Meet Expectations';
        currentReview.gateways[gatewayId].rating = rating;

        const gatewayPointsEl = document.getElementById(`${gatewayId}-points`);
        if (gatewayPointsEl) gatewayPointsEl.textContent = gatewayTotalScore;

        const gatewayRatingEl = document.getElementById(`${gatewayId}-rating`);
        if (gatewayRatingEl) gatewayRatingEl.textContent = rating;
        
        const summaryPointsEl = document.getElementById(`summary-${gatewayId}-points`);
        if (summaryPointsEl) summaryPointsEl.textContent = gatewayTotalScore;

        const summaryRatingEl = document.getElementById(`summary-${gatewayId}-rating`);
        if (summaryRatingEl) summaryRatingEl.textContent = rating;
    });

    const gatewayRatings = Object.fromEntries(window.currentRubricData.gateways.map(gc => [gc.id, currentReview.gateways[gc.id]?.rating || 'Not Rated']));
    const finalRating = calculateFinalRating(gatewayRatings, window.currentRubricData.finalRatingLogic);
    currentReview.summary.finalRating = finalRating;
    document.getElementById('final-rating').textContent = finalRating;
}

/**
 * Sets up event listeners for metadata form inputs.
 */
function setupMetadataFormTracking() {
    const fields = [
        { id: 'reviewTitle', property: 'title' },
        { id: 'publisher', property: 'publisher' },
        { id: 'gradeLevel', property: 'gradeLevel' },
        { id: 'reviewDate', property: 'date' },
        { id: 'reviewerName', property: 'reviewerName' }
    ];
    fields.forEach(field => {
        const el = document.getElementById(field.id);
        if (el && !el._metaFieldListenerAdded) {
            el.addEventListener('change', () => {
                currentReview.metadata[field.property] = el.value;
            });
            el._metaFieldListenerAdded = true;
        }
    });
}

/**
 * Creates an initial, empty data structure for a new review.
 */
function createInitialReviewData(rubricId) {
    const rubricData = window.rubrics[rubricId];
    if (!rubricData) return null;

    const initialData = {
        id: null,
        rubricId: rubricId,
        metadata: { title: '', publisher: '', gradeLevel: '', date: formatDate(new Date()), reviewerName: '' },
        gateways: {},
        summary: { notes: '', finalRating: 'Not Rated' }
    };

    rubricData.gateways.forEach(gatewayConfig => {
        initialData.gateways[gatewayConfig.id] = {
            indicators: {},
            score: (gatewayConfig.totalPoints > 0 ? 0 : null),
            rating: 'Not Rated'
        };
        findIndicatorsInGatewayConfig(gatewayConfig).forEach(indicatorConfig => {
            initialData.gateways[gatewayConfig.id].indicators[indicatorConfig.id] = {
                score: indicatorConfig.isNarrativeOnly ? null : 0,
                evidence: [],
                expectation: '' // For the score justification textbox content
            };
        });
    });
    return initialData;
}

/**
 * Initializes a single TinyMCE editor instance.
 */
function initializeSingleTinyMCE(editorId, initialContent = '') {
    const element = document.getElementById(editorId);
    if (!element) return;
    if (tinymce.get(editorId)) tinymce.get(editorId).remove();

    tinymce.init({
        selector: `#${editorId}`,
        plugins: 'image paste lists link autoresize code wordcount help fullscreen preview',
        toolbar: 'undo redo | styles | bold italic | bullist numlist | link image | code | fullscreen',
        menubar: false,
        statusbar: true,
        min_height: 120,
        autoresize_bottom_margin: 15,
        paste_data_images: true,
        images_file_types: 'jpeg,jpg,jpe,jfi,jif,jfif,png,gif,bmp,webp,svg',
        automatic_uploads: false,
        images_upload_handler: (blobInfo, success, failure) => {
           const reader = new FileReader();
           reader.onload = () => success(reader.result);
           reader.onerror = () => failure('File reading error: ' + reader.error.message);
           reader.readAsDataURL(blobInfo.blob());
        },
        link_default_target: '_blank',
        extended_valid_elements: 'a[data-page|data-pdf-id|target|href|class]',
        setup: (editor) => {
            let debounce;
            editor.on('change input Paste Cut', () => {
                clearTimeout(debounce);
                debounce = setTimeout(updateEvidenceData, 400);
            });
        },
        init_instance_callback: (editor) => {
            if (initialContent) editor.setContent(initialContent, { format: 'html' });
            if (editor.getBody()) setupPageLinkNavigationForElement(editor.getBody());
        },
        promotion: false
    });
}

/**
 * Adds a new evidence entry to the specified evidence section.
 */
function addEvidenceEntry(evidenceSectionElement, initialHtmlContent = '', triggerDataUpdate = true) {
    if (!evidenceSectionElement) return null;

    evidenceSectionElement.querySelector('.na-value')?.remove();
    const editorId = `tinymce-evidence-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const entryHtml = `<div class="evidence-entry"><div class="evidence-header"><button class="btn small danger remove-evidence" title="Remove this evidence entry">×</button></div><div id="${editorId}" class="tinymce-editor-placeholder"></div></div>`;
    
    // The "Justification" section doesn't have an "add" button, so we append directly.
    const addButton = evidenceSectionElement.querySelector('.add-evidence');
    if (addButton) {
        addButton.insertAdjacentHTML('beforebegin', entryHtml);
    } else {
        evidenceSectionElement.innerHTML += entryHtml;
    }
    
    initializeSingleTinyMCE(editorId, initialHtmlContent);
    if (triggerDataUpdate) setTimeout(updateEvidenceData, 100);
    return evidenceSectionElement.querySelector(`#${editorId}`)?.closest('.evidence-entry');
}

/**
 * Saves the current review data to the database.
 */
async function saveCurrentReview() {
    try {
        updateEvidenceData();
        updateGatewayScores();

        const reviewToSave = JSON.parse(JSON.stringify(currentReview));
        if (!reviewToSave.rubricId) {
            showNotification("Error: Cannot save review without a selected rubric.", "error");
            return;
        }

        const savedId = await saveReview(reviewToSave);
        currentReview.id = savedId;

        // Save associated PDFs
        await savePdfsForReview(savedId, window.loadedPdfs);

        showNotification('Review and associated PDFs saved successfully!', 'success');
    } catch (error) {
        console.error('[Review Save] Error saving review:', error);
        showNotification(`Failed to save review: ${error.message}`, 'error');
    }
}

/**
 * Initializes a new, empty review based on the specified rubric.
 */
function createNewReview(rubricId, showUINotification = true) {
    if (!rubricId || !window.rubrics[rubricId]) {
        if (showUINotification) showNotification('Error creating new review: Rubric not found.', 'error');
        return;
    }

    currentReview = createInitialReviewData(rubricId);
    if (!currentReview) return;

    // Clear PDFs from session
    window.loadedPdfs = [];
    if (typeof setActivePdf === 'function') setActivePdf(null);
    if (typeof renderPdfList === 'function') renderPdfList();

    // Reset UI
    document.getElementById('reviewTitle').value = '';
    document.getElementById('publisher').value = '';
    document.getElementById('gradeLevel').value = '';
    document.getElementById('reviewDate').value = formatDate(new Date());
    document.getElementById('reviewerName').value = '';
    document.getElementById('summaryNotes').value = '';

    document.querySelectorAll('.indicator').forEach(indicatorElement => {
        indicatorElement.querySelectorAll('.scoring-options input').forEach(radio => radio.checked = false);
        indicatorElement.querySelectorAll('.evidence-section').forEach(section => {
            section.querySelectorAll('.evidence-entry, .na-value').forEach(el => {
                tinymce.get(el.querySelector('.tinymce-editor-placeholder')?.id)?.remove();
                el.remove();
            });
            // Add a single, empty entry for each section on a new review.
            // Justification section has no "Add" button, so this is its only entry.
            addEvidenceEntry(section, '', false);
        });
    });

    updateGatewayScores();
    if (showUINotification) {
        showNotification(`New review for rubric "${window.rubrics[rubricId]?.name}" started.`, 'success');
    }
}

/**
 * Loads review data into the application, switching rubrics if necessary.
 */
async function loadReviewData(reviewData) {
    if (!reviewData.rubricId || !window.rubrics[reviewData.rubricId]) {
        showNotification(`Cannot load review. Rubric "${reviewData.rubricId || 'Unknown'}" is not available.`, "error");
        return;
    }

    if (reviewData.rubricId !== currentRubricId) {
        loadRubric(reviewData.rubricId);
    } else {
        createNewReview(reviewData.rubricId, false);
    }

    currentReview = reviewData;

    // Load associated PDFs and manage active state
    const pdfs = await getPdfsForReview(reviewData.id);
    window.loadedPdfs = pdfs || []; // Ensure it's an array

    if (window.loadedPdfs.length > 0) {
        if (typeof setActivePdf === 'function') setActivePdf(window.loadedPdfs[0].id);
        showNotification(`${window.loadedPdfs.length} PDF(s) loaded with the review.`, 'info');
    } else {
        if (typeof setActivePdf === 'function') setActivePdf(null);
    }
    if (typeof renderPdfList === 'function') renderPdfList();

    // Populate UI
    document.getElementById('reviewTitle').value = currentReview.metadata?.title || '';
    document.getElementById('publisher').value = currentReview.metadata?.publisher || '';
    document.getElementById('gradeLevel').value = currentReview.metadata?.gradeLevel || '';
    document.getElementById('reviewDate').value = currentReview.metadata?.date || '';
    document.getElementById('reviewerName').value = currentReview.metadata?.reviewerName || '';
    document.getElementById('summaryNotes').value = currentReview.summary?.notes || '';

    if (window.currentRubricData?.gateways) {
        window.currentRubricData.gateways.forEach(gatewayConfig => {
            findIndicatorsInGatewayConfig(gatewayConfig).forEach(indicatorConfig => {
                const indicatorId = indicatorConfig.id;
                const loadedIndicatorData = currentReview.gateways?.[gatewayConfig.id]?.indicators?.[indicatorId];
                const indicatorElement = document.querySelector(`.indicator[data-indicator="${indicatorId}"]`);
                if (!loadedIndicatorData || !indicatorElement) return;

                if (typeof loadedIndicatorData.score === 'number') {
                    const radio = indicatorElement.querySelector(`input[name="score-${indicatorId}"][value="${loadedIndicatorData.score}"]`);
                    if (radio) radio.checked = true;
                }

                // Get all sections
                const expectationSection = indicatorElement.querySelector('.evidence-section.expectation');
                const strengthsSection = indicatorElement.querySelector('.evidence-section.strengths');
                const gapsSection = indicatorElement.querySelector('.evidence-section.gaps');
                
                // Clear all sections first
                [expectationSection, strengthsSection, gapsSection].forEach(section => {
                    if(section) section.querySelectorAll('.evidence-entry, .na-value').forEach(el => {
                        tinymce.get(el.querySelector('.tinymce-editor-placeholder')?.id)?.remove();
                        el.remove();
                    });
                });

                // Populate justification textbox
                if (expectationSection) {
                    addEvidenceEntry(expectationSection, loadedIndicatorData.expectation || '', false);
                }

                // Populate strengths
                const strengths = loadedIndicatorData.evidence?.filter(e => e.type === 'strength' || e.type === undefined) || [];
                if (strengths.length > 0) strengths.forEach(item => addEvidenceEntry(strengthsSection, item.text, false));
                else addEvidenceEntry(strengthsSection, '', false);

                // Populate gaps
                const gaps = loadedIndicatorData.evidence?.filter(e => e.type === 'gap') || [];
                if (gaps.length > 0) gaps.forEach(item => addEvidenceEntry(gapsSection, item.text, false));
                else addEvidenceEntry(gapsSection, '', false);
            });
        });
    }

    setTimeout(() => {
        updateGatewayScores();
        showNotification(`Review "${sanitizeHTML(currentReview.metadata.title)}" loaded.`, 'success');
    }, 300);
}

/**
 * Checks if the current review has been modified.
 */
function isReviewModified() {
    // This is a simplified check. A robust implementation would compare against a saved state.
    if (currentReview.id === null) { // New, unsaved review
        if (currentReview.metadata?.title || currentReview.summary?.notes) return true;
        for (const gwId in currentReview.gateways) {
            for (const indId in currentReview.gateways[gwId].indicators) {
                const ind = currentReview.gateways[gwId].indicators[indId];
                if (ind.score !== 0 || (ind.evidence && ind.evidence.length > 0)) return true;
            }
        }
    }
    return false;
}

window.loadReviewData = loadReviewData;
window.importReviewFromHTML = importReviewFromHTML;
window.createNewReview = createNewReview;
window.updateIndicatorScore = updateIndicatorScore;
window.updateGatewayScores = updateGatewayScores;
window.updateEvidenceData = updateEvidenceData;
window.isReviewModified = isReviewModified;
window.addEvidenceEntry = addEvidenceEntry;