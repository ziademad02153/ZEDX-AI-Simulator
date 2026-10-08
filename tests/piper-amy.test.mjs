import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function engine() {
    const workers = [];
    class Worker {
        messages = [];
        constructor() { workers.push(this); }
        postMessage(message) { this.messages.push(message); }
        terminate() { this.terminated = true; }
        respond(message) { this.onmessage({ data: message }); }
    }
    const source = readFileSync(new URL('../src/lib/piper-amy.ts', import.meta.url), 'utf8')
        .replace("new URL('./piper-amy.worker.ts', import.meta.url)", "'amy-worker'");
    const exports = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
        { exports, Worker, window: { Worker }, Blob, setTimeout, clearTimeout });
    return { api: exports, workers };
}

test('Amy preload is shared and synthesis reuses the loaded worker', async () => {
    const { api, workers } = engine();
    const first = api.preloadAmySpeech();
    assert.equal(api.preloadAmySpeech(), first);
    assert.equal(workers.length, 1);
    workers[0].respond({ id: workers[0].messages[0].id });
    await first;
    const spoken = api.synthesizeAmySpeech('A real interview question');
    await new Promise(resolve => setImmediate(resolve));
    const message = workers[0].messages[1];
    assert.equal(message.text, 'A real interview question');
    const blob = new Blob(['audio']);
    workers[0].respond({ id: message.id, audio: blob });
    assert.equal(await spoken, blob);
    assert.equal(workers.length, 1);
    api.disposeAmySpeech();
});

test('Amy cancellation rejects pending work and a fresh worker can load afterward', async () => {
    const { api, workers } = engine();
    const loading = api.preloadAmySpeech();
    const rejected = assert.rejects(loading, /stopped/);
    api.disposeAmySpeech();
    await rejected;
    assert.equal(workers[0].terminated, true);
    const retry = api.preloadAmySpeech();
    workers[1].respond({ id: workers[1].messages[0].id });
    await retry;
    api.disposeAmySpeech();
});

test('Interview effect replay retains the preloaded voice; real unmount disposes it', () => {
    const source = readFileSync(new URL('../src/app/mock-interview/page.tsx', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let effect;
    function visit(node) {
        if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' &&
            node.arguments[0]?.getText(ast).includes('speechCleanupTimer.current = setTimeout')) effect = node.arguments[0];
        ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.ok(effect);
    const timers = new Map();
    let nextTimer = 0;
    let disposed = 0;
    const exports = {};
    vm.runInNewContext(ts.transpileModule(`exports.mount = ${effect.getText(ast)};`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText, {
        exports, speechCleanupTimer: { current: null }, isMounted: { current: false }, speechRequestRef: { current: 0 },
        setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
        clearTimeout: id => timers.delete(id), disposeAmySpeech: () => disposed++
    });
    exports.mount()();
    const unmount = exports.mount();
    assert.equal(timers.size, 0, 'Development replay must cancel worker disposal');
    unmount();
    for (const callback of timers.values()) callback();
    assert.equal(disposed, 1, 'Real navigation must release the worker');
});

test('download progress never unlocks the interview until the worker confirms readiness', async () => {
 const {api,workers}=engine();const states=[];const unsubscribe=api.subscribeAmySpeech(()=>states.push(api.getAmySpeechState().status));
 const loading=api.preloadAmySpeech();const id=workers[0].messages[0].id;
 workers[0].respond({id,progress:{loaded:63,total:100}});
 assert.equal(api.getAmySpeechState().progress,63);
 assert.equal(api.canStartWithEnglishVoice('en-US',false,api.getAmySpeechState(),'amy'),false);
 workers[0].respond({id,progress:{loaded:100,total:100}});
 assert.equal(api.getAmySpeechState().status,'loading');
 assert.equal(api.canStartWithEnglishVoice('en-US',false,api.getAmySpeechState(),'amy'),false);
 workers[0].respond({id});await loading;
 assert.equal(api.getAmySpeechState().status,'ready');
 assert.equal(api.canStartWithEnglishVoice('en-US',false,api.getAmySpeechState(),'amy'),true);
 assert.ok(states.includes('loading'));assert.ok(states.includes('ready'));
 unsubscribe();api.disposeAmySpeech();
});

test('worker failures expose a retryable error, while Arabic, other languages and desktop never require Amy', async () => {
 const {api,workers}=engine();const loading=api.preloadAmySpeech();const rejected=assert.rejects(loading);
 workers[0].onerror();await rejected;
 assert.equal(api.getAmySpeechState().status,'error');
 assert.equal(api.canStartWithEnglishVoice('en-US',false,api.getAmySpeechState(),'amy'),false);
 for(const lang of ['ar-EG','ar-SA','fr-FR'])assert.equal(api.canStartWithEnglishVoice(lang,false,api.getAmySpeechState(),'amy'),true);
 assert.equal(api.canStartWithEnglishVoice('en-US',true,api.getAmySpeechState(),'amy'),true);
 assert.equal(api.canStartWithEnglishVoice('en-US',false,api.getAmySpeechState(),'browser'),true);
 const retry=api.preloadAmySpeech();workers[1].respond({id:workers[1].messages[0].id});await retry;
 assert.equal(api.getAmySpeechState().status,'ready');api.disposeAmySpeech();
});

test('English browser voice preference survives client navigation without invoking ElevenLabs', () => {
 const {api}=engine();assert.equal(api.getEnglishSpeechPreference(),'amy');
 api.setEnglishSpeechPreference('browser');assert.equal(api.getEnglishSpeechPreference(),'browser');
 api.setEnglishSpeechPreference('amy');assert.equal(api.getEnglishSpeechPreference(),'amy');
});

test('the real worker initializes inference before readiness and does not return warmup audio', async () => {
 const source=readFileSync(new URL('../src/lib/piper-amy.worker.ts',import.meta.url),'utf8');const messages=[];const texts=[];let releaseWarmup;let options;
 const scope={postMessage:message=>messages.push(message)};
 const session={predict:async text=>{texts.push(text);if(text==='Ready.')await new Promise(resolve=>{releaseWarmup=resolve;});return new Blob(['audio']);}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:{},self:scope,console:{warn(){}},require:()=>({TtsSession:{create:async opt=>{options=opt;return session;}}})});
 scope.onmessage({data:{id:1}});await new Promise(resolve=>setImmediate(resolve));
 options.progress({loaded:50,total:100});assert.equal(messages[0].progress.loaded,50);
 assert.equal(messages.some(message=>'audio' in message),false);
 releaseWarmup();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(messages.at(-1).id,1);assert.equal(messages.at(-1).audio,undefined);
 scope.onmessage({data:{id:2,text:'The actual question'}});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(texts,['Ready.','The actual question']);assert.ok(messages.at(-1).audio instanceof Blob);
});
