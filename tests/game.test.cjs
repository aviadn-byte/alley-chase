const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(), noop=()=>{};
const element=()=>({textContent:'',style:{},classList:{toggle:noop},setAttribute:noop,blur:noop});
const context={console,Math,Set,localStorage:{getItem:()=>null,setItem:noop},requestAnimationFrame:noop,
window:{addEventListener:noop},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},
querySelector:()=>({getContext:()=>({})}),querySelectorAll:()=>[],addEventListener:noop}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../game.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
function test(name,code){run("reset();state='playing';");run(code);console.log('PASS '+name);}
context.assert=assert;
test('top landing awards 100, bounces, preserves hearts',`
cat.x=100;cat.y=165;cat.vy=300;
let e={x:100,y:200,w:48,h:40,alive:true,kind:'guard'};
contactEnemy(e,{x:100,y:140,w:58,h:46},{x:100,y:200});
assert.equal(stompPoints,100);assert.equal(lives,3);assert.equal(e.alive,false);assert.ok(cat.vy<0);`);
test('side and underside hurt without score',`
cat.x=100;cat.y=200;cat.vy=-100;
contactEnemy({x:100,y:200,w:48,h:40,kind:'bird'},{x:100,y:220,w:58,h:46},{x:100,y:200});
assert.equal(lives,2);assert.equal(stompPoints,0);`);
test('upward bird does not turn an ascending cat into stomp',`
cat.x=100;cat.y=170;cat.vy=-100;
contactEnemy({x:100,y:200,w:48,h:40,kind:'bird'},{x:100,y:175,w:58,h:46},{x:100,y:240});
assert.equal(stompPoints,0);assert.equal(lives,2);`);
test('fast swept landing and edge miss',`
cat.x=120;cat.y=240;cat.vy=700;
contactEnemy({x:120,y:200,w:48,h:40,alive:true},{x:100,y:100,w:58,h:46},{x:120,y:200});
assert.equal(stompPoints,100);
cat.x=500;cat.y=240;cat.vy=700;
contactEnemy({x:120,y:200,w:48,h:40,alive:true},{x:500,y:100,w:58,h:46},{x:120,y:200});
assert.equal(stompPoints,100);`);
test('persistent dog stun prevents repeat points',`
cat.x=100;cat.y=165;cat.vy=300;
let d={x:100,y:200,w:48,h:44,stun:0};
const prev={x:100,y:140,w:58,h:46};
contactEnemy(d,prev,{x:100,y:200},true);
cat.y=165;cat.vy=300;contactEnemy(d,prev,{x:100,y:200},true);
assert.equal(stompPoints,100);assert.equal(d.stun,2);assert.equal(lives,3);`);
test('score combines distance fish and stomp and resets',`
maxDistance=1000;score=2;stompPoints=100;assert.equal(points(),300);
reset();assert.equal(points(),0);assert.equal(best,300);`);
test('dog catches a stationary cat, damage has recovery',`
platforms=[];puddles=[];cat.x=300;cat.vx=0;companion.x=100;
for(let i=0;i<100&&lives===3;i++)updateChaser(.016,{...cat});
assert.equal(lives,2);assert.ok(companion.stun>0);assert.ok(companion.x<=cat.x-160);
updateChaser(.016,{...cat});assert.equal(lives,2);`);
test('pursuer jumps obstacles',`
platforms=[{x:100,y:G-100,w:80,h:100}];puddles=[];cat.x=250;cat.vx=260;companion.x=40;companion.vx=240;
updateChaser(.016,{...cat});assert.ok(companion.vy<0);`);
test('pause freezes pursuit and score',`
state='paused';const x=companion.x;update(.033);assert.equal(companion.x,x);assert.equal(points(),0);`);
test('ten minute endless simulation stays finite and bounded',`
for(let i=0;i<36000;i++){
 if(state==='lost'){reset();state='playing';}
 if(i%32===0)jumpBuffer=.13;
 update(1/60);
 assert.ok(Number.isFinite(cat.x)&&Number.isFinite(companion.y));
 assert.ok(platforms.length<30&&enemies.length<30);
}
`);
test('stomps work with double jump and speed power',`
cat.x=120;cat.y=165;cat.vy=300;cat.jumps=2;speedTime=2;
contactEnemy({x:120,y:200,w:48,h:40,alive:true},{x:100,y:140,w:58,h:46},{x:120,y:200});
assert.equal(stompPoints,100);assert.equal(cat.jumps,0);assert.equal(lives,3);`);
test('removed enemy cannot award again through update',`
enemies=[{x:100,y:200,w:48,h:40,alive:false,home:100,phase:0,kind:'bird'}];
cat.x=100;cat.y=165;cat.vy=300;updateEnemies(.016,{x:100,y:140,w:58,h:46});
assert.equal(stompPoints,0);assert.equal(lives,3);`);
test('pause stops scheduled music',`
let stopped=0;musicNodes=[{stop:()=>stopped++}];pause();
assert.equal(stopped,1);assert.equal(musicNodes.length,0);assert.equal(state,'paused');`);
