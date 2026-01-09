# IPTV Player Pro

IPTV Player Pro is a modern, browser-based IPTV (Internet Protocol Television) player that runs entirely on the client-side. It allows users to manage their own M3U playlists, browse channels, and view a full-featured EPG (Electronic Program Guide) without needing any backend or server-side setup. All user data, including playlists and favorites, is stored locally in the browser.

## Key Features

### 1. Advanced Playlist Management
- **Custom Playlists:** Add your own M3U playlists by providing a name and a URL.
- **Provider Playlists:** Comes pre-configured with a vast selection of public playlists from the `iptv-org` project, neatly organized by country and region.
- **Selective Loading:** Users can enable or disable specific provider playlists in the settings to customize their channel lineup and reduce loading times.
- **Category Management:** Show or hide entire channel categories to personalize the browsing experience.

### 2. EPG (Electronic Program Guide)
- **Full TV Guide:** Switch to the "Guide" view to see a timeline of current and upcoming programs for your channels, just like a traditional set-top box.
- **XMLTV Integration:** Loads and parses gzipped XMLTV files from `iptv-org` to populate the program guide.
- **Customizable EPG Sources:** Users can select which EPG sources to load, typically based on language, to keep the guide relevant and fast.
- **"Now" Indicator:** A live indicator line on the timeline shows the current time, making it easy to see what's currently airing.

### 3. Channel Browsing and Playback
- **Grid and List Views:** Browse channels in a visually appealing grid or switch to the comprehensive guide view.
-   **Search & Filter:** Quickly find channels by name using the search bar or filter the channel list by selecting a category.
-   **Favorites:** Mark any channel as a favorite for quick access in the dedicated "Favorites" category.
-   **HLS Player:** The integrated video player uses **HLS.js** to ensure smooth playback of HLS (`.m3u8`) streams, the most common format for IPTV.

### 4. Modern Video Player
-   **Custom Controls:** A sleek, overlay-based player with controls for play/pause, volume, and progress.
-   **Adaptive Bitrate Streaming:** If the stream provides multiple quality levels, a menu automatically appears, allowing you to manually select a resolution (e.g., 720p, 1080p) or keep it on "Auto".
-   **Picture-in-Picture (PiP):** Pop the video out into a floating window to watch while using other applications.
-   **Fullscreen Mode:** Enjoy an immersive, fullscreen viewing experience.

### 5. Privacy-Focused
-   **Local Storage:** All your settings—custom playlists, enabled sources, and favorite channels—are saved directly in your browser's `localStorage`. No data is ever sent to an external server.

## Technical Stack

-   **Architecture:** A 100% client-side Single Page Application (SPA).
-   **Framework:** Built with vanilla **HTML, CSS, and JavaScript**.
-   **Streaming Engine:** **HLS.js** is used for robust HLS stream playback.
-   **Data Parsing:**
    -   Custom M3U parser to extract channel information.
    -   **Pako.js** is used to decompress gzipped EPG (XMLTV) files on the fly.
    -   A custom XMLTV parser extracts program information from the guide data.
-   **Persistence:** All user preferences and data are managed using the browser's `localStorage` API.
-   **Styling:** A modern, dark-themed UI built with custom CSS, using CSS variables for easy theming. It is responsive and functional on both desktop and mobile devices.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Configure Sources (First Use):**
    -   Click the **Settings** icon in the top right.
    -   Under **"Provider Playlists"**, enable the countries/regions you are interested in.
    -   Under **"EPG Sources"**, enable the TV guides for the languages you want to see program information for.
    -   (Optional) Add your own custom M3U playlists.
    -   Click **"Save & Close"**. The app will fetch and process your selected sources.
3.  **Browse Channels:**
    -   In the "Channels" view, select a category from the top navigation bar.
    -   Search for channels using the search bar.
    -   Click on a channel card to start playback.
4.  **Use the Guide:**
    -   Click the "Guide" button in the main header.
    -   Scroll vertically to browse channels and horizontally to browse through time.
    -   Click on any program in the guide to tune to that channel.
