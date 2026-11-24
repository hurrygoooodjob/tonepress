(() => {
  "use strict";
  let pending;
  const assets=["tf.min.js","model-data.js"];
  function script(name,index) {
    return new Promise((resolve,reject)=>{
      const tag=document.createElement("script"), embedded=document.getElementById("person-file-"+index);
      let objectUrl;
      if(embedded){
        const binary=atob(embedded.textContent.trim());
        const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
        objectUrl=URL.createObjectURL(new Blob([bytes],{type:"text/javascript"}));
      }
      const done=()=>{ if(objectUrl) URL.revokeObjectURL(objectUrl); tag.remove(); };
      tag.onload=()=>{done();resolve();};
      tag.onerror=()=>{done();reject(Error("人像模型无法加载。"));};
      tag.src=objectUrl || "assets/person/"+name;
      document.head.append(tag);
    });
  }
  window.TonepressPersonAssets={load(){
    if(!pending) pending=(async()=>{for(const [index,name] of assets.entries())await script(name,index);})().catch(err=>{pending=null;throw err;});
    return pending;
  }};
})();
