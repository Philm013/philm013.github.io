/**
 * @file ngss.js
 * @description Logic for loading, filtering, and rendering NGSS (Next Generation Science Standards) data.
 * Optimized for mobile and faithful to official NGSS document layouts.
 */

import { App, ngssData } from './state.js';
import { toast } from '../ui/utils.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { saveToStorage } from './sync.js';

/**
 * Fetches and processes NGSS 3D elements and Performance Expectations from external JSON sources.
 */
export async function loadNGSSData() {
    try {
        const fetchJSON = async (url) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
            return await r.json();
        };

        const [elements3D, ngssK5, ngss68, ngss912] = await Promise.all([
            fetchJSON('https://philm013.github.io/JSON/ngss3DElements.json'),
            fetchJSON('https://philm013.github.io/JSON/ngssK5.json'),
            fetchJSON('https://philm013.github.io/JSON/ngss68.json'),
            fetchJSON('https://philm013.github.io/JSON/ngss912.json')
        ]);

        ngssData.raw = { elements3D, ngssK5, ngss68, ngss912 };
        const allNgssData = [...ngssK5, ...ngss68, ...ngss912];

        // 1. Process 3D Elements
        elements3D.forEach(dim => {
            (dim.elements || dim.core_ideas || []).forEach(item => {
                const name = item.name.trim();
                const parts = name.split(':');
                const code = parts[0].trim();
                if (!code) return;

                if (!ngssData.elementMap.has(code)) {
                    ngssData.elementMap.set(code, {
                        ...item,
                        code,
                        dimensionCode: dim.code,
                        dimensionName: dim.dimension
                    });
                }
                
                ngssData.nameToCodeMap.set(name, code);
                const nameOnly = parts.length > 1 ? parts.slice(1).join(':').trim() : name;
                ngssData.nameToCodeMap.set(nameOnly, code);
                ngssData.nameToCodeMap.set(code, code);

                if (item.progressions) {
                    Object.entries(item.progressions).forEach(([gradeKey, progs]) => {
                        (progs || []).forEach(prog => {
                            if (!ngssData.specificElementMap.has(prog.code)) {
                                ngssData.specificElementMap.set(prog.code, {
                                    ...prog,
                                    parentCode: code,
                                    parentName: item.name,
                                    gradeBandKey: gradeKey,
                                    relatedPes: new Set()
                                });
                            }
                            ngssData.textToSpecificCodeMap.set(prog.text.trim(), prog.code);
                        });
                    });
                }
            });
        });

        // 2. Process Performance Expectations
        allNgssData.forEach(gradeData => {
            ngssData.gradeToTopicsMap[gradeData.gradeLabel] = [];
            gradeData.topics.forEach(topic => {
                ngssData.gradeToTopicsMap[gradeData.gradeLabel].push(topic.topicTitle);
                topic.performanceExpectations.forEach(pe => {
                    const compCodes = new Set();
                    const specCodes = new Set();

                    ['sep', 'dci', 'ccc'].forEach(dimKey => {
                        (pe.details[dimKey] || []).forEach(ref => {
                            let lines = Array.isArray(ref.text) ? [...ref.text] : (typeof ref.text === 'string' ? ref.text.split('\n') : []);
                            let componentName = ref.id;

                            const isConnection = ref.id.startsWith("Connections to");
                            if (isConnection && lines.length > 0) {
                                componentName = lines.shift().trim();
                            }

                            const cleanId = componentName.replace(' (secondary)', '').trim();
                            let cCode = ngssData.nameToCodeMap.get(cleanId) || ngssData.nameToCodeMap.get(cleanId.split(':').pop().trim());
                            if (cCode) compCodes.add(cCode);

                            lines.forEach(line => {
                                if (!line.trim()) return;
                                const specCode = findBestMatchingSpecificElement(line);
                                if (specCode) {
                                    specCodes.add(specCode);
                                    const el = ngssData.specificElementMap.get(specCode);
                                    if (el) {
                                        el.relatedPes.add(pe.id);
                                        if (el.parentCode) compCodes.add(el.parentCode);
                                    }
                                }
                            });
                        });
                    });

                    ngssData.peMap.set(pe.id, {
                        ...pe,
                        gradeLabel: gradeData.gradeLabel,
                        topicTitle: topic.topicTitle,
                        associatedComponentCodes: compCodes,
                        associatedSpecificCodes: specCodes
                    });
                });
            });
        });

        const order = ['Kindergarten', 'First Grade', 'Second Grade', 'K-2 ETS', 'Third Grade', 'Fourth Grade', 'Fifth Grade', '3-5 ETS', 'Middle School', 'High School'];
        ngssData.sortedGradeLabels = [...new Set([...ngssData.peMap.values()].map(pe => pe.gradeLabel))].sort((a, b) => {
            const iA = order.indexOf(a), iB = order.indexOf(b);
            return (iA === -1 && iB === -1) ? a.localeCompare(b) : (iA === -1 ? 1 : (iB === -1 ? -1 : iA - iB));
        });

        const topics = new Set();
        allNgssData.forEach(d => d.topics.forEach(t => topics.add(t.topicTitle)));
        ngssData.allTopics = [...topics].sort();

        ngssData.loaded = true;
    } catch (e) {
        console.error('Failed to load NGSS data:', e);
        ngssData.loaded = true;
    }
}

