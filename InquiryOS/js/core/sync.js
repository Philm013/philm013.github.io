/**
 * @file sync.js
 * @description Core synchronization logic for InquiryOS, handling data persistence and real-time state updates.
 * Optimized with batch operations and range queries to reduce IndexedDB overhead.
 */

import { App, getInitialWorkState } from './state.js';
import { dbPut, dbGet, dbGetByIndex, dbPutMany, dbGetByPrefix, STORE_SESSIONS, STORE_USERS, isDBReady } from './storage.js';
import { updateHealthIndicator, deepClone } from '../ui/utils.js';
import { renderNavigation } from '../ui/navigation.js';
import { renderStudentContent, renderTeacherContent, renderEvidenceBank } from '../ui/renderer.js';
import { p2p } from './sync-peer.js';

/**
 * Saves current application state to IndexedDB.
 * Optimized to use a single transaction (dbPutMany).
 * @returns {Promise<boolean>} Success status of the save operation.
 */
export async function saveToStorage() {
    if (!isDBReady() || !App.classCode) return false;
    
    try {
        const timestamp = Date.now();
        const batch = [];
        
        // 1. Prepare Teacher Settings (only if teacher)
        if (App.mode === 'teacher') {
            if (App.isExemplarMode && !App.viewerState.isMonitoring) {
                App.teacherSettings.exemplars[App.currentModule] = deepClone(App.work);
            }
            batch.push({
                code: App.classCode + ':settings',
                teacherSettings: deepClone(App.teacherSettings),
                timestamp: timestamp
            });
        }
        
        // 2. Prepare Shared Data
        batch.push({
            code: App.classCode + ':shared',
            sharedData: deepClone(App.sharedData),
            timestamp: timestamp
        });
        
        // 3. Prepare Student Work (if student or teacher viewing a student)
        const targetId = App.mode === 'student' ? App.user.visitorId : App.viewingStudentId;
        if (targetId) {
            batch.push({
                code: App.classCode + ':work:' + targetId,
                work: deepClone(App.work),
                timestamp: timestamp
            });
        }

        if (batch.length > 0) {
            await dbPutMany(STORE_SESSIONS, batch);
        }
        
        // P2P Sync
        if (App.mode === 'student') {
            p2p.sendWorkUpdate();
        } else if (App.mode === 'teacher') {
            p2p.sendBroadcast('teacherSettings', App.teacherSettings);
            p2p.sendBroadcast('sharedData', App.sharedData);
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
 * Optimized to fetch all class-related data in a single range query.
 * @returns {Promise<void>}
 */
export async function loadFromStorage() {
    if (!isDBReady() || !App.classCode) return;
    
    try {
        // Fetch all class data in one go
        const classData = await dbGetByPrefix(STORE_SESSIONS, App.classCode + ':');
        const dataMap = new Map(classData.map(item => [item.code, item]));

        // 1. Load Settings
        const settings = dataMap.get(App.classCode + ':settings');
        if (settings && settings.teacherSettings) {
            App.teacherSettings = { ...App.teacherSettings, ...settings.teacherSettings };
        }
        
        // 2. Load Shared Data
        const shared = dataMap.get(App.classCode + ':shared');
        if (shared && shared.sharedData) {
            App.sharedData = { ...App.sharedData, ...shared.sharedData };
        }
        
        // 3. Load Work
        const targetId = App.mode === 'student' ? App.user.visitorId : App.viewingStudentId;
        App.work = getInitialWorkState();
        
        if (targetId) {
            const saved = dataMap.get(App.classCode + ':work:' + targetId);
            if (saved && saved.work) {
                App.work = { ...App.work, ...saved.work };
                ensureWorkFields(App.work);
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
    // P2P Init
    p2p.init();

    if (App.syncState.syncInterval) clearInterval(App.syncState.syncInterval);
    App.syncState.syncInterval = setInterval(async () => {
        await syncWithStorage();
        p2p.discoverPeers();
    }, 2000);
}

/**
 * Synchronizes local state with data stored in IndexedDB.
 * Optimized to use range queries and reduced transaction count.
 * @returns {Promise<void>}
 */
export async function syncWithStorage() {
    if (!isDBReady() || !App.classCode) return;
    
    try {
        let changed = false;
        
        // Fetch all class data in one go for the entire sync cycle
        const classData = await dbGetByPrefix(STORE_SESSIONS, App.classCode + ':');
        const dataMap = new Map(classData.map(item => [item.code, item]));
        
        // 1. Sync Settings
        const settings = dataMap.get(App.classCode + ':settings');
        if (settings && settings.timestamp > App.syncState.lastSync) {
            App.teacherSettings = { ...App.teacherSettings, ...settings.teacherSettings };
            changed = true;
        }
        
        // 2. Sync Shared Data
        const shared = dataMap.get(App.classCode + ':shared');
        if (shared && shared.timestamp > App.syncState.lastSync) {
            App.sharedData = { ...App.sharedData, ...shared.sharedData };
            changed = true;
        }
        
        // 3. Sync Work
        const targetId = App.mode === 'student' ? App.user.visitorId : App.viewingStudentId;
        if (targetId && !App.isViewingExemplar) {
            const saved = dataMap.get(App.classCode + ':work:' + targetId);
            if (saved && saved.timestamp > App.syncState.lastSync) {
                const baseWork = getInitialWorkState();
                App.work = { ...baseWork, ...saved.work };
                ensureWorkFields(App.work);
                changed = true;
            }
        } else if (App.mode === 'teacher' && !App.viewingStudentId && (App.work.modelNodes?.length > 0 || App.work.notices?.length > 0)) {
            App.work = getInitialWorkState();
            changed = true;
        }
        
        if (changed) {
            App.syncState.lastSync = Date.now();
            
            // Recalculate Class Stats if teacher - reuse the dataMap!
            if (App.mode === 'teacher') {
                const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
                const students = allUsers.filter(u => u.mode === 'student');
                let notices = 0, wonders = 0, nodes = 0;
                for (const s of students) {
                    const saved = dataMap.get(App.classCode + ':work:' + s.visitorId);
                    if (saved && saved.work) {
                        notices += saved.work.notices?.length || 0;
                        wonders += saved.work.wonders?.length || 0;
                        nodes += saved.work.modelNodes?.length || 0;
                    }
                }
                App.classStats = { notices, wonders, nodes, posts: App.sharedData.debatePosts?.length || 0 };
            }
            
            // Auto-force student to module if teacher has set one
            if (App.mode === 'student' && App.teacherSettings.forceModule) {
                if (App.currentModule !== App.teacherSettings.forceModule) {
                    App.currentModule = App.teacherSettings.forceModule;
                    renderNavigation();
                    renderStudentContent();
                } else {
                    renderStudentContent();
                }
            } else {
                renderNavigation();
                if (App.mode === 'teacher') {
                    renderTeacherContent();
                } else {
                    renderStudentContent();
                }
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
 * Ensures all required fields exist on a work object.
 */
function ensureWorkFields(work) {
    const arrayFields = ['modelNodes', 'modelConnections', 'modelShapes', 'modelNotes', 'modelPaths', 'modelGroups', 'modelComments', 'modelStickers', 'evidence', 'notices', 'wonders'];
    arrayFields.forEach(key => {
        if (!work[key]) work[key] = [];
    });
}

/**
 * Updates a specific data path and triggers a save/broadcast.
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
    
    // P2P Broadcast
    p2p.sendBroadcast(path, value);
    
    await saveToStorage();
}

/**
 * Internal helper to set a value deep within an object.
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
 */
export async function registerUser() {
    if (!isDBReady() || !App.user.visitorId) return;
    
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
        
        if (App.syncState.heartbeatInterval) clearInterval(App.syncState.heartbeatInterval);
        App.syncState.heartbeatInterval = setInterval(async () => {
            if (isDBReady() && App.user.visitorId) {
                userData.lastSeen = Date.now();
                await dbPut(STORE_USERS, userData).catch(() => {});
            }
        }, 10000); // Increased interval to 10s to reduce load
    } catch (e) {
        console.error('Register user error:', e);
    }
}

/**
 * Queries IndexedDB for active users in the current class code.
 */
export async function updateConnectedUsers() {
    try {
        const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
        const now = Date.now();
        const active = allUsers.filter(u => now - u.lastSeen < 20000);
        const countEl = document.getElementById('connectedCount');
        if (countEl) countEl.textContent = active.length || '1';
    } catch (e) {
        const countEl = document.getElementById('connectedCount');
        if (countEl) countEl.textContent = '1';
    }
}
