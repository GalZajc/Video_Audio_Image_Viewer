'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=process.env.VAP_REVIEW_ROOT||path.resolve(__dirname,'..'),config=require(path.join(root,'config.json')).review,host='127.0.0.1',url=`http://${host}:${config.port}`,data=path.join(root,'DATA'),stateFile=path.join(data,'review.json'),promptFile=path.join(data,'review-next-prompt.md'),token=crypto.randomBytes(32).toString('hex');fs.mkdirSync(data,{recursive:true});let writes=Promise.resolve();
function empty(){return {entries:{},custom:[],edits:{},archived:[]};}
function read(){try{return validate(JSON.parse(fs.readFileSync(stateFile,'utf8')).state);}catch{return empty();}}
function validate(value){return require('../review/model').validate(value,config);}
function send(res,status,value,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'"});res.end(type.startsWith('application/json')&&!Buffer.isBuffer(value)?JSON.stringify(value):value);}
function openBrowser(){if(process.argv.includes('--no-open'))return;const command=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';const child=spawn(command,[url],{detached:true,stdio:'ignore',windowsHide:true});child.on('error',error=>fs.writeFileSync(path.join(data,'review-server-error.txt'),error.stack,'utf8'));child.unref();}
const files=new Map([['/',['review/index.html','text/html']],['/review/model.js',['review/model.js','text/javascript']],['/review/app.js',['review/app.js','text/javascript']],['/review/style.css',['review/style.css','text/css']],['/review/features.json',['review/features.json','application/json']],['/assets/icon.png',['assets/icon.png','image/png']]]);
const server=http.createServer(async(req,res)=>{try{
  if(req.headers.host!==`${host}:${config.port}`)return send(res,403,{error:'Invalid host'});
  const pathname=new URL(req.url,url).pathname;
  if(req.method==='GET'&&pathname==='/api/identity')return send(res,200,{project:root});
  if(req.method==='GET'&&pathname==='/api/review')return send(res,200,{state:read(),token,project:root,saveDelayMs:config.saveDelayMs});
  if(req.method==='GET'&&/^\/screenshots\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(pathname))return send(res,200,await fs.promises.readFile(path.join(data,'review-screenshots',path.basename(pathname))),{'png':'image/png','jpg':'image/jpeg','webp':'image/webp'}[path.extname(pathname).slice(1)]);
  if(req.method==='POST'&&pathname==='/api/screenshot'){
    if(req.headers.origin!==url||req.headers['x-review-token']!==token)return send(res,403,{error:'Neveljavna seja.'});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>config.maxScreenshotBytes)return send(res,413,{error:'Slika je prevelika (največ 12 MB).'});chunks.push(chunk);}const bytes=Buffer.concat(chunks),ext=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;if(!ext)return send(res,400,{error:'Izberi PNG, JPEG ali WebP.'});const file=crypto.randomBytes(16).toString('hex')+'.'+ext;await fs.promises.mkdir(path.join(data,'review-screenshots'),{recursive:true});await fs.promises.writeFile(path.join(data,'review-screenshots',file),bytes);return send(res,200,{url:'/screenshots/'+file});
  }
  if(req.method==='POST'&&pathname==='/api/review'){
    if(req.headers.origin!==url||!String(req.headers['content-type']).startsWith('application/json'))return send(res,403,{error:'Invalid origin'});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>config.maxBodyBytes)return send(res,413,{error:'Tabela je prevelika.'});chunks.push(chunk);}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(body.token!==token)return send(res,403,{error:'Neveljavna seja. Osveži stran.'});const state=validate(body.state);if(typeof body.prompt!=='string'||Buffer.byteLength(body.prompt,'utf8')>config.maxBodyBytes)throw new Error('Neveljaven prompt.');
    writes=writes.catch(()=>{}).then(async()=>{const snapshot={schemaVersion:1,updatedAt:new Date().toISOString(),state};await fs.promises.writeFile(stateFile+'.tmp',JSON.stringify(snapshot,null,2),'utf8');await fs.promises.rename(stateFile+'.tmp',stateFile);await fs.promises.writeFile(promptFile+'.tmp',body.prompt,'utf8');await fs.promises.rename(promptFile+'.tmp',promptFile);});await writes;return send(res,200,{saved:true});
  }
  if(req.method==='GET'&&files.has(pathname)){const [file,type]=files.get(pathname);return send(res,200,await fs.promises.readFile(path.join(root,file)),type+'; charset=utf-8');}
  send(res,404,{error:'Not found'});
}catch(error){send(res,400,{error:error.message});}});
server.requestTimeout=15000;server.headersTimeout=10000;
server.on('error',async error=>{if(error.code==='EADDRINUSE'){try{const response=await fetch(url+'/api/identity');if(response.ok&&(await response.json()).project===root){openBrowser();return;}}catch{}}fs.writeFileSync(path.join(data,'review-server-error.txt'),error.stack,'utf8');process.exitCode=1;});
server.listen(config.port,host,()=>{fs.writeFileSync(path.join(data,'review-server.json'),JSON.stringify({url,project:root,pid:process.pid},null,2),'utf8');openBrowser();});
