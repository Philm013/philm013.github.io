import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { dataGatheringTools, apiThrottler } from './research-tools.js';

// Initialize the Gemini client using the documented object-based configuration
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getToolModelName = () => process.env.TOOL_MODEL || 'gemini-2.0-flash';
const getContentModelName = () => process.env.CONTENT_MODEL || 'gemini-2.5-flash-preview-05-20';

/**
 * A detailed instruction set provided to the AI model that defines its role as a 'Visual Knowledge Synthesizer,' its core workflow, and how it should use the available tools.
 */
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

/**
 * A collection of tool definitions for actions that the client should perform directly.
 * These tools return simple action payloads for the client to execute.
 */
const clientActionTools = {
    add_simple_node: {
        declaration: { name: 'add_simple_node', description: 'Adds a new, simple node to the map without researching it. Use for structural elements like "Pros" or "Cons".', parameters: { type: Type.OBJECT, properties: { label: { type: Type.STRING, description: "The text label for the new node." }, parentNodeId: { type: Type.STRING, description: "Optional. The ID of an existing node to connect this new node to." } }, required: ['label'] } },
        execute: async (args) => ({ action: 'addNode', payload: { label: args.label, parentId: args.parentNodeId } })
    },
    deleteNodeById: {
        declaration: { name: 'deleteNodeById', description: 'Deletes a node and all its children from the map by its ID.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING, description: "The ID of the node to delete." } }, required: ['nodeId'] } },
        execute: async (args) => ({ action: 'deleteNodeById', payload: { nodeId: args.nodeId } })
    },
    editNodeLabel: {
        declaration: { name: 'editNodeLabel', description: 'Edits the label of an existing node.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING, description: "The ID of the node to edit." }, newLabel: { type: Type.STRING, description: "The new text label for the node." } }, required: ['nodeId', 'newLabel'] } },
        execute: async (args) => ({ action: 'editNodeLabel', payload: { nodeId: args.nodeId, newLabel: args.newLabel } })
    },
    connectNodesById: {
        declaration: { name: 'connectNodesById', description: 'Creates a directional link from a source node to a target node.', parameters: { type: Type.OBJECT, properties: { sourceNodeId: { type: Type.STRING }, targetNodeId: { type: Type.STRING } }, required: ['sourceNodeId', 'targetNodeId'] } },
        execute: async (args) => ({ action: 'connectNodesById', payload: { sourceId: args.sourceNodeId, targetId: args.targetNodeId } })
    },
};

/**
 * A collection of tool definitions for complex, multi-step operations that are executed on the server.
 */
const complexActionTools = {
    research_and_add_node: {
        declaration: { name: 'research_and_add_node', description: "Researches a topic using available tools, synthesizes the findings into a detailed summary, and adds a new, fully populated node to the map. Use this for creating content-rich nodes.", parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING, description: "The topic to research and create a node for." }, parentNodeId: { type: Type.STRING, description: "Optional. The ID of an existing node to connect this new node to." } }, required: ['topic'] } },
        execute: async (args, nodeContext) => {
            const details = await _internal_researchTopicForDetails(args.topic, nodeContext);
            return { action: 'addNode', payload: { label: args.topic, parentId: args.parentNodeId, options: { details } } };
        }
    },
    expandNodeWithAI: {
        declaration: { name: 'expandNodeWithAI', description: 'Generates several new, relevant child nodes connected to a specified parent node, researching each new node as it is created.', parameters: { type: Type.OBJECT, properties: { nodeId: { type: Type.STRING, description: "The ID of the parent node to expand from." }, instruction: { type: Type.STRING, description: "A brief instruction for the expansion, e.g., 'key components' or 'historical events'." } }, required: ['nodeId', 'instruction'] } },
        execute: async (args, nodeContext) => {
            const subTopics = await _internal_getExpansionTopics(nodeContext.parentLabel, args.instruction);
            const actions = [];
            for (const topic of subTopics) {
                const details = await _internal_researchTopicForDetails(topic, { parentLabel: nodeContext.parentLabel, rootLabel: nodeContext.rootLabel });
                actions.push({ action: 'addNode', payload: { label: topic, parentId: args.nodeId, options: { details } } });
            }
            return actions; // Returns an array of actions
        }
    },
};

