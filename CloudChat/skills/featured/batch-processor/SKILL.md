---
name: batch-processor
description: Execute a series of prompts sequentially, where each prompt can reference the previous result using {{previous}}. Use for multi-step workflows, pipelines, data transformations, or iterative refinement tasks.
metadata:
  category: featured
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/featured/batch-processor
---

# Batch Processor

This skill processes a list of prompts sequentially. Each step can incorporate the result from the previous step using the `{{previous}}` placeholder, enabling powerful chaining and refinement workflows.

## Examples

* "Run these steps in sequence: 1) Generate a story outline 2) Expand it into a full story 3) Summarize it into one paragraph"
* "First translate this text to French, then summarize it, then make it formal"
* "Batch process: draft → review → polish"

## Template Substitution

Use `{{previous}}` in any prompt to insert the output of the preceding step:

```
Step 1: "Write a haiku about autumn"
Step 2: "Now translate this haiku to Spanish: {{previous}}"
Step 3: "Explain the translation in one sentence: {{previous}}"
```

## Instructions

Call the `batch_processor` tool with the following parameter:
- `prompts`: Array of Strings. **Required.** The ordered list of prompts to process. Each may contain `{{previous}}`.

### Rules
- Process each prompt in order, substituting `{{previous}}` with the prior step's result.
- Return all step results so the user can see the full pipeline output.
- If a prompt fails or produces an empty result, note it and continue with the next step.
- Present the final output prominently, with intermediate steps available for review.
