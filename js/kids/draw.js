// Canvas helpers shared by the kids games: cached emoji sprites, shapes, text, particles,
// and the problem card that shows numbers as real things.
import {rand,clamp} from '../util.js';
import {NUM_COLORS,eqText} from './problems.js';

export const FONT='Fredoka,"Exo 2",sans-serif';
const EMOJI_FONT='"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
export const view={dpr:1};

// emoji are rendered once per size bucket into small canvases, then blitted
const cache=new Map();
function sprite(ch,px){
  px=Math.max(12,Math.min(512,Math.ceil(px/8)*8));
  const k=ch+'|'+px;let c=cache.get(k);
  if(!c){
    c=document.createElement('canvas');const pad=Math.ceil(px*.3);c.width=c.height=px+pad*2;
    const g=c.getContext('2d');g.font=`${px}px ${EMOJI_FONT}`;g.textAlign='center';g.textBaseline='middle';
    g.fillText(ch,c.width/2,c.height/2+px*.06);
    cache.set(k,c);
  }
  return c;
}
// draw an emoji centred at x,y with the given height
export function emo(g,ch,x,y,size,rot=0,alpha=1,flip=false){
  if(size<2||alpha<=0)return;
  const c=sprite(ch,size*view.dpr);
  const d=size*1.6;
  g.save();g.globalAlpha*=alpha;g.translate(x,y);if(rot)g.rotate(rot);if(flip)g.scale(-1,1);
  g.drawImage(c,-d/2,-d/2,d,d);g.restore();
}
export function rr(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r)}
export function txt(g,s,x,y,size,color='#2b2d42',{stroke=0,sc='#fff',align='center',weight=700,base='middle'}={}){
  g.font=`${weight} ${size}px ${FONT}`;g.textAlign=align;g.textBaseline=base;
  if(stroke){g.lineJoin='round';g.lineWidth=stroke;g.strokeStyle=sc;g.strokeText(s,x,y)}
  g.fillStyle=color;g.fillText(s,x,y);
}
// a string where every digit wears its number color
export function colorText(g,s,x,y,size,{stroke=0,dark='#2b2d42'}={}){
  g.font=`700 ${size}px ${FONT}`;g.textBaseline='middle';g.textAlign='left';
  const w=g.measureText(s).width;let cx=x-w/2;
  for(const ch of s){
    const cw=g.measureText(ch).width;
    if(stroke){g.lineJoin='round';g.lineWidth=stroke;g.strokeStyle='#fff';g.strokeText(ch,cx,y)}
    g.fillStyle=/\d/.test(ch)?NUM_COLORS[ch]:dark;g.fillText(ch,cx,y);cx+=cw;
  }
  return w;
}
export const lerp=(a,b,t)=>a+(b-a)*t;
export const ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
export function mixColor(a,b,t){
  const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const A=p(a),B=p(b);return`rgb(${A.map((v,i)=>Math.round(lerp(v,B[i],t))).join(',')})`;
}

// ---------- particles ----------
export class Parts{
  constructor(){this.a=[]}
  add(o){this.a.push({x:0,y:0,vx:0,vy:0,grav:0,drag:0,life:1,t:0,size:8,rot:0,spin:0,color:'#fff',kind:'dot',...o})}
  confetti(x,y,n=40,colors=['#ff3b3b','#ffb000','#22a045','#3a86ff','#9b5de5','#ff4f9a'],power=1){
    for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(150,520)*power;
      this.add({kind:'conf',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-200*power,grav:700,drag:1.6,life:rand(1.2,2.2),size:rand(7,13),spin:rand(-12,12),color:colors[i%colors.length]})}
  }
  sparkle(x,y,n=12,spread=90){
    for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(40,spread*2.4);
      this.add({kind:'emoji',ch:i%3?'✨':'⭐',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,drag:2,life:rand(.6,1.1),size:rand(16,30),spin:rand(-4,4)})}
  }
  puff(x,y,n=6,color='#ffffff',size=26){
    for(let i=0;i<n;i++)this.add({kind:'puff',x:x+rand(-10,10),y:y+rand(-6,6),vx:rand(-40,40),vy:rand(-60,-10),drag:1.5,life:rand(.5,.9),size:rand(size*.6,size*1.3),color})
  }
  update(dt){
    for(let i=this.a.length-1;i>=0;i--){
      const p=this.a[i];p.t+=dt;if(p.t>=p.life){this.a.splice(i,1);continue}
      const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d+p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.spin*dt;
    }
  }
  draw(g){
    for(const p of this.a){
      const f=p.t/p.life,al=f>.7?(1-f)/.3:1;
      g.globalAlpha=al;
      if(p.kind==='conf'){g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.scale(1,Math.cos(p.t*9));g.fillStyle=p.color;g.fillRect(-p.size/2,-p.size/3,p.size,p.size*.66);g.restore()}
      else if(p.kind==='emoji'){g.globalAlpha=1;emo(g,p.ch,p.x,p.y,p.size*(p.grow?1+f*p.grow:1),p.rot,al)}
      else if(p.kind==='puff'){g.fillStyle=p.color;g.beginPath();g.arc(p.x,p.y,p.size*(.6+f*.8),0,7);g.fill()}
      else if(p.kind==='ring'){g.strokeStyle=p.color;g.lineWidth=6*(1-f);g.beginPath();g.arc(p.x,p.y,p.size*(.2+f),0,7);g.stroke()}
      else{g.fillStyle=p.color;g.beginPath();g.arc(p.x,p.y,p.size*(1-f*.5),0,7);g.fill()}
    }
    g.globalAlpha=1;
  }
}

