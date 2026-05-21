import { useState } from 'react';
import { generarPreguntas } from '../../services/aiService.js';
import { crearSesion } from '../../services/sessionService.js';
import TeacherHistory from './TeacherHistory.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';

export default function Setup({ onCreated }) {
  const [tema, setTema] = useState('');
  const [cantidad, setCantidad] = useState(10);
  const [nivel, setNivel] = useState('bachillerato');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState('idle');
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleGenerar() {
    setError(null);
    if (!tema.trim()) return setError('Indica un tema.');
    if (cantidad < 1 || cantidad > 30) return setError('Entre 1 y 30 preguntas.');

    setCargando(true);
    try {
      setPaso('generando');
      const preguntas = await generarPreguntas({ tema: tema.trim(), cantidad, nivel });
      setPaso('creando');
      const pin = await crearSesion(preguntas);
      onCreated(pin);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error inesperado');
      setPaso('idle');
    } finally {
      setCargando(false);
    }
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
          La IA generará preguntas con estándar ICFES: enunciado claro, cuatro
          opciones, y solo una respuesta correcta.
        </p>

        <div className="space-y-8">
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
              El proceso tarda aprox. 10-15s
            </p>
            <button onClick={handleGenerar} disabled={cargando} className="btn-primary px-12 bg-kahootBlue">
              {cargando ? estadoTexto(paso) : 'Generar Preguntas ✨'}
            </button>
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
  if (paso === 'generando') return 'Generando con IA...';
  if (paso === 'creando') return 'Creando sala...';
  return 'Cargando...';
}
