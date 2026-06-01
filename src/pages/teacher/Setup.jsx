import { useState } from 'react';
import { generarActividades, generarPreguntas, logAIFeedback } from '../../services/aiService.js';
import { crearSesion } from '../../services/sessionService.js';
import { useNavigate, useLocation } from 'react-router-dom';
import ReviewActivities from '../../components/ReviewActivities.jsx';
import { TIPOS, TIPOS_LISTA } from '../../types/activityTypes.js';
import { useAuth } from '../../hooks/useAuth.js';
import { guardarSala, guardarContenidoSala } from '../../utils/savedRooms.js';
import { publishToBank } from '../../services/bankService.js';

const CONTADORES_INICIAL = Object.fromEntries(TIPOS_LISTA.map(t => [t.key, 0]));

// Grados por categoría (opcional) y niveles de dificultad.
const GRADOS = {
  primaria: ['Preescolar', '1°', '2°', '3°', '4°', '5°'],
  bachillerato: ['6°', '7°', '8°', '9°', '10°', '11°'],
  universidad: ['Semestres 1–3', 'Semestres 4–6', 'Semestres 7+'],
};
const DIFICULTADES = ['Básico', 'Intermedio', 'Avanzado'];
// Grados que aún no leen bien → se desaconsejan los tipos muy textuales.
const GRADOS_TEMPRANOS = ['Preescolar', '1°', '2°'];
const TIPOS_TEXTUALES = ['detective_texto', 'palabras_perdidas'];

