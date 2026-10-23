/* Lokale Speicherung in IndexedDB. Nichts verlaesst das Geraet. */
(function (root) {
  var DB_NAME = 'unlimited-focus';
  var DB_VERSION = 1;
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('days')) db.createObjectStore('days', { keyPath: 'date' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function run(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, mode);
        var res = fn(tx.objectStore(store));
        tx.oncomplete = function () { resolve(res && res.result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  function allMeta() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = {};
        var req = db.transaction('meta', 'readonly').objectStore('meta').openCursor();
        req.onsuccess = function () {
          var c = req.result;
          if (c) { out[c.key] = c.value; c.continue(); } else resolve(out);
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  // Ersetzt alle Daten in einer Transaktion: klappt komplett oder gar nicht.
  function replaceAll(days, meta) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(['days', 'meta'], 'readwrite');
        var ds = tx.objectStore('days'), ms = tx.objectStore('meta');
        ds.clear(); ms.clear();
        days.forEach(function (d) { ds.put(d); });
        Object.keys(meta).forEach(function (k) { ms.put(meta[k], k); });
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  root.DB = {
    allMeta: allMeta,
    replaceAll: replaceAll,
    getDay: function (date) { return run('days', 'readonly', function (s) { return s.get(date); }); },
    putDay: function (day) { return run('days', 'readwrite', function (s) { return s.put(day); }); },
    allDays: function () { return run('days', 'readonly', function (s) { return s.getAll(); }); },
    getMeta: function (key) { return run('meta', 'readonly', function (s) { return s.get(key); }); },
    setMeta: function (key, value) { return run('meta', 'readwrite', function (s) { return s.put(value, key); }); }
  };
})(self);
