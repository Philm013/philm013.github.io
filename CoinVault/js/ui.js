/* global Chart */
export const UI = {
    app: null,
    currentView: 'dashboardView',
    chartInstance: null,
    allItems: [],

    init(appInstance) {
        this.app = appInstance;
        this.bindNavigation();
        this.bindCaptureActions();
        this.bindSettings();
        this.bindCollectionControls();
        this.bindDataManagement();
        this.bindBottomSheet();
        
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
        const sheet = document.getElementById('itemBottomSheet');
        overlay.addEventListener('click', () => this.closeBottomSheet());
        
        let touchStartY = 0;
        sheet.querySelector('.sheet-handle').addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; });
        sheet.querySelector('.sheet-handle').addEventListener('touchmove', (e) => {
            if (e.touches[0].clientY - touchStartY > 50) this.closeBottomSheet();
        });
    },

    openBottomSheet() {
        document.getElementById('sheetOverlay').classList.add('show');
        document.getElementById('itemBottomSheet').classList.add('open');
        if (navigator.vibrate) navigator.vibrate(10);
    },

    closeBottomSheet() {
        document.getElementById('sheetOverlay').classList.remove('show');
        document.getElementById('itemBottomSheet').classList.remove('open');
    },

    bindCollectionControls() {
        const applyFilters = () => {
            const query = document.getElementById('searchInput').value.toLowerCase();
            const country = document.getElementById('countryFilter').value;
            
            let filtered = this.allItems.filter(i => {
                const matchesSearch = i.country.toLowerCase().includes(query) || i.denomination.toLowerCase().includes(query) || i.year.toString().includes(query);
                const matchesCountry = country === 'All' || i.country === country;
                return matchesSearch && matchesCountry;
            });

            const sort = document.getElementById('sortOrder').value;
            filtered.sort((a, b) => {
                if (sort === 'valueHigh') return (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0);
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            });

            this.renderGrid(filtered);
        };

        document.getElementById('searchInput').addEventListener('input', applyFilters);
        document.getElementById('countryFilter').addEventListener('change', applyFilters);
        document.getElementById('sortOrder').addEventListener('change', applyFilters);
    },

    bindDataManagement() {
        document.getElementById('exportDataBtn').addEventListener('click', async () => {
            const module = await import('./db.js');
            const items = await module.DB.getAllItems();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items));
            const dl = document.createElement('a');
            dl.setAttribute("href", dataStr);
            dl.setAttribute("download", `CoinVault_Backup.json`);
            dl.click();
            this.showToast("Collection exported!", "success");
        });

        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const items = JSON.parse(event.target.result);
                    this.showLoading(`Importing ${items.length} items...`);
                    const module = await import('./db.js');
                    for (const item of items) await module.DB.updateItem(item);
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
                document.getElementById('processItemsBtn').classList.remove('hidden');
                document.getElementById('takePhotoBtn').classList.add('hidden');
                e.target.value = ''; // Reset
            }
        });

        document.getElementById('takePhotoBtn').addEventListener('click', async () => {
            (await Capture).takePhoto();
            document.getElementById('retakePhotoBtn').classList.remove('hidden');
            document.getElementById('processItemsBtn').classList.remove('hidden');
            document.getElementById('takePhotoBtn').classList.add('hidden');
        });

        document.getElementById('retakePhotoBtn').addEventListener('click', async () => {
            (await Capture).startCamera();
            document.getElementById('retakePhotoBtn').classList.add('hidden');
            document.getElementById('processItemsBtn').classList.add('hidden');
            document.getElementById('takePhotoBtn').classList.remove('hidden');
        });

        document.getElementById('processItemsBtn').addEventListener('click', () => {
            this.app.processCapturedItems();
        });
    },

    bindSettings() {
        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            const key = document.getElementById('apiKeyInput').value;
            const model = document.getElementById('modelSelect').value;
            await this.app.saveSettings(key, model);
            this.refreshModelList();
        });
    },

    switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        this.currentView = viewId;

        document.getElementById('mainHeader').style.display = viewId === 'captureView' ? 'none' : 'flex';
        document.getElementById('bottomNav').style.display = viewId === 'captureView' ? 'none' : 'flex';

        document.querySelectorAll('[data-nav]').forEach(btn => {
            const isTarget = btn.getAttribute('data-nav') === viewId;
            btn.classList.toggle('text-amber-700', isTarget);
            btn.classList.toggle('text-stone-400', !isTarget);
        });

        if (viewId === 'captureView') {
            import('./capture.js').then(m => m.Capture.startCamera());
        } else {
            import('./capture.js').then(m => m.Capture.stopCamera());
        }
    },

    renderCollection(items) {
        this.allItems = items;
        this.updateCountryFilter(items);
        this.renderGrid(items);
    },

    updateCountryFilter(items) {
        const filter = document.getElementById('countryFilter');
        const countries = [...new Set(items.map(i => i.country))].sort();
        filter.innerHTML = '<option value="All">All Countries</option>' + countries.map(c => `<option value="${c}">${c}</option>`).join('');
    },

    renderGrid(items) {
        const grid = document.getElementById('collectionGrid');
        grid.innerHTML = items.length === 0 ? '<div class="col-span-full text-center text-stone-400 py-20 font-bold uppercase tracking-widest">Vault Empty</div>' : '';
        
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-transform relative border border-stone-100';
            el.innerHTML = `
                <img src="${item.imageBlob}" class="w-full h-40 object-cover bg-stone-50">
                <div class="p-3">
                    <h3 class="font-bold text-sm truncate">${item.denomination}</h3>
                    <p class="text-[10px] text-stone-400 font-bold uppercase tracking-tight">${item.year} • ${item.country}</p>
                    <div class="mt-2 flex justify-between items-center">
                        <span class="text-sm font-black text-green-600">$${item.estimatedValue}</span>
                        <span class="text-[10px] bg-amber-50 px-2 py-0.5 rounded-full font-bold text-amber-700 border border-amber-100">${item.grade}</span>
                    </div>
                </div>
                <button class="absolute top-2 right-2 bg-white/80 backdrop-blur-md text-red-500 rounded-full w-7 h-7 flex items-center justify-center shadow-sm delete-btn" data-id="${item.id}">
                    <span class="iconify" data-icon="mdi:trash-can-outline"></span>
                </button>
            `;

            el.addEventListener('click', (e) => { if(!e.target.closest('.delete-btn')) this.showItemDetail(item); });
            el.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.app.deleteItem(item.id);
            });
            grid.appendChild(el);
        });
    },

    renderDashboard(items) {
        document.getElementById('totalItemsStat').textContent = items.length;
        document.getElementById('totalValueStat').textContent = '$' + items.reduce((sum, i) => sum + (Number(i.estimatedValue) || 0), 0).toFixed(2);
        this.renderChart(items);
    },

    renderChart(items) {
        const ctx = document.getElementById('valueChart').getContext('2d');
        if (this.chartInstance) this.chartInstance.destroy();
        const countryData = {};
        items.forEach(i => { countryData[i.country] = (countryData[i.country] || 0) + (Number(i.estimatedValue) || 0); });
        const labels = Object.keys(countryData);
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: labels.map(l => countryData[l]),
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#6b7280'],
                    borderWidth: 0,
                    hoverOffset: 20
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold', size: 10 } } } }
            }
        });
    },

    showItemDetail(item) {
        document.getElementById('detailImage').src = item.imageBlob;
        document.getElementById('editCountry').value = item.country;
        document.getElementById('editDenom').value = item.denomination;
        document.getElementById('editYear').value = item.year;
        document.getElementById('editMint').value = item.mintMark || '';
        document.getElementById('editMetal').value = item.metal;
        document.getElementById('editGrade').value = item.grade;
        document.getElementById('editValue').value = item.estimatedValue;
        document.getElementById('editDesc').value = item.description || '';

        const saveBtn = document.getElementById('saveEditBtn');
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

        newSaveBtn.addEventListener('click', () => {
            item.country = document.getElementById('editCountry').value;
            item.denomination = document.getElementById('editDenom').value;
            item.year = document.getElementById('editYear').value;
            item.mintMark = document.getElementById('editMint').value;
            item.metal = document.getElementById('editMetal').value;
            item.grade = document.getElementById('editGrade').value;
            item.estimatedValue = document.getElementById('editValue').value;
            item.description = document.getElementById('editDesc').value;
            this.app.saveItemEdit(item);
            this.closeBottomSheet();
        });

        document.getElementById('cancelEditBtn').onclick = () => this.closeBottomSheet();
        this.openBottomSheet();
    },

    showToast(msg, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl text-white z-[120] font-bold transition-all duration-300 ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-amber-700'}`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    },

    showLoading(msg) {
        document.getElementById('loadingText').textContent = msg;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    },

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
};