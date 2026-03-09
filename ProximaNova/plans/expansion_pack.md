# Project Nova: Exploration & Dominion (Expansion Pack)

## Background & Motivation
The Director has requested a massive expansion to the base game to introduce deeper tactical gameplay, enhanced progression loops, and a sense of true exploration. The current Fog of War (FoW) is a simple binary state. By introducing a dynamic, tiered FoW and radar systems, alongside a wider array of specialized units and late-game upgrades, we can elevate the colony simulation into a grand strategy experience.

## Scope & Impact
1. **Dynamic Fog of War & Radar Systems:** FoW will now hide enemy movements and obscure specific terrain details. Radar towers will provide varying levels of "pings" depending on research upgrades.
2. **New Specialist Units:** Introducing combat-specific personnel, advanced scouts, and mechanization.
3. **Deepened Progression & Research Matrix:** Splitting research into distinct branches (Infrastructure, Military, Exploration) with tier-gating.
4. **New Buildings & Infrastructure:** Radar Arrays, Mechanized Bays, and Advanced Defenses.

---

## Proposed Mechanics

### 1. Tiered Fog of War & Sensory Intelligence
Currently, the map is either discovered (1) or undiscovered (0).
*   **Tier 0 (Undiscovered):** Pitch black. Cannot see terrain, buildings, or threats.
*   **Tier 1 (Scouted / Memory):** Terrain is visible but grayed out. Enemy units are hidden.
*   **Tier 2 (Radar Ping):** Enemy presences are shown as vague red blips (no specific unit type or precise health data).
*   **Tier 3 (Active Vision):** Provided by line-of-sight from units or advanced sensor arrays. Full visibility.

**New Building: Sensor Array**
*   *Cost:* 50 Metal, 20 Components
*   *Power:* -15/s
*   *Function:* Generates Tier 3 vision within a radius, and Tier 2 (pings) in a much larger radius. Can be upgraded.

### 2. New Roster & Units
*   **The Ranger (Scout Unit):** Fast, low health. Generates a large vision radius. Can stealth.
*   **The Sentinel (Combat Unit):** Heavy armor, ranged attacks. Can be garrisoned inside defenses.
*   **Automated Drones (Mechanized):** Built from the new *Drone Bay*. Cost resources rather than population. Excellent for hazardous gathering but require constant battery recharges.

### 3. Expanded Technology Matrix
We will restructure the `RESEARCH_TREE` in `js/data.js` into definitive branches:
*   **Exploration Branch:**
    *   *Basic Radar* (Unlocks Sensor Array)
    *   *Deep Scan* (Increases ping radius by 50%)
    *   *Thermal Optics* (Allows identifying enemy types through fog)
*   **Military Branch:**
    *   *Ballistics I* (Turret damage +25%)
    *   *Sentinel Armor* (Unlocks Sentinel recruitment)
    *   *Plasma Coils* (Advanced Turret unlocked)
*   **Logistics Branch:**
    *   *Drone Logistics* (Unlocks Automated Drones)
    *   *High-Capacity Conduits* (Increases base power transfer efficiency)

### 4. Better Progression & Pacing
*   Introduce "Threat Escalation Levels". Instead of linear spawns, alien attacks are tied to the colony's "Signature" (power generation + radar activity).
*   Add Mid-game Objectives: Build a planetary comms relay, survive a massive "Blood Moon" horde.

---

## Implementation Plan

### Phase 1: Engine & Systems Upgrade (Fog of War)
1. Modify `gameState.world.fog` to support values 0 (Hidden), 1 (Memory), 2 (Radar), 3 (Visible).
2. Update the canvas rendering loop in `js/game.js` to draw these new states (e.g., drawing red circles for Tier 2 pings instead of full alien sprites).
3. Implement Line of Sight (LoS) calculations based on a unit/building's individual sight radius.

### Phase 2: Data & Content Injection
1. Update `js/data.js` to include the new `TILE_DEFS` (Sensor Array, Drone Bay, Advanced Turret).
2. Update `js/data.js` `RESEARCH_TREE` to include the new modular progression structure.
3. Update `js/data.js` `SPECIALIST_TYPES` to include Ranger, Sentinel, and Drone.

### Phase 3: AI & Threat Overhaul
1. Modify the threat spawning logic in `js/game.js` to react to the "Signature" value.
2. Ensure threats can navigate properly even when out of player vision.

### Phase 4: UI & Balance
1. Add new icons (SVG) for the new units and tech.
2. Update the Research Modal to display branched progression paths visually.
3. Playtest costs, power drains, and combat balance.

---

## Verification & Rollback
*   **Verification:** Ensure old save files handle the new `fog` array gracefully (migration script in the load function). Ensure canvas rendering performance remains stable with the new LoS calculations.
*   **Rollback:** The expansion changes will be heavily localized to `data.js` and the render loop. Reverting to the current git commit is trivial if the design needs fundamental changes.