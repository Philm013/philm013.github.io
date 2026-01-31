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
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

---

### `initApp()`

The main entry point of the application, called on `DOMContentLoaded`. It orchestrates the initialization of all other modules.

*   **Called By**:
    *   *Event Listener (`DOMContentLoaded`)*
*   **Calls To**:
    *   `initDB()` (*External, db.js*): `Promise<IDBDatabase>` - Resolves with the database instance.
    *   `initReview()` (*External, review.js*): `void` - Sets up generic review UI event listeners.
    *   `initializeExports()` (*External, export.js*): `void` - Sets up export button listeners.
    *   `initializeAI()` (*External, ai-analyzer.js*): `boolean` - Returns `true` if the AI SDK instance is found and valid.
    *   `updateAiFeatureUI()`: `void` - Updates the state of AI-related UI elements.
    *   `setupLoadReviewModal()`: `void`
    *   `setupPdfLoadModal()`: `void`
    *   `setupPdfViewerModal()`: `void`
    *   `setupChatQueryModal()`: `void`
    *   `setupSelectIndicatorForChatModal()`: `void`
    *   `setupAiInstructionModal()`: `void`
    *   `setupEvidenceGuideModal()`: `void`
    *   `setupImportReview()`: `void`
    *   `setupImageViewer()` (*External, utils.js*): `void` - Creates and injects the image viewer modal.
    *   `setupPageLinkNavigation()`: `void` - Sets up a global click listener for page links.
    *   `setupRubricSelector()`: `void`
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.
    *   `sanitizeHTML()` (*External, utils.js*): `string` - The sanitized HTML string.

---

### `setupRubricSelector()`

Populates the rubric `<select>` dropdown and attaches a `change` event listener to load the selected rubric.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `isReviewModified()` (*External, review.js*): `boolean` - Returns `true` if the review has unsaved changes.
    *   `loadRubric()`: `void`
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

---

### `loadRubric(rubricId)`

The core function for changing the review context. It updates the current rubric data, re-renders the entire UI, and sets up all rubric-specific event listeners.

*   **Called By**:
    *   `setupRubricSelector()`
    *   `loadReviewData()` (*External, review.js*)
    *   `importReviewFromHTML()` (*External, review.js*)
*   **Calls To**:
    *   `renderRubricUI()` (*External, ui.js*): `void` - Renders the main rubric structure into the DOM.
    *   `setupTabNavigation()` (*External, review.js*): `void`
    *   `setupIndicatorAccordions()` (*External, review.js*): `void`
    *   `setupScoringOptions()` (*External, review.js*): `void`
    *   `setupEvidenceSection()` (*External, review.js*): `void`
    *   `setupAIAnalyzeButtons()`: `void`
    *   `setupMetadataFormTracking()` (*External, review.js*): `void`
    *   `setupSummaryNotesTracking()` (*External, review.js*): `void`
    *   `createNewReview()` (*External, review.js*): `void` - Resets the `currentReview` object and UI for a new review.
    *   `populateAIModelSelectors()`: `void`
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

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
    *   `findIndicatorWithContext()` (*External, utils.js*): `Object` - Returns `{ indicator: object|null, parentGroup: object|null }`.
    *   `populateEvidenceGuideModal()`: `void`
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

---

### `populateEvidenceGuideModal(guideData)`

Fills the evidence guide modal with content from the provided `guideData` object.

