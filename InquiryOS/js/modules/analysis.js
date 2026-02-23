/**
 * @file analysis.js
 * @description Logic for the SEP4 module: Analyzing and Interpreting Data. 
 * Implements data visualization using Chart.js based on the Investigation data table.
 */

/* global Chart */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

let chartInstance = null;
let chartType = 'scatter';

/**
 * Renders the Analysis Practice module.
 * @returns {string} HTML content for the module.
 */
export function renderAnalysisModule() {
    const dt = App.work.dataTable;
    const hasData = dt.rows.some(r => Object.values(r).some(v => v));
    
    return `
        <div class="max-w-6xl mx-auto">
            ${renderModuleHeader('Analyzing & Interpreting Data', 'mdi:chart-line', 'SEP4')}
            
            ${!hasData ? renderNoDataAlert() : renderChartWorkspace(dt)}
            
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mt-8">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-black text-gray-900 flex items-center gap-3">
                        <span class="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                            <span class="iconify" data-icon="mdi:calculator"></span>
                        </span>
                        Statistical Summary
                    </h3>
                    <span class="ngss-tag ngss-ccc">CCC3: Scale, Proportion, and Quantity</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${renderStatisticsSummary(dt) || `
                        <div class="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <p class="text-sm text-gray-400 font-medium">Add numeric data to see statistical analysis.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders an alert when no data is available for analysis.
 * @returns {string} HTML content.
 */
function renderNoDataAlert() {
    return `
        <div class="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center flex flex-col items-center">
            <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <span class="iconify text-5xl text-gray-300" data-icon="mdi:table-search"></span>
            </div>
            <h3 class="text-xl font-bold text-gray-400 mb-2">No Data Collected Yet</h3>
            <p class="text-gray-400 max-w-md mx-auto mb-8">You need to collect scientific data in your investigation before you can analyze and visualize it.</p>
            <button onclick="window.showStudentModule('investigation')" class="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <span class="iconify text-xl" data-icon="mdi:arrow-right"></span>
                Go to Investigation Practice
            </button>
        </div>
    `;
}


/**
 * Renders the chart settings and visualization workspace.
 * @param {Object} dt - Data table state.
 * @returns {string} HTML content.
 */
function renderChartWorkspace(dt) {
    return `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
                <div class="flex items-center gap-2 mb-6">
                    <h3 class="font-black text-gray-900 uppercase tracking-widest text-xs">Configuration</h3>
                </div>
                
                <div class="space-y-6 flex-1">
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">X-Axis Variable</label>
                        <select id="xAxisSelect" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all" onchange="window.updateChart()">
                            ${dt.columns.map(c => `<option value="${c.id}">${c.name}${c.unit ? ' (' + c.unit + ')' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Y-Axis Variable</label>
                        <select id="yAxisSelect" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all" onchange="window.updateChart()">
                            ${dt.columns.map((c, i) => `<option value="${c.id}" ${i === 1 ? 'selected' : ''}>${c.name}${c.unit ? ' (' + c.unit + ')' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">Visualization Type</label>
                        <div class="grid grid-cols-3 gap-2">
                            ${['scatter', 'line', 'bar'].map(type => `
                                <button onclick="window.setChartType('${type}')" 
                                    class="chart-type-btn p-3 rounded-xl border-2 transition-all flex items-center justify-center ${chartType === type ? 'border-primary bg-blue-50 text-primary' : 'border-gray-50 bg-white text-gray-400 hover:bg-gray-50'}" 
                                    data-type="${type}" title="${type.charAt(0).toUpperCase() + type.slice(1)}">
                                    <span class="iconify text-xl" data-icon="mdi:chart-${type === 'bar' ? 'bar' : (type === 'line' ? 'line-variant' : 'scatter-plot')}"></span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="mt-8 pt-6 border-t border-gray-50">
                    <button onclick="window.saveChartAsEvidence()" class="w-full py-4 bg-purple-50 text-purple-600 rounded-2xl font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-2">
                        <span class="iconify text-xl" data-icon="mdi:bookmark-plus"></span>
                        Save to Evidence
                    </button>
                </div>
            </div>
            
            <div class="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col h-full min-h-[500px]">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-xl font-black text-gray-900">Data Visualization</h3>
                        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Interactive Graphical Representation</p>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live
                    </div>
                </div>
                <div class="flex-1 relative">
                    <canvas id="analysisChart"></canvas>
                </div>
            </div>
        </div>
    `;
}


/**
 * Renders a summary of statistical values for numeric columns.
 * @param {Object} dt - Data table state.
 * @returns {string} HTML content.
 */
function renderStatisticsSummary(dt) {
    const numericCols = dt.columns.filter(c => c.type === 'number');
    return numericCols.map(col => {
        const values = dt.rows.map(r => parseFloat(r[col.id])).filter(v => !isNaN(v));
        if (values.length === 0) return '';
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        return `
            <div class="p-4 bg-gray-50 rounded-lg">
                <h4 class="text-sm font-medium text-gray-700 mb-2">${col.name}</h4>
                <div class="space-y-1 text-sm">
                    <p>Mean: <span class="font-bold">${mean.toFixed(2)}</span></p>
                    <p>Min: <span class="font-bold">${min.toFixed(2)}</span></p>
                    <p>Max: <span class="font-bold">${max.toFixed(2)}</span></p>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Initializes the Chart.js instance for data visualization.
 */
export function initChart() {
    window.updateChart();
}

/**
 * Refreshes the graph based on selected X/Y axes and table data.
 */
export function updateChart() {
    const canvas = document.getElementById('analysisChart');
    if (!canvas) return;
    
    const dt = App.work.dataTable;
    const xColId = document.getElementById('xAxisSelect')?.value || dt.columns[0]?.id;
    const yColId = document.getElementById('yAxisSelect')?.value || dt.columns[1]?.id;
    const xCol = dt.columns.find(c => c.id === xColId);
    const yCol = dt.columns.find(c => c.id === yColId);
    
    const data = dt.rows.map(row => ({
        x: parseFloat(row[xColId]) || 0,
        y: parseFloat(row[yColId]) || 0
    })).filter(d => !isNaN(d.x) && !isNaN(d.y));
    
    if (chartInstance) chartInstance.destroy();
    
    // Check if Chart is available globally
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not found.');
        return;
    }

    chartInstance = new Chart(canvas, {
        type: chartType === 'bar' ? 'bar' : 'scatter',
        data: {
            datasets: [{
                label: `${yCol?.name || 'Y'} vs ${xCol?.name || 'X'}`,
                data: data,
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'rgba(37, 99, 235, 1)',
                pointRadius: 8,
                showLine: chartType === 'line'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: xCol?.name + (xCol?.unit ? ` (${xCol.unit})` : '') } },
                y: { title: { display: true, text: yCol?.name + (yCol?.unit ? ` (${yCol.unit})` : '') }, beginAtZero: true }
            }
        }
    });
}

/**
 * Sets the current chart visualization type.
 * @param {string} type - 'scatter' | 'line' | 'bar'.
 */
export function setChartType(type) {
    chartType = type;
    window.updateChart();
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        const isActive = btn.dataset.type === type;
        btn.classList.toggle('bg-primary', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('bg-gray-200', !isActive);
    });
}

/**
 * Exports the current graph configuration as a visual artifact for the Evidence Bank.
 */
export async function saveChartAsEvidence() {
    const evidence = {
        id: 'ev_' + Date.now(),
        type: 'chart',
        title: 'Data Graph',
        description: `${chartType} chart showing relationships in data`,
        icon: 'mdi:chart-line',
        data: { chartType, dataTable: JSON.parse(JSON.stringify(App.work.dataTable)) },
        author: App.user.name,
        time: Date.now()
    };
    
    App.work.evidence.push(evidence);
    await saveAndBroadcast('evidence', App.work.evidence);
    toast('Chart saved as evidence!', 'success');
}
