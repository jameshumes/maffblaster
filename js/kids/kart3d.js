// Kitty Kart Chase (3D): Mr. Grumbles steals Sparkle's birthday cake. The Super Kitties
// chase him down a rolling toon road. Number drones fly ahead with the answers; drive
// through the right one for a boost. Three right in a row is RAINBOW TURBO.
import {THREE,BEND,bend,createStage,createParticles,mesh,G,toon,blob,standee,textTexture,damp,lerp,easeOut,easeInOut} from './three/kit.js';
const flat=o=>bend(new THREE.MeshBasicMaterial(o));
import {makeKitty,makeRaccoon,makeKart,makeVan,makeCake,PROPS,BIOMES} from './three/chars.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {drawProblem,emo,rr,txt,lerp as l2} from './draw.js';
import {choicesFor,answerSay,allProblemLines} from './problems.js';
import {audioCtx} from '../audio.js';

const LANES=[-2.6,0,2.6];
const CHEERS=['Zoom!','Wheee!','Yes! Faster!','Purr-fect!','Turbo time!','Vroom vroom!','Super kitty speed!','We are catching up!'];
const JEERS=['Ha ha!','Too slow, kitties!','Hee hee hee!','Nyah nyah!'];
const L={
  intro1:['narrator',"It's Sparkle's birthday party in Sprinkle Valley!"],
  intro2:['kitty2','Look at my beautiful birthday cake! It has five candles!'],
  intro3:['kitty','Happy birthday, Sparkle! Make a wish!'],
  uhoh:['narrator',"Uh oh. Who's that?"],
  grab:['raccoon','Mwa ha ha! That cake is MINE!'],
  sad:['kitty2','Hey! Come back with my cake!'],
  hero:['kitty',"Don't worry, Sparkle! Super Kitties, to the Kitty Kart!"],
  tut1:['narrator','Number drones will fly ahead. Drive through the right answer to zoom!'],
  watch:['narrator','Watch me!'],
  saw:['kitty2','Zoom! Did you see that?'],
  yourTurn:['narrator','Now you try! Use the arrow keys, or tap the side of the road.'],
  tutDone:['narrator',"You did it! Now let's catch that raccoon!"],
  treats:['kitty2','Ooh, fish treats! Steer into them!'],
  banana1:['raccoon','Banana peel! Hee hee!'],banana2:['kitty','Look out! Steer away from the banana!'],
  slip:['kitty2','Whoooa! Slippery!'],dodge:['kitty','Ha! Missed us!'],
  ramp1:['kitty','Big ramp ahead! Hold on to your whiskers!'],ramp2:['kitty2','Wheeeeee!'],
  turbo:['kitty','Three in a row! RAINBOW TURBO!'],
  close:['kitty',"He's right there! Keep going!"],
  caught:['kitty','Gotcha, Mr. Grumbles!'],
  dizzy:['raccoon','Ooh. Everything is spinning.'],
  why:['kitty2','Why did you take my birthday cake?'],
  lonely:['raccoon','Nobody ever invites me to parties. I just wanted to have fun too.'],
  invite:['kitty2','Then come to MY party! Everyone is invited!'],
  really:['raccoon','Really? You mean it? Hooray!'],
  end:['narrator','And that was the best birthday party ever!'],
  oops:['narrator','Oops!'],
};
const BIOME_LINES=BIOMES.map(b=>['narrator',`Welcome to ${b.name}!`]);
export function lines(){
  return[...Object.values(L),...BIOME_LINES,...JEERS.map(t=>['raccoon',t]),...['kitty','kitty2'].flatMap(w=>CHEERS.map(t=>[w,t])),...allProblemLines()];
}
export default {id:'kart',title:'Kitty Kart Chase',sub:'Chase the cake thief!',art:'🏎️',color:'#ff4f9a',create,lines};

