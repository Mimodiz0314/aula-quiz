// ---------------------------------------------------------------------------
// AI SERVICE — Generación de preguntas via API serverless propia
//
// Llama al endpoint /api/generar (función serverless de Vercel)
// que se ejecuta en el servidor y llama a Groq sin problemas de CORS.
// La API key nunca se expone al navegador.
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

/**
 * Genera preguntas llamando al endpoint serverless /api/generar.
 * Cuando la app está en Firebase Hosting, usa la URL de Vercel configurada
 * en VITE_API_BASE_URL. En local, usa /api/generar directamente.
 */
export async function generarPreguntas({ tema, cantidad, nivel = 'bachillerato' }) {
  if (!tema || cantidad < 1) throw new Error('Parámetros inválidos.');

  // VITE_API_BASE_URL debe apuntar a tu URL de Vercel, ej: https://aula-quiz.vercel.app
  // Si no está configurada, asume que el backend y el frontend están en el mismo dominio.
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${apiBase}/api/generar`;

  console.log(`🤖 Generando ${cantidad} preguntas sobre "${tema}" via ${endpoint}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tema, cantidad, nivel }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Error del servidor (${response.status}): ${txt}`);
  }

  const arr = await response.json();
  console.log('✅ ¡Preguntas recibidas exitosamente!');
  return parsearYValidar(arr, cantidad);
}
