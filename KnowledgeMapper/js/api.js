import { GoogleGenAI, Type } from "https://esm.run/@google/genai";
import { toast, setAILoading, addMessageToChatHistory, researchProgressManager } from './ui.js';
import { dbManager } from './storage.js';

// --- MODULE STATE ---
let state = {
    aiClient: null,
    conversationHistory: [],
    isAITaskRunning: false,
};

let isAIInitializing = false;
let isAIReady = false;

const getToolModelName = () => localStorage.getItem('tool_model') || 'gemini-2.0-flash';
const getContentModelName = () => localStorage.getItem('content_model') || 'gemini-1.5-pro';

/**
 * Replaces shortcodes in a prompt string with actual context data.
 */
function replaceShortcodes(prompt, context = {}) {
    const editor = window.tldrawEditor;
    const nodeLabels = editor 
        ? editor.getCurrentPageShapes().map(s => s.props.label || s.props.text).filter(Boolean).join(', ')
        : '';
    
    return prompt
        .replace(/{{NODES}}/g, nodeLabels)
        .replace(/{{TOPIC}}/g, context.topic || '')
        .replace(/{{CONTEXT}}/g, context.fullContext || '');
}

export function findNodeContext(nodeId) {
    const editor = window.tldrawEditor;
    if (!editor || !nodeId) return { rootLabel: 'the general topic of the map', parentLabel: 'the main idea' };
    
    const shape = editor.getShape(nodeId);
    if (!shape) return { rootLabel: 'the general topic of the map', parentLabel: 'the main idea' };

    // In tldraw, "parent" is usually the page or a group. 
    // We'll look for arrows pointing TO this node to find logical parents.
    const incomingArrows = editor.getCurrentPageShapes().filter(s => s.type === 'arrow' && s.props.end.type === 'binding' && s.props.end.boundShapeId === nodeId);
    const parentId = incomingArrows.length > 0 ? incomingArrows[0].props.start.boundShapeId : null;
    const parentShape = parentId ? editor.getShape(parentId) : null;

    return {
        parentLabel: parentShape ? (parentShape.props.label || parentShape.props.text) : 'the main idea',
        rootLabel: 'the general topic'
    };
}

export function getNodeAncestorPath(nodeId) {
    const editor = window.tldrawEditor;
    if (!editor || !nodeId) return [];
    
    const path = [];
    let currentId = nodeId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const shape = editor.getShape(currentId);
        if (!shape) break;
        path.unshift(shape.props.label || shape.props.text || 'Note');

        const incomingArrows = editor.getCurrentPageShapes().filter(s => s.type === 'arrow' && s.props.end.type === 'binding' && s.props.end.boundShapeId === currentId);
        currentId = incomingArrows.length > 0 ? incomingArrows[0].props.start.boundShapeId : null;
    }
    return path;
}

// --- API Throttling Queue ---
const apiThrottler = {
    queue: [],
    isBusy: false,
    lastCallTimestamp: 0,
    DELAY_MS: 1500,

    enqueue(apiCallFunction) {
        return new Promise((resolve, reject) => {
            this.queue.push({ apiCall: apiCallFunction, resolve, reject });
            this._processQueue();
        });
    },

    async _processQueue() {
        if (this.isBusy || this.queue.length === 0) {
            return;
        }
        this.isBusy = true;

        const { apiCall, resolve, reject } = this.queue.shift();
        
        const timeSinceLastCall = Date.now() - this.lastCallTimestamp;
        const delay = Math.max(0, this.DELAY_MS - timeSinceLastCall);

        setTimeout(async () => {
            try {
                const result = await apiCall();
                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                this.lastCallTimestamp = Date.now();
                this.isBusy = false;
                this._processQueue();
            }
        }, delay);
    }
};

// --- AI INITIALIZATION ---
export async function initializeAI(forceNewKey = false) {
    if (isAIInitializing || (isAIReady && !forceNewKey)) return isAIReady;
    isAIInitializing = true;
    setAILoading(true);

    try {
        if (window.aiHelperPromise) {
            await window.aiHelperPromise;
        }

        if (!window.aiHelper) {
            throw new Error("AI Helper module not loaded.");
        }

        if (forceNewKey && state.aiClient?.apiKey) {
            window.aiHelper.markKeyOnCooldown(state.aiClient.apiKey);
        }

        const keys = window.aiHelper.getGeminiKeys();
        if (keys.length === 0) {
            // Settings will be opened by setupSettings if no keys found
            return false;
        }

        const apiKey = window.aiHelper.getAvailableKey(true); 
        if (!apiKey) {
            throw new Error("API keys found but none are valid.");
        }

        state.aiClient = new GoogleGenAI({ apiKey });
        isAIReady = true;
        toast('AI Configuration Loaded');
        return true;
    } catch (error) {
        console.error("AI Initialization Error:", error);
        toast(`AI: ${error.message}`);
        isAIReady = false;
        state.aiClient = null;
        return false;
    } finally {
        isAIInitializing = false;
        setAILoading(false);
    }
}

