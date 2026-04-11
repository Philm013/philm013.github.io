---
name: document-ingester
description: Process and store the contents of uploaded documents (PDF, DOCX, TXT) into the local memory for later retrieval. Use when the user uploads a document and wants to ask questions about it.
metadata:
  category: featured
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/featured/document-ingester
---

# Document Ingester

This skill extracts text from uploaded documents and stores it in local memory, enabling later retrieval with the `search-memory` or `rag-chat` skills.

## Supported Formats
- **PDF** — extracted via PDF.js
- **DOCX** — extracted via Mammoth.js
- **TXT / MD / CSV** — read directly

## Examples

* Upload a PDF and ask: "Ingest this document so I can ask questions about it"
* "Process my research paper and store it"
* "Load this document into memory: [file]"
* "Read and index this file for RAG"

## Instructions

Call the `document_ingester` tool with the following parameters:
- `text`: String. **Required.** The full text content of the document (pre-extracted by the app before calling this skill).
- `source`: String. **Optional.** The name of the file or source label.
- `chunk_size`: Number. **Optional.** Target characters per chunk (default: 500).

### Rules
- Before calling this skill, extract the document text using the app's built-in file reader.
- Pass the full text content in the `content` field.
- After ingestion, confirm to the user how many chunks were stored and that they can now ask questions.
- Suggest using `search-memory` or `rag-chat` skills to query the ingested content.
