// ai-analyzer.js - Handles PDF loading, management, AI analysis, and custom queries

// --- Configuration ---
/** @type {object|null} Holds the initialized Google AI SDK instance. */
let genAI = null;
/** @type {Array<{id: string, name: string, base64Data: string}>} Stores loaded PDF data. */
window.loadedPdfs = [];
/** @type {string|null} The ID of the currently "active" PDF (primarily for UI indication). AI uses all loaded PDFs. */
window.activePdfId = null; // Note: AI analysis and chat currently use ALL loaded PDFs, not just the active one.
/** @type {Array<{role: string, text: string}>} Stores the history of the AI chat. */
let chatHistory = [];
/** @const {number} Maximum number of messages to retain in chatHistory. */
const maxChatHistoryLength = 10; // Controls how many past messages are sent as context.
/** @type {string|null} Stores the Blob URL for the currently viewed PDF to allow revocation. */
let currentBlobUrl = null; // Used by the PDF viewer modal.

/**
 * Initializes the AI service by checking for the globally available SDK instance.
 * Validates the instance and sets the local `genAI` variable.
 * @returns {boolean} True if AI is successfully initialized, false otherwise.
 */
function initializeAI() {
    console.log("[AI Analyzer] Initializing AI service check...");
    if (window.genAiInstance) {
        genAI = window.genAiInstance;
        console.log("[AI Analyzer] Google AI SDK instance found and assigned.");
        // Check if the instance has the expected method(s) for generating content
        if (typeof genAI.getGenerativeModel === 'function' || (genAI.models && typeof genAI.models.generateContent === 'function')) {
            console.log("[AI Analyzer] AI instance appears valid.");
            return true;
        } else {
            console.error("[AI Analyzer] AI instance found but seems invalid (missing expected methods like getGenerativeModel or models.generateContent).");
            genAI = null; // Invalidate local reference
            showNotification("AI service instance is invalid. AI features disabled.", "error");
            return false;
        }
    } else {
        console.warn("[AI Analyzer] Google AI SDK instance (window.genAiInstance) not found. AI features disabled.");
        return false;
    }
}

/**
 * Clears the internal chat history data array.
 */
function clearChatHistoryData() {
    chatHistory = [];
    console.log("[AI Analyzer] Chat history data cleared.");
}

/**
 * Adds a message to the internal chat history.
 * If the history exceeds `maxChatHistoryLength`, the oldest message is removed.
 * @param {string} role - The role of the message sender ('user' or 'ai').
 * @param {string} text - The message content.
 */
function addMessageToHistory(role, text) {
    if (chatHistory.length >= maxChatHistoryLength) {
        chatHistory.shift(); // Remove the oldest message
    }
    chatHistory.push({ role, text });
    console.log("[AI Analyzer] Chat history updated:", chatHistory);
}

/**
 * Finds the ID of a loaded PDF by its name or a "pdf X" numeric reference.
 * Performs a case-insensitive partial match on the name.
 * For "pdf X", X is treated as a 1-based index into the loadedPdfs array.
 * @param {string} nameString - The name or "pdf X" string to search for.
 * @returns {string|null} The ID of the found PDF, or null if not found.
 */
function findPdfIdByName(nameString) {
    if (!nameString || window.loadedPdfs.length === 0) return null;

    const lowerNameString = nameString.trim().toLowerCase();

    // First, try a direct partial name match
    for (const pdf of window.loadedPdfs) {
        if (pdf.name.toLowerCase().includes(lowerNameString)) {
            console.log(`[AI Analyzer - findPdfIdByName] Found partial name match for "${nameString}" in PDF "${pdf.name}" (ID: ${pdf.id})`);
            return pdf.id;
        }
    }

    // Then, try to match "pdf X" format (e.g., "pdf 1", "PDF 2")
    const pdfNumberMatch = lowerNameString.match(/^pdf\s*(\d+)$/);
    if (pdfNumberMatch) {
        const pdfIndex = parseInt(pdfNumberMatch[1], 10) - 1; // Convert 1-based to 0-based index
        if (pdfIndex >= 0 && pdfIndex < window.loadedPdfs.length) {
            const pdf = window.loadedPdfs[pdfIndex];
            console.log(`[AI Analyzer - findPdfIdByName] Found numeric match for "${nameString}" -> PDF index ${pdfIndex} ("${pdf.name}", ID: ${pdf.id})`);
            return pdf.id;
        }
    }

    console.warn(`[AI Analyzer - findPdfIdByName] No matching PDF found for name string: "${nameString}"`);
    return null;
}


/**
 * Adds a PDF to the `window.loadedPdfs` list.
 * The source can be a File object (from file input) or a URL string.
 * Converts the PDF to a Base64 string for storage.
 * @param {File|string} source - The PDF file object or URL.
 * @param {string} name - The name to assign to the PDF.
 * @returns {Promise<string>} A promise that resolves with the ID of the added PDF.
 * @throws {Error} If PDF loading or processing fails.
 */
