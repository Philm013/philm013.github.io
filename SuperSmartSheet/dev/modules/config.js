// Core Configuration Module
// Defines constants and a ConfigManager class for managing application configuration

// FIELD_SIZES: Object defining CSS classes for different field sizes
// - full: Takes up full width
// - half: Takes up half width 
// - third: Takes up one-third width
// - quarter: Takes up one-quarter width
const FIELD_SIZES = {
    full: 'form-group col-span-12',    
    half: 'form-group col-span-6',     
    third: 'form-group col-span-4',    
    quarter: 'form-group col-span-3'   
};


// DEFAULT_FORM_LAYOUT: Default form layout configuration
const DEFAULT_FORM_LAYOUT = [
    { type: 'field', field: 'component', size: 'half' },
    { type: 'field', field: 'grade', size: 'quarter' },
    { type: 'field', field: 'chapter', size: 'quarter' },
    { type: 'field', field: 'lesson', size: 'quarter' },
    { type: 'field', field: 'page', size: 'quarter' },
    { type: 'field', field: 'section', size: 'half' },
    { type: 'field', field: 'type_of_error', size: 'half' },
    { type: 'field', field: 'correction', size: 'full' }
];

// DEFAULT_FORM_CONFIG: Default form field configurations
const DEFAULT_FORM_CONFIG = new Map([
    ['component', {
        type: 'select',
        label: 'Component',
        required: true,
        options: [
            'Student Edition',
            'Teacher Edition',
            'Workbook',
            'Assessment',
            'Digital'
        ]
    }],
    ['grade', {
        type: 'select',
        label: 'Grade',
        required: true,
        options: ['K', '1', '2', '3', '4', '5']
    }],
    ['chapter', {
        type: 'number',
        label: 'Chapter',
        required: false,
        placeholder: 'Enter chapter number'
    }],
    ['lesson', {
        type: 'number',
        label: 'Lesson',
        required: false,
        placeholder: 'Enter lesson number'
    }],
    ['page', {
        type: 'text',
        label: 'Page',
        required: false,
        placeholder: 'Enter page number'
    }],
    ['section', {
        type: 'select',
        label: 'Section',
        required: false,
        options: [
            'COVER, Hardcover SE',
            'COVER, Softcover SE',
            'COVER, TE',
            'Title Page',
            'Copyright Page',
            'Contributors',
            'Table of Contents',
            'Chapter Interleaf',
            'Lesson Interleaf',
            'Chapter Launch',
            'Chapter Preview',
            'Dual Language Spread',
            'Page Keeley',
            'ENGAGE/EXPLORE',
            'EXPLAIN',
            'INFOGRAPHIC',
            'ELABORATE',
            'EVALUATE',
            'Chapter Wrap-Up',
            'Hands-On Investigation',
            'Glossary',
            'Index',
            'TEKS Assessment Guide: EOY Test',
            'Program Resources > Teacher',
            'Program Resources > Student',
            'Chapter 1: CER',
            'Chapter 1: Descriptive Investigations',
            'Chapter 1: Engineering Design Process',
            'Chapter 1: Tools and Safety',
            'Chapter 1: BYS',
            'Chapter 1: Infographic',
            'Chapter 1: Models and Visuals',
            'Chapter 1: Data Literacy',
            'Chapter 1: Research and Communication',
            'Chapter 1: RTC',
            'Chapter 1: STEM Connection',
            'Chapter 1: Am I Ready?',
            'Chapter 1: Chapter Review',
            'Paragraph 1',
            'Paragraph 2',
            'Paragraph 3',
            'Paragraph 4',
            'Paragraph 5'
        ]
    }],
    ['type_of_error', {
        type: 'multiselect',
        label: 'Type of Error',
        required: true,
        options: [
            'Global',
            'Accessibility Issue/Violation',
            'Anno',
            'Art',
            'Christine Query for AD',
            'Concerned Vendor, Must Replace',
            'Conflicts with SE content',
            'Copyright/Trademark Issue',
            'Design/Layout',
            'Disclaimer',
            'Error to Reported Page',
            'Asset Title Incorrect',
            'Footer Typo',
            'Folio Error',
            'Grammar',
            'HOI Grouping',
            'HOI Materials',
            'Icon',
            'Lexile Correction',
            'Mandatory TEA Edit - November 2023',
            'Mandatory October Correction - TEKS',
            'Mandatory October Correction - OTHER',
            'Media Thumbnail',
            'Missing Text',
            'Missing Design Element',
            'Photo',
            'Redux (Incorrect)',
            'Reworded Awkward/Confusing Language',
            'Removed/Replaced Duplicate Content/Typo',
            'Science Error',
            'Sensitive Topic',
            'Spanish Only Correction for Se-bue',
            'Spelling Error',
            'Style Inconsistency',
            'TEKS Alignment',
            'Text Revision',
            'Trademark Issue',
            'Typo',
            'Update Instructional Time',
            'Updated Video Time',
            'Vocab',
            'Digital Only',
            'OLP Glitch'
        ]
    }],
    ['correction', {
        type: 'textarea',
        label: 'Correction',
        required: true,
        placeholder: 'Enter correction details'
    }]
]);