*   **Called By**:
    *   `setupEvidenceGuideModal()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*): `string` - The sanitized HTML string.

---

### `setupAiInstructionModal()`

Initializes the modal and TinyMCE editor for users to enter custom instructions for an AI analysis.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `tinymce.get()` / `tinymce.init()` (*External Library*): `tinymce.Editor` - Returns the editor instance.
    *   `analyzeIndicatorWithAI()` (*External, ai-analyzer.js*): `Promise<void>` - Asynchronously performs AI analysis and updates the UI.

---

### `setupLoadReviewModal()`

Sets up the modal that lists all saved reviews from IndexedDB, allowing users to load or delete them.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `getAllReviews()` (*External, db.js*): `Promise<Array<Object>>` - Resolves with an array of all review objects.
    *   `isReviewModified()` (*External, review.js*): `boolean` - Returns `true` if the review has unsaved changes.
    *   `loadReviewData()` (*External, review.js*): `Promise<void>` - Asynchronously loads the selected review data into the application.
    *   `deleteReview()` (*External, db.js*): `Promise<boolean>` - Resolves `true` on successful deletion.
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.
    *   `formatDate()` (*External, utils.js*): `string` - The formatted 'YYYY-MM-DD' date string.
    *   `sanitizeHTML()` (*External, utils.js*): `string` - The sanitized HTML string.

---

### `setupPdfLoadModal()`

Sets up the modal for managing PDFs and the Gemini API Key. Handles adding PDFs from URL/file and saving/verifying the API key.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `renderPdfList()` (*External, ai-analyzer.js*): `void` - Renders the list of loaded PDFs in the UI.
    *   `initializeGeminiSDK()` (*External, from SDK script*): `Promise<boolean>` - Resolves `true` if the SDK initializes successfully.
    *   `initializeAI()` (*External, ai-analyzer.js*): `boolean` - Returns `true` if the AI SDK instance is valid.
    *   `updateAiFeatureUI()`: `void`
    *   `addPdfToList()` (*External, ai-analyzer.js*): `Promise<string>` - Resolves with the unique ID of the added PDF.
    *   `removePdf()` (*External, ai-analyzer.js*): `void` - Removes a PDF from the global list.
    *   `viewPdf()` (*External, ai-analyzer.js*): `void` - Displays a specific PDF in the viewer modal.
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

---

### `setupPdfViewerModal()`

Sets up the modal containing the `<iframe>` for displaying PDF documents.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `URL.revokeObjectURL()` (*External, Browser API*): `void` - Releases memory used by a Blob URL.

---

### `setupSelectIndicatorForChatModal()`

Sets up the modal that allows users to select which rubric indicators to include as context in an AI chat query.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `collectAndSetIndicatorChatContext()`: `void`

---

### `openSelectIndicatorForChatModal()`

Opens and populates the indicator selection modal.

*   **Called By**:
    *   `setupChatQueryModal()`
*   **Returns**: `void`
*   **Calls To**:
    *   `populateIndicatorForChatList()`: `void`
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

---

### `populateIndicatorForChatList()`

Renders the list of indicators with checkboxes in the "Select Indicator for Chat" modal.

*   **Called By**:
    *   `openSelectIndicatorForChatModal()`
*   **Returns**: `void`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*): `string` - The sanitized HTML string.

---

### `collectAndSetIndicatorChatContext()`

Gathers data from the selected indicators (title, criteria, evidence) to be used as context for the next AI chat query.

*   **Called By**:
    *   `setupSelectIndicatorForChatModal()`
*   **Calls To**:
    *   `updateEvidenceData()` (*External, review.js*): `void` - Gathers evidence from TinyMCE editors into the `currentReview` object.
    *   `findIndicatorConfig()` (*External, utils.js*): `Object | null` - The configuration object for the specified indicator.
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*): `Array<Object>` - An array of indicator configuration objects.
    *   `renderSelectedIndicatorContextInChatDisplay()`: `void`

---

### `renderSelectedIndicatorContextInChatDisplay()`

Updates the UI in the main chat modal to show which indicators are currently providing context.

*   **Called By**:
    *   `collectAndSetIndicatorChatContext()`
    *   `clearIndicatorChatContext()`
    *   `setupChatQueryModal()`
*   **Calls To**:
    *   `sanitizeHTML()` (*External, utils.js*): `string` - The sanitized HTML string.
    *   `clearIndicatorChatContext()`: `void` - Attaches an event listener to the clear button.

---

### `clearIndicatorChatContext()`

Clears the selected indicator context array and updates the chat modal UI.

*   **Called By**:
    *   `renderSelectedIndicatorContextInChatDisplay()` (from event listener)
*   **Calls To**:
    *   `renderSelectedIndicatorContextInChatDisplay()`: `void`
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

---

### `setupChatQueryModal()`

Sets up the floating chat button and the main chat modal, including event handlers for sending messages, clearing history, and adding indicator context.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `setChatLogPlaceholder()`: `void`
    *   `renderSelectedIndicatorContextInChatDisplay()`: `void`
    *   `openSelectIndicatorForChatModal()`: `void`
    *   `appendMessageToChat()`: `void`
    *   `appendThinkingMessage()`: `void`
    *   `generateUniqueId()` (*External, utils.js*): `string` - A unique ID string.
    *   `getChatHistoryForPrompt()` (*External, ai-analyzer.js*): `string` - The formatted prompt string including history and context.
    *   `customQueryWithAI()` (*External, ai-analyzer.js*): `Promise<string>` - Resolves with the AI's text response.
    *   `updateThinkingMessage()`: `void`
    *   `clearChatHistoryData()` (*External, ai-analyzer.js*): `void` - Clears the internal chat history array.
    *   `showNotification()` (*External, utils.js*): `void` - Displays a UI notification.

---

### `setupAIAnalyzeButtons()`

Sets up a single delegated event listener on the main content area to handle clicks on any "AI Analyze" button.

*   **Called By**:
    *   `loadRubric()`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*): `void`
    *   `findIndicatorConfig()` (*External, utils.js*): `Object | null` - The configuration object for the specified indicator.
    *   `analyzeIndicatorWithAI()` (*External, ai-analyzer.js*): `Promise<void>` - Asynchronously performs AI analysis and updates the UI.
    *   `tinymce.get()` (*External Library*): `tinymce.Editor` - Returns the editor instance.
    *   `sanitizeHTML()` (*External, utils.js*): `string` - The sanitized HTML string.

---

### `handlePageLinkClick(event)`

Handles clicks on `.page-link` elements, extracting the page number and PDF ID to open the PDF viewer to the correct location.

*   **Called By**:
    *   `setupPageLinkNavigation()`
    *   `setupPageLinkNavigationForElement()`
*   **Returns**: `void`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*): `void`
    *   `viewPdf()` (*External, ai-analyzer.js*): `void` - Displays a specific PDF in the viewer modal.

---

### `setupPageLinkNavigationForElement(parentElement)`

Attaches a delegated click listener to a specific parent element (like a TinyMCE body) to handle clicks on `.page-link` elements within it.

*   **Called By**:
    *   `initializeSingleTinyMCE()` (*External, review.js*)
*   **Returns**: `void`
*   **Calls To**:
    *   `handlePageLinkClick()`: `void`

---

### `setupPageLinkNavigation()`

Sets up a global, delegated click listener on the `document.body` for any `.page-link` elements not inside a TinyMCE editor.

*   **Called By**:
    *   `initApp()`
*   **Returns**: `void`
*   **Calls To**:
    *   `handlePageLinkClick()`: `void`

---

### `setupImportReview()`

Sets up the "Import HTML" button, which triggers a hidden file input to allow users to load an exported review file.

*   **Called By**:
    *   `initApp()`
*   **Calls To**:
    *   `importReviewFromHTML()` (*External, review.js*): `Promise<Object>` - Resolves with the imported review data object.
    *   `showNotification()` (*External, utils.js*): `void`

---

---

### `setChatLogPlaceholder(chatLogElement)`

Sets a placeholder message in the chat log if it's empty.

*   **Returns**: `void`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `appendMessageToChat(role, text)`

Appends a message to the chat log UI and adds it to the internal chat history.

*   **Returns**: `void`
*   **Calls To**:
    *   `markdownToHTML()` (*External, utils.js*): `string`
    *   `sanitizeHTML()` (*External, utils.js*): `string`
    *   `linkifyPageNumbers()` (*External, utils.js*): `string`
    *   `addMessageToHistory()` (*External, ai-analyzer.js*): `void`

---

### `appendThinkingMessage(thinkingId)`

Appends a "Thinking..." message to the chat log UI while waiting for an AI response.

*   **Returns**: `void`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `updateThinkingMessage(thinkingId, messageText)`

Updates a "Thinking..." message in the chat log with the actual AI response or an error.

*   **Returns**: `void`
*   **Calls To**:
    *   `markdownToHTML()` (*External, utils.js*): `string`
    *   `sanitizeHTML()` (*External, utils.js*): `string`
    *   `linkifyPageNumbers()` (*External, utils.js*): `string`
    *   `addMessageToHistory()` (*External, ai-analyzer.js*): `void`

# EdReporter/review.js

This file manages the `currentReview` data structure, UI interactions related to review content (scoring, evidence), saving/loading, and TinyMCE editor instances.

---

### `initReview()`

Initializes generic review UI event listeners that are not dependent on a specific rubric's structure.

*   **Called By**:
    *   `initApp()` (*External, app.js*)
*   **Calls To**:
    *   `setupTabNavigation()`: `void`
    *   `setupIndicatorAccordions()`: `void`
    *   `setupScoringOptions()`: `void`
    *   `setupEvidenceSection()`: `void`
    *   `setupCollapsibleMetadata()`: `void`
    *   `setupMetadataFormTracking()`: `void`
    *   `setupSummaryNotesTracking()`: `void`
    *   `saveCurrentReview()`: `Promise<void>`
    *   `isReviewModified()`: `boolean`
    *   `createNewReview()`: `void`
    *   `showNotification()` (*External, utils.js*): `void`

---

### `setupSummaryNotesTracking()`

Sets up an event listener for the summary notes textarea to update `currentReview.summary.notes`.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Returns**: `void`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `setupTabNavigation()`

Sets up tab navigation within the review content area.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Returns**: `void`
*   **Calls To**:
    *   `updateGatewayScores()`: `void`

---

### `setupCollapsibleMetadata()`

Sets up the collapsible functionality for the review metadata section.

*   **Called By**:
    *   `initReview()`
*   **Returns**: `void`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `importReviewFromHTML(file)`

Imports a review from an HTML file, parses it, and loads the data into the application.

*   **Called By**:
    *   `setupImportReview()` (*External, app.js*)
*   **Returns**: `Promise<Object>` - A promise that resolves with the imported and saved `currentReview` object.
*   **Calls To**:
    *   `loadRubric()` (*External, app.js*): `void`
    *   `findIndicatorConfig()` (*External, utils.js*): `Object | null`
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*): `Array<Object>`
    *   `sanitizeHTML()` (*External, utils.js*): `string`
    *   `loadReviewData()`: `Promise<void>`
    *   `getReview()` (*External, db.js*): `Promise<Object | null>`
    *   `saveReview()` (*External, db.js*): `Promise<number>` - Resolves with the ID of the saved review.
    *   `showNotification()` (*External, utils.js*): `void`

---

### `setupIndicatorAccordions()`

Sets up accordion functionality for indicators and indicator groups.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Returns**: `void`
*   **Calls To**:
    *   `tinymce.get().execCommand()` (*External Library*): `any` - Returns the result of the command execution.

---

### `setupScoringOptions()`

Sets up event listeners for scoring radio buttons using delegation.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Returns**: `void`
*   **Calls To**:
    *   `updateIndicatorScore()`: `void`

---

### `setupEvidenceSection()`

Sets up event listeners for adding and removing evidence entries.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Returns**: `void`
*   **Calls To**:
    *   `addEvidenceEntry()`: `HTMLElement | null` - The newly created evidence entry element.
    *   `tinymce.get().remove()` (*External Library*): `void`
    *   `updateEvidenceData()`: `void`

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
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*): `Array<Object>`
    *   `tinymce.get().getContent()` (*External Library*): `string` - The HTML content of the editor.

---

### `updateIndicatorScore(indicatorId, score)`

Updates the score for a specific indicator in `currentReview` and recalculates gateway scores.

*   **Called By**:
    *   `setupScoringOptions()`
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Calls To**:
    *   `findIndicatorConfig()` (*External, utils.js*): `Object | null`
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*): `Array<Object>`
    *   `updateGatewayScores()`: `void`

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
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*): `Array<Object>`
    *   `calculateGatewayRating()` (*External, utils.js*): `string` - The calculated rating string (e.g., 'Meets Expectations').
    *   `calculateFinalRating()` (*External, utils.js*): `string` - The calculated final rating string.

---

### `setupMetadataFormTracking()`

Sets up event listeners for metadata form inputs.

*   **Called By**:
    *   `initReview()`
    *   `loadRubric()` (*External, app.js*)
*   **Returns**: `void`
*   **Calls To**:
    *   *None (DOM manipulation only)*

---

### `createInitialReviewData(rubricId)`

Creates an initial, empty data structure for a new review.

*   **Called By**:
    *   `createNewReview()`
*   **Returns**: `Object | null` - The initial review data object, or `null` if the rubric is not found.
*   **Calls To**:
    *   `formatDate()` (*External, utils.js*): `string`
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*): `Array<Object>`

---

### `initializeSingleTinyMCE(editorId, initialContent)`

Initializes a single TinyMCE editor instance with specific configurations.

*   **Called By**:
    *   `addEvidenceEntry()`
*   **Returns**: `void`
*   **Calls To**:
    *   `tinymce.get().remove()` / `tinymce.init()` (*External Library*): `void` / `Promise<Array<Editor>>`
    *   `updateEvidenceData()`: `void`
    *   `setupPageLinkNavigationForElement()` (*External, app.js*): `void`

---

### `addEvidenceEntry(evidenceSectionElement, initialHtmlContent, ...)`

Adds a new evidence entry (including a TinyMCE editor) to the specified evidence section.

*   **Called By**:
    *   `setupEvidenceSection()`
    *   `createNewReview()`
    *   `loadReviewData()`
    *   `analyzeIndicatorWithAI()` (*External, ai-analyzer.js*)
    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)
*   **Returns**: `HTMLElement | null` - The new evidence entry element, or `null` if the section element is not found.
*   **Calls To**:
    *   `initializeSingleTinyMCE()`: `void`
    *   `updateEvidenceData()`: `void`

---

### `saveCurrentReview()`

Saves the current review data and its associated PDFs to the database.

*   **Called By**:
    *   `initReview()` (via event listener)
*   **Returns**: `Promise<void>`
*   **Calls To**:
    *   `updateEvidenceData()`: `void`
    *   `updateGatewayScores()`: `void`
    *   `showNotification()` (*External, utils.js*): `void`
    *   `saveReview()` (*External, db.js*): `Promise<number>` - Resolves with the ID of the saved review.
    *   `savePdfsForReview()` (*External, db.js*): `Promise<void>`

---

### `createNewReview(rubricId, ...)`

Initializes a new, empty review based on the specified rubric, resetting the UI and data model.

*   **Called By**:
    *   `initReview()` (via event listener)
    *   `loadRubric()` (*External, app.js*)
    *   `loadReviewData()`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*): `void`
    *   `createInitialReviewData()`: `Object | null`
    *   `setActivePdf()` (*External, ai-analyzer.js*): `void`
    *   `renderPdfList()` (*External, ai-analyzer.js*): `void`
    *   `formatDate()` (*External, utils.js*): `string`
    *   `tinymce.get().remove()` (*External Library*): `void`
    *   `addEvidenceEntry()`: `HTMLElement | null`
    *   `updateGatewayScores()`: `void`

---

### `loadReviewData(reviewData)`

Loads review data into the application, switching rubrics if necessary and populating all UI fields.

*   **Called By**:
    *   `importReviewFromHTML()`
    *   `setupLoadReviewModal()` (*External, app.js*)
*   **Returns**: `Promise<void>`
*   **Calls To**:
    *   `showNotification()` (*External, utils.js*): `void`
    *   `loadRubric()` (*External, app.js*): `void`
    *   `createNewReview()`: `void`
    *   `getPdfsForReview()` (*External, db.js*): `Promise<Array<Object>>` - Resolves with an array of PDF objects.
    *   `setActivePdf()` (*External, ai-analyzer.js*): `void`
    *   `renderPdfList()` (*External, ai-analyzer.js*): `void`
    *   `findIndicatorsInGatewayConfig()` (*External, utils.js*): `Array<Object>`
    *   `tinymce.get().remove()` (*External Library*): `void`
    *   `addEvidenceEntry()`: `HTMLElement | null`
    *   `updateGatewayScores()`: `void`
    *   `sanitizeHTML()` (*External, utils.js*): `string`

---

### `isReviewModified()`

Checks if the current review has been modified (a simplified check for unsaved changes).

*   **Called By**:
    *   `initReview()`
    *   `setupLoadReviewModal()` (*External, app.js*)
    *   `setupRubricSelector()` (*External, app.js*)
*   **Returns**: `boolean` - `true` if a new review has been modified, otherwise `false`.
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

    *   `sanitizeHTML()` (*External, utils.js*): `string`

    *   `renderIndicatorGroup()`: `string` - The HTML string for the indicator group.

    *   `renderIndicator()`: `string` - The HTML string for the single indicator.



---



### `renderIndicator(indicatorData)`



Renders the HTML for a single, non-grouped indicator, including its header, scoring options, and evidence sections.



*   **Called By**:

    *   `renderRubricUI()`

    *   `renderIndicatorGroup()`

*   **Returns**: `string` - The HTML string for the indicator.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`



