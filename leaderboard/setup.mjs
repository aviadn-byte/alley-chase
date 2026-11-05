// Run manually after `npx wrangler@4 login`. Does not change a billing plan.
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('.',import.meta.url)),config=new URL('wrangler.json',import.meta.url);
function wrangler(args){const r=spawnSync('npx',['--yes','wrangler@4',...args],{cwd,encoding:'utf8',stdio:['inherit','pipe','pipe']});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.status!==0)throw new Error('Cloudflare step failed. Resolve the displayed error and run again.');return r.stdout;}
try{
 wrangler(['whoami']);
 if(!existsSync(config)){
  const output=wrangler(['d1','create','alley-chase-scores']);
  const id=output.match(/(?:database_id["']?\s*[:=]\s*["'])([a-f0-9-]{36})/i)?.[1];
  if(!id)throw new Error('Database was created but its ID could not be read. Do not create another database: use its ID to write wrangler.json.');
  writeFileSync(config,JSON.stringify({name:'alley-chase-scores',main:'worker.mjs',compatibility_date:'2026-01-01',workers_dev:true,vars:{ALLOWED_ORIGINS:'https://aviadn-byte.github.io'},d1_databases:[{binding:'DB',database_name:'alley-chase-scores',database_id:id,migrations_dir:'migrations'}]},null,2)+'\n');
 }
 wrangler(['d1','migrations','apply','alley-chase-scores','--remote']);
 const output=wrangler(['deploy']);
 const url=output.match(/https:\/\/alley-chase-scores\.[a-z0-9-]+\.workers\.dev\b/i)?.[0];
 if(!url)throw new Error('Deploy output did not include the public Worker URL. Keep the deployed service; do not recreate it.');
 const response=await fetch(url+'/top');if(!response.ok||!Array.isArray((await response.json()).entries))throw new Error('Public API verification failed. The game configuration was not changed.');
 writeFileSync(new URL('../leaderboard-config.js',import.meta.url),'window.ALLEY_LEADERBOARD_API = '+JSON.stringify(url)+';\n');
 console.log('Shared leaderboard verified. Commit leaderboard-config.js and publish the game to activate it.');
}catch(e){console.error(e.message);process.exitCode=1;}
