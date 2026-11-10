/**
 * firefly-jar.js — Standalone firefly catching system.
 * Syncs firefly count to shared ash-obs key for global access.
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('firefly-jar')) return;

  var KEY = 'ash-firefly-jar';
  var OBS_KEY = 'ash-obs';
  var config = {};
  try { config = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { config = {}; }
  if (!config.fireflies) config.fireflies = { caught: 0 };
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(config)); } catch (e) {}
    try {
      var obs = JSON.parse(localStorage.getItem(OBS_KEY)) || {};
      if (!obs.fireflies) obs.fireflies = { caught: 0 };
      obs.fireflies.caught = config.fireflies.caught;
      localStorage.setItem(OBS_KEY, JSON.stringify(obs));
    } catch (e) {}
  }

  function toast(msg, bg, dur) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:18rem;left:50%;transform:translateX(-50%);background:'+(bg||'rgba(255,230,100,0.85)')+';color:#181214;padding:8px 18px;border-radius:20px;font-size:14px;z-index:999999;pointer-events:none;transition:opacity 0.5s;opacity:1;';
    document.body.appendChild(t);
    setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 500); }, dur || 2000);
  }

  var JAR_SVG = '<svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="0" width="16" height="4" rx="1" fill="#b8860b"/><rect x="4" y="4" width="20" height="2" rx="1" fill="#daa520"/><path d="M4 6C4 6 2 10 2 18C2 24 6 28 14 28C22 28 26 24 26 18C26 10 24 6 24 6H4Z" fill="rgba(255,230,100,0.15)" stroke="#daa520" stroke-width="1.5"/><ellipse cx="14" cy="20" rx="3" ry="4" fill="rgba(255,230,100,0.6)"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/></ellipse></svg>';
  var FIREFLY_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="8" cy="10" rx="2" ry="3" fill="#2a1a00"/><ellipse cx="8" cy="10" rx="1.5" ry="2.5" fill="#3d2b00"/><circle cx="8" cy="12" r="2.5" fill="%GLOW%"><animate attributeName="r" values="2;3;2" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/></circle><ellipse cx="5.5" cy="7" rx="2.5" ry="1.5" fill="rgba(200,220,255,0.35)" transform="rotate(-20 5.5 7)"/><ellipse cx="10.5" cy="7" rx="2.5" ry="1.5" fill="rgba(200,220,255,0.35)" transform="rotate(20 10.5 7)"/><circle cx="7" cy="8.5" r="0.5" fill="#111"/><circle cx="9" cy="8.5" r="0.5" fill="#111"/></svg>';

  function makeFireflySVG() {
    var hue = 40 + Math.random() * 20;
    return FIREFLY_SVG.replace('%GLOW%', 'hsl(' + hue + ',100%,60%)');
  }

  var jar = document.createElement('div');
  jar.id = 'obsFireflyJar';
  jar.title = 'Firefly Jar';
  jar.style.cssText = 'position:fixed;bottom:235px;right:25px;z-index:100;cursor:pointer;transition:all 0.5s;text-align:center;display:none;';
  jar.innerHTML = JAR_SVG + '<div style="font-size:9px;color:#ffe680;opacity:0.5;line-height:1;margin-top:-2px;">\uD83E\uDD8B</div>';
  document.body.appendChild(jar);

  function getButterflyCount() {
    try { var d = JSON.parse(localStorage.getItem('ash-butterflies')); if (d && d.discovered) return Object.keys(d.discovered).length; } catch(e){}
    return 0;
  }

  function showJarIfNeeded() {
    if (config.fireflies.caught > 0 || getButterflyCount() > 0) {
      jar.style.display = '';
    }
  }

  jar.addEventListener('click', function () {
    var fc = config.fireflies.caught || 0;
    var bc = getButterflyCount();
    toast('\u2728 Fireflies: ' + fc + '  |  \uD83E\uDD8B Butterflies: ' + bc + '/24', 'rgba(255,230,100,0.8)', 3000);
  });

  function updateJar() {
    var count = config.fireflies.caught || 0;
    var bright = Math.min(1, count / 15);
    jar.style.filter = 'drop-shadow(0 0 ' + (3 + bright * 12) + 'px rgba(255,230,100,' + (0.2 + bright * 0.6) + ')) brightness(' + (0.8 + bright * 0.4) + ')';
  }

  setInterval(function () {
    if (Math.random() > 0.30) return;
    var startX = 5 + Math.random() * 90;
    var startY = 10 + Math.random() * 60;
    var ff = document.createElement('div');
    ff.innerHTML = makeFireflySVG();
    ff.style.cssText = 'position:fixed;z-index:9995;pointer-events:auto;cursor:pointer;opacity:0.85;transition:opacity 0.8s ease;will-change:transform;filter:drop-shadow(0 0 4px rgba(255,230,100,0.6));';
    ff.style.left = startX + 'vw';
    ff.style.top = startY + 'vh';
    document.body.appendChild(ff);
    var rect = ff.getBoundingClientRect();
    ff.style.left = rect.left + 'px';
    ff.style.top = rect.top + 'px';
    ff.style.transition = 'left 3s ease-in-out, top 3s ease-in-out, opacity 0.8s ease';
    var drift = setInterval(function () {
      if (!ff.parentNode) { clearInterval(drift); return; }
      var curLeft = parseFloat(ff.style.left) || 0;
      var curTop = parseFloat(ff.style.top) || 0;
      ff.style.left = Math.max(20, Math.min(window.innerWidth - 40, curLeft + (Math.random() - 0.5) * 120)) + 'px';
      ff.style.top = Math.max(20, Math.min(window.innerHeight - 40, curTop + (Math.random() - 0.5) * 80)) + 'px';
    }, 2500);
    ff.addEventListener('click', function () {
      clearInterval(drift);
      config.fireflies.caught = (config.fireflies.caught || 0) + 1;
      save();
      updateJar();
      showJarIfNeeded();
      toast('Caught! (' + config.fireflies.caught + ')', 'rgba(255,230,100,0.7)', 1200);
      if (window.Interactions) window.Interactions.record('catch', 'firefly_caught');
      ff.style.transform = 'scale(2.5)';
      ff.style.opacity = '0';
      setTimeout(function () { if (ff.parentNode) ff.remove(); }, 400);
    });
    setTimeout(function () {
      if (!ff.parentNode) return;
      clearInterval(drift);
      ff.style.opacity = '0';
      setTimeout(function () { if (ff.parentNode) ff.remove(); }, 1000);
    }, 12000);
  }, 3000);

  // ponytail: cursor swarm — a few fireflies that drift toward the pointer.
  // Cheap lerp + orbit, pointer-events none so it never blocks clicks.
  (function initCursorSwarm() {
    var flies = [];
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2, moved = false;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY; moved = true;
    }, { passive: true });
    for (var i = 0; i < 6; i++) {
      var el = document.createElement('div');
      el.innerHTML = makeFireflySVG();
      el.style.cssText = 'position:fixed;z-index:9994;pointer-events:none;will-change:transform;filter:drop-shadow(0 0 4px rgba(255,230,100,0.5));';
      document.body.appendChild(el);
      flies.push({ el: el, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, o: Math.random() * Math.PI * 2, s: 0.03 + Math.random() * 0.04 });
    }
    function step() {
      for (var i = 0; i < flies.length; i++) {
        var f = flies[i];
        f.x += (tx - f.x) * f.s;
        f.y += (ty - f.y) * f.s;
        f.o += 0.05;
        f.x += Math.sin(f.o) * 0.6;
        f.y += Math.cos(f.o * 0.8) * 0.6;
        f.el.style.transform = 'translate(' + f.x + 'px,' + f.y + 'px) scale(' + (0.7 + 0.3 * Math.sin(f.o * 2)) + ')';
        f.el.style.opacity = String(0.35 + 0.3 * Math.sin(f.o * 1.5 + i));
      }
      requestAnimationFrame(step);
    }
    var idle = setInterval(function () { if (moved) { clearInterval(idle); step(); } }, 500);
  })();

  updateJar();
  showJarIfNeeded();
  window._obsFireflyJar = { updateJar: updateJar, getConfig: function () { return config; } };
})();
