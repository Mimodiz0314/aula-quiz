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

    case 'rompecabezas_ideas':
    case 'paso_a_paso': {
      // respuesta: secuencia de índices públicos en el orden elegido por el alumno.
      const elegido = parseJSON(respuesta);
      if (!Array.isArray(elegido)) return false;
      // Nuevo (contenido barajado): orden[pubIdx] = posición correcta de ese ítem.
      if (Array.isArray(actividad.orden)) {
        const orden = actividad.orden;
        return elegido.length === orden.length && elegido.every((pubIdx, pos) => Number(orden[pubIdx]) === pos);
      }
      // Retrocompat (orden original = correcto): elegido[i] === i.
      const items = actividad.fragmentos ?? actividad.pasos ?? [];
      return elegido.length === items.length && elegido.every((v, i) => Number(v) === i);
    }

    case 'parejas_logicas': {
      // respuesta: elegido[i] = índice público de la derecha emparejada a izquierda i.
      const elegido = parseJSON(respuesta);
      if (!Array.isArray(elegido)) return false;
      // Nuevo (derechas barajadas): mapeo[i] = índice público correcto para izquierda i.
      if (Array.isArray(actividad.mapeo)) {
        const mapeo = actividad.mapeo;
        return elegido.length === mapeo.length && elegido.every((v, i) => Number(v) === Number(mapeo[i]));
      }
      // Retrocompat: elegido[i] === i.
      return elegido.every((v, i) => Number(v) === i);
    }

    case 'clasificador': {
      // respuesta: asignado[i] = categoría (0/1) del ítem i en [...cat0.items, ...cat1.items].
      const asignado = parseJSON(respuesta);
      if (!Array.isArray(asignado)) return false;
      // Nuevo (ítems barajados): asign[i] = categoría correcta del ítem i.
      if (Array.isArray(actividad.asign)) {
        const asign = actividad.asign;
        return asignado.length === asign.length && asignado.every((v, i) => Number(v) === Number(asign[i]));
      }
      // Retrocompat (agrupados): los primeros n0 son cat0, el resto cat1.
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
