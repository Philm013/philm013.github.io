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

const getToolModelName = () => localStorage.getItem('tool_model') || 'gemini-2.0-flash';
const getContentModelName = () => localStorage.getItem('content_model') || 'gemini-1.5-pro';

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

const SYSTEM_PROMPT = `You are an "Expert Research Coach," a Socratic mentor integrated into a visual mind mapping tool. Your mission is to guide students through the academic research process (Steps 1-6) using the Socratic Method.

**Socratic Coaching Principles:**
1. **Ask, Don't Tell:** Instead of giving answers, ask questions that lead the student to discover the answer themselves.
2. **Scaffold with Choices:** Provide 2-3 interactive suggestion chips to help the student formulate their thoughts or choose a direction.
3. **Reflect and Refine:** Encourage the student to look back at their map and identify contradictions or gaps in evidence.
4. **Pedagogical Structure:** Use the 6 steps (Exploration, Questioning, Planning, Gathering, Synthesis, Review).

**Response Formatting:**
- Use \`<div class="coach-question">...\</div>\` for your primary guiding question.
- Always include relevant links if you find them, using \`<a href='...' target='_blank'>...</a>\`.
- Encourage students to save important links to their Bibliography using the bookmark icon that appears next to links.
- CRITICAL: At the end of every response, provide 2-3 interactive choices using this exact HTML structure:
  \`<div class="socratic-prompt-container">
    <button class="suggestion-chip" data-input="Student response 1"><span class="iconify" data-icon="solar:alt-arrow-right-bold-duotone"></span> Choice 1</button>
    <button class="suggestion-chip" data-input="Student response 2"><span class="iconify" data-icon="solar:alt-arrow-right-bold-duotone"></span> Choice 2</button>
  \</div>\`
- Use simple HTML for formatting (<strong>, <ul>, etc.). Do not use markdown fences.

**Integration with the Tool:**
- Remind students to add findings to their mind map as "Notecards".
- Encourage them to use the "Sources" tab to manage their bibliography.
- Explain that each "Notecard" can be linked to a specific source from their bibliography.

**Your Primary Tools:**

- \`update_research_step(step_number)\`: Transition the student through phases.
- \`add_scaffold_node(label, parentNodeId, type)\`: Add "to-do" or "question" nodes to their map.
- \`evaluate_student_input(content, context_type)\`: Analyze their drafts mentally before coaching.

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
    add_scaffold_node: {
        declaration: { 
            name: 'add_scaffold_node', 
            description: "Adds a placeholder or structural node to the map for the student to work on. Use this to help them organize their thoughts.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    label: { type: Type.STRING, description: "The text label for the scaffold node." },
                    parentNodeId: { type: Type.STRING, description: "Optional. The parent node to connect to." },
                    type: { type: Type.STRING, enum: ['placeholder', 'question', 'evidence', 'task'], description: "The type of scaffolding node." }
                }, 
                required: ['label'] 
            } 
        },
        execute: async ({ label, parentNodeId, type }) => { 
            const colorMap = { placeholder: '#64748b', question: '#fbbf24', evidence: '#2dd4bf', task: '#a855f7' };
            const newNode = addNode(label, parentNodeId, { shape: 'rectangle', color: colorMap[type] || '#38bdf8' }); 
            return { result: `Added a ${type} scaffold node with ID ${newNode.id}.`, newNodeId: newNode.id };
        }
    },
    evaluate_student_input: {
        declaration: { 
            name: 'evaluate_student_input', 
            description: "Analyzes student work (like a research question) and provides specific coaching feedback.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    content: { type: Type.STRING, description: "The student's drafted content." },
                    context_type: { type: Type.STRING, enum: ['topic', 'question', 'keywords'], description: "What the student is working on." }
                }, 
                required: ['content', 'context_type'] 
            } 
        },
        execute: async ({ context_type }) => { 
            return { result: `Evaluation complete for ${context_type}. Please provide your coaching feedback now.` };
        }
    },
    analyze_source_content: {
        declaration: { 
            name: 'analyze_source_content', 
            description: "Helps the student analyze a snippet of text or a source they've found, identifying bias, key evidence, or interesting perspectives.", 
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    text: { type: Type.STRING, description: "The source text to analyze." } 
                }, 
                required: ['text'] 
            } 
        },
        execute: async () => { 
            return { result: "Analysis complete. Please provide your coaching insights to the student." };
        }
    },
    google_search: {
        declaration: { name: 'google_search', description: 'Use to help the student find information or verify facts during the gathering phase.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The search query.' } }, required: ['query'] } },
        execute: async ({ query }) => { 
            const result = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({ model: getToolModelName(), contents: query, config: { tools: [{ googleSearch: {} }] } }));
            const text = result.text; const suggestionsHtml = result.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent; return { isGroundedResponse: true, text: text, suggestionsHtml: suggestionsHtml }; 
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
 */
export async function sendChatMessage(message, currentMapId) {
    if ((!state.aiClient && !window.aiHelper.getAvailableKey()) || state.isAITaskRunning || !message.trim()) {
        if(!state.aiClient) toast("Please set your Gemini API key in Settings.");
        return;
    }
    
    // Ensure AI is initialized if we have keys but no client
    if (!state.aiClient && window.aiHelper.getAvailableKey()) {
        await initializeAI();
    }

    setAILoading(true);
    addMessageToChatHistory('user', message, true, (role, content) => dbManager.saveMessage(currentMapId, { role, content }));
    
    const { nodes } = getGraphState();
    const modelName = getToolModelName();
    
    // Start with the full history and add the current user message
    let currentContents = [
        ...state.conversationHistory, 
        { role: 'user', parts: [{ text: message + "\n\n" + "Current map nodes: " + JSON.stringify(nodes.map(n => ({id: n.id, label: n.label}))) }] }
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
                        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
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

export async function _internal_expandNodeWithAI(node, instruction) {
    if (!state.aiClient || state.isAITaskRunning) return;
    setAILoading(true);

    const ancestorPath = getNodeAncestorPath(node.id);
    const contextString = ancestorPath.join(' > ');
    
    const prompt = `You are a mind map assistant. The user wants to expand on a node within a mind map.
    
