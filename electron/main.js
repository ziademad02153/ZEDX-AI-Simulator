const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, clipboard, session, desktopCapturer, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Software composition avoids a black capture rectangle for protected,
// transparent Windows overlays. This must run before app readiness.
if (process.platform === 'win32') {
    app.disableHardwareAcceleration();
}

const ICON_PATH = path.join(__dirname, '..', 'public', 'favicon.ico');

// Bypass Google OAuth "This browser or app may not be secure" error
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function initOverlaySystem() {
    if (process.platform === 'darwin') {
        app.dock.hide();
    }
}

let hiddenOwnerWindow = null;
function getOwnerWindow() {
    if (process.platform !== 'win32') return null;
    if (!hiddenOwnerWindow || hiddenOwnerWindow.isDestroyed()) {
        hiddenOwnerWindow = new BrowserWindow({
            width: 0,
            height: 0,
            show: false,
            frame: false,
            focusable: false,
            skipTaskbar: true
        });
    }
    return hiddenOwnerWindow;
}

let floatingIconWindow = null;
let mainAppWindow = null;
let scannerFrameWindow = null;
let tray = null;
let isAppVisible = false;
let isScannerFrameOpen = false;
let isContentProtectionEnabled = true;

function setProtectionState(enabled) {
    isContentProtectionEnabled = enabled;
    try {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
            mainAppWindow.setContentProtection(enabled);
        }
        if (floatingIconWindow && !floatingIconWindow.isDestroyed()) {
            floatingIconWindow.setContentProtection(enabled);
        }
        if (scannerFrameWindow && !scannerFrameWindow.isDestroyed()) {
            scannerFrameWindow.setContentProtection(enabled);
        }
        console.log(`[Protection] Screen Content Protection is now: ${enabled ? 'ENABLED (Black on Fullscreen Share)' : 'DISABLED (Transparent/Hidden via Window Share)'}`);
    } catch (e) {
        console.error('[Protection] Failed to update content protection:', e);
    }
}

const isDev = !app.isPackaged;
const APP_URL = isDev ? 'http://localhost:3000' : 'https://zedx-ai.tech';

// --- ASSESSMENT OVERLAY FRAME ---
async function createScannerFrame() {
    // v19.0 FIX: Remove listeners from old window before destroying to prevent race condition "closed" signals
    if (scannerFrameWindow) {
        try {
            if (!scannerFrameWindow.isDestroyed()) {
                scannerFrameWindow.removeAllListeners('closed');
                scannerFrameWindow.destroy();
            }
        } catch (e) { }
    }
    scannerFrameWindow = null;
    isScannerFrameOpen = true;

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    scannerFrameWindow = new BrowserWindow({
        parent: getOwnerWindow() || undefined,
        width: 400,
        height: 300,
        x: Math.floor(width / 2 - 200),
        y: Math.floor(height / 2 - 150),
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: true,
        focusable: false, // GHOST MODE: Prevent focus stealing
        thickFrame: false,
        hasShadow: false,
        backgroundColor: '#00000000',
        icon: ICON_PATH,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
        }
    });

    if (process.platform === 'win32') {
        scannerFrameWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    } else {
        scannerFrameWindow.setAlwaysOnTop(true, 'floating', 1);
    }

    scannerFrameWindow.setContentProtection(isContentProtectionEnabled);
    scannerFrameWindow.setSkipTaskbar(true);
    const frame = scannerFrameWindow;
    frame.on('closed', () => {
        if (scannerFrameWindow !== frame) return;
        scannerFrameWindow = null;
        isScannerFrameOpen = false;
        broadcastScannerState(false);
    });

    let timeout;
    try {
        await Promise.race([
            frame.loadURL(`${APP_URL}/scanner-frame?isScanner=true`, {
                extraHeaders: "x-is-scanner: true\n"
            }),
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error('Scanner did not load within 30 seconds. Please try again.')), 30000);
            })
        ]);
        if (frame.isDestroyed() || scannerFrameWindow !== frame) return { active: false };
        frame.showInactive();
        frame.setSkipTaskbar(true);
        broadcastScannerState(true);
        return { active: true };
    } catch (error) {
        console.error('[Scanner] Window load failed:', error);
        if (!frame.isDestroyed()) frame.destroy();
        return { active: false, error: 'Could not open the scanner. Check your connection and try again.' };
    } finally {
        clearTimeout(timeout);
    }
}

