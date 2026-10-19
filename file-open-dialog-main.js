'use strict';
const {randomUUID}=require('node:crypto');

// Keep the opening guard in the main process, but draw its dialogs in the viewer.
module.exports=function createFileOpenDialog(ipcMain){
  const pending=new Map();
  ipcMain.on('file-open-dialog-result',(event,{id,response}={})=>{
    const request=pending.get(id);
    if(request&&event.sender===request.sender&&Number.isInteger(response)&&response>=0&&response<request.count)request.finish(response);
  });
  return function showFileOpenDialog(owner,options){
    if(owner.isDestroyed())return Promise.resolve({response:options.cancelId});
    return new Promise(resolve=>{
      const id=randomUUID(),sender=owner.webContents;
      const cancel=()=>finish(options.cancelId);
      function finish(response){
        if(!pending.delete(id))return;
        owner.removeListener('closed',cancel);
        sender.removeListener('render-process-gone',cancel);
        sender.removeListener('did-start-navigation',cancel);
        resolve({response});
      }
      pending.set(id,{sender,count:options.buttons.length,finish});
      owner.once('closed',cancel);sender.once('render-process-gone',cancel);sender.once('did-start-navigation',cancel);
      sender.send('file-open-dialog',{id,options});
    });
  };
};
