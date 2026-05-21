// ---------------------------------------------------------------------------
// AI SERVICE — Generación de preguntas con estándar ICFES (Ejecutado en Cliente con CORS Proxy)
//
// Llama directamente a Groq, Cerebras o DeepSeek usando un proxy de CORS (corsproxy.io)
// para evitar exponer o bloquear peticiones desde el navegador.
// ---------------------------------------------------------------------------

function buildSystemPrompt(cantidad) {
  return `Eres un evaluador senior con experiencia en pruebas estandarizadas ICFES Saber (Colombia).
Tu tarea es generar EXACTAMENTE ${cantidad} preguntas de selección múltiple, cumpliendo estos criterios INNEGOCIABLES:

1. ENUNCIADO: claro, autocontenido, con contexto + tarea. Sin ambigüedad.
2. OPCIONES: 4 alternativas (A, B, C, D), de longitud y complejidad similares,
   todas plausibles, redactadas en paralelo gramatical.
3. CORRECTA: una y solo una opción inobjetablemente correcta.
4. DIFICULTAD: progresiva, pero alcanzable para el nivel solicitado.
5. SIN PISTAS: no incluyas palabras como "todas las anteriores", "ninguna",
   ni longitudes desiguales que delaten la respuesta.
6. IDIOMA: español neutro, registro académico, ortografía perfecta.

FORMATO DE SALIDA — EXCLUSIVAMENTE este JSON, sin texto adicional, sin Markdown:
[
  {
    "pregunta": "string con el enunciado",
    "opciones": ["A...", "B...", "C...", "D..."],
    "correcta": 0
  }
]
El campo "correcta" es el índice 0-3 de la opción correcta.
Devuelve EXCLUSIVAMENTE el array JSON. Nada antes, nada después.`;
}

function parsearYValidar(raw, cantidad) {
  let parsed;
  try {
    const limpio = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    parsed = JSON.parse(limpio);
  } catch (e) {
    throw new Error('La IA no devolvió JSON válido: ' + e.message);
  }

  const arr = Array.isArray(parsed) ? parsed : parsed.preguntas;
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
 * Genera preguntas llamando directamente a los proveedores de IA
 * con una cadena de fallback en el cliente.
 */
export async function generarPreguntas({ tema, cantidad, nivel = 'bachillerato' }) {
  if (!tema || cantidad < 1) throw new Error('Parámetros inválidos.');

  // Intento 1: Intentar llamar a nuestra API serverless /api/generar (ideal para producción)
  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const vercelApiUrl = import.meta.env.VITE_VERCEL_API_URL || '';
    const apiEndpoint = vercelApiUrl ? `${vercelApiUrl}/api/generar` : '/api/generar';

    // Intentamos usar el backend si estamos en producción, o si VITE_VERCEL_API_URL está explícitamente configurada
    if (!isLocalhost || vercelApiUrl) {
      console.log(`🤖 Intentando generar preguntas desde el servidor (${apiEndpoint})...`);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tema, cantidad, nivel })
      });

      if (response.ok) {
        const arr = await response.json();
        console.log("✅ ¡Preguntas generadas exitosamente desde el servidor!");
        // Re-usamos parsearYValidar pasándole el string JSON del array
        return parsearYValidar(JSON.stringify(arr), cantidad);
      } else {
        const txt = await response.text();
        console.warn(`⚠️ El servidor de API devolvió un error: ${response.status} - ${txt}. Usando fallback...`);
      }
    }
  } catch (err) {
    console.warn("⚠️ No se pudo obtener respuesta del servidor /api/generar. Usando fallback en cliente...", err);
  }

  // Intento 2 (Fallback): Llamada directa desde el navegador (funciona perfecto en Localhost con el proxy gratuito)
  const system = buildSystemPrompt(cantidad);
  const user = `Tema: ${tema}\nNivel del estudiante: ${nivel}\nGenera ${cantidad} preguntas siguiendo estrictamente el formato JSON especificado.`;

  const providers = [
    {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: import.meta.env.VITE_GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile'
    },
    {
      name: 'Cerebras',
      endpoint: 'https://api.cerebras.ai/v1/chat/completions',
      apiKey: import.meta.env.VITE_CEREBRAS_API_KEY,
      model: 'llama3.1-70b'
    },
    {
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
      model: 'deepseek-chat'
    }
  ];

  let errorMsg = "";

  for (const provider of providers) {
    if (!provider.apiKey) {
      console.warn(`⚠️ Saltando proveedor ${provider.name} porque no tiene API Key configurada.`);
      continue;
    }
    try {
      console.log(`🤖 Intentando generar preguntas con ${provider.name} en el cliente...`);
      
      // Para evitar que el navegador envíe una petición preflight (OPTIONS) que falle CORS,
      // pasamos los encabezados de autorización y content-type como parámetros de consulta (reqHeaders)
      // y enviamos la petición con Content-Type: text/plain. El proxy se encarga de reescribirlos al destino.
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(provider.endpoint)}` +
                       `&reqHeaders=authorization:Bearer%20${provider.apiKey}` +
                       `&reqHeaders=content-type:application/json`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain' // Evita el preflight de CORS en el navegador
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const raw = result.choices?.[0]?.message?.content || '';
      console.log(`✅ ¡Preguntas generadas exitosamente con ${provider.name}!`);

      // Validar y retornar las preguntas parseadas
      return parsearYValidar(raw, cantidad);

    } catch (error) {
      console.error(`❌ Error en proveedor ${provider.name} (cliente):`, error.message || error);
      errorMsg += `${provider.name}: ${error.message || error}. `;
    }
  }

  throw new Error(`Todos los proveedores de IA fallaron. Errores: ${errorMsg}`);
}
