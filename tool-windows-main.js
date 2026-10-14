'use strict';
const {BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');
module.exports=function({ipcMain,screen,defaults,contextFor,data,getSettings}){
 const windows=new Map(),snapshots=new Map(),file=path.join(data,'tool-windows.json');let owner=null,snapshot=null,bounds={},sharedOptions=null,linked=false,stopping=false;
 const copy=value=>JSON.parse(JSON.stringify(value));
 try{bounds=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 function save(){fs.mkdirSync(data,{recursive:true});fs.writeFileSync(file,JSON.stringify(bounds,null,2),'utf8');}
 function hide(){for(const win of windows.values())if(!win.isDestroyed())win.hide();}
 function create(kind){
  const o=owner.window.getBounds(),work=screen.getDisplayMatching(o).workArea,w=defaults.drawing.paletteWindowWidth;
  const fallback={x:Math.min(work.x+work.width-w,o.x+o.width-w*(kind==='palette'?2:1)),y:o.y+defaults.view.tabAttachHeight,width:w,height:kind==='palette'?530:360};
  const b={...(bounds[kind]||fallback)},display=screen.getDisplayMatching(b).workArea;b.x=Math.max(display.x,Math.min(display.x+display.width-b.width,b.x));b.y=Math.max(display.y,Math.min(display.y+display.height-24,b.y));
  const win=new BrowserWindow({...b,minWidth:w,minHeight:60,show:false,frame:false,resizable:false,alwaysOnTop:true,backgroundColor:'#1e1e1e',title:kind==='palette'?'Drawing tools':'Drawing color',icon:path.join(__dirname,'assets/icon.png'),webPreferences:{preload:path.join(__dirname,'tool-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,offscreen:process.env.VAP_TEST_MODE==='1'}});
  win.setAlwaysOnTop(true,'screen-saver');windows.set(kind,win);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.on('move',()=>{bounds[kind]=win.getBounds();save();});
  win.on('close',event=>{if(owner&&!owner.window.isDestroyed()){event.preventDefault();owner.window.webContents.send('drawing-tool-command',{action:'hide',ownerId:owner.window.webContents.id,tabId:snapshot?.tabId});hide();}});
  win.loadFile(path.join(__dirname,'tool-windows.html'),{query:{kind}}).then(()=>{if(win.isDestroyed())return;if(snapshot)win.webContents.send('drawing-tool-state',snapshot);if(snapshot?.visible&&process.env.VAP_TEST_MODE!=='1'){win.showInactive();win.moveTop();}}).catch(error=>{if(!win.isDestroyed())console.error(error.message);});return win;
 }
 function apply(ctx,value){
  if(ctx.window.isDestroyed()||ctx.temporary)return;owner=ctx;linked=!!getSettings()?.linkDrawingTools;
  if(linked&&!sharedOptions)sharedOptions=copy(value.options);
  snapshot={...value,options:copy(linked?sharedOptions:value.options),ownerId:ctx.window.webContents.id};
  if(linked&&JSON.stringify(value.options)!==JSON.stringify(sharedOptions))ctx.window.webContents.send('drawing-tools-options',{options:sharedOptions,linked:true});
  for(const kind of ['palette','color']){let win=windows.get(kind);if((!win||win.isDestroyed())&&snapshot.visible)win=create(kind);if(!win||win.isDestroyed())continue;
   win.webContents.send('drawing-tool-state',snapshot);if(snapshot.visible){win.setAlwaysOnTop(true,'screen-saver');if(!win.isVisible()&&process.env.VAP_TEST_MODE!=='1'){win.showInactive();win.moveTop();}}else win.hide();
  }
 }
 function focusOwner(ctx){
  if(ctx.temporary||ctx.window.isDestroyed())return;owner=ctx;const cached=snapshots.get(ctx.window.webContents.id);
  if(cached)apply(ctx,cached.value);else hide();
  ctx.window.webContents.send('drawing-tools-request');
 }
 function broadcastShared(){for(const {ctx} of snapshots.values())if(!ctx.window.isDestroyed()&&!ctx.temporary)ctx.window.webContents.send('drawing-tools-options',{linked:true,options:sharedOptions});}
 function preferencesChanged(settings){
  if(!!settings.linkDrawingTools===linked)return;linked=!!settings.linkDrawingTools;
  if(linked){sharedOptions=copy(snapshot?.options||settings.drawingCustomization||defaults.drawing);broadcastShared();}
  else for(const {ctx} of snapshots.values())if(!ctx.window.isDestroyed())ctx.window.webContents.send('drawing-tools-options',{linked:false});
  if(owner&&!owner.window.isDestroyed())owner.window.webContents.send('drawing-tools-request');
 }
 function toolEvent(event){return [...windows.values()].some(win=>!win.isDestroyed()&&win.webContents.id===event.sender.id);}
 ipcMain.on('drawing-tools-sync',(event,value)=>{
  const ctx=contextFor(event);if(ctx.temporary||!value?.options)return;snapshots.set(event.sender.id,{ctx,value});
  if(getSettings()?.linkDrawingTools&&value.commit){sharedOptions=copy(value.options);broadcastShared();}
  if(owner&&owner!==ctx&&!ctx.window.isFocused()){if(value.commit&&getSettings()?.linkDrawingTools){const cached=snapshots.get(owner.window.webContents.id);if(cached)apply(owner,cached.value);}return;}
  if(!ctx._toolsCloseHook){ctx._toolsCloseHook=true;ctx.window.once('closed',()=>{snapshots.delete(event.sender.id);if(owner===ctx){owner=null;snapshot=null;hide();}});}
  apply(ctx,value);
 });
 ipcMain.handle('drawing-tool-init',event=>{if(stopping)return {config:defaults,visible:false};if(!toolEvent(event))throw Error('Unknown tool window');return {config:defaults,...snapshot};});
 ipcMain.on('drawing-tool-command',(event,value)=>{if(!toolEvent(event)||!owner||owner.window.isDestroyed())return;if(value.ownerId!==owner.window.webContents.id||value.tabId!==snapshot?.tabId)return;owner.window.webContents.send('drawing-tool-command',value);});
 ipcMain.on('drawing-tool-size',(event,height)=>{if(!toolEvent(event)||!Number.isFinite(height))return;const win=BrowserWindow.fromWebContents(event.sender),work=screen.getDisplayMatching(win.getBounds()).workArea,h=Math.min(work.height,defaults.drawing.paletteMaxHeight,Math.max(60,Math.ceil(height)));if(win.getContentBounds().height!==h)win.setContentSize(defaults.drawing.paletteWindowWidth,h);const b=win.getBounds();if(b.y+b.height>work.y+work.height)win.setPosition(b.x,Math.max(work.y,work.y+work.height-b.height));});
 return {focusOwner,preferencesChanged,getToolWindows:()=>[...windows.values()],destroyToolWindows:()=>{stopping=true;owner=null;for(const win of windows.values())if(!win.isDestroyed())win.destroy();}};
};
