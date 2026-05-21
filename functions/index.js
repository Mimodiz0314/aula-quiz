const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Anthropic } = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');

admin.initializeApp();

const PROVIDER = process.env.AI_PROVIDER || 'anthropic';

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
    throw new functions.https.HttpsError('internal', 'La IA no devolvió JSON válido: ' + e.message);
  }

  const arr = Array.isArray(parsed) ? parsed : parsed.preguntas;
  if (!Array.isArray(arr)) {
    throw new functions.https.HttpsError('internal', 'Formato inesperado: se esperaba un array.');
  }

  const norm = arr.map((p, i) => {
    if (!p.pregunta || !Array.isArray(p.opciones) || p.opciones.length !== 4) {
      throw new functions.https.HttpsError('internal', `Pregunta ${i + 1} mal formada.`);
    }
    const correcta = Number(p.correcta);
    if (!Number.isInteger(correcta) || correcta < 0 || correcta > 3) {
      throw new functions.https.HttpsError('internal', `Pregunta ${i + 1}: índice "correcta" inválido.`);
    }
    return {
      pregunta: String(p.pregunta).trim(),
      opciones: p.opciones.map((o) => String(o).trim()),
      correcta,
    };
  });

  if (norm.length < 1) throw new functions.https.HttpsError('internal', 'La IA devolvió 0 preguntas.');
  return norm.slice(0, cantidad);
}

exports.generarPreguntas = functions.https.onCall(async (data, context) => {
  // En la Fase 1, paso 2, se recomienda requerir autenticación para el docente.
  // Por ahora lo dejamos abierto o verificamos context.auth
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'Solo docentes autenticados pueden generar preguntas.');
  // }

  const { tema, cantidad = 5, nivel = 'bachillerato' } = data;
  if (!tema || cantidad < 1) {
    throw new functions.https.HttpsError('invalid-argument', 'Parámetros inválidos.');
  }

  const system = buildSystemPrompt(cantidad);
  const user = `Tema: ${tema}\nNivel del estudiante: ${nivel}\nGenera ${cantidad} preguntas siguiendo estrictamente el formato JSON especificado.`;

  const providers = [
    {
      name: 'Groq',
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile'
    },
    {
      name: 'Cerebras',
      apiKey: process.env.CEREBRAS_API_KEY,
      baseURL: 'https://api.cerebras.ai/v1',
      model: 'llama3.1-70b'
    },
    {
      name: 'DeepSeek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
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
      console.log(`🤖 Intentando generar preguntas con ${provider.name}...`);
      const openai = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
        timeout: 25000 // 25 segundos de timeout
      });

      const response = await openai.chat.completions.create({
        model: provider.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
      });

      const raw = response.choices[0].message.content || '';
      console.log(`✅ ¡Preguntas generadas exitosamente con ${provider.name}!`);

      const preguntas = parsearYValidar(raw, cantidad);
      return { preguntas };

    } catch (error) {
      console.error(`❌ Error en proveedor ${provider.name}:`, error.message || error);
      errorMsg += `${provider.name}: ${error.message || error}. `;
    }
  }

  throw new functions.https.HttpsError('internal', `Todos los proveedores de IA fallaron. Errores: ${errorMsg}`);
});
