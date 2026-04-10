# PhilM013 Monorepo: JavaScript Library & Implementation Guide

This document serves as the authoritative reference for the JavaScript libraries used across this repository. It defines the "PhilM013 Standard" for imports, initialization, and lifecycle management to ensure high performance and consistency in vanilla JS applications.

---

## 🚀 1. Core Library Reference

Use these specific URLs to ensure compatibility across the monorepo.

| Library | Category | Description | When to Use |
| :--- | :--- | :--- | :--- |
| **PDF.js** | Document | Mozilla's standard for parsing and rendering PDF documents in a canvas. | Use for any PDF viewing, text extraction, or thumbnail generation. |
| **Chart.js** | Visualization | Simple yet flexible JavaScript charting for designers & developers. | Use for dashboards, financial reports, or tracking student progress. |
| **PeerJS** | P2P / Sync | Simplifies WebRTC peer-to-peer data, video, and audio calls. | Use for real-time collaborative sessions (e.g., shared boards, P2P chat). |
| **Tailwind CSS** | Styling | A utility-first CSS framework for rapid UI development. | Use for all modern UI styling to avoid writing custom CSS. |
| **Iconify** | Icons | Unified SVG icon framework (supports Material, FontAwesome, etc.). | Use for all UI icons; it's more lightweight than loading full icon sets. |
| **Google AI** | AI (Gemini) | Official SDK for interacting with Google's Gemini generative AI models. | Use for document analysis, chat assistants, and automated data tagging. |
| **D3.js** | Visualization | A library for manipulating documents based on data using SVG, HTML, and CSS. | Use for complex, custom data visualizations like Knowledge Maps. |
| **OpenCV.js** | Computer Vision | A JavaScript binding for the world's most popular computer vision library. | Use for image processing, object detection, and document cropping. |
| **HLS.js** | Video Streaming | A JavaScript library that implements an HTTP Live Streaming client. | Use for playing `.m3u8` video streams in standard HTML5 video tags. |
| **Pako** | Compression | High-speed zlib port to JavaScript, supporting Gzip. | Use for decompressing large data files (like EPG guides) on the client side. |
| **XLSX (SheetJS)** | Spreadsheet | The standard for reading, writing, and manipulating Excel/Spreadsheet files. | Use for data imports/exports between the web app and Excel. |
| **Leaflet** | Maps | The leading open-source JavaScript library for mobile-friendly interactive maps. | Use for location-based games (SnapHunt) or geographic data displays. |
| **CodeMirror** | Editor | A versatile text editor implemented in JavaScript for the browser. | Use for code editing, Markdown editors, or syntax-highlighted inputs. |
| **TinyMCE** | Rich Text | A rich-text editor that provides a "Word-like" experience for web content. | Use when users need to create formatted articles or educational resources. |
| **DOMPurify** | Security | A DOM-only, super-fast, uber-tolerant XSS sanitizer for HTML. | **Mandatory** when rendering user-generated HTML or AI-generated content. |
| **Canvas Confetti** | UI / FX | A high-performance, canvas-based confetti animation library. | Use for "success" feedback or rewarding student achievements. |
| **Bootstrap** | UI Framework | The world's most popular framework for building responsive, mobile-first sites. | Use only for legacy project compatibility or specific component layouts. |
| **SortableJS** | UI / D&D | A JavaScript library for reorderable drag-and-drop lists. | Use for organizing cards, reordering tasks, or managing playlists. |
| **jsPDF** | Export | A library to generate PDF files directly in the browser. | Use for creating downloadable PDF reports or certificates. |
| **html2canvas** | Export | Screenshot a part of the DOM and render it into a canvas. | Use as a bridge between HTML/CSS and image/PDF exports. |
| **Fuse.js** | Search | A lightweight fuzzy-search library with zero dependencies. | Use for fast, client-side searching across lists of objects. |
| **JSZip** | Utilities | A library for creating, reading and editing .zip files with JavaScript. | Use for bulk-exporting multiple files (images, PDFs) in a single archive. |
| **NW.js** | Desktop Runtime | Native desktop runtime that combines Chromium + Node.js. | Use when packaging browser apps as installable desktop applications. |

---

## 📄 2. Document & PDF Processing

### **PDF.js (Mozilla)**
*   **What it is:** A web standards-based platform for parsing and rendering PDFs.
*   **Why use it:** It allows for client-side PDF viewing without plugins. It provides deep access to text layers for AI indexing and search.
*   **Implementation Pattern:** You **must** set the worker source before any operations.
    ```javascript
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    async function loadPdf(buffer) {
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: window.devicePixelRatio || 1 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        return canvas;
    }
    ```

