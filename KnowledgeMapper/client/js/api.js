import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type } from "https://esm.run/@google/genai";
import { HfInferenceEndpoint } from 'https://cdn.jsdelivr.net/npm/@huggingface/inference@2.7.0/+esm';
import { toast, setAILoading, addMessageToChatHistory, researchProgressManager } from './ui.js';
import { addNode, getGraphState } from './graph.js';
import { dbManager } from './storage.js';

// --- MODULE STATE ---
let state = {
    aiClient: null,
    hfClient: null,
    conversationHistory: [],
    isAITaskRunning: false,
};

const getToolModelName = () => localStorage.getItem('tool_model') || 'gemini-2.0-flash';
const getContentModelName = () => localStorage.getItem('content_model') || 'gemini-2.5-flash-preview-05-20';

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
export function initializeAI() {
    const geminiKey = localStorage.getItem('gemini_key');
    if (geminiKey) {
        try {
            // REVISED: Using the documented object-based configuration for the AI client.
            state.aiClient = new GoogleGenAI({ apiKey: geminiKey });
            toast('AI Assistant Ready');
        } catch (error) {
            console.error("Failed to initialize AI:", error);
            toast('Error: Invalid Gemini API Key');
            state.aiClient = null;
        }
    } else {
        toast('Gemini API Key not set. AI features disabled.');
        state.aiClient = null;
    }
    const hfKey = localStorage.getItem('hf_key');
    state.hfClient = hfKey ? new HfInferenceEndpoint(hfKey) : null;
}

// --- CHAT & TOOL INTEGRATION ---

const SYSTEM_PROMPT = `You are a "Visual Knowledge Synthesizer," an expert AI assistant integrated into a visual mind mapping tool. Your goal is to help users research topics and build diagrams with maximum efficiency.
        
**Core Workflow:**
1.  **Your primary tool is \`research_and_add_node\`**. When the user asks to add a new concept, person, place, or event (e.g., "Tell me about photosynthesis," "Add a node for the Eiffel Tower"), you **MUST** call this tool. It automatically handles the research, synthesizes the information, and creates a new node with detailed notes.
2.  Use the simpler \`add_simple_node\` tool **ONLY** for structural or placeholder nodes that do not require research (e.g., if the user says "Add a 'Pros' and 'Cons' node under the current one").
3.  For expanding existing nodes, use \`expandNodeWithAI\`.
4.  Always confirm your actions to the user after the tool has run. When you provide information in your text responses, if you find relevant web pages, embed them as HTML links (\`<a href='...' target='_blank'>...</a>\`) directly in the text.

**Tool Usage Rules:**
*   You MUST only call the functions provided to you in the tool definitions.
*   Do not invent or call any other functions, especially not Python code. For example, do NOT output text like \`print(google_search.search(...))\`.
*   Stick strictly to the JSON format for function calls as specified.

You will be given the current list of nodes for context. Use their IDs when calling functions.`;