// --- CHAT & TOOL INTEGRATION ---

const SYSTEM_PROMPT = `You are an "Expert Research Coach," a Socratic mentor integrated into a visual mind mapping tool. Your mission is to guide students through the academic research process (Steps 1-6) using the Socratic Method.

**Socratic Coaching Principles:**
1. **Ask, Don't Tell:** Instead of giving answers, ask questions that lead the student to discover the answer themselves.
2. **Scaffold with Choices:** Provide 2-3 interactive suggestion chips to help the student formulate their thoughts or choose a direction.
3. **Reflect and Refine:** Encourage the student to look back at their map and identify contradictions or gaps in evidence.
4. **Phase-Awareness:** Always tailor your coaching to the current Research Phase (1: Exploration, 2: Questioning, 3: Planning, 4: Gathering, 5: Synthesis, 6: Review).

**Response Formatting:**
- Use \`<div class="coach-question text-lg font-black text-slate-900 mb-2 leading-tight">...\</div>\` for your primary guiding question.
- Use \`<div class="coach-goal text-[10px] font-black uppercase tracking-widest text-sky-500 mb-4 bg-sky-50 px-3 py-1 rounded-full w-fit">Current Goal: ...\</div>\` to state the current phase objective.
- Always include relevant links if you find them, using \`<a href='...' target='_blank' class='text-sky-600 underline font-bold'>...</a>\`.
- CRITICAL: At the end of every response, provide 2-3 interactive choices using this exact HTML structure:
  \`<div class="socratic-prompt-container flex flex-wrap gap-2 mt-6">
    <button class="suggestion-chip" data-input="Student response 1">Choice 1</button>
    <button class="suggestion-chip" data-input="Student response 2">Choice 2</button>
  \</div>\`
- Use simple HTML for formatting (<strong>, <ul>, etc.). Do not use markdown fences.

**Integration with the Tool:**
- Remind students to add findings to their mind map as "Notecards".
- Encourage them to use the "Sources" tab to manage their bibliography.
- Explain that each "Notecard" can be linked to a specific source from their bibliography.

**Current Goal:** Always know what step the student is on and help them reach the next one through dialogue.`;

const tools = {
    update_research_step: {
        declaration: { 
            name: 'update_research_step', 
            description: "Updates the visual progress indicator to a specific step in the 6-step research process.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    step_number: { type: Type.NUMBER, description: "The step number (1-6) to activate." } 
                }, 
                required: ['step_number'] 
            } 
        },
        execute: async ({ step_number }) => { 
            window.dispatchEvent(new CustomEvent('research-step-changed', { detail: { step: step_number } }));
            return { result: `Successfully updated research progress to Step ${step_number}.` };
        }
    },
    spawn_notecards: {
        declaration: { 
            name: 'spawn_notecards', 
            description: "Creates one or more research notecards on the canvas with optional content.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    cards: { 
                        type: Type.ARRAY, 
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING },
                                quote: { type: Type.STRING },
                                thoughts: { type: Type.STRING },
                                color: { type: Type.STRING },
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER }
                            },
                            required: ['label']
                        }
                    }
                }, 
                required: ['cards'] 
            } 
        },
        execute: async ({ cards }) => { 
            const editor = window.tldrawEditor;
            if (!editor) return { error: "Editor not found" };
            
            cards.forEach(card => {
                editor.createShape({
                    type: 'research-note',
                    x: card.x || editor.inputs.currentPagePoint.x + (Math.random() * 200 - 100),
                    y: card.y || editor.inputs.currentPagePoint.y + (Math.random() * 200 - 100),
                    props: { 
                        label: card.label,
                        quote: card.quote || '',
                        thoughts: card.thoughts || '',
                        color: card.color || '#0ea5e9'
                    }
                });
            });
            return { result: `Successfully spawned ${cards.length} research notecards.` };
        }
    },
    google_search: {
        declaration: { name: 'google_search', description: 'Use to help the student find information or verify facts during the gathering phase.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The search query.' } }, required: ['query'] } },
        execute: async ({ query }) => { 
            const result = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({ model: getToolModelName(), contents: query, config: { tools: [{ googleSearch: {} }] } }));
            const text = result.text; const suggestionsHtml = result.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent; return { isGroundedResponse: true, text: text, suggestionsHtml: suggestionsHtml }; 
        }
    }
};

