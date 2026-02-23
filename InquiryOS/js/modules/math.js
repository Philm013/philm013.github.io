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
                            <div class="space-y-8" data-card-title="Calculator & Variables">
                                <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                                    <div class="flex items-center justify-between mb-6">
                                        <h3 class="text-xl font-black text-gray-900">Scientific Calculator</h3>
                                        <div class="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                            <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            Solver
                                        </div>
                                    </div>
                                    <div class="relative drop-zone-calc" ondragover="window.calcDragOver(event)" ondragleave="window.calcDragLeave(event)" ondrop="window.calcDropVar(event)">
                                        <input type="text" id="calcDisplay" class="w-full px-6 py-6 bg-gray-900 text-white rounded-3xl font-mono text-3xl mb-6 text-right shadow-inner border-4 border-gray-800 focus:outline-none transition-all" placeholder="0" readonly>
                                        <div id="calcDropIndicator" class="absolute inset-0 bg-blue-500/20 rounded-3xl border-4 border-dashed border-blue-400 hidden items-center justify-center pointer-events-none mb-6">
                                            <span class="bg-white text-blue-600 px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
                                                <span class="iconify" data-icon="mdi:plus-circle"></span> Drop Variable Here
                                            </span>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-4 gap-3">
                                        ${renderCalculatorButtons()}
                                    </div>
                                </div>
            
                                <!-- Variable Palette & Constants -->
                                <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                                    <div class="flex items-center justify-between mb-6 border-b pb-4">
                                        <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mathematical Assets</h3>
                                        <div class="flex gap-2">
                                            <button onclick="window.switchMathTab('vars')" id="tab_vars" class="math-tab px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold">Variables</button>
                                            <button onclick="window.switchMathTab('constants')" id="tab_constants" class="math-tab px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">Constants</button>
                                        </div>
                                    </div>
            
                                                            <!-- Variables Tab -->
                                                            <div id="math_vars_content" class="space-y-4 mobile-library-panel md:bg-transparent md:p-0 md:border-0">
                                                                <div class="flex flex-wrap gap-2">
                                                                    ${vars.map(v => `
                                                                        <div class="relative group/var">
                                                                            <button 
                                                                                draggable="true"
                                                                                ondragstart="window.varDragStart(event, '${v.name}')"
                                                                                onclick="window.toggleVarMenu(event, '${v.name}')"
                                                                                class="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border-2 border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2 group cursor-grab active:cursor-grabbing">
                                                                                <span class="iconify group-hover:rotate-12 transition-transform" data-icon="mdi:variable"></span>
                                                                                ${v.name}
                                                                            </button>
                                                                            
                                                                            <!-- Send to Menu -->
                                                                            <div id="varMenu_${v.name.replace(/\s+/g, '_')}" class="var-menu hidden absolute bottom-full left-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-bottom-2 duration-200">
                                                                                <div class="p-3 bg-gray-50 border-b">
                                                                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Send Variable To:</p>
                                                                                </div>
                                                                                <div class="p-1">
                                                                                    <button onclick="window.injectVariableToCalc('${v.name}'); window.hideAllVarMenus();" class="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                                                                                        <span class="iconify text-lg" data-icon="mdi:calculator"></span>
                                                                                        Calculator
                                                                                    </button>
                                                                                    <button onclick="window.injectVariableToFormula('${v.name}'); window.hideAllVarMenus();" class="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-all">
                                                                                        <span class="iconify text-lg" data-icon="mdi:function-variant"></span>
                                                                                        Formula Field
                                                                                    </button>
                                                                                    <button onclick="window.hideAllVarMenus()" class="md:hidden w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all border-t mt-1">
                                                                                        <span class="iconify text-lg" data-icon="mdi:close"></span>
                                                                                        Cancel
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    `).join('')}
                                                                    ${vars.length === 0 ? `
                                                                        <div class="w-full py-6 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                                                            <p class="text-xs text-gray-400 font-medium px-4">Define variables in the Investigation module to use them here.</p>
                                                                        </div>
                                                                    ` : ''}
                                                                </div>
                                                            </div>
                                    
                                                            <!-- Constants Tab -->
                                                            <div id="math_constants_content" class="hidden space-y-4 mobile-library-panel md:bg-transparent md:p-0 md:border-0">
                                                                <div class="grid grid-cols-2 gap-2">
                                                                    ${[
                                                                        { name: 'π', val: '3.14159', label: 'Pi' },
                                                                        { name: 'g', val: '9.81', label: 'Gravity' },
                                                                        { name: 'c', val: '299792458', label: 'Light Speed' },
                                                                        { name: 'G', val: '6.67e-11', label: 'Gravitational' },
                                                                        { name: 'e', val: '2.71828', label: 'Euler' },
                                                                        { name: 'NA', val: '6.022e23', label: 'Avogadro' }
                                                                    ].map(c => `
                                                                        <button onclick="window.injectVariableToCalc('${c.val}')" 
                                                                            draggable="true" ondragstart="window.varDragStart(event, '${c.val}')"
                                                                            class="p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-left hover:border-primary transition-all group">
                                                                            <div class="flex justify-between items-center mb-1">
                                                                                <span class="font-mono font-black text-primary text-lg">${c.name}</span>
                                                                                <span class="iconify text-gray-300 group-hover:text-primary" data-icon="mdi:plus-circle"></span>
                                                                            </div>
                                                                            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${c.label}</p>
                                                                        </button>
                                                                    `).join('')}
                                                                </div>
                                                            </div>
                                    
                                </div>
                            </div>
            
                            <div class="space-y-8" data-card-title="Unit Conversion">
                                <!-- Unit Converter -->
                                <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
                                    <div class="flex items-center gap-3 mb-6">
                                        <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                            <span class="iconify text-xl" data-icon="mdi:unite"></span>
                                        </div>
                                        <div>
                                            <h3 class="text-base font-black text-gray-900">Unit Converter</h3>
                                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CCSS.Math.Content.Measurement</p>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div class="space-y-2">
                                            <input type="number" id="unitInput" placeholder="Value" oninput="window.convertUnits()" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500">
                                            <select id="unitFrom" onchange="window.convertUnits()" class="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold">
                                                <optgroup label="Length">
                                                    <option value="m">Meters (m)</option>
                                                    <option value="cm">Centimeters (cm)</option>
                                                    <option value="km">Kilometers (km)</option>
                                                    <option value="in">Inches (in)</option>
                                                </optgroup>
                                                <optgroup label="Mass">
                                                    <option value="kg">Kilograms (kg)</option>
                                                    <option value="g">Grams (g)</option>
                                                    <option value="lb">Pounds (lb)</option>
                                                </optgroup>
                                                <optgroup label="Temp">
                                                    <option value="c">Celsius (°C)</option>
                                                    <option value="f">Fahrenheit (°F)</option>
                                                    <option value="k">Kelvin (K)</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div class="space-y-2">
                                            <div id="unitOutput" class="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm font-black text-amber-700 h-[46px] flex items-center">0</div>
                                            <select id="unitTo" onchange="window.convertUnits()" class="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold">
                                                <optgroup label="Length">
                                                    <option value="m">Meters (m)</option>
                                                    <option value="cm" selected>Centimeters (cm)</option>
                                                    <option value="km">Kilometers (km)</option>
                                                    <option value="in">Inches (in)</option>
                                                </optgroup>
                                                <optgroup label="Mass">
                                                    <option value="kg">Kilograms (kg)</option>
                                                    <option value="g">Grams (g)</option>
                                                    <option value="lb">Pounds (lb)</option>
                                                </optgroup>
                                                <optgroup label="Temp">
                                                    <option value="c">Celsius (°C)</option>
                                                    <option value="f">Fahrenheit (°F)</option>
                                                    <option value="k">Kelvin (K)</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Expressions & Log -->
                            <div class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex flex-col h-full" data-card-title="Computational Log">
            
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h3 class="text-xl font-black text-gray-900">Computational Log</h3>
                            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Saved Expressions</p>
                        </div>
                        <span class="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">${App.work.mathExpressions?.length || 0} Saved</span>
                    </div>

                    <div class="space-y-4 flex-1 overflow-y-auto max-h-[500px] mb-8 pr-2 custom-scrollbar" id="savedExpressions">
                        ${renderSavedExpressions()}
                    </div>

                    <div class="mt-auto">
                        <div class="p-6 bg-purple-50 rounded-3xl border border-purple-100">
                            <h4 class="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4 ml-1">Formula Builder</h4>
                            <div class="space-y-3">
                                <div class="relative drop-zone-formula" ondragover="window.formulaDragOver(event)" ondragleave="window.formulaDragLeave(event)" ondrop="window.formulaDropVar(event)">
                                    <input type="text" id="mathExprInput" placeholder="Expression (e.g. 2 * π * radius)" 
                                        class="w-full px-5 py-3 bg-white border-2 border-purple-100 rounded-2xl font-mono text-sm focus:border-purple-500 focus:outline-none transition-all">
                                    <div id="formulaDropIndicator" class="absolute inset-0 bg-purple-500/20 rounded-2xl border-2 border-dashed border-purple-400 hidden items-center justify-center pointer-events-none">
                                        <span class="bg-white text-purple-600 px-3 py-1 rounded-full font-bold text-[10px] shadow-md">Drop Here</span>
                                    </div>
                                </div>
                                <input type="text" id="mathNoteInput" placeholder="Context: e.g. Circumference of wheel" 
                                    class="w-full px-5 py-3 bg-white border-2 border-purple-100 rounded-2xl text-sm font-medium focus:border-purple-500 focus:outline-none transition-all">
                                <button onclick="window.saveMathExpr()" class="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-100 hover:-translate-y-0.5 transition-all">
                                    Calculate & Archive
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
 * Tab Switching Logic
 */