const allTools = { ...clientActionTools, ...complexActionTools };

/**
 * A private helper function that uses a separate, research-focused AI agent to gather information on a topic and synthesize it into an HTML report.
 * @param {string} topic - The topic to research.
 * @param {object} context - Contextual information like parent and root node labels.
 * @returns {Promise<string>} - An HTML-formatted string with the research summary.
 */
async function _internal_researchTopicForDetails(topic, context = {}) {
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
        // REVISED: Using the new `ai.models.generateContent` API with a `config` object for tools.
        const response = await apiThrottler.enqueue(() => genAI.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
            config: {
                tools: [{ googleSearch: {} }]
            }
        }));
        
        // REVISED: Accessing text directly from the response property.
        let responseText = (response.text || "<p>No details could be generated.</p>").trim();
        
        // Clean up potential markdown fences
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

/**
 * A private helper function that asks the AI to generate a list of related sub-topics for expanding a node.
 * @param {string} nodeLabel - The label of the node to expand.
 * @param {string} instruction - The user's instruction for the expansion.
 * @returns {Promise<string[]>} - An array of sub-topic strings.
 */
async function _internal_getExpansionTopics(nodeLabel, instruction) {
    const prompt = `You are a mind map assistant. The user wants to expand on the node "${nodeLabel}" with the instruction: "${instruction}". Generate a list of 3 to 5 highly relevant sub-topics. Return the list as a JSON array of strings.`;
    const schema = { type: Type.OBJECT, properties: { topics: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["topics"] };

    try {
        // REVISED: Using `ai.models.generateContent` and moving generation config into a `config` object.
        const response = await apiThrottler.enqueue(() => genAI.models.generateContent({
            model: getContentModelName(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json", responseSchema: schema },
        }));
        // REVISED: Accessing text directly from the response property.
        const expansionData = JSON.parse(response.text);
        return expansionData.topics || [];
    } catch (error) {
        console.error("AI node expansion topic generation failed:", error);
        return [];
    }
}

/**
 * The main function for handling chat interactions.
 * REVISED: This function now implements a multi-turn, compositional function calling loop
 * to robustly handle complex interactions where the model needs to use tools and then
 * respond based on the tool output, as shown in the new SDK documentation.
 * @param {object[]} history - The conversation history.
 * @param {object} nodeContext - Context about the currently selected node.
 * @returns {Promise<object>} - An object containing the AI's text response and a list of actions for the client.
 */
export async function processChat(history, nodeContext) {
    const modelConfig = {
        model: getToolModelName(),
        systemInstruction: SYSTEM_PROMPT,
        config: {
            tools: [{ functionDeclarations: Object.values(allTools).map(t => t.declaration) }]
        }
    };

    let currentContents = [...history];
    let actions = [];
    let safetyStop = 5; // Prevent accidental infinite loops

    while (safetyStop > 0) {
        safetyStop--;

        const response = await genAI.models.generateContent({
            ...modelConfig,
            contents: currentContents,
        });

        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
            // No more function calls, we have the final text response.
            return {
                textResponse: response.text,
                actions: actions
            };
        }

        // Execute tools and prepare the response for the next model call.
        const toolResponses = [];
        for (const call of functionCalls) {
            const tool = allTools[call.name];
            if (tool) {
                // Execute the function and accumulate the resulting client actions.
                const actionResult = await tool.execute(call.args, nodeContext);
                if (Array.isArray(actionResult)) {
                    actions.push(...actionResult);
                } else {
                    actions.push(actionResult);
                }
                
                // Prepare the tool output to be sent back to the model.
                toolResponses.push({
                    name: call.name,
                    response: { result: actionResult }
                });
            } else {
                toolResponses.push({
                    name: call.name,
                    response: { error: `Tool ${call.name} not found.` }
                });
            }
        }

        // Add the model's function call turn and the tool results turn to the conversation history.
        currentContents.push({ role: 'model', parts: functionCalls.map(fc => ({ functionCall: fc })) });
        currentContents.push({ role: 'user', parts: toolResponses.map(tr => ({ functionResponse: tr })) });
    }

    // If the loop terminates due to the safety stop, return what we have.
    return {
        textResponse: "The AI took too many steps to generate a response. Please try again.",
        actions: actions
    };
}

/**
 * Generates a complete graph structure for a given topic and type.
 * @param {string} topic - The central topic for the map.
 * @param {'mindmap' | 'flowchart'} type - The type of map to generate.
 * @param {boolean} shouldResearch - Whether to enrich each node with details.
 * @returns {Promise<object>} - The complete graph data object.
 */
export async function generateInitialMap(topic, type, shouldResearch) {
    let prompt, schema;
    if (type === 'flowchart') {
        prompt = `Generate a flowchart for the process: "${topic}". Follow these rules: single 'Start' (ellipse), one or more 'End' (ellipse), 'rectangle' for steps, 'diamond' for decisions. Every diamond must have two outgoing links with mutually exclusive labels (e.g., "Yes"/"No"). All paths must lead to an 'End' node. Use simple, unique string IDs. Provide valid JSON matching the schema.`;
        schema = { type: Type.OBJECT, properties: { nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, label: {type: Type.STRING}, shape: {type: Type.STRING, enum: ['rectangle', 'ellipse', 'diamond']} }, required: ["id", "label", "shape"] } }, links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: {type: Type.STRING}, target: {type: Type.STRING}, label: {type: Type.STRING} }, required: ["source", "target"] } } }, required: ["nodes", "links"] };
    } else {
        prompt = `Generate a mind map for: "${topic}". Create a central root node, 5-7 key sub-topics, and 2-3 further sub-nodes for each. Use the specified JSON format.`;
        schema = { type: Type.OBJECT, properties: { nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, label: {type: Type.STRING} }, required: ["id", "label"] } }, links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: {type: Type.STRING}, target: {type: Type.STRING} }, required: ["source", "target"] } } }, required: ["nodes", "links"] };
    }

    // REVISED: Using `ai.models.generateContent` and moving generation config into a `config` object.
    const response = await apiThrottler.enqueue(() => genAI.models.generateContent({
        model: getContentModelName(),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", responseSchema: schema }
    }));
    
    // REVISED: Accessing text directly from the response property.
    const graphData = JSON.parse(response.text);
    if (!graphData.nodes || graphData.nodes.length === 0) {
        throw new Error("AI returned an empty map structure.");
    }

    if (shouldResearch) {
        const parentMap = new Map();
        (graphData.links || []).forEach(link => parentMap.set(link.target, link.source));
        const labelMap = new Map(graphData.nodes.map(n => [n.id, n.label]));

        for (const node of graphData.nodes) {
            const parentId = parentMap.get(node.id);
            const parentLabel = parentId ? labelMap.get(parentId) : topic;
            const researchContext = { parentLabel, rootLabel: topic };
            node.details = await _internal_researchTopicForDetails(node.label, researchContext);
        }
    }

    graphData.nodes.forEach(node => {
        node.shape = node.shape || 'rectangle';
        if (!shouldResearch) node.details = '';
    });

    const counter = graphData.nodes.reduce((max, n) => { const num = parseInt((n.id || '').split('-').pop()); return isNaN(num) ? max : Math.max(max, num); }, 0);
    return { ...graphData, counter, layout: type, linkStyle: 'straight' };
}

/**
 * A public-facing function that wraps `_internal_researchTopicForDetails` to provide AI-generated details for a single existing node.
 * @param {string} nodeLabel - The label of the node to enrich.
 * @param {string} parentLabel - The label of the node's parent.
 * @param {string} rootLabel - The label of the map's root node.
 * @returns {Promise<string>} - The HTML-formatted details.
 */
export async function enrichNodeDetails(nodeLabel, parentLabel, rootLabel) {
    return await _internal_researchTopicForDetails(nodeLabel, { parentLabel, rootLabel });
}