import {rand} from './util.js';
import {save} from './save.js';

// all sound is synthesized
let AC=null,master=null,noiseBuf=null;
export function audio(){
  try{
    if(!AC){
      AC=new (window.AudioContext||window.webkitAudioContext)();
      master=AC.createGain();master.gain.value=save.settings.vol;
      const comp=AC.createDynamicsCompressor();
      master.connect(comp).connect(AC.destination);
      noiseBuf=AC.createBuffer(1,AC.sampleRate*1.5,AC.sampleRate);
      const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    }
    if(AC.state==='suspended')AC.resume();
  }catch(e){}
}
export const audioCtx=()=>({AC,master,noiseBuf});
export function setVolume(v){audio();if(master)master.gain.value=v}
function tone(type,f0,f1,dur,vol,delay=0){
  if(!AC)return;const t=AC.currentTime+delay;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(f1,1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(master);o.start(t);o.stop(t+dur+.02);
}
function noise(dur,vol,fc,delay=0){
  if(!AC)return;const t=AC.currentTime+delay;
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf;f.type='lowpass';f.frequency.setValueAtTime(fc,t);f.frequency.exponentialRampToValueAtTime(60,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+dur);
}
export const SFX={
  key(){tone('square',2400,2200,.025,.02)},
  shoot(c){const p=Math.min(c,24)*35;tone('square',700+p,180,.13,.07);tone('sawtooth',1400+p*2,500,.08,.03)},
  boom(big){noise(big?1:.45,big?.55:.32,big?2400:3600);tone('sine',big?95:150,30,big?.7:.3,big?.5:.28)},
  shield(){tone('triangle',1300,620,.28,.14);tone('triangle',1950,930,.22,.07);noise(.2,.15,5000)},
  wrong(){tone('sawtooth',150,90,.26,.16);tone('square',104,70,.26,.07)},
  crash(){noise(1.3,.8,1400);tone('sine',75,24,1,.7)},
  whistle(){tone('sine',600,2200,.5,.05);tone('sine',610,2230,.5,.03)},
  pop(){noise(.6,.45,5200);tone('sine',180,40,.4,.3)},
  sizzle(){for(let i=0;i<26;i++)noise(.03,rand(.04,.12)*(1-i/30),rand(6000,11000),i*.055+rand(0,.04))},
  zap(c){const p=Math.min(c,20)*30;tone('triangle',520+p,1560+p*2,.16,.12);tone('sine',1040+p,2080+p,.12,.05,.04)},
  select(){tone('sine',880,990,.06,.05)},
  chime(){[784,988,1175,1568].forEach((f,i)=>tone('triangle',f,f,.22,.1,i*.06))},
  wave(){tone('sawtooth',220,880,.5,.06);tone('triangle',440,1760,.5,.08,.05)},
  buff(){[660,880,1320].forEach((f,i)=>tone('square',f,f*1.5,.12,.05,i*.05))},
  star(){[784,1047,1319,1568,2093].forEach((f,i)=>tone('triangle',f,f,.35,.12,i*.07));noise(.5,.15,8000,.3)},
  win(){[523,659,784,1047,1319].forEach((f,i)=>tone('triangle',f,f,.3,.13,i*.085))},
  lose(){[392,330,262,196].forEach((f,i)=>tone('sawtooth',f,f*.97,.32,.09,i*.15))},
  spawn(){tone('sine',180,360,.18,.025)},
  // ---- kids mode ----
  meow(){tone('sine',650,1150,.14,.12);tone('sine',1150,520,.3,.12,.14);tone('triangle',1300,600,.3,.03,.14)},
  woof(){for(const d of [0,.2]){noise(.1,.35,900,d);tone('square',240,130,.12,.1,d)}},
  neigh(){for(let i=0;i<8;i++)tone('sawtooth',i%2?1100:850,i%2?900:1000,.06,.04,i*.055);tone('sawtooth',900,300,.35,.05,.44)},
  peep(){tone('sine',1900,2700,.07,.08);tone('sine',2000,2900,.07,.08,.12)},
  squeak(){tone('sine',1400,2400,.09,.08);tone('sine',2400,1600,.09,.06,.09)},
  ribbit(){for(const d of [0,.16]){tone('square',180,120,.1,.08,d);noise(.08,.12,600,d)}},
  giggle(){[700,900,650,880,620,860].forEach((f,i)=>tone('triangle',f,f*1.1,.07,.07,i*.08))},
  oops(){tone('sine',1100,260,.55,.1)},
  boing(){tone('sine',180,900,.14,.12);tone('sine',900,360,.22,.08,.14)},
  balloonPop(){noise(.18,.5,6000);tone('sine',900,200,.12,.12)},
  cheer(){[523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,.25,.1,i*.08));noise(.6,.08,7000,.2)},
  coin(){tone('square',1320,1320,.06,.05);tone('square',1760,1760,.14,.05,.06)},
  blip(){tone('square',1500+Math.random()*500,1400,.025,.015)},
  chime(){[1047,1319,1568].forEach((f,i)=>tone('sine',f,f,.4,.06,i*.06))},
  whoosh(){noise(.6,.2,2500)},
};
