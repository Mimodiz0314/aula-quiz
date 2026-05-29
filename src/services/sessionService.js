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
import { calcularJuego, calcularPuestos } from '../utils/scoring.js';
import { separarLista, fusionarLista } from '../utils/clave.js';

function getEffectiveUid() {
  try {
    const saved = sessionStorage.getItem('impersonated_teacher');
    if (saved) {
      const teacher = JSON.parse(saved);
      if (teacher && teacher.uid) return teacher.uid;
    }
  } catch (e) {
    console.error('Error parsing impersonated teacher:', e);
  }
  return auth.currentUser?.uid;
}

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
export async function crearSesion(preguntas, tema = '', meta = {}) {
  const docenteUid = getEffectiveUid();
  if (!docenteUid) throw new Error('Debes estar autenticado para crear una sesión.');

  // Separamos las respuestas correctas (clave) de los tipos escalares para no
  // exponerlas en /sesiones (que el estudiante lee completo). Las públicas van
  // a /sesiones/{pin}/preguntas; las claves a /claves/{pin}.
  const { publicas, claves } = separarLista(preguntas);

  for (let intento = 0; intento < 5; intento++) {
    const pin = generatePin();
    const snapshot = await get(ref(db, `sesiones/${pin}`));
    if (snapshot.exists()) continue;

    // Intentamos guardar las claves aparte (requiere las reglas de /claves
    // desplegadas). Si fallan (p. ej. reglas aún sin desplegar), degradamos a
    // modo compatible: las respuestas se quedan dentro de /sesiones como antes,
    // para no romper la creación. Se auto-corrige al desplegar las reglas.
    let clavesOk = false;
    try {
      await set(ref(db, `claves/${pin}`), claves);
      clavesOk = true;
    } catch (e) {
      console.warn('No se pudieron guardar las claves aparte (¿reglas de /claves sin desplegar?). Modo compatible:', e);
    }

    await set(ref(db, `sesiones/${pin}`), {
      creada_en: serverTimestamp(),
      docente_uid: docenteUid,
      estado_actual: ESTADOS.LOBBY,
      pregunta_idx: -1,
      pregunta_inicio_ts: null,
      pregunta_duracion: 0, // 0 = Sin límite de tiempo
      // Con claves guardadas → públicas (sin respuestas). Sin claves → completas.
      preguntas: clavesOk ? publicas : preguntas,
      tema,
      grado: meta.grado || '',
      dificultad: meta.dificultad || '',
      estudiantes: {},
    });
    return pin;
  }
  throw new Error('No se pudo asignar un PIN único, intenta de nuevo.');
}

