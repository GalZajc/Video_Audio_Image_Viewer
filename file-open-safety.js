'use strict';
const path=require('node:path');

function openFileLimit(value,fallback=20){
  return Number.isSafeInteger(value)&&value>=1?value:fallback;
}

// One queue for all windows: accidental requests must not create overlapping dialogs.
function createFileOpenGuard({getSettings,showMessageBox,defaultLimit=20}){
  let queue=Promise.resolve();
  return function authorize(owner,files){
    const unique=new Map();
    for(const file of Array.isArray(files)?files:[]){
      if(typeof file!=='string'||!path.isAbsolute(file))continue;
      const normalized=path.normalize(file),key=process.platform==='win32'?normalized.toLowerCase():normalized;
      if(!unique.has(key))unique.set(key,normalized);
    }
    const paths=[...unique.values()];
    const task=queue.then(async()=>{
      if(!paths.length||owner.isDestroyed())return [];
      const limit=()=>openFileLimit(getSettings().maxOpenFiles,defaultLimit);
      async function blocked(){
        const en=getSettings().language==='en',max=limit();
        await showMessageBox(owner,{type:'warning',message:en?`Cannot open ${paths.length} files at once.`:`Ni mogoče odpreti ${paths.length} datotek naenkrat.`,detail:en?`The maximum is ${max}. No files from this group were opened. Select fewer files or change the limit in Settings.`:`Največje dovoljeno število je ${max}. Nobena datoteka iz te skupine ni bila odprta. Izberi manj datotek ali spremeni mejo v nastavitvah.`,buttons:[en?'OK':'V redu'],defaultId:0,cancelId:0,noLink:true});
        return [];
      }
      if(paths.length>limit())return blocked();
      if(paths.length>1){
        const en=getSettings().language==='en';
        const result=await showMessageBox(owner,{type:'question',message:en?`Do you really want to open ${paths.length} files?`:`Ali res želiš odpreti ${paths.length} datotek?`,buttons:en?['Open','Cancel']:['Odpri','Prekliči'],defaultId:1,cancelId:1,noLink:true});
        if(result.response!==0||owner.isDestroyed())return [];
        if(paths.length>limit())return blocked();
      }
      return paths;
    });
    queue=task.catch(()=>{});
    return task;
  };
}
module.exports={openFileLimit,createFileOpenGuard};
