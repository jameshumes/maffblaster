// The Kids learning path: an ordered syllabus of "I can..." steps (US Common Core K–2), the
// evidence every real answer adds to a step, and the badge checks that prove one.
// A step is READY when READY_OK of its last READY_N answers were right; its BADGE is earned by
// getting CHECK_PASS of CHECK_N right in a badge check (no demos, no pointing hand).
import {save,persist} from '../save.js';

export const READY_N=10,READY_OK=8,CHECK_N=10,CHECK_PASS=9;

export const STEPS=[
  {id:'add10',icon:'🧮',name:'Adding to 10',can:'I can add numbers up to 10.',grown:'Addition facts with sums up to 10, recalled quickly.',std:'K.OA.A.5 · 1.OA.C.6'},
  {id:'make10',icon:'🤝',name:'Make 10',can:'I know which numbers make 10.',grown:'Pairs that make 10, the key to adding and subtracting across ten.',std:'1.OA.C.6'},
  {id:'doubles',icon:'👯',name:'Doubles',can:'I know my doubles and near doubles.',grown:'Doubles up to 10 + 10 and near doubles like 6 + 7.',std:'1.OA.C.6'},
  {id:'add20',icon:'➕',name:'Adding to 20',can:'I can add numbers up to 20.',grown:'One-digit sums that cross ten (8 + 5); Feed the Dragon\'s "Make 20".',std:'1.OA.C.6 · 2.OA.B.2'},
  {id:'sub20',icon:'➖',name:'Take Away',can:'I can take away from numbers up to 20.',grown:'Subtracting from the teens, crossing ten (13 − 5).',std:'1.OA.C.6 · 2.OA.B.2'},
  {id:'skip',icon:'🍒',name:'Skip Counting',can:'I can count by 2s, 5s and 10s.',grown:'Skip counting by 2s, 5s and 10s.',std:'2.NBT.A.2'},
  {id:'tens',icon:'🔟',name:'Tens',can:'I can add and take away tens.',grown:'Adding and subtracting multiples of 10 (40 + 30, 70 − 20).',std:'1.NBT.C.4 · 1.NBT.C.6'},
  {id:'add2d',icon:'🔢',name:'Big + Small',can:'I can add a small number to a big number.',grown:'Two-digit plus one-digit, with and without regrouping (37 + 6).',std:'1.NBT.C.4'},
  {id:'times',icon:'✖️',name:'Times 2, 5, 10',can:'I can times by 2, 5 and 10.',grown:'Equal groups: ×2, ×5 and ×10 facts up to 6 groups.',std:'2.OA.C.4 · 3.OA.C.7'},
];
export const stepById=id=>STEPS.find(s=>s.id===id);
// which step a game's skill practices (Mix It Up is decided per problem, by problem.sk)
const DRAGON={more10:'make10',more20:'add20',by2:'skip',by5:'skip',by10:'skip'};
export function stepOf(gameId,skillId){
  if(gameId==='dragon')return DRAGON[skillId]||null;
  return stepById(skillId)?skillId:null;
}

const kid=()=>save.kid||(save.kid={log:{},tot:{},facts:{},badges:{},checks:{}});

// one real answer (not a demo or a guided try). fact: how it reads, e.g. "8 + 5 = ?"
export function recordAnswer(step,fact,ok,secs){
  if(!stepById(step))return;
  const k=kid(),l=k.log[step]||(k.log[step]=[]);
  l.push([ok?1:0,Math.round(secs*10)/10,Date.now()]);if(l.length>40)l.shift();
  k.tot[step]=(k.tot[step]||0)+1;
  const fk=step+'|'+fact,f=k.facts[fk]||(k.facts[fk]={n:0,ok:0,t:0});
  f.n++;if(ok){f.ok++;f.t=f.t?f.t*.65+secs*.35:secs}
  k.last=Date.now();
  persist();
}
export function recordCheck(step,score){
  const k=kid(),c=k.checks[step]||(k.checks[step]={tries:0,best:0});
  c.tries++;c.best=Math.max(c.best,score);c.last=Date.now();
  const pass=score>=CHECK_PASS;
  if(pass&&!k.badges[step])k.badges[step]={d:Date.now(),score};
  persist();return pass;
}

const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
// everything the path map and the grown-up report show about a step
export function stepInfo(s){
  const k=kid(),log=k.log[s.id]||[],recent=log.slice(-READY_N);
  const right=recent.reduce((a,r)=>a+r[0],0);
  const badge=k.badges[s.id]||null,total=k.tot[s.id]||0;
  const ready=recent.length>=READY_N&&right>=READY_OK;
  const facts=Object.entries(k.facts).filter(([key])=>key.startsWith(s.id+'|')).map(([key,f])=>({q:key.slice(s.id.length+1),...f}));
  const tricky=facts.filter(f=>f.ok<f.n).sort((a,b)=>(b.n-b.ok)/b.n-(a.n-a.ok)/a.n||b.n-a.n).slice(0,4);
  return{
    badge,ready,total,recentN:recent.length,right,
    acc:recent.length?right/recent.length:null,
    time:median(recent.filter(r=>r[0]).map(r=>r[1])),
    // the kid's ring: right answers among the last READY_N, out of the READY_OK needed
    fill:badge?1:Math.min(1,right/READY_OK),
    state:badge?'badge':ready?'ready':total?'learning':'new',
    facts:facts.length,tricky,check:k.checks[s.id]||null,
    lastAt:log.length?log[log.length-1][2]:0,
  };
}
export const badgeCount=()=>STEPS.filter(s=>kid().badges[s.id]).length;
// the first step without a badge
export const nextStep=()=>STEPS.find(s=>!kid().badges[s.id])||null;
export const lastPlayed=()=>kid().last||0;
