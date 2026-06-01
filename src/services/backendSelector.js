// ---------------------------------------------------------------------------
// BACKEND SELECTOR — elige motor nube vs local
// Reglas:
//   - Flag OFF  → SIEMPRE nube (garantía de no-regresión en producción).
//   - Flag ON   → online: nube por defecto; offline: local.
//   - Por pin   → si el pin nació local (Set en memoria) se mantiene en local
//                 aunque vuelva el internet, hasta que se sincronice; así una
//                 sesión no queda a medias entre dos motores.
//
// El Set de pines locales se hidrata desde IndexedDB al cargar el módulo y se
// mantiene al crear/cerrar sesiones locales (lo actualiza el despachador).
// ---------------------------------------------------------------------------

import * as cloud from './backends/cloudBackend.js';
import * as local from './backends/localBackend.js';
import * as lan from './backends/lanBackend.js';
import { isOfflineEnabled } from './featureFlag.js';
import { isOnline } from './connectivity.js';
import { getAllSesionPins } from './localStore.js';

const localPins = new Set();

// Hidratación inicial (solo tiene sentido si el modo offline está habilitado).
if (isOfflineEnabled()) {
  getAllSesionPins()
    .then((pins) => pins.forEach((p) => localPins.add(p)))
    .catch(() => { /* IndexedDB no disponible: seguimos solo con nube */ });
}

export function addLocalPin(pin) {
  if (pin) localPins.add(String(pin));
}
export function removeLocalPin(pin) {
  localPins.delete(String(pin));
}
export function isLocalPin(pin) {
  return localPins.has(String(pin));
}

/** Motor para operaciones nuevas (sin pin previo), p. ej. crearSesion. */
export function pickBackend() {
  if (!isOfflineEnabled()) return cloud;
  return isOnline() ? cloud : local;
}

/** Motor para operaciones sobre un pin existente. */
export function pickBackendForPin(pin) {
  if (!isOfflineEnabled()) return cloud;
  if (lan.isLanPin(pin)) return lan;   // sesión en red local activa (host o cliente)
  if (isLocalPin(pin)) return local;
  return pickBackend();
}
