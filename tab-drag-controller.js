'use strict';
const path=require('node:path');
module.exports=function({ipcMain,screen,defaults,contextFor,liveWindows,windowContexts,createWindow,saveWindows,setFullscreen}){
 const candidates=new Map();
 const point=drag=>process.env.VAP_TEST_MODE==='1'?drag.point:screen.getCursorScreenPoint();
 function clearTarget(drag){if(drag.target&&!drag.target.window.isDestroyed())drag.target.window.webContents.send('tab-drag-target',null);drag.target=null;}
 function dispose(drag){clearInterval(drag.timer);clearInterval(drag.fade);clearTarget(drag);drag.sender.removeListener('destroyed',drag.cleanup);if(candidates.get(drag.sourceId)===drag)candidates.delete(drag.sourceId);if(!drag.single&&!drag.promoted&&!drag.window.isDestroyed())drag.window.destroy();}
 function targetAt(drag,p){return liveWindows().find(c=>{if(c===drag.source||c.window.isMinimized())return false;const b=c.window.getBounds();return p.x>=b.x&&p.x<b.x+b.width-128&&p.y>=b.y&&p.y<b.y+defaults.view.tabAttachHeight;});}
 function update(drag){
  if(drag.window.isDestroyed())return;const p=point(drag);
  if(drag.single||drag.outside)drag.window.setPosition(Math.round(p.x-drag.grabX),Math.round(p.y-drag.grabY));
  const target=drag.outside||drag.single?targetAt(drag,p):null;
  if(target!==drag.target){clearTarget(drag);drag.target=target;drag.lastTargetX=null;}
  if(target){const b=target.window.getBounds(),x=p.x-b.x;if(drag.lastTargetX===null||Math.abs(x-drag.lastTargetX)>=1){drag.lastTargetX=x;target.window.webContents.send('tab-drag-target',{sourceId:drag.sourceId,x,title:path.basename(drag.tab.path),kind:drag.kind});}if(!drag.single)drag.window.setOpacity(.25);}
  else if(drag.visible&&!drag.fade)drag.window.setOpacity(1);
 }
 function reveal(drag){if(!drag.outside||drag.visible||drag.window.isDestroyed())return;drag.visible=true;drag.window.showInactive();const start=Date.now();drag.window.setOpacity(.15);clearInterval(drag.fade);drag.fade=setInterval(()=>{if(drag.window.isDestroyed()){clearInterval(drag.fade);drag.fade=null;return;}const fraction=Math.min(1,(Date.now()-start)/defaults.view.tabDetachFadeMs);drag.window.setOpacity(drag.target?.25:.15+.85*fraction);if(fraction===1){clearInterval(drag.fade);drag.fade=null;}},16);}
 ipcMain.on('drag-content-ready',event=>windowContexts.get(event.sender.id)?.resolveDragReady?.());
 ipcMain.on('tab-drag-target-position',(event,value)=>{const drag=candidates.get(value?.sourceId);if(drag?.target===windowContexts.get(event.sender.id)&&Number.isInteger(value.index))drag.targetIndex=Math.max(0,Math.min(drag.target.state.tabs.length,value.index));});
 ipcMain.on('tab-drag-preview',(event,value)=>{
  const id=event.sender.id;let drag=candidates.get(id);
  if(!value||value.phase==='cancel'||value.visible===false&&!value.phase){if(drag&&!drag.joining)dispose(drag);return;}
  if(value.phase==='begin'){
   if(drag)dispose(drag);const source=contextFor(event);if(!value.tab?.path)return;
   const normal=source.window.getNormalBounds(),bounds=source.window.getBounds(),single=source.state.tabs.length===1,b=source.window.isMaximized()||source.window.isFullScreen()?normal:bounds;
   const presentation={left:Math.max(0,Math.min(value.left||0,b.width-128-(value.width||192))),width:Math.max(20,value.width||192)};
   const target=single?source.window:createWindow({tabs:[{...value.tab,playing:false}],active:0,closed:[],history:[]},b,{temporary:true,dragPresentation:presentation}),ctx=windowContexts.get(target.webContents.id);
   if(!single){target.setFocusable(false);target.setSkipTaskbar(true);target.setIgnoreMouseEvents(true);}
   drag={source,sourceId:id,sender:event.sender,window:target,ctx,tab:value.tab,kind:value.kind,point:value,grabX:value.grabX,grabY:value.grabY,outside:!!value.visible,single,visible:single,promoted:false,timer:null,fade:null,target:null};drag.cleanup=()=>dispose(drag);candidates.set(id,drag);if(!single)update(drag);
   if(single){drag.ready=(async()=>{if(source.window.isFullScreen())await setFullscreen(false,source.window);if(source.window.isMaximized())source.window.unmaximize();source.window.setBounds(b);update(drag);})();}
   else{let resolve;const contentReady=new Promise(r=>resolve=r);ctx.resolveDragReady=resolve;drag.ready=Promise.race([ctx.loaded.then(()=>contentReady),new Promise(r=>setTimeout(r,defaults.view.tabDetachLoadTimeoutMs))]).catch(()=>{}).then(()=>{if(candidates.get(id)!==drag)return;update(drag);reveal(drag);});}
   drag.ready.then(()=>{if(candidates.get(id)===drag)drag.timer=setInterval(()=>update(drag),defaults.view.tabDragPreviewIntervalMs);});event.sender.once('destroyed',drag.cleanup);return;
  }
  if(!drag)return;drag.point=value;drag.outside=!!value.visible;update(drag);
  if(!drag.single){if(drag.outside)drag.ready.then(()=>reveal(drag));else{drag.visible=false;drag.window.hide();}}
 });
 ipcMain.handle('move-tab',async(event,{tab,x,y})=>{
  const source=contextFor(event);if(!tab||typeof tab.path!=='string'||!source.state.tabs.some(t=>t.instanceId===tab.instanceId)||!Number.isFinite(x)||!Number.isFinite(y))throw Error('Neveljaven prenos zavihka.');
  const candidate=candidates.get(event.sender.id);if(candidate){candidate.point={x,y};await candidate.ready;update(candidate);}
  let target=candidate?.target||liveWindows().find(c=>{if(c===source)return false;const b=c.window.getBounds();return x>=b.x&&x<b.x+b.width-128&&y>=b.y&&y<b.y+defaults.view.tabAttachHeight;});
  if(!target&&candidate?.single){dispose(candidate);await saveWindows();return {windowId:source.window.id,sameWindow:true};}
  if(!target&&candidate){candidate.promoted=true;target=candidate.ctx;target.temporary=false;target.dragPresentation=null;target.state.tabs=[tab];clearInterval(candidate.timer);clearInterval(candidate.fade);candidate.sender.removeListener('destroyed',candidate.cleanup);candidates.delete(candidate.sourceId);target.window.setOpacity(1);target.window.setIgnoreMouseEvents(false);target.window.setFocusable(true);target.window.setSkipTaskbar(false);target.window.webContents.send('tab-drag-presentation',{commit:tab});}
  else if(!target){const b=source.window.isMaximized()||source.window.isFullScreen()?source.window.getNormalBounds():source.window.getBounds(),work=screen.getDisplayNearestPoint({x:Math.round(x),y:Math.round(y)}).workArea,width=Math.min(b.width,work.width),height=Math.min(b.height,work.height),created=createWindow({tabs:[tab],active:0,closed:[],history:[]},{width,height,x:Math.round(Math.max(work.x,Math.min(work.x+work.width-width,x-width/2))),y:Math.round(Math.max(work.y,Math.min(work.y+work.height-height,y-14)))});target=windowContexts.get(created.webContents.id);await target.loaded;}
  else{const index=candidate?.targetIndex??Math.min(target.state.tabs.length,Math.max(0,Math.floor((x-target.window.getBounds().x)/192)));target.state.tabs.splice(index,0,tab);target.window.webContents.send('receive-tab',{tab,index});if(candidate){candidate.joining=true;clearInterval(candidate.timer);candidate.target=null;if(!candidate.single){const dragged=candidate.window,start=Date.now();clearInterval(candidate.fade);candidate.fade=setInterval(()=>{if(dragged.isDestroyed()){dispose(candidate);return;}const f=(Date.now()-start)/defaults.view.tabAttachFadeMs;dragged.setOpacity(Math.max(0,.25*(1-f)));if(f>=1)dispose(candidate);},16);}else dispose(candidate);}}
  source.state.tabs=source.state.tabs.filter(t=>t.instanceId!==tab.instanceId);await saveWindows();if(process.env.VAP_TEST_MODE!=='1'){target.window.show();target.window.focus();}return {windowId:target.window.id};
 });
 return {getDragWindows:()=>[...candidates.values()].map(d=>d.window)};
};
