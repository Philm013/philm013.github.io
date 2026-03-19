import React, { useState } from 'react';

function HelpModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 id="help-title" className="text-2xl font-[900] text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-xl text-white shadow-lg shadow-purple-200" aria-hidden="true">
                            <span className="iconify w-6 h-6" data-icon="solar:question-square-bold-duotone"></span>
                        </div>
                        Help & Tips
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-100" aria-label="Close help">
                        <span className="iconify w-8 h-8" data-icon="solar:close-circle-bold-duotone" aria-hidden="true"></span>
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto max-h-[70vh] space-y-10 text-slate-600 scroll-container font-medium">
                    <section aria-labelledby="help-layouts">
                        <h3 id="help-layouts" className="text-xs font-[800] text-teal-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-teal-500 rounded-full" aria-hidden="true"></div>
                            Layouts & Maps
                        </h3>
                        <ul className="space-y-4 list-disc pl-5">
                            <li><strong className="text-slate-900 font-[800]">Mind Map & Sunburst:</strong> Best for organizing topics branching from a main idea.</li>
                            <li><strong className="text-slate-900 font-[800]">Flowchart:</strong> Perfect for step-by-step processes or decision paths.</li>
                            <li><strong className="text-slate-900 font-[800]">Override:</strong> If the auto-layout gets stuck, right-click the background to force a specific style.</li>
                        </ul>
                    </section>
                    
                    <section aria-labelledby="help-controls">
                        <h3 id="help-controls" className="text-xs font-[800] text-sky-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-sky-500 rounded-full" aria-hidden="true"></div>
                            Desktop Controls
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase tracking-wider">
                            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-2">
                                <div className="text-sky-500 font-[900] text-lg">Shift + Drag</div>
                                <div className="text-slate-400">Lasso Select</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-2">
                                <div className="text-purple-500 font-[900] text-lg">Double Click</div>
                                <div className="text-slate-400">Edit Label</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function ExportModal({ isOpen, onClose, onExportInteractive, onExportPrintable, onExportJson }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity" role="dialog" aria-modal="true" aria-labelledby="export-title">
            <div className="bg-white border border-slate-200 w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 id="export-title" className="text-2xl font-[900] text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-200" aria-hidden="true">
                            <span className="iconify w-6 h-6" data-icon="solar:export-bold-duotone"></span>
                        </div>
                        Export Project
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-100" aria-label="Close export">
                        <span className="iconify w-8 h-8" data-icon="solar:close-circle-bold-duotone" aria-hidden="true"></span>
                    </button>
                </div>
                
                <div className="p-8 space-y-4">
                    <button onClick={onExportInteractive} className="w-full group bg-slate-50 hover:bg-sky-50 border-2 border-slate-100 hover:border-sky-200 rounded-2xl p-5 flex items-center gap-5 transition-all active:scale-95 text-left" aria-describedby="desc-interactive">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors" aria-hidden="true">
                            <span className="iconify w-6 h-6" data-icon="solar:globus-bold-duotone"></span>
                        </div>
                        <div>
                            <div className="font-[800] text-slate-900">Interactive Web Viewer</div>
                            <div id="desc-interactive" className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Download a single file you can open in any browser.</div>
                        </div>
                    </button>
                    
                    <button onClick={onExportPrintable} className="w-full group bg-slate-50 hover:bg-teal-50 border-2 border-slate-100 hover:border-teal-200 rounded-2xl p-5 flex items-center gap-5 transition-all active:scale-95 text-left" aria-describedby="desc-printable">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-teal-500 group-hover:bg-teal-500 group-hover:text-white transition-colors" aria-hidden="true">
                            <span className="iconify w-6 h-6" data-icon="solar:printer-bold-duotone"></span>
                        </div>
                        <div>
                            <div className="font-[800] text-slate-900">Printable Document</div>
                            <div id="desc-printable" className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">A clean text outline perfect for printing or PDF.</div>
                        </div>
                    </button>
                    
                    <button onClick={onExportJson} className="w-full group bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 hover:border-slate-300 rounded-2xl p-5 flex items-center gap-5 transition-all active:scale-95 text-left" aria-describedby="desc-json">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors" aria-hidden="true">
                            <span className="iconify w-6 h-6" data-icon="solar:code-file-bold-duotone"></span>
                        </div>
                        <div>
                            <div className="font-[800] text-slate-900">Project Backup (JSON)</div>
                            <div id="desc-json" className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Download the raw data to move your map elsewhere.</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

window.HelpModal = HelpModal;
window.ExportModal = ExportModal;
