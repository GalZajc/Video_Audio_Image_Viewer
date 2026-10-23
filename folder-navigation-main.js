'use strict';
const fs=require('node:fs'),path=require('node:path');
const missing=error=>['ENOENT','ENOTDIR'].includes(error.code);
async function readFolder(file,types,mediaTypes,settings){
  const dir=path.dirname(file),extensions=new Set(types.filter(type=>mediaTypes[type]).flatMap(type=>mediaTypes[type]));
  let entries;
  try{entries=await fs.promises.readdir(dir,{withFileTypes:true});}catch(error){if(missing(error))return {files:[],existing:[]};throw error;}
  const items=[],existing=[];
  for(const entry of entries){
    if(!entry.isFile())continue;
    const file=path.join(dir,entry.name);
    try{
      const stat=await fs.promises.stat(file);if(!stat.isFile())continue;existing.push(file);
      if(extensions.has(path.extname(entry.name).slice(1).toLowerCase()))items.push({path:file,name:entry.name,modified:stat.mtimeMs,created:stat.birthtimeMs,size:stat.size});
    }catch(error){if(!missing(error)&&error.code!=='EACCES'&&error.code!=='EPERM')throw error;}
  }
  const collator=new Intl.Collator(settings.language,{numeric:true,sensitivity:'base'}),key=settings.folderSort;
  items.sort((a,b)=>((key==='name'?collator.compare(a.name,b.name):a[key]-b[key])||collator.compare(a.name,b.name))*(settings.folderDescending?-1:1));
  return {files:items.map(item=>item.path),existing};
}
async function describeExisting(file,describe){
  try{return await describe(file);}catch(error){
    try{if(!(await fs.promises.stat(file)).isFile())return null;}catch(statError){if(missing(statError))return null;}
    throw error;
  }
}
module.exports={readFolder,describeExisting};
