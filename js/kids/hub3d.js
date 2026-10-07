// The hub as a living diorama of Sprinkle Valley: the three adventures side by side.
// Hovering a world makes its characters hop; choosing one swoops the camera in.
import {THREE,BEND,createStage,createParticles,mesh,G,blob,standee,damp,lerp,easeInOut} from './three/kit.js';
import {makeKitty,makeRaccoon,makeKart,makeCake,PROPS} from './three/chars.js';
import {makeRocket,makeStorm,makeDragon,makeUnicorn} from './three/cast2.js';

export function createHub(host){
  BEND.value.set(0,.0016);
  const st=createStage(host),{scene,camera}=st;
  st.setSky('#3fa9ff','#bfe9ff','#fff0f8','#d7f0ff');
  const fx=createParticles(scene);
  const ground=mesh(G.cyl(80,80,1,64),'#7ad57a',{ink:0});ground.position.set(0,-.5,-20);scene.add(ground);
  // little paths and scenery
  for(let i=0;i<46;i++){const n=['tree','tree','pine','flower','flower','mushroom','bush'][i%7],o=PROPS[n]();
    const a=Math.random()*Math.PI-Math.PI,r=14+Math.random()*30;o.position.set(Math.cos(a)*r,0,-8+Math.sin(a)*r*.6);if(Math.abs(o.position.x)<11&&o.position.z>-14)continue;scene.add(o)}
  const worlds=[];
  // 1: the kart with both kitties
  {const g=new THREE.Group();g.position.set(-7,0,-2);g.rotation.y=.5;scene.add(g);
    const road=mesh(new THREE.BoxGeometry(4.2,.05,9),'#8c93a6',{ink:0});road.position.z=-1;g.add(road);
    const kart=makeKart();g.add(kart.root);
    const cap=makeKitty(),spk=makeKitty({fur:'#fff4fb',stripe:null,mask:'#ff4f9a',capeColor:'#9b5de5',tiara:true});
    for(const [k,i] of [[cap,0],[spk,1]]){kart.car.add(k.root);k.root.position.copy(kart.seats[i]);k.root.scale.setScalar(.72)}
    const rac=makeRaccoon();rac.root.position.set(2.6,0,-3.4);rac.root.rotation.y=-.6;g.add(rac.root);
    const cake=makeCake({scale:.8});cake.position.set(-2.4,0,-2.5);g.add(cake);
    worlds.push({g,hop:0,cast:[cap,spk,rac],update:(dt,t,h)=>{kart.update(dt,t,{speed:h?6:0});cap.update(dt,t,{talk:0,wind:h?.6:.15});spk.update(dt,t,{wind:h?.6:.15});rac.update(dt,t,{mood:'grumpy'});cake.userData.update(t);
      kart.root.position.y=h?Math.abs(Math.sin(t*8))*.25:0}});}
  // 2: the rocket on its pad, Stormy above
  {const g=new THREE.Group();g.position.set(0,0,-6);scene.add(g);
    const pad=mesh(G.cyl(2.2,2.5,.5,24),'#9aa3b5',{ink:.02});pad.position.y=.25;g.add(pad);
    const r=makeRocket();r.root.position.y=2.45;g.add(r.root);
    const storm=makeStorm();storm.root.position.set(3,9.5,-6);storm.root.scale.setScalar(.6);g.add(storm.root);
    const uni=makeUnicorn();uni.root.position.set(-3,0,.5);uni.root.rotation.y=.4;g.add(uni.root);
    worlds.push({g,hop:0,update:(dt,t,h)=>{r.update(dt,t,{thrust:h?1:.15});r.root.position.y=2.45+(h?.4+Math.sin(t*10)*.08:0);storm.update(dt,t,{mood:'grumpy'});uni.update(dt,t,{});
      if(h&&Math.random()<dt*30)fx.add({x:g.position.x+(Math.random()-.5),y:.4,z:g.position.z+(Math.random()-.5),vx:(Math.random()-.5)*3,vy:Math.random()*.5,vz:(Math.random()-.5)*3,life:.8,size:.7,grow:1,color:'#ffffff',drag:1.5})}});}
  // 3: Ember's picnic
  {const g=new THREE.Group();g.position.set(7,0,-2);g.rotation.y=-.5;scene.add(g);
    const blanket=mesh(new THREE.BoxGeometry(3.4,.04,2.4),'#ff8fa8',{ink:0});blanket.position.set(-1.6,.02,1);g.add(blanket);
    const d=makeDragon();g.add(d.root);
    for(let i=0;i<4;i++){const s=standee(['🍓','🍪','🍒','🍇'][i],.7);s.position.set(-2.6+i*.7,0,1.2);g.add(s)}
    worlds.push({g,hop:0,update:(dt,t,h)=>{d.update(dt,t,{open:h?.8:0,flap:h?1:0,happy:!h&&Math.sin(t*.7)>.6});d.root.position.y=h?Math.abs(Math.sin(t*6))*.5:0}});}
  // balloons drifting up
  const balloons=[];
  for(let i=0;i<10;i++){const b=mesh(G.sphere(.35,14,10),['#ff3b3b','#ffd23f','#3a86ff','#22c55e','#9b5de5','#ff8c1a'][i%6]);b.scale.set(1,1.15,1);b.position.set((Math.random()-.5)*30,Math.random()*14,-8-Math.random()*10);scene.add(b);balloons.push(b)}
  const cam={pos:new THREE.Vector3(0,6.2,15),look:new THREE.Vector3(0,2,-3),fov:50};
  camera.position.copy(cam.pos);
  let hovered=-1,focused=-1,t=0,raf=0,last=performance.now(),alive=true;
  function frame(now){
    if(!alive)return;raf=requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
    worlds.forEach((w,i)=>w.update(dt,t,i===hovered||i===focused));
    balloons.forEach((b,i)=>{b.position.y+=dt*(.6+i*.05);b.position.x+=Math.sin(t+i)*dt*.3;if(b.position.y>16)b.position.y=-1});
    if(Math.random()<dt*.6)fx.sparkle((Math.random()-.5)*20,2+Math.random()*6,-6-Math.random()*6,6,1.5);
    fx.update(dt,0);
    if(focused>=0){const w=worlds[focused].g.position;cam.pos.set(w.x*1.15,3.4,w.z+8.5);cam.look.set(w.x,2.6,w.z);cam.fov=46}
    else{cam.pos.set(Math.sin(t*.12)*1.5,6.2,15);cam.look.set(0,2,-3);cam.fov=50}
    camera.position.x=damp(camera.position.x,cam.pos.x,2.5,dt);camera.position.y=damp(camera.position.y,cam.pos.y,2.5,dt);camera.position.z=damp(camera.position.z,cam.pos.z,2.5,dt);
    cam.cur=cam.cur||cam.look.clone();cam.cur.lerp(cam.look,1-Math.exp(-2.5*dt));camera.lookAt(cam.cur);
    camera.fov=damp(camera.fov,cam.fov,2.5,dt);camera.updateProjectionMatrix();
    st.render();
  }
  raf=requestAnimationFrame(frame);
  return{
    hover(i){if(i!==hovered&&i>=0)fx.confetti(worlds[i].g.position.x,3,worlds[i].g.position.z,30,.7);hovered=i},
    focus(i){focused=i},
    stop(){alive=false;cancelAnimationFrame(raf);st.dispose()},
  };
}