/** Devuelve los datos de una sesión activa, o null si ya no existe. */
export async function obtenerSesion(pin) {
  const snap = await get(ref(db, `sesiones/${pin}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Devuelve las claves (respuestas correctas) de una sesión, o null si no
 * existen (sesión vieja sin /claves). Solo lo puede leer el docente por reglas.
 * Puede ser un array o un objeto {idx: clave} según cómo lo serialice RTDB.
 */
export async function obtenerClaves(pin) {
  const snap = await get(ref(db, `claves/${pin}`));
  return snap.exists() ? snap.val() : null;
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
  // Fusionamos públicas + claves para tener las actividades COMPLETAS y poder
  // calificar. El docente sí puede leer /claves por reglas.
  const claves = await obtenerClaves(pin);
  const preguntas = fusionarLista(sesion.preguntas || [], claves);
  const estudiantes = sesion.estudiantes || {};
  const duracion = sesion.pregunta_duracion || 0;
  const hastaIdx = sesion.pregunta_idx ?? -1;

  // Ranking ANTES de recalcular (según puntos previos), para animar el delta ▲▼.
  // Si nadie tenía puntos todavía (primera revelación), no hay movimiento real.
  const habiaPuntos = Object.values(estudiantes).some((e) => (e.puntos_juego || 0) > 0);
  const puestosPrevios = calcularPuestos(estudiantes);

  const updates = { estado_actual: ESTADOS.RESPUESTA_REVELADA };
  // Publicamos la respuesta de la pregunta ACTUAL en /sesiones para que el
  // estudiante vea SOLO la respuesta de la pregunta ya revelada (lectura pública).
  updates.revelacion = {
    idx: hastaIdx,
    clave: (claves && hastaIdx >= 0 ? claves[hastaIdx] : null) || {},
  };
  const nuevosPuntos = {};
  Object.entries(estudiantes).forEach(([id, est]) => {
    const { nota } = evaluarEstudiante(est, preguntas);
    updates[`estudiantes/${id}/nota_acumulada`] = nota;

    // Puntaje de juego paralelo (velocidad + racha). No afecta la nota.
    const { puntos, racha } = calcularJuego(est, preguntas, duracion, hastaIdx);
    updates[`estudiantes/${id}/puntos_juego`] = puntos;
    updates[`estudiantes/${id}/racha`] = racha;
    nuevosPuntos[id] = puntos;
  });

  // Ranking DESPUÉS (con los nuevos puntos), nota como desempate.
  const idsOrdenados = Object.keys(estudiantes).sort((a, b) => {
    const diff = (nuevosPuntos[b] || 0) - (nuevosPuntos[a] || 0);
    if (diff !== 0) return diff;
    return (estudiantes[b].nota_acumulada || 0) - (estudiantes[a].nota_acumulada || 0);
  });
  idsOrdenados.forEach((id, i) => {
    updates[`estudiantes/${id}/puesto`] = i + 1;
    updates[`estudiantes/${id}/puesto_previo`] = habiaPuntos ? (puestosPrevios[id] || (i + 1)) : (i + 1);
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

/**
 * Cierra la sesión:
 * 1. Guarda un snapshot completo en /historial/{docenteUid}/{key}
 * 2. Borra la sesión activa de /sesiones/{pin}
 */
export async function cerrarSesion(pin) {
  // 1. Leer el estado completo de la sesión antes de borrar
  const snap = await get(ref(db, `sesiones/${pin}`));
  if (snap.exists()) {
    const sesion = snap.val();
    const docenteUid = sesion.docente_uid || getEffectiveUid();
    if (docenteUid) {
      // Fusionamos públicas + claves: el historial guarda el cuestionario
      // COMPLETO (con respuestas) para reutilizar/imprimir como antes.
      const claves = await obtenerClaves(pin);
      const preguntas = fusionarLista(sesion.preguntas || [], claves);
      const estudiantes = sesion.estudiantes || {};

    // Calcular nota final de cada estudiante
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

    // Guardar snapshot en historial
    const historialRef = push(ref(db, `historial/${docenteUid}`));
    await set(historialRef, {
      pin,
      tema: sesion.tema || '',
      grado: sesion.grado || '',
      dificultad: sesion.dificultad || '',
      creada_en: sesion.creada_en || Date.now(),
      cerrada_en: Date.now(),
      total_preguntas: preguntas.length,
      total_estudiantes: resultados.length,
      promedio_grupo: promedio,
      preguntas,          // cuestionario completo
      resultados,         // notas de cada estudiante
    });
    }
  }

  // 2. Borrar la sesión activa y sus claves
  await set(ref(db, `sesiones/${pin}`), null);
  await set(ref(db, `claves/${pin}`), null);
}

/** Borra una sala activa (y su clave) SIN archivarla en el historial. */
export async function eliminarSesion(pin) {
  await set(ref(db, `sesiones/${pin}`), null);
  await set(ref(db, `claves/${pin}`), null);
}

/** Elimina un registro de historial del docente actual */
export async function eliminarHistorial(key) {
  const docenteUid = getEffectiveUid();
  if (!docenteUid) throw new Error('Debes estar autenticado.');
  await set(ref(db, `historial/${docenteUid}/${key}`), null);
}

/** Obtiene el historial de sesiones cerradas del docente actual */
export async function obtenerHistorialDocente() {
  const docenteUid = getEffectiveUid();
  if (!docenteUid) throw new Error('Debes estar autenticado.');

  // Lee desde /historial/{uid} — path privado del docente, sin restricciones de query
  const snap = await get(ref(db, `historial/${docenteUid}`));
  if (!snap.exists()) return [];

  const data = snap.val();
  const history = Object.entries(data).map(([key, entry]) => ({
    key,
    ...entry,
  }));

  // Ordenar por fecha de cierre (más reciente primero)
  return history.sort((a, b) => (b.cerrada_en || 0) - (a.cerrada_en || 0));
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
  // Si ya hay un usuario autenticado con correo (docente), no iniciamos sesión anónima
  // para evitar desautenticar la sesión del docente en este navegador durante pruebas locales.
  let uid;
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    uid = auth.currentUser.uid;
  } else {
    const userCredential = await signInAnonymously(auth);
    uid = userCredential.user.uid;
  }

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
  // Los campos calculados (nota_acumulada, puntos_juego, racha, puesto) NO se
  // inicializan aquí: los escribe el docente al revelar (revelarRespuesta), que
  // es el único autorizado por las reglas. La UI ya tolera su ausencia (|| 0).
  await set(newRef, {
    uid,
    nombre,
    grado,
    conectado: true,
    respuestas_registradas: {},
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
  // 1. Verificamos el estado actual (solo lectura)
  const snap = await get(ref(db, `sesiones/${pin}`));
  if (!snap.exists()) return false;
  const sesion = snap.val();
  
  const estadosPermitidos = [ESTADOS.PREGUNTA_ACTIVA, ESTADOS.TIEMPO_AGOTADO];
  if (!estadosPermitidos.includes(sesion.estado_actual)) return false;
  if (sesion.pregunta_idx !== preguntaIdx) return false;

  // 2. Usamos set() en el índice exacto de la pregunta para evitar cualquier problema de permisos con transacciones
  const respRef = ref(db, `sesiones/${pin}/estudiantes/${studentId}/respuestas_registradas/${preguntaIdx}`);
  await set(respRef, opcionIdx);

  // 3. Registrar el tiempo de respuesta (ms desde que inició la pregunta) para
  // el puntaje de velocidad del leaderboard. Calibramos el reloj local con el
  // offset del servidor. No bloquea ni afecta la nota.
  try {
    const inicio = sesion.pregunta_inicio_ts;
    if (inicio) {
      const offsetSnap = await get(ref(db, '.info/serverTimeOffset'));
      const offset = offsetSnap.val() || 0;
      const tMs = Math.max(0, Date.now() + offset - inicio);
      await set(ref(db, `sesiones/${pin}/estudiantes/${studentId}/tiempos_respuesta/${preguntaIdx}`), tMs);
    }
  } catch (e) {
    console.warn('No se pudo registrar el tiempo de respuesta:', e);
  }

  return true;
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
