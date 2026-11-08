'use strict';
Object.assign(actions,{clearEdits:'Počisti časovni obrez, krajevni obrez ali risbe'});
Object.assign(englishActions,{clearEdits:'Clear time selection, crop or drawings'});
let clearEditsTab=null;
function openClearEdits(){
  const tab=current();if(!tab||$('clearEdits').open)return;
  clearEditsTab=tab;localize();
  const available={clearTemporal:!!(tab.state.in||tab.state.out||tab.state.timelineZoom),clearSpatial:!!tab.state.crop,clearDrawings:!!(tab.state.drawings.length||tab.state.redo.length||stroke)};
  for(const [id,enabled] of Object.entries(available)){$(id).checked=false;$(id).disabled=!enabled;}
  $('applyClearEdits').disabled=true;$('clearEdits').showModal();$('cancelClearEdits').focus();
}
for(const id of ['clearTemporal','clearSpatial','clearDrawings'])$(id).onchange=()=>{$('applyClearEdits').disabled=!['clearTemporal','clearSpatial','clearDrawings'].some(id=>$(id).checked);};
$('cancelClearEdits').onclick=()=>$('clearEdits').close('cancel');
$('clearEdits').querySelector('form').onsubmit=event=>{
  event.preventDefault();const tab=clearEditsTab;
  if(!tab||current()!==tab||$('applyClearEdits').disabled){$('clearEdits').close('cancel');return;}
  const s=tab.state;
  if($('clearTemporal').checked){s.in=s.out=null;s.timelineZoom=false;}
  if($('clearSpatial').checked){s.crop=null;s.cropVisible=false;}
  if($('clearDrawings').checked){cancelStroke();s.drawings=[];s.redo=[];s.drawingsSaved=false;}
  $('clearEdits').close('apply');layout();updateTimeline();syncPanels();redrawDrawings();persistSoon(true);
};
$('clearEdits').addEventListener('close',()=>{clearEditsTab=null;});
$('clearEdits').addEventListener('click',event=>{if(event.target!==$('clearEdits'))return;const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close('cancel');});
const clearEditsAction=runAction;runAction=function(action){if(action==='clearEdits')return openClearEdits();return clearEditsAction(action);};
const clearEditsPanelKeys=handlePanelKey;handlePanelKey=function(event){if(!$('clearEdits').open)return clearEditsPanelKeys(event);if(event.code==='Enter'){event.preventDefault();if(!$('applyClearEdits').disabled)$('clearEdits').querySelector('form').requestSubmit();}return true;};
