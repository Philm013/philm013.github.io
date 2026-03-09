//--- START OF FILE game.js ---


// --- GEMINI INTEGRATION: Import the service functions ---
import { getStrategicAdvice, getMissionControlNarrative, setApiKey, hasApiKey, setModel, getSelectedModel } from './gemini-service.js';


document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DEFINITIONS ---
    const GRID_WIDTH = 25, GRID_HEIGHT = 20; // Viewport dimensions
    const WORLD_WIDTH = 100, WORLD_HEIGHT = 80;
    const COMMAND_RADIUS = 12; // --- GAMEPLAY REFINEMENT: Player build radius ---
    
    const DB_NAME = 'ProjectNovaDB_v24'; // Version bump for new save structure
    const DB_STORE_NAME = 'gameStateStore';
    const DB_KEY = 'currentGameState';
    
    const RECRUIT_COST = { biomass: 50, components: 10 };

    // --- CANVAS RENDERER STATE ---
    const canvases = {};
    const contexts = {};
    const imageCache = {};
    const CELL_SIZE = 48; // Base size for drawing, will be scaled
    let lastRenderTime = 0;
    let renderLoopId = null;
    let needsStaticRedraw = true; // Flag to redraw static layers
    let needsDynamicRedraw = true;
    let lastSelectionPanelUpdate = 0; // Renamed for clarity

    // --- 2. GAME STATE & AUDIO ---
    let gameState;
    let gameLoopInterval = null;
    let db;
    let activeModalId = null; // Track the currently open modal
    
    // Input state
    let isDragPlacing = false;
    let activePointers = [];
    let hasPanned = false;
    let panStart = { x: 0, y: 0 };
    let panCameraStart = { x: 0, y: 0 };
    let pinchStartDistance = 0;
    let pinchStartScale = 1;

    // --- GEMINI INTEGRATION: State for dilemmas ---
    let activeDilemma = null;
    
    const audioManager = {
        lastPlayed: {},
        play: (id, volume = 0.5, throttleMs = 0) => {
            const now = Date.now();
            if (throttleMs > 0) {
                if (audioManager.lastPlayed[id] && (now - audioManager.lastPlayed[id]) < throttleMs) {
                    return;
                }
                audioManager.lastPlayed[id] = now;
            }
            try {
                const sound = document.getElementById(`audio-${id}`);
                if(sound) {
                    sound.currentTime = 0;
                    sound.volume = volume;
                    sound.play();
                }
            } catch (e) { /* silent fail for no audio */ }
        }
    };

    // --- 3. INITIALIZATION & DB ---
    async function initializeGame() {
        await initDB();
        
        let loadedState = await loadGame();

        // Compatibility check for saves from older versions
        if (loadedState && (!loadedState.narrativeLog || !loadedState.runtimeDefs)) {
            console.warn("Incompatible save file from a previous version detected. Starting a new game.");
            await clearSave();
            loadedState = null;
        }
        
        // Populate base definitions
        populateDefs(findTiles);

        // If loading a game, merge runtime definitions before loading images
        if (loadedState && loadedState.runtimeDefs) {
            Object.assign(TILE_DEFS, loadedState.runtimeDefs.tileDefs);
            Object.assign(SVG_DEFS, loadedState.runtimeDefs.svgDefs);
        }

        await loadImages();
        
        gameState = loadedState || createNewGameState();
        
        // If we loaded a game, clear any persisted transient effects.
        if (loadedState) {
            gameState.effects = [];
        }

        if (!loadedState) {
            addMessage(gameState, 'DIRECTOR', 'Welcome, Director. Your mission is to establish a self-sustaining colony. Use WASD/Arrows to look around, or click-drag to pan. Start by checking your objectives.');
        }
        
        initializeCanvases();
        if (!loadedState) {
            const { width } = canvases.terrain.getBoundingClientRect();
            gameState.camera.scale = (width / GRID_WIDTH / CELL_SIZE) * 0.9;
            clampCamera();
        }
        renderTopBar();
		setupEventListeners();
        renderAll(); // Initial full render
        
        gameLoopInterval = setInterval(gameTick, 1500);
        lastRenderTime = performance.now(); // Initialize render time
        renderLoopId = requestAnimationFrame(renderLoop);
    }

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = event => {
                const tempDb = event.target.result;
                if (!tempDb.objectStoreNames.contains(DB_STORE_NAME)) {
                    tempDb.createObjectStore(DB_STORE_NAME);
                }
            };
            request.onsuccess = event => { db = event.target.result; resolve(db); };
            request.onerror = event => { console.error("IndexedDB error:", event.target.errorCode); reject(event.target.errorCode); };
        });
    }

    function createNewGameState() {
        const grid = Array(WORLD_HEIGHT).fill(null).map(() => Array(WORLD_WIDTH).fill(null).map(() => ({ terrain: 'plains', building: { type: 'empty', health: 100, task: null, level: 1, connected: { power: false, water: false }, isShielded: false, progress: 0, isUnderAttack: false } })));
        const fog = Array(WORLD_HEIGHT).fill(null).map(() => Array(WORLD_WIDTH).fill(0));
        
        const generatePatches = (type, count, size) => {
            for(let i=0; i<count; i++){
                const patchX = Math.floor(Math.random() * WORLD_WIDTH); const patchY = Math.floor(Math.random() * WORLD_HEIGHT);
                const patchSize = size.min + Math.floor(Math.random() * (size.max - size.min));
                for(let y = -patchSize; y <= patchSize; y++) for(let x = -patchSize; x <= patchSize; x++){
                    if(Math.sqrt(x*x + y*y) <= patchSize && grid[patchY+y]?.[patchX+x]) grid[patchY+y][patchX+x].terrain = type;
                }
            }
        };
        generatePatches('rocky', 20, {min: 3, max: 6});
        generatePatches('ice', 10, {min: 2, max: 4});
        generatePatches('crystalline', 5, {min: 1, max: 2});
        
        const placeUniqueFeature = (type, count=1) => {
            for(let i=0; i<count; i++) {
                let ux, uy;
                do { ux = Math.floor(Math.random() * WORLD_WIDTH); uy = Math.floor(Math.random() * WORLD_HEIGHT);
                } while(grid[uy][ux].terrain !== 'plains' || grid[uy][ux].building.type !== 'empty');
                grid[uy][ux].building = { type: type, health: 100, task: null, level: 1, connected:{}, isShielded: false, progress: 0, work: 0, isUnderAttack: false };
            }
        }
        placeUniqueFeature('vent', 4);
        placeUniqueFeature('anomaly', 8);
        placeUniqueFeature('rich-mineral-deposit', 12);
        placeUniqueFeature('crashed-satellite', 6);
        placeUniqueFeature('alien-ruins', 5);
        placeUniqueFeature('alien-hive', 3);
        placeUniqueFeature('bioluminescent-fungi', 10);
        placeUniqueFeature('crashed-freighter', 2);
        
        for (let i = 0; i < 2; i++) {
            let outpostPlaced = false;
            while (!outpostPlaced) {
                const ox = 10 + Math.floor(Math.random() * (WORLD_WIDTH - 20));
                const oy = 10 + Math.floor(Math.random() * (WORLD_HEIGHT - 20));
                if (grid[oy][ox].building.type === 'empty') {
                    grid[oy][ox].building = { type: 'solarPanel', health: 20, level: 1, connected: {}, isShielded: false, progress: 0, isUnderAttack: false };
                    grid[oy+1][ox].building = { type: 'battery', health: 15, level: 1, connected: {}, isShielded: false, progress: 0, isUnderAttack: false };
                    grid[oy][ox+1].building = { type: 'power-conduit', health: 50, level: 1, connected: {}, isShielded: false, progress: 0, isUnderAttack: false };
                    outpostPlaced = true;
                }
            }
        }

        const hx = Math.floor(WORLD_WIDTH / 2), hy = Math.floor(WORLD_HEIGHT / 2);
        grid[hy][hx].terrain = 'plains';
		grid[hy][hx + 1].terrain = 'plains';
        grid[hy][hx].building = { type: 'habitat', health: 100, task: null, level: 1, connected: { power: true, water: true }, isShielded: false, progress: 0, isUnderAttack: false };
		grid[hy][hx + 1].building = { type: 'defense-turret', health: 100, task: null, level: 1, connected: { power: true }, isShielded: false, progress: 0, isUnderAttack: false };

        const newState = {
            time: 0, dayNightCycle: { isDay: true, timeOfDay: 0, duration: 40 },
            resources: { metal: 200, biomass: 100, power: 100, water: 100, battery: 0, research: 25, components: 5, exoticMatter: 0 },
            resourceDeltas: { metal: 0, biomass: 0, water: 0, components: 0, exoticMatter: 0, research: 0 },
            world: { width: WORLD_WIDTH, height: WORLD_HEIGHT, grid, fog },
			specialists: [], vehicles: [], effects: [],
            camera: { x: hx, y: hy, scale: 1 }, // Centered camera
            messages: [], tech: { 'basic-power': true, 'basic-life-support': true, 'basic-infrastructure': true },
            milestones: {}, selection: { active: false, type: null, id: null }, placement: { active: false, type: null },
            housingCapacity: 0, 
            events: { 
                dustStorm: { active: false, duration: 0 }, 
                solarFlare: { active: false, duration: 0 },
                magneticStorm: { active: false, duration: 0 },
                bioluminescentBloom: { active: false, duration: 0 },
                activeBonuses: [],
            },
            temporaryModifiers: [], // For AI-driven building buffs/debuffs
            objectives: { current: 'research_robotics', completed: [] },
            gameOver: false, revealedTileCount: 0, lastThreatTime: 0, threatLevel: 1, threats: { nextWaveTime: 100, waveCount: 0, active: [], survivedWaves: 0 },
            artifacts: { active: [], discovered: [] },
            lastMissionControlTime: 0,
            narrativeLog: [], // For narrative memory
            runtimeDefs: { tileDefs: {}, svgDefs: {} } // For dynamic POIs
        };

        grantNewSpecialist(newState, "Engineer", {x: hx, y: hy});
        grantNewSpecialist(newState, "Biologist", {x: hx, y: hy});
        return newState;
    }

    // --- 4. CORE GAME LOOP ---
    function gameTick() {
        if (!gameState || gameState.gameOver) return;

        // --- I. STATE UPDATES ---
        gameState.time++;
        checkGameEndConditions();
        if (gameState.gameOver) return; // Prevent tick from continuing if game ended
        updateDayNight();
        updateInfrastructure();
        updateFogOfWar();
        updateVehicles();
        updateThreats();
        updateDefenses();
        updateSpecialists();
        updateProductionAndConsumption();
        updateMaintenanceAndShields();
        updateArtifacts();
        checkAndApplyMilestones();
        updateObjectives();
        updateNotificationIndicator(); 
        runEvents();
        updateTemporaryModifiers();
        checkAndHandleDestruction();
        triggerMissionControlEvent();
        
        // --- II. SAVE ---
        saveGame();
    }
    
    function checkGameEndConditions() {
        const habitat = findTiles(c => c.building.type === 'habitat')[0];
        if (!habitat || habitat.building.health <= 0) {
            endGame(false, "Your habitat has been destroyed. The mission is a failure.");
        } else if (gameState.specialists.length === 0 && !gameState.milestones.victory) {
            endGame(false, "All specialists have been lost. The colony has perished.");
        } else if (gameState.milestones.victory) {
            endGame(true, "The Terraformer Seed has been activated! You have successfully established a foothold for humanity among the stars. The planet is saved.");
        }
    }

    function checkAndHandleDestruction() {
        // Handle destroyed buildings
        findTiles(c => c.building.type !== 'empty' && c.building.health <= 0).forEach(destroyedCell => {
            const {x, y} = destroyedCell;
            const buildingType = destroyedCell.building.type;
            const def = TILE_DEFS[buildingType];
            
            // POIs are not "destroyed" by damage, but by specialist actions.
            // The habitat destruction is a game-over condition handled elsewhere.
            if (!def || def.isPOI || buildingType === 'habitat') {
                return;
            }

            addAlert(`${def.name} at (${x}, ${y}) has been destroyed!`, 'alert', {x,y});
            audioManager.play('explosion', 0.6);
            
            // Make any threat that was targeting this building find a new target
            gameState.threats.active.forEach(threat => {
                if (threat.target && threat.target.x === x && threat.target.y === y) {
                    threat.target = null;
                }
            });
             // Make any specialist working on this building stop
            gameState.specialists.forEach(s => {
                if(s.task?.targetBuilding?.x === x && s.task?.targetBuilding?.y === y) {
                    setSpecialistTask(s, { current: 'idle' });
                }
            });

            // If the player was looking at the destroyed building, clear the selection panel
            if (gameState.selection.active && gameState.selection.type === 'building' && gameState.selection.x === x && gameState.selection.y === y) {
                clearSelection();
            }
            
            // Replace building with empty space
            gameState.world.grid[y][x].building = { type: 'empty', health: 100, task: null, level: 1, connected: { power: false, water: false }, isShielded: false, progress: 0, isUnderAttack: false };
            
            needsStaticRedraw = true;
            renderMinimap();
        });
    }

    function updateDayNight() {
        const cycle = gameState.dayNightCycle; cycle.timeOfDay++;
        if (cycle.timeOfDay >= cycle.duration) { 
            cycle.timeOfDay = 0; 
            cycle.isDay = !cycle.isDay; 
            addMessage(gameState, 'INFO', `It is now ${cycle.isDay ? 'Day' : 'Night'}.`); 
            needsStaticRedraw = true;
        }
    }
    
    function updateInfrastructure() {
        const wasChanged = new Set();
        gameState.world.grid.forEach((row,y) => row.forEach((cell,x) => {
            const oldPower = cell.building.connected.power;
            const oldWater = cell.building.connected.water;
            cell.building.connected = { power: false, water: false };
            if(oldPower || oldWater) wasChanged.add(`${x},${y}`);
        }));

        const propagate = (infraType, networkType) => {
            const queue = [];
            findTiles(c => TILE_DEFS[c.building.type]?.isSource?.[networkType]).forEach(c => {
                c.building.connected[networkType] = true;
                wasChanged.add(`${c.x},${c.y}`);
                queue.push({x: c.x, y: c.y});
            });

            const visited = new Set();
            while(queue.length > 0) {
                const {x, y} = queue.shift();
                const key = `${x},${y}`;
                if (visited.has(key)) continue;
                visited.add(key);

                [{dx:0,dy:1}, {dx:0,dy:-1}, {dx:1,dy:0}, {dx:-1,dy:0}].forEach(({dx, dy}) => {
                    const nx = x + dx, ny = y + dy;
                    if (isConnectable(nx, ny, networkType, infraType)) {
                        const neighbor = gameState.world.grid[ny]?.[nx];
                        if (neighbor && !neighbor.building.connected[networkType]) {
                            neighbor.building.connected[networkType] = true;
                            wasChanged.add(`${nx},${ny}`);
                            queue.push({x: nx, y: ny});
                        }
                    }
                });
            }
        };

        propagate('power-conduit', 'power');
        propagate('water-pipe', 'water');

        if (wasChanged.size > 0) needsStaticRedraw = true;
    }
    
    function updateFogOfWar() {
        let revealedCount = 0;
        let mapChanged = false;
        const isBloom = gameState.events.bioluminescentBloom.active;
        
        for (let y = 0; y < WORLD_HEIGHT; y++) for (let x = 0; x < WORLD_WIDTH; x++) {
            if (gameState.world.fog[y][x] >= 2) {
                gameState.world.fog[y][x] = 1; // Mark as shrouded (memory)
                mapChanged = true;
            }
        }

        const revealTile = (x, y, level = 3) => {
            if (gameState.world.fog[y]?.[x] !== undefined) {
                if (gameState.world.fog[y][x] === 0) {
                    revealedCount++;
                    mapChanged = true;
                }
                if (gameState.world.fog[y][x] < level) {
                    gameState.world.fog[y][x] = level;
                }
            }
        };
        
        if (isBloom) {
            for (let y = 0; y < WORLD_HEIGHT; y++) for (let x = 0; x < WORLD_WIDTH; x++) {
                revealTile(x, y, 3);
            }
        } else {
            findTiles(c => c.building.type !== 'empty').forEach(b => {
                const sight = TILE_DEFS[b.building.type]?.sightRadius || 2; // Default sight is 2
                findTilesInRadius(b.x, b.y, sight, () => true, true).forEach(t => revealTile(t.x, t.y, 3));
                
                // Sensor Arrays provide long-range ping (Tier 2)
                if (b.building.type === 'sensor-array' && b.building.connected.power) {
                    let radarRadius = 15;
                    if (gameState.tech['deep-scan']) radarRadius = 25;
                    findTilesInRadius(b.x, b.y, radarRadius, () => true, true).forEach(t => revealTile(t.x, t.y, 2));
                }
            });
            gameState.specialists.forEach(s => {
                 const sight = s.type === 'Ranger' ? 6 : 3;
                 findTilesInRadius(s.x, s.y, sight, () => true, true).forEach(t => revealTile(t.x, t.y, 3));
            });
            gameState.vehicles.forEach(v => {
                findTilesInRadius(v.x, v.y, v.sightRadius || 4, () => true, true).forEach(t => revealTile(t.x, t.y, 3));
            });
        }
        
        gameState.revealedTileCount += revealedCount;
        if(mapChanged) {
            needsStaticRedraw = true;
            renderMinimap();
        }
    }

    function updateVehicles() {
        gameState.vehicles.forEach(v => {
            if ((v.task.type === 'move' || v.task.type === 'remote-build') && v.task.path.length > 0) {
                const nextPos = v.task.path[0];
                const dist = Math.hypot(nextPos.x - v.x, nextPos.y - v.y);
    
                if (dist < 0.2) { 
                    v.task.path.shift();
                    if(v.task.path.length === 0) { // Arrived at destination
                       // FIX: Use the stored target from the task, not the vehicle's current position.
                       const targetCoords = v.task.target;
                       if (targetCoords) {
                           const targetBuilding = gameState.world.grid[targetCoords.y][targetCoords.x].building;
                           if (targetBuilding.type === 'crashed-satellite') {
                               setVehicleTask(v, 'salvage', { progress: 0, target: targetCoords });
                           } else if (targetBuilding.type === 'crashed-freighter' && v.type === 'constructor-rover') {
                               setVehicleTask(v, 'deconstruct-poi', { progress: 0, target: targetCoords });
                           } else {
                               setVehicleTask(v, 'idle');
                           }
                       } else {
                           // Fallback if target wasn't stored for some reason
                           setVehicleTask(v, 'idle');
                       }
                    }
                }
            } else if (v.task.type === 'salvage') {
                v.task.progress += 1;
                if(v.task.progress >= 10) { 
                    addAlert('Satellite Salvaged!', 'success', {x: v.x, y: v.y});
                    audioManager.play('success', 0.4);
                    if (Math.random() > 0.5) {
                        const metalGain = 50 + Math.floor(Math.random() * 50);
                        const compGain = 5 + Math.floor(Math.random() * 10);
                        gameState.resources.metal += metalGain;
                        gameState.resources.components += compGain;
                        addMessage(gameState, 'INFO', `Recovered ${metalGain} Metal and ${compGain} Components.`);
                    } else {
                        const availableTechs = Object.keys(TECH_TREE).filter(t => !gameState.tech[t] && TECH_TREE[t].requires && gameState.tech[TECH_TREE[t].requires]);
                        if(availableTechs.length > 0) {
                            const freeTechId = availableTechs[Math.floor(Math.random() * availableTechs.length)];
                            unlockTech(freeTechId);
                            addMessage(gameState, 'DIRECTOR', `Salvage data unlocked new tech: ${TECH_TREE[freeTechId].name}!`);
                        }
                    }
                    gameState.world.grid[v.task.target.y][v.task.target.x].building = { type: 'empty', health: 100, task: null, level: 1, connected:{}, isShielded: false, progress: 0, isUnderAttack: false };
                    setVehicleTask(v, 'idle');
                    needsStaticRedraw = true;
                }
            } else if (v.task.type === 'deconstruct-poi') {
                 v.task.progress += 1;
                 const poi = gameState.world.grid[v.task.target.y][v.task.target.x];
                 const workRequired = TILE_DEFS[poi.building.type].workRequired || 100;
                 if (v.task.progress >= workRequired) {
                    addAlert('Freighter Deconstructed!', 'success', {x: v.x, y: v.y});
                    audioManager.play('success', 0.6);
                    const metalGain = 500 + Math.floor(Math.random() * 200);
                    const compGain = 50 + Math.floor(Math.random() * 30);
                    gameState.resources.metal += metalGain;
                    gameState.resources.components += compGain;
                    addMessage(gameState, 'INFO', `Recovered ${metalGain} Metal and ${compGain} Components from the freighter.`);
                    grantArtifact(ARTIFACTS['auto-repair-nanites']);
                    poi.building = { type: 'empty', health: 100, task: null, level: 1, connected:{}, isShielded: false, progress: 0, isUnderAttack: false };
                    setVehicleTask(v, 'idle');
                    needsStaticRedraw = true;
                 }
            } else if (v.task.type === 'remote-build') {
                const { target, buildingType } = v.task;
                const dist = Math.hypot(target.x - v.x, target.y - v.y);
                
                if ((!v.task.path || v.task.path.length === 0) && dist > 1.5) {
                    const path = pathfindAStar({ x: Math.floor(v.x), y: Math.floor(v.y) }, target, true);
                    if (path) {
                        v.task.path = path;
                    } else {
                        addMessage(gameState, 'EVENT', `${v.name} cannot reach build site. Refunding resources.`);
                        const cost = TILE_DEFS[buildingType].cost;
                        if(cost) Object.entries(cost).forEach(([res, val]) => gameState.resources[res] += val);
                        setVehicleTask(v, 'idle');
                        renderTopBarValues();
                    }
                }
                
                if (v.task.path?.length > 0) {
                    const nextPos = v.task.path[0];
                    const nodeDist = Math.hypot(nextPos.x - v.x, nextPos.y - v.y);
                    if (nodeDist < 0.2) v.task.path.shift();
                }
    
                if ((!v.task.path || v.task.path.length === 0) && dist <= 1.5) {
                    v.task.progress = (v.task.progress || 0) + 1;
                    if (v.task.progress >= 15) {
                        placeBuilding(target.x, target.y, buildingType, true);
                        addMessage(gameState, 'INFO', `${v.name} completed remote construction of ${TILE_DEFS[buildingType].name}.`);
                        setVehicleTask(v, 'idle');
                    }
                }
            }

            // --- NEW: Combat Logic for vehicles that can attack ---
            if (v.damage > 0) {
                v.attackCooldown = Math.max(0, (v.attackCooldown || 0) - 1);
                if (v.attackCooldown <= 0) {
                    const potentialTargets = gameState.threats.active
                        .filter(t => t.targetable && Math.hypot(t.x - v.x, t.y - v.y) <= v.range)
                        .sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y));
    
                    if (potentialTargets.length > 0) {
                        const target = potentialTargets[0];
                        target.health -= Math.max(1, v.damage - (target.defense || 0));
                        createEffect('projectile', v.x, v.y, target.x, target.y, null, 'var(--accent-hover)');
                        audioManager.play('turret', 0.3, 400);
                        v.attackCooldown = VEHICLE_DEFS[v.type].stats.attackCooldownMax;
                    }
                }
            }
        });
    }

    function updateThreats() {
        const threatState = gameState.threats;

        threatState.active.forEach(t => {
            t.isSlowed = false;
            t.targetable = !t.isBurrowed;
        });

        if (threatState.waveCount > threatState.survivedWaves && threatState.active.length === 0) {
            threatState.survivedWaves = threatState.waveCount;
            addMessage(gameState, 'DIRECTOR', `Threat neutralized. Well done.`);
            triggerMissionControlEvent({ event: 'wave_survived', wave: threatState.waveCount });
        }

        if (threatState.active.length === 0) {
            let shouldSpawn = false;
            let signature = 10;
            findTiles(c => c.building.type !== 'empty').forEach(t => {
                if (t.building.type === 'sensor-array') signature += 50;
                if (t.building.type === 'habitat' || t.building.type === 'command-post') signature += 10;
                if (TILE_DEFS[t.building.type].produces?.power || TILE_DEFS[t.building.type].produces?.power_solar) signature += 5;
            });

            if (threatState.waveCount === 0) {
                if (gameState.tech['automated-defense'] && gameState.time > 100) shouldSpawn = true;
            } else if (gameState.time > threatState.nextWaveTime) {
                shouldSpawn = true;
            }

            if (shouldSpawn) {
                threatState.waveCount++;
                const isBossWave = threatState.waveCount > 0 && threatState.waveCount % 5 === 0;

                // Scale wave size by signature
                let baseWaveSize = 2 + Math.floor(threatState.waveCount / 2);
                let waveSize = baseWaveSize + Math.floor(signature / 100);

                if(isBossWave) {
                    addAlert(`MASSIVE lifeform detected! Boss wave approaching!`, 'alert');
                    spawnThreat('boss-critter');
                    waveSize += 2;
                } else {
                    addAlert(`Alien wave ${threatState.waveCount} approaching! (Signature: ${signature})`, 'alert');
                }
                audioManager.play('alert', 0.6);

                for (let i = 0; i < waveSize; i++) {
                    const threatTypes = ['critter', 'swarmer', 'armored-behemoth', 'spitter', 'corruptor', 'psion'];
                    const randomType = threatTypes[Math.floor(Math.random() * threatTypes.length)];
                    spawnThreat(randomType);
                    if(gameState.time > 300 && Math.random() < 0.2) spawnThreat('burrower');
                }
                // High signature decreases time between waves
                let cooldown = 150 - Math.min(100, Math.floor(signature / 5));
                threatState.nextWaveTime = gameState.time + cooldown + (Math.random() * 50);
                renderMinimap();
            }
        }        
        if(gameState.time % 20 === 0) {
            let newHiveThreats = false;
            findTiles(c => c.building.type === 'alien-hive').forEach(hive => {
                if(Math.random() < 0.3) {
                    spawnThreat('critter', hive.x, hive.y);
                    newHiveThreats = true;
                }
            });
            if (newHiveThreats) renderMinimap();
        }

        threatState.active.forEach(threat => {
            if (threat.target && (threat.target.building.health <= 0 || threat.target.building.type === 'empty')) {
                threat.target = null;
            }
            if (!threat.target) {
                threat.target = findBestTargetForThreat(threat);
            }
            if (!threat.target) return;
            
            const dist = Math.hypot(threat.target.x - threat.x, threat.target.y - threat.y);
            const attackRange = threat.range || 1.5;

            if (dist <= attackRange) {
                threat.attackCooldown = (threat.attackCooldown || 10) -1;
                 if (threat.attackCooldown <= 0) {
                    if (threat.isPsionic) {
                        gameState.resources.power -= threat.damage;
                    } else if (threat.damage > 0) {
                        threat.target.building.health -= threat.damage;
                        threat.target.building.isUnderAttack = true;
                    }
                    if(threat.target.building.health < 0) threat.target.building.health = 0;
                    
                    if(threat.range > 1.5) {
                        createEffect('projectile', threat.x, threat.y, threat.target.x, threat.target.y, null, 'var(--exotic-color)');
                    } else {
                        createEffect('explosion', threat.target.x, threat.target.y, null, null, 0.5, 'var(--error-color)');
                    }
                    threat.attackCooldown = 10;
                 }
            }

            // Burrower logic is separate and overrides standard attack
            if (threat.type === 'burrower') {
                if (threat.isBurrowed) {
                    if (dist < 1.5) {
                        threat.isBurrowed = false; // Emerge to attack
                        createEffect('explosion', threat.x, threat.y, null, null, 1, '#a16207');
                    }
                } else { // Is emerged - ATTACK LOGIC
                    threat.attackCooldown = (threat.attackCooldown || 0) -1;
                    if (threat.attackCooldown <= 0) {
                        threat.target.building.health -= threat.damage;
                        if(threat.target.building.health < 0) threat.target.building.health = 0;
                        threat.isBurrowed = true; // Burrow after attacking
                        threat.target = null; // Find a new target next tick
                    }
                }
            }
        });
    }
    
    function updateDefenses() {
        gameState.threats.active.forEach(t => t.isSlowed = false);

        findTiles(c => c.building.type === 'slowing-field-projector' && checkBuildingConnections(c.x, c.y).isPowered).forEach(projector => {
            const def = TILE_DEFS['slowing-field-projector'];
            gameState.threats.active.forEach(t => {
                if (Math.hypot(t.x - projector.x, t.y - projector.y) <= def.radius) {
                    t.isSlowed = true;
                }
            });
        });

        findTiles(c => c.building.type === 'emp-minefield').forEach(mine => {
            const def = TILE_DEFS['emp-minefield'];
            const triggeredThreat = gameState.threats.active.find(t => Math.hypot(t.x - mine.x, t.y - mine.y) <= def.triggerRadius);
            if (triggeredThreat) {
                addMessage(gameState, 'INFO', `EMP Mine at (${mine.x}, ${mine.y}) detonated!`);
                audioManager.play('explosion', 0.7);
                createEffect('explosion', mine.x, mine.y, null, null, def.blastRadius, 'var(--accent-color)');
                gameState.threats.active.forEach(t => {
                    if (Math.hypot(t.x - mine.x, t.y - mine.y) <= def.blastRadius) {
                        t.health -= def.damage;
                        t.isSlowed = true;
                    }
                });
                mine.building.type = 'empty';
                needsStaticRedraw = true;
                renderMinimap();
            }
        });

        findTiles(c => TILE_DEFS[c.building.type]?.damage > 0 && checkBuildingConnections(c.x, c.y).isPowered).forEach(turret => {
            const def = TILE_DEFS[turret.building.type];
            let { damage, radius } = getBuffedTurretStats(turret.x, turret.y);
            
            // Apply Corruptor debuff
            gameState.threats.active.forEach(threat => {
                if (threat.type === 'corruptor' && Math.hypot(threat.x - turret.x, threat.y - turret.y) <= (threat.debuffAura?.radius || 0)) {
                    damage *= (threat.debuffAura?.effect?.damageModifier || 1);
                }
            });

            const targets = gameState.threats.active.filter(t => t.targetable && Math.hypot(t.x - turret.x, t.y - turret.y) <= radius);

            if (turret.building.type === 'artillery-cannon') {
                if (turret.building.cooldown > 0) { turret.building.cooldown--; return; }
                if(targets.length > 0) {
                    const target = targets[0];
                    turret.building.cooldown = def.cooldown;
                    audioManager.play('explosion', 0.5, 2000);
                    createEffect('projectile', turret.x, turret.y, target.x, target.y, null, 'var(--warning-color)');
                    setTimeout(() => {
                        createEffect('explosion', target.x, target.y, null, null, def.areaOfEffect, 'orange');
                        gameState.threats.active.forEach(tInAoE => {
                           if(Math.hypot(tInAoE.x - target.x, tInAoE.y - target.y) <= def.areaOfEffect) {
                               tInAoE.health -= damage - (tInAoE.defense || 0);
                           }
                        });
                    }, 500);
                }
            } else {
                if(targets.length > 0) {
                    const target = targets[0];
                    target.health -= Math.max(1, damage - (target.defense || 0));
                    audioManager.play('turret', 0.2, 300);
                    createEffect('projectile', turret.x, turret.y, target.x, target.y, null, 'var(--error-color)');
                }
            }
        });

        const initialCount = gameState.threats.active.length;
        gameState.threats.active = gameState.threats.active.filter(t => t.health > 0);
        if(gameState.threats.active.length < initialCount) {
             needsDynamicRedraw = true;
             renderMinimap();
        }
    }

