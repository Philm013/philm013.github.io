// ── UI Utilities, Rendering, Menus & Panels ───────────────────
import { State } from './config.js';
import { getAllChunks, deleteChunk, storeChunks, embedTexts, embedAndStore, extractiveSummary } from './rag.js';
import { isSearchConfigured } from './search.js';
import { TOOL_REGISTRY } from './tools.js';
// Circular runtime imports — safe because they are only used inside functions,
// never during module initialisation.
import { handleSend, normalizeToolArguments } from './chat.js';

// ── Attachments ──────────────────────────────────────────
export const attachments = [];

export function addAttachment(att) {
  attachments.push(att);
  renderAttachmentBar();
}

export function removeAttachment(idx) {
  attachments.splice(idx, 1);
  renderAttachmentBar();
}

export function clearAttachments() {
  attachments.length = 0;
  renderAttachmentBar();
}

export function renderAttachmentBar() {
  const bar = document.getElementById('attachment-bar');
  if (!bar) return;
  bar.innerHTML = '';
  if (!attachments.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  attachments.forEach((att, idx) => {
    const pill = document.createElement('div');
    pill.className = 'attachment-pill';
    if (att.type === 'image') {
      const img = document.createElement('img');
      img.src = att.thumb;
      img.alt = att.name;
      img.className = 'attachment-thumb';
      pill.appendChild(img);
    } else if (att.type === 'audio') {
      const icon = document.createElement('span');
      icon.textContent = '🎵 ';
      pill.appendChild(icon);
    } else if (att.type === 'video') {
      const icon = document.createElement('span');
      icon.textContent = '🎬 ';
      pill.appendChild(icon);
    } else if (att.type === 'document') {
      const icon = document.createElement('span');
      icon.textContent = '📄 ';
      pill.appendChild(icon);
    }
    const nameSpan = document.createElement('span');
    nameSpan.className = 'attachment-name';
    nameSpan.textContent = att.name;
    pill.appendChild(nameSpan);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'attachment-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeAttachment(idx));
    pill.appendChild(removeBtn);
    bar.appendChild(pill);
  });
}

// ── Status & Toast ──────────────────────────────────────
export const updateStatus = (t, x) => {
  const b = document.getElementById('status-badge'), e = document.getElementById('status-text');
  b.className = `status-badge ${t}`; e.textContent = x;
};

export function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--ollama-black);color:white;padding:10px 20px;border-radius:8px;font-size:0.82rem;z-index:3000;opacity:0;transition:opacity 0.3s';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.style.opacity = '1');
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

export function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── JSON Parsing & Gemma Format Helpers ──────────────────
export function repairAndParseJSON(str) {
  if (!str || typeof str !== 'string') return null;
  let s = str.trim();
  try { return JSON.parse(s); } catch { /* attempt repair */ }
  s = s.replace(/,\s*([}\]])/g, '$1');
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace >= 0) s = s.slice(0, lastBrace + 1);
  try { return JSON.parse(s); } catch { return null; }
}

export function stripThoughts(text) {
  return text
    .replace(/<\|channel>thought\n?[\s\S]*?<channel\|>/g, '')
    .replace(/<\|think\|>[\s\S]*?<\|\/think\|>/g, '')
    .trim();
}

export function formatGemmaValue(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') return `<|"|>${val}<|"|>`;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return `[${val.map(formatGemmaValue).join(',')}]`;
  if (typeof val === 'object') return formatGemmaObject(val);
  return String(val);
}

export function formatGemmaObject(obj) {
  const pairs = Object.entries(obj).map(([k, v]) => `${k}:${formatGemmaValue(v)}`);
  return `{${pairs.join(',')}}`;
}

