// ---------------------------------------------------------------------------
// DEV TOGGLE — interruptor oculto del modo offline (para testers)
// No aparece en la UI. Se maneja desde la consola del navegador:
//   aulaOffline.on()      → activa el modo offline (override) y pide recargar
//   aulaOffline.off()     → lo desactiva
//   aulaOffline.auto()    → vuelve a la configuración por env (VITE_OFFLINE_ENABLED)
//   aulaOffline.status()  → muestra estado (habilitado / online / pendientes)
//   aulaOffline.sync()    → fuerza un intento de subida a la nube
//
// El modo offline sigue APAGADO por defecto; esto solo facilita probarlo.
// ---------------------------------------------------------------------------

import {
  enableOfflineOverride,
  disableOfflineOverride,
  clearOfflineOverride,
  isOfflineEnabled,
} from './featureFlag.js';
import { isOnline } from './connectivity.js';
import { pendientes, flush } from './syncQueue.js';

export function installDevToggle() {
  if (typeof window === 'undefined') return;
  window.aulaOffline = {
    on() {
      enableOfflineOverride();
      console.log('[Aula] Modo offline ACTIVADO. Recarga la página para aplicarlo.');
    },
    off() {
      disableOfflineOverride();
      console.log('[Aula] Modo offline DESACTIVADO. Recarga la página.');
    },
    auto() {
      clearOfflineOverride();
      console.log('[Aula] Modo offline según configuración (env). Recarga la página.');
    },
    async status() {
      const p = await pendientes();
      console.log(
        `[Aula] offline habilitado: ${isOfflineEnabled()} | online: ${isOnline()} | pendientes de subir: ${p}`
      );
    },
    sync() {
      flush();
      console.log('[Aula] Intento de sincronización lanzado.');
    },
  };
}