// DEFAULT_TABLES: Default table configurations
const DEFAULT_TABLES = [
    {
        id: 'default',
        name: 'Default View',
        columns: [
            { field: 'component', label: 'Component' },
            { field: 'grade', label: 'Grade' },
            { field: 'chapter', label: 'Chapter' },
            { field: 'page', label: 'Page' },
            { field: 'type_of_error', label: 'Type of Error' },
            { field: 'correction', label: 'Correction' }
        ],
        order: [{ field: 'timestamp', direction: 'desc' }],
        filters: [], // Initialize as empty array instead of functions
        copyFormat: 'tab-delimited', // Store as string instead of function
        visible: true
    },
    {
        id: 'minimal',
        name: 'Minimal View',
        columns: [
            { field: 'correction', label: 'Correction' }
        ],
        order: [],
        filters: [],
        copyFormat: 'tab-delimited',
        visible: true
    },
    {
        id: 'full',
        name: 'Full View',
        columns: [
            { field: 'component', label: 'Component' },
            { field: 'grade', label: 'Grade' },
            { field: 'chapter', label: 'Chapter' },
            { field: 'lesson', label: 'Lesson' },
            { field: 'page', label: 'Page' },
            { field: 'section', label: 'Section' },
            { field: 'errorType', label: 'Error Type' },
            { field: 'correction', label: 'Correction' }
        ],
        order: [],
        filters: [],
        copyFormat: 'tab-delimited',
        visible: true
    }
];

// ConfigManager class: Manages application configuration
class ConfigManager {
    constructor() {
        // Initialize properties
        this.tables = new Map();        // Map to store table configurations
        this.tableOrder = [];           // Array to store table order
        this.formConfigformConfig = new Map();    // Map to store form field configurations
        this.formLayout = [];           // Array to store form layout
        this.currentViewId = null;      // Stores the current view ID
        this.entries = [];              // Array to store data entries
    }

    // setFormLayout: Sets the form layout
    setFormLayout(layout) {
        this.formLayout = layout;
    }

    // getFormLayout: Retrieves the form layout
    // If no layout is set, generates a default layout based on form configuration
    getFormLayout() {
        if (!this.formLayout || this.formLayout.length === 0) {
            return DEFAULT_FORM_LAYOUT;
        }
        return this.formLayout;
    }

    // setFormConfig: Sets the form configuration
    setFormConfig(config) {
        this.formConfig = config;
    }
mergeFieldConfig(existingConfig, newConfig) {
        // Start with a clean slate
        const mergedConfig = {
            type: newConfig.type || existingConfig.type,
            label: newConfig.label || existingConfig.label,
            required: newConfig.required ?? existingConfig.required,
            placeholder: newConfig.placeholder || existingConfig.placeholder,
            options: [],
            default: newConfig.default ?? existingConfig.default,
            // Add smartsheet flag and metadata
            isSmartSheetField: true,
            smartsheet: newConfig.smartsheet || {}
        };

        // Handle options merging based on field type
        if (mergedConfig.type === 'select' || mergedConfig.type === 'multiselect') {
            // If new config has options, use those; otherwise keep existing
            mergedConfig.options = newConfig.options?.length ? 
                [...newConfig.options] : 
                [...(existingConfig.options || [])];
        }

        // Preserve any additional properties from new config
        Object.keys(newConfig).forEach(key => {
            if (!mergedConfig.hasOwnProperty(key)) {
                mergedConfig[key] = newConfig[key];
            }
        });

        return mergedConfig;
    }

