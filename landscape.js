/* ===================================================================
   Landscape Module — extracted for easy customization
   Depends on: sky-living.js (SkyLiving namespace)
   Load after: sky-living.js
   =================================================================== */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('landscape')) return;

  var SL = window.SkyLiving;
  if (!SL) return;

  // Shared rendering context — set by init()
  var ctx, W, H, rand, pick, getMeta;

  // Internal state
  var data = null;

  /* ---------- public API ---------- */
  var Landscape = {

    init: function (c, w, h, r, p, gm) {
      ctx = c; W = w; H = h; rand = r; pick = p; getMeta = gm;
    },

    // Re-read W/H (called after resize)
    updateSize: function (w, h) { W = w; H = h; },

    pick: function (sky) {
      if (!sky) return null;
      var meta = getMeta(sky);
      var cat = meta ? meta.category : '';
      var n = sky.name.toLowerCase();
      if (cat === 'fantasy') return 'fantasy';
      if (cat === 'night' || cat === 'cosmic') return 'night';
      if (cat === 'day') {
        if (/sunset|dusk|twilight|golden/.test(n)) return 'sunset';
        return 'day';
      }
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
      if (/aurora/.test(n)) return 'aurora';
      if (/galaxy|cosmic|nebula|void|stardust/.test(n)) return 'cosmic';
      if (sky.gradient && sky.gradient[0]) {
        var c = sky.gradient[0][1];
        var n2 = parseInt(c.replace('#', ''), 16);
        var r = (n2 >> 16) & 255, g = (n2 >> 8) & 255, b = n2 & 255;
        if ((r + g + b) / 3 < 60) return 'night';
      }
      return 'day';
    },

    build: function (type) {
      data = null;
      if (!type || !W || !H) return;
      var gh = H * 0.19;
      var baseY = H - gh;
      var d = { type: type, gh: gh, baseY: baseY, trees: [], houses: [], flowers: [], islands: [], crystals: [], plants: [], lakeX: 0, lakeY: 0, lakeRX: 0, lakeRY: 0 };

      switch (type) {
        case 'day':
          for (var i = 0; i < 5; i++) d.trees.push({ x: rand(i * W / 5, i * W / 5 + 60), h: rand(50, 90) });
          d.houses.push({ x: W * 0.3, w: 50, hh: 55, glow: 0 });
          for (var fi = 0; fi < 12; fi++) d.flowers.push({ x: rand(0, W), y: baseY + rand(5, gh * 0.5), c: pick(['#ff6b8a', '#ffeb6b', '#ff9eb5', '#c8a8ff']), r: rand(2, 4) });
          break;
        case 'night':
          for (var ni = 0; ni < 6; ni++) d.trees.push({ x: rand(ni * W / 6, ni * W / 6 + 40), h: rand(60, 110) });
          d.houses.push({ x: W * 0.7, w: 45, hh: 50, glow: 0.7 });
          break;
        case 'sunset':
          for (var si = 0; si < 4; si++) d.trees.push({ x: rand(si * W / 4, si * W / 4 + 80), h: rand(55, 85) });
          break;
        case 'aurora':
          for (var ai = 0; ai < 7; ai++) d.trees.push({ x: rand(ai * W / 7, ai * W / 7 + 30), h: rand(70, 130) });
          d.lakeX = W * 0.4; d.lakeY = baseY + gh * 0.6; d.lakeRX = W * 0.15; d.lakeRY = gh * 0.2;
          break;
        case 'fantasy':
          for (var fi2 = 0; fi2 < 3; fi2++) {
            var fx = W * (0.2 + fi2 * 0.3), fy = baseY - rand(20, 60);
            var vines = [];
            for (var v = 0; v < 3; v++) {
              vines.push({ ox: fx + rand(-25, 25), oy: fy + 30, cx: fx + rand(-20, 20), cy: fy + 60, ex: fx + rand(-15, 15), ey: fy + rand(70, 100) });
            }
            var gfs = [];
            for (var gf = 0; gf < 5; gf++) {
              gfs.push({ x: fx + rand(-30, 30), y: fy + 40 + rand(0, 30), r: rand(3, 6), c: pick(['rgba(255,150,200,0.3)', 'rgba(200,100,255,0.3)', 'rgba(100,200,255,0.3)']) });
            }
            d.islands.push({ x: fx, y: fy, vines: vines, gfs: gfs });
          }
          break;
        case 'cosmic':
          for (var cm = 0; cm < 5; cm++) d.crystals.push({ x: W * (0.1 + cm * 0.2), h: rand(40, 100) });
          for (var gp = 0; gp < 8; gp++) d.plants.push({ x: rand(W * 0.1, W * 0.9), y: baseY + rand(5, gh * 0.5), r: rand(3, 8), c: pick(['rgba(0,255,200,0.15)', 'rgba(100,200,255,0.15)', 'rgba(200,100,255,0.15)']), gr: rand(2, 5) });
          break;
        case 'rain':
          for (var ri = 0; ri < 4; ri++) d.trees.push({ x: rand(ri * W / 4, ri * W / 4 + 60), h: rand(50, 80) });
          break;
        case 'snow':
          for (var si2 = 0; si2 < 5; si2++) d.trees.push({ x: rand(si2 * W / 5, si2 * W / 5 + 50), h: rand(50, 90) });
          break;
        case 'spring':
          for (var spi = 0; spi < 4; spi++) {
            var tx = rand(spi * W / 4, spi * W / 4 + 70), th = rand(50, 80);
            var blossoms = [];
            for (var b = 0; b < 3; b++) blossoms.push({ x: tx + rand(-15, 15), y: baseY - rand(10, 40), r: rand(8, 15) });
            d.trees.push({ x: tx, h: th, blossoms: blossoms });
          }
          break;
        case 'autumn':
          for (var ai2 = 0; ai2 < 5; ai2++) d.trees.push({ x: rand(ai2 * W / 5, ai2 * W / 5 + 50), h: rand(50, 85) });
          break;
        case 'fog':
          break;
      }
      data = d;
    },

    draw: function (t) {
      if (!data || !W || !H) return;
      var gh = data.gh, baseY = data.baseY;
      ctx.save();

      function hills(color, count, amp, freq, offset) {
        ctx.beginPath(); ctx.moveTo(0, H);
        for (var i = 0; i <= W; i += 4) {
          var h = 0;
          for (var k = 0; k < count; k++) {
            h += Math.sin((i + offset + k * 200) * freq * (k + 1)) * amp / (k + 1);
          }
          ctx.lineTo(i, baseY + gh * 0.3 - h);
        }
        ctx.lineTo(W, H); ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
      }
      function drawTree(x, base, treeH, color) {
        ctx.fillStyle = color;
        for (var ti = 0; ti < 3; ti++) {
          ctx.beginPath();
          var tw = (0.08 + ti * 0.09) * treeH;
          var yT = base - treeH + ti * treeH * 0.28;
          var yB = base - (1 - ti * 0.14) * treeH * 0.35;
          if (ti === 0) { yT = base - treeH; yB = base - treeH * 0.35; }
          if (ti === 2) yB = base - treeH * 0.12;
          ctx.moveTo(x, yT);
          ctx.lineTo(x - tw, yB);
          ctx.lineTo(x + tw, yB);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(x - 2, base - treeH * 0.35, 4, treeH * 0.35);
      }
      function drawHouse(x, base, w, hh, color, glow) {
        ctx.fillStyle = color;
        ctx.fillRect(x - w / 2, base - hh, w, hh);
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - 4, base - hh);
        ctx.lineTo(x, base - hh - hh * 0.4);
        ctx.lineTo(x + w / 2 + 4, base - hh);
        ctx.closePath(); ctx.fill();
        if (glow) {
          ctx.fillStyle = 'rgba(255,220,100,' + glow + ')';
          ctx.fillRect(x - w * 0.12, base - hh * 0.55, w * 0.08, hh * 0.12);
          ctx.fillRect(x + w * 0.04, base - hh * 0.55, w * 0.08, hh * 0.12);
        }
      }

      var tOff = (t || 0) * 0.008;

      switch (data.type) {
        case 'day':
          hills('rgba(60,110,50,0.4)', 3, 40, 0.003, tOff);
          hills('rgba(80,140,60,0.35)', 2, 25, 0.005, tOff + 50);
          data.trees.forEach(function (tr) { drawTree(tr.x, baseY + 10, tr.h, 'rgba(50,100,40,0.5)'); });
          data.houses.forEach(function (h) { drawHouse(h.x, baseY + 8, h.w, h.hh, 'rgba(160,130,100,0.5)', h.glow); });
          data.flowers.forEach(function (fl) { ctx.fillStyle = fl.c; ctx.beginPath(); ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2); ctx.fill(); });
          break;
        case 'night':
          hills('rgba(15,10,25,0.6)', 4, 35, 0.0025, tOff);
          hills('rgba(25,18,35,0.5)', 3, 20, 0.004, tOff + 40);
          data.trees.forEach(function (tr) { drawTree(tr.x, baseY + 8, tr.h, 'rgba(10,8,15,0.7)'); });
          data.houses.forEach(function (h) { drawHouse(h.x, baseY + 5, h.w, h.hh, 'rgba(30,22,35,0.6)', h.glow); });
          break;
        case 'sunset':
          hills('rgba(100,50,30,0.45)', 3, 30, 0.003, tOff);
          hills('rgba(130,70,40,0.35)', 2, 20, 0.005, tOff + 60);
          data.trees.forEach(function (tr) { drawTree(tr.x, baseY + 8, tr.h, 'rgba(60,30,20,0.5)'); });
          break;
        case 'aurora':
          hills('rgba(25,45,55,0.5)', 3, 30, 0.003, tOff);
          hills('rgba(35,55,65,0.4)', 2, 18, 0.005, tOff + 30);
          data.trees.forEach(function (tr) { drawTree(tr.x, baseY + 8, tr.h, 'rgba(30,50,60,0.6)'); });
          ctx.fillStyle = 'rgba(150,200,255,0.08)';
          ctx.beginPath();
          ctx.ellipse(data.lakeX, data.lakeY, data.lakeRX, data.lakeRY, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'fantasy':
          data.islands.forEach(function (isl) {
            ctx.fillStyle = 'rgba(160,120,200,0.2)';
            ctx.beginPath(); ctx.ellipse(isl.x, isl.y + 20, 60, 18, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(120,80,180,0.15)';
            ctx.beginPath(); ctx.ellipse(isl.x - 10, isl.y + 28, 40, 12, 0, 0, Math.PI * 2); ctx.fill();
            isl.vines.forEach(function (vin) {
              ctx.strokeStyle = 'rgba(100,180,80,0.2)'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(vin.ox, vin.oy); ctx.quadraticCurveTo(vin.cx, vin.cy, vin.ex, vin.ey); ctx.stroke();
            });
            ctx.fillStyle = 'rgba(150,100,200,0.25)';
            ctx.beginPath(); ctx.moveTo(isl.x, isl.y - 30); ctx.lineTo(isl.x - 15, isl.y + 5); ctx.lineTo(isl.x + 15, isl.y + 5); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(200,150,255,0.1)';
            ctx.beginPath(); ctx.arc(isl.x, isl.y - 35, 20, 0, Math.PI * 2); ctx.fill();
            isl.gfs.forEach(function (gf2) { ctx.fillStyle = gf2.c; ctx.beginPath(); ctx.arc(gf2.x, gf2.y, gf2.r, 0, Math.PI * 2); ctx.fill(); });
          });
          break;
        case 'cosmic':
          hills('rgba(15,5,30,0.5)', 4, 25, 0.003, tOff);
          data.crystals.forEach(function (cr) {
            ctx.fillStyle = 'rgba(100,60,180,0.2)';
            ctx.beginPath(); ctx.moveTo(cr.x, baseY + gh * 0.3); ctx.lineTo(cr.x - 20, baseY + 10); ctx.lineTo(cr.x, baseY - cr.h); ctx.lineTo(cr.x + 20, baseY + 10); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(150,100,255,0.08)';
            ctx.beginPath(); ctx.moveTo(cr.x, baseY - cr.h + 10); ctx.lineTo(cr.x - 8, baseY + 5); ctx.lineTo(cr.x - 3, baseY + 5); ctx.lineTo(cr.x, baseY - cr.h + 20); ctx.closePath(); ctx.fill();
          });
          data.plants.forEach(function (pl) {
            ctx.fillStyle = pl.c;
            ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowColor = '#8080ff'; ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(200,200,255,0.05)';
            ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.gr, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          });
          break;
        case 'rain':
          hills('rgba(20,18,25,0.5)', 3, 25, 0.003, tOff);
          data.trees.forEach(function (tr) { drawTree(tr.x, baseY + 5, tr.h, 'rgba(15,12,20,0.5)'); });
          break;
        case 'snow':
          hills('rgba(200,210,220,0.3)', 3, 20, 0.003, tOff);
          hills('rgba(220,230,240,0.2)', 2, 12, 0.005, tOff + 50);
          data.trees.forEach(function (tr) { drawTree(tr.x, baseY + 5, tr.h, 'rgba(200,210,220,0.25)'); });
          break;
        case 'spring':
          hills('rgba(80,140,70,0.35)', 3, 30, 0.003, tOff);
          hills('rgba(100,170,80,0.25)', 2, 18, 0.005, tOff + 40);
          data.trees.forEach(function (tr) {
            drawTree(tr.x, baseY + 8, tr.h, 'rgba(60,120,50,0.4)');
            tr.blossoms.forEach(function (bl) { ctx.fillStyle = 'rgba(255,180,200,0.15)'; ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r, 0, Math.PI * 2); ctx.fill(); });
          });
          break;
        case 'autumn':
          hills('rgba(120,70,30,0.4)', 3, 28, 0.003, tOff);
          hills('rgba(150,90,40,0.3)', 2, 16, 0.005, tOff + 50);
          data.trees.forEach(function (tr) { drawTree(tr.x, baseY + 6, tr.h, 'rgba(100,50,20,0.4)'); });
          break;
        case 'fog':
          hills('rgba(60,60,70,0.25)', 3, 20, 0.003, tOff);
          break;
      }
      ctx.restore();
    }
  };

  // Register
  SL.Landscape = Landscape;

  // If canvas already exists, replay the init and build landscape for current sky
  if (SL._ctx) {
    Landscape.init(SL._ctx, SL._W(), SL._H(), SL._rand, SL._pick, SL._getMeta);
    var lt = SL._landscapeType;
    if (lt) Landscape.build(lt);
  }
})();
