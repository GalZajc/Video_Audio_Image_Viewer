'use strict';
const {app}=require('electron'),path=require('node:path');
module.exports=function({ipcMain,screen,defaults,contextFor,liveWindows,windowContexts,createWindow,saveWindows,setFullscreen}){
 const candidates=new Map();let spare=null,warmTimer;
 function warm(){
  clearTimeout(warmTimer);if(spare&&!spare.window.isDestroyed()||!liveWindows().length||app.isQuitting)return;
  const window=createWindow({tabs:[],active:0,closed:[],history:[]},null,{temporary:true});spare=windowContexts.get(window.webContents.id);window.setFocusable(false);window.setSkipTaskbar(true);window.setIgnoreMouseEvents(true);
 }
 function scheduleWarm(){clearTimeout(warmTimer);warmTimer=setTimeout(warm,defaults.view.tabWarmDelayMs);warmTimer.unref();}
 app.whenReady().then(scheduleWarm);app.on('before-quit',()=>{clearTimeout(warmTimer);app.isQuitting=true;});
 const point=drag=>process.env.VAP_TEST_MODE==='1'?drag.point:screen.getCursorScreenPoint();
 function clearTarget(drag){if(drag.target&&!drag.target.window.isDestroyed())drag.target.window.webContents.send('tab-drag-target',null);drag.target=null;drag.targetIndex=null;}
 function dispose(drag){
  clearInterval(drag.timer);clearTarget(drag);drag.sender.removeListener('destroyed',drag.cleanup);if(candidates.get(drag.sourceId)===drag)candidates.delete(drag.sourceId);
  if(drag.single&&!drag.window.isDestroyed())drag.window.setOpacity(1);
  if(!drag.single&&!drag.promoted&&!drag.window.isDestroyed()){
   drag.window.hide();drag.window.setOpacity(1);drag.ctx.state={tabs:[],active:0,closed:[],history:[]};drag.ctx.dragPresentation=null;
   drag.window.webContents.send('tab-drag-reset');
   if(!spare)spare=drag.ctx;else drag.window.destroy();
  }
 }
 function targetAt(drag,p){return liveWindows().find(c=>{if(c===drag.source||c.window.isMinimized())return false;const b=c.window.getBounds();return p.x>=b.x&&p.x<b.x+b.width-128&&p.y>=b.y&&p.y<b.y+defaults.view.tabAttachHeight;});}
 function reveal(drag){if(!drag.outside||drag.window.isDestroyed()||drag.target)return;drag.visible=true;drag.window.setOpacity(1);if(!drag.single)drag.window.showInactive();}
 function update(drag){
  if(drag.window.isDestroyed())return;const p=point(drag),target=drag.outside?targetAt(drag,p):null;
  if(target!==drag.target){clearTarget(drag);drag.target=target;drag.lastTargetX=null;}
  if(target){const b=target.window.getBounds(),x=p.x-b.x;
   if(drag.lastTargetX===null||Math.abs(x-drag.lastTargetX)>=1){drag.lastTargetX=x;target.window.webContents.send('tab-drag-target',{sourceId:drag.sourceId,x,offset:drag.offset,title:path.basename(drag.tab.path),kind:drag.kind,tab:drag.tab});}
   drag.window.setOpacity(0);
  }else{
   if(drag.outside)drag.window.setPosition(Math.round(p.x-drag.grabX),Math.round(p.y-drag.grabY));
   if(drag.readyResolved)reveal(drag);
   if(!drag.outside&&!drag.single)drag.window.hide();
  }
 }
 ipcMain.on('drag-content-ready',event=>windowContexts.get(event.sender.id)?.resolveDragReady?.());
 ipcMain.on('tab-drag-target-position',(event,value)=>{const drag=candidates.get(value?.sourceId);if(drag?.target===windowContexts.get(event.sender.id)&&Number.isInteger(value.index))drag.targetIndex=Math.max(0,Math.min(drag.target.state.tabs.length,value.index));});
 ipcMain.on('tab-drag-preview',(event,value)=>{
  const id=event.sender.id;let drag=candidates.get(id);
  if(!value||value.phase==='cancel'||value.visible===false&&!value.phase){if(drag)dispose(drag);return;}
  if(value.phase==='begin'){
   if(drag)dispose(drag);const source=contextFor(event);if(!value.tab?.path)return;
   const normal=source.window.getNormalBounds(),bounds=source.window.getBounds(),single=value.single===true,b=source.window.isMaximized()||source.window.isFullScreen()?normal:bounds;
   const presentation={left:Math.max(0,Math.min(value.left||0,b.width-128-(value.width||192))),width:Math.max(20,value.width||192)};
   let ctx,target;if(single){target=source.window;ctx=source;}else{
    if(!spare||spare.window.isDestroyed())warm();ctx=spare;spare=null;target=ctx.window;target.setBounds(b);ctx.dragPresentation=presentation;
   }
   drag={source,sourceId:id,sender:event.sender,window:target,ctx,tab:value.tab,kind:value.kind,point:value,offset:value.offset||0,grabX:value.grabX,grabY:value.grabY,outside:!!value.visible,single,visible:false,promoted:false,timer:null,target:null};
   drag.cleanup=()=>dispose(drag);candidates.set(id,drag);
   drag.ready=ctx.loaded.then(async()=>{
    if(candidates.get(id)!==drag)return;
    if(single){if(drag.outside){if(source.window.isFullScreen())await setFullscreen(false,source.window);if(source.window.isMaximized())source.window.unmaximize();source.window.setBounds(b);}}
    else{target.webContents.send('tab-drag-presentation',presentation);target.webContents.send('receive-tab',{tab:{...value.tab,playing:false},index:0});}
    drag.readyResolved=true;update(drag);
   }).catch(error=>{if(!target.isDestroyed()&&candidates.get(id)===drag)console.error(error.message);});
   drag.timer=setInterval(()=>update(drag),defaults.view.tabDragPreviewIntervalMs);event.sender.once('destroyed',drag.cleanup);update(drag);return;
  }
  if(!drag)return;drag.point=value;const wasOutside=drag.outside;drag.outside=!!value.visible;
  if(drag.single&&drag.outside&&!wasOutside){drag.readyResolved=false;drag.ready=(async()=>{if(drag.source.window.isFullScreen())await setFullscreen(false,drag.source.window);if(drag.source.window.isMaximized())drag.source.window.unmaximize();drag.source.window.setBounds(drag.source.window.getNormalBounds());drag.readyResolved=true;update(drag);})();}
  update(drag);
 });
 ipcMain.handle('move-tab',async(event,{tab,x,y})=>{
  const source=contextFor(event);if(!tab||typeof tab.path!=='string'||!source.state.tabs.some(t=>t.instanceId===tab.instanceId)||!Number.isFinite(x)||!Number.isFinite(y))throw Error('Neveljaven prenos zavihka.');
  const candidate=candidates.get(event.sender.id);if(candidate){candidate.point={x,y};await candidate.ready;update(candidate);}
  let target=candidate?.target;
  if(!candidate){target=liveWindows().find(ctx=>{if(ctx===source||ctx.window.isMinimized())return false;const b=ctx.window.getBounds();return x>=b.x&&x<b.x+b.width-128&&y>=b.y&&y<b.y+defaults.view.tabAttachHeight;});
   if(!target){const b=source.window.isMaximized()||source.window.isFullScreen()?source.window.getNormalBounds():source.window.getBounds(),work=screen.getDisplayNearestPoint({x:Math.round(x),y:Math.round(y)}).workArea,width=Math.min(b.width,work.width),height=Math.min(b.height,work.height),window=createWindow({tabs:[tab],active:0,closed:[],history:[]},{width,height,x:Math.round(Math.max(work.x,Math.min(work.x+work.width-width,x-width/2))),y:Math.round(Math.max(work.y,Math.min(work.y+work.height-height,y-14)))});target=windowContexts.get(window.webContents.id);await target.loaded;source.state.tabs=source.state.tabs.filter(t=>t.instanceId!==tab.instanceId);await saveWindows();return {windowId:window.id};}
  }
  if(!target&&candidate?.single){dispose(candidate);await saveWindows();return {windowId:source.window.id,sameWindow:true};}
  if(!target&&candidate){
   candidate.promoted=true;target=candidate.ctx;target.temporary=false;target.dragPresentation=null;target.state.tabs=[tab];
   clearInterval(candidate.timer);candidate.sender.removeListener('destroyed',candidate.cleanup);candidates.delete(candidate.sourceId);
   target.window.setOpacity(1);target.window.setIgnoreMouseEvents(false);target.window.setFocusable(true);target.window.setSkipTaskbar(false);target.window.webContents.send('tab-drag-presentation',{commit:tab});scheduleWarm();
  }else if(target){
   const index=candidate?.targetIndex??Math.min(target.state.tabs.length,Math.max(0,Math.floor((x-target.window.getBounds().x)/192)));target.state.tabs.splice(index,0,tab);target.window.webContents.send('receive-tab',{tab,index});
   if(candidate){candidate.target=null;dispose(candidate);}
  }else throw Error('The tab drag has ended.');
  source.state.tabs=source.state.tabs.filter(t=>t.instanceId!==tab.instanceId);await saveWindows();if(process.env.VAP_TEST_MODE!=='1'){target.window.show();target.window.focus();}return {windowId:target.window.id};
 });
 return {getDragWindows:()=>[...candidates.values()].map(d=>d.window)};
};
