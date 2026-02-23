/**
 * @file VisualEngine.js
 * @description Unified rendering pipeline for NexusIDE. Handles high-fidelity HTML-to-Image conversion and screen/element captures.
 */

/* global html2canvas */

/**
 * Static utility class for performing visual rendering operations.
 * Relies on the html2canvas library for DOM-to-Canvas conversion.
 */
export class VisualEngine {
    /**
     * Converts raw HTML content into a high-res DataURL by rendering it in a hidden iframe.
     * Useful for background thumbnail generation.
     * 
     * @param {string} htmlContent - Raw HTML code to render.
     * @param {number} [width=1024] - Virtual viewport width.
     * @param {number} [height=768] - Virtual viewport height.
     * @returns {Promise<string|null>} Data URL of the rendered image.
     */
    static async renderHTML(htmlContent, width = 1024, height = 768) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            Object.assign(iframe.style, {
                width: `${width}px`, height: `${height}px`,
                position: 'fixed', left: '-9999px', top: '-9999px',
                visibility: 'hidden'
            });
            iframe.sandbox = "allow-scripts allow-same-origin";
            document.body.appendChild(iframe);
            
            iframe.onload = () => {
                setTimeout(async () => {
                    try {
                        const data = await this.renderElement(iframe.contentDocument.body, { width, height });
                        document.body.removeChild(iframe);
                        resolve(data);
                    } catch (err) {
                        console.error('RenderHTML failed:', err);
                        document.body.removeChild(iframe);
                        resolve(null);
                    }
                }, 800); // Wait for Tailwind/Layout reflow
            };
            iframe.srcdoc = htmlContent;
        });
    }

    /**
     * Captures an existing DOM element.
     * Handles specific logic for IFRAMEs by attempting to capture their internal body.
     * 
     * @param {HTMLElement} element - The target element to capture.
     * @param {Object} [options={}] - Capture options (scale, etc).
     * @returns {Promise<string|null>} Data URL of the capture.
     */
    static async renderElement(element, options = {}) {
        console.log("VisualEngine: Preparing capture...");
        if (!element) {
            console.error("VisualEngine: Element is null");
            return null;
        }

        console.log(`VisualEngine: Element dimensions: ${element.clientWidth}x${element.clientHeight}`);
        if (element.clientWidth === 0 || element.clientHeight === 0) {
            console.warn("VisualEngine: Element has 0 dimension. Attempting to wait for layout...");
            await new Promise(r => setTimeout(r, 1000));
            console.log(`VisualEngine: Dimensions after wait: ${element.clientWidth}x${element.clientHeight}`);
        }

        let target = element;
        const isIframe = element.tagName === 'IFRAME';
        
        if (isIframe) {
            try {
                if (element.contentDocument && element.contentDocument.body) {
                    target = element.contentDocument.body;
                    console.log("VisualEngine: Targeting iframe body");
                    
                    if (target.scrollHeight === 0) {
                        target.style.minHeight = '100vh';
                    }
                }
            } catch (e) {
                console.warn("VisualEngine: Cross-origin restriction or access error for iframe content. Capturing iframe element instead.", e);
            }
        }

        try {
            console.log("VisualEngine: Calling html2canvas...");
            const canvas = await html2canvas(target, {
                useCORS: true,
                backgroundColor: isIframe ? '#ffffff' : null,
                scale: options.scale || 2,
                logging: true,
                width: target.scrollWidth || target.clientWidth || undefined,
                height: target.scrollHeight || target.clientHeight || undefined,
            });
            
            const dataUrl = canvas.toDataURL('image/png');
            console.log("VisualEngine: Capture complete.");
            return dataUrl;
        } catch (e) {
            console.error("VisualEngine: html2canvas threw an error:", e);
            return null;
        }
    }

    /**
     * Alias for `renderElement` for API compatibility.
     */
    static async captureElement(element, options = {}) {
        return this.renderElement(element, options);
    }

    /**
     * Fallback for full-screen capture using the Screen Capture API (getDisplayMedia).
     * @returns {Promise<string|null>} Data URL.
     */
    static async captureScreen() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    setTimeout(() => {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        canvas.getContext('2d').drawImage(video, 0, 0);
                        const data = canvas.toDataURL('image/png');
                        stream.getTracks().forEach(t => t.stop());
                        resolve(data);
                    }, 500);
                };
            });
        } catch (err) {
            console.error('Capture screen failed:', err);
            return null;
        }
    }
}
