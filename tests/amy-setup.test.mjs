import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
const source=readFileSync(new URL('../src/app/dashboard/new/page.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(predicate){let result;function visit(node){if(!result&&predicate(node))result=node;ts.forEachChild(node,visit);}visit(ast);assert.ok(result);return result;}
function handler(name,globals){const node=find(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name);const exports={};vm.runInNewContext(ts.transpileModule('exports.handler='+node.initializer.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{exports,...globals});return exports.handler;}
function panel(props){const expression=find(node=>ts.isJsxExpression(node)&&node.expression?.getText(ast).startsWith("language === 'en-US'")&&node.getText(ast).includes('Amy is ready')).expression;const exports={};const code=ts.transpileModule('exports.Panel=()=>('+expression.getText(ast)+');',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,require:()=>jsxRuntime,language:'en-US',isDesktop:false,englishVoice:'amy',checkingBrowserVoice:false,browserVoiceError:'',retryAmyVoice(){},useBrowserEnglishVoice(){},...props});return renderToStaticMarkup(React.createElement(exports.Panel));}
test('the actual setup panel distinguishes downloading, initializing, ready, error and an explicit browser choice',()=>{
 assert.match(panel({amyState:{status:'loading',progress:42,cached:false}}),/Downloading the English voice… 42%/);
 assert.match(panel({amyState:{status:'loading',progress:42,cached:false}}),/value="42"/);
 assert.match(panel({amyState:{status:'loading',progress:100,cached:false}}),/Initializing the English voice/);
 assert.doesNotMatch(panel({amyState:{status:'loading',progress:100,cached:false}}),/Amy is ready/);
 assert.match(panel({amyState:{status:'ready',progress:100}}),/Amy is ready/);
 assert.match(panel({amyState:{status:'error',progress:null}}),/Retry Amy/);
 assert.match(panel({amyState:{status:'error',progress:null}}),/Use browser voice instead/);
 assert.match(panel({englishVoice:'browser',amyState:{status:'idle',progress:null}}),/Browser English voice selected/);
 assert.equal(panel({language:'ar-EG',amyState:{status:'loading',progress:42}}),'');
 assert.equal(panel({isDesktop:true,amyState:{status:'loading',progress:42}}),'');
});
test('saved Amy starts silently and checking storage does not flash a download panel',()=>{
 for(const cached of [true,undefined])for(const status of ['idle','loading']){
  assert.equal(panel({amyState:{status,progress:null,cached}}),'');
 }
 assert.match(panel({amyState:{status:'loading',progress:0,cached:false}}),/First use downloads/);
 assert.match(panel({amyState:{status:'error',progress:null,cached:true}}),/Retry Amy/);
 assert.match(panel({amyState:{status:'ready',progress:100,cached:true}}),/Amy is ready/);
});
for(const status of ['idle','loading','error','ready'])test('start action checks current readiness: '+status,async()=>{
 let message;const canStartWithEnglishVoice=(_lang,_desktop,state)=>state.status==='ready';
 const start=handler('handleStart',{isDesktop:false,window:{},language:'en-US',englishVoice:'amy',getAmySpeechState:()=>({status}),canStartWithEnglishVoice,isValid:false,setError:value=>{message=value;}});
 await start();assert.match(message,status==='ready'?/fill in Job Description/:/English voice is ready/);
});
test('an unavailable browser voice does not bypass readiness',async()=>{
 let provider;let error;let disposed=0;
 const choose=handler('useBrowserEnglishVoice',{window:{speechSynthesis:{}},loadWebSpeechVoices:async()=>[],selectWebSpeechVoice:()=>undefined,setCheckingBrowserVoice(){},setBrowserVoiceError:value=>{error=value;},setEnglishVoice:value=>{provider=value;},disposeAmySpeech:()=>disposed++});
 await choose();assert.equal(provider,undefined);assert.equal(disposed,0);assert.match(error,/No English browser voice/);
});
test('an available English browser voice is explicitly selected and stops pending Amy work',async()=>{
 let provider;let error;let disposed=0;
 const choose=handler('useBrowserEnglishVoice',{window:{speechSynthesis:{}},loadWebSpeechVoices:async()=>[{lang:'en-US'}],selectWebSpeechVoice:voices=>voices[0],setCheckingBrowserVoice(){},setBrowserVoiceError:value=>{error=value;},setEnglishVoice:value=>{provider=value;},disposeAmySpeech:()=>disposed++});
 await choose();assert.equal(provider,'browser');assert.equal(disposed,1);assert.equal(error,'');
});
