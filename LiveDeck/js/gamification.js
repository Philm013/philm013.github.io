/**
 * LiveDeck - Gamification & Engagement Module
 */

const gamification = {
    state: {
        players: {}, // id: { name: '', score: 0, streak: 0 }
        leaderboard: []
    },
    reactionCounts: {},

    init() {
        console.log("Gamification Engine Active");
    },

    trackReaction(content, isText) {
        const key = `${isText ? 'txt' : 'emj'}-${content}`;
        if (!this.reactionCounts[key]) this.reactionCounts[key] = 0;
        
        this.reactionCounts[key]++;
        
        // Trigger super animation if threshold is met
        if (this.reactionCounts[key] >= 5) {
            this.triggerSuperAnimation(content, isText);
            this.reactionCounts[key] = 0; // Reset after triggering
        }
        
        // Decay count over time (2 second rolling window)
        setTimeout(() => {
            if (this.reactionCounts[key] > 0) this.reactionCounts[key]--;
        }, 2000);
    },

    triggerSuperAnimation(content, isText) {
        if (isText) {
            // Super Text Animation
            const div = document.createElement('div');
            div.className = 'fixed inset-0 flex items-center justify-center pointer-events-none z-[200] super-burst';
            div.innerHTML = `<span class="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 filter drop-shadow-[0_0_30px_rgba(99,102,241,0.8)] scale-0 animate-super-text text-center px-4 leading-tight">${content}</span>`;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 3000);
            if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
        } else {
            // Super Emoji Burst
            for (let i = 0; i < 40; i++) {
                setTimeout(() => {
                    const div = document.createElement('div');
                    div.className = 'fixed bottom-0 text-5xl md:text-7xl pointer-events-none z-[200] animate-super-emoji';
                    div.style.left = (50 + (Math.random() * 40 - 20)) + '%';
                    
                    // Randomize animation custom properties
                    const tx = (Math.random() * 100 - 50) + 'vw';
                    const ty = -(Math.random() * 100 + 20) + 'vh';
                    const rot = (Math.random() * 360) + 'deg';
                    
                    div.style.setProperty('--tx', tx);
                    div.style.setProperty('--ty', ty);
                    div.style.setProperty('--rot', rot);
                    
                    div.textContent = content;
                    document.body.appendChild(div);
                    setTimeout(() => div.remove(), 2500);
                }, i * 30);
            }
            if (window.navigator.vibrate) window.navigator.vibrate(200);
        }
    },

    addPoints(playerId, points, correct = true) {
        if (!this.state.players[playerId]) {
            this.state.players[playerId] = { name: 'Player', score: 0, streak: 0 };
        }
        
        const p = this.state.players[playerId];
        if (correct) {
            p.score += points + (p.streak * 50); // Streak bonus
            p.streak++;
        } else {
            p.streak = 0;
        }
        
        this.updateLeaderboard();
        this.broadcastState();
    },

    updateLeaderboard() {
        this.state.leaderboard = Object.entries(this.state.players)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.score - a.score);
    },

    broadcastState() {
        if (app.state.isHost) {
            p2p.broadcast({
                type: 'gamification-update',
                players: this.state.players,
                leaderboard: this.state.leaderboard
            });
        }
    },

    handleUpdate(data) {
        this.state.players = data.players;
        this.state.leaderboard = data.leaderboard;
        // Optionally show leaderboard overlay
    },

    triggerConfetti() {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#ec4899', '#8b5cf6']
        });
    }
};
