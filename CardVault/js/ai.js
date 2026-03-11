import { DB } from './db.js';

export const AI = {
    apiKey: null,
    modelName: 'gemini-1.5-flash',

    async init() {
        this.apiKey = await DB.getSetting('geminiApiKey');
        const model = await DB.getSetting('geminiModel');
        if (model) this.modelName = model;
    },

    async fetchAvailableModels() {
        if (!this.apiKey) return [];
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (!response.ok) throw new Error('Failed to fetch models');
            const data = await response.json();
            // Filter for models that support generating content (vision/text)
            return data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        } catch (e) {
            console.error("Error listing models:", e);
            return [];
        }
    },

    async identifyCard(base64Image) {
        if (!this.apiKey) {
            throw new Error('Gemini API Key is not set. Please set it in settings.');
        }

        const prompt = `
            Analyze this sports card image (could be baseball, basketball, football, soccer, hockey, etc.). 
            Identify the card and estimate its value.
            Return ONLY a valid JSON object with the following structure, no markdown formatting or extra text:
            {
                "player": "Full Name",
                "sport": "e.g., Baseball, Basketball, Football, Soccer, Hockey",
                "year": "YYYY",
                "brand": "e.g., Topps, Panini, Upper Deck",
                "set": "e.g., Base, Prizm, Chrome",
                "cardNumber": "Card number if visible",
                "team": "Team name",
                "estimatedCondition": "e.g., NM-MT 8, Mint 9",
                "estimatedValue": numeric value representing estimated market value in USD
            }
            If any information cannot be determined, use null for that field (or 0 for estimatedValue).
        `;

        // Strip the data URL prefix to get raw base64
        const base64Data = base64Image.split(',')[1];
        const mimeType = base64Image.split(';')[0].split(':')[1];

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const textResult = data.candidates[0].content.parts[0].text;
        
        try {
            // Remove markdown code blocks if the model accidentally includes them
            const jsonStr = textResult.replace(/```json\n|\n```/g, '').trim();
            const result = JSON.parse(jsonStr);
            return result;
        } catch (e) {
            console.error("Failed to parse AI response as JSON:", textResult, e);
            throw new Error('Invalid response format from AI');
        }
    }
};