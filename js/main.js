import {$,rand,ri,pick,clamp,TOUCH} from './util.js';
import {save,persist,rec,weakness,fmtKey,levelKey,mode,choiceMode} from './save.js';
import {audio,SFX,setVolume} from './audio.js';
import {THREE,scene,V,FX,labelsEl,gridPush,emit,burst,shockwave,firework,clearFireworks,polyGeo,glowMat,toScreen,fxStep,fxRender} from './fx.js';
import {makeChoices} from './choices.js';
import {createTens} from './tens.js';
import {createKids} from './kids.js';
import {CHAPTERS,LV,chapterById} from './curriculum/index.js';

// enemy look per level kind
const STYLES={
  tbl:{sides:4,inner:0,r:2.2,rot:Math.PI/2,color:'#22e6ff'},
  ext:{sides:4,inner:.42,r:2.6,rot:Math.PI/2,color:'#4dff6a'},
  sq:{sides:4,inner:0,r:2.5,rot:Math.PI/4,color:'#ff3df0'},
  '2x1':{sides:3,inner:0,r:2.7,rot:-Math.PI/2,color:'#ffa31a'},
  pat:{sides:6,inner:0,r:2.6,rot:0,color:'#fff23a'},
  twin:{sides:6,inner:.55,r:2.9,rot:Math.PI/2,color:'#a66bff'},
  boss:{sides:8,inner:0,r:3.2,rot:Math.PI/8,color:'#ff2a6d'},
  bond:{sides:5,inner:.5,r:2.8,rot:Math.PI/2,color:'#4dff6a'},
  bridge:{sides:4,inner:0,r:2.3,rot:Math.PI/2,color:'#22e6ff'},
  a21:{sides:3,inner:0,r:2.7,rot:-Math.PI/2,color:'#ffa31a'},
  a22:{sides:4,inner:.42,r:2.7,rot:Math.PI/4,color:'#ff3df0'},
  big:{sides:8,inner:0,r:3.2,rot:Math.PI/8,color:'#a66bff'},
  sub:{sides:6,inner:.55,r:2.8,rot:0,color:'#ff2a6d'},
};
const BIG=new Set(['boss','big']);
// stats track recall; recognising an answer from a list isn't recall, and '~' problems aren't facts
const recFact=(key,ok,t)=>{if(!choiceMode()&&!key.startsWith('~'))rec(key,ok,t)};

// pick next problem for a source level, biased toward weak facts
function choosePair(src,recent){
  if(src.gen)return src.gen();
  const pool=src._pool||(src._pool=src.pool());
  const keyOf=src.key||src.ch.mastery.key;
  let tot=0;const w=pool.map(([a,b])=>{
    const k=keyOf(a,b);
    const v=recent.includes(k)?0.02:weakness(k,src.par);tot+=v;return v});
  let r=Math.random()*tot;
  for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i]}
  return pool[pool.length-1];
}

// ================= game state =================
let state='chapters',G=null,enemies=[],shots=[],buf='',gtime=0;
let chapter=chapterById(save.settings.chapter);
const shotGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.6,0),new THREE.Vector3(0,1.6,0)]);
const shotColor=new THREE.Color('#fff6c0');
const mult=()=>G.mult;
const worldOf=lv=>lv.ch.worlds[lv.w];

// ================= endless runs (Geometry Wars scoring) =================
// A run only ends when your shields are gone. Every wave asks for ~25% more answers per
// second, but no single problem falls faster than ~2.4x your own recent answer time, so
// a hard problem is always solvable; the pressure comes from volume.
// Score = enemy value x wave x multiplier. The multiplier climbs +1 per correct answer,
// halves on a wrong answer and resets on a shield hit, so long clean streaks deep into
// the waves are worth orders of magnitude more than a decent run.
const MAX_MULT=999;
const waveSize=lv=>lv.game==='tens'?3:10;
const unitPts=lv=>lv.game==='tens'?15:lv.mix?lv.mix.reduce((a,id)=>a+LV[id].pts,0)/lv.mix.length:lv.pts;
const nice=v=>{const p=10**Math.max(0,Math.floor(Math.log10(v))-1);return Math.round(v/p)*p};
// score of k straight answers with the multiplier climbing 1 per answer
function series(k,ws){let s=0;for(let i=1;i<=k;i++)s+=i*(1+Math.floor(i/ws));return s}
function goalsFor(lv){
  const t=lv.game==='tens',B=unitPts(lv)*10*1.5,k=t?lv.count*6:lv.count,ws=t?18:10;
  return[nice(B*series(k,ws)*.35),nice(B*series(Math.round(k*1.6),ws)*.6),nice(B*series(Math.round(k*2.4),ws)*1.1)];
}
const starsFor=(score,goals)=>goals.filter(g=>score>=g).length;
const STAR_NAME=['','BRONZE','SILVER','GOLD'],STAR_COLOR=['#7d93b8','#e08a4a','#cfe0ff','#ffd84a'];
const ramp=()=>1+.25*(G.wave-1); // answers/second multiplier
function pace(){const t=G.times.slice(-8);return t.length?t.reduce((a,b)=>a+b,0)/t.length:G.lv.par}
const timeScale=()=>G.buffs.slow>0?.45:1;
const speedBonus=(t,par)=>1+clamp((par*2-t)/(par*2),0,1);
// base points for an answer: worth more every wave, then multiplied
function addScore(base,multiplied=true){
  const p=Math.round(base*10*G.wave*(multiplied?G.mult:1)*(G.buffs.over>0?2:1));
  const before=starsFor(G.score,G.goals);G.score+=p;
  const after=starsFor(G.score,G.goals);
  if(after>before){toast(STAR_NAME[after]+' '+'★'.repeat(after),STAR_COLOR[after],`${G.goals[after-1].toLocaleString()} reached`);SFX.star()}
  return p;
}
function onHit(t){
  G.times.push(t);G.hits++;G.combo++;G.bestCombo=Math.max(G.bestCombo,G.combo);
  G.mult=Math.min(MAX_MULT,G.mult+1);G.bestMult=Math.max(G.bestMult,G.mult);
  if(G.combo%10===0)grantBuff();
}
function onWrong(){G.misses++;G.combo=0;G.mult=Math.max(1,Math.floor(G.mult/2))}
function onShieldHit(){G.lives--;G.crashes++;G.combo=0;G.mult=1}
function onResolved(){
  G.resolved++;const w=1+Math.floor(G.resolved/waveSize(G.lv));
  if(w>G.wave){G.wave=w;toast(`WAVE ${w}`,'#22e6ff','faster · worth more');SFX.wave()}
}
// streak rewards: every 10 in a row
const BUFFS={
  slow:{name:'SLOW-MO',color:'#22e6ff',dur:6,sub:'6 seconds'},
  over:{name:'OVERDRIVE',color:'#ff3df0',dur:8,sub:'×2 score · 8 seconds'},
  nova:{name:'NOVA',color:'#fff23a',sub:'saves your next hit'},
  shield:{name:'+1 SHIELD',color:'#4dff6a',sub:'shield restored'},
};
function grantBuff(){
  const opts=['slow','over','over'];
  if(G.buffs.nova<2)opts.push('nova','nova');
  if(G.lives<G.maxLives)opts.push('shield','shield','shield');
  const k=pick(opts),b=BUFFS[k];
  if(k==='shield')G.lives++;else if(k==='nova')G.buffs.nova++;else G.buffs[k]=b.dur;
  toast(b.name,b.color,`${G.combo} streak · ${b.sub}`);SFX.buff();updateHUD();
}
function buffsStep(dt){for(const k of ['slow','over'])if(G.buffs[k]>0)G.buffs[k]=Math.max(0,G.buffs[k]-dt)}
// spend a nova instead of losing a shield (keeps the multiplier alive)
function useNova(){if(G.buffs.nova<=0)return false;G.buffs.nova--;toast('NOVA','#fff23a','shield saved · multiplier kept');updateHUD();return true}
function toast(text,color,sub=''){
  const d=document.createElement('div');d.className='toast';d.style.setProperty('--c',color);
  d.innerHTML=text+(sub?`<small>${sub}</small>`:'');
  d.addEventListener('animationend',()=>d.remove());$('toasts').appendChild(d);
}

