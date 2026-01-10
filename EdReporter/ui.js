// ui.js - Handles dynamic generation of the rubric UI structure based on rubric data.

/**
 * Renders the entire rubric UI, including tabs for gateways and summary,
 * criterion sections, indicators, and indicator groups.
 * This function clears any existing content in `#rubricContent` before rendering.
 * @param {object} rubricData - The rubric data object (e.g., from `window.rubrics[rubricId]`).
 */
function renderRubricUI(rubricData) {
    const rubricContentDiv = document.getElementById('rubricContent');
    if (!rubricContentDiv) {
        console.error("[UI] Rubric content container '#rubricContent' not found in DOM. Cannot render UI.");
        return;
    }
    if (!rubricData || !rubricData.name || !Array.isArray(rubricData.gateways)) {
        console.error("[UI] Invalid or incomplete rubricData provided. Cannot render UI.", rubricData);
        rubricContentDiv.innerHTML = '<p class="error-message">Error: Invalid rubric data. Cannot display review interface.</p>';
        return;
    }

    console.log(`[UI] Rendering UI for rubric: "${rubricData.name}"`);
    rubricContentDiv.innerHTML = ''; // Clear previous rubric UI

    let html = '';

    // 1. Render Tabs for Gateways and Summary
    html += '<div class="tabs">';
    rubricData.gateways.forEach((gateway, index) => {
        const isActive = index === 0 ? 'active' : '';
        html += `<button class="tab-btn ${isActive}" data-tab="${sanitizeHTML(gateway.id)}">${sanitizeHTML(gateway.name)}</button>`;
    });
    html += `<button class="tab-btn" data-tab="summary">Summary</button>`;
    html += '</div>';

    // 2. Render Tab Content for each Gateway
    rubricData.gateways.forEach((gateway, gatewayIndex) => {
        const isActive = gatewayIndex === 0 ? 'active' : '';
        html += `<div id="${sanitizeHTML(gateway.id)}" class="tab-content ${isActive}">`;
        html += `<h2>${sanitizeHTML(gateway.name)}</h2>`;
        if (gateway.description) {
            html += `<p class="gateway-description">${sanitizeHTML(gateway.description)}</p>`;
        }

        if (Array.isArray(gateway.criterionSections)) {
            gateway.criterionSections.forEach(criterion => {
                html += `<div class="criterion-section" data-criterion-id="${sanitizeHTML(criterion.id || '')}">`;
                html += `<h3>${sanitizeHTML(criterion.name)}</h3>`;
                if (criterion.description) {
                    html += `<p>${sanitizeHTML(criterion.description)}</p>`;
                }
                if (Array.isArray(criterion.items)) {
                    criterion.items.forEach(item => {
                        if (item.type === 'group') {
                            html += renderIndicatorGroup(item);
                        } else {
                            html += renderIndicator(item);
                        }
                    });
                }
                html += `</div>`;
            });
        }
        
        html += `<div class="gateway-summary">
                    <h3>${sanitizeHTML(gateway.name)} Score Summary</h3>
                    <p>Total Points: <span id="${sanitizeHTML(gateway.id)}-points">0</span>/${gateway.totalPoints || 'N/A'}</p>
                    <div class="gateway-rating"><p>Rating: <span id="${sanitizeHTML(gateway.id)}-rating">Not Rated</span></p></div>
                 </div>`;
        html += `</div>`;
    });

    // 3. Render Summary Tab Content
    html += `<div id="summary" class="tab-content">
                <h2>Review Summary</h2>
                <div class="final-summary">
                    <h3>Gateway Ratings</h3>
                    <div class="gateway-ratings">`;
    rubricData.gateways.forEach(gateway => {
        html += `<div class="gateway-rating-item">
                    <h4>${sanitizeHTML(gateway.name)}: <span id="summary-${sanitizeHTML(gateway.id)}-rating">Not Rated</span></h4>
                    <p><span id="summary-${sanitizeHTML(gateway.id)}-points">0</span>/${gateway.totalPoints || 'N/A'} points</p>
                 </div>`;
    });
    html += `</div>
             <div class="final-rating">
                <h3>Final Rating: <span id="final-rating">Not Rated</span></h3>
             </div>
             <div class="form-group">
                <label for="summaryNotes">Overall Summary Notes:</label>
                <textarea id="summaryNotes" class="form-control" rows="8" placeholder="Enter overall strengths, weaknesses, and recommendations..."></textarea>
             </div>
             </div>
             </div>`;

    rubricContentDiv.innerHTML = html;
    console.log("[UI] Rubric UI rendering complete.");
}


