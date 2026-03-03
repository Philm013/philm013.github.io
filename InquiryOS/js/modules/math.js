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
            <!-- Consolidated Math Workspace -->
            <div class="bg-white border-b flex flex-col h-full col-span-full" data-card-title="Math Workspace">
                ${renderModuleHeader('Using Math & Thinking', 'mdi:calculator', 'SEP5', '', 'Use mathematical tools to analyze data and strengthen your scientific arguments.')}
                
                <div class="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-gray-50/30">
                    
                    <!-- Left: Tools (Calculator + Assets) -->
                    <div class="w-full md:w-[450px] border-r flex flex-col bg-white">
                        <!-- Calculator -->
                        <div class="p-6 border-b shrink-0 bg-gray-50/50">
                            <div class="relative mb-4">
                                <input type="text" id="calcDisplay" class="w-full px-4 py-5 bg-gray-900 text-white rounded-2xl font-mono text-2xl text-right shadow-inner border-2 border-gray-800 outline-none" placeholder="0" readonly>
                            </div>
                            <div class="grid grid-cols-4 gap-2">
                                ${renderCalculatorButtons()}
                            </div>
                        </div>

                        <!-- Assets Tab -->
                        <div class="flex-1 flex flex-col min-h-0">
                            <div class="flex gap-2 p-4 shrink-0">
                                <button onclick="window.switchMathTab('vars')" id="tab_vars" class="math-tab flex-1 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Variables</button>
                                <button onclick="window.switchMathTab('constants')" id="tab_constants" class="math-tab flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Constants</button>
                            </div>
                            <div class="flex-1 overflow-y-auto px-4 pb-4">
                                <div id="math_vars_content" class="flex flex-wrap gap-2">
                                    ${vars.map(v => `<button onclick="window.injectVariableToCalc('${v.name}')" class="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-bold border border-blue-100 active:scale-95 transition-all truncate max-w-[120px]">${v.name}</button>`).join('') || '<p class="text-[10px] text-gray-400 italic w-full text-center">No variables found.</p>'}
                                </div>
                                <div id="math_constants_content" class="hidden grid grid-cols-2 gap-2">
                                    ${[{ name: 'π', val: '3.14159', label: 'Pi' }, { name: 'g', val: '9.81', label: 'Gravity' }, { name: 'c', val: '299792458', label: 'Light' }].map(c => `<button onclick="window.injectVariableToCalc('${c.val}')" class="p-3 bg-gray-50 rounded-xl border border-gray-100 text-left active:scale-95 transition-all"><span class="font-mono font-black text-primary">${c.name}</span><p class="text-[8px] font-black text-gray-400 uppercase">${c.label}</p></button>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Log + Converter -->
                    <div class="flex-1 flex flex-col md:flex-row min-h-0">
                        <!-- Calculation Log -->
                        <div class="flex-1 border-r flex flex-col bg-white/50">
                            <div class="p-4 border-b flex items-center justify-between bg-white shrink-0">
                                <h4 class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Calculation Log</h4>
                            </div>
                            <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                ${renderSavedExpressions()}
                            </div>
                            <div class="p-4 bg-white border-t space-y-3 shrink-0">
                                <input type="text" id="mathExprInput" placeholder="Expression (e.g. 5 * 10)..." class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                                <button onclick="window.saveMathExpr()" class="w-full py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all">Save Calculation</button>
                            </div>
                        </div>

                        <!-- Unit Converter (Desktop: bottom/side) -->
                        <div class="w-full md:w-72 flex flex-col bg-amber-50/10">
                            <div class="p-4 border-b bg-white shrink-0">
                                <h4 class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Converter</h4>
                            </div>
                            <div class="p-4 space-y-4">
                                <div class="space-y-2">
                                    <input type="number" id="unitInput" placeholder="0" oninput="window.convertUnits()" class="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-lg font-black outline-none shadow-sm">
                                    <select id="unitFrom" onchange="window.convertUnits()" class="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-[10px] font-bold outline-none">
                                        <option value="m">Meters</option><option value="cm">Centimeters</option><option value="kg">Kilograms</option><option value="g">Grams</option>
                                    </select>
                                </div>
                                <div class="flex justify-center"><span class="iconify text-gray-300" data-icon="mdi:arrow-down" data-width="20" data-height="20"></span></div>
                                <div class="space-y-2">
                                    <div id="unitOutput" class="w-full px-4 py-3 bg-amber-50 text-amber-700 rounded-xl text-lg font-black flex items-center border border-amber-100">0</div>
                                    <select id="unitTo" onchange="window.convertUnits()" class="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-[10px] font-bold outline-none">
                                        <option value="cm">Centimeters</option><option value="m">Meters</option><option value="g">Grams</option><option value="kg">Kilograms</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function switchMathTab(tab) { document.querySelectorAll('.math-tab').forEach(el => { el.classList.remove('bg-blue-600', 'text-white'); el.classList.add('bg-gray-100', 'text-gray-600'); }); document.getElementById(`tab_${tab}`).classList.remove('bg-gray-100', 'text-gray-600'); document.getElementById(`tab_${tab}`).classList.add('bg-blue-600', 'text-white'); document.getElementById('math_vars_content').classList.add('hidden'); document.getElementById('math_constants_content').classList.add('hidden'); document.getElementById(`math_${tab}_content`).classList.remove('hidden'); }
export function convertUnits() { const val = parseFloat(document.getElementById('unitInput').value), from = document.getElementById('unitFrom').value, to = document.getElementById('unitTo').value, output = document.getElementById('unitOutput'); if (isNaN(val)) { output.textContent = '0'; return; } const conversions = { m: 1, cm: 0.01, km: 1000, in: 0.0254, kg: 1, g: 0.001, lb: 0.453592 }; let result; if (conversions[from] && conversions[to]) { const length = ['m', 'cm', 'km', 'in'], mass = ['kg', 'g', 'lb']; if ((length.includes(from) && length.includes(to)) || (mass.includes(from) && mass.includes(to))) result = (val * conversions[from]) / conversions[to]; else result = 'Invalid'; } else result = 'Invalid'; output.textContent = typeof result === 'number' ? result.toLocaleString(undefined, { maximumFractionDigits: 4 }) : result; }
export function injectVariableToCalc(name) { const display = document.getElementById('calcDisplay'); if (!display) return; calcValue += name; display.value = calcValue; }
function renderCalculatorButtons() { const layout = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '±', '=']; return layout.map(btn => `<button onclick="window.calcPress('${btn}')" class="p-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${btn === '=' ? 'bg-primary text-white' : btn === 'C' ? 'bg-red-100 text-red-700' : ['÷', '×', '-', '+'].includes(btn) ? 'bg-blue-50 text-primary' : 'bg-gray-100 text-gray-700'}">${btn}</button>`).join(''); }
function renderSavedExpressions() { const expressions = App.work.mathExpressions || []; if (expressions.length === 0) return '<p class="text-gray-400 text-[9px] italic py-4 text-center">No history yet</p>'; return expressions.map(expr => `<div class="p-3 bg-white rounded-xl flex justify-between items-center group border border-gray-100 shadow-sm"><div class="min-w-0 flex-1"><code class="font-mono text-primary font-bold text-[10px] truncate block">${expr.expression}</code><span class="text-green-600 font-bold text-[10px]">= ${expr.result}</span></div><button onclick="window.deleteMathExpr('${expr.id}')" class="opacity-0 group-hover:opacity-100 text-red-200 hover:text-red-500 transition-opacity"><span class="iconify" data-icon="mdi:close-circle" data-width="14" data-height="14"></span></button></div>`).join(''); }
export async function saveMathExpr() { const exprInput = document.getElementById('mathExprInput'), expr = exprInput?.value.trim(); if (!expr) return; try { const result = eval(expr.replace(/×/g, '*').replace(/÷/g, '/')); App.work.mathExpressions.push({ id: 'math_' + Date.now(), expression: expr, result: Number.isFinite(result) ? result.toFixed(4) : 'Error' }); if (exprInput) exprInput.value = ''; await saveAndBroadcast('mathExpressions', App.work.mathExpressions); renderStudentContent(); toast('Expression saved!', 'success'); } catch { toast('Invalid expression', 'error'); } }
export async function deleteMathExpr(id) { App.work.mathExpressions = App.work.mathExpressions.filter(e => e.id !== id); await saveAndBroadcast('mathExpressions', App.work.mathExpressions); renderStudentContent(); }
window.calcPress = (btn) => { const display = document.getElementById('calcDisplay'); if (!display) return; if (btn === 'C') { calcValue = ''; } else if (btn === '=') { try { calcValue = eval(calcValue.replace(/×/g, '*').replace(/÷/g, '/')).toString(); } catch { calcValue = 'Error'; } } else { calcValue += btn; } display.value = calcValue || '0'; };
