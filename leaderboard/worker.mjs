const ID=/^[a-f0-9]{64}$/;
export function validateScore(b,elapsed){
 if(!b||typeof b!=='object'||!Number.isFinite(elapsed)||elapsed<1||elapsed>7200)return false;
 for(const k of ['score','distance','fish','stomps'])if(!Number.isSafeInteger(b[k])||b[k]<0)return false;
 return b.score===b.distance+b.fish*50+b.stomps*100 && b.distance<=elapsed*54+5 && b.fish<=Math.floor(b.distance/43)*2+4 && b.stomps<=elapsed*4 && b.score<=elapsed*300+500;
}
const hex=bytes=>[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async s=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'',allowed=(env.ALLOWED_ORIGINS||'https://aviadn-byte.github.io').split(',');
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(allowed.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Player-Token'});
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed.includes(origin))return reply({error:'origin'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(request.url).pathname;
  try{
   if(request.method==='GET'&&path==='/top'){
    const rows=await env.DB.prepare('SELECT nickname, score FROM players WHERE score > 0 ORDER BY score DESC, updated ASC, id ASC LIMIT 10').all();
    return reply({entries:rows.results});
   }
   if(request.method!=='POST'||!['/start','/submit'].includes(path))return reply({error:'not_found'},404);
   if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return reply({error:'content_type'},415);
   // Count writes before parsing, and keep no raw IP addresses in the database.
   const now=Date.now(),bucket=Math.floor(now/60000),key=await hash((request.headers.get('CF-Connecting-IP')||'local')+':'+bucket);
   const rate=await env.DB.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+120000).first();
   if(rate.count>30)return reply({error:'rate_limit'},429);
   const reader=request.body?.getReader();if(!reader)return reply({error:'body'},400);
   let size=0,chunks=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply({error:'too_large'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   let b;try{b=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'json'},400);}
   const playerToken=request.headers.get('X-Player-Token');
   if(!ID.test(playerToken||''))return reply({error:'player_token'},401);
   const player=await hash(playerToken);
   if(path==='/start'){
    const run=token();
    await env.DB.batch([
     env.DB.prepare('INSERT OR IGNORE INTO players(id) VALUES(?)').bind(player),
     env.DB.prepare('INSERT INTO runs(id,player,started) VALUES(?,?,?)').bind(run,player,now),
     env.DB.prepare('DELETE FROM runs WHERE started < ?').bind(now-7200000),
     env.DB.prepare('DELETE FROM rate_limits WHERE expires < ?').bind(now),
     env.DB.prepare("DELETE FROM players WHERE score=0 AND id NOT IN (SELECT player FROM runs)")
    ]);
    return reply({run});
   }
   if(!ID.test(b?.run||''))return reply({error:'run'},400);
   const r=await env.DB.prepare('SELECT * FROM runs WHERE id=? AND player=?').bind(b.run,player).first();
   if(!r)return reply({error:'run'},404);
   if(r.consumed)return reply({error:'already_submitted'},409);
   const nickname=typeof b.nickname==='string'?b.nickname.normalize('NFKC').trim():'';
   if(!/^[\p{L}\p{N} _-]{2,20}$/u.test(nickname)||!validateScore(b,(now-r.started)/1000))return reply({error:'invalid_score_or_name'},400);
   // D1 batch is transactional: only the unconsumed run can change the score.
   const results=await env.DB.batch([
    env.DB.prepare('UPDATE players SET nickname=?, score=?, updated=? WHERE id=? AND score < ? AND EXISTS(SELECT 1 FROM runs WHERE id=? AND player=? AND consumed=0)').bind(nickname,b.score,now,player,b.score,b.run,player),
    env.DB.prepare('UPDATE runs SET consumed=1 WHERE id=? AND player=? AND consumed=0').bind(b.run,player)
   ]);
   if(!results[1].meta.changes)return reply({error:'already_submitted'},409);
   return reply({saved:true});
  }catch{return reply({error:'unavailable'},503);}
 }
};
