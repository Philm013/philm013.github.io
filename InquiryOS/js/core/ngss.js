/**
 * @file ngss.js
 * @description Logic for loading, filtering, and rendering NGSS (Next Generation Science Standards) data.
 */

import { App, ngssData } from './state.js';
import { saveToStorage } from './sync.js';
import { toast } from '../ui/utils.js';
import { renderTeacherContent } from '../ui/renderer.js';

/**
 * Fetches and processes NGSS 3D elements and Performance Expectations from external JSON sources.
 * @returns {Promise<void>}
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

        // Process and normalize 3D elements (SEP, CCC, DCI)
        const processedDimensions = (Array.isArray(elements3D) ? elements3D : []).map(dim => {
            const items = dim.elements || dim.core_ideas || dim.coreIdeas || [];
            return {
                ...dim,
                elements: items.map(item => {
                    let id = item.id || item.code;
                    if (!id && item.name && item.name.includes(':')) {
                        id = item.name.split(':')[0].trim();
                    }
                    
                    let description = item.description;
                    if (!description && item.components) {
                        description = item.components.map(c => c.name).join(', ');
                    }

                    return {
                        id: id || 'NGSS',
                        name: item.name || 'Untitled Element',
                        description: description || 'Core element of the NGSS framework.'
                    };
                })
            };
        });

        const dciElements = processedDimensions
            .filter(d => d.code && d.code.startsWith('DCI'))
            .flatMap(d => d.elements || []);
            
        ngssData.elements3D = {
            dimensions: [
                ...processedDimensions.filter(d => d.code && !d.code.startsWith('DCI')),
                {
                    code: 'DCI',
                    name: 'Disciplinary Core Ideas',
                    elements: dciElements
                }
            ]
        };

        const flattenPEs = (data) => {
            if (!Array.isArray(data)) return [];
            return data.flatMap(grade => 
                (grade.topics || []).flatMap(topic => 
                    (topic.performanceExpectations || []).map(pe => ({
                        ...pe,
                        title: pe.title || pe.name || pe.id,
                        description: pe.description || pe.expectation || pe.details?.description || ''
                    }))
                )
            );
        };

        ngssData.pes = {
            'K-5': flattenPEs(ngssK5),
            '6-8': flattenPEs(ngss68),
            '9-12': flattenPEs(ngss912)
        };

        ngssData.loaded = true;
    } catch (e) {
        console.error('Failed to load NGSS data:', e);
        // Fallback to minimal offline data
        ngssData.elements3D = { 
            dimensions: [
                { 
                    code: 'SEP', 
                    name: 'Science & Engineering Practices', 
                    elements: [
                        { id: 'SEP1', name: 'Asking Questions and Defining Problems', description: 'Asking questions and defining problems in K–2 builds on prior experiences and progresses to simple descriptive questions.' },
                        { id: 'SEP2', name: 'Developing and Using Models', description: 'Modeling in K–2 builds on prior experiences and progresses to include using and developing models.' }
                    ]
                }
            ] 
        };
        ngssData.pes = { 'K-5': [], '6-8': [], '9-12': [] };
        ngssData.loaded = true;
    }
}

/**
 * UI: Renders the NGSS Browser view for teachers.
 * @returns {string} HTML content for the browser.
 */