function newRun(lv){
  G={lv,t:0,spawned:0,resolved:0,lives:5,maxLives:5,score:0,combo:0,bestCombo:0,hits:0,misses:0,crashes:0,
     times:[],log:[],lastShot:0,spawnT:.8,queue:[],recent:[],ending:0,wave:1,mult:1,bestMult:1,goals:goalsFor(lv),buffs:{slow:0,over:0,nova:0}};
}
function removeEnemy(e){
  scene.remove(e.g);e.g.children.forEach(c=>c.material.dispose());e.el.remove();
  const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);
}
function killShot(s){scene.remove(s.m);s.m.material.dispose();shots.splice(shots.indexOf(s),1)}
function clearField(){
  [...enemies].forEach(removeEnemy);[...shots].forEach(killShot);
  labelsEl.querySelectorAll('.pop').forEach(n=>n.remove());clearFireworks();$('toasts').innerHTML='';
  tens.stop();kids.stop();document.body.classList.remove('kidsmode');hideChoices();target=null;
  buf='';renderInput();
}

// ---------- multiple choice (easy / kids) ----------
let choiceCb=null,choiceVals=[];
// digits can't pick between numbers, so choices use arrows (DDR order) or the home row
const CHOICE_KEYS={4:[['ArrowLeft','d'],['ArrowDown','f'],['ArrowUp','j'],['ArrowRight','k']],
                   3:[['ArrowLeft','f'],['ArrowUp','ArrowDown','h','g'],['ArrowRight','j']]};
const ARROW={ArrowLeft:'←',ArrowDown:'↓',ArrowUp:'↑',ArrowRight:'→'};
const choiceIndex=k=>{const ks=CHOICE_KEYS[choiceVals.length]||[];k=k.length===1?k.toLowerCase():k;return ks.findIndex(a=>a.includes(k))};
function showChoices(L,cb){
  choiceVals=makeChoices(L,mode()==='kids'?3:4);choiceCb=cb;
  const el=$('choices');el.innerHTML='';
  choiceVals.forEach((v,i)=>{
    const keys=CHOICE_KEYS[choiceVals.length][i],b=document.createElement('button');b.className='choice';
    b.innerHTML=`<kbd>${ARROW[keys[0]]} ${keys[keys.length-1].toUpperCase()}</kbd>${v}`;
    b.addEventListener('pointerdown',ev=>{ev.preventDefault();audio();pickChoice(i)});
    el.appendChild(b);
  });
  show('choices');show('inputWrap',false);
}
function hideChoices(){choiceCb=null;show('choices',false);if(state==='play'&&!kids.running)show('inputWrap')}
function pickChoice(i){
  if(state!=='play'||!choiceCb||i>=choiceVals.length)return;
  const b=$('choices').children[i];if(b.classList.contains('bad'))return;
  if(!choiceCb(choiceVals[i]))b.classList.add('bad');
}
// in choice modes the lowest enemy is the target; the choices always answer it
let target=null,targetLi=-1;
function retarget(){
  let t=null;for(const e of live())if(!t||e.y<t.y)t=e;
  if(t===target&&(!t||t.li===targetLi))return;
  if(target)target.el.classList.remove('target');
  target=t;targetLi=t?t.li:-1;
  if(!t){hideChoices();return}
  t.el.classList.add('target');
  showChoices(t.prob.layers[t.li],v=>{
    if(target!==t||t.pending)return true;
    if(v===t.prob.layers[t.li].a){fire(t);return true}
    onWrong();SFX.wrong();FX.aberr=Math.max(FX.aberr,.007);queueRetry(t.prob,t.src);updateHUD();
    return false;
  });
}

