import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registrarEstudiante, validarPin } from '../../services/sessionService.js';

export default function Join({ onJoined, pinInicial }) {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [nombre, setNombre] = useState('');
  const [grado, setGrado] = useState('');
  const [paso, setPaso] = useState('pin'); // pin | datos
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Si venimos por red local (?lan=), el PIN ya está dado: lo prefijamos y
  // saltamos directo a pedir nombre y curso.
  useEffect(() => {
    if (pinInicial) {
      setPin(String(pinInicial));
      setPaso('datos');
    }
  }, [pinInicial]);

  // Si hay sesión previa, mostrar opción de reconectar
  const [reconectable, setReconectable] = useState(null);
  useEffect(() => {
    const lastPin = sessionStorage.getItem('last_pin');
    if (lastPin) {
      const data = localStorage.getItem(`quiz_student_${lastPin}`);
      if (data) {
        const parsed = JSON.parse(data);
        setReconectable({ pin: lastPin, ...parsed });
      }
    }
  }, []);

  async function handleValidarPin() {
    setError(null);
    if (!/^\d{5,6}$/.test(pin)) return setError('El PIN debe tener 5 o 6 números.');
    setCargando(true);
    try {
      const r = await validarPin(pin);
      if (!r.ok) {
        setError(
          r.reason === 'no_existe'
            ? 'No encontramos ese juego.'
            : 'El juego ya terminó.'
        );
        return;
      }
      setPaso('datos');
    } finally {
      setCargando(false);
    }
  }

  async function handleEntrar() {
    setError(null);
    if (!nombre.trim()) return setError('Escribe tu nombre.');
    if (!grado.trim()) return setError('Indica tu curso/grado.');
    setCargando(true);
    try {
      const studentId = await registrarEstudiante(pin, nombre.trim(), grado.trim());
      onJoined({ pin, studentId });
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleReconectar() {
    if (!reconectable) return;
    setCargando(true);
    try {
      const r = await validarPin(reconectable.pin);
      if (!r.ok) {
        localStorage.removeItem(`quiz_student_${reconectable.pin}`);
        sessionStorage.removeItem('last_pin');
        setReconectable(null);
        setError('La sesión anterior ya no existe.');
        return;
      }
      const studentId = await registrarEstudiante(
        reconectable.pin,
        reconectable.nombre,
        reconectable.grado
      );
      onJoined({ pin: reconectable.pin, studentId });
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#F4F7FE]">
      {/* Fondo atractivo y vibrante para adolescentes/niños: Formas orgánicas y coloridas animadas */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-gradient-to-br from-brandSecondary/40 to-cyan-300/40 rounded-full blur-[80px] animate-pulse-soft"></div>
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] bg-gradient-to-br from-brandPrimary/30 to-purple-400/30 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] bg-gradient-to-tr from-brandAccent/30 to-yellow-300/30 rounded-full blur-[90px] animate-pulse-soft" style={{animationDelay: '1s'}}></div>
      </div>
      
      <header className="mb-8 flex flex-col items-center text-center relative">
        {/* El truco mágico: mix-blend-multiply elimina el fondo blanco de la imagen y hace que se fusione perfectamente con el fondo de la pantalla, dando la ilusión de un PNG transparente */}
        <img 
          src="/logo.png" 
          alt="EduMaster Pro" 
          className="h-32 md:h-40 w-auto object-contain mb-2"
          style={{ mixBlendMode: 'multiply' }}
        />
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-ink drop-shadow-sm">
          EduMaster <span className="text-transparent bg-clip-text bg-gradient-to-r from-brandPrimary to-brandSecondary italic">Aula</span>
        </h1>
      </header>

      <section className="w-full max-w-sm z-10 animate-bounce-in">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white p-8 md:p-10 relative overflow-hidden">
          
          {reconectable && paso === 'pin' && (
            <div className="mb-8 bg-white/60 border border-white p-6 rounded-3xl text-center shadow-inner">
              <p className="text-xs font-black tracking-widest text-ink/40 uppercase mb-3">Sesión anterior</p>
              <p className="font-black text-3xl text-ink leading-none">{reconectable.nombre}</p>
              <p className="text-brandPrimary font-black text-xl mt-3 mb-6">PIN: {reconectable.pin}</p>
              
              <button 
                onClick={handleReconectar} 
                disabled={cargando} 
                className="w-full py-4 rounded-2xl bg-brandPrimary text-white font-black text-xl shadow-[0_8px_0_0_#481d99] hover:translate-y-1 hover:shadow-[0_4px_0_0_#481d99] active:translate-y-2 active:shadow-none transition-all"
              >
                Reconectar
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(`quiz_student_${reconectable.pin}`);
                  sessionStorage.removeItem('last_pin');
                  setReconectable(null);
                }}
                className="mt-6 text-sm font-bold text-ink/40 hover:text-ink/80 transition-colors block w-full text-center uppercase tracking-widest"
              >
                Descartar y entrar a otro
              </button>
            </div>
          )}

          {paso === 'pin' ? (
            <div className="flex flex-col gap-6">
              <div className="text-center mb-2">
                <div className="inline-block bg-brandAccent/20 text-brandAccent px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest mb-4 border border-brandAccent/30 shadow-sm">
                  ¡Hora de jugar!
                </div>
                <h2 className="font-black text-3xl text-ink">Ingresa el PIN</h2>
              </div>
              
              <div className="relative">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="w-full bg-white border-4 border-mist focus:border-brandPrimary rounded-3xl font-black text-5xl py-6 px-6 outline-none transition-all text-center tracking-[0.3em] shadow-[0_6px_0_0_#E6E2D8] focus:shadow-[0_6px_0_0_#6A2BDE] text-ink placeholder:text-ink/20 placeholder:tracking-normal placeholder:text-2xl"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="PIN"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-brandDanger font-black text-sm text-center bg-brandDanger/10 border-2 border-brandDanger/20 py-3 rounded-2xl animate-fade-in mt-1">{error}</p>
              )}
              
              <button
                onClick={handleValidarPin}
                disabled={cargando || pin.length < 5}
                className="mt-4 w-full py-5 rounded-3xl bg-ink text-white font-black text-2xl shadow-[0_8px_0_0_#1a1a1a] hover:translate-y-1 hover:shadow-[0_4px_0_0_#1a1a1a] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-[0_8px_0_0_#1a1a1a] disabled:cursor-not-allowed"
              >
                {cargando ? 'Buscando...' : 'Entrar'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="text-center mb-2">
                <div className="inline-block bg-brandPrimary/10 text-brandPrimary px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest mb-4 border border-brandPrimary/20 shadow-sm">
                  Ya casi
                </div>
                <h2 className="font-black text-3xl text-ink leading-tight">¿Cómo te llamas?</h2>
              </div>
              
              <div className="space-y-5">
                <input
                  className="w-full bg-white border-4 border-mist focus:border-brandSecondary rounded-2xl font-black text-2xl py-4 px-6 outline-none transition-all text-center placeholder:text-ink/30 shadow-[0_4px_0_0_#E6E2D8] focus:shadow-[0_4px_0_0_#00C2A8]"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu Nombre o Apodo"
                  autoFocus
                />
                <input
                  className="w-full bg-white border-4 border-mist focus:border-brandSecondary rounded-2xl font-black text-2xl py-4 px-6 outline-none transition-all text-center placeholder:text-ink/30 shadow-[0_4px_0_0_#E6E2D8] focus:shadow-[0_4px_0_0_#00C2A8]"
                  value={grado}
                  onChange={(e) => setGrado(e.target.value)}
                  placeholder="Curso (Ej: 9A)"
                />
              </div>
              
              {error && (
                <p className="text-brandDanger font-black text-sm text-center bg-brandDanger/10 border-2 border-brandDanger/20 py-3 rounded-2xl animate-fade-in mt-1">{error}</p>
              )}
              
              <button
                onClick={handleEntrar}
                disabled={cargando}
                className="mt-4 w-full py-5 rounded-3xl bg-brandSecondary text-white font-black text-2xl shadow-[0_8px_0_0_#008A77] hover:translate-y-1 hover:shadow-[0_4px_0_0_#008A77] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-[0_8px_0_0_#008A77] disabled:cursor-not-allowed"
              >
                {cargando ? 'Conectando...' : '¡A Jugar!'}
              </button>
              
              <button onClick={() => setPaso('pin')} className="text-ink/40 hover:text-ink/80 font-black text-sm transition-colors text-center mt-3 uppercase tracking-widest">
                ← Volver al PIN
              </button>
            </div>
          )}
        </div>
        
        <div className="text-center mt-8">
          <button 
            onClick={() => navigate('/')} 
            className="inline-flex items-center justify-center gap-2 font-black text-sm text-ink/70 bg-white/80 backdrop-blur-sm border-2 border-mist/80 px-6 py-3 rounded-2xl shadow-[0_4px_0_0_#E6E2D8] hover:bg-white hover:text-ink hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#E6E2D8] active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
          >
            ← Volver a Inicio
          </button>
        </div>
      </section>
    </main>
  );
}
