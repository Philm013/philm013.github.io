# EdReporter/app.js

This file is the primary controller for the application, handling initialization, event listener setup, and modal management. It orchestrates the entire application lifecycle from DOM load to user interaction.

---

### `updateAiFeatureUI()`

Enables or disables all AI-related UI elements based on the global state, checking if the AI SDK is initialized and if any PDF documents are loaded.

*   **Called By**:
    *   `initApp()`
    *   `setupPdfLoadModal()` (within API key save and PDF add handlers)
    *   `removePdf()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)

---

### `initApp()`

The main entry point of the application, called on `DOMContentLoaded`. It orchestrates the initialization of all other modules.

*   **Called By**:
    *   *Event Listener (`DOMContentLoaded`)*
*   **Calls To**:
    *   `initDB()` (*External, db.js*)
    *   `initReview()` (*External, review.js*)
    *   `initializeExports()` (*External, export.js*)
    *   `initializeAI()` (*External, ai-analyzer.js*)
    *   `updateAiFeatureUI()`
    *   `setupLoadReviewModal()`
    *   `setupPdfLoadModal()`
    *   `setupPdfViewerModal()`
    *   `setupChatQueryModal()`
    *   `setupSelectIndicatorForChatModal()`
    *   `setupAiInstructionModal()`
    *   `setupEvidenceGuideModal()`
    *   `setupImportReview()`
    *   `setupImageViewer()` (*External, utils.js*)
    *   `setupPageLinkNavigation()`
    *   `setupRubricSelector()`
    *   `showNotification()` (*External, utils.js*)
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `setupRubricSelector()`

Populates the rubric `<select>` dropdown and attaches a `change` event listener to load the selected rubric.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `isReviewModified()` (*External, review.js*)
    *   `loadRubric()`
    *   `showNotification()` (*External, utils.js*)

---

### `loadRubric(rubricId)`

The core function for changing the review context. It updates the current rubric data, re-renders the entire UI, and sets up all rubric-specific event listeners.

*   **Called By**:
    *   `setupRubricSelector()`
    *   `loadReviewData()` (*External, review.js*)
    *   `importReviewFromHTML()` (*External, review.js*)
*   **Calls To**:
    *   `renderRubricUI()` (*External, ui.js*)
    *   `setupTabNavigation()` (*External, review.js*)
    *   `setupIndicatorAccordions()` (*External, review.js*)
    *   `setupScoringOptions()` (*External, review.js*)
    *   `setupEvidenceSection()` (*External, review.js*)
    *   `setupAIAnalyzeButtons()`
    *   `setupMetadataFormTracking()` (*External, review.js*)
    *   `setupSummaryNotesTracking()` (*External, review.js*)
    *   `createNewReview()` (*External, review.js*)
    *   `populateAIModelSelectors()`
    *   `showNotification()` (*External, utils.js*)

---

### `populateAIModelSelectors()`

Sets the default values for the AI model selection dropdowns.

*   **Called By**:
    *   `loadRubric()`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `setupEvidenceGuideModal()`

Sets up the modal for displaying detailed evidence guides for indicators.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `findIndicatorWithContext()` (*External, utils.js*)
    *   `populateEvidenceGuideModal()`
    *   `showNotification()` (*External, utils.js*)

---

### `populateEvidenceGuideModal(guideData)`

Fills the evidence guide modal with content from the provided `guideData` object.

*   **Called By**:
    *   `setupEvidenceGuideModal()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `setupAiInstructionModal()`

Initializes the modal and TinyMCE editor for users to enter custom instructions for an AI analysis.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `tinymce.get()` / `tinymce.init()` (*External Library*)
    *   `analyzeIndicatorWithAI()` (*External, ai-analyzer.js*)

---

### `setupLoadReviewModal()`

Sets up the modal that lists all saved reviews from IndexedDB, allowing users to load or delete them.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `getAllReviews()` (*External, db.js*)
    *   `isReviewModified()` (*External, review.js*)
    *   `loadReviewData()` (*External, review.js*)
    *   `deleteReview()` (*External, db.js*)
    *   `showNotification()` (*External, utils.js*)
    *   `formatDate()` (*External, utils.js*)
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `setupPdfLoadModal()`

