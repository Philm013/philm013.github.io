// ── Application Entry Point ───────────────────────────────────
import { REMOTE_MODEL, State } from './config.js';
import { openRAGDB, storeChunks, getAllChunks, cosineSimilarity, deleteChunk, extractPDFText, extractDOCXText } from './rag.js';
import { isSearchConfigured } from './search.js';
import { TOOL_REGISTRY, ensureToolSkillDocsLoaded } from './tools.js';
import {
  updateSendButtons, showToast,
  refreshToolsPanel, refreshLibraryPanel, refreshHistoryPanel, refreshMemoryPanel,
  restoreFromSession, ingestDocument,
  renderRestoredMessages,
  hideInputMenu, showSlashMenuFromInput, showMentionMenuFromInput,
  showInputMenu, insertToolCallTemplate, closeToolArgPanel,
  addAttachment, showAttachModal,
  getPendingAttachFile
} from './ui.js';
import { initGemma, setNeuralProgress } from './model.js';
import { handleSend, DEFAULT_SYSTEM_PROMPT } from './chat.js';

// ── Share – encrypted link support ──────────────────────
function b64ToArr(b64) { const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return arr; }
function arrToB64(arr) { return btoa(String.fromCharCode(...arr)); }
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptPayload(json, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(json));
  return `#lme:${arrToB64(salt)}.${arrToB64(iv)}.${arrToB64(new Uint8Array(cipher))}`;
}
async function decryptPayload(encoded, pass) {
  const [saltB64, ivB64, cipherB64] = encoded.split('.');
  const key = await deriveKey(pass, b64ToArr(saltB64));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToArr(ivB64) }, key, b64ToArr(cipherB64));
  return new TextDecoder().decode(plain);
}

function buildSharePayload() {
  const msgs = State.history.map(m => ({ ...m }));
  return JSON.stringify({ v: 1, history: msgs });
}

document.getElementById('share-btn').onclick = async () => {
  if (!State.history.length) { showToast('No conversation to share.'); return; }
  document.getElementById('share-meta').textContent = `${State.history.length} messages`;
  document.getElementById('share-url-input').value = '';
  document.getElementById('share-copy-btn').disabled = true;
  document.getElementById('share-backdrop').classList.add('open');
};

document.getElementById('share-use-passphrase').onchange = e => {
  document.getElementById('share-passphrase').style.display = e.target.checked ? '' : 'none';
};

document.getElementById('share-generate-btn').onclick = async () => {
  const usePass = document.getElementById('share-use-passphrase').checked;
  const passphrase = document.getElementById('share-passphrase').value;
  if (usePass && !passphrase) { showToast('Enter a passphrase first.'); return; }
  const json = buildSharePayload();
  let hash;
  if (usePass) {
    try { hash = await encryptPayload(json, passphrase); }
    catch (e) { showToast('Encryption failed: ' + e.message); return; }
  } else {
    hash = '#lm:' + btoa(unescape(encodeURIComponent(json)));
  }
  const url = window.location.origin + window.location.pathname + hash;
  document.getElementById('share-url-input').value = url;
  document.getElementById('share-copy-btn').disabled = false;
};

document.getElementById('share-copy-btn').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('share-url-input').value)
    .then(() => showToast('Link copied!'))
    .catch((e) => { console.warn('Clipboard write failed', e); showToast('Failed to copy link.'); });
};

