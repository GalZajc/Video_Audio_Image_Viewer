'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core');
const {exportPlan}=require('../media');
const config=require('../config.json');
test('frame stepping and inclusive end use real variable timestamps',()=>{
  const stamps=[0,.04,.08,.16,.28,.32];
  assert.deepEqual(C.frameAt(stamps,.18,.4),{time:.16,end:.28,index:3});
  assert.deepEqual(C.frameAt(stamps,.16,.4,-1),{time:.08,end:.16,index:2});
  assert.deepEqual(C.frameAt(stamps,.16,.4,1),{time:.28,end:.32,index:4});
  assert.deepEqual(C.frameAt(stamps,.32,.4,1),{time:.32,end:.4,index:5});
});
test('zoom fixes image coordinate under cursor after panning and letterboxing',()=>{
  const view={zoom:3,x:-143,y:83},r=C.imageRect(1000,700,1920,1080,view),pointer={x:730,y:114};
  const p={x:(pointer.x-r.x)/r.scale,y:(pointer.y-r.y)/r.scale};
  const next=C.zoomAt(r,view,pointer,1.18,1,512),nr=C.imageRect(1000,700,1920,1080,next);
  assert.ok(Math.abs(nr.x+p.x*nr.scale-pointer.x)<1e-8);assert.ok(Math.abs(nr.y+p.y*nr.scale-pointer.y)<1e-8);
});
test('crop preserves individual odd pixels rather than silently rounding to even dimensions',()=>{
  assert.deepEqual(C.clampCrop({xmin:7,ymin:5,xmax:62,ymax:58},100,90),{xmin:7,ymin:5,xmax:62,ymax:58});
  const meta={path:'source.mp4',duration:10,width:100,height:90,videoCodec:'h264',pixelFormat:'yuv420p',audioCodec:'aac',isAudio:false};
  const plan=exportPlan(meta,{in:{time:1,index:24},out:{time:2,end:2.041666667,index:48},crop:{xmin:7,ymin:5,xmax:62,ymax:58}},config.export);
  assert.equal(plan.videoCopy,false);assert.equal(plan.end,2.041666667);assert.ok(plan.args.includes('format=yuv444p,crop=55:53:7:5:exact=1'));assert.equal(plan.args[plan.args.indexOf('-frames:v')+1],'25');
});
test('full unmodified streams are copied; precise trims are lossless re-encodes',()=>{
  const meta={path:'a.mp4',duration:10,width:100,height:90,videoCodec:'h264',pixelFormat:'yuv420p',audioCodec:'aac',isAudio:false};
  const copy=exportPlan(meta,{},config.export);assert.equal(copy.videoCopy,true);assert.equal(copy.audioCopy,true);
  const trim=exportPlan(meta,{in:{time:1,index:24},out:{time:2,end:2.041666667,index:48}},{...config.export,matchSource:false});assert.equal(trim.videoCopy,false);assert.equal(trim.args[trim.args.indexOf('-crf')+1],'0');
  assert.throws(()=>exportPlan(meta,{in:{time:4},out:{time:1,end:2}},config.export));
  assert.throws(()=>exportPlan(meta,{}, {...config.export,videoFormat:'exe'}));
});
test('shortcut labels and physical keys handle Slovenian comma/period consistently',()=>{
  assert.equal(C.shortcut({ctrlKey:true,shiftKey:true,code:'KeyT'}),'Ctrl+Shift+KeyT');assert.equal(C.label('Ctrl+Comma'),'Ctrl + ,');
});
test('initial crop lies in the visible source area after cursor zoom and pan',()=>{
  const r=C.imageRect(1280,772,1920,1080,{zoom:8,x:-1730,y:-930});
  const crop=C.visibleCrop(r,1280,772,1920,1080,.8);assert.ok(crop);
  assert.ok(r.x+crop.xmin*r.scale>=-1);assert.ok(r.y+crop.ymin*r.scale>=-1);
  assert.ok(r.x+crop.xmax*r.scale<=1281);assert.ok(r.y+crop.ymax*r.scale<=773);
  assert.equal(C.visibleCrop({...r,x:4000,y:4000},1280,772,1920,1080,.8),null);
});
test('Escape fit expands one edge, then maximizes within the screen with exact video ratio',()=>{
  const work={x:1920,y:0,width:1920,height:1040},bounds={x:2200,y:100,width:1000,height:800},ratio=16/9,header=28;
  const first=C.fitWindow(bounds,bounds,work,ratio,header,1,true,true);assert.ok(first.width>bounds.width);assert.equal(first.height,bounds.height);
  const second=C.fitWindow(first,first,work,ratio,header,1,true,true);assert.ok(second.width<=work.width);assert.ok(second.height<=work.height);
  assert.ok(Math.abs((second.width)/(second.height-header)-ratio)<.002);
  assert.ok(Math.abs(second.x+second.width/2-(work.x+work.width/2))<=.5);assert.ok(Math.abs(second.y+second.height/2-(work.y+work.height/2))<=.5);
  const third=C.fitWindow(second,second,work,ratio,header,1,true,true);assert.deepEqual(third,second);
});
test('window fitting handles portrait media, hidden tabs and native non-client borders',()=>{
  const bounds={x:100,y:150,width:800,height:600},content={x:108,y:158,width:784,height:584},work={x:0,y:0,width:1280,height:720};
  for(const header of [0,28]){const first=C.fitWindow(bounds,content,work,9/16,header,1,true,true);assert.ok(first.height<=work.height);const client={...first,width:first.width-16,height:first.height-16};const second=C.fitWindow(first,client,work,9/16,header,1,true,true);assert.ok(second.height<=720);assert.ok(second.width<=1280);assert.ok(Math.abs((second.width-16)/(second.height-16-header)-9/16)<.002);}
});
test('same source frame selects PNG independent of the chosen video format',()=>{
  const meta={path:'a.mp4',duration:10,width:100,height:90,videoCodec:'h264',pixelFormat:'yuv420p',audioCodec:'aac',isAudio:false};
  const plan=exportPlan(meta,{in:{time:1,end:1.04,index:25},out:{time:1,end:1.04,index:25},crop:{xmin:3,ymin:5,xmax:58,ymax:58}},{...config.export,videoFormat:'webm'});
  assert.equal(plan.format,'png');assert.equal(plan.singleFrame,true);assert.equal(plan.args[plan.args.indexOf('-frames:v')+1],'1');assert.ok(plan.args.includes('-an'));
});

test('logical letter shortcuts handle Slovenian QWERTZ Z/Y',()=>{assert.equal(C.shortcut({key:'z',code:'KeyY',ctrlKey:true}),'Ctrl+KeyZ');assert.equal(C.shortcut({key:'y',code:'KeyZ',ctrlKey:true}),'Ctrl+KeyY');});