---



### `renderIndicatorGroup(groupData)`



Renders the HTML for a collapsible group of indicators.



*   **Called By**:

    *   `renderRubricUI()`

*   **Returns**: `string` - The HTML string for the indicator group.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`

    *   `renderIndicator()`: `string`



# EdReporter/ai-analyzer.js



This file manages all AI-related functionality: PDF loading/processing, communication with the Google AI API, indicator analysis, and custom chat queries.



---



### `initializeAI()`

Initializes the AI service by assigning the global `window.genAiInstance` to a local variable.



*   **Called By**:

    *   `initApp()` (*External, app.js*)

    *   `setupPdfLoadModal()` (*External, app.js*)

*   **Returns**: `boolean` - `true` if the AI instance is found and valid, `false` otherwise.

*   **Calls To**:

    *   `showNotification()` (*External, utils.js*): `void`



---



### `clearChatHistoryData()`



Clears the internal `chatHistory` array.







*   **Called By**:



    *   `setupChatQueryModal()` (*External, app.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   *None*



---



### `addMessageToHistory(role, text)`



Adds a message to the internal `chatHistory` array and enforces `maxChatHistoryLength`.







*   **Called By**:



    *   `appendMessageToChat()` (*External, app.js*)



    *   `updateThinkingMessage()` (*External, app.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   *None*



---



### `findPdfIdByName(nameString)`

Finds a loaded PDF's ID by its name or a "pdf X" reference.



*   **Called By**:

    *   `linkifyPageNumbers()` (*External, utils.js*)

*   **Returns**: `string | null` - The ID of the found PDF, or `null`.

*   **Calls To**:

    *   *None*



---



### `addPdfToList(source, name)`

Converts a PDF file or URL to Base64 and adds it to the `window.loadedPdfs` list.



*   **Called By**:

    *   `setupPdfLoadModal()` (*External, app.js*)

*   **Returns**: `Promise<string>` - Resolves with the unique ID of the added PDF.

*   **Calls To**:

    *   `showNotification()` (*External, utils.js*): `void`

    *   `arrayBufferToBase64()`: `string`

    *   `setActivePdf()`: `void`



---



### `removePdf(pdfId)`



Removes a PDF from the `window.loadedPdfs` list.







*   **Called By**:



    *   `setupPdfLoadModal()` (*External, app.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   `setActivePdf()`: `void`



    *   `showNotification()` (*External, utils.js*): `void`



    *   `updateAiFeatureUI()` (*External, app.js*): `void`



---



### `setActivePdf(pdfId)`



Sets the `window.activePdfId`. This is mainly for UI state.







*   **Called By**:



    *   `addPdfToList()`



    *   `removePdf()`



    *   `createNewReview()` (*External, review.js*)



    *   `loadReviewData()` (*External, review.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   *None*



---



### `renderPdfList()`



Renders the list of loaded PDFs in the management modal.







*   **Called By**:



    *   `setupPdfLoadModal()` (*External, app.js*)



    *   `createNewReview()` (*External, review.js*)



    *   `loadReviewData()` (*External, review.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   `sanitizeHTML()` (*External, utils.js*): `string`



---



### `base64ToBlobUrl(base64Data, contentType)`

Converts a Base64 string to a Blob URL for viewing.



*   **Called By**:

    *   `viewPdf()`

*   **Returns**: `string | null` - The Blob URL, or `null` on failure.

*   **Calls To**:

    *   `showNotification()` (*External, utils.js*): `void`



---



### `viewPdf(pdfId, pageNumber)`



Displays a PDF in the viewer modal.







*   **Called By**:



    *   `setupPdfLoadModal()` (*External, app.js*)



    *   `handlePageLinkClick()` (*External, app.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   `showNotification()` (*External, utils.js*): `void`



    *   `base64ToBlobUrl()`: `string | null`



    *   `sanitizeHTML()` (*External, utils.js*): `string`



---



### `getAllLoadedPdfDataForRequest()`

Prepares all loaded PDFs into the format required for an AI API request.



*   **Called By**:

    *   `analyzeIndicatorWithAI()`

    *   `customQueryWithAI()`

*   **Returns**: `Array<Object>` - An array of objects formatted for the AI API, or an empty array.

*   **Calls To**:

    *   *None*



---



### `arrayBufferToBase64(buffer)`

Converts an ArrayBuffer to a Base64 string.



*   **Called By**:

    *   `addPdfToList()`

*   **Returns**: `string` - The Base64 encoded string.

*   **Calls To**:

    *   `window.btoa()` (*External, Browser API*): `string`



---



### `genericAICall(...)`

A generic helper to make a `generateContent` call to the Google AI API, with timeout and error handling.



*   **Called By**:

    *   `analyzeIndicatorWithAI()`

    *   `customQueryWithAI()`

*   **Returns**: `Promise<string>` - A promise that resolves with the AI's text response.

*   **Calls To**:

    *   `genAI.getGenerativeModel()` / `genAI.models.generateContent()` (*External, Google AI SDK*): `Promise<Object>` - The response object from the AI service.



---



### `analyzeIndicatorWithAI(...)`

Orchestrates the three-pass AI analysis for a given indicator.



*   **Called By**:

    *   `setupAiInstructionModal()` (*External, app.js*)

    *   `setupAIAnalyzeButtons()` (*External, app.js*)

*   **Returns**: `Promise<void>`

*   **Calls To**:

    *   `showNotification()` (*External, utils.js*): `void`

    *   `findIndicatorConfig()` (*External, utils.js*): `Object | null`

    *   `getAllLoadedPdfDataForRequest()`: `Array<Object>`

    *   `constructAIPromptForStrengths()`: `string`

    *   `constructAIPromptForGaps()`: `string`

    *   `constructAIPromptForFinalAnalysis()`: `string`

    *   `genericAICall()`: `Promise<string>`

    *   `updateUIFromMultiPassAI()`: `void`

    *   `addEvidenceEntry()` (*External, review.js*): `HTMLElement | null`

    *   `sanitizeHTML()` (*External, utils.js*): `string`



---



### `constructAIPromptForStrengths(...)`

Builds the prompt for the "strengths" analysis pass.



*   **Called By**:

    *   `analyzeIndicatorWithAI()`

*   **Returns**: `string` - The constructed prompt.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`

    *   `formatEvidenceGuideForPrompt()`: `string`



