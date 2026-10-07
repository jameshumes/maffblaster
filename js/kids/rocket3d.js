// Rocket Escape (3D): fly the rainbow paint up to Twinkle's castle on the Moon while
// Stormy chases from below. Steer through the bubble with the right answer to blast ahead.
import {THREE,BEND,bend,createStage,createParticles,mesh,G,toon,blob,standee,textTexture,damp,lerp,easeOut,easeInOut} from './three/kit.js';
import {PROPS} from './three/chars.js';
import {makeRocket,makeStorm,makeUnicorn} from './three/cast2.js';
import {drawProblem,emo,rr,txt,lerp as l2} from './draw.js';
import {choicesFor,answerSay,allProblemLines} from './problems.js';

const flat=o=>bend(new THREE.MeshBasicMaterial(o));
const LANES=[-4.2,0,4.2],RY=-2.8,GOAL=8;
const CHEERS=['Blast off!','Woo-hoo!','To the stars!','Rocket power!','Zoom zoom!','Higher, higher!','Bye bye, Stormy!'];
const STORM_JEERS=['Rumble rumble!','Gotcha!','Here I come!','Drip drop!'];
const L={
  intro1:['narrator','Up on the Moon, Twinkle the unicorn is painting a rainbow.'],
  intro2:['unicorn','Oh no, I ran out of rainbow paint! Can anybody help?'],
  intro3:['kitty','We have rainbow paint, Twinkle! The Super Kitty Rocket is on its way!'],
  storm1:['storm','Rumble rumble! Rainbows are too sunny. I will soak your rocket!'],
  scared:['kitty2','Eek! A grumpy storm cloud! Blast off, quick!'],
  liftoff:['kitty','Three, two, one, lift off!'],
  tut1:['narrator','Fly through the bubble with the right answer to zoom away from Stormy!'],
  watch:['narrator','Watch me!'],
  saw:['kitty2','Zoom! We got away!'],
  yourTurn:['narrator','Your turn! Use the arrow keys, or tap left, middle, or right.'],
  tutDone:['kitty','Great flying! Hang on, everybody!'],
  oops:['narrator','Oops!'],
  wet:['kitty','Yikes! Stormy got us wet! Faster, faster!'],
  zap1:['storm','Zappity zap zap!'],zap2:['kitty','Lightning! Move away from the red stripe!'],
  zapHit:['kitty2','Bzzzt! That tickled!'],zapMiss:['kitty','Missed us, Stormy!'],
  space:['kitty2','Look! We are in outer space!'],
  moonSoon:['kitty','I can see the Moon!'],
  land:['unicorn','You made it! Thank you, Super Kitties!'],
  paint:['kitty2','Here is your rainbow paint, Twinkle!'],
  stormSad:['storm','Phooey. I am all rained out. Can I watch the rainbow too?'],
  share:['kitty','Of course you can, Stormy! Rainbows need a little rain, too.'],
  end:['narrator','And that is how the Moon got its very own rainbow!'],
};
export function lines(){
  return[...Object.values(L),...STORM_JEERS.map(t=>['storm',t]),...['kitty','kitty2'].flatMap(w=>CHEERS.map(t=>[w,t])),...allProblemLines()];
}
export default {id:'rocket',title:'Rocket Escape',sub:'Outfly the storm!',art:'🚀',color:'#3a86ff',create,lines};

const SKY=[[0,['#2f9cff','#9ad8ff','#e8f7ff']],[.35,['#ff7aa2','#ffb48a','#ffe0b0']],[.62,['#3b1f78','#8a4fc8','#d58fd0']],[.85,['#05061f','#151a4d','#2a2f72']],[1,['#03041a','#0b0f3a','#1a1f5a']]];
const mixC=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
function skyAt(v){for(let i=1;i<SKY.length;i++)if(v<=SKY[i][0]){const [a0,A]=SKY[i-1],[b0,B]=SKY[i],t=(v-a0)/(b0-a0);return A.map((c,k)=>mixC(c,B[k],t))}return SKY.at(-1)[1].map(c=>new THREE.Color(c))}

