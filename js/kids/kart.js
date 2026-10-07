// Kitty Kart Chase: Mr. Grumbles stole the birthday cake. Steer the kart into the lane
// with the right answer: boost pads zoom you closer, mud puddles spin you out.
import {rand,ri,pick,clamp} from '../util.js';
import {emo,rr,txt,drawProblem,lerp,ease,mixColor} from './draw.js';
import {choicesFor,answerSay} from './problems.js';

const BIOMES=[
  {name:'Sunny Meadow',sky:['#5cc8ff','#d4f3ff'],grass:['#6bd66f','#5fca64'],road:['#7c8496','#727a8b'],hill:'#a6e89a',hill2:'#7fd37a',props:['🌳','🌷','🌻','🍄','🌳','🌼','🐄','🏡']},
  {name:'Candy Land',sky:['#ff8fd0','#ffe4f4'],grass:['#ffc4e4','#ffb6dd'],road:['#a68af5','#9b7ef0'],hill:'#ffd9ef',hill2:'#f7b8de',props:['🍭','🍬','🧁','🍩','🍦','🍫','🎂','🍡']},
  {name:'Sparkle Beach',sky:['#38bdf8','#fff3c4'],grass:['#ffe39b','#ffd97f'],road:['#8c96aa','#7f899c'],hill:'#7dd3fc',hill2:'#4fb8e8',props:['🌴','🐚','🦀','⛱️','🌴','🐬','🏖️','🦩']},
];
const CHEERS=['Zoom!','Wheee!','Yes! Faster!','Purr-fect!','Turbo time!','Vroom vroom!','Super kitty speed!'];
const LANES=[-1,0,1];

export default {id:'kart',title:'Kitty Kart Chase',sub:'Chase the cake thief!',art:'🏎️',color:'#ff4f9a',create};

