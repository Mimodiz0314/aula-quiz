// ---------------------------------------------------------------------------
// LOCAL BACKEND (IndexedDB)
// Motor OFFLINE: implementa la misma interfaz que cloudBackend pero contra el
// almacén local (localStore.js). Reutiliza IDÉNTICAMENTE las utilidades puras
// de la app —separarLista/fusionarLista (clave.js), evaluarEstudiante
// (grading.js), calcularJuego/calcularPuestos (scoring.js)— de modo que las
// notas, puntos, racha y puestos se calculan EXACTAMENTE igual que online. Solo
// cambia el transporte de lectura/escritura.
//
// Sustituciones de primitivas Firebase:
//   serverTimestamp()        → Date.now()
//   push().key               → crypto.randomUUID()
//   signInAnonymously / auth → UID local (localIdentity)
//   onDisconnect / presencia → no aplica (un dispositivo): conectado=true
//   onValue                  → emisor reactivo de localStore (subscribe)
// ---------------------------------------------------------------------------

import { generatePin } from '../../utils/pin.js';
import { evaluarEstudiante } from '../../utils/grading.js';
import { calcularJuego, calcularPuestos } from '../../utils/scoring.js';
import { separarLista, fusionarLista } from '../../utils/clave.js';
import { getEffectiveLocalUid, getDeviceUid } from '../localIdentity.js';
import * as store from '../localStore.js';
import { encolarHistorial } from '../syncQueue.js';

// `ESTADOS` con una sola fuente de verdad (cloudBackend), re-exportado.
import { ESTADOS } from './cloudBackend.js';
export { ESTADOS };

// Marcador para que el despachador distinga este motor del de nube.
export const __esLocal = true;

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ---------- DOCENTE ----------

export async function crearSesion(preguntas, tema = '', meta = {}) {
  const docenteUid = getEffectiveLocalUid();
  if (!docenteUid) throw new Error('No hay identidad local disponible.');

  const { publicas, claves } = separarLista(preguntas);

  for (let intento = 0; intento < 5; intento++) {
    const pin = generatePin();
    const existe = await store.getSesion(pin);
    if (existe) continue;

    // En local siempre guardamos las claves aparte (sin depender de reglas).
    await store.putClaves(pin, claves);
    await store.putSesion(pin, {
      creada_en: Date.now(),
      docente_uid: docenteUid,
      estado_actual: ESTADOS.LOBBY,
      pregunta_idx: -1,
      pregunta_inicio_ts: null,
      pregunta_duracion: 0,
      preguntas: publicas,
      tema,
      grado: meta.grado || '',
      dificultad: meta.dificultad || '',
      estudiantes: {},
      _origen: 'local', // marca para el selector y la cola de sincronización
    });
    return pin;
  }
  throw new Error('No se pudo asignar un PIN único, intenta de nuevo.');
}

export async function obtenerSesion(pin) {
  return store.getSesion(pin);
}

export async function obtenerClaves(pin) {
  return store.getClaves(pin);
}

export async function setDuracion(pin, segundos) {
  const sesion = await store.getSesion(pin);
  if (!sesion) return;
  sesion.pregunta_duracion = segundos;
  await store.putSesion(pin, sesion);
}

export async function iniciarSesion(pin) {
  const sesion = await store.getSesion(pin);
  if (!sesion) return;
  sesion.estado_actual = ESTADOS.PREGUNTA_ACTIVA;
  sesion.pregunta_idx = 0;
  sesion.pregunta_inicio_ts = Date.now();
  await store.putSesion(pin, sesion);
}

export async function marcarTiempoAgotado(pin) {
  const sesion = await store.getSesion(pin);
  if (!sesion) return;
  sesion.estado_actual = ESTADOS.TIEMPO_AGOTADO;
  await store.putSesion(pin, sesion);
}

