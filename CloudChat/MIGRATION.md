# CloudChat Migration PRD: `index.html` ← LocalMind

**Version:** 1.0  
**Reference Source:** `LocalChatExampleComprehensive.html` (LocalMind)  
**Target File:** `index.html` (Gemma 4 Ultimate)  
**Lines of Source:** 4,428 (LocalMind) vs. 493 (index.html)

---

## Executive Summary

`index.html` is a working skeleton of a MediaPipe-based on-device chat app with a sidebar, panels, and three basic agent tools. `LocalChatExampleComprehensive.html` (LocalMind) is a fully realized private AI assistant built on the same MediaPipe stack. This document is a complete feature-by-feature audit identifying every feature gap, the exact source code to reference, and guidance on how to integrate each one into `index.html`.

---

## Table of Contents

1. [Feature Inventory](#1-feature-inventory)
2. [Gap Analysis — What's Missing](#2-gap-analysis)
3. [Feature Migration Specs](#3-feature-migration-specs)
   - F01 — WebGPU Availability Check
   - F02 — RAG Embedding Worker (MiniLM)
   - F03 — IndexedDB Vector Store & Conversation History
   - F04 — Full Agent Tool Registry
   - F05 — Web Search Integration (Brave / Tavily / SearXNG)
   - F06 — Complete Document Processing Pipeline
   - F07 — Folder Ingestion (File System API)
   - F08 — Agentic Loop with Context Budget
   - F09 — Memory Inspector Panel (with Audit)
   - F10 — Batch Prompts Engine
   - F11 — Encrypted Share Links
   - F12 — Save Response as Markdown (with Folder Write)
   - F13 — Thinking Mode Toggle
   - F14 — Response Source Badges
   - F15 — Toast Notifications
   - F16 — Drag & Drop File Ingestion
   - F17 — Auto-Backup on New Chat
   - F18 — Help Popover (Tabbed)
   - F19 — Model Cache Info & Clear UI
   - F20 — Conversation Restore (History Panel Logic)
4. [Already Implemented in index.html](#4-already-implemented)
5. [Dependency & Library Notes](#5-dependency--library-notes)
6. [Implementation Order (Suggested)](#6-implementation-order)

---

## 1. Feature Inventory

Full feature list extracted from LocalMind (`LocalChatExampleComprehensive.html`):

| # | Feature | Category | Status in index.html |
|---|---------|----------|----------------------|
| F01 | WebGPU availability check with graceful error | Infrastructure | ❌ Missing |
| F02 | MiniLM Embedding Worker (via Transformers.js) | RAG/AI | ❌ Missing |
| F03 | IndexedDB vector store (`chunks`, `profile`, `conversations`) | Data | ❌ Missing |
| F04 | Full tool registry: `store_memory`, `search_memory`, `set_reminder`, `list_memories`, `delete_memory` | Agent | ⚠️ Partial (3 of 9 tools) |
| F05 | Web search: Brave / Tavily / SearXNG with API key management | Search | ❌ Missing |
| F06 | PDF extraction (lazy PDF.js), DOCX extraction (lazy Mammoth), extractive summary, RAG ingestion | Docs | ⚠️ Partial (no RAG) |
| F07 | Folder ingestion via `showDirectoryPicker` with file fingerprinting | Docs | ❌ Missing |
| F08 | Agentic loop (3 iterations), `buildContextMessages` sliding window, tool step indicator | AI | ⚠️ Partial (no loop, no budget) |
| F09 | Memory inspector: category pills, source grouping, text search, bulk delete, memory audit | UI | ⚠️ Panel exists, no logic |
| F10 | Batch prompts: run sequentially, `{{previous}}` substitution, chain mode, stop | UI | ⚠️ Panel exists, no logic |
| F11 | Encrypted share links (AES-256-GCM + PBKDF2), import banner | Sharing | ❌ Missing |
| F12 | "Save as MD" per response, code block download button, folder-integrated write | Export | ❌ Missing |
| F13 | Thinking mode toggle (user checkbox), collapse-on-finish behavior | UX | ⚠️ Parsing exists, no toggle |
| F14 | Response source badges (On-device / Agent / Web-enriched + source links) | UX | ❌ Missing |
| F15 | `showToast()` non-blocking notifications | UX | ❌ Missing (`alert()` used) |
| F16 | Drag & drop file ingestion with visual overlay | UX | ❌ Missing |
| F17 | Auto-backup toggle (download full JSON on New Chat) | Data | ❌ Missing |
| F18 | Multi-tab help popover (About / Models / Features / Things to Try + click-to-paste) | UX | ❌ Missing |
| F19 | Model cache info viewer (size in MB) + "Clear cache" button | Settings | ⚠️ Purge exists, no size info |
| F20 | Conversation resume from history sidebar | UX | Panel exists, no logic |
| F21 | RAG auto-inject into chat system prompt | AI | ❌ Missing |
| F22 | Post-session summarization (embed conversation on New Chat) | AI | ❌ Missing |
| F23 | `sessionStorage` chat persistence across tab refreshes | Data | ❌ Missing |
| F24 | User profile store (`profile` IndexedDB object store) | Data | ❌ Missing |
| F25 | Stop generation button (toggle send btn to ■ stop) | UX | ❌ Missing |
| F26 | Lightweight custom Markdown renderer (with thinking & tool block support) | Render | ⚠️ Uses marked.js instead |

---

## 2. Gap Analysis

### Critical Missing Systems (Blockers for Feature Parity)

1. **RAG System (F02, F03, F21)** — The entire embedding/vector-search pipeline is absent. Without it, tools like `store_memory`, `search_memory`, and document ingestion have nowhere to persist or retrieve data.

2. **Agentic Loop + Context Budget (F08)** — The current `handleSend` does one generation pass. Tool calls require a multi-turn loop and a sliding-window context builder to fit within the model's 8K context.

3. **Toast System (F15)** — Multiple features (doc ingestion, folder, export, share, cache clear) all rely on `showToast()`. Must be added before those features work correctly.

4. **IndexedDB Schema (F03)** — index.html only has a `model_cache` store. LocalMind uses a 3-store schema: `chunks` (vectors), `profile` (user working memory), and `conversations` (history).

---

## 3. Feature Migration Specs

---

### F01 — WebGPU Availability Check

**Priority:** High  
**Reference:** `LocalChatExampleComprehensive.html` lines 1804–1818

**What it does:** Before loading anything, checks `navigator.gpu`. If absent, renders an error UI in the chat area and throws to halt the module script.

**Code to Port (verbatim):**
```js
// ── WebGPU check ─────────────────────────────
const hasWebGPU = !!navigator.gpu;
if (!hasWebGPU) {
  document.getElementById('chat-container').innerHTML = `
    <div class="webgpu-error">
      <div style="font-size:2rem;margin-bottom:12px">⚠</div>
      <h2>WebGPU Not Available</h2>
      <p>This app requires WebGPU to run the AI model in your browser.
      Please use Chrome 113+, Edge 113+, or Firefox 130+ on a device with a compatible GPU.</p>
    </div>`;
  updateStatus('error', 'Not supported');
  throw new Error('WebGPU not available');
}
```

**Integration Notes:**  
- Place at the very top of the `<script type="module">` block, before any imports resolve.
- The error div class `webgpu-error` needs a CSS rule added (text-align center, padding, red color). Reference LocalMind lines 1447–1463 for the exact CSS.
- Map `chat-container` to index.html's `<main id="chat-container">`.

---

### F02 — RAG Embedding Worker (MiniLM)

**Priority:** Critical (blocks F04 memory tools, F06 docs, F09 memory panel)  
**Reference:** `LocalChatExampleComprehensive.html` lines 2360–2453

**What it does:** Spawns a `Worker` (created from a Blob URL) that loads `Xenova/all-MiniLM-L6-v2` via Transformers.js in WASM mode. Provides serialized `embedTexts(texts[])` which returns float arrays.

**Code to Port:**
```js
// ── RAG: Embedding Worker (MiniLM, WASM/CPU) ─────────────
let embeddingWorker = null;
let embeddingReady = false;
let embeddingQueue = Promise.resolve();

function createEmbeddingWorker() {
  const code = `
import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4/+esm';
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.allowRemoteModels = true;
let embedder = null;
self.addEventListener('message', async (e) => {
  const { type, texts, id } = e.data;
  if (type === 'load') {
    try {
      embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        device: 'wasm',
        progress_callback: (p) => self.postMessage({ type: 'progress', data: p }),
      });
      self.postMessage({ type: 'ready' });
    } catch (err) { self.postMessage({ type: 'error', message: err.message }); }
  } else if (type === 'embed') {
    try {
      const results = [];
      for (const text of texts) {
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        results.push(Array.from(output.data));
      }
      self.postMessage({ type: 'embeddings', vectors: results, id });
    } catch (err) { self.postMessage({ type: 'error', message: err.message, id }); }
  }
});`;
  const blob = new Blob([code], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob), { type: 'module' });
}
```

**Key functions to port:** `ensureEmbeddingWorker()`, `embedTexts(texts)` — lines 2413–2453.

**Integration Notes:**
- The worker is lazy-started: `ensureEmbeddingWorker()` is called the first time embedding is needed (on first document upload, first send with RAG, etc.). Do not start it on page load.
- `embeddingQueue` serializes all embed calls to prevent race conditions.
- The worker downloads `~23MB` on first run; no UI feedback needed beyond a toast.

---

### F03 — IndexedDB Vector Store & Conversation History

**Priority:** Critical  
**Reference:** `LocalChatExampleComprehensive.html` lines 2455–2599

**What it does:**
- Opens `localmind_rag` (v2) with three object stores: `chunks`, `profile`, `conversations`.
- `chunks` stores embedded text fragments with `{id, text, embedding, category, source, timestamp}`.
- `conversations` stores full chat sessions with `{id, title, messages, modelKey, updated}`.
- `profile` stores user working memory `{key, name, preferences, facts}`.

**Core DB functions to port:**
```
openRAGDB()             — lines 2459–2480
storeChunks(chunks)     — lines 2482–2491
getAllChunks()          — lines 2493–2501
deleteChunk(id)         — lines 2503–2511
clearAllChunks()        — lines 2513–2521
saveConversation()      — lines 2528–2554
getAllConversations()    — lines 2557–2565
getConversation(id)     — lines 2567–2575
deleteConversation(id)  — lines 2577–2582
exportAllData()         — lines 2584–2587
importData(data)        — lines 2589–2600
cosineSimilarity(a, b)  — lines 2602–2610
searchByVector()        — lines 2612–2620
getProfile()            — lines 2623–2631
saveProfile()           — lines 2633–2641
chunkText()             — lines 2644–2668
embedAndStore()         — lines 2670–2684
searchMemory()          — lines 2686–2689
```

**Integration Notes:**
- index.html currently uses `LocalMind_Model_Cache_v1` for model blob storage. Keep that DB separate — it handles model caching, not RAG.
- The new `localmind_rag` DB should coexist alongside the existing `LocalMind_Model_Cache_v1` DB.
- DB version is 2; the `onupgradeneeded` handler creates all three stores.
- `chunkText(text, maxChars=900, overlapChars=200)` uses sentence-boundary splitting with overlap — this is important for retrieval quality. Port it exactly.
- `cosineSimilarity` must be kept as a plain synchronous function (not async) since it's called in tight loops during audit.

---

### F04 — Full Agent Tool Registry

**Priority:** High  
**Reference:** `LocalChatExampleComprehensive.html` lines 1852–1993 (base tools) + 2131–2172 (web tools)

**Currently in index.html:** `calculate`, `get_current_time`, `fetch_page` (basic, uses eval directly)

**Missing tools to add:**

| Tool | Source Lines | Description |
|------|-------------|-------------|
| `store_memory` | 1885–1901 | Embeds and stores fact/preference/finding via `embedAndStore()` |
| `search_memory` | 1902–1924 | Semantic search over stored chunks via `searchMemory()` |
| `set_reminder` | 1926–1953 | Browser `Notification` + `showToast` after N minutes |
| `list_memories` | 1955–1973 | Returns chunk count by category + 5 most recent |
| `delete_memory` | 1975–1993 | Semantic search → delete matches with score ≥ 0.5 |
| `web_search` | 2131–2152 | Multi-provider search (requires search config) |
| `fetch_page` | 2154–2172 | Full Readability.js extraction with semantic pre-filter |

**Fix for `calculate` (security hardening):**  
LocalMind's version avoids `eval()` entirely:
```js
// Reference: line 1862–1866
const expr = String(args.expression).replace(/[^0-9+\-*/.()% ]/g, '');
const result = Function('"use strict"; return (' + expr + ')')();
```
index.html uses raw `eval()` — replace with the `Function` constructor pattern.

**Fix for `fetch_page`:**  
LocalMind's version lazy-loads `Readability.js` and performs a semantic pre-filter using embeddings if available (lines 2085–2129). The basic `allorigins.win` proxy is kept as fallback.

**Integration Notes:**
- `web_search` and `fetch_page` should be registered as `requiresWeb: true` and only included in the tool schema when `isSearchConfigured()` returns true.
- Memory tools (`store_memory`, `search_memory`, `list_memories`, `delete_memory`) depend on F02 (embedding) and F03 (DB) being active.
- `set_reminder` needs a `showToast()` call (F15 must be ported first).

---

### F05 — Web Search Integration

**Priority:** Medium  
**Reference:** `LocalChatExampleComprehensive.html` lines 1995–2069 (providers) + 2798–2837 (settings UI)

**What it does:**
- Supports three providers: **Brave Search**, **Tavily**, **SearXNG** (self-hosted).
- API key stored in `localStorage` (`lm_search_provider`, `lm_search_key`, `lm_searxng_url`).
- A second send button (🌐) appears when search is configured — clicking it pre-runs a search, injects results into the system prompt, then generates normally.

**Providers to port:**
```js
SearchProviders.brave(query, apiKey)   // lines 2016–2025
SearchProviders.tavily(query, apiKey)  // lines 2026–2036
SearchProviders.searxng(query, url)    // lines 2038–2047
```

**Helper functions:**
```js
parseApiError(res, provider)  // lines 1996–2013 — human-readable HTTP error messages
getSearchConfig()             // lines 2049–2054
isSearchConfigured()          // lines 2056–2061
executeWebSearch(query)       // lines 2063–2069
```

**HTML to add inside `#settings-panel`:**
```html
<div id="searchSettingsSection">
  <label for="searchProvider">Web search provider</label>
  <select id="searchProvider">
    <option value="none">None (offline only)</option>
    <option value="tavily">Tavily (free tier, no card)</option>
    <option value="brave">Brave Search (privacy-first)</option>
    <option value="searxng">SearXNG (self-hosted)</option>
  </select>
  <div id="apiKeyRow">
    <label for="searchApiKey">API key</label>
    <input type="password" id="searchApiKey" placeholder="Paste your API key">
  </div>
  <div id="searxngUrlRow">
    <label for="searxngUrl">SearXNG instance URL</label>
    <input type="text" id="searxngUrl" placeholder="https://searx.example.com">
  </div>
</div>
```

**Add 🌐 send button** next to the existing ➤ button in `#input-row`.

**Integration Notes:**
- The 🌐 button should only be visible when `isSearchConfigured() && MODELS[activeKey].agentCapable`.
- Web search results are also cached into RAG (`embedAndStore(snippetText, 'finding', 'web-search')`).
- The `fetch_page` tool (F04) uses a semantic pre-filter via embeddings when available.

---

### F06 — Complete Document Processing Pipeline

**Priority:** High  
**Reference:** `LocalChatExampleComprehensive.html` lines 3360–3571

**Current state in index.html:** File input exists, PDF.js + Mammoth loaded at startup, but files are never processed or stored anywhere.

**Functions to port:**

| Function | Lines | Notes |
|----------|-------|-------|
| `handleFiles(files)` | 3369–3408 | Routes by extension to text/PDF/DOCX handlers |
| `ensurePDFJS()` | 3498–3512 | Lazy-loads PDF.js module (not at startup) |
| `ensureMammoth()` | 3514–3525 | Lazy-loads Mammoth |
| `extractPDFText(blob)` | 3527–3538 | Returns `{text, pageCount}` |
| `extractDOCXText(blob)` | 3540–3545 | Returns raw text string |
| `extractiveSummary(text, n=3)` | 3547–3557 | Sentence scoring for summaries |
| `ingestDocument(fileName, textPromise)` | 3559–3571 | Full pipeline: embed + summary + toast |

**Integration Notes:**
- Remove the eager `<script>` tags for PDF.js and Mammoth from `<head>` — LocalMind lazy-loads them only when a PDF/DOCX is uploaded (saves ~600KB on initial page load).
- `handleFiles` must call `embedAndStore()` (F02/F03) — requires RAG to be set up first.
- Text files (.txt, .md, .json, .csv) are ingested directly via `file.text()`.
- The file input accept attribute should be `.txt,.md,.json,.csv,.pdf,.docx`.
- Each document gets two entries in RAG: one as `category: 'document'` (chunked full text) and one as `category: 'document_summary'` (3-sentence extractive summary).

---

### F07 — Folder Ingestion (File System API)

**Priority:** Medium  
**Reference:** `LocalChatExampleComprehensive.html` lines 3410–3493

**What it does:**
- Button opens `showDirectoryPicker()`.
- Recursively walks the folder, ingesting all `.md`, `.txt`, `.pdf`, `.docx` files.
- Uses `lastModified + size` as a fingerprint stored in `localStorage` (`lm_folder_fp`) to skip unchanged files on re-open.
- Button turns highlighted (`.folder-open`) while a folder is open.
- When a folder is open, "Save as MD" buttons on responses write directly to that folder.

**HTML to add** (alongside `docsBtn` in the actions bar):
```html
<button class="btn-icon" id="folderBtn" title="Open folder">Folder</button>
```

**CSS for folder-open state** (LocalMind line 645–648):
```css
.btn-icon.folder-open {
  background: var(--indigo-100);
  color: var(--indigo-600);
}
```

**State variable:** `let dirHandle = null;` — must be accessible from both the folder button handler and the "Save as MD" button logic.

**Integration Notes:**
- `showDirectoryPicker` is only supported in Chromium-based browsers. Show a toast for unsupported browsers.
- Fingerprint logic prevents re-embedding files that haven't changed — critical for large vaults.
- The `walk` function is recursive and handles nested directories.

---

### F08 — Agentic Loop with Context Budget

**Priority:** Critical  
**Reference:** `LocalChatExampleComprehensive.html` lines 2290–2358 (context) + 3838–4042 (send/loop)

**Current state in index.html:** Single-pass generation. Tool calls are parsed and a recursive `handleSend(true)` is called — fragile, no iteration cap, no context management.

**Core functions to port:**

**1. Token budget helper:**
```js
function approxTokens(text) {
  return Math.ceil(String(text).length / 3.5);
}
```

**2. Sliding window context builder:**
```js
// Reference: lines 2299–2358
let conversationSummary = '';

function buildContextMessages(allMessages, systemPrompt, modelKey) {
  const maxCtx = MODELS[modelKey]?.contextSize || 4096;
  const budgetForHistory = maxCtx - 2048 - 300;
  // ... (port full function including pair-grouping and summary injection)
}
```

**3. Agentic loop inside `sendMessage()`:**
```js
// Reference: lines 3973–4041
const MAX_TOOL_ITERATIONS = 3;
let loopMessages = [...chatMessages];
for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
  const response = await generateOnce(loopMessages, ...);
  const { toolCalls, cleanText } = parseToolCalls(response);
  if (toolCalls.length === 0) { finishGeneration(response, ...); return; }
  // execute tool, render tool block, push to loopMessages, continue
}
```

**4. Robust `parseToolCalls(text)`:**  
The current index.html parser is a simple regex. LocalMind's version (lines 2210–2270) adds:
- Bare JSON fallback (model omits `<tool_call>` tags)
- Tool call buried inside thinking block fallback
- `repairAndParseJSON()` for trailing commas, single quotes, unquoted keys

**5. `renderToolCallBlock(bubble, toolName, args, result)`:**  
Renders a collapsible block (lines 3876–3890) — replaces the basic `renderToolBadge()` in index.html.

**6. `generateOnce(chatMessages, enableThinking, genConfig)`:**  
Replace the `State.inference.generateResponse(buildPrompt(), ...)` call with the proper Gemma chat template (lines 3838–3874):
```js
// Format Gemma chat template
let prompt = "";
for (const msg of chatMessages) {
  const role = msg.role === 'assistant' ? 'model' : msg.role;
  prompt += `<start_of_turn>${role}\n${msg.content}<end_of_turn>\n`;
}
prompt += `<start_of_turn>model\n`;
```

**7. Stop generation:**  
Replace the current disabled `send-btn` with a toggle that sets `generating = false` (line 4119–4127). The MediaPipe API doesn't support mid-stream cancellation directly; setting the flag causes the loop to exit after the current chunk resolves.

**Integration Notes:**
- The `buildPrompt()` function in index.html currently uses a custom Gemma turn format — replace with the standard `<start_of_turn>`/`<end_of_turn>` template which LocalMind uses.
- `MODELS[key].contextSize` must be set on the model registry entry (8192 for Gemma 4 E2B).
- Post-generation: summarize the last 10 messages and store as `category: 'conversation'` on New Chat (lines 3318–3328).

---

### F09 — Memory Inspector Panel (with Audit)

**Priority:** High  
**Reference:** `LocalChatExampleComprehensive.html` lines 2839–3185

**Current state in index.html:** The `#memory-panel` overlay has a `#memory-list` div and an "Audit Outliers" button but zero logic wired up.

**Functions to port:**

| Function | Lines | Description |
|----------|-------|-------------|
| `refreshMemoryPanel()` | 2908–3003 | Fetch all chunks, filter, render with category pills and source groups |
| `makeChunkItem(chunk, showCat)` | 2885–2906 | Renders a single memory row with delete button |
| `relTime(ts)` | 2865–2874 | "3d ago" relative time helper |
| `srcBasename(src)` | 2876–2879 | Strips path to filename |
| `catBadgeHtml(cat)` | 2881–2883 | `<span class="mem-cat mem-cat-fact">` helper |
| `runMemoryAudit()` | 3040–3094 | Pairwise cosine similarity → stale/dupe/outlier sets |
| `renderAuditResults()` | 3097–3134 | Renders the three audit sections |
| `makeAuditSection()` | 3145–3185 | Individual audit section with bulk delete |
| `rerunAudit()` | 3136–3143 | Re-runs audit after a deletion |

**HTML changes to `#memory-panel` overlay:**
```html
<div class="memory-header">
  <strong>Local Memory (RAG)</strong>
  <span class="memory-count" id="memoryCount">0 chunks</span>
</div>
<div class="memory-search-row">
  <input type="text" id="memorySearch" placeholder="Search memories..." class="memory-search-input">
  <button class="btn-icon" id="memoryClearAll">Clear All</button>
</div>
<div class="memory-cat-pills" id="memoryCatPills"></div>
<div class="memory-list" id="memoryList"></div>
<div class="memory-search-row" style="margin-top:8px;border-top:...;padding-top:8px">
  <button class="btn-icon" id="memoryExport">Export</button>
  <button class="btn-icon" id="memoryImport">Import</button>
  <button class="btn-icon" id="memoryAuditBtn">Audit</button>
  <input type="file" id="importFileInput" accept=".json" style="display:none">
</div>
```

**CSS to add:** Category badge colors (lines 1037–1042), memory item styles (lines 990–1025), audit section styles (lines 1052–1086), category pill styles (lines 915–935), source group styles (lines 937–982).

**Integration Notes:**
- The audit uses pairwise cosine similarity which is O(n²) — capped at 600 chunks (`CAP = 600`). Port that cap.
- `memoryCatFilter` state variable must be module-level: `let memoryCatFilter = 'all';`
- `auditMode` state variable: `let auditMode = false;`
- The Export/Import buttons need `memoryExport`, `memoryImport`, and `importFileInput` event listeners (lines 3187–3217).

---

### F10 — Batch Prompts Engine

**Priority:** Medium  
**Reference:** `LocalChatExampleComprehensive.html` lines 4143–4235

**Current state in index.html:** The `#batch-panel` overlay HTML exists but no JS is wired up.

**Functions to port:**

```js
parseBatchPrompts()         // line 4163–4165
updateBatchCount()          // lines 4167–4171
batchRunBtn click handler   // lines 4181–4235
batchStopBtn click handler  // lines 4175–4179
```

**Variables to add:**
```js
let batchRunning = false;
let batchShouldStop = false;
```

**`{{previous}}` substitution logic** (lines 4204–4210):
```js
// Explicit substitution
if (i > 0 && lastResponse) {
  prompt = prompt.replace(/\{\{previous\}\}/g, lastResponse);
}
// Auto-inject chain (if no explicit placeholder)
if (batchChainToggle.checked && i > 0 && lastResponse && !prompts[i].includes('{{previous}}')) {
  prompt = `${prompt}\n\n[Previous response for context:\n${lastResponse}\n]`;
}
```

**HTML changes to `#batch-panel`:**  
Add `id="batchTextarea"`, `id="batchCount"`, `id="batchProgress"`, `id="batchRunBtn"`, `id="batchStopBtn"`, `id="batchChainToggle"`.

**Integration Notes:**
- Batch runner calls `sendMessage()` in a `for` loop — requires `sendMessage` to be a standalone `async function` (not `window.handleSend`) that returns a promise resolved when generation ends.
- `batchRunBtn.disabled` should be controlled by `updateBatchCount()` which checks `modelReady && !batchRunning`.

---

### F11 — Encrypted Share Links

**Priority:** Medium  
**Reference:** `LocalChatExampleComprehensive.html` lines 4237–4422

**What it does:**
- "Share" button opens a modal.
- User optionally checks "Encrypt with passphrase".
- "Generate" button encodes conversation as `#lm:<base64>` (plain) or `#lme:<salt>.<iv>.<cipher>` (AES-256-GCM, PBKDF2 200k iterations).
- On page load, if URL hash matches those patterns, an import banner appears.

**Crypto functions to port:**
```js
b64ToArr(b64)                     // line 4243
arrToB64(arr)                     // line 4246
deriveKey(passphrase, salt)       // lines 4249–4257
encryptPayload(json, passphrase)  // lines 4260–4267
decryptPayload(encoded, pass)     // lines 4269–4277
buildConversationPayload()        // lines 4279–4286
checkShareLink()                  // lines 4369–4385
```

**HTML to add:**
- Share modal: `#shareBackdrop` → `.share-modal` with passphrase checkbox, URL input, Generate + Copy + Close buttons (lines 1772–1790).
- Import banner: `#importBanner` fixed top bar with message, optional password input, Load + Dismiss buttons (lines 1763–1769).

**Integration Notes:**
- `crypto.subtle` is available in all modern browsers but only on HTTPS/localhost. No external library needed.
- `buildConversationPayload()` serializes only text content (blobs are stripped).
- The `shareBtn` should be disabled (or show a toast) when `messages.length === 0`.
- `checkShareLink()` must be called at the end of module init (after model is loaded and history is restored).

---

### F12 — Save Response as Markdown

**Priority:** Medium  
**Reference:** `LocalChatExampleComprehensive.html` lines 4080–4106

**What it does:**  
Each assistant response bubble gets a "Save as MD" button. If `dirHandle` is set (F07 folder is open), it writes directly to the folder using the File System Access API. Otherwise it triggers a download.

**Code to port (inside `finishGeneration()`):**
```js
if (response && response.length > 20) {
  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-md-btn';
  saveBtn.textContent = dirHandle ? `Save to ${dirHandle.name}` : 'Save as MD';
  saveBtn.addEventListener('click', async () => {
    const filename = `response-${new Date().toISOString().slice(0, 16).replace(/:/g, '')}.md`;
    if (dirHandle) {
      const fh = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write(response);
      await writable.close();
      showToast(`Saved to ${dirHandle.name}/${filename}`);
    } else {
      const blob = new Blob([response], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    }
  });
  bubble.appendChild(saveBtn);
}
```

**Code block download button** — added inline during Markdown rendering (LocalMind line 3655–3656):
```js
return `<pre><code id="${codeId}">${escapeHtml(code.trim())}</code>
        <button class="code-download-btn" onclick="downloadCodeBlock('${codeId}','${ext}')"
        title="Download">↓</button></pre>`;
```

**CSS for `.save-md-btn`:** lines 385–401. For `.code-download-btn`: lines 365–383.

---

### F13 — Thinking Mode Toggle

**Priority:** Low  
**Reference:** `LocalChatExampleComprehensive.html` lines 1656–1659, 3612–3680

**What it does:**
- A checkbox in Settings labeled "Show reasoning (thinking mode)" — only visible for agent-capable models.
- When checked, the `<|think|>` / `<|channel>thought` block is rendered as a collapsible "Thought process" section.
- After generation finishes, all open thinking blocks are collapsed (lines 4050–4062).

**Integration Notes:**
- index.html already has `parseThought()` but it always renders the thought block. Add a check: `if (!thinkingToggle.checked) { skip thought rendering; }`.
- The thinking row should be hidden by default and shown only when `MODELS[activeModelKey].agentCapable`.
- `thinkingRow.classList.toggle('hidden', !isAgent)` — reference line 3355.

---

### F14 — Response Source Badges

**Priority:** Medium  
**Reference:** `LocalChatExampleComprehensive.html` lines 4063–4079

**What it does:** After generation, the first child of the assistant bubble gets a badge:
- `<span class="msg-source-badge on-device">On-device</span>` — no tools, no web.
- `<span class="msg-source-badge" style="...indigo...">Agent</span>` — tools used but no web.
- `<span class="msg-source-badge web-enriched">Web-enriched · N sources</span>` + source link block.

**CSS** for badge styles: lines 818–855.

**Integration Notes:**
- The badge is inserted at `bubble.insertBefore(badge, bubble.firstChild)`.
- Source links appear below the response text, not at the top.
- `allSources` is accumulated during the agentic loop and passed into `finishGeneration()`.

---

### F15 — Toast Notifications

**Priority:** Critical (required by many features)  
**Reference:** `LocalChatExampleComprehensive.html` lines 3573–3580

**Code to port (verbatim — it's tiny):**
```js
function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
    'background:var(--ollama-near-black);color:white;padding:10px 20px;border-radius:8px;' +
    'font-size:0.82rem;z-index:1000;opacity:0;transition:opacity 0.3s';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.style.opacity = '1');
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
```

**Integration Notes:**
- Replace all `alert()` calls in index.html with `showToast()`.
- Adjust `bottom` offset to clear the mobile nav bar (`80px` works when nav-height is 72px).
- The color variables should match index.html's CSS variable names (`--ollama-near-black` instead of `--gray-800`).

---

### F16 — Drag & Drop File Ingestion

**Priority:** Low  
**Reference:** `LocalChatExampleComprehensive.html` lines 3582–3610

**What it does:** Tracks `dragenter`/`dragleave` with a counter (handles child-element re-fires) and shows a dashed overlay. On `drop`, calls `handleFiles(e.dataTransfer.files)`.

**HTML to add** inside the chat card:
```html
<div class="drag-overlay" id="dragOverlay">Drop files to ingest</div>
```

**CSS for drag overlay** (lines 1427–1444):
```css
.drag-overlay {
  display: none; position: absolute; inset: 0; z-index: 50;
  background: rgba(102, 126, 234, 0.08); border: 2px dashed var(--indigo-500);
  align-items: center; justify-content: center; font-size: 0.9rem;
  color: var(--indigo-500); font-weight: 500; pointer-events: none;
}
.drag-overlay.visible { display: flex; }
```

**Integration Notes:**
- The event listeners attach to `document.querySelector('.card')` or `document.querySelector('.main-screen')` — map to index.html's main content area.
- Requires F06 (handleFiles) to be implemented.

---

### F17 — Auto-Backup on New Chat

**Priority:** Low  
**Reference:** `LocalChatExampleComprehensive.html` lines 3309–3343

**What it does:**
- A toggle in Settings: "Auto-download backup on New Chat".
- State stored in `localStorage('lm_auto_backup')`.
- When "New Chat" is clicked, if toggle is on and there are messages, `exportAllData()` → JSON blob → download.

**HTML to add to settings panel:**
```html
<label class="toggle-row">
  <input type="checkbox" id="autoBackupToggle">
  Auto-download backup on New Chat
</label>
```

**Integration Notes:**
- Wire to the existing "New Chat" button logic.
- Requires F03 (`exportAllData()`).

---

### F18 — Help Popover (Tabbed)

**Priority:** Medium  
**Reference:** `LocalChatExampleComprehensive.html` lines 1504–1624 (HTML) + 2715–2741 (JS)

**What it does:** A `?` button in the header opens a floating popover with four tabs: About, Models, Features (full feature list with UL items), and Things to Try (clickable example prompts).

**HTML:** See lines 1509–1623 for the full help popover structure.  
**CSS:** Lines 77–211.  
**JS:** 24 lines (tab switching + click-to-paste prompts) at lines 2716–2741.

**Integration Notes:**
- Update the "About", "Models", and "Features" tab content to describe index.html's capabilities as they expand.
- The `try-prompt` click handler uses `data-prompt` attribute and dispatches an `input` event to trigger auto-resize.
- The popover uses `e.stopPropagation()` + `document.addEventListener('click', close)` for outside-click dismissal.

---

### F19 — Model Cache Info & Clear UI

**Priority:** Low  
**Reference:** `LocalChatExampleComprehensive.html` lines 2751–2796

**Current state in index.html:** Has `purgeCache()` which deletes the IndexedDB model blob. LocalMind uses the **Cache API** (for Transformers.js), which is different.

**Integration Notes:**
- index.html's model is stored in IndexedDB (blob). LocalMind's MiniLM embedding model is stored in the **Cache API** (via Transformers.js).
- The `refreshCacheInfo()` function (lines 2753–2792) queries `caches.keys()` for entries containing "transformers" to find Transformers.js cached models.
- After adding the embedding worker (F02), add the cache info section to Settings — it shows total MB and a "Clear model cache" button for the Transformers.js cache.
- The existing `purgeCache()` for the MediaPipe model blob should remain separate.

---

### F20 — Conversation Restore (History Panel Logic)

**Priority:** High  
**Reference:** `LocalChatExampleComprehensive.html` lines 3219–3344

**Current state in index.html:** History panel overlay exists with `#history-list` div but no JS logic.

**Functions to port:**

| Function | Lines | Description |
|----------|-------|-------------|
| `openHistorySidebar()` | 3227–3233 | Adds 'open' class, calls `refreshHistoryPanel()` |
| `closeHistorySidebar()` | 3235–3238 | Removes 'open' class |
| `refreshHistoryPanel()` | 3247–3284 | Fetches all convs, renders items with title/meta/delete |
| `resetChatUI()` | 3286–3294 | Clears messages, new ID, empties chat area |
| `resumeConversation(conv)` | 3296–3306 | Loads messages array, re-renders all bubbles |
| `renderRestoredMessages()` | 3700–3721 | Renders all messages from `messages[]` array |
| `saveChat()` | 3754–3759 | Persists `messages[]` to `sessionStorage` |
| `newChatBtn` handler | 3314–3344 | Archive → post-session summary → auto-backup → reset |

**State variable:** `let activeConversationId = null;`  
**Helper:** `function newConversationId() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }`

**Integration Notes:**
- index.html uses `State.history[]` for conversation turns. Refactor to `let messages = []` (LocalMind pattern) for consistency with all ported code.
- `sessionStorage.setItem('localmind_chat', ...)` allows chat to survive tab refreshes.
- On page load, restore from `sessionStorage` before calling `renderRestoredMessages()`.

---

## 4. Already Implemented

The following features from LocalMind are **already present** in `index.html`:

| Feature | index.html Implementation | Notes |
|---------|--------------------------|-------|
| MediaPipe LlmInference boot | `initGemma()` lines 244–343 | ✅ Works; LocalMind's `loadModel()` is cleaner |
| IndexedDB model blob cache | `DB` object lines 202–230 | ✅ Different store name than LocalMind |
| Model rescue / download UI | `#model-rescue` overlay | ✅ Not in LocalMind (which uses Cache API) |
| Streaming token render | `State.inference.generateResponse(...)` | ✅ Works; LocalMind's `generateOnce()` is cleaner |
| Thought block parsing | `parseThought()` lines 407–412 | ✅ Partial — uses Gemma channel format |
| Tool call parsing (basic) | `parsePartialTool()` + regex in `handleSend` | ⚠️ Works for simple cases; LocalMind's is more robust |
| Tool registry (3 tools) | `TOOL_REGISTRY` lines 346–350 | ⚠️ Missing 6 tools, `eval()` security issue |
| Desktop sidebar + mobile nav | Full sidebar layout | ✅ Better than LocalMind's single-card layout |
| Overlay panel system | `showPanel()` / `hidePanels()` | ✅ index.html has a richer panel system |
| System prompt textarea | `#system-prompt` | ✅ Present |
| Slash menu | `handleSlash()` lines 458–483 | ✅ Not in LocalMind — index.html exclusive feature |
| Auto-resize textarea | `oninput` handler line 485–488 | ✅ Present |
| Persistent storage request | `requestPersistentStorage()` | ✅ Not in LocalMind |
| MathJax support | Script tag in `<head>` | ✅ Not in LocalMind |

---

## 5. Dependency & Library Notes

| Library | index.html | LocalMind | Action |
|---------|------------|-----------|--------|
| `@mediapipe/tasks-genai` | ✅ CDN import | ✅ CDN import | No change |
| `marked.min.js` | ✅ `<script>` in head | ❌ Custom renderer | Optional: replace with LocalMind's custom renderer for lighter build and thinking/tool block integration |
| `dompurify/purify.min.js` | ✅ `<script>` in head | ❌ Uses `escapeHtml()` | Keep for XSS safety; add `escapeHtml()` utility alongside |
| `mammoth@1.8.0` | ✅ Eager load in head | ✅ Lazy-loaded | Change to lazy-load (saves ~300KB on initial load) |
| `pdfjs-dist@4.4.168` | ✅ Eager module in head | ✅ Lazy-loaded | Change to lazy-load |
| `mathjax@3` | ✅ Async in head | ❌ Not present | Keep |
| `@huggingface/transformers@4` | ❌ Missing | ✅ Worker blob import | Add (F02) |
| `@mozilla/readability@0.5.0` | ❌ Missing | ✅ Lazy-loaded in `ensureReadability()` | Add with F04 `fetch_page` tool |

---

## 6. Implementation Order

Implement features in this order to minimize broken intermediate states:

### Phase 1 — Infrastructure (unblocks everything else)
1. **F15** Toast notifications — 10 lines, unblocks user feedback
2. **F01** WebGPU check — 15 lines, safety net
3. **F03** IndexedDB schema — DB helpers, unblocks all data features
4. **F02** Embedding Worker — unblocks RAG, memory tools, doc ingestion

### Phase 2 — Core AI Features
5. **F08** Agentic loop + context budget — replaces fragile recursive handleSend
6. **F04** Full tool registry — add 6 missing tools (requires F02/F03)
7. **F21+F22** RAG auto-inject + post-session summary — requires F02/F03/F08

### Phase 3 — Document & Data
8. **F06** Document processing pipeline — requires F02/F03
9. **F20** Conversation history logic — requires F03
10. **F09** Memory inspector logic — requires F02/F03

### Phase 4 — Search & Sharing
11. **F05** Web search integration — requires F08
12. **F11** Encrypted share links — independent, add Share modal
13. **F12** Save as Markdown + code download — requires finishGeneration refactor

### Phase 5 — UX Polish
14. **F10** Batch prompts engine — requires sendMessage refactor from Phase 2
15. **F14** Response source badges — requires F08
16. **F13** Thinking mode toggle — small change
17. **F16** Drag & drop — requires F06
18. **F07** Folder ingestion — requires F06
19. **F17** Auto-backup — requires F03/F20
20. **F18** Help popover — standalone HTML/CSS/JS
21. **F19** Model cache info UI — small addition to settings

---

*Document generated by comparing `index.html` (493 lines) against `LocalChatExampleComprehensive.html` (LocalMind, 4,428 lines) at revision audit date 2026-04-10.*
