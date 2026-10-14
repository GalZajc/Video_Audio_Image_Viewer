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
  if(desc.querySelector('textarea'))return;
  const input=document.createElement('textarea');input.className='descriptionEditor';input.value=feature.text;input.oninput=()=>autoHeight(input);input.setAttribute('aria-label',`Besedilo zahtevka: ${feature.id}`);input.title='Samodejno shrani ob kliku drugam. Ctrl+Enter shrani, Escape prekliče.';
  desc.replaceChildren(input);let finished=false;
  function finish(cancel=false){if(finished)return;finished=true;const text=input.value.trim();if(!cancel&&text&&text!==feature.text){if(feature.custom)state.custom.find(item=>item.id===feature.id).text=text;else{const original=features.find(item=>item.id===feature.id).text;if(text===original)delete state.edits[feature.id];else state.edits[feature.id]=text;}markDirty();}render();}
  input.onclick=event=>event.stopPropagation();input.onkeydown=event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();finish(true);}else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();finish();}};input.onblur=()=>setTimeout(()=>finish(),0);autoHeight(input);input.focus();input.setSelectionRange(input.value.length,input.value.length);
}

function entry(id){return state.entries[id]||{status:'todo',notes:''};}
function nextPrompt(){
  const all=allFeatures().filter(f=>!state.archived.includes(f.id)),pass=all.filter(f=>entry(f.id).status==='pass'),fail=all.filter(f=>entry(f.id).status==='fail'),todo=all.filter(f=>entry(f.id).status==='todo'),assumed=all.filter(f=>entry(f.id).status==='assumed');
  const lines=['Popravi projekt Video Audio Image Viewer na podlagi mojega sistematičnega pregleda.','',`Pregled: ${pass.length} preverjeno deluje, ${fail.length} potrebuje popravek, ${assumed.length} verjetno deluje (nepreverjeno), ${todo.length} še ni preverjeno.`, 'Zadnje dogovorjene bližnjice: D = pohitritev, Ctrl+D = risanje, Ctrl+S = izvoz, Ctrl+Shift+←/→ = prehajanje po mapi.','', 'Popravki in nove zahteve:'];
  if(!fail.length)lines.push('Trenutno ni označenih popravkov. Ne sklepaj, da so nepreverjene funkcije že preverjene.');
  for(const f of fail){lines.push('',`- [${f.id}] ${f.group}: ${f.text}`,`  Moja opomba: ${noteText(f.id).trim()||'Opombe še nisem vpisal. Preveri opisano funkcijo; ob nejasnosti vprašaj.'}`);for(const s of entry(f.id).screenshots||[])lines.push(`  Screenshot: ${projectRoot}\\DATA\\review-screenshots\\${s.url.split('/').at(-1)} (${s.name})`);}
  if(pass.length){lines.push('','Preverjeno delujoče funkcije, ki naj še naprej delujejo:');for(const f of pass)lines.push(`- [${f.id}] ${f.text}`);}
  if(todo.length){lines.push('','Še nepreverjeno (to niso prijavljene napake):');for(const f of todo)lines.push(`- [${f.id}] ${f.text}`);}
  if(assumed.length){lines.push('','Verjetno deluje, vendar nisem preveril (to niso potrjeni uspehi ali prijavljene napake):');for(const f of assumed)lines.push(`- [${f.id}] ${f.text}${noteText(f.id)?' — '+noteText(f.id):''}`);}
  for(const f of all.filter(f=>entry(f.id).status!=='fail'))for(const s of entry(f.id).screenshots||[])lines.push(`Screenshot [${f.id}]: ${projectRoot}\\DATA\\review-screenshots\\${s.url.split('/').at(-1)} (${s.name})`);
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
        const button=document.createElement('button');button.type='button';button.className=className;button.innerHTML=statusIcon(value);button.setAttribute('aria-pressed',String(e.status===value));button.setAttribute('aria-label',`${label}: ${f.text}`);button.title=`${label} (ponovni klik odstrani oceno)`;button.onclick=()=>{state.entries[f.id]={...entry(f.id),status:entry(f.id).status===value?'todo':value};markDirty();render();};status.append(button);
      }
      status.append(archiveButton(f));top.append(desc,status);row.append(top);
      row.append(noteControls(f),screenshotControls(f));section.append(row);
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
function screenshotControls(feature){
  const box=document.createElement('div');box.className='screenshotControls';box.tabIndex=0;box.setAttribute('contenteditable','true');box.setAttribute('role','textbox');box.setAttribute('aria-label',`Prilepi screenshot: ${feature.text}`);const button=document.createElement('button');button.className='upload';button.textContent='Prilepi screenshot';button.contentEditable='false';button.onclick=()=>{box.focus();message.textContent='Ctrl+V ali Win+V — prilepi sliko iz odložišča';};const message=document.createElement('span');message.className='uploadStatus';message.contentEditable='false';
  async function upload(files){button.disabled=true;try{for(const file of files){if((entry(feature.id).screenshots||[]).length>=20)throw new Error('Največ 20 slik na vrstico.');if(file.size>12582912)throw new Error('Največ 12 MB na sliko.');const response=await fetch('/api/screenshot',{method:'POST',headers:{'Content-Type':file.type,'X-Review-Token':token},body:file});const result=await response.json();if(!response.ok)throw new Error(result.error);const e=entry(feature.id);state.entries[feature.id]={...e,screenshots:[...(e.screenshots||[]),{url:result.url,name:file.name}]};markDirty();await saveNow();}render();}catch(error){message.textContent=error.message;}finally{button.disabled=false;}}
  box._upload=upload;box.append(button,message);
  for(const s of entry(feature.id).screenshots||[]){const item=document.createElement('span');item.className='screenshot';item.contentEditable='false';const link=document.createElement('a'),img=document.createElement('img');link.href=s.url;link.target='_blank';link.rel='noopener';img.src=s.url;img.alt=s.name;img.title=s.name;link.append(img);const remove=document.createElement('button');remove.textContent='×';remove.title='Odstrani priloženo sliko';remove.onclick=()=>{state.entries[feature.id]={...entry(feature.id),screenshots:entry(feature.id).screenshots.filter(a=>a.url!==s.url)};markDirty();render();};item.append(link,remove);box.append(item);}
  box.addEventListener('beforeinput',event=>event.preventDefault());return box;
}