// ---------- 10s column game ----------
const tens=createTens({
  G:()=>G,
  hit(t,pts){onHit(t);addScore(pts*speedBonus(t,G.lv.par));updateHUD(true)},
  addScore(p){addScore(p);updateHUD()},
  pace,timeScale,useNova,
  miss(){onWrong();SFX.wrong();FX.aberr=Math.max(FX.aberr,.007);inputBad();updateHUD()},
  crash(x,y,total){
    onShieldHit();
    burst(x,y,'#ff2a6d',240,75,1.2);shockwave(x,y,'#ff2a6d',32,.8);gridPush(x,y,320,32);
    if(mode()!=='hard')firework(V.VW*.3,worldOf(G.lv).color,'TOTAL',total);
    SFX.crash();FX.shake=1.8;FX.aberr=.016;updateHUD();
    if(G.lives<=0)endLevel();
  },
  roundDone(){onResolved();updateHUD()},
  setInput(s){$('input').textContent=s},
  showChoices(L,cb){showChoices(L,v=>{const ok=v===L.a;cb(v);return ok})},
  hideChoices,
});

// ---------- kids mode ----------
const kids=createKids({
  G:()=>G,
  problem:()=>freshProblem(),
  showChoices,hideChoices,
  finish(stars,info){if(state!=='play')return;G.kidStars=stars;G.kidInfo=info;state='ending';G.ending=0},
});

// ---------- spawning ----------
const srcFor=()=>G.lv.mix?LV[pick(G.lv.mix)]:G.lv;
function nextProblem(){
  const act=new Set(enemies.map(e=>e.prob.layers[e.li].a)),keys=new Set(enemies.map(e=>e.prob.key));
  const qi=G.queue.findIndex(q=>q.due<=G.spawned&&!keys.has(q.prob.key)&&!act.has(q.prob.layers[0].a));
  if(qi>=0)return G.queue.splice(qi,1)[0];
  for(let tries=0;tries<40;tries++){
    const src=srcFor(),[a,b]=choosePair(src,G.recent);
    const prob=src.make(a,b,src);
    if(keys.has(prob.key)||act.has(prob.layers[0].a))continue;
    return{prob,src};
  }
  return null;
}
function freshProblem(){
  for(let tries=0;tries<40;tries++){
    const src=srcFor(),[a,b]=choosePair(src,G.recent),prob=src.make(a,b,src);
    // small pools (Make 10 has 5 facts) would run dry, so repeats are allowed as a last resort
    if(G.recent.includes(prob.key)&&tries<39)continue;
    G.recent.push(prob.key);if(G.recent.length>5)G.recent.shift();
    return{prob,src};
  }
  return null;
}
function queueRetry(prob,src){
  if(!G.queue.some(q=>q.prob.key===prob.key))G.queue.push({prob,src,due:G.spawned+ri(2,4)});
}
function gapFor(){
  const lv=G.lv,d=save.settings.diff;
  return Math.max(.35,(lv.mix?2.6*d:lv.fall*d/(lv.conc+.6))/ramp());
}
const concCap=()=>Math.min(8,G.lv.conc+Math.floor((G.wave-1)/2));
function spawnEnemy({prob,src}){
  const st=STYLES[src.kind],g=new THREE.Group(),n=prob.layers.length;
  g.add(new THREE.LineLoop(polyGeo(st.sides,st.r,st.inner,st.rot),glowMat(st.color,2.3)));
  g.add(new THREE.LineLoop(polyGeo(st.sides,st.r*.46,st.inner,st.rot+Math.PI/st.sides),glowMat(st.color,1.1)));
  const rings=[];
  for(let i=1;i<n;i++){const r=new THREE.LineLoop(polyGeo(st.sides,st.r+1.3*i,0,st.rot),glowMat(i%2?'#ffb03a':st.color,1.8));g.add(r);rings.push(r)}
  const R=st.r+1.3*(n-1),lim=Math.max(8,Math.min(V.VW/2-10,55));
  let x=0,best=-1;
  for(let k=0;k<10;k++){const cx=rand(-lim,lim);let md=99;for(const e of enemies)if(e.y>V.VH/2-22)md=Math.min(md,Math.abs(e.x-cx));if(md>best){best=md;x=cx}}
  const y=V.VH/2-R-2,base=src.fall*save.settings.diff;
  const fall=Math.min(base,Math.max(base/ramp(),2.4*pace()*n+1.5));
  const el=document.createElement('div');el.className='lbl';el.style.setProperty('--c',st.color);labelsEl.appendChild(el);
  const hintOn=src.hintFrac&&(G.lv.mix?Math.random()<.25:G.spawned<G.lv.count*src.hintFrac);
  const e={prob,src,st,g,rings,el,x,y,vy:(y-V.SHIELD_Y)/fall,R,li:0,spawnT:G.t,layerT:G.t,age:0,
    spin:rand(.5,1.4)*(Math.random()<.5?-1:1),ph:rand(0,6.28),wf:rand(.6,1.2),wa:rand(1,3),flash:0,pending:false,hint:hintOn?prob.hint:null};
  g.position.set(x,y,0);scene.add(g);
  setLabel(e);enemies.push(e);G.spawned++;
  G.recent.push(prob.key);if(G.recent.length>5)G.recent.shift();
  SFX.spawn();
}
function setLabel(e){
  const L=e.prob.layers[e.li],n=e.prob.layers.length,sub=L.sub||e.hint;
  let h=L.t;if(sub)h+=`<span class="h">${sub}</span>`;
  if(n>1)h+=`<span class="pips">${'◆'.repeat(n-e.li)}${'◇'.repeat(e.li)}</span>`;
  e.el.innerHTML=h;
}

// ---------- combat ----------
function popup(x,y,text,color){
  const [sx,sy]=toScreen(x,y),d=document.createElement('div');
  d.className='pop';d.textContent=text;d.style.setProperty('--c',color);
  d.style.transform=`translate(${sx}px,${sy}px) translate(-50%,-50%)`;
  d.addEventListener('animationend',()=>d.remove());labelsEl.appendChild(d);
}
const live=()=>enemies.filter(e=>!e.pending);
const candidates=v=>live().filter(e=>e.prob.layers[e.li].a===v);

