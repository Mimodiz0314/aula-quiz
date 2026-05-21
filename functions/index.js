const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OpenAI } = require('openai');

admin.initializeApp();

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

exports.generarPreguntas = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data) => {
    const { tema, cantidad = 5, nivel = 'bachillerato' } = data;

    if (!tema || cantidad < 1) {
      throw new functions.https.HttpsError('invalid-argument', 'Parámetros inválidos.');
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'GROQ_API_KEY no está configurada en el servidor.');
    }

    const system = buildSystemPrompt(cantidad);
    const user = `Tema: ${tema}\nNivel del estudiante: ${nivel}\nGenera ${cantidad} preguntas siguiendo estrictamente el formato JSON especificado.`;

    try {
      console.log(`🤖 Generando ${cantidad} preguntas sobre "${tema}" con Groq...`);
      const openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
        timeout: 50000,
      });

      const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
      });

      const raw = response.choices[0].message.content || '';
      console.log('✅ ¡Preguntas generadas exitosamente con Groq!');

      const preguntas = parsearYValidar(raw, cantidad);
      return { preguntas };

    } catch (error) {
      console.error('❌ Error con Groq:', error.message || error);
      throw new functions.https.HttpsError('internal', `Error con Groq: ${error.message}`);
    }
  });
