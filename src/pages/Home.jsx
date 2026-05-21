import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Encabezado */}
      <header className="px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="font-display text-xl tracking-tight">Aula<span className="text-ink/40">.</span></div>
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
          v1.0 · tiempo real
        </div>
      </header>

      {/* Cuerpo principal */}
      <section className="flex-1 grid md:grid-cols-2 gap-12 px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto w-full items-center">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60 mb-6">
            Evaluación interactiva · estándar ICFES
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
            Pregunta,<br />responde,<br />
            <span className="italic font-light text-ink/70">aprende.</span>
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-ink/70">
            Una herramienta de evaluación en tiempo real, sin ruido visual,
            pensada para docentes que valoran el rigor y estudiantes que
            necesitan claridad.
          </p>
        </div>

        <div className="space-y-4 md:pl-12">
          <Link
            to="/docente"
            className="group block p-8 md:p-10 border border-ink/15 rounded-2xl bg-bone hover:border-ink/60 transition-all"
          >
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/50">
              01 — Modo docente
            </div>
            <div className="font-display text-4xl md:text-5xl mt-2">
              Crear sesión
              <span className="inline-block ml-3 transition-transform group-hover:translate-x-1">→</span>
            </div>
            <p className="text-ink/60 mt-3 text-sm">
              Genera el banco con IA, dirige el ritmo y recibe la nota final por estudiante.
            </p>
          </Link>

          <Link
            to="/jugar"
            className="group block p-8 md:p-10 border border-ink/15 rounded-2xl bg-ink text-bone hover:bg-graphite transition-all"
          >
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-bone/50">
              02 — Modo estudiante
            </div>
            <div className="font-display text-4xl md:text-5xl mt-2">
              Unirme con PIN
              <span className="inline-block ml-3 transition-transform group-hover:translate-x-1">→</span>
            </div>
            <p className="text-bone/60 mt-3 text-sm">
              Necesitas el código de 5 dígitos que te dio tu docente.
            </p>
          </Link>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-6 font-mono text-[11px] tracking-[0.15em] uppercase text-ink/40 flex justify-between">
        <span>Escala 0.0 — 5.0</span>
        <span>Cero ambigüedades · una respuesta correcta</span>
      </footer>
    </main>
  );
}
