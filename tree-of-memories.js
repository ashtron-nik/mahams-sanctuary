/**
 * tree-of-memories.js — A magical tree that grows with every visit.
 * Scans existing localStorage for all achievements across the site,
 * renders a fractal tree with branches, blossoms, glowing leaves,
 * hanging lanterns, birds, butterflies, flowers, roots, and particles.
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('tree-of-memories')) return;

  var TREE_KEY = 'ash-tree-of-memories';
  var treeData;
  function load() {
    try { treeData = JSON.parse(localStorage.getItem(TREE_KEY)) || {}; } catch (e) { treeData = {}; }
    if (!treeData.growth) treeData = { growth: 0, lastScan: 0, visits: 0, firstVisit: Date.now() };
  }
  function save() { try { localStorage.setItem(TREE_KEY, JSON.stringify(treeData)); } catch (e) {} }

  /* ---------- Growth scanner ---------- */
  function scanAchievements() {
    var pts = 0;
    try {
      var obs = JSON.parse(localStorage.getItem('ash-obs')) || {};
      if (obs.fireflies) pts += (obs.fireflies.caught || 0);
      if (obs.wishes) pts += obs.wishes.length * 3;
      if (obs.balloonNotes) pts += obs.balloonNotes.length * 3;
      if (obs.fragments) pts += obs.fragments.length * 2;
      if (obs.feathers) pts += (obs.feathers.count || 0) * 2;
      if (obs.moonClicks) pts += Math.min(obs.moonClicks, 20);
      if (obs.luckyStar && obs.luckyStar.found) pts += 5;
      if (obs.coffeeAt && obs.coffeeAt > 0) pts += 3;
      if (obs.recent) pts += Math.min(obs.recent.length, 30) * 2;
      if (obs.favorites) pts += obs.favorites.length * 2;
    } catch (e) {}
    try {
      var lanterns = parseInt(localStorage.getItem('ash-lanterns-released') || '0');
      pts += lanterns * 2;
    } catch (e) {}
    try {
      var wishes = JSON.parse(localStorage.getItem('ash-wish-journal')) || [];
      pts += wishes.length * 2;
    } catch (e) {}
    try {
      var skies = JSON.parse(localStorage.getItem('ash-sky-visited')) || [];
      pts += skies.length * 3;
    } catch (e) {}
    try {
      var journal = JSON.parse(localStorage.getItem('ash-sky-journal')) || {};
      pts += Object.keys(journal).length * 2;
    } catch (e) {}
    try {
      var eggs = JSON.parse(localStorage.getItem('ash-sky-eggs')) || {};
      pts += Object.keys(eggs).length * 3;
    } catch (e) {}
    try {
      var favs = JSON.parse(localStorage.getItem('ash-favorites')) || [];
      pts += favs.length;
    } catch (e) {}
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('ash-viewed-') === 0) {
          var count = parseInt(localStorage.getItem(k + '_count') || '0');
          pts += count * 2;
        }
      }
    } catch (e) {}
    try {
      var bd = JSON.parse(localStorage.getItem('ash-butterflies'));
      if (bd && bd.discovered) pts += Object.keys(bd.discovered).length * 3;
    } catch (e) {}
    // Solved / attempted treasure-hunt riddles
    try {
      var pp = JSON.parse(localStorage.getItem('ash-puzzle-progress')) || {};
      pts += Math.min(Object.keys(pp).length, 50) * 2;
    } catch (e) {}
    // Secret letters found
    try {
      var sl = JSON.parse(localStorage.getItem('ash-secret-letters')) || {};
      pts += Math.min(Object.keys(sl).length, 30) * 3;
    } catch (e) {}
    // Daily streak
    try {
      var st = JSON.parse(localStorage.getItem('ash-streak')) || {};
      pts += Math.min(st.count || 0, 30) * 5;
    } catch (e) {}
    // Sections read
    try {
      var sv = JSON.parse(localStorage.getItem('ash-section-viewed')) || {};
      pts += Math.min(Object.keys(sv).length, 30) * 2;
    } catch (e) {}
    // Songs played
    try {
      var ms = JSON.parse(localStorage.getItem('musicState')) || {};
      pts += Math.min(ms.played || 0, 20);
    } catch (e) {}
    // Dreams completed
    try {
      var dr = JSON.parse(localStorage.getItem('ash-dream')) || {};
      pts += Math.min(dr.completed || 0, 5) * 5;
    } catch (e) {}
    // Photos uploaded (admin gallery + her uploads)
    try {
      var gl = JSON.parse(localStorage.getItem('ash-gallery')) || [];
      pts += Math.min(gl.length, 20);
    } catch (e) {}
    try {
      var ug = JSON.parse(localStorage.getItem('ash-user-gallery')) || [];
      pts += Math.min(ug.length, 20);
    } catch (e) {}
    if (treeData.visits > 1) pts += Math.min(treeData.visits - 1, 10) * 5;
    return pts;
  }

  function getLevel(g) {
    if (g >= 750) return 12; if (g >= 550) return 11; if (g >= 400) return 10;
    if (g >= 300) return 9; if (g >= 200) return 8; if (g >= 150) return 7;
    if (g >= 100) return 6; if (g >= 75) return 5; if (g >= 50) return 4;
    if (g >= 30) return 3; if (g >= 15) return 2; if (g >= 5) return 1; return 0;
  }
  function getLevelLabel(l) {
    var a = ['Sprout','Sapling','Young Tree','Blooming Tree','Glowing Tree','Ornamental Tree','Mature Tree','Majestic Tree','Ancient Tree','Ethereal Tree','Sapphire Tree','Starlight Tree','Mythic Tree'];
    return a[l] || 'Mythic Tree';
  }

  /* ---------- Canvas renderer ---------- */
  function isDay() {
    try { return localStorage.getItem('ash-theme') === 'day'; } catch (e) { return false; }
  }
  function palette() {
    if (isDay()) {
      return {
        trunk: ['#7a5533', '#6b4423'], leaves: ['#3f9444', '#58b35c', '#74c96f'],
        root: '#5a3a1a', grass: ['#4a9a2e', '#5cb43f', '#3a7a1e'], string: '#9a7a45',
        glow: 'rgba(255,220,120,0.2)', bg: 'rgba(255,248,235,0.3)', label: '#8a6a20'
      };
    }
    return {
      trunk: ['#5c3d24', '#4a2f1a'], leaves: ['#2d6b30', '#3a8a3e', '#4ca64f'],
      root: '#3a2210', grass: ['#2d5a1e', '#3a7a2e', '#1d4a10'], string: '#8a6a3a',
      glow: 'rgba(255,230,100,0.15)', bg: 'rgba(10,8,6,0.3)', label: '#ffe680'
    };
  }
  function renderTree(canvas, level) {
    var ctx = canvas.getContext('2d');
    var W = 100, H = 140;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    var pal = palette();

    var trunkH = 25 + level * 8;
    var trunkW = 2.5 + level * 0.5;
    var depth = Math.min(2 + Math.floor(level * 0.6), 7);
    var blossomLv = level >= 3;
    var glowLv = level >= 4;
    var ornamentLv = level >= 5;
    var birdLv = level >= 6;
    var rootLv = level >= 3;
    var particleLv = level >= 5;

    function branch(x, y, len, ang, w, d) {
      if (d <= 0 || len < 2) return;
      var ex = x + Math.cos(ang) * len;
      var ey = y - Math.sin(ang) * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
      ctx.strokeStyle = d > 2 ? pal.trunk[0] : pal.trunk[1];
      ctx.lineWidth = Math.max(0.5, w);
      ctx.lineCap = 'round';
      ctx.stroke();

      if (d === 1 || (d <= 2 && len < 10)) {
        var lr = 2 + level * 0.5 + Math.random() * 2;
        ctx.beginPath(); ctx.arc(ex+(Math.random()-0.5)*4, ey+(Math.random()-0.5)*4, lr, 0, Math.PI*2);
        ctx.fillStyle = pal.leaves[level%3];
        if (glowLv) { ctx.shadowColor = 'rgba(200,255,150,0.3)'; ctx.shadowBlur = 8+level; }
        ctx.fill();

        if (blossomLv && Math.random() < 0.25+level*0.03) {
          ctx.beginPath(); ctx.arc(ex+(Math.random()-0.5)*4, ey+(Math.random()-0.5)*4, lr*0.7, 0, Math.PI*2);
          ctx.fillStyle = '#ff8eb4';
          ctx.shadowColor = 'rgba(255,142,180,0.4)'; ctx.shadowBlur = 6;
          ctx.fill();
        }

        // hanging lantern (ornament)
        if (ornamentLv && Math.random() < 0.12) {
          var ox = ex+(Math.random()-0.5)*4, oy = ey+lr+4;
          // string
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ox, oy); ctx.strokeStyle = pal.string; ctx.lineWidth = 0.5; ctx.stroke();
          // lantern body
          ctx.beginPath(); ctx.arc(ox, oy, 2+Math.random()*1.5, 0, Math.PI*2);
          var cs = ['#ffe680','#ff8eb4','#e85d3a','#ffd700','#c0a0ff','#66ddff'];
          ctx.fillStyle = cs[Math.floor(Math.random()*cs.length)];
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fill();
          // inner glow
          ctx.beginPath(); ctx.arc(ox, oy, 1, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,255,220,0.6)'; ctx.fill();
        }

        // butterfly resting
        if (blossomLv && Math.random() < 0.06) {
          var bx = ex+(Math.random()-0.5)*6, by = ey-lr-3;
          // wings
          ctx.save();
          ctx.translate(bx, by);
      var sc = 0.4 + Math.random() * 0.4;
      ctx.scale(sc, sc);
      var c1 = ['#ff8eb4','#ffe680','#c0a0ff','#66ddff','#ff9966'][Math.floor(Math.random()*5)];
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.ellipse(-1.5, 0, 2, 1.5, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(1.5, 0, 2, 1.5, 0.3, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#2a1a00'; ctx.fillRect(-0.3, -1.5, 0.6, 3);
          ctx.restore();
        }

        ctx.shadowBlur = glowLv ? 20+level*5 : 0;
        ctx.shadowColor = pal.glow;
        return;
      }

      var childCount = 2 + (d > 3 && Math.random() < 0.4 ? 1 : 0);
      var spread = 0.4 + Math.random() * 0.3;
      var childLen = len * (0.6 + Math.random() * 0.15);
      for (var i = 0; i < childCount; i++)
        branch(ex, ey, childLen, ang+(i-(childCount-1)/2)*spread+(Math.random()-0.5)*0.2, w*0.65, d-1);
    }

    // roots
    if (rootLv) {
      ctx.strokeStyle = pal.root; ctx.lineWidth = 1.5;
      for (var r = 0; r < 2+level; r++) {
        var rx = W/2+(Math.random()-0.5)*16;
        ctx.beginPath(); ctx.moveTo(rx, H);
        ctx.lineTo(rx+(Math.random()-0.5)*25, H-10-Math.random()*12); ctx.stroke();
      }
    }

    ctx.shadowBlur = glowLv ? 20+level*5 : 0;
    ctx.shadowColor = pal.glow;
    branch(W/2, H, trunkH, Math.PI/2, trunkW, depth);

    // bird in branches
    if (birdLv && Math.random() < 0.4) {
      var bx = 25+Math.random()*50, by = 40+Math.random()*60;
      ctx.fillStyle = '#4a3a2a';
      ctx.beginPath(); ctx.ellipse(bx, by, 5, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx-4, by-1, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8a6a3a';
      ctx.beginPath(); ctx.ellipse(bx+2, by-2, 2, 1.5, -0.3, 0, Math.PI*2); ctx.fill(); // wing
    }

    // magical particles
    if (particleLv) {
      for (var p = 0; p < 6+level; p++) {
        var px = Math.random() * W, py = Math.random() * H;
        ctx.beginPath(); ctx.arc(px, py, 1+Math.random()*1.5, 0, Math.PI*2);
        ctx.fillStyle = ['rgba(255,230,100,0.6)','rgba(255,142,180,0.5)','rgba(200,220,255,0.4)'][p%3];
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4; ctx.fill();
      }
    }

    // grass at base
    for (var g = 0; g < 5+level*2; g++) {
      var gx = 20+Math.random()*(W-40);
      ctx.beginPath(); ctx.moveTo(gx, H);
      ctx.quadraticCurveTo(gx-2+(Math.random()-0.5)*4, H-6-Math.random()*8, gx+(Math.random()-0.5)*2, H);
      ctx.fillStyle = pal.grass[g%3];
      ctx.fill();
    }
  }

  /* ---------- UI ---------- */
  function createUI() {
    var pal = palette();
    var c = document.createElement('canvas');
    c.width = 100; c.height = 140;
    c.style.cssText = 'position:fixed;bottom:80px;right:87px;z-index:99998;border-radius:10px;cursor:pointer;background:' + pal.bg + ';backdrop-filter:blur(4px);transition:transform 0.3s,box-shadow 0.3s;';
    c.id = 'treeCanvas';
    c.addEventListener('mouseenter', function(){ c.style.transform='scale(1.05)'; c.style.boxShadow='0 0 20px rgba(255,230,100,0.2)'; });
    c.addEventListener('mouseleave', function(){ c.style.transform='scale(1)'; c.style.boxShadow='none'; });

    var label = document.createElement('div');
    label.id = 'treeLabel';
    label.style.cssText = 'position:fixed;bottom:230px;right:87px;z-index:99998;font-size:11px;color:#ffe680;font-family:inherit;text-align:center;pointer-events:none;text-shadow:0 0 6px rgba(0,0,0,0.8);opacity:0;transition:opacity 0.5s;';

    document.body.appendChild(label);
    document.body.appendChild(c);
    return { canvas: c, label: label };
  }

  function updateLabel(el, level) {
    var icons = ['🌱','🌿','🌳','🌸','✨','🏮','🌳','👑','🌟','🌀','💠','☄️','🌌'];
    el.textContent = (icons[level]||'🌳')+' Lv.'+level;
    el.style.color = palette().label;
    el.style.opacity = '1';
  }

  function sleepAndDreamAchieved() {
    var hasDream = false, hasSleep = false;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('ash-viewed-') !== 0) continue;
        if (k.indexOf('dream') !== -1 && k.indexOf('make') === -1) hasDream = true;
        if (k.indexOf('make_her_sleep') !== -1) hasSleep = true;
      }
    } catch (e) {}
    return hasDream && hasSleep;
  }

  function init() {
    load();
    treeData.visits = (treeData.visits||0)+1;
    save();
    treeData.growth = scanAchievements(); treeData.lastScan = Date.now(); save();

    var ui = createUI();
    if (!sleepAndDreamAchieved()) {
      ui.canvas.style.display = 'none';
      ui.label.style.display = 'none';
    }
    var level = getLevel(treeData.growth);
    renderTree(ui.canvas, level);
    updateLabel(ui.label, level);

    var statsOverlay = null;
    ui.canvas.addEventListener('click', function() {
      if (statsOverlay) { statsOverlay.remove(); statsOverlay = null; return; }
      var lv = getLevel(treeData.growth);
      statsOverlay = document.createElement('div');
      statsOverlay.style.cssText = 'position:fixed;bottom:245px;right:87px;z-index:99999;background:rgba(10,8,6,0.85);backdrop-filter:blur(8px);border:1px solid rgba(255,230,100,0.2);border-radius:12px;padding:12px 16px;color:#ffebd2;font-size:12px;max-width:190px;line-height:1.5;';
      statsOverlay.innerHTML = '<div style="font-weight:bold;color:#ffe680;margin-bottom:4px;">\uD83C\uDF33 Tree of Memories</div>' +
        '<div>Level '+lv+' — '+getLevelLabel(lv)+'</div>' +
        '<div>Growth: '+treeData.growth+' pts</div>' +
        '<div style="font-size:11px;color:#a09080;margin-top:4px;">'+treeData.visits+' visits</div>';
      document.body.appendChild(statsOverlay);
    });

    // Keep the tree alive: reveal when earned, rescale as memories grow
    setInterval(function() {
      if (!sleepAndDreamAchieved()) return;
      var c = document.getElementById('treeCanvas');
      var l = document.getElementById('treeLabel');
      if (c && c.style.display === 'none') { c.style.display = ''; l.style.display = ''; }
      treeData.growth = scanAchievements(); treeData.lastScan = Date.now(); save();
      var lv = getLevel(treeData.growth);
      renderTree(ui.canvas, lv);
      updateLabel(ui.label, lv);
    }, 10000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 500); });
  else setTimeout(init, 500);

  window.TreeOfMemories = {
    refresh: function() {
      treeData.growth = scanAchievements(); save();
      var lv = getLevel(treeData.growth);
      var c = document.getElementById('treeCanvas');
      var l = document.getElementById('treeLabel');
      if (c) renderTree(c, lv); if (l) updateLabel(l, lv);
    },
    reveal: function() {
      var c = document.getElementById('treeCanvas');
      var l = document.getElementById('treeLabel');
      if (c) { c.style.display = ''; renderTree(c, getLevel(treeData.growth)); }
      if (l) { l.style.display = ''; updateLabel(l, getLevel(treeData.growth)); }
    },
    getGrowth: function(){ return treeData ? treeData.growth : 0; },
    getLevel: function(){ return treeData ? getLevel(treeData.growth) : 0; },
    addPoints: function(n) {
      treeData.growth += n; save();
      var lv = getLevel(treeData.growth);
      var c = document.getElementById('treeCanvas');
      var l = document.getElementById('treeLabel');
      if (c) renderTree(c, lv); if (l) updateLabel(l, lv);
    }
  };
})();
