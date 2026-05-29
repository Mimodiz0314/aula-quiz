// ---------------------------------------------------------------------------
// CÁLCULO DE CALIFICACIÓN — escala lineal 0.0 a 5.0
// Soporta los 10 tipos de actividades interactivas.
// ---------------------------------------------------------------------------

function parseJSON(val) {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return val;
}

/**
 * Determina si una respuesta es correcta según el tipo de actividad.
 * Backward-compatible: actividades sin campo "tipo" se tratan como seleccion_clasica.
 */
export function esAcierto(actividad, respuesta) {
  if (!actividad || respuesta === undefined || respuesta === null) return false;

  const tipo = actividad.tipo || 'seleccion_clasica';

  switch (tipo) {
    case 'seleccion_clasica':
    case 'detective_texto':
      return Number(actividad.correcta) === Number(respuesta);

    case 'verdad_mito':
      return actividad.correcto === respuesta;

    case 'real_inventado':
      return actividad.correcto === respuesta;

    case 'caza_intruso':
      return Number(actividad.intruso_idx) === Number(respuesta);

    case 'rompecabezas_ideas': {
      const elegido = parseJSON(respuesta);
      if (!Array.isArray(elegido)) return false;
      const n = actividad.fragmentos?.length ?? 0;
      return elegido.length === n && elegido.every((v, i) => Number(v) === i);
    }

    case 'paso_a_paso': {
      const elegido = parseJSON(respuesta);
      if (!Array.isArray(elegido)) return false;
      const n = actividad.pasos?.length ?? 0;
      return elegido.length === n && elegido.every((v, i) => Number(v) === i);
    }

    case 'parejas_logicas': {
      // respuesta: JSON array donde elegido[i] = origIdx del elemento derecha
      // emparejado al elemento izquierda[i]. Correcto cuando elegido[i] === i.
      const elegido = parseJSON(respuesta);
      if (!Array.isArray(elegido)) return false;
      return elegido.every((v, i) => Number(v) === i);
    }

    case 'clasificador': {
      // respuesta: JSON array donde asignado[i] = índice de categoría (0 o 1)
      // para el ítem i en la lista aplanada [...cat0.items, ...cat1.items].
      const asignado = parseJSON(respuesta);
      if (!Array.isArray(asignado)) return false;
      const n0 = actividad.categorias?.[0]?.items?.length ?? 0;
      const n1 = actividad.categorias?.[1]?.items?.length ?? 0;
      if (asignado.length !== n0 + n1) return false;
      return asignado.every((v, i) => Number(v) === (i < n0 ? 0 : 1));
    }

    case 'palabras_perdidas': {
      const elegidas = parseJSON(respuesta);
      const correctas = actividad.respuestas ?? [];
      if (!Array.isArray(elegidas) || elegidas.length !== correctas.length) return false;
      return elegidas.every((w, i) =>
        String(w).trim().toLowerCase() === String(correctas[i]).trim().toLowerCase()
      );
    }

    default:
      if ('correcta' in actividad) return Number(actividad.correcta) === Number(respuesta);
      return false;
  }
}

export function contarAciertos(preguntas = [], respuestas = {}) {
  return preguntas.reduce((acc, pregunta, idx) => {
    const r = respuestas[idx];
    return esAcierto(pregunta, r) ? acc + 1 : acc;
  }, 0);
}

export function calcularNota(aciertos, total) {
  if (!total || total <= 0) return 1.0;
  const bruto = (aciertos / total) * 5.0;
  return Math.max(1.0, Math.round(bruto * 10) / 10);
}

export function evaluarEstudiante(estudiante, preguntas = []) {
  const respuestas = estudiante?.respuestas_registradas || {};
  const aciertos = contarAciertos(preguntas, respuestas);
  const total = preguntas.length;
  return { aciertos, total, nota: calcularNota(aciertos, total) };
}
