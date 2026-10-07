// Feed the Dragon (3D): Ember the baby dragon is too little to light her own birthday
// candles. Feed her exactly the snacks she asks for (skip counting by 2s, 5s and 10s) and
// she grows big enough to light them, and everyone from the other stories comes to her party.
import {THREE,BEND,createStage,createParticles,mesh,G,toon,blob,standee,damp,lerp,easeOut,easeInOut} from './three/kit.js';
import {makeKitty,makeRaccoon,makeCake,PROPS} from './three/chars.js';
import {makeDragon,makeUnicorn,SNACK3D} from './three/cast2.js';
import {emo,rr,txt,colorText,lerp as l2} from './draw.js';
import {NUM_COLORS} from './problems.js';

const SNACKS=[{k:'strawberry',many:'strawberries'},{k:'cookie',many:'cookies'},{k:'apple',many:'apples'},{k:'cupcake',many:'cupcakes'}];
const PACKS={2:{k:'cherries',many:'cherries',say:'Cherries come in pairs! Count by twos.'},5:{k:'grapes',many:'grapes',say:'Each bunch has 5 grapes! Count by fives.'},10:{k:'chocolate',many:'chocolate squares',say:'Each chocolate bar has 10 squares! Count by tens.'}};
const R=(a,b,s=1)=>{const o=[];for(let i=a;i<=b;i+=s)o.push(i);return o};
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const SK=[
  {id:'more10',name:'Make 10',icon:'🤝',targets:[10],starts:R(2,8),gen:()=>({target:10,start:ri(2,8),unit:1}),demo:()=>({target:10,start:8,unit:1})},
  {id:'more20',name:'Make 20',icon:'🎯',targets:[20],starts:R(11,17),gen:()=>({target:20,start:ri(11,17),unit:1}),demo:()=>({target:20,start:18,unit:1})},
  {id:'by2',name:'Count by 2s',icon:'🍒',targets:R(4,20,2),gen:()=>({target:ri(3,10)*2,start:0,unit:2}),demo:()=>({target:4,start:0,unit:2})},
  {id:'by5',name:'Count by 5s',icon:'🖐️',targets:R(10,40,5),gen:()=>({target:ri(3,8)*5,start:0,unit:5}),demo:()=>({target:10,start:0,unit:5})},
  {id:'by10',name:'Count by 10s',icon:'🔟',targets:R(20,90,10),gen:()=>({target:ri(3,9)*10,start:0,unit:10}),demo:()=>({target:20,start:0,unit:10})},
];
const ROUNDS=6;
const L={
  intro1:['narrator','This is Ember, the baby dragon. Tomorrow is her birthday!'],
  intro2:['dragon',"But I'm too little to light my own birthday candles. My fire only goes poof!"],
  intro3:['narrator','If Ember eats lots of yummy snacks, she will grow big and strong!'],
  intro4:['narrator','Give Ember exactly what she asks for. Not too many, and not too few!'],
  watch:['narrator','Watch me count!'],
  thumbs:['narrator','Then press the thumbs up!'],
  yourTurn:['narrator','Your turn! Tap a snack to feed her, or press Space. Then press thumbs up!'],
  more:['narrator','Wonderful! Ember wants more!'],
  yum1:['dragon','Yum yum! Just right!'],yum2:['dragon','Mmm! Thank you!'],yum3:['dragon','Delicious! I feel bigger already!'],
  spicy:['dragon','Ooh, I feel a sparkle in my tummy!'],
  grow1:['dragon','Look at me! I am a big dragon now!'],
  grow2:['narrator','And just in time for her birthday party!'],
  friends:['kitty','Surprise! Happy birthday, Ember!'],
  friends2:['kitty2','We brought a cake!'],
  friends3:['raccoon','And this time, I did not take it. I promise.'],
  friends4:['unicorn','Make a wish, Ember!'],
  light:['dragon','Here goes. One big breath!'],
  end:['dragon','Thank you for feeding me, friend! This is the best birthday ever!'],
  poof:['dragon','Poof!'],
};
export function lines(){
  const o=[...Object.values(L)];
  for(let n=1;n<=100;n++)o.push(['dragon',n+'!']);
  const targets=new Set(SK.flatMap(s=>s.targets));
  for(const t of targets){o.push(['dragon',`I'm still hungry! I want ${t}.`],['dragon',`Hic! Too many! I wanted ${t}.`],['dragon',`${t}! Just right!`],['narrator',`That's ${t}!`])}
  for(const sk of SK)for(const t of sk.targets){
    if(sk.id.startsWith('more'))for(const s of sk.starts)o.push(['narrator',`Ember already ate ${s}. She wants ${t} in all!`]);
    else o.push(['dragon',`I want ${t} ${PACKS[sk.id==='by2'?2:sk.id==='by5'?5:10].many}!`]);
  }
  for(const p of Object.values(PACKS))o.push(['narrator',p.say]);
  return o;
}
export default {id:'dragon',title:'Feed the Dragon',sub:'Skip count for Ember!',art:'🐲',color:'#22a045',skills:SK,create,lines};

