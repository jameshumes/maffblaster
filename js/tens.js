// "10s": a column of digits. Type digits that make 10 (3 then 7, or 2 3 5 when triples
// are on) to collapse them into 10-chips, then type the column total. Multi-digit
// columns are worked place by place, carrying into the next column like written addition.
import {$,ri,pick,shuffle,clamp,rand} from './util.js';
import {save,rec,akey,choiceMode} from './save.js';
import {SFX} from './audio.js';
import {V,FX,emit,burst,shockwave,gridPush,stream,firework,elWorld,THREE} from './fx.js';

// ---------- column generators (used by the curriculum) ----------
const TRIPLES=[];
for(let a=1;a<=8;a++)for(let b=a;b<=8;b++){const c=10-a-b;if(c>=b&&c<=9)TRIPLES.push([a,b,c])}
// single-digit column: n pairs that make 10, t triples, e loose digits
export function digitCol({pairs=0,triples=0,extra=0}){
  const o=[];
  for(let i=0;i<pairs;i++){const a=ri(1,9);o.push(a,10-a)}
  for(let i=0;i<triples;i++)o.push(...pick(TRIPLES));
  for(let i=0;i<extra;i++)o.push(ri(1,9));
  return shuffle(o);
}
// `rows` numbers of `places` digits (no zeros), each place seeded with a few pairs
export function numberCol(rows,places){
  const cols=[];
  for(let p=0;p<places;p++){
    const k=ri(1,Math.floor(rows/2));
    cols.push(digitCol({pairs:k,extra:rows-2*k}));
  }
  return Array.from({length:rows},(_,r)=>cols.reduce((n,c,p)=>n+c[r]*10**p,0));
}

const PLACE=['ONES','TENS','HUNDREDS','THOUSANDS'];