async function checkShareLink() {
  const hash = window.location.hash;
  if (!hash) return;
  if (hash.startsWith('#lm:')) {
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(hash.slice(4)))));
      State.history = payload.history; renderRestoredMessages();
      showToast('Loaded shared conversation');
      window.location.hash = '';
      const welcomeMsg = document.getElementById('welcome-msg');
      if (welcomeMsg) welcomeMsg.remove();
    } catch (e) { console.error('Share link failed', e); showToast('Failed to load shared conversation.'); }
  } else if (hash.startsWith('#lme:')) {
    const encoded = hash.slice(5);
    document.getElementById('import-banner').classList.add('open');
    document.getElementById('import-passphrase').style.display = '';
    document.getElementById('import-banner-msg').textContent = 'Encrypted shared conversation detected';
    const confirmBtn = document.getElementById('import-confirm-btn');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', async () => {
      const pass = document.getElementById('import-passphrase').value;
      if (!pass) { showToast('Enter the passphrase.'); return; }
      try {
        const json = await decryptPayload(encoded, pass);
        const payload = JSON.parse(json);
        State.history = payload.history; renderRestoredMessages();
        document.getElementById('import-banner').classList.remove('open');
        window.location.hash = '';
        showToast('Conversation loaded.');
        const welcomeMsg = document.getElementById('welcome-msg');
        if (welcomeMsg) welcomeMsg.remove();
      } catch { showToast('Decryption failed. Wrong passphrase?'); }
    });
  }
}

// ── Files ───────────────────────────────────────────────
function handleUploadedFiles(files) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      addAttachment({ type: 'image', blob: file, thumb: URL.createObjectURL(file), name: file.name });
    } else if (file.type.startsWith('audio/')) {
      addAttachment({ type: 'audio', blob: file, thumb: URL.createObjectURL(file), name: file.name });
    } else if (file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name)) {
      addAttachment({ type: 'video', blob: file, thumb: URL.createObjectURL(file), name: file.name });
    } else {
      showAttachModal(file);
    }
  }
}

document.getElementById('global-file-input').onchange = e => {
  handleUploadedFiles(e.target.files);
};

// ── Drag & Drop ─────────────────────────────────────────
let dragCounter = 0;
document.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; document.getElementById('drag-overlay').classList.add('visible'); });
document.addEventListener('dragleave', () => { dragCounter--; if (dragCounter <= 0) { dragCounter = 0; document.getElementById('drag-overlay').classList.remove('visible'); } });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault(); dragCounter = 0; document.getElementById('drag-overlay').classList.remove('visible');
  const files = e.dataTransfer?.files;
  if (!files || !files.length) return;
  handleUploadedFiles(files);
});

// ── Settings toggles & persistence ──────────────────────
const savedSysPrompt = localStorage.getItem('lm_sys_prompt');
if (savedSysPrompt) document.getElementById('system-prompt').value = savedSysPrompt;
else document.getElementById('system-prompt').value = DEFAULT_SYSTEM_PROMPT;
document.getElementById('system-prompt').oninput = e => localStorage.setItem('lm_sys_prompt', e.target.value);
document.getElementById('reset-prompt-btn').onclick = () => {
  document.getElementById('system-prompt').value = DEFAULT_SYSTEM_PROMPT;
  localStorage.setItem('lm_sys_prompt', DEFAULT_SYSTEM_PROMPT);
  showToast('System prompt reset to default.');
};

const tempSlider = document.getElementById('temperature-slider');
const tempValue = document.getElementById('temp-value');
const savedTemp = localStorage.getItem('lm_temperature');
if (savedTemp) { tempSlider.value = savedTemp; tempValue.textContent = savedTemp; }
tempSlider.oninput = () => {
  tempValue.textContent = tempSlider.value;
  localStorage.setItem('lm_temperature', tempSlider.value);
};

const maxTokensSelect = document.getElementById('max-tokens-select');
const savedMaxTokens = localStorage.getItem('lm_max_tokens');
if (savedMaxTokens) maxTokensSelect.value = savedMaxTokens;
maxTokensSelect.onchange = () => localStorage.setItem('lm_max_tokens', maxTokensSelect.value);

const historyBudgetInput = document.getElementById('history-budget');
const savedHistoryBudget = localStorage.getItem('lm_history_budget');
if (savedHistoryBudget) historyBudgetInput.value = savedHistoryBudget;
historyBudgetInput.oninput = () => localStorage.setItem('lm_history_budget', historyBudgetInput.value);

const maxToolItersSelect = document.getElementById('max-tool-iters');
const savedMaxToolIters = localStorage.getItem('lm_max_tool_iters');
if (savedMaxToolIters) maxToolItersSelect.value = savedMaxToolIters;
maxToolItersSelect.onchange = () => localStorage.setItem('lm_max_tool_iters', maxToolItersSelect.value);

