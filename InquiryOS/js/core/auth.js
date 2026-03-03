/**
 * @file auth.js
 * @description Logic for user onboarding, role selection, and session initialization.
 */

import { App } from './state.js';
import { loadFromStorage, registerUser, startSync } from './sync.js';
import { updateModeUI } from '../ui/renderer.js';
import { generateCode, toast } from '../ui/utils.js';

import { dbGet, dbGetByIndex, dbGetAll, STORE_SESSIONS, STORE_USERS, isDBReady } from './storage.js';

/**
 * Populates the 'Recent Sessions' list on the login screen and landing page.
 */
export async function loadRecentSessions() {
    const landingList = document.getElementById('landingSessionList');
    const loginList = document.getElementById('sessionList');
    const loginContainer = document.getElementById('sessionLibrary');
    
    if (!isDBReady()) return;

    try {
        const allData = await dbGetAll(STORE_SESSIONS);
        // Filter for settings records to identify unique classes
        const sessions = allData
            .filter(d => d.code.endsWith(':settings'))
            .map(d => ({
                code: d.code.split(':')[0],
                title: d.teacherSettings?.phenomenon?.title || 'Untitled Session',
                timestamp: d.timestamp
            }))
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 6); // Show more on landing

        const sessionHtml = sessions.map(s => `
            <button onclick="window.resumeSession('${s.code}')" class="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-primary hover:shadow-xl transition-all group text-left">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-blue-100">
                        <span class="iconify text-xl" data-icon="mdi:history"></span>
                    </div>
                    <div class="min-w-0">
                        <p class="font-black text-sm text-gray-800 truncate">${s.title}</p>
                        <div class="flex items-center gap-2">
                            <p class="text-[9px] font-mono text-primary font-black uppercase tracking-widest">${s.code}</p>
                            <span class="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">${new Date(s.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <span class="iconify text-gray-200 group-hover:text-primary transition-colors" data-icon="mdi:chevron-right"></span>
            </button>
        `).join('');

        if (landingList) {
            landingList.innerHTML = sessionHtml || `
                <div class="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                    <p class="text-[10px] font-black text-gray-300 uppercase tracking-widest">No recent sessions found</p>
                </div>
            `;
        }

        if (loginList && loginContainer) {
            if (sessions.length > 0) {
                loginList.innerHTML = sessionHtml;
                loginContainer.classList.remove('hidden');
            } else {
                loginContainer.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error('Failed to load recent sessions:', e);
    }
}

/**
 * Displays the Landing Page for returning users.
 */
export async function showLandingPage() {
    const hero = document.getElementById('heroPanel');
    const landing = document.getElementById('landingPanel');
    const features = document.getElementById('featuresPanel');

    if (!landing) return;

    // returning users should not see the initial landing page information first
    if (hero) hero.classList.add('hidden');
    if (features) features.classList.add('hidden');
    landing.classList.remove('hidden');
    landing.classList.add('flex');

    // Populate User Data
    const nameEl = document.getElementById('landingUserName');
    const roleEl = document.getElementById('landingUserRole');
    const avatarEl = document.getElementById('landingAvatar');

    if (nameEl) nameEl.textContent = App.user.name || 'Researcher';
    if (roleEl) roleEl.textContent = (App.mode || 'Student').toUpperCase();
    if (avatarEl && App.user.avatar) {
        avatarEl.innerHTML = `<span class="iconify" data-icon="${App.user.avatar}"></span>`;
    }

    // Populate Active Session
    const activeCard = document.getElementById('activeSessionCard');
    const activeCode = document.getElementById('activeSessionCode');
    const activeRole = document.getElementById('activeSessionRole');
    const activeTitle = document.getElementById('activeSessionTitle');

    const persisted = localStorage.getItem('inquiryos_active_session');
    if (persisted) {
        const data = JSON.parse(persisted);
        if (activeCard) activeCard.classList.remove('hidden');
        if (activeCode) activeCode.textContent = data.classCode;
        if (activeRole) activeRole.textContent = data.mode.toUpperCase();
        
        // Try to get title from DB
        const settings = await dbGet(STORE_SESSIONS, data.classCode + ':settings');
        if (activeTitle) activeTitle.textContent = settings?.teacherSettings?.phenomenon?.title || 'Current Investigation';
    } else {
        if (activeCard) activeCard.classList.add('hidden');
    }

    // Initialize Panel Navigation for login view
    initPanelNavigation();

    // Load recent sessions
    await loadRecentSessions();
}

/**
 * Resets to the initial role selection screen.
 */
export function startNewInquiry() {
    const hero = document.getElementById('heroPanel');
    const landing = document.getElementById('landingPanel');
    const features = document.getElementById('featuresPanel');
    const roles = document.getElementById('rolesPanel');
    
    if (landing) {
        landing.classList.add('hidden');
        landing.classList.remove('flex');
    }
    if (hero) hero.classList.remove('hidden');
    if (features) features.classList.remove('hidden');
    if (roles) {
        roles.classList.remove('hidden');
        window.scrollToPanel('rolesPanel');
    }
    
    // Refresh dots
    initPanelNavigation();
    
    // Go to step 1
    goToLoginStep(1);
}

/**
 * Panel Navigation Logic for #loginView
 */
export function initPanelNavigation() {
    const container = document.getElementById('loginView');
    const dotContainer = document.getElementById('loginDotContainer');
    if (!container || !dotContainer) return;

    // Find all visible panels
    const panels = Array.from(container.querySelectorAll('.snap-panel:not(.hidden)'));
    
    // Render dots
    dotContainer.innerHTML = panels.map((p, i) => `
        <button onclick="window.scrollToPanel('${p.id}')" 
            class="desktop-nav-dot ${i === 0 ? 'active' : ''}" 
            data-panel="${p.id}" 
            aria-label="Scroll to ${p.id.replace('Panel', '')}">
        </button>
    `).join('');

    // Setup Intersection Observer to update dots on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const dots = document.querySelectorAll('.desktop-nav-dot');
                dots.forEach(dot => {
                    dot.classList.toggle('active', dot.dataset.panel === entry.target.id);
                });
                
                // Update Arrows State
                const idx = panels.findIndex(p => p.id === entry.target.id);
                const prevBtn = document.getElementById('loginPrevBtn');
                const nextBtn = document.getElementById('loginNextBtn');
                if (prevBtn) prevBtn.disabled = (idx === 0);
                if (nextBtn) nextBtn.disabled = (idx === panels.length - 1);
            }
        });
    }, {
        root: container,
        threshold: 0.5
    });

    panels.forEach(p => observer.observe(p));
}

