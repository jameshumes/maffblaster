import {ri,range,pairs} from '../util.js';
import {akey,skey} from '../save.js';
import {digitCol,numberCol} from '../tens.js';
import {P} from './common.js';

function add(a,b){if(Math.random()<.5)[a,b]=[b,a];return P(akey(a,b),[{t:`${a} + ${b}`,a:a+b,op:{o:'+',a,b}}])}
const sub=(a,b)=>P(skey(a,b),[{t:`${a} − ${b}`,a:a-b,op:{o:'-',a,b}}]);
// the four partial products of a 2-digit × 2-digit multiplication: 47×36 → 1200, 210, 240, 42
function partials(){
  let a,b;do{a=ri(12,99);b=ri(12,99)}while(!(a%10)||!(b%10));
  const A=[a-a%10,a%10],B=[b-b%10,b%10];
  return [A[0]*B[0],A[0]*B[1],A[1]*B[0],A[1]*B[1]].filter(v=>v>0);
}
const mk={
  add:(a,b)=>add(a,b),
  sub:(a,b)=>sub(a,b),
  bond:a=>P(akey(a,10-a),[{t:`${a} + ? = 10`,a:10-a,op:{o:'bond',a,b:10}}]),
  to100:a=>P(skey(100,a),[{t:`100 − ${a}`,a:100-a,op:{o:'-',a:100,b:a}}]),
  // two partial products, the bread-and-butter add inside every boss
  big2:()=>{const p=partials();const [a,b]=[p.splice(ri(0,p.length-1),1)[0],p[ri(0,p.length-1)]];return add(a,b)},
  // running total: each shield adds the next partial product
  running:()=>{
    const p=partials(),full=p.join(' + '),L=[];let s=p[0];
    for(let i=1;i<p.length;i++){L.push({t:`${s} + ${p[i]}`,a:s+p[i],op:{o:'+',a:s,b:p[i]},sub:full});s+=p[i]}
    return P('~'+full,L); // '~' keys are not tracked as facts
  },
  four:()=>{const p=partials();return P('~'+p.join('+'),[{t:p.join(' + '),a:p.reduce((a,b)=>a+b,0)}])},
};
const carry1=()=>{let a,b;do{a=ri(11,89);b=ri(2,9)}while(a%10+b<10||a%10===0);return[a,b]};
const noCarry2=()=>{let a,b;do{a=ri(11,88);b=ri(11,88)}while(a%10+b%10>=10||a+b>=100||!(a%10)||!(b%10));return[a,b]};
const carry2=()=>{let a,b;do{a=ri(13,79);b=ri(13,79)}while(a%10+b%10<10||a+b>=100);return[a,b]};
const over100=()=>{let a,b;do{a=ri(41,99);b=ri(41,99)}while(a+b<=100||!(a%10)||!(b%10));return[a,b]};
const subCross=()=>{let a,b;do{a=ri(21,99);b=ri(2,9)}while(a%10>=b);return[a,b]};
const sub2=()=>{let a,b;do{a=ri(31,99);b=ri(11,a-6)}while(!(b%10));return[a,b]};