export function parseGemmaStructuredData(text) {
  if (!text || typeof text !== 'string') return null;
  let s = text.trim();
  s = s.replace(/<\|"\|>/g, '"');
  s = s.replace(/([{,])\s*([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
  try { return JSON.parse(s); } catch { /* fall through */ }
  s = s.replace(/,\s*([}\]])/g, '$1');
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace >= 0) s = s.slice(0, lastBrace + 1);
  try { return JSON.parse(s); } catch { return null; }
}

export function parseGemmaToolCall(text) {
  if (!text) return null;
  const m = text.match(/<\|tool_call>call:([a-zA-Z_]\w*)\s*(\{[\s\S]*\})?\s*<tool_call\|>/);
  if (!m) return null;
  if (!m[2] || m[2] === '{}') return { name: m[1], arguments: {} };
  const args = parseGemmaStructuredData(m[2]);
  return args !== null ? { name: m[1], arguments: args } : { name: m[1], arguments: {} };
}

// ── Streaming Helpers ────────────────────────────────────
export function mergeStreamingText(current, chunk) {
  const next = String(chunk || '');
  if (!next) return current;
  if (!current) return next;
  if (next.startsWith(current)) return next;
  if (current === next) return current;
  const maxOverlap = Math.min(current.length, next.length);
  for (let i = maxOverlap; i > 0; i--) {
    if (current.endsWith(next.slice(0, i))) {
      return current + next.slice(i);
    }
  }
  return current + next;
}

export function detectStreamingRepetition(text) {
  if (!text || text.length < 80) return false;
  const tail = text.slice(-300);
  for (let len = 3; len <= 30; len++) {
    const phrase = tail.slice(-len);
    let count = 0;
    let pos = tail.length;
    while (pos >= len && tail.slice(pos - len, pos) === phrase) {
      count++;
      pos -= len;
    }
    if (count >= 4) return true;
  }
  return false;
}

export function insertTextAtCursor(text, replaceStart = null, replaceEnd = null) {
  const input = document.getElementById('chat-input');
  const start = replaceStart == null ? input.selectionStart : replaceStart;
  const end = replaceEnd == null ? input.selectionEnd : replaceEnd;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  input.value = `${before}${text}${after}`;
  const cursorPos = before.length + text.length;
  input.selectionStart = cursorPos;
  input.selectionEnd = cursorPos;
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function insertToolCallTemplate(name) {
  hideInputMenu();
  openToolArgPanel(name);
}

// ── Tool Arg Panel ──────────────────────────────────────
export function openToolArgPanel(toolName) {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) return;
  const overlay = document.getElementById('tool-arg-overlay');
  const titleEl = document.getElementById('tool-arg-title');
  const descEl = document.getElementById('tool-arg-desc');
  const fieldsEl = document.getElementById('tool-arg-fields');
  const runBtn = document.getElementById('tool-arg-run-btn');

  titleEl.textContent = `🔧 ${toolName}`;
  descEl.textContent = tool.skillDescription || tool.description || '';
  fieldsEl.innerHTML = '';

  const props = tool.parameters?.properties || {};
  const required = tool.parameters?.required || [];

  Object.entries(props).forEach(([key, schema]) => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'tool-arg-field';
    const label = document.createElement('label');
    label.setAttribute('for', `tool-arg-${key}`);
    label.textContent = key;
    if (required.includes(key)) {
      const star = document.createElement('span');
      star.className = 'required-star';
      star.textContent = ' *';
      label.appendChild(star);
    }
    fieldDiv.appendChild(label);
    if (schema.description) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.textContent = schema.description;
      fieldDiv.appendChild(hint);
    }
    let input;
    if (schema.enum && schema.enum.length > 0) {
      input = document.createElement('select');
      if (!required.includes(key)) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '— default —';
        input.appendChild(opt);
      }
      schema.enum.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement('input');
      input.type = schema.type === 'number' ? 'number' : 'text';
      input.placeholder = schema.description ? schema.description.slice(0, 60) : key;
    }
    input.id = `tool-arg-${key}`;
    input.dataset.paramKey = key;
    input.dataset.paramType = schema.type || 'string';
    if (required.includes(key)) input.required = true;
    fieldDiv.appendChild(input);
    fieldsEl.appendChild(fieldDiv);
  });

  if (Object.keys(props).length === 0) {
    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:0.82rem;color:var(--ollama-stone);text-align:center;padding:12px 0;';
    hint.textContent = 'This tool takes no parameters.';
    fieldsEl.appendChild(hint);
  }

  const newRunBtn = runBtn.cloneNode(true);
  runBtn.parentNode.replaceChild(newRunBtn, runBtn);
  newRunBtn.addEventListener('click', async () => {
    const args = {};
    fieldsEl.querySelectorAll('[data-param-key]').forEach(el => {
      const key = el.dataset.paramKey;
      const type = el.dataset.paramType;
      let val = el.value;
      if (type === 'number' && val !== '') val = Number(val);
      if (val !== '' && val !== undefined) args[key] = val;
    });
    const missing = required.filter(k => args[k] == null || (typeof args[k] === 'string' && !args[k].trim()));
    if (missing.length) {
      showToast(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    closeToolArgPanel();
    if (State.isGenerating) { showToast('Please wait for the current response to finish.'); return; }
    const aiEl = renderMessage('', 'ai');
    try {
      const normalizedArgs = normalizeToolArguments(toolName, args);
      const res = await tool.execute(normalizedArgs);
      renderToolCallBlock(aiEl, toolName, normalizedArgs, res);
      let toolResponsePayload = res;
      if (res && typeof res === 'object' && res.webview) {
        if (res.map_links) {
          const loc = normalizedArgs.location || normalizedArgs.query || 'the requested location';
          const search = normalizedArgs.search_query || '';
          toolResponsePayload = { result: search ? `Map displayed for "${search}" near "${loc}".` : `Map displayed for "${loc}".` };
        } else {
          const toolLabel = toolName.replace(/_/g, ' ');
          const resultText = res.result || `The ${toolLabel} is now displayed inline in the chat.`;
          toolResponsePayload = { result: resultText, note: `The ${toolLabel} is embedded inline in the chat.` };
        }
      }
      State.history.push({ role: 'user', text: `I used the ${toolName} tool with these arguments: ${JSON.stringify(normalizedArgs)}` });
      const toolCallStr = `<|tool_call>call:${toolName}${formatGemmaObject(normalizedArgs)}<tool_call|>`;
      const toolRespStr = `<|tool_response>response:${toolName}${formatGemmaObject(toolResponsePayload)}<tool_response|>`;
      State.history.push({ role: 'ai', text: toolCallStr + toolRespStr, _isToolTurn: true });
      handleSend(true);
    } catch (e) {
      renderToolCallBlock(aiEl, toolName, args, { error: e.message });
    }
  });

  overlay.classList.add('open');
  setTimeout(() => {
    if (!overlay.classList.contains('open')) return;
    const first = fieldsEl.querySelector('input, select');
    if (first) first.focus();
  }, 100);
}

export function closeToolArgPanel() {
  document.getElementById('tool-arg-overlay').classList.remove('open');
}

// ── Mention Context Builder ──────────────────────────────
export async function buildMentionContextFromText(messageText) {
  const docTokens = [...messageText.matchAll(/@doc\[([^\]]+)\]/gi)].map(m => m[1].trim()).filter(Boolean);
  const memTokens = [...messageText.matchAll(/@mem\[([^\]]+)\]/gi)].map(m => m[1].trim()).filter(Boolean);
  if (!docTokens.length && !memTokens.length) return '';

  const chunks = await getAllChunks();
  const lines = [];

  [...new Set(docTokens)].forEach((docName) => {
    const docMatches = chunks
      .filter(c => String(c.source || '').toLowerCase() === docName.toLowerCase() && (c.category === 'document' || c.category === 'document_summary'))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 3);
    if (!docMatches.length) return;
    lines.push(`@doc[${docName}]`);
    docMatches.forEach((m, i) => {
      lines.push(`- Excerpt ${i + 1}: ${String(m.text || '').slice(0, 350)}`);
    });
  });

  [...new Set(memTokens)].forEach((token) => {
    const q = token.toLowerCase();
    const memMatches = chunks
      .filter(c => c.category !== 'document_summary')
      .filter(c => String(c.text || '').toLowerCase().includes(q) || String(c.source || '').toLowerCase().includes(q))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 3);
    if (!memMatches.length) return;
    lines.push(`@mem[${token}]`);
    memMatches.forEach((m, i) => {
      lines.push(`- Match ${i + 1} (${m.category}/${m.source}): ${String(m.text || '').slice(0, 280)}`);
    });
  });

  if (!lines.length) return '';
  return `\n\n[User-selected references]\n${lines.join('\n')}`;
}

// ── Slash Commands & Input Menus ─────────────────────────
export const quickActions = {
  clear: () => {
    const input = document.getElementById('chat-input');
    State.history = [];
    document.getElementById('chat-container').innerHTML = '';
    input.value = '';
  },
  library: () => showPanel('library'),
  memory: () => showPanel('memory'),
  batch: () => showPanel('batch'),
  settings: () => showPanel('settings'),
  tools: () => showPanel('tools')
};

export function hideInputMenu() {
  const menu = document.getElementById('slash-menu');
  menu.style.display = 'none';
  menu.innerHTML = '';
}

export function showInputMenu(items) {
  const menu = document.getElementById('slash-menu');
  menu.innerHTML = '';
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'slash-item';
    row.innerHTML = `<div class="slash-item-title">${escapeHtml(item.title)}</div>${item.meta ? `<div class="slash-item-meta">${escapeHtml(item.meta)}</div>` : ''}`;
    row.addEventListener('click', () => {
      item.onSelect();
      hideInputMenu();
      document.getElementById('chat-input').focus();
    });
    menu.appendChild(row);
  });
  menu.style.display = items.length ? 'flex' : 'none';
}

export async function showMentionMenuFromInput() {
  const input = document.getElementById('chat-input');
  const cursor = input.selectionStart;
  const head = input.value.slice(0, cursor);
  const match = head.match(/(^|\s)@([^\s]*)$/);
  if (!match) {
    hideInputMenu();
    return;
  }

  const partial = match[2] || '';
  const replaceStart = cursor - partial.length - 1;
  const replaceEnd = cursor;
  const q = partial.toLowerCase();
  const chunks = await getAllChunks();
  const docs = [...new Set(chunks.filter(c => c.category === 'document' || c.category === 'document_summary').map(c => String(c.source || '')))]
    .filter(Boolean)
    .filter(s => !q || s.toLowerCase().includes(q))
    .slice(0, 8);
  const mems = chunks
    .filter(c => c.category !== 'document_summary')
    .filter(c => !q || String(c.text || '').toLowerCase().includes(q) || String(c.source || '').toLowerCase().includes(q))
    .slice(0, 8);

  const items = [];
  docs.forEach((src) => {
    items.push({
      title: `@doc[${src}]`,
      meta: 'Reference document',
      onSelect: () => insertTextAtCursor(`@doc[${src}] `, replaceStart, replaceEnd)
    });
  });
  mems.forEach((m) => {
    const token = String(m.source || m.category || 'memory').slice(0, 40);
    items.push({
      title: `@mem[${token}]`,
      meta: `${m.category}: ${String(m.text || '').slice(0, 60)}`,
      onSelect: () => insertTextAtCursor(`@mem[${token}] `, replaceStart, replaceEnd)
    });
  });
  showInputMenu(items);
}