async function addPdfToList(source, name) {
    showNotification("Loading PDF...", "info");
    try {
        let pdfArrayBuffer;
        if (source instanceof File) {
            pdfArrayBuffer = await source.arrayBuffer();
        } else if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
            const response = await fetch(source);
            if (!response.ok) throw new Error(`Fetch failed for PDF URL: ${response.statusText} (status ${response.status})`);
            pdfArrayBuffer = await response.arrayBuffer();
        } else {
            throw new Error("Invalid PDF source. Must be a File object or a valid HTTP/HTTPS URL.");
        }

        const base64Data = arrayBufferToBase64(pdfArrayBuffer);
        const pdfId = `pdf_${Date.now()}_${Math.random().toString(16).slice(2)}`; // Generate a unique ID

        window.loadedPdfs.push({ id: pdfId, name: name, base64Data: base64Data });
        console.log(`[AI Analyzer] PDF added: "${name}" (ID: ${pdfId}), Size: ${Math.round(base64Data.length / 1024 / 1.37)} KB (approx. original size)`);

        if (window.loadedPdfs.length === 1) {
            setActivePdf(window.loadedPdfs[0].id); // Set the first loaded PDF as active by default
        }
        showNotification(`PDF "${name}" added successfully!`, "success");
        return pdfId;
    } catch (error) {
        console.error("[AI Analyzer] Error adding PDF to list:", error);
        showNotification(`Failed to add PDF "${name}": ${error.message}`, "error");
        throw error; // Re-throw to be caught by the caller if needed
    }
}

/**
 * Removes a PDF from the `window.loadedPdfs` list by its ID.
 * If the removed PDF was the active one, sets the new active PDF (if any remain).
 * @param {string} pdfId - The ID of the PDF to remove.
 */
function removePdf(pdfId) {
    const initialLength = window.loadedPdfs.length;
    window.loadedPdfs = window.loadedPdfs.filter(pdf => pdf.id !== pdfId);

    if (window.loadedPdfs.length < initialLength) {
        console.log(`[AI Analyzer] Removed PDF with ID: ${pdfId}`);
        if (window.activePdfId === pdfId) {
            window.activePdfId = null; // Clear active ID
            if (window.loadedPdfs.length > 0) {
                setActivePdf(window.loadedPdfs[0].id); // Set the first remaining PDF as active
            }
        }
        showNotification(`PDF removed.`, "info");

        // If no PDFs are left, disable AI features that depend on them
        if (window.loadedPdfs.length === 0 && window.genAiInstance) { // Check genAiInstance to avoid errors if AI isn't even on
            document.querySelectorAll('.ai-analyze-btn, #floatingQueryBtn').forEach(el => {
                el.disabled = true;
                el.dataset.originalTitle = el.title; // Store original title
                el.title = "Load PDFs to enable AI features";
                el.style.opacity = "0.5";
                el.style.cursor = "not-allowed";
            });
            const floatingBtn = document.getElementById('floatingQueryBtn');
            if (floatingBtn) floatingBtn.style.display = 'none'; // Hide chat button
            showNotification("No PDFs loaded. AI analysis and chat disabled until PDFs are added.", "warning", 7000);
        }
    }
}

/**
 * Sets the active PDF by its ID.
 * The "active" PDF is primarily a UI concept; AI analysis and chat use all loaded PDFs.
 * @param {string} pdfId - The ID of the PDF to set as active.
 */
function setActivePdf(pdfId) {
    if (pdfId && window.loadedPdfs.some(pdf => pdf.id === pdfId)) {
        window.activePdfId = pdfId;
        console.log(`[AI Analyzer] Active PDF set to ID: ${pdfId}`);
        // Note: UI update (e.g., radio button check) is handled by renderPdfList
    } else {
        if (pdfId) {
            console.warn(`[AI Analyzer] Attempted to set non-existent PDF ID as active: ${pdfId}`);
        }
        window.activePdfId = null; // Fallback to no active PDF if ID is invalid or null
    }
}

/**
 * Renders the list of loaded PDFs in the PDF management modal.
 * Includes radio buttons to set the active PDF and buttons to view/remove PDFs.
 */
function renderPdfList() {
    const listDiv = document.getElementById('loadedPdfsList');
    if (!listDiv) {
        console.error("[AI Analyzer] PDF list container 'loadedPdfsList' not found in DOM.");
        return;
    }

    listDiv.innerHTML = ''; // Clear previous list items

    if (window.loadedPdfs.length === 0) {
        listDiv.innerHTML = '<p>No PDFs loaded yet.</p>';
        return;
    }

    window.loadedPdfs.forEach(pdf => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'loaded-pdf-item';
        itemDiv.innerHTML = `
            <input type="radio" name="activePdf" value="${pdf.id}" ${pdf.id === window.activePdfId ? 'checked' : ''} title="Set as active PDF (UI selection only; AI uses all PDFs)">
            <span title="${sanitizeHTML(pdf.name)}">${sanitizeHTML(pdf.name)}</span>
            <div>
                <button class="btn small view-pdf-btn" data-id="${pdf.id}" title="View PDF">View</button>
                <button class="btn small danger remove-pdf-btn" data-id="${pdf.id}" title="Remove PDF">Remove</button>
            </div>
        `;
        listDiv.appendChild(itemDiv);
    });
}

