import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const old={rubric_version:'1.3',marker:'original-report'};
const fresh={candidate:{language:'en-US'},overall_evaluation:{executive_summary:'Fresh evaluation'},competencies:['role_and_domain_competence','problem_solving_and_judgment','communication_and_clarity','behavioral_and_professional_effectiveness','execution_and_role_readiness'].map(key=>({key,name:key,weight_pct:20,weight_rationale:'Relevant to the role',bars_score:4,evidence_status:'Sufficient',traceable_evidence:['Check credentials'],observable_behaviors:[],observed_gaps:[]})),questions_assessment:[{question_number:1,question_text:'Explain authentication',candidate_answer:'Check credentials',bars_score:4,scoring_rationale:'Valid authentication concept',benchmark_model:'Verify identity and credentials'}],action_plan_7_days:[1,2,3].map(day=>({day_range:'Day '+day,focus_area:'Practice',actions:['Practice explaining authentication'],expected_outcome:'Clearer answers'}))};
function route({authorized=true,owns=true,allowed=true,rateError=null,aiFail=false,saveFail=false,legacy=false,noExchanges=false}={}) {
 const interview={id:'interview',title:'Interview',created_at:'2026-10-08T00:00:00Z',analysis:{language:'en-US',session_mode:'mock_interview',resume_text:'Test',session_exchanges:[{index:1,mainQuestionIndex:0,type:'main',question:'Explain authentication',answer:'Check credentials'}],...(legacy?{scorecard:{marker:'legacy-report'}}:{rubric_report:old})}};
 if(noExchanges)interview.analysis.session_exchanges=[];
 const state={aiCalls:0,saves:0,rateCalls:0,monthlyQueries:0,ownership:[],interview};
 const client={auth:{getUser:async()=>({data:{user:authorized?{id:'owner',user_metadata:{name:'Test'}}:null}})},rpc:async(name,args)=>{assert.equal(name,'check_rate_limit');assert.equal(args.p_user_id,'owner');state.rateCalls++;return {data:allowed,error:rateError};},from(table){
  if(table==='profiles')return {select:()=>({eq:()=>({single:async()=>({data:{tier:'free'}})})})};
  const query={select(){return query},eq(k,v){state.ownership.push([k,v]);return query},gte(){state.monthlyQueries++;return query},single:async()=>({data:owns?interview:null,error:owns?null:{message:'not found'}})};
  query.update=payload=>({eq:async()=>{if(saveFail)return {error:{message:'save failed'}};state.saves++;interview.analysis=payload.analysis;return {};}});
  return query;
 }};
 const cache=new Map();
 function load(path){
  if(cache.has(path))return cache.get(path);
  const exports={};cache.set(path,exports);
  const code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,process:{env:{GROQ_API_KEY:'test-key'}},Request,Response,AbortController,setTimeout,clearTimeout,console:{warn(){},error(){}},fetch:async()=>{state.aiCalls++;if(aiFail)throw Error('provider failed');return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(fresh)}}]})},require(name){
   if(name==='next/server')return {NextResponse:{json:(body,opts)=>Response.json(body,opts)}};
   if(name==='@supabase/supabase-js')return {createClient:()=>client};
   if(name==='@/lib/interview-service')return {interviewService:{getPresentationAssessmentId:()=> 'TEST'}};
   if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
   if(name==='./languages')return load('src/lib/languages.ts');
   throw Error(name);
  }});return exports;
 }
 const POST=load('src/app/api/generate-report/route.ts').POST;
 return {state,request:(body={})=>POST(new Request('https://test.local/api/generate-report',{method:'POST',headers:{Authorization:'Bearer test-token'},body:JSON.stringify({interviewId:'interview',...body})}))};
}
test('normal viewing returns the saved report without calling the provider',async()=>{const app=route();const res=await app.request();assert.equal(res.status,200);assert.equal((await res.json()).rubric_report.marker,'original-report');assert.equal(app.state.aiCalls,0);assert.equal(app.state.saves,0);});
test('explicit regeneration invokes evaluator, replaces saved report and does not count this interview again against monthly allowance',async()=>{const app=route();const res=await app.request({regenerate:true});assert.equal(res.status,200,JSON.stringify(await res.clone().json()));const body=await res.json();assert.equal(body.rubric_report.overall_evaluation.executive_summary,'Fresh evaluation');assert.equal(body.rubric_report.marker,undefined);assert.equal(app.state.aiCalls,1);assert.equal(app.state.saves,1);assert.equal(app.state.monthlyQueries,0);assert.equal(app.state.rateCalls,1);assert.ok(app.state.ownership.some(([k,v])=>k==='user_id'&&v==='owner'));});
test('a legacy report can be explicitly regenerated',async()=>{const app=route({legacy:true});const res=await app.request({regenerate:true});assert.equal(res.status,200);assert.equal(app.state.saves,1);assert.equal((await res.json()).rubric_report.overall_evaluation.executive_summary,'Fresh evaluation');});
test('string truthiness cannot accidentally regenerate a report',async()=>{const app=route();await app.request({regenerate:'true'});assert.equal(app.state.aiCalls,0);});
for(const [name,opts,status] of [['expired login',{authorized:false},401],['another user interview',{owns:false},404],['rate limit',{allowed:false},429],['usage verification unavailable',{rateError:{message:'offline'}},503]])test(name+' prevents regeneration',async()=>{const app=route(opts);const res=await app.request({regenerate:true});assert.equal(res.status,status);assert.equal(app.state.aiCalls,0);assert.equal(app.state.saves,0);assert.equal(app.state.interview.analysis.rubric_report.marker,'original-report');});
for(const [name,opts] of [['provider failure',{aiFail:true}],['persistence failure',{saveFail:true}]])test(name+' preserves the original report for retry',async()=>{const app=route(opts);const res=await app.request({regenerate:true});assert.equal(res.status,500);assert.equal(app.state.saves,0);assert.equal(app.state.interview.analysis.rubric_report.marker,'original-report');});

test('missing original responses prevents destructive regeneration',async()=>{const app=route({noExchanges:true});const res=await app.request({regenerate:true});assert.equal(res.status,400);assert.equal(app.state.aiCalls,0);assert.equal(app.state.saves,0);assert.equal(app.state.interview.analysis.rubric_report.marker,'original-report');});
