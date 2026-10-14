'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),V=require('../visual'),F=require('../curve-filter'),options=require('../config').drawing;
test('spatial curve filtering anchors both endpoints, preserves straight lines and leaves polylines unchanged',()=>{
 const p=Array.from({length:200},(_,i)=>({x:i*1.3,y:20+i*.7})),stroke={points:p,curveMinWavelength:80},smooth=F.points(stroke,options);
 assert.deepEqual(smooth[0],p[0]);assert.deepEqual(smooth.at(-1),p.at(-1));assert.ok(smooth.every(q=>Math.abs((q.y-20)*1.3-q.x*.7)<1e-7));
 assert.equal(F.points({...stroke,polyline:true},options),p);assert.equal(F.points({...stroke,curveMinWavelength:0},options),p);
});
test('whole-curve low-pass suppresses short wavelengths and is identical in live append and export replay',()=>{
 const points=Array.from({length:420},(_,i)=>({x:i,y:3*Math.sin(i*2.2)})),live={points:[],curveMinWavelength:64};
 for(const p of points){live.points.push(p);if(live.points.length%7===0)F.points(live,options);}
 const a=F.points(live,options),b=F.points({points:points.map(p=>({...p})),curveMinWavelength:64},options);
 assert.deepEqual(a,b);const interior=a.filter(p=>p.x>50&&p.x<370),rms=Math.sqrt(interior.reduce((s,p)=>s+p.y*p.y,0)/interior.length),rawRms=Math.sqrt(points.reduce((s,p)=>s+p.y*p.y,0)/points.length);assert.ok(rms<rawRms*.2,'Less than 80% of short-wavelength noise was removed: '+rms);
});
test('appending a stroke leaves its previously smoothed distant history exactly unchanged',()=>{
 const stroke={points:Array.from({length:250},(_,i)=>({x:i,y:15*Math.sin(i*.035)+Math.sin(i*2)})),curveMinWavelength:48};
 const before=F.points(stroke,options).filter(p=>p.x<100).map(p=>({...p}));
 for(let i=250;i<400;i++)stroke.points.push({x:i,y:15*Math.sin(i*.035)+Math.sin(i*2)});
 assert.deepEqual(F.points(stroke,options).slice(0,before.length),before);
});
test('large spatial smoothing windows integrate sample bins and do not alias dense pixel noise',()=>{
 const p=Array.from({length:6001},(_,i)=>({x:i,y:.1*Math.sin(i*Math.PI/2)})),s=F.points({points:p,curveMinWavelength:1024},options),middle=s.filter(p=>p.x>1500&&p.x<4500),rms=Math.sqrt(middle.reduce((sum,p)=>sum+p.y*p.y,0)/middle.length);assert.ok(rms<.005,'Large-window aliasing: '+rms);
});
test('optional triangle orientation converges to the displayed tangent at its base and preserves the apex',()=>{
 const points=Array.from({length:321},(_,i)=>{const t=i*.0025;return {x:200+160*Math.cos(t),y:200+160*Math.sin(t)};}),stroke={points,width:4,arrowWidth:40,arrowHeight:30,arrowPersistence:64,arrowMinWavelength:64,arrowBaseDirection:true,arrowStyle:'filled'};
 const h=V.arrowHead(stroke);assert.ok(h.alignment.converged);assert.ok(h.alignment.residual<options.arrowBaseTolerance);assert.deepEqual(h.tip,points.at(-1));
 const foot=h.alignment.foot,dx=foot.point.x-h.base.x,dy=foot.point.y-h.base.y;assert.ok(Math.abs(dx*Math.cos(h.angle)+dy*Math.sin(h.angle))<1e-7);assert.ok(Math.hypot(dx,dy)<stroke.arrowWidth/2);
 assert.ok(h.alignment.iterations<=options.arrowBaseIterations+1);
});
