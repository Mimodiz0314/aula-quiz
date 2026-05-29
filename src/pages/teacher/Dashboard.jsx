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
    if (!confirm('¿Quieres finalizar esta sesión de juego y guardar los resultados en tu historial?')) return;
    await cerrarSesion(pin);
    navigate('/docente');
  }

  function exportarExcel() {
    const totalEstudiantes = filas.length;
    const promedioFormateado = promedio.toFixed(1);
    const aprobadosFormateado = `${aprobados}/${totalEstudiantes}`;
    
    // Generar las filas de estudiantes para la tabla HTML
    const filasHTML = filas.map((f, i) => {
      const fallidas = total - f.aciertos;
      const porcentaje = total > 0 ? Math.round((f.aciertos / total) * 100) : 0;
      const notaFormateada = parseFloat(f.nota.toFixed(1));
      const colorNota = f.nota >= 3.0 ? '#26890c' : '#e21b3c';
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f3f0f7'; // Alternancia de color sutil estilo púrpura

      return `
        <tr style="background-color: ${bgColor};">
          <td style="padding: 10px; border: 1px solid #dddddd; text-align: center; font-weight: bold; color: #666666;">${i + 1}</td>
          <td style="padding: 10px; border: 1px solid #dddddd; text-align: left; font-weight: bold; color: #111111;">${f.nombre}</td>
          <td style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: 900; font-size: 12pt; color: ${colorNota};">${notaFormateada}</td>
          <td style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: bold; color: #555555;">${porcentaje}%</td>
          <td style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: bold; color: #26890c;">${f.aciertos}</td>
          <td style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: bold; color: #e21b3c;">${fallidas}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { font-weight: bold; }
        </style>
      </head>
      <body>
        <!-- Banner superior estilo Aula! -->
        <table style="margin-bottom: 20px;">
          <tr>
            <td colspan="6" style="background-color: #46178f; color: #ffffff; text-align: center; padding: 15px; font-size: 18pt; font-weight: bold; border-radius: 8px;">
              Aula! - Reporte de Resultados
            </td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 8px 0; font-size: 10pt; color: #666666; font-weight: bold;">
              PIN de Juego: <span style="color: #46178f; font-size: 12pt; font-weight: 900;">${pin}</span>
            </td>
            <td colspan="3" style="padding: 8px 0; font-size: 10pt; color: #666666; text-align: right; font-weight: bold;">
              Generado el: ${new Date().toLocaleString('es-CO')}
            </td>
          </tr>
        </table>

        <!-- Resumen de estadísticas clave -->
        <table style="margin-bottom: 25px; border: 1px solid #dddddd;">
          <tr style="background-color: #f3f0f7;">
            <th colspan="6" style="padding: 8px; text-align: left; font-size: 11pt; color: #46178f; border-bottom: 1px solid #dddddd;">
              Resumen General
            </th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dddddd; font-weight: bold; background-color: #fdfdfd;">Estudiantes:</td>
            <td style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: 900; color: #15aabf;">${totalEstudiantes}</td>
            <td style="padding: 10px; border: 1px solid #dddddd; font-weight: bold; background-color: #fdfdfd;">Preguntas:</td>
            <td style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: 900; color: #777777;">${total}</td>
            <td style="padding: 10px; border: 1px solid #dddddd; font-weight: bold; background-color: #fdfdfd;">Promedio General:</td>
            <td style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: 900; color: #d89614; font-size: 12pt;">${promedioFormateado}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px; border: 1px solid #dddddd; font-weight: bold; background-color: #fdfdfd;">Estudiantes Aprobados (Nota &gt;= 3.0):</td>
            <td colspan="3" style="padding: 10px; border: 1px solid #dddddd; text-align: right; font-weight: 900; color: #26890c; font-size: 12pt;">${aprobadosFormateado}</td>
          </tr>
        </table>

        <!-- Tabla principal de resultados -->
        <table>
          <thead>
            <tr style="background-color: #46178f; color: #ffffff;">
              <th style="padding: 12px 8px; border: 1px solid #46178f; text-align: center; font-weight: bold; width: 60px;">No.</th>
              <th style="padding: 12px 8px; border: 1px solid #46178f; text-align: left; font-weight: bold;">Nombre del Estudiante</th>
              <th style="padding: 12px 8px; border: 1px solid #46178f; text-align: right; font-weight: bold; width: 180px;">Calificación (1.0 - 5.0)</th>
              <th style="padding: 12px 8px; border: 1px solid #46178f; text-align: right; font-weight: bold; width: 180px;">% Porcentaje Adquirido</th>
              <th style="padding: 12px 8px; border: 1px solid #46178f; text-align: right; font-weight: bold; width: 120px;">Aciertos</th>
              <th style="padding: 12px 8px; border: 1px solid #46178f; text-align: right; font-weight: bold; width: 120px;">Fallidas</th>
            </tr>
          </thead>
          <tbody>
            ${filasHTML}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-${pin}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarCSV() {
    const head = 'No.,Nombre del Estudiante,Calificación (1.0 - 5.0),% Porcentaje Adquirido,Aciertos,Fallidas\n';
    const body = filas
      .map((f, i) => {
        const fallidas = total - f.aciertos;
        const porcentaje = total > 0 ? Math.round((f.aciertos / total) * 100) : 0;
        const notaFormateada = parseFloat(f.nota.toFixed(1));
        return `${i + 1},"${f.nombre}",${notaFormateada},"${porcentaje}%",${f.aciertos},${fallidas}`;
      })
      .join('\n');
    const blob = new Blob(['\uFEFF' + head + body], { type: 'text/csv;charset=utf-8' });
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
          <button onClick={() => navigate('/')} className="btn-ghost no-print">⌂ Inicio</button>
          <button
            onClick={handleCerrar}
            className="font-bold text-sm tracking-widest uppercase text-kahootBlue hover:text-kahootBlue/80 transition-colors no-print flex items-center gap-1.5"
          >
            💾 Guardar y ver Historial
          </button>
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
          <div className="overflow-x-auto rounded-xl border border-mist/40 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#46178f] text-white">
                  <th className="py-3 px-4 font-bold text-sm text-center rounded-tl-xl w-16">No.</th>
                  <th className="py-3 px-4 font-bold text-sm text-left">Nombre del Estudiante</th>
                  <th className="py-3 px-4 font-bold text-sm text-right">Calificación (1.0 - 5.0)</th>
                  <th className="py-3 px-4 font-bold text-sm text-right">% Porcentaje Adquirido</th>
                  <th className="py-3 px-4 font-bold text-sm text-right"># Aciertos</th>
                  <th className="py-3 px-4 font-bold text-sm text-right rounded-tr-xl"># Fallidas</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.id} className="border-b border-mist/30 hover:bg-gameBg transition-colors even:bg-mist/10">
                    <td className="py-4 px-4 font-bold text-ink/40 text-center">{i + 1}</td>
                    <td className="py-4 px-4 font-bold text-ink text-lg">
                      {f.nombre}
                      {f.grado && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-mist/50 text-ink/60 ml-2">
                          {f.grado}
                        </span>
                      )}
                    </td>
                    <td className={`py-4 px-4 font-black text-2xl text-right ${f.nota >= 3.0 ? 'text-kahootGreen' : 'text-kahootRed'}`}>
                      {parseFloat(f.nota.toFixed(1))}
                    </td>
                    <td className="py-4 px-4 font-black text-right text-ink/70">
                      {total > 0 ? Math.round((f.aciertos / total) * 100) : 0}%
                    </td>
                    <td className="py-4 px-4 font-bold text-right text-kahootGreen">
                      {f.aciertos}
                    </td>
                    <td className="py-4 px-4 font-bold text-right text-kahootRed">
                      {total - f.aciertos}
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

          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-3 no-print">
            <h4 className="font-black text-lg text-ink tracking-tight border-b border-mist pb-2">
              Exportar Reporte
            </h4>
            
            <button 
              onClick={() => window.print()} 
              className="btn-secondary w-full flex items-center justify-center gap-2 hover:bg-mist/5"
            >
              📄 Descargar PDF
            </button>
            
            <button 
              onClick={exportarExcel} 
              className="btn-secondary w-full flex items-center justify-center gap-2 text-kahootGreen border-kahootGreen/30 hover:bg-kahootGreen/5"
            >
              📊 Descargar Excel
            </button>
            
            <button 
              onClick={exportarCSV} 
              className="btn-secondary w-full flex items-center justify-center gap-2 text-ink/75 hover:bg-mist/5"
            >
              📝 Descargar CSV
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-3 no-print">
            <button
              onClick={handleCerrar}
              className="btn-primary bg-kahootGreen w-full flex items-center justify-center gap-2 text-white shadow-md hover:bg-kahootGreen/90 transition-all font-black"
            >
              💾 Guardar y volver a Mi Panel
            </button>
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
