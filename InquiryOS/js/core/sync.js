/**
 * @file sync.js
 * @description Core synchronization logic for InquiryOS, handling data persistence and real-time state updates.
 */

import { App, getInitialWorkState } from './state.js';
import { dbPut, dbGet, dbGetByIndex, STORE_SESSIONS, STORE_USERS, isDBReady } from './storage.js';
import { updateHealthIndicator } from '../ui/utils.js';
import { renderNavigation } from '../ui/navigation.js';
import { renderStudentContent, renderTeacherContent } from '../ui/renderer.js';
import { renderEvidenceBank } from '../ui/renderer.js'; // Note: check where this eventually lands

/**
 * Saves current application state to IndexedDB.
 * Handles teacher settings, shared data, and student work separately.
 * @returns {Promise<boolean>} Success status of the save operation.
 */
export async function saveToStorage() {
    if (!isDBReady()) return false;
    
    try {
        const timestamp = Date.now();
        
        // 1. Save Teacher Settings (only if teacher)
        if (App.mode === 'teacher') {
            // If in exemplar mode, sync current work to the exemplar slot first
            if (App.isExemplarMode && !App.viewerState.isMonitoring) {
                App.teacherSettings.exemplars[App.currentModule] = JSON.parse(JSON.stringify(App.work));
            }
            
            const settingsData = {
                code: App.classCode + ':settings',
                teacherSettings: JSON.parse(JSON.stringify(App.teacherSettings)),
                timestamp: timestamp
            };
            await dbPut(STORE_SESSIONS, settingsData);
        }
        
        // 2. Save Shared Data (posts, etc)
        const sharedData = {
            code: App.classCode + ':shared',
            sharedData: JSON.parse(JSON.stringify(App.sharedData)),
            timestamp: timestamp
        };
        await dbPut(STORE_SESSIONS, sharedData);
        
        // 3. Save Student Work (if student or teacher viewing a student)
        const targetId = App.mode === 'student' ? App.user.visitorId : App.viewingStudentId;
        if (targetId) {
            const workData = {
                code: App.classCode + ':work:' + targetId,
                work: JSON.parse(JSON.stringify(App.work)),
                timestamp: timestamp
            };
            await dbPut(STORE_SESSIONS, workData);
        }
        
        App.syncState.lastSync = timestamp;
        updateHealthIndicator('sync', 'good');
        const lastSyncEl = document.getElementById('lastSyncTime');
        if (lastSyncEl) lastSyncEl.textContent = 'Just now';
        return true;
    } catch (e) {
        console.error('Save error:', e);
        updateHealthIndicator('sync', 'bad');
        return false;
    }
}

/**
 * Loads application state from IndexedDB based on class code and current role.
 * @returns {Promise<void>}
 */
export async function loadFromStorage() {
    if (!isDBReady()) return;
    
    try {
        // 1. Load Settings
        const settings = await dbGet(STORE_SESSIONS, App.classCode + ':settings');
        if (settings && settings.teacherSettings) {
            App.teacherSettings = { ...App.teacherSettings, ...settings.teacherSettings };
        }
        
        // 2. Load Shared Data
        const shared = await dbGet(STORE_SESSIONS, App.classCode + ':shared');
        if (shared && shared.sharedData) {
            App.sharedData = { ...App.sharedData, ...shared.sharedData };
        }
        
        // 3. Load Work
        const targetId = App.mode === 'student' ? App.user.visitorId : App.viewingStudentId;
        
        // Reset work state before loading to avoid bleeding
        App.work = getInitialWorkState();
        
        if (targetId) {
            const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + targetId);
            if (saved && saved.work) {
                App.work = { ...App.work, ...saved.work };
                // Ensure array fields exist
                ['modelNodes', 'modelConnections', 'modelShapes', 'modelNotes', 'modelPaths', 'modelGroups', 'modelComments', 'modelStickers'].forEach(key => {
                    if (!App.work[key]) App.work[key] = [];
                });
            }
        }
        
        App.syncState.lastSync = Date.now();
    } catch (e) {
        console.error('Load error:', e);
    }
}

/**
 * Starts the polling interval for data synchronization.
 */
export function startSync() {
    if (App.syncState.syncInterval) clearInterval(App.syncState.syncInterval);
    App.syncState.syncInterval = setInterval(async () => {
        await syncWithStorage();
    }, 2000);
}

/**
 * Synchronizes local state with data stored in IndexedDB.
 * Triggers UI updates if remote data is newer than local last sync.
 * @returns {Promise<void>}
 */