/**
 * Converts a Base64 encoded string to a Blob URL.
 * This URL can be used as the `src` for an iframe to display the PDF.
 * @param {string} base64Data - The Base64 encoded PDF data.
 * @param {string} [contentType='application/pdf'] - The MIME type of the content.
 * @returns {string|null} The Blob URL, or null if conversion fails.
 */
function base64ToBlobUrl(base64Data, contentType = 'application/pdf') {
    try {
        const byteCharacters = atob(base64Data); // Decode Base64 string
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });
        return URL.createObjectURL(blob); // Create a URL representing the Blob
    } catch (e) {
        console.error("[AI Analyzer] Error converting Base64 to Blob URL:", e);
        showNotification("Error preparing PDF for viewing. Check console for details.", "error");
        return null;
    }
}

/**
 * Displays a PDF in the PDF viewer modal.
 * Converts the PDF's Base64 data to a Blob URL and sets it as the iframe source.
 * Optionally navigates to a specific page number.
 * @param {string} pdfId - The ID of the PDF to view.
 * @param {number|null} [pageNumber=null] - The page number to navigate to (if any).
 */
function viewPdf(pdfId, pageNumber = null) {
    const pdfData = window.loadedPdfs.find(p => p.id === pdfId);
    if (!pdfData) {
        showNotification("PDF not found. It may have been removed.", "error");
        console.error(`[AI Analyzer] Attempted to view PDF with ID ${pdfId} but it was not found in window.loadedPdfs.`);
        return;
    }

    const modal = document.getElementById('pdfViewerModal');
    const iframe = document.getElementById('pdfViewerIframe');
    const titleElement = document.getElementById('pdfViewerTitle');

    if (!modal || !iframe || !titleElement) {
        console.error("[AI Analyzer] PDF Viewer modal elements (modal, iframe, or title) not found in DOM.");
        return;
    }

    // Revoke any previously created Blob URL to free up resources
    if (window.currentBlobUrl) {
        URL.revokeObjectURL(window.currentBlobUrl);
        console.log("[AI Analyzer] Revoked previous Blob URL:", window.currentBlobUrl);
        window.currentBlobUrl = null;
    }

    const blobUrl = base64ToBlobUrl(pdfData.base64Data);
    if (!blobUrl) return; // Error handled in base64ToBlobUrl

    window.currentBlobUrl = blobUrl; // Store the new Blob URL for later revocation
    let finalUrl = blobUrl;

    if (pageNumber && !isNaN(pageNumber) && pageNumber > 0) {
        finalUrl += `#page=${pageNumber}`; // Append page fragment for PDF viewers
        titleElement.textContent = `${sanitizeHTML(pdfData.name)} (Page ${pageNumber})`;
        console.log(`[AI Analyzer] Navigating PDF "${pdfData.name}" (ID: ${pdfId}) to page ${pageNumber}`);
    } else {
        titleElement.textContent = sanitizeHTML(pdfData.name);
        console.log(`[AI Analyzer] Viewing PDF "${pdfData.name}" (ID: ${pdfId})`);
    }

    iframe.src = finalUrl;
    modal.style.display = 'block';
}

/**
 * Prepares all loaded PDF data for an AI API request.
 * @returns {Array<object>} An array of objects, each formatted for the AI API (inlineData with mimeType and base64 data).
 *                          Returns an empty array if no PDFs are loaded.
 */
function getAllLoadedPdfDataForRequest() {
    if (window.loadedPdfs.length === 0) return [];
    return window.loadedPdfs.map(pdf => ({
        inlineData: {
            mimeType: 'application/pdf',
            data: pdf.base64Data
        }
    }));
}

/**
 * Converts an ArrayBuffer to a Base64 encoded string.
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert.
 * @returns {string} The Base64 encoded string.
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// --- AI Indicator Analysis (REVISED & ROBUST Three-Pass Method) ---

/**
 * @const {object} The schema definition for the structured JSON response expected from the AI's final synthesis pass.
 */
const finalAnalysisResponseSchema = {
  type: "OBJECT",
  properties: {
    expectation: {
      type: "STRING",
      description: "The overall 'meet/partially meet/do not meet' statement and 1-2 sentence justification."
    },
    score: {
      type: "NUMBER",
      description: "The single numerical score for the indicator."
    }
  },
  required: ["expectation", "score"]
};

/**
 * A generic helper function to make a call to the Google AI API.
 * @param {string} modelName - The name of the AI model to use.
 * @param {object[]} contents - The contents array for the API call.
 * @param {object} [generationConfig={}] - Optional generation configuration for the API call.
 * @param {object[]} [safetySettings=[]] - Optional safety settings configuration.
 * @returns {Promise<string>} A promise that resolves with the AI's text response.
 * @throws {Error} If the API call fails or is blocked.
 */
