// export.js - Handles exporting the current review data, primarily to HTML format.
// Leverages TinyMCE content for evidence export.

/**
 * Initializes the export functionality by attaching event listeners to export buttons.
 */
function initializeExports() {
    const exportHtmlButton = document.getElementById('exportHTML');
    if (exportHtmlButton) {
        exportHtmlButton.addEventListener('click', () => exportReview('html'));
    } else {
        console.warn("[Export] HTML export button ('exportHTML') not found.");
    }
    // PDF export functionality was previously removed. Add listeners here if re-implemented.
    console.log("[Export] Export functionality initialized.");
}

/**
 * Main export function that orchestrates the export process for a given format.
 * Ensures current review data (especially TinyMCE content) is captured before export.
 * @async
 * @param {string} format - The format to export to (currently only 'html' is supported).
 */
async function exportReview(format) {
    try {
        // Ensure latest evidence from TinyMCE and calculated scores are in `currentReview`
        if (typeof updateEvidenceData === 'function') updateEvidenceData(); else console.warn("[Export] updateEvidenceData function not found.");
        if (typeof updateGatewayScores === 'function') updateGatewayScores(); else console.warn("[Export] updateGatewayScores function not found.");

        showNotification(`Preparing ${format.toUpperCase()} export... This may take a moment.`, 'info', 3000);

        // Use the global `currentReview` and `currentRubricData` variables
        // These are expected to be up-to-date and managed by app.js and review.js
        const reviewDataForExport = collectReviewData(currentReview, currentRubricData);
        let result = await generateOutput(format, reviewDataForExport);

        // `generateOutput` (specifically `generateHTML` which calls `downloadFile`)
        // will handle its own success/failure notifications related to file download.
        // `result` from `downloadFile` is true on success, false on failure.
        if (result === true) {
            // showNotification(`${format.toUpperCase()} export initiated successfully.`, 'success'); // Already handled by downloadFile or its callers
        } else if (result === false) {
            // showNotification(`Failed to initiate ${format.toUpperCase()} export. See console.`, 'error'); // Already handled
        }
        // If generateOutput throws, it's caught by the catch block below.

    } catch (error) {
        console.error(`[Export] Error exporting to ${format}:`, error);
        showNotification(`Failed to export to ${format}: ${error.message}`, 'error', 8000);
    }
}

/**
 * Collects all relevant data from the current review state (`currentReview`)
 * and the loaded rubric configuration (`currentRubricData`) for export.
 * This function ensures the exported data reflects the rubric's structure and the review's content.
 * @param {object} reviewData - The `currentReview` object containing all user-entered data.
 * @param {object} rubricData - The `currentRubricData` object defining the rubric structure.
 * @returns {object} A structured object containing all data prepared for export.
 * @throws {Error} If `reviewData` or `rubricData` is missing.
 */
