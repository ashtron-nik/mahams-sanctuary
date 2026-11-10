(function () {
  'use strict';

  var API_KEY = 'AIzaSyD30nS8GMLHvj1EunF141FAPAU4w9uVdBI';
  var DB = 'https://faxy-ash-default-rtdb.firebaseio.com';
  var SESSION_KEY = 'ash-bday-visit-sent';
  var OPTOUT_KEY = 'ash-bday-no-track';

  try {
    var owner = new URLSearchParams(location.search).get('owner');
    if (owner === '1') { localStorage.setItem(OPTOUT_KEY, '1'); return; }
    if (owner === '0') { localStorage.removeItem(OPTOUT_KEY); }
    if (localStorage.getItem(OPTOUT_KEY) === '1') return;
    if (localStorage.getItem('db-admin-auth') === '1') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
  } catch (e) { return; }

  var payload = JSON.stringify({
    type: 'birthday-visit',
    timestamp: Date.now(),
    date: new Date().toISOString(),
    referrer: document.referrer || '',
    screen: window.screen ? window.screen.width + 'x' + window.screen.height : '',
    ua: navigator.userAgent,
    page: location.pathname
  });

  fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"returnSecureToken":true}',
    keepalive: true
  }).then(function (res) {
    return res.json();
  }).then(function (auth) {
    if (!auth || !auth.idToken) return;
    return fetch(DB + '/activity/birthday.json?auth=' + encodeURIComponent(auth.idToken), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    });
  }).then(function () {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }).catch(function () {});
})();
