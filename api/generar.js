export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
    return;
  }

  let { tema, cantidad, nivel, grado, dificultad, textoBase, seleccion, youtubeUrl } = req.body || {};

  // Si se envió un enlace de YouTube, intentamos extraer la transcripción primero
  if (youtubeUrl && youtubeUrl.trim()) {
    const videoId = getYouTubeVideoId(youtubeUrl.trim());
    if (!videoId) {
      res.status(400).json({ error: 'El enlace de YouTube provisto no es válido o no tiene un ID correcto.' });
      return;
    }
    try {
      console.log(`🎥 Extrayendo transcripción del video YouTube ID: ${videoId}`);
      const transcript = await getYouTubeTranscript(videoId);
      textoBase = transcript;
    } catch (err) {
      console.error('Error al obtener la transcripción de YouTube:', err);
      res.status(422).json({
        error: `No se pudo obtener la transcripción de YouTube: ${err.message}`
      });
      return;
    }
  }

  // Decide qué modo de generación usar
  const esMultiTipo = Array.isArray(seleccion) && seleccion.length > 0;

  if (!tema && !textoBase) {
    res.status(400).json({ error: 'Parámetros faltantes: debes proveer un tema, un textoBase o un youtubeUrl.' });
    return;
  }

  // Guía de adaptación cognitiva (grado + dificultad). Vacía si no se especifican.
  const guiaNivel = construirGuiaNivel(nivel, grado, dificultad);

  let systemPrompt = '';
  let userPrompt = '';

  // -------------------------------------------------------------------------
  // MODO MULTI-TIPO — 10 tipos de actividades educativas
  // -------------------------------------------------------------------------
  if (esMultiTipo) {
    const total = seleccion.reduce((s, [, n]) => s + Number(n), 0);

    systemPrompt = `Eres un diseñador senior de actividades educativas para colegios colombianos.
Tu tarea es generar un array JSON mixto de actividades interactivas para la clase, siguiendo los esquemas exactos descritos abajo.

REGLAS INNEGOCIABLES:
1. Devuelve EXCLUSIVAMENTE un array JSON válido. Sin markdown, sin texto extra, sin explicaciones.
2. 🚨 CRÍTICO: Cada objeto del array DEBE contener el campo "tipo" con EXACTAMENTE el valor indicado en la lista. SIN "tipo" el sistema explota.
3. Genera exactamente la cantidad de cada tipo que el usuario solicite, EN EL ORDEN indicado.
4. Idioma: español neutro, registro académico, ortografía perfecta.
5. Contenido adaptado al nivel académico indicado.
6. El array de respuesta debe tener EXACTAMENTE tantos objetos como el total solicitado.

ESQUEMAS POR TIPO:

tipo "seleccion_clasica" — opción múltiple con 4 respuestas:
{"tipo":"seleccion_clasica","pregunta":"enunciado claro","opciones":["A...","B...","C...","D..."],"correcta":0}
Reglas: correcta = índice 0-3 de la única opción correcta; opciones deben ser plausibles y de longitud similar.

tipo "verdad_mito" — enunciado verdadero o falso:
{"tipo":"verdad_mito","enunciado":"afirmación sobre el tema","correcto":"verdad","explicacion":"por qué es verdad o mito"}
Reglas: correcto debe ser exactamente "verdad" o "mito"; explicacion es breve (1-2 oraciones).

tipo "rompecabezas_ideas" — ordenar fragmentos en secuencia correcta:
{"tipo":"rompecabezas_ideas","instruccion":"Ordena estos fragmentos en el orden correcto:","fragmentos":["frag1","frag2","frag3","frag4"]}
Reglas: escribe los fragmentos YA EN EL ORDEN CORRECTO (el sistema los desordenará para el estudiante); mínimo 3 fragmentos.

tipo "parejas_logicas" — emparejar conceptos con definiciones:
{"tipo":"parejas_logicas","instruccion":"Empareja cada concepto con su definición:","pares":[{"izquierda":"término","derecha":"definición"},{"izquierda":"término","derecha":"definición"},{"izquierda":"término","derecha":"definición"},{"izquierda":"término","derecha":"definición"}]}
Reglas: exactamente 4 pares; izquierda = concepto, derecha = su definición o par correcto.

tipo "caza_intruso" — encontrar el elemento que no pertenece:
{"tipo":"caza_intruso","instruccion":"¿Cuál de estos elementos no pertenece al grupo?","elementos":["elem1","elem2","elem3","elem4","elem5"],"intruso_idx":2}
Reglas: exactamente 5 elementos; intruso_idx = índice 0-4 del elemento que no pertenece; los demás deben pertenecer claramente a la misma categoría.

tipo "clasificador" — clasificar elementos en dos categorías:
{"tipo":"clasificador","instruccion":"Clasifica cada elemento en su categoría correcta:","categorias":[{"nombre":"Categoría A","items":["item1","item2","item3"]},{"nombre":"Categoría B","items":["item4","item5","item6"]}]}
Reglas: exactamente 2 categorías con exactamente 3 items cada una; los items de cada categoría deben pertenecer claramente a ella.

tipo "palabras_perdidas" — completar texto con banco de palabras:
{"tipo":"palabras_perdidas","oracion":"La [___] ocurre en los [___] de las plantas.","banco":["fotosíntesis","cloroplastos","mitocondrias","respiración"],"respuestas":["fotosíntesis","cloroplastos"]}
Reglas: usa [___] para cada espacio en blanco en oracion; respuestas lista la palabra correcta para cada [___] en orden; banco incluye las respuestas correctas más 2-3 distractores plausibles.

tipo "paso_a_paso" — ordenar pasos de un proceso:
{"tipo":"paso_a_paso","instruccion":"Ordena los pasos del proceso:","pasos":["paso1","paso2","paso3","paso4"]}
Reglas: escribe los pasos YA EN EL ORDEN CORRECTO (el sistema los desordenará); mínimo 3 pasos; cada paso debe ser una acción concreta.

tipo "real_inventado" — determinar si un hecho es real o ficticio:
{"tipo":"real_inventado","enunciado":"afirmación sobre el tema","correcto":"real","explicacion":"por qué es real o inventado"}
Reglas: correcto debe ser exactamente "real" o "inventado"; el enunciado inventado debe ser plausible pero verificablemente falso; explicacion es breve (1-2 oraciones).

tipo "detective_texto" — leer un pasaje y responder:
{"tipo":"detective_texto","pasaje":"fragmento de lectura de 2-4 oraciones relacionado con el tema","pregunta":"pregunta de comprensión sobre el pasaje","opciones":["A...","B...","C...","D..."],"correcta":1}
Reglas: pasaje de 2-4 oraciones; la respuesta correcta debe estar respaldada por el pasaje; correcta = índice 0-3.`;

    // Construir la lista expandida: Actividad 1: tipo=X, Actividad 2: tipo=Y, ...
    let idx = 0;
    const listaExpandida = seleccion
      .flatMap(([tipo, n]) =>
        Array.from({ length: Number(n) }, () => `  Actividad ${++idx}: tipo="${tipo}"`)
      )
      .join('\n');

    let contextPrompt = '';
    if (textoBase && textoBase.trim()) {
      contextPrompt = `
🚨 FUENTE DE DATOS / TEXTO BASE:
Utiliza el siguiente texto (que puede ser un cuestionario previo o un resumen de contenido) como la fuente exclusiva para generar o adaptar las actividades.
Si es un cuestionario copiado por lotes, adáptalo y conviértelo a los formatos y tipos de actividades especificados abajo.
Si es un resumen, extrae información relevante para crear las actividades solicitadas.
---
${textoBase.trim()}
---
`;
    }

    userPrompt = `${contextPrompt}
Tema general: ${tema || 'General'}
Nivel académico: ${nivel || 'bachillerato'}${guiaNivel}
Total de actividades: ${total}

Genera EXACTAMENTE estas ${total} actividades en este orden. El campo "tipo" de cada objeto DEBE ser EXACTAMENTE el indicado:
${listaExpandida}

Devuelve EXCLUSIVAMENTE el array JSON con los ${total} objetos. El primer objeto tendrá el tipo de Actividad 1, el segundo de Actividad 2, etc. Nada antes, nada después del array.`;

  // -------------------------------------------------------------------------
  // MODO CLÁSICO — solo seleccion_clasica (compatibilidad con flujo antiguo)
  // -------------------------------------------------------------------------
  } else if (textoBase) {
    systemPrompt = `Eres un asistente experto en extracción de datos educativos.
Lee el texto crudo y extrae todas las preguntas, opciones y la respuesta correcta.
Formatea el resultado EXACTAMENTE como un array JSON.

FORMATO DE SALIDA — EXCLUSIVAMENTE este JSON, sin texto adicional, sin Markdown:
[{"tipo":"seleccion_clasica","pregunta":"string","opciones":["Op1","Op2","Op3","Op4"],"correcta":0}]
El campo "correcta" es el índice 0-3 de la opción correcta.
Devuelve EXCLUSIVAMENTE el array JSON. Nada antes, nada después.`;
    userPrompt = `Extrae el cuestionario del siguiente texto:${guiaNivel}\n\n${textoBase}`;

  } else {
    systemPrompt = `Eres un evaluador senior con experiencia en pruebas estandarizadas ICFES Saber (Colombia).
Genera EXACTAMENTE ${cantidad || 10} preguntas de selección múltiple cumpliendo estos criterios:

1. ENUNCIADO: claro, autocontenido, con contexto + tarea. Sin ambigüedad.
2. OPCIONES: 4 alternativas plausibles de longitud similar, redactadas en paralelo gramatical.
3. CORRECTA: una y solo una opción inobjetablemente correcta.
4. DIFICULTAD: progresiva pero alcanzable para el nivel solicitado.
5. IDIOMA: español neutro, registro académico, ortografía perfecta.

FORMATO DE SALIDA — EXCLUSIVAMENTE este JSON, sin texto adicional, sin Markdown:
[{"tipo":"seleccion_clasica","pregunta":"string","opciones":["A...","B...","C...","D..."],"correcta":0}]
Devuelve EXCLUSIVAMENTE el array JSON. Nada antes, nada después.`;
    userPrompt = `Tema: ${tema}\nNivel del estudiante: ${nivel || 'bachillerato'}${guiaNivel}\nGenera ${cantidad || 10} preguntas siguiendo estrictamente el formato JSON especificado.`;
  }

  const providers = [
    {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
    },
  ];

  // Si es multi-tipo, precalculamos la lista expandida de tipos
  // para poder rescatar el campo "tipo" si la IA lo omite.
  // tiposEsperados[i] = tipo que debería tener la actividad i
  let tiposEsperados = [];
  if (esMultiTipo) {
    for (const [tipo, n] of seleccion) {
      for (let k = 0; k < Number(n); k++) tiposEsperados.push(tipo);
    }
  }

  let errorMsg = '';

  for (const provider of providers) {
    if (!provider.apiKey) {
      console.warn(`Saltando ${provider.name}: sin API Key configurada.`);
      continue;
    }
    try {
      console.log(`Intentando con ${provider.name}…`);
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,  // más baja = más fiel al esquema
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`HTTP ${response.status}: ${txt}`);
      }

      const result = await response.json();
      const raw = result.choices?.[0]?.message?.content || '';

      // --- Limpieza robusta del texto ---
      const limpio = raw.trim()
        .replace(/^```(?:json)?[\s\r\n]*/i, '')
        .replace(/[\s\r\n]*```$/i, '')
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(limpio);
      } catch (parseErr) {
        // Intentar extraer el primer array/objeto JSON del texto
        const match = limpio.match(/(\[\s*\{[\s\S]*\}\s*\]|\{[\s\S]*\})/);
        if (!match) throw new Error('No se encontró JSON válido en la respuesta de la IA.');
        parsed = JSON.parse(match[1]);
      }

      // --- Extracción robusta del array ---
      // Busca el array en cualquier clave del objeto si no viene directo
      let arr;
      if (Array.isArray(parsed)) {
        arr = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Buscar la primera clave cuyo valor sea un array
        const claveArray = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        arr = claveArray ? parsed[claveArray] : null;
      }

      if (!Array.isArray(arr)) throw new Error('El resultado de la IA no es un array.');

      // --- Rescate del campo "tipo" si la IA lo omitió ---
      // Solo aplica en modo multi-tipo y si tiposEsperados está disponible
      if (esMultiTipo && tiposEsperados.length === arr.length) {
        arr = arr.map((item, i) => {
          if (!item.tipo && tiposEsperados[i]) {
            console.warn(`⚠️ Actividad ${i + 1} sin campo "tipo" — asignando "${tiposEsperados[i]}" automáticamente.`);
            return { ...item, tipo: tiposEsperados[i] };
          }
          return item;
        });
      }

      res.status(200).json(arr);
      return;

    } catch (e) {
      console.error(`Error con ${provider.name}:`, e.message);
      errorMsg += `${provider.name}: ${e.message}. `;
    }
  }

  res.status(502).json({ error: `Todos los proveedores de IA fallaron. Errores: ${errorMsg}` });
}