function collectReviewData(reviewData, rubricData) {
    if (!reviewData || !rubricData) {
        throw new Error("[Export] Review data or Rubric data is missing. Cannot collect data for export.");
    }

    // Consolidate metadata from reviewData.metadata
    const metadata = {
        title: reviewData.metadata?.title || 'Untitled Review',
        publisher: reviewData.metadata?.publisher || 'Not specified',
        gradeLevel: reviewData.metadata?.gradeLevel || 'Not specified',
        reviewDate: reviewData.metadata?.date || 'Not specified',
        reviewerName: reviewData.metadata?.reviewerName || 'Not specified',
        finalRating: reviewData.summary?.finalRating, // From reviewData.summary
        summaryNotes: reviewData.summary?.notes     // From reviewData.summary
    };

    const gatewaysForExport = [];

    // Iterate through gateways as defined in the `rubricData` to maintain correct structure and order.
    rubricData.gateways.forEach(gatewayConfig => {
        const gatewayId = gatewayConfig.id;
        // Get the actual review data for this gateway from `currentReview`.
        const currentGatewayData = reviewData.gateways?.[gatewayId];

        const itemsForExport = []; // Will hold indicators and groups for this gateway.

        if (gatewayConfig.criterionSections && gatewayConfig.criterionSections.length > 0) {
            gatewayConfig.criterionSections.forEach(criterion => {
                if (criterion.items && criterion.items.length > 0) {
                    criterion.items.forEach(itemConfig => { // `itemConfig` is an indicator or group from the rubric definition
                        if (itemConfig.type === 'group') {
                            // Process a group of indicators
                            const subIndicatorsForExport = itemConfig.items.map(subItemConfig => {
                                const subIndicatorData = currentGatewayData?.indicators?.[subItemConfig.id];
                                return {
                                    id: subItemConfig.id,
                                    title: subItemConfig.name,
                                    score: subIndicatorData?.score,
                                    evidence: subIndicatorData?.evidence || [], // Keep as single array with typed objects
                                    expectation: subIndicatorData?.expectation || '', // Add expectation
                                    scoringCriteria: subItemConfig.scoringCriteria,
                                    isNarrativeOnly: subItemConfig.isNarrativeOnly
                                };
                            });
                            itemsForExport.push({
                                title: itemConfig.name,
                                isGroup: true,
                                subIndicators: subIndicatorsForExport
                            });
                        } else {
                            // Process a standard (non-grouped) indicator
                            const indicatorData = currentGatewayData?.indicators?.[itemConfig.id];
                            itemsForExport.push({
                                id: itemConfig.id,
                                title: itemConfig.name,
                                score: indicatorData?.score,
                                evidence: indicatorData?.evidence || [], // Keep as single array
                                expectation: indicatorData?.expectation || '', // Add expectation
                                scoringCriteria: itemConfig.scoringCriteria,
                                isGroup: false,
                                isNarrativeOnly: itemConfig.isNarrativeOnly
                            });
                        }
                    });
                }
            });
        }

        gatewaysForExport.push({
            id: gatewayId,
            name: gatewayConfig.name,
            score: currentGatewayData?.score !== undefined ? currentGatewayData.score : (gatewayConfig.totalPoints > 0 ? 0 : null),
            rating: currentGatewayData?.rating || 'Not Rated',
            totalPoints: gatewayConfig.totalPoints,
            items: itemsForExport
        });
    });

    return {
        metadata: metadata,
        gateways: gatewaysForExport,
        summary: reviewData.summary,
        id: reviewData.id,
        rubricId: reviewData.rubricId
    };
}

/**
 * Generates the output file content based on the specified format and data.
 * Currently, only 'html' format is supported.
 * @async
 * @param {string} format - The desired output format ('html').
 * @param {object} data - The structured review data collected by `collectReviewData`.
 * @returns {Promise<boolean|undefined>} A promise that resolves to true if download initiated, false if failed, or undefined if format not handled.
 * @throws {Error} If an unsupported format is requested.
 */
async function generateOutput(format, data) {
    if (format === 'html') {
        return generateHTML(data); // This function now directly handles download.
    } else {
        console.error(`[Export] Unsupported export format requested: ${format}`);
        throw new Error(`Unsupported export format: ${format}`);
    }
}

/**
 * Generates the complete HTML content for the review export.
 * @param {object} data - The structured review data.
 * @returns {string} The HTML string representing the review.
 */
