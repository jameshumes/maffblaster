// Kids mode: a bright storybook world instead of the neon shooter.
// A villain floats animals up to their blimp on balloons; the Super Kitty Squad pops
// them when you pick the right answer. Cut scenes set up the story and ask questions
// to move it forward; the rescue then plays out on its own, going better when you answer.
import {$,rand,ri,pick,clamp,shuffle} from './util.js';
import {save} from './save.js';
import {SFX} from './audio.js';

// every number always has the same color (association, never a hint on the choices)
export const NUM_COLORS=['#8d99ae','#ff8c1a','#ff3b3b','#f5c400','#9b5de5','#00b4d8','#3a86ff','#22b04b','#ff5fa2','#a0522d'];
export const colorOf=n=>n===10?'#ffb000':NUM_COLORS[((n%10)+10)%10];
export const colorDigits=s=>String(s).replace(/\d/g,d=>`<b style="color:${NUM_COLORS[d]}">${d}</b>`);

const HEROES=[{e:'🐱',cape:'#ff3b3b',name:'Captain Whiskers'},{e:'🐈',cape:'#ff5fa2',name:'Sparkle Paws'},{e:'🐈‍⬛',cape:'#3a86ff',name:'Midnight'}];
const STORIES=[
  {title:'Puppy Pop Rescue',icon:'🐶',villain:{e:'🦝',name:'Mr. Grumbles'},cargo:['🐶','🐕','🐩','🦮'],sound:'woof',finale:'party',
   intro:[
     {who:'narrator',text:'It was a sunny day in Sprinkle Valley...'},
     {who:'villain',text:'Hee hee hee! I tied ALL the puppies to my balloons! Soon they will float up to my blimp!'},
     {who:'hero',text:'Not on our watch! Super Kitty Squad, power up!'},
     {who:'hero',ask:true,text:'Help us power up! What is the answer?'},
     {who:'hero2',text:'Kitty power ON! Pick the right answers and we will pop those balloons!'},
   ],
   outro:[
     {who:'villain',text:'My balloons! My beautiful balloons! I will get you next time, kitties!'},
     {who:'hero',text:'Every puppy is safe! You know what that means... PARTY TIME!'},
   ]},
  {title:'Unicorn Rainbow',icon:'🦄',villain:{e:'🌧️',name:'Gloomy Cloud'},cargo:['🦄','🐴','🦄','🐴'],sound:'neigh',finale:'rainbow',
   intro:[
     {who:'narrator',text:'Over Glitter Hills, the unicorns were painting a rainbow...'},
     {who:'villain',text:'Rainbows are too cheerful! I am floating every pony up into my gloomy sky!'},
     {who:'hero2',text:'Oh no! Without the ponies, there will be no rainbow!'},
     {who:'hero',ask:true,text:'Quick, charge the Rainbow Cannon! What is the answer?'},
     {who:'hero',text:'Every pony we save paints the rainbow back. Let us go!'},
   ],
   outro:[
     {who:'villain',text:'Noooo! Too... much... sunshine...'},
     {who:'hero2',text:'The ponies are home! Look, everyone, look up!'},
   ]},
  {title:'Butterfly Garden',icon:'🐰',villain:{e:'🦊',name:'Sneaky Fox'},cargo:['🐰','🐥','🐹','🐸'],sound:'peep',finale:'butterflies',
   intro:[
     {who:'narrator',text:'In the Butterfly Garden, the little animals were playing hide and seek...'},
     {who:'villain',text:'Psst! Found you! Up, up, up you all go, into my balloon basket!'},
     {who:'hero3',text:'Hey! That is not how hide and seek works!'},
     {who:'hero',ask:true,text:'Help us suit up! What is the answer?'},
     {who:'hero',text:'Squad, ready! Every friend we save sets butterflies free!'},
   ],
   outro:[
     {who:'villain',text:'Fine, FINE! I will go play by myself...'},
     {who:'hero3',text:'Everybody is safe! Butterflies, come on out!'},
   ]},
];
const SOUND_OF={'🐶':'woof','🐕':'woof','🐩':'woof','🦮':'woof','🦄':'neigh','🐴':'neigh','🐰':'squeak','🐥':'peep','🐹':'squeak','🐸':'ribbit','🐱':'meow'};
const FLOWERS=['🌷','🌼','🌸','🌻','🌺'];
const RAINBOW=['#ff3b3b','#ff8c1a','#f5c400','#22b04b','#00b4d8','#3a86ff','#9b5de5'];
const CHEERS=['Yay!','Pop!','Got it!','Super!','Purr-fect!','Wow!','Hooray!'];

