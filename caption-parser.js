(function(root){'use strict';
function time(value){const parts=value.replace(',','.').split(':').map(Number);return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];}
function parse(text){const cues=[];for(const block of text.replace(/^\uFEFF/,'').replace(/\r/g,'').split(/\n\s*\n/)){const lines=block.split('\n'),i=lines.findIndex(line=>line.includes('-->'));if(i<0)continue;const match=lines[i].match(/([\d:.]+)\s*-->\s*([\d:.]+)/);if(!match)continue;const start=time(match[1]),end=time(match[2]);const content=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').replace(/\{\\[^}]*\}/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();if(Number.isFinite(start)&&end>start&&content)cues.push({start,end,text:content});}return cues.sort((a,b)=>a.start-b.start);}
const api={parse};if(typeof module!=='undefined')module.exports=api;else root.Captions=api;
})(typeof window!=='undefined'?window:globalThis);