export async function revelarRespuesta(pin) {
  const sesion = await store.getSesion(pin);
  if (!sesion) return;
  const claves = await store.getClaves(pin);
  const preguntas = fusionarLista(sesion.preguntas || [], claves);
  const estudiantes = sesion.estudiantes || {};
  const duracion = sesion.pregunta_duracion || 0;
  const hastaIdx = sesion.pregunta_idx ?? -1;

  // Mismo algoritmo que la nube (ver cloudBackend.revelarRespuesta), pero
  // mutando el objeto local en vez de construir paths de update().
  const habiaPuntos = Object.values(estudiantes).some((e) => (e.puntos_juego || 0) > 0);
  const puestosPrevios = calcularPuestos(estudiantes);

  sesion.estado_actual = ESTADOS.RESPUESTA_REVELADA;
  sesion.revelacion = {
    idx: hastaIdx,
    clave: (claves && hastaIdx >= 0 ? claves[hastaIdx] : null) || {},
  };

  const nuevosPuntos = {};
  Object.entries(estudiantes).forEach(([id, est]) => {
    const { nota } = evaluarEstudiante(est, preguntas);
    est.nota_acumulada = nota;

    const { puntos, racha } = calcularJuego(est, preguntas, duracion, hastaIdx);
    est.puntos_juego = puntos;
    est.racha = racha;
    nuevosPuntos[id] = puntos;
  });

  const idsOrdenados = Object.keys(estudiantes).sort((a, b) => {
    const diff = (nuevosPuntos[b] || 0) - (nuevosPuntos[a] || 0);
    if (diff !== 0) return diff;
    return (estudiantes[b].nota_acumulada || 0) - (estudiantes[a].nota_acumulada || 0);
  });
  idsOrdenados.forEach((id, i) => {
    estudiantes[id].puesto = i + 1;
    estudiantes[id].puesto_previo = habiaPuntos ? (puestosPrevios[id] || (i + 1)) : (i + 1);
  });

  await store.putSesion(pin, sesion);
}

export async function siguientePregunta(pin) {
  const sesion = await store.getSesion(pin);
  if (!sesion) return;
  const total = (sesion.preguntas || []).length;
  const nuevaIdx = (sesion.pregunta_idx ?? -1) + 1;

  if (nuevaIdx >= total) {
    sesion.estado_actual = ESTADOS.RESULTADOS_FINALES;
    await store.putSesion(pin, sesion);
    return;
  }

  sesion.estado_actual = ESTADOS.PREGUNTA_ACTIVA;
  sesion.pregunta_idx = nuevaIdx;
  sesion.pregunta_inicio_ts = Date.now();
  await store.putSesion(pin, sesion);
}

export async function cerrarSesion(pin) {
  const sesion = await store.getSesion(pin);
  if (sesion) {
    const docenteUid = sesion.docente_uid || getEffectiveLocalUid();
    if (docenteUid) {
      const claves = await store.getClaves(pin);
      const preguntas = fusionarLista(sesion.preguntas || [], claves);
      const estudiantes = sesion.estudiantes || {};

      const resultados = Object.entries(estudiantes).map(([id, est]) => {
        const { aciertos, nota } = evaluarEstudiante(est, preguntas);
        return {
          id,
          nombre: est.nombre || 'Sin nombre',
          grado: est.grado || '',
          aciertos,
          nota: parseFloat(nota.toFixed(1)),
          total: preguntas.length,
        };
      }).sort((a, b) => b.nota - a.nota);

      const promedio = resultados.length > 0
        ? parseFloat((resultados.reduce((s, r) => s + r.nota, 0) / resultados.length).toFixed(1))
        : 0;

      const key = uuid();
      const entry = {
        pin,
        tema: sesion.tema || '',
        grado: sesion.grado || '',
        dificultad: sesion.dificultad || '',
        creada_en: sesion.creada_en || Date.now(),
        cerrada_en: Date.now(),
        total_preguntas: preguntas.length,
        total_estudiantes: resultados.length,
        promedio_grupo: promedio,
        preguntas,
        resultados,
        _origen: 'local',
      };
      await store.putHistorial(docenteUid, key, entry);
      // Encolar para subir a la nube cuando vuelva el internet.
      try { await encolarHistorial(entry); } catch (e) { console.warn('No se pudo encolar el historial:', e); }
    }
  }

  await store.deleteSesion(pin);
  await store.deleteClaves(pin);
}

