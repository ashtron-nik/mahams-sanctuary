(function () {
  var _pk = localStorage.getItem('db-admin-passkey');
  var PASSKEY = _pk ? atob(_pk) : '';
  if (!_pk) localStorage.setItem('db-admin-passkey', btoa(''));
  var songs = [];
  var sections = [];
  var galleryItems = [];

  /* ---- Firebase DB helpers ---- */
  function openDB() { return Promise.resolve(true); }
  function dbGetAll(storeName) { return FB.getAll(storeName); }
  function dbGet(storeName, key) { return FB.get(storeName, key); }
  function dbPut(storeName, data) { return FB.put(storeName, data); }
  function dbDelete(storeName, key) { return FB.delete(storeName, key); }
  function dbClear(storeName) { return FB.clear(storeName); }

  /* ---- Defaults ---- */
  function defaultSections() {
    return [
      { key: '100-organs', label: '100 Organs', file: '100-organs.html', icon: '\uD83D\uDCD6',
        unlockDate: '2026-07-20', autoUnlock: true },
      { key: 'love',        label: 'Love',        file: 'love.html',        icon: '\uD83D\uDC98',
        unlockDate: '2026-07-21', autoUnlock: true },
      { key: 'fantasies',   label: 'Fantasies',   file: 'fantasies.html',   icon: '\uD83D\uDD25',
        unlockDate: '2026-07-25', autoUnlock: true },
      { key: 'sky-observatory', label: 'Sky Observatory', file: 'sky-observatory.html', icon: '\uD83D\uDD2D',
        unlockDate: '2026-07-28', autoUnlock: true },
      { key: 'photo-gallery', label: 'Photo Gallery', file: 'photo-gallery.html', icon: '\uD83D\uDDBC\uFE0F',
        unlockDate: '2026-07-28', autoUnlock: true }
    ];
  }

  function defaultGallery() {
    return [];
  }

  /* ---- Gallery ---- */
  async function loadGallery() {
    var data = await dbGet('config', 'gallery');
    galleryItems = (data && data.items && data.items.length) ? data.items : [];
  }

  async function saveGallery() {
    await dbPut('config', { key: 'gallery', items: galleryItems });
  }

  function renderGallery() {
    var list = document.getElementById('galleryList');
    if (!galleryItems.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F5BC;&#xFE0F;</div><p>No gallery items yet</p></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < galleryItems.length; i++) {
      var g = galleryItems[i];
      var icon = g.type === 'video' ? '\uD83C\uDFA5' : '\uD83D\uDDBC\uFE0F';
      var notePreview = g.note ? esc(g.note).substring(0, 60) + (g.note.length > 60 ? '...' : '') : '';
      html +=
        '<div class="song-card">' +
          '<div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">' + icon + '</div>' +
          '<div class="info">' +
            '<div class="stitle">' + esc(g.label) + '</div>' +
            '<div class="sartist">' + (g.file || 'uploaded file') + '</div>' +
            (notePreview ? '<div class="sartist" style="font-style:italic;color:#6b5f52;">' + notePreview + '</div>' : '') +
          '</div>' +
          '<div class="actions">' +
            '<button class="edit-btn gal-edit" data-index="' + i + '" title="Edit">&#x270E;</button>' +
            '<button class="del-btn gal-del" data-index="' + i + '" title="Delete">&#x2716;</button>' +
          '</div>' +
        '</div>';
    }
    list.innerHTML = html;

    list.querySelectorAll('.gal-edit').forEach(function (btn) {
      btn.addEventListener('click', function () { openGalleryModal(parseInt(this.dataset.index)); });
    });
    list.querySelectorAll('.gal-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        if (confirm('Delete "' + galleryItems[idx].label + '"?')) {
          galleryItems.splice(idx, 1);
          saveGallery().then(function () { renderGallery(); toast('Gallery item deleted'); });
        }
      });
    });
  }

  /* ---- Wishes ---- */
  var allWishes = [];

  function loadWishes() {
    return FB.getAll('wishes').then(function (wishes) {
      allWishes = wishes || [];
      if (allWishes.length) renderWishes();
    }).catch(function () { allWishes = []; });
  }

  function renderWishes() {
    var list = document.getElementById('wishList');
    var stats = document.getElementById('wishStats');
    if (!list) return;

    var search = (document.getElementById('wishSearch').value || '').toLowerCase();
    var sort = document.getElementById('wishSort').value;
    var filter = document.getElementById('wishFilter').value;

    var filtered = allWishes.filter(function (w) {
      if (filter === 'pending' && w.granted) return false;
      if (filter === 'granted' && !w.granted) return false;
      if (filter === 'released' && !w.released) return false;
      if (filter === 'favourite' && !w.favourite) return false;
      if (search && w.text && w.text.toLowerCase().indexOf(search) === -1) return false;
      return true;
    });

    filtered.sort(function (a, b) {
      if (sort === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      if (sort === 'text') return (a.text || '').localeCompare(b.text || '');
      if (sort === 'source') return (a.source || '').localeCompare(b.source || '');
      return (b.createdAt || 0) - (a.createdAt || 0); // newest
    });

    var granted = filtered.filter(function (w) { return w.granted; }).length;
    var pending = filtered.filter(function (w) { return !w.granted && !w.released; }).length;
    var released = filtered.filter(function (w) { return w.released; }).length;
    if (stats) stats.textContent = allWishes.length + ' total \u00B7 ' + filtered.length + ' shown \u00B7 ' + granted + ' granted \u00B7 ' + pending + ' pending \u00B7 ' + released + ' released';

    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x2728;</div><p>No wishes match your criteria</p></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var w = filtered[i];
      var date = w.createdAt ? new Date(w.createdAt).toLocaleDateString() + ' ' + new Date(w.createdAt).toLocaleTimeString() : 'Unknown';
      var grantedDate = w.grantedAt ? '\u00B7 Granted: ' + new Date(w.grantedAt).toLocaleDateString() : '';
      var releasedDate = w.releasedAt ? '\u00B7 Released: ' + new Date(w.releasedAt).toLocaleDateString() : '';
      var statusIcon = w.granted ? '\u2705' : (w.released ? '\uD83C\uDFEE' : '\u23F3');
      var favIcon = w.favourite ? '\u2B50 ' : '';
      var source = w.source || 'observatory';
      var text = w.text || '(empty)';
      var lantern = w.lanternColour ? ' \u00B7 \uD83C\uDFEE ' + w.lanternColour : '';
      html +=
        '<div class="song-card" data-wish-id="' + esc(w.id) + '">' +
          '<div class="info" style="flex:1;min-width:0;">' +
            '<div class="stitle">' + favIcon + statusIcon + ' ' + esc(text) + '</div>' +
            '<div class="smeta">' + date + ' \u00B7 ' + source + grantedDate + releasedDate + lantern + '</div>' +
            (w.released && w.lanternColour ? '<div class="smeta" style="color:#ffe680;">\uD83C\uDFEE Lantern: ' + esc(w.lanternColour) + ' | Glow: ' + (w.lanternGlow || 1) + ' | Size: ' + (w.lanternSize || 1) + '</div>' : '') +
          '</div>' +
          '<div class="actions" style="flex-shrink:0;display:flex;gap:3px;flex-wrap:wrap;">' +
            (w.granted ? '' : '<button class="wish-grant-btn" data-wish-id="' + esc(w.id) + '" style="padding:.3rem .5rem;border-radius:5px;background:rgba(111,207,151,.1);border:1px solid #6fcf97;color:#6fcf97;cursor:pointer;font-size:.7rem;">Grant</button>') +
            '<button class="wish-del-btn" data-wish-id="' + esc(w.id) + '" style="padding:.3rem .5rem;border-radius:5px;background:rgba(232,93,58,.1);border:1px solid #e85d3a;color:#e85d3a;cursor:pointer;font-size:.7rem;">Delete</button>' +
          '</div>' +
        '</div>';
    }
    list.innerHTML = html;

    // Grant buttons
    list.querySelectorAll('.wish-grant-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.dataset.wishId;
        if (confirm('Grant this wish?')) {
          FB.get('wishes', id).then(function (w) {
            if (!w) return;
            w.granted = true;
            w.grantedAt = Date.now();
            FB.put('wishes', w).then(function () {
              loadWishes();
              toast('Wish granted!');
            });
          });
        }
      });
    });

    // Delete buttons
    list.querySelectorAll('.wish-del-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.dataset.wishId;
        if (confirm('Delete this wish permanently?')) {
          FB.delete('wishes', id).then(function () {
            loadWishes();
            toast('Wish deleted');
          });
        }
      });
    });
  }

  function exportWishes(format) {
    if (!allWishes.length) { toast('No wishes to export'); return; }
    var data = allWishes.map(function (w) {
      return {
        id: w.id,
        text: w.text,
        createdAt: new Date(w.createdAt).toISOString(),
        source: w.source,
        granted: w.granted,
        grantedAt: w.grantedAt ? new Date(w.grantedAt).toISOString() : '',
        favourite: w.favourite,
        released: w.released,
        releasedAt: w.releasedAt ? new Date(w.releasedAt).toISOString() : '',
        lanternColour: w.lanternColour || '',
        lanternGlow: w.lanternGlow || '',
        lanternSize: w.lanternSize || ''
      };
    });

    if (format === 'csv') {
      var headers = 'id,text,createdAt,source,granted,grantedAt,favourite,released,releasedAt,lanternColour,lanternGlow,lanternSize\n';
      var csv = headers;
      data.forEach(function (r) {
        csv += '"' + (r.id || '') + '","' + (r.text || '').replace(/"/g, '""') + '","' + r.createdAt + '","' + r.source + '","' + r.granted + '","' + r.grantedAt + '","' + r.favourite + '","' + r.released + '","' + r.releasedAt + '","' + r.lanternColour + '","' + r.lanternGlow + '","' + r.lanternSize + '"\n';
      });
      downloadFile(csv, 'wishes-export.csv', 'text/csv');
    } else {
      downloadFile(JSON.stringify(data, null, 2), 'wishes-export.json', 'application/json');
    }
    toast('Wishes exported as ' + format.toUpperCase());
  }

  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  function renderRequests() {
    var list = document.getElementById('requestsList');
    if (!list) return;
    FB.getAll('songRequests').then(function (requests) {
      if (!requests.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F3B6;</div><p>No song requests yet</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < requests.length; i++) {
        var r = requests[i];
        var date = r.date ? new Date(r.date).toLocaleDateString() : '';
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(r.song) + '</div>' +
              '<div class="smeta">' + date + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="del-btn" data-request-id="' + r.id + '">Done</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = this.dataset.requestId;
          FB.delete('songRequests', id).then(function () {
            toast('Request completed');
            renderRequests();
          });
        });
      });
    }).catch(function () {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading requests</p></div>';
    });
  }

  function renderReviews() {
    var list = document.getElementById('reviewsList');
    if (!list) return;
    list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F3A7;</div><p>Loading reviews...</p></div>';
    FB.getAll('reviews').then(function (reviews) {
      if (!reviews.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F3A7;</div><p>No reviews yet</p></div>';
        return;
      }
      reviews.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      var textReviews = reviews.filter(function(r) { return r.type === 'text' || (!r.type && !r.audioBlob); });
      var audioReviews = reviews.filter(function(r) { return r.type === 'audio' || (!r.type && r.audioBlob); });
      var html = '';
      if (textReviews.length) {
        html += '<h3 style="color:var(--accent);margin:0 0 8px 0;font-size:0.95rem;">&#x1F4DD; Text Reviews (' + textReviews.length + ')</h3>';
        for (var i = 0; i < textReviews.length; i++) {
          var r = textReviews[i];
          var date = r.date ? new Date(r.date).toLocaleString() : '';
          var title = r.section ? esc(r.section) : (r.sectionTitle ? esc(r.sectionTitle) : 'Section #' + (r.sectionIdx != null ? r.sectionIdx : '?'));
          var page = r.file ? esc(r.file) : (r.page ? esc(r.page) : '');
          var text = r.text ? '<div class="review-text">' + esc(r.text) + '</div>' : '';
          html +=
            '<div class="song-card">' +
              '<div class="info" style="flex:1;min-width:0;">' +
                '<div class="stitle">' + title + '</div>' +
                '<div class="smeta">' + page + ' &middot; ' + date + '</div>' +
                (text) +
              '</div>' +
              '<div class="actions" style="align-self:flex-start;">' +
                '<button class="del-btn" data-review-id="' + r.id + '">Delete</button>' +
              '</div>' +
            '</div>';
        }
      }
      if (audioReviews.length) {
        html += '<h3 style="color:var(--accent);margin:16px 0 8px 0;font-size:0.95rem;">&#x1F3A7; Voice Reviews (' + audioReviews.length + ')</h3>';
        for (var j = 0; j < audioReviews.length; j++) {
          var a = audioReviews[j];
          var date2 = a.date ? new Date(a.date).toLocaleString() : '';
          var title2 = a.section ? esc(a.section) : (a.sectionTitle ? esc(a.sectionTitle) : 'Section #' + (a.sectionIdx != null ? a.sectionIdx : '?'));
          var page2 = a.file ? esc(a.file) : (a.page ? esc(a.page) : '');
          var text2 = a.text ? '<div class="review-text">' + esc(a.text) + '</div>' : '';
          var audioHtml = '';
          try { if (!a.audioBlob && a._audioBase64 && typeof FB !== 'undefined' && FB.base64ToBlob) { a.audioBlob = FB.base64ToBlob(a._audioBase64, a._audioType); } } catch(e){}
          if (a.audioBlob) {
            var url = URL.createObjectURL(a.audioBlob);
            var dlExt = 'mp3';
            audioHtml = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><audio controls src="' + url + '" style="flex:1;min-width:160px;height:32px;"></audio><button class="dl-btn" data-url="' + url + '" data-id="' + (a.id || 'unknown') + '" data-ext="' + dlExt + '" style="padding:6px 14px;border-radius:6px;background:rgba(255,210,150,.12);border:1px solid rgba(255,210,150,.2);color:#ffebd2;cursor:pointer;font-size:.78rem;font-family:inherit;white-space:nowrap;">&#x2B07; Download .' + dlExt + '</button></div>';
          } else {
            audioHtml = '<div style="font-size:.72rem;color:#6b5f52;font-style:italic;">Audio unavailable: ' + (a._audioBase64 ? 'blob decode failed' : 'no audio data stored') + ' (keys: ' + Object.keys(a).filter(function(k){return k.indexOf('audio')>=0||k.indexOf('Base64')>=0||k.indexOf('Blob')>=0;}).join(', ') + ')</div>';
          }
          html +=
            '<div class="song-card">' +
              '<div class="info" style="flex:1;min-width:0;">' +
                '<div class="stitle">' + title2 + '</div>' +
                '<div class="smeta">' + page2 + ' &middot; ' + date2 + '</div>' +
                (text2) +
                (audioHtml) +
              '</div>' +
              '<div class="actions" style="align-self:flex-start;">' +
                '<button class="del-btn" data-review-id="' + a.id + '">Delete</button>' +
              '</div>' +
            '</div>';
        }
      }
      list.innerHTML = html;
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = this.dataset.reviewId;
          FB.delete('reviews', id).then(function () {
            toast('Review deleted');
            renderReviews();
          });
        });
      });
      list.querySelectorAll('.dl-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var a = document.createElement('a');
          a.href = this.dataset.url;
          a.download = 'voice-review-' + this.dataset.id + '.' + (this.dataset.ext || 'webm');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      });
    }).catch(function () {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading reviews</p></div>';
    });
  }

  function exportReviews() {
    FB.getAll('reviews').then(function (reviews) {
      if (!reviews.length) { toast('No reviews to export'); return; }
      reviews.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
      var sections = {};
      reviews.forEach(function (r) {
        var key = r.section || r.sectionTitle || ('Section #' + (r.sectionIdx != null ? r.sectionIdx : '?'));
        if (!sections[key]) sections[key] = [];
        sections[key].push(r);
      });
      var esc = function (s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
      var out = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>All Reviews</title>\n' +
        '<style>\n' +
        'body{margin:0;background:#181214;color:#ffebd2;font-family:Georgia,serif;line-height:1.8;padding:2rem max(2rem,5vw);}\n' +
        'h1{color:#ffe680;font-size:1.8rem;text-align:center;margin-bottom:.5rem;}\n' +
        'h2{color:#ffe680;font-size:1.2rem;margin:2.5rem 0 .8rem;padding-bottom:.4rem;border-bottom:1px solid rgba(255,210,150,.15);}\n' +
        '.review{background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);border-radius:10px;padding:1rem 1.2rem;margin-bottom:.8rem;}\n' +
        '.meta{color:#6b5f52;font-size:.8rem;margin-bottom:.4rem;}\n' +
        '.text{color:#ffebd2;font-size:.95rem;white-space:pre-wrap;}\n' +
        '.audio{color:#8a7a5e;font-size:.82rem;font-style:italic;margin-top:.4rem;}\n' +
        '.sub{color:#6b5f52;font-size:.82rem;font-style:italic;margin-top:.2rem;}\n' +
        '.sig{text-align:right;color:#ffe680;font-style:italic;margin-top:2rem;font-size:.9rem;}\n' +
        '</style>\n</head>\n<body>\n' +
        '<h1>All Reviews</h1>\n' +
        '<p style="text-align:center;color:#6b5f52;font-size:.85rem;margin-bottom:2rem;">' + reviews.length + ' reviews across ' + Object.keys(sections).length + ' sections</p>\n';
      var keys = Object.keys(sections);
      keys.forEach(function (sec) {
        out += '<h2>' + esc(sec) + ' <span style="color:#6b5f52;font-weight:normal;font-size:.85rem;">(' + sections[sec].length + ')</span></h2>\n';
        sections[sec].forEach(function (r) {
          var date = r.date ? new Date(r.date).toLocaleString() : '';
          var page = r.file || r.page || '';
          var sub = [];
          if (page) sub.push(esc(page));
          if (date) sub.push(date);
          out += '<div class="review">\n';
          if (sub.length) out += '  <div class="meta">' + sub.join(' &middot; ') + '</div>\n';
          if (r.text) out += '  <div class="text">' + esc(r.text) + '</div>\n';
          if (r.type === 'audio' || r.audioBlob || r._audioBase64) {
            var audioSrc = '';
            if (r._audioBase64) {
              var mime = r._audioType || 'audio/webm';
              audioSrc = 'data:' + mime + ';base64,' + r._audioBase64;
            }
            if (audioSrc) {
              out += '  <div class="audio"><audio controls src="' + audioSrc + '" style="width:100%;height:32px;"></audio></div>\n';
            } else {
              out += '  <div class="audio">[Voice review - audio data unavailable]</div>\n';
            }
          }
          out += '</div>\n';
        });
      });
      out += '<div class="sig">exported from Dreambox</div>\n</body>\n</html>';
      var blob = new Blob([out], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'all-reviews.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Exported ' + reviews.length + ' reviews');
    }).catch(function () { toast('Error exporting reviews'); });
  }

  function renderSectionRequests() {
    var list = document.getElementById('sectionRequestsList');
    if (!list) return;
    FB.getAll('sectionRequests').then(function (requests) {
      var pending = requests.filter(function (r) { return r.status === 'pending'; });
      var approved = requests.filter(function (r) { return r.status === 'approved'; });
      var rejected = requests.filter(function (r) { return r.status === 'rejected'; });
      if (!requests.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F4CB;</div><p>No section requests yet</p></div>';
        return;
      }
      var html = '';

      function card(r, showActions) {
        var pageLabel = r.page === '100-organs' ? '100 Organs' : r.page === 'love' ? 'Love' : r.page;
        var date = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
        return '<div class="section-req-card">' +
            '<div class="info">' +
              '<div class="page">' + esc(pageLabel) + '</div>' +
              '<div class="group">Section ' + (Number(r.groupIndex) + 1) + '</div>' +
              (date ? '<div style="font-size:.7rem;color:#6b5f52;margin-top:2px;">' + esc(date) + '</div>' : '') +
            '</div>' +
            (showActions
              ? '<div class="actions">' +
                  '<button class="approve-btn" data-req-id="' + esc(r.id) + '">&#x2713; Approve</button>' +
                  '<button class="reject-btn" data-req-id="' + esc(r.id) + '">&#x2717; Reject</button>' +
                '</div>'
              : '<div style="font-size:.8rem;color:#6b5f52;font-style:italic;">' + (r.status === 'approved' ? '&#x2713; Approved' : '&#x2717; Rejected') + '</div>') +
          '</div>';
      }

      if (pending.length) {
        html += '<h3 style="color:var(--accent);margin:0 0 8px 0;font-size:.9rem;">&#x23F3; Pending (' + pending.length + ')</h3>';
        pending.forEach(function (r) { html += card(r, true); });
      }
      if (approved.length) {
        html += '<h3 style="color:#6fcf93;margin:1rem 0 8px 0;font-size:.9rem;">&#x2713; Approved (' + approved.length + ')</h3>';
        approved.forEach(function (r) { html += card(r, false); });
      }
      if (rejected.length) {
        html += '<h3 style="color:#e85d3a;margin:1rem 0 8px 0;font-size:.9rem;">&#x2717; Rejected (' + rejected.length + ')</h3>';
        rejected.forEach(function (r) { html += card(r, false); });
      }

      list.innerHTML = html;
      list.querySelectorAll('.approve-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var reqId = this.dataset.reqId;
          FB.get('sectionRequests', reqId).then(function (r) {
            if (!r) return;
            FB.put('sectionUnlock', { id: r.page, unlocked: r.groupIndex }).then(function () {
              r.status = 'approved';
              FB.put('sectionRequests', r).then(function () {
                toast('Section approved!');
                renderSectionRequests();
              });
            });
          });
        });
      });
      list.querySelectorAll('.reject-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var reqId = this.dataset.reqId;
          FB.get('sectionRequests', reqId).then(function (r) {
            if (!r) return;
            r.status = 'rejected';
            FB.put('sectionRequests', r).then(function () {
              toast('Request rejected.');
              renderSectionRequests();
            });
          });
        });
      });
    }).catch(function () {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading requests</p></div>';
    });
  }

  function renderEvents() {
    var list = document.getElementById('eventsList');
    if (!list) return;
    // ponytail: one-time migration — project-events merged into config/events, old store cleared
    FB.get('config', 'events').then(function (data) {
      return FB.get('project-events', 'list').then(function (oldData) {
        var old = Array.isArray(oldData) ? oldData : (oldData && oldData.list ? oldData.list : []);
        if (!old.length) return data;
        var merged = (data && data.list ? data.list : []).concat(old);
        return FB.put('config', { id: 'events', list: merged }).then(function () {
          FB.clear('project-events').catch(function () {});
          return { list: merged };
        });
      });
    }).then(function (data) {
      var events = data && data.list ? data.list : [];
      if (!events.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F3C4;&#x200D;&#x2640;&#xFE0F;</div><p>No events. Add one to trigger seasonal changes.</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < events.length; i++) {
        var e = events[i];
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(e.label || '') + '</div>' +
              '<div class="smeta">' + (e.startDate || '') + (e.endDate ? ' \u2192 ' + e.endDate : '') + ' | ' + (e.type || 'annual') + (e.sky ? ' | Sky: ' + esc(e.sky) : '') + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="edit-btn" data-event-idx="' + i + '" style="background:rgba(255,230,128,.08);border:1px solid rgba(255,230,128,.2);color:#ffe680;padding:.3rem .6rem;border-radius:6px;cursor:pointer;font-size:.75rem;">Edit</button>' +
              '<button class="del-btn" data-event-idx="' + i + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(this.dataset.eventIdx, 10);
          openEventModal(idx, events, data);
        });
      });
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this event?')) return;
          var idx = parseInt(this.dataset.eventIdx, 10);
          events.splice(idx, 1);
          FB.put('config', { id: 'events', list: events }).then(function () { renderEvents(); toast('Event deleted.'); });
        });
      });
    }).catch(function () { list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading events</p></div>'; });
  }

  function openEventModal(idx, events, data) {
    var e = idx >= 0 ? events[idx] : {};
    var isNew = idx < 0 || idx >= events.length;
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Event' : 'Edit Event') + '</h2>' +
      '<div class="field"><label>Label</label><input type="text" id="fEvLabel" value="' + esc(e.label || '') + '"></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Type</label><select id="fEvType" style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.85rem;outline:none;">' +
          '<option value="annual"' + (e.type === 'annual' ? ' selected' : '') + '>Annual (repeats)</option>' +
          '<option value="one-time"' + (e.type === 'one-time' ? ' selected' : '') + '>One-time</option>' +
        '</select></div>' +
        '<div class="field"><label>Start (MM-DD)</label><input type="text" id="fEvStart" value="' + esc(e.startDate || '') + '" placeholder="07-20"></div>' +
        '<div class="field"><label>End (MM-DD)</label><input type="text" id="fEvEnd" value="' + esc(e.endDate || '') + '" placeholder="07-27 (leave blank for 1 day)"></div>' +
      '</div>' +
      '<div class="field"><label>Sky tag</label><input type="text" id="fEvSky" value="' + esc(e.sky || '') + '" placeholder="e.g. Sunset Bliss, Starry Night"></div>' +
      '<div class="field"><label>Accent color</label><input type="text" id="fEvColor" value="' + esc(e.accentColor || '') + '" placeholder="#ff6b6b"></div>' +
      '<div class="field"><label>Icon (emoji)</label><input type="text" id="fEvIcon" value="' + esc(e.icon || '') + '" placeholder="&#x1F389;"></div>' +
      '<div class="field"><label>Popup message</label><textarea id="fEvMsg" rows="2" placeholder="Happy anniversary!">' + esc(e.message || '') + '</textarea></div>' +
      '<div class="field"><label>Custom CSS</label><textarea id="fEvCss" rows="2" placeholder="body { filter: sepia(0.3); }">' + esc(e.css || '') + '</textarea></div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalEvSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalEvSave').addEventListener('click', function () {
      var ev = {
        label: document.getElementById('fEvLabel').value.trim(),
        type: document.getElementById('fEvType').value,
        startDate: document.getElementById('fEvStart').value.trim(),
        endDate: document.getElementById('fEvEnd').value.trim() || '',
        sky: document.getElementById('fEvSky').value.trim(),
        accentColor: document.getElementById('fEvColor').value.trim(),
        icon: document.getElementById('fEvIcon').value.trim(),
        message: document.getElementById('fEvMsg').value.trim(),
        css: document.getElementById('fEvCss').value.trim()
      };
      if (ev.type === 'one-time' && !ev.startDate.includes('-')) { ev.startDate = ev.startDate; }
      if (ev.type === 'one-time') ev.year = new Date().getFullYear();
      if (!ev.label || !ev.startDate) { toast('Label and start date required.'); return; }
      events = data && data.list ? data.list : [];
      if (isNew) events.push(ev);
      else events[idx] = ev;
      FB.put('config', { id: 'events', list: events }).then(function () { closeModal(); renderEvents(); toast('Event saved.'); });
    });
  }

  /* ───── Quiz Admin ───── */
  function renderQuiz() {
    FB.get('config', 'quizzes').then(function (d) {
      var list = d && Array.isArray(d) ? d : (d && d.list ? d.list : []);
      var container = document.getElementById('quizList');
      if (!container) return;
      if (!list.length) { container.innerHTML = '<p style="color:#6b5f52;font-size:.85rem;">No quiz sets yet.</p>'; return; }
      var html = '';
      list.forEach(function (q, i) {
        var qCount = q.questions ? q.questions.length : 0;
        html += '<div class="req-item" data-idx="' + i + '">' +
          '<div style="flex:1"><strong style="color:#ffebd2;">' + esc(q.title || 'Untitled') + '</strong>' +
          ' <span style="color:#6b5f52;font-size:.75rem;">(' + qCount + ' questions)</span></div>' +
          '<div style="display:flex;gap:6px;">' +
          '<button class="edit-btn" data-idx="' + i + '">Edit</button>' +
          '<button class="del-btn" data-idx="' + i + '">Delete</button></div></div>';
      });
      container.innerHTML = html;
      container.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { editQuiz(parseInt(this.dataset.idx)); });
      });
      container.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this quiz set?')) return;
          var idx = parseInt(this.dataset.idx);
          list.splice(idx, 1);
          FB.put('config', { id: 'quizzes', list: list }).then(function () { renderQuiz(); toast('Quiz deleted.'); });
        });
      });
    });
    renderQuizHistory();
  }

  function editQuiz(idx) {
    FB.get('config', 'quizzes').then(function (d) {
      var list = d && Array.isArray(d) ? d : (d && d.list ? d.list : []);
      var quiz = list[idx] || { id: '', title: '', questions: [] };
      var html = '<h2 style="margin:0 0 1rem;color:#ffe680;font-size:1.1rem;">' + (idx >= 0 ? 'Edit Quiz' : 'Add Quiz') + '</h2>';
      html += '<label style="display:block;color:#6b5f52;font-size:.8rem;margin-bottom:2px;">ID</label>' +
        '<input id="qId" value="' + esc(quiz.id || '') + '" placeholder="e.g. quiz-1" style="width:100%;padding:.5rem .6rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;margin-bottom:.6rem;outline:none;box-sizing:border-box;">';
      html += '<label style="display:block;color:#6b5f52;font-size:.8rem;margin-bottom:2px;">Page (optional, leave empty for all)</label>' +
        '<input id="qPage" value="' + esc(quiz.page || '') + '" placeholder="e.g. 100-organs" style="width:100%;padding:.5rem .6rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;margin-bottom:.6rem;outline:none;box-sizing:border-box;">';
      html += '<label style="display:block;color:#6b5f52;font-size:.8rem;margin-bottom:2px;">Title</label>' +
        '<input id="qTitle" value="' + esc(quiz.title || '') + '" style="width:100%;padding:.5rem .6rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;margin-bottom:.6rem;outline:none;box-sizing:border-box;">';
      html += '<label style="display:block;color:#6b5f52;font-size:.8rem;margin-bottom:2px;">Questions (JSON array)</label>' +
        '<textarea id="qQuestions" rows="8" style="width:100%;padding:.5rem .6rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:monospace;font-size:.8rem;outline:none;resize:vertical;box-sizing:border-box;">' + esc(JSON.stringify(quiz.questions || [], null, 2)) + '</textarea>';
      html += '<div style="display:flex;gap:6px;margin-top:1rem;">' +
        '<button id="qSave" style="padding:.5rem 1rem;border-radius:6px;background:rgba(111,207,147,.1);border:1px solid rgba(111,207,147,.3);color:#6fcf93;cursor:pointer;">Save</button>' +
        '<button onclick="closeModal()" style="padding:.5rem 1rem;border-radius:6px;background:rgba(232,93,58,.1);border:1px solid rgba(232,93,58,.3);color:#e85d3a;cursor:pointer;">Cancel</button></div>';
      openModal(html);
      document.getElementById('qSave').addEventListener('click', function () {
        var newId = document.getElementById('qId').value.trim();
        var page = document.getElementById('qPage').value.trim();
        var title = document.getElementById('qTitle').value.trim();
        var questionsStr = document.getElementById('qQuestions').value.trim();
        var questions = [];
        try { questions = JSON.parse(questionsStr); if (!Array.isArray(questions)) throw 'not array'; } catch (e) { toast('Questions must be a valid JSON array.'); return; }
        if (!newId) { toast('ID is required.'); return; }
        if (!title) { toast('Title is required.'); return; }
        FB.get('config', 'quizzes').then(function (d2) {
          var qList = d2 && Array.isArray(d2) ? d2 : (d2 && d2.list ? d2.list : []);
          var updated = { id: newId, page: page, title: title, questions: questions };
          if (idx >= 0 && idx < qList.length) qList[idx] = updated;
          else qList.push(updated);
          FB.put('config', { id: 'quizzes', list: qList }).then(function () { closeModal(); renderQuiz(); toast('Quiz saved.'); });
        });
      });
    });
  }

  window.toggleHist = function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  function renderQuizHistory() {
    FB.get('quizHistory', 'all').then(function (d) {
      var history = d && d.items ? d.items : [];
      var container = document.getElementById('quizHistoryList');
      if (!container) return;
      if (!history.length) { container.innerHTML = '<p style="color:#6b5f52;font-size:.85rem;">No attempts yet.</p>'; return; }
      var html = '';
      for (var i = history.length - 1; i >= 0; i--) {
        var h = history[i];
        var id = 'qhist-' + i;
        html += '<div style="margin-bottom:4px;border-radius:4px;background:rgba(255,220,160,.02);font-size:.8rem;">' +
          '<div onclick="toggleHist(\'' + id + '\')" style="padding:.4rem .6rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">' +
          '<div><span style="color:#ffebd2;">' + esc(h.quizId || '?') + '</span>' +
          ' <span style="color:#6b5f52;">|</span> <span style="color:#6fcf93;">' + (h.score || 0) + '/' + (h.total || 0) + '</span>' +
          ' <span style="color:' + (h.passed ? '#6fcf93' : '#e85d3a') + ';">' + (h.passed ? 'PASS' : 'FAIL') + '</span>' +
          ' <span style="color:#6b5f52;font-size:.7rem;">' + (h.timestamp ? new Date(h.timestamp).toLocaleString() : '') + '</span></div>' +
          '<span style="color:#6b5f52;">\u25BC</span></div>' +
          '<div id="' + id + '" style="display:none;padding:.3rem .6rem .6rem;border-top:1px solid rgba(255,255,255,0.04);">';
        if (h.answers && h.answers.length) {
          h.answers.forEach(function (a) {
            var icon = a.isCorrect ? '\u2705' : '\u274C';
            var aColor = a.isCorrect ? '#6fcf93' : '#e85d3a';
            html += '<div style="padding:.3rem 0;font-size:.75rem;line-height:1.4;border-bottom:1px solid rgba(255,255,255,0.02);">' +
              '<div style="color:#c7b8a1;">' + esc(a.question) + '</div>' +
              '<div style="color:' + aColor + ';">' + icon + ' ' + esc(a.chosen) + '</div>';
            if (!a.isCorrect) html += '<div style="color:#6fcf93;">\u2705 ' + esc(a.correct) + '</div>';
            html += '</div>';
          });
        } else {
          html += '<div style="color:#6b5f52;font-size:.75rem;">No answer details recorded.</div>';
        }
        html += '</div></div>';
      }
      container.innerHTML = html;
    }).catch(function () {});
  }

  /* ───── Project Puzzles ───── */
  function getProjectPuzzles(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.list) return Array.isArray(data.list) ? data.list : getProjectPuzzles(data.list);
    var keys = Object.keys(data).filter(function (k) { return k !== 'id' && k !== 'key'; });
    if (keys.length && keys.every(function (k) { return String(parseInt(k, 10)) === k; })) {
      return keys.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).map(function (k) { return data[k]; });
    }
    return [];
  }

  function renderProjectPuzzles() {
    var list = document.getElementById('projectPuzzlesList');
    if (!list) return;
    FB.get('project-puzzles', 'list').then(function (data) {
      var puzzles = getProjectPuzzles(data);
      if (window.PuzzleHunt && window.PuzzleHunt.getDefaultPuzzles) {
        var ids = {};
        puzzles.forEach(function (p) { if (p && p.id) ids[p.id] = 1; });
        window.PuzzleHunt.getDefaultPuzzles().forEach(function (p) {
          if (p && p.id && !ids[p.id]) { p.isBuiltIn = true; puzzles.push(p); ids[p.id] = 1; }
        });
      }
      if (!puzzles.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F9E9;</div><p>No project puzzles yet.</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < puzzles.length; i++) {
        var p = puzzles[i];
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(p.title || '') + (p.isBuiltIn ? ' <span style="color:#6b5f52;font-size:.7rem;">[built-in]</span>' : '') + '</div>' +
              '<div class="smeta">' + (p.steps ? p.steps.length : 0) + ' steps' +
                (p.page ? ' · ' + esc(p.page) + (p.sectionIdx !== undefined ? ' · section ' + p.sectionIdx : '') : '') + '</div>' +
              (p.subtitle ? '<div style="font-size:.72rem;color:#6b5f52;font-style:italic;margin-top:2px;">' + esc(p.subtitle) + '</div>' : '') +
            '</div>' +
            '<div class="actions">' +
              '<button class="edit-btn" data-idx="' + i + '" style="background:rgba(255,230,128,.08);border:1px solid rgba(255,230,128,.2);color:#ffe680;padding:.3rem .6rem;border-radius:6px;cursor:pointer;font-size:.75rem;">Edit</button>' +
              (p.isBuiltIn ? '' : '<button class="del-btn" data-idx="' + i + '">Delete</button>') +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      var pData = data;
      list.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { openProjectPuzzleModal(parseInt(this.dataset.idx, 10), puzzles, pData); });
      });
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this puzzle?')) return;
          var idx = parseInt(this.dataset.idx, 10);
          puzzles.splice(idx, 1);
          FB.put('project-puzzles', { id: 'list', list: puzzles.filter(function (x) { return x && !x.isBuiltIn; }) }).then(function () { renderProjectPuzzles(); toast('Puzzle deleted.'); });
        });
      });
    }).catch(function () { list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading</p></div>'; });
  }

  function openProjectPuzzleModal(idx, puzzles, data) {
    var p = idx >= 0 && idx < puzzles.length ? puzzles[idx] : { steps: [] };
    var isNew = idx < 0 || idx >= puzzles.length;
    var stepsHtml = '';
    var steps = p.steps || [];
    for (var si = 0; si < steps.length; si++) {
      stepsHtml += '<div class="pz-step" style="background:rgba(255,220,160,.03);border:1px solid rgba(255,210,150,.08);border-radius:6px;padding:.5rem;margin-bottom:.5rem;">' +
        '<div class="field"><label>Hint</label><input type="text" class="pz-hint" value="' + esc(steps[si].hint || '') + '"></div>' +
        '<div class="field"><label>Answer</label><input type="text" class="pz-answer" value="' + esc(steps[si].answer || '') + '"></div>' +
        '<div class="field-row">' +
          '<div class="field" style="flex:1;"><label>Auto type</label><select class="pz-auto-type" style="width:100%;padding:.4rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.8rem;outline:none;">' +
            '<option value="">None (answer required)</option>' +
            '<option value="page-visit"' + (steps[si].auto && steps[si].auto.type === 'page-visit' ? ' selected' : '') + '>Auto: visit page</option>' +
            '<option value="section-view"' + (steps[si].auto && steps[si].auto.type === 'section-view' ? ' selected' : '') + '>Auto: view section</option>' +
          '</select></div>' +
          '<div class="field" style="flex:1;"><label>Auto target</label><input type="text" class="pz-auto-target" value="' + esc((steps[si].auto && steps[si].auto.target) || (steps[si].auto && steps[si].auto.page) || (steps[si].auto && String(steps[si].auto.sectionIdx)) || '') + '"></div>' +
        '</div>' +
        '<div style="display:flex;gap:4px;margin-top:4px;">' +
          '<button class="pz-step-del" style="padding:.2rem .5rem;border-radius:4px;background:rgba(232,93,58,.1);border:1px solid #e85d3a44;color:#e85d3a;cursor:pointer;font-size:.7rem;">Remove</button>' +
        '</div>' +
      '</div>';
    }
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Project Puzzle' : 'Edit Project Puzzle') + '</h2>' +
      '<div class="field"><label>Title</label><input type="text" id="fPzTitle" value="' + esc(p.title || '') + '"></div>' +
      '<div class="field"><label>ID (unique, no spaces)</label><input type="text" id="fPzId" value="' + esc(p.id || '') + '"></div>' +
      '<h3 style="color:#ffebd2;font-size:.9rem;margin:1rem 0 .5rem;">Steps</h3>' +
      '<div id="pzStepsContainer">' + stepsHtml + '</div>' +
      '<button id="pzAddStepBtn" style="margin-bottom:1rem;padding:.35rem .7rem;border-radius:6px;background:rgba(255,230,128,.08);border:1px solid rgba(255,230,128,.2);color:#ffe680;cursor:pointer;font-size:.8rem;">+ Add Step</button>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalPzSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('pzAddStepBtn').addEventListener('click', function () {
      var container = document.getElementById('pzStepsContainer');
      var div = document.createElement('div');
      div.className = 'pz-step';
      div.style.cssText = 'background:rgba(255,220,160,.03);border:1px solid rgba(255,210,150,.08);border-radius:6px;padding:.5rem;margin-bottom:.5rem;';
      div.innerHTML =
        '<div class="field"><label>Hint</label><input type="text" class="pz-hint"></div>' +
        '<div class="field"><label>Answer</label><input type="text" class="pz-answer"></div>' +
        '<div class="field-row">' +
          '<div class="field" style="flex:1;"><label>Auto type</label><select class="pz-auto-type" style="width:100%;padding:.4rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.8rem;outline:none;">' +
            '<option value="">None (answer required)</option>' +
            '<option value="page-visit">Auto: visit page</option>' +
            '<option value="section-view">Auto: view section</option>' +
          '</select></div>' +
          '<div class="field" style="flex:1;"><label>Auto target</label><input type="text" class="pz-auto-target"></div>' +
        '</div>' +
        '<div style="display:flex;gap:4px;margin-top:4px;">' +
          '<button class="pz-step-del" style="padding:.2rem .5rem;border-radius:4px;background:rgba(232,93,58,.1);border:1px solid #e85d3a44;color:#e85d3a;cursor:pointer;font-size:.7rem;">Remove</button>' +
        '</div>';
      container.appendChild(div);
      div.querySelector('.pz-step-del').addEventListener('click', function () { div.remove(); });
    });
    document.getElementById('pzStepsContainer').querySelectorAll('.pz-step-del').forEach(function (btn) {
      btn.addEventListener('click', function () { this.closest('.pz-step').remove(); });
    });
    document.getElementById('modalPzSave').addEventListener('click', function () {
      var stepEls = document.getElementById('pzStepsContainer').querySelectorAll('.pz-step');
      var stepsData = [];
      stepEls.forEach(function (el) {
        var autoType = el.querySelector('.pz-auto-type').value;
        var autoTarget = el.querySelector('.pz-auto-target').value.trim();
        var step = { hint: el.querySelector('.pz-hint').value.trim(), answer: el.querySelector('.pz-answer').value.trim() };
        if (autoType && autoTarget) {
          if (autoType === 'page-visit') step.auto = { type: 'page-visit', page: autoTarget };
          else if (autoType === 'section-view') step.auto = { type: 'section-view', sectionIdx: parseInt(autoTarget, 10) || 0 };
        }
        stepsData.push(step);
      });
      var puzzle = { id: document.getElementById('fPzId').value.trim(), title: document.getElementById('fPzTitle').value.trim(), steps: stepsData };
      if (!puzzle.id || !puzzle.title) { toast('ID and title required.'); return; }
      puzzles = getProjectPuzzles(data);
      if (isNew) puzzles.push(puzzle);
      else puzzles[idx] = puzzle;
      FB.put('project-puzzles', { id: 'list', list: puzzles.filter(function (x) { return x && x.id; }) }).then(function () { closeModal(); renderProjectPuzzles(); toast('Project puzzle saved.'); });
    });
  }

  /* ───── Quiz Admin ───── */
  function renderStoryline() {
    var list = document.getElementById('storylineList');
    if (!list) return;
    FB.get('project-texts', 'list').then(function (data) {
      var items = getProjectPuzzles(data);
      if (!items.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F4D6;</div><p>No chapters yet. Add the first one.</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var s = items[i];
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(s.title || 'Chapter ' + (i + 1)) + '</div>' +
              '<div class="smeta">' + (s.body ? (s.body.slice(0, 80) + (s.body.length > 80 ? '...' : '')) : '') + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="edit-btn" data-idx="' + i + '" style="background:rgba(255,230,128,.08);border:1px solid rgba(255,230,128,.2);color:#ffe680;padding:.3rem .6rem;border-radius:6px;cursor:pointer;font-size:.75rem;">Edit</button>' +
              '<button class="del-btn" data-idx="' + i + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      var pData = data;
      list.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { openStorylineModal(parseInt(this.dataset.idx, 10), items, pData); });
      });
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this chapter?')) return;
          var idx = parseInt(this.dataset.idx, 10);
          items.splice(idx, 1);
          FB.put('project-texts', { id: 'list', list: items }).then(function () { renderStoryline(); toast('Chapter deleted.'); });
        });
      });
    }).catch(function () { list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading storyline</p></div>'; });
  }

  function openStorylineModal(idx, items, data) {
    var s = idx >= 0 ? items[idx] : {};
    var isNew = idx < 0 || idx >= items.length;
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Chapter' : 'Edit Chapter') + '</h2>' +
      '<div class="field"><label>Chapter Title</label><input type="text" id="fSlTitle" value="' + esc(s.title || '') + '" placeholder="e.g. Why I Built This"></div>' +
      '<div class="field"><label>Body</label><textarea id="fSlBody" rows="8" placeholder="Write this chapter of the story..." style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:\'Lora\',Georgia,serif;font-size:.85rem;outline:none;resize:vertical;">' + esc(s.body || '') + '</textarea></div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalSlSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalSlSave').addEventListener('click', function () {
      var chapter = {
        title: document.getElementById('fSlTitle').value.trim(),
        body: document.getElementById('fSlBody').value.trim()
      };
      if (!chapter.body) { toast('Write something for this chapter.'); return; }
      items = getProjectPuzzles(data);
      if (isNew) items.push(chapter);
      else items[idx] = chapter;
      FB.put('project-texts', { id: 'list', list: items }).then(function () { closeModal(); renderStoryline(); toast('Chapter saved.'); });
    });
  }

  /* ---- Self Letters (letter that writes itself) ---- */
  var allSelfLetters = [];

  function renderSelfLetters() {
    var list = document.getElementById('selfLettersList');
    if (!list) return;
    if (window.SEED_CONTENT) window.SEED_CONTENT.seedAll();
    FB.getAll('selfLetters').then(function (letters) {
      allSelfLetters = (letters && letters.length) ? letters : (window.SEED_CONTENT ? window.SEED_CONTENT.letters : []);
      if (!allSelfLetters.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x270D;</div><p>No self-writing letters yet.</p></div>';
        return;
      }
      var html = '';
      for (var i = allSelfLetters.length - 1; i >= 0; i--) {
        var l = allSelfLetters[i];
        var flags = [];
        if (l.enabled === false) flags.push('off');
        if (l.scheduledDate) flags.push('scheduled ' + l.scheduledDate);
        if (l.secret) flags.push('secret');
        if (l.music) flags.push('music');
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(l.title || 'Untitled') + (flags.length ? ' <span style="color:#6b5f52;font-size:.7rem;">[' + flags.join(' · ') + ']</span>' : '') + '</div>' +
              '<div style="font-size:.82rem;color:#d4c5b2;margin-top:2px;font-style:italic;">' + esc((l.body || '').slice(0, 120)) + ((l.body || '').length > 120 ? '…' : '') + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="btn-small" data-edit="' + i + '">Edit</button>' +
              '<button class="btn-small" data-prev="' + i + '">Preview</button>' +
              '<button class="btn-small btn-danger" data-del="' + i + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () { openSelfLetterModal(parseInt(b.dataset.edit, 10), allSelfLetters); });
      });
      list.querySelectorAll('[data-prev]').forEach(function (b) {
        b.addEventListener('click', function () {
          var l = allSelfLetters[parseInt(b.dataset.prev, 10)];
          openModal(
            '<h2>' + esc(l.title || 'Untitled') + '</h2>' +
            '<p style="font-style:italic;color:#d4c5b2;white-space:pre-wrap;">' + esc(l.recipient || 'Dear friend') + ',<br><br>' + esc(l.body || '') + '<br><br>' + esc(l.signature || '') + '</p>'
          );
        });
      });
      list.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('Delete this letter?')) return;
          FB.delete('selfLetters', allSelfLetters[parseInt(b.dataset.del, 10)].id).then(function () { renderSelfLetters(); toast('Letter deleted.'); });
        });
      });
    });
  }

  function openSelfLetterModal(idx, letters) {
    var l = idx >= 0 && idx < letters.length ? letters[idx] : {};
    var isNew = !(idx >= 0 && idx < letters.length);
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Letter' : 'Edit Letter') + '</h2>' +
      '<div class="field-row">' +
        '<div class="field"><label>Title</label><input type="text" id="fSlTitle" value="' + esc(l.title || '') + '"></div>' +
        '<div class="field"><label>Recipient</label><input type="text" id="fSlTo" value="' + esc(l.recipient || 'Dear friend') + '"></div>' +
      '</div>' +
      '<div class="field"><label>Body (blank line = new paragraph)</label><textarea id="fSlBody" rows="10" style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:\'Lora\',Georgia,serif;font-size:.85rem;outline:none;resize:vertical;">' + esc(l.body || '') + '</textarea></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Signature</label><input type="text" id="fSlSig" value="' + esc(l.signature || '') + '"></div>' +
        '<div class="field"><label>Schedule date (YYYY-MM-DD)</label><input type="text" id="fSlDate" value="' + esc(l.scheduledDate || '') + '" placeholder="2026-08-02"></div>' +
      '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Music file (in songs/)</label><input type="text" id="fSlMusic" value="' + esc(l.music || '') + '" placeholder="Ed Sheeran - Perfect.mp4"></div>' +
        '<div class="field"><label>Priority</label><input type="number" id="fSlPriority" value="' + esc(l.priority || 0) + '"></div>' +
      '</div>' +
      '<div class="field" style="display:flex;gap:1.4rem;flex-wrap:wrap;margin-top:.6rem;">' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#d4c5b2;"><input type="checkbox" id="fSlOn"' + (l.enabled === false ? '' : ' checked') + '> enabled</label>' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#d4c5b2;"><input type="checkbox" id="fSlSecret"' + (l.secret ? ' checked' : '') + '> secret (hidden path only)</label>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalSlSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalSlSave').addEventListener('click', function () {
      var body = document.getElementById('fSlBody').value.trim();
      if (!body) { toast('Write the letter first.'); return; }
      var entry = {
        title: document.getElementById('fSlTitle').value.trim(),
        recipient: document.getElementById('fSlTo').value.trim() || 'Dear friend',
        body: body,
        signature: document.getElementById('fSlSig').value.trim() || '',
        scheduledDate: document.getElementById('fSlDate').value.trim(),
        music: document.getElementById('fSlMusic').value.trim(),
        priority: parseInt(document.getElementById('fSlPriority').value, 10) || 0,
        enabled: !!document.getElementById('fSlOn').checked,
        secret: !!document.getElementById('fSlSecret').checked,
        createdAt: l.createdAt || Date.now()
      };
      if (!isNew) entry.id = letters[idx].id;
      FB.put('selfLetters', entry).then(function () { closeModal(); renderSelfLetters(); toast('Letter saved.'); });
    });
  }

  document.getElementById('addSelfLetterBtn') && document.getElementById('addSelfLetterBtn').addEventListener('click', function () {
    openSelfLetterModal(-1, allSelfLetters);
  });

  /* ---- I Remember (memories) ---- */
  var allMemories = [];

  function renderMemories() {
    var list = document.getElementById('memoriesList');
    if (!list) return;
    if (window.SEED_CONTENT) window.SEED_CONTENT.seedAll();
    FB.getAll('memories').then(function (memories) {
      allMemories = (memories && memories.length) ? memories : (window.SEED_CONTENT ? window.SEED_CONTENT.memories : []);
      if (!allMemories.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F338;</div><p>No memories yet. Add the first tiny thing you remember.</p></div>';
        return;
      }
      var html = '';
      for (var i = allMemories.length - 1; i >= 0; i--) {
        var m = allMemories[i];
        var flags = [];
        if (m.on === false) flags.push('off');
        if (m.rare) flags.push('rare');
        if (m.once) flags.push('once');
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(m.cat ? m.cat : 'little thing') + (flags.length ? ' <span style="color:#6b5f52;font-size:.7rem;">[' + flags.join(' · ') + ']</span>' : '') + '</div>' +
              '<div style="font-size:.82rem;color:#d4c5b2;margin-top:2px;font-style:italic;">' + esc(m.text || '').slice(0, 140) + (m.text && m.text.length > 140 ? '…' : '') + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="btn-small" data-edit="' + i + '">Edit</button>' +
              '<button class="btn-small btn-danger" data-del="' + i + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () { openMemoryModal(parseInt(b.dataset.edit, 10), allMemories); });
      });
      list.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('Delete this memory?')) return;
          FB.delete('memories', allMemories[parseInt(b.dataset.del, 10)].id).then(function () { renderMemories(); toast('Memory deleted.'); });
        });
      });
    });
  }

  function openMemoryModal(idx, memories) {
    var m = idx >= 0 && idx < memories.length ? memories[idx] : {};
    var isNew = !(idx >= 0 && idx < memories.length);
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Memory' : 'Edit Memory') + '</h2>' +
      '<div class="field"><label>Category</label><input type="text" id="fMemCat" value="' + esc(m.cat || '') + '" placeholder="Little Things / Things You Do / Moments..."></div>' +
      '<div class="field"><label>Memory</label><textarea id="fMemText" rows="4" style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:\'Lora\',Georgia,serif;font-size:.85rem;outline:none;resize:vertical;" placeholder="I remember the way you...">' + esc(m.text || '') + '</textarea></div>' +
      '<div class="field" style="display:flex;gap:1.4rem;flex-wrap:wrap;margin-top:.6rem;">' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#d4c5b2;"><input type="checkbox" id="fMemRare"' + (m.rare ? ' checked' : '') + '> rare</label>' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#d4c5b2;"><input type="checkbox" id="fMemOnce"' + (m.once ? ' checked' : '') + '> once</label>' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#d4c5b2;"><input type="checkbox" id="fMemOn"' + (m.on === false ? '' : ' checked') + '> enabled</label>' +
      '</div>' +
      '<p style="color:#6b5f52;font-size:.75rem;font-style:italic;margin:.6rem 0 0;">Specific over generic: "I remember how your messages get longer when you\'re excited" — not "you\'re beautiful".</p>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalMemSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalMemSave').addEventListener('click', function () {
      var text = document.getElementById('fMemText').value.trim();
      if (!text) { toast('Write the memory first.'); return; }
      var entry = {
        cat: document.getElementById('fMemCat').value.trim(),
        text: text,
        rare: !!document.getElementById('fMemRare').checked,
        once: !!document.getElementById('fMemOnce').checked,
        on: !!document.getElementById('fMemOn').checked,
        createdAt: m.createdAt || Date.now()
      };
      if (!isNew) entry.id = memories[idx].id;
      FB.put('memories', entry).then(function () { closeModal(); renderMemories(); toast('Memory saved.'); });
    });
  }

  document.getElementById('addMemoryBtn') && document.getElementById('addMemoryBtn').addEventListener('click', function () {
    openMemoryModal(-1, allMemories);
  });

  /* ---- Rare Links (For Tonight bonus videos) ---- */
  var allRare = [];

  function renderRare() {
    var list = document.getElementById('rareList');
    if (!list) return;
    FB.getAll('rareLinks').then(function (rare) {
      allRare = rare || [];
      if (!allRare.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F48E;</div><p>No rare links yet. Add a YouTube link and it will occasionally play under the nightly gift.</p></div>';
        return;
      }
      var html = '';
      for (var i = allRare.length - 1; i >= 0; i--) {
        var r = allRare[i];
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(r.title || 'rare link') + (r.on === false ? ' <span style="color:#6b5f52;font-size:.7rem;">[off]</span>' : '') + '</div>' +
              '<div style="font-size:.82rem;color:#d4c5b2;margin-top:2px;font-style:italic;">' + esc(r.url || '') + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="btn-small" data-edit="' + i + '">Edit</button>' +
              '<button class="btn-small btn-danger" data-del="' + i + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('[data-edit]').forEach(function (b) {
        b.addEventListener('click', function () { openRareModal(parseInt(b.dataset.edit, 10), allRare); });
      });
      list.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('Delete this rare link?')) return;
          FB.delete('rareLinks', allRare[parseInt(b.dataset.del, 10)].id).then(function () { renderRare(); toast('Rare link deleted.'); });
        });
      });
    });
  }

  function openRareModal(idx, rare) {
    var r = idx >= 0 && idx < rare.length ? rare[idx] : {};
    var isNew = !(idx >= 0 && idx < rare.length);
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Rare Link' : 'Edit Rare Link') + '</h2>' +
      '<div class="field"><label>Title</label><input type="text" id="fRareTitle" value="' + esc(r.title || '') + '" placeholder="the song for rare nights"></div>' +
      '<div class="field"><label>Link (YouTube or direct video URL)</label><input type="text" id="fRareUrl" value="' + esc(r.url || '') + '" placeholder="https://www.youtube.com/watch?v=..."></div>' +
      '<div class="field" style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#d4c5b2;margin-top:.6rem;"><label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="fRareOn"' + (r.on === false ? '' : ' checked') + '> enabled</label></div>' +
      '<p style="color:#6b5f52;font-size:.75rem;font-style:italic;margin:.6rem 0 0;">YouTube links embed and autoplay-able; direct links (mp4/webm) use the built-in player.</p>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalRareSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalRareSave').addEventListener('click', function () {
      var url = document.getElementById('fRareUrl').value.trim();
      if (!url) { toast('Add the link first.'); return; }
      var entry = {
        title: document.getElementById('fRareTitle').value.trim(),
        url: url,
        on: !!document.getElementById('fRareOn').checked,
        createdAt: r.createdAt || Date.now()
      };
      if (!isNew) entry.id = rare[idx].id;
      FB.put('rareLinks', entry).then(function () { closeModal(); renderRare(); toast('Rare link saved.'); });
    });
  }

  document.getElementById('addRareBtn') && document.getElementById('addRareBtn').addEventListener('click', function () {
    openRareModal(-1, allRare);
  });


  function renderLetters() {
    var list = document.getElementById('lettersList');
    if (!list) return;
    FB.getAll('letters').then(function (letters) {
      if (!letters.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F4DD;</div><p>No letters yet.</p></div>';
        return;
      }
      letters.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      var unread = letters.filter(function (l) { return !l.read; });
      var html = '';
      if (unread.length) html += '<div style="color:#ffe680;font-size:.8rem;margin-bottom:.5rem;">' + unread.length + ' unread</div>';
      for (var i = 0; i < letters.length; i++) {
        var l = letters[i];
        var date = l.createdAt ? new Date(l.createdAt).toLocaleString() : '';
        html +=
          '<div class="song-card" style="' + (!l.read ? 'border-left:3px solid #ffe680;' : '') + '">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(l.subject || '(no subject)') + (!l.read ? ' <span style="color:#ffe680;font-size:.7rem;">NEW</span>' : '') + '</div>' +
              '<div class="smeta">' + date + '</div>' +
              '<div style="font-size:.8rem;color:#d4c5b2;margin-top:4px;white-space:pre-wrap;">' + esc(l.body || '') + '</div>' +
            '</div>' +
            '<div class="actions" style="flex-direction:column;gap:4px;">' +
              (!l.read ? '<button class="approve-btn" data-letter-id="' + esc(l.id || l.key) + '" style="font-size:.7rem;padding:.25rem .5rem;">Mark read</button>' : '') +
              '<button class="del-btn" data-letter-id="' + esc(l.id || l.key) + '" style="font-size:.7rem;padding:.25rem .5rem;">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('.approve-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = this.dataset.letterId;
          FB.get('letters', id).then(function (l) {
            if (!l) return;
            l.read = true;
            FB.put('letters', l).then(function () { renderLetters(); });
          });
        });
      });
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this letter?')) return;
          FB.delete('letters', this.dataset.letterId).then(function () { renderLetters(); toast('Letter deleted.'); });
        });
      });
    }).catch(function () { list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading letters</p></div>'; });
  }

  function renderDynamicContent() {
    var list = document.getElementById('dynamicList');
    if (!list) return;
    FB.get('config', 'dynamicContent').then(function (data) {
      var items = data && data.list ? data.list : [];
      if (!items.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x2728;</div><p>No dynamic content. Add entries that appear on content pages.</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(item.title || '') + ' <span style="color:#6b5f52;font-size:.7rem;">(' + esc(item.page || '') + ')</span></div>' +
              '<div class="smeta">' + (item.body ? item.body.slice(0, 80) : '') + (item.body && item.body.length > 80 ? '...' : '') + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="edit-btn" data-dc-idx="' + i + '" style="background:rgba(255,230,128,.08);border:1px solid rgba(255,230,128,.2);color:#ffe680;padding:.3rem .6rem;border-radius:6px;cursor:pointer;font-size:.75rem;">Edit</button>' +
              '<button class="del-btn" data-dc-idx="' + i + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { openDynamicModal(parseInt(this.dataset.dcIdx, 10), items, data); });
      });
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this entry?')) return;
          items.splice(parseInt(this.dataset.dcIdx, 10), 1);
          FB.put('config', { id: 'dynamicContent', list: items }).then(function () { renderDynamicContent(); toast('Deleted.'); });
        });
      });
    }).catch(function () { list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading content</p></div>'; });
  }

  function openDynamicModal(idx, items, data) {
    var item = idx >= 0 && idx < items.length ? items[idx] : {};
    var isNew = idx < 0 || idx >= items.length;
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Entry' : 'Edit Entry') + '</h2>' +
      '<div class="field"><label>Page</label>' +
        '<select id="fDcPage" style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.85rem;outline:none;">' +
          '<option value="100-organs"' + (item.page === '100-organs' ? ' selected' : '') + '>100 Organs</option>' +
          '<option value="love"' + (item.page === 'love' ? ' selected' : '') + '>Love</option>' +
          '<option value="fantasies"' + (item.page === 'fantasies' ? ' selected' : '') + '>Fantasies</option>' +
        '</select></div>' +
      '<div class="field"><label>Title</label><input type="text" id="fDcTitle" value="' + esc(item.title || '') + '"></div>' +
      '<div class="field"><label>Body</label><textarea id="fDcBody" rows="6" style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:\'Lora\',Georgia,serif;font-size:.85rem;outline:none;resize:vertical;">' + esc(item.body || '') + '</textarea></div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalDcSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalDcSave').addEventListener('click', function () {
      var entry = {
        page: document.getElementById('fDcPage').value,
        title: document.getElementById('fDcTitle').value.trim(),
        body: document.getElementById('fDcBody').value.trim(),
        visible: true,
        order: Date.now()
      };
      if (!entry.body) { toast('Body required.'); return; }
      items = data && data.list ? data.list : [];
      if (isNew) items.push(entry);
      else items[idx] = entry;
      FB.put('config', { id: 'dynamicContent', list: items }).then(function () { closeModal(); renderDynamicContent(); toast('Saved.'); });
    });
  }

  function renderTimeline() {
    var list = document.getElementById('timelineList');
    if (!list) return;
    FB.get('config', 'timeline').then(function (data) {
      var entries = data && data.list ? data.list : [];
      if (!entries.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F4C5;</div><p>No timeline entries. Add your first memory.</p></div>';
        return;
      }
      var html = '';
      for (var i = entries.length - 1; i >= 0; i--) {
        var e = entries[i];
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(e.title || '') + '</div>' +
              '<div class="smeta">' + (e.date || '') + (e.year ? ', ' + e.year : '') + '</div>' +
              '<div style="font-size:.8rem;color:#d4c5b2;margin-top:2px;">' + (e.body ? esc(e.body).slice(0, 100) : '') + '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="edit-btn" data-tl-idx="' + i + '" style="background:rgba(255,230,128,.08);border:1px solid rgba(255,230,128,.2);color:#ffe680;padding:.3rem .6rem;border-radius:6px;cursor:pointer;font-size:.75rem;">Edit</button>' +
              '<button class="del-btn" data-tl-idx="' + i + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { openTimelineModal(parseInt(this.dataset.tlIdx, 10), entries, data); });
      });
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this memory?')) return;
          entries.splice(parseInt(this.dataset.tlIdx, 10), 1);
          FB.put('config', { id: 'timeline', list: entries }).then(function () { renderTimeline(); toast('Deleted.'); });
        });
      });
    }).catch(function () { list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading timeline</p></div>'; });
  }

  function openTimelineModal(idx, entries, data) {
    var e = idx >= 0 && idx < entries.length ? entries[idx] : {};
    var isNew = idx < 0 || idx >= entries.length;
    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Memory' : 'Edit Memory') + '</h2>' +
      '<div class="field-row">' +
        '<div class="field"><label>Date (MM-DD)</label><input type="text" id="fTlDate" value="' + esc(e.date || '') + '" placeholder="07-20"></div>' +
        '<div class="field"><label>Year</label><input type="text" id="fTlYear" value="' + esc(e.year || '') + '" placeholder="2026"></div>' +
      '</div>' +
      '<div class="field"><label>Title</label><input type="text" id="fTlTitle" value="' + esc(e.title || '') + '"></div>' +
      '<div class="field"><label>Description</label><textarea id="fTlBody" rows="3" style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:\'Lora\',Georgia,serif;font-size:.85rem;outline:none;resize:vertical;">' + esc(e.body || '') + '</textarea></div>' +
      '<div class="field"><label>Image URL (optional)</label><input type="text" id="fTlImg" value="' + esc(e.img || '') + '" placeholder="https://..."></div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalTlSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalTlSave').addEventListener('click', function () {
      var entry = {
        date: document.getElementById('fTlDate').value.trim(),
        year: document.getElementById('fTlYear').value.trim(),
        title: document.getElementById('fTlTitle').value.trim(),
        body: document.getElementById('fTlBody').value.trim(),
        img: document.getElementById('fTlImg').value.trim()
      };
      if (!entry.title) { toast('Title required.'); return; }
      entries = data && data.list ? data.list : [];
      if (isNew) entries.push(entry);
      else entries[idx] = entry;
      FB.put('config', { id: 'timeline', list: entries }).then(function () { closeModal(); renderTimeline(); toast('Memory saved.'); });
    });
  }

  function renderActivityStats(items) {
    var el = document.getElementById('activityStats');
    if (!el) return;
    var visits = 0, sections = 0, reviews = 0, images = 0, pages = {};
    items.forEach(function (a) {
      if (a.type === 'page-visit') { visits++; if (a.page) pages[a.page] = (pages[a.page] || 0) + 1; }
      else if (a.type === 'section-view') sections++;
      else if (a.type === 'review') reviews++;
      else if (a.type === 'image-view') images++;
    });
    var topPages = Object.keys(pages).sort(function (a, b) { return pages[b] - pages[a]; }).slice(0, 3);
    el.innerHTML =
      '<div class="stat-card" style="flex:1;min-width:100px;padding:10px 14px;border-radius:8px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.08);text-align:center;">' +
        '<div style="font-size:1.3rem;font-weight:bold;color:#ffe680;">' + items.length + '</div>' +
        '<div style="font-size:.65rem;color:#6b5f52;text-transform:uppercase;letter-spacing:.05em;">Total</div></div>' +
      '<div class="stat-card" style="flex:1;min-width:100px;padding:10px 14px;border-radius:8px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.08);text-align:center;">' +
        '<div style="font-size:1.3rem;font-weight:bold;color:#6fcf93;">' + visits + '</div>' +
        '<div style="font-size:.65rem;color:#6b5f52;text-transform:uppercase;letter-spacing:.05em;">Visits</div></div>' +
      '<div class="stat-card" style="flex:1;min-width:100px;padding:10px 14px;border-radius:8px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.08);text-align:center;">' +
        '<div style="font-size:1.3rem;font-weight:bold;color:#7ec8f0;">' + sections + '</div>' +
        '<div style="font-size:.65rem;color:#6b5f52;text-transform:uppercase;letter-spacing:.05em;">Sections</div></div>' +
      '<div class="stat-card" style="flex:1;min-width:100px;padding:10px 14px;border-radius:8px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.08);text-align:center;">' +
        '<div style="font-size:1.3rem;font-weight:bold;color:#e8b87a;">' + Object.keys(pages).length + '</div>' +
        '<div style="font-size:.65rem;color:#6b5f52;text-transform:uppercase;letter-spacing:.05em;">Pages</div></div>' +
      (topPages.length ? '<div style="width:100%;font-size:.75rem;color:#6b5f52;margin-top:4px;">Top pages: ' + topPages.map(function (p) { return '<span style="color:#d4c5b2;">' + p + '</span> (' + pages[p] + ')'; }).join(' &bull; ') + '</div>' : '');
  }

  function loadActivity() {
    var list = document.getElementById('activityList');
    if (!list) return;
    var filter = document.getElementById('activityFilter');
    var filterVal = filter ? filter.value : 'all';
    list.innerHTML = '<div class="empty-state"><div class="icon">&#x23F3;</div><p>Loading activity...</p></div>';
    FB.getAll('activity').then(function (items) {
      if (!items || !items.length) {
        document.getElementById('activityStats').innerHTML = '';
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F4C8;</div><p>No activity recorded yet.</p></div>';
        return;
      }
      renderActivityStats(items);
      items.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
      if (filterVal !== 'all') items = items.filter(function (i) { return i.type === filterVal; });
      if (!items.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F4C8;</div><p>No matching activity.</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < Math.min(items.length, 200); i++) {
        var a = items[i];
        var date = a.timestamp ? new Date(a.timestamp).toLocaleString() : '';
        var label = a.type === 'page-visit' ? 'Visited ' + esc(a.page) : a.type === 'section-view' ? 'Read section ' + (a.sectionIdx + 1) + ' on ' + esc(a.page) : a.type === 'review' ? (a.reviewType || a.type) + ' review on ' + esc(a.page) + (a.sectionIdx !== undefined ? ' (#' + (a.sectionIdx + 1) + ')' : '') : a.type === 'image-view' ? 'Viewed image: ' + esc(a.file) : esc(a.type) + ' on ' + esc(a.page);
        html +=
          '<div class="song-card" style="padding:.4rem .7rem;">' +
            '<div class="info" style="gap:2px;">' +
              '<div class="smeta" style="font-size:.7rem;">' + date + '</div>' +
              '<div style="font-size:.8rem;color:#d4c5b2;">' + label + '</div>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      if (items.length > 200) list.innerHTML += '<div style="text-align:center;color:#6b5f52;font-size:.75rem;margin-top:8px;">Showing 200 of ' + items.length + ' entries</div>';
    }).catch(function () {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading activity</p></div>';
    });
  }

  var ACTION_LABELS = {
    typed_ash: "Typed 'ash'", typed_dream: "Typed 'dream'", typed_sleep: "Typed 'sleep'", typed_remember: "Typed 'remember'", typed_letter: "Typed 'letter'", typed_lanterns: "Typed 'lanterns'",
    butterfly_discovered: 'Discovered a butterfly', firefly_caught: 'Caught a firefly', balloon_hit: 'Popped a balloon', feather_caught: 'Caught a feather', coffee_click: 'Tapped the coffee', lucky_star_found: 'Found a lucky star', fragment_collected: 'Collected a fragment', photo_fragment_found: 'Found a photo fragment', achievements_opened: 'Opened achievements',
    lantern_released: 'Released a lantern', wish_posted: 'Posted a wish', star_clicked: 'Clicked a star',
    selfletter_opened: 'Opened a self-writing letter', memory_seen: 'Read a memory', secret_letter_found: 'Found a secret letter', quiz_passed: 'Passed a quiz', quiz_failed: 'Failed a quiz', puzzle_solved: 'Solved a puzzle', promise_bookmarked: 'Bookmarked a promise', promise_unbookmarked: 'Unbookmarked a promise',
    song_played: 'Played a song', tribute_card_open: 'Opened a tribute card', favorite_added: 'Added a favorite', favorite_removed: 'Removed a favorite', wallpaper_download: 'Downloaded wallpaper', gallery_lightbox_open: 'Opened a gallery photo', photo_uploaded: 'Uploaded photo(s)'
  };
  var TYPE_COLORS = { catch: '#6fcf93', trigger: '#c77dff', content: '#ffe680', love: '#ff8fa3', wish: '#7cc4ff', music: '#b79bff', upload: '#ffb86b' };
  var TYPE_LABELS = { catch: 'Catch', trigger: 'Trigger', content: 'Content', love: 'Love', wish: 'Wish', music: 'Music', upload: 'Upload' };

  function humanAction(a) {
    return ACTION_LABELS[a] || String(a).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function relTime(ts) {
    if (!ts) return '';
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts).toLocaleDateString();
  }

  function renderInteractions() {
    var listEl = document.getElementById('interactionsList');
    if (!listEl) return;
    var statsEl = document.getElementById('interactionsStats');
    listEl.innerHTML = '<div class="empty-state"><div class="icon">&#x23F3;</div><p>Loading interactions...</p></div>';
    FB.getAll('interactions').then(function (items) {
      if (!items || !items.length) {
        if (statsEl) statsEl.innerHTML = '';
        listEl.innerHTML = '<div class="empty-state"><div class="icon">&#x1F496;</div><p>No interactions recorded yet.</p></div>';
        return;
      }
      items.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      var now = Date.now(), DAY = 86400000;
      var todayKey = new Date().toDateString();
      var todayCount = 0, weekCount = 0;
      var byAction = {}, byActionToday = {}, byPage = {}, byPageToday = {};
      items.forEach(function (e) {
        var act = e.action || 'unknown', pg = e.page || 'unknown';
        byAction[act] = (byAction[act] || 0) + 1;
        byPage[pg] = (byPage[pg] || 0) + 1;
        if (e.ts && new Date(e.ts).toDateString() === todayKey) {
          todayCount++;
          byActionToday[act] = (byActionToday[act] || 0) + 1;
          byPageToday[pg] = (byPageToday[pg] || 0) + 1;
        } else if (e.ts && e.ts >= now - 7 * DAY) {
          weekCount++;
        }
      });
      var topPage = Object.keys(byPage).sort(function (a, b) { return byPage[b] - byPage[a]; })[0] || '—';
      if (statsEl) {
        var stat = function (val, label, color) {
          return '<div class="stat-card" style="flex:1;min-width:110px;padding:10px 14px;border-radius:8px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.08);text-align:center;">' +
            '<div style="font-size:1.3rem;font-weight:bold;color:' + color + ';">' + val + '</div>' +
            '<div style="font-size:.65rem;color:#6b5f52;text-transform:uppercase;letter-spacing:.05em;">' + label + '</div></div>';
        };
        statsEl.innerHTML = stat(items.length, 'Total', '#ffe680') + stat(todayCount, 'Today', '#6fcf93') + stat(weekCount, 'Last 7 days', '#7cc4ff') + stat(esc(topPage), 'Top page', '#ff8fa3');
      }

      var dayStarts = [], dayCounts = [];
      for (var di = 0; di < 14; di++) {
        var d0 = new Date(now - (13 - di) * DAY);
        dayStarts.push(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).getTime());
        dayCounts.push(0);
      }
      items.forEach(function (e) {
        if (!e.ts) return;
        var d = new Date(e.ts);
        var idx = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - dayStarts[0]) / DAY);
        if (idx >= 0 && idx < dayCounts.length) dayCounts[idx]++;
      });
      var maxDay = Math.max.apply(null, dayCounts) || 1;
      var chart = '<div style="margin-bottom:1rem;"><h4 style="margin:0 0 .4rem;color:#ffe680;font-size:.85rem;">Activity — last 14 days</h4>' +
        '<div style="display:flex;align-items:flex-end;gap:4px;height:90px;">';
      for (var bi = 0; bi < dayCounts.length; bi++) {
        var h = dayCounts[bi] ? Math.max(6, Math.round(dayCounts[bi] / maxDay * 90)) : 2;
        var d2 = new Date(dayStarts[bi]);
        chart += '<div title="' + d2.toDateString() + ': ' + dayCounts[bi] + '" style="flex:1;height:' + h + 'px;background:' + (bi === dayCounts.length - 1 ? 'rgba(255,230,128,.85)' : 'rgba(255,210,150,.25)') + ';border-radius:3px 3px 0 0;"></div>';
      }
      chart += '</div><div style="display:flex;gap:4px;margin-top:4px;">';
      for (var li = 0; li < dayCounts.length; li++) {
        var d3 = new Date(dayStarts[li]);
        chart += '<div style="flex:1;text-align:center;font-size:.6rem;' + (li === dayCounts.length - 1 ? 'color:#ffe680;' : 'color:#6b5f52;') + '">' + (li === dayCounts.length - 1 ? 'today' : (d3.getMonth() + 1) + '/' + d3.getDate()) + '</div>';
      }
      chart += '</div></div>';

      var table = function (title, rows) {
        return '<div style="margin-bottom:1rem;"><h4 style="margin:0 0 .4rem;color:#ffe680;font-size:.85rem;">' + title + '</h4>' +
          '<table style="width:100%;border-collapse:collapse;font-size:.75rem;"><tr style="color:#6b5f52;text-align:left;"><th style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.15);">Name</th><th style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.15);">All time</th><th style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.15);">Today</th></tr>' + rows + '</table></div>';
      };
      var pageRows = Object.keys(byPage).sort(function (a, b) { return byPage[b] - byPage[a]; }).map(function (p) {
        return '<tr><td style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.06);">' + esc(p) + '</td><td style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.06);">' + byPage[p] + '</td><td style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.06);">' + (byPageToday[p] || 0) + '</td></tr>';
      }).join('');
      var actionRows = Object.keys(byAction).sort(function (a, b) { return byAction[b] - byAction[a]; }).map(function (a) {
        return '<tr><td style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.06);">' + esc(humanAction(a)) + '</td><td style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.06);">' + byAction[a] + '</td><td style="padding:.25rem .5rem;border-bottom:1px solid rgba(255,210,150,.06);">' + (byActionToday[a] || 0) + '</td></tr>';
      }).join('');

      listEl.innerHTML = chart + table('By page', pageRows) + table('By action', actionRows) +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin:0 0 .4rem;">' +
        '<h4 style="margin:0;color:#ffe680;font-size:.85rem;">Recent events</h4>' +
        '<input id="interactionsSearch" placeholder="Filter events..." style="width:180px;padding:.3rem .5rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.75rem;outline:none;">' +
        '</div><div id="interactionsRecent"></div>';

      function recentItem(e) {
        var color = TYPE_COLORS[e.type] || '#d4c5b2';
        return '<div class="song-card" style="padding:.45rem .7rem;margin-bottom:.35rem;">' +
          '<div class="info" style="gap:2px;">' +
            '<div class="smeta" style="font-size:.7rem;color:#6b5f52;">' + esc(new Date(e.ts).toLocaleString()) + '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
              '<span style="font-size:.62rem;padding:1px 6px;border-radius:8px;background:' + color + '22;border:1px solid ' + color + '44;color:' + color + ';">' + esc(TYPE_LABELS[e.type] || e.type || '?') + '</span>' +
              '<span style="font-size:.8rem;color:#d4c5b2;">' + esc(humanAction(e.action)) + '</span>' +
              '<span style="font-size:.7rem;color:#6b5f52;">on ' + esc(e.page || '?') + '</span>' +
              '<span style="font-size:.7rem;color:#6b5f52;">&middot; ' + relTime(e.ts) + '</span>' +
            '</div>' +
            (e.detail ? '<div style="font-size:.75rem;color:#6b5f52;font-style:italic;margin-top:2px;">' + esc(e.detail) + '</div>' : '') +
          '</div>' +
        '</div>';
      }

      function renderRecentList() {
        var q = ((document.getElementById('interactionsSearch') || {}).value || '').toLowerCase();
        var recent = items.slice(0, 200);
        if (q) {
          recent = recent.filter(function (e) {
            return (e.action || '').toLowerCase().indexOf(q) >= 0 || (e.detail || '').toLowerCase().indexOf(q) >= 0 || (e.page || '').toLowerCase().indexOf(q) >= 0 || (e.type || '').toLowerCase().indexOf(q) >= 0 || humanAction(e.action).toLowerCase().indexOf(q) >= 0;
          });
        }
        var el = document.getElementById('interactionsRecent');
        if (!el) return;
        el.innerHTML = recent.map(recentItem).join('') || '<div style="color:#6b5f52;font-size:.75rem;text-align:center;padding:1rem 0;">No matching events.</div>';
        if (items.length > 200) el.innerHTML += '<div style="text-align:center;color:#6b5f52;font-size:.75rem;margin-top:8px;">Showing ' + recent.length + ' of ' + items.length + ' entries</div>';
      }
      renderRecentList();
      document.getElementById('interactionsSearch').addEventListener('input', renderRecentList);
    }).catch(function () {
      listEl.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading interactions</p></div>';
    });
  }

  function openGalleryModal(index) {
    var isNew = index === -1;
    var g = isNew ? {} : galleryItems[index];
    var label = isNew ? '' : esc(g.label);
    var note = isNew ? '' : esc(g.note);
    var type = isNew ? 'image' : g.type;
    var hasFile = !isNew && g.fileData;

    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Gallery Item' : 'Edit Gallery Item') + '</h2>' +
      '<div class="field"><label>Type</label>' +
        '<select id="fGalType" style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.85rem;outline:none;">' +
          '<option value="image"' + (type === 'image' ? ' selected' : '') + '>Image</option>' +
          '<option value="video"' + (type === 'video' ? ' selected' : '') + '>Video</option>' +
        '</select>' +
      '</div>' +
      '<div class="field"><label>Label</label><input type="text" id="fGalLabel" value="' + label + '" placeholder="e.g. Sunset"></div>' +
      '<div class="field"><label>Note</label><textarea id="fGalNote" rows="3" placeholder="A short caption for this image..." style="width:100%;padding:.55rem .75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-family:inherit;font-size:.85rem;outline:none;resize:vertical;">' + note + '</textarea></div>' +
      '<div class="field"><label>File' + (hasFile ? ' (current: file saved)' : '') + '</label>' +
        '<input type="file" id="fGalFile" accept="image/*,video/*">' +
        '<div class="file-info" id="fGalFileInfo">' + (g.file && !g.fileData ? 'Path: ' + g.file : '') + '</div>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalGalSave">' + (isNew ? 'Add' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');

    document.getElementById('fGalFile').addEventListener('change', function () {
      var f = this.files[0];
      document.getElementById('fGalFileInfo').textContent = f ? f.name + ' (' + Math.round(f.size / 1024) + ' KB)' : '';
    });

    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalGalSave').addEventListener('click', function () {
      var label = document.getElementById('fGalLabel').value.trim();
      var note = document.getElementById('fGalNote').value.trim();
      var type = document.getElementById('fGalType').value;
      var fileInput = document.getElementById('fGalFile');
      var file = fileInput.files[0];

      if (!label) { toast('Label is required'); return; }

      if (!file && isNew && !g.file) { toast('Please select a file'); return; }

      var item = {
        type: type,
        label: label,
        note: note,
        file: g.file || '',
        fileData: null,
        fileType: g.fileType || ''
      };

      function saveAndClose() {
        if (isNew) {
          galleryItems.push(item);
        } else {
          galleryItems[index] = item;
        }
        saveGallery().then(function () {
          renderGallery(); closeModal(); toast('Gallery item saved!');
        });
      }

      if (file) {
        item.fileBlob = file;
        item.fileType = file.type;
        item.file = '';
        saveAndClose();
      } else {
        if (!isNew && g.fileBlob) {
          item.fileBlob = g.fileBlob;
          item.fileType = g.fileType;
        }
        saveAndClose();
      }
    });
  }

  /* ---- Load / Save ---- */
  async function loadFileSongs() {
    try {
      var res = await fetch('songs/list.json');
      if (!res.ok) return [];
      var list = await res.json();
      if (!list || !list.length) return [];
      return list.map(function (item) {
        return {
          title: item.title || 'Untitled',
          artist: item.artist || 'Unknown',
          duration: item.duration || 180,
          unlockDate: item.unlockDate || '',
          autoUnlock: item.autoUnlock !== false,
          hasFile: true,
          isFileSong: true,
          fileName: item.file
        };
      });
    } catch(e) { return []; }
  }

  async function loadAll() {
    var dbSongs = await dbGetAll('songs');
    (dbSongs || []).forEach(function(ds) {
      if (!ds.isFileSong && ds.hasFile) ds.audioValid = !!(ds.audioBlob && ds.audioBlob.size > 0);
    });
    var fileSongs = await loadFileSongs();
    var sectionConfig = await dbGet('config', 'sections');

    // Merge: file songs first, DB songs override by title
    var merged = [];
    var seen = {};
    fileSongs.forEach(function(fs) {
      seen[fs.title] = true;
      merged.push(fs);
    });
    (dbSongs || []).forEach(function(ds) {
      if (seen[ds.title]) {
        for (var mi = 0; mi < merged.length; mi++) {
          if (merged[mi].title === ds.title) {
            merged[mi] = ds;
            merged[mi].isFileSong = true;
            if (!ds.hasFile && fileSongs.some(function(fs){ return fs.title === ds.title && fs.fileName; })) {
              var orig = fileSongs.find(function(fs){ return fs.title === ds.title; });
              merged[mi].fileName = orig.fileName;
            }
            break;
          }
        }
      } else {
        merged.push(ds);
      }
    });
    songs = merged;
    sections = sectionConfig ? sectionConfig.data : [];

    if (!sections.length) {
      sections = defaultSections();
      await dbPut('config', { key: 'sections', data: sections });
    } else {
      var defaults = defaultSections();
      var hasKey = {};
      for (var si = 0; si < sections.length; si++) hasKey[sections[si].key] = true;
      var changed = false;
      for (var di = 0; di < defaults.length; di++) {
        if (!hasKey[defaults[di].key]) {
          sections.push(defaults[di]);
          changed = true;
        }
      }
      if (changed) await dbPut('config', { key: 'sections', data: sections });
    }

    // Gallery
    await loadGallery();
    if (!galleryItems.length) {
      galleryItems = defaultGallery();
      await saveGallery();
    }

    // Wishes
    await loadWishes();

    updateStatus();
  }

  async function saveSongs() {
    var toastEl = document.getElementById('toastContainer');
    if (!toastEl) { toast('Saving songs...'); }
    var total = songs.length;
    var converted = 0;
    await dbClear('songs');
    for (var i = 0; i < songs.length; i++) {
      var s = songs[i];
      var entry = {
        title: s.title,
        artist: s.artist,
        duration: s.duration || 180,
        unlockDate: s.unlockDate || '',
        autoUnlock: s.autoUnlock !== false,
        hasFile: !!s.hasFile
      };
      if (s.isFileSong) {
        entry.isFileSong = true;
        entry.fileName = s.fileName || '';
      }
      if (s.audioBlob) {
        entry.audioBlob = s.audioBlob;
        entry.audioType = s.audioType;
        entry.fileName = s.fileName;
      }
      try {
        var result = await dbPut('songs', entry);
        if (result && result.key) s.id = result.key;
        s.audioValid = !!s.audioBlob;
        converted++;
      } catch(e) {
        s.audioValid = false;
        console.error('Failed to save song:', s.title, e);
      }
      if (total > 1 && i % 2 === 0) {
        toast('Saving songs... ' + converted + '/' + total);
      }
    }
  }

  async function saveSections() {
    await dbPut('config', { key: 'sections', data: sections });
  }

  /* ---- Status ---- */
  function updateStatus() {
    var songCount = songs.length;
    var fileCount = songs.filter(function (s) { return s.hasFile; }).length;
    document.getElementById('statusText').textContent =
      songCount + ' song' + (songCount !== 1 ? 's' : '') +
      (fileCount ? ' (' + fileCount + ' with audio)' : '') +
      ' \u2022 ' + sections.length + ' section' + (sections.length !== 1 ? 's' : '') +
      ' \u2022 ' + galleryItems.length + ' gallery item' + (galleryItems.length !== 1 ? 's' : '') +
      ' \u2022 ' + allWishes.length + ' wish' + (allWishes.length !== 1 ? 'es' : '');
  }

  /* ---- Render Sections ---- */
  function renderSections() {
    var list = document.getElementById('sectionList');
    var html = '';
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var status = getUnlockStatus(s.unlockDate, s.autoUnlock);
      var cls = status.locked ? 'locked' : 'unlocked';
      var label = status.locked ? '\uD83D\uDD12 Locked until ' + s.unlockDate : '\uD83D\uDD13 Unlocked';
      html +=
        '<div class="section-card">' +
          '<div class="icon">' + s.icon + '</div>' +
          '<div class="info">' +
            '<div class="name">' + s.label + '</div>' +
            '<div class="file">' + s.file + '</div>' +
            '<div class="status ' + cls + '">' + label + '</div>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="edit-btn sect-edit" data-index="' + i + '" style="width:32px;height:32px;border-radius:6px;border:1px solid rgba(255,210,150,.08);background:transparent;color:#6b5f52;cursor:pointer;font-size:.85rem;transition:all .2s;">&#x270E;</button>' +
          '</div>' +
        '</div>';
    }
    list.innerHTML = html;

    list.querySelectorAll('.sect-edit').forEach(function (btn) {
      btn.addEventListener('click', function () { openSectionModal(parseInt(this.dataset.index)); });
    });
  }

  /* ---- Render Songs ---- */
  function renderSongs() {
    var list = document.getElementById('songList');
    if (!songs.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F3B6;</div><p>No songs yet</p></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < songs.length; i++) {
      var s = songs[i];
      var status = getUnlockStatus(s.unlockDate, s.autoUnlock);
      var statusText = status.locked ? '<span class="locked">\uD83D\uDD12 ' + s.unlockDate + '</span>' : '<span>\uD83D\uDD13 Open</span>';
      var fileIcon = s.hasFile ? '<span class="has-file">\uD83D\uDCBF</span>' : '<span>\uD83D\uDCC4</span>';
      var audioStatus = s.isFileSong
        ? '<span style="color:#6fcf93;">\u2713 file</span>'
        : s.hasFile
          ? (s.audioValid || (s.audioBlob && s.audioBlob.size > 0)
            ? '<span style="color:#6fcf93;">\u2713 audio</span>'
            : '<span style="color:#e85d3a;cursor:help;" title="Audio data may be missing or corrupted">! no audio</span>')
        : '<span style="color:#6b5f52;">no file</span>';
      html +=
        '<div class="song-card">' +
          '<div class="info">' +
            '<div class="stitle">' + esc(s.title) + '</div>' +
            '<div class="sartist">' + esc(s.artist) + '</div>' +
            '<div class="smeta">' +
              audioStatus + ' ' +
              fileIcon + ' ' +
              formatDur(s.duration) + ' ' +
              statusText +
            '</div>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="edit-btn sng-edit" data-index="' + i + '" title="Edit">&#x270E;</button>' +
            '<button class="del-btn sng-del" data-index="' + i + '" title="Delete">&#x2716;</button>' +
          '</div>' +
        '</div>';
    }
    list.innerHTML = html;

    list.querySelectorAll('.sng-edit').forEach(function (btn) {
      btn.addEventListener('click', function () { openSongModal(parseInt(this.dataset.index)); });
    });
    list.querySelectorAll('.sng-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        if (confirm('Delete "' + songs[idx].title + '"?')) {
          songs.splice(idx, 1);
          saveSongs().then(function () { renderSongs(); updateStatus(); toast('Song deleted'); });
        }
      });
    });
  }

  function getUnlockStatus(dateStr, autoUnlock) {
    if (!dateStr || !autoUnlock) return { locked: false };
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var parts = dateStr.split('-');
    var unlock = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return { locked: now < unlock, date: dateStr };
  }

  /* ---- Section Modal ---- */
  function openSectionModal(index) {
    var s = sections[index];
    document.getElementById('modalContent').innerHTML =
      '<h2>Edit Unlock Date</h2>' +
      '<div class="field"><label>Section</label><input type="text" value="' + esc(s.label) + '" disabled style="opacity:.5"></div>' +
      '<div class="field"><label>Unlock Date</label><input type="date" id="fSectDate" value="' + (s.unlockDate || '') + '"></div>' +
      '<div class="field"><label class="cb-label"><input type="checkbox" id="fSectAuto" ' + (s.autoUnlock !== false ? 'checked' : '') + '> Auto-unlock on this date</label></div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalSectSave">Save</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');

    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalSectSave').addEventListener('click', function () {
      sections[index].unlockDate = document.getElementById('fSectDate').value;
      sections[index].autoUnlock = document.getElementById('fSectAuto').checked;
      saveSections().then(function () {
        renderSections(); closeModal(); toast('Unlock date saved!');
      });
    });
  }
  /* ---- Song Modal ---- */
  function openSongModal(index) {
    var isNew = index === -1;
    var s = isNew ? {} : songs[index];
    var title = isNew ? '' : esc(s.title);
    var artist = isNew ? '' : esc(s.artist);
    var dur = isNew ? '' : s.duration;
    var date = isNew ? '' : (s.unlockDate || '');
    var autoChecked = isNew || s.autoUnlock !== false ? 'checked' : '';
    var hasFile = !isNew && s.hasFile;

    document.getElementById('modalContent').innerHTML =
      '<h2>' + (isNew ? 'Add Song' : 'Edit Song') + '</h2>' +
      '<div class="field"><label>Song Title</label><input type="text" id="fTitle" value="' + title + '" placeholder="e.g. Until I Found You"></div>' +
      '<div class="field"><label>Artist</label><input type="text" id="fArtist" value="' + artist + '" placeholder="e.g. Stephen Sanchez"></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Duration (sec)</label><input type="number" id="fDuration" value="' + dur + '" placeholder="Auto-detected" min="1" readonly style="background:#2a2018;color:#6b5f52;cursor:default"></div>' +
        '<div class="field"><label>Unlock Date</label><input type="date" id="fDate" value="' + date + '"></div>' +
      '</div>' +
      '<div class="field"><label class="cb-label"><input type="checkbox" id="fAuto" ' + autoChecked + '> Auto-unlock on date</label></div>' +
      '<div class="field"><label>Audio File' + (hasFile ? ' (current: audio file saved)' : '') + '</label>' +
        '<input type="file" id="fAudioFile" accept="audio/*">' +
        '<div class="file-info" id="fFileInfo"></div>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn-cancel" id="modalCancel">Cancel</button>' +
        '<button class="btn-save" id="modalSongSave">' + (isNew ? 'Add Song' : 'Save') + '</button>' +
      '</div>';
    document.getElementById('modalOverlay').classList.add('open');

    document.getElementById('fAudioFile').addEventListener('change', function () {
      var f = this.files[0];
      document.getElementById('fFileInfo').textContent = f ? f.name + ' (' + Math.round(f.size / 1024) + ' KB)' : '';
      if (f) {
        var url = URL.createObjectURL(f);
        var audio = new Audio(url);
        audio.addEventListener('loadedmetadata', function () {
          if (audio.duration && isFinite(audio.duration)) {
            document.getElementById('fDuration').value = Math.round(audio.duration);
          }
          URL.revokeObjectURL(url);
        });
        audio.addEventListener('error', function () { URL.revokeObjectURL(url); });
      }
    });

    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalSongSave').addEventListener('click', function () {
      var title = document.getElementById('fTitle').value.trim();
      var artist = document.getElementById('fArtist').value.trim();
      var duration = parseInt(document.getElementById('fDuration').value) || 180;
      var unlockDate = document.getElementById('fDate').value;
      var autoUnlock = document.getElementById('fAuto').checked;
      var fileInput = document.getElementById('fAudioFile');
      var file = fileInput.files[0];

      if (!title) { toast('Title is required'); return; }

      var song = {
        title: title,
        artist: artist || 'Unknown',
        duration: duration,
        unlockDate: unlockDate,
        autoUnlock: autoUnlock,
        hasFile: !!file || (s && s.hasFile)
      };

      function saveAndClose() {
        if (isNew) {
          songs.push(song);
        } else {
          songs[index] = song;
        }
        saveSongs().then(function () {
          renderSongs(); updateStatus(); closeModal(); toast('Song saved!');
        });
      }

      if (file) {
        song.audioBlob = file;
        song.audioType = file.type;
        song.fileName = file.name;
        song.hasFile = true;
        saveAndClose();
      } else {
        if (!isNew && s && s.audioBlob) {
          song.audioBlob = s.audioBlob;
          song.audioType = s.audioType;
          song.fileName = s.fileName;
        }
        saveAndClose();
      }
    });

  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  }

  /* ---- Helpers ---- */
  /* ---- Settings (Feature Flags) ---- */
  function conditionMet(auto) {
    if (!auto) return true;
    if (auto.indexOf('after first favorite') !== -1) {
      try { var f = JSON.parse(localStorage.getItem('db-favorites') || '[]'); return f.length > 0; } catch(e) { return false; }
    }
    if (auto.indexOf('after first firefly') !== -1) {
      try { return parseInt(localStorage.getItem('db-firefly-count') || '0') > 0; } catch(e) { return false; }
    }
    if (auto.indexOf('after first wish') !== -1) {
      try { var w = JSON.parse(localStorage.getItem('db-wish-journal') || '[]'); return w.length > 0; } catch(e) { return false; }
    }
    if (auto.indexOf('after Fantasies visited') !== -1) {
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('db-viewed-') === 0 && k.indexOf('fantasies') !== -1) return true; } } catch(e) {}
      return false;
    }
    if (auto.indexOf('after all 5 sections read') !== -1) {
      var need = ['100-organs','love','fantasies','sky-observatory','photo-gallery'];
      try {
        for (var si = 0; si < need.length; si++) { var found = false;
          for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('db-viewed-') === 0 && k.indexOf(need[si]) !== -1) { found = true; break; } }
          if (!found) return false;
        }
        return true;
      } catch(e) { return false; }
    }
    if (auto.indexOf('after dream + sleep') !== -1) {
      try { return !!localStorage.getItem('db-viewed-dream') && !!localStorage.getItem('db-viewed-make_her_sleep'); } catch(e) { return false; }
    }
    return true;
  }

  function renderSettings() {
    var list = document.getElementById('settingsList');
    var features = window.FeatureFlags ? window.FeatureFlags.list() : [];
    var flags = window.FeatureFlags ? window.FeatureFlags.getAll() : {};
    var cats = {};
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      if (!cats[f.cat]) cats[f.cat] = [];
      cats[f.cat].push(f);
    }
    var html = '';
    var catOrder = ['Sections','Interactive','Features','Visual','Content','Admin'];
    for (var ci = 0; ci < catOrder.length; ci++) {
      var cat = catOrder[ci];
      var items = cats[cat];
      if (!items || !items.length) continue;
      html += '<div class="feature-group">' +
        '<div class="feature-group-title">' + cat + '</div>';
      for (var fi = 0; fi < items.length; fi++) {
        var f = items[fi];
        var flagOn = flags[f.id] !== false;
        var ready = conditionMet(f.auto);
        var toggleOn = flags[f.id] === undefined ? ready : flagOn;
        html +=
          '<div class="feature-card' + (toggleOn ? '' : ' disabled') + (ready ? ' ready' : '') + '" data-feature="' + f.id + '">' +
            '<div class="f-label">' +
              '<div class="f-name" data-state="' + (toggleOn ? 'ON' : 'OFF') + '">' + esc(f.label) + '</div>' +
              '<div class="f-desc">' + esc(f.desc) + '</div>' +
              (f.auto ? '<div class="f-auto">\u25B8 ' + esc(f.auto) + '</div>' : '') +
            '</div>' +
            '<div class="ftoggle' + (toggleOn ? ' on' : '') + '" data-feature="' + f.id + '"></div>' +
          '</div>';
      }
      html += '</div>';
    }
    list.innerHTML = html;
    list.querySelectorAll('.ftoggle').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = this.dataset.feature;
        var card = this.closest('.feature-card');
        var wasOn = card.classList.contains('disabled') ? false : true;
        window.FeatureFlags.set(id, !wasOn);
        card.classList.toggle('disabled', wasOn);
        card.querySelector('.f-name').dataset.state = wasOn ? 'OFF' : 'ON';
        this.classList.toggle('on', !wasOn);
        toast((wasOn ? 'Disabled: ' : 'Enabled: ') + window.FeatureFlags.getLabel(id));
      });
    });
  }

  function renderAchievements() {
    var list = document.getElementById('achievementsList');
    if (!list) return;
    var letters = window.SecretLetters ? window.SecretLetters.list() : [];
    if (!letters.length) { list.innerHTML = '<div class="empty">No letter metadata. Load secret-letters.js first.</div>'; return; }
    list.innerHTML = '<div class="empty">Loading…</div>';

    Promise.all([
      FB.get('userData', 'secretLetters'),
      FB.get('config', 'secretLetters')
    ]).then(function (res) {
      var found = (res[0] && res[0].letters) || {};
      var toggles = res[1] || {};
      var html = '';
      for (var i = 0; i < letters.length; i++) {
        var L = letters[i];
        var f = found[L.id];
        var on = toggles[L.id] !== false;
        html +=
          '<div class="feature-card' + (on ? '' : ' disabled') + '" data-letter="' + L.id + '">' +
            '<div class="f-label">' +
              '<div class="f-name" data-state="' + (on ? 'ON' : 'OFF') + '">' + esc(L.title) + '</div>' +
              '<div class="f-desc">' + (f
                ? '\uD83D\uDD13 Opened ' + new Date(f.foundAt).toLocaleDateString()
                : '\uD83D\uDD12 Not opened yet &mdash; ' + esc(L.reason)) + '</div>' +
            '</div>' +
            '<div class="ftoggle' + (on ? ' on' : '') + '" data-letter="' + L.id + '"></div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('.ftoggle').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = this.dataset.letter;
          var card = this.closest('.feature-card');
          var wasOn = !card.classList.contains('disabled');
          window.SecretLetters.setEnabled(id, !wasOn);
          card.classList.toggle('disabled', wasOn);
          card.querySelector('.f-name').dataset.state = wasOn ? 'OFF' : 'ON';
          this.classList.toggle('on', !wasOn);
          toast((wasOn ? 'Disabled: ' : 'Enabled: ') + id);
        });
      });
    }).catch(function () {
      list.innerHTML = '<div class="empty">Could not load achievements.</div>';
    });
  }

  function esc(str) {
    if (typeof str !== 'string') return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDur(sec) {
    if (!sec) return '0:00';
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

  /* ---- Access Control ---- */
  var SECTION_ACCESS_KEY = 'db-section-access';

  function defaultQuiz(section) {
    if (section === 'photo-gallery') {
      return [
        { question: 'Who is every picture in this gallery about?', answer: 'You' },
        { question: 'Why did I make this gallery?', answer: 'To preserve our memories' },
        { question: 'Who is this website dedicated to?', answer: 'You' },
        { question: 'What was I trying to build instead of just another website?', answer: 'A home' },
        { question: 'Who was always in my mind while making this project?', answer: 'You' }
      ];
    }
    if (section === 'love') {
      return [
        { question: 'What time did we have one of our deepest conversations?', answer: '3 AM' },
        { question: 'Where was I sitting during that conversation?', answer: 'On the floor' },
        { question: 'Where were you?', answer: 'On the bed' },
        { question: 'Who is every word on this website written for?', answer: 'You' },
        { question: 'What feeling did I hope this website would give you?', answer: 'Home' }
      ];
    }
    if (section === '100-organs') {
      return [
        { question: 'How many tributes are in this section?', answer: '100' },
        { question: 'Who is every tribute written for?', answer: 'You' },
        { question: 'What is being catalogued in this section?', answer: 'Her body' },
        { question: 'What body part is tribute #5 about?', answer: 'The Eyes' },
        { question: 'What is the first thing I ever noticed about you?', answer: 'Your smile' }
      ];
    }
    if (section === 'sky-observatory') {
      return [
        { question: 'What can you change in the sky observatory?', answer: 'The sky' },
        { question: 'What appears in the sky at night?', answer: 'Stars' },
        { question: 'What is this website called?', answer: 'Dreambox' },
        { question: 'What month did you first meet?', answer: 'June' },
        { question: 'What was the creator trying to build with this website?', answer: 'A home' }
      ];
    }
    return [
      { question: 'What pet name does she call you?', answer: 'babe' },
      { question: 'What is her favorite color?', answer: 'purple' },
      { question: 'What month did you first meet?', answer: 'june' },
      { question: 'What is the admin passkey for this site?', answer: '' },
      { question: 'What city does she live in?', answer: 'lahore' }
    ];
  }

  function defaultAccess() {
    return {
      '100-organs': { adminLocked: false, questions: defaultQuiz('100-organs') },
      'love': { adminLocked: false, questions: defaultQuiz('love') },
      'fantasies': { adminLocked: false, questions: defaultQuiz('fantasies') },
      'sky-observatory': { adminLocked: false, questions: defaultQuiz('sky-observatory') },
      'photo-gallery': { adminLocked: false, questions: defaultQuiz('photo-gallery') }
    };
  }

  function getAccessConfig() {
    var raw = localStorage.getItem(SECTION_ACCESS_KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        var def = defaultAccess();
        var changed = false;
        for (var key in def) {
          if (!parsed[key]) { parsed[key] = JSON.parse(JSON.stringify(def[key])); changed = true; }
          else if (!parsed[key].questions) { parsed[key].questions = JSON.parse(JSON.stringify(def[key].questions)); changed = true; }
        }
        if (changed) localStorage.setItem(SECTION_ACCESS_KEY, JSON.stringify(parsed));
        return parsed;
      } catch(e) {}
    }
    var def = defaultAccess();
    localStorage.setItem(SECTION_ACCESS_KEY, JSON.stringify(def));
    return def;
  }

  function saveAccessConfig(cfg) {
    localStorage.setItem(SECTION_ACCESS_KEY, JSON.stringify(cfg));
    if (typeof FB !== 'undefined' && FB.put) {
      var copy = JSON.parse(JSON.stringify(cfg));
      copy.id = 'access';
      FB.put('config', copy).catch(function () {});
    }
  }

  var accessCfg = null;

  function renderAccess() {
    var list = document.getElementById('accessList');
    if (!list) return;
    accessCfg = getAccessConfig();
    var html = '';
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var ac = accessCfg[s.key] || { adminLocked: false, questions: defaultQuiz(s.key) };
      if (!ac.questions) ac.questions = defaultQuiz(s.key);
      var locked = !!ac.adminLocked;
      html += '<div class="access-card" data-section="' + s.key + '">' +
        '<div class="access-header">' +
          '<div class="info">' +
            '<div class="name">' + s.icon + ' ' + s.label + '</div>' +
            '<div class="file">' + s.file + '</div>' +
          '</div>' +
          '<div class="toggle-wrap">' +
            '<span class="toggle' + (locked ? ' active' : '') + '" data-section="' + s.key + '"></span>' +
            '<label>' + (locked ? 'Locked' : 'Open') + '</label>' +
          '</div>' +
        '</div>' +
        buildQuizEditor(s.key, ac.questions) +
      '</div>';
    }
    list.innerHTML = html;

    // Toggle clicks
    list.querySelectorAll('.toggle').forEach(function (el) {
      el.addEventListener('click', function () {
        var key = this.dataset.section;
        var ac2 = accessCfg[key] || { adminLocked: false, questions: defaultQuiz(key) };
        ac2.adminLocked = !ac2.adminLocked;
        accessCfg[key] = ac2;
        saveAccessConfig(accessCfg);
        this.classList.toggle('active');
        var label = this.nextElementSibling;
        label.textContent = ac2.adminLocked ? 'Locked' : 'Open';
        // Show/hide quiz editor
        var qs = this.closest('.access-card').querySelector('.quiz-section');
        if (qs) qs.classList.toggle('open', ac2.adminLocked);
      });
    });

    // Quiz field saves — resets quizPassed so she must retake
    list.querySelectorAll('.quiz-section input').forEach(function (el) {
      el.addEventListener('change', function () {
        var secKey = this.closest('.access-card').dataset.section;
        var idx = parseInt(this.dataset.idx);
        var field = this.dataset.field;
        var ac3 = accessCfg[secKey] || { adminLocked: false, questions: defaultQuiz(secKey) };
        if (!ac3.questions) ac3.questions = defaultQuiz(secKey);
        ac3.questions[idx][field] = this.value;
        ac3.quizPassed = false;
        accessCfg[secKey] = ac3;
        saveAccessConfig(accessCfg);
      });
    });
  }

  function buildQuizEditor(secKey, qs) {
    var ac = accessCfg && accessCfg[secKey];
    var isOpen = ac && ac.adminLocked;
    var html = '<div class="quiz-section' + (isOpen ? ' open' : '') + '">';
    html += '<div class="quiz-note">5 questions she must answer correctly to unlock this section. Edit below:</div>';
    for (var i = 0; i < qs.length; i++) {
      html +=
        '<div class="q-field">' +
          '<label>Q' + (i+1) + '</label>' +
          '<input type="text" data-idx="' + i + '" data-field="question" value="' + esc(qs[i].question) + '" placeholder="Question">' +
          '<input type="text" data-idx="' + i + '" data-field="answer" value="' + esc(qs[i].answer) + '" placeholder="Answer" style="margin-top:3px;">' +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ---- Dreams ---- */
  function renderDreams() {
    var list = document.getElementById('dreamList');
    if (!list) return;
    FB.getAll('dreams').then(function (items) {
      items = items || [];
      items.sort(function (a, b) { return b.createdAt - a.createdAt; });
      if (!items.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x1F30C;</div><p>No dreams yet.</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var d = items[i];
        var author = d.author === '' ? '' : 'You';
        var typeLabel = d.type === 'voice' ? ' &#x1F3A7;' : '';
        html +=
          '<div class="song-card">' +
            '<div class="info">' +
              '<div class="stitle">' + esc(author) + typeLabel + '</div>' +
              '<div class="smeta">' + (d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '') + '</div>' +
              '<div style="font-size:.8rem;color:#d4c5b2;margin-top:4px;font-style:italic;">' +
                (d.text ? esc(d.text).slice(0, 200) : (d.type === 'voice' ? '[Voice message]' : '')) +
              '</div>' +
            '</div>' +
            '<div class="actions">' +
              '<button class="del-btn" data-dream-id="' + esc(d.id) + '">Delete</button>' +
            '</div>' +
          '</div>';
      }
      list.innerHTML = html;
      list.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this dream?')) return;
          FB.delete('dreams', this.dataset.dreamId).then(function () {
            renderDreams();
            toast('Dream deleted.');
          }).catch(function () { toast('Failed to delete.'); });
        });
      });
    }).catch(function () {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x26A0;&#xFE0F;</div><p>Error loading dreams</p></div>';
    });
  }

  /* ---- Turn On ---- */
  // The journey the game actually runs — the embedded file. Branch step counts and session stats read from here.
  var turnOnSteps = (typeof getDefaultSteps === 'function') ? getDefaultSteps() : [];

  function turnOnBranchOf(stepId) {
    if (stepId < 100) return 2;
    var starts = [1400, 1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400];
    for (var i = 0; i < starts.length; i++) {
      if (stepId >= starts[i] && stepId < starts[i] + 100) return starts[i];
    }
    return null;
  }
  function turnOnBranchLabel(id) {
    for (var i = 0; i < TURN_ON_BRANCHES.length; i++) {
      if (TURN_ON_BRANCHES[i].id === id) return TURN_ON_BRANCHES[i].label;
    }
    return 'Entry & endings';
  }
  function turnOnBranchSymbol(steps, id) {
    for (var i = 0; i < steps.length; i++) {
      if (turnOnBranchOf(steps[i].id) === id && steps[i].symbol) return steps[i].symbol;
    }
    return '';
  }

  /* ---- Turn On Branch Toggles ---- */
  var TURN_ON_BRANCHES = [
    { id: 2, label: 'Fuck you — I want to be inside you' },
    { id: 400, label: 'Masturbation — you do it to me, or you watch me' },
    { id: 500, label: 'Fingering — I do it to you, or you do it to yourself' },
    { id: 600, label: 'Foreplay — I tease you until you beg' },
    { id: 800, label: 'Fingering drive — I talk you to pieces, my fingers inside you' },
    { id: 700, label: 'Oral — my mouth on you, I taste every inch' },
    { id: 900, label: 'Bath & Shower — I wash every inch of you' },
    { id: 1000, label: 'Watching you undress — the slow way' },
    { id: 1100, label: 'Rough — I take control' },
    { id: 1200, label: 'Mirror — I watch us together' },
    { id: 1300, label: '69 — both of us, at once' },
    { id: 1400, label: 'Morning — I wake you up slow' },
  ];
  var branchToast;
  var TURNON_KEY = 'db-turnon-branches';
  function renderTurnOnBranches() {
    var box = document.getElementById('turnOnBranches');
    if (!box) return;
    branchToast = document.getElementById('turnOnBranchesToast');
    FB.get('config', 'turnOnSections').then(function (d) {
      var disabled = (d && d.disabled) || [];
      try { var local = JSON.parse(localStorage.getItem(TURNON_KEY)); if (local && local.disabled) disabled = local.disabled; } catch (e) {}
      applyTurnOnDisabled(disabled);
    }).catch(function () {
      try { var local = JSON.parse(localStorage.getItem(TURNON_KEY)); if (local && local.disabled) applyTurnOnDisabled(local.disabled); } catch (e) {}
    });
  }
  function applyTurnOnDisabled(disabled) {
    var html = '';
    TURN_ON_BRANCHES.forEach(function (b) {
      var count = turnOnSteps.filter(function (s) { return turnOnBranchOf(s.id) === b.id; }).length;
      var on = disabled.indexOf(b.id) === -1;
      var symbol = turnOnBranchSymbol(turnOnSteps, b.id);
      html += '<div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .7rem;margin-bottom:.4rem;border:1px solid rgba(255,210,150,.08);border-radius:8px;background:rgba(255,220,160,.02);">' +
        '<input type="checkbox" data-branch="' + b.id + '"' + (on ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:#6fcf93;">' +
        '<span style="font-size:.9rem;">' + esc(symbol) + '</span>' +
        '<span style="flex:1;font-size:.82rem;color:var(--parchment-dim);">' + esc(b.label) + '</span>' +
        '<span style="font-size:.7rem;color:var(--ash);">' + count + ' steps</span>' +
        '<span style="font-size:.62rem;padding:1px 8px;border-radius:8px;' + (on ? 'background:rgba(111,207,147,.15);color:#6fcf93;' : 'background:rgba(232,93,58,.12);color:#e85d3a;') + '">' + (on ? 'ON' : 'OFF') + '</span>' +
      '</div>';
    });
    var box = document.getElementById('turnOnBranches');
    if (!box) return;
    box.innerHTML = html;
    box.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', saveTurnOnBranches);
    });
  }
  function saveTurnOnBranches() {
    var disabled = [];
    TURN_ON_BRANCHES.forEach(function (b) {
      var cb = document.querySelector('#turnOnBranches input[data-branch="' + b.id + '"]');
      if (cb && !cb.checked) disabled.push(b.id);
    });
    if (disabled.length >= TURN_ON_BRANCHES.length) {
      if (branchToast) branchToast.textContent = 'Cannot hide all branches — at least one must stay.';
      renderTurnOnBranches();
      return;
    }
    try { localStorage.setItem(TURNON_KEY, JSON.stringify({ disabled: disabled })); } catch (e) {}
    FB.put('config', { id: 'turnOnSections', disabled: disabled }).then(function () {
      if (branchToast) branchToast.textContent = 'Branch toggles saved.';
    }).catch(function () {
      if (branchToast) branchToast.textContent = 'Failed to save.';
    });
  }

  /* ---- Turn On Journey Map (read-only) ---- */
  function renderTurnOnMap() {
    var box = document.getElementById('turnOnMap');
    if (!box) return;
    box.innerHTML =
      '<input id="toMapSearch" placeholder="Search the journey (prompt, scene, option)... " style="width:100%;box-sizing:border-box;padding:.45rem .6rem;margin-bottom:.75rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.1);color:#ffebd2;font-size:.8rem;outline:none;">' +
      '<div id="toMapGroups"></div>';
    document.getElementById('toMapSearch').addEventListener('input', function () {
      renderTurnOnMapGroups(this.value);
    });
    renderTurnOnMapGroups('');
  }

  function turnOnNextLabel(next) {
    if (next === -1) return '<span style="color:#e85d3a;">&#x2605; END</span>';
    var br = turnOnBranchOf(next);
    var lbl = br !== null ? turnOnBranchLabel(br) : 'step ' + next;
    return esc(String(next)) + (br !== null ? ' (' + esc(lbl) + ')' : '');
  }

  function renderTurnOnMapGroups(q) {
    var box = document.getElementById('toMapGroups');
    if (!box) return;
    q = (q || '').toLowerCase();
    var html = '';
    for (var gi = 0; gi < TURN_ON_BRANCHES.length; gi++) {
      var gid = TURN_ON_BRANCHES[gi].id;
      var steps = turnOnSteps.filter(function (s) { return turnOnBranchOf(s.id) === gid; });
      if (q) {
        steps = steps.filter(function (s) {
          if (String(s.id).indexOf(q) >= 0) return true;
          if ((s.prompt || '').toLowerCase().indexOf(q) >= 0) return true;
          if ((s.scene || '').toLowerCase().indexOf(q) >= 0) return true;
          return (s.options || []).some(function (o) {
            return (o.text || '').toLowerCase().indexOf(q) >= 0 || (o.transition || '').toLowerCase().indexOf(q) >= 0;
          });
        });
      }
      var ends = {};
      steps.forEach(function (s) {
        s.options.forEach(function (o) { if (o.next === -1) ends[s.id] = 1; });
      });
      var symbol = turnOnBranchSymbol(turnOnSteps, gid);
      var stepHtml = steps.map(function (s) {
        var opts = (s.options || []).map(function (o, oi) {
          var icon = ['&#x2776;','&#x2777;','&#x2778;','&#x2779;','&#x277A;'][oi] || ('#' + (oi + 1));
          return '<div style="display:flex;gap:.5rem;padding:.22rem 0;border-bottom:1px solid rgba(255,210,150,.05);align-items:baseline;">' +
            '<span style="color:#ff8fa3;font-size:.78rem;">' + icon + '</span>' +
            '<span style="flex:1;font-size:.8rem;color:#d4c5b2;">' + esc(o.text) + '</span>' +
            '<span style="font-size:.68rem;color:var(--ash);white-space:nowrap;">&#x2192; ' + turnOnNextLabel(o.next) + '</span>' +
          '</div>' +
          (o.transition ? '<div style="font-size:.72rem;color:#6b5f52;font-style:italic;padding:0 0 .3rem 1.6rem;">&#x2661; ' + esc(o.transition) + '</div>' : '');
        }).join('');
        return '<div class="to-map-step" style="margin-bottom:.35rem;border:1px solid rgba(255,210,150,.07);border-radius:6px;background:rgba(255,220,160,.015);">' +
          '<div class="to-map-head" style="display:flex;gap:.6rem;align-items:center;padding:.4rem .6rem;cursor:pointer;flex-wrap:wrap;">' +
            '<span style="font-family:\'Fraunces\',Georgia,serif;font-size:.78rem;color:var(--gold);">#' + s.id + '</span>' +
            '<span style="font-size:.6rem;color:#6b5f52;text-transform:uppercase;letter-spacing:.05em;">Lv ' + (s.level + 1) + (s.mood ? ' &middot; ' + esc(s.mood) : '') + (s.symbol ? ' &middot; ' + esc(s.symbol) : '') + '</span>' +
            '<span style="flex:1;font-size:.78rem;color:#d4c5b2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(s.prompt || '') + '</span>' +
            '<span style="color:var(--ash);font-size:.68rem;">' + (s.options ? s.options.length : 0) + ' opts</span>' +
            '<span style="color:var(--ash);font-size:.7rem;">&#9662;</span>' +
          '</div>' +
          '<div class="to-map-body" style="display:none;padding:.45rem .7rem;border-top:1px solid rgba(255,210,150,.06);">' +
            (s.scene ? '<div style="font-size:.78rem;color:#c7b8a1;font-style:italic;margin-bottom:.5rem;border-left:2px solid rgba(232,93,58,.5);padding-left:.6rem;">' + esc(s.scene) + '</div>' : '') +
            '<div style="font-size:.85rem;color:var(--parchment);margin-bottom:.4rem;">' + esc(s.prompt) + '</div>' +
            opts +
          '</div></div>';
      }).join('');
      html += '<div style="margin-bottom:1rem;border:1px solid rgba(255,210,150,.1);border-radius:10px;overflow:hidden;">' +
        '<div class="to-map-group-head" style="display:flex;justify-content:space-between;align-items:center;gap:.6rem;padding:.55rem .9rem;background:rgba(255,220,160,.06);cursor:pointer;">' +
          '<span style="font-family:\'Fraunces\',Georgia,serif;font-size:.85rem;color:var(--gold);">' + esc(symbol) + ' ' + esc(TURN_ON_BRANCHES[gi].label) + '</span>' +
          '<span style="color:var(--ash);font-size:.72rem;">' + steps.length + ' steps &middot; ' + Object.keys(ends).length + ' endings</span>' +
        '</div>' +
        '<div class="to-map-group-body" style="padding:.6rem;">' +
          (steps.length ? stepHtml : '<div style="color:#6b5f52;font-size:.72rem;text-align:center;padding:.4rem 0;">No matching steps.</div>') +
        '</div>' +
      '</div>';
    }
    box.innerHTML = html || '<div style="color:#6b5f52;font-size:.75rem;text-align:center;padding:1rem 0;">No matching steps.</div>';
    box.querySelectorAll('.to-map-group-head').forEach(function (h) {
      h.addEventListener('click', function () {
        var b = h.nextElementSibling;
        b.style.display = b.style.display === 'none' ? '' : 'none';
      });
    });
    box.querySelectorAll('.to-map-head').forEach(function (h) {
      h.addEventListener('click', function () {
        var b = h.nextElementSibling;
        b.style.display = b.style.display === 'none' ? 'block' : 'none';
      });
    });
  }

  /* ---- Turn On Sessions ---- */
  function renderTurnOnSessions() {
    var list = document.getElementById('turnOnSessionsList');
    if (!list) return;
    FB.get('turnOn', 'sessions_data').then(function (d) {
      var items = (d && d.sessions) ? JSON.parse(JSON.stringify(d.sessions)) : [];
      items.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
      if (!items.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">&#x2661;</div><p>No sessions yet.</p>' +
          '<p style="font-size:.72rem;color:#6b5f52;margin-top:.4rem;">Sessions record when a playthrough ends on a browser without the admin passkey. Playthroughs on your own (admin) browser are skipped by design.</p></div>';
        return;
      }
      var totalChoices = 0, branchCounts = {};
      items.forEach(function (s) {
        totalChoices += s.history ? s.history.length : 0;
        var br = s.history && s.history.length ? turnOnBranchOf(s.history[0].stepId) : null;
        if (br !== null) branchCounts[br] = (branchCounts[br] || 0) + 1;
      });
      var stat = function (val, label, color) {
        return '<div style="flex:1;min-width:90px;padding:8px 12px;border-radius:8px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.08);text-align:center;">' +
          '<div style="font-size:1.15rem;font-weight:bold;color:' + color + ';">' + val + '</div>' +
          '<div style="font-size:.62rem;color:#6b5f52;text-transform:uppercase;letter-spacing:.05em;">' + label + '</div></div>';
      };
      var topBranch = Object.keys(branchCounts).sort(function (a, b) { return branchCounts[b] - branchCounts[a]; })[0];
      var html =
        '<div style="display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:.75rem;">' +
          stat(items.length, 'Sessions', '#ffe680') +
          stat(totalChoices, 'Total choices', '#7cc4ff') +
          stat((totalChoices / items.length).toFixed(1), 'Avg choices', '#6fcf93') +
          stat(esc(topBranch ? turnOnBranchLabel(parseInt(topBranch, 10)).split(' — ')[0] : '—'), 'Top branch', '#ff8fa3') +
        '</div>';
      items.forEach(function (s, i) {
        var choices = s.history ? s.history.length : 0;
        var label = s.label || 'Session ' + (i + 1);
        var br = s.history && s.history.length ? turnOnBranchOf(s.history[0].stepId) : null;
        var brLabel = br !== null ? turnOnBranchLabel(br).split(' — ')[0] : '—';
        var date = s.timestamp ? new Date(s.timestamp).toLocaleString() : '';
        var highestLevel = 0;
        if (s.history) {
          s.history.forEach(function (h) {
            var st = null;
            for (var si = 0; si < turnOnSteps.length; si++) { if (turnOnSteps[si].id === h.stepId) { st = turnOnSteps[si]; break; } }
            if (st && st.level >= highestLevel) highestLevel = st.level + 1;
          });
        }
        html += '<div class="to-card" style="border:1px solid rgba(255,210,150,.08);border-radius:10px;margin-bottom:.5rem;background:rgba(255,220,160,.02);">';
        html += '<div class="to-card-head" style="display:flex;justify-content:space-between;align-items:center;gap:.6rem;padding:.55rem .8rem;cursor:pointer;">';
        html += '<span style="font-family:\'Fraunces\',Georgia,serif;font-size:.85rem;color:var(--gold);">' + esc(label) + '</span>';
        html += '<span style="font-size:.62rem;padding:1px 8px;border-radius:8px;background:rgba(255,210,150,.12);color:#d4c5b2;">' + esc(brLabel) + '</span>';
        html += '<span style="color:var(--ash);font-size:.72rem;">' + choices + ' choices</span>';
        html += '<span style="color:var(--ash);font-size:.72rem;">peak Lv ' + highestLevel + '</span>';
        html += '<span style="flex:1;color:var(--ash);font-size:.72rem;text-align:right;">' + esc(date) + '</span>';
        html += '<span style="color:var(--ash);font-size:.75rem;">&#9662;</span>';
        html += '</div>';
        html += '<div class="to-body" style="padding:.6rem .8rem;border-top:1px solid rgba(255,210,150,.06);display:none;">';
        if (s.history) {
          s.history.forEach(function (h, hi) {
            html += '<div style="display:flex;gap:.5rem;padding:.22rem 0;border-bottom:1px solid rgba(255,210,150,.05);align-items:baseline;">';
            html += '<span style="color:var(--ash);font-size:.68rem;min-width:22px;">' + (hi + 1) + '.</span>';
            html += '<span style="flex:1;font-size:.8rem;color:var(--parchment);">' + esc(h.choice || '') + '</span>';
            html += '<span style="color:var(--ash);font-size:.68rem;">&#8594; step ' + h.stepId + '</span>';
            html += '</div>';
          });
        }
        html += '</div></div>';
      });
      list.innerHTML = html;
      list.querySelectorAll('.to-card-head').forEach(function (h) {
        h.addEventListener('click', function () { this.closest('.to-card').classList.toggle('open'); });
      });
    }).catch(function () {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#x2661;</div><p>Could not load sessions.</p></div>';
    });
  }

  function renderTurnOn() {
    renderTurnOnBranches();
    renderTurnOnMap();
    renderTurnOnSessions();
  }

  /* ---- Secret Song ---- */
  function loadSecretForm() {
    dbGet('config', 'secretSong').then(function (data) {
      if (data && data.song) {
        var s = data.song;
        document.getElementById('secTitle').value = s.title || '';
        document.getElementById('secArtist').value = s.artist || '';
        document.getElementById('secDuration').value = s.duration || '';
        document.getElementById('secCover').value = s.cover || '';
        document.getElementById('secFileInfo').textContent = s.fileName ? 'Current: ' + s.fileName : '';
      } else {
        document.getElementById('secTitle').value = '';
        document.getElementById('secArtist').value = '';
        document.getElementById('secDuration').value = '';
        document.getElementById('secCover').value = '';
        document.getElementById('secFileInfo').textContent = '';
      }
    }).catch(function () {});
  }

  function saveSecretSong() {
    var title = document.getElementById('secTitle').value.trim();
    var artist = document.getElementById('secArtist').value.trim();
    var duration = parseInt(document.getElementById('secDuration').value) || 200;
    var cover = document.getElementById('secCover').value.trim();
    var fileInput = document.getElementById('secAudioFile');
    var file = fileInput.files[0];

    var song = {
      title: title || '\u2728 Secret Song',
      artist: artist || '\u2661 For You',
      duration: duration,
      cover: cover || '',
      hasFile: !!file
    };

    function doSave() {
      dbPut('config', { key: 'secretSong', song: song }).then(function () {
        toast('Secret song saved!');
        loadSecretForm();
      }).catch(function () { toast('Error saving secret song'); });
    }

    if (file) {
      song.audioBlob = file;
      song.audioType = file.type;
      song.fileName = file.name;
      song.hasFile = true;
      doSave();
    } else {
      dbGet('config', 'secretSong').then(function (existing) {
        if (existing && existing.song && existing.song.audioBlob) {
          song.audioBlob = existing.song.audioBlob;
          song.audioType = existing.song.audioType;
          song.fileName = existing.song.fileName;
        }
        doSave();
      }).catch(function () { doSave(); });
    }
  }

  function clearSecretSong() {
    if (!confirm('Remove the secret song?')) return;
    dbPut('config', { key: 'secretSong', song: null }).then(function () {
      toast('Secret song cleared');
      loadSecretForm();
    }).catch(function () { toast('Error clearing secret song'); });
  }

  // Single overlay close listener (not duplicated per modal open)
  document.getElementById('modalOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  /* ---- Init ---- */
  var ADMIN_UID = 'tNigpJD0iudxzcoP49DDmA4uDQK2'; // set to the Firebase admin user's uid (see database.rules.json)

  function fbAuthAvailable() {
    return typeof firebase !== 'undefined' && typeof firebase.auth === 'function';
  }

  function isAdminUser() {
    if (!fbAuthAvailable()) return false;
    var u = firebase.auth().currentUser;
    return !!(u && u.uid === ADMIN_UID);
  }

  function unlockApp() {
    localStorage.setItem('db-admin-auth', '1');
    document.getElementById('loginGate').classList.add('hidden');
    document.getElementById('app').classList.add('show');
    loadAll().then(function () { renderSections(); renderSongs(); });
  }

  function lockApp() {
    localStorage.removeItem('db-admin-auth');
    document.getElementById('app').classList.remove('show');
    document.getElementById('loginGate').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginErr').classList.remove('show');
  }

  async function init() {
    // Auto-restore: Firebase session persists across reloads
    if (fbAuthAvailable()) {
      firebase.auth().onAuthStateChanged(function (u) {
        if (u && u.uid === ADMIN_UID) { unlockApp(); }
      });
    }

    // Localhost/offline fallback (no Firebase): keep the old passkey behavior
    if (localStorage.getItem('db-admin-auth') === '1' && !fbAuthAvailable()) {
      unlockApp();
    }

    document.getElementById('loginBtn').addEventListener('click', function () {
      var email = document.getElementById('loginEmail').value.trim();
      var pass = document.getElementById('loginPass').value;
      document.getElementById('loginErr').classList.remove('show');
      if (fbAuthAvailable()) {
        firebase.auth().signInWithEmailAndPassword(email, pass).then(function () {
          if (isAdminUser()) {
            unlockApp();
          } else {
            firebase.auth().signOut();
            document.getElementById('loginErr').textContent = 'Not the admin account';
            document.getElementById('loginErr').classList.add('show');
          }
        }).catch(function () {
          document.getElementById('loginErr').textContent = 'Login failed';
          document.getElementById('loginErr').classList.add('show');
        });
      } else if (pass === PASSKEY) {
        unlockApp();
      } else {
        document.getElementById('loginErr').textContent = 'Incorrect passkey';
        document.getElementById('loginErr').classList.add('show');
      }
    });

    document.getElementById('loginEmail').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('loginPass').focus();
    });

    document.getElementById('loginPass').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('loginBtn').click();
    });

    document.getElementById('logoutBtn').addEventListener('click', function () {
      if (fbAuthAvailable() && firebase.auth().currentUser) firebase.auth().signOut();
      lockApp();
    });

    document.getElementById('addBtn').addEventListener('click', function () { openSongModal(-1); });
    document.getElementById('addEventBtn') && document.getElementById('addEventBtn').addEventListener('click', function () {
      FB.get('config', 'events').then(function (data) { openEventModal(-1, [], data); });
    });
    document.getElementById('addDynamicBtn') && document.getElementById('addDynamicBtn').addEventListener('click', function () {
      FB.get('config', 'dynamicContent').then(function (data) { openDynamicModal(-1, [], data); });
    });
    document.getElementById('addTimelineBtn') && document.getElementById('addTimelineBtn').addEventListener('click', function () {
      FB.get('config', 'timeline').then(function (data) { openTimelineModal(-1, [], data); });
    });
    document.getElementById('addQuizBtn') && document.getElementById('addQuizBtn').addEventListener('click', function () { editQuiz(-1); });
    document.getElementById('quizImportBtn') && document.getElementById('quizImportBtn').addEventListener('click', function () {
      var val = document.getElementById('quizJsonInput').value.trim();
      if (!val) { document.getElementById('quizImportStatus').textContent = 'Paste JSON first.'; return; }
      var imported;
      try { imported = JSON.parse(val); if (!Array.isArray(imported)) throw 'not array'; } catch (e) { document.getElementById('quizImportStatus').textContent = 'Invalid JSON.'; return; }
      FB.get('config', 'quizzes').then(function (d) {
        var existing = d && Array.isArray(d) ? d : (d && d.list ? d.list : []);
        existing = existing.concat(imported);
        FB.put('config', { id: 'quizzes', list: existing }).then(function () {
          document.getElementById('quizJsonInput').value = '';
          document.getElementById('quizImportStatus').textContent = imported.length + ' quiz(es) imported.';
          renderQuiz();
        });
      });
    });
    document.getElementById('dreamPostBtn').addEventListener('click', function () {
      var text = document.getElementById('dreamText').value.trim();
      var author = document.getElementById('dreamAuthor').value;
      if (!text) { toast('Write a dream first.'); return; }
      FB.put('dreams', {
        id: 'dream_' + Date.now(),
        author: author,
        text: text,
        type: 'text',
        createdAt: Date.now()
      }).then(function () {
        document.getElementById('dreamText').value = '';
        renderDreams();
        toast('Dream posted.');
      }).catch(function () { toast('Failed to post.'); });
    });
    // Project tab
    document.getElementById('addProjectPuzzleBtn') && document.getElementById('addProjectPuzzleBtn').addEventListener('click', function () {
      FB.get('project-puzzles', 'list').then(function (data) { openProjectPuzzleModal(-1, [], data); }).catch(function () { openProjectPuzzleModal(-1, [], null); });
    });
    document.getElementById('addStorylineBtn') && document.getElementById('addStorylineBtn').addEventListener('click', function () {
      FB.get('project-texts', 'list').then(function (data) { openStorylineModal(-1, [], data); }).catch(function () { openStorylineModal(-1, [], null); });
    });
    document.getElementById('galleryAddBtn').addEventListener('click', function () { openGalleryModal(-1); });

    // Gallery batch upload
    document.getElementById('galleryUploadBtn').addEventListener('click', function () {
      document.getElementById('galleryUploadInput').click();
    });
    document.getElementById('galleryUploadInput').addEventListener('change', function () {
      var files = this.files;
      if (!files.length) return;
      var btn = document.getElementById('galleryUploadBtn');
      var loaded = 0;
      var total = files.length;
      var added = 0;
      var skipped = 0;

      // build duplicate set from existing items
      var existingNames = {};
      for (var ei = 0; ei < galleryItems.length; ei++) {
        var fname = (galleryItems[ei].label || '').toLowerCase();
        if (fname) existingNames[fname] = true;
      }

      for (var fi = 0; fi < files.length; fi++) {
        (function (file) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var baseName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            var label = baseName;

            // prevent duplicate
            if (existingNames[label.toLowerCase()]) {
              skipped++;
            } else {
              existingNames[label.toLowerCase()] = true;
              galleryItems.push({
                type: file.type.indexOf('video') !== -1 ? 'video' : 'image',
                label: label,
                note: '',
                file: '',
                fileData: e.target.result,
                fileType: file.type
              });
              added++;
            }

            loaded++;
            if (loaded === total) {
              saveGallery().then(function () {
                renderGallery();
                btn.textContent = '\u2705 ' + added + ' added' + (skipped ? ', ' + skipped + ' skipped' : '') + ' (' + galleryItems.length + ' total)';
                setTimeout(function () { btn.textContent = '\uD83D\uDCC1 Upload Gallery Images'; }, 3000);
                toast(added + ' images added to gallery' + (skipped ? '. ' + skipped + ' duplicates skipped.' : '.'));
              });
            }
          };
          reader.readAsDataURL(file);
        })(files[fi]);
      }
      this.value = '';
    });

    // Activity
    document.getElementById('activityFilter') && document.getElementById('activityFilter').addEventListener('change', loadActivity);
    document.getElementById('clearActivityBtn') && document.getElementById('clearActivityBtn').addEventListener('click', function () {
      if (!confirm('Clear all recorded activity?')) return;
      FB.clear('activity').then(function () { loadActivity(); toast('Activity cleared.'); });
    });

    // Reset
    document.getElementById('resetBtn').addEventListener('click', function () {
      if (!confirm('Reset all data to defaults? This will delete all uploaded songs and custom unlock dates.')) return;
      dbClear('songs').then(function () {
        dbClear('config').then(function () {
          loadAll().then(function () { renderSections(); renderSongs(); renderGallery(); toast('Reset to defaults'); });
        });
      });
    });

    // Save features to Firebase
    document.getElementById('saveFeaturesBtn').addEventListener('click', function () {
      var status = document.getElementById('featuresSaveStatus');
      status.textContent = 'Saving...';
      window.FeatureFlags.save();
      status.textContent = 'Saved at ' + new Date().toLocaleTimeString();
      setTimeout(function () { status.textContent = ''; }, 4000);
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('tab' + this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1)).classList.add('active');
        // Load tab-specific data
        if (this.dataset.tab === 'secret') loadSecretForm();
        if (this.dataset.tab === 'gallery') renderGallery();
        if (this.dataset.tab === 'wishes') { loadWishes(); }
        if (this.dataset.tab === 'requests') renderRequests();
        if (this.dataset.tab === 'reviews') renderReviews();
        if (this.dataset.tab === 'settings') { renderSettings(); document.getElementById('currentPassDisplay').textContent = fbAuthAvailable() && firebase.auth().currentUser ? firebase.auth().currentUser.email : PASSKEY; document.getElementById('newPassInput').value = ''; }
        if (this.dataset.tab === 'access') renderAccess();
        if (this.dataset.tab === 'sectionRequests') renderSectionRequests();
        if (this.dataset.tab === 'events') renderEvents();
        if (this.dataset.tab === 'quiz') renderQuiz();
        if (this.dataset.tab === 'letters') renderLetters();
        if (this.dataset.tab === 'dynamic') renderDynamicContent();
        if (this.dataset.tab === 'timeline') renderTimeline();
        if (this.dataset.tab === 'memories') renderMemories();
        if (this.dataset.tab === 'selfletters') renderSelfLetters();
        if (this.dataset.tab === 'rare') renderRare();
        if (this.dataset.tab === 'achievements') renderAchievements();
        if (this.dataset.tab === 'dreams') renderDreams();
        if (this.dataset.tab === 'turnon') { renderTurnOn(); }
        if (this.dataset.tab === 'activity') loadActivity();
        if (this.dataset.tab === 'interactions') renderInteractions();
        if (this.dataset.tab === 'project') { renderProjectPuzzles(); renderStoryline(); }
      });
    });

    // Interactions auto-refresh while the tab is open
    var refreshInteractionsBtn = document.getElementById('refreshInteractionsBtn');
    if (refreshInteractionsBtn) refreshInteractionsBtn.addEventListener('click', renderInteractions);
    setInterval(function () {
      var t = document.getElementById('tabInteractions');
      if (t && t.classList.contains('active')) renderInteractions();
    }, 20000);

    // Wishes search/sort/filter
    var wishInputs = ['wishSearch', 'wishSort', 'wishFilter'];
    wishInputs.forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () { renderWishes(); });
      document.getElementById(id).addEventListener('change', function () { renderWishes(); });
    });
    document.getElementById('wishExportBtn').addEventListener('click', function () { exportWishes('json'); });
    document.getElementById('wishExportCsvBtn').addEventListener('click', function () { exportWishes('csv'); });
    document.getElementById('exportReviewsBtn').addEventListener('click', exportReviews);

    // Secret song
    document.getElementById('secSaveBtn').addEventListener('click', saveSecretSong);
    document.getElementById('secClearBtn').addEventListener('click', clearSecretSong);
    document.getElementById('secAudioFile').addEventListener('change', function () {
      var f = this.files[0];
      document.getElementById('secFileInfo').textContent = f ? f.name + ' (' + Math.round(f.size / 1024) + ' KB)' : '';
    });

    // Personal note
    function loadPersonalNote() {
      dbGet('config', 'personalNote').then(function (data) {
        document.getElementById('secNoteText').value = data && data.text ? data.text : '';
      }).catch(function () {});
    }
    document.getElementById('secNoteSaveBtn').addEventListener('click', function () {
      var text = document.getElementById('secNoteText').value.trim();
      dbPut('config', { key: 'personalNote', text: text }).then(function () {
        toast('Personal note saved!');
      }).catch(function () { toast('Error saving note'); });
    });
    document.getElementById('secNoteClearBtn').addEventListener('click', function () {
      if (!confirm('Clear the personal note?')) return;
      document.getElementById('secNoteText').value = '';
      dbPut('config', { key: 'personalNote', text: '' }).then(function () {
        toast('Note cleared');
      }).catch(function () { toast('Error clearing note'); });
    });
    // Patch loadSecretForm to also load note
    var origLoad = loadSecretForm;
    loadSecretForm = function() { origLoad(); loadPersonalNote(); };

    // Password change
    document.getElementById('changePassBtn').addEventListener('click', function () {
      var newPass = document.getElementById('newPassInput').value.trim();
      if (!newPass) { toast('Enter a new password'); return; }
      if (newPass.length < 6) { toast('Password must be at least 6 characters'); return; }
      if (fbAuthAvailable() && firebase.auth().currentUser) {
        firebase.auth().currentUser.updatePassword(newPass).then(function () {
          document.getElementById('newPassInput').value = '';
          toast('Password changed');
        }).catch(function (e) { toast('Error: ' + e.message); });
      } else {
        // localhost/offline fallback: local-only passkey
        PASSKEY = newPass;
        localStorage.setItem('db-admin-passkey', btoa(PASSKEY));
        document.getElementById('currentPassDisplay').textContent = PASSKEY;
        document.getElementById('newPassInput').value = '';
        toast('Password changed (local only)');
      }
    });

    document.getElementById('coldRestartBtn').addEventListener('click', function () {
      if (!confirm('Are you sure? This will delete ALL local data (progress, wishes, letters, etc.). This cannot be undone.')) return;
      if (!confirm('Really? Everything will be reset to zero.')) return;
      var remove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('db-') === 0) remove.push(k);
      }
      remove.forEach(function(k) { localStorage.removeItem(k); });
      toast('All data cleared. Reloading...', 'rgba(232,93,58,0.8)', 3000);
      setTimeout(function() { location.reload(); }, 2000);
    });

    // Unread letter badge
    function checkUnreadLetters() {
      var btn = document.getElementById('lettersTabBtn');
      if (!btn) return;
      FB.getAll('letters').then(function (letters) {
        var unread = letters.filter(function (l) { return !l.read; }).length;
        var existing = btn.querySelector('.badge');
        if (existing) existing.remove();
        if (unread > 0) {
          var badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = unread;
          badge.style.cssText = 'margin-left:6px;background:#e85d3a;color:#fff;border-radius:10px;padding:1px 6px;font-size:.65rem;font-weight:600;';
          btn.appendChild(badge);
        }
      }).catch(function () {});
    }
    checkUnreadLetters();
    setInterval(checkUnreadLetters, 15000);

    // Error badge
    function pollErrors() {
      var badge = document.getElementById('errorBadge');
      if (!badge) return;
      var errs = window.globalErrors || [];
      if (errs.length > 0) {
        badge.style.display = '';
        badge.textContent = errs.length;
      }
    }
    setInterval(pollErrors, 3000);
    setTimeout(pollErrors, 500);
  }

  function showErrors() {
    var errs = window.globalErrors || [];
    if (!errs.length) { toast('No errors'); return; }
    var html = errs.map(function (e, i) {
      return '<div style="border-bottom:1px solid rgba(255,210,150,.08);padding:.5rem 0;font-size:.75rem;">' +
        '<div style="color:var(--ember);font-weight:600;">' + esc(e.type || 'error') + '</div>' +
        '<div style="color:var(--parchment);">' + esc(e.msg || '') + '</div>' +
        (e.line ? '<div style="color:var(--ash);font-size:.65rem;">line ' + e.line + '</div>' : '') +
        '</div>';
    }).join('');
    var overlay = document.createElement('div');
    overlay.innerHTML = '<div style="position:fixed;inset:0;z-index:99999;background:rgba(15,10,8,0.95);overflow-y:auto;padding:2rem;">' +
      '<button onclick="this.parentElement.parentElement.remove()" style="position:fixed;top:16px;right:20px;z-index:10000;background:transparent;border:1px solid rgba(255,255,255,0.15);color:var(--parchment);font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer;">\u2716</button>' +
      '<h2 style="font-family:\'Fraunces\',Georgia,serif;color:var(--ember);margin-bottom:1rem;">' + errs.length + ' Error(s)</h2>' +
      html + '</div>';
    document.body.appendChild(overlay);
  }

  init();
})();