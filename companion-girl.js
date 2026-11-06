/**
 * GirlConfig.js
 * Every tunable number the companion uses lives here. Nothing else in the
 * system should hardcode a magic number — if behaviour needs adjusting,
 * this is the file to edit.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};

  GirlCompanion.Config = {
    // --- Assets ---
    ATLAS_JSON_URL: 'girl-assets/atlas.json',
    ATLAS_IMAGE_URL: 'girl-assets/atlas.png',

    // --- Rendering ---
    RENDER_HEIGHT_PX: 96,        // on-screen height; width derives from frame aspect ratio
    Z_INDEX: 999999,
    PIXELATED: true,             // nearest-neighbor, never blur

    // --- Storage ---
    STORAGE_KEY: 'girlCompanion:v1',
    AUTOSAVE_INTERVAL_MS: 15000,

    // --- Decision timing (the "no obvious loops" requirement) ---
    // Every decision waits a random interval inside this range, never a fixed tick.
    DECISION_INTERVAL_MIN_MS: 3500,
    DECISION_INTERVAL_MAX_MS: 11000,
    // How many recent actions to avoid immediately repeating.
    ACTION_HISTORY_LENGTH: 4,

    // --- Movement ---
    WALK_SPEED_PX_S: 46,
    RUN_SPEED_PX_S: 92,
    SCREEN_MARGIN_PX: 24,        // never wander closer than this to viewport edges
    EXCLUSION_SELECTOR: 'button, a, [role="dialog"], dialog, input, textarea, select, .no-companion, #dragon, .dragon, .fav-toggle-btn, .theme-toggle-btn, .dice-btn, .toc-toggle-btn, .easter-egg-btn, .easter-egg-restart-btn, .to-top-btn, .mood-btn, nav, header, .floating-btn, .modal, .overlay, [role="navigation"], [role="banner"]',
    EXCLUSION_PADDING_PX: 14,

    // --- Cursor interaction ---
    CURSOR_NEAR_PX: 90,
    CURSOR_VERY_NEAR_PX: 40,
    CURSOR_FAST_PX_PER_S: 900,
    CURSOR_STILL_MS: 1800,

    // --- Reading behaviour ---
    READING_MIN_DWELL_MS: 4000,
    EMOTIONAL_SECTION_ATTR: 'data-companion-emotional', // host page marks sections with this

    // --- Hidden / rare moments ---
    HIDDEN_MOMENT_CHANCE: 0.05,  // rolled on each decision tick

    // --- Emotional state decay/regen rates (units per second) ---
    STATE_RATES: {
      energy:     { decay: 0.0025, floor: 0.05 },
      comfort:    { decay: 0.0015, floor: 0.1 },
      curiosity:  { decay: 0.0008, floor: 0.05 },
      sleepiness: { growth: 0.0018, ceiling: 1 },
      friendship: { growth: 0.00005, ceiling: 1 },
      confidence: { decay: 0.0006, floor: 0.1 },
      joy:        { decay: 0.0012, floor: 0.05 }
    },

    // --- Accessibility ---
    RESPECT_REDUCED_MOTION: true,
    BATTERY_SAVER_FPS_CAP: 20,

    // --- Debug ---
    DEBUG: false
  };
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlStorage.js
 * Thin, defensive wrapper around localStorage. Every call is try/caught so
 * private browsing, storage quotas, or disabled storage never crash the
 * companion — she just stops remembering, silently.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};

  function isAvailable() {
    try {
      var testKey = '__girlCompanion_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  var available = isAvailable();

  GirlCompanion.Storage = {
    isAvailable: function () { return available; },

    get: function (key, fallback) {
      if (!available) return fallback;
      try {
        var raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },

    set: function (key, value) {
      if (!available) return false;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },

    remove: function (key) {
      if (!available) return;
      try { window.localStorage.removeItem(key); } catch (e) { /* noop */ }
    }
  };
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlMemory.js
 * Everything the companion remembers between visits. Loaded once at init,
 * mutated in memory during the session, autosaved periodically and on
 * pagehide. Pure data + small helpers — no rendering or timing logic here.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};

  function defaultMemory() {
    return {
      version: 1,
      firstVisit: Date.now(),
      lastVisit: Date.now(),
      visitCount: 0,
      totalTimeMs: 0,

      sectionVisits: {},      // { sectionId: count }
      skyVisits: {},          // { skyName: count }
      flowersCollected: 0,
      starsCollected: 0,
      heartsPlaced: 0,
      secretsFound: {},       // { secretId: true }

      lastSection: null,
      lastMood: 'neutral',
      lastPage: null
    };
  }

  function GirlMemory(storageKey) {
    this.storageKey = storageKey;
    this.data = defaultMemory();
    this._sessionStart = Date.now();
  }

  GirlMemory.prototype.load = function () {
    var stored = GirlCompanion.Storage.get(this.storageKey, null);
    if (stored && typeof stored === 'object') {
      // merge onto defaults so new fields introduced by updates don't break old saves
      this.data = Object.assign(defaultMemory(), stored);
    }
    this.data.visitCount += 1;
    this.data.lastVisit = Date.now();
    this._sessionStart = Date.now();
    return this.data;
  };

  GirlMemory.prototype.save = function () {
    this.data.totalTimeMs += (Date.now() - this._sessionStart);
    this._sessionStart = Date.now();
    return GirlCompanion.Storage.set(this.storageKey, this.data);
  };

  GirlMemory.prototype.recordSectionVisit = function (sectionId) {
    if (!sectionId) return;
    this.data.sectionVisits[sectionId] = (this.data.sectionVisits[sectionId] || 0) + 1;
    this.data.lastSection = sectionId;
  };

  GirlMemory.prototype.recordSkyVisit = function (skyName) {
    if (!skyName) return;
    this.data.skyVisits[skyName] = (this.data.skyVisits[skyName] || 0) + 1;
  };

  GirlMemory.prototype.collectFlower = function () { this.data.flowersCollected++; };
  GirlMemory.prototype.collectStar = function () { this.data.starsCollected++; };
  GirlMemory.prototype.placeHeart = function () { this.data.heartsPlaced++; };

  GirlMemory.prototype.findSecret = function (id) {
    var isNew = !this.data.secretsFound[id];
    this.data.secretsFound[id] = true;
    return isNew;
  };

  GirlMemory.prototype.setMood = function (mood) { this.data.lastMood = mood; };

  GirlMemory.prototype.favoriteSection = function () {
    return topKey(this.data.sectionVisits);
  };

  GirlMemory.prototype.favoriteSky = function () {
    return topKey(this.data.skyVisits);
  };

  GirlMemory.prototype.isReturningVisitor = function () {
    return this.data.visitCount > 1;
  };

  function topKey(map) {
    var best = null, bestCount = -1;
    for (var k in map) {
      if (map.hasOwnProperty(k) && map[k] > bestCount) {
        best = k; bestCount = map[k];
      }
    }
    return best;
  }

  GirlCompanion.Memory = GirlMemory;
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlEvents.js
 * A minimal pub/sub bus so modules don't need direct references to each
 * other. Also centralizes the handful of raw DOM listeners the companion
 * needs (visibility, motion preference, resize) so they're wired once.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};

  function EventBus() {
    this._listeners = {};
  }

  EventBus.prototype.on = function (event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return this;
  };

  EventBus.prototype.off = function (event, fn) {
    var list = this._listeners[event];
    if (!list) return this;
    this._listeners[event] = list.filter(function (f) { return f !== fn; });
    return this;
  };

  EventBus.prototype.emit = function (event) {
    var list = this._listeners[event];
    if (!list) return;
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < list.length; i++) {
      try { list[i].apply(null, args); } catch (e) { /* one bad listener shouldn't kill the bus */ }
    }
  };

  GirlCompanion.EventBus = EventBus;

  /**
   * Wires the shared environmental DOM listeners onto a bus.
   * Returns a teardown function.
   */
  GirlCompanion.wireEnvironmentEvents = function (bus) {
    var teardowns = [];

    function add(target, type, handler, opts) {
      target.addEventListener(type, handler, opts);
      teardowns.push(function () { target.removeEventListener(type, handler, opts); });
    }

    add(document, 'visibilitychange', function () {
      bus.emit(document.hidden ? 'page:hidden' : 'page:visible');
    });

    add(window, 'resize', function () {
      bus.emit('viewport:resize', { width: window.innerWidth, height: window.innerHeight });
    });

    add(window, 'scroll', function () {
      bus.emit('viewport:scroll', { y: window.scrollY });
    }, { passive: true });

    var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (motionQuery) {
      var onMotionChange = function () { bus.emit('motion:preference', { reduced: motionQuery.matches }); };
      onMotionChange();
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', onMotionChange);
        teardowns.push(function () { motionQuery.removeEventListener('change', onMotionChange); });
      }
    }

    if (navigator.getBattery) {
      navigator.getBattery().then(function (battery) {
        var onLevelChange = function () {
          bus.emit('battery:status', { saver: battery.level <= 0.2 && !battery.charging });
        };
        onLevelChange();
        battery.addEventListener('levelchange', onLevelChange);
        battery.addEventListener('chargingchange', onLevelChange);
      }).catch(function () { /* battery API not available, ignore */ });
    }

    add(document, 'mousemove', function (e) {
      bus.emit('cursor:move', { x: e.clientX, y: e.clientY, t: performance.now() });
    }, { passive: true });

    return function teardown() {
      teardowns.forEach(function (fn) { fn(); });
    };
  };
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlAnimationController.js
 * Drives frame-by-frame playback of whatever animation is currently active,
 * against the manifest produced from the sprite sheet. Knows nothing about
 * canvas or DOM — GirlRenderer reads currentFrame() from this and draws it.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};

  function GirlAnimationController(manifest) {
    this.manifest = manifest; // { meta, animations: { name: {frames, fps, loop, fallback} } }
    this.current = null;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.flipped = false;
    this.onComplete = null;
    this._playDefault();
  }

  GirlAnimationController.prototype._playDefault = function () {
    if (this.manifest.animations.idle) this.play('idle');
  };

  /**
   * Play an animation by name. If it isn't in the manifest (sprite sheet
   * didn't include it), gracefully falls back to 'idle' rather than throwing
   * or freezing on a blank frame — this satisfies the spec's "if an
   * animation is missing, gracefully fall back" requirement.
   */
  GirlAnimationController.prototype.play = function (name, opts) {
    opts = opts || {};
    var anim = this.manifest.animations[name];
    if (!anim || !anim.frames || !anim.frames.length) {
      if (name !== 'idle' && this.manifest.animations.idle) {
        return this.play('idle', opts);
      }
      return; // nothing playable at all — renderer will just hold last frame
    }
    if (this.currentName === name && !opts.restart) return;

    this.currentName = name;
    this.current = anim;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.flipped = !!opts.flip;
    this.onComplete = opts.onComplete || null;
  };

  GirlAnimationController.prototype.setFlip = function (flipped) {
    this.flipped = flipped;
  };

  /** Advance playback. dtMs = milliseconds since last update. */
  GirlAnimationController.prototype.update = function (dtMs) {
    if (!this.current) return;
    var fps = this.current.fps || 6;
    var frameDuration = 1000 / fps;
    this.elapsed += dtMs;

    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.frameIndex++;
      if (this.frameIndex >= this.current.frames.length) {
        if (this.current.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = this.current.frames.length - 1;
          if (this.onComplete) {
            var cb = this.onComplete;
            this.onComplete = null;
            cb();
          }
        }
      }
    }
  };

  GirlAnimationController.prototype.currentFrame = function () {
    if (!this.current) return null;
    return this.current.frames[this.frameIndex];
  };

  GirlAnimationController.prototype.isFinished = function () {
    if (!this.current || this.current.loop) return false;
    return this.frameIndex >= this.current.frames.length - 1 && this.elapsed === 0;
  };

  GirlCompanion.AnimationController = GirlAnimationController;
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlRenderer.js
 * Owns the DOM: a single absolutely-positioned <canvas>, drawn at device
 * pixel ratio, nearest-neighbor only (never blurred), never intercepting
 * pointer events. Purely a dumb painter — it draws whatever frame rect and
 * position it's told to, every tick.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};
  var Config = GirlCompanion.Config;

  function GirlRenderer(atlasImage, container) {
    this.atlasImage = atlasImage;
    this.container = container || document.body;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    var style = this.canvas.style;
    style.position = 'fixed';
    style.left = '0px';
    style.top = '0px';
    style.pointerEvents = 'none';   // never intercepts clicks
    style.zIndex = String(Config.Z_INDEX);
    style.imageRendering = 'pixelated'; // nearest-neighbor, standards property
    style.willChange = 'transform';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this._blinking = false;

    style.opacity = '0';
    (function fadeIn(canvas) {
      var op = 0;
      (function tick() {
        op += 0.04;
        if (op >= 1) { canvas.style.opacity = '1'; return; }
        canvas.style.opacity = String(op);
        requestAnimationFrame(tick);
      })();
    })(this.canvas);

    this.container.appendChild(this.canvas);

    this._boundResize = this._resize.bind(this);
    window.addEventListener('resize', this._boundResize);
  }

  GirlRenderer.prototype.blink = function () {
    this._blinking = true;
    var self = this;
    setTimeout(function () { self._blinking = false; }, 120);
  };

  GirlRenderer.prototype._resize = function () {
    this.dpr = window.devicePixelRatio || 1;
  };

  /**
   * Draw one frame.
   * frameRect: {x,y,w,h} within the atlas image (source pixels).
   * pos: {x,y} top-left position on screen (CSS pixels).
   * flipped: mirror horizontally (used for walking left vs right).
   */
  GirlRenderer.prototype.draw = function (frameRect, pos, flipped) {
    if (!frameRect) return;

    var aspect = frameRect.w / frameRect.h;
    var destH = Config.RENDER_HEIGHT_PX;
    var destW = destH * aspect;

    // size the backing canvas to cover viewport once; cheap since it's transparent-cleared each frame
    var vw = window.innerWidth, vh = window.innerHeight;
    var neededW = Math.round(vw * this.dpr);
    var neededH = Math.round(vh * this.dpr);
    if (this.canvas.width !== neededW || this.canvas.height !== neededH) {
      this.canvas.width = neededW;
      this.canvas.height = neededH;
      this.canvas.style.width = vw + 'px';
      this.canvas.style.height = vh + 'px';
    }

    var ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    ctx.save();
    if (flipped) {
      ctx.translate(pos.x + destW, pos.y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.atlasImage, frameRect.x, frameRect.y, frameRect.w, frameRect.h, 0, 0, destW, destH);
    } else {
      ctx.drawImage(this.atlasImage, frameRect.x, frameRect.y, frameRect.w, frameRect.h, pos.x, pos.y, destW, destH);
    }
    ctx.restore();

    this._lastDestW = destW;
    this._lastDestH = destH;

    if (this._blinking) {
      var eyeY = pos.y + destH * 0.33;
      var eyeW = destW * 0.1;
      var eyeH = destH * 0.022;
      ctx.fillStyle = '#42352b';
      ctx.fillRect(pos.x + destW * 0.3 - eyeW / 2, eyeY, eyeW, eyeH);
      ctx.fillRect(pos.x + destW * 0.7 - eyeW / 2, eyeY, eyeW, eyeH);
    }
  };

  GirlRenderer.prototype.lastSize = function () {
    return { w: this._lastDestW || Config.RENDER_HEIGHT_PX, h: this._lastDestH || Config.RENDER_HEIGHT_PX };
  };

  GirlRenderer.prototype.setVisible = function (visible) {
    this.canvas.style.display = visible ? '' : 'none';
  };

  GirlRenderer.prototype.destroy = function () {
    window.removeEventListener('resize', this._boundResize);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  GirlCompanion.Renderer = GirlRenderer;

  /** Loads the atlas image + manifest JSON. Returns a Promise. */
  GirlCompanion.loadAssets = function () {
    var imgPromise = new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = Config.ATLAS_IMAGE_URL;
    });
    var jsonPromise = fetch(Config.ATLAS_JSON_URL).then(function (r) { return r.json(); });
    return Promise.all([imgPromise, jsonPromise]).then(function (results) {
      return { image: results[0], manifest: results[1] };
    });
  };
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlStateMachine.js
 * Two responsibilities:
 *  1. Continuously evolve a small set of emotional variables (energy,
 *     comfort, curiosity, sleepiness, friendship, confidence, joy) based on
 *     context (time of day, scrolling, music, weather, idle duration).
 *  2. On an irregular schedule (never a fixed interval — that's what makes
 *     it feel alive rather than looping), pick the next behaviour from a
 *     weighted pool that both the emotional state and current context bias.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};
  var Config = GirlCompanion.Config;

  // The full behaviour pool. Each entry: name, base weight, and an optional
  // weight() function that adjusts likelihood based on live state/context.
  // "anim" is the animation to play; some behaviours are movement-only
  // (handled by GirlNavigation) and reuse walk/idle animations.
  var BEHAVIOURS = [
    { name: 'sit',            anim: 'sit',        base: 3, weight: function (s) { return s.energy < 0.4 ? 2 : 1; } },
    { name: 'walkSlowly',     anim: 'walk',        base: 4, kind: 'move' },
    { name: 'lookAround',     anim: 'lookAround',  base: 3, weight: function (s) { return 1 + s.curiosity; } },
    { name: 'blink',          anim: 'blink',       base: 2 },
    { name: 'stretch',        anim: 'stretch',     base: 2, weight: function (s) { return s.energy < 0.5 ? 2 : 0.5; } },
    { name: 'sleep',          anim: 'sleep',       base: 1, weight: function (s, c) { return s.sleepiness > 0.6 ? 4 : (c.isNight ? 1.5 : 0.2); } },
    { name: 'wake',           anim: 'idle',        base: 0.5 },
    { name: 'wave',           anim: 'wave',        base: 1, weight: function (s) { return s.friendship > 0.5 ? 2 : 0.7; } },
    { name: 'inspectFlowers', anim: 'touchFlower',  base: 1.5 },
    { name: 'inspectStars',   anim: 'collectStar',  base: 1, weight: function (s, c) { return c.isNight ? 2.5 : 0.3; } },
    { name: 'lookUpward',     anim: 'lookAtSky',    base: 1.5 },
    { name: 'lookAtCursor',   anim: 'thinking',     base: 1, kind: 'cursor' },
    { name: 'walkToLocation', anim: 'walk',         base: 3, kind: 'move' },
    { name: 'readNearbyText', anim: 'reading',       base: 1, kind: 'reading' },
    { name: 'admireImages',   anim: 'lookAround',    base: 1 },
    { name: 'watchSkies',     anim: 'gazeAtMoon',    base: 1, weight: function (s, c) { return c.isNight ? 2 : 0.4; } },
    { name: 'watchRain',      anim: 'umbrella',      base: 0, weight: function (s, c) { return c.weather === 'rain' ? 6 : 0; } },
    { name: 'watchSnow',      anim: 'lookAtSky',     base: 0, weight: function (s, c) { return c.weather === 'snow' ? 6 : 0; } },
    { name: 'collectFlowers', anim: 'collectFlower', base: 1.5, weight: function (s) { return s.joy > 0.5 ? 2 : 1; } },
    { name: 'collectStars',   anim: 'collectStar',   base: 1 },
    { name: 'leaveHearts',    anim: 'heart',         base: 0.8, weight: function (s) { return s.friendship > 0.6 ? 2.5 : 0.5; } },
    { name: 'yawn',           anim: 'yawn',          base: 1, weight: function (s) { return s.sleepiness > 0.5 ? 3 : 0.3; } },
    { name: 'thinking',       anim: 'thinking',      base: 1 },
    { name: 'dance',          anim: 'dance',         base: 0.6, weight: function (s, c) { return c.musicPlaying ? 3 : 0.1; } },
    { name: 'petCat',         anim: 'petCat',        base: 0.8, weight: function (s, c) { return c.cursorStillNear ? 3 : 0; } },
    { name: 'listenMusic',    anim: 'listenMusic',   base: 0.8, weight: function (s, c) { return c.musicPlaying ? 2.5 : 0; } },
    { name: 'drinkTea',       anim: 'drinkTea',      base: 1, weight: function (s, c) { return (c.isNight || s.comfort > 0.7) ? 2.5 : 0.5; } },
    { name: 'shy',            anim: 'shy',           base: 0.6, weight: function (s, c) { return c.shyTrigger ? 4 : 0; } },
    { name: 'turnAround',     anim: 'turnAround',    base: 0.8 },
    { name: 'point',          anim: 'point',         base: 0.8, weight: function (s, c) { return c.sectionType === 'new' ? 2 : 0.5; } },
    { name: 'sad',            anim: 'sad',           base: 0.5, weight: function (s) { return s.friendship < 0.3 ? 3 : 0.2; } },
    { name: 'spin',           anim: 'spin',          base: 0.4, weight: function (s) { return s.joy > 0.8 ? 3 : 0; } },
    { name: 'idle',           anim: 'idle',          base: 5 } // always available baseline
  ];

  // Very rare "hidden moments" — rolled separately, small chance per decision.
  var HIDDEN_MOMENTS = [
    { name: 'screenCorner', anim: 'sitOnCloud', kind: 'move-corner' },
    { name: 'fallAsleep',   anim: 'sleep' },
    { name: 'watchStars',   anim: 'gazeAtMoon' },
    { name: 'drawHearts',   anim: 'heart' },
    { name: 'waveAtNothing',anim: 'wave' },
    { name: 'stareIntoDistance', anim: 'thinking' },
    { name: 'sitUnderTree', anim: 'sitUnderTree' },
    { name: 'playFlute',    anim: 'playFlute' },
    { name: 'fishInClouds', anim: 'fishInClouds' },
    { name: 'readBook',     anim: 'readBook' },
    { name: 'watchButterfly', anim: 'watchButterfly' }
  ];

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function GirlStateMachine(bus) {
    this.bus = bus;
    this.state = {
      energy: 0.8, comfort: 0.7, curiosity: 0.6,
      sleepiness: 0.2, friendship: 0.3, confidence: 0.6, joy: 0.6
    };
    this.context = {
      isNight: false, weather: 'clear', musicPlaying: false,
      sectionType: 'normal', idleDurationMs: 0, scrolling: false,
      cursorStillNear: false, shyTrigger: false
    };
    this.history = [];
    this._nextDecisionAt = 0;
    this._clock = 0;
  }

  GirlStateMachine.prototype.setContext = function (patch) {
    Object.assign(this.context, patch);
  };

  GirlStateMachine.prototype.notifyInteraction = function (kind) {
    // interacting with the visitor nudges friendship/joy/confidence up a little
    this.state.friendship = clamp01(this.state.friendship + 0.01);
    this.state.joy = clamp01(this.state.joy + 0.02);
    this.state.confidence = clamp01(this.state.confidence + 0.01);
  };

  GirlStateMachine.prototype.tick = function (dtMs) {
    this._clock += dtMs;
    var dtS = dtMs / 1000;
    var rates = Config.STATE_RATES;
    var s = this.state, c = this.context;

    s.energy = clamp01(s.energy - rates.energy.decay * dtS * (c.scrolling ? 1.5 : 1));
    s.comfort = clamp01(s.comfort - rates.comfort.decay * dtS + (c.sectionType === 'cozy' ? 0.002 * dtS : 0));
    s.curiosity = clamp01(s.curiosity - rates.curiosity.decay * dtS + (c.sectionType === 'new' ? 0.01 * dtS : 0));
    s.sleepiness = clamp01(s.sleepiness + rates.sleepiness.growth * dtS * (c.isNight ? 1.6 : 1));
    s.friendship = clamp01(s.friendship + rates.friendship.growth * dtS);
    s.confidence = clamp01(s.confidence - rates.confidence.decay * dtS);
    s.joy = clamp01(s.joy - rates.joy.decay * dtS + (c.musicPlaying ? 0.004 * dtS : 0));

    if (this._clock >= this._nextDecisionAt) {
      this._scheduleNext();
      return this._decide();
    }
    return null;
  };

  GirlStateMachine.prototype._scheduleNext = function () {
    var min = Config.DECISION_INTERVAL_MIN_MS, max = Config.DECISION_INTERVAL_MAX_MS;
    this._nextDecisionAt = this._clock + (min + Math.random() * (max - min));
  };

  GirlStateMachine.prototype._decide = function () {
    if (Math.random() < Config.HIDDEN_MOMENT_CHANCE) {
      var hidden = HIDDEN_MOMENTS[Math.floor(Math.random() * HIDDEN_MOMENTS.length)];
      this._pushHistory(hidden.name);
      this.bus.emit('behaviour:decided', hidden);
      return hidden;
    }

    var s = this.state, c = this.context;
    var pool = [];
    var totalWeight = 0;
    for (var i = 0; i < BEHAVIOURS.length; i++) {
      var b = BEHAVIOURS[i];
      if (this.history.indexOf(b.name) !== -1) continue; // avoid immediate repeats
      var w = b.weight ? b.base * Math.max(0, b.weight(s, c)) : b.base;
      if (w <= 0) continue;
      pool.push({ b: b, w: w });
      totalWeight += w;
    }
    if (!pool.length) return { name: 'idle', anim: 'idle' };

    var roll = Math.random() * totalWeight;
    for (var j = 0; j < pool.length; j++) {
      roll -= pool[j].w;
      if (roll <= 0) {
        this._pushHistory(pool[j].b.name);
        this.bus.emit('behaviour:decided', pool[j].b);
        return pool[j].b;
      }
    }
    var last = pool[pool.length - 1].b;
    this._pushHistory(last.name);
    return last;
  };

  GirlStateMachine.prototype._pushHistory = function (name) {
    this.history.push(name);
    if (this.history.length > Config.ACTION_HISTORY_LENGTH) this.history.shift();
  };

  GirlCompanion.StateMachine = GirlStateMachine;
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlNavigation.js — Enhanced
 * Owns the companion's position and how it changes over time: picking safe
 * wander targets, stepping toward them at a given speed, following the
 * cursor slowly, and teleporting. Never places her on top of buttons,
 * links, dialogs, or other excluded UI.
 *
 * Enhanced with:
 * - Steering avoidance (reroutes around obstacles mid-path)
 * - Smooth easing on arrival
 * - Momentum/inertia for natural movement
 * - Wall sliding along obstacles
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};
  var Config = GirlCompanion.Config;

  function GirlNavigation(getSize) {
    this.getSize = getSize;
    this.pos = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.7 };
    this.target = null;
    this.speed = Config.WALK_SPEED_PX_S;
    this.facingRight = true;
    this._exclusions = [];
    this._rescanExclusions();
    this._rescanTimer = setInterval(this._rescanExclusions.bind(this), 2000);

    // movement physics
    this.vx = 0;
    this.vy = 0;
    this.friction = 0.85;
    this._idlePhase = 0;
    this._idleSway = 0;
  }

  GirlNavigation.prototype._rescanExclusions = function () {
    var els = document.querySelectorAll(Config.EXCLUSION_SELECTOR);
    var pad = Config.EXCLUSION_PADDING_PX;
    var rects = [];
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      rects.push({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
    }
    this._exclusions = rects;
  };

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  GirlNavigation.prototype._isSafe = function (x, y) {
    var size = this.getSize();
    var margin = Config.SCREEN_MARGIN_PX;
    if (x < margin || y < margin || x + size.w > window.innerWidth - margin || y + size.h > window.innerHeight - margin) {
      return false;
    }
    var box = { x: x, y: y, w: size.w, h: size.h };
    for (var i = 0; i < this._exclusions.length; i++) {
      if (rectsOverlap(box, this._exclusions[i])) return false;
    }
    return true;
  };

  GirlNavigation.prototype._findSafeNear = function (x, y) {
    if (this._isSafe(x, y)) return { x: x, y: y };
    for (var r = 8; r < 100; r += 10) {
      for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 5) {
        var nx = x + Math.cos(angle) * r;
        var ny = y + Math.sin(angle) * r;
        if (this._isSafe(nx, ny)) return { x: nx, y: ny };
      }
    }
    return null;
  };

  GirlNavigation.prototype.pickWanderTarget = function () {
    var size = this.getSize();
    var margin = Config.SCREEN_MARGIN_PX;
    for (var attempt = 0; attempt < 20; attempt++) {
      var x = margin + Math.random() * (window.innerWidth - margin * 2 - size.w);
      var y = margin + Math.random() * (window.innerHeight - margin * 2 - size.h);
      if (this._isSafe(x, y)) return { x: x, y: y };
    }
    // fallback: near current position
    for (var a = 0; a < 12; a++) {
      var angle = (a / 12) * Math.PI * 2;
      var dist = 50 + Math.random() * 80;
      var tx = this.pos.x + Math.cos(angle) * dist;
      var ty = this.pos.y + Math.sin(angle) * dist;
      var safe = this._findSafeNear(tx, ty);
      if (safe) return safe;
    }
    return null;
  };

  GirlNavigation.prototype.findEmptyArea = function () {
    var size = this.getSize();
    var margin = Config.SCREEN_MARGIN_PX;
    var vw = window.innerWidth, vh = window.innerHeight;
    // grid scan: find the largest gap with no exclusions
    var best = null, bestScore = 0;
    var step = 60;
    for (var x = margin; x < vw - margin - size.w; x += step) {
      for (var y = margin; y < vh - margin - size.h; y += step) {
        if (this._isSafe(x, y)) {
          // score: prefer corners and edges (more "empty" feeling)
          var edgeDist = Math.min(x, y, vw - x - size.w, vh - y - size.h);
          var score = edgeDist + Math.random() * 40;
          if (score > bestScore) { bestScore = score; best = { x: x, y: y }; }
        }
      }
    }
    return best;
  };

  GirlNavigation.prototype.moveTo = function (point, opts) {
    opts = opts || {};
    this.target = point;
    this.speed = opts.run ? Config.RUN_SPEED_PX_S : Config.WALK_SPEED_PX_S;
    this.facingRight = point.x >= this.pos.x;
  };

  GirlNavigation.prototype.teleport = function (point) {
    this.pos = point;
    this.target = null;
    this.vx = 0;
    this.vy = 0;
  };

  GirlNavigation.prototype.stop = function () {
    this.target = null;
  };

  GirlNavigation.prototype.isMoving = function () {
    return !!this.target;
  };

  /** Check if a point is inside any exclusion zone. */
  GirlNavigation.prototype._isInObstacle = function (x, y) {
    var size = this.getSize();
    var box = { x: x - size.w / 2, y: y - size.h / 2, w: size.w, h: size.h };
    for (var i = 0; i < this._exclusions.length; i++) {
      if (rectsOverlap(box, this._exclusions[i])) return this._exclusions[i];
    }
    return null;
  };

  /** Compute avoidance force: push away from nearby obstacles. */
  GirlNavigation.prototype._avoidanceForce = function (x, y) {
    var size = this.getSize();
    var forceX = 0, forceY = 0;
    var box = { x: x - size.w / 2, y: y - size.h / 2, w: size.w, h: size.h };

    for (var i = 0; i < this._exclusions.length; i++) {
      var obs = this._exclusions[i];
      if (!rectsOverlap(box, obs)) continue;

      var ocx = obs.x + obs.w / 2;
      var ocy = obs.y + obs.h / 2;
      var pushX = x - ocx;
      var pushY = y - ocy;
      var pushLen = Math.hypot(pushX, pushY) || 1;
      forceX += (pushX / pushLen) * 40;
      forceY += (pushY / pushLen) * 40;
    }
    return (forceX !== 0 || forceY !== 0) ? { x: forceX, y: forceY } : null;
  };

  /** Wall slide: if pressed against obstacle, slide along its edge. */
  GirlNavigation.prototype._wallSlide = function (x, y, vx, vy) {
    var size = this.getSize();
    var box = { x: x - size.w / 2, y: y - size.h / 2, w: size.w, h: size.h };

    for (var i = 0; i < this._exclusions.length; i++) {
      var obs = this._exclusions[i];
      if (!rectsOverlap(box, obs)) continue;

      var dx = x - (obs.x + obs.w / 2);
      var dy = y - (obs.y + obs.h / 2);
      var scaleX = obs.w / 2 + size.w / 2;
      var scaleY = obs.h / 2 + size.h / 2;
      var overlapX = scaleX - Math.abs(dx);
      var overlapY = scaleY - Math.abs(dy);

      if (overlapX < overlapY) {
        return { x: 0, y: vy * 0.5, pushX: Math.sign(dx) * overlapX };
      } else {
        return { x: vx * 0.5, y: 0, pushY: Math.sign(dy) * overlapY };
      }
    }
    return null;
  };

  GirlNavigation.prototype.update = function (dtMs) {
    if (!this.target) {
      this._idlePhase += dtMs / 1000;
      this._idleSway = Math.sin(this._idlePhase * 0.8) * 0.3;
      return false;
    }

    var dtS = dtMs / 1000;
    var dx = this.target.x - this.pos.x;
    var dy = this.target.y - this.pos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var step = this.speed * dtS;

    // arrival easing
    var ease = dist < 50 ? Math.max(0.3, dist / 50) : 1;

    // desired velocity
    var desVx = dist > 0 ? (dx / dist) * this.speed * ease : 0;
    var desVy = dist > 0 ? (dy / dist) * this.speed * ease : 0;

    // avoidance
    var avoid = this._avoidanceForce(this.pos.x, this.pos.y);
    if (avoid) {
      desVx += avoid.x;
      desVy += avoid.y;
    }

    // smooth steering with momentum
    this.vx = this.vx * this.friction + desVx * (1 - this.friction);
    this.vy = this.vy * this.friction + desVy * (1 - this.friction);

    var newX = this.pos.x + this.vx * dtS;
    var newY = this.pos.y + this.vy * dtS;

    // wall slide
    var slide = this._wallSlide(newX, newY, this.vx, this.vy);
    if (slide) {
      if (slide.pushX) newX += slide.pushX;
      if (slide.pushY) newY += slide.pushY;
      this.vx = slide.x;
      this.vy = slide.y;
    }

    // clamp to viewport
    var size = this.getSize();
    var margin = Config.SCREEN_MARGIN_PX;
    newX = Math.max(margin, Math.min(window.innerWidth - size.w - margin, newX));
    newY = Math.max(margin, Math.min(window.innerHeight - size.h - margin, newY));

    // safety check — if new position is unsafe, try nearest safe spot
    if (!this._isSafe(newX, newY)) {
      var safe = this._findSafeNear(newX, newY);
      if (safe) {
        newX = safe.x;
        newY = safe.y;
      } else {
        // truly stuck — stop
        this.target = null;
        this.vx = 0;
        this.vy = 0;
        return false;
      }
    }

    this.pos = { x: newX, y: newY };
    this.facingRight = dx >= 0;

    // arrived?
    var finalDist = Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y);
    if (finalDist <= step || finalDist < 2) {
      this.pos = { x: this.target.x, y: this.target.y };
      this.target = null;
      this.vx = 0;
      this.vy = 0;
      return true;
    }

    return true;
  };

  GirlNavigation.prototype.stepBack = function (fromX) {
    var dir = this.pos.x < fromX ? -1 : 1;
    var size = this.getSize();
    var target = { x: clamp(this.pos.x + dir * 40, Config.SCREEN_MARGIN_PX, window.innerWidth - size.w - Config.SCREEN_MARGIN_PX), y: this.pos.y };
    this.moveTo(target);
  };

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  GirlNavigation.prototype.destroy = function () {
    clearInterval(this._rescanTimer);
  };

  GirlCompanion.Navigation = GirlNavigation;
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlInteractions.js
 * Treats the mouse cursor as a character she reacts to, and watches which
 * part of the page the visitor is dwelling on so she can wander over,
 * "read", and linger longer near emotional content.
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};
  var Config = GirlCompanion.Config;

  function GirlInteractions(bus, navigation) {
    this.bus = bus;
    this.navigation = navigation;
    this.cursor = { x: -9999, y: -9999 };
    this._lastCursor = null;
    this._stillSince = 0;
    this._readingObserver = null;
    this._sectionObserver = null;

    bus.on('cursor:move', this._onCursorMove.bind(this));
    this._setupReadingObserver();
    this._setupSectionObserver();
  }

  GirlInteractions.prototype._onCursorMove = function (data) {
    var prev = this._lastCursor;
    this.cursor = { x: data.x, y: data.y };
    this._lastCursor = { x: data.x, y: data.y, t: data.t };

    if (prev) {
      var dt = (data.t - prev.t) || 16;
      var dist = Math.hypot(data.x - prev.x, data.y - prev.y);
      var speed = dist / (dt / 1000);
      if (speed > Config.CURSOR_FAST_PX_PER_S) {
        this.bus.emit('cursor:fastMove', { speed: speed });
      }
      this._stillSince = dist > 3 ? performance.now() : (this._stillSince || performance.now());
    }
  };

  /** Call every tick with the companion's current on-screen center. */
  GirlInteractions.prototype.evaluateProximity = function (companionCenter) {
    var dist = Math.hypot(this.cursor.x - companionCenter.x, this.cursor.y - companionCenter.y);
    var isStill = this._stillSince && (performance.now() - this._stillSince) > Config.CURSOR_STILL_MS;
    var stillNear = isStill && dist < Config.CURSOR_NEAR_PX;

    if (this._lastStillNear !== stillNear) {
      this._lastStillNear = stillNear;
      this.bus.emit('cursor:stillNear', { near: stillNear });
    }

    if (dist < Config.CURSOR_VERY_NEAR_PX) {
      return { zone: 'veryNear', dist: dist, cursorStill: isStill };
    }
    if (dist < Config.CURSOR_NEAR_PX) {
      return { zone: 'near', dist: dist, cursorStill: isStill };
    }
    return { zone: 'far', dist: dist, cursorStill: isStill };
  };

  GirlInteractions.prototype._setupReadingObserver = function () {
    if (typeof IntersectionObserver === 'undefined') return;
    var self = this;
    var paragraphs = document.querySelectorAll('p, article, .companion-readable');
    if (!paragraphs.length) return;

    var dwellTimers = new WeakMap();
    this._readingObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var timer = setTimeout(function () {
            var rect = entry.target.getBoundingClientRect();
            self.bus.emit('reading:candidate', {
              el: entry.target,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              emotional: entry.target.closest('[' + Config.EMOTIONAL_SECTION_ATTR + ']') !== null
            });
          }, Config.READING_MIN_DWELL_MS);
          dwellTimers.set(entry.target, timer);
        } else {
          var t = dwellTimers.get(entry.target);
          if (t) clearTimeout(t);
        }
      });
    }, { threshold: 0.6 });

    paragraphs.forEach(function (p) { self._readingObserver.observe(p); });
  };

  GirlInteractions.prototype._setupSectionObserver = function () {
    if (typeof IntersectionObserver === 'undefined') return;
    var self = this;
    var sections = document.querySelectorAll('section, [data-companion-section]');
    if (!sections.length) return;

    this._sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          var id = entry.target.id || entry.target.getAttribute('data-companion-section') || entry.target.tagName;
          self.bus.emit('section:change', { id: id, el: entry.target });
        }
      });
    }, { threshold: [0.5] });

    sections.forEach(function (s) { self._sectionObserver.observe(s); });
  };

  GirlInteractions.prototype.destroy = function () {
    if (this._readingObserver) this._readingObserver.disconnect();
    if (this._sectionObserver) this._sectionObserver.disconnect();
  };

  GirlCompanion.Interactions = GirlInteractions;
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlCompanion.js
 * Public API. Everything else in this system is an internal module reached
 * only through here. Usage:
 *
 *   GirlCompanion.init({ container: document.body }).then(() => { ... });
 *   GirlCompanion.pause();  GirlCompanion.resume();  GirlCompanion.destroy();
 *   GirlCompanion.setWeather('rain');  GirlCompanion.setSky('night');
 *   GirlCompanion.teleport({x: 100, y: 400});
 */
