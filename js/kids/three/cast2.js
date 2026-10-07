// More of the cast: the rocket, Stormy, Twinkle the unicorn, Ember the dragon, and snacks.
import {THREE,mesh,G,toon,blob,standee,lerp} from './kit.js';
import {makeKitty,eye,rbox} from './chars.js';

export function makeRocket(){
  const root=new THREE.Group(),ship=new THREE.Group();root.add(ship);
  const pts=[[0,-1.6],[.62,-1.5],[.95,-.8],[1.05,.2],[.92,1.1],[.6,1.9],[.18,2.45],[0,2.6]].map(([x,y])=>new THREE.Vector2(x,y));
  ship.add(mesh(new THREE.LatheGeometry(pts,32),'#f8fafc',{ink:.035}));
  const nose=mesh(new THREE.LatheGeometry([[0,1.55],[.78,1.55],[.6,1.95],[.18,2.47],[0,2.62]].map(([x,y])=>new THREE.Vector2(x,y)),32),'#ff4f6d',{ink:0});nose.scale.setScalar(1.02);ship.add(nose);
  const band=mesh(G.torus(1.02,.08),'#ffd23f',{ink:.01});band.rotation.x=Math.PI/2;band.position.y=-.3;ship.add(band);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;const fin=mesh(rbox(.18,1.3,.9,.08),'#ff4f6d',{ink:.03});
    fin.position.set(Math.sin(a)*.95,-1.1,Math.cos(a)*.95);fin.rotation.y=a;ship.add(fin)}
  const nozzle=mesh(G.cyl(.45,.62,.45,20),'#7b8194',{ink:.02});nozzle.position.y=-1.75;ship.add(nozzle);
  // two portholes, a kitty in each (front faces +z)
  const front=new THREE.Group();ship.add(front);
  const kits=[];
  for(const [y,opts] of [[.9,{}],[-.25,{fur:'#fff4fb',stripe:null,mask:'#ff4f9a',capeColor:'#9b5de5',tiara:true}]]){
    const ring=mesh(G.torus(.5,.1),'#3a86ff',{ink:.012});ring.position.set(0,y,1.0);front.add(ring);
    const back=mesh(G.sphere(.48,20,14),'#1e3a5f',{ink:0,flat:true});back.scale.set(1,1,.2);back.position.set(0,y,.9);front.add(back);
    const k=makeKitty(opts);k.root.scale.setScalar(.6);k.root.position.set(0,y-.72,.72);
    k.body.children.forEach(c=>{if(c!==k.head)c.visible=false});k.root.children.forEach(c=>{if(c!==k.body)c.visible=false});
    front.add(k.root);kits.push(k);
  }
  const flame=new THREE.Group();flame.position.y=-1.95;ship.add(flame);
  const fm=(c,r,h,o)=>{const m=new THREE.Mesh(G.cone(r,h,16),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false}));m.rotation.x=Math.PI;m.position.y=-h/2;flame.add(m);return m};
  fm('#ff6a00',.58,2.4,.75);fm('#ffd23f',.38,1.6,.9);fm('#ffffff',.18,.8,.9);
  return{root,ship,kits,flame,
    update(dt,t,{thrust=1,steer=0,talkA=0,talkB=0}={}){
      ship.rotation.z=lerp(ship.rotation.z,-steer*.3,.12);
      flame.scale.set(1+Math.sin(t*50)*.06,Math.max(.2,thrust)*(1+Math.sin(t*40)*.14),1+Math.sin(t*45)*.06);
      kits[0].update(dt,t,{talk:talkA,bounce:.3});kits[1].update(dt,t,{talk:talkB,bounce:.3});
    }};
}