function updateMaintenanceAndShields() {
    gameState.world.grid.flat().forEach(cell => cell.building.isShielded = false);
    
    findTiles(c => c.building.type === 'shield-generator' && checkBuildingConnections(c.x, c.y).isPowered).forEach(shield => {
        const radius = TILE_DEFS['shield-generator'].radius * (shield.building.level || 1);
        findTilesInRadius(shield.x, shield.y, radius, c => c.building.type !== 'empty', true).forEach(tile => tile.building.isShielded = true);
    });

    findTiles(c => c.building.type === 'maintenance-hub' && checkBuildingConnections(c.x, c.y).isPowered).forEach(hub => {
        if (gameState.resources.metal < 0.2) return;
        const radius = TILE_DEFS['maintenance-hub'].radius;
        const targets = findTilesInRadius(hub.x, hub.y, radius, c => c.building.health < 100 && c.building.type !== 'empty' && !TILE_DEFS[c.building.type].isPOI, true);
        if (targets.length > 0) {
            targets[0].building.health += 5;
            gameState.resources.metal -= 0.2;
            if (targets[0].building.health > 100) targets[0].building.health = 100;
        }
    });
}



// in js/game.js

function updateSpecialists() {
    // Clear old task icons
    gameState.world.grid.flat().forEach(cell => cell.building.task = null);

    // Handle housing penalty
    if(gameState.specialists.length > gameState.housingCapacity) {
        if(gameState.time % 4 === 0) addMessage(gameState, 'EVENT', `Insufficient housing! ${gameState.specialists.length}/${gameState.housingCapacity} specialists. Colony productivity reduced.`);
    }

    const activeSpecialists = gameState.specialists.slice(0, gameState.housingCapacity);

    activeSpecialists.forEach(s => {
        // --- NEW: Sentinel Combat Logic ---
        if (s.skill === 'Sentinel' && s.task.current !== 'returning_home') {
            s.attackCooldown = Math.max(0, (s.attackCooldown || 0) - 1);
            if (s.attackCooldown <= 0) {
                const range = 6;
                const damage = 15;
                const potentialTargets = gameState.threats.active
                    .filter(t => t.targetable && Math.hypot(t.x - s.x, t.y - s.y) <= range)
                    .sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));

                if (potentialTargets.length > 0) {
                    const target = potentialTargets[0];
                    target.health -= Math.max(1, damage - (target.defense || 0));
                    createEffect('projectile', s.x, s.y, target.x, target.y, null, 'var(--error-color)');
                    audioManager.play('turret', 0.2, 400);
                    s.attackCooldown = 10;
                }
            }
        }

        const station = s.stationId ? gameState.world.grid[s.stationId.y][s.stationId.x] : null;        const stationDef = station ? TILE_DEFS[station.building.type] : null;
        const operationalRadius = stationDef?.provides?.specialist_station_radius ?? Math.max(WORLD_WIDTH, WORLD_HEIGHT);

        // STATE: IDLE (or returning home)
        if (s.task.current === 'idle' || s.task.current === 'returning_home') {
            s.task.targetBuilding = null; // Clear previous target
            
            // --- FIX: Remove buggy and redundant re-pathing/arrival logic ---
            // A specialist returning home should not look for new jobs. 
            // The `updatePositions` function handles movement and sets their state to 'idle' on arrival.
            if (s.task.current === 'returning_home') {
                return; // Don't look for a new job while returning.
            }

            // At this point, the specialist's current task is guaranteed to be 'idle'.
            let jobFound = false;

            if (s.task.priorityTarget) {
                const targetCell = gameState.world.grid[s.task.priorityTarget.y]?.[s.task.priorityTarget.x];
                if (targetCell) {
                    if (doesTaskMatchBuilding(s.primaryJob, targetCell.building.type, targetCell.building, s)) {
                        const path = pathfindAStar({ x: Math.round(s.x), y: Math.round(s.y) }, s.task.priorityTarget, false);
                        if (path) {
                            setSpecialistTask(s, { current: 'moving_to_job', path, targetBuilding: s.task.priorityTarget });
                            jobFound = true; 
                        } else {
                            addMessage(gameState, 'EVENT', `${s.name} cannot find a path to the priority target. Clearing.`);
                            s.task.priorityTarget = null;
                        }
                    }
                } else {
                    s.task.priorityTarget = null;
                }
            }

            if (!jobFound) {
                const potentialTargets = findPotentialJobs(s, operationalRadius);
                const target = potentialTargets.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];

                if (target) {
                    const path = pathfindAStar({ x: Math.round(s.x), y: Math.round(s.y) }, { x: target.x, y: target.y }, false);
                    
                    if (path) { 
                        if (path.length > 0) {
                            setSpecialistTask(s, { current: 'moving_to_job', path, targetBuilding: { x: target.x, y: target.y } });
                        } else {
                            setSpecialistTask(s, { current: 'working', targetBuilding: { x: target.x, y: target.y } });
                        }
                    } 
                }
            }
        }
        // STATE: WORKING
        else if (s.task.current === 'working') {
            const targetBuildingCell = gameState.world.grid[s.task.targetBuilding.y]?.[s.task.targetBuilding.x];
            if (!targetBuildingCell) { setSpecialistTask(s, { current: 'idle' }); return; }
            const targetBuilding = targetBuildingCell.building;
            const def = TILE_DEFS[targetBuilding.type];
            targetBuilding.task = def.taskIcon;

            let workComplete = false;
            const workType = s.primaryJob;
            
            // --- FIX: Categorize jobs to prevent continuous jobs from ending prematurely ---
            const oneOffJobs = ['Investigating', 'Harvesting', 'Assault', 'Deconstruction'];
            const continuousJobs = ['Mining', 'Pumping', 'Farming', 'Fabricating', 'Research', 'Charging'];

            if (workType === 'Build/Repair' && targetBuilding.health < 100) {
                let repairSpeed = SPECIALIST_DEFS.repairSpeed * (1 + s.level * 0.1);
                const repairCost = 0.5;
                if (gameState.resources.metal >= repairCost) {
                    targetBuilding.health += repairSpeed;
                    gameState.resources.metal -= repairCost;
                    if (targetBuilding.health >= 100) {
                        targetBuilding.health = 100;
                        workComplete = true;
                        addAlert(`Repairs complete: ${def.name}`, 'success', {x: s.task.targetBuilding.x, y: s.task.targetBuilding.y});
                        grantXP(s, 20);
                    }
                }
            } else if (oneOffJobs.includes(workType)) {
                targetBuilding.work = (targetBuilding.work || 0) + 1 * (1 + s.level * 0.2);
                if (targetBuilding.work >= (def.workRequired || 100)) {
                    clearPOI(s.task.targetBuilding.x, s.task.targetBuilding.y, s);
                    workComplete = true;
                }
            } else if (continuousJobs.includes(workType)) {
                // This is a continuous job. Grant XP, but the work is never "complete".
                // The specialist will stay here until reassigned or the building is destroyed.
                // The actual resource production is handled in `updateProductionAndConsumption`.
                grantXP(s, 1);
            } else {
                // Fallback for any unhandled job type - treat as instantly complete to avoid getting stuck.
                workComplete = true; 
            }

            if (workComplete) {
                 if (s.task.priorityTarget?.x === s.task.targetBuilding.x && s.task.priorityTarget?.y === s.task.targetBuilding.y) {
                     s.task.priorityTarget = null;
                 }
                 
                 const nextJobTargets = findPotentialJobs(s, operationalRadius);
                 const nextTarget = nextJobTargets.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];

                 // --- START OF FIX ---
                 if (nextTarget) {
                     const pathToNext = pathfindAStar({ x: Math.round(s.x), y: Math.round(s.y) }, { x: nextTarget.x, y: nextTarget.y }, false);
                     
                     if (pathToNext) { // Path is possible
                         if (pathToNext.length > 0) {
                             // Path has steps, so move.
                             setSpecialistTask(s, { current: 'moving_to_job', path: pathToNext, targetBuilding: { x: nextTarget.x, y: nextTarget.y } });
                         } else {
                             // Path is empty, we are already at the job. Start working.
                             setSpecialistTask(s, { current: 'working', targetBuilding: { x: nextTarget.x, y: nextTarget.y } });
                         }
                     } else {
                         // No path found to the next job. Give up and go home.
                         const pathHome = pathfindAStar({ x: Math.round(s.x), y: Math.round(s.y) }, s.stationId, false);
                         if (pathHome && pathHome.length > 0) {
                             setSpecialistTask(s, { current: 'returning_home', path: pathHome });
                         } else {
                             // Can't get home either, or already there. Go idle.
                             setSpecialistTask(s, { current: 'idle' });
                         }
                     }
                 } else {
                     // No other jobs available. Go home.
                     const path = pathfindAStar({ x: Math.round(s.x), y: Math.round(s.y) }, s.stationId, false);
                     if(path && path.length > 0) {
                        setSpecialistTask(s, { current: 'returning_home', path });
                     } else {
                        // Can't get home or already there. Go idle.
                        setSpecialistTask(s, { current: 'idle' });
                     }
                 }
                 // --- END OF FIX ---
            }
        }
    });
}
    










