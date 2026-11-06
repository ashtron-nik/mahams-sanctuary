/**
 * motion-masterpiece.js
 * Cinematic anime.js visual system
 *
 *  - Hero entrance: character stagger reveal from center
 *  - Accordion stagger: tribute cards cascade on open
 *  - End section reveal: scroll-triggered fade-in
 *  - Progress glow: reading bar breathing pulse
 *  - Ambient: aurora layered breathing at different rates
 *  - Spark morph: continuous scale/shadow pulse on spark dots
 *
 * Requires: anime.min.js loaded before this file.
 * Respects: prefers-reduced-motion, admin lock (body display:none).
 *
 * SAFETY: Text visibility is never sacrificed for animation.
 * If anime.js is missing or broken, text stays visible.
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('motion-masterpiece')) return;

  var hasAnime = typeof anime === 'function' || (typeof anime === 'object' && anime !== null);
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── wait for body to escape admin lock ── */
  function onVisible(fn) {
    (function tick() {
      if (document.body && getComputedStyle(document.body).display !== 'none') fn();
      else requestAnimationFrame(tick);
    })();
  }

  /* ═══════════════════════ HERO ENTRANCE ═══════════════════════ */

  function hero() {
    var el = document.querySelector('.hero-title');
    if (!el) return;
    var raw = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-label', raw);

    var ch = [];
    for (var i = 0; i < raw.length; i++) {
      var span = document.createElement('span');
      span.textContent = raw[i] === ' ' ? '\u00A0' : raw[i];
      span.style.display = 'inline-block';
      el.appendChild(span);
      if (raw[i] !== ' ') ch.push(span);
    }

    if (!hasAnime || reducedMotion) {
      ch.forEach(function (c) { c.style.opacity = '1'; });
      return;
    }

    /* set initial state THEN animate — with a hard fallback */
    ch.forEach(function (c) { c.style.opacity = '0'; });

    var sub = document.querySelector('.hero-subtitle');
    var orn = document.querySelector('.hero-ornament');

    try {
      var tl = anime.timeline({ easing: 'easeOutCubic' });

      tl.add({
        targets: ch,
        translateY: [80, 0],
        opacity: [0, 1],
        rotateZ: [12, 0],
        duration: 1200,
        delay: anime.stagger(40, { from: 'center' })
      });

      if (sub) {
        sub.style.opacity = '0';
        tl.add({
          targets: sub,
          translateY: [30, 0],
          opacity: [0, 1],
          duration: 800
        }, '-=500');
      }

      if (orn) {
        orn.style.opacity = '0';
        tl.add({
          targets: orn,
          scaleX: [0, 1],
          opacity: [0, 1],
          duration: 700,
          easing: 'easeOutExpo'
        }, '-=300');
      }
    } catch (e) {
      /* animation failed — show everything */
      ch.forEach(function (c) { c.style.opacity = '1'; });
      if (sub) sub.style.opacity = '1';
      if (orn) orn.style.opacity = '1';
    }

    /* hard fallback: if anything is still invisible after 2s, show it */
    setTimeout(function () {
      ch.forEach(function (c) {
        if (getComputedStyle(c).opacity === '0') c.style.opacity = '1';
      });
      if (sub && getComputedStyle(sub).opacity === '0') sub.style.opacity = '1';
      if (orn && getComputedStyle(orn).opacity === '0') orn.style.opacity = '1';
    }, 2000);
  }

  /* ═══════════════════════ ACCORDION STAGGER ═══════════════════════ */

  function accordionStagger() {
    if (!hasAnime || reducedMotion) return;

    document.querySelectorAll('.accordion-header').forEach(function (h) {
      h.addEventListener('click', function () {
        var group = h.closest('.accordion-group');
        if (!group) return;
        var box = group.querySelector('.accordion-content');
        if (!box) return;
        var cards = box.querySelectorAll('.tribute');
        if (!cards.length) return;

        requestAnimationFrame(function () {
          cards.forEach(function (c) { c.style.opacity = '0'; });
          try {
            anime({
              targets: cards,
              translateY: [20, 0],
              opacity: [0, 1],
              duration: 450,
              delay: anime.stagger(60),
              easing: 'easeOutCubic'
            });
          } catch (e) {
            cards.forEach(function (c) { c.style.opacity = '1'; });
          }
          /* fallback: show cards after 1s no matter what */
          setTimeout(function () {
            cards.forEach(function (c) {
              if (getComputedStyle(c).opacity === '0') c.style.opacity = '1';
            });
          }, 1000);
        });
      });
    });
  }

  /* ═══════════════════════ END SECTION REVEAL ═══════════════════════ */

  function endReveal() {
    var sec = document.querySelector('.end-section');
    if (!sec) return;

    if (!hasAnime || reducedMotion) return;

    sec.style.opacity = '0';
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        try {
          anime({
            targets: en.target,
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 1000,
            easing: 'easeOutCubic'
          });
        } catch (e) {
          en.target.style.opacity = '1';
        }
        /* fallback */
        setTimeout(function () {
          if (getComputedStyle(en.target).opacity === '0') en.target.style.opacity = '1';
        }, 1500);
      });
    }, { threshold: 0.3 });

    io.observe(sec);
  }

  /* ═══════════════════════ PROGRESS GLOW ═══════════════════════ */

  function progressGlow() {
    if (!hasAnime || reducedMotion) return;
    var f = document.querySelector('.progress-fill');
    if (!f) return;
    try {
      anime({
        targets: f,
        boxShadow: [
          '0 0 12px rgba(255,150,50,.6), 0 0 25px rgba(255,120,30,.3)',
          '0 0 20px rgba(255,200,100,.9), 0 0 40px rgba(255,150,50,.5)',
          '0 0 12px rgba(255,150,50,.6), 0 0 25px rgba(255,120,30,.3)'
        ],
        duration: 3000,
        easing: 'easeInOutSine',
        loop: true
      });
    } catch (e) { /* decorative — skip */ }
  }

  /* ═══════════════════════ AMBIENT AURORA ═══════════════════════ */

  function ambient() {
    if (!hasAnime || reducedMotion) return;
    document.querySelectorAll('.aurora-layer').forEach(function (l, i) {
      try {
        anime({
          targets: l,
          scale: [1, 1.04 + i * 0.02, 1],
          opacity: [0.3, 0.5, 0.3],
          duration: 8000 + i * 2000,
          easing: 'easeInOutSine',
          loop: true
        });
      } catch (e) { /* decorative — skip */ }
    });
  }

  /* ═══════════════════════ SPARK MORPH ═══════════════════════ */

  function sparks() {
    if (!hasAnime || reducedMotion) return;
    document.querySelectorAll('.spark').forEach(function (s) {
      try {
        anime({
          targets: s,
          scale: [0.85, 1.15, 0.85],
          boxShadow: [
            '0 0 10px 3px rgba(255,224,138,.8)',
            '0 0 20px 6px rgba(255,200,100,1)',
            '0 0 10px 3px rgba(255,224,138,.8)'
          ],
          duration: 5000,
          easing: 'easeInOutSine',
          loop: true
        });
      } catch (e) { /* decorative — skip */ }
    });
  }

  /* ═══════════════════════ INIT ═══════════════════════ */

  onVisible(function () {
    hero();
    accordionStagger();
    endReveal();
    progressGlow();
    ambient();
    sparks();
  });
})();
