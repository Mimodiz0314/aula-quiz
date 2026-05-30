// ---------------------------------------------------------------------------
// FEATURE FLAG — Modo offline/híbrido
// El modo offline está APAGADO por defecto. Solo se activa si:
//   - la variable de entorno VITE_OFFLINE_ENABLED === 'true', O
//   - existe un override en localStorage (aula_offline_flag === 'on').
// El override en localStorage GANA, para que un tester pueda activarlo en un
// build de producción sin recompilar.
//
// Propiedad de seguridad clave: cuando el flag está OFF, el backendSelector
// devuelve SIEMPRE el motor de nube, sin importar la conectividad. Eso
// garantiza que el comportamiento online de hoy queda intacto hasta que se
// active explícitamente.
// ---------------------------------------------------------------------------

const LS_KEY = 'aula_offline_flag';

export function isOfflineEnabled() {
  try {
    const override = localStorage.getItem(LS_KEY);
    if (override === 'on') return true;
    if (override === 'off') return false;
  } catch {
    /* localStorage no disponible → caemos al env */
  }
  return true; // Habilitado permanentemente por petición del usuario
}

export function enableOfflineOverride() {
  try { localStorage.setItem(LS_KEY, 'on'); } catch { /* ignore */ }
}

export function disableOfflineOverride() {
  try { localStorage.setItem(LS_KEY, 'off'); } catch { /* ignore */ }
}

export function clearOfflineOverride() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}
