// ---------------------------------------------------------------------------
// SERVER CLOCK — offset del reloj, consciente del motor
// useServerTimer calibra Date.now() con el desvío del servidor. Online ese
// desvío viene de Firebase (.info/serverTimeOffset), exactamente como siempre.
// En modo offline no hay servidor: el offset es 0 (un solo dispositivo, sin
// skew relevante).
//
// Garantía de no-regresión: con el flag OFF, esto SIEMPRE usa el listener de
// Firebase original.
// ---------------------------------------------------------------------------

import { ref, onValue } from 'firebase/database';
import { db } from '../firebase/config.js';
import { isOfflineEnabled } from './featureFlag.js';
import { isOnline } from './connectivity.js';
import { hayClienteLANActivo, subscribeOffsetClienteLAN } from './backends/lanBackend.js';

// Listener de nube: idéntico al código original de useServerTimer.
function subscribeCloudOffset(cb) {
  const offsetRef = ref(db, '.info/serverTimeOffset');
  const unsubscribe = onValue(offsetRef, (snap) => cb(snap.val() || 0));
  return unsubscribe;
}

/**
 * Suscribe al offset del reloj de servidor. Devuelve función para desuscribir.
 * - Flag OFF, o online → listener de Firebase (comportamiento de siempre).
 * - Flag ON y offline → offset 0 (una sola llamada), sin tocar Firebase.
 */
export function subscribeServerOffset(cb) {
  // Cliente LAN: el alumno calibra su reloj contra el host (autoridad de tiempo).
  if (hayClienteLANActivo()) {
    return subscribeOffsetClienteLAN(cb);
  }
  if (isOfflineEnabled() && !isOnline()) {
    cb(0);
    return () => {};
  }
  return subscribeCloudOffset(cb);
}
