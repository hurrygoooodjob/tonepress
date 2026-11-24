(() => {
  "use strict";

  const pools = new WeakMap();
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const fract = value => value - Math.floor(value);
  const luminance = (pixels, i) => (pixels[i] * .2126 + pixels[i+1] * .7152 + pixels[i+2] * .0722) / 255;
  const byte = (value, fallback = 100) => clamp(Number.isFinite(value) ? value : fallback, 0, 100) / 100;
  const bounds = (value, fallback, min, max) => clamp(Number.isFinite(value) ? value : fallback, min, max);
  function buffer(output, label, width, height) {
    let items = pools.get(output);
    if (!items) pools.set(output, items = new Map());
    if (!items.has(label)) items.set(label, output.ownerDocument.createElement("canvas"));
    const canvas = items.get(label);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return canvas;
  }
  function context(canvas) {return canvas.getContext("2d",{willReadFrequently:true});}
  function low(source, art, label, w, h) {
    const canvas=buffer(art,label,w,h), ctx=context(canvas);
    ctx.clearRect(0,0,w,h);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    ctx.drawImage(source,0,0,w,h);
    return canvas;
  }
  function pixel(input, art, s, layer) {
    const scale = Math.pow(8 / s.size,.75);
    const cols = Math.round(clamp(bounds(layer.columns,20,4,160)*scale,4,160));
    const rows = Math.round(clamp(bounds(layer.rows,20,4,160)*scale,4,160));
    const canvas = low(input,art,"blocks",cols,rows);
    const center=buffer(art,"block-centers",cols,rows), centerCtx=context(center), averageCtx=context(canvas);
    centerCtx.clearRect(0,0,cols,rows);
    centerCtx.imageSmoothingEnabled=false;
    centerCtx.drawImage(input,0,0,cols,rows);
    const centres=centerCtx.getImageData(0,0,cols,rows).data;
    const average=averageCtx.getImageData(0,0,cols,rows);
    for(let i=0;i<average.data.length;i++) average.data[i]=average.data[i]*.58+centres[i]*.42;
    averageCtx.putImageData(average,0,0);
    const ctx = context(art);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(canvas,0,0,s.width,s.height);
    ctx.imageSmoothingEnabled=true;
  }
  function edge(input, art, s, layer) {
    const {width:w,height:h}=s, ctx=context(art);
    const src=context(input).getImageData(0,0,w,h).data;
    const img=ctx.createImageData(w,h), out=img.data;
    const tint = /^#[a-fA-F0-9]{6}$/.test(layer.edgeTint) ? layer.edgeTint : "#ffffff";
    const ink = [1,3,5].map(i=>parseInt(tint.slice(i,i+2),16));
    const retained = byte(layer.edgePassthrough,50);
    const delta = Math.max(1,Math.round(Math.min(w,h)*(s.size+1)/3500));
    for(let y=0,i=0;y<h;y++) for(let x=0;x<w;x++,i+=4) {
      const left=(y*w+Math.max(0,x-delta))*4, right=(y*w+Math.min(w-1,x+delta))*4;
      const up=(Math.max(0,y-delta)*w+x)*4, down=(Math.min(h-1,y+delta)*w+x)*4;
      const e=clamp(Math.hypot(luminance(src,left)-luminance(src,right), luminance(src,up)-luminance(src,down))*1.4);
      for(let c=0;c<3;c++) out[i+c]=src[i+c]*retained+(ink[c]-src[i+c]*retained)*e;
      out[i+3]=src[i+3];
    }
    ctx.putImageData(img,0,0);
  }
  function halftone(input, art, s, layer) {
    const {width:w,height:h}=s, ctx=context(art);
    const src=context(input).getImageData(0,0,w,h).data;
    const img=ctx.createImageData(w,h), out=img.data;
    const stride=Math.max(2.5,w*(.0015+.0009*s.size));
    const cmyk=layer.halftoneMode==="cmyk";
    const angles=(cmyk?[15,75,0,45]:[45]).map(deg=>[Math.cos(deg*Math.PI/180),Math.sin(deg*Math.PI/180)]);
    for(let y=0,i=0;y<h;y++) for(let x=0;x<w;x++,i+=4) {
      let k=0, cyan=0, magenta=0, yellow=0;
      for(let c=0;c<angles.length;c++) {
        const [u,v]=angles[c];
        const sx=(x*u+y*v)/stride, sy=(-x*v+y*u)/stride;
        const dx=fract(sx)-.5, dy=fract(sy)-.5;
        const ax=Math.round(clamp(x-(dx*u-dy*v)*stride,0,w-1)), ay=Math.round(clamp(y-(dx*v+dy*u)*stride,0,h-1));
        const at=(ay*w+ax)*4;
        const black=1-Math.max(src[at],src[at+1],src[at+2])/255;
        const coverage = !cmyk ? 1-luminance(src,at) :
          c===3 ? black : (1-src[at+c]/255-black)*.8;
        const radius=Math.sqrt(coverage)*.71;
        const dot=clamp((radius-Math.hypot(dx,dy))*stride+.5);
        if (!cmyk || c===3) k=dot;
        else if(c===0) cyan=dot;
        else if(c===1) magenta=dot;
        else yellow=dot;
      }
      out[i]=255*(1-k)*(1-cyan);
      out[i+1]=255*(1-k)*(1-magenta);
      out[i+2]=255*(1-k)*(1-yellow);
      out[i+3]=src[i+3];
    }
    ctx.putImageData(img,0,0);
  }
  const bayer4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const bayer2=[0,2,3,1];
  const grayLevels=[0,73,164,255];
  function dither(input, art, s, layer) {
    const {width:w,height:h}=s, ctx=context(art);
    const img=context(input).getImageData(0,0,w,h), pixels=img.data;
    const step=Math.max(1,Math.round(Math.min(w,h)/420*s.size/5));
    const strength=byte(layer.ditherColor,0);
    const small=layer.ditherPattern==="bayer2";
    const matrix=small?bayer2:bayer4, side=small?2:4;
    for(let y=0,i=0;y<h;y++) for(let x=0;x<w;x++,i+=4) {
      const t=(matrix[(Math.floor(y/step)%side)*side+Math.floor(x/step)%side]+.5)/(side*side);
      const gray=luminance(pixels,i);
      for(let c=0;c<3;c++) {
        const value=gray*(1-strength)+pixels[i+c]/255*strength;
        pixels[i+c]=grayLevels[Math.floor(clamp(value*3+t,0,3))];
      }
    }
    ctx.putImageData(img,0,0);
  }
  function ascii(input, art, s, layer) {
    const {width:w,height:h}=s, ctx=context(art);
    const cellW=Math.max(5,Math.round(w*(.006+.00140*s.size)));
    const cellH=Math.round(cellW*1.2);
    const cols=Math.ceil(w/cellW), rows=Math.ceil(h/cellH);
    const grid=low(input,art,"glyphs",cols,rows), source=context(grid).getImageData(0,0,cols,rows).data;
    ctx.fillStyle="#070709";ctx.fillRect(0,0,w,h);
    ctx.font=Math.ceil(cellH*.97)+"px monospace";
    ctx.textAlign="center";ctx.textBaseline="middle";
    for(let y=0,i=0;y<rows;y++) for(let x=0;x<cols;x++,i+=4) {
      const color=luminance(source,i);
      const glyph=s.chars[Math.round(color*(s.chars.length-1))];
      ctx.fillStyle=layer.glyphColor==="mono" ? "#f5f5f5" :
        "rgb("+source[i]+","+source[i+1]+","+source[i+2]+")";
      ctx.fillText(glyph,x*cellW+cellW/2,y*cellH+cellH/2,cellW);
    }
  }
  function crt(input, art, s, layer) {
    const {width:w,height:h}=s, ctx=context(art);
    const src=context(input).getImageData(0,0,w,h).data;
    const img=ctx.createImageData(w,h), out=img.data;
    const aspect=w/h;
    const bow=byte(layer.tubeCurve,50)*.42;
    const v=byte(layer.tubeVignette,80);
    const gain=.7+byte(layer.tubeBrightness,50)*.6;
    const period=Math.max(5,w*(.004+.0009*s.size));
    for(let y=0,i=0;y<h;y++) for(let x=0;x<w;x++,i+=4) {
      const p=2*(x+.5)/w-1, q=2*(y+.5)/h-1;
      const sx=p*(1+bow*q*q+bow*.16*p*p), sy=q*(1+bow*p*p*.69+bow*.12*q*q);
      out[i+3]=255;
      if(Math.abs(sx)>1 || Math.abs(sy)>1) continue;
      const sample=(Math.min(h-1,Math.floor((sy+1)*h/2))*w+Math.min(w-1,Math.floor((sx+1)*w/2)))*4;
      const ch=(sx*.5+.5)*w/period+Math.sin(q*Math.PI)*aspect*.4;
      const beam=fract(ch)*3;
      const phase=fract((sy*.5+.5)*h/(period*.44)+Math.floor(ch)*.46);
      const shade=gain*(1-v*.79*Math.pow(Math.min(1,(p*p+q*q)*.60),1.55))*(.61+.39*Math.sin(phase*Math.PI));
      for(let c=0;c<3;c++) {
        const offset=Math.abs((c+.5)-beam);
        out[i+c]=src[sample+c]*shade*(.34+.66*clamp(1-offset*1.01));
      }
      out[i+3]=src[sample+3];
    }
    ctx.putImageData(img,0,0);
  }
  function vhs(input, art, s, layer) {
    const {width:w,height:h,time}=s, ctx=context(art);
    const noise=byte(layer.tapeStatic);
    if(noise>0) TonepressExtras.draw(input,art,{...s,strength:100,size:2+(s.size-2)*noise});
    else ctx.drawImage(input,0,0);
    const amount=byte(layer.tapeBars,50);
    const tape=byte(layer.tapeText,80);
    const y=Math.floor(h*(.26+fract(time*.71)*.51));
    const band=Math.ceil(h*(.022+.092*amount));
    const shift=Math.ceil(w*.052*amount);
    if(amount>0) {
      ctx.globalAlpha=.77;
      ctx.drawImage(input,0,y,w,band,-shift,y,w,band);
      ctx.drawImage(input,0,y+band,w,3,shift,y+band,w,3);
      ctx.globalAlpha=1;
    }
    if(tape>0) {
      ctx.globalAlpha=tape;
      ctx.font="bold "+Math.max(9,h*.028)+"px monospace";
      ctx.fillStyle="#fff1e1";
      ctx.shadowColor="#111";ctx.shadowBlur=2;
      const stamp="00:"+String(Math.floor(time)%60).padStart(2,"0")+":"+String(Math.floor(time*24)%24).padStart(2,"0");
      ctx.fillText(layer.tapeLine1 || "PLAY  ▶",w*.038,h*.87,w*.90);
      ctx.fillText(layer.tapeLine2 || stamp,w*.038,h*.928,w*.90);
      ctx.shadowBlur=0;
      ctx.globalAlpha=1;
    }
  }
  const effects={pixel,edge,halftone,dither,ascii,crt,vhs};
  function draw(input,output,settings,layer) {
    const effect=effects[settings.type];
    if(!effect) return false;
    const {width,height,strength}=settings;
    const art=buffer(output,"art",width,height);
    const drawing=context(art);
    drawing.save();
    try {
      drawing.clearRect(0,0,width,height);
      effect(input,art,settings,layer);
    } finally {drawing.restore();}
    if(output.width!==width) output.width=width;
    if(output.height!==height) output.height=height;
    const ctx=context(output);
    ctx.save();
    try {
      ctx.globalCompositeOperation="copy";
      ctx.drawImage(input,0,0);
      ctx.globalCompositeOperation="source-atop";
      ctx.globalAlpha=strength/100;
      ctx.drawImage(art,0,0);
    } finally {ctx.restore();}
    return true;
  }

  const range=(key,label,min,max,value)=>({key,label,kind:"range",min,max,value,step:1});
  const select=(key,label,value,choices)=>({key,label,kind:"select",value,options:choices.map(([value,label])=>({value,label}))});
  const text=(key,label)=>({key,label,kind:"text",value:"",maxLength:32});
  const controls={
    pixel:[range("columns","横向格数",4,160,20),range("rows","纵向格数",4,160,20)],
    edge:[range("edgePassthrough","保留原图",0,100,50),{key:"edgeTint",label:"边缘颜色",kind:"color",value:"#ffffff"}],
    halftone:[select("halftoneMode","印刷通道","mono",[["mono","黑白"],["cmyk","CMYK 四色"]])],
    dither:[select("ditherPattern","抖色矩阵","bayer4",[["bayer4","Bayer 4×4"],["bayer2","Bayer 2×2"]]),
      range("ditherColor","保留原色",0,100,0)],
    ascii:[select("glyphColor","字符颜色","source",[["source","保留原色"],["mono","黑白"]])],
    crt:[range("tubeCurve","屏幕弯曲",0,100,50),range("tubeVignette","屏幕暗角",0,100,80),range("tubeBrightness","荧光亮度",0,100,50)],
    vhs:[range("tapeBars","信号断带",0,100,50),range("tapeStatic","磁带底噪",0,100,100),range("tapeText","磁带文字不透明度",0,100,80),
      text("tapeLine1","磁带第一行文字"),text("tapeLine2","磁带第二行文字")]
  };
  const scaleLabels={pixel:"网格缩放",edge:"边缘厚度",halftone:"网点间距",crt:"荧光条间距"};
  Object.assign(window.TonepressCatalogStrings ||= {},{
    "横向格数":["Horizontal blocks","横方向のブロック数","가로 블록 수"],
    "纵向格数":["Vertical blocks","縦方向のブロック数","세로 블록 수"],
    "网格缩放":["Grid scale","グリッドの倍率","그리드 배율"],
    "保留原图":["Source passthrough","元画像を残す","원본 유지"],
    "边缘颜色":["Edge color","輪郭の色","윤곽선 색상"],
    "边缘厚度":["Edge thickness","輪郭の太さ","윤곽선 두께"],
    "印刷通道":["Press channels","印刷チャンネル","인쇄 채널"],
    "黑白":["Monochrome","モノクロ","흑백"],
    "CMYK 四色":["CMYK color","CMYK 4 色","CMYK 4색"],
    "抖色矩阵":["Dither matrix","ディザ行列","디더 매트릭스"],
    "Bayer 4×4":["Bayer 4×4","ベイヤー 4×4","베이어 4×4"],
    "Bayer 2×2":["Bayer 2×2","ベイヤー 2×2","베이어 2×2"],
    "字符颜色":["Glyph color","文字の色","문자 색상"],
    "荧光条间距":["Phosphor pitch","蛍光体の間隔","형광체 간격"],
    "屏幕弯曲":["Screen curvature","画面の湾曲","화면 곡률"],
    "屏幕暗角":["Screen vignette","画面周辺の暗さ","화면 비네트"],
    "荧光亮度":["Phosphor brightness","蛍光体の明るさ","형광체 밝기"],
    "信号断带":["Dropout bars","ドロップアウト帯","드롭아웃 줄"],
    "磁带底噪":["Tape static","テープのノイズ","테이프 노이즈"],
    "磁带文字不透明度":["Tape text opacity","テープ文字の不透明度","테이프 문자 불투명도"],
    "磁带第一行文字":["Tape text line 1","テープ文字 1 行目","테이프 문자 1행"],
    "磁带第二行文字":["Tape text line 2","テープ文字 2 行目","테이프 문자 2행"]
  });
  window.TonepressMoshVariants={draw,controls,scaleLabels};
})();
