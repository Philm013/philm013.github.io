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
        <div class="max-w-4xl mx-auto">
            ${renderModuleHeader('Engaging in Argument', 'mdi:forum', 'SEP7')}
            
            <div class="bg-white rounded-xl shadow-sm border p-6">
                <h3 class="font-semibold text-gray-900 mb-4">Class Discussion</h3>
                
                <div class="space-y-3 max-h-96 overflow-y-auto mb-6 custom-scrollbar" id="discussionThread">
                    ${renderDiscussionPosts(colors)}
                </div>
                
                <div class="border-t pt-4">
                    <div class="flex gap-2 mb-3">
                        ${renderPostTypeButtons(colors)}
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="postInput" placeholder="Share your argument..." 
                            class="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                            onkeypress="if(event.key==='Enter')window.addPost()">
                        <button onclick="window.addPost()" class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors">
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the list of discussion posts.
 * @param {Object} colors - Map of post types to Tailwind color names.
 * @returns {string} HTML content.
 */
function renderDiscussionPosts(colors) {
    const posts = App.sharedData.debatePosts || [];
    if (posts.length === 0) return '<p class="text-gray-400 text-center py-8">Start the discussion!</p>';
    
    return posts.map(p => `
        <div class="p-4 bg-${colors[p.type]}-50 rounded-lg border-l-4 border-${colors[p.type]}-500">
            <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-0.5 bg-${colors[p.type]}-200 text-${colors[p.type]}-700 rounded text-xs font-medium uppercase">${p.type}</span>
                <span class="text-sm font-medium text-gray-700">${p.author}</span>
                <span class="text-xs text-gray-400">${new Date(p.time).toLocaleTimeString()}</span>
            </div>
            <p class="text-gray-700">${p.text}</p>
        </div>
    `).join('');
}

/**
 * Renders buttons to select the type of post to create.
 * @param {Object} colors - Map of post types to Tailwind color names.
 * @returns {string} HTML content.
 */
function renderPostTypeButtons(colors) {
    return Object.keys(colors).map(type => {
        const color = colors[type];
        const isActive = currentPostType === type;
        return `
            <button onclick="window.setPostType('${type}')" 
                class="post-type-btn px-3 py-1 rounded-full text-sm border-2 transition-all ${isActive ? `border-${color}-500 bg-${color}-50 text-${color}-700` : 'border-gray-200 text-gray-600'}" 
                data-type="${type}">
                ${type.charAt(0).toUpperCase() + type.slice(1)}
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
