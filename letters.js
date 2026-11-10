(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('letters')) return;
  function openLetterModal() {
    if (typeof FB === 'undefined') return;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#1c181a;border:1px solid rgba(255,210,150,.15);border-radius:16px;padding:2rem;max-width:480px;width:90%;';
    box.innerHTML =
      '<h2 style="color:#ffe680;margin:0 0 .25rem;font-size:1.2rem;">\uD83D\uDCDD Write to You</h2>' +
      '<p style="color:#6b5f52;font-size:.8rem;margin:0 0 1rem;font-style:italic;">A letter only they will see.</p>' +
      '<input type="text" id="ash-letter-subject" placeholder="Subject..." style="width:100%;padding:.5rem .7rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.85rem;outline:none;margin-bottom:.5rem;box-sizing:border-box;">' +
      '<textarea id="ash-letter-body" rows="6" placeholder="Write your letter..." style="width:100%;padding:.5rem .7rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:\'Lora\',Georgia,serif;font-size:.85rem;outline:none;resize:vertical;box-sizing:border-box;"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:.75rem;justify-content:flex-end;">' +
        '<button id="ash-letter-cancel" style="padding:.45rem 1rem;border-radius:6px;background:rgba(232,93,58,.1);border:1px solid #e85d3a44;color:#e85d3a;cursor:pointer;font-family:inherit;font-size:.8rem;">Cancel</button>' +
        '<button id="ash-letter-send" style="padding:.45rem 1rem;border-radius:6px;background:rgba(255,230,128,.1);border:1px solid #ffe68055;color:#ffe680;cursor:pointer;font-family:inherit;font-size:.8rem;">\u2728 Send</button>' +
      '</div>' +
      '<div id="ash-letter-status" style="font-size:.75rem;color:#6b5f52;margin-top:8px;text-align:center;"></div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById('ash-letter-cancel').addEventListener('click', function () { overlay.remove(); });
    document.getElementById('ash-letter-send').addEventListener('click', function () {
      var sub = document.getElementById('ash-letter-subject').value.trim();
      var body = document.getElementById('ash-letter-body').value.trim();
      if (!body) { document.getElementById('ash-letter-status').textContent = 'Write something first.'; return; }
      document.getElementById('ash-letter-send').disabled = true;
      document.getElementById('ash-letter-send').textContent = 'Sending...';
      FB.init();
      FB.put('letters', {
        subject: sub || '(no subject)',
        body: body,
        createdAt: Date.now(),
        read: false
      }).then(function () {
        document.getElementById('ash-letter-status').textContent = '\u2713 Sent.';
        document.getElementById('ash-letter-status').style.color = '#6fcf93';
        setTimeout(function () { overlay.remove(); }, 1200);
      }).catch(function () {
        document.getElementById('ash-letter-status').textContent = 'Failed to send. Try again.';
        document.getElementById('ash-letter-send').disabled = false;
        document.getElementById('ash-letter-send').textContent = '\u2728 Send';
      });
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  }

  function addWriteLink() {
    var links = document.querySelectorAll('footer a, .footer a, nav a');
    var target = null;
    for (var i = 0; i < links.length; i++) {
      if (links[i].textContent.toLowerCase().indexOf('write') > -1) { target = links[i]; break; }
    }
    if (!target) {
      var footer = document.querySelector('footer') || document.querySelector('.footer') || document.body;
      var p = document.createElement('p');
      p.style.cssText = 'text-align:center;margin:2rem 0 1rem;';
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = '\uD83D\uDCDD Write a Letter';
      a.style.cssText = 'color:#6b5f52;font-size:.8rem;text-decoration:none;cursor:pointer;transition:color .25s;';
      a.onmouseover = function () { this.style.color = '#ffe680'; };
      a.onmouseout = function () { this.style.color = '#6b5f52'; };
      a.addEventListener('click', function (e) { e.preventDefault(); openLetterModal(); });
      p.appendChild(a);
      footer.appendChild(p);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addWriteLink);
  else addWriteLink();

  window.openLetterModal = openLetterModal;
})();
