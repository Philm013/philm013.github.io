/**
 * @file utils.js
 * @description General UI utility functions, toast notifications, and calculation helpers.
 */

import { App } from '../core/state.js';
import { saveToStorage } from '../core/sync.js';

/**
 * Displays a temporary toast notification.
 */
export function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = { 
        success: 'bg-green-500', 
        error: 'bg-red-500', 
        info: 'bg-blue-500', 
        warning: 'bg-amber-500' 
    };
    const icons = { 
        success: 'mdi:check-circle', 
        error: 'mdi:close-circle', 
        info: 'mdi:information', 
        warning: 'mdi:alert' 
    };
    
    const el = document.createElement('div');
    el.className = `toast ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-300`;
    el.innerHTML = `<span class="iconify" data-icon="${icons[type]}"></span><span class="text-sm font-bold">${message}</span>`;
    container.appendChild(el);
    
    setTimeout(() => {
        el.classList.add('animate-out', 'fade-out', 'slide-out-to-right');
        setTimeout(() => el.remove(), 3000);
    }, 3000);
}

/**
 * Opens the session menu modal.
 */
export function openSessionMenu() {
    const modal = document.getElementById('sessionMenuModal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Closes the session menu modal.
 */
export function closeSessionMenu() {
    const modal = document.getElementById('sessionMenuModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Saves the current state explicitly.
 */
export async function saveCurrentSession() {
    const ok = await saveToStorage();
    if (ok) toast('Session saved to local storage', 'success');
    closeSessionMenu();
}

/**
 * Exports the current work and settings as a JSON file.
 */
export function exportSession() {
    const data = JSON.stringify({ 
        work: App.work, 
        teacherSettings: App.teacherSettings,
        classCode: App.classCode,
        sharedData: App.sharedData
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiryos_${App.classCode}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    closeSessionMenu();
    toast('Session exported as JSON', 'success');
}

/**
 * Triggers the file input for importing a session.
 */
export function importSession() {
    document.getElementById('importFileInput')?.click();
    closeSessionMenu();
}

/**
 * Handles the selected file for session import.
 */
export async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.work) App.work = data.work;
            if (data.teacherSettings) App.teacherSettings = data.teacherSettings;
            if (data.sharedData) App.sharedData = data.sharedData;
            if (data.classCode) App.classCode = data.classCode;
            
            await saveToStorage();
            window.updateModeUI();
            toast('Session imported successfully!', 'success');
        } catch (err) {
            toast('Invalid session file format', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/**
 * Returns the user to the login screen.
 */
export function leaveSession() {
    if (confirm('Are you sure you want to leave? Your progress is saved locally.')) {
        if (App.syncState.syncInterval) clearInterval(App.syncState.syncInterval);
        window.location.reload(); // Hard reset for safety
    }
    closeSessionMenu();
}

/**
 * Copies the current class code to the system clipboard.
 */
export function copyCode() {
    navigator.clipboard.writeText(App.classCode);
    toast('Class code copied!', 'success');
}

/**
 * Copies the full join link for the current class to the system clipboard.
 */
export function copyJoinLink() {
    const link = `${window.location.origin}${window.location.pathname}?class=${App.classCode}`;
    navigator.clipboard.writeText(link);
    toast('Join link copied!', 'success');
}

/**
 * UI: Opens a generic text input modal.
 * @param {string} title - Modal title.
 * @param {string} placeholder - Input placeholder.
 * @param {string} initialValue - Initial input value.
 * @param {Function} callback - Function called with the input value on confirm.
 */
export function openGenericInput(title, placeholder, initialValue, callback) {
    const modal = document.getElementById('genericInputModal');
    const titleEl = document.getElementById('genericInputTitle');
    const input = document.getElementById('genericInputField');
    if (!modal || !input) return;

    if (titleEl) titleEl.textContent = title;
    input.placeholder = placeholder || 'Type here...';
    input.value = initialValue || '';
    App.genericInputCallback = callback;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    input.focus();
    input.select();
}

export function closeGenericInput() {
    const modal = document.getElementById('genericInputModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    App.genericInputCallback = null;
}

export function submitGenericInput() {
    const val = document.getElementById('genericInputField')?.value.trim();
    if (typeof App.genericInputCallback === 'function') {
        App.genericInputCallback(val);
    }
    closeGenericInput();
}

/**
 * Generates a random 6-character alphanumeric class code.
 * @returns {string} The generated code.
 */
export function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

/**
 * Generates and displays a QR code for students to join the current class.
 */
export function showJoinQR() {
    const modal = document.getElementById('qrCodeModal');
    const canvas = document.getElementById('qrcodeCanvas');
    const codeDisplay = document.getElementById('qrClassCode');
    
    if (!modal || !canvas) return;

    if (codeDisplay) codeDisplay.textContent = App.classCode;
    
    const joinLink = `${window.location.origin}${window.location.pathname}?class=${App.classCode}`;
    
    // eslint-disable-next-line no-undef
    QRCode.toCanvas(canvas, joinLink, { 
        width: 256,
        margin: 2,
        color: {
            dark: "#2563eb",
            light: "#ffffff"
        }
    }, function (error) {
        if (error) {
            console.error(error);
            toast('Failed to generate QR code', 'error');
        }
    });
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Closes the QR code modal.
 */
export function closeQRCode() {
    const modal = document.getElementById('qrCodeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Updates the health indicator (Sync status) in the header.
 * @param {string} type - Indicator type (currently only 'sync').
 * @param {string} status - 'good' | 'warning' | 'bad'.
 */
export function updateHealthIndicator(type, status) {
    const indicator = document.getElementById(type + 'Indicator');
    if (indicator) {
        indicator.className = `health-indicator health-${status}`;
    }
}

/**
 * Calculates the percentage completion of the current user's inquiry work.
 * @returns {number} Completion percentage (0-100).
 */
export function calculateProgress() {
    return calculateStudentProgress(App.work);
}

/**
 * Calculates completion percentage for a given work state object.
 * @param {Object} work - The work state object.
 * @returns {number} Completion percentage (0-100).
 */
export function calculateStudentProgress(work) {
    if (!work) return 0;
    try {
        let p = 0;
        if (work.notices?.length) p += 10;
        if (work.wonders?.length) p += 10;
        if (work.mainQuestion) p += 10;
        if (work.modelNodes?.length) p += 15;
        if (work.variables?.length) p += 10;
        if (work.dataTable?.rows?.some(r => Object.values(r).some(v => v))) p += 15;
        if (work.evidence?.length) p += 10;
        if (work.claim) p += 10;
        if (work.reasoning) p += 10;
        return Math.min(100, p);
    } catch (e) {
        console.error('Error calculating progress:', e);
        return 0;
    }
}
