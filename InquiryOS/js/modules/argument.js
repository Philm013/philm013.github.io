/**
 * @file argument.js
 * @description Logic for the SEP7 module: Engaging in Argument from Evidence. 
 * Implements a collaborative discussion board for claims, supports, and challenges.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

let currentPostType = 'claim';

export function renderArgumentModule() {
    const colors = { claim: 'blue', support: 'green', challenge: 'red', question: 'amber' };
    return `
        <div class="panels-container">
            <div class="bg-white border-b flex flex-col" data-card-title="Argument Board">
                <div class="p-2 md:p-0">
                    ${renderModuleHeader('Argument from Evidence', 'mdi:forum', 'SEP7', '', 'Scientists use argumentation to reach better explanations. Use this board to share your ideas and respectfully review the work of others.')}
                </div>

                <div class="panel-content flex flex-col !p-0">
                    <div class="flex-1 overflow-y-auto p-4 space-y-4" id="discussionThread">${renderDiscussionPosts(colors)}</div>
                    <div class="p-4 bg-gray-50 border-t shrink-0">
                        <div class="flex flex-wrap gap-1.5 mb-3">${renderPostTypeButtons(colors)}</div>
                        <div class="flex gap-2">
                            <input type="text" id="postInput" placeholder="Share your ${currentPostType}..." class="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary transition-all" onkeypress="if(event.key==='Enter')window.addPost()">
                            <button onclick="window.addPost()" class="px-5 py-3 bg-primary text-white rounded-xl font-bold shadow-md active:scale-95 transition-all">Post</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderDiscussionPosts(colors) {
    const posts = App.sharedData.debatePosts || [], isTeacher = App.mode === 'teacher';
    if (posts.length === 0) return `
        <div class="h-full flex flex-col items-center justify-center text-center py-20">
            <div class="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                <span class="iconify text-4xl text-primary/40" data-icon="mdi:forum-outline"></span>
            </div>
            <h3 class="text-xl font-black text-gray-900 uppercase">Discussion Empty</h3>
            <p class="text-xs font-bold text-gray-400 mt-1 max-w-xs uppercase tracking-widest">Be the first to share a claim!</p>
        </div>`;
    return posts.map(p => `<div class="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm relative group"><div class="flex flex-wrap items-center gap-3 mb-4"><div class="w-8 h-8 bg-${colors[p.type]}-50 rounded-lg flex items-center justify-center text-${colors[p.type]}-600 border border-${colors[p.type]}-100"><span class="text-[10px] font-black uppercase">${p.type.charAt(0)}</span></div><span class="px-3 py-1 bg-${colors[p.type]}-50 text-${colors[p.type]}-700 rounded-full text-[9px] font-black uppercase border border-${colors[p.type]}-100">${p.type}</span><span class="text-sm font-black text-gray-900 flex items-center gap-2"><div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">${p.author.charAt(0).toUpperCase()}</div>${p.author}</span><span class="text-[10px] text-gray-400 font-bold ml-auto uppercase">${new Date(p.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>${isTeacher ? `<div class="flex gap-2"><button onclick="window.openArgumentFeedback('${p.id}')" class="p-2 text-primary hover:bg-blue-50 rounded-lg transition-all"><span class="iconify" data-icon="mdi:comment-check"></span></button><button onclick="window.deletePost('${p.id}')" class="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><span class="iconify" data-icon="mdi:trash-can-outline"></span></button></div>` : ''}</div><p class="text-gray-700 leading-relaxed font-medium pl-11 text-lg">${p.text}</p>${p.feedback && App.teacherSettings.showFeedbackToStudents ? `<div class="mt-4 ml-11 p-4 bg-blue-50 border border-blue-100 rounded-2xl relative"><div class="flex items-start gap-3">${p.feedback.sticker ? `<span class="text-2xl">${p.feedback.sticker}</span>` : '<span class="iconify text-primary text-xl" data-icon="mdi:comment-text"></span>'}<div><p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Teacher Feedback</p><p class="text-sm font-bold text-blue-900">${p.feedback.text || 'Checked!'}</p></div></div></div>` : ''}<div class="mt-4 pl-11 flex gap-4"><button class="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"><span class="iconify" data-icon="mdi:comment-outline"></span>Reply</button><button onclick="window.flagPost('${p.id}')" class="text-[10px] font-black ${p.flagged ? 'text-red-500' : 'text-gray-400'} uppercase hover:text-red-500 transition-colors flex items-center gap-1"><span class="iconify" data-icon="mdi:flag-outline"></span>${p.flagged ? 'Flagged' : 'Flag'}</button></div></div>`).join('');
}

function renderPostTypeButtons(colors) { return Object.keys(colors).map(type => { const color = colors[type]; const isActive = currentPostType === type; return `<button onclick="window.setPostType('${type}')" class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${isActive ? `border-${color}-500 bg-${color}-500 text-white shadow-md shadow-${color}-100` : `border-gray-100 bg-white text-gray-400 hover:border-${color}-200 hover:text-${color}-500`}" data-type="${type}">${type}</button>`; }).join(''); }
export function setPostType(type) { currentPostType = type; renderStudentContent(); }
export async function addPost() { const input = document.getElementById('postInput'), text = input?.value.trim(); if (!text) return; const post = { id: 'post_' + Date.now(), type: currentPostType, text, author: App.user.name, authorId: App.user.visitorId, time: Date.now(), replies: [] }; if (!App.sharedData.debatePosts) App.sharedData.debatePosts = []; App.sharedData.debatePosts.push(post); if (input) input.value = ''; await saveAndBroadcast('debatePosts', App.sharedData.debatePosts); renderStudentContent(); toast('Argument shared!', 'success'); }
export function openArgumentFeedback(postId) { App.editingPostId = postId; const post = App.sharedData.debatePosts.find(p => p.id === postId); if (!post) return; const modal = document.getElementById('commentModal'), input = document.getElementById('commentText'); if (modal && input) { input.value = post.feedback?.text || ''; if (post.feedback?.sticker) window.setFeedbackSticker(post.feedback.sticker); modal.classList.remove('hidden'); modal.classList.add('flex'); input.focus(); } }
export async function saveArgumentFeedback() { const postId = App.editingPostId, val = document.getElementById('commentText')?.value.trim(), sticker = App.viewerState.selectedSticker, post = App.sharedData.debatePosts.find(p => p.id === postId); if (post) { post.feedback = { text: val, sticker, time: Date.now() }; await saveAndBroadcast('debatePosts', App.sharedData.debatePosts); window.closeCommentModal(); renderStudentContent(); toast('Feedback updated', 'success'); } }
export async function flagPost(postId) { const post = App.sharedData.debatePosts.find(p => p.id === postId); if (post) { post.flagged = !post.flagged; await saveAndBroadcast('debatePosts', App.sharedData.debatePosts); renderStudentContent(); toast(post.flagged ? 'Flagged' : 'Unflagged', 'info'); } }
export async function deletePost(id) { if (confirm('Delete post?')) { App.sharedData.debatePosts = App.sharedData.debatePosts.filter(p => p.id !== id); await saveAndBroadcast('debatePosts', App.sharedData.debatePosts); renderStudentContent(); toast('Post deleted', 'info'); } }
