// Storage Manager for localStorage operations, scoped by sheetId
class StorageManager {
    constructor(sheetId) {
        if (!sheetId) {
            throw new Error("StorageManager requires a sheetId to be initialized.");
        }
        this.sheetId = sheetId;
        // Optionally, you can still initialize `config` property if it's used elsewhere
        // this.config = config;
    }

    _getKey(type, id = '') {
        return `sm_data_${this.sheetId}_${type}${id ? '_' + id : ''}`;
    }

    _load(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    _save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // Form Fields (formConfig)
    getField(key) {
        const formConfig = this.getFormConfig();
        return formConfig.get(key);
    }

    getAllFields() {
        const formConfig = this.getFormConfig();
        return Array.from(formConfig.entries()).map(([key, config]) => ({ key, ...config }));
    }

    deleteField(key) {
        const formConfig = this.getFormConfig();
        formConfig.delete(key);
        this.saveFormConfig(formConfig);
    }

    saveFormConfig(configMap) {
        const serializableConfig = Array.from(configMap.entries());
        this._save(this._getKey('formFields'), serializableConfig);
    }

    getFormConfig() {
        const serializableConfig = this._load(this._getKey('formFields')) || [];
        return new Map(serializableConfig);
    }

    // Table Configurations (tableConfigs - now views for SuperSmartSheet)
    saveTableConfig(config) {
        let allTableConfigs = this._load(this._getKey('tableConfigs')) || [];
        const index = allTableConfigs.findIndex(t => t.id === config.id);
        if (index > -1) {
            allTableConfigs[index] = config;
        } else {
            allTableConfigs.push(config);
        }
        this._save(this._getKey('tableConfigs'), allTableConfigs);
    }

    getAllTableConfigs() {
        return this._load(this._getKey('tableConfigs')) || [];
    }

    deleteTableConfig(id) {
        let allTableConfigs = this._load(this._getKey('tableConfigs')) || [];
        allTableConfigs = allTableConfigs.filter(t => t.id !== id);
        this._save(this._getKey('tableConfigs'), allTableConfigs);
    }

    // Form Layout
    saveFormLayout(layout) {
        this._save(this._getKey('formLayout'), layout);
    }

    getFormLayout() {
        // DEFAULT_FORM_LAYOUT is expected to be globally available or imported
        return this._load(this._getKey('formLayout')) || (typeof DEFAULT_FORM_LAYOUT !== 'undefined' ? DEFAULT_FORM_LAYOUT : []);
    }

    // Entries (Not directly used by SuperSmartSheet's editing model, but kept for compatibility/future)
    saveEntry(entry) {
        let entries = this._load(this._getKey('entries')) || [];
        const index = entries.findIndex(e => e.id === entry.id);
        if (index > -1) {
            entries[index] = entry;
        } else {
            entries.push(entry);
        }
        this._save(this._getKey('entries'), entries);
        return entry.id;
    }

    getEntry(id) {
        const entries = this._load(this._getKey('entries')) || [];
        return entries.find(e => e.id === id);
    }

    getAllEntries() {
        const entries = this._load(this._getKey('entries')) || [];
        return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    updateEntry(id, updates) {
        let entries = this._load(this._getKey('entries')) || [];
        const index = entries.findIndex(e => e.id === id);
        if (index > -1) {
            entries[index] = { ...entries[index], ...updates };
            this._save(this._getKey('entries'), entries);
            return true;
        }
        return false;
    }

    deleteEntry(entryId) {
        let entries = this._load(this._getKey('entries')) || [];
        entries = entries.filter(e => e.id !== entryId);
        this._save(this._getKey('entries'), entries);
        return true;
    }

    syncEntries(entries) {
        this._save(this._getKey('entries'), entries);
        return Promise.resolve(); // Simulate async for compatibility
    }

    // Settings (API key, table order)
    saveSetting(id, value) {
        let settings = this._load(this._getKey('settings')) || {};
        settings[id] = value;
        this._save(this._getKey('settings'), settings);
    }

    getSetting(id) {
        const settings = this._load(this._getKey('settings')) || {};
        return settings[id];
    }

    clearAllData() {
        // For localStorage, clearing is more direct but needs to be careful not to clear other sheets' data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`sm_data_${this.sheetId}_`)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        return Promise.resolve();
    }

    exportData() {
        const data = {
            tables: this.getAllTableConfigs(),
            formConfig: Array.from(this.getFormConfig().entries()),
            formLayout: this.getFormLayout(),
            entries: this.getAllEntries(),
            settings: this._load(this._getKey('settings')) // Export all settings for this sheet
        };
        // No special serialization needed for localStorage for multiselect
        return data;
    }

    importData(data) {
        this.clearAllData(); // Clear data for this sheet only
        if (data.tables) {
            data.tables.forEach(table => this.saveTableConfig(table));
        }
        if (data.formConfig) {
            this.saveFormConfig(new Map(data.formConfig));
        }
        if (data.formLayout) {
            this.saveFormLayout(data.formLayout);
        }
        if (data.entries) {
            this._save(this._getKey('entries'), data.entries);
        }
        if (data.settings) {
            this._save(this._getKey('settings'), data.settings);
        }
        return Promise.resolve();
    }

    saveTableOrder(order) {
        this.saveSetting('tableOrder', order);
    }

    getTableOrder() {
        return this.getSetting('tableOrder') || [];
    }

    saveSmartSheetSettings(apiKey) {
        this.saveSetting('smartsheetApiKey', apiKey); // Store just the key
    }

    getSmartSheetSettings() {
        return { apiKey: this.getSetting('smartsheetApiKey') }; // Retrieve just the key
    }
}

// Configuration UI Manager
// ConfigurationUI class manages the configuration UI for the errata system
class ConfigurationUI {
    constructor(config, storageManager) {
        this.config = config;  // ConfigManager instance
        this.storage = storageManager;  // StorageManager instance
        this.container = null;  // Container element for the configuration UI
        this.currentModal = null;  // Reference to the currently open modal
        this.currentSortable = null;  // Reference to the current Sortable instance
        this.layoutSortables = [];  // Array to store Sortable instances for layout sections
        this.activeTab = null;  // Currently active configuration tab
        
        // Separate maps for core UI and tab-specific event listeners
        this.coreListeners = new Map();  // Map to store core event listeners
        this.tabListeners = new Map();  // Map to store tab-specific event listeners
    }

    // Cleans up tab-specific resources and event listeners
    cleanup() {
        this.layoutSortables.forEach(sortable => sortable.destroy());
        this.layoutSortables = [];

        this.tabListeners.forEach((listener, element) => {
            element.removeEventListener(listener.event, listener.handler);
        });
        this.tabListeners.clear();
    }

    // Adds a core event listener
    addCoreListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.coreListeners.set(element, { event, handler });
    }

    // Adds a tab-specific event listener
    addTabListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.tabListeners.set(element, { event, handler });
    }

    // Creates the configuration panel
    createConfigPanel() {
        if (this.container) {
            // Clean up previous core listeners
            this.coreListeners.forEach((listener, element) => {
                element.removeEventListener(listener.event, listener.handler);
            });
            this.coreListeners.clear();
            
            // Clean up tab-specific resources
            this.cleanup();
        }

        const panel = document.createElement('div');
        panel.className = 'config-panel card';
        panel.innerHTML = `
			<div class="card-header">
				<h2 class="card-title">Configuration</h2>
				<button class="btn btn-secondary" id="toggleConfig">
					<span class="icon">⚙️</span> Configure
				</button>
			</div>
			<div class="card-content" style="display: none">
				<div class="config-nav">
					<div class="config-tabs">
						<button class="config-tab" data-tab="fields">Form Fields</button>
						<button class="config-tab" data-tab="forms">Form Layout</button>
						<button class="config-tab" data-tab="views">Views</button> <!-- Changed from tables -->
						<button class="config-tab" data-tab="settings">Settings</button>
					</div>
					<div class="config-actions">
						<button class="btn btn-primary fields-action" style="display: none" id="addField" onclick="ConfigurationUI.showFieldEditor();">Add New Field Option</button>
						<button class="btn btn-primary forms-action" style="display: none" id="addFormField">Add Field to Form</button>
						<!-- Changed from tables-action/addTable to new buttons -->
						<button class="btn btn-primary views-action" style="display: none" id="addFormView">Add New Form View</button>
						<button class="btn btn-primary views-action" style="display: none" id="addReportView">Add New Report View</button>
					</div>
				</div>
				<div class="config-tab-content">
					<div id="fields-config" class="config-tab-pane"></div>
					<div id="forms-config" class="config-tab-pane"></div>
					<div id="views-config" class="config-tab-pane"></div> <!-- Changed from tables-config -->
					<div id="settings-config" class="config-tab-pane"></div>
				</div>
			</div>
		`;

        this.container = panel;
        this.attachEventListeners();
        return panel;
    }

