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
// Tipos cuya respuesta es el ORDEN/AGRUPACIÓN del array (rompecabezas_ideas,
// paso_a_paso, parejas_logicas, clasificador): barajamos el contenido público
// para que el orden ya NO sea la respuesta, y guardamos el mapeo correcto en la
// clave (orden / mapeo / asign). La interfaz del estudiante no cambia.
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

// Baraja [0..n-1]. Evita devolver el orden identidad (que no ocultaría nada).
function barajarIndices(n) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (n > 1 && idx.every((v, i) => v === i)) {
    [idx[0], idx[1]] = [idx[1], idx[0]];
  }
  return idx;
}

/**
 * Parte una actividad en { publica, clave }.
 * - Tipos escalares: `publica` = copia sin el/los campo(s) de respuesta; `clave`
 *   = objeto con solo el/los campo(s) de respuesta.
 * - Tipos de orden/agrupación: `publica` con el contenido barajado; `clave` con
 *   el mapeo correcto (orden / mapeo / asign).
 * - Otros / sin tipo conocido: `publica = actividad`, `clave = null`.
 */
export function separarClave(actividad) {
  if (!actividad || typeof actividad !== 'object') {
    return { publica: actividad, clave: null };
  }
  const tipo = actividad.tipo || 'seleccion_clasica';

  // --- Tipos escalares ---
  const campos = CAMPOS_CLAVE[tipo];
  if (campos) {
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

  // --- Ordenar / paso a paso: el orden del array es la respuesta ---
  if (tipo === 'rompecabezas_ideas' || tipo === 'paso_a_paso') {
    const campo = tipo === 'rompecabezas_ideas' ? 'fragmentos' : 'pasos';
    const original = Array.isArray(actividad[campo]) ? actividad[campo] : [];
    if (original.length < 2) return { publica: actividad, clave: null };
    const perm = barajarIndices(original.length);
    const publicaArr = perm.map((k) => original[k]);
    // orden[posPublica] = posición correcta del ítem mostrado en esa posición.
    return { publica: { ...actividad, [campo]: publicaArr }, clave: { orden: perm } };
  }

  // --- Parejas: la correspondencia izquierda[i]↔derecha[i] es la respuesta ---
  if (tipo === 'parejas_logicas') {
    const original = Array.isArray(actividad.pares) ? actividad.pares : [];
    if (original.length < 2) return { publica: actividad, clave: null };
    const sigma = barajarIndices(original.length); // derecha pública i = original[sigma[i]].derecha
    const publicPares = original.map((p, i) => ({
      izquierda: p?.izquierda ?? '',
      derecha: original[sigma[i]]?.derecha ?? '',
    }));
    // mapeo[i] = índice público cuya derecha es la correcta para la izquierda i.
    const mapeo = new Array(original.length);
    sigma.forEach((origIdx, pubIdx) => { mapeo[origIdx] = pubIdx; });
    return { publica: { ...actividad, pares: publicPares }, clave: { mapeo } };
  }

  // --- Clasificador: la agrupación por categoría es la respuesta ---
  if (tipo === 'clasificador') {
    const cats = Array.isArray(actividad.categorias) ? actividad.categorias : [];
    if (cats.length < 2) return { publica: actividad, clave: null };
    const flat = [];
    cats.forEach((c, ci) => (c?.items || []).forEach((it) => flat.push({ item: it, cat: ci })));
    if (flat.length < 2) return { publica: actividad, clave: null };
    const perm = barajarIndices(flat.length);
    const shuffled = perm.map((k) => flat[k]);
    let cursor = 0;
    const publicCats = cats.map((c) => {
      const count = (c?.items || []).length;
      const items = shuffled.slice(cursor, cursor + count).map((x) => x.item);
      cursor += count;
      return { ...c, items };
    });
    // asign[posEnAllItems] = categoría correcta. allItems = concat de las items públicas.
    const asign = shuffled.map((x) => x.cat);
    return { publica: { ...actividad, categorias: publicCats }, clave: { asign } };
  }

  return { publica: actividad, clave: null };
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

// ---------------------------------------------------------------------------
// Helpers para MOSTRAR la respuesta correcta de los tipos de orden/agrupación
// (en la revelación del estudiante y la vista del docente). Toman la actividad
// ya fusionada (pública barajada + clave). Retrocompat: si no hay clave, usan
// el contenido tal cual (que en datos viejos ya estaba en orden correcto).
// ---------------------------------------------------------------------------

/** Reordena los ítems públicos a su orden correcto usando `orden`. */
export function ordenarPorClave(items, orden) {
  const arr = Array.isArray(items) ? items : [];
  if (!Array.isArray(orden)) return arr;
  const out = new Array(arr.length);
  orden.forEach((correctPos, pubIdx) => { out[correctPos] = arr[pubIdx]; });
  return out;
}

/** Devuelve [{izquierda, derecha}] con las parejas CORRECTAS. */
export function parejasCorrectas(actividad) {
  const pares = Array.isArray(actividad?.pares) ? actividad.pares : [];
  const mapeo = actividad?.mapeo;
  return pares.map((par, i) => ({
    izquierda: par?.izquierda,
    derecha: Array.isArray(mapeo) ? pares[mapeo[i]]?.derecha : par?.derecha,
  }));
}

/** Devuelve un array por categoría con sus ítems CORRECTOS. */
export function clasificacionCorrecta(actividad) {
  const cats = Array.isArray(actividad?.categorias) ? actividad.categorias : [];
  const asign = actividad?.asign;
  if (!Array.isArray(asign)) return cats.map((c) => c?.items || []);
  const all = cats.flatMap((c) => c?.items || []);
  const grupos = cats.map(() => []);
  asign.forEach((ci, i) => { if (grupos[ci]) grupos[ci].push(all[i]); });
  return grupos;
}