Sets up the modal for managing PDFs and the Gemini API Key. Handles adding PDFs from URL/file and saving/verifying the API key.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `renderPdfList()` (*External, ai-analyzer.js*)
    *   `initializeGeminiSDK()` (*External, from SDK script*)
    *   `initializeAI()` (*External, ai-analyzer.js*)
    *   `updateAiFeatureUI()`
    *   `addPdfToList()` (*External, ai-analyzer.js*)
    *   `removePdf()` (*External, ai-analyzer.js*)
    *   `viewPdf()` (*External, ai-analyzer.js*)
    *   `showNotification()` (*External, utils.js*)

---

### `setupPdfViewerModal()`

Sets up the modal containing the `<iframe>` for displaying PDF documents.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `URL.revokeObjectURL()` (*External, Browser API*)

---

### `setupSelectIndicatorForChatModal()`

Sets up the modal that allows users to select which rubric indicators to include as context in an AI chat query.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `collectAndSetIndicatorChatContext()`

---

### `openSelectIndicatorForChatModal()`

Opens and populates the indicator selection modal.

*   **Called By**:
    *   `setupChatQueryModal()`
*   **Calls To**:
    *   `populateIndicatorForChatList()`
    *   `showNotification()` (*External, utils.js*)

---

### `populateIndicatorForChatList()`

Renders the list of indicators with checkboxes in the "Select Indicator for Chat" modal.

*   **Called By**:
    *   `openSelectIndicatorForChatModal()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `collectAndSetIndicatorChatContext()`

Gathers data from the selected indicators (title, criteria, evidence) to be used as context for the next AI chat query.

*   **Called By**:
    *   `setupSelectIndicatorForChatModal()`
*   **Calls To**:
    *   `updateEvidenceData()` (*External, review.js*)
    *   `findIndicatorConfig()` (*External, utils.js*)
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*)
    *   `renderSelectedIndicatorContextInChatDisplay()`

---

### `renderSelectedIndicatorContextInChatDisplay()`

Updates the UI in the main chat modal to show which indicators are currently providing context.

*   **Called By**:
    *   `collectAndSetIndicatorChatContext()`
    *   `clearIndicatorChatContext()`
    *   `setupChatQueryModal()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `clearIndicatorChatContext()`

---

### `clearIndicatorChatContext()`

Clears the selected indicator context array and updates the chat modal UI.

*   **Called By**:
    *   `renderSelectedIndicatorContextInChatDisplay()`
*   **Calls To**:
    *   `renderSelectedIndicatorContextInChatDisplay()`
    *   `showNotification()` (*External, utils.js*)

---

### `setupChatQueryModal()`

Sets up the floating chat button and the main chat modal, including event handlers for sending messages, clearing history, and adding indicator context.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `setChatLogPlaceholder()`
    *   `renderSelectedIndicatorContextInChatDisplay()`
    *   `openSelectIndicatorForChatModal()`
    *   `appendMessageToChat()`
    *   `appendThinkingMessage()`
    *   `generateUniqueId()` (*External, utils.js*)
    *   `getChatHistoryForPrompt()` (*External, ai-analyzer.js*)
    *   `customQueryWithAI()` (*External, ai-analyzer.js*)
    *   `updateThinkingMessage()`
    *   `clearChatHistoryData()` (*External, ai-analyzer.js*)
    *   `showNotification()` (*External, utils.js*)

---

### `setupAIAnalyzeButtons()`

Sets up a single delegated event listener on the main content area to handle clicks on any "AI Analyze" button.

*   **Called By**:
    *   `loadRubric()`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)
    *   `findIndicatorConfig()` (*External, utils.js*)
    *   `analyzeIndicatorWithAI()` (*External, ai-analyzer.js*)
    *   `tinymce.get()` (*External Library*)
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `handlePageLinkClick(event)`

