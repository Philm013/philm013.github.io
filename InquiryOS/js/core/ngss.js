/**
 * @file ngss.js
 * @description Logic for loading, filtering, and rendering NGSS (Next Generation Science Standards) data.
 * Optimized for mobile and faithful to official NGSS document layouts.
 */

import { App, ngssData } from './state.js';
import { toast, renderInfoTip } from '../ui/utils.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { saveToStorage } from './sync.js';
import { dbGet, dbPut, STORE_CACHE, isDBReady } from './storage.js';

/**
 * Fetches and processes NGSS 3D elements and Performance Expectations.
 * Uses local cache if available to drastically speed up startup.
 */
export async function loadNGSSData() {
    try {
        if (isDBReady()) {
            const cached = await dbGet(STORE_CACHE, 'ngss_data_processed');
            if (cached && (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000)) {
                reconstructNgssData(cached.data);
                ngssData.loaded = true;
                return;
            }
        }
        const fetchJSON = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`); return await r.json(); };
        const [elements3D, ngssK5, ngss68, ngss912] = await Promise.all([ fetchJSON('https://philm013.github.io/JSON/ngss3DElements.json'), fetchJSON('https://philm013.github.io/JSON/ngssK5.json'), fetchJSON('https://philm013.github.io/JSON/ngss68.json'), fetchJSON('https://philm013.github.io/JSON/ngss912.json') ]);
        ngssData.raw = { elements3D, ngssK5, ngss68, ngss912 };
        const allNgssData = [...ngssK5, ...ngss68, ...ngss912];
        elements3D.forEach(dim => { (dim.elements || dim.core_ideas || []).forEach(item => { const name = item.name.trim(); const parts = name.split(':'); const code = parts[0].trim(); if (!code) return; if (!ngssData.elementMap.has(code)) { ngssData.elementMap.set(code, { ...item, code, dimensionCode: dim.code, dimensionName: dim.dimension }); } ngssData.nameToCodeMap.set(name, code); const nameOnly = parts.length > 1 ? parts.slice(1).join(':').trim() : name; ngssData.nameToCodeMap.set(nameOnly, code); ngssData.nameToCodeMap.set(code, code); if (item.progressions) { Object.entries(item.progressions).forEach(([gradeKey, progs]) => { (progs || []).forEach(prog => { if (!ngssData.specificElementMap.has(prog.code)) { ngssData.specificElementMap.set(prog.code, { ...prog, parentCode: code, parentName: item.name, gradeBandKey: gradeKey, relatedPes: new Set() }); } ngssData.textToSpecificCodeMap.set(prog.text.trim(), prog.code); }); }); } }); });
        allNgssData.forEach(gradeData => { ngssData.gradeToTopicsMap[gradeData.gradeLabel] = []; gradeData.topics.forEach(topic => { ngssData.gradeToTopicsMap[gradeData.gradeLabel].push(topic.topicTitle); topic.performanceExpectations.forEach(pe => { const compCodes = new Set(); const specCodes = new Set(); ['sep', 'dci', 'ccc'].forEach(dimKey => { (pe.details[dimKey] || []).forEach(ref => { let lines = Array.isArray(ref.text) ? [...ref.text] : (typeof ref.text === 'string' ? ref.text.split('\n') : []); let componentName = ref.id; const isConnection = ref.id.startsWith("Connections to"); if (isConnection && lines.length > 0) { componentName = lines.shift().trim(); } const cleanId = componentName.replace(' (secondary)', '').trim(); let cCode = ngssData.nameToCodeMap.get(cleanId) || ngssData.nameToCodeMap.get(cleanId.split(':').pop().trim()); if (cCode) compCodes.add(cCode); lines.forEach(line => { if (!line.trim()) return; const specCode = findBestMatchingSpecificElement(line); if (specCode) { specCodes.add(specCode); const el = ngssData.specificElementMap.get(specCode); if (el) { el.relatedPes.add(pe.id); if (el.parentCode) compCodes.add(el.parentCode); } } }); }); }); ngssData.peMap.set(pe.id, { ...pe, gradeLabel: gradeData.gradeLabel, topicTitle: topic.topicTitle, associatedComponentCodes: compCodes, associatedSpecificCodes: specCodes }); }); }); });
        const order = ['Kindergarten', 'First Grade', 'Second Grade', 'K-2 ETS', 'Third Grade', 'Fourth Grade', 'Fifth Grade', '3-5 ETS', 'Middle School', 'High School'];
        ngssData.sortedGradeLabels = [...new Set([...ngssData.peMap.values()].map(pe => pe.gradeLabel))].sort((a, b) => { const iA = order.indexOf(a), iB = order.indexOf(b); return (iA === -1 && iB === -1) ? a.localeCompare(b) : (iA === -1 ? 1 : (iB === -1 ? -1 : iA - iB)); });
        const topics = new Set(); allNgssData.forEach(d => d.topics.forEach(t => topics.add(t.topicTitle))); ngssData.allTopics = [...topics].sort();
        if (isDBReady()) { await dbPut(STORE_CACHE, { id: 'ngss_data_processed', data: serializeNgssData(), timestamp: Date.now() }); }
        ngssData.loaded = true;
    } catch (e) { console.error(e); ngssData.loaded = true; }
}

function serializeNgssData() { return { elementMap: Array.from(ngssData.elementMap.entries()), specificElementMap: Array.from(ngssData.specificElementMap.entries()).map(([k, v]) => [k, { ...v, relatedPes: Array.from(v.relatedPes) }]), peMap: Array.from(ngssData.peMap.entries()).map(([k, v]) => [k, { ...v, associatedComponentCodes: Array.from(v.associatedComponentCodes), associatedSpecificCodes: Array.from(v.associatedSpecificCodes) }]), nameToCodeMap: Array.from(ngssData.nameToCodeMap.entries()), textToSpecificCodeMap: Array.from(ngssData.textToSpecificCodeMap.entries()), gradeToTopicsMap: ngssData.gradeToTopicsMap, sortedGradeLabels: ngssData.sortedGradeLabels, allTopics: ngssData.allTopics, raw: ngssData.raw }; }
function reconstructNgssData(data) { ngssData.elementMap = new Map(data.elementMap); ngssData.specificElementMap = new Map(data.specificElementMap.map(([k, v]) => [k, { ...v, relatedPes: new Set(v.relatedPes) }])); ngssData.peMap = new Map(data.peMap.map(([k, v]) => [k, { ...v, associatedComponentCodes: new Set(v.associatedComponentCodes), associatedSpecificCodes: new Set(v.associatedSpecificCodes) }])); ngssData.nameToCodeMap = new Map(data.nameToCodeMap); ngssData.textToSpecificCodeMap = new Map(data.textToSpecificCodeMap); ngssData.gradeToTopicsMap = data.gradeToTopicsMap; ngssData.sortedGradeLabels = data.sortedGradeLabels; ngssData.allTopics = data.allTopics; ngssData.raw = data.raw; }
function findBestMatchingSpecificElement(text) { const clean = text.trim().replace(/^[\*•]\s*/, '').replace(/\s*\([^)]*\)/g, '').trim(); if (clean.length < 15) return null; if (ngssData.textToSpecificCodeMap.has(clean)) return ngssData.textToSpecificCodeMap.get(clean); for (const [offText, code] of ngssData.textToSpecificCodeMap.entries()) { if (clean.includes(offText) || offText.includes(clean)) return code; } return null; }

export function processAndLinkPeText(text, peId) {
    const pe = ngssData.peMap.get(peId); if (!text || !pe) return Array.isArray(text) ? text.join('<br>') : (text || '');
    const lines = Array.isArray(text) ? text : text.split('\n');
    return lines.map((line, index) => {
        const cleanLine = line.trim(); if (!cleanLine) return '';
        let processedLine = line, codeDisplay = '';
        const code = findBestMatchingSpecificElement(line);
        if (code) { const el = ngssData.specificElementMap.get(code); if (el) { processedLine = `<span class="clickable-element-link cursor-pointer text-blue-600 hover:underline" data-pe-id="${peId}" data-component-code="${el.parentCode}" data-specific-code="${code}">${line}</span>`; codeDisplay = `<strong class="font-mono text-gray-400 text-[10px]">(${code})</strong> `; } }
        const hasBullet = cleanLine.startsWith('•') || cleanLine.startsWith('*') || cleanLine.startsWith('-');
        const isHeader = cleanLine.endsWith(':');
        const isSpecificItem = !!code;
        const shouldBeBullet = hasBullet || ((isSpecificItem || (lines.length > 1 && index > 0)) && !isHeader);
        let html = `${codeDisplay}${processedLine}`; if (shouldBeBullet && !hasBullet) html = `• ${html}`;
        return `<p class="mb-2 last:mb-0 leading-relaxed">${html}</p>`;
    }).join('');
}

export function renderNGSSBrowser() {
    const activeSection = App.ngssBrowserSection || 'pe';
    return `
        <div class="h-full flex flex-col">
            <div class="shrink-0 md:p-6 hidden md:block">
                <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">NGSS Navigator</h2>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Science Standards & 3D Elements</p>
            </div>

            <div class="panels-container lg:block flex-1">
                <div class="bg-white border-b flex flex-col h-full" data-card-title="Standards Browser">
                    <div class="sticky-panel-header md:hidden">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-blue-900 text-white rounded-lg flex items-center justify-center shrink-0 border border-blue-800">
                                <span class="iconify" data-icon="mdi:school"></span>
                            </div>
                            <h3>NGSS Navigator</h3>
                            ${renderInfoTip('Browse and search the Next Generation Science Standards. Use the "Link" button to connect specific standards to your lesson focus.')}
                        </div>
                    </div>
                    
                    <div class="panel-content !p-0 flex flex-col h-full">
                        <div class="p-4 bg-gray-50 border-b flex flex-wrap items-center gap-3">
                            <div class="relative flex-1 min-w-[200px]">
                                <span class="iconify absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" data-icon="mdi:magnify"></span>
                                <input type="text" id="ngssSearchInput" placeholder="Search code or text..." 
                                    value="${App.ngssFilters?.search || ''}" oninput="window.filterNGSSResults()"
                                    class="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-primary outline-none">
                            </div>
                            <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
                                <button onclick="window.setNgssBrowserSection('pe')" class="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeSection === 'pe' ? 'bg-primary text-white shadow-sm' : 'text-gray-400'}">Standards</button>
                                <button onclick="window.setNgssBrowserSection('3d')" class="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeSection === '3d' ? 'bg-primary text-white shadow-sm' : 'text-gray-400'}">3D Progression</button>
                            </div>
                            <button onclick="window.toggleNgssMobileFilters()" class="p-2 bg-white border border-gray-200 rounded-xl md:hidden">
                                <span class="iconify text-xl text-gray-600" data-icon="mdi:filter-variant"></span>
                            </button>
                        </div>

                        <div class="flex-1 flex overflow-hidden">
                            <div class="hidden md:block w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto p-6 space-y-8 shrink-0">
                                ${renderNGSSFilters(activeSection)}
                            </div>
                            <div id="ngssResultsArea" class="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
                                ${renderNGSSContent(activeSection)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Filter Modal -->
            <div id="ngssMobileFilters" class="fixed inset-0 z-[100] hidden flex-col bg-white animate-in slide-in-from-bottom duration-300">
                <div class="p-6 border-b flex items-center justify-between shrink-0">
                    <h3 class="font-black text-xl uppercase tracking-tighter">Standards Filters</h3>
                    <button onclick="window.toggleNgssMobileFilters()" class="p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <span class="iconify text-2xl" data-icon="mdi:close"></span>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-6 space-y-8">${renderNGSSFilters(activeSection)}</div>
                <div class="p-6 border-t bg-gray-50">
                    <button onclick="window.clearAllNgssFilters()" class="w-full py-4 text-red-600 font-black text-xs uppercase tracking-widest border-2 border-red-100 rounded-2xl mb-3">Clear All</button>
                    <button onclick="window.toggleNgssMobileFilters()" class="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl">Apply Filters</button>
                </div>
            </div>
        </div>
    `;
}

function hasActiveFilters() { const f = App.ngssFilters; return f && (f.grade && f.grade !== 'all' || f.dims?.length > 0 || f.progDim || f.elements?.length > 0); }

function renderNGSSFilters(section) {
    if (section === 'pe') {
        return `
            <div><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Grade Level</label>
                <div class="grid grid-cols-1 gap-1.5"><button onclick="window.setNgssFilter('grade', 'all')" class="ngss-filter-btn px-4 py-2 rounded-lg text-left text-[10px] font-black uppercase border transition-all ${!App.ngssFilters?.grade || App.ngssFilters.grade === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-400'}">All Grades</button>
                    ${ngssData.sortedGradeLabels.map(g => `<button onclick="window.setNgssFilter('grade', '${g}')" class="ngss-filter-btn px-4 py-2 rounded-lg text-left text-[10px] font-black uppercase border transition-all ${App.ngssFilters?.grade === g ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-400'}">${g}</button>`).join('')}
                </div>
            </div>
            <div><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Dimensions</label>
                <div class="space-y-1">
                    ${['SEP', 'DCI', 'CCC'].map(dim => { const isActive = App.ngssFilters?.dims?.includes(dim); return `<button onclick="window.toggleNgssDimFilter('${dim}')" class="w-full px-4 py-2 rounded-lg text-left text-[10px] font-black uppercase border transition-all ${isActive ? 'bg-primary text-white' : 'bg-white text-gray-400'} flex items-center justify-between"><span>${dim}</span><span class="iconify" data-icon="${isActive ? 'mdi:check' : 'mdi:plus'}"></span></button>`; }).join('')}
                </div>
            </div>
        `;
    } else if (section === '3d') {
        return `<div><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Focus Dimension</label><div class="grid grid-cols-1 gap-2">${['SEP', 'DCI', 'CCC'].map(dim => { const isActive = (App.ngssFilters?.progDim || 'SEP') === dim; return `<button onclick="window.setNgssFilter('progDim', '${dim}')" class="px-4 py-3 rounded-xl text-left text-[10px] font-black uppercase border transition-all ${isActive ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-400'} flex items-center justify-between"><span>${dim === 'SEP' ? 'Practices' : (dim === 'DCI' ? 'Core Ideas' : 'Crosscutting')}</span><span class="opacity-50">${dim}</span></button>`; }).join('')}</div></div>`;
    }
    return '';
}

function renderNGSSContent(section) {
    if (!ngssData.loaded) return '<div class="h-full flex items-center justify-center animate-pulse text-gray-400 font-black uppercase text-xs">Loading Standards...</div>';
    const filters = App.ngssFilters || {}, query = (filters.search || '').toLowerCase();
    if (section === 'pe') {
        const pes = Array.from(ngssData.peMap.values()).filter(pe => { if (filters.grade && filters.grade !== 'all' && pe.gradeLabel !== filters.grade) return false; if (filters.dims?.length > 0) { const peElements = [...pe.associatedComponentCodes].map(c => ngssData.elementMap.get(c)); const peDims = new Set(peElements.filter(Boolean).map(e => e.dimensionCode)); if (!filters.dims.some(d => peDims.has(d))) return false; } if (query && !pe.id.toLowerCase().includes(query) && !pe.description.toLowerCase().includes(query)) return false; return true; });
        return `<div class="space-y-4">
            <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">${pes.length} Standards</h3>
            <div class="grid grid-cols-1 gap-3">
                ${pes.slice(0, 50).map(pe => `<div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group"><div class="flex flex-col md:flex-row md:items-start justify-between gap-4"><div class="flex-1"><div class="flex flex-wrap items-center gap-2 mb-3"><span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black font-mono border border-blue-200">${pe.id}</span><span class="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[8px] font-black uppercase">${pe.gradeLabel}</span></div><h4 class="text-sm font-bold text-gray-800 leading-snug mb-4">${pe.description}</h4><div class="flex flex-wrap gap-1">${[...pe.associatedComponentCodes].slice(0, 6).map(c => `<span class="px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded text-[8px] font-black border border-gray-100 uppercase">${c}</span>`).join('')}</div></div><div class="shrink-0 flex gap-2"><button onclick="window.viewPeDetails('${pe.id}')" class="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[9px] font-black uppercase">Details</button><button onclick="window.addToPhenomenon('${pe.id}')" class="px-4 py-2 bg-gray-900 text-white rounded-xl text-[9px] font-black uppercase">Link</button></div></div></div>`).join('')}
                ${pes.length === 0 ? '<div class="py-20 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">No standards found</div>' : ''}
            </div>
        </div>`;
    }
    if (section === '3d') {
        const dim = filters.progDim || 'SEP', elements = Array.from(ngssData.elementMap.values()).filter(el => el.dimensionCode === dim);
        return `<div class="space-y-6">
            ${elements.map(el => `<div class="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm"><div class="p-6 border-b border-gray-50 flex items-center gap-4"><div class="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-black text-xs border border-blue-100 shrink-0">${dim}</div><div><h4 class="font-black text-gray-900">${el.name.split(':')[0]}</h4><p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${el.name.split(':').slice(1).join(':')}</p></div></div><div class="p-6 bg-gray-50/20"><div class="grid grid-cols-1 md:grid-cols-4 gap-4">${['primary', 'elementary', 'middle', 'high'].map(k => `<div class="space-y-3"><span class="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">${k}</span>${(el.progressions?.[k] || []).map(p => `<div class="p-3 bg-white rounded-xl border border-gray-100 shadow-sm"><p class="text-[11px] leading-relaxed text-gray-600 font-medium">${p.text}</p></div>`).join('') || '<p class="text-[10px] text-gray-300 italic px-1">None</p>'}</div>`).join('')}</div></div></div>`).join('')}
        </div>`;
    }
    return '';
}

export function toggleNgssMobileFilters() { const m = document.getElementById('ngssMobileFilters'); if (m) { m.classList.toggle('hidden'); m.classList.toggle('flex'); } }
export function clearAllNgssFilters() { App.ngssFilters = { dims: [], grade: 'all', search: '', progDim: 'SEP', elements: [], specificElement: null, activePeFilter: null }; renderTeacherContent(); }
export function setNgssBrowserSection(s) { App.ngssBrowserSection = s; renderTeacherContent(); }
export function setNgssFilter(k, v) { if (!App.ngssFilters) App.ngssFilters = {}; App.ngssFilters[k] = v; renderTeacherContent(); }
export function toggleNgssDimFilter(dim) { if (!App.ngssFilters) App.ngssFilters = { dims: [] }; if (!App.ngssFilters.dims) App.ngssFilters.dims = []; const idx = App.ngssFilters.dims.indexOf(dim); if (idx > -1) App.ngssFilters.dims.splice(idx, 1); else App.ngssFilters.dims.push(dim); renderTeacherContent(); }
export function filterNGSSResults() { if (!App.ngssFilters) App.ngssFilters = {}; App.ngssFilters.search = (document.getElementById('ngssSearchInput')?.value || '').trim(); renderTeacherContent(); }

export function viewPeDetails(peId) {
    const pe = ngssData.peMap.get(peId); if (!pe) return;
    const modal = document.createElement('div'); modal.className = 'fixed inset-0 z-[250] bg-black/90 flex flex-col md:items-center md:justify-center md:p-8 backdrop-blur-md'; modal.id = 'peDetailsModal';
    modal.innerHTML = `<div class="bg-white md:rounded-[3rem] shadow-2xl w-full max-w-6xl h-full md:max-h-[95vh] overflow-hidden flex flex-col"><div class="p-6 md:p-8 border-b bg-gray-50 flex items-center justify-between shrink-0"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><span class="iconify text-2xl" data-icon="mdi:file-document-outline"></span></div><div><h3 class="text-xl font-black text-gray-900">${pe.id}</h3><p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">${pe.gradeLabel}</p></div></div><button onclick="document.getElementById('peDetailsModal').remove()" class="p-2 bg-gray-100 rounded-xl"><span class="iconify text-2xl" data-icon="mdi:close"></span></button></div><div class="flex-1 overflow-y-auto p-6 md:p-10 space-y-10"><p class="text-xl font-bold text-gray-800 leading-tight text-center max-w-4xl mx-auto">${pe.description}</p><div class="grid grid-cols-1 lg:grid-cols-3 gap-0 border rounded-[2rem] overflow-hidden">${['sep', 'dci', 'ccc'].map(dim => { const colors = { sep: 'blue', dci: 'orange', ccc: 'green' }; const labels = { sep: 'Practices', dci: 'Core Ideas', ccc: 'Crosscutting' }; return `<div class="flex flex-col border-r last:border-r-0"><div class="p-4 bg-${colors[dim]}-600 text-white text-center text-[10px] font-black uppercase">${labels[dim]}</div><div class="p-6 space-y-6 bg-white flex-1">${(pe.details[dim] || []).map(item => `<div class="space-y-2"><h6 class="text-[10px] font-black text-${colors[dim]}-600 uppercase">${item.id}</h6><div class="text-[12px] text-gray-700 leading-relaxed font-medium">${processAndLinkPeText(item.text, pe.id)}</div></div>`).join('')}</div></div>`; }).join('')}</div></div><div class="p-6 border-t bg-gray-50 flex justify-end gap-3"><button onclick="document.getElementById('peDetailsModal').remove()" class="px-8 py-3 text-gray-500 font-black text-xs uppercase rounded-xl">Close</button><button onclick="window.addToPhenomenon('${pe.id}'); document.getElementById('peDetailsModal').remove()" class="px-8 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase shadow-lg">Link Standard</button></div></div>`;
    document.body.appendChild(modal);
}

export function viewElementPes(specificCode) { if (!App.ngssFilters) App.ngssFilters = {}; App.ngssFilters.specificElement = specificCode; App.ngssBrowserSection = 'pe'; renderTeacherContent(); }
export function clearNgssPeFocus() { if (App.ngssFilters) App.ngssFilters.activePeFilter = null; renderTeacherContent(); }
export function openNgssElementFilterModal() { toast('Element filters updated', 'info'); }
export function addNgssElementFilter(code) { if (!App.ngssFilters) App.ngssFilters = {}; if (!App.ngssFilters.elements) App.ngssFilters.elements = []; if (!App.ngssFilters.elements.includes(code)) App.ngssFilters.elements.push(code); renderTeacherContent(); }
export function removeNgssElementFilter(code) { if (App.ngssFilters?.elements) App.ngssFilters.elements = App.ngssFilters.elements.filter(c => c !== code); renderTeacherContent(); }
export async function addToPhenomenon(peId) { if (App.mode !== 'teacher') return; if (!App.teacherSettings.phenomenon.ngssStandards) App.teacherSettings.phenomenon.ngssStandards = []; if (!App.teacherSettings.phenomenon.ngssStandards.includes(peId)) { App.teacherSettings.phenomenon.ngssStandards.push(peId); await saveToStorage(); toast(`Linked ${peId}`, 'success'); renderTeacherContent(); } }

export function getNGSSTemplates() {
    return [
        { id: 'tpl_life', name: 'Ecosystem Dynamics', domain: 'Life Science', icon: 'mdi:leaf', color: 'green', settings: { phenomenon: { title: 'Yellowstone Wolves', description: 'Observe the ripples through the food web.', ngssStandards: ['MS-LS2-1', 'MS-LS2-3'] }, moduleAccess: { questions: true, models: true, investigation: true, analysis: true, math: false, explanations: true, argument: true, communication: true }, lessonIcons: [], lessonEmojis: [], showDefaultIcons: true, showDefaultEmojis: true } },
        { id: 'tpl_physical', name: 'Energy Transfer', domain: 'Physical Science', icon: 'mdi:flash', color: 'blue', settings: { phenomenon: { title: 'Hot Cocoa cooling', description: 'Investigate thermal energy.', ngssStandards: ['MS-PS3-3', 'MS-PS3-4'] }, moduleAccess: { questions: true, models: true, investigation: true, analysis: true, math: true, explanations: true, argument: true, communication: true }, lessonIcons: [], lessonEmojis: [], showDefaultIcons: true, showDefaultEmojis: true } },
        { id: 'tpl_earth', name: 'Plate Tectonics', domain: 'Earth Science', icon: 'mdi:earth', color: 'amber', settings: { phenomenon: { title: 'Fossils on Mountains', description: 'Seashells on Mt. Everest summit.', ngssStandards: ['MS-ESS2-1', 'MS-ESS2-2'] }, moduleAccess: { questions: true, models: true, investigation: true, analysis: true, math: false, explanations: true, argument: true, communication: true }, lessonIcons: [], lessonEmojis: [], showDefaultIcons: true, showDefaultEmojis: true } }
    ];
}
