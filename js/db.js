/* Compás — almacenamiento local (IndexedDB) */
(function (A) {
  'use strict';
  const NOMBRE = 'compas';
  const VERSION = 1;
  const STORES = { partituras: [], practicas: ['partituraId'], kv: [] };
  let dbp = null;
  function abrir() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NOMBRE, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [n, ind] of Object.entries(STORES)) {
          if (db.objectStoreNames.contains(n)) continue;
          const st = db.createObjectStore(n, { keyPath: 'id' });
          ind.forEach(i => st.createIndex(i, i));
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        // datos de una versión posterior: se abren tal cual y se ignora lo desconocido
        if (req.error && req.error.name === 'VersionError') {
          const r2 = indexedDB.open(NOMBRE);
          r2.onsuccess = () => resolve(r2.result); r2.onerror = () => reject(r2.error);
        } else reject(req.error);
      };
    });
    return dbp;
  }
  const prom = r => new Promise((ok, mal) => { r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
  async function tx(st, modo, fn) {
    const db = await abrir();
    const t = db.transaction(st, modo);
    const fin = new Promise((ok, mal) => { t.oncomplete = ok; t.onerror = () => mal(t.error); t.onabort = () => mal(t.error); });
    const r = await fn(t.objectStore(st));
    await fin;
    return r;
  }
  A.DB = {
    all: st => tx(st, 'readonly', s => prom(s.getAll())),
    get: (st, id) => tx(st, 'readonly', s => prom(s.get(id))),
    byIndex: (st, i, v) => tx(st, 'readonly', s => prom(s.index(i).getAll(v))),
    async put(st, o) { if (!o.id) o.id = A.u.uid(); await tx(st, 'readwrite', s => prom(s.put(o))); return o; },
    del: (st, id) => tx(st, 'readwrite', s => prom(s.delete(id))),
    async kvGet(k, def) { const r = await A.DB.get('kv', k); return r ? r.valor : def; },
    kvSet: (k, v) => A.DB.put('kv', { id: k, valor: v }),
    async borrarPartitura(id) {
      for (const p of await A.DB.byIndex('practicas', 'partituraId', id)) await A.DB.del('practicas', p.id);
      await A.DB.del('partituras', id);
    }
  };
})(window.Compas);