function typeDigit(d){
  if(state!=='play'||buf.length>=6)return;
  buf+=d;SFX.key();renderInput();
  if(save.settings.auto&&candidates(+buf).length){
    const ambiguous=live().some(e=>{const s=String(e.prob.layers[e.li].a);return s!==buf&&s.startsWith(buf)});
    if(!ambiguous)submit();
  }
}
function submit(){
  if(state!=='play'||!buf)return;
  const c=candidates(+buf);
  if(c.length){c.sort((a,b)=>a.y-b.y);fire(c[0])}else miss();
  buf='';renderInput();
}
function inputBad(){const inp=$('input');inp.classList.remove('bad');void inp.offsetWidth;inp.classList.add('bad')}
function miss(){
  onWrong();SFX.wrong();FX.aberr=Math.max(FX.aberr,.007);inputBad();
  const l=live();
  if(l.length===1){recFact(l[0].prob.key,false,0);queueRetry(l[0].prob,l[0].src)}
  updateHUD();
}
function fire(e){
  const last=e.li===e.prob.layers.length-1;
  const t=Math.max(.3,G.t-Math.max(e.layerT,G.lastShot));G.lastShot=G.t;
  onHit(t);
  const pts=addScore(e.src.pts*speedBonus(t,e.src.par));
  popup(e.x,e.y+e.R+4,'+'+pts.toLocaleString(),e.st.color);
  if(last){recFact(e.prob.key,true,t);G.log.push({key:e.prob.key,t})}
  e.pending=true;
  const m=new THREE.Line(shotGeo,glowMat('#ffffff',3.5));m.position.set(0,V.SHIP_Y+2,0);scene.add(m);
  shots.push({m,x:0,y:V.SHIP_Y+2,e});
  FX.shipAim=Math.atan2(e.y-V.SHIP_Y,e.x)-Math.PI/2;
  const c=new THREE.Color('#bff8ff'),a0=FX.shipAim+Math.PI/2;
  for(let i=0;i<14;i++){const a=a0+rand(-.5,.5),s=rand(15,45);emit(0,V.SHIP_Y+1.5,Math.cos(a)*s,Math.sin(a)*s,.3,c)}
  SFX.shoot(G.combo);updateHUD(true);
}
function shotsStep(dt){
  for(const s of [...shots]){
    const e=s.e;
    if(!enemies.includes(e)){killShot(s);continue}
    const dx=e.x-s.x,dy=e.y-s.y,d=Math.hypot(dx,dy),sp=280*dt;
    if(d<=sp+e.R*.5){killShot(s);impact(e);continue}
    s.x+=dx/d*sp;s.y+=dy/d*sp;s.m.position.set(s.x,s.y,0);s.m.rotation.z=Math.atan2(dy,dx)-Math.PI/2;
    for(let i=0;i<3;i++)emit(s.x,s.y,-dx/d*25+rand(-6,6),-dy/d*25+rand(-6,6),.3,shotColor);
  }
}
function impact(e){
  e.pending=false;e.flash=1;
  if(e.li<e.prob.layers.length-1){
    const ring=e.rings.pop(),R=e.st.r+1.3*(e.rings.length+1),c=new THREE.Color(e.st.color),o=new THREE.Color('#ffb03a');
    for(let i=0;i<90;i++){const a=Math.random()*6.283,s=rand(10,45);emit(e.x+Math.cos(a)*R,e.y+Math.sin(a)*R,Math.cos(a)*s,Math.sin(a)*s,.8,i%2?c:o)}
    e.g.remove(ring);ring.material.dispose();
    e.li++;e.layerT=G.t;e.R=e.st.r+1.3*e.rings.length;e.y+=2.5;setLabel(e);
    shockwave(e.x,e.y,e.st.color,R+5,.45);gridPush(e.x,e.y,80,14);SFX.shield();FX.aberr=Math.max(FX.aberr,.005);FX.shake=Math.max(FX.shake,.3);
  }else kill(e);
}
function kill(e){
  const big=BIG.has(e.src.kind)&&e.prob.layers.length>1||e.src.kind==='boss';
  burst(e.x,e.y,e.st.color,big?280:120,big?75:50,big?1.3:.9);
  shockwave(e.x,e.y,e.st.color,big?24:13,big?.75:.45);
  if(big)shockwave(e.x,e.y,'#ffffff',14,.35);
  gridPush(e.x,e.y,big?260:140,big?28:17);
  SFX.boom(big);FX.shake=Math.max(FX.shake,big?1:.25);FX.aberr=Math.max(FX.aberr,big?.01:.003);
  removeEnemy(e);onResolved();updateHUD();
}
// a nova wipes the screen instead of letting an enemy through
function nova(){
  shockwave(0,V.SHIELD_Y,'#fff23a',V.VW*.7,1);shockwave(0,V.SHIELD_Y,'#ffffff',V.VW*.4,.7);gridPush(0,V.SHIELD_Y,600,V.VW*.8);
  for(const e of [...enemies]){addScore(e.src.pts);kill(e)}
  SFX.boom(true);FX.shake=1.2;FX.aberr=.014;FX.shieldFlash=1;
}
function crash(e){
  onShieldHit();
  recFact(e.prob.key,false,0);queueRetry(e.prob,e.src);G.log.push({key:e.prob.key,t:Infinity});
  burst(e.x,V.SHIELD_Y,'#ff2a6d',240,75,1.2);burst(e.x,V.SHIELD_Y,e.st.color,90,45);
  shockwave(e.x,V.SHIELD_Y,'#ff2a6d',32,.8);gridPush(e.x,V.SHIELD_Y,320,32);
  if(mode()!=='hard'){const L=e.prob.layers[e.li];firework(e.x,e.st.color,L.t,L.a)}
  SFX.crash();FX.shake=1.8;FX.aberr=.016;FX.shieldFlash=1;
  removeEnemy(e);onResolved();updateHUD();
  if(G.lives<=0)endLevel();
}
function updateEnemies(dt){
  const ts=timeScale();
  for(const e of [...enemies]){
    if(!enemies.includes(e))continue; // a nova may have cleared it
    e.age+=dt;
    if(!e.pending)e.y-=e.vy*dt*ts;
    e.x+=Math.sin(e.age*e.wf+e.ph)*e.wa*dt;
    e.g.rotation.z+=e.spin*dt*.6;
    e.rings.forEach((r,i)=>r.rotation.z=-e.g.rotation.z*(2+i));
    e.flash=Math.max(0,e.flash-dt*4);
    const s=Math.min(1,e.age*2.5)*(1+e.flash*.35);e.g.scale.set(s,s,1);
    gridPush(e.x,e.y,10*dt,e.R*2.4);
    if(!e.pending&&e.y-e.R<=V.SHIELD_Y){if(useNova())nova();else crash(e)}
  }
  const lim=V.VW/2-6;
  for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
    const a=enemies[i],b=enemies[j],dx=b.x-a.x;
    if(Math.abs(b.y-a.y)<9&&Math.abs(dx)<14){const p=(14-Math.abs(dx))*dt*1.6*(dx>=0?1:-1);a.x-=p;b.x+=p}
  }
  for(const e of enemies){e.x=clamp(e.x,-lim,lim);e.g.position.set(e.x,e.y,0)}
}
function placeLabels(){
  for(const e of enemies){
    const [sx,sy]=toScreen(e.x,e.y+e.R+.8);
    e.el.style.transform=`translate(${sx|0}px,${Math.max(sy,e.el.offsetHeight+58)|0}px) translate(-50%,-100%)`;
    e.el.classList.toggle('danger',e.y-V.SHIELD_Y<13);
  }
}