async function genericAICall(modelName, contents, generationConfig = {}, safetySettings = []) {
    let generateContentFunc;

    // Adapt to the SDK structure
    if (genAI.models && typeof genAI.models.generateContent === 'function') {
        generateContentFunc = (params) => genAI.models.generateContent(params);
    } else if (typeof genAI.getGenerativeModel === 'function') {
        const modelInstance = genAI.getGenerativeModel({ model: modelName, generationConfig, safetySettings });
        if (modelInstance && typeof modelInstance.generateContent === 'function') {
            generateContentFunc = ({ contents }) => modelInstance.generateContent({ contents });
        }
    }
    if (!generateContentFunc) {
        throw new Error("Google AI SDK instance does not have a usable 'generateContent' method.");
    }
    
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('API request timed out (10 minutes)')), 600000));
    
    let result;
    try {
        result = await Promise.race([
            generateContentFunc({ model: modelName, contents: contents, generationConfig: generationConfig, safetySettings: safetySettings }),
            timeoutPromise
        ]);
    } catch (e) {
        console.error("[AI Analyzer - genericAICall] Caught raw error during API call:", e);
        throw new Error(`API call failed: ${e.message}`);
    }

    const response = result.response || result;
    const finishReason = response?.candidates?.[0]?.finishReason;
    const blockReason = response?.promptFeedback?.blockReason;

    if (blockReason) {
        const blockMessage = `Request blocked by API. Reason: ${blockReason}. See details in console.`;
        console.error(blockMessage, response.promptFeedback);
        throw new Error(blockMessage);
    }

    if (finishReason && !['STOP', 'MAX_TOKENS'].includes(finishReason)) {
        const finishMessage = `API response terminated unexpectedly. Reason: ${finishReason}.`;
        console.error(finishMessage, response.candidates[0]);
        throw new Error(finishMessage);
    }
    
    const aiResponseText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponseText) {
        const emptyResponseMessage = "AI returned an empty response, but no block or finish reason was provided. See full response object in console.";
        console.error(emptyResponseMessage, response);
        throw new Error(emptyResponseMessage);
    }
    
    // For JSON responses, the model sometimes wraps the output in markdown. Clean it.
    if (generationConfig.responseMimeType === 'application/json') {
        let cleanedJsonString = aiResponseText.trim();
        const markdownBlockRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
        const match = cleanedJsonString.match(markdownBlockRegex);
        if (match && match[1]) {
            return match[1]; // Return the cleaned JSON string
        }
    }
    
    return aiResponseText;
}


/**
 * Initiates a three-pass AI analysis for a specific indicator.
 * Pass 1: Analyzes for strengths.
 * Pass 2: Analyzes for gaps and weaknesses.
 * Pass 3: Synthesizes the findings into a final score and expectation.
 * @async
 * @param {string} indicatorId - The ID of the indicator to analyze.
 * @param {HTMLElement} analyzeButton - The button that triggered the analysis.
 * @param {string} [customInstruction=""] - Optional custom instructions from the user.
 */
