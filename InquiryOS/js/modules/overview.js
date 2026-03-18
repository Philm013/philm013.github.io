/**
 * @file overview.js
 * @description Logic for the Student Overview module. 
 * Provides a high-level summary of the investigation, progress, and quick links.
 */

import { App } from '../core/state.js';
import { calculateStudentProgress, renderInfoTip } from '../ui/utils.js';
import { renderModuleHeader } from '../ui/renderer.js';

/**
 * Renders the Student Overview module.
 * @returns {string} HTML content for the module.
 */
export function renderOverviewModule() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        return renderOverviewDesktop();
    }

    const p = App.teacherSettings.phenomenon;
    const progress = calculateStudentProgress(App.work);
    
    return `
        <div class="panels-container h-full">
            <!-- Phenomenon Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="The Mystery">
                <div class="p-2 md:p-0">
                    ${renderModuleHeader('Research Overview', 'mdi:view-dashboard', '', '', 'This is your scientific mission control. Monitor your progress and review the mystery you are investigating.')}
                </div>
                <div class="panel-content space-y-6">
                    <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p class="text-base md:text-xl text-gray-800 leading-relaxed font-medium italic">"${p.description || 'Observe and document your thoughts.'}"</p>
                    </div>
                    
                    ${p.media?.length > 0 ? `
                        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            ${p.media.map(m => `
                                <div class="w-40 aspect-video bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                                    <img src="${m.thumb}" class="w-full h-full object-cover">
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${App.work.mainQuestion ? `
                        <div class="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                            <label class="text-[9px] font-black text-purple-500 uppercase tracking-widest block mb-1">Driving Question</label>
                            <p class="text-lg font-black text-gray-900 leading-tight">${App.work.mainQuestion}</p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Scientific Story Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Scientific Story">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 shrink-0 border border-blue-100">
                            <span class="iconify" data-icon="mdi:book-open-page-variant"></span>
                        </div>
                        <h3>Scientific Story</h3>
                        ${renderInfoTip('Your investigation is a journey. This section summarizes your current progress and identifies key milestones in your scientific inquiry.')}
                    </div>
                </div>
                <div class="panel-content space-y-6">
                    <div class="space-y-6 flex-1">
                        ${renderStoryStep('Modeling Status', App.work.modelNodes?.length > 0 ? `Identified <strong>${App.work.modelNodes.length}</strong> components.` : 'Not started.', App.work.modelNodes?.length > 0, 'mdi:cube-outline', 'blue')}
                        ${renderStoryStep('Claim & Evidence', App.work.claim ? `Current claim: <span class="italic">"${App.work.claim}"</span>` : 'Gathering evidence...', !!App.work.claim, 'mdi:lightbulb-on', 'green')}
                        ${renderStoryStep('Evidence Bank', App.work.evidence?.length > 0 ? `Archived <strong>${App.work.evidence.length}</strong> items.` : 'Bank is empty.', App.work.evidence?.length > 0, 'mdi:folder-star', 'amber')}
                    </div>
                    
                    <div class="pt-6 border-t border-gray-50">
                        <button onclick="window.showStudentModule('questions')" class="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3">
                            <span>Enter Workspace</span>
                            <span class="iconify text-lg" data-icon="mdi:arrow-right"></span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Progress Panel -->
            <div class="bg-gray-900 flex flex-col" data-card-title="Research Progress">
                <div class="sticky-panel-header md:hidden !bg-gray-900 !border-white/10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white shrink-0 border border-blue-500">
                            <span class="iconify" data-icon="mdi:chart-donut"></span>
                        </div>
                        <h3 class="text-white">My Progress</h3>
                        ${renderInfoTip('See how much of the inquiry process you have completed! Each checkmark represents a major scientific practice you have engaged in.')}
                    </div>
                </div>
                <div class="panel-content flex flex-col justify-center py-10 md:py-6">
                    <div class="text-center mb-8 md:mb-6">
                        <span class="text-7xl md:text-8xl font-black text-white tracking-tighter">${progress}%</span>
                        <p class="text-blue-400 font-bold uppercase text-[10px] md:text-xs tracking-widest mt-2">Overall Completion</p>
                    </div>
                    <div class="h-3 md:h-4 bg-white/10 rounded-full overflow-hidden mb-10 md:mb-8 mx-4 md:mx-10 border border-white/5">
                        <div class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.5)]" style="width:${progress}%"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 md:gap-4 px-4 md:px-10">
                        ${['questions', 'models', 'analysis', 'explanations'].map(id => {
                            const done = isModuleStarted(id);
                            return `
                                <div class="flex items-center gap-3 p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 transition-all hover:bg-white/10">
                                    <span class="iconify text-xl md:text-2xl ${done ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'text-white/20'}" data-icon="${done ? 'mdi:check-circle' : 'mdi:circle-outline'}"></span>
                                    <span class="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest">${id}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <!-- Quick Actions Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Quick Actions">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600 shrink-0 border border-gray-200">
                            <span class="iconify" data-icon="mdi:rocket"></span>
                        </div>
                        <h3>Quick Access</h3>
                        ${renderInfoTip('Use these shortcuts to quickly jump between different stages of your scientific investigation.')}
                    </div>
                </div>
                <div class="panel-content flex flex-col gap-3 md:justify-center">
                    <button onclick="window.showStudentModule('questions')" class="flex items-center gap-4 p-5 md:p-6 bg-gray-50 rounded-2xl md:rounded-3xl hover:bg-blue-50 transition-all group border border-transparent hover:border-blue-100">
                        <div class="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                            <span class="iconify text-2xl md:text-3xl" data-icon="mdi:help-circle"></span>
                        </div>
                        <div class="text-left">
                            <span class="text-sm md:text-base font-black text-gray-700 uppercase block leading-none">Asking Questions</span>
                            <span class="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Practice 1</span>
                        </div>
                    </button>
                    <button onclick="window.showStudentModule('models')" class="flex items-center gap-4 p-5 md:p-6 bg-gray-50 rounded-2xl md:rounded-3xl hover:bg-purple-50 transition-all group border border-transparent hover:border-purple-100">
                        <div class="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                            <span class="iconify text-2xl md:text-3xl" data-icon="mdi:cube-outline"></span>
                        </div>
                        <div class="text-left">
                            <span class="text-sm md:text-base font-black text-gray-700 uppercase block leading-none">Building Models</span>
                            <span class="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Practice 2</span>
                        </div>
                    </button>
                    <button onclick="window.showStudentModule('argument')" class="flex items-center gap-4 p-5 md:p-6 bg-gray-50 rounded-2xl md:rounded-3xl hover:bg-green-50 transition-all group border border-transparent hover:border-green-100">
                        <div class="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-green-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                            <span class="iconify text-2xl md:text-3xl" data-icon="mdi:forum"></span>
                        </div>
                        <div class="text-left">
                            <span class="text-sm md:text-base font-black text-gray-700 uppercase block leading-none">Class Argument</span>
                            <span class="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Practice 7</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderOverviewDesktop() {
    const p = App.teacherSettings.phenomenon;
    const progress = calculateStudentProgress(App.work);
    const w = App.work;

    return `
        <div class="flex flex-col h-full bg-slate-100 p-6 gap-6 overflow-y-auto custom-scrollbar">
            <!-- Unified Header Section -->
            <div class="bg-white rounded-[2.5rem] p-10 border border-gray-200 shadow-xl relative overflow-hidden shrink-0">
                <div class="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none"></div>
                <div class="flex flex-col lg:flex-row gap-12 items-start relative z-10">
                    <div class="flex-1 space-y-8">
                        <div>
                            <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-6">
                                <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span class="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Scientific Mission Control</span>
                            </div>
                            <h2 class="text-5xl font-black text-gray-900 tracking-tighter mb-4">${p.title || 'Investigating the Phenomenon'}</h2>
                            <p class="text-xl text-gray-500 font-medium leading-relaxed italic max-w-3xl">"${p.description || 'Observe and document your findings as you explore this scientific mystery.'}"</p>
                        </div>

                        ${p.media?.length > 0 ? `
                            <div class="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                ${p.media.map(m => `
                                    <div class="w-64 aspect-video bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-200 shadow-sm group cursor-pointer" onclick="window.viewMediaDetail('${m.id}')">
                                        <img src="${m.thumb}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="w-full lg:w-96 shrink-0 space-y-6">
                        <div class="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                            <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Inquiry Completion</p>
                            <div class="flex items-baseline gap-3 mb-6">
                                <span class="text-7xl font-black tracking-tighter">${progress}%</span>
                                <span class="text-xs font-bold text-blue-400 uppercase tracking-widest">Done</span>
                            </div>
                            <div class="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 p-0.5">
                                <div class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style="width:${progress}%"></div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
                                <p class="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Evidence</p>
                                <p class="text-2xl font-black text-blue-700">${w.evidence?.length || 0}</p>
                            </div>
                            <div class="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-center">
                                <p class="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Concepts</p>
                                <p class="text-2xl font-black text-purple-700">${w.modelNodes?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Dashboard Grid Area -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                <!-- Left: Scientific Story -->
                <div class="lg:col-span-8 bg-white rounded-[2.5rem] p-10 border border-gray-200 shadow-xl flex flex-col">
                    <div class="flex items-center justify-between mb-10 border-b border-gray-50 pb-6">
                        <div>
                            <h3 class="text-xl font-black text-gray-900 uppercase tracking-tight">The Scientific Story</h3>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Your Research Journey</p>
                        </div>
                        <div class="flex gap-2">
                            ${['questions', 'models', 'analysis', 'explanations'].map(id => {
                                const done = isModuleStarted(id);
                                return `<div class="w-8 h-8 rounded-lg flex items-center justify-center border-2 ${done ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-300'}" title="${id.toUpperCase()}">
                                    <span class="iconify" data-icon="${done ? 'mdi:check-bold' : 'mdi:circle-outline'}"></span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto pr-4 custom-scrollbar">
                        <div class="space-y-8">
                            ${renderStoryStepDesktop('Asking Questions', w.mainQuestion ? `Target Inquiry: <span class="text-gray-900 font-bold">"${w.mainQuestion}"</span>` : 'Defining the driving questions...', !!w.mainQuestion, 'mdi:help-circle', 'blue')}
                            ${renderStoryStepDesktop('Modeling Concepts', w.modelNodes?.length > 0 ? `Identified <span class="text-gray-900 font-bold">${w.modelNodes.length}</span> system components and their interactions.` : 'Building conceptual models...', w.modelNodes?.length > 0, 'mdi:cube-outline', 'purple')}
                        </div>
                        <div class="space-y-8">
                            ${renderStoryStepDesktop('Evidence & Claims', w.claim ? `Scientific Claim: <span class="text-gray-900 font-bold">"${w.claim}"</span>` : 'Gathering evidence to support a claim...', !!w.claim, 'mdi:lightbulb-on', 'green')}
                            ${renderStoryStepDesktop('Evidence Bank', w.evidence?.length > 0 ? `Archived <span class="text-gray-900 font-bold">${w.evidence.length}</span> data artifacts and models.` : 'Collecting observations...', w.evidence?.length > 0, 'mdi:folder-star', 'amber')}
                        </div>
                    </div>

                    <div class="mt-10 pt-8 border-t border-gray-50 flex justify-end items-center gap-6">
                        <p class="text-sm font-medium text-gray-400 italic">Ready to continue your research?</p>
                        <button onclick="window.showStudentModule('questions')" class="px-10 py-5 bg-gray-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-black transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
                            Enter Workspace
                            <span class="iconify text-xl" data-icon="mdi:arrow-right"></span>
                        </button>
                    </div>
                </div>

                <!-- Right: Quick Links & Progress -->
                <div class="lg:col-span-4 space-y-6 flex flex-col">
                    <div class="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-xl flex-1 flex flex-col">
                        <h3 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 ml-2">Quick Practices</h3>
                        <div class="grid grid-cols-1 gap-3 flex-1">
                            ${[
                                { id: 'questions', icon: 'mdi:help-circle', label: '1. Asking Questions', color: 'blue' },
                                { id: 'models', icon: 'mdi:cube-outline', label: '2. Building Models', color: 'purple' },
                                { id: 'analysis', icon: 'mdi:chart-line', label: '4. Analyzing Data', color: 'green' },
                                { id: 'argument', icon: 'mdi:forum', label: '7. Class Argument', color: 'amber' }
                            ].map(m => `
                                <button onclick="window.showStudentModule('${m.id}')" class="flex items-center gap-4 p-5 bg-gray-50 rounded-3xl hover:bg-${m.color}-50 border border-transparent hover:border-${m.color}-100 transition-all group text-left shadow-sm">
                                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-${m.color}-600 shadow-inner group-hover:scale-110 transition-transform">
                                        <span class="iconify text-2xl" data-icon="${m.icon}"></span>
                                    </div>
                                    <span class="text-sm font-black text-gray-700 uppercase tracking-tight">${m.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStoryStepDesktop(label, text, active, icon, color) {
    return `
        <div class="flex gap-6 group">
            <div class="flex flex-col items-center shrink-0">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${active ? `bg-${color}-50 border-${color}-200 text-${color}-600 shadow-lg shadow-${color}-100` : 'bg-gray-50 border-gray-100 text-gray-300'}">
                    <span class="iconify text-2xl" data-icon="${icon}"></span>
                </div>
            </div>
            <div class="flex-1 pt-1">
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 group-hover:text-gray-600 transition-colors">${label}</h4>
                <p class="text-base text-gray-600 font-medium leading-relaxed">${text}</p>
            </div>
        </div>
    `;
}

function renderStoryStep(label, text, active, icon, color) {
    return `
        <div class="flex gap-4">
            <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center ${active ? `bg-${color}-100 text-${color}-600` : 'bg-gray-100 text-gray-300'} transition-colors">
                    <span class="iconify text-xl" data-icon="${icon}"></span>
                </div>
                <div class="w-0.5 flex-1 bg-gray-100 my-2"></div>
            </div>
            <div class="flex-1 pb-6">
                <h4 class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">${label}</h4>
                <p class="text-sm text-gray-600 font-medium leading-relaxed">${text}</p>
            </div>
        </div>
    `;
}

function isModuleStarted(moduleId) {
    const w = App.work;
    if (moduleId === 'questions') return w.notices?.length > 0 || w.wonders?.length > 0 || w.mainQuestion;
    if (moduleId === 'models') return w.modelNodes?.length > 0;
    if (moduleId === 'analysis') return w.dataTable?.rows?.some(r => Object.values(r).some(v => v));
    if (moduleId === 'explanations') return w.claim || w.reasoning;
    return false;
}
