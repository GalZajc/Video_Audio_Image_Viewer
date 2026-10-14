'use strict';
const $=id=>document.getElementById(id),C=window.Core;
const video=$('video'),stage=$('stage'),still=$('still'),cropOverlay=$('cropOverlay'),timeline=$('timeline');
const actions={playPause:'Predvajaj / premor',seekBack:'5 sekund nazaj',seekForward:'5 sekund naprej',frameBack:'Prejšnja sličica',frameForward:'Naslednja sličica',slower:'Hitrost −10 odstotnih točk',faster:'Hitrost +10 odstotnih točk',markIn:'I — začetna sličica (vključena)',markOut:'O — končna sličica (vključena)',crop:'Prikaži / skrij okvir za obrez',escape:'Skrij okvir → časovnica → slika → okno',export:'Shrani izrez / eno sličico PNG',open:'Odpri datoteke',newTab:'Odpri v novem zavihku',closeTab:'Zapri zavihek',restoreTab:'Obnovi zaprt zavihek',nextTab:'Naslednji zavihek',previousTab:'Prejšnji zavihek',settings:'Nastavitve',fillWindow:'Skrij / pokaži zavihke v oknu',fullscreen:'Pravi celozaslonski način',volumeUp:'Glasneje',volumeDown:'Tišje',mute:'Zvok / brez zvoka',resetView:'Ponastavi povečavo in premik',clearSelection:'Počisti interval in obrez'};
let config,settings,tabs=[],closed=[],history=[],active=-1,epoch=0,loaded=false,restoring=false;
let drag=null,scrub=null,toastTimer,controlTimer,saveTimer,clickTimer,recording=null,seekTarget=null,stepTarget=null,stepQueue=Promise.resolve(),markQueue=Promise.resolve(),openingQueue=Promise.resolve(),exportBusy=false,lastFrameCallback=0;
let tabDrag=null,suppressTabClick=false,windowFitBusy=false;
const progress=new Map();
const current=()=>tabs[active];
const fresh=()=>({instanceId:crypto.randomUUID(),time:0,frameTime:0,rate:1,volume:1,muted:false,playing:false,in:null,out:null,crop:null,cropSpace:'rotated',cropVisible:false,timelineZoom:false,view:{zoom:1,x:0,y:0},rotation:0,pivot:null,flipX:false,flipY:false,drawings:[],redo:[],drawActive:false,drawingsVisible:true,drawingsSaved:false,mediaFilter:null});
function serial(tab){return {path:tab.meta.path,size:tab.meta.size,mtime:tab.meta.mtime,...tab.state,...(tab.folderStates?{folderStates:[...tab.folderStates]}:{})};}
function persistSoon(immediate=false){clearTimeout(saveTimer);const save=()=>{const stable=tabs.filter(t=>!t.provisional);return window.player.saveSession({tabs:stable.map(serial),active:Math.max(0,stable.indexOf(current())),closed,history}).catch(showError);};if(immediate)return save();saveTimer=setTimeout(save,180);}
function toast(text,ms=1600,kind=''){$('toast').classList.toggle('speedToast',kind==='speed');$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',ms);}
function showError(error){toast(String(error.message||error).replace(/^Error invoking remote method '[^']+': Error: /,''),6000);}
function controls(){document.body.classList.add('controls');document.body.classList.remove('hideCursor');clearTimeout(controlTimer);controlTimer=setTimeout(()=>{if(!drag&&!scrub&&!tabDrag&&!$('settings').open){document.body.classList.remove('controls');if(!video.paused)document.body.classList.add('hideCursor');}},config?.view.controlsHideMs??1800);}
function timeLabel(t,precise=false){if(!Number.isFinite(t))return '0:00';t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t/60)%60,s=Math.floor(t)%60;return (h?`${h}:${String(m).padStart(2,'0')}`:String(m))+':'+String(s).padStart(2,'0')+(precise?'.'+String(Math.floor(t*1000)%1000).padStart(3,'0'):'');}
function renderTabs(){
  // Native pointer capture must stay on the original, connected DOM node while
  // the source switches its content to the next tab during a tear-out.
  if(tabDrag){for(const el of $('tabs').children){el.classList.toggle('active',el._tab===current());el.setAttribute('aria-selected',String(el._tab===current()));}return;}
  $('tabs').replaceChildren();
  tabs.forEach((tab,index)=>{
    const el=document.createElement('div');el._tab=tab;el.className='tab'+(index===active?' active':'');el.role='tab';el.setAttribute('aria-selected',index===active?'true':'false');el.title=tab.meta.path;
    const icon=document.createElement('button');icon.className='mediaIcons';icon.title=tr('Vrste datotek za prehajanje po mapi','File types for folder navigation');for(const kind of tab.state.mediaFilter||[tab.meta.kind]){const img=document.createElement('img');img.src='assets/'+kind+'.svg';img.alt=kind;icon.append(img);}icon.addEventListener('click',event=>{event.stopPropagation();showTypeMenu(tab,icon);});icon.addEventListener('dblclick',event=>event.stopPropagation());const name=document.createElement('span');name.className='name';name.textContent=tab.meta.name;const x=document.createElement('button');x.className='x';x.textContent='×';x.title='Zapri zavihek';x.setAttribute('aria-label','Zapri '+tab.meta.name);
    x.addEventListener('click',event=>{event.stopPropagation();closeTab(tabs.indexOf(tab));});x.addEventListener('dblclick',event=>event.stopPropagation());
    el.append(icon,name,x);el.addEventListener('click',()=>{if(!suppressTabClick)activate(tabs.indexOf(tab));});
    el.addEventListener('auxclick',event=>{if(event.button===1){event.preventDefault();closeTab(tabs.indexOf(tab));}});
    el.addEventListener('mousedown',event=>{if(event.button===1)event.preventDefault();});
    el.addEventListener('dblclick',()=>{if(!suppressTabClick)window.player.reveal(tab.meta.id).catch(showError);});
    el.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('.x,.mediaIcons'))return;
      if(current()!==tab)activate(tabs.indexOf(tab));capture();
      const element=[...$('tabs').children].find(e=>e._tab===tab),bounds=element.getBoundingClientRect();
      tabDrag={tab,element,startX:event.clientX,startY:event.clientY,offset:event.clientX-bounds.left,fraction:(event.clientX-bounds.left)/bounds.width,originalLeft:bounds.left,single:tabs.length===1,moved:false,candidate:true};element.setPointerCapture(event.pointerId);
      window.player.tabDragPreview({phase:'begin',visible:false,single:tabDrag.single,tab:serial(tab),kind:tab.meta.kind,left:bounds.left,width:bounds.width,offset:tabDrag.offset,fraction:tabDrag.fraction,grabX:event.clientX,grabY:event.clientY,x:event.screenX,y:event.screenY});
    });
    $('tabs').append(el);
  });
  applyTabWindowPresentation();applyDockPresentation();
}
function tabSwapIndex(tab,pointerX,fraction){
 const elements=[...$('tabs').children].filter(e=>e._tab),element=elements.find(e=>e._tab===tab),index=tabs.indexOf(tab);
 if(!element||index<0)return index;
 const center=pointerX+(0.5-fraction)*element.offsetWidth,slot=element.offsetLeft+element.offsetWidth/2,ratio=config.view.tabSwapFraction;
 let target=index;
 for(let i=index+1;i<elements.length;i++){const other=elements[i],threshold=slot+(other.offsetLeft+other.offsetWidth/2-slot)*ratio;if(center>threshold)target=i;else break;}
 if(target===index)for(let i=index-1;i>=0;i--){const other=elements[i],threshold=slot+(other.offsetLeft+other.offsetWidth/2-slot)*ratio;if(center<threshold)target=i;else break;}
 return target;
}
function reorderTab(tab,position){
  const positions=new Map([...$('tabs').children].map(el=>[el,el.offsetLeft]));
  const selected=current(),from=tabs.indexOf(tab);if(from<0)return;
  tabs.splice(from,1);tabs.splice(C.clamp(position,0,tabs.length),0,tab);active=tabs.indexOf(selected);
  const element=[...$('tabs').children].find(el=>el._tab===tab),next=tabs[tabs.indexOf(tab)+1];
  const nextElement=[...$('tabs').children].find(el=>el._tab===next);$('tabs').insertBefore(element,nextElement||null);
  for(const el of $('tabs').children){if(el!==tabDrag?.element){const dx=positions.get(el)-el.offsetLeft;if(dx)el.animate([{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:config.view.tabAnimationMs,easing:'ease-out'});}}
  persistSoon();
}
document.addEventListener('pointermove',event=>{
  if(!tabDrag)return;
  if(!tabDrag.moved&&Math.hypot(event.clientX-tabDrag.startX,event.clientY-tabDrag.startY)<config.view.tabDragThreshold)return;
  tabDrag.moved=true;tabDrag.outside=tabDrag.single||Math.abs(event.clientY-tabDrag.startY)>(settings.tabDetachDistance??parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')))||event.clientX< -12||event.clientX>innerWidth+12;tabDrag.element.classList.add('dragging');
  window.player.tabDragPreview({phase:'move',visible:tabDrag.outside,x:event.screenX,y:event.screenY});
  if(tabDrag.single){tabDrag.element.style.transform='';return;}
  if(tabDrag.outside){
    tabDrag.element.classList.add('sourceDragging');
    if(!tabDrag.neighborShown){tabDrag.neighborShown=true;activate(tabs.indexOf(tabDrag.tab)===tabs.length-1?tabs.length-2:tabs.indexOf(tabDrag.tab)+1);}
    return;
  }
  if(tabDrag.neighborShown){tabDrag.neighborShown=false;tabDrag.element.classList.remove('sourceDragging');activate(tabs.indexOf(tabDrag.tab));}
  tabDrag.element.style.transform=`translateX(${event.clientX-tabDrag.offset-tabDrag.element.offsetLeft}px)`;
  const target=tabSwapIndex(tabDrag.tab,event.clientX,tabDrag.fraction);

  if(target!==tabs.indexOf(tabDrag.tab))reorderTab(tabDrag.tab,target);tabDrag.element.style.transform=`translateX(${event.clientX-tabDrag.offset-tabDrag.element.offsetLeft}px)`;
});
async function finishTabDrag(event){
  if(!tabDrag)return;const moved=tabDrag.moved,el=tabDrag.element,detach=!!event&&tabDrag.outside,tab=tabDrag.tab;
  if(event&&el.hasPointerCapture(event.pointerId))el.releasePointerCapture(event.pointerId);
  el.classList.remove('dragging','sourceDragging');el.style.transform='';tabDrag=null;
  if(detach){suppressTabClick=true;try{capture();await persistSoon(true);const result=await window.player.moveTab({tab:serial(tab),x:event.screenX,y:event.screenY});if(!result.sameWindow)removeTransferredTab(tab);}catch(error){showError(error);}finally{window.player.tabDragPreview({phase:'cancel'});suppressTabClick=false;}return;}
  window.player.tabDragPreview({visible:false});if(moved){suppressTabClick=true;setTimeout(()=>{suppressTabClick=false;},0);renderTabs();persistSoon(true);}controls();
}
document.addEventListener('pointerup',finishTabDrag);document.addEventListener('pointercancel',finishTabDrag);window.addEventListener('blur',()=>{if(!tabDrag?.outside)finishTabDrag();});
function capture(){const tab=current();if(!tab)return;if(loaded&&!tab.meta.isImage){tab.state.time=seekTarget??video.currentTime;tab.state.playing=!video.paused;tab.state.rate=video.playbackRate;tab.state.volume=video.volume;tab.state.muted=video.muted;}}
function openFiles(files,saved=null){
  const task=openingQueue.then(async()=>{
    for(let i=0;i<files.length;i++){
      try{
        const meta=await window.player.describe(files[i]);
        const existing=tabs.findIndex(tab=>tab.meta.path.toLowerCase()===meta.path.toLowerCase());
        if(existing>=0&&!restoring){if(!restoring)activate(existing);continue;}
        const previous=saved?.[i];const state=previous&&previous.size===meta.size&&previous.mtime===meta.mtime?{...fresh(),...previous,view:{...fresh().view,...previous.view}}:fresh();
        delete state.path;delete state.size;delete state.mtime;delete state.folderStates;if(previous?.crop&&!previous.cropSpace)state.cropSpace='source';
        if(restoring||meta.isImage)state.playing=false;else if(!previous)state.playing=true;
        const tab={meta,state,proxyUrl:null,preparing:false,...(previous?.folderStates?{folderStates:new Map(previous.folderStates)}:{})};tabs.push(tab);
        if(!restoring){history.push({path:meta.path,opened:new Date().toISOString()});history=history.slice(-config.storage.historyEntries);activate(tabs.length-1);}
      }catch(error){showError(error);}
    }
    renderTabs();persistSoon();
  });openingQueue=task.catch(showError);return task;
}
async function pick(){const files=await window.player.pickFiles();if(files.length)await openFiles(files);}
function activate(index){
  if(index<0||index>=tabs.length||index===active&&loaded)return;cancelStroke();
  capture();const outgoing=current(),outgoingPlaying=outgoing?.state.playing;video.pause();if(outgoing)outgoing.state.playing=outgoingPlaying;video.removeAttribute('src');video.load();epoch++;active=index;loaded=false;seekTarget=null;stepTarget=null;drag=null;scrub=null;still.width=still.height=1;still.style.display='none';
  const tab=current();renderTabs();$('empty').style.display='none';$('audioLabel').style.display=tab.meta.isAudio?'flex':'none';$('audioLabel').querySelector('p').textContent=tab.meta.name;
  $('image').style.display='none';$('drawingLayer').style.display=tab.meta.isAudio?'none':'block';video.style.display=tab.meta.isAudio||tab.meta.isImage?'none':'block';video.playbackRate=tab.state.rate;video.volume=tab.state.volume;video.muted=tab.state.muted;
  if(tab.meta.isImage){loadImage(tab);layout();updateTimeline();renderProgress();controls();persistSoon();syncPanels();return;}
  if(!tab.proxyUrl&&(tab.meta.videoCodec==='gif'||tab.meta.audioCodec&&!config.playback.nativeAudioCodecs.includes(tab.meta.audioCodec)))prepareProxy(tab);else video.src=tab.proxyUrl||tab.meta.url;
  layout();updateTimeline();renderProgress();controls();persistSoon();syncPanels();
}
function closeTab(index=active){
  if(index<0||!tabs[index])return;
  cancelStroke();capture();const closing=tabs[index],wasActive=index===active;
  closed.push({...serial(closing),closed:new Date().toISOString()});closed=closed.slice(-config.storage.closedTabs);
  tabs.splice(index,1);
  if(!tabs.some(t=>t.meta.id===closing.meta.id))window.player.release(closing.meta.id).catch(()=>{});
  if(wasActive){video.pause();epoch++;loaded=false;active=-1;if(tabs.length)activate(Math.min(index,tabs.length-1));else{video.removeAttribute('src');video.load();still.width=still.height=1;still.style.display='none';cropOverlay.style.display='none';video.style.display='none';$('empty').style.display='flex';$('audioLabel').style.display='none';$('image').style.display='none';$('drawingLayer').style.display='none';syncPanels();document.body.classList.remove('fill');updateTimeline();renderProgress();}}
  else if(index<active)active--;
  if(!tabs.length)$('raster').style.display='none';
  renderTabs();persistSoon(true);
}
async function restore(){if(!closed.length)return toast('Ni zaprtih zavihkov.');const item=closed.pop();await openFiles([item.path],[item]);persistSoon(true);}
function rect(){const tab=current();return tab&&!tab.meta.isAudio?Visual.geometry(stage.clientWidth,stage.clientHeight,tab.meta.width,tab.meta.height,tab.state):null;}
function layout(){
  const tab=current(),r=rect();if(!r){cropOverlay.style.display='none';$('raster').style.display='none';if($('zoomReadout'))$('zoomReadout').hidden=true;return;}if($('zoomReadout'))$('zoomReadout').hidden=false;
  const raster=$('raster');raster.style.display='block';raster.style.left=(r.cx-r.bw*r.scale/2)+'px';raster.style.top=(r.cy-r.bh*r.scale/2)+'px';raster.style.width=r.bw*r.scale+'px';raster.style.height=r.bh*r.scale+'px';
  if(tab.state.crop&&tab.state.cropSpace==='source'){const old=tab.state.crop,points=[[old.xmin,old.ymin],[old.xmin,old.ymax],[old.xmax,old.ymin],[old.xmax,old.ymax]].map(([x,y])=>{const p=Visual.toScreen({...r,scale:1,cx:r.bw/2,cy:r.bh/2},{x,y});return p;});tab.state.crop=C.clampCrop({xmin:Math.min(...points.map(p=>p.x)),ymin:Math.min(...points.map(p=>p.y)),xmax:Math.max(...points.map(p=>p.x)),ymax:Math.max(...points.map(p=>p.y))},r.bw,r.bh);tab.state.cropSpace='rotated';}
  const crop=tab.state.crop;
  if(crop&&tab.state.cropVisible){cropOverlay.style.display='block';cropOverlay.style.left=(r.cx-r.bw*r.scale/2+crop.xmin*r.scale)+'px';cropOverlay.style.top=(r.cy-r.bh*r.scale/2+crop.ymin*r.scale)+'px';cropOverlay.style.width=(crop.xmax-crop.xmin)*r.scale+'px';cropOverlay.style.height=(crop.ymax-crop.ymin)*r.scale+'px';cropOverlay.style.transform='none';}
  else cropOverlay.style.display='none';
  redrawDrawings();syncPivot();layoutInlineText();if($('zoomReadout'))$('zoomReadout').textContent=tr('Povečava ','Zoom ')+Math.round(tab.state.view.zoom*100)+' %';
}
function drawStill(){
  const tab=current();if(!tab||tab.meta.isAudio||tab.meta.isImage||!video.paused||video.readyState<2||!video.videoWidth)return;
  if(still.width!==video.videoWidth||still.height!==video.videoHeight){still.width=video.videoWidth;still.height=video.videoHeight;}
  const ctx=still.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;ctx.drawImage(video,0,0);still.style.display='block';layout();
}
function frameCallback(_now,metadata){
  const tab=current();if(tab&&loaded){if(!video.paused&&!video.seeking){tab.state.frameTime=metadata.mediaTime;lastFrameCallback=performance.now();}if(video.paused)drawStill();else renderRaster();checkIntervalEnd(metadata.mediaTime);}
  video.requestVideoFrameCallback(frameCallback);
}
if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(frameCallback);
video.addEventListener('loadedmetadata',()=>{
  const tab=current();if(!tab)return;loaded=true;
  if(tab.state.time>0)video.currentTime=C.clamp(tab.state.time,0,Math.max(0,video.duration-.00001));
  tab.state.time=Math.min(tab.state.time,video.duration);video.playbackRate=tab.state.rate;layout();updateTimeline();
  if(tab.state.playing)video.play().catch(showError);else drawStill();
});
video.addEventListener('loadeddata',()=>{drawStill();window.player.dragContentReady();});
video.addEventListener('seeked',()=>{
  const tab=current();if(!tab||!loaded||tab.meta.isImage)return;seekTarget=null;tab.state.time=video.currentTime;
  if(video.paused&&!tab.meta.isAudio){const stamp=epoch,target=video.currentTime;window.player.frame({id:tab.meta.id,time:target}).then(frame=>{if(stamp===epoch&&video.paused&&!video.seeking&&Math.abs(video.currentTime-target)<.00001){tab.state.frameTime=frame.time;drawStill();updateTimeline();}}).catch(showError);}
  drawStill();updateTimeline();persistSoon();
});
video.addEventListener('play',()=>{if(current())current().state.playing=true;still.style.display='none';controls();persistSoon();});
video.addEventListener('pause',()=>{if(current())current().state.playing=false;drawStill();controls();updateTimeline();persistSoon();});
video.addEventListener('ended',()=>{if(current())current().state.playing=false;drawStill();controls();persistSoon();});
async function prepareProxy(tab){
  if(!tab||tab.preparing)return;if(tab.proxyUrl)return showError('Posnetka ni mogoče predvajati niti po pretvorbi.');
  const stamp=epoch;tab.preparing=true;
  try{tab.proxyUrl=await window.player.prepare(tab.meta.id);if(stamp===epoch){video.src=tab.proxyUrl;video.load();}}
  catch(error){showError(error);}finally{tab.preparing=false;}
}
video.addEventListener('error',()=>{if(video.getAttribute('src')&&current()&&!current().meta.isImage)prepareProxy(current());});
function seekTo(time){const tab=current();if(!tab||!loaded||tab.meta.isImage)return;seekTarget=C.clamp(time,0,Math.max(0,tab.meta.duration-.000001));video.currentTime=seekTarget;tab.state.time=seekTarget;updateTimeline();controls();}
function seek(delta){stepTarget=null;seekTo((seekTarget??video.currentTime)+delta);}
function step(direction){
  const tab=current();if(!tab||!loaded||tab.meta.isAudio||tab.meta.isImage)return;video.pause();const stamp=epoch;
  stepQueue=stepQueue.catch(()=>{}).then(async()=>{if(stamp!==epoch)return;const frame=await window.player.frame({id:tab.meta.id,time:stepTarget??(seekTarget??video.currentTime),direction});if(stamp!==epoch)return;stepTarget=frame.time;tab.state.frameTime=frame.time;seekTo(frame.time+Math.min(.0001,(frame.end-frame.time)/4));});stepQueue.catch(showError);
}
function mark(which){
  const tab=current();if(!tab||!loaded||tab.meta.isImage)return;const stamp=epoch;
  // Capture the timestamp at the keystroke, before the asynchronous lookup.
  const time=tab.meta.isAudio||video.paused?(seekTarget??video.currentTime):(seekTarget??tab.state.frameTime);
  markQueue=markQueue.catch(()=>{}).then(async()=>{
    const frame=tab.meta.isAudio?{time,end:time}:await window.player.frame({id:tab.meta.id,time});if(stamp!==epoch)return;
    if(frame.duration)tab.meta.duration=frame.duration;tab.state[which]=frame;
    if(tab.state.in&&tab.state.out&&tab.state.in.time>tab.state.out.time){tab.state[which==='in'?'out':'in']=null;tab.state.timelineZoom=false;}
    updateTimeline();persistSoon();controls();toast(`${which==='in'?'I':'O'} · ${timeLabel(frame.time,true)}`,1100);
  });markQueue.catch(showError);
}
function range(){const tab=current();if(!tab)return [0,1];const s=tab.state;if(s.timelineZoom&&s.in&&s.out&&s.out.end>s.in.time)return [s.in.time,s.out.end];return [0,tab.meta.duration];}
function updateTimeline(){
  const tab=current();$('transport').style.display=tab&&!tab.meta.isImage?'block':'none';if(!tab||tab.meta.isImage)return;
  const s=tab.state,[start,end]=range(),span=end-start,position=seekTarget??(video.paused?s.frameTime||video.currentTime:video.currentTime),ratio=C.clamp((position-start)/span,0,1);
  $('time').textContent=timeLabel(position)+' / '+timeLabel(tab.meta.duration);$('rate').textContent=tr('Hitrost ','Speed ')+`${Math.round(s.rate*100)} %${s.muted?' · 🔇':''}`;
  $('elapsed').style.width=(ratio*100)+'%';$('playhead').style.left=(ratio*100)+'%';timeline.setAttribute('aria-valuemin',start);timeline.setAttribute('aria-valuemax',end);timeline.setAttribute('aria-valuenow',position);
  const lo=s.in?.time??0,hi=s.out?.end??tab.meta.duration;
  $('playhead').style.background=(s.in||s.out)&&position>=lo&&position<hi?'var(--blue)':'var(--red)';
  $('interval').style.display=s.in||s.out?'block':'none';$('interval').style.left=(C.clamp((lo-start)/span,0,1)*100)+'%';$('interval').style.width=(C.clamp((hi-start)/span,0,1)-C.clamp((lo-start)/span,0,1))*100+'%';
  for(const [id,value] of [['inMarker',s.in?.time],['outMarker',s.out?.end]]){$(id).style.display=value===undefined||value<start||value>end?'none':'block';$(id).style.left=(C.clamp((value-start)/span,0,1)*100)+'%';}
  $('selection').textContent=(s.in||s.out?`I ${timeLabel(lo,true)} — O ${timeLabel(s.out?.time??hi,true)}`:'')+(s.crop?`  ·  ${s.crop.xmax-s.crop.xmin} × ${s.crop.ymax-s.crop.ymin} px [${s.crop.xmin}, ${s.crop.ymin}]`:'')+(s.timelineZoom?'  ·  povečana časovnica':'');
}
function checkIntervalEnd(time=video.currentTime){const tab=current(),s=tab?.state;if(s?.timelineZoom&&s.in&&s.out&&!video.paused&&time>=s.out.end-.00001){video.pause();seekTo(s.out.time+.00001);}}
function tick(){if(current()&&!video.paused){checkIntervalEnd();updateTimeline();if(!video.requestVideoFrameCallback)renderRaster();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
function timelineTime(event){const r=timeline.getBoundingClientRect(),[start,end]=range();return start+C.clamp((event.clientX-r.left)/r.width,0,1)*(end-start);}
timeline.addEventListener('pointerdown',event=>{if(event.button!==0||!loaded)return;event.stopPropagation();stepTarget=null;scrub={playing:!video.paused};timeline.setPointerCapture(event.pointerId);seekTo(timelineTime(event));});
timeline.addEventListener('pointermove',event=>{const r=timeline.getBoundingClientRect();$('timelineTip').style.display='block';$('timelineTip').style.left=C.clamp(event.clientX-r.left,0,r.width-65)+'px';$('timelineTip').textContent=timeLabel(timelineTime(event));if(scrub)seekTo(timelineTime(event));controls();});
timeline.addEventListener('pointerup',event=>{if(scrub){scrub=null;if(timeline.hasPointerCapture(event.pointerId))timeline.releasePointerCapture(event.pointerId);persistSoon();}});
timeline.addEventListener('pointercancel',()=>{scrub=null;});
timeline.addEventListener('pointerleave',()=>{$('timelineTip').style.display='none';});
timeline.addEventListener('dblclick',event=>{event.stopPropagation();const tab=current();if(!tab)return;const s=tab.state,time=timelineTime(event);if(s.timelineZoom)s.timelineZoom=false;else if(s.in&&s.out&&time>=s.in.time&&time<=s.out.end&&s.out.end>s.in.time)s.timelineZoom=true;updateTimeline();persistSoon();controls();});
function point(event,r=rect()){const b=stage.getBoundingClientRect();return Visual.toSource(r,{x:event.clientX-b.left,y:event.clientY-b.top});}
function cropPoint(event,r=rect()){const b=stage.getBoundingClientRect();return {x:(event.clientX-b.left-r.cx)/r.scale+r.bw/2,y:(event.clientY-b.top-r.cy)/r.scale+r.bh/2};}
function cropHit(event){
  const tab=current(),r=rect(),c=tab?.state.crop;if(!c||!tab.state.cropVisible||!r)return null;
  const p=cropPoint(event,r),near=config.view.cropHitPixels/r.scale;
  if(p.x<c.xmin-near||p.x>c.xmax+near||p.y<c.ymin-near||p.y>c.ymax+near)return null;
  const left=Math.abs(p.x-c.xmin)<=near,right=Math.abs(p.x-c.xmax)<=near,top=Math.abs(p.y-c.ymin)<=near,bottom=Math.abs(p.y-c.ymax)<=near;
  // The picture remains draggable inside the rectangle; its border resizes the crop.
  if(!left&&!right&&!top&&!bottom)return null;
  return {left,right,top,bottom};
}
function cursor(mode){if(!mode)return video.paused&&current()?'grab':'default';if(mode.left&&mode.top||mode.right&&mode.bottom)return 'nwse-resize';if(mode.right&&mode.top||mode.left&&mode.bottom)return 'nesw-resize';return mode.left||mode.right?'ew-resize':'ns-resize';}
stage.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('#transport,#rotationPanel,#drawPanel')||!current()||!loaded)return;
  if(document.activeElement?.matches('input,select,textarea'))document.activeElement.blur();
  if(event.target.closest('#rotationPivot,#inlineText'))return;
  const mode=cropHit(event),pan=event.ctrlKey&&!event.shiftKey;
  if(current().state.drawActive&&!mode&&!pan){drawingDown(event);return;}if(!video.paused&&!mode)return;if(!mode&&!pan)return;
  drag={type:mode?'crop':'pan',mode,start:mode?cropPoint(event):{x:event.clientX,y:event.clientY},crop:current().state.crop?{...current().state.crop}:null,view:{...current().state.view},moved:false};
  stage.setPointerCapture(event.pointerId);event.preventDefault();
});
stage.addEventListener('pointermove',event=>{
  controls();lastPointer={x:event.clientX-stage.getBoundingClientRect().left,y:event.clientY-stage.getBoundingClientRect().top};if(!current())return;if(drawingMove(event))return;
  if(!drag){stage.style.cursor=cursor(cropHit(event));return;}
  const tab=current(),s=tab.state;
  if(drag.type==='pan'){const dx=event.clientX-drag.start.x,dy=event.clientY-drag.start.y;if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;s.view.x=drag.view.x+dx;s.view.y=drag.view.y+dy;stage.style.cursor='grabbing';}
  else{drag.moved=true;const p=cropPoint(event),next={...drag.crop},r=rect();if(drag.mode.left)next.xmin=Math.min(p.x,next.xmax-1);if(drag.mode.right)next.xmax=Math.max(p.x,next.xmin+1);if(drag.mode.top)next.ymin=Math.min(p.y,next.ymax-1);if(drag.mode.bottom)next.ymax=Math.max(p.y,next.ymin+1);s.crop=C.clampCrop(next,r.bw,r.bh);updateTimeline();}
  layout();
});
let skipClick=false;
stage.addEventListener('pointerup',event=>{if(!drag&&drawingUp(event))return;if(drag){skipClick=drag.moved;drag=null;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);persistSoon();}});
stage.addEventListener('pointercancel',()=>{cancelStroke();drag=null;skipClick=true;});
stage.addEventListener('click',event=>{if(event.target.closest('#transport,#rotationPanel,#drawPanel')||event.target.closest('#job')||!current())return;if(event.ctrlKey||event.target.closest('#rotationPivot,#inlineText')||current().state.drawActive)return;if(skipClick){skipClick=false;return;}if(event.detail===1&&!current().state.cropVisible){clearTimeout(clickTimer);clickTimer=setTimeout(togglePlay,250);}});
stage.addEventListener('dblclick',event=>{if(event.target.closest('#transport,#rotationPanel,#drawPanel')||event.target.closest('#job')||!current())return;if(event.target.closest('#rotationPivot,#inlineText')||current().state.drawActive)return;clearTimeout(clickTimer);toggleFullscreen();});
stage.addEventListener('wheel',event=>{
  if(!event.ctrlKey)return;event.preventDefault();if(!current()||!loaded||!video.paused||current().meta.isAudio)return;
  const tab=current(),r=rect(),b=stage.getBoundingClientRect(),factor=Math.pow(config.view.zoomFactor,-event.deltaY/100);
  tab.state.view=Visual.zoom(r,tab.state.view,{x:event.clientX-b.left,y:event.clientY-b.top},factor,config.view.minZoom,config.view.maxZoom);
  layout();persistSoon();controls();
},{passive:false});
new ResizeObserver(layout).observe(stage);
async function togglePlay(){if(!current()||!loaded||current().meta.isImage)return;stepTarget=null;if(video.paused){const s=current().state;if(s.timelineZoom&&s.in&&s.out&&(video.currentTime<s.in.time||video.currentTime>=s.out.time))seekTo(s.in.time);await video.play().catch(showError);}else video.pause();}
function toggleCrop(){
  const tab=current();if(!tab||tab.meta.isAudio||!loaded)return;const s=tab.state;
  if(!s.crop){const f=config.view.cropInitialFraction;
    s.crop=Visual.visibleCrop(rect(),stage.clientWidth,stage.clientHeight,f);
    if(!s.crop){s.view={zoom:1,x:0,y:0};s.crop=Visual.visibleCrop(rect(),stage.clientWidth,stage.clientHeight,f);}
  }
  s.cropVisible=!s.cropVisible;layout();updateTimeline();persistSoon();controls();
}
async function exportClip(){
  const tab=current();if(!tab||!loaded||exportBusy)return;await markQueue;showExportMenu(tab);
}
async function exportToFolder(tab,folder){
  if(exportBusy)return;exportBusy=true;
  try{if(stroke)commitStroke();const s=tab.state,selection={in:s.in,out:s.out,crop:s.crop,cropSpace:s.cropSpace,rotation:s.rotation,flipX:s.flipX,flipY:s.flipY};
    if(s.drawings.length){selection.annotationRaster=drawingRaster(tab);const b=annotationBounds(tab);selection.annotationOffset={x:b.x,y:b.y};}
    if(tab.meta.isImage)selection.sourceRaster=imageRaster();
    const options=readExportOptions(),result=await window.player.export({id:tab.meta.id,selection,folder,options});if(result){s.drawingsSaved=true;persistSoon();toast(tr('Shranjeno: ','Saved: ')+result.destination,6500);if(options.openAfterExport)await openFiles([result.destination]);}
  }catch(error){showError(error);}finally{exportBusy=false;}
}
function setSpeed(delta){const tab=current();if(!tab||!loaded||tab.meta.isImage)return;tab.state.rate=C.clamp(Math.round((video.playbackRate+delta)*100)/100,config.playback.minSpeed,config.playback.maxSpeed);video.playbackRate=tab.state.rate;toast(`${Math.round(tab.state.rate*100)} %`,1600,'speed');updateTimeline();persistSoon();controls();}
function volume(delta){const tab=current();if(!tab)return;video.volume=C.clamp(video.volume+delta,0,1);video.muted=false;tab.state.volume=video.volume;tab.state.muted=false;toast(`Zvok ${Math.round(video.volume*100)} %`);persistSoon();controls();}
async function toggleFullscreen(){try{const value=await window.player.fullscreen();document.body.classList.toggle('systemFullscreen',value);layout();controls();}catch(error){showError(error);}}
async function escape(expand=false){
  if(closeTopPanel())return;const tab=current();if(!tab)return;const s=tab.state;
  if(s.cropVisible){s.cropVisible=false;layout();persistSoon();}
  else if(s.timelineZoom){s.timelineZoom=false;updateTimeline();persistSoon();}
  else if(Math.abs(s.view.zoom-1)>.000001||Math.abs(s.view.x)>.001||Math.abs(s.view.y)>.001){s.view={zoom:1,x:0,y:0};layout();persistSoon();}
  else if(Math.abs(s.rotation%360)>.000001){setRotation(0);}
  else if(!tab.meta.isAudio&&!windowFitBusy){
    windowFitBusy=true;
    try{const headerHeight=document.body.classList.contains('fill')?0:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar'));
      await window.player.fitWindow({ratio:rect().bw/rect().bh,headerHeight,expand});s.view={zoom:1,x:0,y:0,fitRotation:s.rotation};layout();
    }catch(error){showError(error);}finally{windowFitBusy=false;}
  }
  controls();
}
function runAction(action){
  if(runEscapeAction(action))return;
  if(runViewerAction(action))return;const s=current()?.state;
  switch(action){
    case 'playPause':return togglePlay();case 'seekBack':return seek(-config.playback.seekSeconds);case 'seekForward':return seek(config.playback.seekSeconds);
    case 'frameBack':return step(-1);case 'frameForward':return step(1);case 'slower':return setSpeed(-config.playback.speedStep);case 'faster':return setSpeed(config.playback.speedStep);
    case 'markIn':return mark('in');case 'markOut':return mark('out');case 'crop':return toggleCrop();case 'escape':return escape();case 'escapeExpand':return escape(true);case 'export':return exportClip();
    case 'open':case 'newTab':return pick().catch(showError);case 'closeTab':return closeTab();case 'restoreTab':return restore().catch(showError);
    case 'nextTab':if(tabs.length)activate((active+1)%tabs.length);return;case 'previousTab':if(tabs.length)activate((active+tabs.length-1)%tabs.length);return;
    case 'settings':return openSettings();case 'fillWindow':if(current()){document.body.classList.toggle('fill');layout();controls();}return;
    case 'fullscreen':return toggleFullscreen();
    case 'volumeUp':return volume(config.playback.volumeStep);case 'volumeDown':return volume(-config.playback.volumeStep);case 'mute':video.muted=!video.muted;if(s)s.muted=video.muted;updateTimeline();persistSoon();return;
    case 'resetView':if(s){s.view={zoom:1,x:0,y:0};layout();persistSoon();}return;
    case 'clearSelection':if(s){s.in=s.out=s.crop=null;s.cropVisible=s.timelineZoom=false;layout();updateTimeline();persistSoon();}return;
  }
}
function openSettings(){closePopups();renderSettings();$('settings').showModal();video.pause();controls();}
function renderSettings(){
  localize();$('videoFormat').value=settings.videoFormat;$('audioFormat').value=settings.audioFormat;$('imageFormat').value=settings.imageFormat;$('matchSource').checked=settings.matchSource;$('folderSort').value=settings.folderSort;$('folderDescending').checked=settings.folderDescending;$('shortcutRows').replaceChildren();
  for(const [action,title] of Object.entries(actions)){const row=document.createElement('tr'),label=document.createElement('td'),cell=document.createElement('td'),button=document.createElement('button');label.textContent=settings.language==='en'?(englishActions[action]||title):title;button.textContent=C.label(settings.shortcuts[action]);button.className='binding';button.addEventListener('click',()=>{if(recording)renderSettings();recording={action,button};button.textContent=tr('Pritisni kombinacijo …','Press a shortcut …');button.classList.add('recording');});cell.append(button);row.append(label,cell);$('shortcutRows').append(row);}
}
async function saveSettings(next){try{settings=await window.player.settings(next);recording=null;renderSettings();}catch(error){recording=null;renderSettings();showError(error);}}
document.addEventListener('keydown',event=>{
  if(!config||event.isComposing)return;
  if(recording){event.preventDefault();event.stopPropagation();if(event.code==='Escape'){recording=null;renderSettings();return;}if(['ControlLeft','ControlRight','ShiftLeft','ShiftRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(event.code))return;
    const binding=C.shortcut(event),other=Object.entries(settings.shortcuts).find(([key,value])=>key!==recording.action&&value===binding);if(other){toast('To bližnjico že uporablja: '+actions[other[0]],3500);return;}
    saveSettings({...settings,shortcuts:{...settings.shortcuts,[recording.action]:binding}});return;
  }
  if(handlePanelKey(event))return;
  const earlyAction=Object.keys(settings.shortcuts).find(key=>settings.shortcuts[key]===C.shortcut(event));
  if(['undo','redo'].includes(earlyAction)&&!$('settings').open&&!event.target.closest?.('#inlineText')){event.preventDefault();runAction(earlyAction);return;}
  if(document.activeElement?.matches('input,select,textarea')&&event.code!=='Escape'&&event.code!=='F11'&&!(event.ctrlKey&&['KeyS','KeyO','KeyW','KeyT','Comma','ArrowLeft','ArrowRight'].includes(event.code)))return;
  if($('settings').open){if(event.code==='Escape'){event.preventDefault();$('settings').close();}return;}
  const binding=C.shortcut(event),action=Object.keys(settings.shortcuts).find(key=>settings.shortcuts[key]===binding);
  if(!action)return;event.preventDefault();if(event.repeat&&['crop','settings','export','open','newTab','restoreTab','closeTab','fillWindow','fullscreen','escape','mute','clearSelection'].includes(action))return;runAction(action);
});
$('settingsButton').addEventListener('click',openSettings);$('closeSettings').addEventListener('click',()=>$('settings').close());$('settings').addEventListener('close',()=>{recording=null;controls();});
for(const id of ['videoFormat','audioFormat','imageFormat','folderSort','matchSource','folderDescending'])$(id).addEventListener('change',()=>saveSettings({...settings,[id]:$(id).type==='checkbox'?$(id).checked:$(id).value}));
for(const [id,action] of [['minimize','minimize'],['maximize','maximize'],['closeWindow','close']])$(id).addEventListener('click',()=>{capture();persistSoon(true);window.player.window(action);});
window.player.onMaximized(maximized=>{$('maximize').querySelector('path').setAttribute('d',maximized?'M4 2h6v6M2 4h6v6H2Z':'M2 2h8v8H2Z');});
window.player.onFullscreen(value=>{document.body.classList.toggle('systemFullscreen',value);layout();controls();});
window.player.onFiles(files=>openFiles(files));
window.player.onProgress(event=>{if(event.label)progress.set(event.id,event);else progress.delete(event.id);renderProgress();});
function renderProgress(){const event=progress.get(current()?.meta.id)||[...progress.values()].find(p=>p.label==='Shranjevanje izreza');$('job').style.display=event?'block':'none';if(event){$('job').querySelector('span').textContent=event.label+' · '+Math.round(event.fraction*100)+' %';$('job').querySelector('progress').value=event.fraction;}}
document.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';});
document.addEventListener('drop',event=>{event.preventDefault();const files=[...event.dataTransfer.files].map(file=>window.player.filePath(file)).filter(Boolean);if(files.length)openFiles(files);});
window.addEventListener('beforeunload',()=>{capture();persistSoon(true);});
setInterval(()=>{capture();persistSoon();},5000);
window.addEventListener('DOMContentLoaded',()=>{(async()=>{const initial=await window.player.init();config=initial.config;settings=initial.settings;tabWindowPresentation=initial.dragPresentation;initViewer();closed=initial.state.closed||[];history=initial.state.history||[];
  restoring=true;await openFiles((initial.state.tabs||[]).map(t=>t.path),initial.state.tabs||[]);restoring=false;
  if(tabs.length)activate(C.clamp(initial.state.active||0,0,tabs.length-1));else renderTabs();
  if(initial.files.length)await openFiles(initial.files);controls();
})().catch(showError);});
