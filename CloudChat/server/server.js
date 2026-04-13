// ── CloudChat Server ───────────────────────────────────────
// Node.js backend that serves the CloudChat frontend and
// optionally offloads Gemma 4 inference to a local backend
// using the Google AI (Gemini API) SDK.
//
// The server always starts for static-file serving (ONNX /
// WebGPU mode works without an API key).  The /api/chat
// endpoint is only available when GOOGLE_AI_API_KEY is set.
//
// Gemma 4 Model Card : https://ai.google.dev/gemma/docs/core/model_card_4
// Google AI SDK      : https://www.npmjs.com/package/@google/generative-ai
// ────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Process-level error handlers ────────────────────────────
// Log unexpected errors instead of crashing the process.
// This server is a lightweight static-file host with an optional API
// endpoint, so keeping it alive on transient errors (e.g. a broken
// socket during a large model-file 404) is preferable to an abrupt exit
// that kills the ONNX loader mid-download.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server will continue):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

// ── Config ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3000;
const API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const MODEL_NAME = process.env.GEMMA_MODEL || 'gemma-4-e2b-it';

// API key is optional — the server can still serve static files for
// ONNX / WebGPU mode.  Server-side inference (/api/chat) requires it.
let genAI = null;
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.warn(
    '\n⚠️  GOOGLE_AI_API_KEY is not set.\n' +
    '   The server will serve static files but /api/chat is disabled.\n' +
    '   Copy .env.template → .env and add your key to enable server inference.\n' +
    '   Get one at: https://aistudio.google.com/apikey\n'
  );
}

// ── Google AI Client ────────────────────────────────────────
function createModel(opts = {}) {
  if (!genAI) throw new Error('Google AI client is not initialised (missing API key)');
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    // Gemma 4 recommended sampling — see model card:
    // https://ai.google.dev/gemma/docs/core/model_card_4#best-practices
    generationConfig: {
      temperature: opts.temperature ?? 1.0,
      topP: opts.topP ?? 0.95,
      topK: opts.topK ?? 64,
      maxOutputTokens: opts.maxTokens ?? 8192,
    },
  });
}

// ── Express Setup ───────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Block access to the server directory (contains .env, server.js, etc.)
app.use('/server', (_req, res) => {
  res.status(403).end();
});

// Serve the CloudChat frontend from the parent directory
app.use(express.static(path.join(__dirname, '..'), {
  extensions: ['html'],
  index: 'index.html',
}));

// ── GET /api/status ─────────────────────────────────────────
// Health-check endpoint so the frontend can verify the server is up.
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    model: MODEL_NAME,
    serverInference: !!genAI,
    modelCard: 'https://ai.google.dev/gemma/docs/core/model_card_4',
  });
});

// ── POST /api/chat ──────────────────────────────────────────
// Streaming chat endpoint using Server-Sent Events (SSE).
//
// Request body:
//   { prompt: string, history?: [{role, parts}], temperature?, maxTokens? }
//
// The Gemma 4 prompt format uses:
//   - system role for instructions & tool declarations
//   - user / model roles for conversation turns
// See: https://ai.google.dev/gemma/docs/core/model_card_4
app.post('/api/chat', async (req, res) => {
  if (!genAI) {
    return res.status(503).json({
      error: 'Server inference is disabled — GOOGLE_AI_API_KEY is not configured.',
    });
  }

  const { prompt, history, temperature, maxTokens, topK, topP } = req.body;

  if (!prompt && (!history || !history.length)) {
    return res.status(400).json({ error: 'prompt or history is required' });
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const model = createModel({ temperature, maxTokens, topK, topP });

    // Build the chat session with conversation history.
    // The frontend sends the full prompt string (already formatted with
    // Gemma 4 turn markers).  We pass it as a single user message so the
    // Google AI SDK forwards it verbatim to the model.
    const chat = model.startChat({
      history: history || [],
    });

    const result = await chat.sendMessageStream(prompt);

    for await (const chunk of result.stream) {
      if (aborted) break;
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    if (!aborted) {
      res.write('data: [DONE]\n\n');
    }
  } catch (err) {
    console.error('Chat error:', err);
    if (!aborted) {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Server inference error' })}\n\n`);
      res.write('data: [DONE]\n\n');
    }
  } finally {
    res.end();
  }
});

// ── Express error handler ───────────────────────────────────
// Catch-all so middleware/route errors don't crash the process.
app.use((err, _req, res, _next) => {
  console.error('Express error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CloudChat server running at http://localhost:${PORT}`);
  console.log(`   Model  : ${MODEL_NAME}`);
  console.log(`   Inference : ${genAI ? 'enabled' : 'static-only (no API key)'}`);
  console.log(`   Docs   : https://ai.google.dev/gemma/docs/core/model_card_4\n`);
});
