import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { processChat, generateInitialMap, enrichNodeDetails } from './api/gemini-handler.js';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Path Resolution ---
const clientPath = path.join(__dirname, '..');
const rootJsPath = path.join(__dirname, '../../js');

console.log('[Server] Starting up...');
console.log('[Server] __dirname:', __dirname);
console.log('[Server] Resolved Client Path:', clientPath, fs.existsSync(clientPath) ? '(Exists)' : '(MISSING!)');
console.log('[Server] Resolved Root JS Path:', rootJsPath, fs.existsSync(rootJsPath) ? '(Exists)' : '(MISSING!)');

const app = express();
const port = process.env.PORT || 3000;

// 1. Request Logger (for debugging 404s)
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// 2. Static Files
// We serve the client folder at the root
app.use(express.static(clientPath));
// We also serve it at /KnowledgeMapper just in case
app.use('/KnowledgeMapper', express.static(clientPath));
// Shared JS folder
app.use('/js-shared', express.static(rootJsPath));

// Middleware Setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON request bodies

// --- API Routes ---

app.get('/api/debug-paths', (req, res) => {
    res.json({
        cwd: process.cwd(),
        __dirname,
        clientPath,
        rootJsPath,
        clientExists: fs.existsSync(clientPath),
        rootJsExists: fs.existsSync(rootJsPath),
        clientFiles: fs.existsSync(clientPath) ? fs.readdirSync(clientPath) : [],
        rootJsFiles: fs.existsSync(rootJsPath) ? fs.readdirSync(rootJsPath) : []
    });
});

app.post('/api/chat', async (req, res) => {
    try {
        const { history, nodeContext } = req.body;
        if (!history) return res.status(400).json({ error: 'Chat history is required.' });
        const response = await processChat(history, nodeContext);
        res.json(response);
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: 'An error occurred while processing the chat message.' });
    }
});

app.post('/api/generate-map', async (req, res) => {
    try {
        const { topic, type, shouldResearch } = req.body;
        if (!topic || !type) return res.status(400).json({ error: 'Topic and type are required.' });
        const graphData = await generateInitialMap(topic, type, shouldResearch);
        res.json(graphData);
    } catch (error) {
        console.error('Error in /api/generate-map:', error);
        res.status(500).json({ error: 'An error occurred while generating the map.' });
    }
});

app.post('/api/enrich-details', async (req, res) => {
    try {
        const { nodeLabel, parentLabel, rootLabel } = req.body;
        if (!nodeLabel) return res.status(400).json({ error: 'Node label is required.' });
        const details = await enrichNodeDetails(nodeLabel, parentLabel, rootLabel);
        res.json({ details });
    } catch (error) {
        console.error('Error in /api/enrich-details:', error);
        res.status(500).json({ error: 'An error occurred while enriching node details.' });
    }
});

// --- Catch-All Route ---
app.get('*', (req, res) => {
    // If it's a request for a file (has an extension) but reached here, it's a true 404
    if (path.extname(req.url)) {
        console.log(`[Server] 404 for file resource: ${req.url}`);
        return res.status(404).send('Resource not found');
    }
    
    console.log('[Server] Catch-all route serving index.html for:', req.url);
    const indexPath = path.join(clientPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`[Server] Running on http://localhost:${port}`);
    console.log(`[Server] Client files served from: ${clientPath}`);
});
