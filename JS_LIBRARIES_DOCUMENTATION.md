# PhilM013 Monorepo: JavaScript Library & Implementation Guide

This document serves as the authoritative reference for the JavaScript libraries used across this repository. It defines the "PhilM013 Standard" for imports, initialization, and lifecycle management to ensure high performance and consistency in vanilla JS applications.

---

## 🚀 1. Core CDN Reference (The "Cheat Sheet")

Use these specific URLs to ensure compatibility across the monorepo.

| Library | Category | CDN URL (Stable Versions) |
| :--- | :--- | :--- |
| **PDF.js** | Document | `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js` |
| **Chart.js** | Visualization | `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js` |
| **PeerJS** | P2P / Sync | `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` |
| **Tailwind CSS** | Styling | `https://cdn.tailwindcss.com` |
| **Iconify** | Icons | `https://code.iconify.design/3/3.1.0/iconify.min.js` |
| **Google AI** | AI (Gemini) | `https://cdn.jsdelivr.net/npm/@google/generative-ai/dist/index.mjs` |
| **SortableJS** | UI / D&D | `https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js` |
| **jsPDF** | Export | `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` |
| **html2canvas** | Export | `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js` |
| **html2pdf.js** | Export | `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js` |
| **Fuse.js** | Search | `https://cdn.jsdelivr.net/npm/fuse.js@7.0.0` |
| **JSZip** | Utilities | `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js` |

---

## 📄 2. Document & PDF Processing Standards

### **PDF.js (Mozilla)**
*   **Initialization:** You **must** set the worker source before any operations.
*   **Implementation Pattern:**
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
*   **Pro Tip:** In `FlipbookAI`, a local worker is used to ensure offline support in Termux.

### **Export Suite (jsPDF + html2canvas)**
*   **Pattern:** Use `html2canvas` to "freeze" a DOM state, then `jsPDF` to wrap it.
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
*   **ID Strategy:** Avoid collisions by using a structured ID: `{APP_PREFIX}-{SESSION_ID}-{USER_ID}`.
*   **Implementation (The InquiryOS Sync Engine):**
    ```javascript
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
*   **Lifecycle:** Always `peer.destroy()` when the session ends or the app view changes.

---

## 🤖 4. AI Integration (Google Gemini)

### **Google Generative AI SDK**
*   **Dynamic Loading:** Load as an ESM module to avoid global namespace pollution, or use the "PhilM Standard" loader in `index.html`.
*   **Recommended Models (2026 Standard):** 
    *   `gemini-3-flash-preview`: Primary for fast, responsive interactions.
    *   `gemini-3-pro-preview`: For complex reasoning, coding, and multi-file analysis.
*   **Dynamic Model Listing:** Always fetch available models to ensure compatibility with the user's API key and region.
*   **Implementation Pattern:**
    ```javascript
    // 1. Fetch available models
    async function listModels(apiKey) {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await resp.json();
        // Filter for models that support content generation
        return data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
    }

    // 2. Initialize with selected model
    const sdkUrl = "https://cdn.jsdelivr.net/npm/@google/generative-ai/dist/index.mjs";
    const module = await import(sdkUrl);
    const genAI = new module.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        systemInstruction: "You are a helpful assistant..."
    });

    // 3. For document analysis:
    const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Pdf, mimeType: "application/pdf" } }
    ]);
    ```
*   **Mandate:** UI implementations **MUST** provide a model selector populated via `listModels()` to prevent hardcoding deprecated model names (like the legacy `gemini-1.5` series).

---

## 📊 5. UI, Charts & Interactions

### **Chart.js**
*   **Pattern:** **Mandatory cleanup.** Failure to `.destroy()` will cause overlapping tooltips and memory leaks.
    ```javascript
    if (window.activeChart) window.activeChart.destroy();
    window.activeChart = new Chart(ctx, config);
    ```

### **SortableJS**
*   **Pattern:** Use `handle` for touch-friendly interfaces.
    ```javascript
    new Sortable(container, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'bg-blue-100', // Integration with Tailwind
        onEnd: () => saveOrderToDB()
    });
    ```

### **Panzoom**
*   **Pattern:** Often used on the PDF canvas. Toggle with "Selection Mode" to allow text highlighting.
    ```javascript
    const pz = Panzoom(container, { 
        maxScale: 5, 
        minScale: 1, 
        contain: 'outside' 
    });
    container.addEventListener('wheel', pz.zoomWithWheel);
    ```

---

## 🎨 6. Global Styling Standards

### **Tailwind CSS (CDN)**
*   **Customization:** Define shared colors in the `index.html` head to maintain brand consistency.
    ```javascript
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    primary: '#2563eb',   // PhilM Blue
                    secondary: '#7c3aed', // PhilM Purple
                    accent: '#f59e0b'
                }
            }
        }
    }
    ```

### **Iconify**
*   **Usage:** Prefer over Font Awesome for weight reduction.
    ```html
    <span class="iconify text-primary" data-icon="mdi:flask-outline"></span>
    ```

---

## 🛡️ 7. PhilM013 Architectural Mandates

1.  **SPA Lifecycle Management:** If a library adds event listeners or creates DOM instances (Chart, Sortable, Peer, Panzoom), you **MUST** provide a cleanup function to be called before switching views or "closing" the app.
2.  **CORS Awareness:** Always set `useCORS: true` in `html2canvas` and handle `crossOrigin="anonymous"` for remote images to prevent security taints.
3.  **Data Persistence:** Library data should flow into `IndexedDB` (via `db.js`) or `LocalStorage`. Avoid holding large PDF blobs in global JS variables; fetch from DB only when needed.
4.  **UI Separation:** Keep library-specific logic (e.g., PeerJS connection management) in a separate `service` or `module` file (e.g., `sync-peer.js`, `aiService.js`) rather than polluting the main UI logic.

---
*Generated: March 11, 2026*
