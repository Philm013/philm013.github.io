/**
 * @file math.js
 * @description Logic for the SEP5 module: Using Mathematics and Computational Thinking. 
 * Implements a scientific calculator and a persistent list of mathematical expressions.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

let calcValue = '';

/**
 * Renders the Math Practice module.
 * @returns {string} HTML content for the module.
 */
export function renderMathModule() {
    const vars = (App.work.variables || []).filter(v => v.type);
    
    return `
        <div class="max-w-6xl mx-auto">
            ${renderModuleHeader('Using Mathematics', 'mdi:calculator', 'SEP5')}
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <!-- Calculator & Variable Injector -->
                <div class="space-y-8">
                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-xl font-black text-gray-900">Scientific Calculator</h3>
                            <div class="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                                Solver
                            </div>
                        </div>
                        <input type="text" id="calcDisplay" class="w-full px-6 py-6 bg-gray-900 text-white rounded-3xl font-mono text-3xl mb-6 text-right shadow-inner border-4 border-gray-800" placeholder="0" readonly>
                        <div class="grid grid-cols-4 gap-3">
                            ${renderCalculatorButtons()}
                        </div>
                    </div>

                    <!-- Variable Palette -->
                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                        <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-4">Variable Injection Palette</h3>
                        <div class="flex flex-wrap gap-2">
                            ${vars.map(v => `
                                <button onclick="window.injectVariableToCalc('${v.name}')" 
                                    class="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border-2 border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2 group">
                                    <span class="iconify group-hover:rotate-12 transition-transform" data-icon="mdi:link-variant"></span>
                                    ${v.name}
                                </button>
                            `).join('')}
                            ${vars.length === 0 ? `
                                <div class="w-full py-6 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <p class="text-xs text-gray-400 font-medium px-4">Define variables in the Investigation module to use them in calculations.</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Expressions & Log -->
                <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex flex-col h-full">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h3 class="text-xl font-black text-gray-900">Computational Log</h3>
                            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Saved Expressions</p>
                        </div>
                        <span class="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">${App.work.mathExpressions?.length || 0} Saved</span>
                    </div>

                    <div class="space-y-4 flex-1 overflow-y-auto max-h-[400px] mb-8 pr-2 custom-scrollbar" id="savedExpressions">
                        ${renderSavedExpressions()}
                    </div>

                    <div class="mt-auto">
                        <div class="p-6 bg-purple-50 rounded-3xl border border-purple-100">
                            <h4 class="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4 ml-1">Manual Entry & Notes</h4>
                            <div class="space-y-3">
                                <input type="text" id="mathExprInput" placeholder="Expression (e.g. 2 * 3.14 * radius)" 
                                    class="w-full px-5 py-3 bg-white border-2 border-purple-100 rounded-2xl font-mono text-sm focus:border-purple-500 focus:outline-none transition-all">
                                <input type="text" id="mathNoteInput" placeholder="What does this represent?" 
                                    class="w-full px-5 py-3 bg-white border-2 border-purple-100 rounded-2xl text-sm font-medium focus:border-purple-500 focus:outline-none transition-all">
                                <button onclick="window.saveMathExpr()" class="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-100 hover:-translate-y-0.5 transition-all">
                                    Archive Calculation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Injects a variable name into the calculator display.
 */
export function injectVariableToCalc(name) {
    const display = document.getElementById('calcDisplay');
    if (!display) return;
    calcValue += name;
    display.value = calcValue;
}

/**
 * Renders the calculator button grid.
 * @returns {string} HTML content.
 */
function renderCalculatorButtons() {
    const layout = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '±', '='];
    return layout.map(btn => `
        <button onclick="window.calcPress('${btn}')" 
            class="p-3 rounded-lg text-lg font-bold transition-all shadow-sm ${
                btn === '=' ? 'bg-primary text-white hover:bg-blue-600' : 
                btn === 'C' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 
                ['÷', '×', '-', '+'].includes(btn) ? 'bg-blue-50 text-primary hover:bg-blue-100' : 
                'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }">
            ${btn}
        </button>
    `).join('');
}

/**
 * Renders the list of saved mathematical expressions.
 * @returns {string} HTML content.
 */
function renderSavedExpressions() {
    const expressions = App.work.mathExpressions || [];
    if (expressions.length === 0) return '<p class="text-gray-400 text-sm italic py-4 text-center">No saved expressions yet.</p>';
    
    return expressions.map(expr => `
        <div class="p-3 bg-gray-50 rounded-lg flex justify-between items-center group border border-gray-100 shadow-sm">
            <div>
                <code class="font-mono text-primary font-bold">${expr.expression}</code>
                <span class="text-green-600 ml-2 font-bold">= ${expr.result}</span>
                ${expr.note ? `<p class="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tight">${expr.note}</p>` : ''}
            </div>
            <button onclick="window.deleteMathExpr('${expr.id}')" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                <span class="iconify" data-icon="mdi:close-circle"></span>
            </button>
        </div>
    `).join('');
}

/**
 * Renders the form for manually entering and saving expressions.
 * @returns {string} HTML content.
 */
function renderMathEntryForm() {
    return `
        <div class="space-y-2 mt-4 pt-4 border-t border-gray-100">
            <input type="text" id="mathExprInput" placeholder="Enter expression (e.g., 2*3.14*5)" 
                class="w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-primary focus:outline-none">
            <input type="text" id="mathNoteInput" placeholder="Add a note (optional)" 
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none">
            <button onclick="window.saveMathExpr()" class="w-full py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition-colors shadow-sm">
                Calculate & Save to Work
            </button>
        </div>
    `;
}

/**
 * Handles standard calculator button interactions.
 * @param {string} btn - The value of the button pressed (e.g., '1', '+', '=', 'C').
 */
export function calcPress(btn) {
    const display = document.getElementById('calcDisplay');
    if (!display) return;
    
    if (btn === 'C') {
        calcValue = '';
    } else if (btn === '=') {
        try {
            let expr = calcValue.replace(/×/g, '*').replace(/÷/g, '/');
            calcValue = String(eval(expr));
        } catch {
            calcValue = 'Error';
        }
    } else if (btn === '±') {
        if (calcValue.startsWith('-')) calcValue = calcValue.slice(1);
        else if (calcValue) calcValue = '-' + calcValue;
    } else {
        calcValue += btn;
    }
    
    display.value = calcValue || '0';
}

/**
 * Evaluates a mathematical expression from the input field and saves it to the state.
 */
export async function saveMathExpr() {
    const exprInput = document.getElementById('mathExprInput');
    const noteInput = document.getElementById('mathNoteInput');
    const expr = exprInput?.value.trim();
    const note = noteInput?.value.trim();
    
    if (!expr) return;
    
    try {
        const result = eval(expr.replace(/×/g, '*').replace(/÷/g, '/'));
        App.work.mathExpressions.push({
            id: 'math_' + Date.now(),
            expression: expr,
            result: Number.isFinite(result) ? result.toFixed(4) : 'Error',
            note
        });
        
        if (exprInput) exprInput.value = '';
        if (noteInput) noteInput.value = '';
        
        await saveAndBroadcast('mathExpressions', App.work.mathExpressions);
        renderStudentContent();
        toast('Expression saved!', 'success');
    } catch {
        toast('Invalid expression', 'error');
    }
}

/**
 * Deletes a saved mathematical expression.
 * @param {string} id - The unique ID of the expression to remove.
 */
export async function deleteMathExpr(id) {
    App.work.mathExpressions = App.work.mathExpressions.filter(e => e.id !== id);
    await saveAndBroadcast('mathExpressions', App.work.mathExpressions);
    renderStudentContent();
}
