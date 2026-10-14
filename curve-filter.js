/* Zero-phase Gaussian filtering in source-pixel arc length, with anchored ends. */
(function(root){
 'use strict';const caches=new WeakMap();
 function points(stroke,options){
  const input=stroke.points,wavelength=Number(stroke.curveMinWavelength)||0;
  if(stroke.polyline||wavelength<=0||input.length<3)return input;
  const step=Math.max(options.curveMinSampleStep,Math.min(options.curveSampleStep,wavelength/12)),sigma=wavelength*Math.sqrt(Math.log(2))/(2*Math.PI),span=3*sigma;
  let cache=caches.get(stroke);
  if(!cache||cache.input!==input||cache.count>input.length||cache.wavelength!==wavelength){
   const count=options.curveFilterSamples,offsets=Array.from({length:count},(_,i)=>span*(2*i/(count-1)-1)),weights=offsets.map((x,i)=>Math.exp(-.5*(x/sigma)**2)*(i===0||i===count-1?.5:1)),sum=weights.reduce((a,b)=>a+b,0);
   cache={input,wavelength,count:1,arc:[0],grid:[{...input[0]}],integralX:[0],integralY:[0],output:[],previousLength:0,offsets,weights:weights.map(w=>w/sum)};caches.set(stroke,cache);
  }
  const arc=cache.arc,grid=cache.grid;
  for(let i=cache.count;i<input.length;i++){
   const a=input[i-1],b=input[i],start=arc[i-1],length=Math.hypot(b.x-a.x,b.y-a.y),end=start+length;arc.push(end);
   while(grid.length*step<=end){const f=length?(grid.length*step-start)/length:0,p={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f},previous=grid.at(-1);cache.integralX.push(cache.integralX.at(-1)+step*(previous.x+p.x)/2);cache.integralY.push(cache.integralY.at(-1)+step*(previous.y+p.y)/2);grid.push(p);}
  }
  cache.count=input.length;const length=arc.at(-1),first=input[0],last=input.at(-1);if(length<1e-9)return input;
  function rawSample(d){const index=Math.min(grid.length-1,Math.floor(d/step)),a=grid[index],b=grid[index+1]||last,denominator=grid[index+1]?step:length-index*step,f=denominator?(d-index*step)/denominator:0;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}
  function rawIntegral(d){const index=Math.min(grid.length-1,Math.floor(d/step)),a=grid[index],p=rawSample(d),ds=d-index*step;return {x:cache.integralX[index]+ds*(a.x+p.x)/2,y:cache.integralY[index]+ds*(a.y+p.y)/2};}
  function integral(s){
   if(s>=0&&s<=length)return rawIntegral(s);
   if(s<0&&s>=-length){const p=rawIntegral(-s);return {x:p.x+2*first.x*s,y:p.y+2*first.y*s};}
   if(s>length&&s<=2*length){const p=rawIntegral(2*length-s);return {x:p.x+2*last.x*(s-length),y:p.y+2*last.y*(s-length)};}
   const n=Math.floor(s/(2*length)),t=s-n*2*length,p=integral(t),dx=last.x-first.x,dy=last.y-first.y;return {x:p.x+n*2*last.x*length+2*dx*length*n*(n-1)+2*n*dx*t,y:p.y+n*2*last.y*length+2*dy*length*n*(n-1)+2*n*dy*t};
  }
  function sample(s){
   // Odd reflection gives exactly the recorded first and last point, without
   // adding a straight terminal connector or translating the entire history.
   if(s>=0&&s<=length)return rawSample(s);
   if(s<0&&s>=-length){const p=rawSample(-s);return {x:2*first.x-p.x,y:2*first.y-p.y};}
   if(s>length&&s<=2*length){const p=rawSample(2*length-s);return {x:2*last.x-p.x,y:2*last.y-p.y};}
   const periods=Math.floor(s/(2*length)),t=s-periods*2*length,reflected=t>length,p=rawSample(reflected?2*length-t:t);
   let x=p.x,y=p.y;if(reflected){x=2*last.x-x;y=2*last.y-y;}
   return {x:x+periods*2*(last.x-first.x),y:y+periods*2*(last.y-first.y)};
  }
  const bin=2*span/(cache.offsets.length-1),output=cache.output,begin=Math.max(0,Math.floor((cache.previousLength-span-bin/2-step)/step)),count=Math.floor(length/step)+1;
  output.length=count+1;
  for(let i=begin;i<count;i++){const s=i*step;let x=0,y=0;for(let j=0;j<cache.offsets.length;j++){const center=s+cache.offsets[j],w=cache.weights[j];let p;if(bin>step){const a=integral(center-bin/2),b=integral(center+bin/2);p={x:(b.x-a.x)/bin,y:(b.y-a.y)/bin};}else p=sample(center);x+=w*p.x;y+=w*p.y;}output[i]={x,y};}
  output[0]={...first};output[count]={...last};cache.previousLength=length;return output;
 }
 const api={points};if(typeof module!=='undefined')module.exports=api;else root.CurveFilter=api;
})(typeof window==='undefined'?globalThis:window);
