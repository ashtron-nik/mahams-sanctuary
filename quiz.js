(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('section-unlock')) return;
  var PAGE = document.body.dataset.page || '';
  var QUIZZES = getDefaultQuizzes();
  var USED_KEYS = {};

  function getDefaultQuizzes() {
    return [
      // 100-organs group 0 — The Beginning
      {
        id: '100-organs-the-beginning', page: '100-organs', sectionIdx: 0, title: 'The Beginning',
        questions: [
          { question: 'Why is the author writing these pages?', options: ['To remind her of her worth', 'To list her flaws', 'To tell a travel story', 'To pass the time'], answer: 0 },
          { question: 'What does the author say these pages are not about?', options: ['Perfection', 'Gratitude', 'Kindness', 'Memories'], answer: 0 },
          { question: 'What kind of speciality does the author say she carries?', options: ['One that cannot be copied or replaced', 'One that is easy to forget', 'One that belongs to everyone', 'One that fades with time'], answer: 0 },
          { question: 'What does the author apologise for?', options: ['Adding to her stress', 'Being late', 'Forgetting her birthday', 'Not writing sooner'], answer: 0 },
          { question: 'What does she have in the author\'s life and heart?', options: ['A special place', 'A temporary spot', 'A lot of questions', 'No place at all'], answer: 0 },
          { question: 'What is the simple truth at the end of the opening?', options: ['The world is better because you exist', 'Everyone needs a fresh start', 'Beauty is temporary', 'Words are not enough'], answer: 0 }
        ]
      },
      // 100-organs group 1 — Face & Head
      {
        id: '100-organs-face-head', page: '100-organs', sectionIdx: 1, title: 'Face & Head',
        questions: [
          { question: 'What colour do her eyes seem to turn in the sun?', options: ['Green', 'Blue', 'Golden', 'Hazel'], answer: 2 },
          { question: 'What happens to her pupils when she sees the author?', options: ['They contract', 'They dilate', 'They change colour', 'They water'], answer: 1 },
          { question: 'What are tear ducts called?', options: ['The windows to the soul', 'The safety valve of a heart that feels everything', 'A tiny fountain', 'The source of all tears'], answer: 1 },
          { question: 'What do her pupils do when something fills her with excitement?', options: ['They narrow', 'They grow wider', 'They change colour', 'They stay still'], answer: 1 },
          { question: 'Where do her genuine smiles begin?', options: ['Her lips', 'The corners of her eyes', 'Her cheeks', 'Her dimples'], answer: 1 }
        ]
      },
      // 100-organs group 2 — Upper Body
      {
        id: '100-organs-upper-body', page: '100-organs', sectionIdx: 2, title: 'Upper Body',
        questions: [
          { question: 'How is her jawline described?', options: ['Sharp and defined', 'Gently curved', 'Square and strong', 'Soft and round'], answer: 1 },
          { question: 'What do her shoulders quietly carry?', options: ['Only her body', 'Hopes, worries, and quiet strength', 'Her bag', 'Nothing at all'], answer: 1 },
          { question: 'What is special about her wrists?', options: ['They are bony', 'They are delicate and connect her hands to her world', 'They are always cold', 'They are strong'], answer: 1 },
          { question: 'What do her hands tell without words?', options: ['Her age', 'The story of her heart', 'Her habits', 'Her secrets'], answer: 1 },
          { question: 'What are her shoulder blades called?', options: ['Two quiet wings hidden beneath her skin', 'Sharp bones', 'A frame', 'A shield'], answer: 0 }
        ]
      },
      // 100-organs group 3 — Lower Body
      {
        id: '100-organs-lower-body', page: '100-organs', sectionIdx: 3, title: 'Lower Body',
        questions: [
          { question: 'What have her knees done through every season of her journey?', options: ['Nothing important', 'Bent when life asked her to be humble and stood firm when it asked her to be brave', 'Only carried her', 'Only hurt'], answer: 1 },
          { question: 'What are her shins called?', options: ['The quiet guardians of her lower legs', 'Her strongest bones', 'A straight line', 'The runners'], answer: 0 },
          { question: 'What have her calves carried her through?', options: ['Only the gym', 'Every mile of her life without asking for recognition', 'One long journey', 'Nothing'], answer: 1 },
          { question: 'What do her ankles give every step?', options: ['Speed', 'A natural rhythm', 'A click', 'Balance'], answer: 1 },
          { question: 'Where have her feet carried her?', options: ['Nowhere far', 'Beside the people she loves and toward her dreams', 'Only home', 'Around in circles'], answer: 1 }
        ]
      },
      // 100-organs group 4 — Bones, Skin & Organs
      {
        id: '100-organs-bones-skin-organs', page: '100-organs', sectionIdx: 4, title: 'Bones, Skin & Organs',
        questions: [
          { question: 'What does her ribcage protect?', options: ['Her spine', 'Her heart and lungs', 'Her liver', 'Her stomach'], answer: 1 },
          { question: 'What is her skeleton called?', options: ['Fragile', 'The quiet, invisible architecture that holds her upright', 'A cage', 'A shield'], answer: 1 },
          { question: 'What do her arteries carry?', options: ['Air', 'Oxygen-rich blood from her heart', 'Water', 'Nutrients only'], answer: 1 },
          { question: 'What are her freckles compared to?', options: ['Little stars', 'Little memories scattered across her skin', 'Dots of sunlight', 'Marks'], answer: 1 },
          { question: 'What are her scars called?', options: ['Imperfections', 'Chapters — proof that healing is possible', 'Battle wounds', 'Marks of the past'], answer: 1 },
          { question: 'Why is her heart the most beautiful part?', options: ['It beats fast', 'It is the reason every other beautiful part exists', 'It is strong', 'It is warm'], answer: 1 }
        ]
      },
      // 100-organs group 5 — Heart & Soul
      {
        id: '100-organs-heart-soul', page: '100-organs', sectionIdx: 5, title: 'Heart & Soul',
        questions: [
          { question: 'What does her warmth do without being seen?', options: ['Nothing', 'Everyone who meets her can feel it', 'It fades', 'It stays hidden'], answer: 1 },
          { question: 'What does her presence do to a room?', options: ['Makes it louder', 'Makes it feel just more — not louder or brighter', 'Makes it brighter', 'Makes it warmer'], answer: 1 },
          { question: 'What is her mind called?', options: ['Chaotic', 'One of the most interesting places the author has been allowed to visit', 'Quiet', 'Sharp'], answer: 1 },
          { question: 'What is her soul called?', options: ['The eternal part', 'The quietest and most beautiful part', 'The spark of life', 'The essence'], answer: 1 },
          { question: 'How is her kindness described?', options: ['Loud and obvious', 'Not loud, never asking for recognition', 'Quiet and shy', 'Rare'], answer: 1 },
          { question: 'What does her laugh sound like?', options: ['Music', 'Happiness itself', 'Rain', 'Bells'], answer: 1 }
        ]
      },
      // 100-organs group 6 — The Little Things
      {
        id: '100-organs-little-things', page: '100-organs', sectionIdx: 6, title: 'The Little Things',
        questions: [
          { question: 'What does her care notice before a word is said?', options: ['A mess', 'When someone is a little off', 'The weather', 'Her own needs'], answer: 1 },
          { question: 'What does her patience let people do?', options: ['Leave', 'Finish their sentences', 'Win arguments', 'Stay quiet'], answer: 1 },
          { question: 'How does she say true things?', options: ['Harshly', 'Kindly', 'Rarely', 'Loudly'], answer: 1 },
          { question: 'What does her humour do to a heavy room?', options: ['Ignores it', 'Makes it lighter', 'Makes it quieter', 'Leaves it'], answer: 1 },
          { question: 'What kind of person can you text late at night?', options: ['A night owl', 'Her — and know you will not be a burden', 'Anyone', 'No one'], answer: 1 }
        ]
      },
      // love section 0 — Who You Are
      {
        id: 'love-who-you-are', page: 'love', sectionIdx: 0, title: 'Who You Are',
        questions: [
          { question: 'What makes her gentleness a strength?', options: ['It makes her quiet', 'It tells people they can exhale', 'It hides her feelings', 'It keeps people at a distance'], answer: 1 },
          { question: 'How does her honesty land?', options: ['Direct but never cruel', 'Blunt and dismissive', 'Rare and guarded', 'Soft and unclear'], answer: 0 },
          { question: 'What is her strength described as?', options: ['Loud and performative', 'Quiet, steady, and real', 'Unbreakable and hard', 'Something she hides'], answer: 1 },
          { question: 'What does her humility do?', options: ['Makes her seem unsure', 'Makes her approachable and sincere', 'Keeps her from growing', 'Makes her avoid attention'], answer: 1 },
          { question: 'What is her kindness?', options: ['Performed for praise', 'Instinctive and generous', 'Reserved for a few', 'A way to be liked'], answer: 1 }
        ]
      },
      // love section 1 — How You Carry Yourself
      {
        id: 'love-how-you-carry-yourself', page: 'love', sectionIdx: 1, title: 'How You Carry Yourself',
        questions: [
          { question: 'Her softness is described as...', options: ['Weakness', 'Tenderness and emotional intelligence', 'A mask', 'Something to fix'], answer: 1 },
          { question: 'What does her playfulness show?', options: ['A lack of focus', 'Joy and a mind delighted by small things', 'A need for attention', 'An escape from reality'], answer: 1 },
          { question: 'When life gets messy, she...', options: ['Falls apart completely', 'Anchors and keeps moving', 'Avoids everyone', 'Pretends nothing happened'], answer: 1 },
          { question: 'What makes her wisdom easy to trust?', options: ['It is always loud', 'It arrives as calm, quiet clarity', 'It is never wrong', 'It is hidden'], answer: 1 },
          { question: 'What did she keep while becoming resilient?', options: ['Her distance', 'Her tenderness', 'Her fear', 'Her silence'], answer: 1 }
        ]
      },
      // love section 2 — The Way You Love
      {
        id: 'love-the-way-you-love', page: 'love', sectionIdx: 2, title: 'The Way You Love',
        questions: [
          { question: 'Her joy is...', options: ['Only loud', 'Real even when quiet', 'Something she hides', 'A performance'], answer: 1 },
          { question: 'Compassion, for her, means...', options: ['Feeling sorry from afar', 'Meeting people without turning away', 'Fixing everyone', 'Staying neutral'], answer: 1 },
          { question: 'Her care feels...', options: ['Performative', 'Practical, warm, and attentive', 'Distant', 'Conditional'], answer: 1 },
          { question: 'Her independence is balanced by...', options: ['A fear of closeness', 'A deep capacity to love', 'A need to control', 'A wish to be alone'], answer: 1 },
          { question: 'Her confidence is...', options: ['Arrogant', 'Self-possession without ego', 'Loud', 'Fragile'], answer: 1 }
        ]
      },
      // love section 3 — How You Make People Feel
      {
        id: 'love-how-you-make-people-feel', page: 'love', sectionIdx: 3, title: 'How You Make People Feel',
        questions: [
          { question: 'Her grace shows up...', options: ['Only on good days', 'In calm under pressure and kindness in chaos', 'In perfect control', 'In silence'], answer: 1 },
          { question: 'Her tenderness is given...', options: ['To everyone equally', 'To the people who matter most', 'Only when asked', 'Rarely'], answer: 1 },
          { question: 'Her spark...', options: ['Makes life flat', 'Keeps ordinary days alive and colorful', 'Needs an audience', 'Fades quickly'], answer: 1 },
          { question: 'What does her balance teach?', options: ['Always be strong', 'When to stand firm and when to soften', 'Never show emotion', 'Avoid conflict'], answer: 1 },
          { question: 'Her open heart is...', options: ['Naive', 'Courageous in a world that hardens people', 'A weakness', 'Careless'], answer: 1 }
        ]
      },
      // love section 4 — Why I Choose You
      {
        id: 'love-why-i-choose-you', page: 'love', sectionIdx: 4, title: 'Why I Choose You',
        questions: [
          { question: 'What does her quiet light do?', options: ['Needs announcing', 'Is impossible to miss', 'Fades in a crowd', 'Depends on praise'], answer: 1 },
          { question: 'Why do people trust her?', options: ['She is loud', 'Her consistency, honesty, and care', 'She never disagrees', 'She keeps secrets'], answer: 1 },
          { question: 'Where does her beauty begin?', options: ['In her appearance only', 'In her spirit, before anyone notices her face', 'In her confidence', 'In her style'], answer: 1 },
          { question: 'What does her presence do?', options: ['Makes people tense', 'Makes people feel safer and more themselves', 'Makes people compete', 'Makes people quiet'], answer: 1 },
          { question: 'What is the final quality?', options: ['The love I keep choosing, every single day', 'The way she works', 'The way she argues', 'The way she hides'], answer: 0 }
        ]
      },
      // page-level quiz for admin unlock
      {
        id: 'love-qualities', page: 'love', sectionIdx: -1, title: 'Qualities I Admire',
        questions: [
          { question: 'How many qualities are on this page?', options: ['25', '50', '100', '10'], answer: 1 },
          { question: 'How many groups hold them?', options: ['3', '5', '7', '10'], answer: 1 },
          { question: 'What does the dedication call the collection?', options: ['A list of perfections', 'Fifty qualities, fifty reasons, one person', 'A secret letter', 'A story of the future'], answer: 1 },
          { question: 'What is the page about?', options: ['Her daily habits', 'The qualities I admire', 'A travel plan', 'A private fantasy'], answer: 1 },
          { question: 'What is the final tribute theme?', options: ['Choosing her love every day', 'A favorite song', 'A future house', 'A morning voice'], answer: 0 }
        ]
      },
      // photo-gallery — page-level quiz
      {
        id: 'photo-gallery-quiz', page: 'photo-gallery', sectionIdx: -1, title: 'Photo Gallery',
        questions: [
          { question: 'What is the main purpose of this gallery?', options: ['To show off photography', 'To preserve memories', 'For social media', 'For fun'], answer: 1 },
          { question: 'What makes this gallery special?', options: ['The filters used', 'The personal meaning behind each photo', 'The resolution', 'The number of photos'], answer: 1 },
          { question: 'What was the creator trying to build instead of just another website?', options: ['A portfolio', 'A home', 'A gallery', 'A blog'], answer: 1 },
          { question: 'What feeling does this gallery evoke?', options: ['Boredom', 'Nostalgia and warmth', 'Confusion', 'Indifference'], answer: 1 }
        ]
      },
      // sky-observatory — page-level quiz
      {
        id: 'sky-observatory-quiz', page: 'sky-observatory', sectionIdx: -1, title: 'Sky Observatory',
        questions: [
          { question: 'What can you change in the sky observatory?', options: ['The music', 'The sky', 'The text', 'The colors'], answer: 1 },
          { question: 'What appears in the sky at night?', options: ['Clouds', 'Stars', 'Rain', 'Snow'], answer: 1 },
          { question: 'What is this website called?', options: ['A love letter', 'Dreambox', 'A gallery', 'A diary'], answer: 1 },
          { question: 'What month did you first meet?', options: ['May', 'June', 'July', 'August'], answer: 1 },
          { question: 'What was the author trying to build with this website?', options: ['A business', 'A home', 'A game', 'A tool'], answer: 1 }
        ]
      }
    ];
  }

  function getQuizForSection(page, idx) {
    for (var i = 0; i < QUIZZES.length; i++) {
      if (QUIZZES[i].page === page && QUIZZES[i].sectionIdx === idx) return QUIZZES[i];
    }
    return null;
  }

  window.addSectionQuizBtn = function (content, page, sectionIdx) {
    if (content.querySelector('.section-quiz-btn')) return;
    var quiz = getQuizForSection(page, sectionIdx);
    if (!quiz) return;
    var btn = document.createElement('button');
    btn.className = 'section-quiz-btn';
    btn.textContent = '\uD83E\uDDEA Quiz (' + quiz.questions.length + ' questions)';
    btn.style.cssText = 'display:block;margin:.75rem auto .5rem;padding:.6rem 1.2rem;border-radius:8px;background:rgba(111,207,147,.08);border:1px solid rgba(111,207,147,.25);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.82rem;cursor:pointer;transition:all .25s;';
    btn.onmouseover = function () { this.style.background = '#6fcf93'; this.style.color = '#181214'; };
    btn.onmouseout = function () { this.style.background = 'rgba(111,207,147,.08)'; this.style.color = '#6fcf93'; };
    btn.onclick = function () { openQuizModal(quiz); };
    var lastTribute = content.querySelector('.tribute:last-of-type');
    if (lastTribute) lastTribute.after(btn);
    else content.appendChild(btn);
  };

  function addQuizButtons() {
    var groups = document.querySelectorAll('.accordion-group');
    groups.forEach(function (g, idx) {
      var quiz = getQuizForSection(PAGE, idx);
      if (!quiz) return;
      var content = g.querySelector('.accordion-content');
      if (!content) return;
      if (content.querySelector('.section-quiz-btn')) return; // already added
      var btn = document.createElement('button');
      btn.className = 'section-quiz-btn';
      btn.textContent = '\uD83E\uDDEA Quiz (' + quiz.questions.length + ' questions)';
      btn.style.cssText = 'display:block;margin:1rem auto .5rem;padding:.6rem 1.2rem;border-radius:8px;background:rgba(111,207,147,.08);border:1px solid rgba(111,207,147,.25);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.82rem;cursor:pointer;transition:all .25s;';
      btn.onmouseover = function () { this.style.background = '#6fcf93'; this.style.color = '#181214'; };
      btn.onmouseout = function () { this.style.background = 'rgba(111,207,147,.08)'; this.style.color = '#6fcf93'; };
      btn.onclick = function () { openQuizModal(quiz); };
      var lastTribute = content.querySelector('.tribute:last-of-type');
      if (lastTribute) lastTribute.after(btn);
      else content.appendChild(btn);
    });
    // Page-level quiz for pages without accordion sections (e.g. fantasies)
    if (!groups.length) {
      var pageQuiz = getQuizForSection(PAGE, -1);
      if (!pageQuiz) return;
      var host = document.querySelector('article.page, main') || document.body;
      if (!host || host.querySelector('.section-quiz-btn')) return;
      var pbtn = document.createElement('button');
      pbtn.className = 'section-quiz-btn';
      pbtn.textContent = '\uD83E\uDDEA Quiz (' + pageQuiz.questions.length + ' questions)';
      pbtn.style.cssText = 'display:block;margin:2rem auto;padding:.6rem 1.2rem;border-radius:8px;background:rgba(111,207,147,.08);border:1px solid rgba(111,207,147,.25);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.82rem;cursor:pointer;transition:all .25s;';
      pbtn.onmouseover = function () { this.style.background = '#6fcf93'; this.style.color = '#181214'; };
      pbtn.onmouseout = function () { this.style.background = 'rgba(111,207,147,.08)'; this.style.color = '#6fcf93'; };
      pbtn.onclick = function () { openQuizModal(pageQuiz); };
      host.appendChild(pbtn);
    }
  }

  function openQuizModal(quiz) {
    var questions = quiz.questions || [];
    var html = '<div style="max-height:70vh;overflow-y:auto;padding:0 .25rem;">';
    html += '<h2 style="margin:0 0 .75rem;color:#ffe680;font-size:1.1rem;">' + esc(quiz.title || 'Quiz') + '</h2>';
    html += '<p style="color:#6b5f52;font-size:.75rem;margin:0 0 1rem;">' + questions.length + ' question' + (questions.length !== 1 ? 's' : '') + '</p>';
    questions.forEach(function (q, qi) {
      html += '<div style="margin-bottom:1.2rem;padding:.6rem .75rem;border-radius:6px;background:rgba(255,220,160,.03);border:1px solid rgba(255,210,150,.06);">';
      html += '<p style="margin:0 0 .5rem;color:#ffebd2;font-size:.85rem;font-weight:600;">' + (qi + 1) + '. ' + esc(q.question) + '</p>';
      var options = q.options || [];
      options.forEach(function (opt, oi) {
        var inputId = 'quiz-' + qi + '-' + oi;
        html += '<label style="display:flex;align-items:center;gap:6px;padding:3px 0;color:#c2b5a0;font-size:.82rem;cursor:pointer;">' +
          '<input type="radio" name="quiz-q-' + qi + '" value="' + oi + '" id="' + inputId + '">' +
          esc(opt) + '</label>';
      });
      html += '</div>';
    });
    html += '<button id="quizSubmitBtn" style="display:block;width:100%;padding:.55rem;border-radius:6px;background:rgba(111,207,147,.1);border:1px solid rgba(111,207,147,.3);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.9rem;cursor:pointer;">Submit</button>';
    html += '</div>';
    openModal(html);
    document.getElementById('quizSubmitBtn').addEventListener('click', function () { submitQuiz(quiz); });
  }

  function submitQuiz(quiz) {
    var questions = quiz.questions || [];
    var score = 0;
    var answers = [];
    questions.forEach(function (q, qi) {
      var selected = document.querySelector('input[name="quiz-q-' + qi + '"]:checked');
      var chosen = selected ? parseInt(selected.value) : -1;
      if (chosen === q.answer) score++;
      answers.push({
        question: q.question,
        chosen: chosen >= 0 && chosen < q.options.length ? q.options[chosen] : '(no answer)',
        correct: q.options[q.answer],
        isCorrect: chosen === q.answer
      });
    });
    var total = questions.length;
    var passed = score >= Math.ceil(total / 2);
    var html = '<div style="text-align:center;padding:1rem;">';
    html += '<div style="font-size:3rem;margin-bottom:.5rem;">' + (passed ? '\u2705' : '\u274C') + '</div>';
    html += '<h2 style="margin:0 0 .5rem;color:#ffe680;font-size:1.2rem;">' + (passed ? 'Passed!' : 'Keep Trying') + '</h2>';
    html += '<p style="font-size:1.1rem;color:#ffebd2;margin:0 0 .25rem;">' + score + ' / ' + total + '</p>';
    html += '<p style="color:#6b5f52;font-size:.8rem;margin:0 0 1rem;">' + (passed ? 'Great job!' : 'You need ' + Math.ceil(total / 2) + ' to pass.') + '</p>';
    html += '<div style="text-align:left;margin-bottom:1rem;">';
    answers.forEach(function (a, i) {
      var icon = a.isCorrect ? '\u2705' : '\u274C';
      var chosenClass = a.isCorrect ? 'color:#6fcf93;' : 'color:#e85d3a;';
      html += '<div style="padding:.4rem .5rem;margin-bottom:4px;border-radius:4px;background:rgba(255,220,160,.03);font-size:.8rem;line-height:1.4;">';
      html += '<div style="color:#ffebd2;font-weight:500;">' + (i + 1) + '. ' + esc(a.question) + '</div>';
      html += '<div style="' + chosenClass + '">' + icon + ' You: ' + esc(a.chosen) + '</div>';
      if (!a.isCorrect) html += '<div style="color:#6fcf93;">\u2705 Correct: ' + esc(a.correct) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:.5rem;justify-content:center;">';
    html += '<button onclick="closeModal()" style="padding:.5rem 1rem;border-radius:6px;background:rgba(255,230,128,.1);border:1px solid #ffe680;color:#ffe680;cursor:pointer;font-size:.85rem;">Close</button>';
    html += '<button id="retakeBtn" style="padding:.5rem 1rem;border-radius:6px;background:rgba(111,207,147,.1);border:1px solid rgba(111,207,147,.3);color:#6fcf93;cursor:pointer;font-size:.85rem;">\u21BB Retake</button>';
    html += '</div>';
    html += '</div>';
    openModal(html);
    var retakeBtn = document.getElementById('retakeBtn');
    if (retakeBtn) retakeBtn.onclick = function () { closeModal(); openQuizModal(quiz); };

    FB.get('quizHistory', 'all').then(function (d) {
      var items = d && d.items ? d.items : [];
      var key = quiz.id + '-' + Date.now();
      if (USED_KEYS[key]) return;
      USED_KEYS[key] = true;
      items.push({ quizId: quiz.id, score: score, total: total, passed: passed, answers: answers, timestamp: Date.now() });
      FB.put('quizHistory', { id: 'all', items: items }).catch(function () {});
      if (window.Interactions) window.Interactions.record('content', passed ? 'quiz_passed' : 'quiz_failed', quiz.id);
    }).catch(function () {});

    if (passed && quiz.page) {
      if (quiz.sectionIdx >= 0) {
        FB.get('sectionUnlock', quiz.page).then(function (d) {
          var cur = d && d.version === 'quiz' && typeof d.unlocked === 'number' ? d.unlocked : 0;
          var next = quiz.sectionIdx + 1;
          if (next > cur) {
            return FB.put('sectionUnlock', { id: quiz.page, unlocked: next, version: 'quiz' });
          }
        }).then(function () {
          toastShow('Section unlocked! Reloading...');
          setTimeout(function () { location.reload(); }, 1200);
        }).catch(function () {});
      } else {
        FB.get('config', 'access').then(function (ac) {
          ac = ac || {};
          if (!ac[quiz.page]) ac[quiz.page] = {};
          ac[quiz.page].adminLocked = false;
          ac.id = 'access';
          try {
            var local = JSON.parse(localStorage.getItem('ash-section-access') || '{}');
            local[quiz.page] = local[quiz.page] || {};
            local[quiz.page].adminLocked = false;
            localStorage.setItem('ash-section-access', JSON.stringify(local));
          } catch (e) {}
          return FB.put('config', ac);
        }).then(function () {
          toastShow('Section unlocked! Reloading...');
          setTimeout(function () { location.reload(); }, 1200);
        }).catch(function () {});
      }
    }
  }

  function esc(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function toastShow(msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(24,18,20,.92);color:#ffebd2;padding:.6rem 1.2rem;border-radius:8px;font-size:.85rem;z-index:99999;border:1px solid rgba(255,210,150,.12);transition:opacity .3s;';
    t.style.opacity = '1';
    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () { t.style.opacity = '0'; }, 3000);
  }

  function openModal(html) {
    var overlay = document.getElementById('modalOverlay');
    var content = document.getElementById('modalContent');
    if (!overlay || !content) {
      overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modalOverlay';
      content = document.createElement('div'); content.className = 'modal'; content.id = 'modalContent';
      overlay.appendChild(content); document.body.appendChild(overlay);
    }
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:99998;';
    content.style.cssText = 'background:#1e1819;border:1px solid rgba(255,210,150,.12);border-radius:12px;padding:1.5rem;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;';
    content.innerHTML = html;
    overlay.onclick = function (e) { if (e.target === overlay) closeModal(); };
  }

  window.closeModal = window.closeModal || function () {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.openSectionQuiz = function (pageKey) {
    for (var i = 0; i < QUIZZES.length; i++) {
      if (QUIZZES[i].page === pageKey && QUIZZES[i].sectionIdx === -1) {
        openQuizModal(QUIZZES[i]);
        return;
      }
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(addQuizButtons, 500); });
  else setTimeout(addQuizButtons, 500);
})();
