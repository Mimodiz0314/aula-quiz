import { useState } from 'react';
import { generarActividades } from '../../services/aiService.js';
import { crearSesion } from '../../services/sessionService.js';
import { useNavigate, useLocation } from 'react-router-dom';
import ReviewActivities from '../../components/ReviewActivities.jsx';
import { TIPOS, TIPOS_LISTA } from '../../types/activityTypes.js';

const CONTADORES_INICIAL = Object.fromEntries(TIPOS_LISTA.map(t => [t.key, 0]));

export default function Setup({ onCreated }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [tema, setTema] = useState(location.state?.tema || '');
  const [nivel, setNivel] = useState('bachillerato');
  const [contadores, setContadores] = useState(CONTADORES_INICIAL);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState(location.state?.actividades ? 'revisando' : 'idle');
  const [actividades, setActividades] = useState(location.state?.actividades || []);

  const total = Object.values(contadores).reduce((s, v) => s + v, 0);

  function ajustar(tipo, delta) {
    setContadores(prev => ({
      ...prev,
      [tipo]: Math.max(0, Math.min(20, prev[tipo] + delta)),
    }));
  }

  async function handleGenerar() {
    setError(null);
    if (!tema.trim()) return setError('Indica un tema para la evaluación.');
    if (total < 1) return setError('Añade al menos 1 actividad usando los contadores de abajo.');

    const seleccion = Object.entries(contadores).filter(([, v]) => v > 0);
    setCargando(true);
    setPaso('generando');
    try {
      const resultado = await generarActividades({ tema: tema.trim(), nivel, seleccion });
      setActividades(resultado);
      setPaso('revisando');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error inesperado al generar.');
      setPaso('idle');
    } finally {
      setCargando(false);
    }
  }

  function handleCrearManual() {
    setActividades([TIPOS.seleccion_clasica.crear()]);
    setPaso('revisando');
  }

  async function handleConfirmar(actividadesFinales) {
    setCargando(true);
    setPaso('creando');
    try {
      if (actividadesFinales.length === 0) throw new Error('Debe haber al menos 1 actividad.');
      const pin = await crearSesion(actividadesFinales, tema.trim());
      onCreated(pin);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error al crear la sala.');
      setPaso('revisando');
    } finally {
      setCargando(false);
    }
  }

  if (paso === 'revisando' || paso === 'creando') {
    return (
      <main className="min-h-screen px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col bg-gameBg animate-fade-in">
        {paso === 'creando' && (
          <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="text-2xl font-black animate-pulse-soft text-kahootBlue">Creando sala…</div>
          </div>
        )}
        <ReviewActivities
          initialActividades={actividades}
          onConfirm={handleConfirmar}
          onCancel={() => { setPaso('idle'); setError(null); }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col bg-gameBg">
      <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost">⌂ Inicio</button>
          <div className="font-black text-xl italic tracking-tighter">
            Aula<span className="text-kahootBlue">!</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/docente')}
          className="font-bold text-sm tracking-widest uppercase text-ink/60 hover:text-ink transition-colors"
        >
          Mi Panel
        </button>
      </header>

      <section className="bg-white p-8 md:p-12 rounded-3xl shadow-sm animate-slide-up border-t-8 border-kahootBlue">
        <h1 className="font-black text-4xl md:text-5xl leading-tight tracking-tight mb-2">
          Diseña tu <span className="text-kahootBlue">Evaluación</span>
        </h1>
        <p className="text-ink/60 font-bold text-lg mb-10">
          Elige el tema y cuántas actividades de cada tipo quieres generar.
        </p>

        {/* Tema */}
        <div className="mb-8">
          <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block">
            Tema de la evaluación
          </label>
          <input
            className="field text-lg"
            value={tema}
            onChange={e => setTema(e.target.value)}
            placeholder="Ej. Revolución Industrial, Fotosíntesis, Ecuaciones cuadráticas…"
            disabled={cargando}
            autoFocus
          />
        </div>

        {/* Nivel */}
        <div className="mb-10">
          <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-3 block">
            Nivel académico
          </label>
          <div className="flex gap-2 flex-wrap">
            {['primaria', 'bachillerato', 'universidad'].map(n => (
              <button
                key={n}
                onClick={() => setNivel(n)}
                disabled={cargando}
                className={`px-5 py-2 rounded-xl font-bold text-sm capitalize transition-colors ${
                  nivel === n
                    ? 'bg-ink text-white'
                    : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 10 contadores */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="font-bold text-sm tracking-widest uppercase text-ink/60">
              Tipos de actividad
            </label>
            <span className={`font-black text-sm px-3 py-1 rounded-full transition-colors ${
              total > 0
                ? 'bg-kahootBlue/10 text-kahootBlue'
                : 'bg-ink/5 text-ink/40'
            }`}>
              {total} {total === 1 ? 'actividad' : 'actividades'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {TIPOS_LISTA.map(({ key, label, emoji, desc, colorBorder }) => (
              <ContadorTipo
                key={key}
                label={label}
                emoji={emoji}
                desc={desc}
                colorBorder={colorBorder}
                value={contadores[key]}
                onMinus={() => ajustar(key, -1)}
                onPlus={() => ajustar(key, 1)}
                disabled={cargando}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-deny/10 border-l-4 border-deny p-4 rounded-r-lg text-deny font-bold mb-6">
            {error}
          </div>
        )}

        <div className="pt-8 border-t border-mist flex flex-col md:flex-row gap-4 justify-between items-center">
          <p className="font-bold text-sm uppercase text-ink/40 tracking-widest">
            La IA tarda aprox. 15–25s
          </p>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <button
              onClick={handleCrearManual}
              disabled={cargando}
              className="p-4 rounded-xl font-black uppercase tracking-widest bg-white border-4 border-kahootBlue text-kahootBlue hover:bg-kahootBlue/10 transition-all shadow-sm disabled:opacity-40"
            >
              Crear Manualmente
            </button>
            <button
              onClick={handleGenerar}
              disabled={cargando || total === 0}
              className="btn-primary px-8 bg-kahootBlue disabled:opacity-40"
            >
              {cargando
                ? paso === 'generando' ? 'Generando con IA…' : 'Cargando…'
                : `Generar ${total > 0 ? total : ''} Actividades ✨`}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Contador individual por tipo
// ---------------------------------------------------------------------------
function ContadorTipo({ label, emoji, desc, colorBorder, value, onMinus, onPlus, disabled }) {
  const activo = value > 0;
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
      activo ? `${colorBorder} bg-white shadow-sm` : 'border-mist bg-white'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0">{emoji}</span>
        <div className="min-w-0">
          <div className="font-black text-sm leading-tight truncate">{label}</div>
          <div className="font-bold text-xs text-ink/40 truncate">{desc}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={onMinus}
          disabled={disabled || value === 0}
          className="w-8 h-8 rounded-lg bg-ink/5 font-black text-lg leading-none hover:bg-ink/10 disabled:opacity-30 transition-colors"
        >
          −
        </button>
        <span className={`w-8 text-center font-black text-lg tabular-nums ${
          activo ? 'text-kahootBlue' : 'text-ink/30'
        }`}>
          {value}
        </span>
        <button
          onClick={onPlus}
          disabled={disabled}
          className="w-8 h-8 rounded-lg bg-kahootBlue/10 text-kahootBlue font-black text-lg leading-none hover:bg-kahootBlue/20 disabled:opacity-30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