Handles clicks on `.page-link` elements, extracting the page number and PDF ID to open the PDF viewer to the correct location.

*   **Called By**:
    *   `setupPageLinkNavigation()`
    *   `setupPageLinkNavigationForElement()`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)
    *   `viewPdf()` (*External, ai-analyzer.js*)

---

### `setupPageLinkNavigationForElement(parentElement)`

Attaches a delegated click listener to a specific parent element (like a TinyMCE body) to handle clicks on `.page-link` elements within it.

*   **Called By**:
    *   `initializeSingleTinyMCE()` (*External, review.js*)
*   **Calls To**:
    *   `handlePageLinkClick()`

---

### `setupPageLinkNavigation()`

Sets up a global, delegated click listener on the `document.body` for any `.page-link` elements not inside a TinyMCE editor.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `handlePageLinkClick()`

---

### `setupImportReview()`

Sets up the "Import HTML" button, which triggers a hidden file input to allow users to load an exported review file.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `importReviewFromHTML()` (*External, review.js*)
    *   `showNotification()` (*External, utils.js*)

---

### Chat UI Helpers

Includes `setChatLogPlaceholder`, `appendMessageToChat`, `appendThinkingMessage`, `updateThinkingMessage`.

*   **Summary**: These functions manage the visual state of the chat log, including adding user/AI messages, showing/hiding the "Thinking..." spinner, and handling placeholders.
*   **Calls To**: `markdownToHTML()`, `sanitizeHTML()`, `linkifyPageNumbers()` (*All External, utils.js*), `addMessageToHistory()` (*External, ai-analyzer.js*).

# EdReporter/review.js

This file manages the `currentReview` data structure, UI interactions related to review content (scoring, evidence), saving/loading, and TinyMCE editor instances.

---

### `initReview()`

Initializes generic review UI event listeners that are not dependent on a specific rubric's structure.

*   **Called By**:
    *   `initApp()` (*External, app.js*)
*   **Calls To**:
    *   `setupTabNavigation()`
    *   `setupIndicatorAccordions()`
    *   `setupScoringOptions()`
    *   `setupEvidenceSection()`
    *   `setupCollapsibleMetadata()`
    *   `setupMetadataFormTracking()`
    *   `setupSummaryNotesTracking()`
    *   `saveCurrentReview()`
    *   `isReviewModified()`
    *   `createNewReview()`
    *   `showNotification()` (*External, utils.js*)

---

### `setupSummaryNotesTracking()`

Sets up an event listener for the summary notes textarea to update `currentReview.summary.notes`.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `setupTabNavigation()`

Sets up tab navigation within the review content area.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Calls To**:
    *   `updateGatewayScores()`

---

### `setupCollapsibleMetadata()`

Sets up the collapsible functionality for the review metadata section.

*   **Called By**:
    *   `initReview()`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `importReviewFromHTML(file)`

Imports a review from an HTML file, parses it, and loads the data into the application.

*   **Called By**:
    *   `setupImportReview()` (*External, app.js*)
*   **Calls To**:
    *   `loadRubric()` (*External, app.js*)
    *   `findIndicatorConfig()` (*External, utils.js*)
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*)
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `loadReviewData()`
    *   `getReview()` (*External, db.js*)
    *   `saveReview()` (*External, db.js*)
    *   `showNotification()` (*External, utils.js*)

---

### `setupIndicatorAccordions()`

Sets up accordion functionality for indicators and indicator groups.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Calls To**:
    *   `tinymce.get().execCommand()` (*External Library*)

---

### `setupScoringOptions()`

Sets up event listeners for scoring radio buttons using delegation.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Calls To**:
    *   `updateIndicatorScore()`

---

### `setupEvidenceSection()`

Sets up event listeners for adding and removing evidence entries.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Calls To**:
    *   `addEvidenceEntry()`
    *   `tinymce.get().remove()` (*External Library*)
    *   `updateEvidenceData()`

---

### `updateEvidenceData()`

Updates `currentReview` by collecting evidence text from all TinyMCE editors.

