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
      { id: 'r-100-organs-s0-first-entry', page: '100-organs', sectionIdx: 0, title: 'The First Entry', subtitle: 'The Beginning', steps: [{ hint: 'Entry 1 began at an hour when the whole world was asleep. What time, exactly?', answer: '3:27 am', answers: ['3:27 am', '3:27', '3 27 am'], successMsg: '3:27 AM — and it has never really stopped.' }] },
      { id: 'r-100-organs-s0-voice-note', page: '100-organs', sectionIdx: 0, title: 'The Voice Note', subtitle: 'The Beginning', steps: [{ hint: 'Entry 1 came with more than words — a recording to fall asleep to. What kind of note?', answer: 'cuddling voice note', answers: ['cuddling voice note', 'voice note', 'cuddling'], successMsg: 'It still does its job, every single night.' }] },
      { id: 'r-100-organs-s1-tear-duct', page: '100-organs', sectionIdx: 1, title: 'The Safety Valve', subtitle: 'Face & Expressions', steps: [{ hint: 'At the corner of her eye lives a tiny thing that floods when her heart feels too much. What is it called?', answer: 'tear duct', answers: ['tear duct', 'the tear duct', 'tear ducts'], successMsg: 'The safety valve of a heart that feels everything.' }] },
      { id: 'r-100-organs-s1-two-smiles', page: '100-organs', sectionIdx: 1, title: 'Two Kinds of Smiles', subtitle: 'Face & Expressions', steps: [{ hint: 'He counts two kinds of her smiles — the one he admires, and the one he...?', answer: 'remembers', answers: ['remembers', 'remembers forever'], successMsg: 'Admired and remembered — both hers.' }] },
      { id: 'r-100-organs-s2-neck-kiss', page: '100-organs', sectionIdx: 2, title: 'The Neck Kiss', subtitle: 'Upper Body', steps: [{ hint: 'A kiss was planted on her neck in an unlikely place — among wires and lightbulbs. Where?', answer: 'electrical department', answers: ['electrical department', 'the electrical department'], successMsg: 'The electrical department — that day stayed live.' }] },
      { id: 'r-100-organs-s2-hands', page: '100-organs', sectionIdx: 2, title: 'The Story of Her Heart', subtitle: 'Upper Body', steps: [{ hint: 'Her hands, he wrote, tell a story without saying a word. Whose story?', answer: 'her heart', answers: ['her heart', 'the story of her heart', 'heart'], successMsg: 'The story of her heart, told in every movement.' }] },
      { id: 'r-100-organs-s3-oil', page: '100-organs', sectionIdx: 3, title: 'The Oil', subtitle: 'Torso & Core', steps: [{ hint: 'For the long waist massages he imagines, one oil is always in the picture. Which?', answer: 'coconut oil', answers: ['coconut oil', 'coconut'], successMsg: 'Coconut oil — and unhurried hands.' }] },
      { id: 'r-100-organs-s3-sacred', page: '100-organs', sectionIdx: 3, title: 'The Most Sacred Part', subtitle: 'Torso & Core', steps: [{ hint: 'He called one part of her the most sacred of all. Which?', answer: 'vagina', answers: ['vagina', 'her vagina'], successMsg: 'The most sacred part — spoken with reverence.' }] },
      { id: 'r-100-organs-s4-scars', page: '100-organs', sectionIdx: 4, title: 'Scars as Chapters', subtitle: 'Skin, Skeleton & Organs', steps: [{ hint: 'He calls her scars something a book has — proof that healing is possible. What?', answer: 'chapters', answers: ['chapters', 'chapters of a story'], successMsg: 'Chapters — proof healing is possible.' }] },
      { id: 'r-100-organs-s4-skeleton', page: '100-organs', sectionIdx: 4, title: 'The Quiet Architecture', subtitle: 'Skin, Skeleton & Organs', steps: [{ hint: 'When everything around her was collapsing, something held her upright without a sound. What?', answer: 'skeleton', answers: ['skeleton', 'her skeleton'], successMsg: 'Quiet invisible architecture — it never let her fall.' }] },
      { id: 'r-100-organs-s5-happiness', page: '100-organs', sectionIdx: 5, title: 'The Sound of Happiness', subtitle: 'Soul & Emotions', steps: [{ hint: 'Asked what happiness sounds like, he answered with her. What makes the sound?', answer: 'her laugh', answers: ['her laugh', 'laugh', 'your laugh'], successMsg: 'Happiness sounds like her.' }] },
      { id: 'r-100-organs-s5-choice', page: '100-organs', sectionIdx: 5, title: 'The Choice', subtitle: 'Soul & Emotions', steps: [{ hint: 'Her heart could have gone bitter. Instead it keeps choosing one thing, every single day. What?', answer: 'softness', answers: ['softness', 'softness over bitterness'], successMsg: 'Softness over bitterness — every day.' }] },
      { id: 'r-100-organs-s6-dots', page: '100-organs', sectionIdx: 6, title: 'The Three Dots', subtitle: 'Intimacy & Desire', steps: [{ hint: 'While she types back, three dots appear, disappear, appear again. What are they a sign of?', answer: 'typing', answers: ['typing', 'she is typing', 'her typing'], successMsg: 'The three dots — his favourite pause in the world.' }] },
      { id: 'r-100-organs-s6-thighs', page: '100-organs', sectionIdx: 6, title: 'Where Everything Changes', subtitle: 'Intimacy & Desire', steps: [{ hint: 'One place on her body, he wrote, is where everything changes. Which?', answer: 'inner thighs', answers: ['inner thighs', 'the inner thighs'], successMsg: 'The inner thighs — where everything changes.' }] },
      { id: 'r-100-organs-s7-quiet-brain', page: '100-organs', sectionIdx: 7, title: 'The Quiet Brain', subtitle: 'Moments & Scenarios', steps: [{ hint: 'The first time he sees her, his brain does something unusual — it goes completely...?', answer: 'quiet', answers: ['quiet', 'silent'], successMsg: 'Completely quiet. Just her.' }] },
      { id: 'r-100-organs-s7-sacred-silence', page: '100-organs', sectionIdx: 7, title: 'Sacred Silence', subtitle: 'Moments & Scenarios', steps: [{ hint: 'In the quiet moments after, one thing is sacred — her breathing slowly...?', answer: 'evening out', answers: ['evening out', 'evening', 'calming down'], successMsg: 'Her breathing evening out — that is the holiest silence.' }] },

      // ===== love =====
      { id: 'r-love-s0-wings', page: 'love', sectionIdx: 0, title: 'The Hidden Wings', subtitle: 'Body Details', steps: [{ hint: 'Two wings lie beneath her skin — wings she never learned to use. Where do they sit?', answer: 'shoulder blades', answers: ['shoulder blades', 'her shoulder blades'], successMsg: 'Two wings beneath her skin, waiting for a wind she has never had.' }] },
      { id: 'r-love-s0-birthmarks', page: 'love', sectionIdx: 0, title: 'Constellations of Skin', subtitle: 'Body Details', steps: [{ hint: 'Scattered across her skin are unique constellations he has memorized one by one. What are they?', answer: 'birthmarks', answers: ['birthmarks', 'her birthmarks'], successMsg: 'Unique constellations — proof she was made one of a kind.' }] },
      { id: 'r-love-s1-real-laugh', page: 'love', sectionIdx: 1, title: 'The Real Laugh', subtitle: 'Voice, Habits & Daily Life', steps: [{ hint: 'Her real laugh does not stay polite — it snorts, doubles her over, and makes her eyes...?', answer: 'water', answers: ['water', 'tear up'], successMsg: 'Eyes watering — the best sound in the world.' }] },
      { id: 'r-love-s1-temples', page: 'love', sectionIdx: 1, title: 'The Temple Keepers', subtitle: 'Voice, Habits & Daily Life', steps: [{ hint: 'The sides of her forehead carry every headache and every worry she swallows. What are they called?', answer: 'temples', answers: ['temples', 'her temples'], successMsg: 'Her temples — they catch everything first.' }] },
      { id: 'r-love-s2-magic', page: 'love', sectionIdx: 2, title: 'The Inner Child', subtitle: 'Personality & Inner World', steps: [{ hint: 'Inside her lives a child who gets excited about small things and wants to be held when scared. What does that child believe in?', answer: 'magic', answers: ['magic', 'in magic'], successMsg: 'Magic — and he protects it fiercely.' }] },
      { id: 'r-love-s2-spring-back', page: 'love', sectionIdx: 2, title: 'Bend Without Breaking', subtitle: 'Personality & Inner World', steps: [{ hint: 'She is soft enough to bend, and strong enough to...?', answer: 'spring back', answers: ['spring back', 'spring back up'], successMsg: 'Soft enough to bend, strong enough to spring back.' }] },
      { id: 'r-love-s3-collected', page: 'love', sectionIdx: 3, title: 'The Collected Pieces', subtitle: 'Relationships & World', steps: [{ hint: 'In her keeping: ticket stubs, dried flowers, stones from beaches. Pieces of what?', answer: 'him', answers: ['him', 'of him', 'them'], successMsg: 'Pieces of him, kept like treasures.' }] },
      { id: 'r-love-s3-stories', page: 'love', sectionIdx: 3, title: 'The Repeated Stories', subtitle: 'Relationships & World', steps: [{ hint: 'She returns to certain memories and tells them again — and he listens every time. What does she keep repeating?', answer: 'stories', answers: ['stories', 'her stories'], successMsg: 'The stories she returns to — he never stops listening.' }] },
      { id: 'r-love-s4-dimmed', page: 'love', sectionIdx: 4, title: 'The First Time', subtitle: 'Our Story & Future', steps: [{ hint: 'The first time he saw her, the rest of the world went something. His soul knew hers before his mind caught up. What happened to the world?', answer: 'dimmed', answers: ['dimmed', 'went dim', 'it dimmed'], successMsg: 'The world dimmed — there was only her.' }] },
      { id: 'r-love-s4-goodbye', page: 'love', sectionIdx: 4, title: 'The Lingering Goodbye', subtitle: 'Our Story & Future', steps: [{ hint: 'She never leaves quickly — one more hug, one more kiss, one last look over the shoulder. What does she do?', answer: 'lingers', answers: ['lingers', 'she lingers'], successMsg: 'She lingers — and he never wants her not to.' }] },

      // ===== fantasies (single page, no sections) =====
      { id: 'r-fantasies-fire', page: 'fantasies', title: 'The Fire & Her Skin', subtitle: 'Fantasies', steps: [{ hint: 'When their skin finally meets and all the rules break down, what did he say it was?', answer: 'fire', answers: ['fire', 'the fire'], successMsg: 'She sets fire to parts of him he did not know existed.' }] },
      { id: 'r-fantasies-undress', page: 'fantasies', title: 'Watching You Undress', subtitle: 'Fantasies', steps: [{ hint: 'The slow way — jacket sliding off shoulders, top rising inch by inch. What turns him on most in the world?', answer: 'watching you undress', answers: ['watching you undress', 'undress', 'watching her undress'], successMsg: 'Watching you take your clothes off — slowly.' }] },
      { id: 'r-fantasies-dedication', page: 'fantasies', title: 'The Dedication', subtitle: 'Fantasies', steps: [{ hint: 'Before the fantasies begin, a dedication warns these pages are for exactly how many eyes?', answer: 'for your eyes only', answers: ['for your eyes only', 'your eyes', 'for your eyes'], successMsg: 'For your eyes only.' }] },

      // ===== index =====
      { id: 'r-index-paragraphs', page: 'index', title: 'The One Hundred', subtitle: 'Home', steps: [{ hint: 'The site name promises one hundred of something, written by hand. What?', answer: 'paragraphs', answers: ['paragraphs', '100 paragraphs', 'one hundred paragraphs'], successMsg: 'One hundred little love letters.' }] },
      { id: 'r-index-milestone', page: 'index', title: 'The Growing Number', subtitle: 'Home', steps: [{ hint: 'On the home page, a number grows every single morning. What does it count?', answer: 'days since first entry', answers: ['days since first entry', 'days', 'days together'], successMsg: 'Days since the first entry — and it keeps climbing.' }] },

      // ===== dream =====
      { id: 'r-dream-lanterns', page: 'dream', title: 'Release Into the Sky', subtitle: 'Dream World', steps: [{ hint: 'On the dream page, wishes are written and sent up into the night. What carries them?', answer: 'lanterns', answers: ['lanterns', 'lantern', 'a lantern'], successMsg: 'Lanterns — every one a wish with your name on it.' }] },
      { id: 'r-dream-world', page: 'dream', title: 'The Dream World', subtitle: 'Dream World', steps: [{ hint: 'The page title calls this place a world. What kind of world?', answer: 'dream', answers: ['dream', 'dream world'], successMsg: 'A dream world — built for her.' }] },

      // ===== promises =====
      { id: 'r-promises-count', page: 'promises', title: 'The Promises', subtitle: 'Promises', steps: [{ hint: 'How many promises does this page hold, each with its own little heart?', answer: '100', answers: ['100', 'one hundred', 'a hundred'], successMsg: 'One hundred promises — all kept here.' }] },
      { id: 'r-promises-heart', page: 'promises', title: 'The Lit Heart', subtitle: 'Promises', steps: [{ hint: 'Tap the heart beside a promise and it glows. What does the promise become?', answer: 'bookmarked', answers: ['bookmarked', 'a bookmark', 'favourite'], successMsg: 'Bookmarked — yours to keep.' }] },

      // ===== i-remember =====
      { id: 'r-remember-name', page: 'i-remember', title: 'What It Is Called', subtitle: 'i remember', steps: [{ hint: 'This page keeps every memory of you so it can show them again and again. What does the title say?', answer: 'i remember', answers: ['i remember', 'remember'], successMsg: 'I remember — every single one.' }] },
      { id: 'r-remember-history', page: 'i-remember', title: 'No Repeats', subtitle: 'i remember', steps: [{ hint: 'The page never shows the same memory twice in one visit. What does it keep to decide what comes next?', answer: 'history', answers: ['history', 'a history'], successMsg: 'It keeps a history — so every memory feels new.' }] },

      // ===== photo-gallery =====
      { id: 'r-gallery-fragments', page: 'photo-gallery', title: 'The Hidden Fragments', subtitle: 'Photo Gallery', steps: [{ hint: 'Two photos in the gallery hide fragments — one at the very first spot, one at the eighth. What are they?', answer: 'fragments', answers: ['fragments', 'photo fragments', 'fragment of memory'], successMsg: 'Fragments of memory, frozen in light.' }] },
      { id: 'r-gallery-caption', page: 'photo-gallery', title: 'The Memory Caption', subtitle: 'Photo Gallery', steps: [{ hint: 'Upload a single photo and a question appears before it is saved. What does it ask for?', answer: 'a memory', answers: ['a memory', 'memory', 'a caption'], successMsg: 'A memory for the photo — optional, but always worth it.' }] },

      // ===== make-her-sleep =====
      { id: 'r-sleep-four', page: 'make-her-sleep', title: 'The Four Nights', subtitle: 'Make Her Sleep', steps: [{ hint: 'Each night picks one of four different chats — a classic one, a bad-day one, a story, and a tender one. How many versions in total?', answer: 'four', answers: ['four', '4'], successMsg: 'Four versions — the night always knows which one she needs.' }] },
      { id: 'r-sleep-ritual', page: 'make-her-sleep', title: "Tonight's Ritual", subtitle: 'Make Her Sleep', steps: [{ hint: 'After the chat ends, three moments wait for her — one each night. What are they called?', answer: "tonight's ritual", answers: ["tonight's ritual", 'ritual', 'the ritual'], successMsg: "Tonight's ritual — moment by moment, until she drifts off." }] },

      // ===== letter-that-writes-itself =====
      { id: 'r-letter-selfwriting', page: 'letter-that-writes-itself', title: 'The Self-Writing Letter', subtitle: 'A Letter That Writes Itself', steps: [{ hint: 'On this page, a letter types itself out one character at a time, like it is being written right now. What is the page called?', answer: 'a letter that writes itself', answers: ['a letter that writes itself', 'letter that writes itself', 'the letter that writes itself'], successMsg: 'A letter that writes itself — for you.' }] },

      // ===== sky-observatory =====
      { id: 'r-sky-constellations', page: 'sky-observatory', title: 'The Secret Pictures', subtitle: 'Sky Observatory', steps: [{ hint: 'In the observatory, the stars draw figures across the night. What are they called?', answer: 'constellations', answers: ['constellations', 'constellation'], successMsg: 'Constellations — the sky writing her name.' }] },
      { id: 'r-sky-lucky', page: 'sky-observatory', title: 'The Lucky Sky', subtitle: 'Sky Observatory', steps: [{ hint: 'Only three skies hide the lucky star: Starry Night, Magical Starfield, and one more. Which?', answer: 'stardust', answers: ['stardust'], successMsg: 'Stardust — where the luckiest star lives.' }] },

      // ===== sky-generator =====
      { id: 'r-skygen-engine', page: 'sky-generator', title: 'The Engine', subtitle: 'Sky Generator', steps: [{ hint: 'This page is the engine that paints skies — and it names its version right in the title. What version is it?', answer: 'v2', answers: ['v2', '2', 'version 2'], successMsg: 'Engine v2 — the sky, rebuilt.' }] },

      // ===== sky-generator-living =====
      { id: 'r-skyliving-name', page: 'sky-generator-living', title: 'Living Skies', subtitle: 'Sky Generator — Living', steps: [{ hint: 'The other generator paints static skies; this one makes them breathe, move, live. What kind of skies does it call itself?', answer: 'living', answers: ['living', 'living skies'], successMsg: 'Living skies — full demo.' }] },

      // ===== timeline =====
      { id: 'r-timeline-line', page: 'timeline', title: 'The Line of Days', subtitle: 'Timeline', steps: [{ hint: 'This page draws a line where every dot is a day you two shared. What is the page called?', answer: 'timeline', answers: ['timeline', 'the timeline'], successMsg: 'The timeline of you two — still growing.' }] },

      // ===== story =====
      { id: 'r-story-chapters', page: 'story', title: 'Written in Chapters', subtitle: 'Our Story', steps: [{ hint: 'This page tells your story chapter by chapter, from the beginning. What is it called?', answer: 'our story', answers: ['our story', 'the story'], successMsg: 'Our story — every chapter still being written.' }] },

      // ===== turn-on =====
      { id: 'r-turnon-360', page: 'turn-on', title: 'The 360 Doors', subtitle: 'Turn On', steps: [{ hint: 'The path counts exactly 360 steps, and every step needs one thing from her. What?', answer: 'a choice', answers: ['a choice', 'choice', 'her choice'], successMsg: 'A choice — and the night obeys it.' }] },
      { id: 'r-turnon-back', page: 'turn-on', title: 'The Wrong Turn', subtitle: 'Turn On', steps: [{ hint: 'Choose wrong and the night does not go forward — it sends you somewhere. Where?', answer: 'back', answers: ['back', 'backwards'], successMsg: 'Back — until she finds the path again.' }] },

      // ===== stats =====
      { id: 'r-stats-review', page: 'stats', title: 'The Year in Numbers', subtitle: 'Stats', steps: [{ hint: 'This page turns a whole year into numbers — days visited, streaks, top songs. What is it called?', answer: 'year in review', answers: ['year in review', 'review'], successMsg: 'A year in numbers — proof she came back, every day.' }] },
      { id: 'r-stats-streak', page: 'stats', title: 'The Longest Chain', subtitle: 'Stats', steps: [{ hint: 'It remembers how many days in a row she came back without missing one. What is that chain called?', answer: 'streak', answers: ['streak', 'a streak'], successMsg: 'The streak — days in a row, unbroken.' }] },

      // ===== for-tonight =====
      { id: 'r-tonight-door', page: 'for-tonight', title: 'What Waits for Tonight', subtitle: 'For Tonight', steps: [{ hint: 'Type the right word anywhere on the site and a door opens with a quiet promise: something for...?', answer: 'tonight', answers: ['tonight', 'tonight only'], successMsg: 'Something for tonight — just for her.' }] },

      // ===== guide =====
      { id: 'r-guide-explore', page: 'guide', title: 'How to Explore', subtitle: 'Guide', steps: [{ hint: 'This page teaches how to move through this world. What does its hero title promise to explain?', answer: 'how to explore this world', answers: ['how to explore this world', 'how to explore', 'explore'], successMsg: 'How to explore this world — every hidden corner.' }] },

      // ===== the-making-of =====
      { id: 'r-making-world', page: 'the-making-of', title: 'The Making of This World', subtitle: 'The Making of This World', steps: [{ hint: 'It reveals the story behind every page, every sky, every hidden room. What is it called?', answer: 'the making of this world', answers: ['the making of this world', 'making of this world'], successMsg: 'The making of this world — and the reason it exists.' }] },

      // ===== documentation =====
      { id: 'r-docs-record', page: 'documentation', title: 'The Record of Everything', subtitle: 'Documentation', steps: [{ hint: 'It documents every page, script, and store of this world. What is it called?', answer: 'documentation', answers: ['documentation', 'docs'], successMsg: 'Documentation — the map of the machine.' }] },

      // ===== turnon-history =====
      { id: 'r-turnon-history', page: 'turnon-history', title: "The Night's Record", subtitle: 'Turn On History', steps: [{ hint: 'Every turn-on session is saved here for later, step by step. What is the page called?', answer: 'turn on history', answers: ['turn on history', 'history'], successMsg: 'Turn on history — the nights, remembered.' }] }
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
