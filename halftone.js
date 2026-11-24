(function () {
  "use strict";

  const DIAGONAL = Math.SQRT1_2;
  const PI = Math.PI;
  const LUMA = [0.2126, 0.7152, 0.0722];
  const MIN_RADIUS = 0.18;
  const RADIUS_RANGE = 0.18;
  const MAX_CONTRAST = 0.92;

  const vertexShader = `#version 300 es
    out vec2 uv;

    void main() {
      vec2 point = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      uv = vec2(point.x, 1.0 - point.y);
      gl_Position = vec4(point * 2.0 - 1.0, 0.0, 1.0);
    }
  `;

  const fragmentShader = `#version 300 es
    precision highp float;

    in vec2 uv;
    out vec4 pixel;

    uniform sampler2D sourceTexture;
    uniform vec2 sourceSize;
    uniform float pitch;
    uniform float edge;
    uniform float contrast;

    const float diagonal = ${DIAGONAL};
    const vec3 lumaWeights = vec3(${LUMA.join(", ")});

    void main() {
      vec4 source = texture(sourceTexture, uv);
      float luminance = dot(source.rgb, lumaWeights);

      // Grid coordinates are measured in source pixels, independent of canvas size.
      vec2 xy = uv * sourceSize;
      vec2 grid = vec2(xy.x - xy.y, xy.x + xy.y) * diagonal / pitch;
      vec2 local = fract(grid) - 0.5;
      vec2 center = xy - vec2(local.x + local.y, local.y - local.x) * diagonal * pitch;
      float tone = dot(texture(sourceTexture, center / sourceSize).rgb, lumaWeights);
      float radius = ${MIN_RADIUS} + ${RADIUS_RANGE} * (1.0 - tone);
      float mark = 1.0 - smoothstep(radius - edge, radius + edge, length(local));

      // Center the dot's tone by its coverage, including the softened boundary.
      float coverage = ${PI} * (radius * radius + edge * edge / 5.0);
      float delta = (coverage - mark) * min(luminance, 1.0 - luminance) * contrast;
      float target = delta < 0.0 ? 0.0 : 1.0;
      float room = max(abs(target - luminance), 0.00001);
      pixel = vec4(mix(source.rgb, vec3(target), abs(delta) / room), source.a);
    }
  `;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function valueOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function smoothstep(min, max, value) {
    const ratio = clamp((value - min) / (max - min), 0, 1);
    return ratio * ratio * (3 - 2 * ratio);
  }

  function getSourceSize(source) {
    if (typeof source.videoWidth === "number") {
      return [source.videoWidth, source.videoHeight];
    }
    if (typeof source.naturalWidth === "number") {
      return [source.naturalWidth, source.naturalHeight];
    }
    return [source.width, source.height];
  }

  function copySource(context, source, width, height) {
    const [sourceWidth, sourceHeight] = getSourceSize(source);
    context.save();
    try {
      context.resetTransform();
      context.globalAlpha = 1;
      context.globalCompositeOperation = "copy";
      context.imageSmoothingEnabled = sourceWidth !== width || sourceHeight !== height;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, 0, 0, width, height);
    } finally {
      context.restore();
    }
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || "Unable to compile Tonepress shader.");
    }
    return shader;
  }

  function createGPU(canvas) {
    const surface = canvas.ownerDocument.createElement("canvas");
    const gl = surface.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false
    });
    if (!gl) return null;

    const program = gl.createProgram();
    let vertex;
    let fragment;
    try {
      vertex = createShader(gl, gl.VERTEX_SHADER, vertexShader);
      fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Unable to link Tonepress shader.");
      }
    } catch (error) {
      gl.deleteProgram(program);
      throw error;
    } finally {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "sourceTexture"), 0);
    const sourceSize = gl.getUniformLocation(program, "sourceSize");
    const pitchUniform = gl.getUniformLocation(program, "pitch");
    const edgeUniform = gl.getUniformLocation(program, "edge");
    const contrastUniform = gl.getUniformLocation(program, "contrast");

    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    let textureWidth = 0;
    let textureHeight = 0;

    return {
      render(source, settings) {
        const { width, height, sourceWidth, sourceHeight, inputWidth, inputHeight, pitch, edge, contrast } = settings;
        if (gl.isContextLost() || inputWidth > maxTextureSize || inputHeight > maxTextureSize ||
            width > maxViewport[0] || height > maxViewport[1]) {
          return null;
        }
        if (surface.width !== width) surface.width = width;
        if (surface.height !== height) surface.height = height;
        if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) return null;

        gl.viewport(0, 0, width, height);
        if (textureWidth !== inputWidth || textureHeight !== inputHeight) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
          if (gl.getError() !== gl.NO_ERROR) return null;
          textureWidth = inputWidth;
          textureHeight = inputHeight;
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
        }
        gl.uniform2f(sourceSize, sourceWidth, sourceHeight);
        gl.uniform1f(pitchUniform, pitch);
        gl.uniform1f(edgeUniform, edge);
        gl.uniform1f(contrastUniform, contrast);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return surface;
      },
      dispose() {
        gl.deleteTexture(texture);
        gl.deleteProgram(program);
        surface.width = 1;
        surface.height = 1;
      }
    };
  }

  function applyPattern(context, settings) {
    const { width, height, sourceWidth, sourceHeight, pitch, edge, contrast } = settings;
    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;
    const luminance = new Float32Array(width * height);
    for (let pixel = 0, index = 0; pixel < luminance.length; pixel += 1, index += 4) {
      luminance[pixel] = (pixels[index] * LUMA[0] + pixels[index + 1] * LUMA[1] +
        pixels[index + 2] * LUMA[2]) / 255;
    }

    const scaleX = sourceWidth / width;
    const scaleY = sourceHeight / height;
    const diagonalPitch = DIAGONAL * pitch;
    const projectedXStep = DIAGONAL * scaleX / pitch;
    const edgeCoverage = edge * edge / 5;
    for (let y = 0; y < height; y += 1) {
      const sourceY = (y + 0.5) * scaleY;
      const gridStartX = (scaleX * 0.5 - sourceY) * DIAGONAL / pitch;
      const gridStartY = (scaleX * 0.5 + sourceY) * DIAGONAL / pitch;
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        const pixel = row + x;
        const index = pixel * 4;
        const tone = luminance[pixel];
        if (pixels[index + 3] === 0 || tone <= 0 || tone >= 1) continue;

        const gridX = gridStartX + x * projectedXStep;
        const gridY = gridStartY + x * projectedXStep;
        const localX = gridX - Math.floor(gridX) - 0.5;
        const localY = gridY - Math.floor(gridY) - 0.5;
        const centerX = clamp(Math.floor(x + 0.5 - (localX + localY) * diagonalPitch / scaleX), 0, width - 1);
        const centerY = clamp(Math.floor(y + 0.5 - (localY - localX) * diagonalPitch / scaleY), 0, height - 1);
        const radius = MIN_RADIUS + RADIUS_RANGE * (1 - luminance[centerY * width + centerX]);
        const distance = Math.sqrt(localX * localX + localY * localY);
        const mark = 1 - smoothstep(radius - edge, radius + edge, distance);
        const coverage = PI * (radius * radius + edgeCoverage);
        const delta = (coverage - mark) * Math.min(tone, 1 - tone) * contrast;
        const target = delta < 0 ? 0 : 255;
        const room = delta < 0 ? tone : 1 - tone;
        const amount = Math.abs(delta) / room;
        pixels[index] += (target - pixels[index]) * amount;
        pixels[index + 1] += (target - pixels[index + 1]) * amount;
        pixels[index + 2] += (target - pixels[index + 2]) * amount;
      }
    }

    context.putImageData(image, 0, 0);
  }

  function create(canvas) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tonepress requires a 2D canvas.");

    let gpu;
    let disposed = false;
    return {
      render(source, options = {}) {
        if (disposed || !source) return false;
        const [inputWidth, inputHeight] = getSourceSize(source);
        if (!(inputWidth > 0 && inputHeight > 0)) return false;
        if (source.readyState !== undefined && source.readyState < 2) return false;

        const width = Math.max(1, Math.round(valueOr(options.width, inputWidth)));
        const height = Math.max(1, Math.round(valueOr(options.height, inputHeight)));
        const sourceWidth = Math.max(1, valueOr(options.sourceWidth, inputWidth));
        const sourceHeight = Math.max(1, valueOr(options.sourceHeight, inputHeight));
        const pitch = clamp(valueOr(options.size, 6), 2, 16);
        const strength = clamp(valueOr(options.strength, 22), 0, 100) / 100;
        const projectedPitch = pitch * Math.min(width / sourceWidth, height / sourceHeight);
        const edge = Math.min(0.13, 0.55 / Math.max(1, projectedPitch));
        // Sub-pixel screens resolve to their mean rather than flickering or aliasing.
        const contrast = strength * MAX_CONTRAST * smoothstep(1.25, 3.1, projectedPitch);
        const settings = { width, height, sourceWidth, sourceHeight, inputWidth, inputHeight, pitch, edge, contrast };

        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        if (contrast > 0) {
          try {
            if (gpu === undefined) gpu = createGPU(canvas);
            const result = gpu && gpu.render(source, settings);
            if (result) {
              copySource(context, result, width, height);
              return true;
            }
          } catch {
            if (gpu) gpu.dispose();
            gpu = null;
          }
        }

        copySource(context, source, width, height);
        if (contrast > 0) applyPattern(context, settings);
        return true;
      },
      dispose() {
        if (gpu) gpu.dispose();
        gpu = null;
        disposed = true;
      }
    };
  }

  window.TonepressRenderer = { create };
})();