export function showSlashMenuFromInput() {
  const input = document.getElementById('chat-input');
  const val = input.value.trimStart();
  if (!val.startsWith('/')) {
    hideInputMenu();
    return;
  }
  const q = val.slice(1).toLowerCase();
  const items = [];

  Object.keys(quickActions)
    .filter(k => k.includes(q))
    .forEach((k) => {
      items.push({
        title: `/${k}`,
        meta: 'Built-in command',
        onSelect: () => {
          input.value = '';
          quickActions[k]();
        }
      });
    });

  Object.entries(TOOL_REGISTRY)
    .filter(([name]) => name.toLowerCase().includes(q))
    .forEach(([name, tool]) => {
      items.push({
        title: `/${name}`,
        meta: `Tool: ${tool.skillDescription || tool.description}`,
        onSelect: () => {
          input.value = '';
          insertToolCallTemplate(name);
        }
      });
    });

  items.push({
    title: '@doc[...] / @mem[...]',
    meta: 'Type @ to mention documents or memories',
    onSelect: () => {
      input.value = '@';
      input.focus();
    }
  });

  showInputMenu(items.slice(0, 14));
}

// ── Toggle Block ────────────────────────────────────────
export function toggleBlock(toggleEl) {
  const contentId = toggleEl.dataset.target;
  if (!contentId) return;
  const content = document.getElementById(contentId);
  if (!content) return;

  const isOpen = content.classList.toggle('open');
  const arrow = toggleEl.querySelector('span');
  if (arrow) arrow.innerHTML = isOpen ? '&#9660;' : '&#9654;';

  toggleEl.childNodes.forEach(n => {
    if (n.nodeType === 3 && (n.textContent.includes('Thinking') || n.textContent.includes('Thought'))) {
      n.textContent = ' Thought process';
    }
  });
}
window.toggleBlock = toggleBlock;

// ── Markdown Rendering ──────────────────────────────────
export const markdownEngine = window.markdownit({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true
});

export function renderMarkdown(text, options = {}) {
  const showThinking = options.showThinking !== false;
  const isStreaming = !!options.isStreaming;
  let think = ''; let main = text;
  let thinkingComplete = false;

  const thinkMatch = text.match(/<\|think\|>([\s\S]*?)(<\|\/think\|>|$)/);
  if (thinkMatch) {
    think = thinkMatch[1].trim();
    thinkingComplete = thinkMatch[2] === '<|/think|>';
    main = text.replace(/<\|think\|>[\s\S]*?(<\|\/think\|>|$)/, '').trim();
  }

  if (!think) {
    const channelMatch = text.match(/<\|channel>thought\n?([\s\S]*?)(<channel\|>|$)/);
    if (channelMatch) {
      think = channelMatch[1].trim();
      thinkingComplete = channelMatch[2] === '<channel|>';
      main = text.replace(/<\|channel>thought\n?[\s\S]*?(<channel\|>|$)/, '').trim();
    }
  }

  if (isStreaming && !think && main) {
    const lastLt = main.lastIndexOf('<');
    if (lastLt >= 0) {
      const tail = main.slice(lastLt);
      const partialTags = ['<|think|>', '<|channel>thought', '<|tool_call>', '<|tool_response>', '<|turn>', '<turn|>', '<tool_call>', '<tool_response>'];
      if (partialTags.some(tag => tag.startsWith(tail) && tag !== tail)) {
        main = main.slice(0, lastLt).trim();
      }
    }
  }

  let html = '';
  if (think && showThinking) {
    if (isStreaming && !thinkingComplete) {
      html += `<div class="thinking-block">` +
        `<div class="thinking-toggle">` +
        `<span>&#9660;</span> Thinking...` +
        `</div>` +
        `</div>`;
    } else {
      const id = 'th-' + Math.random().toString(36).slice(2, 8);
      html += `<div class="thinking-block">` +
        `<div class="thinking-toggle" data-target="${escapeHtml(id)}" onclick="toggleBlock(this)">` +
        `<span>&#9654;</span> Thought process` +
        `</div>` +
        `<div class="thinking-content" id="${escapeHtml(id)}">${escapeHtml(think)}</div>` +
        `</div>`;
    }
  }

  main = main.replace(/<\|tool_call>[\s\S]*?<tool_call\|>/g, '').replace(/<\|tool_call>[\s\S]*/g, '').trim();
  main = main.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').replace(/<tool_call>[\s\S]*/g, '').trim();
  main = main.replace(/<\|tool_response>[\s\S]*?<tool_response\|>/g, '').replace(/<\|tool_response>[\s\S]*/g, '').trim();
  main = main.replace(/<tool_response>[\s\S]*?<\/tool_response>/g, '').replace(/<tool_response>[\s\S]*/g, '').trim();
  main = main.replace(/<\|turn>[^\n]*\n?/g, '').replace(/<turn\|>/g, '').trim();
  main = main.replace(/<start_of_turn>[^\n]*\n?/g, '').replace(/<end_of_turn>/g, '').trim();
  if (!main) return html || '<span style="color:var(--ollama-stone)">...</span>';
  html += DOMPurify.sanitize(markdownEngine.render(main));
  return html;
}

export function updateSendButtons() {
  const sendBtn = document.getElementById('send-btn');
  const searchBtn = document.getElementById('search-send-btn');
  const plusSearchBtn = document.getElementById('plus-search-btn');
  const searchEnabled = isSearchConfigured() && State.modelReady && !State.isGenerating;
  if (State.isGenerating) {
    sendBtn.textContent = '■';
    sendBtn.title = 'Stop';
    sendBtn.disabled = false;
  } else {
    sendBtn.textContent = '➤';
    sendBtn.title = 'Send';
    sendBtn.disabled = !State.modelReady;
  }
  searchBtn.disabled = !searchEnabled;
  searchBtn.style.display = isSearchConfigured() ? '' : 'none';
  if (plusSearchBtn) {
    plusSearchBtn.style.display = isSearchConfigured() ? '' : 'none';
  }
}

// ── Message Rendering ───────────────────────────────────
export function renderMessage(t, r, el = null, options = {}) {
  const c = document.getElementById('chat-container');
  if (!el) { el = document.createElement('div'); el.className = `message ${r}`; c.appendChild(el); }
  if (r === 'user') {
    let html = '';
    const hasMedia = (options.images && options.images.length > 0) || (options.audios && options.audios.length > 0) || (options.videos && options.videos.length > 0);
    if (hasMedia) {
      html += '<div class="msg-attachments">';
      if (options.images) {
        for (const src of options.images) {
          html += `<img src="${escapeHtml(src)}" alt="Attached image" loading="lazy" onclick="openLightbox(this.src)">`;
        }
      }
      if (options.audios) {
        for (const a of options.audios) {
          html += `<audio controls preload="metadata" src="${escapeHtml(a.thumb)}" title="${escapeHtml(a.name)}"></audio>`;
        }
      }
      if (options.videos) {
        for (const v of options.videos) {
          html += `<video controls preload="metadata" src="${escapeHtml(v.thumb)}" title="${escapeHtml(v.name)}"></video>`;
        }
      }
      html += '</div>';
    }
    const displayText = t.replace(/\n\n\[Attached media: [^\]]+\]$/, '');
    html += `<div class="user-bubble">${escapeHtml(displayText)}</div>`;
    el.innerHTML = html;
  } else {
    const bubbles = el.querySelectorAll('.ai-bubble');
    let bubble = bubbles.length ? bubbles[bubbles.length - 1] : null;
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'ai-bubble';
      el.appendChild(bubble);
    }
    bubble.innerHTML = renderMarkdown(t, options);
  }
  c.scrollTop = c.scrollHeight; return el;
}


