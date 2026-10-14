'use strict';
const $=id=>document.getElementById(id),C=Core,kind=new URLSearchParams(location.search).get('kind');
let config,options,scale=1,language='sl',shortcuts={},edit=null,colorKey='',colorControls=[],ownerId=null,tabId=null;
const parameters=new Map(),tr=(sl,en)=>language==='en'?en:sl;
$('drawPanel').hidden=kind!=='palette';$('colorPanel').hidden=kind!=='color';
function color(tool=options.tool||'line'){return tool==='line'?options:options.colors[tool];}
function cssColor(tool){const o=color(tool);return `rgba(${Visual.hsv(o.hue,o.saturation,o.brightness).map(Math.round).join(',')},${o.alpha})`;}
function send(value){window.tools.command({...value,ownerId,tabId});}
function range(key){return options.ranges?.[key]||{min:key.startsWith('curveWavelength')?0:key==='fontSize'?1:.1,max:['arrowPersistence','arrowMinWavelength'].includes(key)||key.startsWith('curveWavelength')?500:100};}
for(const node of document.querySelectorAll('[data-tool="arrow"] .parameter'))$('openArrowParameters').append(node.cloneNode(true));
for(const [tool,key] of [['line','curveWavelengthLine'],['arrow','curveWavelengthArrow'],['arrowOpen','curveWavelengthOpen']]){
 const node=document.createElement('div');node.className='parameter';node.dataset.key=key;node.dataset.labelSl='Glajenje — najkrajša valovna dolžina (px)';node.dataset.labelEn='Smoothing — minimum wavelength (px)';document.querySelector(`[data-tool="${tool}"] .toolOptions`).append(node);
}
const baseOption=document.createElement('label');baseOption.className='optionRow baseDirectionOption';baseOption.innerHTML='<input id="arrowBaseDirection" type="checkbox"><span data-sl="Smer konice pri osnovnici" data-en="Head direction at the base"></span>';document.querySelector('[data-tool="arrow"] .toolOptions').append(baseOption);
for(const node of document.querySelectorAll('.parameter')){
 const key=node.dataset.key,header=document.createElement('div'),track=document.createElement('div'),min=document.createElement('button'),max=document.createElement('button'),slider=document.createElement('input');
 header.className='parameterHeader';track.className='parameterTrack';slider.type='range';slider.step=.1;
 for(const [button,side] of [[min,'min'],[max,'max']]){button.className='parameterEndpoint';button.type='button';button.onclick=()=>openValue(key,side,node);}
 slider.ondblclick=e=>{const r=slider.getBoundingClientRect(),x=r.left+6+(r.width-12)*(Number(slider.value)-Number(slider.min))/(Number(slider.max)-Number(slider.min));if(Math.abs(e.clientX-x)<=14)openValue(key,'value',node);};
 slider.oninput=()=>{options[key]=Number(slider.value);send({action:'parameter',key,value:options[key]});paintPreview();};
 track.append(min,slider,max);node.replaceChildren(header,track);if(!parameters.has(key))parameters.set(key,[]);parameters.get(key).push({node,header,min,max,slider});
}
function openValue(key,side,node){
 edit={key,side};const r=range(key);$('parameterRangeTitle').textContent=tr(side==='min'?'Od — ':side==='max'?'Do — ':'Vrednost — ',side==='min'?'From — ':side==='max'?'To — ':'Value — ')+tr(node.dataset.labelSl,node.dataset.labelEn);
 $('parameterMin').closest('label').hidden=side==='max';$('parameterMax').closest('label').hidden=side!=='max';$('parameterMin').value=side==='value'?options[key]:r.min;$('parameterMax').value=r.max;
 $('parameterMin').closest('label').querySelector('span').textContent=tr(side==='value'?'Vrednost':'Od',side==='value'?'Value':'From');$('parameterMax').closest('label').querySelector('span').textContent=tr('Do','To');
 $('parameterRange').returnValue='cancel';$('parameterRange').showModal();const input=$(side==='max'?'parameterMax':'parameterMin');input.focus();input.select();
}
$('cancelParameterRange').onclick=()=>$('parameterRange').close('cancel');
$('parameterRange').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&event.target.matches('input')){event.preventDefault();if(event.target.form.checkValidity())$('parameterRange').close('apply');}});
$('parameterRange').addEventListener('close',()=>{
 if($('parameterRange').returnValue!=='apply'||!edit)return;const {key,side}=edit,old=range(key),v=Number($(side==='max'?'parameterMax':'parameterMin').value),r={min:side==='min'?v:old.min,max:side==='max'?v:old.max};
 if(!Number.isFinite(v)||r.min<(key.startsWith('curveWavelength')?0:.000001)||r.max<=r.min||r.max>10000||side==='value'&&(v<r.min||v>r.max))return;
 options.ranges||={};options.ranges[key]=r;options[key]=C.clamp(side==='value'?v:options[key],r.min,r.max);send({action:'parameter',key,value:options[key],range:r});render();
});
$('parameterRange').addEventListener('close',()=>{document.activeElement?.blur();});
for(const row of document.querySelectorAll('.toolRow'))row.querySelector('.toolIcon').onclick=()=>send({action:'tool',tool:row.dataset.tool});
for(const [id,key] of [['textBold','bold'],['textItalic','italic'],['eraserPreview','eraserPreview']])$(id).onclick=()=>send({action:'option',key,value:!options[key]});
$('fontFamily').onchange=()=>send({action:'option',key:'font',value:$('fontFamily').value});
$('arrowBaseDirection').onchange=()=>send({action:'option',key:'arrowBaseDirection',value:$('arrowBaseDirection').checked});
function resizeSurface(){
 const panel=$(kind==='palette'?'drawPanel':'colorPanel'),main=document.querySelector('main'),style=getComputedStyle(main),height=$('windowGrip').offsetHeight+panel.getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
 window.tools.size(height);
}
function paintPreview(){
 if(!options)return;const canvas=$('toolPreview'),tool=options.tool||'line';if(canvas.clientWidth&&canvas.width!==canvas.clientWidth)canvas.width=canvas.clientWidth;if(canvas.clientHeight&&canvas.height!==canvas.clientHeight)canvas.height=canvas.clientHeight;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 if(tool==='eraser'){ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,options.eraserWidth*scale/2,0,Math.PI*2);ctx.strokeStyle=cssColor(tool);ctx.lineWidth=1;ctx.stroke();return;}
 if(tool==='text'){ctx.save();ctx.translate(8,8);ctx.scale(scale,scale);Visual.draw(ctx,{kind:'text',x:0,y:0,boxWidth:10000,text:'ABC\nabc',font:options.font,fontSize:options.fontSize,bold:options.bold,italic:options.italic,color:cssColor(tool)});ctx.restore();return;}
 const arrow=['arrow','arrowOpen'].includes(tool),width=arrow?(options.arrowLineWidth||options.width):options.width;
 const points=Array.from({length:65},(_,i)=>{const t=i/64;return {x:(18+(canvas.width-44)*t)/scale,y:(64-28*Math.sin(t*Math.PI*1.2))/scale};}),line={kind:'line',points,width,color:cssColor(tool),arrow,arrowStyle:tool==='arrowOpen'?'open':'filled',arrowWidth:options.arrowWidth,arrowHeight:options.arrowHeight,arrowPersistence:options.arrowPersistence,arrowMinWavelength:options.arrowMinWavelength,curveMinWavelength:options[tool==='line'?'curveWavelengthLine':tool==='arrow'?'curveWavelengthArrow':'curveWavelengthOpen']||0,arrowBaseDirection:tool==='arrow'&&!!options.arrowBaseDirection};
 const head=arrow?Visual.arrowHead(line):null,extent=[...points,...(head?[head.tip,head.left,head.right,head.innerTip,head.leftInner,head.rightInner]:[])],xs=extent.map(p=>p.x*scale),ys=extent.map(p=>p.y*scale);
 ctx.save();ctx.translate((canvas.width-Math.max(...xs)-Math.min(...xs))/2,(canvas.height-Math.max(...ys)-Math.min(...ys))/2);ctx.scale(scale,scale);Visual.draw(ctx,line);ctx.restore();
}
function render(){
 if(!options||!config)return;document.documentElement.lang=language;
 for(const [id,sl,en] of [['textBold','Krepko','Bold'],['textItalic','Ležeče','Italic'],['eraserPreview','Predogled radiranja','Eraser preview'],['colorMode','Barvni prostor','Color space'],['colorUnits','Enote','Units'],['fontFamily','Pisava','Font']])$(id).title=$(id).ariaLabel=tr(sl,en);
 for(const el of document.querySelectorAll('[data-sl]'))el.textContent=tr(el.dataset.sl,el.dataset.en);
 for(const row of document.querySelectorAll('.toolRow')){
  const tool=row.dataset.tool,button=row.querySelector('.toolIcon'),rgb=Visual.hsv(color(tool).hue,color(tool).saturation,color(tool).brightness),e=tool===options.tool?config.drawing.selectedToolTint:0;
  button.title=button.ariaLabel=tr({line:'Krivulja',arrow:'Polna puščica',arrowOpen:'Odprta puščica',text:'Besedilo',eraser:'Radirka'}[tool],{line:'Curve',arrow:'Filled arrow',arrowOpen:'Open arrow',text:'Text',eraser:'Eraser'}[tool]);row.classList.toggle('expanded',tool===(options.expandedTool===undefined?options.tool:options.expandedTool));button.style.color=cssColor(tool);button.style.background=`rgb(${rgb.map(v=>Math.round((1-e)*44+e*v)).join(',')})`;
 }
 for(const [key,parts] of parameters){const r=range(key);for(const p of parts){p.header.textContent=tr(p.node.dataset.labelSl,p.node.dataset.labelEn);p.slider.min=r.min;p.slider.max=r.max;p.slider.value=options[key]??config.drawing[key]??4;p.min.textContent=r.min;p.max.textContent=r.max;}}
 $('fontFamily').value=options.font;for(const [id,key] of [['textBold','bold'],['textItalic','italic'],['eraserPreview','eraserPreview']])$(id).classList.toggle('selected',!!options[key]);
 $('arrowBaseDirection').checked=!!options.arrowBaseDirection;paintPreview();if(kind==='color')renderColor();requestAnimationFrame(resizeSurface);
}
function colorValues(){const o=color();return o.mode==='rgb'?[...Visual.hsv(o.hue,o.saturation,o.brightness).map(v=>v/255),o.alpha]:[o.hue/360,o.saturation,o.brightness,o.alpha];}
function applyColor(values){const o=color();if(o.mode==='rgb')[o.hue,o.saturation,o.brightness]=Visual.rgb(...values.slice(0,3).map(v=>v*255));else[o.hue,o.saturation,o.brightness]=[values[0]*360,values[1],values[2]];o.alpha=values[3];send({action:'color',tool:options.tool||'line',color:{...o}});renderColor();}
function renderColor(){
 const o=color(),values=colorValues(),names=o.mode==='rgb'?['R','G','B','A']:['H','S','V','A'],max=o.normalized?1:255,key=(options.tool||'line')+o.mode+o.normalized;
 $('colorMode').value=o.mode;$('colorUnits').value=o.normalized?'normalized':'byte';$('colorPreview').style.background=cssColor(options.tool||'line');
 if(key!==colorKey){colorKey=key;colorControls=[];$('colorSliders').replaceChildren();names.forEach((name,i)=>{
  const row=document.createElement('label'),label=document.createElement('span'),slider=document.createElement('input'),number=document.createElement('input');row.className='colorRow';label.textContent=name;slider.type='range';slider.min=0;slider.max=1;slider.step=.001;number.type='number';number.min=0;number.max=max;number.step=max===1?.001:1;
  function change(value){const v=colorValues();v[i]=C.clamp(value,0,1);applyColor(v);}
  slider.oninput=()=>change(Number(slider.value));number.oninput=()=>change(Number(number.value)/max);row.append(label,slider,number);$('colorSliders').append(row);colorControls.push({slider,number});
 });}
 colorControls.forEach((control,i)=>{control.slider.value=values[i];if(document.activeElement!==control.number)control.number.value=Math.round(values[i]*max*1000)/1000;});paintWheel();
}
for(const [id,key] of [['colorMode','mode'],['colorUnits','normalized']])$(id).onchange=()=>{color()[key]=key==='normalized'?$(id).value==='normalized':$(id).value;send({action:'color',tool:options.tool||'line',color:{...color()}});renderColor();};
function paintWheel(){
 const o=color(),canvas=$('colorWheel'),ctx=canvas.getContext('2d'),w=canvas.width,r=w/2,data=ctx.createImageData(w,w),rgb=Visual.hsv(o.hue,o.saturation,o.brightness);
 for(let y=0;y<w;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(o.mode==='rgb')data.data.set([x/(w-1)*255,(1-y/(w-1))*255,rgb[2],255],i);else{const dx=(x-r)/r,dy=(r-y)/r,s=Math.hypot(dx,dy);if(s<=1)data.data.set([...Visual.hsv((Math.atan2(dy,dx)*180/Math.PI+360)%360,s,o.brightness),255],i);}}
 ctx.putImageData(data,0,0);let x,y;if(o.mode==='rgb'){x=rgb[0]/255*(w-1);y=(1-rgb[1]/255)*(w-1);}else{const a=o.hue*Math.PI/180;x=r+Math.cos(a)*r*o.saturation;y=r-Math.sin(a)*r*o.saturation;}
 ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
}
function pickWheel(e){const o=color(),r=$('colorWheel').getBoundingClientRect();if(o.mode==='rgb'){const rgb=Visual.hsv(o.hue,o.saturation,o.brightness);[o.hue,o.saturation,o.brightness]=Visual.rgb(C.clamp((e.clientX-r.left)/r.width,0,1)*255,C.clamp(1-(e.clientY-r.top)/r.height,0,1)*255,rgb[2]);}else{const dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(r.height/2-e.clientY+r.top)/(r.height/2);o.hue=(Math.atan2(dy,dx)*180/Math.PI+360)%360;o.saturation=Math.min(1,Math.hypot(dx,dy));}send({action:'color',tool:options.tool||'line',color:{...o}});renderColor();}
$('colorWheel').onpointerdown=e=>{e.preventDefault();e.target.setPointerCapture(e.pointerId);pickWheel(e);};$('colorWheel').onpointermove=e=>{if(e.buttons===1)pickWheel(e);};
let escapeDialog=false,escapePending=null;
document.addEventListener('keydown',e=>{
 if($('parameterRange').open){if(e.code==='Escape')escapeDialog=true;return;}
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat)escapePending={used:false,expand:e.shiftKey};return;}
 if(e.target.matches('input[type=number],select')&&!escapePending)return;
 const combo=(escapePending?'Escape+':'')+C.shortcut(e),name=Object.keys(shortcuts).find(key=>shortcuts[key]===combo);
 if(escapePending)escapePending.used=true;
 if(name){e.preventDefault();if(!e.repeat)send({action:'shortcut',name});}
});
document.addEventListener('keyup',e=>{if(e.code==='Escape'){if(escapeDialog){escapeDialog=false;return;}const pending=escapePending;escapePending=null;if(!$('parameterRange').open&&pending&&!pending.used){e.preventDefault();send({action:'shortcut',name:'escape',expand:pending.expand});}}});
window.addEventListener('blur',()=>escapePending=null);
function update(value){if(!value?.options)return;ownerId=value.ownerId;tabId=value.tabId;options=value.options;scale=value.scale||1;language=value.language||'sl';shortcuts=value.shortcuts||{};render();}
new ResizeObserver(()=>{if(options){resizeSurface();paintPreview();}}).observe($(kind==='palette'?'drawPanel':'colorPanel'));
window.tools.onState(update);window.tools.init().then(value=>{config=value.config;update(value);});
