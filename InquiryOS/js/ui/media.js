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
let currentSearchResults = [];
let resultsShownCount = 0;
const RESULTS_BATCH_SIZE = 24;

export function openMediaPicker() {
    const modal = document.getElementById('mediaPickerModal');
    const backdrop = modal?.querySelector('.modal-backdrop');
    const drawer = modal?.querySelector('.modal-bottom-drawer');
    const resultsArea = document.getElementById('mediaResults');
    
    if (modal && backdrop && drawer) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Force reflow for transitions
        void modal.offsetWidth;
        
        backdrop.classList.add('is-visible');
        drawer.classList.add('is-visible');
        
        window.setMediaType('image');

        // Add scroll listener for lazy loading
        if (resultsArea) {
            resultsArea.onscroll = () => {
                const threshold = 100;
                if (resultsArea.scrollTop + resultsArea.clientHeight >= resultsArea.scrollHeight - threshold) {
                    loadMoreResults();
                }
            };
        }
    }
}

export function closeMediaPicker() {
    const modal = document.getElementById('mediaPickerModal');
    const backdrop = modal?.querySelector('.modal-backdrop');
    const drawer = modal?.querySelector('.modal-bottom-drawer');
    
    if (modal && backdrop && drawer) {
        backdrop.classList.remove('is-visible');
        drawer.classList.remove('is-visible');
        
        // Wait for animation to finish before hiding
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 400);
    }
}

export function setMediaType(type) {
    currentMediaType = type;
    document.querySelectorAll('.media-tab').forEach(btn => {
        const isActive = btn.id === `mediaTab_${type}`;
        btn.classList.toggle('bg-white', isActive);
        btn.classList.toggle('shadow-sm', isActive);
        btn.classList.toggle('text-primary', isActive);
        btn.classList.toggle('border', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
    });

    // Reset results count
    resultsShownCount = 0;
    currentSearchResults = [];
    
    window.searchMedia();
}

export async function searchMedia() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        await executeSearch();
    }, 300);
}

async function executeSearch() {
    const queryInput = document.getElementById('mediaSearchInput');
    const query = queryInput?.value.trim();
    
    // Update active filter button styling
    document.querySelectorAll('.slim-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase() === query?.toLowerCase());
    });

    const resultsContainer = document.getElementById('mediaResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<div class="col-span-full py-20 text-center animate-pulse"><p class="font-black uppercase tracking-widest text-gray-400">Searching...</p></div>';

    try {
        if (currentMediaType === 'image') {
            await searchUnsplash(query || 'science');
        } else if (currentMediaType === 'video') {
            await searchPexels(query || 'science');
        } else if (currentMediaType === 'sim') {
            await searchSimsLocal(query);
        } else if (currentMediaType === 'data') {
            await searchDataLocal(query);
        }
        
        // Proactive check: if container isn't full enough to scroll, load more
        checkAndLoadMore();
    } catch (e) {
        console.error(e);
        resultsContainer.innerHTML = `<div class="col-span-full py-20 text-center text-red-500"><p class="font-black">API Error</p><p class="text-xs">${e.message}</p></div>`;
    }
}

/**
 * Checks if the results area is scrollable. If not, and there are more results, loads the next batch.
 */
function checkAndLoadMore() {
    const container = document.getElementById('mediaResults');
    if (!container) return;

    // Small delay to allow layout/rendering to settle
    setTimeout(() => {
        if (container.scrollHeight <= container.clientHeight + 50) {
            if (resultsShownCount < currentSearchResults.length) {
                loadMoreResults();
                // Check again after loading more
                checkAndLoadMore();
            }
        }
    }, 100);
}

async function searchSimsLocal(query) {
    if (typeof window.searchSimulations !== 'function') {
        throw new Error('Simulation library not loaded');
    }
    
    // Simulations already has a local dataset
    const results = window.searchSimulations(query);
    currentSearchResults = results;
    renderMediaResults(results.slice(0, RESULTS_BATCH_SIZE));
    resultsShownCount = Math.min(results.length, RESULTS_BATCH_SIZE);
}

async function searchDataLocal(query) {
    if (typeof window.searchSimulations !== 'function') {
        throw new Error('Simulation library not loaded');
    }
    
    // Simulations library now includes CODAP data as 'data' type
    const results = window.searchSimulations(query, 'data');
    currentSearchResults = results;
    renderMediaResults(results.slice(0, RESULTS_BATCH_SIZE));
    resultsShownCount = Math.min(results.length, RESULTS_BATCH_SIZE);
}

