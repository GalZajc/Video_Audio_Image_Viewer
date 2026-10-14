'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','OUTPUT',`media_validation_${new Date().toISOString().replace(/[:.]/g,'-')}`);
fs.mkdirSync(root,{recursive:true});process.env.VAP_ROOT=root;
const Media=require('../media');
const config=require('../config.json');config.export={...config.export,matchSource:false};
const source=path.join(root,'čšž ČŠŽ.mp4');
async function frames(file,filter=''){
  const args=['-v','error','-i',file,'-map','0:v:0'];if(filter)args.push('-vf',filter);args.push('-f','framemd5','-');
  return (await Media.run('ffmpeg',args)).split('\n').filter(x=>x&&!x.startsWith('#')).map(x=>x.split(',').pop().trim());
}
test('real FFmpeg export: Unicode path, exact inclusive frames, pixel crops, audio and stream copy',async t=>{
  await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=320x240:rate=24:duration=12','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=12','-c:v','libx264','-crf','18','-g','144','-c:a','aac','-movflags','+faststart',source]);
  const meta=await Media.describe(source);assert.equal(meta.duration,12);
  const index=await Media.indexFrames(meta);assert.equal(index.length,288);
  const decode=JSON.parse(await Media.run('ffprobe',['-v','error','-select_streams','V:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',source]));
  assert.deepEqual([...index],decode.frames.map(f=>Number(f.best_effort_timestamp_time)));
  const input=await Media.getFrame(meta,7/24),output=await Media.getFrame(meta,15/24);
  await t.test('even crop is pixel-identical and includes both selected boundary frames',async()=>{
    const crop={xmin:8,ymin:6,xmax:68,ymax:56},dest=path.join(root,'even.mp4');
    await Media.exportMedia(meta,{in:input,out:output,crop},config.export,dest,()=>{});
    const actual=await frames(dest),expected=await frames(source,'trim=start_frame=7:end_frame=16,crop=60:50:8:6:exact=1');
    assert.equal(actual.length,9);assert.deepEqual(actual,expected);
    const result=await Media.describe(dest);assert.equal(result.width,60);assert.equal(result.height,50);assert.ok(result.audioCodec);
  });
  await t.test('odd crop is pixel-identical after required chroma expansion',async()=>{
    const crop={xmin:7,ymin:5,xmax:62,ymax:58},dest=path.join(root,'odd.mp4');
    await Media.exportMedia(meta,{in:input,out:output,crop},config.export,dest,()=>{});
    assert.deepEqual(await frames(dest),await frames(source,'trim=start_frame=7:end_frame=16,format=yuv444p,crop=55:53:7:5:exact=1'));
  });
  await t.test('full MP4 re-mux preserves all decoded video pixels',async()=>{
    const dest=path.join(root,'copy.mp4'),result=await Media.exportMedia(meta,{},config.export,dest,()=>{});
    assert.equal(result.videoCopy,true);assert.equal(result.audioCopy,true);assert.deepEqual(fs.readFileSync(dest),fs.readFileSync(source));assert.deepEqual(await frames(dest),await frames(source));
  });
  await t.test('same I/O frame exports exactly one cropped PNG from the original',async()=>{
    const crop={xmin:7,ymin:5,xmax:62,ymax:58},dest=path.join(root,'sličica.png');
    const single=await Media.getFrame(meta,7/24);
    await Media.exportMedia(meta,{in:single,out:single,crop},config.export,dest,()=>{});
    const actual=await frames(dest),expected=await frames(source,'trim=start_frame=7:end_frame=8,format=rgb24,crop=55:53:7:5:exact=1');
    assert.equal(actual.length,1);assert.deepEqual(actual,expected);
    const image=JSON.parse(await Media.run('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',dest]));assert.equal(image.streams[0].width,55);assert.equal(image.streams[0].height,53);
  });
  await t.test('MP3 default and exact audio interval export',async()=>{
    const audio=path.join(root,'zvok šž.mp3');await Media.run('ffmpeg',['-v','error','-y','-i',source,'-vn','-c:a','libmp3lame','-q:a','0',audio]);
    const audioMeta=await Media.describe(audio);assert.equal(audioMeta.isAudio,true);
    const dest=path.join(root,'clip.mp3');await Media.exportMedia(audioMeta,{in:{time:1},out:{time:2,end:2}},config.export,dest,()=>{});
    const result=await Media.describe(dest);assert.equal(result.audioCodec,'mp3');assert.ok(Math.abs(result.duration-1)<.08);
  });
  await t.test('VFR packet index matches decoded timestamps and out end is next actual frame',async()=>{
    const file=path.join(root,'vfr.mp4');await Media.run('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x120:rate=24:duration=1','-vf',"setpts='if(lt(N,8),N/(24*TB),(8/24+(N-8)/12)/TB)'",'-fps_mode','vfr','-c:v','libx264',file]);
    const m=await Media.describe(file),stamps=await Media.indexFrames(m),decoded=JSON.parse(await Media.run('ffprobe',['-v','error','-select_streams','V:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',file]));assert.deepEqual([...stamps],decoded.frames.map(f=>Number(f.best_effort_timestamp_time)));
    const f=await Media.getFrame(m,stamps[9]);assert.equal(f.end,stamps[10]);assert.ok(f.end-f.time>1/24);
    const dest=path.join(root,'vfrclip.mp4'),out=await Media.getFrame(m,stamps[15]);await Media.exportMedia(m,{in:f,out},config.export,dest,()=>{});assert.deepEqual(await frames(dest),await frames(file,'trim=start_frame=9:end_frame=16'));
  });
  fs.writeFileSync(path.join(root,'parameters.json'),JSON.stringify({config,source,checks:['Unicode','CFR/B-frames','VFR','inclusive trim','even/odd crop pixels','audio','stream copy']},null,2),'utf8');
});
