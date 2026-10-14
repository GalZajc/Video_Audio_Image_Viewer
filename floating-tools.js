'use strict';
let floatingSyncFrame=0,floatingLast='';
function syncFloatingTools(claim=false){
 if(!drawingOptions||!config)return;
 if(floatingSyncFrame)cancelAnimationFrame(floatingSyncFrame);
 floatingSyncFrame=requestAnimationFrame(()=>{floatingSyncFrame=0;
  for(const tool of ['line','arrow','arrowOpen','text','eraser'])colorFor(tool);
  const value={visible:!!current()?.state.drawActive&&!current()?.meta.isAudio,options:drawingOptions,language:settings.language,scale:rect()?.scale||1,shortcuts:settings.shortcuts,claim};
  const key=JSON.stringify(value);if(key!==floatingLast){floatingLast=key;window.player.drawingToolsSync(value);}
 });
}
const floatingPanels=syncPanels;syncPanels=function(){floatingPanels();$('drawPanel').hidden=true;syncFloatingTools();};
const floatingMenu=renderDrawingMenu;renderDrawingMenu=function(){floatingMenu();syncFloatingTools();};
const floatingLayout=layout;layout=function(){floatingLayout();syncFloatingTools();};
window.addEventListener('focus',()=>syncFloatingTools(true));
window.player.onDrawingToolCommand(value=>{
 const tab=current();if(!tab||tab.meta.isAudio)return;
 if(value.action==='hide'){runEscapeAction('exitDrawing');return;}
 if(value.action==='shortcut'){if(value.name==='escape')escape(value.expand);else if(Object.hasOwn(settings.shortcuts,value.name))runAction(value.name);return;}
 if(value.action==='tool'){
  if(stroke&&stroke.kind!=='text')commitStroke();
  const tool=value.tool;if(!['line','arrow','arrowOpen','text','eraser'].includes(tool))return;
  drawingOptions.expandedTool=drawingOptions.tool===tool&&drawingOptions.expandedTool===tool?null:tool;
  drawingOptions.tool=tool;drawingOptions.arrow=['arrow','arrowOpen'].includes(tool);
 }else if(value.action==='color')Object.assign(colorFor(value.tool),value.color);
 else if(value.action==='parameter'){
  const allowed=['width','arrowLineWidth','arrowWidth','arrowHeight','arrowPersistence','arrowMinWavelength','fontSize','eraserWidth'];
  if(!allowed.includes(value.key)||!Number.isFinite(value.value)||value.value<=0||value.value>10000)return;
  drawingOptions[value.key]=value.value;
  if(value.range){drawingOptions.ranges||={};drawingOptions.ranges[value.key]=value.range;}
 }else if(value.action==='option'){
  if(['bold','italic','eraserPreview'].includes(value.key))drawingOptions[value.key]=!!value.value;
  else if(value.key==='font'&&['Arial','Helvetica','Verdana','Consolas','Comic Sans MS'].includes(value.value))drawingOptions.font=value.value;
 }
 if(stroke?.kind==='text'){Object.assign(stroke,{fontSize:drawingOptions.fontSize,font:drawingOptions.font,bold:drawingOptions.bold,italic:drawingOptions.italic,color:colorString(colorFor('text'))});layoutInlineText();}
 renderDrawingMenu();savePalette();
});
