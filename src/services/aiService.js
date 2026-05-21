// ---------------------------------------------------------------------------
// AI SERVICE — Generación de preguntas via API serverless en Vercel
// El endpoint /api/generar corre en el servidor, llama a Groq con la API key
// segura y devuelve las preguntas sin ningún problema de CORS.
// ---------------------------------------------------------------------------

function parsearYValidar(arr, cantidad) {
  if (!Array.isArray(arr)) {
    throw new Error('Formato inesperado: se esperaba un array.');
  }
  const norm = arr.map((p, i) => {
    if (!p.pregunta || !Array.isArray(p.opciones) || p.opciones.length !== 4) {
      throw new Error(`Pregunta ${i + 1} mal formada.`);
    }
    const correcta = Number(p.correcta);
    if (!Number.isInteger(correcta) || correcta < 0 || correcta > 3) {
      throw new Error(`Pregunta ${i + 1}: índice "correcta" inválido.`);
    }
    return {
      pregunta: String(p.pregunta).trim(),
      opciones: p.opciones.map((o) => String(o).trim()),
      correcta,
    };
  });
  if (norm.length < 1) throw new Error('La IA devolvió 0 preguntas.');
  return norm.slice(0, cantidad);
}

export async function generarPreguntas({ tema, cantidad, nivel = 'bachillerato', textoBase = '' }) {
  if ((!tema && !textoBase) || cantidad < 1) throw new Error('Parámetros inválidos.');

  // En Vercel: VITE_API_BASE_URL está vacía → llama a /api/generar (mismo dominio, sin CORS)
  // En Firebase Hosting: VITE_API_BASE_URL = https://aula-quiz.vercel.app
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

  // Verificar que la respuesta sea JSON y no HTML (error de configuración)
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const txt = await response.text();
    throw new Error(`Respuesta inesperada del servidor (no es JSON). Verifica que GROQ_API_KEY esté configurada en Vercel. Detalle: ${txt.substring(0, 100)}`);
  }

  const arr = await response.json();
  console.log('✅ ¡Preguntas recibidas exitosamente!');
  return parsearYValidar(arr, cantidad);
}

export async function generarPreguntasDeYoutube({ urlYoutube, cantidad, nivel = 'bachillerato' }) {
  if (!urlYoutube) throw new Error('Debes proporcionar una URL de YouTube.');

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBase}/api/youtube`;

  console.log(`🎬 Extrayendo transcripción de YouTube → ${endpoint}`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlYoutube, cantidad, nivel }),
    });
  } catch (networkErr) {
    throw new Error(`No se pudo conectar con el servidor: ${networkErr.message}`);
  }

  if (!response.ok) {
    let errorMsg = '';
    let errorCode = null;
    let errorDebug = null;
    try {
      const j = await response.json();
      errorMsg = j.error || '';
      errorCode = j.code || null;
      errorDebug = j.debug || null;
    } catch {
      errorMsg = await response.text();
    }
    const err = new Error(errorMsg || `Error del servidor: ${response.status}`);
    if (errorCode) err.code = errorCode;
    if (errorDebug) err.debug = errorDebug;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const txt = await response.text();
    throw new Error(`Respuesta inesperada del servidor. Detalle: ${txt.substring(0, 100)}`);
  }

  const arr = await response.json();
  console.log('✅ ¡Preguntas del video recibidas!');
  return parsearYValidar(arr, cantidad || 10);
}