async function analyzeIndicatorWithAI(indicatorId, analyzeButton, customInstruction = "") {
    console.log(`[AI Analyzer] Starting REVISED 3-pass analysis for Indicator: ${indicatorId}.`);
    if (customInstruction) console.log(`[AI Analyzer] With custom instruction: ${customInstruction}`);

    const indicatorElement = analyzeButton.closest('.indicator');
    if (!indicatorElement) {
        showNotification(`Indicator element not found for analysis. Cannot proceed.`, "error");
        return;
    }

    // UI Loading State
    const originalButtonHtml = analyzeButton.innerHTML;
    analyzeButton.classList.add('loading');
    analyzeButton.disabled = true;
    const updateButtonStatus = (text) => {
        analyzeButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    };

    // Pre-checks
    if (!genAI || window.loadedPdfs.length === 0) {
        const errorMsg = !genAI ? "AI Service not initialized." : "Please load at least one PDF.";
        showNotification(errorMsg, "error");
        analyzeButton.innerHTML = originalButtonHtml;
        analyzeButton.classList.remove('loading');
        analyzeButton.disabled = false;
        return;
    }

    const indicatorConfig = findIndicatorConfig(currentRubricData, indicatorId);
    if (!indicatorConfig) {
        showNotification(`Could not find configuration for indicator ${indicatorId}.`, "error");
        analyzeButton.innerHTML = originalButtonHtml;
        analyzeButton.classList.remove('loading');
        analyzeButton.disabled = false;
        return;
    }
    
    // Clear previous results from the UI to show it's working
    indicatorElement.querySelectorAll('.evidence-section').forEach(section => {
        section.querySelectorAll('.evidence-entry, .na-value').forEach(entry => {
            const editorPlaceholder = entry.querySelector('.tinymce-editor-placeholder');
            if (editorPlaceholder?.id) tinymce.get(editorPlaceholder.id)?.remove();
            entry.remove();
        });
    });

    const modelSelector = document.getElementById('aiModelSelectorIndicator');
    const modelName = modelSelector ? modelSelector.value : "gemini-1.5-pro-latest";
    const pdfPartsForApi = getAllLoadedPdfDataForRequest();
    
    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ];
    
    const errorDisplaySection = indicatorElement.querySelector('.evidence-section.expectation');

    try {
        // --- PASS 1: STRENGTHS ---
        updateButtonStatus("Strengths...");
        const strengthsPrompt = constructAIPromptForStrengths(indicatorConfig, customInstruction);
        console.log(`[AI Analyzer] Pass 1 (Strengths) Prompt for ${indicatorId}:\n`, strengthsPrompt);
        const strengthsContents = [{ role: 'user', parts: [{ text: strengthsPrompt }, ...pdfPartsForApi] }];
        const strengthsMarkdown = await genericAICall(modelName, strengthsContents, {}, safetySettings);
        console.log(`[AI Analyzer] Pass 1 (Strengths) Response for ${indicatorId}:\n`, strengthsMarkdown);

        // --- PASS 2: GAPS ---
        updateButtonStatus("Gaps...");
        const gapsPrompt = constructAIPromptForGaps(indicatorConfig, customInstruction);
        console.log(`[AI Analyzer] Pass 2 (Gaps) Prompt for ${indicatorId}:\n`, gapsPrompt);
        const gapsContents = [{ role: 'user', parts: [{ text: gapsPrompt }, ...pdfPartsForApi] }];
        const gapsMarkdown = await genericAICall(modelName, gapsContents, {}, safetySettings);
        console.log(`[AI Analyzer] Pass 2 (Gaps) Response for ${indicatorId}:\n`, gapsMarkdown);

        // --- PASS 3: FINAL ANALYSIS & SCORE ---
        updateButtonStatus("Synthesizing...");
        const finalAnalysisPrompt = constructAIPromptForFinalAnalysis(indicatorConfig, strengthsMarkdown, gapsMarkdown);
        console.log(`[AI Analyzer] Pass 3 (Final Analysis) Prompt for ${indicatorId}:\n`, finalAnalysisPrompt);
        const finalContents = [{ role: 'user', parts: [{ text: finalAnalysisPrompt }] }];
        const finalConfig = { responseMimeType: "application/json", responseSchema: finalAnalysisResponseSchema };
        const finalAnalysisJsonString = await genericAICall(modelName, finalContents, finalConfig, safetySettings);
        console.log(`[AI Analyzer] Pass 3 (Final Analysis) Response for ${indicatorId}:\n`, finalAnalysisJsonString);

        let parsedData;
        try {
            parsedData = JSON.parse(finalAnalysisJsonString);
        } catch (e) {
            throw new Error(`AI returned invalid JSON in the final analysis pass. Raw text: ${finalAnalysisJsonString}`);
        }

        if (parsedData) {
            updateUIFromMultiPassAI(indicatorId, parsedData.expectation, parsedData.score, strengthsMarkdown, gapsMarkdown);
            showNotification(`AI analysis complete for indicator ${indicatorId}.`, "success");
        } else {
            throw new Error("AI final analysis returned an empty or unparsable JSON object.");
        }

    } catch (error) {
        console.error(`[AI Analyzer] Error during 3-pass AI analysis for ${indicatorId}:`, error);
        let errorMessage = error.message || 'Unknown AI analysis error occurred.';
        showNotification(`AI analysis failed for ${indicatorId}: ${errorMessage}`, "error", 10000);
        if (errorDisplaySection) {
             const errorHtml = `<div class="ai-error-display"><h4>AI Analysis Error</h4><pre>${sanitizeHTML(errorMessage)}</pre></div>`;
             addEvidenceEntry(errorDisplaySection, errorHtml, false);
        }
    } finally {
        // Reset button
        analyzeButton.classList.remove('loading');
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = originalButtonHtml;
        console.log(`[AI Analyzer] Finished 3-pass analysis attempt for Indicator: ${indicatorId}`);
    }
}

/**
 * Constructs the prompt for the AI's first pass: finding strengths.
 * @param {object} indicatorConfig - The full configuration object for the indicator.
 * @param {string} [customInstruction=""] - Optional custom instructions.
 * @returns {string} The constructed prompt string.
 */
function constructAIPromptForStrengths(indicatorConfig, customInstruction = "") {
    const { id, name } = indicatorConfig;
    let prompt = `You are an expert, impartial curriculum reviewer. Your current mission is to act as a proponent for the instructional materials.
Your **ONLY** task is to find and list all evidence that demonstrates the materials **MEET or EXCEED** the criteria for the following indicator. Focus exclusively on strengths and supporting evidence.

**Indicator:** ${sanitizeHTML(name)} (ID: ${id})
---
`;
    prompt += formatEvidenceGuideForPrompt(indicatorConfig.evidenceGuide);
    
    if (customInstruction) {
        prompt += `\n\n**Additional User Instruction:**\n--- \n${sanitizeHTML(customInstruction)}\n---`;
    }

    prompt += `
**Your Task & Formatting Requirements:**

1.  **Find Strengths:** Thoroughly search all provided PDF documents for specific, concrete examples that align with the "Official Evidence Guide" and "Scoring Details".
2.  **Cite Meticulously:** For each piece of evidence:
    *   **Describe the material/activity:** Briefly describe the relevant student activity, teacher instruction, or material feature.
    *   **Cite the source:** Provide the document name and the **PHYSICAL page number** used by PDF viewers (e.g., "Teacher Guide, p. 42"). If the visible page number is different, include it like this: "(p. 42 / SEE: TG p. 38)". Accurate physical page numbers are critical.
    *   **Analyze the example:** Briefly explain *how* this example meets the criteria.
3.  **Output Format:** Format your entire response as a single, well-structured Markdown block. Use headings, lists, and bold text for clarity. **Do not include any conversational text, introductions, or conclusions.** If you find no evidence, state 'No supporting evidence was found.' and nothing else.

Begin your list of strengths now:`;
    return prompt;
}