// ---------- level flow ----------
function updatePlay(dt){
  G.t+=dt;
  if(state==='play'){buffsStep(dt);renderBuffs()}
  if(kids.running)kids.update(dt);
  else if(tens.active)tens.update(dt);
  else{
    if(state==='play'){
      if(!enemies.length)G.spawnT=Math.min(G.spawnT,.5);
      G.spawnT-=dt*timeScale();
      if(G.spawnT<=0&&enemies.length<concCap()){const n=nextProblem();if(n)spawnEnemy(n);G.spawnT=gapFor()}
      if(choiceMode())retarget();
    }
    updateEnemies(dt);shotsStep(dt);
  }
  if(state==='ending'&&(G.ending-=dt)<=0)showResults();
}
function show(id,on=true){$(id).classList.toggle('hidden',!on)}
function hideOverlays(){['chapters','menu','intro','results','pause','mastery'].forEach(i=>show(i,false))}
function hidePlayUI(){show('hud',false);show('inputWrap',false);show('keypad',false);show('choices',false)}
function placeSettings(overlay){$(overlay).querySelector('.settingsSlot').appendChild($('settings'));syncSettings()}

function showChapters(){
  state='chapters';clearField();G=null;persist();hideOverlays();hidePlayUI();
  buildChapters();placeSettings('chapters');show('chapters');
}
function openChapter(ch){chapter=ch;save.settings.chapter=ch.id;persist();showMenu()}
function showMenu(){
  state='menu';clearField();G=null;persist();hideOverlays();hidePlayUI();
  $('menu').style.setProperty('--c',chapter.color);$('chTitle').textContent=chapter.name;
  buildMenu();placeSettings('menu');show('menu');
}
function startLevel(lv){
  audio();clearField();chapter=lv.ch;newRun(lv);state='intro';hideOverlays();hidePlayUI();
  const w=worldOf(lv);
  $('intro').style.setProperty('--c',w.color);
  $('iWorld').textContent=`${lv.ch.name} · WORLD ${lv.w+1} · ${w.name}`;
  $('iName').textContent=lv.name;$('iTip').innerHTML=lv.tip;
  if(mode()==='kids'){
    document.body.classList.add('kidsmode');
    $('iGoals').innerHTML='';
    if(lv.game!=='tens')$('iTip').innerHTML='Help the <b>Super Kitty Squad</b>! Pick the right answer to pop each balloon and bring the animals safely home.';
    $('iHint').textContent=lv.game==='tens'?'Type two numbers that make 10, then pick the total with ← ↑ → or tap it.':'Pick an answer with ← ↑ → (or F G J), or just tap it! SPACE moves the story along.';
    show('intro');return;
  }
  $('iGoals').innerHTML=`ENDLESS · faster every wave · ${G.goals.map((g,i)=>`<span style="color:${STAR_COLOR[i+1]}">${'★'.repeat(i+1)}</span> ${g.toLocaleString()}`).join(' &nbsp; ')}`;
  const m=mode(),ch=choiceMode();
  $('iHint').textContent=lv.game==='tens'
    ?`Type digits that make 10 to collapse them. Then ${ch?'pick the column total with ← ↓ ↑ → (or D F J K)':'type the column total'}. SPACE clears. ESC pauses.`
    :ch?'Pick the answer for the targeted enemy (▼) with ← ↓ ↑ → or D F J K, or tap it. ESC pauses.'
    :`Type the answer to fire. Auto-fires on an exact match; ENTER forces a shot. BACKSPACE edits, SPACE clears. ESC pauses.${m==='hard'?' HARD: no answer reveal on a miss.':''}`;
  show('intro');
}
function beginPlay(){
  state='play';hideOverlays();show('hud');
  const typing=G.lv.game==='tens'||!choiceMode();
  show('inputWrap',typing);show('keypad',TOUCH&&typing);
  if(mode()==='kids'&&G.lv.game!=='tens'){show('hud',false);show('inputWrap',false);show('keypad',false);kids.start(G.lv);return}
  if(mode()==='kids')kids.backdrop();
  if(G.lv.game==='tens')tens.start(G.lv,worldOf(G.lv).color);
  updateHUD();
}
function endLevel(){
  if(state!=='play')return;
  state='ending';G.ending=2.2;buf='';renderInput();hideChoices();
  for(const e of [...enemies]){burst(e.x,e.y,e.st.color,90,40);removeEnemy(e)}
  if(starsFor(G.score,G.goals))SFX.win();else SFX.lose();
}
function showKidsResults(){
  const lv=G.lv,stars=G.kidStars,key=levelKey(lv.id),r=save.levels[key]||{stars:0,best:0},nxt=lv.ch.levels[lv.i+1];
  r.stars=Math.max(r.stars,stars);save.levels[key]=r;persist();
  $('rKick').textContent=lv.name.toUpperCase();
  $('rTitle').textContent=['','GOOD JOB!','GREAT JOB!','AMAZING!'][stars];
  $('rStars').innerHTML=[0,1,2].map(k=>k<stars?`<i style="animation-delay:${.2+k*.25}s">★</i>`:'<s>★</s>').join('');
  $('rStats').innerHTML=`<div><b>${G.kidInfo.rescued}</b><span>friends rescued</span></div><div><b>${G.kidInfo.oops}</b><span>oopsies</span></div><div><b>${'★'.repeat(stars)}</b><span>stars</span></div><div><b>${lv.ch.name==='ADDITION'?'➕':'✖️'}</b><span>${lv.name}</span></div>`;
  $('rTip').innerHTML=stars===3?'A perfect rescue! You are a real Super Kitty!':'Fewer oopsies earns more stars. You can do it!';
  $('bNext').innerHTML=nxt?'NEXT <kbd>ENTER</kbd>':'MENU <kbd>ENTER</kbd>';
  G.stars=stars;show('results');
}
function showResults(){
  state='results';hidePlayUI();tens.stop();
  if(G.kidInfo){showKidsResults();return}
  const lv=G.lv,w=worldOf(lv),att=G.hits+G.misses+G.crashes;
  const acc=att?G.hits/att:0,avg=G.times.length?G.times.reduce((a,b)=>a+b,0)/G.times.length:0;
  const stars=starsFor(G.score,G.goals);
  const key=levelKey(lv.id),r=save.levels[key]||{stars:0,best:0};
  const newBest=G.score>r.best;
  r.stars=Math.max(r.stars,stars);r.best=Math.max(r.best,G.score);save.levels[key]=r;persist();
  $('results').style.setProperty('--c',w.color);
  $('rKick').textContent=lv.name.toUpperCase()+(mode()!=='normal'?` · ${mode().toUpperCase()}`:'');
  $('rTitle').textContent=stars?STAR_NAME[stars]:'NOT YET';
  $('rStars').innerHTML=[0,1,2].map(k=>k<stars?`<i style="animation-delay:${.2+k*.25}s">★</i>`:'<s>★</s>').join('');
  $('rStats').innerHTML=`<div><b>${G.score.toLocaleString()}</b><span>${newBest?'new best!':'score'}</span></div><div><b>${Math.round(acc*100)}%</b><span>accuracy</span></div><div><b>${G.wave}</b><span>wave reached</span></div><div><b>×${G.bestMult}</b><span>best multiplier</span></div>`;
  const isFact=l=>!l.key.startsWith('~');
  const missed=[...new Set(G.log.filter(l=>l.t===Infinity&&isFact(l)).map(l=>l.key))];
  const slow=G.log.filter(l=>l.t!==Infinity&&isFact(l)).sort((a,b)=>b.t-a.t).slice(0,4);
  let tip=`<b>Goals:</b> ${G.goals.map((g,i)=>`${'★'.repeat(i+1)} ${g.toLocaleString()}`).join(' · ')}<br><b>Avg</b> ${avg.toFixed(1)}s / answer · <b>${Math.round(acc*100)}%</b> accuracy · <b>best streak</b> ${G.bestCombo}<br>`;
  if(missed.length)tip+=`<b>Got through:</b> ${missed.slice(0,6).map(fmtKey).join(', ')}<br>`;
  if(slow.length)tip+=`<b>Slowest:</b> ${slow.map(l=>`${fmtKey(l.key)} (${l.t.toFixed(1)}s)`).join(', ')}<br>`;
  tip+=stars===3?'Gold. Move on, or come back and see how high it goes.'
    :stars?`${(G.goals[stars]-G.score).toLocaleString()} more for ${'★'.repeat(stars+1)}. The multiplier is everything: a wrong answer halves it, a shield hit resets it.`
    :'Try Relaxed speed on the menu if this is too fast. Accuracy first: the multiplier only grows while you stay clean.';
  $('rTip').innerHTML=tip;
  const nxt=lv.ch.levels[lv.i+1];
  $('bNext').innerHTML=stars?(nxt?'NEXT <kbd>ENTER</kbd>':'MENU <kbd>ENTER</kbd>'):'RETRY <kbd>ENTER</kbd>';
  G.stars=stars;
  show('results');
}
function resultsNext(){const nxt=G.lv.ch.levels[G.lv.i+1];if(!G.stars)startLevel(G.lv);else if(nxt)startLevel(nxt);else showMenu()}
function pause(){if(state!=='play')return;state='paused';show('pause');persist()}
function resume(){if(state!=='paused')return;state='play';show('pause',false)}

