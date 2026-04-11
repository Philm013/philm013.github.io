# index.html → LocalMind Migration Guide

**Source of truth:** `LocalMind.html`  
**Target:** `index.html`  
**Goal:** Replace MediaPipe inference with Hugging Face Transformers.js, add a Web Worker,
add multimodal input (camera · mic · image/audio attachments), and wire up the full agentic
feature set already present in `LocalMind.html`.

---

## Overview

| Area | index.html (current) | LocalMind.html (target) |
|---|---|---|
| Inference library | MediaPipe `LlmInference` | `@huggingface/transformers@4` |
| Runs in | Main thread | Web Worker |
| Models | 1 (MediaPipe `.task`) | 3 ONNX HF repos |
| Multimodal | ❌ | ✅ image + audio |
| Camera / mic | ❌ | ✅ |
| Token streaming | Cumulative chunks | Delta tokens |
| Thinking mode | Partial | Full `<|think|>` extraction |
| Tool system prompt | Plain text | JSON schema injection |

The migration is broken into **9 phases** in strict dependency order.
Each phase includes the exact code to add/remove/modify.

---

## Phase 1 — Remove MediaPipe Imports

### Remove
Find and delete this import (top of `<script type="module">`):

```js
import { LlmInference, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai';
```

Also delete or repurpose `REMOTE_MODEL` / `LOCAL_MODEL` constants — they reference `.task` URLs
that are no longer used.

### Note
No replacement import is needed at the top level. The HuggingFace library is imported
**inside the worker string** in Phase 3.

---

## Phase 2 — Update Model Registry

### Replace the existing `MODELS` object with

```js
const MODELS = {
  'gemma3-1b': {
    id:           'onnx-community/gemma-3-1b-it-ONNX-GQA',
    label:        'Gemma 3 1B',
    dtype:        'q4f16',
    size:         '~760 MB',
    type:         'causal',       // → AutoModelForCausalLM
    multimodal:   false,
    agentCapable: false,
    contextSize:  4096,
    genConfig:    { temperature: 0.7, top_k: 50, top_p: 0.95, max_new_tokens: 2048, repetition_penalty: 1.0 },
  },
  'gemma4-e2b': {
    id:           'onnx-community/gemma-4-E2B-it-ONNX',
    label:        'Gemma 4 E2B',
    dtype:        'q4f16',
    size:         '~1.5 GB',
    type:         'multimodal',   // → Gemma4ForConditionalGeneration
    multimodal:   true,
    agentCapable: true,
    contextSize:  8192,
    genConfig:    { temperature: 0.7, top_k: 40, top_p: 0.95, max_new_tokens: 2048, repetition_penalty: 1.1 },
  },
  'gemma4-e4b': {
    id:           'onnx-community/gemma-4-E4B-it-ONNX',
    label:        'Gemma 4 E4B',
    dtype:        'q4f16',
    size:         '~4.9 GB',
    type:         'multimodal',
    multimodal:   true,
    agentCapable: true,
    contextSize:  12288,
    genConfig:    { temperature: 0.7, top_k: 40, top_p: 0.95, max_new_tokens: 2048, repetition_penalty: 1.1 },
  },
};

let activeModelKey = localStorage.getItem('lm_active_model') || 'gemma4-e2b';
```

**Key field changes:**
- `type` must be `'causal'` or `'multimodal'` (not `'mediapipe'`)
- `dtype: 'q4f16'` is required for the worker's `from_pretrained()` call
- `id` must be a HuggingFace repo ID (not a URL)

---

## Phase 3 — Create the Inference Web Worker

This is the largest single change. The worker handles all model loading and generation.
Reference: `LocalMind.html` lines 4261–4471.

### Add `createInferenceWorker()` near the top of your script

```js
function createInferenceWorker() {
  const code = `
