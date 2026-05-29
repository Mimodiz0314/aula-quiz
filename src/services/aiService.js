// ---------------------------------------------------------------------------
// AI SERVICE — Generación de actividades via API serverless en Vercel
// El endpoint /api/generar corre en el servidor con la API key segura (sin CORS).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Validadores por tipo — aseguran estructura correcta antes de pasar al editor
// ---------------------------------------------------------------------------
const VALIDADORES = {
  seleccion_clasica: (p, i) => {
    if (!p.pregunta) throw new Error(`Actividad ${i + 1}: falta "pregunta".`);
    if (!Array.isArray(p.opciones) || p.opciones.length !== 4)
      throw new Error(`Actividad ${i + 1}: "opciones" debe ser un array de 4 elementos.`);
    const c = Number(p.correcta);
    if (!Number.isInteger(c) || c < 0 || c > 3)
      throw new Error(`Actividad ${i + 1}: "correcta" debe ser 0, 1, 2 o 3.`);
    return {
      tipo: 'seleccion_clasica',
      pregunta: String(p.pregunta).trim(),
      opciones: p.opciones.map(o => String(o).trim()),
      correcta: c,
    };
  },
  verdad_mito: (p, i) => {
    if (!p.enunciado) throw new Error(`Actividad ${i + 1}: falta "enunciado".`);
    if (!['verdad', 'mito'].includes(p.correcto))
      throw new Error(`Actividad ${i + 1}: "correcto" debe ser "verdad" o "mito".`);
    return {
      tipo: 'verdad_mito',
      enunciado: String(p.enunciado).trim(),
      correcto: p.correcto,
      explicacion: String(p.explicacion || '').trim(),
    };
  },
  rompecabezas_ideas: (p, i) => {
    if (!Array.isArray(p.fragmentos) || p.fragmentos.length < 2)
      throw new Error(`Actividad ${i + 1}: "fragmentos" debe ser un array de al menos 2 elementos.`);
    return {
      tipo: 'rompecabezas_ideas',
      instruccion: String(p.instruccion || 'Ordena estos fragmentos en el orden correcto:').trim(),
      fragmentos: p.fragmentos.map(f => String(f).trim()),
    };
  },
  parejas_logicas: (p, i) => {
    if (!Array.isArray(p.pares) || p.pares.length < 2)
      throw new Error(`Actividad ${i + 1}: "pares" debe ser un array de al menos 2 parejas.`);
    return {
      tipo: 'parejas_logicas',
      instruccion: String(p.instruccion || 'Empareja cada concepto con su definición:').trim(),
      pares: p.pares.map(par => ({
        izquierda: String(par.izquierda || '').trim(),
        derecha: String(par.derecha || '').trim(),
      })),
    };
  },
  caza_intruso: (p, i) => {
    if (!Array.isArray(p.elementos) || p.elementos.length < 3)
      throw new Error(`Actividad ${i + 1}: "elementos" debe ser un array de al menos 3 elementos.`);
    const idx = Number(p.intruso_idx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= p.elementos.length)
      throw new Error(`Actividad ${i + 1}: "intruso_idx" fuera de rango.`);
    return {
      tipo: 'caza_intruso',
      instruccion: String(p.instruccion || '¿Cuál de estos elementos no pertenece al grupo?').trim(),
      elementos: p.elementos.map(e => String(e).trim()),
      intruso_idx: idx,
    };
  },
  clasificador: (p, i) => {
    if (!Array.isArray(p.categorias) || p.categorias.length < 2)
      throw new Error(`Actividad ${i + 1}: "categorias" debe ser un array de al menos 2 categorías.`);
    return {
      tipo: 'clasificador',
      instruccion: String(p.instruccion || 'Clasifica cada elemento en su categoría correcta:').trim(),
      categorias: p.categorias.map(cat => ({
        nombre: String(cat.nombre || '').trim(),
        items: (cat.items || []).map(item => String(item).trim()),
      })),
    };
  },
  palabras_perdidas: (p, i) => {
    if (!p.oracion) throw new Error(`Actividad ${i + 1}: falta "oracion".`);
    if (!Array.isArray(p.banco)) throw new Error(`Actividad ${i + 1}: "banco" debe ser un array.`);
    if (!Array.isArray(p.respuestas)) throw new Error(`Actividad ${i + 1}: "respuestas" debe ser un array.`);
    return {
      tipo: 'palabras_perdidas',
      oracion: String(p.oracion).trim(),
      banco: p.banco.map(w => String(w).trim()),
      respuestas: p.respuestas.map(r => String(r).trim()),
    };
  },
  paso_a_paso: (p, i) => {
    if (!Array.isArray(p.pasos) || p.pasos.length < 2)
      throw new Error(`Actividad ${i + 1}: "pasos" debe ser un array de al menos 2 pasos.`);
    return {
      tipo: 'paso_a_paso',
      instruccion: String(p.instruccion || 'Ordena los pasos en el orden correcto:').trim(),
      pasos: p.pasos.map(s => String(s).trim()),
    };
  },
  real_inventado: (p, i) => {
    if (!p.enunciado) throw new Error(`Actividad ${i + 1}: falta "enunciado".`);
    if (!['real', 'inventado'].includes(p.correcto))
      throw new Error(`Actividad ${i + 1}: "correcto" debe ser "real" o "inventado".`);
    return {
      tipo: 'real_inventado',
      enunciado: String(p.enunciado).trim(),
      correcto: p.correcto,
      explicacion: String(p.explicacion || '').trim(),
    };
  },
  detective_texto: (p, i) => {
    if (!p.pasaje) throw new Error(`Actividad ${i + 1}: falta "pasaje".`);
    if (!p.pregunta) throw new Error(`Actividad ${i + 1}: falta "pregunta".`);
    if (!Array.isArray(p.opciones) || p.opciones.length !== 4)
      throw new Error(`Actividad ${i + 1}: "opciones" debe ser un array de 4 elementos.`);
    const c = Number(p.correcta);
    if (!Number.isInteger(c) || c < 0 || c > 3)
      throw new Error(`Actividad ${i + 1}: "correcta" debe ser 0, 1, 2 o 3.`);
    return {
      tipo: 'detective_texto',
      pasaje: String(p.pasaje).trim(),
      pregunta: String(p.pregunta).trim(),
      opciones: p.opciones.map(o => String(o).trim()),
      correcta: c,
    };
  },
};

