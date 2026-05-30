// ---------------------------------------------------------------------------
// LOCAL STORE — IndexedDB + reactividad
// Espejo local de las rutas de RTDB: sesiones, claves, historial, contenido de
// salas guardadas y la cola de sincronización. Provee:
//   - CRUD asíncrono (Promesas) para encajar en las funciones async del servicio
//   - un EMISOR reactivo en proceso (suscribir/notificar por pin), de modo que
//     suscribirSesion local imite la semántica de onValue (dispara de inmediato
//     con el valor actual y luego en cada cambio)
//   - BroadcastChannel para sincronizar varias pestañas del MISMO dispositivo
//     (escenario realista de Fase 1: docente proyectando + estudiante en otra
//     pestaña). El multi-dispositivo en vivo es Fase 2.
// ---------------------------------------------------------------------------

const DB_NAME = 'aula_offline';
const DB_VERSION = 1;

export const STORES = Object.freeze({
  SESIONES: 'sesiones',
  CLAVES: 'claves',
  HISTORIAL: 'historial',
  CONTENIDO: 'quizContent',
  SYNC: 'syncQueue',
});

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este navegador.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // sesiones/claves: clave 'pin'. Guardamos { pin, data } para preservar la
      // forma exacta del objeto de sesión que la nube devuelve (sin campo pin).
      if (!db.objectStoreNames.contains(STORES.SESIONES)) {
        db.createObjectStore(STORES.SESIONES, { keyPath: 'pin' });
      }
      if (!db.objectStoreNames.contains(STORES.CLAVES)) {
        db.createObjectStore(STORES.CLAVES, { keyPath: 'pin' });
      }
      // historial: clave compuesta id = `${uid}__${key}`, con índice por uid.
      if (!db.objectStoreNames.contains(STORES.HISTORIAL)) {
        const h = db.createObjectStore(STORES.HISTORIAL, { keyPath: 'id' });
        h.createIndex('uid', 'uid', { unique: false });
      }
      // contenido de salas: id = `${uid}__${pin}`, índice por uid.
      if (!db.objectStoreNames.contains(STORES.CONTENIDO)) {
        const c = db.createObjectStore(STORES.CONTENIDO, { keyPath: 'id' });
        c.createIndex('uid', 'uid', { unique: false });
      }
      // cola de sincronización: clave 'opId', orden por 'ts'.
      if (!db.objectStoreNames.contains(STORES.SYNC)) {
        const s = db.createObjectStore(STORES.SYNC, { keyPath: 'opId' });
        s.createIndex('ts', 'ts', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const os = t.objectStore(store);
        let result;
        const r = fn(os);
        if (r !== undefined) {
          r.onsuccess = () => { result = r.result; };
          r.onerror = () => reject(r.error);
        }
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

// ---------- CRUD genérico ----------
function idbGet(store, key) {
  return tx(store, 'readonly', (os) => os.get(key));
}
function idbPut(store, value) {
  return tx(store, 'readwrite', (os) => os.put(value));
}
function idbDelete(store, key) {
  return tx(store, 'readwrite', (os) => os.delete(key));
}
function idbGetAll(store) {
  return tx(store, 'readonly', (os) => os.getAll());
}
function idbGetAllByIndex(store, indexName, value) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, 'readonly');
        const idx = t.objectStore(store).index(indexName);
        const r = idx.getAll(value);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      })
  );
}

// ---------- SESIONES ----------
export async function getSesion(pin) {
  const rec = await idbGet(STORES.SESIONES, pin);
  return rec ? rec.data : null;
}
export async function putSesion(pin, data) {
  await idbPut(STORES.SESIONES, { pin, data });
  notify(pin);
}
export async function deleteSesion(pin) {
  await idbDelete(STORES.SESIONES, pin);
  notify(pin);
}
export async function getAllSesionPins() {
  const recs = await idbGetAll(STORES.SESIONES);
  return recs.map((r) => r.pin);
}

