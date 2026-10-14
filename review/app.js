'use strict';
const $=id=>document.getElementById(id);
let features=[],state={entries:{},custom:[]},token='',projectRoot='',timer,queue=Promise.resolve(),revision=0,savedRevision=0,saveDelay=350;
document.body.classList.add('loading');
function allFeatures(){const groupOrder=[...new Set(features.map(item=>item.group))];return [...features,...state.custom.map(item=>({...item,group:item.group||'Dodatne zahteve',custom:true}))].map(item=>({...item,text:state.edits?.[item.id]||item.text})).sort((a,b)=>(groupOrder.indexOf(a.group)<0?groupOrder.length:groupOrder.indexOf(a.group))-(groupOrder.indexOf(b.group)<0?groupOrder.length:groupOrder.indexOf(b.group)));}

function statusIcon(value){
  const shape=value==='pass'?'<path d="M4 12 L10 18 L20 6"/>':value==='fail'?'<path d="M5 5 L19 19 M19 5 L5 19"/>':'<circle cx="12" cy="12" r="9"/>';
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
}
function editDescription(desc,feature){
  if(desc.querySelector('.descriptionEditor'))return;
  const input=document.createElement('div');input.className='descriptionEditor';input.contentEditable='plaintext-only';input.textContent=feature.text;input.setAttribute('role','textbox');input.setAttribute('aria-label',`Besedilo zahtevka: ${feature.id}`);input.title='Klik drugam ali Ctrl+Enter shrani; Escape prekliče.';
  desc.replaceChildren(input);let finished=false;
  function finish(cancel=false){if(finished)return;finished=true;const text=input.innerText.trim();if(!cancel&&text&&text!==feature.text){if(feature.custom)state.custom.find(item=>item.id===feature.id).text=text;else{const original=features.find(item=>item.id===feature.id).text;if(text===original)delete state.edits[feature.id];else state.edits[feature.id]=text;}feature.text=text;markDirty();}desc.textContent=feature.text;const id=document.createElement('span');id.className='id';id.textContent=feature.id+(feature.custom?' · nova zahteva':'');desc.append(id);}
  input.onclick=event=>event.stopPropagation();input.onkeydown=event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();finish(true);}else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();finish();}};input.onblur=()=>finish();input.focus({preventScroll:true});
}

