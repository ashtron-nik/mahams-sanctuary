(function () {
  if (typeof FB === 'undefined') return;
  FB.init();

  var ANSWERS = {};

  function formatTLDate(e) {
    if (!e.date) return '';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var p = e.date.split('-');
    var lbl = months[parseInt(p[0],10)-1] + ' ' + parseInt(p[1],10);
    if (e.year) lbl += ', ' + e.year;
    return lbl;
  }

  function typeLabel(q) {
    if (q.type === 'date') return 'Date';
    if (q.type === 'paragraph') return 'Long answer';
    if (q.type === 'short_text') return 'Short answer';
    if (q.type === 'yes_no') return 'Yes/No';
    if (q.type === 'number') return 'Number';
    if (q.type === 'single_choice') return 'Choose one';
    if (q.type === 'multi_choice') return 'Choose many';
    return q.type || '';
  }

  function renderTimelineItems(items, container) {
    if (!items.length) {
      container.innerHTML = '<div class="empty-state">No memories yet. Add them in Admin → 📅 Timeline.</div>';
      return;
    }
    items.sort(function (a, b) { return (a.year || '').localeCompare(b.year || '') || (a.date || '').localeCompare(b.date || ''); });
    var html = '<div class="tl-wrap">';
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      var date = formatTLDate(e);
      html += '<div class="tl-item">' +
        '<div class="tl-dot"></div>' +
        '<div class="tl-card">' +
        (date ? '<div class="tl-date">' + esc(date) + '</div>' : '') +
        '<div class="tl-title">' + esc(e.title || '') + '</div>' +
        (e.body ? '<div class="tl-body">' + esc(e.body) + '</div>' : '') +
        (e.img ? '<img class="tl-img" src="' + esc(e.img) + '" alt="" loading="lazy">' : '') +
        '</div></div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function renderChapters(items, container) {
    if (!items.length) {
      container.innerHTML = '<div class="empty-state">No chapters yet. Add them in Admin → 💎 Project → The Whole Storyline.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      html += '<div class="story-chapter">' +
        (s.title ? '<div class="story-chapter-title">' + esc(s.title) + '</div>' : '') +
        (s.body ? '<div class="story-chapter-body">' + esc(s.body) + '</div>' : '') +
        '</div>';
    }
    container.innerHTML = html;
  }

  function inputForType(q, qid, val) {
    if (q.type === 'paragraph') return '<textarea data-qid="' + qid + '" class="quiz-input quiz-textarea" rows="2">' + esc(val) + '</textarea>';
    if (q.type === 'date') return '<input type="date" data-qid="' + qid + '" class="quiz-input" value="' + esc(val) + '">';
    if (q.type === 'number') return '<input type="number" data-qid="' + qid + '" class="quiz-input" value="' + esc(val) + '">';
    if (q.type === 'yes_no') {
      return '<label class="quiz-radio-label"><input type="radio" name="q-' + qid + '" value="yes"' + (val==='yes'?' checked':'') + '> Yes</label>' +
        '<label class="quiz-radio-label"><input type="radio" name="q-' + qid + '" value="no"' + (val==='no'?' checked':'') + '> No</label>';
    }
    if ((q.type === 'single_choice' || q.type === 'multi_choice') && q.options) {
      var inputType = q.type === 'multi_choice' ? 'checkbox' : 'radio';
      var h = '';
      for (var oi = 0; oi < q.options.length; oi++) {
        var opt = q.options[oi];
        var checked = Array.isArray(val) ? (val.indexOf(opt) > -1 ? ' checked' : '') : (val === opt ? ' checked' : '');
        h += '<label class="quiz-opt-label"><input type="' + inputType + '" name="q-' + qid + '" value="' + esc(opt) + '"' + checked + '> ' + esc(opt) + '</label>';
      }
      return h;
    }
    return '<input type="text" data-qid="' + qid + '" class="quiz-input" value="' + esc(val) + '">';
  }

  function renderQuiz(categories, container) {
    var catNames = Object.keys(categories);
    var html = '<div class="quiz-wrap">';
    html += '<div class="quiz-progress">' + catNames.length + ' categories &middot; <span id="quizAnswered">0</span>/' + (function(){var t=0;for(var k in categories)t+=categories[k].length;return t})() + ' answered</div>';
    for (var ci = 0; ci < catNames.length; ci++) {
      var cat = catNames[ci];
      var qs = categories[cat];
      html += '<div class="quiz-cat">' +
        '<div class="quiz-cat-header" data-ci="' + ci + '"><span>' + esc(cat) + ' (' + qs.length + ')</span><span class="quiz-arrow">&#x25BC;</span></div>' +
        '<div class="quiz-cat-body" data-ci="' + ci + '">';
      for (var qi = 0; qi < qs.length; qi++) {
        var q = qs[qi];
        var qid = q.id || (ci + '-' + qi);
        var val = ANSWERS[qid] || '';
        html += '<div class="quiz-q">' +
          '<div class="quiz-q-text">' + (qi + 1) + '. ' + esc(q.question) + '</div>' +
          '<div class="quiz-q-meta">' + typeLabel(q) + ' &middot; ' + esc(q.answeredBy || 'Both') + (q.unlock && q.unlock.length ? ' <span class="quiz-unlock">&#x1F513; ' + q.unlock.join(', ') + '</span>' : '') + '</div>' +
          '<div class="quiz-q-inputs">' + inputForType(q, qid, val) + '</div></div>';
      }
      html += '</div></div>';
    }
    html += '<button id="quizSaveBtn" class="quiz-save-btn">&#x1F4BE; Save Answers</button>';
    html += '</div>';
    container.innerHTML = html;

    document.querySelectorAll('.quiz-cat-header').forEach(function (hdr) {
      hdr.addEventListener('click', function () {
        var ci = this.dataset.ci;
        var body = document.querySelector('.quiz-cat-body[data-ci="' + ci + '"]');
        var arrow = this.querySelector('.quiz-arrow');
        var isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
        body.style.maxHeight = isOpen ? '0px' : body.scrollHeight + 'px';
        arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
      });
    });

    document.getElementById('quizSaveBtn').addEventListener('click', saveAnswers);
    updateAnswered();
    document.querySelectorAll('.quiz-input, .quiz-q-inputs input').forEach(function (el) {
      el.addEventListener('change', updateAnswered);
      el.addEventListener('input', updateAnswered);
    });
  }

  function collectAnswers() {
    var result = {};
    document.querySelectorAll('[data-qid]').forEach(function (el) {
      var qid = el.dataset.qid;
      var tag = el.tagName.toLowerCase();
      if (tag === 'textarea' || (tag === 'input' && (el.type === 'text' || el.type === 'date' || el.type === 'number'))) {
        result[qid] = el.value;
      } else if (el.type === 'radio' && el.checked) {
        result[qid] = el.value;
      } else if (el.type === 'checkbox') {
        if (!result[qid]) result[qid] = [];
        if (el.checked) result[qid].push(el.value);
      }
    });
    return result;
  }

  function updateAnswered() {
    var answers = collectAnswers();
    var count = 0;
    for (var k in answers) {
      if (answers[k] && (typeof answers[k] !== 'object' || answers[k].length)) count++;
    }
    var el = document.getElementById('quizAnswered');
    if (el) el.textContent = count;
  }

  function saveAnswers() {
    var answers = collectAnswers();
    FB.put('ourStoryAnswers', { id: 'responses', questions: answers }).then(function () {
      ANSWERS = answers;
      var btn = document.getElementById('quizSaveBtn');
      if (btn) { btn.textContent = '\u2713 Saved!'; btn.style.borderColor = '#6fcf93'; }
      setTimeout(function () { if (btn) btn.textContent = '\uD83D\uDCBE Save Answers'; }, 2000);
      updateAnswered();
    }).catch(function () {
      var btn = document.getElementById('quizSaveBtn');
      if (btn) { btn.textContent = '\u2717 Failed'; btn.style.borderColor = '#e85d3a'; }
    });
  }

  // Load timeline memories + storyline chapters
  Promise.all([
    FB.get('config', 'timeline').then(function (d) { return (d && d.list) || []; }),
    FB.get('project-texts', 'list')
  ]).then(function (results) {
    var timelineItems = results[0];
    var chapters = toArray(results[1]);

    var timelineEl = document.getElementById('storyTimeline');
    var chaptersEl = document.getElementById('storyChapters');

    if (timelineEl) renderTimelineItems(timelineItems, timelineEl);
    if (chaptersEl) renderChapters(chapters, chaptersEl);
  }).catch(function () {
    var timelineEl = document.getElementById('storyTimeline');
    if (timelineEl) timelineEl.innerHTML = '<div class="empty-state">Could not load timeline.</div>';
    var chaptersEl = document.getElementById('storyChapters');
    if (chaptersEl) chaptersEl.innerHTML = '<div class="empty-state">Could not load chapters.</div>';
  });

  // Load quiz
  (function loadQuiz() {
    var container = document.getElementById('storyQuiz');
    if (!container) return;

    function showQuiz(data) {
      if (!data || !data.questions || !data.questions.length) {
        container.innerHTML = '<div class="empty-state">Quiz not available.</div>';
        return;
      }
      var categories = {};
      data.questions.forEach(function (q) {
        if (!categories[q.category]) categories[q.category] = [];
        categories[q.category].push(q);
      });
      FB.get('ourStoryAnswers', 'responses').then(function (d) {
        ANSWERS = d && d.questions ? d.questions : {};
        renderQuiz(categories, container);
      }).catch(function () {
        ANSWERS = {};
        renderQuiz(categories, container);
      });
    }

    fetch('quiz.json').then(function (res) {
      if (!res.ok) throw 'Not found';
      return res.json();
    }).then(showQuiz).catch(function () {
      var el = document.getElementById('quizJsonData');
      if (el) try { showQuiz(JSON.parse(el.textContent)); } catch (e) { container.innerHTML = '<div class="empty-state">Quiz not available.</div>'; }
      else container.innerHTML = '<div class="empty-state">Quiz not available.</div>';
    });
  })();
})();