---



### `constructAIPromptForGaps(...)`

Builds the prompt for the "gaps" analysis pass.



*   **Called By**:

    *   `analyzeIndicatorWithAI()`

*   **Returns**: `string` - The constructed prompt.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`

    *   `formatEvidenceGuideForPrompt()`: `string`



---



### `constructAIPromptForFinalAnalysis(...)`

Builds the prompt for the final "synthesis" analysis pass.



*   **Called By**:

    *   `analyzeIndicatorWithAI()`

*   **Returns**: `string` - The constructed prompt.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`



---



### `formatEvidenceGuideForPrompt(guide)`

Formats the `evidenceGuide` object into a string for inclusion in AI prompts.



*   **Called By**:

    *   `constructAIPromptForStrengths()`

    *   `constructAIPromptForGaps()`

    *   `getChatHistoryForPrompt()`

*   **Returns**: `string` - The formatted guide text, or an empty string.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`



---



### `updateUIFromMultiPassAI(...)`



Updates the indicator UI with the results from the three-pass analysis.







*   **Called By**:



    *   `analyzeIndicatorWithAI()`



*   **Returns**: `void`



*   **Calls To**:



    *   `linkifyPageNumbers()` (*External, utils.js*): `string`



    *   `markdownToHTML()` (*External, utils.js*): `string`



    *   `addEvidenceEntry()` (*External, review.js*): `HTMLElement | null`



    *   `findIndicatorConfig()` (*External, utils.js*): `Object | null`



    *   `updateIndicatorScore()` (*External, review.js*): `void`



    *   `updateEvidenceData()` (*External, review.js*): `void`



    *   `updateGatewayScores()` (*External, review.js*): `void`



---



### `getChatHistoryForPrompt(...)`

Constructs the full context for a chat query, including system instructions, indicator context, and message history.



*   **Called By**:

    *   `setupChatQueryModal()` (*External, app.js*)

*   **Returns**: `string` - The full prompt string for the AI.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`

    *   `formatEvidenceGuideForPrompt()`: `string`