// ---------- HUD ----------
function renderInput(){$('input').textContent=buf}
function updateHUD(bump){
  if(!G)return;
  $('lvName').textContent=`${G.lv.name} · WAVE ${G.wave}`;
  const s=starsFor(G.score,G.goals),prev=s?G.goals[s-1]:0,next=G.goals[s];
  const bar=$('prog');bar.style.width=(s<3?(G.score-prev)/(next-prev)*100:100)+'%';bar.style.setProperty('--c',STAR_COLOR[Math.min(3,s+1)]);
  $('goalTxt').innerHTML=s<3?`<span style="color:${STAR_COLOR[s+1]}">${'★'.repeat(s+1)}</span> at ${next.toLocaleString()}`:`<span style="color:${STAR_COLOR[3]}">★★★ GOLD</span>`;
  $('score').textContent=G.score.toLocaleString();
  const c=$('combo');c.innerHTML=`×${G.mult}`+(G.combo>1?`<small>STREAK ${G.combo}</small>`:'');
  if(bump){c.classList.remove('bump');void c.offsetWidth;c.classList.add('bump')}
  const l=Math.max(0,G.lives);
  $('lives').innerHTML='◆'.repeat(l)+'<s>'+'◆'.repeat(G.maxLives-l)+'</s>';
  renderBuffs();
}
function renderBuffs(){
  const B=G.buffs,o=[];
  if(B.slow>0)o.push(`<i style="--c:#22e6ff">SLOW ${Math.ceil(B.slow)}s</i>`);
  if(B.over>0)o.push(`<i style="--c:#ff3df0">×2 ${Math.ceil(B.over)}s</i>`);
  if(B.nova>0)o.push(`<i style="--c:#fff23a">NOVA${B.nova>1?' ×'+B.nova:''}</i>`);
  const h=o.join('');if($('buffs').innerHTML!==h)$('buffs').innerHTML=h;
}

