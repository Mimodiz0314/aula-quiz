import { useCallback, useState } from 'react';
import { registrarRespuesta } from '../../services/sessionService.js';
import { useServerTimer } from '../../hooks/useServerTimer.js';

// Iconos geométricos básicos usando SVG
const Triangle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2L22 20H2L12 2Z" /></svg>;
const Diamond = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2L22 12L12 22L2 12L12 2Z" /></svg>;
const Circle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><circle cx="12" cy="12" r="10" /></svg>;
const Square = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;

const SHAPES = [Triangle, Diamond, Circle, Square];
const COLORS = ['option-red', 'option-blue', 'option-yellow', 'option-green'];

export default function Question({ pin, studentId, sesion, yo, bloqueado }) {
  const idx = sesion.pregunta_idx;
  const pregunta = sesion.preguntas[idx];
  const yaRespondio = yo.respuestas_registradas?.[idx];
  const elegida = yaRespondio !== undefined ? yaRespondio : null;
  const total = sesion.preguntas.length;
  const esSinLimite = sesion.pregunta_duracion === 0;

  const [pendiente, setPendiente] = useState(null);

  const restante = useServerTimer(
    sesion.pregunta_inicio_ts,
    sesion.pregunta_duracion,
    !bloqueado
  );

  const onElegir = useCallback(
    async (opcionIdx) => {
      if (bloqueado || elegida !== null || pendiente !== null) return;
      setPendiente(opcionIdx);
      await registrarRespuesta(pin, studentId, idx, opcionIdx);
    },
    [bloqueado, elegida, pendiente, pin, studentId, idx]
  );

  const opcionActiva = elegida !== null ? elegida : pendiente;
  const confirmada = elegida !== null;

  return (
    <main className="min-h-screen flex flex-col p-4 md:p-8 bg-gameBg">
      <header className="flex items-center justify-between mb-4">
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-white/80 backdrop-blur text-ink px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-white transition-colors"
        >
          ⌂ Inicio
        </button>
        <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-black/5 px-4 py-2 rounded-full">
          {idx + 1} de {total}
        </div>
        <div
          className={`font-black tabular-nums text-3xl md:text-4xl bg-white w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full shadow-md ${
            !bloqueado && !esSinLimite && restante <= 5 ? 'text-kahootRed animate-pulse' : 'text-ink'
          }`}
        >
          {bloqueado ? '0' : (esSinLimite ? '∞' : restante)}
        </div>
      </header>

      <section className="mb-6 flex-1 flex items-center justify-center">
        <div className="bg-white w-full py-8 md:py-16 px-6 md:px-12 rounded-2xl shadow-sm text-center">
          <h2 className="font-black text-2xl md:text-4xl leading-tight">
            {pregunta.pregunta}
          </h2>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-4">
        {pregunta.opciones.map((op, i) => {
          const Shape = SHAPES[i % 4];
          const colorClass = COLORS[i % 4];
          const esActiva = opcionActiva === i;
          const otraSeleccionada = opcionActiva !== null && !esActiva;

          return (
            <button
              key={i}
              onClick={() => onElegir(i)}
              disabled={bloqueado || otraSeleccionada}
              className={`btn-3d ${colorClass} flex flex-col items-center justify-center min-h-[140px] p-4 ${
                otraSeleccionada ? 'opacity-30 grayscale-[50%]' : ''
              }`}
            >
              <div className="flex items-center w-full gap-4">
                <div className="shrink-0 drop-shadow-md">
                  <Shape />
                </div>
                <span className="flex-1 text-left text-xl md:text-2xl font-bold leading-tight break-words">
                  {op}
                </span>
                {esActiva && (
                  <div className="shrink-0 bg-white/20 rounded-full p-2">
                    {confirmada ? '✓' : '...'}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </section>

      {opcionActiva !== null && (
        <footer className="text-center font-bold text-ink/60 pb-4 animate-fade-in">
          {confirmada ? '¡Respuesta enviada!' : 'Registrando...'}
        </footer>
      )}
    </main>
  );
}
