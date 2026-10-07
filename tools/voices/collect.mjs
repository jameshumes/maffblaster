import {chromium} from 'playwright-core';import fs from 'fs';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const p=await b.newPage();await p.goto('http://localhost:8765/');await p.waitForTimeout(800);
const lines=await p.evaluate(async()=>(await import('/js/kids/lines.js')).collectAll());
fs.writeFileSync('tools/voices/lines.json',JSON.stringify(lines,null,0));
const by={};for(const [w] of lines)by[w]=(by[w]||0)+1;console.log(lines.length,by,lines.slice(0,3));await b.close();