// ---------- the problem card: numbers as things ----------
// lays out a group of n objects in rows of up to 5
function groupSize(n,s){const cols=Math.min(n,5),rows=Math.ceil(n/5);return[cols*s*1.08,rows*s*1.08]}
function drawGroup(g,n,ch,x,y,s,t,cross=0,wiggle=0){
  const cols=Math.min(n,5);
  for(let i=0;i<n;i++){
    const cx=x+(i%cols+.5)*s*1.08,cy=y+(Math.floor(i/5)+.5)*s*1.08,gone=i>=n-cross;
    const bob=Math.sin(t*4+i*.9)*s*.05*wiggle;
    emo(g,ch,cx,cy+bob,s,Math.sin(t*3+i)*.08*wiggle,gone?.3:1);
    if(gone){g.strokeStyle='#ff3b3b';g.lineWidth=s*.12;g.lineCap='round';g.beginPath();
      g.moveTo(cx-s*.32,cy-s*.32);g.lineTo(cx+s*.32,cy+s*.32);g.moveTo(cx+s*.32,cy-s*.32);g.lineTo(cx-s*.32,cy+s*.32);g.stroke()}
  }
}
// a "ten bar": ten blocks stacked, the way school shows place value
function tenBar(g,x,y,bw,bh){
  g.fillStyle='#3a86ff';rr(g,x,y,bw,bh,bw*.25);g.fill();
  g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.5;
  for(let i=1;i<10;i++){g.beginPath();g.moveTo(x+2,y+bh*i/10);g.lineTo(x+bw-2,y+bh*i/10);g.stroke()}
}
// every picture part is {w,h,draw(x,y)}: objects, tens+ones, equal groups, a ten frame, or a sign
function partFor(q,p,s,st){
  const ch=p.o.e;
  if(q[0]==='g'){const [w,h]=groupSize(q[1],s);return{w,h,draw:(x,y)=>drawGroup(g0,q[1],ch,x,y,s,st.t,q[2]||0,1)}}
  if(q[0]==='sym')return{w:s*.9,h:s,draw:(x,y)=>txt(g0,q[1],x+s*.45,y+s*.5,s,'#2b2d42')};
  if(q[0]==='base'){ // tens bars + ones
    const n=q[1],T=Math.floor(n/10),O=n%10,bw=s*.42,bh=s*2.6,os=s*.62,oc=Math.min(O,5),orows=Math.ceil(O/5);
    const w=T*bw*1.3+(O?oc*os*1.05+s*.2:0),h=Math.max(T?bh:0,orows*os*1.05);
    return{w,h,draw:(x,y)=>{
      for(let i=0;i<T;i++)tenBar(g0,x+i*bw*1.3,y+(h-bh)/2,bw,bh);
      const ox=x+T*bw*1.3+(T?s*.2:0);
      for(let i=0;i<O;i++)emo(g0,ch,ox+(i%5+.5)*os*1.05,y+(h-orows*os*1.05)/2+(Math.floor(i/5)+.5)*os*1.05+Math.sin(st.t*4+i)*2,os);
    }};
  }
  if(q[0]==='mul'){ // k bubbles of n
    const k=q[1],n=q[2],os=s*.55,inner=n===10?[s*.5,s*2.2]:[Math.min(n,5)*os*1.05,Math.ceil(n/5)*os*1.05];
    const bw=inner[0]+s*.4,bh=inner[1]+s*.4,per=Math.min(k,3),rows=Math.ceil(k/3);
    const w=per*bw+(per-1)*s*.25,h=rows*bh+(rows-1)*s*.25;
    return{w,h,draw:(x,y)=>{
      for(let i=0;i<k;i++){
        const bx=x+(i%3)*(bw+s*.25),by=y+Math.floor(i/3)*(bh+s*.25);
        g0.fillStyle='#fff6d6';g0.strokeStyle='#ffc94d';g0.lineWidth=3;rr(g0,bx,by,bw,bh,s*.3);g0.fill();g0.stroke();
        if(n===10)tenBar(g0,bx+(bw-s*.5)/2,by+s*.2,s*.5,s*2.2);
        else for(let j=0;j<n;j++)emo(g0,ch,bx+s*.2+(j%5+.5)*os*1.05,by+s*.2+(Math.floor(j/5)+.5)*os*1.05+Math.sin(st.t*4+i+j)*2,os);
      }
    }};
  }
  // ten frame: a filled, the rest empty
  const c=s*1.15;
  return{w:c*5,h:c*2,draw:(x,y)=>{
    for(let j=0;j<10;j++){const fx=x+(j%5)*c,fy=y+Math.floor(j/5)*c;
      g0.fillStyle=j<p.a?'#fff6d6':'#f1f3f8';g0.strokeStyle='#c9cfdb';g0.lineWidth=2;rr(g0,fx+2,fy+2,c-4,c-4,8);g0.fill();g0.stroke();
      if(j<p.a)emo(g0,ch,fx+c/2,fy+c/2,s*.85);
      else if(st.solved)emo(g0,ch,fx+c/2,fy+c/2,s*.85,0,.9);
      else txt(g0,'?',fx+c/2,fy+c/2,s*.6,'#c9cfdb')}
  }};
}
let g0=null;
// card centred at (cx, top). st: {solved, pop (0..1 entrance), t}
export function drawProblem(g,p,cx,top,W,st){
  g0=g;
  const big=Math.max(p.a,p.b,p.kind==='sub'?0:p.ans)>20;
  const s=clamp(W*.036,24,44)*(big||p.kind==='mul'?.85:1),pad=s*.5;
  let parts;
  if(p.kind==='count')parts=[['g',p.a]];
  else if(p.kind==='make10')parts=[['frame']];
  else if(p.kind==='mul')parts=[['mul',p.a,p.b]];
  else if(p.kind==='sub')parts=p.a>20?[['base',p.a]]:[['g',p.a,p.b]];
  else parts=big?[['base',p.a],['sym','+'],['base',p.b]]:[['g',p.a],['sym','+'],['g',p.b]];
  const items=parts.map(q=>partFor(q,p,s,st));
  const vw=items.reduce((a,b)=>a+b.w,0)+pad*(items.length-1),vh=Math.max(...items.map(z=>z.h));
  const eqS=s*1.15,w=Math.max(vw,s*5)+pad*2,h=vh+eqS*1.5+pad*2;
  const k=st.pop<1?ease(clamp(st.pop,0,1)):1;
  g.save();g.translate(cx,top+h/2);g.scale(.6+.4*k,.6+.4*k);g.globalAlpha=k;g.translate(-cx,-(top+h/2));
  g.fillStyle='rgba(0,0,0,.12)';rr(g,cx-w/2,top+6,w,h,22);g.fill();
  g.fillStyle='#fff';rr(g,cx-w/2,top,w,h,22);g.fill();
  if(st.solved){g.strokeStyle='#22c55e';g.lineWidth=6;rr(g,cx-w/2,top,w,h,22);g.stroke()}
  let x=cx-vw/2;const y=top+pad;
  items.forEach(it=>{it.draw(x,y+(vh-it.h)/2);x+=it.w+pad});
  colorText(g,eqText(p,st.solved),cx,top+pad+vh+eqS*.85,eqS);
  g.restore();
  return h;
}

// the pointing hand used by tutorials
export function drawHand(g,x,y,t,tap){
  const b=Math.sin(t*6)*6,sc=tap?1-.25*Math.sin(Math.min(1,tap)*Math.PI):1;
  emo(g,'👆',x+8,y+34+b,58*sc,-.25);
}