function getProximityBonus(x, y, type) {
        const bonus = { multiplier: 1, capacity: 1 };
        const def = TILE_DEFS[type];
        if (!def || !def.proximityBonus) return bonus;

        def.proximityBonus.forEach(pb => {
            if (checkAdjacency(x, y, pb.type)) {
                if(pb.effect.multiplier) bonus.multiplier *= pb.effect.multiplier;
                if(pb.effect.capacity) bonus.capacity *= pb.effect.capacity;
            }
        });
        return bonus;
    }

    function getBuildingOutputModifier(buildingType) {
        let modifier = 1.0;
        gameState.temporaryModifiers.forEach(mod => {
            if(mod.buildingType === buildingType) {
                modifier *= mod.multiplier;
            }
        });
        return modifier;
    }

    function updateProductionAndConsumption() {
        gameState.resourceDeltas = { metal: 0, biomass: 0, water: 0, components: 0, exoticMatter: 0, research: 0 };
        let pDelta = 0, wDelta = 0, rProd = 0, bProd = 0, mProd = 0, cProd = 0, eProd = 0;
        let batCap = 0, housingCap = 0;
        const isSolarFlare = gameState.events.solarFlare.active;
        
        let artifactPowerBonus = getArtifactBonus('power');
        let artifactResourceBonus = getArtifactBonus('resources');
        
        const researchBonus = getActiveBonus('research_speed');
        const resourceProdBonus = getActiveBonus('resource_production');
        const powerProdBonus = getActiveBonus('power_production');

        const specialistsByWorksite = {};
        gameState.specialists.forEach(s => {
            if (s.task.current === 'working' && s.task.targetBuilding) {
                const key = `${s.task.targetBuilding.x},${s.task.targetBuilding.y}`;
                if(!specialistsByWorksite[key]) specialistsByWorksite[key] = [];
                specialistsByWorksite[key].push(s);
            }
        });

        gameState.world.grid.forEach((row, y) => row.forEach((cell, x) => {
            const building = cell.building; const def = TILE_DEFS[building.type];
            if (!def || building.health < 20) return;
            
            let levelMultiplier = building.level || 1;
            const proxBonus = getProximityBonus(x, y, building.type);
            const { isPowered, hasWater } = checkBuildingConnections(x, y);
            const buildingOutputModifier = getBuildingOutputModifier(building.type);
            const specialistWorkers = specialistsByWorksite[`${x},${y}`] || [];

            if (def.provides?.housing) housingCap += def.provides.housing * levelMultiplier;
            
            let currentCapacity = def.capacity || 0;
            if(building.type === 'battery' && building.level > 1 && def.upgrade?.effect?.capacity) {
                currentCapacity = def.upgrade.effect.capacity;
            }
            if (currentCapacity > 0 && isPowered) batCap += currentCapacity * proxBonus.capacity;

            let currentPowerProduction = 0;
            if (def.produces?.power) currentPowerProduction += def.produces.power * levelMultiplier;
            if (def.produces?.power_solar && gameState.dayNightCycle.isDay && !isSolarFlare) {
                let stormMultiplier = gameState.events.dustStorm.active ? 0.1 : 1;
                if (cell.terrain === 'crystalline') stormMultiplier *= 1.5;
                currentPowerProduction += def.produces.power_solar * stormMultiplier * levelMultiplier;
            }
            pDelta += currentPowerProduction * buildingOutputModifier;
            
            pDelta += (def.consumes?.power || 0) * levelMultiplier;
            wDelta += (def.consumes?.water || 0) * levelMultiplier;
            
            if (def.consumes?.exoticMatter) eProd += def.consumes.exoticMatter * levelMultiplier;
            
            if ((building.type === 'rover-bay' || building.type === 'vehicle-factory') && building.buildQueue?.length > 0 && isPowered) {
                building.queueProgress = (building.queueProgress || 0) + 1;
                const itemToBuild = TILE_DEFS[building.type].builds.find(b => b.type === building.buildQueue[0]);
                if (itemToBuild && building.queueProgress >= itemToBuild.time) {
                    addVehicle(itemToBuild.type, {x, y});
                    building.buildQueue.shift();
                    building.queueProgress = 0;
                    if(gameState.selection.active && gameState.selection.type === 'building' && gameState.selection.x === x && gameState.selection.y === y) {
                        renderSelectionPanel();
                    }
                }
            }
            
            let isWorking = specialistWorkers.length > 0 && (isPowered || def.produces?.power || def.produces?.power_solar) && (!def.requiresInfrastructure?.includes('water') || hasWater);
            let passiveProduction = !def.taskIcon && (isPowered || def.produces?.power || def.produces?.power_solar);

            if (isWorking || passiveProduction) {
                 if (isWorking) {
                    specialistWorkers.forEach(s => s.task.targetBuilding.task = def.taskIcon);
                 }
                 const workerMultiplier = specialistWorkers.length > 0 ? specialistWorkers.length : 1;
                 
                if (def.produces?.water) wDelta += def.produces.water * levelMultiplier * buildingOutputModifier * workerMultiplier;
                if (def.produces?.biomass) bProd += def.produces.biomass * levelMultiplier * buildingOutputModifier * workerMultiplier;
                if (def.produces?.metal) {
                    let metalMultiplier = 1;
                    if (building.onFeature === 'rich-mineral-deposit') metalMultiplier = 2;
                    mProd += def.produces.metal * levelMultiplier * metalMultiplier * buildingOutputModifier * workerMultiplier;
                }
                if (def.produces?.components && gameState.resources.metal >= -(def.consumes?.metal || 0)) {
                    cProd += def.produces.components * levelMultiplier * buildingOutputModifier * workerMultiplier;
                    mProd += (def.consumes?.metal || 0) * workerMultiplier;
                }
                if (def.produces?.research) {
                    let totalResearch = def.produces.research * levelMultiplier * proxBonus.multiplier * buildingOutputModifier * workerMultiplier;
                    if (researchBonus) totalResearch *= researchBonus.multiplier;
                    rProd += totalResearch;
                }
                if (def.produces?.exoticMatter) {
                    let exoticMultiplier = building.onFeature === 'anomaly' ? (gameState.tech['exotic-physics'] ? 2 : 1.5) : 1;
                    eProd += def.produces.exoticMatter * levelMultiplier * exoticMultiplier * buildingOutputModifier * workerMultiplier;
                }

                if (building.type === 'terraformer-seed-vault' && building.progress < 100 && specialistWorkers.length > 0) {
                    const chargeRate = 0.1 * specialistWorkers.length;
                    if (gameState.resources.metal >= 10 && gameState.resources.components >= 2 && gameState.resources.exoticMatter >= 0.5) {
                        building.progress += chargeRate;
                        gameState.resources.metal -= 10;
                        gameState.resources.components -= 2;
                        gameState.resources.exoticMatter -= 0.5;
                        if(building.progress >= 100) {
                            building.progress = 100;
                            gameState.milestones.victory = true;
                        }
                    }
                }
            }
        }));
        
        // Apply Global Bonuses
        pDelta *= artifactPowerBonus * (powerProdBonus ? powerProdBonus.multiplier : 1);
        mProd *= artifactResourceBonus * (resourceProdBonus ? resourceProdBonus.multiplier : 1);
        bProd *= artifactResourceBonus * (resourceProdBonus ? resourceProdBonus.multiplier : 1);
        cProd *= artifactResourceBonus * (resourceProdBonus ? resourceProdBonus.multiplier : 1);

        gameState.housingCapacity = housingCap;
        gameState.powerDelta = pDelta;
        gameState.batteryCapacity = batCap;
        
        if(pDelta > 0) {
            let charge = Math.min(pDelta, batCap - gameState.resources.battery); 
            gameState.resources.battery += charge;
            gameState.resources.power += (pDelta - charge);
        } else {
            let powerNeeded = -pDelta;
            let discharge = Math.min(powerNeeded, gameState.resources.battery);
            gameState.resources.battery -= discharge; 
            gameState.resources.power -= (powerNeeded - discharge);
        }

        if (gameState.resources.power < 0) gameState.resources.power = 0;
        if (gameState.resources.battery < 0) gameState.resources.battery = 0;
        if (gameState.resources.battery > batCap) gameState.resources.battery = batCap;
        
        gameState.resources.water += wDelta;
        if (gameState.resources.water < 0) gameState.resources.water = 0; 
        
        gameState.resourceDeltas.water = wDelta;
        if (isPowered() && !isSolarFlare) {
            gameState.resources.research += rProd;
            gameState.resources.metal += mProd;
            gameState.resources.biomass += bProd;
            gameState.resources.components += cProd;
            gameState.resources.exoticMatter += eProd;

            gameState.resourceDeltas.research = rProd;
            gameState.resourceDeltas.metal = mProd;
            gameState.resourceDeltas.biomass = bProd;
            gameState.resourceDeltas.components = cProd;
            gameState.resourceDeltas.exoticMatter = eProd;
        }
        
        renderTopBarValues();
    }
	
    function runEvents() {
        const storm = gameState.events.dustStorm;
        if (storm.active) {
            storm.duration--;
            if (storm.duration <= 0) { storm.active = false; addMessage(gameState, 'DIRECTOR', 'Dust storm has passed.'); }
            else if (gameState.time % 2 === 0) findTiles(t => t.building.type !== 'empty' && !TILE_DEFS[t.building.type].isUnderground && !t.building.isShielded).forEach(t => t.building.health = Math.max(0, t.building.health - 1));
        } else if (Math.random() < 0.008 && findTiles(c => c.building.type === 'solarPanel').length > 0) {
            storm.active = true; storm.duration = 10 + Math.floor(Math.random() * 10); addAlert('A heavy dust storm has rolled in!', 'event');
        }
        
        const flare = gameState.events.solarFlare;
        if (flare.active) {
            flare.duration--;
            if (flare.duration <= 0) { flare.active = false; addMessage(gameState, 'DIRECTOR', 'The solar flare has subsided.'); }
            else if (gameState.time % 2 === 0) findTiles(t => TILE_DEFS[t.building.type]?.isElectronic && !t.building.isShielded).forEach(t => t.building.health = Math.max(0, t.building.health - 3));
        } else if (Math.random() < 0.0005 && gameState.dayNightCycle.isDay) {
            flare.active = true; flare.duration = 3 + Math.floor(Math.random() * 3); addAlert('Massive solar flare detected! Electronics failing!', 'alert'); audioManager.play('alert');
        }
        
        const magneticStorm = gameState.events.magneticStorm;
        if(magneticStorm.active) {
            magneticStorm.duration--;
            if (magneticStorm.duration <= 0) { magneticStorm.active = false; addMessage(gameState, 'DIRECTOR', 'The magnetic storm has passed.'); }
        } else if (Math.random() < 0.001) {
            magneticStorm.active = true; magneticStorm.duration = 8 + Math.floor(Math.random() * 8);
            addAlert('Magnetic storm disrupting sensors! Minimap and vehicle controls are offline!', 'event');
        }

        const bloom = gameState.events.bioluminescentBloom;
        if(bloom.active) {
            bloom.duration--;
            if(bloom.duration <= 0) { bloom.active = false; addMessage(gameState, 'DIRECTOR', 'The bioluminescent bloom has faded.'); }
        } else if (Math.random() < 0.002 && !gameState.dayNightCycle.isDay) {
            bloom.active = true; bloom.duration = 5 + Math.floor(Math.random() * 5);
            addAlert('A bioluminescent bloom illuminates the landscape!', 'event');
        }

        if (Math.random() < 0.01) {
            const structures = findTiles(t => t.building.type !== 'empty' && !TILE_DEFS[t.building.type].isPOI && !TILE_DEFS[t.building.type].isUnderground && !t.building.isShielded);
            if (structures.length > 0) { 
                const target = structures[Math.floor(Math.random() * structures.length)]; 
                target.building.health -= 30;
                addAlert(`Micrometeorite impact has damaged the ${TILE_DEFS[target.building.type].name}!`, 'event', {x: target.x, y: target.y}); 
            }
        }
        renderOverlays();
    }
    
    function updateTemporaryModifiers() {
        // Process global bonuses from dilemmas
        gameState.events.activeBonuses = gameState.events.activeBonuses.filter(bonus => {
            bonus.duration--;
            if (bonus.duration <= 0) {
                const bonusTypeReadable = bonus.type.replace(/_/g, ' ');
                addMessage(gameState, 'DIRECTOR', `The temporary ${bonusTypeReadable} bonus has expired.`);
                return false;
            }
            return true;
        });

        // Process building-specific modifiers from dilemmas
        gameState.temporaryModifiers = gameState.temporaryModifiers.filter(mod => {
            mod.duration--;
            if (mod.duration <= 0) {
                const buildingName = TILE_DEFS[mod.buildingType]?.name || mod.buildingType;
                addMessage(gameState, 'DIRECTOR', `The temporary modifier for ${buildingName}s has worn off.`);
                return false;
            }
            return true;
        });
    }

    function checkAndApplyMilestones() {
        if (!gameState.milestones.firstLab && findTiles(c => c.building.type === 'lab').length > 0) {
            gameState.milestones.firstLab = true;
            addMessage(gameState, 'DIRECTOR', 'Lab online. A Scientist is en route.');
            grantNewSpecialist(gameState, 'Scientist');
        }
        if (!gameState.milestones.firstWater && gameState.resources.water > 200) {
            gameState.milestones.firstWater = true;
            addMessage(gameState, 'DIRECTOR', 'Stable water supply achieved. A Biologist is on their way.');
            grantNewSpecialist(gameState, 'Biologist');
        }
        if (!gameState.milestones.firstGeothermal && findTiles(c => c.building.type === 'geothermal-plant').length > 0) {
            gameState.milestones.firstGeothermal = true;
            addMessage(gameState, 'DIRECTOR', 'Geothermal power is online. An Engineer is transferring here.');
            grantNewSpecialist(gameState, 'Engineer');
            triggerMissionControlEvent({ event: 'milestone', name: 'firstGeothermal' });
        }
    }

    function updateObjectives() {
        const currentObjectiveId = gameState.objectives.current;
        if (!currentObjectiveId) return;

        const objective = OBJECTIVES[currentObjectiveId];
        if (objective.condition(gameState)) {
            gameState.objectives.completed.push({ id: currentObjectiveId, claimed: false });
            gameState.objectives.current = objective.next;
            
            addMessage(gameState, 'OBJECTIVE', `Objective requirements met: ${objective.name}. Claim your reward in the Objectives panel.`);
            
            if(objective.next) {
                addMessage(gameState, 'OBJECTIVE', `New Objective: ${OBJECTIVES[objective.next].name}`);
            } else {
                addMessage(gameState, 'OBJECTIVE', `All primary objectives complete. The fate of the colony is in your hands.`);
            }
            renderObjectiveBanner();
            if (activeModalId === 'objectives-modal') renderObjectivesModal();
            updateNotificationIndicator();
        }
    }
    
    function grantObjectiveReward(objectiveId) {
        const objective = OBJECTIVES[objectiveId];
        if (!objective || !objective.reward) return;
        
        const reward = objective.reward;
        let rewardMessages = [];

        if (reward.resources) {
            for (const [resource, amount] of Object.entries(reward.resources)) {
                if (gameState.resources.hasOwnProperty(resource)) {
                    gameState.resources[resource] += amount;
                    rewardMessages.push(`${amount} ${resource}`);
                }
            }
        }
        if (reward.specialist) { grantNewSpecialist(gameState, reward.specialist); }
        if (reward.tech) {
            const techsToUnlock = Array.isArray(reward.tech) ? reward.tech : [reward.tech];
            let unlockedTechNames = [];
            techsToUnlock.forEach(techId => {
                if (TECH_TREE[techId] && !gameState.tech[techId]) {
                    unlockTech(techId);
                    unlockedTechNames.push(TECH_TREE[techId].name);
                }
            });
            if (unlockedTechNames.length > 0) rewardMessages.push(`Tech: ${unlockedTechNames.join(', ')}`);
        }
        if (reward.vehicle) { addVehicle(reward.vehicle); rewardMessages.push(`1 ${VEHICLE_DEFS[reward.vehicle].name}`); }
        
        if (rewardMessages.length > 0) addMessage(gameState, 'OBJECTIVE', `Reward Claimed: +${rewardMessages.join(', ')}.`);
        renderTopBarValues();
    }

    function grantNewSpecialist(state, skill = null, spawnPoint = null) {
        const existingNames = state.specialists.map(s => s.name);
        let availableNames = SPECIALIST_NAMES.filter(n => !existingNames.includes(n));
        if (availableNames.length === 0) availableNames = SPECIALIST_NAMES; 

        const newId = (state.specialists.length > 0 ? Math.max(...state.specialists.map(s => s.id)) : -1) + 1;
        const newName = availableNames[Math.floor(Math.random() * availableNames.length)];
        const newSkill = skill || ['Engineer', 'Biologist', 'Scientist'][Math.floor(Math.random() * 3)];
        
        const posTrait = TRAITS.positive[Math.floor(Math.random() * TRAITS.positive.length)];
        const negTrait = TRAITS.negative[Math.floor(Math.random() * TRAITS.negative.length)];
        
        let homeStation = null;
        if(spawnPoint) {
            homeStation = spawnPoint;
        } else {
            const stations = findTilesInGrid(state.world.grid, c => TILE_DEFS[c.building.type]?.provides?.housing > 0);
            homeStation = stations[0] || null;
        }

        const newSpecialist = { 
            id: newId, 
            name: newName, 
            skill: newSkill, 
            primaryJob: 'Build/Repair',
            stationId: homeStation ? {x: homeStation.x, y: homeStation.y} : null,
            x: homeStation?.x || 0,
            y: homeStation?.y || 0,
            task: { current: 'idle', priorityTarget: null, path: null, targetBuilding: null }, 
            traits: [posTrait.id, negTrait.id], 
            level: 1, 
            xp: 0 
        };

        state.specialists.push(newSpecialist);
        addMessage(state, 'DIRECTOR', `A new specialist, ${newName} the ${newSkill}, has arrived!`);
        if(activeModalId === 'team-modal') renderSpecialistList();
        renderSelectionPanel(); // Refresh if recruiting from a habitat
    }

    // --- 5. CANVAS RENDERER ---
    function initializeCanvases() {
        const container = document.getElementById('grid-container');
        const canvasIds = ['terrain', 'building', 'dynamic', 'interaction'];
        canvasIds.forEach(id => {
            canvases[id] = document.getElementById(`${id}-canvas`);
            contexts[id] = canvases[id].getContext('2d');
        });
        window.addEventListener('resize', resizeCanvases);
        resizeCanvases();
    }
    
    function resizeCanvases() {
        const container = document.getElementById('grid-container');
        const { width, height } = container.getBoundingClientRect();
        Object.values(canvases).forEach(canvas => {
            canvas.width = width;
            canvas.height = height;
        });
        clampCamera();
        needsStaticRedraw = true;
        needsDynamicRedraw = true;
    }

    function updatePositions(elapsedMs) {
        if (!gameState || elapsedMs <= 0) return;
        const elapsedSeconds = elapsedMs / 1000;
    
        // --- Threat Movement ---
        gameState.threats.active.forEach(threat => {
            if (!threat.target) return;
    
            if (threat.type === 'burrower' && !threat.isBurrowed) {
                return; 
            }
    
            const dist = Math.hypot(threat.target.x - threat.x, threat.target.y - threat.y);
            const attackRange = threat.range || 1.5;
    
            if (dist > attackRange) { 
                const speed = threat.isSlowed ? threat.speed * 0.5 : threat.speed;
                const moveAmount = speed * elapsedSeconds;
                const angle = Math.atan2(threat.target.y - threat.y, threat.target.x - threat.x);
                threat.x += Math.cos(angle) * moveAmount;
                threat.y += Math.sin(angle) * moveAmount;
            }
        });
    
        // --- Vehicle Movement ---
        gameState.vehicles.forEach(v => {
            const hasPath = (v.task.type === 'move' || v.task.type === 'remote-build') && v.task.path?.length > 0;
            if (hasPath) {
                const nextPos = v.task.path[0];
                const vehicleSpeed = 2.5; // Units per second
                const moveAmount = vehicleSpeed * elapsedSeconds;
    
                if (Math.hypot(nextPos.x - v.x, nextPos.y - v.y) <= moveAmount) {
                    v.x = nextPos.x;
                    v.y = nextPos.y;
                } else {
                    const angle = Math.atan2(nextPos.y - v.y, nextPos.x - v.x);
                    v.x += Math.cos(angle) * moveAmount;
                    v.y += Math.sin(angle) * moveAmount;
                }
            }
        });

        // --- Specialist Movement ---
        gameState.specialists.forEach(s => {
            if (s.task.path?.length > 0 && (s.task.current === 'moving_to_job' || s.task.current === 'returning_home')) {
                const nextPos = s.task.path[0];
                const speed = SPECIALIST_DEFS.speed;
                const moveAmount = speed * elapsedSeconds;

                const distToNode = Math.hypot(nextPos.x - s.x, nextPos.y - s.y);
                if (distToNode < 0.2 || distToNode <= moveAmount) {
                    s.x = nextPos.x;
                    s.y = nextPos.y;
                    s.task.path.shift();
                    if (s.task.path.length === 0) { // Arrived at destination
                        if (s.task.current === 'moving_to_job') {
                            setSpecialistTask(s, { current: 'working', targetBuilding: s.task.targetBuilding });
                        } else { // returning_home
                            setSpecialistTask(s, { current: 'idle' });
                        }
                    }
                } else {
                    const angle = Math.atan2(nextPos.y - s.y, nextPos.x - s.x);
                    s.x += Math.cos(angle) * moveAmount;
                    s.y += Math.sin(angle) * moveAmount;
                }
            }
        });
    }

    function updateEffects(now) {
        gameState.effects = gameState.effects.filter(effect => {
            const elapsed = now - effect.startTime;
            if (elapsed > effect.duration) return false;

            if (effect.type === 'projectile') {
                const progress = elapsed / effect.duration;
                effect.x = effect.startX + (effect.endX - effect.startX) * progress;
                effect.y = effect.startY + (effect.endY - effect.startY) * progress;
            }
            return true;
        });
    }

    function renderLoop(timestamp) {
        if (!gameState || gameState.gameOver) {
            cancelAnimationFrame(renderLoopId);
            return;
        }
        
        const elapsedMs = timestamp - lastRenderTime;
        
        if (elapsedMs > 1) { 
            updatePositions(elapsedMs);
            updateEffects(timestamp);
    
            needsDynamicRedraw = true;
            
            if (needsStaticRedraw) {
                renderTerrain();
                renderBuildings(timestamp);
            }
    
            if (needsDynamicRedraw) {
                renderDynamics(timestamp);
                renderInteractionLayer();
            }
            
            // --- MODIFIED: Call the new lightweight update function ---
            if (gameState.selection.active && (timestamp - lastSelectionPanelUpdate > 250)) {
                updateSelectionPanel();
                lastSelectionPanelUpdate = timestamp;
            }
            
            lastRenderTime = timestamp;
            needsStaticRedraw = false;
            needsDynamicRedraw = false;
        }

        renderLoopId = requestAnimationFrame(renderLoop);
    }
    
    function renderAll() {
        if (!gameState) return;
        needsStaticRedraw = true;
        needsDynamicRedraw = true;
        renderTopBarValues();
        renderSelectionPanel();
        renderObjectiveBanner();
        renderMinimap();
        renderEventLog(gameState);
    }
    
    function renderTerrain() {
        const ctx = contexts.terrain;
        const { width, height } = canvases.terrain;
        ctx.clearRect(0, 0, width, height);

        const { scaledCellSize, offsetX, offsetY } = getCameraTransforms();

        for(let y = 0; y < WORLD_HEIGHT; y++) {
            for(let x = 0; x < WORLD_WIDTH; x++) {
                const drawX = x * scaledCellSize + offsetX;
                const drawY = y * scaledCellSize + offsetY;

                if (drawX > width || drawY > height || drawX + scaledCellSize < 0 || drawY + scaledCellSize < 0) continue;

                const terrain = gameState.world.grid[y][x].terrain;
                let color;
                switch(terrain) {
                    case 'rocky': color = '#4a4a55'; break;
                    case 'ice': color = '#63b3ed'; break;
                    case 'crystalline': color = '#4a3e63'; break;
                    default: color = '#2d3748'; // plains
                }
                ctx.fillStyle = color;
                ctx.fillRect(drawX, drawY, scaledCellSize, scaledCellSize);
            }
        }
    }

    function renderBuildings(now) {
        const ctx = contexts.building;
        const { width, height } = canvases.building;
        ctx.clearRect(0, 0, width, height);
        
        const { scaledCellSize, offsetX, offsetY } = getCameraTransforms();

        for(let y = 0; y < WORLD_HEIGHT; y++) {
            for(let x = 0; x < WORLD_WIDTH; x++) {
                const drawX = Math.floor(x * scaledCellSize + offsetX);
                const drawY = Math.floor(y * scaledCellSize + offsetY);

                if (drawX > width || drawY > height || drawX + scaledCellSize < 0 || drawY + scaledCellSize < 0) continue;
                
                const fogState = gameState.world.fog[y][x];
                if (fogState === 0) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(drawX, drawY, scaledCellSize, scaledCellSize);
                    continue;
                }

                const building = gameState.world.grid[y][x].building;
                const def = TILE_DEFS[building.type];

                if (def) {
                    if (building.type === 'power-conduit' || building.type === 'water-pipe') {
                        drawConduit(ctx, x, y, building.type, drawX, drawY, scaledCellSize);
                    } else if (typeof def.svg === 'object') {
                        // Draw ONLY the static base of a multi-part building
                        ctx.drawImage(imageCache[def.svg.base], drawX, drawY, scaledCellSize, scaledCellSize);
                    } else if (def.svg && imageCache[def.svg]) {
                        // Draw static building
                        ctx.drawImage(imageCache[def.svg], drawX, drawY, scaledCellSize, scaledCellSize);
                    }
                    
                    const { isPowered, hasWater } = checkBuildingConnections(x, y);
                    const needsPower = def.consumes?.power || (def.requiresInfrastructure?.includes('power') && (def.taskIcon || def.produces));
                    const needsWater = def.requiresInfrastructure?.includes('water');
                    if ((needsPower && !isPowered) || (needsWater && !hasWater)) {
                        ctx.fillStyle = '#f56565';
                        ctx.font = `${scaledCellSize * 0.5}px monospace`;
                        ctx.textAlign = 'right';
                        ctx.fillText(needsWater && !hasWater ? '💧' : '⚡', drawX + scaledCellSize -2, drawY + scaledCellSize * 0.4);
                    }
                    if (building.task) {
                        ctx.fillStyle = 'white';
                        ctx.font = `${scaledCellSize * 0.6}px monospace`;
                        ctx.textAlign = 'left';
                        ctx.fillText(building.task, drawX, drawY + scaledCellSize * 0.5);
                    }
                     if (def.workRequired && building.work > 0) {
                        const progress = (building.work / def.workRequired);
                        ctx.fillStyle = '#4a5568';
                        ctx.fillRect(drawX, drawY + scaledCellSize - 5, scaledCellSize, 5);
                        ctx.fillStyle = 'var(--research-color)';
                        ctx.fillRect(drawX, drawY + scaledCellSize - 5, scaledCellSize * progress, 5);
                    }
                }
                
                if (fogState === 1 || fogState === 2) {
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(drawX, drawY, scaledCellSize, scaledCellSize);
                }
            }
        }
    }
    
    function drawConduit(ctx, x, y, type, drawX, drawY, size) {
        const networkType = type === 'power-conduit' ? 'power' : 'water';
        const color = type === 'power-conduit' ? 'var(--warning-color)' : 'var(--water-color)';
        ctx.fillStyle = color;
        const w = size / 5; // width of pipe

        const connections = {
            north: isConnectable(x, y - 1, networkType, type),
            south: isConnectable(x, y + 1, networkType, type),
            west: isConnectable(x - 1, y, networkType, type),
            east: isConnectable(x + 1, y, networkType, type),
        };

        ctx.fillRect(drawX + size/2 - w/2, drawY + size/2 - w/2, w, w);
        if (connections.north) ctx.fillRect(drawX + size/2 - w/2, drawY, w, size/2);
        if (connections.south) ctx.fillRect(drawX + size/2 - w/2, drawY + size/2, w, size/2);
        if (connections.west) ctx.fillRect(drawX, drawY + size/2 - w/2, size/2, w);
        if (connections.east) ctx.fillRect(drawX + size/2, drawY + size/2 - w/2, size/2, w);
    }
    
    function renderDynamics(now) {
        const ctx = contexts.dynamic;
        const { width, height } = canvases.dynamic;
        ctx.clearRect(0, 0, width, height);

        const { scaledCellSize, offsetX, offsetY } = getCameraTransforms();

        if (gameState.placement.active) {
            const commandCenters = findTiles(t => t.building.type === 'habitat' || t.building.type === 'command-post');
            ctx.fillStyle = 'rgba(66, 153, 225, 0.1)';
            ctx.strokeStyle = 'rgba(66, 153, 225, 0.5)';
            ctx.lineWidth = 1;
            commandCenters.forEach(center => {
                const drawX = center.x * scaledCellSize + offsetX + scaledCellSize / 2;
                const drawY = center.y * scaledCellSize + offsetY + scaledCellSize / 2;
                const radius = COMMAND_RADIUS * scaledCellSize;
                ctx.beginPath();
                ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }

        for(let y = 0; y < WORLD_HEIGHT; y++) {
            for(let x = 0; x < WORLD_WIDTH; x++) {
                const drawX = Math.floor(x * scaledCellSize + offsetX);
                const drawY = Math.floor(y * scaledCellSize + offsetY);

                if (drawX > width || drawY > height || drawX + scaledCellSize < 0 || drawY + scaledCellSize < 0) continue;
                if (gameState.world.fog[y][x] === 0) continue;

                const building = gameState.world.grid[y][x].building;
                const def = TILE_DEFS[building.type];

                if(def) {
                    if (typeof def.svg === 'object') {
                        def.svg.parts.forEach(part => {
                            ctx.save();
                            if (part.animation === 'spin' || part.animation === 'spin-reverse') {
                                ctx.translate(drawX + scaledCellSize / 2, drawY + scaledCellSize / 2);
                                const rotation = (now / 2000) * Math.PI * 2 * (part.animation === 'spin-reverse' ? -1 : 1);
                                ctx.rotate(rotation);
                                ctx.translate(-(drawX + scaledCellSize / 2), -(drawY + scaledCellSize / 2));
                            } else if (part.animation === 'pulse') {
                                const pulse = 0.65 + 0.35 * ( (1 + Math.sin(now / 400)) / 2 );
                                ctx.globalAlpha = pulse;
                            }
                            ctx.drawImage(imageCache[part.svg], drawX, drawY, scaledCellSize, scaledCellSize);
                            ctx.restore();
                        });
                    }
                    if (building.health < 100) {
                         ctx.fillStyle = `rgba(236, 201, 75, ${0.5 + 0.2 * Math.sin(now / 200)})`;
                         ctx.fillRect(drawX, drawY, scaledCellSize, scaledCellSize);
                    }
                    if (building.isUnderAttack) {
                        ctx.strokeStyle = `rgba(245, 101, 101, ${0.8 + 0.2 * Math.sin(now / 100)})`;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(drawX, drawY, scaledCellSize, scaledCellSize);
                    }
                    if (building.isShielded) {
                        ctx.strokeStyle = `rgba(66, 153, 225, ${0.5 + 0.5 * Math.sin(now/300)})`;
                        ctx.lineWidth = 3;
                        ctx.strokeRect(drawX - 2, drawY - 2, scaledCellSize + 4, scaledCellSize + 4);
                    }
                }
            }
        }

        gameState.vehicles.forEach(v => {
            const isVisible = gameState.world.fog[Math.floor(v.y)]?.[Math.floor(v.x)] === 3;
            if(!isVisible) return;
            const def = VEHICLE_DEFS[v.type];
            const img = imageCache[def.svg];
            if(img) {
                const drawX = v.x * scaledCellSize + offsetX;
                const drawY = v.y * scaledCellSize + offsetY;
                ctx.drawImage(img, drawX, drawY, scaledCellSize, scaledCellSize);

                if (v.task.type === 'remote-build' && v.task.progress > 0) {
                    const progress = v.task.progress / 15;
                    ctx.fillStyle = '#4a5568';
                    ctx.fillRect(drawX, drawY - 6, scaledCellSize, 5);
                    ctx.fillStyle = 'var(--accent-color)';
                    ctx.fillRect(drawX, drawY - 6, scaledCellSize * progress, 5);
                } else if (v.task.type === 'deconstruct-poi' && v.task.progress > 0) {
                    const poi = gameState.world.grid[Math.round(v.y)][Math.round(v.x)];
                    const progress = v.task.progress / TILE_DEFS[poi.building.type].workRequired;
                    ctx.fillStyle = '#4a5568';
                    ctx.fillRect(drawX, drawY - 6, scaledCellSize, 5);
                    ctx.fillStyle = 'var(--component-color)';
                    ctx.fillRect(drawX, drawY - 6, scaledCellSize * progress, 5);
                }
            }
        });
        
        gameState.specialists.forEach(s => {
            if (s.task.current === 'working') return; // Specialist is "inside" the building.
            const isVisible = gameState.world.fog[Math.floor(s.y)]?.[Math.floor(s.x)] === 3;
            if(!isVisible) return;
            const imgKey = `specialist_${s.skill.toLowerCase()}`;
            const img = imageCache[imgKey];
            if(img) {
                const drawX = s.x * scaledCellSize + offsetX;
                const drawY = s.y * scaledCellSize + offsetY;
                ctx.drawImage(img, drawX, drawY, scaledCellSize, scaledCellSize);
            }
        });

        gameState.threats.active.forEach(t => {
            const fogState = gameState.world.fog[Math.floor(t.y)]?.[Math.floor(t.x)];
            if(fogState < 2) return;
            
            const drawX = t.x * scaledCellSize + offsetX;
            const drawY = t.y * scaledCellSize + offsetY;

            if (fogState === 2) {
                // Radar ping
                ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + 0.5 * Math.sin(now / 150)})`; // pulsing red blip
                ctx.beginPath();
                ctx.arc(drawX + scaledCellSize / 2, drawY + scaledCellSize / 2, scaledCellSize * 0.3, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            const def = THREAT_DEFS[t.type];
            const img = imageCache[def.svg];
            if(img) {
                ctx.save();
                if(t.isBurrowed) ctx.globalAlpha = 0.5;
                if(t.isSlowed) {
                     ctx.shadowColor = 'var(--water-color)';
                     ctx.shadowBlur = 10;
                }
                ctx.drawImage(img, drawX, drawY, scaledCellSize, scaledCellSize);
                ctx.restore();
            }
        });

        ctx.save();
        gameState.effects.forEach(effect => {
            const drawX = effect.x * scaledCellSize + offsetX;
            const drawY = effect.y * scaledCellSize + offsetY;
            if (gameState.world.fog[Math.floor(effect.y)]?.[Math.floor(effect.x)] < 2) return;
            
            if (effect.type === 'projectile') {
                ctx.fillStyle = effect.color;
                ctx.beginPath();
                ctx.arc(drawX + scaledCellSize / 2, drawY + scaledCellSize / 2, 3 * gameState.camera.scale, 0, Math.PI * 2);
                ctx.fill();
            } else if (effect.type === 'explosion') {
                const elapsed = now - effect.startTime;
                const progress = elapsed / effect.duration;
                const radius = effect.size * scaledCellSize * progress;
                
                // --- FIX: Robustness ---
                // The radius must be non-negative. A negative value can occur if a game is loaded
                // from a save state that contained an active effect from a previous session.
                // This check prevents the `arc` function from throwing an error and freezing the canvas.
                if (radius > 0) {
                    ctx.strokeStyle = effect.color;
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = Math.max(0, 1 - progress); // Clamp alpha just in case
                    ctx.beginPath();
                    ctx.arc(drawX + scaledCellSize / 2, drawY + scaledCellSize / 2, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        });
        ctx.restore();
    }
    
    function renderInteractionLayer() {
        const ctx = contexts.interaction;
        const { width, height } = canvases.interaction;
        ctx.clearRect(0, 0, width, height);

        const { scaledCellSize, offsetX, offsetY } = getCameraTransforms();
        const selection = gameState.selection;

        if (selection.active) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);

            if (selection.type === 'building') {
                const drawX = selection.x * scaledCellSize + offsetX;
                const drawY = selection.y * scaledCellSize + offsetY;
                ctx.strokeRect(drawX, drawY, scaledCellSize, scaledCellSize);
            } else if (selection.type === 'vehicle') {
                const vehicle = gameState.vehicles.find(v => v.id === selection.id);
                if (vehicle) {
                    const drawX = vehicle.x * scaledCellSize + offsetX;
                    const drawY = vehicle.y * scaledCellSize + offsetY;
                    ctx.strokeRect(drawX, drawY, scaledCellSize, scaledCellSize);
                }
            } else if (selection.type === 'specialist') {
                const specialist = gameState.specialists.find(v => v.id === selection.id);
                if (specialist) {
                    const drawX = specialist.x * scaledCellSize + offsetX;
                    const drawY = specialist.y * scaledCellSize + offsetY;
                    ctx.strokeRect(drawX, drawY, scaledCellSize, scaledCellSize);
                }
            } else if (selection.type === 'threat') {
                const threat = gameState.threats.active.find(t => t.id === selection.id);
                if (threat) {
                    const drawX = threat.x * scaledCellSize + offsetX;
                    const drawY = threat.y * scaledCellSize + offsetY;
                    ctx.strokeRect(drawX, drawY, scaledCellSize, scaledCellSize);
                }
            }
            ctx.setLineDash([]);
        }

        if (gameState.placement.active && !gameState.placement.isPriorityTargeting) {
            const coords = getGridCoordsFromCanvas(panStart.canvasX, panStart.canvasY);
            if (coords) {
                const { x, y } = coords;
                const drawX = x * scaledCellSize + offsetX;
                const drawY = y * scaledCellSize + offsetY;
                const type = gameState.placement.type;
                const def = TILE_DEFS[type];
                if (!def) { cancelPlacement(); return; } // Safety check
                const isValid = checkPlacementValidity(type, x, y);

                ctx.save();
                ctx.globalAlpha = 0.6;
                if (!isValid) {
                     ctx.filter = 'saturate(0%) brightness(1.5) drop-shadow(0 0 3px red)';
                }

                if (type === 'power-conduit' || type === 'water-pipe') {
                    drawConduit(ctx, x, y, type, drawX, drawY, scaledCellSize);
                } else if (typeof def.svg === 'object') {
                    ctx.drawImage(imageCache[def.svg.base], drawX, drawY, scaledCellSize, scaledCellSize);
                    def.svg.parts.forEach(part => ctx.drawImage(imageCache[part.svg], drawX, drawY, scaledCellSize, scaledCellSize));
                } else if (def.svg && imageCache[def.svg]) {
                    ctx.drawImage(imageCache[def.svg], drawX, drawY, scaledCellSize, scaledCellSize);
                }
                ctx.restore();
            }
        }
    }

    function getCameraTransforms() {
        const { width, height } = canvases.terrain;
        const { x, y, scale } = gameState.camera;
        const scaledCellSize = CELL_SIZE * scale;
        const offsetX = -x * scaledCellSize + width / 2;
        const offsetY = -y * scaledCellSize + height / 2;
        return { scaledCellSize, offsetX, offsetY };
    }

    function loadImages() {
        return new Promise(resolve => {
            const svgToLoad = new Map();
    
            for (const key in TILE_DEFS) {
                const svg = TILE_DEFS[key].svg;
                if (typeof svg === 'string') {
                    svgToLoad.set(svg, SVG_DEFS[svg]);
                } else if (typeof svg === 'object' && svg !== null) {
                    svgToLoad.set(svg.base, SVG_DEFS[svg.base]);
                    svg.parts.forEach(part => svgToLoad.set(part.svg, SVG_DEFS[part.svg]));
                }
            }
            for (const key in VEHICLE_DEFS) svgToLoad.set(VEHICLE_DEFS[key].svg, SVG_DEFS[VEHICLE_DEFS[key].svg]);
            for (const key in THREAT_DEFS) svgToLoad.set(THREAT_DEFS[key].svg, SVG_DEFS[THREAT_DEFS[key].svg]);
            
            svgToLoad.set('specialist_engineer', SVG_DEFS['specialist_engineer']);
            svgToLoad.set('specialist_biologist', SVG_DEFS['specialist_biologist']);
            svgToLoad.set('specialist_scientist', SVG_DEFS['specialist_scientist']);

            let loadedCount = 0;
            const totalToLoad = svgToLoad.size;
            if (totalToLoad === 0) {
                console.log("No SVG images to load.");
                resolve();
                return;
            }
    
            svgToLoad.forEach((svgString, key) => {
                loadSingleImage(key, svgString, () => {
                    loadedCount++;
                    if (loadedCount === totalToLoad) {
                        console.log("All SVG images loaded and cached.");
                        resolve();
                    }
                });
            });
        });
    }

    function loadSingleImage(key, svgString, callback) {
        if (!key || !svgString) {
            console.warn("Attempted to load an empty image key or string.");
            if (callback) callback();
            return;
        }
        if(imageCache[key]) {
            if (callback) callback();
            return;
        }
        const img = new Image();
        img.onload = () => {
            imageCache[key] = img;
            if (callback) callback();
        };
        img.onerror = (e) => {
            console.error(`Failed to load image for ${key}:`, e.type);
            if (callback) callback();
        }

        const colorMap = { 'success-color': '#48bb78', 'error-color': '#f56565', 'warning-color': '#ecc94b', 'accent-color': '#4299e1', 'research-color': '#9f7aea', 'water-color': '#38b2ac', 'component-color': '#d69e2e', 'exotic-color': '#d53f8c', 'accent-hover': '#63b3ed' };
        const finalSvg = (svgString || '').replace(/var\(--(.*?)\)/g, (match, varName) => {
            return colorMap[varName.trim()] || 'white';
        }).replace(/currentColor/g, '#e2e8f0');

        img.src = `data:image/svg+xml,${encodeURIComponent(finalSvg)}`;
    }

    // --- RENDER FUNCTIONS (NON-CANVAS) ---
    function renderTopBar() {
        document.getElementById('top-bar').innerHTML = `
            <div class="resource-group">
                <div class="resource-display" id="housing-info" title="Housing">${SVG_DEFS.housing} <span id="housing-val" class="value"></span></div>
                <div class="resource-display" id="metal-info" title="Metal">${SVG_DEFS.metal} <span id="metal-val" class="value"></span></div>
                <div class="resource-display" id="biomass-info" title="Biomass">${SVG_DEFS.biomass} <span id="biomass-val" class="value"></span></div>
                <div class="resource-display" id="components-info" title="Adv. Components">${SVG_DEFS.components} <span id="components-val" class="value"></span></div>
                <div class="resource-display" id="exotic-info" title="Exotic Matter">${SVG_DEFS.exoticMatter} <span id="exotic-val" class="value"></span></div>
                <div class="resource-display" id="water-info" title="Water">${SVG_DEFS.water} <span id="water-val" class="value"></span></div>
                <div class="resource-display" id="power-info" title="Power Grid">${SVG_DEFS.power} <span id="power-val" class="value"></span> (<span id="power-delta"></span>)</div>
                <div class="resource-display" id="battery-info" title="Battery">${SVG_DEFS.battery} <span id="battery-val" class="value"></span>%</div>
                <div class="resource-display" id="research-info" title="Research Points">${SVG_DEFS.research} <span id="research-val" class="value"></span></div>
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <div id="day-night-indicator"></div>
                <button id="settings-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer;" title="Settings">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
            </div>`;
        
        document.getElementById('settings-btn').addEventListener('click', () => {
            const keyInput = document.getElementById('api-key-input');
            keyInput.value = localStorage.getItem('gemini_api_key') || '';
            const modelSelect = document.getElementById('model-select');
            modelSelect.value = getSelectedModel();
            document.getElementById('settings-message').style.display = 'none';
            showModal('settings-modal');
        });
    }

    function renderTopBarValues() {
        document.getElementById('housing-val').textContent = `${gameState.specialists.length}/${gameState.housingCapacity}`;
        document.getElementById('metal-val').textContent = Math.floor(gameState.resources.metal);
        document.getElementById('biomass-val').textContent = Math.floor(gameState.resources.biomass);
        document.getElementById('components-val').textContent = Math.floor(gameState.resources.components);
        document.getElementById('exotic-val').textContent = gameState.resources.exoticMatter.toFixed(2);
        document.getElementById('water-val').textContent = Math.floor(gameState.resources.water);
        document.getElementById('power-val').textContent = Math.floor(gameState.resources.power);
        const pDelta = gameState.powerDelta || 0;
        document.getElementById('power-delta').textContent = (pDelta >= 0 ? '+' : '') + pDelta.toFixed(1);
        document.getElementById('power-delta').style.color = pDelta >= 0 ? 'var(--success-color)' : 'var(--error-color)';
        document.getElementById('research-val').textContent = Math.floor(gameState.resources.research);
        const batCap = gameState.batteryCapacity || 0;
        document.getElementById('battery-val').textContent = batCap > 0 ? Math.floor((gameState.resources.battery / batCap) * 100) : 0;
        document.getElementById('day-night-indicator').textContent = gameState.dayNightCycle.isDay ? '☀️ DAY' : '🌙 NIGHT';

        const updateTooltip = (id, delta) => {
            const el = document.getElementById(id);
            if (el) {
                const baseTitle = el.title.split(' (')[0];
                el.title = `${baseTitle} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}/tick)`;
            }
        };
        updateTooltip('metal-info', gameState.resourceDeltas.metal);
        updateTooltip('biomass-info', gameState.resourceDeltas.biomass);
        updateTooltip('components-info', gameState.resourceDeltas.components);
        updateTooltip('exotic-info', gameState.resourceDeltas.exoticMatter);
        updateTooltip('water-info', gameState.resourceDeltas.water);
        updateTooltip('research-info', gameState.resourceDeltas.research);
    }

// in js/game.js

function renderSelectionPanel() {
    const panel = document.getElementById('selection-panel');
    
    // FIX: Do not attempt to render if gameState is not yet initialized.
    // This prevents a crash when this function is called during initial game setup.
    if (!gameState) {
        return;
    }

    const selection = gameState.selection;
    const iconContainer = document.getElementById('selection-icon');
    const titleEl = document.getElementById('selection-title');
    const statsEl = document.getElementById('selection-stats');
    const actionsEl = document.getElementById('selection-actions');

    if (!selection.active) {
        panel.classList.remove('active');
        return;
    }
    
    panel.classList.add('active');
    // Clear previous content
    iconContainer.innerHTML = '';
    titleEl.textContent = '';
    statsEl.innerHTML = '';
    actionsEl.innerHTML = '';

    // --- HELPER for creating the new health bar HTML ---
    const healthBarHtml = `
        <div class="stat-item health-stat">
            ${SVG_DEFS.health} 
            <div class="health-bar-container">
                <div id="selection-health-bar" class="health-bar-fill"></div>
            </div>
            <span id="selection-health-value"></span>
        </div>`;

    if (selection.type === 'building') {
        const cell = gameState.world.grid[selection.y][selection.x];
        if (!cell) { clearSelection(); return; }
        const building = cell.building;
        const def = TILE_DEFS[building.type];
        if(!def) { clearSelection(); return; } 
        
        let iconHtml = '';
        if (building.type === 'power-conduit' || building.type === 'water-pipe') {
             iconHtml = generateConduitSVG(selection.x, selection.y, building.type);
        } else if (typeof def.svg === 'object') {
            // The animation is handled by CSS, so just setting the structure is enough.
            iconHtml = `<div style="position: relative; width: 100%; height: 100%;">
                <div style="position: absolute; inset: 0;">${SVG_DEFS[def.svg.base] || ''}</div>
                ${def.svg.parts.map(p => `<div style="position: absolute; inset: 0;" class="${p.animation.includes('spin') ? 'is-spinning' : 'is-pulsing'}">${SVG_DEFS[p.svg] || ''}</div>`).join('')}
            </div>`;
        } else {
             iconHtml = SVG_DEFS[def.svg] || '';
        }
        iconContainer.innerHTML = iconHtml;

        // Set up the stats structure with IDs for updating
        let statsHtml = healthBarHtml; // <-- USE THE NEW HEALTH BAR HTML
        const { isPowered, hasWater } = checkBuildingConnections(selection.x, selection.y);
        const needsPower = def.consumes?.power || def.requiresInfrastructure?.includes('power');
        const needsWater = def.requiresInfrastructure?.includes('water');
        if (needsPower) statsHtml += `<div class="stat-item" id="selection-power-status" style="color:${isPowered ? 'var(--success-color)' : 'var(--error-color)'}">${SVG_DEFS.power} ${isPowered ? 'Online' : 'Offline'}</div>`;
        if (needsWater) statsHtml += `<div class="stat-item" id="selection-water-status" style="color:${hasWater ? 'var(--success-color)' : 'var(--error-color)'}">${SVG_DEFS.water} ${hasWater ? 'Online' : 'Offline'}</div>`;
        
        statsHtml += generateResourceBreakdownHtml(def, building.level, {x: selection.x, y: selection.y});
        if (def.workRequired) statsHtml += `<div class="stat-item" style="width:100%; color: var(--research-color)">Progress: <span id="selection-progress-value"></span></div>`;
        if (building.type === 'terraformer-seed-vault') statsHtml += `<div class="stat-item" style="width:100%; color: var(--success-color)">Charge: <span id="selection-charge-value"></span></div>`;
        if (def.isPOI) statsHtml += `<div class="item-desc" style="width: 100%">${def.desc}</div>`;
        statsEl.innerHTML = statsHtml;

        if (def.recruits) {
            const recruitContainer = document.createElement('div');
            recruitContainer.className = 'recruitment-actions';
            recruitContainer.innerHTML = `<strong>Recruit Specialist</strong>`;
            
            let availableSkills = ['Engineer', 'Biologist', 'Scientist'];
            if (gameState.tech['basic-radar']) availableSkills.push('Ranger');
            if (gameState.tech['sentinel-armor']) availableSkills.push('Sentinel');

            availableSkills.forEach(skill => {
                const canAfford = checkCanAfford(RECRUIT_COST);
                const hasHousing = gameState.specialists.length < gameState.housingCapacity;
                const btn = document.createElement('button');
                btn.className = 'button';
                
                const costStr = Object.entries(RECRUIT_COST).map(([res, val]) => `${val}${res.charAt(0).toUpperCase()}`).join(' ');
                btn.innerHTML = `<span>Recruit ${skill}</span> <span class="cost">${costStr}</span>`;
                
                btn.disabled = !canAfford || !hasHousing;
                if (!hasHousing) btn.title = "Insufficient housing capacity.";
                else if (!canAfford) btn.title = "Not enough resources.";

                btn.onclick = () => {
                    if (gameState.specialists.length < gameState.housingCapacity && checkAndSpendResources(RECRUIT_COST)) {
                        grantNewSpecialist(gameState, skill, {x: selection.x, y: selection.y});
                        audioManager.play('success');
                        renderSelectionPanel();
                    } else {
                        audioManager.play('error');
                        addMessage(gameState, 'EVENT', 'Cannot recruit: Check housing and resources.');
                    }
                };
                recruitContainer.appendChild(btn);
            });
            actionsEl.appendChild(recruitContainer);
        }

         if (def.builds) {
            const queueContainer = document.createElement('div');
            queueContainer.className = 'build-queue';
            queueContainer.innerHTML = `<strong>Build Queue:</strong><div id="queue-list"></div>`;
            actionsEl.appendChild(queueContainer);
            const queueList = document.getElementById('queue-list');
            
            (building.buildQueue || []).forEach((itemType, index) => {
                const itemDef = def.builds.find(b => b.type === itemType);
                const queueItem = document.createElement('div');
                queueItem.className = 'queue-item';
                queueItem.innerHTML = `<span>${index+1}. ${itemDef.name}</span><button data-index="${index}">X</button>`;
                queueItem.querySelector('button').onclick = () => { building.buildQueue.splice(index, 1); if(index === 0) building.queueProgress = 0; renderSelectionPanel(); };
                queueList.appendChild(queueItem);
            });

            if ((building.buildQueue || []).length < 5) {
                def.builds.forEach(buildable => {
                    const cost = buildable.cost; const canAfford = checkCanAfford(cost);
                    const btn = document.createElement('button'); btn.className = 'button';
                    let costStr = Object.entries(cost).map(([res, val]) => `${val}${res.charAt(0).toUpperCase()}`).join(', ');
                    btn.textContent = `Build ${buildable.name} (${costStr})`;
                    btn.disabled = !canAfford;
                    btn.onclick = () => {
                        if (checkAndSpendResources(cost)) {
                            if(!building.buildQueue) building.buildQueue = [];
                            building.buildQueue.push(buildable.type);
                            addMessage(gameState, 'INFO', `Queued ${buildable.name}.`);
                            renderSelectionPanel();
                        }
                    };
                    actionsEl.appendChild(btn);
                });
            }
        }
        
        if (building.health < 100 && !def.isPOI) {
            const repairBtn = document.createElement('button'); repairBtn.className = 'button'; repairBtn.textContent = 'Prioritize Repair';
            repairBtn.onclick = () => {
                gameState.specialists.forEach(s => {
                    if (s.primaryJob === 'Build/Repair') {
                         s.task.priorityTarget = { x: selection.x, y: selection.y };
                         // FIX: Interrupt the specialist's current task so they re-evaluate immediately.
                         setSpecialistTask(s, { current: 'idle' });
                    }
                });
                addMessage(gameState, 'INFO', `Repair of ${def.name} has been prioritized.`);
            };
            actionsEl.appendChild(repairBtn);
        }
        if (def.upgrade) {
            const upgradeBtn = document.createElement('button'); upgradeBtn.className = 'button';
            const cost = def.upgrade.cost;
            const canAfford = checkCanAfford(cost);
            const hasTech = gameState.tech[def.upgrade.tech]; const atMaxLevel = building.level >= def.maxLevel;
            let costStr = `${cost.metal || 0}M` + (cost.components ? ` ${cost.components}C` : '');
            upgradeBtn.textContent = `Upgrade (L${building.level+1}) - ${costStr}`;
            upgradeBtn.disabled = !canAfford || !hasTech || atMaxLevel;
            if (atMaxLevel) upgradeBtn.textContent = 'Max Level';
            else if (!hasTech) upgradeBtn.title = `Requires research: ${TECH_TREE[def.upgrade.tech].name}`;
            else if (!canAfford) upgradeBtn.title = 'Not enough resources.';
            upgradeBtn.onclick = () => { if(checkAndSpendResources(cost)) { building.level++; addMessage(gameState, 'DIRECTOR', `Upgraded ${def.name} to Level ${building.level}.`); needsStaticRedraw = true; renderSelectionPanel(); } };
            actionsEl.appendChild(upgradeBtn);
        }
        if (def.cost) {
            const deconstructBtn = document.createElement('button'); deconstructBtn.className = 'button danger'; deconstructBtn.textContent = 'Deconstruct';
            deconstructBtn.onclick = () => { if(confirm("Deconstruct? You will recover half the resources.")) {
                Object.entries(def.cost).forEach(([res, val]) => gameState.resources[res] += val * 0.5);
                gameState.world.grid[selection.y][selection.x].building = { type: 'empty', health: 100, task: null, level: 1, connected:{}, isShielded: false, progress: 0, isUnderAttack: false }; 
                addMessage(gameState, 'INFO', `Deconstructed ${def.name}.`); audioManager.play('build'); clearSelection(); needsStaticRedraw = true; renderMinimap(); } 
            };
            actionsEl.appendChild(deconstructBtn);
        }

    } else if (selection.type === 'vehicle') {
        const vehicle = gameState.vehicles.find(v => v.id === selection.id);
        if (!vehicle) { clearSelection(); return; }
        const vDef = VEHICLE_DEFS[vehicle.type];
        iconContainer.innerHTML = SVG_DEFS[vDef.svg];
        
        let statsHtml = `${healthBarHtml}<div class="stat-item" id="selection-task-desc"></div>`;
        if (vDef.stats.damage) {
            statsHtml += `<div class="stat-item" style="color:var(--error-color)">Damage: ${vDef.stats.damage}</div>`;
            statsHtml += `<div class="stat-item">Range: ${vDef.stats.range}</div>`;
        }
        statsEl.innerHTML = statsHtml;


        if(vehicle.type === 'constructor-rover') {
            const buildBtn = document.createElement('button');
            buildBtn.className = 'button';
            buildBtn.textContent = 'Remote Build';
            buildBtn.onclick = () => showModal('remote-build-modal');
            actionsEl.appendChild(buildBtn);
        }

    } else if (selection.type === 'specialist') {
        const specialist = gameState.specialists.find(s => s.id === selection.id);
        if (!specialist) { clearSelection(); return; }
        iconContainer.innerHTML = SVG_DEFS[`specialist_${specialist.skill.toLowerCase()}`];
        statsEl.innerHTML = `<div class="item-desc" id="selection-task-desc" style="width: 100%"></div>`;

    } else if (selection.type === 'threat') {
        const threat = gameState.threats.active.find(t => t.id === selection.id);
        if (!threat) { clearSelection(); return; }
        const tDef = THREAT_DEFS[threat.type];
        iconContainer.innerHTML = SVG_DEFS[tDef.svg];
        
        let statsHtml = healthBarHtml; // <-- USE THE NEW HEALTH BAR HTML
        statsHtml += `<div class="stat-item">Damage: ${threat.damage}</div>`;
        statsHtml += `<div class="stat-item">Speed: ${threat.speed}</div>`;
        if (threat.defense) statsHtml += `<div class="stat-item">Defense: ${threat.defense}</div>`;
        if (threat.debuffAura) statsHtml += `<div class="item-desc" style="width: 100%; color:var(--exotic-color)">Aura: Reduces nearby turret damage.</div>`;
        statsHtml += `<div id="selection-target-desc" class="item-desc" style="width: 100%"></div>`;
        statsEl.innerHTML = statsHtml;
    }

    updateSelectionPanel(); // Initial update
}
    // --- NEW FUNCTION: Only updates values, doesn't rebuild the panel ---
    function updateSelectionPanel() {
        const selection = gameState.selection;
        if (!selection.active) return;

        const healthValue = document.getElementById('selection-health-value');
        const healthBar = document.getElementById('selection-health-bar'); // Get the new bar element
        const titleEl = document.getElementById('selection-title');
        const taskDescEl = document.getElementById('selection-task-desc');

        if (selection.type === 'building') {
            const cell = gameState.world.grid[selection.y][selection.x];
            if (!cell) { clearSelection(); return; }
            const building = cell.building;
            const def = TILE_DEFS[building.type];
            if (!def) { clearSelection(); return; }

            titleEl.textContent = `${def.name} ${building.level > 1 ? `(L${building.level})` : ''}`;
            if (healthValue) healthValue.textContent = `${Math.floor(building.health)}%`;
            if (healthBar) healthBar.style.width = `${building.health}%`; // <-- UPDATE THE BAR WIDTH

            const progressValue = document.getElementById('selection-progress-value');
            if (progressValue && def.workRequired) {
                progressValue.textContent = `${((building.work || 0) / def.workRequired * 100).toFixed(1)}%`;
            }
            const chargeValue = document.getElementById('selection-charge-value');
            if (chargeValue && building.type === 'terraformer-seed-vault') {
                chargeValue.textContent = `${building.progress.toFixed(1)}%`;
            }

        } else if (selection.type === 'vehicle') {
            const vehicle = gameState.vehicles.find(v => v.id === selection.id);
            if (!vehicle) { clearSelection(); return; }
            
            titleEl.textContent = `${vehicle.name}`;
            if (healthValue) healthValue.textContent = `${Math.floor(vehicle.health)}%`;
            if (healthBar) healthBar.style.width = `${vehicle.health}%`; // <-- UPDATE THE BAR WIDTH
            
            if (taskDescEl) {
                let taskDesc = `Task: ${vehicle.task.type}`;
                if(vehicle.task.type === 'salvage') taskDesc += ` (${Math.floor(vehicle.task.progress * 10)}%)`;
                if(vehicle.task.type === 'remote-build') taskDesc += ` (${Math.floor((vehicle.task.progress || 0) / 15 * 100)}%)`;
                taskDescEl.textContent = taskDesc;
            }

        } else if (selection.type === 'specialist') {
            const specialist = gameState.specialists.find(s => s.id === selection.id);
            if (!specialist) { clearSelection(); return; }
            titleEl.textContent = `${specialist.name} (Lvl ${specialist.level} ${specialist.skill})`;
            if (taskDescEl) taskDescEl.textContent = getSpecialistTaskDescription(specialist);

        } else if (selection.type === 'threat') {
            const threat = gameState.threats.active.find(t => t.id === selection.id);
            if (!threat) { clearSelection(); return; }
            const tDef = THREAT_DEFS[threat.type];
            
            titleEl.textContent = `${tDef.name}`;
            const maxHealth = tDef.health;
            if (healthValue) healthValue.textContent = `${Math.ceil(threat.health)} / ${maxHealth}`;
            if (healthBar) {
                const healthPercent = (threat.health / maxHealth) * 100;
                healthBar.style.width = `${healthPercent}%`; // <-- UPDATE THE BAR WIDTH
            }

            const targetDescEl = document.getElementById('selection-target-desc');
            if (targetDescEl) {
                if (threat.target) {
                    const targetBuildingDef = TILE_DEFS[threat.target.building.type];
                    targetDescEl.textContent = `Target: ${targetBuildingDef.name} at (${threat.target.x}, ${threat.target.y})`;
                } else {
                    targetDescEl.textContent = `Target: Acquiring...`;
                }
            }
        }
    }    

// --- NEW FUNCTION: Only updates values, doesn't rebuild the panel ---
    function updateSelectionPanel() {
        const selection = gameState.selection;
        if (!selection.active) return;

        const healthValue = document.getElementById('selection-health-value');
        const titleEl = document.getElementById('selection-title');
        const taskDescEl = document.getElementById('selection-task-desc');

        if (selection.type === 'building') {
            const cell = gameState.world.grid[selection.y][selection.x];
            if (!cell) { clearSelection(); return; }
            const building = cell.building;
            const def = TILE_DEFS[building.type];
            if (!def) { clearSelection(); return; }

            titleEl.textContent = `${def.name} ${building.level > 1 ? `(L${building.level})` : ''}`;
            if (healthValue) healthValue.textContent = `${Math.floor(building.health)}%`;

            const progressValue = document.getElementById('selection-progress-value');
            if (progressValue && def.workRequired) {
                progressValue.textContent = `${((building.work || 0) / def.workRequired * 100).toFixed(1)}%`;
            }
            const chargeValue = document.getElementById('selection-charge-value');
            if (chargeValue && building.type === 'terraformer-seed-vault') {
                chargeValue.textContent = `${building.progress.toFixed(1)}%`;
            }

        } else if (selection.type === 'vehicle') {
            const vehicle = gameState.vehicles.find(v => v.id === selection.id);
            if (!vehicle) { clearSelection(); return; }
            
            titleEl.textContent = `${vehicle.name}`;
            
            if (taskDescEl) {
                let taskDesc = `Task: ${vehicle.task.type}`;
                if(vehicle.task.type === 'salvage') taskDesc += ` (${Math.floor(vehicle.task.progress * 10)}%)`;
                if(vehicle.task.type === 'remote-build') taskDesc += ` (${Math.floor((vehicle.task.progress || 0) / 15 * 100)}%)`;
                taskDescEl.textContent = taskDesc;
            }

        } else if (selection.type === 'specialist') {
            const specialist = gameState.specialists.find(s => s.id === selection.id);
            if (!specialist) { clearSelection(); return; }
            titleEl.textContent = `${specialist.name} (Lvl ${specialist.level} ${specialist.skill})`;
            if (taskDescEl) taskDescEl.textContent = getSpecialistTaskDescription(specialist);

        } else if (selection.type === 'threat') {
            const threat = gameState.threats.active.find(t => t.id === selection.id);
            if (!threat) { clearSelection(); return; }
            const tDef = THREAT_DEFS[threat.type];
            
            titleEl.textContent = `${tDef.name}`;
            const maxHealth = tDef.health;
            if (healthValue) healthValue.textContent = `${Math.ceil(threat.health)} / ${maxHealth}`;

            const targetDescEl = document.getElementById('selection-target-desc');
            if (targetDescEl) {
                if (threat.target) {
                    const targetBuildingDef = TILE_DEFS[threat.target.building.type];
                    targetDescEl.textContent = `Target: ${targetBuildingDef.name} at (${threat.target.x}, ${threat.target.y})`;
                } else {
                    targetDescEl.textContent = `Target: Acquiring...`;
                }
            }
        }
    }

    function renderBuildMenu() {
        const list = document.getElementById('build-list'); list.innerHTML = '';
        const sortedDefs = Object.entries(TILE_DEFS).sort(([,a], [,b]) => (a.cost?.metal || 9999) - (b.cost?.metal || 9999));
        
        for (const [type, def] of sortedDefs) {
            if(!def.cost || def.isPOI) continue;
            const item = document.createElement('div'); item.className = 'list-item';
            let costStr = Object.entries(def.cost).map(([res, val]) => `${val}${res.charAt(0).toUpperCase()}`).join(' ');
            
            let iconHtml = '';
            if (type === 'power-conduit' || type === 'water-pipe') {
                 iconHtml = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="10" y="45" width="80" height="10" fill="var(--${type === 'power-conduit' ? 'warning' : 'water'}-color)" /><rect x="45" y="10" width="10" height="80" fill="var(--${type === 'power-conduit' ? 'warning' : 'water'}-color)" /></svg>`;
            } else if (typeof def.svg === 'object') {
                iconHtml = `<div style="position: relative; width: 100%; height: 100%;">
                    <div style="position: absolute; inset: 0;">${SVG_DEFS[def.svg.base] || ''}</div>
                    ${def.svg.parts.map(p => `<div style="position: absolute; inset: 0;" class="${p.animation.includes('spin') ? 'is-spinning' : 'is-pulsing'}">${SVG_DEFS[p.svg] || ''}</div>`).join('')}
                </div>`;
            } else {
                 iconHtml = SVG_DEFS[def.svg] || '';
            }

            item.innerHTML = `<div class="list-item-icon">${iconHtml}</div>
                <div class="item-main-info"><div class="item-title">${def.name}</div><div class="item-cost">Cost: ${costStr}</div><div class="item-desc">${def.desc || ''}</div><div class="item-stats">${generateResourceBreakdownHtml(def, 1)}</div></div>`;
            const techReq = def.requires;
            if (techReq && !gameState.tech[techReq]) { item.classList.add('locked'); item.querySelector('.item-desc').innerHTML += `<br>Requires: ${TECH_TREE[techReq].name}`; }
            else if (!checkCanAfford(def.cost)) { item.classList.add('locked'); item.title = "Not enough resources."; }
            else { item.addEventListener('click', () => startPlacement(type)); }
            list.appendChild(item);
        }
    }
    
    // in js/game.js

