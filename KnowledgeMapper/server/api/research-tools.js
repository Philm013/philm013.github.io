import { GoogleGenAI, Type } from "@google/genai";
import { HfInferenceEndpoint } from '@huggingface/inference';

// This file is intended to be run on the server, so it can use process.env
// REVISED: Using documented object-based configuration for consistency.
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const hfClient = process.env.HUGGING_FACE_API_TOKEN ? new HfInferenceEndpoint(process.env.HUGGING_FACE_API_TOKEN) : null;

/**
 * A simple queue-based throttler to prevent exceeding free-tier API rate limits for external services.
 */
export const apiThrottler = {
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

/**
 * An exported object containing all the tool definitions. Each tool has a `declaration` (the schema that Gemini sees) and an `execute` function (the actual implementation).
 */
export const dataGatheringTools = {
    google_search: {
        declaration: { name: 'google_search', description: 'Use for questions about recent events, current information, or when other tools are not suitable.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The user\'s original question to be searched on Google.' } }, required: ['query'] } },
        execute: async ({ query }) => {
            // REVISED: Using the new `ai.models.generateContent` API with a `config` object for tools.
            const response = await apiThrottler.enqueue(() => genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [{ role: 'user', parts: [{ text: query }] }],
                config: {
                    tools: [{ googleSearch: {} }]
                }
            }));
            // REVISED: Accessing text and metadata directly from the response.
            const text = response.text;
            const suggestionsHtml = response.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent;
            return { isGroundedResponse: true, text: text, suggestionsHtml: suggestionsHtml };
        }
    },
    get_location_details: {
        declaration: { name: 'get_location_details', description: 'Gets a Wikipedia summary and map coordinates for a specific location, landmark, or address.', parameters: { type: Type.OBJECT, properties: { location_name: { type: Type.STRING, description: 'The name of the place, e.g., "The Louvre".' } }, required: ['location_name'] } },
        execute: async ({ location_name }) => { const [locationResult, wikiResult] = await Promise.all([ dataGatheringTools.search_map_location.execute({ query: location_name }), dataGatheringTools.search_wikipedia.execute({ query: location_name }) ]); if (locationResult.error || wikiResult.error) { return { error: locationResult.error || wikiResult.error }; } return { locationData: locationResult.results[0], wikipediaData: wikiResult.results[0] }; }
    },
    get_computational_answer: {
        declaration: { name: 'get_computational_answer', description: 'Answers factual questions and performs calculations.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The query to compute, e.g., "derivative of x^2".' } }, required: ['query'] } },
        execute: async ({ query }) => { const k=process.env.WOLFRAM_ALPHA_APP_ID; if (!k) throw new Error("WolframAlpha AppID not set."); const r = await fetch(`https://api.wolframalpha.com/v1/result?i=${encodeURIComponent(query)}&appid=${k}`); if (!r.ok) return { error: 'WolframAlpha API error.'}; return { answer: await r.text() }; }
    },
    define_word: {
        declaration: { name: 'define_word', description: "Provides the definition of a word.", parameters: { type: Type.OBJECT, properties: { word: { type: Type.STRING, description: 'The word to define.' } }, required: ['word'] } },
        execute: async ({ word }) => { const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`); if (!r.ok) return { error: `Could not define "${word}".` }; const d = await r.json(); return { word: d[0].word, phonetic: d[0].phonetic, definition: d[0].meanings[0].definitions[0].definition, partOfSpeech: d[0].meanings[0].partOfSpeech }; }
    },
    get_stock_quote: {
        declaration: { name: 'get_stock_quote', description: "Gets the latest stock price for a symbol.", parameters: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING, description: 'The stock ticker symbol, e.g., "AAPL".' } }, required: ['symbol'] } },
        execute: async ({ symbol }) => { const k=process.env.FINNHUB_API_KEY; if (!k) throw new Error("Finnhub API Key not set."); const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${k}`); if (!r.ok) return { error: `Could not get data for ${symbol}.`}; const d = await r.json(); return d.c ? { symbol: symbol.toUpperCase(), price: d.c, change: d.d, percent_change: d.dp } : { error: `Invalid symbol: ${symbol}.`}; }
    },
    find_recipe: {
        declaration: { name: 'find_recipe', description: "Finds a recipe for a dish.", parameters: { type: Type.OBJECT, properties: { dish_name: { type: Type.STRING, description: 'The name of the dish.' } }, required: ['dish_name'] } },
        execute: async ({ dish_name }) => { const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(dish_name)}`); const d = await r.json(); if (!d.meals) return { error: `Could not find recipe for "${dish_name}".` }; return { name: d.meals[0].strMeal, instructions: d.meals[0].strInstructions, thumbnail: d.meals[0].strMealThumb, url: d.meals[0].strSource }; }
    },
    search_map_location: {
        declaration: { name: 'search_map_location', description: "Finds geographic coordinates of a place.", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The place to find.' } }, required: ['query'] } },
        execute: async ({ query }) => { const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`); if (!r.ok) return { error: `Could not find "${query}".`}; const d = await r.json(); return d.length > 0 ? { results: [{ name: d[0].display_name, lat: d[0].lat, lon: d[0].lon }] } : { error: `Could not find "${query}".`}; }
    },
    get_latest_news: {
        declaration: { name: 'get_latest_news', description: "Fetches recent news headlines.", parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING, description: 'Optional topic to search for.' } } } },
        execute: async ({ topic }) => { const k=process.env.NEWS_API_KEY; if (!k) throw new Error("NewsAPI Key not set."); const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${k}` + (topic ? `&q=${encodeURIComponent(topic)}` : ''); const r = await fetch(url); if (!r.ok) return { error: 'Could not fetch news.'}; const d = await r.json(); return { articles: d.articles.slice(0, 3).map(a => ({ title: a.title, source: a.source.name, url: a.url })) }; }
    },
    search_semantic_scholar: {
        declaration: { name: 'search_semantic_scholar', description: 'Searches for academic papers.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: "The topic." } }, required: ['query'] } },
        execute: async ({ query }) => { const r = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=3&fields=title,authors,year,url,abstract`); const d = await r.json(); return (!d.data || d.data.length === 0) ? { result: `No papers found.` } : { papers: d.data }; }
    },
    search_wikipedia: {
        declaration: { name: 'search_wikipedia', description: 'Retrieves a summary from Wikipedia.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The topic.' } }, required: ['query'] } },
        execute: async ({ query }) => { const sR = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&origin=*`); const sD = await sR.json(); if (!sD.query.search.length) return { result: `Article not found.` }; const pT = sD.query.search[0].title; const pR = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pT)}&origin=*`); const pD = await pR.json(); const pId = Object.keys(pD.query.pages)[0]; return { title: pT, summary: pD.query.pages[pId].extract, url: `https://en.wikipedia.org/wiki/${pT.replace(/ /g, '_')}` }; }
    },
    search_stackoverflow: {
        declaration: { name: 'search_stackoverflow', description: 'Searches Stack Overflow for programming problems.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING, description: 'The question.' } }, required: ['query'] } },
        execute: async ({ query }) => { const r = await fetch(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow`); const d = await r.json(); return (!d.items || d.items.length === 0) ? { result: `No relevant questions found.` } : { questions: d.items.slice(0, 3).map(i => ({ title: i.title, url: i.link })) }; }
    },
     generate_text_hf: {
        declaration: { name: 'generate_text_hf', description: 'Generates text using a specified model from the Hugging Face Hub.', parameters: { type: Type.OBJECT, properties: { model: { type: Type.STRING, description: 'The Hugging Face model ID, e.g., "meta-llama/Llama-3.1-8B-Instruct".' }, prompt: { type: Type.STRING, description: 'The text prompt to generate from.' } }, required: ['model', 'prompt'] } },
        execute: async ({ model, prompt }) => { if (!hfClient) throw new Error("Hugging Face API Token not set."); const result = await hfClient.textGeneration({ model, inputs: prompt }); return { model, generated_text: result.generated_text }; }
    },
};