// ── Tool Call Block Rendering ────────────────────────────
export function renderToolCallBlock(el, name, args, res) {
  const id = 'tc-' + Math.random().toString(36).slice(2, 8);
  const argsStr = Object.entries(args || {}).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const resultStr = typeof res === 'string' ? res : JSON.stringify(res, null, 2);

  const block = document.createElement('div');
  block.className = 'tool-call-block';

  const toggle = document.createElement('div');
  toggle.className = 'tool-call-toggle';
  toggle.dataset.target = id;
  toggle.setAttribute('onclick', 'toggleBlock(this)');
  toggle.innerHTML = `<span>&#9654;</span> 🛠️ <strong>${escapeHtml(name)}</strong>(${escapeHtml(argsStr)})`;

  const result = document.createElement('div');
  result.className = 'tool-call-result';
  result.id = id;

  // ── Interactive web search results ─────────────────────
  if (name === 'web_search' && res && typeof res === 'object' && Array.isArray(res.results) && res.results.length > 0) {
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'web-search-cards';
    for (const item of res.results) {
      const card = document.createElement('div');
      card.className = 'web-result-card';
      const titleLink = document.createElement('a');
      titleLink.href = String(item.url || '#');
      titleLink.target = '_blank';
      titleLink.rel = 'noopener noreferrer';
      titleLink.className = 'web-result-title';
      titleLink.textContent = item.title || item.url || 'Untitled';
      card.appendChild(titleLink);
      if (item.snippet) {
        const snippet = document.createElement('p');
        snippet.className = 'web-result-snippet';
        snippet.textContent = item.snippet;
        card.appendChild(snippet);
      }
      const urlText = document.createElement('span');
      urlText.className = 'web-result-url';
      urlText.textContent = item.url || '';
      card.appendChild(urlText);
      if (item.url && TOOL_REGISTRY.fetch_page) {
        const fetchBtn = document.createElement('button');
        fetchBtn.className = 'web-result-fetch-btn';
        fetchBtn.textContent = '📄 Fetch & Read';
        fetchBtn.title = 'Fetch and read this page';
        fetchBtn.addEventListener('click', async () => {
          if (State.isGenerating) { showToast('Please wait for the current response to finish.'); return; }
          fetchBtn.disabled = true;
          fetchBtn.textContent = '⏳ Fetching…';
          try {
            const fetchRes = await TOOL_REGISTRY.fetch_page.execute({ url: item.url });
            const aiEl = renderMessage('', 'ai');
            renderToolCallBlock(aiEl, 'fetch_page', { url: item.url }, fetchRes);
            const contentSnippet = (fetchRes && fetchRes.content) ? fetchRes.content.slice(0, 2000) : '';
            if (contentSnippet) {
              State.history.push({ role: 'user', text: `I clicked "Fetch & Read" on this search result. Here is the page content:\n\nURL: ${item.url}\nContent: ${contentSnippet}\n\nPlease summarize this page.` });
              handleSend(true);
            }
          } catch (e) {
            showToast('Fetch failed: ' + e.message);
          } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '📄 Fetch & Read';
          }
        });
        card.appendChild(fetchBtn);
      }
      cardsContainer.appendChild(card);
    }
    result.appendChild(cardsContainer);
  } else if (name === 'search_media' && res && typeof res === 'object' && Array.isArray(res.results) && res.results.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'media-grid';
    for (const item of res.results) {
      const card = document.createElement('div');
      card.className = 'media-card';
      if (item.type === 'video' && item.thumbnail) {
        const video = document.createElement('video');
        video.controls = true;
        video.preload = 'metadata';
        video.poster = item.thumbnail;
        if (item.url) {
          const source = document.createElement('source');
          source.src = item.url;
          source.type = 'video/mp4';
          video.appendChild(source);
        }
        card.appendChild(video);
      } else if (item.url || item.thumbnail) {
        const img = document.createElement('img');
        img.src = item.thumbnail || item.url;
        img.alt = item.description || 'Image result';
        img.loading = 'lazy';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          window.open(item.link || item.url, '_blank', 'noopener,noreferrer');
        });
        card.appendChild(img);
      }
      const info = document.createElement('div');
      info.className = 'media-card-info';
      if (item.description) {
        const desc = document.createElement('span');
        desc.textContent = item.description;
        desc.style.cssText = 'display:block;font-size:0.72rem;margin-bottom:2px;color:var(--ollama-mid-gray)';
        info.appendChild(desc);
      }
      const photoLink = document.createElement('a');
      photoLink.href = item.photographerUrl || item.link || '#';
      photoLink.target = '_blank';
      photoLink.rel = 'noopener noreferrer';
      photoLink.textContent = item.photographer || 'Unknown';
      const providerText = document.createTextNode(` via ${item.provider || 'unknown'}`);
      info.appendChild(photoLink);
      info.appendChild(providerText);
      card.appendChild(info);
      grid.appendChild(card);
    }
    result.appendChild(grid);
  } else if (name === 'trivia_question' && res && typeof res === 'object' && res.result && res.result.type === 'trivia_session') {
    const session = res.result;
    const qs = session.questions;
    const widgetId = 'trivia-' + Math.random().toString(36).slice(2, 8);
    const widget = document.createElement('div');
    widget.className = 'trivia-widget';
    widget.id = widgetId;
    const correctReactions = [
      "🔥 Nailed it! You're on fire!", "✨ Brilliant! That's the one!",
      "🎯 Bull's-eye! Absolutely right!", "🧠 Big brain energy right there!",
      "💪 Crushed it! Keep going!", "🌟 Star performance! Correct!",
      "🚀 Rocketing through this quiz!", "👏 Perfect pick! Well done!",
      "🎉 YES! You got it!", "😎 Too easy for you, huh?"
    ];
    const wrongReactions = [
      "😬 Ooh, so close! Not quite.", "💡 Tricky one! The answer was revealed above.",
      "🤔 Good guess, but not this time!", "😅 Don't worry, next one's yours!",
      "🫣 Oof! That was a tough one.", "📚 Learn something new every day!",
      "🎲 Can't win 'em all! Onward!", "🤷 Happens to the best of us!",
      "😤 So close yet so far!", "🧐 Interesting choice! But nope."
    ];
    const finaleMessages = [
      { min: 100, emoji: '🏆', title: 'PERFECT SCORE!', subtitle: "Absolutely flawless! You're a trivia legend!" },
      { min: 80, emoji: '🌟', title: 'Amazing!', subtitle: "You really know your stuff!" },
      { min: 60, emoji: '🎉', title: 'Great Job!', subtitle: "Solid performance! Well played!" },
      { min: 40, emoji: '👍', title: 'Not Bad!', subtitle: "Room to grow, but you've got potential!" },
      { min: 0, emoji: '💪', title: 'Keep Trying!', subtitle: "Every quiz makes you smarter!" }
    ];

    let currentQ = 0, score = 0, streak = 0, bestStreak = 0, answered = false;

    function renderQuestion() {
      answered = false;
      const q = qs[currentQ];
      const pct = ((currentQ) / qs.length) * 100;
      widget.innerHTML = `
        <div class="trivia-header">
          <div class="trivia-header-title">🧩 Trivia Quest</div>
          <div class="trivia-score">
            <span class="trivia-streak${streak >= 2 ? ' visible' : ''}" id="${widgetId}-streak">🔥 ${streak}</span>
            <span class="trivia-score-item">⭐ <span id="${widgetId}-score">${score}</span>/${qs.length}</span>
            <span class="trivia-score-item">📋 ${currentQ + 1}/${qs.length}</span>
          </div>
        </div>
        <div class="trivia-progress"><div class="trivia-progress-bar" style="width:${pct}%"></div></div>
        <div class="trivia-body trivia-question-anim">
          <div class="trivia-category">${escapeHtml(q.category)}</div>
          <span class="trivia-difficulty trivia-diff-${q.difficulty}">${escapeHtml(q.difficulty)}</span>
          <div class="trivia-question-text">${escapeHtml(q.question)}</div>
          <div class="trivia-answers" id="${widgetId}-answers"></div>
          <div class="trivia-reaction" id="${widgetId}-reaction"></div>
          <button class="trivia-next-btn" id="${widgetId}-next">${currentQ < qs.length - 1 ? 'Next Question ➜' : 'See Results 🏁'}</button>
        </div>
      `;
      const answersDiv = widget.querySelector(`#${widgetId}-answers`);
      q.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.className = 'trivia-answer-btn';
        btn.innerHTML = `<span class="trivia-letter">${escapeHtml(choice.letter)}</span><span>${escapeHtml(choice.text)}</span>`;
        btn.addEventListener('click', () => handleAnswer(idx, q.correctIndex, btn, answersDiv));
        answersDiv.appendChild(btn);
      });
      const nextBtn = widget.querySelector(`#${widgetId}-next`);
      nextBtn.addEventListener('click', () => {
        currentQ++;
        if (currentQ < qs.length) renderQuestion();
        else renderFinale();
      });
    }

    function handleAnswer(selectedIdx, correctIdx, clickedBtn, answersDiv) {
      if (answered) return;
      answered = true;
      const buttons = answersDiv.querySelectorAll('.trivia-answer-btn');
      buttons.forEach(b => { b.disabled = true; });
      const isCorrect = selectedIdx === correctIdx;
      if (isCorrect) {
        score++;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
        clickedBtn.classList.add('correct');
        const scoreEl = widget.querySelector(`#${widgetId}-score`);
        if (scoreEl) scoreEl.textContent = score;
        const streakEl = widget.querySelector(`#${widgetId}-streak`);
        if (streakEl) {
          streakEl.textContent = '🔥 ' + streak;
          if (streak >= 2) streakEl.classList.add('visible');
        }
        spawnConfetti(widget.querySelector('.trivia-body'));
      } else {
        streak = 0;
        clickedBtn.classList.add('wrong');
        buttons[correctIdx].classList.add('reveal-correct');
        const streakEl = widget.querySelector(`#${widgetId}-streak`);
        if (streakEl) streakEl.classList.remove('visible');
      }
      const reactionEl = widget.querySelector(`#${widgetId}-reaction`);
      const pool = isCorrect ? correctReactions : wrongReactions;
      reactionEl.textContent = pool[Math.floor(Math.random() * pool.length)];
      reactionEl.classList.add('visible');
      const nextBtn = widget.querySelector(`#${widgetId}-next`);
      nextBtn.classList.add('visible');
    }

    function spawnConfetti(container) {
      const confettiDiv = document.createElement('div');
      confettiDiv.className = 'trivia-confetti';
      const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
      for (let i = 0; i < 24; i++) {
        const piece = document.createElement('div');
        piece.className = 'trivia-confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = (Math.random() * 0.5) + 's';
        piece.style.animationDuration = (1 + Math.random()) + 's';
        const size = 4 + Math.random() * 6;
        piece.style.width = size + 'px';
        piece.style.height = size + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confettiDiv.appendChild(piece);
      }
      container.appendChild(confettiDiv);
      setTimeout(() => confettiDiv.remove(), 2000);
    }

    function renderFinale() {
      const pct = Math.round((score / qs.length) * 100);
      const msg = finaleMessages.find(m => pct >= m.min) || finaleMessages[finaleMessages.length - 1];
      widget.innerHTML = `
        <div class="trivia-header">
          <div class="trivia-header-title">🧩 Trivia Quest</div>
          <div class="trivia-score">
            <span class="trivia-score-item">🏁 Complete</span>
          </div>
        </div>
        <div class="trivia-progress"><div class="trivia-progress-bar" style="width:100%"></div></div>
        <div class="trivia-finale">
          <div class="trivia-finale-emoji">${msg.emoji}</div>
          <div class="trivia-finale-title">${escapeHtml(msg.title)}</div>
          <div class="trivia-finale-subtitle">${escapeHtml(msg.subtitle)}</div>
          <div class="trivia-finale-stats">
            <div class="trivia-finale-stat">
              <div class="trivia-finale-stat-value">${score}/${qs.length}</div>
              <div class="trivia-finale-stat-label">Score</div>
            </div>
            <div class="trivia-finale-stat">
              <div class="trivia-finale-stat-value">${pct}%</div>
              <div class="trivia-finale-stat-label">Accuracy</div>
            </div>
            <div class="trivia-finale-stat">
              <div class="trivia-finale-stat-value">${bestStreak}🔥</div>
              <div class="trivia-finale-stat-label">Best Streak</div>
            </div>
          </div>
          <button class="trivia-replay-btn" id="${widgetId}-replay">🔄 Play Again</button>
        </div>
      `;
      if (pct >= 60) {
        const finale = widget.querySelector('.trivia-finale');
        for (let burst = 0; burst < 3; burst++) {
          setTimeout(() => spawnConfetti(finale), burst * 400);
        }
      }
      widget.querySelector(`#${widgetId}-replay`).addEventListener('click', () => {
        currentQ = 0; score = 0; streak = 0; bestStreak = 0;
        renderQuestion();
      });
    }

    renderQuestion();
    block._triviaWidget = widget;
  } else {
    const pre = document.createElement('pre');
    pre.textContent = resultStr;
    result.appendChild(pre);
  }

  if (res && typeof res === 'object' && res.webview && res.webview.url) {
    const linkBar = document.createElement('div');
    linkBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;';
    const LINK_STYLE = 'display:inline-block;padding:4px 10px;border-radius:6px;font-size:0.8rem;text-decoration:none;color:#fff;';
    if (res.map_links && res.map_links.search) {
      const searchLink = document.createElement('a');
      searchLink.href = String(res.map_links.search);
      searchLink.target = '_blank'; searchLink.rel = 'noopener noreferrer';
      searchLink.textContent = '🔍 Search in Google Maps';
      searchLink.style.cssText = LINK_STYLE + 'background:#1a73e8;';
      linkBar.appendChild(searchLink);
    }
    if (res.map_links && res.map_links.directions) {
      const dirLink = document.createElement('a');
      dirLink.href = String(res.map_links.directions);
      dirLink.target = '_blank'; dirLink.rel = 'noopener noreferrer';
      dirLink.textContent = '🧭 Get Directions';
      dirLink.style.cssText = LINK_STYLE + 'background:#34a853;';
      linkBar.appendChild(dirLink);
    }
    if (!res.map_links) {
      const openLink = document.createElement('a');
      openLink.href = String(res.webview.url);
      openLink.target = '_blank'; openLink.rel = 'noopener noreferrer';
      openLink.textContent = '🔗 Open in new tab';
      openLink.style.cssText = LINK_STYLE + 'background:#1a73e8;';
      linkBar.appendChild(openLink);
    }
    result.appendChild(linkBar);
  }

  block.appendChild(toggle);
  block.appendChild(result);
  el.appendChild(block);

  if (block._triviaWidget) {
    el.appendChild(block._triviaWidget);
    delete block._triviaWidget;
  }

  if ((name === 'web_search' || name === 'search_media') && res && typeof res === 'object' && Array.isArray(res.results) && res.results.length > 0) {
    result.classList.add('open');
    const arrow = toggle.querySelector('span');
    if (arrow) arrow.innerHTML = '&#9660;';
  }

  if (res && typeof res === 'object' && res.webview && res.webview.url) {
    const webviewUrl = String(res.webview.url);
    let shouldEmbed = false;
    let iframeSandbox = 'allow-scripts allow-same-origin';
    if (res.webview.iframe) {
      const TRUSTED_MAP_HOSTS = ['maps.google.com', 'www.google.com', 'maps.googleapis.com'];
      try {
        const parsed = new URL(webviewUrl);
        if (TRUSTED_MAP_HOSTS.includes(parsed.hostname) && parsed.protocol === 'https:') {
          shouldEmbed = true;
          iframeSandbox = 'allow-scripts';
        }
      } catch (_e) { /* invalid URL — skip */ }
    } else if (webviewUrl.startsWith('skills/')) {
      shouldEmbed = true;
    }
    if (shouldEmbed) {
      const container = document.createElement('div');
      container.className = 'tool-webview-container';
      const iframe = document.createElement('iframe');
      iframe.src = webviewUrl;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer';
      iframe.setAttribute('sandbox', iframeSandbox);
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
      const fsBtn = document.createElement('button');
      fsBtn.className = 'webview-fullscreen-btn';
      fsBtn.textContent = '⛶ Full Screen';
      fsBtn.setAttribute('aria-label', 'Toggle full screen');
      fsBtn.addEventListener('click', () => {
        container.classList.toggle('webview-fullscreen');
        const isFs = container.classList.contains('webview-fullscreen');
        fsBtn.textContent = isFs ? '✕ Exit Full Screen' : '⛶ Full Screen';
        fsBtn.setAttribute('aria-label', isFs ? 'Exit full screen' : 'Toggle full screen');
      });
      container.appendChild(fsBtn);
      const embedLinkBar = document.createElement('div');
      embedLinkBar.className = 'webview-link-bar';
      if (res.map_links && res.map_links.search) {
        const sl = document.createElement('a');
        sl.href = String(res.map_links.search);
        sl.target = '_blank'; sl.rel = 'noopener noreferrer';
        sl.textContent = '🔍 Open in Maps';
        embedLinkBar.appendChild(sl);
      }
      if (res.map_links && res.map_links.directions) {
        const dl = document.createElement('a');
        dl.href = String(res.map_links.directions);
        dl.target = '_blank'; dl.rel = 'noopener noreferrer';
        dl.textContent = '🧭 Directions';
        embedLinkBar.appendChild(dl);
      }
      if (!res.map_links) {
        const ol = document.createElement('a');
        ol.href = webviewUrl;
        ol.target = '_blank'; ol.rel = 'noopener noreferrer';
        ol.textContent = '🔗 Open in new tab';
        embedLinkBar.appendChild(ol);
      }
      container.appendChild(embedLinkBar);
      el.appendChild(container);
    }
  }
}