/**
 * Smoothly scrolls to a specific panel by ID.
 */
export function scrollToPanel(panelId) {
    const el = document.getElementById(panelId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Scrolls to next/prev panel in the login flow.
 */
export function scrollLoginPanel(dir) {
    const container = document.getElementById('loginView');
    if (!container) return;
    
    const panels = Array.from(container.querySelectorAll('.snap-panel:not(.hidden)'));
    const currentIdx = panels.findIndex(p => {
        const rect = p.getBoundingClientRect();
        return rect.top >= -50 && rect.top <= 50;
    });

    let nextIdx = dir === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx >= 0 && nextIdx < panels.length) {
        scrollToPanel(panels[nextIdx].id);
    }
}

/**
 * Resumes the active session stored in localStorage.
 */
export async function resumeActiveSession() {
    await restorePersistedSession(true); // pass true to force immediate app view
}

/**
 * Resumes a session from the recent list.
 */
window.resumeSession = async (code) => {
    App.classCode = code;
    // For resumption, we need to know the role. 
    // We'll try to find if this user has a profile for this class.
    const users = await dbGetByIndex(STORE_USERS, 'classCode', code);
    // Find a matching visitorId if we have one in state, else take the first
    const lastUser = users.find(u => u.visitorId === App.user.visitorId) || users[0]; 
    
    if (lastUser) {
        App.user.name = lastUser.name;
        App.user.visitorId = lastUser.visitorId;
        App.user.avatar = lastUser.avatar;
        App.mode = lastUser.mode;
        
        await initializeApp();
    } else {
        // Fallback to onboarding but with class code filled
        const classInput = document.getElementById('loginClass');
        if (classInput) classInput.value = code;
        
        const landing = document.getElementById('landingSection');
        if (landing) {
            landing.classList.add('hidden');
            landing.classList.remove('flex');
        }
        const roles = document.getElementById('rolesSection');
        if (roles) roles.classList.remove('hidden');
        
        toast('Session found. Please enter your name to join.', 'info');
        goToLoginStep(2);
    }
};

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
    const hero = document.getElementById('heroSection');
    const features = document.querySelector('.view#loginView > section:nth-of-type(2)');
    const landing = document.getElementById('landingSection');

    if (landing) {
        landing.classList.add('hidden');
        landing.classList.remove('flex');
    }
    if (hero) hero.classList.add('hidden');
    if (features) features.classList.add('hidden');
    
    if (!title || !desc || !classContainer || !btn) return;

    if (role === 'student') {
        title.textContent = "Hi Student!";
        desc.textContent = "Let's get you ready for your investigation.";
        classContainer.classList.remove('hidden');
        btn.querySelector('span').textContent = "Join the Class!";
        btn.className = "w-full py-5 md:py-6 bg-gradient-to-r from-primary to-blue-500 text-white rounded-[1.5rem] md:rounded-[2rem] font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 btn-interactive";
    } else {
        title.textContent = "Hi Teacher!";
        desc.textContent = "Let's set up your classroom headquarters.";
        classContainer.classList.add('hidden');
        btn.querySelector('span').textContent = "Open My Classroom";
        btn.className = "w-full py-5 md:py-6 bg-gradient-to-r from-teacher to-orange-500 text-white rounded-[1.5rem] md:rounded-[2rem] font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 btn-interactive";
    }
    
    goToLoginStep(2);
}