const savedProvider = localStorage.getItem('lm_search_provider');
if (savedProvider) {
  document.getElementById('search-provider').value = savedProvider;
  const v = savedProvider;
  document.getElementById('api-key-row').style.display = (v === 'brave' || v === 'tavily') ? '' : 'none';
  document.getElementById('searxng-url-row').style.display = (v === 'searxng') ? '' : 'none';
}

document.getElementById('search-provider').onchange = e => {
  const v = e.target.value;
  localStorage.setItem('lm_search_provider', v);
  document.getElementById('api-key-row').style.display = (v === 'brave' || v === 'tavily') ? '' : 'none';
  document.getElementById('searxng-url-row').style.display = (v === 'searxng') ? '' : 'none';
  updateSendButtons();
};

const savedApiKey = localStorage.getItem('lm_search_key');
if (savedApiKey) document.getElementById('search-api-key').value = savedApiKey;
document.getElementById('search-api-key').oninput = e => localStorage.setItem('lm_search_key', e.target.value);

const savedSearxngUrl = localStorage.getItem('lm_searxng_url');
if (savedSearxngUrl) document.getElementById('searxng-url').value = savedSearxngUrl;
document.getElementById('searxng-url').oninput = e => {
  localStorage.setItem('lm_searxng_url', e.target.value);
  updateSendButtons();
};

const savedUnsplashKey = localStorage.getItem('lm_unsplash_key');
if (savedUnsplashKey) document.getElementById('unsplash-api-key').value = savedUnsplashKey;
document.getElementById('unsplash-api-key').oninput = e => localStorage.setItem('lm_unsplash_key', e.target.value);

const savedPexelsKey = localStorage.getItem('lm_pexels_key');
if (savedPexelsKey) document.getElementById('pexels-api-key').value = savedPexelsKey;
document.getElementById('pexels-api-key').oninput = e => localStorage.setItem('lm_pexels_key', e.target.value);

const autoBackupToggle = document.getElementById('auto-backup-toggle');
autoBackupToggle.checked = localStorage.getItem('lm_auto_backup') === 'true';
autoBackupToggle.onchange = e => localStorage.setItem('lm_auto_backup', e.target.checked ? 'true' : 'false');

const thinkingToggleEl = document.getElementById('thinking-toggle');
const savedThinking = localStorage.getItem('lm_show_thinking');
State.showThinking = savedThinking !== 'false';
thinkingToggleEl.checked = State.showThinking;
thinkingToggleEl.onchange = e => {
  State.showThinking = !!e.target.checked;
  localStorage.setItem('lm_show_thinking', String(State.showThinking));
};