function parsearYValidarActividades(arr, tiposEsperados = []) {
  if (!Array.isArray(arr)) throw new Error('Formato inesperado: se esperaba un array.');
  if (arr.length === 0) throw new Error('La IA devolvió 0 actividades.');

  return arr.map((item, i) => {
    // --- Rescate de "tipo" faltante ---
    // Si la IA omitió el campo pero tenemos la lista esperada con el mismo count,
    // asignamos el tipo correcto automáticamente.
    if (!item?.tipo && tiposEsperados[i]) {
      console.warn(`⚠️ Actividad ${i + 1} sin "tipo" — asignando "${tiposEsperados[i]}" automáticamente.`);
      item = { ...item, tipo: tiposEsperados[i] };
    }

    const tipo = item?.tipo;
    if (!tipo) throw new Error(`Actividad ${i + 1}: falta el campo "tipo".`);
    const validar = VALIDADORES[tipo];
    if (!validar) throw new Error(`Actividad ${i + 1}: tipo desconocido "${tipo}".`);
    return validar(item, i);
  });
}

// ---------------------------------------------------------------------------
// Generación multi-tipo (nueva evaluación con 10 tipos)
// seleccion es [ [tipo, cantidad], ... ] filtrando los que tienen valor > 0
// ---------------------------------------------------------------------------
export async function generarActividades({ tema, nivel = 'bachillerato', seleccion, textoBase = '', youtubeUrl = '' }) {
  if ((!tema && !textoBase && !youtubeUrl) || !seleccion?.length) throw new Error('Parámetros inválidos.');

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBase}/api/generar`;

  const total = seleccion.reduce((s, [, n]) => s + n, 0);
  console.log(`🤖 Generando ${total} actividades (multi-tipo) → ${endpoint}`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema, nivel, seleccion, textoBase, youtubeUrl }),
    });
  } catch (networkErr) {
    throw new Error(`No se pudo conectar con el servidor de IA: ${networkErr.message}`);
  }

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`El servidor respondió con error ${response.status}: ${txt.substring(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const txt = await response.text();
    throw new Error(`Respuesta inesperada del servidor (no es JSON). Verifica GROQ_API_KEY en Vercel. Detalle: ${txt.substring(0, 100)}`);
  }

  const arr = await response.json();

  // Construir lista expandida de tipos esperados para el rescate
  const tiposEsperados = seleccion.flatMap(([tipo, n]) =>
    Array.from({ length: Number(n) }, () => tipo)
  );

  console.log('✅ Actividades recibidas, validando…');
  return parsearYValidarActividades(arr, tiposEsperados);
}

// ---------------------------------------------------------------------------
// Generación clásica (solo seleccion_clasica) — mantenida para compatibilidad
// ---------------------------------------------------------------------------
function parsearYValidar(arr, cantidad) {
  if (!Array.isArray(arr)) throw new Error('Formato inesperado: se esperaba un array.');
  const norm = arr.map((p, i) => {
    if (!p.pregunta || !Array.isArray(p.opciones) || p.opciones.length !== 4)
      throw new Error(`Pregunta ${i + 1} mal formada.`);
    const correcta = Number(p.correcta);
    if (!Number.isInteger(correcta) || correcta < 0 || correcta > 3)
      throw new Error(`Pregunta ${i + 1}: índice "correcta" inválido.`);
    return {
      tipo: 'seleccion_clasica',
      pregunta: String(p.pregunta).trim(),
      opciones: p.opciones.map(o => String(o).trim()),
      correcta,
    };
  });
  if (norm.length < 1) throw new Error('La IA devolvió 0 preguntas.');
  return norm.slice(0, cantidad);
}

export async function generarPreguntas({ tema, cantidad, nivel = 'bachillerato', textoBase = '' }) {
  if ((!tema && !textoBase) || cantidad < 1) throw new Error('Parámetros inválidos.');

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBase}/api/generar`;
  console.log(`🤖 Generando ${cantidad} preguntas → ${endpoint}`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema, cantidad, nivel, textoBase }),
    });
  } catch (networkErr) {
    throw new Error(`No se pudo conectar con el servidor de IA: ${networkErr.message}`);
  }

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`El servidor respondió con error ${response.status}: ${txt.substring(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const txt = await response.text();
    throw new Error(`Respuesta inesperada del servidor (no es JSON). Verifica GROQ_API_KEY en Vercel. Detalle: ${txt.substring(0, 100)}`);
  }

  const arr = await response.json();
  console.log('✅ ¡Preguntas recibidas exitosamente!');
  return parsearYValidar(arr, cantidad);
}
