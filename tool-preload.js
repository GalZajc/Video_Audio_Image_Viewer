'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tools',{
 init:()=>ipcRenderer.invoke('drawing-tool-init'),
 command:value=>ipcRenderer.send('drawing-tool-command',value),
 size:height=>ipcRenderer.send('drawing-tool-size',height),
 onState:callback=>ipcRenderer.on('drawing-tool-state',(_event,value)=>callback(value))
});
