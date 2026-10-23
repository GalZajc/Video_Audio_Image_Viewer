'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const readline=require('node:readline');
const {frameAt,clampCrop}=require('./core');
const root=process.env.VAP_ROOT || __dirname;
const config=require(fs.existsSync(path.join(root,'config.json'))?path.join(root,'config.json'):path.join(__dirname,'config.json'));
const cache=path.join(root,'DATA','cache');
const processes=new Set();
const indexTasks=new Map();
const mediaById=new Map();
// Small metadata only; released media streams and frame indexes are not retained.
const metadataCache=new Map();
function cacheMetadata(file,stat,meta){
  metadataCache.delete(file);metadataCache.set(file,{size:stat.size,mtime:stat.mtimeMs,ctime:stat.ctimeMs,meta:structuredClone(meta)});
  while(metadataCache.size>(config.storage.metadataEntries||128))metadataCache.delete(metadataCache.keys().next().value);
}
function tool(name){const local=path.join(__dirname,'bin',name+(process.platform==='win32'?'.exe':''));return config.tools[name] || (fs.existsSync(local)?local:name);}
function run(name,args,{progress,duration,stdoutLimit=8*1024*1024,binary=false}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(tool(name),args,{windowsHide:true});processes.add(child);
    let output='',error='',carry='',chunks=[],bytes=0;
    child.stdout.on('data',chunk=>{
      if(progress){carry+=chunk.toString();const lines=carry.split('\n');carry=lines.pop();for(const line of lines){const m=/^out_time_us=(\d+)/.exec(line);if(m)progress(Math.min(.999,Number(m[1])/1e6/Math.max(duration,.001)));}}
      else if(binary){bytes+=chunk.length;if(bytes>stdoutLimit){child.kill();reject(new Error('Tool output is too large.'));}else chunks.push(chunk);}else {output+=chunk.toString();if(output.length>stdoutLimit){child.kill();reject(new Error('Odgovor orodja je prevelik.'));}}
    });
    child.stderr.on('data',chunk=>{error=(error+chunk.toString()).slice(-16000);});
    child.on('error',e=>{processes.delete(child);reject(new Error(`${name}: ${e.message}`));});
    child.on('close',code=>{processes.delete(child);code===0?resolve(binary?Buffer.concat(chunks):output):reject(new Error(error || `${name} se je končal (${code}).`));});
  });
}
function parseRate(value){const [a,b]=String(value||'0/1').split('/').map(Number);return a/(b||1);}
const describeTasks=new Map();
async function describe(file,{activate=true}={}){
  file=path.resolve(file);const stat=await fs.promises.stat(file);if(!stat.isFile())throw new Error('Izberi datoteko.');
  const known=[...mediaById.values()].find(meta=>meta.path===file&&meta.size===stat.size&&meta.mtime===stat.mtimeMs);if(known)return known;
  const key=file+'\0'+stat.size+'\0'+stat.mtimeMs+'\0'+stat.ctimeMs;
  let task=describeTasks.get(key);if(!task){task=describeMetadata(file,stat).finally(()=>describeTasks.delete(key));describeTasks.set(key,task);}
  const result=await task;
  if(activate){const existing=mediaById.get(result.id);if(existing)return existing;mediaById.set(result.id,result);}
  return result;
}
async function describeMetadata(file,stat){
  const known=[...mediaById.values()].find(meta=>meta.path===file&&meta.size===stat.size&&meta.mtime===stat.mtimeMs);if(known)return known;
  const cached=metadataCache.get(file);
  if(cached&&cached.size===stat.size&&cached.mtime===stat.mtimeMs&&cached.ctime===stat.ctimeMs){
    metadataCache.delete(file);metadataCache.set(file,cached);const result=structuredClone(cached.meta);return result;
  }
  metadataCache.delete(file);
  const isImage=config.mediaTypes.image.includes(path.extname(file).slice(1).toLowerCase());
  let json;
  if(path.extname(file).toLowerCase()==='.svg'){
    if(stat.size>20*1024*1024)throw new Error('SVG je prevelik.');
    const xml=await fs.promises.readFile(file,'utf8'),tag=xml.match(/<svg\b[^>]*>/i)?.[0]||'',box=tag.match(/viewBox=["']([^"']+)/i)?.[1]?.trim().split(/[ ,]+/).map(Number);
    const width=Number(tag.match(/\bwidth=["']([0-9.]+)/i)?.[1])||box?.[2]||300,height=Number(tag.match(/\bheight=["']([0-9.]+)/i)?.[1])||box?.[3]||150;
    json={streams:[{codec_type:'video',codec_name:'svg',width,height}],format:{}};
  }else json=JSON.parse(await run('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file]));
  const video=json.streams.find(s=>s.codec_type==='video' && !s.disposition?.attached_pic);
  const audio=json.streams.find(s=>s.codec_type==='audio');
  if(!video && !audio)throw new Error('Datoteka ne vsebuje videa ali zvoka.');
  const rotation=Number(video?.side_data_list?.find(x=>x.rotation!==undefined)?.rotation || video?.tags?.rotate || 0);
  const swapped=Math.abs(rotation)%180===90;
  const origin=Number(json.format.start_time||0);
  const id=crypto.createHash('sha256').update(`${file}\0${stat.size}\0${stat.mtimeMs}`).digest('hex').slice(0,32);
  const result={id,path:file,name:path.basename(file),size:stat.size,mtime:stat.mtimeMs,duration:isImage?1:Number(json.format.duration||video?.duration||audio?.duration||0),origin,
    width:video?(swapped?video.height:video.width):0,height:video?(swapped?video.width:video.height):0,
    rawWidth:video?.width||0,rawHeight:video?.height||0,rotation,fps:parseRate(video?.avg_frame_rate)||parseRate(video?.r_frame_rate)||30,
    videoCodec:video?.codec_name||null,pixelFormat:video?.pix_fmt||null,audioCodec:audio?.codec_name||null,
    audioRate:Number(audio?.sample_rate||48000),channels:audio?.channels||0,isAudio:!video,isImage,kind:isImage?'image':video?'video':'audio',videoBitrate:Number(video?.bit_rate)||Math.max(0,Number(json.format.bit_rate||0)-Number(audio?.bit_rate||0)),audioBitrate:Number(audio?.bit_rate)||0,
    sampleAspectRatio:video?.sample_aspect_ratio||'1:1',colorSpace:video?.color_space,colorTransfer:video?.color_transfer,colorPrimaries:video?.color_primaries,
    subtitleTracks:json.streams.filter(s=>s.codec_type==='subtitle').map(s=>({index:s.index,codec:s.codec_name,language:s.tags?.language||'',title:s.tags?.title||''})),
    url:`media://local/${id}/original`};
  if(isImage&&result.width*result.height>config.storage.maxImagePixels)throw new Error('Slika presega omejitev 80 milijonov pikslov.');
  if(!Number.isFinite(result.duration)||result.duration<=0)throw new Error('Dolžine posnetka ni mogoče določiti.');
  cacheMetadata(file,stat,result);
  return result;
}
async function indexFrames(meta,notify=()=>{}){
  if(meta.isAudio||meta.isImage)return null;
  if(indexTasks.has(meta.id))return indexTasks.get(meta.id);
  const task=(async()=>{
    await fs.promises.mkdir(cache,{recursive:true});
    const target=path.join(cache,`${meta.id}.frames`);
    if(fs.existsSync(target)){
      const bytes=await fs.promises.readFile(target);if(bytes.length && bytes.length%8===0 && bytes.length<=config.storage.maxFrameIndexBytes){
        const values=new Float64Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
        try{meta.frameEnd=JSON.parse(await fs.promises.readFile(target+'.json','utf8')).frameEnd;}catch{meta.frameEnd=values[values.length-1]+1/meta.fps;}
        meta.duration=Math.max(meta.duration,meta.frameEnd);return values;
      }
    }
    notify({label:'Indeksiranje sličic',fraction:0});
    const values=await new Promise((resolve,reject)=>{
      const packets=config.playback.packetIndexCodecs.includes(meta.videoCodec);
      const child=spawn(tool('ffprobe'),['-v','error','-select_streams','V:0',packets?'-show_packets':'-show_frames','-show_entries',packets?'packet=pts_time,duration_time':'frame=best_effort_timestamp_time,duration_time','-of','compact=p=0',meta.path],{windowsHide:true});processes.add(child);
      const lines=readline.createInterface({input:child.stdout});
      let buffer=new Float64Array(65536),count=0,error='',failed=false,lastNotify=0,lastPts=-1,lastDuration=0;
      lines.on('line',line=>{
        const fields=Object.fromEntries(line.split('|').map(x=>x.split('=')));
        const t=Number(fields[packets?'pts_time':'best_effort_timestamp_time'])-meta.origin;
        if(!Number.isFinite(t)||t<-.00001)return;
        if(t>=lastPts){lastPts=t;lastDuration=Number(fields.duration_time)||1/meta.fps;}
        if(count===buffer.length){
          if(buffer.byteLength*2>config.storage.maxFrameIndexBytes){failed=true;child.kill();reject(new Error('Indeks sličic presega nastavljeno omejitev pomnilnika.'));return;}
          const bigger=new Float64Array(buffer.length*2);bigger.set(buffer);buffer=bigger;
        }
        buffer[count++]=Math.max(0,t);
        if(Date.now()-lastNotify>250){notify({label:'Indeksiranje sličic',fraction:Math.min(.999,t/meta.duration)});lastNotify=Date.now();}
      });
      child.stderr.on('data',x=>{error=(error+x.toString()).slice(-2000);});
      child.on('error',e=>{processes.delete(child);reject(e);});
      child.on('close',code=>{processes.delete(child);if(failed)return;if(code!==0)return reject(new Error(error||'Indeksiranje ni uspelo.'));buffer=buffer.slice(0,count);buffer.sort();let unique=0;for(const time of buffer){if(unique===0||time-buffer[unique-1]>.000001)buffer[unique++]=time;}if(!unique)return reject(new Error('Ni časovnih oznak sličic.'));meta.frameEnd=lastPts+lastDuration;meta.duration=Math.max(meta.duration,meta.frameEnd);resolve(buffer.slice(0,unique));});
    });
    const temp=target+'.'+crypto.randomUUID()+'.tmp';await fs.promises.writeFile(temp,Buffer.from(values.buffer));await fs.promises.rename(temp,target);await fs.promises.writeFile(target+'.json',JSON.stringify({frameEnd:meta.frameEnd}),'utf8');notify({label:'',fraction:1});return values;
  })();
  indexTasks.set(meta.id,task);task.catch(()=>indexTasks.delete(meta.id));return task;
}
async function getFrame(meta,time,direction=0,notify){
  const values=await indexFrames(meta,notify);
  // Retain only one completed index in RAM; other tabs keep their compact disk index.
  for(const id of indexTasks.keys())if(id!==meta.id)indexTasks.delete(id);
  return {...frameAt(values,time,meta.frameEnd||meta.duration,direction),duration:meta.duration};
}
async function pruneCache(keep){
  const files=(await fs.promises.readdir(cache)).filter(f=>f.endsWith('.mp4'));
  const entries=await Promise.all(files.map(async f=>{const p=path.join(cache,f);const s=await fs.promises.stat(p);return {path:p,size:s.size,time:s.mtimeMs};}));
  let total=entries.reduce((n,e)=>n+e.size,0);
  for(const entry of entries.sort((a,b)=>a.time-b.time)){if(total<=config.storage.maxProxyCacheBytes)break;if(entry.path===keep||[...mediaById.values()].some(m=>m.proxy===entry.path))continue;await fs.promises.unlink(entry.path);total-=entry.size;}
}
let proxyQueue=Promise.resolve();
async function proxy(meta,notify){
  if(meta.proxy)return `media://local/${meta.id}/proxy`;
  const task=proxyQueue.then(async()=>{
    await fs.promises.mkdir(cache,{recursive:true});const target=path.join(cache,`${meta.id}.mp4`);
    if(!fs.existsSync(target)){
      notify({label:'Priprava združljivega posnetka',fraction:0});
      const args=['-hide_banner','-v','error','-y','-i',meta.path];
      if(!meta.isAudio)args.push('-map','0:V:0','-c:v','libx264','-preset',config.proxy.preset,'-crf',String(config.proxy.crf),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-pix_fmt','yuv420p','-force_key_frames',`expr:gte(t,n_forced*${config.proxy.keyframeSeconds})`,'-fps_mode','passthrough','-threads',String(config.proxy.threads));
      args.push('-map','0:a?','-c:a','aac','-b:a','256k','-movflags','+faststart','-progress','pipe:1','-nostats',target+'.partial.mp4');
      try{await run('ffmpeg',args,{duration:meta.duration,progress:fraction=>notify({label:'Priprava združljivega posnetka',fraction})});await fs.promises.rename(target+'.partial.mp4',target);}catch(e){await fs.promises.rm(target+'.partial.mp4',{force:true});throw e;}
    }
    meta.proxy=target;await pruneCache(target);notify({label:'',fraction:1});return `media://local/${meta.id}/proxy`;
  });proxyQueue=task.catch(()=>{});return task;
}
function exportPlan(meta,request,settings){return require('./export-plan')(meta,request,settings,config);}
async function exportMedia(meta,request,settings,destination,notify){
  if(path.resolve(destination).toLowerCase()===meta.path.toLowerCase())throw new Error('Izvorne datoteke ni mogoče prepisati. Izberi drugo ime.');
  const preliminary=exportPlan(meta,request,settings);
  const temp=path.join(path.dirname(destination),`.${path.basename(destination)}.${crypto.randomUUID()}.partial.${preliminary.format}`);
  const output=path.join(root,'OUTPUT',`export_${new Date().toISOString().replace(/[:.]/g,'-')}_${crypto.randomBytes(3).toString('hex')}`);
  await fs.promises.mkdir(output,{recursive:true});
  request={...request};
  for(const [key,outKey] of [['annotationRaster','annotationPath'],['sourceRaster','sourceRasterPath']]){
    if(request[key]){const bytes=Buffer.from(request[key],'base64');if(bytes.length>256*1024*1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Neveljavna slika za izvoz.');const file=path.join(output,key+'.png');await fs.promises.writeFile(file,bytes);request[outKey]=file;delete request[key];}
  }
  const plan=exportPlan(meta,request,settings);
  const record={created:new Date().toISOString(),source:meta,destination,selection:request,plan,settings,config,args:[...plan.args,temp]};
  await fs.promises.writeFile(path.join(output,'parameters.json'),JSON.stringify(record,null,2),'utf8');
  notify({label:'Shranjevanje izreza',fraction:0});
  try{
    if(plan.binaryCopy){const source=fs.createReadStream(meta.path,{highWaterMark:1024*1024});let bytes=0,last=0;source.on('data',chunk=>{bytes+=chunk.length;if(Date.now()-last>150){notify({label:'Shranjevanje izreza',fraction:bytes/meta.size});last=Date.now();}});await pipeline(source,fs.createWriteStream(temp));}
    else await run('ffmpeg',[...plan.args,temp],{duration:plan.end-plan.start,progress:fraction=>notify({label:'Shranjevanje izreza',fraction})});
    await fs.promises.rename(temp,destination);
    await fs.promises.writeFile(path.join(output,'result.json'),JSON.stringify({success:true,destination,bytes:(await fs.promises.stat(destination)).size},null,2),'utf8');
    notify({label:'',fraction:1});return {destination,videoCopy:plan.videoCopy,audioCopy:plan.audioCopy};
  }catch(e){await fs.promises.rm(temp,{force:true});await fs.promises.writeFile(path.join(output,'result.json'),JSON.stringify({success:false,error:e.message},null,2),'utf8');throw e;}
}
function release(id){mediaById.delete(id);indexTasks.delete(id);}
function shutdown(){for(const p of processes)p.kill();}
module.exports={root,cache,tool,run,describe,indexFrames,getFrame,proxy,exportPlan,exportMedia,mediaById,release,shutdown};
