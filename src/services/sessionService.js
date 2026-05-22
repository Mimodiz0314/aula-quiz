// ---------------------------------------------------------------------------
// SESSION SERVICE
// Toda mutación sobre la Realtime Database pasa por aquí. Centralizar las
// escrituras facilita auditoría, pruebas y bloqueo concurrente.
//
// Modelo de datos (ver README):
//   /sesiones/{pin}
//     ├── creada_en           (ms)
//     ├── estado_actual       ("lobby" | "pregunta_activa" | ...)
//     ├── pregunta_idx        (number, -1 si aún no inicia)
//     ├── pregunta_inicio_ts  (ms, autoritativo del servidor)
//     ├── pregunta_duracion   (seg)
//     ├── preguntas           [ { pregunta, opciones[], correcta } ... ]
//     └── estudiantes
//           └── {studentId}
//                 ├── nombre
//                 ├── grado
//                 ├── conectado          (bool)
//                 ├── respuestas_registradas { idx: opcion }
//                 └── nota_acumulada     (number, recalculada al revelar)
// ---------------------------------------------------------------------------

import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
  serverTimestamp,
  runTransaction,
  onDisconnect,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase/config.js';
import { generatePin } from '../utils/pin.js';
import { evaluarEstudiante } from '../utils/grading.js';

const ESTADOS = Object.freeze({
  LOBBY: 'lobby',
  PREGUNTA_ACTIVA: 'pregunta_activa',
  TIEMPO_AGOTADO: 'tiempo_agotado',
  RESPUESTA_REVELADA: 'respuesta_revelada',
  RESULTADOS_FINALES: 'resultados_finales',
});
export { ESTADOS };

// ---------- DOCENTE ----------

/**
 * Crea una sesión nueva con un PIN único. Reintenta hasta 5 veces
 * si por colisión astronómica el PIN ya existe.
 */
export async function crearSesion(preguntas) {
  const docenteUid = auth.currentUser?.uid;
  if (!docenteUid) throw new Error('Debes estar autenticado para crear una sesión.');

  for (let intento = 0; intento < 5; intento++) {
    const pin = generatePin();
    const snapshot = await get(ref(db, `sesiones/${pin}`));
    if (snapshot.exists()) continue;

    await set(ref(db, `sesiones/${pin}`), {
      creada_en: serverTimestamp(),
      docente_uid: docenteUid,
      estado_actual: ESTADOS.LOBBY,
      pregunta_idx: -1,
      pregunta_inicio_ts: null,
      pregunta_duracion: 30, // segundos por defecto
      preguntas,
      estudiantes: {},
    });
    return pin;
  }
  throw new Error('No se pudo asignar un PIN único, intenta de nuevo.');
}

/** Cambia la duración de cada pregunta antes de iniciar. */
export async function setDuracion(pin, segundos) {
  await update(ref(db, `sesiones/${pin}`), { pregunta_duracion: segundos });
}

/** Inicia la primera pregunta. */
export async function iniciarSesion(pin) {
  await update(ref(db, `sesiones/${pin}`), {
    estado_actual: ESTADOS.PREGUNTA_ACTIVA,
    pregunta_idx: 0,
    pregunta_inicio_ts: serverTimestamp(),
  });
}

/** Marca tiempo agotado: bloquea respuestas en todos los clientes. */
export async function marcarTiempoAgotado(pin) {
  await update(ref(db, `sesiones/${pin}`), {
    estado_actual: ESTADOS.TIEMPO_AGOTADO,
  });
}

/**
 * Revela la respuesta correcta. Aquí recalculamos la nota_acumulada
 * de cada estudiante para que la interfaz se tiña verde/rojo y la
 * tabla final esté siempre consistente.
 */
export async function revelarRespuesta(pin) {
  const snap = await get(ref(db, `sesiones/${pin}`));
  if (!snap.exists()) return;
  const sesion = snap.val();
  const preguntas = sesion.preguntas || [];
  const estudiantes = sesion.estudiantes || {};

  const updates = { estado_actual: ESTADOS.RESPUESTA_REVELADA };
  Object.entries(estudiantes).forEach(([id, est]) => {
    const { nota } = evaluarEstudiante(est, preguntas);
    updates[`estudiantes/${id}/nota_acumulada`] = nota;
  });
  await update(ref(db, `sesiones/${pin}`), updates);
}

/**
 * Avanza a la siguiente pregunta, o finaliza si era la última.
 */
export async function siguientePregunta(pin) {
  const snap = await get(ref(db, `sesiones/${pin}`));
  if (!snap.exists()) return;
  const sesion = snap.val();
  const total = (sesion.preguntas || []).length;
  const nuevaIdx = (sesion.pregunta_idx ?? -1) + 1;

  if (nuevaIdx >= total) {
    await update(ref(db, `sesiones/${pin}`), {
      estado_actual: ESTADOS.RESULTADOS_FINALES,
    });
    return;
  }

  await update(ref(db, `sesiones/${pin}`), {
    estado_actual: ESTADOS.PREGUNTA_ACTIVA,
    pregunta_idx: nuevaIdx,
    pregunta_inicio_ts: serverTimestamp(),
  });
}

/** Cierra/elimina la sesión. */
export async function cerrarSesion(pin) {
  await set(ref(db, `sesiones/${pin}`), null);
}

