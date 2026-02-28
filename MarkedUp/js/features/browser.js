const Browser = {
    go() {
        let url = document.getElementById('urlInput').value.trim();
        if (!url) return;
        if (!url.startsWith('http')) url = 'https://' + url;
        document.getElementById('urlInput').value = url;
        document.getElementById('webFrame').src = url;
    },

    async capture() {
        const isFullPage = document.getElementById('fullPageCheck') ? document.getElementById('fullPageCheck').checked : false;
        const manualHeight = document.getElementById('manualHeight') ? parseInt(document.getElementById('manualHeight').value) : 2000;
        const iframe = document.getElementById('webFrame');
        const originalHeight = iframe.style.height;
        
        try {
            const currentUrl = document.getElementById('urlInput').value;
            const apiKey = Settings.get('screenshotApiKey');
            const provider = Settings.get('screenshotApiProvider');

            // 1. Determine if we should use an API
            // WordPress mShots is free and doesn't need a key
            if (apiKey || provider === 'mshots') {
                return this.apiCapture(currentUrl, isFullPage);
            }

            // 2. Native Screenshot via getDisplayMedia
            Toast.show('Select this tab in the sharing prompt...');
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error('Screenshot API not supported. Try Proxy Capture.');
            }
            
            const iframeRect = iframe.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    displaySurface: 'browser',
                    width: { ideal: 3840 }, // Ask for 4K if possible
                    height: { ideal: 2160 },
                    frameRate: { ideal: 1 } // We only need 1 frame
                },
                preferCurrentTab: true
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            
            // Wait for video to settle
            await new Promise(r => setTimeout(r, 500));
            
            const fullCanvas = document.createElement('canvas');
            // Use video dimensions directly for best quality
            fullCanvas.width = video.videoWidth;
            fullCanvas.height = video.videoHeight;
            fullCanvas.getContext('2d', { alpha: false, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' })
                      .drawImage(video, 0, 0);
            
            stream.getTracks().forEach(t => t.stop());
            if (isFullPage) iframe.style.height = originalHeight;

            // Accurate cropping using actual captured dimensions vs window dimensions
            const scaleX = fullCanvas.width / window.innerWidth;
            const scaleY = fullCanvas.height / window.innerHeight;
            
            const cropX = iframeRect.left * scaleX;
            const cropY = iframeRect.top * scaleY;
            const cropW = iframeRect.width * scaleX;
            const cropH = Math.min(iframeRect.height * scaleY, fullCanvas.height - cropY);
            
            if (cropH <= 0) throw new Error('Capture area not visible');

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropW;
            croppedCanvas.height = cropH;
            const ctx = croppedCanvas.getContext('2d', { alpha: false, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
            ctx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            
            const img = await Utils.loadImage(croppedCanvas.toDataURL('image/png', 1.0));
            Library.addCapture(img, isFullPage ? 'Full Capture' : 'Web Capture');
        } catch (e) {
            console.error('Capture failed:', e);
            iframe.style.height = originalHeight;
            
            if (e.name === 'NotAllowedError' || e.message.includes('permission')) {
                Toast.show('Capture cancelled', 'error');
            } else {
                Modal.confirm('Capture Issue', 
                    'Standard capture failed. Try "Proxy Capture" (may be less accurate)?',
                    () => this.proxyCapture(document.getElementById('urlInput').value, isFullPage)
                );
            }
        }
    },

    async apiCapture(url, isFullPage, retryCount = 0) {
        const apiKey = Settings.get('screenshotApiKey');
        const provider = Settings.get('screenshotApiProvider');
        const customProxy = Settings.get('customProxyUrl');
        
        if (provider === 'mshots') {
            Toast.show(retryCount > 0 ? `Retrying capture (${retryCount})...` : 'Requesting WordPress mShots...');
        } else {
            Toast.show('Capturing via Pro API (Pixel Perfect)...');
        }
        
        try {
            let apiUrl = '';
            if (provider === 'apiflash') {
                apiUrl = `https://api.apiflash.com/v1/screenshot?access_key=${apiKey}&url=${encodeURIComponent(url)}&full_page=${isFullPage}&format=png&width=1440&height=900`;
            } else if (provider === 'screenshotlayer') {
                apiUrl = `https://api.screenshotlayer.com/api/capture?access_key=${apiKey}&url=${encodeURIComponent(url)}&fullpage=${isFullPage ? 1 : 0}&viewport=1440x900&format=png`;
            } else if (provider === 'mshots') {
                const cacheBuster = retryCount > 0 ? `&v=${Date.now()}` : '';
                apiUrl = `https://s0.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1440&h=1080${cacheBuster}`;
            }

            // Route through proxy to bypass CORS
            let finalUrl = apiUrl;
            if (customProxy) {
                finalUrl = `${customProxy}${encodeURIComponent(apiUrl)}`;
            }
            
            const img = await Utils.loadImage(finalUrl);
            
            // WordPress mShots logic: If the image is very small or looks like the "Generating" placeholder, retry.
            // Note: mShots returns a real image that says "Generating preview" if it hasn't seen the site.
            if (provider === 'mshots' && retryCount < 3) {
                // If it's a fast response, it's likely the placeholder. Wait and retry.
                // We also check if it's the specific placeholder dimensions if possible, 
                // but usually a delay-based retry is safer for mShots.
                if (img.width === 400 && img.height === 300) { // Common mshots placeholder size
                    Toast.show('WordPress is generating preview, waiting...');
                    await new Promise(r => setTimeout(r, 3000));
                    return this.apiCapture(url, isFullPage, retryCount + 1);
                }
            }

            Library.addCapture(img, isFullPage ? `Pro Full (${provider})` : `Pro Web (${provider})`);
            Toast.show('Capture Success!');
        } catch (e) {
            console.error('API Capture failed:', e);
            
            if (provider === 'mshots' && retryCount < 3) {
                // Sometimes mShots just fails initially, try one more time
                await new Promise(r => setTimeout(r, 2000));
                return this.apiCapture(url, isFullPage, retryCount + 1);
            }

            Modal.confirm('API Error', `The ${provider} service failed. Fall back to Native Capture?`, () => {
                // Temporarily disable API to force native fallback
                const oldProvider = Settings.get('screenshotApiProvider');
                Settings.set('screenshotApiProvider', 'native');
                this.capture().then(() => Settings.set('screenshotApiProvider', oldProvider));
            });
        }
    },

    async proxyCapture(url, isFullPage) {
        const customProxy = Settings.get('customProxyUrl');
        const proxyUrl = customProxy ? `${customProxy}${encodeURIComponent(url)}` : `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        console.log('Proxy Capture Attempt:', proxyUrl);
        Toast.show('Fetching page via proxy...');
        
        try {
            const response = await fetch(proxyUrl, { mode: 'cors' });
            if (!response.ok) throw new Error(`Proxy server returned ${response.status}: ${response.statusText}`);
            const html = await response.text();
            
            // Create a hidden iframe for rendering
            const renderFrame = document.createElement('iframe');
            renderFrame.style.position = 'fixed';
            renderFrame.style.top = '-10000px';
            renderFrame.style.width = isFullPage ? '1200px' : document.getElementById('webFrame').clientWidth + 'px';
            renderFrame.style.height = isFullPage ? '3000px' : document.getElementById('webFrame').clientHeight + 'px';
            document.body.appendChild(renderFrame);
            
            // Inject content
            const doc = renderFrame.contentWindow.document;
            doc.open();
            doc.write(html);
            
            // If using external proxy, inject base tag manually
            if (!customProxy && !html.includes('<base')) {
                const base = doc.createElement('base');
                base.href = url;
                doc.head.prepend(base);
            }
            doc.close();
            
            Toast.show('Rendering for capture...');
            // Wait for images and layout
            await new Promise(r => setTimeout(r, 2500)); 
            
            const canvas = await html2canvas(doc.body, {
                useCORS: true,
                scale: window.devicePixelRatio || 2,
                logging: false,
                backgroundColor: '#ffffff',
                width: renderFrame.clientWidth,
                height: isFullPage ? doc.body.scrollHeight : renderFrame.clientHeight
            });
            
            const img = await Utils.loadImage(canvas.toDataURL('image/png'));
            Library.addCapture(img, customProxy ? 'Self-Proxy Capture' : 'Proxy Capture');
            
            document.body.removeChild(renderFrame);
            Toast.show('Proxy capture success!');
        } catch (e) {
            console.error('Proxy capture failed:', e);
            Toast.show('Proxy capture failed: ' + e.message, 'error');
        }
    }
};