/**
 * REVISED: This function now correctly implements the compositional function calling loop.
 */
export async function sendChatMessage(message, currentMapId) {
    if ((!state.aiClient && !window.aiHelper.getAvailableKey()) || state.isAITaskRunning || !message.trim()) {
        if(!state.aiClient) toast("Please set your Gemini API key in Settings.");
        return;
    }
    
    if (!state.aiClient && window.aiHelper.getAvailableKey()) {
        await initializeAI();
    }

    setAILoading(true);
    addMessageToChatHistory('user', message, true, (role, content) => dbManager.saveMessage(currentMapId, { role, content }));
    
    const editor = window.tldrawEditor;
    const notes = editor ? editor.getCurrentPageShapes().filter(s => s.type === 'research-note') : [];
    
    const modelName = getToolModelName();
    
    const customSystem = localStorage.getItem('custom_system_prompt');
    const systemInstruction = customSystem ? replaceShortcodes(customSystem) : SYSTEM_PROMPT;

    let currentContents = [
        ...state.conversationHistory, 
        { role: 'user', parts: [{ text: message + "\n\n" + "Current research notes: " + JSON.stringify(notes.map(n => ({id: n.id, label: n.props.label}))) }] }
    ];

    try {
        let retryCount = 0;
        const maxRetries = window.aiHelper.getGeminiKeys().length;
        let accumulatedSuggestionsHtml = '';

        while (retryCount <= maxRetries) {
            try {
                let safetyStop = 5; 
                while (safetyStop > 0) {
                    safetyStop--;

                    const payload = {
                        contents: currentContents,
                        tools: [{ functionDeclarations: Object.values(tools).map(t => t.declaration) }],
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    };
                    
                    const data = await window.aiHelper.callGeminiDirect('knowledge_mapper_chat', payload, modelName);
                    const candidate = data.candidates[0];
                    const responseParts = candidate.content.parts;
                    const functionCalls = responseParts.filter(p => p.functionCall).map(p => p.functionCall);

                    if (!functionCalls || functionCalls.length === 0) {
                        const finalText = responseParts.filter(p => p.text).map(p => p.text).join('\n');
                        if (finalText) {
                            addMessageToChatHistory('model', finalText, true, (role, content) => dbManager.saveMessage(currentMapId, { role, content }), accumulatedSuggestionsHtml);
                            state.conversationHistory = [...currentContents, candidate.content];
                        }
                        break; 
                    }
                    
                    const callDetails = functionCalls.map(fc => `${fc.name}(${JSON.stringify(fc.args)})`).join(', ');
                    addMessageToChatHistory('system', `<i>Executing: ${callDetails}...</i>`, false);

                    const toolPromises = functionCalls.map(call =>
                        tools[call.name].execute(call.args)
                            .then(output => {
                                if (output.suggestionsHtml) accumulatedSuggestionsHtml += output.suggestionsHtml;
                                return { functionResponse: { name: call.name, response: { result: output } } };
                            })
                            .catch(error => ({ functionResponse: { name: call.name, response: { error: error.message } } }))
                    );
                    const toolResponses = await Promise.all(toolPromises);
                    
                    currentContents.push(candidate.content);
                    currentContents.push({ role: 'user', parts: toolResponses });
                }
                break; 
            } catch (error) {
                const errorMsg = String(error.message);
                if ((errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("rate limit")) && retryCount < maxRetries) {
                    await initializeAI(true);
                    retryCount++;
                    continue;
                }
                throw error;
            }
        }
    } catch (error) {
        console.error("Chat error:", error);
        toast("Error with AI chat.");
        addMessageToChatHistory('system', 'Sorry, an error occurred.', false);
    } finally {
        setAILoading(false);
    }
}

