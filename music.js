(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('music')) return;

  var PLACEHOLDER_COVERS = [
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%232a2018%22/%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2220%22 fill=%22%23ffe680%22 opacity=%22.15%22/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%231c1620%22/%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2220%22 fill=%22%23e85d3a%22 opacity=%22.15%22/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23181820%22/%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2220%22 fill=%22%23ffd700%22 opacity=%22.12%22/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23221828%22/%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2220%22 fill=%22%23ffb6c1%22 opacity=%22.15%22/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23202018%22/%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2220%22 fill=%22%23ffa500%22 opacity=%22.15%22/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23182020%22/%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2220%22 fill=%22%23ff6347%22 opacity=%22.15%22/%3E%3C/svg%3E'
  ];

  var STORAGE_KEY = 'ash-jukebox';
  var audioUrls = [];

  function openDB() { return Promise.resolve(true); }

  function dbGetAll(storeName) { return (typeof FB !== 'undefined' && FB.getAll) ? FB.getAll(storeName) : Promise.resolve([]); }

  function dbGet(storeName, key) { return (typeof FB !== 'undefined' && FB.get) ? FB.get(storeName, key) : Promise.resolve(null); }

  function dbPut(storeName, data) { return (typeof FB !== 'undefined' && FB.put) ? FB.put(storeName, data) : Promise.resolve(null); }

  function dbDelete(storeName, key) { return (typeof FB !== 'undefined' && FB.delete) ? FB.delete(storeName, key) : Promise.resolve(null); }

  function dbClear(storeName) { return (typeof FB !== 'undefined' && FB.clear) ? FB.clear(storeName) : Promise.resolve(null); }

  function revokeAudioUrls() {
    for (var i = 0; i < audioUrls.length; i++) {
      try { URL.revokeObjectURL(audioUrls[i]); } catch(e) {}
    }
    audioUrls = [];
  }

  function loadSongsFromDB() {
    return dbGetAll('songs').then(function (records) {
      if (!records || !records.length) return null;
      var songObjs = [];
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var audioUrl = null;
        if (r.audioBlob) {
          try {
            audioUrl = URL.createObjectURL(r.audioBlob);
            audioUrls.push(audioUrl);
          } catch(e) {}
        } else if (r.isFileSong && r.fileName) {
          audioUrl = 'songs/' + r.fileName;
        }
        songObjs.push({
          title: r.title || 'Untitled',
          artist: r.artist || 'Unknown',
          cover: r.cover || PLACEHOLDER_COVERS[i % PLACEHOLDER_COVERS.length],
          src: audioUrl,
          duration: r.duration || 180,
          unlockDate: r.unlockDate || '',
          autoUnlock: r.autoUnlock !== false,
          hasFile: !!r.hasFile || !!audioUrl
        });
      }
      return songObjs;
    }).catch(function () {
      return null;
    });
  }

  function loadFileSongs() {
    return fetch('songs/list.json').then(function (res) {
      if (!res.ok) return [];
      return res.json();
    }).then(function (list) {
      if (!list || !list.length) return [];
      return list.map(function (item, i) {
        return {
          title: item.title || 'Untitled',
          artist: item.artist || 'Unknown',
          cover: PLACEHOLDER_COVERS[i % PLACEHOLDER_COVERS.length],
          src: 'songs/' + item.file,
          duration: item.duration || 180,
          unlockDate: item.unlockDate || '',
          autoUnlock: true,
          hasFile: true
        };
      });
    }).catch(function () {
      return [];
    });
  }

  // ponytail: songs the user uploaded themselves (Firebase userSongs store)
  function loadUserSongs() {
    return dbGetAll('userSongs').then(function (records) {
      if (!records || !records.length) return [];
      var songObjs = [];
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (!r.audioBlob) continue;
        var audioUrl;
        try {
          audioUrl = URL.createObjectURL(r.audioBlob);
          audioUrls.push(audioUrl);
        } catch(e) { continue; }
        songObjs.push({
          title: r.title || 'Untitled',
          artist: r.artist || 'Added by you',
          cover: PLACEHOLDER_COVERS[i % PLACEHOLDER_COVERS.length],
          src: audioUrl,
          duration: r.duration || 180,
          unlockDate: '',
          autoUnlock: true,
          hasFile: true,
          userAdded: true
        });
      }
      return songObjs;
    }).catch(function () {
      return [];
    });
  }

  function Jukebox(songs) {
    var self = this;
    this.songs = songs || [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isOpen = false;
    this.volume = 0.5;
    this.shuffle = false;
    this.repeat = false;
    this.favorites = [];
    this.shuffleOrder = [];
    this.shuffleIndex = 0;
    this.duration = 0;
    this.currentTime = 0;
    this.audioCtx = null;
    this.gainNode = null;
    this.analyser = null;
    this.sourceNode = null;
    this.animationId = null;
    this.noteTimer = null;

    this.restoreState();
    this.buildDOM(function () {
      self.bindEvents();
      self.updateUI();

      setTimeout(function () { self.btn.classList.add('show'); }, 1500);

      if (self._autoPlay) {
        setTimeout(function () { self.togglePlay(); }, 2500);
      }
    });
  }

  Jukebox.prototype.saveState = function () {
    try {
      var state = {
        index: this.currentIndex,
        volume: this.volume,
        shuffle: this.shuffle,
        repeat: this.repeat,
        favorites: this.favorites,
        isPlaying: this.isPlaying,
        currentTime: this.currentTime,
        shuffleOrder: this.shuffleOrder,
        shuffleIndex: this.shuffleIndex
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  };

  Jukebox.prototype.restoreState = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var state = JSON.parse(raw);
      if (state.index !== undefined) this.currentIndex = state.index;
      if (state.volume !== undefined) this.volume = state.volume;
      if (state.shuffle !== undefined) this.shuffle = state.shuffle;
      if (state.repeat !== undefined) this.repeat = state.repeat;
      if (state.favorites) this.favorites = state.favorites;
      if (state.shuffleOrder) this.shuffleOrder = state.shuffleOrder;
      if (state.shuffleIndex !== undefined) this.shuffleIndex = state.shuffleIndex;
      if (state.currentTime !== undefined) this.currentTime = state.currentTime;
      this._autoPlay = !!state.isPlaying;
    } catch (e) {}
  };

  Jukebox.prototype.buildDOM = function (done) {
    var self = this;

    this.btn = document.getElementById('jukeboxBtn') || (function () {
      var el = document.createElement('button');
      el.id = 'jukeboxBtn';
      el.setAttribute('aria-label', 'Open jukebox');
      el.innerHTML =
        '<span class="btn-icon">&#x1F3B5;</span>' +
        '<svg class="progress-ring" viewBox="0 0 100 100">' +
          '<circle class="ring-bg" cx="50" cy="50" r="46"/>' +
          '<circle class="ring-fg" cx="50" cy="50" r="46" stroke-dasharray="289.03" stroke-dashoffset="289.03"/>' +
        '</svg>';
      document.body.appendChild(el);
      return el;
    })();

    this.overlay = document.getElementById('jukeboxOverlay') || (function () {
      var el = document.createElement('div');
      el.id = 'jukeboxOverlay';
      document.body.appendChild(el);
      return el;
    })();

    this.panel = document.getElementById('jukeboxPanel') || (function (ctx) {
      var el = document.createElement('div');
      el.id = 'jukeboxPanel';
      el.innerHTML =
        '<div class="jukebox-inner">' +
          '<div class="jukebox-header">' +
            '<span class="now-playing-label">Now Playing</span>' +
            '<button class="close-btn" aria-label="Close jukebox">&times;</button>' +
          '</div>' +
          '<div class="album-section">' +
            '<div class="vinyl-container">' +
              '<div class="vinyl-glow"></div>' +
              '<div class="vinyl-disc">' +
                '<div class="album-cover-wrapper">' +
                  '<img class="album-cover" src="" alt="Album art" loading="lazy">' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="song-info">' +
            '<div class="song-title">Not Playing</div>' +
            '<div class="artist-name">&mdash;</div>' +
          '</div>' +
          '<div class="equalizer" id="jukeboxEq">' +
            '<div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>' +
            '<div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>' +
            '<div class="eq-bar"></div><div class="eq-bar"></div>' +
          '</div>' +
          '<div class="seek-container">' +
            '<input type="range" class="seek-bar" min="0" max="1000" value="0" aria-label="Seek">' +
            '<div class="time-display">' +
              '<span class="current-time">0:00</span>' +
              '<span class="total-time">0:00</span>' +
            '</div>' +
          '</div>' +
          '<div class="controls">' +
            '<button class="shuffle-btn" aria-label="Toggle shuffle">&#x1F500;</button>' +
            '<button class="prev-btn" aria-label="Previous track">&#x23EE;</button>' +
            '<button class="play-pause" aria-label="Play / Pause">&#x25B6;</button>' +
            '<button class="next-btn" aria-label="Next track">&#x23ED;</button>' +
            '<button class="repeat-btn" aria-label="Toggle repeat">&#x1F501;</button>' +
          '</div>' +
          '<div class="volume-container">' +
            '<span class="vol-icon">&#x1F509;</span>' +
            '<input type="range" class="volume-slider" min="0" max="100" value="' + (ctx.volume * 100) + '" aria-label="Volume">' +
          '</div>' +
          '<div class="playlist-label">Playlist <button class="user-add-song" aria-label="Add your own song">+ Add</button></div>' +
          '<div class="playlist" id="jukeboxPlaylist" role="listbox" aria-label="Song playlist"></div>' +
        '</div>';
      document.body.appendChild(el);
      return el;
    })(this);

    this.miniPlayer = document.getElementById('jukeboxMini') || (function () {
      var el = document.createElement('div');
      el.id = 'jukeboxMini';
      el.className = 'mini-player';
      el.innerHTML =
        '<div class="mp-album"><img src="" alt="" loading="lazy"></div>' +
        '<div class="mp-info">' +
          '<div class="mp-title">Not Playing</div>' +
          '<div class="mp-artist">&mdash;</div>' +
        '</div>' +
        '<button class="mp-play-btn" aria-label="Play / Pause">&#x25B6;</button>';
      document.body.appendChild(el);
      return el;
    })();

    this.vinylDisc = this.panel.querySelector('.vinyl-disc');
    this.albumCover = this.panel.querySelector('.album-cover');
    this.songTitle = this.panel.querySelector('.song-title');
    this.artistName = this.panel.querySelector('.artist-name');
    this.seekBar = this.panel.querySelector('.seek-bar');
    this.currentTimeEl = this.panel.querySelector('.current-time');
    this.totalTimeEl = this.panel.querySelector('.total-time');
    this.playBtn = this.panel.querySelector('.play-pause');
    this.prevBtn = this.panel.querySelector('.prev-btn');
    this.nextBtn = this.panel.querySelector('.next-btn');
    this.shuffleBtn = this.panel.querySelector('.shuffle-btn');
    this.repeatBtn = this.panel.querySelector('.repeat-btn');
    this.volumeSlider = this.panel.querySelector('.volume-slider');
    this.volIcon = this.panel.querySelector('.vol-icon');
    this.playlistEl = this.panel.querySelector('.playlist');
    this.eqEl = this.panel.querySelector('.equalizer');
    this.closeBtn = this.panel.querySelector('.close-btn');
    this.progressRing = this.btn.querySelector('.ring-fg');
    this.mpAlbum = this.miniPlayer.querySelector('.mp-album img');
    this.mpTitle = this.miniPlayer.querySelector('.mp-title');
    this.mpArtist = this.miniPlayer.querySelector('.mp-artist');
    this.mpPlayBtn = this.miniPlayer.querySelector('.mp-play-btn');

    this.buildPlaylist();
    if (done) done();

    // ponytail: user can add their own song — stored in Firebase userSongs store,
    // persisted as base64 via fbPut's Blob handling, reloaded on next visit
    this.addBtn = this.panel.querySelector('.user-add-song');
    this.addFileInput = null;
    if (this.addBtn) {
      var self = this;
      this.addBtn.addEventListener('click', function () {
        if (!self.addFileInput) {
          self.addFileInput = document.createElement('input');
          self.addFileInput.type = 'file';
          self.addFileInput.accept = 'audio/*';
          self.addFileInput.style.display = 'none';
          document.body.appendChild(self.addFileInput);
          self.addFileInput.addEventListener('change', function () {
            var file = self.addFileInput.files && self.addFileInput.files[0];
            self.addFileInput.value = '';
            if (!file) return;
            var title = window.prompt('Name this song:', file.name.replace(/\.[^.]+$/, ''));
            if (!title) return;
            var artist = window.prompt('Who is it by? (optional)', '');
            dbPut('userSongs', { title: title, artist: artist || 'Added by you', audioBlob: file, audioType: file.type, duration: 180, hasFile: true }).then(function () {
              var audioUrl;
              try {
                audioUrl = URL.createObjectURL(file);
                audioUrls.push(audioUrl);
              } catch(e) { return; }
              self.songs.push({
                title: title,
                artist: artist || 'Added by you',
                cover: PLACEHOLDER_COVERS[self.songs.length % PLACEHOLDER_COVERS.length],
                src: audioUrl,
                duration: 180,
                unlockDate: '',
                autoUnlock: true,
                hasFile: true,
                userAdded: true
              });
              self.buildPlaylist();
              self.updateUI();
            }).catch(function () {
              window.alert('Could not save your song. Check connection and try again.');
            });
          });
        }
        self.addFileInput.click();
      });
    }
  };

  Jukebox.prototype.isSongUnlocked = function (index) {
    var s = this.songs[index];
    if (!s) return true;
    if (!s.unlockDate) return true;
    if (s.autoUnlock === false) return true;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var parts = s.unlockDate.split('-');
    var unlock = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return now >= unlock;
  };

  Jukebox.prototype.getLockString = function (index) {
    var s = this.songs[index];
    if (!s || !s.unlockDate || s.autoUnlock === false) return '';
    if (this.isSongUnlocked(index)) return '';
    var parts = s.unlockDate.split('-');
    var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    var now = new Date();
    var diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    if (diff <= 0) return '';
    if (diff === 1) return 'Unlocks tomorrow';
    if (diff < 30) return 'Locked ' + diff + ' days';
    return 'Locked until ' + s.unlockDate;
  };

  Jukebox.prototype.buildPlaylist = function () {
    var html = '';
    var self = this;
    for (var i = 0; i < this.songs.length; i++) {
      var s = this.songs[i];
      var isFav = this.favorites.indexOf(i) !== -1;
      var unlocked = this.isSongUnlocked(i);
      var lockStr = this.getLockString(i);
      html +=
        '<div class="playlist-item' + (unlocked ? '' : ' locked') + '" role="option" data-index="' + i + '" tabindex="0">' +
          '<div class="pl-album"><img src="' + s.cover + '" alt="" loading="lazy"></div>' +
          '<div class="pl-info">' +
            '<div class="pl-title">' + (unlocked ? s.title : s.title + ' \uD83D\uDD12') + '</div>' +
            '<div class="pl-artist">' + (unlocked ? s.artist : lockStr) + '</div>' +
          '</div>' +
          '<span class="pl-duration">' + self.formatTime(s.duration) + '</span>' +
          '<span class="pl-playing-indicator"></span>' +
          '<button class="pl-fav-btn ' + (isFav ? 'is-fav' : '') + '" data-index="' + i + '" aria-label="' + (isFav ? 'Remove from favorites' : 'Add to favorites') + '">' + (isFav ? '\u2764' : '\u2661') + '</button>' +
        '</div>';
    }
    this.playlistEl.innerHTML = html;
  };

  Jukebox.prototype.initAudio = function () {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.volume;
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (e) {}
  };

  Jukebox.prototype.createAudio = function () {
    var self = this;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }

    var s = this.songs && this.songs[this.currentIndex];
    var src = s ? s.src || '' : '';

    this.audio = new Audio(src);
    this.audio.preload = 'auto';
    this.audio.volume = 1;

    if (this.audioCtx && this.gainNode) {
      try {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
        this.sourceNode.connect(this.gainNode);
      } catch (e) {
        this.audio.volume = this.volume;
      }
    } else {
      this.audio.volume = this.volume;
    }

    this.audio.addEventListener('loadedmetadata', function () {
      self.duration = self.audio.duration || s.duration;
      self.totalTimeEl.textContent = self.formatTime(self.duration);
      self.seekBar.max = Math.floor(self.duration * 100) || 1000;
    });

    this.audio.addEventListener('timeupdate', function () {
      self.currentTime = self.audio.currentTime || 0;
      self.updateTimeDisplay();
    });

    this.audio.addEventListener('ended', function () {
      if (self.repeat === true) {
        self.audio.currentTime = 0;
        self.audio.play();
      } else {
        self.next();
      }
    });

    this.audio.addEventListener('error', function () {
      self.isPlaying = false;
      self.updateUI();
    });
  };

  Jukebox.prototype.cleanup = function () {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch(e) {}
      this.sourceNode = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.noteTimer) {
      clearInterval(this.noteTimer);
      this.noteTimer = null;
    }
  };

  Jukebox.prototype.play = function (index) {
    var self = this;

    if (index !== undefined && !this.isSongUnlocked(index)) {
      var lockStr = this.getLockString(index);
      if (this.songTitle) this.songTitle.textContent = '\uD83D\uDD12 ' + this.songs[index].title;
      if (this.artistName) this.artistName.textContent = lockStr || 'Not yet available';
      return;
    }

    if (index !== undefined && index !== this.currentIndex) {
      this.currentIndex = index;
      this.currentTime = 0;
      this.loadAndPlay();
      return;
    }

    if (index !== undefined) this.currentIndex = index;

    this.initAudio();
    if (!this.audio) { this.createAudio(); }

    if (this.audio && this.audio.paused) {
      if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
      this.audio.play().then(function () {
        self.isPlaying = true;
        self.updateUI();
        self.saveState();
        if (self.vinylDisc) self.vinylDisc.classList.add('spinning');
        if (self.eqEl) self.eqEl.classList.add('active');
        self.spawnNotes();
        self.trackPlay();
      }).catch(function () {
        self.isPlaying = false;
        self.updateUI();
      });
    }
  };

  Jukebox.prototype.trackPlay = function () {
    var s = this.songs[this.currentIndex];
    if (s && window.Track) {
      window.Track.increment('song_' + s.title);
    }
    if (s && window.Interactions) window.Interactions.record('music', 'song_played', s.title);
  };

  Jukebox.prototype.loadAndPlay = function () {
    var self = this;

    if (this.audio) { this.audio.pause(); this.audio.src = ''; this.audio = null; }
    if (this.sourceNode) { try { this.sourceNode.disconnect(); } catch(e) {} this.sourceNode = null; }
    if (this.noteTimer) { clearInterval(this.noteTimer); this.noteTimer = null; }
    if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
    if (this.eqEl) this.eqEl.classList.remove('active');

    this.isPlaying = true;
    this.createAudio();
    this.updateSongInfo();
    this.updatePlaylist();

    if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();

    if (this.currentTime > 0 && this.currentTime < (this.songs[this.currentIndex] ? this.songs[this.currentIndex].duration : 200)) {
      if (this.audio && this.audio.readyState >= 1 && isFinite(this.audio.duration)) this.audio.currentTime = this.currentTime;
    }

    if (!this.audio || !this.audio.src || this.audio.src === location.href) {
      this.isPlaying = false;
      this.updateUI();
      return;
    }

    this.audio.play().then(function () {
      self.isPlaying = true;
      self.updateUI();
      self.saveState();
      if (self.vinylDisc) self.vinylDisc.classList.add('spinning');
      if (self.eqEl) self.eqEl.classList.add('active');
      self.spawnNotes();
      self.startVisualizer();
      self.trackPlay();
    }).catch(function () {
      self.isPlaying = false;
      self.updateUI();
    });
  };

  Jukebox.prototype.pause = function () {
    if (this.audio && !this.audio.paused) this.audio.pause();
    this.isPlaying = false;
    this.currentTime = this.audio ? this.audio.currentTime : this.currentTime;
    if (this.vinylDisc) this.vinylDisc.classList.remove('spinning');
    if (this.eqEl) this.eqEl.classList.remove('active');
    if (this.noteTimer) { clearInterval(this.noteTimer); this.noteTimer = null; }
    this.saveState();
    this.updateUI();
  };

  Jukebox.prototype.togglePlay = function () {
    if (this.isPlaying) this.pause();
    else this.play();
  };

  Jukebox.prototype.next = function () {
    var self = this;
    if (self.shuffle) {
      self.shuffleIndex = (self.shuffleIndex + 1) % self.shuffleOrder.length;
      self.currentIndex = self.shuffleOrder[self.shuffleIndex];
    } else if (self.repeat === 'all') {
      self.currentIndex = (self.currentIndex + 1) % self.songs.length;
    } else {
      self.currentIndex = Math.min(self.currentIndex + 1, self.songs.length - 1);
    }
    self.currentTime = 0;
    self.loadAndPlay();
  };

  Jukebox.prototype.prev = function () {
    var self = this;

    if (this.audio && this.audio.currentTime > 3) {
      if (this.audioCtx && this.gainNode) this.gainNode.gain.value = this.volume;
      this.audio.currentTime = 0;
      this.currentTime = 0;
      this.updateTimeDisplay();
      return;
    }

    if (self.shuffle) {
      self.shuffleIndex = (self.shuffleIndex - 1 + self.shuffleOrder.length) % self.shuffleOrder.length;
      self.currentIndex = self.shuffleOrder[self.shuffleIndex];
    } else if (self.repeat === 'all') {
      self.currentIndex = (self.currentIndex - 1 + self.songs.length) % self.songs.length;
    } else {
      self.currentIndex = Math.max(self.currentIndex - 1, 0);
    }
    self.currentTime = 0;
    self.loadAndPlay();
  };

  Jukebox.prototype.cleanup = function () {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch(e) {}
      this.sourceNode = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.noteTimer) {
      clearInterval(this.noteTimer);
      this.noteTimer = null;
    }
  };

  Jukebox.prototype.toggleShuffle = function () {
    this.shuffle = !this.shuffle;
    if (this.shuffle) {
      this.shuffleOrder = [];
      for (var i = 0; i < this.songs.length; i++) {
        if (i !== this.currentIndex) this.shuffleOrder.push(i);
      }
      for (var j = this.shuffleOrder.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = this.shuffleOrder[j];
        this.shuffleOrder[j] = this.shuffleOrder[k];
        this.shuffleOrder[k] = tmp;
      }
      this.shuffleOrder.unshift(this.currentIndex);
      this.shuffleIndex = 0;
    }
    this.updateUI();
    this.saveState();
  };

  Jukebox.prototype.toggleRepeat = function () {
    if (this.repeat === false) this.repeat = true;
    else if (this.repeat === true) this.repeat = 'all';
    else this.repeat = false;
    this.updateUI();
    this.saveState();
  };

  Jukebox.prototype.toggleFavorite = function (index) {
    var idx = this.favorites.indexOf(index);
    if (idx === -1) {
      this.favorites.push(index);
    } else {
      this.favorites.splice(idx, 1);
    }
    this.saveState();
    this.buildPlaylist();
    this.highlightActivePlaylist();
    this.bindPlaylistFavEvents();
  };

  Jukebox.prototype.updateSongInfo = function () {
    var s = this.songs[this.currentIndex];
    if (!s) return;
    if (this.songTitle) this.songTitle.textContent = s.title;
    if (this.artistName) this.artistName.textContent = s.artist;
    if (this.albumCover) { this.albumCover.src = s.cover; this.albumCover.alt = s.title + ' album art'; }
    if (this.mpTitle) this.mpTitle.textContent = s.title;
    if (this.mpArtist) this.mpArtist.textContent = s.artist;
    if (this.mpAlbum) this.mpAlbum.src = s.cover;
    if (this.totalTimeEl) this.totalTimeEl.textContent = this.formatTime(s.duration);
    if (this.seekBar) this.seekBar.max = Math.floor((s.duration || 200) * 100);
  };

  Jukebox.prototype.updateUI = function () {
    if (this.isPlaying) {
      this.btn.classList.add('playing');
      var btnIcon = this.btn.querySelector('.btn-icon');
      if (btnIcon) btnIcon.textContent = '\u266B';
      this.playBtn.textContent = '\u23F8';
      this.mpPlayBtn.textContent = '\u23F8';
      this.miniPlayer.classList.add('show');
    } else {
      this.btn.classList.remove('playing');
      var btnIcon = this.btn.querySelector('.btn-icon');
      if (btnIcon) btnIcon.textContent = '\uD83C\uDFB5';
      this.playBtn.textContent = '\u25B6';
      this.mpPlayBtn.textContent = '\u25B6';
      if (!this.isOpen) this.miniPlayer.classList.remove('show');
    }

    var s = this.songs[this.currentIndex];
    if (s && !this.isPlaying && !this.audio) {
      this.songTitle.textContent = s.title;
      this.artistName.textContent = s.artist;
      this.albumCover.src = s.cover;
      this.mpTitle.textContent = s.title;
      this.mpArtist.textContent = s.artist;
      this.mpAlbum.src = s.cover;
    }

    this.shuffleBtn.classList.toggle('active', this.shuffle);
    this.repeatBtn.classList.toggle('active', this.repeat !== false);
    if (this.repeat === 'all') this.repeatBtn.textContent = '\uD83D\uDD01';
    else if (this.repeat === true) this.repeatBtn.textContent = '\uD83D\uDD02';
    else this.repeatBtn.textContent = '\uD83D\uDD01';

    this.volumeSlider.value = this.volume * 100;
    if (this.volume === 0) this.volIcon.textContent = '\uD83D\uDD07';
    else if (this.volume < 0.33) this.volIcon.textContent = '\uD83D\uDD08';
    else if (this.volume < 0.66) this.volIcon.textContent = '\uD83D\uDD09';
    else this.volIcon.textContent = '\uD83D\uDD0A';

    this.updatePlaylist();
    this.updateProgressRing();
  };

  Jukebox.prototype.updatePlaylist = function () {
    var items = this.playlistEl.querySelectorAll('.playlist-item');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var idx = parseInt(item.getAttribute('data-index'), 10);
      item.classList.toggle('active', idx === this.currentIndex);
      item.classList.toggle('playing', idx === this.currentIndex && this.isPlaying);
    }
  };

  Jukebox.prototype.highlightActivePlaylist = function () {};

  Jukebox.prototype.updateTimeDisplay = function () {
    if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(this.currentTime);
    if (this.seekBar && this.duration > 0) {
      this.seekBar.value = Math.floor((this.currentTime / this.duration) * this.seekBar.max);
    }
    this.updateProgressRing();
  };

  Jukebox.prototype.updateProgressRing = function () {
    if (!this.progressRing) return;
    var s = this.songs[this.currentIndex];
    var dur = this.duration || (s ? s.duration : 200) || 200;
    var pct = Math.min(this.currentTime / dur, 1);
    this.progressRing.setAttribute('stroke-dashoffset', 289.03 - (pct * 289.03));
  };

  Jukebox.prototype.formatTime = function (sec) {
    if (!sec || isNaN(sec)) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  };

  Jukebox.prototype.startVisualizer = function () {
    var self = this;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (!this.analyser) return;

    var bufferLength = this.analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    var bars = this.eqEl ? this.eqEl.querySelectorAll('.eq-bar') : [];

    (function draw() {
      self.animationId = requestAnimationFrame(draw);
      self.analyser.getByteFrequencyData(dataArray);
      for (var i = 0; i < bars.length && i < bufferLength; i++) {
        var val = dataArray[i] / 255;
        bars[i].style.height = (4 + val * 20) + 'px';
      }
    })();
  };

  Jukebox.prototype.spawnNotes = function () {
    var self = this;
    if (this.noteTimer) clearInterval(this.noteTimer);
    var notes = ['\u266A', '\u266B', '\u266C', '\uD83C\uDFB5', '\u266D'];

    this.noteTimer = setInterval(function () {
      if (!self.isPlaying) return;
      var btnRect = self.btn.getBoundingClientRect();
      var note = document.createElement('div');
      note.className = 'music-note';
      note.textContent = notes[Math.floor(Math.random() * notes.length)];
      note.style.left = (btnRect.left + btnRect.width / 2 + (Math.random() - 0.5) * 40) + 'px';
      note.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px';
      document.body.appendChild(note);
      setTimeout(function () { note.remove(); }, 3000);
    }, 2000);
  };

  Jukebox.prototype.open = function () {
    var self = this;
    this.isOpen = true;
    this.panel.classList.add('open');
    this.overlay.classList.add('open');
    this.miniPlayer.classList.remove('show');

    if (window.gsap) {
      var items = this.playlistEl.querySelectorAll('.playlist-item');
      gsap.fromTo(items,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out', delay: 0.15, clearProps: 'all' }
      );
    }

    this.saveState();
  };

  Jukebox.prototype.close = function () {
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.overlay.classList.remove('open');
    if (this.isPlaying) this.miniPlayer.classList.add('show');
  };

  Jukebox.prototype.togglePanel = function () {
    if (this.isOpen) this.close();
    else this.open();
  };

  Jukebox.prototype.bindEvents = function () {
    var self = this;

    this.btn.addEventListener('click', function (e) {
      e.stopPropagation();
      self.togglePanel();
    });

    this.overlay.addEventListener('click', function () { self.close(); });
    this.closeBtn.addEventListener('click', function () { self.close(); });
    this.playBtn.addEventListener('click', function () { self.togglePlay(); });
    this.mpPlayBtn.addEventListener('click', function () { self.togglePlay(); });
    this.nextBtn.addEventListener('click', function () { self.next(); });
    this.prevBtn.addEventListener('click', function () { self.prev(); });
    this.shuffleBtn.addEventListener('click', function () { self.toggleShuffle(); });
    this.repeatBtn.addEventListener('click', function () { self.toggleRepeat(); });

    this.seekBar.addEventListener('input', function () {
      if (!self.audio || !self.duration) return;
      var pct = this.value / this.max;
      var time = pct * self.duration;
      self.audio.currentTime = time;
      self.currentTime = time;
      self.updateTimeDisplay();
    });

    this.volumeSlider.addEventListener('input', function () {
      self.volume = this.value / 100;
      if (self.audio) self.audio.volume = self.volume;
      if (self.gainNode) self.gainNode.gain.value = self.volume;
      self.updateUI();
      self.saveState();
    });

    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); self.togglePlay(); break;
        case 'ArrowLeft': e.preventDefault(); self.prev(); break;
        case 'ArrowRight': e.preventDefault(); self.next(); break;
        case 'ArrowUp': e.preventDefault(); self.volume = Math.min(1, self.volume + 0.05);
          self.volumeSlider.value = self.volume * 100;
          if (self.audio) self.audio.volume = self.volume;
          if (self.gainNode) self.gainNode.gain.value = self.volume;
          self.updateUI(); self.saveState(); break;
        case 'ArrowDown': e.preventDefault(); self.volume = Math.max(0, self.volume - 0.05);
          self.volumeSlider.value = self.volume * 100;
          if (self.audio) self.audio.volume = self.volume;
          if (self.gainNode) self.gainNode.gain.value = self.volume;
          self.updateUI(); self.saveState(); break;
        case 'Escape': if (self.isOpen) self.close(); break;
      }
    });

    this.playlistEl.addEventListener('click', function (e) {
      var item = e.target.closest('.playlist-item');
      var favBtn = e.target.closest('.pl-fav-btn');
      if (favBtn || !item) return;
      var idx = parseInt(item.getAttribute('data-index'), 10);
      self.play(idx);
    });

    this.bindPlaylistFavEvents();
    this.updateSongInfo();
    this.updateUI();

    this.volumeSlider.value = this.volume * 100;
    if (this.audio) this.audio.volume = this.volume;
    if (this.gainNode) this.gainNode.gain.value = this.volume;
  };

  Jukebox.prototype.bindPlaylistFavEvents = function () {
    var self = this;
    var favBtns = this.playlistEl.querySelectorAll('.pl-fav-btn');
    for (var i = 0; i < favBtns.length; i++) {
      favBtns[i].addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-index'), 10);
        self.toggleFavorite(idx);
      });
    }
  };

  async function init() {
    var fileSongs = await loadFileSongs();
    var dbSongs = await loadSongsFromDB();
    var userSongs = await loadUserSongs();

    // Merge: file songs first, DB songs override only if they have a valid audio src
    var songs = [];
    var seen = {};
    fileSongs.forEach(function(s) { seen[s.title] = true; songs.push(s); });
    (dbSongs || []).forEach(function(s) {
      if (seen[s.title]) {
        if (!s.src) return;
        for (var si = 0; si < songs.length; si++) {
          if (songs[si].title === s.title) { songs[si] = s; break; }
        }
      } else {
        songs.push(s);
      }
    });
    // ponytail: user-added songs append at the end (never overridden by title merge)
    (userSongs || []).forEach(function(s) { songs.push(s); });

    // Check if all sections unlocked — reveal secret song
    try {
      var dbSec = await dbGet('config', 'sections');
      if (dbSec && dbSec.data && dbSec.data.length) {
        var unlocked = 0;
        var now = new Date(); now.setHours(0, 0, 0, 0);
        for (var i = 0; i < dbSec.data.length; i++) {
          var sec = dbSec.data[i];
          if (sec.unlockDate && sec.autoUnlock !== false) {
            var p = sec.unlockDate.split('-');
            var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
            if (now >= d) unlocked++;
          } else {
            unlocked++;
          }
        }
        if (unlocked >= 4) {
          var secretData = await dbGet('config', 'secretSong');
          if (secretData && secretData.song) {
            var sec = secretData.song;
            var secAudioUrl = null;
            if (sec.audioBlob) {
              try {
                secAudioUrl = URL.createObjectURL(sec.audioBlob);
                audioUrls.push(secAudioUrl);
              } catch(e) {}
            }
            songs.push({
              title: sec.title || '\u2728 Secret Song',
              artist: sec.artist || '\u2661 For You',
              cover: sec.cover || PLACEHOLDER_COVERS[0],
              src: secAudioUrl,
              duration: sec.duration || 200,
              unlockDate: '',
              autoUnlock: true,
              hasFile: true,
              secret: true
            });
          }
        }
      }
    } catch(e) {}

    if (!songs.length) {
      var empty = document.getElementById('jukeboxBtn');
      if (empty) { empty.textContent = '\u2661'; empty.title = 'No songs loaded'; empty.style.opacity = '0.3'; empty.style.cursor = 'default'; }
      return;
    }

    function create() {
      window._ashJukebox = new Jukebox(songs);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', create);
    } else {
      create();
    }

    // Load GSAP progressively
    if (typeof gsap === 'undefined') {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
      document.head.appendChild(script);
    }
  }

  window.addEventListener('beforeunload', function () {
    revokeAudioUrls();
    if (window._ashJukebox && window._ashJukebox.cleanup) {
      window._ashJukebox.cleanup();
    }
  });

  init();
})();
