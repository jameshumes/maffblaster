import {ri,range,pairs,noTens} from '../util.js';
import {fkey} from '../save.js';
import {P,X} from './common.js';

const nt=(a,b)=>{let n;do n=ri(a,b);while(!noTens(n));return n}; // random, never a round ten
function mul(a,b,hint){if(Math.random()<.5)[a,b]=[b,a];return P(fkey(a,b),[{t:`${a} ${X} ${b}`,a:a*b,op:{o:'x',a,b}}],{hint})}
const mk={
  mul:(a,b)=>mul(a,b),
  sq:(n)=>P(fkey(n,n),[{t:`${n}²`,a:n*n,op:{o:'x',a:n,b:n}}]),
  x11:(a,n)=>{const d1=Math.floor(n/10),d2=n%10;return P(fkey(11,n),[{t:`11 ${X} ${n}`,a:11*n,op:{o:'x',a:11,b:n}}],{hint:`${d1} · ${d1}+${d2} · ${d2}`})},
  same:(a,b)=>{const t=Math.floor(a/10);return mul(a,b,`${t}×${t+1} | ${a%10}×${b%10}`)},
  near:(a,b)=>mul(a,b,`${a}−${100-b} | ${100-a}×${100-b}`),
  half:(n,k)=>{const h=k===5?(n%2?`${n*10} ÷ 2`:`${n/2} × 10`):k===25?`${n/4} × 100`:`${n/2} × 100`;return mul(n,k,h)},
  twin:(c,d)=>mul(c-d,c+d,`${c}² − ${d}²`),
  boss:(a,b,src)=>P(fkey(a,b),bossLayers(a,b,src.layers)),
};
// Break a 2x2 product into shield layers. n=3 full scaffold, 2 half, 1 naked.
function bossLayers(a,b,n){
  let x=a,y=b;
  const r8=v=>v%10>=8;
  if(r8(y)&&!r8(x)||(!r8(x)&&!r8(y)&&y%10<x%10))[x,y]=[y,x]; // split the roundable / smaller-ones number
  const o=x%10,T=x-o,main=`${x} ${X} ${y}`;
  let L;
  const ox=(a,b)=>({o:'x',a,b});
  if(o>=8){const R=T+10,d=R-x;L=[{t:`${R} ${X} ${y}`,a:R*y,op:ox(R,y)},{t:`${d} ${X} ${y}`,a:d*y,op:ox(d,y)},{t:`${R*y} − ${d*y}`,a:x*y,op:{o:'-',a:R*y,b:d*y}}]}
  else L=[{t:`${T} ${X} ${y}`,a:T*y,op:ox(T,y)},{t:`${o} ${X} ${y}`,a:o*y,op:ox(o,y)},{t:`${T*y} + ${o*y}`,a:x*y,op:{o:'+',a:T*y,b:o*y}}];
  if(n>=3)return L.map(l=>({...l,sub:main}));
  if(n===2)return[{...L[0],sub:main},{t:main,a:x*y,op:ox(x,y),sub:o>=8?`${T+10}×${y} − ${10-o}×${y}`:`${T}×${y} + ${o}×${y}`}];
  return[{t:main,a:x*y,op:ox(x,y)}];
}

