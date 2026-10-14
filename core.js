/* Shared geometry and timestamp rules; no Electron dependencies. */
(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function lowerBound(values, time) { let lo=0, hi=values.length; while(lo<hi){const m=(lo+hi)>>>1;if(values[m]<time)lo=m+1;else hi=m;}return lo; }
  function frameAt(values, time, duration, direction=0) {
    if (!values.length) throw new Error('Posnetek nima indeksiranih sličic.');
    let i=lowerBound(values,time-0.00001);
    if(i>=values.length)i=values.length-1;
    else if(values[i]>time+0.00001 && i>0)i--;
    i=clamp(i+direction,0,values.length-1);
    return {time:values[i],end:i+1<values.length?values[i+1]:duration,index:i};
  }
  function imageRect(stageWidth,stageHeight,width,height,view) {
    const base=Math.min(stageWidth/width,stageHeight/height), scale=base*view.zoom;
    return {x:(stageWidth-width*base)/2+view.x,y:(stageHeight-height*base)/2+view.y,width:width*scale,height:height*scale,scale,base};
  }
  function zoomAt(rect,view,pointer,factor,min,max) {
    const zoom=clamp(view.zoom*factor,min,max), actual=zoom/view.zoom;
    return {zoom,x:view.x+(pointer.x-rect.x)*(1-actual),y:view.y+(pointer.y-rect.y)*(1-actual)};
  }
  function clampCrop(crop,width,height) {
    const x1=clamp(Math.round(crop.xmin),0,width-1), y1=clamp(Math.round(crop.ymin),0,height-1);
    return {xmin:x1,ymin:y1,xmax:clamp(Math.round(crop.xmax),x1+1,width),ymax:clamp(Math.round(crop.ymax),y1+1,height)};
  }
  function visibleCrop(rect,stageWidth,stageHeight,width,height,fraction) {
    const left=clamp(-rect.x/rect.scale,0,width),right=clamp((stageWidth-rect.x)/rect.scale,0,width);
    const top=clamp(-rect.y/rect.scale,0,height),bottom=clamp((stageHeight-rect.y)/rect.scale,0,height);
    if(right-left<1 || bottom-top<1)return null;
    const marginX=(right-left)*(1-fraction)/2,marginY=(bottom-top)*(1-fraction)/2;
    return clampCrop({xmin:left+marginX,xmax:right-marginX,ymin:top+marginY,ymax:bottom-marginY},width,height);
  }
  function fitWindow(bounds,content,workArea,ratio,headerHeight,tolerance=1,expand=false,maxFit=false) {
    const extraWidth=bounds.width-content.width,extraHeight=bounds.height-content.height;
    const viewportWidth=content.width,viewportHeight=Math.max(1,content.height-headerHeight);
    const alreadyFit=Math.min(Math.abs(viewportWidth-viewportHeight*ratio),Math.abs(viewportHeight-viewportWidth/ratio))<=tolerance;
    let width,height,x,y;
    if(alreadyFit&&maxFit){
      const heightLimit=Math.max(1,workArea.height-extraHeight-headerHeight),widthLimit=Math.max(1,workArea.width-extraWidth);
      const videoWidth=Math.min(widthLimit,heightLimit*ratio);
      width=Math.round(videoWidth+extraWidth);height=Math.round(videoWidth/ratio+headerHeight+extraHeight);
      x=Math.round(workArea.x+(workArea.width-width)/2);y=Math.round(workArea.y+(workArea.height-height)/2);
    }else{
      const requested=expand?Math.max(viewportWidth,viewportHeight*ratio):Math.min(viewportWidth,viewportHeight*ratio);
      const videoWidth=Math.min(requested,Math.max(1,workArea.width-extraWidth),Math.max(1,workArea.height-extraHeight-headerHeight)*ratio);
      width=Math.round(videoWidth+extraWidth);height=Math.round(videoWidth/ratio+headerHeight+extraHeight);
      x=Math.round(bounds.x+(bounds.width-width)/2);y=Math.round(bounds.y+(bounds.height-height)/2);
    }
    x=clamp(x,workArea.x,workArea.x+workArea.width-width);y=clamp(y,workArea.y,workArea.y+workArea.height-height);
    return {x,y,width,height};
  }
  function shortcut(event) {
    return [event.ctrlKey?'Ctrl':null,event.altKey?'Alt':null,event.shiftKey?'Shift':null,event.metaKey?'Meta':null,(event.key&&/^[a-z]$/i.test(event.key)?'Key'+event.key.toUpperCase():event.code)].filter(Boolean).join('+');
  }
  function label(binding) { return binding.replace(/Key/g,'').replace(/Digit/g,'').replace('ArrowLeft','←').replace('ArrowRight','→').replace('ArrowUp','↑').replace('ArrowDown','↓').replace('Comma',',').replace('Period','.').replace(/\+/g,' + '); }
  const api={clamp,lowerBound,frameAt,imageRect,zoomAt,clampCrop,visibleCrop,fitWindow,shortcut,label};
  if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(typeof window!=='undefined'?window:globalThis);