    // Renders the form fields configuration
	renderFieldsConfig() {
		const fieldsConfig = this.container.querySelector('#fields-config');
		const allFields = Array.from(this.config.formConfig.entries())
			.map(([key, config]) => ({key, ...config}));
			
		const formLayout = this.config.getFormLayout();
		
		const formFields = formLayout
			.filter(item => item.type === 'field')
			.map(item => allFields.find(f => f.key === item.field))
			.filter(Boolean);
			
		const unusedFields = allFields.filter(field => 
			!formLayout.some(item => item.type === 'field' && item.field === field.key)
		);
		
		fieldsConfig.innerHTML = `
			<div class="fields-manager">
				<div class="fields-section">
					<h3>Current Form Fields</h3>
					<div class="fields-list quick-access-fields">
						${formFields.map(field => this.renderFieldItem(field)).join('')}
					</div>
				</div>
				<div class="fields-section">
					<h3>Available Fields</h3>
					<div class="fields-list">
						${unusedFields.map(field => this.renderFieldItem(field)).join('')}
					</div>
				</div>
			</div>
		`;

		this.attachFieldsEventListeners();
	}
	
	// Renders an individual field item
	renderFieldItem(field) {
		const syncedTable = Array.from(this.config.tables.values())
			.find(table => 
				table.smartsheet?.sheetId && 
				table.columns.some(col => col.field === field.key)
			);

		return `
			<div class="field-item" data-field-key="${field.key}">
				<div class="field-item-header">
					<h3>${field.label}</h3>
				</div>
				<div class="field-details">
					<span class="field-type">Type: ${field.type}</span>
					<span class="field-required">${field.required ? 'Required' : 'Optional'}</span>
				</div>
				<div class="field-footer">
					${syncedTable ? `
						<span class="sync-badge" title="Synced from ${syncedTable.name}">
							<span class="icon">🔄</span>
							${syncedTable.name}
						</span>
					` : ''}
					<div class="footer-actions">
						<button class="btn btn-secondary edit-field">Edit</button>
						<button class="btn btn-secondary delete-field" 
								${field.key === 'component' ? 'disabled' : ''}>Delete</button>
					</div>
				</div>
			</div>
		`;
	}

    // Cleans up existing modals
    cleanupFieldEditorModal() {
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(m => m.remove());
    }

    // Shows the field editor modal for adding or editing a field
    showFieldEditor(fieldKey = null) {
		this.cleanupFieldEditorModal();
		const field = fieldKey ? this.config.getField(fieldKey) : null;
		const modal = document.createElement('div');
		modal.className = 'modal';
		modal.innerHTML = `
			<div class="modal-content">
				<h2>${field ? 'Edit' : 'Add'} Field</h2>
				<form id="field-editor-form">
					${fieldKey ? `<input type="hidden" name="fieldKey" value="${fieldKey}">` : ''}
					
					<div class="form-group">
						<label class="form-label">Field Key</label>
						<input type="text" class="form-control" name="newFieldKey" 
							   value="${fieldKey || ''}" 
							   ${fieldKey ? 'readonly' : 'required'}
							   pattern="[a-zA-Z][a-zA-Z0-9_]*"
							   title="Start with letter, use only letters, numbers, and underscore">
					</div>

					<div class="form-group">
						<label class="form-label">Label</label>
						<input type="text" class="form-control" name="label" 
							   value="${field?.label || ''}" required>
					</div>

					<div class="form-group">
						<label class="form-label">Type</label>
						<select class="form-control" name="type" required id="fieldTypeSelect">
							<option value="text" ${field?.type === 'text' ? 'selected' : ''}>Text</option>
							<option value="number" ${field?.type === 'number' ? 'selected' : ''}>Number</option>
							<option value="select" ${field?.type === 'select' ? 'selected' : ''}>Select</option>
							<option value="multiselect" ${field?.type === 'multiselect' ? 'selected' : ''}>Multi Select</option>
							<option value="textarea" ${field?.type === 'textarea' ? 'selected' : ''}>Text Area</option>
							<option value="date" ${field?.type === 'date' ? 'selected' : ''}>Date</option>
							<option value="email" ${field?.type === 'email' ? 'selected' : ''}>Email</option>
							<option value="tel" ${field?.type === 'tel' ? 'selected' : ''}>Phone</option>
							<option value="url" ${field?.type === 'url' ? 'selected' : ''}>URL</option>
						</select>
					</div>

					<div class="form-group">
						<label class="form-label">Placeholder</label>
						<input type="text" class="form-control" name="placeholder" 
							   value="${field?.placeholder || ''}">
					</div>

					<div class="form-group">
						<label class="form-control-checkbox">
							<input type="checkbox" name="required" ${field?.required ? 'checked' : ''}>
							Required Field
						</label>
					</div>

					<div id="selectOptions" class="form-group" style="display: ${['select', 'multiselect'].includes(field?.type) ? 'block' : 'none'}">
						<label class="form-label">Options (one per line)</label>
						<textarea class="form-control" name="options" rows="5">${field?.options?.join('\n') || ''}</textarea>
						<small class="form-text">Enter each option on a new line</small>
					</div>

					<div id="defaultValueContainer" class="form-group">
						<label class="form-label">Default Value</label>
						${this.renderDefaultValueInput(field?.type || 'text', field?.default, field?.options)}
					</div>

					<div class="form-actions">
						<button type="submit" class="btn btn-primary">Save Field</button>
						<button type="button" class="btn btn-secondary close-modal">Cancel</button>
					</div>
				</form>
			</div>
		`;

		document.body.appendChild(modal);

		// Add event listener for field type changes
		const fieldTypeSelect = modal.querySelector('#fieldTypeSelect');
		const defaultValueContainer = modal.querySelector('#defaultValueContainer');
		const selectOptionsDiv = modal.querySelector('#selectOptions');

		fieldTypeSelect.addEventListener('change', (e) => {
			const selectedType = e.target.value;
			selectOptionsDiv.style.display = ['select', 'multiselect'].includes(selectedType) ? 'block' : 'none';
			
			// Update default value input based on new type
			const optionsTextarea = selectOptionsDiv.querySelector('textarea');
			const options = optionsTextarea.value.split('\n').filter(opt => opt.trim());
			defaultValueContainer.innerHTML = `
				<label class="form-label">Default Value</label>
				${this.renderDefaultValueInput(selectedType, '', options)}
			`;
		});

		this.attachFieldEditorEvents(modal);
	}

