---
name: rag-chat
description: Perform retrieval-augmented generation (RAG) by searching ingested documents and injecting relevant context before answering. Use when the user asks questions about previously uploaded documents.
metadata:
  category: featured
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/featured/rag-chat
---

# RAG Chat

This skill retrieves relevant document chunks from local memory and uses them to ground the model's responses. Works best after using `document-ingester` to process documents.

## Examples

* "What does the document say about climate change?"
* "Find the section about neural networks in my paper"
* "Answer based on my uploaded research: what are the main conclusions?"
* "Search my documents for information about pricing"

## Instructions

Call the `rag_chat` tool with the following parameters:
- `query`: String. **Required.** The user's question or search terms.
- `top_k`: Number. **Optional.** Number of chunks to retrieve (default: 5).

### Rules
- After receiving the retrieved chunks, use them as context to answer the user's question.
- Ground your response strictly in the retrieved content — do not add information not present in the chunks.
- If no relevant chunks are found, inform the user that the documents don't appear to contain relevant information.
- Always cite which document(s) the answer is based on.
- Suggest the user ingest more documents if the knowledge base appears empty.
