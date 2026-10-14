(function(root){
 'use strict';
 function validate(value,limits){
  if(!value||typeof value!=='object'||!value.entries||!Array.isArray(value.custom)||value.custom.length>1000)throw Error('Neveljavna tabela.');
  const result={entries:{},custom:[],edits:{},archived:[]},validId=id=>typeof id==='string'&&/^[a-z0-9-]{1,100}$/.test(id),validText=text=>typeof text==='string'&&text.length<=limits.maxNotesLength;
  for(const [id,e] of Object.entries(value.entries)){
   if(!validId(id)||!e||!['todo','assumed','pass','fail'].includes(e.status)||!validText(e.notes))throw Error('Neveljavna opomba.');
   const history=e.notesHistory||[];if(!Array.isArray(history)||history.length>100||history.some(n=>!validText(n)))throw Error('Neveljavna zgodovina opomb.');
   const entry={status:e.status,notes:e.notes,notesHistory:[...history]};
   if(e.screenshots){
    if(!Array.isArray(e.screenshots)||e.screenshots.length>20)throw Error('Neveljavna slika.');
    entry.screenshots=e.screenshots.map(s=>{
     if(!s||!/^\/screenshots\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(s.url)||typeof s.name!=='string'||s.name.length>300)throw Error('Neveljavna slika.');
     const phase=s.phase||'base';if(!['base','note'].includes(phase)||phase==='note'&&(!Number.isInteger(s.note)||s.note<0||s.note>history.length))throw Error('Neveljavna faza slike.');
     return {url:s.url,name:s.name,phase,...(phase==='note'?{note:s.note}:{})};
    });
   }
   result.entries[id]=entry;
  }
  for(const f of value.custom){if(!f||!/^custom-[a-z0-9-]{1,90}$/.test(f.id)||!validText(f.text)||!f.text.trim()||f.group!==undefined&&(typeof f.group!=='string'||f.group.length>100))throw Error('Neveljavna dodatna zahteva.');result.custom.push({id:f.id,text:f.text,...(f.group?{group:f.group}:{})});}
  if(value.edits!==undefined){if(!value.edits||typeof value.edits!=='object'||Array.isArray(value.edits)||Object.keys(value.edits).length>1000)throw Error('Neveljavna urejanja.');for(const [id,text] of Object.entries(value.edits)){if(!validId(id)||!validText(text)||!text.trim())throw Error('Neveljavno besedilo zahtevka.');result.edits[id]=text;}}
  if(value.archived!==undefined){if(!Array.isArray(value.archived)||value.archived.length>10000||value.archived.some(id=>!validId(id)))throw Error('Neveljaven arhiv.');result.archived=[...new Set(value.archived)];}
  return result;
 }
 function images(entry,phase,note){return (entry.screenshots||[]).filter(s=>(s.phase||'base')===phase&&(phase!=='note'||s.note===note));}
 const api={validate,images};if(typeof module!=='undefined')module.exports=api;else root.ReviewModel=api;
})(typeof window==='undefined'?globalThis:window);
