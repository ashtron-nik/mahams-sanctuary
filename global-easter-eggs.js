/* ---- Secret door: type "ash" (exact lowercase) anywhere → for-tonight.html ---- */
var ASH_SECRET = (function () {
  var ASH = 'ash';
  var TIMEOUT = 1800;

  // pure state machine: returns { buf, last, fired }
  function step(state, now, key) {
    var s = { buf: state.buf, last: state.last, fired: state.fired };
    if (s.fired) return s;
    var exp = ASH.charAt(s.buf.length);
    if (s.buf && now - s.last > TIMEOUT) { s.buf = ''; s.last = 0; }
    if (key === exp) { s.buf += key; s.last = now; }
    else if (s.buf.length && key === 'a') { s.buf = 'a'; s.last = now; }
    else { s.buf = ''; s.last = 0; }
    if (s.buf === ASH) { s.fired = true; s.buf = ''; }
    return s;
  }

  return { step: step, state: function () { return { buf: '', last: 0, fired: false }; } };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ASH_SECRET;

(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  if (window.FeatureFlags && !window.FeatureFlags.get('easter-eggs')) return;

  var buf = '';
  var ashState = ASH_SECRET.state();
  var ashFired = false;

  function openSecretDoor() {
    if (ashFired) return;
    ashFired = true;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(8,6,10,.6);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity ' + (reduce ? 0.2 : 0.9) + 's ease;';
    var stars = '';
    if (!reduce) {
      for (var i = 0; i < 36; i++) {
        stars += '<i style="position:absolute;left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;width:2px;height:2px;border-radius:50%;background:#ffe680;opacity:' + (0.4 + Math.random() * 0.6).toFixed(2) + ';animation:lwTwinkle ' + (1.5 + Math.random() * 2).toFixed(2) + 's ease-in-out ' + (Math.random() * 1.5).toFixed(2) + 's infinite;"></i>';
      }
    }
    overlay.innerHTML =
      '<style>@keyframes lwTwinkle{0%,100%{opacity:.1}50%{opacity:1}}</style>' + stars +
      '<div style="position:relative;color:#ffe680;font-family:Georgia,serif;font-style:italic;font-size:1.25rem;letter-spacing:.15em;text-shadow:0 0 18px rgba(255,230,128,.35);">Something for tonight...</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.style.opacity = '1'; });
    setTimeout(function () { window.location.href = 'for-tonight.html'; }, 1700);
  }

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
    var lower = e.key.toLowerCase();

    if (e.key === lower) {
      ashState = ASH_SECRET.step(ashState, Date.now(), e.key);
      if (ashState.fired) {
        ashState = ASH_SECRET.state();
        if (window.Interactions) window.Interactions.record('trigger', 'typed_ash');
        if (window.location.href.indexOf('for-tonight.html') === -1) openSecretDoor();
      }
    }

    buf += lower;
    if (buf.length > 20) buf = buf.slice(-20);

    if (buf.indexOf('dream') !== -1) {
      buf = '';
      if (window.Interactions) window.Interactions.record('trigger', 'typed_dream');
      if (window.location.href.indexOf('dream.html') === -1) window.location.href = 'dream.html';
    }

    if (buf.indexOf('sleep') !== -1) {
      buf = '';
      if (window.Interactions) window.Interactions.record('trigger', 'typed_sleep');
      if (window.location.href.indexOf('make-her-sleep.html') === -1) window.location.href = 'make-her-sleep.html';
    }

    if (buf.indexOf('remember') !== -1) {
      buf = '';
      if (window.Interactions) window.Interactions.record('trigger', 'typed_remember');
      if (window.location.href.indexOf('i-remember.html') === -1) window.location.href = 'i-remember.html';
    }

    if (buf.indexOf('letter') !== -1) {
      buf = '';
      if (window.Interactions) window.Interactions.record('trigger', 'typed_letter');
      if (window.location.href.indexOf('letter-that-writes-itself.html') === -1) {
        window.location.href = 'letter-that-writes-itself.html?secret';
      }
    }

    if (buf.indexOf('lanterns') !== -1) {
      buf = '';
      if (window.Interactions) window.Interactions.record('trigger', 'typed_lanterns');
      if (typeof window._openLanternWorld === 'function') window._openLanternWorld();
      else if (window.location.href.indexOf('dream.html') === -1) window.location.href = 'dream.html?lanterns';
    }
  });
})();
