(function () {
  'use strict';
  var KEY = 'ash-features';
  var FB_PATH = 'config/features';

  var ALL_FEATURES = [
    { id:'balloons', label:'Balloons', cat:'Interactive', desc:'Floating balloons across pages', auto:'' },
    { id:'feathers', label:'Feathers', cat:'Interactive', desc:'Drifting feathers', auto:'' },
    { id:'coffee', label:'Coffee Break', cat:'Interactive', desc:'Coffee reminder after 20min', auto:'20 minutes after page load' },
    { id:'lucky-star', label:'Lucky Star', cat:'Interactive', desc:'Special star in sky observatory', auto:'on certain skies' },
    { id:'fragments', label:'Puzzle Fragments', cat:'Interactive', desc:'Hidden collectible fragments', auto:'' },
    { id:'firefly-jar', label:'Firefly Jar', cat:'Features', desc:'Firefly catch counter UI', auto:'after first firefly caught' },
    { id:'favorites', label:'Favorites Button', cat:'Features', desc:'Favorite/save toggle on content', auto:'after first favorite' },
    { id:'music', label:'Music Player', cat:'Features', desc:'Jukebox audio player', auto:'' },
    { id:'wish-journal', label:'Wish Journal', cat:'Features', desc:'Submitted wishes viewer', auto:'after first wish' },
    { id:'easter-egg-btn', label:'Easter Egg Button', cat:'Features', desc:'Hidden easter egg trigger', auto:'after Fantasies visited' },
    { id:'reading-progress', label:'Reading Progress Bar', cat:'Features', desc:'Bottom progress tracker', auto:'' },
    { id:'song-request', label:'Song Request', cat:'Features', desc:'Request a song form', auto:'' },
    { id:'milestone', label:'Milestone Counter', cat:'Features', desc:'Days since first entry', auto:'' },
    { id:'companion-girl', label:'Girl Companion', cat:'Visual', desc:'Animated girl character', auto:'' },
    { id:'companion-boy', label:'Boy Companion', cat:'Visual', desc:'Animated boy character', auto:'' },
    { id:'companion-dragon', label:'Dragon Companion', cat:'Visual', desc:'Flying dragon companion', auto:'' },
    { id:'butterflies', label:'Butterflies', cat:'Visual', desc:'Animated butterflies', auto:'' },
    { id:'secret-letters', label:'Secret Letters', cat:'Visual', desc:'Hidden collectible letters', auto:'' },
    { id:'constellations', label:'Constellations', cat:'Visual', desc:'Mini constellation viewer', auto:'' },
    { id:'matrix-rain', label:'Matrix Rain', cat:'Visual', desc:'Matrix/binary/heart rain effect', auto:'' },
    { id:'motion-masterpiece', label:'Motion Effects', cat:'Visual', desc:'Cinematic entrance/scroll effects', auto:'' },
    { id:'tree-of-memories', label:'Tree of Memories', cat:'Visual', desc:'Fractal growth tree', auto:'after dream + sleep visited' },
    { id:'adaptive-text', label:'Adaptive Text', cat:'Visual', desc:'Text animations', auto:'' },
    { id:'wish-system', label:'Wish System', cat:'Content', desc:'Make-a-wish & lantern release', auto:'' },
    { id:'parallax', label:'Parallax Effects', cat:'Content', desc:'Scroll-based parallax', auto:'' },
    { id:'floating-hearts', label:'Floating Hearts', cat:'Content', desc:'Heart particles on content', auto:'' },
    { id:'floating-quotes', label:'Floating Quotes', cat:'Content', desc:'Random quote popups', auto:'' },
    { id:'voice-recording', label:'Voice Recording', cat:'Content', desc:'Record & submit voice reviews', auto:'' },
    { id:'love-letter-gen', label:'Love Letter Generator', cat:'Content', desc:'Generates love letters', auto:'' },
    { id:'sky-auto-apply', label:'Sky Auto-Apply', cat:'Content', desc:'Auto-applies sky on load', auto:'' },
    { id:'world-progress', label:'World Progress Dashboard', cat:'Content', desc:'Stats page dashboard', auto:'after all 5 sections read' },
    { id:'easter-eggs', label:'Global Easter Eggs', cat:'Content', desc:'Keyboard shortcut easter eggs', auto:'' },
    { id:'hide-docs', label:'Hide Docs Link', cat:'Visual', desc:'Hide the documentation link from footer', auto:'', defaultOff: true },
    { id:'force-timeline', label:'Show Timeline', cat:'Content', desc:'Always show timeline link (bypass all-sections-read gate)', auto:'', defaultOff: true },
    { id:'admin-timeline-visibility', label:'Admin Timeline Override', cat:'Admin', desc:'Force timeline visible (admin-only override)', auto:'', defaultOff: true },
    { id:'landscape', label:'Landscape', cat:'Visual', desc:'Canvas hills/trees background', auto:'' },
    { id:'quiz', label:'Quiz', cat:'Features', desc:'Section unlock quiz buttons', auto:'' },
    { id:'activity-tracker', label:'Activity Tracker', cat:'Features', desc:'Page visit and section view tracking', auto:'' },
    { id:'events', label:'Seasonal Events', cat:'Content', desc:'Seasonal event popups and sky overrides', auto:'' },
    { id:'puzzle-hunt', label:'Puzzle Hunt', cat:'Interactive', desc:'Treasure hunt overlay with progress', auto:'' },
    { id:'letters', label:'Letters', cat:'Features', desc:'Write a letter modal and Firebase storage', auto:'' },
    { id:'dynamic-content', label:'Dynamic Content', cat:'Content', desc:'Extra Firebase-managed content appended to pages', auto:'' },
    { id:'skies', label:'Sky Engine', cat:'Visual', desc:'Atmospheric canvas sky rendering', auto:'' },
    { id:'sky-living', label:'Sky Living', cat:'Visual', desc:'Interactive sky layer (moon, stars, birds, dragons)', auto:'' },
    { id:'track', label:'Track', cat:'Features', desc:'IndexedDB play counter for jukebox', auto:'' },
    { id:'section-unlock', label:'Section Unlock Requests', cat:'Features', desc:'Daily section unlock request buttons and Firebase listener', auto:'' },
    { id:'section-lock', label:'Section Lock (Date Gate)', cat:'Features', desc:'Page-level date-lock that hides content until unlock date', auto:'' },
    { id:'wallpaper', label:'Wallpaper Download', cat:'Features', desc:'Download a quote from a random tribute as wallpaper', auto:'' },
    { id:'interactions', label:'Interactions Log', cat:'Features', desc:'Records clicks & catches (balloons, favorites, downloads...) to the interactions store', auto:'' },
  ];

  function load() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch(e) {}
    if (!raw || typeof raw !== 'object') raw = {};
    return raw;
  }

  var flags = load();

  var USE_FB = typeof FB !== 'undefined' && typeof FB.on === 'function';

  var _queue = [];

  if (USE_FB) {
    FB.on('config', 'features', function (val) {
      if (val && typeof val === 'object') {
        for (var k in val) flags[k] = val[k];
        try { localStorage.setItem(KEY, JSON.stringify(flags)); } catch(e) {}
      }
      _queue.forEach(function(fn) { fn(); });
      _queue = [];
    });
  } else {
    setTimeout(function() { _queue.forEach(function(fn) { fn(); }); _queue = []; }, 0);
  }

  window.FeatureFlags = {
    onReady: function(fn) { _queue.push(fn); },
    getAll: function () { return JSON.parse(JSON.stringify(flags)); },
    get: function (id) {
      if (flags[id] !== undefined) return flags[id];
      for (var i = 0; i < ALL_FEATURES.length; i++) {
        if (ALL_FEATURES[i].id === id && ALL_FEATURES[i].defaultOff) return false;
      }
      return true;
    },
    set: function (id, val) {
      flags[id] = !!val;
      try { localStorage.setItem(KEY, JSON.stringify(flags)); } catch(e) {}
      this.save();
    },
    toggle: function (id) { this.set(id, !this.get(id)); return this.get(id); },
    list: function () { return ALL_FEATURES; },
    reset: function () {
      flags = {};
      for (var i = 0; i < ALL_FEATURES.length; i++) flags[ALL_FEATURES[i].id] = true;
      try { localStorage.setItem(KEY, JSON.stringify(flags)); } catch(e) {}
    },
    save: function () {
      if (USE_FB) { FB.set(FB_PATH, JSON.parse(JSON.stringify(flags))).catch(function () {}); }
    },
    getAutoInfo: function (id) {
      for (var i = 0; i < ALL_FEATURES.length; i++) {
        if (ALL_FEATURES[i].id === id) return ALL_FEATURES[i].auto;
      }
      return '';
    },
    getLabel: function (id) {
      for (var i = 0; i < ALL_FEATURES.length; i++) {
        if (ALL_FEATURES[i].id === id) return ALL_FEATURES[i].label;
      }
      return id;
    },
    getCategory: function (id) {
      for (var i = 0; i < ALL_FEATURES.length; i++) {
        if (ALL_FEATURES[i].id === id) return ALL_FEATURES[i].cat;
      }
      return '';
    },
    getDesc: function (id) {
      for (var i = 0; i < ALL_FEATURES.length; i++) {
        if (ALL_FEATURES[i].id === id) return ALL_FEATURES[i].desc;
      }
      return '';
    }
  };
})();