/**
 * Constructs the prompt for the AI's second pass: finding gaps (devil's advocate).
 * @param {object} indicatorConfig - The full configuration object for the indicator.
 * @param {string} [customInstruction=""] - Optional custom instructions.
 * @returns {string} The constructed prompt string.
 */
function constructAIPromptForGaps(indicatorConfig, customInstruction = "") {
    const { id, name } = indicatorConfig;
    let prompt = `You are a CRITICAL curriculum reviewer playing devil's advocate. Your current mission is to be a skeptic.
Your **ONLY** task is to find and list all **GAPS, WEAKNESSES, or ways the materials FAIL** to meet the criteria for the following indicator.

**Indicator:** ${sanitizeHTML(name)} (ID: ${id})
---
`;
    prompt += formatEvidenceGuideForPrompt(indicatorConfig.evidenceGuide);
    
    if (customInstruction) {
        prompt += `\n\n**Additional User Instruction:**\n--- \n${sanitizeHTML(customInstruction)}\n---`;
    }

    prompt += `
**Your Task & Formatting Requirements:**

1.  **Find Gaps:** Thoroughly search all provided PDF documents for counter-evidence, omissions, or areas where criteria are only weakly or superficially met. Be specific.
2.  **Cite Meticulously:** For each gap you identify:
    *   **Describe the weakness:** Clearly state what is missing or insufficient.
    *   **Cite the location:** If possible, cite a document and page number where the weakness is apparent (e.g., "Teacher Guide, p. 55, where an opportunity was missed"). If it's an omission across the whole material, state that.
    *   **Analyze the gap:** Explain *why* this is a weakness and which criteria it fails to meet.
3.  **Output Format:** Format your entire response as a single, well-structured Markdown block. Use headings, lists, and bold text. **Do not include any conversational text, introductions, or conclusions.** If after a thorough review you find no significant gaps, state 'No significant gaps or weaknesses were identified.' and nothing else.

Begin your list of gaps/weaknesses now:`;
    return prompt;
}

/**
 * Constructs the prompt for the AI's final pass: synthesizing the findings.
 * REVISED to incorporate higher-level guidance for a more robust synthesis.
 * @param {object} indicatorConfig - The indicator's configuration.
 * @param {string} strengthsMarkdown - The markdown text of strengths from the first pass.
 * @param {string} gapsMarkdown - The markdown text of gaps from the second pass.
 * @returns {string} The constructed prompt string.
 */
function constructAIPromptForFinalAnalysis(indicatorConfig, strengthsMarkdown, gapsMarkdown) {
    const { name, scoringOptions, evidenceGuide } = indicatorConfig;
    const scoreOptionsText = (scoringOptions || []).join(', ');

    let prompt = `You are a SENIOR curriculum reviewer. You have been given two reports from junior reviewers for an indicator: one focusing only on strengths, the other only on gaps. Your task is to synthesize this conflicting information to provide a final, balanced assessment and score.

**Indicator:** ${sanitizeHTML(name)}
**Available Scores:** ${scoreOptionsText}

---
**STRATEGIC CONTEXT FOR YOUR JUDGEMENT**
Before reviewing the reports, ground your thinking in the core purpose of this indicator:
`;

    // Incorporate high-level guidance from the evidenceGuide if it exists
    if (evidenceGuide) {
        if (evidenceGuide.guidingQuestion) {
            prompt += `*   **Guiding Question:** ${sanitizeHTML(evidenceGuide.guidingQuestion)}\n`;
        }
        if (evidenceGuide.purpose) {
            prompt += `*   **Purpose:** ${sanitizeHTML(evidenceGuide.purpose)}\n`;
        }
        if (evidenceGuide.researchConnection) {
            prompt += `*   **Research Connection:** ${sanitizeHTML(evidenceGuide.researchConnection)}\n`;
        }
    } else {
        prompt += `*   (No specific strategic context provided. Rely on the indicator title and scoring guidance.)\n`;
    }

    prompt += `---
**OFFICIAL SCORING GUIDANCE (Your Rubric)**
You must use the following criteria to determine the final score:
`;
    
    // Use the detailed scoring criteria as the primary rubric
    if (evidenceGuide?.scoringDetails?.length > 0) {
        evidenceGuide.scoringDetails.forEach(d => {
            prompt += `*   **For a score of ${d.score}:** ${sanitizeHTML(d.text)}\n`;
        });
    } else if (indicatorConfig.scoringCriteria?.length > 0) {
        // Fallback to general scoring criteria if detailed ones aren't available
        prompt += indicatorConfig.scoringCriteria.map(c => `*   ${sanitizeHTML(c)}`).join('\n');
    } else {
        prompt += `*   (No scoring guidance provided. Use your best judgment.)\n`;
    }

    prompt += `
---
**Report 1: Evidence of STRENGTHS (from Junior Reviewer A)**
${strengthsMarkdown}
---
**Report 2: Evidence of GAPS & WEAKNESSES (from Junior Reviewer B)**
${gapsMarkdown}
---

**Your Final Task:**
Based **ONLY** on the provided reports and weighing them against the 'Strategic Context' and 'Official Scoring Guidance':
1.  Write a concise (1-2 sentence) 'meets/partially meets/does not meet' justification for the final score. This is the official summary that explains your reasoning.
2.  Assign the single most appropriate numerical score from the 'Available Scores' list. A high score requires that the STRENGTHS report is compelling and directly addresses the scoring guidance, while the GAPS report is weak or negligible.

Your response MUST be a single, valid JSON object following the schema provided, with no other text, comments, or markdown formatting.
`;
    return prompt;
}

