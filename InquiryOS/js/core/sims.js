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
                sims.push({
                    id: 'codap_' + doc.title.replace(/\s+/g, '_'),
                    title: doc.title,
                    description: doc.description,
                    url: `https://codap.concord.org/releases/latest/static/dg/en/cert/index.html?url=https://philm013.github.io/InquiryOS/${doc.path}`,
                    thumb: doc.image_path ? (doc.image_path.startsWith('.') ? `./JSON/${doc.image_path.substring(2)}` : doc.image_path) : './resources/images/codap_logo.png',
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
                sims.push({
                    id: 'concord_' + item.title.replace(/\s+/g, '_'),
                    title: item.title,
                    description: item.subtitle || (Array.isArray(item.about) ? item.about.join(' ') : item.about),
                    url: `https://lab.concord.org/embeddable.html#${item.path}`,
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
                project.simulations.forEach(sim => {
                    const locale = sim.localizedSimulations?.en || Object.values(sim.localizedSimulations || {})[0];
                    if (locale) {
                        sims.push({
                            id: 'phet_' + locale.title.replace(/\s+/g, '_'),
                            title: locale.title,
                            description: project.name.replace(/-/g, ' '),
                            url: `https://phet.colorado.edu/sims/html/${project.name}/latest/${project.name}_all.html`,
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
                        sims.push({
                            id: 'concord_mat_' + mat.id,
                            title: mat.name,
                            description: mat.short_description || mat.long_description || '',
                            url: mat.icon?.url ? mat.icon.url.replace('thumbnail.jpeg', '') : '', // Best guess for activity URL if not provided
                            thumb: mat.icon?.url || 'https://has-production.s3.amazonaws.com/resources/concord_logo.png',
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
    const q = query.toLowerCase();
    const cat = category.toLowerCase();

    return App.simulations.filter(s => {
        const matchesQuery = !q || 
            s.title.toLowerCase().includes(q) || 
            s.description.toLowerCase().includes(q) || 
            s.tags.some(t => t.toLowerCase().includes(q)) ||
            s.provider.toLowerCase().includes(q);
        
        const matchesCategory = !cat || 
            s.categories.some(c => c.toLowerCase().includes(cat)) ||
            s.provider.toLowerCase().includes(cat);

        return matchesQuery && matchesCategory;
    });
}
