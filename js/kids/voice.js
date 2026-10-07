// Every character talks, using the browser's built-in speech. Each gets its own voice,
// pitch and pace; Edge's natural voices (including a real child's voice) are preferred.
let voices=[];
const SS=window.speechSynthesis;
function load(){try{voices=SS.getVoices()}catch(e){}}
if(SS){load();SS.addEventListener?.('voiceschanged',load)}

const pickVoice=prefs=>{
  for(const re of prefs){const v=voices.find(v=>re.test(v.name)&&/^en/i.test(v.lang));if(v)return v}
  return voices.find(v=>/^en-US/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
};
const FRIENDLY=[/Ana.*Natural/i,/Jenny.*Natural/i,/Aria.*Natural/i,/Natural/i,/Google US English/i,/Samantha/i,/Zira/i];
const CHILD=[/Ana.*Natural/i,/Ana\b/i,...FRIENDLY];
const GRUFF=[/(Guy|Davis|Christopher|Eric|Roger|Steffan).*Natural/i,/Google UK English Male/i,/David/i,/Daniel/i,/Fred/i,...FRIENDLY];

export const CAST={
  narrator:{name:'Sunny',face:'🌞',pitch:1.1,rate:1,prefs:[/Jenny.*Natural/i,/Aria.*Natural/i,...FRIENDLY]},
  kitty:{name:'Captain Whiskers',face:'🐱',pitch:1.5,rate:1.1,prefs:CHILD},
  kitty2:{name:'Sparkle',face:'🐈',pitch:1.85,rate:1.15,prefs:CHILD},
  raccoon:{name:'Mr. Grumbles',face:'🦝',pitch:.55,rate:.88,prefs:GRUFF},
  storm:{name:'Stormy',face:'⛈️',pitch:.35,rate:.82,prefs:GRUFF},
  unicorn:{name:'Twinkle',face:'🦄',pitch:1.7,rate:1,prefs:CHILD},
  dragon:{name:'Ember',face:'🐲',pitch:1.35,rate:.98,prefs:CHILD},
};

let muted=false;
export const setMuted=m=>{muted=m;if(m)cancel()};
export const isMuted=()=>muted;
export function cancel(){try{SS&&SS.cancel()}catch(e){}}
// resolves when the line finishes (or after an estimate, since onend is unreliable)
export function speak(who,text,{interrupt=false}={}){
  const c=CAST[who]||CAST.narrator;
  const est=(.6+text.length*.068/c.rate)*1000;
  return new Promise(res=>{
    let done=false;const fin=()=>{if(!done){done=true;res()}};
    if(!SS||muted){setTimeout(fin,muted?est*.6:est);return}
    try{
      if(interrupt)SS.cancel();
      const u=new SpeechSynthesisUtterance(text.replace(/−/g,' minus '));
      const v=pickVoice(c.prefs);if(v)u.voice=v;
      u.pitch=c.pitch;u.rate=c.rate;u.volume=1;
      u.onend=fin;u.onerror=fin;
      SS.speak(u);
      setTimeout(fin,est+2500); // safety net
    }catch(e){setTimeout(fin,est)}
  });
}
