/**
 * @file analysis.js
 * @description Logic for the SEP4 module: Analyzing and Interpreting Data. 
 * Implements data visualization using Chart.js based on the Investigation data table.
 */

/* global Chart */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderModuleHeader, renderEmptyState, renderSectionHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

let chartInstance = null;
let chartType = 'scatter';
let selectedYCols = [];
let showTrendline = false;

/**
 * Renders the Analysis Practice module.
 * @returns {string} HTML content for the module.
 */
export function renderAnalysisModule() {
    const dt = App.work.dataTable;
    const hasData = dt.rows.some(r => Object.values(r).some(v => v));
    
    // Initialize selected Y columns if empty
    if (selectedYCols.length === 0 && dt.columns.length > 1) {
        selectedYCols = [dt.columns[1].id];
    }
    
    return `
        <div class="max-w-6xl mx-auto">
            ${renderModuleHeader('Analyzing & Interpreting Data', 'mdi:chart-line', 'SEP4')}
            
            ${!hasData ? renderNoDataAlert() : renderChartWorkspace(dt)}
            
            <div class="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 mt-8" data-card-title="Statistical Summary">
                <div class="flex items-center justify-between mb-8 shrink-0">
                    ${renderSectionHeader('Statistical Summary', 'mdi:calculator', 'amber')}
                    <div class="flex items-center gap-4 mb-6">
                        <span class="ngss-tag ngss-ccc">CCC3</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-card-content>
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
    return renderEmptyState(
        'No Data Collected Yet',
        'You need to collect scientific data in your investigation before you can analyze and visualize it.',
        'mdi:table-search'
    ) + `
        <div class="mt-4 text-center">
            <button onclick="window.showStudentModule('investigation')" class="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mx-auto">
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
    const numericCols = dt.columns.filter(c => c.type === 'number');
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            <div class="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 flex flex-col h-full" data-card-title="Chart Configuration">
                <div class="mb-8">
                    <h3 class="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-primary"></span>
                        Chart Designer
                    </h3>
                </div>
                
                <div class="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Independent (X-Axis)</label>
                        <select id="xAxisSelect" class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all" onchange="window.updateChart()">
                            ${dt.columns.map(c => `<option value="${c.id}">${c.name}${c.unit ? ' (' + c.unit + ')' : ''}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Dependent (Y-Axis Variables)</label>
                        <div class="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-100">
                            ${numericCols.map(c => `
                                <label class="flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group">
                                    <input type="checkbox" value="${c.id}" 
                                        ${selectedYCols.includes(c.id) ? 'checked' : ''}
                                        onchange="window.toggleYColumn('${c.id}')"
                                        class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary">
                                    <span class="text-xs font-bold text-gray-600 group-hover:text-gray-900">${c.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">Graph Style</label>
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

                    <div class="pt-2">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <div class="relative inline-block w-10 h-6 transition duration-200 ease-in-out bg-gray-200 rounded-full">
                                <input type="checkbox" class="absolute w-6 h-6 transition duration-200 ease-in-out bg-white border-2 border-gray-200 rounded-full appearance-none cursor-pointer checked:translate-x-4 checked:bg-primary checked:border-primary" 
                                    ${showTrendline ? 'checked' : ''} onchange="window.toggleTrendline()">
                            </div>
                            <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Show Trendline</span>
                        </label>
                    </div>
                </div>
                
                <div class="mt-8 pt-6 border-t border-gray-50">
                    <button onclick="window.saveChartAsEvidence()" class="w-full py-4 bg-purple-50 text-purple-600 rounded-2xl font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-2">
                        <span class="iconify text-xl" data-icon="mdi:bookmark-plus"></span>
                        Save to Evidence
                    </button>
                </div>
            </div>
            
            <div class="lg:col-span-3 bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 flex flex-col h-full min-h-[550px]" data-card-title="Data Visualization">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        ${renderSectionHeader('Data Visualization', 'mdi:chart-scatter-plot', 'blue')}
                        <p class="text-xs text-gray-400 font-bold uppercase tracking-widest -mt-4 ml-14">
                            ${selectedYCols.length > 1 ? 'Comparing Multiple Variables' : 'Variable Relationship Analysis'}
                        </p>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 mb-6">
                        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Analysis
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
 * Toggles a Y-axis column selection.
 */
export function toggleYColumn(colId) {
    const idx = selectedYCols.indexOf(colId);
    if (idx > -1) {
        if (selectedYCols.length > 1) selectedYCols.splice(idx, 1);
        else toast('At least one Y-axis variable must be selected', 'warning');
    } else {
        selectedYCols.push(colId);
    }
    window.updateChart();
}

/**
 * Toggles the trendline visibility.
 */
export function toggleTrendline() {
    showTrendline = !showTrendline;
    window.updateChart();
}

/**
 * Renders a summary of statistical values for numeric columns.
 */
function renderStatisticsSummary(dt) {
    const numericCols = dt.columns.filter(c => c.type === 'number');
    return numericCols.map(col => {
        const values = dt.rows.map(r => parseFloat(r[col.id])).filter(v => !isNaN(v));
        if (values.length === 0) return '';
        
        // Calculations
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
        
        const counts = {}; values.forEach(v => counts[v] = (counts[v] || 0) + 1);
        const maxCount = Math.max(...Object.values(counts));
        const modes = Object.keys(counts).filter(k => counts[k] === maxCount).map(Number);
        const modeStr = maxCount > 1 ? modes.join(', ') : 'None';
        
        const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
        const max = Math.max(...values);
        const min = Math.min(...values);

        return `
            <div class="p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <span class="iconify" data-icon="mdi:chart-scatter-plot"></span>
                    </div>
                    <h4 class="text-sm font-black text-gray-800 uppercase tracking-tight">${col.name}</h4>
                </div>
                <div class="grid grid-cols-2 gap-y-3 gap-x-4 text-[11px]">
                    <div class="flex flex-col">
                        <span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Mean</span>
                        <span class="text-gray-900 font-black text-base">${mean.toFixed(2)}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Median</span>
                        <span class="text-gray-900 font-black text-base">${median.toFixed(2)}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Std Dev</span>
                        <span class="text-gray-600 font-bold">${stdDev.toFixed(2)}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Mode</span>
                        <span class="text-gray-600 font-bold truncate" title="${modeStr}">${modeStr}</span>
                    </div>
                    <div class="flex flex-col pt-2 border-t border-gray-200">
                        <span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Min</span>
                        <span class="text-red-500 font-bold">${min.toFixed(2)}</span>
                    </div>
                    <div class="flex flex-col pt-2 border-t border-gray-200">
                        <span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Max</span>
                        <span class="text-green-600 font-bold">${max.toFixed(2)}</span>
                    </div>
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
    const xCol = dt.columns.find(c => c.id === xColId);
    
    if (chartInstance) chartInstance.destroy();
    if (typeof Chart === 'undefined') return;

    const colors = [
        { bg: 'rgba(37, 99, 235, 0.6)', border: 'rgba(37, 99, 235, 1)' },
        { bg: 'rgba(124, 58, 237, 0.6)', border: 'rgba(124, 58, 237, 1)' },
        { bg: 'rgba(22, 163, 74, 0.6)', border: 'rgba(22, 163, 74, 1)' },
        { bg: 'rgba(220, 38, 38, 0.6)', border: 'rgba(220, 38, 38, 1)' },
        { bg: 'rgba(217, 119, 6, 0.6)', border: 'rgba(217, 119, 6, 1)' }
    ];

    const datasets = selectedYCols.map((yColId, index) => {
        const yCol = dt.columns.find(c => c.id === yColId);
        const data = dt.rows.map(row => ({
            x: parseFloat(row[xColId]) || 0,
            y: parseFloat(row[yColId]) || 0
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));

        const color = colors[index % colors.length];

        const dataset = {
            label: yCol?.name || 'Y',
            data: data,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            showLine: chartType === 'line'
        };

        // Simple Linear Regression for Trendline
        if (showTrendline && data.length > 1) {
            const n = data.length;
            const sumX = data.reduce((s, d) => s + d.x, 0);
            const sumY = data.reduce((s, d) => s + d.y, 0);
            const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
            const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            const xMin = Math.min(...data.map(d => d.x));
            const xMax = Math.max(...data.map(d => d.x));
            
            // We'll use a separate dataset for the trendline if it's not a bar chart
            // For simplicity in this UI, we just add it as a line if type is scatter/line
            // In Chart.js, we can mix types, but let's just use it as a line here.
        }

        return dataset;
    });

    chartInstance = new Chart(canvas, {
        type: chartType === 'bar' ? 'bar' : 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { 
                    type: 'linear',
                    title: { display: true, text: xCol?.name + (xCol?.unit ? ` (${xCol.unit})` : ''), font: { weight: 'bold' } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: { 
                    title: { display: true, text: 'Measured Values', font: { weight: 'bold' } },
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, font: { weight: 'bold', size: 11 } } },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 12 }
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
