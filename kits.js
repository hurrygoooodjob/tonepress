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
        pack.draw(input,art,{...parameters(def,layer),...settings,history});
      } finally {ctx.restore();}
      if(output.width!==width) output.width=width;
      if(output.height!==height) output.height=height;
      const result=output.getContext("2d");
      result.save();
      try {
        result.resetTransform();
        result.globalCompositeOperation="copy";
        result.globalAlpha=1;
        result.drawImage(input,0,0,width,height);
        result.globalCompositeOperation="source-atop";
        result.globalAlpha=strength/100;
        result.drawImage(art,0,0);
      } finally {result.restore();}
    }
    return {prepare,draw,resetHistory:()=>tracks.clear(),snapshot:()=>({key:recipeKey,entries:structuredClone([...tracks])}),
      dispose(){tracks.clear();art.width=1;art.height=1;lastSource=null;}};
  }
  window.TonepressKits={byType,index,parameters,create};
})();
