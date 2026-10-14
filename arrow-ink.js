(function(root){'use strict';const buffers=new WeakMap();
function draw(ctx,stroke,points,head){
 let canvas=buffers.get(ctx);if(!canvas){if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(1,1);else if(ctx.canvas?.ownerDocument)canvas=ctx.canvas.ownerDocument.createElement('canvas');else return false;buffers.set(ctx,canvas);}
 const width=stroke.width,pad=width+2;let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;for(const p of [...points,head.left,head.right,head.tip]){xmin=Math.min(xmin,p.x);ymin=Math.min(ymin,p.y);xmax=Math.max(xmax,p.x);ymax=Math.max(ymax,p.y);}const x=Math.floor(xmin-pad),y=Math.floor(ymin-pad),w=Math.ceil(xmax-x+pad),h=Math.ceil(ymax-y+pad);
 if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const ink=canvas.getContext('2d');ink.resetTransform();ink.clearRect(0,0,w,h);ink.save();ink.translate(-x,-y);ink.strokeStyle=ink.fillStyle='#fff';ink.lineWidth=width;ink.lineCap='round';ink.lineJoin='round';
 const half=stroke.arrowWidth/2,height=stroke.arrowHeight,length=Math.min(height,width*height/Math.max(half,.0001)),tailLength=length+width;
 let remaining=tailLength,split=points.length-1,join=points.at(-1);while(split>0){const a=points[split-1],b=points[split],d=Math.hypot(b.x-a.x,b.y-a.y);if(d>remaining){const f=remaining/d;join={x:b.x+(a.x-b.x)*f,y:b.y+(a.y-b.y)*f};break;}remaining-=d;split--;join=points[split];}
 const prefix=split>0?[...points.slice(0,split),join]:[],tail=[join,...points.slice(split)];
 const path=p=>{if(p.length<2)return;ink.beginPath();ink.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ink.lineTo(p[i].x,p[i].y);ink.stroke();};path(prefix);
 // Only the terminal arc is tapered. Older visits to the same pixels are
 // already present in this opaque coverage mask and cannot be erased.
 const c=Math.cos(head.angle),s=Math.sin(head.angle),extent=Math.hypot(w,h)+height+width,local=(a,b)=>({x:head.tip.x+a*c-b*s,y:head.tip.y+a*s+b*c});
 ink.save();ink.beginPath();for(const polygon of [[[-extent,-extent],[extent,-extent],[extent,extent],[-extent,extent]],[[-length,-extent],[width,-extent],[width,extent],[-length,extent]],[[-length,-length*half/height],[0,0],[-length,length*half/height]]]){polygon.forEach(([a,b],i)=>{const p=local(a,b);i?ink.lineTo(p.x,p.y):ink.moveTo(p.x,p.y);});ink.closePath();}ink.clip('evenodd');ink.lineCap='butt';path(tail);ink.restore();
 ink.beginPath();if(stroke.arrowStyle==='open'){ink.moveTo(head.tip.x,head.tip.y);for(const p of [head.left,head.leftInner,head.innerTip,head.rightInner,head.right])ink.lineTo(p.x,p.y);}else{ink.moveTo(head.tip.x,head.tip.y);ink.lineTo(head.left.x,head.left.y);ink.lineTo(head.right.x,head.right.y);}ink.closePath();ink.fill();ink.restore();ink.globalCompositeOperation='source-in';ink.fillStyle=stroke.color;ink.fillRect(0,0,w,h);ink.globalCompositeOperation='source-over';ctx.drawImage(canvas,x,y);return true;
}
const api={draw};if(typeof module!=='undefined')module.exports=api;else root.ArrowInk=api;
})(typeof window!=='undefined'?window:globalThis);
