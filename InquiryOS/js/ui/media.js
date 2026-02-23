/**
 * @file media.js
 * @description Logic for the Media Picker (Unsplash, Pexels, Sims) for Phenomenon enrichment.
 */

import { App } from '../core/state.js';
import { saveToStorage, saveAndBroadcast } from '../core/sync.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { toast } from './utils.js';

let currentMediaType = 'image';

export function openMediaPicker() {
    const modal = document.getElementById('mediaPickerModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        window.setMediaType('image');
    }
}

export function closeMediaPicker() {
    const modal = document.getElementById('mediaPickerModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

export function setMediaType(type) {
    currentMediaType = type;
    document.querySelectorAll('.media-tab').forEach(btn => {
        const isActive = btn.id === `mediaTab_${type}`;
        btn.className = `media-tab px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            isActive ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:bg-white/50'
        }`;
    });

    const simPanel = document.getElementById('simInputPanel');
    if (simPanel) simPanel.classList.toggle('hidden', type !== 'sim');
}

export async function searchMedia() {
    const query = document.getElementById('mediaSearchInput')?.value.trim();
    if (!query && currentMediaType !== 'sim') return;

    const resultsContainer = document.getElementById('mediaResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<div class="col-span-full py-20 text-center animate-pulse"><p class="font-black uppercase tracking-widest text-gray-400">Searching...</p></div>';

    try {
        if (currentMediaType === 'image') {
            await searchUnsplash(query);
        } else if (currentMediaType === 'video') {
            await searchPexels(query);
        } else if (currentMediaType === 'sim') {
            await searchSims(query);
        }
    } catch (e) {
        console.error(e);
        resultsContainer.innerHTML = `<div class="col-span-full py-20 text-center text-red-500"><p class="font-black">API Error</p><p class="text-xs">${e.message}</p></div>`;
    }
}

async function searchSims(query) {
    // PhET doesn't have a CORS-friendly search API, so we use a curated list of popular sims
    const phetSims = [
        { id: 'phet_energy', title: 'Energy Skate Park', url: 'https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_all.html', thumb: 'https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park-600.png' },
        { id: 'phet_natural_sel', title: 'Natural Selection', url: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_all.html', thumb: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection-600.png' },
        { id: 'phet_forces', title: 'Forces and Motion', url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_all.html', thumb: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics-600.png' },
        { id: 'phet_ph', title: 'pH Scale', url: 'https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale_all.html', thumb: 'https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale-600.png' },
        { id: 'phet_circuit', title: 'Circuit Construction', url: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html', thumb: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc-600.png' },
        { id: 'phet_states', title: 'States of Matter', url: 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_all.html', thumb: 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter-600.png' },
        { id: 'phet_gene', title: 'Gene Expression', url: 'https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_all.html', thumb: 'https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials-600.png' },
        { id: 'phet_gravity', title: 'Gravity and Orbits', url: 'https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_all.html', thumb: 'https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits-600.png' }
    ];

    const results = phetSims.filter(s => !query || s.title.toLowerCase().includes(query.toLowerCase())).map(s => ({
        id: s.id,
        type: 'sim',
        thumb: s.thumb,
        url: s.url,
        provider: 'PhET Interactive Simulations',
        author: 'University of Colorado Boulder',
        title: s.title
    }));

    renderMediaResults(results);
}

async function searchUnsplash(query) {
    const key = App.teacherSettings.keys?.unsplash;
    if (!key) throw new Error('No Unsplash Key');

    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=${key}`);
    const data = await res.json();
    renderMediaResults(data.results.map(img => ({
        id: img.id,
        type: 'image',
        thumb: img.urls.small,
        url: img.urls.regular,
        provider: 'Unsplash',
        author: img.user.name
    })));
}

async function searchPexels(query) {
    const key = App.teacherSettings.keys?.pexels;
    if (!key) throw new Error('No Pexels Key');

    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20`, {
        headers: { Authorization: key }
    });
    const data = await res.json();
    renderMediaResults(data.videos.map(vid => ({
        id: vid.id,
        type: 'video',
        thumb: vid.image,
        url: vid.video_files[0].link,
        provider: 'Pexels',
        author: vid.user.name
    })));
}

function renderMediaResults(items) {
    const container = document.getElementById('mediaResults');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '<div class="col-span-full py-20 text-center opacity-30"><p class="font-black uppercase tracking-widest">No results found</p></div>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div onclick="window.addMediaToPhenomenon(${JSON.stringify(item).replace(/"/g, '&quot;')})" 
            class="group relative aspect-square bg-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-primary transition-all shadow-sm">
            <img src="${item.thumb}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <p class="text-[10px] font-bold text-white uppercase tracking-widest">${item.provider}</p>
                ${item.title ? `<p class="text-xs font-black text-white mt-1 line-clamp-1">${item.title}</p>` : ''}
            </div>
            ${item.type === 'video' ? '<div class="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-lg"><span class="iconify" data-icon="mdi:play-circle"></span></div>' : ''}
            ${item.type === 'sim' ? '<div class="absolute top-2 right-2 bg-primary text-white p-1 rounded-lg shadow-lg"><span class="iconify" data-icon="mdi:application-brackets"></span></div>' : ''}
        </div>
    `).join('');
}

export async function addMediaToPhenomenon(item) {
    if (!App.teacherSettings.phenomenon.media) App.teacherSettings.phenomenon.media = [];
    
    // Prevent duplicates
    if (App.teacherSettings.phenomenon.media.find(m => m.id === item.id)) {
        toast('Already added', 'warning');
        return;
    }

    App.teacherSettings.phenomenon.media.push(item);
    await saveAndBroadcast('teacherSettings.phenomenon.media', App.teacherSettings.phenomenon.media);
    toast(`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} added!`, 'success');
    renderTeacherContent();
}

export async function removeMediaFromPhenomenon(id) {
    App.teacherSettings.phenomenon.media = App.teacherSettings.phenomenon.media.filter(m => m.id !== id);
    await saveAndBroadcast('teacherSettings.phenomenon.media', App.teacherSettings.phenomenon.media);
    renderTeacherContent();
}

export function addSimMedia() {
    const url = document.getElementById('simUrlInput')?.value.trim();
    if (!url) return;

    const item = {
        id: 'sim_' + Date.now(),
        type: 'sim',
        thumb: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/application-brackets-outline.svg',
        url: url,
        provider: 'Custom Sim',
        author: 'User'
    };

    window.addMediaToPhenomenon(item);
    if (document.getElementById('simUrlInput')) document.getElementById('simUrlInput').value = '';
}

export function viewMediaDetail(id) {
    const item = App.teacherSettings.phenomenon.media.find(m => m.id === id);
    if (!item) return;

    const modal = document.createElement('div');
    modal.id = 'mediaDetailModal';
    modal.className = 'fixed inset-0 z-[200] bg-black/95 flex flex-col animate-in fade-in duration-300 backdrop-blur-3xl';
    
    let mediaHtml = '';
    if (item.type === 'image') {
        mediaHtml = `<img src="${item.url}" class="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-500">`;
    } else if (item.type === 'video') {
        mediaHtml = `<video src="${item.url}" controls autoplay class="max-w-full max-h-full shadow-2xl animate-in zoom-in-95 duration-500"></video>`;
    } else if (item.type === 'sim') {
        mediaHtml = `<iframe src="${item.url}" class="w-full h-full bg-white rounded-3xl" allowfullscreen></iframe>`;
    }

    modal.innerHTML = `
        <div class="flex items-center justify-between p-6 text-white bg-black/40 backdrop-blur-md border-b border-white/10">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <span class="iconify text-xl" data-icon="${item.type === 'video' ? 'mdi:play-circle' : (item.type === 'sim' ? 'mdi:application-brackets' : 'mdi:image')}"></span>
                </div>
                <div>
                    <h3 class="font-black uppercase tracking-widest text-sm">${item.type}: ${item.provider}</h3>
                    <p class="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">Scientific Resource</p>
                </div>
            </div>
            <button onclick="window.closeMediaDetail()" class="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95">
                <span class="iconify text-2xl" data-icon="mdi:close"></span>
            </button>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden relative">
            ${mediaHtml}
        </div>
        <div class="p-6 bg-black/40 backdrop-blur-md border-t border-white/10 text-center">
            <p class="text-white/80 text-xs font-medium italic">"${item.title || 'Observational Data'}"</p>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Opens the Phenomenon in a full-screen detail panel.
 */
export function viewPhenomenonDetail() {
    const p = App.teacherSettings.phenomenon;
    const modal = document.createElement('div');
    modal.id = 'phenomenonDetailModal';
    modal.className = 'fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-bottom duration-500';
    
    modal.innerHTML = `
        <div class="flex items-center justify-between p-6 border-b bg-amber-50/50 shrink-0">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                    <span class="iconify text-2xl" data-icon="mdi:eye"></span>
                </div>
                <div>
                    <h3 class="text-xl font-black text-gray-900 tracking-tight">Phenomenon</h3>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scientific Observation</p>
                </div>
            </div>
            <button onclick="window.closePhenomenonDetail()" class="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                <span class="iconify text-2xl" data-icon="mdi:close"></span>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            <div class="space-y-4">
                <h2 class="text-3xl font-black text-gray-900 leading-tight">${p.title || 'Exploring the Phenomenon'}</h2>
                <div class="h-1.5 w-24 bg-amber-500 rounded-full"></div>
                <p class="text-lg text-gray-600 leading-relaxed font-medium">${p.description || 'Observe the provided scientific phenomenon and document your initial thoughts.'}</p>
            </div>

            ${p.media?.length > 0 ? `
                <div class="space-y-4">
                    <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Evidence Library</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        ${p.media.map(m => `
                            <button onclick="window.viewMediaDetail('${m.id}')" 
                                class="group relative aspect-video rounded-3xl overflow-hidden border-2 border-gray-100 shadow-md hover:ring-4 hover:ring-amber-400 transition-all flex-shrink-0">
                                <img src="${m.thumb}" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                    <span class="iconify text-white text-3xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" data-icon="mdi:magnify-plus"></span>
                                </div>
                                <div class="absolute bottom-3 right-3">
                                    <span class="iconify text-white text-xl" data-icon="${m.type === 'video' ? 'mdi:play-circle' : (m.type === 'sim' ? 'mdi:application-brackets' : 'mdi:image')}"></span>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                <h4 class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Your Scientific Task</h4>
                <p class="text-sm text-blue-800 font-bold leading-relaxed">Document your observations, ask questions, and develop a model that explains the mechanisms behind this phenomenon.</p>
            </div>
        </div>
        <div class="p-6 bg-gray-50 border-t flex justify-center shrink-0">
            <button onclick="window.closePhenomenonDetail()" class="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                Got it
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

export function closePhenomenonDetail() {
    document.getElementById('phenomenonDetailModal')?.remove();
}

export function closeMediaDetail() {
    document.getElementById('mediaDetailModal')?.remove();
}
