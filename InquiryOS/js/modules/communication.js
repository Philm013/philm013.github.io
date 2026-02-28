/**
 * @file communication.js
 * @description Logic for the SEP8 module: Obtaining, Evaluating, and Communicating Information. 
 * Implements the final scientific poster view and auto-fill logic from previous modules.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

export function renderCommunicationModule() {
    return `
        <div class="panels-container">
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Poster Builder">
                <div class="p-2 md:p-0">
                    ${renderModuleHeader('Communicating Information', 'mdi:share-variant', 'SEP8', `
                        <button onclick="window.autoFillPoster()" class="p-2 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase hover:bg-amber-100 transition-all flex items-center gap-1" title="Auto-fill from Work">
                            <span class="iconify" data-icon="mdi:auto-fix"></span>
                            <span class="hidden sm:inline">Auto-fill</span>
                        </button>
                    `, 'Scientists share their work with others using research posters. Use "Auto-fill Work" to bring in your findings from other sections, then polish your conclusion!')}
                </div>

                <div class="hidden md:flex p-6 border-b items-center justify-between">
                    <h3 class="font-semibold text-gray-900">Poster Builder</h3>
                    <button onclick="window.autoFillPoster()" class="px-3 py-1 bg-amber-50 text-amber-600 rounded text-sm font-bold">Auto-fill Work</button>
                </div>

                <div class="panel-content space-y-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${renderPosterField('Research Title', 'posterTitle', 'Study name...', App.work.poster.title)}
                        ${renderPosterField('Authors', 'posterAuthors', 'Who is this by?', App.work.poster.authors || App.user.name)}
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${renderPosterTextArea('Introduction', 'posterIntro', 'Phenomenon & Question...', App.work.poster.intro)}
                        ${renderPosterTextArea('Methodology', 'posterMethods', 'How did you investigate?', App.work.poster.methods)}
                        ${renderPosterTextArea('Results', 'posterResults', 'What did the data show?', App.work.poster.results)}
                        ${renderPosterTextArea('Conclusion', 'posterConclusion', 'Final claim & reasoning...', App.work.poster.conclusion)}
                    </div>
                    <div class="pt-6">
                        <button onclick="window.exportToPDF()" class="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
                            <span class="iconify text-xl" data-icon="mdi:file-pdf-box"></span>
                            Export Final Poster
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPosterField(label, id, placeholder, value) { return `<div class="space-y-2"><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">${label}</label><input type="text" id="${id}" class="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-bold text-gray-800 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-200" placeholder="${placeholder}" value="${value || ''}" oninput="window.updatePoster()"></div>`; }
function renderPosterTextArea(label, id, placeholder, value) { return `<div class="space-y-2"><label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">${label}</label><textarea id="${id}" rows="5" class="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-700 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-200 leading-relaxed" placeholder="${placeholder}" oninput="window.updatePoster()">${value || ''}</textarea></div>`; }
export async function updatePoster() { App.work.poster = { title: document.getElementById('posterTitle')?.value || '', authors: document.getElementById('posterAuthors')?.value || '', intro: document.getElementById('posterIntro')?.value || '', methods: document.getElementById('posterMethods')?.value || '', results: document.getElementById('posterResults')?.value || '', conclusion: document.getElementById('posterConclusion')?.value || '' }; await saveAndBroadcast('poster', App.work.poster); }
export async function autoFillPoster() {
    const title = document.getElementById('posterTitle'), intro = document.getElementById('posterIntro'), results = document.getElementById('posterResults'), conclusion = document.getElementById('posterConclusion');
    if (title) title.value = App.work.mainQuestion || App.teacherSettings.phenomenon.title;
    if (intro) intro.value = App.teacherSettings.phenomenon.description;
    if (results) results.value = App.work.evidenceText || '';
    if (conclusion) conclusion.value = App.work.claim || '';
    await updatePoster(); toast('Poster auto-filled!', 'success');
}