function broadcastScannerState(active) {
    if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('scanner-state-changed', active);
    }
}

function createFloatingIcon() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    const centerX = Math.round((width / 2) - 28);

    floatingIconWindow = new BrowserWindow({
        parent: getOwnerWindow() || undefined,
        width: 56,
        height: 56,
        x: centerX,
        y: 15,
        frame: false,
        transparent: true,
        type: 'toolbar',
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: true,
        hasShadow: false,
        focusable: false, // GHOST MODE: Prevent focus stealing
        icon: ICON_PATH,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // Required for loading local images/styles in static HTML
        }
    });

    floatingIconWindow.setContentProtection(isContentProtectionEnabled);
    floatingIconWindow.setSkipTaskbar(true);

    if (process.platform === 'win32') {
        floatingIconWindow.setAlwaysOnTop(true, 'screen-saver', 10);
    }
    floatingIconWindow.setSkipTaskbar(true);

    floatingIconWindow.webContents.on('did-finish-load', () => {
        floatingIconWindow.showInactive();
        floatingIconWindow.setSkipTaskbar(true);
    });

    floatingIconWindow.loadFile(path.join(__dirname, 'floating-icon.html'));
}

function createMainAppWindow() {
    const { width } = screen.getPrimaryDisplay().workAreaSize;

    mainAppWindow = new BrowserWindow({
        parent: getOwnerWindow() || undefined,
        width: 520,
        height: 780,
        minWidth: 420,
        minHeight: 600,
        x: Math.floor(width / 2) - 260,
        y: 80,
        frame: false,
        transparent: true,
        icon: ICON_PATH,
        alwaysOnTop: true,
        skipTaskbar: true, // HUD BACKGROUND MODE
        resizable: true,
        movable: true,
        hasShadow: false,
        focusable: true,
        show: false,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            partition: 'persist:main'
        }
    });

    if (process.platform === 'win32') {
        mainAppWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    } else {
        mainAppWindow.setAlwaysOnTop(true, 'floating', 1);
    }

    mainAppWindow.once('ready-to-show', () => {
        mainAppWindow.show();
        mainAppWindow.setSkipTaskbar(true);
        isAppVisible = true;
        try {
            mainAppWindow.setContentProtection(isContentProtectionEnabled);
        } catch (e) {
            console.error('[App] Failed to setContentProtection:', e);
        }
    });

    // Safety fallback: if ready-to-show takes too long (e.g. Next.js first compile), show window
    setTimeout(() => {
        if (mainAppWindow && !mainAppWindow.isDestroyed() && !mainAppWindow.isVisible()) {
            mainAppWindow.show();
            mainAppWindow.setSkipTaskbar(true);
            isAppVisible = true;
            try {
                mainAppWindow.setContentProtection(isContentProtectionEnabled);
            } catch (e) {}
        }
    }, 3500);

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    mainAppWindow.webContents.setUserAgent(userAgent);
    mainAppWindow.setSkipTaskbar(true);

    mainAppWindow.on('close', (e) => {
        e.preventDefault();
        mainAppWindow.hide();
        isAppVisible = false;
    });

    // Auto-retry connection if Next.js dev server is still compiling or booting
    mainAppWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[App] Load fail: ${errorDescription} (${errorCode}) - Retrying in 2s...`);
        mainAppWindow.webContents.send('load-error', errorDescription);
        setTimeout(() => {
            if (mainAppWindow && !mainAppWindow.isDestroyed()) {
                loadAppContent();
            }
        }, 2000);
    });

    mainAppWindow.webContents.on('did-finish-load', () => {
        if (!mainAppWindow.isVisible()) {
            mainAppWindow.show();
            mainAppWindow.setSkipTaskbar(true);
            isAppVisible = true;
        }
    });

    // Relay renderer console messages to terminal for instant debugging
    mainAppWindow.webContents.on('console-message', (event, level, message) => {
        console.log(`[Renderer] ${message}`);
    });

    // Auto-toggle Ghost Mode based on URL
    const toggleGhostMode = (url) => {
        if (!mainAppWindow) return;
        // Keep focusable enabled so user can type, click buttons, and copy answers in Copilot
        mainAppWindow.setFocusable(true);
    };

    mainAppWindow.webContents.on('did-navigate', (event, url) => toggleGhostMode(url));
    mainAppWindow.webContents.on('did-navigate-in-page', (event, url) => toggleGhostMode(url));

    loadAppContent();
}

function loadAppContent() {
    if (!mainAppWindow) return;
    const startUrl = `${APP_URL}/desktop-assistant`;
    mainAppWindow.loadURL(startUrl).catch(e => console.error('[App] Load fail:', e));
}

function toggleApp() {
    if (!mainAppWindow) return;
    if (mainAppWindow.isVisible()) {
        mainAppWindow.hide();
        isAppVisible = false;
    } else {
        mainAppWindow.show();
        mainAppWindow.setSkipTaskbar(true);
        mainAppWindow.focus();
        isAppVisible = true;
    }
}

function showApp() {
    if (!mainAppWindow) return;
    mainAppWindow.show();
    mainAppWindow.setSkipTaskbar(true);
    mainAppWindow.focus();
    isAppVisible = true;
}

function setupIpcHandlers() {
    ipcMain.on('update-scanner-bounds', (event, { x, y, width, height }) => {
        if (scannerFrameWindow && !scannerFrameWindow.isDestroyed()) {
            scannerFrameWindow.setBounds({
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(width),
                height: Math.round(height)
            });
        }
    });

    ipcMain.handle('toggle-scanner-frame', async () => {
        if (isScannerFrameOpen) {
            isScannerFrameOpen = false;
            // v19.0: Atomic close with broadcase
            if (scannerFrameWindow) {
                try { scannerFrameWindow.close(); } catch (e) { }
                scannerFrameWindow = null;
            }
            return { active: false };
        } else {
            return await createScannerFrame();
        }
    });

    ipcMain.handle('capture-scanner-area', async (event, bounds) => {
        try {
            if (!mainAppWindow) return { success: false };
            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
            if (sources.length === 0) return { success: false };
            const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
            mainAppWindow.webContents.send('process-ocr-request', { sourceId: sources[0].id, bounds, scaleFactor });
            return { success: true };
        } catch (err) {
            return { success: false };
        }
    });

    ipcMain.on('toggle-app', () => toggleApp());
    ipcMain.on('show-app', () => showApp());

    ipcMain.on('minimize-to-background', () => {
        if (mainAppWindow) {
            mainAppWindow.hide();
            isAppVisible = false;
        }
    });

    ipcMain.on('minimize-icon', () => {
        if (floatingIconWindow) {
            floatingIconWindow.hide();
        }
        if (mainAppWindow) {
            mainAppWindow.hide();
            isAppVisible = false;
        }
    });

    ipcMain.on('retry-connection', () => loadAppContent());
    ipcMain.on('quit-app', () => app.quit());
    ipcMain.on('go-back', () => mainAppWindow?.webContents.goBack());
    ipcMain.on('close-app', () => {
        if (mainAppWindow) {
            mainAppWindow.hide();
            isAppVisible = false;
        }
    });
    ipcMain.on('copy-to-clipboard', (event, text) => clipboard.writeText(text));
    ipcMain.on('get-desktop-mode', (event) => { event.returnValue = true; });
    ipcMain.on('can-go-back', (event) => { event.returnValue = mainAppWindow?.webContents.canGoBack() || false; });

    ipcMain.handle('get-system-audio-source', async () => {
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
        return sources.length > 0 ? { success: true, sourceId: sources[0].id } : { success: false };
    });

    ipcMain.handle('start-system-audio-capture', async () => {
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
            if (sources.length > 0) {
                // Try to find a screen source first, then fall back to window
                const bestSource = sources.find(s => s.id.startsWith('screen')) || sources[0];
                mainAppWindow?.webContents.send('audio-source-ready', bestSource.id);
                return { success: true, sourceId: bestSource.id };
            }
            return { success: false, error: "No screen or window sources found." };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('stop-system-audio-capture', async () => {
        return { success: true };
    });

    ipcMain.on('transcript-update', (event, text) => floatingIconWindow?.webContents.send('transcript', text));
    ipcMain.on('answer-update', (event, text) => floatingIconWindow?.webContents.send('answer', text));
    ipcMain.on('resize-overlay', (event, { width, height }) => floatingIconWindow?.setSize(width, height));
    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => floatingIconWindow?.setIgnoreMouseEvents(ignore, options));

    // Screen Protection (Anti-Capture / Black Box Toggle)
    ipcMain.handle('toggle-protection', () => {
        setProtectionState(!isContentProtectionEnabled);
        return isContentProtectionEnabled;
    });
    ipcMain.on('get-protection-state', (event) => {
        event.returnValue = isContentProtectionEnabled;
    });

    // Updater IPCs
    ipcMain.on('download-update', () => autoUpdater.downloadUpdate());
    ipcMain.on('install-update', () => autoUpdater.quitAndInstall());
}

function createTray() {
    try {
        const icon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });
        tray = new Tray(icon);
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Open Assistant', click: () => toggleApp() },
            { type: 'separator' },
            { label: 'Quit Entirely', click: () => app.quit() }
        ]);
        tray.setToolTip('ZEDX AI');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => toggleApp());
    } catch (e) { }
}

async function initialize() {
    initOverlaySystem();
    session.defaultSession.setPermissionRequestHandler((wc, p, cb) => cb(['media', 'audioCapture', 'speech'].includes(p)));
    session.defaultSession.setPermissionCheckHandler((wc, p) => ['media', 'audioCapture', 'speech'].includes(p));
    createFloatingIcon();
    createMainAppWindow();
    createTray();
    setupIpcHandlers();

    // v1.1.11: Manual Update Notification
    if (!isDev) {
        autoUpdater.autoDownload = false; // Disable automatic download
        autoUpdater.checkForUpdates();

        autoUpdater.on('update-available', (info) => {
            console.log('[Updater] Update available:', info.version);
            mainAppWindow?.webContents.send('update-available', info.version);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('[Updater] Update downloaded');
            mainAppWindow?.webContents.send('update-ready');
        });

        autoUpdater.on('error', (err) => {
            console.error('[Updater] Error:', err);
        });

        // Check for updates every 2 hours
        setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 1000 * 60 * 60 * 2);
    }

    // Register Global Shortcuts
    try {
        // Ctrl+Shift+H: Instant Hide / Show
        globalShortcut.register('CommandOrControl+Shift+H', () => {
            toggleApp();
        });

        // Ctrl+Shift+P: Toggle Screen Protection
        globalShortcut.register('CommandOrControl+Shift+P', () => {
            setProtectionState(!isContentProtectionEnabled);
            mainAppWindow?.webContents.send('protection-toggled', isContentProtectionEnabled);
        });
    } catch (shortcutErr) {
        console.error('[App] Failed to register global shortcuts:', shortcutErr);
    }
}

app.whenReady().then(initialize);
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { mainAppWindow = null; });
