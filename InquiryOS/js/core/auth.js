/**
 * @file auth.js
 * @description Logic for user onboarding, role selection, and session initialization.
 */

import { App } from './state.js';
import { loadFromStorage, registerUser, startSync } from './sync.js';
import { updateModeUI } from '../ui/renderer.js';
import { generateCode, toast } from '../ui/utils.js';

/**
 * Navigates between the onboarding steps.
 * @param {number} step - Step number (1 or 2).
 */
export function goToLoginStep(step) {
    const step1 = document.getElementById('loginStep1');
    const step2 = document.getElementById('loginStep2');
    if (!step1 || !step2) return;
    
    if (step === 1) {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
    } else {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
    }
}

/**
 * Handles role selection (student vs teacher) and updates UI accordingly.
 * @param {string} role - 'student' | 'teacher'.
 */
export function selectRole(role) {
    App.mode = role;
    const title = document.getElementById('step2Title');
    const desc = document.getElementById('step2Desc');
    const classContainer = document.getElementById('classCodeContainer');
    const btn = document.getElementById('finalStartBtn');
    
    if (!title || !desc || !classContainer || !btn) return;

    if (role === 'student') {
        title.textContent = "Hi Student!";
        desc.textContent = "Let's get you ready for your investigation.";
        classContainer.classList.remove('hidden');
        btn.querySelector('span').textContent = "Join the Class!";
        btn.className = "w-full py-5 bg-gradient-to-r from-primary to-blue-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2";
    } else {
        title.textContent = "Hi Teacher!";
        desc.textContent = "Let's set up your classroom headquarters.";
        classContainer.classList.add('hidden');
        btn.querySelector('span').textContent = "Open My Classroom";
        btn.className = "w-full py-5 bg-gradient-to-r from-teacher to-orange-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2";
    }
    
    goToLoginStep(2);
}

/**
 * Renders the emoji-based avatar selection grid.
 */
export function renderAvatarPicker() {
    const container = document.getElementById('avatarPicker');
    if (!container) return;
    
    const emojis = ['🔬','🧪','🧬','🌍','🔭','🌱','🔋','🌡️','🤖','🚀','🧠','🌋','🐳','🐝','☀️','🌪️'];
    container.innerHTML = emojis.map((emoji, idx) => `
        <button onclick="window.selectLoginAvatar('${emoji}')" class="avatar-option w-10 h-10 flex items-center justify-center text-2xl rounded-xl border-2 border-transparent hover:bg-blue-50 transition-all ${idx === 0 ? 'selected ring-2 ring-primary border-primary bg-blue-50' : ''}" data-emoji="${emoji}">
            ${emoji}
        </button>
    `).join('');
    
    // Set initial selection in state
    if (!App.user.avatar) App.user.avatar = emojis[0];
}

/**
 * Handles the selection of a user avatar emoji.
 * @param {string} emoji 
 */
export function selectLoginAvatar(emoji) {
    App.user.avatar = emoji;
    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.classList.remove('selected', 'ring-2', 'ring-primary', 'border-primary', 'bg-blue-50');
        if (btn.dataset.emoji === emoji) {
            btn.classList.add('selected', 'ring-2', 'ring-primary', 'border-primary', 'bg-blue-50');
        }
    });
}

/**
 * Finalizes the onboarding process and enters the application.
 */
export async function finishOnboarding() {
    const role = App.mode;
    const nameInput = document.getElementById('loginName');
    const classInput = document.getElementById('loginClass');
    
    const name = nameInput?.value.trim();
    const classCode = classInput?.value.trim().toUpperCase() || (role === 'teacher' ? generateCode() : '');

    if (!name) {
        toast('Please enter your name', 'warning');
        nameInput?.focus();
        return;
    }
    
    if (role === 'student' && !classCode) {
        toast('Please enter a Class Code', 'warning');
        classInput?.focus();
        return;
    }

    App.user.name = name;
    App.user.visitorId = `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    App.classCode = classCode;
    
    // Default avatar if none selected
    if (!App.user.avatar) {
        const selected = document.querySelector('.avatar-option.selected');
        App.user.avatar = selected ? selected.dataset.emoji : '🔬';
    }

    await initializeApp();
}

/**
 * Switches from login view to main app view.
 */
async function initializeApp() {
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');
    
    if (loginView) {
        loginView.classList.remove('active');
        // Force display none if classes aren't enough
        loginView.style.setProperty('display', 'none', 'important');
    }
    
    if (appView) {
        appView.classList.add('active');
        // Force display flex if classes aren't enough
        appView.style.setProperty('display', 'flex', 'important');
    }
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = App.user.name;
    
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) avatarEl.textContent = App.user.avatar;
    
    const classCodeEl = document.getElementById('displayClassCode');
    if (classCodeEl) classCodeEl.textContent = App.classCode;
    
    try {
        await loadFromStorage();
        await registerUser();
        startSync();
        updateModeUI();
        toast(`Welcome, ${App.user.name}!`, 'success');
    } catch (e) {
        console.error('App init error:', e);
        updateModeUI();
    }
}
