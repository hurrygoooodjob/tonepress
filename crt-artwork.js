(() => {
  "use strict";

  const width = 960;
  const height = 540;
  const photoBox = {x: 48, y: 33, width: 864, height: 316};
  const columns = 288;
  const rows = 106;
  const thresholds = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const phosphors = ["#206e47", "#5bbd7d", "#b8ffcf"];
  const dotWidths = [1.45, 2.25, 2.95];
  let texture;

  function sourceLuminance(photo) {
    const sample = document.createElement("canvas");
    sample.width = columns;
    sample.height = rows;
    const ctx = sample.getContext("2d", {willReadFrequently: true});
    const {naturalWidth, naturalHeight} = photo;
    const scale = Math.max(photoBox.width / naturalWidth, photoBox.height / naturalHeight);
    const cropWidth = photoBox.width / scale;
    const cropHeight = photoBox.height / scale;
    const x = (naturalWidth - cropWidth) / 2;
    const y = (naturalHeight - cropHeight) * .3;
    ctx.drawImage(photo, x, y, cropWidth, cropHeight, 0, 0, columns, rows);
    try {
      return ctx.getImageData(0, 0, columns, rows).data;
    } catch {
      return null;
    }
  }

  function calibrationField(x, y) {
    const u = x / columns;
    const v = y / rows;
    const ridge = .36 + .1 * Math.sin(9 * u + .9) + .055 * Math.sin(20 * u + .2);
    const channel = Math.sin(u * 23 + v * 13) * .05;
    return (v > ridge ? .24 + .19 * (v - ridge) + channel : .12 + u * .26) +
      .19 * Math.max(0, 1 - Math.abs(u - .57) * 4 - v * .88);
  }

  function halftone(ctx, photo) {
    const image = photo && sourceLuminance(photo);
    const levels = new Uint8Array(columns * rows);
    const cellWidth = photoBox.width / columns;
    const cellHeight = photoBox.height / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const index = y * columns + x;
        const pixel = index * 4;
        const brightness = image
          ? (.2126 * image[pixel] + .7152 * image[pixel + 1] + .0722 * image[pixel + 2]) / 255
          : calibrationField(x, y);
        const edgeReserve = .86 + .14 * Math.min(1, y / 17);
        const exposure = Math.min(1, Math.max(0, (brightness - .04) * 1.13 * edgeReserve));
        const pattern = (thresholds[(y % 4) * 4 + x % 4] + .5) / 16;
        levels[index] = Math.floor(Math.pow(exposure, .91) * 3 + pattern);
      }
    }

    ctx.fillStyle = "#081a10";
    ctx.fillRect(photoBox.x, photoBox.y, photoBox.width, photoBox.height);
    for (let channel = 0; channel < phosphors.length; channel++) {
      ctx.fillStyle = phosphors[channel];
      const diameter = dotWidths[channel];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          if (levels[y * columns + x] !== channel + 1) continue;
          const left = photoBox.x + x * cellWidth + (cellWidth - diameter) / 2;
          const top = photoBox.y + y * cellHeight + (cellHeight - diameter) / 2;
          ctx.fillRect(left, top, diameter, diameter);
        }
      }
    }
  }

  function inkBand(ctx) {
    const band = ctx.createLinearGradient(0, 349, 0, 503);
    band.addColorStop(0, "#0c2719");
    band.addColorStop(.34, "#081c12");
    band.addColorStop(1, "#040f0a");
    ctx.fillStyle = band;
    ctx.fillRect(48, 350, 864, 152);
    ctx.fillStyle = "#93f3ad";
    ctx.globalAlpha = .37;
    for (let x = 50; x < 912; x += 6) {
      ctx.fillRect(x, 356, 2, x % 24 === 2 ? 5 : 2);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    const text = "TONEPRESS";
    ctx.font = "900 136px Helvetica Neue, Arial Black, Arial, sans-serif";
    const scale = 819 / ctx.measureText(text).width;
    ctx.translate(71, 466);
    ctx.scale(scale, 1);
    ctx.fillStyle = "#c4ffda";
    ctx.shadowBlur = 9;
    ctx.shadowColor = "#87ffb386";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function register(ctx) {
    ctx.strokeStyle = "#82e8a675";
    ctx.lineWidth = 1;
    ctx.strokeRect(47.5, 32.5, 865, 469);
    ctx.strokeStyle = "#bbffd4";
    ctx.lineWidth = 1.6;
    for (const [x, y, dx, dy] of [[48, 33, 1, 1], [912, 33, -1, 1], [48, 502, 1, -1], [912, 502, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 11);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 13, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#5bcb8799";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, 487.5);
    ctx.lineTo(890, 487.5);
    ctx.stroke();
    for (let step = 0; step < 10; step++) {
      ctx.globalAlpha = .22 + step * .078;
      ctx.fillStyle = "#a4f9c2";
      ctx.fillRect(72 + step * 8, 481, 4, 6);
    }
    ctx.globalAlpha = 1;
  }

  function scanlinesAndEdges(ctx) {
    ctx.fillStyle = "#00170827";
    for (let y = 1; y < height; y += 4) ctx.fillRect(0, y, width, 1);
    const vignette = ctx.createRadialGradient(width * .5, height * .45, height * .16, width * .5, height * .48, width * .57);
    vignette.addColorStop(0, "#04120900");
    vignette.addColorStop(.66, "#04120905");
    vignette.addColorStop(1, "#01090683");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(photo) {
    const ctx = texture.getContext("2d", {alpha: false});
    ctx.fillStyle = "#05120b";
    ctx.fillRect(0, 0, width, height);
    halftone(ctx, photo);
    inkBand(ctx);
    register(ctx);
    scanlinesAndEdges(ctx);
  }

  function make() {
    if (texture) return texture;
    texture = document.createElement("canvas");
    texture.width = width;
    texture.height = height;
    draw(null);

    const photo = new Image();
    photo.addEventListener("load", () => {
      draw(photo);
      document.dispatchEvent(new Event("tonepress:tube-art"));
    }, {once: true});
    photo.src = window.TONEPRESS_SAMPLE || "assets/coast.jpg";
    return texture;
  }

  window.TonepressTubeArtwork = {make};
})();