import {
  env, AutoTokenizer, AutoModelForCausalLM,
  AutoProcessor, Gemma4ForConditionalGeneration,
  load_image, TextStreamer, InterruptableStoppingCriteria,
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4/+esm';

env.allowLocalModels  = true;
env.localModelPath    = '/models/';
env.allowRemoteModels = true;

let processor = null, tokenizer = null, model = null, loadedType = null;
const stopping_criteria = new InterruptableStoppingCriteria();

const progress = p => self.postMessage({ type: 'progress', data: p });

async function loadCausal(modelId, dtype) {
  processor = null; tokenizer = null; model = null;
  tokenizer = await AutoTokenizer.from_pretrained(modelId, { progress_callback: progress });
  model = await AutoModelForCausalLM.from_pretrained(modelId, {
    dtype, device: 'webgpu', progress_callback: progress,
  });
  self.postMessage({ type: 'warmup' });
  await model.generate({ ...tokenizer('a'), max_new_tokens: 1 });
  loadedType = 'causal';
  self.postMessage({ type: 'ready' });
}

async function loadMultimodal(modelId, dtype) {
  processor = null; tokenizer = null; model = null;
  processor = await AutoProcessor.from_pretrained(modelId, { progress_callback: progress });
  tokenizer = processor.tokenizer;
  model = await Gemma4ForConditionalGeneration.from_pretrained(modelId, {
    dtype, device: 'webgpu', progress_callback: progress,
  });
  self.postMessage({ type: 'warmup' });
  await model.generate({ ...tokenizer('a'), max_new_tokens: 1 });
  loadedType = 'multimodal';
  self.postMessage({ type: 'ready' });
}

async function generateCausal(chatMessages, id, genConfig) {
  stopping_criteria.reset();
  try {
    const inputs = tokenizer.apply_chat_template(chatMessages, {
      add_generation_prompt: true, return_dict: true,
    });
    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true, skip_special_tokens: true,
      callback_function: text => self.postMessage({ type: 'token', token: text, id }),
    });
    const gc = genConfig || {};
    await model.generate({
      ...inputs,
      max_new_tokens:     gc.max_new_tokens     || 2048,
      do_sample:          true,
      temperature:        gc.temperature        ?? 0.7,
      top_k:              gc.top_k              ?? 50,
      top_p:              gc.top_p              ?? 0.95,
      repetition_penalty: gc.repetition_penalty ?? 1.0,
      streamer, stopping_criteria,
    });
    self.postMessage({ type: 'complete', id });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
    self.postMessage({ type: 'complete', id });
  }
}

async function generateMultimodal(chatMessages, id, attData, enableThinking, genConfig) {
  stopping_criteria.reset();
  try {
    const prompt = processor.apply_chat_template(chatMessages, {
      add_generation_prompt: true,
      enable_thinking: enableThinking || false,
    });

    const images = [], audios = [];
    for (const att of (attData || [])) {
      if (att.type === 'image') {
        const blobUrl = URL.createObjectURL(new Blob([att.data], { type: att.mimeType || 'image/jpeg' }));
        images.push(await load_image(blobUrl));
        URL.revokeObjectURL(blobUrl);
      } else if (att.type === 'audio') {
        audios.push(att.pcmData instanceof Float32Array ? att.pcmData : new Float32Array(att.pcmData));
      }
    }

    const imageArg = images.length ? (images.length === 1 ? images[0] : images) : null;
    const audioArg = audios.length ? (audios.length === 1 ? audios[0] : audios) : null;
    const inputs   = await processor(prompt, imageArg, audioArg, { add_special_tokens: false });

    const streamer = new TextStreamer(processor.tokenizer, {
      skip_prompt: true, skip_special_tokens: true,
      callback_function: text => self.postMessage({ type: 'token', token: text, id }),
    });
    const gc = genConfig || {};
    await model.generate({
      ...inputs,
      max_new_tokens:     gc.max_new_tokens     || 2048,
      do_sample:          true,
      temperature:        gc.temperature        ?? 1.0,
      top_k:              gc.top_k              ?? 64,
      top_p:              gc.top_p              ?? 0.95,
      repetition_penalty: gc.repetition_penalty ?? 1.1,
      streamer, stopping_criteria,
    });
    self.postMessage({ type: 'complete', id });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
    self.postMessage({ type: 'complete', id });
  }
}

self.addEventListener('message', async ({ data }) => {
  const { type, modelId, dtype, modelType, messages, id, attachments, enableThinking, generationConfig } = data;
  if (type === 'load') {
    try {
      if (modelType === 'multimodal') await loadMultimodal(modelId, dtype);
      else                            await loadCausal(modelId, dtype);
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message || String(err) });
    }
  } else if (type === 'generate') {
    if (loadedType === 'multimodal') await generateMultimodal(messages, id, attachments, enableThinking, generationConfig);
    else                             await generateCausal(messages, id, generationConfig);
  } else if (type === 'stop') {
    stopping_criteria.interrupt();
  }
});
`;
  return new Worker(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })), { type: 'module' });
}
```

### Add worker state variables

```js
let inferenceWorker   = null;
let workerReady       = false;
let generateResolve   = null;
let currentTokenAccum = '';
let msgIdCounter      = 0;
let currentAssistantEl = null;  // reference to the bubble being streamed into
```

### Add `attachWorkerHandlers(w)`

