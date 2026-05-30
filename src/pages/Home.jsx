import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function Home() {
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <main className="relative min-h-screen flex flex-col bg-[#F8F9FA] overflow-hidden">
      {/* Fondo con patrón de puntos sutil para estilo moderno SaaS */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      {/* Encabezado con Co-Branding */}
      <header className="px-4 md:px-12 pt-6 md:pt-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
        <div className="flex items-center justify-center gap-3 md:gap-4 select-none w-full md:w-auto">
          <img 
            src="/logo.png" 
            alt="EduMaster Pro Logo" 
            className="h-12 md:h-20 w-auto object-contain transition-transform hover:scale-105 duration-200 mix-blend-multiply" 
          />
          <div className="h-8 md:h-10 w-[2px] bg-slate-300"></div>
          <div className="font-black text-2xl md:text-3xl tracking-tighter italic text-brandPrimary">
            Aula<span className="text-brandAccent">!</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 md:gap-4 w-full md:w-auto flex-wrap">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-mist shadow-sm font-bold text-xs uppercase hover:bg-gameBg transition-colors shrink-0"
          >
            🌍 {language === 'es' ? 'ES' : 'EN'}
          </button>
          <div className="font-bold text-[10px] tracking-[0.2em] uppercase text-brandSecondary bg-brandSecondary/10 border border-brandSecondary/20 px-3 py-1.5 rounded-full hidden md:block shadow-sm">
            v2.0 Gamificado
          </div>
          <Link
            to="/admin/login"
            className="font-bold text-xs md:text-sm px-4 md:px-5 py-2 md:py-2.5 rounded-xl border border-mist bg-white text-ink hover:bg-gameBg hover:text-brandPrimary hover:border-brandPrimary/30 transition-all shadow-sm shrink-0"
          >
            {t('home.admin')}
          </Link>
        </div>
      </header>

      {/* Cuerpo principal */}
      <section className="flex-1 grid md:grid-cols-2 gap-12 px-6 md:px-12 py-12 md:py-20 max-w-7xl mx-auto w-full items-center z-10 relative">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest mb-6 border border-brandAccent/20 shadow-sm text-brandAccent">
            <span className="w-2 h-2 rounded-full bg-brandAccent animate-pulse"></span>
            {t('home.learnPlaying')}
          </div>
          <h1 className="font-black text-6xl md:text-[5.5rem] leading-[1.05] tracking-tight mb-6 text-brandPrimary drop-shadow-sm">
            {t('home.play')}<br />
            {t('home.learn')}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brandAccent to-brandSecondary">{t('home.win')}</span>
          </h1>
          <p className="mt-6 max-w-lg text-xl leading-relaxed text-ink/80 font-medium">
            {t('home.description')}
          </p>

          {/* Tarjeta de Código QR para móviles */}
          <div className="mt-10 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 max-w-md hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https://aula-quiz.vercel.app/"
                alt="Código QR Aula!"
                className="w-20 h-20 md:w-24 md:h-24 object-contain select-none"
                loading="lazy"
              />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                {t('home.mobileTitle')}
              </h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">
                {t('home.mobileDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:pl-12 flex flex-col items-center md:items-end w-full animate-bounce-in" style={{ animationDelay: '100ms' }}>
          
          <Link
            to="/jugar"
            className="group block w-full max-w-md p-8 border-b-8 border-r-4 border-brandPrimary/50 rounded-[2.5rem] bg-brandPrimary text-white hover:-translate-y-2 transition-all shadow-[0_20px_40px_rgba(43,62,78,0.3)] hover:shadow-[0_20px_40px_rgba(43,62,78,0.5)] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
            <div className="font-black text-sm tracking-[0.3em] uppercase text-brandSecondary mb-3 relative z-10 drop-shadow-md">
              {t('home.studentMode')}
            </div>
            <div className="font-black text-4xl md:text-5xl relative z-10">
              {t('home.enterPin')}
            </div>
          </Link>

          <div className="flex items-center gap-4 w-full max-w-md justify-center py-4 opacity-60">
            <div className="h-[1px] bg-mist flex-1"></div>
            <span className="font-bold text-ink/50 text-[10px] uppercase tracking-[0.3em]">{t('home.orTeacher')}</span>
            <div className="h-[1px] bg-mist flex-1"></div>
          </div>

          <Link
            to="/docente/login"
            className="group block w-full max-w-md p-8 border-2 border-mist rounded-[2.5rem] bg-white text-brandPrimary hover:-translate-y-2 transition-all shadow-xl shadow-mist/50 hover:shadow-2xl hover:shadow-mist text-center hover:border-brandSecondary"
          >
            <div className="font-black text-sm tracking-[0.3em] uppercase text-ink/40 mb-3 group-hover:text-brandSecondary transition-colors">
              {t('home.teacherMode')}
            </div>
            <div className="font-black text-3xl md:text-4xl text-brandPrimary group-hover:text-brandPrimary transition-colors">
              {t('home.createGame')}
            </div>
          </Link>

        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 font-bold text-xs tracking-widest uppercase text-ink/40 flex flex-col md:flex-row justify-between items-center gap-6 bg-white border-t border-mist z-10 relative shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brandSecondary"></span> {t('home.footerDesign')}</span>
          <span className="hidden md:inline text-mist">|</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brandAccent"></span> {t('home.footerAI')}</span>
        </div>
        <div className="flex items-center gap-2 opacity-90 bg-gameBg px-4 py-2 rounded-full border border-mist">
          <span>{t('home.footerPowered')}</span>
          <span className="font-black text-brandAccent tracking-tight">EduMaster Pro</span>
        </div>
      </footer>
    </main>
  );
}