// a grumpy storm cloud with a face
export function makeStorm(){
  const root=new THREE.Group(),puff=new THREE.Group();root.add(puff);
  const cols=['#59617a','#6b7490'];
  const balls=[];
  for(const [x,y,z,r] of [[0,0,0,2.4],[-2.4,-.3,.2,1.9],[2.4,-.2,.1,2],[-1.2,1.3,.3,1.6],[1.3,1.2,.2,1.7],[-3.8,-.6,-.2,1.3],[3.9,-.5,-.2,1.4],[0,-.9,.6,1.8]]){
    const s=mesh(G.sphere(r,20,14),cols[balls.length%2],{ink:.04});s.position.set(x,y,z);puff.add(s);balls.push(s)}
  const face=new THREE.Group();face.position.set(0,.1,2.3);puff.add(face);
  const pupils=[],brows=[];
  for(const sd of [-1,1]){const w=mesh(G.sphere(.45,16,12),'#ffffff',{ink:.02});w.position.set(sd*.75,0,0);w.scale.set(1,1.15,.5);face.add(w);
    const pu=mesh(G.sphere(.22,12,10),'#1b1424',{ink:0,flat:true});pu.position.set(0,-.05,.22);w.add(pu);pupils.push(pu);
    const br=mesh(G.box(.95,.2,.2),'#2b2f3d',{ink:0});br.position.set(sd*.75,.62,.15);face.add(br);brows.push(br)}
  const mouth=mesh(G.torus(.42,.1,Math.PI),'#1b1424',{ink:0,flat:true});mouth.position.set(0,-.8,.1);face.add(mouth);
  const bolts=[];
  for(let i=0;i<2;i++){const pts=[];let x=0,y=0;for(let k=0;k<6;k++){pts.push(new THREE.Vector3(x,y,0));x+=(k%2?-.6:.6);y-=.75}
    const b=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0),24,.1,6),new THREE.MeshBasicMaterial({color:'#fff36b'}));
    b.position.set(i?2.2:-2.2,-1.9,1.2);b.visible=false;puff.add(b);bolts.push(b)}
  return{root,puff,bolts,
    update(dt,t,{talk=0,mood='grumpy',look=0}={}){
      balls.forEach((c,i)=>c.scale.setScalar(1+Math.sin(t*2+i)*.035));
      pupils.forEach(p=>p.position.x=look*.15);
      const happy=mood==='happy';
      brows.forEach((b,i)=>{b.rotation.z=lerp(b.rotation.z,(i?1:-1)*(happy?-.15:.35),.15)});
      mouth.rotation.z=happy?Math.PI:0;mouth.position.y=happy?-.45:-.8;mouth.scale.y=1+talk*.9;
      bolts.forEach((b,i)=>b.visible=!happy&&Math.sin(t*9+i*3)>.92);
    }};
}

export function makeUnicorn(){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const white='#fffafc';
  const torso=mesh(G.capsule(.42,.7),white);torso.rotation.z=Math.PI/2;torso.position.y=.95;body.add(torso);
  for(const [x,z] of [[-.4,.22],[-.4,-.22],[.4,.22],[.4,-.22]]){const l=mesh(G.capsule(.11,.45),white);l.position.set(x,.38,z);body.add(l);const h=mesh(G.cyl(.12,.13,.12,10),'#b8a2ff',{ink:.01});h.position.set(x,.08,z);body.add(h)}
  const head=new THREE.Group();head.position.set(.55,1.65,0);body.add(head);
  const sk=mesh(G.sphere(.42,24,16),white);head.add(sk);
  const snout=mesh(G.sphere(.28,16,12),'#ffe6f2');snout.position.set(.1,-.18,.3);snout.scale.set(.95,.8,1.1);head.add(snout);
  const eyes=[eye(-.16,.06,.35,1.1),eye(.16,.06,.35,1.1)];eyes.forEach(e=>head.add(e));
  const horn=mesh(G.cone(.09,.6,14),'#ffd23f',{ink:.012,emissive:.35});horn.position.set(0,.55,.12);horn.rotation.x=.25;head.add(horn);
  for(const sd of [-1,1]){const ear=mesh(G.cone(.09,.24,10),white);ear.position.set(sd*.24,.38,-.05);ear.rotation.z=-sd*.3;head.add(ear)}
  const mane=['#ff5fa2','#ffd23f','#22c55e','#3a86ff','#9b5de5'];
  mane.forEach((c,i)=>{const m=mesh(G.sphere(.17,12,10),c,{ink:.01});m.position.set(0,.3-i*.17,-.32-i*.03);head.add(m)});
  const tail=new THREE.Group();tail.position.set(-.85,1.05,0);body.add(tail);mane.forEach((c,i)=>{const m=mesh(G.sphere(.16,10,8),c,{ink:.01});m.position.set(-i*.08,-i*.14,0);tail.add(m)});
  head.rotation.y=-.9; // looks toward the viewer
  root.add(blob(.8));
  const S={blink:2};
  return{root,head,update(dt,t,{talk=0}={}){
    S.blink-=dt;if(S.blink<-.12)S.blink=2+Math.random()*3;eyes.forEach(e=>e.scale.y=S.blink<0?.1:1);
    head.rotation.z=Math.sin(t*1.6)*.08+talk*Math.sin(t*12)*.06;tail.rotation.x=Math.sin(t*3)*.4;body.position.y=Math.abs(Math.sin(t*2))*.05}};
}

