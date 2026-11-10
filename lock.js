(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('section-unlock')) return;
  var PAGE = document.body && document.body.dataset.page || window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  var STORAGE_KEY = 'ash-quiz-unlocked-group-' + PAGE;

  function getUnlockedIdx() {
    try { var v = localStorage.getItem(STORAGE_KEY); return v !== null ? parseInt(v, 10) : 0; } catch (e) { return 0; }
  }
  function setUnlockedIdx(n) {
    try { localStorage.setItem(STORAGE_KEY, n); } catch (e) {}
  }

  function applyLockState() {
    var groups = document.querySelectorAll('.accordion-group');
    var unlocked = getUnlockedIdx();
    if (unlocked >= groups.length) { unlocked = groups.length - 1; setUnlockedIdx(unlocked); }
    groups.forEach(function (g, i) {
      var content = g.querySelector('.accordion-content');
      if (i <= unlocked) {
        g.style.display = '';
        g.classList.add('open');
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
        setUnlockedIdx(d && d.version === 'quiz' && typeof d.unlocked === 'number' ? d.unlocked : 0);
        applyLockState();
        FB.on('sectionUnlock', PAGE, function (val) {
          var fw = val && val.version === 'quiz' && typeof val.unlocked === 'number' ? val.unlocked : 0;
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
