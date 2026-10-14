/* Source-pixel geometry. Flips happen before rotation; pan and zoom remain untouched. */
(function(root){
  'use strict';
  const C=typeof module!=='undefined'?require('./core'):root.Core;
  function geometry(sw,sh,w,h,state){
    const angle=-(state.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(angle))<1e-10?0:Math.cos(angle),s=Math.abs(Math.sin(angle))<1e-10?0:Math.sin(angle);
    const bw=Math.ceil(Math.abs(w*c)+Math.abs(h*s)-1e-7),bh=Math.ceil(Math.abs(w*s)+Math.abs(h*c)-1e-7);
    const fitAngle=-(state.view.fitRotation||0)*Math.PI/180,fitWidth=Math.abs(w*Math.cos(fitAngle))+Math.abs(h*Math.sin(fitAngle)),fitHeight=Math.abs(w*Math.sin(fitAngle))+Math.abs(h*Math.cos(fitAngle));
    const base=Math.min(sw/fitWidth,sh/fitHeight),scale=base*state.view.zoom;
    // Preserve the old zoom anchor at zero rotation and fit at zoom=1.
    const cx=sw/2+state.view.x+(state.view.zoom-1)*w*base/2;
    const cy=sh/2+state.view.y+(state.view.zoom-1)*h*base/2;
    return {x:cx-w*scale/2,y:cy-h*scale/2,width:w*scale,height:h*scale,scale,base,cx,cy,w,h,c,s,bw,bh,fx:state.flipX?-1:1,fy:state.flipY?-1:1};
  }
  function toScreen(r,p){const x=(p.x-r.w/2)*r.fx,y=(p.y-r.h/2)*r.fy;return {x:r.cx+r.scale*(r.c*x-r.s*y),y:r.cy+r.scale*(r.s*x+r.c*y)};}
  function toSource(r,p){const x=(p.x-r.cx)/r.scale,y=(p.y-r.cy)/r.scale;return {x:r.w/2+(r.c*x+r.s*y)*r.fx,y:r.h/2+(-r.s*x+r.c*y)*r.fy};}
  function zoom(r,view,p,factor,min,max){const z=C.clamp(view.zoom*factor,min,max),a=z/view.zoom;return {...view,zoom:z,x:view.x+(p.x-r.cx)*(1-a)-(z-view.zoom)*r.w*r.base/2,y:view.y+(p.y-r.cy)*(1-a)-(z-view.zoom)*r.h*r.base/2};}
  function visibleCrop(r,sw,sh,fraction){
    return C.visibleCrop({x:r.cx-r.bw*r.scale/2,y:r.cy-r.bh*r.scale/2,scale:r.scale},sw,sh,r.bw,r.bh,fraction);
  }
  function constrained(last,p){const dx=p.x-last.x,dy=p.y-last.y,a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,d=Math.hypot(dx,dy);return {x:last.x+Math.cos(a)*d,y:last.y+Math.sin(a)*d};}
  function draw(ctx,stroke){
    if(stroke.kind==='eraser'){ctx.save();ctx.globalCompositeOperation='destination-out';draw(ctx,{...stroke,kind:'line',color:'#000',arrow:false});ctx.restore();return;}
    if(stroke.kind==='text'){
      if(!stroke.text)return;ctx.save();const ax=stroke.axisX||{x:1,y:0},ay=stroke.axisY||{x:0,y:1};ctx.transform(ax.x,ax.y,ay.x,ay.y,stroke.x,stroke.y);ctx.fillStyle=stroke.color;ctx.font=textFont(stroke);ctx.textBaseline='top';let y=0;for(const line of textLines(ctx,stroke)){ctx.fillText(line,0,y);y+=stroke.fontSize;}ctx.restore();return;
    }
    const points=stroke.points;if(!points?.length)return;ctx.save();ctx.strokeStyle=ctx.fillStyle=stroke.color;ctx.lineWidth=stroke.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    const arrow=stroke.arrow&&points.length>1?arrowHead(stroke):null;
    // Keep the recorded curve, including its last bend. A straight connector to
    // the head's base replaced that bend in the old implementation.
    const body=points;if(arrow)ctx.lineCap='butt';
    for(let i=1;i<body.length;i++)ctx.lineTo(body[i].x,body[i].y);
    if(points.length===1){ctx.arc(points[0].x,points[0].y,stroke.width/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();
    if(arrow){ctx.beginPath();if(stroke.arrowStyle==='open'){ctx.moveTo(arrow.tip.x,arrow.tip.y);ctx.lineTo(arrow.left.x,arrow.left.y);ctx.lineTo(arrow.leftInner.x,arrow.leftInner.y);ctx.lineTo(arrow.innerTip.x,arrow.innerTip.y);ctx.lineTo(arrow.rightInner.x,arrow.rightInner.y);ctx.lineTo(arrow.right.x,arrow.right.y);ctx.closePath();ctx.fill();}else{ctx.moveTo(arrow.tip.x,arrow.tip.y);ctx.lineTo(arrow.left.x,arrow.left.y);ctx.lineTo(arrow.right.x,arrow.right.y);ctx.closePath();ctx.fill();}}
    ctx.restore();
  }
  function textFont(t){return `${t.italic?'italic ':''}${t.bold?'bold ':''}${t.fontSize}px "${t.font}", Arial, sans-serif`;}
  function textLines(ctx,t){ctx.font=textFont(t);const lines=[];for(const paragraph of (t.text||'').split('\n')){let line='';for(const ch of paragraph){if(line&&ctx.measureText(line+ch).width>t.boxWidth){lines.push(line);line='';}line+=ch;}lines.push(line);}return lines;}
  function rotateView(sw,sh,w,h,state,degrees){const before=geometry(sw,sh,w,h,state),pivot=state.pivot||{x:w/2,y:h/2},anchor=toScreen(before,pivot);const after=geometry(sw,sh,w,h,{...state,rotation:degrees}),next=toScreen(after,pivot);return {...state.view,x:state.view.x+anchor.x-next.x,y:state.view.y+anchor.y-next.y};}
  const tangentCache=new WeakMap();
  function stableTangent(stroke){
    const points=stroke.points,length=Math.max(1,stroke.arrowPersistence||stroke.width*16||64),options=typeof module!=='undefined'?require('./config').drawing:config.drawing;
    let cache=tangentCache.get(stroke);
    if(!cache||cache.points!==points||cache.count>points.length||cache.length!==length){cache={points,count:1,length,distance:0,vx:0,vy:0,angle:null};tangentCache.set(stroke,cache);}
    // Integrate every segment, rather than only segments observed by a repaint.
    // Exponential spatial averaging has no sliding-window boundary to jump, and
    // a weak vector on a loop/reversal cannot flip the displayed orientation.
    for(let i=cache.count;i<points.length;i++){
      const dx=points[i].x-points[i-1].x,dy=points[i].y-points[i-1].y,ds=Math.hypot(dx,dy);if(ds<1e-8)continue;
      const tx=dx/ds,ty=dy/ds;if(cache.angle===null){cache.angle=Math.atan2(ty,tx);cache.vx=tx;cache.vy=ty;}
      if(cache.distance<Math.min(length/4,stroke.width*options.arrowStartupWidths)){cache.distance+=ds;const x=points[i].x-points[0].x,y=points[i].y-points[0].y,n=Math.hypot(x,y);if(n>1e-6){cache.angle=Math.atan2(y,x);cache.vx=x/n;cache.vy=y/n;}continue;}cache.distance+=ds;
      const steps=Math.max(1,Math.ceil(ds/Math.max(.25,Math.min(2,length/32)))),step=ds/steps,alpha=-Math.expm1(-step/(length*options.arrowSmoothingFraction));
      for(let k=0;k<steps;k++){cache.vx+=(tx-cache.vx)*alpha;cache.vy+=(ty-cache.vy)*alpha;if(Math.hypot(cache.vx,cache.vy)<options.arrowConfidence)continue;
        const target=Math.atan2(cache.vy,cache.vx),delta=Math.atan2(Math.sin(target-cache.angle),Math.cos(target-cache.angle));cache.angle+=C.clamp(delta*alpha,-options.arrowTurnRate*step/length,options.arrowTurnRate*step/length);
      }
    }
    cache.count=points.length;return cache.angle??0;
  }
  function arrowHead(stroke){
    const p=stroke.points,tip=p.at(-1);const a=stroke.polyline?Math.atan2(tip.y-p.at(-2).y,tip.x-p.at(-2).x):stableTangent(stroke);
    const h=stroke.arrowHeight,w=stroke.arrowWidth/2,base={x:tip.x-h*Math.cos(a),y:tip.y-h*Math.sin(a)};const left={x:base.x-w*Math.sin(a),y:base.y+w*Math.cos(a)},right={x:base.x+w*Math.sin(a),y:base.y-w*Math.cos(a)},length=Math.hypot(h,w),cos=h/length,sin=w/length,thickness=stroke.width,depth=thickness/Math.max(sin,.0001),innerTip={x:tip.x-depth*Math.cos(a),y:tip.y-depth*Math.sin(a)},leftInner={x:left.x-thickness*sin*Math.cos(a)+thickness*cos*Math.sin(a),y:left.y-thickness*sin*Math.sin(a)-thickness*cos*Math.cos(a)},rightInner={x:right.x-thickness*sin*Math.cos(a)-thickness*cos*Math.sin(a),y:right.y-thickness*sin*Math.sin(a)+thickness*cos*Math.cos(a)};return {tip,base,left,right,innerTip,leftInner,rightInner,angle:a};
  }
  function hsv(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return rgb.map(n=>(n+m)*255);}
  function rgb(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=d===0?0:max===r?60*(((g-b)/d)%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);return [(h+360)%360,max?d/max:0,max];}
  const api={geometry,toScreen,toSource,zoom,visibleCrop,constrained,draw,textFont,textLines,rotateView,arrowHead,stableTangent,hsv,rgb};if(typeof module!=='undefined')module.exports=api;else root.Visual=api;
})(typeof window!=='undefined'?window:globalThis);
