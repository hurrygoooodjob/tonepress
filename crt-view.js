(() => {
  'use strict';

  const initial = {yaw: 38, pitch: 16};
  const dragThreshold = 7;

  function connect() {
    const model = document.getElementById('coverModel');
    const canvas = document.getElementById('crtModelCanvas');
    const poster = document.getElementById('crtPoster');
    if (!model || !canvas || !poster) return;

    const toolbar = document.getElementById('modelToolbar');
    const hint = document.getElementById('modelHint');
    const left = document.getElementById('modelLeft');
    const right = document.getElementById('modelRight');
    const reset = document.getElementById('modelReset');

    let yaw = initial.yaw;
    let pitch = initial.pitch;
    let gesture = null;
    let renderer = null;
    let unavailable = false;
    let pendingFrame = 0;

    function ready() {
      return model.dataset.renderer === 'webgl';
    }

    function updateControls() {
      const interactive = ready();
      if (toolbar) toolbar.hidden = !interactive;
      model.tabIndex = interactive ? 0 : -1;
      if (interactive) model.removeAttribute('aria-hidden');
      else model.setAttribute('aria-hidden', 'true');
      if (reset) reset.disabled = !interactive || (yaw === initial.yaw && pitch === initial.pitch);
      if (interactive && hint) {
        model.setAttribute('aria-describedby', hint.id);
        model.title = hint.textContent.trim();
      } else {
        model.removeAttribute('aria-describedby');
        model.removeAttribute('title');
      }
    }

    function showPoster() {
      const focus = document.activeElement;
      if (model.contains(focus) || toolbar?.contains(focus)) {
        document.getElementById('enterStudio')?.focus({preventScroll: true});
      }
      if (poster.complete && poster.naturalWidth) model.dataset.renderer = 'poster';
      else delete model.dataset.renderer;
      updateControls();
    }

    function releaseRenderer() {
      const previous = renderer;
      renderer = null;
      previous?.destroy();
    }

    function draw() {
      pendingFrame = 0;
      if (unavailable || !model.clientWidth || !model.clientHeight) return;
      try {
        renderer ??= window.TonepressCRT?.create(canvas) ?? null;
        if (renderer && renderer.draw(yaw, pitch) !== false) {
          if (!ready()) {
            model.dataset.renderer = 'webgl';
            updateControls();
          }
          return;
        }
      } catch {
        // Leave the still image and ordinary entrance available if WebGL fails.
      }
      unavailable = true;
      releaseRenderer();
      showPoster();
    }

    function queueDraw() {
      if (!pendingFrame) pendingFrame = requestAnimationFrame(draw);
    }

    function orient(nextYaw, nextPitch) {
      const wrapped = ((nextYaw + 180) % 360 + 360) % 360 - 180;
      const clamped = Math.max(-55, Math.min(65, nextPitch));
      if (wrapped === yaw && clamped === pitch) return;
      yaw = wrapped;
      pitch = clamped;
      updateControls();
      queueDraw();
    }

    function openStudio() {
      document.dispatchEvent(new CustomEvent('tonepress:open-studio'));
    }

    function endGesture() {
      const current = gesture;
      if (!current) return null;
      gesture = null;
      model.classList.remove('is-dragging');
      if (model.hasPointerCapture(current.id)) model.releasePointerCapture(current.id);
      return current;
    }

    model.addEventListener('pointerdown', event => {
      if (!ready() || gesture || !event.isPrimary || event.button !== 0) return;
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        yaw,
        pitch,
        mode: 'pending',
        fromScreen: renderer.isScreenAt(event.clientX, event.clientY)
      };
    });

    model.addEventListener('pointermove', event => {
      if (gesture?.id !== event.pointerId || gesture.mode === 'scroll') return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (gesture.mode === 'pending') {
        if (Math.hypot(dx, dy) < dragThreshold) return;
        if (event.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) {
          gesture.mode = 'scroll';
          return;
        }
        gesture.mode = 'drag';
        model.setPointerCapture(event.pointerId);
        model.classList.add('is-dragging');
      }
      if (event.cancelable) event.preventDefault();
      orient(gesture.yaw + dx * .42, gesture.pitch - dy * .27);
    });

    model.addEventListener('pointerup', event => {
      if (gesture?.id !== event.pointerId) return;
      const finished = endGesture();
      const distance = Math.hypot(event.clientX - finished.x, event.clientY - finished.y);
      if (ready() && finished.mode === 'pending' && distance < dragThreshold && finished.fromScreen &&
          renderer.isScreenAt(event.clientX, event.clientY)) openStudio();
    });

    for (const name of ['pointercancel', 'lostpointercapture', 'pointerleave']) {
      model.addEventListener(name, event => {
        // Touch starts with implicit capture on the canvas. Transferring it to the group is intentional.
        if (name === 'lostpointercapture' && event.target !== model) return;
        if (gesture?.id === event.pointerId && (name !== 'pointerleave' || gesture.mode !== 'drag')) endGesture();
      });
    }
    model.addEventListener('dragstart', event => event.preventDefault());

    model.addEventListener('keydown', event => {
      if (!ready() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      switch (event.key) {
        case 'ArrowLeft': orient(yaw - 15, pitch); break;
        case 'ArrowRight': orient(yaw + 15, pitch); break;
        case 'ArrowUp': orient(yaw, pitch + 8); break;
        case 'ArrowDown': orient(yaw, pitch - 8); break;
        case 'Home': orient(initial.yaw, initial.pitch); break;
        case 'Enter': if (!event.repeat) openStudio(); break;
        default: return;
      }
      event.preventDefault();
    });

    left?.addEventListener('click', () => orient(yaw - 15, pitch));
    right?.addEventListener('click', () => orient(yaw + 15, pitch));
    reset?.addEventListener('click', () => orient(initial.yaw, initial.pitch));
    document.addEventListener('tonepress:language', updateControls);
    poster.addEventListener('load', () => { if (unavailable) showPoster(); });

    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      unavailable = true;
      endGesture();
      releaseRenderer();
      showPoster();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      unavailable = false;
      queueDraw();
    });

    const observer = new ResizeObserver(queueDraw);
    observer.observe(model);
    window.addEventListener('resize', queueDraw);
    window.addEventListener('pagehide', event => {
      if (event.persisted) return;
      observer.disconnect();
      window.removeEventListener('resize', queueDraw);
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      releaseRenderer();
    });

    updateControls();
    queueDraw();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connect, {once: true});
  else connect();
})();
