// ── CloudChat Server ───────────────────────────────────────
// Node.js backend that offloads Gemma 4 inference from the browser
// to a local server using the Google AI (Gemini API) SDK.
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

// ── Config ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3000;
const API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const MODEL_NAME = process.env.GEMMA_MODEL || 'gemma-4-e2b-it';

if (!API_KEY) {
  console.error(
    '\n⚠️  GOOGLE_AI_API_KEY is not set.\n' +
    '   Copy .env.template → .env and add your API key.\n' +
    '   Get one at: https://aistudio.google.com/apikey\n'
  );
  process.exit(1);
}

// ── Google AI Client ────────────────────────────────────────
const genAI = new GoogleGenerativeAI(API_KEY);

function createModel(opts = {}) {
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

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CloudChat server running at http://localhost:${PORT}`);
  console.log(`   Model : ${MODEL_NAME}`);
  console.log(`   Docs  : https://ai.google.dev/gemma/docs/core/model_card_4\n`);
});
