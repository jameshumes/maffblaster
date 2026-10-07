// The cast, built from simple shapes with toon shading and ink outlines.
// Each character returns {root, ...parts, update(dt, t, {talk, mood, look})}.
import {THREE,mesh,G,toon,blob,standee,lerp} from './kit.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const INK='#2a1f3d';
export const rbox=(w,h,d,r=.12)=>new RoundedBoxGeometry(w,h,d,3,r);

// big glossy cartoon eyes with two highlights; returns the group so it can blink
export function eye(x,y,z,s=1){
  const g=new THREE.Group();g.position.set(x,y,z);
  const e=mesh(G.sphere(.13*s,20,16),'#231a33',{ink:0,flat:true});e.scale.set(.82,1.12,.5);g.add(e);
  const h1=mesh(G.sphere(.045*s,10,8),'#ffffff',{ink:0,flat:true});h1.position.set(.035*s,.055*s,.06*s);g.add(h1);
  const h2=mesh(G.sphere(.02*s,8,6),'#ffffff',{ink:0,flat:true});h2.position.set(-.03*s,-.045*s,.06*s);g.add(h2);
  return g;
}
// soft cartoon mouth that opens with the voice
function mouthPiece(y,z,w=.07){
  const m=mesh(G.sphere(w,16,10),'#5a1630',{ink:0,flat:true});m.position.set(0,y,z);m.scale.set(1.2,.25,.5);
  const tongue=mesh(G.sphere(w*.6,10,8),'#ff7aa8',{ink:0,flat:true});tongue.position.set(0,-w*.35,w*.2);m.add(tongue);
  return m;
}
// a fluttering cape: a plane whose vertices wave in the wind
function cape(color,w=.78,h=.95){
  const geo=new THREE.PlaneGeometry(w,h,6,10);geo.translate(0,-h/2,0);
  const base=geo.attributes.position.array.slice();
  const m=new THREE.Mesh(geo,toon(color));m.material.side=THREE.DoubleSide;
  m.userData.wave=(t,wind)=>{
    const p=geo.attributes.position.array;
    for(let i=0;i<p.length;i+=3){const x=base[i],y=base[i+1],d=-y/h;
      p[i]=x*(1+d*.35);p[i+2]=base[i+2]-d*(.25+wind*.55)-Math.sin(t*9+d*4+x*3)*d*(.05+wind*.12);p[i+1]=y+d*d*wind*.18}
    geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
  };
  return m;
}

