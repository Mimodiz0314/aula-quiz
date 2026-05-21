export default async function handler(req, res) {
  // Configurar cabeceras de CORS para permitir peticiones desde cualquier origen (incluyendo Firebase Hosting y Localhost)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Manejar la petición OPTIONS de preflight de CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
    return;
  }

  const { tema, cantidad, nivel, textoBase } = req.body || {};
  if ((!tema && !textoBase)) {
    res.status(400).json({ error: 'Parámetros faltantes: debes proveer un tema o un textoBase.' });
    return;
  }

  let systemPrompt = '';
  let userPrompt = '';

  if (textoBase) {
    systemPrompt = `Eres un asistente experto en extracción de datos educativos.
Tu tarea es leer el texto crudo proporcionado por el usuario (que contiene un cuestionario) y extraer todas las preguntas, opciones de respuesta y la respuesta correcta.
Debes formatear el resultado EXACTAMENTE como un array JSON.

Criterios INNEGOCIABLES:
1. Extrae cada pregunta encontrada en el texto.
2. Extrae las opciones para cada pregunta (usualmente 4).
3. Determina el índice de la respuesta correcta (0 para A/primera, 1 para B/segunda, 2 para C/tercera, 3 para D/cuarta) según lo indique el texto.

FORMATO DE SALIDA — EXCLUSIVAMENTE este JSON, sin texto adicional, sin Markdown:
[
  {
    "pregunta": "string con el enunciado",
    "opciones": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correcta": 0
  }
]
El campo "correcta" es el índice 0-3 de la opción correcta.
Devuelve EXCLUSIVAMENTE el array JSON. Nada antes, nada después.`;

    userPrompt = `Extrae el cuestionario del siguiente texto y devuélvelo en el formato JSON indicado:\n\n${textoBase}`;
  } else {
    systemPrompt = `Eres un evaluador senior con experiencia en pruebas estandarizadas ICFES Saber (Colombia).
Tu tarea es generar EXACTAMENTE ${cantidad || 10} preguntas de selección múltiple, cumpliendo estos criterios INNEGOCIABLES:

1. ENUNCIADO: claro, autocontenido, con contexto + tarea. Sin ambigüedad.
2. OPCIONES: 4 alternativas (A, B, C, D), de longitud y complejidad similares, todas plausibles, redactadas en paralelo gramatical.
3. CORRECTA: una y solo una opción inobjetablemente correcta.
4. DIFICULTAD: progresiva, pero alcanzable para el nivel solicitado.
5. SIN PISTAS: no incluyas palabras como "todas las anteriores", "ninguna", ni longitudes desiguales que delaten la respuesta.
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

    userPrompt = `Tema: ${tema}\nNivel del estudiante: ${nivel || 'bachillerato'}\nGenera ${cantidad || 10} preguntas siguiendo estrictamente el formato JSON especificado.`;
  }

  const providers = [
    {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile'
    }
  ];

  let errorMsg = '';

  for (const provider of providers) {
    if (!provider.apiKey) {
      console.warn(`Saltando proveedor ${provider.name} porque no tiene API Key configurada en variables de entorno.`);
      continue;
    }

    try {
      console.log(`Intentando generar con ${provider.name} en el servidor...`);
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`HTTP ${response.status}: ${txt}`);
      }

      const result = await response.json();
      const raw = result.choices?.[0]?.message?.content || '';
      
      // Intentar parsear localmente para asegurar formato válido antes de responder
      const limpio = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(limpio);
      const arr = Array.isArray(parsed) ? parsed : parsed.preguntas;

      if (!Array.isArray(arr)) {
        throw new Error('El resultado de la IA no es un array.');
      }

      // Devolver directamente el array limpio
      res.status(200).json(arr);
      return;

    } catch (e) {
      console.error(`Error con ${provider.name}:`, e.message);
      errorMsg += `${provider.name}: ${e.message}. `;
    }
  }

  res.status(502).json({ error: `Todos los proveedores de IA fallaron. Errores: ${errorMsg}` });
}