// ---------------------------------------------------------------------------
// GUÍA DE ADAPTACIÓN COGNITIVA (grado + dificultad)
// Convierte el grado y la dificultad en instrucciones claras para que la IA
// ajuste el contenido al desarrollo del estudiante. Si no se especifican,
// devuelve cadena vacía (comportamiento idéntico al anterior).
// ---------------------------------------------------------------------------
const DESC_GRADO = {
  'Preescolar': 'Niñas y niños de 4-5 años (etapa preoperacional). Vocabulario muy simple y concreto, frases muy cortas, ideas del entorno inmediato (familia, colores, animales, números del 1 al 10). Evita por completo las abstracciones.',
  '1°': 'Niños de ~6 años. Lectura inicial y conteo básico. Conceptos concretos y cotidianos; enunciados muy cortos y directos.',
  '2°': 'Niños de ~7 años. Lectura fluida incipiente, sumas y restas simples, secuencias sencillas. Lenguaje concreto.',
  '3°': 'Niños de ~8 años. Comprensión lectora básica, multiplicación inicial, clasificaciones simples.',
  '4°': 'Niños de ~9 años. Razonamiento concreto más sólido, fracciones simples, relaciones de causa-efecto sencillas.',
  '5°': 'Niños de ~10 años. Comprensión lectora intermedia, operaciones combinadas, primeras generalizaciones.',
  '6°': 'Estudiantes de ~11 años (tránsito de lo concreto a lo formal). Pensamiento abstracto incipiente y guiado; definiciones y comparaciones claras.',
  '7°': 'Estudiantes de ~12 años. Pensamiento abstracto en desarrollo; relaciones y clasificaciones más complejas.',
  '8°': 'Estudiantes de ~13 años. Abstracción creciente; hipótesis sencillas y análisis de causas.',
  '9°': 'Estudiantes de ~14 años. Pensamiento formal; análisis, argumentación básica y relaciones múltiples.',
  '10°': 'Estudiantes de ~15-16 años. Pensamiento abstracto consolidado; análisis crítico, síntesis y evaluación de argumentos.',
  '11°': 'Estudiantes de ~16-17 años (preuniversitario, estilo ICFES Saber 11). Análisis crítico, inferencia, evaluación y resolución de problemas complejos.',
  'Semestres 1–3': 'Estudiantes universitarios de primeros semestres. Fundamentos disciplinares: comprensión y aplicación de conceptos base.',
  'Semestres 4–6': 'Estudiantes universitarios intermedios. Análisis disciplinar, integración de conceptos y resolución de problemas aplicados.',
  'Semestres 7+': 'Estudiantes universitarios avanzados. Pensamiento crítico experto: evaluación, síntesis y casos complejos y especializados.',
};

