'use strict';
const {app,dialog}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..','OUTPUT',`app_validation_${new Date().toISOString().replace(/[:.]/g,'-')}`);
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(path.join(root,'DATA'),{recursive:true});fs.writeFileSync(path.join(root,'DATA','settings.json'),JSON.stringify({openAfterExport:false,escapeMaxFit:true}),'utf8');process.env.VAP_ROOT=root;process.env.VAP_TEST_MODE='1';
const {getWindow}=require('../main');
const Media=require('../media');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let win,web,errors=[],report={};
async function waitFor(expression,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){if(await web.executeJavaScript(expression))return;await pause(40);}throw new Error('Timed out: '+expression);}
async function key(code,modifiers=[]){web.sendInputEvent({type:'keyDown',keyCode:code,modifiers});web.sendInputEvent({type:'keyUp',keyCode:code,modifiers});await pause(50);}
async function snapshot(name){await pause(180);const picture=await web.capturePage();fs.writeFileSync(path.join(root,name+'.png'),picture.toPNG());}
app.whenReady().then(async()=>{
  try{
    while(!(win=getWindow()))await pause(50);web=win.webContents;
    web.on('console-message',details=>{if(details.level==='error'||details.level===3)errors.push(details.message);});
    await waitFor('typeof config !== "undefined" && !!config');
    const source=path.join(root,'čšž ČŠŽ.mp4'),audio=path.join(root,'zvok šž.mp3');
    await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=24:duration=14','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=14','-c:v','libx264','-g','240','-crf','18','-c:a','aac',source]);
    await Media.run('ffmpeg',['-v','error','-y','-i',source,'-vn','-c:a','libmp3lame',audio]);
    await web.executeJavaScript(`openFiles(${JSON.stringify([source])})`);await waitFor('loaded && video.readyState >= 2');
    await key('Space');await waitFor('video.paused');
    report.originalCodec=await web.executeJavaScript('current().meta.videoCodec');
    await web.executeJavaScript('seekTo(3)');await waitFor('!video.seeking && Math.abs(video.currentTime-3)<.01');
    // Native keyboard events verify the actual shortcut handler.
    await key('.');await waitFor('!video.seeking && Math.abs(current().state.frameTime-3.041667)<.001');
    await key(',');await waitFor('!video.seeking && Math.abs(current().state.frameTime-3)<.001');
    await key('I');await waitFor('!!current().state.in');
    for(let i=0;i<3;i++)await key('.');await waitFor('!video.seeking');await key('O');await waitFor('!!current().state.out');
    const selected=await web.executeJavaScript('({in:current().state.in,out:current().state.out})');assert.equal(selected.out.index-selected.in.index+1,4);report.selected=selected;
    await key('S',['shift']);await waitFor('current().state.cropVisible');
    const cropColor=await web.executeJavaScript('getComputedStyle(cropOverlay).boxShadow');assert.ok(cropColor.includes('0.58'));
    // Zoom at a known pointer and assert the crop and image use the same transform.
    const geometry=await web.executeJavaScript(`(()=>{const r=rect(),b=stage.getBoundingClientRect(),px=520,py=220;const before=point({clientX:px+b.left,clientY:py+b.top});stage.dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:-2400,clientX:px+b.left,clientY:py+b.top,bubbles:true,cancelable:true}));const after=point({clientX:px+b.left,clientY:py+b.top});return {before,after,zoom:current().state.view.zoom,rendering:getComputedStyle(still).imageRendering,crop:cropOverlay.style.display};})()`);
    assert.ok(geometry.zoom>10);assert.ok(Math.abs(geometry.before.x-geometry.after.x)<1e-7);assert.ok(Math.abs(geometry.before.y-geometry.after.y)<1e-7);assert.equal(geometry.crop,'block');assert.equal(geometry.rendering,'pixelated');report.zoom=geometry;
    await snapshot('zoom-pixels');
    await key('R',['alt']);await web.executeJavaScript('drawStill()');await snapshot('crop');
    // Pan by mouse, then resize a source-pixel corner while zoomed.
    const pan=await web.executeJavaScript(`(()=>{const b=stage.getBoundingClientRect();stage.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:1,clientX:b.left+320,clientY:b.top+220,bubbles:true}));stage.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:b.left+355,clientY:b.top+245,bubbles:true}));stage.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:b.left+355,clientY:b.top+245,bubbles:true}));return current().state.view;})()`);
    assert.equal(pan.x,35);assert.equal(pan.y,25);
    await key('R',['alt']);
    const corner=await web.executeJavaScript(`(()=>{const r=rect(),b=stage.getBoundingClientRect(),c=current().state.crop;const x=b.left+r.x+c.xmin*r.scale,y=b.top+r.y+c.ymin*r.scale;stage.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:1,clientX:x,clientY:y,bubbles:true}));stage.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:x+7*r.scale,clientY:y+5*r.scale,bubbles:true}));stage.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:x+7*r.scale,clientY:y+5*r.scale,bubbles:true}));return current().state.crop;})()`);
    assert.equal(corner.xmin,71);assert.equal(corner.ymin,41);report.crop=corner;
    await key('Escape');assert.equal(await web.executeJavaScript('current().state.cropVisible'),false);assert.ok(await web.executeJavaScript('!!current().state.crop'));
    const destination=path.join(root,'export čšž.mp4');let saveDefault;
    dialog.showSaveDialog=async(_window,options)=>{saveDefault=options.defaultPath;return {canceled:false,filePath:destination};};
    await key('S',['control']);await waitFor('$("exportMenu").open');await web.executeJavaScript(`$('exportChoices').children[1].click()`);await waitFor('!exportBusy',20000);assert.ok(fs.existsSync(destination));assert.ok(saveDefault.startsWith(app.getPath('downloads')));
    const outMeta=await Media.describe(destination);assert.equal(outMeta.width,corner.xmax-corner.xmin);assert.equal(outMeta.height,corner.ymax-corner.ymin);
    const exported=await Media.indexFrames(outMeta);assert.equal(exported.length,4);
    // Timeline zoom is independent from double click on the video.
    await web.executeJavaScript(`(()=>{const r=timeline.getBoundingClientRect(),s=current().state;const x=r.left+(s.in.time+s.out.time)/2/current().meta.duration*r.width;timeline.dispatchEvent(new MouseEvent('dblclick',{clientX:x,clientY:r.top+8,bubbles:true}));})()`);
    assert.equal(await web.executeJavaScript('current().state.timelineZoom'),true);
    await web.executeJavaScript(`timeline.dispatchEvent(new MouseEvent('dblclick',{clientX:20,clientY:780,bubbles:true}))`);assert.equal(await web.executeJavaScript('current().state.timelineZoom'),false);
    await key('F');assert.equal(await web.executeJavaScript('document.body.classList.contains("fill")'),true);assert.equal(win.isFullScreen(),false);await snapshot('window-fill');
    await key('F');assert.equal(await web.executeJavaScript('document.body.classList.contains("fill")'),false);
    await key('D');assert.equal(await web.executeJavaScript('video.playbackRate'),1.1);await key('S');assert.equal(await web.executeJavaScript('video.playbackRate'),1);
    // Playing seek response: record this machine's latency for the known 10-second GOP.
    await key('Space');await waitFor('!video.paused');
    report.seekMilliseconds=await web.executeJavaScript(`new Promise(resolve=>{const started=performance.now();video.addEventListener('seeked',()=>resolve(performance.now()-started),{once:true});seek(5);})`);
    report.speedChangeMilliseconds=await web.executeJavaScript(`(()=>{const t=performance.now();setSpeed(.1);return performance.now()-t;})()`);
    await key('Space');await waitFor('video.paused');
    await web.executeJavaScript(`openFiles(${JSON.stringify([audio])})`);await waitFor('loaded && current().meta.isAudio');assert.equal(await web.executeJavaScript('tabs.length'),2);
    const audioDest=path.join(root,'audio.mp3');dialog.showSaveDialog=async()=>({canceled:false,filePath:audioDest});
    await web.executeJavaScript('seekTo(1)');await waitFor('!video.seeking');await key('I');await waitFor('!!current().state.in');await web.executeJavaScript('seekTo(2)');await waitFor('!video.seeking');await key('O');await waitFor('!!current().state.out');await key('S',['control']);await waitFor('$("exportMenu").open');await web.executeJavaScript(`$('exportChoices').children[1].click()`);await waitFor('!exportBusy');assert.ok(fs.existsSync(audioDest));
    await key('W',['control']);assert.equal(await web.executeJavaScript('tabs.length'),1);await key('T',['control','shift']);await waitFor('tabs.length===2 && loaded');
    await web.executeJavaScript(`$('tabs').children[1].dispatchEvent(new MouseEvent('auxclick',{button:1,bubbles:true}))`);assert.equal(await web.executeJavaScript('tabs.length'),1);await key('T',['control','shift']);await waitFor('tabs.length===2 && loaded');
    assert.equal(await web.executeJavaScript('$("tabs").children[0].title'),source);
    await key(',',['control']);await waitFor('$("settings").open');
    await web.executeJavaScript(`document.querySelectorAll('.binding')[0].click()`);await key('P');await waitFor('settings.shortcuts.playPause === "KeyP"');await key('Escape');await key('P');await waitFor('video.paused');
    report.memory=app.getAppMetrics().map(metric=>({type:metric.type,pid:metric.pid,memory:metric.memory}));report.rendererErrors=errors;assert.deepEqual(errors,[]);
    await web.executeJavaScript('capture();persistSoon(true)');await pause(300);
    const stored=JSON.parse(fs.readFileSync(path.join(root,'DATA','history.json'),'utf8'));assert.equal(stored.tabs.length,2);assert.ok(stored.history.length>=2);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'DATA','settings.json'),'utf8')).shortcuts.playPause,'KeyP');
    await snapshot('final-tabs');report.success=true;fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2),'utf8');console.log(JSON.stringify({root,...report},null,2));app.quit();
  }catch(error){report.success=false;report.error=error.stack;report.rendererErrors=errors;if(web&&!web.isDestroyed())report.state=await web.executeJavaScript('({tab:current()?.state,currentTime:video.currentTime,seeking:video.seeking,seekTarget,stepTarget})');fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2),'utf8');console.error(error);if(web&&!web.isDestroyed())await snapshot('failure');Media.shutdown();app.exit(1);}
});
