// utils.js - Utility functions for the application

// Note: `currentRubricData` is a global variable managed by app.js.
// While not explicitly declared here, functions like `findIndicatorConfig`
// and `findIndicatorsInGatewayConfig` expect it to be available in the global scope
// or passed as an argument (which is the better practice adopted here).

/**
 * Generates a unique ID string using a combination of timestamp and random characters.
 * @returns {string} A unique ID.
 */
function generateUniqueId() {
    // Combines timestamp (radix 36) and a random string (radix 36) for uniqueness.
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Formats a date object or date string into 'YYYY-MM-DD' format.
 * @param {Date|string} date - The date object or string (e.g., ISO format) to format.
 * @returns {string} The formatted date string (YYYY-MM-DD), or an empty string if the input is invalid.
 */
function formatDate(date) {
    try {
        const d = new Date(date);
        // Check if the date object is valid
        if (isNaN(d.getTime())) {
            console.warn("[Utils] Invalid date provided to formatDate:", date);
            return ''; // Return empty for invalid dates
        }
        return d.toISOString().split('T')[0]; // Extracts YYYY-MM-DD part from ISO string
    } catch (e) {
        console.error("[Utils] Error formatting date:", date, e);
        return ''; // Return empty on any formatting error
    }
}


/**
 * Calculates a gateway's rating based on achieved points and predefined thresholds.
 * @param {number} points - The total points achieved for the gateway.
 * @param {number[]} ratingThresholds - An array containing two threshold values: `[partiallyMeets, meets]`.
 * @returns {string} The calculated rating string (e.g., 'Meets Expectations', 'Partially Meets Expectations', 'Does Not Meet Expectations').
 *                   Returns 'Error Calculating' if thresholds are invalid.
 */
function calculateGatewayRating(points, ratingThresholds) {
    if (!Array.isArray(ratingThresholds) || ratingThresholds.length !== 2) {
        console.error("[Utils] Invalid rating thresholds provided to calculateGatewayRating:", ratingThresholds);
        return 'Error Calculating'; // Indicate an issue with input
    }
    const [partiallyMeetsThreshold, meetsThreshold] = ratingThresholds;

    if (points >= meetsThreshold) return 'Meets Expectations';
    if (points >= partiallyMeetsThreshold) return 'Partially Meets Expectations';
    return 'Does Not Meet Expectations';
}

/**
 * Calculates the final review rating based on individual gateway ratings and the rubric's defined logic.
 * Iterates through rules in `finalRatingLogic` and returns the result of the first matching rule.
 * @param {Object<string, string>} gatewayRatings - An object mapping gateway IDs to their string ratings
 *                                (e.g., `{ gateway1: 'Meets Expectations', gateway2: 'Partially Meets Expectations' }`).
 * @param {Array<{condition: function, result: string}>} finalRatingLogic - An array of logic rules from the rubric.
 *        Each rule object should have a `condition` function (which takes `gatewayRatings` and returns boolean)
 *        and a `result` string (the final rating if the condition is met).
 * @returns {string} The calculated final rating string.
 *                   Returns a fallback rating (e.g., 'Not Rated (Logic Missing)') if input is invalid or no rule matches.
 */
function calculateFinalRating(gatewayRatings, finalRatingLogic) {
    if (!gatewayRatings || typeof gatewayRatings !== 'object' ||
        !Array.isArray(finalRatingLogic) || finalRatingLogic.length === 0) {
        console.error("[Utils] Invalid gatewayRatings or finalRatingLogic provided to calculateFinalRating.");
        // Provide a very basic fallback if logic is entirely missing or invalid
        if (gatewayRatings?.gateway1 === 'Meets Expectations' && gatewayRatings?.gateway2 === 'Meets Expectations') {
             return 'Meets Expectations (Fallback - Logic Missing)';
        }
        return 'Not Rated (Logic Missing or Invalid)';
    }

    // Iterate through the logic rules defined in the rubric.
    for (const rule of finalRatingLogic) {
        try {
            // The `condition` function is defined in the rubric data and evaluates the `gatewayRatings`.
            if (typeof rule.condition === 'function' && rule.condition(gatewayRatings)) {
                return rule.result; // Return the result of the first rule whose condition is met.
            }
        } catch (e) {
            console.error("[Utils] Error evaluating final rating logic rule:", rule, e);
            // Continue to the next rule, or could return an error state if critical.
        }
    }

    // Fallback if no rule matched (ideally, the rubric's logic should include a default/final rule).
    console.warn("[Utils] No matching rule found in final rating logic. Ensure rubric has a default final rule.");
    return 'Not Rated (No Rule Matched)';
}

/**
 * Creates and sets up a modal for viewing images embedded in evidence sections.
 * This function is intended to be called once during application initialization.
 * It creates the necessary HTML elements and attaches global event listeners.
 */
function setupImageViewer() {
    // Prevent duplicate setup if modal already exists.
    if (document.getElementById('imageViewerModal')) {
        // console.log("[Utils] Image viewer modal already exists. Skipping setup.");
        return;
    }
    console.log("[Utils] Setting up image viewer modal for embedded evidence images.");

    // Create modal structure dynamically.
    const modal = document.createElement('div');
    modal.id = 'imageViewerModal'; // For easy selection
    modal.className = 'image-viewer-modal modal'; // Shared modal styles + specific viewer styles

    const modalContentContainer = document.createElement('div');
    modalContentContainer.className = 'image-viewer-content-container modal-content'; // For styling content area

    const closeBtn = document.createElement('span');
    closeBtn.className = 'image-viewer-close close'; // Shared close styles + specific
    closeBtn.innerHTML = '×'; // Standard close icon
    closeBtn.title = 'Close image viewer';

    const imageElement = document.createElement('img');
    imageElement.className = 'image-viewer-image'; // Specific class for the image itself
    imageElement.id = 'viewerImageElement'; // Unique ID for the image tag
    imageElement.alt = 'Enlarged evidence image';


    modalContentContainer.appendChild(closeBtn);
    modalContentContainer.appendChild(imageElement);
    modal.appendChild(modalContentContainer);
    document.body.appendChild(modal); // Add modal to the end of the body

    // Event listeners for closing the modal.
    const closeAction = () => { modal.style.display = 'none'; imageElement.src = ''; }; // Clear src
    closeBtn.addEventListener('click', closeAction);
    modal.addEventListener('click', (event) => { // Close if background (modal itself) is clicked
        if (event.target === modal) {
            closeAction();
        }
    });
    document.addEventListener('keydown', (event) => { // Close on Escape key
        if (event.key === 'Escape' && modal.style.display !== 'none') {
            closeAction();
        }
    });

    // Global delegated event listener for clicking on evidence images.
    // This listens on the document body for clicks on `img` tags that might be added dynamically
    // (e.g., within TinyMCE editors, if they are not in iframes, or in other parts of the UI).
    document.body.addEventListener('click', (event) => {
        // Find the closest img tag from the click target
        const clickedImg = event.target.closest('img');

        // Check if the clicked image is inside an evidence text area (to avoid capturing all images on the page)
        if (clickedImg && clickedImg.closest('.evidence-text, .evidence-entry')) {
            const viewerModal = document.getElementById('imageViewerModal');
            const viewerImageTag = document.getElementById('viewerImageElement');

            if (viewerModal && viewerImageTag) {
                viewerImageTag.src = clickedImg.src; // Set the source for the modal's image
                viewerModal.style.display = 'flex'; // Show the modal (using flex for centering)
            } else {
                console.warn("[Utils] Image viewer modal elements not found when attempting to show image.");
            }
        }
    });
    console.log("[Utils] Image viewer modal setup and global image click listener complete.");
}

/**
 * Displays a notification message to the user.
 * Notifications appear at the bottom-right of the screen and can be of different types.
 * @param {string} message - The message to display in the notification.
 * @param {string} [type='info'] - The type of notification ('success', 'error', 'info', 'warning').
 *                                 This affects the background color.
 * @param {number} [duration=3000] - The duration in milliseconds for the notification to be visible.
 *                                   Use 0 for a sticky notification (must be manually dismissed).
 */
function showNotification(message, type = 'info', duration = 3000) {
    let container = document.getElementById('notification-container');
    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // Use classes from styles.css
    notification.textContent = message;
    
    container.appendChild(notification);

    // Trigger animation after element is in DOM
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });

    // Click to dismiss
    notification.addEventListener('click', () => dismissNotification(notification));

    // Auto-dismiss after duration (if duration > 0)
    if (duration > 0) {
        setTimeout(() => dismissNotification(notification), duration);
    }
}

