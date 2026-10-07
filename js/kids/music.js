// A tiny chiptune band: lead, arpeggio, bass and drums, scheduled ahead on the audio clock.
// Each song is 4 chords with two 4-bar melodies (A then B), looping.
import {audioCtx} from '../audio.js';

const _=null;
const SONGS={
  // bouncy driving tune in C: C G Am F
  kart:{bpm:132,prog:[[60,4],[67,4],[69,3],[65,4]],lead:'square',lp:2600,leadDur:.16,leadVol:.045,arp:1,drums:2,
    A:[[76,_,79,76,81,79,76,_],[74,_,79,74,83,81,79,_],[72,_,76,72,81,79,76,74],[77,_,81,77,84,83,81,79]],
    B:[[84,_,83,81,79,_,76,_],[83,_,81,79,74,_,79,_],[81,79,76,79,81,_,84,_],[81,_,79,77,79,_,_,_]]},
  // heroic climb in A minor: Am F C G
  rocket:{bpm:144,prog:[[69,3],[65,4],[60,4],[67,4]],lead:'sawtooth',lp:2000,leadDur:.18,leadVol:.04,arp:1,drums:2,
    A:[[81,_,81,83,84,_,83,81],[77,_,77,79,81,_,79,77],[76,_,79,_,84,_,79,76],[79,_,_,_,83,_,86,_]],
    B:[[84,83,81,79,81,_,76,_],[77,79,81,84,81,_,77,_],[79,76,72,76,79,_,84,_],[83,_,81,_,79,_,_,_]]},
  // gentle marimba waltz-ish for the dragon picnic: C Am F G
  dragon:{bpm:104,prog:[[60,4],[69,3],[65,4],[67,4]],lead:'sine',leadDur:.38,leadVol:.09,arp:1,drums:1,mallet:1,
    A:[[72,76,79,76,84,_,79,_],[72,76,81,76,84,_,81,_],[72,77,81,77,84,_,81,77],[74,79,83,79,86,_,83,_]],
    B:[[79,_,76,_,72,_,76,79],[81,_,76,_,72,_,76,81],[77,_,81,_,84,83,81,79],[79,_,_,_,74,_,_,_]]},
  hub:{bpm:96,prog:[[65,4],[60,4],[62,3],[67,4]],lead:'sine',leadDur:.4,leadVol:.07,arp:1,drums:0,mallet:1,
    A:[[77,_,81,_,84,_,81,_],[76,_,79,_,84,_,79,_],[74,_,77,_,81,_,77,_],[74,_,79,_,83,_,_,_]],
    B:[[84,_,81,_,77,_,81,84],[84,_,79,_,76,_,79,84],[81,_,77,_,74,_,77,81],[79,_,83,_,86,_,_,_]]},
};

let timer=null,song=null,step=0,next=0,bus=null,ducked=false;
const mtof=m=>440*2**((m-69)/12);
function ensure(){
  const a=audioCtx();if(!a.AC)return null;
  if(!bus){bus=a.AC.createGain();bus.gain.value=.5;bus.connect(a.master)}
  return a;
}
function note(a,type,m,t,dur,vol,lp){
  const {AC}=a,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(mtof(m),t);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  if(lp){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;o.connect(f).connect(g)}else o.connect(g);
  g.connect(bus);o.start(t);o.stop(t+dur+.05);
}
function drum(a,kind,t,v=1){
  const {AC,noiseBuf}=a,g=AC.createGain();g.connect(bus);
  if(kind==='kick'){
    const o=AC.createOscillator();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.16);
    g.gain.setValueAtTime(.32*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g);o.start(t);o.stop(t+.22);return;
  }
  const s=AC.createBufferSource(),f=AC.createBiquadFilter();s.buffer=noiseBuf;
  if(kind==='snare'){f.type='bandpass';f.frequency.value=1900;g.gain.setValueAtTime(.16*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.13)}
  else{f.type='highpass';f.frequency.value=7500;g.gain.setValueAtTime(.045*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.035)}
  s.connect(f).connect(g);s.start(t,Math.random()*.5);s.stop(t+.15);
}
function playStep(a,s,t){
  const n=song.prog.length,bar=Math.floor(s/8),i=s%8,ch=song.prog[bar%n];
  const mel=(Math.floor(bar/n)%2?song.B:song.A)[bar%n][i];
  if(mel!=null)note(a,song.lead,mel,t,song.leadDur,song.leadVol,song.lp);
  if(song.mallet&&mel!=null)note(a,'sine',mel+12,t,.12,song.leadVol*.25);
  const bp=[0,_,0,12,0,_,7,_][i];if(bp!=null)note(a,'triangle',ch[0]-24+bp,t,.24,.11);
  if(song.arp){const tones=[0,ch[1],7,12];note(a,'triangle',ch[0]+tones[[0,1,2,3,2,1,0,1][i]],t,.14,.028)}
  if(song.drums){
    if(i===0||i===4||(song.drums>1&&i===7))drum(a,'kick',t);
    if(i===2||i===6)drum(a,'snare',t,song.drums>1?1:.4);
    if(song.drums>1)drum(a,'hat',t,i%2?.6:1);
  }
}
function schedule(){
  const a=ensure();if(!a||!song)return;
  const dt=60/song.bpm/2;
  while(next<a.AC.currentTime+.15){playStep(a,step,next);next+=dt;step++}
}
export function playSong(id){
  stopSong();const a=ensure();if(!a)return;
  song=SONGS[id];step=0;next=a.AC.currentTime+.06;
  bus.gain.cancelScheduledValues(a.AC.currentTime);bus.gain.setValueAtTime(ducked?.16:.5,a.AC.currentTime);
  timer=setInterval(schedule,40);schedule();
}
export function stopSong(){if(timer)clearInterval(timer);timer=null;song=null}
// lower the band while someone is talking
export function duck(on){
  ducked=on;const a=ensure();if(!a)return;
  bus.gain.setTargetAtTime(on?.16:.5,a.AC.currentTime,.12);
}
export function fanfare(){
  const a=ensure();if(!a)return;const t=a.AC.currentTime+.05,e=.13;
  [[72,0],[76,1],[79,2],[84,3],[79,5],[84,6]].forEach(([m,k])=>{note(a,'square',m,t+k*e,k>=6?.9:.2,.06,3000);note(a,'triangle',m-12,t+k*e,k>=6?.9:.2,.08)});
  [0,3,6].forEach(k=>drum(a,'kick',t+k*e));drum(a,'snare',t+6*e);
}
