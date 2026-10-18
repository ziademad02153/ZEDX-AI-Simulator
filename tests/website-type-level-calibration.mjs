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
const sessionLanguage=process.argv.includes('--arabic')?'ar-EG':'en-US';
const resume='Synthetic candidate Alex: junior software developer. Built CampusTasks, a React and Node.js task app with PostgreSQL. Personally implemented task API validation, pagination and tests. A duplicate submission bug was reproduced and fixed with an idempotency key. Worked with two classmates; resolved a disagreement by prototyping both options. No employment history or measured scale claims.';
const jd='Software developer: build reliable REST APIs, relational queries, tests and accessible React interfaces; collaborate on requirements.';
for(const interviewType of ['Role-Specific','Behavioral','Technical','Project Deep Dive']) {
 for(const difficulty of (process.argv.includes('--expert-only')?['Expert']:['Beginner','Intermediate','Expert'])) {
  const history=[{q:'Please introduce yourself.',a:'I am Alex, a software developer working with React, Node.js and PostgreSQL. I enjoy building reliable applications.',type:'main'}];
  const before=Date.now();
  const response=await load('src/app/api/generate/route.ts').POST(new Request('https://test.local/api/generate',{
   method:'POST',headers:{Authorization:'Bearer synthetic-test','Content-Type':'application/json'},
   body:JSON.stringify({model:'openai/gpt-oss-120b',promptType:'mock_interview',promptContext:{interviewType,difficulty,language:sessionLanguage},interviewHistory:history,forceNextMain:true,
   prompt:`Generate Main Question 2 using [NEXT_MAIN]:. Apply selected interview type and difficulty. Ask ONE focused question. Job Description Context: ${jd}\nResume Context: ${resume}\nPrevious exchange: ${JSON.stringify(history)}`})
  }));
  const body=await response.json();
  const item={interviewType,difficulty,status:response.status,seconds:(Date.now()-before)/1000,question:body.content||null,error:body.error?.message||null};
  results.push(item);console.log(JSON.stringify(item));
  writeFileSync(process.argv.includes('--expert-only')?`.data/website-type-level-${sessionLanguage}-expert.json`:sessionLanguage==='ar-EG'?'.data/website-type-level-arabic.json':'.data/website-type-level-live.json',JSON.stringify(results,null,2));
  if(response.status!==200){process.exitCode=1;}
 }

}