// ---------- chapter picker + level menu ----------
const starsOf=lv=>save.levels[levelKey(lv.id)]?.stars||0;
const nextRec=ch=>ch.levels.find(l=>!starsOf(l))||ch.levels[ch.levels.length-1];
function buildChapters(){
  const el=$('chList');el.innerHTML='';
  CHAPTERS.forEach((ch,k)=>{
    const got=ch.levels.reduce((a,l)=>a+starsOf(l),0);
    const b=document.createElement('button');b.className='chapter'+(ch===chapter?' last':'');b.style.setProperty('--c',ch.color);
    b.innerHTML=`<div class="chk">CHAPTER ${k+1} · KEY ${k+1}</div><div class="chn">${ch.name}</div><div class="chs">${ch.sub}</div>`+
      `<div class="chw">${ch.worlds.map(w=>w.name).join(' · ')}</div><div class="chp">★ ${got} / ${ch.levels.length*3}</div>`;
    b.onclick=()=>{b.blur();openChapter(ch)};
    el.appendChild(b);
  });
}
function buildMenu(){
  const el=$('levels');el.innerHTML='';const nx=nextRec(chapter);
  chapter.worlds.forEach((w,wi)=>{
    const sec=document.createElement('div');sec.className='world';sec.style.setProperty('--c',w.color);
    sec.innerHTML=`<div class="wh"><span class="wn">${String(wi+1).padStart(2,'0')}</span>${w.name}<em>${w.sub}</em></div><div class="cards"></div>`;
    const cards=sec.querySelector('.cards');
    chapter.levels.forEach(lv=>{
      if(lv.w!==wi)return;
      const r=save.levels[levelKey(lv.id)],st=r?.stars||0,b=document.createElement('button');
      b.className='card'+(lv===nx?' next':'');
      b.innerHTML=`<div class="cn">${lv.name}</div><div class="stars">${'★'.repeat(st)}<s>${'★'.repeat(3-st)}</s></div><div class="best">${r?'BEST '+r.best.toLocaleString():'—'}</div>`;
      b.onclick=()=>{b.blur();startLevel(lv)};
      cards.appendChild(b);
    });
    el.appendChild(sec);
  });
}
function syncSettings(){
  document.querySelectorAll('#diffSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.v===save.settings.diff));
  document.querySelectorAll('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===save.settings.mode));
  $('auto').checked=save.settings.auto;$('vol').value=save.settings.vol;
}
const refreshMenus=()=>{syncSettings();if(state==='chapters')buildChapters();else if(state==='menu')buildMenu()};
document.querySelectorAll('#diffSeg button').forEach(b=>b.onclick=()=>{save.settings.diff=+b.dataset.v;persist();refreshMenus();b.blur()});
document.querySelectorAll('#modeSeg button').forEach(b=>b.onclick=()=>{save.settings.mode=b.dataset.v;persist();refreshMenus();b.blur()});
$('auto').onchange=e=>{save.settings.auto=e.target.checked;persist()};
$('vol').oninput=e=>{save.settings.vol=+e.target.value;setVolume(save.settings.vol);persist()};
$('bChapters').onclick=showChapters;
$('bPlay').onclick=()=>startLevel(nextRec(chapter));
$('bMastery').onclick=openMastery;
$('bGo').onclick=beginPlay;$('bBack').onclick=showMenu;
$('bNext').onclick=resultsNext;$('bRetry').onclick=()=>startLevel(G.lv);$('bMenu').onclick=showMenu;
$('bResume').onclick=resume;$('bQuit').onclick=showMenu;
$('bMClose').onclick=closeMastery;
$('bReset').onclick=()=>{if(confirm('Erase all progress and fact statistics?')){save.stats={};save.levels={};persist();openMastery();refreshMenus()}};

// ---------- mastery map (per chapter) ----------
const mScore=s=>{const acc=s.ok/s.n;return acc*acc*clamp((6-s.t)/4.5,0,1)};
function mColor(s){
  if(!s)return'#1a2140';
  const m=mScore(s);
  const h=m<.5?(350+60*(m/.5))%360:50+135*((m-.5)/.5);
  return`hsl(${h},100%,55%)`;
}
let mCells=[];
function drawGridCanvas(cv,cells,cols,rowsN,cell,pad,hdr){
  const dpr=Math.min(devicePixelRatio,2),w=pad+cols*cell,h=pad+rowsN*cell;
  cv.width=w*dpr;cv.height=h*dpr;cv.style.width=w+'px';cv.style.height=h+'px';
  const g=cv.getContext('2d');g.scale(dpr,dpr);g.font='600 11px "Exo 2",sans-serif';g.textAlign='center';g.textBaseline='middle';
  if(hdr)hdr(g);
  for(const c of cells){
    const s=save.stats[c.key],x=pad+c.i*cell,y=pad+c.j*cell;
    g.shadowBlur=s?8:0;g.shadowColor=mColor(s);g.fillStyle=mColor(s);g.globalAlpha=s?.9:1;
    g.beginPath();g.roundRect(x+1.5,y+1.5,cell-3,cell-3,4);g.fill();
    g.globalAlpha=1;g.shadowBlur=0;
    if(c.label){g.fillStyle=s?'#02030a':'#5b6a90';g.fillText(c.label,x+cell/2,y+cell/2+.5)}
    c.x=x;c.y=y;c.cell=cell;
  }
}
function openMastery(){
  show('mastery');
  const M=chapter.mastery,n=M.to-M.from+1;
  $('mTitle').textContent=`MASTERY · ${chapter.name}`;
  const cell=Math.max(14,Math.min(n<12?44:28,Math.floor((Math.min(V.W-70,680)-28)/n)));
  mCells=[];
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j+M.from,b=i+M.from;mCells.push({i,j,a,b,key:M.key(a,b)})}
  drawGridCanvas($('mcv'),mCells,n,n,cell,28,g=>{
    g.fillStyle='#7d93b8';
    for(let k=0;k<n;k++){g.fillText(k+M.from,28+k*cell+cell/2,14);g.fillText(k+M.from,14,28+k*cell+cell/2)}
  });
  show('sqBlock',M.squares);
  if(M.squares){
    const sq=Array.from({length:30},(_,k)=>{const n=21+k;return{i:k%15,j:Math.floor(k/15),a:n,b:n,key:M.key(n,n),label:n}});
    drawGridCanvas($('scv'),sq,15,2,Math.max(cell,22),0);
  }
  const seen=Object.entries(save.stats).filter(([k,s])=>M.match(k)&&s.n>0&&mScore(s)<.7).sort((a,b)=>weakness(b[0],3)-weakness(a[0],3)).slice(0,14);
  $('weak').innerHTML=seen.length?seen.map(([k,s])=>`<span title="${Math.round(s.ok/s.n*100)}% · ${s.t.toFixed(1)}s">${fmtKey(k)}</span>`).join(''):'<em style="color:var(--dim)">Play a few levels to find your weak spots.</em>';
}
function closeMastery(){show('mastery',false)}
$('mcv').addEventListener('mousemove',ev=>{
  const r=$('mcv').getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top,tip=$('mtip'),M=chapter.mastery;
  const c=mCells.find(c=>x>=c.x&&x<c.x+c.cell&&y>=c.y&&y<c.y+c.cell);
  if(!c){tip.classList.add('hidden');return}
  const s=save.stats[c.key];
  tip.textContent=`${c.a} ${M.sym} ${c.b} = ${M.calc(c.a,c.b)}`+(s?` · ${s.t.toFixed(1)}s · ${Math.round(s.ok/s.n*100)}% (${s.n})`:' · unseen');
  tip.style.left=(ev.clientX-$('mcvWrap').getBoundingClientRect().left+14)+'px';tip.style.top=(y-30)+'px';tip.classList.remove('hidden');
});
$('input').addEventListener('animationend',()=>$('input').classList.remove('bad'));
$('mcv').addEventListener('mouseleave',()=>$('mtip').classList.add('hidden'));

// ---------- input ----------
// a key during play; returns true if it was used
function playKey(k){
  if(choiceCb){const i=choiceIndex(k);if(i>=0){pickChoice(i);return true}}
  if(kids.running)return kids.key(k);
  if(tens.active)return tens.key(k);
  if(choiceMode())return false;
  if(k.length===1&&k>='0'&&k<='9'){typeDigit(k);return true}
  if(k==='Backspace'){buf=buf.slice(0,-1);renderInput();return true}
  if(k===' '||k==='Delete'){buf='';renderInput();return true}
  if(k==='Enter'){submit();return true}
  return false;
}
addEventListener('keydown',ev=>{
  audio();
  const k=ev.key;
  if(!$('mastery').classList.contains('hidden')){if(k==='Escape'||k==='m'||k==='M'){ev.preventDefault();closeMastery()}return}
  switch(state){
    case'chapters':
      if(k>='1'&&k<=String(CHAPTERS.length))openChapter(CHAPTERS[+k-1]);
      else if(k==='Enter'){ev.preventDefault();openChapter(chapter)}
      break;
    case'menu':
      if(k==='Enter'){ev.preventDefault();startLevel(nextRec(chapter))}
      else if(k==='m'||k==='M')openMastery();
      else if(k==='Escape')showChapters();
      break;
    case'intro':if(k==='Enter'||k===' '){ev.preventDefault();beginPlay()}else if(k==='Escape')showMenu();break;
    case'play':
      if(k==='Escape'||k==='p'||k==='P'){pause();break}
      if(playKey(k))ev.preventDefault();
      break;
    case'paused':if(k==='Escape'||k==='Enter'){ev.preventDefault();resume()}else if(k==='q'||k==='Q')showMenu();break;
    case'results':if(k==='Enter'){ev.preventDefault();resultsNext()}else if(k==='r'||k==='R')startLevel(G.lv);else if(k==='Escape')showMenu();break;
  }
});
// touch keypad
['1','2','3','4','5','⌫','6','7','8','9','0','⏎'].forEach(k=>{
  const b=document.createElement('button');b.textContent=k;
  b.addEventListener('pointerdown',ev=>{ev.preventDefault();audio();if(state==='play')playKey(k==='⌫'?'Backspace':k==='⏎'?'Enter':k)});
  $('keypad').appendChild(b);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();persist()}});
