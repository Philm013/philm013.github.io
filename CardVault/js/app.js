import { DB } from './db.js';
import { AI } from './ai.js';
import { Capture } from './capture.js';
import { UI } from './ui.js';

export const App = {
    async init() {
        try {
            await DB.init();
            await AI.init();
            
            Capture.init('cameraVideo', 'captureCanvas');
            UI.init(this);
            
            // Initial View
            this.loadCollection();
            
            // Check if API key is set
            if (!AI.apiKey) {
                UI.showToast("Please configure your Gemini API Key in Settings.", "warning");
                UI.switchView('settingsView');
            }
        } catch (e) {
            console.error("Initialization failed", e);
            UI.showToast("Failed to initialize app.", "error");
        }
    },

    async loadCollection() {
        const cards = await DB.getAllCards();
        UI.renderCollection(cards);
        UI.renderDashboard(cards);
    },

    async saveSettings(apiKey, model) {
        await DB.saveSetting('geminiApiKey', apiKey);
        await DB.saveSetting('geminiModel', model);
        AI.apiKey = apiKey;
        if (model) AI.modelName = model;
        UI.showToast("Settings saved!", "success");
    },

    async processCapturedCards() {
        const crops = Capture.extractCrops();
        if (crops.length === 0) {
            UI.showToast("No cards selected. Please draw boxes around cards.", "warning");
            return;
        }

        UI.showLoading(`Processing ${crops.length} card(s)...`);
        
        for (const [index, cropBase64] of crops.entries()) {
            try {
                UI.showLoading(`AI Analyzing card ${index + 1} of ${crops.length}...`);
                const aiData = await AI.identifyCard(cropBase64);
                
                const cardInfo = {
                    id: 'card_' + Date.now() + '_' + index,
                    imageBlob: cropBase64,
                    player: aiData.player || 'Unknown Player',
                    sport: aiData.sport || 'Unknown Sport',
                    year: aiData.year || 'Unknown Year',
                    brand: aiData.brand || 'Unknown Brand',
                    set: aiData.set || 'Base',
                    cardNumber: aiData.cardNumber || '',
                    team: aiData.team || 'Unknown',
                    estimatedCondition: aiData.estimatedCondition || 'Raw',
                    estimatedValue: aiData.estimatedValue || 0,
                    dateAdded: new Date().toISOString(),
                    tags: []
                };

                await DB.addCard(cardInfo);
            } catch (e) {
                console.error("Failed to process card:", e);
                UI.showToast(`Error processing card ${index + 1}: ${e.message}`, "error");
            }
        }

        UI.hideLoading();
        UI.showToast("Processing complete!", "success");
        Capture.clearBoxes();
        this.loadCollection();
        UI.switchView('collectionView');
    },

    async deleteCard(id) {
        if(confirm("Are you sure you want to delete this card?")) {
            await DB.deleteCard(id);
            UI.showToast("Card deleted.", "success");
            this.loadCollection();
            UI.switchView('collectionView');
        }
    },

    async saveCardEdit(cardData) {
        await DB.updateCard(cardData);
        UI.showToast("Card updated!", "success");
        this.loadCollection();
        UI.switchView('collectionView');
    }
};

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});