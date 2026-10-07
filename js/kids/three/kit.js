// Toon 3D toolkit for the kids games: a renderer on a "rolling log" curved world
// (everything bends down and sideways with distance, so things rise over the horizon),
// cel-shaded materials with ink outlines, blob shadows, and a particle system.
import * as THREE from 'three';
export {THREE};

// shared bend: x = sideways curve, y = how fast the world drops away
export const BEND={value:new THREE.Vector2(0,.0013)};
const BEND_GLSL=`
  vec4 wp = modelMatrix * mvPosition;
  float bd = max(0.0, -wp.z);
  wp.x += uBend.x * bd * bd;
  wp.y -= uBend.y * bd * bd;
  mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;`;
// patch any built-in material so it follows the curved world
export function bend(mat,{outline=0}={}){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uBend=BEND;
    if(outline)sh.uniforms.uOut={value:outline};
    sh.vertexShader=sh.vertexShader
      .replace('#include <common>','#include <common>\nuniform vec2 uBend;'+(outline?'\nuniform float uOut;':''))
      .replace('#include <project_vertex>',`
        vec4 mvPosition = vec4( transformed${outline?' + normalize(normal) * uOut':''}, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        ${BEND_GLSL}`);
  };
  mat.customProgramCacheKey=()=>'bend'+outline;
  return mat;
}

// 3-step cel ramp
const ramp=(()=>{const d=new Uint8Array([90,90,90,255,175,175,175,255,255,255,255,255]);const t=new THREE.DataTexture(d,3,1);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t})();
const matCache=new Map();
export function toon(color,{emissive=0,flat=false}={}){
  const k=color+'|'+emissive+flat;if(matCache.has(k))return matCache.get(k);
  const m=bend(flat?new THREE.MeshBasicMaterial({color}):new THREE.MeshToonMaterial({color,gradientMap:ramp,emissive:emissive?color:0x000000,emissiveIntensity:emissive}));
  matCache.set(k,m);return m;
}
const inkCache=new Map();
function inkMat(w,color='#2a1f3d'){const k=w+color;if(!inkCache.has(k))inkCache.set(k,bend(new THREE.MeshBasicMaterial({color,side:THREE.BackSide}),{outline:w}));return inkCache.get(k)}
// a mesh with an ink outline (inverted hull)
export function mesh(geo,color,{ink=.025,emissive=0,flat=false,shadow=false}={}){
  const m=new THREE.Mesh(geo,typeof color==='string'||typeof color==='number'?toon(color,{emissive,flat}):color);
  if(ink){const o=new THREE.Mesh(geo,inkMat(ink));o.raycast=()=>{};m.add(o)}
  return m;
}
export const G={
  sphere:(r,w=24,h=16)=>new THREE.SphereGeometry(r,w,h),
  box:(x,y,z)=>new THREE.BoxGeometry(x,y,z),
  cyl:(rt,rb,h,s=20)=>new THREE.CylinderGeometry(rt,rb,h,s),
  cone:(r,h,s=20)=>new THREE.ConeGeometry(r,h,s),
  capsule:(r,l)=>new THREE.CapsuleGeometry(r,l,6,16),
  torus:(r,t,arc=Math.PI*2)=>new THREE.TorusGeometry(r,t,10,28,arc),
};
// soft round shadow under things
const shadowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
const shadowMat=bend(new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));
export function blob(r){const m=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),shadowMat);m.rotation.x=-Math.PI/2;m.position.y=.02;m.renderOrder=-1;return m}