---



### `customQueryWithAI(...)`

Sends a custom user query to the AI model.



*   **Called By**:

    *   `setupChatQueryModal()` (*External, app.js*)

*   **Returns**: `Promise<string>` - Resolves with the AI's text response.

*   **Calls To**:

    *   `getAllLoadedPdfDataForRequest()`: `Array<Object>`

    *   `genericAICall()`: `Promise<string>`



# EdReporter/db.js



This file manages the IndexedDB database (`EdReportsReviewDB_NEW`) for storing reviews and associated PDF files.



---



### `initDB()`

Initializes the IndexedDB database, sets up the schema (`reviews` and `reviewPdfs` object stores), and handles version upgrades.



*   **Called By**:

    *   `initApp()` (*External, app.js*)

*   **Returns**: `Promise<IDBDatabase>` - Resolves with the database instance.

*   **Calls To**:

    *   `showNotification()` (*External, utils.js*): `void`



---



### `savePdfsForReview(reviewId, pdfsToSave)`

Saves or updates the PDF files associated with a specific review.



*   **Called By**:

    *   `saveCurrentReview()` (*External, review.js*)

*   **Returns**: `Promise<void>` - Resolves when the transaction is complete.

*   **Calls To**:

    *   *None (DB operations only)*



---



### `getPdfsForReview(reviewId)`

