// ── Embedding, Vector Search & Document Processing ────────────
import { State } from './config.js';

// ── Embedding Worker ──────────────────────────────────────
export function createEmbeddingWorker() {
  const workerCode = `
    importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text/text_bundle.mjs');
    let embedder = null;
    self.onmessage = async (e) => {
      try {
        if (e.data.type === 'init') {
          const { TextEmbedder, FilesetResolver } = self;
          const fs = await FilesetResolver.forTextTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text/wasm');
          embedder = await TextEmbedder.createFromOptions(fs, {
            baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite' }
          });
          self.postMessage({ type: 'ready' });
        } else if (e.data.type === 'embed' && embedder) {
          const results = e.data.texts.map(t => {
            const r = embedder.embed(t);
            return r.embeddings[0].floatEmbedding;
          });
          self.postMessage({ type: 'result', id: e.data.id, embeddings: results });
        }
      } catch(err) { self.postMessage({ type: 'error', id: e.data.id, message: err.message }); }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

export function ensureEmbeddingWorker() {
  return new Promise((res) => {
    if (State.embeddingReady) { res(); return; }
    if (State.embeddingWorker) {
      const check = setInterval(() => { if (State.embeddingReady) { clearInterval(check); res(); } }, 100);
      return;
    }
    State.embeddingWorker = createEmbeddingWorker();
    State.embeddingWorker.onmessage = (e) => {
      if (e.data.type === 'ready') { State.embeddingReady = true; res(); }
    };
    State.embeddingWorker.postMessage({ type: 'init' });
  });
}

export function embedTexts(texts) {
  const job = State.embeddingQueue.then(async () => {
    await ensureEmbeddingWorker();
    return new Promise((res) => {
      const id = Math.random().toString(36).slice(2);
      const handler = (e) => {
        if (e.data.id !== id) return;
        State.embeddingWorker.removeEventListener('message', handler);
        res(e.data.embeddings || []);
      };
      State.embeddingWorker.addEventListener('message', handler);
      State.embeddingWorker.postMessage({ type: 'embed', id, texts });
    });
  });
  State.embeddingQueue = job.catch(() => {});
  return job;
}

// ── RAG Database (IndexedDB) ─────────────────────────────
const RAG_DB_NAME = 'CloudChat_RAG_v2';
const RAG_DB_VERSION = 2;

export function openRAGDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(RAG_DB_NAME, RAG_DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('chunks')) {
        const store = db.createObjectStore('chunks', { keyPath: 'id' });
        store.createIndex('source', 'source', { unique: false });
      }
      if(!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function storeChunks(chunks) {
  const db = await openRAGDB();
  const tx = db.transaction('chunks', 'readwrite');
  for(const c of chunks) tx.objectStore('chunks').put(c);
  return new Promise((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
}

export async function getAllChunks() {
  const db = await openRAGDB();
  const tx = db.transaction('chunks', 'readonly');
  const req = tx.objectStore('chunks').getAll();
  return new Promise(r => req.onsuccess = () => r(req.result));
}

export async function deleteChunk(id) {
  const db = await openRAGDB();
  const tx = db.transaction('chunks', 'readwrite');
  tx.objectStore('chunks').delete(id);
  return new Promise((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
}
window.deleteChunk = deleteChunk;

export function cosineSimilarity(a, b) {
  if(!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for(let i = 0; i < a.length; i++) { dot += a[i]*b[i]; magA += a[i]*a[i]; magB += b[i]*b[i]; }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

export function searchByVector(chunks, queryVec, topK = 3) {
  return chunks.map(c => ({ ...c, score: cosineSimilarity(queryVec, c.embedding) }))
    .sort((a, b) => b.score - a.score).slice(0, topK);
}

export function chunkText(text, chunkSize = 500) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks = []; let current = '';
  for (const s of sentences) {
    if ((current + s).length > chunkSize && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function embedAndStore(text, category = 'fact', source = 'user') {
  const parts = chunkText(text);
  const embeddings = await embedTexts(parts);
  const chunks = parts.map((t, i) => ({
    id: crypto.randomUUID(),
    text: t, embedding: embeddings[i],
    source, category, timestamp: Date.now()
  }));
  await storeChunks(chunks);
  return chunks.length;
}

export async function searchMemory(query, topK = 3) {
  const chunks = await getAllChunks();
  if (!chunks.length) return [];
  const [queryVec] = await embedTexts([query]);
  return searchByVector(chunks, queryVec, topK);
}

// ── Document Utils ──────────────────────────────────────
export function extractiveSummary(text, maxSentences = 3) {
  const sentences = text.match(/[^.!?\n]+[.!?]+/g) || [];
  if (sentences.length <= maxSentences) return text.slice(0, 300);
  const scored = sentences.map((s, i) => ({
    text: s.trim(),
    score: s.split(/\s+/).length * (1 - i / sentences.length * 0.3),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSentences).map(s => s.text).join(' ');
}

export async function extractPDFText(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  return pages.join('\n\n');
}

export async function extractDOCXText(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
