// ---------------------------------------------------------------------------
// LEADERBOARD — tabla de posiciones por puntaje de juego (velocidad + racha).
// Reutilizable: panel de proyector del docente y banner del estudiante.
// ---------------------------------------------------------------------------

const MEDALLAS = ['🥇', '🥈', '🥉'];

function ordenar(estudiantes = {}) {
  return Object.entries(estudiantes)
    .map(([id, est]) => ({ id, ...est }))
    .sort((a, b) => {
      const diff = (b.puntos_juego || 0) - (a.puntos_juego || 0);
      if (diff !== 0) return diff;
      return (b.nota_acumulada || 0) - (a.nota_acumulada || 0);
    });
}

// Flecha de cambio de posición respecto a la pregunta anterior.
function Delta({ est }) {
  const previo = est.puesto_previo;
  const actual = est.puesto;
  if (!previo || !actual) return <span className="w-8" />;
  const cambio = previo - actual; // positivo = subió
  if (cambio > 0) return <span className="text-kahootGreen font-black text-sm w-8 text-center">▲{cambio}</span>;
  if (cambio < 0) return <span className="text-kahootRed font-black text-sm w-8 text-center">▼{-cambio}</span>;
  return <span className="text-ink/30 font-black text-sm w-8 text-center">–</span>;
}

export default function Leaderboard({ estudiantes, top = 5, miId = null }) {
  const filas = ordenar(estudiantes).slice(0, top);

  if (filas.length === 0) {
    return <p className="text-center font-bold text-ink/40 py-10">Aún no hay puntajes.</p>;
  }

  return (
    <div className="space-y-2 w-full">
      {filas.map((est, i) => {
        const esYo = miId && est.id === miId;
        const podio = i < 3;
        return (
          <div
            key={est.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-sm animate-slide-up ${
              esYo
                ? 'bg-kahootBlue text-white ring-2 ring-kahootBlue'
                : podio
                  ? 'bg-white text-ink'
                  : 'bg-white/90 text-ink'
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-2xl w-9 text-center shrink-0">
              {podio ? MEDALLAS[i] : <span className="font-black text-ink/40 text-lg">{i + 1}</span>}
            </span>
            <span className="flex-1 font-black text-lg truncate">
              {est.nombre}
              {(est.racha || 0) >= 2 && (
                <span className="ml-2 text-sm font-bold">🔥{est.racha}</span>
              )}
            </span>
            <Delta est={est} />
            <span className="font-black text-xl tabular-nums shrink-0 w-20 text-right">
              {(est.puntos_juego || 0).toLocaleString('es-CO')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
