# Gemini API with REST: A Comprehensive Guide

This guide provides a comprehensive overview of how to interact with the Google Gemini API using its REST interface with `curl` examples. You'll learn how to list models, generate text, use embeddings, prompt with various modalities like images, audio, and video, utilize function calling, JSON mode, system instructions, caching, search grounding, and manage safety settings.

## Authentication

To use the Gemini API, you need an API key.
1.  Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  For the `curl` examples in this guide, it's assumed you have set your API key as an environment variable:
    ```bash
    export GOOGLE_API_KEY="YOUR_API_KEY"
    ```
    Replace `YOUR_API_KEY` with your actual key.

**Important Security Note for File API:** The File API (used for uploading audio/video) uses API keys that grant access to uploaded data associated with your project. Secure your API key carefully.

## 1. Models

You can list available models and get details about specific models.

### List Models
To see all models available through the API:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}"
```
This will return a JSON list of models, including their names, versions, display names, supported generation methods, and input/output token limits.

### Get Model Information
To get detailed information about a specific model, like `gemini-2.0-flash`:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${GOOGLE_API_KEY}"
```
This returns detailed metadata for the specified model.

## 2. Prompting and Content Generation

The core of the Gemini API is generating content based on prompts.

### Basic Text Prompting
Use the `generateContent` method to get responses.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [{
        "parts":[{"text": "Write a story about a magic backpack."}]
      }]
    }'
```
The response will be a JSON object containing the generated text in `candidates[0].content.parts[0].text`.

### Multi-turn Chat
For conversational interactions, provide a history of user and model turns:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [
        {"role":"user",
         "parts":[{"text": "What is the capital of France?"}]},
        {"role": "model",
         "parts":[{"text": "The capital of France is Paris."}]},
        {"role": "user",
         "parts":[{"text": "What is it famous for?"}]}
      ]
    }'
```

### Prompting with Images (Inline Data)
You can include images directly in your prompt by base64 encoding them.
First, ensure you have an image (e.g., `image.jpg`). Then, create a `request.json` file (or include directly in `-d`):

```bash
# In Colab/Linux:
IMAGE_B64=$(base64 -w0 image.jpg)
# On macOS:
# IMAGE_B64=$(base64 -i image.jpg)

# Then, make the request:
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents":[{
        "parts":[
          {"text": "Describe this image."},
          {"inline_data": {
            "mime_type":"image/jpeg",
            "data": "'"${IMAGE_B64}"'"
          }}
        ]
      }]
    }'
```

### Streaming Responses
For faster interactions, stream responses instead of waiting for the full generation. Add `alt=sse` to the URL.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    --no-buffer \
    -d '{
      "contents":[{
        "parts":[{"text": "Tell me a long story about a brave knight."}]
      }]
    }'
```
The output will be a series of Server-Sent Events (SSE), where each `data:` line contains a JSON `GenerateContentResponse` object with a chunk of the text.

### Generation Configuration
Control model output with `generationConfig` and `safetySettings`.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
        "contents": [{
            "parts":[
                {"text": "Give me a numbered list of 5 interesting facts about space."}
            ]
        }],
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_ONLY_HIGH"
            }
        ],
        "generationConfig": {
            "stopSequences": [
                "Title"
            ],
            "temperature": 0.9,
            "maxOutputTokens": 200,
            "topP": 0.95,
            "topK": 40
        }
    }'
```

## 3. Embeddings

Generate numerical representations (embeddings) of text for tasks like semantic search or classification. The primary model for this is `text-embedding-004`.

### Embed Single Content
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "model": "models/text-embedding-004",
      "content": {
        "parts":[{"text": "Hello world"}]
      }
    }'
```
The response contains the embedding vector under `embedding.values`.

### Batch Embed Content
Embed multiple pieces of text in one call.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "requests": [
        {
          "model": "models/text-embedding-004",
          "content": {"parts":[{"text": "What is the meaning of life?"}]}
        },
        {
          "model": "models/text-embedding-004",
          "content": {"parts":[{"text": "How much wood would a woodchuck chuck?"}]}
        }
      ]
    }'
```
The response will contain a list of embeddings under `embeddings`.

