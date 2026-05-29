import { useEffect } from 'react';
import { esAcierto } from '../../utils/grading.js';
import { fusionarClave } from '../../utils/clave.js';

function parseJSON(val) {
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return null; } }
  return val;
}

export default function Reveal({ sesion, yo }) {
  const idx = sesion.pregunta_idx;
  // La respuesta correcta no está en sesion.preguntas (la ocultamos por seguridad).
  // Al revelar, el docente publica sesion.revelacion = { idx, clave } SOLO de la
  // pregunta actual. Reconstruimos la actividad completa fusionando ambas.
  // Retrocompat: sesiones viejas no traen revelacion pero sí la respuesta dentro
  // de preguntas[idx]; fusionarClave(null) devuelve la pública intacta.
  const claveActual = sesion.revelacion?.idx === idx ? sesion.revelacion.clave : null;
  const actividad = fusionarClave(sesion.preguntas[idx], claveActual);
  const miRespuesta = yo.respuestas_registradas?.[idx];
  const acerto = miRespuesta !== undefined && esAcierto(actividad, miRespuesta);
  const sinRespuesta = miRespuesta === undefined;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (acerto) navigator.vibrate([100, 50, 100]);
      else if (!sinRespuesta) navigator.vibrate([300]);
    }
  }, [acerto, sinRespuesta]);

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 ${
      sinRespuesta ? 'bg-gameBg text-ink' : acerto ? 'bg-kahootGreen text-white' : 'bg-kahootRed text-white'
    }`}>
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

      <div className="animate-bounce-in flex flex-col items-center w-full max-w-md">
        {/* Ícono y veredicto */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${
          sinRespuesta ? 'bg-mist text-ink/50' : 'bg-white/20 text-white'
        }`}>
          {sinRespuesta
            ? <span className="text-4xl font-black">?</span>
            : acerto
              ? <span className="text-6xl font-black">✓</span>
              : <span className="text-6xl font-black">✕</span>
          }
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-2">
          {sinRespuesta ? '¡Tiempo!' : acerto ? '¡Correcto!' : '¡Incorrecto!'}
        </h1>

        <p className={`font-bold text-lg uppercase tracking-widest mb-8 ${
          sinRespuesta ? 'text-ink/50' : 'text-white/80'
        }`}>
          {sinRespuesta ? 'No respondiste' : acerto ? 'Sigue así' : 'A la próxima'}
        </p>

        {/* Respuesta correcta (varía por tipo) */}
        <CorrectaDisplay actividad={actividad} sinRespuesta={sinRespuesta} />

        {/* Puesto y puntaje de juego (si la sesión los usa) */}
        <PuntajeBanner yo={yo} sinRespuesta={sinRespuesta} />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Banner con el puesto en la tabla, los puntos y la racha del estudiante.
