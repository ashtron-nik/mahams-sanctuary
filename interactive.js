/* ===================================================================
   INTERACTIVE ENHANCEMENTS — Phase 2
   Enhances 10 interactive elements, expands Wish System, adds
   Wish Journal, Admin integration, and Lantern World.
   Depends on: skies.js, sky-living.js, sky-observatory.js, fb-db.js
   =================================================================== */
(function () {
  'use strict';

  /* ===================== WISH SYSTEM (unified) ===================== */
  var WISH_KEY = 'ash-wish-journal';
  var WISH_FB_PATH = 'wishes';

  function getJournal() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch (e) { return []; }
  }
  function saveJournal(wishes) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(wishes)); } catch (e) {}
  }

  function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function addWish(text, source) {
    if (!text) return null;
    var wishes = getJournal();
    var wish = {
      id: generateId(),
      text: text,
      createdAt: Date.now(),
      source: source || 'observatory',
      granted: false,
      grantedAt: null,
      favourite: false,
      released: false,
      releasedAt: null
    };
    wishes.unshift(wish);
    saveJournal(wishes);
    syncWishToFirebase(wish);
    if (window.Interactions) window.Interactions.record('wish', 'wish_posted', source || 'observatory');
    var wjBtn = document.getElementById('wishJournalBtn');
    if (wjBtn) wjBtn.style.display = '';
    return wish;
  }

  function grantWish(id) {
    var wishes = getJournal();
    for (var i = 0; i < wishes.length; i++) {
      if (wishes[i].id === id) {
        wishes[i].granted = true;
        wishes[i].grantedAt = Date.now();
        saveJournal(wishes);
        syncWishToFirebase(wishes[i]);
        return true;
      }
    }
    return false;
  }

  function toggleFavourite(id) {
    var wishes = getJournal();
    for (var i = 0; i < wishes.length; i++) {
      if (wishes[i].id === id) {
        wishes[i].favourite = !wishes[i].favourite;
        saveJournal(wishes);
        syncWishToFirebase(wishes[i]);
        return wishes[i].favourite;
      }
    }
    return false;
  }

  function markReleased(id, colour, glow, size) {
    var wishes = getJournal();
    for (var i = 0; i < wishes.length; i++) {
      if (wishes[i].id === id) {
        wishes[i].released = true;
        wishes[i].releasedAt = Date.now();
        wishes[i].lanternColour = colour || '#ffcc44';
        wishes[i].lanternGlow = glow || 1;
        wishes[i].lanternSize = size || 1;
        saveJournal(wishes);
        syncWishToFirebase(wishes[i]);
        return true;
      }
    }
    return false;
  }

  function deleteWish(id) {
    var wishes = getJournal();
    for (var i = 0; i < wishes.length; i++) {
      if (wishes[i].id === id) {
        wishes.splice(i, 1);
        saveJournal(wishes);
        if (typeof FB !== 'undefined' && FB.delete) FB.delete(WISH_FB_PATH, id).catch(function () {});
        return true;
      }
    }
    return false;
  }

  function syncWishToFirebase(wish) {
    if (typeof FB !== 'undefined' && FB.put) {
      FB.put(WISH_FB_PATH, wish).catch(function () {});
    }
  }

  /* ===================== ENHANCED CATCH STARS ===================== */
  // Intercepts sky-living.js star clicks — upgrades animation + particles
  function enhanceStarCatching() {
    var sc = document.getElementById('starSparkleContainer');
    if (!sc) {
      sc = document.createElement('div');
      sc.id = 'starSparkleContainer';
      sc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;';
      document.body.appendChild(sc);
    }
    document.addEventListener('starClicked', function (e) {
      spawnStarBurst(e.detail.x, e.detail.y);
      if (window.Interactions) window.Interactions.record('wish', 'star_clicked');
    });
  }

  function spawnStarBurst(x, y) {
    var container = document.getElementById('starSparkleContainer');
    if (!container) return;
    for (var i = 0; i < 12; i++) {
      var sp = document.createElement('div');
      var angle = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.5;
      var dist = 30 + Math.random() * 50;
      var size = 3 + Math.random() * 4;
      sp.textContent = '\u2728';
      sp.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;font-size:' + size + 'px;opacity:1;transition:all ' + (0.5 + Math.random() * 0.4) + 's ease-out;z-index:9999;pointer-events:none;';
      container.appendChild(sp);
      requestAnimationFrame(function () {
        sp.style.transform = 'translate(' + Math.cos(angle) * dist + 'px,' + Math.sin(angle) * dist + 'px) scale(0.2) rotate(' + (Math.random() * 360) + 'deg)';
        sp.style.opacity = '0';
      });
      setTimeout(function () { if (sp.parentNode) sp.remove(); }, 1200);
    }
  }

  /* ===================== ENHANCED FIREFLY JAR ===================== */
  function enhanceFireflyJar() {
    var jar = document.getElementById('obsFireflyJar');
    if (!jar) return;

    // Add counter badge
    var badge = document.createElement('span');
    badge.id = 'ffJarBadge';
    badge.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#ffe680;color:#181214;border-radius:50%;width:18px;height:18px;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:bold;transition:transform 0.3s ease;';
    badge.textContent = '0';
    jar.appendChild(badge);

    function updateBadge() {
      var cfg = window._obsFireflyJar ? window._obsFireflyJar.getConfig() : null;
      if (!cfg) {
        try { cfg = JSON.parse(localStorage.getItem('ash-obs')) || {}; } catch (e) { cfg = {}; }
      }
      var count = (cfg && cfg.fireflies && cfg.fireflies.caught) || 0;
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.transform = count > 0 ? 'scale(1)' : 'scale(0)';
    }

    updateBadge();
    setInterval(updateBadge, 3000);
  }

  /* ===================== ENHANCED BUBBLE MESSAGES ===================== */
  function enhanceBubbleMessages() {
    var checkInterval = setInterval(function () {
      document.querySelectorAll('div').forEach(function (el) {
        if (el.textContent === '\uD83C\uDF2C\uFE0F' && !el.dataset.bubbleEnhanced &&
            el.style.position === 'fixed' && el.style.zIndex === '9995') {
          el.dataset.bubbleEnhanced = '1';
          enhanceSingleBubble(el);
        }
      });
    }, 2000);
  }

  function enhanceSingleBubble(el) {
    el.addEventListener('click', function (e) {
      var msgs = [
        'You are loved beyond measure.',
        'The sky is proud of you.',
        'Keep going. Something beautiful is waiting.',
        'You make the world brighter.',
        'This moment is a gift.',
        'Breathe. You are exactly on time.',
        'The stars align for you today.',
        'Your heart knows the way.',
        'You are someone\u2019s favourite sky.',
        'Everything is going to be okay.'
      ];
      var msg = msgs[Math.floor(Math.random() * msgs.length)];
      // Add iridescent pop effect
      el.style.transition = 'all 0.6s ease';
      el.style.transform = 'scale(3) rotate(20deg)';
      el.style.opacity = '0';
      el.style.filter = 'hue-rotate(180deg) saturate(2)';

      // Show message with save option
      showInteractiveToast(msg, function () {
        addWish(msg, 'bubble');
        toast('\u2B50 Wish saved from bubble!', 'rgba(180,220,255,0.8)', 2000);
      });

      setTimeout(function () { if (el.parentNode) el.remove(); }, 800);
    }, true);
  }

  /* ===================== ENHANCED LOST BALLOON ===================== */
  function enhanceLostBalloon() {
    // Add save option on balloon click — already works via toast, we add "save wish" option
    document.addEventListener('click', function (e) {
      var el = e.target;
      if (el && el.textContent === '\uD83C\uDF88' && el.style.position === 'fixed') {
        // Check if it's a balloon (has the balloon style)
        if (el.style.bottom && el.style.zIndex === '9995') {
          setTimeout(function () {
            // After original handler runs, add option
            var msgs = [
              'I wonder who is looking at this sky too...',
              'If you find this, know that someone loves you.',
              'The higher we go, the smaller our problems seem.',
              'I wish I could stay up here forever.',
              'Hello, stranger. I hope your day is beautiful.',
              'This balloon has travelled further than I ever have.',
              'Let go of what holds you down.',
              'Somewhere, someone is waiting for a sign. This is it.'
            ];
            var msg = msgs[Math.floor(Math.random() * msgs.length)];
            setTimeout(function () {
              showWishSavePrompt('\uD83C\uDF88 ' + msg);
            }, 800);
          }, 100);
        }
      }
    }, true);
  }

  /* ===================== BUTTERFLY CATCHING ===================== */
  function initButterflyCatching() {
    // Add clickable butterflies on butterfly skies
    var container = document.createElement('div');
    container.id = 'butterflyCatcher';
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;';
    document.body.appendChild(container);

    var butterflyMsgs = [
      'You make my heart feel light.',
      'Butterflies — every single time.',
      'Fluttering just for you.',
      'A moment of pure magic.',
      'Catch the feeling, keep it close.'
    ];

    // Spawn butterflies on butterfly-type skies
    function checkAndSpawn() {
      var sky = window.Skies && window.Skies.SKIES && window.Skies.SKIES[window.Skies.getCurrent ? window.Skies.getCurrent() : -1];
      if (!sky) return;
      var isButterfly = false;
      if (sky.particles) {
        for (var i = 0; i < sky.particles.length; i++) {
          if (sky.particles[i].type === 'butterfly') { isButterfly = true; break; }
        }
      }
      if (!isButterfly && sky.name && /butterfly/i.test(sky.name)) isButterfly = true;

      if (isButterfly && Math.random() < 0.003) {
        spawnButterfly();
      }
    }

    function spawnButterfly() {
      var bf = document.createElement('div');
      bf.textContent = '\uD83E\uDD8B';
      bf.style.cssText = 'position:fixed;pointer-events:auto;cursor:pointer;z-index:9997;font-size:' + (16 + Math.random() * 10) + 'px;opacity:0;transition:all ' + (3 + Math.random() * 3) + 's ease-in-out;filter:drop-shadow(0 0 4px rgba(255,200,255,0.3));';
      bf.style.left = (Math.random() * 80 + 10) + 'vw';
      bf.style.top = (Math.random() * 70 + 10) + 'vh';
      container.appendChild(bf);

      requestAnimationFrame(function () {
        bf.style.opacity = '0.8';
        bf.style.transform = 'translateY(-' + (20 + Math.random() * 40) + 'px) rotate(' + (Math.random() - 0.5) * 20 + 'deg)';
      });

      // Flutter animation
      var flutter = setInterval(function () {
        if (!bf.parentNode) { clearInterval(flutter); return; }
        bf.style.transform = 'translate(' + (Math.random() - 0.5) * 30 + 'px,' + (Math.random() - 0.5) * 20 + 'px) rotate(' + (Math.random() - 0.5) * 30 + 'deg) scale(' + (0.8 + Math.random() * 0.4) + ')';
      }, 800);

      bf.addEventListener('click', function () {
        clearInterval(flutter);
        var msg = butterflyMsgs[Math.floor(Math.random() * butterflyMsgs.length)];
        // Sparkle burst
        for (var si = 0; si < 6; si++) {
          (function (idx) {
            var sp = document.createElement('span');
            sp.textContent = '\u2728';
            sp.style.cssText = 'position:fixed;left:' + (parseFloat(bf.style.left) + 10) + 'px;top:' + (parseFloat(bf.style.top) + 10) + 'px;font-size:8px;pointer-events:none;transition:all 0.6s ease-out;z-index:9999;';
            container.appendChild(sp);
            requestAnimationFrame(function () {
              sp.style.transform = 'translate(' + (Math.random() - 0.5) * 60 + 'px,' + (Math.random() - 0.5) * 60 + 'px) scale(0)';
              sp.style.opacity = '0';
            });
            setTimeout(function () { if (sp.parentNode) sp.remove(); }, 800);
          })(si);
        }
        toast('\uD83E\uDD8B ' + msg, 'rgba(200,150,255,0.8)', 3000);
        bf.style.transform = 'scale(2)';
        bf.style.opacity = '0';
        setTimeout(function () { if (bf.parentNode) bf.remove(); }, 500);
      });

      setTimeout(function () {
        if (!bf.parentNode) return;
        clearInterval(flutter);
        bf.style.opacity = '0';
        setTimeout(function () { if (bf.parentNode) bf.remove(); }, 1500);
      }, 12000);
    }

    setInterval(checkAndSpawn, 8000);
  }

  /* ===================== LEAF TRAILS ===================== */
  function initLeafTrails() {
    var leafContainer = document.createElement('div');
    leafContainer.id = 'leafTrailContainer';
    leafContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;';
    document.body.appendChild(leafContainer);

    var leafChars = ['\uD83C\uDF41', '\uD83C\uDF42', '\uD83C\uDF43', '\uD83C\uDF3F'];

    document.addEventListener('mousemove', function (e) {
      // Check if current sky has leaves
      var sky = window.Skies && window.Skies.SKIES && window.Skies.SKIES[window.Skies.getCurrent ? window.Skies.getCurrent() : -1];
      var hasLeaf = false;
      if (sky && sky.particles) {
        for (var i = 0; i < sky.particles.length; i++) {
          if (sky.particles[i].type === 'leaf') { hasLeaf = true; break; }
        }
      }
      if (!hasLeaf && Math.random() > 0.05) return;
      if (!hasLeaf) return;
      if (Math.random() > 0.15) return;

      var leaf = document.createElement('div');
      leaf.textContent = leafChars[Math.floor(Math.random() * leafChars.length)];
      leaf.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;font-size:' + (10 + Math.random() * 8) + 'px;opacity:0.6;transition:all ' + (1.5 + Math.random() * 1.5) + 's ease-out;pointer-events:none;';
      leafContainer.appendChild(leaf);

      requestAnimationFrame(function () {
        leaf.style.transform = 'translate(' + (Math.random() - 0.5) * 60 + 'px,' + (20 + Math.random() * 40) + 'px) rotate(' + (Math.random() * 180) + 'deg)';
        leaf.style.opacity = '0';
      });

      setTimeout(function () { if (leaf.parentNode) leaf.remove(); }, 3000);
    });
  }

  /* ===================== PAPER BOATS ===================== */
  function initPaperBoats() {
    var boatContainer = document.createElement('div');
    boatContainer.id = 'paperBoatContainer';
    boatContainer.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:120px;pointer-events:none;z-index:9995;overflow:hidden;';
    document.body.appendChild(boatContainer);

    var boatMsgs = [
      'Carry my love across the water.',
      'A tiny boat, a big ocean, an endless wish.',
      'Sail wherever the wind takes you.',
      'I set my heart afloat in this little boat.',
      'Some journeys begin with letting go.',
      'Across every wave, I would find you.'
    ];

    function checkAndSpawn() {
      var sky = window.Skies && window.Skies.SKIES && window.Skies.SKIES[window.Skies.getCurrent ? window.Skies.getCurrent() : -1];
      var isWater = false;
      if (sky) {
        var n = sky.name.toLowerCase();
        if (sky.waves || /ocean|coastal|misty coast|glacier|white sands|rain|river|sea|water/.test(n)) isWater = true;
        if (sky.particles) {
          for (var i = 0; i < sky.particles.length; i++) {
            if (sky.particles[i].type === 'rain') isWater = true;
          }
        }
      }
      if (!isWater) return;
      if (Math.random() > 0.003) return;

      var boat = document.createElement('div');
      boat.textContent = '\u26F5\uFE0F';
      boat.style.cssText = 'position:absolute;bottom:20px;left:-40px;font-size:' + (18 + Math.random() * 10) + 'px;pointer-events:auto;cursor:pointer;opacity:0.7;transition:opacity 0.3s;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));';
      boatContainer.appendChild(boat);

      // Sail across
      var duration = 8000 + Math.random() * 6000;
      boat.style.transition = 'left ' + duration + 'ms linear, transform ' + duration + 'ms ease-in-out';
      requestAnimationFrame(function () {
        boat.style.left = (window.innerWidth + 60) + 'px';
        boat.style.transform = 'translateY(' + (Math.sin(Math.random() * Math.PI * 2) * 10) + 'px)';
      });

      boat.addEventListener('click', function () {
        var msg = boatMsgs[Math.floor(Math.random() * boatMsgs.length)];
        showInteractiveToast('\u26F5\uFE0F ' + msg, function () {
          addWish(msg, 'paperboat');
          toast('\u2B50 Wish saved from a paper boat!', 'rgba(100,200,255,0.8)', 2000);
        });
        boat.style.opacity = '0';
        setTimeout(function () { if (boat.parentNode) boat.remove(); }, 600);
      });

      setTimeout(function () {
        if (boat.parentNode) { boat.style.opacity = '0'; setTimeout(function () { if (boat.parentNode) boat.remove(); }, 1000); }
      }, duration + 2000);
    }

    setInterval(checkAndSpawn, 15000);
  }

  /* ===================== DANDELIONS ===================== */
  function initDandelions() {
    var danContainer = document.createElement('div');
    danContainer.id = 'dandelionContainer';
    danContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;';
    document.body.appendChild(danContainer);

    function spawnDandelion() {
      var seed = document.createElement('div');
      seed.textContent = '\uD83C\uDF3C';
      seed.style.cssText = 'position:fixed;pointer-events:auto;cursor:pointer;z-index:9997;font-size:' + (12 + Math.random() * 6) + 'px;opacity:0.5;transition:all ' + (4 + Math.random() * 4) + 's ease-out;filter:drop-shadow(0 0 2px rgba(255,255,200,0.2));';
      seed.style.left = (Math.random() * 90 + 5) + 'vw';
      seed.style.top = (80 + Math.random() * 15) + 'vh';
      danContainer.appendChild(seed);

      requestAnimationFrame(function () {
        seed.style.transform = 'translateY(-' + (window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.3) + 'px) translateX(' + (Math.random() - 0.5) * 100 + 'px)';
        seed.style.opacity = '0';
      });

      seed.addEventListener('click', function () {
        // Scatter burst
        for (var di = 0; di < 5; di++) {
          (function () {
            var puff = document.createElement('div');
            puff.textContent = '\u2728';
            puff.style.cssText = 'position:fixed;left:' + seed.style.left + ';top:' + seed.style.top + ';font-size:8px;pointer-events:none;transition:all 1s ease-out;z-index:9998;';
            danContainer.appendChild(puff);
            requestAnimationFrame(function () {
              puff.style.transform = 'translate(' + (Math.random() - 0.5) * 100 + 'px,' + (Math.random() - 0.5) * 100 + 'px) scale(0)';
              puff.style.opacity = '0';
            });
            setTimeout(function () { if (puff.parentNode) puff.remove(); }, 1200);
          })();
        }
        toast('\uD83C\uDF3C A wish on the wind...', 'rgba(200,255,200,0.7)', 2000);
        addWish('Dandelion wish — may it find its way', 'dandelion');
        seed.style.opacity = '0';
        setTimeout(function () { if (seed.parentNode) seed.remove(); }, 400);
      });

      setTimeout(function () {
        if (seed.parentNode) { seed.style.opacity = '0'; setTimeout(function () { if (seed.parentNode) seed.remove(); }, 1500); }
      }, 10000);
    }

    // Spawn dandelions periodically on meadow/spring skies
    setInterval(function () {
      var sky = window.Skies && window.Skies.SKIES && window.Skies.SKIES[window.Skies.getCurrent ? window.Skies.getCurrent() : -1];
      var isMeadow = false;
      if (sky) {
        var n = sky.name.toLowerCase();
        if (/meadow|spring|sakura|cherry|forest|lavender|wisteria|garden|bloom|flower/.test(n)) isMeadow = true;
      }
      if (isMeadow && Math.random() < 0.003) spawnDandelion();
    }, 12000);
  }

  /* ===================== RAIN RIPPLES ===================== */
  function initRainRipples() {
    var rippleCanvas = document.createElement('canvas');
    rippleCanvas.id = 'rainRippleCanvas';
    rippleCanvas.style.cssText = 'position:fixed;inset:0;z-index:9996;pointer-events:none;';
    document.body.appendChild(rippleCanvas);
    var rctx = rippleCanvas.getContext('2d');
    var ripples = [];

    function resize() {
      rippleCanvas.width = window.innerWidth;
      rippleCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Click to create a ripple
    document.addEventListener('click', function (e) {
      var sky = window.Skies && window.Skies.SKIES && window.Skies.SKIES[window.Skies.getCurrent ? window.Skies.getCurrent() : -1];
      var hasRain = false;
      if (sky && sky.particles) {
        for (var i = 0; i < sky.particles.length; i++) {
          if (sky.particles[i].type === 'rain') { hasRain = true; break; }
        }
      }
      if (!hasRain) return;

      ripples.push({
        x: e.clientX, y: e.clientY,
        r: 5, maxR: 30 + Math.random() * 20,
        alpha: 0.7,
        growing: true
      });
    });

    function drawRipples() {
      rctx.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height);
      for (var i = ripples.length - 1; i >= 0; i--) {
        var r = ripples[i];
        if (r.growing) {
          r.r += 0.8;
          r.alpha -= 0.01;
          if (r.r >= r.maxR) r.growing = false;
        } else {
          r.alpha -= 0.015;
        }
        if (r.alpha <= 0) { ripples.splice(i, 1); continue; }

        rctx.strokeStyle = 'rgba(200,220,255,' + r.alpha + ')';
        rctx.lineWidth = 1.5;
        rctx.beginPath();
        rctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        rctx.stroke();

        // Inner ripple
        if (r.r > 8) {
          rctx.strokeStyle = 'rgba(200,220,255,' + (r.alpha * 0.4) + ')';
          rctx.beginPath();
          rctx.arc(r.x, r.y, r.r * 0.4, 0, Math.PI * 2);
          rctx.stroke();
        }
      }
      requestAnimationFrame(drawRipples);
    }
    drawRipples();
  }

  /* ===================== WISH JOURNAL UI ===================== */
  function initWishJournal() {
    var path = location.pathname;
    if (/gallery|observatory/i.test(path)) return;
    var btn = document.createElement('button');
    btn.id = 'wishJournalBtn';
    btn.innerHTML = '\u2728 <span style="font-size:0.7rem;display:block;">Journal</span>';
    btn.title = 'Wish Journal';
    btn.style.cssText = 'position:fixed;bottom:291px;right:25px;z-index:100;background:rgba(255,220,160,.08);border:1px solid rgba(255,210,150,.15);border-radius:12px;padding:6px 10px;cursor:pointer;transition:all 0.3s;color:var(--gold);font-size:1.2rem;line-height:1;text-align:center;display:none;';
    document.body.appendChild(btn);

    function showWishBtnIfNeeded() {
      var w = getJournal();
      if (w.length > 0) btn.style.display = '';
    }
    showWishBtnIfNeeded();

    btn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,230,128,.15)'; this.style.borderColor = 'rgba(255,230,128,.35)'; });
    btn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,220,160,.08)'; this.style.borderColor = 'rgba(255,210,150,.15)'; });
    btn.addEventListener('click', toggleWishJournal);

    // Panel
    var panel = document.createElement('div');
    panel.id = 'wishJournalPanel';
    panel.style.cssText = 'position:fixed;left:1rem;bottom:calc(12rem + 50px);width:340px;max-height:60vh;overflow-y:auto;z-index:9999;background:rgba(24,18,20,0.95);backdrop-filter:blur(16px);border:1px solid rgba(255,210,150,.15);border-radius:16px;padding:1rem;display:none;box-shadow:0 8px 40px rgba(0,0,0,.6);';
    document.body.appendChild(panel);

    function renderJournal() {
      var wishes = getJournal();
      if (!wishes.length) {
        panel.innerHTML = '<div style="text-align:center;padding:1.5rem;color:#6b5f52;"><div style="font-size:2rem;margin-bottom:0.5rem;">\u2728</div><p style="font-style:italic;font-size:0.85rem;">No wishes yet. Double-click the sky to make one.</p></div>';
        return;
      }
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;padding-bottom:0.5rem;border-bottom:1px solid rgba(255,210,150,.08);"><span style="color:var(--gold);font-size:0.9rem;font-family:var(--font-display);">\u2728 Wish Journal</span><span style="color:#6b5f52;font-size:0.75rem;">' + wishes.length + ' wish' + (wishes.length !== 1 ? 'es' : '') + '</span></div>';
      for (var i = 0; i < wishes.length; i++) {
        var w = wishes[i];
        var date = new Date(w.createdAt).toLocaleDateString();
        var status = w.granted ? '\u2705 Granted' : (w.released ? '\uD83C\uDFEE Released' : '\u23F3 Pending');
        var fav = w.favourite ? '\u2B50' : '\u2606';
        var text = w.text.length > 60 ? w.text.substring(0, 60) + '...' : w.text;
        html +=
          '<div class="wish-entry" data-id="' + w.id + '" style="padding:0.6rem 0.4rem;border-bottom:1px solid rgba(255,210,150,.05);cursor:pointer;transition:background 0.2s;border-radius:6px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
              '<div style="flex:1;min-width:0;margin-right:0.5rem;">' +
                '<div style="font-size:0.82rem;color:var(--parchment);word-wrap:break-word;">' + escHtml(text) + '</div>' +
                '<div style="font-size:0.65rem;color:#6b5f52;margin-top:2px;">' + date + ' \u00B7 ' + status + ' \u00B7 src: ' + w.source + '</div>' +
              '</div>' +
              '<div style="display:flex;gap:3px;flex-shrink:0;align-items:center;">' +
                '<span class="wish-fav" style="cursor:pointer;font-size:0.9rem;color:' + (w.favourite ? 'var(--gold)' : '#6b5f52') + ';" title="' + (w.favourite ? 'Unfavourite' : 'Favourite') + '">' + fav + '</span>' +
                '<span class="wish-grant" style="cursor:pointer;font-size:0.75rem;color:#6b5f52;' + (w.granted ? 'opacity:0.3;' : '') + '" title="Grant wish">\u2728</span>' +
                '<span class="wish-del" style="cursor:pointer;font-size:0.75rem;color:#6b5f52;" title="Delete">\u2716</span>' +
              '</div>' +
            '</div>' +
          '</div>';
      }
      panel.innerHTML = html;

      // Event handlers
      panel.querySelectorAll('.wish-fav').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = this.closest('.wish-entry').dataset.id;
          var isFav = toggleFavourite(id);
          this.textContent = isFav ? '\u2B50' : '\u2606';
          this.style.color = isFav ? 'var(--gold)' : '#6b5f52';
          this.title = isFav ? 'Unfavourite' : 'Favourite';
          toast(isFav ? '\u2B50 Favourited!' : 'Unfavourited', 'rgba(255,230,128,0.7)', 1200);
        });
      });

      panel.querySelectorAll('.wish-grant').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = this.closest('.wish-entry').dataset.id;
          var entry = panel.querySelector('[data-id="' + id + '"]');
          if (entry && entry.querySelector('.wish-grant').style.opacity === '0.3') return;
          if (grantWish(id)) {
            toast('\u2728 Wish granted!', 'rgba(255,230,128,0.8)', 2000);
            renderJournal();
          }
        });
      });

      panel.querySelectorAll('.wish-del').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = this.closest('.wish-entry').dataset.id;
          if (confirm('Delete this wish?')) {
            deleteWish(id);
            renderJournal();
            toast('Wish deleted', 'rgba(232,93,58,0.7)', 1200);
          }
        });
      });
    }

    var journalOpen = false;
    function toggleWishJournal() {
      journalOpen = !journalOpen;
      panel.style.display = journalOpen ? 'block' : 'none';
      if (journalOpen) renderJournal();
    }

    // Update on visible changes
    setInterval(function () {
      if (journalOpen) renderJournal();
    }, 5000);
  }

  /* ===================== LANTERN WORLD ===================== */
  function initLanternWorld() {
    // Triggered by typing "lanterns"
    window._openLanternWorld = openLanternWorld;


  }

  function openLanternWorld() {
    var wishes = getJournal();
    if (!wishes.length) {
      toast('Make a wish first! Double-click the sky \u2728', 'rgba(255,230,128,0.8)', 3000);
      return;
    }

    // Create full-screen overlay
    var overlay = document.createElement('div');
    overlay.id = 'lanternWorld';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(180deg,#0a0a1a 0%,#1a1a3a 40%,#2a1a2a 70%,#0a0a1a 100%);overflow:hidden;display:flex;flex-direction:column;align-items:center;';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2716';
    closeBtn.style.cssText = 'position:absolute;top:1rem;right:1rem;z-index:10;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#ffebd2;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:1rem;transition:all 0.3s;';
    closeBtn.addEventListener('click', function () { closeLanternWorld(); });
    closeBtn.addEventListener('mouseenter', function () { this.style.background = 'rgba(255,100,100,0.3)'; });
    closeBtn.addEventListener('mouseleave', function () { this.style.background = 'rgba(255,255,255,0.1)'; });
    overlay.appendChild(closeBtn);

    // Canvas for lantern rendering
    var canvas = document.createElement('canvas');
    canvas.id = 'lanternCanvas';
    canvas.style.cssText = 'position:absolute;inset:0;z-index:1;';
    overlay.appendChild(canvas);

    // UI Panel
    var panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);z-index:5;background:rgba(24,18,20,0.9);backdrop-filter:blur(12px);border:1px solid rgba(255,210,150,.15);border-radius:16px;padding:1.2rem 1.5rem;width:380px;max-width:90vw;display:flex;flex-direction:column;gap:10px;';
    overlay.appendChild(panel);

    // Wish selector
    var wishOptions = '<option value="">Select a wish...</option>';
    for (var i = 0; i < wishes.length; i++) {
      var txt = wishes[i].text.length > 40 ? wishes[i].text.substring(0, 40) + '...' : wishes[i].text;
      wishOptions += '<option value="' + wishes[i].id + '">' + escHtml(txt) + '</option>';
    }
    panel.innerHTML =
      '<div style="color:var(--gold);font-size:0.95rem;font-family:var(--font-display);text-align:center;">\uD83C\uDFEE Lantern World</div>' +
      '<div style="font-size:0.7rem;color:#6b5f52;text-align:center;margin-bottom:4px;">Choose a wish and release it into the night sky</div>' +
      '<select id="lanternWishSelect" style="width:100%;padding:0.5rem;border-radius:8px;background:rgba(255,220,160,.06);border:1px solid rgba(255,210,150,.15);color:#ffebd2;font-family:inherit;font-size:0.8rem;">' + wishOptions + '</select>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">' +
        '<div><label style="font-size:0.65rem;color:#6b5f52;display:block;">Colour</label><input type="color" id="lanternColour" value="#ffcc44" style="width:40px;height:30px;border:none;border-radius:4px;background:transparent;cursor:pointer;"></div>' +
        '<div><label style="font-size:0.65rem;color:#6b5f52;display:block;">Glow</label><input type="range" id="lanternGlow" min="0.3" max="2" step="0.1" value="1" style="width:60px;"></div>' +
        '<div><label style="font-size:0.65rem;color:#6b5f52;display:block;">Size</label><input type="range" id="lanternSize" min="0.5" max="1.5" step="0.1" value="1" style="width:60px;"></div>' +
        '<div><label style="font-size:0.65rem;color:#6b5f52;display:block;">Trail</label><input type="range" id="lanternTrail" min="0" max="1" step="0.1" value="0.5" style="width:60px;"></div>' +
      '</div>' +
      '<button id="releaseLanternBtn" style="width:100%;padding:0.6rem;border-radius:8px;background:rgba(255,230,128,.12);border:1px solid #ffe680;color:#ffe680;font-family:var(--font-display);font-size:0.85rem;cursor:pointer;transition:all 0.3s;" disabled>\uD83C\uDFEE Release Lantern</button>';

    panel.querySelector('#lanternWishSelect').addEventListener('change', function () {
      panel.querySelector('#releaseLanternBtn').disabled = !this.value;
    });

    // Canvas setup
    var ctx = canvas.getContext('2d');
    var W, H;
    var lanterns = [];
    var releasedLanterns = [];
    var stars = [];
    var running = true;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    }
    resize();

    // Generate background stars
    for (var si = 0; si < 100; si++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.6, r: 0.5 + Math.random() * 1.5, b: 0.3 + Math.random() * 0.7, s: 0.5 + Math.random() * 1.5 });
    }

    function drawStars(time) {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var twinkle = 0.5 + 0.5 * Math.sin(time * s.s + i);
        ctx.globalAlpha = s.b * twinkle;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Draw floating lanterns (ambient)
    function spawnAmbientLantern() {
      if (lanterns.length > 8) return;
      var x = Math.random() * W * 1.2 - W * 0.1;
      var colours = ['#ff6644', '#ff8844', '#ffaa44', '#ffcc44', '#ffdd66', '#ff8866', '#ff6666'];
      lanterns.push({
        x: x,
        y: H + 30,
        speed: 0.2 + Math.random() * 0.3,
        r: 6 + Math.random() * 4,
        colour: colours[Math.floor(Math.random() * colours.length)],
        alpha: 0.3 + Math.random() * 0.3,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.01 + Math.random() * 0.02
      });
    }

    setInterval(function () {
      if (!running) return;
      if (Math.random() < 0.05) spawnAmbientLantern();
    }, 2000);

    // Draw ambient lanterns
    function drawAmbientLanterns() {
      for (var i = lanterns.length - 1; i >= 0; i--) {
        var l = lanterns[i];
        l.y -= l.speed;
        l.drift += l.driftSpeed;
        l.x += Math.sin(l.drift) * 0.5;

        if (l.y < -60) { lanterns.splice(i, 1); continue; }

        var size = l.r;
        ctx.save();
        ctx.globalAlpha = l.alpha;

        // Glow
        var grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, size * 3);
        grad.addColorStop(0, l.colour + '40');
        grad.addColorStop(1, l.colour + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(l.x, l.y, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.shadowColor = l.colour;
        ctx.shadowBlur = size * 4;
        ctx.fillStyle = l.colour;
        ctx.beginPath();
        ctx.arc(l.x, l.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(l.x - size * 0.2, l.y - size * 0.2, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Released lantern animation
    function releaseLantern(wishId, colour, glow, size, trail) {
      var wish = null;
      var allWishes = getJournal();
      for (var i = 0; i < allWishes.length; i++) {
        if (allWishes[i].id === wishId) { wish = allWishes[i]; break; }
      }
      if (!wish) return;

      colour = colour || '#ffcc44';
      glow = parseFloat(glow) || 1;
      size = parseFloat(size) || 1;
      trail = parseFloat(trail) || 0.5;

      var x = W / 2 + (Math.random() - 0.5) * 100;
      var y = H - 80;

      releasedLanterns.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.5,
        colour: colour,
        baseGlow: glow,
        baseSize: size,
        trail: trail,
        r: 10 * size,
        life: 0,
        maxLife: 600,
        wish: wish,
        sparks: [],
        flamePhase: 0
      });

      markReleased(wishId, colour, glow, size);
    }

    function drawReleasedLanterns() {
      for (var i = releasedLanterns.length - 1; i >= 0; i--) {
        var l = releasedLanterns[i];
        l.life++;
        l.flamePhase += 0.05;
        l.x += l.vx + Math.sin(l.life * 0.01) * 0.2;
        l.y += l.vy;
        l.vy *= 0.998;
        l.vy -= 0.001;

        // Fade near end
        var lifeRatio = l.life / l.maxLife;
        var alpha = lifeRatio > 0.7 ? 1 - (lifeRatio - 0.7) / 0.3 : 1;
        if (alpha <= 0 || l.y < -100) { releasedLanterns.splice(i, 1); continue; }

        var r = l.r;
        var flicker = 0.9 + 0.1 * Math.sin(l.flamePhase * 2);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Trail
        if (l.trail > 0) {
          ctx.shadowBlur = 0;
          for (var t = 0; t < 5; t++) {
            var tp = t / 5;
            var tx = l.x - l.vx * tp * 20 + Math.sin(l.flamePhase + t) * 2;
            var ty = l.y - l.vy * tp * 20;
            ctx.fillStyle = l.colour + Math.round(tp * 40 * l.trail).toString(16).padStart(2, '0');
            var tr = r * (1 - tp * 0.7) * flicker * 0.5;
            ctx.beginPath();
            ctx.arc(tx, ty, tr, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Outer glow
        var grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r * 5 * l.baseGlow);
        grad.addColorStop(0, l.colour + Math.round(60 * l.baseGlow).toString(16).padStart(2, '0'));
        grad.addColorStop(0.5, l.colour + '20');
        grad.addColorStop(1, l.colour + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(l.x, l.y, r * 5 * l.baseGlow, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        ctx.shadowColor = l.colour;
        ctx.shadowBlur = r * 4 * l.baseGlow;
        ctx.fillStyle = l.colour;
        ctx.beginPath();
        ctx.arc(l.x, l.y, r * flicker, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fffbe6';
        ctx.beginPath();
        ctx.arc(l.x - r * 0.15 * flicker, l.y - r * 0.2 * flicker, r * 0.35 * flicker, 0, Math.PI * 2);
        ctx.fill();

        // Flame flicker animation
        var fx = l.x + Math.sin(l.flamePhase) * r * 0.3;
        var fy = l.y - r * 0.8;
        ctx.fillStyle = 'rgba(255,200,100,0.3)';
        ctx.beginPath();
        ctx.arc(fx, fy, r * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Spawn spark particles
        if (Math.random() < 0.1 * l.baseSize) {
          l.sparks.push({
            x: l.x + (Math.random() - 0.5) * r,
            y: l.y + (Math.random() - 0.5) * r,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2 - 0.5,
            life: 0,
            maxLife: 20 + Math.random() * 20,
            r: 1 + Math.random() * 2
          });
        }

        // Draw sparks
        for (var si2 = l.sparks.length - 1; si2 >= 0; si2--) {
          var sp = l.sparks[si2];
          sp.life++;
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.02;
          if (sp.life > sp.maxLife) { l.sparks.splice(si2, 1); continue; }
          ctx.save();
          ctx.globalAlpha = (1 - sp.life / sp.maxLife) * 0.8;
          ctx.fillStyle = l.colour;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.r * (1 - sp.life / sp.maxLife), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    var releaseInterval;
    function frame(time) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      // Deep gradient background
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0a0a1a');
      bg.addColorStop(0.5, '#1a1a3a');
      bg.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      drawStars(time * 0.001);
      drawAmbientLanterns();
      drawReleasedLanterns();

      releaseInterval = requestAnimationFrame(frame);
    }

    frame(0);

    // Release button handler
    panel.querySelector('#releaseLanternBtn').addEventListener('click', function () {
      var select = panel.querySelector('#lanternWishSelect');
      var wishId = select.value;
      if (!wishId) return;
      var colour = panel.querySelector('#lanternColour').value;
      var glow = panel.querySelector('#lanternGlow').value;
      var size = panel.querySelector('#lanternSize').value;
      var trail = panel.querySelector('#lanternTrail').value;

      releaseLantern(wishId, colour, glow, size, trail);

      var released = 0;
      try { released = parseInt(localStorage.getItem('ash-lanterns-released') || '0', 10) + 1; localStorage.setItem('ash-lanterns-released', released); } catch (e) {}

      toast('\uD83C\uDFEE Lantern released! (' + released + ' total)', 'rgba(255,200,100,0.85)', 3000);
    });

    document.body.appendChild(overlay);
    overlay.style.animation = 'fadeIn 0.5s ease';

    window._closeLanternWorld = closeLanternWorld;

    function closeLanternWorld() {
      running = false;
      if (releaseInterval) cancelAnimationFrame(releaseInterval);
      if (overlay.parentNode) overlay.remove();
      document.removeEventListener('keydown', escListener);
    }

    function escListener(e) {
      if (e.key === 'Escape') closeLanternWorld();
    }
    document.addEventListener('keydown', escListener);
  }

  /* ===================== ENHANCED TOAST ===================== */
  function showInteractiveToast(msg, onSave) {
    var existing = document.getElementById('interactiveToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'interactiveToast';
    toast.style.cssText = 'position:fixed;bottom:50%;left:50%;transform:translate(-50%,50%);z-index:99999;background:rgba(24,18,20,0.95);backdrop-filter:blur(12px);border:1px solid rgba(255,210,150,.15);border-radius:16px;padding:1rem 1.2rem;max-width:320px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.6);animation:toastIn 0.3s ease;';
    toast.innerHTML =
      '<div style="font-size:0.9rem;color:var(--parchment);margin-bottom:0.6rem;">' + msg + '</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button class="toast-save" style="background:rgba(255,230,128,.12);border:1px solid #ffe680;color:#ffe680;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;font-family:var(--font-display);font-size:0.75rem;">\u2728 Save as Wish</button>' +
        '<button class="toast-dismiss" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#6b5f52;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;font-family:var(--font-display);font-size:0.75rem;">Dismiss</button>' +
      '</div>';
    document.body.appendChild(toast);

    toast.querySelector('.toast-save').addEventListener('click', function () {
      if (onSave) onSave();
      toast.remove();
    });
    toast.querySelector('.toast-dismiss').addEventListener('click', function () {
      toast.remove();
    });

    // Auto-dismiss after 6s
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 6000);

    // Add CSS animation if not exists
    if (!document.getElementById('toastAnimStyle')) {
      var s = document.createElement('style');
      s.id = 'toastAnimStyle';
      s.textContent = '@keyframes toastIn{from{opacity:0;transform:translate(-50%,50%) scale(0.9)}to{opacity:1;transform:translate(-50%,50%) scale(1)}}';
      document.head.appendChild(s);
    }
  }

  function showWishSavePrompt(msg) {
    showInteractiveToast(msg, function () {
      // Extract message without emoji prefix
      var cleanMsg = msg.replace(/^[^\s]+\s/, '');
      addWish(cleanMsg, 'interaction');
      toast('\u2B50 Wish saved!', 'rgba(255,230,128,0.8)', 2000);
    });
  }

  /* ===================== TOAST (lightweight) ===================== */
  function toast(msg, bg, duration) {
    var existing = document.getElementById('_enh_toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = '_enh_toast';
    el.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(22,20,18,.92);backdrop-filter:blur(12px);border:1px solid rgba(255,210,150,.12);border-radius:10px;padding:.7rem 1.5rem;color:#ffebd2;font-size:.85rem;opacity:0;transition:all .35s ease;z-index:99999;pointer-events:none;font-family:Lora,Georgia,serif;';
    if (bg) el.style.background = bg;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(function () { if (el.parentNode) el.remove(); }, 400);
    }, duration || 2500);
  }

  /* ===================== HELPERS ===================== */
  function escHtml(str) {
    if (typeof str !== 'string') return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ===================== INIT ===================== */
  function init() {
    try { enhanceStarCatching(); } catch (e) {}
    try { enhanceFireflyJar(); } catch (e) {}
    try { initButterflyCatching(); } catch (e) {}
    try { enhanceBubbleMessages(); } catch (e) {}
    try { initLeafTrails(); } catch (e) {}
    try { initPaperBoats(); } catch (e) {}
    try { enhanceLostBalloon(); } catch (e) {}
    try { initDandelions(); } catch (e) {}
    try { initRainRipples(); } catch (e) {}
    try { if (!window.FeatureFlags || window.FeatureFlags.get('wish-journal')) initWishJournal(); } catch (e) {}
    try { if (!window.FeatureFlags || window.FeatureFlags.get('wish-system')) initLanternWorld(); } catch (e) {}

    // Sync existing wishes from old system
    setTimeout(function () {
      try {
        var obsCfg = JSON.parse(localStorage.getItem('ash-obs')) || {};
        if (obsCfg.wishes && obsCfg.wishes.length) {
          var journal = getJournal();
          var existingIds = {};
          for (var i = 0; i < journal.length; i++) existingIds[journal[i].text + journal[i].createdAt] = true;

          for (var j = 0; j < obsCfg.wishes.length; j++) {
            var w = obsCfg.wishes[j];
            var key = w.text + w.at;
            if (!existingIds[key]) {
              var wish = {
                id: generateId(),
                text: w.text,
                createdAt: w.at || Date.now(),
                source: 'observatory',
                granted: false,
                grantedAt: null,
                favourite: false,
                released: false,
                releasedAt: null
              };
              journal.push(wish);
              syncWishToFirebase(wish);
            }
          }
          saveJournal(journal);
        }
      } catch (e) {}
    }, 1000);
  }

  // Expose public API
  window.WishSystem = {
    addWish: addWish,
    grantWish: grantWish,
    toggleFavourite: toggleFavourite,
    markReleased: markReleased,
    deleteWish: deleteWish,
    getJournal: getJournal,
    openLanternWorld: openLanternWorld
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
