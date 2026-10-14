'use strict';
const path=require('node:path'),{clampCrop}=require('./core'),Visual=require('./visual');
module.exports=function exportPlan(meta,request,settings,config){
  const sameFrame=!!(meta.isImage||!meta.isAudio&&request.in&&request.out&&((Number.isInteger(request.in.index)&&request.in.index===request.out.index)||Math.abs(request.in.time-request.out.time)<.000001));
  const mode=settings.contentMode||'video';if(!['video','videoOnly','audio','audioBlack'].includes(mode))throw new Error('Neveljaven način izvoza.');
  const audioOnly=!sameFrame&&(meta.isAudio||mode==='audio'),blackVideo=!sameFrame&&!meta.isAudio&&mode==='audioBlack',omitAudio=mode==='videoOnly';
  if((mode==='audio'||blackVideo)&&!meta.audioCodec)throw new Error('Posnetek nima zvočne sledi.');
  const format=meta.isImage?(settings.imageFormat||'png'):sameFrame?'png':audioOnly?settings.audioFormat:settings.videoFormat;
  const allowed=sameFrame?['png','jpg','webp']:audioOnly?['mp3','flac','wav','m4a','ogg']:['mp4','mkv','webm','mov'];if(!allowed.includes(format))throw new Error('Neveljaven izhodni format.');
  const start=meta.isImage?0:request.in?.time??0,end=meta.isImage?1:request.out?.end??meta.duration;if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>meta.duration+.01||end<=start)throw new Error('I mora biti pred O; interval mora vsebovati vsaj eno sličico.');
  const rotation=((Number(request.rotation)||0)%360+360)%360,r=Visual.geometry(1,1,meta.width||1,meta.height||1,{rotation,view:{zoom:1,x:0,y:0}}),rotatedCrop=request.cropSpace==='rotated';
  const crop=request.crop&&!audioOnly&&!blackVideo?clampCrop(request.crop,rotatedCrop?r.bw:meta.width,rotatedCrop?r.bh:meta.height):null;
  const hasCrop=crop&&(crop.xmin!==0||crop.ymin!==0||crop.xmax!==(rotatedCrop?r.bw:meta.width)||crop.ymax!==(rotatedCrop?r.bh:meta.height));
  const padX=Math.max(0,Math.min(Math.ceil(Math.hypot(meta.width||1,meta.height||1)),Math.round(request.annotationOffset?.x)||0)),padY=Math.max(0,Math.min(Math.ceil(Math.hypot(meta.width||1,meta.height||1)),Math.round(request.annotationOffset?.y)||0));
  const annotations=!!(request.annotationPath||request.annotationRaster),transformed=rotation!==0||request.flipX||request.flipY||annotations;
  const full=start<.000001&&Math.abs(end-meta.duration)<.00001,sameContainer=path.extname(meta.path).slice(1).toLowerCase()===format||format==='jpg'&&path.extname(meta.path).toLowerCase()==='.jpeg';
  const videoCopy=!audioOnly&&!blackVideo&&!sameFrame&&full&&!hasCrop&&!transformed&&(format==='mkv'||(['mp4','mov'].includes(format)&&['h264','hevc','av1','mpeg4'].includes(meta.videoCodec))||(format==='webm'&&['vp8','vp9','av1'].includes(meta.videoCodec)));
  const audioCompatible=format==='mkv'||format==='mov'||(format==='mp4'&&['aac','mp3','alac','ac3','flac','opus'].includes(meta.audioCodec))||(format==='webm'&&['opus','vorbis'].includes(meta.audioCodec))||(format==='mp3'&&meta.audioCodec==='mp3')||(format==='flac'&&meta.audioCodec==='flac')||(format==='wav'&&meta.audioCodec?.startsWith('pcm_'))||(format==='m4a'&&['aac','alac'].includes(meta.audioCodec))||(format==='ogg'&&['vorbis','opus','flac'].includes(meta.audioCodec));
  const audioCopy=full&&audioCompatible&&!omitAudio;
  const args=['-hide_banner','-v','error','-y'];if(start>0)args.push('-ss',start.toFixed(9));args.push('-i',request.sourceRasterPath||meta.path);
  if(blackVideo)args.push('-f','lavfi','-i',`color=c=black:s=${meta.width}x${meta.height}:r=${meta.fps||30}:d=${end-start}`);
  else if(request.annotationPath&&!audioOnly)args.push('-i',request.annotationPath);
  if(!sameFrame)args.push('-t',(end-start).toFixed(9));args.push('-map_metadata','0');
  const cw=hasCrop?crop.xmax-crop.xmin:rotation?r.bw:meta.width,ch=hasCrop?crop.ymax-crop.ymin:rotation?r.bh:meta.height,filters=[],imageAlpha=meta.isImage||rotation&&parseInt((settings.backgroundColor||'#000000ff').slice(7,9),16)<255;
  let pixel=meta.pixelFormat||'yuv420p';
  if(!audioOnly){
    if(videoCopy)args.push('-map','0:V:0','-c:v','copy');
    else{
      const supported=['yuv420p','yuv422p','yuv444p','yuv420p10le','yuv422p10le','yuv444p10le','gray','gray10le'];if(!supported.includes(pixel))pixel='yuv444p';
      if(sameFrame)pixel=imageAlpha?'rgba':'rgb24';else if(transformed||cw%2||ch%2||hasCrop&&(crop.xmin%2||crop.ymin%2))pixel=pixel.includes('10')?'yuv444p10le':'yuv444p';
      const addCrop=()=>{if(hasCrop)filters.push(`crop=${cw}:${ch}:${crop.xmin}:${crop.ymin}:exact=1`);};
      if(!blackVideo){
        filters.push('format='+(rotation||annotations?'rgba':pixel));if(!rotatedCrop)addCrop();if(request.flipX)filters.push('hflip');if(request.flipY)filters.push('vflip');
        if(rotation===90)filters.push('transpose=cclock');else if(rotation===180)filters.push('hflip','vflip');else if(rotation===270)filters.push('transpose=clock');
        else if(rotation){const background=settings.backgroundColor||'#000000ff';filters.push(`rotate=-${rotation}*PI/180:ow=${r.bw}:oh=${r.bh}:bilinear=0:c=0x${background.slice(1,7)}@${parseInt(background.slice(7,9),16)/255}`);}
        if((padX||padY)&&rotation%90===0){const x=rotation%180===0?padX:padY,y=rotation%180===0?padY:padX;filters.push(`crop=${r.bw}:${r.bh}:${x}:${y}:exact=1`);}if(rotatedCrop)addCrop();
      }
      if(blackVideo||rotation||annotations)filters.push('format='+pixel);
      if(request.annotationPath&&!blackVideo){args.push('-filter_complex',`[0:V:0]format=rgba${padX||padY?`,pad=${meta.width+2*padX}:${meta.height+2*padY}:${padX}:${padY}:color=0x${(settings.backgroundColor||'#000000ff').slice(1,7)}@${parseInt((settings.backgroundColor||'#000000ff').slice(7,9),16)/255}`:''}[base];[base][1:v]overlay=0:0:format=auto,${filters.join(',')}[out]`,'-map','[out]');}
      else args.push('-map',blackVideo?'1:v:0':'0:V:0','-vf',filters.join(','));
      if(sameFrame){args.push('-frames:v','1','-an');if(format==='jpg')args.push('-c:v','mjpeg','-q:v','2','-pix_fmt','yuvj444p');else if(format==='webp')args.push('-c:v','libwebp','-lossless','1');else args.push('-c:v','png','-pix_fmt',imageAlpha?'rgba':'rgb24');if(format!=='webp')args.push('-update','1');}
      else{
        const balanced=settings.matchSource!==false,sourceBpp=(meta.videoBitrate||0)/Math.max(1,meta.width*meta.height*(meta.fps||30));
        // Preserve small text: quality takes priority over an unreliable source bitrate cap.
        const crf=balanced?Math.round(Math.max(config.export.minCRF,Math.min(config.export.maxCRF,config.export.balancedCRF-2*Math.log2((sourceBpp||.12)/.12)))):config.export.videoCRF;
        if(format==='webm'){args.push('-c:v','libvpx-vp9','-row-mt','1','-b:v','0');if(balanced)args.push('-crf',String(crf+6));else args.push('-lossless','1');}
        else args.push('-c:v','libx264','-preset',config.export.preset,'-crf',String(crf));
        args.push('-pix_fmt',pixel,'-fps_mode','passthrough');
        for(const [key,flag] of [['colorSpace','-colorspace'],['colorTransfer','-color_trc'],['colorPrimaries','-color_primaries']])if(meta[key]&&meta[key]!=='unknown')args.push(flag,meta[key]);
        if(request.in?.index!==undefined&&request.out?.index!==undefined)args.push('-frames:v',String(request.out.index-request.in.index+1));
      }
      args.push('-threads',String(config.export.threads));
    }
  }else args.push('-vn');
  if(meta.audioCodec&&!sameFrame&&!omitAudio){
    args.push('-map',meta.isAudio?'0:a:0':'0:a?');const rate=Math.max(64000,Math.min(320000,meta.audioBitrate||config.export.audioBitrate));
    if(audioCopy)args.push('-c:a','copy');else if(format==='mp3')args.push('-c:a','libmp3lame',...(settings.matchSource!==false?['-b:a',String(rate)]:['-q:a',String(config.export.audioQuality)]));
    else if(format==='flac')args.push('-c:a','flac');else if(format==='wav')args.push('-c:a','pcm_s24le');else if(format==='m4a'&&settings.matchSource===false)args.push('-c:a','alac');else if(['webm','ogg'].includes(format))args.push('-c:a','libopus','-b:a',String(rate));else if(format==='mkv'&&settings.matchSource===false)args.push('-c:a','flac');else args.push('-c:a','aac','-b:a',String(rate));
  }else if(omitAudio)args.push('-an');
  if(['mp4','mov','m4a'].includes(format))args.push('-movflags','+faststart');args.push('-progress','pipe:1','-nostats');
  const binaryCopy=sameContainer&&(meta.isImage&&!hasCrop&&!transformed||!meta.isImage&&full&&!hasCrop&&!transformed&&!blackVideo&&(meta.isAudio?audioCopy:videoCopy&&mode==='video'&&(!meta.audioCodec||audioCopy)));
  return {args,format,start,end,crop:hasCrop?crop:null,videoCopy,audioCopy,source:meta.path,singleFrame:sameFrame,rotation,binaryCopy,operation:binaryCopy?'copy-file':'ffmpeg',audioOnly,blackVideo,contentMode:mode};
};
