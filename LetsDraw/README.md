# LetsDraw (PeerDraw Pro)

LetsDraw is a real-time, collaborative digital whiteboard application. It leverages the power of WebRTC via PeerJS to create a serverless, peer-to-peer collaboration experience. The application is built with React and uses the `tldraw` library for its feature-rich canvas.

## Key Features

### 1. Collaborative Whiteboard
- **Rich Drawing Tools:** Utilizes the full suite of tools from the `tldraw` library, including pens, shapes, text, and connectors.
- **Real-time Sync:** Changes made by one user are instantly broadcast to all other participants on the same board.
- **Asset Upload:** Users can upload images to the canvas, which are then synchronized with other participants.

### 2. Peer-to-Peer Collaboration
- **Serverless Architecture:** All board data is synchronized directly between users' browsers using **PeerJS** (WebRTC), eliminating the need for a central server and ensuring low latency.
- **Easy Sharing:** The host of a board can generate a unique session link or a **QR code** to invite others.
- **Scan to Join:** New users can quickly join a session by scanning the QR code with their device's camera.
- **User Presence:** See the avatars of other connected users. You can also click on an avatar to follow that user's view and movements on the canvas.

### 3. Board & User Management
- **User Personalization:** Users can set their name and choose a unique color, which is used for their cursor and avatar.
- **Dashboard:** A simple dashboard allows users to start a new board or view and rejoin recent boards.
- **Local Persistence:** Your drawing boards are automatically saved to your browser's **IndexedDB**, so you can close the tab and resume your work later.

## Technical Stack & Architecture

- **Framework:** **React 18** with modern hooks (`useState`, `useEffect`, `useContext`) for building a reactive user interface.
- **Core Drawing Library:** **`tldraw`** provides the powerful, extensible whiteboard component, including all shapes, tools, and canvas logic.
- **Real-time Networking:** **PeerJS** is used to abstract away the complexity of WebRTC, enabling a robust peer-to-peer data channel for synchronizing board state.
- **Local Database:** **IndexedDB** is used to persist board snapshots locally, allowing users to access their recent work.
- **Component-Based Structure:** The application is broken down into logical React components:
    - `App.jsx`: The main component, which acts as a router between the `Dashboard` and the `Workspace`.
    - `Dashboard.jsx`: The UI for creating new boards and listing recent ones.
    - `Workspace.jsx`: The main view that houses the collaborative editor.
    - `CollaborativeEditor.jsx`: The core component where `tldraw` is integrated with the PeerJS synchronization logic.
    - `UserProvider.jsx` & `UIProvider.jsx`: React Context providers that manage global state for user identity and UI elements like modals and toasts.
- **Dependencies & Build:**
    - The project uses modern JavaScript (ESM) and requires no traditional build step.
    - An **`importmap`** in `index.html` manages all dependencies, which are loaded directly from the `esm.sh` CDN. This includes `react`, `tldraw`, and `peerjs`.

## How to Use

1.  **Open `LetsDraw/DEV/index.html`** in a modern web browser.
2.  **Set Your Profile:** On the dashboard, enter your name and select a color. This will be used to identify you in a session.
3.  **Start or Join a Board:**
    - Click **"New Board"** to become the host of a new session.
    - To join, either:
        - Click **"Scan to Join"** and scan the QR code from a host's screen.
        - Paste a board ID into the input field and click **"Join"**.
4.  **Collaborate:**
    - Once in a workspace, you are connected to other peers. Any drawings or changes you make will appear for everyone else in real-time.
    - As a host, click the **"Invite"** button to open the share modal with the QR code and session link.
