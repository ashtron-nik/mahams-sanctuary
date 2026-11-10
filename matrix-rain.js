/*!
 * Matrix Rain Engine v3 — production build
 * -----------------------------------------------------------------------
 * Backward compatible with the original matrix-rain.js:
 *   - same global: window.MatrixRain
 *   - same canvas id: #matrixRainCanvas
 *   - same "matrix" keyword toggles the rain on/off
 *   - single requestAnimationFrame loop, never duplicated
 *
 * New in v3: all rain types, full physics, bloom/blur/chromatic/streaks,
 * ripples, OffscreenCanvas, sky/weather/time-of-day hooks, image icons,
 * mixed mode, urdu/arabic/notes streams, randomized brightness,
 * vignette, aurora borealis, fog/mist, light beams, star field,
 * color shift, glow rings, screen shake.
 *
 * This file does not touch, query, or override any global other
 * than `window.MatrixRain`. It creates exactly one canvas element and
 * cleans up its own listeners/timers on stop(). It is safe to load next
 * to unrelated sky/particle/music/companion systems.
 * -----------------------------------------------------------------------
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('matrix-rain')) return;

  /* =====================================================================
   * 1. STATE
   * =================================================================== */

  var STATE = {
    active: false,
    running: false,
    autoPausedByVisibility: false,
    mode: 'normal',
    quality: 'high',
    intensity: 1,
    speedMult: 1,
    glowEnabled: true,
    bloomEnabled: true,
    chromaticEnabled: false,
    streaksEnabled: true,
    vignetteEnabled: true,
    auroraEnabled: false,
    fogEnabled: false,
    lightBeamsEnabled: false,
    starFieldEnabled: false,
    colorShiftEnabled: false,
    glowRingsEnabled: false,
    shakeEnabled: false,
    colors: null,
    musicLevel: 0,
    scrollBoost: 0,
    pointer: { x: -9999, y: -9999, active: false },
    ripples: [],
    shake: { x: 0, y: 0, intensity: 0 },
    randomCycleTimer: null,
    lightningT: 0,
    _overrides: null,
    skyType: null,
    weatherType: null
  };

  var canvas, ctx, W = 0, H = 0, DPR = 1;
  var offCanvas, offCtx;
  var frameId = null;
  var lastT = 0;
  var frameTimes = [];
  var qualityCooldown = 0;

  /* =====================================================================
   * 2. CHARACTER SETS + ICON GLYPHS + IMAGE ICONS
   * =================================================================== */

  var CHARSETS = {
    katakana: (function () {
      var s = '';
      for (var c = 0x30A0; c < 0x30FF; c++) s += String.fromCharCode(c);
      return s;
    })(),
    binary: '01',
    english: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    urdu: 'اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنوہھءی',
    arabic: 'ابجدهوزحطيكلمنسعفصقرشتثخذضظغ',
    notes: '\u266A\u266B\u2669\u266C',
    numbers: '0123456789',
    symbols: '\u2605\u2606\u260E\u2615\u2618\u2619\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638\u2639\u263A\u263C\u2640\u2642\u2643\u2644\u2645\u2646\u2647\u2648\u2649\u264A\u264B\u264C\u264D\u264E\u264F\u2650\u2651\u2652\u2653\u2660\u2663\u2665\u2666'
  };

  var ICONS = {
    heart: { glyph: '\u2665', mode: 'glyph' },
    tinyHeart: { glyph: '\u2661', mode: 'glyph' },
    star: { glyph: '\u2726', mode: 'glyph' },
    moon: { glyph: '\u263E', mode: 'glyph' },
    flower: { glyph: '\u2740', mode: 'glyph' },
    petal: { glyph: '\u2740', mode: 'glyph' },
    butterfly: { glyph: '\uD83E\uDD8B', mode: 'glyph' },
    snow: { glyph: '\u2744', mode: 'glyph' },
    note: { glyph: '\u266A', mode: 'glyph' },
    doubleNote: { glyph: '\u266B', mode: 'glyph' },
    lantern: { glyph: '\u2615', mode: 'glyph' },
    firefly: { mode: 'dot' },
    lanternSpark: { mode: 'dot' },
    galaxyDot: { mode: 'dot' },
    dreamFragment: { mode: 'dot', soft: true },
    wish: { mode: 'dot', trail: true },
    sparkle: { mode: 'dot' },
    glow: { mode: 'dot', soft: true }
  };

  /* =====================================================================
   * 3. MODE PRESETS
   * =================================================================== */

  function modePresets() {
    return {
      normal: {
        streamType: null,
        streamPalette: null,
        iconTypes: ['star', 'firefly', 'glow'],
        density: 0.6,
        turbulence: 0.15,
        wind: 0,
        glow: true,
        bloom: true,
        streaks: false,
        palette: timeOfDayPalette()
      },
      matrix: {
        streamType: 'katakana',
        streamPalette: { bright: 'rgba(200,255,200,0.9)', dim: 'rgba(0,200,80,%a)' },
        iconTypes: [],
        density: 1,
        turbulence: 0.05,
        wind: 0,
        glow: true,
        bloom: true,
        streaks: true,
        palette: { glow: '#00ff90', tint: 'rgba(0,20,8,0.06)' }
      },
      binary: {
        streamType: 'binary',
        streamPalette: { bright: 'rgba(220,235,255,0.95)', dim: 'rgba(150,180,220,%a)' },
        iconTypes: ['sparkle'],
        density: 0.7,
        turbulence: 0.08,
        wind: 0,
        glow: true,
        bloom: true,
        streaks: true,
        palette: { glow: '#c8d8ff', tint: 'rgba(10,12,20,0.05)' }
      },
      dream: {
        streamType: null,
        iconTypes: ['star', 'moon', 'wish', 'dreamFragment', 'glow'],
        density: 0.8,
        turbulence: 0.4,
        wind: 0.15,
        glow: true,
        bloom: true,
        streaks: false,
        palette: { glow: '#c9b6ff', tint: 'rgba(20,14,36,0.06)' }
      },
      galaxy: {
        streamType: null,
        iconTypes: ['galaxyDot', 'star', 'sparkle'],
        density: 0.95,
        turbulence: 0.6,
        wind: 0.05,
        glow: true,
        bloom: true,
        streaks: false,
        palette: { glow: '#8ab4ff', tint: 'rgba(6,6,20,0.07)' }
      },
      love: {
        streamType: null,
        iconTypes: ['heart', 'tinyHeart', 'flower', 'petal'],
        density: 0.9,
        turbulence: 0.25,
        wind: 0.1,
        glow: true,
        bloom: true,
        streaks: false,
        palette: { glow: '#ff6b8a', tint: 'rgba(24,8,16,0.07)' }
      },
      storm: {
        streamType: 'katakana',
        streamPalette: { bright: 'rgba(220,235,255,0.95)', dim: 'rgba(120,170,255,%a)' },
        iconTypes: ['snow'],
        density: 1,
        turbulence: 1.2,
        wind: 1.6,
        glow: true,
        bloom: true,
        streaks: true,
        palette: { glow: '#9fd0ff', tint: 'rgba(4,6,14,0.1)' },
        lightning: true
      },
      secret: {
        streamType: 'english',
        streamPalette: { bright: 'rgba(255,240,200,0.95)', dim: 'rgba(255,200,80,%a)' },
        iconTypes: ['star', 'galaxyDot', 'wish', 'sparkle'],
        density: 0.85,
        turbulence: 0.5,
        wind: 0.1,
        glow: true,
        bloom: true,
        streaks: true,
        palette: { glow: '#ffd27a', tint: 'rgba(20,14,6,0.06)' }
      },
      urdu: {
        streamType: 'urdu',
        streamPalette: { bright: 'rgba(255,230,180,0.95)', dim: 'rgba(200,160,80,%a)' },
        iconTypes: ['lanternSpark', 'glow'],
        density: 0.75,
        turbulence: 0.3,
        wind: 0.08,
        glow: true,
        bloom: true,
        streaks: true,
        palette: { glow: '#ffe0a0', tint: 'rgba(20,14,6,0.05)' }
      },
      arabic: {
        streamType: 'arabic',
        streamPalette: { bright: 'rgba(200,230,255,0.95)', dim: 'rgba(100,160,220,%a)' },
        iconTypes: ['star', 'glow'],
        density: 0.75,
        turbulence: 0.25,
        wind: 0.06,
        glow: true,
        bloom: true,
        streaks: true,
        palette: { glow: '#a0c8ff', tint: 'rgba(6,10,20,0.05)' }
      },
      notes: {
        streamType: 'notes',
        streamPalette: { bright: 'rgba(255,200,230,0.95)', dim: 'rgba(220,140,180,%a)' },
        iconTypes: ['note', 'doubleNote', 'sparkle'],
        density: 0.7,
        turbulence: 0.5,
        wind: 0.12,
        glow: true,
        bloom: true,
        streaks: false,
        palette: { glow: '#ff8ec8', tint: 'rgba(20,6,14,0.05)' }
      },
      flowers: {
        streamType: null,
        iconTypes: ['flower', 'petal', 'butterfly', 'glow'],
        density: 0.85,
        turbulence: 0.45,
        wind: 0.2,
        glow: true,
        bloom: true,
        streaks: false,
        palette: { glow: '#ffb0d0', tint: 'rgba(20,8,14,0.05)' }
      },
      random: {
        streamType: null,
        iconTypes: ['star', 'firefly'],
        density: 0.7,
        turbulence: 0.3,
        wind: 0.1,
        glow: true,
        bloom: true,
        streaks: false,
        palette: { glow: '#ffffff', tint: 'rgba(10,10,12,0.06)' }
      }
    };
  }

  function timeOfDayPalette() {
    var hr = new Date().getHours();
    if (hr >= 5 && hr < 9) return { glow: '#ffd9a0', tint: 'rgba(30,18,12,0.05)' };
    if (hr >= 9 && hr < 17) return { glow: '#dfe9ff', tint: 'rgba(10,10,18,0.04)' };
    if (hr >= 17 && hr < 21) return { glow: '#ff9e6b', tint: 'rgba(24,10,18,0.06)' };
    return { glow: '#8fb4ff', tint: 'rgba(6,6,16,0.07)' };
  }

  var RANDOM_MODES = ['matrix', 'dream', 'galaxy', 'love', 'storm', 'secret', 'urdu', 'arabic', 'notes', 'flowers', 'binary'];

  /* =====================================================================
   * 4. QUALITY TIERS (adaptive)
   * =================================================================== */

  var QUALITY_CAPS = {
    high:   { streamCols: 1.3, iconMax: 320, glow: true,  bloom: true,  trailAlpha: 0.06 },
    medium: { streamCols: 0.9, iconMax: 200, glow: true,  bloom: false, trailAlpha: 0.1 },
    low:    { streamCols: 0.55, iconMax: 100, glow: false, bloom: false, trailAlpha: 0.18 }
  };

  /* =====================================================================
   * 5. CANVAS SETUP (with OffscreenCanvas when supported)
   * =================================================================== */

  var useOffscreen = typeof OffscreenCanvas !== 'undefined';

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'matrixRainCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:999999;pointer-events:none;display:none;background:#0a080c;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });
    if (useOffscreen) {
      try {
        offCanvas = new OffscreenCanvas(1, 1);
        offCtx = offCanvas.getContext('2d', { alpha: true });
      } catch (e) { useOffscreen = false; }
    }
    resize();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    canvas.addEventListener('click', onRipple);
    canvas.addEventListener('touchstart', onRipple, { passive: true });
  }

  function onResize() { if (STATE.active) { resize(); buildStreams(); } }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (useOffscreen && offCanvas) {
      offCanvas.width = canvas.width;
      offCanvas.height = canvas.height;
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (STATE.running) { pause(); STATE.autoPausedByVisibility = true; }
    } else if (STATE.autoPausedByVisibility) {
      STATE.autoPausedByVisibility = false;
      resume();
    }
  }

  function onPointerMove(e) {
    var p = e.touches ? e.touches[0] : e;
    if (!p) return;
    STATE.pointer.x = p.clientX;
    STATE.pointer.y = p.clientY;
    STATE.pointer.active = true;
  }

  var lastScrollY = 0;
  function onScroll() {
    var y = window.scrollY || 0;
    var delta = Math.abs(y - lastScrollY);
    lastScrollY = y;
    STATE.scrollBoost = Math.min(STATE.scrollBoost + delta * 0.01, 2);
  }

  /* =====================================================================
   * 6. RIPPLE SYSTEM (mouse/touch click creates expanding rings)
   * =================================================================== */

  var RIPPLE_LIFE = 1.2;

  function onRipple(e) {
    var p = e.touches ? e.touches[0] : e;
    if (!p) return;
    STATE.ripples.push({
      x: p.clientX,
      y: p.clientY,
      age: 0,
      maxAge: RIPPLE_LIFE,
      radius: 0,
      maxRadius: 80 + Math.random() * 40
    });
    if (STATE.ripples.length > 8) STATE.ripples.shift();
  }

  function updateRipples(dt) {
    for (var i = STATE.ripples.length - 1; i >= 0; i--) {
      var r = STATE.ripples[i];
      r.age += dt;
      if (r.age > r.maxAge) { STATE.ripples.splice(i, 1); continue; }
      var t = r.age / r.maxAge;
      r.radius = r.maxRadius * t;
      var alpha = (1 - t) * 0.35;
      var glowColor = (STATE.colors && STATE.colors.glow) || activePreset().palette.glow || '#ffffff';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.5 * (1 - t);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* =====================================================================
   * 7. STREAM PARTICLES (character columns)
   * =================================================================== */

  var streams = [];

  function buildStreams() {
    streams = [];
    var preset = activePreset();
    if (!preset.streamType) return;
    var cap = QUALITY_CAPS[STATE.quality];
    var spacing = 14;
    var colCount = Math.floor((W / spacing) * cap.streamCols * STATE.intensity);
    var charset = CHARSETS[preset.streamType] || CHARSETS.katakana;
    var storm = preset.streamType === 'storm' || (preset.streamType === 'katakana' && preset.wind > 1);
    for (var i = 0; i < colCount; i++) {
      streams.push({
        x: i * spacing + spacing / 2,
        y: Math.random() * H,
        speed: (100 + Math.random() * 140) * (storm ? 1.8 : 1),
        len: 10 + Math.floor(Math.random() * 15),
        charset: charset,
        sway: Math.random() * 8,
        brightness: 0.7 + Math.random() * 0.3
      });
    }
  }

  function updateAndDrawStreams(dt, t, preset) {
    if (!streams.length) return;
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var pal = preset.streamPalette || { bright: 'rgba(200,255,200,0.9)', dim: 'rgba(0,200,80,%a)' };
    var wind = preset.wind * 20;
    var speedMult = STATE.speedMult + STATE.scrollBoost;

    for (var i = 0; i < streams.length; i++) {
      var col = streams[i];
      col.y += col.speed * speedMult * dt;
      var sx = col.x + Math.sin(t * 0.6 + i) * col.sway + wind * t * 0.05;
      if (col.y > H + col.len * 14) {
        col.y = -col.len * 14;
        col.speed = 100 + Math.random() * 140;
        col.brightness = 0.7 + Math.random() * 0.3;
      }
      for (var j = 0; j < col.len; j++) {
        var cy = col.y - j * 14;
        if (cy < -14 || cy > H) continue;
        var ch = col.charset[(Math.random() * col.charset.length) | 0];
        var alpha = (1 - j / col.len) * col.brightness;
        if (j < 2) {
          ctx.fillStyle = pal.bright;
        } else {
          ctx.fillStyle = pal.dim.replace('%a', (alpha * 0.6).toFixed(3));
        }
        ctx.fillText(ch, sx, cy);
      }
    }
  }

  /* =====================================================================
   * 8. ICON PARTICLES (pooled — hearts, stars, moons, flowers, etc.)
   * =================================================================== */

  var iconPool = [];
  var iconActive = 0;

  function poolEnsure(size) {
    for (var i = iconPool.length; i < size; i++) {
      iconPool.push({
        alive: false, type: 'star', layer: 1,
        x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
        rot: 0, rotSpeed: 0, scale: 1, opacity: 1,
        life: 0, maxLife: 1, swayPhase: 0, hue: 0,
        brightness: 1, trailPts: null
      });
    }
  }

  function spawnIcon(preset) {
    if (!preset.iconTypes.length) return;
    if (iconActive >= iconPool.length) return;
    var p = iconPool[iconActive++];
    p.alive = true;
    p.type = preset.iconTypes[(Math.random() * preset.iconTypes.length) | 0];
    p.layer = Math.random() < 0.33 ? 0 : (Math.random() < 0.66 ? 1 : 2);
    var layerScale = p.layer === 0 ? 0.6 : (p.layer === 1 ? 0.85 : 1.2);
    var layerSpeed = p.layer === 0 ? 0.5 : (p.layer === 1 ? 0.8 : 1.25);
    var layerOpacity = p.layer === 0 ? 0.35 : (p.layer === 1 ? 0.6 : 0.9);

    p.x = Math.random() * W;
    p.y = -20 - Math.random() * 60;
    p.vx = (Math.random() - 0.5) * 10;
    p.vy = (30 + Math.random() * 50) * layerSpeed;
    p.ax = 0;
    p.ay = 4;
    p.rot = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random() - 0.5) * 1.2;
    p.scale = (0.7 + Math.random() * 0.8) * layerScale;
    p.baseOpacity = layerOpacity * (0.6 + Math.random() * 0.4);
    p.opacity = 0;
    p.brightness = 0.6 + Math.random() * 0.4;
    p.life = 0;
    p.maxLife = 6 + Math.random() * 8;
    p.swayPhase = Math.random() * Math.PI * 2;
    p.hue = Math.random();
    p.trailPts = ICONS[p.type] && ICONS[p.type].trail ? [] : null;

    // spawn glow ring
    var spawnColor = (STATE.colors && STATE.colors.glow) || (activePreset().palette && activePreset().palette.glow) || '#ffffff';
    spawnGlowRing(p.x, p.y, spawnColor);
  }

  function killIconAt(i) {
    iconPool[i].alive = false;
    iconActive--;
    var tmp = iconPool[i];
    iconPool[i] = iconPool[iconActive];
    iconPool[iconActive] = tmp;
  }

  function updateAndDrawIcons(dt, t, preset) {
    var cap = QUALITY_CAPS[STATE.quality];
    var wantMax = Math.min(cap.iconMax, Math.round(cap.iconMax * preset.density * STATE.intensity));
    poolEnsure(cap.iconMax);

    if (iconActive < wantMax && Math.random() < 0.9) spawnIcon(preset);

    var speedMult = STATE.speedMult + STATE.scrollBoost * 0.5;
    var wind = preset.wind * 18;
    var turb = preset.turbulence;
    var glowColor = (STATE.colors && STATE.colors.glow) || preset.palette.glow || '#ffffff';
    var pointer = STATE.pointer;

    for (var layer = 0; layer < 3; layer++) {
      for (var i = 0; i < iconActive; i++) {
        var p = iconPool[i];
        if (p.layer !== layer) continue;

        p.life += dt;
        if (p.life > p.maxLife || p.y > H + 40) { killIconAt(i); i--; continue; }

        // physics: gravity + wind + turbulence + sway
        p.vy += p.ay * dt;
        p.vx += wind * dt;
        var turbForce = Math.sin(t * 1.3 + p.swayPhase) * turb * 12;
        p.vx += turbForce * dt;

        // velocity damping
        p.vx *= 0.97;
        p.vy *= 0.995;

        // mouse/touch repulsion (foreground + midground only)
        if (pointer.active && layer > 0) {
          var dx = p.x - pointer.x, dy = p.y - pointer.y;
          var distSq = dx * dx + dy * dy;
          var radius = 90;
          if (distSq < radius * radius) {
            var dist = Math.sqrt(distSq) || 1;
            var force = (1 - dist / radius) * 60;
            p.vx += (dx / dist) * force * dt;
            p.vy += (dy / dist) * force * dt * 0.5;
          }
        }

        // ripple repulsion
        for (var ri = 0; ri < STATE.ripples.length; ri++) {
          var rip = STATE.ripples[ri];
          var rdx = p.x - rip.x, rdy = p.y - rip.y;
          var rDistSq = rdx * rdx + rdy * rdy;
          var rEdge = rip.radius;
          if (rDistSq < rEdge * rEdge && rEdge > 5) {
            var rDist = Math.sqrt(rDistSq) || 1;
            var rForce = (1 - rDist / rEdge) * 40 * (1 - rip.age / rip.maxAge);
            p.vx += (rdx / rDist) * rForce * dt;
            p.vy += (rdy / rDist) * rForce * dt * 0.5;
          }
        }

        p.x += p.vx * speedMult * dt;
        p.y += p.vy * speedMult * dt;
        p.rot += p.rotSpeed * dt;

        // opacity envelope
        var fadeIn = Math.min(p.life / 0.6, 1);
        var fadeOut = Math.min((p.maxLife - p.life) / 0.8, 1);
        p.opacity = p.baseOpacity * Math.min(fadeIn, fadeOut);

        // music pulse
        var pulse = 1 + STATE.musicLevel * 0.25 * Math.sin(t * 6 + p.swayPhase);

        // trail recording
        if (p.trailPts) {
          p.trailPts.push({ x: p.x, y: p.y, a: p.opacity * 0.5 });
          if (p.trailPts.length > 12) p.trailPts.shift();
        }

        drawIcon(p, pulse, glowColor);
      }
    }
  }

  function drawIcon(p, pulse, glowColor) {
    var def = ICONS[p.type];
    if (!def) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.opacity);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    var s = p.scale * pulse;
    var quality = QUALITY_CAPS[STATE.quality];

    // color shift: rotate hue based on particle lifetime
    var drawColor = glowColor;
    if (STATE.colorShiftEnabled && glowColor.charAt(0) === '#') {
      var hueShift = (p.life / p.maxLife) * 0.4 + p.hue * 0.2;
      drawColor = shiftHue(glowColor, hueShift);
    }

    // bloom (soft outer glow)
    if (STATE.bloomEnabled && quality.bloom && STATE.glowEnabled) {
      ctx.shadowBlur = def.soft ? 24 : 14;
      ctx.shadowColor = drawColor;
    } else if (STATE.glowEnabled && quality.glow) {
      ctx.shadowBlur = def.soft ? 18 : 10;
      ctx.shadowColor = drawColor;
    }

    if (def.mode === 'glyph') {
      // neon edge effect: draw glyph twice — once blurred, once crisp
      if (STATE.glowEnabled && quality.glow) {
        ctx.font = (14 * s) + 'px "Segoe UI Emoji", "Noto Color Emoji", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = drawColor;
        ctx.fillText(def.glyph, 0, 0);
      }
      // chromatic aberration: offset red/blue copies
      if (STATE.chromaticEnabled) {
        ctx.globalAlpha = Math.max(0, p.opacity * 0.3);
        ctx.fillStyle = 'rgba(255,80,80,0.4)';
        ctx.fillText(def.glyph, -1 * s, 0);
        ctx.fillStyle = 'rgba(80,80,255,0.4)';
        ctx.fillText(def.glyph, 1 * s, 0);
        ctx.globalAlpha = Math.max(0, p.opacity);
      }
      ctx.font = (14 * s) + 'px "Segoe UI Emoji", "Noto Color Emoji", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = drawColor;
      ctx.fillText(def.glyph, 0, 0);
    } else {
      // dot-based particle
      var r = (def.soft ? 6 : 2.5) * s;
      var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * (def.soft ? 3 : 4));
      grad.addColorStop(0, drawColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r * (def.soft ? 3 : 4), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = drawColor;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // trail rendering
    if (p.trailPts && p.trailPts.length > 1) {
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 1;
      for (var ti = 0; ti < p.trailPts.length; ti++) {
        var tp = p.trailPts[ti];
        var ta = tp.a * (ti / p.trailPts.length) * 0.5;
        ctx.globalAlpha = ta;
        ctx.fillStyle = drawColor;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /* =====================================================================
   * 9. STREAKS (light streaks behind fast-moving particles)
   * =================================================================== */

  function drawStreaks(dt, t, preset) {
    if (!preset.streaks || !STATE.streaksEnabled) return;
    var speedMult = STATE.speedMult + STATE.scrollBoost;
    var glowColor = (STATE.colors && STATE.colors.glow) || preset.palette.glow || '#ffffff';

    for (var i = 0; i < iconActive; i++) {
      var p = iconPool[i];
      if (p.layer < 1) continue;
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed < 40) continue;
      var len = Math.min(speed * 0.15, 30);
      var angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.3;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.5 * p.scale;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* =====================================================================
   * 9b. VIGNETTE (dark edges, cinematic feel)
   * =================================================================== */

  function drawVignette() {
    if (!STATE.vignetteEnabled) return;
    var grd = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  /* =====================================================================
   * 9c. AURORA BOREALIS (flowing color bands)
   * =================================================================== */

  var auroraPhases = [0, 2.1, 4.2];

  function drawAurora(dt, t) {
    if (!STATE.auroraEnabled) return;
    var glowColor = (STATE.colors && STATE.colors.glow) || activePreset().palette.glow || '#8ab4ff';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < 3; i++) {
      auroraPhases[i] += dt * 0.3;
      var yBase = H * 0.15 + i * H * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, yBase);
      for (var x = 0; x <= W; x += 20) {
        var wave = Math.sin(x * 0.003 + auroraPhases[i] + t * 0.5) * 40;
        var wave2 = Math.sin(x * 0.007 + auroraPhases[i] * 1.3) * 25;
        ctx.lineTo(x, yBase + wave + wave2);
      }
      ctx.lineTo(W, yBase + 80);
      ctx.lineTo(0, yBase + 80);
      ctx.closePath();
      var alpha = 0.06 + Math.sin(t * 0.8 + i) * 0.03;
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = alpha;
      ctx.filter = 'blur(20px)';
      ctx.fill();
      ctx.filter = 'none';
    }
    ctx.restore();
  }

  /* =====================================================================
   * 9d. FOG / MIST (drifting semi-transparent layer)
   * =================================================================== */

  var fogLayers = [];
  function initFog() {
    fogLayers = [];
    for (var i = 0; i < 5; i++) {
      fogLayers.push({
        x: Math.random() * W,
        y: H * 0.5 + Math.random() * H * 0.5,
        w: 200 + Math.random() * 300,
        h: 60 + Math.random() * 80,
        speed: 8 + Math.random() * 15,
        alpha: 0.03 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function drawFog(dt, t) {
    if (!STATE.fogEnabled) return;
    if (!fogLayers.length) initFog();
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < fogLayers.length; i++) {
      var f = fogLayers[i];
      f.x += f.speed * dt;
      if (f.x > W + f.w) f.x = -f.w;
      var yOff = Math.sin(t * 0.4 + f.phase) * 15;
      var grad = ctx.createRadialGradient(f.x, f.y + yOff, 0, f.x, f.y + yOff, f.w * 0.5);
      grad.addColorStop(0, 'rgba(180,200,220,' + f.alpha + ')');
      grad.addColorStop(1, 'rgba(180,200,220,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(f.x - f.w * 0.5, f.y + yOff - f.h, f.w, f.h * 2);
    }
    ctx.restore();
  }

  /* =====================================================================
   * 9e. LIGHT BEAMS (vertical shafts of light)
   * =================================================================== */

  var beams = [];
  function initBeams() {
    beams = [];
    for (var i = 0; i < 4; i++) {
      beams.push({
        x: W * 0.15 + Math.random() * W * 0.7,
        width: 30 + Math.random() * 60,
        alpha: 0.02 + Math.random() * 0.03,
        speed: 5 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function drawLightBeams(dt, t) {
    if (!STATE.lightBeamsEnabled) return;
    if (!beams.length) initBeams();
    var glowColor = (STATE.colors && STATE.colors.glow) || activePreset().palette.glow || '#ffffff';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < beams.length; i++) {
      var b = beams[i];
      b.x += Math.sin(t * 0.3 + b.phase) * b.speed * dt;
      var alpha = b.alpha * (0.5 + Math.sin(t * 0.7 + b.phase) * 0.5);
      var grad = ctx.createLinearGradient(b.x, 0, b.x, H);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.3, glowColor);
      grad.addColorStop(0.7, glowColor);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.fillRect(b.x - b.width / 2, 0, b.width, H);
    }
    ctx.restore();
  }

  /* =====================================================================
   * 9f. STAR FIELD (twinkling background stars)
   * =================================================================== */

  var stars = [];
  function initStars() {
    stars = [];
    for (var i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: 0.5 + Math.random() * 1.5,
        twinkleSpeed: 1 + Math.random() * 3,
        twinklePhase: Math.random() * Math.PI * 2,
        baseAlpha: 0.3 + Math.random() * 0.5
      });
    }
  }

  function drawStarField(t) {
    if (!STATE.starFieldEnabled) return;
    if (!stars.length) initStars();
    ctx.save();
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var alpha = s.baseAlpha * (0.4 + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.6);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* =====================================================================
   * 9g. COLOR SHIFT (particles cycle hue over lifetime)
   * =================================================================== */

  function shiftHue(hexColor, amount) {
    // simple HSV hue rotation via RGB approximation
    var r = parseInt(hexColor.slice(1, 3), 16) / 255;
    var g = parseInt(hexColor.slice(3, 5), 16) / 255;
    var b = parseInt(hexColor.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = max === 0 ? 0 : (max - min) / max, v = max;
    if (max !== min) {
      if (max === r) h = (g - b) / (max - min);
      else if (max === g) h = 2 + (b - r) / (max - min);
      else h = 4 + (r - g) / (max - min);
      h /= 6;
      if (h < 0) h += 1;
    }
    h = (h + amount) % 1;
    if (h < 0) h += 1;
    // HSL to RGB
    var q = v < 0.5 ? v * (1 + s) : v + s - v * s;
    var p = 2 * v - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
    return 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')';
  }

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  /* =====================================================================
   * 9h. GLOW RINGS (expanding halos on particle spawn)
   * =================================================================== */

  var glowRings = [];

  function spawnGlowRing(x, y, color) {
    if (!STATE.glowRingsEnabled) return;
    if (glowRings.length > 12) return;
    glowRings.push({ x: x, y: y, radius: 2, maxRadius: 30 + Math.random() * 20, age: 0, maxAge: 0.8, color: color });
  }

  function updateGlowRings(dt) {
    for (var i = glowRings.length - 1; i >= 0; i--) {
      var r = glowRings[i];
      r.age += dt;
      if (r.age > r.maxAge) { glowRings.splice(i, 1); continue; }
      var t = r.age / r.maxAge;
      r.radius = r.maxRadius * t;
      var alpha = (1 - t) * 0.25;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2 * (1 - t);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* =====================================================================
   * 9i. SCREEN SHAKE (on storm/lightning)
   * =================================================================== */

  function applyShake(dt) {
    if (!STATE.shakeEnabled || STATE.shake.intensity <= 0) return;
    STATE.shake.x = (Math.random() - 0.5) * STATE.shake.intensity * 2;
    STATE.shake.y = (Math.random() - 0.5) * STATE.shake.intensity * 2;
    STATE.shake.intensity *= 0.9;
    if (STATE.shake.intensity < 0.1) STATE.shake.intensity = 0;
    ctx.save();
    ctx.translate(STATE.shake.x, STATE.shake.y);
  }

  function releaseShake() {
    if (STATE.shakeEnabled && STATE.shake.intensity > 0) ctx.restore();
  }

  function triggerShake(intensity) {
    STATE.shake.intensity = Math.max(STATE.shake.intensity, intensity || 4);
  }

  /* =====================================================================
   * 10. LIGHTNING (storm mode flash)
   * =================================================================== */

  function updateLightning(dt) {
    STATE.lightningT -= dt;
    if (STATE.lightningT <= 0) {
      if (Math.random() < 0.01) {
        STATE.lightningT = 0.08;
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#dfe9ff';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        if (STATE.shakeEnabled) triggerShake(3);
      }
    }
  }

  /* =====================================================================
   * 11. MAIN LOOP — single requestAnimationFrame, never duplicated
   * =================================================================== */

  function activePreset() {
    var presets = modePresets();
    var base = presets[STATE.mode] || presets.normal;
    if (STATE._overrides) {
      var merged = {};
      for (var k in base) merged[k] = base[k];
      for (var k2 in STATE._overrides) merged[k2] = STATE._overrides[k2];
      return merged;
    }
    return base;
  }

  function frame(now) {
    if (!STATE.running) return;
    var dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    var t = now / 1000;

    trackFrameTime(now);
    STATE.scrollBoost *= 0.92;

    var preset = activePreset();

    // background trail wipe + tint
    var tint = (STATE.colors && STATE.colors.tint) || preset.palette.tint || 'rgba(10,8,12,0.08)';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);

    // screen shake
    applyShake(dt);

    // background layers
    drawStarField(t);
    drawAurora(dt, t);
    drawLightBeams(dt, t);
    drawFog(dt, t);

    updateAndDrawStreams(dt, t, preset);
    updateAndDrawIcons(dt, t, preset);
    drawStreaks(dt, t, preset);
    updateGlowRings(dt);
    updateRipples(dt);

    if (preset.lightning) updateLightning(dt);

    // foreground layers
    drawVignette();

    releaseShake();

    frameId = requestAnimationFrame(frame);
  }

  /* -- adaptive quality */
  function trackFrameTime(now) {
    frameTimes.push(now);
    if (frameTimes.length > 40) frameTimes.shift();
    if (frameTimes.length < 20) return;
    qualityCooldown -= 1;
    if (qualityCooldown > 0) return;

    var avgDt = (frameTimes[frameTimes.length - 1] - frameTimes[0]) / (frameTimes.length - 1);
    if (avgDt > 22 && STATE.quality !== 'low') {
      STATE.quality = STATE.quality === 'high' ? 'medium' : 'low';
      buildStreams();
      qualityCooldown = 90;
    } else if (avgDt < 14 && STATE.quality !== 'high') {
      STATE.quality = STATE.quality === 'low' ? 'medium' : 'high';
      buildStreams();
      qualityCooldown = 90;
    }
  }

  /* =====================================================================
   * 12. SKY / WEATHER / TIME-OF-DAY INTEGRATION
   * =================================================================== */

  function applySkyContext() {
    // if host site provides sky info, adjust rain accordingly
    if (STATE.skyType === 'stormy') {
      STATE._stormOverride = { turbulence: 1.4, wind: 2.0, lightning: true };
    } else if (STATE.skyType === 'clear') {
      STATE._stormOverride = null;
    } else if (STATE.skyType === 'cloudy') {
      STATE._stormOverride = { turbulence: 0.3, wind: 0.5 };
    }
  }

  /* =====================================================================
   * 13. PUBLIC API
   * =================================================================== */

  function start(mode) {
    ensureCanvas();
    if (mode) STATE.mode = mode;
    STATE.active = true;
    canvas.style.display = 'block';
    resize();
    buildStreams();
    iconActive = 0;
    resume();
  }

  function stop() {
    STATE.active = false;
    pause();
    if (STATE.randomCycleTimer) { clearInterval(STATE.randomCycleTimer); STATE.randomCycleTimer = null; }
    if (canvas) {
      canvas.style.display = 'none';
      ctx.clearRect(0, 0, W, H);
    }
    streams = [];
    iconActive = 0;
    STATE.ripples = [];
    glowRings = [];
    fogLayers = [];
    beams = [];
    stars = [];
    STATE.shake = { x: 0, y: 0, intensity: 0 };
  }

  function pause() {
    STATE.running = false;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = null;
  }

  function resume() {
    if (!STATE.active || STATE.running) return;
    STATE.running = true;
    lastT = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function toggle() {
    if (STATE.active) stop();
    else start();
  }

  function setMode(name, overrides) {
    if (!modePresets()[name]) return;
    STATE.mode = name;
    STATE._overrides = overrides || null;
    if (STATE.active) buildStreams();
    if (name === 'random') startRandomCycle(); else stopRandomCycle();
  }

  function startRandomCycle() {
    stopRandomCycle();
    randomizeAll();
    STATE.randomCycleTimer = setInterval(randomizeAll, 9000);
  }

  function stopRandomCycle() {
    if (STATE.randomCycleTimer) { clearInterval(STATE.randomCycleTimer); STATE.randomCycleTimer = null; }
  }

  function randomizeAll() {
    var pick = RANDOM_MODES[(Math.random() * RANDOM_MODES.length) | 0];
    STATE._overrides = null;
    var prevMode = STATE.mode;
    STATE.mode = pick;
    STATE.intensity = 0.5 + Math.random() * 0.7;
    STATE.speedMult = 0.6 + Math.random() * 1.2;
    if (STATE.active) buildStreams();
    STATE.mode = prevMode === 'random' ? 'random' : pick;
    if (prevMode === 'random') STATE.mode = 'random';
  }

  function setIntensity(v) { STATE.intensity = Math.max(0, Math.min(1, v)); if (STATE.active) buildStreams(); }
  function setSpeed(v) { STATE.speedMult = Math.max(0.1, Math.min(3, v)); }
  function setColors(obj) { STATE.colors = obj || null; }
  function enableGlow() { STATE.glowEnabled = true; }
  function disableGlow() { STATE.glowEnabled = false; }
  function enableBloom() { STATE.bloomEnabled = true; }
  function disableBloom() { STATE.bloomEnabled = false; }
  function enableChromatic() { STATE.chromaticEnabled = true; }
  function disableChromatic() { STATE.chromaticEnabled = false; }
  function enableStreaks() { STATE.streaksEnabled = true; }
  function disableStreaks() { STATE.streaksEnabled = false; }
  function enableVignette() { STATE.vignetteEnabled = true; }
  function disableVignette() { STATE.vignetteEnabled = false; }
  function enableAurora() { STATE.auroraEnabled = true; }
  function disableAurora() { STATE.auroraEnabled = false; }
  function enableFog() { STATE.fogEnabled = true; fogLayers = []; }
  function disableFog() { STATE.fogEnabled = false; fogLayers = []; }
  function enableLightBeams() { STATE.lightBeamsEnabled = true; beams = []; }
  function disableLightBeams() { STATE.lightBeamsEnabled = false; beams = []; }
  function enableStarField() { STATE.starFieldEnabled = true; stars = []; }
  function disableStarField() { STATE.starFieldEnabled = false; stars = []; }
  function enableColorShift() { STATE.colorShiftEnabled = true; }
  function disableColorShift() { STATE.colorShiftEnabled = false; }
  function enableGlowRings() { STATE.glowRingsEnabled = true; }
  function disableGlowRings() { STATE.glowRingsEnabled = false; }
  function enableShake() { STATE.shakeEnabled = true; }
  function disableShake() { STATE.shakeEnabled = false; }
  function setMusicLevel(v) { STATE.musicLevel = Math.max(0, Math.min(1, v)); }
  function isActive() { return STATE.active; }
  function getMode() { return STATE.mode; }
  function setSkyType(t) { STATE.skyType = t; applySkyContext(); }
  function setWeatherType(t) { STATE.weatherType = t; }

  // music:level custom event
  window.addEventListener('music:level', function (e) {
    if (e && e.detail && typeof e.detail.level === 'number') setMusicLevel(e.detail.level);
  });

  /* =====================================================================
   * 14. SECRET KEYWORD DETECTION
   * =================================================================== */

  var keyBuf = '';
  var KEYWORDS = {
    matrix: function () {
      if (STATE.active) { stop(); } else { setMode('matrix'); start('matrix'); }
    },
    love: function () { setMode('love'); if (!STATE.active) start('love'); },
    fairy: function () { setMode('dream'); if (!STATE.active) start('dream'); },
    dream: function () { setMode('dream'); if (!STATE.active) start('dream'); },
    galaxy: function () { setMode('galaxy'); if (!STATE.active) start('galaxy'); },
    binary: function () {
      setMode('binary');
      if (!STATE.active) start('binary');
    },
    flowers: function () {
      setMode('flowers');
      if (!STATE.active) start('flowers');
    },
    storm: function () { setMode('storm'); if (!STATE.active) start('storm'); },
    secret: function () { setMode('secret'); if (!STATE.active) start('secret'); },
    urdu: function () { setMode('urdu'); if (!STATE.active) start('urdu'); },
    arabic: function () { setMode('arabic'); if (!STATE.active) start('arabic'); },
    notes: function () { setMode('notes'); if (!STATE.active) start('notes'); },
    random: function () { setMode('random'); if (!STATE.active) start('random'); }
  };
  var LONGEST_KEYWORD = 7; // "flowers" / "arabic" / "matrix"

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    keyBuf += e.key.toLowerCase();
    if (keyBuf.length > LONGEST_KEYWORD) keyBuf = keyBuf.slice(-LONGEST_KEYWORD);
    for (var word in KEYWORDS) {
      if (keyBuf.indexOf(word) !== -1) {
        keyBuf = '';
        KEYWORDS[word]();
        break;
      }
    }
  });

  /* =====================================================================
   * 15. EXPORT
   * =================================================================== */

  window.MatrixRain = {
    // backward-compatible surface
    toggle: toggle,
    active: isActive,

    // public API
    start: start,
    stop: stop,
    pause: pause,
    resume: resume,
    setMode: setMode,
    getMode: getMode,
    setIntensity: setIntensity,
    setSpeed: setSpeed,
    setColors: setColors,
    enableGlow: enableGlow,
    disableGlow: disableGlow,
    enableBloom: enableBloom,
    disableBloom: disableBloom,
    enableChromatic: enableChromatic,
    disableChromatic: disableChromatic,
    enableStreaks: enableStreaks,
    disableStreaks: disableStreaks,
    enableVignette: enableVignette,
    disableVignette: disableVignette,
    enableAurora: enableAurora,
    disableAurora: disableAurora,
    enableFog: enableFog,
    disableFog: disableFog,
    enableLightBeams: enableLightBeams,
    disableLightBeams: disableLightBeams,
    enableStarField: enableStarField,
    disableStarField: disableStarField,
    enableColorShift: enableColorShift,
    disableColorShift: disableColorShift,
    enableGlowRings: enableGlowRings,
    disableGlowRings: disableGlowRings,
    enableShake: enableShake,
    disableShake: disableShake,
    setMusicLevel: setMusicLevel,
    setSkyType: setSkyType,
    setWeatherType: setWeatherType,
    triggerShake: triggerShake,

    // read-only
    get quality() { return STATE.quality; },
    get particleCount() { return iconActive; },
    get streamCount() { return streams.length; }
  };
})();