export function switchMathTab(tab) {
    document.querySelectorAll('.math-tab').forEach(el => {
        el.classList.remove('bg-blue-600', 'text-white');
        el.classList.add('bg-gray-100', 'text-gray-600');
    });
    document.getElementById(`tab_${tab}`).classList.remove('bg-gray-100', 'text-gray-600');
    document.getElementById(`tab_${tab}`).classList.add('bg-blue-600', 'text-white');
    
    document.getElementById('math_vars_content').classList.add('hidden');
    document.getElementById('math_constants_content').classList.add('hidden');
    document.getElementById(`math_${tab}_content`).classList.remove('hidden');
}

/**
 * Unit Conversion Logic
 */
export function convertUnits() {
    const val = parseFloat(document.getElementById('unitInput').value);
    const from = document.getElementById('unitFrom').value;
    const to = document.getElementById('unitTo').value;
    const output = document.getElementById('unitOutput');
    
    if (isNaN(val)) { output.textContent = '0'; return; }

    const conversions = {
        // Length (base meter)
        m: 1, cm: 0.01, km: 1000, in: 0.0254,
        // Mass (base kg)
        kg: 1, g: 0.001, lb: 0.453592
    };

    let result;
    
    // Handle Temp separately
    if (['c', 'f', 'k'].includes(from) && ['c', 'f', 'k'].includes(to)) {
        let celsius;
        if (from === 'c') celsius = val;
        else if (from === 'f') celsius = (val - 32) * 5/9;
        else if (from === 'k') celsius = val - 273.15;
        
        if (to === 'c') result = celsius;
        else if (to === 'f') result = celsius * 9/5 + 32;
        else if (to === 'k') result = celsius + 273.15;
    } else if (conversions[from] && conversions[to]) {
        // Only convert within the same group (mass to mass, length to length)
        const length = ['m', 'cm', 'km', 'in'];
        const mass = ['kg', 'g', 'lb'];
        
        if ((length.includes(from) && length.includes(to)) || (mass.includes(from) && mass.includes(to))) {
            result = (val * conversions[from]) / conversions[to];
        } else {
            result = 'Invalid';
        }
    } else {
        result = 'Invalid';
    }

    output.textContent = typeof result === 'number' ? result.toLocaleString(undefined, { maximumFractionDigits: 4 }) : result;
}

