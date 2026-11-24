(() => {
  "use strict";
  const cache=new Map();
  function loadImage(data) {
    if(typeof data!=="string" || data.length>1500000 || !/^data:image\/(?:png|webp|jpeg);base64,[a-z0-9+/]+=*$/i.test(data)) return Promise.reject(Error("Invalid layer image"));
    if(cache.has(data)) return cache.get(data).promise;
    const img=new Image(), record={img:null,promise:null};
    img.src=data;
    record.promise=img.decode().then(()=>{record.img=img;document.dispatchEvent(new Event("tonepress:layer-image"));return img;});
    if(cache.size>=32) cache.delete(cache.keys().next().value);
    cache.set(data,record);return record.promise;
  }
  function getImage(data) {
    if(!data) return null;
    if(!cache.has(data)) loadImage(data).catch(()=>{});
    return cache.get(data)?.img;
  }
  window.TonepressLayerImages={load:loadImage};
  const audioCache=new WeakMap();
  function loadAudio(file) {
    if(!file || file.size>96*1024*1024) return Promise.resolve(null);
    if(audioCache.has(file)) return audioCache.get(file).promise;
    const record={audio:null,promise:null};
    record.promise=(async()=>{
      try {
        const decoder=new OfflineAudioContext(1,1,16000);
        record.audio=await decoder.decodeAudioData(await file.arrayBuffer());
      } catch { /* A silent video or an unsupported audio track has no spectrum. */ }
      return record.audio;
    })();
    audioCache.set(file,record);
    return record.promise;
  }
  window.TonepressLayerAudio={load:loadAudio,peek(file,ready){
    if(!file || file.size>96*1024*1024) return null;
    if(!audioCache.has(file)) loadAudio(file).then(ready);
    return audioCache.get(file)?.audio;
  }};
  const lin=(key,label,value,min,max)=>({kind:"range",key,label,value,min,max,step:1});
  const color=(key,label,value)=>({kind:"color",key,label,value});
  const select=(key,label,choices)=>({kind:"select",key,label,value:choices[0][0],options:choices.map(([value,label])=>({value,label}))});
  const image={kind:"image",key:"image",label:"素材图像",value:""};
  const tint=color("tint","起始颜色","#27ec83"), end=color("end","终点颜色","#4618ba");
  const x=lin("positionX","横向位置",50,0,100),y=lin("positionY","纵向位置",50,0,100);
  const angle=lin("angle","图层角度",30,0,360), speed=lin("speed","图案速度",30,0,100);
  const invert=select("invert","反转遮罩",[["no","正常遮罩"],["yes","反向遮罩"]]);
  const group="素材与生成器", groupEnglish="Content & generators";
  const definitions={};
  function define(id,english,name,description,scaleLabel,controls,options={}) {
    definitions["mosh-"+id]={english,name,description,scaleLabel,size:8,strength:82,group,groupEnglish,controls,overlay:id!=="texture",...options};
  }
  define("media","Media","素材叠图","导入第二张静态图像并调整大小和位置。","素材尺寸",[image,x,y,select("tileMedia","重复素材",[["yes","重复平铺"],["no","单次放置"]])],{strength:100});
  define("caption","Caption","字幕叠印","在画面上排印自己的文字，可调位置和颜色。","文字大小",[{kind:"text",key:"caption",label:"字幕内容",value:"",maxLength:96},color("ink","文字颜色","#ffffff"),x,y],{strength:100});
  define("audio-visualizer","Audio Visualizer","音频频谱","频谱条读取视频里的声音。请导入含音轨且小于 96 MB 的视频。","频段数量",[color("tint","起始颜色","#00ff00"),color("middle","中间颜色","#ffff00"),color("end","终点颜色","#ff0000"),lin("gain","频谱增益",70,10,100)],{timed:true,strength:100});
  define("texture","Texture","表面纹理","在画面上乘印自选纹理图，或试用内置程序纸纹。","纹理尺度",[image,angle],{strength:65});
  define("color-gradient","Color Gradient","渐变色层","叠加可自选两端颜色的线性或径向渐变。","渐变跨度",
    [color("tint","起始颜色","#d16ba5"),color("end","终点颜色","#c0c8ee"),angle,select("shape","渐变形态",[["linear","直线渐变"],["radial","径向渐变"]])],{strength:37});
  define("noise","Noise","云状噪声","多层平滑噪声在两种颜色之间流动。","噪声尺度",
    [color("tint","起始颜色","#0b0b2a"),color("end","终点颜色","#ffa8cb"),speed],{timed:true});
  define("god-rays","God Rays","放射光束","从自定的光源位置投出长短交错的光束。","光束密度",
    [color("tint","光束颜色","#fff2c4"),x,y,speed],{timed:true});
  define("plasma","Plasma","等离子色场","相互干涉的色波随时间生成流动的色场。","色波密度",
    [color("tint","起始颜色","#2b0a6b"),color("end","终点颜色","#ff9b32"),speed],{timed:true});
  define("grid","Grid","网格发生器","以可旋转的移动网格或条纹覆盖画面。","网格间距",
    [color("tint","起始颜色","#9cecfa"),lin("angle","图层角度",0,0,360),speed,select("cross","网格样式",[["grid","双向网格"],["lines","单向条纹"]])],{timed:true,strength:88});
  define("dots","Dots","点阵发生器","平铺独立于原图亮度的圆点，可改变颜色、角度和大小。","圆点间距",
    [color("tint","起始颜色","#ffc358"),lin("angle","图层角度",0,0,360),lin("dotSize","圆点比例",48,5,92)],{strength:95});
  const showMatte=select("showMatte","观看遮罩",[["hide","合成画面"],["show","黑白遮罩"]]);
  const mask={mask:true,strength:100,group:"局部遮罩",groupEnglish:"Layer masks"};
  define("mask","Mask","图像遮罩","导入灰度图。亮处保留上一层，暗处透出下方画面。","遮罩缩放",[image,invert],mask);
  define("mask-blocks","Mask Blocks","动态块遮罩","使用随时间变化的矩形块局部显示上一层。","遮罩块大小",[lin("speed","图案速度",25,0,100),invert],{...mask,timed:true});
  const emptyStencil="0".repeat(64);
  define("mask-draw","Mask Draw","手绘遮罩","在八乘八画板上点亮要保留的区域，可导入黑白图案。","边缘羽化",[{kind:"bitmap",key:"stencil",label:"遮罩画板",value:emptyStencil,importLabel:"导入遮罩图案"},invert],mask);
  define("chroma-key","ChromaKey","色度抠像","用色差和容差去除选定颜色；作为首层时导出透明区域。","颜色容差",[color("keyColor","要去除的颜色","#46ff03"),invert],mask);
  for(const def of Object.values(definitions)) if(def.mask)def.controls.push(showMatte);
  const clamp=v=>Math.max(0,Math.min(1,v));
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const hash=(x,y)=>{let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  const mix=(a,b,t)=>a+(b-a)*t;
  function noise(x,y){
    const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);
    return mix(mix(hash(a,b),hash(a+1,b),s),mix(hash(a,b+1),hash(a+1,b+1),s),t);
  }
  const scratch=new WeakMap();
  function buffer(owner,w,h){
    let c=scratch.get(owner);if(!c){c=document.createElement("canvas");scratch.set(owner,c);}
    if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;return c;
  }
  function pattern(art,s){
    // Smooth generators render to a bounded field and interpolate to the final output size.
    const {width:w,height:h}=s,k=Math.min(1,480/Math.max(w,h));
    const c=buffer(art,Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k)));
    const ctx=c.getContext("2d"),im=ctx.createImageData(c.width,c.height),p=im.data;
    const a=rgb(s.tint),b=rgb(s.end),time=s.time*s.speed/80,freq=1+s.size*.47;
    const plasma=s.type==="mosh-plasma";
    for(let yy=0,i=0;yy<c.height;yy++){
      const y=yy/c.height*freq;
      for(let xx=0;xx<c.width;xx++,i+=4){
        const x=xx/c.height*freq;
        const n=.56*noise(x+time,y)+.29*noise(x*2.1,y*2.1-time)+.15*noise(x*4.4+time,y*4.4);
        const wave=clamp(.5+(Math.sin(x*1.34+time)+Math.sin(y*1.52-time)+Math.sin(2.5*Math.hypot(x-freq*.38+Math.cos(time)*.7,y-freq*.5)))/6);
        const t=plasma ? Math.pow(wave,.7) : Math.pow(n,.61);
        const peak=plasma ? Math.pow(Math.max(0,1-Math.abs(t-.59)*3),1.6) : 0;
        const flare=[255,135,218];
        for(let j=0;j<3;j++)p[i+j]=mix(mix(a[j],b[j],t),flare[j],peak*.68);
        p[i+3]=255*(plasma ? .07+.9*peak : clamp((n-.13)*1.48));
      }
    }
    ctx.putImageData(im,0,0);art.getContext("2d").drawImage(c,0,0,w,h);
  }
  function spectrum(ctx,s) {
    const audio=s.audioBuffer;
    if(!audio) return;
    const samples=audio.getChannelData(0), start=Math.floor(s.time*audio.sampleRate);
    const bins=Math.max(8,Math.round(18+s.size*9)), half=Math.ceil(bins/2), fftSize=512;
    const spacing=s.width/bins, mid=s.height/2;
    // Mirror the same measured spectrum around the centre of the frame.
    for(let band=0;band<half;band++){
      const ratio=band/Math.max(1,half-1);
      const hz=65*(Math.min(6800,audio.sampleRate*.45)/65)**ratio;
      const coef=2*Math.cos(2*Math.PI*hz/audio.sampleRate);
      let q1=0,q2=0;
      for(let n=0;n<fftSize;n++){
        const z=(samples[start+n]||0)*(.5-.5*Math.cos(2*Math.PI*n/(fftSize-1)))+coef*q1-q2;
        q2=q1;q1=z;
      }
      const magnitude=Math.sqrt(Math.max(0,q1*q1+q2*q2-coef*q1*q2))/fftSize;
      const length=s.height*.33*clamp(Math.log1p(magnitude*s.gain*2)/2.1)*(1-.7*ratio);
      if(length<.8)continue;
      const grad=ctx.createLinearGradient(0,mid-length,0,mid+length);
      grad.addColorStop(0,s.end);grad.addColorStop(.25,s.middle);grad.addColorStop(.5,s.tint);
      grad.addColorStop(.75,s.middle);grad.addColorStop(1,s.end);ctx.fillStyle=grad;
      for(const x of [s.width/2-(band+1)*spacing,s.width/2+band*spacing])ctx.fillRect(x,mid-length,spacing*.83,length*2);
    }
  }
  function matte(input,art,s){
    const ctx=art.getContext("2d"),{width:w,height:h}=s;
    ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
    if(s.type==="mosh-mask"){
      const img=getImage(s.image);
      ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
      if(img){
        const scale=s.size/8;ctx.drawImage(img,w*(1-scale)/2,h*(1-scale)/2,w*scale,h*scale);
        const im=ctx.getImageData(0,0,w,h),p=im.data;
        for(let i=0;i<p.length;i+=4) p[i]=p[i+1]=p[i+2]=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
        ctx.putImageData(im,0,0);
      }
    } else if(s.type==="mosh-chroma-key"){
      const im=input.getContext("2d").getImageData(0,0,w,h),p=im.data,k=rgb(s.keyColor),threshold=s.size*12;
      for(let i=0;i<p.length;i+=4){
        const distance=Math.hypot(p[i]-k[0],p[i+1]-k[1],p[i+2]-k[2]);
        p[i]=p[i+1]=p[i+2]=255*clamp((distance-threshold)/28);p[i+3]=255;
      }
      ctx.putImageData(im,0,0);
    } else if(s.type==="mosh-mask-draw"){
      const feather=(s.size-2)/14, bits=Array.from(s.stencil,Number);
      const ramp=f=>{const t=feather ? clamp((f-.5)/feather+.5) : Number(f>=.5);return t*t*(3-2*t);};
      const axis=length=>Array.from({length},(_,v)=>{
        const p=(v+.5)*8/length-.5,cell=Math.floor(p);
        return [Math.max(0,cell),Math.min(7,cell+1),ramp(p-cell)];
      });
      const xs=axis(w),ys=axis(h), im=ctx.createImageData(w,h),px=im.data;
      for(let yy=0,i=0;yy<h;yy++){
        const [top,bottom,v]=ys[yy];
        for(let xx=0;xx<w;xx++,i+=4) {
          const [left,right,u]=xs[xx];
          const value=255*mix(mix(bits[8*top+left],bits[8*top+right],u),mix(bits[8*bottom+left],bits[8*bottom+right],u),v);
          px[i]=px[i+1]=px[i+2]=value;px[i+3]=255;
        }
      }
      ctx.putImageData(im,0,0);
    } else {
      const cell=Math.max(3,h*(.035+s.size*.012)),phase=Math.floor(s.time*s.speed/12);
      ctx.fillStyle="#000";
      for(let y=0;y<h/cell;y++){
        const strips=2+Math.floor(hash(phase,y)*5),width=w/strips;
        for(let x=0;x<strips;x++)if(hash(x+phase*17,y)>.49)ctx.fillRect(Math.floor(x*width),Math.floor(y*cell),Math.ceil(width),Math.ceil(cell));
      }
    }
    if(s.invert==="yes"){ctx.globalCompositeOperation="difference";ctx.fillStyle="white";ctx.fillRect(0,0,w,h);}
  }
  function draw(input,art,s){
    const ctx=art.getContext("2d"),{width:w,height:h}=s,unit=Math.min(w,h),r=(s.angle||0)*Math.PI/180;
    if(definitions[s.type].mask){matte(input,art,s);return;}
    switch(s.type){
      case "mosh-media":{
        const img=getImage(s.image);if(!img)return;
        const f=Math.min(w/img.width,h/img.height)*s.size/8;
        const x=w*s.positionX/100-img.width*f/2,y=h*s.positionY/100-img.height*f/2;
        if(s.tileMedia==="yes"){
          const pattern=ctx.createPattern(img,"repeat");
          pattern.setTransform(new DOMMatrix().translate(x,y).scaleSelf(f));
          ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);
        }else ctx.drawImage(img,x,y,img.width*f,img.height*f);
        return;
      }
      case "mosh-caption":{
        if(!s.caption)return;
        ctx.textAlign="center";ctx.textBaseline="middle";
        const size=unit*(.035+.012*s.size);ctx.font="bold "+size+"px sans-serif";
        ctx.fillStyle=s.ink;
        const x=w*s.positionX/100,y=h*s.positionY/100;
        ctx.fillText(s.caption,x,y,w*.98);return;
      }
      case "mosh-audio-visualizer":spectrum(ctx,s);return;
      case "mosh-color-gradient":{
        const spread=Math.max(1,unit*s.size/11),dx=Math.cos(r)*spread,dy=Math.sin(r)*spread;
        const grad=s.shape==="radial"?ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,spread):ctx.createLinearGradient(w/2-dx,h/2-dy,w/2+dx,h/2+dy);
        grad.addColorStop(0,s.tint);grad.addColorStop(1,s.end);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);return;
      }
      case "mosh-noise":case "mosh-plasma":pattern(art,s);return;
      case "mosh-texture":{
        ctx.drawImage(input,0,0);ctx.globalCompositeOperation="multiply";
        let tex=getImage(s.image);
        if(!tex){
          tex=buffer(art,128,128);const tc=tex.getContext("2d"),im=tc.createImageData(128,128);
          for(let y=0,i=0;y<128;y++)for(let x=0;x<128;x++,i+=4){
            const crease=Math.max(0,1-Math.abs((x+12*Math.sin(y*Math.PI/64))%64-32)/3);
            const grain=hash(x,y);
            const a=s.videoSource?175+grain*51-crease*30:244+grain*11-crease*17;
            im.data[i]=a;im.data[i+1]=a*.99;im.data[i+2]=a*.97;im.data[i+3]=255;
          }
          tc.putImageData(im,0,0);
        }
        const pat=ctx.createPattern(tex,"repeat");const scale=unit*(s.size/16)/Math.max(tex.width,tex.height);
        pat.setTransform(new DOMMatrix().rotate(s.angle).scaleSelf(scale));ctx.fillStyle=pat;ctx.fillRect(0,0,w,h);return;
      }
      case "mosh-god-rays":{
        const cx=w*s.positionX/100,cy=h*s.positionY/100,len=Math.hypot(w,h),n=Math.round(15+s.size*4);
        const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,len*.46);
        grad.addColorStop(0,s.tint);grad.addColorStop(.23,s.tint+"b8");grad.addColorStop(1,s.tint+"00");
        ctx.fillStyle=grad;
        ctx.filter="blur("+Math.max(1,unit*.006)+"px)";
        ctx.beginPath();
        for(let i=0;i<n;i++){
          const phi=(i+hash(i,1)*.5)*2*Math.PI/n+s.time*s.speed*.001,end=phi+(.12+.5*hash(i,2))*Math.PI/n;
          ctx.moveTo(cx,cy);ctx.lineTo(cx+len*Math.cos(phi),cy+len*Math.sin(phi));ctx.lineTo(cx+len*Math.cos(end),cy+len*Math.sin(end));ctx.closePath();
        }
        ctx.fill();
        ctx.filter="none";
        const core=ctx.createRadialGradient(cx,cy,0,cx,cy,unit*.22);
        core.addColorStop(0,"#fffaf0");core.addColorStop(.16,s.tint+"e0");core.addColorStop(1,s.tint+"00");
        ctx.fillStyle=core;ctx.fillRect(0,0,w,h);return;
      }
      default:{
        const grid=s.type==="mosh-grid";
        const cell=Math.max(2,unit*(grid ? .042+s.size*.008 : .039+s.size*.004));
        const diag=Math.ceil(Math.hypot(w,h)/cell)*cell,move=grid?s.time*(s.speed||0)*cell/120%cell:0;
        ctx.translate(w/2,h/2);ctx.rotate(r);ctx.translate(move,move);
        ctx.lineWidth=Math.max(.7,cell*.038);ctx.strokeStyle=s.tint;
        ctx.beginPath();
        if(grid){
          for(let v=-diag;v<=diag;v+=cell){ctx.moveTo(v,-diag);ctx.lineTo(v,diag);if(s.cross==="grid"){ctx.moveTo(-diag,v);ctx.lineTo(diag,v);}}ctx.stroke();
        } else {
          const count=Math.ceil(diag/cell);
          const tint=ctx.createLinearGradient(-w/2,h/2,w/2,-h/2);
          tint.addColorStop(0,s.tint);tint.addColorStop(1,"#fff9ec");ctx.fillStyle=tint;
          for(let row=-count;row<count;row++)for(let col=-count;col<count;col++){
            const x=(col+Math.abs(row%2)*.5)*cell,y=row*cell;
            const rad=cell*s.dotSize/200*(.86+.27*hash(col,row));
            ctx.moveTo(x+rad,y);ctx.arc(x,y,rad,0,Math.PI*2);
          }
          ctx.fill();
        }
      }
    }
  }
  window.TonepressPacks.push({definitions,draw});
})();
