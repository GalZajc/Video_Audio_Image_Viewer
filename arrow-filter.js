/* Low-pass x(s), y(s), sampled by arc length; orientation comes from their derivative. */
(function(root){
 'use strict';
 const caches=new WeakMap();
 function tangent(stroke,options){
  const points=stroke.points,window=Math.max(.1,stroke.arrowPersistence||options.arrowPersistence),wavelength=Math.max(.1,stroke.arrowMinWavelength||stroke.arrowPersistence||options.arrowMinWavelength),sigma=wavelength*Math.sqrt(Math.pow(2,1/3)-1)/(2*Math.PI),derivative=Math.max(.05,wavelength*options.arrowDerivativeFraction);
  let cache=caches.get(stroke);
  if(!cache||cache.points!==points||cache.count>points.length||cache.window!==window||cache.wavelength!==wavelength){const span=Math.min(window,12*sigma),weights=Array.from({length:options.arrowFilterSamples},(_,i)=>{const u=i*span/(options.arrowFilterSamples-1)/sigma;return u*u*Math.exp(-u)*(i===0||i===options.arrowFilterSamples-1?.5:1);}),sum=weights.reduce((a,b)=>a+b,0);cache={points,count:1,window,wavelength,arc:[0],distance:0,angle:null,span,weights:weights.map(w=>w/sum)};caches.set(stroke,cache);}
  const arc=cache.arc;
  for(let i=arc.length;i<points.length;i++)arc.push(arc[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  function at(distance){if(distance<=0)return points[0];let lo=0,hi=arc.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(arc[mid]<distance)lo=mid+1;else hi=mid;}const end=Math.max(1,lo),begin=end-1,d=arc[end]-arc[begin],fraction=d?(distance-arc[begin])/d:0;return {x:points[begin].x+(points[end].x-points[begin].x)*fraction,y:points[begin].y+(points[end].y-points[begin].y)*fraction};}
  function filtered(distance){
   // Three cascaded low-pass poles have kernel u² exp(-u). Its zero weight and
   // slope at the newest endpoint suppress pixel jitter more strongly than a
   // one-sided Gaussian. The cutoff wavelength is the -3 dB amplitude point.
   // A fixed grid avoids jumps when samples enter/leave the retained path.
   const step=cache.span/(cache.weights.length-1);let x=0,y=0;
   for(let i=0;i<cache.weights.length;i++){const p=at(distance-i*step),weight=cache.weights[i];x+=weight*p.x;y+=weight*p.y;}
   return {x,y};
  }
  const step=Math.max(options.arrowMinFilterStep,Math.min(options.arrowFilterStep,wavelength/32));
  for(let i=cache.count;i<points.length;i++){
   const start=arc[i-1],distance=arc[i]-start;if(distance<1e-9)continue;if(cache.angle===null)cache.angle=Math.atan2(points[i].y-points[i-1].y,points[i].x-points[i-1].x);
   const pieces=Math.min(options.arrowMaxSegmentSteps,Math.max(1,Math.ceil(distance/step))),ds=distance/pieces;
   for(let j=1;j<=pieces;j++){
    const s=start+j*ds,a=filtered(s),b=filtered(s-derivative),dx=(a.x-b.x)/derivative,dy=(a.y-b.y)/derivative,n=Math.hypot(dx,dy);
    // At a cusp, or when jitter cancels the derivative, retain the last valid
    // direction rather than taking atan2 of a nearly zero vector.
    if(n<options.arrowConfidence)continue;
    const target=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(target-cache.angle),Math.cos(target-cache.angle)),limit=options.arrowTurnRate*ds/Math.max(window,wavelength,stroke.width*4);cache.angle+=Math.max(-limit,Math.min(limit,delta));
   }
  }
  cache.count=points.length;cache.distance=arc.at(-1)||0;
  return cache.angle??(points.length>1?Math.atan2(points.at(-1).y-points[0].y,points.at(-1).x-points[0].x):0);
 }
 const api={tangent};if(typeof module!=='undefined')module.exports=api;else root.ArrowFilter=api;
})(typeof window==='undefined'?globalThis:window);