document.getElementById('reset-all-settings-btn').onclick = () => {
  if (!confirm('Reset all settings to defaults? This will clear your system prompt, API keys (search, Unsplash, Pexels), generation settings (temperature, max tokens, history budget, tool iterations), and preferences.')) return;
  const keysToRemove = [
    'lm_sys_prompt', 'lm_search_provider', 'lm_search_key', 'lm_searxng_url',
    'lm_unsplash_key', 'lm_pexels_key', 'lm_show_thinking', 'lm_temperature',
    'lm_max_tokens', 'lm_history_budget', 'lm_max_tool_iters'
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
  document.getElementById('system-prompt').value = DEFAULT_SYSTEM_PROMPT;
  document.getElementById('temperature-slider').value = '0.7';
  tempValue.textContent = '0.7';
  document.getElementById('max-tokens-select').value = '8192';
  document.getElementById('history-budget').value = '12000';
  document.getElementById('max-tool-iters').value = '3';
  document.getElementById('search-provider').value = 'none';
  document.getElementById('search-api-key').value = '';
  document.getElementById('searxng-url').value = '';
  document.getElementById('unsplash-api-key').value = '';
  document.getElementById('pexels-api-key').value = '';
  document.getElementById('api-key-row').style.display = 'none';
  document.getElementById('searxng-url-row').style.display = 'none';
  thinkingToggleEl.checked = true;
  State.showThinking = true;
  updateSendButtons();
  showToast('All settings reset to defaults.');
};

// ── Import/Export ────────────────────────────────────────
document.getElementById('import-file-input').onchange = e => {
  const file = e.target.files[0]; if(!file) return;
  file.text().then(async t => {
    try {
      const data = JSON.parse(t);
      if(data.chunks) await storeChunks(data.chunks);
      if(data.conversations) {
        const db = await openRAGDB(); const tx = db.transaction('conversations', 'readwrite');
        data.conversations.forEach(c => tx.objectStore('conversations').put(c));
      }
      showToast('Import complete'); refreshMemoryPanel(); refreshHistoryPanel(); refreshLibraryPanel();
    } catch (e) { console.error('Import failed', e); showToast('Import failed'); }
  });
};

// ── Folder Sync ─────────────────────────────────────────
document.getElementById('folder-btn').onclick = async () => {
  if (!window.showDirectoryPicker) return showToast('Folder picker not supported');
  try {
    if (State.dirHandle) {
      State.dirHandle = null;
      document.getElementById('folder-btn').classList.remove('folder-open');
      document.getElementById('folder-btn').textContent = 'Open Folder (Sync)';
      showToast('Folder closed');
      return;
    }
    State.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    document.getElementById('folder-btn').classList.add('folder-open');
    document.getElementById('folder-btn').textContent = `Folder: ${State.dirHandle.name}`;
    showToast(`Scanning "${State.dirHandle.name}"...`);
    const SUPPORTED = /\.(md|txt|pdf|docx)$/i;
    const fpKey = 'lm_folder_fp';
    const fingerprints = JSON.parse(localStorage.getItem(fpKey) || '{}');
    let ingested = 0;
    let skipped = 0;

    async function walk(dir, prefix = '') {
      for await (const entry of dir.values()) {
        if (entry.name.startsWith('.')) continue;
        if (entry.kind === 'directory') await walk(entry, prefix ? `${prefix}/${entry.name}` : entry.name);
        else if (SUPPORTED.test(entry.name)) {
          const file = await entry.getFile();
          const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          const fp = `${file.lastModified}-${file.size}`;
          if (fingerprints[fullPath] === fp) {
            skipped++;
            continue;
          }
          // eslint-disable-next-line no-useless-assignment
          let text = '';
          if (/\.pdf$/i.test(entry.name)) text = await extractPDFText(file);
          else if (/\.docx$/i.test(entry.name)) text = await extractDOCXText(file);
          else text = await file.text();
          await ingestDocument(fullPath, text);
          fingerprints[fullPath] = fp;
          ingested++;
        }
      }
    }
    await walk(State.dirHandle);
    localStorage.setItem(fpKey, JSON.stringify(fingerprints));
    showToast(`Folder sync complete (${ingested} ingested${skipped ? `, ${skipped} unchanged` : ''})`);
  } catch (e) { console.error(e); showToast('Folder sync failed'); }
};

document.getElementById('memory-search').addEventListener('input', () => refreshMemoryPanel());

// ── Memory Audit ────────────────────────────────────────
document.getElementById('memory-audit-btn').onclick = async () => {
  const chunks = await getAllChunks();
  if(chunks.length < 2) { showToast('Not enough memories to audit'); return; }
  showToast('Auditing memories for duplicates...');
  const duplicates = [];
  for(let i=0; i<chunks.length; i++) {
    for(let j=i+1; j<chunks.length; j++) {
      const sim = cosineSimilarity(chunks[i].embedding, chunks[j].embedding);
      if(sim > 0.95) duplicates.push(chunks[j].id);
    }
  }
  if(duplicates.length) {
    if(confirm(`Found ${duplicates.length} near-duplicates. Delete them?`)) {
      for(const id of duplicates) await deleteChunk(id);
      refreshMemoryPanel(); showToast('Audit cleanup complete');
    }
  } else { showToast('No issues found'); }
};

// ── Tool Argument Panel close handlers ──────────────────
document.getElementById('tool-arg-close-btn').addEventListener('click', closeToolArgPanel);
document.getElementById('tool-arg-cancel-btn').addEventListener('click', closeToolArgPanel);
document.getElementById('tool-arg-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeToolArgPanel();
});