*   **Called By**:
    *   `setupEvidenceSection()`
    *   `initializeSingleTinyMCE()` (via `setTimeout`)
    *   `saveCurrentReview()`
    *   `collectAndSetIndicatorChatContext()` (*External, app.js*)
    *   `exportReview()` (*External, export.js*)
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*)
    *   `tinymce.get().getContent()` (*External Library*)

---

### `updateIndicatorScore(indicatorId, score)`

Updates the score for a specific indicator in `currentReview` and recalculates gateway scores.

*   **Called By**:
    *   `setupScoringOptions()`
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `findIndicatorConfig()` (*External, utils.js*)
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*)
    *   `updateGatewayScores()`

---

### `updateGatewayScores()`

Recalculates and updates scores and ratings for all gateways and the final review rating in both the data model and the UI.

*   **Called By**:
    *   `setupTabNavigation()`
    *   `updateIndicatorScore()`
    *   `saveCurrentReview()`
    *   `createNewReview()`
    *   `loadReviewData()`
    *   `exportReview()` (*External, export.js*)
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*)
    *   `calculateGatewayRating()` (*External, utils.js*)
    *   `calculateFinalRating()` (*External, utils.js*)

---

### `setupMetadataFormTracking()`

Sets up event listeners for metadata form inputs.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `createInitialReviewData(rubricId)`

Creates an initial, empty data structure for a new review.

*   **Called By**:
    *   `createNewReview()`
*   **Calls To**:
    *   `formatDate()` (*External, utils.js*)
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*)

---

### `initializeSingleTinyMCE(editorId, initialContent)`

Initializes a single TinyMCE editor instance with specific configurations.

*   **Called By**:
    *   `addEvidenceEntry()`
*   **Calls To**:
    *   `tinymce.get().remove()` / `tinymce.init()` (*External Library*)
    *   `updateEvidenceData()`
    *   `setupPageLinkNavigationForElement()` (*External, app.js*)

---

### `addEvidenceEntry(evidenceSectionElement, initialHtmlContent, ...)`

Adds a new evidence entry (including a TinyMCE editor) to the specified evidence section.

*   **Called By**:
    *   `setupEvidenceSection()`
    *   `createNewReview()`
    *   `loadReviewData()`
    *   `analyzeIndicatorWithAI()` (*External, ai-analyzer.js*)
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `initializeSingleTinyMCE()`
    *   `updateEvidenceData()`

---

### `saveCurrentReview()`

Saves the current review data and its associated PDFs to the database.

*   **Called By**:
    *   `initReview()` (via event listener)
*   **Calls To**:
    *   `updateEvidenceData()`
    *   `updateGatewayScores()`
    *   `showNotification()` (*External, utils.js*)
    *   `saveReview()` (*External, db.js*)
    *   `savePdfsForReview()` (*External, db.js*)

---

### `createNewReview(rubricId, ...)`

Initializes a new, empty review based on the specified rubric, resetting the UI and data model.

*   **Called By**:
    *   `initReview()` (via event listener)
    *   `loadRubric()` (*External, app.js*)
    *   `loadReviewData()`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)
    *   `createInitialReviewData()`
    *   `setActivePdf()` (*External, ai-analyzer.js*)
    *   `renderPdfList()` (*External, ai-analyzer.js*)
    *   `formatDate()` (*External, utils.js*)
    *   `tinymce.get().remove()` (*External Library*)
    *   `addEvidenceEntry()`
    *   `updateGatewayScores()`

---

### `loadReviewData(reviewData)`

Loads review data into the application, switching rubrics if necessary and populating all UI fields.

*   **Called By**:
    *   `importReviewFromHTML()`
    *   `setupLoadReviewModal()` (*External, app.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)
    *   `loadRubric()` (*External, app.js*)
    *   `createNewReview()`
    *   `getPdfsForReview()` (*External, db.js*)
    *   `setActivePdf()` (*External, ai-analyzer.js*)
    *   `renderPdfList()` (*External, ai-analyzer.js*)
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*)
    *   `tinymce.get().remove()` (*External Library*)
    *   `addEvidenceEntry()`
    *   `updateGatewayScores()`
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `isReviewModified()`

