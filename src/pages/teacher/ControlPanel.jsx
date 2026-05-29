import { useEffect, useMemo, useState } from 'react';
import {
  ESTADOS,
  marcarTiempoAgotado,
  revelarRespuesta,
  siguientePregunta,
  obtenerClaves,
} from '../../services/sessionService.js';
import { useServerTimer } from '../../hooks/useServerTimer.js';
import { useNavigate } from 'react-router-dom';
import { esAcierto } from '../../utils/grading.js';
import { fusionarClave, ordenarPorClave, parejasCorrectas, clasificacionCorrecta } from '../../utils/clave.js';
import { TIPOS } from '../../types/activityTypes.js';
import Leaderboard from '../../components/Leaderboard.jsx';
import { guardarSala } from '../../utils/savedRooms.js';
import { hablar, textoLeible } from '../student/Question.jsx';

const Triangle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L22 20H2L12 2Z" /></svg>;
const Diamond = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L22 12L12 22L2 12L12 2Z" /></svg>;
const Circle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><circle cx="12" cy="12" r="10" /></svg>;
const Square = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
const SHAPES = [Triangle, Diamond, Circle, Square];
const COLORS = ['bg-kahootRed', 'bg-kahootBlue', 'bg-kahootYellow', 'bg-kahootGreen'];

