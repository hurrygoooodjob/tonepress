(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const angle = value => value * Math.PI / 180;
  const fract = value => value - Math.floor(value);
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const range = (key, label, min, max, value, step = 1) => ({key, label, kind: "range", min, max, value, step});
  const select = (key, label, value, choices) => ({
    key, label, kind: "select", value, options: choices.map(([value, label]) => ({value, label}))
  });
  const direction = (value = 0) => range("direction", "几何方向角", -180, 180, value);
  const edgeChoices = [["matte", "暗色填边"], ["repeat", "重复填边"], ["clamp", "延伸边缘"]];
  const planeControls = [
    range("shiftX", "画面横移", -65, 65, 8),
    range("shiftY", "画面竖移", -65, 65, -4),
    range("scaleX", "横轴缩放", 35, 220, 100),
    range("scaleY", "纵轴缩放", 35, 220, 100)
  ];
  const paintMask = [
    "00000000", "00110000", "01111000", "00111100",
    "00011110", "00001100", "00000000", "00000000"
  ].join("");

  function effect(name, english, description, scaleLabel, size, controls, options = {}) {
    return {name, english, description, scaleLabel, size, controls, strength: 100,
      group: "空间与位移", groupEnglish: "Space & displacement", ...options};
  }

  const definitions = {
    "mosh-transform": effect("平面变换", "Transform", "平移、旋转与分别缩放画面，可选择越界填边方式。",
      "整体缩放", 8, [...planeControls, direction(-12), select("edge", "画面填边", "matte", edgeChoices)]),
    "mosh-transform-3d": effect("透视变换", "Transform 3D", "绕三条轴旋转图像平面，并将倾斜后的图像重新做透视投影。",
      "透视距离", 8, [...planeControls,
        range("rotateX", "俯仰旋转", -75, 75, -20), range("rotateY", "左右偏转", -75, 75, 30),
        range("rotateZ", "平面自转", -180, 180, -8), select("edge", "画面填边", "matte", edgeChoices)]),
    "mosh-bulge": effect("径向鼓包", "Bulge", "以可移动的圆心向外鼓包，圆外的图像保持原位。",
      "鼓包范围", 12, [range("pressure", "鼓包深度", -70, 120, 80),
        range("centerX", "鼓包横向中心", 0, 100, 50), range("centerY", "鼓包纵向中心", 0, 100, 50)]),
    "mosh-slices": effect("错位切片", "Slices", "切成窄条后让各条独立横移，可旋转条带并调节纵横运动速度。",
      "错位条带数量", 10, [direction(0), range("travel", "条带纵向速度", 0, 100, 20),
        range("drift", "条带横向速度", 0, 100, 45), range("offset", "切片偏移量", 0, 100, 46)], {timed: true}),
    "mosh-stretch": effect("局部拉伸", "Stretch", "沿指定方向拉长一条局部区域，可用波纹和锯齿扰动边缘。",
      "拉伸带宽", 8, [range("position", "拉伸带位置", 0, 100, 50), direction(-14),
        range("pull", "局部拉伸幅度", 0, 100, 68), range("wave", "拉伸边缘波纹", 0, 100, 24),
        range("jaggies", "拉伸边缘锯齿", 0, 100, 15)], {timed: true}),
    "mosh-wave": effect("正弦波变形", "Wave", "用单一正弦波弯曲图像，可改变波长、位置和方向。",
      "正弦波长", 8, [range("position", "波形位置", 0, 100, 49), direction(15), range("amplitude", "正弦波幅", 0, 100, 49)]),
    "mosh-wobble": effect("水波摇晃", "Wobble", "用交叠的缓慢波形推移全幅图像，形成滚动的折射。",
      "水波长度", 7, [range("speed", "水波速度", 0, 100, 42), range("amplitude", "水波振幅", 0, 100, 56)], {timed: true}),
    "mosh-smear": effect("拖抹笔痕", "Smear", "把画面沿一个方向拖成笔迹，视频运动会留下短暂累积的拖尾。",
      "拖痕长度", 9, [direction(12), range("speed", "拖痕积累速度", 0, 100, 54)], {timed: true, temporal: true}),
    "mosh-push-draw": effect("绘制位移", "Push Draw", "在 8×8 网格点亮要移动的区域，周围以柔和权重过渡，可选颜色分离与动画。",
      "绘制位移幅度", 9, [
        {key: "paint", label: "绘制 8×8 位移图", kind: "bitmap", value: paintMask, importLabel: "导入位移图"},
        direction(-18), range("fringe", "位移色散", 0, 100, 12), range("speed", "位移图动画速度", 0, 100, 0)
      ], {timed: true}),
    "mosh-mirror": effect("单侧镜像", "Mirror", "选定画面的一侧，再沿可移动的轴复制成另一半对称图像。",
      "镜面缩放", 8, [select("side", "保留镜像一侧", "left",
        [["left", "左侧"], ["right", "右侧"], ["top", "上侧"], ["bottom", "下侧"]]),
        range("position", "镜像轴位置", 15, 85, 50)]),
    "mosh-tile": effect("旋转拼贴", "Tile", "把原片按网格重复，可旋转网格，并让隔行偏移随时间变化。",
      "拼贴网格密度", 7, [range("offset", "拼贴隔行偏移", -100, 100, 35), direction(11),
        range("speed", "拼贴偏移动画速度", 0, 100, 23)], {timed: true}),
    "mosh-kaleido": effect("万花筒", "Kaleido", "把取样扇区反复镜像，围绕中心拼成可旋转的径向图案。",
      "万花筒扇数", 7, [direction(14), range("zoom", "扇区取样缩放", 40, 180, 100)]),
    "mosh-splitter": effect("有序分条", "Splitter", "把画面切为等宽条带，按条带次序偏移并分别缩放。",
      "分条数量", 7, [range("shift", "逐条位移", -100, 100, 40), range("offset", "分条交错距离", -100, 100, 18),
        range("scale", "单条内缩放", 35, 170, 105), direction(19)]),
    "mosh-polar": effect("极坐标环绕", "Polar", "将图像的横纵坐标映射为圆周角和半径，可改变内孔及重复次数。",
      "极坐标外径", 13, [range("hole", "环形内孔", 0, 75, 15),
        range("segments", "圆周重复次数", 1, 16, 1), direction(-12)]),
    "mosh-linocut": effect("油毡雕版", "LinoCut", "用长短不一的定向刻线重塑中间调，让亮部留白、暗部保留油墨。",
      "雕刻刀痕尺度", 7, [direction(28), range("contrast", "雕版墨量", 0, 100, 48),
        select("paper", "雕版纸墨配色", "ivory", [["ivory", "象牙纸黑墨"], ["clay", "陶土纸棕墨"], ["blue", "冷纸蓝墨"]])])
  };

  const buffers = new WeakMap();

  function workBuffer(input, output, limit) {
    let buffer = buffers.get(output);
    if (!buffer) {
      const create = () => output.ownerDocument.createElement("canvas");
      buffer = {input: create(), output: create()};
      buffer.inputContext = buffer.input.getContext("2d", {willReadFrequently: true});
      buffer.outputContext = buffer.output.getContext("2d");
      buffers.set(output, buffer);
    }
    const scale = Math.min(1, Math.sqrt(limit / (output.width * output.height)));
    const width = Math.max(1, Math.round(output.width * scale));
    const height = Math.max(1, Math.round(output.height * scale));
    if (buffer.input.width !== width || buffer.input.height !== height || !buffer.image) {
      buffer.input.width = buffer.output.width = width;
      buffer.input.height = buffer.output.height = height;
      buffer.image = buffer.outputContext.createImageData(width, height);
    }
    buffer.inputContext.globalCompositeOperation = "copy";
    buffer.inputContext.drawImage(input, 0, 0, width, height);
    return {...buffer, width, height, source: buffer.inputContext.getImageData(0, 0, width, height).data};
  }

  function flush(output, buffer) {
    const context = output.getContext("2d");
    if (buffer.width === output.width && buffer.height === output.height) {
      context.putImageData(buffer.image, 0, 0);
    } else {
      buffer.outputContext.putImageData(buffer.image, 0, 0);
      context.drawImage(buffer.output, 0, 0, output.width, output.height);
    }
  }

  function axes(width, height) {
    const short = Math.min(width, height);
    return {short, width: width / short, height: height / short, halfX: width / (2 * short), halfY: height / (2 * short)};
  }

  function sourceSample(color, target, out, raster, px, py, edge) {
    const {width, height, source} = raster;
    const repeat = edge === "repeat";
    if (!Number.isFinite(px) || !Number.isFinite(py) ||
        edge === "matte" && (px < -.5 || px > width - .5 || py < -.5 || py > height - .5)) {
      if (color === -1) {
        target[out] = 12; target[out + 1] = 15; target[out + 2] = 14; target[out + 3] = 255;
      }
      return;
    }
    const x = repeat ? fract(px / width) * width : clamp(px, 0, width - 1);
    const y = repeat ? fract(py / height) * height : clamp(py, 0, height - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0 + 1 < width ? x0 + 1 : repeat ? 0 : x0;
    const y1 = y0 + 1 < height ? y0 + 1 : repeat ? 0 : y0;
    const fx = x - x0, fy = y - y0;
    const a = (y0 * width + x0) * 4, b = (y0 * width + x1) * 4;
    const c = (y1 * width + x0) * 4, d = (y1 * width + x1) * 4;
    const wa = (1 - fx) * (1 - fy) * source[a + 3], wb = fx * (1 - fy) * source[b + 3];
    const wc = (1 - fx) * fy * source[c + 3], wd = fx * fy * source[d + 3];
    const alpha = wa + wb + wc + wd;
    const first = color === -1 ? 0 : color;
    const last = color === -1 ? 2 : color;
    if (color === -1 || color === 1) target[out + 3] = alpha;
    for (let k = first; k <= last; k++) {
      target[out + k] = alpha > 0 ? (source[a + k] * wa + source[b + k] * wb + source[c + k] * wc + source[d + k] * wd) / alpha : 0;
    }
  }

  function frameOffset(settings, shape) {
    return [settings.shiftX * shape.width / 100, settings.shiftY * shape.height / 100];
  }

  function transform(settings, shape) {
    const [tx, ty] = frameOffset(settings, shape);
    const c = Math.cos(angle(settings.direction)), s = Math.sin(angle(settings.direction));
    const scale = .55 + settings.size * .05625;
    const u = settings.scaleX * scale / 100, v = settings.scaleY * scale / 100;
    return (x, y, point) => {
      point.x = ((x - tx) * c + (y - ty) * s) / u;
      point.y = (-(x - tx) * s + (y - ty) * c) / v;
    };
  }

  function transform3d(settings, shape) {
    const [tx, ty] = frameOffset(settings, shape);
    const rx = angle(settings.rotateX), ry = angle(settings.rotateY), rz = angle(settings.rotateZ);
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    const u = [cy * cz, cy * sz, -sy];
    const v = [sy * sx * cz - cx * sz, sy * sx * sz + cx * cz, cy * sx];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const camera = 1.3 + settings.size * .13;
    return (x, y, point) => {
      const rx = x - tx, ry = y - ty;
      const depth = n[2] * camera / (n[0] * rx + n[1] * ry + n[2] * camera);
      if (depth <= 0 || depth > 8) {point.x = point.y = NaN; return;}
      const px = rx * depth, py = ry * depth, pz = camera * (depth - 1);
      point.x = (u[0] * px + u[1] * py + u[2] * pz) * 100 / settings.scaleX;
      point.y = (v[0] * px + v[1] * py + v[2] * pz) * 100 / settings.scaleY;
    };
  }

  function bulge(settings, shape) {
    const cx = (settings.centerX / 100 - .5) * shape.width;
    const cy = (settings.centerY / 100 - .5) * shape.height;
    const radius = .12 + settings.size * .035;
    const force = settings.pressure * .0067;
    return (x, y, point) => {
      const dx = x - cx, dy = y - cy;
      const inside = Math.max(0, 1 - (dx * dx + dy * dy) / (radius * radius));
      const pull = 1 - force * inside * inside;
      point.x = cx + dx * pull;
      point.y = cy + dy * pull;
    };
  }

  function rotatePoint(x, y, point, c, s) {
    point.x = x * c - y * s;
    point.y = x * s + y * c;
  }

  function slices(settings) {
    const radians = angle(settings.direction), c = Math.cos(radians), s = Math.sin(radians);
    const count = settings.size;
    const vertical = settings.time * settings.travel / 230;
    const horizontal = settings.time * settings.drift / 27;
    const amplitude = settings.offset * .0034;
    const shifts = new Map();
    return (x, y, point) => {
      const u = x * c + y * s, v = -x * s + y * c;
      const strip = Math.floor((v + .5 + vertical) * count);
      let shift = shifts.get(strip);
      if (shift === undefined) {
        shift = Math.sin(strip * 16.194 + horizontal) * amplitude *
          (.36 + .64 * (.5 + .5 * Math.sin(strip * 1.561)));
        shifts.set(strip, shift);
      }
      rotatePoint(u + shift, v, point, c, s);
    };
  }

  function stretch(settings) {
    const radians = angle(settings.direction), c = Math.cos(radians), s = Math.sin(radians);
    const line = settings.position / 100 - .5;
    const half = .025 + settings.size * .022;
    const pull = settings.pull / 100 * .86;
    return (x, y, point) => {
      const u = x * c + y * s, v = -x * s + y * c;
      const ripple = Math.sin(u * 17 - settings.time) * settings.wave * .0012;
      const jag = Math.sin(Math.floor((u + 1.7) * 39) * 8.264) * settings.jaggies * .00085;
      const weight = smooth(1 - Math.abs(v - line + ripple + jag) / half);
      const source = u - pull * weight * smooth((u + .2) * 2.3);
      rotatePoint(source, v, point, c, s);
    };
  }

  function wave(settings) {
    const radians = angle(settings.direction), c = Math.cos(radians), s = Math.sin(radians);
    const frequency = TAU / (.16 + settings.size * .095);
    const phase = settings.position * TAU / 100;
    const distance = settings.amplitude * .0022;
    return (x, y, point) => {
      const u = x * c + y * s, v = -x * s + y * c;
      rotatePoint(u, v + Math.sin(u * frequency + phase) * distance, point, c, s);
    };
  }

  function wobble(settings) {
    const frequency = TAU / (.26 + settings.size * .091);
    const tick = settings.time * settings.speed * .09;
    const distance = settings.amplitude * .00145;
    return (x, y, point) => {
      point.x = x + distance * (Math.sin(y * frequency + tick) + .38 * Math.sin(x * frequency * 1.13 - tick * .72));
      point.y = y + distance * (Math.cos(x * frequency * .82 - tick * .81) - .32 * Math.sin(y * frequency * 1.6 + tick));
    };
  }

  function maskCell(mask, x, y) {
    return x < 0 || x > 7 || y < 0 || y > 7 ? 0 : mask[y * 8 + x];
  }

  function paintGrid(mask, x, y) {
    if (x < -1 || x >= 8 || y < -1 || y >= 8) return 0;
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    return (1 - fy) * ((1 - fx) * maskCell(mask, ix, iy) + fx * maskCell(mask, ix + 1, iy)) +
      fy * ((1 - fx) * maskCell(mask, ix, iy + 1) + fx * maskCell(mask, ix + 1, iy + 1));
  }

  function pushDraw(settings, shape) {
    const radians = angle(settings.direction), c = Math.cos(radians), s = Math.sin(radians);
    const mask = Uint8Array.from(settings.paint, bit => bit === "1" ? 1 : 0);
    const phase = settings.time * settings.speed * .033;
    const moveX = settings.speed ? Math.sin(phase) * .75 : 0;
    const moveY = settings.speed ? (Math.cos(phase * .8) - 1) * .52 : 0;
    const strength = settings.size * .023;
    return (x, y, point) => {
      const u = (x / shape.width + .5) * 8 - .5 + moveX;
      const v = (y / shape.height + .5) * 8 - .5 + moveY;
      const maskWeight = smooth(paintGrid(mask, u, v));
      const amount = strength * maskWeight;
      point.x = x - c * amount;
      point.y = y - s * amount;
      point.fringe = maskWeight * settings.fringe * .0006;
    };
  }

  function mirror(settings, shape) {
    const horizontal = settings.side === "left" || settings.side === "right";
    const bias = settings.side === "left" || settings.side === "top" ? -1 : 1;
    const axis = (settings.position / 100 - .5) * (horizontal ? shape.width : shape.height);
    const zoom = .7 + settings.size * .0375;
    return (x, y, point) => {
      if (horizontal) {
        point.x = axis + bias * Math.abs(x - axis) / zoom; point.y = y / zoom;
      } else {
        point.x = x / zoom; point.y = axis + bias * Math.abs(y - axis) / zoom;
      }
    };
  }

  function tile(settings, shape) {
    const radians = angle(settings.direction), c = Math.cos(radians), s = Math.sin(radians);
    const count = Math.max(1, Math.round(settings.size / 2));
    const shift = settings.offset / 100;
    const drift = settings.speed * .011 * settings.time;
    return (x, y, point) => {
      const u = (x * c + y * s) / shape.width * count + .5;
      const v = (-x * s + y * c) / shape.height * count + .5;
      const stagger = (Math.floor(v) % 2 ? shift : 0) + drift;
      point.x = (fract(u + stagger) - .5) * shape.width;
      point.y = (fract(v) - .5) * shape.height;
    };
  }

  function kaleido(settings) {
    const phase = angle(settings.direction);
    const wedge = TAU / settings.size;
    const zoom = 100 / settings.zoom;
    return (x, y, point) => {
      const radius = Math.hypot(x, y) * zoom;
      const offset = (Math.atan2(y, x) - phase) / wedge;
      const spoke = Math.abs(fract(offset) - .5) * wedge + phase;
      point.x = Math.cos(spoke) * radius;
      point.y = Math.sin(spoke) * radius;
    };
  }

  function splitter(settings) {
    const radians = angle(settings.direction), c = Math.cos(radians), s = Math.sin(radians);
    const count = settings.size;
    const scale = settings.scale / 100;
    return (x, y, point) => {
      const u = x * c + y * s, v = -x * s + y * c;
      const strip = Math.floor((v + .5) * count);
      const center = (strip + .5) / count - .5;
      const shift = center * settings.shift * .013 + (strip % 2 ? settings.offset * .0028 : 0);
      rotatePoint(u / scale + shift, center + (v - center) / scale, point, c, s);
    };
  }

  function polar(settings, shape) {
    const radius = .16 + settings.size * .025;
    const hole = settings.hole / 100 * radius;
    const segments = settings.segments;
    const phase = settings.direction / 360;
    return (x, y, point) => {
      const distance = Math.hypot(x, y);
      if (distance < hole || distance > radius) {point.x = point.y = NaN; return;}
      point.x = (fract((Math.atan2(y, x) / TAU + phase) * segments) - .5) * shape.width;
      point.y = (.5 - (distance - hole) / (radius - hole)) * shape.height;
    };
  }

  const mappers = {
    "mosh-transform": transform, "mosh-transform-3d": transform3d, "mosh-bulge": bulge,
    "mosh-slices": slices, "mosh-stretch": stretch, "mosh-wave": wave, "mosh-wobble": wobble,
    "mosh-push-draw": pushDraw, "mosh-mirror": mirror, "mosh-tile": tile, "mosh-kaleido": kaleido,
    "mosh-splitter": splitter, "mosh-polar": polar
  };

  function remap(input, output, settings) {
    const raster = workBuffer(input, output, definitions[settings.type].timed ? 950000 : 1750000);
    const {width, height} = raster;
    const shape = axes(width, height);
    const delta = 1 / shape.short, centerX = width / 2 - .5, centerY = height / 2 - .5;
    const pixels = raster.image.data;
    const mapper = mappers[settings.type](settings, shape);
    const point = {x: 0, y: 0, fringe: 0};
    const edge = settings.edge || "clamp";
    for (let y = 0; y < height; y++) {
      const py = (y - centerY) * delta;
      for (let x = 0; x < width; x++) {
        const out = (y * width + x) * 4;
        mapper((x - centerX) * delta, py, point);
        const sx = point.x * shape.short + centerX, sy = point.y * shape.short + centerY;
        sourceSample(-1, pixels, out, raster, sx, sy, edge);
        if (point.fringe > .00005) {
          const separation = point.fringe * shape.short;
          sourceSample(0, pixels, out, raster, sx + separation, sy, edge);
          sourceSample(2, pixels, out, raster, sx - separation, sy, edge);
        }
      }
    }
    flush(output, raster);
  }

  function smear(input, output, settings) {
    const raster = workBuffer(input, output, 360000);
    const {width, height, source} = raster;
    const pixels = raster.image.data;
    const {time, history, speed, size} = settings;
    const previous = history?.smear;
    const usable = previous && previous.width === width && previous.height === height;
    if (usable && previous.time === time) {
      pixels.set(previous.pixels);
      flush(output, raster);
      return;
    }
    const active = usable && time > previous.time && time - previous.time < .8;
    const radians = angle(settings.direction), length = Math.min(width, height) * (.015 + size * .008);
    const dx = Math.cos(radians), dy = Math.sin(radians);
    const holds = active ? speed * .006 * Math.exp(-(time - previous.time) * 2.5) : 0;
    function pixel(x, y) {
      return (clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4;
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const out = (y * width + x) * 4;
      const near = pixel(Math.round(x - dx * length * .31), Math.round(y - dy * length * .31));
      const mid = pixel(Math.round(x - dx * length * .62), Math.round(y - dy * length * .62));
      const far = pixel(Math.round(x - dx * length), Math.round(y - dy * length));
      const trail = pixel(Math.round(x - dx * length * .15), Math.round(y - dy * length * .15));
      const motion = active ? clamp(Math.max(
        Math.abs(source[out] - previous.pixels[out]), Math.abs(source[out + 1] - previous.pixels[out + 1]),
        Math.abs(source[out + 2] - previous.pixels[out + 2])) / 100 + .27) : 0;
      const hold = holds * motion;
      for (let channel = 0; channel < 4; channel++) {
        const swept = source[out + channel] * .43 + source[near + channel] * .31 +
          source[mid + channel] * .17 + source[far + channel] * .09;
        pixels[out + channel] = hold ? swept * (1 - hold) + previous.pixels[trail + channel] * hold : swept;
      }
    }
    if (history) history.smear = {time, width, height, pixels: pixels.slice()};
    flush(output, raster);
  }

  const inks = {
    ivory: [[18, 26, 22], [240, 226, 192]],
    clay: [[62, 23, 20], [226, 167, 122]],
    blue: [[17, 37, 66], [205, 228, 223]]
  };

  function lino(input, output, settings) {
    const raster = workBuffer(input, output, 1500000);
    const {width, height, source} = raster;
    const pixels = raster.image.data;
    const [ink, paper] = inks[settings.paper];
    const c = Math.cos(angle(settings.direction)), s = Math.sin(angle(settings.direction));
    const stride = (.0013 + settings.size * .0018) * Math.min(width, height);
    const bias = (settings.contrast - 50) * .0044;
    const luma = offset => (source[offset] * .2126 + source[offset + 1] * .7152 + source[offset + 2] * .0722) / 255;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const value = clamp(luma(offset) - bias);
      const u = (x * c + y * s) / stride, v = (-x * s + y * c) / stride;
      const cut = Math.floor(v);
      const line = Math.abs(fract(v + .12 * Math.sin(u * .75 + cut * 2.27)) - .5);
      const cap = .48 + .52 * Math.sin(Math.PI * fract(u * .18 + cut * .371));
      const cutWidth = clamp((value - .19) * 1.28, 0, .54) * cap;
      const paperWeight = value > .76 ? 1 : value < .17 ? 0 : smooth((cutWidth - line) * (stride + 4) + .5);
      for (let k = 0; k < 3; k++) pixels[offset + k] = ink[k] + (paper[k] - ink[k]) * paperWeight;
      pixels[offset + 3] = source[offset + 3];
    }
    flush(output, raster);
  }

  function draw(input, output, settings) {
    if (!Number.isFinite(settings.time)) settings = {...settings, time: 0};
    if (settings.type === "mosh-smear") smear(input, output, settings);
    else if (settings.type === "mosh-linocut") lino(input, output, settings);
    else remap(input, output, settings);
  }

  window.TonepressPacks.push({definitions, draw});
})();
