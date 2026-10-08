import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
 if(cache.has(path)) return cache.get(path);
 const exports={};cache.set(path,exports);
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,console,URL,Response,Request,AbortController,setTimeout,clearTimeout,process:{env:{}},require(name){
  if(name==='react'||name==='react/jsx-runtime')return nodeRequire(name);
  if(name==='next/link')return {__esModule:true,default:({children,href})=>React.createElement('a',{href},children)};
  if(name==='lucide-react')return new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
  if(name==='react-markdown')return {__esModule:true,default:({children})=>children};
  if(name==='@/components/ui/button')return {Button:({children,...props})=>React.createElement('button',props,children)};
  if(name==='@/lib/supabase')return {supabase:{}};
  if(name==='@/lib/session-sync')return {syncServerSession:()=>{}};
  if(name.startsWith('@/'))return load('src/'+name.slice(2)+(name.includes('/components/')?'.tsx':'.ts'));
  if(name==='./languages')return load('src/lib/languages.ts');
  throw Error('Unexpected dependency '+name);
 }});
 return exports;
}
const {SUPPORTED_LANGUAGES}=load('src/lib/languages.ts');
const {getReportLabels,REPORT_LABEL_KEYS,reportStatusLabel,reportMetadataLabel}=load('src/lib/report-labels.ts');
const {enforceRubric13ReportSchema,FIXED_COMPETENCY_KEYS}=load('src/lib/rubric-evaluator.ts');
const {generateExecutiveReportHtml}=load('src/lib/pdf-report-generator.ts');
const {RubricReportView}=load('src/components/report/rubric-report-view.tsx');
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
for(const language of SUPPORTED_LANGUAGES) {
 test(language.code+': localized headings are actually rendered in the web view and print HTML',()=>{
  const context={assessmentId:'LOCALIZATION',assessmentDate:'2026-10-08T00:00:00Z',candidateName:'Test',targetRole:'Test',track:'Technical',interviewType:'Technical',difficulty:'Intermediate',language:language.code,strictLanguage:true,evaluatorModel:'test',sessionExchanges:[{index:1,type:'main',mainQuestionIndex:0,question:language.q2,answer:language.q1}]};
  const raw={candidate:{language:language.code},overall_evaluation:{executive_summary:language.q1},competencies:FIXED_COMPETENCY_KEYS.map(key=>({key,name:language.native,weight_pct:20,weight_rationale:language.q1,bars_score:5,evidence_status:'Sufficient',traceable_evidence:[language.q1],observable_behaviors:[language.q1],observed_gaps:[]})),questions_assessment:[{question_number:1,question_text:language.q2,candidate_answer:language.q1,bars_score:5,strengths:[language.q1],gaps:[],scoring_rationale:language.q1,benchmark_model:language.q2}],action_plan_7_days:[1,2,3].map(()=>({day_range:language.q1,focus_area:language.q1,actions:[language.q2],expected_outcome:language.q1}))};
  const report=enforceRubric13ReportSchema(raw,context);
  const labels=getReportLabels(language.code,true);
  assert.equal(Object.keys(labels).length,REPORT_LABEL_KEYS.length);
  for(const value of Object.values(labels))assert.ok(value.trim());
  const html=generateExecutiveReportHtml(report,true);
  const screen=renderToStaticMarkup(React.createElement(RubricReportView,{interview:{id:'test',analysis:{session_mode:'mock_interview'}},rubricReport:report}));
  for(const key of ['score','summary','competencies','strengths','gaps','questions','response','rationale','ideal','metrics','plan','actions','outcome']) {
   assert.ok(screen.includes(escape(labels[key])), 'screen missing '+key);
   if(key!=='questions')assert.ok(html.includes(escape(labels[key])), 'print missing '+key);
  }
  assert.ok(screen.includes(escape(labels.back)));
  assert.ok(screen.includes(escape(labels.pdf)));
  assert.ok(html.includes(escape(labels.report)));
  assert.ok(screen.includes(escape(reportStatusLabel('Distinguished',labels))));
  assert.ok(html.includes(escape(reportStatusLabel('Distinguished',labels))));
  const metadata=reportMetadataLabel('Intermediate',language.code,true);
  assert.ok(screen.includes(escape(metadata)));
  assert.ok(html.includes(`dir="${language.code.startsWith('ar')?'rtl':'ltr'}"`));
  if(language.code!=='en-US') {
   assert.ok(!html.includes('Performance Summary'));
   assert.ok(!html.includes('Evaluation Mode'));
   assert.ok(!html.includes('Observable Strengths'));
   assert.ok(!screen.includes('Save as PDF'));
   assert.ok(!html.includes('Complete targeted domain architecture review'));
  }
  const desktop=generateExecutiveReportHtml(report,false);
  assert.ok(desktop.includes('Performance Summary'));
  assert.equal(getReportLabels(language.code,false).summary,'Performance Summary');
  assert.equal(reportMetadataLabel('Intermediate',language.code,false),'Intermediate');
  if(process.env.REPORT_PREVIEW_DIR) {
   mkdirSync(process.env.REPORT_PREVIEW_DIR,{recursive:true});
   writeFileSync(process.env.REPORT_PREVIEW_DIR+'/'+language.code+'.html',html);
   writeFileSync(process.env.REPORT_PREVIEW_DIR+'/'+language.code+'-screen.html','<!doctype html><html lang="'+language.code+'"><meta charset="utf-8"><body>'+screen+'</body></html>');
  }
 });
}
