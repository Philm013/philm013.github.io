# JavaScript Libraries Guide

This document is the streamlined reference for JavaScript libraries used across this repository.

## Library Matrix

Each row includes:
- official documentation link
- when to use the library
- basic how-to usage

| Library | Category | Official Link | When to Use | Basic How To Use |
| --- | --- | --- | --- | --- |
| PDF.js | Document/PDF | [Docs](https://mozilla.github.io/pdf.js/) | PDF rendering, text extraction, thumbnails | Load `pdfjsLib`, set `GlobalWorkerOptions.workerSrc`, then call `pdfjsLib.getDocument(...)`. |
| Chart.js | Visualization | [Docs](https://www.chartjs.org/docs/latest/) | Dashboards and quick charts | Include Chart.js and create `new Chart(ctx, { type, data, options })`. |
| PeerJS | Real-time/P2P | [Docs](https://peerjs.com/docs/) | Browser-to-browser collaboration | Create `new Peer(id, config)` and handle `connection`, `data`, and `open` events. |
| Tailwind CSS | Styling | [Docs](https://tailwindcss.com/docs/installation/play-cdn) | Utility-first UI styling | Add Tailwind Play CDN in `<head>`, then compose utility classes in markup. |
| Iconify | Icons | [Docs](https://iconify.design/docs/) | Lightweight icon usage | Load Iconify and use icons like `<iconify-icon icon="mdi:home"></iconify-icon>`. |
| Google AI (Gemini SDK) | AI | [Docs](https://ai.google.dev/gemini-api/docs/libraries#javascript) | Gemini-powered analysis/chat | Install/import `@google/generative-ai`, create client, then call model generate methods. |
| D3.js | Visualization | [Docs](https://d3js.org/) | Custom/advanced data visualizations | Import D3, bind data, then render/update SVG/DOM selections. |
| OpenCV.js | Computer Vision | [Docs](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) | Image processing and detection | Wait for OpenCV runtime init, then use `cv.imread`, transforms, and `cv.imshow`. |
| HLS.js | Video Streaming | [Docs](https://github.com/video-dev/hls.js/) | `.m3u8` playback in non-native browsers | If `Hls.isSupported()`, create `new Hls()`, `loadSource`, and `attachMedia(video)`. |
| Pako | Compression | [Docs](https://nodeca.github.io/pako/) | Gzip/zlib compression and decompression | Import pako and call `pako.inflate(...)` or `pako.gzip(...)`. |
| XLSX (SheetJS) | Spreadsheet | [Docs](https://docs.sheetjs.com/) | Read/write Excel files | Use `XLSX.utils` to create sheets/books, then `XLSX.writeFile(...)`. |
| Leaflet | Maps | [Docs](https://leafletjs.com/) | Interactive map views | Create map with `L.map(...)`, add tile layer, then add markers/polylines. |
| CodeMirror | Editor | [Docs](https://codemirror.net/docs/) | In-browser code/markdown editing | Initialize editor from an element and configure language/extensions. |
| TinyMCE | Rich Text | [Docs](https://www.tiny.cloud/docs/) | WYSIWYG content editing | Load TinyMCE and call `tinymce.init({ selector: ... })`. |
| DOMPurify | Security | [Docs](https://github.com/cure53/DOMPurify) | Sanitizing unsafe HTML | Always pass untrusted HTML through `DOMPurify.sanitize(...)` before rendering. |
| Canvas Confetti | UI/FX | [Docs](https://www.npmjs.com/package/canvas-confetti) | Celebration/success effects | Import confetti and call `confetti({ particleCount, spread, origin })`. |
| Bootstrap | UI Framework | [Docs](https://getbootstrap.com/docs/5.3/getting-started/introduction/) | Legacy compatibility and prebuilt components | Include Bootstrap CSS/JS bundle and use Bootstrap class/component patterns. |
| SortableJS | Drag and Drop | [Docs](https://sortablejs.github.io/Sortable/) | Reorderable lists/cards | Create `new Sortable(container, { animation, handle, ... })`. |
| jsPDF | Export | [Docs](https://github.com/parallax/jsPDF) | Programmatic PDF export | Create `new jsPDF(...)`, add text/images, then `save(...)`. |
| html2canvas | Export | [Docs](https://html2canvas.hertzen.com/) | DOM-to-canvas capture | Call `html2canvas(target, options)` and use returned canvas/image data. |
| Fuse.js | Search | [Docs](https://www.fusejs.io/) | Client-side fuzzy search | Initialize `new Fuse(data, options)` and call `fuse.search(query)`. |
| JSZip | Utilities | [Docs](https://stuk.github.io/jszip/) | Read/build zip files in browser/Node | Create zip with `new JSZip()`, add files, then `generateAsync(...)`. |
| NW.js | Desktop Runtime | [Docs](https://nwjs.io/) | Desktop packaging of web apps | Add `package.json` manifest and run app with NW.js runtime. |

## Baseline Integration Standards

Use these standards across apps unless a project has explicit exceptions.

1. Prefer official docs above over third-party snippets.
2. Pin versions for reproducibility (CDN versioned URL or lockfile dependency).
3. Wrap initialization in app lifecycle hooks (`DOMContentLoaded`, component mount, etc.).
4. Handle teardown for stateful libs (destroy charts, editors, streams, listeners).
5. Sanitize untrusted HTML with DOMPurify before any render.
6. Keep model/runtime IDs configurable (do not hardcode soon-to-expire IDs).

## Common Quick Patterns

### PDF.js

```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
```

### Chart.js

```javascript
new Chart(ctx, {
  type: 'bar',
  data: { labels, datasets },
  options: { responsive: true }
});
```

### PeerJS

```javascript
const peer = new Peer(`APP-${sessionId}-${visitorId}`, { debug: 1 });
peer.on('connection', (conn) => {
  conn.on('open', () => conn.send({ type: 'SYNC_STATE', payload: state }));
  conn.on('data', (data) => handleMessage(data));
});
```

### Tailwind CSS

```html
<script src="https://cdn.tailwindcss.com"></script>
<!-- then use utility classes directly -->
<div class="p-4 grid gap-3 bg-white rounded-lg shadow">...</div>
```

### Iconify

```html
<script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>
<iconify-icon icon="mdi:home"></iconify-icon>
```

### Google AI (Gemini SDK)

```javascript
const module = await import('https://cdn.jsdelivr.net/npm/@google/generative-ai/dist/index.mjs');
const genAI = new module.GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
```

### D3.js

```javascript
d3.select('#chart')
  .selectAll('rect')
  .data(dataset)
  .join('rect')
  .attr('width', d => xScale(d.value))
  .attr('height', yScale.bandwidth());
```

### OpenCV.js

```javascript
cv['onRuntimeInitialized'] = () => {
  const src = cv.imread(canvasInput);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
};
```

### HLS.js

```javascript
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(videoUrl);
  hls.attachMedia(videoElement);
}
```

### Pako

```javascript
const decompressed = pako.inflate(gzipBytes, { to: 'string' });
```

### XLSX (SheetJS)

```javascript
const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Report');
XLSX.writeFile(wb, 'Report.xlsx');
```

### Leaflet

```javascript
const map = L.map('map').setView([lat, lng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
L.marker([lat, lng]).addTo(map).bindPopup('Here');
```

### CodeMirror

```javascript
import { EditorView, basicSetup } from 'codemirror';
const editor = new EditorView({
  parent: document.querySelector('#editor'),
  extensions: [basicSetup]
});
```

### TinyMCE

```javascript
tinymce.init({ selector: '#editor', menubar: false });
```

### DOMPurify

```javascript
const safeHtml = DOMPurify.sanitize(untrustedHtml);
container.innerHTML = safeHtml;
```

### Canvas Confetti

```javascript
confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
```

### Bootstrap

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<button class="btn btn-primary">Click</button>
```

### SortableJS

```javascript
new Sortable(container, {
  handle: '.drag-handle',
  animation: 150,
  ghostClass: 'bg-blue-100'
});
```

### jsPDF

```javascript
const pdf = new jsPDF();
pdf.text('Hello World', 20, 20);
pdf.save('report.pdf');
```

### html2canvas + jsPDF

```javascript
const canvas = await html2canvas(document.querySelector('#capture-area'), { scale: 2 });
const pdf = new jspdf.jsPDF('p', 'px', [canvas.width, canvas.height]);
pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
pdf.save('export.pdf');
```

### Fuse.js

```javascript
const fuse = new Fuse(items, { keys: ['title', 'description'] });
const results = fuse.search(query);
```

### JSZip

```javascript
const zip = new JSZip();
zip.file('readme.txt', 'Hello');
const blob = await zip.generateAsync({ type: 'blob' });
```

### NW.js

```json
// package.json
{ "name": "my-app", "main": "index.html" }
```
```bash
nw .
```

## Notes

- This file is the quick implementation reference.
- Project-specific constraints still belong in each app's README/design docs.
- If a new library is added, include: official link, use case, and basic how-to row in this matrix.
