// ---------------------------------------------------------------------------
// LAN HOST — lógica del docente como fuente de verdad
// Reutiliza el motor local (localBackend) sin modificarlo: el host ES local
// más un difusor. Se suscribe a los cambios de la sesión en localStore y los
// emite por el transporte (STATE) a todos los alumnos; recibe sus intenciones
// (JOIN/ANSWER) y las aplica vía localBackend en una COLA SERIAL (evita carreras
// al leer-modificar-escribir el objeto de sesión, rol que en la nube cumplía
// runTransaction / los paths atómicos de RTDB).
//
// Independiente del socket: funciona con cualquier HostTransport (en memoria,
// BroadcastChannel o el servidor nativo de la Etapa E).
// ---------------------------------------------------------------------------

import * as local from '../backends/localBackend.js';
import * as store from '../localStore.js';
import { ESTADOS } from '../backends/cloudBackend.js';
import {
  MSG, welcome, joined, answerAck, state, clockPong,
} from './protocol.js';

/**
 * Arranca el host sobre una sala (pin) que ya existe en el motor local.
 * Devuelve { stop() } para detenerlo.
 */
export function createLanHost(pin, transport) {
  // Cola serial de escrituras: encadena promesas para que JOIN/ANSWER no
  // pisen el objeto de sesión entre sí.
  let cola = Promise.resolve();
  const encolar = (fn) => {
    cola = cola.then(fn, fn).catch((e) => console.warn('LAN host, op falló:', e?.message || e));
    return cola;
  };

  // Difundir el estado completo en cada cambio de la sesión local.
  const unsubStore = store.subscribe(pin, (sesion) => {
    transport.broadcast(state(pin, sesion));
  });

  const offMsg = transport.onMessage((msg) => {
    if (!msg || !msg.type) return;
    const cid = msg.clientId;

    switch (msg.type) {
      case MSG.HELLO: {
        store.getSesion(pin).then((sesion) => {
          const existe = !!sesion;
          const cerrada = existe && sesion.estado_actual === ESTADOS.RESULTADOS_FINALES;
          const ok = existe && !cerrada;
          transport.sendTo(cid, welcome(pin, ok, ok ? null : (existe ? 'cerrada' : 'no_existe')));
          if (ok) transport.sendTo(cid, state(pin, sesion)); // snapshot inicial
        });
        break;
      }
      case MSG.JOIN: {
        encolar(async () => {
          try {
            const studentId = await local.registrarEstudianteEnSala(
              pin, msg.nombre, msg.grado, msg.studentId
            );
            transport.sendTo(cid, joined(msg.reqId, studentId, null));
          } catch (e) {
            transport.sendTo(cid, joined(msg.reqId, null, e?.message || 'error'));
          }
        });
        break;
      }
      case MSG.ANSWER: {
        encolar(async () => {
          const ok = await local.registrarRespuesta(
            pin, msg.studentId, msg.preguntaIdx, msg.opcionIdx
          );
          transport.sendTo(cid, answerAck(msg.reqId, ok));
        });
        break;
      }
      case MSG.CLOCK_PING: {
        // Respuesta inmediata con el reloj del host (autoridad de tiempo).
        transport.sendTo(cid, clockPong(msg.reqId, msg.t0));
        break;
      }
      default:
        break;
    }
  });

  transport.start();

  return {
    stop() {
      try { unsubStore(); } catch { /* ignore */ }
      try { offMsg(); } catch { /* ignore */ }
      try { transport.close(); } catch { /* ignore */ }
    },
  };
}