// emoji painted onto a card that stands up in the world (animals, decorations)
const emojiTex=new Map();
export function emojiTexture(ch){
  if(!emojiTex.has(ch)){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
    g.font='100px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(ch,64,72);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;emojiTex.set(ch,t)}
  return emojiTex.get(ch);
}
export function standee(ch,size){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),bend(new THREE.MeshBasicMaterial({map:emojiTexture(ch),transparent:true,alphaTest:.1,side:THREE.DoubleSide})));
  m.position.y=size/2;return m;
}
// text on a canvas texture (number blocks, signs)
export function textTexture(text,{w=256,h=256,bg='#ffffff',fg='#1e2a4a',font='700 180px Fredoka',border='#3a86ff'}={}){
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h)}if(border){g.strokeStyle=border;g.lineWidth=w*.07;g.strokeRect(w*.035,h*.035,w*.93,h*.93)}
  g.fillStyle=fg;g.font=font;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+h*.04);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

// ---------- stage: renderer, sky, lights, camera ----------
export function createStage(host){
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const el=renderer.domElement;el.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';host.appendChild(el);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(58,1,.1,600);
  // gradient sky dome
  const skyU={top:{value:new THREE.Color('#4fb8ff')},mid:{value:new THREE.Color('#bfe9ff')},bot:{value:new THREE.Color('#fff2d6')}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyU,
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,mid,bot;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=h>0.?mix(mid,top,smoothstep(0.,.5,h)):mix(mid,bot,smoothstep(0.,-.25,h));gl_FragColor=vec4(c,1.);}'}));
  sky.renderOrder=-10;scene.add(sky);
  const hemi=new THREE.HemisphereLight('#eaf6ff','#7fbf6a',1.4);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff4e0',2.2);sun.position.set(-6,12,8);scene.add(sun);
  scene.fog=new THREE.Fog('#d9f1ff',60,190);
  function resize(){const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  resize();addEventListener('resize',resize);
  return{renderer,scene,camera,sky,skyU,hemi,sun,
    setSky(top,mid,bot,fog){skyU.top.value.set(top);skyU.mid.value.set(mid);skyU.bot.value.set(bot);scene.fog.color.set(fog||mid)},
    render(){sky.position.copy(camera.position);renderer.render(scene,camera)},
    dispose(){removeEventListener('resize',resize);renderer.dispose();el.remove();scene.traverse(o=>{o.geometry&&o.geometry.dispose()})}};
}

// ---------- particles: sparkles, puffs, confetti ----------
const dotTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
export function createParticles(scene,max=1500){
  const pos=new Float32Array(max*3),col=new Float32Array(max*3),size=new Float32Array(max),alpha=new Float32Array(max);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.setAttribute('size',new THREE.BufferAttribute(size,1));geo.setAttribute('alpha',new THREE.BufferAttribute(alpha,1));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{map:{value:dotTex},uBend:BEND,uScale:{value:500}},
    vertexShader:`uniform vec2 uBend;uniform float uScale;attribute float size;attribute float alpha;attribute vec3 color;varying vec3 vC;varying float vA;
      void main(){vC=color;vA=alpha;vec4 wp=modelMatrix*vec4(position,1.);float bd=max(0.,-wp.z);wp.x+=uBend.x*bd*bd;wp.y-=uBend.y*bd*bd;
      vec4 mv=viewMatrix*wp;gl_Position=projectionMatrix*mv;gl_PointSize=size*uScale/-mv.z;}`,
    fragmentShader:`uniform sampler2D map;varying vec3 vC;varying float vA;void main(){vec4 t=texture2D(map,gl_PointCoord);gl_FragColor=vec4(vC,t.a*vA);}`});
  const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;scene.add(pts);
  const P=[];let head=0;const tmp=new THREE.Color();
  // confetti: little spinning cards
  const CN=400,cgeo=new THREE.PlaneGeometry(.18,.12),cmat=bend(new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  const conf=new THREE.InstancedMesh(cgeo,cmat,CN);conf.frustumCulled=false;scene.add(conf);
  const C=[];let chead=0;const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s1=new THREE.Vector3(1,1,1);
  for(let i=0;i<CN;i++){C.push({life:0});conf.setColorAt(i,tmp.set('#fff'));m4.makeScale(0,0,0);conf.setMatrixAt(i,m4)}
  return{
    add(o){const i=head;head=(head+1)%max;P[i]={x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,drag:1,life:1,t:0,size:.3,grow:0,color:'#fff',...o};tmp.set(P[i].color);col.set([tmp.r,tmp.g,tmp.b],i*3)},
    sparkle(x,y,z,n=20,spread=4,colors=['#fff6a0','#ffffff','#ffd166']){for(let i=0;i<n;i++){const a=Math.random()*6.28,b=Math.random()*3.14,s=spread*(.4+Math.random());this.add({x,y,z,vx:Math.cos(a)*Math.sin(b)*s,vy:Math.cos(b)*s+1,vz:Math.sin(a)*Math.sin(b)*s,drag:2,life:.5+Math.random()*.5,size:.35+Math.random()*.3,color:colors[i%colors.length]})}},
    puff(x,y,z,n=6,color='#ffffff',size=.8){for(let i=0;i<n;i++)this.add({x:x+(Math.random()-.5)*.4,y,z:z+(Math.random()-.5)*.4,vx:(Math.random()-.5)*1.5,vy:.6+Math.random(),vz:(Math.random()-.5)*1.5,drag:1.5,life:.6+Math.random()*.5,size:size*(.6+Math.random()*.6),grow:1.2,color})},
    confetti(x,y,z,n=60,power=1,colors=['#ff3b3b','#ffb000','#22c55e','#3a86ff','#9b5de5','#ff4f9a','#ffffff']){
      for(let i=0;i<n;i++){const k=chead;chead=(chead+1)%CN;const a=Math.random()*6.28,s=(2+Math.random()*5)*power;
        C[k]={x,y,z,vx:Math.cos(a)*s,vy:(3+Math.random()*6)*power,vz:Math.sin(a)*s,life:2+Math.random()*1.5,t:0,rx:Math.random()*6,ry:Math.random()*6,sr:(Math.random()-.5)*14};
        conf.setColorAt(k,tmp.set(colors[i%colors.length]))}
      conf.instanceColor.needsUpdate=true;
    },
    // everything drifts toward the camera with the world (dz per second)
    update(dt,dz=0){
      for(let i=0;i<max;i++){const p=P[i];if(!p||p.t>=p.life){alpha[i]=0;continue}
        p.t+=dt;const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d-p.g*dt;p.vz*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt+dz*dt;
        const f=p.t/p.life;pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;size[i]=p.size*(1+p.grow*f);alpha[i]=f>.6?(1-f)/.4:1}
      geo.attributes.position.needsUpdate=geo.attributes.size.needsUpdate=geo.attributes.alpha.needsUpdate=geo.attributes.color.needsUpdate=true;
      for(let i=0;i<CN;i++){const c=C[i];if(!c.life||c.t>=c.life){m4.makeScale(0,0,0);conf.setMatrixAt(i,m4);continue}
        c.t+=dt;c.vx*=Math.exp(-1.2*dt);c.vz*=Math.exp(-1.2*dt);c.vy=c.vy*Math.exp(-1.2*dt)-6*dt;c.x+=c.vx*dt;c.y=Math.max(.05,c.y+c.vy*dt);c.z+=c.vz*dt+dz*dt;
        c.rx+=c.sr*dt;c.ry+=c.sr*.7*dt;e.set(c.rx,c.ry,0);q.setFromEuler(e);const sc=c.t>c.life-.4?(c.life-c.t)/.4:1;s1.set(sc,sc,sc);m4.compose(v.set(c.x,c.y,c.z),q,s1);conf.setMatrixAt(i,m4)}
      conf.instanceMatrix.needsUpdate=true;
    },
  };
}

// ---------- helpers ----------
export const lerp=(a,b,t)=>a+(b-a)*t;
export const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export const easeOut=t=>1-(1-t)**3;
export const easeInOut=t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2;