// ---------------------------------------------------------------------------
function PuntajeBanner({ yo, sinRespuesta }) {
  if (yo?.puntos_juego === undefined || yo?.puntos_juego === null) return null;

  const puesto = yo.puesto;
  const delta = (yo.puesto_previo && puesto) ? yo.puesto_previo - puesto : 0;
  const racha = yo.racha || 0;

  const caja = `mt-6 w-full rounded-2xl p-4 flex items-center justify-between ${
    sinRespuesta ? 'bg-white text-ink' : 'bg-black/20 text-white'
  }`;

  return (
    <div className={caja}>
      <div className="text-left">
        <p className={`text-xs font-bold uppercase tracking-wider ${sinRespuesta ? 'text-ink/50' : 'text-white/60'}`}>
          Tu puesto
        </p>
        <p className="text-3xl font-black tabular-nums flex items-center gap-2">
          #{puesto || '-'}
          {delta > 0 && <span className="text-kahootGreen text-base">▲{delta}</span>}
          {delta < 0 && <span className="text-kahootRed text-base">▼{-delta}</span>}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-bold uppercase tracking-wider ${sinRespuesta ? 'text-ink/50' : 'text-white/60'}`}>
          Puntos {racha >= 2 && <span className="ml-1">🔥{racha}</span>}
        </p>
        <p className="text-3xl font-black tabular-nums">
          {(yo.puntos_juego || 0).toLocaleString('es-CO')}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Muestra la respuesta correcta de forma apropiada según el tipo
// ---------------------------------------------------------------------------
function CorrectaDisplay({ actividad, sinRespuesta }) {
  const base = `w-full p-5 rounded-2xl shadow-md text-left ${
    sinRespuesta ? 'bg-white text-ink' : 'bg-black/20 text-white'
  }`;
  const titleCls = `font-bold text-xs uppercase tracking-wider mb-3 ${
    sinRespuesta ? 'text-ink/50' : 'text-white/60'
  }`;

  if (!actividad) return null;
  const tipo = actividad.tipo || 'seleccion_clasica';

  // seleccion_clasica / detective_texto
  if (tipo === 'seleccion_clasica' || tipo === 'detective_texto') {
    return (
      <div className={base}>
        <p className={titleCls}>Respuesta correcta</p>
        <p className="text-2xl font-black">{actividad.opciones?.[actividad.correcta]}</p>
      </div>
    );
  }

  // verdad_mito
  if (tipo === 'verdad_mito') {
    return (
      <div className={base}>
        <p className={titleCls}>Era…</p>
        <p className="text-3xl font-black mb-2 capitalize">{actividad.correcto}</p>
        {actividad.explicacion && (
          <p className={`text-sm font-bold ${sinRespuesta ? 'text-ink/70' : 'text-white/80'}`}>
            {actividad.explicacion}
          </p>
        )}
      </div>
    );
  }

  // real_inventado
  if (tipo === 'real_inventado') {
    return (
      <div className={base}>
        <p className={titleCls}>Era…</p>
        <p className="text-3xl font-black mb-2 capitalize">{actividad.correcto}</p>
        {actividad.explicacion && (
          <p className={`text-sm font-bold ${sinRespuesta ? 'text-ink/70' : 'text-white/80'}`}>
            {actividad.explicacion}
          </p>
        )}
      </div>
    );
  }

  // caza_intruso
  if (tipo === 'caza_intruso') {
    return (
      <div className={base}>
        <p className={titleCls}>El intruso era</p>
        <p className="text-2xl font-black">{actividad.elementos?.[actividad.intruso_idx]}</p>
      </div>
    );
  }

  // rompecabezas_ideas / paso_a_paso
  if (tipo === 'rompecabezas_ideas' || tipo === 'paso_a_paso') {
    const items = tipo === 'rompecabezas_ideas' ? actividad.fragmentos : actividad.pasos;
    return (
      <div className={base}>
        <p className={titleCls}>Orden correcto</p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl p-2 ${sinRespuesta ? 'bg-ink/5' : 'bg-white/10'}`}>
              <span className={`w-7 h-7 rounded-full font-black text-sm flex items-center justify-center shrink-0 ${
                sinRespuesta ? 'bg-ink/20 text-ink' : 'bg-white/20 text-white'
              }`}>{i + 1}</span>
              <span className="font-bold text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // parejas_logicas
  if (tipo === 'parejas_logicas') {
    return (
      <div className={base}>
        <p className={titleCls}>Parejas correctas</p>
        <div className="space-y-1.5">
          {actividad.pares.map((par, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg p-2 text-sm ${sinRespuesta ? 'bg-ink/5' : 'bg-white/10'}`}>
              <span className="font-bold flex-1">{par.izquierda}</span>
              <span className="opacity-50">↔</span>
              <span className="font-bold flex-1 text-right">{par.derecha}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // clasificador
  if (tipo === 'clasificador') {
    return (
      <div className={base}>
        <p className={titleCls}>Clasificación correcta</p>
        <div className="grid grid-cols-2 gap-2">
          {actividad.categorias.map((cat, ci) => (
            <div key={ci} className={`p-2 rounded-xl ${sinRespuesta ? 'bg-ink/5' : 'bg-white/10'}`}>
              <p className="font-black text-xs mb-1">{cat.nombre}</p>
              {cat.items.map((item, ii) => (
                <p key={ii} className="text-xs font-bold opacity-80">{item}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // palabras_perdidas
  if (tipo === 'palabras_perdidas') {
    const partes = actividad.oracion.split('[___]');
    return (
      <div className={base}>
        <p className={titleCls}>Oración completa</p>
        <p className="text-base font-bold leading-relaxed">
          {partes.map((parte, i) => (
            <span key={i}>
              {parte}
              {i < actividad.respuestas.length && (
                <span className={`font-black px-1 underline ${sinRespuesta ? 'text-ink' : 'text-white'}`}>
                  {actividad.respuestas[i]}
                </span>
              )}
            </span>
          ))}
        </p>
      </div>
    );
  }

  return null;
}