// ── Message Action Helpers ────────────────────────────────
export function addMessageActions(el, role) {
  if (!el || el.dataset.actionsAdded) return;
  el.dataset.actionsAdded = 'true';

  const bar = document.createElement('div');
  bar.className = 'msg-actions';

  if (role === 'ai') {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.title = 'Copy response to clipboard';
    copyBtn.addEventListener('click', () => {
      const bubbles = el.querySelectorAll('.ai-bubble');
      const txt = [...bubbles].map(b => b.innerText).join('\n\n').trim();
      navigator.clipboard.writeText(txt)
        .then(() => showToast('Copied!'))
        .catch(() => {
          const ta = document.createElement('textarea');
          ta.value = txt; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          showToast('Copied!');
        });
    });

    const retryBtn = document.createElement('button');
    retryBtn.className = 'msg-action-btn';
    retryBtn.textContent = '🔄 Retry';
    retryBtn.title = 'Regenerate this response';
    retryBtn.addEventListener('click', async () => {
      if (State.isGenerating) { showToast('Please wait for the current response to finish.'); return; }
      const histFrom = parseInt(el.dataset.histFrom ?? '0');
      State.history.splice(histFrom + 1);
      removeDomFromElement(el);
      await handleSend(true, histFrom);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'msg-action-btn';
    delBtn.textContent = '🗑️';
    delBtn.title = 'Delete this response';
    delBtn.addEventListener('click', () => {
      if (State.isGenerating) { showToast('Cannot delete while generating.'); return; }
      const histFrom = parseInt(el.dataset.histFrom ?? '0');
      State.history.splice(histFrom + 1);
      removeDomFromElement(el);
      saveToSession();
    });

    bar.appendChild(copyBtn);
    bar.appendChild(retryBtn);
    bar.appendChild(delBtn);
  } else {
    const editBtn = document.createElement('button');
    editBtn.className = 'msg-action-btn';
    editBtn.textContent = '✏️ Edit';
    editBtn.title = 'Edit and resend';
    editBtn.addEventListener('click', () => {
      if (State.isGenerating) { showToast('Cannot edit while generating.'); return; }
      const histFrom = parseInt(el.dataset.histFrom ?? '0');
      const originalText = State.history[histFrom]?.text || '';
      const bubble = el.querySelector('.user-bubble');
      if (!bubble) return;
      const originalHtml = bubble.innerHTML;
      const ta = document.createElement('textarea');
      ta.className = 'msg-edit-area';
      ta.value = originalText;
      ta.rows = Math.max(2, Math.ceil(originalText.length / 60));
      const editActions = document.createElement('div');
      editActions.className = 'msg-edit-actions';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'msg-edit-save';
      saveBtn.textContent = '▶ Send';
      saveBtn.addEventListener('click', async () => {
        const newText = ta.value.trim();
        if (!newText) { showToast('Message cannot be empty.'); return; }
        removeDomFromElement(el);
        State.history.splice(histFrom);
        const chatInput = document.getElementById('chat-input');
        chatInput.value = newText;
        await handleSend();
      });
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'msg-edit-cancel';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => {
        bubble.innerHTML = originalHtml;
        editActions.remove();
        ta.remove();
      });
      editActions.appendChild(cancelBtn);
      editActions.appendChild(saveBtn);
      bubble.innerHTML = '';
      bubble.appendChild(ta);
      bubble.appendChild(editActions);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = ta.value.length;
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'msg-action-btn';
    delBtn.textContent = '🗑️';
    delBtn.title = 'Delete this turn';
    delBtn.addEventListener('click', () => {
      if (State.isGenerating) { showToast('Cannot delete while generating.'); return; }
      const histFrom = parseInt(el.dataset.histFrom ?? '0');
      State.history.splice(histFrom);
      removeDomFromElement(el);
      saveToSession();
    });

    bar.appendChild(editBtn);
    bar.appendChild(delBtn);
  }

  el.appendChild(bar);
}

export function removeDomFromElement(startEl) {
  const container = document.getElementById('chat-container');
  const children = [...container.children];
  const idx = children.indexOf(startEl);
  if (idx === -1) return;
  children.slice(idx).forEach(c => container.removeChild(c));
}

// ── Panels & Controls ───────────────────────────────────
export function hidePanels() { document.querySelectorAll('.overlay-panel').forEach(p => p.classList.remove('open')); }
window.hidePanels = hidePanels;

export function showPanel(n) {
  hidePanels(); if (n === 'chat') return;
  const panel = document.getElementById(`${n}-panel`);
  if (panel) panel.classList.add('open');
  if (n === 'memory') refreshMemoryPanel();
  if (n === 'history') refreshHistoryPanel();
  if (n === 'library') refreshLibraryPanel();
  if (n === 'tools') refreshToolsPanel();
}
window.showPanel = showPanel;

export function refreshToolsPanel() {
  const list = document.getElementById('tools-list');
  if (!list) return;
  list.innerHTML = '';
  Object.entries(TOOL_REGISTRY).forEach(([name, tool]) => {
    const item = document.createElement('div');
    item.className = 'tool-card';
    const params = tool.parameters?.properties ? Object.keys(tool.parameters.properties) : [];
    const paramStr = params.length ? params.map(p => {
      const req = (tool.parameters.required || []).includes(p);
      return `<span class="param-badge">${escapeHtml(p)}${req ? '' : '?'}</span>`;
    }).join('') : '<span class="param-badge-none">no parameters</span>';
    item.innerHTML = `
      <div class="tool-card-name">🔧 ${escapeHtml(name)}</div>
      <div class="tool-card-desc">${escapeHtml(tool.skillDescription || tool.description)}</div>
      <div class="tool-card-params">${paramStr}</div>
    `;
    const insertBtn = document.createElement('button');
    insertBtn.className = 'btn-block';
    insertBtn.style.marginTop = '8px';
    insertBtn.style.padding = '8px 10px';
    insertBtn.textContent = 'Insert into chat';
    insertBtn.onclick = () => {
      hidePanels();
      insertToolCallTemplate(name);
    };
    item.appendChild(insertBtn);
    list.appendChild(item);
  });
}

// ── Document Library Panel ──────────────────────────────
export async function ingestDocument(fileName, text) {
  if (!text || !text.trim()) return;
  const count = await embedAndStore(text, 'document', fileName);
  const summary = extractiveSummary(text);
  if (summary) await embedAndStore(summary, 'document_summary', fileName);
  showToast(`Stored "${fileName}" (${count} chunks)`);
  refreshLibraryPanel();
}

export async function refreshLibraryPanel() {
  const chunks = await getAllChunks();
  const sources = [...new Set(chunks.filter(c => c.category === 'document' || c.category === 'document_summary').map(c => c.source))];
  const list = document.getElementById('library-list');
  if (!list) return;
  list.innerHTML = sources.length ? '' : '<div style="color:var(--ollama-stone);font-size:0.9rem;text-align:center;padding:20px;">Library is empty.</div>';
  sources.forEach(src => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const textDiv = document.createElement('div');
    textDiv.className = 'history-item-text';
    textDiv.style.cursor = 'pointer';
    textDiv.addEventListener('click', () => openFileViewer(src));
    const strong = document.createElement('strong');
    strong.textContent = src;
    textDiv.appendChild(strong);
    const delBtn = document.createElement('button');
    delBtn.className = 'memory-item-del';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteSource(src); });
    item.appendChild(textDiv);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

export async function deleteSource(src) {
  if (!confirm(`Remove "${src}" from library?`)) return;
  const chunks = await getAllChunks();
  const toDelete = chunks.filter(c => c.source === src);
  for (const c of toDelete) await deleteChunk(c.id);
  refreshLibraryPanel();
}
window.deleteSource = deleteSource;

// ── History Panel ───────────────────────────────────────
export async function saveConversation(msgs) {
  if (!msgs.length) return;
  const { openRAGDB } = await import('./rag.js');
  const db = await openRAGDB(); const tx = db.transaction('conversations', 'readwrite');
  const title = msgs.find(m => m.role === 'user')?.text.slice(0, 50) || 'Untitled';
  tx.objectStore('conversations').put({ id: State.activeConversationId || Date.now().toString(), title, messages: msgs, updated: Date.now() });
}

export async function refreshHistoryPanel() {
  const { openRAGDB } = await import('./rag.js');
  const db = await openRAGDB();
  const tx = db.transaction('conversations', 'readonly');
  const req = tx.objectStore('conversations').getAll();
  req.onsuccess = () => {
    const list = document.getElementById('history-list'); if (!list) return;
    list.innerHTML = '';
    req.result.sort((a, b) => b.updated - a.updated).forEach(c => {
      const item = document.createElement('div'); item.className = 'history-item';
      item.innerHTML = `<div class="history-item-text"><div class="history-item-title">${escapeHtml(c.title)}</div></div>`;
      item.onclick = () => { State.history = c.messages; State.activeConversationId = c.id; renderRestoredMessages(); hidePanels(); };
      list.appendChild(item);
    });
  };
}

export function renderRestoredMessages() {
  const c = document.getElementById('chat-container'); c.innerHTML = '';
  let lastUserHistFrom = 0;
  State.history.forEach((m, idx) => {
    const isAi = m.role === 'model' || m.role === 'ai';
    const INTERNAL_PREFIXES = ['<|tool_response>', '<tool_response>', '[System:', 'I used the ', 'I clicked '];
    const isInternal = !isAi && INTERNAL_PREFIXES.some(p => m.text.startsWith(p));
    if (isInternal) return;
    if (isAi && m._isToolTurn) return;
    if (isAi && /^\s*<tool_call>[\s\S]*<\/tool_call>\s*$/.test(m.text)) return;
    const role = isAi ? 'ai' : 'user';
    const el = renderMessage(m.text, role, null, { images: m._images, audios: m._audios, videos: m._videos });
    if (role === 'user') {
      el.dataset.histFrom = idx;
      lastUserHistFrom = idx;
      addMessageActions(el, 'user');
    } else {
      el.dataset.histFrom = lastUserHistFrom;
      addMessageActions(el, 'ai');
    }
  });
}

export function newChat() {
  if (State.history.length) {
    saveConversation(State.history);
    if (localStorage.getItem('lm_auto_backup') === 'true') exportData();
  }
  State.history = [];
  State.activeConversationId = null;
  document.getElementById('chat-container').innerHTML = '';
  try { sessionStorage.removeItem('cloudchat_session'); } catch { /* storage may be unavailable */ }
  hidePanels();
}
window.newChat = newChat;

export function saveToSession() {
  try { sessionStorage.setItem('cloudchat_session', JSON.stringify(State.history)); } catch { /* storage may be unavailable */ }
}

export function restoreFromSession() {
  try {
    const saved = sessionStorage.getItem('cloudchat_session');
    if (saved) {
      const hist = JSON.parse(saved);
      if (Array.isArray(hist) && hist.length > 0) {
        State.history = hist;
        renderRestoredMessages();
        const welcomeMsg = document.getElementById('welcome-msg');
        if (welcomeMsg) welcomeMsg.remove();
        return true;
      }
    }
  } catch { /* ignore parse/storage errors */ }
  return false;
}

// ── Memory Panel ────────────────────────────────────────
export async function refreshMemoryPanel() {
  const all = await getAllChunks();
  const list = document.getElementById('memory-list');
  const pills = document.getElementById('memory-cat-pills');
  const query = (document.getElementById('memory-search')?.value || '').trim().toLowerCase();
  if (!list || !pills) return;

  const detailed = all.filter(c => c.category !== 'document_summary' && c.category !== 'document');
  const counts = detailed.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});

  pills.innerHTML = '';
  const categories = ['all', ...Object.keys(counts).sort()];
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-block';
    btn.style.width = 'auto';
    btn.style.padding = '4px 10px';
    btn.style.fontSize = '0.72rem';
    btn.style.borderRadius = '9999px';
    const count = cat === 'all' ? detailed.length : counts[cat];
    btn.textContent = `${cat} (${count || 0})`;
    if (State.memoryCategory === cat) {
      btn.style.background = 'var(--ollama-black)';
      btn.style.color = 'var(--ollama-white)';
      btn.style.borderColor = 'var(--ollama-black)';
    }
    btn.onclick = () => {
      State.memoryCategory = cat;
      refreshMemoryPanel();
    };
    pills.appendChild(btn);
  });

  const filtered = detailed
    .filter(c => State.memoryCategory === 'all' || c.category === State.memoryCategory)
    .filter(c => !query || c.text.toLowerCase().includes(query) || String(c.source || '').toLowerCase().includes(query));

  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = '<div style="color:var(--ollama-stone);font-size:0.85rem;text-align:center;padding:16px;">No matches found.</div>';
    return;
  }

  filtered.slice(0, 150).forEach(c => {
    const item = document.createElement('div');
    item.className = 'memory-item';
    const snippet = c.text.length > 140 ? `${c.text.slice(0, 140)}...` : c.text;
    const textDiv = document.createElement('div');
    textDiv.className = 'memory-item-text';
    textDiv.style.cursor = 'pointer';
    textDiv.addEventListener('click', () => openMemoryViewer(c.id));
    textDiv.appendChild(document.createTextNode(snippet));
    const metaDiv = document.createElement('div');
    metaDiv.className = 'memory-item-meta';
    const catSpan = document.createElement('span');
    const ALLOWED_CATEGORIES = ['fact', 'preference', 'finding', 'document', 'document_summary', 'conversation', 'person', 'event', 'note'];
    const safeCat = ALLOWED_CATEGORIES.includes(c.category) ? c.category : 'fact';
    catSpan.className = `mem-cat mem-cat-${safeCat}`;
    catSpan.textContent = c.category;
    metaDiv.appendChild(catSpan);
    metaDiv.appendChild(document.createTextNode(' ' + String(c.source || 'unknown')));
    textDiv.appendChild(metaDiv);
    const delBtn = document.createElement('button');
    delBtn.className = 'memory-item-del';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChunk(c.id).then(() => refreshMemoryPanel()).then(() => refreshLibraryPanel());
    });
    item.appendChild(textDiv);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