export function makeKitty({fur='#ffa040',stripe='#e0701c',inner='#ffb3c7',mask='#3a86ff',capeColor='#ff3b3b',tiara=false,belly='#fff6ea'}={}){
  const root=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group();
  root.add(body);body.add(head);head.position.y=1.15;
  const skull=mesh(G.sphere(.55,32,24),fur);skull.scale.set(1.08,.94,.95);head.add(skull);
  if(stripe)for(const [x,r] of [[-.13,.25],[0,0],[.13,-.25]]){const s=mesh(G.capsule(.035,.16),stripe,{ink:0});s.position.set(x,.43,.24);s.rotation.set(-.6,0,r);head.add(s)}
  const ears=[];
  for(const sd of [-1,1]){
    const ear=new THREE.Group();ear.position.set(sd*.33,.38,0);ear.rotation.z=-sd*.42;head.add(ear);
    const o=mesh(G.cone(.18,.36,18),fur);o.position.y=.12;ear.add(o);
    const i=mesh(G.cone(.1,.22,14),inner,{ink:0});i.position.set(0,.09,.07);i.rotation.x=-.12;ear.add(i);
    ears.push(ear);
  }
  // super-hero domino mask
  if(mask){
    for(const sd of [-1,1]){const p=mesh(G.sphere(.2,20,14),mask,{ink:.014});p.position.set(sd*.21,.05,.44);p.scale.set(1.18,.9,.38);p.rotation.z=sd*.18;head.add(p)}
    const br=mesh(G.sphere(.08,12,8),mask,{ink:0});br.position.set(0,.07,.53);br.scale.set(1.4,.6,.5);head.add(br);
  }
  const eyes=[eye(-.21,.05,.5),eye(.21,.05,.5)];eyes.forEach(e=>head.add(e));
  for(const sd of [-1,1]){const c=mesh(G.sphere(.11,16,12),belly,{ink:.012});c.position.set(sd*.09,-.17,.47);c.scale.set(1,.78,.7);head.add(c)}
  const nose=mesh(G.sphere(.05,12,10),'#ff7aa8',{ink:.01});nose.position.set(0,-.09,.55);nose.scale.set(1.3,.9,.8);head.add(nose);
  const mouth=mouthPiece(-.25,.5);head.add(mouth);
  for(const sd of [-1,1])for(const k of [-1,0,1]){const w=mesh(G.cyl(.007,.007,.34,5),INK,{ink:0,flat:true});w.position.set(sd*.33,-.16+k*.05,.43);w.rotation.z=Math.PI/2+k*.18*sd;head.add(w)}
  for(const sd of [-1,1]){const blush=mesh(G.sphere(.06,10,8),'#ff9db8',{ink:0,flat:true});blush.position.set(sd*.33,-.1,.42);blush.scale.set(1,.55,.3);head.add(blush)}
  if(tiara){const t=new THREE.Group();t.position.set(0,.5,.12);t.rotation.x=-.25;head.add(t);
    const band=mesh(G.torus(.2,.025,Math.PI),'#ffd23f',{ink:.01});band.rotation.z=0;t.add(band);
    const star=mesh(new THREE.OctahedronGeometry(.09),'#ffd23f',{ink:.01,emissive:.3});star.position.y=.22;star.scale.set(1,1.2,.5);t.add(star)}
  // body
  const torso=mesh(G.capsule(.3,.28),fur);torso.position.y=.52;body.add(torso);
  const tum=mesh(G.sphere(.24,16,12),belly,{ink:0});tum.position.set(0,.45,.17);tum.scale.set(1,1.1,.6);body.add(tum);
  const arms=[];
  for(const sd of [-1,1]){const a=new THREE.Group();a.position.set(sd*.3,.72,0);body.add(a);const arm=mesh(G.capsule(.09,.22),fur);arm.position.y=-.18;a.add(arm);a.rotation.z=sd*.35;arms.push(a);
    const paw=mesh(G.sphere(.1,12,10),belly,{ink:.01});paw.position.y=-.36;a.add(paw)}
  for(const sd of [-1,1]){const f=mesh(G.sphere(.13,14,10),belly);f.position.set(sd*.16,.1,.08);f.scale.set(1,.7,1.3);body.add(f)}
  const tail=new THREE.Group();tail.position.set(0,.35,-.25);body.add(tail);
  const tcurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.1,.2,-.25),new THREE.Vector3(.25,.55,-.3),new THREE.Vector3(.2,.8,-.15)]);
  tail.add(mesh(new THREE.TubeGeometry(tcurve,16,.065,8),fur));
  const cp=cape(capeColor);cp.position.set(0,.88,-.3);body.add(cp);
  root.add(blob(.55));
  const S={blink:2,talk:0};
  return{root,body,head,eyes,mouth,ears,arms,tail,cape:cp,
    update(dt,t,{talk=0,mood='happy',wind=.2,bounce=1,cheer=0}={}){
      S.blink-=dt;if(S.blink<-.12)S.blink=1.5+Math.random()*3;
      const bl=S.blink<0?.1:1;eyes.forEach(e=>{e.scale.y=lerp(e.scale.y,mood==='squint'?.25:bl,.5)});
      S.talk=lerp(S.talk,talk,.5);mouth.scale.y=.25+S.talk*1.2;mouth.scale.x=1.2-S.talk*.3;
      head.rotation.z=Math.sin(t*1.7)*.05*bounce+S.talk*Math.sin(t*14)*.04;
      head.rotation.x=-S.talk*Math.sin(t*11)*.05;
      ears.forEach((e,i)=>e.rotation.x=Math.max(0,Math.sin(t*3+i*2))**8*.4);
      tail.rotation.y=Math.sin(t*3)*.5;tail.rotation.z=Math.sin(t*2.1)*.2;
      body.position.y=Math.abs(Math.sin(t*2.6))*.04*bounce;
      cp.userData.wave(t,wind);
      arms.forEach((a,i)=>{const sd=i?1:-1;a.rotation.z=lerp(a.rotation.z,sd*(.35+cheer*2.4+(cheer?Math.sin(t*14+i)*.25:0)),.25)});
    }};
}

