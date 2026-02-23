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

/**
 * Renders the Argument Practice module (Collaborative Board).
 * @returns {string} HTML content for the module.
 */
export function renderArgumentModule() {
    const colors = { claim: 'blue', support: 'green', challenge: 'red', question: 'amber' };
    return `
        <div class="max-w-5xl mx-auto">
            ${renderModuleHeader('Engaging in Argument', 'mdi:forum', 'SEP7')}
            
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div class="p-6 md:p-8 border-b border-gray-50 bg-gray-50/30">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-black text-gray-900">Class Evidence Board</h3>
                            <p class="text-sm text-gray-500 mt-1">Share and critique scientific claims based on gathered evidence.</p>
                        </div>
                        <div class="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Collaborative
                        </div>
                    </div>
                </div>
                
                <div class="flex-1 p-6 md:p-8 space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar bg-white" id="discussionThread">
                    ${renderDiscussionPosts(colors)}
                </div>
                
                <div class="p-6 md:p-8 bg-gray-50 border-t border-gray-100">
                    <div class="mb-4">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Argument Type</label>
                        <div class="flex flex-wrap gap-2">
                            ${renderPostTypeButtons(colors)}
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <div class="relative flex-1">
                            <input type="text" id="postInput" placeholder="Share your ${currentPostType}..." 
                                class="w-full pl-6 pr-12 py-4 bg-white border-2 border-gray-100 rounded-2xl text-lg font-medium text-gray-700 focus:border-primary focus:outline-none transition-all placeholder:text-gray-300"
                                onkeypress="if(event.key==='Enter')window.addPost()">
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 iconify text-2xl text-gray-200" data-icon="mdi:send-variant"></span>
                        </div>
                        <button onclick="window.addPost()" class="px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:-translate-y-0.5 transition-all">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderDiscussionPosts(colors) {
    const posts = App.sharedData.debatePosts || [];
    const isTeacher = App.mode === 'teacher';
    
    if (posts.length === 0) return `
        <div class="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale py-20">
            <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white">
                <span class="iconify text-5xl" data-icon="mdi:forum-outline"></span>
            </div>
            <h3 class="text-xl font-black text-gray-400 uppercase tracking-tighter">Discussion is Empty</h3>
            <p class="text-sm font-medium text-gray-400 mt-1 max-w-xs">Be the first to share a claim or ask a question about the phenomenon!</p>
        </div>
    `;
    
    return posts.map(p => `
        <div class="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm animate-in slide-in-from-bottom-2 relative group">
            <div class="flex flex-wrap items-center gap-3 mb-4">
                <div class="w-8 h-8 bg-${colors[p.type]}-50 rounded-lg flex items-center justify-center text-${colors[p.type]}-600 border border-${colors[p.type]}-100">
                    <span class="text-[10px] font-black uppercase">${p.type.charAt(0)}</span>
                </div>
                <span class="px-3 py-1 bg-${colors[p.type]}-50 text-${colors[p.type]}-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-${colors[p.type]}-100">${p.type}</span>
                <span class="text-sm font-black text-gray-900 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">${p.author.charAt(0).toUpperCase()}</div>
                    ${p.author}
                </span>
                <span class="text-[10px] text-gray-400 font-bold ml-auto uppercase tracking-tighter">${new Date(p.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                
                ${isTeacher ? `
                    <div class="flex gap-2">
                        <button onclick="window.openArgumentFeedback('${p.id}')" class="p-2 text-primary hover:bg-blue-50 rounded-lg transition-all" title="Give Feedback">
                            <span class="iconify" data-icon="mdi:comment-check"></span>
                        </button>
                        <button onclick="window.deletePost('${p.id}')" class="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                            <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                        </button>
                    </div>
                ` : ''}
            </div>
            <p class="text-gray-700 leading-relaxed font-medium pl-11 text-lg">${p.text}</p>
            
            ${p.feedback && App.teacherSettings.showFeedbackToStudents ? `
                <div class="mt-4 ml-11 p-4 bg-blue-50 border border-blue-100 rounded-2xl relative">
                    <div class="flex items-start gap-3">
                        ${p.feedback.sticker ? `<span class="text-2xl">${p.feedback.sticker}</span>` : '<span class="iconify text-primary text-xl" data-icon="mdi:comment-text"></span>'}
                        <div>
                            <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Teacher Feedback</p>
                            <p class="text-sm font-bold text-blue-900">${p.feedback.text || 'Checked!'}</p>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="mt-4 pl-11 flex gap-4">
                <button class="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1">
                    <span class="iconify" data-icon="mdi:comment-outline"></span>
                    Reply
                </button>
                <button onclick="window.flagPost('${p.id}')" class="text-[10px] font-black ${p.flagged ? 'text-red-500' : 'text-gray-400'} uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1">
                    <span class="iconify" data-icon="mdi:flag-outline"></span>
                    ${p.flagged ? 'Flagged' : 'Flag'}
                </button>
            </div>
        </div>
    `).join('');
}

function renderPostTypeButtons(colors) {
    return Object.keys(colors).map(type => {
        const color = colors[type];
        const isActive = currentPostType === type;
        return `
            <button onclick="window.setPostType('${type}')" 
                class="post-type-btn px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${isActive ? `border-${color}-500 bg-${color}-500 text-white shadow-md shadow-${color}-100` : `border-gray-100 bg-white text-gray-400 hover:border-${color}-200 hover:text-${color}-500`}" 
                data-type="${type}">
                ${type}
            </button>
        `;
    }).join('');
}


/**
 * Sets the type of the next post to be published.
 * @param {string} type - 'claim' | 'support' | 'challenge' | 'question'.
 */
export function setPostType(type) {
    currentPostType = type;
    renderStudentContent();
}

/**
 * Publishes a new argument post to the shared class discussion.
 */
export async function addPost() {
    const input = document.getElementById('postInput');
    const text = input?.value.trim();
    if (!text) return;
    
    const post = {
        id: 'post_' + Date.now(),
        type: currentPostType,
        text,
        author: App.user.name,
        authorId: App.user.visitorId,
        time: Date.now(),
        replies: []
    };
    
    if (!App.sharedData.debatePosts) App.sharedData.debatePosts = [];
    App.sharedData.debatePosts.push(post);
    
    if (input) input.value = '';
    
    await saveAndBroadcast('debatePosts', App.sharedData.debatePosts);
    renderStudentContent();
    toast('Argument shared with the class!', 'success');
}

/**
 * UI: Opens the feedback modal for a specific argument post.
 */
export function openArgumentFeedback(postId) {
    App.editingPostId = postId;
    const post = App.sharedData.debatePosts.find(p => p.id === postId);
    if (!post) return;

    const modal = document.getElementById('commentModal');
    const input = document.getElementById('commentText');
    if (modal && input) {
        input.value = post.feedback?.text || '';
        if (post.feedback?.sticker) {
            window.setFeedbackSticker(post.feedback.sticker);
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        input.focus();
    }
}

/**
 * Persists feedback for an argument post.
 */
export async function saveArgumentFeedback() {
    const postId = App.editingPostId;
    const val = document.getElementById('commentText')?.value.trim();
    const sticker = App.viewerState.selectedSticker;
    
    const post = App.sharedData.debatePosts.find(p => p.id === postId);
    if (post) {
        post.feedback = { text: val, sticker, time: Date.now() };
        await saveAndBroadcast('debatePosts', App.sharedData.debatePosts);
        window.closeCommentModal();
        renderStudentContent();
        toast('Feedback updated', 'success');
    }
}

/**
 * Flags a post for teacher review.
 */
export async function flagPost(postId) {
    const post = App.sharedData.debatePosts.find(p => p.id === postId);
    if (post) {
        post.flagged = !post.flagged;
        await saveAndBroadcast('debatePosts', App.sharedData.debatePosts);
        renderStudentContent();
        toast(post.flagged ? 'Post flagged for teacher review' : 'Flag removed', 'info');
    }
}

/**
 * Deletes a discussion post.
 */
export async function deletePost(id) {
    if (confirm('Delete this post?')) {
        App.sharedData.debatePosts = App.sharedData.debatePosts.filter(p => p.id !== id);
        await saveAndBroadcast('debatePosts', App.sharedData.debatePosts);
        renderStudentContent();
        toast('Post deleted', 'info');
    }
}
