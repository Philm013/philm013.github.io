/**
 * @file viewer.js
 * @description specialized logic for real-time monitoring and feedback on student models and data. 
 */

import { App } from '../core/state.js';
import { dbGetByIndex, STORE_USERS } from '../core/storage.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderTeacherContent } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

export async function renderLiveModels() {
    if (!App.viewingStudentId) return renderStudentSelectionTiles('View Student Models');
    return `
        <div class="h-full flex flex-col -m-6">
            <div class="bg-white border-b p-4 flex items-center justify-between shadow-sm shrink-0">
                <div class="flex items-center gap-3">
                    <button onclick="window.stopViewingStudent()" class="p-2 hover:bg-gray-100 rounded-lg"><span class="iconify" data-icon="mdi:arrow-left"></span></button>
                    <h3 class="font-bold">Viewing Model: ${App.viewingStudentId}</h3>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.presentToClass('model')" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">Present</button>
                </div>
            </div>
            <div id="viewerCanvas" class="flex-1 bg-slate-100 model-canvas relative overflow-hidden" onclick="window.handleViewerClick(event)">
                <div id="viewerCanvasContent" class="absolute inset-0 origin-top-left pointer-events-none">
                    <svg id="viewerPathsSvg" class="absolute inset-0 w-full h-full" style="z-index: 6; pointer-events: none;"></svg>
                    <svg id="viewerConnectionsSvg" class="connection-line">
                        <defs><marker id="viewerArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/></marker></defs>
                    </svg>
                    <div id="viewerShapesLayer" class="absolute inset-0" style="z-index: 5;"></div>
                    <div id="viewerNodesLayer" class="absolute inset-0" style="z-index: 10;"></div>
                    <div id="viewerCommentsLayer" class="absolute inset-0" style="z-index: 20;"></div>
                </div>
                <div class="readonly-overlay"></div>
                ${renderViewerToolbar()}
            </div>
        </div>
    `;
}

function renderViewerToolbar() {
    const stickers = ['⭐', '✅', '❓', '💡', '🎯', '👏'];
    return `
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border p-2 flex items-center gap-2 z-[60]">
            <button onclick="window.setViewerTool('comment')" class="p-3 rounded-xl hover:bg-primary/10 ${App.viewerState.addingComment ? 'bg-primary text-white' : 'text-primary'}">
                <span class="iconify text-xl" data-icon="mdi:comment-plus"></span>
            </button>
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            ${stickers.map(s => `<button onclick="window.setViewerSticker('${s}')" class="p-2 rounded-xl hover:bg-gray-100 ${App.viewerState.selectedSticker === s ? 'bg-blue-100' : ''}">${s}</button>`).join('')}
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            <button onclick="window.clearViewerFeedback()" class="p-3 text-red-500 hover:bg-red-50 rounded-xl"><span class="iconify text-xl" data-icon="mdi:delete-sweep"></span></button>
        </div>
    `;
}

async function renderStudentSelectionTiles(title) {
    const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
    const students = allUsers.filter(u => u.mode === 'student');
    return `
        <div class="max-w-4xl mx-auto py-8">
            <h2 class="text-2xl font-bold mb-6">${title}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${students.map(s => `
                    <div onclick="window.viewStudentWork('${s.visitorId}')" class="p-6 bg-white rounded-2xl border-2 border-transparent hover:border-primary cursor-pointer transition-all shadow-sm">
                        <div class="text-2xl mb-4">${s.avatar || '👤'}</div>
                        <h3 class="font-bold text-gray-900">${s.name}</h3>
                        <p class="text-xs text-gray-500">View progress</p>
                    </div>
                `).join('')}
                ${students.length === 0 ? '<p class="col-span-full py-20 text-center text-gray-400 border-2 border-dashed rounded-3xl">No students connected yet.</p>' : ''}
            </div>
        </div>
    `;
}