	// Add this new method to render appropriate default value input
	renderingDefaultValueInput(type, defaultValue, options = []) {
		switch (type) {
			case 'date':
				return `
					<input type="date" 
						   class="form-control" 
						   name="default" 
						   value="${defaultValue || ''}">
				`;
			
			case 'number':
				return `
					<input type="number" 
						   class="form-control" 
						   name="default" 
						   value="${defaultValue || ''}">
				`;
				
			case 'select':
				const needsSearch = options.length > 5;
				return `
					<div class="select-wrapper">
						<input type="hidden" name="default" class="select-value" value="${defaultValue || ''}">
						<div class="select-dropdown">
							<div class="selected-options" data-default="Select a default value">
								${defaultValue ? `<span class="selected-option">${defaultValue}</span>` : 'Select a default value'}
							</div>
						</div>
						<div class="select-options">
							${needsSearch ? `
								<div class="select-search">
									<input type="text" 
										   class="form-control" 
									   placeholder="Search options..."
									   autocomplete="off">
								</div>
							` : ''}
							<div class="select-options-list">
								<div class="select-option" data-value="">No default</div>
								${options.map(opt => `
									<div class="select-option" 
										 data-value="${opt}"
										 ${opt === defaultValue ? 'data-selected="true"' : ''}>
										${opt}
									</div>
								`).join('')}
							</div>
						</div>
					</div>
				`;
				
			case 'multiselect':
				const multiNeedsSearch = options.length > 5;
				const defaultArray = Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [];
				return `
					<div class="multiselect-wrapper">
						<div class="multiselect-dropdown">
							<div class="selected-options">
								${defaultArray.map(value => `
									<span class="selected-option">${value}</span>
								`).join('')}
							</div>
						</div>
						<div class="multiselect-options">
							${multiNeedsSearch ? `
								<div class="multiselect-search">
									<input type="text" 
										   class="form-control" 
									   placeholder="Search options..."
									   autocomplete="off">
								</div>
							` : ''}
							<div class="options-list">
								${options.map(opt => `
									<label class="multiselect-option">
										<input type="checkbox" 
											   name="default" 
										   value="${opt}"
										   ${defaultArray.includes(opt) ? 'checked' : ''}>
										${opt}
									</label>
								`).join('')}
							</div>
						</div>
					</div>
				`;
				
			case 'textarea':
				return `
					<textarea class="form-control" 
							 name="default">${defaultValue || ''}</textarea>
				`;
				
default:
				return `
					<input type="${type}" 
						   class="form-control" 
						   name="default" 
						   value="${defaultValue || ''}">
				`;
		}
	}
    
	
	// Attaches event listeners to the field editor modal
    attachFieldEditorEvents(modal) {
        const form = modal.querySelector('form');
        const typeSelect = form.querySelector('[name="type"]');
        const selectOptions = form.querySelector('#selectOptions');
        const closeBtn = modal.querySelector('.close-modal');

        const closeHandler = () => {
            modal.remove();
            closeBtn.removeEventListener('click', closeHandler);
            typeSelect.removeEventListener('change', typeChangeHandler);
            form.removeEventListener('submit', submitHandler);
        };

        const typeChangeHandler = () => {
            selectOptions.style.display = 
                ['select', 'multiselect'].includes(typeSelect.value) ? 'block' : 'none';
        };
		
		// Function to handle dropdown positioning
		const positionDropdown = (dropdown, optionsContainer) => {
			const dropdownRect = dropdown.getBoundingClientRect();
			const modalContent = dropdown.closest('.modal-content');
			const modalRect = modalContent.getBoundingClientRect();
			
			// Temporarily make the options container visible but hidden to measure its height
			const originalDisplay = optionsContainer.style.display;
			optionsContainer.style.visibility = 'hidden';
			optionsContainer.style.display = 'block';
			const optionsHeight = optionsContainer.scrollHeight;
			// Restore original state
			optionsContainer.style.display = originalDisplay;
			optionsContainer.style.visibility = 'visible';
			
			// Get space within the modal
			const spaceBelow = modalRect.bottom - dropdownRect.bottom;
			const spaceAbove = modalRect.top - dropdownRect.top;
			
			// Add some buffer space
			const buffer = 20;
			
			console.log('Dropdown Positioning Calculations:', {
				'Modal Boundaries': {
					top: modalRect.top,
					bottom: modalRect.bottom,
					height: modalRect.height
				},
				'Dropdown Position': {
					top: dropdownRect.top,
					bottom: dropdownRect.bottom,
				height: dropdownRect.height
				},
				'Options Height (Measured)': optionsHeight,
				'Available Space': {
					above: spaceAbove,
					below: spaceBelow
				},
				'Space Needed': optionsHeight + buffer,
				'Will Open Upward': spaceBelow < optionsHeight + buffer && spaceAbove > spaceBelow
			});
			
			// Check if there's more space above than below within the modal
			if (spaceBelow < optionsHeight + buffer && spaceAbove > spaceBelow) {
				console.log('Opening upward because:', {
					'Space Below': spaceBelow,
					'Space Needed': optionsHeight + buffer,
					'Space Above': spaceAbove,
					'More Space Above than Below': spaceAbove > spaceBelow
				});
				optionsContainer.classList.add('dropup');
			} else {
				console.log('Opening downward because:', {
					'Space Below': spaceBelow,
					'Space Needed': optionsHeight + buffer,
					'Space Above': spaceAbove,
					'Enough Space Below': spaceBelow >= optionsHeight + buffer,
					'More Space Below than Above': spaceBelow >= spaceAbove
				});
				optionsContainer.classList.remove('dropup');
			}
		};

        const initializeCustomInputs = (container) => {
        // Initialize select dropdowns
        container.querySelectorAll('.select-wrapper').forEach(wrapper => {
            const dropdown = wrapper.querySelector('.select-dropdown');
            const options = wrapper.querySelector('.select-options');
            const optionsList = wrapper.querySelector('.select-options-list');
            const searchInput = wrapper.querySelector('.select-search input');
            const selectedDisplay = wrapper.querySelector('.selected-options');
            const hiddenInput = wrapper.querySelector('.select-value');

            dropdown.addEventListener('click', (e) => {
				e.stopPropagation();
				
				// Position the dropdown before showing it
				positionDropdown(dropdown, options);
				
				options.classList.toggle('show');
				dropdown.classList.toggle('active');
				
				if (searchInput && options.classList.contains('show')) {
					searchInput.value = '';
					searchInput.focus();
					optionsList.querySelectorAll('.select-option').forEach(option => {
						option.style.display = '';
					});
				}
			});

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    options.classList.remove('show');
                    dropdown.classList.remove('active');
                }
            });

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    optionsList.querySelectorAll('.select-option').forEach(option => {
                        const text = option.textContent.trim().toLowerCase();
                        option.style.display = text.includes(searchTerm) ? '' : 'none';
                    });
                });

                searchInput.addEventListener('click', (e) => e.stopPropagation());
            }

            optionsList.addEventListener('click', (e) => {
                const option = e.target.closest('.select-option');
                if (option) {
                    const value = option.dataset.value;
                    const label = option.textContent.trim();

                    selectedDisplay.innerHTML = value ? 
                        `<span class="selected-option">${label}</span>` : 
                        'Select a default value';
                    if (hiddenInput) {
                        hiddenInput.value = value;
                    }

                    options.classList.remove('show');
                    dropdown.classList.remove('active');
                }
            });
        });

        // Initialize multiselect dropdowns
        container.querySelectorAll('.multiselect-wrapper').forEach(wrapper => {
            const dropdown = wrapper.querySelector('.multiselect-dropdown');
            const options = wrapper.querySelector('.multiselect-options');
            const selectedDisplay = wrapper.querySelector('.selected-options');
            const searchInput = wrapper.querySelector('.multiselect-search input');

             dropdown.addEventListener('click', () => {
				// Position the dropdown before showing it
				positionDropdown(dropdown, options);
				
				options.classList.toggle('show');
				dropdown.classList.toggle('active');
				if (searchInput && options.classList.contains('show')) {
					searchInput.focus();
				}
			});

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    options.classList.remove('show');
                    dropdown.classList.remove('active');
                }
            });

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const optionLabels = wrapper.querySelectorAll('.multiselect-option');
                    
                    optionLabels.forEach(option => {
                        const text = option.textContent.trim().toLowerCase();
                        option.style.display = text.includes(searchTerm) ? '' : 'none';
                    });
                });

                searchInput.addEventListener('click', (e) => e.stopPropagation());
            }

            wrapper.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const selectedOptions = Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked'))
                        .map(input => {
                            const label = input.closest('label').textContent.trim();
                            return `<span class="selected-option">${label}</span>`;
                        });
                    selectedDisplay.innerHTML = selectedOptions.join('');
                });
            });
       
			// Add window resize handler to update positioning of open dropdowns
			window.addEventListener('resize', () => {
				const openSelects = document.querySelectorAll('.select-options.show, .multiselect-options.show');
				openSelects.forEach(options => {
					const wrapper = options.closest('.select-wrapper, .multiselect-wrapper');
					const dropdown = wrapper.querySelector('.select-dropdown, .multiselect-dropdown');
					positionDropdown(dropdown, options);
				});
			});

	   });
    
	
	
	};

    // Initialize custom inputs when the modal is first created
    initializeCustomInputs(modal);

    // Update type select handler to reinitialize custom inputs
    fieldTypeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        selectOptionsDiv.style.display = ['select', 'multiselect'].includes(selectedType) ? 'block' : 'none';
        
        const optionsTextarea = selectOptionsDiv.querySelector('textarea');
        const options = optionsTextarea.value.split('\n').filter(opt => opt.trim());
        defaultValueContainer.innerHTML = `
            <label class="form-label">Default Value</label>
            ${this.renderDefaultValueInput(selectedType, '', options)}
        `;
        
        // Reinitialize custom inputs for the new default value input
        initializeCustomInputs(defaultValueContainer);
    });

    const submitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const fieldKey = formData.get('fieldKey');
        const newFieldKey = formData.get('newFieldKey');

        let options = [];
        if (['select', 'multiselect'].includes(formData.get('type'))) {
            options = formData.get('options')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line);
        }

        // Handle default value for multiselect
        let defaultValue = formData.get('default');
        if (formData.get('type') === 'multiselect') {
            defaultValue = Array.from(form.querySelectorAll('input[name="default"]:checked'))
                .map(input => input.value);
        }

        const fieldConfig = {
            type: formData.get('type'),
            label: formData.get('label'),
            placeholder: formData.get('placeholder'),
            required: formData.get('required') === 'on',
            options,
            default: defaultValue
        };

        try {
            if (fieldKey) {
                await this.config.updateField(fieldKey, fieldConfig);
            } else {
                await this.config.addField(newFieldKey, fieldConfig);
            }

            await this.storage.saveFormConfig(this.config.formConfig);
            this.renderFieldsConfig();
            modal.remove();

            document.dispatchEvent(new CustomEvent('configurationUpdated'));
        } catch (error) {
            alert(error.message);
        }
    };
        closeBtn.addEventListener('click', closeHandler);
        typeSelect.addEventListener('change', typeChangeHandler);
        form.addEventListener('submit', submitHandler);
    
	
	}

    // Attaches event listeners to the fields configuration section
    attachFieldsEventListeners() {
        const fieldsConfig = this.container.querySelector('#fields-config');

        fieldsConfig.querySelector('#addField')?.addEventListener('click', () => {
            this.showFieldEditor();
        });

        fieldsConfig.addEventListener('click', async (e) => {
            const fieldItem = e.target.closest('.field-item');
            if (!fieldItem) return;

            const fieldKey = fieldItem.dataset.field-key;

            if (e.target.classList.contains('edit-field')) {
                this.showFieldEditor(fieldKey);
            } else if (e.target.classList.contains('delete-field')) {
                if (confirm('Are you sure you want to delete this field? This will remove it from all entries and tables.')) {
                    try {
                        await this.config.deleteField(fieldKey);
                        await this.storage.saveFormConfig(this.config.formConfig);
                        this.renderFieldsConfig();
                        document.dispatchEvent(new CustomEvent('configurationUpdated'));
                    } catch (error) {
                        alert(error.message);
                    }
                }
            }
        });
    }

    // Add tab switching handler to properly initialize form configuration
	// In ConfigurationUI.attachEventListeners()