const tools = {
    research_and_add_node: {
        declaration: { name: 'research_and_add_node', description: "Researches a topic using available tools, synthesizes the findings into a detailed summary, and adds a new, fully populated node to the map. Use this for creating content-rich nodes.", parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING, description: "The topic to research and create a node for." }, parentNodeId: { type: Type.STRING, description: "Optional. The ID of an existing node to connect this new node to." } }, required: ['topic'] } },
        execute: async ({ topic, parentNodeId }) => { 
            const context = findNodeContext(parentNodeId);
            const details = await _internal_researchTopicForDetails(topic, context);
            const newNode = addNode(topic, parentNodeId, { details: details }); 
            return { result: `Successfully researched and added a new node for '${topic}' with ID ${newNode.id}.`, newNodeId: newNode.id };
        }
    },
    add_simple_node: {
        declaration: { name: 'add_simple_node', description: 'Adds a new, simple node to the map without researching it. Use for structural elements like "Pros" or "Cons".', parameters: { type: Type.OBJECT, properties: { label: { type: Type.STRING, description: "The text label for the new node." }, parentNodeId: { type: Type.STRING, description: "Optional. The ID of an existing node to connect this new node to." } }, required: ['label'] } },
        execute: async ({ label, parentNodeId }) => { const newNode = addNode(label, parentNodeId); return { result: `Successfully added simple node '${label}' with ID ${newNode.id}.`, newNodeId: newNode.id }; }
    },
    deleteNodeById: {
        declaration: { name: 'deleteNodeById', description: 'Deletes a node and all its children from the map by its ID.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING, description: "The ID of the node to delete." } }, required: ['nodeId'] } },
        execute: async ({ nodeId }) => { deleteNodeById(nodeId); return { result: `Successfully deleted node ${nodeId}.` }; }
    },
    editNodeLabel: {
        declaration: { name: 'editNodeLabel', description: 'Edits the label of an existing node.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING, description: "The ID of the node to edit." }, newLabel: { type: Type.STRING, description: "The new text label for the node." } }, required: ['nodeId', 'newLabel'] } },
        execute: async ({ nodeId, newLabel }) => { editNodeLabel(nodeId, newLabel); return { result: `Successfully edited node ${nodeId}.` }; }
    },
    connectNodesById: {
        declaration: { name: 'connectNodesById', description: 'Creates a directional link from a source node to a target node.', parameters: { type: Type.OBJECT, properties: { sourceNodeId: { type: Type.STRING }, targetNodeId: { type: Type.STRING } }, required: ['sourceNodeId', 'targetNodeId'] } },
        execute: async ({ sourceNodeId, targetNodeId }) => { connectNodesById(sourceNodeId, targetNodeId); return { result: `Successfully connected ${sourceNodeId} to ${targetNodeId}.` }; }
    },
    expandNodeWithAI: {
        declaration: { name: 'expandNodeWithAI', description: 'Generates several new, relevant child nodes connected to a specified parent node, researching each new node as it is created.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING, description: "The ID of the parent node to expand from." }, instruction: { type: Type.STRING, description: "A brief instruction for the expansion, e.g., 'key components' or 'historical events'." } }, required: ['nodeId', 'instruction'] } },
        execute: async ({ nodeId, instruction }) => { const { nodes } = getGraphState(); const node = nodes.find(n => n.id === nodeId); if (!node) return { error: "Node not found." }; await _internal_expandNodeWithAI(node, instruction); return { result: `Expanded and researched node ${nodeId} with new children.` }; }
    },
};

/**
 * REVISED: This function now correctly implements the compositional function calling loop.
 * It handles multiple turns of tool use before producing a final text response,
 * ensuring robust and accurate interactions based on the latest SDK documentation.
 */
export async function sendChatMessage(message, currentMapId) {
    if (!state.aiClient || state.isAITaskRunning || !message.trim()) {
        if(!state.aiClient) toast("Please set your Gemini API key in Settings.");
        return;
    }
    setAILoading(true);
    addMessageToChatHistory('user', message, true, (role, content) => dbManager.saveMessage(currentMapId, { role, content }));
    
    const { nodes } = getGraphState();
    
    // Start with the full history and add the current user message
    let currentContents = [
        ...state.conversationHistory, 
        { role: 'user', parts: [{ text: message + "\n\n" + "Current map nodes: " + JSON.stringify(nodes.map(n => ({id: n.id, label: n.label}))) }] }
    ];

    try {
        let safetyStop = 5; // Prevent infinite loops
        while (safetyStop > 0) {
            safetyStop--;

            const response = await apiThrottler.enqueue(() => state.aiClient.models.generateContent({
                model: getToolModelName(),
                contents: currentContents,
                config: {
                    tools: [{ functionDeclarations: Object.values(tools).map(t => t.declaration) }],
                    systemInstruction: SYSTEM_PROMPT
                }
            }));
            
            // REVISED: Access function calls directly from the response property.
            const functionCalls = response.functionCalls;

            if (!functionCalls || functionCalls.length === 0) {
                // No function calls, we have our final text response.
                const finalText = response.text;
                if (finalText) {
                    addMessageToChatHistory('model', finalText, true, (role, content) => dbManager.saveMessage(currentMapId, { role, content }));
                    state.conversationHistory = [...currentContents, { role: 'model', parts: [{ text: finalText }] }];
                }
                break; // Exit the loop
            }
            
            // A function call was made.
            const callDetails = functionCalls.map(fc => `${fc.name}(${JSON.stringify(fc.args)})`).join(', ');
            addMessageToChatHistory('system', `<i>Executing: ${callDetails}...</i>`, false);

            // REVISED: Prepare tool responses for the next turn, following the documented format.
            const toolPromises = functionCalls.map(call =>
                tools[call.name].execute(call.args)
                    .then(output => ({ name: call.name, response: { result: output } }))
                    .catch(error => ({ name: call.name, response: { error: error.message } }))
            );
            const toolResponses = await Promise.all(toolPromises);
            
            // REVISED: Add the model's turn (with the function call) and the user's turn (with the tool response) to the history.
            currentContents.push({ role: 'model', parts: functionCalls.map(fc => ({ functionCall: fc })) });
            currentContents.push({ role: 'user', parts: toolResponses.map(tr => ({ functionResponse: tr })) });
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
    CRITICAL: Format your entire response using simple HTML. Use tags like <h3>, <h4>, <p>, <ul>, <li>, and <strong> for structure and emphasis. Whenever possible, include relevant source links within your text using \`<a href='...' target='_blank'>...</a>\` tags. Do not use any markdown or code block fences (like \`\`\`). Your output must be only the raw HTML content.`;
    
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