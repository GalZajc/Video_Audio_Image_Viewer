'use strict';
const signedArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0)/2;
function intersection(subject,clip){let polygon=subject;const sign=signedArea(clip)>=0?1:-1;for(let i=0;i<clip.length&&polygon.length;i++){const a=clip[i],b=clip[(i+1)%clip.length],distance=p=>sign*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)),input=polygon;polygon=[];let previous=input.at(-1),pd=distance(previous);for(const point of input){const d=distance(point);if((d>=0)!==(pd>=0)){const t=pd/(pd-d);polygon.push({x:previous.x+(point.x-previous.x)*t,y:previous.y+(point.y-previous.y)*t});}if(d>=0)polygon.push(point);previous=point;pd=d;}}return polygon;}
function overlap(a,b){return Math.abs(signedArea(intersection(a,b)))/Math.max(1,Math.min(Math.abs(signedArea(a)),Math.abs(signedArea(b))));}
module.exports={overlap,intersection,signedArea};
