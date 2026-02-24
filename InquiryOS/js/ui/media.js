/**
 * @file media.js
 * @description Logic for the Media Picker (Unsplash, Pexels, Sims) for Phenomenon enrichment.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { toast } from './utils.js';

let currentMediaType = 'image';
let searchDebounceTimer = null;

export function openMediaPicker() {
    const modal = document.getElementById('mediaPickerModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        window.setMediaType('sim');
        window.searchMedia();
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
    
    window.searchMedia();
}

export async function searchMedia() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        await executeSearch();
    }, 300);
}

async function executeSearch() {
    const query = document.getElementById('mediaSearchInput')?.value.trim();
    const category = document.getElementById('mediaCategorySelect')?.value || '';
    
    // Default to 'science' if query is empty for images/videos
    if (!query && !category && currentMediaType !== 'sim') {
        await searchUnsplash('science');
        return;
    }

    const resultsContainer = document.getElementById('mediaResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<div class="col-span-full py-20 text-center animate-pulse"><p class="font-black uppercase tracking-widest text-gray-400">Searching...</p></div>';

    try {
        if (currentMediaType === 'image') {
            await searchUnsplash(query || category || 'science');
        } else if (currentMediaType === 'video') {
            await searchPexels(query || category || 'science');
        } else if (currentMediaType === 'sim') {
            await searchSimsLocal(query, category);
        }
    } catch (e) {
        console.error(e);
        resultsContainer.innerHTML = `<div class="col-span-full py-20 text-center text-red-500"><p class="font-black">API Error</p><p class="text-xs">${e.message}</p></div>`;
    }
}

async function searchSimsLocal(query, category) {
    if (typeof window.searchSimulations !== 'function') {
        throw new Error('Simulation library not loaded');
    }
    
    const results = window.searchSimulations(query, category);
    renderMediaResults(results);
}

async function searchUnsplash(query) {
    const key = App.teacherSettings.keys?.unsplash;
    if (!key) {
        renderMediaResults([]);
        toast('Please add an Unsplash API Key in Settings', 'warning');
        return;
    }

    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&client_id=${key}`);
    if (!res.ok) throw new Error('Unsplash API error');
    const data = await res.json();
    renderMediaResults(data.results.map(img => ({
        id: img.id,
        type: 'image',
        thumb: img.urls.small,
        url: img.urls.regular,
        provider: 'Unsplash',
        author: img.user.name,
        title: img.alt_description || img.description || 'Scientific Image'
    })));
}

async function searchPexels(query) {
    const key = App.teacherSettings.keys?.pexels;
    if (!key) {
        renderMediaResults([]);
        toast('Please add a Pexels API Key in Settings', 'warning');
        return;
    }

    // Pexels v1 search returns photos by default, for videos use /videos/search
    const videoRes = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=30`, {
        headers: { Authorization: key }
    });
    if (!videoRes.ok) throw new Error('Pexels API error');
    const videoData = await videoRes.json();

    renderMediaResults(videoData.videos.map(vid => ({
        id: vid.id,
        type: 'video',
        thumb: vid.image,
        url: vid.video_files.find(f => f.quality === 'hd')?.link || vid.video_files[0].link,
        provider: 'Pexels',
        author: vid.user.name,
        title: 'Scientific Video'
    })));
}

function renderMediaResults(items) {
    const container = document.getElementById('mediaResults');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-20 text-center opacity-30">
                <span class="iconify text-6xl mx-auto mb-4" data-icon="mdi:image-off-outline"></span>
                <p class="font-black uppercase tracking-widest">No results found</p>
                <p class="text-xs mt-2">Try a different keyword or category</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        // Create a unique temporary ID if none exists for detail viewing
        if (!item.id) item.id = 'temp_' + Math.random().toString(36).substr(2, 9);
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        
        return `
            <div class="media-card group relative flex flex-col">
                <div class="img-container cursor-pointer" onclick="window.previewMediaItem(${itemJson})">
                    <img src="${item.thumb}" loading="lazy">
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div class="bg-white/90 backdrop-blur-md text-primary px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl scale-75 group-hover:scale-100 transition-all">
                            Preview
                        </div>
                    </div>
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[8px] font-black text-primary uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">${item.provider}</span>
                        <span class="iconify text-gray-300" data-icon="${item.type === 'video' ? 'mdi:play-circle' : (item.type === 'sim' ? 'mdi:application-brackets' : 'mdi:image')}"></span>
                    </div>
                    <p class="text-xs font-bold text-gray-800 line-clamp-2 leading-snug mb-2" title="${item.title || ''}">${item.title || 'Untitled Artifact'}</p>
                    <div class="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
                        <p class="text-[8px] text-gray-400 truncate max-w-[100px]">By ${item.author || item.provider}</p>
                        <button onclick="window.addMediaToPhenomenon(${itemJson})" 
                            class="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95">
                            Add Artifact
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export function viewMediaDetail(idOrItem) {
    let item;
    if (typeof idOrItem === 'string') {
        item = App.teacherSettings.phenomenon.media?.find(m => m.id === idOrItem);
    } else {
        item = idOrItem;
    }
    
    if (!item) return;

    const modal = document.createElement('div');
    modal.id = 'mediaDetailModal';
    modal.className = 'fixed inset-0 z-[250] bg-black/95 flex flex-col animate-in fade-in duration-300';
    
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
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <span class="iconify text-xl" data-icon="${item.type === 'video' ? 'mdi:play-circle' : (item.type === 'sim' ? 'mdi:application-brackets' : 'mdi:image')}"></span>
                </div>
                <div>
                    <h3 class="font-black uppercase tracking-widest text-sm">${item.provider} ${item.type}</h3>
                    <p class="text-[10px] text-white/60 font-bold uppercase mt-0.5">${item.title || 'Scientific Artifact'}</p>
                </div>
            </div>
            <button onclick="window.closeMediaDetail()" class="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                <span class="iconify text-2xl" data-icon="mdi:close"></span>
            </button>
        </div>
        <div class="flex-1 flex items-center justify-center p-0 md:p-12 overflow-hidden bg-black/20">
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

export function applyQuickFilter(query) {
    const input = document.getElementById('mediaSearchInput');
    if (input) {
        input.value = query;
        window.searchMedia();
    }
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

/**
 * Previews a media item from the picker without adding it.
 */
export function previewMediaItem(item) {
    window.viewMediaDetail(item);
}