addEventListener('pagehide',persist);

// ================= main loop =================
let last=performance.now(),poke=0;
const PALETTE=['#22e6ff','#ff2a6d','#4dff6a','#fff23a','#a66bff','#ffa31a'];
function frame(now){
  requestAnimationFrame(frame);
  const dt=clamp((now-last)/1000,0,1/20);last=now;
  if(state!=='paused'){
    gtime+=dt;
    if(G&&(state==='play'||state==='ending'))updatePlay(dt);
    if(state==='chapters'||state==='menu'||state==='intro'||state==='results'){
      if((poke-=dt)<=0){
        poke=rand(.35,1.2);const x=rand(-V.VW/2,V.VW/2),y=rand(-V.VH/2,V.VH/2);
        gridPush(x,y,rand(50,130),rand(8,18));
        if((state==='chapters'||state==='menu')&&Math.random()<.55){burst(x,y,pick(PALETTE),70,38,1.1);shockwave(x,y,pick(PALETTE),9,.5)}
      }
    }
    fxStep(dt);
  }
  const shooter=!!G&&G.lv.game!=='tens'&&(state==='play'||state==='ending'||state==='paused'||state==='intro');
  if(!kids.active)fxRender({dt,time:gtime,paused:state==='paused',ship:shooter,shield:shooter,lifeFrac:G?G.lives/G.maxLives:1});
  placeLabels();
}
showChapters();
requestAnimationFrame(frame);
// deep link: ?level=b1 opens that level's briefing (#go starts it)
{const lv=LV[new URLSearchParams(location.search).get('level')];if(lv){startLevel(lv);if(location.hash==='#go')beginPlay()}}
// test hook
window.__mb={get G(){return G},get state(){return state},get enemies(){return enemies},LV,startLevel,beginPlay,tens};
