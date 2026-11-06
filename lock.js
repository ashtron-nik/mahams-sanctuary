(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('section-unlock')) return;
  var PAGE = document.body && document.body.dataset.page || window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  var STORAGE_KEY = 'ash-unlocked-group-' + PAGE;

  function dailyRemaining(page) {
    var key = 'ash-daily-' + page;
    var today = new Date().toDateString();
    try {
      var data = JSON.parse(localStorage.getItem(key));
      if (!data || data.date !== today) { localStorage.setItem(key, JSON.stringify({ date: today, count: 0 })); return 2; }
      return Math.max(0, 2 - data.count);
    } catch (e) { return 2; }
  }
  function markDailyRequest(page) {
    var key = 'ash-daily-' + page;
    var today = new Date().toDateString();
    try {
      var data = JSON.parse(localStorage.getItem(key)) || { date: today, count: 0 };
      if (data.date !== today) data = { date: today, count: 0 };
      data.count++; localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function getUnlockedIdx() {
    try { var v = localStorage.getItem(STORAGE_KEY); return v !== null ? parseInt(v, 10) : 0; } catch (e) { return 0; }
  }
  function setUnlockedIdx(n) {
    try { localStorage.setItem(STORAGE_KEY, n); } catch (e) {}
  }

  function applyLockState() {
    var groups = document.querySelectorAll('.accordion-group');
    var unlocked = getUnlockedIdx();
    if (unlocked >= groups.length) { unlocked = 0; setUnlockedIdx(0); }
    var remaining = dailyRemaining(PAGE);
    groups.forEach(function (g, i) {
      var content = g.querySelector('.accordion-content');
      if (i <= unlocked) {
        g.style.display = '';
        g.classList.add('open');
        var oldBtn = g.querySelector('.section-request-btn');
        if (oldBtn) oldBtn.remove();
        if (i === unlocked && i < groups.length - 1) {
          var btn = document.createElement('button');
          btn.className = 'section-request-btn';
          btn.textContent = remaining > 0 ? '\uD83D\uDD12 Request Next Section (' + remaining + '/2 today)' : '\u23F3 Daily limit reached (2/2)';
          btn.style.cssText = 'display:block;margin:2rem auto;padding:.7rem 1.5rem;border-radius:8px;background:rgba(255,230,128,.1);border:1px solid #ffe680;color:#ffe680;font-family:Fraunces,Georgia,serif;font-size:.9rem;cursor:pointer;transition:all .25s;';
          btn.onmouseover = function () { this.style.background = '#ffe680'; this.style.color = '#181214'; };
          btn.onmouseout = function () { this.style.background = 'rgba(255,230,128,.1)'; this.style.color = '#ffe680'; };
          if (remaining <= 0) { btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'default'; }
          else btn.onclick = function () {
            var reqKey = PAGE + '-' + (i + 1);
            FB.get('sectionRequests', reqKey).then(function (existing) {
              if (existing && existing.status === 'pending') {
                alert('Request already sent. Waiting for approval.');
                return;
              }
              FB.put('sectionRequests', {
                id: reqKey,
                page: PAGE,
                groupIndex: i + 1,
                status: 'pending',
                createdAt: Date.now()
              }).then(function () {
                markDailyRequest(PAGE);
                btn.textContent = '\u23F3 Request sent \u2014 waiting...';
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'default';
              }).catch(function () { alert('Failed to send request.'); });
            }).catch(function () { alert('Failed to check.'); });
          };
          var lastTribute = content.querySelector('.tribute:last-of-type');
          if (lastTribute) lastTribute.after(btn);
          else content.appendChild(btn);
        }
        if (window.addSectionQuizBtn) window.addSectionQuizBtn(content, PAGE, i);
      } else {
        g.style.display = 'none';
      }
    });
  }

  function init() {
    if (typeof FB !== 'undefined' && FB.init) {
      FB.init();
      FB.get('sectionUnlock', PAGE).then(function (d) {
        setUnlockedIdx(d && typeof d.unlocked === 'number' ? d.unlocked : 0);
        applyLockState();
        FB.on('sectionUnlock', PAGE, function (val) {
          var fw = val && typeof val.unlocked === 'number' ? val.unlocked : 0;
          if (fw !== getUnlockedIdx()) {
            setUnlockedIdx(fw);
            applyLockState();
          }
        });
      }).catch(function () {
        applyLockState();
      });
    } else {
      applyLockState();
    }
  }

  var origOpen = document.querySelector('.accordion-group');
  if (origOpen) origOpen.classList.add('open');
  init();
})();