function entry(id){return state.entries[id]||{status:'todo',notes:''};}
function nextPrompt(){
  const all=allFeatures().filter(f=>!state.archived.includes(f.id)),pass=all.filter(f=>entry(f.id).status==='pass'),fail=all.filter(f=>entry(f.id).status==='fail'),todo=all.filter(f=>entry(f.id).status==='todo'),assumed=all.filter(f=>entry(f.id).status==='assumed');
  const lines=['Popravi projekt Video Audio Image Viewer na podlagi mojega sistematičnega pregleda.','',`Pregled: ${pass.length} preverjeno deluje, ${fail.length} potrebuje popravek, ${assumed.length} verjetno deluje (nepreverjeno), ${todo.length} še ni preverjeno.`, 'Zadnje dogovorjene bližnjice: D = pohitritev, Ctrl+D = risanje, Ctrl+S = izvoz, Ctrl+Shift+←/→ = prehajanje po mapi.','', 'Popravki in nove zahteve:'];
  if(!fail.length)lines.push('Trenutno ni označenih popravkov. Ne sklepaj, da so nepreverjene funkcije že preverjene.');
  for(const f of fail){lines.push('',`- [${f.id}] ${f.group}: ${f.text}`,`  Moja opomba: ${noteText(f.id).trim()||'Opombe še nisem vpisal. Preveri opisano funkcijo; ob nejasnosti vprašaj.'}`);for(const s of entry(f.id).screenshots||[])lines.push(`  Screenshot [${s.phase==='note'?'Opomba '+(s.note+1):'Osnovna zahteva'}]: ${projectRoot}\\DATA\\review-screenshots\\${s.url.split('/').at(-1)} (${s.name})`);}
  if(pass.length){lines.push('','Preverjeno delujoče funkcije, ki naj še naprej delujejo:');for(const f of pass)lines.push(`- [${f.id}] ${f.text}`);}
  if(todo.length){lines.push('','Še nepreverjeno (to niso prijavljene napake):');for(const f of todo)lines.push(`- [${f.id}] ${f.text}`);}
  if(assumed.length){lines.push('','Verjetno deluje, vendar nisem preveril (to niso potrjeni uspehi ali prijavljene napake):');for(const f of assumed)lines.push(`- [${f.id}] ${f.text}${noteText(f.id)?' — '+noteText(f.id):''}`);}
  for(const f of all.filter(f=>entry(f.id).status!=='fail'))for(const s of entry(f.id).screenshots||[])lines.push(`Screenshot [${f.id}; ${s.phase==='note'?'Opomba '+(s.note+1):'Osnovna zahteva'}]: ${projectRoot}\\DATA\\review-screenshots\\${s.url.split('/').at(-1)} (${s.name})`);
  const archived=allFeatures().filter(f=>state.archived.includes(f.id));if(archived.length){lines.push('','Arhivirane oziroma odstranjene zahteve (niso aktivne; ne vračaj jih brez mojega naročila):');for(const f of archived)lines.push(`- [${f.id}] ${f.group}: ${f.text}`);}
  lines.push('','Ocene in opombe so shranjene v projektni datoteki DATA/review.json. Upoštevaj jih skupaj s prejšnjimi dogovori iz chata.');return lines.join('\n');
}
function updateSummary(){$('prompt').value=nextPrompt();}
function markDirty(){revision++;$('save').className='';$('save').textContent='Shranjevanje …';clearTimeout(timer);timer=setTimeout(()=>saveNow(),saveDelay);updateSummary();}
function saveNow(){clearTimeout(timer);const thisRevision=revision,payload=JSON.stringify({token,state,prompt:nextPrompt()});queue=queue.catch(()=>{}).then(async()=>{try{const response=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:payload});if(!response.ok)throw new Error(await response.text());savedRevision=Math.max(savedRevision,thisRevision);if(savedRevision===revision){$('save').className='';$('save').textContent='Samodejno shranjeno';}return true;}catch(error){$('save').className='error';$('save').textContent='Ni shranjeno — preveri povezavo. Shrani tabelo .json.';return false;}});return queue;}
function archiveButton(feature,restore=false){
  const button=document.createElement('button');button.type='button';button.className='archiveButton';button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6 H20 M9 6 V3 H15 V6 M6 6 L7 21 H17 L18 6 M10 10 V17 M14 10 V17"/>${restore?'<path d="M3 3 L21 21"/>':''}</svg>`;
  button.title=restore?'Povrni zahtevek iz arhiva':'Premakni zahtevek v arhiv';button.setAttribute('aria-label',`${restore?'Povrni':'Arhiviraj'}: ${feature.text}`);
  button.onclick=()=>{
    if(restore){state.archived=state.archived.filter(id=>id!==feature.id);if($('filter').value!=='all'&&$('filter').value!==entry(feature.id).status)$('filter').value='all';}
    else if(!state.archived.includes(feature.id))state.archived.push(feature.id);
    markDirty();render();
    if(restore){const row=document.querySelector(`#list [data-id="${feature.id}"]`);row?.scrollIntoView({block:'center',behavior:'instant'});row?.querySelector('.description')?.focus({preventScroll:true});}
  };return button;
}
function render(){
  const scroll=window.scrollY,query=$('search').value.toLocaleLowerCase('sl'),filter=$('filter').value,list=$('list');
  // Keep the document tall while rebuilding status/filter rows. A focused caret
  // otherwise forces layout before deferred textarea sizing and clamps scroll.
  list.style.minHeight=list.scrollHeight+'px';list.replaceChildren();const groups=new Map();const matches=f=>!query||`${f.text} ${f.group} ${noteText(f.id)} ${f.id}`.toLocaleLowerCase('sl').includes(query);
  for(const f of allFeatures()){const e=entry(f.id);if(state.archived.includes(f.id)||!matches(f)||(filter!=='all'&&e.status!==filter))continue;if(!groups.has(f.group))groups.set(f.group,[]);groups.get(f.group).push(f);}
  for(const [group,rows] of groups){
    const section=document.createElement('section'),heading=document.createElement('h2');heading.textContent=group;section.append(heading);
    for(const f of rows){
      const e=entry(f.id),row=document.createElement('div');row.className=`feature ${e.status}`;row.dataset.id=f.id;
      const top=document.createElement('div');top.className='featureTop';const desc=document.createElement('div');desc.className='description';desc.textContent=f.text;
      const id=document.createElement('span');id.className='id';id.textContent=f.id+(f.custom?' · nova zahteva':'');desc.append(id);desc.tabIndex=0;desc.title='Klikni za urejanje zahtevka';desc.setAttribute('role','button');desc.setAttribute('aria-label',`Uredi zahtevek: ${f.text}`);desc.onclick=()=>editDescription(desc,f);desc.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();editDescription(desc,f);}};
      const status=document.createElement('div');status.className='status';
      for(const [value,className,label] of [['pass','yes','Deluje'],['assumed','assumed','Nisem preveril, verjetno deluje'],['fail','no','Za popraviti']]){
        const button=document.createElement('button');button.type='button';button.className=className;button.innerHTML=statusIcon(value);button.setAttribute('aria-pressed',String(e.status===value));button.setAttribute('aria-label',`${label}: ${f.text}`);button.title=`${label} (ponovni klik odstrani oceno)`;button.onclick=()=>{state.entries[f.id]={...entry(f.id),status:entry(f.id).status===value?'todo':value};markDirty();row.className='feature '+entry(f.id).status;for(const control of status.querySelectorAll('button[data-state]'))control.setAttribute('aria-pressed',String(control.dataset.state===entry(f.id).status));const phase=row.querySelector('.notePhase.currentNote');if(phase)phase.hidden=entry(f.id).status!=='fail'&&!entry(f.id).notes&&!entry(f.id).notesHistory?.length&&!ReviewModel.images(entry(f.id),'note',entry(f.id).notesHistory?.length||0).length;const add=row.querySelector('.newNote');if(add&&phase)add.hidden=phase.hidden;};button.dataset.state=value;status.append(button);
      }
      status.append(archiveButton(f));top.append(desc,status);row.append(top);
      row.append(phaseImages(f,'base'),noteControls(f));section.append(row);
    }
    list.append(section);
  }
  if(!groups.size){const empty=document.createElement('div');empty.className='empty';empty.textContent='Ni funkcij za izbrani filter.';list.append(empty);}
  const archive=$('archiveList');archive.replaceChildren();
  for(const id of state.archived){const f=allFeatures().find(item=>item.id===id);if(!f||!matches(f))continue;const row=document.createElement('div');row.className='feature archived';row.dataset.id=f.id;const top=document.createElement('div');top.className='featureTop';const desc=document.createElement('div');desc.className='description';desc.textContent=f.text;const group=document.createElement('span');group.className='id';group.textContent=f.group;desc.append(group);const status=document.createElement('div');status.className='status';status.append(archiveButton(f,true));top.append(desc,status);row.append(top);archive.append(row);}
  if(!archive.children.length){const empty=document.createElement('div');empty.className='feature archiveEmpty';empty.textContent=state.archived.length?'Ni arhiviranih zahtevkov za to iskanje.':'Arhiv je prazen.';archive.append(empty);}
  updateSummary();document.querySelectorAll('.notes,.descriptionEditor').forEach(autoHeight);list.style.minHeight='';window.scrollTo({top:scroll,behavior:'instant'});
}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function phaseImages(feature,phase,note){
 const box=document.createElement('div');box.className='phaseImages';box.dataset.phase=phase;if(phase==='note')box.dataset.note=note;
 function refresh(){box.replaceChildren();for(const s of ReviewModel.images(entry(feature.id),phase,note)){const item=document.createElement('span');item.className='screenshot';const link=document.createElement('a'),img=document.createElement('img');link.href=s.url;link.target='_blank';link.rel='noopener';img.src=s.url;img.alt=s.name;img.title=s.name;link.append(img);const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Odstrani priloženo sliko';remove.onclick=()=>{const e=entry(feature.id);state.entries[feature.id]={...e,screenshots:e.screenshots.filter(image=>image!==s)};markDirty();refresh();};item.append(link,remove);box.append(item);}}
 async function upload(files){try{for(const file of files){if((entry(feature.id).screenshots||[]).length>=20)throw Error('Največ 20 slik na zahtevek.');if(file.size>12582912)throw Error('Največ 12 MB na sliko.');const response=await fetch('/api/screenshot',{method:'POST',headers:{'Content-Type':file.type,'X-Review-Token':token},body:file});const result=await response.json();if(!response.ok)throw Error(result.error);const e=entry(feature.id);state.entries[feature.id]={...e,screenshots:[...(e.screenshots||[]),{url:result.url,name:file.name,phase,...(phase==='note'?{note}:{})}]};markDirty();refresh();await saveNow();}}catch(error){const message=document.createElement('span');message.className='uploadStatus';message.textContent=error.message;box.append(message);}}
 box._upload=upload;refresh();return box;
}
function noteText(id){const e=entry(id);return [...(e.notesHistory||[]),e.notes].map((text,i)=>text?`Opomba ${i+1}: ${text}`:'').filter(Boolean).join('\n');}
function autoHeight(input){if(input.tagName!=='TEXTAREA')return;input.style.height='auto';input.style.height=input.scrollHeight+2+'px';}
function noteControls(f){
 const e=entry(f.id),box=document.createElement('div');box.className='noteControls';
 function phase(text,index,old){const wrapper=document.createElement('div');wrapper.className='notePhase'+(old?'':' currentNote');wrapper.dataset.note=index;const label=document.createElement('div');label.className='noteLabel';label.textContent=`Opomba ${index+1}`;const editor=document.createElement('div');editor.className='notes'+(old?' oldNote':'');editor.textContent=text;editor.contentEditable=old?'false':'plaintext-only';editor.tabIndex=0;editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label',`${old?'Prejšnja opomba '+(index+1):'Opomba'}: ${f.text}`);editor.dataset.placeholder='Kaj je treba popraviti? Kaj se zgodi in kaj pričakuješ?';if(old)editor.setAttribute('readonly','');else editor.oninput=()=>{state.entries[f.id]={...entry(f.id),notes:editor.innerText.replace(/\r/g,'')};markDirty();};wrapper.append(label,editor,phaseImages(f,'note',index));return wrapper;}
 for(const [index,text] of (e.notesHistory||[]).entries())box.append(phase(text,index,true));
 let current=phase(e.notes,e.notesHistory?.length||0,false);current.hidden=e.status!=='fail'&&!e.notes&&!e.notesHistory?.length&&!ReviewModel.images(e,'note',e.notesHistory?.length||0).length;box.append(current);
 const add=document.createElement('button');add.type='button';add.className='newNote';add.textContent='Nova opomba';add.hidden=current.hidden;
 add.onpointerdown=event=>event.preventDefault();add.onclick=()=>{
  const now=entry(f.id),index=now.notesHistory?.length||0;if(!now.notes.trim()&&!ReviewModel.images(now,'note',index).length)return;
  const scroll=window.scrollY;box.dataset.scrollBefore=scroll;document.activeElement?.blur();
  state.entries[f.id]={...now,notesHistory:[...(now.notesHistory||[]),now.notes],notes:''};current.classList.remove('currentNote');const old=current.querySelector('.notes');old.contentEditable='false';old.setAttribute('readonly','');old.classList.add('oldNote');old.setAttribute('aria-label',`Prejšnja opomba ${index+1}: ${f.text}`);old.oninput=null;
  current=phase('',index+1,false);box.insertBefore(current,add);markDirty();add.focus({preventScroll:true});window.scrollTo({top:scroll,behavior:'instant'});
 };box.append(add);return box;
}
document.addEventListener('paste',event=>{
 const files=[...(event.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;
 if(event.target.id==='newFeature'){event.preventDefault();uploadDraftImages(files);return;}
 const row=event.target.closest('.feature')||document.activeElement?.closest('.feature'),phase=event.target.closest('.notePhase')||document.activeElement?.closest('.notePhase'),box=phase?.querySelector('.phaseImages')||row?.querySelector('.phaseImages[data-phase="base"]');if(box?._upload){event.preventDefault();box._upload(files);}
});
let draftImages=[],draftGeneration=0;
async function uploadDraftImages(files){const generation=draftGeneration;$('add').disabled=true;try{for(const file of files){if(file.size>12582912)throw Error('Največ 12 MB na sliko.');if(draftImages.length>=20)throw Error('Največ 20 slik na zahtevek.');const response=await fetch('/api/screenshot',{method:'POST',headers:{'Content-Type':file.type,'X-Review-Token':token},body:file}),result=await response.json();if(!response.ok)throw Error(result.error);if(generation!==draftGeneration||!$('newFeatureDialog').open)return;const image={url:result.url,name:file.name,phase:'base'};draftImages.push(image);const item=document.createElement('span');item.className='screenshot';const img=document.createElement('img');img.src=image.url;img.alt=image.name;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.onclick=()=>{draftImages=draftImages.filter(s=>s!==image);item.remove();};item.append(img,remove);$('newFeatureImages').append(item);}}catch(error){const message=document.createElement('span');message.className='uploadStatus';message.textContent=error.message;$('newFeatureImages').append(message);}finally{if(generation===draftGeneration)$('add').disabled=false;}}
$('newRequest').onclick=()=>{draftGeneration++;draftImages=[];$('newFeatureImages').replaceChildren();$('add').disabled=false;$('newFeatureDialog').showModal();$('newFeature').focus();};$('cancelNewFeature').onclick=()=>$('newFeatureDialog').close();
$('newFeatureDialog').addEventListener('click',event=>{if(event.target===$('newFeatureDialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});


$('search').oninput=render;$('filter').onchange=render;
$('add').onclick=()=>{const text=$('newFeature').value.trim();if(!text)return;const id='custom-'+crypto.randomUUID();state.custom.push({id,text});state.entries[id]={status:'fail',notes:'',screenshots:[...draftImages]};draftImages=[];$('newFeature').value='';$('newFeatureDialog').close();$('search').value='';$('filter').value='all';markDirty();render();document.querySelector(`[data-id="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});};
$('copy').onclick=async()=>{await saveNow();try{await navigator.clipboard.writeText(nextPrompt());$('copy').textContent='Zkopirano ✓';setTimeout(()=>$('copy').textContent='Kopiraj naslednji prompt',1800);}catch{$('promptDetails').open=true;$('prompt').focus();$('prompt').select();}};
$('download').onclick=async()=>{await saveNow();download('Video Audio Image Viewer - naslednji prompt.md',nextPrompt(),'text/markdown;charset=utf-8');};
$('backup').onclick=()=>download('Video Audio Image Viewer - pregled.json',JSON.stringify({schemaVersion:1,state,features:allFeatures(),prompt:nextPrompt()},null,2),'application/json;charset=utf-8');
window.addEventListener('beforeunload',()=>{if(revision!==savedRevision)fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,state,prompt:nextPrompt()}),keepalive:true}).catch(()=>{});});
window.addEventListener('online',()=>{if(revision!==savedRevision)saveNow();});
async function init(){try{const [manifest,response]=await Promise.all([fetch('/review/features.json'),fetch('/api/review')]);if(!manifest.ok||!response.ok)throw new Error('Pregleda ni mogoče naložiti.');const groups=await manifest.json(),saved=await response.json();features=groups.flatMap(group=>group.items.map(([id,text])=>({id,text,group:group.group})));state=saved.state;state.edits ||= {};state.archived ||= [];for(const e of Object.values(state.entries)){const parts=e.notes.split(/\s*NOVA OPOMBA\s*:\s*/i);if(parts.length>1){e.notesHistory=[...(e.notesHistory||[]),...parts.slice(0,-1).map(n=>n.trim()).filter(Boolean)];e.notes=parts.at(-1).trim();}}const customGroups={'custom-29f45e2e-2d73-45ab-8fc2-779813ca9816':'Ta pregledna stran','custom-cf93b431-9e4e-4ab2-8e12-fbe9bba2607c':'Risanje, barve, puščice in besedilo','custom-d8c44dbf-b856-4160-ac1d-566da7e2f82b':'Windows, projekt in ikona','custom-17e06e2e-bcc5-4bd4-8d11-5f10bb919c6e':'Izvoz in kakovost','custom-27eb2fd2-449f-4e4f-8739-fc05fbf5ca87':'Ta pregledna stran','custom-faf0e986-46bf-4ee8-9c71-f55af489b064':'Ta pregledna stran','custom-da6b440d-53ed-418f-bb4b-e4f1f3d59c08':'Ta pregledna stran','custom-b96e7dac-933b-4e91-a2d4-46b3a1586f63':'Esc, velikost okna in fullscreen','custom-5a5daa7b-241a-45bc-ad79-d90d7ffdfb4a':'Risanje, barve, puščice in besedilo','custom-5da07858-46c2-4f4c-9adc-5ddedc508735':'Predvajanje','custom-51d6c2a7-b767-4d93-9c78-dfbed30a7cd6':'Časovni interval in časovnica','custom-45f566fe-31d9-43bb-9658-1dde313bbdbc':'Zavihki in zgodovina','custom-85644484-98e5-43ad-bb74-80ca865234be':'Predvajanje'};for(const f of state.custom)if(customGroups[f.id])f.group=customGroups[f.id];token=saved.token;projectRoot=saved.project||'';saveDelay=saved.saveDelayMs;document.body.classList.remove('loading');render();$('save').textContent='Samodejno shranjevanje vključeno';await saveNow();}catch(error){$('save').className='error';$('save').textContent=error.message;}}
init();
