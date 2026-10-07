// Maffblast Kids: a hub of small talking, singing games where math drives the action.
// Games are scripted with async steps (say, wait, until) over a pausable game clock.
import {$,rand,pick,clamp} from '../util.js';
import {save,persist} from '../save.js';
import {audio,SFX} from '../audio.js';
import {speak,cancel,CAST,setMuted,isMuted} from './voice.js';
import {playSong,stopSong,duck,fanfare} from './music.js';
import {Parts,view,drawHand} from './draw.js';
import {SKILLS,makeProblem,demoProblem} from './problems.js';
import kart from './kart.js';
import rocket from './rocket.js';
import dragon from './dragon.js';

const GAMES=[kart,rocket,dragon];
const starsKey=(game,skill)=>`kid:${game}:${skill}`;
const starsOf=(game,skill)=>save.levels[starsKey(game,skill)]?.stars||0;

export function createKidsApp({exit}){
  const root=$('kids');
  let canvas=null,g=null,game=null,screen='off',session=0,paused=false;
  setMuted(!!save.settings.kidsMute);

  // ---------- runtime the games script against ----------
  const K={
    w:innerWidth,h:innerHeight,t:0,parts:new Parts(),hand:{on:false,x:0,y:0,tap:0},shake:0,banner:null,
    sfx:SFX,
    wait(s){const id=session;return new Promise(r=>waits.push({until:K.t+s,r,id}))},
    until(fn){const id=session;return new Promise(r=>conds.push({fn,r,id}))},
    // a character speaks: caption + voice, music ducks; resolves when they finish
    say(who,text){
      const id=session;showCaption(who,text);duck(true);
      return speak(who,text).then(()=>{if(id!==session)return new Promise(()=>{});hideCaption(text);duck(false)});
    },
    sayNow(who,text){cancel();return K.say(who,text)},
    problem(avoid){return makeProblem(K.skill,avoid)},
    demo(){return demoProblem(K.skill)},
    music:{play:playSong,stop:stopSong,fanfare},
    showBanner(text,color='#ff4f9a'){K.banner={text,color,t:0}},
    finish(stars){finish(stars)},
  };
  let waits=[],conds=[];

  // ---------- screens ----------
  function open(){
    audio();root.classList.remove('hidden');root.innerHTML='';
    stopGame();hub();
  }
  function close(){stopGame();stopSong();cancel();root.classList.add('hidden');root.innerHTML='';screen='off'}

  function hub(){
    screen='hub';stopSong();playSong('hub');
    const total=GAMES.reduce((a,gm)=>a+skillsOf(gm).reduce((s,sk)=>s+starsOf(gm.id,sk.id),0),0);
    root.innerHTML=`
      <div class="kh">
        <div class="kh-bg">${Array.from({length:14},(_,i)=>`<span style="left:${rand(0,100)}%;animation-delay:${-rand(0,20)}s;animation-duration:${rand(14,26)}s">${pick(['🎈','⭐','☁️','🦋','🌈','💖'])}</span>`).join('')}</div>
        <div class="kh-top">
          <div class="kh-logo">${[...'MAFFBLAST'].map((c,i)=>`<i style="--i:${i}">${c}</i>`).join('')}<b>KIDS</b></div>
          <div class="kh-stars">⭐ ${total}</div>
          <button class="kh-btn" id="khMute" title="Sound">${isMuted()?'🔇':'🔊'}</button>
          <button class="kh-btn small" id="khGrown" title="Back to the grown-up game">Grown-ups</button>
        </div>
        <div class="kh-games">${GAMES.map((gm,i)=>`
          <button class="kh-game" data-i="${i}" style="--c:${gm.color};--d:${i*.12}s">
            <div class="kh-art">${gm.art}</div>
            <div class="kh-name">${gm.title}</div>
            <div class="kh-sub">${gm.sub}</div>
          </button>`).join('')}</div>
      </div>`;
    root.querySelectorAll('.kh-game').forEach(b=>{
      b.onpointerenter=()=>speak('narrator',GAMES[+b.dataset.i].title,{interrupt:true});
      b.onclick=()=>{audio();skillsScreen(GAMES[+b.dataset.i])};
    });
    $('khMute').onclick=()=>{save.settings.kidsMute=!isMuted();setMuted(save.settings.kidsMute);persist();$('khMute').textContent=isMuted()?'🔇':'🔊'};
    $('khGrown').onclick=()=>{close();exit()};
    speak('narrator','Hi friend! Pick a game!',{interrupt:true});
  }
  const skillsOf=gm=>gm.skills||SKILLS;
  function skillsScreen(gm){
    screen='skills';
    root.innerHTML=`
      <div class="kh" style="--c:${gm.color}">
        <div class="kh-top"><button class="kh-btn" id="khBack">⬅</button><div class="kh-title">${gm.art} ${gm.title}</div></div>
        <div class="kh-skills">${skillsOf(gm).map((sk,i)=>{const st=starsOf(gm.id,sk.id);return`
          <button class="kh-skill" data-i="${i}" style="--d:${i*.05}s">
            <div class="kh-sicon">${sk.icon}</div><div class="kh-sname">${sk.name}</div>
            <div class="kh-sstars">${'★'.repeat(st)}<s>${'★'.repeat(3-st)}</s></div>
          </button>`}).join('')}</div>
      </div>`;
    $('khBack').onclick=hub;
    root.querySelectorAll('.kh-skill').forEach(b=>{
      const sk=skillsOf(gm)[+b.dataset.i];
      b.onpointerenter=()=>speak('narrator',sk.name,{interrupt:true});
      b.onclick=()=>startGame(gm,sk);
    });
    speak('narrator',`${gm.title}! What should we practice?`,{interrupt:true});
  }

  // ---------- playing ----------
  function startGame(gm,sk){
    cancel();stopSong();session++;waits=[];conds=[];paused=false;
    screen='game';
    root.innerHTML=`<canvas class="kc"></canvas>
      <div class="kcap hidden"><div class="kcap-face"></div><div><b></b><p></p></div></div>
      <button class="kh-btn kpause" title="Pause">⏸</button>
      <div class="kover hidden"></div>`;
    canvas=root.querySelector('.kc');g=canvas.getContext('2d');resize();
    root.querySelector('.kpause').onclick=()=>pause(true);
    canvas.addEventListener('pointerdown',ev=>{audio();if(game&&!paused&&game.tap)game.tap(ev.clientX,ev.clientY)});
    Object.assign(K,{t:0,parts:new Parts(),hand:{on:false,x:0,y:0,tap:0},shake:0,banner:null,skill:sk.id,gameId:gm.id,skillName:sk.name,speed:save.settings.diff});
    K.current={gm,sk};
    game=gm.create(K);game.start();
  }
  function stopGame(){session++;waits=[];conds=[];game=null;cancel();duck(false)}
  function finish(stars){
    const {gm,sk}=K.current,key=starsKey(gm.id,sk.id),r=save.levels[key]||{stars:0,best:0};
    r.stars=Math.max(r.stars,stars);save.levels[key]=r;persist();
    fanfare();
    const list=skillsOf(gm),nxt=list[list.indexOf(sk)+1];
    const over=root.querySelector('.kover');over.classList.remove('hidden');
    const word=['','Good job!','Great job!','AMAZING!'][stars];
    over.innerHTML=`<div class="kres">
      <div class="kres-stars">${[0,1,2].map(i=>`<span class="${i<stars?'on':''}" style="--d:${.3+i*.35}s">★</span>`).join('')}</div>
      <div class="kres-word">${word}</div>
      <div class="kres-btns">
        <button class="kres-b" id="krAgain">🔁<small>Again</small></button>
        ${nxt?`<button class="kres-b big" id="krNext">▶<small>Next</small></button>`:''}
        <button class="kres-b" id="krHome">🏠<small>Home</small></button>
      </div></div>`;
    $('krAgain').onclick=()=>startGame(gm,sk);
    if(nxt)$('krNext').onclick=()=>startGame(gm,nxt);
    $('krHome').onclick=()=>{stopGame();hub()};
    screen='results';
    setTimeout(()=>speak('narrator',`${word} You got ${stars} ${stars===1?'star':'stars'}!`,{interrupt:true}),900);
  }
  function pause(on){
    if(screen!=='game'||!game)return;
    paused=on;const over=root.querySelector('.kover');
    if(on){
      cancel();stopSong();
      over.classList.remove('hidden');
      over.innerHTML=`<div class="kres"><div class="kres-word">Paused</div><div class="kres-btns">
        <button class="kres-b big" id="kpGo">▶<small>Play</small></button><button class="kres-b" id="kpHome">🏠<small>Home</small></button></div></div>`;
      $('kpGo').onclick=()=>pause(false);$('kpHome').onclick=()=>{stopGame();hub()};
    }else{over.classList.add('hidden');if(game.song)playSong(game.song)}
  }

  // ---------- captions ----------
  function showCaption(who,text){
    const c=root.querySelector('.kcap');if(!c)return;const p=CAST[who]||CAST.narrator;
    c.classList.remove('hidden');c.classList.toggle('vil',who==='raccoon'||who==='storm');
    c.querySelector('.kcap-face').textContent=p.face;c.querySelector('b').textContent=p.name;c.querySelector('p').textContent=text;
    c.dataset.text=text;c.classList.remove('kpop');void c.offsetWidth;c.classList.add('kpop');
  }
  function hideCaption(text){const c=root.querySelector('.kcap');if(c&&c.dataset.text===text)c.classList.add('hidden')}

  // ---------- loop ----------
  function resize(){
    if(!canvas)return;view.dpr=Math.min(devicePixelRatio||1,2);K.w=innerWidth;K.h=innerHeight;
    canvas.width=K.w*view.dpr;canvas.height=K.h*view.dpr;canvas.style.width=K.w+'px';canvas.style.height=K.h+'px';
  }
  addEventListener('resize',resize);
  function frame(dt){
    if(screen!=='game'&&screen!=='results'||!game||!g)return;
    if(!paused&&screen==='game'){
      K.t+=dt;
      for(let i=waits.length-1;i>=0;i--){const w=waits[i];if(w.id!==session){waits.splice(i,1);continue}if(K.t>=w.until){waits.splice(i,1);w.r()}}
      for(let i=conds.length-1;i>=0;i--){const c=conds[i];if(c.id!==session){conds.splice(i,1);continue}if(c.fn()){conds.splice(i,1);c.r()}}
      game.update(dt);K.parts.update(dt);
      if(K.hand.tap)K.hand.tap=Math.max(0,K.hand.tap-dt*2);
      if(K.banner&&(K.banner.t+=dt)>2.2)K.banner=null;
      K.shake=Math.max(0,K.shake-dt*3);
    }else if(screen==='results'){K.t+=dt*.5;game.update(dt*.5);K.parts.update(dt)}
    g.setTransform(view.dpr,0,0,view.dpr,0,0);
    if(K.shake){g.translate(rand(-1,1)*K.shake*10,rand(-1,1)*K.shake*10)}
    game.draw(g,K.w,K.h);
    if(K.hand.on)drawHand(g,K.hand.x,K.hand.y,K.t,K.hand.tap);
    if(K.banner)drawBanner(g);
  }
  function drawBanner(g){
    const b=K.banner,f=b.t/2.2,k=f<.15?f/.15:f>.8?(1-f)/.2:1,sc=f<.15?.5+.5*(f/.15)+.2*Math.sin(f/.15*Math.PI):1;
    g.save();g.globalAlpha=k;g.translate(K.w/2,K.h*.3);g.scale(sc,sc);g.rotate(-.04);
    g.font=`700 ${Math.min(96,K.w*.09)}px Fredoka`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
    g.lineWidth=16;g.strokeStyle='#fff';g.strokeText(b.text,0,0);g.fillStyle=b.color;g.fillText(b.text,0,0);
    g.restore();
  }
  // keys from main: returns true when used
  function key(ev){
    const k=ev.key;
    if(screen==='results'){if(k==='Enter'||k===' '){(root.querySelector('#krNext')||root.querySelector('#krAgain')).click();return true}if(k==='Escape'){stopGame();hub();return true}return false}
    if(screen==='skills'&&k==='Escape'){hub();return true}
    if(screen!=='game')return false;
    if(k==='Escape'||k==='p'){pause(!paused);return true}
    if(paused){if(k==='Enter'||k===' '){pause(false);return true}return false}
    return game&&game.key?!!game.key(k):false;
  }
  window.__kd={K,get game(){return game},get screen(){return screen}};
  return{open,close,frame,key,get active(){return screen!=='off'}};
}
