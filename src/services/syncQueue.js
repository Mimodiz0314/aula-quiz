// ---------------------------------------------------------------------------
// SYNC QUEUE — sube a la nube lo hecho offline, al reconectar
// Fase 1 sincroniza el dato valioso: el HISTORIAL de una clase realizada sin
// internet (resultados de los estudiantes). Cuando vuelve la conexión, las
// operaciones encoladas se suben llamando a cloudBackend (reutiliza, no
// reimplementa). Idempotente por `opId`. Durable en IndexedDB.
//
// El contenido de los cuestionarios para REUTILIZAR en futuras sesiones se
// guarda aparte (savedRooms + localStore.quizContent, Paso 6); esta cola es
// solo para empujar resultados a la nube.
// ---------------------------------------------------------------------------

import * as store from './localStore.js';
import * as cloud from './backends/cloudBackend.js';
import { isOfflineEnabled } from './featureFlag.js';
import { isOnline, onConnectivityChange } from './connectivity.js';

const OP_HISTORIAL = 'historial';

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Encola la subida de una entrada de historial creada offline. */
export async function encolarHistorial(entry) {
  await store.putSyncOp({
    opId: uuid(),
    op: OP_HISTORIAL,
    payload: entry,
    ts: Date.now(),
  });
  // Si hay internet en este momento, intentamos vaciar enseguida.
  if (isOnline()) flush();
}

let vaciando = false;

/**
 * Procesa la cola en orden. Si una operación falla (p. ej. sin auth todavía),
 * se detiene y se reintentará en el próximo disparo. No lanza.
 */
export async function flush() {
  if (vaciando) return;
  if (!isOfflineEnabled()) return;
  if (!isOnline()) return;
  vaciando = true;
  try {
    const ops = await store.getAllSyncOps();
    for (const op of ops) {
      try {
        if (op.op === OP_HISTORIAL) {
          await cloud.guardarHistorialDirecto(op.payload, op.opId);
        }
        await store.deleteSyncOp(op.opId);
      } catch (e) {
        // Falla (sin sesión autenticada, red intermitente…): paramos y
        // reintentamos en el siguiente disparo. La op queda en la cola.
        console.warn('Sync: operación pendiente, se reintentará:', e?.message || e);
        break;
      }
    }
  } finally {
    vaciando = false;
  }
}

/** ¿Cuántas operaciones quedan por subir? (para indicadores de UI futuros) */
export async function pendientes() {
  try {
    const ops = await store.getAllSyncOps();
    return ops.length;
  } catch {
    return 0;
  }
}

// Auto-inicialización: solo si el modo offline está habilitado.
let inicializado = false;
export function initSyncQueue() {
  if (inicializado) return;
  inicializado = true;
  if (!isOfflineEnabled()) return;
  // Vaciar al arrancar si hay internet y cola pendiente.
  flush();
  // Vaciar cuando vuelva la conexión.
  onConnectivityChange((online) => {
    if (online) flush();
  });
}

if (typeof window !== 'undefined') {
  // Diferido para no competir con el arranque de la app.
  setTimeout(() => initSyncQueue(), 0);
}
