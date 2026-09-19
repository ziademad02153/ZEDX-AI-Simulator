const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, clipboard, session, desktopCapturer } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const ICON_PATH = path.join(__dirname, '..', 'public', 'favicon.ico');

// Bypass Google OAuth "This browser or app may not be secure" error
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function initOverlaySystem() {
    if (process.platform === 'win32') {
        app.setAppUserModelId('System.Helper');
    }
    if (process.platform === 'darwin') {
        app.dock.hide();
    }
}

let floatingIconWindow = null;
let mainAppWindow = null;
let scannerFrameWindow = null;
let tray = null;
let isAppVisible = false;
let isScannerFrameOpen = false;

const isDev = !app.isPackaged;
const APP_URL = isDev ? 'http://localhost:3000' : 'https://zedx-ai.tech';

// --- ASSESSMENT OVERLAY FRAME ---
function createScannerFrame() {
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
        show: true,
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

    scannerFrameWindow.setContentProtection(true);
    scannerFrameWindow.loadURL(`${APP_URL}/scanner-frame?isScanner=true`, {
        extraHeaders: "x-is-scanner: true\n"
    });

    scannerFrameWindow.on('closed', () => {
        scannerFrameWindow = null;
        isScannerFrameOpen = false;
        broadcastScannerState(false);
    });

    broadcastScannerState(true);
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
        width: 56,
        height: 56,
        x: centerX,
        y: 15,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: true,
        hasShadow: false,
        focusable: false, // GHOST MODE: Prevent focus stealing
        icon: ICON_PATH,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // Required for loading local images/styles in static HTML
        }
    });

    floatingIconWindow.setContentProtection(true);

    if (process.platform === 'win32') {
        floatingIconWindow.setAlwaysOnTop(true, 'screen-saver', 10);
    }

    floatingIconWindow.loadFile(path.join(__dirname, 'floating-icon.html'));
}

function createMainAppWindow() {
    const { width } = screen.getPrimaryDisplay().workAreaSize;

    mainAppWindow = new BrowserWindow({
        width: 500,
        height: 750,
        minWidth: 400,
        minHeight: 600,
        x: Math.floor(width / 2) - 250,
        y: 120,
        frame: false,
        transparent: true,
        icon: ICON_PATH,
        alwaysOnTop: true,
        skipTaskbar: true, // HUD BACKGROUND MODE
        resizable: true,
        movable: true,
        hasShadow: true,
        focusable: true, // TEMPORARY: Enable focus so user can login
        show: true,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            partition: 'persist:main'
        }
    });

    mainAppWindow.setContentProtection(true);

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    mainAppWindow.webContents.setUserAgent(userAgent);

    if (process.platform === 'win32') {
        mainAppWindow.setAlwaysOnTop(true, 'screen-saver', 5);
    } else {
        mainAppWindow.setAlwaysOnTop(true, 'floating', 5);
    }

    mainAppWindow.on('close', (e) => {
        e.preventDefault();
        mainAppWindow.hide();
        isAppVisible = false;
    });

    // Notify renderer if page fails to load
    mainAppWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[App] Load fail: ${errorDescription} (${errorCode})`);
        mainAppWindow.webContents.send('load-error', errorDescription);
    });

    // Auto-toggle Ghost Mode based on URL
    const toggleGhostMode = (url) => {
        if (!mainAppWindow) return;
        // If on interview pages, enable Ghost Mode (prevent focus stealing)
        const isInterviewSession = url.includes('/interview') || url.includes('/how-to-use') || url.includes('/scanner-frame') || url.includes('/session');
        if (isInterviewSession) {
            mainAppWindow.setFocusable(false);
        } else {
            // Enable focus for login / OAuth pages
            mainAppWindow.setFocusable(true);
        }
    };

    mainAppWindow.webContents.on('did-navigate', (event, url) => toggleGhostMode(url));
    mainAppWindow.webContents.on('did-navigate-in-page', (event, url) => toggleGhostMode(url));

    loadAppContent();
}

function loadAppContent() {
    if (!mainAppWindow) return;
    const startUrl = `${APP_URL}/dashboard?desktop=true`;
    mainAppWindow.loadURL(startUrl).catch(e => console.error('[App] Load fail:', e));
}

function toggleApp() {
    if (!mainAppWindow) return;
    if (mainAppWindow.isVisible()) {
        mainAppWindow.hide();
        isAppVisible = false;
    } else {
        mainAppWindow.showInactive(); // GHOST MODE: Show without stealing focus
        isAppVisible = true;
    }
}

function showApp() {
    if (!mainAppWindow) return;
    mainAppWindow.showInactive(); // GHOST MODE: Show without stealing focus
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
            createScannerFrame();
            return { active: true };
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
}

app.whenReady().then(initialize);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { mainAppWindow = null; });
