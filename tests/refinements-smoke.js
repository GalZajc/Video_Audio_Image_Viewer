'use strict';
const {app,dialog,screen}=require('electron');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..','OUTPUT',`refinements_validation_${new Date().toISOString().replace(/[:.]/g,'-')}`);fs.mkdirSync(root,{recursive:true});fs.mkdirSync(path.join(root,'DATA'),{recursive:true});fs.writeFileSync(path.join(root,'DATA','settings.json'),JSON.stringify({openAfterExport:false,escapeMaxFit:true}),'utf8');process.env.VAP_ROOT=root;process.env.VAP_TEST_MODE='1';
const {getWindow}=require('../main');const Media=require('../media');const pause=ms=>new Promise(r=>setTimeout(r,ms));let win,web;const report={};
async function wait(expression,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){if(await web.executeJavaScript(expression))return;await pause(25);}throw new Error('Timed out: '+expression);}
async function key(code,modifiers=[]){web.sendInputEvent({type:'keyDown',keyCode:code,modifiers});web.sendInputEvent({type:'keyUp',keyCode:code,modifiers});await pause(70);}
async function screenshot(name){await pause(150);fs.writeFileSync(path.join(root,name+'.png'),(await web.capturePage()).toPNG());}
app.whenReady().then(async()=>{try{
  while(!(win=getWindow()))await pause(30);web=win.webContents;await wait('typeof config!=="undefined" && !!config');
  const source=path.join(root,'širok čšž.mp4'),second=path.join(root,'drug posnetek.mp4'),third=path.join(root,'tretji.mp4');
  await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=24:duration=8','-c:v','libx264',source]);fs.copyFileSync(source,second);fs.copyFileSync(source,third);
  await web.executeJavaScript(`openFiles(${JSON.stringify([source,second,third])})`);await wait('loaded && video.readyState>=2');await key('Space');await wait('video.paused');
  // Real mouse events reorder inactive tabs without disturbing playback or identity.
  const centers=await web.executeJavaScript(`[...$('tabs').children].map(el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})`);
  const activePath=await web.executeJavaScript('current().meta.path');
  web.sendInputEvent({type:'mouseDown',button:'left',x:Math.round(centers[0].x),y:Math.round(centers[0].y),clickCount:1});
  for(let x=Math.round(centers[0].x)+20;x<centers[2].x+50;x+=40){web.sendInputEvent({type:'mouseMove',x,y:14,button:'left'});await pause(15);}
  web.sendInputEvent({type:'mouseUp',button:'left',x:Math.round(centers[2].x)+50,y:14,clickCount:1});await pause(100);
  const order=await web.executeJavaScript('tabs.map(t=>t.meta.path)');assert.deepEqual(order,[second,third,source]);assert.equal(await web.executeJavaScript('current().meta.path'),activePath);report.tabOrder=order;
  // Clicking a reordered tab must use its new index; the x is tested after drag.
  await web.executeJavaScript(`$('tabs').children[2].click()`);await wait('loaded && current().meta.path === '+JSON.stringify(source));await web.executeJavaScript('video.pause()');
  await web.executeJavaScript(`current().state.view={zoom:5,x:-880,y:-620};current().state.crop=null;layout();`);await key('S',['shift']);
  const initial=await web.executeJavaScript(`(()=>{const r=cropOverlay.getBoundingClientRect(),b=stage.getBoundingClientRect();return {crop:current().state.crop,left:r.left-b.left,top:r.top-b.top,right:r.right-b.left,bottom:r.bottom-b.top,width:b.width,height:b.height};})()`);
  assert.ok(initial.left>=-1&&initial.top>=-1&&initial.right<=initial.width+1&&initial.bottom<=initial.height+1);report.initialCrop=initial;
  await screenshot('zoom-crop');await key('Escape');await key('S',['shift']);assert.deepEqual(await web.executeJavaScript('current().state.crop'),initial.crop);
  // Simultaneous state checks the exact Escape priority and I/O preservation.
  await web.executeJavaScript(`current().state.in={time:1,end:1.041667,index:24};current().state.out={time:2,end:2.041667,index:48};current().state.timelineZoom=true;updateTimeline();`);
  await key('Escape');assert.equal(await web.executeJavaScript('current().state.cropVisible'),false);assert.equal(await web.executeJavaScript('current().state.timelineZoom'),true);
  await key('Escape');assert.equal(await web.executeJavaScript('current().state.timelineZoom'),false);assert.equal(await web.executeJavaScript('current().state.view.zoom'),5);assert.ok(await web.executeJavaScript('!!current().state.in && !!current().state.out'));
  await key('Escape');assert.deepEqual(await web.executeJavaScript('current().state.view'),{zoom:1,x:0,y:0});
  await key('Escape');await wait('!windowFitBusy');await pause(100);
  let viewport=await web.executeJavaScript('({width:stage.clientWidth,height:stage.clientHeight,rect:rect()})');assert.ok(Math.abs(viewport.rect.x)<1&&Math.abs(viewport.rect.y)<1);report.firstFit=win.getBounds();
  await key('Escape');await wait('!windowFitBusy');await pause(100);
  const bounds=win.getBounds(),work=screen.getDisplayMatching(bounds).workArea;assert.ok(bounds.width<=work.width&&bounds.height<=work.height);assert.ok(Math.abs(bounds.x+bounds.width/2-work.x-work.width/2)<=1);assert.ok(Math.abs(bounds.y+bounds.height/2-work.y-work.height/2)<=1);report.maxFit=bounds;
  await key('F');await wait('document.body.classList.contains("fill")');assert.equal(win.isFullScreen(),false);await key('Escape');await wait('!windowFitBusy');await pause(100);viewport=await web.executeJavaScript('({rect:rect(),header:$("titlebar").getBoundingClientRect().height})');assert.equal(viewport.header,0);assert.ok(Math.abs(viewport.rect.x)<1&&Math.abs(viewport.rect.y)<1);await key('Escape');await wait('!windowFitBusy');await key('F');
  // Native fullscreen uses Electron; F only toggles the strip.
  win.showInactive();
  await web.executeJavaScript(`stage.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);await wait('document.body.classList.contains("systemFullscreen")');assert.equal(win.isFullScreen(),true);await screenshot('fullscreen');
  await web.executeJavaScript(`stage.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);await wait('!document.body.classList.contains("systemFullscreen")');assert.equal(win.isFullScreen(),false);win.hide();
  await web.executeJavaScript('seekTo(1.5)');await wait('!video.seeking');await web.executeJavaScript('updateTimeline()');assert.equal(await web.executeJavaScript('getComputedStyle($("playhead")).backgroundColor'),'rgb(135, 216, 255)');
  await web.executeJavaScript('seekTo(3)');await wait('!video.seeking');assert.equal(await web.executeJavaScript('getComputedStyle($("playhead")).backgroundColor'),'rgb(255, 0, 51)');
  await web.executeJavaScript('controls()');await wait('!document.body.classList.contains("controls")',4000);assert.equal(await web.executeJavaScript('video.paused'),true);assert.equal(await web.executeJavaScript('getComputedStyle($("transport")).pointerEvents'),'none');
  // One selected frame chooses PNG, despite settings.videoFormat still being mp4.
  await web.executeJavaScript('seekTo(2)');await wait('!video.seeking');await key('I');await key('O');await wait('current().state.in.index === current().state.out.index');
  const png=path.join(root,'sličica čšž.png');let saveOptions;
  dialog.showSaveDialog=async(_w,options)=>{saveOptions=options;return {canceled:false,filePath:png};};await key('S',['control']);await wait('$("exportMenu").open');await web.executeJavaScript(`$('exportChoices').children[1].click()`);await wait('!exportBusy');assert.ok(fs.existsSync(png));assert.equal(saveOptions.filters[0].extensions[0],'png');assert.ok(saveOptions.defaultPath.endsWith('.png'));
  const pngMeta=JSON.parse(await Media.run('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',png]));assert.equal(pngMeta.streams[0].width,initial.crop.xmax-initial.crop.xmin);
  const styling=await web.executeJavaScript(`({buttons:[...$('windowButtons').children,$('settingsButton')].map(el=>el.getBoundingClientRect().width),corners:[...$('tabs').children].map(el=>getComputedStyle(el).borderTopRightRadius)})`);assert.deepEqual(styling.buttons,[28,28,28,28]);assert.ok(styling.corners.every(x=>x==='0px'));report.styling=styling;
  await screenshot('updated-player');await web.executeJavaScript('capture();persistSoon(true)');await pause(200);const history=JSON.parse(fs.readFileSync(path.join(root,'DATA','history.json'),'utf8'));assert.deepEqual(history.tabs.map(t=>t.path),order);
  report.success=true;fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2),'utf8');console.log(JSON.stringify({root,...report},null,2));app.quit();
}catch(error){report.success=false;report.error=error.stack;if(web&&!web.isDestroyed()){report.window={fullscreen:win.isFullScreen(),visible:win.isVisible(),bounds:win.getBounds()};report.state=await web.executeJavaScript('({tab:current()?.state,rect:rect(),width:stage.clientWidth,height:stage.clientHeight,body:document.body.className,fitBusy:windowFitBusy,drag:!!tabDrag,toast:$("toast").textContent})');await screenshot('failure');}fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2),'utf8');console.error(error);Media.shutdown();app.exit(1);}});
