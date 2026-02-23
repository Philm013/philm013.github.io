/**
 * @file communication.js
 * @description Logic for the SEP8 module: Obtaining, Evaluating, and Communicating Information. 
 * Implements the final scientific poster view and auto-fill logic from previous modules.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

/**
 * Renders the Communication Practice module (Scientific Poster).
 * @returns {string} HTML content for the module.
 */
export function renderCommunicationModule() {
    return `
        <div class="max-w-4xl mx-auto">
            ${renderModuleHeader('Communicating Information', 'mdi:share-variant', 'SEP8')}
            
            <div class="bg-white rounded-xl shadow-sm border p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Scientific Poster</h3>
                
                <div class="grid md:grid-cols-2 gap-4 mb-6">
                    ${renderPosterField('Title', 'posterTitle', 'Your research title', App.work.poster.title)}
                    ${renderPosterField('Authors', 'posterAuthors', 'List of authors', App.work.poster.authors || App.user.name)}
                </div>
                
                <div class="grid md:grid-cols-2 gap-4 mb-6">
                    ${renderPosterTextArea('Introduction', 'posterIntro', 'Background and question', App.work.poster.intro)}
                    ${renderPosterTextArea('Methods', 'posterMethods', 'How you investigated', App.work.poster.methods)}
                    ${renderPosterTextArea('Results', 'posterResults', 'What you found', App.work.poster.results)}
                    ${renderPosterTextArea('Conclusion', 'posterConclusion', 'What it means', App.work.poster.conclusion)}
                </div>
                
                <button onclick="window.autoFillPoster()" class="mb-6 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2">
                    <span class="iconify" data-icon="mdi:auto-fix"></span>
                    Auto-fill from my work
                </button>
            </div>
        </div>
    `;
}

/**
 * Renders a single-line input field for the scientific poster.
 * @param {string} label - Field label.
 * @param {string} id - Element ID.
 * @param {string} placeholder - Input placeholder.
 * @param {string} value - Current value.
 * @returns {string} HTML content.
 */
function renderPosterField(label, id, placeholder, value) {
    return `
        <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">${label}</label>
            <input type="text" id="${id}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" 
                placeholder="${placeholder}" value="${value || ''}" oninput="window.updatePoster()">
        </div>
    `;
}

/**
 * Renders a multi-line textarea for the scientific poster.
 * @param {string} label - Field label.
 * @param {string} id - Element ID.
 * @param {string} placeholder - Textarea placeholder.
 * @param {string} value - Current value.
 * @returns {string} HTML content.
 */
function renderPosterTextArea(label, id, placeholder, value) {
    return `
        <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">${label}</label>
            <textarea id="${id}" rows="3" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" 
                placeholder="${placeholder}" oninput="window.updatePoster()">${value || ''}</textarea>
        </div>
    `;
}

/**
 * Syncs the scientific poster input fields to the application state and broadcasts changes.
 */
export async function updatePoster() {
    App.work.poster = {
        title: document.getElementById('posterTitle')?.value || '',
        authors: document.getElementById('posterAuthors')?.value || '',
        intro: document.getElementById('posterIntro')?.value || '',
        methods: document.getElementById('posterMethods')?.value || '',
        results: document.getElementById('posterResults')?.value || '',
        conclusion: document.getElementById('posterConclusion')?.value || ''
    };
    await saveAndBroadcast('poster', App.work.poster);
}

/**
 * Automatically populates poster sections using data collected in previous modules (Questions, Analysis, CER).
 */
export async function autoFillPoster() {
    const title = document.getElementById('posterTitle');
    const intro = document.getElementById('posterIntro');
    const results = document.getElementById('posterResults');
    const conclusion = document.getElementById('posterConclusion');

    if (title) title.value = App.work.mainQuestion || App.teacherSettings.phenomenon.title;
    if (intro) intro.value = App.teacherSettings.phenomenon.description;
    if (results) results.value = App.work.evidenceText || '';
    if (conclusion) conclusion.value = App.work.claim || '';
    
    await updatePoster();
    toast('Poster auto-filled with your previous work!', 'success');
}
