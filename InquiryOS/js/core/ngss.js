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
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-black text-gray-900">NGSS Navigator</h2>
                    <p class="text-gray-500 mt-1">Explore Standards, Practices, and Concepts to link with your lesson.</p>
                </div>
                <div id="ngssSearch" class="relative max-w-sm w-full">
                    <span class="iconify absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" data-icon="mdi:magnify"></span>
                    <input type="text" placeholder="Search standards, IDs, or topics..." 
                        oninput="window.filterNGSS(this.value)"
                        class="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-2xl text-lg font-medium focus:border-primary focus:outline-none transition-all shadow-sm">
                </div>
            </div>
            
            <div class="flex flex-col lg:flex-row gap-8">
                <!-- Sidebar: Dimensions -->
                <div class="lg:w-1/4 space-y-3" data-card-title="Dimensions">
                    <button onclick="window.showNGSSSection('sep')" class="ngss-dim-btn w-full p-5 rounded-3xl text-left transition-all bg-blue-50 border-2 border-blue-100 text-blue-700 shadow-sm" data-section="sep">
                        <div class="flex items-center gap-4">
                            <span class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">SEP</span>
                            <div>
                                <p class="font-black leading-tight">Practices</p>
                                <p class="text-[10px] opacity-70 uppercase font-black tracking-widest mt-0.5">Scientific Actions</p>
                            </div>
                        </div>
                    </button>
                    <button onclick="window.showNGSSSection('ccc')" class="ngss-dim-btn w-full p-5 rounded-3xl text-left transition-all bg-white border-2 border-transparent text-gray-500 hover:bg-gray-50 shadow-sm" data-section="ccc">
                        <div class="flex items-center gap-4">
                            <span class="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg">CCC</span>
                            <div>
                                <p class="font-black leading-tight">Crosscutting</p>
                                <p class="text-[10px] opacity-70 uppercase font-black tracking-widest mt-0.5">Big Concepts</p>
                            </div>
                        </div>
                    </button>
                    <button onclick="window.showNGSSSection('dci')" class="ngss-dim-btn w-full p-5 rounded-3xl text-left transition-all bg-white border-2 border-transparent text-gray-500 hover:bg-gray-50 shadow-sm" data-section="dci">
                        <div class="flex items-center gap-4">
                            <span class="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center font-black text-lg">DCI</span>
                            <div>
                                <p class="font-black leading-tight">Core Ideas</p>
                                <p class="text-[10px] opacity-70 uppercase font-black tracking-widest mt-0.5">Content Knowledge</p>
                            </div>
                        </div>
                    </button>
                    
                    <div class="pt-6 border-t border-gray-100 mt-6 space-y-2">
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Performance Expectations</p>
                        ${['K-5', '6-8', '9-12'].map(lvl => `
                            <button onclick="window.showNGSSSection('${lvl}')" class="ngss-dim-btn w-full px-6 py-4 rounded-2xl text-left text-sm font-black text-gray-600 border-2 border-transparent hover:bg-gray-50 transition-all flex items-center justify-between group" data-section="${lvl}">
                                <span>Grades ${lvl}</span>
                                <span class="iconify opacity-0 group-hover:opacity-100 transition-opacity" data-icon="mdi:chevron-right"></span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="lg:w-3/4 bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 md:p-10 min-h-[700px]" data-card-title="Details">
                    <div id="ngssContent" class="animate-in fade-in duration-500">
                        ${renderNGSSSection('sep')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * UI: Switches the active NGSS section and updates styles.
 */
export function showNGSSSection(section) {
    document.querySelectorAll('.ngss-dim-btn').forEach(btn => {
        const isSelected = btn.dataset.section === section;
        const colorMap = { sep: 'blue', ccc: 'amber', dci: 'green' };
        const colorClass = colorMap[section] || 'primary';
        
        if (isSelected) {
            btn.className = `ngss-dim-btn w-full p-5 rounded-3xl text-left transition-all bg-${colorClass === 'primary' ? 'primary' : colorClass + '-50'} border-2 border-${colorClass === 'primary' ? 'primary' : colorClass + '-100'} ${colorClass === 'primary' ? 'text-white' : 'text-' + colorClass + '-700'} shadow-md`;
        } else {
            btn.className = 'ngss-dim-btn w-full p-5 rounded-3xl text-left transition-all bg-white border-2 border-transparent text-gray-500 hover:bg-gray-50 shadow-sm';
        }
    });
    
    const content = document.getElementById('ngssContent');
    if (content) content.innerHTML = renderNGSSSection(section);
}

/**
 * UI: Filters the currently active NGSS section.
 */
export function filterNGSS(query) {
    const activeBtn = document.querySelector('.ngss-dim-btn[class*="bg-"][class*="-50"], .ngss-dim-btn[class*="bg-primary"]');
    const activeSection = activeBtn?.dataset.section || 'sep';
    const content = document.getElementById('ngssContent');
    if (content) content.innerHTML = renderNGSSSection(activeSection, query);
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
        },
        {
            id: 'tpl_chemistry',
            name: 'Chemistry: Chemical Reactions',
            domain: 'Chemistry',
            icon: 'mdi:flask-round-bottom',
            color: 'purple',
            settings: {
                phenomenon: {
                    title: 'The Self-Inflating Balloon',
                    description: 'When we mix baking soda and vinegar, the balloon inflates on its own. What is creating the gas, and where did it come from?',
                    ngssStandards: ['MS-PS1-2', 'MS-PS1-5']
                },
                moduleAccess: {
                    questions: true, models: true, investigation: true, analysis: true, math: true, explanations: true, argument: true, communication: true
                }
            }
        },
        {
            id: 'tpl_engineering',
            name: 'Engineering: Design & Optimization',
            domain: 'Engineering',
            icon: 'mdi:cog',
            color: 'gray',
            settings: {
                phenomenon: {
                    title: 'The Egg Drop Challenge',
                    description: 'Design a structure that prevents an egg from breaking when dropped from 5 meters. Optimize for weight and cost.',
                    ngssStandards: ['MS-ETS1-1', 'MS-ETS1-4']
                },
                moduleAccess: {
                    questions: true, models: true, investigation: true, analysis: true, math: true, explanations: true, argument: true, communication: true
                }
            }
        }
    ];
}
