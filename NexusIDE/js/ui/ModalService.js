/**
 * @file ModalService.js
 * @description Provides a high-level API for triggering standard UI dialogs (alerts, confirmations, and prompts).
 */

/**
 * Service for managing the application's global modal system.
 * Returns Promises for confirmation and prompt actions.
 */
export class ModalService {
    /**
     * Creates a new ModalService instance.
     */
    constructor() {
        this.dialog = document.getElementById('modal-dialog');
        this.title = document.getElementById('dialog-title');
        this.msg = document.getElementById('dialog-msg');
        this.inputContainer = document.getElementById('dialog-input-container');
        this.input = document.getElementById('dialog-input');
        this.actions = document.getElementById('dialog-actions');
    }

    /**
     * Displays a simple alert dialog with an OK button.
     * @param {string} title 
     * @param {string} message 
     * @returns {Promise<void>}
     */
    async alert(title, message) {
        return new Promise(resolve => {
            this.show(title, message);
            this.actions.innerHTML = `
                <button class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">OK</button>
            `;
            this.actions.firstElementChild.onclick = () => {
                this.hide();
                resolve();
            };
        });
    }

    /**
     * Displays a confirmation dialog with Cancel and Confirm buttons.
     * @param {string} title 
     * @param {string} message 
     * @returns {Promise<boolean>} Resolves to true if Confirm was clicked, false otherwise.
     */
    async confirm(title, message) {
        return new Promise(resolve => {
            this.show(title, message);
            this.actions.innerHTML = `
                <button id="confirm-cancel" class="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold">Cancel</button>
                <button id="confirm-ok" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Confirm</button>
            `;
            document.getElementById('confirm-cancel').onclick = () => { this.hide(); resolve(false); };
            document.getElementById('confirm-ok').onclick = () => { this.hide(); resolve(true); };
        });
    }

    /**
     * Displays a prompt dialog with a text input.
     * @param {string} title 
     * @param {string} message 
     * @param {string} [defaultValue=''] 
     * @returns {Promise<string|null>} Resolves to the input string or null if cancelled.
     */
    async prompt(title, message, defaultValue = '') {
        return new Promise(resolve => {
            this.show(title, message, true);
            this.input.value = defaultValue;
            this.actions.innerHTML = `
                <button id="prompt-cancel" class="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold">Cancel</button>
                <button id="prompt-ok" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">OK</button>
            `;
            document.getElementById('prompt-cancel').onclick = () => { this.hide(); resolve(null); };
            document.getElementById('prompt-ok').onclick = () => {
                const val = this.input.value;
                this.hide();
                resolve(val);
            };
        });
    }

    /**
     * Internal method to display the modal base.
     * @private
     */
    show(title, message, hasInput = false) {
        this.title.textContent = title;
        this.msg.textContent = message;
        this.inputContainer.classList.toggle('hidden', !hasInput);
        this.dialog.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    /**
     * Internal method to hide the modal.
     * @private
     */
    hide() {
        this.dialog.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }
}
