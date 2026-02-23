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
        <div class="max-w-5xl mx-auto">
            ${renderModuleHeader('Analyzing & Interpreting Data', 'mdi:chart-line', 'SEP4')}
            
            ${!hasData ? renderNoDataAlert() : renderChartWorkspace(dt)}
            
            <div class="bg-white rounded-xl shadow-sm border p-6 mt-6">
                <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    Statistics
                    <span class="ngss-tag ngss-ccc">CCC3</span>
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${renderStatisticsSummary(dt)}
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
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
            <span class="iconify text-amber-500 text-4xl" data-icon="mdi:alert"></span>
            <p class="mt-2 text-amber-700">Collect data in the Investigation module first.</p>
            <button onclick="window.showStudentModule('investigation')" class="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg">
                Go to Investigation
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
        <div class="grid md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white rounded-xl shadow-sm border p-4">
                <h3 class="font-semibold text-gray-900 mb-4">Chart Settings</h3>
                <div class="space-y-4">
                    <div>
                        <label class="text-sm text-gray-600 block mb-1">X-Axis</label>
                        <select id="xAxisSelect" class="w-full px-3 py-2 border rounded-lg" onchange="window.updateChart()">
                            ${dt.columns.map(c => `<option value="${c.id}">${c.name}${c.unit ? ' (' + c.unit + ')' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-sm text-gray-600 block mb-1">Y-Axis</label>
                        <select id="yAxisSelect" class="w-full px-3 py-2 border rounded-lg" onchange="window.updateChart()">
                            ${dt.columns.map((c, i) => `<option value="${c.id}" ${i === 1 ? 'selected' : ''}>${c.name}${c.unit ? ' (' + c.unit + ')' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-sm text-gray-600 block mb-2">Chart Type</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button onclick="window.setChartType('scatter')" class="chart-type-btn px-3 py-2 rounded text-sm ${chartType === 'scatter' ? 'bg-primary text-white' : 'bg-gray-200'}" data-type="scatter">Scatter</button>
                            <button onclick="window.setChartType('line')" class="chart-type-btn px-3 py-2 rounded text-sm ${chartType === 'line' ? 'bg-primary text-white' : 'bg-gray-200'}" data-type="line">Line</button>
                            <button onclick="window.setChartType('bar')" class="chart-type-btn px-3 py-2 rounded text-sm ${chartType === 'bar' ? 'bg-primary text-white' : 'bg-gray-200'}" data-type="bar">Bar</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="md:col-span-2 bg-white rounded-xl shadow-sm border p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-semibold text-gray-900">Graph</h3>
                    <button onclick="window.saveChartAsEvidence()" class="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200">
                        <span class="iconify mr-1" data-icon="mdi:bookmark"></span> Save as Evidence
                    </button>
                </div>
                <div class="h-64">
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