**Map Context (Path to Node):** ${contextString}
**Node to Expand:** "${node.label}" (ID: ${node.id})
**User's Instruction:** "${instruction}"

Based on this specific context, generate a list of 3 to 5 highly relevant sub-topics for "${node.label}". The sub-topics should be direct children of "${node.label}" and make sense within the given path. Return the list as a JSON array of strings.`;

    const schema = { type: Type.OBJECT, properties: { topics: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["topics"] };

    try {
        const response = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", responseSchema: schema },
        }));
        // REVISED: Accessing text directly from the response property.
        const expansionData = JSON.parse(response.text);

        if (expansionData.topics && expansionData.topics.length > 0) {
            researchProgressManager.show(`Expanding "${node.label}"`);
            researchProgressManager.addTasks(expansionData.topics);
            await new Promise(resolve => setTimeout(resolve, 0)); // Force UI render

            const nodeContext = findNodeContext(node.id);
            for (const topic of expansionData.topics) {
                try {
                    researchProgressManager.updateTask(topic, 'Researching');
                    const researchContext = { parentLabel: node.label, rootLabel: nodeContext.rootLabel };
                    const detail = await _internal_researchTopicForDetails(topic, researchContext);
                    addNode(topic, node.id, { details: detail });
                    researchProgressManager.updateTask(topic, 'Done', detail);
                } catch (err) {
                    console.error(`Error processing topic ${topic}:`, err);
                    researchProgressManager.updateTask(topic, 'Error', `<p>An error occurred.</p>`);
                }
            }
            toast("Expansion complete!");
            setTimeout(() => researchProgressManager.hide(), 3000);
        } else {
            toast("AI could not find topics to expand on.");
        }
    } catch (error) { 
        console.error("AI node expansion failed:", error); 
        toast("Error: Failed to expand node.");
        researchProgressManager.hide();
    } finally { 
        setAILoading(false); 
    }
}

export async function generateGraphDataFromTopic(topic, type, shouldResearch = true) {
    if (!state.aiClient) {
        toast("Please set your Gemini API key in Settings.");
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
                    researchProgressManager.updateTask(node.label, 'Researching');
                    const parentId = parentMap.get(node.id);
                    const parentLabel = parentId ? labelMap.get(parentId) : topic;
                    const researchContext = { parentLabel, rootLabel: topic };
                    const detail = await _internal_researchTopicForDetails(node.label, researchContext);
                    detailsMap.set(node.id, detail);
                    researchProgressManager.updateTask(node.label, 'Done', detail);
                } catch (err) {
                    console.error(`Error processing node ${node.label}:`, err);
                    detailsMap.set(node.id, "<p>Error during research.</p>");
                    researchProgressManager.updateTask(node.label, 'Error', '<p>An error occurred.</p>');
                }
            }
            graphData.nodes.forEach(node => {
                node.details = detailsMap.get(node.id) || '';
                node.shape = node.shape || 'rectangle';
            });
            
            toast('Research complete. Arranging map layout...');
            setTimeout(() => researchProgressManager.hide(), 3000);
        } else {
            graphData.nodes.forEach(node => {
                node.details = '';
                node.shape = node.shape || 'rectangle';
            });
            toast('Map structure generated. Arranging layout...');
        }

        const counter = graphData.nodes.reduce((max, n) => { const num = parseInt((n.id || '').split('-').pop()); return isNaN(num) ? max : Math.max(max, num); }, 0); 
        const layoutType = type === 'flowchart' ? 'flowchart' : 'mindmap';
        return { ...graphData, counter, layout: layoutType, linkStyle: 'straight' };
    } catch (error) { 
        console.error("AI map generation failed:", error); 
        toast("Error: Failed to generate map. The AI may have returned invalid data.");
        researchProgressManager.hide();
        return null; 
    }
}

export function findNodeContext(nodeId) {
    const { nodes, links } = getGraphState();
    if (!nodeId) return { rootLabel: 'the general topic of the map', parentLabel: 'the main idea' };
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { rootLabel: 'the general topic of the map', parentLabel: 'the main idea' };

    const parentLink = links.find(l => l.target && l.target.id === nodeId);
    const parent = parentLink ? parentLink.source : null;

    const targetIds = new Set(links.map(l => l.target.id));
    const potentialRoots = nodes.filter(n => !targetIds.has(n.id));
    const rootNode = potentialRoots.length > 0 ? potentialRoots[0] : nodes[0];

    return {
        parentLabel: parent ? parent.label : (rootNode ? rootNode.label : null),
        rootLabel: rootNode ? rootNode.label : null,
    };
}

export function getNodeAncestorPath(nodeId) {
    const { nodes, links } = getGraphState();
    const path = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const parentMap = new Map();
    links.forEach(l => {
        if(l.source && l.target) parentMap.set(l.target.id, l.source.id);
    });

    let currentId = nodeId;
    while (currentId) {
        const node = nodeMap.get(currentId);
        if (node) {
            path.unshift(node.label);
        }
        currentId = parentMap.get(currentId);
    }
    return path;
}