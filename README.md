# Aula — Evaluación interactiva en tiempo real

Aplicación tipo Kahoot minimalista, con rigor evaluativo ICFES, baja latencia y cero saturación visual.

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Sincronización:** Firebase Realtime Database (sin REST, sólo listeners)
- **IA:** Anthropic Claude **o** OpenAI (intercambiables vía `.env`)
- **Escala de calificación:** 0.0 – 5.0 lineal — `(aciertos / total) × 5`

---

## 1. Estructura del proyecto

```
quiz-app/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx                ← entry point
    ├── App.jsx                 ← router
    ├── index.css               ← Tailwind + estilos base
    ├── firebase/
    │   └── config.js           ← inicialización Firebase RTDB
    ├── services/
    │   ├── sessionService.js   ← TODAS las mutaciones a la BD
    │   └── aiService.js        ← System Prompt + generación con IA
    ├── hooks/
    │   ├── useRealtimeSession.js  ← suscripción reactiva a /sesiones/{pin}
    │   └── useServerTimer.js      ← temporizador desde ts del servidor
    ├── utils/
    │   ├── pin.js              ← generador de PIN de 5 dígitos
    │   └── grading.js          ← lógica pura de cálculo de nota
    └── pages/
        ├── Home.jsx
        ├── teacher/
        │   ├── TeacherView.jsx    ← orquestador por estado
        │   ├── Setup.jsx          ← tema + cantidad + generar
        │   ├── Lobby.jsx          ← PIN gigante + lista
        │   ├── ControlPanel.jsx   ← pregunta + temporizador + conteo
        │   └── Dashboard.jsx      ← tabla final + CSV
        └── student/
            ├── StudentView.jsx
            ├── Join.jsx           ← ingreso + reconexión
            ├── Waiting.jsx
            ├── Question.jsx       ← 4 botones grandes
            ├── Reveal.jsx         ← tinte verde/rojo <200ms
            └── FinalScore.jsx     ← nota 0.0–5.0
```

---

## 2. Modelo de datos (Realtime Database)

```jsonc
{
  "sesiones": {
    "47213": {                          // PIN como clave
      "creada_en": 1715000000000,       // ms desde epoch (servidor)
      "estado_actual": "lobby",         // máquina de estados (ver abajo)
      "pregunta_idx": -1,               // índice actual; -1 = aún no inicia
      "pregunta_inicio_ts": null,       // ms — autoritativo del servidor
      "pregunta_duracion": 30,          // segundos
      "preguntas": [
        {
          "pregunta": "¿Quién…?",
          "opciones": ["A…", "B…", "C…", "D…"],
          "correcta": 2                 // índice 0-3
        }
      ],
      "estudiantes": {
        "-NxyAbc123": {                 // push() ID
          "nombre": "María Pérez",
          "grado": "9°B",
          "conectado": true,
          "respuestas_registradas": {
            "0": 2,                     // pregunta 0 → opción 2
            "1": 0
          },
          "nota_acumulada": 4.2,
          "unido_en": 1715000010000
        }
      }
    }
  }
}
```

### Estados (`estado_actual`)

| Estado                | Significado                                                            |
|-----------------------|------------------------------------------------------------------------|
| `lobby`               | Esperando estudiantes; PIN visible.                                    |
| `pregunta_activa`     | Cronómetro corriendo; botones del estudiante habilitados.              |
| `tiempo_agotado`      | Cliente bloquea botones; servidor sigue siendo autoridad.              |
| `respuesta_revelada`  | Se tiñe la pantalla del estudiante en verde/rojo (<200 ms).            |
| `resultados_finales`  | Dashboard del docente y nota individual del estudiante.                |

El **docente es el único emisor** de transiciones. Los clientes mutan su UI escuchando.

---

## 3. Reglas de seguridad de Firebase (mínimas)

Pega esto en `Realtime Database → Reglas`:

```json
{
  "rules": {
    "sesiones": {
      "$pin": {
        ".read": true,
        ".write": true,
        ".indexOn": ["creada_en"],
        "preguntas": {
          ".write": "!data.exists() || newData.exists()"
        }
      }
    }
  }
}
```

> En producción: añade autenticación anónima y reglas que limiten escrituras
> de `estado_actual` al docente que creó la sesión (guarda su UID en la raíz).

---

## 4. Configuración del entorno

1. **Crea el proyecto Firebase**
   - Console → *Add project*
   - Activa **Realtime Database** (no Firestore) — *Start in test mode*
   - Copia las credenciales web → `.env`

