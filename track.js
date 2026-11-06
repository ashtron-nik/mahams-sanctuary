(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('track')) return;
  var DB = 'ash-jukebox-db';

  function openDB() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB);
      r.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('counters')) db.createObjectStore('counters', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('config')) db.createObjectStore('config', { keyPath: 'key' });
      };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { resolve(null); };
    });
  }

  function getCounter(key) {
    return openDB().then(function (db) {
      if (!db) return 0;
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('counters', 'readonly');
        var store = tx.objectStore('counters');
        var g = store.get(key);
        g.onsuccess = function () {
          db.close();
          resolve(g.result ? g.result.count : 0);
        };
        g.onerror = function () { db.close(); resolve(0); };
      });
    });
  }

  function incrementCounter(key) {
    return openDB().then(function (db) {
      if (!db) return 0;
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('counters', 'readwrite');
        var store = tx.objectStore('counters');
        var g = store.get(key);
        g.onsuccess = function () {
          var count = (g.result ? g.result.count : 0) + 1;
          store.put({ key: key, count: count });
          tx.oncomplete = function () { db.close(); resolve(count); };
        };
        g.onerror = function () { db.close(); resolve(0); };
      });
    });
  }

  function getAllCounters() {
    return openDB().then(function (db) {
      if (!db) return [];
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('counters', 'readonly');
        var store = tx.objectStore('counters');
        var g = store.getAll();
        g.onsuccess = function () { db.close(); resolve(g.result || []); };
        g.onerror = function () { db.close(); resolve([]); };
      });
    });
  }

  function resetAll() {
    return openDB().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('counters', 'readwrite');
        var store = tx.objectStore('counters');
        var g = store.clear();
        g.onsuccess = function () { db.close(); resolve(); };
        g.onerror = function () { db.close(); resolve(); };
      });
    });
  }

  window.Track = {
    increment: incrementCounter,
    get: getCounter,
    getAll: getAllCounters,
    resetAll: resetAll
  };

  var page = window.location.pathname.split('/').pop() || 'index.html';
  incrementCounter('visit_' + page);

  // ponytail: record visit days (YYYY-MM-DD set) for streak/year-in-review stats
  var DAYS_KEY = 'ash-visit-days';
  try {
    var days = JSON.parse(localStorage.getItem(DAYS_KEY)) || [];
    var td = new Date();
    var tKey = td.getFullYear() + '-' + String(td.getMonth() + 1).padStart(2, '0') + '-' + String(td.getDate()).padStart(2, '0');
    if (days.indexOf(tKey) === -1) {
      days.push(tKey);
      localStorage.setItem(DAYS_KEY, JSON.stringify(days));
    }
  } catch (e) {}
})();
