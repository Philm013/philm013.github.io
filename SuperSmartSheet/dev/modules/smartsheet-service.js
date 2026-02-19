// smartsheet-service.js

/**
 * SmartSheetService class provides methods to interact with the Smartsheet API.
 */
class SmartSheetService {
    /**
     * Constructor for the SmartSheetService class.
     * @param {string} apiKey - The API key for authentication with the Smartsheet API.
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.smartsheet.com/2.0';
    }

    /**
     * Retrieves a sheet from Smartsheet using the sheet ID.
     * @param {string} sheetId - The ID of the sheet to retrieve.
     * @returns {Promise<object>} A promise that resolves to the sheet data.
     * @throws {Error} If there is an error fetching the sheet or if the sheet data structure is invalid.
     */
    async getSheet(sheetId) {
        try {
            // Make an API call to fetch the sheet data
            const response = await fetch(`${this.baseUrl}/sheets/${sheetId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Check if the response is not OK (status code not in the range 200-299)
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
            }

            // Parse the response data as JSON
            const data = await response.json();

            // Validate the sheet data structure
            if (!data || !data.columns) {
                throw new Error('Invalid sheet data structure');
            }

            // Return the sheet data
            return data;
        } catch (error) {
            console.error('Error fetching SmartSheet:', error);
            throw error;
        }
    }

    /**
     * Retrieves the columns of a sheet from Smartsheet using the sheet ID.
     * @param {string} sheetId - The ID of the sheet to retrieve columns from.
     * @returns {Promise<Array>} A promise that resolves to an array of column objects.
     * @throws {Error} If there is an error fetching the sheet columns.
     */
    async getSheetColumns(sheetId) {
        try {
            // Make an API call to fetch the sheet columns
            const response = await fetch(`${this.baseUrl}/sheets/${sheetId}?include=columnIds`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });

            // Check if the response is not OK (status code not in the range 200-299)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse the response data as JSON
            const data = await response.json();

            // Return the columns array or an empty array if it doesn't exist
            return data.columns || [];
        } catch (error) {
            throw new Error(`Failed to fetch sheet columns: ${error.message}`);
        }
    }

    /**
     * Maps a Smartsheet column type to a corresponding form field type.
     * @param {string} smartsheetType - The Smartsheet column type.
     * @param {object} column - The column object.
     * @returns {string} The mapped form field type.
     */
    mapColumnType(smartsheetType, column) {
        // If it's TEXT_NUMBER but has options, it's actually a multiselect
        if (smartsheetType === 'TEXT_NUMBER' && column.options?.length > 0) {
            return 'multiselect';
        }

        // If it's a checkbox, make it a select with true/false options
        if (smartsheetType === 'CHECKBOX') {
            return 'select';
        }

        // Default type mapping
        const typeMap = {
            'TEXT_NUMBER': 'text',
            'DATE': 'date',
            'PICKLIST': 'select',
            'CONTACT_LIST': 'text',
            'EMAIL': 'email'
        };

        // Return the mapped type or 'text' if the type is not found in the map
        return typeMap[smartsheetType] || 'text';
    }

    /**
     * Converts a Smartsheet column to a form field configuration object.
     * @param {object} column - The Smartsheet column object.
     * @returns {object} The form field configuration object.
     */
    convertToFormField(column) {
    // Get the mapped field type based on the column type
    const fieldType = this.mapColumnType(column.type, column);
    
    // Check if the field already exists in the configuration
    const existingConfig = DEFAULT_FORM_CONFIG.get(column.title.toLowerCase());
    
    // Create the field configuration object
    const fieldConfig = existingConfig ? { ...existingConfig } : {
        type: fieldType,
        label: column.title,
        required: false,
        placeholder: `Enter ${column.title}`,
        options: [],
        default: ''
    };

    // Update type if Smartsheet suggests a different type
    if (fieldType !== fieldConfig.type) {
        fieldConfig.type = fieldType;
    }

    // Update options
    if (column.options && column.options.length > 0) {
        // Merge or replace options
        fieldConfig.options = column.options;
    }

    // Handle checkbox specific case
    if (fieldType === 'select' && column.type === 'CHECKBOX') {
        fieldConfig.options = ['True', 'False'];
    }

    // Ensure the field is added to the configuration
    DEFAULT_FORM_CONFIG.set(column.title.toLowerCase(), fieldConfig);

    return fieldConfig;
}


}

// Attach the SmartSheetService class to the global window object
window.SmartSheetService = SmartSheetService;