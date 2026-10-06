const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    toggleApp: () => ipcRenderer.send('toggle-app'),
    showApp: () => ipcRenderer.send('show-app'),
    hideApp: () => ipcRenderer.send('minimize-to-background'),
    closeApp: () => ipcRenderer.send('close-app'),
    goBack: () => ipcRenderer.send('go-back'),
    canGoBack: () => ipcRenderer.sendSync('can-go-back'),
    copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
    isDesktopMode: () => ipcRenderer.sendSync('get-desktop-mode'),

    // Audio capture
    getSystemAudioSource: () => ipcRenderer.invoke('get-system-audio-source'),
    startSystemAudioCapture: () => ipcRenderer.invoke('start-system-audio-capture'),
    stopSystemAudioCapture: () => ipcRenderer.invoke('stop-system-audio-capture'),

    // Broadcast updates to Overlay
    sendTranscript: (text) => ipcRenderer.send('transcript-update', text),
    sendAnswer: (text) => ipcRenderer.send('answer-update', text),

    // Overlay Controls
    resizeOverlay: (width, height) => ipcRenderer.send('resize-overlay', { width, height }),
    setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),

    // Callbacks
    onTranscript: (callback) => {
        const wrapper = (event, text) => callback(text);
        ipcRenderer.on('transcript', wrapper);
        return () => ipcRenderer.removeListener('transcript', wrapper);
    },

    onAnswer: (callback) => {
        const wrapper = (event, answer) => callback(answer);
        ipcRenderer.on('answer', wrapper);
        return () => ipcRenderer.removeListener('answer', wrapper);
    },

    onAudioSourceReady: (callback) => {
        // Force removal of any existing listeners to prevent zombie callbacks
        ipcRenderer.removeAllListeners('audio-source-ready');
        const wrapper = (event, sourceId) => callback(sourceId);
        ipcRenderer.on('audio-source-ready', wrapper);
        return () => ipcRenderer.removeListener('audio-source-ready', wrapper);
    },

    // Error Handling & Connectivity
    retryConnection: () => ipcRenderer.send('retry-connection'),
    quitApp: () => ipcRenderer.send('quit-app'),
    hideIcon: () => ipcRenderer.send('minimize-icon'),
    onLoadError: (callback) => {
        const wrapper = (event, errorDescription) => callback(errorDescription);
        ipcRenderer.on('load-error', wrapper);
        return () => ipcRenderer.removeListener('load-error', wrapper);
    },

    // --- ASSESSMENT OVERLAY API ---
    toggleScannerFrame: () => ipcRenderer.invoke('toggle-scanner-frame'),
    updateScannerBounds: (bounds) => ipcRenderer.send('update-scanner-bounds', bounds),
    captureScannerArea: (bounds) => ipcRenderer.invoke('capture-scanner-area', bounds),

    onProcessOcr: (callback) => {
        const wrapper = (event, data) => callback(data);
        ipcRenderer.on('process-ocr-request', wrapper);
        return () => ipcRenderer.removeListener('process-ocr-request', wrapper);
    },

    onScannerStateChange: (callback) => {
        const wrapper = (event, active) => callback(active);
        ipcRenderer.on('scanner-state-changed', wrapper);
        return () => ipcRenderer.removeListener('scanner-state-changed', wrapper);
    },

    // Updater API
    downloadUpdate: () => ipcRenderer.send('download-update'),
    installUpdate: () => ipcRenderer.send('install-update'),
    onUpdateAvailable: (callback) => {
        const wrapper = (event, version) => callback(version);
        ipcRenderer.on('update-available', wrapper);
        return () => ipcRenderer.removeListener('update-available', wrapper);
    },
    onUpdateReady: (callback) => {
        const wrapper = () => callback();
        ipcRenderer.on('update-ready', wrapper);
        return () => ipcRenderer.removeListener('update-ready', wrapper);
    },

    // Screen Protection (Anti-Screen Capture / Black Box Toggle)
    toggleProtection: () => ipcRenderer.invoke('toggle-protection'),
    getProtectionState: () => ipcRenderer.sendSync('get-protection-state'),
    onProtectionToggled: (callback) => {
        const wrapper = (event, enabled) => callback(enabled);
        ipcRenderer.on('protection-toggled', wrapper);
        return () => ipcRenderer.removeListener('protection-toggled', wrapper);
    },

    isElectron: true
});
