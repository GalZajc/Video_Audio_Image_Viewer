'use strict';
let stroke=null,strokeHover=null,drawingOptions=null,navigating=false,typeTab=null,exportTab=null;
const englishActions={playPause:'Play / pause',seekBack:'Back 5 seconds',seekForward:'Forward 5 seconds',frameBack:'Previous frame',frameForward:'Next frame',slower:'Speed −10 percentage points',faster:'Speed +10 percentage points',markIn:'I — first frame (inclusive)',markOut:'O — last frame (inclusive)',crop:'Show / hide crop rectangle',escape:'Close overlay → timeline → view → fit window',export:'Export selection / image',open:'Open files',newTab:'Open in a new tab',closeTab:'Close tab',restoreTab:'Restore closed tab',nextTab:'Next tab',previousTab:'Previous tab',settings:'Settings',fillWindow:'Show / hide tab strip',fullscreen:'Fullscreen',volumeUp:'Volume up',volumeDown:'Volume down',mute:'Mute / unmute',resetView:'Reset zoom and pan',clearSelection:'Clear interval and crop',rotate:'Rotation slider',flipHorizontal:'Mirror across original Y axis',flipVertical:'Mirror across original X axis',draw:'Pencil / arrows',undo:'Undo drawing',redo:'Redo drawing',folderPrevious:'Previous file in folder',folderNext:'Next file in folder',deleteFile:'Move file to Recycle Bin'};
Object.assign(actions,{rotate:'Rotacija',flipHorizontal:'Zrcali čez izvirno os Y',flipVertical:'Zrcali čez izvirno os X',draw:'Svinčnik / puščice',undo:'Razveljavi risanje',redo:'Ponovi risanje',folderPrevious:'Prejšnja datoteka v mapi',folderNext:'Naslednja datoteka v mapi',deleteFile:'Premakni datoteko v koš'});
function tr(sl,en){return settings?.language==='en'?en:sl;}
function localize(){
  document.documentElement.lang=settings.language;
  for(const el of document.querySelectorAll('[data-sl]'))el.textContent=el.dataset[settings.language]||el.dataset.sl;
  $('settingsButton').title=tr('Nastavitve','Settings');$('closeSettings').setAttribute('aria-label',tr('Zapri nastavitve','Close settings'));
  $('languageSl').classList.toggle('selected',settings.language==='sl');$('languageEn').classList.toggle('selected',settings.language==='en');
}
function initViewer(){drawingOptions={...config.drawing};localize();renderDrawingMenu();renderEditorSettings();}
function loadImage(tab){
  const img=$('image'),stamp=epoch;img.onload=()=>{if(stamp!==epoch)return;tab.meta.width=img.naturalWidth;tab.meta.height=img.naturalHeight;loaded=true;img.style.display='block';layout();syncPanels();};
  img.onerror=async()=>{if(stamp!==epoch)return;try{if(tab.imageUrl)throw new Error(tr('Slike ni mogoče prikazati.','Unable to display image.'));tab.imageUrl=await window.player.prepareImage(tab.meta.id);if(stamp===epoch)img.src=tab.imageUrl;}catch(error){showError(error);}};
  if(tab.meta.videoCodec==='svg'&&!tab.imageUrl){window.player.prepareImage(tab.meta.id).then(url=>{tab.imageUrl=url;if(stamp===epoch)img.src=url;}).catch(showError);}else img.src=tab.imageUrl||tab.meta.url;
}
function syncPanels(){
  const tab=current();$('rotationPanel').hidden=!tab||tab.meta.isAudio||!tab.state.rotationVisible;
  $('rotationSlider').value=tab?.state.rotation||0;$('rotationValue').textContent=(tab?.state.rotation||0).toFixed(2).padStart(6,'0')+'°';
  $('drawPanel').hidden=!tab||tab.meta.isAudio||!tab.state.drawActive;stage.classList.toggle('drawing',!!tab?.state.drawActive);syncPivot();if(!tab?.state.drawActive)$('eraserCursor').hidden=true;
}
function setRotation(value){const tab=current();if(!tab||tab.meta.isAudio||!Number.isFinite(value))return;const angle=value===360?360:((value%360)+360)%360;tab.state.view=Visual.rotateView(stage.clientWidth,stage.clientHeight,tab.meta.width,tab.meta.height,tab.state,angle);tab.state.rotation=angle;layout();if(tab.state.crop){const r=rect();tab.state.crop=C.clampCrop(tab.state.crop,r.bw,r.bh);layout();}syncPanels();persistSoon();}
$('rotationSlider').addEventListener('input',event=>setRotation(Number(event.target.value)));
$('rotationSlider').addEventListener('dblclick',event=>{event.stopPropagation();$('angleInput').value=current().state.rotation;$('rotationInput').returnValue='';$('rotationInput').showModal();$('angleInput').focus();$('angleInput').select();});
$('rotationInput').addEventListener('close',()=>{if($('rotationInput').returnValue==='apply')setRotation(Number($('angleInput').value));});
for(const id of ['rotationPanel','drawPanel'])for(const event of ['pointerdown','pointermove','pointerup','click','dblclick','wheel'])$(id).addEventListener(event,e=>e.stopPropagation());
function closePopups(){$('typeMenu').hidden=true;if($('exportMenu').open)$('exportMenu').close();}
function closeTopPanel(){
  if($('colorPanel').open){$('colorPanel').close();return true;}
  for(const id of ['settings','rotationInput','exportMenu','textInput'])if($(id).open){$(id).close('cancel');return true;}
  if(!$('typeMenu').hidden){$('typeMenu').hidden=true;return true;}
  const s=current()?.state;if(stroke){cancelStroke();redrawDrawings();return true;}if(s?.drawActive||s?.drawingsVisible&&s.drawings.length){s.drawActive=false;s.drawingsVisible=false;syncPanels();redrawDrawings();persistSoon();return true;}
  if(s?.rotationVisible){s.rotationVisible=false;syncPanels();persistSoon();return true;}return false;
}
function handlePanelKey(event){
  if($('colorPanel').open||$('choiceDialog').open){if(event.code==='Escape'){event.preventDefault();($('colorPanel').open?$('colorPanel'):$('choiceDialog')).close('cancel');}else if(event.code==='Enter'&&$('choiceDialog').open){event.preventDefault();const button=document.activeElement?.closest('#choiceButtons button')||$('choiceButtons').firstElementChild;$('choiceDialog').close(button.value);}return true;}
  if($('rotationInput').open||$('exportMenu').open||$('textInput').open){if(event.code==='Escape'){event.preventDefault();closeTopPanel();}return true;}
  if(stroke&&event.code==='Enter'){event.preventDefault();commitStroke();return true;}
  return false;
}
for(const id of ['settings','rotationInput','exportMenu','textInput'])$(id).addEventListener('click',event=>{if(event.target!==$(id))return;const r=$(id).getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$(id).close('cancel');});
$('languageSl').addEventListener('click',()=>saveSettings({...settings,language:'sl'}));$('languageEn').addEventListener('click',()=>saveSettings({...settings,language:'en'}));
function runViewerAction(action){
  const tab=current(),s=tab?.state;
  if(!['rotate','flipHorizontal','flipVertical','draw','undo','redo','folderPrevious','folderNext','deleteFile'].includes(action))return false;
  if(!tab)return true;
  if(action==='folderPrevious'||action==='folderNext'){navigateFolder(action==='folderNext'?1:-1).catch(showError);return true;}
  if(action==='deleteFile'){deleteCurrent().catch(showError);return true;}
  if(tab.meta.isAudio)return true;
  if(action==='rotate'){s.rotationVisible=!s.rotationVisible;if(s.rotationVisible){const r=rect();s.pivot=Visual.toSource(r,lastPointer||{x:stage.clientWidth/2,y:stage.clientHeight/2});}syncPanels();syncPivot();controls();}
  if(action==='flipHorizontal'){s.flipX=!s.flipX;layout();}
  if(action==='flipVertical'){s.flipY=!s.flipY;layout();}
  if(action==='draw'){if(s.drawActive&&stroke)commitStroke();s.drawActive=!s.drawActive;s.drawingsVisible=s.drawActive;if(s.drawActive)video.pause();syncPanels();renderDrawingMenu();redrawDrawings();}
  if(action==='undo'){if(stroke){if(stroke.kind==='text')finishInlineText(true);else cancelStroke();}else if(s.drawings.length)s.redo.push(s.drawings.pop());s.drawingsVisible=true;s.drawingsSaved=false;redrawDrawings();}
  if(action==='redo'){if(s.redo.length)s.drawings.push(s.redo.pop());s.drawingsVisible=true;s.drawingsSaved=false;redrawDrawings();}
  persistSoon();return true;
}
function showTypeMenu(tab,anchor){
  const menu=$('typeMenu');typeTab=tab;menu.replaceChildren();const combinations=[['video'],['audio'],['image'],['video','audio'],['video','image'],['audio','image'],['video','audio','image']];
  const names={video:tr('Video','Video'),audio:tr('Zvok','Audio'),image:tr('Slike','Images')};
  for(const types of combinations){const button=document.createElement('button');button.className='menuItem';for(const type of types){const img=document.createElement('img');img.src='assets/'+type+'.svg';img.alt='';button.append(img);}const label=document.createElement('span');label.textContent=types.map(t=>names[t]).join(' + ');button.append(label);button.classList.toggle('selected',JSON.stringify(types)===JSON.stringify(tab.state.mediaFilter||[tab.meta.kind]));button.addEventListener('click',()=>{tab.state.mediaFilter=types;menu.hidden=true;renderTabs();persistSoon();});menu.append(button);}
  const r=anchor.getBoundingClientRect();menu.style.left=Math.min(r.left,window.innerWidth-210)+'px';menu.style.top=r.bottom+'px';menu.hidden=false;
}
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#typeMenu,.mediaIcons'))$('typeMenu').hidden=true;});
async function canLeaveDrawing(){if(stroke)commitStroke();return true;}
async function replaceCurrent(file){
  const old=current();if(!old)return;const meta=await window.player.describe(file),index=active;capture();video.pause();
  const cache=old.folderStates||new Map();cache.set(old.meta.path,JSON.parse(JSON.stringify(old.state)));
  const saved=cache.get(meta.path),state={...fresh(),...saved,mediaFilter:old.state.mediaFilter||[old.meta.kind]};state.playing=!meta.isImage;cancelStroke();
  tabs[index]={meta,state,folderStates:cache,proxyUrl:null,preparing:false};active=-1;loaded=false;activate(index);
  if(!tabs.some(t=>t.meta.id===old.meta.id))await window.player.release(old.meta.id);
  history.push({path:meta.path,opened:new Date().toISOString()});history=history.slice(-config.storage.historyEntries);persistSoon();
}
async function navigateFolder(direction){
  if(navigating||!current())return;navigating=true;
  try{if(!await canLeaveDrawing())return;const tab=current(),files=await window.player.folderFiles({id:tab.meta.id,types:tab.state.mediaFilter||[tab.meta.kind]});if(!files.length)return;
    const i=files.findIndex(p=>p.toLowerCase()===tab.meta.path.toLowerCase()),next=(i+direction+files.length)%files.length;
    if(files[next]!==tab.meta.path)await replaceCurrent(files[next]);
  }finally{navigating=false;}
}
async function deleteCurrent(){
  if(navigating||!current())return;navigating=true;
  try{const tab=current(),files=await window.player.folderFiles({id:tab.meta.id,types:tab.state.mediaFilter||[tab.meta.kind]}),i=files.indexOf(tab.meta.path);
    if(await choose(tr('Premakni datoteko v koš?','Move this file to the Recycle Bin?'),tab.meta.path,[tr('Da','Yes'),tr('Ne','No')])!=='0')return;
    if(!await window.player.deleteFile({id:tab.meta.id,confirmed:true}))return;
    const next=files.length>1?files[(i+1)%files.length]:null;
    if(next)await replaceCurrent(next);else closeTab();
    for(let j=tabs.length-1;j>=0;j--)if(tabs[j].meta.path===tab.meta.path)closeTab(j);
    closed=closed.filter(t=>t.path!==tab.meta.path);persistSoon(true);
  }finally{navigating=false;}
}
async function showExportMenu(tab){
  const locations=await window.player.exportFolders({id:tab.meta.id,kind:effectiveExportKind(tab)});exportTab=tab;localize();$('exportChoices').replaceChildren();$('recentFolders').replaceChildren();
  const labels={source:tr('Mapa izvirne datoteke','Source folder'),downloads:tr('Prenosi','Downloads'),video:tr('Videoposnetki','Videos'),audio:tr('Glasba','Music'),image:tr('Slike','Pictures')};
  function row(parent,dir,label){const button=document.createElement('button');button.className='folderChoice';button.title=dir;const strong=document.createElement('span'),small=document.createElement('small');strong.textContent=label;small.textContent=dir;button.append(strong,small);button.addEventListener('click',()=>{$('exportMenu').close();exportToFolder(tab,dir);});parent.append(button);}
  for(const item of locations.choices)row($('exportChoices'),item.path,labels[item.key]);
  for(const dir of locations.recent)row($('recentFolders'),dir,dir.split(/[\\/]/).filter(Boolean).at(-1));
  $('exportVideo').value=settings.videoFormat;$('exportAudio').value=settings.audioFormat;$('exportImage').value=settings.imageFormat;$('exportQuality').checked=settings.matchSource;
  initExportExtras(tab);
  $('exportMenu').showModal();$('exportChoices').firstElementChild?.blur();
}
function readExportOptions(){return {videoFormat:$('exportVideo').value,audioFormat:$('exportAudio').value,imageFormat:$('exportImage').value,matchSource:$('exportQuality').checked,openAfterExport:$('exportOpen').checked,contentMode:$('exportContent').value};}
function imageRaster(){const canvas=document.createElement('canvas'),img=$('image');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);return canvas.toDataURL('image/png').split(',')[1];}
function annotationBounds(tab){const w=tab.meta.width,h=tab.meta.height;const outside=[...tab.state.drawings,...(stroke?[stroke]:[])].some(line=>line.points?.some(p=>p.x<0||p.y<0||p.x>w||p.y>h)||line.kind==='text'&&(line.x<0||line.y<0||line.x+line.boxWidth>w||line.y+line.boxHeight>h));const d=Math.hypot(w,h),x=outside?Math.ceil(h/2)+2:0,y=outside?Math.ceil(w/2)+2:0;return {x,y,width:w+2*x,height:h+2*y};}
function drawingRaster(tab){const canvas=document.createElement('canvas'),b=annotationBounds(tab);canvas.width=b.width;canvas.height=b.height;const ctx=canvas.getContext('2d');ctx.translate(b.x,b.y);for(const line of tab.state.drawings)Visual.draw(ctx,line);return canvas.toDataURL('image/png').split(',')[1];}
function redrawDrawings(){
  const tab=current();if(!tab||tab.meta.isAudio)return;const layer=$('drawingLayer'),b=annotationBounds(tab);if(layer.width!==b.width||layer.height!==b.height){layer.width=b.width;layer.height=b.height;layer._stamp=null;}layer._offset={x:b.x,y:b.y};
  const stamp=[tab.meta.id,layer.width,layer.height,tab.state.drawings.length,tab.state.drawings.at(-1),stroke,stroke?.points?.length,stroke?.points?.at(-1)?.x,stroke?.points?.at(-1)?.y,strokeHover?.x,strokeHover?.y];if(layer._stamp&&stamp.every((v,i)=>v===layer._stamp[i])){renderRaster();return;}layer._stamp=stamp;layer._revision=(layer._revision||0)+1;
  const ctx=layer.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,layer.width,layer.height);ctx.save();ctx.translate(b.x,b.y);for(const line of tab.state.drawings)Visual.draw(ctx,line);
  if(stroke?.kind==='text'){if($('inlineText').hidden)Visual.draw(ctx,stroke);}
  else if(stroke){const preview=strokeHover?{...stroke,points:[...stroke.points,strokeHover]}:stroke;Visual.draw(ctx,preview);}
  ctx.restore();renderRaster();
}
function penColor(){const rgb=Visual.hsv(drawingOptions.hue,drawingOptions.saturation,drawingOptions.brightness);return `rgba(${rgb.map(Math.round).join(',')},${drawingOptions.alpha})`;}
function newStroke(polyline){return {kind:drawingOptions.tool==='eraser'?'eraser':'line',points:[],color:penColor(),width:drawingOptions.tool==='eraser'?(drawingOptions.eraserWidth||20):drawingOptions.arrow?(drawingOptions.arrowLineWidth||drawingOptions.width):drawingOptions.width,arrow:drawingOptions.arrow&&drawingOptions.tool!=='eraser',arrowWidth:drawingOptions.arrowWidth,arrowHeight:drawingOptions.arrowHeight,arrowStyle:drawingOptions.tool==='arrowOpen'?'open':'filled',arrowPersistence:drawingOptions.arrowPersistence,polyline};}
function boundedPoint(event){const b=stage.getBoundingClientRect(),r=rect(),screen={x:C.clamp(event.clientX-b.left,r.cx-r.bw*r.scale/2,r.cx+r.bw*r.scale/2),y:C.clamp(event.clientY-b.top,r.cy-r.bh*r.scale/2,r.cy+r.bh*r.scale/2)};return Visual.toSource(r,screen);}
function drawingDown(event){
  const tab=current();if(tab.meta.isAudio)return;const p=boundedPoint(event);
  if(drawingOptions.tool==='text'){if(stroke)finishInlineText();beginInlineText(event);event.preventDefault();skipClick=true;return;}
  if(event.shiftKey){
    if(!stroke)stroke=newStroke(true);else if(!stroke.polyline)commitStroke();if(!stroke)stroke=newStroke(true);
    const existing=stroke.points.find(v=>Math.hypot(p.x-v.x,p.y-v.y)*rect().scale<=config.drawing.vertexHitPixels);
    if(existing&&stroke.points.length>1){const last=stroke.points.at(-1),dx=existing.x-last.x,dy=existing.y-last.y,angle=Math.atan2(dy,dx)/(Math.PI/4);if(Math.hypot(dx,dy)>.0001&&(!event.ctrlKey||Math.abs(angle-Math.round(angle))<.000001))stroke.points.push({...existing});commitStroke();event.preventDefault();return;}
    let next=p;if(event.ctrlKey&&stroke.points.length){const last=stroke.points.at(-1);next=Visual.constrained(last,p);}
    stroke.points.push(next);strokeHover=null;redrawDrawings();
  }else{if(stroke)commitStroke();stroke=newStroke(false);stroke.points.push(p);stage.setPointerCapture(event.pointerId);}
  event.preventDefault();skipClick=true;
}
function drawingMove(event){
  if(!current()?.state.drawActive||drag)return false;if(drawingOptions.tool==='eraser'){stage.style.cursor='none';showEraser(event);}else{stage.style.cursor='crosshair';$('eraserCursor').hidden=true;}
  if(stroke){const p=boundedPoint(event);if(stroke.kind==='text')return true;if(stroke.polyline){strokeHover=event.ctrlKey&&event.shiftKey?Visual.constrained(stroke.points.at(-1),p):p;}
    else if(event.buttons&1){const last=stroke.points.at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)*rect().scale>.3&&stroke.points.length<config.drawing.maxPoints)stroke.points.push(p);}
    redrawDrawings();}
  return true;
}
function drawingUp(event){if(!current()?.state.drawActive||!stroke)return false;if(stroke.kind==='text'){skipClick=true;return true;}if(!stroke.polyline){commitStroke();if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);}skipClick=true;return true;}
function commitStroke(){if(stroke?.kind==='text'&&!$('inlineText').hidden){finishInlineText();return;}if(stroke?.kind==='text'&&!stroke.text){cancelStroke();redrawDrawings();return;}if(stroke?.points.length&&current()){current().state.drawings.push(stroke);current().state.redo=[];current().state.drawingsSaved=false;}stroke=null;strokeHover=null;redrawDrawings();persistSoon();}
function cancelStroke(){stroke=null;strokeHover=null;$('inlineText').hidden=true;}
$('closeDraw').addEventListener('click',()=>runViewerAction('draw'));
function renderDrawingMenu(){
  if(!drawingOptions)return;localize();$('penWidth').value=drawingOptions.width;$('arrowWidth').value=drawingOptions.arrowWidth;$('arrowHeight').value=drawingOptions.arrowHeight;$('drawTool').value=drawingOptions.tool==='text'?'text':drawingOptions.arrow?'arrow':'line';$('textOptions').hidden=drawingOptions.tool!=='text';$('fontFamily').value=drawingOptions.font;$('fontSize').value=drawingOptions.fontSize;$('colorMode').value=drawingOptions.mode;$('colorUnits').value=drawingOptions.normalized?'normalized':'byte';$('arrowOptions').hidden=!drawingOptions.arrow;
  const rgb=Visual.hsv(drawingOptions.hue,drawingOptions.saturation,drawingOptions.brightness),values=drawingOptions.mode==='rgb'?[...rgb.map(v=>v/255),drawingOptions.alpha]:[drawingOptions.hue/360,drawingOptions.saturation,drawingOptions.brightness,drawingOptions.alpha];
  const names=drawingOptions.mode==='rgb'?['R','G','B','A']:['H','S','V','A'],max=drawingOptions.normalized?1:255;$('colorSliders').replaceChildren();
  values.forEach((value,i)=>{const row=document.createElement('label'),title=document.createElement('span'),slider=document.createElement('input'),number=document.createElement('input');row.className='colorRow';title.textContent=names[i];slider.type='range';slider.min=0;slider.max=1;slider.step=.001;slider.value=value;number.type='number';number.min=0;number.max=max;number.step=max===1?.001:1;number.value=Math.round(value*max*1000)/1000;function change(v){values[i]=C.clamp(v,0,1);if(drawingOptions.mode==='rgb'){const hsv=Visual.rgb(...values.slice(0,3).map(v=>v*255));[drawingOptions.hue,drawingOptions.saturation,drawingOptions.brightness]=hsv;}else{drawingOptions.hue=values[0]*360;drawingOptions.saturation=values[1];drawingOptions.brightness=values[2];}drawingOptions.alpha=values[3];slider.value=values[i];number.value=Math.round(values[i]*max*1000)/1000;updateColorPreview();}slider.addEventListener('input',()=>change(Number(slider.value)));number.addEventListener('input',()=>change(Number(number.value)/max));row.append(title,slider,number);$('colorSliders').append(row);});
  paintWheel();updateColorPreview();
}
function updateColorPreview(){$('colorPreview').style.background=penColor();}
function paintWheel(){const canvas=$('colorWheel'),ctx=canvas.getContext('2d'),w=canvas.width,r=w/2,data=ctx.createImageData(w,w);for(let y=0;y<w;y++)for(let x=0;x<w;x++){const dx=(x-r)/r,dy=(r-y)/r,s=Math.hypot(dx,dy),i=(y*w+x)*4;if(s>1)continue;const h=(Math.atan2(dy,dx)*180/Math.PI+360)%360,rgb=Visual.hsv(h,s,1);data.data.set([...rgb,255],i);}ctx.putImageData(data,0,0);const a=drawingOptions.hue*Math.PI/180,x=r+Math.cos(a)*r*drawingOptions.saturation,y=r-Math.sin(a)*r*drawingOptions.saturation;ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();}
function pickWheel(event){const r=$('colorWheel').getBoundingClientRect(),dx=(event.clientX-r.left-r.width/2)/(r.width/2),dy=(r.height/2-event.clientY+r.top)/(r.height/2);drawingOptions.hue=(Math.atan2(dy,dx)*180/Math.PI+360)%360;drawingOptions.saturation=Math.min(1,Math.hypot(dx,dy));renderDrawingMenu();}
$('colorWheel').addEventListener('pointerdown',event=>{$('colorWheel').setPointerCapture(event.pointerId);pickWheel(event);});$('colorWheel').addEventListener('pointermove',event=>{if(event.buttons&1)pickWheel(event);});
for(const [id,key] of [['penWidth','width'],['arrowWidth','arrowWidth'],['arrowHeight','arrowHeight']])$(id).addEventListener('input',()=>{drawingOptions[key]=C.clamp(Number($(id).value)||1,.1,10000);});
$('drawTool').addEventListener('change',()=>{drawingOptions.tool=$('drawTool').value;drawingOptions.arrow=['arrow','arrowOpen'].includes(drawingOptions.tool);$('arrowOptions').hidden=!drawingOptions.arrow;$('textOptions').hidden=drawingOptions.tool!=='text';});$('colorMode').addEventListener('change',()=>{drawingOptions.mode=$('colorMode').value;renderDrawingMenu();});$('colorUnits').addEventListener('change',()=>{drawingOptions.normalized=$('colorUnits').value==='normalized';renderDrawingMenu();});

$('textInput').addEventListener('close',()=>{if(stroke?.kind!=='text')return;if($('textInput').returnValue==='apply'&&$('textContent').value.trim()){stroke.text=$('textContent').value;commitStroke();}else{cancelStroke();redrawDrawings();}});
$('fontFamily').addEventListener('change',()=>drawingOptions.font=$('fontFamily').value);$('fontSize').addEventListener('input',()=>drawingOptions.fontSize=C.clamp(Number($('fontSize').value)||24,1,10000));