/**
 * Dismisses a specific notification element with an animation.
 * @param {HTMLElement} notificationElement - The notification `div` element to dismiss.
 */
function dismissNotification(notificationElement) {
    if (notificationElement && notificationElement.parentElement) {
        // Animate out
        notificationElement.style.opacity = '0';
        notificationElement.style.transform = 'translateX(110%)';

        // Remove from DOM after animation completes
        notificationElement.addEventListener('transitionend', () => {
            if (notificationElement.parentElement) { // Check again, might have been removed by multiple clicks
                notificationElement.parentElement.removeChild(notificationElement);
            }
        }, { once: true }); // Ensure listener is removed after firing
    }
}

/**
 * Sanitizes an HTML string to prevent XSS attacks, using DOMPurify.
 * Allows a specific set of tags and attributes suitable for rich text content from TinyMCE
 * and AI-generated Markdown, including images (base64 data URLs) and page links.
 * @param {string|null|undefined} html - The HTML string to sanitize.
 * @returns {string} The sanitized HTML string. Returns an empty string if input is null/undefined.
 */
function sanitizeHTML(html) {
    if (html === null || html === undefined) return '';
    if (typeof html !== 'string') {
        console.warn("[Utils] sanitizeHTML received non-string input. Attempting to convert to string:", html);
        html = String(html); // Attempt to coerce to string
    }

    if (typeof DOMPurify === 'undefined') {
        console.error("[Utils] DOMPurify library not loaded! Falling back to basic text escaping (unsafe for HTML).");
        // Basic fallback: treat as text, not HTML. This is NOT a full XSS protection for HTML.
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML; // Returns HTML-escaped version of the text content.
    }

    // Configure DOMPurify to allow tags and attributes needed for formatted text,
    // images (including data URIs), and custom page links.
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'strike', 'sub', 'sup',
            'ul', 'ol', 'li', 'blockquote', 'hr',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'img', 'a', 'div', 'span', 'pre', 'code',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td' // Basic table elements
        ],
        ALLOWED_ATTR: [
            'src', 'alt', 'title', 'href', 'target', 'class', 'id', 'style', // Allow style for limited cases if necessary
            'data-page', 'data-pdf-id' // Custom attributes for page links
        ],
        ALLOW_DATA_ATTR: true, // Generally allow data-* attributes
        ALLOW_UNKNOWN_PROTOCOLS: true, // Allows `data:` URIs for `src` attribute in `img` tags (for base64 images)
    });
}