2. **Copia y rellena variables**
   ```bash
   cp .env.example .env
   ```

3. **Elige proveedor de IA** en `.env`:
   ```
   VITE_AI_PROVIDER=anthropic        # o "openai"
   VITE_ANTHROPIC_API_KEY=sk-ant-...
   # o
   VITE_OPENAI_API_KEY=sk-...
   ```

   > ⚠ **CORS / seguridad**: llamar a la API de Anthropic u OpenAI **directamente
   > desde el navegador** expone tu clave a cualquier estudiante que abra DevTools.
   > Para producción real, mueve `aiService.js` a una **Cloud Function** o
   > backend propio que reciba `{tema, cantidad}` y devuelva el JSON ya validado.
   > El código actual es válido para **demos, aulas controladas y prototipos**.

---

## 5. Instalación y arranque

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera /dist para producción
npm run preview      # sirve /dist localmente
```

### Despliegue rápido (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting       # selecciona /dist como public dir, SPA = yes
npm run build
firebase deploy
```

### Despliegue rápido (Vercel / Netlify)

- Sube el repo. Variables de entorno → copia las del `.env`.
- Build command: `npm run build` · Output dir: `dist`

---

## 6. Flujo de uso

### Docente

1. `/docente` → Setup (Tema + Cantidad + Generar con IA)
2. La IA devuelve JSON validado → se crea la sesión con PIN.
3. Lobby: muestra PIN gigante; ve a estudiantes uniéndose.
4. *Iniciar evaluación* → ControlPanel con pregunta, timer, conteo.
5. Cuando expira el tiempo (o el docente pulsa *Detener*), estado pasa a
   `tiempo_agotado` y los botones del cliente se bloquean al instante.
6. *Mostrar respuesta* → estudiante ve verde/rojo en <200 ms.
7. *Siguiente* → siguiente pregunta; al terminar, Dashboard con notas.

### Estudiante

1. `/jugar` → PIN → datos → unirse.
2. Espera. Cuando inicia, recibe la pregunta y 4 botones grandes.
3. Pulsa una opción → bloqueo de respuesta (sólo una por pregunta).
4. Al revelarse: pantalla teñida verde (acierto) o rojo (error).
5. Al final: su nota 0.0 – 5.0 en pantalla.

---

## 7. Decisiones de ingeniería

### Bloqueo concurrente
`registrarRespuesta` usa **`runTransaction`** sobre el nodo de la sesión.
La escritura se aborta si:
- el `estado_actual` ya no es `pregunta_activa`,
- la pregunta cambió (`pregunta_idx`),
- el estudiante ya respondió esa pregunta.

Esto evita carreras: nunca un cliente sobrescribe su respuesta tras vencerse
el tiempo, ni gana una respuesta tardía contra el cambio de estado.

### Reloj autoritativo
`pregunta_inicio_ts` se escribe con `serverTimestamp()`. El cliente sólo
**muestra** la cuenta atrás (`useServerTimer`); la autoridad real para
transicionar a `tiempo_agotado` es el docente (en su `onExpire`).

### Reconexión de estudiante
`registrarEstudiante` guarda `{studentId, nombre, grado}` en `localStorage`
con clave `quiz_student_{pin}`. Al volver, `Join.jsx` ofrece reconectar y
reutiliza el mismo `studentId` — no se duplica el nombre ni se pierden
respuestas. Presencia con `onDisconnect` marca `conectado=false`.

### Calificación
Función pura en `utils/grading.js`. `revelarRespuesta` recalcula
`nota_acumulada` de todos los estudiantes en cada revelación, manteniendo
el dashboard siempre consistente.

### System Prompt ICFES
En `aiService.js`. Exige enunciado claro, 4 opciones paralelas en longitud,
una sola correcta inobjetable, ortografía perfecta y JSON estricto.
`parsearYValidar` normaliza la salida (también soporta el wrapper
`{ preguntas: [...] }` de OpenAI).

---

## 8. Checklist antes de un aula real

- [ ] Reglas de Firebase ajustadas (no `true` global en producción)
- [ ] API de IA detrás de un proxy/Cloud Function (clave no expuesta)
- [ ] Duración por defecto ajustada al ritmo del grupo
- [ ] Probar con red 3G simulada (Chrome DevTools → Network throttling)
- [ ] Probar reconexión: cerrar pestaña, volver con mismo PIN
- [ ] Exportar CSV al finalizar como respaldo

---

## 9. Licencia

MIT. Úsalo, modifícalo, comparte mejoras.