export const WORLDS=[
  {name:'TABLES',sub:'the foundation',color:'#22e6ff'},
  {name:'EXTENDED TABLES',sub:'11 through 20',color:'#4dff6a'},
  {name:'SQUARES',sub:'anchors for every trick',color:'#ff3df0'},
  {name:'2-DIGIT × 1-DIGIT',sub:'the core building block',color:'#ffa31a'},
  {name:'PATTERNS',sub:'spot the shortcut',color:'#fff23a'},
  {name:'TWINS',sub:'difference of squares',color:'#a66bff'},
  {name:'BOSSES',sub:'2-digit × 2-digit',color:'#ff2a6d'},
  {name:'GAUNTLET',sub:'everything at once',color:'#ffffff'},
];
// kind → enemy look; fall = seconds to reach shield (normal speed); par = avg seconds/answer for 3 stars
export const LEVELS=[
  {id:'t1',w:0,kind:'tbl',name:'Tables 2–5',pool:()=>pairs(range(2,5),range(2,10)),count:24,conc:4,fall:10,par:2,pts:10,
   tip:`Instant recall is the foundation of everything else. Don't calculate, <b>know</b>. Aim for under 2 seconds per answer.`},
  {id:'t2',w:0,kind:'tbl',name:'Tables 6–9',pool:()=>pairs(range(6,9),range(2,10)),count:28,conc:4,fall:10,par:2,pts:10,
   tip:`The tough ones live here: <b>6×7=42 · 6×8=48 · 7×8=56 · 7×9=63 · 8×9=72</b>. Slow facts come back more often until they stick.`},
  {id:'t3',w:0,kind:'tbl',name:'Tables Gauntlet',pool:()=>pairs(range(2,10),range(2,10)),count:40,conc:5,fall:8,par:2,pts:12,
   tip:`Everything up to 10 × 10, faster. Clear the lowest enemies first.`},
  {id:'e1',w:1,kind:'ext',name:'11s & 12s',pool:()=>pairs([11,12],range(2,12)),count:24,conc:3,fall:11,par:2.5,pts:20,
   tip:`Ten-times plus a bit: <b>12 × 7 = 70 + 14 = 84</b>. Then memorise it so you never compute it again.`},
  {id:'e2',w:1,kind:'ext',name:'13s – 15s',pool:()=>pairs([13,14,15],range(2,15)),count:30,conc:3,fall:12,par:3,pts:20,
   tip:`Split the teen: <b>13 × 7 = 70 + 21 = 91</b>. 15s are halves of 30s: <b>15 × 8 = 120</b>.`},
  {id:'e3',w:1,kind:'ext',name:'16s – 20s',pool:()=>pairs(range(16,20),range(2,20)),count:30,conc:3,fall:13,par:3.5,pts:25,
   tip:`Round up when it helps: <b>19 × 7 = 140 − 7 = 133</b>, <b>18 × 6 = 120 − 12 = 108</b>.`},
  {id:'e4',w:1,kind:'ext',name:'Extended Gauntlet',pool:()=>pairs(range(11,20),range(2,20)),count:40,conc:4,fall:12,par:3,pts:25,
   tip:`The full extended table. When 13 × 17 = 221 is a <b>fact</b> rather than a calculation, big multiplications collapse.`},
  {id:'s1',w:2,kind:'sq',name:'Squares to 25',pool:()=>range(2,25).map(n=>[n,n]),make:mk.sq,count:24,conc:3,fall:12,par:2.5,pts:20,
   tip:`Know <b>11² … 25²</b> cold: 121, 144, 169, 196, 225, 256, 289, 324, 361, 400, 441, 484, 529, 576, 625.`},
  {id:'s2',w:2,kind:'sq',name:'Squares 26–50',pool:()=>range(26,50).map(n=>[n,n]),make:mk.sq,count:25,conc:3,fall:16,par:5,pts:40,
   tip:`Work from 50² = 2500: <b>(50−d)² = 2500 − 100d + d²</b>. So <b>47² = 2500 − 300 + 9 = 2209</b>. Squares ending in 5: <b>35² = 3×4 | 25 = 1225</b>.`},
  {id:'m1',w:3,kind:'2x1',name:'2×1 Light',pool:()=>pairs(range(12,49).filter(noTens),range(2,9)),count:24,conc:3,fall:13,par:3.5,pts:30,
   tip:`Go <b>left to right</b>: 7 × 46 → 7×40 = <b>280</b>, + 7×6 = 42 → <b>322</b>. Say the big part first, then add the small part.`},
  {id:'m2',w:3,kind:'2x1',name:'2×1 Heavy',pool:()=>pairs(range(51,99).filter(noTens),range(6,9)),count:24,conc:3,fall:15,par:4.5,pts:40,
   tip:`Same method, bigger numbers: 8 × 76 → 560 + 48 = <b>608</b>. Numbers ending in 8 or 9? Round: 7 × 98 = 700 − 14 = <b>686</b>.`},
  {id:'p1',w:4,kind:'pat',name:'Times 11',pool:()=>range(12,99).filter(n=>noTens(n)).map(n=>[11,n]),make:mk.x11,hintFrac:.5,count:20,conc:3,fall:14,par:3,pts:40,
   tip:`Spread the digits and drop their sum in the middle: <b>11 × 43 → 4 (4+3) 3 = 473</b>. If the middle carries: 11 × 87 → 8 (15) 7 → <b>957</b>.`},
  {id:'p2',w:4,kind:'pat',name:'Same Tens, Ones Make 10',pool:()=>{const o=[];for(let t=1;t<=9;t++)for(let u=1;u<=5;u++)o.push([10*t+u,10*t+10-u]);return o},make:mk.same,hintFrac:.5,count:20,conc:3,fall:16,par:4,pts:50,
   tip:`43 × 47: tens × next-ten <b>4×5 = 20</b>, then ones <b>3×7 = 21</b> → <b>2021</b>. Ones part is always two digits: 41×49 → 20 | 09 = 2009.`},
  {id:'p3',w:4,kind:'pat',name:'Near 100',pool:()=>{const o=[];for(let a=91;a<=99;a++)for(let b=a;b<=99;b++)o.push([a,b]);return o},make:mk.near,hintFrac:.5,count:20,conc:3,fall:18,par:4.5,pts:50,
   tip:`97 × 94: how far below 100? 3 and 6. Cross-subtract <b>97 − 6 = 91</b>, multiply the gaps <b>3 × 6 = 18</b> → <b>9118</b>.`},
  {id:'p4',w:4,kind:'pat',name:'Halve & Double',pool:()=>[...range(12,99).filter(noTens).map(n=>[n,5]),...range(12,96,4).filter(noTens).map(n=>[n,25]),...range(12,48,2).filter(noTens).map(n=>[n,50])],make:mk.half,hintFrac:.5,count:20,conc:3,fall:14,par:3.5,pts:40,
   tip:`×5 is ×10 halved: <b>5 × 46 = 230</b>. ×25 is ×100 quartered: <b>25 × 36 = 900</b>. Also works mid-problem: <b>16 × 45 = 8 × 90 = 720</b>.`},
  {id:'w1',w:5,kind:'twin',name:'Twins on 10s',pool:()=>{const o=[];for(let c=20;c<=90;c+=10)for(let d=1;d<=9;d++)if(c-d>10)o.push([c,d]);return o},make:mk.twin,key:(c,d)=>fkey(c-d,c+d),hintFrac:.5,count:16,conc:2,fall:18,par:4.5,pts:60,
   tip:`Two numbers the same distance from a round number: <b>47 × 53 = 50² − 3² = 2500 − 9 = 2491</b>. This is why squares matter.`},
  {id:'w2',w:5,kind:'twin',name:'Twins on 5s',pool:()=>{const o=[];for(let c=15;c<=95;c+=10)for(let d=1;d<=4;d++)if(c-d>10)o.push([c,d]);return o},make:mk.twin,key:(c,d)=>fkey(c-d,c+d),hintFrac:.5,count:16,conc:2,fall:18,par:5,pts:60,
   tip:`Center on a number ending in 5: <b>33 × 37 = 35² − 2² = 1225 − 4 = 1221</b>. And 35² = 3×4 | 25.`},
  {id:'b1',w:6,kind:'boss',layers:3,name:'Boss: Full Scaffold',gen:()=>[nt(13,69),nt(12,49)],make:mk.boss,count:8,conc:2,fall:50,par:5,pts:60,
   tip:`Each shield is one step. <b>47 × 36 = 40×36 + 7×36 = 1440 + 252 = 1692</b>. Numbers ending in 8 or 9 round up: <b>49 × 36 = 50×36 − 36</b>.`},
  {id:'b2',w:6,kind:'boss',layers:2,name:'Boss: Half Scaffold',gen:()=>[nt(13,99),nt(12,79)],make:mk.boss,count:10,conc:2,fall:45,par:9,pts:90,
   tip:`Now you only get the first partial product. <b>Hold it in your head</b> while you compute the rest and add. This is the real skill.`},
  {id:'b3',w:6,kind:'boss',layers:1,name:'Boss: Naked',gen:()=>[nt(12,99),nt(12,99)],make:mk.boss,count:12,conc:2,fall:40,par:14,pts:200,
   tip:`No shields. Pick your weapon: <b>split</b> (40×36 + 7×36), <b>round</b> (50×36 − 36), <b>twins</b> (47×53), <b>halve & double</b> (24×35 = 12×70), or <b>factor</b>.`},
  {id:'g1',w:7,kind:'mix',name:'The Gauntlet',mix:['t3','e4','s1','m2','p1','p2','p3','p4','w1','b3'],count:60,conc:4,fall:1,par:5,pts:1,
   tip:`Every enemy type at once, accelerating every wave. How long can you hold the multiplier?`},
];// table levels just multiply their pair
for(const lv of LEVELS)if(!lv.make&&!lv.mix)lv.make=mk.mul;

export default {id:'mul',name:'MULTIPLICATION',sub:'tables to 2-digit × 2-digit',color:'#ff2a6d',
  worlds:WORLDS,levels:LEVELS,
  mastery:{from:2,to:20,key:fkey,sym:'×',calc:(a,b)=>a*b,squares:true,match:k=>k.includes('x')}};