export function renderNGSSBrowser() {
    return `
        <div class="max-w-6xl mx-auto">
            <div class="mb-6 flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-black text-gray-900">NGSS Navigator</h2>
                    <p class="text-gray-500">Explore Standards, Practices, and Concepts</p>
                </div>
                <div id="ngssSearch" class="relative max-w-xs w-full">
                    <span class="iconify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" data-icon="mdi:magnify"></span>
                    <input type="text" placeholder="Search standards..." 
                        oninput="window.filterNGSS(this.value)"
                        class="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-100 rounded-xl focus:border-primary focus:outline-none transition-all">
                </div>
            </div>
            
            <div class="flex flex-col lg:flex-row gap-6">
                <!-- Sidebar: Dimensions -->
                <div class="lg:w-1/4 space-y-2">
                    <button onclick="window.showNGSSSection('sep')" class="ngss-dim-btn w-full p-4 rounded-2xl text-left transition-all bg-blue-50 border-2 border-blue-100 text-blue-700" data-section="sep">
                        <div class="flex items-center gap-3">
                            <span class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">SEP</span>
                            <div>
                                <p class="font-bold leading-tight">Practices</p>
                                <p class="text-[10px] opacity-70 uppercase tracking-wider">8 Elements</p>
                            </div>
                        </div>
                    </button>
                    <!-- ... other buttons ... -->
                    <div class="pt-4 border-t border-gray-100 mt-4">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Performance Expectations</p>
                        <button onclick="window.showNGSSSection('K-5')" class="ngss-dim-btn w-full px-4 py-3 rounded-xl text-left text-sm font-bold text-gray-600 hover:bg-gray-50 mb-1" data-section="K-5">Grades K-5</button>
                        <!-- ... other grade levels ... -->
                    </div>
                </div>
                
                <div class="lg:w-3/4 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[600px]">
                    <div id="ngssContent" class="animate-in fade-in duration-300">
                        ${renderNGSSSection('sep')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * UI: Renders a specific section of standards based on dimension or grade level.
 * @param {string} section - 'sep' | 'ccc' | 'dci' | 'K-5' | '6-8' | '9-12'
 * @param {string} [filter=''] - Search query filter.
 * @returns {string} HTML content.
 */
export function renderNGSSSection(section, filter = '') {
    if (!ngssData.loaded) return '<div class="flex items-center justify-center h-64"><span class="iconify animate-spin text-4xl text-primary" data-icon="mdi:loading"></span></div>';
    
    let html = '';
    const query = (filter || '').toLowerCase();

    if (['SEP', 'CCC', 'DCI'].includes(section.toUpperCase())) {
        const dimension = ngssData.elements3D?.dimensions?.find(d => d.code === section.toUpperCase());
        if (!dimension) return '<p class="p-8 text-center text-gray-400">Dimension data not found.</p>';
        
        const filtered = dimension.elements.filter(el => 
            (el.id || '').toLowerCase().includes(query) || 
            (el.name || '').toLowerCase().includes(query) || 
            (el.description || '').toLowerCase().includes(query)
        );

        html = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${filtered.map(el => `
                    <div class="p-5 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-primary/20 transition-all">
                        <div class="flex items-center gap-3 mb-3">
                            <span class="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                section === 'sep' ? 'bg-blue-600 text-white' : (section === 'ccc' ? 'bg-amber-500 text-white' : 'bg-green-600 text-white')
                            }">${el.id}</span>
                            <h4 class="font-bold text-gray-900">${el.name}</h4>
                        </div>
                        <p class="text-sm text-gray-600 leading-relaxed">${el.description || 'Core element of the NGSS framework.'}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        const pes = ngssData.pes[section] || [];
        const filtered = pes.filter(pe => 
            (pe.id || '').toLowerCase().includes(query) || 
            (pe.title || pe.name || '').toLowerCase().includes(query) || 
            (pe.description || pe.expectation || '').toLowerCase().includes(query)
        );

        html = `
            <div class="space-y-4">
                ${filtered.map(pe => `
                    <div class="group p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-primary/30 transition-all shadow-sm">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                                <span class="text-[10px] font-black text-primary uppercase tracking-widest">${pe.id}</span>
                                <h4 class="text-lg font-extrabold text-gray-900">${pe.title || pe.name}</h4>
                            </div>
                            <button onclick="window.addToPhenomenon('${pe.id}')" class="shrink-0 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all">
                                Link to Activity
                            </button>
                        </div>
                        <p class="text-sm text-gray-600 mb-6 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">${pe.description || pe.expectation}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    return html || '<p class="p-12 text-center text-gray-400">No matching standards found.</p>';
}

/**
 * Adds a Performance Expectation ID to the class phenomenon's linked standards.
 * @param {string} peId - The PE ID (e.g., 'MS-LS1-1').
 */
export function addToPhenomenon(peId) {
    if (App.mode !== 'teacher') return;
    
    if (!App.teacherSettings.phenomenon.ngssStandards.includes(peId)) {
        App.teacherSettings.phenomenon.ngssStandards.push(peId);
        saveToStorage();
        toast(`Linked ${peId} to lesson`, 'success');
        renderTeacherContent();
    } else {
        toast('Already linked', 'info');
    }
}
