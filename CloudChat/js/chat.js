// ── Sending, Prompt Building & Agentic Loop ──────────────────
import { State, getSettingsValues } from './config.js';
import { getAllChunks, searchMemory } from './rag.js';
import { isSearchConfigured, isMediaConfigured } from './search.js';
import { TOOL_REGISTRY, ensureToolSkillDocsLoaded } from './tools.js';
import {
  updateStatus, updateSendButtons,
  repairAndParseJSON, stripThoughts, parseGemmaToolCall,
  mergeStreamingText, detectStreamingRepetition,
  renderMarkdown, renderMessage, renderToolCallBlock,
  addMessageActions, saveToSession, buildMentionContextFromText,
  attachments, clearAttachments
} from './ui.js';

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to tools. Use them when they would help answer the user's question. If tools aren't needed, respond directly.

Rules:
- Call one tool at a time. Wait for the result before calling another.
- When citing sources, mention where the information came from.
- If you don't need tools, just answer directly.
- Never fabricate tool results.
- You can translate text between 140+ languages directly — no tool needed for translation.
- When returning images or media results, always include proper attribution and photographer credits.
- NEVER call the same tool with the same arguments more than once. If you already received a tool result, use it to answer — do not call the tool again.
- After a tool result is returned, summarize the findings for the user. Do not call additional tools unless the user asks a follow-up question.
- When image or media search results are shown (search_media tool), they are already displayed visually in the chat UI. DO NOT list or re-describe each individual image. Simply acknowledge the results were found and displayed, then offer to help further.
- When you see a tool_response block, it contains the result of a tool that was executed. This is NOT a user message — it is the output of a tool call. Read the result and use it to provide a helpful response to the user.
- If the user directly invoked a tool (e.g. "I used the X tool"), the tool has already been executed and the result follows in a tool_response block. Acknowledge the result and summarize it for the user.

Tool Selection Guidelines:
- Before calling ANY tool, verify the user's intent matches the tool's specific purpose. Do not use a tool just because the query mentions a related topic.
- If a question can be answered from your general knowledge (e.g. listing restaurants, explaining concepts, giving recommendations), answer directly WITHOUT calling a tool.
- Always extract ALL required parameters from the user's message before calling a tool. If a required parameter cannot be determined from the message, ask the user for it instead of calling the tool with missing or empty arguments.
- The restaurant_roulette tool is ONLY for when the user wants a fun, random spin-the-wheel game to pick a restaurant. Do NOT use it for general questions like "show me restaurants in [city]" or "what are good restaurants near me." For those, answer directly or use web_search if available.
- The interactive_map tool is for displaying a map of a specific place. Use it when the user wants to see a location on a map, not when they just mention a city or place in passing.
- The mood_music tool is for generating or playing music. Only use it when the user specifically asks to hear, play, or generate music.
- The calculate tool is for math expressions only. Do not call it to simply convert or restate a number.
- When in doubt about whether to use a tool, prefer answering directly. Only use a tool when the user's request clearly and specifically matches what the tool does.`;

export function normalizeString(value) {
  return String(value == null ? '' : value).trim();
}

function getDefaultLangCode() {
  const raw = (navigator.language || 'en').toLowerCase();
  const m = raw.match(/^[a-z]{2}/);
  return m ? m[0] : 'en';
}