    addField(fieldKey, fieldConfig) {
        // Validate required properties
        if (!fieldKey || !fieldConfig.type || !fieldConfig.label) {
            throw new Error('Field requires key, type, and label');
        }

        // Validate field type
        const validTypes = ['text', 'number', 'select', 'multiselect', 'textarea', 'date', 'email', 'tel', 'url'];
        if (!validTypes.includes(fieldConfig.type)) {
            throw new Error('Invalid field type');
        }

        let finalConfig;
        
        if (this.formConfig.has(fieldKey)) {
            const existingConfig = this.formConfig.get(fieldKey);
            // If the new config is from SmartSheet, do a complete override
            if (fieldConfig.smartsheet) {
                finalConfig = this.mergeFieldConfig(existingConfig, fieldConfig);
            } else {
                // For non-SmartSheet updates, use existing merge logic
                finalConfig = { ...existingConfig, ...fieldConfig };
            }
        } else {
            // Add default properties for new fields
            const defaultConfig = {
                required: false,
                placeholder: '',
                options: [],
                default: ''
            };
            finalConfig = { ...defaultConfig, ...fieldConfig };
        }

        // Validate options for select and multiselect types
        if ((finalConfig.type === 'select' || finalConfig.type === 'multiselect') && 
            (!Array.isArray(finalConfig.options) || finalConfig.options.length === 0)) {
            throw new Error(`${finalConfig.type} field requires options`);
        }

        this.formConfig.set(fieldKey, finalConfig);

        // Add to layout if not already present
        if (!this.formLayout.some(item => item.type === 'field' && item.field === fieldKey)) {
            this.formLayout.push({
                type: 'field',
                field: fieldKey,
                size: 'half'
            });
        }

        return fieldKey;
    }


    // updateField: Updates an existing field in the form configuration
    updateField(fieldKey, updates) {
        if (!this.formConfig.has(fieldKey)) {
            throw new Error('Field does not exist');
        }

        const currentConfig = this.formConfig.get(fieldKey);
        const updatedConfig = { ...currentConfig, ...updates };

        // Validate field type if changed
        if (updates.type) {
            const validTypes = ['text', 'number', 'select', 'multiselect', 'textarea', 'date', 'email', 'tel', 'url'];
            if (!validTypes.includes(updates.type)) {
                throw new Error('Invalid field type');
            }
        }

        // Validate that there are options for selectand multiselect type
		if ((updatedConfig.type === 'select' || updatedConfig.type === 'multiselect') && 
			(!Array.isArray(updatedConfig.options) || updatedConfig.options.length === 0)) {
			throw new Error(`${updatedConfig.type} field requires options`);
		}


        this.formConfig.set(fieldKey, updatedConfig);
    }

    // deleteField: Deletes a field from the form configuration
    deleteField(fieldKey) {
        if (!this.formConfig.has(fieldKey)) {
            throw new Error('Field does not exist');
        }

        // Remove from form config
        this.formConfig.delete(fieldKey);

        // Remove from layout
        this.formLayout = this.formLayout.filter(item => 
            !(item.type === 'field' && item.field === fieldKey)
        );

        // Remove from all table configurations
        this.tables.forEach(table => {
            table.columns = table.columns.filter(col => col.field !== fieldKey);
        });

        // Remove from all entries
        this.entries.forEach(entry => {
            delete entry[fieldKey];
        });
    }

    // getField: Retrieves a field configuration by key
    getField(fieldKey) {
        return this.formConfig.get(fieldKey);
    }

    // getAllFields: Retrieves all field configurations
    getAllFields() {
        return Array.from(this.formConfig.entries()).map(([key, config]) => ({
            key,
            ...config
        }));
    }

    // getAllTables: Retrieves all table configurations
    getAllTables() {
        if (this.tableOrder.length === 0) {
            return Array.from(this.tables.values());
        }
        return this.tableOrder
            .map(id => this.tables.get(id))
            .filter(table => table); // Filter out any missing tables
    }

    // setTableOrder: Sets the order of tables
    setTableOrder(order) {
        this.tableOrder = order;
    }

