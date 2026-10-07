import addition from './addition.js';
import multiplication from './multiplication.js';

export const CHAPTERS=[addition,multiplication];
// every level knows its chapter and index; ids are unique across chapters
export const LV={};
for(const ch of CHAPTERS)ch.levels.forEach((lv,i)=>{lv.ch=ch;lv.i=i;LV[lv.id]=lv});
export const chapterById=id=>CHAPTERS.find(c=>c.id===id)||CHAPTERS[0];