attachEventListeners() {
    const toggle = this.container.querySelector('#toggleConfig');
    const content = this.container.querySelector('.card-content');
    
    // Core UI toggle handler
    const toggleHandler = () => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        toggle.innerHTML = isHidden ? 
            '<span class="icon">⚙️</span> Close' : 
            '<span class="icon">⚙️</span> Configure';
    };

    this.addCoreListener(toggle, 'click', toggleHandler);

    // Add handlers for action buttons
    const addFieldBtn = this.container.querySelector('#addField');
    if (addFieldBtn) {
        this.addCoreListener(addFieldBtn, 'click', () => {
            this.showFieldEditor();
        });
    }

    const addFormFieldBtn = this.container.querySelector('#addFormField');
	if (addFormFieldBtn) {
		this.addCoreListener(addFormFieldBtn, 'click', () => {
			const modal = document.createElement('div');
			modal.className = 'modal';
			modal.innerHTML = `
				<div class="modal-content">
					<h2>Add Fields to Form</h2>
					<form id="addFieldsForm">
						<div class="form-group">
							<div class="field-selection-list">
								${Array.from(this.config.formConfig.entries())
									.filter(([field, config]) => {
										// Only show fields that aren't already in the layout
										const layout = this.config.getFormLayout();
										return !layout.some(item => item.field === field);
									})
									.map(([field, config]) => {
										// Find if field is synced from any table
										const syncedTable = Array.from(this.config.tables.values())
											.find(table => 
												table.smartsheet?.sheetId && 
												table.columns.some(col => col.field === field)
											);

										return `
											<div class="field-selection-item">
												<div class="field-selection-info">
													<label class="form-control-checkbox">
														<input type="checkbox" name="selectedFields" value="${field}">
													${config.label}
												</label>
													${syncedTable ? `
														<span class="sync-badge" title="Synced from ${syncedTable.name}">
															<span class="icon">🔄</span>
															${syncedTable.name}
													</span>
												` : ''}
												</div>
												<select class="field-size-select" name="size_${field}">
													<option value="full">Full Width</option>
													<option value="half" selected>Half Width</option>
													<option value="third">Third Width</option>
													<option value="quarter">Quarter Width</option>
												</select>
											</div>
										`;
									}).join('')}
							</div>
						</div>
						<div class="field-selection-actions">
							<button type="button" class="btn btn-secondary select-all">Select All</button>
							<button type="button" class="btn btn-secondary deselect-all">Deselect All</button>
						</div>
						<div class="form-actions">
							<button type="submit" class="btn btn-primary">Add Selected Fields</button>
							<button type="button" class="btn btn-secondary close-modal">Cancel</button>
						</div>
					</form>
				</div>
			`;
			
			document.body.appendChild(modal);

			// Handle select/deselect all
			const form = modal.querySelector('#addFieldsForm');
			const selectAllBtn = modal.querySelector('.select-all');
			const deselectAllBtn = modal.querySelector('.deselect-all');
			
			selectAllBtn.addEventListener('click', () => {
				form.querySelectorAll('input[name="selectedFields"]').forEach(cb => cb.checked = true);
			});
			
			deselectAllBtn.addEventListener('click', () => {
				form.querySelectorAll('input[name="selectedFields"]').forEach(cb => cb.checked = false);
			});

			// Form submission handler
			form.addEventListener('submit', async (e) => {
				e.preventDefault();
				
				const selectedFields = Array.from(form.querySelectorAll('input[name="selectedFields"]:checked'))
					.map(input => ({
						field: input.value,
						size: form.querySelector(`select[name="size_${input.value}"]`).value
					}));

				if (selectedFields.length === 0) {
					alert('Please select at least one field to add.');
					return;
				}

				try {
					// Add new fields to layout
					const newLayout = [...this.config.getFormLayout()];
					selectedFields.forEach(({ field, size }) => {
						newLayout.push({
							type: 'field',
							field,
							size
						});
					});
					
					// Update config and save to storage
					this.config.setFormLayout(newLayout);
					await this.storage.saveFormLayout(newLayout);

					// Refresh the form layout
					this.renderFormConfig();
					
					// Close modal
					modal.remove();

					// Dispatch event to update the form
					document.dispatchEvent(new CustomEvent('configurationUpdated'));

				} catch (error) {
					console.error('Error adding fields:', error);
					alert('Error adding fields. Please try again.');
				}
			});

			// Close modal handler
			modal.querySelector('.close-modal').addEventListener('click', () => {
				modal.remove();
			});
		});
	}

    const addFormViewBtn = this.container.querySelector('#addFormView');
    if (addFormViewBtn) {
        this.addCoreListener(addFormViewBtn, 'click', () => {
            this.showViewEditor('form'); // Pass type 'form'
        });
    }

    const addReportViewBtn = this.container.querySelector('#addReportView');
    if (addReportViewBtn) {
        this.addCoreListener(addReportViewBtn, 'click', () => {
            this.showViewEditor('report'); // Pass type 'report'
        });
    }
    // Handle tab switching
    const tabHandler = (e) => {
        if (e.target.classList.contains('config-tab')) {
            // Clean up previous tab-specific resources
            this.cleanup();

            this.container.querySelectorAll('.config-tab').forEach(tab => 
                tab.classList.remove('active')
            );
            this.container.querySelectorAll('.config-tab-pane').forEach(pane => 
                pane.classList.remove('active')
            );
            
            // Hide all action buttons
            this.container.querySelectorAll('.config-actions button').forEach(btn => 
                btn.style.display = 'none'
            );
            
            e.target.classList.add('active');
            const tabId = `${e.target.dataset.tab}-config`;
            const tabPane = this.container.querySelector(`#${tabId}`);
            if (tabPane) {
                tabPane.classList.add('active');
                this.activeTab = e.target.dataset.tab;
                
                // Show corresponding action button
                // Note: The action button class will now be 'views-action' for both form/report add buttons
                const actionBtns = this.container.querySelectorAll(`.${e.target.dataset.tab}-action`);
                actionBtns.forEach(btn => btn.style.display = 'block');


                // Initialize the new tab based on type
                switch(this.activeTab) {
                    case 'fields':
                        this.renderFieldsConfig();
                        break;
                    case 'forms':
                        this.renderFormConfig();
                        break;
                    case 'views': // Changed from 'tables'
                        this.renderViewsConfig(); // New function to render views
                        break;
                }
            }
        }
    };

    this.addCoreListener(this.container, 'click', tabHandler);
}