```js
function attachWorkerHandlers(w) {
  w.addEventListener('error', e => {
    console.error('Worker error:', e);
    showToast('Model worker crashed: ' + e.message);
    updateStatus('error', 'Worker Error');
  });

  w.addEventListener('message', ({ data }) => {
    if (data.type === 'progress') {
      const p   = data.data;
      const pct = p.progress != null ? ` ${Math.round(p.progress)}%` : '';
      if (p.status === 'downloading' || p.status === 'loading')
        updateStatus('loading', (p.name || 'Model') + pct);

    } else if (data.type === 'warmup') {
      updateStatus('loading', 'Compiling shaders…');

    } else if (data.type === 'ready') {
      workerReady = true;
      updateStatus('online', 'Ready');
      document.getElementById('chat-input').disabled = false;
      updateMultimodalUI();

    } else if (data.type === 'token') {
      currentTokenAccum += data.token;
      if (currentAssistantEl) {
        renderAssistantText(currentTokenAccum, currentAssistantEl, true);
        currentAssistantEl.scrollIntoView({ block: 'end', behavior: 'smooth' });
      }

    } else if (data.type === 'complete') {
      if (generateResolve) { generateResolve(currentTokenAccum); generateResolve = null; }

    } else if (data.type === 'error') {
      showToast('Generation error: ' + data.message);
      if (generateResolve) { generateResolve(''); generateResolve = null; }
    }
  });
}
```

### Add `loadModel(key)`

```js
function loadModel(key) {
  const m = MODELS[key];
  if (!m) return;

  if (inferenceWorker) { inferenceWorker.terminate(); inferenceWorker = null; }

  activeModelKey = key;
  workerReady    = false;
  localStorage.setItem('lm_active_model', key);
  document.getElementById('chat-input').disabled = true;
  updateStatus('loading', 'Loading model…');

  if (!m.multimodal) clearAttachments();
  updateMultimodalUI();

  inferenceWorker = createInferenceWorker();
  attachWorkerHandlers(inferenceWorker);
  inferenceWorker.postMessage({ type: 'load', modelId: m.id, dtype: m.dtype, modelType: m.type });
}
```

### Add `generateOnce()`

```js
function generateOnce(chatMessages, attData, enableThinking, genConfig) {
  return new Promise(resolve => {
    generateResolve   = resolve;
    currentTokenAccum = '';
    inferenceWorker.postMessage({
      type:             'generate',
      messages:         chatMessages,
      id:               ++msgIdCounter,
      attachments:      attData || null,
      enableThinking:   enableThinking || false,
      generationConfig: genConfig || {},
    });
  });
}
```

### Remove
Delete all references to:
- `State.inference` (and the `State` object if inference was its only purpose)
- `LlmInference.createFromOptions()`
- `FilesetResolver.forGenAiTasks()`
- `State.inference.generateResponse()`
- `mergeStreamingText()` — MediaPipe-specific cumulative text helper

### Replace stop generation

```js
// Old: State.inference.stop()
// New:
function stopGeneration() {
  if (inferenceWorker) inferenceWorker.postMessage({ type: 'stop' });
}
```

---

## Phase 4 — Rewrite the Send / Agentic Loop

The agentic loop structure (max 3 iterations, tool parsing, result appending) stays the same —
only the generation call changes from a MediaPipe callback to `generateOnce()`.

### Key structural changes

1. **Message format:** switch from `{ role, text }` to `{ role, content }` where `content` is
   a plain string for text-only or an array of content blocks for multimodal.
2. **Streaming:** MediaPipe gave cumulative text; HF Transformers.js gives delta tokens that the
   worker handler accumulates in `currentTokenAccum`.
3. **Attachments:** only passed on iteration 0 of the agentic loop.

### Rewrite `sendMessage()` (ref: LocalMind.html lines 4809–5009)

