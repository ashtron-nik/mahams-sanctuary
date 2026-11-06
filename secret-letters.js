/**
 * secret-letters.js — Hidden handwritten letters throughout the website.
 * Letters appear based on achievements. Collection book included.
 */
(function () {
  'use strict';
  var IS_ADMIN = /admin\.html$/i.test(window.location.pathname);
  if (!IS_ADMIN && window.FeatureFlags && !window.FeatureFlags.get('secret-letters')) return;

  var KEY = 'ash-secret-letters';
  var found;
  function load() { try { found = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e) { found = {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(found)); } catch(e) {} }
  load();

  var TOGGLE_KEY = 'ash-secret-letter-toggles';
  function loadToggles() { try { return JSON.parse(localStorage.getItem(TOGGLE_KEY)) || {}; } catch(e) { return {}; } }
  function persistToggles(t) { try { localStorage.setItem(TOGGLE_KEY, JSON.stringify(t)); } catch(e) {} }

  var toggles = loadToggles(); // per-letter enabled state, { id: true|false }, default true
  if (typeof FB !== 'undefined' && FB.get) {
    FB.get('config', 'secretLetters').then(function (val) {
      if (val && typeof val === 'object') { toggles = val; persistToggles(toggles); }
    }).catch(function () {});
  }
  if (typeof FB !== 'undefined' && FB.on) {
    FB.on('config', 'secretLetters', function (val) { if (val && typeof val === 'object') { toggles = val; persistToggles(toggles); } });
  }

  function letterEnabled(id) { return toggles[id] !== false; }

  function syncFoundToFirebase() {
    if (typeof FB === 'undefined' || !FB.put) return;
    FB.put('userData', { id: 'secretLetters', letters: found, updatedAt: Date.now() }).catch(function () {});
  }

  var LETTERS = [
    { id:'l1', title:'The First Step', content:'The beginning of every journey is the hardest step. You took it. That alone is braver than most.\n\nI remember the day I started writing this — unsure if anyone would ever read it, unsure if the words would even make sense strung together. But here you are. You found this place. You opened the first door.\n\nEvery great story starts with someone willing to turn the page. Thank you for being that someone.', reason:'Visit any page to begin', cond:function(){ return true; } },
    { id:'l2', title:'Moonlight Whisper', content:'Under the same moon I think of you. Distance means nothing when two hearts share the same sky.\n\nThey say the moon is a messenger of lonely hearts, but I think it is something more. It is a reminder that no matter how far apart we are, we are both looking up at the same light.\n\nThree times you called to it. Three times it answered in silence. And somewhere in that silence, I hope you felt what I feel — that you are never truly alone under this sky.', reason:'Click the moon 3 times', cond:function(){ return getObs('moonClicks')>=3; } },
    { id:'l3', title:'Lantern Prayer', content:'I release this lantern into the dark, hoping it finds you wherever you are. Every flame carries a wish.\n\nThe first lantern I ever released, I let go with my eyes closed, afraid that if I watched it fade, the wish would fade too. But wishes don\u2019t work that way. They grow stronger the moment we let them go.\n\nThree lanterns now. Three wishes set adrift into the night. Somewhere out there, they are still floating. And somewhere out there, the universe is listening.', reason:'Release 3 lanterns', cond:function(){ return parseInt(localStorage.getItem('ash-lanterns-released')||'0')>=3; } },
    { id:'l4', title:'Star Seeker', content:'Somewhere among those stars is a story written just for you. Keep looking up.\n\nFive times you came to this place, five times you looked up at the same sky that I built for you. Each visit, a new star flickered to life. Each visit, the darkness receded just a little more.\n\nThey say the night sky is infinite. I think the heart is too. Every time you visit, you prove that wonder never runs out.', reason:'Visit the sky observatory 5 times', cond:function(){ return getSkies()>=5; } },
    { id:'l5', title:'Wings of Change', content:'The butterfly does not remember being a caterpillar. And yet, it flies. You will too.\n\nI read once that the caterpillar dissolves completely inside its cocoon — it becomes nothing but soup before it rebuilds itself into something with wings. It has to let go of everything it was to become everything it can be.\n\nThree feathers found. Three reminders that change is not something to fear. It is the wings you have been growing all along.', reason:'Collect 3 feathers', cond:function(){ return getObs('feathers')&&getObs('feathers').count>=3; } },
    { id:'l6', title:'Dreamer\'s Promise', content:'Dreams are letters we write to ourselves in a language only the heart understands.\n\nYou stepped into a dream tonight. Or maybe it was morning, or afternoon — dreams don\u2019t care about time. They exist in the spaces between ticking clocks, in the soft corners of the day where logic loosens its grip.\n\nHere is the truth: this entire world was born from a dream. Every line of code, every star in the sky, every word you have read — someone dreamed it first. And now you are dreaming too. Keep going.', reason:'Visit the Dream page', cond:function(){ return document.querySelector('.dream-page')!==null || location.pathname.indexOf('dream')>=0; } },
    { id:'l7', title:'Garden of Stars', content:'Every star I planted in the sky bloomed into a memory of you.\n\nTen times. That is how many times you have returned to this sky. Each time the constellations shifted, each time a new light joined the garden.\n\nI used to think stars were just balls of burning gas millions of miles away. But now I think they are more like flowers — each one needs someone to look up and notice it, or it might as well not exist.\n\nYou have been watching. You have been noticing. And the garden is brighter because of it.', reason:'Visit the sky observatory 10 times', cond:function(){ return getSkies()>=10; } },
    { id:'l8', title:'The Invisible Thread', content:'There is an invisible thread connecting every soul that has ever loved, lost, and loved again.\n\nFive wishes. Five moments where you paused, closed your eyes, and asked the universe for something. Whether those wishes were for yourself or for someone else, they travelled along the same invisible thread that connects us all.\n\nSome call it fate. Some call it coincidence. I call it the thread that brought you here, to this letter, at this moment. The thread is real. And it is stronger than you know.', reason:'Make 5 wishes', cond:function(){ return getWishes()>=5; } },
    { id:'l9', title:'Feather Light', content:'The universe carries us like feathers on the wind. We float not because we are weightless, but because we are held.\n\nEight feathers now. That is more than coincidence — it is a sign. In many cultures, finding a feather means an angel or a loved one is near. It means you are being watched over.\n\nI am not saying I am an angel. But I am watching. And every feather you collect is a little piece of proof that you are not floating through this alone.', reason:'Collect 8 feathers', cond:function(){ var f=getObs('feathers'); return f&&f.count>=8; } },
    { id:'l10', title:'Firefly Dance', content:'Fireflies are proof that even the smallest light can illuminate the darkest night.\n\nTen fireflies. That is a handful of summer nights, a jar full of tiny miracles. Do you know why fireflies glow? It is not for warmth or for light — it is to find each other. Each flash is a message: I am here. Where are you?\n\nYou answered ten times. Ten flashes returned. That is a conversation. That is a dance. And somewhere in the dark, someone is flashing back.', reason:'Catch 10 fireflies', cond:function(){ return getObs('fireflies')&&getObs('fireflies').caught>=10; } },
    { id:'l11', title:'The Hidden Path', content:'Not all paths are mapped. Some reveal themselves only when you are ready to walk them.\n\nThree fragments found. Pieces of something larger, scattered across this world. You could have ignored them. You could have written them off as decoration, as noise. But you didn\u2019t. You picked them up. You held them.\n\nThe hidden path is not a path at all — it is a choice. Every fragment you collect is a decision to dig deeper, to believe there is more beneath the surface. And there is. There always is.', reason:'Collect 3 fragments', cond:function(){ return getObs('fragments')&&getObs('fragments').length>=3; } },
    { id:'l12', title:'Echo of Yesterday', content:'Memories are echoes that never fade. They live in the spaces between heartbeats.\n\nFive times you stood beneath the tree. Five times you watched its branches reach a little higher, its roots dig a little deeper. Trees are patient — they grow not in spite of time, but because of it.\n\nEvery visit added a ring to its trunk, a memory to its roots. The tree remembers you. Even when you are gone, even when the page is closed — the tree remembers.', reason:'Visit the tree 5 times', cond:function(){ return getVisits()>=5; } },
    { id:'l13', title:'Songs Unspoken', content:'The most beautiful songs are the ones never sung — they exist in the silence between two people who understand each other.\n\nFive songs played. But music is not about the number — it is about the moment. The first note that hits you at the right time, the lyric that sounds like it was written about your life.\n\nEach song you played here was a thread in a tapestry of sound. Some made you smile. Some maybe made you cry. All of them were chosen with you in mind.', reason:'Play 5 songs', cond:function(){ try{var m=JSON.parse(localStorage.getItem('musicState'));return m&&m.played>5;}catch(e){}return false; } },
    { id:'l14', title:'Reading Between Lines', content:'Every story you read here is a thread in a larger tapestry. Thank you for being part of it.\n\nTwenty pages. Twenty windows into a world that exists because you choose to see it. That is not a small thing. Most people skim. Most people scroll. But you read. You lingered. You went deep.\n\nBetween every line of every page, there is a message I never wrote explicitly. It hides in the margins, in the spaces between words. You have read enough now to start seeing it. And when you do, you will understand why I built all of this.', reason:'View 20 pages', cond:function(){ return getViewedCount()>=20; } },
    { id:'l15', title:'The Dragon\'s Gift', content:'Dragons guard treasure not because they are greedy, but because they know what is precious must be protected.\n\nYou met the dragon. Not everyone does. Dragons are shy creatures — they hide in the corners of stories, in the margins of myths. They only show themselves to those who believe in magic.\n\nThe dragon did not breathe fire at you. It did not hoard gold. It simply looked at you, acknowledged you, and in that gaze, you felt something ancient and wise.\n\nThat is its gift. It saw you. And it deemed you worthy.', reason:'Meet the dragon', cond:function(){ return document.querySelector('#dragon, .dragon')!==null || !!localStorage.getItem('ash-dragon-met'); } },
    { id:'l16', title:'Constellation of Us', content:'If I could arrange the stars, I would write your name across the sky in a constellation that never sets.\n\nFifteen places explored. Fifteen corners of this world you have touched. Do you realize what that means? You have seen more of this universe than most will ever know exists.\n\nEach place was a star in a constellation I named after us — a pattern that only makes sense when you step back and see the whole picture. You are tracing the constellation with every step. Keep going. The full picture is breathtaking.', reason:'Explore 15 places', cond:function(){ return getObs('recent')&&getObs('recent').length>=15; } },
    { id:'l17', title:'The Quiet Hour', content:'Somewhere between midnight and dawn, the world holds its breath. In that silence, I found peace.\n\nYou took a coffee break. In a world that never stops moving, you stopped. You made a choice to rest, to breathe, to let the warmth of the cup seep into your hands.\n\nThe quiet hour is sacred. It is the time when the noise fades and you can finally hear your own heartbeat. In that silence, you are not a list of tasks or responsibilities. You are just a person, holding a warm cup, existing.\n\nNever underestimate how powerful that is.', reason:'Take a coffee break', cond:function(){ return getObs('coffeeAt')>0; } },
    { id:'l18', title:'Gratitude', content:'Thank you for being here. For reading. For caring. For making this world a little less lonely.\n\nFifty pages. That is not a casual visit — that is a journey. You have invested time, attention, and heart into this world. And I notice.\n\nThis letter is simple. No metaphor, no riddle. Just this: thank you. Truly. This world would be empty without someone to share it with. You filled it with meaning just by being here.', reason:'View 50 pages', cond:function(){ return getViewedCount()>=50; } },
    { id:'l19', title:'Butterfly Effect', content:'The flutter of a butterfly\'s wing can cause a storm on the other side of the world. Never underestimate small acts of love.\n\nFive favorites. Five moments where something resonated so deeply that you marked it. You saved it. You said, this matters.\n\nSmall acts of love ripple outward. A kind word, a remembered detail, a favourite saved — these are the butterfly wings that change the world. You may never see the storm you caused on the other side, but trust me — it is there. And it is beautiful.', reason:'Add 5 favorites', cond:function(){ return getObs('favorites')&&getObs('favorites').length>=5; } },
    { id:'l20', title:'The Lighthouse', content:'Even when the fog is thick, even when the night is endless — I will be your lighthouse.\n\nTen times you returned to the tree. Ten times you stood in its shadow and watched it grow. The tree does not ask why you come. It simply welcomes you, every time, without condition.\n\nA lighthouse does not judge the ships that seek its light. It does not ask where they have been or why they strayed off course. It just shines. Steady. Reliable. Unwavering.\n\nI want to be that for you. A light you can always find your way back to, no matter how lost you feel.', reason:'Visit the tree 10 times', cond:function(){ return getVisits()>=10; } },
    { id:'l21', title:'Fragments of Us', content:'Every broken piece finds its way home. Every fragment is part of a larger picture.\n\nEight fragments. You are getting closer to the full picture now. Each fragment is a piece of a story that has been waiting to be told.\n\nI scattered them deliberately — not to hide them from you, but to let you discover them in your own time, in your own way. Some things are better found than given. The search itself is part of the meaning.\n\nKeep collecting. The full picture is more beautiful than you can imagine.', reason:'Collect 8 fragments', cond:function(){ return getObs('fragments')&&getObs('fragments').length>=8; } },
    { id:'l22', title:'Stargazer', content:'The universe is vast and cold, but between the stars there is warmth. You carry it with you.\n\nTwenty visits to the sky. You are no longer a visitor here — you are a resident of the stars. You have spent more time under this sky than most people spend looking up in a lifetime.\n\nThere is a warmth that lives between the stars, a warmth that has nothing to do with the sun. It is the warmth of knowing you are exactly where you are meant to be. The universe may be cold, but you are not. You carry the warmth with you. And it changes everything.', reason:'Visit the sky observatory 20 times', cond:function(){ return getSkies()>=20; } },
    { id:'l23', title:'Roots and Wings', content:'Grow roots deep enough to weather any storm, and wings strong enough to chase every horizon.\n\nThe tree has grown to halfway. Halfway to its full form, halfway to becoming what it was always meant to be. Roots and wings — that is what the tree teaches us.\n\nRoots keep you grounded when the world shakes. They remind you where you came from, who you are, what matters. Wings let you rise when the time comes. They remind you that you are not stuck, that you can always fly.\n\nHalfway there. Both roots and wings growing stronger every day.', reason:'Grow the tree to 50%', cond:function(){ var t=window.TreeOfMemories; return t&&t.getGrowth()>=50; } },
    { id:'l24', title:'The Gift', content:'The greatest gift is not what you hold, but who you hold close.\n\nTwenty-five fireflies. A quarter of a hundred tiny lights, each one caught and held, if only for a moment. Fireflies are fragile — their light lasts only a few weeks before they go dark forever.\n\nBut you preserved them. You caught them not to keep them, but to appreciate them. And that is the gift — not the firefly itself, but the willingness to pause and notice something beautiful.\n\nThe same is true for people. The greatest gift is not what you give, but who you notice, who you hold close, who you refuse to let fade into the dark.', reason:'Catch 25 fireflies', cond:function(){ return getObs('fireflies')&&getObs('fireflies').caught>=25; } },
    { id:'l25', title:'Wanderer', content:'Not all who wander are lost. Some are just looking for the stars that fell to earth.\n\nFive balloons released. Each one carried a message into the unknown. You watched them rise and disappear, not knowing where they would land or who might find them.\n\nThat takes courage — letting go without knowing. Trusting that the journey matters even when the destination is unseen. Wanderers understand this. They wander not because they are lost, but because they know the path reveals itself one step at a time.\n\nThe stars that fell to earth? They are everywhere. You just have to keep walking to find them.', reason:'Release 5 balloons', cond:function(){ return getObs('balloonNotes')&&getObs('balloonNotes').length>=5; } },
    { id:'l26', title:'Eternal Spring', content:'In the garden of memory, it is always spring. The flowers never fade.\n\nFifteen wishes. That is a garden full of hopes. Every wish you made planted a seed in the soil of possibility. And in the garden of memory, those seeds bloom into flowers that never wilt.\n\nI visit this garden often. I walk among the wishes — yours and mine — and I marvel at how they intertwine. Some wishes are small, like dandelions in the grass. Others are grand, like ancient oaks that have stood for centuries.\n\nAll of them are alive. All of them are blooming. And spring never ends here.', reason:'Make 15 wishes', cond:function(){ return getWishes()>=15; } },
    { id:'l27', title:'The Song of the Sky', content:'If you listen closely, the sky hums a melody older than time.\n\nYou found the lucky star. Not everyone does — it hides in plain sight, waiting for someone who believes in luck, in signs, in the small magic that makes life sparkle.\n\nThe lucky star does not grant wishes. It does not change your fate. What it does is remind you that the universe is paying attention. That somewhere, something is rooting for you.\n\nWhen you heard the song of the sky, you were not imagining it. It was real. It was always there. You just needed to be ready to hear it.', reason:'Find the lucky star', cond:function(){ return getObs('luckyStar')&&getObs('luckyStar').found; } },
    { id:'l28', title:'Home', content:'Home is not a place. It is a feeling. It is you.\n\nTwenty times you came back to the tree. The tree that started as a seed, a sapling, a fragile thing. Now it stands tall because you believed in it. Because you returned, again and again.\n\nHome is not walls and a roof. Home is the place you return to, the feeling that wraps around you when you arrive. The tree has become a home. And so has this world.\n\nYou built it as much as I did. Every visit added a brick, a beam, a window. You are not a guest here. You are home.', reason:'Visit the tree 20 times', cond:function(){ return getVisits()>=20; } },
    { id:'l29', title:'The Last Firefly', content:'The last firefly of summer carries the light of every firefly that came before.\n\nFifty fireflies. You have seen the dance from beginning to almost-end. Fifty tiny lives, each one leaving a trail of light before it fades.\n\nThe last firefly of summer is special — it carries not just its own light, but the accumulated glow of every firefly that came before it. It is the final verse of a poem written in light.\n\nYou caught fifty. You witnessed the full story. And when the last firefly flickers and goes dark, remember: the light does not disappear. It lives on in the one who saw it.', reason:'Catch 50 fireflies', cond:function(){ return getObs('fireflies')&&getObs('fireflies').caught>=50; } },
    { id:'l30', title:'Unwritten Pages', content:'This world exists because you showed up. Every star. Every word. Every moment. Thank you for being part of something meaningful.\n\nA hundred pages. Thirty visits to the tree. If you are reading this, you have explored almost everything this world has to offer. You have collected fragments, caught fireflies, released lanterns, made wishes, and wandered through the stars.\n\nBut here is the secret saved for the very end: none of it would be alive without someone to discover it.\n\nEvery world is built by those who believe in it. Every story is kept alive by those who take the time to read it. Every word you have read was written because it mattered, and because you were meant to find it.\n\nAnd now you have.\n\nThis is not the end — it is the beginning of something you carry with you. The wonder you found here is yours to keep, to share, to bring into the world beyond these pages.\n\nThank you, dear reader. For everything. For every page. For every moment.\n\nThe next chapter is unwritten.', reason:'View 100 pages and visit the tree 30 times', cond:function(){ return getViewedCount()>=100 && getVisits()>=30; } }
  ];

  function getObs(prop) {
    try { var o=JSON.parse(localStorage.getItem('ash-obs')); return o?o[prop]:null; } catch(e){ return null; }
  }
  function getSkies() {
    try{ var s=JSON.parse(localStorage.getItem('ash-sky-visited')); return s?s.length:0; }catch(e){ return 0; }
  }
  function getWishes() {
    try{ var w=JSON.parse(localStorage.getItem('ash-wish-journal')); return w?w.length:0; }catch(e){ return 0; }
  }
  function getVisits() {
    try{ var d=JSON.parse(localStorage.getItem('ash-tree-of-memories')); return d?d.visits||0:0; }catch(e){ return 0; }
  }
  function getViewedCount() {
    var total=0;
    try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('ash-viewed-')===0){ total+=parseInt(localStorage.getItem(k+'_count')||'0'); } } }catch(e){}
    return total;
  }

  /* ---------- Discovery ---------- */
  function checkNewLetters() {
    var anyNew = false;
    LETTERS.forEach(function(L){
      if (found[L.id]) return;
      if (!letterEnabled(L.id)) return;
      if (L.cond()) {
        found[L.id] = { foundAt: Date.now(), title: L.title };
        anyNew = true;
        if (window.Interactions) window.Interactions.record('content', 'secret_letter_found', L.title);
      }
    });
    if (anyNew) { save(); syncFoundToFirebase(); showNotification(); }
  }

  var notificationTimer = null;
  function showNotification() {
    if (notificationTimer) { clearTimeout(notificationTimer); document.querySelector('.letter-notif')&&document.querySelector('.letter-notif').remove(); }
    var n = document.createElement('div');
    n.className = 'letter-notif';
    n.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:999999;background:rgba(10,8,6,0.9);backdrop-filter:blur(12px);border:1px solid rgba(255,230,100,0.4);border-radius:12px;padding:14px 20px;color:#ffebd2;font-size:14px;cursor:pointer;transition:opacity 0.5s,transform 0.3s;max-width:300px;animation:letterPopIn 0.4s ease-out;';
    n.innerHTML = '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:24px;">\uD83C\uDF1F</span><div><div style="font-weight:bold;color:#ffe680;font-size:15px;">\u2728 Achievement Unlocked!</div><div style="font-size:12px;color:#ddd0c0;">New letter discovered</div></div></div><div style="font-size:11px;color:#ffe680;margin-top:6px;text-align:center;">\u25B6 Click to open collection</div>';
    n.addEventListener('click', function(){ n.remove(); openCollection(); });
    document.body.appendChild(n);
    if (!document.getElementById('letterNotifStyle')) {
      var s = document.createElement('style');
      s.id = 'letterNotifStyle';
      s.textContent = '@keyframes letterPopIn { 0%{opacity:0;transform:scale(0.8) translateY(-10px);} 100%{opacity:1;transform:scale(1) translateY(0);} }';
      document.head.appendChild(s);
    }
    notificationTimer = setTimeout(function(){ n.style.opacity='0'; setTimeout(function(){ n.remove(); }, 500); }, 7000);
  }

  /* ---------- Collection Book ---------- */
  function openCollection() {
    var existing = document.getElementById('letterCollection');
    if (existing) { existing.remove(); return; }

    load();
    var overlay = document.createElement('div');
    overlay.id = 'letterCollection';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:rgba(10,8,6,0.8);backdrop-filter:blur(10px);display:flex;justify-content:center;align-items:center;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(20,16,12,0.95);border:1px solid rgba(255,230,100,0.2);border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;position:relative;color:#ffebd2;';
    var pct = Math.round(Object.keys(found).length/LETTERS.length*100);
    panel.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
      '<span style="font-size:28px;">\uD83D\uDCEC</span>' +
      '<div><div style="font-size:20px;font-weight:bold;color:#ffe680;">Secret Letters</div>' +
      '<div style="font-size:11px;color:#a09080;">'+Object.keys(found).length+' / '+LETTERS.length+' discovered</div></div></div>' +
      '<div style="background:rgba(255,255,255,0.06);border-radius:10px;height:6px;margin:12px 0 16px;overflow:hidden;">' +
      '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#ffe680,#f0c060);border-radius:10px;transition:width 0.5s;"></div></div>';

    LETTERS.forEach(function(L, i){
      var f = found[L.id];
      var isFound = !!f;
      var idx = String(i+1).padStart(2,'0');
      panel.innerHTML += '<div style="padding:10px 12px;margin-bottom:6px;border-radius:8px;background:'+(isFound?'rgba(255,230,100,0.08)':'rgba(255,255,255,0.03)')+';cursor:'+(isFound?'pointer':'default')+';border:1px solid '+(isFound?'rgba(255,230,100,0.15)':'rgba(255,255,255,0.05)')+';"'+
        ' onclick="'+(isFound?'document.getElementById(\'letterContent'+L.id+'\').style.display=document.getElementById(\'letterContent'+L.id+'\').style.display===\'block\'?\'none\':\'block\'':'')+'">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;">'+
        '<span style="font-weight:'+(isFound?'bold':'normal')+';'+(isFound?'':'color:#605040')+';">'+
        '<span style="font-size:10px;color:#6b5f52;margin-right:6px;">#'+idx+'</span>'+
        (isFound?'\uD83D\uDCEC ':'\uD83D\uDD12 ')+L.title+'</span>'+
        '<span style="font-size:11px;color:'+(isFound?'#ffe680':'#605040')+';">'+(!isFound?'???':new Date(f.foundAt).toLocaleDateString())+'</span>'+
        '</div>'+
        (!isFound?'<div style="font-size:10px;color:#807060;margin-top:2px;">'+L.reason+'</div>':'')+
        '<div id="letterContent'+L.id+'" style="display:none;margin-top:8px;padding:14px;background:rgba(0,0,0,0.35);border-radius:8px;font-style:italic;color:#ffe8d0;font-size:13px;line-height:1.7;white-space:pre-line;">'+
        (isFound?L.content:'')+'</div>'+
        '</div>';
    });

    panel.innerHTML += '<div style="text-align:center;margin-top:16px;">' +
      '<span style="font-size:11px;color:#a09080;">Completion: '+pct+'%</span></div>' +
      '<div style="text-align:center;margin-top:10px;margin-bottom:4px;">' +
      '<button onclick="document.getElementById(\'letterCollection\').remove()" style="background:rgba(255,230,100,0.15);border:1px solid rgba(255,230,100,0.3);color:#ffe680;padding:6px 28px;border-radius:20px;cursor:pointer;font-size:13px;">Close</button></div>';

    overlay.appendChild(panel);
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
    overlay.addEventListener('click', function(){ overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* ---------- Hint sparkles on page ---------- */
  function spawnHints() {
    var undiscoved = LETTERS.filter(function(L){ return !found[L.id] && letterEnabled(L.id) && L.cond(); });
    if (undiscoved.length === 0) return;

    // subtle indicator near left buttons
    var hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;bottom:6.5rem;left:1rem;z-index:99997;font-size:10px;cursor:pointer;opacity:0.6;animation:hintGlow 2s ease-in-out infinite;background:rgba(10,8,6,0.3);border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;';
    hint.textContent = '\uD83D\uDCEC';
    hint.title = 'A letter awaits...';
    hint.addEventListener('click', function(){ hint.remove(); var L=undiscoved[0]; found[L.id]={foundAt:Date.now(),title:L.title}; save(); openCollection(); });
    document.body.appendChild(hint);

    if (!document.getElementById('letterHintStyle')) {
      var s = document.createElement('style');
      s.id = 'letterHintStyle';
      s.textContent = '@keyframes hintGlow { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }';
      document.head.appendChild(s);
    }
  }

  /* ---------- Init ---------- */
  function init() {
    if (/stats\.html$|admin\.html$/i.test(window.location.pathname)) {
      // Still expose API on stats/admin page for collection viewing, but don't spawn anything
      return;
    }
    checkNewLetters();
    syncFoundToFirebase();
    spawnHints();
    // periodic check
    setInterval(checkNewLetters, 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 1500); });
  else setTimeout(init, 1500);

  window.SecretLetters = {
    check: checkNewLetters,
    openCollection: openCollection,
    count: function(){ return Object.keys(found).length; },
    total: function(){ return LETTERS.length; },
    list: function () { return LETTERS.map(function (L) { return { id: L.id, title: L.title, reason: L.reason }; }); },
    isEnabled: letterEnabled,
    setEnabled: function (id, val) {
      toggles[id] = !!val;
      persistToggles(toggles);
      if (typeof FB !== 'undefined' && FB.put) {
        var copy = JSON.parse(JSON.stringify(toggles));
        copy.id = 'secretLetters';
        FB.put('config', copy).catch(function () {});
      }
      return toggles[id];
    }
  };
})();