export function createKids(api){
  // api: {G(), problem()->{prob,src}|null, showChoices(L,cb), hideChoices(), finish(stars)}
  const root=$('kids');
  let T=null,lastStory=-1;
  const W=()=>innerWidth,H=()=>innerHeight;
  const groundY=()=>H()*.8,shipY=()=>58+150;

  function el(cls,html='',parent=T.layer){const d=document.createElement('div');d.className=cls;d.innerHTML=html;parent.appendChild(d);return d}
  function later(t,fn){T.timers.push({t,fn})}

  // ---------- scenery ----------
  function scenery(){
    const rb=RAINBOW.map((c,i)=>`<path d="M${10+i*7},100 A${90-i*7},${90-i*7} 0 0 1 ${190-i*7},100" stroke="${c}" pathLength="1"/>`).join('');
    const fl=Array.from({length:16},(_,i)=>`<span style="left:${(i+rand(.1,.9))/16*100}%;animation-delay:${rand(0,2).toFixed(2)}s">${pick(FLOWERS)}</span>`).join('');
    root.innerHTML=`
      <div class="ksky"></div><div class="ksun">🌞</div>
      <div class="kcloud" style="top:9%;animation-duration:70s"></div><div class="kcloud" style="top:24%;animation-duration:95s;animation-delay:-40s;transform:scale(.7)"></div>
      <div class="kcloud" style="top:15%;animation-duration:120s;animation-delay:-80s;transform:scale(1.2)"></div>
      <svg class="krainbow" viewBox="0 0 200 100">${rb}</svg>
      <svg class="khills" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,14 C15,4 30,6 45,13 S75,22 100,10 L100,30 L0,30Z" fill="#8fe388"/><path d="M0,20 C20,12 35,16 55,21 S85,24 100,17 L100,30 L0,30Z" fill="#5ccf62"/></svg>
      <div class="kground"></div><div class="kflowers">${fl}</div>
      <div class="klayer"></div>`;
    T.layer=root.querySelector('.klayer');
    T.rainbowPaths=[...root.querySelectorAll('.krainbow path')];
  }
  function paintRainbow(frac){T.rainbowPaths.forEach((p,i)=>p.classList.toggle('on',i<Math.round(frac*7)))}

  function buildCast(){
    const S=T.story;
    T.ship={x:W()*.5,el:el('kship',`<div class="kblimp"><i></i><i></i><i></i></div><div class="kprop">✣</div><div class="kbasket"><span class="kvil">${S.villain.e}</span></div>`)};
    T.heroes=HEROES.map((h,i)=>{
      const d=el('khero'+(i?' side':''),`<span class="kcape" style="background:${h.cape}"></span><span class="kface">${h.e}</span>`);
      return{...h,el:d,x:W()*(.3+i*.12),home:.3+i*.12};
    });
    T.hud=el('khud',`<div class="ktitle">${S.icon} ${S.title}</div><div class="kslots">${Array.from({length:T.goal},()=>`<span>${pick(S.cargo)}</span>`).join('')}</div><div class="khint">ESC pause</div>`);
    T.bub=el('kbub hidden');
  }

  // ---------- speech + cut scenes ----------
  const speaker=who=>who==='villain'?T.ship.el.querySelector('.kbasket'):who==='hero'?T.heroes[0].el:who==='hero2'?T.heroes[1].el:who==='hero3'?T.heroes[2].el:null;
  const speakerName=who=>who==='villain'?T.story.villain.name:who==='narrator'?'':T.heroes[{hero:0,hero2:1,hero3:2}[who]].name;
  function say(who,text,extra=''){
    T.say={who,text,shown:0,extra,acc:0};
    T.bub.className='kbub'+(who==='narrator'?' narr':'')+(who==='villain'?' vil':'');
    T.bub.innerHTML=`${speakerName(who)?`<b>${speakerName(who)}</b>`:''}<span></span><div class="kx"></div><em>▶</em>`;
    placeBubble();
  }
  function placeBubble(){
    if(!T.say)return;
    const s=speaker(T.say.who);
    if(!s){T.bub.style.left='50%';T.bub.style.top='12%';return}
    const r=s.getBoundingClientRect(),bw=T.bub.offsetWidth;
    T.bub.style.left=clamp(r.left+r.width/2,bw/2+12,W()-bw/2-12)+'px';
    T.bub.style.top=(T.say.who==='villain'?r.bottom+14:r.top-T.bub.offsetHeight-14)+'px';
  }
  function typeStep(dt){
    const s=T.say;if(!s||s.shown>=s.text.length)return;
    s.acc+=dt*45;const n=Math.min(s.text.length,Math.floor(s.acc));
    if(n>s.shown){if(Math.floor(n/2)>Math.floor(s.shown/2))SFX.blip();s.shown=n;T.bub.querySelector('span').textContent=s.text.slice(0,n)}
    if(s.shown>=s.text.length){T.bub.querySelector('.kx').innerHTML=s.extra;T.bub.classList.add('done');placeBubble();if(s.onDone)s.onDone()}
  }
  function runScene(steps,onDone){T.scene={steps,i:-1,onDone};nextStep()}
  function nextStep(){
    const S=T.scene;S.i++;
    if(S.i>=S.steps.length){T.bub.classList.add('hidden');T.say=null;T.scene=null;S.onDone();return}
    const st=S.steps[S.i];T.bub.classList.remove('hidden');
    if(st.who==='villain'){SFX.giggle();bob(T.ship.el)}
    else if(st.who!=='narrator'){const h=speaker(st.who);hop(h)}
    if(st.ask){
      const p=api.problem();
      if(!p){say(st.who,st.text);return}
      const L=p.prob.layers[0];
      say(st.who,st.text,`<div class="kq"><div class="kbunch">${balloonsHTML(L)}</div>${problemHTML(L)}</div>`);
      T.asking=true;
      T.say.onDone=()=>api.showChoices(L,v=>{
        if(v!==L.a){SFX.oops();oopsHero();return false}
        api.hideChoices();T.asking=false;SFX.cheer();
        powerUp();popNumber(W()*.5,H()*.45,L.a);later(1.1,nextStep);return true;
      });
    }else say(st.who,st.text);
  }
  function advance(){
    if(!T||!T.scene||T.asking)return;
    const s=T.say;
    if(s&&s.shown<s.text.length){s.acc=s.text.length;typeStep(0);return}
    nextStep();
  }

  // ---------- little animations ----------
  const hop=e=>{if(!e)return;e.classList.remove('hop');void e.offsetWidth;e.classList.add('hop')};
  const bob=e=>{e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake')};
  function oopsHero(){const h=T.heroes[0].el;h.classList.remove('oops');void h.offsetWidth;h.classList.add('oops');bob(T.ship.el);later(.25,()=>SFX.giggle())}
  function powerUp(){T.heroes.forEach((h,i)=>later(i*.12,()=>{hop(h.el);sparkle(h.el)}))}
  function sparkle(target){
    const r=target.getBoundingClientRect();
    for(let i=0;i<10;i++){const s=el('kspark','✨');s.style.left=r.left+r.width/2+'px';s.style.top=r.top+r.height/2+'px';
      s.style.setProperty('--dx',rand(-70,70)+'px');s.style.setProperty('--dy',rand(-90,20)+'px');s.addEventListener('animationend',()=>s.remove())}
  }
  function confetti(x,y,color,n=36){
    for(let i=0;i<n;i++){
      const c=el('kconf');c.style.left=x+'px';c.style.top=y+'px';
      c.style.background=i%3?color:pick(RAINBOW);
      c.style.setProperty('--dx',rand(-160,160)+'px');c.style.setProperty('--dy',rand(-160,60)+'px');c.style.setProperty('--r',rand(-540,540)+'deg');
      c.addEventListener('animationend',()=>c.remove());
    }
  }
  function popNumber(x,y,n,sub=''){
    const d=el('kpopnum',`${colorDigits(n)}${sub?`<small>${sub}</small>`:''}`);
    d.style.left=x+'px';d.style.top=y+'px';d.addEventListener('animationend',()=>d.remove());
  }

  // ---------- problems as balloons ----------
  // small additions show as bunches: 2 + 2 is two red balloons and two red balloons
  function bunch(L){
    const op=L.op;
    if(op&&op.o==='+'&&op.a<=10&&op.b<=10)return[[op.a,op.a],[op.b,op.b]];
    if(op&&op.o==='bond')return[[op.a,op.a],[1,'?']];
    return[[1,null]];
  }
  function problemHTML(L){return`<span class="kt">${colorDigits(L.t)}</span>`}
  function balloonsHTML(L){
    const groups=bunch(L),many=groups.reduce((a,g)=>a+g[0],0);
    const size=many>12?22:many>6?28:many===1?60:34;
    return groups.map(([n,v])=>`<div class="kgrp">${Array.from({length:n},()=>
      `<i class="${v==='?'?'q':v==null?'big':''}" style="--b:${v==='?'?'#fff':v==null?pick(['#ffd6e7','#d7f0ff','#e8dcff','#fff1b8']):colorOf(v)};--s:${size}px">${v==='?'?'?':''}</i>`).join('')}</div>`).join('');
  }
  function spawn(){
    let item;
    const qi=T.queue.findIndex(q=>q.due<=T.spawned);
    if(qi>=0)item=T.queue.splice(qi,1)[0];else item=api.problem();
    if(!item)return;
    const {prob}=item,L=prob.layers[0],cargo=pick(T.story.cargo);
    const d=el('kball',`<div class="kbunch">${balloonsHTML(L)}</div><div class="kstr"></div><div class="kcard">${problemHTML(L)}</div><div class="kcargo">${cargo}</div>`);
    let x=W()*.5;
    for(let k=0,best=-1;k<12;k++){const cx=rand(W()*.18,W()*.82);let md=1e9;for(const b of T.balloons)md=Math.min(md,Math.abs(b.x-cx));if(md>best){best=md;x=cx}}
    const h=d.offsetHeight,y=groundY()-h+10;
    const rise=(13+prob.layers.length*5)*save.settings.diff/(1+.05*T.rescued);
    const b={item,prob,li:0,cargo,el:d,x,y,h,vy:(y-shipY())/rise,ph:rand(0,6),popping:false};
    T.balloons.push(b);T.spawned++;SFX.boing();
    place(b);
  }
  function place(b){b.el.style.transform=`translate(${(b.x-b.el.offsetWidth/2)|0}px,${b.y|0}px)`}
  // answer the highest balloon: it's the one about to be taken
  function retarget(){
    let t=null;for(const b of T.balloons)if(!b.popping&&(!t||b.y<t.y))t=b;
    if(t===T.target&&(!t||t.li===T.targetLi))return;
    if(T.target)T.target.el.classList.remove('tgt');
    T.target=t;T.targetLi=t?t.li:-1;
    if(!t){api.hideChoices();return}
    t.el.classList.add('tgt');
    const L=t.prob.layers[t.li];
    api.showChoices(L,v=>{
      if(T.target!==t||t.popping)return true;
      if(v===L.a){shoot(t);return true}
      T.mistakes++;SFX.oops();oopsHero();t.vy*=1.08;return false;
    });
  }
  function shoot(b){
    const L=b.prob.layers[b.li],hero=T.heroes[0];
    b.popping=true;api.hideChoices();
    hero.x=b.x;hero.el.classList.add('dash');hop(hero.el);SFX.boing();
    const star=el('kstar','⭐');const hr=hero.el.getBoundingClientRect();
    star.style.transform=`translate(${b.x|0}px,${hr.top|0}px)`;
    requestAnimationFrame(()=>{star.style.transform=`translate(${b.x|0}px,${(b.y+20)|0}px) rotate(720deg)`});
    later(.35,()=>{star.remove();hero.el.classList.remove('dash');pop(b,L)});
  }
  function pop(b,L){
    const r=b.el.querySelector('.kbunch').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    SFX.balloonPop();confetti(cx,cy,colorOf(L.a));popNumber(cx,cy,L.a,pick(CHEERS));
    bob(T.ship.el);
    if(b.li<b.prob.layers.length-1){ // shield layer: lose half the bunch, show the next step
      b.li++;b.popping=false;b.y+=30;
      const is=[...b.el.querySelectorAll('.kbunch i')];is.slice(0,Math.ceil(is.length/2)).forEach(i=>i.remove());
      b.el.querySelector('.kcard').innerHTML=problemHTML(b.prob.layers[b.li]);
      return;
    }
    // the animal parachutes down
    const cargo=b.el.querySelector('.kcargo').getBoundingClientRect();
    remove(b);
    const f=el('kfall',`<span class="kchute" style="background:${pick(RAINBOW)}"></span><span>${b.cargo}</span>`);
    T.fallers.push({el:f,x:cargo.left+cargo.width/2,y:cargo.top-24,cargo:b.cargo,t:0});
    T.rescued++;
    const slot=T.hud.querySelectorAll('.kslots span')[T.rescued-1];if(slot){slot.textContent=b.cargo;slot.classList.add('got')}
    if(T.story.finale==='rainbow')paintRainbow(T.rescued/T.goal);
    if(T.story.finale==='butterflies')for(let i=0;i<2;i++)addButterfly(cx,cy);
    T.heroes.slice(1).forEach(h=>hop(h.el));
  }
  function remove(b){b.el.remove();T.balloons.splice(T.balloons.indexOf(b),1);if(T.target===b)T.target=null}
  function escape(b){
    const L=b.prob.layers[b.li];
    T.mistakes+=2;remove(b);SFX.giggle();bob(T.ship.el);
    const r=T.ship.el.getBoundingClientRect();
    popNumber(r.left+r.width/2,r.bottom+60,`${L.t} = ${L.a}`,'it will come back!');
    T.queue.push({...b.item,due:T.spawned+2});
  }
  function land(f){
    f.el.remove();
    const a=el('kpet',f.cargo);a.style.left=f.x+'px';a.style.animationDelay=rand(0,.6).toFixed(2)+'s';
    T.pets.push({el:a,cargo:f.cargo});
    const s=SOUND_OF[f.cargo];if(s)SFX[s]();
  }
  // something silly every few seconds
  function silly(){
    if(!T.pets.length)return;
    const p=pick(T.pets);p.el.classList.remove('silly');void p.el.offsetWidth;p.el.classList.add('silly');
    const s=SOUND_OF[p.cargo];if(s)SFX[s]();
  }
  function addButterfly(x,y){
    const d=el('kbfly','🦋');T.flies.push({el:d,x,y,cx:rand(W()*.1,W()*.9),cy:rand(H()*.25,H()*.7),ph:rand(0,6),sp:rand(.6,1.4)});
  }

  // ---------- finale ----------
  function finale(){
    const S=T.story;SFX.cheer();
    T.ship.el.classList.add('flee');SFX.whoosh();
    later(.8,()=>{
      if(S.finale==='rainbow'){paintRainbow(1);root.querySelector('.krainbow').classList.add('shine')}
      const n=S.finale==='butterflies'?40:12;
      for(let i=0;i<n;i++)later(i*.05,()=>addButterfly(rand(0,W()),groundY()));
      for(let i=0;i<6;i++)later(i*.35,()=>{confetti(rand(W()*.15,W()*.85),rand(H()*.2,H()*.5),pick(RAINBOW),40);SFX.balloonPop()});
      T.pets.forEach((p,i)=>later(i*.15,()=>{p.el.classList.add('party');const s=SOUND_OF[p.cargo];if(s&&i<5)SFX[s]()}));
      root.querySelector('.kflowers').classList.add('bloom');
    });
    const stars=T.mistakes<=1?3:T.mistakes<=5?2:1;
    later(5,()=>api.finish(stars,{rescued:T.rescued,oops:T.mistakes}));
  }

  // ---------- lifecycle ----------
  // just the scenery, behind another game (the 10s columns)
  function backdrop(){
    T={phase:'backdrop',timers:[]};root.classList.remove('hidden');scenery();
  }
  function start(lv){
    let si;do si=ri(0,STORIES.length-1);while(si===lastStory&&STORIES.length>1);lastStory=si;
    T={lv,story:STORIES[si],goal:lv.layers>1||lv.kind==='boss'||lv.kind==='big'?6:10,timers:[],balloons:[],fallers:[],pets:[],flies:[],queue:[],
       spawned:0,rescued:0,mistakes:0,spawnT:1,phase:'intro',target:null,sillyT:4};
    root.classList.remove('hidden');scenery();buildCast();
    T.ship.el.classList.add('enter');
    T.heroes.forEach((h,i)=>{h.el.classList.add('enter');h.el.style.animationDelay=(.3+i*.15)+'s'});
    later(1.3,()=>runScene(T.story.intro,()=>{T.phase='play';T.spawnT=.6}));
  }
  function stop(){T=null;root.classList.add('hidden');root.innerHTML='';api.hideChoices()}

  function update(dt){
    if(!T||T.phase==='backdrop')return;
    for(let i=T.timers.length-1;i>=0;i--){const t=T.timers[i];if((t.t-=dt)<=0){T.timers.splice(i,1);t.fn()}}
    if(!T)return; // finish() may have stopped us
    typeStep(dt);
    const w=W(),time=performance.now()/1000;
    // villain blimp drifts; heroes patrol
    if(!T.ship.el.classList.contains('flee')){T.ship.x=w*(.5+.28*Math.sin(time*.35));T.ship.el.style.left=T.ship.x+'px'}
    T.heroes.forEach((h,i)=>{
      const goal=i===0&&T.target?T.target.x:w*h.home+Math.sin(time*.8+i*2)*w*.05;
      h.x+=(goal-h.x)*Math.min(1,dt*(i===0&&T.target?1.6:.8));
      h.el.style.left=h.x+'px';h.el.classList.toggle('flip',goal<h.x-4);
    });
    if(T.phase==='play'){
      const cap=T.rescued<3?1:2,left=T.goal-T.rescued-T.balloons.filter(b=>!b.popping).length;
      if((T.spawnT-=dt)<=0&&T.balloons.length<cap&&left>0){spawn();T.spawnT=rand(1.2,2.2)*save.settings.diff}
      for(const b of [...T.balloons]){
        if(!b.popping)b.y-=b.vy*dt;
        b.x+=Math.sin(time*1.3+b.ph)*12*dt;
        place(b);
        if(!b.popping&&b.y<=shipY())escape(b);
      }
      retarget();
      if(T.rescued>=T.goal&&!T.balloons.length&&!T.fallers.length){
        T.phase='outro';api.hideChoices();
        later(.8,()=>runScene(T.story.outro,finale));
      }
    }
    // parachuting animals
    for(const f of [...T.fallers]){
      f.t+=dt;f.y+=70*dt;const x=f.x+Math.sin(f.t*3)*14;
      f.el.style.transform=`translate(${x|0}px,${f.y|0}px) rotate(${Math.sin(f.t*3)*12}deg)`;
      if(f.y>=groundY()-30){f.x=x;T.fallers.splice(T.fallers.indexOf(f),1);land(f)}
    }
    for(const b of T.flies){
      b.ph+=dt*b.sp;b.x+=(b.cx+Math.cos(b.ph)*w*.12-b.x)*dt*.9;b.y+=(b.cy+Math.sin(b.ph*1.7)*H()*.08-b.y)*dt*.9;
      b.el.style.transform=`translate(${b.x|0}px,${b.y|0}px) scaleX(${Math.cos(b.ph*9)>0?1:-1})`;
    }
    if((T.sillyT-=dt)<=0){T.sillyT=rand(3,6);silly()}
    if(T.say)placeBubble();
  }
  function key(k){
    if(!T||T.phase==='backdrop')return false;
    if(k===' '||k==='Enter'){advance();return true}
    return false;
  }
  root.addEventListener('pointerdown',ev=>{if(T&&T.scene&&!ev.target.closest('.choice'))advance()});

  return{start,backdrop,stop,update,key,get active(){return!!T},get running(){return!!T&&T.phase!=='backdrop'}};
}
