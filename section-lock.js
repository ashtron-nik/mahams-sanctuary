/* ---- Section Lock Check (shared) ---- */
/* Replaces inline scripts in 100-organs, love, fantasies, sky-observatory, photo-gallery */
/* Usage: <script>sectionLock('page-key')</script> after fb-db.js */

function sectionLock(k) {
  if (window.FeatureFlags && !window.FeatureFlags.get('section-lock')) return;
  var hidden = false;
  function hide(msg, adminLock) {
    if (hidden) return;
    hidden = true;
    if (!document.body) { setTimeout(function () { hide(msg, adminLock); }, 50); return; }
    var quizBtn = adminLock ? '<button id="sectionQuizUnlockBtn" style="display:inline-block;margin-top:1.2rem;padding:.6rem 1.5rem;border:1px solid rgba(111,207,147,.4);color:#6fcf93;background:rgba(111,207,147,.08);border-radius:8px;cursor:pointer;font-family:Fraunces,Georgia,serif;font-size:.9rem;transition:all .25s;">\uD83E\uDDEA Take Quiz to Unlock</button>' : '';
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#181214;color:#ffebd2;font-family:Georgia,serif;padding:2rem;text-align:center"><div><h1 style="font-family:Fraunces,Georgia,serif;color:#ffe680">\uD83D\uDD12 Locked</h1><p style="color:#6b5f52;margin-top:1rem">' + msg + '</p>' + quizBtn + '<a href="index.html" style="display:inline-block;margin-top:1.5rem;padding:.6rem 1.5rem;border:1px solid #ffe680;color:#ffe680;border-radius:8px;text-decoration:none;font-family:Fraunces,Georgia,serif">\u2190 Back home</a></div></div>';
    document.body.style.display = '';
    if (adminLock) {
      var btn = document.getElementById('sectionQuizUnlockBtn');
      if (btn) {
        btn.onmouseover = function () { this.style.background = '#6fcf93'; this.style.color = '#181214'; };
        btn.onmouseout = function () { this.style.background = 'rgba(111,207,147,.08)'; this.style.color = '#6fcf93'; };
        btn.onclick = function () {
          if (typeof window.openSectionQuiz === 'function') { window.openSectionQuiz(k); }
          else { setTimeout(function () { if (typeof window.openSectionQuiz === 'function') window.openSectionQuiz(k); else alert('Quiz loading, please try again in a moment.'); }, 500); }
        };
      }
    }
  }
  function show() {
    if (!document.body) { setTimeout(show, 50); return; }
    document.body.style.display = '';
  }
  // Hide body until we confirm access
  if (document.body) document.body.style.display = 'none';
  // Check admin lock from Firebase, fall back to localStorage
  function checkAdminLock() {
    if (typeof FB !== 'undefined' && FB.get) {
      FB.get('config', 'access').then(function (ac) {
        var fbLocked = !!(ac && ac[k] && ac[k].adminLocked);
        var localLocked = false;
        try {
          var ar = localStorage.getItem('ash-section-access');
          if (ar) {
            var lac = JSON.parse(ar);
            if (lac[k] && lac[k].adminLocked) localLocked = true;
          }
        } catch (e) {}
        if (fbLocked || localLocked) { hide('This section is currently locked by the admin.', true); return; }
        verify();
      }).catch(function () { checkLocalLock(); });
    } else { checkLocalLock(); }
  }
  function checkLocalLock() {
    try {
      var ar = localStorage.getItem('ash-section-access');
      if (ar) {
        var ac = JSON.parse(ar);
        var sc = ac[k];
        if (sc && sc.adminLocked) { hide('This section is currently locked by the admin.', true); return; }
      }
    } catch (e) {}
    verify();
  }
  // Check date lock from Firebase
  function verify() {
    if (typeof FB === 'undefined' || !FB.init) { setTimeout(verify, 10); return; }
    FB.init();
    FB.get('config', 'sections').then(function (d) {
      var c = d && d.data;
      if (c) for (var i = 0; i < c.length; i++) {
        if (c[i].key === k) {
          var u = c[i];
          if (u.unlockDate && u.autoUnlock !== false) {
            var p = u.unlockDate.split('-');
            var un = new Date(+p[0], +p[1] - 1, +p[2]);
            var nw = new Date(); nw.setHours(0, 0, 0, 0);
            if (nw < un) { hide('This section unlocks on ' + u.unlockDate + '.'); return; }
          }
        }
      }
      show();
    }).catch(function () { show(); });
  }
  checkAdminLock();
}
