import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../electron/main.js', import.meta.url), 'utf8');
const create = source.slice(source.indexOf('async function createScannerFrame()'), source.indexOf('function broadcastScannerState'));
function fixture() {
    let resolve, reject, expire;
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    const windows = [], states = [];
    class Window extends EventEmitter {
        constructor() { super(); windows.push(this); }
        isDestroyed() { return !!this.destroyed; }
        destroy() { this.destroyed = true; this.emit('closed'); }
        setAlwaysOnTop() {}
        setContentProtection() {}
        setSkipTaskbar() {}
        showInactive() { this.shown = true; }
        loadURL() { return pending; }
    }
    const context = vm.createContext({ BrowserWindow: Window, screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) }, getOwnerWindow: () => null, path: { join: (...parts) => parts.join('/') }, __dirname: '/electron', ICON_PATH: '/icon', APP_URL: 'http://localhost:3000', process: { platform: 'win32' }, isContentProtectionEnabled: true, scannerFrameWindow: null, isScannerFrameOpen: false, broadcastScannerState: value => states.push(value), setTimeout: callback => { expire = callback; return 1; }, clearTimeout() {}, console: { error() {} } });
    vm.runInContext(create, context);
    return { context, windows, states, resolve, reject, expire: () => expire(), open: () => context.createScannerFrame() };
}
test('scanner reports open only once the page loads and the window is shown', async () => {
    const f = fixture(); const result = f.open();
    assert.deepEqual(f.states, []); assert.equal(f.windows[0].shown, undefined);
    f.resolve(); assert.equal((await result).active, true);
    assert.equal(f.windows[0].shown, true); assert.deepEqual(f.states, [true]);
});
for (const failure of ['network', 'timeout']) test(`scanner ${failure} failure resets state and permits retry`, async () => {
    const f = fixture(); const result = f.open();
    if (failure === 'network') f.reject(new Error('offline')); else f.expire();
    const response = await result;
    assert.equal(response.active, false); assert.ok(response.error);
    assert.equal(f.context.scannerFrameWindow, null);
    assert.equal(f.context.isScannerFrameOpen, false);
    assert.equal(f.windows[0].destroyed, true); assert.deepEqual(f.states, [false]);
});
test('closing while loading never shows a destroyed scanner or broadcasts open', async () => {
    const f = fixture(); const result = f.open();
    f.windows[0].destroy(); f.resolve();
    assert.equal((await result).active, false); assert.deepEqual(f.states, [false]);
    assert.equal(f.windows[0].shown, undefined);
});
