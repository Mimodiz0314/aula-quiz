import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col bg-gameBg">
      {/* Encabezado */}
      <header className="px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="font-black text-2xl tracking-tighter italic">Aula<span className="text-kahootBlue">!</span></div>
        <div className="font-bold text-xs tracking-[0.2em] uppercase text-ink/40 bg-mist/50 px-3 py-1 rounded-full">
          v2.0 · Gamificado
        </div>
      </header>

      {/* Cuerpo principal */}
      <section className="flex-1 grid md:grid-cols-2 gap-12 px-6 md:px-12 py-12 md:py-20 max-w-6xl mx-auto w-full items-center">
        <div className="animate-slide-up">
          <div className="inline-block bg-kahootYellow/20 text-kahootYellow px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest mb-6 border border-kahootYellow/30">
            Aprende Jugando
          </div>
          <h1 className="font-black text-6xl md:text-8xl leading-none tracking-tight mb-6">
            Juega,<br />
            Aprende,<br />
            <span className="text-kahootBlue">Gana.</span>
          </h1>
          <p className="mt-6 max-w-md text-xl leading-relaxed text-ink/70 font-bold">
            Evaluación interactiva en tiempo real. Compite con tus compañeros, demuestra lo que sabes y diviértete aprendiendo.
          </p>
        </div>

        <div className="space-y-6 md:pl-12 flex flex-col items-center md:items-end w-full animate-bounce-in" style={{ animationDelay: '100ms' }}>
          
          <Link
            to="/jugar"
            className="group block w-full max-w-md p-6 border-b-8 border-r-4 border-kahootBlue/20 rounded-3xl bg-kahootBlue text-white hover:-translate-y-2 hover:border-kahootBlue/40 transition-all shadow-lg text-center"
          >
            <div className="font-black text-xl tracking-widest uppercase opacity-70 mb-2">
              Estudiante
            </div>
            <div className="font-black text-4xl md:text-5xl">
              Ingresar PIN
            </div>
          </Link>

          <div className="flex items-center gap-4 w-full max-w-md justify-center py-4">
            <div className="h-[2px] bg-mist flex-1"></div>
            <span className="font-black text-mist text-sm uppercase tracking-widest">O si eres profesor</span>
            <div className="h-[2px] bg-mist flex-1"></div>
          </div>

          <Link
            to="/docente"
            className="group block w-full max-w-md p-6 border-b-8 border-r-4 border-mist/50 rounded-3xl bg-white text-ink hover:-translate-y-2 transition-all shadow-md text-center"
          >
            <div className="font-black text-sm tracking-widest uppercase text-ink/40 mb-2">
              Modo Docente
            </div>
            <div className="font-black text-3xl">
              Crear Juego
            </div>
          </Link>

        </div>
      </section>

      <footer className="px-6 md:px-12 py-6 font-bold text-xs tracking-widest uppercase text-ink/40 flex justify-between bg-white border-t border-mist/50">
        <span>Diseñado para enganchar</span>
        <span>Preguntas generadas por IA</span>
      </footer>
    </main>
  );
}