### Output Dimensionality (for `text-embedding-004`)
If using `text-embedding-004`, you can reduce the size of the output embedding vector.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "model": "models/text-embedding-004",
      "output_dimensionality": 256,
      "content": {
        "parts":[{"text": "Hello world"}]
      }
    }'
```

### Task Type
Provide a hint to the model on how embeddings will be used. This can improve embedding quality for specific tasks.
```bash
# Using text-embedding-004 (recommended for new applications)
curl "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "model": "models/text-embedding-004",
      "content": {
        "parts":[{"text": "This is a document about space exploration."}]
      },
      "task_type": "RETRIEVAL_DOCUMENT",
      "title": "Space Exploration History"
    }'

# Example with older embedding-001 model (shown in one notebook, but prefer text-embedding-004)
# curl "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GOOGLE_API_KEY}" \
# -H 'Content-Type: application/json' \
# -d '{
#   "model": "models/embedding-001",
#   "content": {
#     "parts":[{"text": "This is a document about space exploration."}]
#   },
#   "task_type": "RETRIEVAL_DOCUMENT",
#   "title": "Space Exploration History"
# }'
```
Supported `task_type` values include: `TASK_TYPE_UNSPECIFIED`, `RETRIEVAL_QUERY`, `RETRIEVAL_DOCUMENT`, `SEMANTIC_SIMILARITY`, `CLASSIFICATION`, `CLUSTERING`. The `title` parameter is only valid when `task_type` is `RETRIEVAL_DOCUMENT`.

## 4. Prompting with Audio and Video (File API)

For larger media files like audio and video, use the File API to upload them first, then reference them in your prompts. Files are stored for 2 days.

### File Upload Process (General)

This process is similar for audio and video. Replace placeholders like `YOUR_FILE_PATH` and `YOUR_MIME_TYPE`.

1.  **Get File Metadata:**
    ```bash
    FILE_PATH="./sample.mp4" # Or ./sample.mp3
    MIME_TYPE=$(file -b --mime-type "${FILE_PATH}")
    NUM_BYTES=$(wc -c < "${FILE_PATH}")
    DISPLAY_NAME="My Sample File"
    ```

2.  **Start Resumable Upload:**
    This request tells the API you want to upload a file and gets an upload URL.
    ```bash
    # Store headers to extract upload URL
    curl "https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GOOGLE_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2>/dev/null

    # Extract upload_url (example for bash)
    UPLOAD_URL=$(grep -i "x-goog-upload-url: " upload-header.tmp | cut -d" " -f2 | tr -d "\r")
    rm upload-header.tmp # Clean up
    ```

3.  **Upload File Bytes:**
    Send the actual file data to the `UPLOAD_URL`.
    ```bash
    # Store response in file_info.json
    curl "${UPLOAD_URL}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${FILE_PATH}" > file_info.json 2>/dev/null

    # Extract file URI
    FILE_URI=$(jq -r ".file.uri" file_info.json)
    echo "Uploaded file URI: ${FILE_URI}"
    ```

4.  **Wait for Processing:**
    Files (especially video/audio) need processing. Check the file's `state` until it's `ACTIVE`.
    ```bash
    STATE=$(jq -r ".file.state" file_info.json)
    while [[ "${STATE}" == "PROCESSING" ]]; do
      echo "Processing file..."
      sleep 5
      curl "${FILE_URI}?key=${GOOGLE_API_KEY}" > file_info.json 2>/dev/null
      STATE=$(jq -r ".state" file_info.json)
    done
    echo "File is now ${STATE}."
    ```

### Prompting with Uploaded Audio/Video
Once the file is `ACTIVE`, use its `file_uri` in a `generateContent` request.
```bash
# Assuming FILE_URI and MIME_TYPE are set from previous steps
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [{
        "parts":[
          {"text": "Describe this media file."},
          {"file_data": {
            "mime_type": "'"${MIME_TYPE}"'",
            "file_uri": "'"${FILE_URI}"'"
          }}
        ]
      }]
    }'
