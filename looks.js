(() => {
  "use strict";
  // Source-space size has an effect-specific meaning. The renderer maps 2–16 onto its usable range.
  const effects = {
    halftone: {
      name: "原色网点", english: "Halftone", group: "印刷", scaleLabel: "网点间距",
      size: 6, strength: 22, description: "45° 细点叠在原色上"
    },
    riso: {
      name: "双色孔版", english: "Riso", group: "印刷", scaleLabel: "套印尺度",
      size: 7, strength: 87, description: "用两块色版套色，在纸色上制造错版纹理"
    },
    dither: {
      name: "四色抖色", english: "Dithering", group: "像素", scaleLabel: "点阵尺度",
      size: 5, strength: 97, description: "有序抖色生成复古掌机的四个色阶"
    },
    ascii: {
      name: "字符画", english: "ASCII", group: "字符", scaleLabel: "字符尺度",
      size: 8, strength: 100, description: "用不同密度的字符重画亮暗"
    },
    pixel: {
      name: "方块马赛克", english: "Block Mosaic", group: "像素", scaleLabel: "像素块大小",
      size: 8, strength: 100, description: "将局部颜色归并成方块"
    },
    edge: {
      name: "边缘线稿", english: "Edge Detection", group: "线描", scaleLabel: "边缘尺度",
      size: 6, strength: 95, description: "提取明暗边界生成线稿"
    },
    threshold: {
      name: "黑白阈值", english: "Threshold", group: "线描", scaleLabel: "明暗分界",
      size: 8, strength: 100, description: "通过阈值把画面分成黑白两区"
    },
    hatch: {
      name: "交叉排线", english: "Crosshatch", group: "线描", scaleLabel: "排线尺度",
      size: 7, strength: 90, description: "用多方向排线表达阴影"
    },
    contour: {
      name: "等高线", english: "Contour Map", group: "线描", scaleLabel: "等值线密度",
      size: 7, strength: 92, description: "沿相等亮度描出地图式曲线"
    },
    thermal: {
      name: "热成像", english: "Thermal", group: "光色", scaleLabel: "色带分布",
      size: 9, strength: 100, description: "将亮度映射为冷暖热力色"
    },
    prism: {
      name: "棱镜色散", english: "Film Prism", group: "光色", scaleLabel: "色散跨度",
      size: 9, strength: 90, description: "沿镜头方向拉开颜色通道"
    },
    crt: {
      name: "显像管", english: "CRT Screen", group: "模拟信号", scaleLabel: "扫描线距",
      size: 5, strength: 78, description: "叠加荧光屏纹理和扫描线"
    },
    vhs: {
      name: "录像磁带", english: "VHS", group: "模拟信号", scaleLabel: "磁带扰动",
      size: 8, strength: 78, description: "彩色渗漏、行扰动与随时间变化的噪声"
    },
    glitch: {
      name: "信号故障", english: "Glitch", group: "模拟信号", scaleLabel: "错位幅度",
      size: 10, strength: 92, description: "分带错行与颜色偏移"
    }
  };
  const groups = [
    ["光影与玻璃", "Light & glass", ["Light Play", "Spark Field", "Thermal"]],
    ["字符与代码", "Type & code", ["ASCII", "ASCII Ghost", "Tag Pills", "Data Hatching", "Dither Text", "Glyph Studio", "Grid Glyph", "Inscribe", "Matrix Rain", "Number Field", "Pixel Code", "Word Mosaic"]],
    ["半调与抖色", "Halftone & dither", ["Cross Stitch", "Dithering", "Drift Lines", "Glitch Grid", "Glyph Matrix", "Halftone", "Pixel Press", "Pattern Halftone", "Pixel Dither Glow", "Pixel Poster", "Retro Matrix", "Riso", "Riso Glow", "Scatter Mosaic", "Symbol Matrix", "Tone Geometry"]],
    ["织物与工艺", "Textile & craft", ["Crosshatch", "Knitted Embroidery", "Kilim Carpet", "Stitch Poster", "Vector Engraving"]],
    ["像素与立体", "Pixel & 3D", ["Block Mosaic", "Blockify", "3D Toy Bricks", "Outline", "Quadtree Zoom", "Voronoi"]],
    ["边缘与轮廓", "Edges & outlines", ["Contour", "Contour Map", "Contour Type", "Edge Detection", "Threshold"]],
    ["模拟与故障", "Analog & glitch", ["CRT Screen", "Crystal Glass", "Glass Pixel Dispersion", "Glitch", "Pixel Sort", "Ribbon Scan", "VHS"]],
    ["模拟线条", "Analog", ["Film Prism", "Wave Lines"]],
    ["实验效果", "Experimental", ["Ember Veil", "Holo", "Trace Motion", "Particle Brush", "Rain Reveal", "Stardust"]],
    ["跟踪与界面", "Tracking & interface", ["Brand Generator", "CCTV Surveillance", "HUD Tracker"]]
  ];
  TonepressKits.index();
  for (const pack of TonepressPacks) {
    for (const [type, definition] of Object.entries(pack.definitions)) {
      if (effects[type]) throw Error("重复效果 "+type);
      effects[type]={...definition,isNew:true};
    }
  }
  const byEnglish=new Map(Object.values(effects).map(def=>[def.english,def]));
  for (const [local,english,names] of groups) {
    for(const name of names) {
      const def=byEnglish.get(name);
      if (!def) throw Error("缺少效果 "+name);
      def.group=local; def.groupEnglish=english;
    }
  }
  if(byEnglish.size!==65 || Object.keys(effects).length!==65) throw Error("效果清单数量不匹配");
  const layer = (type, size, strength) => ({
    type, size: size ?? effects[type].size, strength: strength ?? effects[type].strength, enabled: true
  });
  const looks = [
    {id:"light", name:"原色轻网", motion:"none", layers:[layer("halftone")]},
    {id:"riso-print", name:"双色印刷", motion:"none", layers:[layer("riso"),layer("halftone",9,40)]},
    {id:"handheld", name:"掌机四色", motion:"none", layers:[layer("pixel",3,85),layer("dither",4,100)]},
    {id:"terminal", name:"字符终端", motion:"none", layers:[layer("ascii",8,100),layer("crt",4,44)]},
    {id:"tape", name:"磁带回放", motion:"none", layers:[layer("vhs",12,95),layer("crt",5,62)]},
    {id:"heat", name:"荧光热像", motion:"breathe", layers:[layer("thermal",9,100),layer("crt",3,28)]},
    {id:"atlas", name:"地形手稿", motion:"none", layers:[layer("contour",9,92),layer("hatch",6,35)]},
    {id:"prismatic", name:"棱镜故障", motion:"breathe", layers:[layer("prism",12,88),layer("glitch",10,85)]}
  ];
  looks.push(
    {id:"stained",name:"彩片镶嵌",motion:"none",layers:[layer("voronoi"),layer("prism",3,20)]},
    {id:"embroidered",name:"针织纹样",motion:"none",layers:[layer("knitted-embroidery")]},
    {id:"brick-studio",name:"积木工坊",motion:"none",layers:[layer("3d-toy-bricks")]},
    {id:"code-rain",name:"数字雨幕",motion:"none",layers:[layer("matrix-rain"),layer("crt",3,34)]},
    {id:"motion-log",name:"运动观测",motion:"none",layers:[layer("trace-motion"),layer("hud-tracker")]},
    {id:"glass-studio",name:"晶面折光",motion:"none",layers:[layer("crystal-glass"),layer("spark-field",6,54)]}
  );
  window.TonepressLooks = {effects, looks, layer,groups};
})();