function buildHTMLContent(data) {
    const rubricName = window.rubrics[data.rubricId]?.name || data.rubricId || 'Unknown Rubric';
    const safeTitle = sanitizeHTML(data.metadata.title);

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EdReports Review: ${safeTitle}</title>
        <meta name="reviewId" content="${data.id || ''}">
        <meta name="rubricId" content="${data.rubricId || ''}">
        <meta name="generator" content="EdReports 2.0 Review Tool - Modular AI Version">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 20px auto; padding: 20px; background-color: #f9f9f9; }
            h1, h2, h3, h4, h5 { color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; }
            h1 { font-size: 2em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
            h2 { font-size: 1.6em; border-bottom: 1px solid #bdc3c7; padding-bottom: 0.2em; }
            h3 { font-size: 1.3em; }
            h4 { font-size: 1.1em; color: #34495e; }
            .metadata { background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #dde4e6; }
            .metadata-item { margin-bottom: 8px; }
            .metadata-item strong { color: #2980b9; }
            .gateway { border: 1px solid #bdc3c7; border-radius: 5px; padding: 20px; margin-bottom: 25px; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .gateway-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #dde4e6; padding-bottom: 10px; margin-bottom: 15px; }
            .indicator { border-left: 4px solid #3498db; padding-left: 15px; margin-bottom: 20px; margin-top: 15px; }
            .indicator-expectation-statement { background-color: #e8f4fd; border: 1px solid #d1e9fc; border-left: 4px solid #0b5ed7; padding: 12px 15px; margin: 1rem 0; border-radius: 4px; color: #0a4a99; font-size: 0.95em; line-height: 1.5; }
            .indicator-expectation-statement:empty { display: none; }
            .indicator-expectation-statement h4 { margin-top: 0; margin-bottom: 8px; font-size: 1em; font-weight: 600; color: inherit; }
            .indicator-expectation-statement p { margin: 0; }
            .indicator-group { background-color: #f0f6fa; padding: 1rem; margin: 20px 0; border-radius: 4px; border-left: 5px solid #2980b9; }
            .indicator-group > .main-indicator-group { margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #a2cce8; }
            .sub-indicators { margin-left: 20px; }
            .sub-indicator { border-left-color: #85c1e9; }
            .evidence-section { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; }
            .evidence-section.strengths { border-left: 3px solid #27ae60; padding-left: 10px; }
            .evidence-section.gaps { border-left: 3px solid #c0392b; padding-left: 10px; }
            .evidence-section h5 { margin-top: 0; margin-bottom: 10px; font-size: 1.05em; }
            .evidence-section.strengths h5 { color: #27ae60; }
            .evidence-section.gaps h5 { color: #c0392b; }
            .evidence-entry { margin-bottom: 15px; border: 1px solid #dde4e6; border-radius: 5px; overflow: hidden; background-color: white; padding: 10px; }
            .evidence-text { margin-bottom: 10px; word-wrap: break-word; }
            .evidence-text img { max-width: 100%; height: auto; display: block; margin: 10px auto; border: 1px solid #ccc; cursor: pointer; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .final-rating { font-size: 1.6em; font-weight: bold; text-align: center; margin: 30px 0; padding: 20px; background-color: #d4e6f1; border-radius: 5px; border: 1px solid #a9cce3; color: #1a5276;}
            .gateway-ratings { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .gateway-rating-item { background-color: #f8f9f9; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef; }
            .gateway-rating-item h4 { margin-top: 0; margin-bottom: 5px; font-size: 1.1em; }
            .gateway-rating-item p { margin-bottom: 0; font-size: 0.95em; }
            .na-value { color: #7f8c8d; font-style: italic; }
            .scoring-criteria { background-color: #f4f6f6; padding: 12px; border-radius: 4px; margin: 10px 0; border-left: 4px solid #aeb6bf; }
            .scoring-criteria h5 { margin-top: 0; color: #34495e; font-size: 1em;}
            .scoring-criteria ul { margin-left: 20px; padding-left: 5px; font-size: 0.9em; list-style-type: disc; }
            .scoring-criteria li { margin-bottom: 5px; }
            .summary-notes { margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px; border-left: 4px solid #566573; }
            .summary-notes pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; font-size: 1em;}
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); z-index: 10000; align-items: center; justify-content: center; }
            .modal-content-wrapper { position: relative; max-width: 90vw; max-height: 90vh; display: flex; }
            .modal-image { display: block; max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 3px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
            .modal-close { color: #fff; position: absolute; top: -15px; right: -15px; font-size: 40px; font-weight: bold; transition: 0.3s; cursor: pointer; background-color: rgba(0,0,0,0.5); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; line-height: 0.5; padding-bottom:3px;}
            .modal-close:hover, .modal-close:focus { color: #bbb; text-decoration: none; }
            .page-link { color: #007bff; text-decoration: none; font-weight: 600; border-bottom: 1px dotted #007bff; }
            .page-link:hover { color: #0056b3; border-bottom-style: solid; }
            .narrative-only { font-style: italic; color: #555; margin-left: 10px; font-size: 0.9em; }
            .evidence-text blockquote { margin: 10px 0 10px 20px; padding-left: 15px; border-left: 4px solid #ccc; font-style: italic; color: #555; }
            .evidence-text blockquote p { margin: 0; }
            .evidence-text p { margin: 0 0 10px 0; }
            .evidence-text p:last-child { margin-bottom: 0;}
            .evidence-text ul, .evidence-text ol { padding-left: 30px; margin: 5px 0 10px 0;}
            .evidence-text li { margin-bottom: 4px;}
            .evidence-text pre { background-color: #f1f1f1; border: 1px solid #ddd; padding: 10px; border-radius: 5px; overflow-x: auto; margin: 8px 0; font-family: 'Courier New', Courier, monospace; font-size: 0.9em; line-height: 1.5; color: #333; white-space: pre-wrap; word-break: break-all;}
            .evidence-text code:not(pre code) { background-color: #f1f1f1; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; font-family: 'Courier New', Courier, monospace; color: #c7254e;}
        </style>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.id = 'exportedImageViewerModal';
                const modalContentWrapper = document.createElement('div');
                modalContentWrapper.className = 'modal-content-wrapper';
                const closeBtn = document.createElement('span');
                closeBtn.className = 'modal-close';
                closeBtn.innerHTML = '×';
                closeBtn.title = 'Close image viewer';
                const image = document.createElement('img');
                image.className = 'modal-image';
                image.id = 'modalImageElement';
                modalContentWrapper.appendChild(image);
                modalContentWrapper.appendChild(closeBtn);
                modal.appendChild(modalContentWrapper);
                document.body.appendChild(modal);
                document.querySelectorAll('.evidence-text img').forEach(img => {
                    img.addEventListener('click', function() {
                        const viewerModal = document.getElementById('exportedImageViewerModal');
                        const viewerImage = document.getElementById('modalImageElement');
                        if (viewerModal && viewerImage) {
                            viewerImage.src = this.src;
                            viewerModal.style.display = 'flex';
                        }
                    });
                });
                function closeViewerModal() {
                    const viewerModal = document.getElementById('exportedImageViewerModal');
                    if (viewerModal) viewerModal.style.display = 'none';
                }
                closeBtn.addEventListener('click', closeViewerModal);
                modal.addEventListener('click', function(event) { if (event.target === modal) closeViewerModal(); });
                document.addEventListener('keydown', function(event) { if (event.key === 'Escape') closeViewerModal(); });
                document.body.addEventListener('click', function(event) {
                    const pageLink = event.target.closest('a.page-link');
                    if (pageLink) {
                        event.preventDefault();
                        const pageNum = pageLink.dataset.page || pageLink.textContent;
                        const pdfId = pageLink.dataset.pdfId;
                        const titleAttr = pageLink.title;
                        let docInfo = '';
                        if (titleAttr && titleAttr.startsWith('Go to page')) {
                            const nameMatch = titleAttr.match(/in (.*)$/);
                            if (nameMatch && nameMatch[1]) docInfo = \` in "\${nameMatch[1]}"\`;
                            else if (pdfId) docInfo = \` (for PDF ID: \${pdfId})\`;
                        } else if (pdfId) docInfo = \` (for PDF ID: \${pdfId})\`;
                        alert(\`This link is intended to navigate to page \${pageNum}\${docInfo} in the interactive tool's PDF viewer. This functionality is not available in the static exported HTML.\`);
                    }
                });
            });
        <\/script>
    </head>
    <body>
        <h1>EdReports Review – ${sanitizeHTML(rubricName)}</h1>
        <div class="metadata">
            <div class="metadata-item"><strong>Title:</strong> ${safeTitle}</div>
            <div class="metadata-item"><strong>Publisher:</strong> ${sanitizeHTML(data.metadata.publisher)}</div>
            <div class="metadata-item"><strong>Grade Level:</strong> ${sanitizeHTML(data.metadata.gradeLevel)}</div>
            <div class="metadata-item"><strong>Review Date:</strong> ${sanitizeHTML(data.metadata.reviewDate)}</div>
            <div class="metadata-item"><strong>Reviewer:</strong> ${sanitizeHTML(data.metadata.reviewerName)}</div>
        </div>
        <div class="final-rating">Final Rating: ${sanitizeHTML(data.summary.finalRating)}</div>
    `;

    if (data.gateways && data.gateways.length > 0) {
        html += `<h2>Gateway Summaries</h2><div class="gateway-ratings">`;
        data.gateways.forEach(gateway => {
            html += `<div class="gateway-rating-item"><h4>${sanitizeHTML(gateway.name)}: ${sanitizeHTML(gateway.rating || 'Not Rated')}</h4><p>${gateway.score !== undefined && gateway.score !== null ? gateway.score : 'N/A'}/${gateway.totalPoints || 'N/A'} points</p></div>`;
        });
        html += `</div>`;
    }

    if (data.gateways && data.gateways.length > 0) {
        html += `<h2>Detailed Gateway Scores</h2>`;
        data.gateways.forEach(gateway => {
            html += `<div class="gateway" id="gateway-${sanitizeHTML(gateway.id)}"><div class="gateway-header"><h3>${sanitizeHTML(gateway.name)}</h3><div><strong>Score:</strong> ${gateway.score !== undefined && gateway.score !== null ? gateway.score : 'N/A'} / ${gateway.totalPoints || 'N/A'}</div></div>`;
            if (gateway.items && gateway.items.length > 0) {
                gateway.items.forEach(item => {
                    if (item.isGroup) html += buildIndicatorGroupHTML(item);
                    else html += buildIndicatorHTML(item);
                });
            } else {
                html += `<p class="na-value">No indicators defined for this gateway in the rubric.</p>`;
            }
            html += `</div>`;
        });
    }

    if (data.summary && data.summary.notes && data.summary.notes.trim() !== '') {
        html += `<h2>Summary Notes</h2><div class="summary-notes"><pre>${sanitizeHTML(data.summary.notes)}</pre></div>`;
    }

    html += `</body></html>`;
    return html;
}

/**
 * Generates an HTML file from the review data and triggers a download.
 * @param {object} data - The structured review data.
 * @returns {boolean} True if download initiated, false otherwise.
 */
function generateHTML(data) {
    const htmlContent = buildHTMLContent(data);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const fileName = sanitizeFileName(data.metadata.title || 'EdReports_Review') + '.html';
    return downloadFile(blob, fileName);
}

/**
 * Helper function to build HTML for an individual indicator for export.
 * @param {object} indicatorData - The indicator data object from `collectReviewData`.
 * @returns {string} HTML string for the indicator.
 */
function buildIndicatorHTML(indicatorData) {
    if (!indicatorData || !indicatorData.title) return '';

    let html = `<div class="indicator" data-indicator="${sanitizeHTML(indicatorData.id || 'no-id')}"><h4>${sanitizeHTML(indicatorData.title)}</h4>`;

    if (!indicatorData.isNarrativeOnly) {
        html += `<div><strong>Score:</strong> ${indicatorData.score !== undefined && indicatorData.score !== null ? indicatorData.score : '<span class="na-value">N/A</span>'}</div>`;
    } else {
        html += `<div><span class="narrative-only">(Narrative Evidence Only)</span></div>`;
    }

    // Add the expectation statement if it exists
    if (indicatorData.expectation) {
        html += `<div class="indicator-expectation-statement">${indicatorData.expectation}</div>`;
    }

    if (indicatorData.scoringCriteria && indicatorData.scoringCriteria.length > 0) {
        html += `<div class="scoring-criteria"><h5>Scoring Criteria:</h5><ul>${indicatorData.scoringCriteria.map(c => `<li>${sanitizeHTML(c)}</li>`).join('')}</ul></div>`;
    }

    const evidenceByType = {
        strength: (indicatorData.evidence || []).filter(e => e.type === 'strength' || e.type === undefined),
        gap: (indicatorData.evidence || []).filter(e => e.type === 'gap')
    };

    const sectionTitles = {
        strength: 'Evidence of Strengths',
        gap: 'Analysis of Gaps & Weaknesses'
    };

    let evidenceRendered = false;
    for (const type in evidenceByType) {
        const items = evidenceByType[type];
        const title = sectionTitles[type];
        if (items.length > 0) {
            evidenceRendered = true;
            html += `<div class="evidence-section ${type}s"><h5>${title}</h5>`;
            items.forEach((evidenceItem, i) => {
                html += `<div class="evidence-entry" id="${sanitizeHTML(indicatorData.id)}-${type}-${i}"><div class="evidence-text">${evidenceItem.text || ''}</div></div>`;
            });
            html += `</div>`;
        }
    }

    if (!evidenceRendered) {
        html += `<div class="evidence-section"><p class="na-value">No evidence provided for this indicator.</p></div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * Helper function to build HTML for an indicator group for export.
 * @param {object} groupData - The indicator group data object from `collectReviewData`.
 * @returns {string} HTML string for the indicator group.
 */
function buildIndicatorGroupHTML(groupData) {
    if (!groupData || !groupData.isGroup || !groupData.title || !groupData.subIndicators) return '';
    if (groupData.subIndicators.length === 0) {
         return `<div class="indicator-group"><div class="main-indicator-group"><h4>${sanitizeHTML(groupData.title)}</h4></div><div class="sub-indicators"><p class="na-value">No sub-indicators defined.</p></div></div>`;
    }

    let html = `<div class="indicator-group"><div class="main-indicator-group"><h4>${sanitizeHTML(groupData.title)}</h4></div><div class="sub-indicators">`;
    groupData.subIndicators.forEach(subIndicator => {
        html += buildIndicatorHTML(subIndicator);
    });
    html += `</div></div>`;
    return html;
}

/**
 * Initiates a file download using FileSaver.js.
 * @param {Blob} blob - The Blob object containing the file content.
 * @param {string} fileName - The desired name for the downloaded file.
 * @returns {boolean} True if `saveAs` was called, false if FileSaver.js is missing or an error occurs.
 */
function downloadFile(blob, fileName) {
    if (typeof saveAs === 'undefined') {
        console.error("[Export] FileSaver.js library (saveAs) is not loaded. Cannot download file.");
        showNotification("Error: Could not initiate download (FileSaver library missing). Check console.", "error", 7000);
        return false;
    }
    try {
        saveAs(blob, fileName);
        console.log(`[Export] Download initiated for "${fileName}".`);
        showNotification(`Downloading "${fileName}"...`, "success", 5000);
        return true;
    } catch (e) {
        console.error("[Export] Error using FileSaver to download file:", e);
        showNotification(`Download failed: ${e.message}. See console for details.`, "error", 7000);
        return false;
    }
}

/**
 * Sanitizes a string to be used as a filename by removing or replacing invalid characters.
 * @param {string} name - The proposed filename.
 * @returns {string} A sanitized filename. Defaults to 'Untitled_Review' if input is empty or only invalid chars.
 */
function sanitizeFileName(name) {
    if (!name || typeof name !== 'string') return 'Untitled_Review';
    const sanitized = name.replace(/[/\\?%*:|"<>]/g, '-').trim();
    return sanitized || 'Untitled_Review';
}

window.initializeExports = initializeExports;