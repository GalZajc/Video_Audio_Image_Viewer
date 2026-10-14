'use strict';
const {app,dialog,shell}=require('electron');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..','OUTPUT',`formats_validation_${new Date().toISOString().replace(/[:.]/g,'-')}`);fs.mkdirSync(root,{recursive:true});fs.mkdirSync(path.join(root,'DATA'),{recursive:true});fs.writeFileSync(path.join(root,'DATA','settings.json'),JSON.stringify({openAfterExport:false,escapeMaxFit:true}),'utf8');process.env.VAP_ROOT=root;process.env.VAP_TEST_MODE='1';
const {getWindow}=require('../main');const Media=require('../media');const pause=ms=>new Promise(r=>setTimeout(r,ms));let web;
async function wait(expression){for(let i=0;i<1000;i++){if(await web.executeJavaScript(expression))return;await pause(30);}throw new Error('Timed out: '+expression);}
app.whenReady().then(async()=>{try{
  let win;while(!(win=getWindow()))await pause(30);web=win.webContents;await wait('typeof config!=="undefined" && !!config');
  const files=[path.join(root,'legacy čšž.avi'),path.join(root,'audio ac3.mkv'),path.join(root,'zvok.flac')];
  await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x120:rate=24:duration=2','-c:v','mpeg4',files[0]]);
  await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x120:rate=24:duration=2','-f','lavfi','-i','sine=duration=2','-c:v','libx264','-c:a','ac3',files[1]]);
  await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=duration=2','-c:a','flac',files[2]]);
  const report=[];
  for(let i=0;i<files.length;i++){
    await web.executeJavaScript(`openFiles(${JSON.stringify([files[i]])})`);await wait('loaded && video.readyState>=2');
    await web.executeJavaScript('video.pause()');
    const result=await web.executeJavaScript('({path:current().meta.path,videoCodec:current().meta.videoCodec,audioCodec:current().meta.audioCodec,proxy:!!current().proxyUrl})');
    assert.equal(result.proxy,i<2);report.push(result);
    if(i===0){await web.executeJavaScript('seekTo(.3)');await wait('!video.seeking');await web.executeJavaScript('step(1)');await wait('!video.seeking && current().state.frameTime>.3');}
  }
  let revealed; shell.showItemInFolder=file=>{revealed=file;};
  await web.executeJavaScript(`$('tabs').children[0].dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);await pause(100);assert.equal(revealed,files[0]);
  // Enough tabs to force widths below Chrome's usual minimum; no hidden tail.
  const widths=await web.executeJavaScript(`(()=>{const originals=tabs.slice();for(let n=0;n<97;n++)tabs.push({...originals[n%3]});renderTabs();const r=$('tabs').getBoundingClientRect();const last=$('tabs').lastElementChild.getBoundingClientRect();const result={count:tabs.length,last:last.right,edge:r.right,first:$('tabs').firstElementChild.getBoundingClientRect().width};tabs=originals;renderTabs();return result;})()`);assert.equal(widths.count,100);assert.ok(widths.first<20);assert.ok(widths.last<=widths.edge+.01);
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({success:true,formats:report,tabs:widths},null,2),'utf8');console.log(JSON.stringify({root,formats:report,tabs:widths},null,2));app.quit();
}catch(e){console.error(e);if(web)fs.writeFileSync(path.join(root,'failure.json'),JSON.stringify(await web.executeJavaScript('({tabs:tabs.map(t=>({meta:t.meta,preparing:t.preparing,proxy:t.proxyUrl})),toast:$("toast").textContent,loaded,error:video.error?.message})'),null,2));Media.shutdown();app.exit(1);}});