/**
 * Converts a Markdown string to HTML using the `marked` library.
 * Includes basic error handling if `marked` is not available or parsing fails.
 * Note: The output HTML should be subsequently sanitized using `sanitizeHTML`.
 * @param {string|null|undefined} markdown - The Markdown string to convert.
 * @returns {string} The converted HTML string. Returns original input or error message on failure.
 */
function markdownToHTML(markdown) {
    if (markdown === null || markdown === undefined) return '';
    if (typeof markdown !== 'string') {
        console.warn("[Utils] markdownToHTML received non-string input. Attempting to convert:", markdown);
        markdown = String(markdown);
    }

    if (typeof marked === 'undefined' || typeof marked.parse !== 'function') {
        console.error("[Utils] Marked.js library (marked.parse) not loaded! Returning raw markdown.");
        return sanitizeHTML(markdown); // Sanitize the raw markdown as a fallback
    }

    try {
        // `marked.parse()` is the current method
        return marked.parse(markdown);
    } catch (e) {
        console.error("[Utils] Error parsing markdown with marked.js:", e);
        // Return a safe representation of the error and original markdown
        return `<p><em>Error processing content (Markdown parsing failed): ${sanitizeHTML(e.message)}</em></p><pre>${sanitizeHTML(markdown)}</pre>`;
    }
}

