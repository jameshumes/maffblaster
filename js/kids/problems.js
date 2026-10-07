// Kid-sized math (aimed at 7–8 year olds: within 20, tens, 2-digit, first times tables).
// Every problem is about real things and comes with the words to say it out loud.
// Problems are built from small parameter spaces so every sentence can be listed ahead of
// time and voiced by a neural voice (see allProblemLines).
import {ri,pick,shuffle} from '../util.js';

// every number always has the same color (association, never a hint on the answer choices)
export const NUM_COLORS=['#8d99ae','#ff8c1a','#ff3b3b','#e6b800','#9b5de5','#00a6c7','#3a86ff','#22a045','#ff4f9a','#a0522d'];
export const colorOf=n=>NUM_COLORS[((n%10)+10)%10];

export const OBJECTS=[
  {e:'🐟',one:'fish',many:'fish'},{e:'🍓',one:'strawberry',many:'strawberries'},{e:'⭐',one:'star',many:'stars'},
  {e:'🍪',one:'cookie',many:'cookies'},{e:'🦴',one:'bone',many:'bones'},{e:'🍎',one:'apple',many:'apples'},
  {e:'🧁',one:'cupcake',many:'cupcakes'},{e:'🐞',one:'ladybug',many:'ladybugs'},{e:'🍩',one:'donut',many:'donuts'},
  {e:'🦆',one:'duck',many:'ducks'},{e:'🌸',one:'flower',many:'flowers'},{e:'🐸',one:'frog',many:'frogs'},
];

// kind: add | make10 | sub | mul | skip.  step: how far apart sensible wrong answers are.  think: extra time
const P=(kind,a,b,ans,say,extra={})=>({kind,a,b,ans,say,step:1,think:1,o:pick(OBJECTS),...extra});
const B={
  add:(a,b,x)=>P('add',a,b,a+b,`${a} plus ${b}?`,x),
  near:a=>P('add',a,a+1,a+a+1,`${a} plus ${a+1}? It's a near double!`),
  dbl:a=>P('add',a,a,a+a,`Double ${a}! ${a} plus ${a}?`),
  make10:a=>P('make10',a,10-a,10-a,`${a} and how many more make 10?`),
  sub:(a,b,x)=>P('sub',a,b,a-b,`${a} take away ${b}?`,x),
  mul:(k,n)=>P('mul',k,n,k*n,`${k} groups of ${n}. ${k} times ${n}?`,{step:n,think:1.5}),
  skip:(a,n)=>P('skip',a,n,a+3*n,`${a}, ${a+n}, ${a+2*n}. What comes next?`,{step:n,think:1.3}),
};
// each skill: a random generator and the full list of what it can produce
const range=(a,b,s=1)=>{const o=[];for(let i=a;i<=b;i+=s)o.push(i);return o};
const SPACE={
  add10:()=>range(1,9).flatMap(a=>range(1,9).filter(b=>a+b<=10&&a+b>=4).map(b=>[B.add,a,b])),
  make10:()=>range(1,9).map(a=>[B.make10,a]),
  add20:()=>range(2,9).flatMap(a=>range(2,9).filter(b=>a+b>10).map(b=>[B.add,a,b])),
  doubles:()=>[...range(3,10).map(a=>[B.dbl,a]),...range(3,9).map(a=>[B.near,a])],
  sub20:()=>range(11,18).flatMap(a=>range(2,9).map(b=>[B.sub,a,b,{think:1.2}])),
  tens:()=>[...range(10,80,10).flatMap(a=>range(10,90-a,10).map(b=>[B.add,a,b,{step:10,think:1.2}])),
            ...range(30,90,10).flatMap(a=>range(10,a-10,10).map(b=>[B.sub,a,b,{step:10,think:1.2}]))],
  add2d:()=>range(12,59).filter(a=>a%10).flatMap(a=>range(3,9).map(b=>[B.add,a,b,{think:1.4}])),
  times:()=>[2,5,10].flatMap(n=>range(2,6).map(k=>[B.mul,k,n])),
  skip:()=>[...range(2,12,2).map(a=>[B.skip,a,2]),...range(5,35,5).map(a=>[B.skip,a,5]),...range(10,60,10).map(a=>[B.skip,a,10])],
};
SPACE.mix=()=>['add20','sub20','doubles','tens','add2d','times'].flatMap(s=>space(s));
const cache={};
// each entry remembers which skill it came from, so Mix It Up answers still count toward the right step
const space=s=>cache[s]||(cache[s]=(SPACE[s]||SPACE.add10)().map(e=>(e.sk??=s,e)));
const build=e=>{const [f,...args]=e,p=f(...args);if(e.sk)p.sk=e.sk;return p};

