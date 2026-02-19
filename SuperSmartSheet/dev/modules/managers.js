/**
 * View Manager Module
 * Manages the rendering and interaction of tabs and tables.
 */
class ViewManager {
    /**
     * Constructor for the ViewManager class.
     * @param {Object} config - The configuration object.
     * @param {HTMLElement} container - The container element for the views.
     */
    constructor(config, container) {
        this.config = config;
        this.container = container;
        this.tabs = new Map();
        this.currentTab = null;
        this.tabsContainer = null;
        this.tableContainer = null;
        
        // Bind event handlers
        this.updateRowActionPositions = this.updateRowActionPositions.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
    }

    /**
     * Creates a tab element for a given table configuration.
     * @param {Object} tableConfig - The table configuration.
     * @returns {HTMLElement} - The created tab element.
     */
    createTab(tableConfig) {
        const tabElement = document.createElement('button');
        tabElement.className = 'tab';
        tabElement.textContent = tableConfig.name;
        tabElement.dataset.tableId = tableConfig.id;
        
        this.tabs.set(tableConfig.id, {
            element: tabElement,
            config: tableConfig
        });

        return tabElement;
    }

    /**
     * Renders the tabs based on the configuration.
     */
    renderTabs() {
        // Remove existing tabs container if present
        if (this.tabsContainer) {
            this.tabsContainer.remove();
        }

        // Create new tabs container
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'tabs-container';

        const navContainer = document.createElement('div');
        navContainer.className = 'nav-container';

        const tabsDiv = document.createElement('div');
        tabsDiv.className = 'tabs';
        this.tabs.clear();

        // Filter and create tabs for visible tables
        const tables = this.config.getAllTables().filter(table => table.visible);
        tables.forEach(tableConfig => {
            const tab = this.createTab(tableConfig);
            tabsDiv.appendChild(tab);
        });

        // Create view actions
        const viewActions = document.createElement('div');
        viewActions.className = 'view-actions';
        viewActions.innerHTML = `
            <button class="btn btn-secondary clear-entries">
                <span class="icon">🗑️</span> Clear Entries
            </button>
            <button class="btn btn-secondary export-view">
                <span class="icon">⬇️</span> Export View
            </button>
        `;

        navContainer.appendChild(tabsDiv);
        navContainer.appendChild(viewActions);
        this.tabsContainer.appendChild(navContainer);

        // Insert tabs container after the form (if present) or append to the container
        const form = this.container.querySelector('form');
        if (form) {
            form.after(this.tabsContainer);
        } else {
            this.container.appendChild(this.tabsContainer);
        }

        // Set active tab based on the current tab
        if (this.currentTab) {
            const tab = this.tabs.get(this.currentTab);
            if (tab) {
                tab.element.classList.add('active');
            }
        }

        // Attach view action handlers
        this.attachViewActionHandlers();
    }

