import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {$,rand,clamp,TOUCH} from './util.js';
import {SFX} from './audio.js';
export {THREE};

// world units: the z=0 plane spans VW × VH; SHIELD_Y is the line enemies must not cross
export const V={W:1,H:1,VW:100,VH:72,PX:10,SHIELD_Y:-30,SHIP_Y:-34};
// transient screen effects, decayed every frame
export const FX={aberr:0,shake:0,shieldFlash:0,shipAim:0,shipAimCur:0};
export const labelsEl=$('labels');

// ================= renderer + post FX =================
const canvas=$('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x02030a,1);
export const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,1,1,1000);
const rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
const composer=new EffectComposer(renderer,rt);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(512,512),1.1,.5,.06);
composer.addPass(bloom);
const post=new ShaderPass({
  uniforms:{tDiffuse:{value:null},amt:{value:.004},time:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float amt;uniform float time;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec2 c=vUv-.5;float d=length(c);vec2 off=c*amt*(1.+d*2.);
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
      col*=smoothstep(1.0,.3,d);
      col+=(h(vUv*(time+1.))-.5)*.006;
      col*=.96+.04*sin(vUv.y*900.);
      gl_FragColor=vec4(col,1.);}`
});
composer.addPass(post);
composer.addPass(new OutputPass());

const FOV_T=Math.tan(THREE.MathUtils.degToRad(22.5));
const v3=new THREE.Vector3();
export function toScreen(x,y){v3.set(x,y,0).project(camera);return[(v3.x+1)/2*V.W,(1-v3.y)/2*V.H]}
// inverse of toScreen for DOM elements (camera looks straight at z=0, so this is linear)
export function toWorld(sx,sy){return[(sx/V.W-.5)*V.VW,(.5-sy/V.H)*V.VH]}
export function elWorld(el){const r=el.getBoundingClientRect();return toWorld(r.left+r.width/2,r.top+r.height/2)}

// ================= warping grid (spring mesh) =================
let grid=null;
function buildGrid(){
  if(grid){scene.remove(grid.mesh);grid.mesh.geometry.dispose()}
  const gw=V.VW+30,gh=V.VH+30,gs=Math.max(2.4,gw/64);
  const cols=Math.ceil(gw/gs)+1,rows=Math.ceil(gh/gs)+1,n=cols*rows;
  const base=new Float32Array(n*2),d=new Float32Array(n*2),v=new Float32Array(n*2),pos=new Float32Array(n*3),col=new Float32Array(n*3),major=new Uint8Array(n);
  const x0=-(cols-1)*gs/2,y0=-(rows-1)*gs/2,idx=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const k=j*cols+i;base[k*2]=x0+i*gs;base[k*2+1]=y0+j*gs;pos[k*3+2]=-4;
    major[k]=(i%4===0||j%4===0)?1:0;
    if(i<cols-1)idx.push(k,k+1);if(j<rows-1)idx.push(k,k+cols);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.setIndex(idx);
  const mesh=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  mesh.frustumCulled=false;scene.add(mesh);
  grid={mesh,cols,rows,gs,n,base,d,v,pos,col,major};
}
export function gridPush(x,y,f,r){
  if(!grid)return;const {cols,rows,gs,base,d,v}=grid;
  const x0=base[0],y0=base[1];
  const i0=Math.max(1,Math.floor((x-r-x0)/gs)),i1=Math.min(cols-2,Math.ceil((x+r-x0)/gs));
  const j0=Math.max(1,Math.floor((y-r-y0)/gs)),j1=Math.min(rows-2,Math.ceil((y+r-y0)/gs));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const k=j*cols+i,px=base[k*2]+d[k*2]-x,py=base[k*2+1]+d[k*2+1]-y,dist=Math.hypot(px,py);
    if(dist<r&&dist>.01){const s=f*(1-dist/r)/dist;v[k*2]+=px*s;v[k*2+1]+=py*s}
  }
}
function gridStep(dt){
  const {cols,rows,gs,d,v}=grid,c2=1500/(gs*gs);
  for(let j=1;j<rows-1;j++)for(let i=1;i<cols-1;i++){
    const k=j*cols+i;
    for(let c=0;c<2;c++){
      const kk=k*2+c,lap=d[kk-2]+d[kk+2]+d[kk-cols*2]+d[kk+cols*2]-4*d[kk];
      v[kk]=(v[kk]+(c2*lap-28*d[kk])*dt)*(1-3.2*dt);
    }
  }
  for(let k=0;k<d.length;k++)d[k]+=v[k]*dt;
}
function gridRender(){
  const {n,base,d,pos,col,major}=grid;
  for(let k=0;k<n;k++){
    const dx=d[k*2],dy=d[k*2+1];pos[k*3]=base[k*2]+dx;pos[k*3+1]=base[k*2+1]+dy;
    const m=Math.min(Math.hypot(dx,dy)*.7,1.6),b=major[k]?2.6:1;
    col[k*3]=(.0035+m*.12)*b;col[k*3+1]=(.006+m*.12)*b;col[k*3+2]=(.024+m*.35)*b;
  }
  grid.mesh.geometry.attributes.position.needsUpdate=true;
  grid.mesh.geometry.attributes.color.needsUpdate=true;
}

// ================= spark particles (velocity-stretched lines) =================
const MAXP=7000;
const pp=new Float32Array(MAXP*6),pc=new Float32Array(MAXP*6);
const px=new Float32Array(MAXP),py=new Float32Array(MAXP),pvx=new Float32Array(MAXP),pvy=new Float32Array(MAXP),
      pl=new Float32Array(MAXP),pml=new Float32Array(MAXP),pr=new Float32Array(MAXP),pg=new Float32Array(MAXP),pb=new Float32Array(MAXP),
      pgrav=new Float32Array(MAXP),pflick=new Uint8Array(MAXP);
let pHead=0;
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pp,3));
pGeo.setAttribute('color',new THREE.BufferAttribute(pc,3));
const pMesh=new THREE.LineSegments(pGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
pMesh.frustumCulled=false;scene.add(pMesh);
export function emit(x,y,vx,vy,life,c,grav=0,flick=0){
  const i=pHead;pHead=(pHead+1)%MAXP;
  px[i]=x;py[i]=y;pvx[i]=vx;pvy[i]=vy;pl[i]=pml[i]=life;pr[i]=c.r;pg[i]=c.g;pb[i]=c.b;pgrav[i]=grav;pflick[i]=flick;
}
const tmpC=new THREE.Color();
export function burst(x,y,color,n,speed,life=.9){
  const c=tmpC.set(color);
  for(let i=0;i<n;i++){const a=Math.random()*6.283,s=speed*(.2+Math.random()**.6);emit(x,y,Math.cos(a)*s,Math.sin(a)*s,life*rand(.5,1.2),c)}
  const w=new THREE.Color(0xffffff);
  for(let i=0;i<n/5;i++){const a=Math.random()*6.283,s=speed*rand(.6,1.3);emit(x,y,Math.cos(a)*s,Math.sin(a)*s,life*.5,w)}
}
// sparks that fly from (x0,y0) and settle near (x1,y1); drag 0.12/s means travel ≈ v/2.1
export function stream(x0,y0,x1,y1,color,n=40){
  const c=new THREE.Color(color);
  for(let i=0;i<n;i++){const k=rand(1.6,2.2);emit(x0+rand(-.6,.6),y0+rand(-.6,.6),(x1-x0)*k+rand(-6,6),(y1-y0)*k+rand(-6,6),rand(.4,.8),c)}
}
function particlesStep(dt){
  const drag=Math.pow(.12,dt);
  for(let i=0;i<MAXP;i++){
    const o=i*6;
    if(pl[i]<=0){if(pc[o]||pc[o+1]||pc[o+2]||pc[o+3]){pc.fill(0,o,o+6)}continue}
    pl[i]-=dt;pvy[i]-=pgrav[i]*dt;pvx[i]*=drag;pvy[i]*=drag;px[i]+=pvx[i]*dt;py[i]+=pvy[i]*dt;
    const f=Math.max(pl[i]/pml[i],0),k=f*f*2.2*(pflick[i]&&Math.random()<.45?.12:1),tl=.045;
    pp[o]=px[i];pp[o+1]=py[i];pp[o+2]=0;pp[o+3]=px[i]-pvx[i]*tl;pp[o+4]=py[i]-pvy[i]*tl;pp[o+5]=0;
    pc[o]=pr[i]*k;pc[o+1]=pg[i]*k;pc[o+2]=pb[i]*k;pc[o+3]=pr[i]*k*.2;pc[o+4]=pg[i]*k*.2;pc[o+5]=pb[i]*k*.2;
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;
}

// ================= shockwave rings =================
const ringGeo=(()=>{const p=[];for(let i=0;i<64;i++){const a=i/64*6.283;p.push(new THREE.Vector3(Math.cos(a),Math.sin(a),0))}return new THREE.BufferGeometry().setFromPoints(p)})();
const waves=[];
export function shockwave(x,y,color,size=12,dur=.5){
  const m=new THREE.LineLoop(ringGeo,new THREE.LineBasicMaterial({color:new THREE.Color(color).multiplyScalar(2.5),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.set(x,y,0);scene.add(m);waves.push({m,t:0,dur,size});
}
function wavesStep(dt){
  for(let i=waves.length-1;i>=0;i--){
    const w=waves[i];w.t+=dt;const f=w.t/w.dur;
    if(f>=1){scene.remove(w.m);w.m.material.dispose();waves.splice(i,1);continue}
    const s=.5+w.size*(1-(1-f)**3);w.m.scale.set(s,s,1);w.m.material.opacity=(1-f)**1.5;
  }
}

// ================= answer fireworks (shown when a problem crashes) =================
const fws=[],FW_GOLD=new THREE.Color('#ffcf6a'),FW_WHITE=new THREE.Color('#ffffff');
export function firework(x,color,q,a,y0=V.SHIELD_Y+1){
  x=clamp(x,-V.VW/2+14,V.VW/2-14);
  fws.push({x,x0:x,y:y0,y0,ty:Math.min(y0+V.VH*.4,V.VH/2-16),t:0,c:new THREE.Color(color),color,q,a,el:null,hiss:false});
  SFX.whistle();
}
export function clearFireworks(){fws.length=0;labelsEl.querySelectorAll('.fw').forEach(n=>n.remove())}
function fwBurst(f){
  const {x,y,c}=f;
  for(let i=0;i<220;i++){
    const a=Math.random()*6.283,s=(i<150?rand(.8,1):rand(.2,.8))*48,col=i%5===0?FW_WHITE:i%3===0?FW_GOLD:c;
    emit(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(1.3,2.1),col,16,i%2);
  }
  shockwave(x,y,f.color,18,.6);shockwave(x,y,'#ffffff',9,.3);
  SFX.pop();FX.aberr=Math.max(FX.aberr,.006);
  const [sx,sy]=toScreen(x,y),d=document.createElement('div');
  d.className='fw';d.style.setProperty('--c',f.color);
  d.style.setProperty('--p',`translate(${sx|0}px,${sy|0}px) translate(-50%,-50%)`);
  d.innerHTML=`<span class="q">${f.q} =</span><span class="a">${f.a}</span>`;
  d.addEventListener('animationend',()=>d.remove());labelsEl.appendChild(d);f.el=d;
}
function fireworksStep(dt){
  for(let i=fws.length-1;i>=0;i--){
    const f=fws[i];f.t+=dt;
    if(f.t<.55){ // rocket climbing
      const k=1-(1-f.t/.55)**2;f.y=f.y0+(f.ty-f.y0)*k;f.x=f.x0+Math.sin(f.t*22)*.35;
      for(let j=0;j<5;j++)emit(f.x+rand(-.3,.3),f.y,rand(-5,5),rand(-14,-4),rand(.3,.6),j%2?FW_GOLD:FW_WHITE,20,1);
    }else if(!f.el)fwBurst(f);
    else{ // sizzle: crackling sparks drifting off the fading answer
      const b=f.t-.55;
      if(b>1.3&&!f.hiss){f.hiss=true;SFX.sizzle()}
      if(b>1.2&&b<2.6){
        const w=1.5+String(f.a).length*2.2,n=Math.random()<(2.6-b)/1.4*2.5?3:1;
        for(let j=0;j<n;j++)emit(f.x+rand(-w,w),f.y+rand(-3.5,2.5),rand(-4,4),rand(-2,6),rand(.25,.6),Math.random()<.5?FW_GOLD:FW_WHITE,22,1);
      }
      if(b>2.7)fws.splice(i,1);
    }
  }
}

// ================= line-art shapes =================
const geoCache={};
export function polyGeo(sides,r,inner,rot){
  const key=[sides,r,inner,rot].join();if(geoCache[key])return geoCache[key];
  const pts=[],n=inner?sides*2:sides;
  for(let i=0;i<n;i++){const a=rot+i/n*6.283,rr=inner&&i%2?r*inner:r;pts.push(new THREE.Vector3(Math.cos(a)*rr,Math.sin(a)*rr,0))}
  return geoCache[key]=new THREE.BufferGeometry().setFromPoints(pts);
}
export const glowMat=(c,k=2)=>new THREE.LineBasicMaterial({color:new THREE.Color(c).multiplyScalar(k),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});

// ship + shield line
const ship=new THREE.Group();
{
  const pts=[[0,2],[1.6,-1.3],[.6,-.7],[0,-1.1],[-.6,-.7],[-1.6,-1.3]].map(([x,y])=>new THREE.Vector3(x,y,0));
  ship.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),glowMat('#bff8ff',2.4)));
  const inner=[[0,.9],[.6,-.5],[-.6,-.5]].map(([x,y])=>new THREE.Vector3(x,y,0));
  ship.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(inner),glowMat('#22e6ff',2)));
  scene.add(ship);
}
const shieldMat=glowMat('#22e6ff',1.6);
const shieldLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5,0,0),new THREE.Vector3(.5,0,0)]),shieldMat);
scene.add(shieldLine);

export function resize(){
  V.W=innerWidth;V.H=innerHeight;const asp=V.W/V.H;
  V.VH=Math.max(72,100/asp);V.VW=V.VH*asp;V.PX=V.H/V.VH;
  camera.aspect=asp;camera.position.set(0,0,V.VH/2/FOV_T);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  renderer.setSize(V.W,V.H,false);composer.setSize(V.W,V.H);
  const bottomPx=TOUCH?270:150;
  document.documentElement.style.setProperty('--inb',(TOUCH?150:16)+'px');
  V.SHIELD_Y=-V.VH/2+bottomPx/V.PX;V.SHIP_Y=V.SHIELD_Y-48/V.PX;
  ship.position.set(0,V.SHIP_Y,0);
  shieldLine.position.set(0,V.SHIELD_Y,0);shieldLine.scale.set(V.VW,1,1);
  buildGrid();
}
addEventListener('resize',resize);
resize();

// simulation step (skipped while paused)
export function fxStep(dt){
  fireworksStep(dt);particlesStep(dt);wavesStep(dt);
  gridStep(dt/2);gridStep(dt/2);
}
// draw a frame. o: {ship, shield, lifeFrac, time, dt, paused}
export function fxRender(o){
  const dt=o.dt;
  gridRender();
  labelsEl.classList.toggle('frozen',o.paused);
  ship.visible=o.ship;shieldLine.visible=o.shield;
  FX.shipAim*=Math.pow(.15,dt);FX.shipAimCur+=(FX.shipAim-FX.shipAimCur)*Math.min(1,dt*14);ship.rotation.z=FX.shipAimCur;
  FX.shieldFlash=Math.max(0,FX.shieldFlash-dt*1.5);
  const lf=o.lifeFrac;
  shieldMat.color.set(lf>.6?'#22e6ff':lf>.3?'#fff23a':'#ff2a6d').multiplyScalar(1.3+FX.shieldFlash*5+(lf<=.3?Math.sin(o.time*8)*.5+.5:0));
  FX.shake=Math.max(0,FX.shake-dt*2.6);
  camera.position.x=(Math.random()-.5)*FX.shake;camera.position.y=(Math.random()-.5)*FX.shake;
  FX.aberr*=Math.pow(.03,dt);
  post.uniforms.amt.value=.002+Math.min(FX.aberr,.02);post.uniforms.time.value=o.time%100;
  composer.render();
}
