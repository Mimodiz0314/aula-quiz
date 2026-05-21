import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
    return;
  }

  const { urlYoutube, cantidad, nivel } = req.body || {};

  if (!urlYoutube) {
    res.status(400).json({ error: 'Falta el parámetro urlYoutube.' });
    return;
  }

  // ── 1. Extraer el Video ID de la URL ───────────────────────────────────────
  let videoId = null;
  try {
    const url = new URL(urlYoutube);
    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.slice(1).split('?')[0];
    } else {
      videoId = url.searchParams.get('v');
    }
  } catch {
    res.status(400).json({ error: 'La URL de YouTube no es válida.' });
    return;
  }

  if (!videoId) {
    res.status(400).json({ error: 'No se pudo extraer el ID del video de YouTube.' });
    return;
  }

  // ── 2. Descargar la Transcripción ──────────────────────────────────────────
  let transcripcion = '';
  try {
    console.log(`Descargando transcripción para video: ${videoId}`);
    // Intenta primero en español, luego en inglés como respaldo
    let segmentos = null;
    try {
      segmentos = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' });
    } catch {
      segmentos = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    }
    transcripcion = segmentos.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    console.log(`Transcripción obtenida: ${transcripcion.length} caracteres`);
  } catch (e) {
    console.error('Error obteniendo transcripción:', e.message);
    res.status(422).json({
      error: `No se pudo obtener la transcripción del video. Asegúrate de que el video tiene subtítulos habilitados. Detalle: ${e.message}`
    });
    return;
  }

  if (transcripcion.length < 100) {
    res.status(422).json({ error: 'La transcripción del video es demasiado corta para generar preguntas.' });
    return;
  }

  // Limitar la transcripción a los primeros 12000 caracteres para no saturar la IA
  const transcripcionLimitada = transcripcion.slice(0, 12000);

  // ── 3. Generar preguntas con la IA ─────────────────────────────────────────
  const cantidadFinal = cantidad || 10;
  const nivelFinal = nivel || 'bachillerato';

  const systemPrompt = `Eres un evaluador senior con experiencia en pruebas estandarizadas ICFES Saber (Colombia).
Tu tarea es leer la transcripción de un video educativo de YouTube y generar EXACTAMENTE ${cantidadFinal} preguntas de selección múltiple basadas ÚNICAMENTE en el contenido del video.

Criterios INNEGOCIABLES:
1. SOLO usa información que esté en la transcripción. No inventes datos externos.
2. ENUNCIADO: claro, autocontenido, con contexto. Sin ambigüedad.
3. OPCIONES: 4 alternativas, de longitud y complejidad similares, todas plausibles.
4. CORRECTA: una y solo una opción inobjetablemente correcta según el video.
5. IDIOMA: español neutro, registro académico, ortografía perfecta.
6. SIN PISTAS: no incluyas "todas las anteriores" ni "ninguna".

FORMATO DE SALIDA — EXCLUSIVAMENTE este JSON, sin texto adicional, sin Markdown:
[
  {
    "pregunta": "string con el enunciado",
    "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correcta": 0
  }
]
El campo "correcta" es el índice 0-3 de la opción correcta.
Devuelve EXCLUSIVAMENTE el array JSON. Nada antes, nada después.`;

  const userPrompt = `Nivel del estudiante: ${nivelFinal}\n\nTranscripción del video:\n${transcripcionLimitada}\n\nGenera ${cantidadFinal} preguntas basadas en esta transcripción.`;

  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'No hay API Key de IA configurada en el servidor.' });
    return;
  }

  try {
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      throw new Error(`IA respondió con error HTTP ${aiResponse.status}: ${txt}`);
    }

    const result = await aiResponse.json();
    const raw = result.choices?.[0]?.message?.content || '';

    const limpio = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(limpio);
    const arr = Array.isArray(parsed) ? parsed : parsed.preguntas;

    if (!Array.isArray(arr)) throw new Error('La IA no devolvió un array válido.');

    res.status(200).json(arr);
  } catch (e) {
    console.error('Error generando preguntas desde YouTube:', e.message);
    res.status(502).json({ error: `Error al generar preguntas: ${e.message}` });
  }
}