function findBestMatchingSpecificElement(text) {
    const clean = text.trim().replace(/^[\*•]\s*/, '').replace(/\s*\([^)]*\)/g, '').trim();
    if (clean.length < 15) return null;
    if (ngssData.textToSpecificCodeMap.has(clean)) return ngssData.textToSpecificCodeMap.get(clean);
    for (const [offText, code] of ngssData.textToSpecificCodeMap.entries()) {
        if (clean.includes(offText) || offText.includes(clean)) return code;
    }
    return null;
}

/**
 * Processes text from a PE description or detail and adds links to 3D elements.
 * @param {string|string[]} text - The text to process.
 * @param {string} peId - The ID of the PE this text belongs to.
 * @returns {string} HTML with links.
 */
export function processAndLinkPeText(text, peId) {
    const pe = ngssData.peMap.get(peId);
    if (!text || !pe) return Array.isArray(text) ? text.join('<br>') : (text || '');

    const lines = Array.isArray(text) ? text : text.split('\n');

    return lines.map((line, index) => {
        const cleanLine = line.trim();
        if (!cleanLine) return '';

        let processedLine = line;
        let codeDisplay = '';

        const code = findBestMatchingSpecificElement(line);
        if (code) {
            const el = ngssData.specificElementMap.get(code);
            if (el) {
                processedLine = `<span class="clickable-element-link cursor-pointer text-blue-600 hover:underline" title="${el.text.replace(/"/g, '&quot;')}" data-pe-id="${peId}" data-component-code="${el.parentCode}" data-specific-code="${code}">${line}</span>`;
                codeDisplay = `<strong class="font-mono text-gray-400 text-[10px]">(${code})</strong> `;
            }
        }

        const hasBullet = cleanLine.startsWith('•') || cleanLine.startsWith('*') || cleanLine.startsWith('-');
        const isHeader = cleanLine.endsWith(':');
        const isSpecificItem = !!code;
        const shouldBeBullet = hasBullet || ((isSpecificItem || (lines.length > 1 && index > 0)) && !isHeader);

        let html = `${codeDisplay}${processedLine}`;
        if (shouldBeBullet && !hasBullet) html = `• ${html}`;

        return `<p class="mb-2 last:mb-0 leading-relaxed">${html}</p>`;
    }).join('');
}

/**
 * UI: Renders the NGSS Browser view for teachers.
 */
