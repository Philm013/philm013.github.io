/**
 * LiveDeck - Utilities Module
 */

const utils = {
    async exportStandalone() {
        const title = app.state.currentDeck.title;
        const md = app.state.currentDeck.content;
        const isSpatial = app.state.isSpatial;
        
        // Encode MD to base64 to avoid quote issues
        const mdBase64 = btoa(unescape(encodeURIComponent(md)));
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - LiveDeck Standalone</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
    <style>
        body { background: #0f172a; color: white; margin: 0; overflow: hidden; font-family: sans-serif; }
        
        .slide-content { 
            position: relative; 
            width: 1920px; 
            height: 1080px; 
            background: white; 
            transform-origin: center center;
        }
        .dark .slide-content { background: #0f172a; color: white; }
        
        .component-block {
            position: absolute;
            box-sizing: border-box;
        }

        .slide-frame { position: absolute; inset: 0; transition: all 0.5s ease; opacity: 0; visibility: hidden; z-index: 0; display: flex; align-items: center; justify-content: center; background: #0f172a; }
        .slide-frame.active { opacity: 1; visibility: visible; z-index: 10; transform: translateX(0) !important; }
        
        h1 { font-size: 5rem; font-weight: 900; margin-bottom: 2rem; line-height: 1.1; }
        h2 { font-size: 4rem; font-weight: 800; margin-bottom: 1.5rem; }
        p, li { line-height: 1.6; color: #94a3b8; font-size: 3.5rem; }
        ul { list-style: disc; margin-left: 3rem; }

        .spatial-container { transform-origin: center center; transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1); position: relative; width: 100%; height: 100%; }
        .spatial-slide { position: absolute; width: 1920px; height: 1080px; background: #1e293b; border-radius: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden; }
        
        .hud { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.5); padding: 10px 20px; border-radius: 20px; z-index: 100; display: flex; gap: 20px; align-items: center; backdrop-filter: blur(10px); }
        button { background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 10px; font-weight: bold; cursor: pointer; color: white; border: none; }
        button:hover { background: rgba(255,255,255,0.2); }
    </style>
</head>
<body class="dark">
    <div id="player" class="h-screen w-screen relative overflow-hidden flex items-center justify-center"></div>
    <div class="hud">
        <button onclick="prev()">PREV</button>
        <span id="pos" style="font-family: monospace; font-weight: bold; color: white;">1 / 1</span>
        <button onclick="next()">NEXT</button>
    </div>

    <script>
        // Inline Parser
        const parser = {
            parseDeck(md) {
                const slideStrings = md.split(/\\n\\s*---\\s*\\n/).map(s => s.trim());
                return slideStrings.map((slideStr, index) => ({
                    id: 'slide-' + index,
                    blocks: this.parseSlide(slideStr)
                }));
            },
            parseSlide(slideMd) {
                const blocks = [];
                const blockRegex = /:::block\\s+({.*?})\\s*\\n([\\s\\S]*?)\\n:::/g;
                let lastIndex = 0; let match;
                while ((match = blockRegex.exec(slideMd)) !== null) {
                    try {
                        const config = JSON.parse(match[1]);
                        blocks.push({ ...config, content: match[2].trim() });
                    } catch (e) {}
                }
                return blocks;
            }
        };

        const md = decodeURIComponent(escape(atob("${mdBase64}")));
        const slides = parser.parseDeck(md);
        const isSpatial = ${isSpatial};
        let current = 0;
        const player = document.getElementById('player');

        function renderBlock(block) {
            let contentHTML = '<div style="padding:20px; width:100%; height:100%;">' + marked.parse(block.content) + '</div>';
            if(block.type === 'image') {
                contentHTML = '<img src="' + block.content.trim() + '" style="width:100%; height:100%; object-fit:cover; border-radius:1rem;">';
            } else if (block.type === 'poll') {
                const lines = block.content.split('\\n').filter(l => l.trim() !== '');
                contentHTML = '<div style="background:#312e81; padding:40px; border-radius:1rem; height:100%;"><h3>' + lines[0] + '</h3><ul>' + lines.slice(1).map(l => '<li>'+l+'</li>').join('') + '</ul></div>';
            }
            return \`<div class="component-block" style="left: \${block.x}px; top: \${block.y}px; width: \${block.w}px; height: \${block.h}px; z-index: \${block.z};">\${contentHTML}</div>\`;
        }

        function render() {
            player.innerHTML = '';
            if (isSpatial) {
                const world = document.createElement('div');
                world.id = 'world';
                world.className = 'spatial-container';
                player.appendChild(world);
                slides.forEach((slide, i) => {
                    const div = document.createElement('div');
                    div.className = 'spatial-slide flex items-center justify-center';
                    
                    const angle = (i / slides.length) * Math.PI * 2;
                    const radius = 1500 * Math.max(1, slides.length / 4);
                    const x = Math.sin(angle) * radius;
                    const z = Math.cos(angle) * radius;
                    const rotationY = (angle * 180 / Math.PI);

                    div.style.transform = \`translate3d(\${x}px, 0, \${z}px) rotateY(\${rotationY}deg)\`;
                    
                    let blocksHTML = slide.blocks.map(b => renderBlock(b)).join('');
                    div.innerHTML = \`<div class="slide-content relative">\${blocksHTML}</div>\`;
                    world.appendChild(div);
                });
            } else {
                slides.forEach((slide, i) => {
                    const div = document.createElement('div');
                    div.className = 'slide-frame' + (i === 0 ? ' active' : '');
                    div.id = 's' + i;
                    let blocksHTML = slide.blocks.map(b => renderBlock(b)).join('');
                    div.innerHTML = \`<div class="slide-content relative">\${blocksHTML}</div>\`;
                    player.appendChild(div);
                });
            }
            update();
        }

        function next() { if(current < slides.length - 1) { current++; update(); } }
        function prev() { if(current > 0) { current--; update(); } }

        function update() {
            const scale = Math.min(window.innerWidth/1920, window.innerHeight/1080);
            
            if (isSpatial) {
                const world = document.getElementById('world');
                if(world) {
                    const angle = (current / slides.length) * Math.PI * 2;
                    const radius = 1500 * Math.max(1, slides.length / 4);
                    const x = -Math.sin(angle) * radius;
                    const z = -Math.cos(angle) * radius;
                    const rotationY = -(angle * 180 / Math.PI);
                    
                    world.style.transform = \`scale(\${scale * 0.8}) translate3d(0,0,-1000px) rotateY(\${rotationY}deg) translate3d(\${x}px, 0, \${z}px)\`;
                    setTimeout(() => {
                        world.style.transform = \`scale(\${scale * 0.8}) translate3d(0,0,0) rotateY(\${rotationY}deg) translate3d(\${x}px, 0, \${z}px)\`;
                    }, 50);
                }
            } else {
                document.querySelectorAll('.slide-frame').forEach((f, i) => {
                    f.className = 'slide-frame' + (i === current ? ' active' : '');
                    if (i === current) f.style.transform = 'translateX(0)';
                    else if (i < current) f.style.transform = 'translateX(-100%)';
                    else f.style.transform = 'translateX(100%)';
                    
                    const content = f.querySelector('.slide-content');
                    if(content) content.style.transform = \`scale(\${scale})\`;
                });
            }
            document.getElementById('pos').textContent = (current + 1) + ' / ' + slides.length;
        }

        window.addEventListener('keydown', e => {
            if(e.key === 'ArrowRight' || e.key === ' ') next();
            if(e.key === 'ArrowLeft') prev();
        });

        render();
        window.addEventListener('resize', update);
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_LiveDeck.html`;
        a.click();
    },

    debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }
};
