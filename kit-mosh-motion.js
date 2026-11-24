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
    "mosh-data-mosh": {...definition("数据蚀流","Data Mosh","预测分块",5,
      "匹配相邻视频帧的运动，用位移推动前一张处理结果，让残留画面以块为单位向前拖行。静态照片保留原样。",
      [range("flow","运动拖拽",0,100,60)],true),strength:50,handlesAmount:true},
    "mosh-optical-flow": definition("光流扭曲","Optical Flow","运动采样尺度",7,
      "跟踪视频各区域的移动方向，将稀疏位移平滑成流动的变形。照片也可生成随图像明暗变化的液态扭曲。",
      [range("distortion","形变量",0,100,50),range("speed","响应速度",0,100,50)],true),
    "mosh-feedback": {...definition("递归回馈","Feedback","回馈残留",8,
      "逐帧变换并重叠已经处理过的画面。缩放和旋转能拉出隧道或旋涡。",
      [range("zoom","每帧缩放",80,125,100),range("rotate","每帧旋转",-15,15,0),
        range("shiftX","回馈横移",-15,15,0),range("shiftY","回馈纵移",-15,15,0),
        range("warp","回馈弯曲",0,100,50),range("hue","回馈色相",-180,180,0)],true),strength:50,handlesAmount:true},
    "mosh-watercolor": definition("水彩洇染","Watercolor","色彩晕染尺度",8,
      "顺着指定方向柔化并汇聚邻域颜色。视频中上一帧的色块会短暂渗入当前画面。",
      [range("flow","洇染流动量",0,100,50),angle(0)],true),
    "mosh-slit-scan": definition("时间狭缝","Slit Scan","回溯时窗",8,
      "从不同时刻拣取相近位置的窄条，拼合成一张画面，让移动主体沿切片拉长。",
      [range("slices","时间切片数",2,24,8),range("angle","切片角度",-180,180,0)],true),
    "mosh-luma-mesh": definition("亮度浮雕网","Luma Mesh","地形深度",8,
      "把亮度变成真实投影的地形高度，可用彩色面片、扫描线或发光点描绘。",
      [select("mode","地形绘制方式","mesh",[["mesh","实体网面"],["lines","扫描线条"],["points","发光点云"]]),
        range("resolution","网格分辨率",12,112,91),range("lumaHeight","亮度抬升",0,100,30),
        select("lumaInvert","亮度反转","normal",[["normal","亮处升高"],["invert","暗处升高"]]),
        range("bands","高度台阶",0,12,0),range("terrainWarp","地形扭曲",0,100,0),
        range("tilt","视角漂移幅度",0,100,0),range("tiltSpeed","视角漂移速度",0,100,0),
        select("blend","地形混合方式","normal",[["normal","正常混合"],["add","加亮混合"],["screen","滤色混合"]]),
        range("meshOpacity","网面不透明度",0,100,100),range("gridOpacity","网线不透明度",0,100,60),
        select("gridColor","网线颜色","white",[["mint","荧光薄荷"],["white","柔白"],["source","随源图取色"]]),
        range("lineCount","扫描线条数",8,96,45),range("lineOpacity","扫描线不透明度",0,100,96),
        range("lineThickness","扫描线粗细",1,100,36),range("lineBlur","扫描线柔化",0,100,22),
        range("pointOpacity","点云不透明度",0,100,94),range("pointSize","点云尺寸",1,100,34)]),
    "mosh-jitter": definition("信号抖振","Jitter","细抖幅度",7,
      "按指定方向快速位移画面，小幅度时像略不稳定的模拟信号。",
      [speed(80),angle()]),
    "mosh-melt": definition("下坠熔流","Melt","熔流宽度",9,
      "将像素沿不规则的流道往下拖，让不同列像软化的颜料一样流走。",
      [speed(10)]),
    "mosh-shake": definition("撞击晃动","Shake","整帧晃动幅度",6,
      "模拟受到撞击的相机，让整个画面发生短促、离散的位移。",
      [speed(50)]),
    "mosh-bad-tv": definition("电视失谐","Bad TV","失谐尺度",9,
      "随时间扫过的模拟走带歪曲叠加细行抖动，让画面像电视跟踪失准。",
      [range("thick","粗段失谐",0,100,50),range("fine","细线扰动",0,100,20),range("roll","滚动速度",0,100,50)]),
    "mosh-soft-glitch": definition("渐变色撕裂","Soft Glitch","渐变色带宽度",5,
      "在柔和移动的色带里连续分离红绿蓝通道，形成渐变的色彩撕裂。",
      [speed(50)]),
    "mosh-hard-glitch": definition("硬块故障","Hard Glitch","故障方块尺度",8,
      "用不同时长的横带和硬边方块错位画面，并把颜色通道拉开。",
      [range("split","通道分离量",0,100,50),speed(50)]),
    "mosh-decimate": definition("阶梯抽帧","Decimate","停帧方块尺度",7,
      "只在指定节拍采新帧，中间重复前一帧，可有选择地保留旧方块并染色。",
      [range("speed","更新频率",1,24,6),range("colorize","停帧染色量",0,100,50)],true)
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

  function moshTexture(lumas,w,h,cx,cy,block) {
    let horizontal=0,vertical=0;
    const radius=Math.max(2,Math.floor(block*.32));
    for(let oy=-radius;oy<=radius;oy+=2)for(let ox=-radius;ox<=radius;ox+=2){
      const x=limit(cx+ox,w-1),y=limit(cy+oy,h-1);
      const left=y*w+limit(x-1,w-1),right=y*w+limit(x+1,w-1);
      const above=limit(y-1,h-1)*w+x,below=limit(y+1,h-1)*w+x;
      horizontal+=Math.abs(lumas[left]-lumas[right]);
      vertical+=Math.abs(lumas[above]-lumas[below]);
    }
    const energy=Math.max(horizontal,vertical);
    return {axis:horizontal > vertical ? 0 : 1,
      aperture:clamp(Math.abs(horizontal-vertical)/Math.max(1,energy),0,1)*clamp(energy/(16*radius*radius),0,1)};
  }

  function dominantMotion(current,previous,w,h,delta) {
    const radius=Math.max(2,Math.min(8,Math.ceil(1+delta*85)));
    const stride=Math.max(5,Math.floor(Math.min(w,h)/25));
    if(w<=radius*2 || h<=radius*2) return [0,0];
    const steps=[];
    for(let y=radius;y<h-radius;y+=stride)
      for(let x=radius;x<w-radius;x+=stride)steps.push(y*w+x);
    const cost=(dx,dy)=>{
      const offset=dy*w+dx;
      let distance=steps.length*.11*(Math.abs(dx)+Math.abs(dy));
      for(const i of steps)distance+=Math.min(32,Math.abs(current[i]-previous[i+offset]));
      return distance;
    };
    const rest=cost(0,0);
    let best=rest,bx=0,by=0;
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      const error=cost(dx,dy);
      if(error<best){best=error;bx=dx;by=dy;}
    }
    return rest-best>.28*steps.length ? [bx,by] : [0,0];
  }

  function sparseMotion(current,previous) {
    let active=0,sum=0;
    const stride=current.length<24000?5:13;
    for(let i=0;i<current.length;i+=stride) {
      const change=Math.abs(current[i]-previous[i]);
      if(change>3) {sum+=change;active++;}
    }
    const coverage=active/Math.ceil(current.length/stride);
    return active>=2 && coverage<.12 ? clamp((sum/active-5)/55,0,1) : 0;
  }

  function localActivity(current,previous,w,h,col,row,block) {
    let changed=0,total=0;
    const right=Math.min(w,(col+1)*block+1),bottom=Math.min(h,(row+1)*block+1);
    for(let y=Math.max(0,row*block-1);y<bottom;y+=2)for(let x=Math.max(0,col*block-1);x<right;x+=2){
      const i=y*w+x;
      changed+=Math.abs(current[i]-previous[i]);total++;
    }
    return clamp(changed/(total*27),0,1);
  }

  function ridgeCenter(previous,w,h,x,y,block,axis) {
    const span=Math.floor(block*.38);
    let peak=-1,offset=0;
    for(let step=-span;step<=span;step++){
      const at=offsetAt(x+(axis===0?step:0),y+(axis===1?step:0),w,h);
      const value=luma(previous,at)*previous[at+3]/255-Math.abs(step)*2;
      if(value>peak){peak=value;offset=step;}
    }
    return offset;
  }

  function dataMosh(frame,s,hist,delta) {
    const {w,h,data}=frame;
    const block=Math.max(5,Math.round(w/49*(.48+s.size*.12)));
    const field=motionField(hist.lum,hist.prevLum,w,h,block,Math.min(22,Math.round(7+delta*72)));
    const {cols,rows,strength}=field;
    const count=strength.length;
    const flow=s.flow/100, amount=s.strength/100;
    if(!amount) return data;
    if(!hist.mosh) {
      hist.mosh={anchor:hist.result,energy:0,
        vx:new Float32Array(count),vy:new Float32Array(count),memory:new Float32Array(count),
        bendX:new Float32Array(count),bendY:new Float32Array(count),local:new Float32Array(count),sparse:0};
    }
    const track=hist.mosh;
    let changed=0, samples=0;
    for(let i=0;i<hist.lum.length;i+=113){
      changed+=Math.abs(hist.lum[i]-hist.prevLum[i]);samples++;
    }
    const sceneChange=changed/(255*samples);
    track.energy+=sceneChange;
    const isolated=sceneChange<.018?sparseMotion(hist.lum,hist.prevLum):0;
    track.sparse=Math.max(0,Math.min(2,track.sparse+delta*(isolated>0?isolated*2.65:-1.5)));
    let globalX=0, globalY=0, votes=0;
    for(let i=0;i<count;i++){
      const vote=clamp((strength[i]-.03)*2.6,0,1);
      globalX+=clamp(field.xFlow[i],-block*.45,block*.45)*vote;
      globalY+=clamp(field.yFlow[i],-block*.45,block*.45)*vote;
      votes+=vote;
    }
    const consensus=Math.max(count*.048,votes);
    const [cameraX,cameraY]=dominantMotion(hist.lum,hist.prevLum,w,h,delta);
    globalX=mix(globalX/consensus,cameraX,.75);
    globalY=mix(globalY/consensus,cameraY,.75);
    const dx=new Float32Array(count),dy=new Float32Array(count),refresh=new Float32Array(count);
    const shearX=new Float32Array(count),shearY=new Float32Array(count),outliers=new Float32Array(count);
    const folds=new Float32Array(count),ridge=new Int8Array(count),normal=new Int8Array(count),holdRow=new Int16Array(count);
    const plateaus=new Float32Array(count),ridgeSource=new Int8Array(count),streakAxis=new Int8Array(count);
    const release=new Float32Array(count);
    const regionCols=Math.ceil(cols/2);
    for(let i=0;i<count;i++){
      const col=i%cols,row=Math.floor(i/cols);
      const left=row*cols+Math.max(0,col-1),right=row*cols+Math.min(cols-1,col+1);
      const above=Math.max(0,row-1)*cols+col,below=Math.min(rows-1,row+1)*cols+col;
      const confidence=clamp((strength[i]-.035)*2.5,0,1);
      let localX=0,localY=0,neighbors=0;
      for(const neighbor of [left,right,above,below]){
        const weight=clamp((strength[neighbor]-.025)*2.8,0,1);
        localX+=field.xFlow[neighbor]*weight;
        localY+=field.yFlow[neighbor]*weight;
        neighbors+=weight;
      }
      const vx=mix((localX+globalX*.85)/(neighbors+.85),field.xFlow[i],confidence*.83);
      const vy=mix((localY+globalY*.85)/(neighbors+.85),field.yFlow[i],confidence*.83);
      const drift=1-Math.exp(-9*delta);
      track.vx[i]=mix(track.vx[i],vx,drift);
      track.vy[i]=mix(track.vy[i],vy,drift);
      if(track.sparse>0) {
        const local=isolated>0 ? localActivity(hist.lum,hist.prevLum,w,h,col,row,block) : 0;
        track.local[i]=Math.max(local,track.local[i]*Math.exp(-delta*2.4));
      }
      const energy=track.energy+track.sparse*track.local[i];
      const onset=(.61+amount*.47)*(.84+probability(i,19)*.33);
      const spill=clamp((energy-onset)*5,0,1);
      release[i]=spill*spill*(3-2*spill);
      const turnover=probability(i,Math.max(1,Math.floor(energy*23)),29);
      const gain=flow*(1.31+probability(i,8)*1.1)*release[i];
      dx[i]=mix(track.vx[i],vx,.36)*gain;
      dy[i]=mix(track.vy[i],vy,.36)*gain;
      const difference=Math.hypot(vx-globalX,vy-globalY);
      outliers[i]=clamp((difference-.50)/Math.max(2.2,block*.26),0,.8);
      const region=Math.floor(row/2)*regionCols+Math.floor(col/2);
      const material=probability(region,6);
      const start=.99+amount*.28+material*.19;
      const damage=clamp((energy-start)*2.65,0,1);
      holdRow[i]=Math.floor(probability(i,54)*block);
      streakAxis[i]=Math.abs(vy+cameraY)>Math.abs(vx+cameraX) ? 1 : 0;
      if(damage>.015) {
        const cx=col*block+Math.floor(block/2),cy=row*block+Math.floor(block/2);
        const texture=moshTexture(hist.prevLum,w,h,cx,cy,block);
        const weak=clamp((material-.28)*2.6,0,1);
        const pressure=texture.aperture*flow*damage*weak;
        const phase=probability(region,17)*Math.PI*2+probability(i,17)*1.1+energy*(.68+probability(region,41)*1.25);
        const curl=block*pressure*Math.sin(phase);
        const drift=1-Math.exp(-14*delta);
        // Oriented edges are underconstrained along one axis. Nearby prediction errors leave a bent copy.
        track.bendX[i]=mix(track.bendX[i],texture.axis===0?curl:0,drift);
        track.bendY[i]=mix(track.bendY[i],texture.axis===1?curl:0,drift);
        shearX[i]=track.bendX[i]*1.27;
        shearY[i]=track.bendY[i]*1.27;
        const carry=flow*damage*(.45+1.35*weak);
        dx[i]+=cameraX*carry;
        dy[i]+=cameraY*carry;
        if(material>.50 && texture.aperture>.46) {
          normal[i]=texture.axis;
          const alignment=Math.abs(texture.axis===0?cameraY:cameraX)/Math.max(1,Math.abs(cameraX)+Math.abs(cameraY));
          const certainty=clamp((texture.aperture-.46)*3,0,1)*(.75+.25*alignment);
          const settle=1-clamp((energy-1.58)*1.35,0,.82);
          folds[i]=certainty*damage*flow*(.83+.82*settle);
          plateaus[i]=certainty*damage*flow*1.16*settle;
          ridge[i]=ridgeCenter(hist.result,w,h,cx,cy,block,texture.axis);
          ridgeSource[i]=ridgeCenter(data,w,h,cx,cy,block,texture.axis);
        }
      }
      track.memory[i]=Math.min(1,mix(track.memory[i],confidence,1-Math.exp(-6*delta)));
      // Residuals are sparse: contiguous blocks can temporarily keep predicting through an occlusion.
      const discard=(.11+flow*.22)+track.memory[i]*.26;
      const decoded=turnover<discard ? .04 : .23+turnover*.37;
      refresh[i]=(1-Math.pow(1-decoded,delta*24))*release[i]*(1-.28*amount)*
        (1-.58*clamp(Math.max(Math.abs(shearX[i]),Math.abs(shearY[i]))/block,0,1));
    }
    const tail=hist.frames;
    tail.push({time:s.time,data});
    const lookback=.045+flow*.075;
    while(tail.length>1 && tail[1].time<=s.time-lookback)tail.shift();
    const recent=tail[0].data;
    const previous=hist.result;
    const result=new Uint8ClampedArray(data.length);
    const retention=Math.min(1,amount/.3);
    const decay=clamp((track.energy-1.19-amount*.40)/.17,0,1);
    const holdColor=1-decay*decay*(3-2*decay);
    const arc=Array.from({length:block},(_,v)=>Math.sin(Math.PI*(v+.5)/block));
    const divisions=Array.from({length:block},(_,v)=>(v+.5)/block-.5);
    for(let y=0;y<h;y++){
      const row=Math.floor(y/block)*cols;
      const uy=divisions[y%block],cy=arc[y%block];
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4, cell=row+Math.floor(x/block);
        if(release[cell]<.0001) {
          for(let k=0;k<3;k++)result[i+k]=mix(data[i+k],track.anchor[i+k],retention);
          result[i+3]=data[i+3];
          continue;
        }
        const xb=x%block,yb=y%block,ux=divisions[xb],cx=arc[xb];
        let mappedX=x+dx[cell]+shearX[cell]*(.26+.67*cy+ux*.64);
        let mappedY=y+dy[cell]+shearY[cell]*(.12+.77*cx+uy*.57);
        if(folds[cell]>.02) {
          if(normal[cell]===0) {
            mappedX=mix(mappedX,x-xb+block*.5+ridge[cell]+dx[cell],folds[cell]*cy);
          } else {
            mappedY=mix(mappedY,y-yb+block*.5+ridge[cell]+dy[cell],folds[cell]*cx);
          }
        }
        const sx=limit(mappedX,w-1),sy=limit(mappedY,h-1);
        const u=Math.floor(sx),v=Math.floor(sy),fx=sx-u,fy=sy-v;
        const j=(v*w+u)*4,k=(v*w+Math.min(w-1,u+1))*4;
        const l=(Math.min(h-1,v+1)*w+u)*4,m=l+(u<w-1?4:0);
        const a=(1-fx)*(1-fy)*previous[j+3],b=fx*(1-fy)*previous[k+3];
        const c=(1-fx)*fy*previous[l+3],d=fx*fy*previous[m+3];
        const alpha=a+b+c+d,weight=release[cell]/255;
        const anchorWeight=1-alpha*weight;
        const anchorRed=track.anchor[i],anchorGreen=track.anchor[i+1],anchorBlue=track.anchor[i+2];
        let red=anchorRed*anchorWeight+weight*(previous[j]*a+previous[k]*b+previous[l]*c+previous[m]*d);
        let green=anchorGreen*anchorWeight+weight*(previous[j+1]*a+previous[k+1]*b+previous[l+1]*c+previous[m+1]*d);
        let blue=anchorBlue*anchorWeight+weight*(previous[j+2]*a+previous[k+2]*b+previous[l+2]*c+previous[m+2]*d);
        const freshRed=recent[i],freshGreen=recent[i+1],freshBlue=recent[i+2];
        const newChroma=Math.max(freshRed,freshGreen,freshBlue)-Math.min(freshRed,freshGreen,freshBlue);
        const anchorChroma=Math.max(anchorRed,anchorGreen,anchorBlue)-Math.min(anchorRed,anchorGreen,anchorBlue);
        if(holdColor>.001 && anchorChroma>newChroma+34) {
          // Highly distinct pieces of the held prediction are not immediately replaced by a weaker residual.
          const separation=Math.max(Math.abs(freshRed-anchorRed),Math.abs(freshGreen-anchorGreen),Math.abs(freshBlue-anchorBlue));
          const hold=holdColor*clamp((anchorChroma-newChroma-34)/70,0,1)*clamp((separation-30)/60,0,1)*track.anchor[i+3]/255;
          red=mix(red,anchorRed,hold);green=mix(green,anchorGreen,hold);blue=mix(blue,anchorBlue,hold);
        }
        if(plateaus[cell]>.03) {
          const axis=normal[cell];
          const tangent=axis===0?cy:cx;
          const axisPosition=axis===0?xb:yb;
          const position=block*.5+ridgeSource[cell];
          const donor=axis===0 ? offsetAt(x-xb+position,y+dy[cell],w,h) : offsetAt(x+dx[cell],y-yb+position,w,h);
          const donorLuma=luma(recent,donor);
          const priorLuma=.2126*red+.7152*green+.0722*blue;
          const distance=Math.abs(axisPosition+.5-position)/block;
          const expanded=plateaus[cell]*(.47+.53*tangent)*clamp((.28-distance)*8,0,1)*
            clamp((donorLuma-priorLuma-16)/74,0,1)*recent[donor+3]/255;
          red=mix(red,recent[donor],expanded);green=mix(green,recent[donor+1],expanded);blue=mix(blue,recent[donor+2],expanded);
        }
        const innovation=Math.max(Math.abs(freshRed-red),Math.abs(freshGreen-green),Math.abs(freshBlue-blue));
        const blocked=clamp((innovation-26)/105,0,1);
        const oldChroma=Math.max(red,green,blue)-Math.min(red,green,blue);
        const saturationGain=clamp((newChroma-oldChroma-14)/62,0,.95);
        const lumaRise=.2126*(freshRed-red)+.7152*(freshGreen-green)+.0722*(freshBlue-blue);
        const highlightGain=clamp((lumaRise-34)/86,0,1)*(.57+.43*outliers[cell]);
        // Unexpected color residuals from independently moving blocks are decoded sparsely.
        let decoded=(recent[i+3]/255)*refresh[cell]*(1-blocked*outliers[cell])*
          (1-blocked*saturationGain)*(1-blocked*highlightGain);
        if((streakAxis[cell] ? xb : yb)===holdRow[cell] && blocked>.35 && release[cell]>.85) {
          if(newChroma>oldChroma) decoded=Math.max(decoded,refresh[cell]*.7*recent[i+3]/255);
          else decoded*=.52;
        }
        result[i]=mix(data[i],mix(red,freshRed,decoded),retention);
        result[i+1]=mix(data[i+1],mix(green,freshGreen,decoded),retention);
        result[i+2]=mix(data[i+2],mix(blue,freshBlue,decoded),retention);
        result[i+3]=data[i+3];
      }
    }
    return result;
  }

  function opticalFlow(frame,s,hist={},delta=0) {
    const {w,h,data}=frame;
    let field;
    if(hist.lum && hist.prevLum) {
      field=motionField(hist.lum,hist.prevLum,w,h,Math.round(5+s.size*.77),Math.min(16,Math.round(7+delta*55)));
      const amount=1-Math.exp(-(5+s.speed*.39)*delta);
      const last=hist.field;
      for (let i=0; i<field.xFlow.length; i++) {
        field.xFlow[i]=mix(last?.xFlow[i] || 0,field.xFlow[i],amount);
        field.yFlow[i]=mix(last?.yFlow[i] || 0,field.yFlow[i],amount);
      }
      hist.field=field;
    }
    const lumas=hist.lum || lumaFrame(frame);
    const amplitude=s.distortion*.01*Math.max(w,h)*.029;
    const distance=s.distortion*.081;
    const frequency=(15+s.size*.68)/Math.max(w,h);
    const tick=s.time*(.45+s.speed*.044);
    const result=new Uint8ClampedArray(data.length);
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const [dx,dy]=field ? vectorAt(field,x,y) : [0,0];
      const l=lumas[y*w+x]/255;
      const lx=(lumas[y*w+limit(x+3,w-1)]-lumas[y*w+limit(x-3,w-1)])/255;
      const ly=(lumas[limit(y+3,h-1)*w+x]-lumas[limit(y-3,h-1)*w+x])/255;
      const xx=frequency*x, yy=frequency*y;
      const swirl=Math.sin(xx*.71+yy*1.30+Math.sin(yy+.4)*1.36+l*4+tick);
      const driftX=amplitude*(.59*swirl+.41*Math.sin(yy*.62-xx*1.43-tick*.79)+ly*1.25);
      const driftY=amplitude*(.56*Math.cos(xx*1.27-yy*.95+swirl+tick*.56)-.43*lx);
      const sample=offsetAt(x+dx*distance+driftX,y+dy*distance+driftY,w,h);
      const trail=hist.result ? .15*clamp(Math.hypot(dx,dy)/4,0,1) : 0;
      pixelBlend(result,i,data,sample,hist.result||data,offsetAt(x+dx,y+dy,w,h),trail);
    }
    return result;
  }

  function feedback(frame,s,hist,delta) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data);
    const prior=hist.result;
    const timeStep=clamp(delta*24,.1,4);
    const turn=rad(s.rotate)*timeStep;
    const c=Math.cos(turn), d=Math.sin(turn);
    const inverse=1/Math.pow(s.zoom/100,timeStep);
    const hue=rad(s.hue)*timeStep;
    const cosHue=Math.cos(hue), sinHue=Math.sin(hue);
    const baseHold=clamp((s.strength/100)*1.16+(s.size-8)*.012,0,.982);
    const persistence=Math.pow(baseHold,timeStep);
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const u=x-(w-1)*.5, v=y-(h-1)*.5;
      const bend=Math.sin(v/Math.max(1,h)*11+s.time*.7)*w*(s.warp-50)*.00042;
      const sx=(u*c-v*d)*inverse+(w-1)*.5+bend-w*(s.shiftX||0)*.001*timeStep;
      const sy=(u*d+v*c)*inverse+(h-1)*.5-h*(s.shiftY||0)*.001*timeStep;
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
    const reach=(.52+s.size*.22)*Math.max(w,h)/260;
    const theta=rad(s.angle);
    const dx=Math.cos(theta)*reach, dy=Math.sin(theta)*reach;
    const motion=.17+s.flow*.009;
    const taps=[[0,0],[-dx,-dy],[dx*motion,dy*motion],[-dy*.65,dx*.65],[dy*.65,-dx*.65],
      [dx*.7-dy*.45,dy*.7+dx*.45],[-dx*.9+dy*.5,-dy*.9-dx*.5]];
    const density=hist ? .90-s.flow*.0022 : .48-s.flow*.0024;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const origin=luma(data,i);
      const opacity=data[i+3]/255;
      let red=data[i]*opacity*1.7,green=data[i+1]*opacity*1.7,blue=data[i+2]*opacity*1.7,cov=opacity*1.7;
      for (const [ox,oy] of taps) {
        const j=offsetAt(x+ox,y+oy,w,h);
        const similarity=Math.abs(luma(data,j)-origin)/255;
        const k=(1-similarity)**3*data[j+3]/255;
        red+=data[j]*k;green+=data[j+1]*k;blue+=data[j+2]*k;cov+=k;
      }
      const wash=(probability(x,y)-.5)*2.2;
      const lag=hist?.result ? (.065+s.flow*.00125)*hist.result[i+3]/255 : 0;
      const p=offsetAt(x-dx*.45,y-dy*.45,w,h);
      const divide=1/(cov || 1);
      result[i]=mix((red*divide+wash)*density,hist?.result?.[p] || 0,lag);
      result[i+1]=mix((green*divide+wash)*density,hist?.result?.[p+1] || 0,lag);
      result[i+2]=mix((blue*divide+wash)*density,hist?.result?.[p+2] || 0,lag);
      result[i+3]=data[i+3];
    }
    return result;
  }

  function slitScan(frame,s,hist) {
    const {w,h,data}=frame;
    const queue=hist.frames;
    const count=s.slices;
    const span=Math.min(1.25,(count-1)/18.5*s.size/8);
    const frames=Array.from({length:count},(_,i)=>{
      if (!i) return data;
      const target=s.time-span*i/(count-1);
      return queue.reduce((best,item)=>Math.abs(item.time-target)<Math.abs(best.time-target)?item:best).data;
    });
    const result=new Uint8ClampedArray(data.length);
    const theta=rad(s.angle), nx=Math.cos(theta), ny=Math.sin(theta);
    const spanX=Math.abs(nx),spanY=Math.abs(ny),distance=spanX+spanY;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const label=.5+(nx*(x/Math.max(1,w-1)-.5)+ny*(y/Math.max(1,h-1)-.5))/distance;
      const i=(y*w+x)*4;
      const selected=frames[limit(Math.floor(label*count),count-1)];
      for(let channel=0;channel<4;channel++) result[i+channel]=selected[i+channel];
    }
    return result;
  }

  function decimate(frame,s,hist={}) {
    const {w,h,data}=frame;
    const bucket=Math.floor((s.time+1e-7)*s.speed);
    if (hist.bucket===bucket && hist.result) return hist.result;
    hist.bucket=bucket;
    const result=new Uint8ClampedArray(data.length);
    const block=Math.round(4+s.size*.84);
    const colorize=s.colorize/100;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const gx=Math.floor(x/block),gy=Math.floor(y/block);
      const tile=probability(gx,gy,bucket);
      const keep=hist.result && tile<.22;
      const source=keep ? hist.result : data;
      const blockCenter=offsetAt((gx+.5)*block,(gy+.5)*block,w,h);
      const tint=keep ? colorize*.21 : colorize*(tile>.77 ? .43 : .075);
      const flat=tile>.74 ? .20+colorize*.29 : 0;
      const brightness=tile>.84 ? 20*colorize : 4*colorize;
      const lum=luma(source,blockCenter);
      result[i]=mix(mix(source[i],source[blockCenter],flat),lum*1.14+brightness,tint);
      result[i+1]=mix(mix(source[i+1],source[blockCenter+1],flat),lum*.96+brightness,tint);
      result[i+2]=mix(mix(source[i+2],source[blockCenter+2],flat),lum*.89+brightness,tint);
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
    const dataMoshType=s.type==="mosh-data-mosh";
    const stillWash=s.type==="mosh-watercolor" && !s.videoSource;
    if (!s.videoSource && !stillWash) {
      if(!dataMoshType) passthrough(ctx,input,s);
      return;
    }
    const highDetail=["mosh-data-mosh","mosh-feedback","mosh-slit-scan"].includes(s.type);
    const frame=read(input,s,highDetail?640:320);
    if(stillWash) return write(ctx,frame,watercolor(frame,s),s);
    const hist=s.history || {};
    const {w,h,data}=frame;
    const delta=s.time-hist.time;
    const sameResolution=hist.w===w && hist.h===h;
    if (sameResolution && Math.abs(delta)<1e-6) {
      if(!hist.first) return write(ctx,frame,hist.result,s);
      if(!dataMoshType) return passthrough(ctx,input,s);
      return;
    }
    const continuous=sameResolution && delta>0 && delta<.37;
    if (!continuous) {
      hist.field=null;
      hist.mosh=null;
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
      const windowSeconds=Math.min(1.25,(s.slices-1)/18.5*s.size/8);
      while(hist.frames.length>1 && (hist.frames.length>42 || s.time-hist.frames[1].time>windowSeconds+.04)) hist.frames.shift();
    }
    hist.w=w;hist.h=h;hist.time=s.time;
    if(hist.first) {
      if(!dataMoshType) passthrough(ctx,input,s);
      return;
    }
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
    const yaw=-.015+Math.sin(cycle)*tilt;
    const pitch=.10+.37*tilt*Math.cos(cycle);
    const cos=Math.cos(yaw),sin=Math.sin(yaw);
    const elevation=(.016+s.size*.006)*s.lumaHeight*.011;
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
      const perspective=1/(1+depth*(.043+tilt*.22));
      nodes.push({
        x:s.width*(.5+px*perspective*1.021),
        y:s.height*(.516+(depth*Math.cos(pitch)-height)*perspective*1.025),
        r:data[i],g:data[i+1],b:data[i+2],a:data[i+3]/255,height
      });
    }

    passthrough(ctx,input,s);
    if(s.mode!=="mesh") {
      ctx.fillStyle=s.blend==="normal"?"rgba(7,15,20,.63)":"rgba(7,15,20,.40)";
      ctx.fillRect(0,0,s.width,s.height);
    }
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
      ctx.lineWidth=Math.max(.35,outputScale*.00067);
      for (let y=rows-1; y>=0; y--) {
        for (let x=0;x<cols;x++) {
          const a=nodes[y*(cols+1)+x],b=nodes[y*(cols+1)+x+1];
          const c=nodes[(y+1)*(cols+1)+x], d=nodes[(y+1)*(cols+1)+x+1];
          for (const [p,q,r] of [[a,b,c],[b,d,c]]) {
            const average=(p.a+q.a+r.a)/3;
            const shading=clamp(1.13+(p.height-q.height)*12-(r.height-p.height)*10,.68,1.58);
            trace([p,q,r],true);
            ctx.fillStyle=color({r:(p.r+q.r+r.r)/3, g:(p.g+q.g+r.g)/3, b:(p.b+q.b+r.b)/3},shading);
            ctx.globalAlpha=s.meshOpacity*.01*average;
            ctx.fill();
            if (s.gridOpacity>0) {
              ctx.strokeStyle=s.gridColor==="source"?color(p,1.35):grid;
              ctx.globalAlpha=s.gridOpacity*.0072*average;
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
    const frame=read(input,s,580), {w,h,data}=frame;
    const scale=Math.min(w,h)*(.0015+s.size*.00082);
    const direction=rad(s.angle);
    const vx=Math.cos(direction),vy=Math.sin(direction);
    const vxShift=vx*travel*scale,vyShift=vy*travel*scale;
    const colorOffset=(.55+Math.abs(travel)*.8)*scale;
    const result=new Uint8ClampedArray(data.length);
    for(let y=0,i=0;y<h;y++) {
      for(let x=0;x<w;x++,i+=4) {
        const xx=x+vxShift,yy=y+vyShift;
        const g=offsetAt(xx,yy,w,h);
        const r=offsetAt(xx+vx*colorOffset,yy+vy*colorOffset,w,h);
        const b=offsetAt(xx-vx*colorOffset*.77,yy-vy*colorOffset*.77,w,h);
        result[i]=data[r];result[i+1]=data[g+1];result[i+2]=data[b+2];result[i+3]=data[g+3];
      }
    }
    write(ctx,frame,result,s);
  }

  function shake(input,ctx,s) {
    const rate=3+Math.round(s.speed*.44), moment=phase(s.time)*rate;
    const sample=Math.floor(moment);
    const punch=Math.pow(1-(moment-sample),.82);
    const impulse=(.25+.75*punch)*Math.min(s.width,s.height)*(.008+s.size*.0029);
    const direction=probability(sample,13)*tau;
    moveFrame(input,ctx,s,Math.cos(direction)*impulse,Math.sin(direction)*impulse);
  }

  function melt(frame,s) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data.length);
    const stripe=Math.max(2,Math.max(w,h)*(.007+s.size*.00195));
    const cycle=s.time*tau*(.08+s.speed*.019);
    const runs=Array.from({length:w},(_,x)=>{
      const pos=x/stripe, base=Math.floor(pos), f=pos-base;
      const smooth=f*f*(3-2*f);
      const swell=base=>probability(base,7)*(.67+.33*Math.sin(cycle+probability(base,6)*tau));
      return mix(swell(base),swell(base+1),smooth);
    });
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i=(y*w+x)*4;
      const run=runs[x];
      const v=y/Math.max(1,h-1);
      const wind=Math.sin(v*13+x/w*9+cycle);
      const offsetY=(run-.27)*h*(.045+s.size*.0095)*(.56+.44*v) + wind*h*.013;
      const offsetX=(Math.sin(v*15+cycle+run*6)*.43+wind*.57)*w*(.012+run*.036);
      const j=offsetAt(x+offsetX,y-offsetY,w,h);
      for(let k=0;k<4;k++) result[i+k]=data[j+k];
    }
    return result;
  }

  function badTV(frame,s) {
    const {w,h,data}=frame;
    const result=new Uint8ClampedArray(data.length);
    const rollPhase=s.roll ? ((.177+s.time*s.roll*.00823)%1+1)%1 : 0;
    const cycle=s.time*tau*1.85;
    for (let y=0;y<h;y++) {
      const v=y/Math.max(1,h-1);
      const sy=((v-rollPhase)%1+1)%1;
      const lineGap=Math.abs(v-rollPhase), d=Math.min(lineGap,1-lineGap);
      const shape=Math.exp(-d*d*(80-s.size*2));
      const bend=(Math.sin(11*v+cycle*.43)*.74+Math.sin(v*4+cycle)*.26)*w*s.thick*.00118;
      const snow=(probability(y,epoch(s.time,60))-.5)*s.fine*.0009*w;
      const move=bend+shape*w*s.thick*.00085*Math.sin(d*11+1)+snow;
      const echo=w*s.fine*.00008*(shape+.4);
      const stain=1-.055*shape-.025*(1+Math.cos(v*h*Math.PI));
      for (let x=0;x<w;x++) {
        const i=(y*w+x)*4;
        const xx=((x+move)%w+w)%w;
        const yy=sy*(h-1);
        const g=offsetAt(xx,yy,w,h), r=offsetAt(xx+echo,yy,w,h), b=offsetAt(xx-echo,yy,w,h);
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
    const waves=11-s.size*.59;
    for (let y=0;y<h;y++) {
      const v=y/Math.max(1,h-1);
      const focus=Math.exp(-((v-.52)*(v-.52))*6.2);
      const power=Math.pow(.5+.5*Math.sin(v*waves+cycle),2.8)*focus;
      const shift=(Math.sin(v*29-cycle)*.66+.34)*power*w*.056;
      const separation=(power-.04)*w*(.009+s.size*.0025);
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
    const size=Math.max(3,Math.round(Math.max(w,h)*(.018+s.size*.0042)));
    for (let y=0;y<h;y++) {
      const band=Math.floor(y/(size*.62));
      const lineCheck=probability(band,moment,62);
      const drift=lineCheck<.40?(probability(band,moment,12)-.5)*w*.36:0;
      for (let x=0;x<w;x++) {
        const i=(y*w+x)*4;
        const gx=Math.floor(x/size), gy=Math.floor(y/size);
        const shape=probability(gx,gy,moment);
        const dx=shape>.73?(probability(gx,gy,moment+51)-.5)*w*.24:0;
        const dy=shape>.93?(probability(gx,gy,moment+13)-.5)*h*.15:0;
        const rx=drift+dx, ry=y+dy;
        const split=(shape>.73 || drift ? 1 : .32)*w*s.split*.00125;
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
    if (!s.videoSource && (s.type==="mosh-optical-flow" || s.type==="mosh-decimate")) {
      const frame=read(input,s,512);
      write(ctx,frame,temporal[s.type](frame,s),s);
    } else if (Object.hasOwn(temporal,s.type)) drawTemporal(input,ctx,s);
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
