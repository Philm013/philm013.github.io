# Visual Knowledge Tool - Client-Server Version

This project is a refactored version of the original single-file application, now structured as a modern client-server application. The frontend is built with vanilla HTML, CSS, and JavaScript (using D3.js for visualization), while the backend is a Node.js server using Express to handle all AI-related logic and tool execution with the Gemini API.

## Project Structure

- **/client**: Contains all frontend assets (HTML, CSS, JS).
- **/server**: Contains the Node.js backend, including the Express server, API routes, and the core Gemini agent logic.

## Setup and Installation

### 1. Backend Setup

First, navigate to the `server` directory:
```bash
cd server
```

Create a `.env` file in the `server` directory by copying the example. This file will hold your secret API keys.
```
# .env file in /server directory
# Get your key from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Optional keys for data gathering tools
HUGGING_FACE_API_TOKEN="YOUR_HF_TOKEN"
NEWS_API_KEY="YOUR_NEWSAPI_KEY"
FINNHUB_API_KEY="YOUR_FINNHUB_KEY"
WOLFRAM_ALPHA_APP_ID="YOUR_WOLFRAM_APPID"
```

Install the necessary Node.js dependencies:
```bash
npm install
```

### 2. Running the Application

You need to run the backend server and serve the frontend client.

**Start the Backend Server:**
From the `server` directory, run:
```bash
node server.js
```
The server will start on `http://localhost:3000`.

**Serve the Frontend:**
The simplest way to run the client is with a live server extension in your code editor (like VS Code's "Live Server").
1. Open the `client` directory in your editor.
2. Right-click on `index.html` and choose "Open with Live Server".
3. This will typically open the application at `http://127.0.0.1:5500` or a similar address.

The client application is now running in your browser and will communicate with the Node.js server for all AI functionality.