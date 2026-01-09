# MixTape - The Retro Web-Based Music Player

MixTape is a web application that brings the nostalgic experience of a 90s portable cassette player to the modern web. Styled to look and feel like a classic "Walkman," it functions as a music player that uses YouTube as its content backend. Create playlists, save them as "tapes," and even share them directly with friends using peer-to-peer technology.

## Key Features

### 1. Retro "Walkman" Interface
- **Nostalgic Design:** The entire UI is crafted to resemble a portable cassette player, complete with a tape window, spinning reels, an LCD display, and tactile-looking buttons.
- **Visual Feedback:** The cassette reels animate when a track is playing, and the LCD provides status updates like "PLAYING," "PAUSED," and the current track number and time.
- **Handwritten Aesthetic:** The currently playing track's title is displayed on the cassette sticker in a handwriting-style font, completing the mixtape feel.

### 2. Music and Playlist Management
- **YouTube-Powered:** The player uses the YouTube Iframe API to stream audio from videos, giving you access to a massive library of music. The video player itself is hidden for an audio-focused experience.
- **Track Search:** Find songs by searching for an artist and title. The app uses the Piped API (a privacy-friendly YouTube front-end) to find music streams. You can also paste a direct YouTube video URL to add it to your playlist.
- **Playlist Control:** Add songs to your current "tape," skip between tracks, play/pause, and remove songs from the list. The player automatically proceeds to the next track upon completion.

### 3. Save and Share Your Tapes
- **Local Library:** Save your curated playlists to your browser's local storage (IndexedDB). You can give each "tape" a name and load it back into the player anytime from your library.
- **Peer-to-Peer (P2P) Sharing:** Generate a unique sharing link for your current playlist. When a friend opens the link, their player establishes a direct peer-to-peer connection with yours via PeerJS and instantly syncs the playlist. No server is involved in the transfer.

## Technical Stack & Architecture

- **Architecture:** A completely client-side, single-file application built with vanilla **HTML, CSS, and JavaScript**.
- **Core APIs:**
    - **YouTube Iframe Player API:** Handles all media playback.
    - **Piped API:** Serves as the back-end for searching YouTube music content.
- **Networking:**
    - A public **CORS proxy** (`cors-anywhere`) is used to communicate with the search API. The app includes logic to prompt the user to unlock the proxy if it's blocked.
    - **PeerJS** is used to enable the WebRTC-based P2P playlist sharing functionality.
- **Persistence:** **IndexedDB** is used as a simple local database to store users' saved "tapes" (playlists).
- **Styling:** The retro aesthetic is achieved with extensive custom CSS, using Google Fonts like `VT323` for the LCD and `Permanent Marker` for the handwritten labels, along with CSS animations for the interactive elements.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Find a Track:** Use the input field to search for a song (e.g., "Nirvana - Smells Like Teen Spirit") and click "FIND," or paste a full YouTube URL.
3.  **Build Your Playlist:** The found track will be added to the list on the "cassette insert." Continue adding songs to build your mixtape.
4.  **Control Playback:** Use the physical-style buttons at the bottom to play, pause, and skip tracks. Click on a track in the list to jump directly to it.
5.  **Save Your Tape:** Click the **"SAV"** button to name and save your current playlist to your local library.
6.  **Load a Tape:** Click the **"LIB"** button to open your collection of saved tapes and load one into the player.
7.  **Share with a Friend:** Click the **"LNK"** button to generate a unique sharing link. Copy the link and send it to a friend. When they open it, their player will sync with your playlist.
