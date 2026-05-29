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
