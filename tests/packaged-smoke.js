"use strict";
const {app}=require('electron'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),bundle=path.join(project,'app','Video Audio Image Viewer-win32-x64','resources','app'),root=path.join(project,'OUTPUT','packaged_validation_'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(root,{recursive:true});
fs.mkdirSync(path.join(root,'DATA'),{recursive:true});
fs.writeFileSync(path.join(root,'DATA','settings.json'),JSON.stringify({schemaVersion:3,shortcuts:{faster:'Shift+KeyD',draw:'KeyD',export:'Ctrl+KeyM',mute:'KeyU'}}),'utf8');
process.env.VAP_ROOT=root;process.env.VAP_TEST_MODE='1';
const {getWindow}=require(path.join(bundle,'main.js')),Media=require(path.join(bundle,'media.js')),pause=ms=>new Promise(r=>setTimeout(r,ms));let win,web;
async function wait(expression){for(let n=0;n<500;n++){if(await web.executeJavaScript(expression))return;await pause(30);}throw new Error('Timed out: '+expression);}
app.whenReady().then(async()=>{try{
  while(!(win=getWindow()))await pause(30);web=win.webContents;await wait('typeof config!=="undefined" && !!drawingOptions');
  const image=path.join(root,'paket čšž.png');await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc=size=120x80:rate=1','-frames:v','1',image]);
  await web.executeJavaScript(`openFiles(${JSON.stringify([image])})`);await wait('loaded && current().meta.isImage');
  await web.executeJavaScript('runAction("draw");drawingOptions.tool="text";renderDrawingMenu()');assert.equal(await web.executeJavaScript('$("textOptions").hidden'),false);
  const shortcuts=await web.executeJavaScript('settings.shortcuts');assert.equal(shortcuts.export,'Ctrl+KeyS');assert.equal(shortcuts.faster,'KeyD');assert.equal(shortcuts.draw,'Ctrl+KeyD');assert.equal(shortcuts.mute,'KeyU');assert.equal(await web.executeJavaScript('settings.schemaVersion'),4);
  await web.executeJavaScript('openSettings()');assert.ok(await web.executeJavaScript('$("settings").open'));
  const bounds=await web.executeJavaScript('(()=>{const r=$("settings").getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight};})()');
  assert.equal(bounds.top,0);assert.equal(bounds.bottom,bounds.viewport);assert.equal(bounds.height,bounds.viewport);
  await pause(150);fs.writeFileSync(path.join(root,'packaged-settings.png'),(await web.capturePage()).toPNG());
  win.setSize(720,320);await pause(150);
  const compact=await web.executeJavaScript('(()=>{const r=$("settings").getBoundingClientRect();return {top:r.top,bottom:r.bottom,viewport:innerHeight,scroll:$("settings").scrollHeight>$("settings").clientHeight};})()');
  assert.equal(compact.top,0);assert.equal(compact.bottom,compact.viewport);assert.ok(compact.scroll);
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({success:true,bundle,shortcuts,bounds,compact,image:true,text:true},null,2),'utf8');
  console.log(JSON.stringify({success:true,root}));app.quit();
}catch(e){console.error(e);Media.shutdown();app.exit(1);}});