// Add this new method to handle the form field modal
attachFormFieldModalHandlers(modal) {
    const form = modal.querySelector('#addFieldForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const field = modal.querySelector('#fieldSelect').value;
        const size = modal.querySelector('#fieldSizeSelect').value;
        
        try {
            // Add field to layout
            const newLayout = [...this.config.getFormLayout()];
            newLayout.push({
                type: 'field',
                field: field,
                size: size
            });
            
            // Update config and save to storage
            this.config.setFormLayout(newLayout);
            await this.storage.saveFormLayout(newLayout);

            // Close modal and update UI
            modal.remove();
            this.renderFormConfig();
            document.dispatchEvent(new CustomEvent('configurationUpdated'));
        } catch (error) {
            console.error('Error adding field:', error);
            const alert = document.createElement('div');
            alert.className = 'alert alert-error';
            alert.style.display = 'block';
            alert.textContent = 'Error adding field. Please try again.';
            modal.querySelector('.modal-content').insertBefore(alert, form);
            setTimeout(() => alert.remove(), 3000);
        }
    });

    modal.querySelector('#cancelAddField').addEventListener('click', () => {
        modal.remove();
    });
}

	// This method gets called when the Forms tab is clicked
	renderingFormConfig() {
		console.log('Rendering form configuration');
		const formConfig = this.container.querySelector('#forms-config');
		const layout = this.config.getFormLayout();
		
		formConfig.innerHTML = `
			<div class="form-layout-editor">
				<div class="form-layout-list" id="formLayoutList">
					<h3>Current Form Fields</h3>
					<div class="form-layout-grid">
						${layout.map((item, index) => {
							if (item.type === 'field') {
								const fieldConfig = this.config.formConfig.get(item.field);
								if (fieldConfig) {
									const sizeClass = FIELD_SIZES[item.size] || FIELD_SIZES['half'];
									return `
										<div class="layout-item field ${sizeClass}" 
											 data-field="${item.field}" 
											 data-index="${index}"
											 data-size="${item.size}">
											<div class="layout-item-handle">⋮⋮</div>
											<div class="layout-item-content">
												<div class="field-preview">
													${fieldConfig.label}
												</div>
												<div class="layout-controls">
													<select class="field-size-select" data-field="${item.field}">
														<option value="full" ${item.size === 'full' ? 'selected' : ''}>Full Width</option>
													<option value="half" ${item.size === 'half' ? 'selected' : ''}>Half Width</option>
													<option value="third" ${item.size === 'third' ? 'selected' : ''}>Third Width</option>
													<option value="quarter" ${item.size === 'quarter' ? 'selected' : ''}>Quarter Width</option>
												</select>
													<button class="btn btn-secondary remove-field">🗑️</button>
												</div>
											</div>
										</div>
									`;
								}
							}
							return '';
						}).join('')}
					</div>
				</div>
			</div>
		`;

		this.initializeSortable();
		this.attachLayoutEditorEvents();
	}
   
   // Renders the layout items for the form layout configuration
    renderLayoutItems(layout) {
        const allFields = Array.from(this.config.formConfig.entries());
        let html = '';
        let currentSectionContent = '';
        let currentSectionIndex = null;

        layout.forEach((item, index) => {
            if (item.type === 'field') {
                const fieldConfig = this.config.formConfig.get(item.field);
                if (fieldConfig) {
                    currentSectionContent += `
                        <div class="layout-item field" data-field="${item.field}" 
                             data-index="${index}" data-size="${item.size || 'half'}">
                            <div class="layout-item-handle">⋮⋮</div>
                            <div class="layout-item-content">
                                <div class="field-preview">
                                    ${fieldConfig.label}
                                </div>
                                <div class="layout-controls">
                                    <select class="field-size-select" data-field="${item.field}">
                                        <option value="full" ${item.size === 'full' ? 'selected' : ''}>Full Width</option>
                                        <option value="half" ${item.size === 'half' ? 'selected' : ''}>Half Width</option>
                                        <option value="third" ${item.size === 'third' ? 'selected' : ''}>Third Width</option>
                                        <option value="quarter" ${item.size === 'quarter' ? 'selected' : ''}>Quarter Width</option>
                                    </select>
                                    <button class="btn btn-secondary remove-field">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        });
        return html;
    }

    // Attaches event listeners to the layout editor
	attachLayoutEditorEvents() {
		const layoutList = this.container.querySelector('#formLayoutList');
		
		// Handle adding new field
		
		// Layout list event delegation for remove and size change events
		if (layoutList) {
			const layoutHandler = async (e) => {
				if (e.target.closest('.remove-field')) {
					const fieldItem = e.target.closest('.layout-item');
					if (fieldItem) {
						const currentLayout = this.config.getFormLayout();
						const newLayout = currentLayout.filter(item => 
							!(item.type === 'field' && item.field === fieldItem.dataset.field)
						);
						
						this.config.setFormLayout(newLayout);
						await this.storage.saveFormLayout(newLayout);
						fieldItem.remove();
						document.dispatchEvent(new CustomEvent('configurationUpdated'));
					}
				} else if (e.target.matches('.field-size-select')) {
					await this.saveFormLayout();
				}
			};

			this.addTabListener(layoutList, 'click', layoutHandler);
			this.addTabListener(layoutList, 'change', layoutHandler);
		}
	}
    
	// Saves the form layout to storage
    async saveFormLayout() {
        const layoutList = this.container.querySelector('#formLayoutList');
        const layout = [];

        Array.from(layoutList.children).forEach(item => {
            if (item.classList.contains('section')) {
                const title = item.querySelector('.section-title').value;
                layout.push({
                    type: 'section',
                    title: title || 'Untitled Section'
                });
            } else if (item.classList.contains('form-layout-grid')) {
                Array.from(item.children).forEach(fieldItem => {
                    if (fieldItem.classList.contains('layout-item') && 
                        fieldItem.classList.contains('field')) {
                        const field = fieldItem.dataset.field;
                        const size = fieldItem.querySelector('.field-size-select').value;
                                               // Update the field item's data attribute and classes
                        fieldItem.dataset.size = size;
                        fieldItem.className = `layout-item field ${FIELD_SIZES[size] || FIELD_SIZES['half']}`;
                        
                        layout.push({
                            type: 'field',
                            field: field,
                            size: size
                        });
                    }
                });
            }
        });

        this.config.setFormLayout(layout);
        await this.storage.saveFormLayout(layout);
        document.dispatchEvent(new CustomEvent('configurationUpdated'));
    }

    // Initializes the Sortable instances for the form layout
    initializeSortable() {
        const layoutList = this.container.querySelector('#formLayoutList');
        if (layoutList) {
            // Create main sortable
            const mainSortable = new Sortable(layoutList, {
                animation: 150,
                handle: '.layout-item-handle',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                draggable: '.section, .form-layout-grid',
                onEnd: () => this.saveFormLayout()
            });
            this.layoutSortables.push(mainSortable);

            // Create sortables for each grid
            const sectionGrids = layoutList.querySelectorAll('.form-layout-grid');
            sectionGrids.forEach(grid => {
                const gridSortable = new Sortable(grid, {
                    animation: 150,
                    handle: '.layout-item-handle',
                    ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
                    dragClass: 'sortable-drag',
                    draggable: '.layout-item.field',
                    onEnd: () => this.saveFormLayout()
                });
                this.layoutSortables.push(gridSortable);
            });
        }
    }

    // Renders the views configuration (Forms and Reports)
    async renderViewsConfig() {
        const viewsConfigPane = this.container.querySelector('#views-config'); // Changed ID
        const viewOrder = await this.storage.getTableOrder(); // Reusing tableOrder for general views order
        this.config.setTableOrder(viewOrder); // Reusing setTableOrder for general views order
        
        viewsConfigPane.innerHTML = `
            <div class="views-config-list" id="sortableViews"> <!-- Changed ID -->
                ${this.config.getAllViews().map(view => ` // Renamed table to view
                    <div class="view-config-item" data-view-id="${view.id}"> <!-- Changed data-table-id to data-view-id -->
                        <div class="view-drag-handle">⋮⋮</div> <!-- Changed class -->
                        <div class="view-config-header"> <!-- Changed class -->
                            <h3>${view.name} (${view.type || 'form'})</h3> <!-- Display view type -->
                            <div class="view-actions"> <!-- Changed class -->
                                <button class="btn btn-secondary edit-view">Edit</button> <!-- Changed class -->
                                <button class="btn btn-secondary duplicate-view">Duplicate</button> <!-- Changed class -->
                                ${view.id !== 'default' ? `
                                    <button class="btn btn-secondary delete-view">Delete</button> <!-- Changed class -->
                                ` : ''}
                            </div>
                        </div>
                        <div class="view-columns"> <!-- Changed class -->
                            ${view.columns ? view.columns.map(col => `
                                <span class="column-tag">${col.label}</span>
                            `).join('') : 'No columns configured.'}
                        </div>
                    </div>
                `).join('')}
                
            </div>
        `;
        
        // Add these event listeners after the HTML is rendered
        const viewsList = viewsConfigPane.querySelector('#sortableViews'); // Changed ID
        
        // Handle view actions (edit, duplicate, delete)
        viewsList.addEventListener('click', async (e) => {
            const viewItem = e.target.closest('.view-config-item'); // Changed class
            if (!viewItem) return;

            const viewId = viewItem.dataset.viewId; // Changed data-table-id to data-view-id
            const viewType = this.config.getView(viewId)?.type || 'form'; // Get view type

            if (e.target.classList.contains('edit-view')) { // Changed class
                this.showViewEditor(viewType, viewId); // Pass view type and ID
            } else if (e.target.classList.contains('duplicate-view')) { // Changed class
                const newViewId = this.config.duplicateView(viewId); // Reusing duplicateTable logic
                if (newViewId) {
                    const duplicatedView = this.config.getView(newViewId);
                    await this.storage.saveTableConfig(duplicatedView); // Reusing saveTableConfig
                    
                    // Update view order
                    const currentOrder = await this.storage.getTableOrder();
                    const newOrder = [...currentOrder, newViewId];
                    await this.storage.saveTableOrder(newOrder);
                    this.config.setTableOrder(newOrder);
                    
                    this.renderViewsConfig();
                    document.dispatchEvent(new CustomEvent('configurationUpdated'));
                }
            } else if (e.target.classList.contains('delete-view')) { // Changed class
                if (confirm('Are you sure you want to delete this view?')) {
                    await this.storage.deleteTableConfig(viewId); // Reusing deleteTableConfig
                    const views = this.config.tables; // Reusing tables map
                    views.delete(viewId);
                    
                    // Update view order
                    const currentOrder = await this.storage.getTableOrder();
                    const newOrder = currentOrder.filter(id => id !== viewId);
                    await this.storage.saveTableOrder(newOrder);
                    this.config.setTableOrder(newOrder);
                    
                    this.renderViewsConfig();
                    document.dispatchEvent(new CustomEvent('configurationUpdated'));
                }
            }
        });

        // Initialize Sortable
        const sortableList = viewsConfigPane.querySelector('#sortableViews'); // Changed ID
        new Sortable(sortableList, {
            animation: 150,
            handle: '.view-drag-handle', // Changed class
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            filter: '.btn, .add-view', // Changed class
            onEnd: async (evt) => {
                const newOrder = Array.from(sortableList.querySelectorAll('.view-config-item')) // Changed class
                    .map(item => item.dataset.viewId); // Changed data-table-id to data-view-id
                
                this.config.setTableOrder(newOrder);
                await this.storage.saveTableOrder(newOrder);
                document.dispatchEvent(new CustomEvent('configurationUpdated'));
            }
        });
    }    

    // Shows the view editor modal for adding or editing a view (form or report)
    async showViewEditor(viewType, viewId = null) {
        this.cleanupModals();

        const view = viewId ? this.config.getView(viewId) : { // Changed getTable to getView
            id: crypto.randomUUID(),
            name: 'New ' + (viewType === 'form' ? 'Form' : 'Report') + ' View',
            type: viewType, // 'form' or 'report'
            columns: [], // For form views, these are the table columns
            order: [],
            filters: [],
            visible: true,
            copyFormat: 'tab-delimited',
            smartsheet: null, // For form views
            reportConfig: { // For report views
                chartType: 'bar',
                groupBy: '',
                valueColumn: '',
                datasets: []
            }
        };

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2 style="float:left">${viewId ? 'Edit' : 'Add'} ${viewType === 'form' ? 'Form' : 'Report'} View</h2>                  
                <form id="view-editor-form">
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    </div>
                    <input type="hidden" name="viewId" value="${view.id}">
                    <input type="hidden" name="viewType" value="${view.type}">
                    <div class="form-group">
                        <label class="form-label">View Name</label>
                        <input type="text" class="form-control" name="name" 
                               value="${view.name}" required 
                               ${view.id === 'default' ? 'readonly' : ''}>
                    </div>

                    ${viewType === 'form' ? `
                        <div class="collapsible-section">
                            <button type="button" class="collapsible-header">
                                <span class="icon">🔄</span> SmartSheet Integration
                                <span class="chevron">▲</span>
                            </button>
                            <div class="collapsible-content">
                                <div class="form-group">
                                    <label class="form-label">Sheet ID</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" name="sheetId" 
                                               value="${view.smartsheet?.sheetId || ''}" 
                                               placeholder="SmartSheet Sheet ID">
                                        <button type="button" class="btn btn-secondary" id="preview-columns">
                                            <span class="icon">👁️</span> Preview Columns
                                        </button>
                                    </div>
                                </div>
                                <div class="column-mapping" style="display:none;">
                                    <h4>Select Columns to Import</h4>
                                   
                                    <div class="mapping-actions">
                                        <button type="button" class="btn btn-secondary select-all">Select All</button>
                                        <button type="button" class="btn btn-secondary deselect-all">Deselect All</button>
                                        <button type="button" class="btn btn-primary sync-selected">Sync Selected</button>
                                    </div>
                                </div>
                                ${view.smartsheet?.lastSync ? `
                                    <div class="sync-status success">
                                        <span class="icon">✓</span>
                                        Last synced: ${new Date(view.smartsheet.lastSync).toLocaleString()}
                                    </div>
                                ` : ''}
                                <div id="sync-status"></div>
                 <div class="column-selection"></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <button type="button" class="btn btn-secondary" id="add-column">Add Column</button>
                            <label class="form-label">Columns (drag to reorder)</label>
                            <div id="column-list" class="sortable-columns">
                                ${view.columns.map((col, idx) => this.renderColumnItem(col, idx)).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${viewType === 'report' ? `
                        <div class="collapsible-section">
                            <button type="button" class="collapsible-header">
                                <span class="icon">📊</span> Report Configuration
                                <span class="chevron">▲</span>
                            </button>
                            <div class="collapsible-content">
                                <div class="form-group">
                                    <label class="form-label">Chart Type</label>
                                    <select class="form-control" name="report-chartType">
                                        <option value="bar" ${view.reportConfig?.chartType === 'bar' ? 'selected' : ''}>Bar Chart</option>
                                        <option value="pie" ${view.reportConfig?.chartType === 'pie' ? 'selected' : ''}>Pie Chart</option>
                                        <option value="line" ${view.reportConfig?.chartType === 'line' ? 'selected' : ''}>Line Chart</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Group By Column</label>
                                    <select class="form-control" name="report-groupBy">
                                        <option value="">-- Select Column --</option>
                                        ${this.config.getAllFields().map(field => `
                                            <option value="${field.key}" ${view.reportConfig?.groupBy === field.key ? 'selected' : ''}>
                                                ${field.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Value Column (for sums/averages)</label>
                                    <select class="form-control" name="report-valueColumn">
                                        <option value="">-- Select Column (Optional) --</option>
                                        ${this.config.getAllFields().filter(field => ['number'].includes(field.type)).map(field => `
                                            <option value="${field.key}" ${view.reportConfig?.valueColumn === field.key ? 'selected' : ''}>
                                                ${field.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;

        // Add collapsible functionality
        modal.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const chevron = header.querySelector('.chevron');
                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                header.setAttribute('aria-expanded', !isExpanded);
                content.style.display = isExpanded ? 'none' : 'block';
                chevron.textContent = isExpanded ? '▲' : '▼';
            });
            // Set initial state based on previous click or default
            const content = header.nextElementSibling;
            const chevron = header.querySelector('.chevron');
            if (content.style.display === 'block') { // Default to expanded
                header.setAttribute('aria-expanded', 'true');
                chevron.textContent = '▼';
            } else {
                header.setAttribute('aria-expanded', 'false');
                chevron.textContent = '▲';
            }
        });


        if (viewType === 'form') {
            // Initialize Sortable for columns if it's a form view
            const columnList = modal.querySelector('#column-list');
            if (columnList) {
                this.initializeColumnSortable(columnList);
            }

            // Preview columns handler
            const previewColumnsBtn = modal.querySelector('#preview-columns');
            if (previewColumnsBtn) {
                previewColumnsBtn.onclick = async () => {
                    const sheetId = modal.querySelector('[name="sheetId"]').value;
                    const statusDiv = modal.querySelector('#sync-status');
                    const columnMapping = modal.querySelector('.column-mapping');
                    
                    if (!sheetId) {
                        statusDiv.innerHTML = `
                            <div class="sync-status error">
                                <span class="icon">⚠️</span>
                                Please enter a Sheet ID
                            </div>
                        `;
                        return;
                    }

                    try {
                        const settings = await this.storage.getSmartSheetSettings();
                        if (!settings?.apiKey) {
                            const apiKey = prompt('Please enter your SmartSheet API key:');
                            if (!apiKey) {
                                statusDiv.innerHTML = `
                                    <div class="sync-status error">
                                        <span class="icon">⚠️</span>
                                        API key required
                                    </div>
                                `;
                                return;
                            }
                            await this.storage.saveSmartSheetSettings(apiKey);
                        }

                        const service = new SmartSheetService(settings.apiKey);
                        const columns = await service.getSheetColumns(sheetId);
                        
                        const columnSelection = modal.querySelector('.column-selection');
                            columnSelection.innerHTML = columns.map(col => `
                                <div class="column-map-item">
                                    <label class="form-control-checkbox">
                                        <input type="checkbox" name="import_column_${col.id}" 
                                               value="${col.id}" checked>
                                        ${col.title}
                                    </label>
                                </div>
                            `).join('');

                        columnMapping.style.display = 'block';
                        
                    } catch (error) {
                        statusDiv.innerHTML = `
                            <div class="sync-status error">
                                <span class="icon">⚠️</span>
                                Failed to fetch columns: ${error.message}
                            </div>
                        `;
                    }
                };
            }

            // Add select/deselect all handlers
            modal.querySelector('.select-all')?.addEventListener('click', () => {
                modal.querySelectorAll('.column-map-item input[type="checkbox"]')
                    .forEach(cb => cb.checked = true);
            });

            modal.querySelector('.deselect-all')?.addEventListener('click', () => {
                modal.querySelectorAll('.column-map-item input[type="checkbox"]')
                    .forEach(cb => cb.checked = false);
            });

            // Sync selected columns handler
            modal.querySelector('.sync-selected')?.addEventListener('click', async () => {
                const sheetId = modal.querySelector('[name="sheetId"]').value;
                const statusDiv = modal.querySelector('#sync-status');
                const viewId = modal.querySelector('[name="viewId"]').value; // Use viewId

                const selectedColumns = Array.from(
                    modal.querySelectorAll('.column-map-item input[type="checkbox"]:checked')
                ).map(cb => ({
                    id: cb.value,
                    title: cb.closest('.column-map-item').querySelector('label').textContent.trim() // Use title for mapping
                }));

                if (selectedColumns.length === 0) {
                    statusDiv.innerHTML = `
                        <div class="sync-status error">
                            <span class="icon">⚠️</span>
                            Please select at least one column to sync
                        </div>
                    `;
                    return;
                }

                try {
                    const settings = await this.storage.getSmartSheetSettings();
                    if (!settings?.apiKey) {
                        const apiKey = prompt('Please enter your SmartSheet API key:');
                        if (!apiKey) {
                            statusDiv.innerHTML = `
                                <div class="sync-status error">
                                    <span class="icon">⚠️</span>
                                    API key required
                                </div>
                            `;
                            return;
                        }
                        await this.storage.saveSmartSheetSettings(apiKey);
                        settings.apiKey = apiKey;
                    }

                    statusDiv.innerHTML = `
                        <div class="sync-status syncing">
                            <span class="sync-spinner"></span>
                            Syncing with SmartSheet...
                        </div>
                    `;

                    const service = new SmartSheetService(settings.apiKey);
                    
                    // Fetch sheet data and columns
                    const sheet = await service.getSheet(sheetId);
                    
                    // Update the name input in the modal to match sheet name
                    const nameInput = modal.querySelector('input[name="name"]');
                    if (nameInput && !nameInput.readOnly) {
                        nameInput.value = sheet.name;
                    }
                    
                    // Update form configuration with new fields
                    const formConfig = new Map(this.config.formConfig);
                    const newFields = [];
                    const updatedFields = [];

                    selectedColumns.forEach(col => {
                        const column = sheet.columns.find(c => c.id.toString() === col.id);
                        if (column) {
                            const fieldKey = column.title.toLowerCase().replace(/\s+/g, '_');
                            const newFieldConfig = service.convertToFormField(column);
                            
                            if (formConfig.has(fieldKey)) {
                                const existingConfig = formConfig.get(fieldKey);
                                if (existingConfig.type === newFieldConfig.type) {
                                    if (['select', 'multiselect'].includes(existingConfig.type)) {
                                        // Compare options arrays
                                        const areOptionsEqual = 
                                            existingConfig.options.length === newFieldConfig.options.length && 
                                            existingConfig.options.every((option, index) => 
                                                option === newFieldConfig.options[index]
                                            );
                                        
                                        // Only update if options are different
                                        if (!areOptionsEqual) {
                                            existingConfig.options = newFieldConfig.options;
                                            formConfig.set(fieldKey, existingConfig);
                                            updatedFields.push({
                                                field: fieldKey,
                                                label: existingConfig.label
                                            });
                                        }
                                    }
                                }
                            } else {
                                formConfig.set(fieldKey, newFieldConfig);
                                newFields.push({
                                    key: fieldKey,
                                    ...newFieldConfig
                                });
                            }
                        }
                    });

                    // Save updated form configuration
                    if (newFields.length > 0 || updatedFields.length > 0) {
                        this.config.formConfig = formConfig;
                        await this.storage.saveFormConfig(formConfig);
                    }

                    // Update view configuration
                    const currentView = this.config.getView(viewId); // Use getTable which now retrieves any view type
                    if (currentView) {
                        // Update columns based on selected fields
                        currentView.columns = selectedColumns.map(col => ({
                            field: col.title.toLowerCase().replace(/\s+/g, '_'),
                            label: col.title
                        }));

                        // Update view name to match sheet name
                        currentView.name = sheet.name;

                        // Update SmartSheet connection info
                        currentView.smartsheet = {
                            sheetId: sheetId,
                            lastSync: new Date().toISOString()
                        };

                        // Save updated view configuration
                        await this.storage.saveTableConfig(currentView); // Reusing saveTableConfig
                        this.config.addView(currentView); // Reusing addTable
                    }

                    // Refresh UI
                    document.dispatchEvent(new CustomEvent('configurationUpdated'));

                    // Update column list in modal
                    const columnList = modal.querySelector('#column-list');
                    if (columnList) {
                        columnList.innerHTML = currentView.columns.map((col, idx) => 
                            this.renderColumnItem(col, idx)
                        ).join('');
                        this.initializeColumnSortable(columnList);
                    }

                    statusDiv.innerHTML = `
                        <div class="sync-status success">
                            <span class="icon">✓</span>
                            Sync completed successfully! 
                            ${newFields.length} new fields available.
                            ${updatedFields.length} existing fields updated.
                            Last synced: ${new Date().toLocaleString()}
                        </div>
                    `;

                    // Show sync completion details
                    const details = document.createElement('div');
                    details.className = 'sync-details';
                    details.innerHTML = `
                        <h4>Sync Summary:</h4>
                        <ul>
                            ${newFields.length > 0 ? `
                                <li>${newFields.length} new form fields added to available fields</li>
                            ` : ''}
                            ${updatedFields.length > 0 ? `
                                <li>${updatedFields.length} existing fields updated with new options:
                                    <ul>
                                        ${updatedFields.map(field => `
                                            <li>${field.label}</li>
                                        `).join('')}
                                    </ul>
                                </li>
                            ` : ''}
                            <li>${currentView.columns.length} columns configured in view</li>
                            <li>View name updated to match sheet: ${sheet.name}</li>
                        </ul>
                    `;
                    statusDiv.appendChild(details);

                } catch (error) {
                    console.error('Sync error:', error);
                    statusDiv.innerHTML = `
                        <div class="sync-status error">
                            <span class="icon">⚠️</span>
                            Sync failed: ${error.message}
                        </div>
                    `;
                }
            });

            // Add column button handler
            const addColumnBtn = modal.querySelector('#add-column');
            if (addColumnBtn) {
                addColumnBtn.onclick = () => {
                    const idx = modal.querySelectorAll('.column-item').length;
                    const columnItem = document.createElement('div');
                    columnItem.className = 'column-item';
                    columnItem.innerHTML = this.renderColumnItem({ field: '', label: '' }, idx);
                    modal.querySelector('#column-list').appendChild(columnItem);
                };
            }

            // Remove column handler
            const columnListOnClick = (e) => {
                if (e.target.classList.contains('remove-column')) {
                    e.target.closest('.column-item').remove();
                }
            };
            modal.querySelector('#column-list')?.addEventListener('click', columnListOnClick);

        }

        // Common form submission handler for both form and report views
        modal.querySelector('form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const viewId = formData.get('viewId');
            const viewType = formData.get('viewType');
            
            let updatedView = {
                ...view,
                name: formData.get('name'),
                id: viewId,
                type: viewType
            };

            if (viewType === 'form') {
                const columns = [];
                modal.querySelectorAll('.column-item').forEach((item) => {
                    const field = item.querySelector('[name^="column-field"]').value;
                    const label = item.querySelector('[name^="column-label"]').value;
                    if (field && label) {
                        columns.push({ field, label });
                    }
                });
                updatedView.columns = columns;
                updatedView.smartsheet = {
                    sheetId: formData.get('sheetId') || null,
                    lastSync: view.smartsheet?.lastSync || null
                };
            } else if (viewType === 'report') {
                updatedView.reportConfig = {
                    chartType: formData.get('report-chartType'),
                    groupBy: formData.get('report-groupBy'),
                    valueColumn: formData.get('report-valueColumn')
                };
            }

            try {
                await this.storage.saveTableConfig(updatedView); // Reusing saveTableConfig for views
                this.config.addView(updatedView); // Reusing addTable
                
                if (!viewId) { // If it's a new view
                    const currentOrder = await this.storage.getTableOrder();
                    const newOrder = [...currentOrder, updatedView.id];
                    await this.storage.saveTableOrder(newOrder);
                    this.config.setTableOrder(newOrder);
                }
                
                this.renderViewsConfig(); // Call new renderViewsConfig
                this.cleanupModals();
                document.dispatchEvent(new CustomEvent('configurationUpdated'));
            } catch (error) {
                console.error('Error saving view configuration:', error);
                alert('Error saving view configuration. Please try again.');
            }
        };

        // Close modal handler
        modal.addEventListener('click', (e) => {
            if (e.target.matches('.close-modal')) {
                this.cleanupModals();
            }
        });
    }

    // Cleans up existing modals
    cleanupModals() {
        if (this.currentModal) {
            // Remove event listeners
            const form = this.currentModal.querySelector('form');
            const addColumnBtn = this.currentModal.querySelector('#add-column');
            const columnList = this.currentModal.querySelector('#column-list');
            const closeBtn = this.currentModal.querySelector('.close-modal');

            if (form) form.removeEventListener('submit', form.onsubmit);
            if (addColumnBtn) addColumnBtn.removeEventListener('click', addColumnBtn.onclick);
            if (columnList) columnList.removeEventListener('click', columnList.onclick);
            if (closeBtn) closeBtn.removeEventListener('click', closeBtn.onclick);

            // Remove Sortable instance if it exists
            if (this.currentSortable) {
                this.currentSortable.destroy();
                this.currentSortable = null;
            }

            // Remove modal from DOM
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    // Initializes Sortable for column list in table editor
    initializeColumnSortable(columnList) {
        if (this.currentSortable) {
            this.currentSortable.destroy();
        }
        
        this.currentSortable = new Sortable(columnList, {
            animation: 150,
            handle: '.column-drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag'
        });
    }

    // Renders an individual column item for the table editor
    renderColumnItem(col, idx) {
        return `
            <div class="column-item" data-idx="${idx}">
                <div class="column-drag-handle">⋮⋮</div>
                <select class="form-control" name="column-field-${idx}">
                    ${Array.from(this.config.formConfig.entries()).map(([field, config]) => `
                        <option value="${field}" ${field === col.field ? 'selected' : ''}>
                            ${config.label}
                        </option>
                    `).join('')}
                </select>
                <input type="text" class="form-control" name="column-label-${idx}" 
                       value="${col.label}" placeholder="Display Label" required>
                <button type="button" class="btn btn-secondary remove-column">×</button>
            </div>
        `;
    }

}

// Make classes globally available
window.StorageManager = StorageManager;
window.ConfigurationUI = ConfigurationUI;