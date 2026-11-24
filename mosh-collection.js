// Names correspond to the public catalog at https://moshpro.app/guides/effects/
(() => {
  const reference = {
  "mosh-data-mosh": "Data Mosh",
  "mosh-optical-flow": "Optical Flow",
  "mosh-feedback": "Feedback",
  "mosh-watercolor": "Watercolor",
  "mosh-slit-scan": "Slit Scan",
  "mosh-luma-mesh": "Luma Mesh",
  "mosh-jitter": "Jitter",
  "mosh-melt": "Melt",
  "mosh-shake": "Shake",
  "mosh-bad-tv": "Bad TV",
  "mosh-soft-glitch": "Soft Glitch",
  "mosh-hard-glitch": "Hard Glitch",
  "pixel-sort": "Pixel Sort",
  "mosh-decimate": "Decimate",
  "mosh-transform": "Transform",
  "mosh-transform-3d": "Transform 3D",
  "mosh-bulge": "Bulge",
  "mosh-slices": "Slices",
  "mosh-stretch": "Stretch",
  "mosh-wave": "Wave",
  "mosh-wobble": "Wobble",
  "mosh-smear": "Smear",
  "mosh-push-draw": "Push Draw",
  "mosh-mirror": "Mirror",
  "mosh-tile": "Tile",
  "mosh-kaleido": "Kaleido",
  "mosh-splitter": "Splitter",
  "mosh-posterize": "Posterize",
  "mosh-solarize": "Solarize",
  "edge": "Edges",
  "mosh-bleach": "Bleach",
  "mosh-sharpen": "Sharpen",
  "pixel": "Pixelate",
  "mosh-dot-matrix": "Dot Matrix",
  "mosh-polar": "Polar",
  "mosh-8-bit": "8-Bit",
  "halftone": "Half Tone",
  "mosh-linocut": "LinoCut",
  "dither": "Dither",
  "ascii": "ASCII",
  "mosh-color-correction": "Color Correction",
  "mosh-curves": "Curves",
  "mosh-hue-cycle": "Hue Cycle",
  "mosh-duotone": "DuoTone",
  "mosh-rainbow": "Rainbow",
  "mosh-instacolor": "InstaColor",
  "mosh-rgb-shift": "RGB Shift",
  "mosh-vignette": "Vignette",
  "mosh-tilt-shift": "Tilt Shift",
  "mosh-barrel-blur": "Barrel Blur",
  "mosh-glow": "Glow",
  "mosh-blur": "Blur",
  "mosh-light-streak": "Light Streak",
  "mosh-strobe": "Strobe",
  "mosh-super8": "Super8",
  "vhs": "VHS",
  "crt": "CRT",
  "mosh-scanlines": "ScanLines",
  "mosh-grain": "Grain",
  "mosh-media": "Media",
  "mosh-caption": "Caption",
  "mosh-audio-visualizer": "Audio Visualizer",
  "mosh-texture": "Texture",
  "mosh-color-gradient": "Color Gradient",
  "mosh-noise": "Noise",
  "mosh-god-rays": "God Rays",
  "mosh-plasma": "Plasma",
  "mosh-grid": "Grid",
  "mosh-dots": "Dots",
  "mosh-mask": "Mask",
  "mosh-mask-blocks": "Mask Blocks",
  "mosh-mask-draw": "Mask Draw",
  "mosh-chroma-key": "ChromaKey",
  "mosh-remove-background": "Remove Background"
};
  // An entry is offered only when a renderer is installed.
  const names=Object.fromEntries(Object.entries(reference).filter(([type])=>Object.hasOwn(TonepressLooks.effects,type)));
  const groups=[
  [
    "时间与帧",
    "Time-Based",
    [
      "mosh-data-mosh",
      "mosh-optical-flow",
      "mosh-feedback",
      "mosh-watercolor",
      "mosh-slit-scan"
    ]
  ],
  [
    "故障信号",
    "Glitch",
    [
      "mosh-luma-mesh",
      "mosh-jitter",
      "mosh-melt",
      "mosh-shake",
      "mosh-bad-tv",
      "mosh-soft-glitch",
      "mosh-hard-glitch",
      "pixel-sort",
      "mosh-decimate"
    ]
  ],
  [
    "画面构图",
    "Reframing",
    [
      "mosh-transform",
      "mosh-transform-3d"
    ]
  ],
  [
    "图像位移",
    "Displacement",
    [
      "mosh-bulge",
      "mosh-slices",
      "mosh-stretch",
      "mosh-wave",
      "mosh-wobble",
      "mosh-smear",
      "mosh-push-draw"
    ]
  ],
  [
    "几何重复",
    "Repetition",
    [
      "mosh-mirror",
      "mosh-tile",
      "mosh-kaleido",
      "mosh-splitter"
    ]
  ],
  [
    "明暗与对比",
    "Tone & Contrast",
    [
      "mosh-posterize",
      "mosh-solarize",
      "edge",
      "mosh-bleach",
      "mosh-sharpen"
    ]
  ],
  [
    "网点与像素",
    "Dots & Pixels",
    [
      "pixel",
      "mosh-dot-matrix",
      "mosh-polar",
      "mosh-8-bit",
      "halftone",
      "mosh-linocut",
      "dither",
      "ascii"
    ]
  ],
  [
    "色彩处理",
    "Color",
    [
      "mosh-color-correction",
      "mosh-curves",
      "mosh-hue-cycle",
      "mosh-duotone",
      "mosh-rainbow",
      "mosh-instacolor"
    ]
  ],
  [
    "镜头光学",
    "Optics",
    [
      "mosh-rgb-shift",
      "mosh-vignette",
      "mosh-tilt-shift",
      "mosh-barrel-blur",
      "mosh-glow",
      "mosh-blur",
      "mosh-light-streak",
      "mosh-strobe"
    ]
  ],
  [
    "屏幕与胶片",
    "Screen & Film",
    [
      "mosh-super8",
      "vhs",
      "crt",
      "mosh-scanlines",
      "mosh-grain"
    ]
  ],
  [
    "叠加素材",
    "Content",
    [
      "mosh-media",
      "mosh-caption",
      "mosh-audio-visualizer",
      "mosh-texture"
    ]
  ],
  [
    "图案生成",
    "Generators",
    [
      "mosh-color-gradient",
      "mosh-noise",
      "mosh-god-rays",
      "mosh-plasma",
      "mosh-grid",
      "mosh-dots"
    ]
  ],
  [
    "图层遮罩",
    "Masking",
    [
      "mosh-mask",
      "mosh-mask-blocks",
      "mosh-mask-draw",
      "mosh-chroma-key",
      "mosh-remove-background"
    ]
  ]
].map(([name,en,ids])=>[name,en,ids.filter(id=>Object.hasOwn(names,id))]);
  function layer(type) {
    const base=TonepressLooks.layer(type);
    if (!Object.hasOwn(names,type)) return base;
    return {...base,profile:"mosh",...(window.TonepressMoshProfiles[type] || {})};
  }
  window.TonepressMosh={names,groups,layer};
})();