Checks if the current review has been modified (a simplified check for unsaved changes).

*   **Called By**:
    *   `initReview()`
    *   `setupLoadReviewModal()` (*External, app.js*)
    *   `setupRubricSelector()` (*External, app.js*)
*   **Calls To**:
    *   *None*

# EdReporter/ui.js

This file handles the dynamic generation of the rubric UI structure based on rubric data.

---

### `renderRubricUI(rubricData)`

Renders the entire rubric UI, including tabs, gateways, and the summary page.

*   **Called By**:
    *   `loadRubric()` (*External, app.js*)
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `renderIndicatorGroup()`
    *   `renderIndicator()`

---

### `renderIndicator(indicatorData)`

Renders the HTML for a single, non-grouped indicator, including its header, scoring options, and evidence sections.

*   **Called By**:
    *   `renderRubricUI()`
    *   `renderIndicatorGroup()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `renderIndicatorGroup(groupData)`

Renders the HTML for a collapsible group of indicators.

*   **Called By**:
    *   `renderRubricUI()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `renderIndicator()`

# EdReporter/ai-analyzer.js

This file manages all AI-related functionality: PDF loading/processing, communication with the Google AI API, indicator analysis, and custom chat queries.

---

### `initializeAI()`
Initializes the AI service by assigning the global `window.genAiInstance` to a local variable.

*   **Called By**:
    *   `initApp()` (*External, app.js*)
    *   `setupPdfLoadModal()` (*External, app.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)

---

### `clearChatHistoryData()`
Clears the internal `chatHistory` array.

*   **Called By**:
    *   `setupChatQueryModal()` (*External, app.js*)
*   **Calls To**:
    *   *None*

---

### `addMessageToHistory(role, text)`
Adds a message to the internal `chatHistory` array and enforces `maxChatHistoryLength`.

*   **Called By**:
    *   `appendMessageToChat()` (*External, app.js*)
    *   `updateThinkingMessage()` (*External, app.js*)
*   **Calls To**:
    *   *None*

---

### `findPdfIdByName(nameString)`
Finds a loaded PDF's ID by its name or a "pdf X" reference.

*   **Called By**:
    *   `linkifyPageNumbers()` (*External, utils.js*)
*   **Calls To**:
    *   *None*

---

### `addPdfToList(source, name)`
Converts a PDF file or URL to Base64 and adds it to the `window.loadedPdfs` list.

*   **Called By**:
    *   `setupPdfLoadModal()` (*External, app.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)
    *   `arrayBufferToBase64()`
    *   `setActivePdf()`

---

### `removePdf(pdfId)`
Removes a PDF from the `window.loadedPdfs` list.

*   **Called By**:
    *   `setupPdfLoadModal()` (*External, app.js*)
*   **Calls To**:
    *   `setActivePdf()`
    *   `showNotification()` (*External, utils.js*)
    *   `updateAiFeatureUI()` (*External, app.js*)

---

### `setActivePdf(pdfId)`
Sets the `window.activePdfId`. This is mainly for UI state.

*   **Called By**:
    *   `addPdfToList()`
    *   `removePdf()`
    *   `createNewReview()` (*External, review.js*)
    *   `loadReviewData()` (*External, review.js*)
*   **Calls To**:
    *   *None*

---

### `renderPdfList()`
Renders the list of loaded PDFs in the management modal.

*   **Called By**:
    *   `setupPdfLoadModal()` (*External, app.js*)
    *   `createNewReview()` (*External, review.js*)
    *   `loadReviewData()` (*External, review.js*)
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `base64ToBlobUrl(base64Data, contentType)`
Converts a Base64 string to a Blob URL for viewing.

*   **Called By**:
    *   `viewPdf()`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)

---

### `viewPdf(pdfId, pageNumber)`
Displays a PDF in the viewer modal.