### **Export Suite (jsPDF + html2canvas)**
*   **What it is:** A combination of a DOM "photographer" (`html2canvas`) and a PDF generator (`jsPDF`).
*   **Why use it:** `jsPDF` alone is poor at rendering complex CSS. By capturing a canvas of the DOM first, we ensure the exported PDF looks exactly like the on-screen UI.
*   **Standard Export:**
    ```javascript
    const target = document.querySelector('#capture-area');
    const canvas = await html2canvas(target, { useCORS: true, scale: 2 });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jspdf.jsPDF('p', 'px', [canvas.width, canvas.height]);
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save('Document.pdf');
    ```

---

## 🌐 3. Real-Time Collaboration (P2P)

### **PeerJS**
*   **What it is:** A wrapper for WebRTC that handles signaling and peer discovery.
*   **Why use it:** To enable real-time collaboration without a centralized database or socket server. It's ideal for private, student-to-student sharing.
*   **ID Strategy:** Avoid collisions by using a structured ID: `{APP_PREFIX}-{SESSION_ID}-{USER_ID}`.
*   ```javascript
    const peer = new Peer(`IOS-${classCode}-${visitorId}`, { debug: 1 });
    
    peer.on('connection', (conn) => {
        conn.on('open', () => {
            conn.send({ type: 'SYNC_STATE', payload: App.state });
        });
        conn.on('data', (data) => {
            if (data.type === 'BROADCAST') updateLocalUI(data.payload);
        });
    });
    ```

---

## 🤖 4. AI Integration (Google Gemini)

### **Google Generative AI SDK**
*   **What it is:** The official client for the Gemini API.
*   **Why use it:** To leverage multimodal AI (text, images, PDFs) directly in the browser.
*   **Recommended Models (2026 Standard):** 
    *   `gemini-3-flash-preview`: Primary for fast, responsive interactions.
    *   `gemini-3-pro-preview`: For complex reasoning, coding, and multi-file analysis.
*   **Mandate:** UI implementations **MUST** provide a model selector populated via `listModels()` to prevent hardcoding deprecated model names.
    ```javascript
    const sdkUrl = "https://cdn.jsdelivr.net/npm/@google/generative-ai/dist/index.mjs";
    const module = await import(sdkUrl);
    const genAI = new module.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    ```

---

## 📸 5. Computer Vision & Media

### **OpenCV.js**
*   **What it is:** A port of the C++ OpenCV library to JavaScript/WebAssembly.
*   **Why use it:** For high-performance image analysis tasks that would be too slow in pure JS, such as finding card edges in a camera feed or auto-cropping photos.
*   **Implementation:**
    ```javascript
    cv['onRuntimeInitialized'] = () => {
        const src = cv.imread(canvasInput);
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    };
    ```

### **HLS.js (Video Streaming)**
*   **What it is:** Implements HLS (HTTP Live Streaming) on top of standard HTML5 video.
*   **Why use it:** To support professional video streaming formats in the browser without requiring native HLS support (which is missing in many desktop browsers).
    ```javascript
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(videoElement);
    }
    ```

---

## 📊 6. Spreadsheet & Data Management

### **XLSX (xlsx-js-style)**
*   **What it is:** A parser and writer for various spreadsheet formats.
*   **Why use it:** It's the only reliable way to generate complex Excel files (`.xlsx`) with cell styling entirely in the browser.
*   **Standard Export:**
    ```javascript
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Report.xlsx");
    ```

---

## 🎨 7. Global Styling & UI

### **Tailwind CSS (CDN)**
*   **What it is:** A utility-first CSS framework.
*   **Why use it:** It drastically reduces the size of custom CSS and enforces a consistent design system (spacing, colors, typography) across all projects.
*   **Customization:** Define shared colors in the `index.html` head to maintain brand consistency.

### **SortableJS**
*   **What it is:** A library for drag-and-drop.
*   **Why use it:** It works seamlessly with touch devices and provides smooth, native-feeling animations for list reordering.
    ```javascript
    new Sortable(container, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'bg-blue-100' // Tailwind integration
    });
    ```

---

## 🛡️ 8. PhilM013 Architectural Mandates

1.  **SPA Lifecycle Management:** If a library adds event listeners or creates DOM instances (Chart, Sortable, Peer, Panzoom), you **MUST** provide a cleanup function to be called before switching views or "closing" the app.
2.  **CORS Awareness:** Always set `useCORS: true` in `html2canvas` and handle `crossOrigin="anonymous"` for remote images to prevent security taints.
3.  **Data Persistence:** Library data should flow into `IndexedDB` (via `db.js`) or `LocalStorage`. Avoid holding large PDF blobs in global JS variables.
4.  **UI Separation:** Keep library-specific logic (e.g., PeerJS connection management) in a separate `service` or `module` file rather than polluting the main UI logic.

---
*Generated: March 11, 2026*
