/* Reine Datums- und Streak-Logik, ohne DOM, damit sie testbar bleibt. */
(function (root) {
  var DAY_START_HOUR = 4;
  var CYCLE_LENGTH = 180;

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2], 12);
  }

  // Der Tag endet erst um 04:00 Uhr.
  function logicalDate(now) {
    now = now || new Date();
    return fmt(new Date(now.getTime() - DAY_START_HOUR * 3600e3));
  }
  function addDays(s, n) {
    var d = parse(s);
    d.setDate(d.getDate() + n);
    return fmt(d);
  }
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }

  // Monate als 'YYYY-MM'
  function monthOf(date) { return date.slice(0, 7); }
  function addMonths(key, n) {
    var p = key.split('-').map(Number);
    var total = p[0] * 12 + (p[1] - 1) + n;
    return Math.floor(total / 12) + '-' + pad(total % 12 + 1);
  }

  function emptyDay(date, habit) {
    return {
      date: date,
      gratitude: ['', '', ''],
      todos: [0, 1, 2, 3].map(function () { return { text: '', done: false }; }),
      good: '',
      better: '',
      manifest: '',
      habit: habit || '',
      habitDone: false,
      updatedAt: 0
    };
  }

  // Manifestieren ist freier Text; fruehe Testversionen speicherten 3 Zeilen als Array.
  function manifestText(day) {
    var m = day && day.manifest;
    if (Array.isArray(m)) return m.filter(function (t) { return t.trim(); }).join('\n');
    return m || '';
  }

  // Ein Tag zaehlt, sobald irgendetwas ausgefuellt oder abgehakt ist.
  function dayCounts(day) {
    if (!day) return false;
    return day.gratitude.some(function (t) { return t.trim(); }) ||
      day.todos.some(function (t) { return t.text.trim() || t.done; }) ||
      !!day.good.trim() || !!day.better.trim() || !!day.habitDone ||
      !!manifestText(day).trim();
  }

  // Harter Reset: Fehlt gestern und heute, ist die Serie 0.
  function computeStreak(counted, today) {
    var todayDone = counted.has(today);
    var cursor = todayDone ? today : addDays(today, -1);
    var n = 0;
    while (counted.has(cursor)) { n++; cursor = addDays(cursor, -1); }
    return { current: n, todayDone: todayDone };
  }

  // Tag X von 180; danach beginnt automatisch ein neuer Zyklus.
  function cycleInfo(cycleStart, today) {
    var diff = Math.max(0, diffDays(cycleStart, today));
    return { day: (diff % CYCLE_LENGTH) + 1, cycle: Math.floor(diff / CYCLE_LENGTH) + 1, length: CYCLE_LENGTH };
  }

  var api = {
    DAY_START_HOUR: DAY_START_HOUR, CYCLE_LENGTH: CYCLE_LENGTH,
    monthOf: monthOf, addMonths: addMonths,
    logicalDate: logicalDate, addDays: addDays, diffDays: diffDays,
    emptyDay: emptyDay, manifestText: manifestText, dayCounts: dayCounts, computeStreak: computeStreak, cycleInfo: cycleInfo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Streak = api;
})(typeof self !== 'undefined' ? self : this);
