/**
 * @file analysis.js
 * @description Logic for the SEP4 module: Analyzing and Interpreting Data.
 */

/* global Chart */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast, deepClone } from '../ui/utils.js';

export function renderAnalysisModule() {
    return `
        <div class="panels-container">
            <!-- Chart Designer Panel -->
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Chart Designer">
                ${renderModuleHeader('Data Visualization', 'mdi:chart-line', 'SEP4', `
                    <button onclick="window.saveChartAsEvidence()" class="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Save Evidence">
                        <span class="iconify" data-icon="mdi:star-outline" data-width="18" data-height="18"></span>
                    </button>
                `, 'Choose your variables to see patterns in your data!')}

                <div class="panel-content flex-1 flex flex-col overflow-hidden !p-0">
                    <div class="p-4 bg-gray-50/50 border-b flex flex-wrap gap-4 items-center shrink-0">
                        <div class="flex items-center gap-2">
                            <label class="text-[9px] font-black uppercase text-gray-400">X-Axis</label>
                            <select onchange="window.updateChartConfig('xAxis', this.value)" class="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none">
                                <option value="">Select Column</option>
                                ${(App.work.dataTable?.columns || []).map(c => `<option value="${c.id}" ${App.work.chartConfig?.xAxis === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-[9px] font-black uppercase text-gray-400">Y-Axis</label>
                            <select onchange="window.updateChartConfig('yAxis', this.value)" class="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none">
                                <option value="">Select Column</option>
                                ${(App.work.dataTable?.columns || []).map(c => `<option value="${c.id}" ${App.work.chartConfig?.yAxis === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-[9px] font-black uppercase text-gray-400">Type</label>
                            <div class="flex bg-white border border-gray-200 rounded-lg p-0.5">
                                ${['line', 'bar', 'scatter'].map(t => `
                                    <button onclick="window.updateChartConfig('type', '${t}')" class="p-1.5 rounded-md transition-all ${App.work.chartConfig?.type === t ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}">
                                        <span class="iconify" data-icon="mdi:chart-${t==='scatter'?'scatter-plot':t}" data-width="14" data-height="14"></span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex-1 relative p-4 md:p-8 bg-white overflow-hidden">
                        <canvas id="analysisChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Summary Panel -->
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Statistical Summary">
                ${renderModuleHeader('Data Summary', 'mdi:calculator-variant', 'SEP4', '', 'Look for the highest, lowest, and average values to understand what your data is saying.')}
                
                <div class="panel-content space-y-6 md:space-y-8 md:!p-6 overflow-y-auto">
                    <div class="grid grid-cols-2 gap-3">
                        ${renderStatsCards()}
                    </div>
                    
                    <div class="space-y-3">
                        <label class="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Trend Analysis</label>
                        <textarea onchange="window.saveTrendNote(this.value)" 
                            placeholder="What patterns or trends do you see in the graph?"
                            class="w-full px-5 py-4 bg-blue-50/30 border-2 border-blue-100 rounded-2xl text-sm md:text-base font-medium text-gray-700 focus:border-primary focus:bg-white outline-none transition-all shadow-inner"
                            rows="4">${App.work.analysisTrend || ''}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStatsCards() {
    const data = App.work.dataTable?.rows || [];
    const yColId = App.work.chartConfig?.yAxis;
    if (!yColId || data.length === 0) return `<div class="col-span-full py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100"><p class="text-[10px] font-black text-gray-300 uppercase tracking-widest">Select Y-Axis to see stats</p></div>`;
    
    const values = data.map(r => parseFloat(r[yColId])).filter(v => !isNaN(v));
    if (values.length === 0) return '';

    const stats = {
        Average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        Maximum: Math.max(...values),
        Minimum: Math.min(...values),
        Total: values.length
    };

    return Object.entries(stats).map(([label, val]) => `
        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
            <span class="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">${label}</span>
            <span class="text-xl md:text-2xl font-black text-primary tracking-tighter">${val}</span>
        </div>
    `).join('');
}

export function initChart() {
    const canvas = document.getElementById('analysisChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const config = App.work.chartConfig || { type: 'line', xAxis: '', yAxis: '' };
    const dt = App.work.dataTable;
    if (!config.xAxis || !config.yAxis || !dt) return;

    const xCol = dt.columns.find(c => c.id === config.xAxis);
    const yCol = dt.columns.find(c => c.id === config.yAxis);
    if (!xCol || !yCol) return;

    const labels = dt.rows.map(r => r[config.xAxis]);
    const data = dt.rows.map(r => parseFloat(r[config.yAxis]));

    if (App.activeChart) App.activeChart.destroy();

    App.activeChart = new Chart(canvas, {
        type: config.type === 'scatter' ? 'scatter' : config.type,
        data: {
            labels: labels,
            datasets: [{
                label: yCol.name,
                data: config.type === 'scatter' ? dt.rows.map(r => ({ x: r[config.xAxis], y: r[config.yAxis] })) : data,
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: yCol.name + (yCol.unit ? ` (${yCol.unit})` : ''), font: { weight: 'bold' } } },
                x: { title: { display: true, text: xCol.name + (xCol.unit ? ` (${xCol.unit})` : ''), font: { weight: 'bold' } } }
            }
        }
    });
}

export async function updateChartConfig(key, val) { if (!App.work.chartConfig) App.work.chartConfig = { type: 'line', xAxis: '', yAxis: '' }; App.work.chartConfig[key] = val; await saveAndBroadcast('chartConfig', App.work.chartConfig); renderStudentContent(); }
export async function saveTrendNote(val) { App.work.analysisTrend = val; await saveAndBroadcast('analysisTrend', val); }
export async function saveChartAsEvidence() { const canvas = document.getElementById('analysisChart'); if (!canvas) return; const evidence = { id: 'ev_' + Date.now(), type: 'chart', title: 'Data Analysis', description: `Chart of ${App.work.chartConfig?.yAxis || 'data'}`, icon: 'mdi:chart-line', data: { image: canvas.toDataURL(), config: deepClone(App.work.chartConfig) }, author: App.user.name, time: Date.now() }; App.work.evidence.push(evidence); await saveAndBroadcast('evidence', App.work.evidence); toast('Chart saved!', 'success'); }
