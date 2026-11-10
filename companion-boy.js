/**
 * BoyConfig.js
 * Every tunable number the companion uses lives here. Nothing else in the
 * system should hardcode a magic number — if behaviour needs adjusting,
 * this is the file to edit.
 */
(function (root) {
  'use strict';

  var BoyCompanion = root.BoyCompanion = root.BoyCompanion || {};

  BoyCompanion.Config = {
    // --- Assets ---
    ATLAS_JSON_URL: 'boy-assets/atlas.json',
    ATLAS_IMAGE_URL: 'boy-assets/atlas.png',

    // --- Rendering ---
    RENDER_HEIGHT_PX: 64,        // on-screen height; width derives from frame aspect ratio
    Z_INDEX: 999998,
    PIXELATED: true,             // nearest-neighbor, never blur

    // --- Storage ---
    STORAGE_KEY: 'boyCompanion:v1',
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
    EXCLUSION_PADDING_PX: 12,

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
 * BoyCompanion.js — Minimal: sleeps in a corner, click to relocate.
 */
(function (root) {
  'use strict';

  var BoyCompanion = root.BoyCompanion = root.BoyCompanion || {};
  var Config = BoyCompanion.Config;

  var instance = null;

  // Sleeping frame from atlas
  var SLEEP_FRAME = { x: 227, y: 188, w: 29, h: 38 };

  var CORNERS = [
    { x: 24, y: 'bottom' },
    { x: 'right', y: 'bottom' },
    { x: 24, y: 24 },
    { x: 'right', y: 24 },
    { x: 'center', y: 'bottom' }
  ];

  function Instance() {
    this.canvas = null;
    this.ctx = null;
    this.atlasImage = null;
    this.destroyed = false;
    this._pos = null;
  }

  Instance.prototype.init = function (options) {
    var self = this;
    var container = (options && options.container) || document.body;

    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        self.atlasImage = img;
        self._setup(container);
        self._place();
        resolve(self);
      };
      img.onerror = reject;
      img.src = Config.ATLAS_IMAGE_URL;
    });
  };

  Instance.prototype._setup = function (container) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var s = canvas.style;
    s.position = 'fixed';
    s.pointerEvents = 'auto';
    s.zIndex = String(Config.Z_INDEX);
    s.imageRendering = 'pixelated';
    s.cursor = 'pointer';
    s.transition = 'left 1.2s ease, top 1.2s ease';

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    container.appendChild(canvas);

    var self = this;
    canvas.addEventListener('click', function () { self._relocate(); });

    // Draw the frame once to size the canvas
    var dpr = window.devicePixelRatio || 1;
    var renderH = Config.RENDER_HEIGHT_PX;
    var renderW = renderH * (SLEEP_FRAME.w / SLEEP_FRAME.h);
    canvas.width = Math.ceil(renderW * dpr);
    canvas.height = Math.ceil(renderH * dpr);
    canvas.style.width = renderW + 'px';
    canvas.style.height = renderH + 'px';

    this._renderW = renderW;
    this._renderH = renderH;
  };

  Instance.prototype._place = function () {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var w = this._renderW;
    var h = this._renderH;
    var margin = 16;

    // Pick a random corner
    var corner = CORNERS[Math.floor(Math.random() * CORNERS.length)];
    var x, y;

    if (corner.x === 'right') x = vw - w - margin;
    else if (corner.x === 'center') x = (vw - w) / 2;
    else x = margin;

    if (corner.y === 'bottom') y = vh - h - margin;
    else y = margin;

    this._pos = { x: x, y: y };
    this._draw();
  };

  Instance.prototype._draw = function () {
    if (!this.atlasImage || !this._pos) return;
    var ctx = this.ctx;
    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this._renderW, this._renderH);
    ctx.drawImage(
      this.atlasImage,
      SLEEP_FRAME.x, SLEEP_FRAME.y, SLEEP_FRAME.w, SLEEP_FRAME.h,
      0, 0, this._renderW, this._renderH
    );
    this.canvas.style.left = this._pos.x + 'px';
    this.canvas.style.top = this._pos.y + 'px';
  };

  Instance.prototype._relocate = function () {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var w = this._renderW;
    var h = this._renderH;
    var margin = 16;

    // Random position near edges/corners, not overlapping current
    var positions = [
      { x: margin, y: vh - h - margin },
      { x: vw - w - margin, y: vh - h - margin },
      { x: margin, y: margin },
      { x: vw - w - margin, y: margin },
      { x: (vw - w) / 2, y: vh - h - margin },
      { x: margin, y: (vh - h) / 2 },
      { x: vw - w - margin, y: (vh - h) / 2 }
    ];

    // Filter out current position
    var self = this;
    positions = positions.filter(function (p) {
      return Math.abs(p.x - self._pos.x) > 50 || Math.abs(p.y - self._pos.y) > 50;
    });

    var next = positions[Math.floor(Math.random() * positions.length)];
    this._pos = next;
    this._draw();
  };

  Instance.prototype.destroy = function () {
    this.destroyed = true;
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  };

  // ---- Public API (minimal) ----

  BoyCompanion.init = function (options) {
    if (window.FeatureFlags && !window.FeatureFlags.get('companion-boy')) return Promise.resolve(null);
    if (instance) return Promise.resolve(instance);
    instance = new Instance();
    return instance.init(options);
  };

  BoyCompanion.destroy = function () {
    if (!instance) return;
    instance.destroy();
    instance = null;
  };

  BoyCompanion.pause = function () {};
  BoyCompanion.resume = function () {};
  BoyCompanion.teleport = function () {};
  BoyCompanion.setMood = function () {};
  BoyCompanion.setWeather = function () {};
  BoyCompanion.setSky = function () {};
  BoyCompanion.onSectionChange = function () {};
  BoyCompanion.save = function () {};
  BoyCompanion.load = function () {};
  BoyCompanion.setMusicPlaying = function () {};
})(typeof window !== 'undefined' ? window : this);
