// ---------------------------------------------------------------------------
// SALAS GUARDADAS — índice local (por docente) de salas activas para reabrir
// más tarde sin tener que recordar el PIN. Se guarda en el navegador.
// La sala real vive en Firebase (/sesiones/{pin}); aquí solo guardamos un
// puntero ligero { pin, tema, guardada_en }.
// ---------------------------------------------------------------------------

const keyDe = (uid) => `aula_salas_${uid || 'anon'}`;
const MAX = 20;

export function listarSalasGuardadas(uid) {
  try {
    return JSON.parse(localStorage.getItem(keyDe(uid))) || [];
  } catch {
    return [];
  }
}

export function guardarSala(uid, { pin, tema }) {
  if (!pin) return;
  const lista = listarSalasGuardadas(uid).filter((s) => s.pin !== pin);
  lista.unshift({ pin, tema: tema || '', guardada_en: Date.now() });
  reemplazarSalas(uid, lista.slice(0, MAX));
}

export function quitarSala(uid, pin) {
  reemplazarSalas(uid, listarSalasGuardadas(uid).filter((s) => s.pin !== pin));
}

export function reemplazarSalas(uid, lista) {
  try {
    localStorage.setItem(keyDe(uid), JSON.stringify(lista));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// CONTENIDO COMPLETO DE SALAS (offline) — respaldado en IndexedDB
// Los punteros de arriba (localStorage) solo dicen "qué pin existe". Esto guarda
// el cuestionario COMPLETO (preguntas + meta) para preparar/reabrir sin internet
// y reutilizar en futuras sesiones. Es aditivo: no toca la API de punteros.
// ---------------------------------------------------------------------------

/** Guarda el contenido completo de un cuestionario para reutilizarlo offline. */
export async function guardarContenidoSala(uid, { pin, preguntas, tema, grado, dificultad }) {
  if (!pin) return;
  const store = await import('../services/localStore.js');
  await store.putContenido(uid || 'anon', pin, {
    preguntas: preguntas || [],
    tema: tema || '',
    grado: grado || '',
    dificultad: dificultad || '',
    guardado_en: Date.now(),
  });
}

/** Recupera el contenido completo de un cuestionario guardado offline. */
export async function obtenerContenidoSala(uid, pin) {
  const store = await import('../services/localStore.js');
  return store.getContenido(uid || 'anon', pin);
}

/** Lista todos los cuestionarios guardados offline por el docente. */
export async function listarContenidoLocal(uid) {
  const store = await import('../services/localStore.js');
  return store.getAllContenido(uid || 'anon');
}

/** Elimina un cuestionario guardado offline. */
export async function eliminarContenidoSala(uid, pin) {
  const store = await import('../services/localStore.js');
  await store.deleteContenido(uid || 'anon', pin);
}