*   **Called By**:
    *   `setupPdfLoadModal()` (*External, app.js*)
    *   `handlePageLinkClick()` (*External, app.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)
    *   `base64ToBlobUrl()`
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `getAllLoadedPdfDataForRequest()`
Prepares all loaded PDFs into the format required for an AI API request.

*   **Called By**:
    *   `analyzeIndicatorWithAI()`
    *   `customQueryWithAI()`
*   **Calls To**:
    *   *None*

---

### `arrayBufferToBase64(buffer)`
Converts an ArrayBuffer to a Base64 string.

*   **Called By**:
    *   `addPdfToList()`
*   **Calls To**:
    *   `window.btoa()` (*External, Browser API*)

---

### `genericAICall(...)`
A generic helper to make a `generateContent` call to the Google AI API, with timeout and error handling.

*   **Called By**:
    *   `analyzeIndicatorWithAI()`
    *   `customQueryWithAI()`
*   **Calls To**:
    *   `genAI.getGenerativeModel()` / `genAI.models.generateContent()` (*External, Google AI SDK*)

---

### `analyzeIndicatorWithAI(...)`
Orchestrates the three-pass AI analysis for a given indicator.

*   **Called By**:
    *   `setupAiInstructionModal()` (*External, app.js*)
    *   `setupAIAnalyzeButtons()` (*External, app.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)
    *   `findIndicatorConfig()` (*External, utils.js*)
    *   `getAllLoadedPdfDataForRequest()`
    *   `constructAIPromptForStrengths()`
    *   `constructAIPromptForGaps()`
    *   `constructAIPromptForFinalAnalysis()`
    *   `genericAICall()`
    *   `updateUIFromMultiPassAI()`
    *   `addEvidenceEntry()` (*External, review.js*)
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `constructAIPromptForStrengths(...)`
Builds the prompt for the "strengths" analysis pass.

*   **Called By**:
    *   `analyzeIndicatorWithAI()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `formatEvidenceGuideForPrompt()`

---

### `constructAIPromptForGaps(...)`
Builds the prompt for the "gaps" analysis pass.

*   **Called By**:
    *   `analyzeIndicatorWithAI()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `formatEvidenceGuideForPrompt()`

---

### `constructAIPromptForFinalAnalysis(...)`
Builds the prompt for the final "synthesis" analysis pass.

*   **Called By**:
    *   `analyzeIndicatorWithAI()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `formatEvidenceGuideForPrompt(guide)`
Formats the `evidenceGuide` object into a string for inclusion in AI prompts.

*   **Called By**:
    *   `constructAIPromptForStrengths()`
    *   `constructAIPromptForGaps()`
    *   `getChatHistoryForPrompt()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `updateUIFromMultiPassAI(...)`
Updates the indicator UI with the results from the three-pass analysis.

*   **Called By**:
    *   `analyzeIndicatorWithAI()`
*   **Calls To**:
    *   `linkifyPageNumbers()` (*External, utils.js*)
    *   `markdownToHTML()` (*External, utils.js*)
    *   `addEvidenceEntry()` (*External, review.js*)
    *   `findIndicatorConfig()` (*External, utils.js*)
    *   `updateIndicatorScore()` (*External, review.js*)
    *   `updateEvidenceData()` (*External, review.js*)
    *   `updateGatewayScores()` (*External, review.js*)

---

### `getChatHistoryForPrompt(...)`
Constructs the full context for a chat query, including system instructions, indicator context, and message history.

*   **Called By**:
    *   `setupChatQueryModal()` (*External, app.js*)
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `formatEvidenceGuideForPrompt()`

---

### `customQueryWithAI(...)`
Sends a custom user query to the AI model.

*   **Called By**:
    *   `setupChatQueryModal()` (*External, app.js*)
*   **Calls To**:
    *   `getAllLoadedPdfDataForRequest()`
    *   `genericAICall()`

# EdReporter/db.js

This file manages the IndexedDB database (`EdReportsReviewDB_NEW`) for storing reviews and associated PDF files.

---

### `initDB()`
Initializes the IndexedDB database, sets up the schema (`reviews` and `reviewPdfs` object stores), and handles version upgrades.

