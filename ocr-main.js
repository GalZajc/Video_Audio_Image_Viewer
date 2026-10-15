'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFile}=require('node:child_process'),{promisify}=require('node:util'),Native=require('./ocr-native');
const exec=promisify(execFile),cache=new Map(),inflight=new Map();let stopping=false;
async function legacy(input,defaults,reason){
 const {stdout}=await exec('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'ocr-windows.ps1'),'-InputFile',input],{windowsHide:true,encoding:'utf8',timeout:defaults.extras.ocrEngine.requestTimeoutMs,maxBuffer:defaults.extras.ocrMaxInputBytes});
 const result=JSON.parse(stdout.trim().replace(/^\uFEFF/,''));
 for(const line of result.lines)for(const w of line.words)w.polygon=[{x:w.x,y:w.y},{x:w.x+w.width,y:w.y},{x:w.x+w.width,y:w.y+w.height},{x:w.x,y:w.y+w.height}];
 return {...result,engine:'windows-legacy',analysis:{passes:1,fallbackReason:reason}};
}
async function recognize(input,directory,Media,defaults,progress=()=>{}){
 if(stopping)throw Error('OCR is shutting down');
 const started=Date.now(),options=defaults.extras.ocrEngine,bytes=await fs.promises.readFile(input),key=crypto.createHash('sha256').update(bytes).update(JSON.stringify(options)).digest('hex');
 progress({phase:'recognition',completed:0,total:1});
 if(cache.has(key)){const result=cache.get(key);cache.delete(key);cache.set(key,result);progress({phase:'complete',completed:1,total:1});return {...result,analysis:{...result.analysis,cached:true,milliseconds:Date.now()-started}};}
 if(!inflight.has(key))inflight.set(key,(async()=>{
  let result;try{result=await Native.recognize(input,{...options,cacheDirectory:path.join(Media.cache,'oneocr-runtime')});}catch(error){if(stopping||!options.allowLegacyFallback)throw error;result=await legacy(input,defaults,error.message);}
  result.analysis={...result.analysis,recognitionMs:result.analysis.milliseconds,cached:false,milliseconds:Date.now()-started};cache.set(key,result);while(cache.size>options.cacheEntries)cache.delete(cache.keys().next().value);return result;
 })().finally(()=>inflight.delete(key)));
 const result=await inflight.get(key);progress({phase:'complete',completed:1,total:1});return result;
}
function shutdown(){stopping=true;Native.stop();cache.clear();}
module.exports={recognize,shutdown};
