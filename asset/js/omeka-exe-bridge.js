/**
 * Omeka-S eXeLearning Bridge
 *
 * Connects the static eXeLearning editor with Omeka-S for:
 * - Loading ELP files from the media library
 * - Saving edited files back to Omeka-S
 * - Communication between iframe and parent window
 */
(function() {
    'use strict';

    const config = window.__OMEKA_EXE_CONFIG__;
    if (!config) {
        console.error('[Omeka-EXE Bridge] Configuration not found');
        return;
    }

    // Helper: Get bridge instance from available sources
    function getBridgeInstance() {
        return window.YjsModules?.getBridge?.()
            || window.eXeLearning?.app?.project?.bridge;
    }

    // Helper: Send message to parent window
    function notifyParent(message) {
        if (window.parent !== window) {
            window.parent.postMessage(message, '*');
        }
    }

    /**
     * Wait for the eXeLearning app to be ready.
     * @param {number} maxAttempts Maximum attempts before failing
     * @returns {Promise<object>} The eXeLearning app instance
     */
    function waitForApp(maxAttempts = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                if (window.eXeLearning && window.eXeLearning.app) {
                    resolve(window.eXeLearning.app);
                } else if (attempts < maxAttempts) {
                    setTimeout(check, 100);
                } else {
                    reject(new Error('eXeLearning app did not initialize'));
                }
            };
            check();
        });
    }

    /**
     * Wait for the YJS bridge to be ready.
     * @param {number} maxAttempts Maximum attempts before giving up
     * @returns {Promise<object|null>} The bridge instance or null
     */
    function waitForBridge(maxAttempts = 100) {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                const bridge = getBridgeInstance();
                if (bridge?.initialized || bridge?.structureBinding) {
                    resolve(bridge);
                } else if (attempts < maxAttempts) {
                    setTimeout(check, 200);
                } else {
                    resolve(null);
                }
            };
            check();
        });
    }

    /**
     * Import an ELP file from Omeka-S.
     */
    async function importElpFromOmeka() {
        const elpUrl = config.elpUrl;
        if (!elpUrl) {
            console.log('[Omeka-EXE Bridge] No ELP URL provided, starting with empty project');
            return;
        }

        console.log('[Omeka-EXE Bridge] Starting import from:', elpUrl);

        try {
            const bridge = await waitForBridge();
            if (!bridge) {
                throw new Error('Project bridge not available');
            }

            // Fetch the ELP file
            const response = await fetch(elpUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const filename = elpUrl.split('/').pop().split('?')[0] || 'project.elpx';
            const file = new File([blob], filename, { type: 'application/zip' });

            // Import using YjsProjectBridge
            await bridge.importFromElpx(file, {
                clearExisting: true,
                onProgress: (progress) => {
                    console.log('[Omeka-EXE Bridge] Import progress:', progress);
                }
            });

            console.log('[Omeka-EXE Bridge] ELP imported successfully');
            showNotification('success', config.i18n?.loading || 'Project loaded');
        } catch (error) {
            console.error('[Omeka-EXE Bridge] Import failed:', error);
            showNotification('error', 'Error loading project: ' + error.message);
        }
    }

    /**
     * Save the current project to Omeka-S.
     */
    async function saveToOmeka() {
        notifyParent({ type: 'exelearning-save-start' });
        showNotification('info', config.i18n?.saving || 'Saving...');

        try {
            const bridge = getBridgeInstance();
            if (!bridge) {
                throw new Error('Project bridge not available');
            }

            // Export to ELPX blob
            let blob;
            if (window.SharedExporters?.createExporter) {
                const exporter = window.SharedExporters.createExporter(
                    'elpx',
                    bridge.documentManager,
                    bridge.assetCache,
                    bridge.resourceFetcher,
                    bridge.assetManager
                );
                const result = await exporter.export();
                if (!result.success || !result.data) {
                    throw new Error('Export failed');
                }
                blob = new Blob([result.data], { type: 'application/zip' });
            } else if (window.ElpxExporter) {
                const exporter = new window.ElpxExporter(bridge);
                const result = await exporter.export();
                blob = new Blob([result], { type: 'application/zip' });
            } else {
                throw new Error('No exporter available');
            }

            // Upload to Omeka-S
            const formData = new FormData();
            formData.append('file', blob, 'project.elpx');
            if (config.csrfToken) {
                formData.append('csrf', config.csrfToken);
            }

            const response = await fetch(config.saveEndpoint, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showNotification('success', config.i18n?.saved || 'Saved successfully!');
                notifyParent({
                    type: 'exelearning-save-complete',
                    mediaId: config.mediaId,
                    previewUrl: result.preview_url
                });
            } else {
                throw new Error(result.message || 'Save failed');
            }
        } catch (error) {
            console.error('[Omeka-EXE Bridge] Save failed:', error);
            showNotification('error', (config.i18n?.error || 'Error') + ': ' + error.message);
            notifyParent({ type: 'exelearning-save-error', message: error.message });
        }
    }

    /**
     * Show a notification to the user.
     * @param {string} type 'success', 'error', or 'info'
     * @param {string} message The message to display
     */
    function showNotification(type, message) {
        // Remove existing notification
        const existing = document.getElementById('omeka-exe-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'omeka-exe-notification';
        notification.className = `omeka-exe-notification omeka-exe-notification--${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-hide after 3 seconds (except for 'info' which stays until replaced)
        if (type !== 'info') {
            setTimeout(() => {
                notification.classList.add('omeka-exe-notification--fade');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    /**
     * Add a "Save to Omeka" button to the editor toolbar.
     */
    function addSaveButton() {
        // Wait for the toolbar to exist
        const checkToolbar = setInterval(() => {
            const toolbar = document.querySelector('#head-top-buttons, .exe-toolbar, .toolbar-buttons');
            if (toolbar) {
                clearInterval(checkToolbar);

                // Check if button already exists
                if (document.getElementById('omeka-save-button')) {
                    return;
                }

                const saveButton = document.createElement('button');
                saveButton.id = 'omeka-save-button';
                saveButton.type = 'button';
                saveButton.className = 'btn btn-primary';
                saveButton.innerHTML = '<i class="fas fa-save"></i> ' + (config.i18n?.saveButton || 'Save to Omeka');
                saveButton.style.cssText = 'margin-left: 10px; background: #4caf50; border: none; padding: 8px 16px; border-radius: 4px; color: white; cursor: pointer;';

                saveButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    saveToOmeka();
                });

                toolbar.appendChild(saveButton);
                console.log('[Omeka-EXE Bridge] Save button added to toolbar');
            }
        }, 500);

        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkToolbar), 30000);
    }

    /**
     * Initialize the bridge.
     */
    async function init() {
        try {
            await waitForApp();
            console.log('[Omeka-EXE Bridge] App ready');

            // Import the ELP file if URL provided
            if (config.elpUrl) {
                await importElpFromOmeka();
            }

            // Add save button to toolbar
            addSaveButton();

            // Notify parent window that bridge is ready
            notifyParent({ type: 'exelearning-bridge-ready' });

            // Listen for Ctrl+S / Cmd+S
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveToOmeka();
                }
            });

            // Listen for messages from parent window
            window.addEventListener('message', (event) => {
                if (event.data?.type === 'exelearning-request-save') {
                    saveToOmeka();
                }
            });

            console.log('[Omeka-EXE Bridge] Initialization complete');
        } catch (error) {
            console.error('[Omeka-EXE Bridge] Initialization failed:', error);
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.omekaExeBridge = {
        config,
        save: saveToOmeka,
        import: importElpFromOmeka
    };
})();
