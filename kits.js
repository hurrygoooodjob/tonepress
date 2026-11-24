(() => {
  "use strict";
  const packs = [];
  window.TonepressPacks = packs;
  const byType = new Map();
  function index() {
    for (const pack of packs) {
      if (typeof pack.draw !== "function") throw Error("缺少效果渲染器");
      for (const type of Object.keys(pack.definitions)) {
        if (byType.has(type)) throw Error("重复效果 " + type);
        byType.set(type,pack);
      }
    }
  }
  function parameters(definition, layer) {
    const values = {};
    for (const control of definition.controls || []) {
      const raw=layer[control.key];
      let value=control.value;
      if (control.kind==="select" && control.options.some(o=>o.value===raw)) value=raw;
      if (control.kind==="text" && typeof raw==="string") value=raw.slice(0,control.maxLength || 40);
      if (control.kind==="bitmap" && typeof raw==="string" && /^[01]{64}$/.test(raw)) value=raw;
      if (control.kind==="range" && typeof raw==="number" && Number.isFinite(raw)) {
        const step=control.step || 1;
        value=Math.max(control.min,Math.min(control.max,Number((control.min + step*Math.round((raw-control.min)/step)).toFixed(6))));
      }
      if (control.kind==="color" && typeof raw==="string" && /^#[0-9a-f]{6}$/i.test(raw)) value=raw;
      if (control.kind==="image" && typeof raw==="string" && raw.length<=1500000 && /^data:image\/(?:png|webp|jpeg);base64,[a-z0-9+/]+=*$/i.test(raw)) value=raw;
      values[control.key]=value;
    }
    return values;
  }
  // Each stack owns its working buffers and motion history. The source-alpha mask is shared by all effects.
  function create(owner) {
    const art = owner.ownerDocument.createElement("canvas");
    const ctx = art.getContext("2d");
    const tracks = new Map();
    let lastSource,recipeKey;
    function prepare(source,layers,seed) {
      const signature=JSON.stringify(layers);
      if (source !== lastSource || signature !== recipeKey) {
        lastSource=source;
        recipeKey=signature;
        tracks.clear();
      }
      if (seed && seed.key===signature) {
        tracks.clear();
        for (const [key,data] of seed.entries) tracks.set(key,structuredClone(data));
      }
    }
    function draw(input,output,settings,layer,position) {
      const {type,width,height,strength}=settings;
      const pack=byType.get(type),def=pack.definitions[type];
      if(art.width!==width) art.width=width;
      if(art.height!==height) art.height=height;
      ctx.clearRect(0,0,width,height);
      let history;
      if (def.temporal) {
        if(!tracks.has(position)) tracks.set(position,{});
        history=tracks.get(position);
      }
      ctx.save();
      try {
        pack.draw(input,art,{...settings,...parameters(def,layer),history});
      } finally {ctx.restore();}
      if(output.width!==width) output.width=width;
      if(output.height!==height) output.height=height;
      const result=output.getContext("2d");
      result.save();
      try {
        if(def.mask && layer.showMatte==="show") {
          result.globalCompositeOperation="copy"; result.drawImage(art,0,0); return;
        }
        if(def.mask) {
          // The artwork is an opaque grayscale matte. Keep the pass where white, reveal its previous input where black.
          // A first-pass mask reveals transparency. Premultiplied mixing preserves partially transparent edge pixels.
          const top=input.getContext("2d").getImageData(0,0,width,height);
          const matte=ctx.getImageData(0,0,width,height).data;
          const under=settings.maskUnderlay?.getContext("2d").getImageData(0,0,width,height).data;
          const a=top.data, amount=strength/100;
          for(let i=0;i<a.length;i+=4){
            const keep=1-amount+amount*matte[i]/255, above=keep*a[i+3], below=(1-keep)*(under?under[i+3]:0), alpha=above+below;
            for(let j=0;j<3;j++) a[i+j]=alpha?(a[i+j]*above+(under?under[i+j]:0)*below)/alpha:0;
            a[i+3]=alpha;
          }
          result.putImageData(top,0,0); return;
        }
        result.resetTransform();
        result.globalCompositeOperation="copy";
        result.globalAlpha=1;
        result.drawImage(input,0,0,width,height);
        result.globalCompositeOperation=def.overlay ? "source-over" : "source-atop";
        result.globalAlpha=strength/100;
        result.drawImage(art,0,0);
      } finally {result.restore();}
    }
    return {prepare,draw,resetHistory:()=>tracks.clear(),snapshot:()=>({key:recipeKey,entries:structuredClone([...tracks])}),
      dispose(){tracks.clear();art.width=1;art.height=1;lastSource=null;}};
  }
  window.TonepressKits={byType,index,parameters,create};
})();
