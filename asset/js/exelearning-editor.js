/**
 * eXeLearning Editor Modal Handler for Omeka S
 *
 * Opens the editor page in a fullscreen modal for editing .elpx files.
 */
(function() {
    'use strict';

    var ExeLearningEditor = {
        modal: null,
        iframe: null,
        saveBtn: null,
        closeBtn: null,
        currentMediaId: null,
        isOpen: false,
        isSaving: false,

        /**
         * Initialize the editor.
         */
        init: function() {
            this.modal = document.getElementById('exelearning-editor-modal');
            this.iframe = document.getElementById('exelearning-editor-iframe');
            this.saveBtn = document.getElementById('exelearning-editor-save');
            this.closeBtn = document.getElementById('exelearning-editor-close');

            if (this.modal) {
                this.bindEvents();
            }
        },

        /**
         * Bind event handlers.
         */
        bindEvents: function() {
            var self = this;

            this.saveBtn?.addEventListener('click', () => self.requestSave());
            this.closeBtn?.addEventListener('click', () => self.close());
            window.addEventListener('message', (event) => self.handleMessage(event));
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && self.isOpen) {
                    self.close();
                }
            });
        },

        /**
         * Request save from the iframe.
         */
        requestSave: function() {
            if (this.isSaving || !this.iframe) {
                return;
            }

            var iframeWindow = this.iframe.contentWindow;
            if (iframeWindow) {
                iframeWindow.postMessage({ type: 'exelearning-request-save' }, '*');
            }
        },

        /**
         * Set saving state and update button.
         *
         * @param {boolean} saving Whether save is in progress.
         */
        setSavingState: function(saving) {
            this.isSaving = saving;
            if (this.saveBtn) {
                this.saveBtn.disabled = saving;
                this.saveBtn.textContent = saving ? 'Saving...' : 'Save to Omeka';
            }
        },

        /**
         * Open the editor modal.
         *
         * @param {number} mediaId The media ID.
         * @param {string} editorUrl The editor URL.
         */
        open: function(mediaId, editorUrl) {
            if (!mediaId || !editorUrl) {
                console.error('ExeLearningEditor: Missing mediaId or editorUrl');
                return;
            }

            this.currentMediaId = mediaId;

            if (this.modal && this.iframe) {
                this.modal.style.display = 'flex';
                this.isOpen = true;
                this.iframe.src = editorUrl;
                document.body.classList.add('exelearning-editor-open');
            } else {
                // Fallback: open in new window
                window.open(editorUrl, '_blank', 'width=1200,height=800');
            }
        },

        /**
         * Close the editor modal.
         */
        close: function() {
            if (!this.isOpen) {
                return;
            }

            // Hide modal
            if (this.modal) {
                this.modal.style.display = 'none';
            }
            this.isOpen = false;

            // Clear iframe
            if (this.iframe) {
                this.iframe.src = 'about:blank';
            }

            // Remove body class
            document.body.classList.remove('exelearning-editor-open');

            // Reset state
            this.currentMediaId = null;
        },

        /**
         * Handle messages from iframe.
         *
         * @param {MessageEvent} event The message event.
         */
        handleMessage: function(event) {
            var data = event.data;

            if (!data || !data.type) {
                return;
            }

            switch (data.type) {
                case 'exelearning-bridge-ready':
                    // Bridge is ready
                    console.log('ExeLearningEditor: Bridge ready');
                    break;

                case 'exelearning-save-start':
                    this.setSavingState(true);
                    break;

                case 'exelearning-save-complete':
                    this.setSavingState(false);
                    this.onSaveComplete(data);
                    break;

                case 'exelearning-save-error':
                    this.setSavingState(false);
                    console.error('ExeLearningEditor: Save failed -', data.message || 'Unknown error');
                    break;

                case 'exelearning-close':
                    this.close();
                    break;
            }
        },

        /**
         * Handle save complete.
         *
         * @param {object} data The message data.
         */
        onSaveComplete: function(data) {
            // Close the modal
            this.close();

            // Reload the page to show updated content
            window.location.reload();
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            ExeLearningEditor.init();
        });
    } else {
        ExeLearningEditor.init();
    }

    // Expose globally
    window.ExeLearningEditor = ExeLearningEditor;

})();