Retrieves all PDFs associated with a specific review ID.



*   **Called By**:

    *   `loadReviewData()` (*External, review.js*)

*   **Returns**: `Promise<Array<Object>>` - Resolves with an array of PDF objects.

*   **Calls To**:

    *   *None (DB operations only)*



---



### `saveReview(reviewData)`

Saves or updates a review in the database.



*   **Called By**:

    *   `saveCurrentReview()` (*External, review.js*)

    *   `importReviewFromHTML()` (*External, review.js*)

*   **Returns**: `Promise<number>` - Resolves with the ID of the saved/updated review.

*   **Calls To**:

    *   `showNotification()` (*External, utils.js*): `void`



---



### `deleteReview(id)`

Deletes a review and its associated PDFs from the database.



*   **Called By**:

    *   `setupLoadReviewModal()` (*External, app.js*)

*   **Returns**: `Promise<boolean>` - Resolves `true` on successful deletion.

*   **Calls To**:

    *   *None (DB operations only)*



---



### `getReview(id)`

Retrieves a single review from the database by its ID.



*   **Called By**:

    *   `importReviewFromHTML()` (*External, review.js*)

*   **Returns**: `Promise<Object | null>` - Resolves with the review object or `null` if not found.

*   **Calls To**:

    *   *None (DB operations only)*



