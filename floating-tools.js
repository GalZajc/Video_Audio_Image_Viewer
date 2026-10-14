'use strict';
let floatingSyncFrame=0,floatingLast='',floatingClaim=false,floatingCommit=false,drawingProfileOwner=null,drawingProfileState=null,drawingProfileLinked=false,sharedDrawingOptions=null;
const copyDrawingOptions=value=>JSON.parse(JSON.stringify(value));
function rememberDrawingProfile(){if(drawingProfileState&&!drawingProfileLinked&&drawingOptions)drawingProfileState.toolOptions=copyDrawingOptions(drawingOptions);}
function selectDrawingProfile(){
 const tab=current(),linked=!!settings?.linkDrawingTools;if(!tab||!drawingOptions)return false;
 if(tab===drawingProfileOwner&&tab.state===drawingProfileState&&linked===drawingProfileLinked)return false;rememberDrawingProfile();
 if(linked){sharedDrawingOptions||=copyDrawingOptions(drawingOptions);drawingOptions=copyDrawingOptions(sharedDrawingOptions);}
 else{tab.state.toolOptions||=copyDrawingOptions(settings.drawingCustomization||drawingOptions);drawingOptions={...copyDrawingOptions(config.drawing),...copyDrawingOptions(tab.state.toolOptions)};}
 drawingProfileOwner=tab;drawingProfileState=tab.state;drawingProfileLinked=linked;return true;
}
function syncFloatingTools(claim=false,commit=false){
 if(!drawingOptions||!config)return;floatingClaim||=claim;floatingCommit||=commit;
 if(floatingSyncFrame)cancelAnimationFrame(floatingSyncFrame);
 const publish=()=>{floatingSyncFrame=0;selectDrawingProfile();for(const tool of ['line','arrow','arrowOpen','text','eraser'])colorFor(tool);rememberDrawingProfile();
  const value={visible:!!current()?.state.drawActive&&!current()?.meta.isAudio,options:drawingOptions,language:settings.language,scale:rect()?.scale||1,shortcuts:settings.shortcuts,tabId:current()?.state.instanceId||null,claim:floatingClaim,commit:floatingCommit};
  floatingClaim=floatingCommit=false;const key=JSON.stringify(value);if(key!==floatingLast||value.claim||value.commit){floatingLast=key;window.player.drawingToolsSync(value);}
 };
 if(claim||commit)publish();else floatingSyncFrame=requestAnimationFrame(publish);
}
const floatingPanels=syncPanels;syncPanels=function(){const changed=selectDrawingProfile();floatingPanels();$('drawPanel').hidden=true;if(changed)floatingMenu();syncFloatingTools();};
const floatingMenu=renderDrawingMenu;renderDrawingMenu=function(){selectDrawingProfile();floatingMenu();rememberDrawingProfile();syncFloatingTools();};
const floatingLayout=layout;layout=function(){selectDrawingProfile();floatingLayout();syncFloatingTools();};
const floatingCapture=capture;capture=function(){rememberDrawingProfile();floatingCapture();};
const floatingSave=savePalette;savePalette=function(){rememberDrawingProfile();if(settings.linkDrawingTools)sharedDrawingOptions=copyDrawingOptions(drawingOptions);floatingSave();persistSoon();syncFloatingTools(false,true);};
window.addEventListener('focus',()=>syncFloatingTools(true));window.player.onDrawingToolsRequest(()=>syncFloatingTools(true));
window.player.onDrawingToolsOptions(value=>{
 settings.linkDrawingTools=!!value.linked;selectDrawingProfile();
 if(value.linked&&value.options){sharedDrawingOptions=copyDrawingOptions(value.options);drawingOptions=copyDrawingOptions(value.options);}
 renderDrawingMenu();if($('settings').open)$('linkDrawingTools').checked=!!settings.linkDrawingTools;
});
window.player.onSettings(()=>{selectDrawingProfile();renderDrawingMenu();});
$('linkDrawingTools').onchange=()=>saveSettings({...settings,linkDrawingTools:$('linkDrawingTools').checked}).then(()=>{selectDrawingProfile();renderDrawingMenu();});
const drawingSettings=renderEditorSettings;renderEditorSettings=function(){drawingSettings();$('linkDrawingTools').checked=!!settings.linkDrawingTools;};
window.player.onDrawingToolCommand(value=>{
 const tab=current();if(!tab||tab.meta.isAudio)return;if(value.tabId!==tab.state.instanceId){syncFloatingTools(true);return;}selectDrawingProfile();
 if(value.action==='hide'){runEscapeAction('exitDrawing');return;}
 if(value.action==='shortcut'){if(value.name==='escape')escape(value.expand);else if(Object.hasOwn(settings.shortcuts,value.name))runAction(value.name);return;}
 if(value.action==='tool'){
  if(stroke&&stroke.kind!=='text')commitStroke();const tool=value.tool;if(!['line','arrow','arrowOpen','text','eraser'].includes(tool))return;
  drawingOptions.expandedTool=drawingOptions.tool===tool&&drawingOptions.expandedTool===tool?null:tool;drawingOptions.tool=tool;drawingOptions.arrow=['arrow','arrowOpen'].includes(tool);
 }else if(value.action==='color')Object.assign(colorFor(value.tool),value.color);
 else if(value.action==='parameter'){
  const allowed=['width','arrowLineWidth','arrowWidth','arrowHeight','arrowPersistence','arrowMinWavelength','fontSize','eraserWidth','curveWavelengthLine','curveWavelengthArrow','curveWavelengthOpen'],zero=value.key.startsWith('curveWavelength');
  if(!allowed.includes(value.key)||!Number.isFinite(value.value)||value.value<(zero?0:.000001)||value.value>10000)return;
  drawingOptions[value.key]=value.value;if(value.range){drawingOptions.ranges||={};drawingOptions.ranges[value.key]=value.range;}
 }else if(value.action==='option'){
  if(['bold','italic','eraserPreview','arrowBaseDirection'].includes(value.key))drawingOptions[value.key]=!!value.value;
  else if(value.key==='font'&&['Arial','Helvetica','Verdana','Consolas','Comic Sans MS'].includes(value.value))drawingOptions.font=value.value;
 }
 if(stroke?.kind==='text'){Object.assign(stroke,{fontSize:drawingOptions.fontSize,font:drawingOptions.font,bold:drawingOptions.bold,italic:drawingOptions.italic,color:colorString(colorFor('text'))});layoutInlineText();}
 renderDrawingMenu();savePalette();
});
const profileDrawingDown=drawingDown;drawingDown=function(event){selectDrawingProfile();return profileDrawingDown(event);};
const filteredNewStroke=newStroke;newStroke=function(polyline){const value=filteredNewStroke(polyline),key=drawingOptions.tool==='line'?'curveWavelengthLine':drawingOptions.tool==='arrow'?'curveWavelengthArrow':'curveWavelengthOpen';value.curveMinWavelength=polyline||drawingOptions.tool==='eraser'?0:(drawingOptions[key]||0);value.arrowBaseDirection=drawingOptions.tool==='arrow'&&!!drawingOptions.arrowBaseDirection;return value;};
