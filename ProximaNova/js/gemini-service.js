//--- START OF FILE gemini-service.js ---

// js/gemini-service.js

import { GoogleGenAI } from "https://esm.run/@google/genai";

let ai = null;

export function initializeAI() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (apiKey) {
        try {
            ai = new GoogleGenAI({ apiKey: apiKey });
            console.log("Gemini AI initialized from local storage.");
        } catch (error) {
            console.error("Failed to initialize Gemini AI.", error);
            ai = null;
        }
    } else {
        console.warn("No Gemini API key found in local storage.");
        ai = null;
    }
}

export function setApiKey(key) {
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        initializeAI();
    } else {
        localStorage.removeItem('gemini_api_key');
        ai = null;
    }
}

export function setModel(model) {
    localStorage.setItem('gemini_model', model);
}

export function getSelectedModel() {
    return localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
}

export function hasApiKey() {
    return ai !== null;
}

// Initialize on load
initializeAI();

export async function getStrategicAdvice(gameStateSummary) {
    if (!ai) return "Advisor AI is offline. Check API Key.";

    const prompt = `
        You are 'Nova', the colony's onboard Strategic AI, from the sci-fi colony builder game "Project Nova".
        Your purpose is to provide clear, actionable, and concise advice to the player (The Director).
        The ultimate goal is to establish a self-sustaining colony and complete the Genesis Protocol.

        Key game concepts to remember:
        - Power (especially powerDelta) is vital. A negative delta drains batteries, then causes blackouts.
        - Housing limits the number of active specialists, who perform all key tasks.
        - Alien threats will periodically attack the base. Defenses are critical for survival.
        - Resources are finite. Efficiency is key.

        Analyze the following game state summary. Provide the top 2-3 most urgent priorities for the Director.
        Your tone should be professional, encouraging, but direct. Address the player as "Director".

        Format your response as a brief title followed by a markdown bulleted list. Each point should be a single, concise sentence.

        Game State Summary:
        ${JSON.stringify(gameStateSummary, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error getting strategic advice:", error);
        return "An error occurred while contacting the strategic advisor. Please try again later.";
    }
}

function isValidNarrative(narrative) {
    if (!narrative || typeof narrative !== 'object') return false;
    if (!['info', 'dilemma'].includes(narrative.type)) return false;
    if (typeof narrative.title !== 'string' || typeof narrative.text !== 'string') return false;

    if (narrative.type === 'dilemma') {
        if (!narrative.choices || typeof narrative.choices.A !== 'object' || typeof narrative.choices.B !== 'object') return false;
        
        const isValidChoice = (choice) => {
            if (!choice || typeof choice.text !== 'string' || typeof choice.effect !== 'object') return false;
            // Further validation can be added here for specific effect structures if needed
            return true;
        };

        if (!isValidChoice(narrative.choices.A) || !isValidChoice(narrative.choices.B)) return false;
    }
    return true;
}

export async function getMissionControlNarrative(gameEvent) {
    if (!ai) return null;

    const prompt = `
        You are "Mission Control" for "Project Nova", a high-stakes sci-fi colony builder game.
        Your task is to generate a short, flavorful narrative message for the player based on a game event and the current state of their colony.
        The message should be contextually relevant. For example, do not generate a "power shortage" event if the colony has a massive power surplus.
        Use the narrativeLog to create evolving storylines. Reference past events, character names, or outcomes to build a cohesive narrative.

        ### CRITICAL INSTRUCTIONS ###
        1.  Your **entire response** must be a single, valid JSON object.
        2.  Your output must begin directly with a \`{\` and end directly with a \`}\`.
        3.  Do **NOT** wrap the JSON in markdown code fences (like \`\`\`json ... \`\`\`).
        4.  Do **NOT** include any text, notes, or explanations outside of the JSON object.

        ---
        ### JSON STRUCTURE DEFINITIONS ###

        #### 1. "info" type
        A simple, flavorful message commenting on the event.
        \`\`\`
        {
          "type": "info",
          "title": "A string for the message title.",
          "text": "A string containing the narrative message."
        }
        \`\`\`

        #### 2. "dilemma" type
        A more complex situation presenting the player with a risk/reward choice.
        - The \`choices\` key **MUST** be an object with keys "A" and "B".
        - Each choice has a \`text\`, \`outcome_hint_positive\`, \`outcome_hint_negative\`, and an \`effect\` object.
        - The \`effect\` object contains one or more machine-readable game actions.
        \`\`\`
        {
          "type": "dilemma",
          "title": "Dilemma Title",
          "text": "Description of the dilemma.",
          "choices": {
            "A": { 
              "text": "Choice A text.", 
              "outcome_hint_positive": "A hint about the good thing that might happen.",
              "outcome_hint_negative": "A hint about the bad thing that might happen.",
              "effect": { ... effect object ... } 
            },
            "B": { 
              "text": "Choice B text.",
              "outcome_hint_positive": "A hint about the good thing that might happen.",
              "outcome_hint_negative": "A hint about the bad thing that might happen.",
              "effect": { ... effect object ... }
            }
          }
        }
        \`\`\`
        
        ---
        ### EFFECT OBJECT STRUCTURES ###
        An \`effect\` object can contain one or more of the following keys:

        1.  \`message\`: A simple string to be displayed in the event log as the outcome.
            - \`"message": "The crew's morale has improved."\`

        2.  \`grant_resources\`: Gives or takes resources. Use negative amounts to remove.
            - \`"grant_resources": [{ "resource": "metal", "amount": 100 }, { "resource": "components", "amount": -10 }]\`
        
        3.  \`spawn_threats\`: Spawns a number of a specific alien type.
            - \`"spawn_threats": { "type": "swarmer", "count": 5 }\`
            
        4.  \`apply_global_bonus\`: Applies a temporary buff/debuff to the entire colony.
            - \`duration\` is in game ticks. \`type\` can be 'research_speed', 'resource_production', or 'power_production'.
            - \`"apply_global_bonus": { "type": "research_speed", "multiplier": 1.5, "duration": 20 }\`
        
        5.  \`modify_building_output\`: Temporarily buffs/debuffs a specific type of building.
            - \`duration\` is in game ticks. \`buildingType\` is the building's ID (e.g., 'solarPanel').
            - \`"modify_building_output": { "buildingType": "solarPanel", "multiplier": 0.25, "duration": 15 }\`

        6. \`create_poi\`: Creates a new, unique Point of Interest on the map.
           - \`poiId\`: A unique, snake_case identifier for this POI.
           - \`svgString\`: A valid SVG string for the icon. MUST include \`xmlns="http://www.w3.org/2000/svg"\` and \`viewBox="0 0 100 100"\`. Use simple shapes like \`<path>\`, \`<circle>\`, \`<rect>\`. You can use CSS classes 'is-pulsing' or 'is-spinning'.
           - \`interaction.job\`: The job type required (e.g., 'Investigating', 'Harvesting', 'Assault').
           - \`interaction.skill\`: The specialist skill required (e.g., 'Scientist', 'Biologist', 'Engineer').
           - \`reward\`: An effect object that is triggered upon completion.
           - \`"create_poi": { "poiId": "strange_artifact_1", "name": "Whispering Monolith", "desc": "A monolith emitting faint signals. A Scientist should investigate.", "svgString": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='40' y='10' width='20' height='80' fill='#a78bfa'/><circle cx='50' cy='50' r='10' fill='white' class='is-pulsing'/></svg>", "workRequired": 200, "interaction": {"job": "Investigating", "skill": "Scientist"}, "reward": { "message": "The monolith's secrets are ours!", "grant_resources": [{"resource": "research", "amount": 250}] } }\`

        7. \`grant_artifact\`: Creates and grants a unique artifact with a custom bonus.
           - \`id\`: A unique, snake_case identifier for the artifact.
           - \`bonus\`: An object where the key is the bonus type ('power', 'research', 'resources', 'passiveRepair') and the value is the multiplier or flat amount.
           - \`"grant_artifact": { "id": "geothermal_tap", "name": "Geothermal Tap", "desc": "Advanced heat-sink technology improves power output from all sources.", "bonus": { "power": 1.10 } }\`

        ---
        ### EXAMPLE OF A VALID DILEMMA ###
        \`\`\`json
        {
            "type": "dilemma",
            "title": "Anomalous Power Surge",
            "text": "Director, our sensors are picking up a massive energy surge from a geothermal vent. We can try to channel it into our fabricators for an overclock, but it's unstable and could cause a short-term power drain across the grid.",
            "choices": {
                "A": {
                    "text": "Overclock the Fabricators.",
                    "outcome_hint_positive": "Greatly increased component production for a short time.",
                    "outcome_hint_negative": "Significant loss of stored power.",
                    "effect": {
                        "modify_building_output": { "buildingType": "fabricator", "multiplier": 3.0, "duration": 10 },
                        "grant_resources": [{ "resource": "power", "amount": -100 }]
                    }
                },
                "B": {
                    "text": "Safely ground the energy.",
                    "outcome_hint_positive": "The grid remains stable.",
                    "outcome_hint_negative": "A potential opportunity is lost.",
                    "effect": {
                        "message": "The energy surge was safely dissipated. The grid is stable."
                    }
                }
            }
        }
        \`\`\`

        ---
        ### YOUR TASK ###
        Now, generate a single, valid, context-aware JSON object for the following game event and state. Adhere strictly to the structures and instructions provided.

        **Game Event & State:**
        ${JSON.stringify(gameEvent, null, 2)}
    `;

    const requestPayload = {
        model: getSelectedModel(),
        contents: prompt,
    };

    try {
        const response = await ai.models.generateContent(requestPayload);
        const responseText = response.text;
        
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
            console.error("Could not find a valid JSON object in the response.", responseText);
            return null;
        }
        const jsonString = responseText.substring(firstBrace, lastBrace + 1);
        
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse cleaned JSON string from API:", jsonString, e);
            return null;
        }
        
        if (isValidNarrative(parsedResponse)) {
            return parsedResponse;
        } else {
            console.error("Parsed JSON failed validation:", parsedResponse);
            return null; 
        }

    } catch (error) {
        console.error("Error getting Mission Control narrative:", error);
        return null;
    }
}
