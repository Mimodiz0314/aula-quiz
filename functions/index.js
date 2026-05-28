const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OpenAI } = require('openai');

admin.initializeApp();

// ---------------------------------------------------------------------------
// Helper: verifica que el caller tenga rol 'admin' en RTDB
// ---------------------------------------------------------------------------
async function verificarAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado.');
  }
  const snap = await admin.database().ref(`usuarios/${context.auth.uid}`).once('value');
  if (!snap.exists() || snap.val().rol !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Acceso denegado. Solo el administrador puede realizar esta acción.');
  }
}

// ---------------------------------------------------------------------------
// GENERACIÓN DE PREGUNTAS (función existente)
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

// ---------------------------------------------------------------------------
// CONFIGURAR PRIMER ADMINISTRADOR (solo funciona si no existe ningún admin)
// ---------------------------------------------------------------------------
exports.configurarAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado.');
  }

  // Verifica que no exista ningún admin previo
  const snap = await admin.database()
    .ref('usuarios')
    .orderByChild('rol')
    .equalTo('admin')
    .once('value');

  if (snap.exists()) {
    throw new functions.https.HttpsError(
      'already-exists',
      'Ya existe un administrador configurado. Contacta al administrador actual.'
    );
  }

  const { nombre } = data;
  if (!nombre || !nombre.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'El nombre es requerido.');
  }

  await admin.database().ref(`usuarios/${context.auth.uid}`).set({
    nombre: nombre.trim(),
    email: context.auth.token.email || '',
    rol: 'admin',
    activo: true,
    creado_en: Date.now(),
  });

  console.log(`✅ Admin configurado: ${context.auth.uid} (${context.auth.token.email})`);
  return { message: 'Administrador configurado exitosamente.' };
});

// ---------------------------------------------------------------------------
// CREAR DOCENTE — El admin crea la cuenta de un nuevo docente
// ---------------------------------------------------------------------------
exports.crearDocente = functions.https.onCall(async (data, context) => {
  await verificarAdmin(context);

  const { email, nombre, password } = data;
  if (!email || !nombre || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Email, nombre y contraseña son requeridos.');
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
  }

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: nombre.trim(),
    });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Ya existe una cuenta con ese correo.');
    }
    throw new functions.https.HttpsError('internal', `Error al crear usuario: ${e.message}`);
  }

  await admin.database().ref(`usuarios/${userRecord.uid}`).set({
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    rol: 'docente',
    activo: true,
    creado_en: Date.now(),
    creado_por: context.auth.uid,
  });

  console.log(`✅ Docente creado: ${userRecord.uid} (${email})`);
  return { uid: userRecord.uid, message: 'Docente creado exitosamente.' };
});

// ---------------------------------------------------------------------------
// DESACTIVAR DOCENTE — Bloquea el acceso sin borrar datos
// ---------------------------------------------------------------------------
exports.desactivarDocente = functions.https.onCall(async (data, context) => {
  await verificarAdmin(context);

  const { uid } = data;
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'UID requerido.');

  await admin.auth().updateUser(uid, { disabled: true });
  await admin.database().ref(`usuarios/${uid}`).update({ activo: false });

  console.log(`🔒 Docente desactivado: ${uid}`);
  return { message: 'Docente desactivado.' };
});

// ---------------------------------------------------------------------------
// REACTIVAR DOCENTE
// ---------------------------------------------------------------------------
exports.reactivarDocente = functions.https.onCall(async (data, context) => {
  await verificarAdmin(context);

  const { uid } = data;
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'UID requerido.');

  await admin.auth().updateUser(uid, { disabled: false });
  await admin.database().ref(`usuarios/${uid}`).update({ activo: true });

  console.log(`✅ Docente reactivado: ${uid}`);
  return { message: 'Docente reactivado.' };
});

// ---------------------------------------------------------------------------
// ELIMINAR DOCENTE — Borra cuenta de Auth y registro en RTDB
// ---------------------------------------------------------------------------
exports.eliminarDocente = functions.https.onCall(async (data, context) => {
  await verificarAdmin(context);

  const { uid } = data;
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'UID requerido.');

  try {
    await admin.auth().deleteUser(uid);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', `Error al eliminar: ${e.message}`);
    }
  }

  await admin.database().ref(`usuarios/${uid}`).remove();

  console.log(`🗑 Docente eliminado: ${uid}`);
  return { message: 'Docente eliminado.' };
});

// ---------------------------------------------------------------------------
// CAMBIAR CONTRASEÑA DE DOCENTE — Solo el admin puede hacerlo
// ---------------------------------------------------------------------------
exports.cambiarPasswordDocente = functions.https.onCall(async (data, context) => {
  await verificarAdmin(context);

  const { uid, password } = data;
  if (!uid || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'UID y contraseña son requeridos.');
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
  }

  await admin.auth().updateUser(uid, { password });

  console.log(`🔑 Contraseña actualizada para docente: ${uid}`);
  return { message: 'Contraseña actualizada exitosamente.' };
});
