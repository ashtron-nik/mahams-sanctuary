(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('companion-dragon')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.DragonCompanion) return;

  /* ═══════════════════════ CONFIG ═══════════════════════ */
  var CHECK_MS    = 3500;
  var SPAWN_P     = 0.007;
  var SESS_MIN    = 28;
  var SESS_MAX    = 95;
  var BEH_MIN     = 2;
  var BEH_MAX     = 5;
  var MAX_FIRE    = 14;
  var STAR_N      = 4;
  var UI_PADDING  = 14;

  /* ═══════════════════════ CANVAS ═══════════════════════ */
  var canvas, ctx, W, H, DPR = 1;
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'dragonCompanionCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:45;pointer-events:none;display:none';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    onResize();
    window.addEventListener('resize', onResize);
  }
  function onResize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* ═══════════════════════ STATE CONSTANTS ═══════════════════════ */
  var FLY = 0, SLEEP = 1, SIT = 2, PERCH = 3;
  var FIRE = 4, YAWN = 5, FLAP = 6, CHASE = 7, GONE = 8;
  var STATE_DUR = [
    [4, 7],     // FLY
    [14, 28],   // SLEEP
    [7, 14],    // SIT
    [9, 18],    // PERCH
    [2, 3.5],   // FIRE
    [1.3, 2.2], // YAWN
    [2, 3],     // FLAP
    [5, 9],     // CHASE
    [0.8, 1.2]  // GONE
  ];

  /* ═══════════════════════ DRAGON ═══════════════════════ */
  var dragon = null;
  var fires = [];
  var stars = [];
  var lastT = 0, fId = null;
  var uiCache = null, uiTime = 0;

  function mkDragon(x, y) {
    var sd = SESS_MIN + Math.random() * (SESS_MAX - SESS_MIN);
    return {
      x: x, y: y, tx: W / 2, ty: H * 0.3,
      facing: 1, scale: W < 600 ? 0.65 : 0.9,
      wingPhase: 0, wingSpeed: 4, tailPhase: Math.random() * 6,
      breathPhase: 0, alpha: 0, state: FLY,
      sTime: 0, sDur: dur(FLY),
      blinkT: 2 + Math.random() * 3, blinking: false,
      sessTime: 0, sessDur: sd,
      behLeft: BEH_MIN + Math.floor(Math.random() * (BEH_MAX - BEH_MIN + 1)),
      yawnP: 0, starIdx: 0,
      destX: 0, destY: 0
    };
  }

  function dur(s) {
    var r = STATE_DUR[s];
    return r[0] + Math.random() * (r[1] - r[0]);
  }

  /* ═══════════════════════ STATE MACHINE ═══════════════════════ */
  function setState(s) {
    dragon.state = s;
    dragon.sTime = 0;
    dragon.sDur = dur(s);
    dragon.yawnP = 0;
    if (s === FLY) pickFlyTarget();
    if (s === CHASE) genStars();
    if (s === SLEEP || s === SIT || s === PERCH) dragon.wingSpeed = 0;
    else if (s === FLAP) dragon.wingSpeed = 10;
    else dragon.wingSpeed = 5;
  }

  function nextBeh() {
    dragon.behLeft--;
    if (dragon.behLeft <= 0 || dragon.sessTime >= dragon.sessDur) {
      setState(GONE); return;
    }
    var pool = [FLY, SLEEP, SIT, PERCH, FIRE, YAWN, FLAP, CHASE];
    if (dragon.state === FLY) pool = [SLEEP, SIT, PERCH, FIRE, YAWN, FLAP, CHASE];
    else if (dragon.state === SLEEP) pool = [YAWN, FLY, FLY, FLY];
    else if (dragon.state === SIT) pool = [YAWN, FLAP, FIRE, FLY, FLY];
    else if (dragon.state === PERCH) pool = [YAWN, FIRE, FLY, FLY];
    else pool = [FLY, FLY, SIT, SLEEP];
    setState(pool[Math.floor(Math.random() * pool.length)]);
  }

  /* ═══════════════════════ UI AVOIDANCE ═══════════════════════ */
  var UI_SEL = ['.toc', '.mini-player', '#jukeboxBtn', '.progress-track',
    '.to-top', '.fav-toggle-btn', '.theme-toggle-btn', '.dice-btn'];
  function getUI() {
    var now = Date.now();
    if (uiCache && now - uiTime < 3000) return uiCache;
    uiCache = [];
    UI_SEL.forEach(function (s) {
      document.querySelectorAll(s).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0)
          uiCache.push({ x: r.left - UI_PADDING, y: r.top - UI_PADDING,
            w: r.width + UI_PADDING * 2, h: r.height + UI_PADDING * 2 });
      });
    });
    uiTime = now;
    return uiCache;
  }
  function overUI(px, py, sz) {
    var rcts = getUI();
    for (var i = 0; i < rcts.length; i++) {
      var r = rcts[i];
      if (px - sz < r.x + r.w && px + sz > r.x && py - sz < r.y + r.h && py + sz > r.y) return true;
    }
    return false;
  }
  function safeXY(px, py, sz) {
    if (!overUI(px, py, sz)) return { x: px, y: py };
    var offsets = [[30, 0], [-30, 0], [0, 30], [0, -30], [40, 30], [-40, -30]];
    for (var i = 0; i < offsets.length; i++) {
      var nx = px + offsets[i][0], ny = py + offsets[i][1];
      if (!overUI(nx, ny, sz)) return { x: nx, y: ny };
    }
    return { x: px, y: py };
  }

  /* ═══════════════════════ TARGET FINDING ═══════════════════════ */
  function pickFlyTarget() {
    var margin = 80;
    var tx = margin + Math.random() * (W - margin * 2);
    var ty = 40 + Math.random() * (H - 120);
    var p = safeXY(tx, ty, 30);
    dragon.tx = p.x; dragon.ty = p.y;
  }
  function randHeading() {
    var els = [];
    document.querySelectorAll('h2, h3, h4, .accordion-header').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > 0 && r.bottom < H && r.width > 0) els.push({ el: el, r: r });
    });
    if (!els.length) return null;
    return els[Math.floor(Math.random() * els.length)];
  }
  function randUIEl() {
    var els = [];
    document.querySelectorAll('.fav-toggle-btn, .theme-toggle-btn, .dice-btn, .easter-egg-btn').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > 0 && r.bottom < H && r.width > 0) els.push({ el: el, r: r });
    });
    if (!els.length) return null;
    return els[Math.floor(Math.random() * els.length)];
  }

  /* ═══════════════════════ STARS ═══════════════════════ */
  function genStars() {
    stars = [];
    for (var i = 0; i < STAR_N; i++) {
      stars.push({
        x: 60 + Math.random() * (W - 120),
        y: 40 + Math.random() * (H - 100),
        alpha: 0, targetA: 0.9, collected: false,
        pulse: Math.random() * 6.28
      });
    }
    dragon.starIdx = 0;
  }
  function nextStarTarget() {
    var uncollected = stars.filter(function (s) { return !s.collected; });
    if (!uncollected.length) { setState(FLY); return; }
    var s = uncollected[Math.floor(Math.random() * uncollected.length)];
    dragon.tx = s.x; dragon.ty = s.y - 15;
  }

  /* ═══════════════════════ FIRE PARTICLES ═══════════════════════ */
  function spawnFire() {
    if (fires.length >= MAX_FIRE) return;
    var mx = dragon.x + dragon.facing * 32 * dragon.scale;
    var my = dragon.y - 2 * dragon.scale;
    var ang = (dragon.facing > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.5;
    var spd = 35 + Math.random() * 30;
    fires.push({
      x: mx, y: my,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 8 + Math.random() * 16,
      life: 0.4 + Math.random() * 0.4, maxLife: 0.4 + Math.random() * 0.4,
      size: 2 + Math.random() * 3,
      hue: ['#FF6633', '#FFAA33', '#FF3300', '#FFDD44'][Math.floor(Math.random() * 4)]
    });
  }

  /* ═══════════════════════ UPDATE ═══════════════════════ */
  function update(dt) {
    if (!dragon) return;
    dragon.sessTime += dt;
    dragon.sTime += dt;
    dragon.wingPhase += dt * dragon.wingSpeed;
    dragon.tailPhase += dt * 1.8;
    dragon.breathPhase += dt * 1.5;

    // blink
    dragon.blinkT -= dt;
    if (dragon.blinkT <= 0) {
      dragon.blinking = !dragon.blinking;
      dragon.blinkT = dragon.blinking ? 0.12 : 2.5 + Math.random() * 3.5;
    }

    // session timeout
    if (dragon.sessTime >= dragon.sessDur && dragon.state !== GONE) {
      setState(GONE);
    }

    switch (dragon.state) {
      case FLY:   updFly(dt);   break;
      case SLEEP: updSleep(dt); break;
      case SIT:   updSit(dt);   break;
      case PERCH: updPerch(dt); break;
      case FIRE:  updFire(dt);  break;
      case YAWN:  updYawn(dt);  break;
      case FLAP:  updFlap(dt);  break;
      case CHASE: updChase(dt); break;
      case GONE:  updGone(dt);  break;
    }

    // fire particles
    for (var i = fires.length - 1; i >= 0; i--) {
      var f = fires[i];
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vy -= 15 * dt; f.life -= dt;
      if (f.life <= 0) fires.splice(i, 1);
    }

    // stars pulse
    stars.forEach(function (s) {
      if (!s.collected) s.pulse += dt * 3;
      s.alpha += (s.targetA - s.alpha) * dt * 4;
    });
  }

  function updFly(dt) {
    var dx = dragon.tx - dragon.x, dy = dragon.ty - dragon.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    dragon.facing = dx > 0 ? 1 : -1;
    var speed = 90;
    if (dist < 8) {
      dragon.x = dragon.tx; dragon.y = dragon.ty;
      nextBeh(); return;
    }
    var vx = (dx / dist) * speed;
    var vy = (dy / dist) * speed + Math.sin(dragon.sTime * 2.5) * 12;
    dragon.x += vx * dt;
    dragon.y += vy * dt;
    dragon.alpha = Math.min(1, dragon.alpha + dt * 3);
  }

  function updSleep(dt) {
    dragon.alpha = Math.min(1, dragon.alpha + dt * 4);
    dragon.y += Math.sin(dragon.breathPhase) * 0.15;
    if (dragon.sTime >= dragon.sDur) nextBeh();
  }

  function updSit(dt) {
    dragon.alpha = Math.min(1, dragon.alpha + dt * 4);
    dragon.y += Math.sin(dragon.breathPhase * 0.7) * 0.1;
    if (dragon.sTime >= dragon.sDur) nextBeh();
  }

  function updPerch(dt) {
    dragon.alpha = Math.min(1, dragon.alpha + dt * 4);
    if (dragon.sTime >= dragon.sDur) nextBeh();
  }

  function updFire(dt) {
    dragon.alpha = Math.min(1, dragon.alpha + dt * 4);
    if (Math.random() < 0.35) spawnFire();
    dragon.x += Math.sin(dragon.sTime * 3) * 0.3;
    if (dragon.sTime >= dragon.sDur) {
      fires.length = 0;
      nextBeh();
    }
  }

  function updYawn(dt) {
    dragon.alpha = Math.min(1, dragon.alpha + dt * 4);
    dragon.yawnP = dragon.sTime < 0.4
      ? dragon.sTime / 0.4
      : dragon.sTime < dragon.sDur - 0.3 ? 1
      : Math.max(0, (dragon.sDur - dragon.sTime) / 0.3);
    if (dragon.sTime >= dragon.sDur) nextBeh();
  }

  function updFlap(dt) {
    dragon.alpha = Math.min(1, dragon.alpha + dt * 4);
    dragon.y -= Math.sin(dragon.wingPhase * 1.5) * 0.8;
    if (dragon.sTime >= dragon.sDur) nextBeh();
  }

  function updChase(dt) {
    dragon.alpha = Math.min(1, dragon.alpha + dt * 4);
    // fade in stars
    stars.forEach(function (s) { if (!s.collected) s.targetA = 0.9; });
    // fly toward current target star
    var dx = dragon.tx - dragon.x, dy = dragon.ty - dragon.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    dragon.facing = dx > 0 ? 1 : -1;
    var speed = 120;
    if (dist < 18) {
      // collect nearest uncollected star
      var collected = false;
      for (var i = 0; i < stars.length; i++) {
        if (!stars[i].collected && Math.abs(stars[i].x - dragon.x) < 25 && Math.abs(stars[i].y - dragon.y) < 25) {
          stars[i].collected = true; stars[i].targetA = 0; collected = true; break;
        }
      }
      if (!stars.filter(function (s) { return !s.collected; }).length) {
        setState(FLY); return;
      }
      nextStarTarget();
    } else {
      dragon.x += (dx / dist) * speed * dt;
      dragon.y += (dy / dist) * speed * dt + Math.sin(dragon.sTime * 4) * 6;
    }
    if (dragon.sTime >= dragon.sDur) { stars = []; setState(FLY); }
  }

  function updGone(dt) {
    dragon.alpha = Math.max(0, dragon.alpha - dt * 1.5);
    dragon.y -= dt * 20;
    if (dragon.alpha <= 0) { dragon = null; fires = []; stars = []; }
  }

  /* ═══════════════════════ DRAW ═══════════════════════ */
  function draw() {
    if (!dragon && !fires.length && !stars.length) {
      canvas.style.display = 'none'; return;
    }
    canvas.style.display = 'block';
    ctx.clearRect(0, 0, W, H);

    // draw stars
    stars.forEach(function (s) {
      if (s.alpha < 0.02) return;
      drawStar(s.x, s.y, 5 + Math.sin(s.pulse) * 1.5, s.alpha);
    });

    // draw dragon
    if (dragon) {
      ctx.save();
      ctx.globalAlpha = dragon.alpha;
      ctx.translate(dragon.x, dragon.y);
      var sc = dragon.scale;
      ctx.scale(sc * dragon.facing, sc);
      drawBody();
      ctx.restore();
    }

    // draw fire on top
    drawFires();
  }

  function drawBody() {
    var st = dragon.state;
    var wp = dragon.wingPhase;
    var isSleep = st === SLEEP;
    var isSit = st === SIT || st === PERCH;
    var isFlap = st === FLAP;
    var isFire = st === FIRE;

    // ── Tail ──
    var tailWag = Math.sin(dragon.tailPhase) * (isSleep ? 3 : 5);
    ctx.strokeStyle = '#6A4A90';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.bezierCurveTo(-28, 1 + tailWag, -38, -6 + tailWag * 0.7, -46, -2 + tailWag * 0.4);
    ctx.stroke();
    // spade tip
    ctx.fillStyle = '#7B4FA0';
    ctx.beginPath();
    ctx.moveTo(-46, -2 + tailWag * 0.4);
    ctx.lineTo(-53, -7 + tailWag * 0.3);
    ctx.lineTo(-50, -2 + tailWag * 0.4);
    ctx.lineTo(-53, 3 + tailWag * 0.5);
    ctx.closePath();
    ctx.fill();

    // ── Wings ──
    var wingUp = isSleep ? 0 : isFlap ? Math.sin(wp) * 22 : Math.sin(wp) * 16;
    var wingAlpha = isSleep ? 0.25 : 0.45;
    ctx.fillStyle = 'rgba(130,90,190,' + wingAlpha + ')';
    ctx.strokeStyle = '#7B4FA0';
    ctx.lineWidth = 1;
    // back wing
    ctx.beginPath();
    ctx.moveTo(2, -7);
    ctx.quadraticCurveTo(8, -18 - wingUp * 0.7, 20, -9 - wingUp * 0.4);
    ctx.quadraticCurveTo(10, -3, 2, -4);
    ctx.closePath();
    ctx.fill();
    // front wing
    ctx.fillStyle = 'rgba(140,100,200,' + wingAlpha + ')';
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.quadraticCurveTo(-14, -24 - wingUp, -30, -13 - wingUp * 0.6);
    ctx.quadraticCurveTo(-16, -3, -4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ── Body ──
    var bScale = 1 + Math.sin(dragon.breathPhase) * (isSleep ? 0.035 : 0.015);
    ctx.save();
    ctx.scale(bScale, bScale);
    ctx.fillStyle = '#7B4FA0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5A3A7A';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // belly
    ctx.fillStyle = '#9B6FC0';
    ctx.beginPath();
    ctx.ellipse(2, 3, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Legs (sit / perch / sleep) ──
    if (isSit || isSleep) {
      ctx.strokeStyle = '#5A3A7A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5, 10); ctx.lineTo(-7, 17);
      ctx.moveTo(5, 10); ctx.lineTo(7, 17);
      ctx.stroke();
      ctx.fillStyle = '#7B4FA0';
      ctx.beginPath(); ctx.arc(-7, 18, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(7, 18, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Head ──
    ctx.fillStyle = '#7B4FA0';
    ctx.beginPath();
    ctx.arc(24, -3, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5A3A7A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Horns ──
    ctx.fillStyle = '#6A4A90';
    ctx.beginPath();
    ctx.moveTo(18, -11); ctx.lineTo(15, -19); ctx.lineTo(20, -12);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26, -11); ctx.lineTo(24, -19); ctx.lineTo(29, -12);
    ctx.closePath(); ctx.fill();

    // ── Ear frills ──
    ctx.fillStyle = 'rgba(130,90,190,0.3)';
    ctx.beginPath();
    ctx.moveTo(16, -6); ctx.lineTo(10, -14); ctx.lineTo(17, -3);
    ctx.closePath(); ctx.fill();

    // ── Eye ──
    if (isSleep || dragon.blinking) {
      ctx.strokeStyle = '#2A1A3A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(27, -5, 3, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(27, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.arc(28, -5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(28.8, -6, 0.7, 0, Math.PI * 2);
      ctx.fill();
      // fire glow on eyes
      if (isFire) {
        ctx.fillStyle = 'rgba(255,120,40,0.25)';
        ctx.beginPath();
        ctx.arc(27, -5, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Snout ──
    ctx.fillStyle = '#8B5FB0';
    ctx.beginPath();
    ctx.ellipse(33, -1, 5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Nostrils ──
    ctx.fillStyle = '#5A3A7A';
    ctx.beginPath(); ctx.arc(35, -2, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(37, -1, 0.8, 0, Math.PI * 2); ctx.fill();

    // ── Mouth ──
    if (isFire) {
      // open mouth with glow
      ctx.fillStyle = '#4A2A6A';
      ctx.beginPath();
      ctx.ellipse(36, 1, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,100,30,0.4)';
      ctx.beginPath();
      ctx.arc(38, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (dragon.yawnP > 0.01) {
      // yawn
      var yr = dragon.yawnP * 5;
      ctx.fillStyle = '#4A2A6A';
      ctx.beginPath();
      ctx.ellipse(35, 0, yr, yr * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      if (dragon.yawnP > 0.3) {
        ctx.fillStyle = '#D47090';
        ctx.beginPath();
        ctx.ellipse(35, yr * 0.25, yr * 0.4, yr * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // subtle smile
      ctx.strokeStyle = '#5A3A7A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(34, 0, 2.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // ── Sleep Zs ──
    if (isSleep) {
      var zAlpha = 0.3 + Math.sin(dragon.sTime * 2) * 0.15;
      ctx.fillStyle = 'rgba(200,180,255,' + zAlpha + ')';
      ctx.font = '8px sans-serif';
      var zy = -20 - Math.sin(dragon.sTime * 1.2) * 5;
      ctx.fillText('z', 30, zy);
      ctx.font = '6px sans-serif';
      ctx.fillText('z', 36, zy - 8);
      ctx.font = '5px sans-serif';
      ctx.fillText('z', 40, zy - 14);
    }
  }

  function drawStar(x, y, r, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFE680';
    ctx.shadowColor = '#FFE680';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var ang = (i * Math.PI / 2) - Math.PI / 2;
      var ox = x + Math.cos(ang) * r;
      var oy = y + Math.sin(ang) * r;
      var ia = ang + Math.PI / 4;
      var ix = x + Math.cos(ia) * r * 0.35;
      var iy = y + Math.sin(ia) * r * 0.35;
      if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawFires() {
    fires.forEach(function (f) {
      var a = Math.max(0, f.life / f.maxLife);
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = f.hue;
      ctx.shadowColor = f.hue;
      ctx.shadowBlur = f.size * 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  /* ═══════════════════════ MAIN LOOP ═══════════════════════ */
  function tick(now) {
    if (!dragon && !fires.length && !stars.length) {
      canvas.style.display = 'none';
      schedule();
      return;
    }
    canvas.style.display = 'block';
    var dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    update(dt);
    draw();
    fId = requestAnimationFrame(tick);
  }

  function schedule() {
    setTimeout(function () {
      lastT = performance.now();
      maybeSpawn();
      fId = requestAnimationFrame(tick);
    }, CHECK_MS);
  }

  function maybeSpawn() {
    if (dragon) return;
    if (Math.random() > SPAWN_P) return;
    // pick entry: fly in from random edge
    var edge = Math.floor(Math.random() * 4);
    var sx, sy;
    if (edge === 0) { sx = -60; sy = 40 + Math.random() * (H * 0.4); }
    else if (edge === 1) { sx = W + 60; sy = 40 + Math.random() * (H * 0.4); }
    else if (edge === 2) { sx = 40 + Math.random() * (W - 80); sy = -60; }
    else { sx = 40 + Math.random() * (W - 80); sy = H + 60; }
    dragon = mkDragon(sx, sy);
    pickFlyTarget();
    // set initial facing
    dragon.facing = dragon.tx > sx ? 1 : -1;
  }

  /* ═══════════════════════ INIT ═══════════════════════ */
  ensureCanvas();
  schedule();

  window.DragonCompanion = {
    active: function () { return !!dragon; }
  };
})();
