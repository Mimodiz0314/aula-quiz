// ---------------------------------------------------------------------------
// LAN DEMO — prueba de la sesión en vivo por red local en DOS PESTAÑAS
// Permite ver Fase 2 funcionando hoy, sin host nativo ni red real: usa el
// transporte BroadcastChannel (dos pestañas del mismo navegador) en vez del
// WebSocket real (que llegará con el APK/host nativo en la Etapa E).
//
// Uso (consola del navegador):
//   PESTAÑA DOCENTE:  crea una sala normal (modo offline) y copia su PIN, luego:
//       aulaLan.host('12345')      // empieza a difundir esa sala por red local
//   PESTAÑA ALUMNO:   abre la app en otra pestaña y:
//       aulaLan.join('12345')      // conéctate como alumno a esa sala
//     …luego entra por la pantalla normal del alumno con ese PIN.
//   aulaLan.status()               // ver estado
//
// Todo está detrás del feature flag (lo activa solo). No afecta producción.
// ---------------------------------------------------------------------------

import { enableOfflineOverride, isOfflineEnabled } from './featureFlag.js';
import {
  BroadcastChannelHostTransport,
  BroadcastChannelClientTransport,
} from './lan/transport.js';
import { newClientId } from './lan/protocol.js';

export function installLanDemo() {
  if (typeof window === 'undefined') return;

  window.aulaLan = {
    async host(pin) {
      pin = String(pin);
      if (!isOfflineEnabled()) {
        enableOfflineOverride();
        console.log('[AulaLAN] Modo offline activado. RECARGA esta pestaña y vuelve a llamar aulaLan.host(pin).');
        return;
      }
      const store = await import('./localStore.js');
      const sesion = await store.getSesion(pin);
      if (!sesion) {
        console.warn(`[AulaLAN] No existe la sala ${pin} en este dispositivo. Créala primero (modo offline) en ESTA pestaña.`);
        return;
      }
      const lan = await import('./backends/lanBackend.js');
      lan.iniciarHostLAN(pin, BroadcastChannelHostTransport(pin));
      console.log(`[AulaLAN] 🟢 Difundiendo la sala ${pin} por red local. Abre otra pestaña y usa aulaLan.join('${pin}').`);
    },

    async join(pin) {
      pin = String(pin);
      if (!isOfflineEnabled()) {
        enableOfflineOverride();
        console.log('[AulaLAN] Modo offline activado. RECARGA esta pestaña y vuelve a llamar aulaLan.join(pin).');
        return;
      }
      const lan = await import('./backends/lanBackend.js');
      const transport = BroadcastChannelClientTransport(pin, newClientId());
      const res = await lan.conectarClienteLAN(pin, transport);
      console.log(`[AulaLAN] ${res?.getSnapshot() ? '🟢 Conectado' : '🟡 Conectando'} a la sala ${pin}. Ahora entra por la pantalla del alumno con el PIN ${pin}.`);
    },

    status() {
      console.log(`[AulaLAN] offline habilitado: ${isOfflineEnabled()}. Usa aulaLan.host(pin) en la pestaña del docente y aulaLan.join(pin) en la del alumno.`);
    },
  };
}
