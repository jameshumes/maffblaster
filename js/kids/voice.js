// Every character talks. Lines are pre-rendered with a neural voice model (Kokoro, run
// locally on the GPU) into audio/voice/*.mp3; a manifest maps "who|text" to its file.
// Anything missing falls back to the browser's built-in speech.
// The current loudness is exposed so characters can move their mouths in time.
import {audio,audioCtx} from '../audio.js';

export const CAST={
  narrator:{name:'Sunny',face:'🌞',pitch:1.1,rate:1},
  kitty:{name:'Captain Whiskers',face:'🐱',pitch:1.5,rate:1.1},
  kitty2:{name:'Sparkle',face:'😺',pitch:1.85,rate:1.15},
  raccoon:{name:'Mr. Grumbles',face:'🦝',pitch:.55,rate:.88},
  storm:{name:'Stormy',face:'⛈️',pitch:.35,rate:.82},
  unicorn:{name:'Twinkle',face:'🦄',pitch:1.7,rate:1},
  dragon:{name:'Ember',face:'🐲',pitch:1.35,rate:.98},
};
export const lineKey=(who,text)=>who+'|'+text.trim();

let manifest={},muted=false,voiceBus=null,analyser=null,levelBuf=null;
const BASE='audio/voice/';
fetch(BASE+'manifest.json').then(r=>r.ok?r.json():{}).then(m=>{manifest=m||{}}).catch(()=>{});
const buffers=new Map();
const playing=new Set();
export let speaking=null; // who is talking right now
export const setMuted=m=>{muted=m;if(m)cancel()};
export const isMuted=()=>muted;
export const hasVoice=(who,text)=>!!manifest[lineKey(who,text)];

function bus(){
  const a=audioCtx();if(!a.AC)return null;
  if(!voiceBus){
    voiceBus=a.AC.createGain();voiceBus.gain.value=1.15;
    analyser=a.AC.createAnalyser();analyser.fftSize=512;levelBuf=new Float32Array(analyser.fftSize);
    voiceBus.connect(analyser);voiceBus.connect(a.master);
  }
  return a;
}
// 0..1 loudness of whoever is talking, for mouth flaps
export function voiceLevel(){
  if(!analyser||!playing.size)return 0;
  analyser.getFloatTimeDomainData(levelBuf);let s=0;for(const v of levelBuf)s+=v*v;
  return Math.min(1,Math.sqrt(s/levelBuf.length)*3.6);
}
function load(file){
  if(!buffers.has(file)){
    const a=bus();if(!a)return Promise.reject();
    buffers.set(file,fetch(BASE+file).then(r=>r.arrayBuffer()).then(b=>a.AC.decodeAudioData(b)));
  }
  return buffers.get(file);
}
// warm the cache so lines start instantly
export function preload(lines){for(const [who,text] of lines){const f=manifest[lineKey(who,text)];if(f)load(f).catch(()=>{})}}

export function cancel(){
  try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}
  for(const s of playing){try{s.onended=null;s.stop()}catch(e){}}
  playing.clear();speaking=null;
}
// resolves when the line finishes
export function speak(who,text,{interrupt=false}={}){
  audio();
  if(interrupt)cancel();
  const est=(.6+text.length*.068)*1000;
  if(muted)return new Promise(r=>setTimeout(r,est*.6));
  const f=manifest[lineKey(who,text)];
  if(f&&bus())return load(f).then(buf=>new Promise(res=>{
    const {AC}=audioCtx(),src=AC.createBufferSource();src.buffer=buf;src.connect(voiceBus);
    playing.add(src);speaking=who;
    const done=()=>{playing.delete(src);if(!playing.size)speaking=null;res()};
    src.onended=done;src.start();
    setTimeout(done,buf.duration*1000+600); // safety net
  })).catch(()=>robot(who,text,est));
  return robot(who,text,est);
}
// fallback: the browser's own voice
function robot(who,text,est){
  const SS=window.speechSynthesis,c=CAST[who]||CAST.narrator;
  return new Promise(res=>{
    let done=false;const fin=()=>{if(!done){done=true;if(speaking===who)speaking=null;res()}};
    if(!SS){setTimeout(fin,est);return}
    try{
      const u=new SpeechSynthesisUtterance(text.replace(/−/g,' minus '));
      const v=SS.getVoices().find(v=>/^en-US/i.test(v.lang));if(v)u.voice=v;
      u.pitch=c.pitch;u.rate=c.rate;u.onend=fin;u.onerror=fin;speaking=who;SS.speak(u);
      setTimeout(fin,est+2500);
    }catch(e){setTimeout(fin,est)}
  });
}
