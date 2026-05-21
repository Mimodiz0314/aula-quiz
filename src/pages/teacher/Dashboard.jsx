import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluarEstudiante, calcularNota } from '../../utils/grading.js';
import { cerrarSesion } from '../../services/sessionService.js';

export default function Dashboard({ pin, sesion }) {
  const navigate = useNavigate();
  const preguntas = sesion.preguntas || [];
  const total = preguntas.length;

  const filas = useMemo(() => {
    const ests = Object.entries(sesion.estudiantes || {}).map(([id, est]) => {
      const { aciertos, nota } = evaluarEstudiante(est, preguntas);
      return {
        id,
        nombre: est.nombre,
        grado: est.grado,
        aciertos,
        nota,
      };
    });
    return ests.sort((a, b) => b.nota - a.nota);
  }, [sesion.estudiantes, preguntas]);

  const promedio =
    filas.length > 0
      ? calcularNota(
          filas.reduce((acc, f) => acc + f.aciertos, 0) / filas.length,
          total
        )
      : 0;

  const aprobados = filas.filter((f) => f.nota >= 3.0).length;

  async function handleCerrar() {
    if (!confirm('¿Cerrar y borrar la sesión definitivamente?')) return;
    await cerrarSesion(pin);
    navigate('/');
  }

  function exportarCSV() {
    const head = 'Nombre,Grado,Aciertos,Total,Nota\n';
    const body = filas
      .map((f) => `"${f.nombre}","${f.grado}",${f.aciertos},${total},${f.nota.toFixed(1)}`)
      .join('\n');
    const blob = new Blob([head + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-${pin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen px-6 md:px-16 py-12">
      <header className="flex justify-between items-baseline mb-12">
        <div className="font-display text-xl">Aula<span className="text-ink/40">.</span></div>
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
          PIN {pin} · Resultados
        </div>
      </header>

      <h1 className="font-display text-5xl md:text-7xl leading-none tracking-tight">
        Resultados.
      </h1>

      {/* Métricas resumen */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-8 border-t border-ink/10">
        <Stat label="Estudiantes" value={filas.length} />
        <Stat label="Preguntas" value={total} />
        <Stat label="Promedio" value={promedio.toFixed(1)} />
        <Stat label="Aprobados (≥3.0)" value={`${aprobados}/${filas.length}`} />
      </section>

      {/* Tabla */}
      <section className="mt-16">
        <table className="w-full">
          <thead>
            <tr className="text-left font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60 border-b border-ink/15">
              <th className="py-3 w-10">#</th>
              <th className="py-3">Nombre</th>
              <th className="py-3">Grado</th>
              <th className="py-3 text-right">Aciertos</th>
              <th className="py-3 text-right">Nota</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr
                key={f.id}
                className="border-b border-ink/5 hover:bg-mist/30 transition-colors"
              >
                <td className="py-4 font-mono text-sm text-ink/40 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td className="py-4 font-display text-xl">{f.nombre}</td>
                <td className="py-4 text-ink/60">{f.grado}</td>
                <td className="py-4 text-right font-mono tabular-nums">
                  {f.aciertos}/{total}
                </td>
                <td
                  className={`py-4 text-right font-display text-3xl tabular-nums ${
                    f.nota >= 3.0 ? 'text-affirm' : 'text-deny'
                  }`}
                >
                  {f.nota.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length === 0 && (
          <p className="text-ink/40 italic py-12 text-center">Sin estudiantes registrados.</p>
        )}
      </section>

      <footer className="mt-16 pt-6 border-t border-ink/10 flex flex-wrap gap-3 justify-between">
        <div className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink/40">
          Escala 0.0 — 5.0 · Aprobación 3.0
        </div>
        <div className="flex gap-3">
          <button onClick={exportarCSV} className="btn-ghost">Exportar CSV</button>
          <button onClick={handleCerrar} className="btn-primary">Cerrar sesión</button>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
        {label}
      </div>
      <div className="font-display text-4xl md:text-5xl tabular-nums mt-1">{value}</div>
    </div>
  );
}
