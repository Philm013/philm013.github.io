/* global Chart */
export const UI = {
    app: null,
    currentView: 'dashboardView',
    chartInstance: null,
    allCards: [],

    init(appInstance) {
        this.app = appInstance;
        this.bindNavigation();
        this.bindCaptureActions();
        this.bindSettings();
        this.bindCollectionControls();
        this.bindDataManagement();
        this.bindBottomSheet();
        this.bindCvTuning();
        
        import('./db.js').then(module => {
            module.DB.getSetting('geminiApiKey').then(key => {
                if (key) {
                    document.getElementById('apiKeyInput').value = key;
                    this.refreshModelList();
                }
            });
            module.DB.getSetting('geminiModel').then(model => {
                if (model) document.getElementById('modelSelect').value = model;
            });

            // Load CV Settings
            const cvSettings = ['cvCannyHigh', 'cvCannyLow', 'cvClahe', 'cvBilateral', 'cvMorph', 'cvAccuracy'];
            cvSettings.forEach(s => {
                module.DB.getSetting(s).then(val => {
                    if (val) {
                        const el = document.getElementById(s);
                        if (el) el.value = val;
                        
                        // Sync the "Tune" sliders in capture view
                        const tuneId = s.replace('cv', 'tune');
                        const tuneEl = document.getElementById(tuneId);
                        if (tuneEl) {
                            tuneEl.value = val;
                            const valDisplay = document.getElementById(tuneId.replace('tune', 'val'));
                            if (valDisplay) valDisplay.textContent = val;
                        }
                    }
                });
            });
        });
    },

    bindCvTuning() {
        const sheet = document.getElementById('cvSettingsSheet');
        const openBtn = document.getElementById('openCvTuneBtn');
        const closeBtn = document.getElementById('closeCvTuneBtn');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                sheet.classList.remove('hidden', 'lg:hidden');
                setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sheet.classList.add('translate-y-full');
                setTimeout(() => sheet.classList.add('hidden', 'lg:hidden'), 400);
            });
        }

        // Live syncing of sliders
        ['CannyHigh', 'CannyLow', 'Clahe', 'Bilateral', 'Morph', 'Accuracy'].forEach(s => {
            const tuneEl = document.getElementById('tune' + s);
            const valDisplay = document.getElementById('val' + s);
            const mainEl = document.getElementById('cv' + s);

            if (tuneEl) {
                tuneEl.addEventListener('input', async (e) => {
                    const val = e.target.value;
                    if (valDisplay) valDisplay.textContent = val;
                    if (mainEl) mainEl.value = val; // Sync main settings page

                    // Save instantly
                    const { DB } = await import('./db.js');
                    await DB.saveSetting('cv' + s, val);

                    // Trigger re-detect if an image is active
                    const { Capture } = await import('./capture.js');
                    if (Capture.currentImage) {
                        Capture.detectCards();
                    }
                });
            }
        });
    },

    async refreshModelList() {
        const { AI } = await import('./ai.js');
        const models = await AI.fetchAvailableModels();
        const select = document.getElementById('modelSelect');
        const currentVal = select.value;
        
        if (models.length === 0) {
            select.innerHTML = '<option value="gemini-1.5-flash">Default (Gemini 1.5 Flash)</option>';
            return;
        }

        select.innerHTML = models.map(m => {
            const shortName = m.name.replace('models/', '');
            return `<option value="${shortName}">${m.displayName || shortName}</option>`;
        }).join('');
        
        if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
            select.value = currentVal;
        }
    },

    bindBottomSheet() {
        const overlay = document.getElementById('sheetOverlay');
        const sheet = document.getElementById('cardBottomSheet');
        
        overlay.addEventListener('click', () => this.closeBottomSheet());
        
        // Simple swipe down to close
        let touchStartY = 0;
        sheet.querySelector('.sheet-handle').addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });
        sheet.querySelector('.sheet-handle').addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            if (touchY - touchStartY > 50) this.closeBottomSheet();
        });
    },

    openBottomSheet() {
        document.getElementById('sheetOverlay').classList.add('show');
        document.getElementById('cardBottomSheet').classList.add('open');
        if (navigator.vibrate) navigator.vibrate(10);
    },

    closeBottomSheet() {
        document.getElementById('sheetOverlay').classList.remove('show');
        document.getElementById('cardBottomSheet').classList.remove('open');
    },

    bindCollectionControls() {
        const applyFilters = () => {
            const query = document.getElementById('searchInput').value.toLowerCase();
            const sport = document.getElementById('sportFilter').value;
            const sort = document.getElementById('sortOrder').value;

            let filtered = this.allCards.filter(card => {
                const matchesSearch = card.player.toLowerCase().includes(query) || card.brand.toLowerCase().includes(query) || card.team.toLowerCase().includes(query) || card.year.toString().includes(query);
                const matchesSport = sport === 'All' || card.sport === sport;
                return matchesSearch && matchesSport;
            });

            filtered.sort((a, b) => {
                if (sort === 'valueHigh') return (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0);
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            });

            this.renderGrid(filtered);
        };

        document.getElementById('searchInput').addEventListener('input', applyFilters);
        document.getElementById('sportFilter').addEventListener('change', applyFilters);
        document.getElementById('sortOrder').addEventListener('change', applyFilters);
    },

    bindDataManagement() {
        document.getElementById('exportDataBtn').addEventListener('click', async () => {
            const module = await import('./db.js');
            const cards = await module.DB.getAllCards();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cards));
            const dl = document.createElement('a');
            dl.setAttribute("href", dataStr);
            dl.setAttribute("download", `CardVault_Backup.json`);
            dl.click();
            this.showToast("Collection exported!", "success");
        });

        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const cards = JSON.parse(event.target.result);
                    this.showLoading(`Importing ${cards.length} cards...`);
                    const module = await import('./db.js');
                    for (const card of cards) await module.DB.updateCard(card);
                    this.hideLoading();
                    this.showToast("Import successful!", "success");
                    this.app.loadCollection();
                } catch (err) {
                    console.error(err);
                    this.hideLoading();
                    this.showToast("Import failed", "error");
                }
            };
            reader.readAsText(file);
        });
    },

    bindNavigation() {
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-nav');
                this.switchView(target);
                if (navigator.vibrate) navigator.vibrate(5);
            });
        });
    },

    bindCaptureActions() {
        const Capture = import('./capture.js').then(m => m.Capture);
        
        document.getElementById('uploadPhotoInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                (await Capture).loadUploadedImage(file);
                document.getElementById('retakePhotoBtn').classList.remove('hidden');
                document.getElementById('processCardsBtn').classList.remove('hidden');
                document.getElementById('takePhotoBtn').classList.add('hidden');
                e.target.value = ''; // Reset
            }
        });

        document.getElementById('takePhotoBtn').addEventListener('click', async () => {
            (await Capture).takePhoto();
            document.getElementById('retakePhotoBtn').classList.remove('hidden');
            document.getElementById('processCardsBtn').classList.remove('hidden');
            document.getElementById('takePhotoBtn').classList.add('hidden');
        });

        document.getElementById('retakePhotoBtn').addEventListener('click', async () => {
            (await Capture).startCamera();
            document.getElementById('retakePhotoBtn').classList.add('hidden');
            document.getElementById('processCardsBtn').classList.add('hidden');
            document.getElementById('takePhotoBtn').classList.remove('hidden');
        });

        document.getElementById('processCardsBtn').addEventListener('click', () => {
            this.app.processCapturedCards();
        });
    },

    bindSettings() {
        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            const key = document.getElementById('apiKeyInput').value;
            const model = document.getElementById('modelSelect').value;
            await this.app.saveSettings(key, model);

            // Save CV Settings
            const module = await import('./db.js');
            await module.DB.saveSetting('cvCannyHigh', document.getElementById('cvCannyHigh').value);
            await module.DB.saveSetting('cvBlur', document.getElementById('cvBlur').value);
            await module.DB.saveSetting('cvAccuracy', document.getElementById('cvAccuracy').value);

            this.refreshModelList();
        });
    },

    switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        this.currentView = viewId;

        // Header/Nav visibility
        const isCapture = viewId === 'captureView';
        document.getElementById('mainHeader').classList.toggle('hidden', isCapture);
        document.getElementById('bottomNav').classList.toggle('hidden', isCapture);

        // Sidebar/BottomNav active states
        document.querySelectorAll('[data-nav]').forEach(btn => {
            const isTarget = btn.getAttribute('data-nav') === viewId;
            const isSidebar = btn.closest('#sidebar');
            
            if (isSidebar) {
                btn.classList.toggle('text-blue-600', isTarget);
                btn.classList.toggle('bg-blue-50', isTarget);
                btn.classList.toggle('text-gray-400', !isTarget);
                btn.classList.toggle('bg-transparent', !isTarget);
            } else {
                btn.classList.toggle('text-blue-600', isTarget);
                btn.classList.toggle('text-gray-400', !isTarget);
            }
        });

        if (viewId === 'captureView') {
            import('./capture.js').then(m => {
                if (m.Capture.currentImage) {
                    m.Capture.videoEl.style.display = 'none';
                    m.Capture.canvasEl.style.display = 'block';
                    m.Capture.detectCards(); // Re-detect with potentially new settings
                    
                    document.getElementById('takePhotoBtn').classList.add('hidden');
                    document.getElementById('retakePhotoBtn').classList.remove('hidden');
                } else {
                    m.Capture.startCamera();
                    document.getElementById('takePhotoBtn').classList.remove('hidden');
                    document.getElementById('retakePhotoBtn').classList.add('hidden');
                }
            });
        } else {
            import('./capture.js').then(m => m.Capture.stopCamera());
        }
    },

    renderCollection(cards) {
        this.allCards = cards;
        this.renderGrid(cards);
    },

    renderGrid(cards) {
        const grid = document.getElementById('collectionGrid');
        grid.innerHTML = '';
        if (cards.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-20 font-bold">No cards found</div>';
            return;
        }

        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-transform relative border border-gray-100';
            cardEl.innerHTML = `
                <img src="${card.imageBlob}" class="w-full h-40 object-cover bg-gray-50">
                <div class="p-3">
                    <h3 class="font-bold text-sm truncate">${card.player}</h3>
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tight">${card.year} • ${card.sport}</p>
                    <div class="mt-2 flex justify-between items-center">
                        <span class="text-sm font-black text-green-600">$${card.estimatedValue}</span>
                        <span class="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500">${card.estimatedCondition}</span>
                    </div>
                </div>
                <button class="absolute top-2 right-2 bg-white/80 backdrop-blur-md text-red-500 rounded-full w-7 h-7 flex items-center justify-center shadow-sm delete-btn" data-id="${card.id}">
                    <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                </button>
            `;

            cardEl.addEventListener('click', (e) => {
                if(!e.target.closest('.delete-btn')) this.showCardDetail(card);
            });

            cardEl.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.app.deleteCard(card.id);
            });

            grid.appendChild(cardEl);
        });
    },

    renderDashboard(cards) {
        document.getElementById('totalCardsStat').textContent = cards.length;
        document.getElementById('totalValueStat').textContent = '$' + cards.reduce((sum, c) => sum + (Number(c.estimatedValue) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2});
        
        // Render Recent Grid
        const recent = [...cards].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 5);
        const grid = document.getElementById('recentGrid');
        if (grid) {
            grid.innerHTML = '';
            recent.forEach(card => {
                const el = document.createElement('div');
                el.className = 'bg-gray-50 rounded-2xl overflow-hidden aspect-square border border-gray-100 cursor-pointer hover:scale-105 transition-transform';
                el.innerHTML = `<img src="${card.imageBlob}" class="w-full h-full object-cover">`;
                el.onclick = () => this.showCardDetail(card);
                grid.appendChild(el);
            });
        }

        this.renderChart(cards);
    },

    renderChart(cards) {
        const ctx = document.getElementById('valueChart').getContext('2d');
        if (this.chartInstance) this.chartInstance.destroy();
        const sportData = {};
        cards.forEach(c => { sportData[c.sport] = (sportData[c.sport] || 0) + (Number(c.estimatedValue) || 0); });
        const labels = Object.keys(sportData);
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: labels.map(l => sportData[l]),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'],
                    borderWidth: 0,
                    hoverOffset: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold', size: 10 } } }
                }
            }
        });
    },

    showCardDetail(card) {
        document.getElementById('detailImage').src = card.imageBlob;
        document.getElementById('editPlayer').value = card.player;
        document.getElementById('editSport').value = card.sport || '';
        document.getElementById('editYear').value = card.year;
        document.getElementById('editBrand').value = card.brand || '';
        document.getElementById('editSet').value = card.set || '';
        document.getElementById('editCardNumber').value = card.cardNumber || '';
        document.getElementById('editTeam').value = card.team || '';
        document.getElementById('editCondition').value = card.estimatedCondition;
        document.getElementById('editValue').value = card.estimatedValue;
        document.getElementById('editCitation').value = card.citation || '';

        const saveBtn = document.getElementById('saveEditBtn');
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

        const deleteBtn = document.getElementById('deleteDetailBtn');
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        newSaveBtn.addEventListener('click', () => {
            card.player = document.getElementById('editPlayer').value;
            card.sport = document.getElementById('editSport').value;
            card.year = document.getElementById('editYear').value;
            card.brand = document.getElementById('editBrand').value;
            card.set = document.getElementById('editSet').value;
            card.cardNumber = document.getElementById('editCardNumber').value;
            card.team = document.getElementById('editTeam').value;
            card.estimatedCondition = document.getElementById('editCondition').value;
            card.estimatedValue = document.getElementById('editValue').value;
            card.citation = document.getElementById('editCitation').value;
            this.app.saveCardEdit(card);
            this.closeBottomSheet();
        });

        newDeleteBtn.addEventListener('click', () => {
            this.closeBottomSheet();
            this.app.deleteCard(card.id);
        });

        document.getElementById('cancelEditBtn').onclick = () => this.closeBottomSheet();
        this.openBottomSheet();
    },

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl text-white z-[120] font-bold transition-all duration-300 ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-600'}`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    },

    showLoading(message) {
        document.getElementById('loadingText').textContent = message;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    },

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
};