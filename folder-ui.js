'use strict';
// Local assets keep folder buttons identical without a runtime Windows dependency.
const FolderUI=Object.freeze({
  decorate(button,key,label,path){
    const icon=document.createElement('img'),text=document.createElement('span'),title=document.createElement('span'),detail=document.createElement('small');
    icon.className='folderIcon';icon.alt='';icon.src='assets/folders/'+(['downloads','video','audio','image'].includes(key)?key:'folder')+'.png';
    icon.onerror=()=>{icon.onerror=null;icon.src='assets/folders/folder.png';};
    text.className='folderText';title.textContent=label;detail.textContent=path;text.append(title,detail);button.append(icon,text);
  },
  closeButton(dialog){
    const button=document.createElement('button');button.type='button';button.className='dialogClose locationClose';
    button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
    button.onclick=()=>dialog.close('cancel');dialog.append(button);return button;
  },
  localize(){
    for(const button of document.querySelectorAll('.locationClose')){const label=document.documentElement.lang==='en'?'Close':'Zapri';button.title=label;button.setAttribute('aria-label',label);}
  }
});
