import { iniciarSesion, setDuracion, cerrarSesion } from '../../services/sessionService.js';
import { useNavigate } from 'react-router-dom';

export default function Lobby({ pin, sesion }) {
  const navigate = useNavigate();
  const estudiantes = Object.entries(sesion.estudiantes || {});
  const duracion = sesion.pregunta_duracion ?? 30;

  async function handleCerrar() {
    if (!confirm('¿Cerrar la sesión y borrarla? Los estudiantes serán desconectados.')) return;
    await cerrarSesion(pin);
    navigate('/');
  }

  return (
    <main className="min-h-screen px-6 md:px-16 py-12">
      <header className="flex justify-between items-baseline mb-12">
        <div className="font-display text-xl">Aula<span className="text-ink/40">.</span></div>
        <button onClick={handleCerrar} className="btn-ghost">Cerrar sesión</button>
      </header>

      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-12">
        {/* PIN gigante */}
        <div>
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
            Código de acceso
          </div>
          <div className="font-display font-light text-[clamp(6rem,18vw,14rem)] leading-[0.85] tracking-tight mt-2">
            {pin}
          </div>
          <p className="text-ink/60 mt-6 max-w-md">
            Comparte este código con tus estudiantes. Pueden ingresar desde
            cualquier dispositivo en <span className="font-mono">/jugar</span>.
          </p>

          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4 max-w-md">
              <label className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60 w-44">
                Duración por pregunta
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={duracion}
                onChange={(e) => setDuracion(pin, Number(e.target.value))}
                className="w-24 bg-transparent border-b-2 border-ink/20 focus:border-ink font-display text-2xl py-1 outline-none text-center"
              />
              <span className="text-ink/60">seg.</span>
            </div>

            <button
              onClick={() => iniciarSesion(pin)}
              disabled={estudiantes.length === 0}
              className="btn-primary"
            >
              Iniciar evaluación →
            </button>
            {estudiantes.length === 0 && (
              <p className="text-xs text-ink/40 font-mono tracking-wider uppercase">
                Esperando al menos un estudiante…
              </p>
            )}
          </div>
        </div>

        {/* Lista de estudiantes */}
        <div className="border-l border-ink/10 lg:pl-12">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
              Conectados
            </div>
            <div className="font-display text-3xl">{estudiantes.length}</div>
          </div>

          <ul className="mt-6 space-y-2 max-h-[60vh] overflow-y-auto">
            {estudiantes.length === 0 && (
              <li className="text-ink/40 italic">Nadie se ha unido aún.</li>
            )}
            {estudiantes.map(([id, est], i) => (
              <li
                key={id}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-mist/40 animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      est.conectado ? 'bg-affirm' : 'bg-ink/20'
                    }`}
                  />
                  <span className="font-display text-xl">{est.nombre}</span>
                </div>
                <span className="font-mono text-xs text-ink/50 uppercase tracking-wider">
                  {est.grado}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-16 pt-6 border-t border-ink/10 font-mono text-[11px] tracking-[0.15em] uppercase text-ink/40 flex justify-between">
        <span>{(sesion.preguntas || []).length} preguntas listas</span>
        <span>Esperando inicio</span>
      </footer>
    </main>
  );
}
