# Rediseño Estilo "Kahoot!" para Aula Quiz

Este plan detalla la transformación visual de la plataforma para pasar de un diseño editorial y sobrio a uno **gamificado, vibrante y muy atractivo para los estudiantes**, similar a Kahoot!.

## Propuesta Visual y de Interfaz (UI/UX)

1.  **Paleta de Colores Gamificada**:
    *   Fondo principal: Un tono azul/morado vibrante o gris claro con patrones geométricos, para dar la sensación de estar en un "Game Show".
    *   Opciones de respuesta (Los 4 clásicos):
        *   🔴 Rojo Carmesí (Triángulo)
        *   🔵 Azul Rey (Rombo)
        *   🟡 Amarillo Mostaza (Círculo)
        *   🟢 Verde Esmeralda (Cuadrado)
2.  **Tipografía Moderna y Amigable**:
    *   Reemplazaremos la fuente serif (Fraunces) por una fuente Sans-Serif gruesa, redondeada y muy legible (como `Quicksand`, `Nunito` o `Inter` en pesos bold).
3.  **Botones y Tarjetas 3D (Neumorfismo/Gamificación)**:
    *   En lugar de botones planos, usaremos botones con sombras sólidas en la parte inferior (efecto 3D). Al presionarlos, bajarán (efecto de botón físico).
    *   Esquinas redondeadas pronunciadas (`rounded-xl` o `rounded-2xl`) y uso intensivo de tarjetas (cards) blancas sobre el fondo de color.

---

## Cambios Propuestos por Componente

### 1. Configuración Global (`tailwind.config.js` y `index.css`)
*   [MODIFY] `tailwind.config.js`: Actualizar la paleta de colores para incluir `kahoot-red`, `kahoot-blue`, `kahoot-yellow`, `kahoot-green`, `game-bg`, `card-bg`. Modificar fuentes principales a sans-serif geométricas.
*   [MODIFY] `index.css`: Importar fuentes de Google Fonts (ej. Quicksand/Nunito). Modificar las clases base `.btn-primary` y `.option-btn` para añadir el efecto de sombra dura (bottom edge 3D) y transiciones elásticas.

### 2. Experiencia del Estudiante (Student View)
*   [MODIFY] `src/pages/student/Join.jsx`: Centrar el input del PIN en una tarjeta blanca prominente sobre un fondo vibrante. Hacer el input de texto más grande y amigable.
*   [MODIFY] `src/pages/student/Waiting.jsx`: Pantalla de espera con animaciones de rebote, mensaje de "¡Estás dentro, [Nombre]!" con letras grandes.
*   [MODIFY] `src/pages/student/Question.jsx`:
    *   El contador de tiempo será grande y circular (o prominente en la parte superior).
    *   Las 4 opciones se dispondrán en una grilla de 2x2.
    *   Cada botón usará su color correspondiente (Rojo, Azul, Amarillo, Verde) e incluirá un icono geométrico simple (▲, ◆, ●, ■).
    *   Animaciones de feedback más "jugonas" al seleccionar.
*   [MODIFY] `src/pages/student/Reveal.jsx`: Pantalla gigante roja o verde con un icono grande de check (✓) o cruz (✗) y animaciones de confeti (opcional) si acierta.

### 3. Experiencia del Docente (Teacher View)
*   [MODIFY] `src/pages/teacher/Lobby.jsx`: Mostrar el PIN en gigante en la parte superior central (estilo pantalla de proyector). La lista de estudiantes conectados en forma de "cajas" o "burbujas" que van apareciendo en un grid, en lugar de una lista aburrida.
*   [MODIFY] `src/pages/teacher/ControlPanel.jsx`: El panel de la pregunta activa debe mostrar la pregunta en grande y las opciones debajo con sus respectivos colores, igual que el estudiante, pero con estadísticas o botones de control claros.
*   [MODIFY] `src/pages/teacher/Dashboard.jsx` (Resultados): Una tabla de clasificación (Podio / Leaderboard) más colorida, resaltando a los mejores puntajes.

---

## User Review Required

> [!IMPORTANT]
> **Aprobación de la estética**
> ¿Estás de acuerdo con implementar los 4 colores clásicos y las formas geométricas para las opciones? ¿Te parece bien usar un fondo azul/morado jugón para la pantalla de inicio y espera?

> [!TIP]
> **Efectos de Sonido**
> Por ahora me enfocaré solo en la parte visual y animaciones (CSS/React). ¿Te gustaría que los componentes estén preparados para agregar efectos de sonido más adelante, o lo mantenemos solo visual por ahora?

> [!WARNING]
> Este cambio es profundo en la interfaz gráfica. El backend (Vercel) y la base de datos (Firebase) seguirán funcionando exactamente igual, **no se tocará la lógica de la IA ni de Firebase**, garantizando que siga funcionando perfecto, solo se verá 100 veces mejor.

Por favor, revisa el plan. Si me das luz verde, empezaré modificando la configuración global de CSS y luego actualizaré pantalla por pantalla asegurándome de no romper ninguna funcionalidad.