// ---------- CLAVES ----------
export async function getClaves(pin) {
  const rec = await idbGet(STORES.CLAVES, pin);
  return rec ? rec.data : null;
}
export async function putClaves(pin, data) {
  await idbPut(STORES.CLAVES, { pin, data });
}
export async function deleteClaves(pin) {
  await idbDelete(STORES.CLAVES, pin);
}

// ---------- HISTORIAL ----------
export async function putHistorial(uid, key, entry) {
  await idbPut(STORES.HISTORIAL, { id: `${uid}__${key}`, uid, key, entry });
}
export async function getHistorialPorUid(uid) {
  const recs = await idbGetAllByIndex(STORES.HISTORIAL, 'uid', uid);
  return recs.map((r) => ({ key: r.key, ...r.entry }));
}
export async function deleteHistorial(uid, key) {
  await idbDelete(STORES.HISTORIAL, `${uid}__${key}`);
}

// ---------- CONTENIDO DE SALAS ----------
export async function putContenido(uid, pin, obj) {
  await idbPut(STORES.CONTENIDO, { id: `${uid}__${pin}`, uid, pin, ...obj });
}
export async function getContenido(uid, pin) {
  return idbGet(STORES.CONTENIDO, `${uid}__${pin}`);
}
export async function getAllContenido(uid) {
  return idbGetAllByIndex(STORES.CONTENIDO, 'uid', uid);
}
export async function deleteContenido(uid, pin) {
  await idbDelete(STORES.CONTENIDO, `${uid}__${pin}`);
}

// ---------- COLA DE SINCRONIZACIÓN ----------
export async function putSyncOp(op) {
  await idbPut(STORES.SYNC, op);
}
export async function getAllSyncOps() {
  const ops = await idbGetAll(STORES.SYNC);
  return ops.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}
export async function deleteSyncOp(opId) {
  await idbDelete(STORES.SYNC, opId);
}

// ---------------------------------------------------------------------------
// REACTIVIDAD
// Emisor en proceso: Map<pin, Set<callback>>. Al cambiar una sesión leemos su
// valor actual y notificamos a los suscriptores. BroadcastChannel replica el
// aviso a otras pestañas del mismo origen.
// ---------------------------------------------------------------------------
const listeners = new Map(); // pin -> Set<cb>

let channel = null;
if (typeof BroadcastChannel !== 'undefined') {
  channel = new BroadcastChannel(DB_NAME);
  channel.onmessage = (e) => {
    if (e?.data?.type === 'sesion-changed' && e.data.pin) {
      // Otra pestaña cambió esta sesión → notificamos a NUESTROS suscriptores
      // (sin re-emitir por el canal para no crear bucles).
      emitToLocal(e.data.pin);
    }
  };
}

async function emitToLocal(pin) {
  const set = listeners.get(pin);
  if (!set || set.size === 0) return;
  const val = await getSesion(pin);
  set.forEach((cb) => {
    try { cb(val); } catch (err) { console.error('Error en listener offline:', err); }
  });
}

/** Notifica cambios de una sesión: a esta pestaña y (vía canal) a las demás. */
export function notify(pin) {
  emitToLocal(pin);
  if (channel) {
    try { channel.postMessage({ type: 'sesion-changed', pin }); } catch { /* ignore */ }
  }
}

/**
 * Suscribe a una sesión local. Imita onValue: dispara de inmediato con el
 * valor actual y luego en cada cambio. Devuelve función para desuscribir.
 */
export function subscribe(pin, cb) {
  let set = listeners.get(pin);
  if (!set) {
    set = new Set();
    listeners.set(pin, set);
  }
  set.add(cb);

  // Disparo inicial asíncrono con el valor actual (como onValue).
  getSesion(pin).then((val) => {
    if (set.has(cb)) cb(val);
  });

  // Poll de respaldo: si no hay BroadcastChannel, refrescamos cada 1s para
  // captar cambios de otras pestañas. Con canal disponible, no hace falta.
  let pollId = null;
  if (!channel) {
    pollId = setInterval(() => emitToLocal(pin), 1000);
  }

  return () => {
    set.delete(cb);
    if (set.size === 0) listeners.delete(pin);
    if (pollId) clearInterval(pollId);
  };
}
