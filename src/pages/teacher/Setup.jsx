import { useState } from 'react';
import { generarPreguntas } from '../../services/aiService.js';
import { crearSesion } from '../../services/sessionService.js';
import TeacherHistory from './TeacherHistory.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function Setup({ onCreated }) {
  const [tema, setTema] = useState('');
  const [cantidad, setCantidad] = useState(10);
  const [nivel, setNivel] = useState('bachillerato');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState('idle'); // idle | generando | creando
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const { logout } = useAuth();

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
    <main className="min-h-screen px-6 md:px-16 py-12 max-w-4xl mx-auto">
      <header className="flex justify-between items-baseline mb-16">
        <div className="font-display text-xl">Aula<span className="text-ink/40">.</span></div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setMostrarHistorial(!mostrarHistorial)} className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60 hover:text-ink transition-colors">
            {mostrarHistorial ? 'Ocultar Historial' : 'Ver Historial'}
          </button>
          <span className="text-ink/20">|</span>
          <button onClick={logout} className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60 hover:text-deny transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <h1 className="font-display text-5xl md:text-6xl leading-tight tracking-tight">
        Define la evaluación.
      </h1>
      <p className="text-ink/60 mt-4 max-w-xl">
        La IA generará preguntas con estándar ICFES: enunciado claro, cuatro
        opciones, una sola respuesta correcta.
      </p>

      <div className="mt-16 space-y-12">
        <Field label="Tema" hint="Sé específico. Ej: «Fotosíntesis en plantas C3»">
          <input
            className="field"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ej. Independencia de Colombia"
            disabled={cargando}
            autoFocus
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-12">
          <Field label="Cantidad de preguntas">
            <input
              type="number"
              min={1}
              max={30}
              className="field"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              disabled={cargando}
            />
          </Field>

          <Field label="Nivel">
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
          <div className="border-l-2 border-deny pl-4 text-deny font-body text-sm">
            {error}
          </div>
        )}

        <div className="pt-8 border-t border-ink/10 flex flex-col md:flex-row md:items-center gap-6">
          <button onClick={handleGenerar} disabled={cargando} className="btn-primary">
            {cargando ? estadoTexto(paso) : 'Generar con IA →'}
          </button>
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink/50">
            Esto puede tardar unos segundos
          </p>
        </div>

        {mostrarHistorial && <TeacherHistory onClose={() => setMostrarHistorial(false)} />}
      </div>
    </main>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink/40 mt-2">{hint}</p>}
    </div>
  );
}

function estadoTexto(paso) {
  if (paso === 'generando') return 'Generando preguntas…';
  if (paso === 'creando') return 'Creando sesión…';
  return 'Cargando…';
}
