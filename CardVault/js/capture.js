/* global cv */
export const Capture = {
    videoEl: null,
    canvasEl: null,
    ctx: null,
    stream: null,
    boxes: [], // [{points: [{x,y}...], x, y, w, h}]
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentImage: null,
    isAutoDetecting: true,
    detectInterval: null,
    lastDetectedPolygons: [],

    getImgCoords(offsetX, offsetY) {
        const rect = this.canvasEl.getBoundingClientRect();
        const canvasRatio = this.canvasEl.width / this.canvasEl.height;
        const rectRatio = rect.width / rect.height;
        let renderedWidth, renderedHeight, renderX, renderY;
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
        return { x: (offsetX - renderX) * scale, y: (offsetY - renderY) * scale };
    },

    init(videoElementId, canvasElementId) {
        this.videoEl = document.getElementById(videoElementId);
        this.canvasEl = document.getElementById(canvasElementId);
        this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
        this.bindEvents();
    },

    bindEvents() {
        this.canvasEl.addEventListener('mousedown', this.onPointerDown.bind(this));
        this.canvasEl.addEventListener('mousemove', this.onPointerMove.bind(this));
        this.canvasEl.addEventListener('mouseup', this.onPointerUp.bind(this));
        const getTouchOffset = (touch) => {
            const rect = this.canvasEl.getBoundingClientRect();
            return { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top };
        };
        this.canvasEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onPointerDown(getTouchOffset(e.touches[0]));
        }, { passive: false });
        this.canvasEl.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onPointerMove(getTouchOffset(e.touches[0]));
        }, { passive: false });
        this.canvasEl.addEventListener('touchend', (e) => {
             e.preventDefault();
             this.onPointerUp(e);
        });

        document.getElementById('toggleAutoBtn').addEventListener('click', (e) => {
            this.isAutoDetecting = !this.isAutoDetecting;
            e.currentTarget.classList.toggle('bg-blue-600', this.isAutoDetecting);
            e.currentTarget.classList.toggle('glass-dark', !this.isAutoDetecting);
        });
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
            };
            this.videoEl.style.display = 'block';
            this.canvasEl.style.display = 'block';
            this.currentImage = null;
            this.boxes = [];
            document.getElementById('detectionStatus').textContent = "Position card in frame";
            document.getElementById('processCardsBtn').style.opacity = "0.3";
            document.getElementById('processCardsBtn').style.pointerEvents = "none";
        } catch (err) {
            console.error("Camera error:", err);
        }
    },

    stopCamera() {
        if (this.stream) { this.stream.getTracks().forEach(track => track.stop()); this.stream = null; }
        this.videoEl.style.display = 'none';
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
                this.detectCards();
                document.getElementById('detectionStatus').textContent = "Tap card to select";
                this.redraw();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async detectCards() {
        const source = this.currentImage || this.videoEl;
        const srcW = source.width || source.videoWidth;
        const srcH = source.height || source.videoHeight;
        if (!srcW || typeof cv === 'undefined') return;

        // Fetch custom settings
        const { DB } = await import('./db.js');
        const cannyHigh = parseInt(await DB.getSetting('cvCannyHigh')) || 150;
        const cannyLow = parseInt(await DB.getSetting('cvCannyLow')) || 50;
        const claheLimit = parseFloat(await DB.getSetting('cvClahe')) || 2.0;
        const bilateral = parseInt(await DB.getSetting('cvBilateral')) || 75;
        const morphSize = parseInt(await DB.getSetting('cvMorph')) || 5;
        const accuracy = (parseInt(await DB.getSetting('cvAccuracy')) || 2) / 100;

        const width = 800; // High resolution for better Canny
        const height = Math.round(width * (srcH / srcW));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(source, 0, 0, width, height);
        
        const src = cv.imread(tempCanvas);
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        // 1. CLAHE Contrast
        const clahe = new cv.CLAHE(claheLimit, new cv.Size(8, 8));
        clahe.apply(gray, gray);
        clahe.delete();

        // 2. Bilateral Smoothing
        const blurred = new cv.Mat();
        cv.bilateralFilter(gray, blurred, 9, bilateral, bilateral, cv.BORDER_DEFAULT);
        
        // 3. Canny + Morph Closing
        const thresh = new cv.Mat();
        cv.Canny(blurred, thresh, cannyLow, cannyHigh, 3, false);
        const M = cv.Mat.ones(morphSize, morphSize, cv.CV_8U);
        cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, M);
        M.delete();
        
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const found = [];
        const scale = srcW / width;

        for (let i = 0; i < contours.size(); ++i) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, accuracy * peri, true);

            // Filter for 4-sided cards
            if (approx.rows === 4 && area > (width * height * 0.02)) {
                const points = [];
                for (let j = 0; j < 4; j++) {
                    points.push({
                        x: approx.data32S[j * 2] * scale,
                        y: approx.data32S[j * 2 + 1] * scale
                    });
                }
                const rect = cv.boundingRect(approx);
                found.push({
                    points: this.sortPoints(points),
                    x: rect.x * scale, y: rect.y * scale, w: rect.width * scale, h: rect.height * scale
                });
            }
            approx.delete();
            cnt.delete();
        }

        this.lastDetectedPolygons = found;
        if (this.currentImage) this.boxes = [...found];
        
        src.delete(); gray.delete(); blurred.delete(); thresh.delete(); contours.delete(); hierarchy.delete();
        this.redraw();
        
        if (this.boxes.length > 0) {
            document.getElementById('processCardsBtn').style.opacity = "1";
            document.getElementById('processCardsBtn').style.pointerEvents = "auto";
        }
    },

    sortPoints(pts) {
        pts.sort((a, b) => a.y - b.y);
        const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
        return [top[0], top[1], bottom[1], bottom[0]];
    },

    takePhoto() {
        if (!this.videoEl.videoWidth) return;
        this.ctx.drawImage(this.videoEl, 0, 0, this.canvasEl.width, this.canvasEl.height);
        this.currentImage = new Image();
        this.currentImage.src = this.canvasEl.toDataURL('image/jpeg');
        this.videoEl.style.display = 'none';
        this.detectCards();
        document.getElementById('detectionStatus').textContent = "Cards Isolated";
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
        if (Math.abs(coords.x - this.startX) > 10) this.moved = true;
        if (this.moved) {
            this.redraw();
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([10, 5]);
            this.ctx.strokeRect(this.startX, this.startY, coords.x - this.startX, coords.y - this.startY);
        }
    },

    onPointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const coords = this.getImgCoords(e.offsetX, e.offsetY);
        if (!this.moved) {
            const tappedIdx = this.lastDetectedPolygons.findIndex(p => {
                return this.startX >= p.x && this.startX <= p.x + p.w && this.startY >= p.y && this.startY <= p.y + p.h;
            });
            if (tappedIdx !== -1) {
                const poly = this.lastDetectedPolygons[tappedIdx];
                const existingIdx = this.boxes.findIndex(b => Math.abs(b.x - poly.x) < 5);
                if (existingIdx !== -1) this.boxes.splice(existingIdx, 1);
                else this.boxes.push(poly);
            }
        } else {
            const w = coords.x - this.startX;
            const h = coords.y - this.startY;
            if (Math.abs(w) > 40 && Math.abs(h) > 40) {
                const x = Math.min(this.startX, coords.x);
                const y = Math.min(this.startY, coords.y);
                const absW = Math.abs(w);
                const absH = Math.abs(h);
                this.boxes.push({
                    x, y, w: absW, h: absH,
                    points: [
                        {x: x, y: y}, 
                        {x: x + absW, y: y}, 
                        {x: x + absW, y: y + absH}, 
                        {x: x, y: y + absH}
                    ]
                });
            }
        }
        this.redraw();
        document.getElementById('processCardsBtn').style.opacity = this.boxes.length > 0 ? "1" : "0.3";
        document.getElementById('processCardsBtn').style.pointerEvents = this.boxes.length > 0 ? "auto" : "none";
    },

    redraw() {
        this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        if (this.currentImage) this.ctx.drawImage(this.currentImage, 0, 0);
        this.boxes.forEach(box => {
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 10;
            this.ctx.setLineDash([]);
            this.ctx.beginPath();
            this.ctx.moveTo(box.points[0].x, box.points[0].y);
            box.points.slice(1).forEach(p => this.ctx.lineTo(p.x, p.y));
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            this.ctx.fill();
        });
    },

    clearBoxes() { this.boxes = []; this.redraw(); },

    extractCrops() {
        const crops = [];
        if (!this.currentImage || typeof cv === 'undefined') return crops;
        const src = cv.imread(this.canvasEl);
        this.boxes.forEach(box => {
            const width = Math.round(box.w);
            const height = Math.round(box.h);
            const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
            const srcPointsArr = [];
            box.points.forEach(p => srcPointsArr.push(p.x, p.y));
            const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, srcPointsArr);
            const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
            const dst = new cv.Mat();
            cv.warpPerspective(src, dst, M, new cv.Size(width, height));
            const tempCanvas = document.createElement('canvas');
            cv.imshow(tempCanvas, dst);
            crops.push(tempCanvas.toDataURL('image/jpeg', 0.9));
            dst.delete(); M.delete(); srcPoints.delete(); dstPoints.delete();
        });
        src.delete();
        return crops;
    }
};
