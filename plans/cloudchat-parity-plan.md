# CloudChat Feature Parity Implementation Plan

## Objective
Migrate all advanced functionalities from the monolithic `LocalChatExampleComprehensive.html` into the modernized, responsive architecture of `index.html`. This will result in a fully featured, visually polished, and highly capable local AI web application.

## Phase 1: Advanced Semantic Memory (RAG)
- [ ] **WASM Embedding Worker Integration:**
  - Port the `Xenova/all-MiniLM-L6-v2` transformers.js worker setup.
  - Implement the `embedTexts` queue and semantic chunking logic.
- [ ] **IndexedDB Vector Store (RAG DB):**
  - Ensure the `localmind_rag` IndexedDB schema is fully implemented (`chunks`, `profile`, `conversations`).
  - Implement full CRUD operations for memory chunks (`storeChunks`, `getAllChunks`, `deleteChunk`, `clearAllChunks`).
- [ ] **Semantic Search:**
  - Port the `cosineSimilarity` and `searchByVector` functions to enable contextual retrieval.

## Phase 2: Agentic Tools & Web Search Expansion
- [ ] **Tool Registry Expansion:**
  - Port the missing tools: `store_memory`, `search_memory`, `list_memories`, `delete_memory`, `set_reminder`.
- [ ] **Web Search Integration:**
  - Port the `SearchProviders` logic for Brave, Tavily, and SearXNG.
  - Wire up the UI settings for API keys and endpoint URLs.
  - Port the `web_search` and `fetch_page` tools, ensuring they utilize the `Readability.js` fallback parsing.
- [ ] **Tool Call Parsing:**
  - Ensure the agent's `<tool_call>` extraction logic matches the robust regex fallbacks from the comprehensive example.

## Phase 3: Document & Folder Ingestion
- [ ] **File Parsing Logic:**
  - Wire the existing file upload input to handle `.txt`, `.md`, `.json`, and `.csv`.
  - Connect `mammoth.js` for `.docx` extraction and `pdf.js` for `.pdf` text extraction.
- [ ] **Chunking & Summarization:**
  - Implement `chunkText` logic to prepare large documents for the embedding worker.
  - Add the auto-summarization prompt step upon document ingestion.
- [ ] **Folder Sync (FileSystem Access API):**
  - Implement the `dirHandle` logic to recursively read and incrementally sync local directories.

## Phase 4: Conversation History & Portability
- [ ] **Persistent Sessions:**
  - Replace the in-memory array with IndexedDB-backed conversation tracking.
  - Implement `saveConversation`, `getConversation`, and `getAllConversations`.
- [ ] **History UI Wiring:**
  - Connect the history sidebar panel to render saved sessions and allow resuming/deleting.
- [ ] **Data Export/Import:**
  - Wire the settings/memory panel buttons for full JSON export and import (`exportAllData`, `importData`).

## Phase 5: Encrypted Sharing
- [ ] **Cryptography Implementation:**
  - Port the Web Crypto API logic (PBKDF2 key derivation, AES-256-GCM encryption/decryption).
- [ ] **Share Link Generation:**
  - Add the UI modal to generate and copy encrypted URLs (base64 compressed state).
- [ ] **Link Hydration:**
  - Implement the boot-time check to detect shared links, prompt for passphrases, and hydrate the shared conversation into the UI.

## Phase 6: Batch Processing & UI Polish
- [ ] **Batch Prompts:**
  - Wire the batch panel logic to sequentially execute lines.
  - Implement the `{{previous}}` template substitution and auto-chaining.
- [ ] **Memory Audit Suite:**
  - Implement the "Audit Outliers" logic to detect duplicate chunks (high cosine similarity) and stale memories.
- [ ] **Help System & Polish:**
  - Migrate the comprehensive help popover (Things to Try, markdown prompts).