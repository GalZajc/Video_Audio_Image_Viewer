'use strict';
const {contextBridge,ipcRenderer,webUtils}=require('electron');
const call=(name,value)=>ipcRenderer.invoke(name,value);
contextBridge.exposeInMainWorld('player',{
  drawingToolsSync:value=>ipcRenderer.send('drawing-tools-sync',value),onDrawingToolCommand:callback=>ipcRenderer.on('drawing-tool-command',(_event,value)=>callback(value)),
  onDrawingToolsRequest:callback=>ipcRenderer.on('drawing-tools-request',()=>callback()),onDrawingToolsOptions:callback=>ipcRenderer.on('drawing-tools-options',(_event,value)=>callback(value)),
  onTabDragReset:callback=>ipcRenderer.on('tab-drag-reset',()=>callback()),
  init:()=>call('init'),onTabDragTarget:callback=>ipcRenderer.on('tab-drag-target',(_event,value)=>callback(value)),tabDragTargetPosition:value=>ipcRenderer.send('tab-drag-target-position',value),dragContentReady:()=>ipcRenderer.send('drag-content-ready'),onTabDragPresentation:callback=>ipcRenderer.on('tab-drag-presentation',(_event,value)=>callback(value)), tabDragPreview:value=>ipcRenderer.send('tab-drag-preview',value),moveTab:value=>call('move-tab',value),subtitles:id=>call('subtitles',id),thumbnail:value=>call('thumbnail',value),pickFiles:()=>call('pick-files'),describe:file=>call('describe',file),
  frame:request=>call('frame',request),prepare:id=>call('prepare',id),prepareImage:id=>call('prepare-image',id),release:id=>call('release',id),
  reveal:id=>call('reveal',id),settings:value=>call('settings',value),saveSession:value=>call('save-session',value),
  exportFolders:id=>call('export-folders',id),folderFiles:value=>call('folder-files',value),confirmLeave:()=>call('confirm-leave'),deleteFile:id=>call('delete-file',id),export:request=>call('export',request),window:action=>ipcRenderer.send('window',action),
  fullscreen:()=>call('fullscreen'),fitWindow:value=>call('fit-video-window',value),
  filePath:file=>webUtils.getPathForFile(file),
  onTransferredTab:callback=>ipcRenderer.on('receive-tab',(_event,value)=>callback(value)),
  onSettings:callback=>ipcRenderer.on('settings-changed',(_event,value)=>callback(value)),
  onFiles:callback=>ipcRenderer.on('open-files',(_event,files)=>callback(files)),
  onProgress:callback=>ipcRenderer.on('progress',(_event,event)=>callback(event)),
  onMaximized:callback=>ipcRenderer.on('maximized',(_event,value)=>callback(value)),
  onFullscreen:callback=>ipcRenderer.on('fullscreen',(_event,value)=>callback(value))
});
