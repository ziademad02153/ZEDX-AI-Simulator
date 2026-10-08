import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('setup camera and microphone close permission results arriving after cleanup', async () => {
 const source=readFileSync(new URL('../src/app/dashboard/new/how-to-use/page.tsx',import.meta.url),'utf8');
 const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 for(const marker of ['let cameraDisposed','let micDisposed']){
  let effect;const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes(marker))effect=node.arguments[0];ts.forEachChild(node,visit);};visit(ast);
  let release,stops=0,updates=0;const out={};
  vm.runInNewContext(ts.transpileModule(`exports.mount=${effect.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
   exports:out,step:marker.includes('camera')?1:2,isTestingMic:true,selectedVideo:'',selectedAudio:'',
   navigator:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>release=resolve)}},window:{},
   videoRef:{current:{srcObject:null}},setStream:()=>updates++,setIsDetecting:()=>updates++,setAudioLevel:()=>updates++,setTimeout,clearTimeout,console:{error(){}}
  });
  out.mount()();release({getTracks:()=>[{stop:()=>stops++}]});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(stops,1,marker);assert.equal(updates,0,marker);
 }
});

test('hardware cleanup preserves interviewer playback and closes a late camera stream', async () => {
 const source=readFileSync(new URL('../src/app/mock-interview/page.tsx',import.meta.url),'utf8');
 const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('let hardwareDisposed'))effect=node.arguments[0];ts.forEachChild(node,visit);};visit(ast);
 let resolveStream,stops=0,pauses=0;const out={};
 vm.runInNewContext(ts.transpileModule(`exports.mount=${effect.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:out,isSetup:true,isMicEnabled:false,isCameraEnabled:true,
  navigator:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>{resolveStream=resolve;})}},window:{},
  videoRef:{current:{srcObject:null}},audioRef:{current:{pause:()=>pauses++}},silenceTimerRef:{current:null},recognitionRef:{current:null},clearTimeout,
  console:{error(){}},observeInterviewPreview:()=>()=>{}
 });
 const cleanup=out.mount();cleanup();
 resolveStream({getTracks:()=>[{stop:()=>stops++}]});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(stops,1);assert.equal(pauses,0,'Camera changes must not pause or detach question playback');
});