export function makeRaccoon(){
  const root=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group();
  root.add(body);body.add(head);head.position.y=1.15;
  const grey='#8e96a6',dark='#3a3f4c',white='#f4f4f6';
  const skull=mesh(G.sphere(.55,32,24),grey);skull.scale.set(1.14,.92,.95);head.add(skull);
  const face=mesh(G.sphere(.42,24,16),white,{ink:0});face.position.set(0,-.14,.2);face.scale.set(1.15,.75,.85);head.add(face);
  for(const sd of [-1,1]){const m=mesh(G.sphere(.22,20,14),dark,{ink:0});m.position.set(sd*.22,.05,.4);m.scale.set(1.25,.85,.45);m.rotation.z=sd*-.35;head.add(m);
    const brw=mesh(G.sphere(.12,14,10),white,{ink:0});brw.position.set(sd*.2,.27,.43);brw.scale.set(1.3,.45,.4);brw.rotation.z=sd*-.2;head.add(brw);
    const fl=mesh(G.cone(.11,.24,10),white,{ink:.01});fl.position.set(sd*.58,-.2,.12);fl.rotation.z=sd*2.2;head.add(fl)}
  const bridge=mesh(G.sphere(.1,12,8),dark,{ink:0});bridge.position.set(0,.04,.52);bridge.scale.set(1.2,.6,.5);head.add(bridge);
  const eyes=[];
  for(const sd of [-1,1]){
    const g=new THREE.Group();g.position.set(sd*.22,.06,.5);head.add(g);
    const sc=mesh(G.sphere(.11,16,12),'#ffffff',{ink:.01});sc.scale.set(1,1,.5);g.add(sc);
    const pu=mesh(G.sphere(.06,12,10),'#1b1424',{ink:0,flat:true});pu.position.set(0,-.01,.05);g.add(pu);
    const hl=mesh(G.sphere(.02,8,6),'#ffffff',{ink:0,flat:true});hl.position.set(.02,.02,.08);g.add(hl);
    eyes.push(g);
  }
  const brows=[];
  for(const sd of [-1,1]){const b=mesh(G.box(.22,.055,.05),'#20232b',{ink:0});b.position.set(sd*.21,.24,.53);head.add(b);brows.push(b)}
  const snout=mesh(G.cone(.17,.34,16),white);snout.position.set(0,-.12,.6);snout.rotation.x=Math.PI/2;snout.scale.set(1.15,1,.85);head.add(snout);
  const nose=mesh(G.sphere(.07,12,10),'#1b1424',{ink:0});nose.position.set(0,-.1,.77);nose.scale.set(1.3,.9,.9);head.add(nose);
  const mouth=mouthPiece(-.26,.52,.065);head.add(mouth);
  const ears=[];
  for(const sd of [-1,1]){const e=mesh(G.cone(.2,.34,14),grey);e.position.set(sd*.36,.48,-.02);e.rotation.z=-sd*.35;e.scale.set(1,1,.45);head.add(e);
    const i=mesh(G.cone(.11,.2,10),white,{ink:0});i.position.set(0,-.03,.12);e.add(i);ears.push(e)}
  const torso=mesh(G.capsule(.33,.28),grey);torso.position.y=.52;body.add(torso);
  const tum=mesh(G.sphere(.26,16,12),white,{ink:0});tum.position.set(0,.45,.19);tum.scale.set(1,1.1,.6);body.add(tum);
  const arms=[];
  for(const sd of [-1,1]){const a=new THREE.Group();a.position.set(sd*.33,.74,0);body.add(a);const arm=mesh(G.capsule(.09,.22),grey);arm.position.y=-.18;a.add(arm);a.rotation.z=sd*.4;arms.push(a);
    const paw=mesh(G.sphere(.1,12,10),dark,{ink:.01});paw.position.y=-.36;a.add(paw)}
  for(const sd of [-1,1]){const f=mesh(G.sphere(.13,14,10),dark);f.position.set(sd*.17,.1,.08);f.scale.set(1,.7,1.3);body.add(f)}
  // ringed tail
  const tail=new THREE.Group();tail.position.set(0,.35,-.3);body.add(tail);
  for(let i=0;i<6;i++){const r=mesh(G.sphere(.16-i*.008,14,10),i%2?dark:grey,{ink:.012});r.position.set(Math.sin(i*.5)*.1,.06+i*.15,-.12-i*.08);r.scale.set(1,.85,1);tail.add(r)}
  // dizzy stars for the finale
  const stars=new THREE.Group();stars.visible=false;stars.position.y=1.85;root.add(stars);
  for(let i=0;i<5;i++){const s=standee('⭐',.3);s.position.set(Math.cos(i/5*6.28)*.55,0,Math.sin(i/5*6.28)*.55);stars.add(s)}
  root.add(blob(.6));
  const S={blink:2,talk:0};
  return{root,body,head,eyes,mouth,brows,arms,tail,stars,
    update(dt,t,{talk=0,mood='grumpy'}={}){
      S.blink-=dt;if(S.blink<-.12)S.blink=1.5+Math.random()*3;
      eyes.forEach(e=>e.scale.y=lerp(e.scale.y,S.blink<0?.1:mood==='dizzy'?.6:1,.5));
      S.talk=lerp(S.talk,talk,.5);mouth.scale.y=.25+S.talk*1.3;
      const ang=mood==='grumpy'?.35:mood==='sad'?-.35:mood==='happy'?-.15:0;
      brows.forEach((b,i)=>{b.rotation.z=lerp(b.rotation.z,(i?-1:1)*ang,.2);b.position.y=lerp(b.position.y,mood==='happy'?.29:.24,.2)});
      head.rotation.z=Math.sin(t*1.5)*.05+S.talk*Math.sin(t*12)*.05;
      tail.rotation.y=Math.sin(t*2.5)*.4;
      stars.visible=mood==='dizzy';stars.rotation.y=t*3;
    }};
}