export async function syncWithStorage() {
    if (!isDBReady()) return;
    
    try {
        let changed = false;
        
        // 1. Sync Settings
        const settings = await dbGet(STORE_SESSIONS, App.classCode + ':settings');
        if (settings && settings.timestamp > App.syncState.lastSync) {
            App.teacherSettings = { ...App.teacherSettings, ...settings.teacherSettings };
            changed = true;
        }
        
        // 2. Sync Shared Data
        const shared = await dbGet(STORE_SESSIONS, App.classCode + ':shared');
        if (shared && shared.timestamp > App.syncState.lastSync) {
            App.sharedData = { ...App.sharedData, ...shared.sharedData };
            changed = true;
        }
        
        // 3. Sync Work
        // IMPORTANT: Skip syncing work if student is viewing an exemplar
        const targetId = App.mode === 'student' ? App.user.visitorId : App.viewingStudentId;
        if (targetId && !App.isViewingExemplar) {
            const saved = await dbGet(STORE_SESSIONS, App.classCode + ':work:' + targetId);
            if (saved && saved.timestamp > App.syncState.lastSync) {
                // To avoid bleeding, we merge into a fresh state if it's a major sync
                const baseWork = getInitialWorkState();
                App.work = { ...baseWork, ...saved.work };
                
                // Ensure array fields exist
                ['modelNodes', 'modelConnections', 'modelShapes', 'modelNotes', 'modelPaths', 'modelGroups', 'modelComments', 'modelStickers'].forEach(key => {
                    if (!App.work[key]) App.work[key] = [];
                });
                changed = true;
            }
        } else if (App.mode === 'teacher' && !App.viewingStudentId && (App.work.modelNodes?.length > 0 || App.work.notices?.length > 0)) {
            // Teacher is not viewing anyone and has leftover data, reset work to avoid bleeding
            App.work = getInitialWorkState();
            changed = true;
        }
        
        if (changed) {
            App.syncState.lastSync = Date.now();
            
            // Auto-force student to module if teacher has set one
            if (App.mode === 'student' && App.teacherSettings.forceModule && App.currentModule !== App.teacherSettings.forceModule) {
                App.currentModule = App.teacherSettings.forceModule;
            }

            renderNavigation();
            if (App.mode === 'student' || App.viewingStudentId) {
                if (App.mode === 'teacher' && App.teacherModule === 'students') {
                    renderTeacherContent();
                } else if (App.mode === 'student') {
                    renderStudentContent();
                } else {
                    renderTeacherContent();
                }
            } else {
                renderTeacherContent();
            }
            renderEvidenceBank();
            updateHealthIndicator('sync', 'good');
            const lastSyncEl = document.getElementById('lastSyncTime');
            if (lastSyncEl) lastSyncEl.textContent = 'Just now';
        }
    } catch (e) {
        console.error('Sync error:', e);
    }
    await updateConnectedUsers();
}

/**
 * Updates a specific data path and triggers a save/broadcast.
 * @param {string} path - Dot-notated path in App.work or specific shared data key.
 * @param {any} value - The new value to set.
 * @returns {Promise<void>}
 */
export async function saveAndBroadcast(path, value) {
    if (path === 'debatePosts') {
        App.sharedData.debatePosts = value;
    } else if (path === 'categories') {
        App.teacherSettings.categories = value;
    } else if (path === 'lessonEmojis') {
        App.teacherSettings.lessonEmojis = value;
    } else {
        setNestedValue(App.work, path, value);
    }
    await saveToStorage();
}

/**
 * Internal helper to set a value deep within an object.
 * @param {Object} obj - Target object.
 * @param {string} path - Dot-notated path.
 * @param {any} value - Value to set.
 */
export function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

/**
 * Registers the current user in the class participant list.
 * Starts a heartbeat interval to update 'lastSeen'.
 * @returns {Promise<void>}
 */
export async function registerUser() {
    if (!isDBReady() || !App.user.visitorId) {
        console.warn('Cannot register user - DB not ready or no visitorId');
        return;
    }
    
    try {
        const userData = {
            visitorId: App.user.visitorId,
            classCode: App.classCode,
            name: App.user.name,
            avatar: App.user.avatar,
            mode: App.mode,
            lastSeen: Date.now()
        };
        
        await dbPut(STORE_USERS, userData);
        await updateConnectedUsers();
        
        setInterval(async () => {
            if (isDBReady() && App.user.visitorId) {
                userData.lastSeen = Date.now();
                await dbPut(STORE_USERS, userData).catch(() => {});
            }
        }, 5000);
    } catch (e) {
        console.error('Register user error:', e);
    }
}

/**
 * Queries IndexedDB for active users in the current class code.
 * Updates the 'connectedCount' UI element.
 * @returns {Promise<void>}
 */
export async function updateConnectedUsers() {
    try {
        const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
        const now = Date.now();
        const active = allUsers.filter(u => now - u.lastSeen < 15000);
        const countEl = document.getElementById('connectedCount');
        if (countEl) countEl.textContent = active.length || '1';
    } catch (e) {
        const countEl = document.getElementById('connectedCount');
        if (countEl) countEl.textContent = '1';
    }
}
