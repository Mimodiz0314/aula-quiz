import { ref, push, get, child, update, remove, set } from 'firebase/database';
import { db } from '../firebase/config.js';

const FORO_PATH = 'foro';

// ---------------------------------------------------------------------------
// CATEGORÍAS (Solo Admin puede crearlas, todos las leen)
// ---------------------------------------------------------------------------

export async function fetchCategorias() {
  const snap = await get(ref(db, `${FORO_PATH}/categorias`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
}

export async function crearCategoria(nombre, descripcion, icono) {
  const catRef = ref(db, `${FORO_PATH}/categorias`);
  await push(catRef, { nombre, descripcion, icono, creado_en: Date.now() });
}

export async function eliminarCategoria(id) {
  await remove(ref(db, `${FORO_PATH}/categorias/${id}`));
}

// ---------------------------------------------------------------------------
// HILOS (Temas)
// ---------------------------------------------------------------------------

export async function fetchHilosPorCategoria(categoriaId) {
  const snap = await get(ref(db, `${FORO_PATH}/hilos`));
  if (!snap.exists()) return [];
  const todos = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
  return todos.filter(h => h.categoriaId === categoriaId).sort((a, b) => b.creado_en - a.creado_en);
}

export async function fetchHiloUnico(hiloId) {
  const snap = await get(ref(db, `${FORO_PATH}/hilos/${hiloId}`));
  if (!snap.exists()) return null;
  return { id: hiloId, ...snap.val() };
}

export async function crearHilo(categoriaId, titulo, contenido, autorUid, autorNombre) {
  const hilosRef = ref(db, `${FORO_PATH}/hilos`);
  const nuevo = {
    categoriaId,
    titulo,
    contenido,
    autorUid,
    autorNombre,
    creado_en: Date.now(),
    num_respuestas: 0,
    ultimo_mensaje: Date.now()
  };
  const result = await push(hilosRef, nuevo);
  return result.key;
}

export async function eliminarHilo(hiloId) {
  await remove(ref(db, `${FORO_PATH}/hilos/${hiloId}`));
  await remove(ref(db, `${FORO_PATH}/respuestas/${hiloId}`));
}

// ---------------------------------------------------------------------------
// RESPUESTAS
// ---------------------------------------------------------------------------

export async function fetchRespuestas(hiloId) {
  const snap = await get(ref(db, `${FORO_PATH}/respuestas/${hiloId}`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => a.creado_en - b.creado_en);
}

export async function agregarRespuesta(hiloId, contenido, autorUid, autorNombre) {
  const respRef = ref(db, `${FORO_PATH}/respuestas/${hiloId}`);
  await push(respRef, {
    contenido,
    autorUid,
    autorNombre,
    creado_en: Date.now()
  });

  const hiloSnap = await get(ref(db, `${FORO_PATH}/hilos/${hiloId}`));
  if (hiloSnap.exists()) {
    const data = hiloSnap.val();
    await update(ref(db, `${FORO_PATH}/hilos/${hiloId}`), {
      num_respuestas: (data.num_respuestas || 0) + 1,
      ultimo_mensaje: Date.now()
    });
  }
}

export async function eliminarRespuesta(hiloId, respuestaId) {
  await remove(ref(db, `${FORO_PATH}/respuestas/${hiloId}/${respuestaId}`));
  const hiloSnap = await get(ref(db, `${FORO_PATH}/hilos/${hiloId}`));
  if (hiloSnap.exists()) {
    const data = hiloSnap.val();
    await update(ref(db, `${FORO_PATH}/hilos/${hiloId}`), {
      num_respuestas: Math.max((data.num_respuestas || 1) - 1, 0)
    });
  }
}

// ---------------------------------------------------------------------------
// REPORTES (Moderación)
// ---------------------------------------------------------------------------

export async function reportarContenido(tipo, idHilo, idRespuesta, motivo, autorUid, autorNombre, extracto) {
  const repRef = ref(db, `${FORO_PATH}/reportes`);
  await push(repRef, {
    tipo, // 'hilo' o 'respuesta'
    idHilo,
    idRespuesta: idRespuesta || null,
    motivo,
    reportadoPorUid: autorUid,
    reportadoPorNombre: autorNombre,
    extracto,
    fecha: Date.now()
  });
}

export async function fetchReportes() {
  const snap = await get(ref(db, `${FORO_PATH}/reportes`));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.fecha - a.fecha); // Más recientes primero
}

export async function eliminarReporte(reporteId) {
  await remove(ref(db, `${FORO_PATH}/reportes/${reporteId}`));
}
