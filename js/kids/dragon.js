// Feed the Dragon: Ember the baby dragon wants an exact number of snacks. Tap snacks into
// her mouth (each one counted out loud), then press thumbs-up when you think it's right.
// Too few and she's still hungry; too many and she hiccups one back out.
import {rand,ri,pick,clamp,shuffle} from '../util.js';
import {emo,rr,txt,lerp,ease,colorText} from './draw.js';
import {NUM_COLORS} from './problems.js';

const SNACKS=[{e:'🍓',many:'strawberries'},{e:'🍪',many:'cookies'},{e:'🫐',many:'blueberries'},{e:'🍎',many:'apples'},{e:'🧁',many:'cupcakes'},{e:'🌶️',many:'hot peppers',hot:1},{e:'🍩',many:'donuts'},{e:'🍇',many:'grapes'}];
// snacks worth more than one: cherries come in pairs, grape bunches are 5, chocolate bars are 10
const PACKS={2:{e:'🍒',many:'cherries',say:'Cherries come in pairs!'},5:{e:'🍇',many:'grapes',say:'Each bunch has 5 grapes!'},10:{e:'🍫',many:'chocolate squares',say:'Each chocolate bar has 10 squares!'}};
const SK=[
  {id:'more10',name:'Make 10',icon:'🤝',gen:()=>({target:10,start:ri(2,8),unit:1}),demo:()=>({target:10,start:8,unit:1})},
  {id:'more20',name:'Make 20',icon:'🎯',gen:()=>({target:20,start:ri(11,17),unit:1}),demo:()=>({target:20,start:18,unit:1})},
  {id:'by2',name:'Count by 2s',icon:'🍒',gen:()=>({target:ri(3,10)*2,start:0,unit:2}),demo:()=>({target:4,start:0,unit:2})},
  {id:'by5',name:'Count by 5s',icon:'🖐️',gen:()=>({target:ri(3,8)*5,start:0,unit:5}),demo:()=>({target:10,start:0,unit:5})},
  {id:'by10',name:'Count by 10s',icon:'🔟',gen:()=>({target:ri(3,9)*10,start:0,unit:10}),demo:()=>({target:20,start:0,unit:10})},
];
const ROUNDS=6;
export default {id:'dragon',title:'Feed the Dragon',sub:'Skip count for Ember!',art:'🐲',color:'#22a045',skills:SK,create};