(function (root) {
  'use strict';

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};
  var Config = GirlCompanion.Config;

  var instance = null;

  function Instance() {
    this.bus = new GirlCompanion.EventBus();
    this.memory = new GirlCompanion.Memory(Config.STORAGE_KEY);
    this.paused = false;
    this.destroyed = false;
    this.reducedMotion = false;
    this.batterySaver = false;
    this._lastFrameTime = null;
    this._raf = null;
    this._teardownEnv = null;
    this._autosaveTimer = null;
  }

  Instance.prototype.init = function (options) {
    options = options || {};
    var self = this;

    return GirlCompanion.loadAssets().then(function (assets) {
      self.memory.load();

      self.renderer = new GirlCompanion.Renderer(assets.image, options.container);
      self.anim = new GirlCompanion.AnimationController(assets.manifest);
      self.navigation = new GirlCompanion.Navigation(function () { return self.renderer.lastSize(); });
      self.state = new GirlCompanion.StateMachine(self.bus);
      self.interactions = new GirlCompanion.Interactions(self.bus, self.navigation);

      self._teardownEnv = GirlCompanion.wireEnvironmentEvents(self.bus);
      self._wireBusHandlers();

      self._autosaveTimer = setInterval(function () { self.memory.save(); }, Config.AUTOSAVE_INTERVAL_MS);
      window.addEventListener('pagehide', function () { self.memory.save(); });

      self._lastFrameTime = performance.now();
      self._loop();

      if (self.memory.isReturningVisitor()) {
        self.anim.play('happy');
        self._emitParticles('sparkles');
      }

      return self;
    });
  };

  Instance.prototype._wireBusHandlers = function () {
    var self = this;

    self.bus.on('page:hidden', function () { self.pause(); });
    self.bus.on('page:visible', function () { self.resume(); });

    self.bus.on('motion:preference', function (data) {
      self.reducedMotion = data.reduced && Config.RESPECT_REDUCED_MOTION;
    });

    self.bus.on('battery:status', function (data) { self.batterySaver = data.saver; });

    self.bus.on('viewport:scroll', function () {
      self.state.setContext({ scrolling: true });
      clearTimeout(self._scrollStopTimer);
      self._scrollStopTimer = setTimeout(function () {
        self.state.setContext({ scrolling: false });
      }, 400);
    });

    self.bus.on('section:change', function (data) {
      self.memory.recordSectionVisit(data.id);
      var isNew = !self._lastSeenSection || self._lastSeenSection !== data.id;
      self._lastSeenSection = data.id;
      var emotional = data.el.hasAttribute(Config.EMOTIONAL_SECTION_ATTR);
      self.state.setContext({ sectionType: emotional ? 'cozy' : (isNew ? 'new' : 'normal') });
      if (isNew && self.memory.data.sectionVisits[data.id] === 1) {
        self.anim.play('celebrate', { onComplete: function () { self.anim.play('idle'); } });
        self._emitParticles('sparkles');
      }
      if (emotional) {
        self._emitParticles('flowers');
      }
    });

    self.bus.on('reading:candidate', function (data) {
      if (self.paused || self.navigation.isMoving()) return;
      var target = { x: data.x - self.renderer.lastSize().w / 2, y: data.y + 30 };
      self.navigation.moveTo(target);
      self.anim.play('reading');
      if (data.emotional) {
        self.state.state.comfort = Math.min(1, self.state.state.comfort + 0.05);
        self._emitParticles('hearts');
      }
    });

    self.bus.on('cursor:fastMove', function () {
      if (Math.random() < 0.4) {
        self.anim.play('surprised', { onComplete: function () { self.anim.play('idle'); } });
        self._emitParticles('sparkles');
      }
      self.state.setContext({ shyTrigger: true });
      clearTimeout(self._shyTimer);
      self._shyTimer = setTimeout(function () {
        self.state.setContext({ shyTrigger: false });
      }, 8000);
    });

    self.bus.on('cursor:stillNear', function (data) {
      self.state.setContext({ cursorStillNear: data.near });
    });
  };

  Instance.prototype._loop = function () {
    var self = this;
    this._raf = requestAnimationFrame(function (now) {
      if (self.destroyed) return;
      var dt = now - self._lastFrameTime;
      self._lastFrameTime = now;

      if (!self.paused) {
        var fpsCap = self.batterySaver ? Config.BATTERY_SAVER_FPS_CAP : 60;
        var minFrameMs = 1000 / fpsCap;
        if (dt >= minFrameMs || dt > 250) {
          self._update(Math.min(dt, 100)); // clamp huge tab-switch gaps
        }
      }
      self._loop();
    });
  };

  Instance.prototype._update = function (dt) {
    var decision = this.state.tick(dt);
    if (decision && !this.navigation.isMoving()) {
      this._act(decision);
    }

    this._blinkTimer = (this._blinkTimer || 0) + dt;
    if (this._blinkTimer > 2500 + Math.random() * 2000) {
      this._blinkTimer = 0;
      this.renderer.blink();
    }

    this.navigation.update(dt);
    this.anim.update(dt);

    var isWalking = this.navigation.isMoving();
    if (isWalking && this.anim.currentName !== 'walk' && this.anim.currentName !== 'run') {
      this.anim.play('walk');
    } else if (!isWalking && (this.anim.currentName === 'walk' || this.anim.currentName === 'run')) {
      this.anim.play('idle');
    }
    this.anim.setFlip(!this.navigation.facingRight);

    var pos = this.navigation.pos;
    this.renderer.draw(this.anim.currentFrame(), pos, this.anim.flipped);

    var size = this.renderer.lastSize();
    this.interactions.evaluateProximity({ x: pos.x + size.w / 2, y: pos.y + size.h / 2 });

    // Overlap escape: if currently overlapping an exclusion, flee to safe spot
    this._overlapCheckTimer = (this._overlapCheckTimer || 0) + dt;
    if (this._overlapCheckTimer > 1500) {
      this._overlapCheckTimer = 0;
      if (!this.navigation._isSafe(pos.x, pos.y) && !this.navigation.isMoving()) {
        var escape = this.navigation.findEmptyArea();
        if (escape) {
          this.navigation.moveTo(escape);
          this.anim.play('run');
        }
      }
    }
  };

  Instance.prototype._act = function (behaviour) {
    if (behaviour.kind === 'move' || behaviour.kind === 'move-corner') {
      var target = behaviour.kind === 'move-corner'
        ? { x: Config.SCREEN_MARGIN_PX, y: window.innerHeight - this.renderer.lastSize().h - Config.SCREEN_MARGIN_PX }
        : this.navigation.pickWanderTarget();
      if (target) {
        this.navigation.moveTo(target);
        return;
      }
    }
    this.anim.play(behaviour.anim || 'idle', {
      onComplete: (function (self) { return function () { self.anim.play('idle'); }; })(this)
    });
    // particles on specific animations
    if (behaviour.anim === 'heart' || behaviour.anim === 'leaveHearts') this._emitParticles('hearts');
    else if (behaviour.anim === 'celebrate') this._emitParticles('sparkles');
    else if (behaviour.anim === 'dance' || behaviour.anim === 'listenMusic') this._emitParticles('notes');
    else if (behaviour.anim === 'sleep') this._emitParticles('zzz');
    else if (behaviour.anim === 'collectFlower' || behaviour.anim === 'touchFlower') this._emitParticles('flowers');
    else if (behaviour.anim === 'collectStar' || behaviour.anim === 'gazeAtMoon') this._emitParticles('stars');
    else if (behaviour.anim === 'happy' || behaviour.anim === 'wave') this._emitParticles('hearts');
  };

  Instance.prototype._emitParticles = function (type) {
    if (!GirlCompanion.Particles || this.reducedMotion) return;
    var pos = this.navigation.pos;
    var size = this.renderer.lastSize();
    var cx = pos.x + size.w / 2;
    var cy = pos.y;
    GirlCompanion.Particles[type](cx, cy);
  };

  // ---- Public API ----

  GirlCompanion.init = function (options) {
    if (window.FeatureFlags && !window.FeatureFlags.get('companion-girl')) return Promise.resolve(null);
    if (instance) return Promise.resolve(instance);
    instance = new Instance();
    return instance.init(options);
  };

  GirlCompanion.destroy = function () {
    if (!instance) return;
    instance.destroyed = true;
    if (instance._raf) cancelAnimationFrame(instance._raf);
    if (instance._teardownEnv) instance._teardownEnv();
    if (instance._autosaveTimer) clearInterval(instance._autosaveTimer);
    if (instance.navigation) instance.navigation.destroy();
    if (instance.interactions) instance.interactions.destroy();
    if (instance.renderer) instance.renderer.destroy();
    instance.memory.save();
    instance = null;
  };

  GirlCompanion.pause = function () { if (instance) instance.paused = true; };
  GirlCompanion.resume = function () {
    if (instance) { instance.paused = false; instance._lastFrameTime = performance.now(); }
  };

  GirlCompanion.teleport = function (point) { if (instance) instance.navigation.teleport(point); };

  GirlCompanion.setMood = function (moodAnim) {
    if (!instance) return;
    instance.anim.play(moodAnim);
    instance.memory.setMood(moodAnim);
  };

  GirlCompanion.setWeather = function (weather) { if (instance) instance.state.setContext({ weather: weather }); };
  GirlCompanion.setSky = function (sky) {
    if (!instance) return;
    instance.state.setContext({ isNight: sky === 'night' });
    instance.memory.recordSkyVisit(sky);
  };

  /** Host page can call this manually instead of relying on the IntersectionObserver. */
  GirlCompanion.onSectionChange = function (sectionId, el) {
    if (instance) instance.bus.emit('section:change', { id: sectionId, el: el || document.body });
  };

  GirlCompanion.save = function () { if (instance) instance.memory.save(); };
  GirlCompanion.load = function () { if (instance) return instance.memory.load(); };

  GirlCompanion.setMusicPlaying = function (playing) { if (instance) instance.state.setContext({ musicPlaying: !!playing }); };
})(typeof window !== 'undefined' ? window : this);
/**
 * GirlParticles.js
 * Particle effects powered by anime.js — hearts, stars, flowers, sparkles.
 * Uses a shared canvas overlaid on the girl companion's canvas.
 */