/**
 * Scans HTML text for page number references (e.g., "p. 12", "pp. 147-153")
 * and wraps them in `<a>` tags with `class="page-link"`. These links include
 * `data-page` and `data-pdf-id` (if identifiable) attributes for client-side navigation.
 * This version uses a robust DOM parsing approach to avoid corrupting HTML attributes.
 * @param {string} htmlText - The HTML content to process.
 * @returns {string} The HTML content with page numbers converted to interactive links.
 */
function linkifyPageNumbers(htmlText) {
    if (!htmlText || typeof htmlText !== 'string') {
        return htmlText || '';
    }

    try {
        // 1. Parse the HTML string into a DOM document
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Function to find PDF ID, assuming `window.findPdfIdByName` is globally available
        const findPdfIdFunc = typeof window.findPdfIdByName === 'function' ?
            window.findPdfIdByName :
            (name) => {
                console.warn("[Utils Linkify] findPdfIdByName not available globally. Cannot link pages by document name.");
                return null; // Fallback
            };

        // 2. Use a TreeWalker to efficiently find all text nodes
        // We will not process text inside <script>, <style>, or existing <a> tags.
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (node.parentElement.closest('script, style, a')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const pageRegex = /(?:([\w\s.,'-]+(?:Guide|Manual|Textbook|Workbook|Document|PDF\s*\d*))\s*[,]?\s*)?\b(pp?\.|\bpg\.|\bpages?)\s+(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\b/gi;

        const nodesToProcess = [];
        let currentNode;
        while (currentNode = walker.nextNode()) {
            nodesToProcess.push(currentNode);
        }

        // 3. Process each text node found
        for (const node of nodesToProcess) {
            const text = node.nodeValue;
            let lastIndex = 0;
            const fragment = doc.createDocumentFragment();
            
            let match;
            pageRegex.lastIndex = 0; // Reset regex state for each new string
            while ((match = pageRegex.exec(text)) !== null) {
                // Text before the match
                fragment.appendChild(doc.createTextNode(text.substring(lastIndex, match.index)));

                const [fullMatch, docName, pagePrefix, pageNumberString] = match;

                const link = doc.createElement('a');
                link.href = '#';
                link.className = 'page-link';

                const pageToLink = pageNumberString.split(/[,-]/)[0].trim();
                link.setAttribute('data-page', sanitizeHTML(pageToLink));

                let identifiedPdfId = null;
                let displayDocName = docName ? docName.trim() : null;

                if (displayDocName) {
                    identifiedPdfId = findPdfIdFunc(displayDocName);
                } else if (window.loadedPdfs && window.loadedPdfs.length > 0) {
                    identifiedPdfId = window.loadedPdfs[0].id;
                    displayDocName = window.loadedPdfs[0].name;
                }

                if (identifiedPdfId) {
                    link.setAttribute('data-pdf-id', sanitizeHTML(identifiedPdfId));
                }

                const titlePdfName = displayDocName || (identifiedPdfId ? `PDF ID ${identifiedPdfId}` : 'the document');
                link.title = `Go to page ${sanitizeHTML(pageNumberString)} in ${sanitizeHTML(titlePdfName)}`;
                
                link.textContent = fullMatch;
                fragment.appendChild(link);

                lastIndex = pageRegex.lastIndex;
            }
            
            if (lastIndex > 0) {
                fragment.appendChild(doc.createTextNode(text.substring(lastIndex)));
                node.parentNode.replaceChild(fragment, node);
            }
        }
        
        return doc.body.innerHTML;

    } catch (e) {
        console.error("[Utils] Error in linkifyPageNumbers:", e);
        return htmlText;
    }
}

/**
 * Finds an indicator's configuration object within the loaded rubric data by its ID.
 * Searches recursively through gateways, criterion sections, and item groups.
 * @param {object} rubricData - The rubric data object (e.g., `window.currentRubricData`).
 * @param {string} indicatorId - The ID of the indicator to find.
 * @returns {object|null} The indicator configuration object, or null if not found or inputs are invalid.
 */
function findIndicatorConfig(rubricData, indicatorId) {
    if (!rubricData || !rubricData.gateways || !indicatorId) {
        return null;
    }

    function searchItemsArray(items) {
        if (!Array.isArray(items)) return null;
        for (const item of items) {
            if (item.id === indicatorId && item.type !== 'group') {
                return item;
            }
            if (item.type === 'group' && item.items) {
                const foundInGroup = searchItemsArray(item.items);
                if (foundInGroup) return foundInGroup;
            }
        }
        return null;
    }

    for (const gateway of rubricData.gateways) {
        if (Array.isArray(gateway.criterionSections)) {
            for (const criterion of gateway.criterionSections) {
                const foundIndicator = searchItemsArray(criterion.items);
                if (foundIndicator) return foundIndicator;
            }
        }
    }
    return null;
}


/**
 * Finds an indicator's configuration and its parent group's configuration (if it exists).
 * Searches recursively through the rubric structure.
 * @param {object} rubricData - The rubric data object (e.g., `window.currentRubricData`).
 * @param {string} indicatorId - The ID of the indicator to find.
 * @returns {{indicator: object|null, parentGroup: object|null}} An object containing the indicator config and its parent group config.
 */
function findIndicatorWithContext(rubricData, indicatorId) {
    if (!rubricData || !rubricData.gateways || !indicatorId) {
        return { indicator: null, parentGroup: null };
    }

    // Recursive search function that keeps track of the parent group
    function searchItems(items, parent = null) {
        if (!Array.isArray(items)) return null;
        for (const item of items) {
            // If we found the target indicator, return it along with its parent context
            if (item.id === indicatorId && item.type !== 'group') {
                return { indicator: item, parentGroup: parent };
            }
            // If the item is a group, search its children, passing the current group as the new parent context
            if (item.type === 'group' && Array.isArray(item.items)) {
                const found = searchItems(item.items, item);
                if (found) return found; // Propagate the result up if found in a nested group
            }
        }
        return null; // Not found in this array of items
    }

    // Iterate through the top-level structure to start the search
    for (const gateway of rubricData.gateways) {
        if (Array.isArray(gateway.criterionSections)) {
            for (const criterion of gateway.criterionSections) {
                const result = searchItems(criterion.items);
                if (result) return result; // Return immediately once found
            }
        }
    }
    return { indicator: null, parentGroup: null }; // Return if not found anywhere
}

/**
 * Finds all indicator configuration objects (not groups) within a single gateway's configuration,
 * including indicators nested inside groups.
 * @param {object} gatewayConfig - The configuration object for a single gateway.
 * @returns {object[]} An array of indicator configuration objects. Returns an empty array if invalid input or no indicators.
 */
function findIndicatorsInGatewayConfig(gatewayConfig) {
    const indicators = [];
    if (!gatewayConfig || !Array.isArray(gatewayConfig.criterionSections)) {
        return indicators;
    }

    gatewayConfig.criterionSections.forEach(criterion => {
        if (Array.isArray(criterion.items)) {
            criterion.items.forEach(item => {
                if (item.type === 'group' && Array.isArray(item.items)) {
                    item.items.forEach(subItem => {
                        if (subItem.type !== 'group') indicators.push(subItem);
                    });
                } else if (item.type !== 'group') {
                    indicators.push(item);
                }
            });
        }
    });
    return indicators;
}

// --- Global Exposure of Utility Functions ---
window.generateUniqueId = generateUniqueId;
window.formatDate = formatDate;
window.calculateGatewayRating = calculateGatewayRating;
window.calculateFinalRating = calculateFinalRating;
window.setupImageViewer = setupImageViewer;
window.showNotification = showNotification;
window.dismissNotification = dismissNotification;
window.sanitizeHTML = sanitizeHTML;
window.markdownToHTML = markdownToHTML;
window.linkifyPageNumbers = linkifyPageNumbers;
window.findIndicatorConfig = findIndicatorConfig;
window.findIndicatorsInGatewayConfig = findIndicatorsInGatewayConfig;
window.findIndicatorWithContext = findIndicatorWithContext;