/**
 * @file analysis.js
 * @description Logic for the SEP4 module: Analyzing and Interpreting Data. 
 * Implements data visualization using Chart.js based on the Investigation data table.
 */

/* global Chart */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderModuleHeader, renderEmptyState } from '../ui/renderer.js';
import { toast, deepClone, renderInfoTip } from '../ui/utils.js';

let chartInstance = null;
let chartType = 'scatter';
let selectedYCols = [];
let showTrendline = false;

export function renderAnalysisModule() {
    const dt = App.work.dataTable;
    const hasData = dt.rows.some(r => Object.values(r).some(v => v));
    if (selectedYCols.length === 0 && dt.columns.length > 1) selectedYCols = [dt.columns[1].id];
    
    return `
        <div class="panels-container">
            <!-- Chart Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Chart Designer">
                <div class="p-2 md:p-0">
                    ${renderModuleHeader('Analyzing Data', 'mdi:chart-line', 'SEP4', '', 'Turn your measurements into a visual story! Select your X-axis and your Y-axis variables to see patterns and relationships.')}
                </div>

                <div class="panel-content">
                    ${!hasData ? renderNoDataAlert() : renderChartWorkspace(dt)}
                </div>
            </div>

            <!-- Statistical Summary Panel -->
            <div class="bg-white border-b flex flex-col" data-card-title="Statistical Summary">
                <div class="sticky-panel-header md:hidden">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 shrink-0 border border-amber-100/50">
                            <span class="iconify text-base" data-icon="mdi:calculator"></span>
                        </div>
                        <h3>Statistics</h3>
                        ${renderInfoTip('Summary statistics help you find the "middle" of your data (Mean/Median) and see how much your measurements vary (Std Dev).')}
                    </div>
                </div>
                
                <div class="panel-content md:!p-6 md:justify-start">
                    <div class="hidden md:flex flex-col gap-4 mb-8">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm border border-white">
                                <span class="iconify text-2xl" data-icon="mdi:calculator"></span>
                            </div>
                            <div>
                                <h3 class="text-xl font-black text-gray-900 uppercase tracking-tight">Data Intelligence</h3>
                                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Automatic Statistical Analysis</p>
                            </div>
                        </div>
                        <p class="text-[10px] md:text-xs text-gray-500 font-medium leading-relaxed italic border-l-4 border-amber-200 pl-4">"Scientists use statistics to find trends and ensure their results aren't just due to chance."</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-1 gap-4 lg:gap-6 overflow-y-auto no-scrollbar pr-1">
                        ${renderStatisticsSummary(dt) || `<div class="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100"><span class="iconify text-3xl text-gray-200 mx-auto mb-2" data-icon="mdi:calculator-variant-outline"></span><p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Add numeric data to see statistics</p></div>`}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderNoDataAlert() {
    return renderEmptyState('No Data Collected Yet', 'You need to collect scientific data in your investigation before you can analyze and visualize it.', 'mdi:table-search') + `
        <div class="mt-4 text-center">
            <button onclick="window.showStudentModule('investigation')" class="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mx-auto">
                <span class="iconify text-xl" data-icon="mdi:arrow-right"></span>
                Go to Investigation Practice
            </button>
        </div>
    `;
}

function renderChartWorkspace(dt) {
    const numericCols = dt.columns.filter(c => c.type === 'number');
    return `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-0">
            <div class="lg:col-span-1 space-y-6 md:space-y-8 flex flex-col justify-center">
                <div class="space-y-3">
                    <label class="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Independent Axis (X)</label>
                    <div class="relative">
                        <span class="iconify absolute left-3 top-1/2 -translate-y-1/2 text-primary" data-icon="mdi:axis-x-arrow"></span>
                        <select id="xAxisSelect" class="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-800 outline-none focus:border-primary transition-all shadow-sm" onchange="window.updateChart()">
                            ${dt.columns.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="space-y-3">
                    <label class="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Dependent Variables (Y)</label>
                    <div class="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        ${numericCols.map(c => `
                            <button onclick="window.toggleYColumn('${c.id}')" 
                                class="px-4 py-2 rounded-xl text-[10px] md:text-xs font-black border-2 transition-all flex items-center gap-2 ${selectedYCols.includes(c.id) ? 'bg-primary border-primary text-white shadow-lg shadow-blue-100' : 'bg-white border-white text-gray-400 hover:border-gray-200'}">
                                <span class="w-2 h-2 rounded-full ${selectedYCols.includes(c.id) ? 'bg-white' : 'bg-gray-200'}"></span>
                                ${c.name}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="pt-4 space-y-3">
                    <button onclick="window.saveChartAsEvidence()" class="w-full py-4 bg-purple-600 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase shadow-xl shadow-purple-100 active:scale-95 transition-all flex items-center justify-center gap-2 group">
                        <span class="iconify text-xl group-hover:rotate-12 transition-transform" data-icon="mdi:folder-star"></span>
                        Archive to Evidence Bank
                    </button>
                    <p class="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest px-2">Saved charts can be used later in your scientific claim</p>
                </div>
            </div>
            <div class="lg:col-span-3 aspect-video lg:aspect-auto bg-gray-900 rounded-3xl border-4 border-gray-800 overflow-hidden relative shadow-2xl min-h-0 flex flex-col">
                <div class="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
                    <div class="flex gap-2">
                        <div class="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                        <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                        <div class="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                    </div>
                    <span class="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Scientific Visualization v2.0</span>
                </div>
                <div class="flex-1 p-6 min-h-0">
                    <canvas id="analysisChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

export function toggleYColumn(colId) { const idx = selectedYCols.indexOf(colId); if (idx > -1) { if (selectedYCols.length > 1) selectedYCols.splice(idx, 1); else toast('At least one Y-axis variable must be selected', 'warning'); } else { selectedYCols.push(colId); } window.updateChart(); }
export function toggleTrendline() { showTrendline = !showTrendline; window.updateChart(); }

function renderStatisticsSummary(dt) {
    const numericCols = dt.columns.filter(c => c.type === 'number');
    return numericCols.map(col => {
        const values = dt.rows.map(r => parseFloat(r[col.id])).filter(v => !isNaN(v)); if (values.length === 0) return '';
        const mean = values.reduce((a, b) => a + b, 0) / values.length, sorted = [...values].sort((a, b) => a - b), median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
        const counts = {}; values.forEach(v => counts[v] = (counts[v] || 0) + 1); const maxCount = Math.max(...Object.values(counts)), modes = Object.keys(counts).filter(k => counts[k] === maxCount).map(Number), modeStr = maxCount > 1 ? modes.join(', ') : 'None';
        const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length), max = Math.max(...values), min = Math.min(...values);
        return `<div class="p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all"><div class="flex items-center gap-3 mb-4"><div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><span class="iconify" data-icon="mdi:chart-scatter-plot"></span></div><h4 class="text-sm font-black text-gray-800 uppercase tracking-tight">${col.name}</h4></div><div class="grid grid-cols-2 gap-y-3 gap-x-4 text-[11px]"><div class="flex flex-col"><span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Mean</span><span class="text-gray-900 font-black text-base">${mean.toFixed(2)}</span></div><div class="flex flex-col"><span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Median</span><span class="text-gray-900 font-black text-base">${median.toFixed(2)}</span></div><div class="flex flex-col"><span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Std Dev</span><span class="text-gray-600 font-bold">${stdDev.toFixed(2)}</span></div><div class="flex flex-col"><span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Mode</span><span class="text-gray-600 font-bold truncate" title="${modeStr}">${modeStr}</span></div><div class="flex flex-col pt-2 border-t border-gray-200"><span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Min</span><span class="text-red-500 font-bold">${min.toFixed(2)}</span></div><div class="flex flex-col pt-2 border-t border-gray-200"><span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Max</span><span class="text-green-600 font-bold">${max.toFixed(2)}</span></div></div></div>`;
    }).join('');
}

export function initChart() { window.updateChart(); }
export function updateChart() {
    const canvas = document.getElementById('analysisChart'); if (!canvas) return;
    const dt = App.work.dataTable, xColId = document.getElementById('xAxisSelect')?.value || dt.columns[0]?.id, xCol = dt.columns.find(c => c.id === xColId);
    if (chartInstance) chartInstance.destroy(); if (typeof Chart === 'undefined') return;
    const colors = [{ bg: 'rgba(37, 99, 235, 0.6)', border: 'rgba(37, 99, 235, 1)' }, { bg: 'rgba(124, 58, 237, 0.6)', border: 'rgba(124, 58, 237, 1)' }, { bg: 'rgba(22, 163, 74, 0.6)', border: 'rgba(22, 163, 74, 1)' }, { bg: 'rgba(220, 38, 38, 0.6)', border: 'rgba(220, 38, 38, 1)' }, { bg: 'rgba(217, 119, 6, 0.6)', border: 'rgba(217, 119, 6, 1)' }];
    const datasets = selectedYCols.map((yColId, index) => {
        const yCol = dt.columns.find(c => c.id === yColId), data = dt.rows.map(row => ({ x: parseFloat(row[xColId]) || 0, y: parseFloat(row[yColId]) || 0 })).filter(d => !isNaN(d.x) && !isNaN(d.y)), color = colors[index % colors.length];
        return { label: yCol?.name || 'Y', data: data, backgroundColor: color.bg, borderColor: color.border, borderWidth: 2, pointRadius: 6, pointHoverRadius: 8, showLine: chartType === 'line' };
    });
    chartInstance = new Chart(canvas, { type: chartType === 'bar' ? 'bar' : 'scatter', data: { datasets }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { type: 'linear', title: { display: true, text: xCol?.name + (xCol?.unit ? ` (${xCol.unit})` : ''), font: { weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { title: { display: true, text: 'Measured Values', font: { weight: 'bold' } }, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } }, plugins: { legend: { position: 'top', labels: { usePointStyle: true, font: { weight: 'bold', size: 11 } } }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 12 } } } });
}

export function setChartType(type) { chartType = type; window.updateChart(); document.querySelectorAll('.chart-type-btn').forEach(btn => { const isActive = btn.dataset.type === type; btn.classList.toggle('bg-primary', isActive); btn.classList.toggle('text-white', isActive); btn.classList.toggle('bg-gray-200', !isActive); }); }
export async function saveChartAsEvidence() { const evidence = { id: 'ev_' + Date.now(), type: 'chart', title: 'Data Graph', description: `${chartType} chart showing relationships in data`, icon: 'mdi:chart-line', data: { chartType, dataTable: deepClone(App.work.dataTable) }, author: App.user.name, time: Date.now() }; App.work.evidence.push(evidence); await saveAndBroadcast('evidence', App.work.evidence); toast('Chart saved as evidence!', 'success'); }
