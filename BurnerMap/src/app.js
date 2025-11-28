// Main app logic
Object.assign(app, {
    init: () => {
        const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        window.addEventListener('resize', setVh); setVh();
        if(navigator.getBattery) navigator.getBattery().then(b => { app.battery = Math.round(b.level*100); b.addEventListener('levelchange', () => app.battery = Math.round(b.level*100)); });

const saved = JSON.parse(localStorage.getItem('snapmeet_v1'));
        const urlParams = new URLSearchParams(window.location.search);
        const joinId = urlParams.get('join');

        // Load saved boards and current board
        const savedBoards = JSON.parse(localStorage.getItem('snapmeet_boards'));
        if (savedBoards) {
            app.boards = savedBoards;
            app.currentBoard = localStorage.getItem('snapmeet_current_board');
            if (app.currentBoard && !app.boards[app.currentBoard]) {
                app.currentBoard = null; // Clear if saved board ID is invalid
            }
        }

        if (joinId) {
            // User is explicitly joining. They are a CLIENT.
            app.hostId = joinId;
            app.isHost = false;
            // Load their saved username for convenience
            if (saved) {
                app.username = saved.username;
                document.getElementById('username-input').value = app.username;
            }
        } else {
            // User is NOT joining. They are a new HOST.
            app.hostId = null;
            app.isHost = true;
            // Load their saved username for convenience, but ignore any old hostId
            if (saved) {
                app.username = saved.username;
                app.username = document.getElementById('username-input').value = app.username;
            }
        }

        // If a board is already active, render its spots on map initialization
        if (app.currentBoard) {
            app.renderBoardSpots();
        }

        if(app.isHost) document.getElementById('btn-focus').classList.remove('hidden');
    },

    startSession: () => {
        const input = document.getElementById('username-input');
        if(!input.value.trim()) return input.focus();
        app.username = input.value.trim();
        document.getElementById('modal-onboarding').style.opacity = '0';
        setTimeout(() => document.getElementById('modal-onboarding').style.display = 'none', 500);
        document.getElementById('view-map').style.visibility = 'visible';
        app.initMap(); app.initPeer(); app.startLocation();
        localStorage.setItem('snapmeet_v1', JSON.stringify({ username: app.username, hostId: app.hostId }));
    },

    burn: () => { if(confirm('Burn Session?')) { localStorage.removeItem('snapmeet_v1'); window.location.href = window.location.pathname; }},

    getShareUrl: () => {
        const joinId = app.isHost ? app.myId : app.hostId;
        if (!joinId) return null;
        const url = new URL(window.location.pathname, window.location.origin);
        url.searchParams.set('join', joinId);
        return url.href;
    },

    startPrivateChat: (target) => {
        app.privateChat = {
            id: target.id,
            username: target.username,
            isWaypoint: !!target.isWaypoint,
            isRally: !!target.isRally,
            isGroup: !!target.isGroup,
            groupName: target.groupName,
        };
        app.renderChat(target.id);
        app.switchTab('chat');
        app.updateChatUI();
        app.chatListOpen = false;
        document.getElementById('chat-list-panel').classList.add('hidden');
    },

    exitPrivateChat: () => {
        app.privateChat = null;
        app.renderChat('public');
        app.updateChatUI();
    },

    startPublicChat: () => {
        app.privateChat = null;
        app.renderChat('public');
        app.switchTab('chat');
        app.updateChatUI();
        app.chatListOpen = false;
        document.getElementById('chat-list-panel').classList.add('hidden');
    },

    startGroupChat: (groupId) => {
        const group = app.groupChats[groupId];
        if (!group) return;
        app.privateChat = {
            id: groupId,
            username: group.name, // Use group name as username for display
            isGroup: true,
            groupName: group.name,
        };
        app.renderChat(groupId);
        app.switchTab('chat');
        app.updateChatUI();
        app.chatListOpen = false;
        document.getElementById('chat-list-panel').classList.add('hidden');
    },

    createNewBoard: () => {
        const boardNameInput = document.getElementById('new-board-name-input');
        const boardName = boardNameInput.value.trim();
        if (!boardName) return alert('Please enter a board name.');

        const boardId = 'board_' + Date.now();
        app.boards[boardId] = {
            id: boardId,
            name: boardName,
            createdAt: Date.now(),
            spots: []
        };
        app.currentBoard = boardId;
        localStorage.setItem('snapmeet_boards', JSON.stringify(app.boards));
        localStorage.setItem('snapmeet_current_board', boardId); // Save current board ID
        boardNameInput.value = '';
        app.renderBoardsList();
        app.showToast(`Board '${boardName}' created and loaded.`);
        app.switchTab('map'); // Switch back to map after creating a board
    },

    renderBoardsList: () => {
        const boardsListContainer = document.getElementById('boards-list');
        boardsListContainer.innerHTML = '';

        if (Object.keys(app.boards).length === 0) {
            boardsListContainer.innerHTML = '<p class="text-gray-400">No boards created yet.</p>';
            return;
        }

        Object.entries(app.boards).forEach(([boardId, board]) => {
            const boardItemHtml = `
                <div class="glass p-3 rounded-lg flex items-center justify-between">
                    <span class="font-bold">${board.name} ${app.currentBoard === boardId ? '(Active)' : ''}</span>
                    <div>
                        <button onclick="app.loadBoard('${boardId}')" class="text-blue-500 mr-2"><i class="fa-solid fa-folder-open"></i> Load</button>
                        <button onclick="app.deleteBoard('${boardId}')" class="text-red-500"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;
            boardsListContainer.insertAdjacentHTML('beforeend', boardItemHtml);
        });
    },

    loadBoard: (boardId) => {
        if (!app.boards[boardId]) return app.showToast('Board not found.');
        app.currentBoard = boardId;
        localStorage.setItem('snapmeet_current_board', boardId); // Save current board ID
        app.showToast(`Board '${app.boards[boardId].name}' loaded.`);
        app.renderBoardsList(); // Re-render to show active state
        app.switchTab('map'); // Switch back to map after loading a board
        app.renderBoardSpots(); // Render spots on the map
    },

    deleteBoard: (boardId) => {
        if (!confirm('Are you sure you want to delete this board?')) return;
        delete app.boards[boardId];
        localStorage.setItem('snapmeet_boards', JSON.stringify(app.boards));
        if (app.currentBoard === boardId) {
            app.currentBoard = null; // Unset current board if deleted
            localStorage.removeItem('snapmeet_current_board'); // Remove from local storage
            app.clearBoardSpots(); // Clear spots from the map
        }
        app.renderBoardsList();
        app.showToast('Board deleted.');
    },

    renderBoardSpots: () => {
        app.clearBoardSpots(); // Clear existing spots before rendering new ones
        if (!app.currentBoard || !app.boards[app.currentBoard]) return;

        const board = app.boards[app.currentBoard];
        board.spots.forEach(spot => {
            // For now, reuse drawWaypoint for rendering.
            // A more dedicated board spot renderer might be needed later.
            app.drawWaypoint({ ...spot, isBoardSpot: true });
        });
    },

    clearBoardSpots: () => {
        // Remove all markers that are identified as board spots
        Object.values(app.markers).forEach(marker => {
            const waypoint = app.waypoints.find(wp => wp.id === marker.wp_id);
            if (waypoint && waypoint.isBoardSpot) {
                app.map.removeLayer(marker);
                delete app.markers[marker.wp_id];
                // Also remove from app.waypoints if it's a board spot
                app.waypoints = app.waypoints.filter(wp => wp.id !== marker.wp_id);
            }
        });
    },

    addBoardSpot: (latlng, name, icon = '📍', notes = '') => {
        if (!app.currentBoard) return app.showToast('Please load or create a board first.');

        const board = app.boards[app.currentBoard];
        const spotId = 'spot_' + Date.now();
        const newSpot = {
            id: spotId,
            name: name,
            lat: latlng.lat,
            lng: latlng.lng,
            icon: icon,
            notes: notes,
            isBoardSpot: true, // Mark as board spot for easier management
        };
        board.spots.push(newSpot);
        localStorage.setItem('snapmeet_boards', JSON.stringify(app.boards));
        app.renderBoardSpots();
        app.showToast(`Spot '${name}' added to current board.`);
    },

    editBoardSpot: (spotId) => {
        if (!app.currentBoard) return;
        const board = app.boards[app.currentBoard];
        const spot = board.spots.find(s => s.id === spotId);
        if (!spot) return;

        const newName = prompt('Edit spot name:', spot.name);
        if (newName === null) return; // User cancelled
        const newNotes = prompt('Edit spot notes:', spot.notes);
        if (newNotes === null) return; // User cancelled

        spot.name = newName.trim();
        spot.notes = newNotes.trim();
        localStorage.setItem('snapmeet_boards', JSON.stringify(app.boards));
        app.renderBoardSpots();
        app.showToast('Spot updated.');
    },

    deleteBoardSpot: (spotId) => {
        if (!app.currentBoard) return;
        if (!confirm('Are you sure you want to delete this spot from the board?')) return;

        const board = app.boards[app.currentBoard];
        board.spots = board.spots.filter(s => s.id !== spotId);
        localStorage.setItem('snapmeet_boards', JSON.stringify(app.boards));
        app.renderBoardSpots();
        app.showToast('Spot deleted from board.');
    },

    showBoardSpotActions: (spot) => {
        const content = `<h2 class="text-2xl font-bold">${spot.name}</h2><p class="text-sm opacity-60">${spot.notes || ''}</p>`;
        const buttons = [
            { label: 'Pan To', action: () => app.map.flyTo([spot.lat, spot.lng], 18) },
            { label: 'Edit Spot', action: () => app.editBoardSpot(spot.id), class: 'bg-blue-600 text-white' },
            { label: 'Delete Spot', action: () => app.deleteBoardSpot(spot.id), class: 'bg-red-600 text-white' },
        ];
        app.showActions(content, buttons);
    }
});

window.onload = app.init;