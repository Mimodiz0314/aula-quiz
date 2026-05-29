// ---------------------------------------------------------------------------
// PUNTAJE DE JUEGO — paralelo a la nota académica (utils/grading.js)
//
// La nota 1.0–5.0 NO se toca. Esto es un puntaje estilo Kahoot para el
// leaderboard en vivo: acertar rápido da más puntos y encadenar aciertos
// da un bonus de racha. Lógica pura, sin dependencias de Firebase.
// ---------------------------------------------------------------------------

import { esAcierto } from './grading.js';

export const BASE = 1000;
export const STREAK_BONUS = 100;      // por cada acierto consecutivo previo
export const MAX_STREAK_BONUS = 500;  // tope del bonus de racha
const REFERENCIA_SIN_LIMITE_MS = 30000; // 30 s de referencia cuando no hay reloj

/**
 * Factor de velocidad en [0.5, 1].
 * - Con límite: proporcional al tiempo restante (responder al instante ≈ 1, al
 *   borde del tiempo ≈ 0.5).
 * - Sin límite (duracionSeg = 0): se usa el tiempo absoluto contra una
 *   referencia de 30 s, premiando a quien responde antes.
 */
export function factorVelocidad(tiempoMs, duracionSeg) {
  const t = Number(tiempoMs);
  if (!Number.isFinite(t) || t < 0) return 1; // sin dato de tiempo → sin penalización
  const ventanaMs = duracionSeg > 0 ? duracionSeg * 1000 : REFERENCIA_SIN_LIMITE_MS;
  const factor = 1 - 0.5 * (t / ventanaMs);
  return Math.min(1, Math.max(0.5, factor));
}

/**
 * Puntos de una sola pregunta. rachaPrevia = aciertos consecutivos ANTES de esta.
 */
export function puntosPregunta(acerto, tiempoMs, duracionSeg, rachaPrevia) {
  if (!acerto) return 0;
  const base = Math.round(BASE * factorVelocidad(tiempoMs, duracionSeg));
  const bonus = Math.min(rachaPrevia * STREAK_BONUS, MAX_STREAK_BONUS);
  return base + bonus;
}

/**
 * Calcula el puntaje de juego acumulado y la racha actual de un estudiante,
 * recorriendo las preguntas 0..hastaIdx (inclusive). Idempotente: se puede
 * recalcular en cada revelación sin acumular de más.
 */
export function calcularJuego(estudiante, preguntas = [], duracionSeg = 0, hastaIdx = -1) {
  const respuestas = estudiante?.respuestas_registradas || {};
  const tiempos = estudiante?.tiempos_respuesta || {};
  let puntos = 0;
  let racha = 0;

  const limite = Math.min(hastaIdx, preguntas.length - 1);
  for (let idx = 0; idx <= limite; idx++) {
    const acerto = esAcierto(preguntas[idx], respuestas[idx]);
    if (acerto) {
      puntos += puntosPregunta(true, tiempos[idx], duracionSeg, racha);
      racha += 1;
    } else {
      racha = 0;
    }
  }

  return { puntos, racha };
}

/**
 * Devuelve un mapa { studentId: puesto } (1-based) ordenando por la métrica dada,
 * con la nota acumulada como desempate. `metrica` lee un número de cada estudiante.
 */
export function calcularPuestos(estudiantes = {}, metrica = (e) => e.puntos_juego || 0) {
  const ordenados = Object.entries(estudiantes).sort(([, a], [, b]) => {
    const diff = metrica(b) - metrica(a);
    if (diff !== 0) return diff;
    return (b.nota_acumulada || 0) - (a.nota_acumulada || 0);
  });
  const puestos = {};
  ordenados.forEach(([id], i) => { puestos[id] = i + 1; });
  return puestos;
}
