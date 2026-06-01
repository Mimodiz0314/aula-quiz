// ---------------------------------------------------------------------------
// LOCAL IDENTITY — UID estable por dispositivo (sin Firebase Auth)
// Sustituye a getEffectiveUid() del motor nube cuando no hay autenticación
// (modo offline). Respeta la impersonación del admin para que el historial
// local quede bajo el UID del docente correcto, igual que online.
// ---------------------------------------------------------------------------

const LS_KEY = 'aula_device_uid';

function newUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Respaldo simple si randomUUID no existe (navegadores muy viejos).
  return 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** UID del dispositivo, persistente en localStorage. Se genera al primer uso. */
export function getDeviceUid() {
  try {
    let uid = localStorage.getItem(LS_KEY);
    if (!uid) {
      uid = newUuid();
      localStorage.setItem(LS_KEY, uid);
    }
    return uid;
  } catch {
    // Sin localStorage: UID efímero (no persiste, pero no rompe).
    return newUuid();
  }
}

/**
 * UID efectivo para el motor local: si hay un docente impersonado en
 * sessionStorage usamos su uid (igual que getEffectiveUid en la nube); si no,
 * el UID del dispositivo.
 */
export function getEffectiveLocalUid() {
  try {
    const saved = sessionStorage.getItem('impersonated_teacher');
    if (saved) {
      const teacher = JSON.parse(saved);
      if (teacher && teacher.uid) return teacher.uid;
    }
  } catch {
    /* ignore */
  }
  return getDeviceUid();
}