export default function ControlPanel({ pin, sesion }) {
  const navigate = useNavigate();
  const [mostrarTabla, setMostrarTabla] = useState(false);

  // Ir a Mi Panel sin perder la sesión: guarda la sala (queda en "Salas activas")
  // y navega al panel. La sesión sigue viva; se vuelve con "Abrir sala".
  function irAMiPanel() {
    try { guardarSala(sesion.docente_uid, { pin, tema: sesion.tema }); } catch { /* ignore */ }
    navigate('/docente');
  }
  // Las respuestas correctas viven en /claves (no en /sesiones). El docente las
  // lee una vez y las fusiona en memoria para mostrar/calcular stats de aciertos.
  const [claves, setClaves] = useState(null);
  useEffect(() => {
    let activo = true;
    obtenerClaves(pin)
      .then((c) => { if (activo) setClaves(c); })
      .catch((e) => console.warn('No se pudieron cargar las claves:', e));
    return () => { activo = false; };
  }, [pin]);

  const preguntas = sesion.preguntas || [];
  const idx = sesion.pregunta_idx ?? 0;
  const total = preguntas.length;
  // Actividad fusionada (pública + clave). Si claves aún no cargó, usamos la
  // pública para no romper el render (las stats de aciertos se actualizan al cargar).
  const actividad = fusionarClave(preguntas[idx], claves?.[idx]);

  const estudiantes = useMemo(
    () => Object.entries(sesion.estudiantes || {}),
    [sesion.estudiantes]
  );

  const respondieron = estudiantes.filter(
    ([, est]) => est.respuestas_registradas?.[idx] !== undefined
  ).length;

  const aciertos = useMemo(() => {
    return estudiantes.filter(([, est]) => {
      const r = est.respuestas_registradas?.[idx];
      return r !== undefined && esAcierto(actividad, r);
    }).length;
  }, [estudiantes, idx, actividad]);

  const restante = useServerTimer(
    sesion.pregunta_inicio_ts,
    sesion.pregunta_duracion,
    sesion.estado_actual === ESTADOS.PREGUNTA_ACTIVA
  );

  if (!actividad) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-2xl bg-gameBg">
        Cargando...
      </div>
    );
  }

  const esActiva = sesion.estado_actual === ESTADOS.PREGUNTA_ACTIVA;
  const esAgotado = sesion.estado_actual === ESTADOS.TIEMPO_AGOTADO;
  const esRevelado = sesion.estado_actual === ESTADOS.RESPUESTA_REVELADA;
  const esSinLimite = sesion.pregunta_duracion === 0;
  const tipo = actividad.tipo || 'seleccion_clasica';
  const tipoInfo = TIPOS[tipo];

  return (
    <main className="min-h-screen px-4 md:px-8 py-6 flex flex-col bg-gameBg">
      {/* Encabezado */}
      <header className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={irAMiPanel} className="btn-ghost">🏠 Mi Panel</button>
          <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-mist/50 px-3 py-1 rounded-full">
            PIN {pin}
          </div>
          <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-mist/50 px-3 py-1 rounded-full">
            {idx + 1} / {total}
          </div>
          {tipoInfo && (
            <div className={`font-bold text-xs px-3 py-1 rounded-full ${tipoInfo.colorBadge}`}>
              {tipoInfo.emoji} {tipoInfo.label}
            </div>
          )}
          <button
            onClick={() => hablar(textoLeible(actividad))}
            className="bg-mist/50 hover:bg-mist text-ink w-8 h-8 rounded-full font-bold text-sm transition-colors flex items-center justify-center"
            title="Leer en voz alta"
          >
            🔊
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-bold text-sm tracking-widest uppercase text-ink/50">Tiempo</div>
          <div className={`font-black tabular-nums text-4xl w-16 h-16 flex items-center justify-center bg-gameBg rounded-full ${
            esActiva && !esSinLimite && restante <= 5 ? 'text-kahootRed animate-pulse' : 'text-ink'
          }`}>
            {esActiva ? (esSinLimite ? '∞' : restante) : '0'}
          </div>
        </div>
      </header>

      {/* Cuerpo */}
      <section className="flex-1 grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="flex flex-col gap-6">
          {/* Vista de actividad según tipo */}
          {(tipo === 'seleccion_clasica' || tipo === 'detective_texto')
            ? <SeleccionView actividad={actividad} tipo={tipo} estudiantes={estudiantes} idx={idx} respondieron={respondieron} esRevelado={esRevelado} />
            : <GenericActivityView actividad={actividad} tipo={tipo} esRevelado={esRevelado} />
          }
        </div>

        {/* Panel lateral: respuestas */}
        <aside className="bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-mist bg-mist/10 text-center">
            <p className="font-bold text-sm tracking-widest uppercase text-ink/50 mb-2">Respuestas</p>
            <div className="font-black text-6xl tabular-nums">
              {respondieron}
              <span className="text-ink/30 text-3xl">/{estudiantes.length}</span>
            </div>
            {esRevelado && (
              <div className="mt-3 flex gap-2 justify-center text-sm font-bold">
                <span className="bg-kahootGreen/10 text-kahootGreen px-3 py-1 rounded-full">
                  ✓ {aciertos}
                </span>
                <span className="bg-kahootRed/10 text-kahootRed px-3 py-1 rounded-full">
                  ✕ {respondieron - aciertos}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {estudiantes.map(([id, est]) => {
              const respondio = est.respuestas_registradas?.[idx] !== undefined;
              const acertoCorrecto = esRevelado && respondio && esAcierto(actividad, est.respuestas_registradas[idx]);

              let rowBg = 'bg-gameBg';
              let dotClass = 'w-3 h-3 rounded-full shrink-0';
              if (respondio && !esRevelado) {
                rowBg = 'bg-kahootGreen/10';
                dotClass += ' bg-kahootGreen animate-pulse';
              } else if (respondio && esRevelado && acertoCorrecto) {
                rowBg = 'bg-kahootGreen/10';
                dotClass += ' bg-kahootGreen';
              } else if (respondio && esRevelado && !acertoCorrecto) {
                rowBg = 'bg-kahootRed/10';
                dotClass += ' bg-kahootRed';
              } else {
                dotClass += ' bg-mist';
              }

              return (
                <div
                  key={id}
                  className={`flex items-center justify-between text-sm py-2 px-3 rounded-xl font-bold ${rowBg}`}
                >
                  <span className="truncate">{est.nombre}</span>
                  <span className={dotClass} />
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      {/* Controles del docente */}
      <footer className="mt-6 bg-white p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-mist/50 px-3 py-1 rounded-full">
          {sesion.estado_actual.replace(/_/g, ' ')}
        </div>
        <div className="flex gap-4">
          {esActiva && (
            <button onClick={() => marcarTiempoAgotado(pin)} className="btn-secondary">
              Detener tiempo
            </button>
          )}
          {(esActiva || esAgotado) && (
            <button onClick={() => revelarRespuesta(pin)} className="btn-primary bg-kahootBlue">
              Mostrar respuesta
            </button>
          )}
          {esRevelado && (
            <button onClick={() => setMostrarTabla(true)} className="btn-secondary">
              🏆 Tabla de posiciones
            </button>
          )}
          {esRevelado && (
            <button onClick={() => siguientePregunta(pin)} className="btn-primary bg-kahootGreen">
              {idx + 1 >= total ? 'Ver podio final' : 'Siguiente actividad'}
            </button>
          )}
        </div>
      </footer>

      {/* Overlay de tabla de posiciones (modo proyector) */}
      {mostrarTabla && (
        <div
          className="fixed inset-0 bg-[#46178f] z-50 flex flex-col items-center justify-center p-6 md:p-12 animate-fade-in"
          onClick={() => setMostrarTabla(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Botón de volver, claro y arriba a la izquierda */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setMostrarTabla(false)}
                className="bg-white text-[#46178f] px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-white/90 transition-all shadow-md flex items-center gap-2"
              >
                ← Volver al panel
              </button>
              <h2 className="font-black text-3xl md:text-5xl text-white flex items-center gap-3">
                🏆 Posiciones
              </h2>
            </div>

            <Leaderboard estudiantes={sesion.estudiantes || {}} top={5} />

            {/* Avanzar el juego sin tener que cerrar primero la tabla */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => { setMostrarTabla(false); siguientePregunta(pin); }}
                className="btn-primary bg-kahootGreen px-10 shadow-md"
              >
                {idx + 1 >= total ? 'Ver podio final →' : 'Siguiente actividad →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Vista para seleccion_clasica y detective_texto: grilla de opciones con stats
// ---------------------------------------------------------------------------
function SeleccionView({ actividad, tipo, estudiantes, idx, respondieron, esRevelado }) {
  const conteoPorOpcion = useMemo(() => {
    const c = [0, 0, 0, 0];
    estudiantes.forEach(([, est]) => {
      const r = est.respuestas_registradas?.[idx];
      if (r !== undefined && Number.isInteger(Number(r))) {
        const n = Number(r);
        if (n >= 0 && n < 4) c[n] += 1;
      }
    });
    return c;
  }, [estudiantes, idx]);

  return (
    <>
      {tipo === 'detective_texto' && actividad.pasaje && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-kahootBlue">
          <p className="font-bold text-xs tracking-widest uppercase text-kahootBlue mb-2">🕵️ Pasaje</p>
          <p className="font-bold text-base text-ink leading-relaxed">{actividad.pasaje}</p>
        </div>
      )}
      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm text-center flex items-center justify-center min-h-[160px]">
        <h2 className="font-black text-3xl md:text-4xl leading-tight">
          {actividad.pregunta}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {actividad.opciones.map((op, i) => {
          const Shape = SHAPES[i % 4];
          const colorClass = COLORS[i % 4];
          const correcta = i === actividad.correcta;
          const conteo = conteoPorOpcion[i];
          const pct = respondieron > 0 ? Math.round((conteo / respondieron) * 100) : 0;
          const isFaded = esRevelado && !correcta;
          return (
            <div key={i} className={`relative overflow-hidden rounded-2xl flex flex-col justify-between p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.15)] transition-all ${colorClass} text-white ${
              isFaded ? 'opacity-40 grayscale-[30%]' : ''
            }`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="drop-shadow-md shrink-0"><Shape /></div>
                <span className="font-bold text-xl md:text-2xl leading-tight">{op}</span>
              </div>
              <div className="flex items-end justify-between relative z-10">
                {esRevelado && correcta
                  ? <span className="bg-white/20 px-3 py-1 rounded-full font-black text-sm uppercase tracking-wider">✓ Correcta</span>
                  : <span />
                }
                <span className="font-black text-3xl drop-shadow-md">{esRevelado ? conteo : '?'}</span>
              </div>
              {esRevelado && (
                <div
                  className="absolute bottom-0 left-0 bg-white/20 h-full transition-all duration-1000 z-0"
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista genérica para los 8 tipos restantes: muestra el contenido + stats
// ---------------------------------------------------------------------------
function GenericActivityView({ actividad, tipo, esRevelado }) {
  const tipoInfo = TIPOS[tipo];

  return (
    <>
      {/* Contenido de la actividad */}
      <div className="bg-white rounded-3xl p-8 shadow-sm flex-1">
        {tipoInfo && (
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 ${tipoInfo.colorBadge}`}>
            {tipoInfo.emoji} {tipoInfo.label}
          </div>
        )}
        <ActivityPreview actividad={actividad} tipo={tipo} esRevelado={esRevelado} />
      </div>
    </>
  );
}

// Resumen visual de la actividad para el docente
function ActivityPreview({ actividad, tipo, esRevelado }) {
  if (tipo === 'verdad_mito' || tipo === 'real_inventado') {
    return (
      <>
        <h2 className="font-black text-2xl md:text-3xl mb-4">{actividad.enunciado}</h2>
        {esRevelado && (
          <div className="bg-kahootGreen/10 text-kahootGreen rounded-2xl p-4 font-black text-xl capitalize">
            ✓ {actividad.correcto}
            {actividad.explicacion && (
              <p className="text-sm font-bold text-ink/70 mt-2">{actividad.explicacion}</p>
            )}
          </div>
        )}
      </>
    );
  }

  if (tipo === 'caza_intruso') {
    return (
      <>
        <h2 className="font-black text-xl mb-4">{actividad.instruccion}</h2>
        <div className="flex flex-wrap gap-2">
          {actividad.elementos.map((el, i) => (
            <span key={i} className={`px-4 py-2 rounded-xl font-bold text-sm ${
              esRevelado && i === actividad.intruso_idx
                ? 'bg-kahootRed text-white'
                : 'bg-gameBg text-ink'
            }`}>
              {el}
              {esRevelado && i === actividad.intruso_idx && ' ← intruso'}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (tipo === 'rompecabezas_ideas' || tipo === 'paso_a_paso') {
    const items = ordenarPorClave(
      tipo === 'rompecabezas_ideas' ? actividad.fragmentos : actividad.pasos,
      actividad.orden
    );
    return (
      <>
        <h2 className="font-black text-xl mb-4">{actividad.instruccion}</h2>
        {esRevelado ? (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-kahootGreen/10 rounded-xl p-3">
                <span className="w-8 h-8 bg-kahootGreen text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                  {i + 1}
                </span>
                <span className="font-bold">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="bg-gameBg rounded-xl p-3 font-bold text-ink/70">{item}</div>
            ))}
          </div>
        )}
      </>
    );
  }

  if (tipo === 'parejas_logicas') {
    const filas = parejasCorrectas(actividad);
    return (
      <>
        <h2 className="font-black text-xl mb-4">{actividad.instruccion}</h2>
        <div className="space-y-2">
          {filas.map((par, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <div className="bg-gameBg rounded-xl p-3 font-bold text-sm">{par.izquierda}</div>
              <div className={`rounded-xl p-3 font-bold text-sm ${esRevelado ? 'bg-kahootGreen/10 text-kahootGreen' : 'bg-gameBg'}`}>
                {par.derecha}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (tipo === 'clasificador') {
    const grupos = clasificacionCorrecta(actividad);
    return (
      <>
        <h2 className="font-black text-xl mb-4">{actividad.instruccion}</h2>
        <div className="grid grid-cols-2 gap-4">
          {actividad.categorias.map((cat, ci) => (
            <div key={ci} className={`p-4 rounded-2xl ${esRevelado ? 'bg-kahootGreen/10' : 'bg-gameBg'}`}>
              <p className="font-black text-sm mb-2">{cat.nombre}</p>
              {(grupos[ci] || []).map((item, ii) => (
                <p key={ii} className="text-sm font-bold text-ink/70 mb-1">{item}</p>
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (tipo === 'palabras_perdidas') {
    const partes = actividad.oracion.split('[___]');
    return (
      <>
        <p className="font-black text-xl leading-relaxed mb-4">
          {partes.map((parte, i) => (
            <span key={i}>
              {parte}
              {i < actividad.respuestas.length && (
                <span className={`mx-1 px-2 py-0.5 rounded-lg font-black ${
                  esRevelado
                    ? 'bg-kahootGreen text-white'
                    : 'bg-ink/10 text-ink/50'
                }`}>
                  {esRevelado ? actividad.respuestas[i] : '___'}
                </span>
              )}
            </span>
          ))}
        </p>
        <div className="flex flex-wrap gap-2">
          {actividad.banco.map((w, i) => (
            <span key={i} className={`px-3 py-1 rounded-lg text-sm font-bold ${
              esRevelado && actividad.respuestas.includes(w)
                ? 'bg-kahootGreen/10 text-kahootGreen'
                : 'bg-gameBg text-ink/70'
            }`}>{w}</span>
          ))}
        </div>
      </>
    );
  }

  // Fallback
  return <p className="font-bold text-ink/50">{actividad.pregunta || actividad.enunciado || actividad.instruccion}</p>;
}
