import { useCallback } from 'react';
import { registrarRespuesta } from '../../services/sessionService.js';
import { useServerTimer } from '../../hooks/useServerTimer.js';

export default function Question({ pin, studentId, sesion, yo, bloqueado }) {
  const idx = sesion.pregunta_idx;
  const pregunta = sesion.preguntas[idx];
  const yaRespondio = yo.respuestas_registradas?.[idx];
  const elegida = yaRespondio !== undefined ? yaRespondio : null;
  const total = sesion.preguntas.length;

  const restante = useServerTimer(
    sesion.pregunta_inicio_ts,
    sesion.pregunta_duracion,
    !bloqueado
  );

  const onElegir = useCallback(
    async (opcionIdx) => {
      if (bloqueado || elegida !== null) return;
      await registrarRespuesta(pin, studentId, idx, opcionIdx);
    },
    [bloqueado, elegida, pin, studentId, idx]
  );

  return (
    <main className="min-h-screen flex flex-col p-5 md:p-10">
      {/* Encabezado compacto */}
      <header className="flex items-center justify-between mb-6">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Pregunta {idx + 1} / {total}
        </div>
        <div
          className={`font-display tabular-nums text-4xl md:text-5xl ${
            !bloqueado && restante <= 5 ? 'text-deny animate-pulse-soft' : ''
          }`}
        >
          {bloqueado ? '–' : restante}
        </div>
      </header>

      {/* Enunciado */}
      <section className="mb-8">
        <h2 className="font-display text-2xl md:text-4xl leading-tight tracking-tight">
          {pregunta.pregunta}
        </h2>
      </section>

      {/* Opciones */}
      <section className="grid gap-3 md:gap-4 flex-1 content-start">
        {pregunta.opciones.map((op, i) => {
          const letra = String.fromCharCode(65 + i);
          const seleccionada = elegida === i;
          return (
            <button
              key={i}
              disabled={bloqueado || elegida !== null}
              onClick={() => onElegir(i)}
              className={`option-btn ${
                seleccionada ? 'border-ink bg-ink text-bone' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs tracking-widest opacity-50">{letra}</span>
                <span className="flex-1">{op}</span>
                {seleccionada && (
                  <span className="font-mono text-[10px] tracking-widest uppercase opacity-70">
                    Elegida
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </section>

      {/* Pie */}
      <footer className="pt-6 mt-6 border-t border-ink/10 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/50 text-center">
        {elegida !== null
          ? 'Respuesta enviada · espera a que se revele'
          : bloqueado
          ? 'Tiempo agotado'
          : 'Pulsa la opción que consideres correcta'}
      </footer>
    </main>
  );
}
