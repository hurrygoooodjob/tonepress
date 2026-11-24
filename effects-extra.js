(function () {
  "use strict";

  const kinds = Object.freeze({ thermal: 0, crt: 1, vhs: 2, glitch: 3, hatch: 4, contour: 5, prism: 6 });
  const engines = new WeakMap();
  const heatStops = [
    [0.025, 0.035, 0.125], [0.115, 0.135, 0.455], [0.425, 0.07, 0.58],
    [0.825, 0.125, 0.32], [0.99, 0.39, 0.105], [1, 0.77, 0.16], [1, 0.98, 0.76]
  ];

  const vertex = `#version 300 es
    out vec2 uv;
    void main() {
      vec2 point = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      uv = vec2(point.x, 1.0 - point.y);
      gl_Position = vec4(point * 2.0 - 1.0, 0.0, 1.0);
    }
  `;

  const fragment = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec4 pixel;
    uniform sampler2D artwork;
    uniform vec2 sourceSize;
    uniform float size;
    uniform float strength;
    uniform float mediaTime;
    uniform int kind;
    const float PI2 = 6.28318530718;
    const vec3 weights = vec3(0.2126, 0.7152, 0.0722);
    const vec3 heatStops[7] = vec3[7](${heatStops.map((stop) =>
      "vec3(" + stop.map((component) => component.toFixed(3)).join(", ") + ")"
    ).join(", ")});

    float luma(vec3 color) { return dot(color, weights); }
    vec3 sampleOffset(vec2 offset) { return texture(artwork, uv + offset / sourceSize).rgb; }

    float bufferedTone(vec3 base, float distance) {
      vec2 step = vec2(distance, 0.0);
      return luma(base) * 0.4
        + 0.15 * luma(sampleOffset(step.xy) + sampleOffset(-step.xy)
                     + sampleOffset(step.yx) + sampleOffset(-step.yx));
    }

    float hash(vec2 point) {
      vec3 cell = fract(vec3(point.xyx) * 0.1031);
      cell += dot(cell, cell.yzx + 33.33);
      return fract((cell.x + cell.y) * cell.z);
    }

    vec3 thermal(vec3 base) {
      float reading = bufferedTone(base, size * 0.43);
      float heat = pow(clamp(reading, 0.0, 1.0), 0.88) * 5.9999;
      int band = int(floor(heat));
      return mix(heatStops[band], heatStops[band + 1], fract(heat));
    }

    vec3 crt(vec3 base, vec2 point) {
      float pitch = 1.2 + size * 0.77;
      vec2 phase = point / pitch;
      vec2 footprint = fwidth(phase);
      float scan = 0.5 + 0.5 * cos(phase.y * PI2);
      float visible = 1.0 - smoothstep(0.30, 0.88, footprint.y);
      vec3 phosphor = 0.5 + 0.5 * cos((phase.x + vec3(0.0, -0.3333, -0.6667)) * PI2);
      float mask = 1.0 - smoothstep(0.32, 0.92, footprint.x);
      float vignette = 1.0 - 0.23 * min(1.0, dot(uv - 0.5, uv - 0.5) * 2.45);
      vec3 bleed = sampleOffset(vec2(pitch * 0.5, 0.0));
      return ((base * 0.93 + bleed * 0.11 + vec3(0.025))
        * mix(1.0, 0.55 + scan * 0.56, visible)
        * mix(vec3(1.0), 0.69 + 0.49 * phosphor, mask)) * vignette;
    }

    vec3 vhs(vec2 point) {
      float row = floor(point.y / (1.0 + size * 0.23));
      float frame = floor(mediaTime * 24.0);
      float wobble = sin(row * 0.17 + mediaTime * 5.1) * 0.65
        + sin(row * 0.038 - mediaTime * 3.0) * 0.35;
      float head = 1.0 - smoothstep(0.0, 0.025, abs(uv.y - (0.907 + sin(mediaTime * 1.9) * 0.05)));
      float shift = wobble * size * 0.42 + head * (hash(vec2(row, frame)) - 0.5) * size * 3.8;
      vec3 signal = sampleOffset(vec2(shift, 0.0));
      float trail = size * 0.75;
      vec3 bleed = signal * 0.36
        + sampleOffset(vec2(shift - trail, 0.0)) * 0.31
        + sampleOffset(vec2(shift - trail * 2.4, 0.0)) * 0.22
        + sampleOffset(vec2(shift + trail * 0.55, 0.0)) * 0.11;
      float grain = (hash(floor(point / vec2(1.4, 1.0)) + vec2(frame * 11.0, frame * 2.0)) - 0.5)
        * (0.082 + head * 0.18);
      float scan = sin(point.y * 2.1 + mediaTime * 2.7) * (0.008 + head * 0.02);
      return vec3(luma(signal) * 0.91 + 0.047 + grain + scan)
        + (bleed - luma(bleed)) * 0.87 + vec3(0.012, -0.005, 0.004);
    }

    vec3 glitch(vec2 point) {
      float slice = floor(point.y / (2.0 + size * 2.25));
      float frame = floor(mediaTime * 7.0);
      float trigger = hash(vec2(slice, frame + 8.0));
      float jump = hash(vec2(slice + 48.0, frame));
      float shift = (jump - 0.5) * size * 6.8 * step(0.66, trigger);
      float fringe = size * (0.37 + step(0.81, trigger) * 1.25);
      vec3 color = vec3(sampleOffset(vec2(shift - fringe, 0.0)).r,
                        sampleOffset(vec2(shift, 0.0)).g,
                        sampleOffset(vec2(shift + fringe, 0.0)).b);
      float block = hash(vec2(floor(point.x / (3.5 * size)) + frame, slice + 9.0));
      float dropout = step(0.86, trigger) * step(0.77, block) * 0.42;
      return mix(color, vec3(0.95 - color.b * 0.6, color.g * 0.46, 0.78), dropout);
    }

    float ruledLine(float projection, float pitch, float thickness) {
      float distance = abs(fract(projection / pitch + 0.5) - 0.5) * pitch;
      float footprint = max(0.32, fwidth(projection) * 0.48);
      float visible = 1.0 - smoothstep(0.27, 1.15, footprint / pitch);
      return (1.0 - smoothstep(max(0.0, thickness - footprint), thickness + footprint, distance)) * visible;
    }

    vec3 hatch(vec3 base, vec2 point) {
      float pitch = 1.8 + size * 0.76;
      float tone = pow(1.0 - luma(base), 0.78);
      float thickness = 0.26 + tone * 0.43;
      float diagonal = ruledLine((point.x + point.y) * 0.7071, pitch, thickness)
        * smoothstep(0.12, 0.39, tone);
      float cross = ruledLine((point.x - point.y) * 0.7071 + pitch * 0.28, pitch * 1.03, thickness)
        * smoothstep(0.37, 0.68, tone);
      float vertical = ruledLine(point.x + pitch * 0.36, pitch * 0.74, thickness)
        * smoothstep(0.65, 0.89, tone);
      vec3 paper = mix(vec3(0.985, 0.956, 0.882), base, 0.22 + tone * 0.14);
      float ink = 1.0 - (1.0 - diagonal * 0.88) * (1.0 - cross * 0.82) * (1.0 - vertical * 0.88);
      return mix(paper, vec3(0.075, 0.112, 0.108), ink);
    }

    vec3 contour(vec3 base) {
      float elevation = 0.6 * bufferedTone(base, size * 0.68) + 0.4 * bufferedTone(base, size * 1.35);
      float levels = mix(30.0, 7.0, (size - 2.0) / 14.0);
      float distance = abs(fract(elevation * levels + 0.5) - 0.5);
      float gradient = fwidth(elevation);
      float width = min(0.36, max(0.012, gradient * levels * 0.69));
      float visible = smoothstep(0.00006, 0.0021, gradient);
      float line = (1.0 - smoothstep(width * 0.43, width * 1.31, distance)) * visible;
      float banded = floor(elevation * levels + 0.5) / levels;
      vec3 paper = mix(vec3(0.94, 0.95, 0.84), vec3(0.60, 0.79, 0.70), 1.0 - banded);
      return mix(mix(paper, base, 0.31), vec3(0.047, 0.22, 0.22), line * 0.96);
    }

    vec3 prism(vec3 base) {
      vec2 radial = (uv - 0.5) * 2.0;
      float radius = min(1.45, length(radial));
      vec2 direction = radial + vec2(0.25, -0.12);
      vec2 delta = direction * size * (0.42 + radius * radius * 0.82);
      vec3 warm = sampleOffset(delta);
      vec3 cool = sampleOffset(-delta * 1.13);
      vec3 spectrum = vec3(warm.r, sampleOffset(delta * 0.08).g, cool.b);
      float refraction = max(abs(luma(warm) - luma(base)), abs(luma(cool) - luma(base)));
      vec3 halo = vec3(0.22, 0.075, 0.27) * refraction * (0.45 + radius * 0.55);
      return mix(base, spectrum, 0.82) + halo;
    }

    void main() {
      vec4 base = texture(artwork, uv);
      vec2 point = uv * sourceSize;
      vec3 processed = base.rgb;
      if (kind == 0) processed = thermal(base.rgb);
      else if (kind == 1) processed = crt(base.rgb, point);
      else if (kind == 2) processed = vhs(point);
      else if (kind == 3) processed = glitch(point);
      else if (kind == 4) processed = hatch(base.rgb, point);
      else if (kind == 5) processed = contour(base.rgb);
      else if (kind == 6) processed = prism(base.rgb);
      pixel = vec4(mix(base.rgb, clamp(processed, 0.0, 1.0), strength), base.a);
    }
  `;

  function compile(gl, kind, text) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "Could not compile Tonepress effect shader.");
  }

  function createEngine(document) {
    const surface = document.createElement("canvas");
    const gl = surface.getContext("webgl2", {
      alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false
    });
    if (!gl) return null;
    const v = compile(gl, gl.VERTEX_SHADER, vertex);
    const f = compile(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    gl.attachShader(program, v);
    gl.attachShader(program, f);
    gl.linkProgram(program);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Could not link Tonepress effect shader.");
    }
    gl.useProgram(program);
    const uniforms = Object.fromEntries(["artwork", "sourceSize", "size", "strength", "mediaTime", "kind"]
      .map((name) => [name, gl.getUniformLocation(program, name)]));
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.artwork, 0);
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    let lastWidth = 0;
    let lastHeight = 0;
    surface.addEventListener("webglcontextlost", (event) => event.preventDefault());
    surface.addEventListener("webglcontextrestored", () => engines.delete(document));

    return {
      render(input, width, height, settings) {
        if (gl.isContextLost() || input.width > maxTexture || input.height > maxTexture ||
            width > viewport[0] || height > viewport[1]) return null;
        if (surface.width !== width) surface.width = width;
        if (surface.height !== height) surface.height = height;
        if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) return null;
        gl.viewport(0, 0, width, height);
        if (lastWidth !== input.width || lastHeight !== input.height) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, input);
          if (gl.getError() !== gl.NO_ERROR) return null;
          lastWidth = input.width;
          lastHeight = input.height;
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, input);
        }
        gl.uniform2f(uniforms.sourceSize, settings.sourceWidth, settings.sourceHeight);
        gl.uniform1f(uniforms.size, settings.size);
        gl.uniform1f(uniforms.strength, settings.amount);
        gl.uniform1f(uniforms.mediaTime, settings.time);
        gl.uniform1i(uniforms.kind, settings.kind);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return surface;
      }
    };
  }

  function copy(context, input, width, height) {
    context.save();
    context.resetTransform();
    context.globalAlpha = 1;
    context.globalCompositeOperation = "copy";
    context.filter = "none";
    context.drawImage(input, 0, 0, width, height);
    context.restore();
  }

  const clamp = (number, min = 0, max = 1) => Math.min(max, Math.max(min, number));
  const frac = (number) => number - Math.floor(number);
  const mix = (a, b, amount) => a + (b - a) * amount;
  const PI2 = Math.PI * 2;
  const luma = (r, g, b) => r * 0.2126 + g * 0.7152 + b * 0.0722;
  const smooth = (min, max, value) => {
    const t = clamp((value - min) / (max - min));
    return t * t * (3 - 2 * t);
  };
  function hash(x, y) {
    const a = frac(x * 0.1031), b = frac(y * 0.1031);
    const blend = (a + b) * (a + 33.33) + a * (b + 33.33);
    return frac((a + b + blend * 2) * (a + blend));
  }

  function software(context, width, height, settings) {
    const { kind, size, sourceWidth, sourceHeight, amount, time } = settings;
    const image = context.getImageData(0, 0, width, height);
    const source = image.data;
    const result = context.createImageData(width, height);
    const output = result.data;
    const sx = sourceWidth / width, sy = sourceHeight / height;
    const frame = Math.floor(time * (kind === kinds.vhs ? 24 : 7));
    const levels = mix(30, 7, (size - 2) / 14);
    const pitch = kind === kinds.crt ? 1.2 + size * 0.77 : 1.8 + size * 0.76;
    const srgb = 1 / 255;
    const index = (x, y) => (clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4;
    const tone = kind === kinds.thermal || kind === kinds.contour ? new Float32Array(width * height) : null;
    if (tone) {
      for (let i = 0; i < tone.length; i++) {
        tone[i] = luma(source[i * 4], source[i * 4 + 1], source[i * 4 + 2]) * srgb;
      }
    }
    const toneAt = (x, y) => tone[clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)];
    function sampling(distance) {
      const rx = distance / sx, ry = distance / sy;
      const x0 = Math.floor(rx), y0 = Math.floor(ry);
      const fx = frac(rx), fy = frac(ry);
      return (x, y) => toneAt(x, y) * 0.4 + 0.15 * (
        mix(toneAt(x - x0, y), toneAt(x - x0 - 1, y), fx)
        + mix(toneAt(x + x0, y), toneAt(x + x0 + 1, y), fx)
        + mix(toneAt(x, y - y0), toneAt(x, y - y0 - 1), fy)
        + mix(toneAt(x, y + y0), toneAt(x, y + y0 + 1), fy)
      );
    }
    const heat = kind === kinds.thermal ? sampling(size * 0.43) : null;
    const stripe = (position, spacing, thickness, pixelWidth) => {
      const distance = Math.abs(frac(position / spacing + 0.5) - 0.5) * spacing;
      const edge = Math.max(0.32, 0.48 * pixelWidth);
      return (1 - smooth(Math.max(0, thickness - edge), thickness + edge, distance))
        * (1 - smooth(0.27, 1.15, edge / spacing));
    };
    const elevation = kind === kinds.contour ? new Float32Array(width * height) : null;
    if (elevation) {
      const near = sampling(size * 0.68), far = sampling(size * 1.35);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          elevation[y * width + x] = near(x, y) * 0.6 + far(x, y) * 0.4;
        }
      }
    }

    for (let y = 0; y < height; y++) {
      const py = (y + 0.5) * sy;
      const v = (y + 0.5) / height;
      const slice = Math.floor(py / (2 + size * 2.25));
      const trigger = hash(slice, frame + 8);
      const jump = hash(slice + 48, frame);
      const glitchShift = trigger >= 0.66 ? (jump - 0.5) * size * 6.8 : 0;
      const fringe = size * (0.37 + (trigger >= 0.81 ? 1.25 : 0));
      const analogRow = Math.floor(py / (1 + size * 0.23));
      const head = 1 - smooth(0, 0.025, Math.abs(v - (0.907 + Math.sin(time * 1.9) * 0.05)));
      const wobble = Math.sin(analogRow * 0.17 + time * 5.1) * 0.65 + Math.sin(analogRow * 0.038 - time * 3) * 0.35;
      const shift = wobble * size * 0.42 + head * (hash(analogRow, frame) - 0.5) * size * 3.8;
      const scan = mix(1, 0.55 + (0.5 + 0.5 * Math.cos(py / pitch * PI2)) * 0.56, 1 - smooth(0.30, 0.88, sy / pitch));

      for (let x = 0; x < width; x++) {
        const px = (x + 0.5) * sx;
        const i = (y * width + x) * 4;
        const r = source[i] * srgb, g = source[i + 1] * srgb, b = source[i + 2] * srgb;
        output[i + 3] = source[i + 3];
        if (!source[i + 3]) continue;
        let rr, gg, bb;
        if (kind === kinds.thermal) {
          const ramp = 5.9999 * Math.pow(clamp(heat(x, y)), 0.88);
          const low = heatStops[Math.floor(ramp)], high = heatStops[Math.floor(ramp) + 1];
          rr = mix(low[0], high[0], frac(ramp));
          gg = mix(low[1], high[1], frac(ramp));
          bb = mix(low[2], high[2], frac(ramp));
        } else if (kind === kinds.crt) {
          const phase = px / pitch;
          const mask = 1 - smooth(0.32, 0.92, sx / pitch);
          const vignette = 1 - 0.23 * Math.min(1, 2.45 * (((x + 0.5) / width - 0.5) ** 2 + (v - 0.5) ** 2));
          const offset = index(x + Math.round(pitch * 0.5 / sx), y);
          const phosphor = (phase) => 1 + mask * (-0.065 + 0.245 * Math.cos(PI2 * phase));
          rr = (r * 0.93 + source[offset] * srgb * 0.11 + 0.025) * scan * phosphor(phase) * vignette;
          gg = (g * 0.93 + source[offset + 1] * srgb * 0.11 + 0.025) * scan * phosphor(phase - 0.3333) * vignette;
          bb = (b * 0.93 + source[offset + 2] * srgb * 0.11 + 0.025) * scan * phosphor(phase - 0.6667) * vignette;
        } else if (kind === kinds.vhs) {
          const a = index(x + Math.round(shift / sx), y);
          const c = index(x + Math.round((shift - size * 0.75) / sx), y);
          const d = index(x + Math.round((shift - size * 1.8) / sx), y);
          const e = index(x + Math.round((shift + size * 0.4125) / sx), y);
          const red = (source[a] * 0.36 + source[c] * 0.31 + source[d] * 0.22 + source[e] * 0.11) * srgb;
          const green = (source[a + 1] * 0.36 + source[c + 1] * 0.31 + source[d + 1] * 0.22 + source[e + 1] * 0.11) * srgb;
          const blue = (source[a + 2] * 0.36 + source[c + 2] * 0.31 + source[d + 2] * 0.22 + source[e + 2] * 0.11) * srgb;
          const grain = (hash(Math.floor(px / 1.4) + frame * 11, Math.floor(py) + frame * 2) - 0.5) * (0.082 + head * 0.18);
          const line = Math.sin(py * 2.1 + time * 2.7) * (0.008 + head * 0.02);
          const brightness = luma(source[a], source[a + 1], source[a + 2]) * srgb * 0.91 + 0.047 + grain + line;
          const chromaTone = luma(red, green, blue);
          rr = brightness + (red - chromaTone) * 0.87 + 0.012;
          gg = brightness + (green - chromaTone) * 0.87 - 0.005;
          bb = brightness + (blue - chromaTone) * 0.87 + 0.004;
        } else if (kind === kinds.glitch) {
          rr = source[index(x + Math.round((glitchShift - fringe) / sx), y)] * srgb;
          gg = source[index(x + Math.round(glitchShift / sx), y) + 1] * srgb;
          bb = source[index(x + Math.round((glitchShift + fringe) / sx), y) + 2] * srgb;
          const block = hash(Math.floor(px / (size * 3.5)) + frame, slice + 9);
          if (trigger >= 0.86 && block >= 0.77) {
            rr = mix(rr, 0.95 - bb * 0.6, 0.42);
            gg *= 0.7732;
            bb = mix(bb, 0.78, 0.42);
          }
        } else if (kind === kinds.hatch) {
          const tone = Math.pow(1 - luma(r, g, b), 0.78);
          const thickness = 0.26 + tone * 0.43;
          const span = (sx + sy) * Math.SQRT1_2;
          const a = stripe((px + py) * Math.SQRT1_2, pitch, thickness, span) * smooth(0.12, 0.39, tone);
          const c = stripe((px - py) * Math.SQRT1_2 + pitch * 0.28, pitch * 1.03, thickness, span) * smooth(0.37, 0.68, tone);
          const d = stripe(px + pitch * 0.36, pitch * 0.74, thickness, sx) * smooth(0.65, 0.89, tone);
          const ink = 1 - (1 - a * 0.88) * (1 - c * 0.82) * (1 - d * 0.88);
          const background = 0.22 + tone * 0.14;
          rr = mix(mix(0.985, r, background), 0.075, ink);
          gg = mix(mix(0.956, g, background), 0.112, ink);
          bb = mix(mix(0.882, b, background), 0.108, ink);
        } else if (kind === kinds.contour) {
          const center = elevation[y * width + x];
          const horizontal = elevation[y * width + Math.min(width - 1, x + 1)] - elevation[y * width + Math.max(0, x - 1)];
          const vertical = elevation[Math.min(height - 1, y + 1) * width + x] - elevation[Math.max(0, y - 1) * width + x];
          const gradient = (Math.abs(horizontal) + Math.abs(vertical)) * 0.5;
          const distance = Math.abs(frac(center * levels + 0.5) - 0.5);
          const stroke = clamp(gradient * levels * 0.69, 0.012, 0.36);
          const line = (1 - smooth(stroke * 0.43, stroke * 1.31, distance)) * smooth(0.00006, 0.0021, gradient) * 0.96;
          const band = 1 - Math.floor(center * levels + 0.5) / levels;
          rr = mix(mix(mix(0.94, 0.60, band), r, 0.31), 0.047, line);
          gg = mix(mix(mix(0.95, 0.79, band), g, 0.31), 0.22, line);
          bb = mix(mix(mix(0.84, 0.70, band), b, 0.31), 0.22, line);
        } else {
          const radialX = ((x + 0.5) / width - 0.5) * 2, radialY = (v - 0.5) * 2;
          const radius = Math.min(1.45, Math.hypot(radialX, radialY));
          const spread = size * (0.42 + radius * radius * 0.82);
          const dx = spread * (radialX + 0.25) / sx, dy = spread * (radialY - 0.12) / sy;
          const warm = index(x + Math.round(dx), y + Math.round(dy));
          const cool = index(x - Math.round(dx * 1.13), y - Math.round(dy * 1.13));
          const neutral = index(x + Math.round(dx * 0.08), y + Math.round(dy * 0.08));
          const halo = Math.max(Math.abs(luma(source[warm], source[warm + 1], source[warm + 2]) * srgb - luma(r, g, b)),
            Math.abs(luma(source[cool], source[cool + 1], source[cool + 2]) * srgb - luma(r, g, b))) * (0.45 + radius * 0.55);
          rr = mix(r, source[warm] * srgb, 0.82) + 0.22 * halo;
          gg = mix(g, source[neutral + 1] * srgb, 0.82) + 0.075 * halo;
          bb = mix(b, source[cool + 2] * srgb, 0.82) + 0.27 * halo;
        }
        output[i] = mix(r, clamp(rr), amount) * 255;
        output[i + 1] = mix(g, clamp(gg), amount) * 255;
        output[i + 2] = mix(b, clamp(bb), amount) * 255;
      }
    }
    context.putImageData(result, 0, 0);
  }

  function draw(input, output, options) {
    const { type, size, strength, sourceWidth, sourceHeight, time } = options;
    if (!Object.hasOwn(kinds, type)) return false;
    const ctx = output.getContext("2d");
    const { width, height } = output;
    const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
    const settings = {
      kind: kinds[type], size: clamp(number(size, 6), 2, 16),
      amount: clamp(number(strength, 0), 0, 100) / 100,
      sourceWidth: Math.max(1, number(sourceWidth, input.width)),
      sourceHeight: Math.max(1, number(sourceHeight, input.height)),
      time: Math.max(0, number(time, 0))
    };
    if (!settings.amount) {
      copy(ctx, input, width, height);
      return true;
    }

    const document = output.ownerDocument;
    if (!engines.has(document)) {
      try { engines.set(document, createEngine(document)); }
      catch { engines.set(document, null); }
    }
    const gpu = engines.get(document);
    const surface = gpu?.render(input, width, height, settings);
    copy(ctx, surface || input, width, height);
    if (!surface) software(ctx, width, height, settings);
    return true;
  }

  window.TonepressExtras = { draw };
}());