function create(K){
  BEND.value.set(0,0);
  const st=createStage(K.host3d),{scene,camera}=st;
  st.setSky('#6c5ce7','#ff9ec7','#ffd59e','#ffc7d8');scene.fog=new THREE.Fog('#ffc7d8',30,90);
  st.sun.color.set('#ffd2a6');st.sun.position.set(8,6,6);st.hemi.color.set('#ffe6f0');
  const fx=createParticles(scene);
  const skill=SK.find(s=>s.id===K.skill)||SK[0];
  const S={task:null,snacks:[],count:0,lock:true,round:0,mistakes:0,done:false,lastTap:0,grow:1,growTo:1,trick:null,trickT:0,fire:0,rainbow:false,
    hic:0,chew:0,open:0,party:false,cam:{pos:new THREE.Vector3(0,3.2,10.5),look:new THREE.Vector3(0,1.6,0),fov:46},pops:[]};
  const song='dragon';

  // ---------- picnic hill ----------
  const hill=mesh(G.sphere(60,48,24),'#7ccf7c',{ink:0});hill.scale.set(1,.12,1);hill.position.y=-7.2;scene.add(hill);
  const blanketTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');for(let i=0;i<8;i++)for(let j=0;j<8;j++){g.fillStyle=(i+j)%2?'#ff6b81':'#ffffff';g.fillRect(i*32,j*32,32,32)}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  const blanket=new THREE.Mesh(new THREE.PlaneGeometry(5.4,3.6),new THREE.MeshToonMaterial({map:blanketTex}));blanket.rotation.x=-Math.PI/2;blanket.position.set(-2.4,.02,1.2);scene.add(blanket);
  for(const [x,z,n,s] of [[-8,-6,'tree',1.4],[8.5,-7,'tree',1.6],[-11,-12,'pine',1.5],[12,-12,'pine',1.4],[-6,-3,'flower',1],[5.8,2.6,'flower',1],[6.8,1.8,'mushroom',1],[-6.5,2.5,'mushroom',.9],[3,-6,'bush',1.2],[-3.5,-5,'bush',1]]){
    const o=PROPS[n]();o.position.set(x,0,z);o.scale.multiplyScalar(s);scene.add(o)}
  // a string of lanterns
  for(let i=0;i<9;i++){const x=-7+i*1.75,y=5.2-Math.sin(i/8*Math.PI)*.8;const l=mesh(G.sphere(.22,10,8),['#ffd23f','#ff9ec7','#9ad8ff'][i%3],{ink:.01,emissive:.6});l.position.set(x,y,-4.5);scene.add(l)}
  const dragon=makeDragon();dragon.root.position.set(2.4,0,0);dragon.root.rotation.y=-.45;scene.add(dragon.root);
  // party guests, hidden until the end
  const guests=new THREE.Group();guests.visible=false;scene.add(guests);
  const cap=makeKitty(),spk=makeKitty({fur:'#fff4fb',stripe:null,mask:'#ff4f9a',capeColor:'#9b5de5',tiara:true}),rac=makeRaccoon(),uni=makeUnicorn();
  cap.root.position.set(-4.4,0,1.4);spk.root.position.set(-2.8,0,2.6);rac.root.position.set(-5.6,0,1.9);rac.root.rotation.y=.35;uni.root.position.set(-1.4,0,-1.8);uni.root.rotation.y=.5;
  guests.add(cap.root,spk.root,rac.root,uni.root);
  const cake=makeCake({scale:1.3});cake.position.set(-.6,0,1.9);cake.visible=false;scene.add(cake);
  const cakeFlames=[];cake.traverse(o=>{if(o.isMesh&&o.geometry.type==='SphereGeometry'&&o.material.color&&o.material.color.getHexString()==='ffd23f')cakeFlames.push(o)});

  // ---------- snacks ----------
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),v=new THREE.Vector3();
  function layoutSnacks(n,kind){
    for(const s of S.snacks)scene.remove(s.g);S.snacks=[];
    const cols=Math.min(n,4);
    for(let i=0;i<n;i++){
      const g=SNACK3D[kind]();g.scale.setScalar(1.25);
      const x=-3.9+(i%4)*1.05+(Math.floor(i/4)%2)*.5,z=.2+Math.floor(i/4)*.95;g.position.set(x,0,z);g.userData.home=g.position.clone();
      scene.add(g);S.snacks.push({g,st:'plate',t:0,i});
    }
  }
  const screenOf=p=>{v.copy(p).project(camera);return[(v.x+1)/2*K.w,(1-v.y)/2*K.h]};
  const mouth=()=>dragon.jaw.getWorldPosition(new THREE.Vector3());

  // ---------- update ----------
  function update(dt){
    const t=K.t;
    S.grow=damp(S.grow,S.growTo,2,dt);dragon.root.scale.setScalar(S.grow);
    let hop=0,fly=0,spin=0;
    if(S.trick){S.trickT+=dt;const f=Math.min(1,S.trickT/1.8);
      if(S.trick==='hop')hop=Math.abs(Math.sin(f*Math.PI*4))*.6;
      if(S.trick==='fly')fly=Math.sin(f*Math.PI)*2.6;
      if(S.trick==='spin')spin=easeInOut(f)*Math.PI*2;
      if(f>=1)S.trick=null}
    dragon.root.position.y=hop+fly;dragon.root.rotation.y=-.45+spin;
    const flying=S.snacks.find(s=>s.st==='fly');
    S.open=damp(S.open,flying||(!S.done&&S.task&&!S.lock)?.75:0,8,dt);
    dragon.update(dt,t,{talk:K.talk('dragon'),open:S.open,chew:S.chew>0,happy:S.done&&!!S.task||S.party,flap:fly>0?1:S.party?.4:0});
    S.chew=Math.max(0,S.chew-dt);
    // snacks in flight
    for(const s of S.snacks){
      if(s.st==='plate'){s.g.position.y=Math.abs(Math.sin(t*3+s.i))*.06;s.g.rotation.y=Math.sin(t*1.5+s.i)*.3}
      else if(s.st==='fly'){s.t+=dt/.5;const m=mouth(),f=easeInOut(Math.min(1,s.t));s.g.position.lerpVectors(s.from,m,f);s.g.position.y+=Math.sin(f*Math.PI)*2.2;s.g.rotation.x+=dt*10;s.g.scale.setScalar(1.25*(1-f*.6));
        if(s.t>=1){s.st='eaten';s.g.visible=false;eat(m)}}
      else if(s.st==='back'){s.t+=dt/.6;const f=easeOut(Math.min(1,s.t));s.g.position.lerpVectors(s.from,s.g.userData.home,f);s.g.position.y+=Math.sin(f*Math.PI)*2;s.g.scale.setScalar(1.25);if(s.t>=1)s.st='plate'}
    }
    // fire breath: orange, or rainbow sparkles for tricks
    if(S.fire>0){S.fire-=dt;const m=mouth(),dir=new THREE.Vector3(-.65,.12,.75).normalize();
      for(let i=0;i<6;i++){const c=S.rainbow?['#ff3b3b','#ff8c1a','#ffd23f','#22c55e','#3a86ff','#9b5de5'][i]:['#ff7b00','#ffb703','#ff3d00','#ffd166'][i%4];
        fx.add({x:m.x,y:m.y,z:m.z+.2,vx:dir.x*9+(Math.random()-.5)*2,vy:dir.y*9+(Math.random()-.5)*2,vz:dir.z*9+(Math.random()-.5)*2,drag:1.4,life:.7,size:.5,grow:1.4,color:c})}}
    if(Math.random()<dt*3)fx.add({x:(Math.random()-.5)*16,y:.5+Math.random()*3,z:-2+Math.random()*4,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,life:2+Math.random()*2,size:.15,color:'#fff7b0',drag:.2});
    if(S.party){
      for(const [k,i] of [[cap,0],[spk,1]])k.update(dt,t,{talk:K.talk(i?'kitty2':'kitty'),bounce:1.5,cheer:1});
      rac.update(dt,t,{talk:K.talk('raccoon'),mood:'happy'});uni.update(dt,t,{talk:K.talk('unicorn')});
      [cap,spk,rac].forEach((c,i)=>c.root.position.y=Math.abs(Math.sin(t*4+i))*.25);
      if(cake.userData.update)cake.userData.update(t);
      if(S.fireworks&&Math.random()<dt*1.8)firework();
    }
    fx.update(dt,0);
    // camera
    const c=S.cam;
    camera.position.x=damp(camera.position.x,c.pos.x,3,dt);camera.position.y=damp(camera.position.y,c.pos.y,3,dt);camera.position.z=damp(camera.position.z,c.pos.z,3,dt);
    S.lookCur=S.lookCur||c.look.clone();S.lookCur.lerp(c.look,1-Math.exp(-3*dt));camera.lookAt(S.lookCur);
    if(K.shake){camera.position.x+=(Math.random()-.5)*K.shake*.3;camera.position.y+=(Math.random()-.5)*K.shake*.3}
    camera.fov=damp(camera.fov,c.fov,3,dt);camera.updateProjectionMatrix();
  }
  function firework(){
    const x=(Math.random()-.5)*14,y=6+Math.random()*4,z=-8-Math.random()*5,cols=[['#ff3b3b','#ffd23f'],['#3a86ff','#ffffff'],['#22c55e','#ffd23f'],['#ff4f9a','#9b5de5']][Math.floor(Math.random()*4)];
    for(let i=0;i<60;i++){const a=Math.random()*6.28,b=Math.acos(Math.random()*2-1),s=4+Math.random()*2;
      fx.add({x,y,z,vx:Math.cos(a)*Math.sin(b)*s,vy:Math.cos(b)*s,vz:Math.sin(a)*Math.sin(b)*s,g:3,drag:1.2,life:1.4+Math.random()*.6,size:.5,color:cols[i%2]})}
    K.sfx.balloonPop();
  }
  function eat(m){
    S.count+=S.task.unit;S.chew=.45;K.sfx.peep();fx.sparkle(m.x,m.y,m.z,10,2);
    S.pops.push({n:S.count,t:0});
    K.sayNow('dragon',S.count+'!');
  }

  // ---------- 2D layer: wish bubble, counting pops, thumbs up ----------
  const btn=()=>({x:K.w-90,y:K.h-170,r:Math.min(58,K.w*.06)});
  function draw(g,w,h){
    st.render();
    const head=new THREE.Vector3();dragon.head.getWorldPosition(head);const [hx,hy]=screenOf(head);
    if(S.task&&!S.done)wish(g,hx,hy);
    S.pops=S.pops.filter(p=>(p.t+=1/60)<1.2);
    for(const p of S.pops){g.globalAlpha=1-p.t/1.2;colorText(g,String(p.n),hx-110,hy+40-p.t*90,72,{stroke:12});g.globalAlpha=1}
    if(S.task&&!S.done&&!S.lock){const b=btn(),pulse=S.count===S.task.target?1+Math.sin(K.t*6)*.07:1;
      g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.arc(b.x,b.y+7,b.r*pulse,0,7);g.fill();
      g.fillStyle='#22c55e';g.beginPath();g.arc(b.x,b.y,b.r*pulse,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=6;g.stroke();emo(g,'👍',b.x,b.y,b.r*1.1)}
    g.fillStyle='rgba(255,255,255,.75)';rr(g,14,14,ROUNDS*44+16,52,26);g.fill();for(let i=0;i<ROUNDS;i++)emo(g,i<S.round?'🐲':'🥚',38+i*44,40,32);
  }
  function wish(g,hx,hy){
    const T=S.task,n=T.target/T.unit,outline=n<=10;
    const W=Math.max(170,Math.min(n,5)*48+50),H=(outline?Math.ceil(n/5)*48:0)+120,x=hx-W*.75-60,y=hy-H*.55-40;
    g.fillStyle='#fff';for(const [dx,dy,r] of [[-.35,0,.42],[.35,0,.42],[0,-.2,.5],[0,.25,.45]]){g.beginPath();g.ellipse(x+dx*W,y+dy*H,r*W,r*H*.9,0,0,7);g.fill()}
    g.beginPath();g.arc(x+W*.48,y+H*.58,13,0,7);g.fill();g.beginPath();g.arc(x+W*.62,y+H*.78,8,0,7);g.fill();
    colorText(g,String(T.target),x,y-(outline?H*.18:0),70);
    if(outline){const cols=Math.min(n,5),ch={strawberry:'🍓',cookie:'🍪',apple:'🍎',cupcake:'🧁',cherries:'🍒',grapes:'🍇',chocolate:'🍫'}[S.kind];
      for(let i=0;i<n;i++){const cx=x+(i%cols-(cols-1)/2)*46,cy=y+H*.16+Math.floor(i/5)*46;
        if(i<S.count/T.unit)emo(g,ch,cx,cy,36);else{g.strokeStyle='#c9cfdb';g.lineWidth=3;g.setLineDash([5,5]);g.beginPath();g.arc(cx,cy,17,0,7);g.stroke();g.setLineDash([])}}}
  }

  // ---------- gameplay ----------
  function feed(s){
    if(S.lock||S.done||!s||s.st!=='plate')return;
    s.st='fly';s.t=0;s.from=s.g.position.clone();K.sfx.boing();S.lastTap=K.t;
  }
  const nextSnack=()=>S.snacks.find(s=>s.st==='plate');
  let resolveDone=null;
  function thumbs(){if(S.lock||S.done||!S.task||S.snacks.some(s=>s.st==='fly'))return;K.sfx.select();resolveDone&&resolveDone()}
  async function round(task,{demo=false,guided=false}={}){
    const pack=task.unit>1?PACKS[task.unit]:SNACKS[Math.floor(Math.random()*SNACKS.length)];S.kind=pack.k;
    S.task=task;S.count=task.start;S.done=false;
    const more=(task.target-task.start)/task.unit;
    layoutSnacks(Math.min(12,more+ri(2,3)),pack.k);
    S.cam.pos.set(-.6,3.4,10.5);S.cam.look.set(-.6,1.5,0);
    if(task.start)await K.say('narrator',`Ember already ate ${task.start}. She wants ${task.target} in all!`);
    else{await K.say('dragon',`I want ${task.target} ${pack.many}!`);if(pack.say&&(demo||guided||S.round===0))await K.say('narrator',pack.say)}
    if(demo){
      await K.say(...L.watch);
      for(let i=0;i<more;i++){const s=nextSnack();K.hand.on=true;for(let k=0;k<14;k++){const [sx,sy]=screenOf(s.g.position);K.hand.x=l2(K.hand.x,sx,.3);K.hand.y=l2(K.hand.y,sy,.3);await K.wait(.03)}K.hand.tap=1;S.lock=false;feed(s);S.lock=true;await K.wait(1.1)}
      await K.say('narrator',`That's ${task.target}!`);await K.say(...L.thumbs);
      const b=btn();for(let k=0;k<16;k++){K.hand.x=l2(K.hand.x,b.x,.3);K.hand.y=l2(K.hand.y,b.y,.3);await K.wait(.03)}K.hand.tap=1;K.sfx.select();await K.wait(.4);K.hand.on=false;
    }else{
      S.lock=false;S.lastTap=K.t;
      (async()=>{let hinted=false;while(!S.done&&S.task===task){await K.wait(.5);if(guided&&!hinted&&K.t-S.lastTap>5){hinted=true;const s=S.count<task.target?nextSnack():null;const [sx,sy]=s?screenOf(s.g.position):[btn().x,btn().y];K.hand.on=true;K.hand.x=sx;K.hand.y=sy;K.hand.tap=1}}})();
      while(true){
        await new Promise(r=>{resolveDone=r});resolveDone=null;K.hand.on=false;
        if(S.count===task.target)break;
        S.lock=true;
        if(!guided)S.mistakes++;
        if(S.count<task.target)await K.say('dragon',`I'm still hungry! I want ${task.target}.`);
        else{
          K.sfx.boing();K.shake=.3;const m=mouth();fx.puff(m.x,m.y,m.z,8,'#d1d5db',.5);
          const s=[...S.snacks].reverse().find(q=>q.st==='eaten');if(s){s.st='back';s.t=0;s.from=m.clone();s.g.visible=true;S.count-=task.unit}
          await K.say('dragon',`Hic! Too many! I wanted ${task.target}.`);
        }
        S.lock=false;S.lastTap=K.t;
      }
    }
    S.done=true;S.lock=true;
    const m=mouth();fx.confetti(m.x,m.y+1,m.z,70);K.sfx.cheer();
    await K.say(...[L.yum1,L.yum2,L.yum3][Math.floor(Math.random()*3)]);
    if(!demo&&!guided){
      S.round++;S.growTo+=.08;
      const tr=['hop','fly','spin','fire'][S.round%4];
      if(tr==='fire'){S.trick='hop';S.trickT=0;S.fire=1.4;S.rainbow=true;K.sfx.whoosh();await K.say(...L.spicy)}
      else{S.trick=tr;S.trickT=0;K.sfx.boing()}
      await K.wait(1.6);
    }
    S.task=null;
  }
  async function script(){
    S.cam.pos.set(2.4,2.6,6.4);S.cam.look.set(2.4,2.2,0);
    await K.wait(.6);
    K.music.play(song);
    await K.say(...L.intro1);
    S.cam.pos.set(1.6,3,4.6);S.cam.look.set(2,2.6,0);
    await K.say(...L.intro2);
    S.fire=.5;S.rainbow=false;K.sfx.whoosh();await K.wait(.5);await K.say(...L.poof);
    await K.say(...L.intro3);
    await K.say(...L.intro4);
    await round(skill.demo(),{demo:true});
    await K.say(...L.yourTurn);
    await round(skill.gen(),{guided:true});
    await K.say(...L.more);
    let last=0;
    while(S.round<ROUNDS){let tk;do tk=skill.gen();while(tk.target===last&&tk.start===0);last=tk.target;await round(tk)}
    // grown up, and the party arrives
    for(const s of S.snacks)scene.remove(s.g);S.snacks=[];
    S.growTo=1.6;S.trick='fly';S.trickT=0;K.sfx.whoosh();
    S.cam.pos.set(1,4,13);S.cam.look.set(1,2.4,0);
    await K.say(...L.grow1);
    await K.say(...L.grow2);
    guests.visible=true;cake.visible=true;S.party=true;cakeFlames.forEach(f=>f.visible=false);
    K.sfx.cheer();fx.confetti(-2,3,1,120);
    S.cam.pos.set(-2,3.4,10);S.cam.look.set(-2.2,1.4,0);
    await K.say(...L.friends);await K.say(...L.friends2);await K.say(...L.friends3);await K.say(...L.friends4);
    S.cam.pos.set(.4,3.2,7);S.cam.look.set(.2,1.6,1);
    await K.say(...L.light);
    S.fire=1.2;S.rainbow=false;K.sfx.whoosh();await K.wait(1);
    cakeFlames.forEach(f=>f.visible=true);K.music.fanfare();fx.confetti(-.6,2.5,1.9,140);K.showBanner('HAPPY BIRTHDAY!','#ff4f9a');S.fireworks=true;
    S.cam.pos.set(-.5,4.5,13.5);S.cam.look.set(-.5,1.8,0);
    await K.say(...L.end);
    await K.wait(2);
    K.finish(S.mistakes===0?3:S.mistakes<=2?2:1);
  }
  function key(k){
    if(k===' '||k==='ArrowRight'||k==='ArrowUp'){feed(nextSnack());return true}
    if(k==='Enter'){thumbs();return true}
    return k.startsWith('Arrow');
  }
  function tap(x,y){
    const b=btn();if(Math.hypot(x-b.x,y-b.y)<b.r*1.2){thumbs();return}
    ndc.set(x/K.w*2-1,-(y/K.h)*2+1);ray.setFromCamera(ndc,camera);
    const hits=ray.intersectObjects(S.snacks.filter(s=>s.st==='plate').map(s=>s.g),true);
    if(hits.length){let o=hits[0].object;const s=S.snacks.find(q=>{let p=o;while(p){if(p===q.g)return true;p=p.parent}return false});feed(s)}
  }
  function dispose(){st.dispose()}
  return{song,S,three:true,start(){script()},update,draw,key,tap,dispose};
}