*   **Called By**:
    *   `initApp()` (*External, app.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)

---

### `savePdfsForReview(reviewId, pdfsToSave)`
Saves or updates the PDF files associated with a specific review.

*   **Called By**:
    *   `saveCurrentReview()` (*External, review.js*)
*   **Calls To**:
    *   *None (DB operations only)*

---

### `getPdfsForReview(reviewId)`
Retrieves all PDFs associated with a specific review ID.

*   **Called By**:
    *   `loadReviewData()` (*External, review.js*)
*   **Calls To**:
    *   *None (DB operations only)*

---

### `saveReview(reviewData)`
Saves or updates a review in the database.

*   **Called By**:
    *   `saveCurrentReview()` (*External, review.js*)
    *   `importReviewFromHTML()` (*External, review.js*)
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*)

---

### `deleteReview(id)`
Deletes a review and its associated PDFs from the database.

*   **Called By**:
    *   `setupLoadReviewModal()` (*External, app.js*)
*   **Calls To**:
    *   *None (DB operations only)*

---

### `getReview(id)`
Retrieves a single review from the database by its ID.

*   **Called By**:
    *   `importReviewFromHTML()` (*External, review.js*)
*   **Calls To**:
    *   *None (DB operations only)*

---

### `getAllReviews()`
Retrieves all reviews stored in the database.

*   **Called By**:
    *   `setupLoadReviewModal()` (*External, app.js*)
*   **Calls To**:
    *   *None (DB operations only)*

# EdReporter/utils.js

This file provides a collection of stateless, globally-accessible utility functions used for common tasks like data manipulation, DOM interaction, security, and calculations.

---

### `generateUniqueId()`
Generates a unique ID string.

*   **Called By**:
    *   `setupChatQueryModal()` (*External, app.js*)
*   **Calls To**:
    *   *None (built-in JS only)*

---

### `formatDate()`
Formats a date object or string into 'YYYY-MM-DD' format.

*   **Called By**:
    *   `setupLoadReviewModal()` (*External, app.js*)
    *   `createInitialReviewData()` (*External, review.js*)
    *   `createNewReview()` (*External, review.js*)
*   **Calls To**:
    *   *None (built-in JS only)*

---

### `calculateGatewayRating()`
Calculates a gateway's rating based on points and thresholds.

*   **Called By**:
    *   `updateGatewayScores()` (*External, review.js*)
*   **Calls To**:
    *   *None*

---

### `calculateFinalRating()`
Calculates the final review rating based on the ratings of individual gateways and the rubric's logic rules.

*   **Called By**:
    *   `updateGatewayScores()` (*External, review.js*)
*   **Calls To**:
    *   *None*

---

### `setupImageViewer()`
Creates and attaches a modal for viewing embedded images, along with global event listeners.

*   **Called By**:
    *   `initApp()` (*External, app.js*)
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `showNotification()`
Displays a temporary notification message to the user.

*   **Called By**:
    *   *Multiple functions across all files* (`app.js`, `ai-analyzer.js`, `db.js`, `export.js`, `review.js`)
*   **Calls To**:
    *   `dismissNotification()`

---

### `dismissNotification()`
Dismisses a given notification element with an animation.

*   **Called By**:
    *   `showNotification()`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `sanitizeHTML()`
Sanitizes an HTML string to prevent XSS attacks using the DOMPurify library.

*   **Called By**:
    *   *Multiple functions across all files* (`app.js`, `ai-analyzer.js`, `export.js`, `review.js`, `ui.js`, `utils.js`)
*   **Calls To**:
    *   `DOMPurify.sanitize()` (*External Library*)

---

### `markdownToHTML()`
Converts a Markdown string to HTML using the `marked` library.

*   **Called By**:
    *   `appendMessageToChat()`, `updateThinkingMessage()` (*External, app.js*)
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `marked.parse()` (*External Library*)

---

### `linkifyPageNumbers()`
Scans HTML and converts text references to page numbers into clickable `<a>` tags.