export async function clearMemories() {
  if (!confirm('Clear all memories?')) return;
  const { openRAGDB } = await import('./rag.js');
  const db = await openRAGDB();
  const tx = db.transaction('chunks', 'readwrite');
  tx.objectStore('chunks').clear();
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  await refreshMemoryPanel();
  await refreshLibraryPanel();
}
window.clearMemories = clearMemories;

// ── File Viewer ─────────────────────────────────────────
export async function openFileViewer(sourceName) {
  const chunks = await getAllChunks();
  const fileChunks = chunks.filter(c => c.source === sourceName && (c.category === 'document' || c.category === 'document_summary'));
  const overlay = document.getElementById('file-viewer-overlay');
  document.getElementById('file-viewer-title').textContent = sourceName;
  const body = document.getElementById('file-viewer-body');
  body.innerHTML = '';

  if (!fileChunks.length) {
    body.innerHTML = '<div style="color:var(--ollama-stone);text-align:center;padding:20px;">No content found.</div>';
  } else {
    const summaryChunks = fileChunks.filter(c => c.category === 'document_summary');
    const contentChunks = fileChunks.filter(c => c.category === 'document');
    if (summaryChunks.length) {
      const summarySection = document.createElement('div');
      summarySection.style.cssText = 'margin-bottom: 16px;';
      const summaryLabel = document.createElement('div');
      summaryLabel.style.cssText = 'font-size: 0.75rem; font-weight: 600; color: var(--ollama-stone); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;';
      summaryLabel.textContent = 'Summary';
      summarySection.appendChild(summaryLabel);
      summaryChunks.forEach(c => {
        const div = document.createElement('div');
        div.className = 'viewer-chunk';
        div.textContent = c.text;
        summarySection.appendChild(div);
      });
      body.appendChild(summarySection);
    }
    if (contentChunks.length) {
      const contentLabel = document.createElement('div');
      contentLabel.style.cssText = 'font-size: 0.75rem; font-weight: 600; color: var(--ollama-stone); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;';
      contentLabel.textContent = `Content (${contentChunks.length} chunks)`;
      body.appendChild(contentLabel);
      contentChunks.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'viewer-chunk';
        div.textContent = c.text;
        const meta = document.createElement('div');
        meta.className = 'viewer-chunk-meta';
        meta.textContent = `Chunk ${i + 1} of ${contentChunks.length}`;
        div.appendChild(meta);
        body.appendChild(div);
      });
    }
  }

  document.getElementById('file-viewer-delete-btn').onclick = async () => {
    if (!confirm(`Remove "${sourceName}" from library?`)) return;
    const allChunks = await getAllChunks();
    const toDelete = allChunks.filter(c => c.source === sourceName);
    for (const c of toDelete) await deleteChunk(c.id);
    overlay.classList.remove('open');
    refreshLibraryPanel();
    showToast(`"${sourceName}" removed from library`);
  };

  overlay.classList.add('open');
}
window.openFileViewer = openFileViewer;

