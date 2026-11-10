/**
 * world-progress.js — Rich statistics universe that reads all existing
 * localStorage data and presents a beautiful dashboard.
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('world-progress')) return;

  function getObs(prop) {
    try{ var o=JSON.parse(localStorage.getItem('ash-obs')); return o?o[prop]:null; }catch(e){return null;}
  }

  function collectStats() {
    var s = {};

    // Sections read
    s.sectionsRead = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('ash-viewed-') === 0) {
          s.sectionsRead += parseInt(localStorage.getItem(k + '_count') || '0');
        }
      }
    } catch(e) {}

    // Dreams
    s.dreamsVisited = location.pathname.indexOf('dream') >= 0 ? 1 : 0;
    try {
      var dreamData = JSON.parse(localStorage.getItem('ash-dream')) || {};
      s.dreamsCompleted = dreamData.completed || 0;
    } catch(e) { s.dreamsCompleted = 0; }

    // Skies
    try {
      var skies = JSON.parse(localStorage.getItem('ash-sky-visited')) || [];
      s.skiesSeen = skies.length;
      s.skiesTotal = 30; // approximate
    } catch(e) { s.skiesSeen = 0; }
    try {
      var recent = getObs('recent');
      s.skiesGenerated = recent ? Math.min(recent.length, 30) : 0;
    } catch(e) { s.skiesGenerated = 0; }

    // Fireflies
    var ff = getObs('fireflies');
    s.firefliesCaught = ff ? ff.caught || 0 : 0;

    // Wishes
    try {
      var w = JSON.parse(localStorage.getItem('ash-wish-journal')) || [];
      s.wishesWritten = w.length;
    } catch(e) { s.wishesWritten = 0; }

    // Lanterns
    s.lanternsReleased = parseInt(localStorage.getItem('ash-lanterns-released') || '0');

    // Letters
    try {
      var l = JSON.parse(localStorage.getItem('ash-secret-letters')) || {};
      s.lettersFound = Object.keys(l).length;
      s.lettersTotal = 30;
    } catch(e) { s.lettersFound = 0; }

    // Butterflies
    try {
      var b = JSON.parse(localStorage.getItem('ash-butterflies')) || {};
      s.butterfliesDiscovered = b.discovered ? Object.keys(b.discovered).length : 0;
      s.butterfliesTotal = 24;
    } catch(e) { s.butterfliesDiscovered = 0; }

    // Tree
    try {
      var t = JSON.parse(localStorage.getItem('ash-tree-of-memories')) || {};
      s.treeGrowth = t.growth || 0;
      s.treeVisits = t.visits || 0;
    } catch(e) { s.treeGrowth = 0; s.treeVisits = 0; }

    // Egg fragments / hidden secrets
    try {
      var eggs = JSON.parse(localStorage.getItem('ash-sky-eggs')) || {};
      s.eggsFound = Object.keys(eggs).length;
    } catch(e) { s.eggsFound = 0; }

    try {
      var frags = getObs('fragments');
      s.fragmentsFound = frags ? frags.length : 0;
    } catch(e) { s.fragmentsFound = 0; }

    // Favorites
    try {
      var favs = JSON.parse(localStorage.getItem('ash-favorites')) || [];
      s.favorites = favs.length;
    } catch(e) { s.favorites = 0; }

    // Gallery / songs
    try {
      var gallery = JSON.parse(localStorage.getItem('ash-gallery')) || [];
      s.galleryImages = gallery.length;
    } catch(e) { s.galleryImages = 0; }

    try {
      var userGallery = JSON.parse(localStorage.getItem('ash-user-gallery')) || [];
      s.userGallery = userGallery.length;
    } catch(e) { s.userGallery = 0; }

    try {
      var songState = JSON.parse(localStorage.getItem('musicState')) || {};
      s.songsPlayed = songState.played || 0;
      s.totalPlayTime = songState.totalPlayTime || 0;
    } catch(e) { s.songsPlayed = 0; s.totalPlayTime = 0; }

    // Estimated hours together
    s.hoursTogether = Math.round((s.treeVisits * 3 + s.totalPlayTime / 3600) * 10) / 10;
    if (s.hoursTogether < 0.1) s.hoursTogether = Math.round(s.sectionsRead * 0.02 * 10) / 10;

    // Dragon encounters
    s.dragonEncounters = s.favorites > 3 ? Math.floor(s.favorites / 2) : 0;

    // Achievements: count of things with > 0
    var checks = [s.sectionsRead>0, s.dreamsCompleted>0, s.skiesSeen>0,
      s.firefliesCaught>0, s.wishesWritten>0, s.lanternsReleased>0,
      s.lettersFound>0, s.butterfliesDiscovered>0, s.treeGrowth>0,
      s.eggsFound>0, s.fragmentsFound>0, s.favorites>0, s.songsPlayed>0];
    s.achievementsEarned = checks.filter(Boolean).length;

    // Journey stage
    if (s.treeGrowth >= 300 || s.sectionsRead >= 200) s.journeyStage = 'Eternal Bond';
    else if (s.treeGrowth >= 200 || s.sectionsRead >= 150) s.journeyStage = 'Sacred Oath';
    else if (s.treeGrowth >= 150 || s.sectionsRead >= 100) s.journeyStage = 'Deep Connection';
    else if (s.treeGrowth >= 100 || s.sectionsRead >= 70) s.journeyStage = 'Growing Together';
    else if (s.treeGrowth >= 50 || s.sectionsRead >= 40) s.journeyStage = 'Blossoming';
    else if (s.treeGrowth >= 30 || s.sectionsRead >= 20) s.journeyStage = 'Exploring';
    else if (s.treeGrowth >= 15 || s.sectionsRead >= 10) s.journeyStage = 'Adventurer';
    else s.journeyStage = 'Beginner';

    return s;
  }

  function safeCollectStats() {
    try { return collectStats(); } catch (e) { return { sectionsRead:0, skiesSeen:0, skiesTotal:30, skiesGenerated:0, dreamsVisited:0, dreamsCompleted:0, lanternsReleased:0, wishesWritten:0, firefliesCaught:0, butterfliesDiscovered:0, butterfliesTotal:24, lettersFound:0, lettersTotal:30, fragmentsFound:0, eggsFound:0, favorites:0, galleryImages:0, userGallery:0, songsPlayed:0, totalPlayTime:0, treeGrowth:0, treeVisits:0, hoursTogether:0, dragonEncounters:0, achievementsEarned:0, journeyStage:'Beginner' }; }
  }

  /* ---------- UI ---------- */
  function openDashboard() {
    var existing = document.getElementById('worldProgress');
    if (existing) { existing.remove(); return; }

    var s = collectStats();

    var overlay = document.createElement('div');
    overlay.id = 'worldProgress';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:rgba(10,8,6,0.8);backdrop-filter:blur(10px);display:flex;justify-content:center;align-items:center;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(20,16,12,0.95);border:1px solid rgba(255,230,100,0.2);border-radius:16px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto;position:relative;color:#ffebd2;';

    // Journey stage header
    var stageColors = { Beginner:'#a0a080', Adventurer:'#80a060', Exploring:'#60a0a0', Blossoming:'#c08060', 'Growing Together':'#60c080', 'Deep Connection':'#6080c0', 'Sacred Oath':'#c060a0', 'Eternal Bond':'#d4a020' };
    var stageColor = stageColors[s.journeyStage] || '#ffe680';

    panel.innerHTML = '<div style="text-align:center;margin-bottom:16px;">'+
      '<div style="font-size:22px;font-weight:bold;color:#ffe680;">\uD83C\uDF0D World Progress</div>'+
      '<div style="margin-top:6px;padding:4px 14px;display:inline-block;border-radius:20px;background:'+stageColor+'22;border:1px solid '+stageColor+';color:'+stageColor+';font-size:12px;text-transform:uppercase;">'+s.journeyStage+'</div>'+
      '</div>';

    // Stats grid
    var categories = [
      { label:'\uD83D\uDCD6 Sections Read', value:s.sectionsRead },
      { label:'\uD83C\uDF19 Skies Discovered', value:s.skiesSeen+' / '+s.skiesTotal },
      { label:'\uD83C\uDF00 Skies Generated', value:s.skiesGenerated },
      { label:'\uD83C\uDF19 Dreams Visited', value:s.dreamsVisited, sub:'Completed: '+s.dreamsCompleted },
      { label:'\uD83D\uDD25 Lanterns Released', value:s.lanternsReleased },
      { label:'\u2728 Wishes Written', value:s.wishesWritten },
      { label:'\uD83D\uDD0D Fireflies Caught', value:s.firefliesCaught },
      { label:'\uD83E\uDD8B Butterflies Found', value:s.butterfliesDiscovered+' / '+s.butterfliesTotal },
      { label:'\uD83D\uDCEC Letters Found', value:s.lettersFound+' / '+s.lettersTotal },
      { label:'\uD83E\uDDEA Fragments Found', value:s.fragmentsFound },
      { label:'\uD83E\uDD5A Eggs Hatched', value:s.eggsFound },
      { label:'\uD83C\uDF1F Favorites Saved', value:s.favorites },
      { label:'\uD83D\uDDBC\uFE0F Gallery Images', value:s.galleryImages },
      { label:'\uD83D\uDC84 User Photos', value:s.userGallery },
      { label:'\uD83C\uDFB5 Songs Played', value:s.songsPlayed },
      { label:'\u23F1\uFE0F Hours Together', value:s.hoursTogether.toFixed(1) },
      { label:'\uD83D\uDC31 Dragon Encounters', value:s.dragonEncounters },
      { label:'\uD83C\uDF33 Tree Growth', value:s.treeGrowth+' pts' },
      { label:'\uD83C\uDFC6 Achievements', value:s.achievementsEarned+' / 13' },
      { label:'\uD83D\uDCC5 Total Visits', value:s.treeVisits }
    ];

    panel.innerHTML += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
    categories.forEach(function(c){
      panel.innerHTML += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px 12px;">'+
        '<div style="font-size:11px;color:#a09080;">'+c.label+'</div>'+
        '<div style="font-size:16px;font-weight:bold;color:#ffe680;">'+c.value+'</div>'+
        (c.sub?'<div style="font-size:9px;color:#706050;">'+c.sub+'</div>':'')+'</div>';
    });
    panel.innerHTML += '</div>';

    panel.innerHTML += '<div style="text-align:center;margin-top:16px;"><button onclick="document.getElementById(\'worldProgress\').remove()" style="background:rgba(255,230,100,0.15);border:1px solid rgba(255,230,100,0.3);color:#ffe680;padding:6px 18px;border-radius:20px;cursor:pointer;">Close</button></div>';

    overlay.appendChild(panel);
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
    overlay.addEventListener('click', function(){ overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* ---------- Toggle button ---------- */
  function allSectionsRead() {
    var required = ['100_organs', 'love', 'fantasies', 'sky_observatory', 'photo_gallery'];
    try {
      for (var i = 0; i < required.length; i++) {
        var found = false;
        for (var j = 0; j < localStorage.length; j++) {
          var k = localStorage.key(j);
          if (k && k.indexOf('ash-viewed-') === 0 && k.indexOf(required[i]) !== -1) { found = true; break; }
        }
        if (!found) return false;
      }
      return true;
    } catch (e) { return false; }
  }

  function addButton() {
    var btn = document.createElement('div');
    btn.id = 'worldProgressBtn';
    btn.style.cssText = 'position:fixed;bottom:242px;left:25px;z-index:99997;cursor:pointer;font-size:16px;opacity:0.6;transition:opacity 0.3s;background:rgba(10,8,6,0.4);backdrop-filter:blur(4px);border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;';
    btn.textContent = '\uD83C\uDF0D';
    btn.title = 'World Progress';
    btn.addEventListener('mouseenter', function(){ btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', function(){ btn.style.opacity = '0.6'; });
    btn.addEventListener('click', openDashboard);
    if (!allSectionsRead()) btn.style.display = 'none';
    document.body.appendChild(btn);
  }

  function refreshDashboard() {
    var overlay = document.getElementById('worldProgress');
    if (!overlay) return;
    var panel = overlay.querySelector('div');
    if (!panel) return;
    var s = safeCollectStats();
    var stageColors = { Beginner:'#a0a080', Adventurer:'#80a060', Exploring:'#60a0a0', Blossoming:'#c08060', 'Growing Together':'#60c080', 'Deep Connection':'#6080c0', 'Sacred Oath':'#c060a0', 'Eternal Bond':'#d4a020' };
    var stageColor = stageColors[s.journeyStage] || '#ffe680';
    panel.innerHTML = '<div style="text-align:center;margin-bottom:16px;">'+
      '<div style="font-size:22px;font-weight:bold;color:#ffe680;">\uD83C\uDF0D World Progress</div>'+
      '<div style="margin-top:6px;padding:4px 14px;display:inline-block;border-radius:20px;background:'+stageColor+'22;border:1px solid '+stageColor+';color:'+stageColor+';font-size:12px;text-transform:uppercase;">'+s.journeyStage+'</div>'+
      '</div>';
    var categories = [
      { label:'\uD83D\uDCD6 Sections Read', value:s.sectionsRead },
      { label:'\uD83C\uDF19 Skies Discovered', value:s.skiesSeen+' / '+s.skiesTotal },
      { label:'\uD83C\uDF00 Skies Generated', value:s.skiesGenerated },
      { label:'\uD83C\uDF19 Dreams Visited', value:s.dreamsVisited, sub:'Completed: '+s.dreamsCompleted },
      { label:'\uD83D\uDD25 Lanterns Released', value:s.lanternsReleased },
      { label:'\u2728 Wishes Written', value:s.wishesWritten },
      { label:'\uD83D\uDD0D Fireflies Caught', value:s.firefliesCaught },
      { label:'\uD83E\uDD8B Butterflies Found', value:s.butterfliesDiscovered+' / '+s.butterfliesTotal },
      { label:'\uD83D\uDCEC Letters Found', value:s.lettersFound+' / '+s.lettersTotal },
      { label:'\uD83E\uDDEA Fragments Found', value:s.fragmentsFound },
      { label:'\uD83E\uDD5A Eggs Hatched', value:s.eggsFound },
      { label:'\uD83C\uDF1F Favorites Saved', value:s.favorites },
      { label:'\uD83D\uDDBC\uFE0F Gallery Images', value:s.galleryImages },
      { label:'\uD83D\uDC84 User Photos', value:s.userGallery },
      { label:'\uD83C\uDFB5 Songs Played', value:s.songsPlayed },
      { label:'\u23F1\uFE0F Hours Together', value:s.hoursTogether.toFixed(1) },
      { label:'\uD83D\uDC31 Dragon Encounters', value:s.dragonEncounters },
      { label:'\uD83C\uDF33 Tree Growth', value:s.treeGrowth+' pts' },
      { label:'\uD83C\uDFC6 Achievements', value:s.achievementsEarned+' / 13' },
      { label:'\uD83D\uDCC5 Total Visits', value:s.treeVisits }
    ];
    panel.innerHTML += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
    categories.forEach(function(c){
      panel.innerHTML += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px 12px;">'+
        '<div style="font-size:11px;color:#a09080;">'+c.label+'</div>'+
        '<div style="font-size:16px;font-weight:bold;color:#ffe680;">'+c.value+'</div>'+
        (c.sub?'<div style="font-size:9px;color:#706050;">'+c.sub+'</div>':'')+'</div>';
    });
    panel.innerHTML += '</div>';
    panel.innerHTML += '<div style="text-align:center;margin-top:16px;"><button onclick="document.getElementById(\'worldProgress\').remove()" style="background:rgba(255,230,100,0.15);border:1px solid rgba(255,230,100,0.3);color:#ffe680;padding:6px 18px;border-radius:20px;cursor:pointer;">Close</button></div>';
  }

  function init() {
    addButton();
    setInterval(function () {
      try {
        var btn = document.getElementById('worldProgressBtn');
        if (btn && btn.style.display === 'none' && allSectionsRead()) btn.style.display = '';
        refreshDashboard();
      } catch (e) {}
    }, 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 1000); });
  else setTimeout(init, 1000);

  window.WorldProgress = { open: openDashboard, refresh: collectStats };
})();
