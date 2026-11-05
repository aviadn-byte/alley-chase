'use strict';
(()=>{
 const $=id=>document.getElementById(id),api=(window.ALLEY_LEADERBOARD_API||'').replace(/\/$/,''),form=$('scoreForm');
 let generation=0,runPromise=null,finished=null,token=null,eligible=true;
 try{token=localStorage.getItem('alley-player-token');}catch{}
 if(!/^[a-f0-9]{64}$/.test(token||'')){token=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('alley-player-token',token);}catch{}}
 async function call(path,body){const r=await fetch(api+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Player-Token':token}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});const result=await r.json();if(!r.ok){const e=new Error(result.error);e.status=r.status;throw e;}return result;}
 async function refresh(){
  if(!api){$('leaderboardStatus').textContent='הטבלה המשותפת עדיין לא מחוברת. אפשר לשחק ולשמור שיא אישי במכשיר.';return;}
  try{const {entries}=await call('/top');const body=$('leaderboardRows');body.replaceChildren();
   if(!entries.length){$('leaderboardStatus').textContent='אין עדיין תוצאות. מי יקבע את השיא הראשון?';return;}
   entries.slice(0,10).forEach((entry,i)=>{const row=document.createElement('tr');[i+1,entry.nickname,entry.score].forEach(value=>{const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);});body.append(row);});
   $('leaderboardStatus').textContent='שיא אחד לכל שחקן בדפדפן הזה. הכינוי והניקוד גלויים לכולם.';
  }catch{$('leaderboardStatus').textContent='טבלת המובילים אינה זמינה כרגע. המשחק ממשיך כרגיל.';}
 }
 window.AlleyBoard={
  start(enabled){generation++;finished=null;eligible=enabled;form.hidden=true;$('saveScore').disabled=false;
   runPromise=api&&enabled?call('/start',{}).catch(()=>null):Promise.resolve(null);
  },
  disqualify(){eligible=false;},
  finish(result){if(finished)return;finished={...result,generation};refresh();
   if(!api)return;
   form.hidden=false;$('saveScore').disabled=!eligible;
   $('scoreMessage').textContent=eligible?'סיימתם עם '+result.score+' נקודות! בחרו כינוי כדי להשתתף בטבלת המובילים.':'זה היה משחק אימון ללא רודף; התוצאה אינה נכנסת לטבלה המשותפת.';
  }
 };
 form.addEventListener('submit',async e=>{e.preventDefault();if(!finished||!eligible)return;const snapshot=finished,gen=generation,button=$('saveScore');button.disabled=true;
  try{const session=await runPromise;if(!session)throw new Error('session');if(gen!==generation)return;
   await call('/submit',{...snapshot,run:session.run,nickname:$('playerNickname').value.trim()});
   if(gen!==generation)return;$('scoreMessage').textContent='התוצאה נשמרה. הטבלה מציגה את עשרת השיאים הגבוהים ביותר.';await refresh();
  }catch(err){if(gen!==generation)return;if(err.status===409){$('scoreMessage').textContent='התוצאה כבר נשלחה.';refresh();}else{button.disabled=false;$('scoreMessage').textContent=err.status===400?'בדקו שהכינוי מכיל 2–20 אותיות או ספרות. תוצאה לא תקינה לא נשמרת.':'לא הצלחנו לשמור כעת. נסו שוב; המשחק אינו מושפע.';}}
 });
 $('refreshLeaderboard').onclick=refresh;refresh();
})();