function renderSpecialistList() {
    const list = document.getElementById('specialist-list'); list.innerHTML = '';
    const specialistStations = findTiles(c => TILE_DEFS[c.building.type]?.provides?.specialist_station_radius);
    
    gameState.specialists.forEach((s, index) => {
        const item = document.createElement('div'); item.className = 'list-item';
        if(index >= gameState.housingCapacity) { item.classList.add('locked'); item.title = "No available housing for this specialist."; }

        let jobOptions = `<option value="Build/Repair">Build/Repair</option>`;
        if (s.skill === 'Engineer') jobOptions += `<option value="Mining">Mining</option><option value="Pumping">Pumping</option><option value="Fabricating">Fabricating</option><option value="Assault">Assault Hive</option><option value="Deconstruction">Deconstruct Wreckage</option>`;
        if (s.skill === 'Biologist') jobOptions += `<option value="Farming">Farming</option><option value="Harvesting">Harvest Flora</option>`;
        if (s.skill === 'Scientist') jobOptions += `<option value="Research">Research</option><option value="Investigating">Investigate Ruins</option>`;
        if(gameState.tech['genesis-protocol']) jobOptions += `<option value="Charging">Charge Vault</option>`;
        
        // Add dynamic jobs from runtime POIs
        Object.values(gameState.runtimeDefs.tileDefs).forEach(def => {
            if (def.interaction?.skill === s.skill) {
                jobOptions += `<option value="${def.interaction.job}">${def.interaction.job}</option>`;
            }
        });

        let stationOptions = `<option value="null">Unassigned</option>`;
        specialistStations.forEach(st => {
            stationOptions += `<option value="${st.x},${st.y}">${TILE_DEFS[st.building.type].name} at (${st.x},${st.y})</option>`;
        });

        const traitHtml = s.traits.map(traitId => {
            const pos = TRAITS.positive.find(t => t.id === traitId);
            if(pos) return `<div class="trait-positive" title="${pos.desc}">${pos.name}</div>`;
            const neg = TRAITS.negative.find(t => t.id === traitId);
            if(neg) return `<div class="trait-negative" title="${neg.desc}">${neg.name}</div>`;
            return '';
        }).join('');
        
        const xpNeeded = getXPForLevel(s.level + 1);
        
        let priorityTargetInfo = '';
        let priorityActions = `<button class="button priority-btn" data-id="${s.id}">Set Priority</button>`;
        if (s.task.priorityTarget) {
            const ptBuilding = gameState.world.grid[s.task.priorityTarget.y][s.task.priorityTarget.x].building;
            const buildingName = TILE_DEFS[ptBuilding.type]?.name || 'Unknown Target';
            priorityTargetInfo = `<div class="item-desc priority-task">Priority: ${buildingName} at (${s.task.priorityTarget.x}, ${s.task.priorityTarget.y})</div>`;
            // Add a "Clear" button next to the "Set" button
            priorityActions += `<button class="button button-link clear-priority-btn" data-id="${s.id}">Clear</button>`;
        }
        item.innerHTML = `
            <div class="item-main-info">
                <div class="item-title">${s.name} (Lvl ${s.level} ${s.skill})</div>
                <div class="xp-bar-container"><div class="xp-bar" style="width:${(s.xp/xpNeeded)*100}%"></div><span class="xp-text">${s.xp}/${xpNeeded} XP</span></div>
                <div class="item-desc">${getSpecialistTaskDescription(s)}</div>
                ${priorityTargetInfo}
                <div class="trait-container">${traitHtml}</div>
            </div>
            <div class="specialist-actions">
                <label>Job: <select class="primary-job-select" data-id="${s.id}">${jobOptions}</select></label>
                <label>Station: <select class="station-select" data-id="${s.id}">${stationOptions}</select></label>
                <div class="priority-buttons-container">${priorityActions}</div>
            </div>`;
        
        const jobSelect = item.querySelector('.primary-job-select');
        jobSelect.value = s.primaryJob;
        jobSelect.addEventListener('change', e => { 
            const specialist = gameState.specialists.find(sp => sp.id == e.target.dataset.id);
            if(specialist) { specialist.primaryJob = e.target.value; setSpecialistTask(specialist, { current: 'idle' }); renderSpecialistList(); }
        });

        const stationSelect = item.querySelector('.station-select');
        stationSelect.value = s.stationId ? `${s.stationId.x},${s.stationId.y}` : "null";
        stationSelect.addEventListener('change', e => {
            const specialist = gameState.specialists.find(sp => sp.id == e.target.dataset.id);
            if (specialist) {
                if (e.target.value === "null") {
                    specialist.stationId = null;
                } else {
                    const [x, y] = e.target.value.split(',').map(Number);
                    specialist.stationId = {x, y};
                }
                setSpecialistTask(specialist, { current: 'idle' });
                renderSpecialistList();
            }
        });

        item.querySelector('.priority-btn').addEventListener('click', e => {
            const specialistId = parseInt(e.target.dataset.id, 10);
            startPriorityTargeting(specialistId);
        });

        const clearBtn = item.querySelector('.clear-priority-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', e => {
                const specialistId = parseInt(e.target.dataset.id, 10);
                const specialist = gameState.specialists.find(sp => sp.id === specialistId);
                if (specialist) {
                    specialist.task.priorityTarget = null;
                    addMessage(gameState, 'INFO', `Priority cleared for ${specialist.name}.`);
                    setSpecialistTask(specialist, { current: 'idle' }); // Force re-evaluation
                    renderSpecialistList(); // Refresh the modal
                }
            });
        }

        list.appendChild(item);
    });

    const artifactContainer = document.createElement('div');
    artifactContainer.id = "artifact-container";
    artifactContainer.innerHTML = '<h3>Discovered Artifacts</h3>';
    if (gameState.artifacts.active.length === 0) {
        artifactContainer.innerHTML += '<p>None yet. Explore dangerous locations to find them.</p>';
    } else {
        gameState.artifacts.active.forEach(artDef => {
            artifactContainer.innerHTML += `<div class="artifact-item"><strong>${artDef.name}</strong>: ${artDef.desc}</div>`;
        });
    }
    list.appendChild(artifactContainer);

    const resetButton = document.createElement('div'); resetButton.className = 'button danger'; resetButton.style.width = "100%"; resetButton.textContent = 'Reset All Progress';
    resetButton.onclick = async () => { if(confirm('Are you sure? All progress will be lost permanently.')) { await clearSave(); location.reload(); }};
    list.appendChild(resetButton);
}

    function renderResearchTree() {
        const list = document.getElementById('research-list'); list.innerHTML = '';
        const sortedTech = Object.entries(TECH_TREE).sort(([,a], [,b]) => (a.cost || 0) - (b.cost || 0));
        for(const [id, tech] of sortedTech) {
            if (gameState.tech[id]) continue;
            const item = document.createElement('div'); item.className = 'list-item';
            const canAfford = checkCanAfford({ research: tech.cost, exoticMatter: tech.exoticCost || 0 });
            
            let costStr = `${tech.cost} RP` + (tech.exoticCost ? ` & ${tech.exoticCost} EM` : '');
            
            item.innerHTML = `<div><div class="item-title">${tech.name} (${costStr})</div><div class="item-desc">${tech.desc}</div>${tech.isVictory ? `<div class="item-cost" style="color:var(--warning-color)">VICTORY PROJECT</div>`: ''}</div>`;
            const isLocked = tech.requires && !gameState.tech[tech.requires];
            if (isLocked) { item.classList.add('locked'); item.querySelector('.item-desc').innerHTML += `<br>Requires: ${TECH_TREE[tech.requires].name}`; }
            else if (!canAfford) { item.classList.add('locked'); item.title = "Not enough resources."; }
            else { 
                item.addEventListener('click', () => { 
                    if(checkAndSpendResources({ research: tech.cost, exoticMatter: tech.exoticCost || 0 })) {
                        unlockTech(id);
                        addMessage(gameState, 'DIRECTOR', `Eureka! Unlocked: ${tech.name}.`); audioManager.play('success');
                        renderResearchTree();
                        triggerMissionControlEvent({ event: 'tech_researched', name: tech.name, id: id });
                    }
                }); 
            }
            list.appendChild(item);
        }
    }

    function renderObjectivesModal() {
        const list = document.getElementById('objectives-list'); list.innerHTML = '';
        const completedIds = gameState.objectives.completed.map(o => o.id);
        Object.entries(OBJECTIVES).forEach(([id, obj]) => {
            const completedEntry = gameState.objectives.completed.find(o => o.id === id);
            let state = 'locked';
            if (completedEntry && completedEntry.claimed) state = 'completed';
            else if (completedEntry && !completedEntry.claimed) state = 'completable';
            else if (id === gameState.objectives.current) state = 'current';

            if (state === 'locked' && obj.requires && !completedIds.includes(obj.requires)) return;

            const item = document.createElement('div'); item.className = `objective-item ${state}`;
            let rewardsHtml = '<div class="objective-rewards">';
            if (obj.reward) {
                if(obj.reward.resources) Object.entries(obj.reward.resources).forEach(([res, val]) => { rewardsHtml += `<div class="reward-item">${SVG_DEFS[res] || ''} +${val} ${res}</div>`; });
                if(obj.reward.tech) rewardsHtml += `<div class="reward-item">${SVG_DEFS.research} Unlock: ${TECH_TREE[obj.reward.tech]?.name || obj.reward.tech}</div>`;
                if(obj.reward.specialist) rewardsHtml += `<div class="reward-item">${SVG_DEFS.housing} Specialist: ${obj.reward.specialist}</div>`;
                if(obj.reward.vehicle) rewardsHtml += `<div class="reward-item">${SVG_DEFS[VEHICLE_DEFS[obj.reward.vehicle].svg]} +1 ${VEHICLE_DEFS[obj.reward.vehicle].name}</div>`;
            }
            rewardsHtml += '</div>';

            let actionHtml = (state === 'completable') ? `<div class="objective-action"><button class="button claim-button" data-id="${id}">Claim Reward</button></div>` :
                             (state === 'completed') ? `<div class="objective-action"><button class="button" disabled>✔ Claimed</button></div>` : '';
            
            item.innerHTML = `<div class="objective-header"><div class="objective-icon">${SVG_DEFS.objective || ''}</div><div class="objective-info"><div class="objective-title">${obj.name}</div><div class="objective-desc">${obj.desc}</div></div></div>${(obj.reward && Object.keys(obj.reward).length > 0) ? rewardsHtml : ''}${actionHtml}`;
            
            if (state === 'completable') {
                item.querySelector('.claim-button').addEventListener('click', (e) => {
                    const objectiveId = e.target.dataset.id;
                    const objectiveToClaim = gameState.objectives.completed.find(o => o.id === objectiveId);
                    if (objectiveToClaim) {
                        objectiveToClaim.claimed = true;
                        grantObjectiveReward(objectiveId);
                        renderObjectivesModal();
                        updateNotificationIndicator();
                        audioManager.play('success');
                    }
                });
            }
            list.appendChild(item);
        });
    }

    function renderOverlays() {
        document.getElementById('dust-storm-overlay').style.display = gameState.events.dustStorm.active ? 'block' : 'none';
        document.getElementById('solar-flare-overlay').style.display = gameState.events.solarFlare.active ? 'block' : 'none';
        document.getElementById('magnetic-storm-overlay').style.display = gameState.events.magneticStorm.active ? 'block' : 'none';
    }

    function renderObjectiveBanner() {
        const banner = document.getElementById('objective-banner');
        const currentObjectiveId = gameState.objectives.current;
        if (currentObjectiveId) {
            banner.innerHTML = `<strong>Objective:</strong> ${OBJECTIVES[currentObjectiveId].name}`;
            banner.style.display = 'block';
        } else { banner.style.display = 'none'; }
    }
    
    function updateNotificationIndicator() {
        const hasUnclaimed = gameState.objectives.completed.some(o => !o.claimed);
        document.getElementById('objectives-nav-btn').classList.toggle('has-notification', hasUnclaimed);
    }
    
    function renderEventLog(state) {
        const stateToRender = state || gameState;
        if (!stateToRender) return;
        const log = document.getElementById('event-log');
        if (log) log.innerHTML = stateToRender.messages.slice(0, 10).map(msg => `<div class="log-entry log-${msg.type.toLowerCase()}"><strong>[${msg.type}]</strong> ${msg.text}</div>`).join('');
    }
    
    function renderMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        const ctx = canvas.getContext('2d');
        const mapWidth = canvas.width, mapHeight = canvas.height;
        const tileW = mapWidth / WORLD_WIDTH;
        const tileH = mapHeight / WORLD_HEIGHT;

        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, mapWidth, mapHeight);

        if (gameState.events.magneticStorm.active) {
            ctx.fillStyle = 'white';
            for (let i = 0; i < 1000; i++) {
                ctx.fillRect(Math.random() * mapWidth, Math.random() * mapHeight, 2, 2);
            }
            return;
        }

        for(let y=0; y<WORLD_HEIGHT; y++) for(let x=0; x<WORLD_WIDTH; x++) {
            if(gameState.world.fog[y][x] === 0) continue;
            
            const cell = gameState.world.grid[y][x];
            let color = '#4a5568'; 
            const buildingDef = TILE_DEFS[cell.building.type];
            if (buildingDef && !buildingDef.isInfrastructure && !buildingDef.isPOI) color = '#e2e8f0'; 
            else if (buildingDef?.isPOI) color = 'var(--accent-color)';
            else if (cell.terrain === 'rocky') color = '#718096';
            else if (cell.terrain === 'ice') color = '#63b3ed';
            else if (cell.terrain === 'crystalline') color = '#9f7aea';

            ctx.fillStyle = color;
            ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
            if(gameState.world.fog[y][x] === 1 || gameState.world.fog[y][x] === 2) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
            }
        }
        
        ctx.fillStyle = 'red';
        gameState.threats.active.forEach(t => {
            if(gameState.world.fog[Math.floor(t.y)]?.[Math.floor(t.x)] >= 2) ctx.fillRect(t.x * tileW, t.y * tileH, tileW*1.5, tileH*1.5);
        });

        const { width, height } = canvases.interaction.getBoundingClientRect();
        const scaledCellSize = CELL_SIZE * gameState.camera.scale;
        const viewWidthInCells = width / scaledCellSize;
        const viewHeightInCells = height / scaledCellSize;
        const viewRectX = (gameState.camera.x - viewWidthInCells / 2) * tileW;
        const viewRectY = (gameState.camera.y - viewHeightInCells / 2) * tileH;
        const viewRectW = viewWidthInCells * tileW;
        const viewRectH = viewHeightInCells * tileH;
        
        ctx.strokeStyle = '#ecc94b'; ctx.lineWidth = 2;
        ctx.strokeRect(viewRectX, viewRectY, viewRectW, viewRectH);
    }

    // --- 6. INTERACTION & UX ---
    function setupEventListeners() {
        const interactionCanvas = canvases.interaction;
        const modalContainer = document.getElementById('modal-container');

        const logToggleBtn = document.getElementById('log-toggle-btn');
        if (logToggleBtn) {
            logToggleBtn.addEventListener('click', () => {
                const container = document.getElementById('event-log-container');
                container.classList.toggle('expanded');
                logToggleBtn.textContent = container.classList.contains('expanded') ? '▼' : '▲';
            });
        }

        document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', (e) => {
 
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            if (btn.id === 'advisor-btn') {
                handleAdvisorClick();
            } else {
                const isFullScreen = (btn.dataset.modal === 'objectives-modal' || btn.dataset.modal === 'research-modal') && window.innerWidth <= 768;
                showModal(btn.dataset.modal, isFullScreen); 
            }
            audioManager.play('click'); 
        }));
        
        modalContainer.addEventListener('click', (e) => { if (e.target === modalContainer || e.target.closest('.modal-close-btn')) hideModals(); });
        
        // Swipe-to-close logic for mobile bottom sheets
        let modalStartY = 0;
        let currentModal = null;

        modalContainer.addEventListener('touchstart', (e) => {
            if (window.innerWidth <= 768 && e.target.closest('.modal-content') && !e.target.closest('.modal-content.full-screen')) {
                modalStartY = e.touches[0].clientY;
                currentModal = e.target.closest('.modal-content');
                currentModal.style.transition = 'none';
            }
        }, { passive: true });

        modalContainer.addEventListener('touchmove', (e) => {
            if (!currentModal) return;
            const deltaY = e.touches[0].clientY - modalStartY;
            if (deltaY > 0) {
                const scrollable = e.target.closest('.modal-content > div:not(.modal-header)');
                if (scrollable && scrollable.scrollTop > 0) return;
                if (e.cancelable) e.preventDefault();
                currentModal.style.transform = `translateY(${deltaY}px)`;
            }
        }, { passive: false });

        modalContainer.addEventListener('touchend', (e) => {
            if (!currentModal) return;
            const deltaY = e.changedTouches[0].clientY - modalStartY;
            currentModal.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            if (deltaY > 150) {
                hideModals();
            } else {
                currentModal.style.transform = '';
            }
            currentModal = null;
        });
        
        interactionCanvas.addEventListener('pointerdown', handlePointerDown);
        interactionCanvas.addEventListener('pointermove', handlePointerMove);
        interactionCanvas.addEventListener('pointerup', handlePointerUp);
        interactionCanvas.addEventListener('pointercancel', handlePointerUp);

        interactionCanvas.addEventListener('wheel', handleWheel, { passive: false });
        interactionCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        interactionCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        interactionCanvas.addEventListener('contextmenu', handleGridRightClick);
        document.addEventListener('keydown', handleKeyDown);
        
        const minimap = document.getElementById('minimap-canvas');
        minimap.addEventListener('click', handleMinimapClick);

        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                const keyInput = document.getElementById('api-key-input').value.trim();
                const modelInput = document.getElementById('model-select').value;
                setApiKey(keyInput);
                setModel(modelInput);
                const msg = document.getElementById('settings-message');
                msg.style.display = 'block';
                setTimeout(() => { msg.style.display = 'none'; hideModals(); }, 1500);
            });
        }
    }
    
    function showModal(modalId, isFullScreen = false) {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.querySelectorAll('.modal-content').forEach(m => {
            m.classList.remove('active');
            m.classList.remove('full-screen');
            m.style.transform = ''; // reset swipe transform
        });
        const targetModal = document.getElementById(modalId);
        if (targetModal) {
            if (isFullScreen) targetModal.classList.add('full-screen');
            switch (modalId) {
                case 'build-modal': renderBuildMenu(); break;
                case 'team-modal': renderSpecialistList(); break;
                case 'research-modal': renderResearchTree(); break;
                case 'objectives-modal': renderObjectivesModal(); break;
                case 'remote-build-modal': renderRemoteBuildMenu(); break;
            }
            targetModal.classList.add('active');
            modalContainer.classList.add('active');
            activeModalId = modalId;
        }
    }

    function renderRemoteBuildMenu() {
        const list = document.getElementById('remote-build-list');
        list.innerHTML = '<p style="padding: 10px; color: var(--text-muted);">Select a building for the Constructor to build remotely.</p>';
        const buildableTypes = ['solarPanel', 'battery', 'power-conduit', 'water-extractor', 'water-pipe', 'defense-turret', 'maintenance-hub', 'command-post'];
        
        buildableTypes.forEach(type => {
            const def = TILE_DEFS[type];
            if (!def) return;
            const item = document.createElement('div');
            item.className = 'list-item';
            
            let iconHtml = '';
            if (type === 'power-conduit' || type === 'water-pipe') {
                 iconHtml = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="10" y="45" width="80" height="10" fill="var(--${type === 'power-conduit' ? 'warning' : 'water'}-color)" /><rect x="45" y="10" width="10" height="80" fill="var(--${type === 'power-conduit' ? 'warning' : 'water'}-color)" /></svg>`;
            } else {
                 iconHtml = SVG_DEFS[def.svg] || (typeof def.svg === 'object' ? SVG_DEFS[def.svg.base] : '');
            }

            let costStr = Object.entries(def.cost || {}).map(([res, val]) => `${val}${res.charAt(0).toUpperCase()}`).join(' ');
            item.innerHTML = `<div class="list-item-icon">${iconHtml}</div>
                <div class="item-main-info"><div class="item-title">${def.name}</div><div class="item-cost">Cost: ${costStr}</div><div class="item-desc">${def.desc || ''}</div></div>`;
            
            const techReq = def.requires;
            if (techReq && !gameState.tech[techReq]) {
                item.classList.add('locked');
                item.querySelector('.item-desc').innerHTML += `<br>Requires: ${TECH_TREE[techReq].name}`;
            } else if (!checkCanAfford(def.cost)) {
                item.classList.add('locked');
            } else {
                item.addEventListener('click', () => {
                    startPlacement(type);
                });
            }
            list.appendChild(item);
        });
    }

    function hideModals() { 
        const modalContainer = document.getElementById('modal-container');
        modalContainer.classList.remove('active'); 
        setTimeout(() => {
            modalContainer.querySelectorAll('.modal-content').forEach(m => {
                m.classList.remove('active');
                m.style.transform = '';
            });
        }, 300); // Wait for transition
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        activeModalId = null; 
    }
    
    function handleGridClick(e) {
        if (!gameState || gameState.gameOver || isDragPlacing) return;
        const coords = getGridCoordsFromEvent(e);
        if (!coords) return;

        if (gameState.placement.isPriorityTargeting) {
            const building = gameState.world.grid[coords.y][coords.x].building;
            if(building.type !== 'empty') {
                setPriorityTarget(gameState.placement.specialistId, coords.x, coords.y);
            } else {
                addMessage(gameState, 'EVENT', 'Cannot set priority on an empty tile.');
            }
            return;
        }
        
        audioManager.play('click', 0.5);
        
        const clickedSpecialist = gameState.specialists.find(s => {
            const isVisible = gameState.world.fog[Math.floor(s.y)]?.[Math.floor(s.x)] === 2;
            return isVisible && Math.hypot(s.x - coords.exactX, s.y - coords.exactY) < 0.75;
        });
        if (clickedSpecialist) { selectSpecialist(clickedSpecialist.id); return; }

        const clickedThreat = gameState.threats.active.find(t => {
            const isVisible = gameState.world.fog[Math.floor(t.y)]?.[Math.floor(t.x)] === 2;
            return isVisible && coords.exactX >= t.x && coords.exactX <= t.x + 1 && coords.exactY >= t.y && coords.exactY <= t.y + 1;
        });
        if (clickedThreat) {
            selectThreat(clickedThreat.id);
            return;
        }
        
        const clickedVehicle = gameState.vehicles.find(v => {
             const isVisible = gameState.world.fog[Math.floor(v.y)]?.[Math.floor(v.x)] === 2;
             return isVisible && Math.hypot(v.x - coords.exactX, v.y - coords.exactY) < 0.75;
        });
        if (clickedVehicle) { selectVehicle(clickedVehicle.id); return; }

        if (gameState.placement.active) { 
            handlePlacement(coords.x, coords.y, gameState.placement.type);
            return; 
        }
        if (gameState.world.grid[coords.y][coords.x].building.type !== 'empty') { selectTile(coords.x, coords.y); } else { clearSelection(); }
    }

    function handleGridRightClick(e) {
        e.preventDefault();
        if (gameState.placement.active || gameState.placement.isPriorityTargeting) { cancelPlacement(); return; }
        
        if (gameState.selection.active && gameState.selection.type === 'vehicle') {
            const coords = getGridCoordsFromEvent(e);
            if (coords) issueMoveCommand(gameState.selection.id, coords.x, coords.y);
        }
    }
    
    function handleKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'LABEL') return;
        const cam = gameState.camera; let moved = false;
        const moveAmount = 1; 
        if (e.key === "Escape") { cancelPlacement(); clearSelection(); hideModals(); }
        if (e.key === "w" || e.key === "ArrowUp") { cam.y -= moveAmount; moved = true; }
        if (e.key === "s" || e.key === "ArrowDown") { cam.y += moveAmount; moved = true; }
        if (e.key === "a" || e.key === "ArrowLeft") { cam.x -= moveAmount; moved = true; }
        if (e.key === "d" || e.key === "ArrowRight") { cam.x += moveAmount; moved = true; }
        if(moved) { clampCamera(); needsStaticRedraw = true; needsDynamicRedraw = true; renderMinimap(); }
    }
    
    function handlePointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        
        const placementActive = gameState.placement.active;
        const def = placementActive ? TILE_DEFS[gameState.placement.type] : null;

        if (placementActive && def?.isInfrastructure) {
            isDragPlacing = true;
            handleGridClick(e);
            return;
        }
        
        activePointers.push(e);
        
        if (activePointers.length === 1) {
            hasPanned = false;
            panStart = { x: e.clientX, y: e.clientY };
            panCameraStart = { ...gameState.camera };
            canvases.interaction.style.cursor = 'grabbing';
        }
    }

    function handlePointerMove(e) {
        e.preventDefault();
        
        const rect = canvases.interaction.getBoundingClientRect();
        panStart.canvasX = e.clientX - rect.left;
        panStart.canvasY = e.clientY - rect.top;

        if (isDragPlacing) {
            const coords = getGridCoordsFromEvent(e);
            if(coords) handlePlacement(coords.x, coords.y, gameState.placement.type);
            needsDynamicRedraw = true;
            return;
        }

        if (activePointers.length === 0) return;

        const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
        if (index === -1) return;
        activePointers[index] = e;

        if (activePointers.length === 1) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            if (!hasPanned && Math.hypot(dx, dy) > 5) {
                hasPanned = true;
            }
            
            if(hasPanned) {
                const { scaledCellSize } = getCameraTransforms();
                const deltaX = dx / scaledCellSize;
                const deltaY = dy / scaledCellSize;
                gameState.camera.x = panCameraStart.x - deltaX;
                gameState.camera.y = panCameraStart.y - deltaY;
                clampCamera();
                needsStaticRedraw = true;
                needsDynamicRedraw = true;
                renderMinimap();
            }
        }
        needsDynamicRedraw = true;
    }

    function handlePointerUp(e) {
        if (isDragPlacing) {
            isDragPlacing = false;
            cancelPlacement();
            return;
        }
        
        const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
        if (index === -1) return;
        
        if (!hasPanned) {
            handleGridClick(e);
        }
        
        activePointers.splice(index, 1);
        
        if (activePointers.length === 0) {
            canvases.interaction.style.cursor = 'default';
            hasPanned = false;
        }
    }
                
    
    function handleTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            pinchStartDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            pinchStartScale = gameState.camera.scale;
            hasPanned = true; 
        }
    }

    function handleTouchMove(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const t1 = e.touches[0]; const t2 = e.touches[1];
            const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            if (pinchStartDistance === 0) return;
            const scaleFactor = currentDist / pinchStartDistance;
            
            const rect = canvases.interaction.getBoundingClientRect();
            const pinchCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
            const pinchCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;
            
            const coordsBefore = getGridCoordsFromCanvas(pinchCenterX, pinchCenterY);
            if(!coordsBefore) return;

            gameState.camera.scale = pinchStartScale * scaleFactor;
            clampCamera();

            const coordsAfter = getGridCoordsFromCanvas(pinchCenterX, pinchCenterY);
            if(!coordsAfter) return;

            gameState.camera.x += coordsBefore.x - coordsAfter.x;
            gameState.camera.y += coordsBefore.y - coordsAfter.y;
            
            clampCamera();
            needsStaticRedraw = true;
            needsDynamicRedraw = true;
            renderMinimap();
        }
    }

    function handleWheel(e) {
        e.preventDefault();
        const rect = canvases.interaction.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const coordsBefore = getGridCoordsFromCanvas(mouseX, mouseY);
        if (!coordsBefore) return;

        const zoomIntensity = 0.1;
        const zoomDirection = e.deltaY < 0 ? 1 : -1;
        gameState.camera.scale *= (1 + zoomDirection * zoomIntensity);
        clampCamera();

        const coordsAfter = getGridCoordsFromCanvas(mouseX, mouseY);
        if (!coordsAfter) return;

        gameState.camera.x += coordsBefore.x - coordsAfter.x;
        gameState.camera.y += coordsBefore.y - coordsAfter.y;

        clampCamera();
        needsStaticRedraw = true;
        needsDynamicRedraw = true;
        renderMinimap();
    }

    function handleMinimapClick(e) {
        if (gameState.events.magneticStorm.active) return;
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        gameState.camera.x = (x / rect.width) * WORLD_WIDTH;
        gameState.camera.y = (y / rect.height) * WORLD_HEIGHT;
        clampCamera();
        needsStaticRedraw = true; needsDynamicRedraw = true; renderMinimap();
    }
    
    function startPlacement(type) {
        cancelPlacement(); clearSelection();
        gameState.placement = { active: true, type };
        const def = TILE_DEFS[type];
        const banner = document.getElementById('placement-banner');
        banner.textContent = `Placing ${def.name}... (Right-click to cancel)`;
        banner.style.display = 'block';
        canvases.interaction.style.cursor = 'copy';
        hideModals();
    }
    
    function cancelPlacement() {
        if (!gameState.placement.active && !gameState.placement.isPriorityTargeting) return;
        gameState.placement = { active: false };
        document.getElementById('placement-banner').style.display = 'none';
        canvases.interaction.style.cursor = 'default';
        needsDynamicRedraw = true;
    }

    function handlePlacement(x, y, type) {
        if (!checkPlacementValidity(type, x, y)) {
            if (!isDragPlacing) { addMessage(gameState, 'EVENT', 'Cannot build there.'); audioManager.play('error'); }
            return;
        }

        const def = TILE_DEFS[type];
        if (!checkCanAfford(def.cost)) {
            if (!isDragPlacing) { addMessage(gameState, 'EVENT', 'Not enough resources.'); audioManager.play('error'); }
            return;
        }

        if (isWithinCommandRadius(x, y)) {
            if (checkAndSpendResources(def.cost)) {
                placeBuilding(x, y, type);
                if (!isDragPlacing) {
                    addMessage(gameState, 'INFO', `Built ${def.name}.`);
                    audioManager.play('build');
                }
            }
        } else {
            const constructor = findIdleConstructor();
            if (constructor) {
                if (checkAndSpendResources(def.cost)) {
                    addMessage(gameState, 'INFO', `Constructor dispatched to build ${def.name}.`);
                    setVehicleTask(constructor, 'remote-build', { target: { x, y }, buildingType: type });
                } else {
                    addMessage(gameState, 'EVENT', `Not enough resources to build ${def.name}.`);
                }
            } else {
                addMessage(gameState, 'EVENT', 'No idle Constructor available to build at this range.');
                audioManager.play('error');
            }
        }

        if (!def.isInfrastructure || !isDragPlacing) {
            cancelPlacement();
        }
    }
    
    function placeBuilding(x, y, type, force = false) {
        const def = TILE_DEFS[type];
        const targetCell = gameState.world.grid[y][x];
        const newBuilding = { type, health: 100, task: null, level: 1, connected:{}, isShielded: false, progress: 0, isUnderAttack: false };
        if (def.placeOnBuilding?.includes(targetCell.building.type)) newBuilding.onFeature = targetCell.building.type;
        
        targetCell.building = newBuilding;
        
        updateInfrastructure();
        needsStaticRedraw = true;
        renderTopBarValues();
        renderMinimap();
    }
    
    function selectTile(x, y) {
        cancelPlacement();
        gameState.selection = { active: true, type: 'building', x, y };
        renderSelectionPanel(); // This now builds the panel structure
        needsDynamicRedraw = true;
    }
    function selectVehicle(id) {
        cancelPlacement();
        gameState.selection = { active: true, type: 'vehicle', id };
        renderSelectionPanel(); // This now builds the panel structure
        needsDynamicRedraw = true;
    }
    function selectSpecialist(id) {
        cancelPlacement();
        gameState.selection = { active: true, type: 'specialist', id };
        renderSelectionPanel();
        needsDynamicRedraw = true;
    }
    function selectThreat(id) {
        cancelPlacement();
        gameState.selection = { active: true, type: 'threat', id };
        renderSelectionPanel(); // This now builds the panel structure
        needsDynamicRedraw = true;
    }
    function clearSelection() {
        if(gameState.selection.active) {
            gameState.selection.active = false;
            document.getElementById('selection-panel').classList.remove('active'); // Directly hide the panel
            needsDynamicRedraw = true;
        }
    }

    function issueMoveCommand(vehicleId, targetX, targetY) {
        if (gameState.events.magneticStorm.active && Math.random() < 0.5) {
            addMessage(gameState, 'EVENT', 'Vehicle command failed due to magnetic storm!');
            return;
        }
        const vehicle = gameState.vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;
        const path = pathfindAStar({x: Math.round(vehicle.x), y: Math.round(vehicle.y)}, {x: targetX, y: targetY}, false);
        // FIX: The original target coordinates must be stored in the task object.
        if (path) setVehicleTask(vehicle, 'move', { path: path, target: { x: targetX, y: targetY } });
        else addMessage(gameState, 'EVENT', 'Cannot find a path to that location.');
    }
    
    // --- 7. HELPERS & DEFINITIONS ---
    function clampCamera() {
        if (!canvases.terrain || !canvases.terrain.getBoundingClientRect) return;
        const { width, height } = canvases.terrain.getBoundingClientRect();
        
        gameState.camera.scale = Math.max(0.2, Math.min(3.5, gameState.camera.scale));
        const scaledCellSize = CELL_SIZE * gameState.camera.scale;

        const viewWidthInCells = width / scaledCellSize;
        const viewHeightInCells = height / scaledCellSize;

        const minX = viewWidthInCells / 2;
        const maxX = WORLD_WIDTH - viewWidthInCells / 2;
        const minY = viewHeightInCells / 2;
        const maxY = WORLD_HEIGHT - viewHeightInCells / 2;

        if (maxX < minX) { 
            gameState.camera.x = WORLD_WIDTH / 2;
        } else {
            gameState.camera.x = Math.max(minX, Math.min(maxX, gameState.camera.x));
        }

        if (maxY < minY) { 
            gameState.camera.y = WORLD_HEIGHT / 2;
        } else {
            gameState.camera.y = Math.max(minY, Math.min(maxY, gameState.camera.y));
        }
    }

    function getGridCoordsFromEvent(e) {
        const rect = canvases.interaction.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        return getGridCoordsFromCanvas(canvasX, canvasY);
    }
    
    function getGridCoordsFromCanvas(canvasX, canvasY) {
        const { scaledCellSize, offsetX, offsetY } = getCameraTransforms();
        const worldX = (canvasX - offsetX) / scaledCellSize;
        const worldY = (canvasY - offsetY) / scaledCellSize;
        const gridX = Math.floor(worldX);
        const gridY = Math.floor(worldY);

        if (gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
            return { x: gridX, y: gridY, exactX: worldX, exactY: worldY };
        }
        return null;
    }

    function generateResourceBreakdownHtml(def, level = 1, pos = null) {
        let html = '';
        let { damage, radius } = pos ? getBuffedTurretStats(pos.x, pos.y) : { damage: def.damage, radius: def.radius };

        const createItem = (icon, value, resourceIcon) => `<div class="stat-item">${icon} ${resourceIcon} ${value}/tick</div>`;
        if (def.produces) for (const [res, val] of Object.entries(def.produces)) { if(res === 'power_solar' && !gameState.dayNightCycle.isDay) continue; html += createItem(SVG_DEFS.produces, (val * level).toFixed(2), SVG_DEFS[res.replace('_solar', '')]); }
        if (def.consumes) for (const [res, val] of Object.entries(def.consumes)) html += createItem(SVG_DEFS.consumes, (val * level).toFixed(2), SVG_DEFS[res]);
        if (def.provides) for (const [res, val] of Object.entries(def.provides)) {
            if (res !== 'specialist_station_radius') html += `<div class="stat-item">${SVG_DEFS.provides} ${SVG_DEFS[res]} +${val * level}</div>`;
        }
        
        let capacity = def.capacity;
        if (def.upgrade?.effect?.capacity && level > 1) {
            capacity = def.upgrade.effect.capacity;
        }
        if (capacity) html += `<div class="stat-item">${SVG_DEFS.provides} ${SVG_DEFS.battery} +${capacity * level}</div>`;

        if (damage) html += `<div class="stat-item" style="color:var(--error-color)">DMG: ${damage * level}</div>`;
        if (radius) html += `<div class="stat-item">Range: ${radius}</div>`;
        return html;
    }

    function checkPlacementValidity(type, x, y) {
        if (!gameState.world.grid[y]?.[x]) return false;
        const cell = gameState.world.grid[y][x]; 
        const def = TILE_DEFS[type];
        if (!def) return false;
        if (def.placeOnBuilding?.includes(cell.building.type)) return true;
        if (def.placeOnTerrain && cell.building.type === 'empty' && def.placeOnTerrain.includes(cell.terrain)) return true;
        if (def.isInfrastructure && cell.building.type === 'empty') return true;
        return false;
    }
    
    function checkCanAfford(cost) {
        if (!cost) return true;
        return Object.entries(cost).every(([res, val]) => gameState.resources[res] >= val);
    }

    function checkAndSpendResources(cost) {
        if (!cost) return true;
        if (checkCanAfford(cost)) {
            Object.entries(cost).forEach(([res, val]) => gameState.resources[res] -= val);
            renderTopBarValues();
            return true;
        }
        return false;
    }
    
    function unlockTech(techId) {
        if (!gameState.tech[techId]) {
            gameState.tech[techId] = true;
        }
    }

    function checkAdjacency(x, y, type) {
        for (const {dx, dy} of [{dx:0,dy:1}, {dx:0,dy:-1}, {dx:1,dy:0}, {dx:-1,dy:0}]) {
            if (gameState.world.grid[y+dy]?.[x+dx]?.building.type === type) return true;
        }
        return false;
    }

    function isConnectable(x, y, networkType, selfType) {
        const neighborCell = gameState.world.grid[y]?.[x]; if (!neighborCell) return false;
        const neighborType = neighborCell.building.type; if (neighborType === selfType) return true;
        const neighborDef = TILE_DEFS[neighborType]; if (!neighborDef) return false;
        return neighborDef.isSource?.[networkType] || neighborDef.consumes?.[networkType] || neighborDef.requiresInfrastructure?.includes(networkType) || neighborDef.capacity > 0;
    }
    
    function generateConduitSVG(x, y, type) {
        const networkType = type === 'power-conduit' ? 'power' : 'water';
        const color = type === 'power-conduit' ? 'var(--warning-color)' : 'var(--water-color)';
        let svgParts = '';
        const connections = { north: isConnectable(x, y - 1, networkType, type), south: isConnectable(x, y + 1, networkType, type), west: isConnectable(x - 1, y, networkType, type), east: isConnectable(x + 1, y, networkType, type), };
        const connectionCount = Object.values(connections).filter(Boolean).length;
        if (connectionCount === 0) svgParts += `<rect x="45" y="45" width="10" height="10" fill="${color}"/>`;
        else if (connectionCount <= 2 && ((connections.north && connections.south) || (connections.west && connections.east))) {
            if (connections.north || connections.south) svgParts += `<rect x="45" y="0" width="10" height="100" fill="${color}"/>`;

            if (connections.west || connections.east) svgParts += `<rect x="0" y="45" width="100" height="10" fill="${color}"/>`;
        } else {
            svgParts += `<rect x="45" y="45" width="10" height="10" fill="${color}"/>`;
            if (connections.north) svgParts += `<rect x="45" y="0" width="10" height="50" fill="${color}"/>`;
            if (connections.south) svgParts += `<rect x="45" y="50" width="10" height="50" fill="${color}"/>`;
            if (connections.west) svgParts += `<rect x="0" y="45" width="50" height="10" fill="${color}"/>`;
            if (connections.east) svgParts += `<rect x="50" y="45" width="50" height="10" fill="${color}"/>`;
        }
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${svgParts}</svg>`;
    }

    function checkBuildingConnections(x,y) {
        const building = gameState.world.grid[y]?.[x]?.building;
        if(!building) return { isPowered: false, hasWater: false };
        const def = TILE_DEFS[building.type];
        if(!def) return { isPowered: false, hasWater: false };
        
        let isPowered = def.isSource?.power || building.connected?.power;
        if(def.produces?.power || def.produces?.power_solar) isPowered = true;
        
        return { isPowered, hasWater: def.isSource?.water || building.connected?.water };
    }

    function setVehicleTask(vehicle, type, data = {}) { vehicle.task = { type, ...data }; updateSelectionPanel(); }
    function setSpecialistTask(specialist, taskData) { 
        specialist.task = { ...specialist.task, ...taskData }; 
        if(gameState.selection.active && gameState.selection.type === 'specialist' && gameState.selection.id === specialist.id) {
            updateSelectionPanel();
        }
    }

    function addVehicle(type, spawnCoords = null) {
        let spawnPoint = spawnCoords;
        if(!spawnPoint) {
            const bays = findTiles(c => TILE_DEFS[c.building.type]?.builds?.some(b => b.type === type));
            if (bays.length === 0) {
                 addMessage(gameState, 'EVENT', `No facility available to build ${VEHICLE_DEFS[type].name}.`);
                 return;
            }
            spawnPoint = bays[0];
        }

        const newId = gameState.vehicles.length > 0 ? Math.max(...gameState.vehicles.map(v => v.id)) + 1 : 0;
        const newVehicle = { id: newId, type: type, name: `${VEHICLE_DEFS[type].name} ${newId+1}`, x: spawnPoint.x, y: spawnPoint.y, ...VEHICLE_DEFS[type].stats, task: { type: 'idle' }, attackCooldown: 0 };
        gameState.vehicles.push(newVehicle);
        addMessage(gameState, 'INFO', `${newVehicle.name} constructed.`);
    }
    
    function spawnThreat(type, x, y) {
        const def = THREAT_DEFS[type];
        if(x === undefined || y === undefined) {
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) { x = 0; y = Math.random() * WORLD_HEIGHT; }
            else if (edge === 1) { x = WORLD_WIDTH - 1; y = Math.random() * WORLD_HEIGHT; }
            else if (edge === 2) { x = Math.random() * WORLD_WIDTH; y = 0; }
            else { x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT - 1; }
        }
        const newId = (gameState.threats.active.length > 0 ? Math.max(...gameState.threats.active.map(t => t.id)) : -1) + 1;
        gameState.threats.active.push({ id: newId, type, x, y, ...def, target: null, targetable: true });
    }

    function pathfindAStar(start, end, allowAdjacent = false) {
        const closedSet = new Set(); const cameFrom = {};
        const gScore = { [`${start.x},${start.y}`]: 0 };
        const fScore = { [`${start.x},${start.y}`]: heuristic(start, end) };
        const openSet = new Set([`${start.x},${start.y}`]); const endKey = `${end.x},${end.y}`;
        
        while (openSet.size > 0) {
            let currentKey = null; let lowestFScore = Infinity;
            for (const key of openSet) if (fScore[key] < lowestFScore) { lowestFScore = fScore[key]; currentKey = key; }
            
            if (allowAdjacent) {
                if (Math.hypot(parseInt(currentKey.split(',')[0]) - end.x, parseInt(currentKey.split(',')[1]) - end.y) <= 1.5) {
                    return reconstructPath(cameFrom, currentKey);
                }
            } else if (currentKey === endKey) {
                 return reconstructPath(cameFrom, currentKey);
            }

            const current = { x: parseInt(currentKey.split(',')[0]), y: parseInt(currentKey.split(',')[1]) };
            openSet.delete(currentKey); closedSet.add(currentKey);
            
            [{dx:0,dy:1}, {dx:0,dy:-1}, {dx:1,dy:0}, {dx:-1,dy:0}].forEach(({dx, dy}) => {
                const neighbor = { x: current.x + dx, y: current.y + dy }; const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(neighborKey) || neighbor.x < 0 || neighbor.x >= WORLD_WIDTH || neighbor.y < 0 || neighbor.y >= WORLD_HEIGHT) return;
                
                const buildingType = gameState.world.grid[neighbor.y][neighbor.x].building.type;
                const isObstacle = buildingType !== 'empty' && (!TILE_DEFS[buildingType] || !TILE_DEFS[buildingType].isInfrastructure);
                
                if (neighborKey !== endKey && isObstacle) return;

                const tentativeGScore = gScore[currentKey] + 1;
                if (!openSet.has(neighborKey)) openSet.add(neighborKey);
                else if (tentativeGScore >= (gScore[neighborKey] || Infinity)) return;
                cameFrom[neighborKey] = currentKey; gScore[neighborKey] = tentativeGScore; fScore[neighborKey] = gScore[neighborKey] + heuristic(neighbor, end);
            });
        }
        return null;
    }
	
	function heuristic(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

    function reconstructPath(cameFrom, currentKey) {
        const totalPath = [{ x: parseInt(currentKey.split(',')[0]), y: parseInt(currentKey.split(',')[1]) }];
        while (currentKey in cameFrom) { currentKey = cameFrom[currentKey]; totalPath.unshift({ x: parseInt(currentKey.split(',')[0]), y: parseInt(currentKey.split(',')[1]) }); }
        totalPath.shift(); return totalPath;
    }

    function addMessage(state, type, text) { 
        state.messages.unshift({ type, text, time: state.time }); 
        renderEventLog(state);
    }

    function findTiles(condition) { return findTilesInGrid(gameState?.world.grid, condition); }
    function findTilesInGrid(grid, condition) {
        if (!grid) return []; const results = [];
        grid.forEach((row, y) => row.forEach((cell, x) => { const cellWithCoords = { ...cell, x, y }; if (condition(cellWithCoords)) results.push(cellWithCoords); }));
        return results;
    }
    function findTilesInRadius(cx, cy, radius, condition, useWorld = false) {
        const results = [];
        const width = useWorld ? WORLD_WIDTH : GRID_WIDTH; const height = useWorld ? WORLD_HEIGHT : GRID_HEIGHT;
        for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
            if (x >= 0 && x < width && y >= 0 && y < height && Math.hypot(cx - x, cy - y) <= radius) {
                const cell = gameState.world.grid[y]?.[x];
                if (cell && condition({ ...cell, x, y })) {
                     results.push({ ...cell, x, y });
                }
            }
        }
        return results;
    }

    function findFirstDamagedStructure() { return findTiles(t => t.building.health < 100 && t.building.type !== 'empty' && !TILE_DEFS[t.building.type].isPOI).sort((a,b) => a.building.health - b.building.health)[0]; }
    function findFirstAvailableStructure(type) { return findTiles(t => t.building.type === type && t.building.task === null && checkBuildingConnections(t.x, t.y).isPowered)[0]; }
    function isPowered() { return gameState.resources.power > 0 || gameState.resources.battery > 0; }
    function getXPForLevel(level) { return 100 * Math.pow(1.5, level - 1); }
    function grantXP(specialist, amount) {
        let traitMod = 1;
        specialist.traits.forEach(traitId => {
            const trait = TRAITS.positive.find(t=>t.id===traitId) || TRAITS.negative.find(t=>t.id===traitId);
            if(trait?.mod?.xpGain) traitMod *= trait.mod.xpGain;
        });
        specialist.xp += Math.floor(amount * traitMod);
        const xpNeeded = getXPForLevel(specialist.level + 1);
        if (specialist.xp >= xpNeeded) {
            specialist.level++;
            specialist.xp -= xpNeeded;
            
            // Specialist Perks System: Gain a random positive trait on level up
            const availableTraits = TRAITS.positive.filter(t => !specialist.traits.includes(t.id));
            let perkMessage = '';
            if (availableTraits.length > 0 && Math.random() < 0.5) { // 50% chance to gain a perk
                const newTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)];
                specialist.traits.push(newTrait.id);
                perkMessage = ` They acquired the [${newTrait.name}] trait!`;
            }
            
            addMessage(gameState, 'INFO', `${specialist.name} has been promoted to Level ${specialist.level}!${perkMessage}`);
            if (activeModalId === 'team-modal') renderSpecialistList();
        }
    }
    
    function addAlert(message, type = 'info', coords = null) {
        const container = document.getElementById('alerts-container');
        const alertEl = document.createElement('div');
        alertEl.className = `alert-item alert-${type}`;
        alertEl.innerHTML = `<span>${message}</span><button class="alert-close-btn">×</button>`;

        if (coords) {
            alertEl.classList.add('clickable');
            alertEl.onclick = (e) => {
                if(e.target.classList.contains('alert-close-btn')) return;
                gameState.camera.x = coords.x;
                gameState.camera.y = coords.y;
                clampCamera();
                needsStaticRedraw = true; needsDynamicRedraw = true;
                renderMinimap();
                alertEl.remove();
            };
        }
        alertEl.querySelector('.alert-close-btn').onclick = () => alertEl.remove();
        container.appendChild(alertEl);
        setTimeout(() => alertEl.remove(), 8000);
    }
    
   // in game.js

