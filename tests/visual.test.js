'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),V=require('../visual'),C=require('../core');
test('source-space flips and rotation are invertible and zoom anchors the same source pixel',()=>{
  for(const rotation of [0,37,90,180,271.5])for(const flipX of [false,true])for(const flipY of [false,true]){
    const state={rotation,flipX,flipY,view:{zoom:3,x:-220,y:-60}},r=V.geometry(1000,700,640,360,state),pixel={x:143.25,y:101.75},screen=V.toScreen(r,pixel),back=V.toSource(r,screen);
    assert.ok(Math.abs(back.x-pixel.x)<1e-9&&Math.abs(back.y-pixel.y)<1e-9);
    const view=V.zoom(r,state.view,screen,1.7,1,512),next=V.toScreen(V.geometry(1000,700,640,360,{...state,view}),pixel);
    assert.ok(Math.abs(next.x-screen.x)<1e-8&&Math.abs(next.y-screen.y)<1e-8);
  }
  const view={zoom:3,x:-143,y:83};const old=C.imageRect(1000,700,1920,1080,view),r=V.geometry(1000,700,1920,1080,{view});assert.ok(Math.abs(old.x-r.x)<1e-9);assert.ok(Math.abs(old.y-r.y)<1e-9);
});
test('new crop remains inside a rotated zoomed viewport; constrained segments use 45-degree steps',()=>{
  for(const rotation of [0,15,45,90,133,270]){
    const r=V.geometry(1000,700,640,360,{rotation,view:{zoom:5,x:-800,y:-580}}),crop=V.visibleCrop(r,1000,700,.8);if(!crop)continue;
    for(const x of [crop.xmin,crop.xmax])for(const y of [crop.ymin,crop.ymax]){const p={x:r.cx-r.bw*r.scale/2+x*r.scale,y:r.cy-r.bh*r.scale/2+y*r.scale};assert.ok(p.x>=-4&&p.x<=1004&&p.y>=-4&&p.y<=704);}
  }
  const p=V.constrained({x:0,y:0},{x:43,y:70});assert.ok(Math.abs(p.x-p.y)<1e-10);
  const hsv=V.rgb(...V.hsv(123,.73,.62));assert.ok(Math.abs(hsv[0]-123)<1e-8);assert.ok(Math.abs(hsv[1]-.73)<1e-8);
});

test('rotation is rigid and leaves a movable source pivot stationary at any zoom',()=>{
  for(const fitRotation of [0,47])for(const angle of [0,15,90,270])for(const zoom of [1,7]){const state={rotation:angle,pivot:{x:53.4,y:212.7},view:{zoom,x:-123,y:51,fitRotation}},r=V.geometry(900,600,640,360,state),p=V.toScreen(r,state.pivot),view=V.rotateView(900,600,640,360,state,angle+31),q=V.geometry(900,600,640,360,{...state,view,rotation:angle+31}),next=V.toScreen(q,state.pivot);assert.equal(r.scale,q.scale);assert.ok(Math.hypot(p.x-next.x,p.y-next.y)<1e-8);}
});
test('arrow tangent smooths pixel noise and keeps triangle apex at the last point',()=>{
  const points=Array.from({length:101},(_,i)=>({x:i,y:Math.round(.003*i*i)+(i%2?.4:-.4)}));const head=V.arrowHead({points,width:3,arrowWidth:16,arrowHeight:24});assert.ok(Math.abs(head.angle-Math.atan(.6))<.16);assert.deepEqual(head.tip,points.at(-1));assert.ok(Math.abs(Math.hypot(head.left.x-head.right.x,head.left.y-head.right.y)-16)<1e-8);assert.ok(Math.abs(Math.hypot(head.tip.x-head.base.x,head.tip.y-head.base.y)-24)<1e-8);
  const line=V.arrowHead({points:[{x:0,y:0},{x:70,y:40},{x:70,y:80}],polyline:true,width:3,arrowWidth:16,arrowHeight:24});assert.equal(line.angle,Math.PI/2);
});