*   **Called By**:
    *   `appendMessageToChat()`, `updateThinkingMessage()` (*External, app.js*)
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `findPdfIdByName()` (*External, ai-analyzer.js*)
    *   `sanitizeHTML()`

---

### `findIndicatorConfig()`
Finds the configuration object for a single indicator by its ID within the rubric data.

*   **Called By**:
    *   `collectAndSetIndicatorChatContext()`, `setupAIAnalyzeButtons()` (*External, app.js*)
    *   `analyzeIndicatorWithAI()`, `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
    *   `importReviewFromHTML()`, `updateIndicatorScore()` (*External, review.js*)
*   **Calls To**:
    *   *None*

---

### `findIndicatorWithContext()`
Finds an indicator's configuration and its parent group's configuration.

*   **Called By**:
    *   `setupEvidenceGuideModal()` (*External, app.js*)
*   **Calls To**:
    *   *None*

---

### `findIndicatorsInGatewayConfig()`
Finds all indicator configuration objects within a single gateway.

*   **Called By**:
    *   `collectAndSetIndicatorChatContext()` (*External, app.js*)
    *   `importReviewFromHTML()`, `updateEvidenceData()`, `updateIndicatorScore()`, `updateGatewayScores()`, `createInitialReviewData()`, `loadReviewData()` (*External, review.js*)
*   **Calls To**:
    *   *None*

# EdReporter/export.js

This file handles exporting the current review data to a self-contained HTML file.

---

### `initializeExports()`
Initializes the export functionality by attaching an event listener to the main export button.

*   **Called By**:
    *   `initApp()` (*External, app.js*)
*   **Calls To**:
    *   `exportReview()`

---

### `exportReview(format)`
Orchestrates the export process, ensuring the latest data is captured before triggering generation and download.

*   **Called By**:
    *   `initializeExports()`
*   **Calls To**:
    *   `updateEvidenceData()` (*External, review.js*)
    *   `updateGatewayScores()` (*External, review.js*)
    *   `showNotification()` (*External, utils.js*)
    *   `collectReviewData()`
    *   `generateOutput()`

---

### `collectReviewData(...)`
Gathers all necessary data from the current review state and rubric configuration into a single structured object for export.

*   **Called By**:
    *   `exportReview()`
*   **Calls To**:
    *   *None*

---

### `generateOutput(format, data)`
Acts as a router for different export formats. Currently only supports 'html'.

*   **Called By**:
    *   `exportReview()`
*   **Calls To**:
    *   `generateHTML()`

---

### `generateHTML(data)`
Generates the complete HTML file as a Blob and triggers the download.

*   **Called By**:
    *   `generateOutput()`
*   **Calls To**:
    *   `buildHTMLContent()`
    *   `sanitizeFileName()`
    *   `downloadFile()`

---

### `buildHTMLContent(data)`
Constructs the full HTML string for the export file, including all data, CSS, and JavaScript.

*   **Called By**:
    *   `generateHTML()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)
    *   `buildIndicatorGroupHTML()`
    *   `buildIndicatorHTML()`

---

### `buildIndicatorHTML(indicatorData)`
Helper function that builds the HTML for a single indicator within the export file.

*   **Called By**:
    *   `buildHTMLContent()`
    *   `buildIndicatorGroupHTML()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*)

---

### `buildIndicatorGroupHTML(groupData)`
Helper function that builds the HTML for a group of indicators within the export file.

*   **Called By**:
    *   `buildHTMLContent()`
*   **Calls To**:
    *   `buildIndicatorHTML()`

---

### `downloadFile(blob, fileName)`
Triggers the file download using the FileSaver.js library (`saveAs`).

*   **Called By**:
    *   `generateHTML()`
*   **Calls To**:
    *   `saveAs()` (*External Library*)
    *   `showNotification()` (*External, utils.js*)

---

### `sanitizeFileName(name)`
Removes characters that are invalid for use in filenames.

*   **Called By**:
    *   `generateHTML()`
*   **Calls To**:
    *   *None*