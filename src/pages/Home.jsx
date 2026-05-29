import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col bg-gameBg">
      {/* Encabezado con Co-Branding */}
      <header className="px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3 select-none">
          <img 
            src="/logo.png" 
            alt="EduMaster Pro Logo" 
            className="h-10 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105 duration-200" 
          />
          <div className="h-6 w-[2px] bg-mist"></div>
          <div className="font-black text-2xl tracking-tighter italic text-ink">
            Aula<span className="text-kahootBlue">!</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-bold text-xs tracking-[0.2em] uppercase text-ink/40 bg-mist/50 px-3 py-1 rounded-full hidden md:block">
            v2.0 · Gamificado
          </div>
          <Link
            to="/admin/login"
            className="font-bold text-sm px-4 py-2 rounded-xl border-2 border-ink text-ink hover:bg-ink hover:text-white transition-colors"
          >
            Administración
          </Link>
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

          {/* Tarjeta de Código QR para móviles */}
          <div className="mt-12 p-5 bg-white border border-mist/80 rounded-3xl shadow-sm flex items-center gap-5 max-w-md hover:shadow-md transition-shadow">
            <div className="bg-gameBg p-2.5 rounded-2xl border border-mist/40 shrink-0">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https://aula-quiz.vercel.app/"
                alt="Código QR Aula!"
                className="w-24 h-24 object-contain select-none"
                loading="lazy"
              />
            </div>
            <div>
              <h3 className="font-black text-lg text-ink flex items-center gap-2">
                ¡Juega en tu celular! 📱
              </h3>
              <p className="text-sm font-bold text-ink/50 mt-1 leading-relaxed">
                Escanea el código QR con la cámara de tu teléfono para ingresar directamente a la sala de juego.
              </p>
            </div>
          </div>
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
            to="/docente/login"
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

      <footer className="px-6 md:px-12 py-6 font-bold text-xs tracking-widest uppercase text-ink/40 flex flex-col md:flex-row justify-between items-center gap-4 bg-white border-t border-mist/50">
        <div className="flex items-center gap-2">
          <span>Diseñado para enganchar</span>
          <span className="hidden md:inline text-mist">•</span>
          <span>Preguntas generadas por IA</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-75">
          <span>Una solución de</span>
          <span className="font-black text-orange-500 tracking-tight">EduMaster Pro</span>
        </div>
      </footer>
    </main>
  );
}
