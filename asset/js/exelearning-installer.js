/**
 * eXeLearning editor installer.
 *
 * Starts a server-side installation and refreshes the admin UI via status AJAX.
 */
(function () {
    'use strict';

    var cfg = window.exelearningInstaller;
    if (!cfg) return;

    var btn = document.getElementById('exelearning-install-btn');
    var progressDiv = document.getElementById('exelearning-install-progress');
    var messageSpan = document.getElementById('exelearning-install-message');
    var progressBar = document.getElementById('exelearning-install-bar');
    var resultDiv = document.getElementById('exelearning-install-result');
    var statusIcon = document.getElementById('exelearning-status-icon');
    var statusText = document.getElementById('exelearning-status-text');
    var installedVersion = document.getElementById('exelearning-installed-version');
    var installedAt = document.getElementById('exelearning-installed-at');
    var statusDescription = document.getElementById('exelearning-status-description');
    var s = cfg.strings || {};
    var pollTimer = null;

    if (!btn) return;

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str || ''));
        return div.innerHTML;
    }

    function safeJsonResponse(resp) {
        var ct = resp.headers.get('Content-Type') || '';
        if (ct.indexOf('json') !== -1) {
            return resp.json();
        }
        return resp.text().then(function (text) {
            var msg = text;
            var match = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
                || text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (match) msg = match[1].replace(/<[^>]+>/g, '').trim();
            if (msg.length > 300) msg = msg.substring(0, 300) + '...';
            return { success: false, message: msg || ('Server error: HTTP ' + resp.status) };
        });
    }

    function showResult(message, ok) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<p style="color: ' + (ok ? '#46b450' : '#dc3232')
            + ';' + (ok ? ' font-weight: bold;' : '') + '">'
            + escapeHtml(message) + '</p>';
    }

    function setProgress(running, message) {
        progressDiv.style.display = running ? 'block' : 'none';
        progressBar.style.width = running ? '100%' : '0%';
        progressBar.style.opacity = running ? '0.65' : '1';
        progressBar.style.background = '#087cb8';
        progressBar.style.animation = running ? 'exelearning-install-pulse 1.2s ease-in-out infinite' : 'none';
        messageSpan.textContent = message || '';
    }

    function translatePhase(phase, fallback) {
        var map = {
            checking: s.checking,
            downloading: s.downloading,
            extracting: s.extracting,
            validating: s.validating,
            installing: s.installing
        };
        return map[phase] || fallback || s.working || '';
    }

    function renderStatus(status) {
        if (!status) return;

        if (status.running) {
            setProgress(true, translatePhase(status.phase, status.message));
        } else {
            setProgress(false, '');
        }

        if (status.is_installed) {
            statusIcon.innerHTML = '<span style="color: #46b450;">&#10003;</span> '
                + '<span id="exelearning-status-text">' + escapeHtml(s.installed || 'Installed') + '</span>'
                + (status.installed_version ? ' &mdash; v<span id="exelearning-installed-version">'
                    + escapeHtml(status.installed_version) + '</span>' : '')
                + (status.installed_at ? ' (' + escapeHtml(s.installedOn || 'installed on') + ' <span id="exelearning-installed-at">'
                    + escapeHtml(status.installed_at) + '</span>)' : '');
            if (statusDescription) {
                statusDescription.style.display = 'none';
                statusDescription.textContent = '';
            }
        } else {
            statusIcon.innerHTML = '<span style="color: #dc3232;">&#10007;</span> '
                + '<span id="exelearning-status-text">' + escapeHtml(s.notInstalled || 'Not installed') + '</span>'
                + '<span id="exelearning-installed-version" style="display:none;"></span>'
                + '<span id="exelearning-installed-at" style="display:none;"></span>';
            if (statusDescription) {
                statusDescription.style.display = 'block';
                statusDescription.textContent = status.description || s.notInstalledDescription || '';
            }
        }

        btn.textContent = status.button_label || btn.textContent;
        btn.className = status.button_class || 'button';
        btn.disabled = !!status.running;
    }

    function clearPoll() {
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
    }

    function fetchStatus() {
        return fetch(cfg.statusUrl, {
            method: 'GET',
            credentials: 'same-origin'
        }).then(safeJsonResponse);
    }

    function pollStatus() {
        fetchStatus()
            .then(function (data) {
                if (!data || !data.success || !data.status) {
                    showResult((data && data.message) || s.error, false);
                    btn.disabled = false;
                    btn.textContent = s.tryAgain;
                    return;
                }

                renderStatus(data.status);

                if (data.status.running) {
                    pollTimer = setTimeout(pollStatus, 3000);
                    return;
                }

                if (data.status.phase === 'done') {
                    showResult(data.status.message || s.successDefault, true);
                } else if (data.status.phase === 'error') {
                    showResult(data.status.error || data.status.message || s.error, false);
                    btn.disabled = false;
                    btn.textContent = data.status.button_label || s.tryAgain;
                } else {
                    btn.disabled = false;
                }
            })
            .catch(function () {
                showResult(s.networkError, false);
                btn.disabled = false;
                btn.textContent = s.tryAgain;
            });
    }

    function startInstall() {
        clearPoll();
        btn.disabled = true;
        btn.textContent = s.pleaseWait;
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';
        setProgress(true, s.checking);

        var formData = new FormData();
        formData.append('csrf', cfg.csrfToken);

        var timedOut = false;
        var timeoutId = setTimeout(function () {
            timedOut = true;
            setProgress(true, s.timeout || s.working);
            pollStatus();
        }, 120000);

        fetch(cfg.installUrl, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
        .then(function (resp) {
            return safeJsonResponse(resp);
        })
        .then(function (data) {
            clearTimeout(timeoutId);
            if (timedOut) return;

            if (data && data.success && data.status) {
                renderStatus(data.status);
                showResult(data.message || s.successDefault, true);
                btn.disabled = false;
                return;
            }

            if (data && data.status) {
                renderStatus(data.status);
            } else {
                fetchStatus().then(function (statusData) {
                    if (statusData && statusData.success && statusData.status) {
                        renderStatus(statusData.status);
                    }
                });
            }

            showResult((data && data.message) || s.error, false);
            btn.disabled = false;
            btn.textContent = s.tryAgain;
        })
        .catch(function () {
            clearTimeout(timeoutId);
            if (!timedOut) {
                showResult(s.networkError, false);
                btn.disabled = false;
                btn.textContent = s.tryAgain;
            }
        });
    }

    btn.addEventListener('click', startInstall);
})();
