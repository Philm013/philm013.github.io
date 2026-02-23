/**
 * @file investigation.js
 * @description Logic for the SEP3 module: Planning and Carrying Out Investigations.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

export function renderInvestigationModule() {
    const dt = App.work.dataTable || { columns: [], rows: [] };
    return `
        <div class="max-w-5xl mx-auto">
            ${renderModuleHeader('Planning & Carrying Out Investigations', 'mdi:microscope', 'SEP3')}
            
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    Experimental Variables
                    <span class="ngss-tag ngss-ccc">CCC2</span>
                </h3>
                <div class="grid md:grid-cols-3 gap-4 mb-4">
                    ${['independent', 'dependent', 'controlled'].map(type => renderVariableDropZone(type)).join('')}
                </div>
                ${renderVariableBank()}
            </div>
            
            <div class="bg-white rounded-xl shadow-sm border p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-gray-900">Data Collection Table</h3>
                    <div class="flex gap-2">
                        <button onclick="window.addDataColumn()" class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors">
                            <span class="iconify mr-1" data-icon="mdi:table-column-plus-after"></span> Add Column
                        </button>
                        <button onclick="window.addDataRow()" class="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors">
                            <span class="iconify mr-1" data-icon="mdi:table-row-plus-after"></span> Add Row
                        </button>
                        <button onclick="window.saveDataAsEvidence()" class="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 transition-colors">
                            <span class="iconify mr-1" data-icon="mdi:bookmark"></span> Save as Evidence
                        </button>
                    </div>
                </div>
                ${renderDataTable()}
            </div>
        </div>
    `;
}

function renderVariableDropZone(type) {
    const colors = { independent: 'blue', dependent: 'green', controlled: 'gray' };
    const labels = { independent: 'Independent (Change)', dependent: 'Dependent (Measure)', controlled: 'Controlled (Keep Same)' };
    const vars = (App.work.variables || []).filter(v => v.type === type);
    return `
        <div class="p-4 bg-${colors[type]}-50 rounded-lg border-2 border-${colors[type]}-200 drop-zone min-h-24 transition-colors"
            data-type="${type}" ondragover="window.dragOver(event)" ondragleave="window.dragLeave(event)" ondrop="window.dropVar(event)">
            <h4 class="font-medium text-${colors[type]}-700 text-sm mb-2">${labels[type]}</h4>
            <div class="space-y-2">
                ${vars.map(v => `
                    <div class="p-2 bg-white rounded border text-sm flex justify-between items-center group shadow-sm">
                        <span>${v.name}</span>
                        <button onclick="window.removeVariable('${v.id}')" class="opacity-0 group-hover:opacity-100 text-red-400">×</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderVariableBank() {
    const unassigned = (App.work.variables || []).filter(v => !v.type);
    return `
        <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 class="font-medium text-yellow-700 text-sm mb-2">Variable Bank</h4>
            <div class="flex flex-wrap gap-2 mb-3">
                ${unassigned.map(v => `
                    <div draggable="true" ondragstart="window.dragVarStart(event, '${v.id}')"
                        class="px-3 py-1 bg-white rounded-full border border-yellow-300 text-sm cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing">
                        ${v.name}
                    </div>
                `).join('') || '<span class="text-yellow-600 text-sm italic">Add variables below</span>'}
            </div>
            <div class="flex gap-2">
                <input type="text" id="newVarInput" placeholder="Add variable name..." 
                    class="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                    onkeypress="if(event.key==='Enter')window.addVariable()">
                <button onclick="window.addVariable()" class="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600 transition-colors">Add</button>
            </div>
        </div>
    `;
}

function renderDataTable() {
    const dt = App.work.dataTable || { columns: [], rows: [] };
    return `
        <div class="overflow-x-auto">
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2 w-10"></th>
                        ${(dt.columns || []).map((col, i) => `
                            <th class="border p-0 min-w-32">
                                <div class="p-2">
                                    <input type="text" value="${col.name}" 
                                        onchange="window.updateColumnName('${col.id}', this.value)"
                                        class="w-full font-semibold text-sm bg-transparent border-none focus:outline-none mb-1">
                                    <div class="flex items-center gap-2">
                                        <select onchange="window.updateColumnType('${col.id}', this.value)" 
                                            class="text-xs bg-white border rounded px-1 py-0.5">
                                            <option value="text" ${col.type === 'text' ? 'selected' : ''}>Text</option>
                                            <option value="number" ${col.type === 'number' ? 'selected' : ''}>Number</option>
                                        </select>
                                        ${col.type === 'number' ? `<input type="text" value="${col.unit || ''}" placeholder="unit" onchange="window.updateColumnUnit('${col.id}', this.value)" class="text-xs w-16 border rounded px-1 py-0.5">` : ''}
                                        ${i > 0 ? `<button onclick="window.deleteColumn('${col.id}')" class="text-red-400">×</button>` : ''}
                                    </div>
                                </div>
                            </th>
                        `).join('')}
                        <th class="border p-2 w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    ${(dt.rows || []).map((row, ri) => `
                        <tr class="hover:bg-gray-50">
                            <td class="border p-2 text-center text-gray-400 text-xs">${ri + 1}</td>
                            ${dt.columns.map(col => `
                                <td class="border p-0">
                                    <input type="${col.type === 'number' ? 'number' : 'text'}"
                                        value="${row[col.id] || ''}"
                                        onchange="window.updateCell(${ri}, '${col.id}', this.value)"
                                        class="data-cell w-full p-2 border-none focus:bg-blue-50"
                                        step="${col.type === 'number' ? '0.01' : ''}">
                                </td>
                            `).join('')}
                            <td class="border p-2 text-center">
                                <button onclick="window.deleteDataRow(${ri})" class="text-red-400">×</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export async function addVariable() {
    const input = document.getElementById('newVarInput'); if (!input?.value.trim()) return;
    App.work.variables.push({ id: 'var_' + Date.now(), name: input.value.trim(), type: null });
    input.value = ''; await saveAndBroadcast('variables', App.work.variables); renderStudentContent();
}

window.dragVarStart = (e, id) => { e.dataTransfer.setData('text/plain', id); e.target.style.opacity = '0.5'; };
window.dragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('bg-opacity-50', 'ring-4', 'ring-primary/20'); };
window.dragLeave = (e) => { e.currentTarget.classList.remove('bg-opacity-50', 'ring-4', 'ring-primary/20'); };

export async function dropVar(event) {
    event.preventDefault(); event.currentTarget.classList.remove('bg-opacity-50', 'ring-4', 'ring-primary/20');
    const varId = event.dataTransfer.getData('text/plain');
    if (varId) {
        const type = event.currentTarget.dataset.type;
        const v = App.work.variables.find(x => x.id === varId);
        if (v) { v.type = type; await saveAndBroadcast('variables', App.work.variables); renderStudentContent(); }
    }
}

export async function removeVariable(id) {
    const v = App.work.variables.find(x => x.id === id); if (v) v.type = null;
    await saveAndBroadcast('variables', App.work.variables); renderStudentContent();
}

export async function updateColumnName(colId, name) { const col = App.work.dataTable.columns.find(c => c.id === colId); if (col) col.name = name; await saveAndBroadcast('dataTable', App.work.dataTable); }
export async function addDataColumn() { const name = prompt('Column name:', 'New Column'); if (!name) return; const colId = 'col_' + Date.now(); App.work.dataTable.columns.push({ id: colId, name, type: 'number', unit: '', variableId: '' }); await saveAndBroadcast('dataTable', App.work.dataTable); renderStudentContent(); }
export async function updateColumnType(colId, type) { const col = App.work.dataTable.columns.find(c => c.id === colId); if (col) col.type = type; await saveAndBroadcast('dataTable', App.work.dataTable); renderStudentContent(); }
export async function updateColumnUnit(colId, unit) { const col = App.work.dataTable.columns.find(c => c.id === colId); if (col) col.unit = unit; await saveAndBroadcast('dataTable', App.work.dataTable); }
export async function deleteColumn(colId) { if (confirm('Delete column?')) { App.work.dataTable.columns = App.work.dataTable.columns.filter(c => c.id !== colId); App.work.dataTable.rows.forEach(row => delete row[colId]); await saveAndBroadcast('dataTable', App.work.dataTable); renderStudentContent(); } }
export async function addDataRow() { const row = {}; App.work.dataTable.columns.forEach(col => row[col.id] = ''); App.work.dataTable.rows.push(row); await saveAndBroadcast('dataTable', App.work.dataTable); renderStudentContent(); }
export async function updateCell(rowIndex, colId, value) { App.work.dataTable.rows[rowIndex][colId] = value; await saveAndBroadcast('dataTable', App.work.dataTable); }
export async function deleteDataRow(index) { App.work.dataTable.rows.splice(index, 1); await saveAndBroadcast('dataTable', App.work.dataTable); renderStudentContent(); }

export async function saveDataAsEvidence() {
    if (!App.work.dataTable.rows.some(r => Object.values(r).some(v => v))) { toast('Add some data first!', 'warning'); return; }
    const evidence = { id: 'ev_' + Date.now(), type: 'data', title: 'Data Table', description: `${App.work.dataTable.rows.length} rows, ${App.work.dataTable.columns.length} columns`, icon: 'mdi:table', data: JSON.parse(JSON.stringify(App.work.dataTable)), author: App.user.name, time: Date.now() };
    App.work.evidence.push(evidence); await saveAndBroadcast('evidence', App.work.evidence); toast('Data saved!', 'success');
}
