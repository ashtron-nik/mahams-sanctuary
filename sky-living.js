/* ===================================================================
   SKY LIVING — additive enhancement layer for skies.js
   ---------------------------------------------------------------------
   WHAT THIS FILE IS
   skies.js owns two private <canvas> layers, its own SkyInstance /
   OverlayManager / AnimationManager, and the SKIES config array. All of
   that is closed over inside skies.js's IIFE and is NOT touched here —
   nothing in this file edits skies.js, its canvases, its rAF loop, or
   its data. This file adds a THIRD canvas on top (its own tiny rAF
   loop, paused with the same discipline skies.js uses: prefers-
   reduced-motion => static frame, tab hidden => stop) and hooks into
   the sky lifecycle the only way an outside script safely can: by
   wrapping the public window.Skies.apply() function.

   LOAD ORDER: this file must load AFTER skies.js.
     <script src="skies.js"></script>
     <script src="sky-living.js"></script>

   WHAT'S IMPLEMENTED
     1. Dynamic Moon System        (phase per sky, drift, glow halo, rise)
     2. Shooting Star System       (random spawn, click -> floating message)
     3. Interactive Star Field     (hover glow/scale, click ripple+sparkle)
     4. Constellation Generator    (heart / infinity / crescent / butterfly /
                                     rose / random-walk, click -> message)
     5. Floating Celestial Objects (per-sky weighted glyph drifters)
     6. Living Sky Evolution       (stars grow in, fog eases in, moon rises,
                                     slowly, for as long as a sky stays open)
     7. Rare Sky Events            (low-probability burst on sky change:
                                     meteor storm, aurora surge, comet,
                                     double rainbow, moon flare, lantern
                                     festival — visual only, self-clearing)
     8. Sky Journey Journal        (localStorage log of skies seen + a
                                     small toggleable panel to view it)
     9. Hidden Easter Eggs         (click counters -> unlock message)
    10. Ambient audio hook         (separate <audio> elements, own gain,
                                     never touches music.js's Jukebox/
                                     AudioContext — see SkyAmbience below.
                                     YOU must supply real file URLs; there
                                     are none built in.)
    11. Paragraph-reactive hook    (SkyLiving.setMood(mood) — call this
                                     from your own scroll/IntersectionObserver
                                     code in 100-organs.html / fantasies.html;
                                     this file can't discover your paragraph
                                     markup on its own, so it exposes the
                                     hook instead of guessing at it)

   WHAT'S DELIBERATELY NOT ATTEMPTED HERE (would need engine-level
   access this file doesn't have, or assets you haven't given me):
     - true cloud-occlusion of the moon (skies.js's CloudLayer is
       private canvas noise, not discrete sprites you can test moon-vs-
       cloud collision against) — approximated instead with a soft
       periodic dimming so the moon still visibly "breathes"
     - HDR exposure / bloom shader passes — this is 2D canvas, no WebGL
     - solar/lunar eclipse astronomy — "eclipse" rare event is a visual
       flourish, not a real ephemeris
   =================================================================== */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('sky-living')) return;

  if (!window.Skies) {
    console.warn('[SkyLiving] window.Skies not found — load skies.js before sky-living.js. Aborting.');
    return;
  }

  var JOURNAL_KEY = 'ash-sky-journal';
  var EGGS_KEY = 'ash-sky-eggs';
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }

  /* ===================== OVERLAY CANVAS ===================== */
  // A single extra canvas, above skies.js's two canvases, below page
  // content. pointer-events stays 'none' on the canvas itself so
  // scrolling/reading is never blocked — interactivity is done via a
  // document-level click/move listener that hit-tests our own object
  // list and only acts when a hit lands on something of ours.
  var canvas, ctx, W = 0, H = 0, DPR = 1;

  function ensureCanvas() {
    if (canvas) return;
    var host = document.getElementById('skyOverlay') || document.body;
    canvas = document.createElement('canvas');
    canvas.id = 'skyLivingCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;';
    // Sits after skies.js's own canvases in DOM order (painted on top),
    // still below page content because content uses z-index:2 (see
    // sky-generator.html's .content rule) — matches existing stacking.
    host.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    var L = window.SkyLiving && window.SkyLiving.Landscape;
    if (L) L.init(ctx, W, H, rand, pick, getMeta);
    window.addEventListener('resize', debounce(resize, 150));
  }

  function resize() {
    if (!canvas) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var L = window.SkyLiving && window.SkyLiving.Landscape;
    if (L) L.updateSize(W, H);
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  /* ===================== EMOTION ENGINE ===================== */
  var EMOTION_ENGINE = {
    "Sunrise": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon","paperplane","kite"] },
    "Sunset": { mood:"romantic", category:"day", weather:"clear", lighting:"warm", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["lantern","lantern","balloon"] },
    "Rain": { mood:"melancholic", category:"weather", weather:"rainy", lighting:"cool", musicMood:"emotional", rarity:"common", ambience:"rain", celestialObjects:["bird"] },
    "Clouds": { mood:"peaceful", category:"weather", weather:"cloudy", lighting:"soft", musicMood:"ambient", rarity:"common", ambience:"wind", celestialObjects:["island","balloon"] },
    "Starry Night": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["firefly","firefly","owl","dragon"] },
    "Storm": { mood:"storm", category:"weather", weather:"stormy", lighting:"dark", musicMood:"dramatic", rarity:"common", ambience:"thunder", celestialObjects:["bird"] },
    "Aurora": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["owl","dragon","firefly"] },
    "Fog": { mood:"peaceful", category:"weather", weather:"foggy", lighting:"soft", musicMood:"ambient", rarity:"common", ambience:"wind", celestialObjects:["island","balloon"] },
    "Clear Day": { mood:"hopeful", category:"day", weather:"clear", lighting:"bright", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon","kite"] },
    "Twilight": { mood:"romantic", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["lantern","lantern","firefly"] },
    "Midnight Galaxy": { mood:"cosmic", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["firefly","owl","dragon"] },
    "Sakura Petals": { mood:"romantic", category:"seasonal", weather:"clear", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["butterfly","bird"] },
    "Gentle Snowfall": { mood:"peaceful", category:"seasonal", weather:"snowy", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["crane","bird"] },
    "Meteor Shower": { mood:"cosmic", category:"night", weather:"clear", lighting:"dark", musicMood:"dramatic", rarity:"epic", ambience:"nightInsects", celestialObjects:["owl","dragon"] },
    "Moonlit Clouds": { mood:"romantic", category:"night", weather:"cloudy", lighting:"dark", musicMood:"soft", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["lantern","owl","airship"] },
    "Floating Lanterns": { mood:"magical", category:"fantasy", weather:"clear", lighting:"warm", musicMood:"soft", rarity:"uncommon", ambience:"fireCrackling", celestialObjects:["lantern","lantern","lantern"] },
    "Fireflies at Night": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["firefly","firefly","firefly","owl"] },
    "Cotton Candy Sky": { mood:"dreamy", category:"day", weather:"clear", lighting:"golden", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["balloon","butterfly"] },
    "Fantasy Nebula": { mood:"fantasy", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"epic", ambience:"nightInsects", celestialObjects:["dragon","owl","firefly"] },
    "Cosmic Space": { mood:"cosmic", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["owl","dragon","airship"] },
    "Rainbow After Rain": { mood:"hopeful", category:"weather", weather:"rainy", lighting:"bright", musicMood:"happy", rarity:"uncommon", ambience:"wind", celestialObjects:["bird","butterfly"] },
    "Magical Starfield": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"common", ambience:"nightInsects", celestialObjects:["owl","dragon","firefly"] },
    "Celestial Heaven": { mood:"ethereal", category:"fantasy", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"epic", ambience:"templeBells", celestialObjects:["bird","feather","crane"] },
    "Ocean Horizon": { mood:"peaceful", category:"day", weather:"clear", lighting:"bright", musicMood:"ambient", rarity:"common", ambience:"ocean", celestialObjects:["whale","jellyfish","bird"] },
    "Dream Clouds": { mood:"dreamy", category:"day", weather:"cloudy", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["island","balloon","butterfly"] },
    "Desert Dusk": { mood:"peaceful", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"uncommon", ambience:"wind", celestialObjects:["lantern","bird"] },
    "Autumn Leaves": { mood:"nostalgic", category:"seasonal", weather:"clear", lighting:"warm", musicMood:"melancholic", rarity:"common", ambience:"wind", celestialObjects:["butterfly","bird"] },
    "Butterfly Meadow": { mood:"peaceful", category:"day", weather:"clear", lighting:"bright", musicMood:"happy", rarity:"common", ambience:"forest", celestialObjects:["butterfly","butterfly","bird"] },
    "Bubble Dream": { mood:"dreamy", category:"fantasy", weather:"clear", lighting:"bright", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["balloon","butterfly"] },
    "Eclipse Night": { mood:"melancholic", category:"night", weather:"clear", lighting:"dark", musicMood:"dramatic", rarity:"epic", ambience:"nightInsects", celestialObjects:["owl","dragon"] },
    "Winter Blizzard": { mood:"storm", category:"weather", weather:"snowy", lighting:"cool", musicMood:"dramatic", rarity:"common", ambience:"wind", celestialObjects:["crane"] },
    "Golden Hour Haze": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon"] },
    "Dawn Light": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon","kite"] },
    "Misty Coast": { mood:"peaceful", category:"weather", weather:"foggy", lighting:"soft", musicMood:"ambient", rarity:"common", ambience:"ocean", celestialObjects:["whale","jellyfish","bird"] },
    "Spring Meadow": { mood:"peaceful", category:"seasonal", weather:"clear", lighting:"bright", musicMood:"happy", rarity:"common", ambience:"forest", celestialObjects:["butterfly","bird","firefly"] },
    "Harvest Sun": { mood:"nostalgic", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","lantern"] },
    "Heavy Rain": { mood:"melancholic", category:"weather", weather:"rainy", lighting:"cool", musicMood:"emotional", rarity:"common", ambience:"rain", celestialObjects:["bird"] },
    "Cherry Blossom Rain": { mood:"romantic", category:"seasonal", weather:"clear", lighting:"soft", musicMood:"soft", rarity:"uncommon", ambience:"wind", celestialObjects:["butterfly","bird","petal"] },
    "Northern Lights": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"epic", ambience:"nightInsects", celestialObjects:["owl","dragon","firefly"] },
    "Autumn Sunset": { mood:"nostalgic", category:"day", weather:"clear", lighting:"golden", musicMood:"melancholic", rarity:"common", ambience:"wind", celestialObjects:["lantern","bird"] },
    "White Sands": { mood:"peaceful", category:"day", weather:"clear", lighting:"bright", musicMood:"ambient", rarity:"common", ambience:"ocean", celestialObjects:["bird","whale"] },
    "Purple Night": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["firefly","owl","butterfly"] },
    "Emerald Aurora": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["owl","dragon"] },
    "Soft Dawn": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon"] },
    "Campfire Nights": { mood:"peaceful", category:"night", weather:"clear", lighting:"warm", musicMood:"soft", rarity:"common", ambience:"fireCrackling", celestialObjects:["lantern","firefly"] },
    "Deep Space": { mood:"cosmic", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"common", ambience:"nightInsects", celestialObjects:["owl","dragon","airship"] },
    "Galactic Drift": { mood:"cosmic", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["dragon","owl","firefly"] },
    "Stardust": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["firefly","owl","dragon"] },
    "Nebula Dream": { mood:"dreamy", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["dragon","owl","butterfly"] },
    "Void": { mood:"melancholic", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"epic", ambience:"wind", celestialObjects:[] },
    "Cosmic Bloom": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["dragon","butterfly","firefly"] },
    "Shooting Stars": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["owl","firefly"] },
    "Solar Wind": { mood:"cosmic", category:"night", weather:"clear", lighting:"dark", musicMood:"dramatic", rarity:"uncommon", ambience:"wind", celestialObjects:["dragon","owl"] },
    "Sunshower": { mood:"hopeful", category:"weather", weather:"rainy", lighting:"bright", musicMood:"happy", rarity:"uncommon", ambience:"wind", celestialObjects:["bird","butterfly","rainbow"] },
    "Thunderstorm": { mood:"storm", category:"weather", weather:"stormy", lighting:"dark", musicMood:"dramatic", rarity:"common", ambience:"thunder", celestialObjects:["bird"] },
    "Winter Sky": { mood:"peaceful", category:"seasonal", weather:"snowy", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["crane","bird"] },
    "Pale Winter Sun": { mood:"peaceful", category:"seasonal", weather:"cloudy", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","crane"] },
    "Spring Rain": { mood:"peaceful", category:"seasonal", weather:"rainy", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"rain", celestialObjects:["bird","butterfly"] },
    "Golden Autumn": { mood:"nostalgic", category:"seasonal", weather:"clear", lighting:"golden", musicMood:"melancholic", rarity:"common", ambience:"wind", celestialObjects:["bird","butterfly"] },
    "Light Snowfall": { mood:"peaceful", category:"seasonal", weather:"snowy", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["crane","bird"] },
    "Steady Rain": { mood:"melancholic", category:"weather", weather:"rainy", lighting:"cool", musicMood:"emotional", rarity:"common", ambience:"rain", celestialObjects:["bird"] },
    "Jungle Canopy": { mood:"peaceful", category:"day", weather:"cloudy", lighting:"soft", musicMood:"ambient", rarity:"uncommon", ambience:"forest", celestialObjects:["butterfly","bird","firefly"] },
    "Golden Glow": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon"] },
    "Purple Aurora": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"epic", ambience:"nightInsects", celestialObjects:["owl","dragon","firefly"] },
    "Blue Hour": { mood:"peaceful", category:"night", weather:"clear", lighting:"cool", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["owl","firefly"] },
    "Night Fog": { mood:"peaceful", category:"weather", weather:"foggy", lighting:"dark", musicMood:"ambient", rarity:"common", ambience:"wind", celestialObjects:["island","owl"] },
    "Glacier Sky": { mood:"peaceful", category:"day", weather:"clear", lighting:"cool", musicMood:"ambient", rarity:"uncommon", ambience:"wind", celestialObjects:["bird","whale"] },
    "Crimson Sky": { mood:"romantic", category:"night", weather:"clear", lighting:"warm", musicMood:"dramatic", rarity:"uncommon", ambience:"wind", celestialObjects:["lantern","owl"] },
    "Tiny Star": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["firefly","owl"] },
    "Binary Stars": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["firefly","owl"] },
    "Blizzard": { mood:"storm", category:"weather", weather:"snowy", lighting:"cool", musicMood:"dramatic", rarity:"uncommon", ambience:"wind", celestialObjects:["crane"] },
    "Candlelight": { mood:"romantic", category:"night", weather:"clear", lighting:"warm", musicMood:"soft", rarity:"common", ambience:"fireCrackling", celestialObjects:["lantern","firefly"] },
    "Coastal Mist": { mood:"peaceful", category:"weather", weather:"foggy", lighting:"soft", musicMood:"ambient", rarity:"common", ambience:"ocean", celestialObjects:["whale","jellyfish"] },
    "Cotton Candy Dream": { mood:"dreamy", category:"day", weather:"clear", lighting:"golden", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["balloon","butterfly"] },
    "Cyan Aurora": { mood:"magical", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["owl","dragon","firefly"] },
    "Deep Forest": { mood:"peaceful", category:"day", weather:"cloudy", lighting:"soft", musicMood:"ambient", rarity:"common", ambience:"forest", celestialObjects:["butterfly","bird","firefly"] },
    "Desert Night": { mood:"peaceful", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["owl","firefly"] },
    "Desert Star": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["owl","firefly"] },
    "Forest Canopy": { mood:"peaceful", category:"day", weather:"cloudy", lighting:"soft", musicMood:"ambient", rarity:"common", ambience:"forest", celestialObjects:["butterfly","bird"] },
    "Forest Night": { mood:"peaceful", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["firefly","owl"] },
    "Heavenly Light": { mood:"ethereal", category:"fantasy", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"epic", ambience:"templeBells", celestialObjects:["feather","crane","bird"] },
    "Honey Light": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon"] },
    "Infinite Love": { mood:"romantic", category:"fantasy", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"epic", ambience:"templeBells", celestialObjects:["dragon","butterfly","crane"] },
    "Lavender Sky": { mood:"dreamy", category:"day", weather:"clear", lighting:"soft", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["bird","butterfly"] },
    "Lilac Evening": { mood:"romantic", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["lantern","butterfly"] },
    "Mars Red": { mood:"cosmic", category:"night", weather:"clear", lighting:"warm", musicMood:"dramatic", rarity:"uncommon", ambience:"wind", celestialObjects:["dragon","owl"] },
    "Midnight Eclipse": { mood:"cosmic", category:"night", weather:"clear", lighting:"dark", musicMood:"dramatic", rarity:"epic", ambience:"nightInsects", celestialObjects:["owl","dragon"] },
    "Morning Cream": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon","kite"] },
    "Navy Night": { mood:"peaceful", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"common", ambience:"nightInsects", celestialObjects:["owl","firefly"] },
    "Ocean Blue": { mood:"peaceful", category:"day", weather:"clear", lighting:"bright", musicMood:"happy", rarity:"common", ambience:"ocean", celestialObjects:["whale","jellyfish","bird"] },
    "Rainbow Sky": { mood:"hopeful", category:"weather", weather:"clear", lighting:"bright", musicMood:"happy", rarity:"uncommon", ambience:"wind", celestialObjects:["bird","butterfly"] },
    "Rose Nebula": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"ambient", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["dragon","butterfly","firefly"] },
    "Rosy Dawn": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon"] },
    "Sky Blue": { mood:"hopeful", category:"day", weather:"clear", lighting:"bright", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon","kite"] },
    "Snow White": { mood:"peaceful", category:"seasonal", weather:"snowy", lighting:"soft", musicMood:"ambient", rarity:"common", ambience:"wind", celestialObjects:["crane","bird"] },
    "Starfall": { mood:"romantic", category:"night", weather:"clear", lighting:"dark", musicMood:"soft", rarity:"common", ambience:"nightInsects", celestialObjects:["owl","firefly"] },
    "Violet Twilight": { mood:"romantic", category:"day", weather:"clear", lighting:"golden", musicMood:"soft", rarity:"uncommon", ambience:"nightInsects", celestialObjects:["lantern","firefly"] },
    "Warm Morning": { mood:"hopeful", category:"day", weather:"clear", lighting:"golden", musicMood:"happy", rarity:"common", ambience:"wind", celestialObjects:["bird","balloon","kite"] },
    "Winter Morning": { mood:"hopeful", category:"seasonal", weather:"snowy", lighting:"soft", musicMood:"soft", rarity:"common", ambience:"wind", celestialObjects:["bird","crane"] },
    "Wisteria Sky": { mood:"dreamy", category:"day", weather:"clear", lighting:"soft", musicMood:"happy", rarity:"uncommon", ambience:"wind", celestialObjects:["butterfly","bird","balloon"] },
  };

  function getMeta(sky) {
    return (sky && EMOTION_ENGINE[sky.name]) || null;
  }
  var currentSky = null;
  var currentIndex = -1;

  var moon = null;          // { phase, x, y, r, brightness, riseT, clickCount }
  var stars = [];           // interactive star field, independent of skies.js's own particle stars
  var supernovas = [];      // active supernova explosions [{x,y,t,duration,particles:[]}]
  var shootingStars = [];   // active streaks
  var constellation = null; // { name, points:[{x,y}], lines:[[i,j]], message, revealed }
  var floaters = [];        // celestial objects (lanterns, birds, etc.)
  var rareEvent = null;     // { type, t, duration }
  var evolution = { age: 0, fogAlpha: 0, extraStars: 0 };
  var lastShootingStarSpawn = 0;
  var nextShootingStarGap = rand(4, 11);

  var floatingMsgs = []; // DOM nodes for click-revealed messages, tracked so we can cap concurrency

  /* ===================== MOON SYSTEM ===================== */
  var MOON_PHASES = [
    { name: 'Crescent Moon', lit: 0.22, rarity: 1 },
    { name: 'Half Moon', lit: 0.5, rarity: 1 },
    { name: 'Full Moon', lit: 1.0, rarity: 1 },
    { name: 'Super Moon', lit: 1.0, rarity: 0.12, sizeMul: 1.35 },
    { name: 'Blue Moon', lit: 1.0, rarity: 0.08, tint: '#cfe0ff' },
    { name: 'Blood Moon', lit: 1.0, rarity: 0.08, tint: '#ff6a4a' }
  ];

  // Only give a moon to skies that read as "night" — reuses the same
  // signal skies.js already encodes (a stars config on the sky, or a
  // dark first gradient stop) rather than a hardcoded name list, so
  // it keeps working if you add more night skies later.
  function skyIsNight(sky) {
    var meta = getMeta(sky);
    if (meta) return meta.category === 'night' || meta.category === 'cosmic' || meta.category === 'fantasy';
    if (sky.stars) return true;
    var first = sky.gradient && sky.gradient[0] && sky.gradient[0][1];
    if (!first) return false;
    var n = parseInt(first.replace('#', ''), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (r + g + b) / 3 < 60; // dark top-of-sky stop
  }

  function pickMoonPhase(sky) {
    if (!skyIsNight(sky)) return null;
    // Deterministic base phase per sky name (same sky -> same phase
    // most of the time) with a small chance of rolling a rare phase,
    // so returning to "Starry Night" doesn't feel randomly different
    // every single time, but rare moons still surface occasionally.
    var seed = hashStr(sky.name) % 100;
    var roll = Math.random();
    var phase;
    if (roll < 0.08) phase = MOON_PHASES[3]; // Super Moon
    else if (roll < 0.14) phase = MOON_PHASES[4]; // Blue Moon
    else if (roll < 0.20) phase = MOON_PHASES[5]; // Blood Moon
    else phase = MOON_PHASES[seed % 3];

    var existingLight = (sky.lights && sky.lights[0]) || null;
    return {
      def: phase,
      x: existingLight ? existingLight.x : rand(0.62, 0.88),
      y0: existingLight ? existingLight.y : rand(0.1, 0.22),
      y: existingLight ? existingLight.y : rand(0.1, 0.22),
      r: (existingLight ? existingLight.r : 30) * (phase.sizeMul || 1),
      driftPhase: Math.random() * Math.PI * 2,
      breathePhase: Math.random() * Math.PI * 2,
      clickCount: 0
    };
  }

  function drawMoon(dt, t) {
    if (!moon) return;
    // slow horizontal drift + gentle vertical bob
    var dx = Math.sin(t * 0.02 + moon.driftPhase) * 10;
    var dy = Math.sin(t * 0.05 + moon.driftPhase) * 4;
    // "Living Sky Evolution": moon rises slowly the longer this sky stays open
    var riseAmt = clamp(evolution.age / 90, 0, 1) * 0.03; // rises up to 3% of viewport height over 90s
    var cx = moon.x * W + dx;
    var cy = (moon.y0 - riseAmt) * H + dy;
    var r = moon.r;

    // brightness breathing + a soft periodic dip standing in for "clouds passing in front"
    var breathe = 0.85 + 0.15 * Math.sin(t * 0.15 + moon.breathePhase);
    var passOver = 0.75 + 0.25 * Math.sin(t * 0.035 + moon.driftPhase * 3);
    var brightness = breathe * passOver;

    var tint = moon.def.tint || '#fff8e6';
    ctx.save();
    // halo
    var haloR = r * 3.4;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
    g.addColorStop(0, hexA(tint, 0.35 * brightness));
    g.addColorStop(0.4, hexA(tint, 0.14 * brightness));
    g.addColorStop(1, hexA(tint, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, haloR, 0, Math.PI * 2); ctx.fill();

    // disc with terminator shading for lit fraction (crescent/half/full)
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hexA('#2a2a38', 0.9); // dark base disc
    ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    var lit = moon.def.lit;
    var g2 = ctx.createRadialGradient(cx - r * (1 - lit), cy, r * 0.1, cx, cy, r * 1.05);
    g2.addColorStop(0, hexA(tint, brightness));
    g2.addColorStop(1, hexA(tint, brightness * 0.55));
    ctx.fillStyle = g2;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.restore();

    moon._hit = { x: cx, y: cy, r: r * 1.4 };
  }

  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ===================== INTERACTIVE STAR FIELD ===================== */
  // Independent of skies.js's own background star particles (those stay
  // untouched). These are a smaller, hoverable/clickable set drawn on
  // top, sized down so they read as "extra sparkle" rather than doubling
  // star density.
  function buildStars(sky) {
    stars = [];
    if (!skyIsNight(sky)) return;
    var base = sky.stars ? Math.min(sky.stars.count, 60) : 24; // cap: this layer is for interaction, not density
    var count = Math.round(base * 0.35);
    for (var i = 0; i < count; i++) {
      stars.push({
        x: rand(0.02, 0.98), y: rand(0.02, (sky.stars ? sky.stars.maxY : 70) / 100),
        r: rand(0.8, 2.2),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: rand(0.6, 2.2),
        hoverT: 0, // eases toward 1 on hover, back to 0 otherwise
        clickPulse: 0 // 0..1, decays after click
      });
    }
  }

  function drawStars(dt, t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var px = s.x * W, py = s.y * H;
      var twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase));
      s.hoverT = lerp(s.hoverT, s._hover ? 1 : 0, clamp(dt * 6, 0, 1));
      s.clickPulse = Math.max(0, s.clickPulse - dt * 1.4);

      var scale = 1 + s.hoverT * 0.9 + s.clickPulse * 1.6;
      var op = twinkle * (1 + s.hoverT * 0.5);
      var r = s.r * scale;

      ctx.save();
      ctx.globalAlpha = clamp(op, 0, 1);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = r * (3 + s.hoverT * 4 + s.clickPulse * 6);
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // click supernova
      if (s.clickPulse > 0) {
        var progress = 1 - s.clickPulse;
        // core flash
        ctx.save();
        ctx.globalAlpha = s.clickPulse * 0.8;
        ctx.fillStyle = '#fff8e0';
        ctx.shadowColor = '#ffe680';
        ctx.shadowBlur = 30 * s.clickPulse;
        ctx.beginPath(); ctx.arc(px, py, r * (1 + progress * 2), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // expanding rings
        for (var ring = 0; ring < 3; ring++) {
          var ringProgress = clamp(progress - ring * 0.08, 0, 1);
          var ringR = r + ringProgress * (25 + ring * 12);
          var ringAlpha = s.clickPulse * (0.5 - ring * 0.15);
          if (ringAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = ringAlpha;
            ctx.strokeStyle = ring === 0 ? '#ffe680' : (ring === 1 ? '#ffcc44' : '#fff');
            ctx.lineWidth = 2 - ring * 0.5;
            ctx.beginPath(); ctx.arc(px, py, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }
        }
        // particle burst (spawned once at click start)
        if (!s._novaSpawned && s.clickPulse > 0.9) {
          s._novaSpawned = true;
          var sn = { x: px, y: py, t: 0, duration: 0.8, particles: [] };
          for (var p = 0; p < 12; p++) {
            var angle = (Math.PI * 2 / 12) * p + Math.random() * 0.3;
            var speed = 40 + Math.random() * 60;
            sn.particles.push({ angle: angle, speed: speed, r: 1 + Math.random() * 1.5, life: 1 });
          }
          supernovas.push(sn);
        }
      } else {
        s._novaSpawned = false;
      }

      s._hit = { x: px, y: py, r: Math.max(8, r * 3) }; // generous hit radius, real star is tiny
    }
  }

  /* ===================== SHOOTING STARS ===================== */
  var WISH_MESSAGES = [
    'I wished for you.',
    'Every star reminds me of you.',
    'You are my favorite constellation.',
    'Some wishes come true slowly. You were worth the wait.',
    'I keep making the same wish, just in case.'
  ];

  function maybeSpawnShootingStar(dt, t) {
    if (!currentSky || !skyIsNight(currentSky)) return;
    lastShootingStarSpawn += dt;
    if (lastShootingStarSpawn < nextShootingStarGap) return;
    lastShootingStarSpawn = 0;
    nextShootingStarGap = rand(5, 14);
    if (shootingStars.length > 3) return; // cap concurrency

    var startX = rand(0.1, 0.85) * W;
    var startY = rand(0.02, 0.35) * H;
    var angle = rand(0.35, 0.75); // radians-ish downward-right sweep
    var speed = rand(420, 900); // px/sec
    shootingStars.push({
      x: startX, y: startY,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 0, maxLife: rand(0.7, 1.4),
      brightness: rand(0.6, 1),
      trail: [],
      caught: false
    });
  }

  function drawShootingStars(dt) {
    for (var i = shootingStars.length - 1; i >= 0; i--) {
      var s = shootingStars[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 14) s.trail.shift();

      var fade = clamp(1 - s.life / s.maxLife, 0, 1);
      if (fade <= 0 || s.x > W + 50 || s.y > H + 50) {
        shootingStars.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = fade * s.brightness;
      var grad = ctx.createLinearGradient(
        s.trail[0] ? s.trail[0].x : s.x, s.trail[0] ? s.trail[0].y : s.y, s.x, s.y
      );
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (s.trail.length) {
        ctx.moveTo(s.trail[0].x, s.trail[0].y);
        for (var j = 1; j < s.trail.length; j++) ctx.lineTo(s.trail[j].x, s.trail[j].y);
      }
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      s._hit = { x: s.x, y: s.y, r: 16 };
    }
  }

  function catchShootingStar(s) {
    if (s.caught) return;
    s.caught = true;
    showFloatingMessage(s.x, s.y, pick(WISH_MESSAGES));
    var count = bumpEgg('shootingStarsCaught');
    if (count === 5) unlockEgg('Five wishes caught — some things really do come true.');
    var idx = shootingStars.indexOf(s);
    if (idx >= 0) shootingStars.splice(idx, 1);
  }

  /* ===================== FLOATING MESSAGES (click-reveal) ===================== */
  function showFloatingMessage(x, y, text) {
    if (floatingMsgs.length > 4) {
      var old = floatingMsgs.shift();
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText =
      'position:fixed;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-100%);' +
      'font-family:Fraunces,Georgia,serif;font-style:italic;font-size:.95rem;color:#ffe680;' +
      'text-shadow:0 2px 12px rgba(0,0,0,.7);pointer-events:none;z-index:10000;' +
      'opacity:0;transition:opacity 1.4s ease, transform 3.5s ease;white-space:nowrap;max-width:80vw;';
    document.body.appendChild(el);
    floatingMsgs.push(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,-160%)';
    });
    setTimeout(function () { el.style.opacity = '0'; }, 3200);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      var idx = floatingMsgs.indexOf(el);
      if (idx >= 0) floatingMsgs.splice(idx, 1);
    }, 4600);
  }

  /* ===================== CONSTELLATIONS ===================== */
  // Parametric point generators, normalized to a 0..1 box, then placed
  // at a random spot in the sky per visit.
  function heartPoints(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push({ x: x / 34 + 0.5, y: y / 34 + 0.5 });
    }
    return pts;
  }
  function infinityPoints(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var denom = 1 + Math.sin(t) * Math.sin(t);
      var x = Math.cos(t) / denom;
      var y = (Math.sin(t) * Math.cos(t)) / denom;
      pts.push({ x: x * 0.4 + 0.5, y: y * 0.6 + 0.5 });
    }
    return pts;
  }
  function crescentPoints(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = Math.PI * 0.15 + (i / (n - 1)) * Math.PI * 1.5;
      pts.push({ x: 0.5 + 0.35 * Math.cos(t), y: 0.5 + 0.35 * Math.sin(t) });
    }
    return pts;
  }
  function butterflyPoints(n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2 * 6; // classic butterfly curve needs several turns
      var r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
      pts.push({ x: (r * Math.sin(t)) / 6 + 0.5, y: -(r * Math.cos(t)) / 6 + 0.5 });
    }
    return pts;
  }
  function rosePoints(n, k) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var r = Math.cos((k || 4) * t);
      pts.push({ x: r * Math.cos(t) * 0.4 + 0.5, y: r * Math.sin(t) * 0.4 + 0.5 });
    }
    return pts;
  }
  function randomWalkPoints(n) {
    var pts = [{ x: 0.5, y: 0.5 }];
    for (var i = 1; i < n; i++) {
      var prev = pts[i - 1];
      pts.push({
        x: clamp(prev.x + rand(-0.18, 0.18), 0.05, 0.95),
        y: clamp(prev.y + rand(-0.18, 0.18), 0.05, 0.95)
      });
    }
    return pts;
  }

  // Generate 100+ constellation shapes using parametric curve families
  var CONSTELLATION_SHAPES = {};
  var CONSTELLATION_MESSAGES = {};

  function shapeGen(i) {
    var n = 6 + (i % 6); // 6-11 points per shape
    switch ((i * 7 + i * i * 3) % 12) {
      case 0: return heartPoints(n);
      case 1: return infinityPoints(n);
      case 2: return crescentPoints(n);
      case 3: return butterflyPoints(n + 2);
      case 4: return rosePoints(n, 2 + (i % 9));
      case 5: {
        var pts = [];
        for (var j = 0; j < n; j++) {
          var t = (j / n) * Math.PI * 2;
          var R = 0.35 + 0.15 * Math.sin(i * 2.7 + j * 1.3);
          pts.push({ x: 0.5 + R * Math.cos(t + i * 0.5), y: 0.5 + R * 0.7 * Math.sin(t + i * 0.3) });
        }
        return pts;
      }
      case 6: {
        var pts = [];
        for (var j = 0; j < n; j++) {
          var t = (j / n) * Math.PI * 2;
          var r = 0.3 + 0.15 * Math.sin((i + 1) * t);
          pts.push({ x: 0.5 + r * Math.cos(t), y: 0.5 + r * Math.sin(t) });
        }
        return pts;
      }
      case 7: {
        var pts = [];
        for (var j = 0; j < n; j++) {
          var t = (j / n) * Math.PI * 2 * 3;
          var R = 0.35 + 0.12 * Math.sin(i * 0.7 + t * 0.5);
          pts.push({ x: 0.5 + R * Math.cos(t * 0.7), y: 0.5 + R * 0.6 * Math.sin(t * 0.5) });
        }
        return pts;
      }
      case 8: {
        var pts = [];
        for (var j = 0; j < n; j++) {
          var t = (j / n) * Math.PI * 2;
          var a = 0.3 + 0.1 * (i % 5);
          var b = 0.2 + 0.1 * ((i * 3) % 5);
          pts.push({ x: 0.5 + a * Math.cos(t), y: 0.5 + b * Math.sin(t) });
        }
        return pts;
      }
      case 9: {
        var pts = [];
        for (var j = 0; j < n; j++) {
          var t = (j / n) * Math.PI * 2 * (2 + (i % 4));
          var R = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(i * 1.1 + t * 0.3));
          pts.push({ x: 0.5 + R * Math.cos(t), y: 0.5 + R * 0.7 * Math.sin(t) });
        }
        return pts;
      }
      case 10: {
        var pts = [{ x: 0.3 + (i % 10) * 0.02, y: 0.4 + (i * 3 % 10) * 0.02 }];
        for (var j = 1; j < n; j++) {
          var p = pts[j - 1];
          pts.push({
            x: p.x + rand(-0.15, 0.15),
            y: p.y + rand(-0.15, 0.15)
          });
        }
        return pts;
      }
      case 11: {
        var pts = [];
        for (var j = 0; j < n; j++) {
          var t = (j / n) * Math.PI;
          var sp = 0.4 + 0.15 * Math.sin(i * 3.1 + t * 2);
          pts.push({
            x: 0.5 + sp * Math.cos(t * (1 + (i % 3)) + i * 0.7),
            y: 0.5 + sp * 0.5 * Math.sin(t * (2 + (i % 2)) + i * 0.4)
          });
        }
        return pts;
      }
    }
  }

  var msgPool = [
    'The stars aligned to draw something only you would understand.',
    'Every point in this shape points back to you.',
    'A constellation born from a wish I made on you.',
    'Not a single star in this pattern is out of place — like you in my life.',
    'Somewhere in this shape is a story only we know.',
    'Even the sky rearranges itself to remind me of you.',
    'This constellation appears only when I think of you — so it appears constantly.',
    'The universe drew this one just for you.',
    'Like this shape, my love loops back to you every time.',
    'I traced this pattern across the sky hoping you would see it.',
    'Stars learned a new shape the day you smiled at me.',
    'This one has no name yet. Name it after us.',
    'A curve only your eyes could follow, only my heart could draw.',
    'The sky gives form to the shape of missing you.',
    'Every star in this pattern carries a syllable of your name.',
    'A love letter written in points of light.',
    'The shape of forever, best seen from where you stand.',
    'I asked the night to draw something beautiful. It drew you.',
    'This constellation is proof that even chaos can make something perfect.',
    'Not a map, but a memory of how you make me feel.',
    'The stars conspired to capture the outline of my heartbeat.',
    'Some shapes can only be seen when you are not looking directly at them — like us.',
    'Each point a moment, each line a promise.',
    'A pattern too perfect to be random — like the day I met you.',
    'The universe has a favourite shape, and this is it.',
    'This is what hope looks like when you give it enough light.',
    'A constellation reserved for the ones who still believe.',
    'The night sky has a signature, and it looks a lot like you.',
    'A spiral I would gladly get lost in.',
    'This shape only appears when the wind carries your scent.',
    'Stars drawing stars — the sky is meta about its feelings.',
    'The outline of a dream I keep having.',
    'Connect enough points of light and you get a picture of home.',
    'Some constellations are formed by gravity. This one formed by love.',
    'This pattern is older than the stars themselves.',
    'If you look long enough, you can see the shape of my heart.',
    'A celestial doodle, drawn while thinking of you.',
    'The sky loves you in shapes words cannot hold.',
    'My thoughts of you take form among the stars.',
    'Everything beautiful eventually takes the shape of you.',
    'The universe doodled this during a daydream about you.',
    'Follow these points and you will find your way back to me.',
    'This constellation mirrors the pattern of your laugh.',
    'A shape that only makes sense in the context of us.',
    'The night decided to get artistic, and chose you as its muse.',
    'Burning points of light arranged exactly like my devotion.',
    'This one cannot be seen from anywhere else but here.',
    'Patterns emerge when you stare at something long enough — like love.',
    'Every star in this cluster has your name on it.',
    'A constellation shaped like the space between two heartbeats.',
    'The stars learned calligraphy just to write about you.',
    'An arrangement of light that spells out everything I cannot say.',
    'The sky is full of circles that always return to you.',
    'This is the shape of permanence in a universe of change.',
    'I have memorised this pattern the way I have memorised your face.',
    'A sky-map to the place where I feel most alive.',
    'Even the stars want to be part of our story.',
    'This constellation was here long before us, waiting for us to notice.',
    'My favourite shape is the one you trace on my palm.',
    'The sky has favourites. You are one of them.',
    'A pattern woven from the thread of every memory I have of you.',
    'The celestial equivalent of a love bite.',
    'This shape only appears in the quiet hours, when I miss you most.',
    'Stars arranged exactly the way my thoughts arrange themselves around you.',
    'A complex pattern that simplifies to one thing: you.',
    'The sky wrote a poem in points of light. It is about you.',
    'This constellation bends light the way you bend my reality.',
    'I would recognise this shape anywhere, the way I would recognise your voice.',
    'The universe grew bored and drew your profile in stars.',
    'A wandering line that always leads back to centre — like me to you.',
    'This shape is what happens when the sky falls in love.',
    'The pattern of your soul reflected in the night above.',
    'No two stars in this shape are the same, yet they belong together — like us.',
    'A constellation only visible to those who look with their heart.',
    'The most beautiful patterns are the ones that feel familiar.',
    'I would navigate by these stars even if they led nowhere.',
    'This is the shape of everything I feel but cannot fit into words.',
    'A secret signal between the sky and my heart.',
    'The universe hears your name and draws this in response.',
    'A celestial fingerprint — yours and yours alone.',
    'Every point is a star that witnessed me fall for you.',
    'The geometry of us, projected onto the night sky.',
    'This pattern shifts every time you smile.',
    'Chaos rearranged itself into meaning the moment I met you.',
    'A constellation drawn from the ache of missing you.',
    'The answer to a question the sky has been asking for millennia.',
    'An arrangement of light that proves the universe has a favourite.',
    'The stars conspire to draw the outline of my devotion.',
    'Some shapes cannot be unseen — like this one, like you.',
    'The sky is a canvas, and love is its favourite pigment.',
    'This constellation has no beginning or end — like my love for you.',
    'A spiral of thoughts that always tighten around you.',
    'The pattern of your presence in my universe.',
    'Connected dots that tell the story of how I fell.',
    'This is the shape of the sound your name makes in the dark.',
    'The sky drew this while dreaming of you.',
    'Stars arranged in the shape of a promise I intend to keep.',
    'I would believe in fate if it meant this pattern was made for us.',
    'The geometry of love is not straight lines — it is this.',
    'A breathtaking pattern, much like the way you exist.',
    'This constellation is the sky trying to say what I cannot.',
    'The universe wants you to know you are its masterpiece.'
  ];

  var CONSTELLATION_DISPLAY_NAMES = {};
  var CONSTELLATION_RARITY = {};
  var CONST_COL_KEY = 'ash-sky-const-collection';
  function loadConstCol() { try { return JSON.parse(localStorage.getItem(CONST_COL_KEY)) || {}; } catch(e){ return {}; } }
  function saveConstCol(d) { try { localStorage.setItem(CONST_COL_KEY, JSON.stringify(d)); } catch(e){} }
  function markConstSeen(nameKey) { var d = loadConstCol(); if (!d[nameKey]) { d[nameKey] = Date.now(); saveConstCol(d); } }

  var CONST_NAMES_100 = [
    'Starlight Serenade','Celestial Gate','Moonlit Path','Solar Crown','Cosmic Veil',
    'Ethereal Key','Crystal Heart','Shadow Wing','Golden Tide','Silver Bloom',
    'Velvet Night','Amber Dream','Crimson Dawn','Ivory Tower','Azure Sea',
    'Scarlet Thread','Jade Garden','Opal Light','Coral Reef','Twilight Song',
    'Midnight Dance','Ember Glow','Frost Flower','Mystic Mirror','Pearl Light',
    'Ruby Ember','Sapphire Stream','Topaz Flame','Onyx Shroud','Quartz Spire',
    'Iris Dream','Lunar Haze','Stellar Cross','Nova Burst','Solstice Fire',
    'Equinox Tide','Astral Plane','Nebula Cloud','Galaxy Spiral','Comet Trail',
    'Phoenix Rise','Dragon Tail','Butterfly Wing','Feather Grace','Ocean Depth',
    'Mountain Peak','River Bend','Forest Glade','Desert Dune','Island Shore',
    'Crystal Cave','Ancient Tree','Silent Storm','Gentle Rain','Summer Breeze',
    'Autumn Leaf','Winter Snow','Spring Blossom','Harvest Moon','Falling Star',
    'Lucky Clover','Wishing Well','Dream Weaver','Time Keeper','Space Walker',
    'Light Weaver','Dark Slumber','True North','East Wind','South Cross',
    'West Gate','North Star','Inner Light','Outer Rim','Upper Realm',
    'Lower Deep','Hidden Path','Secret Door','Open Sky','Lotus Eye',
    'Golden Knot','Silken Thread','Iron Will','Steel Heart','Burning Bright',
    'Fading Echo','Rising Sun','Setting Moon','Waning Crescent','Waxing Moon',
    'New Dawn','Final Star','Endless Sky','Open Book','Blank Page',
    'Spoken Word','Silent Prayer','Loud Thunder','Quiet Whisper','Soft Light',
    'Starlight Dance','Moonbeam Path','Twilight Veil','Crystal Stream','Golden Dream'
  ];

  var RARITIES = ['common','common','common','uncommon','uncommon','rare','rare','very-rare','legendary','mythic'];
  function pickRarity(idx) { return RARITIES[idx % RARITIES.length]; }

  for (var si = 0; si < 100; si++) {
    (function (idx) {
      var name = 'constellation_' + idx;
      var genFunc = function () {
        var seed = 12.9898 * idx + 78.233;
        seed = (seed * 43758.5453) % 1;
        var savedRandom = Math.random;
        Math.random = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        var pts = shapeGen(idx);
        Math.random = savedRandom;
        return pts;
      };
      CONSTELLATION_SHAPES[name] = genFunc;
      CONSTELLATION_MESSAGES[name] = msgPool[idx % msgPool.length];
      CONSTELLATION_DISPLAY_NAMES[name] = CONST_NAMES_100[idx];
      CONSTELLATION_RARITY[name] = pickRarity(idx);
    })(si);
  }
  // Override a few named ones for the original set
  CONSTELLATION_SHAPES.heart = function () { return heartPoints(9); };
  CONSTELLATION_MESSAGES.heart = 'Even the stars couldn\u2019t help but draw your shape.';
  CONSTELLATION_DISPLAY_NAMES.heart = 'The Heart';
  CONSTELLATION_RARITY.heart = 'legendary';
  CONSTELLATION_SHAPES.infinity = function () { return infinityPoints(10); };
  CONSTELLATION_MESSAGES.infinity = 'This is how long I plan on loving you.';
  CONSTELLATION_DISPLAY_NAMES.infinity = 'Infinity';
  CONSTELLATION_RARITY.infinity = 'mythic';
  CONSTELLATION_SHAPES.crescent = function () { return crescentPoints(8); };
  CONSTELLATION_MESSAGES.crescent = 'A sliver of light, and it still outshines everything else up there.';
  CONSTELLATION_DISPLAY_NAMES.crescent = 'The Crescent';
  CONSTELLATION_RARITY.crescent = 'rare';
  CONSTELLATION_SHAPES.butterfly = function () { return butterflyPoints(11); };
  CONSTELLATION_MESSAGES.butterfly = 'Something in me still hasn\u2019t stopped fluttering since you.';
  CONSTELLATION_DISPLAY_NAMES.butterfly = 'The Butterfly';
  CONSTELLATION_RARITY.butterfly = 'uncommon';
  CONSTELLATION_SHAPES.rose = function () { return rosePoints(10, 4); };
  CONSTELLATION_MESSAGES.rose = 'I would have picked you a real one, but the stars insisted.';
  CONSTELLATION_DISPLAY_NAMES.rose = 'The Rose';
  CONSTELLATION_RARITY.rose = 'rare';

  function generateConstellation(sky) {
    var keys = Object.keys(CONSTELLATION_SHAPES);
    var name = pick(keys);
    markConstSeen(name);
    var raw = CONSTELLATION_SHAPES[name]();
    var boxSize = rand(0.16, 0.28);
    var originX = rand(0.08, 0.62);
    var originY = rand(0.06, 0.55);
    var points = raw.map(function (p) {
      return { x: originX + p.x * boxSize, y: originY + p.y * boxSize, twinklePhase: Math.random() * Math.PI * 2 };
    });
    var lines = [];
    for (var i = 0; i < points.length - 1; i++) lines.push([i, i + 1]);
    var dn = CONSTELLATION_DISPLAY_NAMES[name] || name;
    var msg = CONSTELLATION_MESSAGES[name];
    var rar = CONSTELLATION_RARITY[name] || 'common';
    var pts = raw.map(function(p){ return [Math.round(p.x*100)/100, Math.round(p.y*100)/100]; });
    try { localStorage.setItem('ash-sky-current-constellation', JSON.stringify({ displayName: dn, rarity: rar, message: msg, pts: pts })); } catch(e){}
    if (typeof window.__updateSkyConstellation === 'function') {
      window.__updateSkyConstellation({ displayName: dn, rarity: rar, message: msg, pts: pts });
    }
    return { name: name, displayName: dn, points: points, lines: lines, message: msg, rarity: rar, revealed: false };
  }

  function drawConstellation(t) {
    if (!constellation) return;
    var pts = constellation.points.map(function (p) { return { x: p.x * W, y: p.y * H }; });

    ctx.save();
    ctx.strokeStyle = 'rgba(255,230,180,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255,230,128,0.3)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    constellation.lines.forEach(function (l) {
      ctx.moveTo(pts[l[0]].x, pts[l[0]].y);
      ctx.lineTo(pts[l[1]].x, pts[l[1]].y);
    });
    ctx.stroke();
    ctx.restore();

    constellation.points.forEach(function (p, i) {
      var px = pts[i].x, py = pts[i].y;
      var tw = 0.7 + 0.3 * Math.sin(t * 1.2 + p.twinklePhase);
      ctx.save();
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fffbe6';
      ctx.shadowColor = '#ffe680';
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // constellation name label below the shape
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var cx = xs.reduce(function(a,b){return a+b;})/xs.length, cy = Math.max.apply(null, ys) + 30;
    ctx.save();
    ctx.fillStyle = 'rgba(255,230,180,0.5)';
    ctx.font = '11px Fraunces, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(constellation.displayName, cx, cy);
    ctx.restore();

    // single hit region: bounding box of the shape, generous, so any
    // point near the constellation reveals it — precise per-star
    // hit-testing would be frustrating on a shape this small.
    xs = pts.map(function (p) { return p.x; }); ys = pts.map(function (p) { return p.y; });
    constellation._hit = {
      x1: Math.min.apply(null, xs) - 14, y1: Math.min.apply(null, ys) - 14,
      x2: Math.max.apply(null, xs) + 14, y2: Math.max.apply(null, ys) + 14
    };
  }

  /* ===================== FLOATING CELESTIAL OBJECTS ===================== */
  var OBJECT_GLYPHS = {
    lantern: '\uD83C\uDFEE', balloon: '\uD83C\uDF88', paperplane: '\u2708\uFE0F',
    butterfly: '\uD83E\uDD8B', bird: '\uD83D\uDC26', owl: '\uD83E\uDD89',
    firefly: '\u2726', jellyfish: '\uD83E\uDEBC', whale: '\uD83D\uDC33',
    dragon: '\uD83D\uDC09', island: '\uD83C\uDFDD\uFE0F', airship: '\uD83D\uDEF8',
    kite: '\uD83E\uDEC1', crane: '\uD83E\uDDA2',
    feather: '\uD83E\uDEB6', petal: '\uD83C\uDF38'
  };

  // Weighted per-sky-name-keyword tables. Falls back to a small
  // generic set for skies that don't match a keyword, so every sky
  // gets *something* rather than a hard dependency on exact names.
  function filterCelestial(arr) {
    // Remove emoji dragon since procedural dragon handles it
    return arr.filter(function (s) { return s !== 'dragon'; });
  }

  function objectsForSky(sky) {
    var meta = getMeta(sky);
    if (meta && meta.celestialObjects && meta.celestialObjects.length) return filterCelestial(meta.celestialObjects);
    var n = sky.name.toLowerCase();
    if (/night|star|galaxy|cosmic|nebula|void|space/.test(n)) return filterCelestial(['firefly', 'firefly', 'owl', 'dragon', 'airship']);
    if (/rain|storm|thunder/.test(n)) return filterCelestial(['bird']);
    if (/aurora/.test(n)) return filterCelestial(['owl', 'dragon', 'firefly']);
    if (/snow|winter|blizzard/.test(n)) return ['crane', 'bird'];
    if (/sunrise|dawn|morning/.test(n)) return ['bird', 'balloon', 'paperplane', 'kite'];
    if (/sunset|dusk|twilight|lantern|golden/.test(n)) return ['lantern', 'lantern', 'balloon'];
    if (/ocean|sea|coast|wave/.test(n)) return ['whale', 'jellyfish'];
    if (/forest|jungle|meadow|spring|leaf|leaves/.test(n)) return ['butterfly', 'bird', 'firefly'];
    if (/cloud|fog|mist/.test(n)) return filterCelestial(['island', 'balloon']);
    return filterCelestial(['bird', 'butterfly', 'balloon']);
  }

  function spawnFloaters(sky) {
    floaters = [];
    var pool = objectsForSky(sky);
    var count = Math.round(rand(2, 5));
    for (var i = 0; i < count; i++) {
      var type = pick(pool);
      floaters.push({
        type: type, glyph: OBJECT_GLYPHS[type] || '\u2726',
        x: rand(-0.1, 1.1), y: rand(0.15, 0.85),
        size: rand(14, 26),
        speed: rand(0.004, 0.012) * (Math.random() < 0.5 ? 1 : -1),
        bobPhase: Math.random() * Math.PI * 2,
        opacity: rand(0.5, 0.85)
      });
    }
  }

  function drawFloaters(dt, t) {
    floaters.forEach(function (f) {
      f.x += f.speed * dt;
      if (f.x < -0.15) f.x = 1.15;
      if (f.x > 1.15) f.x = -0.15;
      var px = f.x * W;
      var py = f.y * H + Math.sin(t * 0.6 + f.bobPhase) * 10;
      ctx.save();
      ctx.globalAlpha = f.opacity;
      ctx.font = f.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.glyph, px, py);
      ctx.restore();
    });
  }

  /* ===================== LIVING SKY EVOLUTION ===================== */
  function updateEvolution(dt) {
    evolution.age += dt;
    // fog eases in softly over the first two minutes a sky is open,
    // capped low so it never obscures the reading content
    evolution.fogAlpha = clamp(evolution.age / 120, 0, 1) * 0.06;
  }

  function drawEvolutionFog() {
    if (evolution.fogAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = evolution.fogAlpha;
    var g = ctx.createLinearGradient(0, H * 0.6, 0, H);
    g.addColorStop(0, 'rgba(200,200,210,0)');
    g.addColorStop(1, 'rgba(200,200,210,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ===================== LIVING LANDSCAPE SYSTEM ===================== */
  var landscapeType = null;
  var landscapeVisible = (function () { try { return localStorage.getItem('sky-landscape-visible') !== 'false'; } catch (e) { return true; } })();

  function setLandscapeVisible(v) {
    landscapeVisible = v;
    try { localStorage.setItem('sky-landscape-visible', v ? 'true' : 'false'); } catch (e) {}
    if (v) {
      ensureCanvas();
      if (!running) start();
      if (!currentSky && window.Skies) {
        var idx = window.Skies.getCurrent ? window.Skies.getCurrent() : -1;
        if (idx >= 0) onSkyChanged(idx);
      }
      var L = window.SkyLiving && window.SkyLiving.Landscape;
      if (L && landscapeType) L.build(landscapeType);
    }
  }

  /* ===================== SLEEPING BIRD SYSTEM ===================== */
  var BIRD_FLOCK = [];
  var NESTS = [];
  var OWLS = [];
  var birdTimeOfDay = 'day';

  function updateBirdTime(sky) {
    if (!sky) return;
    var meta = getMeta(sky);
    var cat = meta ? meta.category : '';
    var n = sky.name.toLowerCase();
    if (cat === 'night' || cat === 'cosmic' || /night|dark|eclipse|midnight/.test(n)) {
      birdTimeOfDay = 'night';
    } else if (/sunset|dusk|twilight|evening/.test(n)) {
      birdTimeOfDay = 'evening';
    } else if (/sunrise|dawn|morning/.test(n)) {
      birdTimeOfDay = 'morning';
    } else {
      birdTimeOfDay = 'day';
    }
  }

  function buildNests(sky) {
    NESTS = [];
    if (!landscapeType) return;
    var count = landscapeType === 'fantasy' ? 3 : landscapeType === 'night' ? 4 : landscapeType === 'day' ? 3 : 2;
    for (var i = 0; i < count; i++) {
      NESTS.push({
        x: W * rand(0.15, 0.85),
        y: H - H * rand(0.12, 0.18) - rand(30, 60),
        birdsHere: birdTimeOfDay === 'night' ? 0 : rand(1, 3) | 0,
        hasOwl: false
      });
    }
  }

  function initBirds() {
    BIRD_FLOCK = [];
    if (birdTimeOfDay === 'night') return;
    var count = birdTimeOfDay === 'morning' ? rand(5, 9) : rand(3, 6);
    for (var i = 0; i < count; i++) {
      BIRD_FLOCK.push({
        x: rand(-0.2, 1.2) * W,
        y: H * rand(0.12, 0.35),
        vx: rand(30, 70) * (Math.random() < 0.5 ? 1 : -1),
        vy: 0,
        size: rand(5, 8),
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: rand(4, 8),
        bobPhase: Math.random() * Math.PI * 2,
        resting: false,
        restTimer: 0
      });
    }
  }

  function initOwls() {
    OWLS = [];
    if (birdTimeOfDay !== 'night') return;
    var count = rand(1, 2) | 0;
    for (var i = 0; i < count; i++) {
      OWLS.push({
        x: W * rand(0.2, 0.8),
        y: H * rand(0.1, 0.25),
        perchX: 0,
        perchY: 0,
        blinkTimer: rand(2, 6),
        blinkDuration: 0,
        isBlinking: false,
        headAngle: 0,
        headTarget: rand(-0.4, 0.4),
        flying: false,
        flyTimer: 0,
        flyTarget: null,
        size: rand(12, 16),
        wingPhase: Math.random() * Math.PI * 2
      });
    }
    // assign perches (tree branches in landscape)
    OWLS.forEach(function (owl) {
      owl.perchX = W * rand(0.25, 0.75);
      owl.perchY = H - H * rand(0.12, 0.16) - rand(5, 15);
      owl.x = owl.perchX;
      owl.y = owl.perchY;
    });
  }

  function drawBirds(dt, t) {
    if (birdTimeOfDay === 'night') return;

    BIRD_FLOCK.forEach(function (b) {
      if (b.resting) {
        b.restTimer -= dt;
        if (b.restTimer <= 0) { b.resting = false; b.vx = rand(30, 60) * (Math.random() < 0.5 ? 1 : -1); }
        return;
      }
      b.x += b.vx * dt;
      b.y += Math.sin(t * b.wingSpeed + b.wingPhase) * 1.2 * dt * 10;
      b.vy += Math.sin(t * 1.5 + b.bobPhase) * 0.5 * dt;
      b.vy *= 0.98;
      b.y += b.vy * dt;
      // wrap
      if (b.x < -60) b.x = W + 50;
      if (b.x > W + 60) b.x = -50;
      // occasional rest in afternoon
      if (birdTimeOfDay === 'day' && Math.random() < 0.001) {
        b.resting = true;
        b.restTimer = rand(2, 6);
      }
      // draw bird
      ctx.save();
      ctx.globalAlpha = 0.7;
      var wingY = Math.sin(t * b.wingSpeed + b.wingPhase) * 3;
      ctx.translate(b.x, b.y);
      ctx.fillStyle = '#3a3538';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.size, b.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // wings
      ctx.fillStyle = '#4a4548';
      ctx.beginPath();
      ctx.ellipse(-b.size * 0.6, -1 + wingY, b.size * 0.5, 3 + wingY * 0.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(b.size * 0.6, -1 - wingY, b.size * 0.5, 3 - wingY * 0.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawOwls(dt, t) {
    if (birdTimeOfDay !== 'night') return;

    OWLS.forEach(function (owl) {
      owl.blinkTimer -= dt;
      if (owl.blinkTimer <= 0 && !owl.isBlinking) {
        owl.isBlinking = true;
        owl.blinkDuration = rand(0.1, 0.25);
      }
      if (owl.isBlinking) {
        owl.blinkDuration -= dt;
        if (owl.blinkDuration <= 0) {
          owl.isBlinking = false;
          owl.blinkTimer = rand(3, 8);
        }
      }
      // head rotation
      owl.headAngle = lerp(owl.headAngle, owl.headTarget, dt * 0.5);
      if (Math.abs(owl.headAngle - owl.headTarget) < 0.01) {
        owl.headTarget = rand(-0.5, 0.5);
      }
      // occasional flight between trees
      if (!owl.flying && Math.random() < 0.002) {
        owl.flying = true;
        owl.flyTimer = 0;
        owl.flyTarget = { x: W * rand(0.2, 0.8), y: H * rand(0.1, 0.2) };
      }
      if (owl.flying) {
        owl.flyTimer += dt;
        var progress = clamp(owl.flyTimer / 3, 0, 1);
        owl.x = lerp(owl.perchX, owl.flyTarget.x, progress);
        owl.y = lerp(owl.perchY, owl.flyTarget.y, progress) - Math.sin(progress * Math.PI) * 30;
        if (progress >= 1) {
          owl.flying = false;
          owl.perchX = owl.flyTarget.x;
          owl.perchY = owl.flyTarget.y;
          owl.x = owl.perchX;
          owl.y = owl.perchY;
        }
      }
      // draw owl
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.translate(owl.x, owl.y);
      var s = owl.size;
      // body
      ctx.fillStyle = '#2a2528';
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      // head
      ctx.save();
      ctx.translate(0, -s * 0.6);
      ctx.rotate(owl.headAngle * 0.3);
      ctx.fillStyle = '#2a2528';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // ears (tufts)
      ctx.fillStyle = '#1a1518';
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.4);
      ctx.lineTo(-s * 0.15, -s * 0.8);
      ctx.lineTo(-s * 0.05, -s * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.4);
      ctx.lineTo(s * 0.15, -s * 0.8);
      ctx.lineTo(s * 0.05, -s * 0.4);
      ctx.closePath(); ctx.fill();
      // eyes
      if (owl.isBlinking) {
        ctx.strokeStyle = '#c8a040';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.1); ctx.lineTo(-s * 0.05, -s * 0.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.1); ctx.lineTo(s * 0.05, -s * 0.05); ctx.stroke();
      } else {
        ctx.fillStyle = '#c8a040';
        ctx.beginPath(); ctx.arc(-s * 0.15, -s * 0.08, s * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.15, -s * 0.08, s * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1015';
        ctx.beginPath(); ctx.arc(-s * 0.15, -s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.15, -s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // wings (when flying)
      if (owl.flying) {
        var wingFlap = Math.sin(t * 3 + owl.wingPhase) * 5;
        ctx.fillStyle = '#2a2528';
        ctx.beginPath();
        ctx.ellipse(-s * 0.7, -wingFlap, s * 0.6, 4 + wingFlap, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(s * 0.7, wingFlap, s * 0.6, 4 - wingFlap, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawNests(t) {
    NESTS.forEach(function (nest) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      // nest cup
      ctx.strokeStyle = '#4a3525';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nest.x - 10, nest.y);
      ctx.quadraticCurveTo(nest.x - 12, nest.y + 8, nest.x, nest.y + 10);
      ctx.quadraticCurveTo(nest.x + 12, nest.y + 8, nest.x + 10, nest.y);
      ctx.stroke();
      // eggs/birds in nest
      if (birdTimeOfDay === 'morning' || birdTimeOfDay === 'day') {
        for (var bi = 0; bi < Math.min(nest.birdsHere, 2); bi++) {
          ctx.fillStyle = '#5a4a3a';
          ctx.beginPath();
          ctx.arc(nest.x - 3 + bi * 6, nest.y + 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
  }

  /* ===================== GLOBAL LIVING EVENTS (Dragon / UFO) ===================== */
  var flyingDragon = null;
  var flyingUFO = null;

  function maybeSpawnDragon(t) {
    if (flyingDragon) return;
    // ~0.05% chance per frame (~every 33 min at 60fps)
    if (Math.random() > 0.0005) return;
    var fromLeft = Math.random() < 0.5;
    flyingDragon = {
      x: fromLeft ? -100 : W + 100,
      y: H * rand(0.08, 0.25),
      vx: (fromLeft ? 1 : -1) * rand(40, 70),
      t: 0,
      duration: rand(5, 9),
      wingPhase: 0,
      bodyWave: 0,
      opacity: 1
    };
  }

  function drawDragon(dt, t) {
    if (!flyingDragon) return;
    flyingDragon.t += dt;
    flyingDragon.x += flyingDragon.vx * dt;
    flyingDragon.y += Math.sin(flyingDragon.t * 0.8) * 8;
    flyingDragon.wingPhase += dt * 4;
    var progress = flyingDragon.t / flyingDragon.duration;
    if (progress > 1 || flyingDragon.x < -200 || flyingDragon.x > W + 200) {
      flyingDragon = null;
      return;
    }
    var fade = progress < 0.1 ? progress / 0.1 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = fade * 0.6;
    var dx = flyingDragon.x, dy = flyingDragon.y;
    // body (segmented curve)
    ctx.translate(dx, dy);
    var bodyLen = 80;
    ctx.strokeStyle = '#5a4040';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (var i = 0; i < 12; i++) {
      var px = i * bodyLen / 12 - bodyLen / 2;
      var py = Math.sin(i * 0.8 + flyingDragon.t * 1.2) * 6;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // wings
    ctx.fillStyle = 'rgba(80,50,50,0.4)';
    var wingUp = Math.sin(flyingDragon.wingPhase) * 15;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-30, -20 - wingUp);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-30, 20 + wingUp);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(30, -20 - wingUp);
    ctx.lineTo(20, 0);
    ctx.lineTo(30, 20 + wingUp);
    ctx.closePath(); ctx.fill();
    // head
    ctx.fillStyle = '#6a5050';
    ctx.beginPath();
    ctx.arc(bodyLen/2 - 5, -2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6644';
    ctx.beginPath(); ctx.arc(bodyLen/2 + 2, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function maybeSpawnUFO(t) {
    if (flyingUFO) return;
    // ~0.02% chance per frame (~every 80 min at 60fps)
    if (Math.random() > 0.0002) return;
    var fromLeft = Math.random() < 0.5;
    flyingUFO = {
      x: fromLeft ? -50 : W + 50,
      y: H * rand(0.1, 0.3),
      vx: (fromLeft ? 1 : -1) * rand(80, 150),
      t: 0,
      duration: rand(1.5, 3),
      glowPhase: 0
    };
  }

  function drawUFO(dt, t) {
    if (!flyingUFO) return;
    flyingUFO.t += dt;
    flyingUFO.x += flyingUFO.vx * dt;
    flyingUFO.y += Math.sin(flyingUFO.t * 2) * 5;
    var progress = flyingUFO.t / flyingUFO.duration;
    if (progress > 1 || flyingUFO.x < -80 || flyingUFO.x > W + 80) {
      flyingUFO = null;
      return;
    }
    var fade = progress < 0.15 ? progress / 0.15 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = fade * 0.5;
    var ux = flyingUFO.x, uy = flyingUFO.y;
    // glow
    var grd = ctx.createRadialGradient(ux, uy + 5, 0, ux, uy + 5, 30);
    grd.addColorStop(0, 'rgba(100,200,255,0.3)');
    grd.addColorStop(1, 'rgba(100,200,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(ux, uy + 5, 30, 0, Math.PI * 2); ctx.fill();
    // disc
    ctx.fillStyle = 'rgba(180,220,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(ux, uy, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // dome
    ctx.fillStyle = 'rgba(200,230,255,0.3)';
    ctx.beginPath();
    ctx.arc(ux, uy - 2, 6, Math.PI, 0);
    ctx.fill();
    // lights
    for (var li = 0; li < 3; li++) {
      ctx.fillStyle = pick(['rgba(100,255,200,0.5)', 'rgba(255,100,200,0.5)', 'rgba(200,255,100,0.5)']);
      ctx.beginPath();
      ctx.arc(ux - 8 + li * 8, uy + 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ===================== RARE SKY EVENTS ===================== */
  var RARE_EVENT_CHANCE = 0.035; // ~3.5% per sky change — deliberately rare, per the brief
  var RARE_EVENTS = ['meteorStorm', 'auroraSurge', 'comet', 'doubleRainbow', 'moonFlare', 'lanternFestival'];

  function maybeTriggerRareEvent(sky) {
    rareEvent = null;
    if (Math.random() > RARE_EVENT_CHANCE) return;
    var candidates = RARE_EVENTS.filter(function (type) {
      if ((type === 'moonFlare') && !moon) return false;
      if ((type === 'meteorStorm' || type === 'auroraSurge' || type === 'moonFlare') && !skyIsNight(sky)) return false;
      return true;
    });
    if (!candidates.length) return;
    rareEvent = { type: pick(candidates), t: 0, duration: rand(6, 11), burstDone: false };
  }

  function drawRareEvent(dt, t) {
    if (!rareEvent) return;
    rareEvent.t += dt;
    var progress = rareEvent.t / rareEvent.duration;
    if (progress >= 1) { rareEvent = null; return; }
    var fade = progress < 0.15 ? progress / 0.15 : (progress > 0.8 ? (1 - progress) / 0.2 : 1);

    ctx.save();
    ctx.globalAlpha = clamp(fade, 0, 1);
    switch (rareEvent.type) {
      case 'meteorStorm':
        if (!rareEvent.burstDone) {
          for (var i = 0; i < 3; i++) {
            shootingStars.push({
              x: rand(0.1, 0.9) * W, y: rand(0.02, 0.3) * H,
              vx: rand(400, 800), vy: rand(250, 500),
              life: 0, maxLife: rand(0.8, 1.3), brightness: 1, trail: [], caught: false
            });
          }
        }
        break;
      case 'auroraSurge':
        var grad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
        grad.addColorStop(0, 'rgba(80,255,180,' + (0.12 * fade) + ')');
        grad.addColorStop(0.5, 'rgba(90,140,255,' + (0.10 * fade) + ')');
        grad.addColorStop(1, 'rgba(90,140,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H * 0.6);
        break;
      case 'comet':
        var cx = lerp(-0.1, 1.1, progress) * W, cy = 0.2 * H;
        ctx.strokeStyle = 'rgba(255,240,220,' + (0.9 * fade) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 90, cy - 45); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#ffe680'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        break;
      case 'doubleRainbow':
        drawArc(0.55, 0.4 * fade);
        drawArc(0.62, 0.25 * fade);
        break;
      case 'moonFlare':
        if (moon && moon._hit) {
          var g2 = ctx.createRadialGradient(moon._hit.x, moon._hit.y, 0, moon._hit.x, moon._hit.y, moon.r * 6);
          g2.addColorStop(0, 'rgba(255,255,240,' + (0.5 * fade) + ')');
          g2.addColorStop(1, 'rgba(255,255,240,0)');
          ctx.fillStyle = g2;
          ctx.beginPath(); ctx.arc(moon._hit.x, moon._hit.y, moon.r * 6, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'lanternFestival':
        if (!rareEvent.burstDone) {
          for (var j = 0; j < 8; j++) {
            floaters.push({
              type: 'lantern', glyph: OBJECT_GLYPHS.lantern,
              x: rand(0, 1), y: 1.05, size: rand(16, 24),
              speed: rand(-0.002, 0.002), bobPhase: Math.random() * Math.PI * 2, opacity: rand(0.6, 0.9),
              rising: true
            });
          }
        }
        break;
    }
    rareEvent.burstDone = true;
    ctx.restore();
  }

  function drawArc(topFrac, alpha) {
    var cx = W / 2, cy = H * topFrac + H * 0.55, r = H * 0.55;
    var colors = ['#ff5b5b', '#ffb35c', '#ffe680', '#7ed17e', '#5c9dff', '#a06cff'];
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var i = 0; i < colors.length; i++) {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r - i * 6, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ===================== SKY JOURNEY JOURNAL ===================== */
  function loadJournal() {
    try { return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveJournal(j) {
    try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(j)); } catch (e) {}
  }
  function recordVisit(name) {
    var j = loadJournal();
    j[name] = (j[name] || 0) + 1;
    saveJournal(j);
    renderJournalPanel();
  }

  var journalPanel = null, journalToggle = null;
  function ensureJournalUI() {
    if (journalToggle) return;
    journalToggle = document.createElement('button');
    journalToggle.textContent = '\u2661 journal';
    journalToggle.style.cssText =
      'position:fixed;bottom:1.2rem;right:1.2rem;z-index:10001;background:rgba(255,220,160,.08);' +
      'border:1px solid rgba(255,210,150,.15);color:#6b5f52;padding:.4rem .9rem;border-radius:6px;' +
      'cursor:pointer;font-family:Georgia,serif;font-size:.8rem;transition:all .25s;';
    journalToggle.addEventListener('mouseenter', function () { this.style.color = '#ffe680'; this.style.borderColor = '#ffe680'; });
    journalToggle.addEventListener('mouseleave', function () { this.style.color = '#6b5f52'; this.style.borderColor = 'rgba(255,210,150,.15)'; });
    journalToggle.addEventListener('click', function () {
      journalPanel.style.display = journalPanel.style.display === 'none' ? 'block' : 'none';
    });
    document.body.appendChild(journalToggle);

    journalPanel = document.createElement('div');
    journalPanel.style.cssText =
      'position:fixed;bottom:3.4rem;right:1.2rem;z-index:10001;max-width:min(90vw,280px);max-height:50vh;' +
      'overflow:auto;background:rgba(24,18,20,.92);border:1px solid rgba(255,210,150,.2);border-radius:10px;' +
      'padding:.8rem 1rem;font-family:Georgia,serif;font-size:.82rem;color:#c7b8a1;display:none;';
    document.body.appendChild(journalPanel);
  }
  function renderJournalPanel() {
    ensureJournalUI();
    var j = loadJournal();
    var names = Object.keys(j);
    if (!names.length) { journalPanel.innerHTML = '<em>No skies visited yet.</em>'; return; }
    journalPanel.innerHTML = '<div style="color:#ffe680;font-family:Fraunces,Georgia,serif;margin-bottom:.5rem;">Sky Journey</div>' +
      names.sort().map(function (n) {
        return '<div style="padding:.15rem 0;">' + n + ' <span style="opacity:.6;">\u2713 &times;' + j[n] + '</span></div>';
      }).join('');
  }

  /* ===================== HIDDEN EASTER EGGS ===================== */
  function loadEggs() { try { return JSON.parse(localStorage.getItem(EGGS_KEY)) || {}; } catch (e) { return {}; } }
  function saveEggs(e) { try { localStorage.setItem(EGGS_KEY, JSON.stringify(e)); } catch (e) {} }
  function bumpEgg(key) {
    var e = loadEggs();
    e[key] = (e[key] || 0) + 1;
    saveEggs(e);
    return e[key];
  }
  function unlockEgg(message) {
    showFloatingMessage(W / 2, H * 0.4, message);
  }

  function onMoonClicked() {
    var count = bumpEgg('moonClicks');
    if (count === 10) unlockEgg('Ten moon-taps in. It\u2019s still watching over you.');
  }
  function onStarClicked(x, y) {
    var count = bumpEgg('starClicks');
    if (count === 100) unlockEgg('A hundred stars, one wish repeated a hundred times.');
    try {
      document.dispatchEvent(new CustomEvent('starClicked', { detail: { x: x, y: y, count: count } }));
    } catch (e) {}
  }

  /* ===================== AMBIENT AUDIO (procedural, no external files) ===================== */
  // Generates all ambience sounds at runtime using the Web Audio API.
  // No audio files needed — wind, rain, ocean, etc. are synthesized.
  var ambienceCtx = null;
  function getAC() {
    if (!ambienceCtx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (C) ambienceCtx = new C();
    }
    return ambienceCtx;
  }

  function makeNoiseBuffer(ctx, dur) {
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Each gen returns {start(gain), stop()} — stop is optional
  var AMBIENCE_GENS = {
    wind: function (ctx) {
      var buf = makeNoiseBuffer(ctx, 3);
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.5;
      src.connect(lp);
      return { node: lp, start: function (g) { lp.connect(g); src.start(); }, stop: function () { try { src.stop(); } catch (e) {} } };
    },
    rain: function (ctx) {
      var buf = makeNoiseBuffer(ctx, 3);
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 3500; bp.Q.value = 0.4;
      src.connect(bp);
      return { node: bp, start: function (g) { bp.connect(g); src.start(); }, stop: function () { try { src.stop(); } catch (e) {} } };
    },
    ocean: function (ctx) {
      var buf = makeNoiseBuffer(ctx, 5);
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.7;
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06;
      var lfoG = ctx.createGain();
      lfoG.gain.value = 300;
      lfo.connect(lfoG); lfoG.connect(bp.frequency);
      src.connect(bp);
      lfo.start();
      return { node: bp, start: function (g) { bp.connect(g); src.start(); }, stop: function () { try { src.stop(); lfo.stop(); } catch (e) {} } };
    },
    forest: function (ctx) {
      var buf = makeNoiseBuffer(ctx, 3);
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1200; lp.Q.value = 0.4;
      src.connect(lp);
      return { node: lp, start: function (g) { lp.connect(g); src.start(); }, stop: function () { try { src.stop(); } catch (e) {} } };
    },
    nightInsects: function (ctx) {
      var mix = ctx.createGain();
      mix.gain.value = 0.3;
      var oscs = [];
      for (var i = 0; i < 4; i++) {
        var o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = 3000 + i * 700 + Math.random() * 400;
        var a = ctx.createGain(); a.gain.value = 0;
        var l = ctx.createOscillator(); l.frequency.value = 3 + Math.random() * 4;
        var lg = ctx.createGain(); lg.gain.value = 0.15;
        l.connect(lg); lg.connect(a.gain);
        o.connect(a); a.connect(mix);
        o.start(); l.start();
        oscs.push(o, l);
      }
      return { node: mix, start: function (g) { mix.connect(g); }, stop: function () { oscs.forEach(function (o) { try { o.stop(); } catch (e) {} }); } };
    },
    thunder: function (ctx) {
      var buf = makeNoiseBuffer(ctx, 3);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] *= Math.exp(-i / (ctx.sampleRate * 0.6));
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 100;
      src.connect(lp);
      return { node: lp, start: function (g) { lp.connect(g); src.start(); }, stop: function () { try { src.stop(); } catch (e) {} } };
    },
    templeBells: function (ctx) {
      var mix = ctx.createGain();
      mix.gain.value = 0.35;
      var now = ctx.currentTime;
      var oscs = [];
      [220, 330, 440].forEach(function (freq, i) {
        var o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = freq;
        var a = ctx.createGain();
        a.gain.setValueAtTime(0, now + i * 0.6);
        a.gain.linearRampToValueAtTime(0.15, now + i * 0.6 + 0.04);
        a.gain.exponentialRampToValueAtTime(0.001, now + i * 0.6 + 2.5);
        o.connect(a); a.connect(mix);
        o.start(now + i * 0.6); o.stop(now + i * 0.6 + 3);
        oscs.push(o);
      });
      return { node: mix, start: function (g) { mix.connect(g); }, stop: function () { oscs.forEach(function (o) { try { o.stop(); } catch (e) {} }); } };
    },
    fireCrackling: function (ctx) {
      var mix = ctx.createGain();
      mix.gain.value = 0.4;
      var interval = setInterval(function () {
        var buf = makeNoiseBuffer(ctx, 0.08);
        var d = buf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] *= Math.exp(-i / (ctx.sampleRate * 0.012));
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 2000;
        src.connect(hp); hp.connect(mix);
        src.start();
      }, 250);
      return { node: mix, start: function (g) { mix.connect(g); }, stop: function () { clearInterval(interval); } };
    }
  };

  var ambienceState = { current: null, gain: null, gen: null, volume: 0.35 };

  function ambienceKeyForSky(sky) {
    var meta = getMeta(sky);
    if (meta && meta.ambience) return meta.ambience;
    var n = sky.name.toLowerCase();
    if (/thunder/.test(n)) return 'thunder';
    if (/rain|shower/.test(n)) return 'rain';
    if (/ocean|sea|coast|wave/.test(n)) return 'ocean';
    if (/forest|jungle|canopy/.test(n)) return 'forest';
    if (/night|star|galaxy|cosmic|nebula|void/.test(n)) return 'nightInsects';
    if (/fire|ember|lantern|candle/.test(n)) return 'fireCrackling';
    if (/temple|heaven|angel|celestial/.test(n)) return 'templeBells';
    if (/cloud|fog|mist|wind|breeze/.test(n)) return 'wind';
    return null;
  }

  function setAmbienceForSky(sky) {
    var key = ambienceKeyForSky(sky);
    if (key === ambienceState.current) return;
    var ctx = getAC();
    if (!ctx) return;
    // fade out + cleanup previous
    if (ambienceState.gain) {
      var oldGain = ambienceState.gain;
      fadeGain(ambienceState.gain, 0, 1200, function () {
        try { oldGain.disconnect(); } catch (e) {}
        if (ambienceState.gen) ambienceState.gen.stop();
      });
    }
    ambienceState.current = key;
    ambienceState.gain = null;
    ambienceState.gen = null;
    if (!key || !AMBIENCE_GENS[key]) return;
    var gen = AMBIENCE_GENS[key](ctx);
    var g = ctx.createGain();
    g.gain.value = 0;
    gen.start(g);
    ambienceState.gain = g;
    ambienceState.gen = gen;
    fadeGain(g, ambienceState.volume, 1500);
  }
  function fadeGain(gain, target, ms, done) {
    var start = gain.gain.value, t0 = performance.now();
    function step(now) {
      var p = clamp((now - t0) / ms, 0, 1);
      gain.gain.value = lerp(start, target, p);
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  /* ===================== PARAGRAPH-REACTIVE HOOK ===================== */
  // This file can't discover your paragraph markup — call this from
  // your own scroll / IntersectionObserver logic in 100-organs.html /
  // fantasies.html, e.g.:
  //   SkyLiving.setMood('romantic')   // more fireflies
  //   SkyLiving.setMood('happy')      // more stars
  //   SkyLiving.setMood('emotional')  // gentle mist
  //   SkyLiving.setMood('hopeful')    // warm light pulse
  //   SkyLiving.setMood('ending')     // floating lanterns
  //   SkyLiving.setMood(null)         // clear back to baseline
  var currentMood = null;
  var moodFogBoost = 0, moodWarmBoost = 0;
  function setMood(mood) {
    currentMood = mood;
    if (mood === 'romantic') spawnMoodFloaters('firefly', 6);
    if (mood === 'happy') stars.forEach(function (s) { s._moodBoost = true; });
    if (mood === 'ending') spawnMoodFloaters('lantern', 5);
  }
  function spawnMoodFloaters(type, count) {
    for (var i = 0; i < count; i++) {
      floaters.push({
        type: type, glyph: OBJECT_GLYPHS[type] || '\u2726',
        x: rand(0, 1), y: rand(0.3, 0.9), size: rand(10, 18),
        speed: rand(-0.003, 0.003), bobPhase: Math.random() * Math.PI * 2, opacity: rand(0.5, 0.8)
      });
    }
    if (floaters.length > 40) floaters.splice(0, floaters.length - 40); // cap
  }
  function drawMoodOverlay(dt, t) {
    if (currentMood === 'emotional') {
      moodFogBoost = lerp(moodFogBoost, 0.05, dt * 0.5);
    } else {
      moodFogBoost = lerp(moodFogBoost, 0, dt * 0.5);
    }
    if (currentMood === 'hopeful') {
      moodWarmBoost = lerp(moodWarmBoost, 0.06, dt * 0.5);
    } else {
      moodWarmBoost = lerp(moodWarmBoost, 0, dt * 0.5);
    }
    if (moodFogBoost > 0.002) {
      ctx.save();
      ctx.globalAlpha = moodFogBoost;
      ctx.fillStyle = '#cfd6e0';
      ctx.fillRect(0, H * 0.5, W, H * 0.5);
      ctx.restore();
    }
    if (moodWarmBoost > 0.002) {
      ctx.save();
      ctx.globalAlpha = moodWarmBoost;
      var g = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, H * 0.6);
      g.addColorStop(0, 'rgba(255,210,140,1)');
      g.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /* ===================== POINTER INTERACTION ===================== */
  // No pointer-events on the canvas — we hit-test manually so the page
  // underneath keeps scrolling and existing buttons/links keep working.
  function withinCircle(px, py, hit) { return hit && Math.hypot(px - hit.x, py - hit.y) <= hit.r; }
  function withinBox(px, py, hit) { return hit && px >= hit.x1 && px <= hit.x2 && py >= hit.y1 && py <= hit.y2; }

  function onDocMove(e) {
    var px = e.clientX, py = e.clientY;
    var any = false;
    stars.forEach(function (s) {
      s._hover = withinCircle(px, py, s._hit);
      if (s._hover) any = true;
    });
    document.body.style.cursor = any ? 'pointer' : '';
  }

  function onDocClick(e) {
    var px = e.clientX, py = e.clientY;

    if (moon && withinCircle(px, py, moon._hit)) { onMoonClicked(); return; }

    for (var i = 0; i < shootingStars.length; i++) {
      if (withinCircle(px, py, shootingStars[i]._hit)) { catchShootingStar(shootingStars[i]); return; }
    }

    for (var j = 0; j < stars.length; j++) {
      if (withinCircle(px, py, stars[j]._hit)) {
        stars[j].clickPulse = 1;
        onStarClicked(px, py);
        return;
      }
    }

    if (constellation && !constellation.revealed && withinBox(px, py, constellation._hit)) {
      constellation.revealed = true;
      showFloatingMessage(px, py, constellation.message);
      return;
    }
  }

  document.addEventListener('mousemove', throttle(onDocMove, 60));
  document.addEventListener('click', onDocClick);

  function throttle(fn, ms) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last > ms) { last = now; fn.apply(null, arguments); }
    };
  }

  /* ===================== MAIN LOOP ===================== */
  var running = false, lastT = 0;
  /* ===================== SUPERNOVA PARTICLES ===================== */
  function drawSupernovas(dt) {
    for (var i = supernovas.length - 1; i >= 0; i--) {
      var sn = supernovas[i];
      sn.t += dt;
      if (sn.t > sn.duration) { supernovas.splice(i, 1); continue; }
      var fade = 1 - sn.t / sn.duration;
      ctx.save();
      for (var j = 0; j < sn.particles.length; j++) {
        var p = sn.particles[j];
        var dx = Math.cos(p.angle) * p.speed * sn.t;
        var dy = Math.sin(p.angle) * p.speed * sn.t;
        var alpha = fade * p.life;
        if (alpha > 0) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ffe680';
          ctx.shadowColor = '#ffcc44';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(sn.x + dx, sn.y + dy, p.r * fade, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    var t = now / 1000;

    if (!currentSky) {
      var Ld = window.SkyLiving && window.SkyLiving.Landscape;
      if (Ld && landscapeVisible) Ld.draw(t);
      if (!reducedMotion) requestAnimationFrame(frame); else running = false;
      return;
    }
    ctx.clearRect(0, 0, W, H);

    if (!reducedMotion) {
      updateEvolution(dt);
      maybeSpawnShootingStar(dt, t);
      maybeSpawnDragon(t);
      maybeSpawnUFO(t);
    }

    drawMoon(dt, t);
    drawStars(dt, t);
    drawSupernovas(dt);
    drawShootingStars(dt);
    if (constellation) drawConstellation(t);
    if (landscapeVisible && window.SkyLiving && window.SkyLiving.Landscape) window.SkyLiving.Landscape.draw(t);
    drawNests(t);
    drawBirds(dt, t);
    drawOwls(dt, t);
    drawFloaters(dt, t);
    drawEvolutionFog();
    drawMoodOverlay(dt, t);
    drawRareEvent(dt, t);
    drawDragon(dt, t);
    drawUFO(dt, t);

    if (!reducedMotion) requestAnimationFrame(frame);
    else running = false; // one static frame under reduced-motion, matches skies.js's own behavior
  }

  function start() {
    ensureCanvas();
    if (running) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (currentSky) start();
  });

  function pickCategory(sky) {
    if (!sky) return null;
    var meta = getMeta(sky);
    var cat = meta ? meta.category : '';
    var n = sky.name.toLowerCase();
    if (cat === 'fantasy') return 'fantasy';
    if (cat === 'night' || cat === 'cosmic') return 'night';
    if (cat === 'day') return /sunset|dusk|twilight|golden/.test(n) ? 'sunset' : 'day';
    if (cat === 'seasonal') {
      if (/cherry|sakura|spring/.test(n)) return 'spring';
      if (/autumn|fall|leaves/.test(n)) return 'autumn';
      if (/snow|winter/.test(n)) return 'snow';
      return 'spring';
    }
    if (cat === 'weather') {
      if (/rain|storm|thunder/.test(n)) return 'rain';
      if (/snow|blizzard/.test(n)) return 'snow';
      if (/fog|mist/.test(n)) return 'fog';
      return 'day';
    }
    return 'day';
  }

  var _labelRetries = 0;
  function updateConstellationLabel() {
    var name = constellation ? constellation.displayName : '';
    var label = document.getElementById('constellationNameLabel');
    if (!label) {
      var container = document.getElementById('skyBtnContainer');
      if (!container) { if (_labelRetries++ < 20) setTimeout(updateConstellationLabel, 500); return; }
      label = document.createElement('div');
      label.id = 'constellationNameLabel';
      label.style.cssText = 'font-size:10px;color:rgba(255,230,180,0.5);font-family:Fraunces,Georgia,serif;margin-top:6px;font-style:italic;cursor:pointer;';
      label.title = 'Open constellation journal';
      label.addEventListener('click', openConstellationJournal);
      container.parentNode.insertBefore(label, container.nextSibling);
    }
    label.textContent = name ? '\uD83C\uDF0C ' + name : '';
  }

  var RARITY_COLORS = { common:'#a0a080', uncommon:'#80a060', rare:'#6080c0', 'very-rare':'#c060a0', legendary:'#d4a020', mythic:'#ffe680' };

  function refreshJournal() {
    var overlay = document.getElementById('skyConstJournal');
    if (!overlay) return;
    var panel = overlay.querySelector('div');
    if (!panel) return;
    var col = loadConstCol();
    var allKeys = Object.keys(CONSTELLATION_DISPLAY_NAMES);
    var seen = 0;
    allKeys.forEach(function(k){ if (col[k]) seen++; });
    var html = '<div style="font-size:18px;font-weight:bold;color:#ffe680;margin-bottom:6px;">\uD83C\uDF0C Sky Constellations</div>'+
      '<div style="font-size:11px;color:#a09080;margin-bottom:12px;">Seen '+seen+' / '+allKeys.length+'</div>';
    if (constellation) {
      var r = constellation.rarity || 'common';
      html += '<div style="background:rgba(255,230,100,0.06);border:1px solid rgba(255,230,100,0.15);border-radius:8px;padding:8px 12px;margin-bottom:12px;text-align:center;">'+
        '<div style="font-size:13px;font-weight:bold;">\u2728 '+constellation.displayName+'</div>'+
        '<div style="font-size:10px;color:'+(RARITY_COLORS[r]||'#a0a080')+';text-transform:uppercase;">'+r+'</div>'+
        '<div style="font-size:9px;color:#a09080;margin-top:2px;">'+constellation.message+'</div></div>';
    }
    allKeys.sort();
    allKeys.forEach(function(k){
      var found = !!col[k];
      var dn = CONSTELLATION_DISPLAY_NAMES[k];
      var r = CONSTELLATION_RARITY[k] || 'common';
      html += '<div style="display:flex;align-items:center;padding:4px 6px;margin-bottom:1px;border-radius:4px;'+(found?'':'opacity:0.25')+'">'+
        '<span style="margin-right:6px;font-size:10px;">'+(found?'\u2B50':'\u2726')+'</span>'+
        '<div style="flex:1;font-size:11px;'+(found?'':'color:#504030')+'">'+(found?dn:'???')+'</div>'+
        '<span style="font-size:8px;color:'+(RARITY_COLORS[r]||'#a0a080')+';">'+(found?r:'')+'</span></div>';
    });
    html += '<div style="text-align:center;margin-top:10px;"><button onclick="document.getElementById(\'skyConstJournal\').remove()" style="background:rgba(255,230,100,0.15);border:1px solid rgba(255,230,100,0.3);color:#ffe680;padding:5px 16px;border-radius:20px;cursor:pointer;font-size:11px;">Close</button></div>';
    panel.innerHTML = html;
  }

  function openConstellationJournal() {
    var existing = document.getElementById('skyConstJournal');
    if (existing) { existing.remove(); return; }
    var col = loadConstCol();
    var overlay = document.createElement('div');
    overlay.id = 'skyConstJournal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:rgba(10,8,6,0.85);backdrop-filter:blur(10px);display:flex;justify-content:center;align-items:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(20,16,12,0.95);border:1px solid rgba(255,230,100,0.2);border-radius:16px;padding:20px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;position:relative;color:#ffebd2;';
    var allKeys = Object.keys(CONSTELLATION_DISPLAY_NAMES);
    var seen = 0;
    allKeys.forEach(function(k){ if (col[k]) seen++; });
    var html = '<div style="font-size:18px;font-weight:bold;color:#ffe680;margin-bottom:6px;">\uD83C\uDF0C Sky Constellations</div>'+
      '<div style="font-size:11px;color:#a09080;margin-bottom:12px;">Seen '+seen+' / '+allKeys.length+'</div>';
    if (constellation) {
      var r = constellation.rarity || 'common';
      html += '<div style="background:rgba(255,230,100,0.06);border:1px solid rgba(255,230,100,0.15);border-radius:8px;padding:8px 12px;margin-bottom:12px;text-align:center;">'+
        '<div style="font-size:13px;font-weight:bold;">\u2728 '+constellation.displayName+'</div>'+
        '<div style="font-size:10px;color:'+(RARITY_COLORS[r]||'#a0a080')+';text-transform:uppercase;">'+r+'</div>'+
        '<div style="font-size:9px;color:#a09080;margin-top:2px;">'+constellation.message+'</div></div>';
    }
    allKeys.sort();
    allKeys.forEach(function(k){
      var found = !!col[k];
      var dn = CONSTELLATION_DISPLAY_NAMES[k];
      var r = CONSTELLATION_RARITY[k] || 'common';
      html += '<div style="display:flex;align-items:center;padding:4px 6px;margin-bottom:1px;border-radius:4px;'+(found?'':'opacity:0.25')+'">'+
        '<span style="margin-right:6px;font-size:10px;">'+(found?'\u2B50':'\u2726')+'</span>'+
        '<div style="flex:1;font-size:11px;'+(found?'':'color:#504030')+'">'+(found?dn:'???')+'</div>'+
        '<span style="font-size:8px;color:'+(RARITY_COLORS[r]||'#a0a080')+';">'+(found?r:'')+'</span></div>';
    });
    html += '<div style="text-align:center;margin-top:10px;"><button onclick="document.getElementById(\'skyConstJournal\').remove()" style="background:rgba(255,230,100,0.15);border:1px solid rgba(255,230,100,0.3);color:#ffe680;padding:5px 16px;border-radius:20px;cursor:pointer;font-size:11px;">Close</button></div>';
    panel.innerHTML = html;
    overlay.appendChild(panel);
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
    overlay.addEventListener('click', function(){ overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* ===================== SKY CHANGE HOOK ===================== */
  function onSkyChanged(index) {
    var sky = window.Skies.SKIES[index];
    if (!sky) return;
    currentSky = sky;
    currentIndex = index;

    ensureCanvas();
    moon = pickMoonPhase(sky);
    buildStars(sky);
    constellation = generateConstellation(sky);
    updateConstellationLabel();
    refreshJournal();
    spawnFloaters(sky);
    shootingStars = [];
    evolution = { age: 0, fogAlpha: 0, extraStars: 0 };
    lastShootingStarSpawn = 0;

    landscapeType = null;
    var L = window.SkyLiving && window.SkyLiving.Landscape;
    if (L) {
      landscapeType = L.pick(sky);
      L.build(landscapeType);
    } else {
      landscapeType = sky ? pickCategory(sky) : null;
    }
    updateBirdTime(sky);
    buildNests(sky);
    initBirds();
    recordVisit(sky.name);
    maybeTriggerRareEvent(sky);
    setAmbienceForSky(sky);

    if (reducedMotion) { running = true; lastT = performance.now(); frame(lastT); running = false; }
    else start();
  }

  // Wrap the public API instead of touching skies.js's private internals.
  var originalApply = window.Skies.apply;
  window.Skies.apply = function (index) {
    originalApply.call(window.Skies, index);
    onSkyChanged(index);
  };

  // ponytail: randomSky() closes over local applySky, bypassing the wrapper.
  // Wrapping Skies.random forces it through the hooked apply.
  if (typeof window.Skies.random === 'function') {
    window.Skies.random = function () {
      var idx = Math.floor(Math.random() * window.Skies.SKIES.length);
      window.Skies.apply(idx);
    };
  }

  /* ===================== PUBLIC API ===================== */
  window.SkyLiving = {
    setMood: setMood,
    getJournal: loadJournal,
    getCurrentConstellation: function () { return constellation ? { name: constellation.displayName, message: constellation.message, rarity: constellation.rarity } : null; },
    openConstellationJournal: openConstellationJournal,
    CONSTELLATION_SHAPES: CONSTELLATION_SHAPES,
    AMBIENCE_SOURCES: (function () { var o = {}; for (var k in AMBIENCE_GENS) o[k] = '(procedural)'; return o; })(),
    EMOTION_ENGINE: EMOTION_ENGINE,
    getMeta: getMeta,
    setLandscapeVisible: setLandscapeVisible,
    setAmbienceVolume: function (v) {
      ambienceState.volume = clamp(v, 0, 1);
      if (ambienceState.gain) ambienceState.gain.gain.value = ambienceState.volume;
    },
    // Internal helpers for landscape.js
    _ctx: ctx,
    _W: function () { return W; },
    _H: function () { return H; },
    _rand: rand,
    _pick: pick,
    _getMeta: getMeta,
    get _currentSky() { return currentSky; },
    get _landscapeType() { return landscapeType; }
  };

  /* ===================== INIT ===================== */
  var isObsPage = window.location.pathname.indexOf('sky-observatory') !== -1;
  if (isObsPage) {
    var savedIndex = window.Skies.getCurrent ? window.Skies.getCurrent() : -1;
    if (savedIndex >= 0 && window.Skies.SKIES[savedIndex]) {
      onSkyChanged(savedIndex);
    } else if (landscapeVisible) {
      ensureCanvas();
    }
  }
})();