export async function eliminarSesion(pin) {
  await store.deleteSesion(pin);
  await store.deleteClaves(pin);
}

export async function eliminarHistorial(key) {
  const docenteUid = getEffectiveLocalUid();
  if (!docenteUid) throw new Error('No hay identidad local disponible.');
  await store.deleteHistorial(docenteUid, key);
}

export async function obtenerHistorialDocente() {
  const docenteUid = getEffectiveLocalUid();
  if (!docenteUid) throw new Error('No hay identidad local disponible.');
  const history = await store.getHistorialPorUid(docenteUid);
  return history.sort((a, b) => (b.cerrada_en || 0) - (a.cerrada_en || 0));
}

// ---------- ESTUDIANTE ----------

export async function validarPin(pin) {
  const sesion = await store.getSesion(pin);
  if (!sesion) return { ok: false, reason: 'no_existe' };
  if (sesion.estado_actual === ESTADOS.RESULTADOS_FINALES) {
    return { ok: false, reason: 'cerrada' };
  }
  return { ok: true };
}

export async function registrarEstudiante(pin, nombre, grado) {
  const sesion = await store.getSesion(pin);
  if (!sesion) throw new Error('La sala no existe.');
  sesion.estudiantes = sesion.estudiantes || {};

  const uid = getDeviceUid(); // sin auth: identidad del dispositivo
  const storageKey = `quiz_student_${pin}`;
  const guardado = localStorage.getItem(storageKey);
  if (guardado) {
    const { studentId, nombre: nombreGuardado } = JSON.parse(guardado);
    if (
      nombreGuardado.toLowerCase() === nombre.toLowerCase() &&
      sesion.estudiantes[studentId]
    ) {
      // Reconexión: marcar conectado.
      sesion.estudiantes[studentId].conectado = true;
      sesion.estudiantes[studentId].uid = uid;
      await store.putSesion(pin, sesion);
      return studentId;
    }
  }

  // Colisión de nombre (case-insensitive).
  const colision = Object.values(sesion.estudiantes).some(
    (e) => e.nombre?.toLowerCase() === nombre.toLowerCase()
  );
  if (colision) throw new Error('Ya existe un estudiante con ese nombre.');

  const studentId = uuid();
  sesion.estudiantes[studentId] = {
    uid,
    nombre,
    grado,
    conectado: true,
    respuestas_registradas: {},
    unido_en: Date.now(),
  };
  await store.putSesion(pin, sesion);

  localStorage.setItem(storageKey, JSON.stringify({ studentId, nombre, grado }));
  return studentId;
}

export async function registrarRespuesta(pin, studentId, preguntaIdx, opcionIdx) {
  const sesion = await store.getSesion(pin);
  if (!sesion) return false;

  const estadosPermitidos = [ESTADOS.PREGUNTA_ACTIVA, ESTADOS.TIEMPO_AGOTADO];
  if (!estadosPermitidos.includes(sesion.estado_actual)) return false;
  if (sesion.pregunta_idx !== preguntaIdx) return false;

  const est = sesion.estudiantes?.[studentId];
  if (!est) return false;
  est.respuestas_registradas = est.respuestas_registradas || {};
  est.respuestas_registradas[preguntaIdx] = opcionIdx;

  // Tiempo de respuesta (offset 0 en local; no hay reloj de servidor).
  const inicio = sesion.pregunta_inicio_ts;
  if (inicio) {
    est.tiempos_respuesta = est.tiempos_respuesta || {};
    est.tiempos_respuesta[preguntaIdx] = Math.max(0, Date.now() - inicio);
  }

  await store.putSesion(pin, sesion);
  return true;
}

// ---------- LISTENERS ----------

export function suscribirSesion(pin, callback) {
  return store.subscribe(pin, callback);
}