const DESC_DIFICULTAD = {
  'Básico': 'Profundidad BÁSICA (recordar y comprender): definiciones, identificación y ejemplos directos. Enunciados cortos con una sola idea; distractores claramente distinguibles.',
  'Intermedio': 'Profundidad INTERMEDIA (aplicar y analizar): usar conceptos en situaciones, comparar, clasificar y relacionar causa-efecto. Distractores plausibles.',
  'Avanzado': 'Profundidad AVANZADA (evaluar y crear): juzgar, argumentar, inferir y resolver problemas de varios pasos. Distractores muy plausibles que exijan discriminar finamente.',
};

const GRADOS_TEMPRANOS = ['Preescolar', '1°', '2°'];

function construirGuiaNivel(nivel, grado, dificultad) {
  const partes = [];
  if (grado) {
    const desc = DESC_GRADO[grado];
    partes.push(`Grado/curso: ${grado}.${desc ? ' ' + desc : ''}`);
  }
  if (dificultad && DESC_DIFICULTAD[dificultad]) {
    partes.push(DESC_DIFICULTAD[dificultad]);
  }
  if (GRADOS_TEMPRANOS.includes(grado)) {
    partes.push('CRÍTICO — LECTORES INICIALES: estos estudiantes AÚN NO LEEN BIEN. Usa EMOJIS o pictogramas en los enunciados y SOBRE TODO en las opciones (idealmente cada opción es un emoji grande acompañado de UNA sola palabra muy corta, p. ej. "🐶 Perro"). Texto mínimo, palabras cortas y de uso cotidiano, una sola idea por pregunta. Usa conceptos concretos y visuales (animales 🐶🐱, frutas 🍎🍌, colores, números, formas ⭐🔺). Evita por completo los pasajes de lectura largos y el vocabulario abstracto.');
  }
  if (partes.length === 0) return '';
  return `\n\n🎯 ADAPTACIÓN AL NIVEL DEL ESTUDIANTE (OBLIGATORIO):\n${partes.map((p) => `- ${p}`).join('\n')}\n- Ajusta el vocabulario, la longitud y complejidad del enunciado, el número de pasos y la sutileza de los distractores a este perfil. No excedas ni subestimes el nivel cognitivo indicado.`;
}

