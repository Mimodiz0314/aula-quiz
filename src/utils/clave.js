// ---------------------------------------------------------------------------
// SEPARACIÓN DE CLAVES (respuestas correctas)
//
// Seguridad: el estudiante lee /sesiones/{pin} completo, así que NO podemos
// dejar ahí las respuestas correctas de los tipos escalares. Las extraemos a
// un nodo aparte /claves/{pin} legible solo por el docente. Aquí viven las
// funciones puras que parten una actividad en { publica, clave } y la vuelven
// a fusionar en memoria para calificar/mostrar.
//
// Tipos escalares soportados (su respuesta es un campo simple):
//   seleccion_clasica, detective_texto → `correcta`
//   verdad_mito, real_inventado        → `correcto` + `explicacion`
//   caza_intruso                        → `intruso_idx`
//   palabras_perdidas                   → `respuestas`
//
// Tipos NO soportados en esta iteración (su respuesta es el ORDEN del array y
// requiere barajar en creación): rompecabezas_ideas, paso_a_paso,
// parejas_logicas, clasificador. Para estos `publica = actividad` y
// `clave = null`, es decir, siguen exponiendo el orden correcto.
// TODO #1: estos tipos aún exponen el orden correcto; requieren barajar en
// creación para poder separarse igual que los escalares.
//
// Retrocompatibilidad: si una sesión vieja no tiene /claves, las funciones de
// fusión reciben `clave` null/undefined y devuelven la pública tal cual (que
// en los datos viejos aún trae la respuesta dentro de `preguntas`).
// ---------------------------------------------------------------------------

// Mapa tipo → lista de campos que constituyen la "clave" (respuesta correcta).
const CAMPOS_CLAVE = {
  seleccion_clasica: ['correcta'],
  detective_texto: ['correcta'],
  verdad_mito: ['correcto', 'explicacion'],
  real_inventado: ['correcto', 'explicacion'],
  caza_intruso: ['intruso_idx'],
  palabras_perdidas: ['respuestas'],
};

/**
 * Parte una actividad en { publica, clave }.
 * - Tipos escalares: `publica` = copia sin el/los campo(s) de respuesta;
 *   `clave` = objeto con solo el/los campo(s) de respuesta presentes.
 * - Tipos no soportados (o sin tipo conocido): `publica = actividad`, `clave = null`.
 */
export function separarClave(actividad) {
  if (!actividad || typeof actividad !== 'object') {
    return { publica: actividad, clave: null };
  }
  const tipo = actividad.tipo || 'seleccion_clasica';
  const campos = CAMPOS_CLAVE[tipo];
  if (!campos) {
    // Tipo complejo no soportado: no separamos nada.
    return { publica: actividad, clave: null };
  }

  const publica = { ...actividad };
  const clave = {};
  campos.forEach((campo) => {
    if (campo in publica) {
      clave[campo] = publica[campo];
      delete publica[campo];
    }
  });
  return { publica, clave };
}

/**
 * Fusiona una pública con su entrada de clave para reconstruir la actividad
 * completa. Si `claveItem` es null/undefined (sesión vieja sin /claves, o tipo
 * no soportado), devuelve la pública intacta.
 */
export function fusionarClave(publica, claveItem) {
  if (!publica) return publica;
  if (!claveItem || typeof claveItem !== 'object') return publica;
  return { ...publica, ...claveItem };
}

/**
 * Parte una lista de preguntas en { publicas, claves } (arrays paralelos por índice).
 */
export function separarLista(preguntas = []) {
  const publicas = [];
  const claves = [];
  preguntas.forEach((actividad) => {
    const { publica, clave } = separarClave(actividad);
    publicas.push(publica);
    // Usamos {} en lugar de null para que el array no quede "ralo" en RTDB.
    claves.push(clave || {});
  });
  return { publicas, claves };
}

/**
 * Fusiona arrays paralelos de públicas + claves en una lista de actividades
 * completas. `claves` puede ser un array, un objeto {idx: clave} (como vuelve
 * de RTDB) o null/undefined (retrocompat: devuelve las públicas tal cual).
 */
export function fusionarLista(publicas = [], claves = null) {
  return publicas.map((publica, idx) => {
    const claveItem = claves ? claves[idx] : null;
    return fusionarClave(publica, claveItem);
  });
}
