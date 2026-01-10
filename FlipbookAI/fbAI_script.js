/**
 * Flipbook Anything (FBA) Script - Revised v3.2
 * Fixes: Replaced panzoomInstance.dispose() with panzoomInstance.destroy()
 */

var { pdfjsLib } = globalThis;
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
} else {
    console.error("FATAL: pdfjsLib is not defined.");
}

// --- Global State Variables ---
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let spreadMode = 'single';
let searchTerm = '';
let zoomScale = 1;
let previousZoomScale = 1;
let panzoomInstance = null;
let fileName = '';
let currentPdfId = null;
let currentPdfDataArrayBuffer = null;
let textCache = {};
let isMouseOverCanvas = false;
let currentInteractionMode = 'ts';
let shiftKeyActive = false;
let targetPageNum = 1;
let currentSelectedCollectionId = 'all';

// --- AI Chat State ---
const GEMINI_API_KEY_SESSION_KEY = 'geminiFlipbookApiKey';
let genAI = null;
let isAIInitialized = false;
let isAIInitializing = false;
let chatHistory = [];
const maxChatHistoryLength = 10;
let chatContextDocs = [];

// --- DOM Element References ---
let pdfTitle, container, canvas, ctx, toggleSearchButton, searchButton,
    searchInput, clearSearchButton, searchResultsList, searchPanel,
    progressBar, progressContainer, bookmarksButton, bookmarksMenu,
    bookmarksContent, fileInput, textLayer, secondTextLayer = null,
    canvasContainer, prevButton, nextButton, pageNumDisplay,
    pageCountDisplay, toggleButton, pzButton, tsButton, zoomInButton,
    zoomOutButton, zoomSlider, themeToggle, dropArea, loadingOverlay,
    chatToggleButton, chatModal, chatLog, chatInput, chatSendBtn,
    chatCloseBtn, chatThinking, chatError, chatNotice, chatModelSelector,
    bookshelfButton, bookshelfModal, closeBookshelfBtn, uploadPdfBtn,
    newCollectionNameInput, addCollectionBtn, collectionsList, pdfsList,
    manageContextBtn, chatContextList, chatContextSelector, contextSelectorList, closeContextSelectorBtn,
    pdfContextMenu;

// ==========================================================================
// --- UTILITY FUNCTIONS ---
// ==========================================================================

