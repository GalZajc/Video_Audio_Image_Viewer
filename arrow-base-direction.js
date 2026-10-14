/* Optional fixed-point alignment to the displayed curve at the head's base. */
(function(root){
 'use strict';
 function intersection(points,tip,angle,height){
  const c=Math.cos(angle),s=Math.sin(angle);let distance=0;
  for(let i=points.length-1;i>0;i--){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y),fa=(tip.x-a.x)*c+(tip.y-a.y)*s-height,fb=(tip.x-b.x)*c+(tip.y-b.y)*s-height;
   if(fa>=0&&fb<=0&&fa!==fb){const t=fa/(fa-fb);return {point:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},index:i,fraction:t,distance:distance+(1-t)*length};}distance+=length;
  }return null;
 }
 function tangent(points,foot,span){
  function at(delta){let i=foot.index,t=foot.fraction,remaining=Math.abs(delta),direction=Math.sign(delta);let p={...foot.point};
   while(remaining>0&&i>0&&i<points.length){const a=points[i-1],b=points[i],q=direction<0?a:b,length=Math.hypot(q.x-p.x,q.y-p.y);if(length>=remaining){const f=length?remaining/length:0;return {x:p.x+(q.x-p.x)*f,y:p.y+(q.y-p.y)*f};}remaining-=length;p=q;i+=direction;t=direction<0?1:0;}return p;
  }
  const a=at(-span/2),b=at(span/2);return Math.hypot(b.x-a.x,b.y-a.y)>1e-8?Math.atan2(b.y-a.y,b.x-a.x):null;
 }
 function solve(stroke,points,initial,options){
  const tip=points.at(-1),height=stroke.arrowHeight,span=Math.max(options.arrowBaseTangentSpan,stroke.width),tolerance=options.arrowBaseTolerance;let angle=initial,best=initial,bestResidual=Infinity,iterations=0,converged=false;
  for(;iterations<options.arrowBaseIterations;iterations++){
   const foot=intersection(points,tip,angle,height);if(!foot)break;const target=tangent(points,foot,span);if(target===null)break;
   const delta=Math.atan2(Math.sin(target-angle),Math.cos(target-angle)),residual=Math.abs(delta);
   if(residual<bestResidual){bestResidual=residual;best=angle;}
   if(residual<=tolerance){angle=target;best=angle;converged=true;break;}
   angle+=options.arrowBaseRelaxation*delta;
  }
  return {angle:best,foot:intersection(points,tip,best,height),iterations:iterations+1,residual:bestResidual,converged};
 }
 const api={solve,intersection,tangent};if(typeof module!=='undefined')module.exports=api;else root.ArrowBaseDirection=api;
})(typeof window==='undefined'?globalThis:window);
