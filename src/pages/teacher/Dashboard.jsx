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

  const podio = filas.slice(0, 3);
  const resto = filas.slice(3);

  return (
    <main className="min-h-screen p-6 md:p-12 flex flex-col bg-gameBg">
      <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost">⌂ Inicio</button>
          <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-mist/50 px-3 py-1 rounded-full">
            Resultados · PIN {pin}
          </div>
        </div>
        <div className="font-black text-xl italic tracking-tighter">
          Aula<span className="text-kahootYellow">!</span>
        </div>
      </header>

      {/* Podio visual (si hay suficientes estudiantes) */}
      {podio.length > 0 && (
        <section className="bg-[#46178f] rounded-3xl p-8 mb-8 text-white flex flex-col items-center justify-end min-h-[350px] relative overflow-hidden shadow-md">
          <h2 className="absolute top-8 left-8 font-black text-3xl opacity-50">Podio</h2>
          
          <div className="flex items-end justify-center gap-2 md:gap-6 mt-16 w-full max-w-3xl">
            {/* 2do Lugar */}
            {podio[1] && (
              <div className="flex flex-col items-center flex-1 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <p className="font-bold text-xl mb-2 text-center break-words w-full px-2">{podio[1].nombre}</p>
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold mb-4">{podio[1].nota.toFixed(1)}</div>
                <div className="bg-white/10 w-full h-32 rounded-t-lg border-t-4 border-slate-300 flex items-start justify-center pt-4 shadow-inner">
                  <span className="font-black text-4xl text-slate-300">2</span>
                </div>
              </div>
            )}
            
            {/* 1er Lugar */}
            <div className="flex flex-col items-center flex-1 animate-slide-up z-10">
              <div className="text-5xl mb-2 animate-bounce">👑</div>
              <p className="font-black text-2xl mb-2 text-center break-words w-full px-2">{podio[0].nombre}</p>
              <div className="bg-kahootYellow px-4 py-1 rounded-full text-ink font-black mb-4 shadow-md">{podio[0].nota.toFixed(1)}</div>
              <div className="bg-kahootYellow/20 w-full h-48 rounded-t-lg border-t-4 border-kahootYellow flex items-start justify-center pt-4 shadow-inner backdrop-blur-sm">
                <span className="font-black text-5xl text-kahootYellow">1</span>
              </div>
            </div>

            {/* 3er Lugar */}
            {podio[2] ? (
              <div className="flex flex-col items-center flex-1 animate-slide-up" style={{ animationDelay: '400ms' }}>
                <p className="font-bold text-xl mb-2 text-center break-words w-full px-2">{podio[2].nombre}</p>
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold mb-4">{podio[2].nota.toFixed(1)}</div>
                <div className="bg-white/5 w-full h-24 rounded-t-lg border-t-4 border-amber-600 flex items-start justify-center pt-4 shadow-inner">
                  <span className="font-black text-4xl text-amber-600">3</span>
                </div>
              </div>
            ) : (
              <div className="flex-1"></div>
            )}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 flex-1">
        {/* Resto de la tabla */}
        <section className="bg-white rounded-3xl p-8 shadow-sm">
          <h3 className="font-black text-xl mb-6">Todos los resultados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-mist">
                  <th className="py-3 font-bold text-ink/50 uppercase text-sm w-12">#</th>
                  <th className="py-3 font-bold text-ink/50 uppercase text-sm">Jugador</th>
                  <th className="py-3 font-bold text-ink/50 uppercase text-sm text-center">Aciertos</th>
                  <th className="py-3 font-bold text-ink/50 uppercase text-sm text-right">Nota</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.id} className="border-b border-mist/50 hover:bg-gameBg transition-colors">
                    <td className="py-4 font-bold text-ink/40">{i + 1}</td>
                    <td className="py-4 font-bold text-lg">
                      {f.nombre} <span className="text-sm font-normal text-ink/50 ml-2">{f.grado}</span>
                    </td>
                    <td className="py-4 font-bold text-center">{f.aciertos} / {total}</td>
                    <td className={`py-4 font-black text-2xl text-right ${f.nota >= 3.0 ? 'text-kahootGreen' : 'text-kahootRed'}`}>
                      {f.nota.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length === 0 && (
              <p className="text-center font-bold text-ink/40 py-10">No hay datos para mostrar.</p>
            )}
          </div>
        </section>

        {/* Resumen y controles */}
        <aside className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <Stat label="Estudiantes" value={filas.length} color="bg-kahootBlue" />
            <Stat label="Preguntas" value={total} color="bg-mist" textColor="text-ink" />
            <Stat label="Promedio" value={promedio.toFixed(1)} color="bg-kahootYellow" textColor="text-ink" />
            <Stat label="Aprobados" value={`${aprobados}/${filas.length}`} color="bg-kahootGreen" />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-3">
            <button onClick={exportarCSV} className="btn-secondary w-full">Descargar CSV</button>
            <button onClick={handleCerrar} className="btn-primary bg-kahootRed w-full">Cerrar Sesión</button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value, color, textColor = 'text-white' }) {
  return (
    <div className={`${color} ${textColor} p-4 rounded-2xl shadow-sm`}>
      <p className="font-bold text-sm uppercase opacity-80 mb-1">{label}</p>
      <p className="font-black text-4xl">{value}</p>
    </div>
  );
}
