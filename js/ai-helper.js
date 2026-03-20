/**
 * ai-helper.js
 * Centralized Gemini AI Integration for PhilM013 Monorepo.
 * Features:
 * - Multi-key rotation with 10-minute cooldown.
 * - Dynamic model listing from the API.
 * - Support for both SDK and direct REST calls.
 * - Consistent error handling and logging.
 */

const AI_HELPER_CONFIG = {
    COOLDOWN_MS: 10 * 60 * 1000, // 10 minutes
    LOCAL_STORAGE_KEYS: 'gemini_api_keys', // Expected to be an array of strings
    COOLDOWN_STATE_KEY: 'gemini_keys_cooldown',
    DEFAULT_MODEL: 'gemini-2.0-flash'
};

/**
 * Retrieves all configured Gemini API keys.
 * Checks multiple possible storage locations used across projects.
 */
export function getGeminiKeys() {
    let keys = [];
    
    // Check for the new centralized array
    const centralKeys = localStorage.getItem(AI_HELPER_CONFIG.LOCAL_STORAGE_KEYS);
    if (centralKeys) {
        try {
            const parsed = JSON.parse(centralKeys);
            if (Array.isArray(parsed)) keys = [...parsed];
        } catch (e) {
            console.warn("Failed to parse centralized gemini_api_keys", e);
        }
    }

    // Individual keys from various apps for backward compatibility/migration
    const legacyKeys = [
        localStorage.getItem('gemini_key'), // KnowledgeMapper
        localStorage.getItem('gemini_api_key'), // AI-Editor, StudioPro
        sessionStorage.getItem('geminiFlipbookApiKey'), // FlipbookAI
        localStorage.getItem('complexCodeEditor_gemini_api_key') // AI-Editor namespace
    ];

    legacyKeys.forEach(k => {
        if (k && k.trim() && !keys.includes(k.trim())) {
            keys.push(k.trim());
        }
    });

    return keys.filter(k => k && k.length > 5); // Filter out empty or obviously invalid keys
}

/**
 * Gets the current cooldown state for all keys.
 */
function getCooldowns() {
    const data = localStorage.getItem(AI_HELPER_CONFIG.COOLDOWN_STATE_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

/**
 * Marks a key as being on cooldown.
 */
export function markKeyOnCooldown(apiKey) {
    const cooldowns = getCooldowns();
    cooldowns[apiKey] = Date.now();
    localStorage.setItem(AI_HELPER_CONFIG.COOLDOWN_STATE_KEY, JSON.stringify(cooldowns));
    console.log(`[AI Helper] Key ${apiKey.substring(0, 8)}... put on 10min cooldown.`);
}

/**
 * Removes a key from cooldown.
 */
export function removeCooldown(apiKey) {
    const cooldowns = getCooldowns();
    if (cooldowns[apiKey]) {
        delete cooldowns[apiKey];
        localStorage.setItem(AI_HELPER_CONFIG.COOLDOWN_STATE_KEY, JSON.stringify(cooldowns));
        console.log(`[AI Helper] Cooldown removed for key ${apiKey.substring(0, 8)}...`);
    }
}

/**
 * Checks if a specific key is currently on cooldown.
 * @param {string} apiKey - The API key to check.
 * @returns {boolean}
 */
export function isKeyOnCooldown(apiKey) {
    const cooldowns = getCooldowns();
    const lastUsed = cooldowns[apiKey] || 0;
    return (Date.now() - lastUsed) < AI_HELPER_CONFIG.COOLDOWN_MS;
}

/**
 * Returns the first available (not on cooldown) API key.
 * Rotates through keys to distribute load.
 * @param {boolean} includeCooldownIfNecessary - If true and all keys are on cooldown, returns the one closest to expiry.
 */
export function getAvailableKey(includeCooldownIfNecessary = false) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    const cooldowns = getCooldowns();
    const now = Date.now();

    // Filter out keys on cooldown
    const availableKeys = keys.filter(k => {
        const lastUsed = cooldowns[k] || 0;
        return (now - lastUsed) > AI_HELPER_CONFIG.COOLDOWN_MS;
    });

    if (availableKeys.length > 0) {
        // Simple rotation: pick a random one from available to distribute load
        return availableKeys[Math.floor(Math.random() * availableKeys.length)];
    }

    if (includeCooldownIfNecessary) {
        console.warn("[AI Helper] All API keys are on cooldown. Selecting the one closest to expiry.");
        // Find key with oldest cooldown timestamp
        return keys.reduce((oldest, current) => {
            const oldestTime = cooldowns[oldest] || 0;
            const currentTime = cooldowns[current] || 0;
            return currentTime < oldestTime ? current : oldest;
        });
    }

    console.warn("[AI Helper] All API keys are currently on cooldown.");
    return null;
}

/**
 * Dynamically lists available models for a given API key.
 */
export async function listModels(apiKey) {
    if (!apiKey) {
        apiKey = getAvailableKey();
    }
    if (!apiKey) return [];

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            if (response.status === 429) markKeyOnCooldown(apiKey);
            return [];
        }
        const data = await response.json();
        // Filter for models that support content generation
        return data.models ? data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')) : [];
    } catch (e) {
        console.error("[AI Helper] Failed to list models:", e);
        return [];
    }
}