function findBestTargetForThreat(threat) {
    const def = THREAT_DEFS[threat.type];
    if (!def.targetPriority) {
        return findTiles(c => c.building.type !== 'empty' && !TILE_DEFS[c.building.type].isPOI).sort((a,b) => Math.hypot(a.x - threat.x, a.y - threat.y) - Math.hypot(b.x - threat.x, b.y - threat.y))[0];
    }
    for (const priority of def.targetPriority) {
        // --- START OF FIX ---
        const potentialTargets = findTiles(c => {
            const buildingDef = TILE_DEFS[c.building.type];
            // Explicitly ignore all POIs, no matter the priority
            if (!buildingDef || buildingDef.isPOI) {
                return false;
            }
            // Now check for priority match on non-POI buildings
            return buildingDef[priority] || c.building.type === priority;
        });
        // --- END OF FIX ---

        if (potentialTargets.length > 0) {
            return potentialTargets.sort((a, b) => Math.hypot(a.x - threat.x, a.y - threat.y) - Math.hypot(b.x - threat.x, b.y - threat.y))[0];
        }
    }
    // Fallback if no priority targets are found
    return findTiles(c => c.building.type !== 'empty' && !TILE_DEFS[c.building.type].isPOI).sort((a,b) => Math.hypot(a.x - threat.x, a.y - threat.y) - Math.hypot(b.x - threat.x, b.y - threat.y))[0];
}

    function getBuffedTurretStats(turretX, turretY) {
        const turret = gameState.world.grid[turretY][turretX];
        const def = TILE_DEFS[turret.building.type];
        let damage = def.damage;
        let radius = def.radius;

        findTilesInRadius(turretX, turretY, 5, c => c.building.type === 'command-post' && checkBuildingConnections(c.x, c.y).isPowered).forEach(post => {
            const specialist = gameState.specialists.find(s => s.stationId?.x === post.x && s.stationId?.y === post.y);
            if(specialist) {
                if (specialist.skill === 'Engineer') damage *= 1.25;
                if (specialist.skill === 'Scientist') radius *= 1.25;
            }
        });
        return { damage, radius };
    }

    function createEffect(type, startX, startY, endX, endY, size, color) {
        const newId = (gameState.effects.length > 0 ? Math.max(...gameState.effects.map(e => e.id)) : -1) + 1;
        const duration = type === 'projectile' ? 300 : 500; // in ms
        gameState.effects.push({
            id: newId, type,
            x: startX, y: startY,
            startX, startY, endX, endY,
            size, color: color || 'white',
            startTime: performance.now(),
            duration
        });
        needsDynamicRedraw = true;
    }

    function grantArtifact(artifactData) {
        if (!artifactData || !artifactData.id) return;
        
        // If the artifact already exists (from a static def or runtime), don't re-add.
        if (gameState.artifacts.active.some(a => a.id === artifactData.id)) return;

        gameState.artifacts.active.push(artifactData);
        addAlert(`Artifact Recovered: ${artifactData.name}!`, 'success');
        addMessage(gameState, 'DIRECTOR', `Artifact effect active: ${artifactData.desc}`);
        if (activeModalId === 'team-modal') renderSpecialistList();
    }

    function startPriorityTargeting(specialistId) {
        cancelPlacement();
        clearSelection();
        gameState.placement = { active: true, isPriorityTargeting: true, specialistId: specialistId };
        const banner = document.getElementById('placement-banner');
        const specialist = gameState.specialists.find(s => s.id == specialistId);
        banner.textContent = `Select a priority target for ${specialist.name}... (Right-click to cancel)`;
        banner.style.display = 'block';
        canvases.interaction.style.cursor = 'crosshair';
        hideModals();
    }
    
    function setPriorityTarget(specialistId, x, y) {
        const specialist = gameState.specialists.find(s => s.id == specialistId);
        if (specialist) {
            specialist.task.priorityTarget = { x, y };
            const buildingName = TILE_DEFS[gameState.world.grid[y][x].building.type].name;
            addMessage(gameState, 'INFO', `Set priority target for ${specialist.name} to ${buildingName}.`);
            setSpecialistTask(specialist, { current: 'idle' }); // Re-evaluate tasks with new priority
            cancelPlacement();
            showModal('team-modal');
        }
    }
    
    function findIdleConstructor() {
        return gameState.vehicles.find(v => v.type === 'constructor-rover' && v.task.type === 'idle');
    }

    function isWithinCommandRadius(x, y) {
        const commandCenters = findTiles(t => t.building.type === 'habitat' || t.building.type === 'command-post');
        if (commandCenters.length === 0) return false;
        return commandCenters.some(center => Math.hypot(center.x - x, center.y - y) <= COMMAND_RADIUS);
    }

    function updateArtifacts() {
        let passiveRepair = 0;
        gameState.artifacts.active.forEach(artDef => {
            if (artDef.bonus?.passiveRepair) {
                passiveRepair += artDef.bonus.passiveRepair;
            }
        });
        
        if (passiveRepair > 0) {
            findTiles(c => c.building.type !== 'empty' && c.building.health < 100).forEach(c => {
                c.building.health = Math.min(100, c.building.health + passiveRepair);
            });
        }
    }

    function getArtifactBonus(type, defaultValue = 1) {
        let bonus = defaultValue;
        gameState.artifacts.active.forEach(artDef => {
            if (artDef.bonus?.[type]) {
                if (defaultValue === 1) bonus *= artDef.bonus[type];
                else bonus += artDef.bonus[type]; // for additive bonuses like passive repair
            }
        });
        return bonus;
    }

    function doesTaskMatchBuilding(taskType, buildingType, building, specialist = null) {
        const staticDef = TILE_DEFS[buildingType];
        if (!staticDef) return false;
    
        switch(taskType) {
            case 'Build/Repair': 
                return staticDef.cost && buildingType !== 'empty' && building.health < 100 && !staticDef.isPOI;
            case 'Research': return buildingType === 'lab';
            case 'Mining': return buildingType === 'extractor';
            case 'Pumping': return buildingType === 'water-extractor';
            case 'Farming': return buildingType === 'hydroponics';
            case 'Fabricating': return buildingType === 'fabricator';
            case 'Charging': return buildingType === 'terraformer-seed-vault';
            case 'Investigating': return buildingType === 'alien-ruins' || (staticDef.interaction?.job === 'Investigating' && staticDef.interaction?.skill === specialist?.skill);
            case 'Harvesting': return buildingType === 'bioluminescent-fungi' || (staticDef.interaction?.job === 'Harvesting' && staticDef.interaction?.skill === specialist?.skill);
            case 'Assault': return buildingType === 'alien-hive' || (staticDef.interaction?.job === 'Assault' && staticDef.interaction?.skill === specialist?.skill);
            case 'Deconstruction': return buildingType === 'crashed-freighter' && specialist?.skill === 'Engineer';
            default:
                // Handle other dynamic jobs
                return staticDef.interaction?.job === taskType && staticDef.interaction?.skill === specialist?.skill;
        }
    }

    function findPotentialJobs(specialist, radius) {
        if (!specialist.stationId) return [];
        const {x, y} = specialist.stationId;
        return findTilesInRadius(x, y, radius, cell => {
            const def = TILE_DEFS[cell.building.type];
            if (!def) return false;

            // --- FIX: Allow repair on occupied buildings ---
            if (specialist.primaryJob === 'Build/Repair') {
                // A repair specialist can work on a building even if it's occupied by a primary worker.
                // Just ensure another repair specialist isn't already on the way to fix it.
                const isAlreadyBeingRepaired = gameState.specialists.some(s => 
                    s.id !== specialist.id &&
                    s.primaryJob === 'Build/Repair' &&
                    s.task.targetBuilding?.x === cell.x && s.task.targetBuilding?.y === cell.y
                );
                if (isAlreadyBeingRepaired) return false;
            } else {
                // For all other (non-repair) jobs, only one specialist can target a building at a time.
                const isOccupied = gameState.specialists.some(s => 
                    s.id !== specialist.id &&
                    s.task.targetBuilding?.x === cell.x && s.task.targetBuilding?.y === cell.y
                );
                if (isOccupied) return false;
            }
            
            return doesTaskMatchBuilding(specialist.primaryJob, cell.building.type, cell.building, specialist);
        }, true);
    }
    
