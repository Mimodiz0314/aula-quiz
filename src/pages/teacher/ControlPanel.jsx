import { useCallback, useMemo } from 'react';
import {
  ESTADOS,
  marcarTiempoAgotado,
  revelarRespuesta,
  siguientePregunta,
} from '../../services/sessionService.js';
import { useServerTimer } from '../../hooks/useServerTimer.js';
import { useNavigate } from 'react-router-dom';

const Triangle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L22 20H2L12 2Z" /></svg>;
const Diamond = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L22 12L12 22L2 12L12 2Z" /></svg>;
const Circle = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><circle cx="12" cy="12" r="10" /></svg>;
const Square = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;

const SHAPES = [Triangle, Diamond, Circle, Square];
const COLORS = ['bg-kahootRed', 'bg-kahootBlue', 'bg-kahootYellow', 'bg-kahootGreen'];

export default function ControlPanel({ pin, sesion }) {
  const navigate = useNavigate();
  const preguntas = sesion.preguntas || [];
  const idx = sesion.pregunta_idx ?? 0;
  const total = preguntas.length;
  const pregunta = preguntas[idx];

  const estudiantes = useMemo(
    () => Object.entries(sesion.estudiantes || {}),
    [sesion.estudiantes]
  );

  const respondieron = estudiantes.filter(
    ([_, est]) => est.respuestas_registradas?.[idx] !== undefined
  ).length;

  const conteoPorOpcion = useMemo(() => {
    const c = [0, 0, 0, 0];
    estudiantes.forEach(([_, est]) => {
      const r = est.respuestas_registradas?.[idx];
      if (r !== undefined && r >= 0 && r < 4) c[r] += 1;
    });
    return c;
  }, [estudiantes, idx]);

  const onExpire = useCallback(() => {
    if (sesion.estado_actual === ESTADOS.PREGUNTA_ACTIVA) {
      marcarTiempoAgotado(pin);
    }
  }, [sesion.estado_actual, pin]);

  const restante = useServerTimer(
    sesion.pregunta_inicio_ts,
    sesion.pregunta_duracion,
    sesion.estado_actual === ESTADOS.PREGUNTA_ACTIVA,
    onExpire
  );

  if (!pregunta) {
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

  return (
    <main className="min-h-screen px-4 md:px-8 py-6 flex flex-col bg-gameBg">
      {/* Encabezado */}
      <header className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="btn-ghost"
          >
            ⌂ Inicio
          </button>
          <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-mist/50 px-3 py-1 rounded-full">
            PIN {pin}
          </div>
          <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-mist/50 px-3 py-1 rounded-full">
            Pregunta {idx + 1} de {total}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-bold text-sm tracking-widest uppercase text-ink/50">
            Tiempo
          </div>
          <div
            className={`font-black tabular-nums text-4xl w-16 h-16 flex items-center justify-center bg-gameBg rounded-full ${
              esActiva && !esSinLimite && restante <= 5 ? 'text-kahootRed animate-pulse' : 'text-ink'
            }`}
          >
            {esActiva ? (esSinLimite ? '∞' : restante) : '0'}
          </div>
        </div>
      </header>

      {/* Cuerpo */}
      <section className="flex-1 grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="flex flex-col gap-6">
          {/* Enunciado */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm text-center flex items-center justify-center min-h-[200px]">
            <h2 className="font-black text-3xl md:text-5xl leading-tight">
              {pregunta.pregunta}
            </h2>
          </div>

          {/* Opciones 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {pregunta.opciones.map((op, i) => {
              const Shape = SHAPES[i % 4];
              const colorClass = COLORS[i % 4];
              const correcta = i === pregunta.correcta;
              const conteo = conteoPorOpcion[i];
              const pct = respondieron > 0 ? Math.round((conteo / respondieron) * 100) : 0;
              
              const isFaded = esRevelado && !correcta;

              return (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-2xl flex flex-col justify-between p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.15)] transition-all ${colorClass} text-white ${
                    isFaded ? 'opacity-40 grayscale-[30%]' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="drop-shadow-md shrink-0"><Shape /></div>
                    <span className="font-bold text-xl md:text-2xl leading-tight">{op}</span>
                  </div>
                  
                  {/* Estadísticas de la opción */}
                  <div className="flex items-end justify-between relative z-10">
                    {esRevelado && correcta ? (
                      <span className="bg-white/20 px-3 py-1 rounded-full font-black text-sm uppercase tracking-wider">
                        ✓ Correcta
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="font-black text-3xl drop-shadow-md">
                      {conteo}
                    </span>
                  </div>

                  {/* Barra de progreso de votos al fondo */}
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
        </div>

        {/* Panel lateral derecho: Respuestas */}
        <aside className="bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-mist bg-mist/10 text-center">
            <p className="font-bold text-sm tracking-widest uppercase text-ink/50 mb-2">
              Respuestas
            </p>
            <div className="font-black text-6xl tabular-nums">
              {respondieron}
              <span className="text-ink/30 text-3xl">/{estudiantes.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {estudiantes.map(([id, est]) => {
              const respondio = est.respuestas_registradas?.[idx] !== undefined;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between text-sm py-2 px-3 rounded-xl bg-gameBg font-bold"
                >
                  <span>{est.nombre}</span>
                  {respondio ? (
                    <span className="w-3 h-3 bg-kahootGreen rounded-full shadow-sm" title="Enviada"></span>
                  ) : (
                    <span className="w-3 h-3 bg-mist rounded-full" title="Esperando"></span>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      {/* Controles del Docente */}
      <footer className="mt-6 bg-white p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="font-bold text-sm tracking-widest uppercase text-ink/50 bg-mist/50 px-3 py-1 rounded-full">
          Estado: {sesion.estado_actual.replace(/_/g, ' ')}
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
            <button onClick={() => siguientePregunta(pin)} className="btn-primary bg-kahootGreen">
              {idx + 1 >= total ? 'Ver podio final' : 'Siguiente pregunta'}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
