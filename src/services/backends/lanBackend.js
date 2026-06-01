// ---------------------------------------------------------------------------
// LAN BACKEND — motor de red local (asimétrico host/cliente)
// Implementa la MISMA interfaz que cloud/local. El comportamiento depende del
// rol del dispositivo para ese pin:
//   - HOST (docente): delega en localBackend (es la fuente de verdad) y, por
//     separado, corre lanHost para difundir el estado a los alumnos.
//   - CLIENTE (alumno): proxy delgado que traduce cada llamada a mensajes sobre
//     el transporte y cachea el último STATE recibido (semántica onValue).
//
// El rol se fija al ENTRAR a la sesión LAN:
//   iniciarHostLAN(pin, hostTransport)      → registra pin como host
//   conectarClienteLAN(pin, clientTransport)→ crea gestor cliente (Promise ready)
//
// Mientras no se entra en modo LAN, este motor no se usa (el selector solo lo
// elige para pines LAN registrados, y todo está detrás del feature flag).
// ---------------------------------------------------------------------------

import * as local from './localBackend.js';
import { ESTADOS } from './cloudBackend.js';
import { createLanHost } from '../lan/lanHost.js';
import {
  MSG, hello, join, answer, clockPing, newClientId, newReqId,
} from '../lan/protocol.js';

export { ESTADOS };
export const __esLan = true;

// Estado del módulo.
const hostPins = new Set();          // pines donde este dispositivo es host
const hosts = new Map();             // pin -> controlador lanHost
const clients = new Map();           // pin -> gestor cliente
let clienteActivo = null;            // gestor cliente "actual" (para el reloj)

export function isLanPin(pin) {
  return hostPins.has(String(pin)) || clients.has(String(pin));
}

// ---------------------------------------------------------------------------
// ROL HOST
// ---------------------------------------------------------------------------
export function iniciarHostLAN(pin, hostTransport, token = null) {
  pin = String(pin);
  if (hosts.has(pin)) return hosts.get(pin);
  hostPins.add(pin);
  const ctrl = createLanHost(pin, hostTransport, token);
  hosts.set(pin, ctrl);
  return ctrl;
}

export function detenerHostLAN(pin) {
  pin = String(pin);
  const ctrl = hosts.get(pin);
  if (ctrl) ctrl.stop();
  hosts.delete(pin);
  hostPins.delete(pin);
}

// ---------------------------------------------------------------------------
// ROL CLIENTE
// ---------------------------------------------------------------------------
function createClientManager(pin, transport, token = null) {
  const clientId = newClientId();
  let lastSnapshot = null;
  let welcome = null;                 // { ok, reason }
  const subs = new Set();             // suscriptores de sesión
  const offsetSubs = new Set();       // suscriptores de offset de reloj
  const pending = new Map();          // reqId -> resolve
  let offset = 0;
  let clockTimer = null;

  let resolveReady;
  const ready = new Promise((res) => { resolveReady = res; });

  function notifySnapshot() {
    subs.forEach((cb) => { try { cb(lastSnapshot); } catch (e) { console.error(e); } });
  }
  function notifyOffset() {
    offsetSubs.forEach((cb) => { try { cb(offset); } catch (e) { console.error(e); } });
  }

  transport.onMessage((msg) => {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case MSG.WELCOME:
        welcome = { ok: !!msg.ok, reason: msg.reason || null };
        resolveReady(welcome);
        break;
      case MSG.STATE:
        if (String(msg.pin) === pin) { lastSnapshot = msg.sesion; notifySnapshot(); }
        break;
      case MSG.JOINED: {
        const r = pending.get(msg.reqId);
        if (r) { pending.delete(msg.reqId); r({ studentId: msg.studentId, error: msg.error }); }
        break;
      }
      case MSG.ANSWER_ACK: {
        const r = pending.get(msg.reqId);
        if (r) { pending.delete(msg.reqId); r(!!msg.ok); }
        break;
      }
      case MSG.CLOCK_PONG: {
        // Offset estilo NTP: rtt = ahora - t0; offset ≈ tHost + rtt/2 - ahora.
        const ahora = Date.now();
        const rtt = ahora - msg.t0;
        offset = Math.round(msg.tHost + rtt / 2 - ahora);
        notifyOffset();
        break;
      }
      default: break;
    }
  });

  transport.onStatus((s) => {
    if (s === 'open') {
      transport.send(hello(pin, clientId, token));
      pingReloj();
      clockTimer = setInterval(pingReloj, 10000);
    }
  });

  function pingReloj() {
    transport.send(clockPing(clientId, newReqId()));
  }

  transport.start();

  function enviarConRespuesta(buildMsg) {
    const reqId = newReqId();
    return new Promise((resolve) => {
      pending.set(reqId, resolve);
      transport.send(buildMsg(reqId));
      // Timeout defensivo: si el host no responde, resolvemos con fallo suave.
      setTimeout(() => {
        if (pending.has(reqId)) { pending.delete(reqId); resolve(undefined); }
      }, 8000);
    });
  }

  const storageKey = `quiz_student_${pin}`;

  return {
    ready,
    getSnapshot() { return lastSnapshot; },
    getOffset() { return offset; },
    subscribeOffset(cb) { offsetSubs.add(cb); cb(offset); return () => offsetSubs.delete(cb); },

    async validarPin() {
      const w = await ready;
      return w?.ok ? { ok: true } : { ok: false, reason: w?.reason || 'no_existe' };
    },

    suscribir(cb) {
      subs.add(cb);
      // Disparo inicial inmediato (semántica onValue).
      Promise.resolve().then(() => { if (subs.has(cb)) cb(lastSnapshot); });
      return () => subs.delete(cb);
    },

    async registrarEstudiante(nombre, grado) {
      // Reconexión: si este dispositivo ya tenía id para esta sala y el nombre
      // coincide, lo reenviamos para que el host reconecte sin duplicar.
      let existing = null;
      try {
        const g = localStorage.getItem(storageKey);
        if (g) {
          const obj = JSON.parse(g);
          if (obj?.nombre?.toLowerCase() === nombre.toLowerCase()) existing = obj.studentId;
        }
      } catch { /* ignore */ }

      const res = await enviarConRespuesta((reqId) => join(pin, clientId, nombre, grado, reqId, existing));
      if (!res) throw new Error('Sin respuesta del host. Revisa la conexión a la red del docente.');
      if (res.error) throw new Error(res.error);
      try { localStorage.setItem(storageKey, JSON.stringify({ studentId: res.studentId, nombre, grado })); } catch { /* ignore */ }
      return res.studentId;
    },

    async registrarRespuesta(studentId, preguntaIdx, opcionIdx) {
      const ok = await enviarConRespuesta((reqId) => answer(pin, clientId, studentId, preguntaIdx, opcionIdx, reqId));
      return !!ok;
    },

    stop() {
      if (clockTimer) clearInterval(clockTimer);
      try { transport.close(); } catch { /* ignore */ }
    },
  };
}

