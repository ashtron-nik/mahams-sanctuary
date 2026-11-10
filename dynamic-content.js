(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('dynamic-content')) return;
  var PAGE = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

  function renderDynamicContent() {
    if (typeof FB === 'undefined') return;
    FB.get('config', 'dynamicContent').then(function (data) {
      if (!data || !data.list) return;
      var items = data.list.filter(function (item) { return item.page === PAGE && item.visible !== false; });
      if (!items.length) return;
      items.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      var flow = document.querySelector('.flow');
      if (!flow) return;
      var group = document.createElement('div');
      group.className = 'accordion-group open';
      group.style.borderTop = '2px dashed rgba(255,210,150,.15)';
      group.innerHTML =
        '<div class="accordion-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<span class="group-title" style="color:#ffe680;">Extra Letters</span>' +
          '<span><span class="group-count">' + items.length + ' letters</span><span class="group-arrow">&#x25BC;</span></span>' +
        '</div>' +
        '<div class="accordion-content">' +
          items.map(function (item) {
            return '<div class="tribute">' +
              '<div class="tribute-index" style="font-size:.8rem;color:#6b5f52;">&#x2728; ' + (item.title || '') + '</div>' +
              '<div class="tribute-text" style="font-size:.95rem;line-height:1.7;">' + item.body + '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      flow.appendChild(group);
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderDynamicContent);
  else renderDynamicContent();
})();
