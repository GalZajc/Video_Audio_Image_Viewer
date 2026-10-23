'use strict';
const {app,BrowserWindow,ipcMain,dialog,protocol,shell,Menu,screen}=require('electron');
const {fitWindow}=require('./core');
const fs=require('node:fs');
const path=require('node:path');
const {Readable}=require('node:stream');
const root=process.env.VAP_ROOT || (app.isPackaged?path.resolve(path.dirname(process.execPath),'../..'):__dirname);
process.env.VAP_ROOT=root;
const Media=require('./media');
const defaults=require(fs.existsSync(path.join(root,'config.json'))?path.join(root,'config.json'):path.join(__dirname,'config.json'));
const data=path.join(root,'DATA');
app.setPath('userData',path.join(data,'electron'));
app.setPath('sessionData',path.join(data,'electron','session'));
protocol.registerSchemesAsPrivileged([{scheme:'media',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);
let win,ready=false,exporting=false,pending=[],state={tabs:[],active:0,closed:[],history:[]},settings;
const {openFileLimit,createFileOpenGuard}=require('./file-open-safety');
const authorizeFiles=createFileOpenGuard({getSettings:()=>settings,showMessageBox:require('./file-open-dialog-main')(ipcMain),defaultLimit:defaults.preferences.maxOpenFiles});
let writeQueue=Promise.resolve();
const windowContexts=new Map(),releaseRequests=new Set();let quitting=false,quitContexts=[],quitActive=null,quitFlushed=false;
const toolWindows=require('./tool-windows-main')({ipcMain,screen,defaults,contextFor,data,getSettings:()=>settings,getHeldDrawing:()=>tabWindows?.getHeldDrawing()});
function setFullscreen(value,target=win){
  target._fullscreenQueue=(target._fullscreenQueue||Promise.resolve()).catch(()=>{}).then(()=>new Promise(resolve=>{if((target._fullscreenState||false)===value)return resolve(value);const event=value?'enter-full-screen':'leave-full-screen';let timer;const done=()=>{clearTimeout(timer);target.removeListener(event,done);target._fullscreenState=value;resolve(value);};target.once(event,done);timer=setTimeout(()=>{target.removeListener(event,done);target._fullscreenState=target.isFullScreen();target.webContents.send('fullscreen',target._fullscreenState);resolve(target._fullscreenState);},defaults.window.transitionTimeoutMs);target.setFullScreen(value);}));return target._fullscreenQueue;
}
function contextFor(event){const ctx=windowContexts.get(event.sender.id);if(!ctx)throw new Error('Okno ni več odprto.');return ctx;}
function liveWindows(){return [...windowContexts.values()].filter(c=>!c.window.isDestroyed()&&!c.temporary);}
function saveWindows(fallback){const contexts=quitting?quitContexts:liveWindows(),selected=contexts.find(c=>c.window===(quitting?quitActive:win))||contexts[0]||fallback;const list=contexts.length?contexts:fallback?[fallback]:[];state={...(selected?.state||{tabs:[],active:0,closed:[],history:[]}),windows:list.map(c=>({...c.state,bounds:c.window.isDestroyed()?c.bounds:c.window.getBounds(),normalBounds:c.window.isDestroyed()?c.normalBounds:c.window.getNormalBounds(),maximized:c.window.isDestroyed()?c.maximized:c.window.isMaximized(),fullscreen:c.window.isDestroyed()?c.fullscreen:c.window.isFullScreen()})),activeWindow:Math.max(0,list.indexOf(selected))};return persist('history.json',state);}
function scheduleFileOpen(ctx){
  clearTimeout(ctx.openFilesTimer);
  if(!ctx.ready||!ctx.pending.length)return;
  ctx.openFilesTimer=setTimeout(()=>{
    if(ctx.window.isDestroyed()){const files=ctx.pending;ctx.pending=[];routeFiles(files);return;}
    const files=ctx.pending;ctx.pending=[];ctx.window.webContents.send('open-files',files);
  },defaults.fileOpening.batchDelayMs);
}
function routeFiles(files){
  const target=win&&!win.isDestroyed()?win:liveWindows()[0]?.window;
  if(!target){pending.push(...files);return;}
  const ctx=windowContexts.get(target.webContents.id);ctx.pending.push(...files);scheduleFileOpen(ctx);
  if(target.isMinimized())target.restore();target.show();target.focus();
}
function sweepReleases(){
  const used=new Set(liveWindows().flatMap(c=>c.state.tabs||[]).map(t=>t.path));
  const owned=new Set([...windowContexts.values()].flatMap(ctx=>[...ctx.mediaIds]));
  for(const id of releaseRequests){const meta=Media.mediaById.get(id);if(!meta){releaseRequests.delete(id);continue;}if(!owned.has(id)&&!used.has(meta.path)&&!exporting){Media.release(id);releaseRequests.delete(id);}}
}
async function describeOwned(event,file,existing=false){
  const ctx=contextFor(event),meta=existing?await require('./folder-navigation-main').describeExisting(file,value=>Media.describe(value)):await Media.describe(file);
  if(meta){
    if(ctx.window.isDestroyed()){releaseRequests.add(meta.id);sweepReleases();return null;}
    ctx.mediaIds.add(meta.id);releaseRequests.delete(meta.id);
  }
  return meta;
}
function createWindow(saved={tabs:[],active:0,closed:[],history:[]},bounds=null,options={}){
  const initialBounds=(saved.maximized||saved.fullscreen)&&saved.normalBounds?saved.normalBounds:bounds;
  const created=new BrowserWindow({...defaults.window,...initialBounds,show:!options.temporary&&process.env.VAP_TEST_MODE!=='1',frame:false,backgroundColor:'#080808',title:'Video Audio Image Viewer',icon:path.join(__dirname,'assets','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,offscreen:process.env.VAP_TEST_MODE==='1'}});
  const ctx={window:created,mediaIds:new Set(),temporary:!!options.temporary,dragPresentation:options.dragPresentation||null,state:{tabs:saved.tabs||[],active:saved.active||0,closed:saved.closed||[],history:saved.history||[]},ready:false,pending:[],bounds:created.getBounds(),normalBounds:created.getNormalBounds(),maximized:false,fullscreen:false};windowContexts.set(created.webContents.id,ctx);if(!ctx.temporary&&(!win||win.isDestroyed()))win=created;
  created.on('focus',()=>{if(!ctx.temporary){win=created;toolWindows.focusOwner(ctx);}});created.webContents.setWindowOpenHandler(()=>({action:'deny'}));created.webContents.on('will-navigate',e=>e.preventDefault());created.on('maximize',()=>created.webContents.send('maximized',true));created.on('unmaximize',()=>created.webContents.send('maximized',false));
  created._fullscreenState=false;for(const event of ['enter-full-screen','leave-full-screen'])created.on(event,()=>{created._fullscreenState=event==='enter-full-screen';created.webContents.send('fullscreen',created._fullscreenState);});
  created.on('close',event=>{ctx.bounds=created.getBounds();ctx.normalBounds=created.getNormalBounds();ctx.maximized=created.isMaximized();ctx.fullscreen=created.isFullScreen();if(exporting){event.preventDefault();dialog.showMessageBox(created,{type:'info',message:settings?.language==='en'?'Export is still running.':'Izvoz še poteka.',buttons:[settings?.language==='en'?'OK':'V redu']});}});
  const id=created.webContents.id;created.on('closed',()=>{for(const mediaId of ctx.mediaIds)releaseRequests.add(mediaId);windowContexts.delete(id);if(win===created)win=liveWindows().at(-1)?.window||null;if(!quitting&&!ctx.temporary)saveWindows(ctx);sweepReleases();if(!quitting&&!ctx.temporary&&!liveWindows().length){toolWindows.destroyToolWindows();app.quit();}});
  ctx.loaded=created.loadFile(path.join(__dirname,'index.html')).then(async()=>{if(saved.maximized)created.maximize();if(saved.fullscreen)await setFullscreen(true,created);if(process.env.VAP_TEST_MODE==='1')created.hide();return created;}).catch(error=>{if(created.isDestroyed())return created;throw error;});return created;
}
function load(name,fallback){try{return JSON.parse(fs.readFileSync(path.join(data,name),'utf8'));}catch{return fallback;}}
function persist(name,value){const bytes=JSON.stringify(value,null,2);writeQueue=writeQueue.catch(()=>{}).then(async()=>{const file=path.join(data,name);await fs.promises.writeFile(file+'.tmp',bytes,'utf8');await fs.promises.rename(file+'.tmp',file);});return writeQueue;}
function fileArgs(argv){const extensions=new Set(Object.values(defaults.mediaTypes).flat());return argv.filter(a=>!a.startsWith('-')&&path.isAbsolute(a)&&extensions.has(path.extname(a).slice(1).toLowerCase())&&fs.existsSync(a)&&fs.statSync(a).isFile());}
const single=app.requestSingleInstanceLock();
if(!single)app.quit();
else{
  pending=fileArgs(process.argv.slice(app.isPackaged?1:2));
  app.on('second-instance',(_event,argv)=>{routeFiles(fileArgs(argv));});
  app.on('open-file',(event,file)=>{event.preventDefault();routeFiles([file]);});
  app.whenReady().then(async()=>{
    await fs.promises.mkdir(data,{recursive:true});await fs.promises.mkdir(path.join(data,'electron','session'),{recursive:true});await fs.promises.mkdir(path.join(root,'OUTPUT'),{recursive:true});
    const savedSettings=load('settings.json',{});
    settings={...defaults.export,...defaults.preferences,...savedSettings,shortcuts:{...defaults.shortcuts,...savedSettings.shortcuts}};
    settings.maxOpenFiles=openFileLimit(settings.maxOpenFiles,defaults.preferences.maxOpenFiles);
    if((savedSettings.schemaVersion||0)<4){
      if(settings.shortcuts.export==='Ctrl+KeyM')settings.shortcuts.export='Ctrl+KeyS';
      if(settings.shortcuts.faster==='Shift+KeyD')settings.shortcuts.faster='KeyD';
      if(settings.shortcuts.draw==='KeyD')settings.shortcuts.draw='Ctrl+KeyD';
      if(settings.shortcuts.resetView==='KeyR')settings.shortcuts.resetView='Alt+KeyR';
      settings.schemaVersion=4;await persist('settings.json',settings);
    }
    state={...state,...load('history.json',{})};
    protocol.handle('media',async request=>{
      try{
        const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean),meta=Media.mediaById.get(parts[0]);
        if(url.hostname!=='local'||!meta||!['original','proxy','image'].includes(parts[1]))return new Response(null,{status:404});
        const file=parts[1]==='proxy'?meta.proxy:parts[1]==='image'?meta.image:meta.path;if(!file)return new Response(null,{status:404});
        const {size}=await fs.promises.stat(file);
        const types={'.mp4':'video/mp4','.m4v':'video/mp4','.mov':'video/quicktime','.mkv':'video/x-matroska','.webm':'video/webm','.mp3':'audio/mpeg','.wav':'audio/wav','.flac':'audio/flac','.ogg':'audio/ogg','.opus':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.bmp':'image/bmp','.svg':'image/svg+xml','.avif':'image/avif','.ico':'image/x-icon'};
        let start=0,end=size-1,status=200;const range=request.headers.get('range');
        if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
          if(!match[1])start=Math.max(0,size-Number(match[2]));else start=Number(match[1]);if(match[1]&&match[2])end=Math.min(end,Number(match[2]));
          if(start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});status=206;
        }
        const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*'};
        if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
        if(request.method==='HEAD')return new Response(null,{status,headers});
        const stream=fs.createReadStream(file,{start,end,highWaterMark:256*1024});
        request.signal.addEventListener('abort',()=>stream.destroy(),{once:true});
        return new Response(Readable.toWeb(stream),{status,headers});
      }catch{return new Response(null,{status:404});}
    });
    Menu.setApplicationMenu(null);
    const restoreActive=state.activeWindow||0;const savedWindows=Array.isArray(state.windows)&&state.windows.length?state.windows:[state];
    for(const saved of savedWindows){const created=createWindow(saved,saved.bounds||null);await windowContexts.get(created.webContents.id).loaded;}
    win=liveWindows()[Math.min(restoreActive,liveWindows().length-1)].window;
    if(pending.length){const files=pending;pending=[];routeFiles(files);}
  }).catch(error=>{dialog.showErrorBox('Video Audio Image Viewer',error.message);app.quit();});
}
function metaFor(id){const meta=Media.mediaById.get(id);if(!meta)throw new Error('Posnetek ni več odprt.');return meta;}
function notify(id,event){for(const ctx of liveWindows())ctx.window.webContents.send('progress',{id,...event});}
ipcMain.handle('init',event=>{const ctx=contextFor(event);ctx.ready=true;scheduleFileOpen(ctx);const files=[];return {config:defaults,settings,state:ctx.state,files,windowId:ctx.window.id,dragPresentation:ctx.dragPresentation};});
ipcMain.handle('pick-files',async event=>{const win=contextFor(event).window;const result=await dialog.showOpenDialog(win,{title:settings.language==='en'?'Open media':'Odpri video, zvok ali sliko',properties:['openFile','multiSelections'],filters:[{name:'Video / Audio / Images',extensions:Object.values(defaults.mediaTypes).flat()},{name:'All files',extensions:['*']}]});return result.canceled?[]:result.filePaths;});
ipcMain.handle('authorize-files',(event,files)=>authorizeFiles(contextFor(event).window,files));
ipcMain.handle('describe',(event,file)=>describeOwned(event,file));
ipcMain.handle('frame',(_event,{id,time,direction})=>Media.getFrame(metaFor(id),Number(time),Number(direction)||0,event=>notify(id,event)));
ipcMain.handle('prepare-image',async(_event,id)=>{
  const meta=metaFor(id);if(!meta.isImage)throw new Error('Not an image.');await fs.promises.mkdir(Media.cache,{recursive:true});
  const svg=path.extname(meta.path).toLowerCase()==='.svg',target=path.join(Media.cache,meta.id+(svg?'.svg':'.png'));
  if(!fs.existsSync(target)){if(svg){let xml=await fs.promises.readFile(meta.path,'utf8');xml=xml.replace(/<svg\b[^>]*>/i,tag=>tag.replace(/\b(?:width|height)=["'][^"']*["']/gi,'').replace(/>$/,` width="${meta.width}" height="${meta.height}">`));await fs.promises.writeFile(target,xml,'utf8');}else await Media.run('ffmpeg',['-v','error','-y','-i',meta.path,'-frames:v','1','-c:v','png',target]);}
  meta.image=target;return `media://local/${meta.id}/image`;
});
ipcMain.handle('prepare',(_event,id)=>Media.proxy(metaFor(id),event=>notify(id,event)));
ipcMain.handle('release',(event,id)=>{contextFor(event).mediaIds.delete(id);releaseRequests.add(id);sweepReleases();});
ipcMain.handle('reveal',(_event,id)=>shell.showItemInFolder(metaFor(id).path));
ipcMain.handle('fullscreen',event=>{const target=contextFor(event).window;return setFullscreen(!target._fullscreenState,target);});
ipcMain.handle('fit-video-window',async(_event,{ratio,headerHeight,expand=false,maxMode=null})=>{const win=contextFor(_event).window;
  if(!Number.isFinite(ratio)||ratio<=0||!Number.isFinite(headerHeight)||headerHeight<0||headerHeight>100)throw new Error('Neveljavne mere videa.');
  await setFullscreen(false,win);
  if(win.isMaximized()){win.unmaximize();await new Promise(resolve=>setTimeout(resolve,100));}
  const bounds=win.getBounds(),content=win.getContentBounds(),work=screen.getDisplayNearestPoint({x:Math.round(bounds.x+bounds.width/2),y:Math.round(bounds.y+bounds.height/2)}).workArea;
  const next=fitWindow(bounds,content,work,ratio,headerHeight,maxMode===true?Number.POSITIVE_INFINITY:defaults.view.windowFitTolerance,expand,maxMode===null?settings.escapeMaxFit:!!maxMode);
  win.setMinimumSize(1,1);win.setBounds(next);
  return win.getBounds();
});
ipcMain.handle('settings',async(_event,value)=>{
  const formats={videoFormat:['mp4','mkv','webm','mov'],audioFormat:['mp3','flac','wav','m4a','ogg'],imageFormat:['png','jpg','webp']};
  for(const key of Object.keys(formats))if(formats[key].includes(value[key]))settings[key]=value[key];
  if(['sl','en'].includes(value.language))settings.language=value.language;
  if(['name','modified','created','size'].includes(value.folderSort))settings.folderSort=value.folderSort;
  for(const key of ['folderDescending','matchSource','openAfterExport','escapeMaxFit','timelinePreviewFitAspect','linkDrawingTools','showRemovedClipboardImages'])if(typeof value[key]==='boolean')settings[key]=value[key];
  if(typeof value.backgroundColor==='string'&&/^#[0-9a-f]{8}$/i.test(value.backgroundColor))settings.backgroundColor=value.backgroundColor;
  if(Object.hasOwn(value,'maxOpenFiles'))settings.maxOpenFiles=openFileLimit(value.maxOpenFiles,defaults.preferences.maxOpenFiles);
  if(value.shortcuts){const next={};for(const key of Object.keys(defaults.shortcuts)){const binding=value.shortcuts[key];if(typeof binding!=='string'||!/^(?:(?:Ctrl|Alt|Shift|Meta|Escape)\+)*(?:Key[A-Z]|Digit[0-9]|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Space|Comma|Period|Tab|Escape|Backspace|Delete|Enter|Home|End|PageUp|PageDown|BracketLeft|BracketRight|Minus|Equal|Slash|Semicolon|Quote|Backquote|F(?:[1-9]|1[0-2]))$/.test(binding))throw new Error('Neveljavna bližnjica.');next[key]=binding;}if(new Set(Object.values(next)).size!==Object.keys(next).length)throw new Error('Bližnjice se ne smejo ponavljati.');settings.shortcuts=next;}
  if(value.drawingCustomization&&typeof value.drawingCustomization==='object'&&JSON.stringify(value.drawingCustomization).length<65536)settings.drawingCustomization=JSON.parse(JSON.stringify(value.drawingCustomization));
  if(Number.isFinite(value.tabDetachDistance))settings.tabDetachDistance=Math.max(0,Math.min(1000,Math.round(value.tabDetachDistance)));
  for(const key of ['timelinePreviewWidth','timelinePreviewHeight'])if(Number.isFinite(value[key]))settings[key]=Math.max(80,Math.min(640,Math.round(value[key])));if(typeof value.timelinePreviewEnabled==='boolean')settings.timelinePreviewEnabled=value.timelinePreviewEnabled;
  await persist('settings.json',settings);for(const ctx of liveWindows())if(ctx.window.webContents.id!==_event.sender.id)ctx.window.webContents.send('settings-changed',settings);toolWindows.preferencesChanged(settings);return settings;
});
ipcMain.handle('save-session',async(_event,next)=>{const ctx=windowContexts.get(_event.sender.id);if(!ctx)return;
  if(!Array.isArray(next.tabs)||!Array.isArray(next.closed)||!Array.isArray(next.history))return;
  ctx.state={tabs:next.tabs,active:next.active,closed:next.closed.slice(-defaults.storage.closedTabs),history:next.history.slice(-defaults.storage.historyEntries)};if(!ctx.temporary){await saveWindows(ctx);sweepReleases();}
});
ipcMain.handle('export',async(_event,{id,selection,folder,options})=>{const win=contextFor(_event).window;
  if(exporting)throw new Error('Izvoz že poteka.');
  const exportSettings={...settings};for(const key of ['videoFormat','audioFormat','imageFormat','matchSource','openAfterExport','contentMode'])if(options&&Object.hasOwn(options,key))exportSettings[key]=options[key];
  const meta=metaFor(id),plan=Media.exportPlan(meta,selection,exportSettings);
  const name=path.basename(meta.path,path.extname(meta.path))+'_izrez.'+plan.format;
  const result=await dialog.showSaveDialog(win,{title:settings.language==='en'?'Save selection':'Shrani izrez',defaultPath:path.join((typeof folder==='string'&&fs.existsSync(folder)&&fs.statSync(folder).isDirectory())?folder:app.getPath('downloads'),name),filters:[{name:plan.format.toUpperCase(),extensions:[plan.format]}]});
  if(result.canceled)return null;
  let destination=result.filePath;if(path.extname(destination).toLowerCase()!=='.'+plan.format)destination+='.'+plan.format;
  exporting=true;
  try{const exported=await Media.exportMedia(meta,selection,exportSettings,destination,event=>notify(id,event));const dir=path.dirname(destination),recent=load('recent-folders.json',[]);await persist('recent-folders.json',[dir,...recent.filter(p=>p.toLowerCase()!==dir.toLowerCase())].slice(0,defaults.storage.recentFolders));return exported;}finally{exporting=false;notify(id,{label:'',fraction:1});}
});
ipcMain.handle('export-folders',(_event,request)=>{
  const meta=metaFor(typeof request==='string'?request:request.id),type=request.kind||meta.kind,order=[type,...['video','audio','image'].filter(t=>t!==type)],key={video:'videos',audio:'music',image:'pictures'};
  return {choices:[{key:'source',path:path.dirname(meta.path)},{key:'downloads',path:app.getPath('downloads')},...order.map(t=>({key:t,path:app.getPath(key[t])}))],recent:load('recent-folders.json',[]).filter(p=>fs.existsSync(p))};
});
const FolderNavigation=require('./folder-navigation-main');
function folderSnapshot(request){
  // Paths remain usable after the current file is deleted or its media handle expires.
  const meta=typeof request.path==='string'&&path.isAbsolute(request.path)?null:metaFor(request.id);
  const file=meta?meta.path:request.path,kind=meta?.kind||Object.keys(defaults.mediaTypes).find(type=>defaults.mediaTypes[type].includes(path.extname(file).slice(1).toLowerCase()));
  return FolderNavigation.readFolder(file,Array.isArray(request.types)?request.types:[kind],defaults.mediaTypes,settings);
}
ipcMain.handle('folder-files',async(_event,request)=>(await folderSnapshot(request)).files);
ipcMain.handle('folder-snapshot',(_event,request)=>folderSnapshot(request));
let pendingWarmFiles=[],warmingFiles=0;
const warmInFlight=new Set();
function warmNextFiles(){
  while(warmingFiles<defaults.fileOpening.prefetchConcurrency&&pendingWarmFiles.length){
    const file=pendingWarmFiles.shift();if(warmInFlight.has(file))continue;
    warmingFiles++;warmInFlight.add(file);
    Media.describe(file,{activate:false}).catch(()=>{}).finally(()=>{warmingFiles--;warmInFlight.delete(file);if(!quitting)warmNextFiles();});
  }
}
ipcMain.on('warm-folder-neighbors',async(event,request)=>{
  try{
    const ctx=contextFor(event),generation=ctx.warmGeneration=(ctx.warmGeneration||0)+1;
    const {files}=await folderSnapshot(request);
    if(quitting||ctx.window.isDestroyed()||ctx.warmGeneration!==generation)return;
    const index=files.findIndex(file=>file.toLowerCase()===request.path.toLowerCase());if(index<0)return;
    pendingWarmFiles=[...new Set([-1,1].map(direction=>files[(index+direction+files.length)%files.length]))].filter(file=>file!==files[index]);
    warmNextFiles();
  }catch{} // Prefetch is optional; navigation itself reports real errors.
});
ipcMain.handle('describe-existing',(event,file)=>describeOwned(event,file,true));
ipcMain.handle('confirm-leave',async event=>{const win=contextFor(event).window;const en=settings.language==='en';const result=await dialog.showMessageBox(win,{type:'question',message:en?'Leave the unfinished drawing?':'Zapusti nedokončano risanje?',detail:en?'The unfinished stroke will be discarded.':'Nedokončana poteza bo zavržena.',buttons:en?['Leave','Cancel']:['Zapusti','Prekliči'],defaultId:1,cancelId:1,noLink:true});return result.response===0;});
ipcMain.handle('delete-file',async(_event,request)=>{
  if(exporting)throw new Error(settings.language==='en'?'Wait for export to finish.':'Počakaj, da se izvoz konča.');if(!request?.confirmed)return false;const meta=metaFor(request.id);
  await shell.trashItem(meta.path);return true;
});
ipcMain.on('window',(_event,action)=>{const win=contextFor(_event).window;if(action==='minimize')win.minimize();if(action==='maximize')win.isMaximized()?win.unmaximize():win.maximize();if(action==='close')win.close();});
app.on('window-all-closed',()=>{Media.shutdown();writeQueue.finally(()=>app.quit());});
app.on('before-quit',()=>{if(!quitting){quitting=true;quitContexts=liveWindows();quitActive=win;if(quitContexts.length)saveWindows();}toolWindows.destroyToolWindows();Media.shutdown();});
app.on('will-quit',event=>{if(quitFlushed)return;event.preventDefault();writeQueue.finally(()=>{quitFlushed=true;app.quit();});});
module.exports={getWindow:()=>win,getWindows:()=>liveWindows().map(c=>c.window),createWindow,routeFiles,fileArgs,...toolWindows};

const tabWindows=require('./tab-windows-main')({ipcMain,screen,defaults,contextFor,liveWindows,windowContexts,createWindow,saveWindows,setFullscreen});Object.assign(module.exports,tabWindows);

require('./media-overlays-main')({ipcMain,dialog,contextFor,metaFor,Media,defaults,getSettings:()=>settings});

require('./viewer-extras-main')({ipcMain,dialog,contextFor,metaFor,Media,defaults,getSettings:()=>settings,data,load});
