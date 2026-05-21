import { useEffect } from 'react';
import { evaluarEstudiante } from '../../utils/grading.js';

export default function FinalScore({ sesion, yo, pin }) {
  const { aciertos, total, nota } = evaluarEstudiante(yo, sesion.preguntas);
  const aprobado = nota >= 3.0;

  // Limpia el storage al ver la nota final
  useEffect(() => {
    return () => {
      // Mantenemos el storage hasta que el usuario cierre — útil si vuelve a entrar.
    };
  }, []);

  function salir() {
    localStorage.removeItem(`quiz_student_${pin}`);
    sessionStorage.removeItem('last_pin');
    sessionStorage.removeItem('last_student_id');
    window.location.href = '/';
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
        {yo.nombre} · {yo.grado}
      </p>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/40 mt-1">
        Resultado final
      </p>

      <div className="my-12">
        <div
          className={`font-display font-light leading-[0.85] tracking-tight ${
            aprobado ? 'text-affirm' : 'text-deny'
          }`}
          style={{ fontSize: 'clamp(8rem, 30vw, 18rem)' }}
        >
          {nota.toFixed(1)}
        </div>
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-ink/50 mt-2">
          de 5.0
        </p>
      </div>

      <p className="font-display text-2xl md:text-3xl">
        {aciertos} de {total} aciertos
      </p>
      <p className="text-ink/60 mt-2">
        {aprobado ? 'Has aprobado la evaluación.' : 'No alcanzaste la nota mínima (3.0).'}
      </p>

      <button onClick={salir} className="btn-ghost mt-16">
        Volver al inicio
      </button>
    </main>
  );
}
