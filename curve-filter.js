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
  // Scalar scratch values avoid allocating two objects for every kernel tap.
  let px=0,py=0;
  function rawSample(d){const index=Math.min(grid.length-1,Math.floor(d/step)),a=grid[index],b=grid[index+1]||last,denominator=grid[index+1]?step:length-index*step,f=denominator?(d-index*step)/denominator:0;px=a.x+(b.x-a.x)*f;py=a.y+(b.y-a.y)*f;}
  function rawIntegral(d){const index=Math.min(grid.length-1,Math.floor(d/step)),a=grid[index],ds=d-index*step;rawSample(d);px=cache.integralX[index]+ds*(a.x+px)/2;py=cache.integralY[index]+ds*(a.y+py)/2;}
  function integral(s){if(s>=0&&s<=length){rawIntegral(s);return;}if(s<0&&s>=-length){rawIntegral(-s);px+=2*first.x*s;py+=2*first.y*s;return;}if(s>length&&s<=2*length){rawIntegral(2*length-s);px+=2*last.x*(s-length);py+=2*last.y*(s-length);return;}const n=Math.floor(s/(2*length)),t=s-n*2*length;integral(t);px=px+n*2*last.x*length+2*(last.x-first.x)*length*n*(n-1)+2*n*(last.x-first.x)*t;py=py+n*2*last.y*length+2*(last.y-first.y)*length*n*(n-1)+2*n*(last.y-first.y)*t;}
  function sample(s){if(s>=0&&s<=length){rawSample(s);return;}if(s<0&&s>=-length){rawSample(-s);px=2*first.x-px;py=2*first.y-py;return;}if(s>length&&s<=2*length){rawSample(2*length-s);px=2*last.x-px;py=2*last.y-py;return;}const periods=Math.floor(s/(2*length)),t=s-periods*2*length,reflected=t>length;rawSample(reflected?2*length-t:t);if(reflected){px=2*last.x-px;py=2*last.y-py;}px+=periods*2*(last.x-first.x);py+=periods*2*(last.y-first.y);}
  const bin=2*span/(cache.offsets.length-1),output=cache.output,begin=Math.max(0,Math.floor((cache.previousLength-span-bin/2-step)/step)),count=Math.floor(length/step)+1;
  output.length=count+1;
  for(let i=begin;i<count;i++){const s=i*step;let x=0,y=0;for(let j=0;j<cache.offsets.length;j++){const center=s+cache.offsets[j],w=cache.weights[j];if(bin>step){integral(center-bin/2);const ax=px,ay=py;integral(center+bin/2);px=(px-ax)/bin;py=(py-ay)/bin;}else sample(center);x+=w*px;y+=w*py;}output[i]={x,y};}
  output[0]={...first};output[count]={...last};cache.previousLength=length;return output;
 }
 const api={points};if(typeof module!=='undefined')module.exports=api;else root.CurveFilter=api;
})(typeof window==='undefined'?globalThis:window);