```js
async function sendMessage() {
  const text = document.getElementById('chat-input').value.trim();
  const m    = MODELS[activeModelKey];
  if (!text && attachments.length === 0) return;
  if (!workerReady) { showToast('Model not ready yet.'); return; }

  const enableThinking = document.getElementById('thinking-toggle')?.checked || false;
  const isMultimodal   = m.multimodal && attachments.length > 0;
  const isAgent        = m.agentCapable;

  // Prepare attachment data for worker transfer
  const attData = isMultimodal ? await prepareAttachmentsForWorker() : null;

  // Build user message content
  let userContent;
  if (isMultimodal && attData) {
    const blocks = [];
    for (const att of attData) {
      if (att.type === 'image') blocks.push({ type: 'image' });
      if (att.type === 'audio') blocks.push({ type: 'audio' });
    }
    if (text) blocks.push({ type: 'text', text });
    userContent = blocks;
  } else {
    userContent = text;
  }

  // Update UI: render user bubble, clear input, clear attachments
  document.getElementById('chat-input').value = '';
  renderUserMessage(userContent, attData);   // show thumbnail previews in bubble
  clearAttachments();
  conversationHistory.push({ role: 'user', content: userContent });

  // Create assistant bubble (streaming target)
  currentAssistantEl = createAssistantBubble();

  const sysPrompt    = isAgent ? buildAgentSystemPrompt() : getSystemPrompt();
  const chatMessages = buildContextMessages(conversationHistory, sysPrompt, activeModelKey);

  // ── Non-agent: single pass ──────────────────────────────────────────────
  if (!isAgent) {
    const response = await generateOnce(chatMessages, attData, enableThinking, m.genConfig);
    finishGeneration(response);
    return;
  }

  // ── Agentic loop ────────────────────────────────────────────────────────
  const MAX_ITERS    = 3;
  let loopMessages   = [...chatMessages];
  let currentAttData = attData;
  const toolsUsed    = [];

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const iterThinking = iter === 0 ? enableThinking : false;
    const response     = await generateOnce(loopMessages, currentAttData, iterThinking, m.genConfig);
    currentAttData     = null;  // attachments only on first pass

    const { toolCalls } = parseToolCalls(response);

    if (toolCalls.length === 0) {
      finishGeneration(response);
      return;
    }

    // Execute first tool call
    const tc   = toolCalls[0];
    const tool = TOOL_REGISTRY[tc.name];
    let toolResult;
    try {
      toolResult = tool ? await tool.execute(tc.arguments, { userQuery: text })
                        : { error: `Unknown tool: ${tc.name}` };
    } catch (e) {
      toolResult = { error: e.message };
    }

    toolsUsed.push(tc.name);

    // In the current bubble: keep only thinking blocks, strip filler text
    const hasThinking = /<\|think\|>/.test(response) || /<\|channel>thought/.test(response);
    if (hasThinking) {
      const { thinkContent } = extractThinking(response);
      renderAssistantText('<|think|>' + thinkContent + '<|/think|>', currentAssistantEl, false);
    } else {
      currentAssistantEl.innerHTML = '';
    }

    renderToolCallBlock(currentAssistantEl, tc.name, tc.arguments, toolResult);

    loopMessages.push({ role: 'assistant', content: response });
    loopMessages.push({ role: 'user',      content: formatToolResponse(tc.name, toolResult) });
    currentTokenAccum = '';

    if (iter === MAX_ITERS - 1) {
      loopMessages.push({ role: 'user', content: '[System: Tool call limit reached. Provide your final answer now.]' });
      const finalResponse = await generateOnce(loopMessages, null, false, m.genConfig);
      finishGeneration(finalResponse);
      return;
    }
  }
}
```

### `buildContextMessages()` — windowing

```js
function buildContextMessages(history, sysPrompt, modelKey) {
  const m           = MODELS[modelKey];
  const maxChars    = (m?.contextSize || 4096) * 4;  // ~4 chars/token estimate
  const messages    = [{ role: 'user', content: sysPrompt },
                       { role: 'assistant', content: 'Understood.' }];
  let   charCount   = sysPrompt.length;

  // Walk history newest-first, add until budget exhausted
  const recent = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const txt = typeof history[i].content === 'string'
      ? history[i].content
      : history[i].content.map(b => b.text || '').join(' ');
    charCount += txt.length;
    if (charCount > maxChars && recent.length > 0) break;
    recent.unshift(history[i]);
  }
  return messages.concat(recent);
}
```

### `finishGeneration(response)`

```js
function finishGeneration(response) {
  renderAssistantText(response, currentAssistantEl, false);
  collapseThinkingBlocks(currentAssistantEl);
  conversationHistory.push({ role: 'assistant', content: response });
  saveConversation();
  currentAssistantEl = null;
}
```

---

## Phase 5 — Multimodal Input UI

### HTML — add to the input area

```html
<!-- Attachment preview strip (above input row) -->
<div id="attachment-strip" style="display:none">
  <div id="attachment-items"></div>
</div>

<!-- Camera and mic buttons (alongside existing 📎 attach button) -->
<button id="camera-btn" class="icon-btn" title="Take photo"    style="display:none">📷</button>
<button id="mic-btn"    class="icon-btn" title="Record audio"  style="display:none">🎤</button>

<!-- Update existing file input to accept images and audio too -->
<input type="file" id="global-file-input" multiple
  accept="image/*,audio/*,video/mp4,.txt,.md,.json,.csv,.pdf,.docx">

<!-- Camera overlay modal -->
<div id="camera-overlay">
  <video id="camera-preview" autoplay playsinline></video>
  <div class="cam-controls">
    <button id="cam-capture-btn">📸 Capture</button>
    <button id="cam-cancel-btn">Cancel</button>
  </div>
</div>
```

