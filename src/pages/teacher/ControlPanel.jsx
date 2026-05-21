import { useCallback, useMemo } from 'react';
import {
  ESTADOS,
  marcarTiempoAgotado,
  revelarRespuesta,
  siguientePregunta,
} from '../../services/sessionService.js';
import { useServerTimer } from '../../hooks/useServerTimer.js';

export default function ControlPanel({ pin, sesion }) {
  const preguntas = sesion.preguntas || [];
  const idx = sesion.pregunta_idx ?? 0;
  const total = preguntas.length;
  const pregunta = preguntas[idx];

  const estudiantes = useMemo(
    () => Object.entries(sesion.estudiantes || {}),
    [sesion.estudiantes]
  );

  // Contar respuestas registradas para la pregunta actual
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

  // El docente es la autoridad: si expira el tiempo, dispara la transición.
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
      <div className="min-h-screen flex items-center justify-center text-ink/60 font-display text-2xl">
        Pregunta no disponible.
      </div>
    );
  }

  const esActiva = sesion.estado_actual === ESTADOS.PREGUNTA_ACTIVA;
  const esAgotado = sesion.estado_actual === ESTADOS.TIEMPO_AGOTADO;
  const esRevelado = sesion.estado_actual === ESTADOS.RESPUESTA_REVELADA;

  return (
    <main className="min-h-screen px-6 md:px-16 py-10 grid grid-rows-[auto_1fr_auto] gap-8">
      {/* Encabezado */}
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-6">
          <div className="font-display text-xl">Aula<span className="text-ink/40">.</span></div>
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
            PIN {pin} · Pregunta {idx + 1} / {total}
          </div>
        </div>

        {/* Temporizador grande */}
        <div className="flex items-center gap-4">
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
            Tiempo
          </div>
          <div
            className={`font-display tabular-nums text-5xl md:text-6xl ${
              esActiva && restante <= 5 ? 'text-deny animate-pulse-soft' : ''
            }`}
          >
            {esActiva ? restante : '–'}
          </div>
        </div>
      </header>

      {/* Cuerpo */}
      <section className="grid lg:grid-cols-[2fr_1fr] gap-12">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
            Enunciado
          </p>
          <h2 className="font-display text-3xl md:text-5xl mt-3 leading-tight tracking-tight">
            {pregunta.pregunta}
          </h2>

          <ul className="mt-10 space-y-3">
            {pregunta.opciones.map((op, i) => {
              const letra = String.fromCharCode(65 + i);
              const correcta = i === pregunta.correcta;
              const conteo = conteoPorOpcion[i];
              const pct = respondieron > 0 ? Math.round((conteo / respondieron) * 100) : 0;
              return (
                <li
                  key={i}
                  className={`relative overflow-hidden rounded-xl border px-5 py-4 transition-colors ${
                    esRevelado && correcta
                      ? 'border-affirm bg-affirm/10'
                      : esRevelado
                      ? 'border-ink/15 bg-bone opacity-60'
                      : 'border-ink/15 bg-bone'
                  }`}
                >
                  {/* Barra de progreso de votos */}
                  <div
                    className="absolute inset-y-0 left-0 bg-ink/5 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs tracking-widest text-ink/50">
                        {letra}
                      </span>
                      <span className="font-display text-xl md:text-2xl">{op}</span>
                      {esRevelado && correcta && (
                        <span className="text-affirm font-mono text-[11px] tracking-[0.2em] uppercase">
                          ✓ correcta
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-sm text-ink/60 tabular-nums">
                      {conteo}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Conteo de respuestas */}
        <aside className="border-l border-ink/10 lg:pl-10">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
            Respuestas recibidas
          </p>
          <div className="font-display text-7xl md:text-8xl tabular-nums mt-2">
            {respondieron}
            <span className="text-ink/30 text-4xl md:text-5xl"> / {estudiantes.length}</span>
          </div>

          <div className="mt-8 space-y-2 max-h-[40vh] overflow-y-auto">
            {estudiantes.map(([id, est]) => {
              const respondio = est.respuestas_registradas?.[idx] !== undefined;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-mist/40"
                >
                  <span className="font-display text-base">{est.nombre}</span>
                  <span
                    className={`font-mono text-[10px] tracking-widest uppercase ${
                      respondio ? 'text-affirm' : 'text-ink/30'
                    }`}
                  >
                    {respondio ? '● enviada' : '○ esperando'}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      {/* Controles */}
      <footer className="pt-6 border-t border-ink/10 flex flex-wrap items-center justify-between gap-4">
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
          Estado: {sesion.estado_actual.replace(/_/g, ' ')}
        </div>
        <div className="flex gap-3">
          {esActiva && (
            <button onClick={() => marcarTiempoAgotado(pin)} className="btn-ghost">
              Detener tiempo
            </button>
          )}
          {(esActiva || esAgotado) && (
            <button onClick={() => revelarRespuesta(pin)} className="btn-primary">
              Mostrar respuesta →
            </button>
          )}
          {esRevelado && (
            <button onClick={() => siguientePregunta(pin)} className="btn-primary">
              {idx + 1 >= total ? 'Ver resultados →' : 'Siguiente pregunta →'}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
