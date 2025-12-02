
     import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

    document.addEventListener('DOMContentLoaded', () => {
        // --- 1. DOM ELEMENT REFERENCES ---
        const navPeExplorer = document.getElementById('nav-pe-explorer');
        const navThreedExplorer = document.getElementById('nav-threed-explorer');
        const navMatrixView = document.getElementById('nav-matrix-view');
        const peExplorerView = document.getElementById('pe-explorer');
        const threedExplorerView = document.getElementById('threed-explorer');
        const matrixView = document.getElementById('matrix-view');
        const bundleView = document.getElementById('bundle-view');
        const searchInput = document.getElementById('search-input');
        const resultsCountSpan = document.getElementById('results-count');
        const sidebarFiltersContainer = document.getElementById('sidebar-filters-container');
        const peFiltersAll = document.getElementById('pe-filters-all');
        const threedFiltersAll = document.getElementById('threed-filters-all');
        const gradeFilters = document.getElementById('grade-filters');
        const dimensionFilters = document.getElementById('dimension-filters');
        const subDimensionFiltersContainer = document.getElementById('sub-dimension-filters-container');
        const subDimensionFilters = document.getElementById('sub-dimension-filters');
        const dciMinorFiltersContainer = document.getElementById('dci-minor-filters-container');
        const dciMinorFilters = document.getElementById('dci-minor-filters');
        const clearSubFiltersBtn = document.getElementById('clear-sub-filters-btn');
        const activeElementFiltersDiv = document.getElementById('active-element-filters');
        const addElementFilterBtn = document.getElementById('add-element-filter-btn');
        const bundleFilters = document.getElementById('bundle-filters');
        const peTableBody = document.getElementById('pe-table-body');
        const peCardsContainer = document.getElementById('pe-cards-container');
        const threedTableBody = document.getElementById('threed-table-body');
        const matrixTableContainer = document.getElementById('matrix-table-container');
        const matrixTableHead = document.getElementById('matrix-table-head');
        const matrixTableBody = document.getElementById('matrix-table-body');
        const matrixPlaceholder = document.getElementById('matrix-placeholder');
        const navigationControls = document.getElementById('navigation-controls');
        const backBtn = document.getElementById('back-btn');
        const activePeFilterTag = document.getElementById('active-pe-filter-tag');
        const clearPeFilterBtn = document.getElementById('clear-pe-filter-btn');
        const bundleControls = document.getElementById('bundle-controls');
        const bundleCountSpan = document.getElementById('bundle-count');
        const viewBundleBtn = document.getElementById('view-bundle-btn');
        const saveBundleBtn = document.getElementById('save-bundle-btn');
        const clearBundleBtn = document.getElementById('clear-bundle-btn');
        const selectAllCheckbox = document.getElementById('pe-bundle-select-all');
        const relatedPeModal = document.getElementById('related-pe-modal');
        const relatedPeList = document.getElementById('related-pe-list');
        const elementFilterModal = document.getElementById('element-filter-modal');
        const bundleManagerModal = document.getElementById('bundle-manager-modal');
        const saveBundleModal = document.getElementById('save-bundle-modal');
        const matrixRowSelectModal = document.getElementById('matrix-row-select-modal');
        const resetAppBtn = document.getElementById('reset-app-btn');
        const evidenceStatementsModal = document.getElementById('evidence-statements-modal');
        const evidenceStatementsModalTitle = document.getElementById('evidence-statements-modal-title');
        const evidenceStatementsModalBody = document.getElementById('evidence-statements-modal-body');
        const facetDecompositionModal = document.getElementById('facet-decomposition-modal');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const apiKeyInput = document.getElementById('api-key-input');
        const aiModelSelect = document.getElementById('ai-model-select');
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        const clearAiCacheBtn = document.getElementById('clear-ai-cache-btn');
        const clearDataCacheBtn = document.getElementById('clear-data-cache-btn');
        const aiEditToolbar = document.getElementById('ai-edit-toolbar');
        const handleStart = document.getElementById('resize-handle-start');
        const handleEnd = document.getElementById('resize-handle-end');
        // Mobile UI Elements
        const bottomNav = document.querySelector('.bottom-nav');
        const fabFilterBtn = document.getElementById('fab-filter');
        const fabBundleViewBtn = document.getElementById('fab-bundle-view');
        const fabBundleCount = document.getElementById('fab-bundle-count');
        const filterModal = document.getElementById('filter-modal');

        // --- 2. STATE MANAGEMENT ---
        const CACHE_VERSION = '1.4';
        let currentView = 'pe';
        let activePeFilter = null;
        let peMap = new Map();
        let elementMap = new Map();
        let specificElementMap = new Map();
        let textToSpecificCodeMap = new Map();
        let nameToCodeMap = new Map();
        let elementToGradePeMap = new Map();
        let peBundle = new Set();
        let navigationHistory = [];
        let isolatedColumn = null;
        let activeElementFilters = new Set();
        let savedBundles = {};
        let activeBundleFilter = null;
        let fuzzyMatchCache = new Map();
        let gradeToTopicsMap = {};
        let allTopics = [];
        let sortedGradeLabels = [];
        let matrixRowElements = new Set();
        let isNavigatingHistory = false;
        let genAI;
        let savedAnalyses = {};
        let db;
        let selectedAiModel = 'gemini-flash-latest';
        
        let activeEditableTarget = null;
        let activeResizeSpan = null;
        let isResizing = false;
        let activeHandle = null;

        // --- 3. CORE LOGIC & DATA PROCESSING ---

        const DB_NAME = 'NGSS_Explorer_Cache';
        const DB_VERSION = 2;
        const AI_STORE_NAME = 'analyses';
        const DATA_STORE_NAME = 'processed_data';
        const DATA_CACHE_KEY = 'ngss_data_cache';
        const openDb = () => new Promise((resolve, reject) => { const r = indexedDB.open(DB_NAME, DB_VERSION); r.onupgradeneeded = e => { const d = e.target.result; if (!d.objectStoreNames.contains(AI_STORE_NAME)) d.createObjectStore(AI_STORE_NAME, { keyPath: 'id' }); if (!d.objectStoreNames.contains(DATA_STORE_NAME)) d.createObjectStore(DATA_STORE_NAME, { keyPath: 'id' }); }; r.onsuccess = e => { db = e.target.result; resolve(db); }; r.onerror = e => reject(e.target.errorCode); });
        const loadDataFromDB = () => new Promise((resolve, reject) => { if (!db) { resolve(null); return; } const t = db.transaction(DATA_STORE_NAME, 'readonly').objectStore(DATA_STORE_NAME).get(DATA_CACHE_KEY); t.onsuccess = e => resolve(e.target.result ? e.target.result.data : null); t.onerror = e => reject(e.target.errorCode); });
        const saveDataToDB = data => { if (!db) return; db.transaction(DATA_STORE_NAME, 'readwrite').objectStore(DATA_STORE_NAME).put({ id: DATA_CACHE_KEY, data }); };
        const clearDataCache = () => new Promise((resolve, reject) => { if (!db) { resolve(); return; } const r = db.transaction(DATA_STORE_NAME, 'readwrite').objectStore(DATA_STORE_NAME).clear(); r.onsuccess = () => resolve(); r.onerror = e => reject(e.target.errorCode); });
        const loadAnalysesFromDB = () => new Promise((resolve, reject) => { if (!db) { resolve({}); return; } const r = db.transaction(AI_STORE_NAME, 'readonly').objectStore(AI_STORE_NAME).getAll(); r.onsuccess = e => { const results = e.target.result, cache = {}; results.forEach(item => { if (!cache[item.peId]) cache[item.peId] = {}; cache[item.peId][item.part] = item.html; }); resolve(cache); }; r.onerror = e => reject(e.target.errorCode); });
        const saveAnalysisToDB = (peId, part, html) => { if (!db) return; db.transaction(AI_STORE_NAME, 'readwrite').objectStore(AI_STORE_NAME).put({ id: `${peId}-${part}`, peId, part, html }); };
        const deleteAnalysisFromDB = (peId, part) => { if (!db) return; db.transaction(AI_STORE_NAME, 'readwrite').objectStore(AI_STORE_NAME).delete(`${peId}-${part}`); };
        const clearAllAnalyses = () => new Promise((resolve, reject) => { if (!db) { resolve(); return; } const r = db.transaction(AI_STORE_NAME, 'readwrite').objectStore(AI_STORE_NAME).clear(); r.onsuccess = () => { savedAnalyses = {}; resolve(); }; r.onerror = e => reject(e.target.errorCode); });
        const updateUrlFromState = () => { if (isNavigatingHistory) return; const p = new URLSearchParams(); p.set('view', currentView); const q = searchInput.value.trim(); if (q) p.set('q', q); if (currentView === 'pe') { const g = gradeFilters.querySelector('.active')?.dataset.filter; if (g && g !== 'all') p.set('grade', g); const t = [...document.querySelectorAll('#topic-filters .filter-btn.active')].map(b => b.dataset.filter); if (t.length > 0 && !t.includes('all')) p.set('topic', t.join(',')); if (activeElementFilters.size > 0) p.set('elements', [...activeElementFilters].join(',')); if (activeBundleFilter) p.set('bundleFilter', activeBundleFilter); const e = peTableBody.querySelector('.pe-main-row.expanded')?.dataset.peId; if (e) p.set('expanded', e); } else if (['3d', 'matrix'].includes(currentView)) { if (activePeFilter) p.set('highlight', activePeFilter); if (isolatedColumn && currentView === '3d') p.set('isolate', isolatedColumn); const d = dimensionFilters.querySelector('.active')?.dataset.filter; if (d) p.set('dim', d); const s = [...subDimensionFilters.querySelectorAll('.active')].map(b => b.dataset.filter); if (s.length > 0) p.set('subDim', s.join(',')); const m = [...dciMinorFilters.querySelectorAll('.active')].map(b => b.dataset.filter); if (m.length > 0) p.set('minorDim', m.join(',')); } else if (currentView === 'bundle' && peBundle.size > 0) p.set('bundlePEs', [...peBundle].join(',')); if (currentView === 'matrix' && matrixRowElements.size > 0) { const a = new Set(); window.allNgss3dElements.forEach(d => (d.elements || d.core_ideas?.flatMap(c => c.components) || []).forEach(i => a.add(i.name.split(':')[0].trim()))); if (matrixRowElements.size !== a.size) p.set('matrixRows', [...matrixRowElements].join(',')); } const u = `${window.location.pathname}?${p.toString()}`; history.replaceState(null, '', u); };
        
        const scrollToPeRow = (row) => {
            if (!row) return;
            const isMobile = window.innerWidth < 992;
            const scrollContainer = isMobile 
                ? document.querySelector('.app-layout') 
                : peExplorerView.querySelector('.table-container');
            const head = document.querySelector('#pe-explorer-table thead');
            if (scrollContainer && head) {
                const rowTop = isMobile
                    ? row.getBoundingClientRect().top + scrollContainer.scrollTop
                    : row.offsetTop;
                scrollContainer.scrollTo({
                    top: rowTop - head.offsetHeight,
                    behavior: 'smooth'
                });
            }
        };

        const applyStateFromUrl = () => { 
            isNavigatingHistory = true; 
            const p = new URLSearchParams(window.location.search); 
            searchInput.value = ''; 
            document.querySelectorAll('.filter-btn.active').forEach(b => b.classList.remove('active')); 
            gradeFilters.querySelector('[data-filter="all"]')?.classList.add('active'); 
            renderTopicFilters('all'); 
            subDimensionFiltersContainer.style.display = 'none'; 
            dciMinorFiltersContainer.style.display = 'none'; 
            activeElementFilters.clear(); 
            renderActiveElementFilters(); 
            activeBundleFilter = null; 
            renderBundleFilters(); 
            clearPeFilter(); 
            isolatedColumn = null; 
            peTableBody.querySelectorAll('.expanded, .is-visible').forEach(r => r.classList.remove('expanded', 'is-visible')); 
            matrixRowElements.clear(); 
            window.allNgss3dElements.forEach(d => (d.elements || d.core_ideas?.flatMap(c => c.components) || []).forEach(i => { const c = i.name.split(':')[0].trim(); if (c) matrixRowElements.add(c); })); 
            if (p.has('bundlePEs')) { const ids = p.get('bundlePEs').split(','); peBundle = new Set(ids.filter(id => peMap.has(id))); if (peBundle.size > 0) { updateBundleControls(); renderBundleView(); isNavigatingHistory = false; return; } } 
            const view = p.get('view') || 'pe'; 
            searchInput.value = p.get('q') || ''; 
            if (p.has('matrixRows')) matrixRowElements = new Set(p.get('matrixRows').split(',')); 
            if (p.has('grade')) { const g = p.get('grade'); gradeFilters.querySelector('.active')?.classList.remove('active'); gradeFilters.querySelector(`[data-filter="${g}"]`)?.classList.add('active'); renderTopicFilters(g); } 
            if (p.has('topic')) { const t = p.get('topic').split(','); document.querySelector('#topic-filters [data-filter="all"]')?.classList.remove('active'); t.forEach(topic => document.querySelector(`#topic-filters [data-filter="${topic}"]`)?.classList.add('active')); } 
            if (p.has('elements')) { activeElementFilters = new Set(p.get('elements').split(',')); renderActiveElementFilters(); } 
            if (p.has('bundleFilter')) { activeBundleFilter = p.get('bundleFilter'); renderBundleFilters(); } 
            activePeFilter = p.get('highlight') || null; 
            isolatedColumn = p.get('isolate') || null; 
            if (p.has('dim')) { const d = p.get('dim'); dimensionFilters.querySelector(`[data-filter="${d}"]`)?.classList.add('active'); renderSubFilters(d); } 
            if (p.has('subDim')) { const s = p.get('subDim').split(','); s.forEach(sub => subDimensionFilters.querySelector(`[data-filter="${sub}"]`)?.classList.add('active')); const d = p.get('dim'); if (d && d.startsWith('DCI') && s.length > 0) renderDciMinorFilters(s[0]); } 
            if (p.has('minorDim')) { const m = p.get('minorDim').split(','); m.forEach(minor => dciMinorFilters.querySelector(`[data-filter="${minor}"]`)?.classList.add('active')); } 
            switchView(view, null, false); 
            if (p.has('expanded')) { 
                const id = p.get('expanded'); 
                setTimeout(() => { 
                    const row = peTableBody.querySelector(`.pe-main-row[data-pe-id="${id}"]`); 
                    if (row) { 
                        const detailsRow = row.nextElementSibling;
                        const detailsCell = detailsRow.querySelector('td');
                        if (!detailsCell.hasChildNodes()) {
                            const pe = peMap.get(id);
                            if (pe) detailsCell.innerHTML = createPeDetailsHtml(pe);
                        }
                        row.classList.add('expanded'); 
                        row.nextElementSibling.classList.add('is-visible'); 
                        scrollToPeRow(row);
                    } 
                }, 100); 
            } 
            isNavigatingHistory = false; 
        };
        const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const normalizeText = t => t.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim(); const getGradeBandKey = l => { if (!l) return null; const lc = l.toLowerCase(); if (['kindergarten', 'first', 'second', 'k-2'].some(k => lc.includes(k))) return 'primary'; if (['third', 'fourth', 'fifth', '3-5'].some(k => lc.includes(k))) return 'elementary'; if (lc.includes('middle')) return 'middle'; if (lc.includes('high')) return 'high'; return null; }; const findBestMatchingSpecificElement = (text, grade) => { const clean = text.trim().replace(/^[\*•]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim(); if (clean.length < 15) return null; const cacheKey = `${grade}|${clean}`; if (fuzzyMatchCache.has(cacheKey)) return fuzzyMatchCache.get(cacheKey); const normText = normalizeText(clean); const words = normText.split(' ').filter(w => w.length > 1); if (words.length === 0) return null; const threshold = words.length < 10 ? 0.75 : 0.80; const gradeKey = getGradeBandKey(grade); let best = { code: null, score: 0, base: 0, len: Infinity }; for (const [offText, code] of textToSpecificCodeMap.entries()) { const normOffText = normalizeText(offText); const found = words.reduce((count, word) => { const rgx = new RegExp(`\\b${escapeRegExp(word)}\\b`); if (rgx.test(normOffText)) return count + 1; const singular = word.endsWith('s') ? word.slice(0, -1) : null; if (singular && singular.length > 2 && new RegExp(`\\b${escapeRegExp(singular)}\\b`).test(normOffText)) return count + 1; const plural = !word.endsWith('s') ? word + 's' : null; if (plural && new RegExp(`\\b${escapeRegExp(plural)}\\b`).test(normOffText)) return count + 1; return count; }, 0); const baseScore = found / words.length; let weightedScore = baseScore; const el = specificElementMap.get(code); if (gradeKey && el && el.gradeBandKey === gradeKey) weightedScore += 1.0; if (weightedScore > best.score || (weightedScore === best.score && offText.length < best.len)) { best = { code, score: weightedScore, base: baseScore, len: offText.length }; } } const result = best.base >= threshold ? best.code : null; fuzzyMatchCache.set(cacheKey, result); return result; };
        const processAllData = () => { window.allNgss3dElements.forEach(dim => (dim.elements || dim.core_ideas?.flatMap(c => c.components) || []).forEach(item => { const name = item.name.trim(); const parts = name.split(':'); const code = parts[0].trim(); if (!code) return; const nameOnly = parts.length > 1 ? parts.slice(1).join(':').trim() : name; if (!elementMap.has(code)) elementMap.set(code, { ...item, code, dimensionCode: dim.code, dimensionName: dim.dimension }); nameToCodeMap.set(name, code); nameToCodeMap.set(nameOnly, code); nameToCodeMap.set(code, code); Object.entries(item.progressions).forEach(([gradeKey, progs]) => (progs || []).forEach(prog => { if (!specificElementMap.has(prog.code)) specificElementMap.set(prog.code, { ...prog, parentCode: code, parentName: item.name, gradeBandKey: gradeKey, relatedPes: new Set() }); textToSpecificCodeMap.set(prog.text.trim(), prog.code); })); })); window.allNgssData.forEach(gradeData => gradeData.topics.forEach(topic => topic.performanceExpectations.forEach(pe => { const compCodes = new Set(); const specCodes = new Set(); ['sep', 'dci', 'ccc'].forEach(key => (pe.details[key] || []).forEach(ref => { let lineMatched = false; ref.text.split('\n').forEach(line => { if (!line.trim()) return; const specCode = findBestMatchingSpecificElement(line, gradeData.gradeLabel); if (specCode) { specCodes.add(specCode); const el = specificElementMap.get(specCode); if (el) { el.relatedPes.add(pe.id); if (el.parentCode) compCodes.add(el.parentCode); } lineMatched = true; } }); if (!lineMatched) { const cleanId = ref.id.replace(' (secondary)', '').trim(); let cCode = nameToCodeMap.get(cleanId) || nameToCodeMap.get(cleanId.split(':').pop().trim()); if (cCode) compCodes.add(cCode); } })); peMap.set(pe.id, { ...pe, gradeLabel: gradeData.gradeLabel, topicTitle: topic.topicTitle, connections: topic.connections, associatedComponentCodes: compCodes, associatedSpecificCodes: specCodes }); }))); };
        
        const fetchRawData = async () => {
            try {
                const [elementsRes, k5Res, msRes, hsRes] = await Promise.all([
                    fetch('https://philm013.github.io/JSON/ngss3DElements.json'),
                    fetch('https://philm013.github.io/JSON/ngssK5.json'),
                    fetch('https://philm013.github.io/JSON/ngss68.json'),
                    fetch('https://philm013.github.io/JSON/ngss912.json')
                ]);
                if (!elementsRes.ok || !k5Res.ok || !msRes.ok || !hsRes.ok) throw new Error("One or more data files could not be loaded.");
                window.allNgss3dElements = await elementsRes.json();
                const k5Data = await k5Res.json();
                const msData = await msRes.json();
                const hsData = await hsRes.json();
                window.allNgssData = [...k5Data, msData, ...hsData];
            } catch (error) {
                console.error("Error fetching NGSS JSON data:", error);
                alert("Failed to load NGSS data files. Please check the console.");
                throw error;
            }
        };

        const loadAndProcessData = async () => {
            const cache = await loadDataFromDB();
            if (cache && cache.version === CACHE_VERSION) {
                console.log("Restoring data from browser cache...");
                peMap = new Map(cache.peMap);
                peMap.forEach(pe => { pe.associatedComponentCodes = new Set(pe.associatedComponentCodes); pe.associatedSpecificCodes = new Set(pe.associatedSpecificCodes); });
                elementMap = new Map(cache.elementMap);
                specificElementMap = new Map(cache.specificElementMap);
                specificElementMap.forEach(el => el.relatedPes = new Set(el.relatedPes));
                nameToCodeMap = new Map(cache.nameToCodeMap);
                textToSpecificCodeMap = new Map(cache.textToSpecificCodeMap);
                gradeToTopicsMap = cache.gradeToTopicsMap;
                allTopics = cache.allTopics;
                sortedGradeLabels = cache.sortedGradeLabels;
                if (cache.allNgss3dElements && cache.allNgssData) {
                    window.allNgss3dElements = cache.allNgss3dElements;
                    window.allNgssData = cache.allNgssData;
                    return; 
                }
            }
            console.log("Cache miss or empty. Downloading data...");
            await fetchRawData();
            processAllData();
            let topics = new Set();
            window.allNgssData.forEach(d => {
                const t = d.topics.map(t => t.topicTitle);
                gradeToTopicsMap[d.gradeLabel] = [...new Set(t)];
                t.forEach(topic => topics.add(topic));
            });
            allTopics = [...topics].sort();
            const order = ['Kindergarten', 'First Grade', 'Second Grade', 'K-2 ETS', 'Third Grade', 'Fourth Grade', 'Fifth Grade', '3-5 ETS', 'Middle School', 'High School'];
            sortedGradeLabels = [...new Set([...peMap.values()].map(pe => pe.gradeLabel))].sort((a, b) => { const iA = order.indexOf(a), iB = order.indexOf(b); return (iA === -1 && iB === -1) ? a.localeCompare(b) : (iA === -1 ? 1 : (iB === -1 ? -1 : iA - iB)); });
            const dataToCache = {
                version: CACHE_VERSION,
                allNgss3dElements: window.allNgss3dElements,
                allNgssData: window.allNgssData,
                peMap: [...peMap].map(([id, pe]) => [id, { ...pe, associatedComponentCodes: [...pe.associatedComponentCodes], associatedSpecificCodes: [...pe.associatedSpecificCodes] }]),
                elementMap: [...elementMap],
                specificElementMap: [...specificElementMap].map(([id, el]) => [id, { ...el, relatedPes: [...el.relatedPes] }]),
                nameToCodeMap: [...nameToCodeMap],
                textToSpecificCodeMap: [...textToSpecificCodeMap],
                gradeToTopicsMap, allTopics, sortedGradeLabels
            };
            try { saveDataToDB(dataToCache); } catch (e) { console.error("Error caching data:", e); }
        };

        const buildMatrixDataMap = () => { elementToGradePeMap.clear(); for (const pe of peMap.values()) for (const code of pe.associatedComponentCodes) { if (!elementToGradePeMap.has(code)) elementToGradePeMap.set(code, new Map()); const gradeMap = elementToGradePeMap.get(code); if (!gradeMap.has(pe.gradeLabel)) gradeMap.set(pe.gradeLabel, new Set()); gradeMap.get(pe.gradeLabel).add(pe.id); } };
        
        const populatePeTable = () => { 
            let tableHtml = '', cardsHtml = '';
            [...peMap.values()].forEach(pe => {
                const isChecked = peBundle.has(pe.id);
                tableHtml += `
                    <tr class="pe-main-row" data-pe-id="${pe.id}" data-grade="${pe.gradeLabel}">
                        <td><input type="checkbox" class="pe-bundle-checkbox" data-pe-id="${pe.id}" ${isChecked ? 'checked' : ''}></td>
                        <td><span class="pe-id copyable" title="${pe.description.replace(/"/g, '&quot;')}">${pe.id}</span></td>
                        <td><span class="copyable" title="${pe.description.replace(/"/g, '&quot;')}">${pe.description}</span></td>
                        <td><span class="copyable">${pe.gradeLabel}</span></td>
                        <td><span class="copyable">${pe.topicTitle}</span></td>
                    </tr>
                    <tr class="pe-details-row" data-pe-id="${pe.id}"><td colspan="5"></td></tr>`;
                cardsHtml += `
                    <div class="pe-card ${isChecked ? 'is-selected' : ''}" data-pe-id="${pe.id}" data-grade="${pe.gradeLabel}">
                        <div class="pe-card-header">
                            <div class="pe-card-id">${pe.id}</div>
                            <input type="checkbox" class="pe-bundle-checkbox pe-card-checkbox" data-pe-id="${pe.id}" ${isChecked ? 'checked' : ''}>
                        </div>
                        <div class="pe-card-description copyable">${pe.description}</div>
                        <div class="pe-card-meta"><span>${pe.gradeLabel}</span> • <span>${pe.topicTitle}</span></div>
                    </div>`;
            });
            peTableBody.innerHTML = tableHtml;
            peCardsContainer.innerHTML = cardsHtml;
        };

        const processAndLinkPeText = (text, peId) => { const pe = peMap.get(peId); if (!pe) return text; return text.split('\n').map(line => { if (!line.trim()) return line; const code = findBestMatchingSpecificElement(line, pe.gradeLabel); if (code) { const el = specificElementMap.get(code); if (el) return `<span class="clickable-element-link" title="${el.text.replace(/"/g, '&quot;')}" data-pe-id="${peId}" data-component-code="${el.parentCode}" data-specific-code="${code}">${line}</span>`; } return line; }).join('<br>'); };
        const createPeDetailsHtml = (pe, inBundle = false) => { const linkPeCodes = (text, currentPe) => { if (!text) return 'N/A'; text = text.replace(/\(([A-Z0-9-]+)\)/g, (match, id) => { const p = peMap.get(id); if (p && id !== currentPe.id) return `<span class="pe-nav-link" data-pe-id="${id}" title="${`PE: ${id}\n${p.description}`.replace(/"/g, '&quot;')}">${match}</span>`; return match; }); return text.replace(/\b(?:[K\d]|MS|HS)(?:-\d)?\.([A-Z]{2,4}\d?(?:\.[A-Z])?)\b/g, (match, code) => { const el = elementMap.get(code); if (el) return `<span class="clickable-element-link" data-pe-id="${currentPe.id}" data-component-code="${code}" title="${`Dimension Element: ${el.name}`.replace(/"/g, '&quot;')}">${match}</span>`; return match; }); }; const createCol = (dim, title) => { const items = pe.details[dim] || []; if (!items.length) return ''; return `<div class="pe-details-column"><h4>${title}</h4><ul>${items.map(item => { const code = nameToCodeMap.get(item.id.replace(' (secondary)', '').trim()); const el = code ? elementMap.get(code) : null; return `<li><span class="clickable-element-link" ${code ? `data-component-code="${code}" data-pe-id="${pe.id}"` : ''} ${el ? `title="${el.name.replace(/"/g, '&quot;')}"` : ''}><strong class="copyable">${item.id}</strong></span><div class="copyable" style="padding-left:1rem;">${processAndLinkPeText(item.text, pe.id)}</div></li>`; }).join('')}</ul></div>`; }; const createConns = (conns, currentPe) => { if (!conns) return ''; const filterStr = text => { if (!text) return 'N/A'; const relevant = text.split(';').map(s => s.trim()).filter(Boolean).filter(e => e.includes(`(${currentPe.id})`)); return relevant.length ? linkPeCodes(relevant.join('; '), currentPe) : 'N/A'; }; const filterArr = items => items ? items.filter(i => i.text && i.text.includes(`(${currentPe.id})`)) : []; const ela = filterArr(conns.commonCoreStateStandards?.elaLiteracy).map(i => `<li class="copyable"><strong>${i.id}:</strong> ${linkPeCodes(i.text, currentPe)}</li>`).join(''); const math = filterArr(conns.commonCoreStateStandards?.mathematics).map(i => `<li class="copyable"><strong>${i.id}:</strong> ${linkPeCodes(i.text, currentPe)}</li>`).join(''); return `<div class="pe-details-connections"><h3>Connections</h3><div class="pe-connections-grid"><div class="pe-connections-section"><h4>Connections to other DCIs in this grade-level</h4><p class="copyable">${filterStr(conns.connectionsToOtherDcisInGradeLevel)}</p></div><div class="pe-connections-section"><h4>Articulation of DCIs across grade levels</h4><p class="copyable">${filterStr(conns.articulationOfDcisAcrossGradeLevels)}</p></div><div class="pe-connections-section"><h4>Connections to Common Core (ELA)</h4><ul>${ela || '<li>N/A</li>'}</ul></div><div class="pe-connections-section"><h4>Connections to Common Core (Math)</h4><ul>${math || '<li>N/A</li>'}</ul></div></div></div>`; }; const savedDesc = savedAnalyses[pe.id]?.description || pe.description; const clarification = pe.details.clarificationStatement ? `<div class="pe-details-info-box"><h4>Clarification Statement</h4><p class="copyable">${pe.details.clarificationStatement}</p></div>` : ''; const boundary = pe.details.assessmentBoundary ? `<div class="pe-details-info-box"><h4>Assessment Boundary</h4><p class="copyable">${pe.details.assessmentBoundary}</p></div>` : ''; const esBtn = (pe.details.evidenceStatements && pe.details.evidenceStatements.length) ? `<button class="filter-btn view-evidence-btn" data-pe-id="${pe.id}">View Evidence Statements</button>` : ''; const analyzeBtn = inBundle ? '' : `<div class="ai-controls"><button class="filter-btn active analyze-pe-desc-btn" data-pe-id="${pe.id}">Analyze with Full Context</button><button class="filter-btn reset-btn reset-analysis-btn">Reset</button></div>`; return `<div class="pe-details-wrapper"><div class="pe-description-header"><h3 class="copyable">${inBundle ? '' : pe.id + ':'}</h3>${analyzeBtn}</div><div class="pe-description-text ai-editable-content copyable" data-pe-id="${pe.id}" data-part="description">${savedDesc}</div><div style="margin-top:1.5rem;">${clarification}${boundary}</div><div class="pe-details-container" style="margin-top:1rem;">${createCol('sep', 'SEP')}${createCol('dci', 'DCI')}${createCol('ccc', 'CCC')}</div><div class="pe-details-actions">${esBtn}<button class="filter-btn active view-related-3d-btn" data-pe-id="${pe.id}">Show All Related in 3D View</button></div>${createConns(pe.connections, pe)}</div>`; };
        const populate3dTable = () => { threedTableBody.innerHTML = window.allNgss3dElements.map(dim => { let html = `<tr class="dimension-header header-row" data-dimension-code="${dim.code}"><td colspan="5">${dim.dimension}</td></tr>`; const items = dim.elements || dim.core_ideas?.flatMap(c => c.components) || []; const progHtml = p => ['primary', 'elementary', 'middle', 'high'].map(k => `<td>${(p[k] || []).map(i => `<div class="item" data-code="${i.code}" title="${i.text.replace(/"/g, '&quot;')}\n\n(Click to see related PEs)"><strong>${i.code}</strong> ${i.text}</div>`).join('')}</td>`).join(''); if (dim.elements) html += dim.elements.map(el => `<tr class="data-row" data-dimension-code="${dim.code}" data-component-code="${el.name.split(':')[0].trim()}"><td class="element-header">${el.name}</td>${progHtml(el.progressions)}</tr>`).join(''); else if (dim.core_ideas) html += dim.core_ideas.map(core => `<tr class="dci-major-header header-row" data-dimension-code="${dim.code}" data-component-code="${core.name.split(':')[0].trim()}"><td colspan="5">${core.name}</td></tr>` + core.components.map(comp => `<tr class="data-row" data-dimension-code="${dim.code}" data-component-code="${comp.name.split(':')[0].trim()}"><td class="dci-minor-header">${comp.name}</td>${progHtml(comp.progressions)}</tr>`).join('')).join(''); return html; }).join(''); };
        const renderTopicFilters = grade => { const cont = document.getElementById('topic-filters-container'), group = document.getElementById('topic-filters'); const topics = grade === 'all' ? allTopics : gradeToTopicsMap[grade]; if (!topics || !topics.length) { cont.style.display = 'none'; group.innerHTML = ''; return; } const active = new Set([...document.querySelectorAll('#topic-filters .filter-btn.active')].map(b => b.dataset.filter)); let hasActive = active.size > 0 && !active.has('all'); let html = `<button class="filter-btn ${!hasActive ? 'active' : ''}" data-filter="all">All Topics</button>`; html += topics.map(t => `<button class="filter-btn ${active.has(t) ? 'active' : ''}" data-filter="${t}">${t}</button>`).join(''); group.innerHTML = html; cont.style.display = 'block'; };
        const updateNavControls = () => navigationControls.style.display = navigationHistory.length > 0 ? 'flex' : 'none';
        const pushNavState = (isLinkNav = false) => { const cont = document.querySelector('.explorer-view.is-visible .table-container'); const state = { view: currentView, scrollTop: cont ? cont.scrollTop : 0, searchTerm: searchInput.value, activePeFilter, isLinkNavigation: isLinkNav }; if (currentView === 'pe') { state.activeGrade = gradeFilters.querySelector('.active')?.dataset.filter; state.expandedPe = peTableBody.querySelector('.pe-main-row.expanded')?.dataset.peId; state.activeElementFilters = new Set(activeElementFilters); state.activeBundleFilter = activeBundleFilter; } else if (['3d', 'matrix'].includes(currentView)) { state.activeDimension = dimensionFilters.querySelector('.active')?.dataset.filter; state.activeSubFilters = [...subDimensionFilters.querySelectorAll('.active')].map(b => b.dataset.filter); state.activeDciMinorFilters = [...dciMinorFilters.querySelectorAll('.active')].map(b => b.dataset.filter); if (currentView === '3d') state.isolatedColumn = isolatedColumn; } if (currentView === 'matrix') state.matrixRowElements = new Set(matrixRowElements); navigationHistory.push(state); updateNavControls(); };
        const goBack = () => { if (!navigationHistory.length) return; const s = navigationHistory.pop(); activePeFilter = s.activePeFilter; searchInput.value = s.searchTerm; if (s.view === 'pe') { document.querySelectorAll('#grade-filters .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === s.activeGrade)); renderTopicFilters(s.activeGrade); activeElementFilters = s.activeElementFilters || new Set(); renderActiveElementFilters(); activeBundleFilter = s.activeBundleFilter; renderBundleFilters(); } else if (['3d', 'matrix'].includes(s.view)) { document.querySelectorAll('#dimension-filters .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === s.activeDimension)); renderSubFilters(s.activeDimension); if (s.activeSubFilters) document.querySelectorAll('#sub-dimension-filters .filter-btn').forEach(b => b.classList.toggle('active', s.activeSubFilters.includes(b.dataset.filter))); if (s.activeDimension && s.activeDimension.startsWith('DCI') && s.activeSubFilters.length > 0) { renderDciMinorFilters(s.activeSubFilters[0]); if (s.activeDciMinorFilters) document.querySelectorAll('#dci-minor-filters .filter-btn').forEach(b => b.classList.toggle('active', s.activeDciMinorFilters.includes(b.dataset.filter))); } if (s.view === '3d') s.isolatedColumn = isolatedColumn; } if (s.view === 'matrix') matrixRowElements = s.matrixRowElements || new Set(); switchView(s.view, null, false); setTimeout(() => { const cont = document.querySelector('.explorer-view.is-visible .table-container'); if (cont) cont.scrollTop = s.scrollTop; if (s.view === 'pe' && s.expandedPe) { const row = peTableBody.querySelector(`.pe-main-row[data-pe-id="${s.expandedPe}"]`); if (row) { const detailsRow = row.nextElementSibling; const detailsCell = detailsRow.querySelector('td'); if (!detailsCell.hasChildNodes()) { const pe = peMap.get(s.expandedPe); if (pe) detailsCell.innerHTML = createPeDetailsHtml(pe); } row.classList.add('expanded'); row.nextElementSibling.classList.add('is-visible'); } } }, 50); updateNavControls(); updateUrlFromState(); };
        const navigateToPe = id => { pushNavState(true); switchView('pe'); searchInput.value = ''; gradeFilters.querySelector('.active')?.classList.remove('active'); gradeFilters.querySelector('[data-filter="all"]').classList.add('active'); renderTopicFilters('all'); activeElementFilters.clear(); renderActiveElementFilters(); activeBundleFilter = null; renderBundleFilters(); applyFilters(); setTimeout(() => { const row = peTableBody.querySelector(`.pe-main-row[data-pe-id="${id}"]`); if (row) { peTableBody.querySelectorAll('.expanded, .is-visible').forEach(r => r.classList.remove('expanded', 'is-visible')); const detailsRow = row.nextElementSibling; const detailsCell = detailsRow.querySelector('td'); if (!detailsCell.hasChildNodes()) { const pe = peMap.get(id); if (pe) detailsCell.innerHTML = createPeDetailsHtml(pe); } row.classList.add('expanded'); row.nextElementSibling.classList.add('is-visible'); scrollToPeRow(row); row.classList.add('scroll-target'); setTimeout(() => row.classList.remove('scroll-target'), 1500); } updateUrlFromState(); }, 100); };
        
        const switchView = (name, target = null, push = false) => { if (push && (currentView !== name || !navigationHistory[navigationHistory.length - 1]?.isLinkNavigation)) pushNavState(target !== null); currentView = name; document.querySelectorAll('.nav-btn, .bottom-nav-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll(`#nav-${name}-explorer, #bottom-nav-${name}`).forEach(b => b.classList.add('active')); document.querySelectorAll('.explorer-view').forEach(v => v.style.display = 'none'); if (document.getElementById(`${name}-explorer`)) document.getElementById(`${name}-explorer`).style.display = 'flex'; else if (name === '3d') threedExplorerView.style.display = 'flex'; if (name !== 'bundle') bundleView.style.display = 'none'; peFiltersAll.style.display = name === 'pe' ? 'block' : 'none'; threedFiltersAll.style.display = ['3d', 'matrix'].includes(name) ? 'block' : 'none'; if (name === 'matrix') renderMatrix(); else if (name === 'pe') syncCheckboxesWithBundle(); if (activePeFilter) { const pe = peMap.get(activePeFilter); activePeFilterTag.querySelector('span').textContent = `Highlighting for PE: ${pe ? pe.id : '...'}`; activePeFilterTag.style.display = 'flex'; activePeFilterTag.dataset.peId = activePeFilter; activePeFilterTag.style.cursor = 'pointer'; activePeFilterTag.title = `Click to go to ${activePeFilter} in PE Explorer`; } else { activePeFilterTag.style.display = 'none'; activePeFilterTag.removeAttribute('data-pe-id'); activePeFilterTag.style.cursor = 'default'; activePeFilterTag.removeAttribute('title'); } if (!target && !push && !isNavigatingHistory) { searchInput.value = ''; if (name === 'pe') { gradeFilters.querySelector('.active')?.classList.remove('active'); gradeFilters.querySelector('[data-filter="all"]')?.classList.add('active'); } else if (['3d', 'matrix'].includes(name)) dimensionFilters.querySelector('.active')?.classList.remove('active'); } if (name === '3d' && push) { dimensionFilters.querySelector('.active')?.classList.remove('active'); subDimensionFilters.innerHTML = ''; subDimensionFiltersContainer.style.display = 'none'; dciMinorFilters.innerHTML = ''; dciMinorFiltersContainer.style.display = 'none'; isolatedColumn = null; searchInput.value = ''; } applyFilters(); updateUrlFromState(); if (name === '3d' && target) { let el; if (target.specific) el = threedTableBody.querySelector(`.item[data-code="${target.specific}"]`); else if (target.component) el = threedTableBody.querySelector(`tr[data-component-code="${target.component}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (target.specific) { el.classList.add('scroll-target'); setTimeout(() => el.classList.remove('scroll-target'), 1500); } } } };
        const resetApp = () => { isNavigatingHistory = true; searchInput.value = ''; navigationHistory = []; activePeFilter = null; isolatedColumn = null; activeElementFilters.clear(); activeBundleFilter = null; peTableBody.querySelectorAll('.expanded, .is-visible').forEach(r => r.classList.remove('expanded', 'is-visible')); matrixRowElements.clear(); window.allNgss3dElements.forEach(d => (d.elements || d.core_ideas?.flatMap(c => c.components) || []).forEach(i => { const c = i.name.split(':')[0].trim(); if (c) matrixRowElements.add(c); })); gradeFilters.querySelector('.active')?.classList.remove('active'); gradeFilters.querySelector('[data-filter="all"]')?.classList.add('active'); renderTopicFilters('all'); renderActiveElementFilters(); renderBundleFilters(); dimensionFilters.querySelector('.active')?.classList.remove('active'); subDimensionFiltersContainer.style.display = 'none'; dciMinorFiltersContainer.style.display = 'none'; subDimensionFilters.innerHTML = ''; dciMinorFilters.innerHTML = ''; updateNavControls(); clearPeFilter(); switchView('pe', null, false); const cont = peExplorerView.querySelector('.table-container'); if (cont) cont.scrollTop = 0; history.replaceState(null, '', window.location.pathname); isNavigatingHistory = false; };
        const applySearchHighlight = (body, term) => { body.querySelectorAll('span.search-highlight').forEach(el => { el.parentNode.replaceChild(document.createTextNode(el.textContent), el); el.parentNode.normalize(); }); if (!term) return; const rgx = new RegExp(escapeRegExp(term), 'gi'); const sel = currentView === 'pe' ? 'tr:not([style*="display: none"]) td' : currentView === '3d' ? '.data-row:not([style*="display: none"]) td' : '#matrix-table tr:not([style*="display: none"]) td'; body.querySelectorAll(sel).forEach(cell => { const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, null, false); let n; const nodes = []; while (n = w.nextNode()) if (n.textContent.match(rgx)) nodes.push(n); nodes.forEach(node => { const span = document.createElement('span'); span.innerHTML = node.textContent.replace(rgx, `<span class="search-highlight">$&</span>`); node.parentNode.replaceChild(span, node); }); }); };
        const applyFilters = () => { if (currentView === 'pe') filterPeTable(); else if (currentView === '3d') update3dView(); else if (currentView === 'matrix') filterMatrixTable(); const body = document.querySelector('.explorer-view.is-visible table tbody'); if (body) applySearchHighlight(body, searchInput.value.trim()); };
        const filterPeTable = () => {
            const term = searchInput.value.trim().toLowerCase();
            const grade = gradeFilters.querySelector('.active')?.dataset.filter || 'all';
            const topics = new Set([...document.querySelectorAll('#topic-filters .filter-btn.active')].map(b => b.dataset.filter));
            const showAllTopics = topics.has('all') || topics.size === 0;
            const bundleIds = activeBundleFilter ? new Set(savedBundles[activeBundleFilter]) : null;
            let count = 0;
            [...peMap.keys()].forEach(peId => {
                const pe = peMap.get(peId);
                const row = peTableBody.querySelector(`.pe-main-row[data-pe-id="${peId}"]`);
                const card = peCardsContainer.querySelector(`.pe-card[data-pe-id="${peId}"]`);
                if (!row || !card) return;
                const hasElems = activeElementFilters.size === 0 || [...activeElementFilters].every(code => pe.associatedComponentCodes.has(code));
                const inBundle = !bundleIds || bundleIds.has(pe.id);
                const textContent = (row.textContent + card.textContent).toLowerCase();
                const isVis = (!term || textContent.includes(term)) && (grade === 'all' || row.dataset.grade === grade) && (showAllTopics || topics.has(pe.topicTitle)) && hasElems && inBundle;
                row.style.display = isVis ? '' : 'none';
                card.style.display = isVis ? '' : 'none';
                const details = row.nextElementSibling;
                if (!isVis && details?.classList.contains('is-visible')) { details.classList.remove('is-visible'); row.classList.remove('expanded'); }
                if (isVis) count++;
            });
            updateSelectAllCheckboxState();
            resultsCountSpan.textContent = `${count} PEs found.`;
        };
        const clearPeFilter = () => { activePeFilter = null; activePeFilterTag.style.display = 'none'; applyFilters(); updateUrlFromState(); };
        const applyColumnIsolation = () => { const table = document.getElementById('threed-explorer-table'); table.className = ''; document.querySelectorAll('.col-toggle-btn.active').forEach(b => b.classList.remove('active')); if (isolatedColumn) { table.classList.add('col-isolated', `isolate-col-${isolatedColumn}`); table.querySelector(`.col-toggle-btn[data-col="${isolatedColumn}"]`)?.classList.add('active'); } };
        const update3dView = () => { applyColumnIsolation(); const term = searchInput.value.trim().toLowerCase(); const dim = dimensionFilters.querySelector('.active')?.dataset.filter; let compCodes, specCodes; threedTableBody.querySelectorAll('.pe-highlight-row, .pe-highlight-specific').forEach(el => el.classList.remove('pe-highlight-row', 'pe-highlight-specific')); if (activePeFilter) { const pe = peMap.get(activePeFilter); if (pe) { compCodes = pe.associatedComponentCodes; specCodes = pe.associatedSpecificCodes; } } let count = 0; threedTableBody.querySelectorAll('.data-row').forEach(row => { let isVis = true; const code = row.dataset.componentCode; if (dim) { if (row.dataset.dimensionCode !== dim) isVis = false; else if (dim.startsWith('DCI')) { const major = document.querySelector('#sub-dimension-filters .active')?.dataset.filter; const minors = new Set([...dciMinorFilters.querySelectorAll('.active')].map(b => b.dataset.filter)); if (minors.size > 0) { if (![...minors].some(m => code.startsWith(m))) isVis = false; } else if (major && !code.startsWith(major)) isVis = false; } else { const subs = new Set([...subDimensionFilters.querySelectorAll('.active')].map(b => b.dataset.filter)); if (subs.size > 0 && !subs.has(code)) isVis = false; } } if (isVis && term && !row.textContent.toLowerCase().includes(term)) isVis = false; if (compCodes) { if (compCodes.has(row.dataset.componentCode)) { row.classList.add('pe-highlight-row'); row.querySelectorAll('.item').forEach(item => { if (specCodes && specCodes.has(item.dataset.code)) item.classList.add('pe-highlight-specific'); }); } else if (!term && !dim) isVis = false; } row.style.display = isVis ? '' : 'none'; if (isVis) count++; }); threedTableBody.querySelectorAll('.header-row').forEach(h => { let next = h.nextElementSibling, hasVis = false; while (next && !next.classList.contains('header-row')) { if (next.style.display !== 'none') { hasVis = true; break; } next = next.nextElementSibling; } h.style.display = hasVis ? '' : 'none'; }); resultsCountSpan.textContent = `${count} elements found.`; };
        const renderDciMinorFilters = major => { const dimCode = dimensionFilters.querySelector('.active')?.dataset.filter; const dciData = window.allNgss3dElements.find(d => d.code === dimCode); if (!dciData) { dciMinorFiltersContainer.style.display = 'none'; return; } const core = dciData.core_ideas.find(c => c.name.startsWith(major)); if (!core) { dciMinorFiltersContainer.style.display = 'none'; return; } dciMinorFilters.innerHTML = core.components.map(c => `<button class="filter-btn" data-filter="${c.name.split(':')[0].trim()}">${c.name}</button>`).join(''); dciMinorFiltersContainer.style.display = core.components.length ? 'block' : 'none'; };
        const renderSubFilters = dimCode => { const dimData = window.allNgss3dElements.find(d => d.code === dimCode); const label = subDimensionFiltersContainer.querySelector('.filter-group-label'); dciMinorFiltersContainer.style.display = 'none'; if (!dimData) { subDimensionFiltersContainer.style.display = 'none'; return; } let hasItems = false; if (dimData.code.startsWith('DCI')) { label.textContent = 'Filter by Core Idea:'; subDimensionFilters.innerHTML = dimData.core_ideas.map(c => `<button class="filter-btn" data-filter="${c.name.split(':')[0].trim()}">${c.name}</button>`).join(''); hasItems = dimData.core_ideas.length > 0; } else { label.textContent = 'Filter by Element:'; const items = dimData.elements || []; subDimensionFilters.innerHTML = items.map(i => `<button class="filter-btn" data-filter="${i.name.split(':')[0].trim()}">${i.name.split(':').slice(-1)[0].trim()}</button>`).join(''); hasItems = items.length > 0; } subDimensionFiltersContainer.style.display = hasItems ? 'block' : 'none'; clearSubFiltersBtn.style.display = hasItems ? 'block' : 'none'; };

        const updateBundleControls = () => {
            const count = peBundle.size;
            bundleCountSpan.textContent = `${count} PE${count !== 1 ? 's' : ''} selected`;
            bundleControls.style.display = count > 0 ? 'flex' : 'none';
            fabBundleCount.textContent = count;
            fabBundleViewBtn.style.display = count > 0 ? 'flex' : 'none';
            localStorage.setItem('ngssPeBundle', JSON.stringify([...peBundle]));
        };
        const updateSelectAllCheckboxState = () => {
            const isMobile = window.innerWidth < 992;
            const visibleCheckboxes = isMobile
                ? [...peCardsContainer.querySelectorAll('.pe-card:not([style*="display: none"]) .pe-bundle-checkbox')]
                : [...peTableBody.querySelectorAll('.pe-main-row:not([style*="display: none"]) .pe-bundle-checkbox')];
            if (!visibleCheckboxes.length) { selectAllCheckbox.checked = false; selectAllCheckbox.indeterminate = false; return; }
            const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;
            selectAllCheckbox.checked = checkedCount === visibleCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < visibleCheckboxes.length;
        };
        const syncCheckboxesWithBundle = () => {
            document.querySelectorAll('.pe-bundle-checkbox').forEach(cb => { cb.checked = peBundle.has(cb.dataset.peId); });
            peCardsContainer.querySelectorAll('.pe-card').forEach(card => card.classList.toggle('is-selected', peBundle.has(card.dataset.peId)));
            updateSelectAllCheckboxState();
        };
        const renderBundleSummary = () => { const counts = {}; peBundle.forEach(id => { const pe = peMap.get(id); if (!pe) return; pe.associatedComponentCodes.forEach(code => { const el = elementMap.get(code); if (!el) return; const dim = el.dimensionCode; if (!counts[dim]) counts[dim] = new Map(); if (!counts[dim].has(code)) counts[dim].set(code, { name: el.name, count: 0 }); counts[dim].get(code).count++; }); }); const order = window.allNgss3dElements.map(d => d.code); const dims = Object.keys(counts).filter(d => counts[d].size > 0).sort((a, b) => order.indexOf(a) - order.indexOf(b)); const listHtml = map => `<ul>${[...map.entries()].sort((a, b) => b[1].count - a[1].count).map(([_, { name, count }]) => `<li class="copyable"><strong>(${count})</strong> ${name}</li>`).join('')}</ul>`; const colHtml = code => { const data = window.allNgss3dElements.find(d => d.code === code); return `<div class="bundle-summary-col"><h4>${data ? data.dimension : code}</h4>${listHtml(counts[code])}</div>`; }; const dciHtml = codes => { if (!codes.length) return ''; return `<div class="bundle-summary-col dci-group"><h4>Disciplinary Core Ideas</h4>${codes.map(code => { const data = window.allNgss3dElements.find(d => d.code === code); return `<div class="dci-sub-group"><h5 class="dci-sub-header">${data ? data.dimension.replace('Disciplinary Core Ideas - ', '') : code}</h5>${listHtml(counts[code])}</div>`; }).join('')}</div>`; }; const mainCodes = ['SEP', 'CCC']; const dciCodes = dims.filter(d => d.startsWith('DCI')); const connCodes = dims.filter(d => ['CNS', 'C-ETAS'].includes(d)); let mainGrid = dims.filter(d => mainCodes.includes(d)).map(colHtml).join(''); mainGrid += dciHtml(dciCodes); const connGrid = connCodes.map(colHtml).join(''); return `<div class="bundle-summary"><h3>Bundle 3D Element Summary</h3><div class="bundle-summary-grid">${mainGrid}</div>${connGrid ? `<div class="bundle-summary-connections-grid">${connGrid}</div>` : ''}</div>`; };
        const renderBundleView = () => { if (!peBundle.size) return; currentView = 'bundle'; peExplorerView.style.display = 'none'; threedExplorerView.style.display = 'none'; matrixView.style.display = 'none'; bundleView.style.display = 'flex'; let html = `<div class="bundle-header"><h2>Selected PEs (${peBundle.size})</h2><div class="bundle-header-actions"><button id="copy-bundle-btn" class="filter-btn">Copy</button><button id="print-bundle-btn" class="filter-btn">Print</button><button id="back-to-pe-list-btn" class="filter-btn">&larr; Back</button></div></div>`; html += renderBundleSummary(); peBundle.forEach(id => { const pe = peMap.get(id); if (pe) html += `<div class="pe-bundle-item"><h3>${pe.id}: ${pe.description}</h3><div>${createPeDetailsHtml(pe, true)}</div></div>`; }); bundleView.innerHTML = html; document.getElementById('back-to-pe-list-btn').addEventListener('click', () => { bundleView.style.display = 'none'; switchView('pe'); }); document.getElementById('print-bundle-btn').addEventListener('click', () => window.print()); document.getElementById('copy-bundle-btn').addEventListener('click', copyBundleToClipboard); updateUrlFromState(); };
        const copyBundleToClipboard = () => { let text = `NGSS PE Bundle (${peBundle.size} PEs)\n==============================\n\n`; const summary = document.querySelector('.bundle-summary'); if (summary) text += summary.innerText + '\n\n------------------------------\n\n'; peBundle.forEach(id => { const pe = peMap.get(id); if (pe) { text += `${pe.id}: ${pe.description}\n`; ['sep', 'dci', 'ccc'].forEach(dim => { if (pe.details[dim]?.length) { text += `  ${dim.toUpperCase()}:\n`; pe.details[dim].forEach(item => { text += `    - ${item.id}: ${item.text.trim().replace(/\n/g, ' ')}\n`; }); } }); text += '\n'; } }); navigator.clipboard.writeText(text).then(() => alert('Bundle details copied!')); };
        const renderActiveElementFilters = () => { activeElementFiltersDiv.innerHTML = [...activeElementFilters].map(code => { const el = elementMap.get(code); const name = el ? el.name.split(':')[1]?.trim() || el.name : code; return `<span class="element-filter-tag">${name} <button data-code="${code}" title="Remove filter">&times;</button></span>`; }).join(''); };
        const saveBundlesToStorage = () => localStorage.setItem('ngssSavedBundles', JSON.stringify(savedBundles));
        const loadBundlesFromStorage = () => { const bundlesFromStorage = JSON.parse(localStorage.getItem('ngssSavedBundles') || '{}'); for (const key in bundlesFromStorage) if (!Array.isArray(bundlesFromStorage[key])) { console.warn(`Saved bundle "${key}" was not an array and has been ignored. Please re-save it.`, bundlesFromStorage[key]); delete bundlesFromStorage[key]; } savedBundles = bundlesFromStorage; };
        const renderBundleManager = () => { document.getElementById('bundle-manager-list').innerHTML = Object.keys(savedBundles).sort().map(name => `<li><div><span class="bundle-name">${name}</span> (${savedBundles[name].length} PEs)</div><div class="actions"><button class="filter-btn load-bundle-btn" data-name="${name}">Load</button><button class="filter-btn delete-bundle-btn" data-name="${name}">Delete</button></div></li>`).join('') || '<li>No saved bundles.</li>'; };
        const renderBundleFilters = () => { let html = `<button class="filter-btn ${!activeBundleFilter ? 'active' : ''}" data-name="all">All PEs</button>`; html += Object.keys(savedBundles).sort().map(name => `<button class="filter-btn ${activeBundleFilter === name ? 'active' : ''}" data-name="${name}">${name}</button>`).join(''); bundleFilters.innerHTML = html; };
        
        const saveAnalysis = (peId, part, data) => { if (!savedAnalyses[peId]) savedAnalyses[peId] = {}; savedAnalyses[peId][part] = data; saveAnalysisToDB(peId, part, data); };
        const resetAnalysis = (peId, part, element) => { if (savedAnalyses[peId]?.[part]) { delete savedAnalyses[peId][part]; if (Object.keys(savedAnalyses[peId]).length === 0) delete savedAnalyses[peId]; deleteAnalysisFromDB(peId, part); } const pe = peMap.get(peId); if (part === 'description') element.innerHTML = pe.description; else if (part === 'evidenceStatements') element.innerHTML = formatEvidenceStatements(pe.details.evidenceStatements); };
        const formatEvidenceStatements = stmts => { if (!stmts || !stmts.length) return '<div>No evidence statements available.</div>'; const patterns = [{ r: /^([ivx]+)\.\s*(.*)$/i, t: 'nested', c: 'es-nested-item' }, { r: /^(\d+)\.\s*(.*)$/, t: 'deeply-nested', c: 'es-deeply-nested-item' }, { r: /^([a-z])\s+(.*)$/i, t: 'item', c: 'es-item' }, { r: /^(\d+)\s+(.*)$/, t: 'heading', c: 'es-heading-entry' }]; return stmts.map(s => { const t = s.trim(); if (!t) return ''; for (const { r, t: type, c } of patterns) { const m = t.match(r); if (m) { let marker = m[1]; if (type === 'nested' || type === 'deeply-nested') marker += '.'; if (type === 'heading') return `<div class="${c} es-entry copyable"><span class="es-marker">${marker}</span><h4 class="es-heading-text es-text">${m[2]}</h4></div>`; return `<div class="${c} es-entry copyable"><span class="es-marker">${marker}</span><p class="es-text">${m[2]}</p></div>`; } } return `<div class="es-entry es-item copyable" style="padding-left:3rem;"><p class="es-text">${t}</p></div>`; }).join(''); };
        const showEvidenceStatements = id => { const pe = peMap.get(id); if (!pe || !pe.details.evidenceStatements) return; evidenceStatementsModalTitle.textContent = `Evidence Statements for ${pe.id}`; const saved = savedAnalyses[id]?.evidenceStatements; evidenceStatementsModalBody.innerHTML = saved || formatEvidenceStatements(pe.details.evidenceStatements); evidenceStatementsModal.dataset.peId = id; evidenceStatementsModalBody.dataset.peId = id; evidenceStatementsModal.classList.add('is-visible'); };
        const initializeGenAI = () => { const apiKey = localStorage.getItem('geminiApiKey'); if (apiKey) { try { genAI = new GoogleGenerativeAI(apiKey); apiKeyInput.value = apiKey; } catch (e) { console.error("Error initializing GoogleGenerativeAI:", e); alert("There was an error initializing the AI. Please check your API key."); genAI = null; } } else { genAI = null; } };
        const animationManager = new Map(); const startAnalysisAnimation = el => { if (animationManager.has(el)) return; const colors = ['#0072bc', '#f26522', '#0b9444']; const origHtml = el.innerHTML; const wrap = n => { if (n.nodeType === 3) { const f = document.createDocumentFragment(); for (let char of n.textContent) { if (char.trim()) { const s = document.createElement('span'); s.className = 'analyzing-char'; s.textContent = char; f.appendChild(s); } else f.appendChild(document.createTextNode(char)); } n.parentNode.replaceChild(f, n); } else if (n.nodeType === 1) [...n.childNodes].forEach(wrap); }; wrap(el); const chars = el.querySelectorAll('.analyzing-char'); if (!chars.length) return; const id = setInterval(() => chars.forEach(c => { c.style.color = colors[Math.floor(Math.random() * 3)]; c.style.transition = 'color 0.15s ease-in-out'; }), 150); animationManager.set(el, { intervalId: id, originalHtml: origHtml }); };
        const stopAnalysisAnimation = el => { const data = animationManager.get(el); if (data) { clearInterval(data.intervalId); animationManager.delete(el); return data.originalHtml; } return null; };
        const getFullPeContextAsText = (p) => { let context = `## Performance Expectation: ${p.id}\n${p.description}\n\n`; if (p.details.clarificationStatement) context += `### Clarification Statement\n${p.details.clarificationStatement}\n\n`; if (p.details.assessmentBoundary) context += `### Assessment Boundary\n${p.details.assessmentBoundary}\n\n`; ['sep', 'dci', 'ccc'].forEach(key => { if (p.details[key] && p.details[key].length > 0) { context += `### ${key.toUpperCase()}s\n`; p.details[key].forEach(item => context += `- **${item.id}:** ${item.text.replace(/\n/g, ' ')}\n`); context += '\n'; } }); if (p.details.evidenceStatements && p.details.evidenceStatements.length > 0) context += `### Evidence Statements (Raw)\n${p.details.evidenceStatements.join('\n')}\n`; return context; };
        const runAiAnalysis = async (peId, partToAnalyze, targetElement) => { if (!genAI) { alert("Gemini API Key is not set. Please add it in Settings."); settingsModal.classList.add('is-visible'); return false; } startAnalysisAnimation(targetElement); const pe = peMap.get(peId); if (!pe) { const originalHtml = stopAnalysisAnimation(targetElement); targetElement.innerHTML = originalHtml; targetElement.innerHTML += `<p style="color:red;">Error: PE data not found.</p>`; return false; } const fullContext = getFullPeContextAsText(pe); let contentToModify; if (partToAnalyze === 'description') contentToModify = pe.description; else if (partToAnalyze === 'evidenceStatements') contentToModify = formatEvidenceStatements(pe.details.evidenceStatements); else return false; const finalPrompt = `## Persona\nYou are an expert instructional designer specializing in the deconstruction of Next Generation Science Standards (NGSS). You have a deep understanding of the three dimensions: Science and Engineering Practices (SEPs), Disciplinary Core Ideas (DCIs), and Crosscutting Concepts (CCCs).\n## Context\nYou will be provided with the full details of a Performance Expectation (PE) to inform your analysis. You will also be given a specific HTML snippet to modify. Your analysis should be based on these official definitions:\n- **SEP (Science and Engineering Practices):** The actions students perform. These are verbs like "developing a model," "analyzing data," or "constructing an explanation." Tag these with \`<span class="sep">\`.\n- **DCI (Disciplinary Core Ideas):** The core scientific knowledge or content. These are the key concepts and nouns like "atomic structure," "natural selection," or "energy transfer." Tag these with \`<span class="dci">\`.\n- **CCC (Crosscutting Concepts):** The thematic lenses that connect different scientific domains. These are overarching themes like "Patterns," "Cause and Effect," or "Structure and Function." Tag these with \`<span class="ccc">\`.\n**Full PE Context for Analysis:**\n${fullContext}\n## Task\nYour task is to meticulously analyze the following "CONTENT TO MODIFY." Identify all phrases corresponding to the three dimensions (SEP, DCI, CCC) and wrap them in the appropriate \`<span>\` tag. You will then return the entire HTML block with your modifications embedded.\n## Format\nYour output must be **only** the modified HTML snippet.\n## Constraints\n- **DO NOT** include any explanations, introductions, or markdown code fences (like \`\`\`html\`) in your response.\n- **DO NOT** wrap block-level elements (like \`<div>\`, \`<p>\`, \`<h4>\`) inside your \`<span>\` tags. The spans must only go inside these elements.\n- **BE PRECISE:** Wrap only the specific phrase that corresponds to a dimension. A single sentence can and often will contain multiple dimensions.\n- **MAINTAIN ALL ORIGINAL HTML STRUCTURE:** Your output must be valid HTML that preserves all original tags and classes from the input.\n---\n**CONTENT TO MODIFY:**\n${contentToModify}`; try { const model = genAI.getGenerativeModel({ model: selectedAiModel }); const result = await model.generateContent(finalPrompt); const response = await result.response; const htmlOutput = response.text(); stopAnalysisAnimation(targetElement); targetElement.innerHTML = htmlOutput; saveAnalysis(peId, partToAnalyze, targetElement.innerHTML); return true; } catch (error) { const originalHtml = stopAnalysisAnimation(targetElement); if (originalHtml) targetElement.innerHTML = originalHtml; console.error('Gemini API error:', error); targetElement.innerHTML += `<p style="color:red; margin-top: 1rem;"><b>API Error:</b> ${error.message}. Check your API key and browser console for details.</p>`; return false; } };
        const generateFacetsForElement = async (pe, elementCode, analyzedEsHtml) => { const element = elementMap.get(elementCode); if (!element) throw new Error(`Element data for ${elementCode} not found.`); const fullContext = getFullPeContextAsText(pe); const finalPrompt = `## Persona\nYou are an expert in curriculum design and cognitive task analysis, specializing in the NGSS. Your task is to deconstruct a Performance Expectation (PE) into its fundamental, discrete, and observable student skills and knowledge components, which we call 'facets'.\n## Facet Definition\nA facet should reflect a specific, granular expectation of what a student should be able to know or do. It must be a discrete skill or piece of knowledge derived *only from the evidence statements provided*. When aggregated, the facets for a given standard should fully represent that standard.\n## Target Element for this Task\nYou must generate facets **ONLY** for the following 3D Element:\n- **Code:** ${elementCode}\n- **Dimension:** ${element.dimensionName}\n- **Element Text:** ${element.name}\n## Context\nBelow is the full context for a single NGSS Performance Expectation (PE) and its Evidence Statements. The Evidence Statements are the primary source from which you will derive the facets.\n**Full PE Context:**\n${fullContext}\n**Analyzed Evidence Statements (Primary Source for Decomposition):**\n\`\`\`html\n${analyzedEsHtml}\n\`\`\`\n## Task\nYour task is to meticulously analyze the "Analyzed Evidence Statements" and identify all granular facets a student must master that are directly related to the **"Target Element for this Task"** specified above.\n- Derive facets ONLY from the text of the Evidence Statements.\n- DO NOT invent facets or pull information from other elements. Your focus must remain exclusively on the target element.\n- Each facet must be a complete, standalone statement of a skill or concept.\n## Output Format\nYour output **MUST** be a valid JSON object. Do not include any text, explanations, or markdown fences before or after the JSON.\nThe JSON object must contain:\n1.  \`dimensionName\`: A string with the full name of the dimension (e.g., "Planning and Carrying Out Investigations").\n2.  \`elementText\`: A string with the full official text of the element (e.g., "Conduct an investigation and/or evaluate and/or revise the experimental design...").\n3.  \`facets\`: An array of strings. Each string is a single, decomposed facet related ONLY to the target element.\n## Example Output:\n\`\`\`json\n{\n  "dimensionName": "Structure and Function",\n  "elementText": "All living things are made up of cells, which is the smallest unit that can be said to be alive. An organism may consist of one single cell (unicellular) or many different numbers and types of cells (multicellular).",\n  "facets": [\n    "Identify that all living things are made of cells.",\n    "Identify that the cell is the smallest unit that can be considered alive.",\n    "Provide evidence for the presence or absence of cells in living and nonliving things.",\n    "Distinguish between unicellular and multicellular organisms."\n  ]\n}\n\`\`\``; const model = genAI.getGenerativeModel({ model: selectedAiModel }); const result = await model.generateContent(finalPrompt); const response = await result.response; const jsonText = response.text().replace(/^```json\n?/, '').replace(/\n?```$/, ''); return JSON.parse(jsonText); };
        const runFacetDecomposition = async (peId, forceRefresh = false) => { const deconstructBtn = document.getElementById('deconstruct-facets-btn'); const refreshBtn = document.getElementById('refresh-facets-btn'); if (!forceRefresh && savedAnalyses[peId]?.facetDecomposition) { try { const cachedData = JSON.parse(savedAnalyses[peId].facetDecomposition); renderFacetTables(cachedData, peId); facetDecompositionModal.classList.add('is-visible'); return; } catch (e) { console.warn("Could not parse cached facet data, regenerating.", e); } } if (forceRefresh) { if (savedAnalyses[peId]?.facetDecomposition) { delete savedAnalyses[peId].facetDecomposition; deleteAnalysisFromDB(peId, 'facetDecomposition'); } } if (!genAI) { alert("Gemini API Key is not set. Please add it in Settings."); settingsModal.classList.add('is-visible'); return; } const esBody = evidenceStatementsModalBody; const needsAnalysis = !esBody.querySelector('span.sep, span.dci, span.ccc'); let analyzedEsHtml = esBody.innerHTML; if (needsAnalysis) { const success = await runAiAnalysis(peId, 'evidenceStatements', esBody); if (!success) { return; } analyzedEsHtml = esBody.innerHTML; } const pe = peMap.get(peId); const elementCodes = [...pe.associatedComponentCodes]; const finalFacetData = {}; deconstructBtn.disabled = true; refreshBtn.disabled = true; for (let i = 0; i < elementCodes.length; i++) { const elementCode = elementCodes[i]; const progressText = `Deconstructing ${i + 1} of ${elementCodes.length}...`; deconstructBtn.textContent = progressText; refreshBtn.textContent = progressText; try { const singleElementFacetData = await generateFacetsForElement(pe, elementCode, analyzedEsHtml); finalFacetData[elementCode] = singleElementFacetData; } catch (error) { console.error(`Failed to generate facets for ${elementCode}:`, error); alert(`An error occurred while processing element ${elementCode}. Check the console for details.`); break; } } if (Object.keys(finalFacetData).length === elementCodes.length) { saveAnalysis(peId, 'facetDecomposition', JSON.stringify(finalFacetData)); renderFacetTables(finalFacetData, peId); facetDecompositionModal.classList.add('is-visible'); } deconstructBtn.textContent = 'Deconstruct into 3D Facets'; deconstructBtn.disabled = false; refreshBtn.textContent = 'Refresh with AI'; refreshBtn.disabled = false; };
        const renderFacetTables = (data, peId) => { const container = document.getElementById('facet-tables-container'); document.getElementById('facet-modal-title').textContent = `3D Facet Decomposition for ${peId}`; facetDecompositionModal.dataset.peId = peId; container.innerHTML = ''; for (const elementCode in data) { const item = data[elementCode]; let tableHtml = `<table class="facet-table"><thead><tr><th><div class="facet-element-id">${elementCode}</div><div class="facet-dimension-name">${item.dimensionName || '...'}</div><div class="facet-element-text">${item.elementText || '...'}</div></th></tr></thead><tbody>`; item.facets.forEach((facet, index) => { tableHtml += `<tr><td><div class="facet-item-row"><span class="facet-num">${index + 1}.</span><span class="facet-text">${facet}</span></div></td></tr>`; }); tableHtml += `</tbody></table>`; container.innerHTML += tableHtml; } };
        const renderMatrix = () => { if (!matrixRowElements.size) { matrixTableContainer.style.display = 'none'; matrixPlaceholder.style.display = 'flex'; return; } matrixTableContainer.style.display = 'block'; matrixPlaceholder.style.display = 'none'; let head = '<tr><th>3D Element</th>'; sortedGradeLabels.forEach(g => { head += `<th>${g}</th>`; }); matrixTableHead.innerHTML = head + '</tr>'; let body = ''; [...matrixRowElements].sort((a, b) => (elementMap.get(a)?.name || '').localeCompare(elementMap.get(b)?.name || '')).forEach(code => { const el = elementMap.get(code); if (!el) return; body += `<tr data-dimension-code="${el.dimensionCode}" data-component-code="${el.code}"><td class="copyable">${el.name}</td>`; const gradeMap = elementToGradePeMap.get(code); sortedGradeLabels.forEach(g => { if (gradeMap?.has(g)) { const ids = [...gradeMap.get(g)].sort(); body += `<td>${ids.map(id => { const p = peMap.get(id); return `<span class="pe-matrix-link copyable" data-pe-id="${id}" title="${p ? `PE: ${id}\n${p.description}`.replace(/"/g, '&quot;') : `View ${id}`}">${id}</span>`; }).join('')}</td>`; } else body += '<td></td>'; }); body += '</tr>'; }); matrixTableBody.innerHTML = body; applyFilters(); };
        const filterMatrixTable = () => { const term = searchInput.value.trim().toLowerCase(); const dim = dimensionFilters.querySelector('.active')?.dataset.filter; let count = 0; matrixTableBody.querySelectorAll('tr').forEach(row => { let isVis = true; const code = row.dataset.componentCode; if (dim) { if (row.dataset.dimensionCode !== dim) isVis = false; else if (dim.startsWith('DCI')) { const major = document.querySelector('#sub-dimension-filters .active')?.dataset.filter; const minors = new Set([...dciMinorFilters.querySelectorAll('.active')].map(b => b.dataset.filter)); if (minors.size > 0) { if (![...minors].some(m => code.startsWith(m))) isVis = false; } else if (major && !code.startsWith(major)) isVis = false; } else { const subs = new Set([...subDimensionFilters.querySelectorAll('.active')].map(b => b.dataset.filter)); if (subs.size > 0 && !subs.has(code)) isVis = false; } } if (isVis && term && !row.textContent.toLowerCase().includes(term)) isVis = false; row.style.display = isVis ? '' : 'none'; if (isVis) count++; }); resultsCountSpan.textContent = `${count} elements found.`; };

        const makeModalDraggable = (modal) => { const content = modal.querySelector('.modal-content'); const header = modal.querySelector('.modal-header'); if (!content || !header) return; let active = false, initialX, initialY, xOffset = 0, yOffset = 0; const observer = new MutationObserver(() => { if (modal.classList.contains('is-visible') && !modal.wasVisible) { content.style.transform = 'translate(0, 0)'; xOffset = 0; yOffset = 0; } modal.wasVisible = modal.classList.contains('is-visible'); }); observer.observe(modal, { attributes: true, attributeFilter: ['class'] }); const dragStart = (e) => { if (e.target.closest('button')) return; initialX = (e.type === 'touchstart' ? e.touches[0].clientX : e.clientX) - xOffset; initialY = (e.type === 'touchstart' ? e.touches[0].clientY : e.clientY) - yOffset; active = true; content.style.transition = 'none'; header.style.cursor = 'grabbing'; document.body.style.userSelect = 'none'; }; const dragEnd = () => { if (!active) return; active = false; content.style.transition = ''; header.style.cursor = 'move'; document.body.style.userSelect = ''; }; const drag = (e) => { if (active) { if (e.cancelable) e.preventDefault(); const currentX = (e.type === 'touchmove' ? e.touches[0].clientX : e.clientX) - initialX; const currentY = (e.type === 'touchmove' ? e.touches[0].clientY : e.clientY) - initialY; xOffset = currentX; yOffset = currentY; content.style.transform = `translate(${currentX}px, ${currentY}px)`; } }; header.addEventListener('mousedown', dragStart); header.addEventListener('touchstart', dragStart, { passive: true }); document.addEventListener('mouseup', dragEnd); document.addEventListener('touchend', dragEnd); document.addEventListener('mousemove', drag); document.addEventListener('touchmove', drag, { passive: false }); };
        const showHandlesForSpan = (span) => { if (window.innerWidth < 768) return; hideHandles(); const container = span.closest('.ai-editable-content'); if (!container) return; const rects = span.getClientRects(); if (rects.length === 0) return; const containerRect = container.getBoundingClientRect(); const firstRect = rects[0], lastRect = rects[rects.length - 1]; const startTop = firstRect.top - containerRect.top + (firstRect.height / 2) + container.scrollTop; const startLeft = firstRect.left - containerRect.left + container.scrollLeft; const endTop = lastRect.top - containerRect.top + (lastRect.height / 2) + container.scrollTop; const endLeft = lastRect.right - containerRect.left + container.scrollLeft; container.appendChild(handleStart); container.appendChild(handleEnd); handleStart.style.top = `${startTop}px`; handleStart.style.left = `${startLeft}px`; handleStart.style.display = 'block'; handleEnd.style.top = `${endTop}px`; handleEnd.style.left = `${endLeft}px`; handleEnd.style.display = 'block'; };
        const hideHandles = () => { handleStart.style.display = 'none'; handleEnd.style.display = 'none'; document.querySelectorAll('.is-active-target').forEach(el => el.classList.remove('is-active-target')); };
        const showToolbar = (target) => { const rect = target instanceof Element ? target.getBoundingClientRect() : target; aiEditToolbar.classList.add('is-visible'); if (window.innerWidth >= 768) { const scrollY = window.scrollY, scrollX = window.scrollX; aiEditToolbar.style.position = 'absolute'; aiEditToolbar.style.top = `${rect.top + scrollY - aiEditToolbar.offsetHeight - 8}px`; aiEditToolbar.style.left = `${rect.left + scrollX + rect.width / 2 - aiEditToolbar.offsetWidth / 2}px`; } updateToolbarState(); };
        const hideToolbar = () => { aiEditToolbar.classList.remove('is-visible'); aiEditToolbar.style.position = ''; if (activeEditableTarget instanceof Element) activeEditableTarget.classList.remove('is-active-target'); activeEditableTarget = null; activeResizeSpan = null; };
        const updateToolbarState = () => { aiEditToolbar.querySelectorAll('button').forEach(b => b.classList.remove('active')); if (activeEditableTarget instanceof Element) { const span = activeEditableTarget; const btn = aiEditToolbar.querySelector(`button[data-value="${span.className.trim()}"]`); if(btn) btn.classList.add('active'); } };
        const performToolbarAction = (action, value) => { if (!activeEditableTarget) return; let targetSpan, isRange = activeEditableTarget instanceof Range; if (isRange) { try { const newSpan = document.createElement('span'); activeEditableTarget.surroundContents(newSpan); targetSpan = newSpan; } catch (e) { alert("Could not apply change. Selections cannot cross different text blocks."); console.error("Could not wrap selection:", e); window.getSelection().removeAllRanges(); hideToolbar(); return; } } else { targetSpan = activeEditableTarget; } if (action === 'set-class') { const wasActive = !isRange && targetSpan.className === value; if (wasActive) { if (targetSpan.parentElement) targetSpan.replaceWith(...targetSpan.childNodes); } else { targetSpan.className = value; } } else if (action === 'unwrap') { if (targetSpan.parentElement) targetSpan.replaceWith(...targetSpan.childNodes); } const editableContent = targetSpan.closest('.ai-editable-content'); if (editableContent) { editableContent.normalize(); saveAnalysis(editableContent.dataset.peId, editableContent.dataset.part, editableContent.innerHTML); } window.getSelection().removeAllRanges(); hideToolbar(); hideHandles(); };
        const handlePointerMove = (e) => { if (!isResizing) return; e.preventDefault(); const x = e.touches ? e.touches[0].clientX : e.clientX, y = e.touches ? e.touches[0].clientY : e.clientY; const selection = window.getSelection(); const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null; if (!range) return; const cursorNode = range.startContainer, cursorOffset = range.startOffset; const editableContent = activeResizeSpan.closest('.ai-editable-content'); if (!editableContent || !editableContent.contains(cursorNode)) return; try { selection.extend(cursorNode, cursorOffset); } catch (err) { console.warn("Cannot extend selection.", err); } };
        const handlePointerUp = (e) => { if (!isResizing) return; isResizing = false; document.body.style.userSelect = ''; document.removeEventListener('mousemove', handlePointerMove); document.removeEventListener('touchmove', handlePointerMove); document.removeEventListener('mouseup', handlePointerUp); document.removeEventListener('touchend', handlePointerUp); const selection = window.getSelection(); if (!selection || selection.isCollapsed) { window.getSelection()?.removeAllRanges(); hideToolbar(); hideHandles(); return; } const finalRange = selection.getRangeAt(0); const originalSpan = activeResizeSpan; const editableContent = originalSpan.closest('.ai-editable-content'); const classList = originalSpan.className; originalSpan.replaceWith(...originalSpan.childNodes); try { const newSpan = document.createElement('span'); newSpan.className = classList; finalRange.surroundContents(newSpan); editableContent.normalize(); saveAnalysis(editableContent.dataset.peId, editableContent.dataset.part, editableContent.innerHTML); } catch (err) { console.error("Resize/Highlight failed. This is expected for multi-block selections.", err); alert("Could not apply change. Highlights cannot span across multiple paragraphs or list items."); } window.getSelection()?.removeAllRanges(); hideToolbar(); hideHandles(); };
        const handlePointerDownOnHandle = (e, handleName) => { e.preventDefault(); e.stopPropagation(); if (!activeResizeSpan) return; const spanToResize = activeResizeSpan; isResizing = true; activeHandle = handleName; document.body.style.userSelect = 'none'; aiEditToolbar.classList.remove('is-visible'); const selection = window.getSelection(); selection.removeAllRanges(); const range = document.createRange(); range.selectNodeContents(spanToResize); if (handleName === 'end') { selection.collapse(range.startContainer, range.startOffset); } else { selection.collapse(range.endContainer, range.endOffset); } document.addEventListener('mousemove', handlePointerMove); document.addEventListener('touchmove', handlePointerMove, { passive: false }); document.addEventListener('mouseup', handlePointerUp); document.addEventListener('touchend', handlePointerUp); };

        handleStart.addEventListener('mousedown', e => handlePointerDownOnHandle(e, 'start'));
        handleStart.addEventListener('touchstart', e => handlePointerDownOnHandle(e, 'start'), { passive: false });
        handleEnd.addEventListener('mousedown', e => handlePointerDownOnHandle(e, 'end'));
        handleEnd.addEventListener('touchstart', e => handlePointerDownOnHandle(e, 'end'), { passive: false });
        
        const setupCoreEventListeners = () => {
            resetAppBtn.addEventListener('click', resetApp);
            navPeExplorer.addEventListener('click', () => switchView('pe'));
            navThreedExplorer.addEventListener('click', () => switchView('3d'));
            navMatrixView.addEventListener('click', () => switchView('matrix'));
            backBtn.addEventListener('click', goBack);
            searchInput.addEventListener('input', () => { applyFilters(); updateUrlFromState(); });
            dimensionFilters.addEventListener('click', e => { if (e.target.matches('.filter-btn')) { const wasActive = e.target.classList.contains('active'); dimensionFilters.querySelector('.active')?.classList.remove('active'); subDimensionFilters.innerHTML = ''; subDimensionFiltersContainer.style.display = 'none'; clearSubFiltersBtn.style.display = 'none'; dciMinorFiltersContainer.style.display = 'none'; if (!wasActive) { e.target.classList.add('active'); renderSubFilters(e.target.dataset.filter); } applyFilters(); updateUrlFromState(); } });
            subDimensionFilters.addEventListener('click', e => { if (e.target.matches('.filter-btn')) { const isDci = dimensionFilters.querySelector('.active')?.dataset.filter.startsWith('DCI'); if(isDci) { const wasActive = e.target.classList.contains('active'); subDimensionFilters.querySelectorAll('.active').forEach(b => b.classList.remove('active')); dciMinorFiltersContainer.style.display = 'none'; if (!wasActive) { e.target.classList.add('active'); renderDciMinorFilters(e.target.dataset.filter); } } else { e.target.classList.toggle('active'); } applyFilters(); updateUrlFromState(); } });
            dciMinorFilters.addEventListener('click', e => { if(e.target.matches('.filter-btn')) { e.target.classList.toggle('active'); applyFilters(); updateUrlFromState(); } });
            clearSubFiltersBtn.addEventListener('click', () => { subDimensionFilters.querySelectorAll('.active').forEach(b => b.classList.remove('active')); dciMinorFiltersContainer.style.display = 'none'; applyFilters(); updateUrlFromState(); });
            gradeFilters.addEventListener('click', e => { if (e.target.matches('.filter-btn')) { gradeFilters.querySelector('.active')?.classList.remove('active'); e.target.classList.add('active'); document.getElementById('topic-filters').innerHTML = ''; renderTopicFilters(e.target.dataset.filter); applyFilters(); updateUrlFromState(); } });
            document.getElementById('topic-filters-container').addEventListener('click', e => { const btn = e.target.closest('.filter-btn'); if (!btn) return; const group = document.getElementById('topic-filters'); if (btn.dataset.filter === 'all') { group.querySelectorAll('.active').forEach(b => b.classList.remove('active')); btn.classList.add('active'); } else { group.querySelector('[data-filter="all"]')?.classList.remove('active'); btn.classList.toggle('active'); } if (!group.querySelector('.active')) group.querySelector('[data-filter="all"]')?.classList.add('active'); applyFilters(); updateUrlFromState(); });
            activePeFilterTag.addEventListener('click', e => { if (e.target.closest('#clear-pe-filter-btn')) clearPeFilter(); else { const id = e.currentTarget.dataset.peId; if (id) navigateToPe(id); } });

            // ROBUST EVENT DELEGATION: Attach one listener to the body to handle all dynamic content clicks
            document.body.addEventListener('click', e => {
                const link = e.target.closest('.clickable-element-link');
                const viewAllBtn = e.target.closest('.view-related-3d-btn');
                const evidenceBtn = e.target.closest('.view-evidence-btn');
                const analyzeBtn = e.target.closest('.analyze-pe-desc-btn');
                const resetBtn = e.target.closest('.reset-analysis-btn');
                const peNavLink = e.target.closest('.pe-nav-link');

                if (peNavLink) { e.stopPropagation(); navigateToPe(peNavLink.dataset.peId); return; }
                if (evidenceBtn) { e.stopPropagation(); showEvidenceStatements(evidenceBtn.dataset.peId); return; }
                if (analyzeBtn) { e.stopPropagation(); const peId = analyzeBtn.dataset.peId; const targetDiv = analyzeBtn.closest('.pe-details-wrapper').querySelector('.pe-description-text'); runAiAnalysis(peId, 'description', targetDiv); return; }
                if (resetBtn) { e.stopPropagation(); const wrapper = resetBtn.closest('.pe-details-wrapper, .modal-footer'); const content = wrapper.parentElement.querySelector('.ai-editable-content'); if (content) { resetAnalysis(content.dataset.peId, content.dataset.part, content); } return; }
                if (link || viewAllBtn) { const peId = e.target.closest('[data-pe-id]').dataset.peId; const compCode = link?.dataset.componentCode; const specCode = link?.dataset.specificCode; activePeFilter = link?.closest('.pe-details-connections') ? null : peId; switchView('3d', { component: compCode, specific: specCode }, true); return; }
                
                const editableContent = e.target.closest('.ai-editable-content');
                const isToolbar = e.target.closest('#ai-edit-toolbar');
                if (!editableContent && !isToolbar) { hideToolbar(); hideHandles(); }
                const span = e.target.closest('.ai-editable-content span');
                if(span && !isToolbar) {
                    document.querySelectorAll('.is-active-target').forEach(el => el.classList.remove('is-active-target'));
                    span.classList.add('is-active-target');
                    activeEditableTarget = span; activeResizeSpan = span;
                    showToolbar(span); showHandlesForSpan(span);
                }
            });

            document.body.addEventListener('mouseup', e => {
                if (isResizing || e.target.closest('#ai-edit-toolbar')) return;
                 setTimeout(() => {
                    const selection = window.getSelection();
                    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) return;
                    const range = selection.getRangeAt(0);
                    const commonAncestor = range.commonAncestorContainer;
                    const containerEl = commonAncestor.nodeType === 3 ? commonAncestor.parentElement : commonAncestor;
                    if (containerEl && containerEl.closest('.ai-editable-content')) {
                        activeEditableTarget = range; activeResizeSpan = null;
                        showToolbar(range.getBoundingClientRect()); hideHandles();
                    }
                 }, 10);
            });
            aiEditToolbar.addEventListener('click', e => { const btn = e.target.closest('button'); if (btn?.dataset.action) performToolbarAction(btn.dataset.action, btn.dataset.value); });

            peTableBody.addEventListener('click', e => {
                const cb = e.target.closest('.pe-bundle-checkbox');
                if (cb) { if (cb.checked) peBundle.add(cb.dataset.peId); else peBundle.delete(cb.dataset.peId); syncCheckboxesWithBundle(); updateBundleControls(); return; }
                const row = e.target.closest('.pe-main-row');
                if (row && !e.target.closest('.clickable-element-link, .view-related-3d-btn, .view-evidence-btn, .analyze-pe-desc-btn, .reset-analysis-btn')) {
                    const wasExp = row.classList.contains('expanded');
                    const detailsRow = row.nextElementSibling;
                    const peId = row.dataset.peId;
                    peTableBody.querySelectorAll('.expanded, .is-visible').forEach(r => r.classList.remove('expanded', 'is-visible'));
                    if (!wasExp) {
                        const detailsCell = detailsRow.querySelector('td');
                        if (!detailsCell.hasChildNodes()) {
                            const pe = peMap.get(peId);
                            if (pe) detailsCell.innerHTML = createPeDetailsHtml(pe);
                        }
                        row.classList.add('expanded');
                        detailsRow.classList.add('is-visible');
                        scrollToPeRow(row);
                    }
                    updateUrlFromState();
                }
            });

            threedTableBody.addEventListener('click', e => { const item = e.target.closest('.item'); if(item) { const code = item.dataset.code; const el = specificElementMap.get(code); if(!el) return; document.getElementById('related-pe-modal-title').textContent = `PEs related to ${code}`; const ids = [...el.relatedPes].sort(); relatedPeList.innerHTML = ids.length ? ids.map(id => { const p = peMap.get(id); return `<li class="clickable-pe-link" data-pe-id="${id}" title="${p.description.replace(/"/g, '&quot;')}"><strong>${id}</strong>: ${p.description}</li>`; }).join('') : '<li>No PEs found.</li>'; relatedPeModal.classList.add('is-visible'); } });
            
            relatedPeModal.addEventListener('click', e => { const li = e.target.closest('.clickable-pe-link'); if (li) { relatedPeModal.classList.remove('is-visible'); navigateToPe(li.dataset.peId); } else if (e.target === relatedPeModal || e.target.closest('.modal-close-btn')) { relatedPeModal.classList.remove('is-visible'); } });
            settingsBtn.addEventListener('click', () => settingsModal.classList.add('is-visible'));
            settingsModal.addEventListener('click', e => { if (e.target === settingsModal || e.target.closest('.modal-close-btn')) settingsModal.classList.remove('is-visible'); });
            saveSettingsBtn.addEventListener('click', () => { const key = apiKeyInput.value.trim(); if(key){ localStorage.setItem('geminiApiKey', key); initializeGenAI(); } else { localStorage.removeItem('geminiApiKey'); genAI = null; } selectedAiModel = aiModelSelect.value; localStorage.setItem('aiModel', selectedAiModel); alert('Settings saved.'); settingsModal.classList.remove('is-visible'); });
            clearAiCacheBtn.addEventListener('click', async () => { if (confirm("Delete all cached AI results?")) try { await clearAllAnalyses(); alert("AI cache cleared. Refresh may be needed."); } catch (e) { alert("Error clearing AI cache."); } });
            clearDataCacheBtn.addEventListener('click', async () => { if (confirm("Delete cached app data? Next load may be slow.")) try { await clearDataCache(); alert("Data cache cleared. Please refresh."); } catch (e) { alert("Error clearing data cache."); } });
            
            document.getElementById('analyze-es-btn').addEventListener('click', e => runAiAnalysis(e.target.closest('.modal-overlay').dataset.peId, 'evidenceStatements', evidenceStatementsModalBody));
            document.getElementById('deconstruct-facets-btn').addEventListener('click', e => runFacetDecomposition(e.target.closest('.modal-overlay').dataset.peId));
            document.getElementById('copy-es-html-btn').addEventListener('click', () => navigator.clipboard.writeText(evidenceStatementsModalBody.innerHTML).then(() => alert('HTML copied.')));
            evidenceStatementsModal.addEventListener('click', e => { if (e.target.matches('.modal-close-btn, .modal-overlay')) evidenceStatementsModal.classList.remove('is-visible'); if (e.target.closest('.reset-analysis-btn')) { resetAnalysis(evidenceStatementsModal.dataset.peId, evidenceStatementsModalBody.dataset.part, evidenceStatementsModalBody); }});
            
            facetDecompositionModal.addEventListener('click', e => { if (e.target.matches('.modal-close-btn, #close-facets-btn, .modal-overlay')) { facetDecompositionModal.classList.remove('is-visible'); } if (e.target.matches('#refresh-facets-btn')) { const peId = e.currentTarget.dataset.peId; if(peId && confirm("This will use the AI to regenerate the facet decomposition, overwriting the current version. Continue?")) { runFacetDecomposition(peId, true); } } if (e.target.matches('#copy-facets-btn')) { const container = document.getElementById('facet-tables-container'); let text = document.getElementById('facet-modal-title').textContent + '\n\n'; container.querySelectorAll('.facet-table').forEach(table => { const id = table.querySelector('.facet-element-id').textContent, dim = table.querySelector('.facet-dimension-name').textContent, elText = table.querySelector('.facet-element-text').textContent; text += `--- ${id}: ${dim} ---\n${elText}\n\n`; table.querySelectorAll('.facet-text').forEach(facet => { text += `- ${facet.textContent.trim()}\n`; }); text += '\n'; }); navigator.clipboard.writeText(text).then(() => alert('Facets copied as text.')); } });
            document.getElementById('threed-explorer-table').querySelectorAll('.col-toggle-btn').forEach(t => t.addEventListener('click', () => { isolatedColumn = t.classList.contains('active') ? null : t.dataset.col; applyColumnIsolation(); updateUrlFromState(); }));
            document.body.addEventListener('contextmenu', e => { const t = e.target.closest('.item, .copyable, .statement'); if (t) { e.preventDefault(); navigator.clipboard.writeText(t.innerText.trim()); t.classList.add('copied'); setTimeout(() => t.classList.remove('copied'), 1500); } });
            viewBundleBtn.addEventListener('click', renderBundleView); clearBundleBtn.addEventListener('click', () => { peBundle.clear(); syncCheckboxesWithBundle(); updateBundleControls(); });
            selectAllCheckbox.addEventListener('click', e => {
                const isChecked = e.target.checked;
                const isMobile = window.innerWidth < 992;
                const visibleCheckboxes = isMobile
                    ? [...peCardsContainer.querySelectorAll('.pe-card:not([style*="display: none"]) .pe-bundle-checkbox')]
                    : [...peTableBody.querySelectorAll('.pe-main-row:not([style*="display: none"]) .pe-bundle-checkbox')];
                visibleCheckboxes.forEach(cb => {
                    if (isChecked) peBundle.add(cb.dataset.peId);
                    else peBundle.delete(cb.dataset.peId);
                });
                syncCheckboxesWithBundle();
                updateBundleControls();
            });
            addElementFilterBtn.addEventListener('click', () => { let html = ''; window.allNgss3dElements.forEach(d => { html += `<div><h4>${d.dimension}</h4>`; const items = d.elements || d.core_ideas?.flatMap(c => c.components) || []; html += items.map(i => `<div class="element-choice" data-code="${i.name.split(':')[0].trim()}">${i.name}</div>`).join(''); html += `</div>`; }); document.getElementById('element-filter-choices').innerHTML = html; elementFilterModal.classList.add('is-visible'); });
            elementFilterModal.addEventListener('click', e => { const choice = e.target.closest('.element-choice'); if (choice) { activeElementFilters.add(choice.dataset.code); renderActiveElementFilters(); applyFilters(); elementFilterModal.classList.remove('is-visible'); updateUrlFromState(); } else if (e.target === elementFilterModal || e.target.closest('.modal-close-btn')) elementFilterModal.classList.remove('is-visible'); });
            activeElementFiltersDiv.addEventListener('click', e => { const btn = e.target.closest('button'); if(btn) { activeElementFilters.delete(btn.dataset.code); renderActiveElementFilters(); applyFilters(); updateUrlFromState(); }});
            document.getElementById('manage-bundles-btn').addEventListener('click', () => { renderBundleManager(); bundleManagerModal.classList.add('is-visible'); });
            bundleManagerModal.addEventListener('click', e => { if (e.target === bundleManagerModal || e.target.closest('.modal-close-btn')) bundleManagerModal.classList.remove('is-visible'); const load = e.target.closest('.load-bundle-btn'); const del = e.target.closest('.delete-bundle-btn'); if (load) { peBundle = new Set(savedBundles[load.dataset.name]); syncCheckboxesWithBundle(); updateBundleControls(); bundleManagerModal.classList.remove('is-visible'); } else if (del) { const name = del.dataset.name; if (confirm(`Delete bundle "${name}"?`)) { delete savedBundles[name]; saveBundlesToStorage(); renderBundleManager(); if (activeBundleFilter === name) activeBundleFilter = null; renderBundleFilters(); applyFilters(); updateUrlFromState(); } } });
            saveBundleBtn.addEventListener('click', () => { document.getElementById('bundle-name-input').value = ''; saveBundleModal.classList.add('is-visible'); });
            saveBundleModal.addEventListener('click', e => { if (e.target === saveBundleModal || e.target.closest('.modal-close-btn')) saveBundleModal.classList.remove('is-visible'); });
            document.getElementById('confirm-save-bundle-btn').addEventListener('click', () => { const name = document.getElementById('bundle-name-input').value.trim(); if (!name) return; if (savedBundles[name] && !confirm(`Overwrite bundle "${name}"?`)) return; savedBundles[name] = [...peBundle]; saveBundlesToStorage(); saveBundleModal.classList.remove('is-visible'); renderBundleFilters(); });
            document.getElementById('cancel-save-bundle-btn').addEventListener('click', () => saveBundleModal.classList.remove('is-visible'));
            bundleFilters.addEventListener('click', e => { const btn = e.target.closest('.filter-btn'); if (btn) { activeBundleFilter = btn.dataset.name === 'all' ? null : btn.dataset.name; renderBundleFilters(); applyFilters(); updateUrlFromState(); } });
            matrixTableBody.addEventListener('click', e => { const link = e.target.closest('.pe-matrix-link'); if(link) navigateToPe(link.dataset.peId); });
            document.getElementById('select-matrix-rows-btn').addEventListener('click', () => { let html = ''; window.allNgss3dElements.forEach(d => { html += `<div><h4>${d.dimension}</h4>`; const items = d.elements || d.core_ideas?.flatMap(c => c.components) || []; items.forEach(i => { const code = i.name.split(':')[0].trim(); html += `<label><input type="checkbox" data-code="${code}" ${matrixRowElements.has(code) ? 'checked' : ''}> ${i.name}</label>`; }); html += `</div>`; }); document.getElementById('matrix-row-choices').innerHTML = html; matrixRowSelectModal.classList.add('is-visible'); });
            document.getElementById('update-matrix-btn').addEventListener('click', () => { matrixRowElements.clear(); document.querySelectorAll('#matrix-row-choices input:checked').forEach(cb => matrixRowElements.add(cb.dataset.code)); matrixRowSelectModal.classList.remove('is-visible'); renderMatrix(); updateUrlFromState(); });
            matrixRowSelectModal.addEventListener('click', e => { if (e.target === matrixRowSelectModal || e.target.closest('.modal-close-btn')) matrixRowSelectModal.classList.remove('is-visible'); });
            window.addEventListener('popstate', applyStateFromUrl);

            // --- MOBILE UI LISTENERS ---
            const filterModalBody = document.getElementById('filter-modal-body');
            const sidebarControls = document.querySelector('#sidebar-controls-storage .controls');
            filterModalBody.appendChild(sidebarControls);
            fabFilterBtn.addEventListener('click', () => filterModal.classList.add('is-visible'));
            fabBundleViewBtn.addEventListener('click', renderBundleView);
            filterModal.addEventListener('click', e => { if (e.target === filterModal || e.target.closest('.modal-close-btn, #apply-filters-btn')) filterModal.classList.remove('is-visible'); });
            
            bottomNav.addEventListener('click', e => {
                const btn = e.target.closest('.bottom-nav-btn');
                if (!btn) return;
                switchView(btn.dataset.view);
            });

            peCardsContainer.addEventListener('click', e => {
                const card = e.target.closest('.pe-card');
                const idLink = e.target.closest('.pe-card-id');
                if (!card) return;
                if (idLink) {
                    e.stopPropagation();
                    const peId = card.dataset.peId;
                    const pe = peMap.get(peId);
                    evidenceStatementsModalTitle.textContent = `${pe.id}`;
                    evidenceStatementsModalBody.innerHTML = createPeDetailsHtml(pe);
                    evidenceStatementsModal.classList.add('is-visible');
                    return;
                }
                const checkbox = card.querySelector('.pe-bundle-checkbox');
                if (!e.target.matches('.pe-bundle-checkbox')) checkbox.checked = !checkbox.checked;
                const peId = checkbox.dataset.peId;
                if (checkbox.checked) peBundle.add(peId);
                else peBundle.delete(peId);
                syncCheckboxesWithBundle();
                updateBundleControls();
            });
        };

        // --- 9. INITIALIZATION ---
        const initializeApp = async () => {
            await openDb();
            savedAnalyses = await loadAnalysesFromDB();
            selectedAiModel = localStorage.getItem('aiModel') || 'gemini-2.5-pro';
            aiModelSelect.value = selectedAiModel;
            initializeGenAI(); 
            try { peBundle = new Set(JSON.parse(localStorage.getItem('ngssPeBundle')) || []); } catch (e) { peBundle = new Set(); }
            loadBundlesFromStorage();
            await loadAndProcessData();
            buildMatrixDataMap();
            window.allNgss3dElements.forEach(d => (d.elements || d.core_ideas?.flatMap(c => c.components) || []).forEach(i => { const c = i.name.split(':')[0].trim(); if (c) matrixRowElements.add(c); }));
            populatePeTable(); 
            populate3dTable();
            gradeFilters.innerHTML = '<button class="filter-btn active" data-filter="all">All</button>' + sortedGradeLabels.map(g => `<button class="filter-btn" data-filter="${g}">${g}</button>`).join('');
            dimensionFilters.innerHTML = window.allNgss3dElements.filter(d => d.short_name).map(d => `<button class="filter-btn" data-filter="${d.code}">${d.short_name}</button>`).join('');
            setupCoreEventListeners(); 
            makeModalDraggable(document.getElementById('evidence-statements-modal'));
            makeModalDraggable(document.getElementById('facet-decomposition-modal'));
            updateBundleControls(); 
            applyStateFromUrl();
        };

        initializeApp();
    });