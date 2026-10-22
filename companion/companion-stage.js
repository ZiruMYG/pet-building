// Yaya companion stage: a deliberately small WebView surface for Today.
// The full six-room home stays in pet-building; this file only exposes the
// character, a transparent stage, and a versioned message bridge.
(() => {
  'use strict';

  const PROTOCOL_VERSION = 1;
  let stage = null;
  let lastPointer = null;
  let actionStartedAt = 0;
  let actionDuration = 0;
  let queued = [];
  let ready = false;

  const state = {
    reaction: 'idle',
    eventId: null,
    visible: true,
    reducedMotion: false,
    muted: false,
  };

  function post(type, payload = {}) {
    const message = { v: PROTOCOL_VERSION, type, ...payload };
    try {
      if (window.YayaBridge && typeof window.YayaBridge.postMessage === 'function') {
        window.YayaBridge.postMessage(JSON.stringify(message));
      } else {
        (window.__YAYA_MESSAGES || (window.__YAYA_MESSAGES = [])).push(message);
      }
    } catch (_) {
      // Never let bridge failures break the animation loop.
    }
  }

  function unitForCanvas() {
    // The character needs breathing room above for the Flutter speech bubble
    // and around it for gestures. Keep the body intentionally smaller than the
    // panel: a 12.6-unit rig inside a 15.4-unit stage leaves headroom instead of
    // letting the leaf crown touch the bubble.
    return Math.max(12, Math.min(width / 11.6, height / 15.4));
  }

  function startReaction(reaction, eventId, duration) {
    const key = typeof reaction === 'string' ? reaction : 'idle';
    state.reaction = key === 'idle' ? 'idle' : key;
    state.eventId = eventId || null;
    actionStartedAt = millis();
    actionDuration = duration == null ? 0 : Math.max(0.4, Number(duration));
    post('reactionStarted', { eventId: state.eventId, reaction: state.reaction });
    if (actionDuration > 0) {
      window.setTimeout(() => {
        if (state.eventId !== (eventId || null)) return;
        finishReaction();
      }, actionDuration * 1000);
    }
  }

  function finishReaction() {
    const eventId = state.eventId;
    state.reaction = 'idle';
    state.eventId = null;
    actionStartedAt = millis();
    post('reactionCompleted', { eventId });
    drain();
  }

  function drain() {
    if (state.reaction !== 'idle' || queued.length === 0) return;
    const next = queued.shift();
    startReaction(next.reaction, next.eventId, next.duration);
  }

  function play(payload = {}) {
    const reaction = payload.reaction || 'idle';
    const eventId = payload.eventId || null;
    if (!ready) {
      queued.push({ reaction, eventId, duration: payload.duration });
      return;
    }
    if (state.reaction !== 'idle') {
      // A milestone can replace a low-priority gesture; otherwise keep the
      // first reaction and let Flutter's queue coalesce duplicates.
      if (payload.priority === 'milestone') {
        cancel({ silent: true });
        startReaction(reaction, eventId, payload.duration);
      } else {
        queued.push({ reaction, eventId, duration: payload.duration });
      }
      return;
    }
    startReaction(reaction, eventId, payload.duration);
  }

  function cancel(payload = {}) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (!payload.silent) {
      post('reactionCompleted', { eventId: state.eventId, cancelled: true });
    }
    state.reaction = 'idle';
    state.eventId = null;
    actionStartedAt = millis();
    queued = [];
  }

  function speak(payload = {}) {
    const text = String(payload.text || '').trim();
    const utteranceId = payload.utteranceId || null;
    if (!text) return;
    if (state.muted) {
      post('speechUnavailable', { utteranceId, reason: 'muted' });
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      post('speechUnavailable', { utteranceId, reason: 'unsupported' });
      return;
    }
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = payload.lang || 'en-US';
      utterance.rate = 0.92;
      utterance.pitch = 1.08;
      utterance.volume = 1.0;
      const voices = synth.getVoices ? synth.getVoices() : [];
      const preferred = voices.find((voice) =>
        /^(Samantha|Ava|Allison|Google US English|Microsoft Aria)/i.test(voice.name || '')
      );
      const english = preferred || voices.find((voice) => /^en[-_]/i.test(voice.lang || ''));
      if (english) utterance.voice = english;
      utterance.onstart = () => post('speechStarted', { utteranceId });
      utterance.onend = () => post('speechEnded', { utteranceId });
      utterance.onerror = () => post('speechEnded', { utteranceId, failed: true });
      synth.speak(utterance);
    } catch (error) {
      post('speechEnded', { utteranceId, failed: true, error: String(error && error.message || error) });
    }
  }

  function setVisibility(payload = {}) {
    state.visible = payload.visible !== false;
    if (!ready) return;
    if (state.visible && !state.reducedMotion) loop();
    else noLoop();
  }

  function setPreferences(payload = {}) {
    if (typeof payload.reducedMotion === 'boolean') state.reducedMotion = payload.reducedMotion;
    if (typeof payload.muted === 'boolean') state.muted = payload.muted;
    if (state.reducedMotion) frameRate(12);
    else frameRate(60);
    if (!state.visible) noLoop();
  }

  function setLayout(payload = {}) {
    // The WebView normally fills its parent; explicit layout is useful for
    // deterministic previews and simulator screenshots.
    if (Number.isFinite(payload.width) && Number.isFinite(payload.height) && ready) {
      resizeCanvas(payload.width, payload.height);
    }
  }

  function onPointerDown(event) {
    lastPointer = { x: event.clientX, y: event.clientY, at: performance.now() };
  }

  function onPointerUp(event) {
    if (!lastPointer) return;
    const distance = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
    const duration = performance.now() - lastPointer.at;
    lastPointer = null;
    if (distance > 18) return;
    post('interaction', { kind: duration >= 600 ? 'longPress' : 'tap' });
  }

  function bindPointer(canvas) {
    canvas.style.touchAction = 'manipulation';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
  }

  window.setup = function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('stage');
    pixelDensity(Math.min(2, window.devicePixelRatio || 1));
    frameRate(60);
    clear();
    stage = canvas.elt;
    bindPointer(stage);
    ready = true;
    post('ready', {
      protocolVersion: PROTOCOL_VERSION,
      moods: window.YAYA_MOODS || [],
      actions: window.YAYA_ACTIONS || [],
    });
    if (!state.visible) noLoop();
    else drain();
  };

  window.draw = function draw() {
    if (!state.visible) return;
    clear();
    const t = millis() / 1000;
    const age = state.reaction === 'idle' ? t : (millis() - actionStartedAt) / 1000;
    if (state.reaction !== 'idle' && actionDuration > 0 && age > actionDuration + 0.35) {
      finishReaction();
      return;
    }
    if (!window.YayaViews) return;
    const u = unitForCanvas();
    push();
    if (state.reducedMotion) {
      // A stable, low-motion portrait rather than a frozen mid-gesture.
      YayaViews.perform(width / 2, height * 0.91, u, 0, 'idle', 0, false);
    } else {
      YayaViews.perform(width / 2, height * 0.91, u, t, state.reaction, age, false);
    }
    pop();
  };

  window.windowResized = function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
  };

  window.addEventListener('error', (event) => {
    post('error', { code: 'stage_error', message: String(event.message || 'unknown') });
  });

  window.YayaCompanion = Object.freeze({
    protocolVersion: PROTOCOL_VERSION,
    play,
    cancel,
    speak,
    setLayout,
    setVisibility,
    setPreferences,
    isReady: () => ready,
    _messages: () => window.__YAYA_MESSAGES || [],
  });
})();