// ---------- vehicles ----------
export function makeKart(){
  const root=new THREE.Group(),car=new THREE.Group();root.add(car);
  const red='#ff4f6d';
  const bodyM=mesh(rbox(1.9,.55,2.7,.22),red,{ink:.03});bodyM.position.y=.6;car.add(bodyM);
  const nose=mesh(rbox(1.3,.42,1.1,.18),red,{ink:.03});nose.position.set(0,.55,-1.55);car.add(nose);
  const stripe=mesh(G.box(.36,.02,3.6),'#ffffff',{ink:0});stripe.position.set(0,.89,-.4);car.add(stripe);
  const bumper=mesh(rbox(1.5,.22,.3,.1),'#ffd23f',{ink:.02});bumper.position.set(0,.42,-2.15);car.add(bumper);
  const seat=mesh(rbox(1.6,.4,.6,.15),'#3a3f5c',{ink:.02});seat.position.set(0,.95,.75);car.add(seat);
  const spoiler=mesh(rbox(2.1,.12,.45,.05),'#2b2d42',{ink:.02});spoiler.position.set(0,1.02,1.5);car.add(spoiler);
  for(const sd of [-1,1]){const p=mesh(G.box(.08,.2,.1),'#2b2d42',{ink:0});p.position.set(sd*.7,.9,1.5);car.add(p)}
  const wheel=mesh(G.torus(.5,.2),'#ffffff',{ink:0});wheel.position.set(-.42,1.25,-.35);wheel.scale.setScalar(.45);wheel.rotation.x=-.5;car.add(wheel);
  const wheels=[];
  for(const [x,z] of [[-1.05,-1.1],[1.05,-1.1],[-1.05,.95],[1.05,.95]]){
    const w=new THREE.Group();w.position.set(x,.42,z);car.add(w);
    const tire=mesh(G.cyl(.42,.42,.38,20),'#262632',{ink:.025});tire.rotation.z=Math.PI/2;w.add(tire);
    const cap=mesh(G.cyl(.2,.2,.4,14),'#ffd23f',{ink:0});cap.rotation.z=Math.PI/2;w.add(cap);
    const spoke=mesh(G.box(.42,.08,.5),'#ffd23f',{ink:0});w.add(spoke);
    wheels.push(w);
  }
  const flames=[];
  for(const sd of [-1,1]){const pipe=mesh(G.cyl(.1,.12,.4,12),'#a0a6b8',{ink:.015});pipe.rotation.x=Math.PI/2;pipe.position.set(sd*.5,.5,1.45);car.add(pipe);
    const f=new THREE.Mesh(G.cone(.16,.8,12),new THREE.MeshBasicMaterial({color:'#ffb000',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    f.rotation.x=Math.PI/2;f.position.set(sd*.5,.5,2.0);f.visible=false;car.add(f);flames.push(f)}
  root.add(blob(1.6));
  const seats=[new THREE.Vector3(-.45,.82,.3),new THREE.Vector3(.45,.82,.3)];
  return{root,car,wheels,flames,seats,
    update(dt,t,{speed=0,steer=0,boost=0}={}){
      wheels.forEach(w=>w.rotation.x-=speed*dt*2.2);
      wheels[0].rotation.y=wheels[1].rotation.y=-steer*.4;
      car.rotation.z=lerp(car.rotation.z,steer*.08,.2);car.rotation.y=lerp(car.rotation.y,-steer*.12,.2);
      car.position.y=Math.sin(t*30)*.012*Math.min(1,speed/10);
      flames.forEach(f=>{f.visible=boost>0;f.scale.set(1,1+boost*1.6+Math.random()*.4,1);f.position.z=2+boost*.6})
    }};
}

export function makeCake({scale=1}={}){
  const g=new THREE.Group();
  const l1=mesh(G.cyl(.62,.66,.42,32),'#ffb3d1');l1.position.y=.21;g.add(l1);
  const d1=mesh(G.torus(.62,.07),'#ffffff',{ink:.01});d1.rotation.x=Math.PI/2;d1.position.y=.42;g.add(d1);
  const l2=mesh(G.cyl(.45,.48,.36,32),'#fff1c4');l2.position.y=.6;g.add(l2);
  const d2=mesh(G.torus(.45,.06),'#ff8fb8',{ink:.01});d2.rotation.x=Math.PI/2;d2.position.y=.78;g.add(d2);
  const flames=[];
  ['#3a86ff','#22c55e','#ff8c1a','#9b5de5','#ff3b3b'].forEach((c,i)=>{const a=i/5*6.28,x=Math.cos(a)*.26,z=Math.sin(a)*.26;
    const cd=mesh(G.cyl(.035,.035,.26,8),c,{ink:.006});cd.position.set(x,.92,z);g.add(cd);
    const f=mesh(G.sphere(.06,10,8),'#ffd23f',{ink:0,flat:true});f.scale.set(.8,1.4,.8);f.position.set(x,1.1,z);g.add(f);flames.push(f)});
  const berry=mesh(G.sphere(.1,12,10),'#ff3b3b',{ink:.01});berry.position.y=.86;g.add(berry);
  g.scale.setScalar(scale);
  g.userData.update=t=>flames.forEach((f,i)=>{f.scale.y=1.2+Math.sin(t*18+i*2)*.3});
  return g;
}

export function makeVan(){
  const root=new THREE.Group(),car=new THREE.Group();root.add(car);
  const purple='#8a5cf6';
  const b=mesh(rbox(2.3,1.7,3.6,.32),purple,{ink:.035});b.position.y=1.35;car.add(b);
  const hood=mesh(rbox(2.2,.9,1.1,.25),purple,{ink:.03});hood.position.set(0,.95,-2.1);car.add(hood);
  const stripe=mesh(G.box(2.34,.18,3.62),'#ffd23f',{ink:0});stripe.position.set(0,1.0,0);car.add(stripe);
  const glass='#bfe9ff';
  const ws=mesh(G.box(1.9,.7,.05),glass,{ink:0,flat:true});ws.position.set(0,1.75,-1.82);ws.rotation.x=-.25;car.add(ws);
  for(const sd of [-1,1]){const sw=mesh(G.box(.05,.6,1.6),glass,{ink:0,flat:true});sw.position.set(sd*1.16,1.75,-.2);car.add(sw)}
  const rw=mesh(G.box(1.6,.75,.05),glass,{ink:0,flat:true});rw.position.set(0,1.75,1.81);car.add(rw);
  for(const sd of [-1,1]){const tl=mesh(G.box(.3,.22,.06),'#ff3b3b',{ink:0,emissive:.6});tl.position.set(sd*.85,1.0,1.81);car.add(tl)}
  const wheels=[];
  for(const [x,z] of [[-1.05,-1.35],[1.05,-1.35],[-1.05,1.2],[1.05,1.2]]){
    const w=new THREE.Group();w.position.set(x,.48,z);car.add(w);
    const tire=mesh(G.cyl(.48,.48,.4,20),'#262632',{ink:.025});tire.rotation.z=Math.PI/2;w.add(tire);
    const cap=mesh(G.cyl(.22,.22,.42,12),'#d6d9e3',{ink:0});cap.rotation.z=Math.PI/2;w.add(cap);wheels.push(w)}
  // the raccoon peeks out of the back window, cake on the roof
  const rac=makeRaccoon();rac.root.position.set(0,.55,1.25);rac.root.rotation.y=0;rac.root.scale.setScalar(.85);car.add(rac.root);
  const rack=mesh(G.box(1.6,.08,1.6),'#2b2d42',{ink:.01});rack.position.set(0,2.25,.2);car.add(rack);
  const cake=makeCake({scale:.9});cake.position.set(0,2.3,.2);car.add(cake);
  root.add(blob(2.2));
  return{root,car,wheels,rac,cake,
    update(dt,t,{speed=0,talk=0,mood='grumpy'}={}){
      wheels.forEach(w=>w.rotation.x-=speed*dt*2);car.position.y=Math.abs(Math.sin(t*12))*.03*Math.min(1,speed/8);
      car.rotation.z=Math.sin(t*1.3)*.02;rac.update(dt,t,{talk,mood});cake.userData.update(t);
    }};
}

// ---------- scenery ----------
const pick=a=>a[Math.floor(Math.random()*a.length)];
const R=(a,b)=>a+Math.random()*(b-a);
export const PROPS={
  tree(){const g=new THREE.Group();const tr=mesh(G.cyl(.18,.26,1.4,10),'#8b5a2b');tr.position.y=.7;g.add(tr);
    const greens=['#5ccf62','#4bbf55','#7ad86b'];for(const [x,y,z,r] of [[0,1.9,0,.95],[-.5,1.6,.2,.7],[.5,1.65,-.1,.72],[0,2.5,0,.6]]){const s=mesh(G.sphere(r,14,10),pick(greens));s.position.set(x,y,z);g.add(s)}g.add(blob(1));return g},
  pine(){const g=new THREE.Group();const tr=mesh(G.cyl(.15,.2,.8,8),'#7a4a24');tr.position.y=.4;g.add(tr);
    for(let i=0;i<3;i++){const c=mesh(G.cone(1-i*.25,1.3,12),'#2fa65a');c.position.y=1.1+i*.7;g.add(c)}g.add(blob(.9));return g},
  flower(){const g=new THREE.Group(),col=pick(['#ff5fa2','#ffd23f','#9b5de5','#ff8c1a','#ffffff','#3a86ff']);
    const st=mesh(G.cyl(.04,.04,.7,6),'#3aa655',{ink:.008});st.position.y=.35;g.add(st);
    for(let i=0;i<5;i++){const p=mesh(G.sphere(.16,10,8),col,{ink:.01});const a=i/5*6.28;p.position.set(Math.cos(a)*.19,.78,Math.sin(a)*.19*.4);p.scale.set(1,1,.5);g.add(p)}
    const c=mesh(G.sphere(.11,10,8),'#ffb000',{ink:.01});c.position.set(0,.78,.06);g.add(c);g.scale.setScalar(R(.9,1.4));return g},
  mushroom(){const g=new THREE.Group();const st=mesh(G.cyl(.18,.24,.6,12),'#fff3e0');st.position.y=.3;g.add(st);
    const cap=mesh(new THREE.SphereGeometry(.55,20,12,0,Math.PI*2,0,Math.PI/2),'#ff4d4d');cap.position.y=.55;g.add(cap);
    for(let i=0;i<5;i++){const d=mesh(G.sphere(.08,8,6),'#ffffff',{ink:0});const a=i/5*6.28;d.position.set(Math.cos(a)*.32,.82,Math.sin(a)*.32);g.add(d)}g.add(blob(.6));g.scale.setScalar(R(.8,1.5));return g},
  bush(){const g=new THREE.Group();for(const [x,r] of [[-.4,.45],[0,.6],[.45,.42]]){const s=mesh(G.sphere(r,12,10),'#4bbf55');s.position.set(x,r*.8,0);g.add(s)}return g},
  lollipop(){const g=new THREE.Group();const st=mesh(G.cyl(.06,.06,1.8,8),'#ffffff');st.position.y=.9;g.add(st);
    const col=pick(['#ff5fa2','#ffd23f','#3a86ff','#22c55e','#9b5de5']);const d=mesh(G.cyl(.62,.62,.18,28),col);d.rotation.x=Math.PI/2;d.position.y=2.1;g.add(d);
    for(let i=0;i<3;i++){const r=mesh(G.torus(.15+i*.15,.035),'#ffffff',{ink:0});r.position.set(0,2.1,.1);g.add(r)}g.add(blob(.5));return g},
  gumdrop(){const g=new THREE.Group();const s=mesh(G.sphere(.55,16,12),pick(['#ff5fa2','#22c55e','#ffd23f','#9b5de5','#ff8c1a']));s.scale.set(1,1.1,1);s.position.y=.45;g.add(s);g.add(blob(.6));return g},
  cupcake(){const g=new THREE.Group();const w=mesh(G.cyl(.5,.38,.5,16),'#3a86ff');w.position.y=.25;g.add(w);
    const f=mesh(G.sphere(.55,16,12),'#ffd1e8');f.position.y=.7;f.scale.set(1,.75,1);g.add(f);const c=mesh(G.sphere(.12,10,8),'#ff3b3b');c.position.y=1.15;g.add(c);g.add(blob(.6));g.scale.setScalar(R(1,1.6));return g},
  candycane(){const g=new THREE.Group();for(let i=0;i<8;i++){const s=mesh(G.cyl(.12,.12,.25,10),i%2?'#ffffff':'#ff3b3b',{ink:i===0?.015:0});s.position.y=.125+i*.25;g.add(s)}
    const top=mesh(G.torus(.32,.12,Math.PI),'#ff3b3b');top.position.set(-.32,2,0);g.add(top);g.add(blob(.4));return g},
  palm(){const g=new THREE.Group();for(let i=0;i<6;i++){const s=mesh(G.cyl(.16,.2,.55,8),'#b07a45');s.position.set(i*i*.025,.27+i*.5,0);s.rotation.z=-i*.04;g.add(s)}
    for(let i=0;i<6;i++){const l=mesh(G.cone(.25,1.8,6),'#2fa65a');const a=i/6*6.28;l.position.set(.9+Math.cos(a)*.6,3.1,Math.sin(a)*.6);l.rotation.set(Math.sin(a)*1.2,0,-Math.cos(a)*1.2-.2);g.add(l)}
    const co=mesh(G.sphere(.16,8,6),'#6b4423');co.position.set(.85,2.95,.15);g.add(co);g.add(blob(1));return g},
  umbrella(){const g=new THREE.Group();const p=mesh(G.cyl(.04,.04,2,6),'#ffffff');p.position.y=1;g.add(p);
    const c=mesh(G.cone(1.2,.6,8),pick(['#ff3b3b','#3a86ff','#ff8c1a']));c.position.y=2.1;g.add(c);g.add(blob(1));return g},
  beachball(){const g=new THREE.Group();const b=mesh(G.sphere(.45,16,12),pick(['#ff3b3b','#3a86ff','#ffd23f']));b.position.y=.45;g.add(b);
    const s=mesh(G.torus(.45,.06),'#ffffff',{ink:0});s.position.y=.45;g.add(s);g.add(blob(.5));return g},
  sandcastle(){const g=new THREE.Group(),sand='#f2c879';const b=mesh(G.box(1.4,.7,1),sand);b.position.y=.35;g.add(b);
    for(const x of [-.6,.6]){const t=mesh(G.cyl(.3,.3,1.2,10),sand);t.position.set(x,.6,0);g.add(t);const r=mesh(G.cone(.36,.45,10),'#ff5fa2');r.position.set(x,1.42,0);g.add(r)}g.add(blob(1));return g},
  animal(list){return standee(pick(list),R(1.4,1.9))},
};
export const BIOMES=[
  {name:'Sunny Meadow',sky:['#3fa9ff','#bfe9ff','#e9fbd9'],fog:'#cfeeff',grass:'#69d26a',grass2:'#5cc65e',road:'#7c8496',
   props:['tree','tree','pine','flower','flower','flower','mushroom','bush'],animals:['🐄','🐑','🐇','🐖','🐓']},
  {name:'Candy Land',sky:['#ff7cc8','#ffd3ee','#fff0f8'],fog:'#ffd9ef',grass:'#ffc2e2',grass2:'#ffb2da',road:'#a68af5',
   props:['lollipop','lollipop','gumdrop','gumdrop','cupcake','candycane','candycane'],animals:['🦄','🧸','🐰']},
  {name:'Sparkle Beach',sky:['#22a7f0','#a8e6ff','#fff3c4'],fog:'#c9f0ff',grass:'#ffe39b',grass2:'#ffd97f',road:'#8c96aa',
   props:['palm','palm','umbrella','beachball','sandcastle','palm'],animals:['🦀','🐢','🦩','🐬']},
];