### CSS

```css
/* Attachment strip */
#attachment-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px 0;
}
.attachment-chip {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-2);
}
.attachment-chip img {
  display: block;
  width: 60px; height: 60px;
  object-fit: cover;
}
.attachment-chip .att-label {
  padding: 6px 10px;
  font-size: 0.75rem;
  white-space: nowrap;
}
.attachment-chip .remove-att {
  position: absolute;
  top: 3px; right: 3px;
  background: rgba(0,0,0,0.55);
  color: #fff;
  border: none; border-radius: 50%;
  width: 18px; height: 18px;
  font-size: 11px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
}

/* Camera overlay */
#camera-overlay {
  display: none;
  position: fixed; inset: 0; z-index: 1000;
  background: #000;
  flex-direction: column;
  align-items: center; justify-content: center;
}
#camera-overlay.open { display: flex; }
#camera-preview {
  max-width: 100%;
  max-height: 80dvh;
  object-fit: contain;
}
.cam-controls {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* Mic recording state */
#mic-btn.recording {
  background: var(--red-500, #ef4444);
  color: #fff;
}
```

### `updateMultimodalUI()`

```js
function updateMultimodalUI() {
  const m            = MODELS[activeModelKey];
  const show         = m?.multimodal && workerReady;
  document.getElementById('camera-btn').style.display = show ? '' : 'none';
  document.getElementById('mic-btn').style.display    = show ? '' : 'none';
  const thinkRow = document.getElementById('thinking-row');
  if (thinkRow) thinkRow.style.display = m?.multimodal ? '' : 'none';
}
```

---

## Phase 6 — Attachment Handling JavaScript

Reference: `LocalMind.html` lines 3689–4073.

### Attachment state variables

```js
let attachments   = [];      // [{ type, blob, thumb, name, mimeType }]
let cameraStream  = null;
let mediaRecorder = null;
```

### Core attachment functions

```js
function addAttachment(att) {
  attachments.push(att);
  renderAttachmentStrip();
}

function removeAttachment(i) {
  if (attachments[i]?.thumb) URL.revokeObjectURL(attachments[i].thumb);
  attachments.splice(i, 1);
  renderAttachmentStrip();
}

function clearAttachments() {
  attachments.forEach(a => { if (a.thumb) URL.revokeObjectURL(a.thumb); });
  attachments = [];
  renderAttachmentStrip();
}

function renderAttachmentStrip() {
  const strip = document.getElementById('attachment-strip');
  const items = document.getElementById('attachment-items');
  items.innerHTML = '';
  if (!attachments.length) { strip.style.display = 'none'; return; }
  strip.style.display = 'flex';
  attachments.forEach((att, i) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    if (att.type === 'image') {
      const img = document.createElement('img');
      img.src = att.thumb;
      chip.appendChild(img);
    } else {
      const lbl = document.createElement('span');
      lbl.className = 'att-label';
      lbl.textContent = (att.type === 'audio' ? '🎵 ' : '📄 ') + att.name;
      chip.appendChild(lbl);
    }
    const rm = document.createElement('button');
    rm.className = 'remove-att';
    rm.textContent = '×';
    rm.onclick = () => removeAttachment(i);
    chip.appendChild(rm);
    items.appendChild(chip);
  });
}
```

### `prepareAttachmentsForWorker()`

```js
async function prepareAttachmentsForWorker() {
  const result = [];
  for (const att of attachments) {
    if (att.type === 'image') {
      result.push({ type: 'image', data: await att.blob.arrayBuffer(), mimeType: att.blob.type || 'image/jpeg' });
    } else if (att.type === 'audio') {
      // Decode to mono Float32 at 16 kHz — required by Gemma audio processor
      const raw     = await att.blob.arrayBuffer();
      const ctx     = new OfflineAudioContext(1, 1, 16000);
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      result.push({ type: 'audio', pcmData: decoded.getChannelData(0).buffer, mimeType: att.blob.type });
    }
  }
  return result;
}
```

### `handleFiles()` — route by MIME type

```js
function handleFiles(files) {
  const m = MODELS[activeModelKey];
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      if (m?.multimodal)
        addAttachment({ type: 'image', blob: file, thumb: URL.createObjectURL(file), name: file.name, mimeType: file.type });
    } else if (file.type.startsWith('audio/')) {
      if (m?.multimodal)
        addAttachment({ type: 'audio', blob: file, thumb: URL.createObjectURL(file), name: file.name, mimeType: file.type });
    } else {
      // Text / PDF / DOCX → RAG ingestion (existing behavior unchanged)
      (async () => {
        let text = '';
        if (file.name.endsWith('.pdf'))        text = await extractPDFText(file);
        else if (file.name.endsWith('.docx'))  text = await extractDOCXText(file);
        else                                   text = await file.text();
        await ingestDocument(file.name, text);
      })();
    }
  }
}
```

