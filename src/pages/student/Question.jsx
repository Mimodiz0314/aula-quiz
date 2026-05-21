import { useCallback, useState } from 'react';
import { registrarRespuesta } from '../../services/sessionService.js';
import { useServerTimer } from '../../hooks/useServerTimer.js';

export default function Question({ pin, studentId, sesion, yo, bloqueado }) {
  const idx = sesion.pregunta_idx;
  const pregunta = sesion.preguntas[idx];
  const yaRespondio = yo.respuestas_registradas?.[idx];
  const elegida = yaRespondio !== undefined ? yaRespondio : null;
  const total = sesion.preguntas.length;

  // Estado local para animación inmediata de clic (antes de que Firebase responda)
  const [pendiente, setPendiente] = useState(null);

  const restante = useServerTimer(
    sesion.pregunta_inicio_ts,
    sesion.pregunta_duracion,
    !bloqueado
  );

  const onElegir = useCallback(
    async (opcionIdx) => {
      if (bloqueado || elegida !== null || pendiente !== null) return;
      setPendiente(opcionIdx); // feedback inmediato
      await registrarRespuesta(pin, studentId, idx, opcionIdx);
      // Si Firebase confirma, elegida se actualizará desde el listener.
      // Si falla, reseteamos.
    },
    [bloqueado, elegida, pendiente, pin, studentId, idx]
  );

  // La opción visualmente activa es la confirmada por Firebase, o la pendiente local
  const opcionActiva = elegida !== null ? elegida : pendiente;
  const confirmada = elegida !== null;

  return (
    <main className="min-h-screen flex flex-col p-5 md:p-10">
      {/* Encabezado */}
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
          const esActiva = opcionActiva === i;
          const esPendiente = pendiente === i && elegida === null;

          return (
            <button
              key={i}
              onClick={() => onElegir(i)}
              disabled={bloqueado || (opcionActiva !== null && !esActiva)}
              style={{
                // Usamos style inline para garantizar que los colores no sean
                // anulados por el opacity-50 de disabled en Tailwind
                backgroundColor: esActiva ? '#111111' : '',
                color: esActiva ? '#f4f1ea' : '',
                borderColor: esActiva ? '#111111' : '',
                transform: esPendiente ? 'scale(0.98)' : '',
                opacity: (opcionActiva !== null && !esActiva) ? 0.35 : 1,
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              className={`option-btn ${esActiva ? 'shadow-[0_0_0_3px_rgba(17,17,17,0.25)]' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Letra */}
                <span
                  className="font-mono text-xs tracking-widest shrink-0"
                  style={{
                    opacity: esActiva ? 0.7 : 0.5,
                    color: esActiva ? '#f4f1ea' : '',
                  }}
                >
                  {letra}
                </span>

                {/* Texto opción */}
                <span className="flex-1 text-left">{op}</span>

                {/* Indicador de selección */}
                {esActiva && (
                  <span
                    className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full"
                    style={{
                      backgroundColor: confirmada ? '#f4f1ea' : 'rgba(244,241,234,0.3)',
                      color: '#111111',
                      fontSize: '14px',
                      fontWeight: 700,
                      transition: 'all 300ms ease',
                    }}
                  >
                    {confirmada ? '✓' : '…'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </section>

      {/* Pie de página */}
      <footer className="pt-6 mt-6 border-t border-ink/10 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/50 text-center">
        {confirmada ? (
          <span className="flex items-center justify-center gap-2">
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#111111',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            Respuesta enviada · espera al docente
          </span>
        ) : pendiente !== null ? (
          'Registrando respuesta…'
        ) : bloqueado ? (
          'Tiempo agotado'
        ) : (
          'Pulsa la opción que consideres correcta'
        )}
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </main>
  );
}
