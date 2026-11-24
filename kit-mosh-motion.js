(() => {
  "use strict";

  const range = (key,label,min,max,value,step=1) => ({key,label,kind:"range",min,max,value,step});
  const select = (key,label,value,options) => ({
    key,label,kind:"select",value,options: options.map(([value,label]) => ({value,label}))
  });
  const definition = (name,english,scaleLabel,size,description,controls,temporal=false) => ({
    name,english,scaleLabel,size,strength:100,description,controls,group:"动态与信号",
    groupEnglish:"Motion & signal",timed:true,temporal
  });
  const speed = (value=45) => range("speed","变化速度",0,100,value);
  const angle = (value=0) => range("angle","移动方向",-180,180,value);
  const definitions = {
    "mosh-data-mosh": definition("数据蚀流","Data Mosh","预测分块",8,
      "匹配相邻视频帧的运动，用位移推动前一张处理结果，让残留画面以块为单位向前拖行。静态照片保留原样。",
      [range("flow","运动拖拽",0,100,81)],true),
    "mosh-optical-flow": definition("光流扭曲","Optical Flow","运动采样尺度",7,
      "跟踪视频各区域的移动方向，将稀疏位移平滑成流动的变形。静态照片保留原样。",
      [range("distortion","形变量",0,100,64),range("speed","响应速度",0,100,66)],true),
    "mosh-feedback": definition("递归回馈","Feedback","回馈残留",9,
      "逐帧变换并重叠已经处理过的画面。缩放和旋转能拉出隧道或旋涡。",
      [range("zoom","每帧缩放",80,125,104),range("rotate","每帧旋转",-15,15,3),
        range("warp","回馈弯曲",0,100,19),range("hue","回馈色相",-180,180,12)],true),
    "mosh-watercolor": definition("水彩洇染","Watercolor","色彩晕染尺度",8,
      "顺着指定方向柔化并汇聚邻域颜色。视频中上一帧的色块会短暂渗入当前画面。",
      [range("flow","洇染流动量",0,100,57),angle(48)],true),
    "mosh-slit-scan": definition("时间狭缝","Slit Scan","回溯时窗",8,
      "从不同时刻拣取相近位置的窄条，拼合成一张画面，让移动主体沿切片拉长。",
      [range("slices","时间切片数",4,24,16),range("angle","切片角度",-180,180,90)],true),
    "mosh-luma-mesh": definition("亮度浮雕网","Luma Mesh","地形深度",8,
      "把亮度变成真实投影的地形高度，可用彩色面片、扫描线或发光点描绘。",
      [select("mode","地形绘制方式","mesh",[["mesh","实体网面"],["lines","扫描线条"],["points","发光点云"]]),
        range("resolution","网格分辨率",12,64,34),range("lumaHeight","亮度抬升",0,100,68),
        select("lumaInvert","亮度反转","normal",[["normal","亮处升高"],["invert","暗处升高"]]),
        range("bands","高度台阶",0,12,0),range("terrainWarp","地形扭曲",0,100,12),
        range("tilt","视角漂移幅度",0,100,28),range("tiltSpeed","视角漂移速度",0,100,27),
        select("blend","地形混合方式","normal",[["normal","正常混合"],["add","加亮混合"],["screen","滤色混合"]]),
        range("meshOpacity","网面不透明度",0,100,90),range("gridOpacity","网线不透明度",0,100,46),
        select("gridColor","网线颜色","mint",[["mint","荧光薄荷"],["white","柔白"],["source","随源图取色"]]),
        range("lineCount","扫描线条数",8,96,45),range("lineOpacity","扫描线不透明度",0,100,96),
        range("lineThickness","扫描线粗细",1,100,36),range("lineBlur","扫描线柔化",0,100,22),
        range("pointOpacity","点云不透明度",0,100,94),range("pointSize","点云尺寸",1,100,34)]),
    "mosh-jitter": definition("信号抖振","Jitter","细抖幅度",7,
      "按指定方向快速位移画面，小幅度时像略不稳定的模拟信号。",
      [speed(68),angle()]),
    "mosh-melt": definition("下坠熔流","Melt","熔流宽度",9,
      "将像素沿不规则的流道往下拖，让不同列像软化的颜料一样流走。",
      [speed(37)]),
    "mosh-shake": definition("撞击晃动","Shake","整帧晃动幅度",6,
      "模拟受到撞击的相机，让整个画面发生短促、离散的位移。",
      [speed(46)]),
    "mosh-bad-tv": definition("电视失谐","Bad TV","失谐尺度",9,
      "随时间扫过的模拟走带歪曲叠加细行抖动，让画面像电视跟踪失准。",
      [range("thick","粗段失谐",0,100,67),range("fine","细线扰动",0,100,51),range("roll","滚动速度",0,100,38)]),
    "mosh-soft-glitch": definition("渐变色撕裂","Soft Glitch","渐变色带宽度",8,
      "在柔和移动的色带里连续分离红绿蓝通道，形成渐变的色彩撕裂。",
      [speed(42)]),
    "mosh-hard-glitch": definition("硬块故障","Hard Glitch","故障方块尺度",8,
      "用不同时长的横带和硬边方块错位画面，并把颜色通道拉开。",
      [range("split","通道分离量",0,100,69),speed(50)]),
    "mosh-decimate": definition("阶梯抽帧","Decimate","停帧方块尺度",7,
      "只在指定节拍采新帧，中间重复前一帧，可有选择地保留旧方块并染色。",
      [range("speed","更新频率",1,24,6),range("colorize","停帧染色量",0,100,24)],true)
  };

  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
  const limit = (value,max) => Math.min(max,Math.max(0,value));
  const mix = (a,b,t) => a+(b-a)*t;
  const tau = Math.PI*2;
  const rad = degrees => degrees*Math.PI/180;
  const phase = time => ((time%4)+4)%4/4;
  const probability = (x,y=0,z=0) => {
    let n = Math.imul(x+113,374761393)^Math.imul(y+61,668265263)^Math.imul(z+89,2246822519);
    n = Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967296;
  };
  const epoch = (time,speed) => Math.floor(phase(time)*(4+Math.round(speed*.92)));
  const luma = (data,i) => (54*data[i]+183*data[i+1]+19*data[i+2])>>8;
  const frameStore = new WeakMap();

  function buffers(input) {
    const owner = input.ownerDocument || document;
    if (!frameStore.has(owner)) {
      const sample = owner.createElement("canvas"), image = owner.createElement("canvas");
      frameStore.set(owner,{
        sample,sampler:sample.getContext("2d",{willReadFrequently:true}),
        image,writer:image.getContext("2d")
      });
    }
    return frameStore.get(owner);
  }

  function resize(canvas,w,h) {
    if (canvas.width!==w) canvas.width=w;
    if (canvas.height!==h) canvas.height=h;
  }

  function read(input,s,cap) {
    const store = buffers(input);
    const sw = s.sourceWidth || input.width, sh = s.sourceHeight || input.height;
    const factor = Math.min(1,cap/Math.max(sw,sh));
    const w = Math.max(1,Math.round(sw*factor)), h = Math.max(1,Math.round(sh*factor));
    resize(store.sample,w,h);
    store.sampler.clearRect(0,0,w,h);
    store.sampler.drawImage(input,0,0,w,h);
    return {w,h,data:store.sampler.getImageData(0,0,w,h).data,store};
  }

  function write(ctx,frame,data,s,smooth=true) {
    const {image,writer} = frame.store;
    resize(image,frame.w,frame.h);
    writer.putImageData(new ImageData(data,frame.w,frame.h),0,0);
    ctx.imageSmoothingEnabled=smooth;
    ctx.drawImage(image,0,0,s.width,s.height);
  }

  function passthrough(ctx,input,s) {
    ctx.drawImage(input,0,0,s.width,s.height);
  }

  function lumaFrame(frame) {
    const lum = new Uint8Array(frame.w*frame.h);
    for (let i=0; i<lum.length; i++) {
      const offset = i*4;
      lum[i]=(luma(frame.data,offset)*frame.data[offset+3])>>8;
    }
    return lum;
  }

  function offsetAt(x,y,w,h) {
    return (limit(Math.round(y),h-1)*w+limit(Math.round(x),w-1))*4;
  }

  // Three weighted taps in each axis keep motion estimates bounded on long clips.
  function motionField(current,previous,w,h,cell,radius) {
    const cols=Math.ceil(w/cell), rows=Math.ceil(h/cell);
    const xFlow=new Float32Array(cols*rows), yFlow=new Float32Array(cols*rows);
    const strength=new Float32Array(cols*rows);
    const step=Math.max(1,Math.floor(radius/3));
    const half=Math.max(1,Math.floor(cell*.31));
    for (let gy=0; gy<rows; gy++) for (let gx=0; gx<cols; gx++) {
      const centerX=Math.min(w-1,gx*cell+Math.floor(cell/2));
      const centerY=Math.min(h-1,gy*cell+Math.floor(cell/2));
      const samples=[];
      for (const [x,y] of [[0,0],[-half,-half],[half,-half],[-half,half],[half,half],[-half,0],[half,0],[0,-half],[0,half]]) {
        const sx=limit(centerX+x,w-1), sy=limit(centerY+y,h-1);
        samples.push([sx,sy,current[sy*w+sx]]);
      }
      function error(dx,dy) {
        let total=(Math.abs(dx)+Math.abs(dy))*.59;
        for (const [x,y,value] of samples) {
          total += Math.abs(value-previous[limit(y+dy,h-1)*w+limit(x+dx,w-1)]);
        }
        return total;
      }
      const rest=error(0,0);
      if (rest < 11) continue;
      let best=rest, bx=0, by=0;
      for (let dy=-radius; dy<=radius; dy+=step) for (let dx=-radius; dx<=radius; dx+=step) {
        const cost=error(dx,dy);
        if (cost < best) {best=cost;bx=dx;by=dy;}
      }
      const coarseX=bx, coarseY=by;
      for (let dy=coarseY-step+1; dy<coarseY+step; dy++) for (let dx=coarseX-step+1; dx<coarseX+step; dx++) {
        const cost=error(dx,dy);
        if (cost < best) {best=cost;bx=dx;by=dy;}
      }
      const index=gy*cols+gx;
      if (rest-best>12) {xFlow[index]=bx;yFlow[index]=by;}
      strength[index]=clamp((rest-best)/Math.max(rest,84),0,1);
    }
    return {cols,rows,cell,xFlow,yFlow,strength};
  }

  function vectorAt(field,x,y) {
    const {cols,rows,cell,xFlow,yFlow}=field;
    const px=limit(x/cell-.5,cols-1), py=limit(y/cell-.5,rows-1);
    const ix=Math.floor(px), iy=Math.floor(py);
    const right=Math.min(cols-1,ix+1), down=Math.min(rows-1,iy+1);
    const a=iy*cols+ix,b=iy*cols+right,c=down*cols+ix,d=down*cols+right;
    const fx=px-ix,fy=py-iy;
    return [
      mix(mix(xFlow[a],xFlow[b],fx),mix(xFlow[c],xFlow[d],fx),fy),
      mix(mix(yFlow[a],yFlow[b],fx),mix(yFlow[c],yFlow[d],fx),fy)
    ];
  }

  function pixelBlend(destination,i,current,j,prior,k,amount) {
    for (let channel=0;channel<4;channel++) destination[i+channel]=mix(current[j+channel],prior[k+channel],amount);
  }

  function dataMosh(frame,s,hist,delta) {
    const {w,h,data} = frame;
    const previous = hist.result;
    const field=motionField(hist.lum,hist.prevLum,w,h,Math.round(4+s.size*.96),Math.min(15,Math.round(8+delta*48)));
    const result=new Uint8ClampedArray(data.length);
    const drag=s.flow*.01;
    const hold=.61+drag*.33;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const cell=Math.floor(y/field.cell)*field.cols+Math.floor(x/field.cell);
      const dx=field.xFlow[cell],dy=field.yFlow[cell];
      const p=offsetAt(x+dx*drag*1.65,y+dy*drag*1.65,w,h);
      const stale=hold+(field.strength[cell]>.18 && (dx || dy) ? .02 : -.06);
      pixelBlend(result,i,data,i,previous,p,stale);
    }
    return result;
  }

  function opticalFlow(frame,s,hist,delta) {
    const {w,h,data}=frame;
    const field=motionField(hist.lum,hist.prevLum,w,h,Math.round(5+s.size*.77),Math.min(16,Math.round(7+delta*55)));
    const amount=1-Math.exp(-(5+s.speed*.39)*delta);
    const last=hist.field;
    for (let i=0; i<field.xFlow.length; i++) {
      field.xFlow[i]=mix(last?.xFlow[i] || 0,field.xFlow[i],amount);
      field.yFlow[i]=mix(last?.yFlow[i] || 0,field.yFlow[i],amount);
    }
    hist.field=field;
    const distance=s.distortion*.064;
    const result=new Uint8ClampedArray(data.length);
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const [dx,dy]=vectorAt(field,x,y);
      const sample=offsetAt(x+dx*distance,y+dy*distance,w,h);
      const trail=.25*clamp(Math.hypot(dx,dy)/4,0,1);
      pixelBlend(result,i,data,sample,hist.result,offsetAt(x+dx,y+dy,w,h),trail);
    }
    return result;
  }

  function feedback(frame,s,hist,delta) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data);
    const prior=hist.result;
    const timeStep=clamp(delta*27,.40,3);
    const turn=rad(s.rotate)*timeStep;
    const c=Math.cos(turn), d=Math.sin(turn);
    const inverse=1/Math.pow(s.zoom/100,timeStep);
    const hue=rad(s.hue)*timeStep;
    const cosHue=Math.cos(hue), sinHue=Math.sin(hue);
    const persistence=.48+s.size*.028;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const u=x-(w-1)*.5, v=y-(h-1)*.5;
      const bend=Math.sin(v/Math.max(1,h)*11+s.time*.7)*w*s.warp*.00065;
      const sx=(u*c-v*d)*inverse+w*.5+bend, sy=(u*d+v*c)*inverse+h*.5;
      if(sx<0 || sy<0 || sx>=w || sy>=h) continue;
      const j=offsetAt(sx,sy,w,h);
      const lum=luma(prior,j), red=prior[j]-lum, blue=prior[j+2]-lum;
      const r=red*cosHue-blue*sinHue, b=red*sinHue+blue*cosHue;
      const amount=persistence*prior[j+3]/255;
      result[i]=mix(data[i],lum+r,amount);
      result[i+1]=mix(data[i+1],lum-(r*.2126+b*.0722)/.7152,amount);
      result[i+2]=mix(data[i+2],lum+b,amount);
    }
    return result;
  }

  function watercolor(frame,s,hist) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data.length);
    const reach=(1.15+s.size*.44)*Math.max(w,h)/260;
    const theta=rad(s.angle);
    const dx=Math.cos(theta)*reach, dy=Math.sin(theta)*reach;
    const motion=.24+s.flow*.010;
    const taps=[[0,0],[-dx,-dy],[dx*motion,dy*motion],[-dy*.65,dx*.65],[dy*.65,-dx*.65],
      [dx*.7-dy*.45,dy*.7+dx*.45],[-dx*.9+dy*.5,-dy*.9-dx*.5]];
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const origin=luma(data,i);
      let red=0,green=0,blue=0,cov=0;
      for (const [ox,oy] of taps) {
        const j=offsetAt(x+ox,y+oy,w,h);
        const similarity=Math.abs(luma(data,j)-origin)/255;
        const k=(1-similarity*.72)*data[j+3]/255;
        red+=data[j]*k;green+=data[j+1]*k;blue+=data[j+2]*k;cov+=k;
      }
      const wash=(probability(x,y)-.5)*3;
      const lag=hist?.result ? (.15+s.flow*.0015)*hist.result[i+3]/255 : 0;
      const p=offsetAt(x-dx*.45,y-dy*.45,w,h);
      const divide=1/(cov || 1);
      result[i]=mix(red*divide+wash,hist?.result?.[p] || 0,lag);
      result[i+1]=mix(green*divide+wash,hist?.result?.[p+1] || 0,lag);
      result[i+2]=mix(blue*divide+wash,hist?.result?.[p+2] || 0,lag);
      result[i+3]=data[i+3];
    }
    return result;
  }

  function slitScan(frame,s,hist) {
    const {w,h,data}=frame;
    const queue=hist.frames;
    const span=.13+s.size*.048;
    const count=Math.min(s.slices,queue.length+1);
    const frames=Array.from({length:count},(_,i)=>{
      if (!i) return data;
      const target=s.time-span*i/(count-1);
      return queue.reduce((best,item)=>Math.abs(item.time-target)<Math.abs(best.time-target)?item:best).data;
    });
    const result=new Uint8ClampedArray(data.length);
    const theta=rad(s.angle), nx=-Math.sin(theta), ny=Math.cos(theta);
    const spanX=Math.abs(nx),spanY=Math.abs(ny),distance=spanX+spanY;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const label=.5+(nx*(x/Math.max(1,w-1)-.5)+ny*(y/Math.max(1,h-1)-.5))/distance;
      const i=(y*w+x)*4;
      const selected=frames[limit(Math.floor(label*count),count-1)];
      for(let channel=0;channel<4;channel++) result[i+channel]=selected[i+channel];
    }
    return result;
  }

  function decimate(frame,s,hist) {
    const {w,h,data}=frame;
    const bucket=Math.floor((s.time+1e-7)*s.speed);
    if (hist.bucket===bucket && hist.result) return hist.result;
    hist.bucket=bucket;
    const result=new Uint8ClampedArray(data.length);
    const block=Math.round(4+s.size*1.1);
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const gx=Math.floor(x/block),gy=Math.floor(y/block);
      const keep=hist.result && probability(gx,gy,bucket)<.12;
      const source=keep ? hist.result : data;
      const tint=keep ? 0 : s.colorize*.0028;
      const lum=luma(source,i);
      result[i]=mix(source[i],lum*.86,tint);
      result[i+1]=mix(source[i+1],lum*.95+11,tint);
      result[i+2]=mix(source[i+2],lum*1.13+16,tint);
      result[i+3]=source[i+3];
    }
    return result;
  }

  const temporal = {
    "mosh-data-mosh":dataMosh,"mosh-optical-flow":opticalFlow,"mosh-feedback":feedback,
    "mosh-watercolor":watercolor,"mosh-slit-scan":slitScan,"mosh-decimate":decimate
  };
  const useLuma = new Set(["mosh-data-mosh","mosh-optical-flow"]);
  function drawTemporal(input,ctx,s) {
    const stillWash=s.type==="mosh-watercolor" && !s.videoSource;
    if (!s.videoSource && !stillWash) return passthrough(ctx,input,s);
    const frame=read(input,s,s.type==="mosh-slit-scan"?256:320);
    if(stillWash) return write(ctx,frame,watercolor(frame,s),s);
    const hist=s.history || {};
    const {w,h,data}=frame;
    const delta=s.time-hist.time;
    const sameResolution=hist.w===w && hist.h===h;
    if (sameResolution && Math.abs(delta)<1e-6) {
      return hist.first ? passthrough(ctx,input,s) : write(ctx,frame,hist.result,s);
    }
    const continuous=sameResolution && delta>0 && delta<.37;
    if (!continuous) {
      hist.field=null;
      hist.bucket=null;
      hist.frames=[];
      hist.prevLum=null;
      hist.result=null;
    }
    if (useLuma.has(s.type)) {
      hist.prevLum=continuous ? hist.lum : null;
      hist.lum=lumaFrame(frame);
    }
    const needsFirstRender=s.type==="mosh-watercolor" || s.type==="mosh-decimate";
    hist.first=!continuous && !needsFirstRender;
    hist.result=hist.first ? data : temporal[s.type](frame,s,hist,delta);
    if(s.type==="mosh-slit-scan") {
      if(!hist.frames.length || s.time-hist.frames[hist.frames.length-1].time>=1/30-1e-6) {
        hist.frames.push({time:s.time,data});
      }
      while(hist.frames.length>24 || s.time-hist.frames[0].time>.98) hist.frames.shift();
    }
    hist.w=w;hist.h=h;hist.time=s.time;
    if(hist.first) return passthrough(ctx,input,s);
    write(ctx,frame,hist.result,s);
  }

  function lumaMesh(input,ctx,s) {
    const frame=read(input,s,256);
    const {w,h,data}=frame;
    const cols=s.resolution;
    const lines=s.mode==="lines";
    const rows=lines ? s.lineCount : clamp(Math.round(cols*h/w*.93),10,96);
    const cycle=phase(s.time)*tau*Math.round(1+s.tiltSpeed*.078);
    const tilt=s.tilt*.0078;
    const yaw=-.12+Math.sin(cycle)*tilt;
    const pitch=.39+.24*tilt*Math.cos(cycle);
    const cos=Math.cos(yaw),sin=Math.sin(yaw);
    const elevation=(.035+s.size*.009)*s.lumaHeight*.015;
    const alignment=s.blend==="add"?"lighter":s.blend==="screen"?"screen":"source-over";
    const grid=s.gridColor==="white"?"#f0f0e5":"#96ffc0";
    const nodes=[];
    for (let y=0;y<=rows;y++) for (let x=0;x<=cols;x++) {
      const u=x/cols,v=y/rows, i=offsetAt(u*(w-1),v*(h-1),w,h);
      let height=luma(data,i)/255;
      if (s.lumaInvert==="invert") height=1-height;
      if (s.bands>0) height=Math.round(height*s.bands)/s.bands;
      height=height*elevation+s.terrainWarp*.00058*Math.sin(12*u+6*v+cycle)*Math.cos(7*v);
      const px=(u-.5)*cos+(v-.5)*sin*.72;
      const depth=(v-.5)*cos-(u-.5)*sin*.72;
      const perspective=1/(1+depth*.32);
      nodes.push({
        x:s.width*(.5+px*perspective*.89),
        y:s.height*(.53+(depth*Math.cos(pitch)-height)*perspective*.91),
        r:data[i],g:data[i+1],b:data[i+2],a:data[i+3]/255,height
      });
    }

    passthrough(ctx,input,s);
    ctx.fillStyle=s.blend==="normal"?"rgba(7,15,20,.81)":"rgba(7,15,20,.54)";
    ctx.fillRect(0,0,s.width,s.height);
    ctx.globalCompositeOperation=alignment;
    ctx.lineJoin="round";
    const outputScale=Math.max(1,Math.min(s.width,s.height));
    const color = (p,light=1) => `rgb(${Math.round(p.r*light)} ${Math.round(p.g*light)} ${Math.round(p.b*light)})`;
    const trace=(points,close=false)=>{
      ctx.beginPath();
      ctx.moveTo(points[0].x,points[0].y);
      for (let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y);
      if (close) ctx.closePath();
    };
    if (lines) {
      ctx.lineWidth=outputScale/rows*(.11+s.lineThickness*.014);
      ctx.shadowBlur=s.lineBlur*outputScale*.00033;
      ctx.lineCap="round";
      ctx.shadowColor=grid;
      for (let y=rows; y>=0; y--) {
        for (let x=0;x<cols;x++) {
          const p=nodes[y*(cols+1)+x], q=nodes[y*(cols+1)+x+1];
          ctx.globalAlpha=s.lineOpacity*.01*Math.min(p.a,q.a);
          ctx.strokeStyle=s.gridColor==="source"?color(p,1.12):grid;
          trace([p,q]);
          ctx.stroke();
        }
      }
    } else if(s.mode==="points") {
      const radius=.0004*outputScale+s.pointSize*outputScale*.000059;
      for (const p of nodes) {
        ctx.globalAlpha=s.pointOpacity*.01*p.a;
        ctx.fillStyle=s.gridColor==="source"?color(p,1.1):grid;
        ctx.beginPath();
        ctx.arc(p.x,p.y,radius*(.8+p.height*1.9),0,tau);
        ctx.fill();
      }
    } else {
      ctx.lineWidth=Math.max(.4,outputScale*.00105);
      for (let y=rows-1; y>=0; y--) {
        for (let x=0;x<cols;x++) {
          const a=nodes[y*(cols+1)+x],b=nodes[y*(cols+1)+x+1];
          const c=nodes[(y+1)*(cols+1)+x], d=nodes[(y+1)*(cols+1)+x+1];
          for (const [p,q,r] of [[a,b,c],[b,d,c]]) {
            const average=(p.a+q.a+r.a)/3;
            const shading=clamp(1.08+(p.height-q.height)*2-(r.height-p.height)*1.7,.55,1.45);
            trace([p,q,r],true);
            ctx.fillStyle=color({r:(p.r+q.r+r.r)/3, g:(p.g+q.g+r.g)/3, b:(p.b+q.b+r.b)/3},shading);
            ctx.globalAlpha=s.meshOpacity*.01*average;
            ctx.fill();
            if (s.gridOpacity>0) {
              ctx.strokeStyle=s.gridColor==="source"?color(p,1.35):grid;
              ctx.globalAlpha=s.gridOpacity*.01*average;
              ctx.stroke();
            }
          }
        }
      }
    }
  }

  function moveFrame(input,ctx,s,dx,dy) {
    const zoom=1+2*Math.max(Math.abs(dx)/s.width,Math.abs(dy)/s.height);
    ctx.drawImage(input,(1-zoom)*s.width*.5+dx,(1-zoom)*s.height*.5+dy,s.width*zoom,s.height*zoom);
  }

  function jitter(input,ctx,s) {
    const rate=14+Math.round(s.speed*.9);
    const moment=phase(s.time)*rate;
    const i=Math.floor(moment);
    const t=moment-i;
    const travel=mix(probability(i,9),probability((i+1)%rate,9),t*t*(3-2*t))*2-1;
    const scale=Math.min(s.width,s.height)*(.003+s.size*.0016);
    const direction=rad(s.angle);
    moveFrame(input,ctx,s,Math.cos(direction)*travel*scale,Math.sin(direction)*travel*scale);
  }

  function shake(input,ctx,s) {
    const rate=3+Math.round(s.speed*.44), moment=phase(s.time)*rate;
    const sample=Math.floor(moment);
    const punch=Math.pow(1-(moment-sample),.82);
    const impulse=(.42+.58*punch)*Math.min(s.width,s.height)*(.013+s.size*.0052);
    const direction=probability(sample,13)*tau;
    moveFrame(input,ctx,s,Math.cos(direction)*impulse,Math.sin(direction)*impulse);
  }

  function melt(frame,s) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data.length);
    const stripe=Math.max(2,Math.max(w,h)*(.011+s.size*.003));
    const cycle=phase(s.time)*tau*Math.round(1+s.speed*.087);
    const runs=Array.from({length:w},(_,x)=>{
      const pos=x/stripe, base=Math.floor(pos), f=pos-base;
      const smooth=f*f*(3-2*f);
      const swell=base=>probability(base,7)*(.67+.33*Math.sin(cycle+probability(base,6)*tau));
      return mix(swell(base),swell(base+1),smooth);
    });
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const run=runs[x];
      const offsetY=run*h*(.12+s.size*.022)*(.36+.64*y/Math.max(1,h-1));
      const offsetX=Math.sin(y/Math.max(1,h)*9+cycle+run*5)*run*w*.025;
      const j=offsetAt(x+offsetX,y-offsetY,w,h);
      for(let k=0;k<4;k++) result[i+k]=data[j+k];
    }
    return result;
  }

  function badTV(frame,s) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data.length);
    const rollPhase=(phase(s.time)*Math.round(s.roll*.12)+.28)%1;
    const cycle=phase(s.time)*tau*8;
    for (let y=0;y<h;y++) {
      const v=y/Math.max(1,h-1);
      const lineGap=Math.abs(v-rollPhase), d=Math.min(lineGap,1-lineGap);
      const shape=Math.exp(-d*d*(42-s.size*1.5));
      const bend=Math.sin(8*v+cycle*.25)*w*s.thick*.00065;
      const snow=(probability(y,epoch(s.time,60))-.5)*s.fine*.0029*w;
      const move=bend+shape*w*s.thick*.0025*Math.sin(d*11+1)+snow*.22;
      const echo=w*(.0005+s.fine*.00012)*(shape+.25);
      const stain=1-.13*shape-.066*(1+Math.cos(v*h*Math.PI)+Math.sin(v*122+cycle));
      for (let x=0;x<w;x++) {
        const i=(y*w+x)*4;
        const g=offsetAt(x+move,y,w,h), r=offsetAt(x+move+echo,y,w,h), b=offsetAt(x+move-echo,y,w,h);
        result[i]=(data[r]+2)*stain;
        result[i+1]=data[g+1]*stain;
        result[i+2]=(data[b+2]+2)*stain;
        result[i+3]=data[g+3];
      }
    }
    return result;
  }

  function softGlitch(frame,s) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data.length);
    const cycle=phase(s.time)*tau*Math.round(1+s.speed*.065);
    const waves=10-s.size*.45;
    for (let y=0;y<h;y++) {
      const v=y/Math.max(1,h-1);
      const power=Math.pow(.5+.5*Math.sin(v*waves+cycle),3.4);
      const shift=(Math.sin(v*31-cycle)*.66+.34)*power*w*.09;
      const separation=(power-.07)*w*(.020+s.size*.0031);
      for (let x=0;x<w;x++) {
        const i=(y*w+x)*4;
        const crossFade=Math.sin(x/Math.max(1,w-1)*Math.PI)*.55+.45;
        const g=offsetAt(x+shift*crossFade,y,w,h);
        const r=offsetAt(x+(shift+separation)*crossFade,y,w,h);
        const b=offsetAt(x+(shift-separation)*crossFade,y,w,h);
        result[i]=data[r];
        result[i+1]=data[g+1];
        result[i+2]=data[b+2];
        result[i+3]=data[g+3];
      }
    }
    return result;
  }

  function hardGlitch(frame,s) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data.length);
    const moment=epoch(s.time,s.speed);
    const size=Math.max(3,Math.round(Math.max(w,h)*(.015+s.size*.005)));
    for (let y=0;y<h;y++) {
      const band=Math.floor(y/(size*.62));
      const lineCheck=probability(band,moment,62);
      const drift=lineCheck<.31?(probability(band,moment,12)-.5)*w*.40:0;
      for (let x=0;x<w;x++) {
        const i=(y*w+x)*4;
        const gx=Math.floor(x/size), gy=Math.floor(y/size);
        const shape=probability(gx,gy,moment);
        const dx=shape>.67?(probability(gx,gy,moment+51)-.5)*w*.27:0;
        const dy=shape>.82?(probability(gx,gy,moment+13)-.5)*h*.23:0;
        const rx=drift+dx, ry=y+dy;
        const split=(shape>.67 || drift ? 1 : .19)*w*s.split*.00105;
        const g=offsetAt(x+rx,ry,w,h),r=offsetAt(x+rx+split,ry,w,h),b=offsetAt(x+rx-split,ry,w,h);
        result[i]=data[r];result[i+1]=data[g+1];result[i+2]=data[b+2];result[i+3]=data[g+3];
      }
    }
    return result;
  }

  const spatial = {
    "mosh-melt":melt,"mosh-bad-tv":badTV,"mosh-soft-glitch":softGlitch,"mosh-hard-glitch":hardGlitch
  };

  function draw(input,output,s) {
    if(!Object.hasOwn(definitions,s.type)) return false;
    const ctx=output.getContext("2d");
    if (Object.hasOwn(temporal,s.type)) drawTemporal(input,ctx,s);
    else if (s.type==="mosh-luma-mesh") lumaMesh(input,ctx,s);
    else if (s.type==="mosh-jitter") jitter(input,ctx,s);
    else if (s.type==="mosh-shake") shake(input,ctx,s);
    else {
      const frame=read(input,s,512);
      write(ctx,frame,spatial[s.type](frame,s),s,s.type!=="mosh-hard-glitch");
    }
    return true;
  }

  window.TonepressPacks.push({definitions,draw});
})();