function create(K){
  BEND.value.set(0,.0013);
  const st=createStage(K.host3d),{scene,camera}=st;
  const fx=createParticles(scene);
  const S={lane:0,kx:0,speed:0,cruise:0,boost:0,turbo:0,spin:0,jump:0,dist:0,curve:0,curveTo:0,gap:6,biome:0,
    prob:null,probPop:0,solved:false,lock:true,correct:0,wrong:0,slips:0,streak:0,treats:0,events:0,flash:0,
    cam:{mode:'shot',pos:new THREE.Vector3(9,3.4,7),look:new THREE.Vector3(3,1.2,-3),fov:50},vanMood:'grumpy',party:false,driving:false};
  const song='kart';

  // ---------- road + ground ----------
  function roadTexture(b){
    const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d');
    g.fillStyle=b.road;g.fillRect(0,0,256,512);
    g.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<60;i++)g.fillRect(Math.random()*256,Math.random()*512,3,3);
    for(let y=0;y<512;y+=64){g.fillStyle=(y/64)%2?'#ffffff':'#ff4f6d';g.fillRect(0,y,18,64);g.fillRect(238,y,18,64)}
    g.fillStyle='rgba(255,255,255,.85)';for(const x of [85,171])for(let y=0;y<512;y+=128)g.fillRect(x-4,y,8,70);
    const t=new THREE.CanvasTexture(c);t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  }
  function grassTexture(b){
    const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');
    g.fillStyle=b.grass;g.fillRect(0,0,64,128);g.fillStyle=b.grass2;g.fillRect(0,0,64,64);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  const ROADLEN=260,TILE=16;
  const road=new THREE.Mesh(new THREE.PlaneGeometry(8.6,ROADLEN,1,130),flat({}));
  road.rotation.x=-Math.PI/2;road.position.set(0,.01,-ROADLEN/2+12);scene.add(road);
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(320,ROADLEN,1,130),flat({}));
  grass.rotation.x=-Math.PI/2;grass.position.set(0,0,-ROADLEN/2+12);scene.add(grass);
  function applyBiome(i){
    const b=BIOMES[i];
    road.material.map=roadTexture(b);road.material.map.repeat.set(1,ROADLEN/TILE);road.material.needsUpdate=true;
    grass.material.map=grassTexture(b);grass.material.map.repeat.set(40,ROADLEN/8);grass.material.needsUpdate=true;
    st.setSky(...b.sky,b.fog);
  }
  applyBiome(0);

  // ---------- scrolling things ----------
  const movers=[];// {obj, recycle?, side}
  function addMover(obj,z,opts={}){obj.position.z=z;scene.add(obj);const m={obj,...opts};movers.push(m);return m}
  function removeMover(m){scene.remove(m.obj);movers.splice(movers.indexOf(m),1)}
  function spawnProp(z){
    const b=BIOMES[S.biome],side=Math.random()<.5?-1:1;
    const o=Math.random()<.15?PROPS.animal(b.animals):PROPS[b.props[Math.floor(Math.random()*b.props.length)]]();
    o.position.x=side*(6+Math.random()*16);o.rotation.y=Math.random()*6;
    if(o.isMesh)o.rotation.y=0; // standees face the camera
    addMover(o,z,{prop:true});
  }
  for(let z=10;z>-150;z-=4)spawnProp(z+Math.random()*2);
  let farthest=-150;

  // ---------- cast ----------
  const kart=makeKart();scene.add(kart.root);
  const cap=makeKitty();const spk=makeKitty({fur:'#fff4fb',stripe:null,mask:'#ff4f9a',capeColor:'#9b5de5',tiara:true});
  const van=makeVan();van.root.position.set(-2.6,0,40);scene.add(van.root);
  // party set: table, cake, balloons, the two kitties standing by it
  const party=new THREE.Group();party.position.set(5.2,0,-2);scene.add(party);
  const table=mesh(new RoundedBoxGeometry(3.2,.2,1.8,3,.08),'#ffffff');table.position.y=1.05;party.add(table);
  const cloth=mesh(new RoundedBoxGeometry(3.3,.12,1.9,3,.05),'#ff9ec7',{ink:.01});cloth.position.y=1.12;party.add(cloth);
  for(const [x,z] of [[-1.3,-.7],[1.3,-.7],[-1.3,.7],[1.3,.7]]){const lg=mesh(G.cyl(.08,.08,1,8),'#c98b4e');lg.position.set(x,.5,z);party.add(lg)}
  let cake=makeCake();cake.position.set(0,1.18,0);party.add(cake);
  const balloons=[];
  ['#ff3b3b','#ffd23f','#3a86ff','#22c55e','#9b5de5','#ff8c1a'].forEach((c,i)=>{const b=new THREE.Group();b.position.set(-1.8+i*.7,2.6+Math.random()*.6,-1.2);
    const s=mesh(G.sphere(.32,16,12),c);s.scale.set(1,1.15,1);b.add(s);const str=mesh(G.cyl(.01,.01,1.6,4),'#ffffff',{ink:0});str.position.y=-1.1;b.add(str);party.add(b);balloons.push(b)});
  cap.root.position.set(-.9,0,1.6);spk.root.position.set(.7,0,1.6);party.add(cap.root,spk.root);
  addMover(party,-2,{party:true});

  // ---------- engine hum ----------
  let engine=null;
  try{const {AC,master}=audioCtx();if(AC){const o=AC.createOscillator(),o2=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();
    o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=380;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(master);o.start();o2.start();engine={o,o2,g,AC}}}catch(e){}

  // ---------- helpers ----------
  const v=new THREE.Vector3();
  // world → screen, following the curved world
  function screenOf(p){v.copy(p);const d=Math.max(0,-v.z);v.x+=BEND.value.x*d*d;v.y-=BEND.value.y*d*d;v.project(camera);return[(v.x+1)/2*K.w,(1-v.y)/2*K.h]}
  function shot(pos,look,fov=50,cut=false){S.cam.mode='shot';S.cam.pos.set(...pos);S.cam.look.set(...look);S.cam.fov=fov;
    if(cut){camera.position.set(...pos);S.lookCur=S.cam.look.clone();camera.fov=fov}}
  const close=(pos,look)=>shot(pos,look,40,true);
  function chase(){S.cam.mode='chase'}
  const talk=w=>K.talk(w);
  function seatKitties(){
    for(const [k,i] of [[cap,0],[spk,1]]){k.root.parent&&k.root.parent.remove(k.root);kart.car.add(k.root);k.root.position.copy(kart.seats[i]);k.root.rotation.set(0,Math.PI,0);k.root.scale.setScalar(.72)}
  }
  async function hop(k,to,dur=.7){
    const from=new THREE.Vector3();k.root.getWorldPosition(from);scene.attach(k.root);
    const t0=K.t;K.sfx.boing();
    await K.until(()=>{const f=Math.min(1,(K.t-t0)/dur);k.root.position.lerpVectors(from,to,f);k.root.position.y+=Math.sin(f*Math.PI)*2;k.root.scale.setScalar(lerp(1,.72,f));k.root.rotation.y=f*Math.PI;return f>=1});
  }
  // ---------- number drones ----------
  function numberTex(n){return textTexture(String(n),{bg:null,border:null,fg:'#1e2a4a',font:'700 170px Fredoka'})}
  function makeGate(vals,ans,guided){
    const g=new THREE.Group(),drones=[];
    vals.forEach((n,i)=>{
      const d=new THREE.Group();d.position.set(LANES[i],7,0);g.add(d);
      const block=mesh(new RoundedBoxGeometry(2,1.55,.45,3,.2),'#ffffff',{ink:.03});d.add(block);
      const face=new THREE.Mesh(new THREE.PlaneGeometry(1.75,1.75),flat({map:numberTex(n),transparent:true}));face.position.z=.24;d.add(face);
      const rim=mesh(new RoundedBoxGeometry(2.15,1.7,.3,3,.22),'#3a86ff',{ink:0});rim.position.z=-.1;d.add(rim);
      const prop=new THREE.Group();prop.position.y=1.05;d.add(prop);
      const hub=mesh(G.cyl(.08,.08,.3,8),'#2b2d42',{ink:0});prop.add(hub);
      const blades=mesh(G.box(1.4,.04,.16),'#ff4f9a',{ink:.01});blades.position.y=.16;prop.add(blades);
      const pad=new THREE.Mesh(new THREE.CircleGeometry(1.1,32),flat({color:'#7fe0ff',transparent:true,opacity:.55,depthWrite:false}));
      pad.rotation.x=-Math.PI/2;pad.position.set(LANES[i],.04,0);g.add(pad);
      if(guided&&i!==ans){block.material=toon('#c9ced8');rim.material=toon('#aab0bd');face.material.opacity=.35}
      drones.push({d,blades,pad,rim,block,n,i});
    });
    return{g,drones,ans,vals};
  }

  // ---------- update ----------
  function update(dt){
    const t=K.t;
    // steering and speed
    S.kx=damp(S.kx,LANES[S.lane+1],9,dt);
    S.boost=Math.max(0,S.boost-dt*.7);S.turbo=Math.max(0,S.turbo-dt);
    let sp=S.cruise+S.boost*16+(S.turbo>0?18:0);
    if(S.spin>0){S.spin-=dt;sp*=.35}
    S.speed=damp(S.speed,sp,2.5,dt);
    const d=S.speed*dt;S.dist+=d;
    // the road bends now and then
    if(S.driving&&Math.random()<dt*.2)S.curveTo=(Math.random()*2-1)*.0018;
    S.curve=damp(S.curve,S.driving?S.curveTo:0,.6,dt);BEND.value.x=S.curve;
    road.material.map.offset.y+=d/TILE;grass.material.map.offset.y+=d/8;
    for(const m of [...movers]){m.obj.position.z+=d;if(m.prop&&m.obj.position.z>14)removeMover(m)}
    farthest+=d;while(farthest>-150){farthest-=4;spawnProp(farthest+Math.random()*2)}
    // kart
    kart.root.position.x=S.kx;
    if(S.jump>0){S.jump+=dt/1.3;const f=Math.min(1,S.jump);kart.root.position.y=Math.sin(f*Math.PI)*3.2;kart.car.rotation.x=-Math.sin(f*Math.PI)*.3;kart.root.rotation.y=f*Math.PI*2;
      if(S.jump>=1){S.jump=0;kart.root.position.y=0;kart.root.rotation.y=0;K.shake=.5;fx.sparkle(S.kx,.5,0,30,6);K.sfx.balloonPop()}}
    else kart.root.rotation.y=S.spin>0?S.spin*9:0;
    kart.update(dt,t,{speed:S.speed,steer:(LANES[S.lane+1]-S.kx)*.6,boost:S.boost+(S.turbo>0?1:0)});
    S.cheer=Math.max(0,(S.cheer||0)-dt);
    for(const [k,w] of [[cap,'kitty'],[spk,'kitty2']])k.update(dt,t,{talk:talk(w),wind:Math.min(1,S.speed/20),bounce:S.driving?.3:1,cheer:S.cheer>0||S.orbit?1:0});
    // van keeps its distance
    if(!S.party){
      const vz=S.vanZ!==undefined?S.vanZ:-(9+S.gap*.55);
      van.root.position.z=damp(van.root.position.z,vz,S.vanFast?1.2:3,dt);
      if(S.driving)van.root.position.x=damp(van.root.position.x,Math.sin(t*.5)*2.4,1,dt);
    }
    van.update(dt,t,{speed:S.driving?S.speed:0,talk:talk('raccoon'),mood:S.vanMood});
    if(S.driving&&Math.random()<dt*8)fx.puff(van.root.position.x+.6,.5,van.root.position.z+1.9,1,'#e3e6ee',.5);
    // exhaust, turbo rainbow
    if(S.driving&&Math.random()<dt*(S.boost>0?30:8))fx.puff(S.kx+(Math.random()<.5?-.5:.5),.5,1.6,1,S.boost>0?'#ffd6a5':'#f1f3f8',.4);
    if(S.turbo>0)for(const c of ['#ff3b3b','#ff8c1a','#ffd23f','#22c55e','#3a86ff','#9b5de5'])fx.add({x:S.kx+(Math.random()-.5)*.8,y:.4+Math.random()*.6,z:1.8,vz:6,life:.6,size:.45,color:c,drag:.5});
    // drones: hover while held, then sit at a fixed spot on the road
    for(const gt of S.gates){
      gt.drones.forEach(dr=>{dr.blades.rotation.y+=dt*30;
        const tgtY=gt.held?3.4:2.7;dr.d.position.y=damp(dr.d.position.y,tgtY+Math.sin(t*3+dr.i)*.15,3,dt);
        dr.d.rotation.y=Math.sin(t*1.5+dr.i)*.15});
      if(gt.held)gt.g.position.z=damp(gt.g.position.z,-24,3,dt);
      else if(!gt.done){gt.g.position.z+=gt.v*dt;if(gt.g.position.z>=-.3)resolve(gt)}
      else gt.g.position.z+=d;
    }
    S.gates=S.gates.filter(gt=>{if(gt.g.position.z>14){scene.remove(gt.g);return false}return true});
    // treats
    for(const tr of S.treatObjs){tr.obj.rotation.y+=dt*4;if(!tr.got&&tr.obj.position.z>-.2&&tr.obj.position.z<1.2&&Math.abs(tr.obj.position.x-S.kx)<1.2){tr.got=true;tr.obj.visible=false;S.treats++;K.sfx.coin();fx.sparkle(tr.obj.position.x,1,0,10,3,['#ffd23f','#ffffff'])}}
    // banana
    const bn=S.banana;
    if(bn){if(bn.t<1){bn.t=Math.min(1,bn.t+dt*1.3);const f=easeOut(bn.t);bn.obj.position.set(lerp(bn.x0,LANES[bn.lane+1],f),Math.sin(bn.t*Math.PI)*4+.3,lerp(bn.z0,-34,f));bn.obj.rotation.z+=dt*12}
      else{bn.obj.rotation.z=0;bn.obj.position.z+=d;if(!bn.done&&bn.obj.position.z>=-.3){bn.done=true;bn.hit=S.lane===bn.lane;if(bn.hit){S.spin=1.1;S.slips++;K.sfx.oops();K.shake=.5;fx.puff(S.kx,.4,0,10,'#fff3b0',.7)}}
        if(bn.obj.position.z>14){scene.remove(bn.obj);S.banana=null}}}
    // ramp
    if(S.ramp){S.ramp.obj.position.z+=d;if(!S.ramp.done&&S.ramp.obj.position.z>=-.5){S.ramp.done=true;S.jump=1e-4;K.sfx.boing()}if(S.ramp.obj.position.z>14){scene.remove(S.ramp.obj);S.ramp=null}}
    // biome arch
    if(S.arch){S.arch.obj.position.z+=d;if(!S.arch.done&&S.arch.obj.position.z>=0){S.arch.done=true;S.biome=S.arch.biome;applyBiome(S.biome);for(const m of movers.filter(m=>m.prop&&m.obj.position.z<-6&&!m.treat)){const z=m.obj.position.z;removeMover(m);spawnProp(z)}S.flash=1;K.sfx.chime();K.showBanner(BIOMES[S.biome].name,'#ff4f9a')}
      if(S.arch.obj.position.z>14){scene.remove(S.arch.obj);S.arch=null}}
    // party fireworks
    if(S.party&&Math.random()<dt*1.6)firework();
    if(cake.userData.update)cake.userData.update(t);
    balloons.forEach((b,i)=>{b.position.y+=Math.sin(t*2+i)*.002;b.rotation.z=Math.sin(t*1.3+i)*.1});
    fx.update(dt,S.driving?S.speed:0);
    if(S.prob)S.probPop+=dt*3;
    S.flash=Math.max(0,S.flash-dt*1.5);
    // engine
    if(engine){const f=40+S.speed*4;engine.o.frequency.setTargetAtTime(f,engine.AC.currentTime,.1);engine.o2.frequency.setTargetAtTime(f*.5,engine.AC.currentTime,.1);
      engine.g.gain.setTargetAtTime(S.driving?.035:0,engine.AC.currentTime,.3)}
    // camera
    const c=S.cam;
    if(c.mode==='chase'){c.pos.set(S.kx*.55,3.5+(S.jump>0?kart.root.position.y*.6:0),7.6);c.look.set(S.kx*.7,1.3+(S.jump>0?kart.root.position.y*.5:0),-9);c.fov=60+S.boost*10+(S.turbo>0?14:0)}
    camera.position.x=damp(camera.position.x,c.pos.x,4,dt);camera.position.y=damp(camera.position.y,c.pos.y,4,dt);camera.position.z=damp(camera.position.z,c.pos.z,4,dt);
    S.lookCur=S.lookCur||c.look.clone();S.lookCur.x=damp(S.lookCur.x,c.look.x,4,dt);S.lookCur.y=damp(S.lookCur.y,c.look.y,4,dt);S.lookCur.z=damp(S.lookCur.z,c.look.z,4,dt);
    camera.lookAt(S.lookCur);camera.rotation.z+=-S.curve*60;
    if(K.shake){camera.position.x+=(Math.random()-.5)*K.shake*.4;camera.position.y+=(Math.random()-.5)*K.shake*.4}
    camera.fov=damp(camera.fov,c.fov,3,dt);camera.updateProjectionMatrix();
  }
  function firework(){
    const x=(Math.random()-.5)*16,y=7+Math.random()*5,z=-14-Math.random()*8,cols=[['#ff3b3b','#ffd23f'],['#3a86ff','#ffffff'],['#22c55e','#ffd23f'],['#ff4f9a','#9b5de5']][Math.floor(Math.random()*4)];
    for(let i=0;i<60;i++){const a=Math.random()*6.28,b=Math.acos(Math.random()*2-1),s=5+Math.random()*2;
      fx.add({x,y,z,vx:Math.cos(a)*Math.sin(b)*s,vy:Math.cos(b)*s,vz:Math.sin(a)*Math.sin(b)*s,g:3,drag:1.2,life:1.4+Math.random()*.6,size:.5,color:cols[i%2]})}
    K.sfx.balloonPop();
  }

  // ---------- drawing (3D, then the 2D layer on top) ----------
  function draw(g,w,h){
    st.render();
    // speed lines on boosts
    if(S.boost>.2||S.turbo>0){g.strokeStyle=`rgba(255,255,255,${Math.min(.6,S.boost*.5+(S.turbo>0?.4:0))})`;g.lineWidth=3;
      for(let i=0;i<24;i++){const a=Math.random()*6.28,r0=Math.min(w,h)*(.35+Math.random()*.2),r1=r0+60+Math.random()*120;g.beginPath();g.moveTo(w/2+Math.cos(a)*r0,h*.55+Math.sin(a)*r0);g.lineTo(w/2+Math.cos(a)*r1,h*.55+Math.sin(a)*r1);g.stroke()}}
    if(S.flash){g.fillStyle=`rgba(255,255,255,${S.flash*.8})`;g.fillRect(0,0,w,h)}
    if(S.prob)drawProblem(g,S.prob,w/2,h*.07,w,{solved:S.solved,pop:S.probPop,t:K.t});
    if(S.driving||S.party)hud(g,w,h);
  }
  function hud(g,w,h){
    // chase meter
    const x0=w*.22,x1=w*.78,y=26,f=1-S.gap/100;
    g.fillStyle='rgba(255,255,255,.8)';rr(g,x0-16,y-16,x1-x0+32,32,16);g.fill();
    g.fillStyle='#ffd1e8';rr(g,x0,y-6,x1-x0,12,6);g.fill();
    const gr=g.createLinearGradient(x0,0,x1,0);['#ff3b3b','#ff8c1a','#ffd23f','#22c55e','#3a86ff','#9b5de5'].forEach((c,i)=>gr.addColorStop(i/5,c));
    g.fillStyle=gr;rr(g,x0,y-6,(x1-x0)*Math.max(0,Math.min(1,f)),12,6);g.fill();
    emo(g,'🚐',x1+4,y,34);emo(g,'🏎️',x0+(x1-x0)*Math.max(0,Math.min(1,f)),y-2,34);
    // fish treats
    g.fillStyle='rgba(255,255,255,.85)';rr(g,14,52,112,44,22);g.fill();emo(g,'🐟',40,74,30);txt(g,'× '+S.treats,84,75,24,'#2b2d42');
    // rainbow turbo charge
    for(let i=0;i<3;i++){g.fillStyle=i<S.streak?['#ff3b3b','#ffd23f','#22c55e'][i]:'rgba(255,255,255,.6)';g.beginPath();g.arc(w-150+i*30,74,11,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.stroke()}
    if(S.turbo>0)txt(g,'RAINBOW TURBO!',w/2,h*.8,Math.min(54,w*.05),'#ff4f9a',{stroke:10});
  }

  // ---------- gameplay ----------
  function resolve(gt){
    gt.done=true;const i=S.lane+1;gt.picked=i;gt.ok=i===gt.ans;
    const dr=gt.drones[i];
    if(gt.ok){
      S.boost=1.3;S.flash=.3;K.shake=.3;K.sfx.zap(8);K.sfx.whoosh();S.solved=true;S.cheer=1.6;
      fx.confetti(LANES[i],2.6,-1,70,1.1);fx.sparkle(LANES[i],2.6,-1,30,5);
      dr.d.visible=false;dr.pad.material.color.set('#4ade80');dr.pad.material.opacity=.95;
      gt.drones.forEach(o=>{if(o!==dr){o.d.visible=false;fx.puff(LANES[o.i],2.6,-1,4,'#ffffff',.6)}});
    }else{
      S.spin=1.2;K.sfx.oops();K.shake=.6;fx.puff(S.kx,.4,0,14,'#8b5a2b',.8);dr.pad.material.color.set('#8b5a2b');dr.pad.material.opacity=.95;
      gt.drones.forEach(o=>{if(o.i===gt.ans){o.block.material=toon('#bbf7d0')}else o.d.visible=false});
    }
  }
  async function gateRound({prob,demo=false,guided=false}){
    const vals=choicesFor(prob.ans,prob.step),ans=vals.indexOf(prob.ans);
    S.prob=prob;S.probPop=0;S.solved=false;
    const gt=makeGate(vals,ans,guided);gt.held=true;gt.g.position.z=-60;scene.add(gt.g);S.gates.push(gt);
    K.sfx.whoosh();
    await K.say('narrator',prob.say);
    if(demo){
      await K.say(...L.watch);
      const dr=gt.drones[ans];const p=new THREE.Vector3();
      K.hand.on=true;K.hand.x=K.w/2;K.hand.y=K.h*.8;
      for(let i=0;i<25;i++){dr.d.getWorldPosition(p);const [sx,sy]=screenOf(p);K.hand.x=l2(K.hand.x,sx,.2);K.hand.y=l2(K.hand.y,sy+40,.2);await K.wait(.03)}
      K.hand.tap=1;K.sfx.select();await K.wait(.4);S.lane=ans-1;K.hand.on=false;
    }else{
      S.lock=false;
      if(guided)K.wait(3.5).then(()=>{if(!gt.done&&S.lane!==ans-1){const p=new THREE.Vector3();gt.drones[ans].d.getWorldPosition(p);const [sx,sy]=screenOf(p);K.hand.on=true;K.hand.x=sx;K.hand.y=sy+40;K.sfx.select()}});
    }
    gt.held=false;gt.v=24/(3.6*K.speed*(prob.think||1));
    await K.until(()=>gt.done);K.hand.on=false;
    if(gt.ok){
      if(!demo&&!guided){S.correct++;S.gap=Math.max(0,S.gap-12);S.streak++}
      const who=Math.random()<.5?'kitty':'kitty2';
      await K.say(who,CHEERS[Math.floor(Math.random()*CHEERS.length)]);
      await K.say('narrator',answerSay(prob));
      if(S.streak>=3){S.streak=0;S.turbo=4;S.gap=Math.max(0,S.gap-8);K.sfx.cheer();K.say(...L.turbo)}
    }else{
      if(!demo&&!guided){S.wrong++;S.gap=Math.min(100,S.gap+5);S.streak=0}
      S.vanMood='happy';K.say('raccoon',JEERS[Math.floor(Math.random()*JEERS.length)]);await K.wait(1);S.vanMood='grumpy';
      await K.sayNow('narrator','Oops!');await K.say('narrator',answerSay(prob));
    }
    S.prob=null;
    return gt.ok;
  }
  function treatLine(){
    const lane=Math.floor(Math.random()*3),zig=Math.random()<.4;
    for(let i=0;i<5;i++){
      const o=new THREE.Group(),ring=mesh(G.torus(.42,.09),'#ffd23f',{ink:.012,emissive:.25});o.add(ring);
      const f=standee('🐟',.6);f.position.y=0;o.add(f);
      o.position.set(LANES[zig?(lane+i)%3:lane],1.1,-40-i*4);addMover(o,o.position.z,{prop:true,treat:true});S.treatObjs.push({obj:o,got:false});
    }
  }
  async function bananaRound(){
    S.vanMood='happy';await K.say(...L.banana1);S.vanMood='grumpy';
    const obj=new THREE.Group();const bb=mesh(new THREE.TorusGeometry(.45,.16,8,16,Math.PI*1.1),'#ffd23f');bb.rotation.z=Math.PI*.95;obj.add(bb);obj.add(blob(.6));
    obj.position.copy(van.root.position);obj.position.y=2.5;scene.add(obj);
    S.banana={obj,t:0,lane:S.lane,x0:van.root.position.x,z0:van.root.position.z,done:false,hit:false};K.sfx.whoosh();
    await K.say(...L.banana2);
    await K.until(()=>!S.banana||S.banana.done);
    if(S.banana&&S.banana.hit)await K.say(...L.slip);else{S.gap=Math.max(0,S.gap-4);await K.say(...L.dodge)}
  }
  async function rampRound(){
    await K.say(...L.ramp1);
    const obj=new THREE.Group();
    const geo=new THREE.BoxGeometry(8.4,1,4);geo.translate(0,.5,0);
    const r=mesh(geo,'#ffb000',{ink:.03});r.rotation.x=.25;obj.add(r);
    for(let i=-3;i<=3;i++){const a=mesh(G.cone(.35,.6,3),'#fff3c4',{ink:0});a.rotation.set(-Math.PI/2+.25,0,0);a.position.set(i*1.1,1.05,0);obj.add(a)}
    obj.position.z=-60;scene.add(obj);S.ramp={obj,done:false};
    await K.until(()=>S.ramp&&S.ramp.done);
    await K.say(...L.ramp2);
    await K.until(()=>S.jump===0);
  }
  function arch(biome){
    const obj=new THREE.Group(),col='#ff4f9a';
    for(const sd of [-1,1]){const p=mesh(G.cyl(.35,.4,6,12),col,{ink:.03});p.position.set(sd*5.2,3,0);obj.add(p);
      const top=mesh(G.sphere(.55,12,10),'#ffd23f');top.position.set(sd*5.2,6.2,0);obj.add(top)}
    const banner=mesh(new RoundedBoxGeometry(10,1.6,.3,3,.2),'#ffffff',{ink:.03});banner.position.y=5.6;obj.add(banner);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(9.4,1.5),flat({map:textTexture(BIOMES[biome].name,{w:1024,h:160,bg:null,border:null,fg:col,font:'700 120px Fredoka'}),transparent:true}));
    face.position.set(0,5.6,.17);obj.add(face);
    obj.position.z=-80;scene.add(obj);S.arch={obj,done:false,biome};
  }

  // ---------- the story ----------
  async function script(){
    S.gates=[];S.treatObjs=[];
    shot([9.5,3.2,6.5],[4.6,1.4,-2.2],46);
    await K.wait(.8);
    await K.say(...L.intro1);
    close([5.9,1.75,3.4],[5.9,1.45,-.4]);
    await K.say(...L.intro2);
    close([4.3,1.75,3.4],[4.3,1.45,-.4]);
    await K.say(...L.intro3);
    // the van arrives from behind
    K.sfx.whoosh();S.vanZ=-1.5;van.root.position.set(-2.6,0,30);
    shot([1.5,3,7],[-2.6,1.4,-1],52);
    await K.say(...L.uhoh);
    shot([-1.2,2.6,5.6],[-2.6,1.8,1],46);S.vanMood='happy';
    await K.say(...L.grab);
    // the cake flies from the table onto the van
    {const from=new THREE.Vector3();cake.getWorldPosition(from);scene.attach(cake);const to=new THREE.Vector3();van.cake.getWorldPosition(to);van.cake.visible=false;const t0=K.t;K.sfx.boing();
      await K.until(()=>{const f=Math.min(1,(K.t-t0)/.8);cake.position.lerpVectors(from,to,easeInOut(f));cake.position.y+=Math.sin(f*Math.PI)*3;cake.rotation.y=f*6;return f>=1});
      scene.remove(cake);van.cake.visible=true;cake=van.cake}
    S.vanFast=true;S.vanZ=-70;K.sfx.whoosh();S.vanMood='grumpy';
    await K.wait(.8);
    close([5.9,1.75,3.4],[5.9,1.45,-.4]);
    await K.say(...L.sad);
    close([4.3,1.75,3.4],[4.3,1.45,-.4]);
    await K.say(...L.hero);
    // into the kart
    shot([6,4,9],[1,1,-1],55);
    const seat=i=>{const p=kart.seats[i].clone();kart.car.localToWorld(p);return p};
    await Promise.all([hop(cap,seat(0)),hop(spk,seat(1))]);
    seatKitties();
    K.music.play(song);S.vanFast=false;S.vanZ=undefined;S.gap=100;S.driving=true;S.cruise=14;chase();
    await K.wait(1.2);
    // tutorial: watch, then try with the wrong drones greyed out
    await K.say(...L.tut1);
    await gateRound({prob:K.demo(),demo:true});
    await K.say(...L.saw);
    await K.say(...L.yourTurn);
    let ok=false;while(!ok)ok=await gateRound({prob:K.problem(),guided:true});
    await K.say(...L.tutDone);
    for(const n of ['3','2','1','GO!']){K.showBanner(n,n==='GO!'?'#22c55e':'#3a86ff');K.sfx[n==='GO!'?'cheer':'select']();await K.wait(.7)}
    // the chase
    let last=null,hinted=false,treatHint=false;
    while(S.gap>0){
      S.events++;
      if(S.correct>=3&&S.biome===0&&!S.arch&&!S.arch1){S.arch1=true;arch(1)}
      if(S.correct>=6&&S.biome===1&&!S.arch&&!S.arch2){S.arch2=true;arch(2)}
      if(S.events%3===0){treatLine();if(!treatHint){treatHint=true;await K.say(...L.treats)}else await K.wait(1.5)}
      if(S.events%4===0)await bananaRound();
      else if(S.correct===4&&!S.rampDone){S.rampDone=true;await rampRound()}
      else{const p=K.problem(last);last=p;await gateRound({prob:p})}
      if(S.gap<30&&!hinted){hinted=true;await K.say(...L.close)}
    }
    await finale();
  }
  async function finale(){
    S.lock=true;S.vanZ=-14;
    await K.wait(1.2);
    // the van spins out into a giant cotton-candy bush
    const bush=new THREE.Group();for(const [x,y,r] of [[0,1,1.8],[1.4,.8,1.3],[-1.3,.9,1.4],[.4,2.2,1.2]]){const s=mesh(G.sphere(r,16,12),'#ffb3e0');s.position.set(x,y,0);bush.add(s)}
    bush.position.set(10,0,-19);scene.add(bush);
    S.party=true;S.driving=false;S.cruise=0;S.speed=0;
    const vs=van.root.position.clone(),t0=K.t;K.sfx.whoosh();
    shot([0,4,6],[3,1,-12],52);
    await K.until(()=>{const f=Math.min(1,(K.t-t0)/1.2);van.root.position.set(lerp(vs.x,8.2,easeOut(f)),0,lerp(vs.z,-17.5,easeOut(f)));van.root.rotation.y=f*Math.PI*2.2;return f>=1});
    K.shake=.8;K.sfx.balloonPop();fx.puff(9,1.5,-18,30,'#ffd1ec',1.4);fx.confetti(9,2,-18,60);
    // Mr. Grumbles climbs out, dizzy
    const rac=makeRaccoon();rac.root.position.set(4.2,0,-13);rac.root.rotation.y=-.35;scene.add(rac.root);van.rac.root.visible=false;
    S.rac=rac;S.racMood='dizzy';
    const racShot=()=>close([3.3,1.75,-9.4],[4.2,1.45,-13]),kitShot=()=>close([.35,2.1,-3.6],[0,1.6,0]);
    shot([1.5,2.4,-4],[4.2,1.3,-13],46);
    await K.say(...L.caught);
    racShot();await K.say(...L.dizzy);S.racMood='sad';
    kitShot();await K.say(...L.why);
    racShot();await K.say(...L.lonely);
    kitShot();await K.say(...L.invite);
    S.racMood='happy';racShot();await K.say(...L.really);
    // party in the middle of the road: everyone around the cake
    const tbl=mesh(new RoundedBoxGeometry(3,.2,1.6,3,.08),'#ff9ec7',{ink:.02});tbl.position.set(0,1,-12);scene.add(tbl);
    for(const [x,z] of [[-1.2,-12.6],[1.2,-12.6],[-1.2,-11.4],[1.2,-11.4]]){const lg=mesh(G.cyl(.08,.08,1,8),'#c98b4e');lg.position.set(x,.5,z);scene.add(lg)}
    const c2=makeCake();c2.position.set(0,1.1,-12);scene.add(c2);cake=c2;van.cake.visible=false;
    for(const [k,x] of [[cap,-1.9],[spk,1.9]]){scene.attach(k.root);k.root.scale.setScalar(1);k.root.rotation.set(0,0,0);k.root.position.set(x,0,-10.6)}
    rac.root.position.set(3.7,0,-11.4);rac.root.rotation.y=-.35;
    party.visible=false;
    K.music.fanfare();fx.confetti(0,3,-12,140,1.3);K.showBanner('PARTY TIME!','#ff4f9a');
    shot([0,3.6,-3.5],[0,1.5,-12],48,true);S.orbit=K.t;
    await K.say(...L.end);
    await K.wait(2.5);
    const miss=S.wrong+S.slips*.5;
    K.finish(miss===0?3:miss<=2?2:1);
  }
  // party camera orbit + raccoon animation hook
  const baseUpdate=update;
  function update2(dt){
    baseUpdate(dt);
    if(S.rac){S.rac.update(dt,K.t,{talk:K.talk('raccoon'),mood:S.racMood})}
    if(S.orbit){const a=Math.sin((K.t-S.orbit)*.35)*.75;S.cam.mode='shot';S.cam.pos.set(Math.sin(a)*8.5,3.6,-12+Math.cos(a)*8.5);S.cam.look.set(0,1.5,-12);S.cam.fov=48;
      for(const k of [cap,spk])k.root.position.y=Math.abs(Math.sin(K.t*5+(k===cap?0:1)))*.4;S.rac.root.position.y=Math.abs(Math.sin(K.t*5+2))*.4}
  }
  function key(k){
    if(S.lock)return k.startsWith('Arrow');
    if(k==='ArrowLeft'||k==='a'||k==='A'){if(S.lane>-1){S.lane--;K.sfx.select()}return true}
    if(k==='ArrowRight'||k==='d'||k==='D'){if(S.lane<1){S.lane++;K.sfx.select()}return true}
    if(k==='ArrowUp'||k==='ArrowDown'){S.lane=0;K.sfx.select();return true}
    return false;
  }
  function tap(x){if(S.lock)return;const l=x<K.w/3?-1:x>K.w*2/3?1:0;if(l!==S.lane){S.lane=l;K.sfx.select()}}
  function dispose(){try{engine&&(engine.o.stop(),engine.o2.stop())}catch(e){}BEND.value.x=0;st.dispose()}
  return{song,S,camera,cast:{cap,spk},three:true,start(){script()},update:update2,draw,key,tap,dispose};
}