// ── Batch ───────────────────────────────────────────────
document.getElementById('batch-run-btn').onclick = async () => {
  const lines = document.getElementById('batch-textarea').value.split('\n').filter(l => l.trim());
  const chain = document.getElementById('batch-chain-toggle').checked;
  const progress = document.getElementById('batch-progress');
  const runBtn = document.getElementById('batch-run-btn');
  const stopBtn = document.getElementById('batch-stop-btn');
  if (!lines.length) {
    progress.textContent = 'No prompts';
    return;
  }
  State.batchStopRequested = false;
  runBtn.disabled = true;
  stopBtn.disabled = false;
  let last = "";
  try {
    for (let i = 0; i < lines.length; i++) {
      if (State.batchStopRequested) break;
      progress.textContent = `${i + 1}/${lines.length}`;
      let p = lines[i];
      if (chain && last) p = p.replace(/\{\{previous\}\}/g, last);
      await handleSend(p);
      const lastAi = [...State.history].reverse().find(m => m.role === 'ai' || m.role === 'model');
      last = lastAi ? lastAi.text : "";
    }
    progress.textContent = State.batchStopRequested ? 'Stopped' : 'Complete';
  } finally {
    runBtn.disabled = false;
    stopBtn.disabled = true;
    State.batchStopRequested = false;
  }
};

document.getElementById('batch-stop-btn').onclick = () => {
  State.batchStopRequested = true;
  if (State.isGenerating) State.stopRequested = true;
};

// ── Attachment Choice Modal ─────────────────────────────
document.getElementById('attach-modal-session-btn').addEventListener('click', async () => {
  document.getElementById('attach-modal-overlay').classList.remove('open');
  const file = getPendingAttachFile();
  if (!file) return;
  try {
    let text = '';
    if (file.name.endsWith('.pdf')) text = await extractPDFText(file);
    else if (file.name.endsWith('.docx')) text = await extractDOCXText(file);
    else text = await file.text();
    addAttachment({ type: 'document', name: file.name, text: text });
  } catch (err) { console.error('File read error', err); showToast(`Failed to read ${file.name}`); }
});

document.getElementById('attach-modal-library-btn').addEventListener('click', async () => {
  document.getElementById('attach-modal-overlay').classList.remove('open');
  const file = getPendingAttachFile();
  if (!file) return;
  try {
    let text = '';
    if (file.name.endsWith('.pdf')) text = await extractPDFText(file);
    else if (file.name.endsWith('.docx')) text = await extractDOCXText(file);
    else text = await file.text();
    await ingestDocument(file.name, text);
  } catch (err) { console.error('File ingest error', err); showToast(`Failed to ingest ${file.name}`); }
});

// ── Download / Upload Model ─────────────────────────────
document.getElementById('download-btn').onclick = () => {
  const fill = document.getElementById('download-fill');
  const status = document.getElementById('download-status');
  document.getElementById('progress-container').classList.remove('hidden');
  status.textContent = 'Starting download...';
  setNeuralProgress(20);
  fetch(REMOTE_MODEL).then(async res => {
    const reader = res.body.getReader(); const total = +res.headers.get('Content-Length');
    let loaded = 0; const chunks = [];
    while(true) {
      const {done, value} = await reader.read(); if (done) break;
      chunks.push(value); loaded += value.length;
      const pct = (loaded/total*100);
      fill.style.width = pct + '%';
      setNeuralProgress(20 + (pct / 100) * (48 - 20));
      const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
      const totalMB = (total / (1024 * 1024)).toFixed(1);
      status.textContent = `${loadedMB} / ${totalMB} MB (${pct.toFixed(0)}%)`;
    }
    status.textContent = 'Initializing model...';
    setNeuralProgress(50);
    const full = new Uint8Array(loaded); let offset = 0; for(const c of chunks) { full.set(c, offset); offset += c.length; }
    document.getElementById('loader-rescue').classList.remove('visible');
    initGemma(full, true);
  }).catch(err => {
    status.textContent = 'Download failed: ' + err.message;
  });
};

