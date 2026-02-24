/**
 * @file media.js
 * @description Logic for the Media Picker (Unsplash, Pexels, Sims) for Phenomenon enrichment.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { toast } from './utils.js';

let currentMediaType = 'image';

export function openMediaPicker() {
    const modal = document.getElementById('mediaPickerModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        window.setMediaType('sim');
        window.searchMedia();
        
        // Add enter key listener to search input
        const searchInput = document.getElementById('mediaSearchInput');
        if (searchInput && !searchInput.dataset.listenerAdded) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') window.searchMedia();
            });
            searchInput.dataset.listenerAdded = 'true';
        }
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
    
    // Auto-search when switching tabs
    window.searchMedia();
}

export async function searchMedia() {
    let query = document.getElementById('mediaSearchInput')?.value.trim();
    
    // Default to 'science' if query is empty for images/videos
    if (!query && currentMediaType !== 'sim') {
        query = 'science';
    }

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
    modal.className = 'fixed inset-0 z-[200] bg-black/95 flex flex-col animate-in fade-in duration-300';
    
    let mediaHtml = '';
    if (item.type === 'image') {
        mediaHtml = `<img src="${item.url}" class="max-w-full max-h-full object-contain shadow-2xl">`;
    } else if (item.type === 'video') {
        mediaHtml = `<video src="${item.url}" controls autoplay class="max-w-full max-h-full shadow-2xl"></video>`;
    } else if (item.type === 'sim') {
        mediaHtml = `<iframe src="${item.url}" class="w-full h-full bg-white md:rounded-3xl border-0 shadow-2xl" allowfullscreen></iframe>`;
    }

    modal.innerHTML = `
        <div class="flex items-center justify-between p-6 text-white bg-black/40 backdrop-blur-md shrink-0">
            <div>
                <h3 class="font-black uppercase tracking-widest text-sm">${item.type}: ${item.provider}</h3>
                <p class="text-[10px] text-white/60 font-bold uppercase mt-0.5">${item.title || 'Reference Material'}</p>
            </div>
            <button onclick="window.closeMediaDetail()" class="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                <span class="iconify text-2xl" data-icon="mdi:close"></span>
            </button>
        </div>
        <div class="flex-1 flex items-center justify-center p-0 md:p-12 overflow-hidden bg-black/50">
            <div class="w-full h-full flex items-center justify-center">
                ${mediaHtml}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

export function closeMediaDetail() {
    document.getElementById('mediaDetailModal')?.remove();
}
