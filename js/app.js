(function () {
  var S = window.Streak;
  var view = document.getElementById('view');
  var tabs = document.getElementById('tabs');

  var ICON = {
    flame: '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 .8-3.3 2-4.5.2 1.5 1 2.3 1.8 2.5C10.5 8.5 10.8 5.5 12 3z"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 15.8 6.7 19l1.4-5.9-4.6-4 6.1-.5z"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/></svg>',
    glass: '<svg viewBox="0 0 24 24"><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/></svg>',
    month: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>'
  };

  var TABS = [
    { id: 'heute', label: 'Heute', icon: 'home' },
    { id: 'monat', label: 'Monat', icon: 'month' },
    { id: 'reflexion', label: 'Reflexion', icon: 'bulb' },
    { id: 'mehr', label: 'Mehr', icon: 'dots' }
  ];

  var state = {
    today: S.logicalDate(), day: null, counted: new Set(),
    meta: { habit: 'Meine Gewohnheit', best: 0, cycleStart: null, goal: '', onboarded: false },
    reviews: {}, reviewMonth: null, reflect: {}
  };
  var metaTimers = {};
  var saveTimer = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return 'Noch wach?';
    if (h < 11) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    return 'Guten Abend';
  }

  function dateLabel() {
    var d = new Date(state.today + 'T12:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
  }

  function streakInfo() { return S.computeStreak(state.counted, state.today); }

  function hintText(info) {
    if (info.todayDone) return info.current > 1 ? 'Stark. Deine Serie lebt, komm morgen wieder.' : 'Erster Tag geschafft. Morgen wird es eine 2er-Serie.';
    if (info.current > 0) return 'Trag heute etwas ein, um deine ' + info.current + '-Tage-Serie zu halten.';
    return 'Trag heute etwas ein und starte deine Serie.';
  }

  function renderStreak(pop) {
    var info = streakInfo();
    var el = document.getElementById('streak');
    if (!el) return info;
    el.className = 'streak ' + (info.todayDone ? 'on' : info.current > 0 ? 'wait' : 'off') + (pop ? ' pop' : '');
    el.innerHTML = ICON.flame + '<span>' + info.current + '</span>';
    el.setAttribute('aria-label', 'Serie: ' + info.current + ' Tage');
    var h = document.getElementById('hint');
    if (h) h.textContent = hintText(info);
    var r = document.getElementById('record');
    if (r) r.textContent = 'Rekord ' + Math.max(state.meta.best, info.current);
    return info;
  }

  var BASE_TODOS = 4;

  function todoRows() {
    return state.day.todos.map(function (t, i) {
      return '<div class="todo' + (t.done ? ' done' : '') + '">' +
        '<input class="cb" type="checkbox" data-todo-done="' + i + '"' + (t.done ? ' checked' : '') + ' aria-label="To-do ' + (i + 1) + ' erledigt">' +
        '<input class="field" type="text" data-todo-text="' + i + '" value="' + esc(t.text) + '" placeholder="' + (i === 0 ? 'Das Wichtigste zuerst' : 'Noch etwas') + '" aria-label="To-do ' + (i + 1) + '">' +
        (i >= BASE_TODOS ? '<button type="button" class="todo-del" data-todo-del="' + i + '" aria-label="To-do ' + (i + 1) + ' entfernen">×</button>' : '') +
        '</div>';
    }).join('');
  }

  function renderTodoList(focusLast) {
    document.getElementById('focusList').innerHTML = todoRows();
    renderFocus();
    if (focusLast) {
      var inputs = document.querySelectorAll('[data-todo-text]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
  }

  function renderHeute() {
    var d = state.day;
    var cyc = S.cycleInfo(state.meta.cycleStart, state.today);
    var todos = todoRows();
    var grat = d.gratitude.map(function (t, i) {
      return '<input class="field" type="text" data-grat="' + i + '" value="' + esc(t) + '" placeholder="' + ['Wofür bist du heute dankbar?', 'Und noch etwas', 'Und noch etwas'][i] + '" aria-label="Dankbarkeit ' + (i + 1) + '">';
    }).join('');

    view.innerHTML =
      '<div class="top"><span class="date">' + esc(dateLabel()) + '</span><span id="streak" class="streak"></span></div>' +
      '<h1 class="hello">' + greeting() + '</h1>' +
      '<p class="hint" id="hint"></p>' +
      '<div class="meta"><span>Tag ' + cyc.day + ' von ' + cyc.length + '</span><span id="record"></span></div>' +
      '<div class="bar"><i style="width:' + (cyc.day / cyc.length * 100).toFixed(1) + '%"></i></div>' +
      (state.meta.goal ? '<div class="goal"><span>Mein Ziel</span><p>' + esc(state.meta.goal) + '</p></div>' : '') +
      (backupDue() ? '<a class="reviewcard" href="#mehr"><div><b>Zeit für ein Backup</b><span>' + esc(backupAge() === null ? 'Du hast noch keines gemacht.' : 'Dein letztes Backup ist ' + backupAge() + ' Tage alt.') + '</span></div>' + ICON.right + '</a>' : '') +
      (reviewDue() ?'<a class="reviewcard" href="#monat"><div><b>Rückblick auf ' + esc(monthName(reviewDue())) + '</b><span>Nimm dir kurz Zeit für den Monat.</span></div>' + ICON.right + '</a>' : '') +

      '<div class="sec">' + ICON.sun + 'Morgen</div>' +
      '<section class="focus" aria-labelledby="focusTitle">' +
        '<div class="focus-head"><h2 id="focusTitle">Heute wichtig</h2><span class="focus-count" id="focusCount"></span></div>' +
        '<p class="focus-sub">Was muss heute passieren?</p>' +
        '<div class="focus-list" id="focusList">' + todos + '</div>' +
        '<button type="button" class="todo-add" id="todoAdd">+ Weitere Aufgabe</button>' +
      '</section>' +
      '<p class="q">Dankbar für</p>' +
      '<div class="card">' + grat + '</div>' +

      '<div class="divider">' + ICON.glass + '</div>' +

      '<div class="sec">' + ICON.moon + 'Abend</div>' +
      '<p class="q" style="margin-top:0">Was habe ich heute gut gemacht?</p>' +
      '<div class="card"><textarea class="field" data-good rows="3" aria-label="Was habe ich heute gut gemacht">' + esc(d.good) + '</textarea></div>' +
      '<p class="q">Was kann ich morgen besser machen?</p>' +
      '<div class="card"><textarea class="field" data-better rows="3" aria-label="Was kann ich morgen besser machen">' + esc(d.better) + '</textarea></div>' +
      '<section class="manifest" aria-labelledby="manTitle">' +
        '<div class="man-head">' + ICON.star + '<h2 id="manTitle">Manifestieren</h2></div>' +
        '<p class="man-sub">Schreib frei auf, was du in dein Leben ziehst.</p>' +
        '<textarea class="field man-field" id="manText" data-man aria-label="Manifestieren" placeholder="Schreib los …">' + esc(d.manifest) + '</textarea>' +
      '</section>' +
      '<div class="card" style="margin-top:14px"><div class="habit">' +
        '<input class="cb" type="checkbox" id="habitDone"' + (d.habitDone ? ' checked' : '') + ' aria-label="Gewohnheit gehalten">' +
        '<label for="habitDone">Gewohnheit gehalten:</label>' +
        '<input class="field" type="text" id="habitName" value="' + esc(d.habit) + '" aria-label="Name der Gewohnheit">' +
      '</div></div>' +
      '<div class="saved" id="saved"></div>';

    renderStreak(false);
    renderFocus();
    growManifest();
  }

  // Das Feld waechst mit dem Text, mindestens 8 Linien hoch.
  function growManifest() {
    var el = document.getElementById('manText');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 8 * 34) + 'px';
  }

  function renderFocus() {
    var el = document.getElementById('focusCount');
    if (!el) return;
    var set = state.day.todos.filter(function (t) { return t.text.trim(); });
    var done = set.filter(function (t) { return t.done; }).length;
    el.textContent = set.length ? done + ' von ' + set.length + ' erledigt' : '';
    el.classList.toggle('all', set.length > 0 && done === set.length);
  }

  /* ---------- Monatsrückblick ---------- */

  function monthName(key) { return new Date(key + '-15T12:00:00').toLocaleDateString('de-DE', { month: 'long' }); }
  function monthTitle(key) { return new Date(key + '-15T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }); }
  function daysInMonth(key) { var p = key.split('-').map(Number); return new Date(p[0], p[1], 0).getDate(); }
  function countedIn(key) {
    var n = 0;
    state.counted.forEach(function (d) { if (d.slice(0, 7) === key) n++; });
    return n;
  }
  function earliestMonth() {
    var min = null;
    state.counted.forEach(function (d) { var k = d.slice(0, 7); if (!min || k < min) min = k; });
    return min;
  }
  function prevKey() { return S.addMonths(S.monthOf(state.today), -1); }
  function emptyReview() { return { success: '', better: '', letgo: '', done: false }; }
  function getReview(key) {
    if (state.reviews[key]) return Promise.resolve(state.reviews[key]);
    return DB.getMeta('review-' + key).then(function (r) {
      state.reviews[key] = r || emptyReview();
      return state.reviews[key];
    });
  }
  function reviewDue() {
    var k = prevKey(), r = state.reviews[k];
    return r && !r.done && countedIn(k) > 0 ? k : null;
  }
  function currentReviewKey() { return state.reviewMonth || prevKey(); }

  function autogrow(el, min) {
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, min || 0) + 'px';
  }
  function growAll() {
    document.querySelectorAll('textarea[data-grow]').forEach(function (el) { autogrow(el, +el.dataset.grow); });
  }

  function renderMonat() {
    var key = currentReviewKey();
    getReview(key).then(function (r) {
      if ((location.hash || '#heute').slice(1) !== 'monat') return;
      var name = monthName(key);
      var first = earliestMonth() || prevKey();
      var n = countedIn(key);
      var qs = [
        ['success', 'Was waren meine Erfolge im ' + name + '?'],
        ['better', 'Was will ich im nächsten Monat besser machen?'],
        ['letgo', 'Was lasse ich los? Womit schließe ich den ' + name + ' ab?']
      ];
      view.innerHTML =
        '<h1 class="page">Monatsrückblick</h1>' +
        '<div class="monthnav">' +
          '<button type="button" data-act="month" data-dir="-1" aria-label="Vorheriger Monat"' + (key <= first ? ' disabled' : '') + '>' + ICON.left + '</button>' +
          '<span>' + esc(monthTitle(key)) + '</span>' +
          '<button type="button" data-act="month" data-dir="1" aria-label="Nächster Monat"' + (key >= prevKey() ? ' disabled' : '') + '>' + ICON.right + '</button>' +
        '</div>' +
        '<p class="hint" style="text-align:center">' + n + ' von ' + daysInMonth(key) + ' Tagen geschrieben</p>' +
        qs.map(function (q) {
          return '<p class="q">' + esc(q[1]) + '</p><div class="card"><textarea class="field" rows="4" data-grow="100" data-review="' + q[0] + '" aria-label="' + esc(q[1]) + '">' + esc(r[q[0]]) + '</textarea></div>';
        }).join('') +
        (r.done
          ? '<p class="done-note">' + ICON.check + 'Rückblick abgeschlossen</p>'
          : '<button type="button" class="btn" data-act="review-done">Rückblick abschließen</button>') +
        '<div class="saved" id="saved"></div>';
      growAll();
    });
  }

  /* ---------- Reflexion ---------- */

  var REFLECT = [
    ['lessons', 'Welche drei Dinge habe ich auf die harte Tour gelernt?'],
    ['people', 'Welche Menschen holen das Beste aus mir heraus?'],
    ['regret', 'Was würde ich später bereuen, nicht getan zu haben?'],
    ['lesson', 'Was ist die wichtigste Lektion meines Lebens bisher?'],
    ['seen', 'Wie möchte ich von anderen wahrgenommen werden?'],
    ['avoid', 'Wovor weiche ich gerade aus?'],
    ['change', 'Welche eine Gewohnheit würde mein Leben am meisten verändern?']
  ];

  function reflectAnswered() {
    return REFLECT.filter(function (q) { return (state.reflect[q[0]] || '').trim(); }).length;
  }

  function renderReflexion() {
    view.innerHTML =
      '<h1 class="page">Reflexion</h1>' +
      '<p class="hint">Tiefere Fragen für ruhige Momente. Beantworte sie in deinem Tempo und ändere sie, wann du willst.</p>' +
      '<p class="meta"><span id="reflectCount"></span></p>' +
      REFLECT.map(function (q, i) {
        var v = state.reflect[q[0]] || '';
        return '<section class="qcard" aria-label="Frage ' + (i + 1) + '">' +
          '<p class="qnum">' + (i + 1) + ' von ' + REFLECT.length + '</p>' +
          '<h2>' + esc(q[1]) + '</h2>' +
          '<textarea class="field" rows="3" data-grow="90" data-reflect="' + q[0] + '" placeholder="Schreib, was dir einfällt …" aria-label="' + esc(q[1]) + '">' + esc(v) + '</textarea>' +
        '</section>';
      }).join('') +
      '<div class="saved" id="saved"></div>';
    updateReflectCount();
    growAll();
  }

  function updateReflectCount() {
    var el = document.getElementById('reflectCount');
    if (el) el.textContent = reflectAnswered() + ' von ' + REFLECT.length + ' beantwortet';
  }

  /* ---------- Mehr ---------- */

  function renderMehr() {
    var info = streakInfo();
    var cyc = S.cycleInfo(state.meta.cycleStart, state.today);
    view.innerHTML =
      '<h1 class="page">Mehr</h1>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + info.current + '</b><span>Aktuelle Serie</span></div>' +
        '<div class="stat"><b>' + Math.max(state.meta.best, info.current) + '</b><span>Rekord</span></div>' +
        '<div class="stat"><b>' + state.counted.size + '</b><span>Tage geschrieben</span></div>' +
        '<div class="stat"><b>' + cyc.cycle + '</b><span>Zyklus</span></div>' +
      '</div>' +
      '<div class="sec">' + ICON.target + 'Mein Zyklus</div>' +
      '<p class="q" style="margin-top:0">Gewohnheit</p>' +
      '<div class="card"><input class="field" type="text" data-set="habit" value="' + esc(state.meta.habit) + '" aria-label="Gewohnheit"></div>' +
      '<p class="q">Mein Ziel für die nächsten 180 Tage</p>' +
      '<div class="card"><textarea class="field" rows="3" data-grow="80" data-set="goal" placeholder="Was willst du erreichen?" aria-label="Ziel">' + esc(state.meta.goal) + '</textarea></div>' +
      '<div class="saved" id="saved"></div>' +
      '<div class="sec">' + ICON.save + 'Backup</div>' +
      '<p class="hint" id="bkStatus">' + esc(backupStatus()) + '</p>' +
      '<p class="hint">Deine Einträge liegen nur auf diesem Gerät. Speichere die Datei in iCloud Drive oder in Dateien, damit sie nicht verloren gehen.</p>' +
      '<button type="button" class="btn" data-act="backup-export">Backup speichern</button>' +
      '<button type="button" class="btn ghost" data-act="backup-import">Backup einspielen</button>' +
      '<input type="file" id="bkFile" accept="application/json,.json" hidden>' +
      '<p class="bkmsg" id="bkMsg" role="status">' + esc(bkMsg) + '</p>';
    bkMsg = '';
    growAll();
  }

  /* ---------- Backup ---------- */

  var bkMsg = '';

  function backupAge() { return Backup.daysSince(state.meta.lastBackup); }

  function backupStatus() {
    var n = backupAge();
    if (n === null) return 'Du hast noch kein Backup gemacht.';
    if (n === 0) return 'Letztes Backup: heute.';
    return 'Letztes Backup: vor ' + n + (n === 1 ? ' Tag.' : ' Tagen.');
  }

  function backupDue() {
    if (state.counted.size < 3) return false;
    var n = backupAge();
    return n === null || n >= Backup.STALE_DAYS;
  }

  function setBkMsg(text, isErr) {
    var el = document.getElementById('bkMsg');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('bad', !!isErr);
  }

  function doExport() {
    setBkMsg('Backup wird erstellt …');
    Backup.exportBackup().then(function (res) {
      return DB.getMeta('lastBackup').then(function (iso) {
        state.meta.lastBackup = iso;
        var st = document.getElementById('bkStatus');
        if (st) st.textContent = backupStatus();
        setBkMsg(res === 'cancelled' ? 'Abgebrochen. Es wurde kein Backup gespeichert.' : res === 'shared' ? 'Backup gespeichert.' : 'Backup heruntergeladen.');
      });
    }).catch(function () { setBkMsg('Das Backup ist fehlgeschlagen. Versuch es noch einmal.', true); });
  }

  function doImport(file) {
    if (!file) return;
    Backup.readFile(file).then(function (parsed) {
      var when = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'unbekanntem Datum';
      var ok = window.confirm('Backup vom ' + when + ' mit ' + parsed.days.length + ' Tagen einspielen?\n\nDas ersetzt alle Daten auf diesem Gerät.');
      if (!ok) { setBkMsg('Abgebrochen. Deine Daten sind unverändert.'); return; }
      return Backup.restore(parsed).then(function () {
        bkMsg = parsed.days.length + ' Tage wiederhergestellt.';
        return load().then(route);
      });
    }).catch(function (e) { setBkMsg(e && e.message ? e.message : 'Das Einspielen ist fehlgeschlagen.', true); });
  }

  /* ---------- Einrichtung ---------- */

  var ob = { step: 1, habit: '', goal: '', error: '' };
  var CHIPS = ['Sport', 'Lesen', 'Meditation', 'Spazieren', 'Wasser trinken', 'Früh aufstehen'];

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }

  function renderOnboarding() {
    tabs.innerHTML = '';
    var s = ob.step, body;
    if (s === 1) {
      body =
        '<h1 class="hello">Willkommen bei Unlimited Focus</h1>' +
        '<p class="hint">Drei kurze Schritte, dann kannst du loslegen.</p>' +
        '<h2 class="onb-q">Welche Gewohnheit willst du aufbauen?</h2>' +
        '<p class="hint">Sie erscheint jeden Abend als Frage: Habe ich sie gehalten?</p>' +
        '<div class="card"><input class="field" type="text" id="obHabit" value="' + esc(ob.habit) + '" placeholder="z. B. Sport" aria-label="Gewohnheit"></div>' +
        '<div class="chips">' + CHIPS.map(function (c) { return '<button type="button" class="chip" data-act="chip" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
    } else if (s === 2) {
      body =
        '<h1 class="hello">Dein Ziel</h1>' +
        '<h2 class="onb-q">Was willst du in den nächsten 180 Tagen erreichen?</h2>' +
        '<p class="hint">Es steht später oben auf deiner Tagesseite. Du kannst es jederzeit ändern.</p>' +
        '<div class="card"><textarea class="field" id="obGoal" rows="5" placeholder="Mein Ziel …" aria-label="Ziel">' + esc(ob.goal) + '</textarea></div>';
    } else {
      body =
        '<h1 class="hello">Auf den Home-Bildschirm</h1>' +
        (isStandalone()
          ? '<p class="hint">Die App ist bereits installiert. Perfekt.</p>'
          : '<p class="hint">So öffnet sich die App wie eine echte App, ohne Browserleiste:</p>' +
            '<ol class="steps"><li>Tippe in Safari unten auf das Teilen-Symbol.</li><li>Wähle „Zum Home-Bildschirm“.</li><li>Tippe auf „Hinzufügen“.</li></ol>') +
        '<p class="hint" style="margin-top:18px">Deine Einträge bleiben auf diesem Gerät. Es gibt keinen Account und keine Cloud.</p>';
    }
    view.innerHTML =
      '<div class="onb">' +
        '<div class="dots" aria-label="Schritt ' + s + ' von 3">' + [1, 2, 3].map(function (i) { return '<i' + (i <= s ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
        body +
        '<p class="err" id="obErr" role="alert">' + esc(ob.error) + '</p>' +
        '<div class="onb-actions">' +
          (s > 1 ? '<button type="button" class="btn ghost" data-act="ob-back">Zurück</button>' : '<span></span>') +
          '<button type="button" class="btn" data-act="ob-next">' + (s === 3 ? 'Los geht’s' : 'Weiter') + '</button>' +
        '</div>' +
        (s === 2 ? '<button type="button" class="skip" data-act="ob-skip">Ziel später festlegen</button>' : '') +
      '</div>';
    window.scrollTo(0, 0);
  }

  function readOnboardingFields() {
    var h = document.getElementById('obHabit'), g = document.getElementById('obGoal');
    if (h) ob.habit = h.value.trim();
    if (g) ob.goal = g.value.trim();
  }

  function finishOnboarding() {
    var habit = ob.habit || 'Meine Gewohnheit';
    state.meta.habit = habit;
    state.meta.goal = ob.goal;
    state.meta.onboarded = true;
    state.meta.cycleStart = state.today;
    state.day.habit = habit;
    return Promise.all([
      DB.setMeta('habit', habit), DB.setMeta('goal', ob.goal),
      DB.setMeta('cycleStart', state.today), DB.setMeta('onboarded', true)
    ]).then(function () { location.hash = '#heute'; route(); });
  }

  function obNext() {
    readOnboardingFields();
    if (ob.step === 1 && !ob.habit) { ob.error = 'Gib deiner Gewohnheit einen Namen.'; return renderOnboarding(); }
    ob.error = '';
    if (ob.step < 3) { ob.step++; return renderOnboarding(); }
    finishOnboarding();
  }

  function route() {
    if (!state.meta.onboarded) { renderOnboarding(); return; }
    var id = (location.hash || '#heute').slice(1);
    if (!TABS.some(function (t) { return t.id === id; })) id = 'heute';
    tabs.innerHTML = TABS.map(function (t) {
      return '<a href="#' + t.id + '"' + (t.id === id ? ' class="active" aria-current="page"' : '') + '>' + ICON[t.icon] + t.label + '</a>';
    }).join('');
    ({ heute: renderHeute, monat: renderMonat, reflexion: renderReflexion, mehr: renderMehr })[id]();
    window.scrollTo(0, 0);
  }

  function setSaved(text) {
    var el = document.getElementById('saved');
    if (el) el.textContent = text;
  }

  function persist() {
    state.day.updatedAt = Date.now();
    var wasDone = state.counted.has(state.today);
    var counts = S.dayCounts(state.day);
    if (counts) state.counted.add(state.today); else state.counted.delete(state.today);

    var info = streakInfo();
    if (info.current > state.meta.best) {
      state.meta.best = info.current;
      DB.setMeta('best', info.current);
    }
    DB.putDay(state.day).then(function () { setSaved('Gespeichert'); }, function () { setSaved('Speichern fehlgeschlagen'); });
    renderStreak(counts && !wasDone);
  }

  function scheduleSave() {
    setSaved('…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 350);
  }

  function saveMetaSoon(key, val) {
    setSaved('…');
    clearTimeout(metaTimers[key]);
    metaTimers[key] = setTimeout(function () {
      DB.setMeta(key, val).then(function () { setSaved('Gespeichert'); }, function () { setSaved('Speichern fehlgeschlagen'); });
    }, 450);
  }

  view.addEventListener('input', function (e) {
    var t = e.target, d = state.day;
    if (!d) return;
    if (t.dataset.grow !== undefined) autogrow(t, +t.dataset.grow);
    if (t.dataset.review !== undefined) {
      var key = currentReviewKey(), r = state.reviews[key];
      r[t.dataset.review] = t.value;
      saveMetaSoon('review-' + key, r);
      return;
    }
    if (t.dataset.reflect !== undefined) {
      state.reflect[t.dataset.reflect] = t.value;
      updateReflectCount();
      saveMetaSoon('reflect', state.reflect);
      return;
    }
    if (t.dataset.set !== undefined) {
      var f = t.dataset.set;
      state.meta[f] = t.value.trim();
      if (f === 'habit') { state.meta.habit = t.value.trim() || 'Meine Gewohnheit'; state.day.habit = state.meta.habit; }
      saveMetaSoon(f, state.meta[f]);
      return;
    }
    if (t.id === 'obHabit' || t.id === 'obGoal') return;
    if (t.dataset.grat !== undefined) d.gratitude[+t.dataset.grat] = t.value;
    else if (t.dataset.todoText !== undefined) { d.todos[+t.dataset.todoText].text = t.value; renderFocus(); }
    else if (t.hasAttribute('data-good')) d.good = t.value;
    else if (t.hasAttribute('data-better')) d.better = t.value;
    else if (t.hasAttribute('data-man')) { d.manifest = t.value; growManifest(); }
    else if (t.id === 'habitName') {
      d.habit = t.value;
      state.meta.habit = t.value;
      DB.setMeta('habit', t.value);
    } else return;
    scheduleSave();
  });

  view.addEventListener('click', function (e) {
    var d = state.day;
    if (!d) return;
    var a = e.target.closest('[data-act]');
    if (a) {
      var act = a.dataset.act;
      if (act === 'month') {
        state.reviewMonth = S.addMonths(currentReviewKey(), +a.dataset.dir);
        renderMonat();
      } else if (act === 'review-done') {
        var key = currentReviewKey();
        state.reviews[key].done = true;
        DB.setMeta('review-' + key, state.reviews[key]).then(renderMonat);
      } else if (act === 'backup-export') {
        doExport();
      } else if (act === 'backup-import') {
        document.getElementById('bkFile').click();
      } else if (act === 'chip') {
        document.getElementById('obHabit').value = a.dataset.v;
      } else if (act === 'ob-next') obNext();
      else if (act === 'ob-back') { readOnboardingFields(); ob.error = ''; ob.step--; renderOnboarding(); }
      else if (act === 'ob-skip') { readOnboardingFields(); ob.goal = ''; ob.step = 3; ob.error = ''; renderOnboarding(); }
      return;
    }
    if (e.target.id === 'todoAdd') {
      d.todos.push({ text: '', done: false });
      renderTodoList(true);
    } else if (e.target.dataset.todoDel !== undefined) {
      d.todos.splice(+e.target.dataset.todoDel, 1);
      renderTodoList(false);
      clearTimeout(saveTimer);
      persist();
    }
  });

  view.addEventListener('change', function (e) {
    var t = e.target, d = state.day;
    if (!d) return;
    if (t.id === 'bkFile') { var f = t.files[0]; t.value = ''; doImport(f); return; }
    if (t.dataset.todoDone !== undefined) {
      d.todos[+t.dataset.todoDone].done = t.checked;
      t.closest('.todo').classList.toggle('done', t.checked);
      renderFocus();
    } else if (t.id === 'habitDone') d.habitDone = t.checked;
    else return;
    clearTimeout(saveTimer);
    persist();
  });

  // Tageswechsel um 04:00 erkennen, wenn die App im Hintergrund war.
  function checkDayRollover() {
    var now = S.logicalDate();
    if (now !== state.today) { load().then(route); }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkDayRollover(); });

  function load() {
    state.today = S.logicalDate();
    return Promise.all([DB.getMeta('habit'), DB.getMeta('best'), DB.getMeta('cycleStart'), DB.allDays(),
                        DB.getMeta('goal'), DB.getMeta('onboarded'), DB.getMeta('reflect'), DB.getMeta('lastBackup')]).then(function (r) {
      state.meta.lastBackup = r[7] || null;
      state.meta.habit = r[0] || 'Meine Gewohnheit';
      state.meta.best = r[1] || 0;
      state.meta.cycleStart = r[2];
      state.meta.goal = r[4] || '';
      // Wer schon Eintraege hat, braucht keine Einrichtung mehr.
      state.meta.onboarded = !!r[5] || r[3].length > 0;
      state.reflect = r[6] || {};
      state.reviewMonth = null;
      if (!state.meta.cycleStart) {
        state.meta.cycleStart = state.today;
        DB.setMeta('cycleStart', state.today);
      }
      state.counted = new Set(r[3].filter(S.dayCounts).map(function (x) { return x.date; }));
      var today = r[3].filter(function (x) { return x.date === state.today; })[0];
      state.day = today || S.emptyDay(state.today, state.meta.habit);
      if (!state.day.habit) state.day.habit = state.meta.habit;
      state.day.manifest = S.manifestText(state.day);
      return getReview(prevKey());
    });
  }

  window.addEventListener('hashchange', route);

  load().then(route).catch(function () {
    view.innerHTML = '<div class="stub"><h1>Speicher nicht verfügbar</h1><p>Dein Browser blockiert die lokale Speicherung. Öffne die App nicht im privaten Modus.</p></div>';
  });

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js'); });
  }
})();