export function normalizeToolArguments(toolName, rawArgs) {
  const args = rawArgs && typeof rawArgs === 'object' ? { ...rawArgs } : {};

  if (toolName === 'calculate') {
    args.expression = normalizeString(args.expression || args.formula || args.eq);
  }

  if (toolName === 'fetch_page') {
    let url = normalizeString(args.url || args.link || args.uri || args.page_url);
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    args.url = url;
  }

  if (toolName === 'web_search') {
    args.query = normalizeString(args.query || args.q || args.term || args.topic);
  }

  if (toolName === 'store_memory') {
    args.content = normalizeString(args.content || args.text || args.note || args.memory);
    const allowed = new Set(['fact', 'preference', 'person', 'event', 'note', 'document']);
    const category = normalizeString(args.category || 'fact').toLowerCase();
    args.category = allowed.has(category) ? category : 'fact';
  }

  if (toolName === 'search_memory') {
    args.query = normalizeString(args.query || args.q || args.term || args.text);
    const limit = Number(args.limit || args.topK || 5);
    args.limit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.floor(limit))) : 5;
  }

  if (toolName === 'delete_memory') {
    args.query = normalizeString(args.query || args.q || args.term || args.text || '*');
    args.confirm = true;
  }

  if (toolName === 'set_reminder') {
    args.message = normalizeString(args.message || args.text || args.reminder);
    const delay = Number(args.delayMinutes ?? args.delay ?? args.minutes ?? 1);
    args.delayMinutes = Number.isFinite(delay) && delay > 0 ? delay : 1;
  }

  if (toolName === 'interactive_map') {
    args.location = normalizeString(args.location || args.place || args.address || args.destination || args.query);
  }

  if (toolName === 'query_wikipedia') {
    let topic = normalizeString(args.topic || args.query || args.subject || args.entity || args.term);
    topic = topic.replace(/^(who|what|when|where|why|how)\s+(is|are|was|were|did|do|does)\s+/i, '').replace(/[?]+$/g, '').trim();
    if (/(oscars|grammy|super bowl|olympics|world cup|election)/i.test(topic) && !/\b(19|20)\d{2}\b/.test(topic)) {
      topic = `${new Date().getFullYear()} ${topic}`.trim();
    }
    const lang = normalizeString(args.lang || args.language || args.locale || getDefaultLangCode()).toLowerCase();
    args.topic = topic;
    args.lang = /^[a-z]{2}$/.test(lang) ? lang : 'en';
  }

  if (toolName === 'search_media') {
    args.query = normalizeString(args.query || args.q || args.term || args.topic || args.search);
    const mediaType = normalizeString(args.type || args.media_type || 'image').toLowerCase();
    args.type = (mediaType === 'video') ? 'video' : 'image';
    const provider = normalizeString(args.provider || args.source || '').toLowerCase();
    args.provider = (provider === 'unsplash' || provider === 'pexels') ? provider : '';
    const count = Number(args.count || args.num || args.limit || 4);
    args.count = Number.isFinite(count) ? Math.max(1, Math.min(10, Math.floor(count))) : 4;
    const orientation = normalizeString(args.orientation || '').toLowerCase();
    args.orientation = ['landscape', 'portrait', 'squarish'].includes(orientation) ? orientation : '';
  }

  if (toolName === 'restaurant_roulette') {
    args.location = normalizeString(args.location || args.city || args.area || args.place || args.address || args.destination);
    if (args.cuisine) args.cuisine = normalizeString(args.cuisine);
  }

  return args;
}

export function validateToolArguments(toolName, args) {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) return { error: `Unknown tool: ${toolName}` };
  const required = tool.parameters?.required || [];
  const missing = required.filter((key) => {
    const v = args[key];
    return v == null || (typeof v === 'string' && v.trim() === '');
  });
  if (missing.length) {
    return { error: `Missing required argument(s): ${missing.join(', ')}` };
  }
  return null;
}

export function collapseThinkingBlocks(el) {
  el.querySelectorAll('.thinking-content.open').forEach(content => {
    content.classList.remove('open');
    const toggle = content.previousElementSibling;
    if (!toggle) return;
    const arrow = toggle.querySelector('span');
    if (arrow) arrow.innerHTML = '&#9654;';
    toggle.childNodes.forEach(n => {
      if (n.nodeType === 3 && (n.textContent.includes('Thinking') || n.textContent.includes('Thought'))) {
        n.textContent = ' Thought process';
      }
    });
  });
}