---



### `getAllReviews()`

Retrieves all reviews stored in the database.



*   **Called By**:

    *   `setupLoadReviewModal()` (*External, app.js*)

*   **Returns**: `Promise<Array<Object>>` - Resolves with an array of all review objects.

*   **Calls To**:

    *   *None (DB operations only)*



# EdReporter/utils.js



This file provides a collection of stateless, globally-accessible utility functions used for common tasks like data manipulation, DOM interaction, security, and calculations.



---



### `generateUniqueId()`

Generates a unique ID string.



*   **Called By**:

    *   `setupChatQueryModal()` (*External, app.js*)

*   **Returns**: `string` - A unique ID.

*   **Calls To**:

    *   *None (built-in JS only)*



---



### `formatDate()`

Formats a date object or string into 'YYYY-MM-DD' format.



*   **Called By**:

    *   `setupLoadReviewModal()` (*External, app.js*)

    *   `createInitialReviewData()` (*External, review.js*)

    *   `createNewReview()` (*External, review.js*)

*   **Returns**: `string` - The formatted date string (e.g., '2024-01-15').

*   **Calls To**:

    *   *None (built-in JS only)*



---



### `calculateGatewayRating()`

Calculates a gateway's rating based on points and thresholds.



*   **Called By**:

    *   `updateGatewayScores()` (*External, review.js*)

*   **Returns**: `string` - The calculated rating string (e.g., 'Meets Expectations').

*   **Calls To**:

    *   *None*



---



### `calculateFinalRating()`

Calculates the final review rating based on the ratings of individual gateways and the rubric's logic rules.



*   **Called By**:

    *   `updateGatewayScores()` (*External, review.js*)

*   **Returns**: `string` - The calculated final rating string.

*   **Calls To**:

    *   *None*



---



### `setupImageViewer()`



Creates and attaches a modal for viewing embedded images, along with global event listeners.







*   **Called By**:



    *   `initApp()` (*External, app.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   *None (DOM manipulation only)*



---



### `showNotification()`

Displays a temporary notification message to the user.



*   **Called By**:

    *   *Multiple functions across all files* (`app.js`, `ai-analyzer.js`, `db.js`, `export.js`, `review.js`)

*   **Calls To**:

    *   `dismissNotification()`: `void`



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

*   **Returns**: `string` - The sanitized HTML string.

*   **Calls To**:

    *   `DOMPurify.sanitize()` (*External Library*): `string`



---



### `markdownToHTML()`

Converts a Markdown string to HTML using the `marked` library.



*   **Called By**:

    *   `appendMessageToChat()`, `updateThinkingMessage()` (*External, app.js*)

    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)

*   **Returns**: `string` - The converted HTML string.

*   **Calls To**:

    *   `marked.parse()` (*External Library*): `string`



---



### `linkifyPageNumbers()`

Scans HTML and converts text references to page numbers into clickable `<a>` tags.