export async function _internal_researchTopicForDetails(topic, context = {}) {
    if (!state.aiClient) return "<p>AI client not initialized. Please set API key.</p>";
    
    let contextClause = '';
    if (context.parentLabel && context.rootLabel && context.parentLabel !== context.rootLabel) {
        contextClause = `Focus on how "${topic}" relates to its parent "${context.parentLabel}" within "${context.rootLabel}".`;
    } else if (context.parentLabel) {
        contextClause = `Focus on how "${topic}" relates to "${context.parentLabel}".`;
    }

    const customResearch = localStorage.getItem('custom_research_prompt');
    const researchPrompt = customResearch 
        ? replaceShortcodes(customResearch, { topic, fullContext: contextClause })
        : `You are a research assistant. Compile a comprehensive summary about: "${topic}". 
           ${contextClause}
           Your response will be grounded on Google Search. Synthesize into a well-structured report.
           CRITICAL: Use simple HTML (<h3>, <p>, <ul>). Include source links (\`<a href='...' target='_blank'>...</a>\`). 
           No markdown fences.`;

    try {
        const response = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
            config: { tools: [{ googleSearch: {} }] }
        }));
        
        let responseText = (response.text || "<p>No details could be generated.</p>").trim();
        if (responseText.startsWith('```html')) responseText = responseText.substring(7).trim();
        if (responseText.startsWith('```')) responseText = responseText.substring(3).trim();
        if (responseText.endsWith('```')) responseText = responseText.slice(0, -3).trim();

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.searchQueries?.length > 0) {
            let sourcesHtml = '<div class="grounding-suggestions"><h4>Related Searches</h4><ul>';
            groundingMetadata.searchQueries.forEach(q => {
               sourcesHtml += `<li><a href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer">${q}</a></li>`;
            });
            sourcesHtml += '</ul></div>';
            responseText += sourcesHtml;
        }

        return responseText;
    } catch (error) {
        console.error(`[AI] Details generation failed for "${topic}":`, error);
        return `<p>An error occurred while researching this topic.</p>`;
    }
}

export async function _internal_expandNodeWithAI(nodeId, instruction) {
    if (!state.aiClient || state.isAITaskRunning) return;
    setAILoading(true);

    const ancestorPath = getNodeAncestorPath(nodeId);
    const contextString = ancestorPath.join(' > ');
    
    const editor = window.tldrawEditor;
    const shape = editor.getShape(nodeId);
    const nodeLabel = shape ? (shape.props.label || shape.props.text) : 'Topic';

    const prompt = `You are a mind map assistant. The user wants to expand on a node within a mind map.
    
**Map Context (Path to Node):** ${contextString}
**Node to Expand:** "${nodeLabel}" (ID: ${nodeId})
**User's Instruction:** "${instruction}"

Based on this specific context, generate a list of 3 to 5 highly relevant sub-topics for "${nodeLabel}". Return the list as a JSON array of strings.`;

    const schema = { type: Type.OBJECT, properties: { topics: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["topics"] };

    try {
        const response = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", responseSchema: schema },
        }));
        const expansionData = JSON.parse(response.text);

        if (expansionData.topics && expansionData.topics.length > 0) {
            researchProgressManager.show(`Expanding "${nodeLabel}"`);
            researchProgressManager.addTasks(expansionData.topics);
            await new Promise(resolve => setTimeout(resolve, 0));

            const nodeContext = findNodeContext(nodeId);
            for (const topic of expansionData.topics) {
                try {
                    researchProgressManager.updateTask(topic, 'Researching');
                    const researchContext = { parentLabel: nodeLabel, rootLabel: nodeContext.rootLabel };
                    const detail = await _internal_researchTopicForDetails(topic, researchContext);
                    
                    editor.createShape({
                        type: 'research-note',
                        x: shape.x + (Math.random() * 400 - 200),
                        y: shape.y + 200 + (Math.random() * 100),
                        props: { label: topic, thoughts: detail }
                    });

                    researchProgressManager.updateTask(topic, 'Done', detail);
                } catch (err) {
                    console.error(`Error processing topic ${topic}:`, err);
                    researchProgressManager.updateTask(topic, 'Error', `<p>An error occurred.</p>`);
                }
            }
            toast("Expansion complete!");
            setTimeout(() => researchProgressManager.hide(), 3000);
        }
    } catch (error) { 
        console.error("AI node expansion failed:", error); 
        toast("Error: Failed to expand node.");
        researchProgressManager.hide();
    } finally { 
        setAILoading(false); 
    }
}