document.getElementById('model-upload-input').onchange = async e => {
  if (e.target.files.length) {
    document.getElementById('loader-rescue').classList.remove('visible');
    const r = await e.target.files[0].arrayBuffer();
    initGemma(new Uint8Array(r), true);
  }
};

// ── Chat Input ──────────────────────────────────────────
const chatInput = document.getElementById('chat-input');
const toolInsertBtn = document.getElementById('tool-insert-btn');

function togglePlusMenu() {
  const menu = document.getElementById('plus-menu');
  menu.classList.toggle('open');
  const plusSearchBtn = document.getElementById('plus-search-btn');
  if (plusSearchBtn) {
    plusSearchBtn.style.display = isSearchConfigured() ? '' : 'none';
  }
}
window.togglePlusMenu = togglePlusMenu;

function triggerToolInsert() {
  const items = Object.entries(TOOL_REGISTRY).map(([name, tool]) => ({
    title: name,
    meta: tool.skillDescription || tool.description,
    onSelect: () => insertToolCallTemplate(name)
  }));
  showInputMenu(items);
  chatInput.focus();
}
window.triggerToolInsert = triggerToolInsert;

document.addEventListener('click', (e) => {
  const menu = document.getElementById('plus-menu');
  const btn = document.getElementById('plus-menu-btn');
  if (menu && menu.classList.contains('open') && !menu.contains(e.target) && e.target !== btn) {
    menu.classList.remove('open');
  }
});

toolInsertBtn.addEventListener('click', () => {
  const items = Object.entries(TOOL_REGISTRY).map(([name, tool]) => ({
    title: name,
    meta: tool.skillDescription || tool.description,
    onSelect: () => insertToolCallTemplate(name)
  }));
  showInputMenu(items);
  chatInput.focus();
});

chatInput.oninput = async () => {
  const val = chatInput.value;
  if (val.trimStart().startsWith('/')) {
    showSlashMenuFromInput();
    return;
  }
  const cursor = chatInput.selectionStart;
  const head = chatInput.value.slice(0, cursor);
  if (/(^|\s)@[^\s]*$/.test(head)) {
    await showMentionMenuFromInput();
    return;
  }
  hideInputMenu();
};

chatInput.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        addAttachment({
          type: 'image',
          blob: file,
          thumb: URL.createObjectURL(file),
          name: `pasted-image.${(file.type.split('/')[1] || 'png')}`,
        });
      }
    }
  }
});

chatInput.onkeydown = e => {
  if (e.key === 'Escape') {
    hideInputMenu();
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    const menu = document.getElementById('slash-menu');
    const firstItem = menu.querySelector('.slash-item');
    if (menu.style.display !== 'none' && firstItem) {
      e.preventDefault();
      firstItem.click();
      return;
    }
    e.preventDefault();
    handleSend();
  }
};

document.addEventListener('click', (e) => {
  const menu = document.getElementById('slash-menu');
  if (!menu.contains(e.target) && e.target !== chatInput && e.target !== toolInsertBtn) {
    hideInputMenu();
  }
});

// ── About Modal ─────────────────────────────────────────
document.getElementById('about-btn').addEventListener('click', () => {
  document.getElementById('about-overlay').classList.add('open');
});
document.getElementById('about-close-btn').addEventListener('click', () => {
  document.getElementById('about-overlay').classList.remove('open');
});
document.getElementById('about-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('open');
  }
});
document.querySelectorAll('.about-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.about-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.about-section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    const section = document.querySelector(`.about-section[data-tab="${tab.dataset.tab}"]`);
    if (section) section.classList.add('active');
  });
});

// ── Init ────────────────────────────────────────────────
// This module is loaded via `await import()` inside a deferred <script type="module">,
// so the DOM is fully parsed and all synchronous <script> tags in <head> have executed.
// We can initialise immediately — no need to wait for window.onload.
restoreFromSession();

initGemma();

ensureToolSkillDocsLoaded().then(() => refreshToolsPanel());
refreshLibraryPanel();
refreshHistoryPanel();
refreshMemoryPanel();
updateSendButtons();
checkShareLink();