function noteText(id){const e=entry(id);return [...(e.notesHistory||[]),e.notes].filter(Boolean).map((text,i)=>`Opomba ${i+1}: ${text}`).join('\n');}
function autoHeight(input){input.style.height='auto';input.style.height=input.scrollHeight+2+'px';}
function noteControls(f){const e=entry(f.id),box=document.createElement('div');box.className='noteControls';
  for(const [i,text] of (e.notesHistory||[]).entries()){const label=document.createElement('div');label.className='noteLabel';label.textContent=`Opomba ${i+1}`;const old=document.createElement('textarea');old.className='notes oldNote';old.value=text;old.readOnly=true;old.setAttribute('aria-label',`Prejšnja opomba ${i+1}: ${f.text}`);box.append(label,old);}
  let input=document.createElement('textarea');input.className='notes';input.value=e.notes;input.hidden=e.status!=='fail'&&!e.notes&&!e.notesHistory?.length;input.placeholder='Kaj je treba popraviti? Kaj se zgodi in kaj pričakuješ?';input.setAttribute('aria-label',`Opomba: ${f.text}`);input.oninput=()=>{state.entries[f.id]={...entry(f.id),notes:input.value};autoHeight(input);markDirty();};
  if(!input.hidden){const label=document.createElement('div');label.className='noteLabel';label.textContent=`Opomba ${(e.notesHistory||[]).length+1}`;box.append(label);}box.append(input);
  if(e.status==='fail'||e.notes||e.notesHistory?.length){const add=document.createElement('button');add.type='button';add.className='newNote';add.textContent='Nova opomba';add.onpointerdown=event=>event.preventDefault();add.onclick=()=>{
    const now=entry(f.id);if(!now.notes.trim())return;
    const scroll=window.scrollY,containers=[];for(let node=box.parentElement;node;node=node.parentElement)if(node.scrollHeight>node.clientHeight)containers.push({node,top:node.scrollTop,left:node.scrollLeft});
    const restore=()=>{for(const position of containers){position.node.scrollTop=position.top;position.node.scrollLeft=position.left;}window.scrollTo({top:scroll,behavior:'instant'});};
    box.dataset.scrollBefore=scroll;input.blur();state.entries[f.id]={...now,notesHistory:[...(now.notesHistory||[]),now.notes],notes:''};
    // Keep every existing row and textarea in place: replacing the list collapses its
    // height and clamps the browser's scroll position before textarea sizing finishes.
    const label=document.createElement('div');label.className='noteLabel';label.textContent=`Opomba ${(now.notesHistory||[]).length+2}`;
    const next=document.createElement('textarea');next.className='notes';next.placeholder=input.placeholder;next.setAttribute('aria-label',input.getAttribute('aria-label'));
    next.oninput=()=>{state.entries[f.id]={...entry(f.id),notes:next.value};autoHeight(next);markDirty();};
    input.readOnly=true;input.classList.add('oldNote');input.setAttribute('aria-label',`Prejšnja opomba ${(now.notesHistory||[]).length+1}: ${f.text}`);
    box.insertBefore(label,add);box.insertBefore(next,add);autoHeight(next);markDirty();
    // Keep focus on the clicked control. A focused textarea's caret can cause
    // Chromium to scroll again after a resize, even after focus(preventScroll).
    add.focus({preventScroll:true});restore();input=next;requestAnimationFrame(()=>{restore();requestAnimationFrame(restore);});
  };box.append(add);}
  return box;
}
document.addEventListener('paste',event=>{const files=[...(event.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;const row=event.target.closest('.feature')||document.activeElement?.closest('.feature'),box=row?.querySelector('.screenshotControls');if(box?._upload){event.preventDefault();box._upload(files);}});
$('newRequest').onclick=()=>{$('newFeatureDialog').showModal();$('newFeature').focus();};$('cancelNewFeature').onclick=()=>$('newFeatureDialog').close();
$('newFeatureDialog').addEventListener('click',event=>{if(event.target===$('newFeatureDialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
let reviewWidth=0;new ResizeObserver(()=>{if(reviewWidth!==document.body.clientWidth){reviewWidth=document.body.clientWidth;document.querySelectorAll('.notes,.descriptionEditor').forEach(autoHeight);}}).observe(document.body);

$('search').oninput=render;$('filter').onchange=render;
$('add').onclick=()=>{const text=$('newFeature').value.trim();if(!text)return;const id='custom-'+crypto.randomUUID();state.custom.push({id,text});state.entries[id]={status:'fail',notes:''};$('newFeature').value='';$('newFeatureDialog').close();$('search').value='';$('filter').value='all';markDirty();render();document.querySelector(`[data-id="${id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});};
$('copy').onclick=async()=>{await saveNow();try{await navigator.clipboard.writeText(nextPrompt());$('copy').textContent='Zkopirano ✓';setTimeout(()=>$('copy').textContent='Kopiraj naslednji prompt',1800);}catch{$('promptDetails').open=true;$('prompt').focus();$('prompt').select();}};
$('download').onclick=async()=>{await saveNow();download('Video Audio Image Viewer - naslednji prompt.md',nextPrompt(),'text/markdown;charset=utf-8');};
$('backup').onclick=()=>download('Video Audio Image Viewer - pregled.json',JSON.stringify({schemaVersion:1,state,features:allFeatures(),prompt:nextPrompt()},null,2),'application/json;charset=utf-8');
window.addEventListener('beforeunload',()=>{if(revision!==savedRevision)fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,state,prompt:nextPrompt()}),keepalive:true}).catch(()=>{});});
window.addEventListener('online',()=>{if(revision!==savedRevision)saveNow();});
async function init(){try{const [manifest,response]=await Promise.all([fetch('/review/features.json'),fetch('/api/review')]);if(!manifest.ok||!response.ok)throw new Error('Pregleda ni mogoče naložiti.');const groups=await manifest.json(),saved=await response.json();features=groups.flatMap(group=>group.items.map(([id,text])=>({id,text,group:group.group})));state=saved.state;state.edits ||= {};state.archived ||= [];for(const e of Object.values(state.entries)){const parts=e.notes.split(/\s*NOVA OPOMBA\s*:\s*/i);if(parts.length>1){e.notesHistory=[...(e.notesHistory||[]),...parts.slice(0,-1).map(n=>n.trim()).filter(Boolean)];e.notes=parts.at(-1).trim();}}const customGroups={'custom-cf93b431-9e4e-4ab2-8e12-fbe9bba2607c':'Risanje, barve, puščice in besedilo','custom-d8c44dbf-b856-4160-ac1d-566da7e2f82b':'Windows, projekt in ikona','custom-17e06e2e-bcc5-4bd4-8d11-5f10bb919c6e':'Izvoz in kakovost','custom-27eb2fd2-449f-4e4f-8739-fc05fbf5ca87':'Ta pregledna stran','custom-faf0e986-46bf-4ee8-9c71-f55af489b064':'Ta pregledna stran','custom-da6b440d-53ed-418f-bb4b-e4f1f3d59c08':'Ta pregledna stran','custom-b96e7dac-933b-4e91-a2d4-46b3a1586f63':'Esc, velikost okna in fullscreen','custom-5a5daa7b-241a-45bc-ad79-d90d7ffdfb4a':'Risanje, barve, puščice in besedilo','custom-5da07858-46c2-4f4c-9adc-5ddedc508735':'Predvajanje','custom-51d6c2a7-b767-4d93-9c78-dfbed30a7cd6':'Časovni interval in časovnica','custom-45f566fe-31d9-43bb-9658-1dde313bbdbc':'Zavihki in zgodovina','custom-85644484-98e5-43ad-bb74-80ca865234be':'Predvajanje'};for(const f of state.custom)if(customGroups[f.id])f.group=customGroups[f.id];token=saved.token;projectRoot=saved.project||'';saveDelay=saved.saveDelayMs;document.body.classList.remove('loading');render();$('save').textContent='Samodejno shranjevanje vključeno';await saveNow();}catch(error){$('save').className='error';$('save').textContent=error.message;}}
init();