export function renderNGSSBrowser() {
    const activeSection = App.ngssBrowserSection || 'pe';
    const isMobile = window.innerWidth <= 768;
    
    return `
        <div class="max-w-full mx-auto flex flex-col h-full -m-6 bg-white overflow-hidden">
            <!-- Header -->
            <div class="bg-blue-900 text-white p-4 md:p-6 shrink-0 shadow-xl z-50">
                <div class="flex items-center justify-between gap-4 mb-4">
                    <div class="flex items-center gap-3 md:gap-6">
                        <div class="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <span class="iconify text-2xl md:text-3xl" data-icon="mdi:school"></span>
                        </div>
                        <div>
                            <h2 class="font-black text-lg md:text-2xl uppercase tracking-tighter">NGSS Navigator</h2>
                            <p class="hidden md:block text-xs text-blue-300 font-bold uppercase tracking-widest mt-1">Science Standards & 3D Elements</p>
                        </div>
                    </div>
                    
                    <div class="relative flex-1 max-w-xs hidden md:block">
                        <span class="iconify absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" data-icon="mdi:magnify"></span>
                        <input type="text" id="ngssSearchInput" placeholder="Search code or text..." 
                            value="${App.ngssFilters?.search || ''}"
                            oninput="window.filterNGSSResults()"
                            class="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm focus:bg-white focus:text-gray-900 focus:outline-none transition-all placeholder:text-blue-300">
                    </div>

                    ${isMobile ? `
                        <button onclick="window.toggleNgssMobileFilters()" class="p-2 bg-white/10 rounded-xl relative">
                            <span class="iconify text-2xl" data-icon="mdi:filter-variant"></span>
                            ${hasActiveFilters() ? '<span class="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full border-2 border-blue-900"></span>' : ''}
                        </button>
                    ` : ''}
                </div>
                
                <div class="flex items-center gap-1 bg-white/10 p-1 rounded-2xl border border-white/10 w-fit">
                    ${['pe', '3d'].map(s => `
                        <button onclick="window.setNgssBrowserSection('${s}')" 
                            class="px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeSection === s ? 'bg-white text-blue-900 shadow-xl' : 'text-blue-100 hover:bg-white/10'}">
                            ${s === 'pe' ? 'Standards' : '3D Progression'}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Mobile Search Bar -->
            ${isMobile ? `
                <div class="p-4 bg-gray-50 border-b border-gray-200 shrink-0">
                    <div class="relative w-full">
                        <span class="iconify absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" data-icon="mdi:magnify"></span>
                        <input type="text" id="ngssSearchInputMobile" placeholder="Search standard or practice..." 
                            value="${App.ngssFilters?.search || ''}"
                            oninput="window.filterNGSSResults()"
                            class="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:border-primary focus:outline-none transition-all">
                    </div>
                </div>
            ` : ''}

            <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
                <!-- Desktop Sidebar Filters -->
                <div class="hidden md:block w-72 bg-white border-r border-gray-200 overflow-y-auto p-6 space-y-8 shrink-0">
                    ${renderNGSSFilters(activeSection)}
                </div>

                <!-- Main Content Area -->
                <div id="ngssResultsArea" class="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-gray-50">
                    ${renderNGSSContent(activeSection)}
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
                <div class="flex-1 overflow-y-auto p-6 space-y-8">
                    ${renderNGSSFilters(activeSection)}
                </div>
                <div class="p-6 border-t bg-gray-50">
                    <button onclick="window.clearAllNgssFilters()" class="w-full py-4 text-red-600 font-black text-xs uppercase tracking-widest border-2 border-red-100 rounded-2xl hover:bg-red-50 mb-3">Clear All Filters</button>
                    <button onclick="window.toggleNgssMobileFilters()" class="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100">Apply Filters</button>
                </div>
            </div>
        </div>
    `;
}

function hasActiveFilters() {
    const f = App.ngssFilters;
    return f && (f.grade && f.grade !== 'all' || f.dims?.length > 0 || f.progDim || f.elements?.length > 0);
}

function renderNGSSFilters(section) {
    if (section === 'pe') {
        const activeElements = App.ngssFilters?.elements || [];
        return `
            <div>
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Grade Level</label>
                <div class="grid grid-cols-1 gap-1.5">
                    <button onclick="window.setNgssFilter('grade', 'all')" class="ngss-filter-btn px-4 py-3 rounded-xl text-left text-xs font-black uppercase tracking-widest border-2 transition-all ${!App.ngssFilters?.grade || App.ngssFilters.grade === 'all' ? 'border-primary bg-blue-50 text-primary shadow-sm' : 'border-gray-50 text-gray-400 hover:bg-gray-50'}">All Grades</button>
                    ${ngssData.sortedGradeLabels.map(g => `
                        <button onclick="window.setNgssFilter('grade', '${g}')" class="ngss-filter-btn px-4 py-3 rounded-xl text-left text-xs font-black uppercase tracking-widest border-2 transition-all ${App.ngssFilters?.grade === g ? 'border-primary bg-blue-50 text-primary shadow-sm' : 'border-gray-50 text-gray-400 hover:bg-gray-50'}">${g}</button>
                    `).join('')}
                </div>
            </div>
            <div>
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Dimension Filtering</label>
                <div class="space-y-2">
                    ${['SEP', 'DCI', 'CCC'].map(dim => {
                        const isActive = App.ngssFilters?.dims?.includes(dim);
                        return `
                            <button onclick="window.toggleNgssDimFilter('${dim}')" class="w-full px-4 py-3 rounded-xl text-left text-xs font-black uppercase tracking-widest border-2 transition-all ${isActive ? 'border-primary bg-blue-50 text-primary' : 'border-gray-50 text-gray-400'} flex items-center justify-between">
                                ${dim}
                                <span class="iconify text-lg" data-icon="${isActive ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline'}"></span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
            <div>
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Specific Element Filters</label>
                <div class="space-y-2">
                    <div id="active-element-filters" class="flex flex-wrap gap-2 mb-2">
                        ${activeElements.map(code => {
                            const el = ngssData.elementMap.get(code);
                            const name = el ? el.name.split(':')[0].trim() : code;
                            return `<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black border border-blue-200 flex items-center gap-1">${name} <button onclick="window.removeNgssElementFilter('${code}')" class="hover:text-red-500">×</button></span>`;
                        }).join('')}
                    </div>
                    <button onclick="window.openNgssElementFilterModal()" class="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-primary hover:text-primary transition-all">
                        + Add Element Filter
                    </button>
                </div>
            </div>
        `;
    } else if (section === '3d') {
        return `
            <div>
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Select Focus Dimension</label>
                <div class="grid grid-cols-1 gap-2">
                    ${['SEP', 'DCI', 'CCC'].map(dim => {
                        const isActive = (App.ngssFilters?.progDim || 'SEP') === dim;
                        return `
                            <button onclick="window.setNgssFilter('progDim', '${dim}')" class="px-4 py-4 rounded-2xl text-left text-xs font-black uppercase tracking-widest border-2 transition-all ${isActive ? 'border-primary bg-blue-50 text-primary shadow-md' : 'border-gray-50 text-gray-400 hover:bg-gray-50'} flex items-center justify-between">
                                <span>${dim === 'SEP' ? 'Practices' : (dim === 'DCI' ? 'Core Ideas' : 'Crosscutting')}</span>
                                <span class="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[8px] font-black group-hover:bg-white transition-colors">${dim}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    return '';
}

function renderNGSSContent(section) {
    if (!ngssData.loaded) return '<div class="h-full flex items-center justify-center animate-pulse text-gray-400 font-black uppercase tracking-widest">Initialising Database...</div>';

    const filters = App.ngssFilters || {};
    const searchVal = document.getElementById('ngssSearchInput')?.value || document.getElementById('ngssSearchInputMobile')?.value || '';
    const query = searchVal.toLowerCase();

    if (section === 'pe') {
        const pes = Array.from(ngssData.peMap.values()).filter(pe => {
            if (filters.grade && filters.grade !== 'all' && pe.gradeLabel !== filters.grade) return false;
            
            if (filters.dims?.length > 0) {
                const peElements = [...pe.associatedComponentCodes].map(c => ngssData.elementMap.get(c));
                const peDims = new Set(peElements.filter(Boolean).map(e => e.dimensionCode));
                if (!filters.dims.some(d => peDims.has(d))) return false;
            }

            if (filters.elements?.length > 0) {
                if (!filters.elements.every(code => pe.associatedComponentCodes.has(code))) return false;
            }
            
            if (query && !pe.id.toLowerCase().includes(query) && !pe.description.toLowerCase().includes(query)) return false;
            return true;
        });

        return `
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-black text-gray-900 tracking-tight">${pes.length} Standards Found</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Results Limit: 50</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 gap-4">
                    ${pes.slice(0, 50).map(pe => `
                        <div class="bg-white rounded-[2rem] border border-gray-200 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                            <div class="flex flex-col md:flex-row md:items-start justify-between gap-6 relative">
                                <div class="flex-1">
                                    <div class="flex flex-wrap items-center gap-2 mb-4">
                                        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black font-mono border border-blue-200 shadow-sm">${pe.id}</span>
                                        <span class="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[9px] font-black uppercase tracking-widest">${pe.gradeLabel}</span>
                                        <span class="px-3 py-1 bg-white border border-gray-100 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-widest truncate max-w-[150px]">${pe.topicTitle}</span>
                                    </div>
                                    <h4 class="text-lg md:text-xl font-bold text-gray-800 leading-snug mb-6">${pe.description}</h4>
                                    <div class="flex flex-wrap gap-2">
                                        ${[...pe.associatedComponentCodes].slice(0, 6).map(c => {
                                            const el = ngssData.elementMap.get(c);
                                            const color = el?.dimensionCode === 'SEP' ? 'blue' : (el?.dimensionCode === 'DCI' ? 'orange' : 'green');
                                            return `<span class="px-2 py-1 bg-${color}-50 text-${color}-600 rounded text-[9px] font-black border border-${color}-100 uppercase">${c}</span>`;
                                        }).join('')}
                                    </div>
                                </div>
                                <div class="shrink-0 flex flex-row md:flex-col gap-2 pt-4 md:pt-0 border-t md:border-0 border-gray-100">
                                    <button onclick="window.viewPeDetails('${pe.id}')" class="flex-1 px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-primary transition-all">Details</button>
                                    <button onclick="window.addToPhenomenon('${pe.id}')" class="flex-1 px-6 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary shadow-lg shadow-gray-200 transition-all active:scale-95">Link Standard</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${pes.length === 0 ? `
                        <div class="py-20 text-center opacity-30 grayscale">
                            <span class="iconify text-6xl mb-4 mx-auto" data-icon="mdi:shield-search"></span>
                            <p class="text-sm font-black uppercase tracking-widest">No matching standards found</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    if (section === '3d') {
        const dim = filters.progDim || 'SEP';
        const elements = Array.from(ngssData.elementMap.values()).filter(el => el.dimensionCode === dim);
        const highlightedPE = filters.activePeFilter ? ngssData.peMap.get(filters.activePeFilter) : null;
        const highlightedSpecificCodes = highlightedPE?.associatedSpecificCodes || new Set();
        const highlightedComponentCodes = highlightedPE?.associatedComponentCodes || new Set();
        
        return `
            <div class="space-y-6">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter">${dim === 'SEP' ? 'Scientific Practices' : (dim === 'DCI' ? 'Disciplinary Core Ideas' : 'Crosscutting Concepts')}</h3>
                    ${filters.activePeFilter ? `
                        <div class="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black border border-blue-200">
                            <span>Focus: ${filters.activePeFilter}</span>
                            <button onclick="window.clearNgssPeFocus()" class="hover:text-red-500">×</button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="grid grid-cols-1 gap-6">
                    ${elements.map(el => {
                        const isCompHighlighted = highlightedComponentCodes.has(el.code);
                        return `
                        <div class="bg-white rounded-[2.5rem] border ${isCompHighlighted ? 'border-blue-400 ring-4 ring-blue-50' : 'border-gray-200'} overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div class="p-6 md:p-8 bg-white border-b border-gray-100 flex items-center gap-4">
                                <div class="w-12 h-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center font-black text-sm border border-blue-100 shrink-0">
                                    ${dim}
                                </div>
                                <div>
                                    <h4 class="text-lg font-black text-gray-900">${el.name.split(':')[0]}</h4>
                                    <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">${el.name.split(':').slice(1).join(':')}</p>
                                </div>
                            </div>
                            
                            <div class="p-6 md:p-8 bg-gray-50/30">
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    ${['primary', 'elementary', 'middle', 'high'].map(k => `
                                        <div class="space-y-4">
                                            <div class="flex items-center gap-2 px-1">
                                                <div class="w-1 h-1 rounded-full bg-blue-400"></div>
                                                <span class="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">${k}</span>
                                            </div>
                                            ${(el.progressions?.[k] || []).map(p => {
                                                const isSpecHighlighted = highlightedSpecificCodes.has(p.code);
                                                return `
                                                <div class="p-4 bg-white rounded-2xl border ${isSpecHighlighted ? 'border-blue-500 shadow-md ring-2 ring-blue-50' : 'border-gray-100'} hover:border-primary/30 transition-all shadow-sm group">
                                                    <p class="text-xs leading-relaxed text-gray-600 font-medium">${p.text}</p>
                                                    <div class="mt-3 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <span class="text-[8px] font-black text-blue-600 font-mono tracking-tighter">${p.code}</span>
                                                        <button onclick="window.viewElementPes('${p.code}')" class="text-[8px] font-black text-gray-400 uppercase hover:text-primary">Related PEs</button>
                                                    </div>
                                                </div>
                                            `}).join('') || '<p class="px-4 py-2 text-[10px] text-gray-300 italic font-medium">None</p>'}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    }

    return '';
}

/**
 * UI: Toggles mobile filters.
 */
export function toggleNgssMobileFilters() {
    document.getElementById('ngssMobileFilters').classList.toggle('hidden');
    document.getElementById('ngssMobileFilters').classList.toggle('flex');
}

/**
 * UI: Clears all current NGSS filters.
 */
export function clearAllNgssFilters() {
    App.ngssFilters = { dims: [], grade: 'all', search: '', progDim: 'SEP', elements: [] };
    const input = document.getElementById('ngssSearchInput');
    const mobileInput = document.getElementById('ngssSearchInputMobile');
    if (input) input.value = '';
    if (mobileInput) mobileInput.value = '';
    renderTeacherContent();
}

/**
 * UI: Switches the active section within the browser.
 */
export function setNgssBrowserSection(section) {
    App.ngssBrowserSection = section;
    renderTeacherContent();
}

/**
 * UI: Updates a specific filter for the NGSS browser.
 */
export function setNgssFilter(key, val) {
    if (!App.ngssFilters) App.ngssFilters = {};
    App.ngssFilters[key] = val;
    renderTeacherContent();
}

/**
 * UI: Toggles a dimension filter for PE search.
 */
export function toggleNgssDimFilter(dim) {
    if (!App.ngssFilters) App.ngssFilters = { dims: [] };
    if (!App.ngssFilters.dims) App.ngssFilters.dims = [];
    
    const idx = App.ngssFilters.dims.indexOf(dim);
    if (idx > -1) App.ngssFilters.dims.splice(idx, 1);
    else App.ngssFilters.dims.push(dim);
    
    renderTeacherContent();
}

/**
 * UI: Triggers re-render on search input.
 */
export function filterNGSSResults() {
    const input = document.getElementById('ngssSearchInput');
    const mobileInput = document.getElementById('ngssSearchInputMobile');
    if (!App.ngssFilters) App.ngssFilters = {};
    App.ngssFilters.search = (input?.value || mobileInput?.value || '').trim();
    renderTeacherContent();
}

/**
 * UI: Detailed PE view based on official NGSS document structure.
 */
export function viewPeDetails(peId) {
    const pe = ngssData.peMap.get(peId);
    if (!pe) return;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[250] bg-black/90 flex flex-col md:items-center md:justify-center md:p-8 backdrop-blur-md animate-in fade-in duration-300';
    modal.id = 'peDetailsModal';
    
    modal.innerHTML = `
        <div class="bg-white md:rounded-[3rem] shadow-2xl w-full max-w-6xl h-full md:max-h-[95vh] overflow-hidden flex flex-col">
            <!-- Modal Header -->
            <div class="p-6 md:p-8 border-b bg-gray-50 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 md:w-14 md:h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                        <span class="iconify text-2xl md:text-3xl" data-icon="mdi:file-document-outline"></span>
                    </div>
                    <div>
                        <h3 class="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">${pe.id}</h3>
                        <p class="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">${pe.gradeLabel} • Performance Expectation</p>
                    </div>
                </div>
                <button onclick="document.getElementById('peDetailsModal').remove()" class="p-2 md:p-3 bg-gray-100 text-gray-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                    <span class="iconify text-2xl" data-icon="mdi:close"></span>
                </button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-12">
                <!-- Standard Description -->
                <div class="space-y-4">
                    <div class="flex items-center gap-3">
                        <div class="h-px flex-1 bg-gray-100"></div>
                        <span class="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Performance Expectation</span>
                        <div class="h-px flex-1 bg-gray-100"></div>
                    </div>
                    <p class="text-xl md:text-2xl font-bold text-gray-800 leading-tight text-center max-w-4xl mx-auto">${pe.description}</p>
                </div>

                ${pe.details?.clarificationStatement || pe.details?.assessmentBoundary ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${pe.details.clarificationStatement ? `
                            <div class="p-6 bg-amber-50 rounded-3xl border border-amber-100 relative group">
                                <span class="absolute top-4 right-6 text-[10px] font-black text-amber-200 uppercase tracking-widest">Context</span>
                                <h4 class="text-xs font-black text-amber-600 uppercase tracking-widest mb-3">Clarification Statement</h4>
                                <p class="text-sm text-amber-900 leading-relaxed font-medium italic">"${pe.details.clarificationStatement}"</p>
                            </div>
                        ` : ''}
                        ${pe.details.assessmentBoundary ? `
                            <div class="p-6 bg-gray-50 rounded-3xl border border-gray-200 relative">
                                <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Assessment Boundary</h4>
                                <p class="text-sm text-gray-600 leading-relaxed font-medium italic">"${pe.details.assessmentBoundary}"</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Three Columns (Official NGSS Style) -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-0 border-2 border-gray-100 rounded-[2.5rem] overflow-hidden bg-gray-50">
                    ${['sep', 'dci', 'ccc'].map(dim => {
                        const colorMap = { sep: 'blue', dci: 'orange', ccc: 'green' };
                        const labelMap = { sep: 'Science & Engineering Practices', dci: 'Disciplinary Core Ideas', ccc: 'Crosscutting Concepts' };
                        const color = colorMap[dim];
                        return `
                            <div class="flex flex-col border-b last:border-b-0 lg:border-b-0 lg:border-r last:border-r-0 border-gray-100">
                                <div class="p-5 bg-${color}-600 text-white text-center">
                                    <h5 class="text-[11px] font-black uppercase tracking-widest">${labelMap[dim]}</h5>
                                </div>
                                <div class="p-6 md:p-8 space-y-8 bg-white flex-1">
                                    ${(pe.details[dim] || []).map(item => `
                                        <div class="space-y-3">
                                            <h6 class="text-xs font-black text-${color}-600 uppercase tracking-tight flex items-center gap-2">
                                                <span class="w-1.5 h-1.5 rounded-full bg-${color}-500"></span>
                                                <span class="clickable-element-link cursor-pointer hover:underline" data-pe-id="${pe.id}" data-component-code="${item.id.replace(' (secondary)', '').trim()}">${item.id}</span>
                                            </h6>
                                            <div class="text-[13px] text-gray-700 leading-relaxed font-medium">
                                                ${processAndLinkPeText(item.text, pe.id)}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Evidence Statements -->
                ${pe.details?.evidenceStatements?.length ? `
                    <div class="space-y-6 pt-6">
                        <div class="flex items-center gap-4">
                            <h4 class="text-sm font-black text-gray-900 uppercase tracking-widest">Evidence Statements</h4>
                            <div class="h-px flex-1 bg-gray-100"></div>
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                            ${pe.details.evidenceStatements.map(es => `
                                <div class="p-5 bg-gray-50 rounded-2xl text-sm text-gray-600 border border-gray-100 leading-relaxed font-medium flex items-start gap-4">
                                    <span class="iconify mt-1 text-primary shrink-0" data-icon="mdi:check-circle-outline"></span>
                                    <div class="flex-1">${processAndLinkPeText(es, pe.id)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- CCSS Connections -->
                ${pe.connections ? `
                    <div class="p-8 md:p-10 bg-gray-900 text-white rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32"></div>
                        <h4 class="text-sm font-black uppercase tracking-[0.3em] mb-8 text-blue-400">Cross-Curricular Connections</h4>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div class="space-y-6">
                                <div class="flex items-center gap-3">
                                    <span class="iconify text-xl text-blue-300" data-icon="mdi:book-open-page-variant"></span>
                                    <h5 class="text-[10px] font-black uppercase tracking-widest text-gray-400">ELA / Literacy</h5>
                                </div>
                                <div class="space-y-4">
                                    ${(pe.connections.commonCoreStateStandards?.elaLiteracy || []).filter(i => i.text.includes(`(${pe.id})`)).map(i => `
                                        <div class="space-y-1">
                                            <span class="text-[10px] font-black text-blue-300 font-mono">${i.id}</span>
                                            <p class="text-xs text-gray-300 leading-relaxed">${i.text.replace(`(${pe.id})`, '').trim()}</p>
                                        </div>
                                    `).join('') || '<p class="text-xs text-gray-500 italic">None specified</p>'}
                                </div>
                            </div>
                            <div class="space-y-6">
                                <div class="flex items-center gap-3">
                                    <span class="iconify text-xl text-blue-300" data-icon="mdi:calculator-variant"></span>
                                    <h5 class="text-[10px] font-black uppercase tracking-widest text-gray-400">Mathematics</h5>
                                </div>
                                <div class="space-y-4">
                                    ${(pe.connections.commonCoreStateStandards?.mathematics || []).filter(i => i.text.includes(`(${pe.id})`)).map(i => `
                                        <div class="space-y-1">
                                            <span class="text-[10px] font-black text-blue-300 font-mono">${i.id}</span>
                                            <p class="text-xs text-gray-300 leading-relaxed">${i.text.replace(`(${pe.id})`, '').trim()}</p>
                                        </div>
                                    `).join('') || '<p class="text-xs text-gray-500 italic">None specified</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Footer Actions -->
            <div class="p-6 md:p-8 border-t bg-gray-50 flex flex-col md:flex-row justify-between gap-4 shrink-0">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center md:text-left leading-relaxed">Performace Expectations Details are pulled directly from official NGSS Lead States data.</p>
                <div class="flex gap-3">
                    <button onclick="document.getElementById('peDetailsModal').remove()" class="flex-1 md:flex-none px-10 py-4 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-200 rounded-2xl transition-all">Close</button>
                    <button onclick="window.addToPhenomenon('${pe.id}'); document.getElementById('peDetailsModal').remove()" class="flex-1 md:flex-none px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:opacity-90 transition-all active:scale-95">Link to Activity</button>
                </div>
            </div>
        </div>
    `;

    // Handle deep linking click inside the details modal
    modal.addEventListener('click', (e) => {
        const link = e.target.closest('.clickable-element-link');
        if (link) {
            const compCode = link.dataset.componentCode;
            const peId = link.dataset.peId;
            
            // Highlight in 3D explorer
            if (!App.ngssFilters) App.ngssFilters = {};
            App.ngssFilters.activePeFilter = peId;
            App.ngssFilters.progDim = compCode.startsWith('SEP') ? 'SEP' : (compCode.startsWith('CCC') ? 'CCC' : 'DCI');
            
            // Switch to 3D view
            window.setNgssBrowserSection('3d');
            
            // Close modal
            modal.remove();
            toast(`Navigated to ${compCode} in 3D Progression`, 'info');
        }
    });

    document.body.appendChild(modal);
}

/**
 * UI: Clears PE focus in 3D view.
 */
export function clearNgssPeFocus() {
    if (App.ngssFilters) App.ngssFilters.activePeFilter = null;
    renderTeacherContent();
}

/**
 * UI: Opens the element filter modal.
 */
export function openNgssElementFilterModal() {
    const modal = document.getElementById('element-filter-modal');
    const container = document.getElementById('element-filter-choices');
    if (!modal || !container) return;

    let html = '';
    ngssData.elements3D?.dimensions?.forEach(d => {
        html += `<div class="mb-6"><h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">${d.dimension}</h4>`;
        const items = d.elements || [];
        html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">`;
        items.forEach(i => {
            const code = i.id || i.name.split(':')[0].trim();
            html += `<button onclick="window.addNgssElementFilter('${code}')" class="text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-all">
                <span class="text-blue-600 font-mono mr-2">${code}</span>
                ${i.name.split(':').pop().trim()}
            </button>`;
        });
        html += `</div></div>`;
    });

    container.innerHTML = html;
    modal.classList.remove('hidden');
    modal.classList.add('is-visible', 'flex');
}

/**
 * UI: Adds a specific element filter.
 */
export function addNgssElementFilter(code) {
    if (!App.ngssFilters) App.ngssFilters = {};
    if (!App.ngssFilters.elements) App.ngssFilters.elements = [];
    if (!App.ngssFilters.elements.includes(code)) {
        App.ngssFilters.elements.push(code);
    }
    document.getElementById('element-filter-modal').classList.add('hidden');
    document.getElementById('element-filter-modal').classList.remove('is-visible', 'flex');
    renderTeacherContent();
}

/**
 * UI: Removes a specific element filter.
 */
export function removeNgssElementFilter(code) {
    if (App.ngssFilters?.elements) {
        App.ngssFilters.elements = App.ngssFilters.elements.filter(c => c !== code);
    }
    renderTeacherContent();
}

/**
 * Adds a Performance Expectation ID to the class phenomenon's linked standards.
 */
export async function addToPhenomenon(peId) {
    if (App.mode !== 'teacher') return;
    if (!App.teacherSettings.phenomenon.ngssStandards) App.teacherSettings.phenomenon.ngssStandards = [];
    if (!App.teacherSettings.phenomenon.ngssStandards.includes(peId)) {
        App.teacherSettings.phenomenon.ngssStandards.push(peId);
        await saveToStorage();
        toast(`Linked ${peId} to lesson`, 'success');
        renderTeacherContent();
    } else {
        toast('Already linked', 'info');
    }
}

/**
 * Returns a set of curated lesson templates for different science domains.
 */
export function getNGSSTemplates() {
    return [
        {
            id: 'tpl_life',
            name: 'Life Science: Ecosystem Dynamics',
            domain: 'Life Science',
            icon: 'mdi:leaf',
            color: 'green',
            settings: {
                phenomenon: {
                    title: 'The Disappearing Wolves of Yellowstone',
                    description: 'How does the reintroduction of a single predator species change an entire ecosystem? Observe the ripples through the food web.',
                    ngssStandards: ['MS-LS2-1', 'MS-LS2-3']
                },
                moduleAccess: {
                    questions: true, models: true, investigation: true, analysis: true, math: false, explanations: true, argument: true, communication: true
                }
            }
        },
        {
            id: 'tpl_physical',
            name: 'Physical Science: Energy Transfer',
            domain: 'Physical Science',
            icon: 'mdi:flash',
            color: 'blue',
            settings: {
                phenomenon: {
                    title: 'The Hot Cocoa Cooling Mystery',
                    description: 'Why does a ceramic mug keep cocoa warm longer than a plastic cup? Investigate thermal energy and material properties.',
                    ngssStandards: ['MS-PS3-3', 'MS-PS3-4']
                },
                moduleAccess: {
                    questions: true, models: true, investigation: true, analysis: true, math: true, explanations: true, argument: true, communication: true
                }
            }
        },
        {
            id: 'tpl_earth',
            name: 'Earth & Space: Plate Tectonics',
            domain: 'Earth Science',
            icon: 'mdi:earth',
            color: 'amber',
            settings: {
                phenomenon: {
                    title: 'Fossils on Mountain Tops',
                    description: 'How did seashells end up on the summit of Mt. Everest? Explore the movement of Earth\'s crust over millions of years.',
                    ngssStandards: ['MS-ESS2-1', 'MS-ESS2-2']
                },
                moduleAccess: {
                    questions: true, models: true, investigation: true, analysis: true, math: false, explanations: true, argument: true, communication: true
                }
            }
        }
    ];
}