export async function buildPrompt(additionalContext = "", isFollowUpIteration = false) {
  await ensureToolSkillDocsLoaded();
  const userPrompt = document.getElementById('system-prompt').value.trim();

  const webConfigured = isSearchConfigured();
  const mediaConfigured = isMediaConfigured();
  const { formatGemmaObject: fgo } = await import('./ui.js');
  const toolDeclarations = Object.entries(TOOL_REGISTRY)
    .filter(([name, t]) => {
      if (t.requiresWeb && name === 'web_search' && !webConfigured) return false;
      if (t.requiresWeb && name === 'search_media' && !mediaConfigured) return false;
      return true;
    })
    .map(([name, t]) => {
      const desc = t.skillDescription || t.description;
      const decl = { description: desc };
      if (t.parameters?.properties && Object.keys(t.parameters.properties).length) {
        const params = {};
        for (const [pName, pDef] of Object.entries(t.parameters.properties)) {
          const param = { type: pDef.type };
          if (pDef.description) param.description = pDef.description;
          if (pDef.enum) param.enum = pDef.enum;
          params[pName] = param;
        }
        decl.parameters = params;
      }
      if (t.parameters?.required?.length) decl.required = t.parameters.required;
      return `<|tool>declaration:${name}${fgo(decl)}<tool|>`;
    })
    .join('');

  let systemPrompt = userPrompt || DEFAULT_SYSTEM_PROMPT;

  if (!isFollowUpIteration) {
    systemPrompt += '\n\nCRITICAL: Tool calls MUST appear in your main response after the thought channel, NEVER inside your thinking block.';
  }

  const thinkingActive = State.showThinking && !isFollowUpIteration;
  if (thinkingActive) {
    systemPrompt = '<|think|>' + systemPrompt;
  }

  let docContext = '';
  try {
    const chunks = await getAllChunks();
    const summaries = chunks.filter(c => c.category === 'document_summary');
    if (summaries.length) {
      const budget = summaries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
      docContext = "\n\nDocuments in your library:\n" +
        budget.map(sm => `- ${sm.source}: ${sm.text}`).join('\n');
    }
  } catch (e) { console.warn('Failed to load summaries for prompt', e); }

  let p = `<|turn>system\n${systemPrompt}${toolDeclarations}${docContext}${additionalContext}<turn|>\n`;

  const historyBudget = getSettingsValues().historyBudget;

  const groups = [];
  for (const m of State.history) {
    const role = m.role === 'ai' || m.role === 'model' ? 'model' : 'user';
    const prev = groups.length ? groups[groups.length - 1] : null;
    if (role === 'model' && prev && prev.role === 'model') {
      prev.entries.push(m);
    } else {
      groups.push({ role, entries: [m] });
    }
  }

  let historyText = "";
  const reversedGroups = [...groups].reverse();
  let newestGroupIsOpenTool = false;
  for (let gi = 0; gi < reversedGroups.length; gi++) {
    const group = reversedGroups[gi];
    if (group.role === 'model') {
      let combinedText = '';
      let hasNonToolEntry = false;
      for (const m of group.entries) {
        let text = m.text;
        if (!m._isToolTurn) {
          hasNonToolEntry = true;
          text = stripThoughts(text);
        }
        combinedText += text;
      }
      const turnEnd = hasNonToolEntry ? '<turn|>\n' : '';
      const entry = `<|turn>model\n${combinedText}${turnEnd}`;
      if ((historyText.length + entry.length) > historyBudget) break;
      historyText = entry + historyText;
      if (gi === 0) newestGroupIsOpenTool = !hasNonToolEntry;
    } else {
      const m = group.entries[0];
      const entry = `<|turn>user\n${m.text}<turn|>\n`;
      if ((historyText.length + entry.length) > historyBudget) break;
      historyText = entry + historyText;
    }
  }

  if (newestGroupIsOpenTool) {
    p += historyText;
  } else if (!thinkingActive) {
    p += historyText + '<|turn>model\n<|channel>thought\n<channel|>';
  } else {
    p += historyText + '<|turn>model\n';
  }
  return p;
}

async function streamFinalResponse(aiEl) {
  const finalPrompt = await buildPrompt("", true);
  let finalFull = "";
  const finalBubble = document.createElement('div');
  finalBubble.className = 'ai-bubble';
  aiEl.appendChild(finalBubble);
  await new Promise(res => {
    let resolved = false;
    State.inference.generateResponse(finalPrompt, (chunk, done) => {
      if (resolved) return;
      if (State.stopRequested) { resolved = true; res(); return; }
      finalFull = mergeStreamingText(finalFull, chunk);
      if (detectStreamingRepetition(finalFull)) { resolved = true; res(); return; }
      renderMessage(finalFull, 'ai', aiEl, { isStreaming: !done, showThinking: false });
      if (done) { resolved = true; res(); }
    });
  });
  collapseThinkingBlocks(aiEl);
  return finalFull;
}

