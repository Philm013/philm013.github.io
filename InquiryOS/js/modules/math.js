/**
 * @file math.js
 * @description Logic for the SEP5 module: Using Mathematics and Computational Thinking. 
 * Implements a scientific calculator and a persistent list of mathematical expressions.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast, renderInfoTip } from '../ui/utils.js';

let calcValue = '';

export function renderMathModule() {
    const vars = (App.work.variables || []).filter(v => v.type);
    return `
        <div class="panels-container">
            <!-- Calculator Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Calculator">
                <div class="p-2 md:p-0">
                    ${renderModuleHeader('Using Math & Thinking', 'mdi:calculator', 'SEP5', '', 'Use this scientific calculator to perform calculations needed for your data analysis or modeling.')}
                </div>

                <div class="panel-content flex flex-col">
                    <div class="relative drop-zone-calc mb-4">
                        <input type="text" id="calcDisplay" class="w-full px-4 py-5 bg-gray-900 text-white rounded-2xl font-mono text-2xl text-right shadow-inner border-2 border-gray-800 outline-none" placeholder="0" readonly>
                    </div>
                    <div class="grid grid-cols-4 gap-2 flex-1">
                        ${renderCalculatorButtons()}
                    </div>
                </div>
            </div>

            <!-- Variable Assets Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Mathematical Assets">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 shrink-0 border border-purple-100/50">
                            <span class="iconify text-base" data-icon="mdi:variable"></span>
                        </div>
                        <h3>Math Assets</h3>
                        ${renderInfoTip('Access common constants like gravity (g) or pi (π), and quickly inject your defined experimental variables into the calculator.')}
                    </div>
                </div>
                <div class="panel-content space-y-6">
                    <div class="flex gap-2 p-1 bg-gray-100 rounded-xl">
                        <button onclick="window.switchMathTab('vars')" id="tab_vars" class="math-tab flex-1 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">Variables</button>
                        <button onclick="window.switchMathTab('constants')" id="tab_constants" class="math-tab flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase">Constants</button>
                    </div>
                    <div id="math_vars_content" class="flex flex-wrap gap-2">
                        ${vars.map(v => `<button onclick="window.injectVariableToCalc('${v.name}')" class="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 active:scale-95 transition-all">${v.name}</button>`).join('') || '<p class="text-xs text-gray-400 italic w-full text-center">No variables defined.</p>'}
                    </div>
                    <div id="math_constants_content" class="hidden grid grid-cols-2 gap-2">
                        ${[{ name: 'π', val: '3.14159', label: 'Pi' }, { name: 'g', val: '9.81', label: 'Gravity' }, { name: 'c', val: '299792458', label: 'Light' }].map(c => `<button onclick="window.injectVariableToCalc('${c.val}')" class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-left active:scale-95 transition-all"><span class="font-mono font-black text-primary">${c.name}</span><p class="text-[8px] font-black text-gray-400 uppercase">${c.label}</p></button>`).join('')}
                    </div>
                </div>
            </div>

            <!-- Unit Converter Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Unit Conversion">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 shrink-0 border border-amber-100/50">
                            <span class="iconify text-base" data-icon="mdi:unite"></span>
                        </div>
                        <h3>Converter</h3>
                        ${renderInfoTip('Scientists must always be careful with units! Use this tool to convert between metric units like meters and centimeters.')}
                    </div>
                </div>
                <div class="panel-content space-y-4 md:space-y-6 md:justify-center">
                    <div class="hidden md:flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                            <span class="iconify text-xl" data-icon="mdi:unite"></span>
                        </div>
                        <h4 class="font-black text-sm uppercase text-gray-700 tracking-tight">Dimensional Analysis</h4>
                    </div>
                    <div class="grid grid-cols-2 gap-4 md:gap-6">
                        <div class="space-y-3">
                            <label class="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1 block">From Value</label>
                            <input type="number" id="unitInput" placeholder="0" oninput="window.convertUnits()" class="w-full px-4 py-3 md:py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black focus:border-amber-400 focus:bg-white transition-all outline-none">
                            <select id="unitFrom" onchange="window.convertUnits()" class="w-full px-3 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs md:text-sm font-bold focus:border-amber-400 outline-none">
                                <option value="m">Meters</option><option value="cm">Centimeters</option><option value="kg">Kilograms</option><option value="g">Grams</option>
                            </select>
                        </div>
                        <div class="space-y-3">
                            <label class="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1 block">To Result</label>
                            <div id="unitOutput" class="w-full px-4 py-3 md:py-4 bg-amber-50 text-amber-700 rounded-2xl text-lg font-black flex items-center shadow-inner border-2 border-amber-100">0</div>
                            <select id="unitTo" onchange="window.convertUnits()" class="w-full px-3 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs md:text-sm font-bold focus:border-amber-400 outline-none">
                                <option value="cm">Centimeters</option><option value="m">Meters</option><option value="g">Grams</option><option value="kg">Kilograms</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Computational Log Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Computational Log">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 shrink-0 border border-purple-100/50">
                            <span class="iconify text-base" data-icon="mdi:history"></span>
                        </div>
                        <h3>Calculation Log</h3>
                        ${renderInfoTip('Document your mathematical thinking! Save important expressions and formulas to refer back to during your final communication.')}
                    </div>
                </div>
                <div class="panel-content flex flex-col md:!p-6">
                    <div class="hidden md:flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                            <span class="iconify text-xl" data-icon="mdi:history"></span>
                        </div>
                        <h4 class="font-black text-sm uppercase text-gray-700 tracking-tight">Calculation History</h4>
                    </div>
                    <div class="flex-1 overflow-y-auto space-y-3 mb-6 custom-scrollbar pr-2">
                        ${renderSavedExpressions()}
                    </div>
                    <div class="p-5 bg-purple-50/50 rounded-[2rem] border-2 border-purple-100 shrink-0 shadow-inner">
                        <div class="space-y-4">
                            <div class="relative">
                                <span class="iconify absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" data-icon="mdi:variable"></span>
                                <input type="text" id="mathExprInput" placeholder="Expression (e.g. 5.2 * 9.8)..." class="w-full pl-10 pr-4 py-4 bg-white border-2 border-white rounded-2xl font-mono text-sm md:text-base font-bold outline-none focus:border-purple-500 shadow-sm transition-all">
                            </div>
                            <button onclick="window.saveMathExpr()" class="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-purple-100 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95">
                                <span class="iconify text-xl" data-icon="mdi:content-save"></span>
                                Save Calculation
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function switchMathTab(tab) { document.querySelectorAll('.math-tab').forEach(el => { el.classList.remove('bg-blue-600', 'text-white'); el.classList.add('bg-gray-100', 'text-gray-600'); }); document.getElementById(`tab_${tab}`).classList.remove('bg-gray-100', 'text-gray-600'); document.getElementById(`tab_${tab}`).classList.add('bg-blue-600', 'text-white'); document.getElementById('math_vars_content').classList.add('hidden'); document.getElementById('math_constants_content').classList.add('hidden'); document.getElementById(`math_${tab}_content`).classList.remove('hidden'); }
export function convertUnits() { const val = parseFloat(document.getElementById('unitInput').value), from = document.getElementById('unitFrom').value, to = document.getElementById('unitTo').value, output = document.getElementById('unitOutput'); if (isNaN(val)) { output.textContent = '0'; return; } const conversions = { m: 1, cm: 0.01, km: 1000, in: 0.0254, kg: 1, g: 0.001, lb: 0.453592 }; let result; if (['c', 'f', 'k'].includes(from) && ['c', 'f', 'k'].includes(to)) { let celsius; if (from === 'c') celsius = val; else if (from === 'f') celsius = (val - 32) * 5/9; else if (from === 'k') celsius = val - 273.15; if (to === 'c') result = celsius; else if (to === 'f') result = celsius * 9/5 + 32; else if (to === 'k') result = celsius + 273.15; } else if (conversions[from] && conversions[to]) { const length = ['m', 'cm', 'km', 'in'], mass = ['kg', 'g', 'lb']; if ((length.includes(from) && length.includes(to)) || (mass.includes(from) && mass.includes(to))) result = (val * conversions[from]) / conversions[to]; else result = 'Invalid'; } else result = 'Invalid'; output.textContent = typeof result === 'number' ? result.toLocaleString(undefined, { maximumFractionDigits: 4 }) : result; }
export function varDragStart(e, name) { e.dataTransfer.setData('text/plain', name); e.dataTransfer.effectAllowed = 'copy'; }
export function injectVariableToCalc(name) { const display = document.getElementById('calcDisplay'); if (!display) return; calcValue += name; display.value = calcValue; }
export function injectVariableToFormula(name) { const input = document.getElementById('mathExprInput'); if (!input) return; const start = input.selectionStart, end = input.selectionEnd, text = input.value; input.value = text.slice(0, start) + name + text.slice(end); input.focus(); input.setSelectionRange(start + name.length, start + name.length); }
function renderCalculatorButtons() { const layout = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '±', '=']; return layout.map(btn => `<button onclick="window.calcPress('${btn}')" class="p-3 rounded-lg text-lg font-bold transition-all shadow-sm ${btn === '=' ? 'bg-primary text-white hover:bg-blue-600' : btn === 'C' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ['÷', '×', '-', '+'].includes(btn) ? 'bg-blue-50 text-primary hover:bg-blue-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">${btn}</button>`).join(''); }
function renderSavedExpressions() { const expressions = App.work.mathExpressions || []; if (expressions.length === 0) return '<p class="text-gray-400 text-sm italic py-4 text-center">No saved expressions yet.</p>'; return expressions.map(expr => `<div class="p-3 bg-gray-50 rounded-lg flex justify-between items-center group border border-gray-100 shadow-sm"><div><code class="font-mono text-primary font-bold">${expr.expression}</code><span class="text-green-600 ml-2 font-bold">= ${expr.result}</span>${expr.note ? `<p class="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tight">${expr.note}</p>` : ''}</div><button onclick="window.deleteMathExpr('${expr.id}')" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"><span class="iconify" data-icon="mdi:close-circle"></span></button></div>`).join(''); }
export async function saveMathExpr() { const exprInput = document.getElementById('mathExprInput'), noteInput = document.getElementById('mathNoteInput'), expr = exprInput?.value.trim(), note = noteInput?.value.trim(); if (!expr) return; try { const result = eval(expr.replace(/×/g, '*').replace(/÷/g, '/')); App.work.mathExpressions.push({ id: 'math_' + Date.now(), expression: expr, result: Number.isFinite(result) ? result.toFixed(4) : 'Error', note }); if (exprInput) exprInput.value = ''; if (noteInput) noteInput.value = ''; await saveAndBroadcast('mathExpressions', App.work.mathExpressions); renderStudentContent(); toast('Expression saved!', 'success'); } catch { toast('Invalid expression', 'error'); } }
export async function deleteMathExpr(id) { App.work.mathExpressions = App.work.mathExpressions.filter(e => e.id !== id); await saveAndBroadcast('mathExpressions', App.work.mathExpressions); renderStudentContent(); }