export async function renderLiveData() {
    if (!App.viewingStudentId) return renderStudentSelectionTiles('View Student Data');
    const dt = App.work.dataTable;
    return `
        <div class="max-w-6xl mx-auto p-6">
            <div class="mb-6 flex items-center justify-between">
                <h2 class="text-2xl font-bold">Student Data: ${App.viewingStudentId}</h2>
                <button onclick="window.stopViewingStudent()" class="px-4 py-2 bg-gray-100 rounded-lg font-bold">Close</button>
            </div>
            <div class="bg-white rounded-2xl border overflow-hidden shadow-sm">
                <table class="w-full border-collapse">
                    <thead><tr class="bg-gray-50">${dt.columns.map(c => `<th class="p-4 text-left border-b font-bold">${c.name}</th>`).join('')}</tr></thead>
                    <tbody>${dt.rows.map(r => `<tr>${dt.columns.map(c => `<td class="p-4 border-b">${r[c.id] || '-'}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
    `;
}

export function renderIconManager() {
    return `
        <div class="max-w-4xl mx-auto">
            <div class="mb-8"><h2 class="text-2xl font-bold text-gray-900">Icon Library</h2><p class="text-gray-500">Curate modeling assets</p></div>
            <div class="bg-white rounded-2xl border p-8 shadow-sm">
                <div class="flex gap-2"><input type="text" id="iconSearchInput" placeholder="Search Iconify..." class="flex-1 border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"><button onclick="window.searchIconsForManager()" class="bg-primary text-white px-8 py-2 rounded-xl font-bold">Search</button></div>
                <div id="iconManagerGrid" class="grid grid-cols-8 gap-4 mt-8"></div>
            </div>
        </div>
    `;
}

export function initViewerCanvas() {
    const canvas = document.getElementById('viewerCanvasContent');
    if (!canvas) return;
    canvas.innerHTML = ''; // Clear
    // Logic to render student model content in read-only mode ...
    // Nodes, Shapes, Paths, Stickers ...
}

export async function saveComment() {
    const val = document.getElementById('commentText')?.value.trim();
    if (val && App.viewerState.commentPosition) {
        if (!App.work.modelComments) App.work.modelComments = [];
        App.work.modelComments.push({ id: 'c_' + Date.now(), text: val, x: App.viewerState.commentPosition.x, y: App.viewerState.commentPosition.y, author: App.user.name, time: Date.now() });
        await saveAndBroadcast('modelComments', App.work.modelComments);
        App.viewerState.addingComment = false; renderTeacherContent(); toast('Added!', 'success');
    }
}

export async function clearViewerFeedback() {
    if (confirm('Clear comments?')) {
        App.work.modelComments = []; await saveAndBroadcast('modelComments', []); renderTeacherContent();
    }
}

window.handleViewerClick = (e) => {
    const rect = document.getElementById('viewerCanvas').getBoundingClientRect();
    const x = (e.clientX - rect.left), y = (e.clientY - rect.top);
    if (App.viewerState.addingComment) { App.viewerState.commentPosition = { x, y }; document.getElementById('commentModal').classList.remove('hidden'); document.getElementById('commentModal').classList.add('flex'); }
    else if (App.viewerState.selectedSticker) {
        if (!App.work.modelStickers) App.work.modelStickers = [];
        App.work.modelStickers.push({ id: 's_' + Date.now(), emoji: App.viewerState.selectedSticker, x: x-20, y: y-20 });
        saveAndBroadcast('modelStickers', App.work.modelStickers); renderTeacherContent();
    }
};

window.setViewerTool = (t) => { App.viewerState.addingComment = (t === 'comment'); App.viewerState.selectedSticker = null; renderTeacherContent(); };
window.setViewerSticker = (s) => { App.viewerState.selectedSticker = (App.viewerState.selectedSticker === s) ? null : s; App.viewerState.addingComment = false; renderTeacherContent(); };