function create(K){
  const S={lane:0,kx:0,trav:0,speed:0,cruise:20,boost:0,spin:0,spinA:0,jump:0,curve:0,curveTo:0,curveAcc:0,
    gap:6,van:{lx:0,flee:false,stop:false},props:[],gates:[],banana:null,ramp:null,biome:0,flash:0,
    prob:null,probPop:0,solved:false,lock:true,correct:0,wrong:0,slips:0,events:0,party:false,clouds:[],gateT:4.2};
  for(let i=0;i<6;i++)S.clouds.push({x:rand(0,1),y:rand(.04,.24),s:rand(.7,1.3)});
  const song='kart';

  // ---------- projection ----------
  const HZ=()=>K.h*.4,YK=()=>K.h*.86,RW=()=>Math.min(K.w*.34,K.h*.62);
  const NEAR=10;
  const pOf=dz=>1/(1+Math.max(dz,-9.5)/NEAR);
  const yOf=p=>HZ()+p*(YK()-HZ());
  const cxOf=p=>K.w/2+S.curve*(1-Math.min(p,1))**2*K.w*.45;
  const laneX=(lx,p)=>cxOf(p)+lx*.64*p*RW();
  const B=()=>BIOMES[S.biome];

  // ---------- world ----------
  function spawnProps(){
    let far=S.props.reduce((m,p)=>Math.max(m,p.dz),0);
    while(far<90){far+=rand(3,6);S.props.push({dz:far,side:Math.random()<.5?-1:1,off:rand(1.35,2.4),e:pick(B().props),s:rand(.8,1.2)})}
  }
  function update(dt){
    const t=K.t;
    // steering
    S.kx+=(S.lane-S.kx)*Math.min(1,dt*9);
    // speed
    S.boost=Math.max(0,S.boost-dt*.7);
    let sp=S.cruise+S.boost*26;
    if(S.spin>0){S.spin-=dt;S.spinA+=dt*14;sp*=.35}else S.spinA=0;
    if(S.party)sp=0;
    S.speed+=(sp-S.speed)*Math.min(1,dt*2.5);
    const d=S.speed*dt;S.trav+=d;
    // road bends now and then
    if(Math.random()<dt*.25)S.curveTo=rand(-1,1)*(Math.random()<.3?0:1);
    S.curve+=(S.curveTo-S.curve)*dt*.6;S.curveAcc+=S.curve*d*.004;
    for(const p of S.props)p.dz-=d;
    S.props=S.props.filter(p=>p.dz>-3);spawnProps();
    // the van wanders and keeps its distance unless stopped
    S.van.lx=Math.sin(t*.6)*.55;
    if(S.van.flee)S.gap=Math.min(100,S.gap+dt*70);
    for(const gt of S.gates){
      if(!gt.hold&&!gt.done){gt.dz-=d;if(gt.dz<=.8)resolveGate(gt)}
      if(gt.done)gt.dz-=d;
    }
    S.gates=S.gates.filter(gt=>gt.dz>-4);
    const b=S.banana;
    if(b){
      if(b.t<1){b.t=Math.min(1,b.t+dt*1.4);b.dz=lerp(b.from,b.to,ease(b.t));b.lx=lerp(S.van.lx,b.lane,b.t);b.h=Math.sin(b.t*Math.PI)}
      else{b.dz-=d;if(!b.done&&b.dz<=.6){b.done=true;b.hit=Math.round(S.kx)===b.lane;if(b.hit)slip()}}
      if(b.dz<-4)S.banana=null;
    }
    const r=S.ramp;
    if(r){r.dz-=d;if(!r.done&&r.dz<=.4){r.done=true;S.jump=1e-6;K.sfx.boing()}if(r.dz<-4)S.ramp=null}
    if(S.jump>0){S.jump+=dt/1.15;if(S.jump>=1){S.jump=0;K.parts.sparkle(laneX(S.kx,1),YK(),18,120);K.shake=.6;K.sfx.balloonPop()}}
    if(S.prob)S.probPop+=dt*3;
    S.flash=Math.max(0,S.flash-dt*1.5);
    // exhaust
    if(Math.random()<dt*(S.boost>0?30:6)){const x=laneX(S.kx,1)+pick([-34,34])*RW()/430;K.parts.puff(x,YK()-26*RW()/430,1,S.boost>0?'#ffd6a5':'#eef0f5',S.boost>0?9:6)}
    if(S.party&&Math.random()<dt*6)K.parts.add({kind:'emoji',ch:pick(['🎈','🎉','💖','⭐']),x:rand(0,K.w),y:K.h+30,vy:-rand(120,220),vx:rand(-30,30),life:4,size:rand(30,50)});
  }

  // ---------- drawing ----------
  function draw(g,w,h){
    const hz=HZ(),yk=YK(),rw=RW(),bm=B();
    // sky
    let gr=g.createLinearGradient(0,0,0,hz);gr.addColorStop(0,bm.sky[0]);gr.addColorStop(1,bm.sky[1]);g.fillStyle=gr;g.fillRect(0,0,w,hz+2);
    emo(g,'🌞',w*.84,h*.11+Math.sin(K.t)*4,Math.min(90,w*.08),K.t*.1);
    for(const c of S.clouds){const x=((c.x*w*1.4-S.curveAcc*w*.3+K.t*8)%(w*1.4)+w*1.4)%(w*1.4)-w*.2;cloud(g,x,c.y*h,c.s*Math.min(1,w/900))}
    // hills scroll sideways as the road bends
    hills(g,w,hz,bm.hill,.6,48,S.curveAcc*.5);hills(g,w,hz,bm.hill2,1.1,30,S.curveAcc);
    // road, drawn in strips from the horizon down
    for(let y=Math.floor(hz)+1;y<h;y+=3){
      const p=(y-hz)/(yk-hz);if(p<=.003)continue;
      const dz=NEAR*(1/p-1),s=Math.floor((dz+S.trav)/5)&1,c=cxOf(p),hw=p*rw;
      g.fillStyle=bm.grass[s];g.fillRect(0,y,w,3);
      g.fillStyle=s?'#ff5a6e':'#ffffff';g.fillRect(c-hw*1.13,y,hw*.13,3);g.fillRect(c+hw,y,hw*.13,3);
      g.fillStyle=bm.road[s];g.fillRect(c-hw,y,hw*2,3);
      if(s){g.fillStyle='#ffffffcc';const lw=Math.max(1,hw*.025);g.fillRect(c-hw/3-lw/2,y,lw,3);g.fillRect(c+hw/3-lw/2,y,lw,3)}
    }
    // things on the road, far to near
    const items=[];
    for(const p of S.props)items.push({dz:p.dz,f:()=>{const pp=pOf(p.dz),sz=pp*rw*.55*p.s;emo(g,p.e,cxOf(pp)+p.side*p.off*pp*rw,yOf(pp)-sz*.45,sz)}});
    for(const gt of S.gates)items.push({dz:gt.dz,f:()=>drawGate(g,gt)});
    if(S.banana)items.push({dz:S.banana.dz,f:()=>drawBanana(g,S.banana)});
    if(S.ramp)items.push({dz:S.ramp.dz,f:()=>drawRamp(g,S.ramp)});
    const vdz=3+S.gap*.42;items.push({dz:vdz,f:()=>drawVan(g,vdz)});
    items.sort((a,b)=>b.dz-a.dz).forEach(i=>{if(i.dz>-3&&i.dz<120)i.f()});
    // the kart
    const jy=S.jump>0?-Math.sin(S.jump*Math.PI)*h*.22:0,jr=S.jump>0?S.jump*Math.PI*2:0;
    drawKart(g,laneX(S.kx,1),yk+jy,rw/430,(S.lane-S.kx),S.spinA+jr);
    K.parts.draw(g);
    if(S.party){g.fillStyle='rgba(255,255,255,.4)';g.fillRect(0,0,w,h);drawParty(g,w,h)}
    // problem card + chase meter
    if(S.prob)drawProblem(g,S.prob,w/2,h*.085,w,{solved:S.solved,pop:S.probPop,t:K.t});
    drawMeter(g,w,h);
    if(S.flash){g.fillStyle=`rgba(255,255,255,${S.flash*.8})`;g.fillRect(0,0,w,h)}
  }
  function cloud(g,x,y,s){g.fillStyle='rgba(255,255,255,.92)';for(const [dx,dy,r] of [[0,0,26],[24,-10,22],[46,0,24],[22,8,22]]){g.beginPath();g.arc(x+dx*s*1.4,y+dy*s*1.4,r*s*1.4,0,7);g.fill()}}
  function hills(g,w,hz,color,freq,amp,off){
    g.fillStyle=color;g.beginPath();g.moveTo(0,hz+2);
    for(let x=0;x<=w;x+=12){const u=x/w*6*freq+off;g.lineTo(x,hz-amp*(.55+.45*Math.sin(u)*Math.sin(u*.37+1)))}
    g.lineTo(w,hz+2);g.fill();
  }
  function drawGate(g,gt){
    const p=pOf(gt.dz),rw=RW(),y=yOf(p),bw=p*rw*.52,bh=bw*.66;
    LANES.forEach((lx,i)=>{
      const x=laneX(lx,p),isAns=i===gt.ans,dim=gt.guided&&!isAns;
      g.globalAlpha=dim?.3:1;
      // glowing pad on the road
      let pad='#9be7ff';if(gt.done)pad=isAns?'#4ade80':'#8b5a2b';
      g.fillStyle=pad;g.globalAlpha=(dim?.3:1)*(gt.done?.95:.55+.25*Math.sin(K.t*6));
      g.beginPath();g.ellipse(x,y,bw*.6,Math.max(2,p*rw*.07),0,0,7);g.fill();
      g.globalAlpha=dim?.3:1;
      // sign on posts
      const by=y-p*rw*.62;
      g.fillStyle='#5b4636';g.fillRect(x-bw*.42,by,Math.max(1,bw*.05),y-by);g.fillRect(x+bw*.37,by,Math.max(1,bw*.05),y-by);
      const good=gt.done&&isAns,bad=gt.done&&!isAns;
      g.fillStyle='rgba(0,0,0,.15)';rr(g,x-bw/2,by-bh+bh*.08,bw,bh,bh*.22);g.fill();
      g.fillStyle=good?'#dcfce7':bad?'#e5e7eb':'#ffffff';rr(g,x-bw/2,by-bh,bw,bh,bh*.22);g.fill();
      g.strokeStyle=good?'#22c55e':gt.picked===i&&bad?'#ef4444':'#3a86ff';g.lineWidth=Math.max(1,bh*.08);rr(g,x-bw/2,by-bh,bw,bh,bh*.22);g.stroke();
      txt(g,String(gt.vals[i]),x,by-bh/2+bh*.04,bh*.72,bad?'#9ca3af':'#1e2a4a');
      if(good&&p>.3)emo(g,'⭐',x+bw*.45,by-bh,bh*.5,K.t*3);
    });
    g.globalAlpha=1;
  }
  function drawBanana(g,b){
    const p=pOf(b.dz),x=laneX(b.lx,p),y=yOf(p)-b.h*RW()*.5*p,s=p*RW()*.32;
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(laneX(b.lx,p),yOf(p),s*.45,s*.12,0,0,7);g.fill();
    emo(g,'🍌',x,y-s*.3,s,b.t<1?b.t*12:0);
    if(b.t>=1&&!b.done&&Math.sin(K.t*10)>0)emo(g,'❗',x,y-s*1.1,s*.6);
  }
  function drawRamp(g,r){
    const p=pOf(r.dz),y=yOf(p),c=cxOf(p),hw=p*RW()*1.02,hh=p*RW()*.22;
    g.fillStyle='#f59e0b';g.beginPath();g.moveTo(c-hw,y);g.lineTo(c+hw,y);g.lineTo(c+hw*.96,y-hh);g.lineTo(c-hw*.96,y-hh);g.fill();
    g.fillStyle='#fde68a';for(let i=-3;i<=3;i++){const x=c+i*hw*.27;g.beginPath();g.moveTo(x-hw*.08,y-hh*.2);g.lineTo(x,y-hh*.8);g.lineTo(x+hw*.08,y-hh*.2);g.fill()}
  }
  function drawVan(g,dz){
    const p=pOf(dz),x=laneX(S.van.lx,p),y=yOf(p),W=p*RW()*.7,H=W*.66,bob=Math.sin(K.t*9)*W*.012;
    g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x,y,W*.55,W*.08,0,0,7);g.fill();
    g.fillStyle='#2b2d42';rr(g,x-W*.48,y-W*.16,W*.2,W*.16,W*.04);g.fill();rr(g,x+W*.28,y-W*.16,W*.2,W*.16,W*.04);g.fill();
    g.fillStyle='#8a5cf6';rr(g,x-W/2,y-H-W*.08+bob,W,H,W*.1);g.fill();
    g.fillStyle='#6d3fd9';rr(g,x-W/2,y-W*.2+bob,W,W*.12,W*.04);g.fill();
    g.fillStyle='#bfe9ff';rr(g,x-W*.36,y-H+W*.02+bob,W*.72,H*.42,W*.06);g.fill();
    emo(g,'🦝',x-W*.12,y-H+W*.17+bob,H*.36);emo(g,'🎂',x+W*.17,y-H+W*.19+bob,H*.3);
    g.fillStyle='#ff3b3b';g.fillRect(x-W*.47,y-W*.42+bob,W*.07,W*.1);g.fillRect(x+W*.4,y-W*.42+bob,W*.07,W*.1);
    if(Math.random()<.2&&!S.party)K.parts.puff(x-W*.3,y-W*.1,1,'#ddd',W*.06);
  }
  function drawKart(g,x,y,s,steer,spin){
    const t=K.t;
    g.save();g.translate(x,y);g.scale(s,s);
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,2,92,14,0,0,7);g.fill();
    g.rotate(steer*.1+Math.sin(spin)*.25);
    if(spin)g.rotate(spin);
    // wheels
    for(const wx of [-84,50]){g.fillStyle='#22232b';rr(g,wx,-50,34,52,12);g.fill();
      g.strokeStyle='#4a4c58';g.lineWidth=4;for(let k=0;k<3;k++){const yy=-44+((t*90+k*16)%48);g.beginPath();g.moveTo(wx+4,yy);g.lineTo(wx+30,yy);g.stroke()}}
    // flames when boosting
    if(S.boost>0)for(const ex of [-30,30])emo(g,'🔥',ex,-6+Math.sin(t*40)*3,34+S.boost*30+Math.random()*10,Math.PI);
    // body
    g.fillStyle='#ff4f6d';rr(g,-66,-78,132,58,22);g.fill();
    g.fillStyle='#ff8aa0';rr(g,-58,-73,116,12,6);g.fill();
    g.fillStyle='#ffffff';rr(g,-24,-52,48,20,6);g.fill();txt(g,'KITTY',0,-41,13,'#ff4f6d');
    for(const ex of [-34,34]){g.fillStyle='#9aa0ae';g.beginPath();g.arc(ex,-26,8,0,7);g.fill();g.fillStyle='#3d404a';g.beginPath();g.arc(ex,-26,4,0,7);g.fill()}
    // capes flutter behind the riders
    for(const [cx,col,ph] of [[-26,'#ff3b3b',0],[30,'#3a86ff',1.5]]){
      const f=Math.sin(t*12+ph)*10;
      g.fillStyle=col;g.beginPath();g.moveTo(cx-14,-112);g.quadraticCurveTo(cx-40+f,-96,cx-34+f,-74);g.lineTo(cx+14,-104);g.fill();
    }
    emo(g,'🐱',-26,-122+Math.sin(t*8)*3,58);emo(g,'😸',30,-116+Math.sin(t*8+1)*3,50);
    // spoiler
    g.fillStyle='#2b2d42';rr(g,-76,-96,152,12,6);g.fill();g.fillRect(-50,-86,8,10);g.fillRect(42,-86,8,10);
    g.restore();
  }
  function drawMeter(g,w,h){
    const x0=w*.2,x1=w*.8,y=h*.035+4,f=1-S.gap/100;
    g.fillStyle='rgba(255,255,255,.7)';rr(g,x0-14,y-14,x1-x0+28,28,14);g.fill();
    g.fillStyle='#ffd1e8';rr(g,x0,y-5,(x1-x0),10,5);g.fill();
    g.fillStyle='#ff4f9a';rr(g,x0,y-5,(x1-x0)*clamp(f,0,1),10,5);g.fill();
    emo(g,'🚐',x1+2,y-2,30);emo(g,'🏎️',x0+(x1-x0)*clamp(f,0,1),y-2,30);
  }
  function drawParty(g,w,h){
    const t=K.t;
    emo(g,'🎂',w/2,h*.62,Math.min(170,w*.16),Math.sin(t*2)*.05);
    [['🐱',-1.6],['😸',1.6],['🦝',2.9],['🎉',-2.9]].forEach(([e,o],i)=>emo(g,e,w/2+o*Math.min(110,w*.09),h*.66-Math.abs(Math.sin(t*5+i))*40,Math.min(90,w*.08),Math.sin(t*5+i)*.2));
  }

  // ---------- gameplay ----------
  function slip(){S.spin=1.1;S.slips++;K.sfx.oops();K.shake=.5;K.parts.puff(laneX(S.kx,1),YK()-10,8,'#fff3b0',24)}
  function resolveGate(gt){
    gt.done=true;const lane=Math.round(S.kx),i=lane+1;gt.picked=i;gt.ok=i===gt.ans;
    const x=laneX(lane,1),y=YK();
    if(gt.ok){
      S.boost=1.3;S.flash=.35;K.shake=.35;K.sfx.zap(8);K.sfx.whoosh();
      K.parts.sparkle(x,y-60,16,140);K.parts.confetti(x,y-80,26);S.solved=true;
    }else{S.spin=1.2;K.sfx.oops();K.shake=.6;K.parts.puff(x,y-10,10,'#8b5a2b',30)}
  }
  async function gateRound({prob,demo=false,guided=false}){
    const vals=choicesFor(prob.ans,prob.step),ans=vals.indexOf(prob.ans);
    S.prob=prob;S.probPop=0;S.solved=false;
    const gt={dz:30,vals,ans,hold:true,guided,done:false};S.gates.push(gt);
    S.cruise=9/(K.speed*(prob.think||1));
    await K.say(demo?'narrator':pick(['narrator','narrator','kitty2']),prob.say);
    if(demo){
      await K.say('narrator','Watch me!');
      const tx=()=>laneX(LANES[ans],pOf(gt.dz)),ty=()=>yOf(pOf(gt.dz))-pOf(gt.dz)*RW()*.9;
      K.hand.on=true;K.hand.x=K.w/2;K.hand.y=K.h*.7;
      for(let i=0;i<25;i++){K.hand.x=lerp(K.hand.x,tx(),.2);K.hand.y=lerp(K.hand.y,ty(),.2);await K.wait(.03)}
      K.hand.tap=1;K.sfx.select();await K.wait(.4);
      S.lane=LANES[ans];gt.hold=false;
      K.hand.on=false;
    }else{
      gt.hold=false;S.lock=false;
      if(guided){
        K.wait(3.2).then(()=>{if(!gt.done&&S.lane!==LANES[ans]){K.hand.on=true;K.hand.x=laneX(LANES[ans],.8);K.hand.y=yOf(.8)-RW()*.5;K.sfx.select()}});
      }
    }
    await K.until(()=>gt.done);
    K.hand.on=false;
    S.cruise=20;
    if(gt.ok){
      if(!demo&&!guided){S.correct++;S.gap=Math.max(0,S.gap-13)}
      await K.say(pick(['kitty','kitty2']),`${pick(CHEERS)} ${answerSay(prob)}`);
    }else{
      if(!demo&&!guided){S.wrong++;S.gap=Math.min(100,S.gap+5)}
      K.say('raccoon',pick(['Ha ha!','Too slow, kitties!','Hee hee hee!']));await K.wait(.9);
      await K.sayNow('narrator',`Oops, mud! ${answerSay(prob)}`);
    }
    S.prob=null;
    return gt.ok;
  }
  async function bananaRound(){
    await K.say('raccoon','Banana peel! Hee hee!');
    const lane=Math.round(S.kx);
    S.banana={from:3+S.gap*.42,to:30,dz:3+S.gap*.42,t:0,lane,lx:S.van.lx,h:0,done:false,hit:false};K.sfx.whoosh();
    await K.say('kitty','Look out! Steer away from the banana!');
    await K.until(()=>S.banana&&S.banana.done);
    if(S.banana.hit)await K.say('kitty2','Whoooa! Slippery!');
    else{S.gap=Math.max(0,S.gap-4);await K.say('kitty','Ha! Missed us!')}
  }
  async function rampRound(){
    await K.say('kitty','Big ramp! Hold on to your whiskers!');
    S.ramp={dz:40,done:false};
    await K.until(()=>S.ramp&&S.ramp.done);
    await K.say('kitty2','Wheeeeeee!');
    await K.until(()=>S.jump===0);
  }
  async function newBiome(i){
    S.biome=i;S.flash=1;K.sfx.chime();K.showBanner(BIOMES[i].name,'#ff4f9a');
    S.props=S.props.filter(p=>p.dz<20);
    await K.say('narrator',`Welcome to ${BIOMES[i].name}!`);
  }
  async function script(){
    spawnProps();
    S.van.lx=0;S.gap=4;S.cruise=0;
    await K.wait(.6);
    await K.say('narrator',"It's Sparkle's birthday! Look at that yummy cake!");
    await K.say('raccoon','Mwa ha ha! That cake is MINE!');
    S.van.flee=true;K.sfx.whoosh();
    await K.wait(.5);
    await K.say('kitty2','My cake!');
    await K.say('kitty',"Don't worry! Super Kitties, let's ride!");
    S.van.flee=false;S.gap=100;S.cruise=20;K.sfx.boing();K.music.play(song);
    await K.wait(1);
    // tutorial: watch, then try with the wrong lanes greyed out
    await K.say('narrator','To catch him, drive into the right answer!');
    await gateRound({prob:K.demo(),demo:true});
    await K.say('narrator','Now you try! Use the arrow keys, or tap the side of the road.');
    let ok=false;while(!ok)ok=await gateRound({prob:K.problem(),guided:true});
    await K.say('narrator','You did it! Now catch that raccoon!');
    for(const n of ['3','2','1','GO!']){K.showBanner(n,n==='GO!'?'#22c55e':'#3a86ff');K.sfx[n==='GO!'?'cheer':'select']();await K.wait(.75)}
    // the chase
    let last=null,hinted=false;
    while(S.gap>0){
      S.events++;
      if(S.correct>=3&&S.biome===0)await newBiome(1);
      else if(S.correct>=6&&S.biome===1)await newBiome(2);
      if(S.events%4===0)await bananaRound();
      else if(S.correct===4&&!S.rampDone){S.rampDone=true;await rampRound()}
      else{const p=K.problem(last);last=p;await gateRound({prob:p})}
      if(S.gap<35&&!hinted){hinted=true;await K.say('kitty',"He's right there! Keep going!")}
    }
    // caught!
    S.cruise=8;
    await K.say('kitty','We caught you, Mr. Grumbles!');
    S.party=true;
    await K.say('raccoon','Aww, nuts! I just wanted some cake. Nobody ever invites me to parties.');
    await K.say('kitty2','You can come to MY party! Let\'s share!');
    K.music.fanfare();K.parts.confetti(K.w/2,K.h*.5,90);K.showBanner('PARTY TIME!','#ff4f9a');
    await K.say('narrator','Hooray! The best birthday ever!');
    await K.wait(1.2);
    const miss=S.wrong+S.slips*.5;
    K.finish(miss===0?3:miss<=2?2:1);
  }
  function key(k){
    if(S.lock)return k.startsWith('Arrow');
    if(k==='ArrowLeft'||k==='a'||k==='A'){if(S.lane>-1){S.lane--;K.sfx.select()}return true}
    if(k==='ArrowRight'||k==='d'||k==='D'){if(S.lane<1){S.lane++;K.sfx.select()}return true}
    if(k==='ArrowUp'||k==='ArrowDown'){S.lane=0;K.sfx.select();return true}
    return false;
  }
  function tap(x){if(S.lock)return;const l=x<K.w/3?-1:x>K.w*2/3?1:0;if(l!==S.lane){S.lane=l;K.sfx.select()}}
  return{song,S,start(){script()},update,draw,key,tap};
}