async function searchUnsplash(query) {
    const key = App.teacherSettings.keys?.unsplash;
    if (!key) {
        renderMediaResults([]);
        toast('Please add an Unsplash API Key in Settings', 'warning');
        return;
    }

    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=50&client_id=${key}`);
    if (!res.ok) throw new Error('Unsplash API error');
    const data = await res.json();
    
    const results = data.results.map(img => ({
        id: img.id,
        type: 'image',
        thumb: img.urls.small,
        url: img.urls.regular,
        provider: 'Unsplash',
        author: img.user.name,
        title: img.alt_description || img.description || 'Scientific Image'
    }));

    currentSearchResults = results;
    renderMediaResults(results.slice(0, RESULTS_BATCH_SIZE));
    resultsShownCount = Math.min(results.length, RESULTS_BATCH_SIZE);
}

async function searchPexels(query) {
    const key = App.teacherSettings.keys?.pexels;
    if (!key) {
        renderMediaResults([]);
        toast('Please add a Pexels API Key in Settings', 'warning');
        return;
    }

    const videoRes = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=50`, {
        headers: { Authorization: key }
    });
    if (!videoRes.ok) throw new Error('Pexels API error');
    const videoData = await videoRes.json();

    const results = videoData.videos.map(vid => ({
        id: vid.id,
        type: 'video',
        thumb: vid.image,
        url: vid.video_files.find(f => f.quality === 'hd')?.link || vid.video_files[0].link,
        provider: 'Pexels',
        author: vid.user.name,
        title: 'Scientific Video'
    }));

    currentSearchResults = results;
    renderMediaResults(results.slice(0, RESULTS_BATCH_SIZE));
    resultsShownCount = Math.min(results.length, RESULTS_BATCH_SIZE);
}

function loadMoreResults() {
    if (resultsShownCount >= currentSearchResults.length) return;
    
    const nextBatch = currentSearchResults.slice(resultsShownCount, resultsShownCount + RESULTS_BATCH_SIZE);
    resultsShownCount += nextBatch.length;
    
    const container = document.getElementById('mediaResults');
    if (container) {
        const html = nextBatch.map(item => renderItemCard(item)).join('');
        container.insertAdjacentHTML('beforeend', html);
    }
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

    container.innerHTML = items.map(item => renderItemCard(item)).join('');
}

function renderItemCard(item) {
    if (!item.id) item.id = 'temp_' + Math.random().toString(36).substr(2, 9);
    const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
    
    const isSim = item.type === 'sim';
    const isData = item.type === 'data';
    
    let thumbUrl = item.thumb;
    if (!thumbUrl) {
        if (isSim) thumbUrl = 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/application-brackets-outline.svg';
        else if (isData) thumbUrl = 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/database.svg';
        else thumbUrl = 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/image-off-outline.svg';
    }

    return `
        <div class="media-card group relative flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
            <div class="img-container cursor-pointer bg-gray-50 flex items-center justify-center relative overflow-hidden min-h-[140px] md:min-h-[180px]" onclick="window.previewMediaItem(${itemJson})">
                <img src="${thumbUrl}" 
                    onerror="this.src='https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/image-off-outline.svg'; this.style.opacity='0.2';"
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    loading="lazy">
                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div class="bg-white/90 backdrop-blur-md text-primary px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl scale-75 group-hover:scale-100 transition-all">
                        Preview
                    </div>
                </div>
            </div>
            <div class="p-3 md:p-4 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[7px] md:text-[8px] font-black text-primary uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">${item.provider}</span>
                    <span class="iconify text-gray-300 text-sm" data-icon="${item.type === 'video' ? 'mdi:play-circle' : (item.type === 'sim' ? 'mdi:application-brackets' : (item.type === 'data' ? 'mdi:database' : 'mdi:image'))}"></span>
                </div>
                <p class="text-[10px] md:text-xs font-bold text-gray-800 line-clamp-2 leading-tight mb-2" title="${item.title || ''}">${item.title || 'Untitled Artifact'}</p>
                <div class="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
                    <p class="text-[7px] text-gray-400 truncate max-w-[60px] md:max-w-[100px]">By ${item.author || item.provider}</p>
                    <button onclick="window.addMediaToPhenomenon(${itemJson})" 
                        class="px-2 md:px-3 py-1 bg-gray-900 text-white rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-md active:scale-95">
                        Add
                    </button>
                </div>
            </div>
        </div>
    `;
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
        mediaHtml = `<img src="${item.url}" class="max-w-full max-h-full object-contain shadow-2xl" loading="lazy">`;
    } else if (item.type === 'video') {
        mediaHtml = `<video src="${item.url}" controls autoplay class="max-w-full max-h-full shadow-2xl"></video>`;
    } else if (item.type === 'sim' || item.type === 'data') {
        mediaHtml = `
            <div class="w-full h-full flex flex-col items-center justify-center p-4">
                <iframe src="${item.url}" class="w-full h-full bg-white md:rounded-3xl border-0 shadow-2xl" allowfullscreen loading="lazy"></iframe>
            </div>
        `;
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
    if (!App.teacherSettings.phenomenon) App.teacherSettings.phenomenon = {};
    if (!App.teacherSettings.phenomenon.media) App.teacherSettings.phenomenon.media = [];
    
    // Prevent duplicates
    if (App.teacherSettings.phenomenon.media.find(m => m.id === item.id)) {
        toast('Already added', 'warning');
        return;
    }

    App.teacherSettings.phenomenon.media.push(item);
    await saveAndBroadcast('teacherSettings.phenomenon.media', App.teacherSettings.phenomenon.media);
    toast(`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} added!`, 'success');
    
    const { renderTeacherContent } = await import('../ui/renderer.js');
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