/**
 * Renders the HTML structure for an individual indicator.
 * @param {object} indicatorData - The indicator object from the rubric data file.
 * @returns {string} HTML string for the indicator.
 */
function renderIndicator(indicatorData) {
    if (!indicatorData || !indicatorData.id || !indicatorData.name) {
        console.warn("[UI] Attempted to render indicator with invalid data:", indicatorData);
        return '';
    }

    const sanitizedId = sanitizeHTML(indicatorData.id);
    const sanitizedName = sanitizeHTML(indicatorData.name);

    let html = `<div class="indicator" data-indicator="${sanitizedId}">
                    <div class="indicator-header">
                        <h4>${sanitizedName}</h4>
                        <div class="indicator-actions-group">`; // Use the correct, styled container class

    if (!indicatorData.isNarrativeOnly) {
        html += `<div class="scoring-options">`;
        if (Array.isArray(indicatorData.scoringOptions) && indicatorData.scoringOptions.length > 0) {
            const sortedScores = [...indicatorData.scoringOptions].sort((a, b) => Number(a) - Number(b));
            sortedScores.forEach(score => {
                html += `<label><input type="radio" name="score-${sanitizedId}" value="${sanitizeHTML(String(score))}"> ${sanitizeHTML(String(score))}</label>`;
            });
        }
        html += `</div>`;
    } else {
        html += `<span class="narrative-only">(Narrative Evidence Only)</span>`;
    }

    // Wrap the action buttons in their own container for horizontal layout
    html += `<div class="indicator-buttons">`;
    if (indicatorData.evidenceGuide) {
        html += `<button class="btn small evidence-guide-btn" data-indicator-id="${sanitizedId}" title="View Evidence Guide"><i class="fas fa-book-open"></i> Guide</button>`;
    }
    html += `<button class="btn small ai-analyze-btn" title="Analyze this indicator with AI"><i class="fas fa-magic-wand-sparkles"></i> AI-nalyze</button>`;
    html += `</div>`; // End of .indicator-buttons
    
    html += `</div>`; // End of .indicator-actions-group
    html += `</div>
             <div class="indicator-content">`;
	if (indicatorData.description) {
        html += `<p class="indicator-description">${sanitizeHTML(indicatorData.description)}</p>`;
    }

    if (Array.isArray(indicatorData.scoringCriteria) && indicatorData.scoringCriteria.length > 0) {
        html += `<div class="scoring-criteria-display"><h5>Scoring Criteria:</h5><ul>`;
        indicatorData.scoringCriteria.forEach(criterion => {
            html += `<li>${sanitizeHTML(criterion)}</li>`;
        });
        html += `</ul></div>`;
    }
    // --- NEW: Add a dedicated evidence section for the AI-generated justification/expectation ---
    html += `<div class="evidence-section expectation" data-type="expectation">
                <h5>Score Justification:</h5>
                <!-- This will be populated with a single TinyMCE editor by JS -->
             </div>
             <hr class="evidence-divider">`;


    // --- Sections for Strengths and Gaps ---
    html += `<div class="evidence-section strengths" data-type="strength">
                <h5>Evidence of Strengths:</h5>
                <button class="btn small add-evidence" data-type="strength">+ Add Strength</button>
             </div>
             <hr class="evidence-divider">
             <div class="evidence-section gaps" data-type="gap">
                <h5>Analysis of Gaps & Weaknesses:</h5>
                <button class="btn small add-evidence" data-type="gap">+ Add Gap</button>
             </div>`;
             
    html += `</div></div>`;

    return html;
}


/**
 * Renders the HTML structure for a group of indicators.
 * @param {object} groupData - The indicator group object from the rubric data file.
 * @returns {string} HTML string for the indicator group.
 */
function renderIndicatorGroup(groupData) {
    if (!groupData || groupData.type !== 'group' || !groupData.name || !Array.isArray(groupData.items)) {
        console.warn("[UI] Attempted to render an invalid indicator group:", groupData);
        return '';
    }

    const sanitizedGroupName = sanitizeHTML(groupData.name);
    const groupIdAttr = groupData.id ? `data-group-id="${sanitizeHTML(groupData.id)}"` : '';

    let html = `<div class="indicator-group" ${groupIdAttr}>
                    <div class="indicator-header main-indicator-group">
                        <h4>${sanitizedGroupName}</h4>
                    </div>
                    <div class="indicator-content group-content">`;
    if (groupData.items.length > 0) {
        groupData.items.forEach(subItem => {
            html += renderIndicator(subItem);
        });
    } else {
        html += `<p class="na-value">No sub-indicators defined for this group.</p>`;
    }
    html += `</div></div>`;

    return html;
}

window.renderRubricUI = renderRubricUI;