    /**
     * Updates the positions of row action elements.
     */
    updateRowActionPositions() {
        if (!this.tableContainer) return;

        const tableRect = this.tableContainer.getBoundingClientRect();
        const rows = this.tableContainer.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const rowActions = row.querySelector('.row-actions');
            if (rowActions) {
                const rowRect = row.getBoundingClientRect();
                rowActions.style.top = `${rowRect.top + (rowRect.height / 2)}px`;
                rowActions.style.right = `${window.innerWidth - tableRect.right + 16}px`;
            }
        });
    }

    /**
     * Handles the scroll event and updates the row action positions.
     */
    handleScroll() {
        requestAnimationFrame(this.updateRowActionPositions);
    }

    /**
     * Attaches event handlers for view actions.
     */
    attachViewActionHandlers() {
        const viewActions = this.tabsContainer.querySelector('.view-actions');
        
        viewActions?.addEventListener('click', async (e) => {
            if (e.target.classList.contains('clear-entries')) {
                // Clear all entries
                if (confirm('Are you sure you want to clear all entries?')) {
                    const storage = new StorageManager();
                    await storage.initializeDB();
                    this.config.entries = [];
                    await storage.syncEntries([]);
                    document.dispatchEvent(new CustomEvent('entriesUpdated'));
                }
            } else if (e.target.classList.contains('export-view')) {
                // Export view data
                const tableConfig = this.config.getTable(this.currentTab);
                const data = this.config.entries.map(entry => {
                    const rowData = {};
                    tableConfig.columns.forEach(col => {
                        rowData[col.label] = entry[col.field];
                    });
                    return rowData;
                });
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${tableConfig.name.toLowerCase().replace(/\s+/g, '-')}-export.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        });
    }

    /**
     * Switches the view to the specified table.
     * @param {string} tableId - The ID of the table to switch to.
     */
    switchView(tableId) {
        this.currentTab = tableId;
        this.tabs.forEach((tab, id) => {
            tab.element.classList.toggle('active', id === tableId);
        });
        this.renderTable(tableId);
    }

    /**
     * Renders the table for the specified table ID.
     * @param {string} tableId - The ID of the table to render.
     */
    renderTable(tableId) {
        // Remove existing table container and event listeners
        if (this.tableContainer) {
            this.tableContainer.removeEventListener('scroll', this.handleScroll);
            window.removeEventListener('scroll', this.handleScroll);
            window.removeEventListener('resize', this.updateRowActionPositions);
            this.tableContainer.remove();
        }

        const tableConfig = this.config.getTable(tableId);
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        this.tableContainer = tableContainer;

        // Create table structure
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    ${tableConfig.columns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        
        // Apply filters and order to entries
        let displayEntries = this.config.entries;
        if (tableConfig.filters?.length > 0) {
            displayEntries = displayEntries.filter(entry => 
                tableConfig.filters.every(filter => filter(entry))
            );
        }

        if (tableConfig.order?.length > 0) {
            displayEntries = _.orderBy(
                displayEntries,
                tableConfig.order.map(o => o.field),
                tableConfig.order.map(o => o.direction)
            );
        }

        // Render table rows
        if (displayEntries.length === 0) {
            // Show empty state message if no entries
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="${tableConfig.columns.length}" class="empty-state">
                    No entries yet. Add your first errata entry using the form above.
                </td>
            `;
            tbody.appendChild(tr);
        } else {
            displayEntries.forEach(entry => {
				const tr = document.createElement('tr');
				tr.dataset.entryId = entry.id;
				tr.innerHTML = `
					${tableConfig.columns.map(col => {
						const value = entry[col.field];
						const fieldConfig = this.config.formConfig.get(col.field);
						
						if (fieldConfig?.type === 'multiselect' && Array.isArray(value)) {
							return `<td>${value.join(', ')}</td>`;
						} else if (fieldConfig?.type === 'select') {
							return `<td>${value || ''}</td>`;
						} else {
							return `<td>${value || ''}</td>`;
						}
					}).join('')}
				`;
                
                // Create row actions
                const rowActions = document.createElement('div');
                rowActions.className = 'row-actions';
                rowActions.innerHTML = `
                    <button class="btn btn-secondary edit-row" data-entry-id="${entry.id}">Edit</button>
                    <button class="btn btn-secondary copy-row" data-entry-id="${entry.id}">Copy</button>
                    <button class="btn btn-secondary delete-row" data-entry-id="${entry.id}">Delete</button>
                `;
                tr.appendChild(rowActions);
                
                tbody.appendChild(tr);
            });
        }

        tableContainer.appendChild(table);
        this.container.appendChild(tableContainer);

        // Attach event listeners for scroll and resize
        tableContainer.addEventListener('scroll', this.handleScroll, { passive: true });
        window.addEventListener('scroll', this.handleScroll, { passive: true });
        window.addEventListener('resize', this.updateRowActionPositions);

        // Update row action positions and attach row action listeners
        this.updateRowActionPositions();
        this.attachRowActionListeners();
    }

    /**
     * Attaches event listeners for row actions (edit, delete, copy).
     */
    attachRowActionListeners() {
        const tableContainer = this.container.querySelector('.table-container');
        
        tableContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-row');
            const deleteBtn = e.target.closest('.delete-row');
            const copyBtn = e.target.closest('.copy-row');

            if (editBtn) {
                this.editEntry(editBtn.dataset.entryId);
            } else if (deleteBtn) {
                this.deleteEntry(deleteBtn.dataset.entryId);
            }
        });
    }

	/**
	 * Edits an entry with the specified ID.
	 * @param {string} entryId - The ID of the entry to edit.
	 */
	editEntry(entryId) {
		const entry = this.config.getEntry(entryId);
		if (!entry) {
			console.error('Entry not found:', entryId);
			return;
		}

		const form = this.container.querySelector('form');
		if (!form) {
			console.error('Form not found');
			return;
		}
		
		try {
				resetCustomFields(form);
			// Populate form fields with entry data
			Object.entries(entry).forEach(([field, value]) => {
				const fieldConfig = this.config.formConfig.get(field);
				if (!fieldConfig) return; // Skip if no field config exists

				// Handle different field types
				if (fieldConfig.type === 'multiselect') {
					const wrapper = form.querySelector(`[name="${field}"]`)?.closest('.multiselect-wrapper');
					if (wrapper) {
						// Handle multiselect fields
						const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
						const selectedDisplay = wrapper.querySelector('.selected-options');
						const selectedLabels = [];
						
						checkboxes.forEach(checkbox => {
							const isChecked = Array.isArray(value) && value.includes(checkbox.value);
							checkbox.checked = isChecked;
							
							if (isChecked) {
								const label = checkbox.closest('label').textContent.trim();
								selectedLabels.push(`<span class="selected-option">${label}</span>`);
							}
						});
						
						selectedDisplay.innerHTML = selectedLabels.join('');
					}
				} else if (fieldConfig.type === 'select') {
					const wrapper = form.querySelector(`[name="${field}"]`)?.closest('.select-wrapper');
					if (wrapper) {
						// Handle select fields
						const selectedDisplay = wrapper.querySelector('.selected-options');
						const hiddenInput = wrapper.querySelector('.select-value');
						const options = wrapper.querySelectorAll('.select-option');
						
						const matchingOption = Array.from(options)
							.find(opt => opt.dataset.value === value);
						
						if (matchingOption) {
							selectedDisplay.innerHTML = `<span class="selected-option">${matchingOption.textContent.trim()}</span>`;
							if (hiddenInput) {
								hiddenInput.value = value;
							}
						} else {
							// Reset to default if value doesn't match any option
							selectedDisplay.textContent = selectedDisplay.dataset.default || 'Select an option';
							if (hiddenInput) {
								hiddenInput.value = '';
							}
						}
					}
				} else {
					// Handle standard input fields
					const input = form.querySelector(`[name="${field}"]`);
					if (input) {
						input.value = value || '';
					}
				}
			});

			// Add hidden input for edit mode
			let editInput = form.querySelector('input[name="editEntryId"]');
			if (!editInput) {
				editInput = document.createElement('input');
				editInput.type = 'hidden';
				editInput.name = 'editEntryId';
				form.appendChild(editInput);
			}
			editInput.value = entryId;

			// Update submit button text
			const submitBtn = form.querySelector('button[type="submit"]');
			if (submitBtn) {
				submitBtn.textContent = 'Update Entry';
			}

			// Scroll to the form
			form.scrollIntoView({ behavior: 'smooth', block: 'start' });

		} catch (error) {
			console.error('Error populating edit form:', error);
			// Optionally show error message to user
			const alert = document.createElement('div');
			alert.className = 'alert alert-error';
			alert.style.display = 'block';
			alert.textContent = 'Error loading entry for editing. Please try again.';
			this.container.insertBefore(alert, form);
			setTimeout(() => alert.remove(), 3000);
		}
	}
	
	/**
	 * Deletes an entry with the specified ID.
	 * @param {string} entryId - The ID of the entry to delete.
	 */
    async deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        try {
            const storage = new StorageManager();
            await storage.initializeDB();
            await storage.deleteEntry(entryId);

            const deleted = this.config.deleteEntry(entryId);
            if (deleted) {
                document.dispatchEvent(new CustomEvent('entriesUpdated', {
                    detail: { action: 'delete' }
                }));

                const alert = document.createElement('div');
                alert.className = 'alert alert-success';
                alert.style.display = 'block';
                alert.textContent = 'Entry deleted successfully';
                this.container.insertBefore(alert, this.container.firstChild);
                setTimeout(() => alert.remove(), 3000);
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            const alert = document.createElement('div');
            alert.className = 'alert alert-error';
            alert.style.display = 'block';
            alert.textContent = 'Error deleting entry. Please try again.';
            this.container.insertBefore(alert, this.container.firstChild);
            setTimeout(() => alert.remove(), 3000);
        }
    }
}

/**
 * Form Manager Module
 * Manages the rendering and interaction of the entry form.
 */
class FormManager {
    /**
     * Constructor for the FormManager class.
     * @param {Object} config - The configuration object.
     * @param {HTMLElement} container - The container element for the form.
     */
    constructor(config, container) {
        this.config = config;
        this.container = container;
        this.form = null;
    }

    /**
     * Renders the entry form based on the configuration.
     */
    renderForm() {
		if (this.form) {
			this.form.remove();
		}

		this.form = document.createElement('form');
		this.form.className = 'card';

		const pasteArea = `
			<div id="pasteArea" class="paste-area" style="display: none;">
				<div class="card-header">
					<h3 class="card-title">Paste Data</h3>
					<button type="button" class="btn btn-secondary close-paste-area">Close</button>
				</div>
				<div class="card-content">
					<p class="paste-instructions">Paste your data (tab or comma separated). Fields will be filled in the current view's order.</p>
					<textarea class="form-control paste-input" 
						placeholder="Paste your data here (tab or comma separated)"></textarea>
					<div class="paste-preview"></div>
					<div class="paste-actions">
						<button type="button" class="btn btn-primary confirm-paste">Use This Data</button>
						<button type="button" class="btn btn-secondary clear-paste">Clear</button>
					</div>
				</div>
			</div>
		`;

		this.form.innerHTML = `
        <div class="collapsible-section">
            <button type="button" class="collapsible-header" aria-expanded="true">
                <h2 class="card-title">Add New Errata Entry</h2>
                <span class="chevron">▼</span>
            </button>
            <div class="collapsible-content" style="display: block;">
                <div class="card-header">
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="showPasteArea">
                            <span class="icon">📋</span> Paste External Data
                        </button>
                        <button type="button" class="btn btn-secondary" id="exportConfig">
                            <span class="icon">⬇️</span> Export Config
                        </button>
                        <button type="button" class="btn btn-secondary" id="importConfig">
                            <span class="icon">⬆️</span> Import Config
                        </button>
                        <button type="button" class="btn btn-secondary" id="clearForm">
                            <span class="icon">🗑️</span> Clear Form
                        </button>
                    </div>
                </div>
                ${pasteArea}
                <div class="card-content">
                    ${this.renderFormLayout()}
                    <button type="submit" class="btn btn-primary">Add Entry</button>
                </div>
            </div>
        </div>
    `;

    this.container.appendChild(this.form);
    this.attachFormHandlers(this.form);
    this.attachPasteHandlers(this.form);
    this.attachCollapsibleHandler(this.form);
	}

	/**
	 * Renders the form layout based on the configuration.
	 * @returns {string} - The HTML markup for the form layout.
	 */
    renderFormLayout() {
		const layout = this.config.getFormLayout();
		let html = '<div class="form-grid">';

		layout.forEach((item, index) => {
			if (item.type === 'field') {
				const fieldConfig = this.config.formConfig.get(item.field);
				if (fieldConfig) {
					const sizeClass = FIELD_SIZES[item.size] || FIELD_SIZES['half'];
					html += `
						<div class="form-group ${sizeClass}" data-field="${item.field}" data-index="${index}">
							<label class="form-label">
								${fieldConfig.label}${fieldConfig.required ? ' *' : ''}
							</label>
							${this.renderFormControl(item.field, fieldConfig)}
						</div>
					`;
				}
			}
		});

		html += '</div>';
		return html;
	}

	/**
	 * Renders the form control for a given field based on its configuration.
	 * @param {string} field - The field name.
	 * @param {Object} config - The field configuration.
	 * @returns {string} - The HTML markup for the form control.
	 */
    renderFormControl(field, config) {
		if (config.type === 'multiselect') {
			const needsSearch = config.options.length > 5;
			const defaultValues = Array.isArray(config.default) ? config.default : 
								config.default ? [config.default] : [];
			
			return `
				<div class="multiselect-wrapper">
					<div class="multiselect-dropdown">
						<div class="selected-options">
							${defaultValues.map(value => `
								<span class="selected-option">${value}</span>
							`).join('')}
						</div>
					</div>
					<div class="multiselect-options">
						${needsSearch ? `
							<div class="multiselect-search">
								<input type="text" 
									   class="form-control" 
									   placeholder="Search options..."
									   autocomplete="off">
							</div>
						` : ''}
						<div class="options-list">
							${config.options.map(option => `
								<label class="multiselect-option">
									<input type="checkbox" 
										   name="${field}" 
										   value="${option}"
										   ${defaultValues.includes(option) ? 'checked' : ''}>
									${option}
								</label>
							`).join('')}
						</div>
					</div>
				</div>
			`;
		} else if (config.type === 'select') {
			const needsSearch = config.options.length > 5;
			const defaultValue = config.default || '';
			const defaultLabel = config.options.find(opt => opt === defaultValue) || 'Select an option';
			
			return `
				<div class="select-wrapper">
					<input type="hidden" 
						   name="${field}" 
						   class="select-value" 
						   value="${defaultValue}">
					<div class="select-dropdown">
						<div class="selected-options" data-default="Select an option">
							${defaultValue ? `<span class="selected-option">${defaultLabel}</span>` : 'Select an option'}
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
							${config.options.map(option => `
								<div class="select-option" 
									 data-value="${option}"
									 ${option === defaultValue ? 'data-selected="true"' : ''}>
									${option}
								</div>
							`).join('')}
						</div>
					</div>
				</div>
			`;
		} else if (config.type === 'textarea') {
			return `
				<textarea name="${field}" 
						  class="form-control" 
						  placeholder="${config.placeholder || ''}"
						  ${config.required ? 'required' : ''}>${config.default || ''}</textarea>
			`;
		} else {
			return `
				<input type="${config.type}" 
					   name="${field}" 
					   class="form-control"
					   placeholder="${config.placeholder || ''}"
					   value="${config.default || ''}"
					   ${config.required ? 'required' : ''}>
			`;
		}
	}

	/**
	 * Attaches event handlers for pasting external data.
	 * @param {HTMLFormElement} form - The form element.
	 */
    attachPasteHandlers(form) {
        const pasteArea = form.querySelector('#pasteArea');
        const pasteInput = form.querySelector('.paste-input');
        const previewArea = form.querySelector('.paste-preview');
        
        // Show/hide paste area
        form.querySelector('#showPasteArea').addEventListener('click', () => {
            pasteArea.style.display = 'block';
        });

        form.querySelector('.close-paste-area').addEventListener('click', () => {
            pasteArea.style.display = 'none';
        });

        // Clear paste area
        form.querySelector('.clear-paste').addEventListener('click', () => {
            pasteInput.value = '';
            previewArea.innerHTML = '';
        });

        // Handle pasted data
        pasteInput.addEventListener('paste', (e) => {
            // Short timeout to let the paste complete
            setTimeout(() => {
                const data = this.parsePastedData(pasteInput.value);
                if (data) {
                    this.showDataPreview(data, previewArea);
                }
            }, 0);
        });

        // Confirm and use pasted data
        form.querySelector('.confirm-paste').addEventListener('click', () => {
            const data = this.parsePastedData(pasteInput.value);
            if (data) {
                this.fillFormWithData(data);
                pasteArea.style.display = 'none';
                
                // Show success message
                const alert = document.createElement('div');
                alert.className = 'alert alert-success';
                alert.style.display = 'block';
                alert.textContent = 'Form filled with pasted data';
                this.container.insertBefore(alert, form);
                setTimeout(() => alert.remove(), 3000);
            }
        });
    }

	/**
	 * Parses the pasted data and maps it to form fields.
	 * @param {string} text - The pasted data as text.
	 * @returns {Object|null} - The mapped data or null if parsing fails.
	 */
	parsePastedData(text) {
		// Remove any trailing newlines
		
		// Try to detect the delimiter
		let values;
		if (text.includes('\t')) {
			// Keep empty values by not trimming during split
			values = text.split('\t');
		} else if (text.includes(',')) {
			// For CSV, still trim values as they might have extra spaces
			values = text.split(',').map(v => v.trim());
		} else {
			console.error('No valid delimiter found in pasted data');
			return null;
		}

		// Get the current form layout
		const formLayout = this.config.getFormLayout();
		
		// Filter out only the field items from the layout
		const fieldItems = formLayout
			.filter(item => item.type === 'field')
			.map(item => item.field);
		
		// Map the values to fields based on the form layout order
		const mappedData = {};
		const usedFields = new Set();
		
		// First, map values to fields in the form layout order
		fieldItems.forEach((field, layoutIndex) => {
			if (layoutIndex < values.length) {
				// Trim only when checking if value exists
				const value = values[layoutIndex];
				if (value && value.trim() !== '') {
					const fieldConfig = this.config.formConfig.get(field);
					if (fieldConfig) {
						mappedData[field] = this.processFieldValue(fieldConfig, value.trim());
						usedFields.add(field);
					}
				}
			}
		});

		// If we have more values, try to map remaining values to unused fields
/* 		if (values.length > fieldItems.length) {
			const remainingValues = values.slice(fieldItems.length);
			const allPossibleFields = Array.from(this.config.formConfig.keys());
			
			remainingValues.forEach((value) => {
				const trimmedValue = value.trim();
				if (trimmedValue !== '') {
					// Find a field that hasn't been used yet
					for (const field of allPossibleFields) {
						if (!usedFields.has(field)) {
							const fieldConfig = this.config.formConfig.get(field);
							if (fieldConfig) {
								mappedData[field] = this.processFieldValue(fieldConfig, trimmedValue);
								usedFields.add(field);
								break;
							}
						}
					}
				}
			});
		} */

		return mappedData;
	}
	
	/**
	 * Processes the field value based on the field configuration.
	 * @param {Object} fieldConfig - The field configuration.
	 * @param {string} value - The field value.
	 * @returns {string|string[]} - The processed field value.
	 */
	processFieldValue(fieldConfig, value) {
        if (fieldConfig.type === 'multiselect') {
            // Remove quotes and split on newlines
            const cleanValue = value.replace(/^"|"$/g, '').trim();
            if (!cleanValue) return [];
            
            // Just return the cleaned values directly since we're only using labels now
            return cleanValue.split('\n')
                .map(v => v.trim())
                .filter(v => v);
        } else if (fieldConfig.type === 'select') {
            // For select fields, just return the value directly
            return value.trim();
        } else {
            return value;
        }
    }

	/**
	 * Fills the form with the mapped data.
	 * @param {Object} data - The mapped data.
	 */
	// Replace the existing fillFormWithData method in the FormManager class with this implementation
	fillFormWithData(data) {
		if (!data || typeof data !== 'object') {
			console.error('Invalid data provided to fillFormWithData');
			return;
		}

		try {
			// Manually clear existing form inputs
			this.form.querySelectorAll('input:not([type="hidden"]), textarea').forEach(input => {
				if (input.type === 'checkbox') {
					input.checked = false;
				} else {
					input.value = '';
				}
			});

			// Remove any existing hidden edit entry input
			const existingEditInput = this.form.querySelector('input[name="editEntryId"]');
			if (existingEditInput) {
				existingEditInput.remove();
			}

			// Use the new resetCustomFields utility function
			resetCustomFields(this.form);
			

			Object.entries(data).forEach(([field, value]) => {
				const fieldConfig = this.config.formConfig.get(field);
				if (!fieldConfig) {
					console.warn(`No configuration found for field: ${field}`);
					return;
				}

				if (fieldConfig.type === 'multiselect') {
					const wrapper = this.form.querySelector(`[name="${field}"]`)?.closest('.multiselect-wrapper');
					if (wrapper) {
						const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
						const selectedDisplay = wrapper.querySelector('.selected-options');
						const selectedLabels = [];

						// Ensure value is an array
						const values = Array.isArray(value) ? value : 
									 (typeof value === 'string' ? value.split('\n').map(v => v.trim()).filter(v => v) : []);

						checkboxes.forEach(checkbox => {
							const isChecked = values.includes(checkbox.value);
							checkbox.checked = isChecked;

							if (isChecked) {
								const label = checkbox.closest('label').textContent.trim();
								selectedLabels.push(`<span class="selected-option">${label}</span>`);
							}
						});

						selectedDisplay.innerHTML = selectedLabels.join('') || 'Select options';
					}
				} else if (fieldConfig.type === 'select') {
					const wrapper = this.form.querySelector(`[name="${field}"]`)?.closest('.select-wrapper');
					if (wrapper) {
						const selectedDisplay = wrapper.querySelector('.selected-options');
						const hiddenInput = wrapper.querySelector('.select-value');
						const optionsList = wrapper.querySelector('.select-options-list');
						const options = optionsList.querySelectorAll('.select-option');

						// Clean up the value for comparison
						const cleanValue = typeof value === 'string' ? value.trim() : value;

						const matchingOption = Array.from(options)
							.find(opt => opt.dataset.value === cleanValue);

						if (matchingOption) {
							selectedDisplay.innerHTML = `<span class="selected-option">${matchingOption.textContent.trim()}</span>`;
							if (hiddenInput) {
								hiddenInput.value = cleanValue;
							}
						} else {
							// Reset to default if no match found
							selectedDisplay.innerHTML = selectedDisplay.dataset.default || '<span class="selected-option">Select an option</span>';
							if (hiddenInput) {
								hiddenInput.value = '';
							}
							console.warn(`Value '${cleanValue}' not found in options for field: ${field}`);
						}
					}
				} else if (fieldConfig.type === 'textarea') {
					const textarea = this.form.querySelector(`textarea[name="${field}"]`);
					if (textarea) {
						// Handle potential array or object values by converting to string
						if (typeof value === 'object') {
							textarea.value = JSON.stringify(value, null, 2);
						} else {
							textarea.value = value || '';
						}
					}
				} else {
					// Handle all other input types
					const input = this.form.querySelector(`input[name="${field}"]`);
					if (input) {
						// Handle different input types appropriately
						switch (input.type) {
							case 'number':
								input.value = value || 0;
								break;
							case 'date':
								// Ensure proper date format YYYY-MM-DD
								if (value) {
									const date = new Date(value);
									if (!isNaN(date)) {
										input.value = date.toISOString().split('T')[0];
									}
								}
								break;
							case 'checkbox':
								input.checked = Boolean(value);
								break;
							default:
								input.value = value || '';
						}
					}
				}
			});

			// Optional: Trigger change events for any dependent field logic
			this.form.dispatchEvent(new Event('formFilled', { bubbles: true }));

		} catch (error) {
			console.error('Error filling form with data:', error);
			
			// Show error message to user
			const alert = document.createElement('div');
			alert.className = 'alert alert-error';
			alert.style.display = 'block';
			alert.textContent = 'Error filling form with pasted data. Please check the format and try again.';
			this.form.parentElement.insertBefore(alert, this.form);
			setTimeout(() => alert.remove(), 3000);

			// Re-throw for higher-level error handling if needed
			throw error;
		}
	}

	/**
	 * Displays a preview of the mapped data.
	 * @param {Object} data - The mapped data.
	 * @param {HTMLElement} previewArea - The preview area element.
	 */
	  showDataPreview(data, previewArea) {
		let html = '<h4>Preview of Mapped Fields:</h4><div class="mapped-fields">';
		
		// Get form layout to maintain field order
		const formLayout = this.config.getFormLayout()
			.filter(item => item.type === 'field')
			.map(item => item.field);
		
		formLayout.forEach(field => {
			const fieldConfig = this.config.formConfig.get(field);
			if (fieldConfig) {
				const value = data[field] || '';
				html += `
					<div class="mapped-field">
						<strong>${fieldConfig.label}:</strong> ${value ? value : '<em>(empty)</em>'}
					</div>
				`;
			}
		});
		
		html += '</div>';
		previewArea.innerHTML = html;
	}

	/**
	 * Attaches event handlers for form actions.
	 * @param {HTMLFormElement} form - The form element.
	 */
	attachFormHandlers(form) {
	   // Clear form handler
	   form.querySelector('#clearForm')?.addEventListener('click', () => {
		   if (confirm('Are you sure you want to clear the form?')) {
			   form.reset();
			   const editInput = form.querySelector('input[name="editEntryId"]');
			   if (editInput) editInput.remove();
			   const submitBtn = form.querySelector('button[type="submit"]');
			   submitBtn.textContent = 'Add Entry';
		   }
	   });

	   // Export config handler
	   form.querySelector('#exportConfig')?.addEventListener('click', async () => {
		   try {
			   const storage = new StorageManager();
			   await storage.initializeDB();
			   const data = await storage.exportData();
			   const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			   const url = URL.createObjectURL(blob);
			   const a = document.createElement('a');
			   a.href = url;
			   a.download = 'errata-config.json';
			   document.body.appendChild(a);
			   a.click();
			   document.body.removeChild(a);
			   URL.revokeObjectURL(url);

			   const alert = document.createElement('div');
			   alert.className = 'alert alert-success';
			   alert.style.display = 'block';
			   alert.textContent = 'Configuration exported successfully';
			   this.container.insertBefore(alert, form);
			   setTimeout(() => alert.remove(), 3000);
		   } catch (error) {
			   console.error('Export error:', error);
			   const alert = document.createElement('div');
			   alert.className = 'alert alert-error';
			   alert.style.display = 'block';
			   alert.textContent = `Export failed: ${error.message}`;
			   this.container.insertBefore(alert, form);
			   setTimeout(() => alert.remove(), 3000);
		   }
	   });

	   // Import config handler
	   form.querySelector('#importConfig')?.addEventListener('click', () => {
		   const input = document.createElement('input');
		   input.type = 'file';
		   input.accept = '.json';
		   input.onchange = async (e) => {
			   try {
				   const file = e.target.files[0];
				   const text = await file.text();
				   const data = JSON.parse(text);
				   
				   if (!data.formConfig || !data.formLayout) {
					   throw new Error('Invalid import file: missing form configuration or layout');
				   }
				   
				   if (confirm('This will replace all current configuration and data. Continue?')) {
					   const storage = new StorageManager();
					   await storage.initializeDB();
					   
					   const alert = document.createElement('div');
					   alert.className = 'alert alert-info';
					   alert.style.display = 'block';
					   alert.textContent = 'Importing configuration...';
					   this.container.insertBefore(alert, form);
					   
					   await storage.importData(data);
					   
					   alert.className = 'alert alert-success';
					   alert.textContent = 'Configuration imported successfully. Reloading...';
					   
					   setTimeout(() => location.reload(), 1500);
				   }
			   } catch (error) {
				   console.error('Import error:', error);
				   const alert = document.createElement('div');
				   alert.className = 'alert alert-error';
				   alert.style.display = 'block';
				   alert.textContent = `Import failed: ${error.message}`;
				   this.container.insertBefore(alert, form);
				   setTimeout(() => alert.remove(), 3000);
			   }
		   };
		   input.click();
	   });
	   
		// Add select search handlers
		form.querySelectorAll('.select-wrapper').forEach(wrapper => {
			const dropdown = wrapper.querySelector('.select-dropdown');
			const options = wrapper.querySelector('.select-options');
			const optionsList = wrapper.querySelector('.select-options-list');
			const searchInput = wrapper.querySelector('.select-search input');
			const selectedDisplay = wrapper.querySelector('.selected-options');
			const hiddenInput = wrapper.querySelector('.select-value');

			// Toggle dropdown
			dropdown.addEventListener('click', (e) => {
				e.stopPropagation();
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

			// Close when clicking outside
			document.addEventListener('click', (e) => {
				if (!wrapper.contains(e.target)) {
					options.classList.remove('show');
					dropdown.classList.remove('active');
				}
			});

			// Search functionality
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

			// Option selection
			optionsList.addEventListener('click', (e) => {
				const option = e.target.closest('.select-option');
				if (option) {
					const value = option.dataset.value;
					const label = option.textContent.trim();

					selectedDisplay.innerHTML = `<span class="selected-option">${label}</span>`;
					if (hiddenInput) {
						hiddenInput.value = value;
					}

					options.classList.remove('show');
					dropdown.classList.remove('active');
				}
			});
		});
		
		// In the FormManager class, attachFormHandlers method
		form.querySelectorAll('.multiselect-wrapper').forEach(wrapper => {
			const dropdown = wrapper.querySelector('.multiselect-dropdown');
			const options = wrapper.querySelector('.multiselect-options');
			const selectedDisplay = wrapper.querySelector('.selected-options');
			const searchInput = wrapper.querySelector('.multiselect-search input');
			const optionsList = wrapper.querySelector('.options-list');

			dropdown.addEventListener('click', () => {
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
						if (text.includes(searchTerm)) {
							option.style.display = '';
						} else {
							option.style.display = 'none';
						}
					});
				});

				// Prevent dropdown from closing when clicking search
				searchInput.addEventListener('click', (e) => {
					e.stopPropagation();
				});
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
		});
		
		// In the attachFormHandlers method, update the form submit handler:

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(form);
			const editEntryId = formData.get('editEntryId');

			const storage = new StorageManager();
			await storage.initializeDB();

			try {
				if (editEntryId) {
					const entry = this.config.getEntry(editEntryId);
					
					// Handle all form fields including select and multiselect
					for (const [key, value] of formData.entries()) {
						if (key !== 'editEntryId') {
							const fieldConfig = this.config.formConfig.get(key);
							const wrapper = form.querySelector(`[name="${key}"]`)?.closest('.select-wrapper, .multiselect-wrapper');
							
							if (fieldConfig?.type === 'multiselect' && wrapper) {
								// Get all checked values for multiselect
								entry[key] = Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked'))
									.map(checkbox => checkbox.value);
							} else if (fieldConfig?.type === 'select' && wrapper) {
								// Get selected value for select
								const selectedOption = wrapper.querySelector('.selected-options .selected-option');
								entry[key] = selectedOption ? selectedOption.textContent.trim() : '';
							} else {
								entry[key] = value;
							}
						}
					}

					// Update entry in config
					this.config.updateEntry(editEntryId, entry);
					
					// Update in IndexedDB with await
					await storage.updateEntry(editEntryId, entry);
					
					const editInput = form.querySelector('input[name="editEntryId"]');
					if (editInput) editInput.remove();
					
					const submitBtn = form.querySelector('button[type="submit"]');
					submitBtn.textContent = 'Add Entry';
				} else {
					const entry = {
						id: crypto.randomUUID(),
						timestamp: new Date().toISOString()
					};

					// Handle all form fields including select and multiselect
					for (const [key, value] of formData.entries()) {
						if (key !== 'editEntryId') {
							const fieldConfig = this.config.formConfig.get(key);
							const wrapper = form.querySelector(`[name="${key}"]`)?.closest('.select-wrapper, .multiselect-wrapper');
							
							if (fieldConfig?.type === 'multiselect' && wrapper) {
								// Get all checked values for multiselect
								entry[key] = Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked'))
									.map(checkbox => checkbox.value);
							} else if (fieldConfig?.type === 'select' && wrapper) {
								// Get selected value for select
								const selectedOption = wrapper.querySelector('.selected-options .selected-option');
								entry[key] = selectedOption ? selectedOption.textContent.trim() : '';
							} else {
								entry[key] = value;
							}
						}
					}

					// Add to config
					this.config.entries.push(entry);    
					
					// Save to storage
					await storage.saveEntry(entry);                
				}

				form.reset();
				
				// Reset all multiselect and select displays
				form.querySelectorAll('.multiselect-wrapper .selected-options, .select-wrapper .selected-options').forEach(display => {
					display.innerHTML = display.dataset.default || 'Select an option';
				});
				
				document.dispatchEvent(new CustomEvent('entriesUpdated'));

				const alert = document.createElement('div');
				alert.className = 'alert alert-success';
				alert.style.display = 'block';
				alert.textContent = editEntryId ? 'Entry updated successfully' : 'Entry added successfully';
				this.container.insertBefore(alert, form);
				setTimeout(() => alert.remove(), 3000);
			} catch (error) {
				console.error('Error saving entry:', error);
				const alert = document.createElement('div');
				alert.className = 'alert alert-error';
				alert.style.display = 'block';
				alert.textContent = 'Error saving entry. Please try again.';
				this.container.insertBefore(alert, form);
				setTimeout(() => alert.remove(), 3000);
			}
		});
	
		// Handle form reset
		form.addEventListener('reset', (e) => {
			// Wait for the default reset behavior to complete
			setTimeout(() => {
				// Reset select fields to default values
				form.querySelectorAll('.select-wrapper').forEach(wrapper => {
					const field = wrapper.querySelector('.select-value').name;
					const fieldConfig = this.config.formConfig.get(field);
					const defaultValue = fieldConfig?.default || '';
					const selectedDisplay = wrapper.querySelector('.selected-options');
					const hiddenInput = wrapper.querySelector('.select-value');

					if (defaultValue) {
						const matchingOption = wrapper.querySelector(`.select-option[data-value="${defaultValue}"]`);
						if (matchingOption) {
							selectedDisplay.innerHTML = `<span class="selected-option">${matchingOption.textContent.trim()}</span>`;
							hiddenInput.value = defaultValue;
						}
					} else {
						selectedDisplay.textContent = selectedDisplay.dataset.default || 'Select an option';
						hiddenInput.value = '';
					}
				});

				// Reset multiselect fields to default values
				form.querySelectorAll('.multiselect-wrapper').forEach(wrapper => {
					const field = wrapper.querySelector('input[type="checkbox"]').name;
					const fieldConfig = this.config.formConfig.get(field);
					const defaultValues = Array.isArray(fieldConfig?.default) ? 
										fieldConfig.default : 
										fieldConfig?.default ? [fieldConfig.default] : [];
					
					const selectedDisplay = wrapper.querySelector('.selected-options');
					const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
					
					// Reset checkboxes to default state
					checkboxes.forEach(checkbox => {
						checkbox.checked = defaultValues.includes(checkbox.value);
					});

					// Update display
					const selectedOptions = Array.from(checkboxes)
						.filter(cb => cb.checked)
						.map(cb => {
							const label = cb.closest('label').textContent.trim();
							return `<span class="selected-option">${label}</span>`;
						});

					selectedDisplay.innerHTML = selectedOptions.join('') || '';
				});
			}, 0);
		});
	
	}
	
	attachCollapsibleHandler(form) {
		const header = form.querySelector('.collapsible-header');
		const content = form.querySelector('.collapsible-content');
		const chevron = header.querySelector('.chevron');

		header.addEventListener('click', () => {
			const isExpanded = header.getAttribute('aria-expanded') === 'true';
			header.setAttribute('aria-expanded', !isExpanded);
			content.style.display = isExpanded ? 'none' : 'block';
			chevron.textContent = isExpanded ? '▶' : '▼';
		});
	}
	/**
	 * Validates the form and returns an array of invalid fields.
	 * @returns {Array} - An array of invalid form fields.
	 */
	validateForm() {
		const form = this.form;
		const invalidFields = [];

		form.querySelectorAll('[required]').forEach(input => {
			const fieldConfig = this.config.formConfig.get(input.name);
			if (fieldConfig?.type === 'multiselect') {
				if (input.selectedOptions.length === 0) {
					invalidFields.push(input);
				}
			} else if (!input.value.trim()) {
				invalidFields.push(input);
			}
		});

		return invalidFields;
	}

}

/**
 * Resets custom select and multiselect fields in a form
 * @param {HTMLFormElement} form - The form containing the custom fields
 */
function resetCustomFields(form) {
    // Reset all select and multiselect dropdowns
    form.querySelectorAll('.select-wrapper, .multiselect-wrapper').forEach(wrapper => {
        const selectedDisplay = wrapper.querySelector('.selected-options');
        const hiddenInput = wrapper.querySelector('.select-value, input[type="hidden"]');
        const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
        
        // Determine if it's a multiselect or select based on checkboxes
        if (checkboxes.length) {
            // Multiselect reset
            checkboxes.forEach(cb => cb.checked = false);
            selectedDisplay.innerHTML = selectedDisplay.dataset.default || 'Select options';
        } else {
            // Select reset
            selectedDisplay.innerHTML = selectedDisplay.dataset.default || 'Select an option';
        }
        
        // Reset hidden input
        if (hiddenInput) {
            hiddenInput.value = '';
        }
    });
}

// Make classes globally available
window.ViewManager = ViewManager;
window.FormManager = FormManager;

/* 

This code consists of two main classes: `ViewManager` and `FormManager`. Let's go through each of them:

`ViewManager` class:
- The `ViewManager` class is responsible for managing the rendering and interaction of tabs and tables.
- It has methods for creating tabs, rendering tabs, updating row action positions, handling scroll events, attaching view action handlers, switching views, rendering tables, and attaching row action listeners.
- The `constructor` takes a `config` object and a `container` element as parameters and initializes various properties.
- The `createTab` method creates a tab element for a given table configuration.
- The `renderTabs` method renders the tabs based on the configuration.
- The `updateRowActionPositions` method updates the positions of row action elements.
- The `handleScroll` method handles the scroll event and updates the row action positions.
- The `attachViewActionHandlers` method attaches event handlers for view actions like clearing entries and exporting views.
- The `switchView` method switches the view to the specified table.
- The `renderTable` method renders the table for the specified table ID.
- The `attachRowActionListeners` method attaches event listeners for row actions like editing and deleting entries.
- The `editEntry` method allows editing an entry with the specified ID.
- The `deleteEntry` method deletes an entry with the specified ID.

`FormManager` class:
- The `FormManager` class is responsible for managing the rendering and interaction of the entry form.
- It has methods for rendering the form, rendering the form layout, rendering form controls, attaching paste handlers, parsing pasted data, processing field values, filling the form with data, showing data previews, attaching form handlers, and validating the form.
- The `constructor` takes a `config` object and a `container` element as parameters and initializes various properties.
- The `renderForm` method renders the entry form based on the configuration.
- The `renderFormLayout` method renders the form layout based on the configuration.
- The `renderFormControl` method renders the form control for a given field based on its configuration.
- The `attachPasteHandlers` method attaches event handlers for pasting external data.
- The `parsePastedData` method parses the pasted data and maps it to form fields.
- The `processFieldValue` method processes the field value based on the field configuration.
- The `fillFormWithData` method fills the form with the mapped data.
- The `showDataPreview` method displays a preview of the mapped data.
- The `attachFormHandlers` method attaches event handlers for form actions like clearing the form, exporting/importing configuration, and handling form submission.
- The `validateForm` method validates the form and returns an array of invalid fields.

The code also makes the `ViewManager` and `FormManager` classes globally available by attaching them to the `window` object.

Overall, this code provides functionality for managing and interacting with tabs, tables, and forms in a web application. It handles rendering, event handling, data management, and validation. */