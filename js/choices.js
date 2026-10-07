import {shuffle} from './util.js';

// Wrong answers should be the mistakes people actually make, so picking the right
// one means you knew it rather than spotted the odd one out.
const digitsOf=n=>String(n).split('').map(Number);
// add column by column but drop every carry: 47+38 → 75
function noCarryAdd(a,b){
  const A=digitsOf(a).reverse(),B=digitsOf(b).reverse();let out=0,p=1;
  for(let i=0;i<Math.max(A.length,B.length);i++){out+=((A[i]||0)+(B[i]||0))%10*p;p*=10}
  return out;
}
// subtract each column smaller-from-larger instead of borrowing: 83−47 → 44
function noBorrowSub(a,b){
  const A=digitsOf(a).reverse(),B=digitsOf(b).reverse();let out=0,p=1;
  for(let i=0;i<A.length;i++){out+=Math.abs((A[i]||0)-(B[i]||0))*p;p*=10}
  return out;
}
const swapDigits=n=>{const s=String(n);return s.length===2&&s[0]!==s[1]?+(s[1]+s[0]):null};

function mistakes(L){
  const n=L.a,op=L.op,o=[];
  if(!op)return o;
  const {a,b}=op;
  if(op.o==='+'){if(a>9||b>9)o.push(noCarryAdd(a,b));o.push(n-10,n+10,n-1,n+1)}
  else if(op.o==='-'){o.push(noBorrowSub(a,b),n+10,n-10,n+1,n-1)}
  else if(op.o==='x'){o.push((a+1)*b,(a-1)*b,a*(b+1),a*(b-1),swapDigits(n),n+10,n-10)}
  else if(op.o==='bond'){o.push(n+1,n-1,a,n+2)} // a + ? = 10
  return o;
}
function nearby(n){
  const big=n>=100,o=[n+1,n-1,n+2,n-2,n+10,n-10,swapDigits(n)];
  if(big)o.push(n+100,n-100,n+20,n-20);
  return o;
}

// returns `count` values including the answer, in random order
export function makeChoices(L,count=4){
  const ans=L.a,seen=new Set([ans]),out=[ans];
  // nothing under half the answer: 2 as a choice for 8+4 is too obviously wrong
  const take=v=>{if(out.length<count&&Number.isInteger(v)&&v>=ans/2&&!seen.has(v)){seen.add(v);out.push(v)}};
  // up to two operation-specific mistakes, then fill from nearby values
  shuffle(mistakes(L).filter(v=>v!=null&&v!==ans)).slice(0,2).forEach(take);
  shuffle(nearby(ans)).forEach(take);
  for(let k=3;out.length<count;k++)take(ans+k);
  return shuffle(out);
}
