import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { processChat, generateInitialMap, enrichNodeDetails } from './api/gemini-handler.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware Setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON request bodies

// Serve static files from the client directory
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// --- API Routes ---

/**
 * @route   POST /api/chat
 * @desc    Handles chat messages, passing them to the AI agent for processing.
 * @access  Public
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { history, nodeContext } = req.body;
        if (!history) {
            return res.status(400).json({ error: 'Chat history is required.' });
        }
        const response = await processChat(history, nodeContext);
        res.json(response);
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: 'An error occurred while processing the chat message.' });
    }
});

/**
 * @route   POST /api/generate-map
 * @desc    Takes a topic and generates a complete mind map or flowchart structure.
 * @access  Public
 */
app.post('/api/generate-map', async (req, res) => {
    try {
        const { topic, type, shouldResearch } = req.body;
        if (!topic || !type) {
            return res.status(400).json({ error: 'Topic and type are required.' });
        }
        const graphData = await generateInitialMap(topic, type, shouldResearch);
        res.json(graphData);
    } catch (error) {
        console.error('Error in /api/generate-map:', error);
        res.status(500).json({ error: 'An error occurred while generating the map.' });
    }
});

/**
 * @route   POST /api/enrich-details
 * @desc    Fetches detailed, AI-researched content for a single node.
 * @access  Public
 */
app.post('/api/enrich-details', async (req, res) => {
    try {
        const { nodeLabel, parentLabel, rootLabel } = req.body;
        if (!nodeLabel) {
            return res.status(400).json({ error: 'Node label is required.' });
        }
        const details = await enrichNodeDetails(nodeLabel, parentLabel, rootLabel);
        res.json({ details });
    } catch (error) {
        console.error('Error in /api/enrich-details:', error);
        res.status(500).json({ error: 'An error occurred while enriching node details.' });
    }
});


// --- Catch-All Route ---
// Serves the index.html file for any request that doesn't match an API route or a static file.
// This is crucial for supporting client-side routing in a Single Page Application (SPA).
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Serving client files from: ${clientPath}`);
});