import { useEffect } from 'react';
import { esAcierto } from '../../utils/grading.js';

export default function Reveal({ sesion, yo }) {
  const idx = sesion.pregunta_idx;
  const pregunta = sesion.preguntas[idx];
  const miRespuesta = yo.respuestas_registradas?.[idx];
  const acerto = miRespuesta !== undefined && esAcierto(pregunta, miRespuesta);
  const sinRespuesta = miRespuesta === undefined;

  useEffect(() => {
    // Retroalimentación háptica
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (acerto) {
        navigator.vibrate([100, 50, 100]); // Vibración feliz (corta doble)
      } else if (!sinRespuesta) {
        navigator.vibrate([300]); // Vibración larga (error)
      }
    }
  }, [acerto, sinRespuesta]);

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-150 ${
        sinRespuesta ? 'bg-bone' : acerto ? 'reveal-affirm' : 'reveal-deny'
      }`}
    >
      <p
        className={`font-mono text-[11px] tracking-[0.25em] uppercase ${
          sinRespuesta ? 'text-ink/60' : 'text-bone/70'
        }`}
      >
        {sinRespuesta
          ? 'No registraste respuesta'
          : acerto
          ? '✓ Acierto'
          : '✗ Incorrecta'}
      </p>

      <h1 className="font-display text-6xl md:text-8xl mt-4 leading-none tracking-tight">
        {sinRespuesta ? '—' : acerto ? '¡Correcta!' : 'Incorrecta'}
      </h1>

      <div
        className={`mt-12 max-w-md p-6 rounded-2xl ${
          sinRespuesta ? 'border border-ink/15' : 'bg-black/15'
        }`}
      >
        <p
          className={`font-mono text-[10px] tracking-[0.2em] uppercase ${
            sinRespuesta ? 'text-ink/60' : 'text-bone/70'
          }`}
        >
          Respuesta correcta
        </p>
        <p className="font-display text-2xl md:text-3xl mt-2">
          {pregunta.opciones[pregunta.correcta]}
        </p>
      </div>

      <p
        className={`mt-12 font-mono text-[10px] tracking-[0.2em] uppercase ${
          sinRespuesta ? 'text-ink/50' : 'text-bone/60'
        }`}
      >
        Esperando al docente…
      </p>
    </main>
  );
}
