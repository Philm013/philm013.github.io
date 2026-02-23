# InquiryOS Modularization & Documentation Specification

This document details the extracted functions and their corresponding documentation for each module in the InquiryOS system.

## 1. Core Layer (`js/core/`)

### `state.js`
- **`App`**: Global application state object managing user data, class settings, and work state.
- **`getInitialWorkState()`**: Generates a fresh, empty work state object for a student.
- **`ngssData`**: Data store for NGSS Standards elements and performance expectations.

### `storage.js`
- **`initDB()`**: Initializes the IndexedDB database and creates object stores (`sessions`, `library`, `users`, `lessons`).
- **`isDBReady()`**: Checks if the database is initialized and ready for operations.
- **`dbPut(storeName, data)`**: Adds or updates an item in the specified object store.
- **`dbGet(storeName, key)`**: Retrieves an item from the specified object store by its key.
- **`dbGetAll(storeName)`**: Retrieves all items from the specified object store.
- **`dbDelete(storeName, key)`**: Deletes an item from the specified object store by its key.
- **`dbGetByIndex(storeName, indexName, value)`**: Retrieves items from an object store using a specified index.

### `sync.js`
- **`saveToStorage()`**: Saves current application state (settings, shared data, student work) to IndexedDB.
- **`loadFromStorage()`**: Loads application state from IndexedDB based on class code and current role.
- **`startSync()`**: Starts the polling interval for data synchronization.
- **`syncWithStorage()`**: Synchronizes local state with remote data; triggers UI updates if changes are detected.
- **`saveAndBroadcast(path, value)`**: Updates a specific data path and triggers a save/broadcast to other participants.
- **`registerUser()`**: Registers the current user in the class participant list and starts a heartbeat interval.
- **`updateConnectedUsers()`**: Queries for active users in the current class and updates the UI count.

### `ngss.js`
- **`loadNGSSData()`**: Fetches and processes NGSS 3D elements and Performance Expectations from external JSON.
- **`renderNGSSBrowser()`**: UI: Renders the interactive NGSS Navigator for teachers.
- **`renderNGSSSection(section, filter)`**: UI: Renders specific sections of standards (SEP, CCC, DCI, or Grade levels).
- **`addToPhenomenon(peId)`**: Links a Performance Expectation ID to the class phenomenon.

## 2. UI & Utilities Layer (`js/ui/`)

### `utils.js`
- **`toast(message, type)`**: Displays a temporary success, error, info, or warning notification.
- **`copyCode()`**: Copies the current class code to the system clipboard.
- **`copyJoinLink()`**: Copies the full join link for the current class.
- **`generateCode()`**: Generates a random 6-character alphanumeric class code.
- **`showJoinQR()`**: Generates and displays a QR code for students to join.
- **`updateHealthIndicator(type, status)`**: Updates the visual sync status indicator in the header.
- **`calculateProgress()`**: Calculates total completion percentage for the current student.

### `renderer.js`
- **`switchMode(mode)`**: Switches the application between student and teacher modes.
- **`updateModeUI()`**: Refreshes headers, navigation, and module content based on active state.
- **`renderStudentContent()`**: Renders the active practice module for students.
- **`renderTeacherContent()`**: Renders the active dashboard module for teachers.
- **`renderModuleHeader(title, icon, sep)`**: Generates a consistent header with NGSS practice tags.
- **`renderStatusBanner()`**: Displays alerts for guided lessons or teacher feedback.
- **`renderEvidenceBank()`**: Renders the collected evidence list in the sidebar.

### `navigation.js`
- **`toggleSidebar()`**: Toggles mobile sidebar visibility.
- **`showStudentModule(moduleId)`**: Switches the active student module.
- **`showTeacherModule(moduleId)`**: Switches the active teacher dashboard module.
- **`renderNavigation()`**: Renders the sidebar navigation links for the current mode.

## 3. Science Practices Layer (`js/modules/`)

### `questions.js` (SEP1)
- **`renderQuestionsModule()`**: Renders the Notice & Wonder board and Driving Questions UI.
- **`addNotice()`**: Adds a new observation to the student's board.
- **`deleteNotice(id)`**: Removes a notice.
- **`addWonder()`**: Adds a new question to the student's board.
- **`deleteWonder(id)`**: Removes a wonder.
- **`promoteToQuestion(id)`**: Converts a student wonder into a primary or sub-driving question.

### `models.js` (SEP2) - *Draft Docstrings*
- **`initModelCanvas()`**: Sets up the interactive node-based canvas environment.
- **`createNode(x, y, icon)`**: Spawns a new concept node at the specified coordinates.
- **`renderModelElements()`**: Main loop to render nodes, connections, shapes, and paths.
- **`startConnection(nodeId, handle)`**: Initiates the visual connection line from a node handle.
- **`saveModelAsEvidence()`**: Snapshots the current canvas state and saves it to the Evidence Bank.

### `investigation.js` (SEP3) - *Draft Docstrings*
- **`addVariable()`**: Adds a new experimental variable to the variable bank.
- **`dropVar(event)`**: Handles drag-and-drop categorization of variables (Independent vs Dependent).
- **`addDataRow()`**: Appends a new row to the data collection table.
- **`saveDataAsEvidence()`**: Saves the current data table structure and values as a scientific artifact.

### `analysis.js` (SEP4) - *Draft Docstrings*
- **`initChart()`**: Initializes the Chart.js instance for data visualization.
- **`updateChart()`**: Refreshes the graph based on selected X/Y axes and table data.
- **`saveChartAsEvidence()`**: Exports the current graph configuration as a visual artifact.

### `math.js` (SEP5) - *Draft Docstrings*
- **`calcPress(btn)`**: Handles standard calculator button interactions.
- **`saveMathExpr()`**: Evaluates a mathematical expression and saves it to the project list.

### `explanations.js` (SEP6) - *Draft Docstrings*
- **`renderExplanationsModule()`**: Renders the CER (Claim-Evidence-Reasoning) workspace.
- **`toggleEvidenceSelection(id)`**: Links/unlinks specific evidence artifacts to the current explanation.

### `argument.js` (SEP7) - *Draft Docstrings*
- **`addPost()`**: Publishes a new claim, support, or challenge to the class debate board.

### `communication.js` (SEP8) - *Draft Docstrings*
- **`updatePoster()`**: Syncs scientific poster fields (Intro, Methods, Results) to state.
- **`autoFillPoster()`**: Automatically populates poster sections using data from previous modules.

## 4. Teacher Layer (`js/teacher/`)

### `dashboard.js` - *Draft Docstrings*
- **`renderTeacherOverview()`**: Renders the primary dashboard with class-wide activity tiles.
- **`renderActivityDashboard()`**: Renders the unified "Guided Lesson" view for monitoring and exemplars.
- **`toggleDashboardMode(isMonitoring)`**: Swaps between editing the class exemplar and monitoring live student work.

### `viewer.js` - *Draft Docstrings*
- **`renderLiveModels()`**: Provides a specialized view of a student's canvas for real-time feedback.
- **`saveComment()`**: Places a teacher feedback bubble on a student's model.
- **`clearViewerFeedback()`**: Bulk-removes feedback artifacts from a student's workspace.
