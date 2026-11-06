/* ---- Firebase Realtime Database Helper ---- */
/* Requires: firebase-app-compat.js + firebase-database-compat.js */

function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.list) return Array.isArray(data.list) ? data.list : toArray(data.list);
  var keys = Object.keys(data).filter(function (k) { return k !== 'id' && k !== 'key'; });
  if (keys.length && keys.every(function (k) { return String(parseInt(k, 10)) === k; })) {
    return keys.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).map(function (k) { return data[k]; });
  }
  return [];
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

var FB = (function () {
  var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // --- localStorage-backed store for local testing ---
  var STORAGE_KEY = 'ash-fb-store';

  function memLoad() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function memSave(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function memId() {
    try { var n = parseInt(localStorage.getItem('ash-fb-seq') || '0', 10); localStorage.setItem('ash-fb-seq', n + 1); return n; } catch (e) { return 0; }
  }

  function memGetAll(store) {
    var all = memLoad();
    var arr = (all[store] || []).map(function (x) { return JSON.parse(JSON.stringify(x)); });
    arr.forEach(function (item) { decodeBlobs(item); });
    return Promise.resolve(arr);
  }
  function memGet(store, key) {
    var all = memLoad();
    var items = all[store] || [];
    for (var i = 0; i < items.length; i++) {
      if ((items[i].id || items[i].key) === key) {
        var item = JSON.parse(JSON.stringify(items[i]));
        decodeBlobs(item);
        return Promise.resolve(item);
      }
    }
    return Promise.resolve(null);
  }
  function memPut(store, data) {
    var copy = {}, blobField = null, blobName = '';
    for (var k in data) {
      if (data[k] instanceof Blob) {
        blobField = k;
        blobName = k.replace('Blob', '');
        continue;
      }
      copy[k] = data[k];
    }
    var persist = function (c) {
      var all = memLoad();
      if (!all[store]) all[store] = [];
      var items = all[store];
      var key = c && (c.id || c.key);
      if (key) {
        for (var i = 0; i < items.length; i++) {
          if ((items[i].id || items[i].key) === key) {
            items[i] = c;
            memSave(all);
            return Promise.resolve({ key: key });
          }
        }
        items.push(c);
        memSave(all);
        return Promise.resolve({ key: key });
      }
      c.id = 'local_' + memId();
      items.push(c);
      memSave(all);
      return Promise.resolve({ key: c.id });
    };
    if (blobField) {
      return blobToBase64(data[blobField]).then(function (b64) {
        copy['_' + blobName + 'Base64'] = b64;
        copy['_' + blobName + 'Type'] = data[blobField].type;
        return persist(copy);
      });
    }
    return persist(copy);
  }
  function memDelete(store, key) {
    var all = memLoad();
    if (!all[store]) return Promise.resolve();
    all[store] = all[store].filter(function (x) { return (x.id || x.key) !== key; });
    memSave(all);
    return Promise.resolve();
  }
  function memClear(store) {
    var all = memLoad();
    all[store] = [];
    memSave(all);
    return Promise.resolve();
  }

  // 🔥 FILL IN YOUR FIREBASE CONFIG HERE (Firebase Console → Project Settings → General → Your apps → Web)
  var firebaseConfig = {
    apiKey: 'AIzaSyD30nS8GMLHvj1EunF141FAPAU4w9uVdBI',
    authDomain: '-ash.firebaseapp.com',
    databaseURL: 'https://-ash-default-rtdb.firebaseio.com',
    projectId: '-ash',
    storageBucket: '-ash.firebasestorage.app',
    messagingSenderId: '920825271894',
    appId: '1:920825271894:web:f69a3d44dc350abe1f4df7',
    measurementId: 'G-RR3WJ8KK1L'
  };

  // Initialize the app up-front so firebase.auth() works even where the DB is mocked (localhost).
  try { if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function' && !firebase.apps.length) firebase.initializeApp(firebaseConfig); } catch (e) {}

  if (isLocal) {
    return {
      init: function () {},
      getAll: memGetAll,
      get: memGet,
      put: memPut,
      delete: memDelete,
      clear: memClear,
      blobToBase64: blobToBase64,
      base64ToBlob: base64ToBlob
    };
  }

  var db, initialized = false;

  function init() {
    if (initialized) return;
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded. Add script tags.');
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    initialized = true;
    // Anonymous sign-in so DB rules can distinguish site users from strangers.
    try { if (typeof firebase.auth === 'function' && !firebase.auth().currentUser) firebase.auth().signInAnonymously().catch(function () {}); } catch (e) {}
  }

  var ROOT = 'dreambox';
  function ref(store) { init(); return db.ref(ROOT + '/' + store); }

  function fbGetAll(store) {
    return ref(store).once('value').then(function (snap) {
      var val = snap.val();
      if (!val) return [];
      var keys = Object.keys(val);
      var arr = [];
      for (var i = 0; i < keys.length; i++) {
        var item = val[keys[i]];
        if (typeof item === 'object' && item !== null) {
          item.id = keys[i];
          decodeBlobs(item);
          arr.push(item);
        }
      }
      return arr;
    });
  }

  function fbGet(store, key) {
    return ref(store).child(key).once('value').then(function (snap) {
      var val = snap.val();
      if (!val) return null;
      val.id = key;
      decodeBlobs(val);
      return val;
    });
  }

  function fbPut(store, data) {
    var itemKey = data && (data.id || data.key);
    var copy = {}, blobField = null, blobName = '';
    for (var k in data) {
      if (k === 'id' || k === 'key') continue;
      if (data[k] instanceof Blob) {
        blobField = k;
        blobName = k.replace('Blob', '');
        continue;
      }
      copy[k] = data[k];
    }
    if (blobField) {
      var blob = data[blobField];
      return blobToBase64(blob).then(function (b64) {
        copy['_' + blobName + 'Base64'] = b64;
        copy['_' + blobName + 'Type'] = blob.type;
        return doPut(store, copy, itemKey);
      });
    }
    return doPut(store, copy, itemKey);
  }

  function doPut(store, data, key) {
    if (key) {
      return ref(store).child(key).set(data).then(function () { return { key: key }; });
    }
    var newRef = ref(store).push();
    return newRef.set(data).then(function () { return { key: newRef.key }; });
  }

  function fbDelete(store, key) {
    return ref(store).child(key).remove();
  }

  function fbClear(store) {
    return ref(store).set(null);
  }

  function fbSet(store, data) {
    return ref(store).set(data);
  }

  function fbOn(store, key, cb) {
    init();
    var r = db.ref(store).child(key);
    r.on('value', function (snap) { cb(snap.val()); });
    return function () { r.off('value'); };
  }

  function decodeBlobs(item) {
    for (var k in item) {
      if (k.indexOf('_Base64') >= 0) {
        var prefix = k.slice(0, -7);
        var fieldName = prefix.replace(/^_/, '');
        var typeKey = prefix + 'Type';
        try {
          item[fieldName + 'Blob'] = base64ToBlob(item[k], item[typeKey]);
        } catch(e) { /* ponytail: blob decode failure non-fatal */ }
        delete item[k];
        if (item[typeKey]) delete item[typeKey];
      }
    }
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result;
        var base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(b64, type) {
    var byteChars = atob(b64);
    var byteArr = new Uint8Array(byteChars.length);
    for (var i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    return new Blob([byteArr], { type: type || 'audio/webm' });
  }

  return {
    init: init,
    getAll: fbGetAll,
    get: fbGet,
    put: fbPut,
    delete: fbDelete,
    clear: fbClear,
    set: fbSet,
    on: fbOn,
    blobToBase64: blobToBase64,
    base64ToBlob: base64ToBlob,
    toArray: toArray,
    esc: esc
  };
})();

/* ---- User data sync (localStorage ↔ Firebase) ---- */
(function() {
  var KEYS = [
    'ash-firefly-count', 'ash-butterflies', 'ash-lanterns-released',
    'ash-wish-journal', 'ash-sky-visited', 'ash-sky-journal',
    'ash-sky-eggs', 'ash-favorites', 'ash-tree-of-memories',
    'ash-secret-letters', 'ash-obs', 'ash-gallery', 'ash-user-gallery',
    'ash-user-parallax', 'ash-dream', 'ash-section-viewed',
    'ash-sky-current-constellation', 'ash-theme', 'ash-streak',
    'ash-first-visit', 'ash-section-access', 'ash-events-seen',
    'ash-viewed-dream', 'ash-viewed-make_her_sleep', 'ash-dragon-met',
    'ash-firefly-jar', 'ash-jukebox', 'ash-jukebox-sky',
    'ash-constellations', 'ash-sky-const-collection',
    'ash-obs-favs', 'ash-obs-recent', 'ash-obs-moon', 'ash-obs-star',
    'ash-obs-radio', 'ash-puzzle-progress', 'ash-tracked-events',
    'musicState'
  ];

  try { if (localStorage.getItem('ash-admin-passkey')) return; } catch(e) { return; }

  var lastSnapshot = '';

  function loadFromFirebase() {
    if (typeof FB === 'undefined' || !FB.get) return;
    FB.get('userData', 'snapshot').then(function(data) {
      if (!data || !data.data) return;
      for (var i = 0; i < KEYS.length; i++) {
        var key = KEYS[i];
        try {
          if (data.data[key] !== undefined && localStorage.getItem(key) === null) {
            localStorage.setItem(key, data.data[key]);
          }
        } catch(e) {}
      }
    }).catch(function() {});
  }

  function saveToFirebase() {
    if (typeof FB === 'undefined' || !FB.put) return;
    var data = {};
    for (var i = 0; i < KEYS.length; i++) {
      var key = KEYS[i];
      try {
        var val = localStorage.getItem(key);
        if (val !== null) data[key] = val;
      } catch(e) {}
    }
    var snapshot = JSON.stringify(data);
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    FB.put('userData', { id: 'snapshot', data: data }).catch(function() {});
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadFromFirebase, 500);
  } else {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(loadFromFirebase, 500); });
  }

  setInterval(saveToFirebase, 30000);
  window.addEventListener('beforeunload', saveToFirebase);
})();
