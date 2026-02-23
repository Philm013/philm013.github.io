/**
 * @file communication.js
 * @description Logic for the SEP8 module: Obtaining, Evaluating, and Communicating Information. 
 * Implements the final scientific poster view and auto-fill logic from previous modules.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderModuleHeader, renderSectionHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

/**
 * Renders the Communication Practice module (Scientific Poster).
 * @returns {string} HTML content for the module.
 */
export function renderCommunicationModule() {
    return `
        <div class="max-w-6xl mx-auto">
            ${renderModuleHeader('Communicating Information', 'mdi:share-variant', 'SEP8')}
            
            <div class="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div class="p-8 md:p-10 border-b border-gray-50 bg-gray-50/30">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            ${renderSectionHeader('Scientific Research Poster', 'mdi:share-variant', 'blue')}
                            <p class="text-sm text-gray-500 -mt-4 ml-14">Summarize your investigation and findings for the community.</p>
                        </div>
                        <button onclick="window.autoFillPoster()" class="px-6 py-4 bg-amber-50 text-amber-600 rounded-2xl font-black hover:bg-amber-100 transition-all flex items-center justify-center gap-2 border border-amber-100 shadow-sm text-xs uppercase tracking-widest mb-6">
                            <span class="iconify text-xl" data-icon="mdi:auto-fix"></span>
                            Auto-fill My Work
                        </button>
                    </div>
                </div>
                
                <div class="p-6 md:p-10 space-y-10 bg-white">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        ${renderPosterField('Research Title', 'posterTitle', 'The overarching name of your study', App.work.poster.title)}
                        ${renderPosterField('Lead Investigators', 'posterAuthors', 'Who performed this research?', App.work.poster.authors || App.user.name)}
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        ${renderPosterTextArea('Introduction & Background', 'posterIntro', 'What is the phenomenon and what question are you asking?', App.work.poster.intro)}
                        ${renderPosterTextArea('Methodology', 'posterMethods', 'How did you investigate the problem?', App.work.poster.methods)}
                        ${renderPosterTextArea('Results & Findings', 'posterResults', 'What data did you collect and what did it show?', App.work.poster.results)}
                        ${renderPosterTextArea('Conclusion', 'posterConclusion', 'What is your final claim and reasoning?', App.work.poster.conclusion)}
                    </div>
                </div>
                
                <div class="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p class="text-xs text-gray-400 font-medium">Your poster is automatically saved as you type and can be exported as a PDF.</p>
                    <div class="flex gap-3">
                        <button onclick="window.exportToPDF()" class="px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all flex items-center gap-2">
                            <span class="iconify" data-icon="mdi:file-pdf-box"></span>
                            Export Poster
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPosterField(label, id, placeholder, value) {
    return `
        <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">${label}</label>
            <input type="text" id="${id}" class="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-bold text-gray-800 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-200" 
                placeholder="${placeholder}" value="${value || ''}" oninput="window.updatePoster()">
        </div>
    `;
}

function renderPosterTextArea(label, id, placeholder, value) {
    return `
        <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">${label}</label>
            <textarea id="${id}" rows="5" class="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-700 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-200 leading-relaxed" 
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
