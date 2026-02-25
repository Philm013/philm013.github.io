/**
 * @file sims.js
 * @description Logic for loading, parsing and searching scientific simulations from JSON sources.
 */

import { App } from './state.js';

/**
 * Loads all scientific simulation data from local JSON files.
 */
export async function loadSimulationsData() {
    try {
        const fetchJSON = async (url) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
            return await r.json();
        };

        const [codap, interactives, search, phet] = await Promise.all([
            fetchJSON('./JSON/CONCORD_CODAP_DATA.json'),
            fetchJSON('./JSON/Concord_Interactives.json'),
            fetchJSON('./JSON/FULL_CONCORD_SEARCH.json'),
            fetchJSON('./JSON/PHET_simulations.json')
        ]);

        const sims = [];

        // 1. Process CODAP Data
        if (codap.sample_docs) {
            codap.sample_docs.forEach(doc => {
                const cats = Array.isArray(doc.categories) ? doc.categories : (doc.categories ? [doc.categories] : []);
                // Process thumb: append image_path (relative to codap-data/) to the base URL
                let thumbUrl = './resources/images/codap_logo.png';
                if (doc.image_path) {
                    const cleanImagePath = doc.image_path.startsWith('./') ? doc.image_path.substring(2) : doc.image_path;
                    thumbUrl = `https://concord-consortium.github.io/codap-data/${cleanImagePath}`;
                }

                sims.push({
                    id: 'codap_' + doc.title.replace(/\s+/g, '_'),
                    title: doc.title,
                    description: doc.description,
                    // Pattern: codap-data/ + path
                    url: `https://codap.concord.org/releases/latest/static/dg/en/cert/index.html?url=https://concord-consortium.github.io/codap-data/${doc.path}`,
                    thumb: thumbUrl,
                    provider: 'Concord CODAP',
                    tags: doc.tag || [],
                    categories: cats,
                    type: 'sim'
                });
            });
        }

        // 2. Process Concord Interactives
        if (interactives.interactives) {
            interactives.interactives.forEach(item => {
                const title = item.title || 'Untitled Concord';
                sims.push({
                    id: 'concord_' + title.replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 5),
                    title: title,
                    description: item.subtitle || (Array.isArray(item.about) ? item.about.join(' ') : item.about) || '',
                    // Pattern: #path
                    url: `https://lab.concord.org/embeddable.html#${item.path || ''}`,
                    thumb: item.screenshot || 'https://lab.concord.org/favicon.ico',
                    provider: 'Concord Lab',
                    tags: [item.category, item.subCategory].filter(Boolean),
                    categories: [item.category].filter(Boolean),
                    type: 'sim'
                });
            });
        }

        // 3. Process PhET Simulations
        if (phet.projects) {
            phet.projects.forEach(project => {
                if (!project.name) return;
                project.simulations.forEach(sim => {
                    const locale = sim.localizedSimulations?.en || Object.values(sim.localizedSimulations || {})[0];
                    if (locale && locale.title) {
                        // Remove html/ from name if present
                        const cleanName = project.name.replace(/^html\//, '');
                        sims.push({
                            id: 'phet_' + locale.title.replace(/\s+/g, '_') + '_' + project.name,
                            title: locale.title,
                            description: project.name.replace(/-/g, ' '),
                            // Pattern: simulations/ + cleanName
                            url: `https://phet.colorado.edu/en/simulations/${cleanName}`,
                            thumb: `https://phet.colorado.edu/sims/html/${project.name}/latest/${project.name}-600.png`,
                            provider: 'PhET Interactive Simulations',
                            tags: ['PhET', project.name],
                            categories: ['Science', 'Math'],
                            type: 'sim'
                        });
                    }
                });
            });
        }

        // 4. Process Full Concord Search
        if (search.results) {
            search.results.forEach(res => {
                if (res.materials) {
                    res.materials.forEach(mat => {
                        const iconUrl = mat.icon?.url || '';
                        // Pattern: eresources/{id}.run_resource_html
                        const runUrl = mat.id ? `https://learn.concord.org/eresources/${mat.id}.run_resource_html` : '';
                        
                        sims.push({
                            id: 'concord_mat_' + (mat.id || Math.random().toString(36).substr(2, 9)),
                            title: mat.name || 'Concord Activity',
                            description: mat.short_description || mat.long_description || '',
                            url: runUrl, 
                            thumb: iconUrl || 'https://has-production.s3.amazonaws.com/resources/concord_logo.png',
                            provider: 'Concord Consortium',
                            tags: [...(mat.subject_areas || []), ...(mat.grade_levels || [])],
                            categories: mat.subject_areas || [],
                            type: 'sim'
                        });
                    });
                }
            });
        }

        App.simulations = sims;
        console.log(`Loaded ${sims.length} simulations from JSON sources.`);
    } catch (e) {
        console.error('Failed to load simulations data:', e);
        // Fallback to minimal hardcoded list if fetch fails
        App.simulations = [
            { id: 'phet_energy', title: 'Energy Skate Park', url: 'https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_all.html', thumb: 'https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park-600.png', provider: 'PhET', type: 'sim' }
        ];
    }
}

/**
 * Searches the loaded simulations library.
 * @param {string} query - Search keyword.
 * @param {string} category - Category filter.
 * @returns {Array} Filtered list of simulations.
 */
export function searchSimulations(query = '', category = '') {
    const q = (query || '').toLowerCase();
    const cat = (category || '').toLowerCase();

    return App.simulations.filter(s => {
        if (!s) return false;
        
        const title = (s.title || '').toLowerCase();
        const description = (s.description || '').toLowerCase();
        const provider = (s.provider || '').toLowerCase();
        const tags = Array.isArray(s.tags) ? s.tags : [];
        const categories = Array.isArray(s.categories) ? s.categories : [];

        const matchesQuery = !q || 
            title.includes(q) || 
            description.includes(q) || 
            tags.some(t => t && String(t).toLowerCase().includes(q)) ||
            provider.includes(q);
        
        const matchesCategory = !cat || 
            categories.some(c => c && String(c).toLowerCase().includes(cat)) ||
            provider.includes(cat);

        return matchesQuery && matchesCategory;
    });
}
