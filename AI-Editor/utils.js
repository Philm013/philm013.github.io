// --- Utility Functions ---

export const deriveLanguageFromName = (filename) => {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'html': case 'htm': return 'html';
        case 'css': return 'css';
        case 'js': case 'mjs': case 'cjs': return 'javascript';
        case 'json': return 'json';
        case 'md': return 'markdown';
        case 'py': return 'python'; // Added common languages
        case 'java': return 'text/x-java';
        case 'c': case 'h': return 'text/x-csrc';
        case 'cpp': case 'hpp': case 'cxx': return 'text/x-c++src';
        case 'cs': return 'text/x-csharp';
        case 'sh': return 'text/x-sh';
        case 'rb': return 'ruby';
        case 'php': return 'php';
        case 'go': return 'go';
        case 'rs': return 'rust';
        case 'ts': return 'text/typescript';
        case 'tsx': return 'text/typescript-jsx'; // For React TSX
        case 'jsx': return 'jsx'; // For React JSX
        default: return 'text';
    }
};

export const extractUntitledCounter = (filename) => {
    const match = filename?.match(/^untitled-(\d+)\./i);
    return match ? parseInt(match[1], 10) : 0;
};

export const getMimeType = (language) => {
    switch (language) {
        case 'html': return 'text/html';
        case 'css': return 'text/css';
        case 'javascript': return 'text/javascript';
        case 'json': return 'application/json';
        case 'markdown': return 'text/markdown';
        case 'python': return 'text/x-python';
        case 'text/x-java': return 'text/x-java-source'; // Correct MIME for Java
        case 'text/x-csrc': return 'text/x-c';
        case 'text/x-c++src': return 'text/x-c++src';
        case 'text/x-csharp': return 'text/x-csharp';
        case 'text/x-sh': return 'application/x-sh';
        case 'ruby': return 'text/x-ruby';
        case 'php': return 'application/x-httpd-php';
        case 'go': return 'text/x-go';
        case 'rust': return 'text/rust';
        case 'text/typescript': return 'application/typescript';
        case 'text/typescript-jsx': return 'text/jsx'; // Often treated as JSX
        case 'jsx': return 'text/jsx';
        case 'text': return 'text/plain';
        default: return 'application/octet-stream';
    }
};

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

export const toggleElementVisibility = (element, isVisible, displayType = 'block') => {
    if (!element) return;
    element.hidden = !isVisible;
    // Manage specific display styles (like flex) primarily with classes
    // element.style.display = isVisible ? displayType : 'none'; // Avoid direct style manipulation if possible
    element.classList.toggle('is-hidden', !isVisible);
    if (displayType !== 'block' && isVisible) {
         // If a specific display type like 'flex' is needed, add/remove a class
         element.classList.toggle(`d-${displayType}`, isVisible); // e.g., d-flex
    } else if (displayType !== 'block') {
         element.classList.remove(`d-${displayType}`);
    }

};

export const showLoading = (message = 'Processing...') => {
    const indicator = document.getElementById('loading-indicator');
    if (!indicator) return;
    indicator.textContent = message;
    indicator.classList.remove('is-hidden');
    indicator.hidden = false;
};

export const hideLoading = () => {
    const indicator = document.getElementById('loading-indicator');
    if (!indicator) return;
    indicator.classList.add('is-hidden');
    indicator.hidden = true;
};

export const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const escapeHtml = (unsafe) => {
      if (typeof unsafe !== 'string') {
           console.warn("escapeHtml called with non-string value:", unsafe);
           return String(unsafe); // Attempt to stringify
      }
      return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"").replace(/'/g, "'");
 };

 // UTF-8 safe Base64 encoding
 export const utf8_to_b64 = (str) => {
    try {
        return window.btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.error("utf8_to_b64 error:", e, "Input string (first 100 chars):", str.substring(0,100));
        return ''; // Fallback or throw error
    }
 };

 // UTF-8 safe Base64 decoding
 export const b64_to_utf8 = (str) => {
    try {
        return decodeURIComponent(escape(window.atob(str)));
    } catch (e) {
        console.error("b64_to_utf8 error:", e, "Input string (first 100 chars):", str.substring(0,100));
        return ''; // Fallback or throw error
    }
 };