// ---------------------------------------------------------------------------
// HELPERS PARA EXTRACCIÓN DE SUBTÍTULOS DE YOUTUBE (SIN LIBRERÍAS EXTERNAS)
// ---------------------------------------------------------------------------

function getYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function getYouTubeTranscript(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    }
  });
  if (!response.ok) {
    throw new Error(`No se pudo acceder a la página de YouTube (HTTP ${response.status})`);
  }
  const html = await response.text();

  const index = html.indexOf('"captionTracks":');
  if (index === -1) {
    throw new Error('Este video no tiene subtítulos habilitados o disponibles.');
  }

  // Encontrar el inicio del array de subtítulos
  const startIndex = html.indexOf('[', index);
  if (startIndex === -1) {
    throw new Error('Formato de subtítulos inesperado.');
  }

  // Escanear para balancear corchetes y extraer el JSON
  let bracketCount = 1;
  let endIndex = startIndex + 1;
  while (bracketCount > 0 && endIndex < html.length) {
    const char = html[endIndex];
    if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
    endIndex++;
  }
  const jsonStr = html.substring(startIndex, endIndex);

  let captionTracks;
  try {
    captionTracks = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('No se pudo analizar la información de subtítulos del video.');
  }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No se encontraron pistas de subtítulos.');
  }

  // Priorizar pista en español (código 'es' o 'es-ES', etc.), luego inglés, luego primera disponible
  let track = captionTracks.find(t => t.languageCode === 'es')
            || captionTracks.find(t => t.languageCode?.startsWith('es'))
            || captionTracks.find(t => t.languageCode === 'en')
            || captionTracks[0];

  if (!track || !track.baseUrl) {
    throw new Error('No se encontró una pista de subtítulos válida en español o inglés.');
  }

  // Descargar el XML de subtítulos
  const transcriptResponse = await fetch(track.baseUrl);
  if (!transcriptResponse.ok) {
    throw new Error('No se pudo descargar la pista de transcripción.');
  }
  const xml = await transcriptResponse.text();

  // Limpiar XML y unir fragmentos de texto
  const matches = xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g);
  let textList = [];
  for (const m of matches) {
    let fragment = m[1];
    // Decodificar entidades HTML básicas
    fragment = fragment
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&ntilde;/g, 'ñ')
      .replace(/&Ntilde;/g, 'Ñ')
      .replace(/&aacute;/g, 'á')
      .replace(/&eacute;/g, 'é')
      .replace(/&iacute;/g, 'í')
      .replace(/&oacute;/g, 'ó')
      .replace(/&uacute;/g, 'ú');
    textList.push(fragment);
  }

  if (textList.length === 0) {
    throw new Error('Los subtítulos no contienen texto decodificable.');
  }

  // Limitar palabras para evitar sobrecargar la ventana de contexto de la IA
  const fullText = textList.join(' ');
  const words = fullText.split(/\s+/);
  if (words.length > 5000) {
    return words.slice(0, 5000).join(' ') + '... [Transcripción truncada por longitud]';
  }
  return fullText;
}
