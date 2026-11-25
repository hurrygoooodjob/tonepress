(function () {
  "use strict";

  const PHOTO_LIMIT = 4096;
  const VIDEO_LIMIT = 1920;
  const VIDEO_FPS = 30;
  const LOOP_SECONDS = 4;

  function getSize(width, height, maxEdge, multiple = 1) {
    if (!(width > 0 && height > 0) || !Number.isFinite(width + height)) {
      throw new Error("无法读取素材尺寸。");
    }

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    return {
      width: Math.max(multiple, Math.floor(width * scale / multiple) * multiple),
      height: Math.max(multiple, Math.floor(height * scale / multiple) * multiple)
    };
  }

  function sourceSize(source, maxEdge, multiple) {
    return getSize(
      source.naturalWidth || source.videoWidth || source.width,
      source.naturalHeight || source.videoHeight || source.height,
      maxEdge,
      multiple
    );
  }

  function recordingTypes(hasAudio) {
    const aac = hasAudio ? ",mp4a.40.2" : "";
    const opus = hasAudio ? ",opus" : "";
    const types = [
      'video/mp4;codecs="avc1' + aac + '"',
      'video/mp4;codecs="avc1.640028' + aac + '"',
      'video/webm;codecs="vp9' + opus + '"',
      'video/webm;codecs="vp8' + opus + '"',
      "video/webm"
    ];
    if (!MediaRecorder.isTypeSupported) return ["video/mp4", ...types];
    // An unspecified MP4 can default to VP9/Opus, so require AVC (and AAC for sound).
    return types.filter((type) => MediaRecorder.isTypeSupported(type));
  }

  function videoFormats() {
    if (typeof MediaRecorder !== "function" || typeof MediaStream !== "function" ||
        typeof HTMLCanvasElement.prototype.captureStream !== "function") {
      return [];
    }

    return [...new Set(
      [...recordingTypes(true), ...recordingTypes(false)]
        .map((type) => type.match(/^video\/(mp4|webm)/)[1])
    )];
  }

  async function photo({ source, settings = {} }) {
    const { width, height } = sourceSize(source, PHOTO_LIMIT);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const renderer = TonepressStack.create(canvas);
    const time = TonepressStack.usesDecodedClock(settings) && Number.isFinite(settings.time)
      ? settings.time : (Number.isFinite(source.currentTime) ? source.currentTime : settings.time || 0);
    try {
      if (renderer.render(source, { ...settings, width, height, time }) === false) {
        throw new Error("无法渲染当前画面。");
      }
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result?.size) resolve(result);
          else reject(new Error("无法生成 PNG。请尝试较小的图片。"));
        }, "image/png");
      });
      return { blob, extension: "png" };
    } finally {
      renderer.dispose();
    }
  }

  function abortError() {
    return new DOMException("已取消导出。", "AbortError");
  }

  async function resolveDuration(video, signal) {
    if (signal?.aborted) throw abortError();
    if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;

    const readError = () => new Error("无法确定视频的时长。请尝试重新保存为 MP4 或可定位的 WebM。");
    if (video.duration !== Infinity) throw readError();

    // A WebM written as a live recording may have no duration in its header.
    // Seek beyond any local clip so the decoder can discover the end itself.
    const tailProbe = 365 * 24 * 60 * 60;
    return new Promise((resolve, reject) => {
      let duration;

      function cleanup() {
        clearTimeout(timer);
        video.removeEventListener("durationchange", onDuration);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("loadeddata", onSeeked);
        video.removeEventListener("canplay", onSeeked);
        video.removeEventListener("error", onError);
        signal?.removeEventListener("abort", onAbort);
      }

      function fail(error) {
        cleanup();
        try {
          video.currentTime = 0;
        } catch {
          // The media can be detached while export is being cancelled.
        }
        reject(error);
      }

      function rewind(value) {
        duration = value;
        try {
          video.currentTime = 0;
          if (!video.seeking) onSeeked();
        } catch {
          fail(readError());
        }
      }

      function onDuration() {
        if (!duration && Number.isFinite(video.duration) && video.duration > 0) {
          rewind(video.duration);
        }
      }

      function onSeeked(event) {
        if (video.seeking) return;
        if (duration) {
          const start = video.seekable?.length ? video.seekable.start(0) : 0;
          if (video.currentTime <= start + 0.001 && video.readyState >= 2) {
            cleanup();
            resolve(duration);
          }
          return;
        }

        onDuration();
        if (duration || event?.type !== "seeked") return;
        const tail = video.currentTime;
        if (tail > 0 && tail < tailProbe) rewind(tail);
      }

      function onError() {
        fail(readError());
      }

      function onAbort() {
        fail(abortError());
      }

      const timer = setTimeout(onError, 7000);
      video.addEventListener("durationchange", onDuration);
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("loadeddata", onSeeked);
      video.addEventListener("canplay", onSeeked);
      video.addEventListener("error", onError, { once: true });
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        video.pause();
        video.currentTime = tailProbe;
      } catch {
        fail(readError());
      }
    });
  }

  function loadVideo(source, url, signal) {
    return new Promise((resolve, reject) => {
      function removeListeners() {
        clearTimeout(timer);
        source.removeEventListener("loadeddata", check);
        source.removeEventListener("canplay", check);
        source.removeEventListener("error", onError);
        signal?.removeEventListener("abort", onAbort);
      }

      function check() {
        if (source.readyState < 2) return;
        removeListeners();
        resolve();
      }

      function onError() {
        removeListeners();
        reject(new Error("当前浏览器无法解码这个视频。请试用 H.264 MP4 或 WebM。"));
      }

      function onAbort() {
        removeListeners();
        reject(abortError());
      }

      const timer = setTimeout(onError, 15000);
      source.addEventListener("loadeddata", check);
      source.addEventListener("canplay", check);
      source.addEventListener("error", onError);
      signal?.addEventListener("abort", onAbort, { once: true });
      source.src = url;
    });
  }

  function startRecorder(stream, width, height) {
    const hasAudio = stream.getAudioTracks().length > 0;
    const videoBitsPerSecond = Math.round(Math.max(2500000, Math.min(12000000, width * height * 6)));
    let error;

    for (const mimeType of recordingTypes(hasAudio)) {
      try {
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond,
          ...(hasAudio ? { audioBitsPerSecond: 128000 } : {})
        });
        recorder.start();
        return recorder;
      } catch (cause) {
        error = cause;
      }
    }

    throw new Error("当前设备没有可用的视频编码器。可尝试更换浏览器或缩小素材。", { cause: error });
  }

  function recordFrames(recorder, video, duration, draw, onProgress, signal, useDecodedClock) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const framePeriod = 1000 / VIDEO_FPS;
      let frameId;
      let videoFrameId;
      let lastMediaTime = 0;
      let startTime;
      let nextDraw;
      let finishing = false;

      function removeListeners() {
        clearTimeout(timer);
        cancelAnimationFrame(frameId);
        if (videoFrameId != null) video.cancelVideoFrameCallback(videoFrameId);
        recorder.removeEventListener("dataavailable", onData);
        recorder.removeEventListener("stop", onStop);
        recorder.removeEventListener("error", onRecorderError);
        video?.removeEventListener("ended", onEnded);
        video?.removeEventListener("error", onVideoError);
        document.removeEventListener("visibilitychange", onVisibility);
        signal?.removeEventListener("abort", onAbort);
      }

      function fail(error) {
        removeListeners();
        reject(error);
      }

      function onData(event) {
        if (event.data?.size) chunks.push(event.data);
      }

      function onStop() {
        if (!finishing || !chunks.length) {
          fail(new Error("视频导出提前结束或生成了空文件。"));
          return;
        }
        removeListeners();
        const recordedType = chunks[0].type || recorder.mimeType;
        const type = recordedType.split(";")[0];
        resolve({
          blob: new Blob(chunks, { type }),
          extension: type === "video/mp4" ? "mp4" : "webm"
        });
      }

      function onRecorderError(event) {
        fail(new Error("视频编码失败，请重试或换用较短的素材。", { cause: event.error }));
      }

      function onVideoError() {
        fail(new Error("导出时视频解码失败。"));
      }

      function onAbort() {
        fail(abortError());
      }

      function onVisibility() {
        if (document.hidden) fail(new Error("请保持编辑页面打开，然后重试导出。"));
      }

      function update(now) {
        const time = video ? video.currentTime : (now - startTime) / 1000;
        if (!video && time >= duration) {
          onEnded();
          return;
        }
        frameId = requestAnimationFrame(update);
        try {
          if (now + 0.5 >= nextDraw && (!video || video.readyState >= 2)) {
            draw(time);
            nextDraw = Math.max(now + 1, nextDraw + framePeriod);
            onProgress?.(Math.max(0, Math.min(0.99, time / duration)));
          }
        } catch (error) {
          fail(error);
        }
      }

      // A decoded picture advances prediction once, regardless of display or recorder frame rate.
      function presented(_now, frame) {
        videoFrameId = video.requestVideoFrameCallback(presented);
        try {
          if (frame.mediaTime === lastMediaTime) return;
          draw(frame.mediaTime);
          lastMediaTime = frame.mediaTime;
          onProgress?.(Math.min(.99, lastMediaTime / duration));
        } catch (error) {
          fail(error);
        }
      }

      function onEnded() {
        finishing = true;
        cancelAnimationFrame(frameId);
        if (videoFrameId != null) video.cancelVideoFrameCallback(videoFrameId);
        try {
          const time = useDecodedClock ? lastMediaTime :
            video ? Math.min(video.currentTime, duration) : duration - 1 / VIDEO_FPS;
          draw(time, true);
          // Let the final filtered frame reach the capture stream before stopping.
          frameId = requestAnimationFrame(() => {
            try {
              if (recorder.state !== "inactive") recorder.stop();
            } catch (error) {
              fail(error);
            }
          });
        } catch (error) {
          fail(error);
        }
      }

      const timer = setTimeout(() => fail(new Error("等候视频输出超时，请保持页面打开后重试。")),
        duration * 1500 + 10000);
      recorder.addEventListener("dataavailable", onData);
      recorder.addEventListener("stop", onStop);
      recorder.addEventListener("error", onRecorderError);
      video?.addEventListener("ended", onEnded, { once: true });
      video?.addEventListener("error", onVideoError, { once: true });
      document.addEventListener("visibilitychange", onVisibility);
      signal?.addEventListener("abort", onAbort, { once: true });

      try {
        draw(0, true);
        startTime = performance.now();
        nextDraw = startTime + framePeriod;
        if (useDecodedClock) videoFrameId = video.requestVideoFrameCallback(presented);
        else frameId = requestAnimationFrame(update);
        onProgress?.(0);
        if (video && !signal?.aborted) {
          video.play().catch((error) => fail(new Error("浏览器未能开始播放导出源。请直接点击导出后重试。", { cause: error })));
        }
      } catch (error) {
        fail(error);
      }
    });
  }

  function checkVideoExport(signal) {
    if (!videoFormats().length) throw new Error("当前浏览器不支持导出视频。");
    if (signal?.aborted) throw abortError();
    if (document.hidden) throw new Error("请打开编辑页面后导出。");
  }

  async function recordCanvas({ source, video, duration, audioTracks = [], settings, onProgress, signal }) {
    if (signal?.aborted) throw abortError();
    const { width, height } = sourceSize(source, VIDEO_LIMIT, 2);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const renderer = TonepressStack.create(canvas);
    let canvasStream;
    let recorder;

    try {
      canvasStream = canvas.captureStream(VIDEO_FPS);
      const [videoTrack] = canvasStream.getVideoTracks();
      if (!videoTrack) throw new Error("当前设备无法捕获已处理的视频帧。");
      const renderSettings = { ...settings, width, height };
      const draw = (time, captureBoundaryFrame = false) => {
        if (renderer.render(source, { ...renderSettings, time }) === false) {
          throw new Error("当前视频帧无法渲染。");
        }
        if (captureBoundaryFrame) videoTrack.requestFrame?.();
      };

      recorder = startRecorder(new MediaStream([videoTrack, ...audioTracks]), width, height);
      const useDecodedClock = video?.requestVideoFrameCallback && TonepressStack.usesDecodedClock(settings);
      const result = await recordFrames(recorder, video, duration, draw, onProgress, signal, useDecodedClock);
      if (signal?.aborted) throw abortError();
      onProgress?.(1);
      return result;
    } finally {
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        // The recorder can become inactive between reporting failure and cleanup.
      }
      canvasStream?.getTracks().forEach((track) => track.stop());
      renderer.dispose();
    }
  }

  async function video({ file, settings, onProgress, signal }) {
    checkVideoExport(signal);
    const source = document.createElement("video");
    source.preload = "auto";
    source.playsInline = true;
    const captureSource = source.captureStream || source.mozCaptureStream;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const url = URL.createObjectURL(file);
    const streams = [];

    let audioContext;
    let audioNode;
    let audioReady;

    function prepareAudioGraph() {
      if (!audioContext && AudioContextClass) {
        audioContext = new AudioContextClass();
        audioReady = audioContext.resume().then(() => true, () => false);
      }
    }

    try {
      // The Web Audio fallback starts during the export button gesture.
      if (!captureSource) prepareAudioGraph();
      source.muted = !audioContext;
      await loadVideo(source, url, signal);
      const duration = await resolveDuration(source, signal);

      let audioTracks = [];
      let nativeCaptureFailed = !captureSource;
      if (captureSource) {
        try {
          const inputStream = captureSource.call(source);
          streams.push(inputStream);
          audioTracks = inputStream.getAudioTracks().slice(0, 1);
        } catch {
          nativeCaptureFailed = true;
        }
      }
      const reportedAudio = source.audioTracks?.length > 0 || source.mozHasAudio === true ||
        source.webkitAudioDecodedByteCount > 0;
      const useAudioGraph = !audioTracks.length && (reportedAudio ||
        (nativeCaptureFailed && source.audioTracks?.length !== 0));

      if (useAudioGraph) {
        prepareAudioGraph();
        if (!audioContext) throw new Error("当前浏览器无法保留这个视频的原声。");
        if (audioContext.state !== "running") {
          const resumed = await Promise.race([
            audioReady,
            new Promise((resolve) => setTimeout(() => resolve(false), 1000))
          ]);
          if (signal?.aborted) throw abortError();
          if (!resumed) throw new Error("浏览器未能读取声音。请直接点击导出后重试。");
        }
        audioNode = audioContext.createMediaElementSource(source);
        const destination = audioContext.createMediaStreamDestination();
        // Only the encoder receives this graph. It has no speaker output.
        audioNode.connect(destination);
        streams.push(destination.stream);
        audioTracks = destination.stream.getAudioTracks();
        source.muted = false;
      } else {
        source.muted = true;
      }

      return await recordCanvas({ source, video: source, duration, audioTracks, settings, onProgress, signal });
    } finally {
      source.pause();
      streams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
      audioNode?.disconnect();
      if (audioContext && audioContext.state !== "closed") await audioContext.close().catch(() => {});
      source.removeAttribute("src");
      source.load();
      URL.revokeObjectURL(url);
    }
  }

  async function loop({ source, settings, onProgress, signal }) {
    checkVideoExport(signal);
    return recordCanvas({ source, duration: LOOP_SECONDS, settings, onProgress, signal });
  }

  window.TonepressExport = {
    photo,
    video,
    loop,
    resolveDuration,
    videoFormats,
    videoSupported: () => videoFormats().length > 0
  };
}());
