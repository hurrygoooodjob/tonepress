(() => {
  "use strict";

  const type="mosh-remove-background";
  const definitions={
    [type]:{
      name:"人像去背景",english:"Remove Background",scaleLabel:"遮罩边缘宽度",size:6,strength:100,
      group:"局部遮罩",groupEnglish:"Layer masks",mask:true,temporal:true,
      description:"在本机识别画面中的人物，保留前景并移除背景。可反转、扩展或柔化边缘。",
      controls:[
        {kind:"range",key:"expand",label:"扩展人像轮廓",value:0,min:-8,max:8,step:1},
        {kind:"range",key:"feather",label:"人像边缘羽化",value:28,min:0,max:100,step:1},
        {kind:"select",key:"personInvert",label:"保留区域",value:"person",
          options:[{value:"person",label:"保留人物"},{value:"background",label:"保留背景"}]},
        {kind:"select",key:"maskFrom",label:"人物检测来源",value:"original",
          options:[{value:"original",label:"原始素材"},{value:"layer",label:"上一层处理结果"}]},
        {kind:"select",key:"showMatte",label:"观看遮罩",value:"composite",
          options:[{value:"composite",label:"合成画面"},{value:"show",label:"黑白遮罩"}]}
      ]
    }
  };

  const MODEL_W=256,MODEL_H=144;
  const surfaces=new WeakMap();
  let network, loading;
  let status="idle";
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function canvases(owner) {
    if(!surfaces.has(owner)) {
      const sample=owner.createElement("canvas"), matte=owner.createElement("canvas");
      sample.width=matte.width=MODEL_W;
      sample.height=matte.height=MODEL_H;
      const context=sample.getContext("2d",{alpha:false,willReadFrequently:true});
      const out=matte.getContext("2d",{alpha:false});
      surfaces.set(owner,{sample,matte,context,out,image:out.createImageData(MODEL_W,MODEL_H)});
    }
    return surfaces.get(owner);
  }

  function prediction(tf,model,canvas) {
    return tf.tidy(()=>{
      const pixels=tf.browser.fromPixels(canvas).toFloat().div(255).expandDims();
      const result=model.predict(pixels);
      return result.dataSync();
    });
  }

  async function load() {
    await window.TonepressPersonAssets?.load();
    const tf=window.tf, data=window.TonepressPersonModel;
    if (!tf || !data) throw Error("The local person-segmentation assets could not be opened.");
    const weightBytes=Uint8Array.from(atob(data.weightBase64),character=>character.charCodeAt(0));
    const artifacts={
      modelTopology:data.modelTopology,
      weightSpecs:data.weightsManifest.flatMap(group=>group.weights),
      weightData:weightBytes.buffer
    };
    let lastError;
    for (const backend of ["webgl","cpu"]) {
      let candidate;
      try {
        if (!await tf.setBackend(backend)) continue;
        candidate=await tf.loadGraphModel(tf.io.fromMemory(artifacts));
        prediction(tf,candidate,canvases(document).sample);
        network=candidate;
        return;
      } catch(error) {
        candidate?.dispose();
        lastError=error;
      }
    }
    throw lastError || Error("No inference backend is available.");
  }

  function ready() {
    if (!loading) {
      status="loading";
      loading=load().then(()=>{
        status="ready";
        document.dispatchEvent(new Event("tonepress:person-ready"));
        return true;
      }).catch(error=>{
        status="error";
        document.dispatchEvent(new Event("tonepress:person-error"));
        throw error;
      });
    }
    return loading;
  }

  function observe(input,s,work) {
    const hist=s.history || {};
    if (hist.probability && hist.time===s.time) return hist;
    const source=s.maskFrom==="original" && s.originalSource ? s.originalSource : input;
    const {context,sample}=work;
    const ratio=s.sourceWidth/s.sourceHeight;
    let dx=0,dy=0,dw=MODEL_W,dh=MODEL_H;
    // Letterbox extreme source shapes. Return the matching content region of the mask.
    if (ratio<.84) {
      dw=Math.max(1,Math.round(MODEL_H*ratio));
      dx=Math.round((MODEL_W-dw)/2);
    } else if (ratio>2.45) {
      dh=Math.max(1,Math.round(MODEL_W/ratio));
      dy=Math.round((MODEL_H-dh)/2);
    }
    context.fillStyle="#424747";
    context.fillRect(0,0,MODEL_W,MODEL_H);
    context.drawImage(source,dx,dy,dw,dh);
    const segmentation=prediction(window.tf,network,sample);
    const probability=new Float32Array(MODEL_W*MODEL_H);
    const delta=s.time-hist.time;
    const previous=s.videoSource && delta>0 && delta<.18 ? hist.probability : null;
    for(let i=0;i<probability.length;i++) {
      const value=segmentation[i*2+1];
      probability[i]=previous ? value*.85+previous[i]*.15 : value;
    }
    hist.probability=probability;
    hist.crop=[dx,dy,dw,dh];
    hist.time=s.time;
    return hist;
  }

  function adjustEdge(probability,radius) {
    if (!radius) return probability;
    const horizontal=new Float32Array(probability.length);
    const result=new Float32Array(probability.length);
    const spread=Math.abs(radius);
    const extreme=radius>0 ? Math.max : Math.min;
    for(let y=0;y<MODEL_H;y++) for(let x=0;x<MODEL_W;x++) {
      const center=y*MODEL_W+x;
      let value=probability[center];
      for(let offset=-spread;offset<=spread;offset++){
        value=extreme(value,probability[y*MODEL_W+clamp(x+offset,0,MODEL_W-1)]);
      }
      horizontal[center]=value;
    }
    for(let y=0;y<MODEL_H;y++) for(let x=0;x<MODEL_W;x++) {
      const center=y*MODEL_W+x;
      let value=horizontal[center];
      for(let offset=-spread;offset<=spread;offset++){
        value=extreme(value,horizontal[clamp(y+offset,0,MODEL_H-1)*MODEL_W+x]);
      }
      result[center]=value;
    }
    return result;
  }

  function draw(input,output,s) {
    if(s.type!==type) return false;
    const ctx=output.getContext("2d");
    if(!network) {
      // Keep the input visible while the on-device graph initializes.
      ready().catch(()=>{});
      ctx.fillStyle="#fff";
      ctx.fillRect(0,0,s.width,s.height);
      return true;
    }
    const local=canvases(output.ownerDocument || document);
    const {probability,crop}=observe(input,s,local);
    const edge=adjustEdge(probability,s.expand);
    const softness=.018+s.feather*.0026+s.size*.0032;
    const pixels=local.image.data;
    for(let i=0;i<edge.length;i++) {
      const value=clamp((edge[i]-.5+softness)/(softness*2),0,1);
      const matte=value*value*(3-2*value);
      const intensity=(s.personInvert==="background" ? 1-matte : matte)*255;
      const j=i*4;
      pixels[j]=pixels[j+1]=pixels[j+2]=intensity;
      pixels[j+3]=255;
    }
    local.out.putImageData(local.image,0,0);
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(local.matte,...crop,0,0,s.width,s.height);
    return true;
  }

  window.TonepressPerson={ready,get canUse(){return status==="ready";},get status(){return status;}};
  window.TonepressPacks.push({definitions,draw});
})();
