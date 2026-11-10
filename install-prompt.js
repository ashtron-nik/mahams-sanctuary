(function () {
  'use strict';
  // "Add to home screen" — one small banner, offered once, no nagging
  var KEY = 'ash_install_offered';
  var banner = null;
  var deferred = null;

  function show(html) {
    if (banner || localStorage.getItem(KEY)) return;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    banner = document.createElement('div');
    banner.style.cssText =
      'position:fixed;bottom:1rem;left:1rem;z-index:99999;max-width:300px;' +
      'background:rgba(24,20,14,0.95);border:1px solid rgba(255,230,128,0.25);border-radius:12px;' +
      'padding:0.9rem 1rem 0.9rem 1rem;font-family:Georgia,serif;font-size:0.8rem;color:#e8dcc0;' +
      'box-shadow:0 8px 30px rgba(0,0,0,0.45);backdrop-filter:blur(8px);';
    banner.innerHTML = html;
    document.body.appendChild(banner);
  }

  function dismiss() {
    if (banner) { banner.remove(); banner = null; }
  }

  var ADD = '<div style="font-size:0.8rem;line-height:1.5;color:#e8dcc0;margin-bottom:0.7rem;">Keep me somewhere you can always find me &#x2014; put this on your home screen &#x2661;</div>' +
    '<div style="display:flex;gap:8px;"><button class="ip-install" style="flex:1;cursor:pointer;background:linear-gradient(90deg,#d9a441,#c8792a);border:none;color:#1a1308;font-family:inherit;font-size:0.75rem;padding:0.45rem 0;border-radius:8px;letter-spacing:0.05em;">Add to Home Screen</button>' +
    '<button class="ip-no" style="cursor:pointer;background:transparent;border:1px solid rgba(255,230,128,0.3);color:#c9b98f;font-family:inherit;font-size:0.75rem;padding:0.45rem 0.8rem;border-radius:8px;">Not now</button></div>';

  function bind() {
    if (!banner) return;
    var installBtn = banner.querySelector('.ip-install');
    var noBtn = banner.querySelector('.ip-no');
    if (noBtn) noBtn.addEventListener('click', dismiss);
    if (installBtn && deferred) {
      installBtn.addEventListener('click', function () {
        deferred.prompt();
        deferred.userChoice.then(function (choice) {
          dismiss();
          if (choice.outcome === 'accepted') {
            try { localStorage.setItem('ash_installed', '1'); } catch (e) {}
          }
        });
      });
    } else if (installBtn) {
      // iOS: no install prompt API — show the manual path
      installBtn.addEventListener('click', function () {
        installBtn.textContent = 'Tap the Share icon, then "Add to Home Screen"';
        installBtn.disabled = true;
        setTimeout(function () { installBtn.disabled = false; installBtn.textContent = 'Add to Home Screen'; }, 4000);
      });
    }
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (localStorage.getItem('ash_installed')) return;
    if (document.visibilityState !== 'visible') return;
    setTimeout(function () { if (document.hidden) return; show(ADD); bind(); }, 4000);
  });

  // iOS fallback: offer once after a few seconds, no prompt API available
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isAndroid = /Android/.test(navigator.userAgent);
  if (!isIOS && !isAndroid) return;
  window.addEventListener('load', function () {
    if (localStorage.getItem('ash_installed')) return;
    setTimeout(function () {
      if (document.hidden) return;
      show(ADD);
      bind();
    }, 8000);
  });
})();