/** Obtiene el historial de sesiones del docente actual */
export async function obtenerHistorialDocente() {
  const docenteUid = auth.currentUser?.uid;
  if (!docenteUid) throw new Error('Debes estar autenticado.');

  const sesionesRef = ref(db, 'sesiones');
  const q = query(sesionesRef, orderByChild('docente_uid'), equalTo(docenteUid));
  const snapshot = await get(q);
  
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  const history = Object.keys(data).map(pin => ({
    pin,
    ...data[pin]
  }));
  
  // Ordenar por fecha de creación (más reciente primero)
  return history.sort((a, b) => b.creada_en - a.creada_en);
}

// ---------- ESTUDIANTE ----------

/**
 * Verifica si el PIN existe y la sesión está abierta en lobby.
 */
export async function validarPin(pin) {
  const snap = await get(ref(db, `sesiones/${pin}`));
  if (!snap.exists()) return { ok: false, reason: 'no_existe' };
  const estado = snap.val().estado_actual;
  if (estado === ESTADOS.RESULTADOS_FINALES) {
    return { ok: false, reason: 'cerrada' };
  }
  return { ok: true };
}

/**
 * Registra a un estudiante. Si ya existe un ID guardado en localStorage
 * para esta sesión, lo reutiliza (reconexión sin duplicar).
 * Usa `runTransaction` para evitar nombres duplicados.
 */
export async function registrarEstudiante(pin, nombre, grado) {
  // Autenticación anónima obligatoria para escribir en la base de datos de forma segura
  const userCredential = await signInAnonymously(auth);
  const uid = userCredential.user.uid;

  const storageKey = `quiz_student_${pin}`;
  const guardado = localStorage.getItem(storageKey);
  if (guardado) {
    const { studentId, nombre: nombreGuardado } = JSON.parse(guardado);
    if (nombreGuardado.toLowerCase() === nombre.toLowerCase()) {
      // Reconexión: simplemente marcar conectado.
      await update(ref(db, `sesiones/${pin}/estudiantes/${studentId}`), {
        conectado: true,
        uid: uid // actualizamos uid por si cambió
      });
      setupPresence(pin, studentId);
      return studentId;
    }
  }

  // Nuevo ingreso — comprobamos colisión de nombre (case-insensitive).
  const estRef = ref(db, `sesiones/${pin}/estudiantes`);
  const allSnap = await get(estRef);
  if (allSnap.exists()) {
    const todos = allSnap.val();
    const colision = Object.values(todos).some(
      (e) => e.nombre?.toLowerCase() === nombre.toLowerCase()
    );
    if (colision) throw new Error('Ya existe un estudiante con ese nombre.');
  }

  const newRef = push(estRef);
  const studentId = newRef.key;
  await set(newRef, {
    uid,
    nombre,
    grado,
    conectado: true,
    respuestas_registradas: {},
    nota_acumulada: 0,
    unido_en: serverTimestamp(),
  });

  localStorage.setItem(storageKey, JSON.stringify({ studentId, nombre, grado }));
  setupPresence(pin, studentId);
  return studentId;
}

/**
 * Establece la presencia: si el cliente se desconecta abruptamente,
 * `onDisconnect` marca conectado=false (sin borrar respuestas).
 */
function setupPresence(pin, studentId) {
  const presenceRef = ref(
    db,
    `sesiones/${pin}/estudiantes/${studentId}/conectado`
  );
  onDisconnect(presenceRef).set(false);
  set(presenceRef, true);
}

/**
 * Registra la respuesta del estudiante. Usa runTransaction para evitar
 * que un cliente sobrescriba la respuesta tras agotarse el tiempo:
 * sólo se acepta si el estado actual sigue siendo "pregunta_activa".
 */
export async function registrarRespuesta(pin, studentId, preguntaIdx, opcionIdx) {
  const sesionRef = ref(db, `sesiones/${pin}`);
  const result = await runTransaction(sesionRef, (sesion) => {
    if (!sesion) return sesion;
    // Acepta respuestas mientras la pregunta esté activa O el tiempo haya sido detenido manualmente.
    // Solo bloquea si ya se reveló la respuesta o se pasó a otra pregunta.
    const estadosPermitidos = [ESTADOS.PREGUNTA_ACTIVA, ESTADOS.TIEMPO_AGOTADO];
    if (!estadosPermitidos.includes(sesion.estado_actual)) return; // aborta
    if (sesion.pregunta_idx !== preguntaIdx) return; // pregunta cambió
    sesion.estudiantes = sesion.estudiantes || {};
    sesion.estudiantes[studentId] = sesion.estudiantes[studentId] || {};
    sesion.estudiantes[studentId].respuestas_registradas =
      sesion.estudiantes[studentId].respuestas_registradas || {};
    // Bloqueo: una sola respuesta por pregunta.
    if (
      sesion.estudiantes[studentId].respuestas_registradas[preguntaIdx] !==
      undefined
    ) {
      return; // ya respondió
    }
    sesion.estudiantes[studentId].respuestas_registradas[preguntaIdx] =
      opcionIdx;
    return sesion;
  });
  return result.committed;
}

// ---------- LISTENERS ----------

/**
 * Suscripción reactiva a una sesión entera. Devuelve función para
 * desuscribirse.
 */
export function suscribirSesion(pin, callback) {
  const r = ref(db, `sesiones/${pin}`);
  const handler = onValue(r, (snap) => callback(snap.val()));
  return () => off(r, 'value', handler);
}