    // addTable: Adds a new table configuration
    addTable(config) {
        const tableId = config.id || crypto.randomUUID();
        const tableConfig = {
            id: tableId,
            name: config.name,
            columns: config.columns,
            order: config.order || [],
            filters: [],
            visible: config.visible !== undefined ? config.visible : true,
            copyFormat: 'tab-delimited',
            // Ensure smartsheet property is always initialized
            smartsheet: config.smartsheet || {
                sheetId: null,
                lastSync: null
            }
        };

        this.tables.set(tableId, tableConfig);

        // Add to order if not already present
        if (!this.tableOrder.includes(tableId)) {
            this.tableOrder.push(tableId);
        }

        return tableId;
    }

    // getTable: Retrieves a table configuration by ID
    getTable(id) {
        const table = this.tables.get(id);
        if (table) {
            return {
                ...table,
                copyFormat: this.getCopyFormatter(table.copyFormat)
            };
        }
        return null;
    }

    // getCopyFormatter: Retrieves a copy formatter function based on the format
    getCopyFormatter(format) {
        return (entry) => {
            return Object.entries(entry).map(([key, value]) => {
                const fieldConfig = this.formConfig.get(key);
                if (fieldConfig?.type === 'multiselect' && Array.isArray(value)) {
                    // Format multiselect values with quotes and newlines
                    return `"${value.join('\n')}"`;
                } else if (fieldConfig?.type === 'select') {
                    // Handle select values - wrap in quotes if they contain commas or tabs
                    return value.includes(',') || value.includes('\t') ? `"${value}"` : value;
                }
                return value;
            }).join(format === 'tab-delimited' ? '\t' : ',');
        };
    }

    // updateEntry: Updates an existing entry in the entries array
    updateEntry(entryId, updates) {
        const index = this.entries.findIndex(e => e.id === entryId);
        if (index !== -1) {
            this.entries[index] = { ...this.entries[index], ...updates };
            return true;
        }
        return false;
    }

    // deleteEntry: Deletes an entry from the entries array
    deleteEntry(entryId) {
        const index = this.entries.findIndex(e => e.id === entryId);
        if (index !== -1) {
            this.entries.splice(index, 1);
            return true;
        }
        return false;
    }

    // getEntry: Retrieves an entry from the entries array by ID
    getEntry(entryId) {
        return this.entries.find(e => e.id === entryId);
    }

    // duplicateTable: Duplicates a table configuration
    duplicateTable(tableId) {
        const sourceTable = this.tables.get(tableId);
        if (sourceTable) {
            const newTable = {
                ...sourceTable,
                id: crypto.randomUUID(),
                name: `${sourceTable.name} (Copy)`
            };
            return this.addTable(newTable);
        }
        return null;
    }

    // exportConfig: Exports the current configuration
    exportConfig() {
        return {
            tables: Array.from(this.tables.entries()),
            formConfig: Array.from(this.formConfig.entries()),
            formLayout: this.formLayout
        };
    }

    // importConfig: Imports a configuration
    importConfig(config) {
        if (config.tables) {
            this.tables = new Map(config.tables);
        }
        if (config.formConfig) {
            this.formConfig = new Map(config.formConfig);
        }
        if (config.formLayout) {
            this.formLayout = config.formLayout;
        }
    }

}

// Make the constants and ConfigManager class globally available
window.ConfigManager = ConfigManager;
window.DEFAULT_FORM_CONFIG = DEFAULT_FORM_CONFIG;
window.DEFAULT_TABLES = DEFAULT_TABLES;
window.FIELD_SIZES = FIELD_SIZES;



/* This code defines a configuration module for managing application settings. Here's a summary of the key components:

- `FIELD_SIZES`: An object that defines CSS classes for different field sizes (full, half, third, quarter).

- `ConfigManager`: A class that manages the application configuration. It provides methods for managing form fields, form layout, tables, entries, and synchronization with SmartSheet.

- `DEFAULT_FORM_LAYOUT`: A constant that defines the default form layout configuration.

- `DEFAULT_FORM_CONFIG`: A constant that defines the default form field configurations.

- `DEFAULT_TABLES`: A constant that defines the default table configurations.

The code makes the `ConfigManager` class and the constants globally available by attaching them to the `window` object.

Overall, this configuration module provides a centralized way to manage and manipulate application settings, including form fields, tables, and data entries. It also provides functionality for synchronizing data with SmartSheet using the `syncWithSmartSheet` method. */