**Update** the existing `global-file-input` change handler to call `handleFiles(e.target.files)` instead of calling `ingestDocument()` directly.

### Camera capture

```js
document.getElementById('camera-btn').addEventListener('click', async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    document.getElementById('camera-preview').srcObject = cameraStream;
    document.getElementById('camera-overlay').classList.add('open');
  } catch (err) { showToast('Camera error: ' + err.message); }
});

document.getElementById('cam-capture-btn').addEventListener('click', () => {
  const video  = document.getElementById('camera-preview');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    if (blob) addAttachment({ type: 'image', blob, thumb: URL.createObjectURL(blob), name: 'camera-photo.jpg', mimeType: 'image/jpeg' });
    closeCameraOverlay();
  }, 'image/jpeg', 0.85);
});

document.getElementById('cam-cancel-btn').addEventListener('click', closeCameraOverlay);

function closeCameraOverlay() {
  document.getElementById('camera-overlay').classList.remove('open');
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  document.getElementById('camera-preview').srcObject = null;
}
```

### Microphone recording

```js
document.getElementById('mic-btn').addEventListener('click', async () => {
  if (mediaRecorder?.state === 'recording') { mediaRecorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorder.addEventListener('dataavailable', e => { if (e.data.size > 0) chunks.push(e.data); });
    mediaRecorder.addEventListener('stop', () => {
      stream.getTracks().forEach(t => t.stop());
      document.getElementById('mic-btn').classList.remove('recording');
      document.getElementById('mic-btn').textContent = '🎤';
      if (chunks.length) {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        addAttachment({ type: 'audio', blob, thumb: URL.createObjectURL(blob), name: 'recording.webm', mimeType: 'audio/webm' });
      }
      mediaRecorder = null;
    });
    mediaRecorder.start();
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('mic-btn').textContent = '⏹';
  } catch (err) { showToast('Microphone error: ' + err.message); }
});
```

### Clipboard paste

```js
document.addEventListener('paste', e => {
  if (!MODELS[activeModelKey]?.multimodal) return;
  for (const item of (e.clipboardData?.items || [])) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const blob = item.getAsFile();
      if (blob) addAttachment({ type: 'image', blob, thumb: URL.createObjectURL(blob), name: 'pasted-image.png', mimeType: blob.type });
    }
  }
});
```

### Drag and drop — update existing handler

```js
// Replace the existing drop handler body with:
document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  document.getElementById('drag-overlay')?.classList.remove('visible');
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
});
```

---

## Phase 7 — Agent System Prompt & Missing Tools

### Add `buildAgentSystemPrompt()` (ref: LocalMind.html lines 2413–2447)

The model must receive tool definitions in JSON schema format. Replace any plain-text tool
descriptions in the current system prompt with:

```js
function buildAgentSystemPrompt() {
  const m             = MODELS[activeModelKey];
  const webConfigured = isSearchConfigured();

  const toolDefs = Object.entries(TOOL_REGISTRY)
    .filter(([, t]) => !t.requiresWeb || webConfigured)
    .map(([name, t]) => ({
      type:     'function',
      function: { name, description: t.description, parameters: t.parameters },
    }));

  return `${getSystemPrompt()}

You have access to the following tools. Use them when they would genuinely help.
<tools>
${JSON.stringify(toolDefs, null, 2)}
</tools>

To call a tool, output EXACTLY this format in your main response (NEVER inside a thinking block):
<tool_call>
{"name": "tool_name", "arguments": {"param": "value"}}
</tool_call>

Rules:
- Call only one tool per response.
- After receiving tool results, provide your final answer directly without calling more tools unless necessary.
- Never output a tool_call inside <|think|> or <|channel>thought blocks.`;
}
```

### Add missing tools to `TOOL_REGISTRY`

These exist in LocalMind but may be absent in index.html:

```js
// Current date/time
TOOL_REGISTRY.get_current_time = {
  description: 'Get the current date and time, optionally in a specific IANA timezone.',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'IANA timezone string e.g. "America/New_York". Defaults to local timezone.' },
    },
  },
  execute(args) {
    const tz  = args.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return { datetime: new Date().toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'long' }), timezone: tz };
  },
};

// List all stored memories
TOOL_REGISTRY.list_memories = {
  description: 'List facts and memories stored in long-term memory. Optionally filter by category.',
  parameters: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Filter by category: fact, preference, finding, document (optional).' },
    },
  },
  async execute(args) {
    const all      = await getAllChunks();
    const filtered = args.category ? all.filter(c => c.category === args.category) : all;
    return { count: filtered.length, memories: filtered.map(c => ({ id: c.id, text: c.text.slice(0, 200), category: c.category })) };
  },
};

// Delete a memory chunk by ID
TOOL_REGISTRY.delete_memory = {
  description: 'Delete a specific memory chunk by its ID (use list_memories to find IDs).',
  parameters: {
    type: 'object',
    properties: { id: { type: 'string', description: 'The chunk ID to delete.' } },
    required: ['id'],
  },
  async execute(args) {
    await deleteChunk(args.id);
    return { success: true, deleted: args.id };
  },
};
```

Ensure each existing tool in `TOOL_REGISTRY` has:
- `description` — plain English, used in the system prompt
- `parameters` — valid JSON Schema object
- `requiresWeb: true` on `web_search` and `fetch_page` (so they are omitted when no search key is set)

---

## Phase 8 — Thinking Mode Rendering

Reference: `LocalMind.html` lines 4076–4143, 5018–5028.

### Key differences from MediaPipe

- HF Transformers.js streams **delta tokens** — thinking tokens arrive before `<|/think|>` closes.
- `enable_thinking` is passed to `processor.apply_chat_template()`, not injected as a prefix token.
- Thinking must be **disabled on follow-up agentic iterations** (already handled in Phase 4 with `iterThinking = iter === 0 ? enableThinking : false`).

### Add `extractThinking(text)`

```js
function extractThinking(text) {
  // New Gemma 4 format
  let match = text.match(/<\|think\|>([\s\S]*?)(<\|\/think\|>|$)/);
  if (match) return {
    thinkContent: match[1].trim(),
    mainContent:  text.replace(/<\|think\|>[\s\S]*?(<\|\/think\|>|$)/, '').trim(),
    complete:     match[2] === '<|/think|>',
  };
  // Legacy channel format
  match = text.match(/<\|channel>thought\n?([\s\S]*?)(<channel\|>|$)/);
  if (match) return {
    thinkContent: match[1].trim(),
    mainContent:  text.replace(/<\|channel>thought\n?[\s\S]*?(<channel\|>|$)/, '').trim(),
    complete:     match[2] === '<channel|>',
  };
  return { thinkContent: '', mainContent: text, complete: true };
}
```

### Add `renderAssistantText(text, bubble, isStreaming)`

This replaces whatever you currently use to update the streaming bubble.

```js
function renderAssistantText(text, bubble, isStreaming) {
  const { thinkContent, mainContent, complete } = extractThinking(text);
  bubble.innerHTML = '';

  if (thinkContent) {
    const stillOpen = isStreaming && !complete;
    const block     = document.createElement('div');
    block.className = 'thinking-block';
    block.innerHTML = `
      <div class="thinking-toggle"
           onclick="const c=this.nextElementSibling; c.classList.toggle('open');
                    this.querySelector('span').textContent = c.classList.contains('open') ? '▼' : '▶';">
        <span>${stillOpen ? '▼' : '▶'}</span>
        ${stillOpen ? 'Thinking…' : 'Thought process'}
      </div>
      <div class="thinking-content${stillOpen ? ' open' : ''}">${escapeHtml(thinkContent)}</div>
    `;
    bubble.appendChild(block);
  }

  if (mainContent) {
    const main = document.createElement('div');
    main.innerHTML = renderMarkdown(mainContent);  // your existing markdown renderer
    bubble.appendChild(main);
  } else if (!thinkContent) {
    bubble.innerHTML = '<span style="opacity:0.4">…</span>';
  }
}
```

### Add `collapseThinkingBlocks(bubble)` — call in `finishGeneration()`

```js
function collapseThinkingBlocks(bubble) {
  bubble.querySelectorAll('.thinking-content.open').forEach(el => {
    el.classList.remove('open');
    const toggle = el.previousElementSibling;
    if (!toggle) return;
    const arrow = toggle.querySelector('span');
    if (arrow) arrow.textContent = '▶';
    toggle.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.includes('Thinking'))
        n.textContent = ' Thought process';
    });
  });
}
```

### Add thinking toggle CSS

```css
.thinking-block    { margin: 8px 0; border-left: 3px solid var(--indigo-400, #818cf8); padding-left: 8px; }
.thinking-toggle   { cursor: pointer; font-size: 0.8rem; font-weight: 500; display: flex; align-items: center; gap: 6px; color: var(--indigo-400, #818cf8); }
.thinking-content  { display: none; margin-top: 6px; font-size: 0.8rem; opacity: 0.75; white-space: pre-wrap; }
.thinking-content.open { display: block; }
```