/**
 * Variable Drag Handlers
 */
export function varDragStart(e, name) {
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'copy';
}

export function calcDragOver(e) {
    e.preventDefault();
    document.getElementById('calcDropIndicator')?.classList.remove('hidden');
    document.getElementById('calcDropIndicator')?.classList.add('flex');
}

export function calcDragLeave(e) {
    document.getElementById('calcDropIndicator')?.classList.add('hidden');
    document.getElementById('calcDropIndicator')?.classList.remove('flex');
}

export function calcDropVar(e) {
    e.preventDefault();
    window.calcDragLeave(e);
    const name = e.dataTransfer.getData('text/plain');
    if (name) window.injectVariableToCalc(name);
}

export function formulaDragOver(e) {
    e.preventDefault();
    document.getElementById('formulaDropIndicator')?.classList.remove('hidden');
    document.getElementById('formulaDropIndicator')?.classList.add('flex');
}

export function formulaDragLeave(e) {
    document.getElementById('formulaDropIndicator')?.classList.add('hidden');
    document.getElementById('formulaDropIndicator')?.classList.remove('flex');
}

export function formulaDropVar(e) {
    e.preventDefault();
    window.formulaDragLeave(e);
    const name = e.dataTransfer.getData('text/plain');
    if (name) window.injectVariableToFormula(name);
}

/**
 * Variable Menu Handlers
 */
export function toggleVarMenu(e, name) {
    e.stopPropagation();
    const menuId = `varMenu_${name.replace(/\s+/g, '_')}`;
    const alreadyOpen = !document.getElementById(menuId).classList.contains('hidden');
    window.hideAllVarMenus();
    if (!alreadyOpen) {
        document.getElementById(menuId).classList.remove('hidden');
        // Add mobile backdrop
        if (window.innerWidth <= 768) {
            const backdrop = document.createElement('div');
            backdrop.id = 'varMenuBackdrop';
            backdrop.className = 'fixed inset-0 bg-black/40 z-[190] animate-in fade-in duration-200';
            backdrop.onclick = window.hideAllVarMenus;
            document.body.appendChild(backdrop);
        }
    }
}

export function hideAllVarMenus() {
    document.querySelectorAll('.var-menu').forEach(m => m.classList.add('hidden'));
    document.getElementById('varMenuBackdrop')?.remove();
}

document.addEventListener('click', () => window.hideAllVarMenus());

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
 * Injects a variable name into the formula input field.
 */
export function injectVariableToFormula(name) {
    const input = document.getElementById('mathExprInput');
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.slice(0, start) + name + text.slice(end);
    input.focus();
    input.setSelectionRange(start + name.length, start + name.length);
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
