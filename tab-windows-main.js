'use strict';
// Detached tabs are real, full-size viewer windows from the beginning of a drag.
module.exports=function({ipcMain,screen,defaults,contextFor,liveWindows,windowContexts,createWindow,saveWindows}){
 const candidates=new Map();
 function position(drag){if(drag.window.isDestroyed())return;const p=process.env.VAP_TEST_MODE==='1'?drag.point:screen.getCursorScreenPoint();drag.window.setPosition(Math.round(p.x-drag.grabX),Math.round(p.y-drag.grabY));}
 function dispose(drag){clearInterval(drag.timer);clearInterval(drag.fade);drag.sender.removeListener('destroyed',drag.cleanup);if(candidates.get(drag.sourceId)===drag)candidates.delete(drag.sourceId);if(!drag.promoted&&!drag.window.isDestroyed())drag.window.destroy();}
 function reveal(drag){if(!drag.outside||drag.visible||drag.window.isDestroyed())return;drag.visible=true;drag.window.showInactive();const start=Date.now();drag.window.setOpacity(.15);clearInterval(drag.fade);drag.fade=setInterval(()=>{if(drag.window.isDestroyed()){clearInterval(drag.fade);return;}const fraction=Math.min(1,(Date.now()-start)/defaults.view.tabDetachFadeMs);drag.window.setOpacity(.15+.85*fraction);if(fraction===1)clearInterval(drag.fade);},16);}
 ipcMain.on('drag-content-ready',event=>{const ctx=windowContexts.get(event.sender.id);ctx?.resolveDragReady?.();});
 ipcMain.on('tab-drag-preview',(event,value)=>{
  const id=event.sender.id;let drag=candidates.get(id);
  if(!value||value.phase==='cancel'||value.visible===false&&!value.phase){if(drag)dispose(drag);return;}
  if(value.phase==='begin'){
   if(drag)dispose(drag);const source=contextFor(event),b=source.window.getBounds();if(!value.tab?.path)return;
   const presentation={left:Math.max(0,value.left||0),width:Math.max(20,value.width||192)};
   const target=createWindow({tabs:[{...value.tab,playing:false}],active:0,closed:[],history:[]},b,{temporary:true,dragPresentation:presentation});
   target.setFocusable(false);target.setSkipTaskbar(true);target.setIgnoreMouseEvents(true);const ctx=windowContexts.get(target.webContents.id);
   let resolve;const contentReady=new Promise(r=>resolve=r);ctx.resolveDragReady=resolve;
   drag={sourceId:id,sender:event.sender,window:target,ctx,tab:value.tab,point:value,grabX:value.grabX,grabY:value.grabY,outside:!!value.visible,visible:false,promoted:false,timer:null,fade:null};drag.cleanup=()=>dispose(drag);candidates.set(id,drag);position(drag);
   drag.ready=Promise.race([ctx.loaded.then(()=>contentReady),new Promise(r=>setTimeout(r,defaults.view.tabDetachLoadTimeoutMs))]).catch(()=>{}).then(()=>{position(drag);reveal(drag);});
   drag.timer=setInterval(()=>position(drag),defaults.view.tabDragPreviewIntervalMs);event.sender.once('destroyed',drag.cleanup);return;
  }
  if(!drag)return;drag.point=value;drag.outside=!!value.visible;position(drag);if(drag.outside)drag.ready.then(()=>reveal(drag));else{drag.visible=false;drag.window.hide();}
 });
 ipcMain.handle('move-tab',async(event,{tab,x,y})=>{
  const source=contextFor(event);if(!tab||typeof tab.path!=='string'||!source.state.tabs.some(t=>t.path===tab.path)||!Number.isFinite(x)||!Number.isFinite(y))throw Error('Neveljaven prenos zavihka.');
  const candidate=candidates.get(event.sender.id);let target=liveWindows().find(c=>{if(c===source)return false;const b=c.window.getBounds();return x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height;});
  if(!target&&candidate&&candidate.tab.instanceId===tab.instanceId){await candidate.ready;candidate.promoted=true;target=candidate.ctx;target.temporary=false;target.dragPresentation=null;target.state.tabs=[tab];clearInterval(candidate.timer);clearInterval(candidate.fade);candidate.sender.removeListener('destroyed',candidate.cleanup);candidates.delete(candidate.sourceId);target.window.setOpacity(1);target.window.setIgnoreMouseEvents(false);target.window.setFocusable(true);target.window.setSkipTaskbar(false);target.window.webContents.send('tab-drag-presentation',{commit:tab});}
  else if(!target){const b=source.window.getBounds(),work=screen.getDisplayNearestPoint({x:Math.round(x),y:Math.round(y)}).workArea,width=Math.min(b.width,work.width),height=Math.min(b.height,work.height),created=createWindow({tabs:[tab],active:0,closed:[],history:[]},{width,height,x:Math.round(Math.max(work.x,Math.min(work.x+work.width-width,x-width/2))),y:Math.round(Math.max(work.y,Math.min(work.y+work.height-height,y-14)))});target=windowContexts.get(created.webContents.id);await target.loaded;if(candidate)dispose(candidate);}
  else{target.state.tabs.push(tab);target.window.webContents.send('receive-tab',{tab,index:Math.min(target.state.tabs.length-1,Math.max(0,Math.floor((x-target.window.getBounds().x)/192)))});if(candidate)dispose(candidate);}
  source.state.tabs=source.state.tabs.filter(t=>tab.instanceId?t.instanceId!==tab.instanceId:t.path!==tab.path);await saveWindows();if(process.env.VAP_TEST_MODE!=='1'){target.window.show();target.window.focus();}return {windowId:target.window.id};
 });
 return {getDragWindows:()=>[...candidates.values()].map(d=>d.window)};
};
