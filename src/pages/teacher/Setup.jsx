import { useState } from 'react';
import { generarPreguntas, generarPreguntasDeYoutube } from '../../services/aiService.js';
import { crearSesion } from '../../services/sessionService.js';
import TeacherHistory from './TeacherHistory.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';
import ReviewQuestions from '../../components/ReviewQuestions.jsx';

export default function Setup({ onCreated }) {
  const [tema, setTema] = useState('');
  const [textoBase, setTextoBase] = useState('');
  const [urlYoutube, setUrlYoutube] = useState('');
  const [modo, setModo] = useState('tema'); // 'tema', 'texto' o 'youtube'
  const [cantidad, setCantidad] = useState(10);
  const [nivel, setNivel] = useState('bachillerato');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState('idle');
  const [preguntasGeneradas, setPreguntasGeneradas] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleGenerar() {
    setError(null);
    if (modo === 'tema' && !tema.trim()) return setError('Indica un tema.');
    if (modo === 'texto' && !textoBase.trim()) return setError('Pega el cuestionario en el cuadro de texto.');
    if (modo === 'youtube' && !urlYoutube.trim()) return setError('Pega el enlace del video de YouTube.');
    if (cantidad < 1 || cantidad > 30) return setError('Entre 1 y 30 preguntas.');

    setCargando(true);
    try {
      setPaso('generando');
      let preguntas;
      if (modo === 'youtube') {
        preguntas = await generarPreguntasDeYoutube({ urlYoutube: urlYoutube.trim(), cantidad, nivel });
      } else {
        preguntas = await generarPreguntas({
          tema: modo === 'tema' ? tema.trim() : '',
          textoBase: modo === 'texto' ? textoBase.trim() : '',
          cantidad,
          nivel
        });
      }
      setPreguntasGeneradas(preguntas);
      setPaso('revisando');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error inesperado');
      setPaso('idle');
    } finally {
      setCargando(false);
    }
  }

  function handleCrearManual() {
    setPreguntasGeneradas([{ pregunta: '', opciones: ['', '', '', ''], correcta: 0 }]);
    setPaso('revisando');
  }

  async function handleCrearSalaConfirmada(preguntasFinales) {
    setCargando(true);
    try {
      setPaso('creando');
      if (preguntasFinales.length === 0) throw new Error('Debe haber al menos 1 pregunta.');
      const pin = await crearSesion(preguntasFinales);
      onCreated(pin);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error inesperado');
      setPaso('revisando');
    } finally {
      setCargando(false);
    }
  }

  if (paso === 'revisando') {
    return (
      <main className="min-h-screen px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col bg-gameBg animate-fade-in">
        {cargando && (
           <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="text-2xl font-black animate-pulse-soft text-kahootBlue">Creando sala...</div>
           </div>
        )}
        <ReviewQuestions 
          initialQuestions={preguntasGeneradas}
          onConfirm={handleCrearSalaConfirmada}
          onCancel={() => setPaso('idle')}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col bg-gameBg">
      <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-12">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost">⌂ Inicio</button>
          <div className="font-black text-xl italic tracking-tighter">Aula<span className="text-kahootBlue">!</span></div>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setMostrarHistorial(!mostrarHistorial)} className="font-bold text-sm tracking-widest uppercase text-ink/60 hover:text-ink transition-colors">
            {mostrarHistorial ? 'Ocultar Historial' : 'Historial'}
          </button>
          <span className="text-ink/20">|</span>
          <button onClick={logout} className="font-bold text-sm tracking-widest uppercase text-deny hover:text-deny/70 transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <section className="bg-white p-8 md:p-12 rounded-3xl shadow-sm animate-slide-up border-t-8 border-kahootBlue">
        <h1 className="font-black text-4xl md:text-5xl leading-tight tracking-tight mb-4">
          Crea tu próximo <span className="text-kahootBlue">Juego</span>
        </h1>
        <p className="text-ink/60 max-w-xl font-bold text-lg mb-10">
          La IA genera preguntas desde un tema, extrae de tu propio texto, o analiza un video de YouTube.
        </p>

        <div className="flex flex-wrap gap-2 mb-8 bg-ink/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setModo('tema')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${modo === 'tema' ? 'bg-white shadow-sm text-kahootBlue' : 'text-ink/60 hover:text-ink'}`}
          >
            💡 Por Tema
          </button>
          <button
            onClick={() => setModo('texto')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${modo === 'texto' ? 'bg-white shadow-sm text-kahootBlue' : 'text-ink/60 hover:text-ink'}`}
          >
            📋 Pegar Texto
          </button>
          <button
            onClick={() => setModo('youtube')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${modo === 'youtube' ? 'bg-white shadow-sm text-red-500' : 'text-ink/60 hover:text-ink'}`}
          >
            🎥 Desde YouTube
          </button>
        </div>

        <div className="space-y-8">
          {modo === 'tema' && (
            <Field label="¿De qué trata el juego?" hint="Sé específico. Ej: «Fotosíntesis en plantas C3»">
              <input
                className="field"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ej. Revolución Industrial"
                disabled={cargando}
                autoFocus
              />
            </Field>
          )}
          {modo === 'texto' && (
            <Field label="Pega tu cuestionario" hint="La IA extraerá las preguntas y opciones automáticamente.">
              <textarea
                className="field min-h-[180px] resize-y"
                value={textoBase}
                onChange={(e) => setTextoBase(e.target.value)}
                placeholder="Ej: Pregunta 1: ¿Cuál es la capital... A) Madrid B) Lima..."
                disabled={cargando}
                autoFocus
              />
            </Field>
          )}
          {modo === 'youtube' && (
            <Field label="Enlace del video de YouTube" hint="El video debe tener subtítulos activados (automáticos o manuales).">
              <input
                className="field"
                type="url"
                value={urlYoutube}
                onChange={(e) => setUrlYoutube(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={cargando}
                autoFocus
              />
            </Field>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <Field label="Cantidad de preguntas">
              <input
                type="number"
                min={1}
                max={30}
                className="field text-center"
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                disabled={cargando}
              />
            </Field>

            <Field label="Nivel académico">
              <select
                className="field appearance-none cursor-pointer"
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
                disabled={cargando}
              >
                <option value="primaria">Primaria</option>
                <option value="bachillerato">Bachillerato</option>
                <option value="universidad">Universidad</option>
              </select>
            </Field>
          </div>

          {error && (
            <div className="bg-deny/10 border-l-4 border-deny p-4 rounded-r-lg text-deny font-bold">
              {error}
            </div>
          )}

          <div className="pt-8 border-t border-mist flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <p className="font-bold text-sm uppercase text-ink/40 tracking-widest">
              {modo === 'youtube' ? 'Proceso: ~20-30s • requiere subtítulos en el video' : 'El proceso tarda aprox. 10-15s'}
            </p>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <button onClick={handleCrearManual} disabled={cargando} className="p-4 rounded-xl font-black uppercase tracking-widest bg-white border-4 border-kahootBlue text-kahootBlue hover:bg-kahootBlue/10 transition-all shadow-sm">
                Crear Manualmente
              </button>
              <button onClick={handleGenerar} disabled={cargando} className="btn-primary px-8 bg-kahootBlue">
                {cargando ? estadoTexto(paso) : 'Generar Preguntas ✨'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {mostrarHistorial && <TeacherHistory onClose={() => setMostrarHistorial(false)} />}
    </main>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block">
        {label}
      </label>
      {children}
      {hint && <p className="text-sm font-bold text-ink/40 mt-2 ml-2">{hint}</p>}
    </div>
  );
}

function estadoTexto(paso) {
  if (paso === 'generando') return 'Analizando con IA...';
  if (paso === 'creando') return 'Creando sala...';
  return 'Cargando...';
}
