// ── Configuration, Models & Shared State ──────────────────────
export const REMOTE_MODEL = 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task';
export const LOCAL_MODEL = './gemma-4-E2B-it-web.task';

// Server-mode API base — when running via the Node server, inference is
// offloaded to the backend.  See: CloudChat/server/server.js
// Gemma 4 Model Card: https://ai.google.dev/gemma/docs/core/model_card_4
export const SERVER_API = '/api';

export const MODELS = {
  'gemma4-e2b': {
    id: REMOTE_MODEL,
    label: 'Gemma 4 E2B',
    size: '~1.5 GB',
    type: 'mediapipe',
    agentCapable: true,
    contextSize: 8192,
    genConfig: { temperature: 0.7, top_k: 40, top_p: 0.95, max_new_tokens: 2048, repetition_penalty: 1.1 },
  },
};
window.MODELS = MODELS;

export const State = {
  inference: null,
  history: [],
  isGenerating: false,
  stopRequested: false,
  batchStopRequested: false,
  activeModel: REMOTE_MODEL,
  modelReady: false,
  serverMode: false,       // true when inference is offloaded to the Node server
  serverModel: '',         // model name reported by the server
  embeddingWorker: null,
  embeddingReady: false,
  embeddingQueue: Promise.resolve(),
  activeConversationId: null,
  dirHandle: null,
  webEnrichedMode: false,
  showThinking: true,
  memoryCategory: 'all'
};
window.State = State;

export function getSettingsValues() {
  return {
    temperature: parseFloat(document.getElementById('temperature-slider').value) || 0.7,
    maxTokens: parseInt(document.getElementById('max-tokens-select').value, 10) || 8192,
    historyBudget: parseInt(document.getElementById('history-budget').value, 10) || 12000,
    maxToolIters: parseInt(document.getElementById('max-tool-iters').value, 10) || 3,
  };
}
