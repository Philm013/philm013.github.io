import { GoogleGenAI, Type } from "https://esm.run/@google/genai";
import { toast, setAILoading, addMessageToChatHistory, researchProgressManager } from './ui.js';
import { addNode, getGraphState, deleteNodeById, editNodeLabel, connectNodesById } from './graph.js';
import { dbManager } from './storage.js';

// --- MODULE STATE ---
let state = {
    aiClient: null,
    hfClient: null,
    conversationHistory: [],
    isAITaskRunning: false,
};

let isAIInitializing = false;
let isAIReady = false;

const getToolModelName = () => {
    const m = localStorage.getItem('tool_model');
    if (!m) return null;
    return m.startsWith('models/') ? m : `models/${m}`;
};
const getContentModelName = () => {
    const m = localStorage.getItem('content_model');
    if (!m) return null;
    return m.startsWith('models/') ? m : `models/${m}`;
};

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

export function clearConversationHistory() {
    state.conversationHistory = [];
}

export function loadConversationHistory(messages) {
    state.conversationHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
    }));
}

// --- AI INITIALIZATION ---
export async function initializeAI(forceNewKey = false) {
    if (isAIInitializing || (isAIReady && !forceNewKey)) return isAIReady;
    isAIInitializing = true;
    setAILoading(true);

    if (forceNewKey && state.aiClient?.apiKey) {
        window.aiHelper.markKeyOnCooldown(state.aiClient.apiKey);
    }

    try {
        if (!window.aiHelper) {
            throw new Error("AI Helper module not loaded.");
        }

        const keys = window.aiHelper.getGeminiKeys();
        if (keys.length === 0) {
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.classList.remove('hidden');
            throw new Error("No Gemini API keys found. Please add them in Settings.");
        }

        const apiKey = window.aiHelper.getAvailableKey(true); // Fallback to LRU if all on cooldown
        if (!apiKey) {
            throw new Error("API keys found but none are valid.");
        }

        // Initialize selectors from helper
        const toolSelector = document.getElementById('tool-model-select');
        const contentSelector = document.getElementById('content-model-select');
        
        if (toolSelector && toolSelector.options.length <= 1) {
            await window.aiHelper.populateModelSelector(toolSelector, getToolModelName());
        }
        if (contentSelector && contentSelector.options.length <= 1) {
            await window.aiHelper.populateModelSelector(contentSelector, getContentModelName());
        }

        state.aiClient = new GoogleGenAI({ apiKey });
        isAIReady = true;
        toast('AI Assistant Ready');
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

export const DEFAULT_PROMPTS = {
    step1: `### Role: The Curiosity Spark (Step 1: Exploration)
**Objective:** Help the student find a "hook" or interesting angle.
**Coaching Style:** Socratic & Enthusiastic. 
**Instead of doing:** Don't just list facts. 
**Do this:** Ask "What if?" or "Have you wondered why...?" 
**Scaffold:** Offer 3-5 sub-topic "seeds" using suggestion chips. Let the student decide which one to plant.
**Capabilities:** Use 'suggest_research_paths' or 'google_search' to offer new directions.`,

    step2: `### Role: The Question Architect (Step 2: Questioning)
**Objective:** Guide the student from a topic to a "Driving Question."
**Coaching Style:** Focused & Refined.
**Instead of doing:** Don't write the question for them.
**Do this:** Help them narrow a broad idea. Ask "Who is affected by this?" or "What part of this is a mystery?"
**Scaffold:** Suggest question stems like "How might we..." or "What is the relationship between..."`,

    step3: `### Role: The Strategy Sensei (Step 3: Planning)
**Objective:** Help the student identify what they need to know.
**Coaching Style:** Methodical & Empowering.
**Instead of doing:** Don't build the whole plan.
**Do this:** Ask "What kind of evidence would prove your hypothesis?" or "Where would an expert look for this?"
**Scaffold:** Offer choices of source types (primary vs. secondary) or research methods.`,

    step4: `### Role: The Insight Guide (Step 4: Gathering)
**Objective:** Support the student in analyzing information.
**Coaching Style:** Analytical & Observant.
**Instead of doing:** Don't just summarize everything.
**Do this:** Ask them to find a specific detail. "What does this author say about X?" or "Does this source contradict your other one?"
**Scaffold:** Offer to help paraphrase a specific quote or identify a key claim.`,

    step5: `### Role: The Connection Catalyst (Step 5: Synthesis)
**Objective:** Help the student see patterns and relationships.
**Coaching Style:** Holistic & Integrative.
**Instead of doing:** Don't link all the nodes yourself.
**Do this:** Ask "How does Node A change your thinking about Node B?" or "Is there a missing link between these two?"
**Scaffold:** Suggest potential relationships to investigate or ways to group ideas.`,

    step6: `### Role: The Reflective Mentor (Step 6: Review)
**Objective:** Prepare the student to share their journey.
**Coaching Style:** Critical & Celebratory.
**Instead of doing:** Don't fix their errors.
**Do this:** Ask "How has your understanding evolved?" or "What evidence are you most proud of?"
**Scaffold:** Offer a checklist for review or prompts for a final reflection.`,

    global: `You are the "Curiosity Coach," a supportive research mentor. Your mission is to help students build deep knowledge and effective mind maps using the Socratic method.

**MY GUIDING PRINCIPLES:**
1. **Student in the Driver's Seat:** Never add a node or link automatically unless specifically asked to "do it for me" after a struggle. Prefer offering choices (Suggestion Chips).
2. **Socratic Scaffolding:** Ask open-ended questions. If a student is lost, offer 3-5 specific "research paths" or "question seeds."
3. **Evidence-First:** Encourage students to find evidence for their claims. When using Google Search, present interesting links for the *student* to add to their bibliography.
4. **Brevity is Clarity:** Keep your coaching text under 3 sentences. Let the suggestions do the scaffolding!

**MY CAPABILITIES:**
- **Google Search:** Find real-time sources. Summarize search results and offer buttons for the student to preview or add them.
- **Brainstorming:** Use 'suggest_research_paths' or 'expand_node_ideas' to give students choice-based sub-topics.
- **Analysis:** Help summarize complex text or evaluate a source's bias.

**RESPONSE FORMATTING:**
- Every response MUST end with 3-5 suggestion chips. 
- Use \`<div class="coach-question">...</div>\` for your brief guiding question.
- Dialogue choices: \`<button class="suggestion-chip" data-input="...">Label</button>\`
- Node suggestions: \`<button class="suggestion-chip" data-action="add_node" data-label="Topic">➕ Add: Topic</button>\`

{{PHASE_PROMPT}}

Stay celebratory, encouraging, and always push for the next "Why?" or "How?"! 🧠💡`,

    research: `You are a research mentor. Your task is to gather insights about the topic: "{{TOPIC}}". 
    {{CONTEXT}}
    Ground your findings in Google Search results.
    Synthesize the information into a structured summary that helps a student identify key claims and potential evidence.
    CRITICAL: Format using simple HTML (<h3>, <h4>, <p>, <ul>, <li>, <strong>). 
    Do not add nodes yourself. Instead, summarize your findings and ask the student which parts they find most interesting to add to their map.
    Include relevant source links: \`<a href='...' target='_blank'>...</a>\`.`,

    brainstorm: `You are a creative research mentor. The student wants to expand on the node "{{NODE}}" with the angle: "{{INSTRUCTION}}". 
    Brainstorm 3 to 5 highly relevant sub-topics, specific questions, or "mystery leads." 
    Return the list as a JSON array of strings for me to present as choices.`,

    mapMindmap: `Generate a mind map for: "{{TOPIC}}". Create a central root node, 5-7 key sub-topics, and 2-3 further sub-nodes for each. Use the specified JSON format.`,

    mapFlowchart: `You are an expert at creating logical process flowcharts based on a user's topic. Your task is to generate a flowchart for the process: "{{TOPIC}}".
    
Follow these rules precisely:
1.  **Structure:** The flowchart must have a single, clear 'Start' node (ellipse) and one or more 'End' nodes (ellipse).
2.  **Nodes:** Use 'rectangle' for process steps and 'diamond' for decision points.
3.  **Decisions & Branching:** Every 'diamond' node MUST have exactly two outgoing links, each with a clear, mutually exclusive label (e.g., "Yes" / "No", "Success" / "Failure"). These branches should represent a logical choice.
4.  **Flow:** All paths must logically progress. Branches can either proceed to different steps or loop back to an earlier step in the process. Ensure there are no dead ends, and all paths eventually reach an 'End' node.
5.  **IDs:** Node 'id' values must be simple, unique strings (e.g., "start", "step1", "decision2", "end").

Provide the output as a single, valid JSON object matching the specified schema.`
};

export const DEFAULT_STEP_PROMPTS = {
    1: DEFAULT_PROMPTS.step1,
    2: DEFAULT_PROMPTS.step2,
    3: DEFAULT_PROMPTS.step3,
    4: DEFAULT_PROMPTS.step4,
    5: DEFAULT_PROMPTS.step5,
    6: DEFAULT_PROMPTS.step6
};

function getSystemPrompt() {
    const activeStepIndicator = document.querySelector('.step-indicator.active');
    const step = activeStepIndicator ? parseInt(activeStepIndicator.dataset.step) : 1;
    const customPrompts = JSON.parse(localStorage.getItem('custom_step_prompts') || '{}');
    const basePrompt = customPrompts[step] || DEFAULT_STEP_PROMPTS[step] || DEFAULT_STEP_PROMPTS[1];
    
    return `You are the "Curiosity Coach," a supportive research mentor. Your mission is to help students build deep knowledge and effective mind maps using the Socratic method.

**MY GUIDING PRINCIPLES:**
1. **Student in the Driver's Seat:** Never add a node or link automatically unless specifically asked to "do it for me" after a struggle. Prefer offering choices (Suggestion Chips).
2. **Socratic Scaffolding:** Ask open-ended questions. If a student is lost, offer 3-5 specific "research paths" or "question seeds."
3. **Evidence-First:** Encourage students to find evidence for their claims. When using Google Search, present interesting links for the *student* to add to their bibliography.
4. **Brevity is Clarity:** Keep your coaching text under 3 sentences. Let the suggestions do the scaffolding!

**MY CAPABILITIES:**
- **Google Search:** Find real-time sources. Summarize search results and offer buttons for the student to preview or add them.
- **Brainstorming:** Use 'suggest_research_paths' or 'expand_node_ideas' to give students choice-based sub-topics.
- **Analysis:** Help summarize complex text or evaluate a source's bias.

**RESPONSE FORMATTING:**
- Every response MUST end with 3-5 suggestion chips. 
- Use \`<div class="coach-question">...\</div>\` for your brief guiding question.
- Dialogue choices: \`<button class="suggestion-chip" data-input="...">Label</button>\`
- Node suggestions: \`<button class="suggestion-chip" data-action="add_node" data-label="Topic">➕ Add: Topic</button>\`

Stay celebratory, encouraging, and always push for the next "Why?" or "How?"! 🧠💡`;
}

const tools = {
    suggest_research_paths: {
        declaration: { 
            name: 'suggest_research_paths', 
            description: "Suggests 2-4 specific concepts, topics, or questions related to the current focus. Return these as actionable suggestion chips for the student to choose from.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    topics: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING }, 
                        description: "List of topics/questions to suggest." 
                    } 
                }, 
                required: ['topics'] 
            } 
        },
        execute: async ({ topics }) => { 
            let html = '<div class="socratic-prompt-container">';
            topics.forEach(topic => {
                html += `<button class="suggestion-chip" data-action="add_node" data-label="${topic}">➕ Add: ${topic}</button>`;
            });
            html += '</div>';
            return { suggestionsHtml: html, result: `Offered ${topics.length} potential directions to the student.` };
        }
    },
    research_topic_context: {
        declaration: { 
            name: 'research_topic_context', 
            description: "Gathers detailed information about a topic but does NOT add a node. Use this when a student asks 'What is X?' or 'Tell me more about Y'. Returns a structured summary for you to present to the student.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    topic: { type: Type.STRING, description: "The topic to research." }
                }, 
                required: ['topic'] 
            } 
        },
        execute: async ({ topic }) => { 
            const { nodes } = getGraphState();
            const findRoot = (ns) => ns.length > 0 ? ns[0].label : "the project";
            const context = { rootLabel: findRoot(nodes) };
            const details = await _internal_researchTopicForDetails(topic, context);
            return { summaryHtml: details, result: `Researched '${topic}'. Present the summary to the student and ask if they'd like to add it as a node.` };
        }
    },
    expand_node_ideas: {
        declaration: { 
            name: 'expand_node_ideas', 
            description: "Brainstorms several relevant sub-topics for a specific node. Returns the list of topics for you to present as choices. Does NOT add nodes automatically.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    nodeId: { type: Type.STRING, description: "The ID of the node to expand." },
                    instruction: { type: Type.STRING, description: "Brief angle for expansion (e.g., 'key components')." }
                }, 
                required: ['nodeId', 'instruction'] 
            } 
        },
        execute: async ({ nodeId, instruction }) => { 
            const node = (getGraphState().nodes).find(n => n.id === nodeId);
            if (!node) return { error: "Node not found." };
            const topics = await _internal_getExpansionTopics(node.label, instruction);
            return { topics, result: `Found ${topics.length} sub-topics. Present these as suggestion chips using 'data-action="add_node"'.` };
        }
    },
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
    analyze_source_content: {
        declaration: { 
            name: 'analyze_source_content', 
            description: "Helps the student analyze a snippet of text, identifying bias, key evidence, or interesting perspectives.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    text: { type: Type.STRING, description: "The source text to analyze." } 
                }, 
                required: ['text'] 
            } 
        },
        execute: async () => { 
            return { result: "Analysis complete. Provide coaching insights based on the text." };
        }
    },
    google_search: {
        declaration: { name: 'google_search', description: 'Finds real-time sources and information. Return buttons for students to preview or add results.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The search query.' } }, required: ['query'] } },
        execute: async ({ query }) => { 
            const result = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({ model: getToolModelName(), contents: query, config: { tools: [{ googleSearch: {} }] } }));
            
            let suggestionsHtml = '';
            const metadata = result.candidates?.[0]?.groundingMetadata;
            if (metadata?.searchEntryPoint?.renderedContent) {
                suggestionsHtml += `<div class="search-entry-point">${metadata.searchEntryPoint.renderedContent}</div>`;
            }
            
            if (metadata?.groundingChunks) {
                suggestionsHtml += '<div class="search-results-container" style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">';
                metadata.groundingChunks.forEach((chunk) => {
                    if (chunk.web) {
                        suggestionsHtml += `
                            <div class="search-result-card" style="background:#fff; border:1px solid var(--border-color); border-radius:16px; padding:16px; box-shadow:var(--shadow-sm);">
                                <h4 style="margin:0 0 8px 0; font-size:14px; color:var(--accent-primary);">${chunk.web.title || 'Source result'}</h4>
                                <p style="margin:0 0 12px 0; font-size:12px; color:var(--text-secondary); line-height:1.4;">${chunk.web.uri}</p>
                                <div style="display:flex; gap:8px;">
                                    <button class="suggestion-chip" data-action="preview_source" data-url="${chunk.web.uri}" data-title="${chunk.web.title.replace(/"/g, '&quot;')}" style="min-height:32px; padding:4px 12px; font-size:12px;">🔍 Preview</button>
                                    <button class="suggestion-chip primary" data-action="add_source" data-url="${chunk.web.uri}" data-title="${chunk.web.title.replace(/"/g, '&quot;')}" style="min-height:32px; padding:4px 12px; font-size:12px;">➕ Add</button>
                                </div>
                            </div>
                        `;
                    }
                });
                suggestionsHtml += '</div>';
            }

            return { isGroundedResponse: true, text: result.text, suggestionsHtml: suggestionsHtml }; 
        }
    },
    deleteNodeById: {
        declaration: { name: 'deleteNodeById', description: 'Deletes a node from the map.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING } }, required: ['nodeId'] } },
        execute: async ({ nodeId }) => { deleteNodeById(nodeId); return { result: `Successfully deleted node ${nodeId}.` }; }
    },
    editNodeLabel: {
        declaration: { name: 'editNodeLabel', description: 'Edits the label of a node.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING }, newLabel: { type: Type.STRING } }, required: ['nodeId', 'newLabel'] } },
        execute: async ({ nodeId, newLabel }) => { editNodeLabel(nodeId, newLabel); return { result: `Successfully edited node ${nodeId}.` }; }
    },
    connectNodesById: {
        declaration: { name: 'connectNodesById', description: 'Connects two nodes.', parameters: { type: Type.OBJECT, properties: { sourceNodeId: { type: Type.STRING }, targetNodeId: { type: Type.STRING } }, required: ['sourceNodeId', 'targetNodeId'] } },
        execute: async ({ sourceNodeId, targetNodeId }) => { connectNodesById(sourceNodeId, targetNodeId); return { result: `Successfully connected ${sourceNodeId} to ${targetNodeId}.` }; }
    },
};


/**
 * REVISED: This function now correctly implements the compositional function calling loop.
 * It handles multiple turns of tool use before producing a final text response,
 * ensuring robust and accurate interactions based on the latest SDK documentation.
 * @param {string} message - The user message or system instruction.
 * @param {string} currentMapId - The ID of the active map.
 * @param {string|null} nodeId - The ID of the node in focus.
 * @param {boolean} [isSilent=false] - If true, the prompt is not shown in the chat UI.
 */
export async function sendChatMessage(message, currentMapId, nodeId = null, isSilent = false) {
    if ((!state.aiClient && !window.aiHelper.getAvailableKey()) || state.isAITaskRunning || !message.trim()) {
        if(!state.aiClient) toast("Please set your Gemini API key in Settings.");
        return;
    }
    
    // Ensure AI is initialized if we have keys but no client
    if (!state.aiClient && window.aiHelper.getAvailableKey()) {
        await initializeAI();
    }

    setAILoading(true, "Coach is thinking...");
    
    // Frame the prompt for the AI: Is it a direct student message or a system event?
    const framedMessage = isSilent ? `[INTERNAL NOTIFICATION: ${message}]` : message;

    if (!isSilent) {
        addMessageToChatHistory('user', message, true, (role, content) => dbManager.saveMessage(currentMapId, { role, content }, nodeId));
    }
    
    const { nodes } = getGraphState();
    const modelName = getToolModelName();
    if (!modelName) {
        toast("No Chat model selected. Please check Settings.");
        setAILoading(false);
        return;
    }
    
    // Optimized Context: Just IDs and Labels to save space
    const compactNodes = nodes.map(n => `[${n.id}: ${n.label}]`).join(', ');
    
    // Contextual awareness: What is the user focused on?
    const focusedNode = nodeId ? nodes.find(n => n.id === nodeId) : null;
    const focusContext = focusedNode ? `\n\nUSER FOCUS: "${focusedNode.label}" (${focusedNode.id}). 
      Current Details: ${focusedNode.details ? 'Exists (use tool to read if needed)' : 'None'}.` : '\n\nUSER FOCUS: Global Map Overview.';

    // Start with the full history and add the current user message (framed)
    let currentContents = [
        ...state.conversationHistory, 
        { role: 'user', parts: [{ text: framedMessage + `\n\nMAP STATE: ${compactNodes}${focusContext}` }] }
    ];

    try {
        let retryCount = 0;
        const maxRetries = window.aiHelper.getGeminiKeys().length;
        let accumulatedSuggestionsHtml = '';

        while (retryCount <= maxRetries) {
            try {
                let safetyStop = 5; // Prevent infinite loops
                while (safetyStop > 0) {
                    safetyStop--;

                    const payload = {
                        contents: currentContents,
                        tools: [{ functionDeclarations: Object.values(tools).map(t => t.declaration) }],
                        systemInstruction: { parts: [{ text: getSystemPrompt() }] }
                    };
                    
                    const data = await window.aiHelper.callGeminiDirect('knowledge_mapper_chat', payload, modelName);
                    const candidate = data.candidates?.[0];
                    if (!candidate || !candidate.content || !candidate.content.parts) {
                        console.warn("[AI] Received empty or malformed candidate response.");
                        addMessageToChatHistory('system', '<i>Coach is having trouble formulating a response. Please try rephrasing or check your settings.</i>', false);
                        break;
                    }
                    const responseParts = candidate.content.parts;
                    const functionCalls = responseParts.filter(p => p.functionCall).map(p => p.functionCall);

                    if (!functionCalls || functionCalls.length === 0) {
                        const finalText = responseParts.filter(p => p.text).map(p => p.text).join('\n');
                        if (finalText) {
                            addMessageToChatHistory('model', finalText, true, (role, content) => dbManager.saveMessage(currentMapId, { role, content }, nodeId), accumulatedSuggestionsHtml);
                            state.conversationHistory = [...currentContents, candidate.content];
                        }
                        break; 
                    }
                    
                    const callDetails = functionCalls.map(fc => `${fc.name}(${JSON.stringify(fc.args)})`).join(', ');
                    addMessageToChatHistory('system', `<i>Executing: ${callDetails}...</i>`, false);
                    
                    // Update visual loading state with tool names
                    const toolNames = functionCalls.map(fc => fc.name.replace(/_/g, ' ')).join(', ');
                    setAILoading(true, `Coach is using: ${toolNames}...`);

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
                break; // Break retry loop on success
            } catch (error) {

                const errorMsg = String(error.message);
                if ((errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("rate limit")) && retryCount < maxRetries) {
                    console.warn(`[API] Quota exceeded. Rotating key (Retry ${retryCount + 1}/${maxRetries})...`);
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
    const modelName = getContentModelName();
    if (!modelName) return "<p>No Research model selected. Please check Settings.</p>";
    
    console.log(`[AI] Researching details for topic: "${topic}" with context:`, context);
    
    let contextClause = '';
    if (context.parentLabel && context.rootLabel && context.parentLabel !== context.rootLabel) {
        contextClause = `Your research should focus on how "${topic}" relates to its parent topic, "${context.parentLabel}", within the broader subject of "${context.rootLabel}".`;
    } else if (context.parentLabel) {
        contextClause = `Your research should focus on how "${topic}" relates to the main topic, "${context.parentLabel}".`;
    }

    const researchPrompt = `You are a research assistant. Your task is to compile a comprehensive summary about the topic: "${topic}". 
    ${contextClause}
    Your response will be grounded on Google Search results to ensure accuracy.
    Synthesize the findings into a well-structured report.
    CRITICAL: Format your entire response using simple HTML. Use tags like <h3>, <h4>, <p>, <ul>, <li>, and <strong>. 
    
    Structure your report to help a student fill out a "Notecard":
    - Provide a concise summary (good for Paraphrasing).
    - Provide 1-2 direct impactful quotes (good for the Quote section).
    - Provide context or interesting facts.
    
    Whenever possible, include relevant source links within your text using \`<a href='...' target='_blank'>...</a>\` tags. Do not use any markdown or code block fences. Your output must be only the raw HTML content.`;

    
    try {
        const response = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
            config: { tools: [{ googleSearch: {} }] }
        }));
        
        // REVISED: Accessing text and metadata directly from the response object.
        let responseText = (response.text || "<p>No details could be generated.</p>").trim();
        if (responseText.startsWith('```html')) {
            responseText = responseText.substring(7).trim();
        } else if (responseText.startsWith('```')) {
            responseText = responseText.substring(3).trim();
        }
        if (responseText.endsWith('```')) {
            responseText = responseText.slice(0, -3).trim();
        }

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

async function _internal_getExpansionTopics(nodeLabel, instruction) {
    const modelName = getContentModelName();
    if (!modelName) {
        toast("No Research model selected.");
        return [];
    }
    const prompt = `You are a creative research mentor. The student wants to expand on the node "${nodeLabel}" with the angle: "${instruction}". 

    Generate a list of 3 to 5 highly relevant sub-topics or specific questions. 
    Return the list as a JSON array of strings.`;
    const schema = { type: Type.OBJECT, properties: { topics: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["topics"] };

    try {
        const response = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", responseSchema: schema },
        }));
        const data = JSON.parse(response.text);
        return data.topics || [];
    } catch (error) {
        console.error("AI node expansion topic generation failed:", error);
        return [];
    }
}

export async function generateGraphDataFromTopic(topic, type, shouldResearch = true) {
    if (!state.aiClient) {
        toast("Please set your Gemini API key in Settings.");
        return null;
    }
    const modelName = getContentModelName();
    if (!modelName) {
        toast("No Research model selected.");
        return null;
    }
    
    let prompt, schema;
    if (type === 'flowchart') {
        prompt = `You are an expert at creating logical process flowcharts based on a user's topic. Your task is to generate a flowchart for the process: "${topic}".
    
Follow these rules precisely:
1.  **Structure:** The flowchart must have a single, clear 'Start' node (ellipse) and one or more 'End' nodes (ellipse).
2.  **Nodes:** Use 'rectangle' for process steps and 'diamond' for decision points.
3.  **Decisions & Branching:** Every 'diamond' node MUST have exactly two outgoing links, each with a clear, mutually exclusive label (e.g., "Yes" / "No", "Success" / "Failure"). These branches should represent a logical choice.
4.  **Flow:** All paths must logically progress. Branches can either proceed to different steps or loop back to an earlier step in the process. Ensure there are no dead ends, and all paths eventually reach an 'End' node.
5.  **IDs:** Node 'id' values must be simple, unique strings (e.g., "start", "step1", "decision2", "end").

Provide the output as a single, valid JSON object matching the specified schema.`;
        schema = { type: Type.OBJECT, properties: { nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, label: {type: Type.STRING}, shape: {type: Type.STRING, enum: ['rectangle', 'ellipse', 'diamond']} }, required: ["id", "label", "shape"] } }, links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: {type: Type.STRING}, target: {type: Type.STRING}, label: {type: Type.STRING} }, required: ["source", "target"] } } }, required: ["nodes", "links"] };
    } else {
        prompt = `Generate a mind map for: "${topic}". Create a central root node, 5-7 key sub-topics, and 2-3 further sub-nodes for each. Use the specified JSON format.`;
        schema = { type: Type.OBJECT, properties: { nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, label: {type: Type.STRING} }, required: ["id", "label"] } }, links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: {type: Type.STRING}, target: {type: Type.STRING} }, required: ["source", "target"] } } }, required: ["nodes", "links"] };
    }
    
    try {
        setAILoading(true, "Coach is structuring your curiosity world...");
        toast("Generating map structure...");
        const response = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        // REVISED: Accessing text directly from the response property.
        const graphData = JSON.parse(response.text); 
        if (!graphData.nodes || graphData.nodes.length === 0) { toast("AI returned an empty map."); return null; } 

        if (shouldResearch) {
            researchProgressManager.show(`Generating Map for "${topic}"`);
            researchProgressManager.addTasks(graphData.nodes.map(n => n.label));
            await new Promise(resolve => setTimeout(resolve, 0));

            const parentMap = new Map();
            (graphData.links || []).forEach(link => parentMap.set(link.target, link.source));
            const labelMap = new Map(graphData.nodes.map(n => [n.id, n.label]));
            const detailsMap = new Map();

            for (const node of graphData.nodes) {
                try {
                    setAILoading(true, `Coach is researching: ${node.label}...`);
                    researchProgressManager.updateTask(node.label, 'Researching');
                    const parentId = parentMap.get(node.id);
                    const parentLabel = parentId ? labelMap.get(parentId) : null;
                    const detail = await _internal_researchTopicForDetails(node.label, { parentLabel, rootLabel: topic });
                    detailsMap.set(node.id, detail);
                    researchProgressManager.updateTask(node.label, 'Done', detail);
                } catch (err) {
                    console.error(`Error researching ${node.label}:`, err);
                    researchProgressManager.updateTask(node.label, 'Error', `<p>Error researching this topic.</p>`);
                }
            }
            researchProgressManager.hide();
            graphData.nodes.forEach(n => n.details = detailsMap.get(n.id) || '');
        }
        return graphData;
    } catch (error) { 
        console.error("AI map generation failed:", error); 
        toast("Error: AI failed to generate map structure.");
        researchProgressManager.hide();
        return null;
    } finally {
        setAILoading(false);
    }
}

// --- HELPER FUNCTIONS ---
function findNodeContext(nodeId) {
    const { nodes, links } = getGraphState();
    const findRoot = (id, visited = new Set()) => {
        if (visited.has(id)) return id;
        visited.add(id);
        const parentLink = links.find(l => l.target.id === id);
        return parentLink ? findRoot(parentLink.source.id, visited) : id;
    };
    const rootId = findRoot(nodeId);
    return { rootLabel: nodes.find(n => n.id === rootId)?.label };
}

function getNodeAncestorPath(nodeId) {
    const { nodes, links } = getGraphState();
    const path = [];
    let currentId = nodeId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = nodes.find(n => n.id === currentId);
        if (node) path.unshift(node.label);
        const parentLink = links.find(l => l.target.id === currentId);
        currentId = parentLink ? parentLink.source.id : null;
    }
    return path;
}
