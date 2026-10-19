'use strict';
const {app,dialog,nativeImage}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),bundle=process.env.VAP_BUNDLE||project,out=path.join(project,'OUTPUT','file_open_validation_'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(out,{recursive:true});process.env.VAP_ROOT=out;process.env.VAP_TEST_MODE='1';app.setPath('userData',path.join(out,'electron'));
const Main=require(path.join(bundle,'main')),Media=require(path.join(bundle,'media')),pause=ms=>new Promise(r=>setTimeout(r,ms)),dialogs=[],checks=[];
let win,response=1,described=0,dialogTimer,answering=false,dialogError=null;
const originalDescribe=Media.describe;Media.describe=(...args)=>{described++;return originalDescribe(...args);};
dialog.showMessageBox=()=>{throw Error('Unexpected native dialog');};
const js=s=>win.webContents.executeJavaScript(s);
async function wait(s){for(let i=0;i<750;i++){if(await js(s))return;await pause(20);}throw Error('Timeout '+s);}
function ok(s){checks.push(s);console.log('PASS '+s);}
app.whenReady().then(async()=>{try{
 while(!(win=Main.getWindow()))await pause(20);await wait('!!config && !!drawingOptions');
 assert.equal(await js('settings.maxOpenFiles'),20);await js('openSettings()');assert.equal(await js('$("maxOpenFiles").value'),'20');await js('$("settings").close()');ok('Existing settings receive default 20; setting is shown in the real UI');
 win.hide();Main.routeFiles([]);assert.equal(win.isVisible(),true);win.hide();assert.equal(dialogs.length,0);ok('Launching the app without files reveals the existing window without a dialog');
 const image=nativeImage.createFromBitmap(Buffer.alloc(16*16*4,255),{width:16,height:16}).toPNG();
 const files=Array.from({length:21},(_,i)=>{const file=path.join(out,`slika čšž ${i}.png`);fs.writeFileSync(file,image);return file;});
 dialogTimer=setInterval(async()=>{if(answering||!win||win.isDestroyed())return;answering=true;try{
   const options=await js('$("choiceDialog").open?({message:$("choiceTitle").textContent,detail:$("choiceDetail").textContent,defaultId:Number(document.activeElement.value),type:$("choiceButtons").children.length===1?"warning":"question",radius:getComputedStyle($("choiceDialog")).borderRadius}):null');
   if(options){dialogs.push(options);assert.equal(options.radius,'8px');if(options.type==='question')assert.equal(options.defaultId,1);
     if(dialogs.length===1){win.show();win.webContents.invalidate();await pause(150);fs.writeFileSync(path.join(out,'styled-confirmation.png'),(await win.webContents.capturePage()).toPNG());}
     if(response===1&&options.type==='question')await js('document.dispatchEvent(new KeyboardEvent("keydown",{code:"Enter",key:"Enter",bubbles:true,cancelable:true}))');
     else await js('$("choiceButtons").children['+response+'].click()');
   }
 }catch(error){dialogError=error;console.error(error);app.exit(1);}finally{answering=false;}},25);
 await js(`openFiles(${JSON.stringify(files.slice(0,2))})`);assert.equal(described,0);assert.equal(await js('tabs.length'),0);assert.equal(dialogs.at(-1).defaultId,1);ok('Canceled bulk opening does not probe any files or change tabs');
 response=0;await js(`openFiles(${JSON.stringify(files)})`);assert.equal(described,0);assert.equal(dialogs.at(-1).type,'warning');ok('21-file group is rejected even when every dialog response is affirmative');
 await js(`openFiles(${JSON.stringify(files.slice(0,20))})`);assert.equal(described,20);assert.equal(await js('tabs.length'),20);ok('Confirmed group at the 20-file boundary opens successfully');
 const before=dialogs.length;Main.routeFiles([files[0]]);await pause(150);Main.routeFiles([files[1]]);await pause(150);Main.routeFiles([files[2]]);
 for(let n=0;n<100&&dialogs.length===before;n++)await pause(25);
 await js('openingQueue');assert.equal(dialogs.length,before+1);assert.match(dialogs.at(-1).message,/3 datotek/);ok('Separate Explorer invocations are grouped into one confirmation');
 const prior=described;const beforeOversize=dialogs.length;
 for(const file of files)Main.routeFiles([file]);
 for(let n=0;n<100&&dialogs.length===beforeOversize;n++)await pause(25);
 await js('openingQueue');assert.equal(dialogs.at(-1).type,'warning');assert.equal(described,prior);ok('21 separate Explorer requests hit the same hard limit before file probing');
 await js('openSettings();$("maxOpenFiles").value="2";$("maxOpenFiles").dispatchEvent(new Event("change"))');await wait('settings.maxOpenFiles===2');await js('$("settings").close()');
 await js(`openFiles(${JSON.stringify(files.slice(0,3))})`);assert.equal(dialogs.at(-1).type,'warning');assert.equal(described,prior);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'DATA','settings.json'),'utf8')).maxOpenFiles,2);ok('Changing the UI setting persists and immediately enforces the new maximum');
 clearInterval(dialogTimer);assert.equal(dialogError,null);ok('Styled in-app dialogs focus Cancel; Enter safely cancels; no native dialog is used');
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({success:true,checks,dialogs,described},null,2),'utf8');console.log(JSON.stringify({success:true,out}));app.quit();
 }catch(error){console.error(error);Media.shutdown();app.exit(1);}});
