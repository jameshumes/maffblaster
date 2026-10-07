// Kid-sized math (aimed at 7–8 year olds: within 20, tens, 2-digit, first times tables).
// Every problem is about real things and comes with the words to say it out loud.
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
const nm=(n,o)=>`${n} ${n===1?o.one:o.many}`;

// kind: count | add | make10 | sub | mul.  step: how far apart sensible wrong answers are.
// think: extra time for harder problems
const P=(kind,a,b,ans,o,say,extra={})=>({kind,a,b,ans,o,say,step:1,think:1,...extra});
const gens={
  count5:()=>{const n=ri(1,5),o=pick(OBJECTS);return P('count',n,0,n,o,`How many ${o.many}?`)},
  add10:()=>{let a,b;do{a=ri(1,9);b=ri(1,9)}while(a+b>10||a+b<4);const o=pick(OBJECTS);return P('add',a,b,a+b,o,`${a} plus ${b}?`)},
  make10:()=>{const a=ri(1,9),o=pick(OBJECTS);return P('make10',a,10-a,10-a,o,`${a} and how many more make 10?`)},
  add20:()=>{let a,b;do{a=ri(2,9);b=ri(2,9)}while(a+b<=10);const o=pick(OBJECTS);return P('add',a,b,a+b,o,`${a} plus ${b}?`)},
  doubles:()=>{
    const a=ri(3,10),o=pick(OBJECTS);
    if(Math.random()<.4&&a<10)return P('add',a,a+1,a+a+1,o,`${a} plus ${a+1}? It's a near double!`);
    return P('add',a,a,a+a,o,`Double ${a}! ${a} plus ${a}?`);
  },
  sub20:()=>{const a=ri(11,18),b=ri(2,9),o=pick(OBJECTS);return P('sub',a,b,a-b,o,`${nm(a,o)}. ${b} go away. How many are left?`,{think:1.2})},
  tens:()=>{
    const o=pick(OBJECTS);
    if(Math.random()<.5){const a=ri(1,8)*10,b=ri(1,9-a/10)*10;return P('add',a,b,a+b,o,`${a} plus ${b}?`,{step:10,think:1.2})}
    const a=ri(3,9)*10,b=ri(1,a/10-1)*10;return P('sub',a,b,a-b,o,`${a} take away ${b}?`,{step:10,think:1.2});
  },
  add2d:()=>{let a,b;do{a=ri(12,89);b=ri(2,9)}while(!(a%10));const o=pick(OBJECTS);return P('add',a,b,a+b,o,`${a} plus ${b}?`,{think:1.4})},
  times:()=>{
    const n=pick([2,5,10]),k=n===10?ri(2,6):ri(2,6),o=pick(OBJECTS);
    return P('mul',k,n,k*n,o,`${k} groups of ${n}. ${k} times ${n}?`,{step:n,think:1.5});
  },
};
gens.mix=()=>pick([gens.add20,gens.sub20,gens.doubles,gens.tens,gens.add2d,gens.times])();

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
  const gen=gens[skill]||gens.add10;
  let p;for(let i=0;i<20;i++){p=gen();if(!avoid||p.ans!==avoid.ans||p.a!==avoid.a)break}
  return p;
}
// the easiest version of a skill's problems, for "watch me" demos
export function demoProblem(skill){
  const o=pick(OBJECTS);
  if(skill==='make10')return P('make10',8,2,2,o,`8 and how many more make 10?`);
  if(skill==='sub20')return P('sub',5,2,3,o,`${nm(5,o)}. 2 go away. How many are left?`);
  if(skill==='tens')return P('add',10,10,20,o,`10 plus 10?`,{step:10});
  if(skill==='times')return P('mul',2,2,4,o,`2 groups of 2. 2 times 2?`,{step:2});
  return P('add',2,1,3,o,`${nm(2,o)}, plus ${nm(1,o)}. How many?`);
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
  if(p.kind==='count')return`${nm(p.ans,p.o)}!`;
  if(p.kind==='make10')return`${p.a} and ${p.ans} make 10!`;
  if(p.kind==='sub')return`${p.a} take away ${p.b} is ${p.ans}!`;
  if(p.kind==='mul')return`${p.a} times ${p.b} is ${p.ans}!`;
  return`${p.a} plus ${p.b} is ${p.ans}!`;
}
export function eqText(p,solved){
  const q=solved?String(p.ans):'?';
  if(p.kind==='count')return`= ${q}`;
  if(p.kind==='make10')return`${p.a} + ${q} = 10`;
  if(p.kind==='sub')return`${p.a} − ${p.b} = ${q}`;
  if(p.kind==='mul')return`${p.a} × ${p.b} = ${q}`;
  return`${p.a} + ${p.b} = ${q}`;
}