/**
 * Renders the Emoji-based avatar selection grid.
 */
export function renderAvatarPicker() {
    const container = document.getElementById('avatarPicker');
    if (!container) return;
    
    const emojis = [
        '🧬', '🧪', '🔬', '🌍', '🔭', '🌱', '🔋', '🌡️', 
        '🤖', '🚀', '🧠', '🌋', '🐋', '🐝', '☀️', '🌪️'
    ];
    
    container.innerHTML = emojis.map((emoji, idx) => `
        <button onclick="window.selectLoginAvatar('${emoji}')" 
            class="avatar-option w-12 h-12 flex items-center justify-center rounded-xl border-2 border-transparent hover:bg-blue-50 transition-all text-2xl ${idx === 0 ? 'selected ring-2 ring-primary border-primary bg-blue-50' : ''}" 
            data-emoji="${emoji}">
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
        App.user.avatar = selected ? selected.dataset.emoji : '🧬';
    }

    await initializeApp();
}

/**
 * Switches from login view to main app view.
 */
export async function initializeApp(skipPersistence = false) {
    if (typeof window.showView === 'function') {
        window.showView('appView');
    } else {
        const loginView = document.getElementById('loginView');
        const appView = document.getElementById('appView');
        
        if (loginView) {
            loginView.classList.remove('active');
            loginView.style.setProperty('display', 'none', 'important');
        }
        
        if (appView) {
            appView.classList.add('active');
            appView.style.setProperty('display', 'flex', 'important');
        }
    }
    
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = App.user.name;
    
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) {
        const avatar = App.user.avatar || '🧬';
        if (avatar.includes(':')) {
            avatarEl.innerHTML = `<span class="iconify" data-icon="${avatar}"></span>`;
        } else {
            avatarEl.textContent = avatar;
            avatarEl.innerHTML = avatar; // Handle pure emoji
        }
    }
    
    const classCodeEl = document.getElementById('displayClassCode');
    if (classCodeEl) classCodeEl.textContent = App.classCode;
    
    try {
        await loadFromStorage();
        await registerUser();
        startSync();
        updateModeUI();
        
        if (!skipPersistence) persistSession();
        
        toast(`Welcome, ${App.user.name}!`, 'success');
    } catch (e) {
        console.error('App init error:', e);
        updateModeUI();
    }
}

/**
 * Persists the current session to localStorage.
 */
export function persistSession() {
    if (App.user.name && App.classCode) {
        const session = {
            user: App.user,
            classCode: App.classCode,
            mode: App.mode,
            currentModule: App.currentModule,
            teacherModule: App.teacherModule
        };
        localStorage.setItem('inquiryos_active_session', JSON.stringify(session));
    }
}

/**
 * Clears the persisted session from localStorage.
 */
export function clearPersistedSession() {
    localStorage.removeItem('inquiryos_active_session');
}

/**
 * Attempts to restore a session from localStorage.
 */
export async function restorePersistedSession(forceAppView = false) {
    const persisted = localStorage.getItem('inquiryos_active_session');
    if (persisted) {
        try {
            const data = JSON.parse(persisted);
            App.user = data.user;
            App.classCode = data.classCode;
            App.mode = data.mode;
            App.currentModule = data.currentModule || 'overview';
            App.teacherModule = data.teacherModule || 'overview';
            
            if (forceAppView) {
                await initializeApp(true);
            } else {
                await showLandingPage();
            }
            return true;
        } catch (e) {
            console.error('Failed to restore session:', e);
            clearPersistedSession();
        }
    }
    return false;
}