function create(K){
  BEND.value.set(0,0);
  const st=createStage(K.host3d),{scene,camera}=st;
  scene.fog=null;
  const fx=createParticles(scene);
  const S={lane:0,kx:0,alt:0,altTo:0,climb:0,thrust:.3,storm:0,stormTo:0,rows:[],zap:null,spin:0,launched:false,
    prob:null,probPop:0,solved:false,lock:true,correct:0,wrong:0,slips:0,events:0,moon:0,landed:false,
    cam:{pos:new THREE.Vector3(0,1.5,14),look:new THREE.Vector3(0,.5,0),fov:50},shrink:0,stormMood:'grumpy'};
  const song='rocket';

  // ---------- world ----------
  const ground=new THREE.Group();scene.add(ground);
  const grass=mesh(G.cyl(40,40,2,40),'#69d26a',{ink:0});grass.position.y=RY-3.5;ground.add(grass);
  const pad=mesh(G.cyl(2.2,2.5,.5,24),'#9aa3b5',{ink:.02});pad.position.y=RY-2.3;ground.add(pad);
  const tower=new THREE.Group();tower.position.set(-3,RY-2,-.5);ground.add(tower);
  for(let i=0;i<6;i++){const b=mesh(G.box(.5,.9,.5),i%2?'#ff4f6d':'#ffffff',{ink:.015});b.position.y=.45+i*.9;tower.add(b)}
  for(const [x,z,n] of [[-9,-6,'tree'],[8,-7,'tree'],[-12,-10,'pine'],[11,-9,'pine'],[6,-4,'flower'],[-6,-3,'flower'],[13,-14,'tree'],[-14,-14,'tree']]){const o=PROPS[n]();o.position.set(x,RY-2.5,z);ground.add(o)}
  const house=standee('🏠',3);house.position.set(9,RY-1,-12);ground.add(house);
  // clouds, birds, planes, then stars and planets, drift past as we climb
  const decor=[];
  function cloud(){const g=new THREE.Group();for(const [x,y,r] of [[0,0,1.2],[1.2,.2,.95],[-1.2,.1,1],[.4,.8,.9]]){const s=mesh(G.sphere(r,14,10),'#ffffff',{ink:.02});s.position.set(x,y,0);g.add(s)}return g}
  function spawnDecor(y){
    const v=S.alt,z=-4-Math.random()*22;let o;
    if(v<.55&&Math.random()<.6)o=cloud();
    else if(v<.35)o=standee(['🐦','🎈','🦅','🕊️'][Math.floor(Math.random()*4)],1.6);
    else if(v<.6)o=standee(['✈️','🎈','🛩️','🦋'][Math.floor(Math.random()*4)],1.8);
    else if(Math.random()<.4){o=new THREE.Group();const p=mesh(G.sphere(1+Math.random()*1.5,20,14),['#ff9f43','#3a86ff','#22c55e','#ff5fa2','#a78bfa'][Math.floor(Math.random()*5)],{ink:.03});o.add(p);
      if(Math.random()<.5){const ring=mesh(G.torus(p.geometry.parameters.radius*1.6,.12),'#ffe08a',{ink:0});ring.rotation.x=1.2;o.add(ring)}}
    else o=standee(['🛰️','☄️','🌟','👽','🛸'][Math.floor(Math.random()*5)],1.8);
    o.position.set((Math.random()*2-1)*(14-z*.4),y,z);scene.add(o);decor.push(o);
  }
  for(let y=-2;y<14;y+=2.5)if(Math.random()<.4)spawnDecor(y);
  // starfield
  const starGeo=new THREE.BufferGeometry(),sp=new Float32Array(900*3);for(let i=0;i<900;i++){sp[i*3]=(Math.random()*2-1)*80;sp[i*3+1]=(Math.random()*2-1)*45;sp[i*3+2]=-40-Math.random()*20}
  starGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#ffffff',size:.35,transparent:true,opacity:0}));scene.add(stars);

  // ---------- cast ----------
  const rocket=makeRocket();rocket.root.position.set(0,RY,0);scene.add(rocket.root);
  const storm=makeStorm();storm.root.position.set(0,-16,-2);scene.add(storm.root);
  const moon=new THREE.Group();moon.position.set(0,40,-6);scene.add(moon);
  const moonBall=mesh(G.sphere(9,40,28),'#f1f0e6',{ink:.05});moon.add(moonBall);
  for(const [x,y,z,r] of [[-3,4,7.2,1.3],[3.5,5.5,6.6,1],[0,7.5,5,.8],[-5,7,4,.9],[5,2,7.2,.9]]){const c=mesh(G.sphere(r,14,10),'#d9d6c3',{ink:0});c.position.set(x,y,z);c.scale.z=.35;moon.add(c)}
  const castle=new THREE.Group();castle.position.set(1.8,8.6,1.5);moon.add(castle);
  const keep=mesh(G.box(2.4,2,1.6),'#ffd1e8',{ink:.03});keep.position.y=1;castle.add(keep);
  for(const x of [-1.4,1.4]){const t=mesh(G.cyl(.55,.55,3,14),'#ffffff',{ink:.03});t.position.set(x,1.5,0);castle.add(t);const r=mesh(G.cone(.75,1.2,14),'#9b5de5',{ink:.03});r.position.set(x,3.6,0);castle.add(r)}
  const door=mesh(G.box(.7,1,.1),'#9b5de5',{ink:0});door.position.set(0,.5,.82);castle.add(door);
  const uni=makeUnicorn();uni.root.position.set(-2.4,8.5,2.5);uni.root.scale.setScalar(1.4);moon.add(uni.root);
  const rainbow=new THREE.Group();rainbow.position.set(0,6,-2);moon.add(rainbow);
  ['#ff3b3b','#ff8c1a','#ffd000','#22c55e','#00a6c7','#3a86ff','#9b5de5'].forEach((c,i)=>{const a=mesh(G.torus(13-i*.6,.3,Math.PI),c,{ink:0});rainbow.add(a)});
  rainbow.scale.setScalar(.001);

  // ---------- helpers ----------
  const v=new THREE.Vector3();
  function screenOf(p){v.copy(p).project(camera);return[(v.x+1)/2*K.w,(1-v.y)/2*K.h]}
  function cut(pos,look,fov=40){S.cam.pos.set(...pos);S.cam.look.set(...look);S.cam.fov=fov;camera.position.set(...pos);S.lookCur=S.cam.look.clone();camera.fov=fov}
  function shot(pos,look,fov=50){S.cam.pos.set(...pos);S.cam.look.set(...look);S.cam.fov=fov}
  const follow=()=>{S.cam.follow=true};
  function numberTex(n){return textTexture(String(n),{bg:null,border:null,fg:'#1e2a4a',font:'700 160px Fredoka'})}
  function makeRow(vals,ans,guided){
    const g=new THREE.Group(),bubbles=[];
    vals.forEach((n,i)=>{
      const b=new THREE.Group();b.position.set(LANES[i],0,0);g.add(b);
      const sph=new THREE.Mesh(G.sphere(1.25,28,20),toon(guided&&i!==ans?'#d5dae3':'#bfe9ff'));b.add(sph);
      const shine=mesh(G.sphere(.28,10,8),'#ffffff',{ink:0,flat:true});shine.position.set(-.5,.55,.95);shine.scale.set(1,.7,.4);b.add(shine);
      const ring=mesh(G.torus(1.28,.07),guided&&i!==ans?'#aab0bd':'#3a86ff',{ink:0});b.add(ring);
      const face=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),flat({map:numberTex(n),transparent:true,opacity:guided&&i!==ans?.35:1}));face.position.z=1.26;b.add(face);
      bubbles.push({b,sph,i,n});
    });
    return{g,bubbles,ans,vals};
  }

  // ---------- update ----------
  function update(dt){
    const t=K.t;
    S.kx=damp(S.kx,LANES[S.lane+1],8,dt);
    S.alt=damp(S.alt,S.altTo,1.2,dt);
    S.thrust=damp(S.thrust,S.launched?(S.boost>0?2.2:1):.25,3,dt);S.boost=Math.max(0,(S.boost||0)-dt);
    S.climb=S.launched?(4+(S.boost>0?10:0)):0;
    const dy=S.climb*dt;
    if(S.spin>0){S.spin-=dt}
    // scenery falls away below us
    ground.position.y-=dy*(S.launched?1:0);
    decor.forEach(o=>{o.position.y-=dy*(1-o.position.z*-.02);o.rotation.y+=dt*.2});
    for(let i=decor.length-1;i>=0;i--)if(decor[i].position.y<-16){scene.remove(decor[i]);decor.splice(i,1)}
    if(S.launched&&!S.landed&&Math.random()<dt*1.1)spawnDecor(14);
    const [top,mid,bot]=skyAt(S.alt);st.skyU.top.value.copy(top);st.skyU.mid.value.copy(mid);st.skyU.bot.value.copy(bot);
    stars.material.opacity=Math.max(0,Math.min(1,(S.alt-.45)*3));stars.position.y-=dy*.05;if(stars.position.y<-30)stars.position.y+=30;
    st.hemi.intensity=lerp(1.4,.9,S.alt);
    // rocket
    rocket.root.position.x=S.kx;
    rocket.root.rotation.z=S.spin>0?Math.sin(S.spin*20)*.4:0;
    rocket.root.position.y=RY+(S.launched?Math.sin(t*2)*.12:0)+(S.landY||0);
    rocket.update(dt,t,{thrust:S.thrust,steer:(LANES[S.lane+1]-S.kx)*.25,talkA:K.talk('kitty'),talkB:K.talk('kitty2')});
    if(S.launched&&!S.landed){for(let i=0;i<2;i++)fx.add({x:S.kx+(Math.random()-.5)*.6,y:RY-2.6,z:0,vx:(Math.random()-.5)*2,vy:-6-Math.random()*4,drag:1.5,life:.6,size:.6+S.thrust*.4,grow:1,color:Math.random()<.5?'#ffd166':'#ffffff'})}
    // Stormy rises to meet us
    S.storm=damp(S.storm,S.stormTo,2,dt);
    if(S.stormSky){storm.root.position.x=damp(storm.root.position.x,7,2,dt);storm.root.position.y=damp(storm.root.position.y,3.5,2,dt);storm.root.position.z=damp(storm.root.position.z,-14,2,dt)}
    else{storm.root.position.y=damp(storm.root.position.y,lerp(-7.8,-4,S.storm/100)-S.shrink*1.2,3,dt);storm.root.position.x=damp(storm.root.position.x,S.kx*.4,1,dt);storm.root.position.z=damp(storm.root.position.z,-2,2,dt)}
    storm.root.scale.setScalar(lerp(1,.35,S.shrink));
    storm.update(dt,t,{talk:K.talk('storm'),mood:S.stormMood,look:(S.kx-storm.root.position.x)/4});
    if(S.storm>40&&S.stormMood==='grumpy'&&Math.random()<dt*14)fx.add({x:storm.root.position.x+(Math.random()*2-1)*5,y:storm.root.position.y-2.5,z:1,vy:-8,life:.5,size:.18,color:'#9ad8ff',drag:0});
    // bubble rows
    for(const r of S.rows){
      r.bubbles.forEach(bb=>{bb.b.position.y=Math.sin(t*2.4+bb.i)*.15;bb.b.rotation.y=Math.sin(t*1.3+bb.i)*.2});
      if(r.held){r.g.position.y=damp(r.g.position.y,2.4,3,dt)}
      else if(!r.done){r.g.position.y-=r.v*dt;if(r.g.position.y<=RY+.6)resolveRow(r)}
      else{r.g.position.y-=dy+dt*4;r.fade=(r.fade||0)+dt}
    }
    S.rows=S.rows.filter(r=>{if(r.fade>1.5){scene.remove(r.g);return false}return true});
    // lightning
    const z=S.zap;
    if(z){z.t+=dt;z.warn.material.opacity=.3+.2*Math.sin(t*18);z.sign.visible=!z.done&&Math.sin(t*12)>-.3;
      if(!z.done&&z.t>=z.dur){z.done=true;z.warn.visible=false;z.bolt.visible=true;K.shake=.6;K.sfx.crash();z.hit=S.lane===z.lane;
        if(z.hit){S.spin=1;S.slips++;S.stormTo=Math.min(95,S.stormTo+10);fx.sparkle(S.kx,RY,1,30,6,['#fff36b','#ffffff'])}}
      if(z.done)z.bolt.material.opacity=Math.max(0,1-(z.t-z.dur)*2);
      if(z.t>z.dur+.7){scene.remove(z.grp);S.zap=null}}
    // the Moon arrives
    moon.position.y=lerp(40,RY-8.2,easeInOut(S.moon));
    uni.update(dt,t,{talk:K.talk('unicorn')});
    if(S.landed&&Math.random()<dt*1.5)firework();
    fx.update(dt,0);
    if(S.prob)S.probPop+=dt*3;
    // camera
    const c=S.cam;
    if(c.follow){c.pos.set(S.kx*.35,1,14.5);c.look.set(S.kx*.25,.6,0);c.fov=50+(S.boost>0?8:0)}
    camera.position.x=damp(camera.position.x,c.pos.x,3,dt);camera.position.y=damp(camera.position.y,c.pos.y,3,dt);camera.position.z=damp(camera.position.z,c.pos.z,3,dt);
    S.lookCur=S.lookCur||c.look.clone();S.lookCur.lerp(c.look,1-Math.exp(-3*dt));camera.lookAt(S.lookCur);
    if(K.shake){camera.position.x+=(Math.random()-.5)*K.shake*.5;camera.position.y+=(Math.random()-.5)*K.shake*.5}
    camera.fov=damp(camera.fov,c.fov,3,dt);camera.updateProjectionMatrix();
  }
  function firework(){
    const x=(Math.random()-.5)*20,y=4+Math.random()*6,z=-10-Math.random()*6,cols=[['#ff3b3b','#ffd23f'],['#3a86ff','#ffffff'],['#22c55e','#ffd23f'],['#ff4f9a','#9b5de5']][Math.floor(Math.random()*4)];
    for(let i=0;i<60;i++){const a=Math.random()*6.28,b=Math.acos(Math.random()*2-1),s=5+Math.random()*2;
      fx.add({x,y,z,vx:Math.cos(a)*Math.sin(b)*s,vy:Math.cos(b)*s,vz:Math.sin(a)*Math.sin(b)*s,g:3,drag:1.2,life:1.4+Math.random()*.6,size:.55,color:cols[i%2]})}
    K.sfx.balloonPop();
  }
  function draw(g,w,h){
    st.render();
    if(S.prob)drawProblem(g,S.prob,w/2,h*.035,w,{solved:S.solved,pop:S.probPop,t:K.t});
    if(S.launched)hud(g,w,h);
  }
  function hud(g,w,h){
    const x=w-34,y0=h*.82,y1=h*.16,f=Math.min(1,S.alt);
    g.fillStyle='rgba(255,255,255,.55)';rr(g,x-11,y1,22,y0-y1,11);g.fill();
    const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,'#9ad8ff');gr.addColorStop(.5,'#ff9ec7');gr.addColorStop(1,'#9b5de5');
    g.fillStyle=gr;rr(g,x-11,l2(y0,y1,f),22,(y0-y1)*f,11);g.fill();
    emo(g,'🌍',x,y0+24,30);emo(g,'🌙',x,y1-24,30);emo(g,'🚀',x,l2(y0,y1,f),30);
  }

  // ---------- gameplay ----------
  function resolveRow(r){
    r.done=true;const i=S.lane+1;r.ok=i===r.ans;const bb=r.bubbles[i];
    const wp=new THREE.Vector3();bb.b.getWorldPosition(wp);
    if(r.ok){S.boost=1.6;K.shake=.3;K.sfx.zap(8);K.sfx.whoosh();S.solved=true;fx.confetti(wp.x,wp.y,wp.z,60);fx.sparkle(wp.x,wp.y,wp.z,30,6);bb.b.visible=false}
    else{S.spin=.9;K.sfx.oops();K.shake=.5;fx.puff(wp.x,wp.y,wp.z,14,'#9ca3af',.8);bb.b.visible=false;r.bubbles[r.ans].sph.material=toon('#bbf7d0')}
    r.bubbles.forEach(o=>{if(o!==bb&&o.i!==r.ans)o.b.visible=false});
  }
  async function bubbleRound({prob,demo=false,guided=false}){
    const vals=choicesFor(prob.ans,prob.step),ans=vals.indexOf(prob.ans);
    S.prob=prob;S.probPop=0;S.solved=false;
    const r=makeRow(vals,ans,guided);r.held=true;r.g.position.y=10;scene.add(r.g);S.rows.push(r);
    await K.say('narrator',prob.say);
    if(demo){
      await K.say(...L.watch);
      const p=new THREE.Vector3();K.hand.on=true;K.hand.x=K.w/2;K.hand.y=K.h*.85;
      for(let i=0;i<25;i++){r.bubbles[ans].b.getWorldPosition(p);const [sx,sy]=screenOf(p);K.hand.x=l2(K.hand.x,sx,.2);K.hand.y=l2(K.hand.y,sy+30,.2);await K.wait(.03)}
      K.hand.tap=1;K.sfx.select();await K.wait(.4);S.lane=ans-1;K.hand.on=false;
    }else{
      S.lock=false;
      if(guided)K.wait(3.2).then(()=>{if(!r.done&&S.lane!==ans-1){const p=new THREE.Vector3();r.bubbles[ans].b.getWorldPosition(p);const [sx,sy]=screenOf(p);K.hand.on=true;K.hand.x=sx;K.hand.y=sy+30;K.sfx.select()}});
    }
    r.held=false;r.v=(2.4-RY-.6)/(4.2*K.speed*(prob.think||1));
    await K.until(()=>r.done);K.hand.on=false;
    if(r.ok){
      if(!demo&&!guided){S.correct++;S.altTo=S.correct/GOAL*.97;S.stormTo=Math.max(0,S.stormTo-22)}
      await K.say(Math.random()<.5?'kitty':'kitty2',CHEERS[Math.floor(Math.random()*CHEERS.length)]);
      await K.say('narrator',answerSay(prob));
    }else{
      if(!demo&&!guided){S.wrong++;S.stormTo=Math.min(100,S.stormTo+14)}
      K.say('storm',STORM_JEERS[Math.floor(Math.random()*STORM_JEERS.length)]);await K.wait(1);
      await K.sayNow(...L.oops);await K.say('narrator',answerSay(prob));
    }
    S.prob=null;
    if(S.stormTo>=100){S.spin=1.2;S.slips++;K.shake=.8;K.sfx.crash();fx.add({x:S.kx,y:RY,z:1,life:.4,size:6,color:'#9ad8ff'});await K.say(...L.wet);S.stormTo=60}
    return r.ok;
  }
  async function zapRound(){
    await K.say(...L.zap1);
    const grp=new THREE.Group(),lane=S.lane;
    const warn=new THREE.Mesh(new THREE.PlaneGeometry(3.4,40),new THREE.MeshBasicMaterial({color:'#ff1744',transparent:true,opacity:.4,depthWrite:false}));warn.position.set(LANES[lane+1],0,-.5);grp.add(warn);
    const sign=standee('⚡',2.2);sign.position.set(LANES[lane+1],3.5,.5);grp.add(sign);
    const pts=[];let y=-14;while(y<16){pts.push(new THREE.Vector3(LANES[lane+1]+(Math.random()-.5)*1.4,y,0));y+=1.6}
    const bolt=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0),80,.18,6),new THREE.MeshBasicMaterial({color:'#fff36b',transparent:true}));bolt.visible=false;grp.add(bolt);
    scene.add(grp);S.zap={grp,warn,bolt,lane,t:0,dur:2.6*K.speed,done:false,sign};S.stormTo=Math.max(S.stormTo,60);
    await K.say(...L.zap2);
    await K.until(()=>!S.zap||S.zap.done);
    const hit=S.zap&&S.zap.hit;await K.wait(.5);
    if(hit)await K.say(...L.zapHit);else{S.stormTo=Math.max(0,S.stormTo-8);await K.say(...L.zapMiss)}
  }
  async function script(){
    cut([0,RY+.6,9],[0,RY+.2,0],46);
    await K.wait(.6);
    // the Moon, far above: Twinkle needs paint
    S.moon=.02;cut([0,50,15],[0,47.5,-4],42);
    await K.say(...L.intro1);
    await K.say(...L.intro2);
    S.moon=0;
    cut([0,RY+.95,3.4],[0,RY+.9,0],40);
    await K.say(...L.intro3);
    // Stormy rises over the hills
    S.stormSky=true;storm.root.position.set(14,-6,-14);shot([2,RY+2.5,16],[3.5,RY+3,-4],54);K.sfx.crash();K.shake=.4;
    await K.wait(1);
    await K.say(...L.storm1);
    cut([0,RY-.2,3.4],[0,RY-.25,0],40);
    await K.say(...L.scared);
    shot([0,RY+1,13],[0,RY,0],50);S.stormSky=false;S.stormTo=45;
    await K.say(...L.liftoff);
    for(const n of ['3','2','1']){K.showBanner(n,'#3a86ff');K.sfx.select();await K.wait(.6)}
    K.showBanner('LIFT OFF!','#ff4f9a');S.launched=true;S.boost=1.5;K.shake=.9;K.sfx.whoosh();fx.puff(0,RY-2.5,0,40,'#ffffff',1.6);K.music.play(song);follow();
    await K.wait(1.6);S.stormTo=24;
    // tutorial
    await K.say(...L.tut1);
    await bubbleRound({prob:K.demo(),demo:true});
    await K.say(...L.saw);
    await K.say(...L.yourTurn);
    let ok=false;while(!ok)ok=await bubbleRound({prob:K.problem(),guided:true});
    await K.say(...L.tutDone);
    // the climb; Stormy creeps up while you think
    let last=null,creep=true,spaced=false,moonSoon=false;
    (async()=>{while(creep){await K.wait(.5);if(!S.zap&&S.launched)S.stormTo=Math.min(99,S.stormTo+.9)}})();
    while(S.correct<GOAL){
      S.events++;
      if(S.events%4===0)await zapRound();
      else{const p=K.problem(last);last=p;await bubbleRound({prob:p})}
      if(S.alt>.62&&!spaced){spaced=true;await K.say(...L.space)}
      if(S.correct===GOAL-2&&!moonSoon){moonSoon=true;await K.say(...L.moonSoon)}
    }
    creep=false;S.lock=true;S.stormTo=10;
    // landing on the Moon
    const t0=K.t;
    await K.until(()=>{S.moon=Math.min(1,(K.t-t0)/3);return S.moon>=1});
    S.landed=true;S.launched=false;S.climb=0;
    shot([0,RY+2.5,17],[0,RY+3,-4],55);
    K.music.fanfare();fx.confetti(0,RY+2,0,100);
    {const u=new THREE.Vector3();uni.root.getWorldPosition(u);cut([u.x+1.2,u.y+2.6,u.z+6],[u.x+.6,u.y+2,u.z],40)}
    await K.say(...L.land);
    cut([0,RY+.95,3.4],[0,RY+.9,0],40);
    await K.say(...L.paint);
    // the rainbow paints itself across the sky
    shot([0,RY+3,22],[0,RY+5,-6],60);
    {const t1=K.t;await K.until(()=>{const f=Math.min(1,(K.t-t1)/1.6);rainbow.scale.setScalar(Math.max(.001,easeOut(f)));return f>=1})}
    K.showBanner('MOON RAINBOW!','#9b5de5');K.sfx.cheer();
    S.stormMood='happy';S.shrink=1;S.stormTo=55;
    await K.wait(.8);
    await K.say(...L.stormSad);
    cut([0,RY+.95,3.4],[0,RY+.9,0],40);
    await K.say(...L.share);
    shot([0,RY+3,22],[0,RY+5,-6],60);
    await K.say(...L.end);
    await K.wait(2.2);
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
  function dispose(){st.dispose()}
  return{song,S,three:true,start(){script()},update,draw,key,tap,dispose};
}
