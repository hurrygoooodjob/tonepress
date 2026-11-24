(function () {
  "use strict";

  const kinds = { dither: 1, riso: 2, ascii: 3, pixel: 4, edge: 5, threshold: 6 };
  const extraKinds = new Set(["thermal", "crt", "vhs", "glitch", "hatch", "contour", "prism"]);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const gameColors = [[17, 32, 29], [59, 88, 54], [126, 158, 79], [220, 228, 151]];
  const palettes = {
    handheld: gameColors,
    ink: [[22,24,25],[91,94,94],[166,170,165],[241,239,222]],
    sunset: [[38,26,61],[113,52,109],[224,106,92],[255,218,153]]
  };
  const defaultGlyphs = " .,:-+=*#%@";
  function glyphRamp(value) {
    if (typeof value !== "string") return defaultGlyphs;
    const printable = value.replace(/[^ -~]/g, "").slice(0, 24);
    return printable.length >= 2 && printable.trim().length ? printable : defaultGlyphs;
  }
  const glyphWidth = 16;
  const glyphHeight = 22;
  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  const vertexShader = `#version 300 es
    out vec2 uv;
    void main() {
      vec2 vertex = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      uv = vec2(vertex.x, 1.0 - vertex.y);
      gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);
    }
  `;

  const fragmentShader = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec4 pixel;
    uniform sampler2D imageTexture;
    uniform sampler2D glyphTexture;
    uniform vec2 sourceSize;
    uniform int kind;
    uniform float size;
    uniform float amount;

    const float values[16] = float[16](${bayer.map(value => value.toFixed(1)).join(", ")});
    uniform vec3 palette[4];
    uniform float glyphCount;
    const vec3 paper = vec3(249.0, 239.0, 219.0) / 255.0;
    const vec3 ink = vec3(28.0, 36.0, 47.0) / 255.0;

    float tone(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }
    vec4 sampleAt(vec2 xy) {
      return texture(imageTexture, xy / sourceSize);
    }
    float matrixValue(vec2 xy) {
      ivec2 cell = ivec2(mod(floor(xy), 4.0));
      return (values[cell.y * 4 + cell.x] + 0.5) / 16.0 - 0.5;
    }
    float sobel(vec2 p, float stepSize) {
      float a = tone(sampleAt(p + vec2(-stepSize, -stepSize)).rgb);
      float b = tone(sampleAt(p + vec2(0.0, -stepSize)).rgb);
      float c = tone(sampleAt(p + vec2(stepSize, -stepSize)).rgb);
      float d = tone(sampleAt(p + vec2(-stepSize, 0.0)).rgb);
      float f = tone(sampleAt(p + vec2(stepSize, 0.0)).rgb);
      float g = tone(sampleAt(p + vec2(-stepSize, stepSize)).rgb);
      float h = tone(sampleAt(p + vec2(0.0, stepSize)).rgb);
      float i = tone(sampleAt(p + vec2(stepSize, stepSize)).rgb);
      return length(vec2(c + 2.0 * f + i - a - 2.0 * d - g, g + 2.0 * h + i - a - 2.0 * b - c)) * 0.25;
    }
    void main() {
      vec4 base = texture(imageTexture, uv);
      vec2 xy = uv * sourceSize;
      float lightness = tone(base.rgb);
      vec3 result = base.rgb;

      if (kind == 1) {
        int color = int(clamp(floor(lightness * 3.0 + matrixValue(xy / size) * 1.08 + 0.5), 0.0, 3.0));
        result = palette[color];
      } else if (kind == 2) {
        vec4 offset = sampleAt(xy + vec2(0.47, -0.31) * size);
        vec3 other = offset.a > 0.0 ? offset.rgb : base.rgb;
        float grain = matrixValue(xy / max(1.0, size / 4.0));
        float cool = clamp((1.0 - lightness) * 1.14 + (base.b - base.r) * 0.28 + grain * 0.09, 0.0, 0.92);
        float warm = clamp((1.0 - tone(other)) * 0.74 + (other.r - other.b) * 0.57 + grain * 0.08, 0.0, 0.94);
        result = paper * mix(vec3(1.0), vec3(0.17, 0.32, 0.71), cool)
            * mix(vec3(1.0), vec3(0.98, 0.27, 0.32), warm) + grain * 0.028;
      } else if (kind == 3) {
        vec2 pitch = size * vec2(1.6, 2.24);
        vec2 cell = xy / pitch;
        vec4 center = sampleAt((floor(cell) + 0.5) * pitch);
        vec3 color = center.a > 0.0 ? center.rgb : base.rgb;
        float letter = floor(min(0.99999, tone(color)) * glyphCount);
        vec2 location = clamp(fract(cell), vec2(0.03125, 0.02273), vec2(0.96875, 0.97727));
        float mask = texture(glyphTexture, vec2((letter + location.x) / glyphCount, location.y)).a;
        result = mix(vec3(0.051, 0.071, 0.061), mix(vec3(0.84, 0.95, 0.75), color, 0.30), mask);
      } else if (kind == 4) {
        float block = size * 2.0;
        vec4 sampleColor = sampleAt((floor(xy / block) + 0.5) * block);
        result = sampleColor.a > 0.0 ? sampleColor.rgb : base.rgb;
      } else if (kind == 5) {
        float mark = smoothstep(0.035, 0.39, sobel(xy, max(1.0, size / 4.0)));
        result = mix(mix(paper, base.rgb, 0.14), ink, mark);
      } else if (kind == 6) {
        float cutoff = 0.18 + (size - 2.0) * (0.64 / 14.0);
        result = lightness < cutoff ? ink : paper;
      }
      pixel = vec4(mix(base.rgb, result, amount), base.a);
    }
  `;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function smoothstep(min, max, value) {
    const ratio = clamp((value - min) / (max - min), 0, 1);
    return ratio * ratio * (3 - 2 * ratio);
  }

  function dimensions(source) {
    return [
      source.videoWidth ?? source.naturalWidth ?? source.width,
      source.videoHeight ?? source.naturalHeight ?? source.height
    ];
  }

  function newCanvas(owner) {
    if (owner.ownerDocument) return owner.ownerDocument.createElement("canvas");
    return new OffscreenCanvas(1, 1);
  }

  function resize(canvas, width, height) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function paint(source, output, width, height, zoom = 1) {
    resize(output, width, height);
    if (source === output && zoom === 1) return;
    const ctx = output.getContext("2d");
    const [sourceWidth, sourceHeight] = dimensions(source);
    ctx.save();
    try {
      ctx.resetTransform();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "copy";
      ctx.imageSmoothingEnabled = sourceWidth !== width || sourceHeight !== height || zoom !== 1;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, (1 - zoom) * width * 0.5, (1 - zoom) * height * 0.5, width * zoom, height * zoom);
    } finally {
      ctx.restore();
    }
  }

  function makeGlyphAtlas(owner, glyphs) {
    const atlas = newCanvas(owner);
    resize(atlas, glyphWidth * glyphs.length, glyphHeight);
    const ctx = atlas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let index = 0; index < glyphs.length; index++) {
      ctx.fillText(glyphs[index], (index + 0.5) * glyphWidth, glyphHeight * 0.55, glyphWidth - 2);
    }
    return atlas;
  }

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = new Error(gl.getShaderInfoLog(shader) || "Tonepress effect shader could not compile.");
      gl.deleteShader(shader);
      throw error;
    }
    return shader;
  }

  function createGPU(owner) {
    const surface = newCanvas(owner);
    const gl = surface.getContext("webgl2", {
      alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false
    });
    if (!gl) return null;

    const program = gl.createProgram();
    let vertex;
    let fragment;
    try {
      vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
      fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Tonepress effect shader could not link.");
      }
    } catch (error) {
      gl.deleteProgram(program);
      throw error;
    } finally {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }

    function texture(unit) {
      const entry = gl.createTexture();
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, entry);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return entry;
    }

    gl.useProgram(program);
    const sourceTexture = texture(gl.TEXTURE0);
    const glyphTexture = texture(gl.TEXTURE1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(gl.getUniformLocation(program, "imageTexture"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "glyphTexture"), 1);
    const sourceSizeUniform = gl.getUniformLocation(program, "sourceSize");
    const kindUniform = gl.getUniformLocation(program, "kind");
    const sizeUniform = gl.getUniformLocation(program, "size");
    const amountUniform = gl.getUniformLocation(program, "amount");
    const textureLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const viewportLimit = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    let imageWidth = 0;
    let imageHeight = 0;
    const glyphCountUniform = gl.getUniformLocation(program,"glyphCount");
    const paletteUniform = gl.getUniformLocation(program,"palette[0]");
    let loadedGlyphs = null;
    let loadedPalette = null;

    return {
      draw(source, output, settings, getAtlas) {
        const { type, size, strength, width, height, sourceWidth, sourceHeight } = settings;
        const [inputWidth, inputHeight] = dimensions(source);
        if (gl.isContextLost() || inputWidth > textureLimit || inputHeight > textureLimit ||
            width > viewportLimit[0] || height > viewportLimit[1]) return false;

        resize(surface, width, height);
        if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) return false;
        if (type === "dither" && loadedPalette !== settings.palette) {
          gl.uniform3fv(paletteUniform, palettes[settings.palette].flat().map(value => value/255));
          loadedPalette = settings.palette;
        }
        if (loadedGlyphs !== settings.chars && type === "ascii") {
          gl.activeTexture(gl.TEXTURE1);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, getAtlas(settings.chars));
          if (gl.getError() !== gl.NO_ERROR) return false;
          gl.uniform1f(glyphCountUniform,settings.chars.length);
          loadedGlyphs = settings.chars;
        }

        gl.activeTexture(gl.TEXTURE0);
        if (imageWidth === inputWidth && imageHeight === inputHeight) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
        } else {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
          if (gl.getError() !== gl.NO_ERROR) return false;
          imageWidth = inputWidth;
          imageHeight = inputHeight;
        }

        gl.viewport(0, 0, width, height);
        gl.uniform2f(sourceSizeUniform, sourceWidth, sourceHeight);
        gl.uniform1i(kindUniform, kinds[type]);
        gl.uniform1f(sizeUniform, size);
        gl.uniform1f(amountUniform, strength / 100);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        paint(surface, output, width, height);
        return true;
      },
      dispose() {
        gl.deleteTexture(sourceTexture);
        gl.deleteTexture(glyphTexture);
        gl.deleteProgram(program);
        resize(surface, 1, 1);
      }
    };
  }

  function cpuDraw(source, output, settings, getGlyphPixels) {
    const { type, size, strength, width, height, sourceWidth, sourceHeight } = settings;
    const mode = kinds[type];
    paint(source, output, width, height);
    const ctx = output.getContext("2d");
    const image = ctx.getImageData(0, 0, width, height);
    const pixels = image.data;
    const original = mode === 2 || mode === 3 || mode === 4 ? pixels.slice() : pixels;
    const grayscale = mode === 5 ? new Float32Array(width * height) : null;
    if (grayscale) {
      for (let position = 0, index = 0; position < grayscale.length; position++, index += 4) {
        grayscale[position] = luma(pixels[index], pixels[index + 1], pixels[index + 2]);
      }
    }
    const glyphs = settings.chars;
    const atlas = mode === 3 ? getGlyphPixels(glyphs) : null;
    const colors = palettes[settings.palette];
    const amount = strength / 100;
    const sourcePerX = sourceWidth / width;
    const sourcePerY = sourceHeight / height;
    const rasterIndex = (x, y) => clamp(Math.floor(x / sourcePerX), 0, width - 1) +
      clamp(Math.floor(y / sourcePerY), 0, height - 1) * width;
    const ditherValue = (x, y) => (bayer[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
    const threshold = 255 * (0.18 + (size - 2) * 0.64 / 14);
    const edgeStepX = Math.max(1, Math.round(Math.max(1, size / 4) / sourcePerX));
    const edgeStepY = Math.max(1, Math.round(Math.max(1, size / 4) / sourcePerY));
    const grainSize = Math.max(1, size / 4);
    const glyphCellWidth = size * 1.6;
    const glyphCellHeight = size * 2.24;

    for (let y = 0; y < height; y++) {
      const sourceY = (y + 0.5) * sourcePerY;
      const row = y * width;
      const upper = Math.max(0, y - edgeStepY) * width;
      const lower = Math.min(height - 1, y + edgeStepY) * width;

      for (let x = 0; x < width; x++) {
        const index = (row + x) * 4;
        if (!pixels[index + 3]) continue;
        const sourceX = (x + 0.5) * sourcePerX;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const tone = luma(r, g, b);
        let red, green, blue;

        if (mode === 1) {
          const matrix = ditherValue(Math.floor(sourceX / size), Math.floor(sourceY / size));
          const level = clamp(Math.floor(tone * (3 / 255) + matrix * 1.08 + 0.5), 0, 3);
          [red, green, blue] = colors[level];
        } else if (mode === 2) {
          const shifted = rasterIndex(sourceX + size * 0.47, sourceY - size * 0.31) * 4;
          const sample = original[shifted + 3] ? shifted : index;
          const warmR = original[sample];
          const warmG = original[sample + 1];
          const warmB = original[sample + 2];
          const grain = ditherValue(Math.floor(sourceX / grainSize), Math.floor(sourceY / grainSize));
          const cool = clamp((1 - tone / 255) * 1.14 + (b - r) * (0.28 / 255) + grain * 0.09, 0, 0.92);
          const warm = clamp((1 - luma(warmR, warmG, warmB) / 255) * 0.74 +
            (warmR - warmB) * (0.57 / 255) + grain * 0.08, 0, 0.94);
          red = 249 * (1 - 0.83 * cool) * (1 - 0.02 * warm) + grain * 7.14;
          green = 239 * (1 - 0.68 * cool) * (1 - 0.73 * warm) + grain * 7.14;
          blue = 219 * (1 - 0.29 * cool) * (1 - 0.68 * warm) + grain * 7.14;
        } else if (mode === 3) {
          const cellX = sourceX / glyphCellWidth, cellY = sourceY / glyphCellHeight;
          const left = Math.floor(cellX), top = Math.floor(cellY);
          const center = rasterIndex((left + 0.5) * glyphCellWidth, (top + 0.5) * glyphCellHeight) * 4;
          const sample = original[center + 3] ? center : index;
          const level = Math.min(glyphs.length - 1,
            Math.floor(luma(original[sample], original[sample + 1], original[sample + 2]) * (glyphs.length / 255)));
          const letterX = level * glyphWidth + Math.floor((cellX - left) * glyphWidth);
          const letterY = Math.floor((cellY - top) * glyphHeight);
          const mask = atlas[(letterY * glyphWidth * glyphs.length + letterX) * 4 + 3] / 255;
          red = 13 + (150 + original[sample] * 0.3 - 13) * mask;
          green = 18 + (170 + original[sample + 1] * 0.3 - 18) * mask;
          blue = 16 + (134 + original[sample + 2] * 0.3 - 16) * mask;
        } else if (mode === 4) {
          const block = size * 2;
          const center = rasterIndex((Math.floor(sourceX / block) + 0.5) * block,
            (Math.floor(sourceY / block) + 0.5) * block) * 4;
          const sample = original[center + 3] ? center : index;
          red = original[sample];
          green = original[sample + 1];
          blue = original[sample + 2];
        } else if (mode === 5) {
          const left = Math.max(0, x - edgeStepX), right = Math.min(width - 1, x + edgeStepX);
          const gx = grayscale[upper + right] + 2 * grayscale[row + right] + grayscale[lower + right] -
            grayscale[upper + left] - 2 * grayscale[row + left] - grayscale[lower + left];
          const gy = grayscale[lower + left] + 2 * grayscale[lower + x] + grayscale[lower + right] -
            grayscale[upper + left] - 2 * grayscale[upper + x] - grayscale[upper + right];
          const mark = smoothstep(0.035 * 1020, 0.39 * 1020, Math.sqrt(gx * gx + gy * gy));
          red = (214.14 + r * 0.14) * (1 - mark) + 28 * mark;
          green = (205.54 + g * 0.14) * (1 - mark) + 36 * mark;
          blue = (188.34 + b * 0.14) * (1 - mark) + 47 * mark;
        } else {
          const dark = tone < threshold;
          red = dark ? 28 : 249;
          green = dark ? 36 : 239;
          blue = dark ? 47 : 219;
        }

        pixels[index] = r + (red - r) * amount;
        pixels[index + 1] = g + (green - g) * amount;
        pixels[index + 2] = b + (blue - b) * amount;
      }
    }

    ctx.putImageData(image, 0, 0);
  }

  function create(canvas) {
    if (!canvas.getContext("2d")) throw new Error("Tonepress requires a 2D canvas.");

    const scratch = [];
    const kits = TonepressKits.create(canvas);
    const halftoneRenderers = new Map();
    const maskBuffers = [];
    let gpu;
    // Bound the character cache even as users explore different ramps in a long session.
    const atlases = new Map();
    let disposed = false;
    function atlasFor(chars) {
      if (!atlases.has(chars)) {
        if (atlases.size >= 12) atlases.delete(atlases.keys().next().value);
        atlases.set(chars, {canvas:makeGlyphAtlas(canvas,chars),pixels:null});
      }
      return atlases.get(chars);
    }
    const getAtlas = chars => atlasFor(chars).canvas;
    function getGlyphPixels(chars) {
      const atlas = atlasFor(chars);
      return atlas.pixels ??= atlas.canvas.getContext("2d").getImageData(0,0,atlas.canvas.width,atlas.canvas.height).data;
    }

    function nextCanvas(input) {
      const index = input === scratch[0] ? 1 : 0;
      return scratch[index] ??= newCanvas(canvas);
    }

    function apply(input, output, settings, layer, position) {
      if (TonepressKits.byType.has(settings.type)) {
        kits.draw(input,output,settings,layer,position);
      } else if (settings.type === "halftone") {
        if (!halftoneRenderers.has(output)) halftoneRenderers.set(output, window.TonepressRenderer.create(output));
        halftoneRenderers.get(output).render(input, settings);
      } else if (extraKinds.has(settings.type)) {
        resize(output, settings.width, settings.height);
        const extras = window.TonepressExtras;
        if (!extras || extras.draw(input, output, settings) === false) {
          paint(input, output, settings.width, settings.height);
        }
      } else {
        try {
          if (gpu === undefined) gpu = createGPU(canvas);
          if (gpu?.draw(input, output, settings, getAtlas)) return;
        } catch {
          if (gpu) gpu.dispose();
          gpu = null;
        }
        cpuDraw(input, output, settings, getGlyphPixels);
      }
    }

    return {
      render(source, { width, height, layers = [], motion, time, history, audioBuffer } = {}) {
        if (disposed || !source || source.readyState !== undefined && source.readyState < 2) return false;
        const [sourceWidth, sourceHeight] = dimensions(source);
        if (!(sourceWidth > 0 && sourceHeight > 0)) return false;
        width = Math.max(1, Math.round(finite(width, sourceWidth)));
        height = Math.max(1, Math.round(finite(height, sourceHeight)));
        time = finite(time, finite(source.currentTime, 0));
        const zoom = motion === "breathe" ? 1 + (1 - Math.cos(time * Math.PI * 0.5)) * 0.03 : 1;
        const active = (Array.isArray(layers) ? layers : []).filter(layer =>
          layer && layer.enabled !== false && finite(layer.strength, 22) > 0 &&
          (layer.type === "halftone" || Object.hasOwn(kinds, layer.type) || extraKinds.has(layer.type) || TonepressKits.byType.has(layer.type)));
        kits.prepare(source,active,history);
        let current = source;
        let maskUnderlay = null;

        for (let index = 0; index < active.length; index++) {
          const { type, size, strength, palette, chars } = active[index];
          if ((extraKinds.has(type) || TonepressKits.byType.has(type)) && (typeof current.getContext !== "function" || current.width !== width ||
              current.height !== height)) {
            const inputCanvas = nextCanvas(current);
            paint(current, inputCanvas, width, height);
            current = inputCanvas;
          }
          let nextUnderlay = null;
          if (TonepressLooks.effects[active[index+1]?.type]?.mask) {
            // The next mask reveals the input to this pass, also when masking another mask.
            const slot = index % 2;
            nextUnderlay = maskBuffers[slot] ??= newCanvas(canvas);
            paint(current,nextUnderlay,width,height);
          }
          const isLast = index === active.length - 1 && zoom === 1;
          const output = isLast && current !== canvas ? canvas : nextCanvas(current);
          apply(current, output, { type,
            palette: Object.hasOwn(palettes,palette) ? palette : "handheld",
            chars: glyphRamp(chars), size: clamp(finite(size, 6), 2, 16),
            strength: clamp(finite(strength, 22), 0, 100), width, height, sourceWidth, sourceHeight, time, audioBuffer, originalSource:source, maskUnderlay:index ? maskUnderlay : null, videoSource:typeof source.videoWidth==="number" }, active[index], index);
          current = output;
          maskUnderlay = nextUnderlay;
        }

        if (current === canvas && (zoom !== 1 || canvas.width !== width || canvas.height !== height)) {
          const buffer = nextCanvas(current);
          paint(current, buffer, width, height);
          current = buffer;
        }
        if (current !== canvas) paint(current, canvas, width, height, zoom);
        return true;
      },

      snapshot: kits.snapshot,
      resetHistory: kits.resetHistory,
      dispose() {
        if (disposed) return;
        kits.dispose();
        for(const buffer of maskBuffers) if(buffer) resize(buffer,1,1);
        disposed = true;
        for (const renderer of halftoneRenderers.values()) renderer.dispose();
        halftoneRenderers.clear();
        if (gpu) gpu.dispose();
        gpu = null;
        for (const buffer of scratch) if (buffer) resize(buffer, 1, 1);
        scratch.length = 0;
        atlases.clear();
      }
    };
  }

  window.TonepressStack = { create };
})();
