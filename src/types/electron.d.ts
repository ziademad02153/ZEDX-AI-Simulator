export interface ElectronAPI {
    toggleOverlay: () => void;
    hideOverlay: () => void;
    // Main process control
    hideApp: () => void;
    showApp: () => void;
    closeApp: () => void;
    quitApp: () => void;
    toggleApp: () => void;
    goBack: () => void;
    canGoBack: () => boolean;
    isDesktopMode: () => boolean;
    // Utils
    copyToClipboard: (text: string) => void;
    sendTranscript: (transcript: string) => void;
    sendAnswer: (answer: string) => void;
    // Audio
    startSystemAudioCapture: () => Promise<{ success: boolean; sourceId?: string; error?: string }>;
    stopSystemAudioCapture: () => Promise<void>;
    onAudioSourceReady: (callback: (sourceId: string) => void) => void;
    // Events
    onTranscript: (callback: (text: string) => void) => void;
    onAnswer: (callback: (answer: string) => void) => void;
    // Overlay Controls
    resizeOverlay: (width: number, height: number) => void;
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => void;
    // Assessment Overlay
    toggleScannerFrame: () => Promise<{ active: boolean; error?: string }>;
    updateScannerBounds: (bounds: { x: number, y: number, width: number, height: number }) => void;
    captureScannerArea: (bounds: { x: number, y: number, width: number, height: number }) => Promise<{ success: boolean; error?: string }>;
    onProcessOcr: (callback: (data: { sourceId: string, bounds: { x: number, y: number, width: number, height: number }, scaleFactor?: number }) => void) => void;
    onScannerStateChange: (callback: (active: boolean) => void) => () => void;
    // Updater
    downloadUpdate: () => void;
    installUpdate: () => void;
    onUpdateAvailable: (callback: (version: string) => void) => () => void;
    onUpdateReady: (callback: () => void) => () => void;
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
