# SnapMeet

SnapMeet is a real-time, peer-to-peer location sharing and communication application designed for small groups. It allows users to create or join a session, see each other's locations on a live map, chat, and set points of interest without relying on a central server. All data is synchronized directly between users' browsers using WebRTC.

The application is a lightweight, mobile-first Progressive Web App (PWA) built with vanilla JavaScript and modern web technologies.

## Key Features

### 1. Real-time Location Sharing
- **Live Map:** See yourself and other participants represented by markers on a live map powered by Leaflet.js.
- **Heading & Status:** Each user's marker displays their initial, a directional arrow indicating their device heading, and their current battery level.
- **Distance Calculation:** The app shows the real-time distance from you to any other participant.
- **Map Layers:** Switch between light, dark, and satellite map layers to suit your environment.

### 2. Session Management
- **Host & Join:** A user can either **host** a new session (generating a unique ID) or **join** an existing one.
- **Peer-to-Peer Networking:** SnapMeet uses PeerJS to establish a WebRTC mesh network where the host acts as the hub. All location and chat data is passed directly between clients, ensuring privacy and low latency.
- **Share via URL:** The host can share a unique URL that allows others to join their session instantly.

### 3. Interactive Map Tools
- **Points of Interest (POIs):** Any user can add named "Points of Interest" to the shared map by tapping a location. These are visible to everyone in the session.
- **Rally Points:** The host can set a special "Rally Point" (indicated by a flag) to designate a meeting spot. Participants can also suggest rally point locations to the host.
- **Sonar Ping:** Tap the "sonar" button to send a temporary visual ping from your location on everyone else's map, useful for getting attention without typing.
- **Force Focus (Host only):** The host can command all participants' maps to pan and center on their location.

### 4. Integrated Chat
- **Public Chat:** A main chat room for all participants in the session.
- **Private & Contextual Chat:** Initiate a private chat with another user by clicking their marker. You can also start contextual chats about a specific POI or Rally Point.
- **@Mentions:** The chat supports `@mentions`. Typing `@` followed by a user's name or a POI's name creates a clickable link that, when tapped, pans the map directly to that person or point.

## Technical Stack & Architecture

- **Architecture:** A 100% client-side Single Page Application (SPA). No user data is stored on a central server.
- **Framework:** Built with vanilla **HTML, CSS, and JavaScript**.
- **Styling:** **Tailwind CSS** is used for a modern, responsive, and mobile-first user interface.
- **Mapping:** **Leaflet.js** is the core library for rendering the interactive map and all associated markers and layers. Map tiles are sourced from CartoDB and ArcGIS.
- **Networking:** **PeerJS** is used to abstract and manage the underlying WebRTC data channels, facilitating direct peer-to-peer communication.
-   **Persistence:** The browser's `localStorage` is used to remember the user's chosen name and the ID of the last session they joined, allowing for quick re-entry.
-   **Modularity:** The application code is organized into logical modules:
    -   `app.js`: Manages the core application state and initialization.
    -   `map.js`: Handles all Leaflet map creation and interaction logic.
    -   `network.js`: Manages the PeerJS connection, data broadcasting, and message handling.
    -   `ui.js`: Responsible for all DOM manipulation, event listeners, and UI updates.

## How to Use

1.  **Open `index.html`** in a modern web browser, preferably on a mobile device.
2.  **Enter Your Name:** Provide a username to identify yourself in the session.
3.  **Start or Join a Session:**
    -   **To Host:** Simply click **"Start Session."** You will become the host. Click the "Share" icon to get a unique URL to send to others.
    -   **To Join:** Open the unique URL provided by a host. The app will automatically configure you as a client and attempt to connect to the host's session.
4.  **Interact:**
    -   Your location will be automatically shared. You will see others appear on the map as they join.
    -   Use the bottom navigation bar to switch between the Map, the Roster of users, and the Chat.
    -   Double-tap the map to set (if host) or suggest (if client) a Rally Point.
    -   Enable POI mode to add points of interest to the map.