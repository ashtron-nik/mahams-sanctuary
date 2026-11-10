/* ===================================================================
   SKY ENGINE â€” atmospheric rendering system
   small set of reusable, config-driven rendering engines running on
   two crossfading <canvas> layers under a single shared rAF loop.

   Engines:
     NoiseGen        deterministic 2D value noise (wind, aurora waves, cloud breathing)
     WindField        slowly drifting wind vector, shared by particle systems
     ParticleSystem   generic pooled particle system (rain/snow/stars/meteor/petal/
                       leaf/firefly/bubble/ember/butterfly/planet/dust)
     CloudLayer       offscreen-rendered soft cloud/fog/haze puffs, periodically
                       re-rendered ("evolve") and cheaply translated for drift
     Aurora           noise-driven flowing ribbons, additive blend
     Light            sun / moon / eclipse glow with optional god-rays
     WaveField        aurora-style ribbon renderer reused horizontally for ocean shimmer
     SkyInstance      wires a sky config to the engines above, owns update()/draw()
     OverlayManager    owns the two canvases, crossfades between SkyInstances, disposes
                       the outgoing one after the fade so nothing keeps animating
     AnimationManager single rAF loop, delta-time based, pauses when tab hidden,
                       falls back to one static frame under prefers-reduced-motion

   Public surface kept IDENTICAL to the previous version:
     window.Skies = { SKIES, apply, random, getCurrent, createButton }
   =================================================================== */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('skies')) return;

  var SKY_KEY = 'ash-jukebox-sky';
  var msgEl = null;
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function randRange(a, b) { return a + Math.random() * (b - a); }

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* ================= NOISE ================= */
  var NoiseGen = (function () {
    var perm = new Uint8Array(512);
    (function seed() {
      var p = new Uint8Array(256);
      var i;
      for (i = 0; i < 256; i++) p[i] = i;
      for (i = 255; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = p[i]; p[i] = p[j]; p[j] = t;
      }
      for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    })();
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function grad(hash, x, y) {
      var h = hash & 7, u = h < 4 ? x : y, v = h < 4 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
    }
    return {
      noise2: function (x, y) {
        var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        var u = fade(x), v = fade(y);
        var aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
        var ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
        var x1 = lerp(grad(aa, x, y), grad(ba, x - 1, y), u);
        var x2 = lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u);
        return (lerp(x1, x2, v) + 1) / 2;
      }
    };
  })();

  /* ================= WIND ================= */
  var WindField = {
    angle: 100, strength: 0.4, t: Math.random() * 100,
    update: function (dt) {
      this.t += dt * 0.00006;
      this.angle = 90 + (NoiseGen.noise2(this.t, 0) - 0.5) * 50;
      this.strength = 0.2 + NoiseGen.noise2(this.t + 40, 0) * 0.6;
    }
  };

  /* ================= PARTICLE SYSTEM (pooled) ================= */
  function ParticleSystem(type, count, opts) {
    this.type = type;
    this.count = count;
    this.opts = opts || {};
    this.particles = new Array(count);
    for (var i = 0; i < count; i++) this.particles[i] = this.spawn(null, true);
  }
  ParticleSystem.prototype.spawn = function (p, initial) {
    var o = this.opts;
    p = p || {};
    switch (this.type) {
      case 'rain':
        p.x = Math.random() * 100; p.y = initial ? Math.random() * 100 : -5;
        p.len = randRange(o.minLen || 10, o.maxLen || 26);
        p.speed = randRange(o.minSpeed || 45, o.maxSpeed || 75);
        p.alpha = randRange(0.2, 0.5); break;
      case 'snow':
        p.x = Math.random() * 100; p.y = initial ? Math.random() * 100 : -5;
        p.r = randRange(o.minR || 1.5, o.maxR || 4);
        p.speed = randRange(o.minSpeed || 4, o.maxSpeed || 10);
        p.sway = Math.random() * 6.28; p.swaySpeed = randRange(0.4, 1.2);
        p.alpha = randRange(0.5, 1); break;
      case 'stars':
        p.x = Math.random() * 100; p.y = Math.random() * (o.maxY || 90);
        p.r = randRange(o.minR || 0.5, o.maxR || 2);
        p.phase = Math.random() * 6.28; p.speed = randRange(0.15, 0.4);
        p.drift = randRange(-0.15, 0.15); break;
      case 'meteor':
        p.active = false; p.timer = randRange(0.5, o.interval || 3); break;
      case 'petal': case 'leaf': case 'feather':
        p.x = Math.random() * 100; p.y = initial ? Math.random() * 100 : -8;
        p.size = randRange(o.minSize || 6, o.maxSize || 14);
        p.rot = Math.random() * 360; p.rotSpeed = randRange(-40, 40);
        p.speed = randRange(o.minSpeed || 3, o.maxSpeed || 7);
        p.swayPhase = Math.random() * 6.28;
        p.color = o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : '#ffffff';
        p.alpha = randRange(0.6, 1); break;
      case 'firefly': case 'butterfly':
        p.x = Math.random() * 100; p.y = randRange(o.minY || 25, o.maxY || 90);
        p.baseX = p.x; p.baseY = p.y;
        p.phase = Math.random() * 6.28; p.speed = randRange(0.2, 0.5);
        p.size = randRange(o.minSize || 2, o.maxSize || 4);
        p.color = o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : '#d8ff8c';
        p.glowPhase = Math.random() * 6.28; break;
      case 'bubble': case 'ember':
        p.x = Math.random() * 100; p.y = initial ? Math.random() * 100 : 105;
        p.r = randRange(o.minR || 6, o.maxR || 18);
        p.speed = randRange(o.minSpeed || 3, o.maxSpeed || 8);
        p.swayPhase = Math.random() * 6.28;
        p.alpha = randRange(0.4, 0.9); break;
      case 'planet':
        p.x = randRange(10, 90); p.y = randRange(10, 80);
        p.r = randRange(o.minR || 12, o.maxR || 30);
        p.color = o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : '#a7d8ff';
        p.speed = randRange(0.4, 0.9); break;
      case 'dust':
        p.x = Math.random() * 100; p.y = Math.random() * 100;
        p.r = randRange(0.5, 1.6); p.phase = Math.random() * 6.28;
        p.speed = randRange(0.1, 0.3); break;
    }
    return p;
  };
  ParticleSystem.prototype.update = function (dt, wind, t) {
    var o = this.opts, ps = this.particles, windX = Math.cos(wind.angle * Math.PI / 180) * wind.strength;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      switch (this.type) {
        case 'rain':
          p.y += p.speed * dt; p.x += windX * dt * 6;
          if (p.y > 105) this.spawn(p, false);
          break;
        case 'snow':
          p.sway += p.swaySpeed * dt;
          p.y += p.speed * dt; p.x += (Math.sin(p.sway) * 0.4 + windX * 0.6) * dt * 4;
          if (p.y > 105) this.spawn(p, false);
          break;
        case 'stars':
          p.phase += dt * p.speed; p.x += p.drift * dt;
          if (p.x > 102) p.x = -2; if (p.x < -2) p.x = 102;
          break;
        case 'meteor':
          if (!p.active) {
            p.timer -= dt;
            if (p.timer <= 0) {
              p.active = true; p.x = randRange(45, 95); p.y = randRange(0, 22);
              p.vx = -randRange(18, 26); p.vy = randRange(12, 18); p.life = 0; p.maxLife = randRange(0.6, 1);
            }
          } else {
            p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.life > p.maxLife) { p.active = false; p.timer = randRange(1.5, o.interval || 4); }
          }
          break;
        case 'petal': case 'leaf': case 'feather':
          p.swayPhase += dt * 0.8; p.rot += p.rotSpeed * dt;
          p.y += p.speed * dt; p.x += (Math.sin(p.swayPhase) * 1.4 + windX * 0.8) * dt * 4;
          if (p.y > 108) this.spawn(p, false);
          break;
        case 'firefly': case 'butterfly':
          p.phase += dt * p.speed; p.glowPhase += dt * 1.6;
          p.x = p.baseX + Math.sin(p.phase) * 6 + Math.sin(p.phase * 0.4) * 3;
          p.y = p.baseY + Math.cos(p.phase * 0.8) * 5;
          break;
        case 'bubble': case 'ember':
          p.swayPhase += dt; p.y -= p.speed * dt; p.x += Math.sin(p.swayPhase) * 0.4 * dt * 4;
          if (p.y < -8) this.spawn(p, false);
          break;
        case 'planet':
          p.x += p.speed * dt * 0.3; if (p.x > 105) p.x = -10;
          break;
        case 'dust':
          p.phase += dt * p.speed;
          break;
      }
    }
  };
  ParticleSystem.prototype.draw = function (ctx, w, h) {
    var o = this.opts, ps = this.particles;
    ctx.save();
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      switch (this.type) {
        case 'rain':
          ctx.strokeStyle = 'rgba(200,215,235,' + p.alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x / 100 * w, p.y / 100 * h);
          ctx.lineTo(p.x / 100 * w - 3, p.y / 100 * h + p.len);
          ctx.stroke();
          break;
        case 'snow':
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(p.x / 100 * w, p.y / 100 * h, p.r, 0, 6.28); ctx.fill();
          break;
        case 'stars': {
          var tw = 0.25 + Math.abs(Math.sin(p.phase)) * 0.75;
          ctx.globalAlpha = tw;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff'; ctx.shadowBlur = p.r * 3;
          ctx.beginPath(); ctx.arc(p.x / 100 * w, p.y / 100 * h, p.r, 0, 6.28); ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }
        case 'meteor':
          if (p.active) {
            var x = p.x / 100 * w, y = p.y / 100 * h;
            var fade = 1 - p.life / p.maxLife;
            var grad = ctx.createLinearGradient(x, y, x - p.vx * 3, y - p.vy * 3);
            grad.addColorStop(0, 'rgba(255,255,255,' + fade + ')');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = grad; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 3, y - p.vy * 3); ctx.stroke();
          }
          break;
        case 'petal': case 'leaf': case 'feather':
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x / 100 * w, p.y / 100 * h);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size / 2, p.size / 3, 0, 0, 6.28);
          ctx.fill();
          ctx.restore();
          break;
        case 'firefly':
          var g = 0.3 + Math.abs(Math.sin(p.glowPhase)) * 0.7;
          ctx.globalAlpha = g;
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = p.size * 4;
          ctx.beginPath(); ctx.arc(p.x / 100 * w, p.y / 100 * h, p.size, 0, 6.28); ctx.fill();
          ctx.shadowBlur = 0;
          break;
        case 'butterfly':
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = p.color;
          var bx = p.x / 100 * w, by = p.y / 100 * h, wing = p.size * 1.6 + Math.sin(p.glowPhase * 4) * 1.5;
          ctx.beginPath(); ctx.ellipse(bx - wing / 2, by, wing / 2, wing / 3, 0.3, 0, 6.28); ctx.fill();
          ctx.beginPath(); ctx.ellipse(bx + wing / 2, by, wing / 2, wing / 3, -0.3, 0, 6.28); ctx.fill();
          break;
        case 'bubble':
          ctx.globalAlpha = p.alpha * 0.6;
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x / 100 * w, p.y / 100 * h, p.r, 0, 6.28); ctx.stroke();
          break;
        case 'ember':
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = o.color || '#ffb35c';
          ctx.shadowColor = o.color || '#ffb35c'; ctx.shadowBlur = p.r * 1.5;
          ctx.beginPath(); ctx.arc(p.x / 100 * w, p.y / 100 * h, p.r * 0.35, 0, 6.28); ctx.fill();
          ctx.fillRect(p.x / 100 * w - p.r * 0.3, p.y / 100 * h - p.r * 0.5, p.r * 0.6, p.r);
          ctx.shadowBlur = 0;
          break;
        case 'planet': {
          var px = p.x / 100 * w, py = p.y / 100 * h;
          var pg = ctx.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, 0, px, py, p.r);
          pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.4, p.color); pg.addColorStop(1, 'rgba(0,0,0,.6)');
          ctx.globalAlpha = 1; ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(px, py, p.r, 0, 6.28); ctx.fill();
          break;
        }
        case 'dust':
          ctx.globalAlpha = 0.15 + Math.abs(Math.sin(p.phase)) * 0.2;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(p.x / 100 * w, p.y / 100 * h, p.r, 0, 6.28); ctx.fill();
          break;
      }
    }
    ctx.restore();
  };

  /* ================= CLOUD / FOG / HAZE LAYER ================= */
  function CloudLayer(w, h, opts) {
    this.opts = opts;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.offset = 0;
    this.lastRedraw = 0;
    this.resize(w, h);
  }
  CloudLayer.prototype.resize = function (w, h) {
    this.canvas.width = Math.max(1, Math.round(w));
    this.canvas.height = Math.max(1, Math.round(h));
    this.render();
  };
  CloudLayer.prototype.render = function () {
    var o = this.opts, ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < o.count; i++) {
      var cx = Math.random() * w * 1.3 - w * 0.15;
      var cy = h * (o.yMin + Math.random() * (o.yMax - o.yMin));
      var puffs = 3 + Math.floor(Math.random() * (o.puffs || 4));
      for (var j = 0; j < puffs; j++) {
        var r = randRange(o.minR, o.maxR);
        var px = cx + (j - puffs / 2) * r * 0.55;
        var g = ctx.createRadialGradient(px, cy, 0, px, cy, r);
        g.addColorStop(0, rgba(o.color, o.alpha));
        g.addColorStop(1, rgba(o.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, cy, r, 0, 6.28); ctx.fill();
      }
    }
  };
  CloudLayer.prototype.update = function (dt, t) {
    this.offset += dt * this.opts.speed;
    if (t - this.lastRedraw > (this.opts.evolveMs || 7000)) { this.render(); this.lastRedraw = t; }
  };
  CloudLayer.prototype.draw = function (ctx, w, h, brightness) {
    ctx.save();
    ctx.globalAlpha = brightness == null ? 1 : brightness;
    var x = (-this.offset) % w; if (x > 0) x -= w;
    ctx.drawImage(this.canvas, x, 0, w, h);
    ctx.drawImage(this.canvas, x + w, 0, w, h);
    ctx.restore();
  };

  /* ================= AURORA (also reused horizontally for ocean shimmer) ================= */
  function RibbonField(colors, opts) {
    this.colors = colors; this.opts = opts || {}; this.t = Math.random() * 10;
  }
  RibbonField.prototype.update = function (dt) { this.t += dt * (this.opts.speed || 0.06); };
  RibbonField.prototype.draw = function (ctx, w, h) {
    var horizontal = this.opts.horizontal;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var b = 0; b < this.colors.length; b++) {
      ctx.beginPath();
      var base = horizontal ? h * (this.opts.baseMin + b * this.opts.gap) : h * (0.12 + b * 0.08);
      var band = this.opts.band || 90;
      var step = Math.max(12, w / 40);
      var x;
      for (x = 0; x <= w; x += step) {
        var n = NoiseGen.noise2(x * 0.003 + this.t + b * 10, this.t * 0.5);
        var y = base + (n - 0.5) * band;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (x = w; x >= 0; x -= step) {
        var n2 = NoiseGen.noise2(x * 0.003 + this.t + b * 10, this.t * 0.5 + 2);
        var y2 = base + (this.opts.thickness || 60) + (n2 - 0.5) * (band + 20);
        ctx.lineTo(x, y2);
      }
      ctx.closePath();
      var g = ctx.createLinearGradient(0, base - band / 2, 0, base + (this.opts.thickness || 60) + band / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, this.colors[b]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
  };

  /* ================= LIGHT (sun / moon / eclipse) ================= */
  function Light(opts) { this.opts = opts; this.t = Math.random() * 10; }
  Light.prototype.update = function (dt) { this.t += dt * 0.05; };
  Light.prototype.draw = function (ctx, w, h) {
    var o = this.opts, cx = w * o.x, cy = h * o.y, r = o.r;
    ctx.save();
    if (o.rays) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.1;
      for (var i = 0; i < 6; i++) {
        var a = this.t + i * (Math.PI / 3);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        var grd = ctx.createLinearGradient(0, 0, r * 9, 0);
        grd.addColorStop(0, o.glow); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2); ctx.lineTo(r * 9, -r * 1.1); ctx.lineTo(r * 9, r * 1.1); ctx.lineTo(0, r * 0.2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.6);
    g.addColorStop(0, o.core);
    g.addColorStop(0.35, o.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.6, 0, 6.28); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (o.eclipse) {
      ctx.fillStyle = '#050208';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.28); ctx.fill();
    } else {
      ctx.fillStyle = o.core;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  };

  /* ================= RAINBOW ARC (single decorative pass) ================= */
  function drawRainbow(ctx, w, h, alpha) {
    var cx = w / 2, cy = h * 1.05, colors = ['#ff8a8a', '#ffbf8a', '#fff08a', '#8ae08a', '#8ab4ff', '#c08aff'];
    ctx.save();
    ctx.globalAlpha = alpha;
    var baseR = Math.min(w * 0.55, h * 1.4);
    for (var i = 0; i < colors.length; i++) {
      ctx.beginPath();
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = Math.max(6, w * 0.012);
      ctx.arc(cx, cy, baseR - i * (ctx.lineWidth + 2), Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ================= GRADIENT BACKGROUND ================= */
  function drawGradient(ctx, w, h, stops) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* ================= SKY INSTANCE ================= */
  function SkyInstance(cfg, w, h) {
    this.cfg = cfg;
    this.clouds = (cfg.clouds || []).map(function (c) { return new CloudLayer(w, h, c); });
    this.particles = (cfg.particles || []).map(function (p) { return new ParticleSystem(p.type, p.count, p); });
    this.stars = cfg.stars ? new ParticleSystem('stars', cfg.stars.count, cfg.stars) : null;
    this.aurora = cfg.aurora ? new RibbonField(cfg.aurora.colors, cfg.aurora) : null;
    this.waves = cfg.waves ? new RibbonField(cfg.waves.colors, cfg.waves) : null;
    this.lights = (cfg.lights || []).map(function (l) { return new Light(l); });
    this.rainbowAlpha = 0;
  }
  SkyInstance.prototype.resize = function (w, h) {
    this.clouds.forEach(function (c) { c.resize(w, h); });
  };
  SkyInstance.prototype.update = function (dt, t) {
    this.clouds.forEach(function (c) { c.update(dt, t); });
    this.particles.forEach(function (p) { p.update(dt, WindField, t); });
    if (this.stars) this.stars.update(dt, WindField, t);
    if (this.aurora) this.aurora.update(dt);
    if (this.waves) this.waves.update(dt);
    this.lights.forEach(function (l) { l.update(dt); });
    if (this.cfg.rainbow) this.rainbowAlpha = Math.min(1, this.rainbowAlpha + dt * 0.4);
  };
  SkyInstance.prototype.draw = function (ctx, w, h) {
    drawGradient(ctx, w, h, this.cfg.gradient);
    if (this.stars) this.stars.draw(ctx, w, h);
    var brightness = this.cfg.ambient && this.cfg.ambient.cloudBrightness;
    this.lights.forEach(function (l) { l.draw(ctx, w, h); });
    this.clouds.forEach(function (c) { c.draw(ctx, w, h, brightness); });
    if (this.aurora) this.aurora.draw(ctx, w, h);
    if (this.waves) this.waves.draw(ctx, w, h);
    if (this.cfg.rainbow) drawRainbow(ctx, w, h, this.rainbowAlpha);
    this.particles.forEach(function (p) { p.draw(ctx, w, h); });
  };

  /* ================= OVERLAY MANAGER (crossfade between two canvases) ================= */
  var OverlayManager = (function () {
    var host, canvasA, canvasB, ctxA, ctxB, active, incoming, activeCanvas, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function makeCanvas() {
      var c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;transition:opacity 1.5s ease;will-change:opacity;';
      return c;
    }
function ensureHost() {
      host = document.getElementById('skyOverlay');
      if (!host) {
        host = document.createElement('div');
        host.id = 'skyOverlay';
        host.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;';
        document.body.insertBefore(host, document.body.firstChild);
      }
      if (!canvasA) {
        canvasA = makeCanvas(); canvasB = makeCanvas();
        canvasA.style.opacity = '0'; canvasB.style.opacity = '0';
        host.appendChild(canvasA); host.appendChild(canvasB);
        ctxA = canvasA.getContext('2d'); ctxB = canvasB.getContext('2d');
        sizeCanvas(canvasA); sizeCanvas(canvasB);
        window.addEventListener('resize', onResize, { passive: true });
      }
    }
    function sizeCanvas(c) {
      var w = window.innerWidth, h = window.innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      c.style.width = w + 'px'; c.style.height = h + 'px';
      var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        sizeCanvas(canvasA); sizeCanvas(canvasB);
        if (active) active.instance.resize(window.innerWidth, window.innerHeight);
        if (incoming) incoming.instance.resize(window.innerWidth, window.innerHeight);
      }, 150);
    }
    function swapTo(cfg) {
      ensureHost();
      var prevActive = active;
      incoming = prevActive ? { canvas: prevActive.canvas, ctx: prevActive.ctx, instance: prevActive.instance } : null;
      var targetCanvas = activeCanvas === canvasA ? canvasB : canvasA;
      var targetCtx = targetCanvas === canvasA ? ctxA : ctxB;
      var w = window.innerWidth, h = window.innerHeight;
      var instance = new SkyInstance(cfg, w, h);
      instance.update(0.001, performance.now());
      instance.draw(targetCtx, w, h);
      targetCanvas.style.opacity = '1';
      var outgoing = activeCanvas;
      if (outgoing) outgoing.style.opacity = '0';
      activeCanvas = targetCanvas;
      active = { canvas: targetCanvas, ctx: targetCtx, instance: instance };
      if (prevActive) {
        setTimeout(function () { prevActive.instance = null; incoming = null; }, 1600);
      }
      return active;
    }
    return { swapTo: swapTo, get active() { return active; } };
  })();

  /* ================= ANIMATION MANAGER (single shared loop) ================= */
  var AnimationManager = (function () {
    var running = false, lastT = 0;
    function frame(t) {
      if (!running) return;
      var dt = Math.min((t - lastT) / 1000, 0.05) || 0.016;
      lastT = t;
      var a = OverlayManager.active;
      if (a && a.instance) {
        a.instance.update(dt, t);
        a.instance.draw(a.ctx, window.innerWidth, window.innerHeight);
      }
      requestAnimationFrame(frame);
    }
    function start() {
      if (running || reducedMotion) return;
      running = true; lastT = performance.now();
      requestAnimationFrame(frame);
    }
    function stop() { running = false; }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    return { start: start, stop: stop };
  })();

  var SKIES = [{"gradient": [[0, "#ff7e5f"], [0.35, "#feb47b"], [0.6, "#ffe29f"], [1, "#fff5e6"]], "lights": [{"x": 0.5, "y": 0.09, "r": 46, "core": "#fff8e0", "glow": "rgba(255,204,51,.55)", "rays": true}], "clouds": [{"count": 4, "yMin": 0.35, "yMax": 0.6, "minR": 60, "maxR": 130, "color": "#ffffff", "alpha": 0.35, "speed": 4, "puffs": 4, "evolveMs": 9000}], "name": "Sunrise", "message": "Like the first light you brought into my world ?"},
{"gradient": [[0, "#1a0a2e"], [0.2, "#2d1b4e"], [0.5, "#e85d3a"], [0.7, "#ff9a56"], [1, "#ffd3a5"]], "lights": [{"x": 0.5, "y": 0.82, "r": 50, "core": "#ffe680", "glow": "rgba(232,93,58,.55)", "rays": true}], "stars": {"count": 30, "maxY": 45, "minR": 0.5, "maxR": 1.6}, "name": "Sunset", "message": "Even endings are beautiful when I think of you ?"},
{"gradient": [[0, "#2c3e50"], [0.3, "#4a6274"], [0.6, "#6b8599"], [1, "#889aaa"]], "clouds": [{"count": 5, "yMin": 0.05, "yMax": 0.25, "minR": 90, "maxR": 200, "color": "#5b6f80", "alpha": 0.5, "speed": 6, "puffs": 5, "evolveMs": 8000}], "particles": [{"type": "rain", "count": 110, "minLen": 10, "maxLen": 26, "minSpeed": 45, "maxSpeed": 80}], "name": "Rain", "message": "Every drop carries a memory of you ?"},
{"gradient": [[0, "#b8c6d4"], [0.4, "#d4e1ec"], [0.7, "#e8f0f6"], [1, "#f0f5f9"]], "clouds": [{"count": 6, "yMin": 0.08, "yMax": 0.4, "minR": 70, "maxR": 170, "color": "#ffffff", "alpha": 0.55, "speed": 7, "puffs": 4, "evolveMs": 8000}], "name": "Clouds", "message": "My thoughts of you drift like clouds, endless ?"},
{"gradient": [[0, "#0a0a1a"], [0.3, "#12122e"], [0.6, "#1a1a3e"], [1, "#0d0d2b"]], "stars": {"count": 140, "maxY": 85, "minR": 0.5, "maxR": 2.4}, "lights": [{"x": 0.85, "y": 0.15, "r": 26, "core": "#fff8e0", "glow": "rgba(255,248,224,.35)", "rays": false}], "name": "Starry Night", "message": "You are every star that lights my darkest nights ?"},
{"gradient": [[0, "#1a1a2e"], [0.3, "#2d2d44"], [0.6, "#3d3d5c"], [1, "#2a2a3e"]], "clouds": [{"count": 6, "yMin": 0.02, "yMax": 0.3, "minR": 100, "maxR": 220, "color": "#333349", "alpha": 0.6, "speed": 10, "puffs": 5, "evolveMs": 5000}], "particles": [{"type": "rain", "count": 140, "minLen": 14, "maxLen": 34, "minSpeed": 60, "maxSpeed": 100}], "storm": true, "name": "Storm", "message": "Even in chaos, you are my calm ?"},
{"gradient": [[0, "#0a0a1a"], [0.3, "#0f1a2e"], [0.6, "#0a1a1a"], [1, "#0a0a1a"]], "stars": {"count": 60, "maxY": 85, "minR": 0.5, "maxR": 1.8}, "aurora": {"colors": ["rgba(0,255,128,.28)", "rgba(0,200,255,.22)", "rgba(120,60,220,.2)"], "speed": 0.05, "band": 90, "thickness": 70}, "name": "Aurora", "message": "You paint my sky with colours I never knew existed ?"},
{"gradient": [[0, "#b0b8c0"], [0.3, "#c8ced4"], [0.6, "#d8dce0"], [1, "#e0e4e8"]], "clouds": [{"count": 4, "yMin": 0.2, "yMax": 0.8, "minR": 180, "maxR": 320, "color": "#ffffff", "alpha": 0.28, "speed": 2.5, "puffs": 3, "evolveMs": 10000}], "name": "Fog", "message": "I'd wander through a thousand mists just to find you ?"},
{"gradient": [[0, "#4facfe"], [0.4, "#87cefa"], [0.7, "#b0d4f1"], [1, "#d4e8f7"]], "lights": [{"x": 0.78, "y": 0.1, "r": 40, "core": "#fff8e0", "glow": "rgba(255,220,50,.4)", "rays": true}], "clouds": [{"count": 3, "yMin": 0.45, "yMax": 0.65, "minR": 60, "maxR": 110, "color": "#ffffff", "alpha": 0.5, "speed": 5, "puffs": 4, "evolveMs": 9000}], "name": "Clear Day", "message": "With you, every day is clear and bright ?"},
{"gradient": [[0, "#1a0a2e"], [0.25, "#2d1b4e"], [0.5, "#5b2c56"], [0.7, "#b85d6e"], [1, "#e8a87c"]], "lights": [{"x": 0.82, "y": 0.14, "r": 22, "core": "#fff8e0", "glow": "rgba(255,255,200,.3)", "rays": false}], "stars": {"count": 35, "maxY": 40, "minR": 0.5, "maxR": 1.5}, "name": "Twilight", "message": "Between day and night, you are my only thought ?"},
{"gradient": [[0, "#05030f"], [0.35, "#0d0821"], [0.65, "#150a2e"], [1, "#1a0f38"]], "stars": {"count": 110, "maxY": 100, "minR": 0.5, "maxR": 2}, "aurora": {"colors": ["rgba(140,90,220,.18)", "rgba(90,60,180,.15)"], "speed": 0.02, "band": 160, "thickness": 140}, "name": "Midnight Galaxy", "message": "You are the whole galaxy folded into one heartbeat ?"},
{"gradient": [[0, "#ffd9e8"], [0.35, "#ffc2d9"], [0.7, "#ffe0ec"], [1, "#fff2f7"]], "particles": [{"type": "petal", "count": 40, "minSize": 7, "maxSize": 15, "minSpeed": 3, "maxSpeed": 7, "colors": ["#ffeef5", "#ffb3d1", "#ff9ec4"]}], "name": "Sakura Petals", "message": "Like petals on the wind, my thoughts always drift to you ?"},
{"gradient": [[0, "#7c93ad"], [0.35, "#a9bdd1"], [0.7, "#d6e2ee"], [1, "#eef4fa"]], "particles": [{"type": "snow", "count": 90, "minR": 1.5, "maxR": 4, "minSpeed": 4, "maxSpeed": 10}], "name": "Gentle Snowfall", "message": "Every snowflake is a quiet reminder that you are near ?"},
{"gradient": [[0, "#04040f"], [0.4, "#0a0a1f"], [0.75, "#12122e"], [1, "#050510"]], "stars": {"count": 90, "maxY": 90, "minR": 0.5, "maxR": 1.8}, "particles": [{"type": "meteor", "count": 4, "interval": 3}], "name": "Meteor Shower", "message": "You fell into my life like a wish I never got to finish making ?"},
{"gradient": [[0, "#10182c"], [0.35, "#1c2740"], [0.7, "#2a3550"], [1, "#384260"]], "lights": [{"x": 0.82, "y": 0.16, "r": 30, "core": "#fffaf0", "glow": "rgba(255,250,230,.4)", "rays": false}], "clouds": [{"count": 5, "yMin": 0.2, "yMax": 0.7, "minR": 90, "maxR": 190, "color": "#c8cde1", "alpha": 0.3, "speed": 4, "puffs": 4, "evolveMs": 9000}], "ambient": {"cloudBrightness": 0.9}, "name": "Moonlit Clouds", "message": "The moon shares its light with the clouds the way I share my heart with you ?"},

{"gradient": [[0, "#0a1710"], [0.35, "#142a1c"], [0.7, "#1c3a26"], [1, "#0f2016"]], "particles": [{"type": "firefly", "count": 30, "minY": 30, "maxY": 92, "minSize": 2, "maxSize": 4, "colors": ["#d8ff8c", "#c8f27a"]}], "name": "Fireflies at Night", "message": "You flicker in my mind like a firefly I can never quite catch ?"},
{"gradient": [[0, "#ffb3d9"], [0.35, "#d9b3ff"], [0.7, "#b3d9ff"], [1, "#fff0f7"]], "clouds": [{"count": 5, "yMin": 0.1, "yMax": 0.55, "minR": 90, "maxR": 200, "color": "#ffffff", "alpha": 0.4, "speed": 4, "puffs": 4, "evolveMs": 9000}], "stars": {"count": 20, "maxY": 40, "minR": 0.5, "maxR": 1.2}, "name": "Cotton Candy Sky", "message": "Loving you feels as light and sweet as a sky spun from cotton candy ?"},
{"gradient": [[0, "#0a0518"], [0.3, "#1c0a30"], [0.6, "#3a1050"], [1, "#200a35"]], "stars": {"count": 70, "maxY": 100, "minR": 0.5, "maxR": 2}, "aurora": {"colors": ["rgba(255,80,150,.2)", "rgba(120,60,220,.22)", "rgba(60,180,220,.16)"], "speed": 0.03, "band": 180, "thickness": 160}, "name": "Fantasy Nebula", "message": "You are the color I never knew the universe was missing ?"},
{"gradient": [[0, "#000005"], [0.4, "#04040c"], [0.75, "#0a0a18"], [1, "#030308"]], "stars": {"count": 150, "maxY": 100, "minR": 0.5, "maxR": 2}, "particles": [{"type": "planet", "count": 2, "minR": 12, "maxR": 30, "colors": ["#c05a2c", "#3d6ea5"]}], "name": "Cosmic Space", "message": "Out of an entire universe of stars, I only ever wanted to orbit you ?"},
{"gradient": [[0, "#8fb8d8"], [0.35, "#b8d4e8"], [0.7, "#d8ecf0"], [1, "#f0f8ee"]], "particles": [{"type": "rain", "count": 30, "minLen": 8, "maxLen": 16, "minSpeed": 40, "maxSpeed": 60}], "rainbow": true, "name": "Rainbow After Rain", "message": "After every storm we weathered, I still find a rainbow waiting in you ?"},
{"gradient": [[0, "#060615"], [0.3, "#0d0d28"], [0.65, "#16163e"], [1, "#0a0a20"]], "stars": {"count": 160, "maxY": 100, "minR": 0.5, "maxR": 2.4}, "particles": [{"type": "meteor", "count": 3, "interval": 4}], "name": "Magical Starfield", "message": "Somewhere among a million stars, I would still find my way back to you ?"},

{"gradient": [[0, "#0d3b52"], [0.35, "#14587a"], [0.65, "#2b8ba8"], [1, "#7ec4d4"]], "lights": [{"x": 0.5, "y": 0.72, "r": 40, "core": "#fff3d0", "glow": "rgba(255,210,140,.45)", "rays": false}], "waves": {"colors": ["rgba(255,255,255,.18)", "rgba(255,255,255,.12)", "rgba(255,255,255,.09)"], "horizontal": true, "baseMin": 0.78, "gap": 0.06, "band": 10, "thickness": 4, "speed": 0.15}, "name": "Ocean Horizon", "message": "My love for you stretches out as far and calm as the ocean horizon ?"},

{"gradient": [[0, "#2b1b3a"], [0.3, "#6b3350"], [0.6, "#c9583f"], [0.85, "#e8a45a"], [1, "#f5cf8a"]], "lights": [{"x": 0.5, "y": 0.72, "r": 46, "core": "#ffe0a0", "glow": "rgba(232,103,47,.5)", "rays": false}], "clouds": [{"count": 3, "yMin": 0.6, "yMax": 0.78, "minR": 160, "maxR": 260, "color": "#ffc896", "alpha": 0.15, "speed": 2, "puffs": 3, "evolveMs": 11000}], "name": "Desert Dusk", "message": "Even in the quiet desert dusk, my whole world still turns toward you ?"},
{"gradient": [[0, "#6e4a2e"], [0.3, "#a8662f"], [0.6, "#d99a3d"], [1, "#f0c56b"]], "particles": [{"type": "leaf", "count": 34, "minSize": 8, "maxSize": 15, "minSpeed": 3, "maxSpeed": 7, "colors": ["#c9522c", "#e08a2e", "#d9b23d", "#a8422a"]}], "name": "Autumn Leaves", "message": "Falling for you was as natural and unstoppable as autumn leaves letting go ?"},
{"gradient": [[0, "#a8d8b8"], [0.35, "#c8e8c0"], [0.7, "#eaf5d8"], [1, "#fdf8e8"]], "particles": [{"type": "butterfly", "count": 16, "minY": 25, "maxY": 85, "minSize": 4, "maxSize": 7, "colors": ["#ff9ec4", "#ffd27a", "#9ecbff", "#c9a0ff"]}], "name": "Butterfly Meadow", "message": "You make my heart feel light, like butterflies drifting through an open meadow ?"},
{"gradient": [[0, "#8ec9e8"], [0.35, "#b8ddf0"], [0.7, "#dcf0f5"], [1, "#f2fbfc"]], "particles": [{"type": "bubble", "count": 26, "minR": 6, "maxR": 22, "minSpeed": 3, "maxSpeed": 10}], "name": "Bubble Dream", "message": "My favourite daydream is still just us, drifting somewhere weightless together ?"},
{"gradient": [[0, "#060308"], [0.35, "#100814"], [0.7, "#1a0d1e"], [1, "#0a0510"]], "stars": {"count": 70, "maxY": 100, "minR": 0.5, "maxR": 1.8}, "lights": [{"x": 0.5, "y": 0.32, "r": 40, "core": "#040204", "glow": "rgba(255,120,50,.4)", "rays": false, "eclipse": true}], "name": "Eclipse Night", "message": "You are the light that finds a way through, even in my darkest eclipse ?"},
{"gradient": [[0, "#4a5a70"], [0.35, "#6d7f95"], [0.7, "#9cb0c2"], [1, "#c9d8e4"]], "particles": [{"type": "snow", "count": 160, "minR": 2, "maxR": 5, "minSpeed": 10, "maxSpeed": 22}], "name": "Winter Blizzard", "message": "Whatever storm we face, I would still choose to walk through it beside you ?"},
{"gradient": [[0, "#b85c3a"], [0.3, "#d98a4a"], [0.6, "#f0b869"], [0.85, "#fadb96"], [1, "#fff2cc"]], "lights": [{"x": 0.5, "y": 0.4, "r": 56, "core": "#fff3d0", "glow": "rgba(255,177,92,.5)", "rays": true}], "clouds": [{"count": 3, "yMin": 0.15, "yMax": 0.35, "minR": 160, "maxR": 260, "color": "#ffdcaa", "alpha": 0.12, "speed": 2, "puffs": 3, "evolveMs": 11000}], "name": "Golden Hour Haze", "message": "Being with you feels like living permanently inside golden hour ?"}
,

{"gradient":[[0,"#e8d5c4"],[0.3,"#f2e3d5"],[0.6,"#f7ebe0"],[1,"#fcf3ea"]],"clouds":[{"count":3,"yMin":0.5,"yMax":0.75,"minR":120,"maxR":220,"color":"#ffffff","alpha":0.25,"speed":2,"puffs":4,"evolveMs":10000}],"lights":[{"x":0.78,"y":0.12,"r":35,"core":"#fff8e0","glow":"rgba(255,220,160,.35)","rays":true}],"stars":{"count":8,"maxY":25,"minR":0.4,"maxR":1},"name":"Dawn Light","message":"You are the quiet light that wakes my heart every morning ?"},
{"gradient":[[0,"#3a4a5a"],[0.3,"#5a7a8a"],[0.6,"#8aaaba"],[1,"#bcd4e0"]],"clouds":[{"count":5,"yMin":0.1,"yMax":0.35,"minR":80,"maxR":180,"color":"#c8d8e0","alpha":0.45,"speed":5,"puffs":5,"evolveMs":8000}],"waves":{"colors":["rgba(255,255,255,.12)","rgba(255,255,255,.08)"],"horizontal":true,"baseMin":0.75,"gap":0.05,"band":8,"thickness":3,"speed":0.12},"name":"Misty Coast","message":"My thoughts of you roll in like waves through the morning mist ?"},
{"gradient":[[0,"#2a3a1a"],[0.3,"#4a6a2a"],[0.6,"#6a8a4a"],[1,"#8aaa6a"]],"particles":[{"type":"leaf","count":20,"minSize":6,"maxSize":12,"minSpeed":2,"maxSpeed":5,"colors":["#7a9a4a","#5a7a3a","#9aba5a"]}],"name":"Spring Meadow","message":"You make everything in me bloom like spring ?"},
{"gradient":[[0,"#d4a878"],[0.35,"#e8c898"],[0.7,"#f0d8b0"],[1,"#f8e8c8"]],"lights":[{"x":0.5,"y":0.65,"r":45,"core":"#ffe0a0","glow":"rgba(255,200,100,.45)","rays":true}],"clouds":[{"count":3,"yMin":0.5,"yMax":0.7,"minR":140,"maxR":250,"color":"#ffdbb0","alpha":0.15,"speed":2,"puffs":3,"evolveMs":12000}],"name":"Harvest Sun","message":"You are the golden warmth that fills every season of my life ?"},
{"gradient":[[0,"#1a2a3a"],[0.3,"#2a4a5a"],[0.6,"#3a5a6a"],[1,"#4a6a7a"]],"clouds":[{"count":6,"yMin":0.05,"yMax":0.3,"minR":70,"maxR":160,"color":"#5a7a8a","alpha":0.5,"speed":8,"puffs":5,"evolveMs":6000}],"particles":[{"type":"rain","count":130,"minLen":12,"maxLen":28,"minSpeed":50,"maxSpeed":90}],"storm":true,"name":"Heavy Rain","message":"Even in the heaviest downpour, I feel only the warmth of you ?"},
{"gradient":[[0,"#4a6a3a"],[0.35,"#6a8a5a"],[0.7,"#8aaa7a"],[1,"#aacaaa"]],"particles":[{"type":"petal","count":25,"minSize":5,"maxSize":10,"minSpeed":3,"maxSpeed":6,"colors":["#ffffff","#ffeef5","#ffdde8"]}],"name":"Cherry Blossom Rain","message":"Petals fall like memories of every smile you gave me ?"},
{"gradient":[[0,"#0a0a1a"],[0.25,"#1a1a3a"],[0.5,"#2a2a4a"],[0.75,"#1a1a2a"],[1,"#0a0a1a"]],"stars":{"count":120,"maxY":90,"minR":0.5,"maxR":2},"aurora":{"colors":["rgba(100,255,180,.15)","rgba(60,200,255,.12)","rgba(180,100,255,.1)"],"speed":0.04,"band":140,"thickness":120},"name":"Northern Lights","message":"The aurora dances across the sky, but nothing compares to the way you dance through my heart ?"},
{"gradient":[[0,"#3a2a1a"],[0.3,"#5a3a2a"],[0.6,"#7a5a3a"],[1,"#9a7a5a"]],"particles":[{"type":"leaf","count":40,"minSize":8,"maxSize":14,"minSpeed":3,"maxSpeed":8,"colors":["#c85a2a","#d87a3a","#e09a4a","#b84a2a"]}],"name":"Autumn Sunset","message":"You are the warmest goodbye I never want to let go of ?"},
{"gradient":[[0,"#d4e8f0"],[0.3,"#e8f4fa"],[0.6,"#f0f8fc"],[1,"#f8fcfe"]],"clouds":[{"count":4,"yMin":0.6,"yMax":0.85,"minR":150,"maxR":300,"color":"#ffffff","alpha":0.3,"speed":2,"puffs":3,"evolveMs":10000}],"waves":{"colors":["rgba(180,210,230,.15)","rgba(180,210,230,.1)","rgba(180,210,230,.07)"],"horizontal":true,"baseMin":0.82,"gap":0.04,"band":8,"thickness":3,"speed":0.1},"name":"White Sands","message":"Walking beside you feels like endless shores under endless skies ?"},
{"gradient":[[0,"#2a1a3a"],[0.35,"#4a2a5a"],[0.7,"#6a3a7a"],[1,"#3a1a4a"]],"stars":{"count":90,"maxY":85,"minR":0.5,"maxR":1.8},"lights":[{"x":0.8,"y":0.18,"r":28,"core":"#e0d0ff","glow":"rgba(160,120,255,.35)","rays":false}],"name":"Purple Night","message":"In the velvet purple night, you are the only star I see ?"},
{"gradient":[[0,"#0a1a1a"],[0.3,"#1a2a2a"],[0.6,"#2a3a3a"],[1,"#1a2a2a"]],"stars":{"count":80,"maxY":90,"minR":0.5,"maxR":1.5},"aurora":{"colors":["rgba(0,255,200,.2)","rgba(0,200,180,.15)","rgba(100,255,150,.12)"],"speed":0.03,"band":200,"thickness":180},"name":"Emerald Aurora","message":"You glow in my life like emerald fire across the arctic night ?"},
{"gradient":[[0,"#f0e0d0"],[0.4,"#f8e8d8"],[0.7,"#fcf0e4"],[1,"#fef8f0"]],"lights":[{"x":0.5,"y":0.55,"r":55,"core":"#fffaf0","glow":"rgba(255,240,200,.4)","rays":true}],"clouds":[{"count":3,"yMin":0.1,"yMax":0.25,"minR":120,"maxR":200,"color":"#ffffff","alpha":0.35,"speed":3,"puffs":4,"evolveMs":9000}],"name":"Soft Dawn","message":"You arrive softly, like light spilling over the edge of night ?"},
{"gradient":[[0,"#4a3a2a"],[0.3,"#6a5a3a"],[0.6,"#8a7a5a"],[1,"#aa9a7a"]],"clouds":[{"count":4,"yMin":0.3,"yMax":0.6,"minR":100,"maxR":200,"color":"#c8b898","alpha":0.3,"speed":3,"puffs":4,"evolveMs":9000}],"particles":[{"type":"ember","count":12,"minR":5,"maxR":10,"minSpeed":2,"maxSpeed":5,"color":"#ffb86c"}],"name":"Campfire Nights","message":"Your love warms me like a fire that never fades ?"},
{"gradient":[[0,"#0a1520"],[0.3,"#152a40"],[0.6,"#1a3550"],[1,"#0f2030"]],"stars":{"count":130,"maxY":100,"minR":0.5,"maxR":2.2},"lights":[{"x":0.15,"y":0.12,"r":18,"core":"#fff8e0","glow":"rgba(255,248,224,.25)","rays":false}],"name":"Deep Space","message":"My love for you is as infinite as the space between stars ?"},
{"gradient":[[0,"#1a2a4a"],[0.35,"#2a4a6a"],[0.7,"#3a5a8a"],[1,"#2a3a5a"]],"stars":{"count":100,"maxY":95,"minR":0.5,"maxR":1.8},"aurora":{"colors":["rgba(60,120,255,.18)","rgba(100,60,255,.15)"],"speed":0.02,"band":180,"thickness":160},"name":"Galactic Drift","message":"Across galaxies and lightyears, I would drift just to reach you ?"},
{"gradient":[[0,"#0a0515"],[0.3,"#150a25"],[0.6,"#201040"],[1,"#150825"]],"stars":{"count":170,"maxY":100,"minR":0.5,"maxR":2.5},"particles":[{"type":"meteor","count":5,"interval":3}],"name":"Stardust","message":"You are the stardust I never stopped looking for ?"},
{"gradient":[[0,"#1a0a3a"],[0.3,"#2a1550"],[0.6,"#3a2065"],[1,"#2a1050"]],"stars":{"count":140,"maxY":100,"minR":0.5,"maxR":2},"aurora":{"colors":["rgba(200,100,255,.18)","rgba(150,60,220,.15)","rgba(255,100,200,.12)"],"speed":0.025,"band":220,"thickness":200},"name":"Nebula Dream","message":"You are the most beautiful dream the universe ever dreamed ?"},
{"gradient":[[0,"#050510"],[0.4,"#0a0a20"],[0.8,"#101030"],[1,"#080820"]],"stars":{"count":200,"maxY":100,"minR":0.4,"maxR":1.8},"lights":[{"x":0.5,"y":0.5,"r":15,"core":"#ffffff","glow":"rgba(255,255,255,.1)","rays":false}],"name":"Void","message":"Even in the empty void, I carry your light within me ?"},
{"gradient":[[0,"#2a1030"],[0.35,"#4a1a50"],[0.7,"#6a2a70"],[1,"#3a1540"]],"stars":{"count":110,"maxY":100,"minR":0.5,"maxR":2},"particles":[{"type":"planet","count":3,"minR":8,"maxR":22,"colors":["#ff6b8a","#9b5de5","#00bbf9"]}],"name":"Cosmic Bloom","message":"You are the universe blooming inside my chest ?"},
{"gradient":[[0,"#0a1020"],[0.3,"#102040"],[0.6,"#183060"],[1,"#0c1828"]],"stars":{"count":150,"maxY":100,"minR":0.5,"maxR":2},"particles":[{"type":"meteor","count":6,"interval":2.5}],"name":"Shooting Stars","message":"I made a wish on every shooting star, and every time it came true ï¿½ you ?"},
{"gradient":[[0,"#1a1a2a"],[0.3,"#2a2a4a"],[0.6,"#3a3a5a"],[1,"#2a2a3a"]],"stars":{"count":90,"maxY":85,"minR":0.5,"maxR":1.5},"aurora":{"colors":["rgba(255,150,100,.15)","rgba(255,100,60,.12)","rgba(200,80,40,.1)"],"speed":0.03,"band":160,"thickness":140},"name":"Solar Wind","message":"You blow through my universe like solar wind, rearranging all my stars ?"},
{"gradient":[[0,"#d0e8f0"],[0.35,"#e0f0f8"],[0.7,"#f0f8fc"],[1,"#f8fcfe"]],"clouds":[{"count":5,"yMin":0.05,"yMax":0.35,"minR":70,"maxR":160,"color":"#ffffff","alpha":0.5,"speed":6,"puffs":4,"evolveMs":8000}],"particles":[{"type":"rain","count":40,"minLen":8,"maxLen":18,"minSpeed":35,"maxSpeed":60}],"rainbow":true,"name":"Sunshower","message":"Even when tears fall, your love paints colour across my sky ?"},
{"gradient":[[0,"#2a3a4a"],[0.35,"#4a5a6a"],[0.7,"#6a7a8a"],[1,"#8a9aaa"]],"clouds":[{"count":7,"yMin":0.02,"yMax":0.25,"minR":80,"maxR":190,"color":"#4a5a6a","alpha":0.55,"speed":9,"puffs":5,"evolveMs":5000}],"particles":[{"type":"rain","count":180,"minLen":15,"maxLen":35,"minSpeed":65,"maxSpeed":110}],"storm":true,"name":"Thunderstorm","message":"Even thunder listens when I whisper your name ?"},
{"gradient":[[0,"#6a7a8a"],[0.3,"#8a9aaa"],[0.6,"#aabaca"],[1,"#cadada"]],"clouds":[{"count":6,"yMin":0.08,"yMax":0.4,"minR":90,"maxR":200,"color":"#7a8a9a","alpha":0.5,"speed":7,"puffs":5,"evolveMs":7000}],"particles":[{"type":"snow","count":120,"minR":2,"maxR":4.5,"minSpeed":8,"maxSpeed":18}],"name":"Winter Sky","message":"You are the warmth that makes even the coldest winter bearable ?"},
{"gradient":[[0,"#e0e8f0"],[0.4,"#f0f4f8"],[0.7,"#f8fafc"],[1,"#fcfefe"]],"clouds":[{"count":3,"yMin":0.4,"yMax":0.7,"minR":140,"maxR":280,"color":"#ffffff","alpha":0.2,"speed":2,"puffs":3,"evolveMs":12000}],"lights":[{"x":0.5,"y":0.08,"r":50,"core":"#fffce0","glow":"rgba(255,255,200,.35)","rays":true}],"name":"Pale Winter Sun","message":"Like the winter sun, you are gentle and you are enough ?"},
{"gradient":[[0,"#7a8a7a"],[0.35,"#9aaa9a"],[0.7,"#bacaba"],[1,"#daeada"]],"clouds":[{"count":5,"yMin":0.1,"yMax":0.45,"minR":80,"maxR":180,"color":"#aacaaa","alpha":0.4,"speed":4,"puffs":4,"evolveMs":9000}],"particles":[{"type":"rain","count":60,"minLen":10,"maxLen":20,"minSpeed":40,"maxSpeed":70}],"name":"Spring Rain","message":"Your words fall over me like the gentlest April rain ?"},
{"gradient":[[0,"#8a6a4a"],[0.35,"#aa8a5a"],[0.7,"#caaa7a"],[1,"#eaca9a"]],"clouds":[{"count":4,"yMin":0.2,"yMax":0.5,"minR":100,"maxR":220,"color":"#dab88a","alpha":0.3,"speed":3,"puffs":4,"evolveMs":10000}],"particles":[{"type":"leaf","count":30,"minSize":7,"maxSize":13,"minSpeed":2,"maxSpeed":6,"colors":["#c87a3a","#a86a2a","#d89a4a"]}],"name":"Golden Autumn","message":"You are the golden thread woven through every season of my heart ?"},
{"gradient":[[0,"#b0c8d8"],[0.35,"#c8dce8"],[0.7,"#e0ecf0"],[1,"#f0f4f8"]],"clouds":[{"count":6,"yMin":0.05,"yMax":0.3,"minR":70,"maxR":160,"color":"#d0e0e8","alpha":0.5,"speed":6,"puffs":5,"evolveMs":7000}],"particles":[{"type":"snow","count":100,"minR":1.5,"maxR":3.5,"minSpeed":6,"maxSpeed":14}],"name":"Light Snowfall","message":"Each flake is a whispered promise I want to keep for you ?"},
{"gradient":[[0,"#1a2a3a"],[0.3,"#2a4a5a"],[0.6,"#3a5a7a"],[1,"#2a3a4a"]],"clouds":[{"count":5,"yMin":0.05,"yMax":0.3,"minR":90,"maxR":200,"color":"#4a6a7a","alpha":0.45,"speed":7,"puffs":5,"evolveMs":6000}],"particles":[{"type":"rain","count":100,"minLen":12,"maxLen":24,"minSpeed":45,"maxSpeed":85}],"name":"Steady Rain","message":"Like steady rain on a quiet roof, my love for you never stops ?"},
{"gradient":[[0,"#1a2a1a"],[0.3,"#2a4a2a"],[0.6,"#4a6a4a"],[1,"#6a8a6a"]],"clouds":[{"count":4,"yMin":0.1,"yMax":0.5,"minR":90,"maxR":200,"color":"#5a8a5a","alpha":0.35,"speed":4,"puffs":4,"evolveMs":9000}],"particles":[{"type":"leaf","count":15,"minSize":6,"maxSize":11,"minSpeed":2,"maxSpeed":5,"colors":["#8aba6a","#7aaa5a","#9aca7a"]}],"name":"Jungle Canopy","message":"You are my sky through the thickest jungle, the light I always find ?"},
{"gradient":[[0,"#f5e6d0"],[0.35,"#faf0e0"],[0.7,"#fcf4e8"],[1,"#fefaf0"]],"lights":[{"x":0.5,"y":0.5,"r":65,"core":"#fffaf0","glow":"rgba(255,240,180,.5)","rays":true}],"clouds":[{"count":2,"yMin":0.15,"yMax":0.3,"minR":180,"maxR":320,"color":"#ffffff","alpha":0.2,"speed":1.5,"puffs":3,"evolveMs":14000}],"name":"Golden Glow","message":"Your presence fills every space like golden light, leaving no shadow untouched ?"},
{"gradient":[[0,"#2a1040"],[0.3,"#4a2060"],[0.6,"#6a3080"],[1,"#3a1850"]],"stars":{"count":100,"maxY":95,"minR":0.5,"maxR":1.8},"aurora":{"colors":["rgba(255,60,200,.2)","rgba(200,60,255,.18)","rgba(140,60,255,.15)"],"speed":0.035,"band":240,"thickness":200},"name":"Purple Aurora","message":"You paint my world in colours no artist could ever capture ?"},
{"gradient":[[0,"#0a1520"],[0.3,"#1a2a40"],[0.6,"#2a3a60"],[1,"#152030"]],"stars":{"count":90,"maxY":95,"minR":0.5,"maxR":1.5},"lights":[{"x":0.5,"y":0.22,"r":35,"core":"#c0d0ff","glow":"rgba(100,150,255,.3)","rays":false}],"name":"Blue Hour","message":"In the blue hour between day and night, I only ever think of you ?"},
{"gradient":[[0,"#2a2a3a"],[0.35,"#3a3a5a"],[0.7,"#4a4a6a"],[1,"#3a3a4a"]],"stars":{"count":120,"maxY":90,"minR":0.5,"maxR":1.8},"lights":[{"x":0.9,"y":0.1,"r":20,"core":"#fff8e0","glow":"rgba(255,248,224,.25)","rays":false}],"name":"Night Fog","message":"Even through the fog of uncertainty, I always find my way to you ?"},
{"gradient":[[0,"#8ab0c8"],[0.3,"#a8c8e0"],[0.6,"#c8e0f0"],[1,"#e8f0f8"]],"clouds":[{"count":4,"yMin":0.3,"yMax":0.6,"minR":100,"maxR":240,"color":"#ffffff","alpha":0.35,"speed":3.5,"puffs":4,"evolveMs":9000}],"waves":{"colors":["rgba(255,255,255,.15)","rgba(255,255,255,.1)","rgba(255,255,255,.07)"],"horizontal":true,"baseMin":0.75,"gap":0.05,"band":10,"thickness":3.5,"speed":0.12},"name":"Glacier Sky","message":"You are ancient and eternal, like ice that has watched a thousand years ?"},
{"gradient":[[0,"#2a0a1a"],[0.3,"#4a1a2a"],[0.6,"#6a2a3a"],[1,"#3a1520"]],"stars":{"count":80,"maxY":85,"minR":0.5,"maxR":1.5},"aurora":{"colors":["rgba(255,100,150,.18)","rgba(200,60,100,.15)","rgba(255,60,80,.12)"],"speed":0.03,"band":200,"thickness":180},"name":"Crimson Sky","message":"You burn across my sky like a love that will never fade ?"},
{"gradient":[[0,"#0a0a15"],[0.3,"#101028"],[0.6,"#15153a"],[1,"#0a0a1a"]],"stars":{"count":160,"maxY":100,"minR":0.4,"maxR":2},"lights":[{"x":0.5,"y":0.08,"r":12,"core":"#fff8e0","glow":"rgba(255,248,224,.2)","rays":false}],"name":"Tiny Star","message":"One tiny star is enough to light up an entire sky ï¿½ you are my star ?"}
,
{"gradient":[[0,"#1a2a3a"],[0.35,"#3a4a5a"],[0.7,"#5a6a7a"],[1,"#4a5a6a"]],"clouds":[{"count":6,"yMin":0.05,"yMax":0.4,"minR":80,"maxR":190,"color":"#6a7a8a","alpha":0.45,"speed":8,"puffs":5,"evolveMs":6000}],"particles":[{"type":"snow","count":140,"minR":2,"maxR":4.5,"minSpeed":12,"maxSpeed":25}],"name":"Blizzard","message":"Through every storm, you are the shelter I run to ?"},
{"gradient":[[0,"#0a3a2a"],[0.3,"#1a5a3a"],[0.6,"#2a7a4a"],[1,"#3a9a5a"]],"clouds":[{"count":4,"yMin":0.2,"yMax":0.5,"minR":90,"maxR":200,"color":"#7ab88a","alpha":0.3,"speed":3,"puffs":4,"evolveMs":10000}],"particles":[{"type":"leaf","count":10,"minSize":5,"maxSize":10,"minSpeed":2,"maxSpeed":4,"colors":["#9ad87a","#7ac85a","#bae89a"]}],"name":"Deep Forest","message":"You are the breath of fresh air I find in the deepest woods ?"},
{"gradient":[[0,"#e0c8a0"],[0.35,"#f0d8b0"],[0.7,"#f8e4c8"],[1,"#fcf0e0"]],"lights":[{"x":0.5,"y":0.6,"r":48,"core":"#ffe0a0","glow":"rgba(255,200,120,.4)","rays":true}],"clouds":[{"count":3,"yMin":0.1,"yMax":0.3,"minR":140,"maxR":280,"color":"#ffffff","alpha":0.2,"speed":2,"puffs":3,"evolveMs":12000}],"name":"Honey Light","message":"You pour over my life like honey light, warm and endlessly sweet ?"},
{"gradient":[[0,"#301020"],[0.35,"#502040"],[0.7,"#703060"],[1,"#401830"]],"stars":{"count":100,"maxY":95,"minR":0.5,"maxR":1.8},"lights":[{"x":0.7,"y":0.2,"r":30,"core":"#ffc0e0","glow":"rgba(255,100,200,.35)","rays":false}],"name":"Rose Nebula","message":"You are a nebula shaped like a rose, blooming in the dark of space ?"},
{"gradient":[[0,"#d0e0f0"],[0.4,"#e0ecf4"],[0.7,"#f0f4f8"],[1,"#f8fafc"]],"clouds":[{"count":5,"yMin":0.05,"yMax":0.25,"minR":60,"maxR":140,"color":"#ffffff","alpha":0.55,"speed":7,"puffs":4,"evolveMs":8000}],"lights":[{"x":0.82,"y":0.08,"r":38,"core":"#fff8e0","glow":"rgba(255,220,80,.38)","rays":true}],"name":"Winter Morning","message":"Every morning with you feels like the first winter sunrise ?"},
{"gradient":[[0,"#1a1a2a"],[0.3,"#2a2a4a"],[0.6,"#3a3a5a"],[1,"#2a2a3a"]],"stars":{"count":140,"maxY":90,"minR":0.5,"maxR":2},"lights":[{"x":0.5,"y":0.55,"r":8,"core":"#ffffff","glow":"rgba(255,255,255,.08)","rays":false,"eclipse":true}],"name":"Midnight Eclipse","message":"Even in total eclipse, I feel your light within me ?"},
{"gradient":[[0,"#4a6a8a"],[0.35,"#6a8aaa"],[0.7,"#8aaaca"],[1,"#aacaea"]],"clouds":[{"count":4,"yMin":0.4,"yMax":0.7,"minR":100,"maxR":240,"color":"#ffffff","alpha":0.3,"speed":3,"puffs":4,"evolveMs":10000}],"waves":{"colors":["rgba(200,220,240,.15)","rgba(200,220,240,.1)","rgba(200,220,240,.07)"],"horizontal":true,"baseMin":0.75,"gap":0.04,"band":9,"thickness":3,"speed":0.1},"name":"Ocean Blue","message":"Endless as the ocean, my love for you runs deeper than any sea ?"},
{"gradient":[[0,"#0a0a1a"],[0.25,"#1a1a3a"],[0.5,"#2a2a5a"],[0.75,"#3a3a6a"],[1,"#2a2a4a"]],"stars":{"count":180,"maxY":100,"minR":0.4,"maxR":2.2},"particles":[{"type":"meteor","count":4,"interval":3.5}],"name":"Starfall","message":"You are every star that ever fell, every wish I ever made ?"},
{"gradient":[[0,"#3a1a1a"],[0.3,"#5a2a2a"],[0.6,"#7a3a3a"],[1,"#5a2a2a"]],"stars":{"count":70,"maxY":80,"minR":0.5,"maxR":1.5},"lights":[{"x":0.5,"y":0.35,"r":25,"core":"#ff6060","glow":"rgba(255,60,60,.3)","rays":false}],"name":"Mars Red","message":"You burn across the sky of my heart like a planet on fire ?"},
{"gradient":[[0,"#2a4a6a"],[0.35,"#4a6a8a"],[0.7,"#6a8aaa"],[1,"#8aaaca"]],"clouds":[{"count":4,"yMin":0.1,"yMax":0.4,"minR":80,"maxR":200,"color":"#aacaea","alpha":0.35,"speed":4,"puffs":4,"evolveMs":9000}],"name":"Sky Blue","message":"You are the colour my world never knew it was missing ?"},
{"gradient":[[0,"#f0d8c0"],[0.35,"#f8e4d0"],[0.7,"#fcf0e4"],[1,"#fef8f0"]],"lights":[{"x":0.5,"y":0.1,"r":52,"core":"#fffaf0","glow":"rgba(255,240,200,.45)","rays":true}],"clouds":[{"count":3,"yMin":0.35,"yMax":0.55,"minR":120,"maxR":220,"color":"#ffffff","alpha":0.3,"speed":3,"puffs":4,"evolveMs":10000}],"name":"Warm Morning","message":"Waking up to you is the only warmth I ever need ?"},
{"gradient":[[0,"#2a1a10"],[0.3,"#4a2a1a"],[0.6,"#6a3a2a"],[1,"#3a2015"]],"stars":{"count":60,"maxY":80,"minR":0.5,"maxR":1.3},"lights":[{"x":0.5,"y":0.5,"r":20,"core":"#ff8844","glow":"rgba(255,100,40,.25)","rays":false}],"name":"Desert Night","message":"In the vast desert night, you are my only oasis ?"},
{"gradient":[[0,"#e8d0f0"],[0.35,"#f0ddf5"],[0.7,"#f5e8fa"],[1,"#faf0fc"]],"clouds":[{"count":4,"yMin":0.3,"yMax":0.6,"minR":100,"maxR":200,"color":"#ffffff","alpha":0.35,"speed":3.5,"puffs":4,"evolveMs":9000}],"stars":{"count":30,"maxY":50,"minR":0.5,"maxR":1.2},"name":"Lavender Sky","message":"You calm my storms like lavender settling over the evening sky ?"},
{"gradient":[[0,"#f0e8d0"],[0.4,"#f8f0e0"],[0.7,"#fcf4e8"],[1,"#fefaf0"]],"lights":[{"x":0.5,"y":0.08,"r":60,"core":"#fffaf0","glow":"rgba(255,250,220,.5)","rays":true}],"particles":[{"type":"feather","count":12,"minSize":6,"maxSize":12,"minSpeed":2,"maxSpeed":4,"colors":["#ffffff","#fff8f0"]}],"name":"Heavenly Light","message":"In your presence, I feel closer to heaven than I ever thought possible ?"},
{"gradient":[[0,"#b0d0d8"],[0.35,"#c8e0e8"],[0.7,"#e0f0f0"],[1,"#f0f8f8"]],"clouds":[{"count":5,"yMin":0.1,"yMax":0.4,"minR":80,"maxR":180,"color":"#ffffff","alpha":0.45,"speed":5,"puffs":4,"evolveMs":8000}],"rainbow":true,"name":"Rainbow Sky","message":"You colour my world in a way no rainbow ever could ?"},
{"gradient":[[0,"#1a0a20"],[0.35,"#2a1040"],[0.7,"#3a1860"],[1,"#2a1040"]],"stars":{"count":130,"maxY":100,"minR":0.5,"maxR":2},"aurora":{"colors":["rgba(180,100,255,.2)","rgba(120,60,220,.18)","rgba(80,40,200,.15)"],"speed":0.03,"band":240,"thickness":220},"name":"Violet Twilight","message":"You are the violet edge of twilight, the beautiful in-between of my heart ?"},
{"gradient":[[0,"#2a3a2a"],[0.3,"#4a5a3a"],[0.6,"#6a7a5a"],[1,"#5a6a4a"]],"clouds":[{"count":4,"yMin":0.2,"yMax":0.55,"minR":100,"maxR":220,"color":"#aacaa8","alpha":0.3,"speed":3,"puffs":4,"evolveMs":10000}],"particles":[{"type":"firefly","count":20,"minY":35,"maxY":90,"minSize":2,"maxSize":3.5,"colors":["#c8ff8c","#b8f07a","#d8ff9a"]}],"name":"Forest Night","message":"In the dark of the forest, you are every light I need ?"},
{"gradient":[[0,"#a0c8d0"],[0.35,"#c0dce4"],[0.7,"#e0ecf0"],[1,"#f0f4f8"]],"clouds":[{"count":4,"yMin":0.4,"yMax":0.7,"minR":120,"maxR":260,"color":"#ffffff","alpha":0.3,"speed":2.5,"puffs":3,"evolveMs":11000}],"waves":{"colors":["rgba(200,230,240,.12)","rgba(200,230,240,.08)","rgba(200,230,240,.05)"],"horizontal":true,"baseMin":0.78,"gap":0.04,"band":8,"thickness":3,"speed":0.08},"name":"Coastal Mist","message":"You linger in my thoughts like mist over the morning coast ?"},
{"gradient":[[0,"#2a1a0a"],[0.3,"#4a2a1a"],[0.6,"#6a3a2a"],[1,"#3a2010"]],"stars":{"count":50,"maxY":75,"minR":0.5,"maxR":1.2},"lights":[{"x":0.8,"y":0.15,"r":22,"core":"#ffe8c0","glow":"rgba(255,200,100,.3)","rays":false}],"name":"Desert Star","message":"Under the desert stars, I found the courage to love you ?"},
{"gradient":[[0,"#f0f0e8"],[0.35,"#f8f8f0"],[0.7,"#fcfcf8"],[1,"#fefefc"]],"clouds":[{"count":4,"yMin":0.1,"yMax":0.5,"minR":100,"maxR":250,"color":"#e8e8e0","alpha":0.25,"speed":3,"puffs":4,"evolveMs":10000}],"lights":[{"x":0.5,"y":0.12,"r":45,"core":"#fffce0","glow":"rgba(255,255,200,.3)","rays":true}],"name":"Snow White","message":"Your love is pure and quiet, like fresh snow on a silent morning ?"},
{"gradient":[[0,"#d0a8d0"],[0.35,"#e0c0e0"],[0.7,"#f0d8f0"],[1,"#f8eaf8"]],"clouds":[{"count":4,"yMin":0.2,"yMax":0.5,"minR":90,"maxR":200,"color":"#ffffff","alpha":0.35,"speed":3,"puffs":4,"evolveMs":9000}],"stars":{"count":20,"maxY":45,"minR":0.5,"maxR":1.2},"name":"Wisteria Sky","message":"You hang in my heart like wisteria, soft and impossibly beautiful ?"},
{"gradient":[[0,"#e8a0a0"],[0.35,"#f0c0c0"],[0.7,"#f8d8d8"],[1,"#fce8e8"]],"clouds":[{"count":4,"yMin":0.15,"yMax":0.45,"minR":100,"maxR":220,"color":"#ffffff","alpha":0.35,"speed":3.5,"puffs":4,"evolveMs":9000}],"stars":{"count":15,"maxY":40,"minR":0.5,"maxR":1},"name":"Rosy Dawn","message":"You paint my mornings pink with the light of your love ?"},
{"gradient":[[0,"#0a1a2a"],[0.35,"#1a2a4a"],[0.7,"#2a3a6a"],[1,"#1a2a3a"]],"stars":{"count":110,"maxY":95,"minR":0.5,"maxR":1.8},"aurora":{"colors":["rgba(60,150,255,.2)","rgba(100,100,255,.18)","rgba(60,80,220,.15)"],"speed":0.025,"band":200,"thickness":180},"name":"Cyan Aurora","message":"You pulse through my veins like aurora light, electric and alive ?"},
{"gradient":[[0,"#e8c8a0"],[0.35,"#f0d8b8"],[0.7,"#f8e4d0"],[1,"#fcf0e4"]],"lights":[{"x":0.5,"y":0.55,"r":50,"core":"#ffe0a0","glow":"rgba(255,200,120,.45)","rays":true}],"particles":[{"type":"ember","count":10,"minR":6,"maxR":12,"minSpeed":2,"maxSpeed":5,"color":"#ffc86a"}],"name":"Candlelight","message":"You are the candle that never stops burning in the window of my soul ?"},
{"gradient":[[0,"#2a3050"],[0.35,"#4a5080"],[0.7,"#6a70a0"],[1,"#5a6080"]],"stars":{"count":100,"maxY":90,"minR":0.5,"maxR":1.8},"lights":[{"x":0.5,"y":0.4,"r":12,"core":"#ffffff","glow":"rgba(255,255,255,.1)","rays":false}],"name":"Navy Night","message":"In the deep navy of the night, your memory is my northern star ?"},
{"gradient":[[0,"#f0e0d0"],[0.4,"#f8ece0"],[0.7,"#fcf2e8"],[1,"#fef8f0"]],"lights":[{"x":0.5,"y":0.08,"r":55,"core":"#fff8e0","glow":"rgba(255,240,180,.45)","rays":true}],"clouds":[{"count":3,"yMin":0.4,"yMax":0.6,"minR":140,"maxR":260,"color":"#ffffff","alpha":0.25,"speed":2.5,"puffs":3,"evolveMs":11000}],"name":"Morning Cream","message":"Every morning with you is like the first sip of warmth ï¿½ perfect ?"},
{"gradient":[[0,"#4a3a6a"],[0.35,"#6a5a8a"],[0.7,"#8a7aaa"],[1,"#7a6a9a"]],"stars":{"count":80,"maxY":85,"minR":0.5,"maxR":1.5},"clouds":[{"count":3,"yMin":0.1,"yMax":0.3,"minR":120,"maxR":240,"color":"#b8a8d8","alpha":0.2,"speed":2.5,"puffs":3,"evolveMs":11000}],"name":"Lilac Evening","message":"You wrap around me like lilac dusk, soft and unforgettable ?"},
{"gradient":[[0,"#2a4a3a"],[0.35,"#4a6a5a"],[0.7,"#6a8a7a"],[1,"#8aaa9a"]],"clouds":[{"count":4,"yMin":0.15,"yMax":0.4,"minR":90,"maxR":200,"color":"#aacaba","alpha":0.3,"speed":4,"puffs":4,"evolveMs":9000}],"particles":[{"type":"leaf","count":18,"minSize":6,"maxSize":11,"minSpeed":2,"maxSpeed":5,"colors":["#8aba7a","#7aaa6a","#9aca8a"]}],"name":"Forest Canopy","message":"Through every layer of the forest, I would find my way back to you ?"},
{"gradient":[[0,"#f0d8e8"],[0.35,"#f8e8f0"],[0.7,"#fcf0f5"],[1,"#fef6fa"]],"clouds":[{"count":4,"yMin":0.2,"yMax":0.5,"minR":90,"maxR":200,"color":"#ffffff","alpha":0.35,"speed":3,"puffs":4,"evolveMs":9000}],"stars":{"count":20,"maxY":45,"minR":0.5,"maxR":1.2},"name":"Cotton Candy Dream","message":"You are sweeter than a dream painted in cotton candy hues ?"},
{"gradient":[[0,"#1a1a2a"],[0.3,"#2a2a4a"],[0.6,"#3a3a5a"],[1,"#2a2a3a"]],"stars":{"count":100,"maxY":90,"minR":0.5,"maxR":1.8},"lights":[{"x":0.3,"y":0.25,"r":20,"core":"#ffc0a0","glow":"rgba(255,150,100,.3)","rays":false},{"x":0.7,"y":0.2,"r":18,"core":"#a0c0ff","glow":"rgba(100,150,255,.25)","rays":false}],"name":"Binary Stars","message":"Like binary stars, we were always meant to orbit each other ?"}

,

{"gradient":[[0,"#0a0a1a"],[0.3,"#151530"],[0.6,"#1a1a3e"],[1,"#0d0d25"]],"stars":{"count":200,"maxY":100,"minR":0.4,"maxR":2},"lights":[{"x":0.5,"y":0.5,"r":6,"core":"#ffffff","glow":"rgba(255,255,255,.15)","rays":false}],"name":"Infinite Love","message":"My love for you is the only sky that has no end ?"}

];

  /* ================= MESSAGE (unchanged behaviour) ================= */
  function showSkyMessage(sky) {
    if (msgEl) { msgEl.remove(); msgEl = null; }
    msgEl = document.createElement('div');
    msgEl.id = 'skyMsg';
    msgEl.textContent = sky.message;
    document.body.appendChild(msgEl);
    setTimeout(function () { if (msgEl) msgEl.style.opacity = '0'; }, 6000);
    setTimeout(function () { if (msgEl) { msgEl.remove(); msgEl = null; } }, 8000);
  }

  /* ================= PUBLIC API ================= */
  function getTimePeriod() {
    var h = new Date().getHours();
    if (h >= 5 && h < 7) return 'dawn';
    if (h >= 7 && h < 17) return 'day';
    if (h >= 17 && h < 19) return 'sunset';
    return 'night';
  }

  function timeMatch(sky) {
    if (!sky || !sky.name) return true;
    var n = sky.name.toLowerCase();
    var period = getTimePeriod();

    // Dawn
    if (n.indexOf('sunrise')>=0 || n.indexOf('dawn')>=0 || n.indexOf('morning')>=0 || n.indexOf('creamy')>=0 || n.indexOf('rosy dawn')>=0)
      return period === 'dawn';

    // Sunset
    if (n.indexOf('sunset')>=0 || n.indexOf('dusk')>=0 || n.indexOf('twilight')>=0 || n.indexOf('golden hour')>=0 || n.indexOf('harvest')>=0 || n.indexOf('autumn sunset')>=0)
      return period === 'sunset';

    // Night
    if (n.indexOf('night')>=0 || n.indexOf('midnight')>=0 || n.indexOf('eclipse')>=0 || n.indexOf('moon')>=0 || n.indexOf('starry')>=0 ||
        (n.indexOf('star')>=0 && n.indexOf('starfall')<0) || n.indexOf('meteor')>=0 || n.indexOf('shooting')>=0 || n.indexOf('firefl')>=0 ||
        n.indexOf('campfire')>=0 || n.indexOf('candle')>=0 || n.indexOf('lantern')>=0)
      return period === 'night';
    if (sky.stars && sky.stars.count > 0) return period === 'night';

    // Day
    if (sky.lights && sky.lights.length && sky.lights[0].y < 0.35) return period === 'day';

    // Everything else (cosmic, weather, nature) — any time
    return true;
  }

  function randomTimeAppropriate() {
    var candidates = [];
    for (var i = 0; i < SKIES.length; i++) {
      if (SKIES[i] && SKIES[i].name && timeMatch(SKIES[i])) candidates.push(i);
    }
    if (!candidates.length) return Math.floor(Math.random() * SKIES.length);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function applySky(index) {
    var sky = SKIES[index];
    if (!sky) return;
    OverlayManager.swapTo(sky);
    AnimationManager.start();
    var defaultMsg = document.getElementById('defaultSkyMsg');
    if (defaultMsg) defaultMsg.style.display = 'none';
    showSkyMessage(sky);
    try { localStorage.setItem(SKY_KEY, index); } catch (e) {}
  }
  function randomSky() { window.Skies.apply(randomTimeAppropriate()); }
  function getCurrentSkyIndex() {
    try { var v = localStorage.getItem(SKY_KEY); return v !== null ? parseInt(v, 10) : -1; } catch (e) { return -1; }
  }
  function createSkyButton(container) {
    var btn = document.createElement('button');
    btn.textContent = '\uD83C\uDF26\uFE0F Change Sky';
    btn.style.cssText = 'background:rgba(255,220,160,.08);border:1px solid rgba(255,210,150,.15);color:#6b5f52;padding:.5rem 1.2rem;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.9rem;transition:all .25s;position:relative;z-index:2;';
    btn.addEventListener('mouseenter', function () { this.style.borderColor = '#ffe680'; this.style.color = '#ffe680'; });
    btn.addEventListener('mouseleave', function () { this.style.borderColor = 'rgba(255,210,150,.15)'; this.style.color = '#6b5f52'; });
    btn.addEventListener('click', randomSky);
    container.appendChild(btn);
    return btn;
  }


  window.Skies = {
    SKIES: SKIES,
    apply: applySky,
    random: randomSky,
    getCurrent: getCurrentSkyIndex,
    createButton: createSkyButton,
    getTimePeriod: getTimePeriod,
    timeMatch: timeMatch,
    randomTimeAppropriate: randomTimeAppropriate
  };

})();
