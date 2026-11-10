/* ===================================================================
   SKY OBSERVATORY — browse, discover, and collect skies
   Requires: skies.js (window.Skies)
   Loads on: sky-observatory.html only
   =================================================================== */
(function () {
  'use strict';

  var OBS_KEY = 'ash-obs';
  var FAV_KEY = 'ash-obs-favs';
  var RECENT_KEY = 'ash-obs-recent';
  var MOON_KEY = 'ash-obs-moon';
  var STAR_KEY = 'ash-obs-star';
  var RADIO_KEY = 'ash-obs-radio';

  var config = {};

  function defaults() {
    try {
      config = JSON.parse(localStorage.getItem(OBS_KEY)) || {};
    } catch (e) { config = {}; }
    if (!config.favorites) config.favorites = [];
    if (!config.recent) config.recent = [];
    if (!config.moonClicks) config.moonClicks = 0;
    if (!config.luckyStar) config.luckyStar = {};
    if (!config.radio) config.radio = false;
    if (!config.coffeeAt) config.coffeeAt = 0;
    if (!config.feathers) config.feathers = { count: 0, rewards: [] };
    if (!config.fireflies) config.fireflies = { caught: 0 };
    if (!config.wishes) config.wishes = [];
    if (!config.balloonNotes) config.balloonNotes = [];
    if (!config.fragments) config.fragments = [];
    if (!config.invisibleMsgs) config.invisibleMsgs = [];
  }
  function save() {
    try { localStorage.setItem(OBS_KEY, JSON.stringify(config)); } catch (e) {}
  }
  defaults();

  /* ---------- category filter state ---------- */
  var activeCat = 'All';
  function setActiveCat(cat) {
    activeCat = cat;
    var bar = document.getElementById('obsCats');
    if (!bar) return;
    bar.querySelectorAll('button').forEach(function(b) {
      if (b.dataset.cat === cat) {
        b.style.background = 'rgba(255,230,128,.15)';
        b.style.borderColor = 'rgba(255,230,128,.35)';
        b.style.color = 'var(--gold)';
      } else {
        b.style.background = 'var(--glass)';
        b.style.borderColor = 'var(--glassBorder)';
        b.style.color = 'var(--parchment-dim)';
      }
    });
  }

  /* ---------- categories ---------- */
  function getCategory(sky) {
    var n = (sky.name || '').toLowerCase();
    if (sky.storm || n.indexOf('storm')>=0 || n.indexOf('thunder')>=0) return 'Storm';
    if (sky.rainbow || n.indexOf('rainbow')>=0) return 'Rainbow';
    if (n.indexOf('aurora')>=0 || n.indexOf('northern')>=0 || n.indexOf('emerald')>=0 || n.indexOf('cyan')>=0 || n.indexOf('purple aurora')>=0) return 'Aurora';
    if (n.indexOf('galaxy')>=0 || n.indexOf('nebula')>=0 || n.indexOf('cosmic')>=0 || n.indexOf('space')>=0 || n.indexOf('stardust')>=0 || n.indexOf('void')>=0 || n.indexOf('starfall')>=0 || n.indexOf('binary')>=0) return 'Cosmic';
    if (sky.particles) {
      for (var i=0;i<sky.particles.length;i++) {
        var t = sky.particles[i].type;
        if (t === 'rain') return 'Rain';
        if (t === 'snow') return 'Snow';
        if (t === 'petal' || t === 'leaf') return 'Seasonal';
      }
    }
    if (sky.waves || n.indexOf('ocean')>=0 || n.indexOf('coastal')>=0 || n.indexOf('misty coast')>=0 || n.indexOf('glacier')>=0 || n.indexOf('white sands')>=0) return 'Water';
    if (n.indexOf('sunrise')>=0 || n.indexOf('dawn')>=0 || n.indexOf('morning')>=0 || n.indexOf('creamy')>=0) return 'Dawn';
    if (n.indexOf('sunset')>=0 || n.indexOf('dusk')>=0 || n.indexOf('twilight')>=0 || n.indexOf('desert dusk')>=0 || n.indexOf('golden hour')>=0 || n.indexOf('harvest')>=0 || n.indexOf('autumn sunset')>=0) return 'Sunset';
    if (n.indexOf('night')>=0 || n.indexOf('midnight')>=0 || n.indexOf('eclipse')>=0 || n.indexOf('moon')>=0 || n.indexOf('starry')>=0 || n.indexOf('star')>=0 && n.indexOf('starfall')<0 || n.indexOf('meteor')>=0 || n.indexOf('shooting')>=0) return 'Night';
    if (n.indexOf('fog')>=0 || n.indexOf('mist')>=0) return 'Fog';
    if (n.indexOf('firefl')>=0 || n.indexOf('campfire')>=0 || n.indexOf('lantern')>=0 || n.indexOf('candle')>=0) return 'Cozy';
    if (n.indexOf('sakura')>=0 || n.indexOf('cherry')>=0 || n.indexOf('spring')>=0 || n.indexOf('meadow')>=0 || n.indexOf('butterfl')>=0 || n.indexOf('forest')>=0 || n.indexOf('jungle')>=0 || n.indexOf('wisteria')>=0 || n.indexOf('lavender')>=0) return 'Nature';
    if (n.indexOf('cotton')>=0 || n.indexOf('dream')>=0 || n.indexOf('bubble')>=0 || n.indexOf('heaven')>=0 || n.indexOf('celestial')>=0 || n.indexOf('fantasy')>=0 || n.indexOf('infinite')>=0 || n.indexOf('rose nebula')>=0 || n.indexOf('cosmic bloom')>=0) return 'Fantasy';
    if (sky.lights && sky.lights.length && sky.lights[0].y < 0.35) return 'Day';
    return 'Misc';
  }

  function getMoodTags(sky) {
    var tags = [], n = (sky.name || '').toLowerCase();
    if (sky.stars) { tags.push('starry'); if (sky.stars.count > 100) tags.push('dense'); }
    if (sky.aurora) tags.push('aurora');
    if (sky.lights && sky.lights.length) tags.push(sky.lights[0].eclipse ? 'eclipse' : 'glowing');
    if (sky.rainbow) tags.push('rainbow');
    if (sky.storm) tags.push('stormy');
    if (sky.clouds) tags.push('cloudy');
    if (sky.particles) {
      for (var i=0;i<sky.particles.length;i++) {
        var t = sky.particles[i].type;
        if (t==='rain') tags.push('rainy');
        else if (t==='snow') tags.push('snowy');
        else if (t==='petal'||t==='leaf') tags.push('floating');
        else if (t==='firefly') tags.push('magical');
        else if (t==='meteor') tags.push('shooting');
        else if (t==='ember') tags.push('warm');
      }
    }
    if (sky.waves) tags.push('waves');
    if (n.indexOf('romantic')>=0||n.indexOf('love')>=0||n.indexOf('infinite')>=0) tags.push('romantic');
    if (n.indexOf('dream')>=0||n.indexOf('fantasy')>=0||n.indexOf('magical')>=0) tags.push('dreamy');
    if (n.indexOf('calm')>=0||n.indexOf('quiet')>=0||n.indexOf('gentle')>=0||n.indexOf('soft')>=0) tags.push('calm');
    return tags;
  }

  /* ---------- helpers ---------- */
  function hexToRgba(hex, a) {
    var h = hex.replace('#','');
    if (h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h,16);
    return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
  }

  /* ---------- thumbnail rendering ---------- */
  function renderThumbnail(canvas, sky) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;

    // Gradient background
    if (sky.gradient && sky.gradient.length) {
      var grd = ctx.createLinearGradient(0, 0, 0, h);
      for (var i=0;i<sky.gradient.length;i++) {
        grd.addColorStop(sky.gradient[i][0], sky.gradient[i][1]);
      }
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(0, 0, w, h);
    }

    // Stars
    if (sky.stars) {
      var seed = sky.name.length;
      for (var si=0;si<Math.min(sky.stars.count,80);si++) {
        var sx = ((si*137.5+seed)%1)*w, sy = ((si*97.3+seed*3)%1)*h*0.8;
        var sr = sky.stars.minR + (sky.stars.maxR-sky.stars.minR)*((si*41.7)%1);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(sr*0.5,1), 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,240,'+(0.3+0.7*((si*53.1)%1))+')';
        ctx.fill();
      }
    }

    // Lights (sun/moon)
    if (sky.lights) {
      for (var li=0;li<sky.lights.length;li++) {
        var l = sky.lights[li];
        var lx = l.x*w, ly = l.y*h, lr = Math.max(l.r*0.3,8);
        if (l.eclipse) {
          ctx.beginPath();
          ctx.arc(lx, ly, lr*0.8, 0, Math.PI*2);
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(lx+lr*0.25, ly-lr*0.15, lr*0.6, 0, Math.PI*2);
          ctx.fillStyle = l.core || '#fff';
          ctx.fill();
        } else {
          var grd2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr*2);
          grd2.addColorStop(0, l.core || '#fff');
          grd2.addColorStop(0.4, l.glow || 'rgba(255,200,100,0.5)');
          grd2.addColorStop(1, 'transparent');
          ctx.fillStyle = grd2;
          ctx.fillRect(lx-lr*2, ly-lr*2, lr*4, lr*4);
        }
      }
    }

    // Clouds (simplified)
    if (sky.clouds) {
      for (var ci=0;ci<Math.min(sky.clouds.length,3);ci++) {
        var cl = sky.clouds[ci];
        var cx = ((ci*173+50)%1)*w, cy = cl.yMin*h + (cl.yMax-cl.yMin)*h*((ci*89)%1);
        var crad = Math.min(cl.minR,cl.maxR)*0.3;
        var ca = Math.min(cl.alpha||0.3,0.4);
        ctx.beginPath();
        ctx.ellipse(cx, cy, crad, crad*0.5, 0, 0, Math.PI*2);
        ctx.fillStyle = hexToRgba(cl.color||'#ffffff', ca);
        ctx.fill();
      }
    }

    // Aurora (simplified, seed-based for stable thumbnails)
    if (sky.aurora) {
      var aSeed = sky.name.length * 1000;
      for (var ai=0;ai<8;ai++) {
        var ay = 0.2*h + ai*0.1*h*Math.sin(ai*2+aSeed);
        ctx.beginPath();
        ctx.moveTo(0, ay);
        for (var ax=0;ax<=w;ax+=20) {
          ctx.lineTo(ax, ay+15*Math.sin(ax*0.03+ai*1.5+aSeed));
        }
        ctx.strokeStyle = sky.aurora.colors[ai%sky.aurora.colors.length] || 'rgba(100,200,255,0.15)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }

    // Name overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h-22, w, 22);
    ctx.fillStyle = '#ffebd2';
    ctx.font = '11px Georgia,serif';
    ctx.textAlign = 'center';
    ctx.fillText(sky.name, w/2, h-7);
  }

  /* ---------- observatory UI ---------- */
  var container, gridEl, searchEl, catBar, previewEl, selectedIdx = -1;

  function initUI() {
    // Replace page content
    var main = document.querySelector('main') || document.body;
    var header = main.querySelector('.page-header');
    if (header) {
      header.innerHTML = '<h1 style="font-family:var(--font-display);font-weight:600;font-size:clamp(2rem,7vw,3.5rem);color:var(--parchment);margin:0 0 0.3rem;text-shadow:0 0 30px rgba(255,230,128,.3),0 2px 4px rgba(0,0,0,.6)">\uD83D\uDD2D Sky Observatory</h1><p style="color:var(--parchment-dim);font-size:clamp(0.85rem,2vw,1rem);font-style:italic;margin:0">Browse every sky. Find your atmosphere.</p>';
    }

    var oldGrid = document.getElementById('galleryGrid');
    var oldLightbox = document.getElementById('lightbox');
    if (oldLightbox) oldLightbox.style.display = 'none';

    // Create observatory container
    var obs = document.createElement('div');
    obs.id = 'observatory';
    obs.style.cssText = 'max-width:1200px;margin:0 auto;padding:0 var(--pad-inline,1.25rem) 2rem;';

    // Search + categories bar
    var controls = document.createElement('div');
    controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:1rem;';

    searchEl = document.createElement('input');
    searchEl.id = 'obsSearch';
    searchEl.placeholder = '\uD83D\uDD0D Search skies...';
    searchEl.style.cssText = 'flex:1;min-width:160px;background:var(--glass);border:1px solid var(--glassBorder);color:var(--parchment);padding:0.55rem 0.9rem;border-radius:8px;font-family:var(--font-body);font-size:0.85rem;outline:none;transition:border-color 0.3s;';
    searchEl.addEventListener('input', function () { renderGrid(); });
    controls.appendChild(searchEl);

    catBar = document.createElement('div');
    catBar.id = 'obsCats';
    catBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    controls.appendChild(catBar);

    var timeBtn = document.createElement('button');
    timeBtn.id = 'obsTimeToggle';
    timeBtn.title = 'Toggle time-based filtering';
    timeBtn.style.cssText = 'padding:0.3rem 0.7rem;border-radius:6px;cursor:pointer;font-family:var(--font-body);font-size:0.75rem;transition:all 0.25s;background:var(--glass);border:1px solid var(--gold);color:var(--gold);';
    timeBtn.addEventListener('click', function() {
      timeFilterOn = !timeFilterOn;
      renderTimeToggle();
      renderGrid();
    });
    controls.appendChild(timeBtn);
    renderTimeToggle();

    obs.appendChild(controls);

    // Category buttons
    var CATS = ['All','Dawn','Day','Sunset','Night','Aurora','Cosmic','Rain','Snow','Storm','Rainbow','Fog','Water','Seasonal','Nature','Cozy','Fantasy','Misc'];
    CATS.forEach(function(c) {
      var btn = document.createElement('button');
      btn.textContent = c;
      btn.dataset.cat = c;
      btn.style.cssText = 'padding:0.3rem 0.7rem;border-radius:6px;cursor:pointer;font-family:var(--font-body);font-size:0.75rem;transition:all 0.25s;';
      btn.style.background = 'var(--glass)';
      btn.style.border = '1px solid var(--glassBorder)';
      btn.style.color = 'var(--parchment-dim)';
      btn.addEventListener('click', function() {
        setActiveCat(this.dataset.cat);
        renderGrid();
      });
      catBar.appendChild(btn);
    });

    // Recently viewed strip
    var recentStrip = document.createElement('div');
    recentStrip.id = 'obsRecent';
    recentStrip.style.cssText = 'margin-bottom:1rem;display:none;';
    obs.appendChild(recentStrip);

    // Grid
    gridEl = document.createElement('div');
    gridEl.id = 'obsGrid';
    gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:1.5rem;';
    obs.appendChild(gridEl);

    // Preview card
    previewEl = document.createElement('div');
    previewEl.id = 'obsPreview';
    previewEl.style.cssText = 'background:var(--glass);border:1px solid var(--glassBorder);border-radius:12px;padding:1rem;display:none;';
    obs.appendChild(previewEl);

    if (oldGrid) oldGrid.replaceWith(obs); else main.appendChild(obs);
    container = obs;
    setActiveCat('All');

    renderRecent();
    renderGrid();
  }

  /* ---------- time-based filter ---------- */
  function getTimePeriod() {
    return window.Skies && window.Skies.getTimePeriod ? window.Skies.getTimePeriod() : (function(){var h=new Date().getHours();if(h>=5&&h<7)return'dawn';if(h>=7&&h<17)return'day';if(h>=17&&h<19)return'sunset';return'night';})();
  }

  var timeFilterOn = true;

  function renderTimeToggle() {
    var el = document.getElementById('obsTimeToggle');
    if (!el) return;
    var period = getTimePeriod();
    el.innerHTML = (timeFilterOn ? '\uD83D\uDD12 ' : '\uD83D\uDD13 ') + period;
    el.style.borderColor = timeFilterOn ? 'var(--gold)' : 'var(--glassBorder)';
    el.style.color = timeFilterOn ? 'var(--gold)' : 'var(--parchment-dim)';
  }

  function renderRecent() {
    var strip = document.getElementById('obsRecent');
    if (!strip || !config.recent.length) { if (strip) strip.style.display = 'none'; return; }
    var html = '<div style="font-size:0.75rem;color:var(--parchment-dim);margin-bottom:6px;">\uD83D\uDD0D Recently viewed</div><div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">';
    var SKIES = window.Skies && window.Skies.SKIES;
    if (!SKIES) return;
    for (var i=Math.max(0,config.recent.length-10);i<config.recent.length;i++) {
      var idx = config.recent[i];
      var sky = SKIES[idx];
      if (!sky) continue;
      var isFav = config.favorites.indexOf(idx) >= 0;
      html += '<div class="obs-recent-item" data-idx="'+idx+'" style="flex-shrink:0;width:100px;cursor:pointer;border-radius:8px;overflow:hidden;border:1px solid var(--glassBorder);transition:border-color 0.3s;" onclick="SkyObservatory.selectSky('+idx+')">';
      html += '<canvas width="200" height="120" style="width:100px;height:60px;display:block;"></canvas>';
      html += '<div style="padding:3px 5px;font-size:0.6rem;color:var(--parchment-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(isFav?'\u2605 ':'')+sky.name+'</div>';
      html += '</div>';
    }
    html += '</div>';
    strip.innerHTML = html;
    strip.style.display = '';
    // Render thumbnails for recent
    requestAnimationFrame(function() {
      strip.querySelectorAll('.obs-recent-item').forEach(function(el) {
        var idx = parseInt(el.dataset.idx);
        var sky = SKIES[idx];
        var cv = el.querySelector('canvas');
        if (cv && sky) renderThumbnail(cv, sky);
      });
    });
  }

  function renderGrid() {
    var SKIES = window.Skies && window.Skies.SKIES;
    if (!SKIES || !gridEl) return;
    var q = (searchEl.value || '').toLowerCase().trim();

    var filtered = [], indices = [];
    for (var i=0;i<SKIES.length;i++) {
      var sky = SKIES[i];
      if (!sky || !sky.name) continue;
      var cat = getCategory(sky);
      if (activeCat !== 'All' && cat !== activeCat) continue;
      if (timeFilterOn && window.Skies && window.Skies.timeMatch && !window.Skies.timeMatch(sky)) continue;
      if (q && sky.name.toLowerCase().indexOf(q) < 0) continue;
      filtered.push(sky);
      indices.push(i);
    }

    var html = '';
    for (var fi=0;fi<filtered.length;fi++) {
      var idx = indices[fi], sky = filtered[fi];
      var isFav = config.favorites.indexOf(idx) >= 0;
      html += '<div class="obs-sky-card" data-idx="'+idx+'" style="position:relative;border-radius:10px;overflow:hidden;background:var(--glass);border:2px solid '+(idx===selectedIdx?'var(--gold)':'var(--glassBorder)')+';cursor:pointer;transition:all 0.3s;" onclick="SkyObservatory.selectSky('+idx+')">';
      html += '<canvas width="300" height="180" style="width:100%;height:auto;aspect-ratio:300/180;display:block;"></canvas>';
      html += '<div style="padding:0.4rem 0.5rem;">';
      html += '<div style="font-size:0.72rem;font-family:var(--font-display);color:var(--parchment);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+sky.name+'</div>';
      html += '<div style="font-size:0.6rem;color:var(--ash);margin-top:2px;">'+getCategory(sky)+'</div>';
      html += '</div>';
      html += '<button class="obs-fav-btn" data-idx="'+idx+'" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.4);border:none;border-radius:50%;width:26px;height:26px;font-size:0.8rem;cursor:pointer;color:'+(isFav?'var(--gold)':'rgba(255,255,255,0.35)')+';z-index:2;transition:all 0.3s;" title="'+(isFav?'Remove from favorites':'Add to favorites')+'">'+(isFav?'\u2605':'\u2606')+'</button>';
      html += '</div>';
    }
    gridEl.innerHTML = html || '<div style="text-align:center;padding:3rem;color:var(--ash);font-style:italic;">No skies found \u2728</div>';

    // Render thumbnails
    requestAnimationFrame(function() {
      gridEl.querySelectorAll('.obs-sky-card canvas').forEach(function(cv) {
        var card = cv.closest('.obs-sky-card');
        var idx = parseInt(card.dataset.idx);
        var sky = SKIES[idx];
        if (sky) renderThumbnail(cv, sky);
      });
    });

    // Favorite buttons
    gridEl.querySelectorAll('.obs-fav-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.dataset.idx);
        var pos = config.favorites.indexOf(idx);
        if (pos >= 0) {
          config.favorites.splice(pos, 1);
          this.textContent = '\u2606';
          this.style.color = 'rgba(255,255,255,0.35)';
          this.title = 'Add to favorites';
        } else {
          config.favorites.push(idx);
          this.textContent = '\u2605';
          this.style.color = 'var(--gold)';
          this.title = 'Remove from favorites';
        }
        save();
      });
    });
  }

  function selectSky(idx) {
    var SKIES = window.Skies && window.Skies.SKIES;
    if (!SKIES || !SKIES[idx]) return;
    selectedIdx = idx;
    var sky = SKIES[idx];

    // Update recent
    var rp = config.recent.indexOf(idx);
    if (rp >= 0) config.recent.splice(rp, 1);
    config.recent.push(idx);
    if (config.recent.length > 20) config.recent.splice(0, config.recent.length-20);
    save();
    renderRecent();

    // Highlight card
    gridEl.querySelectorAll('.obs-sky-card').forEach(function(c) {
      c.style.borderColor = 'var(--glassBorder)';
    });
    var card = gridEl.querySelector('.obs-sky-card[data-idx="'+idx+'"]');
    if (card) card.style.borderColor = 'var(--gold)';

    // Show preview
    var isFav = config.favorites.indexOf(idx) >= 0;
    var tags = getMoodTags(sky);
    var prev = previewEl;
    prev.style.display = '';
    prev.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:1rem;">' +
      '<div style="flex:0 0 200px;">' +
        '<canvas id="obsPreviewCanvas" width="400" height="240" style="width:100%;height:auto;aspect-ratio:400/240;border-radius:8px;display:block;"></canvas>' +
      '</div>' +
      '<div style="flex:1;min-width:180px;">' +
        '<h3 style="margin:0 0 0.3rem;font-family:var(--font-display);color:var(--gold);font-size:1.1rem;">'+sky.name+'</h3>' +
        '<div style="font-size:0.75rem;color:var(--ash);margin-bottom:0.5rem;">'+getCategory(sky)+'</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:0.5rem;">' +
          tags.map(function(t){return '<span style="background:rgba(255,230,128,.1);border:1px solid rgba(255,230,128,.2);color:var(--gold);padding:2px 6px;border-radius:4px;font-size:0.65rem;">'+t+'</span>';}).join('') +
        '</div>' +
        '<p style="font-size:0.85rem;color:var(--parchment-dim);font-style:italic;line-height:1.5;margin:0 0 0.5rem;">'+(sky.message||'')+'</p>' +
        '<div style="font-size:0.6rem;color:var(--ash);font-family:monospace;letter-spacing:1px;margin-bottom:0.5rem;">DNA: '+getSkyDNA(sky)+'</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button id="obsApplyBtn" style="background:rgba(255,230,128,.15);border:1px solid rgba(255,230,128,.35);color:var(--gold);padding:0.5rem 1.2rem;border-radius:8px;cursor:pointer;font-family:var(--font-display);font-size:0.85rem;transition:all 0.3s;">\u2728 Apply Sky</button>' +
          '<button id="obsFavBtn" style="background:var(--glass);border:1px solid var(--glassBorder);color:'+(isFav?'var(--gold)':'var(--parchment-dim)')+';padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-family:var(--font-display);font-size:0.85rem;transition:all 0.3s;">'+(isFav?'\u2605 Favorited':'\u2606 Favorite')+'</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    requestAnimationFrame(function() {
      var cv = document.getElementById('obsPreviewCanvas');
      if (cv) renderThumbnail(cv, sky);
    });

    document.getElementById('obsApplyBtn').addEventListener('click', function() {
      if (window.Skies) {
        window.Skies.apply(idx);
        checkSecretCombos(idx);
      }
    });

    document.getElementById('obsFavBtn').addEventListener('click', function() {
      var pos = config.favorites.indexOf(idx);
      if (pos >= 0) {
        config.favorites.splice(pos, 1);
        this.textContent = '\u2606 Favorite';
        this.style.color = 'var(--parchment-dim)';
      } else {
        config.favorites.push(idx);
        this.textContent = '\u2605 Favorited';
        this.style.color = 'var(--gold)';
      }
      save();
      renderGrid();
    });
  }

  /* =====================================================
     PART 2 — ALL 10 FEATURES
     ===================================================== */

  /* ---------- 1. Secret Sky Combinations ---------- */
  var lastSkyIdx = -1;
  function checkSecretCombos(idx) {
    var SKIES = window.Skies && window.Skies.SKIES;
    if (!SKIES) return;
    var combo = null;
    var a = lastSkyIdx >= 0 ? SKIES[lastSkyIdx] : null;
    var b = SKIES[idx];
    if (a && b) {
      var an = (a.name||'').toLowerCase(), bn = (b.name||'').toLowerCase();
      if ((an.indexOf('aurora')>=0&&bn.indexOf('galaxy')>=0)||(bn.indexOf('aurora')>=0&&an.indexOf('galaxy')>=0)) combo = {name:'Aurora Galaxy', msg:'The galaxy meets the aurora — a secret sky unfolds \u2728'};
      if ((an.indexOf('storm')>=0&&bn.indexOf('sunset')>=0)||(bn.indexOf('storm')>=0&&an.indexOf('sunset')>=0)) combo = {name:'Storm Sunset', msg:'Chaos and beauty collide — a sky born from opposites \uD83C\uDF24\uFE0F\u26C8\uFE0F'};
      if ((an.indexOf('snow')>=0&&bn.indexOf('moon')>=0)||(bn.indexOf('snow')>=0&&an.indexOf('moon')>=0)) combo = {name:'Snow Moon', msg:'The moon watches the snowfall in secret \u2744\uFE0F\uD83C\uDF19'};
      if ((an.indexOf('rainbow')>=0&&bn.indexOf('aurora')>=0)||(bn.indexOf('rainbow')>=0&&an.indexOf('aurora')>=0)) combo = {name:'Prism Aurora', msg:'Rainbows and auroras merge into pure light \uD83C\uDF08\uD83C\uDF00'};
      if ((an.indexOf('firefly')>=0&&bn.indexOf('starry')>=0)||(bn.indexOf('firefly')>=0&&an.indexOf('starry')>=0)) combo = {name:'Firefly Stars', msg:'The stars come down to dance with the fireflies \u2728\uD83D\uDD25'};
      if ((an.indexOf('ocean')>=0&&bn.indexOf('aurora')>=0)||(bn.indexOf('ocean')>=0&&an.indexOf('aurora')>=0)) combo = {name:'Bioluminescent Wave', msg:'The ocean reflects the aurora — a secret revealed \uD83C\uDF0A\uD83C\uDF00'};
    }
    lastSkyIdx = idx;
    if (combo) {
      toast('\u2728 '+combo.name+'\n'+combo.msg, 'rgba(180,100,255,0.9)', 5000);
    }
  }

  /* ---------- 2. Random Black Cat ---------- */
  var catInterval = null;
  function initBlackCat() {
    if (catInterval) return;
    function startCatInterval() {
      return setInterval(function() {
        if (Math.random() > 0.006) return;
        spawnCat();
      }, 10000);
    }
    catInterval = startCatInterval();
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        clearInterval(catInterval);
        catInterval = startCatInterval();
      }
    });
  }

  var catW = 80, catH = 80, catCols = 6;
  var catStyle = document.createElement('style');
  catStyle.textContent = '@keyframes catWalk{0%{background-position:0 0}100%{background-position:-'+(catCols*catW)+'px 0}}';
  document.head.appendChild(catStyle);

  function spawnCat() {
    var cat = document.createElement('div');
    cat.style.cssText = 'position:fixed;bottom:10px;z-index:9999;pointer-events:auto;cursor:pointer;' +
      'width:'+catW+'px;height:'+catH+'px;' +
      'background:url("cat-animation.png") 0 0 / '+(catCols*catW)+'px '+(catH*4)+'px no-repeat;' +
      'animation:catWalk 0.7s steps('+catCols+') infinite;' +
      'transition:left 10s cubic-bezier(0.2,0.8,0.3,1);left:-100px;';
    document.body.appendChild(cat);

    requestAnimationFrame(function() {
      cat.style.left = (window.innerWidth + 100) + 'px';
    });

    var clicked = false;
    cat.addEventListener('click', function(e) {
      if (clicked) return;
      clicked = true;
      cat.style.animation = 'none';
      cat.style.transition = 'none';
      cat.style.left = (e.clientX - catW/2) + 'px';
      cat.style.backgroundPosition = '-'+(2*catW)+'px -'+(2*catH)+'px';
      cat.style.backgroundSize = (catCols*catW)+'px '+(catH*4)+'px';
      setTimeout(function() {
        cat.style.transition = 'left 1.8s ease-in';
        cat.style.left = '-100px';
        setTimeout(function() { cat.remove(); }, 2000);
      }, 1200);
    });

    setTimeout(function() {
      if (!clicked) cat.remove();
    }, 11000);
  }

  /* ---------- 3. Real Time World ---------- */
  function initRealTime() {
    var el = document.createElement('div');
    el.id = 'obsRealTime';
    el.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:100;font-size:0.65rem;color:var(--ash);font-family:var(--font-display);opacity:0.6;pointer-events:none;text-align:right;';
    document.body.appendChild(el);

    function updateTime() {
      var d = new Date();
      var h = d.getHours();
      var period = h<6?'Night':h<12?'Morning':h<17?'Afternoon':h<21?'Evening':'Night';
      var icon = period==='Morning'?'\uD83C\uDF05':period==='Afternoon'?'\u2600\uFE0F':period==='Evening'?'\uD83C\uDF07':'\uD83C\uDF19';
      var timeStr = d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      el.innerHTML = icon+' '+period+'<br>'+timeStr;
    }
    updateTime();
    setInterval(updateTime, 30000);
  }

  /* ---------- sky luminance ---------- */
  function hexLuminance(hex) {
    var h = hex.replace('#','');
    if (h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h,16);
    var r = (n>>16)&255, g = (n>>8)&255, b = n&255;
    return (0.299*r + 0.587*g + 0.114*b) / 255;
  }
  function getSkyLuminance() {
    var SKIES = window.Skies && window.Skies.SKIES;
    var idx = window.Skies && window.Skies.getCurrent();
    var sky = (idx >= 0 && SKIES && SKIES[idx]) ? SKIES[idx] : null;
    if (!sky || !sky.gradient || !sky.gradient.length) return 0.5;
    var total = 0, count = 0;
    for (var gi=0;gi<sky.gradient.length;gi++) {
      var c = sky.gradient[gi][1];
      if (c && c[0]==='#') { total += hexLuminance(c); count++; }
    }
    return count ? total/count : 0.5;
  }
  function updateMoonTheme(btn) {
    if (!btn) btn = document.getElementById('obsMoonBtn');
    if (!btn) return;
    var lum = getSkyLuminance();
    var isBright = lum > 0.5;
    btn.style.background = isBright ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.2)';
    btn.style.borderColor = isBright ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
    btn.style.color = isBright ? '#ffebd2' : '#1a1a2a';
    btn.style.boxShadow = isBright ? '0 0 12px rgba(255,200,100,0.15)' : '0 0 12px rgba(0,0,0,0.15)';
  }

  /* ---------- 4. Moon Click Counter ---------- */
  var moonMilestones = {
    5: '\u2728 First moon secret \u2014 she whispers to the night',
    10: '\uD83C\uDF19 Moon child \u2014 the stars lean closer',
    15: '\uD83C\uDF1B Crescent glow \u2014 a gentle smile in the dark',
    20: '\u2B50 Twenty clicks \u2014 the sky remembers your touch',
    25: '\uD83C\uDF1A New moon magic \u2014 something stirs in shadow...',
    30: '\uD83C\uDF15 Half-lit \u2014 balanced between earth and sky',
    35: '\u2728 Thirty-five \u2014 the moon keeps your secrets',
    40: '\uD83C\uDF12 Waxing strong \u2014 the light grows with you',
    45: '\uD83C\uDF14 Almost full \u2014 devotion written in orbit',
    50: '\uD83C\uDF1D Half moon wisdom \u2014 the sky knows your name'
  };
  function initMoonCounter() {
    if (typeof config.moonClicks !== 'number') config.moonClicks = 0;
    var moonBtn = document.createElement('button');
    moonBtn.id = 'obsMoonBtn';
    moonBtn.title = 'Click the moon \u2728';
    moonBtn.textContent = '\uD83C\uDF19';
    moonBtn.style.cssText = 'position:fixed;bottom:8rem;right:1rem;z-index:10000;border-radius:50%;width:40px;height:40px;font-size:1.2rem;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;justify-content:center;';
    moonBtn.addEventListener('click', function() {
      config.moonClicks = (config.moonClicks || 0) + 1;
      save();
      FB.put('stats', { moonClicks: config.moonClicks }).catch(function(){});
      var next = moonMilestones[config.moonClicks];
      if (next) {
        toast('\uD83C\uDF19 ' + next, 'rgba(200,180,255,0.9)', 5000);
        if (config.moonClicks === 25) spawnCat();
      } else {
        toast('\uD83C\uDF19 Moon click #'+config.moonClicks, 'rgba(200,180,255,0.6)', 1500);
      }
      // Moon Ripple
      var rect = moonBtn.getBoundingClientRect();
      var cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
      var ripple = document.createElement('div');
      ripple.style.cssText = 'position:fixed;left:'+(cx-30)+'px;top:'+(cy-30)+'px;width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,230,128,0.6);z-index:9999;pointer-events:none;animation:rippleAnim 1s ease-out forwards;';
      document.body.appendChild(ripple);
      setTimeout(function() { if (ripple.parentNode) ripple.remove(); }, 1200);
    });
    document.body.appendChild(moonBtn);
    updateMoonTheme(moonBtn);
  }

  /* ---------- 4b. Clean View Toggle ---------- */
  var cleanView = false;
  var obsUIElements = [];
  function initCleanViewToggle() {
    var btn = document.createElement('button');
    btn.id = 'obsCleanBtn';
    btn.title = 'Toggle clean view';
    btn.textContent = '\u25A1';
    btn.style.cssText = 'position:fixed;top:1rem;left:1rem;z-index:10001;background:var(--glass);border:1px solid var(--glassBorder);border-radius:50%;width:36px;height:36px;font-size:1rem;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;justify-content:center;color:var(--parchment-dim);';
    btn.addEventListener('click', function() {
      cleanView = !cleanView;
      btn.textContent = cleanView ? '\u25A3' : '\u25A1';
      btn.style.color = cleanView ? 'var(--gold)' : 'var(--parchment-dim)';
      btn.style.borderColor = cleanView ? 'var(--gold)' : 'var(--glassBorder)';
      var els = document.querySelectorAll(            '#observatory, #obsMoonBtn, #obsRealTime, #obsProgress, #obsLandscapeBtn, .footer, .page-header, #heartContainer, #skyBtnContainer, [href="stats.html"], [href="admin.html"]');
      els.forEach(function(el) {
        if (el) el.style.display = cleanView ? 'none' : '';
      });
      if (cleanView) toast('\u2728 Clean view — just the sky', 'rgba(255,230,128,0.7)', 2000);
      else toast('UI restored', 'rgba(255,230,128,0.7)', 1500);
    });
    document.body.appendChild(btn);
  }

  /* ---------- 4c. Landscape Toggle ---------- */
  var landscapeOn = (function () { try { return localStorage.getItem('sky-landscape-visible') === 'true'; } catch (e) { return false; } })();
  function initLandscapeToggle() {
    var btn = document.createElement('button');
    btn.id = 'obsLandscapeBtn';
    btn.title = 'Toggle landscape';
    btn.textContent = '☰ landscape';
    btn.style.cssText = 'position:fixed;top:calc(1rem + 42px);left:1rem;z-index:10001;background:rgba(255,220,160,.12);border:1px solid rgba(255,210,150,.35);border-radius:8px;padding:4px 10px;cursor:pointer;font-family:Georgia,serif;font-size:.75rem;color:var(--parchment-dim,#c7b8a1);transition:all .3s;';
    if (landscapeOn) { btn.style.color = '#ffe680'; btn.style.borderColor = '#ffe680'; btn.textContent = '☰ landscape on'; }
    btn.onclick = function() {
      landscapeOn = !landscapeOn;
      btn.textContent = landscapeOn ? '☰ landscape on' : '☰ landscape';
      btn.style.color = landscapeOn ? '#ffe680' : 'var(--parchment-dim,#c7b8a1)';
      btn.style.borderColor = landscapeOn ? '#ffe680' : 'rgba(255,210,150,.35)';
      try { localStorage.setItem('sky-landscape-visible', landscapeOn ? 'true' : 'false'); } catch (e) {}
      if (window.SkyLiving && window.SkyLiving.setLandscapeVisible) window.SkyLiving.setLandscapeVisible(landscapeOn);
      if (landscapeOn) toast('🌿 Landscape on', 'rgba(255,230,128,0.7)', 1500);
      else toast('Landscape off', 'rgba(255,230,128,0.7)', 1500);
    };
    document.body.appendChild(btn);
  }

  /* ---------- 5. Hidden Radio (type "radio") ---------- */
  var radioBuf = '';
  function initHiddenRadio() {
    document.addEventListener('keydown', function(e) {
      radioBuf += e.key.toLowerCase();
      if (radioBuf.length > 5) radioBuf = radioBuf.slice(-5);
      if (radioBuf === 'radio') {
        radioBuf = '';
        toggleRadio();
      }
    });
  }

  var radioPlayer = null;
  function toggleRadio() {
    if (radioPlayer && radioPlayer.style.display !== 'none') {
      radioPlayer.style.display = 'none';
      return;
    }
    if (!radioPlayer) {
      radioPlayer = document.createElement('div');
      radioPlayer.id = 'obsRadio';
      radioPlayer.innerHTML = '<div style="background:var(--ink-soft);border:1px solid var(--gold);border-radius:12px;padding:1rem;width:280px;box-shadow:0 8px 32px rgba(0,0,0,.6);">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:0.8rem;">' +
          '<span style="font-size:1.5rem;">\uD83D\uDCFB</span>' +
          '<span style="font-family:var(--font-display);color:var(--gold);font-size:0.9rem;">Cassette Player</span>' +
          '<button id="radioClose" style="margin-left:auto;background:none;border:none;color:var(--ash);cursor:pointer;font-size:1.2rem;">&times;</button>' +
        '</div>' +
        '<div style="text-align:center;margin-bottom:0.8rem;">' +
          '<div style="font-size:0.7rem;color:var(--ash);margin-bottom:4px;">Now Playing</div>' +
          '<div id="radioTrack" style="font-family:var(--font-display);color:var(--parchment);font-size:0.9rem;">Hidden Frequencies</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">' +
          '<button class="radio-btn" data-url="" style="background:var(--glass);border:1px solid var(--glassBorder);color:var(--parchment-dim);padding:0.3rem 0.6rem;border-radius:6px;cursor:pointer;font-size:0.7rem;">\u25B6 Play</button>' +
          '<button class="radio-btn" data-url="" style="background:var(--glass);border:1px solid var(--glassBorder);color:var(--parchment-dim);padding:0.3rem 0.6rem;border-radius:6px;cursor:pointer;font-size:0.7rem;">\u23F8 Pause</button>' +
        '</div>' +
      '</div>';
      radioPlayer.style.cssText = 'position:fixed;bottom:6rem;right:1rem;z-index:9999;';
      document.body.appendChild(radioPlayer);

      radioPlayer.querySelector('#radioClose').addEventListener('click', function() {
        radioPlayer.style.display = 'none';
      });
      radioPlayer.querySelectorAll('.radio-btn')[0].addEventListener('click', function() {
        // Create a subtle ambient tone
        try {
          var actx = new (window.AudioContext||window.webkitAudioContext)();
          var osc = actx.createOscillator();
          var gain = actx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 432;
          gain.gain.setValueAtTime(0, actx.currentTime);
          gain.gain.linearRampToValueAtTime(0.08, actx.currentTime + 2);
          osc.connect(gain);
          gain.connect(actx.destination);
          osc.start(actx.currentTime);
          osc.stop(actx.currentTime + 8);
          gain.gain.linearRampToValueAtTime(0, actx.currentTime + 8);
        } catch(e) {}
        document.getElementById('radioTrack').textContent = '432 Hz \u2661 For you';
      });
      radioPlayer.querySelectorAll('.radio-btn')[1].addEventListener('click', function() {
        document.getElementById('radioTrack').textContent = 'Paused \u2728';
      });

      config.radio = true;
      save();
    }
    radioPlayer.style.display = '';
    toast('\uD83D\uDCFB Hidden radio found!', 'rgba(200,180,255,0.85)', 3000);
  }

  /* ---------- 6. Konami Code ---------- */
  var konamiBuf = [];
  var KONAMI = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
  var devMode = false;
  function initKonami() {
    document.addEventListener('keydown', function(e) {
      konamiBuf.push(e.key.toLowerCase());
      if (konamiBuf.length > 10) konamiBuf.shift();
      if (konamiBuf.length === 10 && konamiBuf.every(function(v,i){return v===KONAMI[i];})) {
        konamiBuf = [];
        toggleDevMode();
      }
    });
    console.log('Konami handler ready');
  }
  function toggleDevMode() {
    devMode = !devMode;
    if (devMode) {
      toast('\uD83D\uDD25 Developer Sky Mode ACTIVATED', 'rgba(0,200,255,0.9)', 5000);
      document.body.style.boxShadow = 'inset 0 0 100px rgba(0,255,200,0.15)';
      document.body.style.border = '3px solid rgba(0,255,200,0.3)';
      // Apply a neon sky
      if (window.Skies && window.Skies.SKIES) {
        var neon = {gradient:[[0,"#000033"],[0.3,"#0a0a4a"],[0.6,"#151565"],[1,"#0a0a3a"]],stars:{count:200,maxY:100,minR:0.5,maxR:2.5},aurora:{colors:["rgba(0,255,200,.35)","rgba(255,0,200,.3)","rgba(0,200,255,.25)"],speed:0.08,band:100,thickness:80},name:'Developer Sky',message:'\u2728 You found the neon dimension \u2728'};
        window.Skies.SKIES.push(neon);
        window.Skies.apply(window.Skies.SKIES.length-1);
      }
    } else {
      toast('Dev mode deactivated', 'rgba(200,0,0,0.8)', 3000);
      document.body.style.boxShadow = 'none';
      document.body.style.border = 'none';
    }
  }

  /* ---------- 8. Double Rainbow ---------- */
  var lastRainIdx = -1;
  function initDoubleRainbow() {
    _afterApply.push(function(idx) {
      var sky = window.Skies && window.Skies.SKIES && window.Skies.SKIES[idx];
      if (!sky) return;
      var n = (sky.name||'').toLowerCase();
      var isRain = n.indexOf('rain')>=0||n.indexOf('storm')>=0||n.indexOf('shower')>=0;
      if (isRain && lastRainIdx !== idx && Math.random() < 0.2) {
        setTimeout(function() { showRainbow(false); }, 3000);
        if (Math.random() < 0.08) {
          setTimeout(function() { showRainbow(true); }, 4000);
        }
      }
      lastRainIdx = idx;
    });
  }

  function showRainbow(double) {
    var r = document.createElement('div');
    r.style.cssText = 'position:fixed;bottom:3rem;left:50%;transform:translateX(-50%);z-index:9998;pointer-events:none;font-size:'+(double?'6rem':'3.5rem')+';opacity:0;transition:opacity 2s ease;animation:rainbowGlow 4s ease-in-out;';
    r.textContent = double?'\uD83C\uDF08\uD83C\uDF08':'\uD83C\uDF08';
    document.body.appendChild(r);
    requestAnimationFrame(function() { r.style.opacity = '1'; });
    setTimeout(function() {
      r.style.opacity = '0';
      setTimeout(function() { r.remove(); }, 2000);
    }, 5000);
    if (double) toast('\uD83C\uDF08 DOUBLE RAINBOW! \uD83C\uDF08', 'rgba(255,200,100,0.9)', 6000);
  }

  /* ---------- 10. Progress Memories ---------- */
  function initProgress() {
    var el = document.createElement('div');
    el.id = 'obsProgress';
    el.style.cssText = 'position:fixed;bottom:5rem;left:1rem;z-index:100;background:var(--glass);border:1px solid var(--glassBorder);border-radius:12px;padding:0.7rem 1rem;backdrop-filter:blur(8px);font-size:0.75rem;max-width:200px;cursor:pointer;transition:all 0.3s;';
    el.addEventListener('mouseenter', function() { this.style.borderColor = 'var(--gold)'; });
    el.addEventListener('mouseleave', function() { this.style.borderColor = 'var(--glassBorder)'; });
    el.addEventListener('click', function() { window.location.href = 'stats.html'; });

    function updateProgress() {
      var pages = [
        {key:'100-organs',file:'100-organs.html',label:'100 Organs'},
        {key:'love',file:'love.html',label:'Love'},
        {key:'fantasies',file:'fantasies.html',label:'Fantasies'}
      ];
      var total = 0, viewed = 0;
      var loaded = 0;
      pages.forEach(function(p) {
        var vk = 'ash-viewed-' + ('/' + p.file).replace(/[^a-z0-9]/gi,'_');
        var lk = vk + '_count';
        try {
          var v = JSON.parse(localStorage.getItem(vk) || '[]');
          var count = parseInt(localStorage.getItem(lk) || '0');
          total += count;
          viewed += v.length;
        } catch(e) {}
        FB.get('viewed', p.key).then(function(d) {
          if (d && d.data) {
            if (d.data.entries) {
              viewed += d.data.entries.length;
            }
            if (d.data.count) {
              total += parseInt(d.data.count);
            }
          }
          loaded++;
          if (loaded === pages.length) renderProgress();
        }).catch(function() { loaded++; if (loaded === pages.length) renderProgress(); });
      });
      function renderProgress() {
        var pct = total > 0 ? Math.min(100, Math.round(viewed/total*100)) : 0;
        if (total === 0) { el.style.display = 'none'; return; }
        el.style.display = '';
        el.innerHTML = '<div style="font-family:var(--font-display);color:var(--gold);margin-bottom:4px;">\uD83D\uDCD6 Progress</div>' +
          '<div style="color:var(--parchment-dim);">' + viewed + ' / ' + total + ' memories</div>' +
          '<div style="margin-top:4px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">' +
            '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--gold),var(--ember));border-radius:2px;transition:width 0.6s ease;"></div>' +
          '</div>' +
          '<div style="font-size:0.6rem;color:var(--ash);margin-top:2px;">Click for details</div>';
      }
      renderProgress();
    }
    updateProgress();
    document.body.appendChild(el);
    setInterval(updateProgress, 30000);
  }

  /* =====================================================
     PART 3 — FEATURES 11–20
     ===================================================== */

  /* ---------- 11. Feather Collector ---------- */
  /* ---------- 12. Daily Sky ---------- */
  function initDailySky() {
    var SKIES = window.Skies && window.Skies.SKIES;
    if (!SKIES) return;
    var today = new Date();
    var dateStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var hash = 0;
    for (var di=0;di<dateStr.length;di++) { hash = ((hash<<5)-hash)+dateStr.charCodeAt(di); hash &= hash; }
    var idx = Math.abs(hash) % SKIES.length;
    var dailyEl = document.createElement('div');
    dailyEl.id = 'obsDaily';
    dailyEl.style.cssText = 'margin-bottom:0.8rem;padding:0.45rem 0.8rem;background:rgba(255,230,128,.08);border:1px solid rgba(255,230,128,.2);border-radius:8px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:all 0.3s;';
    dailyEl.innerHTML = '<span style="font-size:1rem;">\uD83C\uDF1F</span><span style="font-size:0.75rem;color:var(--gold);font-family:var(--font-display);">Sky of the Day</span><span style="font-size:0.7rem;color:var(--parchment-dim);margin-left:auto;">'+SKIES[idx].name+'</span>';
    dailyEl.addEventListener('mouseenter', function() { this.style.borderColor = 'var(--gold)'; });
    dailyEl.addEventListener('mouseleave', function() { this.style.borderColor = 'rgba(255,230,128,.2)'; });
    dailyEl.addEventListener('click', function() { SkyObservatory.selectSky(idx); });
    var controls = document.getElementById('obsCats');
    if (controls) {
      var parent = controls.parentNode;
      parent.insertBefore(dailyEl, controls.nextSibling);
    }
  }

  /* ---------- 13. Sky DNA ---------- */
  function getSkyDNA(sky) {
    if (!sky) return '';
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var seed = (sky.name||'').length * 13 + ((sky.gradient&&sky.gradient.length)||0) * 7 + (sky.stars?Math.min(sky.stars.count,500):0) * 3 + (sky.clouds?sky.clouds.length:0) * 11 + (sky.particles?sky.particles.length:0) * 5 + (sky.lights?sky.lights.length:0) * 17;
    var dna = '', s = seed || 1;
    for (var dnai=0;dnai<8;dnai++) {
      s = (s * 9301 + 49297) % 233280;
      dna += chars[Math.floor((s / 233280) * chars.length)];
    }
    return dna;
  }

  /* ---------- 14. Firefly Jar ---------- */
  function initFireflyJar() {
    var JAR_SVG = '<svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="0" width="16" height="4" rx="1" fill="#b8860b"/><rect x="4" y="4" width="20" height="2" rx="1" fill="#daa520"/><path d="M4 6C4 6 2 10 2 18C2 24 6 28 14 28C22 28 26 24 26 18C26 10 24 6 24 6H4Z" fill="rgba(255,230,100,0.15)" stroke="#daa520" stroke-width="1.5"/><ellipse cx="14" cy="20" rx="3" ry="4" fill="rgba(255,230,100,0.6)"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/></ellipse></svg>';
    var FIREFLY_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="8" cy="10" rx="2" ry="3" fill="#2a1a00"/><ellipse cx="8" cy="10" rx="1.5" ry="2.5" fill="#3d2b00"/><circle cx="8" cy="12" r="2.5" fill="%GLOW%"><animate attributeName="r" values="2;3;2" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/></circle><ellipse cx="5.5" cy="7" rx="2.5" ry="1.5" fill="rgba(200,220,255,0.35)" transform="rotate(-20 5.5 7)"/><ellipse cx="10.5" cy="7" rx="2.5" ry="1.5" fill="rgba(200,220,255,0.35)" transform="rotate(20 10.5 7)"/><circle cx="7" cy="8.5" r="0.5" fill="#111"/><circle cx="9" cy="8.5" r="0.5" fill="#111"/></svg>';

    function makeFireflySVG() {
      var hue = 40 + Math.random() * 20;
      return FIREFLY_SVG.replace('%GLOW%', 'hsl('+hue+',100%,60%)');
    }

    var jar = document.createElement('div');
    jar.id = 'obsFireflyJar';
    jar.title = 'Firefly Jar';
    jar.style.cssText = 'position:fixed;bottom:15rem;left:1rem;z-index:99999;cursor:pointer;transition:all 0.5s;';
    jar.innerHTML = JAR_SVG;
    document.body.appendChild(jar);
    jar.addEventListener('click', function() {
      var count = config.fireflies.caught || 0;
      toast('Firefly Jar: '+count+' fireflies'+(count>=10?' the jar glows!':''), 'rgba(255,230,100,0.8)', 3000);
    });
    function updateJar() {
      var count = config.fireflies.caught || 0;
      var bright = Math.min(1, count / 15);
      jar.style.filter = 'drop-shadow(0 0 '+(3+bright*12)+'px rgba(255,230,100,'+(0.2+bright*0.6)+')) brightness('+(0.8+bright*0.4)+')';
    }
    setInterval(function() {
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
      var drift = setInterval(function() {
        if (!ff.parentNode) { clearInterval(drift); return; }
        var curLeft = parseFloat(ff.style.left) || 0;
        var curTop = parseFloat(ff.style.top) || 0;
        var newLeft = Math.max(20, Math.min(window.innerWidth - 40, curLeft + (Math.random() - 0.5) * 120));
        var newTop = Math.max(20, Math.min(window.innerHeight - 40, curTop + (Math.random() - 0.5) * 80));
        ff.style.left = newLeft + 'px';
        ff.style.top = newTop + 'px';
      }, 2500);
      ff.addEventListener('click', function() {
        clearInterval(drift);
        config.fireflies.caught = (config.fireflies.caught || 0) + 1;
        save();
        updateJar();
        toast('Caught! ('+config.fireflies.caught+')', 'rgba(255,230,100,0.7)', 1200);
        ff.style.transform = 'scale(2.5)';
        ff.style.opacity = '0';
        setTimeout(function() { if (ff.parentNode) ff.remove(); }, 400);
      });
      setTimeout(function() {
        if (!ff.parentNode) return;
        clearInterval(drift);
        ff.style.opacity = '0';
        setTimeout(function() { if (ff.parentNode) ff.remove(); }, 1000);
      }, 12000);
    }, 3000);
    updateJar();
    window._obsFireflyJar = { updateJar: updateJar, getConfig: function() { return config; } };
  }

  /* ---------- 15. Fortune Scroll ---------- */
  function initFortuneScroll() {
    var fortunes = [
      'The stars whisper your name tonight.',
      'A gentle answer turns away wrath.',
      'What you seek is seeking you.',
      'The moon remembers what the sun forgot.',
      'Someone is thinking of you right now.',
      'Patience is not passive — it is gathering strength.',
      'The best time to plant a tree was 20 years ago.',
      'You are closer than you think.',
      'Love is not found. It builds itself.',
      'The sky is not the limit — it is the beginning.',
      'Every sky tells a story. This one is yours.',
      'Something beautiful is about to happen.',
      'Trust the timing of your life.',
      'You are exactly where you need to be.',
      'The universe has been arranging this moment.'
    ];
    setInterval(function() {
      if (Math.random() > 0.004) return;
      var scroll = document.createElement('div');
      scroll.textContent = '\uD83D\uDCDC';
      scroll.style.cssText = 'position:fixed;z-index:9995;font-size:1.5rem;pointer-events:auto;cursor:pointer;opacity:0.6;transition:all 0.5s;animation:luckyFloat 3s ease-in-out infinite;';
      scroll.style.left = (5+Math.random()*40)+'vw';
      scroll.style.top = (10+Math.random()*50)+'vh';
      scroll.title = 'A fortune waits...';
      document.body.appendChild(scroll);
      scroll.addEventListener('mouseenter', function() { this.style.opacity = '1'; this.style.transform = 'scale(1.2)'; });
      scroll.addEventListener('mouseleave', function() { this.style.opacity = '0.6'; this.style.transform = 'scale(1)'; });
      scroll.addEventListener('click', function() {
        var msg = fortunes[Math.floor(Math.random()*fortunes.length)];
        toast('\uD83D\uDCDC '+msg, 'rgba(200,170,130,0.85)', 5000);
        scroll.style.transform = 'scale(1.5)';
        scroll.style.opacity = '0';
        setTimeout(function() { if (scroll.parentNode) scroll.remove(); }, 600);
      });
      setTimeout(function() {
        if (scroll.parentNode) { scroll.style.opacity = '0'; setTimeout(function() { if (scroll.parentNode) scroll.remove(); }, 1000); }
      }, 15000);
    }, 15000);
  }

  /* ---------- 16. Earth View ---------- */
  function initEarthView() {
    _afterApply.push(function(idx) {
      var SKIES = window.Skies && window.Skies.SKIES;
      if (!SKIES || !SKIES[idx]) return;
      if (Math.random() < 0.12) {
        setTimeout(function() {
          var earth = document.createElement('div');
          earth.textContent = '\uD83C\uDF0D';
          earth.style.cssText = 'position:fixed;bottom:'+(15+Math.random()*30)+'%;right:'+(10+Math.random()*30)+'%;font-size:'+(24+Math.random()*20)+'px;z-index:9995;pointer-events:none;animation:earthFloat 15s ease-in-out infinite;opacity:0.5;';
          document.body.appendChild(earth);
          setTimeout(function() {
            earth.style.opacity = '0';
            earth.style.transition = 'opacity 2s';
            setTimeout(function() { if (earth.parentNode) earth.remove(); }, 2500);
          }, 12000);
        }, 3000);
      }
    });
  }

  /* ---------- 17. Lost Balloon ---------- */
  /* ---------- 18. Make A Wish ---------- */
  function initMakeAWish() {
    var wishTimeout = null;
    document.addEventListener('dblclick', function(e) {
      if (wishTimeout) { clearTimeout(wishTimeout); wishTimeout = null; }
      // Check if click is on observatory area (not on UI elements)
      var t = e.target;
      if (t.closest && (t.closest('#observatory') || t.closest('.page-header') || t === document.body)) {
        showWishModal(e.clientX, e.clientY);
      }
    });
    function showWishModal(x, y) {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      var modal = document.createElement('div');
      modal.style.cssText = 'background:var(--ink-soft);border:1px solid var(--gold);border-radius:16px;padding:1.5rem;width:300px;box-shadow:0 8px 40px rgba(0,0,0,.7);animation:fadeIn 0.3s ease;text-align:center;';
      modal.innerHTML =
        '<div style="font-size:2rem;margin-bottom:0.5rem;">\u2B50</div>' +
        '<div style="font-family:var(--font-display);color:var(--gold);font-size:1rem;margin-bottom:0.8rem;">Make a wish</div>' +
        '<textarea id="wishInput" placeholder="What do you wish for?" style="width:100%;background:var(--glass);border:1px solid var(--glassBorder);color:var(--parchment);padding:0.6rem;border-radius:8px;font-family:var(--font-body);font-size:0.85rem;resize:none;height:80px;outline:none;"></textarea>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:0.8rem;">' +
          '<button id="wishSaveBtn" style="background:rgba(255,230,128,.15);border:1px solid rgba(255,230,128,.35);color:var(--gold);padding:0.4rem 1rem;border-radius:6px;cursor:pointer;font-family:var(--font-display);font-size:0.8rem;">\u2728 Save Wish</button>' +
          '<button id="wishCancelBtn" style="background:var(--glass);border:1px solid var(--glassBorder);color:var(--parchment-dim);padding:0.4rem 1rem;border-radius:6px;cursor:pointer;font-family:var(--font-display);font-size:0.8rem;">Cancel</button>' +
        '</div>';
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      document.getElementById('wishInput').focus();

      document.getElementById('wishSaveBtn').addEventListener('click', function() {
        var text = document.getElementById('wishInput').value.trim();
        if (text) {
          if (!config.wishes) config.wishes = [];
          config.wishes.push({ text: text, at: Date.now() });
          save();
          try { if (window.WishSystem) WishSystem.addWish(text, 'observatory'); } catch(e) {}
          toast('\u2B50 Wish saved \u2728', 'rgba(255,230,128,0.8)', 2500);
        }
        overlay.remove();
      });
      document.getElementById('wishCancelBtn').addEventListener('click', function() { overlay.remove(); });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    }
  }

  /* ---------- 19. Floating Hearts ---------- */
  function initFloatingHearts() {
    var heartInterval = null;
    function spawnHearts() {
      var count = 3 + Math.floor(Math.random() * 3);
      for (var i = 0; i < count; i++) {
        var el = document.createElement('div');
        el.textContent = '\u2764\uFE0F';
        el.style.cssText = 'position:fixed;bottom:-40px;z-index:10001;font-size:' + (14 + Math.random() * 18) + 'px;pointer-events:none;opacity:0.7;left:' + (5 + Math.random() * 90) + 'vw;transition:transform ' + (5 + Math.random() * 3) + 's linear, opacity ' + (5 + Math.random() * 3) + 's ease;';
        document.body.appendChild(el);
        requestAnimationFrame(function () {
          el.style.transform = 'translateY(-' + (window.innerHeight + 80) + 'px)';
          el.style.opacity = '0';
        });
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 9000);
      }
    }
    function startHearts() { if (!heartInterval) { heartInterval = setInterval(spawnHearts, 30000 + Math.random() * 30000); spawnHearts(); } }
    function stopHearts() { if (heartInterval) { clearInterval(heartInterval); heartInterval = null; } }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopHearts(); else startHearts(); });
    startHearts();
  }

  /* ---------- 20. Screenshot Mode ---------- */
  var cuteLines = [
    'To the girl who carries entire galaxies inside her chest',
    'Your eyes hold an entire storm and an entire sunrise',
    'Suddenly sunsets lasted longer. Songs felt written for us.',
    'You became the place my heart returned to without asking',
    'My most beautiful accident. My quietest peace.',
    'You are my favorite because you are the only you',
    'The world feels gentler simply because you are happy',
    'Your smile is my favorite proof that happiness is contagious',
    'My home was never a place. It was always you.',
    'You are one of the most beautiful things this world ever created'
  ];
  function initScreenshotMode() {
    var btn = document.createElement('button');
    btn.id = 'obsScreenshotBtn';
    btn.title = 'Download sky screenshot';
    btn.textContent = '\uD83D\uDCF7';
    btn.style.cssText = 'position:fixed;top:1rem;left:3.5rem;z-index:10002;background:var(--glass);border:1px solid var(--glassBorder);border-radius:50%;width:36px;height:36px;font-size:0.9rem;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;justify-content:center;';
    btn.addEventListener('click', function() {
      var uiEls = document.querySelectorAll('#observatory, #obsMoonBtn, #obsRealTime, #obsProgress, #obsCleanBtn, #obsLandscapeBtn, #obsDaily, #obsFireflyJar, #obsMoodBtn, #obsScreenshotBtn, .footer, .page-header, #heartContainer, #skyBtnContainer, [href="stats.html"], [href="admin.html"]');
      uiEls.forEach(function(el) { if (el) el.style.display = 'none'; });
      requestAnimationFrame(function() {
        var skyCanvases = document.querySelectorAll('#skyOverlay canvas');
        if (skyCanvases.length) {
          var w = window.innerWidth, h = window.innerHeight;
          var cap = document.createElement('canvas');
          cap.width = w * 2; cap.height = h * 2;
          var cx = cap.getContext('2d');
          cx.scale(2, 2);
          for (var sci=0;sci<skyCanvases.length;sci++) {
            cx.drawImage(skyCanvases[sci], 0, 0, w, h);
          }
          // Bottom gradient for text readability
          var grad = cx.createLinearGradient(0, h*0.7, 0, h);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.65)');
          cx.fillStyle = grad;
          cx.fillRect(0, h*0.7, w, h*0.3);
          // Sky info
          var skyObj = getCurrentSkyObj();
          var skyName = skyObj ? skyObj.name : 'Unknown Sky';
          var dna = skyObj ? getSkyDNA(skyObj) : '';
          // Pick a cute line based on sky index for uniqueness
          var skyIdx = window.Skies && window.Skies.getCurrent();
          var line = cuteLines[Math.abs(skyIdx || 0) % cuteLines.length];
          // Draw line at center bottom
          cx.textAlign = 'center';
          cx.textBaseline = 'bottom';
          cx.fillStyle = '#ffebd2';
          cx.font = 'italic 22px Georgia, serif';
          var lx = w/2, ly = h*0.82;
          // Word wrap
          var words = line.split(' '), wrapped = [], cur = '';
          for (var wi=0;wi<words.length;wi++) {
            var test = cur ? cur+' '+words[wi] : words[wi];
            if (cx.measureText(test).width > w*0.75) { wrapped.push(cur); cur = words[wi]; }
            else cur = test;
          }
          if (cur) wrapped.push(cur);
          var lh = 30;
          var startY = ly - (wrapped.length-1)*lh/2;
          for (var li=0;li<wrapped.length;li++) {
            cx.fillText(wrapped[li], lx, startY + li*lh);
          }
          // Sky name + DNA at very bottom
          cx.fillStyle = 'rgba(255,235,210,0.6)';
          cx.font = '14px Georgia, serif';
          cx.fillText(skyName+'  \u2022  DNA: '+dna, lx, h-16);
          // Download
          cap.toBlob(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sky-'+(skyObj?skyObj.id||skyObj.name.replace(/[^a-z0-9]/gi,'_'):'unknown')+'.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          });
        }
        uiEls.forEach(function(el) { if (el) el.style.display = ''; });
      });
      toast('\u2B50 Sky saved \u2014 look for DNA: '+(getCurrentSkyObj()?getSkyDNA(getCurrentSkyObj()):''), null, 3000);
    });
    document.body.appendChild(btn);
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        btn.click();
      }
    });
  }

  /* =====================================================
     PART 4 — FEATURES 21–30
     ===================================================== */

  /* ---------- 21. Mood Randomizer ---------- */
  var moodOverlay = null;
  function initMoodRandomizer() {
    var btn = document.createElement('button');
    btn.id = 'obsMoodBtn';
    btn.title = 'Randomize atmosphere';
    btn.textContent = '\uD83C\uDFA8';
    btn.style.cssText = 'position:fixed;top:1rem;left:6rem;z-index:10002;background:var(--glass);border:1px solid var(--glassBorder);border-radius:50%;width:36px;height:36px;font-size:0.9rem;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;justify-content:center;';
    btn.addEventListener('click', function() {
      if (moodOverlay) { moodOverlay.remove(); moodOverlay = null; return; }
      var moods = [
        { name: 'Warm Glow', bg: 'rgba(255,150,50,0.06)' },
        { name: 'Cool Breeze', bg: 'rgba(100,180,255,0.06)' },
        { name: 'Golden Hour', bg: 'rgba(255,200,100,0.08)' },
        { name: 'Moonlit', bg: 'rgba(200,200,255,0.05)' },
        { name: 'Ember', bg: 'rgba(255,80,50,0.05)' },
        { name: 'Forest', bg: 'rgba(100,200,100,0.05)' },
        { name: 'Twilight', bg: 'rgba(150,100,200,0.06)' },
        { name: 'Dream', bg: 'rgba(255,200,255,0.05)' }
      ];
      var m = moods[Math.floor(Math.random()*moods.length)];
      moodOverlay = document.createElement('div');
      moodOverlay.id = 'obsMoodOverlay';
      moodOverlay.style.cssText = 'position:fixed;inset:0;z-index:9994;pointer-events:none;transition:background 1.5s ease;background:'+m.bg+';';
      document.body.appendChild(moodOverlay);
      toast('\uD83C\uDFA8 '+m.name, 'rgba(255,200,150,0.7)', 2000);
      btn.style.borderColor = 'var(--gold)';
    });
    // Remove mood on sky change
    _afterApply.push(function() {
      if (moodOverlay) { moodOverlay.remove(); moodOverlay = null; }
      var mb = document.getElementById('obsMoodBtn');
      if (mb) mb.style.borderColor = 'var(--glassBorder)';
    });
    document.body.appendChild(btn);
  }

  /* ---------- 22. Constellation Names ---------- */
  var constNames = [
    { name: 'Lyra', desc: 'The Harp \u2014 a melody written in stars' },
    { name: 'Orion', desc: 'The Hunter \u2014 eternal guardian of the night' },
    { name: 'Cassiopeia', desc: 'The Seated Queen \u2014 vanity immortalized' },
    { name: 'Ursa Major', desc: 'The Great Bear \u2014 wanderer of the north' },
    { name: 'Cygnus', desc: 'The Swan \u2014 graceful across the milky way' },
    { name: 'Draco', desc: 'The Dragon \u2014 coiled around the pole' },
    { name: 'Pegasus', desc: 'The Winged Horse \u2014 freedom carved in light' },
    { name: 'Scorpius', desc: 'The Scorpion \u2014 burning bright and low' },
    { name: 'Aquila', desc: 'The Eagle \u2014 soaring through the heavens' },
    { name: 'Corona', desc: 'The Crown \u2014 a circle of forgotten light' }
  ];
  var constTimer = null;
  function initConstellationNames() {
    var el = document.createElement('div');
    el.id = 'obsConst';
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9993;pointer-events:none;text-align:center;opacity:0;transition:opacity 2s ease;';
    document.body.appendChild(el);
    var lastShow = 0;
    document.addEventListener('mousemove', function(e) {
      var now = Date.now();
      if (now - lastShow < 8000) return;
      if (Math.random() > 0.003) return;
      var sky = getCurrentSkyObj();
      if (!sky || !sky.stars) return;
      lastShow = now;
      var c = constNames[Math.floor(Math.random()*constNames.length)];
      el.innerHTML = '<div style="font-family:var(--font-display);color:var(--gold);font-size:1.2rem;letter-spacing:3px;text-shadow:0 0 20px rgba(255,230,128,0.3);">' + c.name + '</div>' +
        '<div style="font-family:var(--font-body);color:var(--parchment-dim);font-size:0.75rem;font-style:italic;margin-top:4px;">' + c.desc + '</div>';
      el.style.opacity = '1';
      clearTimeout(constTimer);
      constTimer = setTimeout(function() { el.style.opacity = '0'; }, 4000);
    });
  }
  function getCurrentSkyObj() {
    var SKIES = window.Skies && window.Skies.SKIES;
    var idx = window.Skies && window.Skies.getCurrent();
    return (idx >= 0 && SKIES && SKIES[idx]) ? SKIES[idx] : null;
  }

  /* ---------- 23. Music Sync ---------- */
  var musicSyncInterval = null;
  function initMusicSync() {
    musicSyncInterval = setInterval(function() {
      var isPlaying = false;
      // Check if jukebox is playing
      var btn = document.getElementById('jukeboxBtn');
      if (btn && btn.classList.contains('playing')) isPlaying = true;
      // Apply subtle pulse to sky stars via a global style
      if (isPlaying) {
        var intensity = 0.3 + Math.random() * 0.2;
        var ms = document.getElementById('obsMusicStyle');
        if (!ms) {
          ms = document.createElement('style');
          ms.id = 'obsMusicStyle';
          document.head.appendChild(ms);
        }
        ms.textContent = '#skyOverlay canvas { filter: brightness('+(1+intensity*0.05)+') drop-shadow(0 0 '+(intensity*4)+'px rgba(255,230,128,0.1)); transition: filter 0.3s ease; }';
      } else {
        var ms = document.getElementById('obsMusicStyle');
        if (ms) ms.remove();
      }
    }, 500);
  }

  /* ---------- 24. Floating Letters ---------- */
  function initFloatingLetters() {
    var notes = [
      'I wrote this for you on a quiet night\u2026',
      'Remember that time we watched the stars?',
      'You are the most beautiful thought I have ever had.',
      'Somewhere, somehow, this sky remembers us.',
      'I hope you are smiling right now.',
      'This is our universe. No one else\u2019s.',
      'Every sky I see, I see it with you.',
      'I wish I could fold this note into a paper star and send it to you.',
      'You are my favourite atmosphere.',
      'The moon is jealous of how I look at you.'
    ];

    var LETTER_KEY = 'obs-letter-found';
    setInterval(function() {
      if (Math.random() > 0.002) return;
      var env = document.createElement('div');
      env.textContent = '\uD83D\uDCE8';
      env.style.cssText = 'position:fixed;z-index:9995;font-size:1.8rem;pointer-events:auto;cursor:pointer;opacity:0;transition:all 0.6s ease;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3));';
      env.style.left = (5+Math.random()*40)+'vw';
      env.style.top = (5+Math.random()*50)+'vh';
      document.body.appendChild(env);
      requestAnimationFrame(function() { env.style.opacity = '0.7'; env.style.transform = 'scale(1)'; });
      env.addEventListener('mouseenter', function() { this.style.opacity = '1'; this.style.transform = 'scale(1.15)'; });
      env.addEventListener('mouseleave', function() { this.style.opacity = '0.7'; this.style.transform = 'scale(1)'; });
      env.addEventListener('click', function() {
        var msg = notes[Math.floor(Math.random()*notes.length)];
        toast('\uD83D\uDCE8 ' + msg, 'rgba(220,200,170,0.85)', 6000);
        document.getElementById('obsConst').innerHTML = '<div style="font-family:var(--font-display);color:var(--gold);font-size:0.9rem;text-shadow:0 0 20px rgba(255,230,128,0.2);">\uD83D\uDCE8 ' + msg + '</div>';
        document.getElementById('obsConst').style.opacity = '1';
        clearTimeout(constTimer);
        constTimer = setTimeout(function() {
          var cel = document.getElementById('obsConst');
          if (cel) cel.style.opacity = '0';
        }, 6000);
        env.style.transform = 'scale(0.3) rotate(20deg)';
        env.style.opacity = '0';
        setTimeout(function() { if (env.parentNode) env.remove(); }, 600);
      });
      setTimeout(function() {
        if (env.parentNode) { env.style.opacity = '0'; setTimeout(function() { if (env.parentNode) env.remove(); }, 1000); }
      }, 20000);
    }, 20000);
  }

  /* ---------- 25. (removed - Silent Owl) ---------- */
  /* ---------- 26. Puzzle Fragments ---------- */
  /* ---------- 27. Growing Vine ---------- */
  var vineEl = null;
  function initGrowingVine() {
    vineEl = document.createElement('div');
    vineEl.id = 'obsVine';
    vineEl.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:0;z-index:9992;pointer-events:none;background:linear-gradient(0deg,rgba(100,200,100,0.08),transparent);transition:height 2s ease;';
    document.body.appendChild(vineEl);
    updateVine();
    setInterval(updateVine, 10000);
  }
  function updateVine() {
    if (!vineEl) return;
    var total = 0, viewed = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('ash-viewed-') === 0 && k.indexOf('_count') === -1) {
          var count = parseInt(localStorage.getItem(k+'_count') || '');
          if (!count) continue;
          try {
            var v = JSON.parse(localStorage.getItem(k) || '[]');
            viewed += v.length;
            total += count;
          } catch(e) {}
        }
      }
    } catch(e) {}
    var pct = total > 0 ? Math.min(1, viewed/total) : 0;
    var maxH = 120;
    vineEl.style.height = Math.round(pct * maxH) + 'px';
    if (pct >= 0.8) {
      vineEl.style.background = 'linear-gradient(0deg,rgba(255,200,100,0.12),rgba(200,100,255,0.05),transparent)';
      vineEl.innerHTML = '<div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:1.2rem;opacity:'+Math.min(1,(pct-0.8)*10)+';">\uD83C\uDF3C</div>';
    } else if (pct > 0) {
      vineEl.style.background = 'linear-gradient(0deg,rgba(100,200,100,0.08),transparent)';
      vineEl.innerHTML = '';
    }
  }

  /* ---------- 28. Bubble Messages ---------- */
  function initBubbleMessages() {
    var bubbleMsgs = [
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
    setInterval(function() {
      if (Math.random() > 0.003) return;
      var bubble = document.createElement('div');
      bubble.textContent = '\uD83C\uDF2C\uFE0F';
      bubble.style.cssText = 'position:fixed;z-index:9995;font-size:1.2rem;pointer-events:auto;cursor:pointer;opacity:0.6;transition:all 0.4s ease;filter:drop-shadow(0 1px 4px rgba(255,255,255,0.1));';
      bubble.style.left = (5+Math.random()*70)+'vw';
      bubble.style.bottom = '-20px';
      document.body.appendChild(bubble);
      // Float up
      var targetBottom = 50 + Math.random() * 40;
      var floatDur = 4000 + Math.random() * 4000;
      bubble.style.transition = 'bottom '+floatDur+'ms linear, opacity 0.4s';
      requestAnimationFrame(function() {
        bubble.style.bottom = targetBottom + 'vh';
        bubble.style.opacity = '0.3';
      });
      bubble.addEventListener('mouseenter', function() { this.style.opacity = '0.9'; this.style.transform = 'scale(1.2)'; });
      bubble.addEventListener('mouseleave', function() { this.style.opacity = '0.3'; this.style.transform = 'scale(1)'; });
      bubble.addEventListener('click', function() {
        var msg = bubbleMsgs[Math.floor(Math.random()*bubbleMsgs.length)];
        toast('\uD83C\uDF2C\uFE0F ' + msg, 'rgba(180,220,255,0.8)', 4000);
        bubble.style.transform = 'scale(2)';
        bubble.style.opacity = '0';
        setTimeout(function() { if (bubble.parentNode) bubble.remove(); }, 500);
      });
      setTimeout(function() {
        if (bubble.parentNode) { bubble.style.opacity = '0'; setTimeout(function() { if (bubble.parentNode) bubble.remove(); }, 1000); }
      }, floatDur + 2000);
    }, 12000);
  }

  /* ---------- 29. Seasonal Color Grading ---------- */
  var seasonStyle = null;
  function initSeasonalGrading() {
    var month = new Date().getMonth();
    var grade = null;
    if (month >= 2 && month <= 4) grade = { name: 'Spring', filter: 'sepia(0.15) hue-rotate(-10deg) saturate(1.1)', opacity: 0.15 };
    else if (month >= 5 && month <= 7) grade = { name: 'Summer', filter: 'brightness(1.05) saturate(1.15)', opacity: 0.1 };
    else if (month >= 8 && month <= 10) grade = { name: 'Autumn', filter: 'sepia(0.2) hue-rotate(-5deg) saturate(1.2)', opacity: 0.2 };
    else grade = { name: 'Winter', filter: 'brightness(0.95) saturate(0.85) hue-rotate(10deg)', opacity: 0.15 };
    seasonStyle = document.createElement('style');
    seasonStyle.id = 'obsSeasonStyle';
    seasonStyle.textContent = '#seasonGradeOverlay { position:fixed; inset:0; z-index:9991; pointer-events:none; background:rgba(255,255,255,'+grade.opacity+'); mix-blend-mode:overlay; } #skyOverlay { filter: '+grade.filter+'; transition: filter 1.5s ease; }';
    document.head.appendChild(seasonStyle);
    var overlay = document.createElement('div');
    overlay.id = 'seasonGradeOverlay';
    document.body.appendChild(overlay);
    // Show season name on init
    setTimeout(function() {
      var se = document.getElementById('obsConst');
      if (se) {
        se.innerHTML = '<div style="font-family:var(--font-display);color:var(--gold);font-size:0.9rem;letter-spacing:2px;">\uD83C\uDF43 '+grade.name+' Tint</div><div style="font-family:var(--font-body);color:var(--parchment-dim);font-size:0.65rem;font-style:italic;">The sky wears the season</div>';
        se.style.opacity = '1';
        setTimeout(function() { if (se) se.style.opacity = '0'; }, 3000);
      }
    }, 2000);
  }

  /* ---------- 30. Invisible Ink ---------- */
  var mouseStillTimer = null;
  var mouseStillDuration = 0;
  var inkShown = {};
  function initInvisibleInk() {
    var inkMsgs = [
      'You are patient. The sky rewards that.',
      'Stillness speaks louder than words.',
      'In the quiet, the universe whispers.',
      'You noticed. That is everything.',
      'Some secrets only reveal themselves to those who wait.',
      'The stars have been watching you. They approve.',
      'Not all messages shout. Some bloom in silence.',
      'You found hidden ink. The sky trusts you.'
    ];
    document.addEventListener('mousemove', function() { mouseStillDuration = 0; });
    setInterval(function() {
      mouseStillDuration += 2;
      if (mouseStillDuration < 8) return;
      // Pick an unseen message
      var available = [];
      for (var ii=0;ii<inkMsgs.length;ii++) {
        if (!inkShown[ii]) available.push(ii);
      }
      if (!available.length) {
        // Reset
        inkShown = {};
        available = [];
        for (var ri=0;ri<inkMsgs.length;ri++) available.push(ri);
      }
      var idx = available[Math.floor(Math.random()*available.length)];
      inkShown[idx] = true;
      mouseStillDuration = 0;
      var inkEl = document.createElement('div');
      inkEl.style.cssText = 'position:fixed;z-index:9990;pointer-events:none;font-family:var(--font-display);font-style:italic;color:rgba(255,230,128,0.15);font-size:1.2rem;text-align:center;width:300px;opacity:0;transition:opacity 3s ease;transform:translate(-50%,-50%);';
      inkEl.style.left = (15+Math.random()*50)+'vw';
      inkEl.style.top = (20+Math.random()*40)+'vh';
      inkEl.textContent = inkMsgs[idx];
      document.body.appendChild(inkEl);
      requestAnimationFrame(function() { inkEl.style.opacity = '1'; });
      setTimeout(function() {
        inkEl.style.opacity = '0';
        setTimeout(function() { if (inkEl.parentNode) inkEl.remove(); }, 4000);
      }, 7000);
    }, 2000);
  }

  /* ---------- Toast helper ---------- */
  function toast(msg, accent, dur) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(0,0,0,0.88);border-left:3px solid '+(accent||'rgba(255,230,128,0.7)')+';color:#ffebd2;padding:0.8rem 1.5rem;border-radius:10px;font-family:Lora,Georgia,serif;font-size:0.85rem;max-width:80vw;text-align:center;pointer-events:none;opacity:0;transition:opacity 0.4s;box-shadow:0 4px 20px rgba(0,0,0,.4);';
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.style.opacity = '1'; });
    setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); },500); }, dur||2500);
    return t;
  }

  /* ---------- post-apply hooks ---------- */
  var _afterApply = [];

  /* ---------- Init ---------- */
  function init() {
    if (!window.Skies || !window.Skies.SKIES) { setTimeout(init, 100); return; }
    initUI();
    initBlackCat();
    initRealTime();
    initMoonCounter();
    initCleanViewToggle();
    initLandscapeToggle();
    initHiddenRadio();
    initKonami();
    initDoubleRainbow();
    initProgress();

    initDailySky();
    initFireflyJar();
    initFortuneScroll();
    initEarthView();
    initMakeAWish();
    if (!window.FeatureFlags || window.FeatureFlags.get('floating-hearts')) initFloatingHearts();
    initScreenshotMode();
    initMoodRandomizer();
    initConstellationNames();
    initMusicSync();
    initFloatingLetters();
    initGrowingVine();
    initBubbleMessages();
    initSeasonalGrading();
    initInvisibleInk();

    // Moon ripple hooks onto existing moon button click — no init needed

    // Sky DNA is shown in preview — handled in selectSky

    // CSS for animations
    var css = document.createElement('style');
    css.textContent = '@keyframes luckyFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}' +
      '@keyframes rainbowGlow{0%,100%{opacity:0;transform:translateX(-50%) scale(0.8)}20%,80%{opacity:1;transform:translateX(-50%) scale(1)}}' +
      '@keyframes coffeeBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
      '@keyframes fadeIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.9)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}' +
      '@keyframes earthFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}' +
      '@keyframes rippleAnim{0%{transform:scale(0);opacity:0.8}100%{transform:scale(4);opacity:0}}';
    document.head.appendChild(css);

    // Hook sky changes: chain all post-apply callbacks
    if (window.Skies && window.Skies.apply) {
      var origApply = window.Skies.apply;
      window.Skies.apply = function(idx) {
        origApply(idx);
        updateMoonTheme();
        for (var hi=0;hi<_afterApply.length;hi++) {
          try { _afterApply[hi](idx); } catch(e) {}
        }
      };
    }

    // Expose for onclick
    window.SkyObservatory = { selectSky: selectSky };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
