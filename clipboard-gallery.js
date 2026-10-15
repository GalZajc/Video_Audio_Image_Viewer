'use strict';const {clipboard,nativeImage}=require('electron'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFile}=require('node:child_process'),{promisify}=require('node:util');const exec=promisify(execFile);
const digest=image=>{const size=image.getSize();return crypto.createHash('sha256').update(size.width+':'+size.height+':').update(image.toBitmap()).digest('hex');};
module.exports=function(data,defaults){const fingerprints=new Map();let pending;
 async function collect(){
  const list=[],dir=path.join(data,'clipboard-images');let historyStatus=process.platform==='win32'?'Unavailable':'Unsupported';
  async function include(image,modified,history=false){if(image.isEmpty())return;const hash=digest(image);if(list.some(p=>p.hash===hash))return;await fs.promises.mkdir(dir,{recursive:true});const file=path.join(dir,'Clipboard-'+hash+'.png');if(!fs.existsSync(file))await fs.promises.writeFile(file,image.toPNG());const size=image.getSize();list.push({path:file,name:'Clipboard',source:'clipboard',history,modified,hash,width:size.width,height:size.height,thumbnail:image.resize({width:defaults.extras.screenshotThumbWidth}).toDataURL()});}
  try{for(const item of await clipboard.read()){if(list.length>=defaults.extras.clipboardGalleryMaximumItems)break;const type=['image/png','image/jpeg','image/webp'].find(t=>item.types.includes(t));if(!type)continue;const blob=await item.getType(type);if(blob.size<=defaults.extras.clipboardGalleryMaximumBytes)await include(nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer())),Date.now());}}catch{}
  if(process.platform==='win32'&&process.env.VAP_TEST_MODE!=='1'){
   await fs.promises.mkdir(data,{recursive:true});const temporary=await fs.promises.mkdtemp(path.join(data,'clipboard-history-'));
   try{const {stdout}=await exec('powershell.exe',['-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'clipboard-history.ps1'),'-Destination',temporary,'-MaximumItems',String(defaults.extras.clipboardGalleryMaximumItems),'-MaximumBytes',String(defaults.extras.clipboardGalleryMaximumBytes)],{encoding:'utf8',windowsHide:true,timeout:defaults.extras.clipboardHistoryTimeoutMs,maxBuffer:1024*1024});const result=JSON.parse(stdout.replace(/^\uFEFF/,''));historyStatus=result.status;for(const item of result.items||[])if(path.dirname(path.resolve(item.path))===temporary)await include(nativeImage.createFromPath(item.path),item.modified,true);
   }catch{}finally{await fs.promises.rm(temporary,{recursive:true,force:true});}
  }
  return {items:list,historyStatus};
 }
 function capture(){if(!pending)pending=collect().finally(()=>pending=null);return pending;}

 async function duplicate(file,stat,images){if(!images.length)return false;const key=file+'\0'+stat.mtimeMs+'\0'+stat.size;if(fingerprints.has(key))return images.some(p=>p.hash===fingerprints.get(key));let width=0,height=0;const handle=await fs.promises.open(file,'r');try{const header=Buffer.alloc(32);await handle.read(header,0,32,0);if(header.subarray(0,8).toString('hex')==='89504e470d0a1a0a'){width=header.readUInt32BE(16);height=header.readUInt32BE(20);}}finally{await handle.close();}if(width&&!images.some(p=>p.width===width&&p.height===height))return false;const image=nativeImage.createFromPath(file);if(image.isEmpty())return false;const size=image.getSize();if(!images.some(p=>p.width===size.width&&p.height===size.height))return false;const hash=digest(image);fingerprints.set(key,hash);if(fingerprints.size>defaults.extras.screenshotThumbCache)fingerprints.delete(fingerprints.keys().next().value);return images.some(p=>p.hash===hash);}
 return {capture,duplicate};
};
