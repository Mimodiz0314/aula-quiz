import { useEffect } from 'react';
import { esAcierto } from '../../utils/grading.js';

export default function Reveal({ sesion, yo }) {
  const idx = sesion.pregunta_idx;
  const pregunta = sesion.preguntas[idx];
  const miRespuesta = yo.respuestas_registradas?.[idx];
  const acerto = miRespuesta !== undefined && esAcierto(pregunta, miRespuesta);
  const sinRespuesta = miRespuesta === undefined;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (acerto) {
        navigator.vibrate([100, 50, 100]);
      } else if (!sinRespuesta) {
        navigator.vibrate([300]);
      }
    }
  }, [acerto, sinRespuesta]);

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 ${
        sinRespuesta ? 'bg-gameBg text-ink' : acerto ? 'bg-kahootGreen text-white' : 'bg-kahootRed text-white'
      }`}
    >
      <header className="absolute top-4 left-4">
        <button 
          onClick={() => window.location.href = '/'}
          className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors ${
            sinRespuesta ? 'bg-white text-ink hover:bg-mist' : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          ⌂ Inicio
        </button>
      </header>

      <div className="animate-bounce-in flex flex-col items-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${
          sinRespuesta ? 'bg-mist text-ink/50' : 'bg-white/20 text-white'
        }`}>
          {sinRespuesta ? (
            <span className="text-4xl font-black">?</span>
          ) : acerto ? (
            <span className="text-6xl font-black">✓</span>
          ) : (
            <span className="text-6xl font-black">✕</span>
          )}
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-2">
          {sinRespuesta ? '¡Tiempo agotado!' : acerto ? '¡Correcto!' : '¡Incorrecto!'}
        </h1>
        
        <p className={`font-bold text-lg md:text-xl uppercase tracking-widest ${
          sinRespuesta ? 'text-ink/50' : 'text-white/80'
        }`}>
          {sinRespuesta ? 'No respondiste' : acerto ? 'Sigue así' : 'A la próxima'}
        </p>

        <div className={`mt-12 w-full max-w-sm p-6 rounded-2xl shadow-md ${
          sinRespuesta ? 'bg-white' : 'bg-black/20'
        }`}>
          <p className={`font-bold text-sm uppercase tracking-wider mb-2 ${
            sinRespuesta ? 'text-ink/50' : 'text-white/60'
          }`}>
            Respuesta correcta
          </p>
          <p className="text-2xl md:text-3xl font-black">
            {pregunta.opciones[pregunta.correcta]}
          </p>
        </div>
      </div>
    </main>
  );
}