test('the prepared opening includes the account first name and the whole question', async () => {
 const exports = {};
 const source = readFileSync(new URL('../src/lib/piper-amy-opening.ts', import.meta.url), 'utf8');
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
 assert.match(exports.getAmyOpeningText('  Ziad Emad  '), /^Welcome, Ziad, I am ZEDX\./);
 assert.match(exports.getAmyOpeningText(''), /^Welcome, I am ZEDX\./);
 assert.ok(exports.getAmyOpeningText('Ziad').endsWith('your background?'));
 const ast = ts.createSourceFile('page.tsx', readFileSync(new URL('../src/app/dashboard/new/how-to-use/page.tsx',import.meta.url),'utf8'), ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;
 const visit = node => { if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='prepareOpening')handler=node.initializer;ts.forEachChild(node,visit); };visit(ast);
 const calls=[], context={}, openingPreparation={current:null}, out={};
 vm.runInNewContext(ts.transpileModule(`exports.prepare=${handler.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:out, openingPreparation, preloadAmySpeech:async()=>{},
  supabase:{auth:{getSession:async()=>({data:{session:{user:{user_metadata:{full_name:'Ziad Emad'}}}}})}},
  useInterviewStore:{getState:()=>({setInterviewContext:data=>Object.assign(context,data)})},
  getAmyOpeningText:exports.getAmyOpeningText, prepareAmyOpening:async text=>calls.push(text)
 });
 await Promise.all([out.prepare(),out.prepare()]);
 assert.equal(context.candidateName,'Ziad');assert.equal(calls.length,1);assert.equal(calls[0],exports.getAmyOpeningText('Ziad'));
});

test('Amy speech chunks preserve the question and bound inference size', () => {
    const { api } = engine();
    const text = 'Welcome to ZEDX. Tell me about your most recent project and how you handled a difficult technical problem. ' + 'Explain your approach and the result in detail. '.repeat(12);
    const chunks = api.splitAmySpeechText(text);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every(chunk => chunk.length > 0 && chunk.length <= 180));
    assert.equal(chunks.join(' ').replace(/\s+/g, ' ').trim(), text.replace(/\s+/g, ' ').trim());
    assert.ok(chunks[0].startsWith('Welcome to ZEDX. Tell me'));
    assert.deepEqual(Array.from(api.splitAmySpeechText('My score was 3.5 out of 5. What changed?')), ['My score was 3.5 out of 5. What changed?']);
    assert.throws(() => api.splitAmySpeechText(text, 0), /Invalid/);
});

test('Amy chunking handles long text without sentence punctuation', () => {
    const { api } = engine();
    const text = 'project '.repeat(150).trim();
    const chunks = api.splitAmySpeechText(text);
    assert.ok(chunks.every(chunk => chunk.length <= 180));
    assert.equal(chunks.join(' '), text);
});

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

test('a saved model is described as initialization and does not unlock before opening audio is ready', async () => {
    const { api, workers } = engine();
    const loading = api.preloadAmySpeech();
    const id = workers[0].messages[0].id;
    workers[0].respond({ id, cached: true });
    assert.equal(api.getAmySpeechState().cached, true);
    assert.equal(api.canStartWithEnglishVoice('en-US', false, api.getAmySpeechState(), 'amy'), false);
    workers[0].respond({ id });
    await loading;
    assert.equal(api.getAmySpeechState().status, 'ready');
    api.disposeAmySpeech();
});

test('hardware-page start waits for Amy before navigating, and stays put on preparation failure', async () => {
    const source = readFileSync(new URL('../src/app/dashboard/new/how-to-use/page.tsx', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleStart') handler = node.initializer;
        ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.ok(handler);
    for (const fail of [false, true]) {
        const routes = [], errors = [];
        let release;
        const exports = {};
        vm.runInNewContext(ts.transpileModule(`exports.start = ${handler.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
            exports, markInterviewStart() {}, needsAmy: () => true, setPreparingVoice() {}, setVoiceError: error => errors.push(error),
            prepareOpening: () => new Promise((resolve, reject) => { release = () => fail ? reject(new Error('not ready')) : resolve(); }),
            router: { push: route => routes.push(route) }
        });
        const starting = exports.start();
        assert.equal(routes.length, 0);
        release(); await starting;
        if (fail) { assert.equal(routes.length, 0); assert.match(errors.at(-1), /Amy is not ready/); }
        else assert.deepEqual(routes, ['/mock-interview']);
    }
});

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
        amyPlaybackCancelRef: { current: null }, audioRef: { current: null },
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
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:{},self:scope,console:{warn(){}},require:name=>name.includes('opening')?{AMY_OPENING_TEXT:'Welcome to ZEDX.'}:{TtsSession:{create:async opt=>{options=opt;return session;}}}});
 scope.onmessage({data:{id:1}});await new Promise(resolve=>setImmediate(resolve));
 options.progress({loaded:50,total:100});assert.equal(messages.at(-1).progress.loaded,50);
 assert.equal(messages.some(message=>'audio' in message),false);
 releaseWarmup();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(messages.at(-1).id,1);assert.equal(messages.at(-1).audio,undefined);
 scope.onmessage({data:{id:2,text:'The actual question'}});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(texts,['Ready.','The actual question']);assert.ok(messages.at(-1).audio instanceof Blob);
 scope.onmessage({data:{id:3,text:'Welcome to ZEDX.',prepare:true}});await new Promise(resolve=>setImmediate(resolve));
 scope.onmessage({data:{id:33,text:'Welcome to ZEDX.'}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(texts.length,3,'Opening playback reuses audio prepared in setup');
 assert.ok(messages.at(-1).audio instanceof Blob);
 scope.onmessage({data:{id:4,text:'Welcome, Ziad. Full question.',prepare:true}});await new Promise(resolve=>setImmediate(resolve));
 const prepared=messages.at(-1).audio;
 scope.onmessage({data:{id:5,text:'Welcome, Ziad. Full question.'}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(texts.length,4,'Named opening is inferred once during preparation');
 assert.equal(messages.at(-1).audio,prepared,'Interview reuses the entire named opening');
});
