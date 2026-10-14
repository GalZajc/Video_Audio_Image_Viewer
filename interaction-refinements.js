 'use strict';
let lastPointer=null,pivotDrag=null,escapeHeld=null,eraserRaster=null;
Object.assign(actions,{exitDrawing:'Esc+1: zapri risanje',exitRotation:'Esc+2: skrij rotacijo',exitCrop:'Esc+3: skrij obrez',centerView:'Esc+4: centriraj pogled',zeroRotation:'Esc+5: izniči rotacijo',shrinkWindow:'Esc+6: skrči okno brez robov',maxWindow:'Esc+7: največje okno brez robov'});
Object.assign(englishActions,{exitDrawing:'Esc+1: close drawing',exitRotation:'Esc+2: hide rotation',exitCrop:'Esc+3: hide crop',centerView:'Esc+4: reset view',zeroRotation:'Esc+5: reset rotation',shrinkWindow:'Esc+6: shrink fitted window',maxWindow:'Esc+7: largest fitted window'});
function syncPivot(){const s=current()?.state,r=rect(),marker=$('rotationPivot');marker.hidden=!s?.rotationVisible||!r;if(marker.hidden)return;const p=Visual.toScreen(r,s.pivot||{x:r.w/2,y:r.h/2});marker.style.left=p.x-12+'px';marker.style.top=p.y-12+'px';marker.style.transform=`rotate(${-s.rotation}deg)`;}
$('rotationPivot').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();e.preventDefault();pivotDrag=e.pointerId;$('rotationPivot').setPointerCapture(e.pointerId);});
$('rotationPivot').addEventListener('pointermove',e=>{e.stopPropagation();if(pivotDrag!==e.pointerId)return;const b=stage.getBoundingClientRect();current().state.pivot=Visual.toSource(rect(),{x:e.clientX-b.left,y:e.clientY-b.top});syncPivot();persistSoon();});
for(const type of ['pointerup','pointercancel'])$('rotationPivot').addEventListener(type,e=>{e.stopPropagation();if($('rotationPivot').hasPointerCapture(e.pointerId))$('rotationPivot').releasePointerCapture(e.pointerId);pivotDrag=null;});
for(const type of ['click','dblclick','wheel'])$('rotationPivot').addEventListener(type,e=>e.stopPropagation());
async function fitMediaWindow(maxMode=null,expand=false){const tab=current();if(!tab||tab.meta.isAudio||windowFitBusy)return;if(maxMode===true&&!settings.escapeMaxFit)return;windowFitBusy=true;try{const headerHeight=document.body.classList.contains('fill')?0:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar'));await window.player.fitWindow({ratio:rect().bw/rect().bh,headerHeight,expand,maxMode});tab.state.view={zoom:1,x:0,y:0,fitRotation:tab.state.rotation};layout();}catch(e){showError(e);}finally{windowFitBusy=false;}}
function runEscapeAction(action){if(!['exitDrawing','exitRotation','exitCrop','centerView','zeroRotation','shrinkWindow','maxWindow'].includes(action))return false;const s=current()?.state;if(!s)return true;
  if(action==='exitDrawing'){if(stroke?.kind==='text')finishInlineText();else if(stroke)commitStroke();s.drawActive=false;s.drawingsVisible=false;cancelStroke();syncPanels();redrawDrawings();}
  if(action==='exitRotation'){s.rotationVisible=false;syncPanels();}
  if(action==='exitCrop'){s.cropVisible=false;layout();}
  if(action==='centerView'){s.view={zoom:1,x:0,y:0};layout();}
  if(action==='zeroRotation')setRotation(0);
  if(action==='shrinkWindow')fitMediaWindow(false);
  if(action==='maxWindow')fitMediaWindow(true);
  persistSoon();return true;
}
// Escape is a prefix while down; a plain Escape executes only upon release.
document.addEventListener('keydown',e=>{
  if(!config||e.isComposing)return;
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)escapeHeld={used:false,expand:e.shiftKey};return;}
  if(!escapeHeld)return;
  if(['ControlLeft','ControlRight','ShiftLeft','ShiftRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code))return;
  escapeHeld.used=true;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
  const binding='Escape+'+C.shortcut(e);
  if(recording){const other=Object.entries(settings.shortcuts).find(([key,value])=>key!==recording.action&&value===binding);if(other){toast(tr('Ta bližnjica je že uporabljena.','This shortcut is already in use.'));return;}saveSettings({...settings,shortcuts:{...settings.shortcuts,[recording.action]:binding}});return;}
  const action=Object.keys(settings.shortcuts).find(key=>settings.shortcuts[key]===binding);if(action)runAction(action);
},true);
document.addEventListener('keyup',e=>{if(e.code!=='Escape'||!escapeHeld)return;const pending=escapeHeld;escapeHeld=null;e.preventDefault();e.stopImmediatePropagation();if(pending.used)return;if(recording){recording=null;renderSettings();return;}if($('choiceDialog').open){$('choiceDialog').close('cancel');return;}if($('inlineText').contains(document.activeElement)){finishInlineText();return;}escape(pending.expand);},true);
window.addEventListener('blur',()=>{escapeHeld=null;pivotDrag=null;});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('cancel',e=>e.preventDefault());
$('angleInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();$('rotationInput').close('apply');}});
function beginInlineText(e){const r=rect(),b=stage.getBoundingClientRect(),screen={x:e.clientX-b.left,y:e.clientY-b.top},p=Visual.toSource(r,screen),px=Visual.toSource(r,{x:screen.x+r.scale,y:screen.y}),py=Visual.toSource(r,{x:screen.x,y:screen.y+r.scale});stroke={kind:'text',points:[p],x:p.x,y:p.y,axisX:{x:px.x-p.x,y:px.y-p.y},axisY:{x:py.x-p.x,y:py.y-p.y},boxWidth:config.drawing.textBoxWidth,boxHeight:drawingOptions.fontSize,font:drawingOptions.font,fontSize:drawingOptions.fontSize,bold:!!drawingOptions.bold,italic:!!drawingOptions.italic,color:penColor(),text:''};$('inlineTextContent').value='';$('inlineText').hidden=false;layoutInlineText();$('inlineTextContent').focus();}
function layoutInlineText(){const t=stroke,box=$('inlineText'),input=$('inlineTextContent');if(!t||t.kind!=='text'||box.hidden)return;const r=rect();if(!r)return;const p=Visual.toScreen(r,{x:t.x,y:t.y}),ax=t.axisX||{x:1,y:0},ay=t.axisY||{x:0,y:1},px=Visual.toScreen(r,{x:t.x+ax.x,y:t.y+ax.y}),py=Visual.toScreen(r,{x:t.x+ay.x,y:t.y+ay.y});box.style.left=p.x+'px';box.style.top=p.y+'px';box.style.transform=`matrix(${px.x-p.x},${px.y-p.y},${py.x-p.x},${py.y-p.y},0,0)`;input.style.font=Visual.textFont(t);input.style.lineHeight='1';input.style.color=t.color;input.style.width=t.boxWidth+'px';const ctx=$('drawingLayer').getContext('2d');t.boxHeight=Math.max(1,Visual.textLines(ctx,t).length)*t.fontSize;input.style.height=t.boxHeight+'px';}
function finishInlineText(cancel=false){if(!stroke||stroke.kind!=='text'||$('inlineText').hidden)return;$('inlineText').hidden=true;stroke.text=$('inlineTextContent').value;if(cancel||!stroke.text.trim())cancelStroke();else commitStroke();redrawDrawings();persistSoon();}
$('inlineTextContent').addEventListener('input',()=>{if(stroke?.kind!=='text')return;stroke.text=$('inlineTextContent').value;layoutInlineText();$('drawingLayer')._stamp=null;redrawDrawings();});
$('inlineTextContent').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();finishInlineText();}else e.stopPropagation();});
$('inlineTextContent').addEventListener('blur',()=>{setTimeout(()=>{if(!document.activeElement?.closest('#drawPanel,#colorPanel,#inlineText'))finishInlineText();},0);});
new ResizeObserver(()=>{if(stroke?.kind!=='text'||$('inlineText').hidden)return;const width=$('inlineTextContent').clientWidth;if(Math.abs(width-stroke.boxWidth)>1){stroke.boxWidth=width;layoutInlineText();}}).observe($('inlineTextContent'));
for(const type of ['pointerdown','pointermove','pointerup','click','dblclick','wheel'])$('inlineText').addEventListener(type,e=>e.stopPropagation());
function showEraser(e){const r=rect(),b=stage.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top,diameter=(drawingOptions.eraserWidth||20)*r.scale,canvas=$('eraserCursor'),pad=2;const left=Math.max(0,x-diameter/2-pad),top=Math.max(0,y-diameter/2-pad),width=Math.min(stage.clientWidth-left,diameter+2*pad),height=Math.min(stage.clientHeight-top,diameter+2*pad);if(width<=0||height<=0){canvas.hidden=true;return;}canvas.width=Math.ceil(width);canvas.height=Math.ceil(height);canvas.style.left=left+'px';canvas.style.top=top+'px';canvas.hidden=false;const ctx=canvas.getContext('2d'),cx=x-left,cy=y-top;ctx.save();ctx.beginPath();ctx.arc(cx,cy,diameter/2,0,Math.PI*2);ctx.clip();if(drawingOptions.eraserPreview){if(!eraserRaster){const c=document.createElement('canvas');try{eraserRaster=new PixelRaster(c);}catch{eraserRaster=new CpuPixelRaster(document.createElement('canvas'));}}const tab=current();eraserRaster.draw(tab.meta.isImage?$('image'):video,$('drawingLayer'),r,tab.state,settings.backgroundColor||'#000000ff',false);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.drawImage(eraserRaster.canvas,r.cx-r.bw*r.scale/2-left,r.cy-r.bh*r.scale/2-top,r.bw*r.scale,r.bh*r.scale);}ctx.restore();ctx.beginPath();ctx.arc(cx,cy,diameter/2,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.shadowColor='#000';ctx.shadowBlur=1;ctx.stroke();}
stage.addEventListener('pointerleave',()=>{$('eraserCursor').hidden=true;});

for(const [id,key] of [['fontFamily','font'],['fontSize','fontSize']])$(id).addEventListener('input',()=>{if(stroke?.kind==='text'){stroke[key]=drawingOptions[key];layoutInlineText();}});