export function createTens(api){
  // api: {G(), hit(t,pts), miss(), crash(x,y,total), roundDone(), setInput(s), showChoices(L,onPick), hideChoices()}
  const root=$('tens');
  let T=null;

  function start(lv,color){
    T={lv,cfg:lv.tens,color,wait:.35,phase:'wait',round:null};
    root.classList.remove('hidden');root.style.setProperty('--c',color);root.innerHTML='';
  }
  function stop(){T=null;root.classList.add('hidden');root.innerHTML='';api.hideChoices()}

  function newRound(){
    const cfg=T.cfg,nums=cfg.gen();
    const places=Math.max(...nums.map(n=>String(n).length)),cols=places+2,total=nums.reduce((a,b)=>a+b,0);
    const fs=clamp(Math.floor((V.H-300)/(nums.length+3)),22,58);
    root.classList.remove('done');
    root.innerHTML=`<div class="tfuse"><i></i></div><div class="tprompt"></div><div class="tbody"><div class="tgrid" style="--cols:${cols};--fs:${fs}px"></div><div class="tchips"></div></div>`;
    const grid=root.querySelector('.tgrid'),R={nums,places,cols,total,tiles:[],carryCells:[],ansCells:[],place:0,chips:0,sel:[],buf:'',
      fuse:0,fuseMax:0,lastAct:api.G().t,grid,chipsEl:root.querySelector('.tchips'),fuseEl:root.querySelector('.tfuse'),promptEl:root.querySelector('.tprompt')};
    for(let p=0;p<places;p++)R.tiles.push([]);
    const cell=(cls,txt='',p=-1)=>{const d=document.createElement('div');d.className=cls;d.textContent=txt;if(p>=0)d.dataset.p=p;grid.appendChild(d);return d};
    // carry row, the numbers, a rule, the answer row
    for(let c=0;c<cols;c++)R.carryCells[cols-1-c]=cell('carry','',cols-1-c);
    for(const n of nums){
      const s=String(n);
      for(let c=0;c<cols;c++){
        const p=cols-1-c,ch=s[s.length-1-p];
        if(ch===undefined){cell('');continue}
        const el=cell('tile',ch,p);R.tiles[p].push({d:+ch,el,used:false});
      }
    }
    cell('trule');
    for(let c=0;c<cols;c++)R.ansCells[cols-1-c]=cell('tans','',cols-1-c);
    const tileCount=nums.length*places;
    R.fuse=R.fuseMax=(tileCount*cfg.perTile+places*cfg.perSum+2)*save.settings.diff;
    T.round=R;T.phase='collapse';
    focusPlace();
  }

  const unused=()=>T.round.tiles[T.round.place].filter(t=>!t.used);
  // can any 2 (or 3, if allowed) unused tiles in the active place make 10?
  function hasMove(){
    const u=unused().map(t=>t.d),n=u.length;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      if(u[i]+u[j]===10)return true;
      if(T.cfg.triples)for(let k=j+1;k<n;k++)if(u[i]+u[j]+u[k]===10)return true;
    }
    return false;
  }
  const placeSum=()=>{const R=T.round;return R.chips*10+unused().reduce((a,t)=>a+t.d,0)};
  const placeName=()=>T.round.places===1?'TOTAL':PLACE[T.round.place]+' TOTAL';

  function focusPlace(){
    const R=T.round;R.chips=0;R.chipsEl.innerHTML='';R.sel=[];R.buf='';
    for(const el of R.grid.children){if(el.dataset.p!==undefined)el.classList.toggle('off',+el.dataset.p!==R.place&&!el.classList.contains('tans'))}
    if(hasMove())setPhase('collapse');else toSum();
  }
  function setPhase(ph){
    T.phase=ph;const R=T.round;
    R.promptEl.textContent=ph==='collapse'?(R.places>1?`MAKE TENS · ${PLACE[R.place]} COLUMN`:'MAKE TENS'):`${placeName()}?`;
    if(ph==='sum'&&choiceMode())api.showChoices({a:placeSum(),op:null},v=>answer(v));else api.hideChoices();
    showInput();
  }
  function toSum(){
    const R=T.round;
    if(T.cfg.noTotal&&!unused().length&&R.place===R.places-1){roundWon();return}
    setPhase('sum');
  }
  function showInput(){
    const R=T.round;
    if(T.phase==='collapse')api.setInput(R.sel.length?R.sel.map(t=>t.d).join(' + ')+' +':'');
    else if(T.phase==='sum')api.setInput(R.buf);
  }
  function actTime(){const R=T.round,G=api.G(),t=Math.max(.3,G.t-R.lastAct);R.lastAct=G.t;return t}

  function selectDigit(d){
    const R=T.round,tile=unused().find(t=>t.d===d&&!R.sel.includes(t));
    if(!tile){bad();return}
    R.sel.push(tile);tile.el.classList.add('sel');SFX.select();
    const s=R.sel.reduce((a,t)=>a+t.d,0),n=R.sel.length;
    if(s===10&&n>=2)collapse();
    else if(s>10||n>=(T.cfg.triples?3:2))bad();
    else showInput();
  }
  function collapse(){
    const R=T.round,sel=R.sel,t=actTime();R.sel=[];
    sel.forEach(x=>{x.used=true;x.el.classList.remove('sel');x.el.classList.add('gone')});
    if(sel.length===2&&!choiceMode())rec(akey(sel[0].d,sel[1].d),true,t);
    R.chips++;
    const chip=document.createElement('b');chip.className='chip';chip.textContent='10';R.chipsEl.appendChild(chip);
    const [cx,cy]=elWorld(chip);
    for(const x of sel){const [wx,wy]=elWorld(x.el);stream(wx,wy,cx,cy,T.color,36);burst(wx,wy,'#ffffff',14,18,.4)}
    shockwave(cx,cy,T.color,6,.35);gridPush(cx,cy,70,12);
    api.hit(t,10);SFX.zap(api.G().combo);
    if(T.cfg.noTotal&&!unused().length&&R.place===R.places-1){roundWon();return}
    if(!hasMove())toSum();else showInput();
  }
  function answer(v){
    const R=T.round,S=placeSum();
    if(v!==S){bad();return}
    const t=actTime();api.hit(t,30);
    const last=R.place===R.places-1;
    if(last){String(S).split('').reverse().forEach((ch,i)=>{if(R.ansCells[R.place+i])R.ansCells[R.place+i].textContent=ch})}
    else{
      R.ansCells[R.place].textContent=S%10;
      const c=Math.floor(S/10);
      if(c){ // carry into the next column as a tile of its own
        const cell=R.carryCells[R.place+1];cell.textContent=c;R.tiles[R.place+1].push({d:c,el:cell,used:false,carry:true});
        const [ax,ay]=elWorld(R.ansCells[R.place]),[bx,by]=elWorld(cell);stream(ax,ay,bx,by,'#22e6ff',30);
      }
    }
    const [x,y]=elWorld(R.ansCells[R.place]);burst(x,y,'#4dff6a',50,30,.6);SFX.shield();
    R.buf='';
    if(last)roundWon();else{R.place++;focusPlace()}
  }
  function roundWon(){
    const R=T.round,G=api.G();
    const bonus=Math.round(50*(R.fuse/R.fuseMax));G.score+=bonus;
    root.classList.add('done');SFX.chime();
    const [x,y]=elWorld(R.grid);burst(x,y,T.color,160,55,1.1);shockwave(x,y,T.color,16,.5);gridPush(x,y,90,18);
    R.promptEl.textContent=bonus?`CLEAR · FUSE BONUS +${bonus}`:'CLEAR';
    endRound(.9);
  }
  function endRound(wait){
    T.phase='wait';T.wait=wait;api.hideChoices();api.setInput('');
    api.roundDone();
  }
  function bad(){
    const R=T.round;
    R.sel.forEach(x=>x.el.classList.remove('sel'));R.sel=[];R.buf='';
    R.fuse=Math.max(0,R.fuse-1.5);
    api.miss();showInput();
  }
  function fuseOut(){
    const R=T.round,[x,y]=elWorld(R.grid);
    String(R.total).split('').reverse().forEach((ch,i)=>{const c=R.ansCells[i];if(c){c.textContent=ch;c.classList.add('reveal')}});
    R.promptEl.textContent='FUSE OUT';
    const G=api.G();G.combo=0;
    api.crash(x,y,R.total);
    endRound(save.settings.mode==='hard'?1.4:2.6);
  }

  function update(dt){
    if(!T)return;
    if(T.phase==='wait'){
      if((T.wait-=dt)<=0){const G=api.G();if(G.resolved<G.lv.count&&G.lives>0)newRound();else T.phase='idle'}
      return;
    }
    if(T.phase==='idle')return;
    const R=T.round;R.fuse-=dt;
    R.fuseEl.firstChild.style.width=Math.max(0,R.fuse/R.fuseMax*100)+'%';
    R.fuseEl.classList.toggle('low',R.fuse/R.fuseMax<.25);
    if(R.fuse<=0)fuseOut();
  }

  // returns true when the key was used
  function key(k){
    if(!T||(T.phase!=='collapse'&&T.phase!=='sum'))return false;
    const R=T.round;
    if(k.length===1&&k>='0'&&k<='9'){
      if(T.phase==='collapse'){if(k!=='0')selectDigit(+k);else bad()}
      else if(!choiceMode()){
        if(R.buf.length>=5)return true;
        R.buf+=k;SFX.key();showInput();
        if(save.settings.auto&&+R.buf===placeSum())answer(+R.buf);
      }
      return true;
    }
    if(k==='Backspace'){
      if(T.phase==='collapse'){const t=R.sel.pop();if(t)t.el.classList.remove('sel')}else R.buf=R.buf.slice(0,-1);
      showInput();return true;
    }
    if(k===' '||k==='Delete'){R.sel.forEach(x=>x.el.classList.remove('sel'));R.sel=[];R.buf='';showInput();return true}
    if(k==='Enter'){if(T.phase==='sum'&&R.buf)answer(+R.buf);return true}
    return false;
  }

  return {start,stop,update,key,get active(){return!!T},get busy(){return T&&T.phase!=='idle'}};
}
