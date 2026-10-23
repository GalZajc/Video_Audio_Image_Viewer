'use strict';
const {app,nativeImage}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),bundle=process.env.VAP_BUNDLE||project,out=path.join(project,'OUTPUT','media_lifetime_'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(out,{recursive:true});process.env.VAP_ROOT=out;process.env.VAP_TEST_MODE='1';app.setPath('userData',path.join(out,'electron'));
const Main=require(path.join(bundle,'main')),Media=require(path.join(bundle,'media')),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const js=(win,source)=>win.webContents.executeJavaScript(source.includes('await ')&&!source.startsWith('(async')?'(async()=>{'+source+'})()':source),checks=[],timings=[];
async function wait(win,source){for(let i=0;i<1000;i++){if(await js(win,source))return;await pause(10);}throw Error('Timeout '+source);}
function ok(text){checks.push(text);console.log('PASS '+text);}
app.whenReady().then(async()=>{try{
 let first;while(!(first=Main.getWindow()))await pause(20);await wait(first,'!!config && !!drawingOptions');
 const folder=path.join(out,'slike čšž');fs.mkdirSync(folder);const png=nativeImage.createFromBitmap(Buffer.alloc(640*360*4,255),{width:640,height:360}).toPNG();
 const files=[0,1,2].map(i=>{const file=path.join(folder,`${i}.png`);fs.writeFileSync(file,png);return file;});
 await js(first,`openFiles([${JSON.stringify(files[0])}])`);await wait(first,'loaded');await js(first,'persistSoon(true)');
 await js(first,'navigateFolder(1)');await wait(first,'loaded');await js(first,'window.snapshotB=serial(current());persistSoon(true)');
 const second=Main.createWindow();await wait(second,'!!config && !!drawingOptions');await js(second,`openFiles([${JSON.stringify(files[0])}])`);await wait(second,'loaded');await js(second,'persistSoon(true)');
 await js(first,'navigateFolder(-1)');await wait(first,'loaded');
 // Model a delayed session write arriving while A is already active again.
 await js(first,'clearTimeout(saveTimer);window.player.saveSession({tabs:[window.snapshotB],active:0,closed:[],history:[]})');
 await js(second,'closeTab();await persistSoon(true)');
 const status=await js(first,'fetch(current().meta.url,{cache:"no-store"}).then(response=>response.status)');
 assert.equal(status,200,'An obsolete saved session and another window releasing A must not invalidate the visible A');
 await js(first,'window.lifetimeErrors=[];const originalError=showError;showError=error=>{window.lifetimeErrors.push(String(error.message||error));originalError(error)};void 0;');
 ok('A displayed image remains readable after delayed session persistence and release from another window');
 let conversions=0;const run=Media.run;Media.run=(tool,args,...rest)=>{if(tool==='ffmpeg'&&args.includes('png'))conversions++;return run(tool,args,...rest);};
 for(let i=0;i<24;i++){
   const result=await js(first,'(async()=>{const start=performance.now();await navigateFolder(1);if(!loaded)await new Promise(resolve=>{const timer=setInterval(()=>{if(loaded){clearInterval(timer);resolve()}},5)});return {ms:performance.now()-start,status:await fetch(current().meta.url,{cache:"no-store"}).then(r=>r.status)}})()');
   assert.equal(result.status,200);timings.push(result.ms);
 }
 await pause(250);assert.deepEqual(await js(first,'window.lifetimeErrors'),[]);assert.equal(conversions,0);Media.run=run;
 ok('24 visible-image transitions complete without lost handles, error toasts or fallback FFmpeg conversions');
 const video=path.join(folder,'3.mp4'),audio=path.join(folder,'4.wav');
 await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=black:size=160x90:rate=24','-t','5','-pix_fmt','yuv420p',video]);
 await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=5',audio]);
 await js(first,'current().state.mediaFilter=["image","video","audio"];void 0');
 let proxies=0;const proxy=Media.proxy;Media.proxy=(...args)=>{proxies++;return proxy(...args);};const mixed=[];
 for(let i=0;i<15;i++){
   const result=await js(first,'(async()=>{const start=performance.now();await navigateFolder(1);const navigationMs=performance.now()-start;await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{clearInterval(timer);reject(Error("Visible frame timeout"))},10000);const timer=setInterval(()=>{if(loaded&&(current().meta.isImage?$("image").complete&&$("image").naturalWidth>0:video.readyState>=2)){clearTimeout(timeout);clearInterval(timer);resolve()}},5)});return {kind:current().meta.kind,navigationMs,preview:previewSource,playing:current().state.playing,ended:video.ended,ms:performance.now()-start,status:await fetch(current().meta.url,{cache:"no-store"}).then(r=>r.status)}})()');
   assert.equal(result.status,200);if(result.kind!=='video')assert.equal(result.preview,'');if(result.kind!=='image'&&!result.ended)assert.equal(result.playing,true);mixed.push(result);
 }
 Media.proxy=proxy;assert.equal(proxies,0);assert.deepEqual(await js(first,'window.lifetimeErrors'),[]);
 ok('15 mixed video/audio/image transitions decode successfully without error toasts or fallback proxies');
 await js(first,'await navigateFolder(-1);await navigateFolder(-1)');await wait(first,'loaded && video.readyState>=2');
 await js(first,'preparePreview();previewDesired={time:.25,generation:previewGeneration};pumpPreview()');await wait(first,'previewFrames.size>0');
 await js(first,'navigateFolder(1)');await wait(first,'loaded && current().meta.isAudio');assert.equal(await js(first,'previewSource'),'');assert.equal(await js(first,'previewWarm.length'),0);
 ok('Video timeline preview still decodes on demand; audio creates no preview decoder or storyboard');
 await js(first,'persistSoon(true)');const retained=await js(first,'current().meta.id');
 await js(first,'closeTab();await persistSoon(true)');assert.equal(Media.mediaById.has(retained),false);
 ok('Media is released after its final owning tab closes');
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({success:true,checks,timings,mixed,conversions,proxies},null,2),'utf8');console.log(JSON.stringify({success:true,out,timings,mixed}));Media.shutdown();app.exit(0);
 }catch(error){console.error(error);Media.shutdown();app.exit(1);}});