export default function Setup({ onCreated }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tema, setTema] = useState(location.state?.tema || '');
  const [modoOrigen, setModoOrigen] = useState('tema'); // 'tema' o 'texto' o 'youtube'
  const [textoBase, setTextoBase] = useState('');
  // Submodo del Lote: 'importar' = extrae cada pregunta tal cual (1 actividad por
  // pregunta, ignora contadores); 'generar' = la IA adapta a los tipos elegidos.
  const [loteModo, setLoteModo] = useState('importar');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [nivel, setNivel] = useState('bachillerato');
  const [grado, setGrado] = useState(location.state?.grado || '');         // opcional
  const [dificultad, setDificultad] = useState(location.state?.dificultad || ''); // opcional
  const [encabezado, setEncabezado] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aula_encabezado')) || {}; }
    catch { return {}; }
  });
  const [contadores, setContadores] = useState(CONTADORES_INICIAL);

  function setEncabezadoCampo(campo, val) {
    setEncabezado(prev => {
      const next = { ...prev, [campo]: val };
      try { localStorage.setItem('aula_encabezado', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState(location.state?.actividades ? 'revisando' : 'idle');
  const [actividades, setActividades] = useState(location.state?.actividades || []);

  const total = Object.values(contadores).reduce((s, v) => s + v, 0);
  const esGradoTemprano = GRADOS_TEMPRANOS.includes(grado);

  function ajustar(tipo, delta) {
    setContadores(prev => ({
      ...prev,
      [tipo]: Math.max(0, Math.min(20, prev[tipo] + delta)),
    }));
  }

  async function handleGenerar() {
    setError(null);
    const isTexto = modoOrigen === 'texto';
    const isYoutube = modoOrigen === 'youtube';
    const isImportarLote = isTexto && loteModo === 'importar';
    if (!isTexto && !isYoutube && !tema.trim()) return setError('Indica un tema para la evaluación.');
    if (isTexto && !textoBase.trim()) return setError('Por favor pega el cuestionario o el resumen de texto.');
    if (isYoutube && !youtubeUrl.trim()) return setError('Por favor introduce un enlace de video de YouTube.');
    // En "Importar tal cual" no se usan los contadores: cada pregunta del texto
    // se convierte en una actividad. En los demás modos sí se exige al menos 1.
    if (!isImportarLote && total < 1) return setError('Añade al menos 1 actividad usando los contadores de abajo.');

    const seleccion = Object.entries(contadores).filter(([, v]) => v > 0);
    setCargando(true);
    setPaso('generando');

    const temaFinal = tema.trim() || (isYoutube ? 'Evaluación desde YouTube' : 'Evaluación de Texto');

    try {
      let resultado;
      if (isImportarLote) {
        // Extracción FIEL: parte el cuestionario pegado en una actividad por
        // pregunta (selección clásica), tal como se ve en el banco para las demás.
        resultado = await generarPreguntas({
          tema: temaFinal,
          nivel,
          grado,
          dificultad,
          cantidad: 60,
          textoBase: textoBase.trim(),
        });
      } else {
        resultado = await generarActividades({
          tema: temaFinal,
          nivel,
          grado,
          dificultad,
          seleccion,
          textoBase: isTexto ? textoBase.trim() : '',
          youtubeUrl: isYoutube ? youtubeUrl.trim() : ''
        });
      }
      setActividades(resultado);
      if (!tema.trim()) {
        setTema(temaFinal);
      }
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

  async function handleConfirmar(actividadesFinales, publicarBanco = false) {
    setCargando(true);
    setPaso('creando');
    try {
      if (actividadesFinales.length === 0) throw new Error('Debe haber al menos 1 actividad.');
      
      // MODO ESPONJA: Si fue generada por IA (tema, texto o youtube) y no manualmente, loggeamos cambios
      if (['tema', 'texto', 'youtube'].includes(modoOrigen)) {
        logAIFeedback(actividades, actividadesFinales, modoOrigen);
      }

      const pin = await crearSesion(actividadesFinales, tema.trim(), { grado, dificultad });
      
      // Guardar también en "Salas activas" del panel para no perderla
      guardarSala(user?.uid, { pin, tema: tema.trim() });
      await guardarContenidoSala(user?.uid, { pin, preguntas: actividadesFinales, tema: tema.trim(), grado, dificultad });
      
      // Siempre publicar en el banco
      await publishToBank(actividadesFinales, {
        tema: tema.trim() || 'Evaluación',
        grado,
        nivel,
        dificultad,
        autorUid: publicarBanco ? user?.uid : null,
        autorNombre: publicarBanco ? (user?.displayName || user?.email || 'Docente') : 'Incógnita'
      });

      onCreated(pin);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error al crear la sala.');
      setPaso('revisando');
    } finally {
      setCargando(false);
    }
  }

  // Guardar sin iniciar: crea la sala, la registra en "Salas activas", publica y va a Mi Panel.
  async function handleGuardar(actividadesFinales, publicarBanco = false) {
    setCargando(true);
    setPaso('creando');
    try {
      if (actividadesFinales.length === 0) throw new Error('Debe haber al menos 1 actividad.');

      // MODO ESPONJA: Loggear cambios
      if (['tema', 'texto', 'youtube'].includes(modoOrigen)) {
        logAIFeedback(actividades, actividadesFinales, modoOrigen);
      }

      const pin = await crearSesion(actividadesFinales, tema.trim(), { grado, dificultad });
      guardarSala(user?.uid, { pin, tema: tema.trim() });
      await guardarContenidoSala(user?.uid, { pin, preguntas: actividadesFinales, tema: tema.trim(), grado, dificultad });
      
      // Siempre publicar en el banco
      await publishToBank(actividadesFinales, {
        tema: tema.trim() || 'Evaluación',
        grado,
        nivel,
        dificultad,
        autorUid: publicarBanco ? user?.uid : null,
        autorNombre: publicarBanco ? (user?.displayName || user?.email || 'Docente') : 'Incógnita'
      });

      navigate('/docente');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error al guardar la sala.');
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
            <div className="text-2xl font-black animate-pulse-soft text-brandPrimary">Guardando sala…</div>
          </div>
        )}
        
        {error && (
          <div className="bg-deny/10 border-l-4 border-deny p-4 rounded-r-lg text-deny font-bold mb-6">
            Error: {error}
          </div>
        )}

        <ReviewActivities
          initialActividades={actividades}
          tema={tema}
          grado={grado}
          dificultad={dificultad}
          onConfirm={handleConfirmar}
          onSave={handleGuardar}
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
            Aula<span className="text-brandPrimary">!</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/docente')}
          className="font-bold text-sm tracking-widest uppercase text-ink/60 hover:text-ink transition-colors"
        >
          Mi Panel
        </button>
      </header>

      <section className="bg-white p-8 md:p-12 rounded-3xl shadow-sm animate-slide-up border-t-8 border-brandPrimary">
        <h1 className="font-black text-4xl md:text-5xl leading-tight tracking-tight mb-2">
          Diseña tu <span className="text-brandPrimary">Evaluación</span>
        </h1>
        <p className="text-ink/60 font-bold text-lg mb-8">
          Elige el método de creación y la cantidad de actividades por tipo.
        </p>

        {/* Método de creación */}
        <div className="flex gap-2 p-1.5 bg-ink/5 rounded-2xl mb-8 max-w-lg no-print">
          <button
            type="button"
            onClick={() => setModoOrigen('tema')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${
              modoOrigen === 'tema'
                ? 'bg-white text-brandPrimary shadow-sm'
                : 'text-ink/50 hover:text-ink/80'
            }`}
          >
            🎯 Tema / Idea
          </button>
          <button
            type="button"
            onClick={() => setModoOrigen('texto')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${
              modoOrigen === 'texto'
                ? 'bg-white text-brandPrimary shadow-sm'
                : 'text-ink/50 hover:text-ink/80'
            }`}
          >
            📋 Lote / Resumen
          </button>
          <button
            type="button"
            onClick={() => setModoOrigen('youtube')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all ${
              modoOrigen === 'youtube'
                ? 'bg-white text-brandPrimary shadow-sm'
                : 'text-ink/50 hover:text-ink/80'
            }`}
          >
            🎥 YouTube
          </button>
        </div>

        {/* Tema (Modo: Tema) */}
        {modoOrigen === 'tema' && (
          <div className="mb-8 animate-fade-in">
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
        )}

        {/* Cuestionario/Resumen (Modo: Texto) */}
        {modoOrigen === 'texto' && (
          <div className="space-y-6 mb-8 animate-fade-in">
            <div>
              <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block">
                Título o Tema de la evaluación (Opcional)
              </label>
              <input
                className="field text-lg"
                value={tema}
                onChange={e => setTema(e.target.value)}
                placeholder="Ej. Magnitudes Eléctricas, Ley de Ohm..."
                disabled={cargando}
              />
            </div>
            {/* Submodo del lote: importar tal cual vs adaptar con IA */}
            <div className="flex gap-2 p-1 bg-mist/40 rounded-xl">
              <button
                type="button"
                onClick={() => setLoteModo('importar')}
                className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                  loteModo === 'importar' ? 'bg-white text-brandPrimary shadow-sm' : 'text-ink/50 hover:text-ink/80'
                }`}
              >
                📋 Importar tal cual
              </button>
              <button
                type="button"
                onClick={() => setLoteModo('generar')}
                className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                  loteModo === 'generar' ? 'bg-white text-brandPrimary shadow-sm' : 'text-ink/50 hover:text-ink/80'
                }`}
              >
                ✨ Adaptar con IA
              </button>
            </div>
            <p className="text-xs text-ink/50 font-bold -mt-3">
              {loteModo === 'importar'
                ? 'Cada pregunta del cuestionario se convierte en una actividad independiente (se ignoran los contadores de abajo).'
                : 'La IA adaptará el texto a los tipos y cantidades que elijas con los contadores de abajo.'}
            </p>
            <div>
              <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block">
                Cuestionario en lote o Resumen de texto
              </label>
              <textarea
                className="field min-h-[220px] font-mono text-sm leading-relaxed p-4 bg-ink/[0.01]"
                value={textoBase}
                onChange={e => setTextoBase(e.target.value)}
                placeholder={`Pega aquí un cuestionario existente en formato texto (por lotes) o un resumen del tema para que la IA extraiga la información.

Ejemplo de Cuestionario:
1. ¿Cuál es la unidad de resistencia?
A) Amperio.
B) Ohmio.
C) Voltio.
...

Ejemplo de Resumen:
La ley de Ohm establece la relación entre...`}
                disabled={cargando}
              />
            </div>
          </div>
        )}

        {/* Video de YouTube (Modo: YouTube) */}
        {modoOrigen === 'youtube' && (
          <div className="space-y-6 mb-8 animate-fade-in">
            <div>
              <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block">
                Título o Tema de la evaluación (Opcional)
              </label>
              <input
                className="field text-lg"
                value={tema}
                onChange={e => setTema(e.target.value)}
                placeholder="Ej. Magnitudes Eléctricas (Dejar vacío para autodetectar)..."
                disabled={cargando}
              />
            </div>
            <div>
              <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block flex items-center justify-between">
                <span>Enlace del Video de YouTube</span>
                <span className="text-xs text-ink/40 font-bold tracking-normal normal-case">La IA leerá los subtítulos del video</span>
              </label>
              <input
                className="field text-lg font-mono text-sm"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="Pega aquí el link del video. Ej: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                disabled={cargando}
              />
              <p className="text-xs text-ink/40 font-bold mt-1.5 leading-normal">
                🚨 Nota: El video debe contar con subtítulos disponibles (subidos por el creador o autogenerados en español por YouTube) para que la IA pueda extraer la información.
              </p>
            </div>
          </div>
        )}

        {/* Nivel */}
        <div className="mb-8">
          <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-3 block">
            Nivel académico
          </label>
          <div className="flex gap-2 flex-wrap">
            {['primaria', 'bachillerato', 'universidad'].map(n => (
              <button
                key={n}
                onClick={() => { setNivel(n); setGrado(''); }}
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

        {/* Grado / curso (opcional, depende de la categoría) */}
        <div className="mb-8">
          <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-3 block">
            Grado / curso <span className="text-ink/30 normal-case tracking-normal">(opcional)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {(GRADOS[nivel] || []).map(g => (
              <button
                key={g}
                onClick={() => setGrado(grado === g ? '' : g)}
                disabled={cargando}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                  grado === g
                    ? 'bg-brandPrimary text-white'
                    : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/40 font-bold mt-2">
            La IA adapta el contenido al desarrollo cognitivo del grado elegido.
          </p>
        </div>

        {/* Nivel de dificultad (opcional) */}
        <div className="mb-10">
          <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-3 block">
            Nivel de dificultad <span className="text-ink/30 normal-case tracking-normal">(opcional)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {DIFICULTADES.map(d => (
              <button
                key={d}
                onClick={() => setDificultad(dificultad === d ? '' : d)}
                disabled={cargando}
                className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors ${
                  dificultad === d
                    ? 'bg-brandSuccess text-white'
                    : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/40 font-bold mt-2">
            Ajusta la profundidad dentro del mismo grado (Básico = recordar/comprender · Avanzado = analizar/crear).
          </p>
        </div>

        {/* Datos para la guía impresa (opcional, se recuerdan) */}
        <div className="mb-10">
          <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-3 block">
            Datos para la guía impresa <span className="text-ink/30 normal-case tracking-normal">(opcional)</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              className="field"
              value={encabezado.institucion || ''}
              onChange={e => setEncabezadoCampo('institucion', e.target.value)}
              placeholder="Institución educativa"
              disabled={cargando}
            />
            <input
              className="field"
              value={encabezado.docente || ''}
              onChange={e => setEncabezadoCampo('docente', e.target.value)}
              placeholder="Nombre del docente"
              disabled={cargando}
            />
          </div>
          <p className="text-xs text-ink/40 font-bold mt-1.5">
            Aparecerán en el encabezado del PDF. Podrás editarlos también antes de imprimir.
          </p>
        </div>

        {/* 10 contadores */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="font-bold text-sm tracking-widest uppercase text-ink/60">
              Tipos de actividad
            </label>
            <span className={`font-black text-sm px-3 py-1 rounded-full transition-colors ${
              total > 0
                ? 'bg-brandPrimary/10 text-brandPrimary'
                : 'bg-ink/5 text-ink/40'
            }`}>
              {total} {total === 1 ? 'actividad' : 'actividades'}
            </span>
          </div>

          {esGradoTemprano && (
            <div className="bg-brandAccent/15 border-l-4 border-brandAccent p-3 rounded-r-lg text-sm font-bold text-ink/70 mb-4">
              👶 Para {grado}, los niños aún no leen bien: prefiere actividades visuales. La IA usará emojis y poco texto, y hay lectura en voz alta. Los tipos con mucho texto aparecen marcados como poco ideales.
            </div>
          )}

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
                noRecomendado={esGradoTemprano && TIPOS_TEXTUALES.includes(key)}
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
              className="p-4 rounded-xl font-black uppercase tracking-widest bg-white border-4 border-brandPrimary text-brandPrimary hover:bg-brandPrimary/10 transition-all shadow-sm disabled:opacity-40"
            >
              Crear Manualmente
            </button>
            <button
              onClick={handleGenerar}
              disabled={cargando || total === 0}
              className="btn-primary px-8 bg-brandPrimary disabled:opacity-40"
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
function ContadorTipo({ label, emoji, desc, colorBorder, value, onMinus, onPlus, disabled, noRecomendado = false }) {
  const activo = value > 0;
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
      noRecomendado ? 'border-brandAccent/60 bg-brandAccent/5' : activo ? `${colorBorder} bg-white shadow-sm` : 'border-mist bg-white'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-2xl shrink-0 ${noRecomendado ? 'opacity-60' : ''}`}>{emoji}</span>
        <div className="min-w-0">
          <div className="font-black text-sm leading-tight truncate">{label}</div>
          {noRecomendado
            ? <div className="font-bold text-[11px] text-amber-600 truncate">⚠ Poco ideal: mucho texto para este grado</div>
            : <div className="font-bold text-xs text-ink/40 truncate">{desc}</div>}
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
          activo ? 'text-brandPrimary' : 'text-ink/30'
        }`}>
          {value}
        </span>
        <button
          onClick={onPlus}
          disabled={disabled}
          className="w-8 h-8 rounded-lg bg-brandPrimary/10 text-brandPrimary font-black text-lg leading-none hover:bg-brandPrimary/20 disabled:opacity-30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