// ── Memory Viewer / Editor ──────────────────────────────
export async function openMemoryViewer(chunkId) {
  const chunks = await getAllChunks();
  const chunk = chunks.find(c => c.id === chunkId);
  if (!chunk) { showToast('Memory not found'); return; }

  const overlay = document.getElementById('memory-viewer-overlay');
  const ALLOWED_CATEGORIES = ['fact', 'preference', 'finding', 'document', 'document_summary', 'conversation', 'person', 'event', 'note'];
  const safeCat = ALLOWED_CATEGORIES.includes(chunk.category) ? chunk.category : 'fact';
  document.getElementById('memory-viewer-title').textContent = `Memory — ${chunk.category}`;

  const body = document.getElementById('memory-viewer-body');
  body.innerHTML = '';

  const metaInfo = document.createElement('div');
  metaInfo.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; align-items: center;';
  const catBadge = document.createElement('span');
  catBadge.className = `mem-cat mem-cat-${safeCat}`;
  catBadge.textContent = chunk.category;
  metaInfo.appendChild(catBadge);
  const sourceSpan = document.createElement('span');
  sourceSpan.style.cssText = 'font-size: 0.75rem; color: var(--ollama-stone);';
  sourceSpan.textContent = `Source: ${chunk.source || 'unknown'}`;
  metaInfo.appendChild(sourceSpan);
  if (chunk.timestamp) {
    const timeSpan = document.createElement('span');
    timeSpan.style.cssText = 'font-size: 0.75rem; color: var(--ollama-stone);';
    timeSpan.textContent = new Date(chunk.timestamp).toLocaleString();
    metaInfo.appendChild(timeSpan);
  }
  body.appendChild(metaInfo);

  const editLabel = document.createElement('div');
  editLabel.style.cssText = 'font-size: 0.75rem; font-weight: 600; color: var(--ollama-stone); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;';
  editLabel.textContent = 'Content (editable)';
  body.appendChild(editLabel);

  const textarea = document.createElement('textarea');
  textarea.className = 'viewer-edit-area';
  textarea.value = chunk.text;
  textarea.id = 'memory-edit-textarea';
  body.appendChild(textarea);

  const actions = document.getElementById('memory-viewer-actions');
  actions.innerHTML = '';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'viewer-btn-danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = async () => {
    if (!confirm('Delete this memory?')) return;
    await deleteChunk(chunkId);
    overlay.classList.remove('open');
    refreshMemoryPanel();
    showToast('Memory deleted');
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'viewer-btn-secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => overlay.classList.remove('open');

  const saveBtn = document.createElement('button');
  saveBtn.className = 'viewer-btn-primary';
  saveBtn.textContent = 'Save Changes';
  saveBtn.onclick = async () => {
    const newText = document.getElementById('memory-edit-textarea').value.trim();
    if (!newText) { showToast('Memory text cannot be empty'); return; }
    if (newText === chunk.text) { overlay.classList.remove('open'); return; }
    await saveMemoryEdit(chunkId, newText);
    overlay.classList.remove('open');
    refreshMemoryPanel();
    showToast('Memory updated');
  };

  actions.appendChild(deleteBtn);
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  overlay.classList.add('open');
}
window.openMemoryViewer = openMemoryViewer;