function getSpecialistTaskDescription(specialist) {
    const task = specialist.task;
    switch(task.current) {
        case 'idle': 
            return `Idle at station.`;

        case 'moving_to_job': 
        case 'working': {
            // FIX: Add checks to prevent crashing if the target building is destroyed.
            const target = task.targetBuilding;
            if (!target) return 'Status Unknown'; // Safety check

            const targetCell = gameState.world.grid[target.y]?.[target.x];
            const targetDef = targetCell ? TILE_DEFS[targetCell.building.type] : null;
            
            if (targetDef?.name) {
                const verb = task.current === 'working' ? 'Working on' : 'Moving to';
                return `${verb} ${targetDef.name} at (${target.x}, ${target.y})`;
            }
            
            // Fallback message if target is invalid (e.g., destroyed)
            return `Target has been destroyed. Re-evaluating...`;
        }

        case 'returning_home': 
            return `Returning to station.`;
            
        default: 
            return 'Status Unknown';
    }
}

    function clearPOI(x, y, specialist) {
        const poi = gameState.world.grid[y][x];
        const def = TILE_DEFS[poi.building.type];
        const poix = x, poiy = y;
        
        let message = ``;
        if (def.reward) { // Handle dynamic POI rewards
            resolveDilemmaChoice({ effect: def.reward });
            message = def.reward.message || `${specialist.name} completed their work at the ${def.name}.`;
        } else { // Fallback to hardcoded POIs
            if (poi.building.type === 'alien-ruins') {
                const researchGain = 300 + Math.floor(Math.random() * 200);
                gameState.resources.research += researchGain;
                message = `${specialist.name} decoded the Alien Ruins, yielding ${researchGain} Research Points!`;
                grantArtifact(ARTIFACTS['ancient-data-core']);
            } else if (poi.building.type === 'bioluminescent-fungi') {
                const biomassGain = 25 + Math.floor(Math.random() * 25);
                gameState.resources.biomass += biomassGain;
                message = `${specialist.name} harvested ${biomassGain} Biomass from the fungi.`;
            } else if (poi.building.type === 'alien-hive') {
                const exoticGain = 10 + Math.floor(Math.random() * 10);
                gameState.resources.exoticMatter += exoticGain;
                message = `${specialist.name} destroyed the Alien Hive, recovering ${exoticGain} Exotic Matter!`;
                grantArtifact(ARTIFACTS['hive-heart']);
            } else if (poi.building.type === 'crashed-freighter') {
                const metalGain = 400 + Math.floor(Math.random() * 100);
                const compGain = 40 + Math.floor(Math.random() * 20);
                gameState.resources.metal += metalGain;
                gameState.resources.components += compGain;
                message = `${specialist.name} deconstructed the freighter wreckage, recovering ${metalGain} Metal and ${compGain} Components.`;
                grantArtifact(ARTIFACTS['auto-repair-nanites']);
            }
        }
        
        addAlert(message, 'success', {x:poix, y:poiy});
        poi.building = { type: 'empty', health: 100, task: null, level: 1, connected:{}, isShielded: false, progress: 0, isUnderAttack: false };
        grantXP(specialist, 100);
        audioManager.play('success', 0.6);
        needsStaticRedraw = true;
    }
    
    // --- GEMINI INTEGRATION FUNCTIONS ---

    async function handleAdvisorClick() {
        const advisorContent = document.getElementById('advisor-content');
        advisorContent.innerHTML = '<div class="loading-spinner"></div>Contacting Strategic AI...';
        showModal('advisor-modal', window.innerWidth <= 768);

        const summary = {
            time: gameState.time,
            resources: {
                metal: Math.floor(gameState.resources.metal),
                biomass: Math.floor(gameState.resources.biomass),
                power: Math.floor(gameState.resources.power),
                water: Math.floor(gameState.resources.water),
                components: Math.floor(gameState.resources.components),
            },
            deltas: {
                metal: gameState.resourceDeltas.metal.toFixed(1),
                power: gameState.powerDelta.toFixed(1),
                water: gameState.resourceDeltas.water.toFixed(1),
            },
            housing: `${gameState.specialists.length}/${gameState.housingCapacity}`,
            threats: {
                wave: gameState.threats.waveCount,
                activeCount: gameState.threats.active.length,
                nextWaveIn: Math.max(0, gameState.threats.nextWaveTime - gameState.time),
            },
            habitatHealth: findTiles(c => c.building.type === 'habitat')[0]?.building.health || 0,
            currentObjective: OBJECTIVES[gameState.objectives.current]?.name || 'None'
        };

        const advice = await getStrategicAdvice(summary);
        let htmlAdvice = advice.replace(/\n/g, '<br>');
        htmlAdvice = htmlAdvice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        htmlAdvice = htmlAdvice.replace(/\*(.*?)\*/g, '<em>$1</em>');
        advisorContent.innerHTML = `<p>${htmlAdvice}</p>`;
    }
    
    async function triggerMissionControlEvent(event = {}) {
        const timeSinceLast = gameState.time - (gameState.lastMissionControlTime || 0);
        if ((Math.random() < 0.02 && timeSinceLast > 50) || (Object.keys(event).length > 0 && timeSinceLast > 25)) {
            gameState.lastMissionControlTime = gameState.time;
            
            const summary = {
                trigger: event.event || 'random',
                trigger_details: event,
                time: gameState.time,
                powerDelta: gameState.powerDelta,
                resourceDeltas: gameState.resourceDeltas,
                techCount: Object.keys(gameState.tech).length,
                buildingCounts: {
                    solarPanel: findTiles(c => c.building.type === 'solarPanel').length,
                    hydroponics: findTiles(c => c.building.type === 'hydroponics').length,
                    defenseTurret: findTiles(c => c.building.type === 'defense-turret').length,
                },
                threats: {
                    wave: gameState.threats.waveCount,
                    activeCount: gameState.threats.active.length,
                },
                narrativeLog: gameState.narrativeLog.slice(-5) // Send last 5 entries for context
            };

            const narrative = await getMissionControlNarrative(summary);
            if (!narrative) return;

            if (narrative.type === 'info' && narrative.text) {
                addAlert(`[Mission Control] ${narrative.text}`, 'event');
            } else if (narrative.type === 'dilemma' && narrative.choices?.A?.text && narrative.choices?.B?.text) {
                activeDilemma = narrative;
                renderDilemmaModal(narrative);
            } else {
                console.error("Received malformed narrative object from API:", narrative);
            }
        }
    }

    function renderDilemmaModal(dilemma) {
        document.getElementById('dilemma-title').textContent = dilemma.title;
        const content = document.getElementById('dilemma-content');
        content.innerHTML = `<p>${dilemma.text.replace(/\n/g, '<br>')}</p>`;
        
        const actions = document.createElement('div');
        actions.className = 'dilemma-actions';

        const createChoiceButton = (choiceLetter) => {
            const choice = dilemma.choices[choiceLetter];
            const btnContainer = document.createElement('div');
            btnContainer.className = 'dilemma-choice-container';
            const btn = document.createElement('button');
            btn.className = 'button';
            btn.textContent = choice.text;
            btn.onclick = () => resolveDilemma(choiceLetter);
            
            let hintsHtml = '';
            if (choice.outcome_hint_positive) {
                hintsHtml += `<div class="outcome-hint positive">▲ ${choice.outcome_hint_positive}</div>`;
            }
            if (choice.outcome_hint_negative) {
                hintsHtml += `<div class="outcome-hint negative">▼ ${choice.outcome_hint_negative}</div>`;
            }
            btnContainer.appendChild(btn);
            btnContainer.innerHTML += hintsHtml;
            return btnContainer;
        };
        
        actions.appendChild(createChoiceButton('A'));
        actions.appendChild(createChoiceButton('B'));
        content.appendChild(actions);

        showModal('dilemma-modal');
    }
    
    function resolveDilemma(choiceLetter) {
        if (!activeDilemma) return;
        const choiceMade = activeDilemma.choices[choiceLetter];
        
        // Add to narrative log
        gameState.narrativeLog.push({
            time: gameState.time,
            dilemma: activeDilemma.title,
            choice: choiceMade.text,
            outcome: choiceMade.effect
        });

        resolveDilemmaChoice(choiceMade);
    
        hideModals();
        activeDilemma = null;
    }

    function resolveDilemmaChoice(choice) {
        const effect = choice.effect;
        let effectMessages = [];
    
        if (effect.message) {
            effectMessages.push(effect.message);
        }
    
        if (effect.grant_resources) {
            effect.grant_resources.forEach(resChange => {
                if (gameState.resources.hasOwnProperty(resChange.resource)) {
                    gameState.resources[resChange.resource] += resChange.amount;
                    effectMessages.push(`${resChange.amount >= 0 ? '+' : ''}${resChange.amount} ${resChange.resource}`);
                }
            });
        }
    
        if (effect.spawn_threats) {
            for (let i = 0; i < effect.spawn_threats.count; i++) {
                spawnThreat(effect.spawn_threats.type);
            }
            effectMessages.push(`Warning: ${effect.spawn_threats.count} ${THREAT_DEFS[effect.spawn_threats.type]?.name || 'threats'} detected`);
        }
    
        if (effect.apply_global_bonus) {
            gameState.events.activeBonuses.push({ ...effect.apply_global_bonus });
            effectMessages.push(`Benefit: ${effect.apply_global_bonus.type.replace(/_/g, ' ')} bonus active for ${effect.apply_global_bonus.duration} ticks.`);
        }

        if (effect.modify_building_output) {
            gameState.temporaryModifiers.push({ ...effect.modify_building_output });
            const buildingName = TILE_DEFS[effect.modify_building_output.buildingType]?.name || 'buildings';
            const multiplierPct = (effect.modify_building_output.multiplier * 100).toFixed(0);
            effectMessages.push(`Effect: ${buildingName} output set to ${multiplierPct}% for ${effect.modify_building_output.duration} ticks.`);
        }

        if (effect.create_poi) {
            createRuntimePOI(effect.create_poi);
            effectMessages.push(`A new point of interest has appeared: ${effect.create_poi.name}.`);
        }

        if (effect.grant_artifact) {
            grantArtifact(effect.grant_artifact);
            // The grantArtifact function already shows a message.
        }
    
        const outcomeText = effectMessages.length > 0 ? `Outcome: ${effectMessages.join('. ')}.` : "The situation is developing.";
        addMessage(gameState, 'DIRECTOR', `Decision: "${choice.text}". ${outcomeText}`);
    
        renderTopBarValues();
    }

    function createRuntimePOI(poiData) {
        // 1. Create and save the definitions
        const newTileDef = {
            name: poiData.name,
            svg: poiData.poiId, // Use the ID as the key for the SVG
            isPOI: true,
            desc: poiData.desc,
            taskIcon: '❓',
            workRequired: poiData.workRequired,
            interaction: poiData.interaction,
            reward: poiData.reward
        };
        gameState.runtimeDefs.tileDefs[poiData.poiId] = newTileDef;
        gameState.runtimeDefs.svgDefs[poiData.poiId] = poiData.svgString;

        // 2. Merge into live definitions
        TILE_DEFS[poiData.poiId] = newTileDef;
        SVG_DEFS[poiData.poiId] = poiData.svgString;

        // 3. Load the new image into the cache
        loadSingleImage(poiData.poiId, poiData.svgString, () => {
            needsStaticRedraw = true; // Redraw now that the image is loaded
        });
        
        // 4. Place the POI on the map
        let placed = false;
        let attempts = 0;
        while(!placed && attempts < 100) {
            const x = Math.floor(Math.random() * WORLD_WIDTH);
            const y = Math.floor(Math.random() * WORLD_HEIGHT);
            if(gameState.world.grid[y][x].building.type === 'empty') {
                gameState.world.grid[y][x].building = { type: poiData.poiId, health: 100, task: null, level: 1, connected:{}, isShielded: false, progress: 0, work: 0, isUnderAttack: false };
                placed = true;
                addAlert(`New signal detected on the map!`, 'event', {x, y});
                renderMinimap();
            }
            attempts++;
        }
        if (!placed) {
            addMessage(gameState, 'EVENT', 'Mission Control tried to place a POI, but could not find a suitable location.');
        }
    }


    function getActiveBonus(type) {
        return gameState.events.activeBonuses.find(b => b.type === type);
    }

    // --- SAVE / LOAD ---
    async function saveGame() {
        if (!db || !gameState || gameState.gameOver) return;
        try { const transaction = db.transaction(DB_STORE_NAME, 'readwrite'); transaction.objectStore(DB_STORE_NAME).put(gameState, DB_KEY); }
        catch (e) { console.error("Save failed:", e); }
    }
    async function loadGame() {
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const request = db.transaction(DB_STORE_NAME, 'readonly').objectStore(DB_STORE_NAME).get(DB_KEY);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (e) => { console.error("Could not load game from DB.", e); resolve(null); };
            } catch (e) { console.error("Could not start DB transaction for loading.", e); resolve(null); }
        });
    }
    async function clearSave() {
        if (!db) return;
        return new Promise((resolve) => {
            const request = db.transaction(DB_STORE_NAME, 'readwrite').objectStore(DB_STORE_NAME).delete(DB_KEY);
            request.onsuccess = () => resolve();
            request.onerror = (e) => { console.error("Could not clear save.", e); resolve(); };
        });
    }

    async function endGame(isVictory, message) {
        gameState.gameOver = true; clearInterval(gameLoopInterval); cancelAnimationFrame(renderLoopId); await clearSave();
        const modal = document.getElementById('end-game-modal');
        modal.innerHTML = `<h2>${isVictory ? 'VICTORY' : 'DEFEAT'}</h2><p>${message}</p><button class="button" style="display:block; margin: 20px auto;">Play Again</button>`;
        modal.querySelector('button').onclick = () => location.reload();
        showModal('end-game-modal');
    }
    
    initializeGame();
});
