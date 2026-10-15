'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,execFile}=require('node:child_process'),{promisify}=require('node:util'),readline=require('node:readline');
const exec=promisify(execFile);let discovery,session,sequence=0,generation=0;
async function directory(options){
 if(options.directory)return path.resolve(options.directory);
 discovery||=exec('powershell.exe',['-NoProfile','-Command',"[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false);$p=Get-AppxPackage -Name Microsoft.ScreenSketch|Sort-Object Version -Descending|Select-Object -First 1;if($p){Join-Path $p.InstallLocation 'SnippingTool'}"],{windowsHide:true,encoding:'utf8',timeout:options.startupTimeoutMs}).then(({stdout})=>stdout.trim());
 const dir=await discovery;if(!dir)throw Error('Microsoft Snipping Tool is not installed.');
 for(const name of ['oneocr.dll','oneocr.onemodel','onnxruntime.dll'])if(!fs.existsSync(path.join(dir,name)))throw Error('Snipping Tool OCR component missing: '+name);
 // WindowsApps components cannot be loaded directly by an unpackaged desktop
 // process on some Windows installations. Keep a private versioned local copy;
 // DATA is excluded from portable release archives and source control.
 const target=path.join(options.cacheDirectory,crypto.createHash('sha256').update(dir).digest('hex').slice(0,16));await fs.promises.mkdir(target,{recursive:true});
 for(const name of ['oneocr.dll','oneocr.onemodel','onnxruntime.dll']){const source=path.join(dir,name),destination=path.join(target,name),a=await fs.promises.stat(source),b=await fs.promises.stat(destination).catch(()=>null);if(!b||a.size!==b.size){const temporary=destination+'.tmp';await fs.promises.copyFile(source,temporary);await fs.promises.rename(temporary,destination);}}
 return target;
}
function stop(){const current=session;session=null;generation++;if(current){clearTimeout(current.idle);const error=Error('OCR worker stopped');current.rejectReady?.(error);for(const task of current.pending.values()){clearTimeout(task.timer);task.reject(error);}current.pending.clear();current.process.kill();}}
async function start(options){
 const token=generation,dir=await directory(options),file=path.join(__dirname,'bin','ViewerOcr.exe');
 if(!fs.existsSync(file))await exec('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'scripts','build-ocr-worker.ps1')],{windowsHide:true,timeout:options.startupTimeoutMs});
 if(token!==generation)throw Error('OCR initialization was cancelled');
 const process=spawn(file,[],{windowsHide:true,stdio:['pipe','pipe','pipe']}),current={process,pending:new Map(),idle:null,diagnostics:''};session=current;
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{reject(Error('Snipping Tool OCR initialization timed out'));stop();},options.startupTimeoutMs);timer.unref();
  current.rejectReady=error=>{clearTimeout(timer);reject(error);};
  const lines=readline.createInterface({input:process.stdout});lines.on('line',line=>{
   let value;try{value=JSON.parse(line);}catch{return;}
   if(value.ready){clearTimeout(timer);current.initializationMs=value.milliseconds;resolve(current);return;}
   if(value.id==null&&value.error){current.rejectReady(Error(value.error));return;}
   const task=current.pending.get(value.id);if(!task)return;current.pending.delete(value.id);clearTimeout(task.timer);value.error?task.reject(Error(value.error)):task.resolve(value.result);
  });
 });
 process.stderr.on('data',chunk=>{current.diagnostics=(current.diagnostics+chunk.toString()).slice(-16000);});
 const fail=error=>{if(session===current)session=null;clearTimeout(current.idle);current.rejectReady(error);for(const task of current.pending.values()){clearTimeout(task.timer);task.reject(error);}current.pending.clear();};
 process.once('error',fail);process.once('exit',code=>fail(Error('Snipping Tool OCR worker exited ('+code+')'+(current.diagnostics?': '+current.diagnostics.slice(-500):''))));process.stdin.on('error',fail);
 process.stdin.write(JSON.stringify({...options,directory:dir})+'\n');current.ready=ready;
 try{return await ready;}catch(error){if(session===current)stop();throw error;}
}
let starting;
async function recognize(input,options){
 if(!session){starting||=start(options).finally(()=>{starting=null;});await starting;}
 const current=session;if(!current)throw Error('OCR worker is unavailable');await current.ready;clearTimeout(current.idle);
 const result=await new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{reject(Error('Snipping Tool OCR timed out'));stop();},options.requestTimeoutMs);timer.unref();current.pending.set(id,{resolve,reject,timer});current.process.stdin.write(JSON.stringify({id,path:input})+'\n');});
 if(session===current&&!current.pending.size){current.idle=setTimeout(stop,options.idleTimeoutMs);current.idle.unref();}
 return result;
}
module.exports={recognize,stop};
