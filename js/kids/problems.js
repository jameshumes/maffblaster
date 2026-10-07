// Kid-sized math. Every problem is about real things (fish, cookies, stars) and comes with
// the words to say it out loud, so nothing depends on reading.
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

// kind: count | add | make10 | sub
const P=(kind,a,b,ans,o,say)=>({kind,a,b,ans,o,say});
const gens={
  count5:()=>{const n=ri(1,5),o=pick(OBJECTS);return P('count',n,0,n,o,`How many ${o.many}?`)},
  count10:()=>{const n=ri(4,10),o=pick(OBJECTS);return P('count',n,0,n,o,`How many ${o.many}?`)},
  add5:()=>{const a=ri(1,4),b=ri(1,5-a),o=pick(OBJECTS);return P('add',a,b,a+b,o,`${nm(a,o)}, plus ${nm(b,o)}. How many?`)},
  add10:()=>{let a,b;do{a=ri(1,9);b=ri(1,9)}while(a+b>10||a+b<4);const o=pick(OBJECTS);return P('add',a,b,a+b,o,`${a} plus ${b}?`)},
  doubles:()=>{const a=ri(1,5),o=pick(OBJECTS);return P('add',a,a,a+a,o,`Double ${a}! ${a} plus ${a}?`)},
  make10:()=>{const a=ri(1,9),o=pick(OBJECTS);return P('make10',a,10-a,10-a,o,`${a} and how many more make 10?`)},
  sub10:()=>{const a=ri(3,10),b=ri(1,a-1),o=pick(OBJECTS);return P('sub',a,b,a-b,o,`${nm(a,o)}. ${b} ${b===1?'goes':'go'} away. How many are left?`)},
};
gens.mix=()=>pick([gens.add10,gens.make10,gens.sub10,gens.doubles])();

export const SKILLS=[
  {id:'count5',name:'Count to 5',icon:'🖐️'},
  {id:'add5',name:'Add to 5',icon:'➕'},
  {id:'count10',name:'Count to 10',icon:'🔟'},
  {id:'doubles',name:'Doubles',icon:'👯'},
  {id:'add10',name:'Add to 10',icon:'🧮'},
  {id:'make10',name:'Make 10',icon:'🤝'},
  {id:'sub10',name:'Take Away',icon:'➖'},
  {id:'mix',name:'Mix It Up',icon:'🎲'},
];
export function makeProblem(skill,avoid){
  let p;for(let i=0;i<20;i++){p=gens[skill]();if(!avoid||p.ans!==avoid.ans||p.a!==avoid.a)break}
  return p;
}
// the easiest version of a skill's problems, for "watch me" demos
export function demoProblem(skill){
  const o=pick(OBJECTS);
  if(skill.startsWith('count'))return P('count',2,0,2,o,`How many ${o.many}?`);
  if(skill==='make10')return P('make10',8,2,2,o,`8 and how many more make 10?`);
  if(skill==='sub10')return P('sub',3,1,2,o,`${nm(3,o)}. 1 goes away. How many are left?`);
  return P('add',1,1,2,o,`${nm(1,o)}, plus ${nm(1,o)}. How many?`);
}
// three nearby choices, shuffled
export function choicesFor(ans){
  const c=[ans];
  for(const v of shuffle([ans+1,ans-1,ans+2,ans-2,ans+3]))if(c.length<3&&v>=0&&v<=20&&!c.includes(v))c.push(v);
  return shuffle(c);
}
// the sentence that teaches the answer
export function answerSay(p){
  if(p.kind==='count')return`${nm(p.ans,p.o)}!`;
  if(p.kind==='make10')return`${p.a} and ${p.ans} make 10!`;
  if(p.kind==='sub')return`${p.a} take away ${p.b} is ${p.ans}!`;
  return`${p.a} plus ${p.b} is ${p.ans}!`;
}
export function eqText(p,solved){
  const q=solved?String(p.ans):'?';
  if(p.kind==='count')return`= ${q}`;
  if(p.kind==='make10')return`${p.a} + ${q} = 10`;
  if(p.kind==='sub')return`${p.a} − ${p.b} = ${q}`;
  return`${p.a} + ${p.b} = ${q}`;
}
