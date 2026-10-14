'use strict';
// Fixed-point nearest-pixel mapping compatible with FFmpeg vf_rotate.c.
// See THIRD-PARTY-NOTICES.md for the rotation arithmetic attribution.
function rotationIntegers(degrees){
  const pi=3294199,unit=1048576;
  function sine(a){if(a<0)a=pi-a;a%=2*pi;if(a>=pi*3/2)a-=2*pi;if(a>=pi/2)a=pi-a;const square=Math.trunc(a*a/unit);let sum=0;for(let i=2;i<11;i+=2){sum+=a;a=Math.trunc(-a*square/(unit*i*(i+1)));}return Math.floor((sum+8)/16);}
  const angle=Math.trunc(-degrees*Math.PI/180*unit);return {c:sine(angle+Math.trunc(pi/2)),s:sine(angle)};
}
class PixelRaster{
  constructor(canvas){
    this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});if(!this.gl)throw new Error('WebGL2 unavailable');const gl=this.gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,`#version 300 es
      in vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`));
    gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,`#version 300 es
      precision highp float;precision highp int;
      uniform sampler2D media,ink;uniform ivec2 size,outSize,cs,origin,mirrors,inkOffset,inkSize;uniform int quarter,showInk;uniform vec4 background;out vec4 result;
      void main(){ivec2 p=ivec2(int(gl_FragCoord.x),outSize.y-1-int(gl_FragCoord.y));ivec2 q;
        if(quarter==0)q=p;else if(quarter==1)q=ivec2(size.x-1-p.y,p.x);else if(quarter==2)q=size-1-p;else if(quarter==3)q=ivec2(p.y,size.y-1-p.x);
        else q=ivec2((origin.x+p.y*cs.y+p.x*cs.x)>>16,(origin.y+p.y*cs.x-p.x*cs.y)>>16);
        bool padded=any(greaterThan(inkOffset,ivec2(0)));bool inside=all(greaterThanEqual(q,ivec2(padded?0:-1)))&&all(lessThanEqual(q,size-ivec2(padded?1:0)));if(inside)q=clamp(q,ivec2(0),size-1);
        if(mirrors.x==1)q.x=size.x-1-q.x;if(mirrors.y==1)q.y=size.y-1-q.y;vec4 base=inside?texelFetch(media,q,0):background;
        if(showInk==1){ivec2 iq=q+inkOffset;vec4 line=all(greaterThanEqual(iq,ivec2(0)))&&all(lessThan(iq,inkSize))?texelFetch(ink,iq,0):vec4(0.);float a=line.a+base.a*(1.-line.a);base=vec4(a>0.?(line.rgb*line.a+base.rgb*base.a*(1.-line.a))/a:vec3(0.),a);}result=base;
      }`));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
    const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
    this.textures=[0,1].map(unit=>{const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return texture;});gl.uniform1i(gl.getUniformLocation(this.program,'media'),0);gl.uniform1i(gl.getUniformLocation(this.program,'ink'),1);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  }
  draw(source,ink,r,state,background,showInk){
    const gl=this.gl;if(Math.max(r.bw,ink.width)>gl.getParameter(gl.MAX_TEXTURE_SIZE)||Math.max(r.bh,ink.height)>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error('Image exceeds GPU texture size');
    const stamp=[source,source.currentSrc||source.src,source.currentTime,showInk?ink._revision:0,r.bw,r.bh,state.rotation,state.flipX,state.flipY,background,showInk];if(this.stamp&&stamp.every((v,i)=>v===this.stamp[i]))return;this.stamp=stamp;
    if(this.canvas.width!==r.bw||this.canvas.height!==r.bh){this.canvas.width=r.bw;this.canvas.height=r.bh;}gl.viewport(0,0,r.bw,r.bh);gl.useProgram(this.program);
    this.uploads||=[];[source,ink].forEach((image,i)=>{const version=i===0?(source.currentTime??source.currentSrc??source.src):ink._revision,old=this.uploads[i],width=i?ink.width:r.w,height=i?ink.height:r.h;
      gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);
      if(i&&!showInk){if(!old){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));this.uploads[i]={width:1,height:1};}return;}
      if(old?.image===image&&old.version===version&&old.width===width&&old.height===height)return;
      const dirty=i&&ink._dirty;if(dirty&&old?.image===image&&old.width===width&&old.height===height&&dirty.right>dirty.x&&dirty.bottom>dirty.y){this.inkTile||=document.createElement('canvas');this.inkTile.width=dirty.right-dirty.x;this.inkTile.height=dirty.bottom-dirty.y;this.inkTile.getContext('2d').drawImage(ink,dirty.x,dirty.y,this.inkTile.width,this.inkTile.height,0,0,this.inkTile.width,this.inkTile.height);gl.texSubImage2D(gl.TEXTURE_2D,0,dirty.x,dirty.y,gl.RGBA,gl.UNSIGNED_BYTE,this.inkTile);this.partialInkUploads=(this.partialInkUploads||0)+1;}else{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);if(i)this.fullInkUploads=(this.fullInkUploads||0)+1;}
      this.uploads[i]={image,version,width,height};if(i)ink._dirty=null;
    });
    const rotation=((state.rotation||0)%360+360)%360,{c,s}=rotationIntegers(rotation),location=name=>gl.getUniformLocation(this.program,name);
    gl.uniform2i(location('inkOffset'),ink._offset?.x||0,ink._offset?.y||0);gl.uniform2i(location('inkSize'),ink.width,ink.height);gl.uniform2i(location('size'),r.w,r.h);gl.uniform2i(location('outSize'),r.bw,r.bh);gl.uniform2i(location('cs'),c,s);gl.uniform2i(location('origin'),Math.trunc(-(r.bw-1)*c/2)+Math.trunc(-(r.bh-1)*s/2)+32768*(r.w-1),Math.trunc((r.bw-1)*s/2)+Math.trunc(-(r.bh-1)*c/2)+32768*(r.h-1));gl.uniform2i(location('mirrors'),state.flipX?1:0,state.flipY?1:0);gl.uniform1i(location('quarter'),rotation%90===0?rotation/90:-1);gl.uniform1i(location('showInk'),showInk?1:0);gl.uniform4fv(location('background'),[0,2,4,6].map(i=>parseInt(background.slice(i+1,i+3),16)/255));gl.drawArrays(gl.TRIANGLES,0,6);
  }
}
class CpuPixelRaster{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.source=document.createElement('canvas');this.sourceCtx=this.source.getContext('2d',{willReadFrequently:true});}
  draw(source,ink,r,state,background,showInk){
    if(this.source.width!==r.w||this.source.height!==r.h){this.source.width=r.w;this.source.height=r.h;}const ctx=this.sourceCtx;ctx.clearRect(0,0,r.w,r.h);ctx.drawImage(source,0,0,r.w,r.h);
    if(this.canvas.width!==r.bw||this.canvas.height!==r.bh){this.canvas.width=r.bw;this.canvas.height=r.bh;}const input=ctx.getImageData(0,0,r.w,r.h),out=this.ctx.createImageData(r.bw,r.bh),src=new Uint32Array(input.data.buffer),dst=new Uint32Array(out.data.buffer),bg=new Uint8Array([0,2,4,6].map(i=>parseInt(background.slice(i+1,i+3),16))),fill=new Uint32Array(bg.buffer)[0];dst.fill(fill);
    const inkData=showInk?ink.getContext('2d').getImageData(0,0,ink.width,ink.height).data:null;
    const degrees=((state.rotation||0)%360+360)%360,{c,s}=rotationIntegers(degrees),x0=Math.trunc(-(r.bw-1)*c/2)+Math.trunc(-(r.bh-1)*s/2)+32768*(r.w-1),y0=Math.trunc((r.bw-1)*s/2)+Math.trunc(-(r.bh-1)*c/2)+32768*(r.h-1);
    for(let y=0;y<r.bh;y++)for(let x=0;x<r.bw;x++){let sx,sy;if(degrees===0){sx=x;sy=y;}else if(degrees===90){sx=r.w-1-y;sy=x;}else if(degrees===180){sx=r.w-1-x;sy=r.h-1-y;}else if(degrees===270){sx=y;sy=r.h-1-x;}else{sx=Math.floor((x0+y*s+x*c)/65536);sy=Math.floor((y0+y*c-x*s)/65536);}const padded=ink._offset?.x||ink._offset?.y,inside=padded?sx>=0&&sy>=0&&sx<r.w&&sy<r.h:sx>=-1&&sy>=-1&&sx<=r.w&&sy<=r.h;if(inside){sx=Math.max(0,Math.min(r.w-1,sx));sy=Math.max(0,Math.min(r.h-1,sy));}if(state.flipX)sx=r.w-1-sx;if(state.flipY)sy=r.h-1-sy;if(inside)dst[y*r.bw+x]=src[sy*r.w+sx];if(inkData){const ix=sx+(ink._offset?.x||0),iy=sy+(ink._offset?.y||0);if(ix>=0&&iy>=0&&ix<ink.width&&iy<ink.height){const i=(iy*ink.width+ix)*4,j=(y*r.bw+x)*4,a=inkData[i+3]/255,ba=out.data[j+3]/255,alpha=a+ba*(1-a);for(let k=0;k<3;k++)out.data[j+k]=alpha?(inkData[i+k]*a+out.data[j+k]*ba*(1-a))/alpha:0;out.data[j+3]=alpha*255;}}}this.ctx.putImageData(out,0,0);
  }
}
