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
                
                <div class="mt-8 pt-6 border-t border-gray-100">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Table Analysis & Notes</label>
                    <textarea onchange="window.saveTableComment(this.value)" 
                        placeholder="Document any observations about your data collection process or unusual results here..."
                        class="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-700 focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
                        rows="3">${App.work.dataTable?.comment || ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

export async function saveTableComment(val) {
    if (!App.work.dataTable) App.work.dataTable = {};
    App.work.dataTable.comment = val;
    await saveAndBroadcast('dataTable.comment', val);
}


function renderVariableDropZone(type) {
    const colors = { independent: 'blue', dependent: 'green', controlled: 'gray' };
    const labels = { independent: 'Independent (Change)', dependent: 'Dependent (Measure)', controlled: 'Controlled (Keep Same)' };
    const vars = (App.work.variables || []).filter(v => v.type === type);
    return `
        <div class="p-5 bg-${colors[type]}-50/50 rounded-2xl border-2 border-dashed border-${colors[type]}-200 drop-zone min-h-32 transition-all"
            data-type="${type}" ondragover="window.dragOver(event)" ondragleave="window.dragLeave(event)" ondrop="window.dropVar(event)">
            <h4 class="font-black text-${colors[type]}-700 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-${colors[type]}-500"></span>
                ${labels[type]}
            </h4>
            <div class="space-y-2">
                ${vars.map(v => `
                    <div class="p-3 bg-white rounded-xl border border-${colors[type]}-100 text-sm font-bold text-gray-700 flex justify-between items-center group shadow-sm animate-in zoom-in-95 duration-200">
                        <span>${v.name}</span>
                        <button onclick="window.removeVariable('${v.id}')" class="text-gray-300 hover:text-red-500 transition-colors">
                            <span class="iconify" data-icon="mdi:close-circle"></span>
                        </button>
                    </div>
                `).join('')}
                ${vars.length === 0 ? `<p class="text-[10px] text-${colors[type]}-300 italic text-center py-4">Drag from bank...</p>` : ''}
            </div>
        </div>
    `;
}

function renderVariableBank() {
    const unassigned = (App.work.variables || []).filter(v => !v.type);
    return `
        <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <h4 class="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Variable Inventory</h4>
            <div class="flex flex-wrap gap-2 mb-6 min-h-[40px]">
                ${unassigned.map(v => `
                    <div draggable="true" ondragstart="window.dragVarStart(event, '${v.id}')"
                        class="px-4 py-2 bg-white rounded-xl border-2 border-gray-100 text-sm font-bold text-gray-600 cursor-grab hover:border-primary hover:text-primary hover:shadow-md transition-all active:cursor-grabbing">
                        ${v.name}
                    </div>
                `).join('') || '<p class="text-xs text-gray-400 italic py-2">Add your experimental variables below</p>'}
            </div>
            <div class="flex gap-2">
                <input type="text" id="newVarInput" placeholder="e.g. Temperature, Time, Growth..." 
                    class="flex-1 px-5 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-medium focus:border-primary focus:outline-none transition-all" 
                    onkeypress="if(event.key==='Enter')window.addVariable()">
                <button onclick="window.addVariable()" class="px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-lg">Add to Bank</button>
            </div>
        </div>
    `;
}


function renderDataTable() {
    const dt = App.work.dataTable || { columns: [], rows: [] };
    const vars = App.work.variables || [];
    const showFeedback = App.teacherSettings.showCommentsToStudents || App.mode === 'teacher';
    
    return `
        <div class="overflow-x-auto">
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="border p-2 w-10"></th>
                        ${(dt.columns || []).map((col, i) => `
                            <th class="border p-0 min-w-40">
                                <div class="p-2 space-y-2">
                                    <div class="flex items-center gap-2">
                                        <input type="text" value="${col.name}" 
                                            onchange="window.updateColumnName('${col.id}', this.value)"
                                            class="flex-1 font-bold text-sm bg-transparent border-none focus:outline-none placeholder:text-gray-300"
                                            placeholder="Label...">
                                        ${i > 0 ? `<button onclick="window.deleteColumn('${col.id}')" class="text-red-300 hover:text-red-500 transition-colors">
                                            <span class="iconify" data-icon="mdi:close-circle"></span>
                                        </button>` : ''}
                                    </div>
                                    
                                    <div class="flex flex-col gap-1.5">
                                        <div class="flex items-center gap-1">
                                            <span class="iconify text-[10px] text-gray-400" data-icon="mdi:link-variant"></span>
                                            <select onchange="window.linkColumnToVariable('${col.id}', this.value)" 
                                                class="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 w-full font-medium">
                                                <option value="">No Variable Link</option>
                                                ${vars.filter(v => v.type).map(v => `
                                                    <option value="${v.id}" ${col.variableId === v.id ? 'selected' : ''}>${v.name}</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                        
                                        <div class="flex items-center gap-1">
                                            <select onchange="window.updateColumnType('${col.id}', this.value)" 
                                                class="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 font-bold">
                                                <option value="text" ${col.type === 'text' ? 'selected' : ''}>TXT</option>
                                                <option value="number" ${col.type === 'number' ? 'selected' : ''}>NUM</option>
                                            </select>
                                            ${col.type === 'number' ? `<input type="text" value="${col.unit || ''}" placeholder="Unit" onchange="window.updateColumnUnit('${col.id}', this.value)" class="text-[10px] w-full border border-gray-200 rounded px-1.5 py-0.5">` : ''}
                                        </div>
                                    </div>
                                </div>
                            </th>
                        `).join('')}
                        ${showFeedback ? '<th class="border p-2 w-16 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Feedback</th>' : ''}
                        <th class="border p-2 w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    ${(dt.rows || []).map((row, ri) => `
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="border p-2 text-center text-gray-400 text-[10px] font-bold">${ri + 1}</td>
                            ${(dt.columns || []).map(col => `
                                <td class="border p-0">
                                    <input type="${col.type === 'number' ? 'number' : 'text'}"
                                        value="${row[col.id] || ''}"
                                        onchange="window.updateCell(${ri}, '${col.id}', this.value)"
                                        class="data-cell w-full p-3 border-none focus:bg-blue-50 text-sm font-medium text-gray-700 transition-colors"
                                        step="${col.type === 'number' ? '0.01' : ''}"
                                        placeholder="...">
                                </td>
                            `).join('')}
                            <td class="border p-2 text-center">
                                <div class="relative group/note inline-block">
                                    <button onclick="window.toggleRowNote(${ri})" class="p-1.5 rounded-lg hover:bg-gray-100 transition-all ${row.note ? 'text-primary' : 'text-gray-300'}">
                                        <span class="iconify" data-icon="${row.note ? 'mdi:note-text' : 'mdi:note-plus-outline'}"></span>
                                    </button>
                                    ${row.note ? `
                                        <div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-56 p-4 bg-gray-900 text-white text-[11px] rounded-2xl shadow-2xl opacity-0 group-hover/note:opacity-100 pointer-events-none transition-all z-50 border border-white/10 scale-95 group-hover/note:scale-100">
                                            <p class="font-black text-blue-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">Row Note</p>
                                            ${row.note}
                                        </div>
                                    ` : ''}
                                </div>
                            </td>
                            ${showFeedback ? `
                                <td class="border p-2 text-center text-xl bg-blue-50/20">
                                    ${dt.feedback?.[ri] || ''}
                                </td>
                            ` : ''}
                            <td class="border p-2 text-center">
                                <button onclick="window.deleteDataRow(${ri})" class="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                                    <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                    ${(dt.rows || []).length === 0 ? `
                        <tr>
                            <td colspan="100%" class="p-12 text-center bg-gray-50/50">
                                <div class="flex flex-col items-center opacity-30">
                                    <span class="iconify text-4xl mb-2" data-icon="mdi:table-off"></span>
                                    <p class="text-[10px] font-black uppercase tracking-widest">No data rows added</p>
                                    <button onclick="window.addDataRow()" class="mt-4 text-xs font-bold text-primary hover:underline">Add first row</button>
                                </div>
                            </td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
    `;
}

export async function toggleRowNote(index) {
    const note = prompt('Add a note for this row:', App.work.dataTable.rows[index].note || '');
    if (note !== null) {
        App.work.dataTable.rows[index].note = note;
        await saveAndBroadcast('dataTable.rows', App.work.dataTable.rows);
        renderStudentContent();
    }
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

export async function linkColumnToVariable(colId, varId) {
    const col = App.work.dataTable.columns.find(c => c.id === colId);
    if (col) {
        col.variableId = varId;
        const v = App.work.variables.find(x => x.id === varId);
        if (v && !col.name) col.name = v.name;
        await saveAndBroadcast('dataTable', App.work.dataTable);
        renderStudentContent();
    }
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