// anime v4 compat: make window.anime callable like v3
(function(){var a=window.anime;if(a&&typeof a!=='function'&&a.animate){var f=function(p){return a.animate(p)};for(var k in a)f[k]=a[k];window.anime=f}})();
(function (root) {
  'use strict';

  if (typeof anime === 'undefined') return;

  var GirlCompanion = root.GirlCompanion = root.GirlCompanion || {};

  var canvas, ctx, W, H, DPR = 1;
  var particles = [];
  var running = false;

  var EMOJIS = {
    heart: { chars: ['\u2764', '\u2665', '\u2763'], colors: ['#ff6688', '#ff4477', '#ff8899'] },
    star: { chars: ['\u2605', '\u2606', '\u2726'], colors: ['#ffdd44', '#ffcc00', '#ffee88'] },
    flower: { chars: ['\u273F', '\u2740', '\u2741'], colors: ['#ff88cc', '#ffaadd', '#ff66aa'] },
    sparkle: { chars: ['\u2728', '\u2733', '\u2734'], colors: ['#ffffff', '#eeeeff', '#ddddff'] },
    note: { chars: ['\u266A', '\u266B'], colors: ['#88ccff', '#66aaff'] },
    zzz: { chars: ['z', 'Z'], colors: ['#8888cc', '#aaaadd'] }
  };

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:999998;pointer-events:none';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    onResize();
    window.addEventListener('resize', onResize);
  }

  function onResize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      if (p.done) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.font = p.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.char, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    if (particles.length > 0) {
      requestAnimationFrame(render);
    } else {
      running = false;
    }
  }

  function startLoop() {
    if (!running) { running = true; render(); }
  }

  /* ═══════════════════════ PUBLIC API ═══════════════════════ */

  GirlCompanion.Particles = {
    /** Burst of hearts at position */
    hearts: function (x, y, count) {
      ensureCanvas();
      count = count || 5;
      var set = EMOJIS.heart;
      for (var i = 0; i < count; i++) {
        var p = {
          x: x + (Math.random() - 0.5) * 30,
          y: y,
          char: set.chars[Math.floor(Math.random() * set.chars.length)],
          color: set.colors[Math.floor(Math.random() * set.colors.length)],
          size: 12 + Math.random() * 10,
          alpha: 1,
          done: false
        };
        particles.push(p);
        anime({
          targets: p,
          y: y - 40 - Math.random() * 60,
          x: p.x + (Math.random() - 0.5) * 50,
          alpha: 0,
          size: p.size + 6,
          duration: 1200 + Math.random() * 800,
          easing: 'easeOutCubic',
          delay: i * 80,
          complete: function () { p.done = true; }
        });
      }
      startLoop();
    },

    /** Burst of stars */
    stars: function (x, y, count) {
      ensureCanvas();
      count = count || 6;
      var set = EMOJIS.star;
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 / count) * i;
        var dist = 20 + Math.random() * 30;
        var p = {
          x: x, y: y,
          char: set.chars[Math.floor(Math.random() * set.chars.length)],
          color: set.colors[Math.floor(Math.random() * set.colors.length)],
          size: 10 + Math.random() * 8,
          alpha: 1,
          done: false
        };
        particles.push(p);
        anime({
          targets: p,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist - 20,
          alpha: 0,
          rotate: Math.random() * 360,
          duration: 1000 + Math.random() * 600,
          easing: 'easeOutQuad',
          delay: i * 50,
          complete: function () { p.done = true; }
        });
      }
      startLoop();
    },

    /** Floating flowers */
    flowers: function (x, y, count) {
      ensureCanvas();
      count = count || 4;
      var set = EMOJIS.flower;
      for (var i = 0; i < count; i++) {
        var p = {
          x: x + (Math.random() - 0.5) * 40,
          y: y,
          char: set.chars[Math.floor(Math.random() * set.chars.length)],
          color: set.colors[Math.floor(Math.random() * set.colors.length)],
          size: 14 + Math.random() * 8,
          alpha: 1,
          done: false
        };
        particles.push(p);
        anime({
          targets: p,
          y: y - 30 - Math.random() * 50,
          x: '+=' + (Math.random() * 40 - 20),
          alpha: 0,
          rotate: Math.random() * 180 - 90,
          duration: 1500 + Math.random() * 1000,
          easing: 'easeOutSine',
          delay: i * 120,
          complete: function () { p.done = true; }
        });
      }
      startLoop();
    },

    /** Sparkle shimmer */
    sparkles: function (x, y, count) {
      ensureCanvas();
      count = count || 8;
      var set = EMOJIS.sparkle;
      for (var i = 0; i < count; i++) {
        var p = {
          x: x + (Math.random() - 0.5) * 50,
          y: y + (Math.random() - 0.5) * 50,
          char: set.chars[Math.floor(Math.random() * set.chars.length)],
          color: set.colors[Math.floor(Math.random() * set.colors.length)],
          size: 6 + Math.random() * 10,
          alpha: 0,
          done: false
        };
        particles.push(p);
        anime({
          targets: p,
          alpha: [0, 1, 0],
          size: [p.size, p.size + 4, p.size],
          y: p.y - 15,
          duration: 800 + Math.random() * 600,
          easing: 'easeInOutSine',
          delay: i * 60,
          complete: function () { p.done = true; }
        });
      }
      startLoop();
    },

    /** Music notes */
    notes: function (x, y, count) {
      ensureCanvas();
      count = count || 3;
      var set = EMOJIS.note;
      for (var i = 0; i < count; i++) {
        var p = {
          x: x + (Math.random() - 0.5) * 20,
          y: y,
          char: set.chars[Math.floor(Math.random() * set.chars.length)],
          color: set.colors[Math.floor(Math.random() * set.colors.length)],
          size: 14 + Math.random() * 6,
          alpha: 1,
          done: false
        };
        particles.push(p);
        anime({
          targets: p,
          y: y - 50 - Math.random() * 30,
          x: '+=' + (Math.random() * 30 - 15),
          alpha: 0,
          rotate: Math.random() * 40 - 20,
          duration: 1800 + Math.random() * 800,
          easing: 'easeOutQuad',
          delay: i * 200,
          complete: function () { p.done = true; }
        });
      }
      startLoop();
    },

    /** Sleep zzz */
    zzz: function (x, y) {
      ensureCanvas();
      var set = EMOJIS.zzz;
      for (var i = 0; i < 3; i++) {
        var p = {
          x: x + 10 + i * 8,
          y: y - 10,
          char: set.chars[i % set.chars.length],
          color: set.colors[i % set.colors.length],
          size: 10 + i * 3,
          alpha: 0.7,
          done: false
        };
        particles.push(p);
        anime({
          targets: p,
          y: y - 30 - i * 15,
          x: '+=' + (10 + i * 5),
          alpha: 0,
          duration: 2000 + i * 500,
          easing: 'easeOutSine',
          delay: i * 300,
          complete: function () { p.done = true; }
        });
      }
      startLoop();
    },

    clear: function () {
      particles = [];
      if (ctx) ctx.clearRect(0, 0, W, H);
    }
  };
})(typeof window !== 'undefined' ? window : this);
