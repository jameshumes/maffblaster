import {clamp} from './util.js';

const SAVE_KEY='maffblast.v1';
// kid: the Kids learning path (see kids/syllabus.js). mode: kids | easy | normal | hard. diff: speed multiplier on fall times.
export const save={stats:{},levels:{},settings:{diff:1,auto:true,vol:.7,mode:'normal',chapter:'add'}};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s){save.stats=s.stats||{};save.levels=s.levels||{};if(s.kid)save.kid=s.kid;Object.assign(save.settings,s.settings)}}catch(e){}
export function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}

// fact keys: "7x8" multiplication, "3+7" addition (order-free), "83-47" subtraction
export const fkey=(a,b)=>a<=b?`${a}x${b}`:`${b}x${a}`;
export const akey=(a,b)=>a<=b?`${a}+${b}`:`${b}+${a}`;
export const skey=(a,b)=>`${a}-${b}`;
export const fmtKey=k=>k.replace(/^(\d+)([x+-])(\d+)$/,(m,a,o,b)=>`${a} ${o==='x'?'×':o==='-'?'−':'+'} ${b}`);

// per-fact stats: n attempts, ok correct, t = moving average solve time (s)
export function rec(key,ok,t){
  const s=save.stats[key]||(save.stats[key]={n:0,ok:0,t:0});
  s.n++;
  if(ok){s.ok++;s.t=s.t?s.t*.65+t*.35:t}
  else s.t=s.t?s.t*.65+9*.35:9;
}
export function weakness(key,par){
  const s=save.stats[key];
  if(!s)return 4;
  return 1+(1-s.ok/s.n)*6+clamp(s.t/par-1,0,4)*1.5+(s.n<3?1.5:0);
}

export const mode=()=>save.settings.mode;
export const choiceMode=()=>mode()==='easy'||mode()==='kids';
// stars/best are tracked per difficulty; normal keeps the original un-suffixed keys
export const levelKey=id=>mode()==='normal'?id:`${id}@${mode()}`;