/**
 * UTILITY: Formats an evidenceGuide object into a string for an AI prompt.
 * @param {object} guide - The evidenceGuide object.
 * @returns {string} A formatted string, or an empty string if guide is null/invalid.
 */
function formatEvidenceGuideForPrompt(guide) {
    if (!guide) return '';

    let guideText = '**Official Evidence Guide for this Indicator:**\n';
    if (guide.guidingQuestion) guideText += `*   **Guiding Question:** ${sanitizeHTML(guide.guidingQuestion)}\n`;
    
    if (guide.scoringDetails && guide.scoringDetails.length > 0) {
        guideText += '*   **Scoring Details:**\n';
        guide.scoringDetails.forEach(d => {
            guideText += `    *   **Score ${d.score}:** ${sanitizeHTML(d.text)}\n`;
        });
    }

    if (guide.evidenceCollection?.recordEvidence?.length > 0) {
        guideText += '*   **Record Evidence of:**\n' + guide.evidenceCollection.recordEvidence.map(r => `    *   ${sanitizeHTML(r)}`).join('\n') + '\n';
    }

    if (guide.purpose) guideText += `*   **Purpose:** ${sanitizeHTML(guide.purpose)}\n`;
    if (guide.researchConnection) guideText += `*   **Research Connection:** ${sanitizeHTML(guide.researchConnection)}\n`;

    return guideText;
}

/**
 * Updates the UI for an indicator based on the results of the multi-pass AI analysis.
 * @param {string} indicatorId - The ID of the indicator being updated.
 * @param {string} expectation - The final expectation statement from the synthesis pass.
 * @param {number} score - The final numerical score from the synthesis pass.
 * @param {string} strengthsMarkdown - The raw markdown of strengths from the first pass.
 * @param {string} gapsMarkdown - The raw markdown of gaps from the second pass.
 */
function updateUIFromMultiPassAI(indicatorId, expectation, score, strengthsMarkdown, gapsMarkdown) {
    const indicatorElement = document.querySelector(`.indicator[data-indicator="${indicatorId}"]`);
    if (!indicatorElement) return;

    const expectationSection = indicatorElement.querySelector('.evidence-section.expectation');
    const strengthsSection = indicatorElement.querySelector('.evidence-section.strengths');
    const gapsSection = indicatorElement.querySelector('.evidence-section.gaps');

    // Add Justification/Expectation to its dedicated textbox
    if (expectationSection) {
        const expectationHtml = linkifyPageNumbers(markdownToHTML(expectation?.trim() || '<p class="na-value">No specific justification provided by AI.</p>'));
        addEvidenceEntry(expectationSection, expectationHtml, false);
    }

    // Add Strengths as a single evidence entry
    if (strengthsMarkdown?.trim() && strengthsSection) {
        const strengthsHtml = linkifyPageNumbers(markdownToHTML(strengthsMarkdown.trim()));
        addEvidenceEntry(strengthsSection, strengthsHtml, false);
    } else if (strengthsSection) {
        addEvidenceEntry(strengthsSection, '<p class="na-value">No specific strengths identified by AI.</p>', false);
    }

    // Add Gaps as a single evidence entry
    if (gapsMarkdown?.trim() && gapsSection) {
        const gapsHtml = linkifyPageNumbers(markdownToHTML(gapsMarkdown.trim()));
        addEvidenceEntry(gapsSection, gapsHtml, false);
    } else if (gapsSection) {
        addEvidenceEntry(gapsSection, '<p class="na-value">No significant gaps or weaknesses identified by AI.</p>', false);
    }

    // Update scoring radio button
    const indicatorConfig = findIndicatorConfig(currentRubricData, indicatorId);
    if (indicatorConfig && !indicatorConfig.isNarrativeOnly && typeof score === 'number') {
        const radioButton = indicatorElement.querySelector(`input[name="score-${indicatorId}"][value="${score}"]`);
        if (radioButton) {
            radioButton.checked = true;
        }
    }

    // Open the accordion if it's closed to show the results
    if (!indicatorElement.classList.contains('open')) {
        indicatorElement.querySelector('.indicator-header')?.click();
    }

    // Update the main data model and scores after a short delay
    setTimeout(() => {
        if (indicatorConfig && !indicatorConfig.isNarrativeOnly) {
            updateIndicatorScore(indicatorId, score);
        }
        updateEvidenceData();
        updateGatewayScores();
    }, 200);
}


