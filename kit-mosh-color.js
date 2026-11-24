(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (n,min=0,max=1) => Math.max(min,Math.min(max,n));
  const lerp = (a,b,t) => a + (b-a)*t;
  const fract = n => n-Math.floor(n);
  const radians = n => n*Math.PI/180;
  const light = (r,g,b) => .2126*r+.7152*g+.0722*b;
  const luma = (bytes,i) => light(bytes[i],bytes[i+1],bytes[i+2]);
  const ease = (low,high,n) => {
    const t = clamp((n-low)/(high-low));
    return t*t*(3-2*t);
  };
  function random(seed) {
    let bits = Math.imul(seed ^ 0x9e3779b9,0x85ebca6b);
    bits = Math.imul(bits ^ bits>>>13,0xc2b2ae35);
    return ((bits ^ bits>>>16)>>>0) / 4294967296;
  }
  function range(key,label,min,max,value,step=1) {
    return {key,label,kind:'range',min,max,step,value};
  }
  function select(key,label,value,choices) {
    return {key,label,kind:'select',value,options:choices.map(([value,label])=>({value,label}))};
  }
  function colorPicker(key,label,value) { return {key,label,value,kind:'color'}; }
  const toggle = (key,label,value='off') => select(key,label,value,[['off','关'],['on','开']]);
  const definition = (name,english,scaleLabel,size,strength,description,controls=[],timed=false) => ({
    name,english,scaleLabel,size,strength,description,controls,timed,group:'色调与镜头',groupEnglish:'Color & optics'
  });

  const definitions = {
    'mosh-posterize':definition('色阶分带','Posterize','色阶数',6,100,'将连续色调量化为有限色阶，让平滑渐变变成清晰色带。'),
    'mosh-solarize':definition('日晒反相','Solarize','反相曲线',8,88,'保持暗部，将达到阈值的亮部反相，并可染色。',[
      range('cutoff','亮部阈值',12,94,59),range('lift','曝光偏移',-30,30,0),
      select('tint','反相染色','none',[['none','无染色'],['amber','琥珀'],['cyan','冰青']])]),
    'mosh-bleach':definition('漂白过曝','Bleach','漂白深度',9,81,'抬升中间调并压缩高光，保留可调的原片颜色。',[
      range('color','留色比例',0,100,30)]),
    'mosh-sharpen':definition('锐化','Sharpen','锐化半径',4,72,'以高斯模糊估计低频，再加强细节和边缘反差。',[
      range('gain','边缘增益',10,250,115)]),
    'mosh-color-correction':definition('基础色彩校正','Color Correction','中间调',8,82,'分别调整曝光、对比度、饱和度和色相，或输出负片。',[
      range('exposure','曝光偏移',-40,40,7),range('contrast','对比度',-75,75,10),range('saturation','饱和度',-100,100,14),
      range('hue','色相角度',-180,180,0),toggle('negative','负片')]),
    'mosh-curves':definition('通道曲线','Curves','曲线中点',8,88,'沿平滑的五点曲线重映射所有色彩或单独的红绿蓝通道。',[
      select('channel','曲线通道','rgb',[['rgb','综合色彩'],['r','红色'],['g','绿色'],['b','蓝色']]),
      range('black','黑场输出',0,100,2),range('shadows','暗部输出',0,100,16),
      range('highlights','亮部输出',0,100,84),range('white','白场输出',0,100,99)]),
    'mosh-hue-cycle':definition('色相循环','Hue Cycle','色彩密度',10,88,'在色轮上整体旋转颜色，并能按时间循环。',[
      range('phase','起始色相',-180,180,56),range('speed','每秒色相角',-180,180,70)],true),
    'mosh-duotone':definition('双色调','DuoTone','双色映射曲线',8,96,'根据原片亮度，在暗色和亮色之间连续取色。',[
      colorPicker('darks','双色暗部颜色','#17274a'),colorPicker('lights','双色高光颜色','#faca75')]),
    'mosh-rainbow':definition('亮度彩虹','Rainbow','彩带跨度',8,83,'用亮度索引彩色色带，沿选定方向偏移并随时间循环。',[
      select('ramp','彩带方案','spectrum',[['spectrum','光谱'],['heat','热感'],['electric','电光']]),
      range('phase','彩带偏移',0,100,12),range('angle','彩带角度',0,360,27),range('speed','彩带速度',-100,100,17)],true),
    'mosh-instacolor':definition('即拍风格','InstaColor','调色深度',9,86,'用原创预设组合色彩曲线、色温和褪色。',[
      select('grade','调色方案','amber',[['amber','暖纸'],['cold','冷银'],['fade','旧相纸'],['night','深夜']])]),
    'mosh-rgb-shift':definition('RGB通道偏移','RGB Shift','分离距离',7,82,'分别移动红绿蓝通道，复现彩色信号的空间错位。',[
      range('angle','偏移角度',0,360,12),select('mode','分色模式','split',[['split','两向分离'],['red','仅移动红色'],['radial','径向分色']])]),
    'mosh-vignette':definition('镜头暗角','Vignette','暗角起点',8,80,'将四角渐变到指定颜色，可调边缘过渡和轮廓形状。',[
      range('feather','过渡宽度',8,100,66),range('roundness','轮廓圆度',0,100,75),colorPicker('tint','暗角颜色','#0c1222')]),
    'mosh-tilt-shift':definition('移轴景深','Tilt Shift','清晰带宽',7,89,'保持倾斜的焦带清晰，逐渐模糊焦带外的区域。',[
      range('position','焦带位置',0,100,47),range('angle','焦带角度',-90,90,0),range('radius','模糊半径',2,45,19)]),
    'mosh-barrel-blur':definition('桶形镜头模糊','Barrel Blur','径向弯曲',9,88,'从中心向边缘逐渐软化并分散色彩，同时弯曲镜头坐标。',[
      toggle('invert','中心模糊'),toggle('concave','凹形畸变'),range('fringe','径向色边',0,100,37)]),
    'mosh-glow':definition('高光辉光','Glow','辉光范围',8,81,'只提取超过阈值的亮部，让光溢出明亮物体边缘。',[
      range('cutoff','亮部阈值',18,95,64)]),
    'mosh-blur':definition('高斯模糊','Blur','模糊半径',9,94,'以高斯核均匀软化画面。'),
    'mosh-light-streak':definition('高光拉丝','Light Streak','拉光长度',9,93,'沿指定角度拉长亮部，可分开光迹的颜色并使方向缓慢摆动。',[
      range('angle','拉光角度',0,360,0),range('fringe','光迹色差',0,100,38),
      range('cutoff','亮部阈值',18,95,58),range('drift','光迹摆幅',0,45,5)],true),
    'mosh-strobe':definition('节拍闪切','Strobe','明暗停留',8,80,'按节拍间歇压暗画面，支持不规律脉冲。',[
      range('rate','闪切频率',.25,3,1.5,.25),toggle('randomness','随机节拍')],true),
    'mosh-super8':definition('超八毫米胶片','Super8','片门抖动',7,90,'模拟老电影的画面漂移、过片暗带、漏光和浮尘。',[
      range('burn','胶片漏光',0,100,58),range('dust','胶片浮尘',0,100,41),toggle('gate','显示片门','on'),
      range('roll','过片速度',0,100,20)],true),
    'mosh-scanlines':definition('显像扫描线','ScanLines','扫描间距',5,75,'用可旋转的重复亮暗细线模拟显像管扫描。',[
      range('duty','扫描线宽度',5,95,37),range('angle','扫描角度',0,180,0),
      select('mode','扫描线叠法','multiply',[['multiply','压暗'],['screen','提亮'],['soft-light','柔和对比']])]),
    'mosh-grain':definition('胶片与数码颗粒','Grain','颗粒尺度',5,68,'叠加随时间变化的数码噪点或成簇的胶片颗粒。',[
      select('stock','颗粒类型','film',[['film','胶片簇'],['digital','数码噪点']]),toggle('rgb','彩色颗粒'),
      select('mode','颗粒叠法','soft-light',[['soft-light','柔和对比'],['overlay','强对比'],['multiply','压暗']])],true),
    'mosh-8-bit':definition('八位像素画','8-Bit','像素块大小',8,94,'先按像素块平均颜色，再匹配到限定的原创复古调色板。',[
      select('palette','八位调色板','arcade',[['arcade','街机十六色'],['terminal','绿色掌机'],['home','家用机冷暖']])]),
    'mosh-dot-matrix':definition('显示点阵','Dot Matrix','点阵密度',7,96,'用直径随亮度变化的显示点重新绘制素材。',[
      range('diameter','满亮点直径',25,96,78),range('softness','点缘柔化',0,100,14),
      select('ink','点阵发光色','green',[['green','荧光绿'],['warm','橙色指示灯'],['source','保留原色']])])
  };

  const cache = new WeakMap();
  function buffer(owner,key,width,height) {
    if (!cache.has(owner)) cache.set(owner,new Map());
    const pool = cache.get(owner);
    if (!pool.has(key)) pool.set(key,owner.ownerDocument.createElement('canvas'));
    const canvas = pool.get(key);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return canvas;
  }
  function logical(s) {
    return Math.min(s.width/(s.sourceWidth || s.width),s.height/(s.sourceHeight || s.height));
  }
  function context(canvas) { return canvas.getContext('2d',{willReadFrequently:true}); }
  function workSize(input,cap) {
    const factor = Math.min(1,cap/Math.max(input.width,input.height));
    return [Math.max(1,Math.round(input.width*factor)),Math.max(1,Math.round(input.height*factor))];
  }
  function copy(owner,key,input,width,height) {
    const out = buffer(owner,key,width,height);
    const ctx = context(out);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(input,0,0,width,height);
    return out;
  }
  function pixels(input) { return context(input).getImageData(0,0,input.width,input.height); }
  function edit(input,output,operation) {
    const image = pixels(input);
    operation(image.data);
    context(output).putImageData(image,0,0);
  }
  function color(text,otherwise) {
    const code = typeof text==='string' && text.trim().match(/^#?([0-9a-f]{6})$/i);
    if (!code) return otherwise;
    const rgb = Number.parseInt(code[1],16);
    return [rgb>>16,(rgb>>8)&255,rgb&255];
  }
  function table(fn) { return Uint8ClampedArray.from({length:256},(_,i)=>fn(i/255)*255); }
  function applyTable(input,output,lut,channel='rgb') {
    edit(input,output,data=>{
      const red = channel==='rgb'||channel==='r';
      const green = channel==='rgb'||channel==='g';
      const blue = channel==='rgb'||channel==='b';
      for(let i=0;i<data.length;i+=4) {
        if(red) data[i]=lut[data[i]];
        if(green) data[i+1]=lut[data[i+1]];
        if(blue) data[i+2]=lut[data[i+2]];
      }
    });
  }

  function posterize(input,output,s) {
    const levels = Math.max(1,Math.round(s.size)-1);
    applyTable(input,output,table(value=>Math.round(value*levels)/levels));
  }
  function solarize(input,output,s) {
    const start = s.cutoff*2.55;
    const shoulder = 5 + s.size*3;
    const lifted = s.lift*2.55;
    const tints = {none:[1,1,1],amber:[1.16,1.02,.69],cyan:[.74,1.06,1.20]};
    const tint = tints[s.tint] || tints.none;
    edit(input,output,data=>{
      for(let i=0;i<data.length;i+=4) {
        const t = ease(start,start+shoulder,luma(data,i)+lifted);
        for(let c=0;c<3;c++) data[i+c]=lerp(data[i+c],(255-clamp(data[i+c]+lifted,0,255))*tint[c],t);
      }
    });
  }
  function bleach(input,output,s) {
    const wash = .14+s.size*.040;
    const retain = s.color/100;
    edit(input,output,data=>{
      for(let i=0;i<data.length;i+=4) {
        const tone = luma(data,i)/255;
        const raised = 255*clamp(tone+wash*Math.pow(tone,.38)*(1-tone)*1.7);
        data[i]=raised+(data[i]-tone*255)*retain+3;
        data[i+1]=raised+(data[i+1]-tone*255)*retain;
        data[i+2]=raised+(data[i+2]-tone*255)*retain-4;
      }
    });
  }
  function curveTable(values) {
    const step = .25;
    const gradients = values.slice(1).map((y,i)=>(y-values[i])/step);
    const tangent = [gradients[0]];
    for(let i=1;i<gradients.length;i++) {
      const a=gradients[i-1],b=gradients[i];
      tangent.push(a*b>0 ? 2*a*b/(a+b) : 0);
    }
    tangent.push(gradients.at(-1));
    return table(x=>{
      const k=Math.min(3,Math.floor(x*4));
      const t=x*4-k, t2=t*t, t3=t2*t;
      return (2*t3-3*t2+1)*values[k] + (-2*t3+3*t2)*values[k+1] +
        (t3-2*t2+t)*step*tangent[k] + (t3-t2)*step*tangent[k+1];
    });
  }
  function curves(input,output,s) {
    const y = [s.black/100,s.shadows/100,.20+s.size*.0375,s.highlights/100,s.white/100];
    applyTable(input,output,curveTable(y),s.channel);
  }
  function gradePixels(input,output,angle,saturation,transform) {
    const c = Math.cos(radians(angle)), sin = Math.sin(radians(angle));
    edit(input,output,data=>{
      for(let i=0;i<data.length;i+=4) {
        const y=luma(data,i);
        const u=(data[i+2]-y)*saturation, v=(data[i]-y)*saturation;
        const blue=u*c-v*sin, red=u*sin+v*c;
        const green=-(.2126*red+.0722*blue)/.7152;
        data[i]=transform(y+red,0);
        data[i+1]=transform(y+green,1);
        data[i+2]=transform(y+blue,2);
      }
    });
  }
  function correct(input,output,s) {
    const contrast = 1+s.contrast/125;
    const lift = s.exposure*2.55;
    const gamma = Math.exp((8-s.size)*.085);
    const lut = table(n=>Math.pow(clamp((n-.5)*contrast+.5+lift/255),gamma));
    gradePixels(input,output,s.hue,1+s.saturation/100,value=>{
      const graded=lut[clamp(Math.round(value),0,255)];
      return s.negative==='on' ? 255-graded : graded;
    });
  }
  function hueCycle(input,output,s) {
    gradePixels(input,output,s.phase+s.time*s.speed,.6+.04*s.size,value=>value);
  }
  function duotone(input,output,s) {
    const a=color(s.darks,[23,39,74]), b=color(s.lights,[250,202,117]);
    const power = .48+s.size*.065;
    const tone = Float32Array.from({length:256},(_,i)=>Math.pow(i/255,power));
    edit(input,output,data=>{
      for(let i=0;i<data.length;i+=4) {
        const t=tone[Math.round(luma(data,i))];
        for(let c=0;c<3;c++) data[i+c]=lerp(a[c],b[c],t);
      }
    });
  }
  const rainbows = {
    spectrum:[[125,35,200],[57,91,235],[47,202,231],[67,207,92],[249,213,69],[232,47,45]],
    heat:[[42,22,101],[120,25,152],[206,54,108],[254,126,48],[251,233,95],[246,245,212]],
    electric:[[22,28,120],[31,86,207],[49,228,205],[193,251,207],[241,104,214],[154,43,224]]
  };
  function rainbow(input,output,s) {
    const stops = rainbows[s.ramp] || rainbows.spectrum;
    const wavelength = .35+s.size*.067;
    const dx = Math.cos(radians(s.angle))*.20/s.width;
    const dy = Math.sin(radians(s.angle))*.20/s.height;
    const phase = (s.phase+s.speed*s.time)/100;
    edit(input,output,data=>{
      for(let y=0,i=0;y<s.height;y++) {
        const shift=phase+y*dy;
        for(let x=0;x<s.width;x++,i+=4) {
          const v=luma(data,i)/255;
          const p=fract(v*wavelength+shift+x*dx)*stops.length;
          const k=Math.floor(p), a=stops[k], b=stops[(k+1)%stops.length];
          const gain=.47+v*.51;
          for(let c=0;c<3;c++) data[i+c]=lerp(a[c],b[c],p-k)*gain;
        }
      }
    });
  }
  const grades = {
    amber:{angle:-8,sat:1.21,delta:[24,9,-19],curve:[.055,.28,.55,.82,.98]},
    cold:{angle:15,sat:1.06,delta:[-20,6,24],curve:[.014,.20,.49,.84,.99]},
    fade:{angle:1,sat:.64,delta:[15,7,4],curve:[.14,.31,.54,.74,.91]},
    night:{angle:11,sat:.88,delta:[-10,0,16],curve:[.015,.13,.34,.62,.96]}
  };
  function instaColor(input,output,s) {
    const style = grades[s.grade] || grades.amber;
    const amount = clamp(.28+s.size*.049);
    const tone = curveTable(style.curve);
    gradePixels(input,output,style.angle*amount,lerp(1,style.sat,amount),(value,c)=>{
      return lerp(value,tone[clamp(Math.round(value),0,255)]+style.delta[c],amount);
    });
  }

  function gaussian(owner,input,radius,cap=1200) {
    const [w,h] = workSize(input,cap);
    const r = Math.max(.45,radius*w/input.width);
    const out = buffer(owner,'blur',w,h);
    const ctx = context(out);
    ctx.clearRect(0,0,w,h);
    if ('filter' in ctx) {
      ctx.filter=`blur(${r}px)`;
      ctx.drawImage(input,0,0,w,h);
      ctx.filter='none';
      return out;
    }
    ctx.drawImage(input,0,0,w,h);
    const image=ctx.getImageData(0,0,w,h);
    // Three constant-cost box passes approximate a Gaussian on older canvas engines.
    const work=new Uint8ClampedArray(image.data.length);
    const span=Math.max(1,Math.round(r*.85));
    for(let pass=0;pass<3;pass++) {
      box(image.data,work,w,h,span,false);
      box(work,image.data,w,h,span,true);
    }
    ctx.putImageData(image,0,0);
    return out;
  }
  function box(source,target,w,h,radius,vertical) {
    const length=vertical?h:w, slices=vertical?w:h, stride=vertical?w*4:4;
    const edge=length-1, count=2*radius+1;
    for(let line=0;line<slices;line++) {
      const base=vertical ? line*4 : line*w*4;
      for(let c=0;c<4;c++) {
        const start=base+c;
        let sum=source[start]*(radius+1);
        for(let j=1;j<=radius;j++) sum+=source[start+Math.min(edge,j)*stride];
        for(let pos=0;pos<length;pos++) {
          target[start+pos*stride]=sum/count;
          sum+=source[start+Math.min(edge,pos+radius+1)*stride]-source[start+Math.max(0,pos-radius)*stride];
        }
      }
    }
  }
  function blur(input,output,s) {
    const softened=gaussian(output,input,(s.size*.89+.55)*logical(s));
    context(output).drawImage(softened,0,0,s.width,s.height);
  }
  function sharpen(input,output,s) {
    const softened=gaussian(output,input,(.46+s.size*.33)*logical(s));
    const broad=pixels(softened).data;
    const gain=s.gain/100;
    edit(input,output,data=>{
      for(let y=0,i=0;y<s.height;y++) {
        const row=Math.min(softened.height-1,Math.floor((y+.5)*softened.height/s.height))*softened.width;
        for(let x=0;x<s.width;x++,i+=4) {
          const j=4*(row+Math.min(softened.width-1,Math.floor((x+.5)*softened.width/s.width)));
          if (broad[j+3] < 14) continue;
          for(let c=0;c<3;c++) data[i+c]+=(data[i+c]-broad[j+c])*gain;
        }
      }
    });
  }

  const readIndex = (x,y,w,h) => (clamp(Math.round(y),0,h-1)*w+clamp(Math.round(x),0,w-1))*4;
  function rgbShift(input,output,s) {
    const source=pixels(input);
    const {width:w,height:h,data}=source;
    const next=context(output).createImageData(w,h);
    const angle=radians(s.angle);
    const distance=(1+s.size*1.68)*logical(s);
    const cx=(w-1)/2,cy=(h-1)/2;
    const vx=Math.cos(angle)*distance,vy=Math.sin(angle)*distance;
    const radial=s.mode==='radial';
    const redOnly=s.mode==='red';
    const divisor=Math.max(cx,cy,1);
    for(let y=0,i=0;y<h;y++) {
      for(let x=0;x<w;x++,i+=4) {
        const dx=radial ? (x-cx)*distance/divisor : vx;
        const dy=radial ? (y-cy)*distance/divisor : vy;
        const r=readIndex(x+dx,y+dy,w,h);
        const b=redOnly ? i : readIndex(x-dx,y-dy,w,h);
        next.data[i]=data[r+3] ? data[r] : data[i];
        next.data[i+1]=data[i+1];
        next.data[i+2]=data[b+3] ? data[b+2] : data[i+2];
        next.data[i+3]=data[i+3];
      }
    }
    context(output).putImageData(next,0,0);
  }
  function vignette(input,output,s) {
    const tint=color(s.tint,[12,18,34]);
    const round=s.roundness/100;
    const start=.15+s.size*.041;
    const end=start+.25+s.feather*.0065;
    edit(input,output,data=>{
      for(let y=0,i=0;y<s.height;y++) {
        const dy=Math.abs(2*(y+.5)/s.height-1);
        for(let x=0;x<s.width;x++,i+=4) {
          const dx=Math.abs(2*(x+.5)/s.width-1);
          const distance=lerp(Math.max(dx,dy),Math.sqrt(dx*dx+dy*dy)*.82,round);
          const ratio=ease(start,end,distance);
          for(let c=0;c<3;c++) data[i+c]=lerp(data[i+c],tint[c],ratio);
        }
      }
    });
  }
  function tiltShift(input,output,s) {
    const softened=gaussian(output,input,s.radius*logical(s));
    const w=softened.width,h=softened.height;
    const mask=copy(output,'tilt-mask',softened,w,h);
    const m=context(mask);
    const angle=radians(s.angle);
    const dx=-Math.sin(angle), dy=Math.cos(angle);
    const reach=(Math.abs(dx)*w+Math.abs(dy)*h)/2;
    const grad=m.createLinearGradient(w/2-dx*reach,h/2-dy*reach,w/2+dx*reach,h/2+dy*reach);
    const center=clamp(s.position/100,.002,.998), band=.035+s.size*.013;
    for(const [stop,a] of [[center-band-.18,1],[center-band,0],[center+band,0],[center+band+.18,1]]) {
      grad.addColorStop(clamp(stop),'rgba(0,0,0,'+a+')');
    }
    m.globalCompositeOperation='destination-in';
    m.fillStyle=grad;
    m.fillRect(0,0,w,h);
    m.globalCompositeOperation='source-over';
    const ctx=context(output);
    ctx.drawImage(input,0,0);
    ctx.drawImage(mask,0,0,s.width,s.height);
  }
  function barrelBlur(input,output,s) {
    const [w,h]=workSize(input,1120);
    const source=copy(output,'barrel-base',input,w,h);
    const softened=gaussian(output,source,(2+s.size)*logical(s)*w/s.width);
    const src=pixels(source).data, broad=pixels(softened).data;
    const dst=buffer(output,'barrel',w,h);
    const ctx=context(dst), image=ctx.createImageData(w,h), result=image.data;
    const curve=(s.concave==='on' ? -1 : 1)*(.025+s.size*.011);
    const spread=s.fringe*.0012;
    const mx=(w-1)/2,my=(h-1)/2;
    for(let y=0,i=0;y<h;y++) {
      const dy=y-my, ny=dy/Math.max(1,my);
      for(let x=0;x<w;x++,i+=4) {
        const dx=x-mx,nx=dx/Math.max(1,mx);
        const r2=(nx*nx+ny*ny)/2;
        const mix=s.invert==='on' ? 1-Math.sqrt(r2) : Math.sqrt(r2);
        const bend=1+curve*r2;
        const chroma=spread*r2;
        for(let c=0;c<3;c++) {
          const k=bend+chroma*(c-1);
          const j=readIndex(mx+dx*k,my+dy*k,w,h);
          result[i+c]=lerp(src[j+c],broad[j+c],mix*.92);
        }
        result[i+3]=src[i+3];
      }
    }
    ctx.putImageData(image,0,0);
    context(output).drawImage(dst,0,0,s.width,s.height);
  }
  function brightPass(input,output,cutoff,cap) {
    const [w,h]=workSize(input,cap);
    const mask=copy(output,'highlights',input,w,h);
    const ctx=context(mask), image=ctx.getImageData(0,0,w,h), data=image.data;
    for(let i=0;i<data.length;i+=4) data[i+3]*=ease(cutoff*2.55,255,luma(data,i));
    ctx.putImageData(image,0,0);
    return mask;
  }
  function glow(input,output,s) {
    const highlights=brightPass(input,output,s.cutoff,840);
    const bloomed=gaussian(output,highlights,(3+s.size*1.30)*logical(s)*highlights.width/s.width);
    const ctx=context(output);
    ctx.drawImage(input,0,0);
    ctx.globalCompositeOperation='screen';
    ctx.drawImage(bloomed,0,0,s.width,s.height);
    ctx.globalCompositeOperation='source-over';
  }
  function lightStreak(input,output,s) {
    const highlights=brightPass(input,output,s.cutoff,560);
    const angle=radians(s.angle+Math.sin(s.time*TAU*.25)*s.drift);
    const {width:w,height:h}=highlights;
    const src=pixels(highlights).data;
    const dst=buffer(output,'streak',w,h), ctx=context(dst);
    const image=ctx.createImageData(w,h);
    const span=(7+s.size*4)*logical(s)*w/s.width;
    const tapOffsets=Array.from({length:9},(_,i)=>{
      const n=i-4;
      const distance=n*span/4;
      const split=n*s.fringe*.009*span/4;
      return {x:Math.round(Math.cos(angle)*distance),y:Math.round(Math.sin(angle)*distance),
        splitX:Math.round(Math.cos(angle)*split),splitY:Math.round(Math.sin(angle)*split),weight:Math.exp(-.084*n*n)*.36};
    });
    for(let y=0,i=0;y<h;y++) {
      for(let x=0;x<w;x++,i+=4) {
        for(let c=0;c<3;c++) {
          let total=0;
          for(const offset of tapOffsets) {
            const sx=x+offset.x+offset.splitX*(c-1), sy=y+offset.y+offset.splitY*(c-1);
            if(sx<0||sy<0||sx>=w||sy>=h) continue;
            const j=(sy*w+sx)*4;
            total+=src[j+c]*(src[j+3]/255)*offset.weight;
          }
          image.data[i+c]=total;
        }
        image.data[i+3]=255;
      }
    }
    ctx.putImageData(image,0,0);
    const screen=context(output);
    screen.drawImage(input,0,0);
    screen.globalCompositeOperation='screen';
    screen.drawImage(dst,0,0,s.width,s.height);
    screen.globalCompositeOperation='source-over';
  }

  function strobe(input,output,s) {
    const cycle=s.time*s.rate+.38;
    const position=fract(cycle);
    const offset=s.randomness==='on' ? random(Math.floor(cycle)+187)*.12 : 0;
    const gate=.22+s.size*.032;
    const pulse=ease(.12+offset,.17+offset,position)*(1-ease(gate+offset,gate+offset+.075,position));
    const ctx=context(output);
    ctx.drawImage(input,0,0);
    ctx.fillStyle=`rgba(0,0,0,${pulse*.92})`;
    ctx.fillRect(0,0,s.width,s.height);
  }
  function super8(input,output,s) {
    const ctx=context(output),w=s.width,h=s.height;
    const time=s.time, scale=logical(s), grainFrame=Math.floor(time*17);
    const sway=scale*(.5+s.size*.43);
    const dx=(Math.sin(time*10.2)*.63+(random(grainFrame+11)-.5)*.46)*sway;
    const dy=(Math.cos(time*8.2)*.56+(random(grainFrame+83)-.5)*.66)*sway;
    const border=s.gate==='on' ? Math.max(1,Math.min(w,h)*.046) : 0;
    if (border) {
      ctx.fillStyle='#181206';
      ctx.fillRect(0,0,w,h);
    }
    ctx.save();
    if (border) {
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(border,border*.70,w-2*border,h-1.4*border,border*.45);
      else ctx.rect(border,border*.70,w-2*border,h-1.4*border);
      ctx.clip();
    }
    const pad=Math.ceil(sway+2);
    ctx.drawImage(input,dx-pad,dy-pad,w+2*pad,h+2*pad);
    ctx.fillStyle='#a35f2c30';
    ctx.globalCompositeOperation='soft-light';
    ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='source-over';
    if (s.burn>0) {
      const x=w*(.10+.095*Math.sin(time*1.21));
      const gradient=ctx.createRadialGradient(x,h*.40,0,x,h*.40,w*.63);
      const flicker=s.burn/100*(.73+.22*Math.sin(time*3.8+.7));
      gradient.addColorStop(0,`rgba(255,151,59,${flicker*.72})`);
      gradient.addColorStop(.38,`rgba(228,55,29,${flicker*.34})`);
      gradient.addColorStop(1,'rgba(218,59,22,0)');
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle=gradient;
      ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation='source-over';
    }
    if (s.roll>0) {
      const center=fract(time*(.14+s.roll*.011)+.42)*h;
      const band=ctx.createLinearGradient(0,center-h*.064,0,center+h*.064);
      band.addColorStop(0,'#20100800'); band.addColorStop(.48,'#22110873'); band.addColorStop(1,'#20100800');
      ctx.fillStyle=band;
      ctx.fillRect(0,center-h*.064,w,h*.128);
    }
    for(let i=0;i<s.dust*.37;i++) {
      const k=i*643+Math.floor(time*(i%4+3))*97;
      const x=w*random(k+116), y=h*random(k+181);
      const r=Math.max(.45,(.6+random(k+43)*2.2)*scale);
      ctx.fillStyle=i%5===0 ? '#371b10b0' : '#ffe7af99';
      ctx.beginPath();
      ctx.ellipse(x,y,r*(i%5===0?1.5:.7),r,i*.69,0,TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  function scanlines(input,output,s) {
    const ctx=context(output),w=s.width,h=s.height;
    const period=Math.max(2,Math.round((2+s.size*1.32)*logical(s)));
    const tile=buffer(output,'raster',2,period), dots=context(tile);
    dots.clearRect(0,0,2,period);
    const mode=s.mode;
    dots.fillStyle=mode==='screen' ? '#bef4ff91' : mode==='soft-light' ? '#000000bb' : '#262639bc';
    dots.fillRect(0,0,2,Math.max(1,period*s.duty/100));
    ctx.drawImage(input,0,0);
    const diagonal=Math.hypot(w,h);
    ctx.save();
    ctx.translate(w/2,h/2);
    ctx.rotate(radians(s.angle));
    ctx.globalCompositeOperation=mode;
    ctx.fillStyle=ctx.createPattern(tile,'repeat');
    ctx.fillRect(-diagonal/2,-diagonal/2,diagonal,diagonal);
    ctx.restore();
  }
  function grain(input,output,s) {
    const ctx=context(output),w=s.width,h=s.height;
    const side=128;
    const texture=buffer(output,'grain',side,side), textureCtx=context(texture);
    const image=textureCtx.createImageData(side,side), data=image.data;
    const frame=Math.floor(s.time*24)*13337;
    const film=s.stock==='film', colored=s.rgb==='on';
    for(let y=0,i=0;y<side;y++) {
      for(let x=0;x<side;x++,i+=4) {
        const seed=frame+x+y*side;
        const grain=random(seed+918);
        let value=grain;
        if(film) {
          const lx=Math.floor(x/4),ly=Math.floor(y/4);
          const corner=frame+lx+ly*37;
          const fx=(x%4)/4,fy=(y%4)/4;
          const coarse=lerp(lerp(random(corner),random(corner+1),fx),lerp(random(corner+37),random(corner+38),fx),fy);
          value=.62*coarse+.38*grain;
        }
        data[i]=value*255;
        data[i+1]=colored ? lerp(value,random(seed+2974),.38)*255 : value*255;
        data[i+2]=colored ? lerp(value,random(seed+6985),.45)*255 : value*255;
        data[i+3]=film?195:205;
      }
    }
    textureCtx.putImageData(image,0,0);
    const scale=Math.max(.63,(.72+s.size*.116)*logical(s));
    const pattern=ctx.createPattern(texture,'repeat');
    ctx.drawImage(input,0,0);
    ctx.save();
    ctx.imageSmoothingEnabled=film;
    ctx.scale(scale,scale);
    ctx.globalCompositeOperation=s.mode;
    ctx.fillStyle=pattern;
    ctx.fillRect(0,0,w/scale,h/scale);
    ctx.restore();
  }

  const palettes = {
    arcade:[[12,10,24],[42,28,69],[81,53,114],[164,132,164],[242,222,194],[159,44,60],[244,77,64],[251,145,62],
      [249,216,87],[32,104,67],[69,159,88],[141,211,86],[33,70,125],[55,130,199],[108,205,211],[204,92,141]],
    terminal:[[10,31,23],[42,86,54],[109,143,78],[192,209,109]],
    home:[[18,23,31],[56,52,91],[101,91,142],[171,159,203],[220,218,190],[84,42,53],[152,66,77],[211,118,86],
      [242,174,108],[94,73,41],[135,116,61],[78,121,110],[120,163,137],[29,78,108],[46,118,174],[118,187,212]]
  };
  function eightBit(input,output,s) {
    const step=Math.max(2,(2+s.size*.93)*logical(s));
    const w=Math.max(1,Math.min(640,Math.round(s.width/step)));
    const h=Math.max(1,Math.min(640,Math.round(s.height/step)));
    const grid=copy(output,'eight-bit',input,w,h), ctx=context(grid);
    const image=ctx.getImageData(0,0,w,h), data=image.data;
    const palette=palettes[s.palette] || palettes.arcade;
    for(let i=0;i<data.length;i+=4) {
      if(!data[i+3]) continue;
      let chosen=palette[0],best=Infinity;
      for(const candidate of palette) {
        const r=data[i]-candidate[0],g=data[i+1]-candidate[1],b=data[i+2]-candidate[2];
        const dist=.24*r*r+.62*g*g+.14*b*b;
        if(dist<best) { best=dist; chosen=candidate; }
      }
      data[i]=chosen[0]; data[i+1]=chosen[1]; data[i+2]=chosen[2];
    }
    ctx.putImageData(image,0,0);
    const result=context(output);
    result.imageSmoothingEnabled=false;
    result.drawImage(grid,0,0,s.width,s.height);
    result.imageSmoothingEnabled=true;
  }
  function dotMatrix(input,output,s) {
    const count=Math.round(16+s.size*5);
    const step=Math.min(s.width,s.height)/count;
    const cols=Math.max(1,Math.min(180,Math.round(s.width/step)));
    const rows=Math.max(1,Math.min(180,Math.round(s.height/step)));
    const grid=copy(output,'dot-grid',input,cols,rows);
    const data=pixels(grid).data;
    const [w,h]=workSize(input,1380);
    const dots=buffer(output,'dots',w,h), ctx=context(dots);
    const dx=w/cols,dy=h/rows;
    const radius=Math.max(.10,Math.min(dx,dy)*s.diameter/200);
    const fixed=s.ink==='source' ? null : s.ink==='warm' ? '#ffba58' : '#91f8af';
    ctx.clearRect(0,0,w,h);
    if(fixed) { ctx.fillStyle=fixed; ctx.beginPath(); }
    for(let row=0,i=0;row<rows;row++) {
      for(let col=0;col<cols;col++,i+=4) {
        if(data[i+3]<10) continue;
        const r=radius*Math.sqrt(luma(data,i)/255);
        if(r<.1) continue;
        const x=(col+.5)*dx,y=(row+.5)*dy;
        if(!fixed) {
          ctx.fillStyle=`rgb(${data[i]},${data[i+1]},${data[i+2]})`;
          ctx.beginPath();
        }
        ctx.moveTo(x+r,y);
        ctx.arc(x,y,r,0,TAU);
        if(!fixed) ctx.fill();
      }
    }
    if(fixed) ctx.fill();
    const result=context(output);
    result.fillStyle='#080e14';
    result.fillRect(0,0,s.width,s.height);
    const softness=s.softness ? gaussian(output,dots,(s.softness/100)*radius*.62,1380) : dots;
    result.drawImage(softness,0,0,s.width,s.height);
  }

  const effects = {
    posterize,solarize,bleach,sharpen,'color-correction':correct,curves,'hue-cycle':hueCycle,duotone,rainbow,
    instacolor:instaColor,'rgb-shift':rgbShift,vignette,'tilt-shift':tiltShift,'barrel-blur':barrelBlur,glow,blur,
    'light-streak':lightStreak,strobe,super8,scanlines,grain,'8-bit':eightBit,'dot-matrix':dotMatrix
  };
  function draw(input,output,s) {
    const effect=effects[s.type.slice(5)];
    if(!Object.hasOwn(definitions,s.type)) return false;
    effect(input,output,s);
    return true;
  }
  (window.TonepressPacks ||= []).push({definitions,draw});
})();
