'use strict';
const {BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');
module.exports=function({ipcMain,screen,defaults,contextFor,data}){
 const windows=new Map(),file=path.join(data,'tool-windows.json');let owner=null,snapshot=null,bounds={};
 try{bounds=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 function save(){fs.mkdirSync(data,{recursive:true});fs.writeFileSync(file,JSON.stringify(bounds,null,2),'utf8');}
 function create(kind){
  const o=owner.window.getBounds(),work=screen.getDisplayMatching(o).workArea,w=defaults.drawing.paletteWindowWidth;
  const fallback={x:Math.min(work.x+work.width-w,o.x+o.width-w*(kind==='palette'?2:1)),y:o.y+defaults.view.tabAttachHeight,width:w,height:kind==='palette'?530:360};
  const b=bounds[kind]||fallback,display=screen.getDisplayMatching(b).workArea;
  b.x=Math.max(display.x,Math.min(display.x+display.width-b.width,b.x));b.y=Math.max(display.y,Math.min(display.y+display.height-24,b.y));
  const win=new BrowserWindow({...b,minWidth:w,minHeight:60,show:false,frame:false,resizable:false,backgroundColor:'#1e1e1e',title:kind==='palette'?'Drawing tools':'Drawing color',icon:path.join(__dirname,'assets/icon.png'),webPreferences:{preload:path.join(__dirname,'tool-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,offscreen:process.env.VAP_TEST_MODE==='1'}});
  windows.set(kind,win);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.on('move',()=>{bounds[kind]=win.getBounds();save();});
  win.on('close',event=>{if(owner&&!owner.window.isDestroyed()){event.preventDefault();owner.window.webContents.send('drawing-tool-command',{action:'hide'});hide();}});
  win.loadFile(path.join(__dirname,'tool-windows.html'),{query:{kind}}).then(()=>{if(win.isDestroyed())return;if(snapshot)win.webContents.send('drawing-tool-state',snapshot);if(snapshot?.visible&&process.env.VAP_TEST_MODE!=='1')win.showInactive();}).catch(error=>{if(!win.isDestroyed())console.error(error.message);});return win;
 }
 function hide(){for(const win of windows.values())if(!win.isDestroyed())win.hide();}
 function toolEvent(event){return [...windows.values()].some(win=>!win.isDestroyed()&&win.webContents.id===event.sender.id);}
 ipcMain.on('drawing-tools-sync',(event,value)=>{
  const ctx=contextFor(event);if(!value||!value.options)return;
  if(owner&&owner!==ctx&&!ctx.window.isFocused()&&!value.claim)return;
  if(owner!==ctx){owner=ctx;ctx.window.once('closed',()=>{if(owner===ctx){owner=null;hide();}});}
  snapshot=value;
  if(value.visible){for(const kind of ['palette','color']){const win=windows.get(kind);if(!win||win.isDestroyed())create(kind);else{win.webContents.send('drawing-tool-state',value);if(!win.isVisible()&&process.env.VAP_TEST_MODE!=='1')win.showInactive();}}}
  else hide();
 });
 ipcMain.handle('drawing-tool-init',event=>{if(!toolEvent(event))throw Error('Unknown tool window');return {config:defaults,...snapshot};});
 ipcMain.on('drawing-tool-command',(event,value)=>{if(toolEvent(event)&&owner&&!owner.window.isDestroyed())owner.window.webContents.send('drawing-tool-command',value);});
 ipcMain.on('drawing-tool-size',(event,height)=>{if(!toolEvent(event)||!Number.isFinite(height))return;const win=BrowserWindow.fromWebContents(event.sender),work=screen.getDisplayMatching(win.getBounds()).workArea;win.setSize(defaults.drawing.paletteWindowWidth,Math.min(work.height,Math.max(60,Math.ceil(height))));});
 return {getToolWindows:()=>[...windows.values()],destroyToolWindows:()=>{owner=null;for(const win of windows.values())if(!win.isDestroyed())win.destroy();}};
};