export const SKILLS=[
  {id:'add10',name:'Warm Up',icon:'🧮'},
  {id:'make10',name:'Make 10',icon:'🤝'},
  {id:'add20',name:'Add to 20',icon:'➕'},
  {id:'doubles',name:'Doubles',icon:'👯'},
  {id:'sub20',name:'Take Away',icon:'➖'},
  {id:'tens',name:'Tens',icon:'🔟'},
  {id:'add2d',name:'Big + Small',icon:'🔢'},
  {id:'times',name:'Times 2·5·10',icon:'✖️'},
  {id:'mix',name:'Mix It Up',icon:'🎲'},
];
export function makeProblem(skill,avoid){
  const sp=space(skill);
  let p;for(let i=0;i<20;i++){p=build(pick(sp));if(!avoid||p.ans!==avoid.ans||p.a!==avoid.a)break}
  return p;
}
// the easiest version of a skill's problems, for "watch me" demos
export function demoProblem(skill){
  if(skill==='make10')return B.make10(8);
  if(skill==='sub20')return B.sub(5,2);
  if(skill==='tens')return B.add(10,10,{step:10});
  if(skill==='times')return B.mul(2,2);
  return B.add(2,1);
}
// three nearby choices, shuffled
export function choicesFor(ans,step=1){
  const c=[ans],cand=shuffle([ans+step,ans-step,ans+2*step,ans-2*step]);
  if(step>1)cand.push(ans+1,ans-1);
  for(const v of cand)if(c.length<3&&v>=0&&v<=120&&!c.includes(v))c.push(v);
  return shuffle(c);
}
// the sentence that teaches the answer
export function answerSay(p){
  if(p.kind==='make10')return`${p.a} and ${p.ans} make 10!`;
  if(p.kind==='sub')return`${p.a} take away ${p.b} is ${p.ans}!`;
  if(p.kind==='mul')return`${p.a} times ${p.b} is ${p.ans}!`;
  if(p.kind==='skip')return`${p.a+2*p.b}, ${p.ans}! Counting by ${p.b}s.`;
  return`${p.a} plus ${p.b} is ${p.ans}!`;
}
export function eqText(p,solved){
  const q=solved?String(p.ans):'?';
  if(p.kind==='make10')return`${p.a} + ${q} = 10`;
  if(p.kind==='sub')return`${p.a} − ${p.b} = ${q}`;
  if(p.kind==='mul')return`${p.a} × ${p.b} = ${q}`;
  if(p.kind==='skip')return`${p.a}, ${p.a+p.b}, ${p.a+2*p.b}, ${q}`;
  return`${p.a} + ${p.b} = ${q}`;
}
// every sentence the narrator might say about problems, for the voice build
export function allProblemLines(){
  const out=new Set();
  const all=[...Object.keys(SPACE).flatMap(s=>space(s)),[B.make10,8],[B.sub,5,2],[B.add,10,10],[B.mul,2,2],[B.add,2,1]];
  for(const e of all){const p=build(e);out.add(p.say);out.add(answerSay(p))}
  return[...out].map(t=>['narrator',t]);
}
