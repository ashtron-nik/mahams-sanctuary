(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('interactions')) return;
  try { if (localStorage.getItem('ash-admin-passkey')) return; } catch (e) {}
  var PAGE = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  var QUEUE_KEY = 'ash-interactions-queue';
  var queue = [];
  try { queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (e) { queue = []; }

  function save() {
    // ponytail: cap the queue at 200 — overflow only ever happens offline for
    // a long stretch; flush sends oldest first so real activity is never dropped first
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-200))); } catch (e) {}
  }

  function flush() {
    if (typeof FB === 'undefined' || !queue.length) return;
    FB.init();
    // ponytail: send oldest 30 per flush, re-queue failures — nothing is lost on failure
    var batch = queue.splice(0, 30);
    save();
    batch.forEach(function (entry) {
      FB.put('interactions', entry).catch(function () {
        queue.push(entry);
        save();
      });
    });
  }

  window.Interactions = {
    record: function (type, action, detail) {
      queue.push({ type: type, action: action, detail: String(detail || '').slice(0, 200), page: PAGE, ts: Date.now() });
      if (queue.length >= 50) flush();
      save();
    }
  };

  setInterval(flush, 30000);
  window.addEventListener('beforeunload', flush);
})();
