'use strict';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
const W=1200,H=600,G=505,keys=new Set(),palettes=[['#f8ddbc','#efae92','#d98672'],['#d4e8df','#e1b89b','#acbea4'],['#c4bfdc','#c390a8','#857ba1']];
let state='ready',stage=0,score=0,lives=3,cam=0,time=0,last=0,inv=0,cat,platforms,fish,puddles,particles=[],jumpBuffer=0,coyote=0,sound=false,audio,photos={},dog=true;
let stompPoints=0;
let defaultCatPhoto=null;
if(typeof Image!=='undefined'){
 const im=new Image();im.onload=()=>{defaultCatPhoto=im;if(!photos.cat)photos.cat=im;};im.src='assets/shmil.jpg';
}
let enemies=[],shots=[],speedTime=0,speedCooldown=0,highTime=0,highCooldown=0,shotCooldown=0;
let mouse,companion,nextChunk=440,maxDistance=0,best=0,musicNext=0,musicStep=0,musicNodes=[];
try{best=Number(localStorage.getItem('alley-chase-best'))||0;}catch{}
function points(){return Math.floor(maxDistance/10)+score*50+stompPoints;}
function saveBest(){if(points()>best){best=points();try{localStorage.setItem('alley-chase-best',String(best));}catch{}}}
function body(x,w=58,h=46){return {x,y:G-h,w,h,vx:0,vy:0,jumps:0,face:1,grounded:true};}
function generate(){
 while(nextChunk<cat.x+W*2){
  const x=nextChunk,h=65+Math.floor(Math.random()*3)*24,w=78+Math.floor(Math.random()*2)*20;
  platforms.push({x,y:G-h,w,h});fish.push({x:x+w/2,y:G-h-45,taken:false});
  if(Math.random()<.55)fish.push({x:x+w+100,y:G-95,taken:false});
  if(x>1000&&Math.random()<.3)puddles.push({x:x+w+40,w:60});
  if(x>1400&&Math.random()<Math.min(.65,.25+maxDistance/30000)){
   const kind=Math.random()<.5?'bird':'guard',home=x+w+155;
   enemies.push({kind,home,x:home,y:G-40,w:48,h:40,phase:Math.random()*6,alive:true,dir:-1});
  }
  nextChunk+=430+Math.random()*150;
 }
 const cutoff=cam-600;
 platforms=platforms.filter(p=>p.x+p.w>cutoff);fish=fish.filter(f=>f.x>cutoff);
 puddles=puddles.filter(p=>p.x+p.w>cutoff);enemies=enemies.filter(e=>e.home+150>cutoff);
}
function reset(){saveBest();stopMusic();musicStep=0;stage=0;score=0;stompPoints=0;lives=3;cat=body(100);mouse=body(410,35,36);companion=body(-65,48,44);companion.stun=0;cam=0;maxDistance=0;nextChunk=440;inv=0;particles=[];keys.clear();jumpBuffer=0;coyote=.1;speedTime=0;speedCooldown=0;highTime=0;highCooldown=0;shotCooldown=0;shots=[];enemies=[];platforms=[];fish=[];puddles=[];generate();updatePowers();updateHUD();}
function updateHUD(){$('score').textContent=points()+' נק׳ · 🐟 '+score;$('lives').textContent='♥ '.repeat(lives)+'♡ '.repeat(3-lives);$('level').textContent=Math.floor(maxDistance/10)+' מ׳ · שיא '+Math.max(best,points());}
function stopMusic(){for(const n of musicNodes){try{n.stop();}catch{}}musicNodes=[];musicNext=0;}
function music(){
 if(!sound||state!=='playing'||!audio||audio.state!=='running')return;
 musicNodes=musicNodes.filter(n=>n.endAt>audio.currentTime);
 if(musicNext<audio.currentTime)musicNext=audio.currentTime;
 const beat=60/(140+Math.min(35,maxDistance/400))/2;
 const melody=[76,79,83,79,74,78,81,78,72,76,79,76,71,74,78,74];
 while(musicNext<audio.currentTime+.12){
  const note=(midi,type,volume,duration)=>{const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=440*2**((midi-69)/12);g.gain.setValueAtTime(0,musicNext);g.gain.linearRampToValueAtTime(volume,musicNext+.008);g.gain.exponentialRampToValueAtTime(.0001,musicNext+duration);o.connect(g);g.connect(audio.destination);o.start(musicNext);o.stop(musicNext+duration+.01);o.endAt=musicNext+duration+.01;o.onended=()=>{o.disconnect();g.disconnect();};musicNodes.push(o);};
  note(melody[musicStep%16],'triangle',.04,beat*.8);
  if(musicStep%2===0)note([45,43,41,40][Math.floor(musicStep/4)%4],'triangle',.055,beat*1.4);
  if(musicStep%4===0)note(33,'sine',.07,.07);
  musicNext+=beat;musicStep++;
 }
}
function unlockAudio(){if(sound){audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}}
function tone(f,d=.1){if(!sound)return;audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);}
function overlay(title,msg,button,over='ההרפתקה שלכם'){$('title').textContent=title;$('message').textContent=msg;$('start').textContent=button;$('overline').textContent=over;$('overlay').style.display='flex';}
function play(){const fresh=state==='ready'||state==='lost';if(state==='lost')reset();if(fresh)window.AlleyBoard?.start(dog);state='playing';document.body?.classList.add('game-active');unlockAudio();document.activeElement?.blur();keys.clear();$('overlay').style.display='none';$('pause').textContent='Ⅱ';updatePowers();}
function pause(){if(state==='playing'){state='paused';stopMusic();keys.clear();overlay('העכבר מחכה לכם','עוצרים רגע, ומיד ממשיכים.','חזרה למשחק ←');$('pause').textContent='▶';updatePowers();}else if(state==='paused')play();}
$('start').onclick=play;$('pause').onclick=pause;$('restart').onclick=()=>{reset();state='ready';play();};$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'מוזיקת מרדף ♫':'מוזיקה כבויה ♫';$('sound').setAttribute('aria-pressed',sound);if(sound)unlockAudio();else stopMusic();};
function down(k){if(state==='playing'&&!keys.has(k)){if(k==='ShiftLeft'||k==='ShiftRight')activate('speed');if(k==='KeyE')activate('high');if(k==='KeyF')activate('shot');}if(k==='KeyP'){pause();return;}if(['Space','ArrowUp','KeyW'].includes(k)&&!keys.has(k)&&state==='playing')jumpBuffer=.13;keys.add(k);}
window.addEventListener('keydown',e=>{if(e.target.matches('input,summary')||(['Enter','Space'].includes(e.code)&&e.target.matches('button')))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!e.repeat)down(e.code);});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('pagehide',saveBest);window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);down(b.dataset.key);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key);});
$('dogEnabled').onchange=e=>{dog=e.target.checked;if(!dog)window.AlleyBoard?.disqualify();if(dog){companion.x=cat.x-180;companion.stun=1;}};['cat','dog'].forEach(kind=>{$(kind+'Photo').onchange=e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')||file.size>10*1024*1024){$('uploadStatus').textContent='בחרו תמונה בגודל עד 10MB.';return;}const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{photos[kind]=im;URL.revokeObjectURL(url);$('uploadStatus').textContent='התמונה נוספה לדמות. נשמרת עד סגירת הדף.';};im.onerror=()=>{URL.revokeObjectURL(url);$('uploadStatus').textContent='לא ניתן לפתוח את התמונה. נסו PNG או JPG.';};im.src=url;};});$('clearPhotos').onclick=()=>{photos=defaultCatPhoto?{cat:defaultCatPhoto}:{};$('catPhoto').value='';$('dogPhoto').value='';$('uploadStatus').textContent='התמונות אופסו.';};
function burst(x,y,color){for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*160,vy:-Math.random()*160,t:.65,color});}
function update(dt){if(state!=='playing')return;time+=dt;music();inv=Math.max(0,inv-dt);speedTime=Math.max(0,speedTime-dt);highTime=Math.max(0,highTime-dt);speedCooldown=Math.max(0,speedCooldown-dt);highCooldown=Math.max(0,highCooldown-dt);shotCooldown=Math.max(0,shotCooldown-dt);updatePowers();jumpBuffer-=dt;coyote-=dt;const pace=260+Math.min(100,maxDistance/150);cat.vx+=((speedTime>0?540:pace)-cat.vx)*Math.min(1,dt*14);cat.face=1;
if(jumpBuffer>0&&(coyote>0||cat.jumps<2)){cat.vy=highTime>0?-760:-570;cat.jumps++;coyote=0;jumpBuffer=0;tone(cat.jumps===1?440:620);burst(cat.x+25,cat.y+cat.h,'#fff3c8');}
const oldX=cat.x,oldBottom=cat.y+cat.h;cat.x=Math.max(0,cat.x+cat.vx*dt);cat.vy+=1500*dt;cat.y+=cat.vy*dt;let grounded=false;
for(const p of platforms){if(cat.x+cat.w>p.x+5&&cat.x<p.x+p.w-5&&cat.y+cat.h>p.y&&cat.y<G){if(oldBottom<=p.y+4&&cat.vy>=0){cat.y=p.y-cat.h;cat.vy=0;grounded=true;}else if(oldX+cat.w<=p.x+9){cat.x=p.x-cat.w;cat.vx=0;}else if(oldX>=p.x+p.w-9){cat.x=p.x+p.w;cat.vx=0;}}}
if(cat.y+cat.h>=G){cat.y=G-cat.h;cat.vy=0;grounded=true;}if(grounded){cat.jumps=0;coyote=.1;}
for(const f of fish)if(!f.taken&&Math.hypot(cat.x+28-f.x,cat.y+20-f.y)<48){f.taken=true;score++;burst(f.x,f.y,'#f4bc4e');tone(880);updateHUD();}
for(const p of puddles)if(cat.x+cat.w-12>p.x&&cat.x+12<p.x+p.w&&cat.y+cat.h>=G-3)hurt('שלולית');
updateEnemies(dt,{x:oldX,y:oldBottom-cat.h,w:cat.w,h:cat.h});

maxDistance=Math.max(maxDistance,cat.x-100);cam+=(Math.max(0,cat.x-W*.3)-cam)*Math.min(1,dt*6);
generate();updateRunner(mouse,cat.x+310,dt);if(dog)updateChaser(dt,{x:oldX,y:oldBottom-cat.h,w:cat.w,h:cat.h});
$('progress').style.width=Math.min(100,((maxDistance/10)%1000)/10)+'%';
particles=particles.filter(p=>(p.t-=dt)>0);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;});updateHUD();if(state==='lost')window.AlleyBoard?.finish({score:points(),distance:Math.floor(maxDistance/10),fish:score,stomps:stompPoints/100});}
function updateChaser(dt,previousCat){
 const previous={x:companion.x,y:companion.y};
 companion.stun=Math.max(0,companion.stun-dt);
 if(companion.stun>0){
  companion.vx=0;companion.vy+=1500*dt;companion.y+=companion.vy*dt;
  if(companion.y+companion.h>=G){companion.y=G-companion.h;companion.vy=0;companion.grounded=true;}
  return;
 }
 // Keep pursuit visible after a sprint, but never teleport into the cat.
 if(companion.x<cat.x-650){companion.x=cat.x-650;companion.y=G-companion.h;companion.vy=0;}
 updateRunner(companion,cat.x-125,dt,true);
 contactEnemy(companion,previousCat,previous,true);
}
function updateRunner(r,target,dt,chasing=false){
 const desired=chasing?(r.x>cat.x-20?-90:Math.max(160,Math.min(580,240+Math.min(100,maxDistance/150)+(target-r.x)*1.4))):Math.max(0,Math.min(680,cat.vx+(target-r.x)*2));r.vx+=(desired-r.vx)*Math.min(1,dt*5);
 const look=r.w+r.vx*.36;
 const obstacle=platforms.some(p=>p.x>=r.x+r.w-4&&p.x<r.x+look&&p.y<r.y+r.h+5);
 const water=puddles.some(p=>p.x>=r.x&&p.x<r.x+look);
 if(r.grounded&&(obstacle||water)){r.vy=-620;r.grounded=false;}
 const oldBottom=r.y+r.h,oldX=r.x;r.x+=r.vx*dt;r.vy+=1500*dt;r.y+=r.vy*dt;r.grounded=false;
 for(const p of platforms)if(r.x+r.w>p.x&&r.x<p.x+p.w&&r.y+r.h>p.y){
  if(oldBottom<=p.y+4&&r.vy>=0){r.y=p.y-r.h;r.vy=0;r.grounded=true;}
  else if(oldX+r.w<=p.x+5&&r.y<G){r.x=p.x-r.w;r.vx=0;}
 }
 if(r.y+r.h>=G){r.y=G-r.h;r.vy=0;r.grounded=true;}
}
function activate(kind){
 if(state!=='playing')return;
 if(kind==='speed'&&speedCooldown===0){speedTime=2.5;speedCooldown=8;tone(750);}
 if(kind==='high'&&highCooldown===0){highTime=4;highCooldown=10;tone(950);}
 if(kind==='shot'&&shotCooldown===0){shots.push({x:cat.x+29+cat.face*33,y:cat.y+18,vx:cat.face*760,life:1.2});shotCooldown=.45;tone(500,.06);}
 updatePowers();
}
function updatePowers(){for(const [id,label,active,cool] of [['speedPower','⚡ ריצה',speedTime,speedCooldown],['highPower','↑ קפיצת־על',highTime,highCooldown],['shotPower','🐟 ירי',0,shotCooldown]]){const b=$(id);b.textContent=label+(active>0?' · פעיל '+Math.ceil(active)+'ש׳':cool>0?' · '+(cool<1?cool.toFixed(1):Math.ceil(cool))+'ש׳':' · מוכן');b.disabled=state!=='playing'||cool>0;b.classList.toggle('active',active>0);}}
for(const [id,kind] of [['speedPower','speed'],['highPower','high'],['shotPower','shot']])$(id).onclick=()=>{activate(kind);$(id).blur();};
function hurt(source){if(inv>0||state!=='playing')return;lives--;inv=1.6;cat.vy=-380;burst(cat.x+28,cat.y+25,'#d97b63');tone(160,.22);updateHUD();if(lives===0){state='lost';document.body?.classList.remove('game-active');stopMusic();saveBest();keys.clear();overlay('נתפסתם בסמטה!','המרדף נעצר בגלל '+source+'. '+points()+' נקודות, '+Math.floor(maxDistance/10)+' מטרים ו־'+score+' דגים. השיא שלכם: '+best+'.','מנסים שוב ←');updatePowers();}}
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
// Swept relative crossing: a descending cat must cross the enemy's top.
function contactEnemy(e,previousCat,previousEnemy,persistent=false){
 if(state!=='playing'||(persistent&&e.stun>0))return;
 const before=previousCat.y+previousCat.h-previousEnemy.y;
 const after=cat.y+cat.h-e.y;
 const crossing=after-before;
 const t=crossing>0?-before/crossing:-1;
 const cx=previousCat.x+(cat.x-previousCat.x)*t;
 const ex=previousEnemy.x+(e.x-previousEnemy.x)*t;
 if(cat.vy>0&&before<=0&&after>=0&&t>=0&&t<=1&&cx+cat.w-10>ex&&cx+10<ex+e.w){
  stompPoints+=100;cat.y=e.y-cat.h;cat.vy=-470;cat.jumps=0;coyote=0;
  if(persistent){e.stun=2;e.vx=0;}else e.alive=false;
  burst(e.x+e.w/2,e.y,'#f4bc4e');tone(980);updateHUD();
  return;
 }
 if(overlaps({x:cat.x+10,y:cat.y+7,w:cat.w-20,h:cat.h-7},e)){
  hurt(persistent?'הכלב הרודף':e.kind==='bird'?'ציפור השמירה':'כלב השמירה');
  if(persistent&&inv>0){e.x=Math.min(e.x,cat.x-160);e.stun=.7;e.vx=0;}
 }
}
function updateEnemies(dt,previousCat){
 for(const e of enemies){if(!e.alive)continue;e.previous={x:e.x,y:e.y};const old=e.x;e.x=e.home+Math.sin(time*(e.kind==='bird'?1.5:1.1)+e.phase)*(e.kind==='bird'?135:95);e.dir=e.x>=old?1:-1;e.y=e.kind==='bird'?G-120-Math.sin(time*2+e.phase)*75:G-40;
 if(e.kind==='guard')for(const p of platforms)if(e.x+e.w>p.x&&e.x<p.x+p.w)e.y=Math.min(e.y,p.y-e.h);
 }
 for(const shot of shots){const oldX=shot.x;shot.x+=shot.vx*dt;shot.life-=dt;const sweep={x:Math.min(oldX,shot.x)-16,y:shot.y-6,w:Math.abs(shot.x-oldX)+32,h:12};for(const e of enemies)if(e.alive&&overlaps(sweep,e)){e.alive=false;shot.life=0;burst(e.x+24,e.y+20,'#f4bc4e');tone(700);break;}}
 shots=shots.filter(s=>s.life>0);
 for(const e of enemies)if(e.alive)contactEnemy(e,previousCat,e.previous);
}
function drawEnemies(){
 for(const e of enemies){if(!e.alive)continue;const x=e.x+24,y=e.y+e.h;
 if(e.kind==='guard'){animal('guard',x,y,.9,e.dir,true);rr(x-23,e.y-13,46,5,2,'#c34c47');}
 else{ellipse(x,y-17,22,13,'#695777');const flap=Math.sin(time*16)*17;line([[x-5,y-20],[x-26,y-36+flap],[x-38,y-25+flap]],'#8b6c98',9);ellipse(x+e.dir*18,y-23,12,11,'#695777');ellipse(x+e.dir*22,y-25,2,2,'#fff');line([[x+e.dir*29,y-20],[x+e.dir*37,y-17]],'#e6ad49',5);rr(x-18,e.y-13,36,4,2,'#c34c47');}
 }
 for(const shot of shots){line([[shot.x-16,shot.y],[shot.x+16,shot.y]],'#fff8d9',4);for(let i=-8;i<=8;i+=8){line([[shot.x+i-4,shot.y-6],[shot.x+i,shot.y],[shot.x+i-4,shot.y+6]],'#fff8d9',2);}}
 if(speedTime>0)for(let i=1;i<=3;i++)line([[cat.x+25-cat.face*(30+i*10),cat.y+12*i],[cat.x+25-cat.face*(50+i*10),cat.y+12*i]],'#f6c34c',3);
 if(highTime>0){ctx.strokeStyle='#72bba8';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(cat.x+28,cat.y+cat.h+3,33,8,0,0,Math.PI*2);ctx.stroke();}
}
function rr(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}function line(points,color,width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
function facePhoto(kind,x,y,r){if(!photos[kind])return;ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();const im=photos[kind],s=Math.min(im.width,im.height);if(im===defaultCatPhoto)ctx.drawImage(im,190,260,190,190,x-r,y-r,r*2,r*2);else ctx.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,x-r,y-r,r*2,r*2);ctx.restore();}
function chaseDog(x,y,scale,dir,moving){
 ctx.save();ctx.translate(x,y);ctx.scale(scale*dir,scale);
 const gait=moving?Math.sin(time*13):0,wag=Math.sin(time*10)*9;
 ellipse(0,4,36,6,'#385c4430');
 line([[-26,-24],[-44,-39],[-47+wag,-59]],'#ba925f',7);
 for(let i=0;i<4;i++){const leg=-23+i*14,step=(i%2?1:-1)*gait*12;
  line([[leg,-25],[leg+step*.6,-12],[leg+step,0]],i%2?'#f8f5e8':'#d4d1c3',7);
  ellipse(leg+step+2,0,6,3,'#faf8ef');
 }
 ellipse(-3,-28,34,17,'#f1eee0');ellipse(-10,-35,22,11,'#bd9561');ellipse(-26,-29,10,12,'#bd9561');
 ellipse(22,-42,18,19,'#f4f1e5');ellipse(15,-51,9,10,'#bd9561');
 line([[11,-55],[3,-60],[7,-42]],'#4d483e',8);
 line([[27,-57],[34,-59],[34,-45]],'#625d50',6);
 ellipse(34,-35,14,9,'#faf8ee');ellipse(45,-36,5,4,'#323733');ellipse(29,-45,3,3.5,'#343932');ellipse(30,-46,1,1,'#fff');
 line([[25,-29],[32,-28]],'#514e45',2);
 if(moving){ellipse(36,-26,4,6,'#d9938e');}
 line([[13,-27],[27,-28]],'#415d58',4);facePhoto('dog',25,-43,17);
 if(companion.stun>0){ctx.fillStyle='#f2bd43';ctx.font='bold 18px Arial';ctx.fillText('✦',13,-72);ctx.fillText('✧',37,-65);}
 ctx.restore();
}
function animal(kind,x,y,scale=1,dir=1,moving=true){if(kind==='dog'){chaseDog(x,y,scale,dir,moving);return;}ctx.save();ctx.translate(x,y);ctx.scale(scale*dir,scale);const t=time*(moving?13:0),stride=moving?Math.sin(t)*9:0;const isCat=kind==='cat',isMouse=kind==='mouse',color=isCat?'#e7a05b':isMouse?'#91839e':'#ad8768';ellipse(0,4,31,6,'#385c4430');line([[-21,-18],[-40,-31],[-41,-48]],color,isMouse?3:9);for(let i=0;i<4;i++){let xx=-20+i*11;line([[xx,-17],[xx+((i%2)?stride:-stride),-2]],i%2?color:(isCat?'#bd7847':color),8);}ellipse(-4,-24,28,18,color);if(isCat){line([[-18,-36],[-13,-27]],'#b97b48',4);line([[-7,-40],[-2,-31]],'#b97b48',4);}ellipse(22,-39,20,19,color);if(isMouse){ellipse(12,-56,12,12,color);ellipse(12,-56,7,7,'#ceacb1');ellipse(34,-55,11,11,color);}else if(isCat){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(7,-50);ctx.lineTo(7,-69);ctx.lineTo(22,-54);ctx.lineTo(36,-68);ctx.lineTo(40,-45);ctx.fill();line([[12,-57],[12,-62]],'#d2837d',5);}else{ellipse(9,-39,9,22,'#735d50');ellipse(36,-37,8,19,'#735d50');}ellipse(31,-33,13,9,isCat?'#ffdfaf':'#dfc6b2');ellipse(31,-43,3,4,'#243d37');ellipse(43,-35,4,3,'#4b514e');if(isCat){line([[15,-20],[31,-22]],'#468e85',5);ellipse(29,-18,3,4,'#f7ce69');line([[34,-30],[49,-29]],'#7e6655',1);line([[35,-26],[48,-23]],'#7e6655',1);}facePhoto(kind,23,-42,19);ctx.restore();}
function background(){const p=palettes[stage],gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,p[0]);gr.addColorStop(1,'#ffe7be');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);ellipse(980-cam*.03,98,53,53,'#fff3cc');for(let i=-1;i<12;i++){const x=i*180-(cam*.18)%180;rr(x,160+(i%3)*28,160,290,4,'#dba99a45');}for(let i=-1;i<8;i++){let idx=Math.floor(cam*.42/230)+i,x=i*230-(cam*.42)%230,h=230+(Math.abs(idx)%3)*48,y=G-h-24;rr(x,y,216,h+30,5,idx%2?p[1]:p[2]);rr(x-5,y-10,226,15,3,'#f4d2af');for(let row=0;row<2;row++)for(let j=0;j<2;j++){const wx=x+32+j*103,wy=y+35+row*90;rr(wx,wy,44,60,18,'#735b5744');rr(wx+7,wy+8,30,43,13,'#506f6b');rr(wx-7,wy+8,12,48,2,'#87a394');rr(wx+39,wy+8,12,48,2,'#87a394');line([[wx+22,wy+8],[wx+22,wy+50]],'#d5c9a6',2);rr(wx-5,wy+56,54,6,2,'#f2d2b5');}rr(x+87,G-102,53,104,25,'#6a7e6d');rr(x+96,G-92,35,91,22,'#435e57');ellipse(x+123,G-46,3,3,'#dfb96e');}line([[0,150],[220,186],[470,156],[770,196],[1200,145]],'#677a6d88',2);for(let i=0;i<9;i++){const x=90+i*130,y=169+Math.sin(i)*12;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.8+i)*.04);rr(-18,0,36,36,3,['#f8e8c8','#80a99b','#e5a096'][i%3]);ctx.restore();}rr(0,G,W,H-G,0,'#d4bf96');rr(0,G,W,12,0,'#f0d9ae');for(let i=0;i<45;i++){const x=i*77-(cam%77),y=530+(i%3)*23;line([[x,y],[x+30,y]],'#b7a987',2);}}
function draw(){ctx.clearRect(0,0,W,H);background();ctx.save();ctx.translate(-cam,0);for(const p of platforms){ellipse(p.x+p.w/2,G+5,p.w*.65,9,'#4a62522a');rr(p.x,p.y,p.w,p.h,8,'#527e75');rr(p.x+7,p.y+9,p.w-14,p.h-12,5,'#63968a');for(let j=15;j<p.w-5;j+=18)rr(p.x+j,p.y+17,5,p.h-23,2,'#4b7b70');rr(p.x-6,p.y-7,p.w+12,12,4,'#3c655f');rr(p.x+p.w/2-12,p.y-13,24,7,3,'#3c655f');}
for(const p of puddles){ellipse(p.x+p.w/2,G+5,p.w/2,8,'#739fa3');ellipse(p.x+p.w/2-9,G+3,p.w*.26,2,'#c8e0d5');}
for(const f of fish)if(!f.taken){const y=f.y+Math.sin(time*3+f.x)*5;ellipse(f.x,y,13,7,'#edb650');ctx.fillStyle='#edb650';ctx.beginPath();ctx.moveTo(f.x-9,y);ctx.lineTo(f.x-22,y-8);ctx.lineTo(f.x-22,y+8);ctx.fill();ellipse(f.x+7,y-1,1.5,1.5,'#7c673c');}
drawEnemies();
animal('mouse',mouse.x+17,mouse.y+mouse.h,.65,1,state==='playing'&&mouse.grounded);if(dog){animal('dog',companion.x+24,companion.y+companion.h,.8,companion.vx<0?-1:1,state==='playing'&&companion.grounded&&companion.stun===0);if(companion.stun>0){ctx.fillStyle='#f4bc4e';ctx.font='bold 24px Arial';ctx.fillText('✦ ✦',companion.x,companion.y-18);}}if(inv<=0||Math.floor(inv*12)%2===0)animal('cat',cat.x+26,cat.y+cat.h,1,cat.face,state==='playing'&&Math.abs(cat.vx)>20);for(const p of particles){ctx.globalAlpha=Math.max(0,p.t/.65);ellipse(p.x,p.y,4,4,p.color);}ctx.globalAlpha=1;ctx.restore();}
function frame(t){const dt=Math.min((t-last)/1000||0,.033);last=t;update(dt);draw();requestAnimationFrame(frame);}reset();requestAnimationFrame(frame);
