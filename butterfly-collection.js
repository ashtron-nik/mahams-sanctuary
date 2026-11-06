/**
 * butterfly-collection.js — Butterflies that appear naturally on pages,
 * interact with the tree, companions, weather, and seasons.
 * 24 species with collection book.
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('butterflies')) return;

  var KEY = 'ash-butterflies';
  var data;
  function load() { try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ data={}; } if(!data.discovered) data={discovered:{},species:{}}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e){} }

  var SPECIES = [
    { id:'b1', name:'Clouded Yellow', sci:'Colias crocea', desc:'Golden yellow wings that brighten open meadows. Feeds on clover and alfalfa. Widespread across Europe and Asia.', color:'#ffe680', wingShape:'round', rarity:'common', active:'day', flower:'sunflower', flight:'flutter' },
    { id:'b2', name:'Green-veined White', sci:'Pieris napi', desc:'White wings with delicate green veins along the undersides. Favors damp meadows and woodland edges. Flies low over vegetation.', color:'#c0c8e0', wingShape:'round', rarity:'common', active:'night', flower:'moonflower', flight:'glide' },
    { id:'b3', name:'Small Tortoiseshell', sci:'Aglais urticae', desc:'Warm orange and brown with a row of blue spots along the wing edge. One of the first butterflies to appear in spring. Loves nettle patches.', color:'#ff8eb4', wingShape:'round', rarity:'common', active:'day', flower:'rose', flight:'flutter' },
    { id:'b4', name:'Common Blue', sci:'Polyommatus icarus', desc:'Brilliant blue wings in males, brown in females. Found in grasslands and meadows throughout summer. Often seen in large colonies.', color:'#66bbff', wingShape:'wide', rarity:'common', active:'day', flower:'lavender', flight:'soar' },
    { id:'b5', name:'Red Admiral', sci:'Vanessa atalanta', desc:'Striking black wings with vivid red bands and white spots. A strong migrant that travels vast distances. Often seen in gardens feeding on rotting fruit.', color:'#e85d3a', wingShape:'angular', rarity:'uncommon', active:'dusk', flower:'poppy', flight:'dart' },
    { id:'b6', name:'Large White', sci:'Pieris brassicae', desc:'Creamy white with black wingtips. One of the most widespread butterflies. Larvae feed on cabbage and other brassicas.', color:'#ddeeff', wingShape:'angular', rarity:'uncommon', active:'dawn', flower:'snowdrop', flight:'glide' },
    { id:'b7', name:'Purple Emperor', sci:'Apatura iris', desc:'Deep purple with an iridescent sheen that shifts in sunlight. Spends most of its life high in oak tree canopies. Descends to feed on sap and carrion.', color:'#6a3a8a', wingShape:'wide', rarity:'uncommon', active:'night', flower:'nightshade', flight:'glide' },
    { id:'b8', name:'Brimstone', sci:'Gonepteryx rhamni', desc:'Lemon-yellow wings that resemble a leaf when at rest. One of the longest-lived butterflies, overwintering as an adult. Emerges on warm winter days.', color:'#d4a020', wingShape:'round', rarity:'uncommon', active:'day', flower:'marigold', flight:'flutter' },
    { id:'b9', name:'Small Copper', sci:'Lycaena phlaeas', desc:'Bright copper-orange with dark brown borders. A fast, darting flyer that frequently returns to the same perch. Territorial and often seen basking on bare ground.', color:'#ff6f5e', wingShape:'angular', rarity:'uncommon', active:'day', flower:'hibiscus', flight:'dart' },
    { id:'b10', name:'Speckled Wood', sci:'Pararge aegeria', desc:'Brown wings with creamy-yellow spots that dapple like sunlight through leaves. Unusual among butterflies for preferring shaded woodland over open sunshine.', color:'#a0a8b0', wingShape:'round', rarity:'uncommon', active:'dawn', flower:'lily', flight:'dance' },
    { id:'b11', name:'Green Hairstreak', sci:'Callophrys rubi', desc:'The only British butterfly with truly green wings — a vivid emerald on the undersides. Sits with wings closed, becoming nearly invisible against leaves.', color:'#40b060', wingShape:'angular', rarity:'rare', active:'day', flower:'jade', flight:'dart' },
    { id:'b12', name:'Adonis Blue', sci:'Lysandra bellargus', desc:'Intense azure blue wings bordered with white. Found only on chalk and limestone grasslands. Males are among the most vibrantly colored of all European butterflies.', color:'#2a60c0', wingShape:'wide', rarity:'rare', active:'dusk', flower:'bluebell', flight:'soar' },
    { id:'b13', name:'Meadow Brown', sci:'Maniola jurtina', desc:'Plain brown wings with a single eyespot. One of the most abundant butterflies across Europe. Flies lazily through grasslands even on overcast days.', color:'#c09030', wingShape:'round', rarity:'rare', active:'day', flower:'honeysuckle', flight:'glide' },
    { id:'b14', name:'Purple Hairstreak', sci:'Favonius quercus', desc:'Purple-violet sheen across the upper wings. Lives almost entirely in oak trees, feeding on honeydew. Rarely descends to ground level.', color:'#8a5abe', wingShape:'wide', rarity:'rare', active:'dusk', flower:'iris', flight:'dance' },
    { id:'b15', name:'Orange Tip', sci:'Anthocharis cardamines', desc:'White wings with brilliant orange tips in males. Females lack the orange but both have exquisite green-mottled undersides. Often seen along riverbanks and damp meadows.', color:'#ffb080', wingShape:'round', rarity:'rare', active:'day', flower:'cherry', flight:'flutter' },
    { id:'b16', name:'Grayling', sci:'Hipparchia semele', desc:'Cryptic grey-brown wings that blend perfectly with dry earth and rock. Rests with wings closed to one side, tilting to minimize shadow. Found on coastal dunes and heathland.', color:'#5a6080', wingShape:'angular', rarity:'rare', active:'rain', flower:'thistle', flight:'dart' },
    { id:'b17', name:'Silver-washed Fritillary', sci:'Argynnis paphia', desc:'Rich orange with dark veins and silver streaks across the underwings. Glides powerfully through sunlit woodland clearings. Feeds on bramble blossom.', color:'#60d080', wingShape:'wide', rarity:'very-rare', active:'night', flower:'aurora', flight:'dance' },
    { id:'b18', name:'Painted Lady', sci:'Vanessa cardui', desc:'Orange, black, and white patterned wings. The most widespread butterfly in the world, found on every continent except Antarctica. Undertakes massive migrations.', color:'#ff8844', wingShape:'wide', rarity:'very-rare', active:'dusk', flower:'sunset', flight:'soar' },
    { id:'b19', name:'Marbled White', sci:'Melanargia galathea', desc:'Striking chequered pattern of black and creamy white. Flies slowly and delicately over chalk grassland in midsummer. Often rests conspicuously on tall grass stems.', color:'#ffe8aa', wingShape:'round', rarity:'very-rare', active:'night', flower:'starflower', flight:'dance' },
    { id:'b20', name:'Peacock', sci:'Aglais io', desc:'Magnificent eye-spots on deep maroon wings that flash open to startle predators. The pattern resembles the tail feathers of a peacock. Hibernates in dark sheds and hollow trees.', color:'#ff6b6b', wingShape:'wide', rarity:'very-rare', active:'day', flower:'rainbow', flight:'soar' },
    { id:'b21', name:'White Admiral', sci:'Limenitis camilla', desc:'Velvety black-brown wings crossed with bold white bands. Glides gracefully through mature woodland. Feeds on bramble flowers and honeydew high in the canopy.', color:'#e0e0e8', wingShape:'angular', rarity:'legendary', active:'night', flower:'ghost', flight:'glide' },
    { id:'b22', name:'Duke of Burgundy', sci:'Hamearis lucida', desc:'Rich orange and brown with intricate border patterns. One of Britain\'s most threatened butterflies. Requires warm, sheltered scrub with primroses and cowslips.', color:'#ff4400', wingShape:'angular', rarity:'legendary', active:'dawn', flower:'phoenix', flight:'dart' },
    { id:'b23', name:'Camberwell Beauty', sci:'Nymphalis antiopa', desc:'Deep claret-black wings bordered with creamy yellow and blue spots. A rare migrant from Scandinavia. Named after Camberwell in London where it was first recorded in Britain.', color:'#1a0a2a', wingShape:'wide', rarity:'legendary', active:'night', flower:'void', flight:'dance' },
    { id:'b24', name:'Swallowtail', sci:'Papilio machaon', desc:'Large, spectacular yellow and black wings with red and blue eyespots and distinctive tail-like extensions. Britain\'s largest native butterfly. Restricted to the Norfolk Broads wetlands.', color:'#fff8ee', wingShape:'round', rarity:'mythic', active:'any', flower:'celestial', flight:'glide' }
  ];

  var rarityColors = { common:'#a0a080', uncommon:'#80a060', rare:'#6080c0', 'very-rare':'#c060a0', legendary:'#d4a020', mythic:'#ffe680' };

  /* ---------- Spawn butterflies ---------- */
  var activeButterflies = [];
  function spawnButterflies() {
    // determine how many based on rarity and conditions
    var count = Math.floor(Math.random() * 2) + 1;
    for (var i = 0; i < count; i++) {
      var species = pickSpecies();
      if (!species) continue;

      (function (capturedSpecies) {
        var el = document.createElement('div');
        el.className = 'butterfly-bg';
        el.style.cssText = 'position:fixed;z-index:99994;pointer-events:auto;cursor:pointer;width:18px;height:18px;opacity:0;transition:opacity 1s;';

        var c = document.createElement('canvas');
        c.width = 20; c.height = 16;
        drawButterfly(c, capturedSpecies.color, capturedSpecies.wingShape);
        el.appendChild(c);

        var startX = Math.random() * (window.innerWidth - 40) + 20;
        var startY = Math.random() * (window.innerHeight - 60) + 30;
        el.style.left = startX + 'px';
        el.style.top = startY + 'px';
        document.body.appendChild(el);

        setTimeout(function(){ el.style.opacity = '0.8'; }, 50);

        var speed = 2000 + Math.random() * 3000;
        var vertical = 30 + Math.random() * 30;
        var horizontal = 40 + Math.random() * 60;
        var flightFunc = getFlightFunc(capturedSpecies.flight, el);

        var interval = setInterval(function(){ if (!el.parentNode) { clearInterval(interval); return; } flightFunc(el, horizontal, vertical); }, speed);
        var timeout = setTimeout(function(){
          if (!el.parentNode) return;
          clearInterval(interval);
          el.style.opacity = '0';
          setTimeout(function(){ if (el.parentNode) el.remove(); }, 1000);
        }, 15000 + Math.random() * 10000);

        el.addEventListener('click', function(){
          discover(capturedSpecies.id);
          el.style.transform = 'scale(2) rotate(180deg)';
          el.style.opacity = '0';
          clearInterval(interval);
          clearTimeout(timeout);
          setTimeout(function(){ if (el.parentNode) el.remove(); }, 500);
        });

        activeButterflies.push({ el:el, interval:interval, timeout:timeout });
      })(species);
    }
  }

  function pickSpecies() {
    var eligible = SPECIES.filter(function(s){
      if (s.rarity === 'mythic' && Math.random() > 0.05) return false;
      return true;
    });
    if (eligible.length === 0) return null;

    // weight by rarity
    var weights = { common:50, uncommon:30, rare:15, 'very-rare':8, legendary:4, mythic:1 };
    var total = 0;
    eligible.forEach(function(s){ total += weights[s.rarity] || 10; });
    var r = Math.random() * total;
    for (var i = 0; i < eligible.length; i++) {
      r -= weights[eligible[i].rarity] || 10;
      if (r <= 0) return eligible[i];
    }
    return eligible[eligible.length - 1];
  }

  function getFlightFunc(type, el) {
    var phase = Math.random() * 1000;
    var paused = false;

    return function(el, hRange, vRange) {
      var vw = window.innerWidth, vh = window.innerHeight;
      var cx = parseFloat(el.style.left) || vw/2;
      var cy = parseFloat(el.style.top) || vh/2;
      var t = Date.now() / 1000;

      if (!paused && Math.random() < 0.08) { paused = true; setTimeout(function(){ paused = false; }, 1500+Math.random()*2000); }
      if (paused) return;

      if (type === 'soar') {
        el.style.transition = 'left 2.5s ease-in-out, top 2.5s ease-in-out';
        el.style.left = Math.max(10, Math.min(vw-30, cx + Math.sin(t*0.5+phase)*40 + Math.cos(t*0.3+phase)*30)) + 'px';
        el.style.top = Math.max(10, Math.min(vh-30, cy + Math.sin(t*0.4+phase)*25 + Math.cos(t*0.6+phase)*20)) + 'px';
      } else if (type === 'dance') {
        el.style.transition = 'left 1.2s ease-in-out, top 1.2s ease-in-out';
        el.style.left = Math.max(10, Math.min(vw-30, cx + Math.sin(t*2+phase)*45 + Math.cos(t*1.5+phase)*35)) + 'px';
        el.style.top = Math.max(10, Math.min(vh-30, cy + Math.sin(t*1.8+phase)*30 + Math.cos(t*2.2+phase)*25)) + 'px';
      } else if (type === 'dart') {
        el.style.transition = 'left 0.8s ease-in, top 0.8s ease-in';
        el.style.left = Math.max(10, Math.min(vw-30, cx + Math.sin(t*3+phase)*60 + Math.cos(t*2+phase)*40)) + 'px';
        el.style.top = Math.max(10, Math.min(vh-30, cy + Math.sin(t*2.5+phase)*20 + Math.cos(t*3.5+phase)*15)) + 'px';
      } else if (type === 'glide') {
        el.style.transition = 'left 4s ease-in-out, top 4s ease-in-out';
        el.style.left = Math.max(10, Math.min(vw-30, cx + Math.sin(t*0.3+phase)*35 + Math.cos(t*0.2+phase)*25)) + 'px';
        el.style.top = Math.max(10, Math.min(vh-30, cy + Math.sin(t*0.25+phase)*20 + Math.cos(t*0.35+phase)*15)) + 'px';
      } else {
        el.style.transition = 'left 3s ease-in-out, top 3s ease-in-out';
        el.style.left = Math.max(10, Math.min(vw-30, cx + Math.sin(t*1.2+phase)*30 + Math.cos(t*0.8+phase)*25)) + 'px';
        el.style.top = Math.max(10, Math.min(vh-30, cy + Math.sin(t*1+phase)*20 + Math.cos(t*1.4+phase)*15)) + 'px';
      }
    };
  }

  function drawButterfly(canvas, color, shape) {
    var ctx = canvas.getContext('2d');
    var w = 20, h = 16;
    ctx.clearRect(0, 0, w, h);

    var dark = darken(color);
    // left wing
    ctx.beginPath();
    if (shape === 'angular') {
      ctx.moveTo(10, 8); ctx.lineTo(0, 0); ctx.lineTo(2, 8); ctx.lineTo(0, 16); ctx.closePath();
    } else if (shape === 'wide') {
      ctx.moveTo(10, 8); ctx.quadraticCurveTo(0, -2, 2, 8); ctx.quadraticCurveTo(0, 18, 10, 8);
    } else {
      ctx.ellipse(5, 8, 5, 7, 0, 0, Math.PI*2);
    }
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.5; ctx.stroke();

    // right wing
    ctx.beginPath();
    if (shape === 'angular') {
      ctx.moveTo(10, 8); ctx.lineTo(20, 0); ctx.lineTo(18, 8); ctx.lineTo(20, 16); ctx.closePath();
    } else if (shape === 'wide') {
      ctx.moveTo(10, 8); ctx.quadraticCurveTo(20, -2, 18, 8); ctx.quadraticCurveTo(20, 18, 10, 8);
    } else {
      ctx.ellipse(15, 8, 5, 7, 0, 0, Math.PI*2);
    }
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.5; ctx.stroke();

    // body
    ctx.fillStyle = '#2a1a00';
    ctx.fillRect(9.5, 5, 1, 6);
    ctx.beginPath(); ctx.arc(10, 4, 1.5, 0, Math.PI*2); ctx.fill();
    // antennae
    ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(9, 3); ctx.lineTo(6, 0); ctx.moveTo(11, 3); ctx.lineTo(14, 0); ctx.stroke();
  }

  function darken(hex) {
    var r = parseInt(hex.slice(1,3),16)-40, g = parseInt(hex.slice(3,5),16)-40, b = parseInt(hex.slice(5,7),16)-40;
    return 'rgb('+Math.max(0,r)+','+Math.max(0,g)+','+Math.max(0,b)+')';
  }

  /* ---------- Discovery ---------- */
  function discover(id) {
    load();
    if (window.Interactions) window.Interactions.record('catch', 'butterfly_discovered', id);
    if (!data.discovered[id]) {
      data.discovered[id] = { count:1, first:Date.now() };
      save();
      showDiscoverToast(id);
    } else {
      data.discovered[id].count++;
      save();
    }
  }

  function showDiscoverToast(id) {
    var s = SPECIES.find(function(x){ return x.id === id; });
    if (!s) return;
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(10,8,6,0.9);backdrop-filter:blur(8px);border:1px solid '+rarityColors[s.rarity]+';border-radius:12px;padding:16px 24px;color:#ffebd2;text-align:center;transition:opacity 0.5s;';
    t.innerHTML = '<div style="font-size:12px;color:'+rarityColors[s.rarity]+';text-transform:uppercase;margin-bottom:4px;">'+s.rarity+'</div>'+
      '<div style="font-size:18px;margin-bottom:4px;">\uD83E\uDD8B '+s.name+'</div>'+
      '<div style="font-size:10px;font-style:italic;color:#a09080;margin-bottom:4px;">'+s.sci+'</div>'+
      '<div style="font-size:12px;color:#ffebd2;">'+s.desc+'</div>';
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ t.remove(); }, 500); }, 3000);
  }

  /* ---------- Collection Book ---------- */
  function openCollection() {
    var existing = document.getElementById('butterflyCollection');
    if (existing) { existing.remove(); return; }
    load();
    var overlay = document.createElement('div');
    overlay.id = 'butterflyCollection';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:rgba(10,8,6,0.8);backdrop-filter:blur(10px);display:flex;justify-content:center;align-items:center;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(20,16,12,0.95);border:1px solid rgba(255,230,100,0.2);border-radius:16px;padding:24px;max-width:550px;width:90%;max-height:80vh;overflow-y:auto;position:relative;color:#ffebd2;';

    var foundCount = Object.keys(data.discovered).length;
    panel.innerHTML = '<div style="font-size:20px;font-weight:bold;color:#ffe680;margin-bottom:12px;">\uD83E\uDD8B Butterfly Collection</div>'+
      '<div style="font-size:12px;color:#a09080;margin-bottom:16px;">Found '+foundCount+' / '+SPECIES.length+' species</div>';

    SPECIES.forEach(function(s){
      var d = data.discovered[s.id];
      var found = !!d;
      panel.innerHTML += '<div style="display:flex;align-items:center;padding:8px 10px;margin-bottom:4px;border-radius:8px;background:'+(found?'rgba(255,230,100,0.06)':'rgba(255,255,255,0.02)')+';border:1px solid '+(found?rarityColors[s.rarity]:'rgba(255,255,255,0.05)')+';'+(!found?'filter:grayscale(1)opacity(0.4)':'')+'">'+
        '<div style="width:40px;height:30px;display:flex;align-items:center;justify-content:center;margin-right:12px;">'+
        '<span style="font-size:20px;">'+(found?'\uD83E\uDD8B':'?')+'</span></div>'+
        '<div style="flex:1;"><div style="font-weight:'+(found?'bold':'normal')+';'+(found?'':'color:#605040')+';">'+(found?s.name:'???')+'</div>'+
        (found?'<div style="font-size:9px;font-style:italic;color:#807060;">'+s.sci+'</div>':'')+
        '<div style="font-size:10px;color:'+(found?'#a09080':'#504030')+';">'+(found?s.desc:'Undiscovered')+'</div></div>'+
        '<div style="text-align:right;"><div style="font-size:10px;color:'+rarityColors[s.rarity]+';">'+s.rarity+(d&&d.count>1?' (\u00D7'+d.count+')':'')+'</div>'+
        (found?'<div style="font-size:9px;color:#605040;">'+new Date(d.first).toLocaleDateString()+'</div>':'')+'</div></div>';
    });

    panel.innerHTML += '<div style="text-align:center;margin-top:12px;"><button onclick="document.getElementById(\'butterflyCollection\').remove()" style="background:rgba(255,230,100,0.15);border:1px solid rgba(255,230,100,0.3);color:#ffe680;padding:6px 18px;border-radius:20px;cursor:pointer;">Close</button></div>';

    overlay.appendChild(panel);
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
    overlay.addEventListener('click', function(){ overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* ---------- Init ---------- */
  function init() {
    if (/stats\.html$/i.test(window.location.pathname)) return;
    if (document.body && (document.body.style.display === 'none' || document.body.innerHTML.indexOf('Locked') !== -1)) return;
    load();
    spawnButterflies();
    setInterval(spawnButterflies, 30000);
    // periodic rotation
    setInterval(function(){
      activeButterflies.forEach(function(b){
        if (b.el.parentNode && Math.random() < 0.3) {
          b.el.style.opacity = '0';
          setTimeout(function(){ if (b.el.parentNode) { b.el.remove(); clearInterval(b.interval); clearTimeout(b.timeout); } }, 500);
        }
      });
      activeButterflies = activeButterflies.filter(function(b){ return b.el.parentNode !== null; });
    }, 30000);
  }

  var styleAdded = false;
  if (!styleAdded) {
    var s = document.createElement('style');
    s.textContent = '.butterfly-bg canvas { display:block; } @keyframes butterflyFlutter { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }';
    document.head.appendChild(s);
    styleAdded = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 2000); });
  else setTimeout(init, 2000);

  window.ButterflyCollection = {
    openCollection: openCollection,
    count: function(){ load(); return Object.keys(data.discovered).length; },
    total: function(){ return SPECIES.length; }
  };
})();