export async function conectarClienteLAN(pin, clientTransport, token = null) {
  pin = String(pin);
  let mgr = clients.get(pin);
  if (!mgr) {
    mgr = createClientManager(pin, clientTransport, token);
    clients.set(pin, mgr);
  }
  clienteActivo = mgr;
  await mgr.ready;
  return mgr;
}

export function desconectarClienteLAN(pin) {
  pin = String(pin);
  const mgr = clients.get(pin);
  if (mgr) mgr.stop();
  clients.delete(pin);
  if (clienteActivo === mgr) clienteActivo = null;
}

// Para serverClock: ¿hay un cliente LAN activo? y su offset reactivo.
export function hayClienteLANActivo() { return !!clienteActivo; }
export function subscribeOffsetClienteLAN(cb) {
  if (!clienteActivo) { cb(0); return () => {}; }
  return clienteActivo.subscribeOffset(cb);
}

// ---------------------------------------------------------------------------
// INTERFAZ DEL MOTOR (despachada por sessionService)
// host → localBackend ; cliente → gestor de transporte.
// ---------------------------------------------------------------------------
function clientOf(pin) { return clients.get(String(pin)) || null; }

// --- Operaciones de DOCENTE: solo válidas en el host → delegan en local. ---
export const crearSesion = (...a) => local.crearSesion(...a);      // (no se usa en LAN: la sala ya existe)
export const setDuracion = (...a) => local.setDuracion(...a);
export const iniciarSesion = (...a) => local.iniciarSesion(...a);
export const marcarTiempoAgotado = (...a) => local.marcarTiempoAgotado(...a);
export const iniciarTemporizador = (...a) => local.iniciarTemporizador(...a);
export const revelarRespuesta = (...a) => local.revelarRespuesta(...a);
export const siguientePregunta = (...a) => local.siguientePregunta(...a);
export const cerrarSesion = (...a) => local.cerrarSesion(...a);
export const eliminarSesion = (...a) => local.eliminarSesion(...a);
export const eliminarHistorial = (...a) => local.eliminarHistorial(...a);
export const obtenerHistorialDocente = (...a) => local.obtenerHistorialDocente(...a);

// --- Lecturas: host lee local; cliente usa su último snapshot. ---
export async function obtenerSesion(pin) {
  const c = clientOf(pin);
  if (c) return c.getSnapshot();
  return local.obtenerSesion(pin);
}
export async function obtenerClaves(pin) {
  const c = clientOf(pin);
  if (c) return null; // el alumno NO recibe las claves (seguridad)
  return local.obtenerClaves(pin);
}

// --- Operaciones de ESTUDIANTE: cliente → transporte; host → local. ---
export async function validarPin(pin) {
  const c = clientOf(pin);
  if (c) return c.validarPin();
  return local.validarPin(pin);
}
export async function registrarEstudiante(pin, nombre, grado) {
  const c = clientOf(pin);
  if (c) return c.registrarEstudiante(nombre, grado);
  return local.registrarEstudianteEnSala(pin, nombre, grado);
}
export async function registrarRespuesta(pin, studentId, preguntaIdx, opcionIdx) {
  const c = clientOf(pin);
  if (c) return c.registrarRespuesta(studentId, preguntaIdx, opcionIdx);
  return local.registrarRespuesta(pin, studentId, preguntaIdx, opcionIdx);
}

// --- Suscripción: cliente a su snapshot; host al localStore. ---
export function suscribirSesion(pin, callback) {
  const c = clientOf(pin);
  if (c) return c.suscribir(callback);
  return local.suscribirSesion(pin, callback);
}
