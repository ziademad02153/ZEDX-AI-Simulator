// Live provider verification with synthetic input only; no real database or account operations.
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import nextEnv from '@next/env';
if (!process.argv.includes('--live')) throw new Error('Pass --live for synthetic provider verification');
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'synthetic-owner' } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { tier: 'ultra', subscription_expires_at: null } }) }) }) }),
    rpc: async name => ({ data: name === 'reserve_ai_question' ? { allowed: true, reservation_id: 'synthetic-turn' } : true })
};
const cache = new Map();
function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(path.join(process.cwd(), file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText, { exports, process, fetch, Request, Response, Blob, File, FormData, AbortController, setTimeout, clearTimeout,
        console: { log() {}, warn() {}, error() {} }, require(name) {
            if (name === 'next/server') return { NextResponse: { json: (body, options) => Response.json(body, options) } };
            if (name === '@supabase/supabase-js') return { createClient: () => client };
            if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
            if (name === './languages') return load('src/lib/languages.ts');
            throw new Error(`Unexpected dependency ${name}`);
        }
    });
    return exports;
}

const results=[];
const resume='Synthetic candidate Alex: junior software developer. Built CampusTasks, a React and Node.js task app with PostgreSQL. Personally implemented task API validation, pagination and tests. A duplicate submission bug was reproduced and fixed with an idempotency key. Worked with two classmates; resolved a disagreement by prototyping both options. No employment history or measured scale claims.';
const jd='Software developer: build reliable REST APIs, relational queries, tests and accessible React interfaces; collaborate on requirements.';

const mainQuestions=JSON.parse(readFileSync('.data/website-type-level-live.json','utf8'));
for(const item of mainQuestions.filter(x=>x.status===200)) {
 const {interviewType,difficulty}=item;
 const history=[{q:item.question.replace(/^\[NEXT_MAIN\]:?\s*/,''),a:'I made a change but have not explained my reasoning or checked the outcome yet.',type:'main'}];
 const before=Date.now();
 const response=await load('src/app/api/generate/route.ts').POST(new Request('https://test.local/api/generate',{
 method:'POST',headers:{Authorization:'Bearer synthetic-test','Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-oss-120b',promptType:'mock_interview',promptContext:{interviewType,difficulty,language:'en-US'},interviewHistory:history,forceNextMain:false,prompt:`The candidate gave an incomplete answer: ${JSON.stringify(history)}. Ask ONE focused missing detail using [FOLLOW_UP]:. Stay within the selected interview type and difficulty. Job Description Context: ${jd}\nResume Context: ${resume}`})}));
 const body=await response.json();const result={interviewType,difficulty,status:response.status,seconds:(Date.now()-before)/1000,question:body.content||null,error:body.error?.message||null};results.push(result);console.log(JSON.stringify(result));writeFileSync('.data/website-type-level-followups.json',JSON.stringify(results,null,2));if(response.status!==200)process.exitCode=1;
}
