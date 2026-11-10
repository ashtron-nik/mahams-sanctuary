(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('puzzle-hunt')) return;
  var STORAGE_KEY = 'ash-puzzle-progress';

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) {}
  }

  var progress = loadProgress();

  function currentStep(puzzle) {
    var pz = progress[puzzle.id] || 0;
    return Math.min(pz, puzzle.steps.length);
  }

  function isSolved(puzzle) {
    return currentStep(puzzle) >= puzzle.steps.length;
  }

  // Page key must match lock.js ('ash-unlocked-group-' + page)
  function pageKey() {
    var p = document.body && document.body.dataset.page;
    if (p) return p;
    return (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  }

  // Highest unlocked section index for this page; null = no gating (single-page pages)
  function getUnlockedIdx() {
    try {
      var v = localStorage.getItem('ash-unlocked-group-' + pageKey());
      return v !== null ? parseInt(v, 10) : null;
    } catch (e) { return null; }
  }

  // A puzzle is visible when it belongs to this page (or is global) and,
  // on sectioned pages, its section is unlocked.
  function isVisible(p) {
    if (p.page && p.page !== pageKey()) return false;
    var u = getUnlockedIdx();
    if (u !== null && p.sectionIdx !== undefined && p.sectionIdx > u) return false;
    return true;
  }

  function loadAllPuzzles() {
    return FB.get('project-puzzles', 'list').then(function (data) {
      // ponytail: admin puzzles (Firebase) win by id; embedded defaults fill the rest
      var list = toArray(data).slice();
      var ids = {};
      for (var i = 0; i < list.length; i++) ids[list[i].id] = 1;
      getDefaultPuzzles().forEach(function (p) {
        if (!ids[p.id]) { list.push(p); ids[p.id] = 1; }
      });
      return { list: list };
    });
  }

  function getDefaultPuzzles() {
    return [
      // ===== 100-organs =====
      { id: 'r-100-organs-s0-worth', page: '100-organs', sectionIdx: 0, title: 'The Reason for These Pages', subtitle: 'The Beginning', steps: [{ hint: 'The author says these pages are not about perfection, but about reminding her of something. What?', answer: 'her worth', answers: ['her worth', 'worth', 'your worth'], successMsg: 'Her worth — the whole reason these pages exist.' }] },
      { id: 'r-100-organs-s0-special-place', page: '100-organs', sectionIdx: 0, title: 'A Place in My Life', subtitle: 'The Beginning', steps: [{ hint: 'Even on the difficult days, what does she have in his life and heart?', answer: 'a special place', answers: ['a special place', 'special place', 'a place'], successMsg: 'A special place — not something she has to earn.' }] },
      { id: 'r-100-organs-s1-tear-duct', page: '100-organs', sectionIdx: 1, title: 'The Safety Valve', subtitle: 'Face & Head', steps: [{ hint: 'At the corner of her eye lives a tiny thing that floods when her heart feels too much. What is it called?', answer: 'tear duct', answers: ['tear duct', 'the tear duct', 'tear ducts'], successMsg: 'The safety valve of a heart that feels everything.' }] },
      { id: 'r-100-organs-s1-eye-corners', page: '100-organs', sectionIdx: 1, title: 'Where Smiles Begin', subtitle: 'Face & Head', steps: [{ hint: 'Before her lips move, her genuine smiles start somewhere else. Where?', answer: 'eye corners', answers: ['eye corners', 'the corners of her eyes', 'corners of her eyes'], successMsg: 'The corners of her eyes — where happiness announces itself first.' }] },
      { id: 'r-100-organs-s1-golden-eyes', page: '100-organs', sectionIdx: 1, title: 'Golden in the Sun', subtitle: 'Face & Head', steps: [{ hint: 'In the sunlight, her eyes stop being one colour and become another. Which?', answer: 'golden', answers: ['golden', 'gold'], successMsg: 'Golden — the sun borrows her for a moment.' }] },
      { id: 'r-100-organs-s2-hands', page: '100-organs', sectionIdx: 2, title: 'The Story of Her Heart', subtitle: 'Upper Body', steps: [{ hint: 'Her hands, he wrote, tell a story without saying a word. Whose story?', answer: 'her heart', answers: ['her heart', 'the story of her heart', 'heart'], successMsg: 'The story of her heart, told in every movement.' }] },
      { id: 'r-100-organs-s2-shoulder-blades', page: '100-organs', sectionIdx: 2, title: 'The Hidden Wings', subtitle: 'Upper Body', steps: [{ hint: 'Two quiet wings lie hidden beneath her skin and shift whenever she reaches for something. What are they?', answer: 'shoulder blades', answers: ['shoulder blades', 'shoulderblades'], successMsg: 'Two quiet wings — she has always been able to fly.' }] },
      { id: 'r-100-organs-s3-knees', page: '100-organs', sectionIdx: 3, title: 'Humble and Brave', subtitle: 'Lower Body', steps: [{ hint: 'These bent when life asked her to be humble and stood firm when it asked her to be brave. What are they?', answer: 'knees', answers: ['knees', 'her knees'], successMsg: 'Her knees — humble and brave in the same breath.' }] },
      { id: 'r-100-organs-s3-feet', page: '100-organs', sectionIdx: 3, title: 'Every Chapter', subtitle: 'Lower Body', steps: [{ hint: 'These carried her beside the people she loves and toward dreams that once felt impossible. What are they?', answer: 'feet', answers: ['feet', 'her feet'], successMsg: 'Her feet — they know the way home.' }] },
      { id: 'r-100-organs-s4-scars', page: '100-organs', sectionIdx: 4, title: 'Scars as Chapters', subtitle: 'Bones, Skin & Organs', steps: [{ hint: 'He calls her scars something a book has — proof that healing is possible. What?', answer: 'chapters', answers: ['chapters', 'chapters of a story'], successMsg: 'Chapters — proof healing is possible.' }] },
      { id: 'r-100-organs-s4-skeleton', page: '100-organs', sectionIdx: 4, title: 'The Quiet Architecture', subtitle: 'Bones, Skin & Organs', steps: [{ hint: 'When everything around her was collapsing, something held her upright without a sound. What?', answer: 'skeleton', answers: ['skeleton', 'her skeleton'], successMsg: 'Quiet invisible architecture — it never let her fall.' }] },
      { id: 'r-100-organs-s4-freckles', page: '100-organs', sectionIdx: 4, title: 'Little Memories', subtitle: 'Bones, Skin & Organs', steps: [{ hint: 'Scattered across her skin are small marks he calls little memories. What are they?', answer: 'freckles', answers: ['freckles', 'her freckles'], successMsg: 'Freckles — small memories written in sunlight.' }] },
      { id: 'r-100-organs-s5-happiness', page: '100-organs', sectionIdx: 5, title: 'The Sound of Happiness', subtitle: 'Heart & Soul', steps: [{ hint: 'Asked what happiness sounds like, he answered with her. What makes the sound?', answer: 'her laugh', answers: ['her laugh', 'laugh', 'your laugh'], successMsg: 'Happiness sounds like her.' }] },
      { id: 'r-100-organs-s5-choice', page: '100-organs', sectionIdx: 5, title: 'The Choice', subtitle: 'Heart & Soul', steps: [{ hint: 'Her heart could have gone bitter. Instead it keeps choosing one thing, every single day. What?', answer: 'softness', answers: ['softness', 'softness over bitterness'], successMsg: 'Softness over bitterness — every day.' }] },
      { id: 'r-100-organs-s5-mind', page: '100-organs', sectionIdx: 5, title: 'The Most Interesting Place', subtitle: 'Heart & Soul', steps: [{ hint: 'He called one place inside her the most interesting he has ever been allowed to visit. What is it?', answer: 'her mind', answers: ['her mind', 'mind'], successMsg: 'Her mind — never still, never boring.' }] },
      { id: 'r-100-organs-s6-text', page: '100-organs', sectionIdx: 6, title: 'The Late-Night Text', subtitle: 'The Little Things', steps: [{ hint: 'There is a person you can text late at night and know you will not be a burden. What is that relationship called?', answer: 'friendship', answers: ['friendship', 'a friendship'], successMsg: 'Friendship — the quiet kind that stays.' }] },
      { id: 'r-100-organs-s6-listening', page: '100-organs', sectionIdx: 6, title: 'The Gift of Listening', subtitle: 'The Little Things', steps: [{ hint: 'She does not just wait for her turn to speak. What does she actually do?', answer: 'listen', answers: ['listen', 'she listens', 'listening'], successMsg: 'She listens — and makes people feel heard.' }] },

      // ===== love =====
      { id: 'r-love-s0-gentle', page: 'love', sectionIdx: 0, title: 'The Quiet Gift', subtitle: 'Who You Are', steps: [{ hint: 'Her gentleness is not weakness; it is the kind of calm that tells people they can...?', answer: 'exhale', answers: ['exhale', 'breathe', 'they can exhale'], successMsg: 'They can exhale — that is her gift.' }] },
      { id: 'r-love-s0-honest', page: 'love', sectionIdx: 0, title: 'Truth With Dignity', subtitle: 'Who You Are', steps: [{ hint: 'Her honesty is direct, but never...?', answer: 'cruel', answers: ['cruel', 'never cruel'], successMsg: 'Direct, never cruel.' }] },
      { id: 'r-love-s1-play', page: 'love', sectionIdx: 1, title: 'Ordinary Light', subtitle: 'How You Carry Yourself', steps: [{ hint: 'Her playfulness makes ordinary days feel...?', answer: 'bright', answers: ['bright', 'brighter'], successMsg: 'Ordinary days, brightened.' }] },
      { id: 'r-love-s1-resilient', page: 'love', sectionIdx: 1, title: 'Soft and Strong', subtitle: 'How You Carry Yourself', steps: [{ hint: 'She is resilient without losing her...?', answer: 'softness', answers: ['softness', 'her softness'], successMsg: 'Resilient, still soft.' }] },
      { id: 'r-love-s2-joy', page: 'love', sectionIdx: 2, title: 'Quiet Joy', subtitle: 'The Way You Love', steps: [{ hint: 'Her joy does not have to be loud to be...?', answer: 'real', answers: ['real', 'genuine'], successMsg: 'Real joy, quiet and bright.' }] },
      { id: 'r-love-s2-care', page: 'love', sectionIdx: 2, title: 'Effortless Care', subtitle: 'The Way You Love', steps: [{ hint: 'Her care is not performative; it is practical, warm, attentive, and deeply...?', answer: 'felt', answers: ['felt', 'deeply felt'], successMsg: 'Care that is deeply felt.' }] },
      { id: 'r-love-s3-peace', page: 'love', sectionIdx: 3, title: 'The Calm in the Room', subtitle: 'How You Make People Feel', steps: [{ hint: 'Her peace is not silence or avoidance; it is the kind of calm that invites...?', answer: 'trust', answers: ['trust', 'invites trust'], successMsg: 'Calm that invites trust.' }] },
      { id: 'r-love-s3-seen', page: 'love', sectionIdx: 3, title: 'Truly Seen', subtitle: 'How You Make People Feel', steps: [{ hint: 'When she is with someone, she is really with them, making them feel...?', answer: 'seen', answers: ['seen', 'understood'], successMsg: 'Seen and understood.' }] },
      { id: 'r-love-s4-trust', page: 'love', sectionIdx: 4, title: 'The Quiet Product', subtitle: 'Why I Choose You', steps: [{ hint: 'Trust is the quiet product of consistency, honesty, and...?', answer: 'care', answers: ['care', 'caring'], successMsg: 'Consistency, honesty, care.' }] },
      { id: 'r-love-s4-choose', page: 'love', sectionIdx: 4, title: 'Every Single Day', subtitle: 'Why I Choose You', steps: [{ hint: 'The final quality says she is the kind of love he wants to keep doing what, every single day?', answer: 'choosing', answers: ['choosing', 'choose', 'keep choosing'], successMsg: 'I keep choosing you.' }] },

      // ===== sky-observatory =====
      { id: 'r-sky-constellations', page: 'sky-observatory', title: 'The Secret Pictures', subtitle: 'Sky Observatory', steps: [{ hint: 'In the observatory, the stars draw figures across the night. What are they called?', answer: 'constellations', answers: ['constellations', 'constellation'], successMsg: 'Constellations — the sky writing her name.' }] },
      { id: 'r-sky-lucky', page: 'sky-observatory', title: 'The Lucky Sky', subtitle: 'Sky Observatory', steps: [{ hint: 'Only three skies hide the lucky star: Starry Night, Magical Starfield, and one more. Which?', answer: 'stardust', answers: ['stardust'], successMsg: 'Stardust — where the luckiest star lives.' }] },

      // ===== sky-generator =====
      { id: 'r-skygen-engine', page: 'sky-generator', title: 'The Engine', subtitle: 'Sky Generator', steps: [{ hint: 'This page is the engine that paints skies — and it names its version right in the title. What version is it?', answer: 'v2', answers: ['v2', '2', 'version 2'], successMsg: 'Engine v2 — the sky, rebuilt.' }] },

      // ===== sky-generator-living =====
      { id: 'r-skyliving-name', page: 'sky-generator-living', title: 'Living Skies', subtitle: 'Sky Generator — Living', steps: [{ hint: 'The other generator paints static skies; this one makes them breathe, move, live. What kind of skies does it call itself?', answer: 'living', answers: ['living', 'living skies'], successMsg: 'Living skies — full demo.' }] },

      // ===== timeline =====
      { id: 'r-timeline-line', page: 'timeline', title: 'The Line of Days', subtitle: 'Timeline', steps: [{ hint: 'This page draws a line where every dot is a day you two shared. What is the page called?', answer: 'timeline', answers: ['timeline', 'the timeline'], successMsg: 'The timeline of you two — still growing.' }] },

      // ===== stats =====
      { id: 'r-stats-review', page: 'stats', title: 'The Year in Numbers', subtitle: 'Stats', steps: [{ hint: 'This page turns a whole year into numbers — days visited, streaks, top songs. What is it called?', answer: 'year in review', answers: ['year in review', 'review'], successMsg: 'A year in numbers — proof she came back, every day.' }] },
      { id: 'r-stats-streak', page: 'stats', title: 'The Longest Chain', subtitle: 'Stats', steps: [{ hint: 'It remembers how many days in a row she came back without missing one. What is that chain called?', answer: 'streak', answers: ['streak', 'a streak'], successMsg: 'The streak — days in a row, unbroken.' }] },

      // ===== birthday =====
      { id: 'r-birthday-gift', page: 'birthday', title: 'The Celebration', subtitle: 'Birthday', steps: [{ hint: 'A festive place full of wishes, balloons, gifts, and memories to celebrate someone wonderful. What is the day called?', answer: 'birthday', answers: ['birthday', 'happy birthday'], successMsg: 'A birthday celebration — made just for her.' }] },

      // ===== guide =====
      { id: 'r-guide-explore', page: 'guide', title: 'How to Explore', subtitle: 'Guide', steps: [{ hint: 'This page teaches how to move through this world. What does its hero title promise to explain?', answer: 'how to explore this world', answers: ['how to explore this world', 'how to explore', 'explore'], successMsg: 'How to explore this world — every hidden corner.' }] }
    ];
  }

  function checkAutoClues() {
    if (typeof FB === 'undefined') return;
    loadAllPuzzles().then(function (data) {
      if (!data || !data.list) return;
      var changed = false;
      for (var pi = 0; pi < data.list.length; pi++) {
        var puzzle = data.list[pi];
        if (!isVisible(puzzle)) continue;
        var pz = progress[puzzle.id] || 0;
        for (var si = pz; si < puzzle.steps.length; si++) {
          var step = puzzle.steps[si];
          if (step.auto && step.auto.type === 'page-visit' && step.auto.page === getCurrentPage()) {
            if (!progress[puzzle.id]) progress[puzzle.id] = 0;
            progress[puzzle.id] = Math.max(progress[puzzle.id], si + 1);
            changed = true;
          }
          if (step.auto && step.auto.type === 'section-view' && step.auto.sectionIdx !== undefined) {
            try {
              var viewed = JSON.parse(localStorage.getItem('ash-section-viewed') || '{}');
              if (viewed[step.auto.sectionIdx]) {
                if (!progress[puzzle.id]) progress[puzzle.id] = 0;
                progress[puzzle.id] = Math.max(progress[puzzle.id], si + 1);
                changed = true;
              }
            } catch (e) {}
          }
        }
      }
      if (changed) {
        saveProgress(progress);
        renderPuzzlePanel();
      }
    }).catch(function () {});
  }

  function getCurrentPage() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path;
  }

  function submitAnswer(puzzleId, stepIdx, answer) {
    loadAllPuzzles().then(function (data) {
      if (!data || !data.list) return;
      var puzzle = null;
      for (var i = 0; i < data.list.length; i++) {
        if (data.list[i].id === puzzleId) { puzzle = data.list[i]; break; }
      }
      if (!puzzle || !puzzle.steps[stepIdx]) return;
      var step = puzzle.steps[stepIdx];
      var valid = (step.answers || [step.answer]).map(function (a) { return String(a).toLowerCase(); });
      if (valid.indexOf(answer.trim().toLowerCase()) !== -1) {
        if (!progress[puzzleId]) progress[puzzleId] = 0;
        progress[puzzleId] = Math.max(progress[puzzleId], stepIdx + 1);
        saveProgress(progress);
        renderPuzzlePanel();
        if (isSolved(puzzle)) {
          toast('\uD83C\uDF89 Puzzle "' + puzzle.title + '" solved!');
          if (window.Interactions) window.Interactions.record('content', 'puzzle_solved', puzzle.title);
        } else {
          toast(step.successMsg || 'Correct!');
        }
      } else {
        toast(step.failMsg || 'Not quite, try again.');
      }
    }).catch(function () {});
  }

  var panel = null;
  var panelShown = false;
  function closePanel() { panel.style.display = 'none'; panelShown = false; }
  function visiblePuzzles(list) {
    return list.filter(isVisible);
  }
  function showPuzzlePanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ash-puzzle-panel';
      panel.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:9999;max-width:320px;width:90%;background:#1c181a;border:1px solid rgba(255,210,150,.15);border-radius:12px;padding:1rem;display:none;box-shadow:0 8px 32px rgba(0,0,0,.4);';
      document.body.appendChild(panel);
      document.addEventListener('click', function (e) {
        if (panelShown && !panel.contains(e.target) && e.target.id !== 'puzzleBtn') {
          closePanel();
        }
      });
    }
    if (panelShown) { closePanel(); return; }
    panel.style.display = 'block'; panelShown = true;
    panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<span style="color:#6b5f52;font-size:.7rem;" id="ash-puzzle-count"></span>' +
      '<button id="ash-pz-close" style="background:none;border:none;color:#6b5f52;cursor:pointer;font-size:1.1rem;padding:0;line-height:1;">\u00D7</button></div>' +
      '<div id="ash-puzzle-body" style="max-height:400px;overflow-y:auto;"></div>';
    document.getElementById('ash-pz-close').addEventListener('click', closePanel);
    loadAllPuzzles().then(function (data) {
      var list = data && data.list ? visiblePuzzles(data.list) : [];
      if (!list.length) { document.getElementById('ash-puzzle-body').innerHTML = '<div style="color:#6b5f52;">No riddles here yet.</div>'; return; }
      var total = 0, solved = 0;
      for (var i = 0; i < list.length; i++) { total++; if (isSolved(list[i])) solved++; }
      document.getElementById('ash-puzzle-count').textContent = solved + '/' + total + ' solved';
      renderPuzzleBody(list);
    }).catch(function (e) { console.error('[PuzzleHunt] load error:', e); document.getElementById('ash-puzzle-body').innerHTML = '<div style="color:#6b5f52;">Failed to load.</div>'; });
  }
  function createPuzzleBtn() {
    if (document.getElementById('puzzleBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'puzzleBtn';
    btn.setAttribute('aria-label', 'Open treasure hunt');
    btn.innerHTML = '\uD83D\uDD11';
    document.body.appendChild(btn);
    btn.addEventListener('click', showPuzzlePanel);
    btn.classList.add('show');
  }
  function renderPuzzlePanel() {
    createPuzzleBtn();
    var btn = document.getElementById('puzzleBtn');
    loadAllPuzzles().then(function (data) {
      var list = data && data.list ? visiblePuzzles(data.list) : [];
      if (btn) btn.style.display = list.length ? '' : 'none';
      if (!list.length) return;
      var total = 0, solved = 0;
      for (var i = 0; i < list.length; i++) { total++; if (isSolved(list[i])) solved++; }
      var c = document.getElementById('ash-puzzle-count');
      if (c) c.textContent = solved + '/' + total + ' solved';
    }).catch(function () {});
  }

  function renderPuzzleBody(puzzles) {
    var body = document.getElementById('ash-puzzle-body');
    if (!body) return;
    var html = '';
    for (var i = 0; i < puzzles.length; i++) {
      var p = puzzles[i];
      var stepIdx = currentStep(p);
      var done = isSolved(p);
      html += '<div style="margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid rgba(255,210,150,.06);">' +
        '<div style="color:' + (done ? '#6fcf93' : '#ffe680') + ';font-size:.85rem;font-weight:600;margin-bottom:4px;">' +
        (done ? '\u2713 ' : '\uD83D\uDD11 ') + (p.title || 'Puzzle') + '</div>' +
        ((p.subtitle && !done) ? '<div style="color:#ffe68088;font-size:.7rem;font-style:italic;margin-bottom:6px;">' + esc(p.subtitle) + '</div>' : '') +
        ((p.intro && !done && stepIdx === 0) ? '<div style="color:#d4c5b2;font-size:.75rem;margin-bottom:8px;">' + esc(p.intro) + '</div>' : '');
      if (done) {
        html += '<div style="color:#6fcf93;font-size:.8rem;">Solved!</div>';
      } else {
        var step = p.steps[stepIdx];
        if (step) {
          html += '<div style="color:#d4c5b2;font-size:.8rem;margin-bottom:6px;">Step ' + (stepIdx + 1) + '/' + p.steps.length + '</div>';
          if (step.hint) html += '<div style="color:#ffe68088;font-size:.75rem;margin-bottom:6px;font-style:italic;">\uD83D\uDD0D ' + step.hint + '</div>';
          html += '<div style="display:flex;gap:4px;"><input type="text" id="ash-pz-ans-' + p.id + '" placeholder="Your answer..." style="flex:1;padding:.35rem .5rem;border-radius:6px;background:rgba(255,220,160,.04);border:1px solid rgba(255,210,150,.15);color:#ffebd2;font-family:inherit;font-size:.8rem;outline:none;">' +
            '<button class="ash-pz-submit" data-pz="' + p.id + '" data-step="' + stepIdx + '" style="padding:.35rem .6rem;border-radius:6px;background:rgba(255,230,128,.1);border:1px solid #ffe68055;color:#ffe680;cursor:pointer;font-size:.75rem;">Go</button></div>';
        }
      }
      html += '</div>';
    }
    if (!puzzles.length) html = '<div style="color:#6b5f52;font-size:.8rem;text-align:center;">No puzzles yet.</div>';
    body.innerHTML = html;
    body.querySelectorAll('.ash-pz-submit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pzId = this.dataset.pz;
        var step = parseInt(this.dataset.step, 10);
        var input = document.getElementById('ash-pz-ans-' + pzId);
        submitAnswer(pzId, step, input ? input.value : '');
      });
    });
    body.querySelectorAll('input[id^="ash-pz-ans-"]').forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var id = this.id.replace('ash-pz-ans-', '');
          var btn = body.querySelector('.ash-pz-submit[data-pz="' + id + '"]');
          if (btn) btn.click();
        }
      });
    });
  }

  function init() {
    if (typeof FB !== 'undefined' && FB.init) FB.init();
    checkAutoClues();
    renderPuzzlePanel();
    setInterval(checkAutoClues, 10000);
    setInterval(renderPuzzlePanel, 15000);
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:50%;left:50%;transform:translate(-50%,50%);background:#1c181a;border:1px solid rgba(255,210,150,.2);color:#ffebd2;padding:.6rem 1.2rem;border-radius:8px;z-index:100000;font-size:.85rem;font-family:Fraunces,Georgia,serif;transition:opacity .3s;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 2000);
  }

  // admin.html loads this file for getDefaultPuzzles() only — skip UI init there
  var isAdminPage = !!(document.getElementById && document.getElementById('projectPuzzlesList'));
  if (!isAdminPage) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  window.PuzzleHunt = {
    checkAutoClues: checkAutoClues,
    renderPuzzlePanel: renderPuzzlePanel,
    submitAnswer: submitAnswer,
    getDefaultPuzzles: getDefaultPuzzles
  };
})();
