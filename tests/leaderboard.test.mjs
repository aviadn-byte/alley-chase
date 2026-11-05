import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import worker,{validateScore} from '../leaderboard/worker.mjs';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../leaderboard/migrations/0001.sql',import.meta.url),'utf8'));
function statement(query,args=[]){const stmt=sql.prepare(query);return {bind(...a){return statement(query,a)},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}};}
const env={DB:{prepare:statement,async batch(statements){sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const player='a'.repeat(64),origin='https://aviadn-byte.github.io';
let now=Date.now();const original=Date.now;Date.now=()=>now;
async function call(path,body,token=player,customOrigin=origin){return worker.fetch(new Request('https://scores.example'+path,{method:body?'POST':'GET',headers:{Origin:customOrigin,'Content-Type':'application/json','X-Player-Token':token},body:body?JSON.stringify(body):undefined}),env);}
const b={distance:100,fish:2,stomps:1,score:300,nickname:'חתולה זריזה'};
assert.ok(validateScore(b,10));assert.ok(!validateScore({...b,score:999999},10));assert.ok(!validateScore({...b,distance:-1},10));
let r=await call('/start',{});assert.equal(r.status,200);let {run}=await r.json();now+=10000;
r=await call('/submit',{...b,run},'b'.repeat(64));assert.equal(r.status,404);
r=await call('/submit',{...b,run,nickname:'<script>'});assert.equal(r.status,400);
r=await call('/submit',{...b,run,score:999999});assert.equal(r.status,400);
r=await call('/submit',{...b,run});assert.equal(r.status,200);
r=await call('/submit',{...b,run});assert.equal(r.status,409);
let top=await (await call('/top')).json();assert.equal(top.entries[0].score,300);assert.equal(top.entries[0].nickname,b.nickname);assert.equal(Object.keys(top.entries[0]).length,2);
({run}=await (await call('/start',{})).json());now+=10000;
await call('/submit',{run,distance:10,fish:0,stomps:0,score:10,nickname:'אחר'});
top=await (await call('/top')).json();assert.equal(top.entries.length,1);assert.equal(top.entries[0].score,300);
for(let i=0;i<15;i++)sql.prepare('INSERT INTO players VALUES(?,?,?,?)').run('test'+i,'שחקן '+i,1000+i,now);
top=await (await call('/top')).json();assert.equal(top.entries.length,10);assert.equal(top.entries[0].score,1014);
r=await call('/start',{},player,'https://untrusted.example');assert.equal(r.status,403);
for(let i=0;i<35;i++)r=await call('/start',{});assert.equal(r.status,429);
now+=120000;r=await call('/start',{});assert.equal(r.status,200);
({run}=await r.json());now+=7201000;r=await call('/submit',{...b,run});assert.equal(r.status,400);
Date.now=original;sql.close();console.log('PASS database-backed leaderboard: score rules, ownership, names, replay, personal best, top ten, CORS, rate limit, expiry');
