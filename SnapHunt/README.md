# SnapHunt

SnapHunt is a web-based, real-world scavenger hunt game that turns your world into the game board. It operates as a Progressive Web App (PWA) with a mobile-first design, allowing for an immersive, app-like experience directly from the browser. The game uses peer-to-peer networking, meaning hosts can create and run live games with participants without needing a dedicated server.

## Core Gameplay

The game is played with two roles:

-   **The Host:** The host creates a "hunt" by placing virtual checkpoints on a real-world map. They define the rules, create clues, and manage the game flow.
-   **The Participant:** Participants join a hunt using a unique code provided by the host. They then navigate the real world to find and complete the checkpoints in order to score points.

## Key Features

### 1. Game Creation & Management (Host)
-   **Interactive Map Editor:** Create hunts by searching for locations or dropping pins directly onto a Leaflet-powered map.
-   **Dynamic Checkpoints:** Each checkpoint contains a custom clue or riddle.
-   **Multiple Unlock Methods:** Make hunts more engaging by setting different unlock conditions for each checkpoint:
    -   **Geofence:** Player must be within a specific physical radius of the location.
    -   **Photo Challenge:** Player must take a photo that satisfies a creative prompt (e.g., "Take a selfie with a statue").
    -   **QR Code Scan:** Player must find and scan a real-world QR code.
-   **Game Modes:** Configure the hunt to be **Linear** (checkpoints must be completed in order) or **Scramble** (all checkpoints are available from the start).
-   **Import/Export:** Save your complex hunt creations as a JSON file to share or re-use them later.

### 2. Live Gameplay (Participant)
-   **Live Map & Geolocation:** See your position on the map in real-time as you navigate towards the next objective.
-   **Compass Guidance:** An in-game compass points you in the general direction of your next checkpoint.
-   **Real-time Scoring & Leaderboard:** Score points for every completed checkpoint and track your progress against other players on a live leaderboard.
-   **In-Game Chat:** Communicate with the host and other participants through a built-in chat system.
-   **Power-Ups:** Randomly receive helpful power-ups like a **Hint** for a tricky clue, a temporary **Compass**, or a **Score Doubler**.

### 3. Progressive Web App (PWA)
-   **Installable:** SnapHunt can be "installed" to a device's home screen for a fullscreen, native app experience.
-   **Offline Capabilities:** The use of a service worker allows for basic offline functionality and improved reliability.

### 4. Peer-to-Peer Networking
-   **Serverless:** The entire game is managed through a peer-to-peer network. The host acts as the central hub, and all game state updates (locations, scores, events) are synchronized directly between players using WebRTC.
-   **Private & Secure:** Because there is no central server, game data is shared only between the host and connected participants.

## Technical Stack

-   **Architecture:** A client-side Single Page Application (SPA) built with vanilla **HTML, CSS, and JavaScript**.
-   **Styling:** **Tailwind CSS** provides a modern, responsive, and mobile-first user interface.
-   **Mapping:** **Leaflet.js** is the core library used to render all interactive maps.
-   **Networking:** **PeerJS** is used to abstract and manage the underlying WebRTC data channels for real-time P2P communication.
-   **QR Code Scanning:** The **`html5-qrcode`** library enables QR code scanning directly within the browser using the device's camera.
-   **Persistence:** The browser's `localStorage` is used to remember the user's codename and other session data.
-   **Modularity:** The application logic is organized into separate modules for handling core logic (`app.js`), map interactions (`map.js`), networking (`network.js`), and UI updates (`ui.js`).

## How to Play

### As a Host:
1.  Open `index.html`.
2.  Enter your codename and click **"CREATE A HUNT"**.
3.  Use the search bar or tap on the map to place checkpoints.
4.  Click on a checkpoint pin to edit its clue and set the unlock method.
5.  When your hunt is ready, click the **Share** icon to get the unique 6-digit Hunt Code.
6.  Share the code with participants and click **"LAUNCH HUNT"** to begin the game.

### As a Participant:
1.  Open `index.html`.
2.  Enter your codename and click **"JOIN A HUNT"**.
3.  Enter the 6-digit Hunt Code provided by the host.
4.  Wait in the lobby for the host to start the game.
5.  Once the game starts, use the map and clues to find and complete the checkpoints.