function create(K){
  const S={task:null,snacks:[],count:0,size:.8,sizeTo:.8,mouth:'open',chew:0,blink:0,flap:0,trick:null,trickT:0,fire:0,fireRainbow:false,
    lock:true,round:0,mistakes:0,hic:0,done:false,lastTap:0,cake:0,candles:0,flying:0};
  const song='dragon',skill=SK.find(s=>s.id===K.skill)||SK[0];
  const DX=()=>K.w*.68,DY=()=>K.h*.6,DS=()=>Math.min(K.w,K.h*1.3)/900*S.size;
  const mouth=()=>[DX()-6*DS(),DY()-118*DS()];
  const btn=()=>({x:K.w*.9,y:K.h*.72,r:Math.min(56,K.w*.06)});

  function layoutSnacks(n,ch){
    S.snacks=[];const cols=Math.min(n,4),cell=Math.min(K.w*.085,90),x0=K.w*.26-(cols-1)*cell/2,y0=K.h*.58;
    for(let i=0;i<n;i++)S.snacks.push({ch,hx:x0+(i%cols)*cell,hy:y0+Math.floor(i/cols)*cell*.9,x:0,y:0,st:'plate',t:0,wob:rand(0,6)});
    S.snacks.forEach(s=>{s.x=s.hx;s.y=s.hy});
  }
  function update(dt){
    const t=K.t;
    S.size+=(S.sizeTo-S.size)*Math.min(1,dt*2);
    S.blink-=dt;if(S.blink<-.15)S.blink=rand(2,4);
    S.flap+=dt*(S.trick==='fly'?14:3);
    if(S.chew>0){S.chew-=dt;S.mouth='chew'}else S.mouth=!S.done&&S.task?'open':'happy';
    if(S.fire>0){S.fire-=dt;const [mx,my]=mouth();for(let i=0;i<4;i++)K.parts.add({kind:'puff',x:mx-20,y:my+10,vx:-rand(250,450),vy:rand(-60,60),drag:.8,life:.7,size:rand(10,22),
      color:S.fireRainbow?pick(['#ff3b3b','#ff8c1a','#ffd000','#22c55e','#3a86ff','#9b5de5']):pick(['#ff7b00','#ffb703','#ff3d00','#ffd166'])})}
    if(S.trick){S.trickT+=dt;if(S.trickT>1.6){S.trick=null}}
    for(const s of S.snacks){
      if(s.st==='fly'){s.t+=dt/.45;const [mx,my]=mouth(),k=ease(Math.min(1,s.t));s.x=lerp(s.fx,mx,k);s.y=lerp(s.fy,my,k)-Math.sin(k*Math.PI)*K.h*.18;
        if(s.t>=1){s.st='eaten';eat()}}
      else if(s.st==='back'){s.t+=dt/.6;const k=ease(Math.min(1,s.t));s.x=lerp(s.fx,s.hx,k);s.y=lerp(s.fy,s.hy,k)-Math.sin(k*Math.PI)*K.h*.15;if(s.t>=1)s.st='plate'}
    }
    if(Math.random()<dt*2)K.parts.add({kind:'dot',x:rand(0,K.w),y:rand(K.h*.2,K.h*.7),vx:rand(-10,10),vy:rand(-10,10),life:rand(1.5,3),size:rand(2,4),color:'#fff7b0'});
    if(S.cake&&Math.random()<dt*5)K.parts.add({kind:'emoji',ch:pick(['🎈','🎉','💖','⭐']),x:rand(0,K.w),y:K.h+30,vy:-rand(120,220),life:4,size:rand(28,46)});
  }
  function eat(){
    S.count+=S.task.unit;S.chew=.35;K.sfx.peep();
    const [mx,my]=mouth();K.parts.add({kind:'emoji',ch:'✨',x:mx,y:my,vy:-60,life:.6,size:26});
    S.pops=(S.pops||[]).concat({n:S.count,t:0});
    K.sayNow('dragon',S.count+'!');
  }
  function draw(g,w,h){
    // dusk picnic sky
    const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#7b6cf6');gr.addColorStop(.45,'#ff9ec7');gr.addColorStop(.75,'#ffd59e');g.fillStyle=gr;g.fillRect(0,0,w,h);
    emo(g,'🌙',w*.12,h*.12,60);for(let i=0;i<12;i++)emo(g,'✨',((i*137)%100)/100*w,((i*71)%40)/100*h+20,12+((i*13)%10),0,.5+.5*Math.sin(K.t*2+i));
    g.fillStyle='#8fd694';g.beginPath();g.moveTo(0,h*.66);g.quadraticCurveTo(w*.3,h*.56,w*.62,h*.66);g.quadraticCurveTo(w*.85,h*.74,w,h*.64);g.lineTo(w,h);g.lineTo(0,h);g.fill();
    g.fillStyle='#6cc070';g.fillRect(0,h*.78,w,h);
    emo(g,'🌳',w*.06,h*.6,Math.min(160,w*.13));emo(g,'🍄',w*.44,h*.8,40);emo(g,'🌷',w*.93,h*.8,36);emo(g,'🌼',w*.5,h*.9,30);
    // picnic blanket
    const bx=w*.26,by=h*.66,bw=Math.min(w*.4,460),bh=h*.26;
    g.save();g.translate(bx,by);g.transform(1,0,-.25,1,0,0);
    for(let i=0;i<8;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#ff6b81':'#fff';g.fillRect(-bw/2+i*bw/8,-bh*.15+j*bh/4,bw/8+1,bh/4+1)}
    g.restore();
    // snacks on the blanket (and in flight)
    const u=S.task?S.task.unit:1,ss=Math.min(w*.07,72);
    for(const s of S.snacks)if(s.st!=='eaten'){const bob=s.st==='plate'?Math.sin(K.t*3+s.wob)*3:0;emo(g,s.ch,s.x,s.y+bob,ss,s.st==='plate'?Math.sin(K.t*2+s.wob)*.08:K.t*8);
      if(u>1&&s.st==='plate'){g.fillStyle='#fff';g.beginPath();g.arc(s.x+ss*.36,s.y+bob-ss*.36,ss*.22,0,7);g.fill();colorText(g,String(u),s.x+ss*.36,s.y+bob-ss*.34,ss*.3)}}
    drawDragon(g,DX(),DY(),DS());
    // the wish: a thought bubble with the number (and empty spots to fill for small numbers)
    if(S.task&&!S.done)drawWish(g);
    // number pops as she counts
    S.pops=(S.pops||[]).filter(p=>(p.t+=1/60)<1.2);
    for(const p of S.pops){const [mx,my]=mouth();g.globalAlpha=1-p.t/1.2;colorText(g,String(p.n),mx-90*DS(),my-40-p.t*80,60,{stroke:10});g.globalAlpha=1}
    if(S.cake)drawCake(g,w,h);
    K.parts.draw(g);
    // thumbs-up button
    if(S.task&&!S.done){const b=btn(),pulse=S.count===S.task.target?1+Math.sin(K.t*6)*.05:1;
      g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.arc(b.x,b.y+6,b.r*pulse,0,7);g.fill();
      g.fillStyle='#22c55e';g.beginPath();g.arc(b.x,b.y,b.r*pulse,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=6;g.stroke();
      emo(g,'👍',b.x,b.y,b.r*1.1)}
    // progress: little dragons along the top
    for(let i=0;i<ROUNDS;i++)emo(g,i<S.round?'🐲':'🥚',w/2+(i-(ROUNDS-1)/2)*44,30,30);
  }
  function drawWish(g){
    const T=S.task,s=DS(),x=DX()-230*s-60,y=DY()-260*s-40,n=T.target/T.unit,outline=n<=10;
    const W=Math.max(150,Math.min(n,5)*46+40),H=(outline?Math.ceil(n/5)*46:0)+110;
    g.fillStyle='#fff';for(const [dx,dy,r] of [[-.35,0,.42],[.35,0,.42],[0,-.2,.5],[0,.25,.45]]){g.beginPath();g.ellipse(x+dx*W,y+dy*H,r*W,r*H*.9,0,0,7);g.fill()}
    g.beginPath();g.arc(x+W*.45,y+H*.62,12,0,7);g.fill();g.beginPath();g.arc(x+W*.6,y+H*.8,7,0,7);g.fill();
    colorText(g,String(T.target),x,y-(outline?H*.18:0),66,{stroke:0});
    if(outline){
      const cols=Math.min(n,5);
      for(let i=0;i<n;i++){const cx=x+(i%cols-(cols-1)/2)*44,cy=y+H*.15+Math.floor(i/5)*44;
        if(i<S.count/T.unit)emo(g,S.snackCh,cx,cy,34);else{g.strokeStyle='#c9cfdb';g.lineWidth=3;g.setLineDash([5,5]);g.beginPath();g.arc(cx,cy,16,0,7);g.stroke();g.setLineDash([])}}
    }
  }
  function drawDragon(g,x,y,s){
    const t=K.t,hop=S.trick==='hop'?Math.abs(Math.sin(S.trickT*8))*40:0,fly=S.trick==='fly'?Math.sin(S.trickT/1.6*Math.PI)*120:0,spin=S.trick==='spin'?S.trickT/1.6*Math.PI*2:0;
    g.save();g.translate(x,y-hop-fly);g.scale(s,s);g.rotate(Math.sin(spin)*.0+spin);
    const body='#4fc46a',light='#c9f7a8',dark='#2f9e4f',bob=Math.sin(t*2.4)*4;
    // tail
    g.strokeStyle=body;g.lineWidth=34;g.lineCap='round';g.beginPath();g.moveTo(40,60);g.quadraticCurveTo(150,90+Math.sin(t*3)*10,170,10);g.stroke();
    g.fillStyle='#ffb703';g.beginPath();g.moveTo(170,-28);g.lineTo(196,12);g.lineTo(150,14);g.fill();
    // wings
    const fl=Math.sin(S.flap)*.35;
    for(const sd of [-1,1]){g.save();g.translate(sd*50,-30);g.rotate(sd*(.5+fl));g.fillStyle='#a78bfa';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(sd*90,-90,sd*120,-20);g.quadraticCurveTo(sd*80,-30,sd*70,10);g.quadraticCurveTo(sd*40,0,0,20);g.fill();g.restore()}
    // body + belly
    g.fillStyle=body;g.beginPath();g.ellipse(0,40+bob,82,92,0,0,7);g.fill();
    g.fillStyle=light;g.beginPath();g.ellipse(-4,58+bob,52,62,0,0,7);g.fill();
    g.strokeStyle='#a6e38a';g.lineWidth=4;for(let i=0;i<4;i++){g.beginPath();g.arc(-4,20+bob+i*24,38-Math.abs(i-1.5)*5,Math.PI*.15,Math.PI*.85);g.stroke()}
    // tummy glow when full
    if(S.trick)  {g.fillStyle=`rgba(255,240,150,${.3+.2*Math.sin(t*10)})`;g.beginPath();g.ellipse(-4,58+bob,46,56,0,0,7);g.fill()}
    // feet
    g.fillStyle=dark;g.beginPath();g.ellipse(-46,126,30,16,0,0,7);g.fill();g.beginPath();g.ellipse(40,126,30,16,0,0,7);g.fill();
    // head
    const hy=-112+bob;
    g.fillStyle='#ffd166';for(const sd of [-1,1]){g.beginPath();g.moveTo(sd*30,hy-50);g.lineTo(sd*46,hy-92);g.lineTo(sd*56,hy-44);g.fill()}
    g.fillStyle=body;g.beginPath();g.arc(0,hy,66,0,7);g.fill();
    g.fillStyle=light;g.beginPath();g.ellipse(-6,hy+28,44,30,0,0,7);g.fill();
    // eyes follow the snack in flight
    const fly1=S.snacks.find(q=>q.st==='fly'),lx=fly1?clamp((fly1.x-x)/300,-1,1)*6:-3,ly=fly1?clamp((fly1.y-(y+hy*s))/300,-1,1)*6:0;
    for(const sd of [-1,1]){const ex=sd*26-4,ey=hy-14;
      if(S.blink>0&&S.mouth!=='happy'){g.fillStyle='#fff';g.beginPath();g.ellipse(ex,ey,17,21,0,0,7);g.fill();g.fillStyle='#1f2433';g.beginPath();g.arc(ex+lx,ey+ly,10,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(ex+lx-4,ey+ly-5,4,0,7);g.fill()}
      else{g.strokeStyle='#1f2433';g.lineWidth=5;g.beginPath();g.arc(ex,ey+2,11,Math.PI*1.1,Math.PI*1.9);g.stroke()}
      g.fillStyle='rgba(255,120,150,.5)';g.beginPath();g.ellipse(sd*44-4,hy+14,12,8,0,0,7);g.fill()}
    g.fillStyle=dark;g.beginPath();g.arc(-16,hy+18,4,0,7);g.fill();g.beginPath();g.arc(4,hy+18,4,0,7);g.fill();
    // mouth
    const my=hy+40;
    if(S.mouth==='open'){const o=10+Math.sin(t*5)*3;g.fillStyle='#7a1f3d';g.beginPath();g.ellipse(-6,my,22,o+6,0,0,7);g.fill();g.fillStyle='#ff7aa8';g.beginPath();g.ellipse(-6,my+o*.6,13,6,0,0,7);g.fill()}
    else if(S.mouth==='chew'){g.strokeStyle='#1f2433';g.lineWidth=5;g.beginPath();g.moveTo(-28,my);for(let i=0;i<5;i++)g.lineTo(-28+i*11+5,my+(i%2?-6:4)*Math.sin(t*30));g.stroke()}
    else{g.strokeStyle='#1f2433';g.lineWidth=5;g.beginPath();g.arc(-6,my-8,18,Math.PI*.15,Math.PI*.85);g.stroke()}
    if(S.hic>K.t)emo(g,'💨',60,my-10,40);
    g.restore();
  }
  function drawCake(g,w,h){
    const x=w*.36,y=h*.62,s=Math.min(200,w*.18);
    emo(g,'🎂',x,y,s);
    if(S.candles)for(let i=0;i<3;i++)emo(g,'✨',x-s*.25+i*s*.25,y-s*.75+Math.sin(K.t*6+i)*6,s*.2,0,.6+.4*Math.sin(K.t*8+i));
  }

  // ---------- gameplay ----------
  function feed(s){
    if(S.lock||S.done||!s||s.st!=='plate')return;
    s.st='fly';s.t=0;s.fx=s.x;s.fy=s.y;K.sfx.boing();S.lastTap=K.t;
  }
  const nextSnack=()=>S.snacks.find(s=>s.st==='plate');
  let resolveDone=null;
  function thumbs(){if(S.lock||S.done||!S.task||S.snacks.some(s=>s.st==='fly'))return;K.sfx.select();resolveDone&&resolveDone()}
  async function round(task,{demo=false,guided=false}={}){
    const sn=task.unit>1?PACKS[task.unit]:pick(SNACKS);S.snackCh=sn.e;
    S.task=task;S.count=task.start;S.done=false;S.mouth='open';
    const more=(task.target-task.start)/task.unit;
    layoutSnacks(more+ri(2,3),sn.e);
    if(task.start)await K.say('narrator',`Ember already ate ${task.start}. She wants ${task.target} ${sn.many} in all!`);
    else await K.say('dragon',`I want ${task.target} ${sn.many}!${sn.say&&(demo||guided||S.round===0)?' '+sn.say:''}`);
    if(demo){
      await K.say('narrator','Watch me count!');
      for(let i=0;i<more;i++){const s=nextSnack();K.hand.on=true;for(let k=0;k<14;k++){K.hand.x=lerp(K.hand.x,s.x,.3);K.hand.y=lerp(K.hand.y,s.y,.3);await K.wait(.03)}K.hand.tap=1;feed(s);await K.wait(1)}
      await K.say('narrator',`That's ${task.target}! Now press the thumbs up!`);
      const b=btn();for(let k=0;k<16;k++){K.hand.x=lerp(K.hand.x,b.x,.3);K.hand.y=lerp(K.hand.y,b.y,.3);await K.wait(.03)}K.hand.tap=1;K.sfx.select();await K.wait(.4);K.hand.on=false;
    }else{
      S.lock=false;
      let hinted=false;
      const hint=async()=>{while(!S.done&&S.task===task){await K.wait(.5);if(guided&&!hinted&&K.t-S.lastTap>5){hinted=true;const s=S.count<task.target?nextSnack():null;const b=btn();K.hand.on=true;K.hand.x=s?s.x:b.x;K.hand.y=s?s.y:b.y;K.hand.tap=1}}};
      S.lastTap=K.t;hint();
      while(true){
        await new Promise(r=>{resolveDone=r});resolveDone=null;K.hand.on=false;
        if(S.count===task.target)break;
        S.lock=true;
        if(S.count<task.target){
          if(!guided&&!demo)S.mistakes++;
          await K.say('dragon',`I'm still hungry! I want ${task.target}.`);
        }else{
          if(!guided&&!demo)S.mistakes++;
          S.hic=K.t+1;K.sfx.boing();K.shake=.3;
          const s=[...S.snacks].reverse().find(q=>q.st==='eaten');
          if(s){s.st='back';s.t=0;const [mx,my]=mouth();s.fx=mx;s.fy=my;S.count-=task.unit}
          await K.say('dragon',`Hic! Too many! I wanted ${task.target}.`);
        }
        S.lock=false;S.lastTap=K.t;
      }
    }
    // just right!
    S.done=true;S.lock=true;S.mouth='happy';
    K.parts.confetti(DX(),DY()-100,40);K.sfx.cheer();
    await K.say('dragon',pick([`Yum yum! ${task.target} ${sn.many}!`,`${task.target}! Just right!`,`Mmm! ${task.target} ${sn.many}! Thank you!`]));
    if(!demo&&!guided){
      S.round++;S.sizeTo+=.06;
      const tr=sn.hot?'fire':pick(['hop','fly','spin','fire']);S.trick=tr==='fire'?'hop':tr;S.trickT=0;
      if(tr==='fire'){S.fire=1.2;S.fireRainbow=!sn.hot;K.sfx.whoosh()}else K.sfx.boing();
      if(sn.hot)await K.say('dragon','Spicy! Haaaa!');
      await K.wait(1.2);
    }
    S.task=null;
  }
  async function script(){
    await K.wait(.5);
    K.music.play(song);
    await K.say('narrator','This is Ember, the baby dragon. She is SO hungry!');
    await K.say('dragon','Hungry hungry hungry!');
    await K.say('narrator','Give Ember exactly what she asks for. Not too many, not too few!');
    await round(skill.demo(),{demo:true});
    await K.say('narrator',"Your turn! Tap a snack to feed her. Or press Space. Then press thumbs up!");
    await round(skill.gen(),{guided:true});
    await K.say('narrator','Wonderful! Ember wants more!');
    let last=0;
    while(S.round<ROUNDS){let tk;do tk=skill.gen();while(tk.target===last&&tk.start===0);last=tk.target;await round(tk)}
    // grown up: she lights the birthday candles
    S.sizeTo=1.25;S.trick='fly';S.trickT=0;K.sfx.whoosh();
    await K.say('dragon',"Look at me! I'm a big dragon now!");
    S.cake=1;K.music.fanfare();
    await K.say('narrator','And just in time for her birthday cake!');
    S.fire=1;S.fireRainbow=true;await K.wait(.8);S.candles=1;K.parts.confetti(K.w*.36,K.h*.5,80);K.showBanner('HAPPY BIRTHDAY!','#ff4f9a');
    await K.say('dragon','Thank you for feeding me, friend!');
    await K.wait(1);
    K.finish(S.mistakes===0?3:S.mistakes<=2?2:1);
  }
  function key(k){
    if(k===' '||k==='ArrowRight'||k==='ArrowUp'){feed(nextSnack());return true}
    if(k==='Enter'){thumbs();return true}
    return k.startsWith('Arrow');
  }
  function tap(x,y){
    const b=btn();if(Math.hypot(x-b.x,y-b.y)<b.r*1.2){thumbs();return}
    let best=null,bd=1e9;for(const s of S.snacks)if(s.st==='plate'){const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=s}}
    if(best&&bd<Math.min(K.w*.07,80))feed(best);
  }
  return{song,S,start(){script()},update,draw,key,tap};
}