export function makeDragon(){
  const root=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group();root.add(body);
  const green='#4fc46a',light='#c9f7a8',dark='#2f9e4f',wingC='#a78bfa';
  const torso=mesh(G.sphere(.85,28,20),green);torso.scale.set(1,1.12,.9);torso.position.y=1;body.add(torso);
  const belly=mesh(G.sphere(.62,24,16),light,{ink:0});belly.scale.set(.95,1.15,.55);belly.position.set(0,.92,.42);body.add(belly);
  for(let i=0;i<4;i++){const s=mesh(G.torus(.42-Math.abs(i-1.5)*.06,.025,Math.PI),'#a6e38a',{ink:0});s.rotation.z=Math.PI;s.position.set(0,1.35-i*.25,.68);s.scale.z=.4;body.add(s)}
  for(const sd of [-1,1]){const f=mesh(G.sphere(.32,16,12),dark);f.position.set(sd*.45,.18,.25);f.scale.set(1,.55,1.3);body.add(f);
    const a=mesh(G.capsule(.13,.3),green);a.position.set(sd*.72,1.15,.35);a.rotation.set(-.8,0,sd*.6);body.add(a)}
  const wings=[];
  for(const sd of [-1,1]){const w=new THREE.Group();w.position.set(sd*.55,1.55,-.45);body.add(w);
    const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.9,1.2,1.6,.9);shape.quadraticCurveTo(1.15,.6,1.25,.2);shape.quadraticCurveTo(.8,.35,.75,-.1);shape.quadraticCurveTo(.4,.1,0,0);
    const m=mesh(new THREE.ExtrudeGeometry(shape,{depth:.05,bevelEnabled:false}),wingC,{ink:.02});m.scale.set(sd,1,1);w.add(m);wings.push(w)}
  const tail=new THREE.Group();tail.position.set(0,.5,-.7);body.add(tail);
  const tc=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.3,-.2,-.6),new THREE.Vector3(.9,0,-.9),new THREE.Vector3(1.3,.5,-.8)]);
  tail.add(mesh(new THREE.TubeGeometry(tc,20,.16,10),green));const tip=mesh(G.cone(.22,.4,4),'#ffb703',{ink:.02});tip.position.set(1.35,.65,-.78);tip.rotation.z=-.6;tail.add(tip);
  head.position.set(0,2.3,.15);body.add(head);
  const sk=mesh(G.sphere(.72,28,20),green);sk.scale.set(1.08,.95,.95);head.add(sk);
  const snout=mesh(G.sphere(.48,24,16),light);snout.position.set(0,-.25,.45);snout.scale.set(1.1,.72,.75);head.add(snout);
  for(const sd of [-1,1]){const n=mesh(G.sphere(.05,8,6),dark,{ink:0});n.position.set(sd*.15,-.13,.95);head.add(n)}
  for(const sd of [-1,1]){const h=mesh(G.cone(.13,.45,10),'#ffd166',{ink:.015});h.position.set(sd*.38,.68,-.05);h.rotation.z=-sd*.35;head.add(h)}
  for(let i=0;i<4;i++){const s=mesh(G.cone(.1,.22,4),'#ffb703',{ink:.01});s.position.set(0,.55-i*.28,-.62-i*.08);s.rotation.x=-.9-i*.15;head.add(s)}
  const eyes=[eye(-.3,.14,.6,1.45),eye(.3,.14,.6,1.45)];eyes.forEach(e=>head.add(e));
  for(const sd of [-1,1]){const c=mesh(G.sphere(.11,10,8),'#ff9db8',{ink:0,flat:true});c.position.set(sd*.5,-.12,.52);c.scale.set(1,.6,.35);head.add(c)}
  const jaw=new THREE.Group();jaw.position.set(0,-.4,.66);head.add(jaw);
  const mouthIn=mesh(G.sphere(.26,16,12),'#7a1f3d',{ink:0,flat:true});mouthIn.scale.set(1.2,.2,.6);jaw.add(mouthIn);
  const tongue=mesh(G.sphere(.15,12,10),'#ff7aa8',{ink:0,flat:true});tongue.position.set(0,-.03,.06);tongue.scale.set(1,.3,.8);jaw.add(tongue);
  root.add(blob(1.1));
  const S={blink:2,talk:0};
  return{root,body,head,wings,eyes,jaw,
    update(dt,t,{talk=0,open=0,chew=0,happy=false,flap=0}={}){
      S.blink-=dt;if(S.blink<-.12)S.blink=1.8+Math.random()*3;
      eyes.forEach(e=>e.scale.y=lerp(e.scale.y,happy?.25:S.blink<0?.1:1,.4));
      S.talk=lerp(S.talk,Math.max(talk,open),.35);
      const o=Math.max(S.talk,chew?Math.abs(Math.sin(t*16))*.6:0);mouthIn.scale.y=.12+o*1.1;tongue.position.y=-.03-o*.08;
      wings.forEach((w,i)=>w.rotation.y=(i?-1:1)*(.3+Math.sin(t*(3+flap*9))*(.25+flap*.5)));
      tail.rotation.y=Math.sin(t*2.2)*.35;
      head.rotation.z=Math.sin(t*1.4)*.06;head.rotation.x=-S.talk*.12;
      body.position.y=Math.abs(Math.sin(t*2.4))*.05;
    }};
}
export const SNACK3D={
  strawberry(){const g=new THREE.Group();const b=mesh(G.cone(.28,.5,14),'#ff3b3b',{ink:.015});b.rotation.x=Math.PI;b.position.y=.25;g.add(b);const t=mesh(G.sphere(.28,14,10),'#ff3b3b',{ink:0});t.scale.set(1,.5,1);t.position.y=.48;g.add(t);
    for(let i=0;i<5;i++){const l=mesh(G.cone(.08,.22,4),'#22c55e',{ink:0});const a=i/5*6.28;l.position.set(Math.cos(a)*.12,.6,Math.sin(a)*.12);l.rotation.set(Math.sin(a)*1.4,0,-Math.cos(a)*1.4);g.add(l)}return g},
  cookie(){const g=new THREE.Group();const c=mesh(G.cyl(.32,.32,.1,20),'#d9a066',{ink:.015});c.rotation.x=Math.PI/2;c.position.y=.32;g.add(c);
    for(let i=0;i<5;i++){const d=mesh(G.sphere(.05,8,6),'#5b3a1a',{ink:0});const a=i*1.3;d.position.set(Math.cos(a)*.17,.32+Math.sin(a)*.17,.06);g.add(d)}return g},
  apple(){const g=new THREE.Group();const a=mesh(G.sphere(.3,16,12),'#ff4d4d',{ink:.015});a.position.y=.3;a.scale.set(1,.92,1);g.add(a);const s=mesh(G.cyl(.02,.02,.15,5),'#6b4423',{ink:0});s.position.y=.62;g.add(s);const l=mesh(G.sphere(.08,8,6),'#22c55e',{ink:0});l.position.set(.08,.64,0);l.scale.set(1.4,.5,.8);g.add(l);return g},
  cupcake(){const g=new THREE.Group();const w=mesh(G.cyl(.28,.2,.3,14),'#3a86ff',{ink:.015});w.position.y=.15;g.add(w);const f=mesh(G.sphere(.3,14,10),'#ffd1e8',{ink:.015});f.position.y=.42;f.scale.set(1,.75,1);g.add(f);const c=mesh(G.sphere(.07,8,6),'#ff3b3b',{ink:0});c.position.y=.66;g.add(c);return g},
  cherries(){const g=new THREE.Group();for(const sd of [-1,1]){const c=mesh(G.sphere(.2,14,10),'#d90429',{ink:.015});c.position.set(sd*.18,.2,0);g.add(c);
    const s=mesh(G.cyl(.015,.015,.5,5),'#3a7d2c',{ink:0});s.position.set(sd*.09,.45,0);s.rotation.z=sd*.4;g.add(s)}return g},
  grapes(){const g=new THREE.Group();let k=0;for(let r=0;r<3;r++)for(let i=0;i<3-r&&k<5;i++,k++){const c=mesh(G.sphere(.15,12,8),'#8e44ad',{ink:.012});c.position.set((i-(2-r)/2)*.26,.55-r*.22,0);g.add(c)}
    const s=mesh(G.cyl(.02,.02,.2,5),'#6b4423',{ink:0});s.position.y=.75;g.add(s);return g},
  chocolate(){const g=new THREE.Group();const b=mesh(rbox(.5,.8,.1,.03),'#6b3a1e',{ink:.015});b.position.y=.42;g.add(b);
    for(let i=0;i<10;i++){const s=mesh(G.box(.2,.13,.04),'#7d4524',{ink:0});s.position.set(((i%2)-.5)*.23,.13+Math.floor(i/2)*.145,.06);g.add(s)}return g},
};
