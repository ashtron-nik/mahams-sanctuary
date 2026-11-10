/**
 * adaptive-text.js
 * Samples background color behind text elements and sets text color to
 * light-on-dark or dark-on-light automatically. Elements opt in via
 * data-adaptive-text attribute. Also adds a subtle label under the girl
 * companion.
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('adaptive-text')) return;

  var canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  var ctx = canvas.getContext('2d', { willReadFrequently: true });

  function getLuminance(r, g, b) {
    var a = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function sampleBackground(el) {
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    // sample from the center of the element, slightly above text
    var x = Math.round(rect.left + rect.width / 2);
    var y = Math.round(rect.top + rect.height / 2);
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.drawImage(document.documentElement, x, y, 1, 1, 0, 0, 1, 1);
      var px = ctx.getImageData(0, 0, 1, 1).data;
      return { r: px[0], g: px[1], b: px[2], a: px[3] };
    } catch (e) {
      return null;
    }
  }

  function computeDecision(el) {
    var bg = sampleBackground(el);
    if (!bg) return null;
    // if mostly transparent, look at parent
    if (bg.a < 30) {
      var parent = el.parentElement;
      if (parent) bg = sampleBackground(parent) || bg;
    }
    var lum = getLuminance(bg.r, bg.g, bg.b);
    return lum < 0.35 ? 'dark' : 'light';
  }

  function applyTheme(el, theme) {
    if (!theme || el._adaptiveTheme === theme) return;
    el._adaptiveTheme = theme;
    if (theme === 'dark') {
      el.style.color = '#ffebd2';
      el.style.textShadow = '0 1px 4px rgba(0,0,0,0.6)';
    } else {
      el.style.color = '#17130f';
      el.style.textShadow = '0 1px 2px rgba(255,255,255,0.3)';
    }
  }

  var ticking = false;
  function scanAll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var els = document.querySelectorAll('[data-adaptive-text]');
      for (var i = 0; i < els.length; i++) {
        var theme = computeDecision(els[i]);
        applyTheme(els[i], theme);
      }
      ticking = false;
    });
  }

  // Observe DOM for new adaptive elements
  var observer = new MutationObserver(function (mutations) {
    var needsScan = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length) { needsScan = true; break; }
    }
    if (needsScan) setTimeout(scanAll, 100);
  });

  function init() {
    observer.observe(document.body, { childList: true, subtree: true });
    scanAll();
    // rescan on scroll (parallax backgrounds shift)
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () { scrollTimer = null; scanAll(); }, 150);
    }, { passive: true });
    // rescan on resize
    window.addEventListener('resize', function () { setTimeout(scanAll, 200); }, { passive: true });
  }

  // Girl companion label
  function addCompanionLabel() {
    if (document.querySelector('.companion-label')) return;
    var label = document.createElement('div');
    label.className = 'companion-label';
    label.textContent = '';
    label.setAttribute('aria-hidden', 'true');
    label.setAttribute('data-adaptive-text', '');
    var style = label.style;
    style.position = 'fixed';
    style.bottom = '18px';
    style.left = '50%';
    style.transform = 'translateX(-50%)';
    style.zIndex = '999998';
    style.fontSize = '11px';
    style.fontFamily = "'Caveat', cursive";
    style.letterSpacing = '2px';
    style.opacity = '0.7';
    style.pointerEvents = 'none';
    style.transition = 'color 0.8s ease, text-shadow 0.8s ease';
    document.body.appendChild(label);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { autoMark(); init(); addCompanionLabel(); });
  } else {
    autoMark();
    init();
    addCompanionLabel();
  }

  function autoMark() {
    // Auto-mark key text elements for adaptive coloring
    var selectors = [
      '.gradient-btn', '.gradient-btn-pink', '.gradient-btn-glass', '.gradient-btn-glass-pink',
      '.add-btn', '.floating-btn', '.hero-title', '.hero-subtitle',
      'h1:not([data-adaptive-text])', 'h2:not([data-adaptive-text])', 'h3:not([data-adaptive-text])',
      '.dedication-kicker', '.dedication-body',
      '.toc a', '.section-heading', '.parallax-caption',
      '.back-btn', '.theme-toggle-btn', '.dice-btn',
      '.mood-btn', '.to-top-btn', '.easter-egg-btn'
    ];
    var els = document.querySelectorAll(selectors.join(','));
    for (var i = 0; i < els.length; i++) {
      if (!els[i].hasAttribute('data-adaptive-text')) {
        els[i].setAttribute('data-adaptive-text', '');
      }
    }
  }
})();
