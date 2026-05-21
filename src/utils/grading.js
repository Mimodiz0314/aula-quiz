// ---------------------------------------------------------------------------
// CÁLCULO DE CALIFICACIÓN — escala lineal 0.0 a 5.0
// Función pura: misma entrada => misma salida. Fácil de probar.
// Fórmula: nota = (aciertos / totalPreguntas) * 5.0
// ---------------------------------------------------------------------------

/**
 * Determina si una respuesta es correcta comparando el índice
 * elegido con el índice marcado como correcto en la pregunta.
 * @param {object} pregunta  { correcta: number, ... }
 * @param {number} respuesta índice 0-3 escogido por el estudiante
 * @returns {boolean}
 */
export function esAcierto(pregunta, respuesta) {
  if (!pregunta || respuesta === undefined || respuesta === null) return false;
  return Number(pregunta.correcta) === Number(respuesta);
}

/**
 * Cuenta aciertos de un estudiante sobre un banco de preguntas.
 * @param {Array} preguntas       banco completo
 * @param {Object} respuestas     { [indicePregunta]: indiceOpcion }
 * @returns {number}              número de aciertos
 */
export function contarAciertos(preguntas = [], respuestas = {}) {
  return preguntas.reduce((acc, pregunta, idx) => {
    const r = respuestas[idx];
    return esAcierto(pregunta, r) ? acc + 1 : acc;
  }, 0);
}

/**
 * Calcula la nota final en escala 0.0 - 5.0, redondeada a 1 decimal.
 * @param {number} aciertos
 * @param {number} total
 * @returns {number}              p.ej. 4.2
 */
export function calcularNota(aciertos, total) {
  if (!total || total <= 0) return 1.0;
  const bruto = (aciertos / total) * 5.0;
  // Redondeo a un decimal — evita 4.199999...
  const nota = Math.round(bruto * 10) / 10;
  return Math.max(1.0, nota);
}

/**
 * Atajo de orden superior: dado el estado de un estudiante + banco,
 * devuelve {aciertos, total, nota}.
 */
export function evaluarEstudiante(estudiante, preguntas = []) {
  const respuestas = estudiante?.respuestas_registradas || {};
  const aciertos = contarAciertos(preguntas, respuestas);
  const total = preguntas.length;
  return { aciertos, total, nota: calcularNota(aciertos, total) };
}