export const WORLDS=[
  {name:'MAKE TEN',sub:'the bond behind everything',color:'#4dff6a'},
  {name:'BRIDGING TEN',sub:'single digits past 10',color:'#22e6ff'},
  {name:'2-DIGIT + 1-DIGIT',sub:'cross into the next ten',color:'#ffa31a'},
  {name:'2-DIGIT + 2-DIGIT',sub:'the core building block',color:'#ff3df0'},
  {name:'10s',sub:'collapse the tens, then add',color:'#fff23a'},
  {name:'BIG SUMS',sub:'adding up partial products',color:'#a66bff'},
  {name:'TAKE AWAY',sub:'complements & subtraction',color:'#ff2a6d'},
  {name:'GAUNTLET',sub:'everything at once',color:'#ffffff'},
];
const tens=(id,name,count,cfg,tip)=>({id,w:4,kind:'tens',game:'tens',name,count,par:2.5,pts:10,tens:cfg,tip});
export const LEVELS=[
  {id:'ab1',w:0,kind:'bond',name:'Make 10',pool:()=>range(1,9).map(a=>[a,0]),make:mk.bond,key:a=>akey(a,10-a),count:20,conc:3,fall:9,par:1.5,pts:10,
   tip:`Every pair that makes 10, instantly: <b>1+9 · 2+8 · 3+7 · 4+6 · 5+5</b>. Type the missing number. Everything else in this chapter is built on these.`},
  {id:'ab2',w:0,kind:'bond',name:'Sums to 10',pool:()=>pairs(range(1,9),range(1,9)).filter(([a,b])=>a<=b&&a+b<=10),make:mk.add,count:24,conc:4,fall:9,par:1.5,pts:10,
   tip:`Small sums should be facts, not counting. If you catch yourself counting on fingers, slow down and <b>see</b> the answer.`},
  {id:'ab3',w:1,kind:'bridge',name:'Bridge 10',pool:()=>pairs(range(2,9),range(2,9)).filter(([a,b])=>a<=b&&a+b>10),make:mk.add,count:28,conc:4,fall:9,par:2,pts:12,
   tip:`Fill to 10, then add what's left: <b>8 + 7 → 8 + 2 = 10, + 5 = 15</b>. Doubles help too: <b>7 + 8 = 7 + 7 + 1</b>.`},
  {id:'ab4',w:1,kind:'bridge',name:'Single-Digit Gauntlet',pool:()=>pairs(range(1,9),range(1,9)).filter(([a,b])=>a<=b),make:mk.add,count:40,conc:5,fall:8,par:1.5,pts:12,
   tip:`Every single-digit sum, faster. These need to be as automatic as your name.`},
  {id:'ab5',w:2,kind:'a21',name:'Cross the Ten',gen:carry1,make:mk.add,count:24,conc:3,fall:10,par:2.5,pts:15,
   tip:`<b>47 + 8</b>: 47 needs 3 to reach 50, and 8 is 3 + 5 → <b>55</b>. Same bridge as before, just higher up.`},
  {id:'ab6',w:2,kind:'a21',name:'2+1 Mixed',gen:()=>[ri(11,98),ri(2,9)],make:mk.add,count:28,conc:4,fall:10,par:2.5,pts:15,
   tip:`Some cross the ten, some don't. Glance at the ones digits first.`},
  {id:'ab7',w:3,kind:'a22',name:'No Carry',gen:noCarry2,make:mk.add,count:24,conc:3,fall:11,par:3,pts:20,
   tip:`Go <b>left to right</b>: 34 + 25 → 30 + 20 = <b>50</b>, then 4 + 5 = 9 → <b>59</b>. Say the big part first.`},
  {id:'ab8',w:3,kind:'a22',name:'With Carry',gen:carry2,make:mk.add,count:24,conc:3,fall:12,par:3.5,pts:25,
   tip:`<b>47 + 38</b>: 47 + 30 = <b>77</b>, then + 8 bridges the ten → <b>85</b>. Or round: 47 + 40 − 2 = 85.`},
  {id:'ab9',w:3,kind:'a22',name:'Over 100',gen:over100,make:mk.add,count:24,conc:3,fall:13,par:4,pts:30,
   tip:`<b>68 + 79</b>: 68 + 80 = 148, − 1 → <b>147</b>. Numbers ending in 8 or 9 love rounding.`},
  tens('at1','Pairs',8,{gen:()=>digitCol({pairs:ri(3,5)}),noTotal:true,perTile:1.5,perSum:0},
   `Type two digits that make 10 (<b>3</b> then <b>7</b>) and they collapse into a 10. Clear the whole column before the fuse burns out.`),
  tens('at2','Leftovers',8,{gen:()=>digitCol({pairs:ri(2,4),extra:ri(2,3)}),perTile:1.4,perSum:3},
   `Collapse the pairs, then type the column total: <b>three 10s + 5 + 6 = 41</b>. Tens first, leftovers last.`),
  tens('at3','Triples',8,{gen:()=>digitCol({pairs:ri(1,3),triples:ri(1,2),extra:ri(1,2)}),triples:true,perTile:1.4,perSum:3},
   `Three digits can make 10 too: <b>2 + 3 + 5</b>, <b>1 + 4 + 5</b>, <b>2 + 2 + 6</b>. Type all three to collapse them.`),
  tens('at4','Long Columns',6,{gen:()=>digitCol({pairs:ri(3,5),triples:ri(1,2),extra:ri(2,4)}),triples:true,perTile:1.1,perSum:4},
   `Twelve to fifteen digits. Scan for the obvious pairs (9+1, 8+2) first, then hunt for triples.`),
  tens('at5','2-Digit Columns',6,{gen:()=>numberCol(ri(4,6),2),triples:true,perTile:1.5,perSum:4},
   `Same trick, one column at a time. Collapse the ones, type the ones total: write the ones digit, <b>carry the tens</b> up to the next column. Then do the tens.`),
  tens('at6','3-Digit Columns',5,{gen:()=>numberCol(ri(4,5),3),triples:true,perTile:1.5,perSum:4},
   `Three columns, two carries. This is how accountants add a column of figures in their head.`),
  {id:'ag1',w:5,kind:'big',name:'Round Numbers',gen:()=>[0,0],make:mk.big2,count:20,conc:3,fall:12,par:3,pts:30,
   tip:`Adding the pieces of a multiplication: <b>1200 + 210 = 1410</b>. Line up the place values in your head: hundreds with hundreds.`},
  {id:'ag2',w:5,kind:'big',name:'Running Totals',gen:()=>[0,0],make:mk.running,count:8,conc:2,fall:40,par:4,pts:60,
   tip:`Each shield adds the next piece: <b>1200 + 210 = 1410</b>, <b>1410 + 240 = 1650</b>, <b>1650 + 42 = 1692</b>. That's 47 × 36. Hold the running total.`},
  {id:'ag3',w:5,kind:'big',name:'Four Terms',gen:()=>[0,0],make:mk.four,count:10,conc:2,fall:30,par:9,pts:100,
   tip:`All four pieces at once, no scaffold. Biggest first, keep one running total, never restart.`},
  {id:'as1',w:6,kind:'sub',name:'To 100',pool:()=>range(11,99).filter(n=>n%10).map(n=>[n,0]),make:mk.to100,key:a=>skey(100,a),count:24,conc:3,fall:10,par:2.5,pts:20,
   tip:`Tens make 9, ones make 10: <b>100 − 63 → 3 (9−6), 7 (10−3) → 37</b>. This is the key to Near 100 and Twins in multiplication.`},
  {id:'as2',w:6,kind:'sub',name:'Back Across 10',gen:subCross,make:mk.sub,count:24,conc:3,fall:10,par:2.5,pts:20,
   tip:`<b>83 − 7</b>: take 3 to reach 80, then 4 more → <b>76</b>. Bridging ten, going down.`},
  {id:'as3',w:6,kind:'sub',name:'2-Digit Subtraction',gen:sub2,make:mk.sub,count:24,conc:3,fall:13,par:4,pts:30,
   tip:`<b>83 − 47</b>: 83 − 40 = 43, − 7 → <b>36</b>. Or count up: 47 → 50 is 3, 50 → 83 is 33 → <b>36</b>.`},
  {id:'ax1',w:7,kind:'mix',name:'The Gauntlet',mix:['ab4','ab6','ab8','ab9','ag1','as1','as2','as3'],count:60,conc:4,fall:1,par:3,pts:1,
   tip:`Every addition and subtraction type, accelerating as you go. Survive 60.`},
];

export default {id:'add',name:'ADDITION',sub:'make ten to 4-term sums',color:'#4dff6a',
  worlds:WORLDS,levels:LEVELS,
  mastery:{from:1,to:9,key:akey,sym:'+',calc:(a,b)=>a+b,squares:false,match:k=>/^\d+[+-]\d+$/.test(k)}};
