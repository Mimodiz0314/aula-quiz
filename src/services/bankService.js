import { ref, push, get, child } from 'firebase/database';
import { db } from '../firebase/config.js';

const BANK_PATH = 'banco_comunidad';

/**
 * Publica una actividad en el banco comunitario.
 * @param {Array} actividades - La lista de actividades/preguntas.
 * @param {Object} meta - Metadatos (tema, grado, dificultad, autorUid, autorNombre).
 */
export async function publishToBank(actividades, meta) {
  const bankRef = ref(db, BANK_PATH);
  const newActivity = {
    ...meta,
    actividades,
    fecha_publicacion: Date.now(),
    likes: 0
  };
  
  // Firebase Realtime Database no permite propiedades 'undefined'.
  // Al generar con IA, algunas propiedades opcionales pueden llegar como undefined.
  // Limpiamos el objeto para evitar un crasheo silencioso.
  const cleanActivity = JSON.parse(JSON.stringify(newActivity));
  
  await push(bankRef, cleanActivity);
}

/**
 * Obtiene todas las actividades públicas del banco.
 */
export async function fetchBankActivities() {
  const snapshot = await get(ref(db, BANK_PATH));
  if (!snapshot.exists()) return [];
  
  const data = snapshot.val();
  return Object.entries(data).map(([id, info]) => ({
    id,
    ...info
  })).sort((a, b) => b.fecha_publicacion - a.fecha_publicacion);
}

/**
 * Elimina una actividad del banco comunitario (Solo Admin).
 */
export async function deleteBankActivity(id) {
  const { remove } = await import('firebase/database');
  await remove(ref(db, `${BANK_PATH}/${id}`));
}