// --- AI Custom Query (Chat) ---

/**
 * Constructs the prompt for a custom AI chat query.
 * @param {Array<object>} [selectedIndicatorContextArray=[]] - Array of indicator context objects.
 * @returns {string} The combined prompt string to be sent to the AI.
 */
function getChatHistoryForPrompt(selectedIndicatorContextArray = []) {
    const historySlice = chatHistory.slice(-maxChatHistoryLength);

    let combinedText = `You are a helpful AI assistant analyzing K-12 science instructional materials (provided as PDF documents) based on the Next Generation Science Standards (NGSS) and the EdReports Rubric criteria. Please answer the user's question based *only* on the provided PDF documents and the conversation history. Use markdown formatting for clarity (like lists, bold).

**[CRITICAL PAGE NUMBER INSTRUCTION FOR CHAT]**
When citing evidence or referring to content in the PDFs:
1.  **Identify the source document:** Use the document name as it appears in your list of provided PDFs (e.g., "Teacher Guide," "Student Workbook"). If the exact name isn't clear, use a generic identifier like "(PDF 1, p. 15)", "(PDF 2, p. 8)", etc., based on the order they were provided to you.
2.  **Provide the PHYSICAL/ABSOLUTE page number:** This is the sequential page number used by PDF viewers (e.g., (Teacher Guide, p. 15) or (Student Workbook, pp. 20-22)).
3.  **Include VISIBLE page text IF DIFFERENT:** If the number printed visibly on the page (e.g., roman numerals, section-specific numbering) differs from the physical page number, include it like this: (Teacher Guide, p. 15 / SEE: TG page xiii) or (Student Workbook, p. 20 / SEE: Student Edition p. 5).
4.  **Accuracy of the PHYSICAL page number is essential for creating functional navigation links in the application.**
5.  **If uncertain about the physical page number:** State the visible reference you *can* see (e.g., "(Introduction, p. iv)", "(Chapter 3 Opener)") INSTEAD of guessing a physical number. Still try to provide the visible page text.
---
`;

    if (selectedIndicatorContextArray && selectedIndicatorContextArray.length > 0) {
        combinedText += "\n\n--- Specific Indicator Context Provided by User for THIS QUERY ---";
        selectedIndicatorContextArray.forEach(context => {
            combinedText += `\n\nIndicator: ${sanitizeHTML(context.title)} (ID: ${sanitizeHTML(context.id)})`;
            combinedText += `\nCriteria:\n${sanitizeHTML(context.criteria)}`;
            combinedText += `\nPreviously Entered Evidence (if any):\n${context.evidenceString || "No evidence entered yet for this indicator."}`;
            if (context.evidenceGuide) {
                combinedText += formatEvidenceGuideForPrompt(context.evidenceGuide);
            }
        });
        combinedText += "\n--- End of Specific Indicator Context ---";
    }

    combinedText += "\n\n--- Conversation Context (Recent Messages) ---";
    if (historySlice.length === 0) {
        combinedText += "\n(No previous messages in this chat session)";
    } else {
        historySlice.forEach(msg => {
            combinedText += `\n\n${msg.role === 'user' ? "User" : "AI"}: ${sanitizeHTML(msg.text)}`;
        });
    }
    combinedText += "\n\n--- Current Task ---";

    console.log("[AI Analyzer] Generated chat context for AI:\n", combinedText);
    return combinedText;
}


/**
 * Sends a custom query (with full context including history and indicator data) to the AI.
 * @async
 * @param {string} fullPromptForAI - The complete prompt string.
 * @param {string} modelName - The name of the AI model to use.
 * @returns {Promise<string>} A promise that resolves with the AI's text response.
 * @throws {Error} If the AI service is not initialized, prompt is empty, no PDFs are loaded, or API call fails.
 */
async function customQueryWithAI(fullPromptForAI, modelName) {
    console.log(`[AI Analyzer] Processing custom query. Model: ${modelName}`);
    console.log(`[AI Analyzer] Full prompt for custom query:\n`, fullPromptForAI);

    if (!genAI) { throw new Error("AI Service not initialized. Cannot perform custom query."); }
    if (!fullPromptForAI) { throw new Error("Prompt for custom query cannot be empty."); }

    const pdfPartsForApi = getAllLoadedPdfDataForRequest();
    if (pdfPartsForApi.length === 0) {
        throw new Error("No PDFs loaded to query. Please load PDF documents first.");
    }
    
    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ];

    const parts = [{ text: fullPromptForAI }, ...pdfPartsForApi];
    const contents = [{ role: 'user', parts }];

    try {
        const aiResponseText = await genericAICall(modelName, contents, {}, safetySettings);
        console.log(`[AI Analyzer] Extracted Custom Query Response Text:\n`, aiResponseText);
        return aiResponseText;
    } catch (error) {
        console.error(`[AI Analyzer] Error during custom query:`, error);
        throw new Error(error.message || 'Unknown error occurred during custom AI query.');
    }
}