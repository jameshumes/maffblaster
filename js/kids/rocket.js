// Rocket Escape: fly the rainbow paint to the unicorns on the Moon while Stormy chases you
// up from below. Fly through the bubble with the right answer to blast ahead.
import {rand,ri,pick,clamp} from '../util.js';
import {emo,rr,txt,drawProblem,lerp,ease,mixColor} from './draw.js';
import {choicesFor,answerSay} from './problems.js';

const SKY=[[0,'#5cc8ff','#d4f3ff'],[.35,'#ff8fa3','#ffd6a0'],[.62,'#4c2a85','#b06ad0'],[.85,'#080a24','#1d2160'],[1,'#05061a','#11143f']];
const CHEERS=['Blast off!','Woo-hoo!','To the stars!','Rocket power!','Zoom zoom!','Higher, higher!'];
const LANES=[-1,0,1],GOAL=8;
export default {id:'rocket',title:'Rocket Escape',sub:'Outfly the storm!',art:'🚀',color:'#3a86ff',create};

function create(K){
  const S={lane:0,kx:0,alt:0,altTo:0,scroll:0,thrust:.4,storm:0,stormTo:0,rows:[],zap:null,spin:0,spinA:0,
    prob:null,probPop:0,solved:false,lock:true,correct:0,wrong:0,slips:0,events:0,launched:false,landed:0,moon:0,
    decor:[],stars:Array.from({length:90},()=>({x:Math.random(),y:Math.random(),s:rand(1,2.6),p:rand(0,6)})),stormMood:0,shrink:0};
  const song='rocket';
  const LW=()=>Math.min(K.w*.27,320),RY=()=>K.h*.7,laneX=lx=>K.w/2+lx*LW();
  const f=()=>clamp(S.alt,0,1);
  function skyAt(v){
    for(let i=1;i<SKY.length;i++)if(v<=SKY[i][0]){const a=SKY[i-1],b=SKY[i],t=(v-a[0])/(b[0]-a[0]);return[mixColor(a[1],b[1],t),mixColor(a[2],b[2],t)]}
    return[SKY.at(-1)[1],SKY.at(-1)[2]];
  }
  function update(dt){
    S.kx+=(S.lane-S.kx)*Math.min(1,dt*8);
    S.alt+=(S.altTo-S.alt)*Math.min(1,dt*1.2);
    const climb=S.launched?(60+S.thrust*260):0;S.scroll+=climb*dt;
    S.thrust=Math.max(.4,S.thrust-dt*.5);
    if(S.spin>0){S.spin-=dt;S.spinA+=dt*12}else S.spinA=0;
    S.storm+=(S.stormTo-S.storm)*Math.min(1,dt*2);
    // things drifting past
    if(S.launched&&Math.random()<dt*1.4){
      const v=f(),pool=v<.3?['🐦','🎈','🦅','☁️']:v<.6?['✈️','🎈','🛩️','🦋']:['🛰️','🪐','☄️','🌟','👽','🌍'];
      S.decor.push({e:pick(pool),x:rand(.05,.95),y:-.1,s:rand(.7,1.3),r:rand(-.3,.3)});
    }
    for(const d of S.decor)d.y+=climb*dt/K.h*(d.e==='☁️'?1.2:.6);
    S.decor=S.decor.filter(d=>d.y<1.2);
    for(const r of S.rows){
      if(!r.hold&&!r.done){r.t+=dt;r.y=lerp(r.y0,RY(),Math.min(1,r.t/r.T));if(r.t>=r.T)resolveRow(r)}
      if(r.done)r.fade+=dt*2;
    }
    S.rows=S.rows.filter(r=>r.fade<1);
    const z=S.zap;
    if(z){z.t+=dt;if(!z.done&&z.t>=z.warn){z.done=true;K.shake=.6;K.sfx.crash?.();z.hit=Math.round(S.kx)===z.lane;if(z.hit){S.spin=1;S.slips++;S.stormTo=Math.min(95,S.stormTo+10)}}
      if(z.t>z.warn+.6)S.zap=null}
    if(S.prob)S.probPop+=dt*3;
    // exhaust sparkles
    if(S.launched&&Math.random()<dt*30){const x=laneX(S.kx);K.parts.add({kind:'puff',x:x+rand(-8,8),y:RY()+70,vx:rand(-20,20),vy:rand(80,160),drag:1,life:.6,size:rand(6,12)*(1+S.thrust),color:pick(['#ffd166','#ff9f1c','#ffffff'])})}
    if(S.landed&&Math.random()<dt*5)K.parts.add({kind:'emoji',ch:pick(['🎉','💖','⭐','🌈']),x:rand(0,K.w),y:K.h+30,vy:-rand(120,220),life:4,size:rand(28,46)});
  }
  function draw(g,w,h){
    const v=f(),[top,bot]=skyAt(v);
    const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,w,h);
    // stars fade in with altitude
    if(v>.45){g.fillStyle='#fff';for(const s of S.stars){const y=((s.y*h+S.scroll*.08)%h);g.globalAlpha=clamp((v-.45)*3,0,1)*(.5+.5*Math.sin(K.t*3+s.p));g.beginPath();g.arc(s.x*w,y,s.s,0,7);g.fill()}g.globalAlpha=1}
    // clouds below 60%
    if(v<.7){g.globalAlpha=clamp((.7-v)*3,0,1);for(let i=0;i<5;i++){const y=((i*h*.27+S.scroll*.5)%(h*1.35))-h*.15;cloud(g,((i*.37)%1)*w,y,1.2)}g.globalAlpha=1}
    // launch pad + ground until we leave it behind
    const gy=h*.86+S.scroll*.9;
    if(gy<h+40){g.fillStyle='#5fca64';g.fillRect(0,gy,w,h);g.fillStyle='#9aa3b5';g.fillRect(w/2-90,gy-10,180,14);emo(g,'🏠',w*.15,gy-30,60);emo(g,'🌳',w*.85,gy-36,70);emo(g,'🌳',w*.08,gy-30,50)}
    for(const d of S.decor)emo(g,d.e,d.x*w,d.y*h,46*d.s,d.r);
    // the Moon arrives at the end
    if(S.moon>0){const mr=Math.min(w,h)*.25,my=lerp(-h*.4,h*.2+mr,ease(S.moon));
      rainbow(g,w/2,my+mr*.2,mr*1.5,S.moon);
      g.fillStyle='#f1f0e6';g.beginPath();g.arc(w/2,my,mr,0,7);g.fill();
      g.fillStyle='#d9d6c3';for(const [dx,dy,r] of [[-.4,-.2,.16],[.3,.25,.12],[.1,-.45,.09],[-.15,.4,.1]]){g.beginPath();g.arc(w/2+dx*mr,my+dy*mr,r*mr,0,7);g.fill()}
      emo(g,'🏰',w/2+mr*.1,my-mr*.95,mr*.5);emo(g,'🦄',w/2-mr*.45,my-mr*.86,mr*.4,0,1,Math.sin(K.t*2)>0)}
    // lightning warning stripe
    const z=S.zap;
    if(z){const x=laneX(z.lane),lw=LW()*.9;
      if(!z.done){g.fillStyle=`rgba(255,59,59,${.18+.18*Math.sin(K.t*18)})`;g.fillRect(x-lw/2,0,lw,h);emo(g,'⚠️',x,h*.45,60)}
      else{g.strokeStyle='#fff36b';g.lineWidth=10;g.shadowColor='#fff36b';g.shadowBlur=30;g.beginPath();let y=h;g.moveTo(x,y);while(y>0){y-=rand(30,60);g.lineTo(x+rand(-30,30),y)}g.stroke();g.shadowBlur=0}}
    for(const r of S.rows)drawRow(g,r);
    drawRocket(g,laneX(S.kx),RY(),Math.min(1.1,h/800));
    drawStorm(g,w,h);
    K.parts.draw(g);
    if(S.prob)drawProblem(g,S.prob,w/2,h*.04,w,{solved:S.solved,pop:S.probPop,t:K.t});
    drawMeter(g,w,h);
  }
  function cloud(g,x,y,s){g.fillStyle='rgba(255,255,255,.85)';for(const [dx,dy,r] of [[0,0,30],[30,-12,26],[58,0,28],[28,10,26]]){g.beginPath();g.arc(x+dx*s,y+dy*s,r*s,0,7);g.fill()}}
  function rainbow(g,x,y,r,k){
    const cs=['#ff3b3b','#ff8c1a','#ffd000','#22c55e','#00a6c7','#3a86ff','#9b5de5'];
    g.lineWidth=r*.06;cs.forEach((c,i)=>{g.strokeStyle=c;g.beginPath();g.arc(x,y,r-i*r*.06,Math.PI,Math.PI+Math.PI*clamp(k,0,1));g.stroke()});
  }
  function drawRow(g,r){
    const R=Math.min(LW()*.34,64);
    LANES.forEach((lx,i)=>{
      const x=laneX(lx),isAns=i===r.ans,dim=r.guided&&!isAns;
      let a=dim?.3:1;if(r.done)a*=1-r.fade;g.globalAlpha=a;
      const pulse=1+Math.sin(K.t*5+i)*.04,rad=R*pulse*(r.done&&isAns?1+r.fade:1);
      const gr=g.createRadialGradient(x-rad*.3,r.y-rad*.3,rad*.1,x,r.y,rad);
      gr.addColorStop(0,'#ffffff');gr.addColorStop(1,r.done?(isAns?'#86efac':'#d1d5db'):'#b8e6ff');
      g.fillStyle=gr;g.beginPath();g.arc(x,r.y,rad,0,7);g.fill();
      g.strokeStyle=r.done&&isAns?'#22c55e':'#3a86ff';g.lineWidth=5;g.stroke();
      txt(g,String(r.vals[i]),x,r.y+2,rad*.95,'#1e2a4a');
    });
    g.globalAlpha=1;
  }
  function drawRocket(g,x,y,s){
    const t=K.t;g.save();g.translate(x,y);g.scale(s,s);g.rotate((S.lane-S.kx)*.25+S.spinA);
    // flame
    if(S.launched){const fl=50+S.thrust*70+Math.sin(t*40)*8;
      const gr=g.createLinearGradient(0,40,0,40+fl);gr.addColorStop(0,'#fff6b0');gr.addColorStop(.4,'#ffb703');gr.addColorStop(1,'rgba(255,80,0,0)');
      g.fillStyle=gr;g.beginPath();g.moveTo(-20,40);g.quadraticCurveTo(0,40+fl*1.2,20,40);g.fill()}
    g.fillStyle='#ff4f6d';g.beginPath();g.moveTo(-30,20);g.lineTo(-56,58);g.lineTo(-24,46);g.fill();g.beginPath();g.moveTo(30,20);g.lineTo(56,58);g.lineTo(24,46);g.fill();
    g.fillStyle='#f8fafc';g.beginPath();g.moveTo(0,-92);g.bezierCurveTo(44,-60,38,20,26,48);g.lineTo(-26,48);g.bezierCurveTo(-38,20,-44,-60,0,-92);g.fill();
    g.fillStyle='#ff4f6d';g.beginPath();g.moveTo(0,-92);g.bezierCurveTo(22,-76,30,-60,32,-52);g.lineTo(-32,-52);g.bezierCurveTo(-30,-60,-22,-76,0,-92);g.fill();
    g.fillStyle='#3a86ff';g.beginPath();g.arc(0,-14,24,0,7);g.fill();g.fillStyle='#bfe9ff';g.beginPath();g.arc(0,-14,19,0,7);g.fill();
    emo(g,'🐱',0,-14,30);
    g.fillStyle='#9b5de5';rr(g,-8,24,16,20,4);g.fill();
    emo(g,'🎨',30,-50,22,.3);
    g.restore();
  }
  function drawStorm(g,w,h){
    const k=clamp(S.storm/100,0,1),top=lerp(h*1.08,RY()+h*.04,k)+S.shrink*h*.3,t=K.t;
    if(top>h+40)return;
    const grey=S.shrink>0?'#9aa5b8':'#4b5468';
    g.fillStyle=grey;
    for(let i=0;i<9;i++){const x=w*(i/8),r=w*.1+Math.sin(t*2+i)*6;g.beginPath();g.arc(x,top+r*.5+Math.sin(t*3+i*2)*5,r,0,7);g.fill()}
    g.fillRect(0,top+w*.06,w,h);
    // a grumpy face that watches the rocket
    const fx=w/2,fy=top+Math.min(90,w*.07),look=(laneX(S.kx)-fx)/w*30;
    for(const s of [-1,1]){g.fillStyle='#fff';g.beginPath();g.ellipse(fx+s*44,fy,20,24,0,0,7);g.fill();g.fillStyle='#1f2433';g.beginPath();g.arc(fx+s*44+look,fy-6,9,0,7);g.fill()
      g.strokeStyle='#1f2433';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(fx+s*22,fy-34+(S.shrink?-6:0));g.lineTo(fx+s*64,fy-(S.shrink?30:22));g.stroke()}
    g.strokeStyle='#1f2433';g.lineWidth=6;g.beginPath();if(S.shrink)g.arc(fx,fy+30,16,Math.PI*1.1,Math.PI*1.9,false);else g.arc(fx,fy+52,22,Math.PI*1.15,Math.PI*1.85);g.stroke();
    if(!S.shrink&&k>.35&&Math.sin(t*7)>.92){g.strokeStyle='#fff36b';g.lineWidth=5;g.beginPath();let x=rand(0,w),y=top;g.moveTo(x,y);for(let i=0;i<4;i++){x+=rand(-30,30);y-=rand(20,40);g.lineTo(x,y)}g.stroke()}
  }
  function drawMeter(g,w,h){
    const x=w-34,y0=h*.82,y1=h*.14;
    g.fillStyle='rgba(255,255,255,.5)';rr(g,x-10,y1,20,y0-y1,10);g.fill();
    g.fillStyle='#ffd166';rr(g,x-10,lerp(y0,y1,f()),20,(y0-y1)*f(),10);g.fill();
    emo(g,'🌍',x,y0+22,30);emo(g,'🌙',x,y1-22,30);emo(g,'🚀',x,lerp(y0,y1,f()),30);
  }

  // ---------- gameplay ----------
  function resolveRow(r){
    r.done=true;const i=Math.round(S.kx)+1;r.ok=i===r.ans;const x=laneX(i-1);
    if(r.ok){S.thrust=2;K.shake=.3;K.sfx.zap(8);K.sfx.whoosh();K.parts.sparkle(x,RY()-40,18,130);K.parts.confetti(x,RY()-30,24);S.solved=true}
    else{S.spin=.8;K.sfx.oops();K.shake=.5;K.parts.puff(x,RY()-20,10,'#9ca3af',26)}
  }
  async function bubbleRound({prob,demo=false,guided=false}){
    const vals=choicesFor(prob.ans,prob.step),ans=vals.indexOf(prob.ans),y0=K.h*.4;
    S.prob=prob;S.probPop=0;S.solved=false;
    const r={vals,ans,hold:true,guided,done:false,y:y0,y0,t:0,T:4.4*K.speed*(prob.think||1),fade:0};S.rows.push(r);
    await K.say(demo?'narrator':pick(['narrator','narrator','kitty']),prob.say);
    if(demo){
      await K.say('narrator','Watch me!');
      K.hand.on=true;K.hand.x=K.w/2;K.hand.y=K.h*.8;
      for(let i=0;i<25;i++){K.hand.x=lerp(K.hand.x,laneX(LANES[ans]),.2);K.hand.y=lerp(K.hand.y,r.y,.2);await K.wait(.03)}
      K.hand.tap=1;K.sfx.select();await K.wait(.4);S.lane=LANES[ans];r.hold=false;K.hand.on=false;
    }else{
      r.hold=false;S.lock=false;
      if(guided)K.wait(2.8).then(()=>{if(!r.done&&S.lane!==LANES[ans]){K.hand.on=true;K.hand.x=laneX(LANES[ans]);K.hand.y=RY()-60;K.sfx.select()}});
    }
    await K.until(()=>r.done);K.hand.on=false;
    if(r.ok){
      if(!demo&&!guided){S.correct++;S.altTo=S.correct/GOAL;S.stormTo=Math.max(0,S.stormTo-22)}
      await K.say(pick(['kitty','kitty2']),`${pick(CHEERS)} ${answerSay(prob)}`);
    }else{
      if(!demo&&!guided){S.wrong++;S.stormTo=Math.min(100,S.stormTo+14)}
      K.say('storm',pick(['Rumble rumble!','Ha! Gotcha!','Here I come!']));await K.wait(.9);
      await K.sayNow('narrator',`Oops! ${answerSay(prob)}`);
    }
    S.prob=null;
    if(S.stormTo>=100){
      S.spin=1.2;S.slips++;K.shake=.8;K.sfx.crash();
      await K.say('kitty','Yikes! Stormy got us wet! Faster, faster!');S.stormTo=60;
    }
    return r.ok;
  }
  async function zapRound(){
    await K.say('storm','Zappity zap zap!');
    S.zap={lane:Math.round(S.kx),t:0,warn:2.4*K.speed,done:false};
    await K.say('kitty','Lightning! Move away from the red stripe!');
    await K.until(()=>!S.zap||S.zap.done);
    const hit=S.zap&&S.zap.hit;
    await K.wait(.6);
    if(hit)await K.say('kitty2','Bzzzt! That tickled!');else{S.stormTo=Math.max(0,S.stormTo-8);await K.say('kitty','Missed us, Stormy!')}
  }
  async function script(){
    await K.wait(.5);
    await K.say('narrator','The unicorns on the Moon need rainbow paint for their Moon Rainbow!');
    await K.say('kitty',"We've got the paint! Let's fly it up there!");
    S.stormTo=28;K.sfx.crash();K.shake=.4;
    await K.say('storm','Rumble rumble! Not if I soak you first!');
    await K.say('kitty2','Eek! Blast off!');
    for(const n of ['3','2','1']){K.showBanner(n,'#3a86ff');K.sfx.select();await K.wait(.7)}
    K.showBanner('LIFT OFF!','#ff4f9a');S.launched=true;S.thrust=2;K.shake=.8;K.sfx.whoosh();K.parts.puff(K.w/2,RY()+60,24,'#ffffff',40);K.music.play(song);
    await K.wait(1.5);
    S.stormTo=22;
    await K.say('narrator','Fly into the bubble with the right answer to zoom away from Stormy!');
    await bubbleRound({prob:K.demo(),demo:true});
    await K.say('narrator','Your turn! Use the arrow keys, or tap left, middle, or right.');
    let ok=false;while(!ok)ok=await bubbleRound({prob:K.problem(),guided:true});
    await K.say('kitty','Great flying! Hang on, everybody!');
    let last=null,creep=true;
    // Stormy creeps up while you think
    (async()=>{while(creep&&S.correct<GOAL){await K.wait(.5);if(!S.zap&&S.launched)S.stormTo=Math.min(99,S.stormTo+.9)}})();
    while(S.correct<GOAL){
      S.events++;
      if(S.events%4===0)await zapRound();
      else{const p=K.problem(last);last=p;await bubbleRound({prob:p})}
      if(S.correct===GOAL-2&&!S.hint){S.hint=true;await K.say('kitty2','I can see the Moon!')}
    }
    creep=false;
    // landing
    S.stormTo=0;
    for(let i=0;i<60;i++){S.moon=Math.min(1,S.moon+1/60);await K.wait(.03)}
    S.landed=1;K.music.fanfare();K.parts.confetti(K.w/2,K.h*.4,90);K.showBanner('THE MOON!','#9b5de5');
    await K.say('unicorn','You made it! Thank you, Super Kitties!');
    S.stormTo=40;S.shrink=1;
    await K.say('storm',"Phooey. I'm all rained out. Can I watch the rainbow too?");
    await K.say('kitty','Of course you can, Stormy!');
    await K.say('narrator','And that is how the Moon got its rainbow!');
    await K.wait(1);
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
