(() => {
  'use strict';

  const {t} = window.TonepressI18n;
  let lastMessage = null;
  let recordingProgress = null;
  const el = id => document.getElementById(id);
  const ui = Object.fromEntries([
    'file', 'importBtn', 'sampleBtn', 'sampleLabel', 'sampleGlyph', 'size', 'strength', 'sizeValue', 'strengthValue', 'reset', 'exportBtn',
    'exportLabel', 'exportNote', 'feedback', 'retrySave', 'cancel', 'progress', 'progressBar', 'stage', 'frame',
    'original', 'effect', 'divider', 'ratio', 'fit', 'detail', 'mediaBin', 'fileName', 'dimensions',
    'kind', 'transport', 'play', 'playGlyph', 'timeline', 'clock', 'mute', 'volumeGlyph',
    'frameExport', 'loopExport', 'repeat', 'dropNotice', 'sourceCredit', 'modeHint',
    'compareMode', 'holdOriginal', 'exportMenu'
  ].map(id => [id, el(id)]));
  const state = {source: null, file: null, url: null, kind: '', name: '', width: 0, height: 0, duration: 0,
    split: 50, comparison: false, holdingOriginal: false, detail: false, loading: 0, importing: false, busy: false, renderRequest: 0, frameRequest: 0,
    frameSource: null, download: null, abort: null, audioMuted: false, photoTime: 0, photoPlaying: false, photoRequest: 0, repeat: false, timed: false};
  const painter = TonepressStack.create(ui.effect);
  // The candidate renderer has its own motion history; auditioning never consumes the committed history.
  let trialPainter;
  let audition = null;
  let returnHistory = null;
  let thumbnailTime = null;
  let committedKey = '';
  const editor = TonepressWorkspace.create(onLookChanged, message);
  const originalPainter = TonepressRenderer.create(ui.original);
  const signal = el('signalSample');
  const signalContext = signal?.getContext('2d', {willReadFrequently:true});
  // The instrument reads the unprocessed frame. Its phosphor colours never enter the effect stack.
  const ditherMatrix = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  let signalSource = null;
  let signalTime = -1;
  const icon = (id, name) => id.setAttribute('href', '#' + name);
  const formatTime = seconds => {
    const whole = Math.max(0, Math.floor(seconds || 0));
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0') + '.' + String(Math.floor(((seconds || 0) % 1) * 100 + .000001)).padStart(2, '0');
  };

  function message(source, error = false, values = {}) {
    lastMessage = {source, error, values};
    const localizedValues = values.reason ? {...values, reason: t(values.reason)} : values;
    const text = t(source, localizedValues);
    ui.feedback.textContent = text;
    ui.feedback.classList.toggle('error', error);
    ui.feedback.hidden = !text;
  }
  function clearDownload() {
    if (state.download) URL.revokeObjectURL(state.download);
    state.download = null;
    ui.retrySave.hidden = true;
    ui.retrySave.removeAttribute('href');
  }
  function paintComparison() {
    const percent = state.holdingOriginal ? 100 : state.comparison ? state.split : 0;
    ui.frame.style.setProperty('--split', percent + '%');
    ui.frame.classList.toggle('comparison-on', state.comparison);
    ui.frame.classList.toggle('holding-original', state.holdingOriginal);
    ui.frame.classList.toggle('no-left', percent < 13);
    ui.frame.classList.toggle('no-right', percent > 87);
    ui.divider.hidden = !state.comparison || state.holdingOriginal;
    ui.divider.value = String(Math.round(percent));
    ui.divider.setAttribute('aria-valuetext', t('原片占 {n}%', {n: Math.round(percent)}));
    ui.ratio.textContent = Math.round(percent) + ' / ' + (100 - Math.round(percent));
    ui.holdOriginal.setAttribute('aria-pressed', String(state.holdingOriginal));
    ui.compareMode.setAttribute('aria-pressed', String(state.comparison));
  }
  function updateSplit(value) {
    state.split = Math.max(0, Math.min(100, Number(value)));
    paintComparison();
  }
  function holdOriginal(held) {
    state.holdingOriginal = held;
    paintComparison();
  }
  const PHOTO_DURATION = 4;
  function currentTime() {
    return state.kind === 'video' ? state.source.currentTime : state.photoTime;
  }
  function visibleTimed() {
    if (!editor.previewing) return editor.timed;
    const recipe = editor.previewSettings;
    if (!recipe) return false;
    return recipe.motion === 'breathe' || recipe.layers.some(layer =>
      layer.enabled && layer.strength > 0 &&
      (TonepressLooks.effects[layer.type]?.timed || ['glitch','vhs'].includes(layer.type)));
  }
  function updateTimeline() {
    if (!state.source) return;
    const video = state.kind === 'video';
    const recipe=editor.previewing ? editor.previewSettings : editor.settings;
    const types=recipe.layers.filter(layer=>layer.enabled && layer.strength>0).map(layer=>layer.type);
    const needsFrames=types.some(id=>['mosh-data-mosh','mosh-optical-flow','mosh-slit-scan'].includes(id));
    const needsAudio=types.includes('mosh-audio-visualizer');
    const hint=needsAudio && (!video || (state.sample && state.sample!=='motion') || !state.file || state.file.size>96*1024*1024) ? '请导入带声音的视频查看频谱。'
      : needsFrames && !video ? '这个效果需要连续视频帧。'
      : needsFrames && state.source.paused ? '播放视频，查看连续帧产生的效果。' : '';
    const cue=el('motionCue'),label=hint ? t(hint) : '';
    if(cue.firstElementChild.textContent!==label)cue.firstElementChild.textContent=label;
    const example=el('motionExample');example.hidden=video || !needsFrames || needsAudio;
    if(!example.hidden){
      const address=new URL(location.href);address.search='';address.hash='';address.searchParams.set('mosh','');address.searchParams.set('sample','motion');
      address.searchParams.set('effect',types.find(id=>['mosh-data-mosh','mosh-optical-flow','mosh-slit-scan'].includes(id)));example.href=address.href;
    }
    cue.hidden=!hint;
    const duration = video ? state.duration : PHOTO_DURATION;
    ui.transport.hidden = !video && !visibleTimed();
    ui.mute.hidden = !video;
    ui.timeline.max = String(duration);
    ui.timeline.value = String(currentTime());
    ui.timeline.style.setProperty('--fill', (100 * currentTime() / duration || 0) + '%');
    ui.clock.textContent = formatTime(currentTime()) + ' / ' + formatTime(duration);
    const paused = video ? (state.source.paused || state.source.ended) : !state.photoPlaying;
    icon(ui.playGlyph, paused ? 'i-play' : 'i-pause');
    ui.play.setAttribute('aria-label', t(paused ? '播放' : '暂停'));
    ui.play.title = ui.play.getAttribute('aria-label');
    ui.repeat.setAttribute('aria-pressed', String(state.repeat));
    if (video) {
      icon(ui.volumeGlyph, state.source.muted ? 'i-muted' : 'i-sound');
      ui.mute.setAttribute('aria-label', t(state.source.muted ? '打开声音' : '静音'));
    }
  }
  function pausePhoto() {
    state.photoPlaying = false;
    cancelAnimationFrame(state.photoRequest);
  }
  function playPhoto() {
    if (!visibleTimed() || state.kind !== 'photo') return;
    if (state.photoTime >= PHOTO_DURATION) state.photoTime = 0;
    state.photoPlaying = true;
    const start = performance.now() - state.photoTime * 1000;
    let previous = -100;
    function tick(now) {
      if (!state.photoPlaying) return;
      const elapsed = (now-start)/1000;
      state.photoTime = state.repeat ? elapsed % PHOTO_DURATION : Math.min(PHOTO_DURATION, elapsed);
      if (now-previous >= 1000/30 || state.photoTime >= PHOTO_DURATION) {
        previous=now; schedule(); updateTimeline();
      }
      if (!state.repeat && state.photoTime >= PHOTO_DURATION) {
        pausePhoto(); updateTimeline();
      } else state.photoRequest=requestAnimationFrame(tick);
    }
    state.photoRequest=requestAnimationFrame(tick);
    updateTimeline();
  }
  function pauseMedia() {
    if (state.kind === 'video') { state.source.pause(); stopFrames(); }
    else pausePhoto();
  }
  function releaseTrialVideo(trial) {
    if (!trial.copy) return;
    stopFrames();
    state.source = trial.source;
    state.source.muted = state.audioMuted;
    state.source.loop = state.repeat;
    const copy = trial.copy;
    trial.copy = null;
    unload(copy);
    thumbnailTime = null;
    editor.sampleSource(state.source, state.width, state.height);
  }
  // Keep the original decoder on the exact displayed frame. Seeking back to its time
  // in a different GOP can otherwise choose an adjacent frame and alter tracking.
  function moveTrialVideo(action, time) {
    const trial = audition;
    if (!trial || state.kind !== 'video') return false;
    if (trial.copy && state.source === trial.copy) return false;
    if (action === 'seek') trial.seek = time;
    if (action === 'play') trial.wantsPlay = !trial.wantsPlay;
    if (trial.copy) return true;
    const copy = document.createElement('video');
    trial.copy = copy;
    copy.playsInline = true;
    copy.preload = 'auto';
    ui.mediaBin.prepend(copy);
    copy.addEventListener('loadeddata', () => {
      if (audition !== trial || trial.copy !== copy) return;
      state.source = copy;
      copy.loop = state.repeat;
      copy.muted = state.audioMuted;
      bindVideo(copy);
      copy.currentTime = trial.seek ?? trial.time;
      if (trial.wantsPlay) copy.play().catch(() => updateTimeline());
      updateTimeline();
      schedule();
    }, {once:true});
    copy.addEventListener('error', () => {
      if (audition !== trial || trial.copy !== copy) return;
      releaseTrialVideo(trial);
      message('此段视频暂时无法播放试样，仍可在当前帧比较。', true);
    }, {once:true});
    copy.src = trial.source.currentSrc || trial.source.src;
    return true;
  }
  function restoreTrialPosition(trial) {
    releaseTrialVideo(trial);
    trial.seek = undefined;
    trial.wantsPlay = false;
    if (state.kind === 'photo') {pausePhoto(); state.photoTime = trial.time;}
  }
  function resumeMedia() {
    if (state.kind === 'video') state.source.play().catch(() => updateTimeline());
    else playPhoto();
  }
  function onLookChanged() {
    const committed = JSON.stringify(editor.settings);
    const changed = committed !== committedKey;
    if (changed) {committedKey = committed; clearDownload(); message('');}
    const timed = editor.timed;
    const previewKey = editor.previewKey;
    if (editor.previewing && state.source) {
      if (!audition) {
        audition = {source:state.source, key:previewKey, time:currentTime(), history:painter.snapshot(),
          playing:state.kind === 'video' ? !state.source.paused && !state.source.ended : state.photoPlaying};
        pauseMedia();
      } else if (audition.key !== previewKey) {
        audition.key = previewKey;
        restoreTrialPosition(audition);
        trialPainter?.resetHistory();
      }
    } else if (audition) {
      const previous = audition;
      restoreTrialPosition(previous);
      audition = null;
      if (previous.source === state.source && !state.importing) {
        returnHistory = previous.history;
        if (previous.playing || (changed && !state.timed && timed && state.kind === 'photo')) resumeMedia();
        if (!timed && state.kind === 'photo') state.photoTime = 0;
      }
    } else if (changed && state.kind === 'photo') {
      if (!timed) {pausePhoto(); state.photoTime = 0;}
      else if (!state.timed) {state.photoTime = 0; playPhoto();}
    }
    state.timed = timed;
    updateTimeline(); updateExportInfo(); schedule();
  }
  function drawSignal() {
    if (!signalContext || !signal.getClientRects().length) return;
    const time = state.kind === 'video' ? state.source.currentTime : 0;
    const sampleTime = state.kind === 'video' && !state.source.paused ? Math.floor(time * 6) / 6 : time;
    if (signalSource === state.source && signalTime === sampleTime) return;
    const w = signal.width, h = signal.height;
    const fit = Math.max(w / state.width, h / state.height);
    const cropWidth = w / fit, cropHeight = h / fit;
    signalContext.fillStyle = '#090c08';
    signalContext.fillRect(0, 0, w, h);
    signalContext.drawImage(state.source, (state.width-cropWidth)/2, (state.height-cropHeight)/2,
      cropWidth, cropHeight, 0, 0, w, h);
    const frame = signalContext.getImageData(0, 0, w, h);
    const pixels = frame.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = 4 * (y*w + x);
        const luma = .2126*pixels[i] + .7152*pixels[i+1] + .0722*pixels[i+2];
        const lit = luma > 16*(.5 + ditherMatrix[(y%4)*4 + x%4]);
        pixels[i] = lit ? 199 : 9;
        pixels[i+1] = lit ? 255 : 12;
        pixels[i+2] = lit ? 95 : 8;
      }
    }
    signalContext.putImageData(frame, 0, 0);
    signalSource = state.source;
    signalTime = sampleTime;
  }
  function render() {
    if (document.documentElement.dataset.view !== 'studio' || !state.source ||
        (state.kind === 'video' && (state.source.readyState < 2 || state.source.seeking))) return;
    const rect = ui.frame.getBoundingClientRect();
    const cssScale = state.detail ? 1 : Math.min(rect.width / state.width, rect.height / state.height);
    const maxLength = state.detail ? Math.max(4096, Math.max(rect.width, rect.height)) : 1600;
    const scale = Math.min(1, cssScale * (window.devicePixelRatio || 1), maxLength / Math.max(state.width, state.height));
    const width = Math.max(1, Math.round(state.width * scale)), height = Math.max(1, Math.round(state.height * scale));
    originalPainter.render(state.source, {strength: 0, width, height});
    const recipe=editor.previewing ? editor.previewSettings : editor.settings;
    const settings = {time:currentTime(), width, height};
    if (state.kind==='video' && recipe.layers.some(layer=>layer.enabled && layer.type==='mosh-audio-visualizer')) {
      settings.audioBuffer=TonepressLayerAudio.peek(state.file,schedule);
    }
    if (editor.previewing) {
      trialPainter ??= TonepressStack.create(ui.effect);
      trialPainter.render(state.source, {...editor.previewSettings, ...settings});
    } else {
      painter.render(state.source, {...editor.settings, ...settings, history:returnHistory});
      returnHistory = null;
    }
    drawSignal();
  }
  function schedule() {
    if (state.renderRequest) return;
    state.renderRequest = requestAnimationFrame(() => {
      state.renderRequest = 0;
      try { render(); } catch (error) { message('预览暂时无法绘制。{reason}', true, {reason: error.message}); }
    });
  }
  function stopFrames() {
    const v = state.frameSource;
    if (v && state.frameRequest) {
      if (v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(state.frameRequest);
      else cancelAnimationFrame(state.frameRequest);
    }
    state.frameRequest = 0;
    state.frameSource = null;
  }
  function animate(v) {
    stopFrames();
    if (v !== state.source || v.paused || v.ended) return;
    state.frameSource = v;
    const next = () => {
      state.frameRequest = 0;
      if (v !== state.source) return;
      schedule(); updateTimeline(); animate(v);
    };
    state.frameRequest = v.requestVideoFrameCallback ? v.requestVideoFrameCallback(next) : requestAnimationFrame(next);
  }
  function layout() {
    if (!state.source || document.documentElement.dataset.view !== 'studio') return;
    const w = Math.max(1, ui.stage.clientWidth), h = Math.max(1, ui.stage.clientHeight);
    const scale = state.detail ? 1 : Math.min(w / state.width, h / state.height);
    const contentW = Math.max(1, Math.round(state.width * scale)), contentH = Math.max(1, Math.round(state.height * scale));
    ui.frame.style.width = Math.min(w, contentW) + 'px';
    ui.frame.style.height = Math.min(h, contentH) + 'px';
    ui.frame.style.setProperty('--media-w', contentW + 'px');
    ui.frame.style.setProperty('--media-h', contentH + 'px');
    ui.fit.setAttribute('aria-pressed', String(!state.detail));
    ui.detail.setAttribute('aria-pressed', String(state.detail));
    ui.modeHint.textContent = t(state.detail ? '原寸 · 画面中央' : '适合画布');
    schedule();
  }
  function updateExportInfo() {
    if (state.busy) return;
    const video = state.kind === 'video';
    const ready = Boolean(state.source) && !state.importing && !editor.pending;
    const formats = TonepressExport.videoFormats();
    ui.exportBtn.disabled = !ready || (video && !formats.length);
    ui.exportLabel.textContent = t(editor.pending ? '先确认试样' : video ? '导出视频' : '导出照片');
    ui.frameExport.hidden = !video;
    ui.frameExport.disabled = !ready;
    ui.loopExport.hidden = video || !editor.timed;
    ui.loopExport.disabled = !ready || !formats.length;
    ui.exportNote.textContent = video && formats.length
      ? t('{format} · 长边最高 1920 px · 按片长录制', {format: formats[0].toUpperCase()})
      : t(video ? '此浏览器无法录制视频，可保存当前帧。' : 'PNG · 长边最高 4096 px');
  }
  function unload(source, url) {
    if (!source) return;
    if (source.tagName === 'VIDEO') {
      source.pause(); source.removeAttribute('src'); source.load();
    }
    source.remove();
    if (url) URL.revokeObjectURL(url);
  }
  function waitForMedia(media, event, url) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => done(new Error('读取超时，请尝试较小的文件。')), 20000);
      const ok = () => done(), fail = () => done(new Error('浏览器无法解码该文件。可尝试 JPG、PNG 或 H.264 MP4。'));
      function done(error) {
        clearTimeout(timer);
        media.removeEventListener(event, ok); media.removeEventListener('error', fail);
        if (error) reject(error); else resolve();
      }
      media.addEventListener(event, ok); media.addEventListener('error', fail);
      media.src = url;
    });
  }
  async function loadMedia(file = null, demoVideo = false) {
    if (state.busy) return;
    const token = ++state.loading;
    state.importing = true;
    ui.exportBtn.disabled = true;
    try {
      await readMedia(file, demoVideo, token);
    } finally {
      if (token === state.loading) {
        state.importing = false;
        updateExportInfo();
        if (!state.source && (file || demoVideo)) {
          const error = lastMessage;
          await loadMedia();
          if (state.loading === token + 1 && error?.source) message(error.source, true, error.values);
        }
      }
    }
  }
  function bindVideo(source) {
    source.loop=state.repeat;
    source.addEventListener('seeking', () => {
      if (state.source !== source) return;
      if (audition) trialPainter?.resetHistory();
      else if (!returnHistory) painter.resetHistory();
    });
    function refreshPausedSample() {
      if (state.source !== source || !source.paused || source.seeking || source.readyState < 2 ||
        (thumbnailTime !== null && Math.abs(thumbnailTime - source.currentTime) < .04)) return;
      thumbnailTime = source.currentTime;
      editor.sampleSource(source,state.width,state.height);
    }
    source.addEventListener('pause',refreshPausedSample);
    source.addEventListener('seeked',refreshPausedSample);
    for (const event of ['loadeddata', 'seeked', 'pause', 'ended', 'timeupdate', 'volumechange'])
      source.addEventListener(event, () => {if (state.source === source) {updateTimeline(); schedule();}});
    source.addEventListener('play', () => {if (state.source === source) {updateTimeline(); animate(source);}});
  }
  function updateMediaLabels() {
    if (!state.source) return;
    const video = state.kind === 'video';
    state.name = state.sample ? t(state.sample==='motion' ? '港湾运动对照.mp4' : video ? '韦尔纳扎港湾·平移.mp4' : '韦尔纳扎港湾.jpg') : state.file.name;
    ui.fileName.textContent = state.name;
    ui.kind.textContent = t(video ? (state.sample ? '示例视频' : '视频') : (state.sample ? '示例照片' : '照片'));
    ui.sampleLabel.textContent = t(video ? '示例照片' : '示例视频');
  }
  async function readMedia(file, demoVideo, token) {
    if (demoVideo) {
      message('正在打开港湾视频…');
      try {
        const address=demoVideo==='motion' ? window.TONEPRESS_STUDY || 'assets/motion-study.mp4' : window.TONEPRESS_CLIP || 'assets/coast-motion.mp4';
        const r = await fetch(address);
        if (!r.ok) throw new Error('示例视频无法读取，请重新打开单文件版或导入自己的视频。');
        file = new File([await r.blob()], demoVideo==='motion' ? '港湾运动对照.mp4' : '韦尔纳扎港湾·平移.mp4', {type:'video/mp4'});
        if (token !== state.loading) return;
      } catch (error) {
        if (token === state.loading) message(error.message, true);
        return;
      }
    }
    const video = file && (/^video\//.test(file.type) || /\.(mp4|mov|m4v|webm|ogv|mkv)$/i.test(file.name));
    if (file && !video && !(/^image\//.test(file.type) || /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(file.name))) {
      message('请选择一张照片或一个视频文件。', true); return;
    }
    const source = document.createElement(video ? 'video' : 'img');
    const url = file ? URL.createObjectURL(file) : window.TONEPRESS_SAMPLE || 'assets/coast.jpg';
    if (video) { source.preload = 'auto'; source.playsInline = true; source.muted = state.audioMuted; }
    ui.mediaBin.append(source);
    message(file ? '正在读取素材…' : '');
    try {
      await waitForMedia(source, video ? 'loadeddata' : 'load', url);
      const duration = video ? await TonepressExport.resolveDuration(source) : 0;
      const width = video ? source.videoWidth : source.naturalWidth, height = video ? source.videoHeight : source.naturalHeight;
      if (!width || !height || (video && (!Number.isFinite(duration) || duration <= 0))) throw Error('素材的尺寸或时长无法读取。');
      if (token !== state.loading) {unload(source, file && url); return;}
      editor.cancelPreview();
      returnHistory = null;
      thumbnailTime = null;
      stopFrames(); pausePhoto(); unload(state.source, state.url);
      Object.assign(state, {source, width, height, duration, kind: video ? 'video' : 'photo', file, url: file && url,
        sample: !file || demoVideo, detail: false, photoTime: 0});
      clearDownload(); message('');
      updateMediaLabels();
      ui.dimensions.textContent = width + ' × ' + height;
      icon(ui.sampleGlyph, video ? 'i-img' : 'i-play');
      ui.sourceCredit.hidden = Boolean(file) && !demoVideo;
      state.timed=editor.timed;
      if (video) bindVideo(source);
      layout(); updateTimeline(); updateExportInfo();
      try {
        editor.sampleSource(source,width,height);
        if (video) thumbnailTime=source.currentTime;
      } catch {
        message('缩略图暂时无法刷新，仍可在大画面选择和比较风格。');
      }
    } catch (error) {
      unload(source, file && url);
      if (token === state.loading) message(error.message, true);
    }
  }
  function setBusy(busy, recording=false) {
    state.busy = busy;
    editor.setBusy(busy);
    for (const control of [el('coverImport'),ui.importBtn,ui.sampleBtn,ui.exportBtn,ui.frameExport,ui.loopExport,
      ui.file,ui.play,ui.timeline,ui.mute,ui.repeat]) control.disabled = busy;
    ui.cancel.hidden = !busy || !recording;
    ui.progress.hidden = !busy || !recording;
    if (!busy) updateExportInfo();
  }
  async function waitForSeek(video) {
    if (!video.seeking) return;
    await new Promise((resolve,reject) => {
      function done(error) {
        clearTimeout(timeout);
        video.removeEventListener('seeked',ready);
        if(error) reject(error); else resolve();
      }
      const ready=()=>done();
      const timeout=setTimeout(()=>done(new Error('当前帧尚未就绪，请等待定位结束后重试。')),5000);
      video.addEventListener('seeked',ready,{once:true});
    });
  }
  function paintExportProgress() {
    ui.exportLabel.textContent = recordingProgress === null ? t('正在导出…') : t('正在导出 {n}%', {n: recordingProgress});
  }
  async function exportMedia(mode) {
    if (!state.source || state.importing || state.busy || editor.pending) return;
    if (editor.previewing) editor.cancelPreview();
    if (ui.exportMenu) ui.exportMenu.open = false;
    const recording = mode==='video' || mode==='loop';
    if (state.kind === 'video') state.source.pause();
    else pausePhoto();
    updateTimeline(); clearDownload(); message(''); setBusy(true,recording);
    state.abort = new AbortController();
    const update = progress => {
      const pct=Math.min(100,Math.round(progress*100));
      recordingProgress = recording ? pct : null;
      paintExportProgress();
      ui.progressBar.style.width=pct+'%';
    };
    update(0);
    try {
      if (state.kind === 'video' && mode === 'frame') await waitForSeek(state.source);
      if (mode==="frame") render();
      const settings={...editor.settings,time:currentTime()};
      if (state.kind==='video' && settings.layers.some(layer=>layer.enabled && layer.type==='mosh-audio-visualizer')) {
        settings.audioBuffer=await TonepressLayerAudio.load(state.file);
      }
      if(settings.layers.some(layer=>layer.enabled && layer.strength>0 && layer.type==="mosh-remove-background")) await TonepressPerson.ready();
      await Promise.all(settings.layers.filter(layer=>layer.enabled && layer.strength>0 && layer.image).map(layer=>TonepressLayerImages.load(layer.image)));
      if(mode==="frame") settings.history=painter.snapshot();
      const args={source:state.source,file:state.file,settings,signal:state.abort.signal,onProgress:update};
      let output;
      if (mode==='video') output=await TonepressExport.video(args);
      else if (mode==='loop') output=await TonepressExport.loop(args);
      else output=await TonepressExport.photo(args);
      state.download=URL.createObjectURL(output.blob);
      ui.retrySave.href=state.download;
      const tag=editor.title.replace(/[\/:*?"<>|]/g,'-');
      const frameTag=mode==='frame' ? '-'+currentTime().toFixed(2)+'s' : '';
      ui.retrySave.download=state.name.replace(/\.[^.]+$/, '')+'-'+tag+frameTag+'.'+output.extension;
      ui.retrySave.hidden=false;ui.retrySave.click();
      message('已导出 {format} · {size} MB', false, {format: output.extension.toUpperCase(), size: (output.blob.size/1048576).toFixed(2)});
    } catch(error) {
      const stopped=state.abort.signal.aborted;
      message(stopped ? '已取消导出，可以继续调整。' : '导出失败。{reason}', !stopped, {reason: error.message});
    } finally {state.abort=null;setBusy(false);}
  }
  ui.sampleBtn.onclick = () => loadMedia(null, state.kind !== 'video');
  ui.importBtn.onclick = () => ui.file.click();
  ui.file.onchange = () => {const selected = ui.file.files[0]; ui.file.value = ''; if (selected) screens.openFile(selected);};
  let dragDepth = 0;
  function isFiles(e) {return Array.from(e.dataTransfer?.types || []).includes('Files');}
  window.addEventListener('dragenter', e => {if (isFiles(e)) {e.preventDefault(); dragDepth++; if (!state.busy) ui.dropNotice.hidden = false;}});
  window.addEventListener('dragover', e => {if (isFiles(e)) e.preventDefault();});
  window.addEventListener('dragleave', () => {if (--dragDepth <= 0) {dragDepth = 0; ui.dropNotice.hidden = true;}});
  window.addEventListener('drop', e => {
    if (!isFiles(e)) return;
    e.preventDefault(); dragDepth = 0; ui.dropNotice.hidden = true;
    const f = e.dataTransfer.files[0]; if (f) screens.openFile(f);
  });
  ui.compareMode.onclick = () => {
    state.comparison = !state.comparison;
    state.holdingOriginal = false;
    if (state.comparison && (state.split === 0 || state.split === 100)) state.split=50;
    paintComparison();
  };
  ui.holdOriginal.onpointerdown = event => {
    if (event.button !== 0) return;
    ui.holdOriginal.setPointerCapture(event.pointerId);
    holdOriginal(true);
  };
  for (const name of ['pointerup','pointercancel','lostpointercapture','blur']) {
    ui.holdOriginal.addEventListener(name, () => holdOriginal(false));
  }
  ui.holdOriginal.onclick = event => {
    if (event.detail === 0) holdOriginal(!state.holdingOriginal);
  };
  ui.holdOriginal.onkeydown = event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); holdOriginal(true);
  };
  ui.holdOriginal.onkeyup = event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); holdOriginal(false);
  };
  window.addEventListener('blur', () => holdOriginal(false));
  ui.divider.oninput = () => updateSplit(ui.divider.value);
  const pointerSplit = e => {
    const b = ui.frame.getBoundingClientRect();
    if (b.width) updateSplit(100 * (e.clientX - b.left) / b.width);
  };
  ui.divider.onpointerdown = e => {
    if (e.button !== 0) return;
    e.preventDefault(); ui.divider.focus({preventScroll:true}); ui.divider.setPointerCapture(e.pointerId); pointerSplit(e);
  };
  ui.divider.onpointermove = e => {if (ui.divider.hasPointerCapture(e.pointerId)) pointerSplit(e);};
  ui.fit.onclick = () => {state.detail = false; layout();};
  ui.detail.onclick = () => {state.detail = true; layout();};
  ui.play.onclick = async () => {
    if (state.kind !== 'video') {
      if (state.photoPlaying) {pausePhoto();updateTimeline();} else playPhoto();
      return;
    }
    if (moveTrialVideo('play')) return;
    const v = state.source;
    if (!v.paused) v.pause();
    else {try {if(v.ended) v.currentTime = 0; await v.play();} catch {message('浏览器无法播放此视频。', true);}}
  };
  ui.timeline.oninput = () => {
    const time=Number(ui.timeline.value);
    if(state.kind==='video') {if (!moveTrialVideo('seek',time)) state.source.currentTime=time;}
    else {pausePhoto();state.photoTime=time;}
    updateTimeline();schedule();
  };
  ui.repeat.onclick=()=>{
    state.repeat=!state.repeat;
    if(state.kind==='video') state.source.loop=state.repeat;
    updateTimeline();
  };
  ui.mute.onclick = () => {if (state.kind === 'video') {state.audioMuted = !state.source.muted; state.source.muted = state.audioMuted; updateTimeline();}};
  ui.exportBtn.onclick = () => exportMedia(state.kind==='video' ? 'video' : 'photo');
  ui.frameExport.onclick = () => exportMedia('frame');
  ui.loopExport.onclick = () => exportMedia('loop');
  ui.cancel.onclick = () => state.abort?.abort();
  document.addEventListener('tonepress:language', () => {
    updateMediaLabels();
    paintComparison();
    updateTimeline();
    if (state.busy) paintExportProgress();
    else updateExportInfo();
    if (lastMessage) message(lastMessage.source, lastMessage.error, lastMessage.values);
    layout();
  });
  document.addEventListener("tonepress:layer-image",schedule);
  document.addEventListener("tonepress:person-ready",schedule);
  document.addEventListener("tonepress:person-error",()=>{if(editor.previewSettings.layers.some(layer=>layer.enabled && layer.type==="mosh-remove-background"))message("人像模型无法加载。",true);});
  new ResizeObserver(layout).observe(ui.stage);
  paintComparison();
  updateExportInfo();
  const screens = TonepressScreens.connect({
    pickFile: () => ui.file.click(),
    enter(file) {
      if (file || (!state.source && !state.importing)) {
        const sample=file ? '' : new URLSearchParams(location.search).get('sample');
        loadMedia(file,sample==='motion' ? 'motion' : sample==='video');
      } else layout();
    },
    leave() {
      if (state.source) pauseMedia();
      holdOriginal(false);
      ui.exportMenu.open = false;
      if (el('saveDialog').open) el('saveDialog').close();
    }
  });
})();
