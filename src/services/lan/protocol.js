// ---------------------------------------------------------------------------
// LAN PROTOCOL — mensajes entre el HOST (docente) y los CLIENTES (alumnos)
// Transporte: WebSocket en producción (host nativo/PC) o un transporte de
// pruebas en pura web. Los mensajes son objetos JSON con un campo `type`.
//
// Modelo estrella: el host es la fuente de verdad. El cliente envía intenciones
// (JOIN, ANSWER) y recibe el estado completo (STATE) para renderizar igual que
// con Firebase. El host nunca confía en cálculos del cliente.
// ---------------------------------------------------------------------------

export const PROTOCOL_VERSION = 1;

export const MSG = Object.freeze({
  // cliente → host
  HELLO: 'HELLO',          // { pin, clientId, v }            al conectar
  JOIN: 'JOIN',            // { pin, clientId, nombre, grado, reqId }
  ANSWER: 'ANSWER',        // { pin, clientId, studentId, preguntaIdx, opcionIdx, reqId }
  CLOCK_PING: 'CLOCK_PING',// { clientId, t0, reqId }
  BYE: 'BYE',              // { clientId }

  // host → cliente
  WELCOME: 'WELCOME',      // { ok, reason?, pin, v }          respuesta a HELLO
  JOINED: 'JOINED',        // { reqId, studentId?, error? }    respuesta a JOIN
  ANSWER_ACK: 'ANSWER_ACK',// { reqId, ok }                    respuesta a ANSWER
  STATE: 'STATE',          // { pin, sesion }                  snapshot completo (broadcast)
  CLOCK_PONG: 'CLOCK_PONG',// { reqId, t0, tHost }             respuesta a CLOCK_PING
  ERROR: 'ERROR',          // { reason }
});

// --- Builders (cliente) ---
export const hello = (pin, clientId, token) => ({ type: MSG.HELLO, pin, clientId, token: token || null, v: PROTOCOL_VERSION });
export const join = (pin, clientId, nombre, grado, reqId, studentId) =>
  ({ type: MSG.JOIN, pin, clientId, nombre, grado, reqId, studentId: studentId || null });
export const answer = (pin, clientId, studentId, preguntaIdx, opcionIdx, reqId) =>
  ({ type: MSG.ANSWER, pin, clientId, studentId, preguntaIdx, opcionIdx, reqId });
export const clockPing = (clientId, reqId) => ({ type: MSG.CLOCK_PING, clientId, t0: Date.now(), reqId });
export const bye = (clientId) => ({ type: MSG.BYE, clientId });

// --- Builders (host) ---
export const welcome = (pin, ok, reason) => ({ type: MSG.WELCOME, pin, ok, reason: reason || null, v: PROTOCOL_VERSION });
export const joined = (reqId, studentId, error) => ({ type: MSG.JOINED, reqId, studentId: studentId || null, error: error || null });
export const answerAck = (reqId, ok) => ({ type: MSG.ANSWER_ACK, reqId, ok: !!ok });
export const state = (pin, sesion) => ({ type: MSG.STATE, pin, sesion: sesion || null });
export const clockPong = (reqId, t0) => ({ type: MSG.CLOCK_PONG, reqId, t0, tHost: Date.now() });
export const errorMsg = (reason) => ({ type: MSG.ERROR, reason });

// Identificador efímero de cliente (por conexión, distinto del studentId).
export function newClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'c-' + crypto.randomUUID();
  return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function newReqId() {
  return Math.random().toString(36).slice(2, 10);
}

// Serialización defensiva (no lanza).
export function encode(obj) {
  try { return JSON.stringify(obj); } catch { return null; }
}
export function decode(str) {
  if (typeof str !== 'string') return str && typeof str === 'object' ? str : null;
  try { return JSON.parse(str); } catch { return null; }
}