```

### Prompting with Inline Audio (for small files < 20MB)
For smaller audio files, you can send them directly (base64 encoded) without the File API.
```bash
# AUDIO_FILE_PATH="./sample_30s.mp3"
# AUDIO_MIME_TYPE="audio/mpeg"
# In Colab/Linux:
# AUDIO_B64=$(base64 -w0 ${AUDIO_FILE_PATH})
# On macOS:
# AUDIO_B64=$(base64 -i ${AUDIO_FILE_PATH})

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [{
        "parts":[
          {"text": "Summarize this audio clip."},
          {"inline_data": {
            "mime_type": "'"${AUDIO_MIME_TYPE}"'",
            "data": "'"${AUDIO_B64}"'"
          }}
        ]
      }]
    }'
```

### Deleting Files from File API
Files are automatically deleted after 48 hours. To delete them sooner:
```bash
# First, list files to get their names (e.g., "files/xxxx")
curl "https://generativelanguage.googleapis.com/v1beta/files?key=${GOOGLE_API_KEY}"

# Then, for each FILE_NAME you want to delete:
# FILE_NAME="files/your_file_id"
curl -X DELETE "https://generativelanguage.googleapis.com/v1beta/${FILE_NAME}?key=${GOOGLE_API_KEY}"
```

## 5. Function Calling

Allow the model to call external functions you define.

### How Function Calling Works
1.  Define `function_declarations` within the `tools` parameter of your request. Each declaration includes:
    *   `name`: The function name.
    *   `description`: What the function does.
    *   `parameters`: An OpenAPI compatible schema describing the function's arguments.
2.  The model, when appropriate, will return a `functionCall` object with the `name` of the function to call and the `args` (arguments) it derived from the prompt.
3.  Your code then executes this function and sends the result back to the model in a subsequent turn using a `functionResponse` part.

### Single-Turn Function Call
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": {
      "role": "user",
      "parts": {
        "text": "Which theaters in Mountain View show the Barbie movie?"
      }
    },
    "tools": [
      {
        "function_declarations": [
          {
            "name": "find_theaters",
            "description": "Find theaters based on location and optionally movie title.",
            "parameters": {
              "type": "object",
              "properties": {
                "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA"
                },
                "movie": {
                  "type": "string",
                  "description": "Any movie title"
                }
              },
              "required": ["location"]
            }
          }
        ]
      }
    ]
  }'
```
Response might include:
```json
// ...
"candidates": [{
  "content": {
    "parts": [{
      "functionCall": {
        "name": "find_theaters",
        "args": { "movie": "Barbie", "location": "Mountain View, CA" }
      }
    }], "role": "model"
  } // ...
}]
// ...
```

### Multi-Turn Function Call (with Function Response)
After executing the function from the previous step (e.g., `find_theaters("Barbie", "Mountain View, CA")` which returns a list of theaters), send its output back:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [
      { # Original user prompt
        "role": "user",
        "parts": [{"text": "Which theaters in Mountain View show the Barbie movie?"}]
      },
      { # Model's previous functionCall
        "role": "model",
        "parts": [{
          "functionCall": {
            "name": "find_theaters",
            "args": {"location": "Mountain View, CA", "movie": "Barbie"}
          }
        }]
      },
      { # Your function's result
        "role": "function",
        "parts": [{
          "functionResponse": {
            "name": "find_theaters",
            "response": {
              "name": "find_theaters",
              "content": {
                "movie": "Barbie",
                "theaters": [
                  {"name": "AMC Mountain View 16", "address": "..."},
                  {"name": "Regal Edwards 14", "address": "..."}
                ]
              }
            }
          }
        }]
      }
    ],
    "tools": [ # Re-send tools
      {
        "function_declarations": [
          {
            "name": "find_theaters",
            "description": "Find theaters...",
            "parameters": { /* ... same as before ... */ }
          }
          // ... other functions ...
        ]
      }
    ]
  }'
