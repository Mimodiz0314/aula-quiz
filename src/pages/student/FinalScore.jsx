import { useEffect, useState } from 'react';

export default function FinalScore({ sesion, yo }) {
  const [puesto, setPuesto] = useState(null);
  
  useEffect(() => {
    if (!sesion || !sesion.estudiantes) return;
    const todos = Object.values(sesion.estudiantes);
    // Ordena por puntaje de juego (igual que el leaderboard en vivo),
    // con la nota como desempate.
    todos.sort((a, b) => {
      const diff = (b.puntos_juego || 0) - (a.puntos_juego || 0);
      if (diff !== 0) return diff;
      return (b.nota_acumulada || 0) - (a.nota_acumulada || 0);
    });
    const pos = todos.findIndex(e => e.nombre === yo.nombre);
    if (pos !== -1) setPuesto(pos + 1);
  }, [sesion, yo]);

  const esPodio = puesto && puesto <= 3;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#46178f] text-white">
      <header className="absolute top-4 left-4">
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-white/20 text-white hover:bg-white/30 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors"
        >
          ⌂ Inicio
        </button>
      </header>

      <div className="animate-slide-up w-full max-w-sm">
        <h1 className="text-4xl md:text-5xl font-black mb-2">Resultados</h1>
        <p className="text-white/70 font-bold mb-10">Juego terminado</p>

        <div className="game-card text-ink mb-6 relative overflow-hidden">
          {esPodio && (
            <div className="absolute -top-4 -right-4 text-8xl opacity-10">🏆</div>
          )}
          
          <p className="font-bold text-ink/50 uppercase tracking-widest text-sm mb-2">Tu puesto</p>
          <div className="text-7xl font-black tabular-nums mb-2">
            #{puesto || '-'}
          </div>
          {yo.puntos_juego !== undefined && yo.puntos_juego !== null && (
            <p className="font-black text-brandPrimary text-lg mb-6">
              {(yo.puntos_juego || 0).toLocaleString('es-CO')} pts
              {(yo.racha || 0) >= 2 && <span className="ml-2">🔥{yo.racha}</span>}
            </p>
          )}

          <div className="flex justify-between items-center border-t border-mist pt-4">
            <div>
              <p className="font-bold text-ink/50 text-xs uppercase tracking-wider">Nota</p>
              <p className="text-2xl font-black">{yo.nota_acumulada?.toFixed(1) || '0.0'}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-ink/50 text-xs uppercase tracking-wider">Estudiante</p>
              <p className="font-bold">{yo.nombre}</p>
            </div>
          </div>
        </div>

        <button onClick={() => window.location.href = '/'} className="btn-secondary w-full">
          Jugar de nuevo
        </button>
      </div>
    </main>
  );
}