### Add thinking toggle UI element

```html
<label id="thinking-row" style="display:none; align-items:center; gap:6px; font-size:0.8rem;">
  <input type="checkbox" id="thinking-toggle">
  Enable thinking
</label>
```

```js
const thinkingToggle = document.getElementById('thinking-toggle');
thinkingToggle.checked = localStorage.getItem('lm_thinking') === 'true';
thinkingToggle.addEventListener('change', () => localStorage.setItem('lm_thinking', thinkingToggle.checked));
```

---

## Phase 9 — Model Selector & Startup Wiring

### Add model selector to header or settings panel

```html
<select id="model-select">
  <option value="gemma3-1b">Gemma 3 1B · Text only (~760 MB)</option>
  <option value="gemma4-e2b" selected>Gemma 4 E2B · Multimodal (~1.5 GB)</option>
  <option value="gemma4-e4b">Gemma 4 E4B · Multimodal (~4.9 GB)</option>
</select>
```

### Wire up selector

```js
const modelSelect    = document.getElementById('model-select');
modelSelect.value    = activeModelKey;
modelSelect.addEventListener('change', () => loadModel(modelSelect.value));
```

### Replace all MediaPipe model initialization

Find the existing init block that calls `LlmInference.createFromOptions()` (typically inside
`initModel()` or `loadApp()`). Replace the **entire** block with:

```js
loadModel(activeModelKey);
```

That single call starts the worker, triggers the HF model download/cache load, and re-enables
the UI when `'ready'` is received.

---

## Verification Checklist

After completing each phase, verify the following before moving to the next:

- [ ] **Phase 1** — No `@mediapipe/tasks-genai` references remain in the file (`grep -c mediapipe index.html` returns 0)
- [ ] **Phase 2** — `MODELS` has 3 entries; all `id` values are HF repo strings (no `.task` URLs); all have `dtype`
- [ ] **Phase 3** — Worker appears in DevTools → Application → Service Workers / Workers; model download progress shown in status bar; `'ready'` event enables the chat input
- [ ] **Phase 4** — Text message sends and streams tokens; tool calls execute and loop up to 3 times; `finishGeneration()` saves to history
- [ ] **Phase 5** — Camera/mic buttons hidden on Gemma 3 1B, visible when Gemma 4 model is ready; camera overlay opens and closes cleanly
- [ ] **Phase 6** — Attaching an image shows a thumbnail chip; sending the message with the image routes to the multimodal generate path in the worker; image is visible in the user message bubble
- [ ] **Phase 7** — Opening DevTools → Network during a tool-capable query shows the system prompt contains `<tools>[...]</tools>`; tool calls are parsed and results rendered
- [ ] **Phase 8** — A thinking-enabled response shows an expanded "Thinking…" block during streaming; it collapses to "Thought process" when streaming completes
- [ ] **Phase 9** — Switching the model select terminates the old worker (verify via DevTools → Workers), starts download of the new model, and re-enables the UI when ready

---

## Common Pitfalls

| Pitfall | Root Cause | Fix |
|---|---|---|
| `Gemma4ForConditionalGeneration is not a constructor` | Using `@huggingface/transformers@3` or older | Confirm CDN URL ends with `@4/+esm` |
| Worker fails silently on load | `modelType` field missing from `postMessage` | Ensure `modelType: m.type` is included when posting `load` |
| `processor.apply_chat_template` returns undefined | `loadCausal` was called instead of `loadMultimodal` | Check that `m.type === 'multimodal'` routes to `loadMultimodal()` |
| Audio attachment crashes the processor | Audio not decoded to 16 kHz mono PCM | Use `OfflineAudioContext(1, len, 16000)` and pass `.getChannelData(0).buffer` |
| Image thumbnails broken after send | `URL.createObjectURL` revoked too early | Only revoke in `clearAttachments()`, never before the message is rendered |
| Tool calls appear inside thinking blocks | System prompt doesn't forbid it | Add explicit rule to `buildAgentSystemPrompt()`: "NEVER output a tool_call inside a thinking block" |
| Streaming stops mid-sentence | `stopping_criteria` not reset between calls | `stopping_criteria.reset()` must be the first line of every generate function |
| Switching models doesn't reload | Old worker not terminated | Call `inferenceWorker.terminate()` before creating the new worker in `loadModel()` |
| RAG context missing from agent prompts | `buildContextMessages()` only adds history | Inject RAG results into `sysPrompt` before calling `buildContextMessages()` |
| Thinking toggle visible on Gemma 3 1B | `updateMultimodalUI()` not called after model switch | Call `updateMultimodalUI()` inside `loadModel()` and inside the worker `'ready'` handler |
