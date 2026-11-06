(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('events')) return;
  var STORAGE_KEY = 'ash-events-seen';

  function getSeen() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function markSeen(id) {
    var seen = getSeen();
    seen[id] = Date.now();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seen)); } catch (e) {}
  }

  function today() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return mm + '-' + dd;
  }

  function isActive(ev) {
    var t = today();
    if (ev.type === 'annual') {
      if (!ev.endDate) return t === ev.startDate;
      if (ev.startDate <= ev.endDate) return t >= ev.startDate && t <= ev.endDate;
      return t >= ev.startDate || t <= ev.endDate;
    }
    if (ev.type === 'range') {
      var start = new Date(ev.startYear, parseInt(ev.startDate.split('-')[0], 10) - 1, parseInt(ev.startDate.split('-')[1], 10));
      var end = new Date(ev.endYear, parseInt(ev.endDate.split('-')[0], 10) - 1, parseInt(ev.endDate.split('-')[1], 10));
      var now = new Date();
      return now >= start && now <= end;
    }
    if (ev.type === 'one-time') return t === ev.startDate && (ev.year || new Date().getFullYear()) == new Date().getFullYear();
    return t === ev.startDate;
  }

  function applyEvent(ev) {
    var key = ev.id || ev.label || 'unknown';
    if (ev.sky && typeof window.Skies !== 'undefined' && window.Skies.applyByTag) {
      window.Skies.applyByTag(ev.sky);
    } else if (ev.sky && typeof window.Skies !== 'undefined' && window.Skies.setCurrent) {
      var match = window.Skies.list && window.Skies.list.filter(function (s) { return s.name && s.name.toLowerCase().indexOf(ev.sky.toLowerCase()) > -1; });
      if (match && match.length) window.Skies.setCurrent(match[0]);
    }
    if (ev.accentColor) {
      var style = document.createElement('style');
      style.id = 'ash-event-theme';
      style.textContent = ':root { --accent: ' + ev.accentColor + '; --accent-dim: ' + ev.accentColor + '88; }';
      var existing = document.getElementById('ash-event-theme');
      if (existing) existing.remove();
      document.head.appendChild(style);
    }
    if (ev.css) {
      var cs = document.createElement('style');
      cs.id = 'ash-event-css';
      cs.textContent = ev.css;
      var existing2 = document.getElementById('ash-event-css');
      if (existing2) existing2.remove();
      document.head.appendChild(cs);
    }
    if ((ev.popup || ev.message) && !getSeen()[key]) {
      markSeen(key);
      setTimeout(function () {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
        var box = document.createElement('div');
        box.style.cssText = 'background:#1c181a;border:1px solid ' + (ev.accentColor || '#ffe680') + '44;border-radius:16px;padding:2rem;max-width:420px;width:90%;text-align:center;';
        box.innerHTML =
          (ev.icon ? '<div style="font-size:3rem;margin-bottom:.5rem;">' + ev.icon + '</div>' : '') +
          '<h2 style="color:' + (ev.accentColor || '#ffe680') + ';margin:0 0 .5rem;">' + (ev.label || '') + '</h2>' +
          (ev.message ? '<p style="color:#d4c5b2;font-size:.9rem;line-height:1.5;">' + ev.message + '</p>' : '') +
          '<button style="margin-top:1rem;padding:.5rem 1.5rem;border-radius:8px;background:' + (ev.accentColor || '#ffe680') + '22;border:1px solid ' + (ev.accentColor || '#ffe680') + ';color:' + (ev.accentColor || '#ffe680') + ';cursor:pointer;font-family:inherit;">\u2728 Lovely</button>';
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        box.querySelector('button').addEventListener('click', function () { overlay.remove(); });
      }, ev.popupDelay || 2000);
    }
  }

  function loadEvents() {
    if (typeof FB === 'undefined' || !FB.init) return;
    FB.init();
    FB.get('config', 'events').then(function (data) {
      var all = data && data.list ? data.list : [];
      for (var i = 0; i < all.length; i++) {
        if (isActive(all[i])) applyEvent(all[i]);
      }
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadEvents);
  else loadEvents();
})();
