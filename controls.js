(() => {
  "use strict";
  const {t} = window.TonepressI18n;
  function create(host,change,feedback) {
    let active=null;
    const localizers=[];
    function localize() {
      for (const translate of localizers) translate();
    }
    function show(layer,definition) {
      if(active===layer) return;
      active=layer;
      localizers.length=0;
      host.replaceChildren();
      if (!layer) return;
      for(const control of definition.controls || []) {
        const row=document.createElement("div"), label=document.createElement("label");
        const id="param-"+control.key;
        label.htmlFor=id;
        localizers.push(()=>{label.textContent=t(control.label);});
        row.className="special-control";row.append(label);
        if(control.kind==="bitmap") {
          row.classList.add("bitmap-control");
          const grid=document.createElement("div"); grid.id=id;grid.className="bitmap-grid";
          grid.setAttribute("role","group");
          const cells=[];
          function apply(value) {
            if (active!==layer) return;
            change(layer,control.key,value);
            cells.forEach((cell,i)=>cell.setAttribute("aria-pressed",String(value[i]==="1")));
          }
          function bits() {return layer[control.key]??control.value;}
          for(let i=0;i<64;i++){
            const cell=document.createElement("button");cell.type="button";
            cell.setAttribute("aria-pressed",String(bits()[i]==="1"));
            cell.onclick=()=>{const a=bits().split("");a[i]=a[i]==="1"?"0":"1";apply(a.join(""));};
            cells.push(cell);grid.append(cell);
          }
          const file=document.createElement("input");file.type="file";
          file.accept="image/png,image/jpeg,image/webp,image/svg+xml";file.hidden=true;
          const upload=document.createElement("button");upload.type="button";
          upload.className="glyph-import";upload.onclick=()=>file.click();
          localizers.push(()=>{
            grid.setAttribute("aria-label",t(control.label));
            upload.textContent=t("导入字形图片");
            cells.forEach((cell,i)=>cell.setAttribute("aria-label",t("{row} 行 {col} 列", {row:Math.floor(i/8)+1,col:i%8+1})));
          });
          file.onchange=async()=>{
            const selected=file.files[0];file.value="";if(!selected)return;
            const img=new Image(),url=URL.createObjectURL(selected);
            try {
              img.src=url;await img.decode();
              const c=document.createElement("canvas");c.width=c.height=8;
              const ctx=c.getContext("2d"); const scale=Math.min(8/img.naturalWidth,8/img.naturalHeight);
              ctx.drawImage(img,(8-img.naturalWidth*scale)/2,(8-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
              const data=ctx.getImageData(0,0,8,8).data;
              const transparency=Array.from({length:64},(_,i)=>data[4*i+3]).some(a=>a<100);
              let glyph="";
              for(let i=0;i<256;i+=4) {
                const dark=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]<150;
                glyph+= data[i+3]>96 && (transparency || dark) ? "1":"0";
              }
              apply(glyph);
            } catch {feedback("无法读取字形图片，可试 PNG 或内嵌图形的 SVG。",true);}
            finally {URL.revokeObjectURL(url);}
          };
          row.append(grid,upload,file);
        } else {
          const select=control.kind==="select";
          const input=document.createElement(select?"select":"input");input.id=id;
          if(select) {
            control.options.forEach(option=>input.add(new Option("",option.value)));
            localizers.push(()=>{
              control.options.forEach((option,i)=>{input.options[i].textContent=t(option.label);});
            });
          } else {input.type="text";input.maxLength=control.maxLength||40;}
          input.value=layer[control.key]??control.value;
          input.addEventListener(select?"change":"input",()=>change(layer,control.key,input.value,select?null:input));
          row.append(input);
        }
        host.append(row);
      }
      localize();
    }
    return {show,localize,reset(){active=null;}};
  }
  window.TonepressControls={create};
})();
