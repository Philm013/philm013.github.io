/**
 * LiveDeck - Session & Interaction State Management
 * 
 * Manages active session data (poll votes, board notes, published states)
 * independently from the slide definitions, ensuring late joiners sync perfectly.
 */
const session = {
    state: {
        polls: {}, // { "blk-123": { results: { 0: 5, 1: 2 }, published: false } }
        boards: {}, // { "blk-456": [ { id, text, color, prompt } ] }
        questions: [], // { id, user, text, votes, time }
    },

    init() {
        console.log("Session Manager Initialized");
    },

    /**
     * Q&A Management
     */
    addQuestion(text, user = 'Anonymous') {
        const q = {
            id: 'q-' + Math.random().toString(36).substr(2, 9),
            user,
            text,
            votes: 0,
            time: Date.now()
        };
        this.state.questions.push(q);
        this.broadcastState();
        ui.notify('New Question Received', 'info');
    },

    voteQuestion(id) {
        const q = this.state.questions.find(item => item.id === id);
        if (q) {
            q.votes++;
            this.broadcastState();
        }
    },

    /**
     * Poll Management
     */
    recordVote(blockId, optIdx) {
        if (!this.state.polls[blockId]) {
            this.state.polls[blockId] = { results: {}, published: false };
        }
        if (!this.state.polls[blockId].results[optIdx]) {
            this.state.polls[blockId].results[optIdx] = 0;
        }
        this.state.polls[blockId].results[optIdx]++;
        this.broadcastState();
    },

    publishPoll(blockId) {
        if (!this.state.polls[blockId]) {
            this.state.polls[blockId] = { results: {}, published: false };
        }
        this.state.polls[blockId].published = true;
        this.broadcastState();
        ui.notify('Poll Results Published', 'success');
    },

    /**
     * Board Management
     */
    addBoardNote(blockId, note) {
        if (!this.state.boards[blockId]) this.state.boards[blockId] = [];
        this.state.boards[blockId].push(note);
        this.broadcastState();
    },

    /**
     * Sync Logic
     */
    broadcastState() {
        if (app.state.isHost) {
            p2p.broadcast({ type: 'session-sync', state: this.state });
            if (app.state.view === 'player') {
                player.updatePresenterConsole();
                player.updateView();
            }
        }
    },

    handleSync(newState) {
        this.state = newState;
        if (app.state.view === 'player') {
            player.updateView();
        }
    }
};