export async function saveMemoryEdit(chunkId, newText) {
  const chunks = await getAllChunks();
  const chunk = chunks.find(c => c.id === chunkId);
  if (!chunk) return;
  const vectors = await embedTexts([newText]);
  chunk.text = newText;
  chunk.embedding = vectors[0];
  chunk.timestamp = Date.now();
  await storeChunks([chunk]);
}

// ── Attachment Choice Modal ─────────────────────────────
let _pendingAttachFile = null;

export function showAttachModal(file) {
  _pendingAttachFile = file;
  document.getElementById('attach-modal-filename').textContent = file.name;
  document.getElementById('attach-modal-overlay').classList.add('open');
}

export function getPendingAttachFile() {
  const file = _pendingAttachFile;
  _pendingAttachFile = null;
  return file;
}

// ── Image Lightbox ──────────────────────────────────────
export function openLightbox(src) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Full-size image';
  overlay.appendChild(img);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}
window.openLightbox = openLightbox;

// ── Import/Export ────────────────────────────────────────
export function exportData() {
  getAllChunks().then(async chunks => {
    const { openRAGDB } = await import('./rag.js');
    const db = await openRAGDB();
    const conversations = await new Promise(r => db.transaction('conversations').objectStore('conversations').getAll().onsuccess = e => r(e.target.result));
    const blob = new Blob([JSON.stringify({ chunks, conversations })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'localmind_backup.json'; a.click();
  }).catch((e) => { console.error('Export failed', e); showToast('Export failed.'); });
}
window.exportData = exportData;

export function dismissImport() { document.getElementById('import-banner').classList.remove('open'); }
window.dismissImport = dismissImport;
