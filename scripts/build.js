'use strict';
const path=require('node:path');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
(async()=>{
  const root=path.resolve(__dirname,'..');
  if(process.platform==='win32'){
    execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'build-ocr-worker.ps1')],{windowsHide:true});
    fs.mkdirSync(path.join(root,'bin'),{recursive:true});
    for(const name of ['ffmpeg','ffprobe']){
      const target=path.join(root,'bin',name+'.exe');
      if(!fs.existsSync(target)){
        const source=execFileSync('powershell.exe',['-NoProfile','-Command',`$t=Get-Item -LiteralPath (Get-Command ${name}.exe).Source; if($t.Target){$t.Target}else{$t.FullName}`],{encoding:'utf8',windowsHide:true}).trim();
        fs.copyFileSync(source,target);
        const license=path.resolve(path.dirname(source),'..','LICENSE');
        if(fs.existsSync(license))fs.copyFileSync(license,path.join(root,'bin','FFmpeg-LICENSE.txt'));
      }
    }
    if(!fs.existsSync(path.join(root,'assets','icon.ico')))execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'make-icon.ps1')],{windowsHide:true});
  }
  const {packager}=await import('@electron/packager');
  const electronVersion=require('electron/package.json').version;
  const outputs=await packager({dir:root,out:path.join(root,'app'),name:'Video Audio Image Viewer',executableName:'VideoAudioImageViewer',electronVersion,platform:process.platform,arch:process.arch,overwrite:true,asar:false,icon:path.join(root,'assets','icon'),prune:true,
    ignore:[/^\/Test files(?:\/|$)/,/\.lnk$/i,/^\/app(?:\/|$)/,/^\/DATA(?:\/|$)/,/^\/OUTPUT(?:\/|$)/,/^\/tests(?:\/|$)/,/^\/scripts(?:\/|$)/,/^\/\.git(?:\/|$)/,/^\/node_modules(?:\/|$)/],
    win32metadata:{CompanyName:'Local',FileDescription:'Video Audio Image Viewer',ProductName:'Video Audio Image Viewer',InternalName:'VideoAudioImageViewer'}});
  console.log('Portable application: '+outputs[0]);
})().catch(error=>{console.error(error);process.exitCode=1;});