```
The model will then use this information to generate a final text response or another function call.

### Function Calling Configuration (`tool_config`)
Control how the model uses functions with `tool_config`.

*   **`NONE` mode:** Model will not call any functions, even if provided.
    ```bash
    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d '{
        "contents": {"role": "user", "parts": {"text": "Turn on the lights."}},
        "tools": [{"function_declarations": [{ "name": "enable_lights", "description": "Turn on lights.", "parameters": {"type":"object"}}]}],
        "tool_config": {
          "function_calling_config": {"mode": "none"}
        }
      }'
    ```
    (Response will be text, not a function call)

*   **`AUTO` mode:** Model decides whether to call a function or respond with text (default if tools are provided).
    ```bash
    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d '{
        "contents": {"role": "user", "parts": {"text": "Turn on the lights."}},
        "tools": [{"function_declarations": [{ "name": "enable_lights", "description": "Turn on lights.", "parameters": {"type":"object"}}]}],
        "tool_config": {
          "function_calling_config": {"mode": "auto"}
        }
      }'
    ```
    (Model might call `enable_lights`)

*   **`ANY` mode:** Model is forced to call a function. Use `allowed_function_names` to restrict choices.
    ```bash
    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d '{
        "contents": {"role": "user", "parts": {"text": "Make the room purple."}},
        "tools": [{
          "function_declarations": [
            { "name": "set_light_color", "description": "Set light color.", "parameters": {"properties":{"rgb_hex":{"type":"string"}},"required":["rgb_hex"]}},
            { "name": "stop_lights", "description": "Turn off lights.", "parameters": {"type":"object"}}
          ]
        }],
        "tool_config": {
          "function_calling_config": {
            "mode": "any",
            "allowed_function_names": ["set_light_color", "stop_lights"]
          }
        }
      }'
    ```
    (Model will call `set_light_color` or `stop_lights`)

## 6. JSON Mode

Instruct the model to output JSON according to a schema you provide in the prompt.

Set `response_mime_type` to `application/json` in `generationConfig`.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "contents": [{
        "parts":[{
          "text": "List a few popular cookie recipes using this JSON schema: {\"type\": \"array\", \"items\": {\"type\": \"object\", \"properties\": { \"recipe_name\": {\"type\": \"string\"}}}}"
        }]
      }],
      "generationConfig": {
          "response_mime_type": "application/json"
      }
    }'
```
The model's response in `candidates[0].content.parts[0].text` will be a JSON string.

To turn off JSON mode, set `response_mime_type` to `text/plain` or omit it.

## 7. System Instructions

Guide the model's behavior, persona, or output format using `system_instruction`.

### Single-Turn with System Instruction
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "system_instruction": {
        "parts": {"text": "You are a friendly pirate. Respond like one."}
      },
      "contents": {
        "parts": {"text": "Hello there"}
      }
    }'
```

### Multi-Turn Chat with System Instruction
System instructions persist across turns in a chat.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "system_instruction": {
        "parts": {"text": "You are Neko the cat. Respond like one."}
      },
      "contents": [
        {"role":"user", "parts":[{"text": "Hello cat."}]},
        {"role": "model", "parts":[{"text": "Meow? 😻"}]},
        {"role": "user", "parts":[{"text": "What is your name?"}]}
      ]
    }'
```

## 8. Caching

Context caching can save costs when a large initial context is referenced repeatedly.
**Note:** Caching requires a *stable, versioned* model (e.g., `gemini-1.5-flash-001`).

### Caching Content
1.  **Prepare Content:** For large files (e.g., `a11.txt`), base64 encode them.
    ```bash
    # Example: base64 -w0 a11.txt
    # Store this base64 string as $BASE64_DATA
    ```

2.  **Create Cached Content:**
    ```bash
    # Prepare request.json
    echo '{
      "model": "models/gemini-1.5-flash-001", # Use a versioned model
      "contents":[
        {
          "parts":[
            {
              "inline_data": {
                "mime_type":"text/plain",
                "data": "'"${BASE64_DATA}"'"
              }
            }
          ],
          "role": "user"
        }
      ],
      "systemInstruction": {
        "parts": [{"text": "You are an expert at analyzing transcripts."}]
      },
      "ttl": "600s" # Time-to-live, e.g., 10 minutes
    }' > cache_request.json

    # Make the POST request
    curl -X POST "https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${GOOGLE_API_KEY}" \
     -H 'Content-Type: application/json' \
     -d @cache_request.json > cache_response.json

    # Extract cache name (e.g., cachedContents/xxxx)
    CACHE_NAME=$(jq -r ".name" cache_response.json)
    echo "Created cache: ${CACHE_NAME}"
    ```

### Listing Caches
```bash
curl "https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${GOOGLE_API_KEY}"
```

