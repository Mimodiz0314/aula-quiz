// ---------------------------------------------------------------------------
// SESSION SERVICE — DESPACHADOR
// Esta es la ÚNICA costura entre la UI y la capa de datos. Todas las pantallas
// importan sus funciones desde aquí. El cuerpo real vive en los motores:
//   - backends/cloudBackend.js  → Firebase (online, el código de siempre)
//   - backends/localBackend.js  → IndexedDB (offline)
//
// El backendSelector decide qué motor usar en cada llamada. Con el feature flag
// APAGADO (por defecto en producción) el selector devuelve SIEMPRE la nube, así
// que el comportamiento online queda intacto. La UI no cambia: mismas firmas,
// mismos nombres exportados, mismo `ESTADOS`.
// ---------------------------------------------------------------------------

import {
  pickBackend,
  pickBackendForPin,
  addLocalPin,
  removeLocalPin,
  isLocalPin,
} from './backendSelector.js';

// `ESTADOS` tiene una sola fuente de verdad (cloudBackend) y se re-exporta para
// que los consumidores sigan importándolo desde esta misma ruta.
export { ESTADOS } from './backends/cloudBackend.js';

// ---------- DOCENTE ----------
export async function crearSesion(preguntas, tema = '', meta = {}) {
  const be = pickBackend();
  const pin = await be.crearSesion(preguntas, tema, meta);
  // Si la sesión nació en el motor local, la registramos para que el resto de
  // operaciones sobre ese pin sigan yendo a local hasta sincronizarse.
  if (be.__esLocal) addLocalPin(pin);
  return pin;
}
export function obtenerSesion(pin) {
  return pickBackendForPin(pin).obtenerSesion(pin);
}
export function obtenerClaves(pin) {
  return pickBackendForPin(pin).obtenerClaves(pin);
}
export function setDuracion(pin, segundos) {
  return pickBackendForPin(pin).setDuracion(pin, segundos);
}
export function iniciarSesion(pin) {
  return pickBackendForPin(pin).iniciarSesion(pin);
}
export function marcarTiempoAgotado(pin) {
  return pickBackendForPin(pin).marcarTiempoAgotado(pin);
}
export function iniciarTemporizador(pin, segundos) {
  return pickBackendForPin(pin).iniciarTemporizador(pin, segundos);
}
export function revelarRespuesta(pin) {
  return pickBackendForPin(pin).revelarRespuesta(pin);
}
export function siguientePregunta(pin) {
  return pickBackendForPin(pin).siguientePregunta(pin);
}
export async function cerrarSesion(pin) {
  const local = isLocalPin(pin);
  await pickBackendForPin(pin).cerrarSesion(pin);
  if (local) removeLocalPin(pin);
}
export async function eliminarSesion(pin) {
  const local = isLocalPin(pin);
  await pickBackendForPin(pin).eliminarSesion(pin);
  if (local) removeLocalPin(pin);
}
export function eliminarHistorial(key) {
  return pickBackend().eliminarHistorial(key);
}
export function obtenerHistorialDocente() {
  return pickBackend().obtenerHistorialDocente();
}

// ---------- ESTUDIANTE ----------
export function validarPin(pin) {
  return pickBackendForPin(pin).validarPin(pin);
}
export function registrarEstudiante(pin, nombre, grado) {
  return pickBackendForPin(pin).registrarEstudiante(pin, nombre, grado);
}
export function registrarRespuesta(pin, studentId, preguntaIdx, opcionIdx) {
  return pickBackendForPin(pin).registrarRespuesta(pin, studentId, preguntaIdx, opcionIdx);
}

// ---------- LISTENERS ----------
export function suscribirSesion(pin, callback) {
  return pickBackendForPin(pin).suscribirSesion(pin, callback);
}
