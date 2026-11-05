// Local integration preview. Scores exist only in this process, never in production.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../leaderboard/worker.mjs';
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../leaderboard/migrations/0001.sql',import.meta.url),'utf8'));
function stmt(q,args=[]){const s=db.prepare(q);return {bind(...a){return stmt(q,a)},async first(){return s.get(...args)||null},async all(){return {results:s.all(...args)}},async run(){return {meta:{changes:Number(s.run(...args).changes)}}}};}
const env={ALLOWED_ORIGINS:'http://127.0.0.1:8128',DB:{prepare:stmt,async batch(list){db.exec('BEGIN');try{const a=[];for(const s of list)a.push(await s.run());db.exec('COMMIT');return a;}catch(e){db.exec('ROLLBACK');throw e;}}}};
http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://127.0.0.1:8128').pathname;
 if(['/top','/start','/submit'].includes(path)){let b=[];for await(const c of req)b.push(c);const r=await worker.fetch(new Request('http://127.0.0.1:8128'+path,{method:req.method,headers:req.headers,body:req.method==='POST'?Buffer.concat(b):undefined}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 if(path==='/leaderboard-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end("window.ALLEY_LEADERBOARD_API='http://127.0.0.1:8128';");return;}
 const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/game.js':'game.js','/leaderboard.js':'leaderboard.js'};
 if(!files[path]){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(new URL('../'+files[path],import.meta.url)));
}catch(e){console.error(e.message);res.writeHead(500);res.end('Preview error');}}).listen(8128,'127.0.0.1',()=>console.log('Local integration preview: http://127.0.0.1:8128 (temporary test scores only)'));
