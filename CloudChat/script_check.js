  </div>

  <!-- Shared Panels -->
  <div id="library-panel" class="overlay-panel">
    <div class="panel-window">
      <div class="panel-header"><strong>Library</strong><button onclick="hidePanels()" class="action-btn">✕</button></div>
      <div class="panel-content">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:24px;">
          <button id="lib-upload-btn" class="btn-block btn-primary">Add File</button>
          <button id="lib-clear-btn" class="btn-block btn-gray">Clear All</button>
        </div>
        <div id="library-list"></div>
      </div>
    </div>
  </div>

  <div id="batch-panel" class="overlay-panel">
    <div class="panel-window">
      <div class="panel-header"><strong>Batch Runner</strong><button onclick="hidePanels()" class="action-btn">✕</button></div>
      <div class="panel-content">
        <textarea id="batch-input" style="width:100%; height:200px; font-family:var(--font-mono); border:1px solid var(--ollama-border); border-radius:12px; padding:16px; outline:none;" placeholder="Task 1...&#10;Task 2 with {{previous}}..."></textarea>
        <button id="run-batch-btn" class="btn-block btn-primary" style="margin-top:16px;">Run Tasks</button>
      </div>
    </div>
  </div>

  <div id="history-panel" class="overlay-panel">
    <div class="panel-window">
      <div class="panel-header"><strong>History</strong><button onclick="hidePanels()" class="action-btn">✕</button></div>
      <div class="panel-content" id="history-list"></div>
    </div>
  </div>

  <div id="settings-panel" class="overlay-panel">
    <div class="panel-window">
      <div class="panel-header"><strong>Settings</strong><button onclick="hidePanels()" class="action-btn">✕</button></div>
      <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--ollama-stone);">SYSTEM PROMPT TEMPLATE</label>
            <textarea id="system-prompt" style="width:100%; height:100px; border:1px solid var(--ollama-border); border-radius:12px; padding:12px; margin-top:8px; outline:none;">You are a helpful AI assistant. Answer concisely and precisely. Use LaTeX for math.</textarea>
          </div>
          <div>
            <label style="font-size:0.75rem; font-weight:600; color:var(--ollama-stone);">API KEY (TAVILY/BRAVE)</label>
            <input type="password" id="search-key" placeholder="Enter key..." style="width:100%; border:1px solid var(--ollama-border); border-radius:30px; padding:12px 20px; margin-top:8px; outline:none;">
          </div>
          <button id="purge-cache-btn" class="btn-block btn-gray">Purge Model Cache</button>
          <button id="share-trigger" class="btn-block btn-primary">Share Session</button>
        </div>
      </div>
    </div>
  </div>

  <div id="share-modal" class="overlay-panel">
    <div class="panel-window" style="max-width:400px">
      <div class="panel-header"><strong>Share Chat</strong><button onclick="hidePanels()" class="action-btn">✕</button></div>
      <div class="panel-content">
        <input type="password" id="share-pass" placeholder="Optional Passphrase" style="width:100%; border:1px solid var(--ollama-border); border-radius:30px; padding:12px 20px; margin-bottom:16px; outline:none;">
        <button id="gen-share-btn" class="btn-block btn-primary">Generate Link</button>
        <div id="share-result" class="hidden mt-4">
          <input type="text" id="share-url" readonly style="width:100%; border:1px solid var(--ollama-border); border-radius:12px; padding:12px; font-size:0.7rem; background:var(--ollama-snow); margin-top:16px;">
          <button id="copy-share-btn" class="btn-block btn-gray" style="margin-top:12px;">Copy Link</button>
        </div>
      </div>
    </div>
  </div>

  <input type="file" id="global-file-input" class="hidden" multiple>

  <script type="module">
    import { LlmInference, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai';
    import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

    // --- Service Worker ---
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
      });
    }

    // --- State ---
    const State = {
      inference: null, history: [], conversationId: Date.now().toString(36),
      isGenerating: false, modelReady: false, embeddingReady: false,
      embeddingWorker: null, library: [], activeContext: new Set(),
      activeModel: './gemma-4-E2B-it-web.task'
    };

    const DB = {
      name: 'GemmaUltimate_DB_v3',
      async open() {
        return new Promise((res) => {
          const req = indexedDB.open(this.name, 1);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('vectors')) db.createObjectStore('vectors', { keyPath: 'id' });
          };
          req.onsuccess = () => res(req.result);
        });
      },
      async save(store, data) {
        const db = await this.open(); const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(data); return new Promise(res => tx.oncomplete = res);
      },
      async getAll(store) {
        const db = await this.open(); const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll(); return new Promise(res => req.onsuccess = () => res(req.result));
      },
      async delete(store, id) {
        const db = await this.open(); const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id); return new Promise(res => tx.oncomplete = res);
      }
    };

    // --- UI Logic ---
    window.showPanel = (name) => {
      hidePanels(); if (name === 'chat') return;
      document.getElementById(`${name}-panel`).classList.add('open');
      
      const sidebarItems = Array.from(document.querySelectorAll('.sidebar-item')).filter(n => n.innerText.toLowerCase().includes(name));
      sidebarItems.forEach(i => i.classList.add('active'));
      const navItems = Array.from(document.querySelectorAll('.nav-item')).filter(n => n.innerText.toLowerCase().includes(name));
      navItems.forEach(i => i.classList.add('active'));
      
      if (name === 'library') refreshLibraryUI();
      if (name === 'history') refreshHistoryUI();
    };

    window.hidePanels = () => {
      document.querySelectorAll('.overlay-panel').forEach(p => p.classList.remove('open'));
      document.querySelectorAll('.nav-item, .sidebar-item').forEach(i => i.classList.remove('active'));
      document.getElementById('nav-chat').classList.add('active');
      document.querySelector('.sidebar-item').classList.add('active');
    };

    const updateStatus = (type, text) => {
      const badge = document.getElementById('status-badge');
      const textEl = document.getElementById('status-text');
      badge.className = `status-badge ${type}`;
      textEl.textContent = text;
    };

    // --- Embedding Engine ---
    async function initEmbedding() {
      const code = `
        import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.19/+esm';
        let embedder = null;
        self.onmessage = async (e) => {
          if (e.data.type === 'load') { embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'); self.postMessage({ type: 'ready' }); }
          else if (e.data.type === 'embed') { const out = await embedder(e.data.text, { pooling: 'mean', normalize: true }); self.postMessage({ type: 'result', vec: Array.from(out.data), id: e.data.id }); }
        };
      `;
      const blob = new Blob([code], { type: 'application/javascript' });
      State.embeddingWorker = new Worker(URL.createObjectURL(blob), { type: 'module' });
      State.embeddingWorker.onmessage = e => { if (e.data.type === 'ready') State.embeddingReady = true; };
      State.embeddingWorker.postMessage({ type: 'load' });
    }

    function embed(text) {
      return new Promise(res => {
        const id = Math.random().toString(36);
        const h = e => { if (e.data.id === id) { State.embeddingWorker.removeEventListener('message', h); res(e.data.vec); } };
        State.embeddingWorker.addEventListener('message', h);
        State.embeddingWorker.postMessage({ type: 'embed', text, id });
      });
    }

    const TOOL_REGISTRY = {
      calculate: {
        description: 'Evaluate a mathematical expression. Use for arithmetic, unit conversions, percentages.',
        parameters: { type: 'object', properties: { expression: { type: 'string', description: 'Math expression to evaluate' } }, required: ['expression'] },
        async execute(args) { try { const expr = String(args.expression).replace(/[^0-9+\-*/.()% ]/g, ''); return { result: eval(expr) }; } catch (e) { return { error: e.message }; } }
      },
      get_current_time: {
        description: 'Get the current date and time.',
        parameters: { type: 'object', properties: { timezone: { type: 'string', description: 'IANA timezone' } }, required: [] },
        async execute(args) { const opts = { dateStyle: 'full', timeStyle: 'long' }; if (args.timezone) opts.timeZone = args.timezone; return { datetime: new Intl.DateTimeFormat('en-US', opts).format(new Date()) }; }
      },
      store_memory: {
        description: 'Store an important fact, preference, or finding for later recall.',
        parameters: { type: 'object', properties: { content: { type: 'string', description: 'The information to remember' }, category: { type: 'string', enum: ['fact', 'preference', 'finding', 'task'] } }, required: ['content'] },
        async execute(args) { const id = Date.now().toString(36); const vec = State.embeddingReady ? await embed(args.content) : null; await DB.save('vectors', { id, content: args.content, vec, category: args.category || 'fact', date: Date.now() }); return { stored: true }; }
      },
      search_memory: {
        description: 'Search your stored memories, past conversations, and documents.',
        parameters: { type: 'object', properties: { query: { type: 'string', description: 'What to search for' } }, required: ['query'] },
        async execute(args) {
          if (!State.embeddingReady) return { error: "Search engine warming up..." };
          const qVec = await embed(args.query); const all = await DB.getAll('vectors');
          const results = all.map(m => ({ ...m, score: cosineSim(qVec, m.vec) })).filter(m => m.score > 0.5).sort((a,b) => b.score - a.score).slice(0, 3);
          return { found: results.length > 0, memories: results.map(r => ({ content: r.content, category: r.category })) };
        }
      },
      web_search: {
        description: 'Search the web for current information.',
        parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] },
        async execute(args) {
          const key = document.getElementById('search-key').value; if (!key) return { error: "No API key configured." };
          try {
            const r = await fetch('https://api.tavily.com/search', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({api_key: key, query: args.query, max_results: 3}) });
            const d = await r.json(); return { results: d.results?.map(it => ({ title: it.title, snippet: it.content, url: it.url })) || [] };
          } catch (e) { return { error: e.message }; }
        }
      }
    };

    function cosineSim(a, b) {
      if(!a || !b) return 0;
      let d=0, nA=0, nB=0;
      for(let i=0; i<a.length; i++){ d+=a[i]*b[i]; nA+=a[i]**2; nB+=b[i]**2; }
      return d / (Math.sqrt(nA) * Math.sqrt(nB));
    }

    // --- Inference Engine ---
    async function initGemma() {
      try {
        updateStatus('loading', 'Waking up Gemma...');
        const fileset = await FilesetResolver.forGenAiTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm");
        State.inference = await LlmInference.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: State.activeModel, delegate: "GPU" },
          maxTokens: 2048, temperature: 0.7, topK: 40
        });
        State.modelReady = true; updateStatus('online', 'Ready');
        document.getElementById('chat-input').disabled = false; document.getElementById('send-btn').disabled = false;
      } catch (e) { updateStatus('error', 'Brain Failure'); }
    }

    function buildAgentSystemPrompt(userPrompt) {
      const toolDefs = Object.entries(TOOL_REGISTRY).map(([name, t]) => ({ type: 'function', function: { name, description: t.description, parameters: t.parameters } }));
      return `${userPrompt}

<tools>
${JSON.stringify(toolDefs, null, 2)}
</tools>

To call a function, output EXACTLY this format:
<tool_call>
{"name": "function_name", "arguments": {"arg1": "value1"}}
</tool_call>`;
    }

    async function sendMessage(override = null) {
      const input = document.getElementById('chat-input');
      const text = override || input.value.trim();
      if (!text || State.isGenerating) return;
      if (!override) { input.value = ''; renderMessage(text, 'user'); State.history.push({ role: 'user', text }); }
      State.isGenerating = true; const aiEl = renderMessage('', 'ai'); let fullText = "";
      const sysTemplate = document.getElementById('system-prompt').value;
      const sysPrompt = buildAgentSystemPrompt(sysTemplate);
      const context = State.history.slice(-10).map(m => `<|turn|>${m.role==='ai'?'model':'user'}\n${m.text}<turn|>`).join('\n');
      const prompt = `<|turn|>system\n<|think|>\n${sysPrompt}\n<turn|>\n${context}\n<|turn|>model\n`;
      try {
        await new Promise(res => { State.inference.generateResponse(prompt, (chunk, done) => { fullText += chunk; renderMessage(fullText, 'ai', aiEl); if (done) res(); }); });
        const tcMatch = fullText.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
        if (tcMatch) {
          try {
            const call = JSON.parse(tcMatch[1]); const tool = TOOL_REGISTRY[call.name];
            if (tool) {
              renderToolBlock(call.name, aiEl); const result = await tool.execute(call.arguments);
              State.history.push({ role: 'ai', text: fullText }); State.history.push({ role: 'user', text: `<tool_response>${JSON.stringify(result)}</tool_response>` });
              State.isGenerating = false; return sendMessage(true);
            }
          } catch(e) {}
        }
        State.history.push({ role: 'ai', text: fullText });
      } finally { State.isGenerating = false; saveChat(); }
    }

    function renderMessage(text, role, el = null) {
      if (!el) { el = document.createElement('div'); el.className = `message ${role}`; document.getElementById('chat-container').appendChild(el); }
      if (role === 'user') { el.innerHTML = `<div class="user-bubble">${DOMPurify.sanitize(text)}</div>`; return el; }
      
      const parsed = parseThought(text);
      let contentHtml = parsed.thought ? `<div class="thought-container"><div class="thought-header">Thought <span>▶</span></div><div class="thought-content">${parsed.thought}</div></div>` : '';
      contentHtml += `<div class="msg-body">${DOMPurify.sanitize(marked.parse(parsed.content || (parsed.thinking ? '...' : '')))}</div>`;
      
      el.innerHTML = contentHtml;
      const tB = el.querySelector('.thought-container');
      if (tB) {
        if (parsed.thinking) tB.querySelector('.thought-header').classList.add('pulse');
        tB.onclick = () => { tB.classList.toggle('open'); tB.querySelector('span').innerText = tB.classList.contains('open') ? '▼' : '▶'; };
      }
      
      if (window.MathJax) MathJax.typesetPromise([el]);
      const c = document.getElementById('chat-container'); c.scrollTop = c.scrollHeight;
      return el;
    }

    function parseThought(text) {
      const s = '<|channel|>thought', e = '<channel|>';
      const si = text.indexOf(s); if (si === -1) return { thought: null, content: text };
      const ci = si + s.length; const ei = text.indexOf(e, ci);
      if (ei === -1) return { thought: text.substring(ci), content: "", thinking: true };
      return { thought: text.substring(ci, ei), content: text.substring(ei + e.length), thinking: false };
    }

    function renderToolBlock(name, el) {
      const b = document.createElement('div'); b.className = 'tool-call-block';
      b.innerHTML = `<span class="llama-icon" style="width:14px; height:14px"></span>Executing <strong>${name}</strong>`;
      el.appendChild(b);
    }

    // --- Library & File Ingestion ---
    async function ingest(file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]; let text = "";
        if (file.name.endsWith('.pdf')) {
          const pdf = await pdfjsLib.getDocument({ data: atob(base64) }).promise;
          for(let i=1; i<=pdf.numPages; i++) text += (await (await pdf.getPage(i)).getTextContent()).items.map(it => it.str).join(' ') + " ";
        } else if (file.name.endsWith('.docx')) { text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value; }
        else if (!file.type.startsWith('image/')) { text = await file.text(); }
        const id = Math.random().toString(36).slice(2);
        await DB.save('files', { id, name: file.name, type: file.type, data: base64, text, date: Date.now() });
        refreshLibraryUI();
      };
      reader.readAsDataURL(file);
    }

    async function refreshLibraryUI() {
      State.library = await DB.getAll('files');
      const list = document.getElementById('library-list'); list.innerHTML = '';
      State.library.forEach(f => {
        const item = document.createElement('button'); item.className = 'sidebar-item';
        item.style = 'border:1px solid var(--ollama-border); margin-bottom:8px; width:100%';
        const isAttached = State.activeContext.has(f.id);
        item.innerHTML = `
          <input type="checkbox" ${isAttached?'checked':''} onchange="event.stopPropagation(); toggleContext('${f.id}')" style="width:18px; height:18px; accent-color:black;">
          <div style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</div>
          <span onclick="event.stopPropagation(); deleteFile('${f.id}')" style="cursor:pointer; opacity:0.5">✕</span>
        `;
        list.appendChild(item);
      });
      updateContextChips();
    }

    window.toggleContext = id => {
      if (State.activeContext.has(id)) State.activeContext.delete(id); else State.activeContext.add(id);
      updateContextChips();
    };

    window.deleteFile = async id => { if (confirm('Delete?')) { await DB.delete('files', id); State.activeContext.delete(id); refreshLibraryUI(); } };

    function updateContextChips() {
      const bars = [document.getElementById('active-context'), document.getElementById('sidebar-context-list')];
      bars.forEach(bar => {
        if (!bar) return; bar.innerHTML = '';
        if (State.activeContext.size === 0) { bar.classList.add('hidden'); return; }
        bar.classList.remove('hidden');
        State.activeContext.forEach(id => {
          const f = State.library.find(x => x.id === id); if (!f) return;
          const chip = document.createElement('div');
          chip.className = bar.id === 'active-context' ? 'context-chip' : 'sidebar-item active';
          chip.innerHTML = `<span>${f.name}</span><span style="cursor:pointer; opacity:0.5" onclick="toggleContext('${id}')">✕</span>`;
          bar.appendChild(chip);
        });
      });
    }

    // --- Slash Menu ---
    function handleSlash(val) {
      const menu = document.getElementById('slash-menu');
      if (val.startsWith('/')) {
        const q = val.slice(1).toLowerCase();
        const tools = Object.keys(TOOL_REGISTRY).concat(['clear', 'library', 'batch']).filter(t => t.startsWith(q));
        if (tools.length) {
          menu.innerHTML = tools.map(t => `<div class="slash-item" onclick="applySlash('${t}')"><span class="slash-name">/${t}</span></div>`).join('');
          menu.style.display = 'flex';
        } else menu.style.display = 'none';
      } else menu.style.display = 'none';
    }

    window.applySlash = t => {
      const input = document.getElementById('chat-input');
      if (t === 'clear') { State.history = []; document.getElementById('chat-container').innerHTML = ''; input.value = ''; }
      else if (t === 'library') showPanel('library');
      else if (t === 'batch') showPanel('batch');
      else input.value = `/${t} `;
      document.getElementById('slash-menu').style.display = 'none';
      input.focus();
    };

    // --- Persistence ---
    async function saveChat() {
      const title = State.history[0]?.text.slice(0, 30) || "Chat";
      await DB.save('chats', { id: State.conversationId, title, history: State.history, date: Date.now() });
    }

    async function refreshHistoryUI() {
      const all = await DB.getAll('chats');
      const list = document.getElementById('history-list'); list.innerHTML = '';
      all.sort((a,b) => b.date - a.date).forEach(c => {
        const item = document.createElement('button'); item.className = 'sidebar-item';
        item.style = 'border:1px solid var(--ollama-border); margin-bottom:8px; width:100%';
        item.innerHTML = `<div style="flex:1">${c.title}</div><div style="font-size:0.7rem; opacity:0.5">${new Date(c.date).toLocaleDateString()}</div>`;
        item.onclick = () => {
          State.conversationId = c.id; State.history = c.history; document.getElementById('chat-container').innerHTML = '';
          State.history.forEach(m => renderMessage(m.text, m.role)); hidePanels();
        };
        list.appendChild(item);
      });
    }

    // --- Init ---
    document.getElementById('send-btn').onclick = () => sendMessage();
    document.getElementById('chat-input').oninput = e => handleSlash(e.target.value);
    document.getElementById('chat-input').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    document.getElementById('attach-trigger').onclick = () => document.getElementById('global-file-input').click();
    document.getElementById('lib-upload-btn').onclick = () => document.getElementById('global-file-input').click();
    document.getElementById('global-file-input').onchange = e => { for(const f of e.target.files) ingest(f); };
    document.getElementById('lib-clear-btn').onclick = async () => { if (confirm('Clear library?')) { const db = await DB.open(); db.transaction('files', 'readwrite').objectStore('files').clear(); State.activeContext.clear(); refreshLibraryUI(); } };
    document.getElementById('purge-cache-btn').onclick = async () => { if (confirm('Purge model cache?')) { const keys = await caches.keys(); for (const k of keys) await caches.delete(k); location.reload(); } };
    document.getElementById('share-trigger').onclick = () => showPanel('share');

    window.onload = () => { initGemma(); initEmbedding(); refreshLibraryUI(); };
  </script>
</body>
</html>
