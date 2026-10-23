/* Backup: alles als eine JSON-Datei sichern und wieder einspielen. */
(function (root) {
  var APP = 'unlimited-focus';
  var VERSION = 1;
  var STALE_DAYS = 14;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var META_KEYS = ['habit', 'best', 'cycleStart', 'goal', 'onboarded', 'reflect', 'lastBackup'];

  function str(v) { return typeof v === 'string' ? v : ''; }

  // Macht aus einem importierten Tag ein vollstaendiges, sauberes Tagesobjekt.
  function cleanDay(raw) {
    var d = root.Streak.emptyDay(raw.date, str(raw.habit));
    if (Array.isArray(raw.gratitude)) d.gratitude = [0, 1, 2].map(function (i) { return str(raw.gratitude[i]); });
    if (Array.isArray(raw.todos)) {
      d.todos = raw.todos.map(function (t) { return { text: str(t && t.text), done: !!(t && t.done) }; });
      while (d.todos.length < 4) d.todos.push({ text: '', done: false });
    }
    d.good = str(raw.good);
    d.better = str(raw.better);
    d.manifest = root.Streak.manifestText(raw);
    d.habitDone = !!raw.habitDone;
    d.updatedAt = +raw.updatedAt || 0;
    return d;
  }

  function isMetaKey(k) { return META_KEYS.indexOf(k) !== -1 || /^review-\d{4}-\d{2}$/.test(k); }

  function stamp(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function daysSince(iso) {
    if (!iso) return null;
    var t = Date.parse(iso);
    return isNaN(t) ? null : Math.floor((Date.now() - t) / 864e5);
  }

  function build() {
    var now = new Date().toISOString();
    return Promise.all([DB.allDays(), DB.allMeta()]).then(function (r) {
      r[1].lastBackup = now; // steht in der Datei, wird erst nach Erfolg lokal gespeichert
      return { app: APP, version: VERSION, exportedAt: now, days: r[0], meta: r[1] };
    });
  }

  // Gibt 'shared', 'downloaded' oder 'cancelled' zurueck.
  function exportBackup() {
    return build().then(function (data) {
      var name = 'unlimited-focus-backup-' + stamp(new Date()) + '.json';
      var json = JSON.stringify(data, null, 2);
      var file = new File([json], name, { type: 'application/json' });

      var result;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        result = navigator.share({ files: [file], title: 'Unlimited Focus Backup' })
          .then(function () { return 'shared'; })
          .catch(function (e) {
            if (e && e.name === 'AbortError') return 'cancelled';
            return download(file);
          });
      } else {
        result = Promise.resolve(download(file));
      }
      // Nur ein wirklich gespeichertes Backup zaehlt als erledigt.
      return result.then(function (res) {
        if (res === 'cancelled') return res;
        return DB.setMeta('lastBackup', data.exportedAt).then(function () { return res; });
      });
    });
  }

  function download(file) {
    var url = URL.createObjectURL(file);
    var a = document.createElement('a');
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return 'downloaded';
  }

  // Liest und prueft die Datei. Spielt noch nichts ein.
  function readFile(file) {
    return file.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { throw new Error('Die Datei ist keine gültige Backup-Datei.'); }
      if (!data || data.app !== APP || !Array.isArray(data.days) || typeof data.meta !== 'object' || !data.meta) {
        throw new Error('Das ist kein Unlimited-Focus-Backup.');
      }
      if (data.version > VERSION) throw new Error('Dieses Backup stammt aus einer neueren App-Version.');
      var days = data.days.filter(function (d) { return d && typeof d.date === 'string' && DATE_RE.test(d.date); }).map(cleanDay);
      var meta = {};
      Object.keys(data.meta).forEach(function (k) { if (isMetaKey(k)) meta[k] = data.meta[k]; });
      return { days: days, meta: meta, exportedAt: data.exportedAt || null };
    });
  }

  function restore(parsed) { return DB.replaceAll(parsed.days, parsed.meta); }

  root.Backup = {
    STALE_DAYS: STALE_DAYS, daysSince: daysSince,
    exportBackup: exportBackup, readFile: readFile, restore: restore
  };
})(self);