/**
 * Centralized call function that handles key rotation and cooldown.
 * @param {string} action - Descriptive action name for logging.
 * @param {object} payload - The request body for the Gemini API.
 * @param {string} model - Optional model override.
 * @param {string} version - API version (default v1beta).
 */
export async function callGeminiDirect(action, payload, model = null, version = 'v1beta') {
    const apiKey = getAvailableKey();
    if (!apiKey) {
        throw new Error("No available Gemini API keys. All keys may be on cooldown (10 min) or none are configured.");
    }

    const targetModel = model || AI_HELPER_CONFIG.DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/${version}/models/${targetModel}:generateContent?key=${apiKey}`;

    console.log(`[AI Helper] Calling Gemini [${action}] with model ${targetModel}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || response.statusText;
            
            if (response.status === 429 || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
                markKeyOnCooldown(apiKey);
                // Recursive retry with a different key if available
                console.log("[AI Helper] Rate limited. Retrying with another key...");
                return callGeminiDirect(action, payload, model, version);
            }
            
            throw new Error(`Gemini API Error (${response.status}): ${errorMsg}`);
        }

        return await response.json();
    } catch (e) {
        console.error(`[AI Helper] Action "${action}" failed:`, e);
        throw e;
    }
}

/**
 * Populates a <select> element with available models.
 * @param {HTMLElement} selectElement - The select element to populate.
 * @param {string} defaultModel - The model to select by default.
 */
export async function populateModelSelector(selectElement, defaultModel = null) {
    if (!selectElement) return;

    const keys = getGeminiKeys();
    if (keys.length === 0) {
        selectElement.innerHTML = '<option value="">No API Keys Set</option>';
        return;
    }

    const models = await listModels(keys[0]); // Use first key to get the list
    if (models.length === 0) {
        // If first key failed, try getAvailableKey
        const altKey = getAvailableKey();
        if (altKey && altKey !== keys[0]) {
            const altModels = await listModels(altKey);
            if (altModels.length > 0) return populateModelSelector(selectElement, defaultModel);
        }
        selectElement.innerHTML = '<option value="">Failed to load models</option>';
        return;
    }

    const currentValue = selectElement.value || defaultModel || AI_HELPER_CONFIG.DEFAULT_MODEL;
    selectElement.innerHTML = '';

    models.forEach(m => {
        const modelId = m.name.replace('models/', '');
        const opt = document.createElement('option');
        opt.value = modelId;
        opt.textContent = m.displayName || modelId;
        selectElement.appendChild(opt);
    });

    // Restore previous selection or set default
    if (currentValue && [...selectElement.options].some(o => o.value === currentValue)) {
        selectElement.value = currentValue;
    } else if ([...selectElement.options].some(o => o.value === AI_HELPER_CONFIG.DEFAULT_MODEL)) {
        selectElement.value = AI_HELPER_CONFIG.DEFAULT_MODEL;
    }
}