*   **Called By**:

    *   `appendMessageToChat()`, `updateThinkingMessage()` (*External, app.js*)

    *   `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)

*   **Returns**: `string` - The HTML string with page numbers converted to interactive links.

*   **Calls To**:

    *   `findPdfIdByName()` (*External, ai-analyzer.js*): `string | null`

    *   `sanitizeHTML()`: `string`



---



### `findIndicatorConfig()`

Finds the configuration object for a single indicator by its ID within the rubric data.



*   **Called By**:

    *   `collectAndSetIndicatorChatContext()`, `setupAIAnalyzeButtons()` (*External, app.js*)

    *   `analyzeIndicatorWithAI()`, `updateUIFromMultiPassAI()` (*External, ai-analyzer.js*)

    *   `importReviewFromHTML()`, `updateIndicatorScore()` (*External, review.js*)

*   **Returns**: `Object | null` - The indicator configuration object, or `null` if not found.

*   **Calls To**:

    *   *None*



---



### `findIndicatorWithContext()`

Finds an indicator's configuration and its parent group's configuration.



*   **Called By**:

    *   `setupEvidenceGuideModal()` (*External, app.js*)

*   **Returns**: `Object` - `{ indicator: Object | null, parentGroup: Object | null }`.

*   **Calls To**:

    *   *None*



---



### `findIndicatorsInGatewayConfig()`

Finds all indicator configuration objects within a single gateway.



*   **Called By**:

    *   `collectAndSetIndicatorChatContext()` (*External, app.js*)

    *   `importReviewFromHTML()`, `updateEvidenceData()`, `updateIndicatorScore()`, `updateGatewayScores()`, `createInitialReviewData()`, `loadReviewData()` (*External, review.js*)

*   **Returns**: `Array<Object>` - An array of indicator configuration objects.

*   **Calls To**:

    *   *None*



# EdReporter/export.js



This file handles exporting the current review data to a self-contained HTML file.



---



### `initializeExports()`



Initializes the export functionality by attaching an event listener to the main export button.







*   **Called By**:



    *   `initApp()` (*External, app.js*)



*   **Returns**: `void`



*   **Calls To**:



    *   `exportReview()`: `Promise<void>`



---



### `exportReview(format)`

Orchestrates the export process, ensuring the latest data is captured before triggering generation and download.



*   **Called By**:

    *   `initializeExports()`

*   **Returns**: `Promise<void>`

*   **Calls To**:

    *   `updateEvidenceData()` (*External, review.js*): `void`

    *   `updateGatewayScores()` (*External, review.js*): `void`

    *   `showNotification()` (*External, utils.js*): `void`

    *   `collectReviewData()`: `Object` - The structured object prepared for export.

    *   `generateOutput()`: `Promise<boolean|undefined>`



---



### `collectReviewData(...)`

Gathers all necessary data from the current review state and rubric configuration into a single structured object for export.



*   **Called By**:

    *   `exportReview()`

*   **Returns**: `Object` - A structured object containing all data prepared for export.

*   **Calls To**:

    *   *None*



---



### `generateOutput(format, data)`

Acts as a router for different export formats. Currently only supports 'html'.



*   **Called By**:

    *   `exportReview()`

*   **Returns**: `Promise<boolean|undefined>` - Resolves with the result from the specific generation function (e.g., `generateHTML`).

*   **Calls To**:

    *   `generateHTML()`: `boolean`



---



### `generateHTML(data)`

Generates the complete HTML file as a Blob and triggers the download.



*   **Called By**:

    *   `generateOutput()`

*   **Returns**: `boolean` - `true` if download was initiated, `false` otherwise.

*   **Calls To**:

    *   `buildHTMLContent()`: `string`

    *   `sanitizeFileName()`: `string`

    *   `downloadFile()`: `boolean`



---



### `buildHTMLContent(data)`

Constructs the full HTML string for the export file, including all data, CSS, and JavaScript.



*   **Called By**:

    *   `generateHTML()`

*   **Returns**: `string` - The complete HTML file content.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`

    *   `buildIndicatorGroupHTML()`: `string`

    *   `buildIndicatorHTML()`: `string`



---



### `buildIndicatorHTML(indicatorData)`

Helper function that builds the HTML for a single indicator within the export file.



*   **Called By**:

    *   `buildHTMLContent()`

    *   `buildIndicatorGroupHTML()`

*   **Returns**: `string` - The HTML string for the indicator.

*   **Calls To**:

    *   `sanitizeHTML()` (*External, utils.js*): `string`



---



### `buildIndicatorGroupHTML(groupData)`

Helper function that builds the HTML for a group of indicators within the export file.



*   **Called By**:

    *   `buildHTMLContent()`

*   **Calls To**:

    *   `buildIndicatorHTML()`: `string`



---



### `downloadFile(blob, fileName)`

Triggers the file download using the FileSaver.js library (`saveAs`).



*   **Called By**:

    *   `generateHTML()`

*   **Returns**: `boolean` - `true` if `saveAs` was called, `false` on error.

*   **Calls To**:

    *   `saveAs()` (*External Library*): `void`

    *   `showNotification()` (*External, utils.js*): `void`



---



### `sanitizeFileName(name)`

Removes characters that are invalid for use in filenames.



*   **Called By**:

    *   `generateHTML()`

*   **Returns**: `string` - A sanitized filename.

*   **Calls To**:

    *   *None*
