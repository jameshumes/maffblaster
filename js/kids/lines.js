// Every line any character can say, for the offline voice build (tools/voices).
import {hubLines,GAMES} from './app.js';
export function collectAll(){
  const seen=new Set(),out=[];
  for(const l of [...hubLines(),...GAMES.flatMap(g=>g.lines?g.lines():[])]){const k=l[0]+'|'+l[1];if(!seen.has(k)){seen.add(k);out.push(l)}}
  return out;
}
