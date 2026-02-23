/**
 * @file utils.js
 * @description Core utility functions for the NexusIDE system, including timing and string manipulation helpers.
 */

/**
 * Creates a debounced version of a function that delays its execution until after 
 * a specified wait time has elapsed since the last time it was invoked.
 * 
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} - The debounced function.
 */
export const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
        const context = this;
        const later = () => {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Escapes HTML special characters in a string to prevent XSS or layout breakage.
 * Uses a temporary DOM element for reliable browser-native escaping.
 * 
 * @param {string} text - The raw text to escape.
 * @returns {string} - The HTML-escaped string.
 */
export const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Generates a unique identifier string using a combination of random characters and the current timestamp.
 * Useful for assigning unique IDs to dynamically created shapes or UI elements.
 * 
 * @returns {string} - A unique alphanumeric ID.
 */
export const uid = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