export async function handleSend(ov = null, rerunHistFrom = null) {
  if (State.isGenerating) {
    State.stopRequested = true;
    return;
  }
  const input = document.getElementById('chat-input');
  const text = ov === true ? null : (ov || input.value.trim());
  if (!ov && (!text || !State.modelReady)) return;

  const welcomeMsg = document.getElementById('welcome-msg');
  if (welcomeMsg) welcomeMsg.remove();

  let turnHistFrom;
  if (ov === true) {
    if (rerunHistFrom !== null) {
      turnHistFrom = rerunHistFrom;
    } else {
      const container = document.getElementById('chat-container');
      const userMsgs = container.querySelectorAll('.message.user[data-hist-from]');
      turnHistFrom = userMsgs.length ? parseInt(userMsgs[userMsgs.length - 1].dataset.histFrom) : 0;
    }
  } else {
    turnHistFrom = State.history.length;
  }

  if (text && ov !== true) {
    input.value = ''; input.style.height = 'auto';
    const imageThumbs = [], imageNames = [], audioAtts = [], videoAtts = [], docAtts = [];
    for (const a of attachments) {
      if (a.type === 'image') { imageThumbs.push(a.thumb); imageNames.push(a.name); }
      else if (a.type === 'audio') { audioAtts.push({ thumb: a.thumb, name: a.name }); }
      else if (a.type === 'video') { videoAtts.push({ thumb: a.thumb, name: a.name }); }
      else if (a.type === 'document') { docAtts.push({ name: a.name, text: a.text }); }
    }
    const userEl = renderMessage(text, 'user', null, { images: imageThumbs, audios: audioAtts, videos: videoAtts });
    userEl.dataset.histFrom = turnHistFrom;
    const attachCtx = [];
    if (imageThumbs.length) attachCtx.push(`${imageThumbs.length} image(s) attached: ${imageNames.join(', ')}`);
    if (audioAtts.length) attachCtx.push(`${audioAtts.length} audio file(s) attached: ${audioAtts.map(a => a.name).join(', ')}`);
    if (videoAtts.length) attachCtx.push(`${videoAtts.length} video file(s) attached: ${videoAtts.map(a => a.name).join(', ')}`);
    if (docAtts.length) {
      const docContext = docAtts.map(d => `--- ${d.name} ---\n${d.text}`).join('\n\n');
      attachCtx.push(`${docAtts.length} document(s) attached:\n${docContext}`);
    }
    const historyText = attachCtx.length ? `${text}\n\n[Attached media: ${attachCtx.join('; ')}]` : text;
    State.history.push({
      role: 'user', text: historyText,
      _images: imageThumbs.length > 0 ? imageThumbs : undefined,
      _audios: audioAtts.length > 0 ? audioAtts : undefined,
      _videos: videoAtts.length > 0 ? videoAtts : undefined,
    });
    addMessageActions(userEl, 'user');
    clearAttachments();
  }

  State.isGenerating = true;
  State.stopRequested = false;
  input.disabled = true;
  updateSendButtons();
  const aiEl = renderMessage('', 'ai');
  aiEl.dataset.histFrom = turnHistFrom;

  try {
    let mentionContext = '';
    if (text) {
      mentionContext = await buildMentionContextFromText(text);
    }

    let ragContext = mentionContext;
    const chunks = await getAllChunks();
    if (text && chunks.length > 0) {
      updateStatus('loading', 'Searching memory...');
      try {
        const rag = await searchMemory(text, 3);
        if (rag.length) {
          ragContext += "\n\n[Relevant context from your library]\n" +
            rag.map(r => `Source: ${r.source}\nContent: ${r.text}`).join('\n\n');
        }
      } catch (e) { console.warn('RAG search failed', e); }
      updateStatus('online', 'Ready');
    }

    const maxIters = getSettingsValues().maxToolIters;
    let prevToolKey = null;
    for (let iter = 0; iter < maxIters; iter++) {
      let full = "";
      let repetitionDetected = false;
      const iterShowThinking = State.showThinking && iter === 0;
      const isFollowUpIteration = iter > 0;
      const prompt = await buildPrompt(ragContext, isFollowUpIteration);

      if (iter > 0) {
        const bubble = document.createElement('div');
        bubble.className = 'ai-bubble';
        aiEl.appendChild(bubble);
      }

      await new Promise(res => {
        let resolved = false;
        State.inference.generateResponse(prompt, (chunk, done) => {
          if (resolved) return;
          if (State.stopRequested) {
            resolved = true;
            res();
            return;
          }
          full = mergeStreamingText(full, chunk);
          if (detectStreamingRepetition(full)) {
            repetitionDetected = true;
            resolved = true;
            res();
            return;
          }
          renderMessage(full, 'ai', aiEl, { isStreaming: !done, showThinking: iterShowThinking });
          if (done) {
            resolved = true;
            res();
          }
        });
      });

      collapseThinkingBlocks(aiEl);

      if (repetitionDetected) {
        const cleaned = full.replace(/(.{3,30}?)\1{3,}$/g, '$1').trim();
        const finalText = cleaned || full;
        renderMessage(finalText, 'ai', aiEl, { isStreaming: false, showThinking: iterShowThinking });
        State.history.push({ role: 'ai', text: finalText });
        break;
      }

      if (State.stopRequested) {
        if (full && full.trim()) {
          State.history.push({ role: 'ai', text: full });
        }
        break;
      }

      let call = parseGemmaToolCall(full);

      if (!call) {
        const thinkContent = full.match(/<\|channel>thought\n?([\s\S]*?)<channel\|>/)?.[1] || full.match(/<\|think\|>([\s\S]*?)<\|\/think\|>/)?.[1] || '';
        if (thinkContent) {
          call = parseGemmaToolCall(thinkContent);
        }
      }

      if (!call) {
        let tc = full.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
        if (!tc) {
          const thinkContent = full.match(/<\|channel>thought\n?([\s\S]*?)<channel\|>/)?.[1] || full.match(/<\|think\|>([\s\S]*?)<\|\/think\|>/)?.[1] || '';
          if (thinkContent) {
            tc = thinkContent.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
          }
        }
        if (tc) call = repairAndParseJSON(tc[1]);
      }

      if (!call) {
        const jsonMatch = full.match(/\{[^{}]*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\s*\}/);
        if (jsonMatch) {
          call = repairAndParseJSON(jsonMatch[0]);
        }
      }
      if (!call) {
        State.history.push({ role: 'ai', text: full });
        break;
      }

      try {
        const tool = TOOL_REGISTRY[call.name];
        if (!tool) {
          State.history.push({ role: 'ai', text: full });
          break;
        }

        const toolKey = JSON.stringify({ name: call.name, arguments: call.arguments });
        if (toolKey === prevToolKey) {
          State.history.push({ role: 'ai', text: full });
          State.history.push({ role: 'user', text: '[System: You already called this tool with the same arguments. Use the previous result to answer the user\'s question now.]' });
          const finalFull = await streamFinalResponse(aiEl);
          if (finalFull && finalFull.trim()) {
            State.history.push({ role: 'ai', text: finalFull });
          }
          break;
        }
        prevToolKey = toolKey;

        {
          const bubbles = aiEl.querySelectorAll('.ai-bubble');
          const bubble = bubbles.length ? bubbles[bubbles.length - 1] : null;
          if (bubble) {
            const hasThink = /<\|think\|>/.test(full) || /<\|channel>thought/.test(full);
            if (hasThink) {
              const thinkBlocks = full.match(/<\|think\|>[\s\S]*?<\|\/think\|>/g)
                || full.match(/<\|channel>thought[\s\S]*?<channel\|>/g)
                || [];
              const thinkOnly = thinkBlocks.join('\n');
              bubble.innerHTML = renderMarkdown(thinkOnly, { showThinking: iterShowThinking });
            } else {
              bubble.innerHTML = '';
            }
          }
        }

        if (iter > 0) {
          const stepLabel = document.createElement('div');
          stepLabel.style.cssText = 'font-size:0.68rem;color:var(--ollama-stone);margin:6px 0 2px;font-weight:500';
          stepLabel.textContent = `Step ${iter + 1}/${maxIters}`;
          aiEl.appendChild(stepLabel);
        }

        const normalizedArgs = normalizeToolArguments(call.name, call.arguments);
        const argError = validateToolArguments(call.name, normalizedArgs);
        const res = argError || await tool.execute(normalizedArgs);
        renderToolCallBlock(aiEl, call.name, normalizedArgs, res);

        let toolResponsePayload = res;
        if (res && typeof res === 'object' && res.webview) {
          if (res.map_links) {
            const loc = normalizedArgs.location || normalizedArgs.query || 'the requested location';
            const search = normalizedArgs.search_query || '';
            const desc = search
              ? `Interactive map displayed showing "${search}" near "${loc}". The user can see the map with search results, and has links to search in Google Maps and get directions.`
              : `Interactive map displayed for "${loc}". The user can see the embedded map and has links to search in Google Maps and get directions.`;
            toolResponsePayload = { result: desc, note: 'The map is already displayed to the user. Summarize the result — do not call this tool again.' };
          } else {
            const toolLabel = call.name.replace(/_/g, ' ');
            const resultText = res.result || `The ${toolLabel} is now displayed inline in the chat.`;
            toolResponsePayload = { result: resultText, note: `The ${toolLabel} is embedded inline in the chat for the user. Acknowledge it is displayed — do not call this tool again.` };
          }
        }

        if (call.name === 'search_media' && res && typeof res === 'object' && Array.isArray(res.results) && res.results.length > 0) {
          const count = res.results.length;
          const mediaType = normalizedArgs.type === 'video' ? 'video' : 'image';
          toolResponsePayload = {
            result: `${count} ${mediaType}${count !== 1 ? 's' : ''} for "${normalizedArgs.query}" are now displayed in the chat UI. Do NOT list or describe each ${mediaType} individually — they are already visible to the user. Simply acknowledge the results are shown.`
          };
        }

        if (call.name === 'trivia_question' && res && typeof res === 'object' && res.result && res.result.type === 'trivia_session') {
          const qCount = res.result.totalQuestions || res.result.questions?.length || 0;
          toolResponsePayload = {
            result: `An interactive trivia quiz with ${qCount} questions is now displayed in the chat. The user can play directly by clicking answer buttons in the widget. Do NOT list or repeat the questions or answers in text — the interactive quiz is already visible and playable. Simply acknowledge the trivia session has started and wish them good luck.`
          };
        }

        const { formatGemmaObject: fgo } = await import('./ui.js');
        const cleanFull = full.replace(/<\|tool_response>\s*$/, '');
        const toolRespFormatted = `<|tool_response>response:${call.name}${fgo(toolResponsePayload)}<tool_response|>`;
        State.history.push({ role: 'ai', text: cleanFull + toolRespFormatted, _isToolTurn: true });

        if (iter === maxIters - 1) {
          State.history.push({ role: 'user', text: '[System: Tool call limit reached. Please provide your final answer now.]' });
          const finalFull = await streamFinalResponse(aiEl);
          if (finalFull && finalFull.trim()) {
            State.history.push({ role: 'ai', text: finalFull });
          }
          break;
        }

        ragContext = "";
      } catch(e) {
        console.error("Tool failed", e);
        State.history.push({ role: 'ai', text: full });
        break;
      }
    }
  } catch (e) { renderMessage('Error: ' + e.message, 'ai', aiEl); }
  finally {
    State.isGenerating = false;
    State.stopRequested = false;
    State.webEnrichedMode = false;
    input.disabled = false;
    updateSendButtons();
    addMessageActions(aiEl, 'ai');
    saveToSession();
  }
}
window.handleSend = handleSend;