function arrayBufferToBase64(buffer) {
    if (!buffer) return '';
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

function escapeHtml(unsafe) {
    if (unsafe === null || typeof unsafe === 'undefined') return '';
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function linkifyPageNumbers(htmlString) {
    if (!htmlString) return '';
    const pageRegex = /\(([^,]+?\.pdf),\s*(?:page|pg|p)\.?\s*(\d+)\)/gi;
    return htmlString.replace(pageRegex, (match, docName, pageNumberStr) => {
        const pageNumber = parseInt(pageNumberStr, 10);
        if (!isNaN(pageNumber) && docName.trim().toLowerCase() === fileName.trim().toLowerCase()) {
            return `(<a href="#" class="page-link" data-page="${pageNumber}" title="Go to page ${pageNumber} in ${escapeHtml(docName)}">${docName}, p. ${pageNumber}</a>)`;
        }
        return match;
    });
}

// ==========================================================================
// --- AI CHAT FUNCTIONS ---
// ==========================================================================
function promptForKey() {
    const key = prompt("Please enter your Google Gemini API Key to enable AI Chat:");
    if (key && key.trim()) {
        sessionStorage.setItem(GEMINI_API_KEY_SESSION_KEY, key.trim());
        return key.trim();
    }
    alert("API Key is required to use the AI Chat feature.");
    return null;
}
function getApiKey() {
    let key = sessionStorage.getItem(GEMINI_API_KEY_SESSION_KEY);
    if (!key) key = promptForKey();
    return key;
}
async function initializeAI() {
    if (isAIInitializing || isAIInitialized) return isAIInitialized;
    isAIInitializing = true;
    setChatError(null);
    try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API Key not provided.");
        if (typeof window.GoogleGenerativeAI === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (typeof window.GoogleGenerativeAI === 'undefined') throw new Error("Google AI SDK failed to load.");
        }
        genAI = new window.GoogleGenerativeAI(apiKey);
        isAIInitialized = true;
        chatToggleButton.disabled = !pdfDoc;
        return true;
    } catch (error) {
        setChatError(`AI Init Error: ${error.message}`);
        isAIInitialized = false;
        return false;
    } finally {
        isAIInitializing = false;
    }
}
async function getPdfDataForChat() {
    const fileParts = [];
    if (!currentPdfDataArrayBuffer) return null;
    try {
        const base64Data = arrayBufferToBase64(currentPdfDataArrayBuffer);
        fileParts.push({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
    } catch (error) { return null; }
    for (const doc of chatContextDocs) {
        try {
            const pdfRecord = await db.getPdf(doc.id);
            if (pdfRecord && pdfRecord.data) {
                const base64Data = arrayBufferToBase64(pdfRecord.data);
                fileParts.push({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
            }
        } catch (error) { console.error(error); }
    }
    return fileParts.length > 0 ? fileParts : null;
}
function setChatError(message) {
    if (!chatError) return;
    chatError.textContent = message || '';
    chatError.style.display = message ? 'block' : 'none';
}
function processAiResponse(text) {
    if (!text) return '';
    let escapedText = escapeHtml(text);
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escapedText = escapedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escapedText = escapedText.replace(/`(.*?)`/g, '<code>$1</code>');
    escapedText = escapedText.replace(/^([\*]|-) (.*?)(\n|$)/gm, '<ul><li>$2</li></ul>');
    escapedText = escapedText.replace(/^(\d+)\. (.*?)(\n|$)/gm, '<ol start="$1"><li>$2</li></ol>');
    escapedText = escapedText.replace(/<\/ul>\n?<ul>/g, '');
    escapedText = escapedText.replace(/<\/ol>\n?<ol start="\d+">/g, '');
    escapedText = escapedText.replace(/\n/g, '<br>');
    return linkifyPageNumbers(escapedText);
}
function appendChatMessage(role, text) {
    if (!chatLog) return;
    if (chatNotice && chatNotice.parentNode === chatLog) { chatLog.removeChild(chatNotice); chatNotice = null; }
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', role);
    messageDiv.innerHTML = (role === 'ai') ? processAiResponse(text) : escapeHtml(text).replace(/\n/g, '<br>');
    chatLog.appendChild(messageDiv);
    setTimeout(() => { chatLog.scrollTop = chatLog.scrollHeight; }, 50);
}
function constructChatPrompt(userQuery) {
    let docList = `- The primary document: "${fileName || 'current document'}"`;
    chatContextDocs.forEach(doc => { docList += `\n  - "${doc.name}"`; });
    let prompt = `You are an expert research assistant. Answer based exclusively on the provided PDFs. \n\nDocuments:\n${docList}\n\nStrictly cite sources as (filename.pdf, p. #). No external knowledge.\n\nHistory:`;
    if (chatHistory.length > 0) { chatHistory.slice(-maxChatHistoryLength).forEach(msg => { prompt += `\n${msg.role === 'user' ? 'User' : 'AI'}: ${escapeHtml(msg.text)}`; }); }
    prompt += `\n\nQuestion: ${escapeHtml(userQuery)}`;
    return prompt;
}
async function sendChatMessage() {
    if (!chatInput || !chatSendBtn) return;
    const userQuery = chatInput.value.trim();
    if (!userQuery) return;
    const selectedModel = chatModelSelector.value;
    appendChatMessage('user', userQuery);
    chatHistory.push({ role: 'user', text: userQuery });
    if (chatHistory.length > maxChatHistoryLength) chatHistory.shift();
    chatInput.value = ''; chatInput.disabled = true; chatSendBtn.disabled = true; chatThinking.style.display = 'block'; setChatError(null);
    if (!isAIInitialized && !await initializeAI()) { chatInput.disabled = false; chatSendBtn.disabled = false; chatThinking.style.display = 'none'; return; }
    const pdfDataParts = await getPdfDataForChat();
    if (!pdfDataParts) { setChatError("PDF Data missing."); chatInput.disabled = false; chatSendBtn.disabled = false; return; }
    const promptText = constructChatPrompt(userQuery);
    const allParts = [...pdfDataParts, { text: promptText }];
    try {
        const model = genAI.getGenerativeModel({ model: selectedModel });
        const result = await model.generateContent({ contents: [{ role: 'user', parts: allParts }] });
        const aiResponseText = result.response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || "(Empty response)";
        appendChatMessage('ai', aiResponseText);
        chatHistory.push({ role: 'ai', text: aiResponseText });
    } catch (error) { setChatError(`Error: ${error.message}`); appendChatMessage('error', error.message); } 
    finally { chatInput.disabled = false; chatSendBtn.disabled = false; chatThinking.style.display = 'none'; chatInput.focus(); }
}

// ==========================================================================
// --- PDF LOADING ---
// ==========================================================================
async function handleFileSelect(evt) {
    const file = evt.target.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                if(loadingOverlay) loadingOverlay.style.display = 'flex';
                await db.addPdf(file.name, e.target.result);
                await refreshCurrentPdfListView();
            } catch (err) { alert("Could not save PDF."); } 
            finally { if(loadingOverlay) loadingOverlay.style.display = 'none'; }
        };
        reader.readAsArrayBuffer(file);
    }
    if (evt.target) evt.target.value = null;
}

function resetViewerState() {
    pdfDoc = null; pageNum = 1; targetPageNum = 1; pageRendering = false; pageNumPending = null;
    searchTerm = ''; fileName = ''; currentPdfId = null;
    currentPdfDataArrayBuffer = null; textCache = {};
    if (pdfTitle) pdfTitle.textContent = 'No PDF Loaded'; if (pageNumDisplay) pageNumDisplay.textContent = '1';
    if (pageCountDisplay) pageCountDisplay.textContent = '0';
    if (searchResultsList) searchResultsList.innerHTML = '';
    clearBookmarks();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (textLayer) textLayer.innerHTML = '';
    if (secondTextLayer) { secondTextLayer.innerHTML = ''; secondTextLayer.style.display = 'none'; }
    
    // Reset Zoom Logic
    if (panzoomInstance) {
        // FIX: Using destroy() for timmywil/panzoom library
        panzoomInstance.destroy();
        panzoomInstance = null;
    }
    
    zoomScale = 1;
    previousZoomScale = 1;
    if (zoomSlider) zoomSlider.value = "1.00";
    
    if (chatToggleButton) chatToggleButton.disabled = true;
    chatContextDocs = [];
    updateChatContextUI();
    setInteractionMode('ts');
}

async function loadPDF(data, pdfName, pdfId) {
    if (!(data instanceof ArrayBuffer) || data.byteLength === 0) return;
    resetViewerState();
    currentPdfDataArrayBuffer = data.slice(0);
    fileName = pdfName;
    currentPdfId = pdfId;

    if (pdfTitle) pdfTitle.textContent = `Loading: ${pdfName}...`;
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (chatToggleButton) chatToggleButton.disabled = false;

    try {
        pdfDoc = await pdfjsLib.getDocument({ data: data.slice(0) }).promise;
        if (pdfTitle) pdfTitle.textContent = pdfName;
        if (pageCountDisplay) pageCountDisplay.textContent = pdfDoc.numPages;
        const outline = await pdfDoc.getOutline(); createBookmarkList(outline);
        pageNum = 1; targetPageNum = 1; spreadMode = 'single'; updateToggleButton();
        await renderPage(pageNum);
        updatePageDisplayWithoutHistory(pageNum);
        updateChatContextUI();
    } catch (error) {
        alert(`Failed to load PDF: ${error.message}`);
        resetViewerState();
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// ==========================================================================
// --- PAGE RENDERING ---
// ==========================================================================

async function renderPage(num, highlightSearchTerm = '') {
    if (!pdfDoc) return;
    pageRendering = true;
    const effectivePageNum = num;
    
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    // 1. Layout Fix
    const header = document.getElementById('header');
    const footer = document.querySelector('.footer-bar');
    const mainBody = document.querySelector('.main-body');
    
    if (header && footer && mainBody) {
        mainBody.style.height = `calc(100vh - (${header.offsetHeight}px + ${footer.offsetHeight}px))`;
    }

    container.style.display = 'grid';
    container.style.gridTemplate = '1fr / 1fr';
    container.style.placeItems = 'center';

    const renderSinglePage = async (pageNumber, targetCanvas, targetCtx, targetTextLayerElem) => {
        try {
            const page = await pdfDoc.getPage(pageNumber);
            const availableHeight = mainBody ? mainBody.clientHeight : window.innerHeight;
            const availableWidth = mainBody ? mainBody.clientWidth : window.innerWidth;

            const viewport = page.getViewport({ scale: 1 });
            const heightRatio = availableHeight / viewport.height;
            const widthRatio = availableWidth / viewport.width;
            
            // Zoom Bands
            let renderMultiplier = 1.5; 
            if (zoomScale >= 2) renderMultiplier = 2.5;
            if (zoomScale >= 3) renderMultiplier = 4.0;
            
            const scaleRatio = Math.min(heightRatio, widthRatio);
            const finalScale = scaleRatio * renderMultiplier;

            // One viewport for everything
            const renderViewport = page.getViewport({ scale: finalScale });

            targetCanvas.height = renderViewport.height;
            targetCanvas.width = renderViewport.width;

            await page.render({ canvasContext: targetCtx, viewport: renderViewport }).promise;

            if (targetTextLayerElem) {
                targetTextLayerElem.innerHTML = '';
                
                const displayWidth = targetCanvas.width / renderMultiplier;
                const displayHeight = targetCanvas.height / renderMultiplier;

                targetTextLayerElem.style.width = `${displayWidth}px`;
                targetTextLayerElem.style.height = `${displayHeight}px`;
                
                const scaleFactor = renderViewport.scale / renderMultiplier;
                targetTextLayerElem.style.setProperty('--scale-factor', scaleFactor);

                const textContent = await page.getTextContent();
                await pdfjsLib.renderTextLayer({
                    textContentSource: textContent,
                    container: targetTextLayerElem,
                    viewport: renderViewport,
                    textDivs: [],
                }).promise;

                if (highlightSearchTerm) highlightTextOnLayer(highlightSearchTerm, targetTextLayerElem);
            }

            return { 
                width: targetCanvas.width / renderMultiplier, 
                height: targetCanvas.height / renderMultiplier 
            };
        } catch (error) {
            console.error(error);
            return { width: 0, height: 0 };
        }
    };

    let renderResult;
    let isDoublePageEffective = false;
    let leftPageNum = effectivePageNum;
    let rightPageNum = effectivePageNum + 1;

    if (spreadMode !== 'single') {
        if (spreadMode === 'double-even') { 
            if (effectivePageNum !== 1) { 
                leftPageNum = effectivePageNum % 2 === 0 ? effectivePageNum : effectivePageNum - 1; 
                rightPageNum = leftPageNum + 1; 
                isDoublePageEffective = true; 
            } 
        } else { 
            leftPageNum = effectivePageNum % 2 !== 0 ? effectivePageNum : effectivePageNum - 1; 
            if (leftPageNum < 1) leftPageNum = 1; 
            rightPageNum = leftPageNum + 1; 
            isDoublePageEffective = true; 
        }
        if (isDoublePageEffective && rightPageNum > pdfDoc.numPages) { 
            isDoublePageEffective = false; 
            leftPageNum = pdfDoc.numPages; 
        }
    }

    if (isDoublePageEffective) {
        const leftOffscreenCanvas = document.createElement('canvas');
        const rightOffscreenCanvas = document.createElement('canvas');
        const [leftPageRender, rightPageRender] = await Promise.all([
            renderSinglePage(leftPageNum, leftOffscreenCanvas, leftOffscreenCanvas.getContext('2d'), textLayer),
            renderSinglePage(rightPageNum, rightOffscreenCanvas, rightOffscreenCanvas.getContext('2d'), secondTextLayer)
        ]);

        const combinedHeight = Math.max(leftPageRender.height, rightPageRender.height);
        const combinedWidth = leftPageRender.width + rightPageRender.width;

        canvas.width = leftOffscreenCanvas.width + rightOffscreenCanvas.width;
        canvas.height = Math.max(leftOffscreenCanvas.height, rightOffscreenCanvas.height);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(leftOffscreenCanvas, 0, 0);
        ctx.drawImage(rightOffscreenCanvas, leftOffscreenCanvas.width, 0);

        if (textLayer) textLayer.style.left = '0px'; 
        if (secondTextLayer) {
            secondTextLayer.style.display = 'block';
            secondTextLayer.style.width = `${rightPageRender.width}px`;
            secondTextLayer.style.height = `${combinedHeight}px`;
            secondTextLayer.style.left = `${leftPageRender.width}px`;
             // Scale factor re-apply for second layer
             secondTextLayer.style.setProperty('--scale-factor', textLayer.style.getPropertyValue('--scale-factor'));
        }
        renderResult = { width: combinedWidth, height: combinedHeight };
        pageNum = leftPageNum;
    } else {
        const singleRenderResult = await renderSinglePage(leftPageNum, canvas, ctx, textLayer);
        renderResult = singleRenderResult;
        if (secondTextLayer) secondTextLayer.style.display = 'none';
        pageNum = leftPageNum;
    }

    container.style.width = `${renderResult.width}px`;
    container.style.height = `${renderResult.height}px`;
    canvas.style.width = `${renderResult.width}px`;
    canvas.style.height = `${renderResult.height}px`;
    
    applyInteractionModeStyles();

    pageRendering = false;
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    updatePageDisplayWithoutHistory(pageNum);

    if (pageNumPending !== null) {
        renderPage(pageNumPending, searchTerm);
        pageNumPending = null;
    }
}

function queueRenderPage(num, highlightSearchTerm = '') {
    if (pageRendering) pageNumPending = num;
    else renderPage(num, highlightSearchTerm);
}

function applyInteractionModeStyles() {
    const pointerVal = isPanzoomEnabled() ? 'none' : 'auto';
    const selectVal = isPanzoomEnabled() ? 'none' : 'text';

    [textLayer, secondTextLayer].forEach(layer => {
        if (layer) {
            layer.style.pointerEvents = pointerVal;
            layer.querySelectorAll('span').forEach(span => {
                span.style.pointerEvents = pointerVal;
                span.style.userSelect = selectVal;
            });
        }
    });
}

function isPanzoomEnabled() {
    return currentInteractionMode === 'pz' || shiftKeyActive;
}

function highlightTextOnLayer(termToHighlight, targetTextLayer) {
    if (!termToHighlight || !targetTextLayer) return;
    try {
        const existingHighlights = targetTextLayer.querySelectorAll('mark.highlight');
        existingHighlights.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) { parent.replaceChild(document.createTextNode(mark.textContent || ''), mark); parent.normalize(); }
        });
        const textSpans = Array.from(targetTextLayer.querySelectorAll('span'));
        if (textSpans.length === 0) return;
        let combinedText = ''; const positions = [];
        textSpans.forEach(span => {
            const text = span.textContent || '';
            const start = combinedText.length;
            combinedText += text + " ";
            positions.push({ span, start, end: combinedText.length - 1, originalText: text });
        });
        combinedText = combinedText.toLowerCase().trim();
        const searchTermLower = termToHighlight.toLowerCase();
        let matchIndex = combinedText.indexOf(searchTermLower);
        while (matchIndex !== -1) {
            const matchEndIndex = matchIndex + searchTermLower.length;
            positions.forEach(pos => {
                if (matchIndex < pos.end && matchEndIndex > pos.start) {
                    const spanText = pos.originalText;
                    const spanStartInCombined = pos.start;
                    const highlightStartInSpan = Math.max(0, matchIndex - spanStartInCombined);
                    const highlightEndInSpan = Math.min(spanText.length, matchEndIndex - spanStartInCombined);
                    if (highlightStartInSpan < highlightEndInSpan && !pos.span.querySelector('mark.highlight')) {
                        const before = spanText.substring(0, highlightStartInSpan);
                        const highlighted = spanText.substring(highlightStartInSpan, highlightEndInSpan);
                        const after = spanText.substring(highlightEndInSpan);
                        const newContent = document.createDocumentFragment();
                        if (before) newContent.appendChild(document.createTextNode(before));
                        const mark = document.createElement('mark');
                        mark.className = 'highlight';
                        mark.textContent = highlighted;
                        newContent.appendChild(mark);
                        if (after) newContent.appendChild(document.createTextNode(after));
                        pos.span.innerHTML = '';
                        pos.span.appendChild(newContent);
                    }
                }
            });
            matchIndex = combinedText.indexOf(searchTermLower, matchIndex + 1);
        }
    } catch (error) { console.error("Error during text highlighting:", error); }
}

// ==========================================================================
// --- NAVIGATION & ZOOM ---
// ==========================================================================
function onPrevPage(currentPageNum) {
    if (spreadMode === 'single') return Math.max(1, currentPageNum - 1);
    let prevPage = Math.max(1, currentPageNum - 2);
    if (spreadMode === 'double-odd' && prevPage === 2) prevPage = 1;
    return prevPage;
}

function onNextPage(currentPageNum) {
    if (!pdfDoc) return currentPageNum;
    if (spreadMode === 'single') return Math.min(pdfDoc.numPages, currentPageNum + 1);
    let nextPage = currentPageNum + 2;
    if (spreadMode === 'double-even' && currentPageNum === 1) nextPage = 2;
    return Math.min(pdfDoc.numPages, nextPage);
}

function updatePageDisplayWithoutHistory(pageNumber) {
    if (!pdfDoc || !pageNumDisplay) return;
    let displayText = `${pageNumber}`;
    if (spreadMode !== 'single') {
        let leftPage, rightPage;
        if (spreadMode === 'double-even') {
            if (pageNumber === 1) displayText = `1`;
            else { leftPage = pageNumber % 2 === 0 ? pageNumber : pageNumber - 1; rightPage = leftPage + 1; }
        } else {
            leftPage = pageNumber % 2 !== 0 ? pageNumber : pageNumber - 1;
            if (leftPage < 1) leftPage = 1; rightPage = leftPage + 1;
        }
        if (leftPage && rightPage <= pdfDoc.numPages) displayText = `${leftPage}-${rightPage}`;
        else if (leftPage) displayText = `${leftPage}`;
    }
    pageNumDisplay.textContent = displayText;
}

function goToPage(targetPage) {
    if (!pdfDoc || targetPage < 1 || targetPage > pdfDoc.numPages) return;
    targetPageNum = targetPage;
    if (panzoomInstance) panzoomInstance.reset({ animate: false });
    snapAndSetZoom(1, true); 
    queueRenderPage(targetPageNum, searchTerm);
    updatePageDisplayWithoutHistory(targetPageNum);
}

// ==========================================================================
// --- ZOOM & INTERACTION MODES (Fixed: destroy() instead of dispose()) ---
// ==========================================================================
function setInteractionMode(mode) {
    if (mode === currentInteractionMode && !shiftKeyActive) return;
    
    currentInteractionMode = mode;

    if (isPanzoomEnabled()) { 
        // --- Enable Pan/Zoom ---
        if (!panzoomInstance && typeof Panzoom !== 'undefined') {
            panzoomInstance = Panzoom(container, {
                contain: 'outside',
                maxScale: 4,
                minScale: 1,
                step: 0.25,
                startScale: zoomScale,
                cursor: 'move',
                setTransform: (elem, { scale, x, y }) => {
                    const effectiveScale = Math.max(1, scale);
                    elem.style.transform = `scale(${effectiveScale}) translate(${x}px, ${y}px)`;
                }
            });
        }
        if (pzButton) pzButton.classList.add('active');
        if (tsButton) tsButton.classList.remove('active');
    } else { 
        // --- Disable Pan/Zoom (Text Mode) ---
        if (panzoomInstance) {
            // FIX: Check for destroy() first (timmywil/panzoom standard)
            if (typeof panzoomInstance.destroy === 'function') {
                panzoomInstance.destroy();
            } else if (typeof panzoomInstance.dispose === 'function') {
                panzoomInstance.dispose();
            }
            panzoomInstance = null;
            // Reset transform manually to maintain zoom level without pan
            container.style.transform = `scale(${zoomScale}) translate(0px, 0px)`;
        }
        if (pzButton) pzButton.classList.remove('active');
        if (tsButton) tsButton.classList.add('active');
    }
    applyInteractionModeStyles();
}

function snapAndSetZoom(newScale, forceRender = false) {
    const snappedScale = Math.max(1, Math.min(4, Math.round(newScale * 4) / 4));
    
    if (snappedScale !== zoomScale) {
        zoomScale = snappedScale;
        if (panzoomInstance) {
            panzoomInstance.zoom(zoomScale, { animate: true });
        } else {
            // If in Text Mode, just update variable, render loop handles visuals
            container.style.transform = `scale(${zoomScale})`;
        }
        
        if (zoomSlider) zoomSlider.value = zoomScale.toFixed(2);
        
        let newBand = 1;
        if (zoomScale >= 2 && zoomScale < 3) newBand = 2.5;
        if (zoomScale >= 3) newBand = 4;
        
        let prevBand = 1;
        if (previousZoomScale >= 2 && previousZoomScale < 3) prevBand = 2.5;
        if (previousZoomScale >= 3) prevBand = 4;

        if (forceRender || newBand !== prevBand) {
            previousZoomScale = zoomScale;
            queueRenderPage(pageNum, searchTerm);
        }
    }
}

function adjustZoom(step) {
    snapAndSetZoom(zoomScale + step);
}

function handleCtrlWheelZoom(event) {
    // Works in both modes now
    event.preventDefault();
    const scaleAmount = event.deltaY < 0 ? 0.25 : -0.25;
    snapAndSetZoom(zoomScale + scaleAmount);
}

// ==========================================================================
// --- BOOKMARKS / SEARCH / SPREAD (Standard) ---
// ==========================================================================
function createBookmarkList(outline) {
    clearBookmarks();
    if (!bookmarksContent) return;
    const customSection = document.createElement('div');
    customSection.innerHTML = `
        <div class="accordion-header">Custom Bookmarks</div>
        <div class="bookmark-controls collapsed">
            <input type="text" id="bookmarkTitleInput" placeholder="Enter bookmark title">
            <button id="addBookmarkButton">🔖 Add</button>
        </div>
        <ul id="customBookmarkList" class="bookmark-list collapsed"></ul>`;
    bookmarksContent.appendChild(customSection);
    customSection.querySelector('.accordion-header').addEventListener('click', () => toggleAccordion(customSection));
    customSection.querySelector('#addBookmarkButton').addEventListener('click', addBookmark);
    loadCustomBookmarks(customSection.querySelector('#customBookmarkList'));

    if (outline?.length > 0) {
        const tocSection = document.createElement('div');
        tocSection.innerHTML = `<div class="accordion-header">Table of Contents</div><ul id="autoBookmarkList" class="bookmark-list collapsed"></ul>`;
        bookmarksContent.appendChild(tocSection);
        const autoList = tocSection.querySelector('#autoBookmarkList');
        outline.forEach(bookmark => addBookmarkToList(bookmark, autoList));
        tocSection.querySelector('.accordion-header').addEventListener('click', () => toggleAccordion(tocSection));
    }
}
function toggleAccordion(sectionElement) {
    sectionElement.classList.toggle('collapsed');
    sectionElement.querySelectorAll(':scope > .bookmark-list, :scope > .bookmark-controls').forEach(el => el.classList.toggle('collapsed'));
}
function loadCustomBookmarks(customBookmarksList) {
    if (!customBookmarksList || !fileName) return;
    customBookmarksList.innerHTML = '';
    const bookmarks = JSON.parse(localStorage.getItem('pdfBookmarks')) || [];
    bookmarks.filter(b => b.pdfId === fileName).forEach((bookmark, index) => {
        const li = createBookmarkElement(bookmark, index);
        customBookmarksList.appendChild(li);
    });
}
function createBookmarkElement(bookmark, index) {
    const li = document.createElement('li');
    const title = escapeHtml(bookmark.title);
    li.innerHTML = `<span class="bookmark-title" title="${title}">${title}</span><span class="bookmark-page">${bookmark.page}</span><button class="edit-button" data-index="${index}">✎</button><button class="delete-button" data-index="${index}">🗑</button>`;
    li.addEventListener('click', () => { goToPage(bookmark.page); if(bookmarksMenu) bookmarksMenu.classList.remove('visible'); });
    li.querySelector('.edit-button').addEventListener('click', (e) => { e.stopPropagation(); editBookmark(index); });
    li.querySelector('.delete-button').addEventListener('click', (e) => { e.stopPropagation(); deleteBookmark(index); });
    return li;
}
function addBookmark() {
    const input = document.getElementById('bookmarkTitleInput');
    const title = input.value.trim();
    if (!title || !pdfDoc) return;
    let bookmarks = JSON.parse(localStorage.getItem('pdfBookmarks')) || [];
    bookmarks.push({ title, page: pageNum, pdfId: fileName });
    localStorage.setItem('pdfBookmarks', JSON.stringify(bookmarks));
    loadCustomBookmarks(document.getElementById('customBookmarkList'));
    input.value = '';
}
function editBookmark(index) {
    let bookmarks = JSON.parse(localStorage.getItem('pdfBookmarks')) || [];
    const newTitle = prompt('Enter new title:', bookmarks[index].title);
    if (newTitle && newTitle.trim()) {
        bookmarks[index].title = newTitle.trim();
        localStorage.setItem('pdfBookmarks', JSON.stringify(bookmarks));
        loadCustomBookmarks(document.getElementById('customBookmarkList'));
    }
}
function deleteBookmark(index) {
    if (confirm('Delete bookmark?')) {
        let bookmarks = JSON.parse(localStorage.getItem('pdfBookmarks')) || [];
        bookmarks.splice(index, 1);
        localStorage.setItem('pdfBookmarks', JSON.stringify(bookmarks));
        loadCustomBookmarks(document.getElementById('customBookmarkList'));
    }
}
function addBookmarkToList(bookmark, parentElement, level = 0) {
    const li = document.createElement('li');
    li.style.paddingLeft = `${10 + level * 15}px`;
    li.innerHTML = `<span class="bookmark-title">${escapeHtml(bookmark.title)}</span><span class="bookmark-page"></span>`;
    parentElement.appendChild(li);
    if (bookmark.dest) {
        resolveDestinationPage(bookmark.dest).then(pageIdx => {
            if (pageIdx !== null) {
                li.querySelector('.bookmark-page').textContent = `${pageIdx + 1}`;
                li.style.cursor = 'pointer';
                li.addEventListener('click', (e) => { e.stopPropagation(); goToPage(pageIdx + 1); if(bookmarksMenu) bookmarksMenu.classList.remove('visible'); });
            }
        });
    }
    if (bookmark.items?.length > 0) {
        li.classList.add('has-submenu', 'collapsed');
        const subList = document.createElement('ul');
        subList.classList.add('submenu', 'collapsed');
        li.appendChild(subList);
        li.querySelector('.bookmark-title').addEventListener('click', (e) => { e.stopPropagation(); li.classList.toggle('collapsed'); subList.classList.toggle('collapsed'); });
        bookmark.items.forEach(child => addBookmarkToList(child, subList, level + 1));
    }
}
async function resolveDestinationPage(dest) {
    if (!pdfDoc) return null;
    try {
        if (typeof dest === 'string') dest = await pdfDoc.getDestination(dest);
        if (Array.isArray(dest)) return await pdfDoc.getPageIndex(dest[0]);
    } catch (e) { console.error(e); }
    return null;
}
function clearBookmarks() { if (bookmarksContent) bookmarksContent.innerHTML = ''; }
async function searchInPDF() {
    if (!pdfDoc || !searchInput) return;
    searchTerm = searchInput.value.trim();
    if (!searchTerm) { clearSearchHighlights(); return; }
    const searchTermLower = searchTerm.toLowerCase();
    searchResultsList.innerHTML = ''; progressBar.style.width = '0%'; progressContainer.style.display = 'block';
    let matches = {};
    const searchPromises = Array.from({ length: pdfDoc.numPages }, async (_, i) => {
        const pageNumActual = i + 1;
        try {
            if (!textCache[pageNumActual]) {
                const page = await pdfDoc.getPage(pageNumActual);
                const textContent = await page.getTextContent();
                textCache[pageNumActual] = textContent.items.map(item => item.str).join(' ');
            }
            const pageTextLower = textCache[pageNumActual].toLowerCase();
            let matchIndex = pageTextLower.indexOf(searchTermLower);
            while (matchIndex !== -1) {
                if (!matches[pageNumActual]) matches[pageNumActual] = [];
                const snippetStart = Math.max(0, matchIndex - 30);
                const snippetEnd = Math.min(pageTextLower.length, matchIndex + searchTermLower.length + 70);
                let snippet = textCache[pageNumActual].substring(snippetStart, snippetEnd);
                snippet = escapeHtml(snippet).replace(new RegExp(escapeHtml(searchTerm), 'gi'), `<strong>$&</strong>`);
                matches[pageNumActual].push(`...${snippet}...`);
                matchIndex = pageTextLower.indexOf(searchTermLower, matchIndex + 1);
            }
        } catch (e) {}
        progressBar.style.width = `${((i + 1) / pdfDoc.numPages) * 100}%`;
    });
    await Promise.all(searchPromises);
    const sortedPages = Object.keys(matches).map(Number).sort((a, b) => a - b);
    if (sortedPages.length === 0) searchResultsList.innerHTML = `<li>No results found.</li>`;
    else {
        queueRenderPage(pageNum, searchTerm);
        sortedPages.forEach(pageIdx => {
            const li = document.createElement('li');
            li.innerHTML = `Pg. ${pageIdx}: ${matches[pageIdx][0]}`;
            li.addEventListener('click', () => { goToPage(pageIdx); if (searchPanel) searchPanel.classList.remove('active'); });
            searchResultsList.appendChild(li);
        });
    }
    setTimeout(() => { if (progressContainer) progressContainer.style.display = 'none'; }, 500);
}
function clearSearch() {
    searchTerm = ''; if (searchInput) searchInput.value = '';
    if (searchResultsList) searchResultsList.innerHTML = '';
    if (clearSearchButton) clearSearchButton.style.display = 'none';
    clearSearchHighlights(); queueRenderPage(pageNum);
}
function clearSearchHighlights() {
    [textLayer, secondTextLayer].forEach(layer => {
        if (!layer) return;
        layer.querySelectorAll('mark.highlight').forEach(mark => {
            const parent = mark.parentNode;
            if (parent) { parent.replaceChild(document.createTextNode(mark.textContent || ''), mark); parent.normalize(); }
        });
    });
}
function updateToggleButton() {
    if (!toggleButton) return;
    const labels = { single: 'Single Page', 'double-odd': 'Double (Odd)', 'double-even': 'Double (Even)' };
    toggleButton.textContent = labels[spreadMode] || 'Toggle Spread';
}
function changeSpreadMode(mode) {
    if (spreadMode === mode) return;
    spreadMode = mode;
    updateToggleButton();
    if (panzoomInstance) {
        if(typeof panzoomInstance.destroy === 'function') panzoomInstance.destroy();
        panzoomInstance = null;
    }
    snapAndSetZoom(1, true);
    // Re-enable if in PZ mode
    if(currentInteractionMode === 'pz') setInteractionMode('pz');
    queueRenderPage(pageNum, searchTerm);
}

// ==========================================================================
// --- BOOKSHELF (Standard) ---
// ==========================================================================
async function openBookshelf() { currentSelectedCollectionId = 'all'; await populateBookshelf(); if (bookshelfModal) bookshelfModal.style.display = 'flex'; }
function closeBookshelf() { if (bookshelfModal) bookshelfModal.style.display = 'none'; hidePdfContextMenu(); }
function renderPdfList(target, title, pdfsToRender) {
    target.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
    if (pdfsToRender.length === 0) { target.innerHTML += '<p>No PDFs found.</p>'; return; }
    const ul = document.createElement('ul'); ul.className = 'bookshelf-item-list';
    pdfsToRender.sort((a, b) => a.name.localeCompare(b.name)).forEach(pdf => {
        const li = document.createElement('li'); li.dataset.id = pdf.id;
        li.innerHTML = `<span class="item-name">${escapeHtml(pdf.name)}</span><div class="item-actions"><button class="open-pdf" data-id="${pdf.id}">Open</button><button class="delete-pdf" data-id="${pdf.id}">Delete</button></div>`;
        ul.appendChild(li);
    });
    target.appendChild(ul);
}
async function populateBookshelf() {
    if (!collectionsList || !pdfsList) return;
    try {
        const allCollections = await db.getAllCollections();
        collectionsList.innerHTML = '<h3>Collections</h3>';
        const collectionsUl = document.createElement('ul'); collectionsUl.className = 'bookshelf-item-list';
        const allPdfsLi = document.createElement('li'); allPdfsLi.innerHTML = `<span class="item-name">All PDFs</span>`; allPdfsLi.dataset.id = 'all';
        if (currentSelectedCollectionId === 'all') allPdfsLi.classList.add('active');
        collectionsUl.appendChild(allPdfsLi);
        allCollections.forEach(col => {
            const li = document.createElement('li'); li.dataset.id = col.id; if (currentSelectedCollectionId === col.id) li.classList.add('active');
            li.innerHTML = `<span class="item-name">${escapeHtml(col.name)}</span><div class="item-actions"><button class="delete-collection" data-id="${col.id}">Delete</button></div>`;
            collectionsUl.appendChild(li);
        });
        collectionsList.appendChild(collectionsUl);
        await refreshCurrentPdfListView();
    } catch (e) { collectionsList.innerHTML = '<h3>Error</h3>'; }
}
async function refreshCurrentPdfListView() {
    if (!pdfsList) return;
    const allPdfs = await db.getAllPdfs();
    if (currentSelectedCollectionId === 'all') renderPdfList(pdfsList, 'All PDFs', allPdfs);
    else {
        const selected = await db.getAllCollections().then(cols => cols.find(c => c.id === currentSelectedCollectionId));
        if (selected) renderPdfList(pdfsList, `PDFs in "${selected.name}"`, allPdfs.filter(p => selected.pdfIds.includes(p.id)));
        else { currentSelectedCollectionId = 'all'; renderPdfList(pdfsList, 'All PDFs', allPdfs); }
    }
}
async function showPdfContextMenu(pdfId, x, y) {
    if (!pdfContextMenu) return;
    pdfContextMenu.style.display = 'block'; pdfContextMenu.style.left = `${x}px`; pdfContextMenu.style.top = `${y}px`; pdfContextMenu.dataset.pdfId = pdfId;
    const submenu = pdfContextMenu.querySelector('.context-submenu'); submenu.innerHTML = '';
    const removeItem = document.createElement('div'); removeItem.className = 'context-submenu-item'; removeItem.textContent = 'Remove from current'; removeItem.dataset.collectionId = 'remove'; submenu.appendChild(removeItem); submenu.appendChild(document.createElement('hr'));
    const collections = await db.getAllCollections();
    if (collections.length === 0) submenu.innerHTML += '<div class="context-submenu-item" style="font-style:italic">(No collections)</div>';
    else collections.forEach(col => {
        const item = document.createElement('div'); item.className = 'context-submenu-item'; item.textContent = escapeHtml(col.name); item.dataset.collectionId = col.id; submenu.appendChild(item);
    });
}
function hidePdfContextMenu() { if (pdfContextMenu) pdfContextMenu.style.display = 'none'; }
async function movePdfToCollection(pdfId, targetCollectionId) {
    try {
        const allCollections = await db.getAllCollections();
        const updatePromises = [];
        for (const collection of allCollections) {
            let needsUpdate = false;
            const pdfIndex = collection.pdfIds.indexOf(pdfId);
            if (pdfIndex > -1 && collection.id !== targetCollectionId) { collection.pdfIds.splice(pdfIndex, 1); needsUpdate = true; }
            else if (collection.id === targetCollectionId && pdfIndex === -1) { collection.pdfIds.push(pdfId); needsUpdate = true; }
            if (needsUpdate) updatePromises.push(db.updateCollection(collection));
        }
        await Promise.all(updatePromises); await refreshCurrentPdfListView();
    } catch (e) { alert("Error moving PDF."); }
}

// ==========================================================================
// --- CONTEXT SELECTOR & INIT ---
// ==========================================================================
function updateChatContextUI() {
    if (!chatContextList) return; chatContextList.innerHTML = '';
    if (currentPdfId && fileName) {
        const primaryDiv = document.createElement('div'); primaryDiv.className = 'context-item primary'; primaryDiv.textContent = `(Primary) ${escapeHtml(fileName)}`; chatContextList.appendChild(primaryDiv);
    }
    chatContextDocs.forEach((doc, index) => {
        const docDiv = document.createElement('div'); docDiv.className = 'context-item'; docDiv.innerHTML = `<span>${escapeHtml(doc.name)}</span><button class="remove-context" data-index="${index}">×</button>`; chatContextList.appendChild(docDiv);
    });
}
async function openContextSelector() {
    if (!contextSelectorList || !chatContextSelector) return;
    contextSelectorList.innerHTML = 'Loading...'; chatContextSelector.style.display = 'flex';
    try {
        const allPdfs = await db.getAllPdfs();
        const availablePdfs = allPdfs.filter(pdf => pdf.id !== currentPdfId && !chatContextDocs.some(doc => doc.id === pdf.id));
        contextSelectorList.innerHTML = '';
        if (availablePdfs.length === 0) contextSelectorList.innerHTML = '<p>No other PDFs available.</p>';
        else availablePdfs.forEach(pdf => {
            const item = document.createElement('div'); item.className = 'selector-item';
            item.innerHTML = `<input type="checkbox" id="ctx-pdf-${pdf.id}" data-id="${pdf.id}" data-name="${escapeHtml(pdf.name)}"><label for="ctx-pdf-${pdf.id}">${escapeHtml(pdf.name)}</label>`;
            contextSelectorList.appendChild(item);
        });
    } catch(e) {}
}
function closeAndApplyContextSelector() {
    const checkboxes = contextSelectorList.querySelectorAll('input:checked');
    checkboxes.forEach(cb => { chatContextDocs.push({ id: parseInt(cb.dataset.id, 10), name: cb.dataset.name }); });
    updateChatContextUI(); chatContextSelector.style.display = 'none';
}

function setupEventListeners() {
    if (uploadPdfBtn) uploadPdfBtn.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', handleFileSelect, false);
    
    // Drag & Drop
    dropArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); document.body.classList.add('dragover'); });
    dropArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); document.body.classList.remove('dragover'); });
    dropArea.addEventListener('drop', async (e) => {
        e.preventDefault(); e.stopPropagation(); document.body.classList.remove('dragover');
        const file = e.dataTransfer?.files[0];
        if (file && file.type === 'application/pdf') {
            if(loadingOverlay) loadingOverlay.style.display = 'flex';
            const reader = new FileReader();
            reader.onload = async (ev) => { try { await db.addPdf(file.name, ev.target.result); await refreshCurrentPdfListView(); } catch(e){} finally { if(loadingOverlay) loadingOverlay.style.display = 'none'; } };
            reader.readAsArrayBuffer(file);
        }
    });

    if (bookshelfButton) bookshelfButton.addEventListener('click', openBookshelf);
    if (closeBookshelfBtn) closeBookshelfBtn.addEventListener('click', closeBookshelf);
    if (addCollectionBtn) addCollectionBtn.addEventListener('click', async () => {
        const name = newCollectionNameInput.value.trim(); if (!name) return;
        try { await db.addCollection(name); newCollectionNameInput.value = ''; await populateBookshelf(); } catch (e) { alert(e); }
    });
    
    // Bookshelf Clicks
    if (bookshelfModal) {
        bookshelfModal.addEventListener('click', async (e) => {
            hidePdfContextMenu();
            const target = e.target;
            const pdfAction = target.closest('.open-pdf, .delete-pdf');
            const collectionAction = target.closest('.delete-collection');
            const collectionItem = target.closest('#collections-list li');
            if (pdfAction) {
                const id = parseInt(pdfAction.dataset.id, 10);
                if (pdfAction.classList.contains('open-pdf')) { try { const pdf = await db.getPdf(id); if (pdf) { await loadPDF(pdf.data, pdf.name, pdf.id); closeBookshelf(); } } catch (e) {} }
                else if (pdfAction.classList.contains('delete-pdf')) { if (confirm("Delete PDF?")) { try { await db.deletePdf(id); if (currentPdfId === id) resetViewerState(); await populateBookshelf(); } catch (e) {} } }
            } else if (collectionAction) {
                const id = parseInt(collectionAction.dataset.id, 10); if (confirm("Delete Collection?")) { try { await db.deleteCollection(id); if (currentSelectedCollectionId === id) currentSelectedCollectionId = 'all'; await populateBookshelf(); } catch (e) {} }
            } else if (collectionItem) {
                currentSelectedCollectionId = (collectionItem.dataset.id === 'all') ? 'all' : parseInt(collectionItem.dataset.id, 10);
                await populateBookshelf();
            }
        });
        pdfsList.addEventListener('contextmenu', (e) => {
            const pdfLi = e.target.closest('li'); if (!pdfLi) return;
            e.preventDefault(); showPdfContextMenu(parseInt(pdfLi.dataset.id, 10), e.pageX, e.pageY);
        });
    }
    if (pdfContextMenu) pdfContextMenu.addEventListener('click', (e) => {
        const target = e.target.closest('.context-submenu-item');
        if (target?.dataset.collectionId) {
            movePdfToCollection(parseInt(pdfContextMenu.dataset.pdfId, 10), target.dataset.collectionId === 'remove' ? 'remove' : parseInt(target.dataset.collectionId, 10));
            hidePdfContextMenu();
        }
    });

    // Chat Context
    if (manageContextBtn) manageContextBtn.addEventListener('click', openContextSelector);
    if (closeContextSelectorBtn) closeContextSelectorBtn.addEventListener('click', closeAndApplyContextSelector);
    if (chatContextList) chatContextList.addEventListener('click', (e) => { if (e.target.classList.contains('remove-context')) { chatContextDocs.splice(parseInt(e.target.dataset.index, 10), 1); updateChatContextUI(); } });

    // Header / Panels
    if (pdfTitle) pdfTitle.addEventListener('click', openBookshelf);
    if (bookmarksButton) bookmarksButton.addEventListener('click', () => { if(bookmarksMenu) bookmarksMenu.classList.toggle('visible'); if (searchPanel) searchPanel.classList.remove('active'); });
    if (toggleSearchButton) toggleSearchButton.addEventListener('click', () => { if(searchPanel) searchPanel.classList.toggle('active'); if (searchPanel?.classList.contains('active')) searchInput?.focus(); if (bookmarksMenu) bookmarksMenu.classList.remove('visible'); });
    if (searchButton) searchButton.addEventListener('click', searchInPDF);
    if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchInPDF(); });
    if (clearSearchButton) clearSearchButton.addEventListener('click', clearSearch);
    
    // Navigation & Zoom Controls
    if (prevButton) prevButton.addEventListener('click', () => goToPage(onPrevPage(pageNum)));
    if (nextButton) nextButton.addEventListener('click', () => goToPage(onNextPage(pageNum)));
    if (toggleButton) toggleButton.addEventListener('click', () => { const modes = ['single', 'double-odd', 'double-even']; changeSpreadMode(modes[(modes.indexOf(spreadMode) + 1) % modes.length]); });
    if (themeToggle) themeToggle.addEventListener('click', () => { const ts = document.getElementById('theme-style'); if(!ts) return; const isDark = ts.href.includes('dark'); ts.href = isDark ? 'fbai_light.css' : 'fbai_dark.css'; themeToggle.innerHTML = isDark ? '🌑' : '☀️'; });
    if (zoomInButton) zoomInButton.addEventListener('click', () => adjustZoom(0.25));
    if (zoomOutButton) zoomOutButton.addEventListener('click', () => adjustZoom(-0.25));
    if (zoomSlider) zoomSlider.addEventListener('input', function() { snapAndSetZoom(parseFloat(this.value)); });
    if (pzButton) pzButton.addEventListener('click', () => setInteractionMode('pz'));
    if (tsButton) tsButton.addEventListener('click', () => setInteractionMode('ts'));

    // Chat Buttons
    if (chatToggleButton) chatToggleButton.addEventListener('click', () => { if (chatModal.style.display === 'none') { if (!pdfDoc) { alert("Load PDF first."); return; } chatModal.style.display = 'flex'; chatInput?.focus(); } else chatModal.style.display = 'none'; });
    if (chatCloseBtn) chatCloseBtn.addEventListener('click', () => chatModal.style.display = 'none');
    if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });

    // Global Events
    window.addEventListener('resize', () => { clearTimeout(window.resizeTimeout); window.resizeTimeout = setTimeout(() => { if (pdfDoc) queueRenderPage(pageNum, searchTerm); }, 150); });
    document.addEventListener('click', (e) => { if (pdfContextMenu && !pdfContextMenu.contains(e.target)) hidePdfContextMenu(); }, true);
    
    // Mode Switching via Keys
    document.addEventListener('keydown', (e) => { if (e.key === 'Shift' && !shiftKeyActive) { shiftKeyActive = true; if(currentInteractionMode === 'ts') setInteractionMode('pz'); } });
    document.addEventListener('keyup', (e) => { if (e.key === 'Shift' && shiftKeyActive) { shiftKeyActive = false; if(currentInteractionMode === 'pz' && !pzButton.classList.contains('active')) setInteractionMode('ts'); } });

    // Scroll Wheel Logic
    let scrollTimeout;
    document.addEventListener('wheel', (e) => {
        if (!pdfDoc) return;
        
        // 1. Zooming with Ctrl
        if (e.ctrlKey) {
            handleCtrlWheelZoom(e);
            return;
        }

        // 2. Navigation if mouse is over canvas
        if (isMouseOverCanvas) {
            // Only scroll pages if NOT panning (Shift held) and NOT in PZ mode active dragging
            if (shiftKeyActive || (currentInteractionMode === 'pz' && panzoomInstance)) return;

            e.preventDefault();
            let newTarget = targetPageNum;
            if (e.deltaY < 0) newTarget = onPrevPage(targetPageNum);
            else if (e.deltaY > 0) newTarget = onNextPage(targetPageNum);

            if (newTarget !== targetPageNum) {
                targetPageNum = newTarget;
                updatePageDisplayWithoutHistory(targetPageNum);
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    if (panzoomInstance) panzoomInstance.reset({ animate: false });
                    snapAndSetZoom(1, true);
                    queueRenderPage(targetPageNum, searchTerm);
                }, 300);
            }
        }
    }, { passive: false });

    if (container) {
        container.addEventListener('mouseenter', () => isMouseOverCanvas = true);
        container.addEventListener('mouseleave', () => isMouseOverCanvas = false);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Assignments (Same as before)
    pdfTitle = document.getElementById('pdf-title'); container = document.getElementById('canvasContainer'); canvas = document.getElementById('the-canvas'); ctx = canvas?.getContext('2d', { willReadFrequently: true }); chatModelSelector = document.getElementById('chat-model-selector'); toggleSearchButton = document.getElementById('toggle-search'); searchButton = document.getElementById('search-button'); searchInput = document.getElementById('search-input'); clearSearchButton = document.getElementById('clearSearch'); searchResultsList = document.getElementById('search-results-list'); searchPanel = document.getElementById('search-panel'); progressBar = document.getElementById('progress-bar'); progressContainer = document.getElementById('progress-container'); bookmarksButton = document.getElementById('bookmarksButton'); bookmarksMenu = document.getElementById('bookmarksMenu'); bookmarksContent = document.getElementById('bookmarksContent'); fileInput = document.getElementById('fileInput'); textLayer = document.getElementById('text-layer'); canvasContainer = document.querySelector('.canvas-container'); prevButton = document.getElementById('prev'); nextButton = document.getElementById('next'); pageNumDisplay = document.getElementById('page_num'); pageCountDisplay = document.getElementById('page_count'); toggleButton = document.getElementById('spread-toggle'); pzButton = document.getElementById('pan-zoom-mode'); tsButton = document.getElementById('text-select-mode'); zoomInButton = document.getElementById('zoom-in'); zoomOutButton = document.getElementById('zoom-out'); zoomSlider = document.getElementById('zoom-slider'); themeToggle = document.getElementById('theme-toggle'); dropArea = document.body; loadingOverlay = document.getElementById('loadingOverlay'); chatToggleButton = document.getElementById('chat-toggle-btn'); chatModal = document.getElementById('chat-modal'); chatLog = document.getElementById('chat-log'); chatInput = document.getElementById('chat-input'); chatSendBtn = document.getElementById('chat-send-btn'); chatCloseBtn = document.getElementById('chat-close-btn'); chatThinking = document.getElementById('chat-thinking'); chatError = document.getElementById('chat-error'); chatNotice = chatLog ? chatLog.querySelector('.chat-notice') : null;
    bookshelfButton = document.getElementById('bookshelfButton'); bookshelfModal = document.getElementById('bookshelf-modal'); closeBookshelfBtn = document.getElementById('close-bookshelf-btn'); uploadPdfBtn = document.getElementById('upload-pdf-btn'); newCollectionNameInput = document.getElementById('new-collection-name'); addCollectionBtn = document.getElementById('add-collection-btn'); collectionsList = document.getElementById('collections-list'); pdfsList = document.getElementById('pdfs-list');
    manageContextBtn = document.getElementById('manage-context-btn'); chatContextList = document.getElementById('chat-context-list'); chatContextSelector = document.getElementById('chat-context-selector'); contextSelectorList = document.getElementById('context-selector-list'); closeContextSelectorBtn = document.getElementById('close-context-selector-btn');
    pdfContextMenu = document.getElementById('pdf-context-menu');

    if (canvasContainer && !document.getElementById('second-text-layer')) {
        secondTextLayer = document.createElement('div'); secondTextLayer.id = 'second-text-layer'; secondTextLayer.className = 'textLayer'; secondTextLayer.style.display = 'none'; canvasContainer.appendChild(secondTextLayer);
    } else { secondTextLayer = document.getElementById('second-text-layer'); }

    try { await db.initDB(); } catch (e) { console.error("DB Init Failed"); return; }

    await openBookshelf();
    resetViewerState();
    
    // Default Mode
    setInteractionMode('ts');
    setupEventListeners();
});

function navigateToPage(target) { if (!window.location.href.endsWith(target)) window.location.href = target; }