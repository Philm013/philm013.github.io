/* global jsfeat */
export const Capture = {
    videoEl: null,
    canvasEl: null,
    ctx: null,
    stream: null,
    boxes: [], 
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentImage: null,
    isAutoDetecting: true,
    detectInterval: null,
    edgeMatrix: null,
    edgeScale: 1,

    getImgCoords(offsetX, offsetY) {
        const rect = this.canvasEl.getBoundingClientRect();
        const canvasRatio = this.canvasEl.width / this.canvasEl.height;
        const rectRatio = rect.width / rect.height;
        
        let renderedWidth, renderedHeight, renderX, renderY;

        // Correct logic for object-fit: contain
        if (canvasRatio > rectRatio) {
            renderedWidth = rect.width;
            renderedHeight = rect.width / canvasRatio;
            renderX = 0;
            renderY = (rect.height - renderedHeight) / 2;
        } else {
            renderedHeight = rect.height;
            renderedWidth = rect.height * canvasRatio;
            renderX = (rect.width - renderedWidth) / 2;
            renderY = 0;
        }
        
        const scale = this.canvasEl.width / renderedWidth;
        return {
            x: (offsetX - renderX) * scale,
            y: (offsetY - renderY) * scale
        };
    },

    init(videoElementId, canvasElementId) {
        this.videoEl = document.getElementById(videoElementId);
        this.canvasEl = document.getElementById(canvasElementId);
        this.ctx = this.canvasEl.getContext('2d');
        this.bindEvents();
    },

    bindEvents() {
        this.canvasEl.addEventListener('mousedown', this.onPointerDown.bind(this));
        this.canvasEl.addEventListener('mousemove', this.onPointerMove.bind(this));
        this.canvasEl.addEventListener('mouseup', this.onPointerUp.bind(this));
        
        let lastTouch = null;
        const getTouchOffset = (touch) => {
            const rect = this.canvasEl.getBoundingClientRect();
            return {
                offsetX: touch.clientX - rect.left,
                offsetY: touch.clientY - rect.top
            };
        };

        this.canvasEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            lastTouch = e.touches[0];
            this.onPointerDown(getTouchOffset(lastTouch));
        }, { passive: false });

        this.canvasEl.addEventListener('touchmove', (e) => {
            e.preventDefault();
            lastTouch = e.touches[0];
            this.onPointerMove(getTouchOffset(lastTouch));
        }, { passive: false });

        this.canvasEl.addEventListener('touchend', (e) => {
             e.preventDefault();
             if (lastTouch) {
                 this.onPointerUp(getTouchOffset(lastTouch));
             } else {
                 this.onPointerUp(e);
             }
        });

        const toggleAutoBtn = document.getElementById('toggleAutoBtn');
        if (toggleAutoBtn) {
            toggleAutoBtn.addEventListener('click', () => {
                this.isAutoDetecting = !this.isAutoDetecting;
                toggleAutoBtn.classList.toggle('bg-blue-600', this.isAutoDetecting);
                toggleAutoBtn.classList.toggle('bg-black/40', !this.isAutoDetecting);
                const status = document.getElementById('detectionStatus');
                if (status) status.textContent = this.isAutoDetecting ? "Scanning for cards..." : "Auto-detect off";
            });
        }
    },

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });
            this.videoEl.srcObject = this.stream;
            this.videoEl.onloadedmetadata = () => {
                this.canvasEl.width = this.videoEl.videoWidth;
                this.canvasEl.height = this.videoEl.videoHeight;
                this.videoEl.play();
                this.startDetection();
            };
            this.videoEl.style.display = 'block';
            this.canvasEl.style.display = 'block';
            this.currentImage = null;
            this.boxes = [];
        } catch (err) {
            console.error("Camera access error:", err);
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.stopDetection();
        this.videoEl.style.display = 'none';
    },

    startDetection() {
        if (this.detectInterval) return;
        this.detectInterval = setInterval(() => {
            if (this.isAutoDetecting && !this.currentImage && this.videoEl.readyState === this.videoEl.HAVE_ENOUGH_DATA) {
                this.detectCards();
            }
        }, 200);
    },

    stopDetection() {
        clearInterval(this.detectInterval);
        this.detectInterval = null;
    },

    loadUploadedImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.stopCamera();
                this.canvasEl.width = img.width;
                this.canvasEl.height = img.height;
                this.currentImage = img;
                this.boxes = [];
                const status = document.getElementById('detectionStatus');
                if (status) status.textContent = "Analyzing photo...";
                this.detectCards();
                if (status) status.textContent = "Tap a card to auto-detect edges, or draw a box.";
                this.redraw();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    detectCards() {
        const source = this.currentImage || this.videoEl;
        const srcW = source.width || source.videoWidth;
        const srcH = source.height || source.videoHeight;
        if (!srcW) return;

        const width = 320;
        const height = Math.round(width * (srcH / srcW));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(source, 0, 0, width, height);
        
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const grayImg = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(imageData.data, width, height, grayImg);
        jsfeat.imgproc.gaussian_blur(grayImg, grayImg, 2);
        jsfeat.imgproc.canny(grayImg, grayImg, 20, 60);

        this.edgeMatrix = grayImg;
        this.edgeScale = width / srcW;
        this.redraw();
    },

    takePhoto() {
        if (!this.videoEl.videoWidth) return;
        if (navigator.vibrate) navigator.vibrate(50);

        this.canvasEl.width = this.videoEl.videoWidth;
        this.canvasEl.height = this.videoEl.videoHeight;
        this.ctx.drawImage(this.videoEl, 0, 0, this.canvasEl.width, this.canvasEl.height);
        this.currentImage = new Image();
        this.currentImage.src = this.canvasEl.toDataURL('image/jpeg');
        this.stopDetection();
        this.videoEl.style.display = 'none';
        const status = document.getElementById('detectionStatus');
        if (status) status.textContent = "Analyzing capture...";
        this.detectCards();
        if (status) status.textContent = "Tap a card to auto-detect edges, or draw a box.";
        this.redraw();
    },

    onPointerDown(e) {
        if (!this.currentImage) return;
        this.isDrawing = true;
        this.moved = false;
        const coords = this.getImgCoords(e.offsetX, e.offsetY);
        this.startX = coords.x;
        this.startY = coords.y;
    },

    onPointerMove(e) {
        if (!this.isDrawing) return;
        const coords = this.getImgCoords(e.offsetX, e.offsetY);
        const currentX = coords.x;
        const currentY = coords.y;
        
        if (Math.abs(currentX - this.startX) > 15 || Math.abs(currentY - this.startY) > 15) {
            this.moved = true;
        }

        if (this.moved) {
            this.redraw();
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 6;
            this.ctx.setLineDash([20, 10]);
            this.ctx.strokeRect(this.startX, this.startY, currentX - this.startX, currentY - this.startY);
        }
    },

    onPointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const coords = this.getImgCoords(e.offsetX, e.offsetY);
        const endX = coords.x;
        const endY = coords.y;

        if (!this.moved) {
            this.tapToDetect(this.startX, this.startY);
        } else {
            const w = endX - this.startX;
            const h = endY - this.startY;
            if (Math.abs(w) > 50 && Math.abs(h) > 50) {
                this.boxes.push({
                    x: Math.min(this.startX, endX),
                    y: Math.min(this.startY, endY),
                    w: Math.abs(w),
                    h: Math.abs(h)
                });
                if (navigator.vibrate) navigator.vibrate(20);
            }
            this.redraw();
        }
    },

    tapToDetect(imgX, imgY) {
        if (!this.edgeMatrix) return;
        const scale = this.edgeScale;
        const ex = Math.round(imgX * scale);
        const ey = Math.round(imgY * scale);
        const ew = this.edgeMatrix.cols;
        const eh = this.edgeMatrix.rows;
        const data = this.edgeMatrix.data;
        
        if (ex < 0 || ex >= ew || ey < 0 || ey >= eh) return;

        const scanLimit = Math.max(ew, eh);
        const hasEdgeY = (x, centerY) => {
            for(let dy = -5; dy <= 5; dy++) {
                let y = centerY + dy;
                if (y >= 0 && y < eh && x >= 0 && x < ew && data[y * ew + x] > 0) return true;
            }
            return false;
        };
        const hasEdgeX = (centerX, y) => {
            for(let dx = -5; dx <= 5; dx++) {
                let x = centerX + dx;
                if (y >= 0 && y < eh && x >= 0 && x < ew && data[y * ew + x] > 0) return true;
            }
            return false;
        };
        
        let l = ex; while(l > 0 && !hasEdgeY(l, ey) && (ex - l) < scanLimit) l--;
        let r = ex; while(r < ew - 1 && !hasEdgeY(r, ey) && (r - ex) < scanLimit) r++;
        let t = ey; while(t > 0 && !hasEdgeX(ex, t) && (ey - t) < scanLimit) t--;
        let b = ey; while(b < eh - 1 && !hasEdgeX(ex, b) && (b - ey) < scanLimit) b++;
        
        const boxX = l / scale;
        const boxY = t / scale;
        const boxW = (r - l) / scale;
        const boxH = (b - t) / scale;
        
        if (boxW > 20 && boxH > 20) {
            this.boxes.push({ x: boxX, y: boxY, w: boxW, h: boxH });
            this.redraw();
            if (navigator.vibrate) navigator.vibrate(20);
        }
    },

    redraw() {
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        if (this.currentImage) {
            this.ctx.drawImage(this.currentImage, 0, 0);
        } else {
            this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(50, 50, this.canvasEl.width - 100, this.canvasEl.height - 100);
        }
        
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 8;
        this.ctx.setLineDash([]);
        this.ctx.lineJoin = 'round';
        
        this.boxes.forEach(box => {
            this.ctx.strokeRect(box.x, box.y, box.w, box.h);
            this.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            this.ctx.fillRect(box.x, box.y, box.w, box.h);
        });
    },

    clearBoxes() {
        this.boxes = [];
        this.redraw();
    },

    extractCrops() {
        const crops = [];
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        this.boxes.forEach(box => {
            tempCanvas.width = box.w;
            tempCanvas.height = box.h;
            tempCtx.drawImage(
                this.currentImage, // Use source image
                box.x, box.y, box.w, box.h,
                0, 0, box.w, box.h
            );
            crops.push(tempCanvas.toDataURL('image/jpeg', 0.9));
        });
        return crops;
    }
};