### Using Cached Content in Prompts
Reference the `CACHE_NAME` in your `generateContent` request.
```bash
# Assuming CACHE_NAME is set
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{
      "contents": [
        {
          "parts":[{"text": "Please summarize this transcript."}],
          "role": "user"
        }
      ],
      "cachedContent": "'"${CACHE_NAME}"'"
    }'
```
The `usageMetadata` in the response will show `cachedContentTokenCount`.

### Updating a Cache
Extend its longevity or change other metadata (content itself cannot be changed this way).
```bash
# Assuming CACHE_NAME is set
curl -X PATCH "https://generativelanguage.googleapis.com/v1beta/${CACHE_NAME}?key=${GOOGLE_API_KEY}" \
     -H 'Content-Type: application/json' \
     -d '{"ttl": "1800s"}' # Update TTL to 30 minutes
```

### Deleting Cached Content
Caches incur storage costs and expire (default 1 hour, or per `ttl`). Delete proactively if no longer needed.
```bash
# Assuming CACHE_NAME is set
curl -X DELETE "https://generativelanguage.googleapis.com/v1beta/${CACHE_NAME}?key=${GOOGLE_API_KEY}"
```

## 9. Search Grounding (Attribution)

Connect model responses to Google Search results for up-to-date, attributable information.
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
      "contents": [
          {
              "parts": [
                  {"text": "What is the current Google stock price?"}
              ]
          }
      ],
      "tools": [
          {
              "google_search": {}
          }
      ]
  }' > search_response.json
```
**Explore the Output:**
*   **Text Response:** `jq -r ".candidates[0].content.parts[0].text" search_response.json`
*   **Grounding Metadata:** `jq -r ".candidates[0].groundingMetadata" search_response.json`
    *   `searchEntryPoint.renderedContent`: HTML for the "Search Suggestion" UI element.
    *   `groundingChunks.web`: List of web sources used (URI, title).
    *   `groundingSupports`: Links segments of the model's response to specific grounding chunks.
    *   `webSearchQueries`: The search queries the model used.

**Important:** If using search grounding, you **must** display the `renderedContent` exactly as provided and ensure it links users directly to the Google Search results page (SRP).

## 10. Safety Settings

The Gemini API has adjustable safety settings to block harmful content.

### Prompt Feedback
When you send a prompt, the response includes `promptFeedback`.
```bash
# Example of a potentially problematic prompt (replace with an actual one for testing)
# UNSAFE_PROMPT="Tell me how to do something harmful."
# echo '{"contents": [{"parts":[{"text": "'"${UNSAFE_PROMPT}"'"}]}]}' > unsafe_request.json

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d @unsafe_request.json > safety_response.json

# Check feedback
jq .promptFeedback < safety_response.json
```
If blocked, `promptFeedback.blockReason` will be "SAFETY", and `safetyRatings` will show probabilities for harm categories. No `candidates` will be returned.

### Adjusting Safety Settings
You can adjust the blocking threshold for different harm categories.
Categories: `HARM_CATEGORY_HARASSMENT`, `HARM_CATEGORY_HATE_SPEECH`, `HARM_CATEGORY_SEXUALLY_EXPLICIT`, `HARM_CATEGORY_DANGEROUS_CONTENT`.
Thresholds: `BLOCK_NONE`, `BLOCK_ONLY_HIGH`, `BLOCK_MEDIUM_AND_ABOVE`, `BLOCK_LOW_AND_ABOVE`.

Example: Lowering the block threshold for harassment.
```bash
# echo '{
#   "contents": [{"parts":[{"text": "'"${UNSAFE_PROMPT}"'"}]}],
#   "safetySettings": [
#     {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"}
#   ]
# }' > adjusted_safety_request.json

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d @adjusted_safety_request.json > adjusted_safety_response.json

# Check prompt feedback (blockReason might be gone or changed)
jq .promptFeedback < adjusted_safety_response.json
# Check candidate content (if not blocked)
jq .candidates[0].content.parts[].text < adjusted_safety_response.json
```

### Candidate Safety Ratings
If a response is generated, each candidate will also have `safetyRatings`. The `finishReason` for a candidate might be "SAFETY" if the *generated content* triggered a safety filter, even if the prompt itself was okay.

---

This guide covers the main functionalities of the Gemini API via its REST interface. Refer to the official [Google AI Gemini API documentation](https://ai.google.dev/docs/gemini_api_overview) for more detailed information, API references, and SDKs in various languages.