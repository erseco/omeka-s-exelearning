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

    var config = window.__OMEKA_EXE_CONFIG__;
    if (!config) {
        console.error('[Omeka-EXE Bridge] Configuration not found');
        return;
    }

    console.log('[Omeka-EXE Bridge] Initializing with config:', config);

    /**
     * Wait for the eXeLearning app to be ready (legacy fallback)
     */
    function waitForAppLegacy(maxAttempts) {
        maxAttempts = maxAttempts || 100;
        return new Promise(function(resolve, reject) {
            var attempts = 0;
            var check = function() {
                attempts++;
                if (window.eXeLearning && window.eXeLearning.app) {
                    resolve(window.eXeLearning.app);
                } else if (attempts < maxAttempts) {
                    setTimeout(check, 100);
                } else {
                    reject(new Error('App did not initialize'));
                }
            };
            check();
        });
    }

    /**
     * Wait for the Yjs project bridge to be ready.
     */
    function waitForBridge(maxAttempts) {
        maxAttempts = maxAttempts || 150;
        return new Promise(function(resolve, reject) {
            var attempts = 0;
            var check = function() {
                attempts++;
                var bridge = window.eXeLearning?.app?.project?._yjsBridge
                    || window.YjsModules?.getBridge?.();
                if (bridge) {
                    console.log('[Omeka-EXE Bridge] Bridge found after', attempts, 'attempts');
                    resolve(bridge);
                } else if (attempts < maxAttempts) {
                    setTimeout(check, 200);
                } else {
                    reject(new Error('Project bridge did not initialize'));
                }
            };
            check();
        });
    }

    /**
     * Show or update the loading screen
     */
    function updateLoadScreen(message, show) {
        if (show === undefined) show = true;
        var loadScreen = document.getElementById('load-screen-main');
        var loadMessage = loadScreen?.querySelector('.loading-message, p');

        if (loadScreen) {
            if (show) {
                loadScreen.classList.remove('hide');
            } else {
                loadScreen.classList.add('hide');
            }
        }

        if (loadMessage && message) {
            loadMessage.textContent = message;
        }
    }

    /**
     * Import ELP file from Omeka-S
     */
    async function importElpFromOmeka() {
        var elpUrl = config.elpUrl;
        if (!elpUrl) {
            console.log('[Omeka-EXE Bridge] No ELP URL provided, starting with empty project');
            return;
        }

        console.log('[Omeka-EXE Bridge] Starting import from:', elpUrl);

        try {
            updateLoadScreen(config.i18n?.loading || 'Loading project...');

            // Wait for the Yjs bridge to be initialized
            updateLoadScreen('Waiting for editor...');
            var bridge = await waitForBridge();

            // Fetch the ELP file
            updateLoadScreen('Downloading file...');
            var response = await fetch(elpUrl);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }

            // Convert to File object
            var blob = await response.blob();
            console.log('[Omeka-EXE Bridge] File downloaded, size:', blob.size);
            var filename = elpUrl.split('/').pop().split('?')[0] || 'project.elpx';
            var file = new File([blob], filename, { type: 'application/zip' });

            // Import using the project API or bridge directly
            updateLoadScreen('Importing content...');
            var project = window.eXeLearning?.app?.project;
            if (typeof project?.importElpxFile === 'function') {
                console.log('[Omeka-EXE Bridge] Using project.importElpxFile...');
                await project.importElpxFile(file);
            } else if (typeof project?.importFromElpxViaYjs === 'function') {
                console.log('[Omeka-EXE Bridge] Using project.importFromElpxViaYjs...');
                await project.importFromElpxViaYjs(file, { clearExisting: true });
            } else {
                console.log('[Omeka-EXE Bridge] Using bridge.importFromElpx...');
                await bridge.importFromElpx(file, { clearExisting: true });
            }

            console.log('[Omeka-EXE Bridge] ELP imported successfully');
        } catch (error) {
            console.error('[Omeka-EXE Bridge] Import failed:', error);
            updateLoadScreen('Error loading project');
        } finally {
            setTimeout(function() {
                updateLoadScreen('', false);
            }, 500);
        }
    }

    /**
     * Save project to Omeka-S
     */
    async function saveToOmeka() {
        // Notify parent window that save is starting
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'exelearning-save-start' }, '*');
        }

        try {
            console.log('[Omeka-EXE Bridge] Starting save...');

            // Get the project bridge for export
            var project = window.eXeLearning?.app?.project;
            var yjsBridge = project?._yjsBridge
                || window.YjsModules?.getBridge?.()
                || project?.bridge;

            if (!yjsBridge) {
                throw new Error('Project bridge not available');
            }

            // Export using quickExport or legacy createExporter
            var blob;
            if (window.SharedExporters?.quickExport) {
                console.log('[Omeka-EXE Bridge] Using SharedExporters.quickExport...');
                var result = await window.SharedExporters.quickExport(
                    'elpx',
                    yjsBridge.documentManager,
                    null,
                    yjsBridge.resourceFetcher,
                    {},
                    yjsBridge.assetManager
                );
                if (!result.success || !result.data) {
                    throw new Error('Export failed');
                }
                blob = new Blob([result.data], { type: 'application/zip' });
            } else if (window.SharedExporters?.createExporter) {
                console.log('[Omeka-EXE Bridge] Using SharedExporters.createExporter...');
                var exporter = window.SharedExporters.createExporter(
                    'elpx',
                    yjsBridge.documentManager,
                    yjsBridge.assetCache,
                    yjsBridge.resourceFetcher,
                    yjsBridge.assetManager
                );
                var exportResult = await exporter.export();
                if (!exportResult.success || !exportResult.data) {
                    throw new Error('Export failed');
                }
                blob = new Blob([exportResult.data], { type: 'application/zip' });
            } else {
                throw new Error('No exporter available');
            }

            console.log('[Omeka-EXE Bridge] Export complete, size:', blob.size);

            // Upload to Omeka-S
            var formData = new FormData();
            formData.append('file', blob, 'project.elpx');
            if (config.csrfToken) {
                formData.append('csrf', config.csrfToken);
            }

            console.log('[Omeka-EXE Bridge] Uploading to:', config.saveEndpoint);

            var saveResponse = await fetch(config.saveEndpoint, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            });

            var saveResult = await saveResponse.json();

            if (saveResult.success) {
                console.log('[Omeka-EXE Bridge] Save successful');
                showNotification('success', config.i18n?.saved || 'Saved successfully!');

                // Notify parent window
                if (window.parent !== window) {
                    window.parent.postMessage({
                        type: 'exelearning-save-complete',
                        mediaId: config.mediaId,
                        previewUrl: saveResult.preview_url
                    }, '*');
                }
            } else {
                throw new Error(saveResult.message || 'Save failed');
            }
        } catch (error) {
            console.error('[Omeka-EXE Bridge] Save failed:', error);
            showNotification('error', (config.i18n?.error || 'Error') + ': ' + error.message);

            // Notify parent window that save failed
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'exelearning-save-error', message: error.message }, '*');
            }
        }
    }

    /**
     * Show notification to user
     */
    function showNotification(type, message) {
        var existing = document.getElementById('omeka-exe-notification');
        if (existing) {
            existing.remove();
        }

        var notification = document.createElement('div');
        notification.id = 'omeka-exe-notification';
        notification.className = 'omeka-exe-notification omeka-exe-notification--' + type;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(function() {
            notification.classList.add('omeka-exe-notification--fade');
            setTimeout(function() { notification.remove(); }, 300);
        }, 3000);
    }

    /**
     * Initialize the bridge
     */
    async function init() {
        try {
            console.log('[Omeka-EXE Bridge] Starting initialization...');

            // Wait for app initialization using the new ready promise or legacy polling
            if (window.eXeLearning?.ready) {
                await window.eXeLearning.ready;
            } else {
                await waitForAppLegacy();
            }
            console.log('[Omeka-EXE Bridge] App initialized');

            // Import ELP if URL provided
            if (config.elpUrl) {
                await importElpFromOmeka();
            } else {
                console.log('[Omeka-EXE Bridge] No elpUrl in config, skipping import');
            }

            // Notify parent window that bridge is ready
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'exelearning-bridge-ready' }, '*');
            }

            // Listen for save shortcuts (Ctrl+S / Cmd+S)
            document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveToOmeka();
                }
            });

            // Listen for messages from parent window
            window.addEventListener('message', function(event) {
                if (event.data?.type === 'exelearning-request-save') {
                    saveToOmeka();
                }
            });

            console.log('[Omeka-EXE Bridge] Initialization complete');
        } catch (error) {
            console.error('[Omeka-EXE Bridge] Initialization failed:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.omekaExeBridge = {
        config: config,
        save: saveToOmeka,
        import: importElpFromOmeka
    };
})();
