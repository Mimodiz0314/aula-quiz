import { useEffect, useState } from 'react';
import { registrarEstudiante, validarPin } from '../../services/sessionService.js';

export default function Join({ onJoined }) {
  const [pin, setPin] = useState('');
  const [nombre, setNombre] = useState('');
  const [grado, setGrado] = useState('');
  const [paso, setPaso] = useState('pin'); // pin | datos
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

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
    if (!/^\d{5}$/.test(pin)) return setError('El PIN debe tener 5 números.');
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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gameBg bg-[#46178f]">
      {/* Estilo de fondo morado clásico Kahoot para pantallas de entrada */}
      <style>{`
        body { background-color: #46178f; }
        .bg-gameBg { background-color: #46178f; }
      `}</style>

      <header className="mb-6 flex flex-col items-center text-center text-white">
        <div className="bg-white p-4 rounded-3xl shadow-xl mb-4 border-b-4 border-mist/60 animate-pulse-soft">
          <img 
            src="/logo.png" 
            alt="EduMaster Pro" 
            className="h-16 md:h-20 w-auto object-contain"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter drop-shadow-sm">
          Aula<span className="text-kahootYellow">!</span>
        </h1>
      </header>

      <section className="w-full max-w-sm animate-bounce-in">
        <div className="game-card p-8">
          {reconectable && paso === 'pin' && (
            <div className="mb-6 bg-mist/30 p-4 rounded-xl text-center">
              <p className="text-sm font-bold text-ink/60 uppercase">Sesión anterior</p>
              <p className="font-bold text-xl mt-1">{reconectable.nombre}</p>
              <p className="text-ink/60 font-bold mb-4">PIN {reconectable.pin}</p>
              
              <button onClick={handleReconectar} disabled={cargando} className="btn-primary w-full">
                Reconectar
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(`quiz_student_${reconectable.pin}`);
                  sessionStorage.removeItem('last_pin');
                  setReconectable(null);
                }}
                className="mt-3 text-sm font-bold text-ink/50 underline block w-full text-center"
              >
                Ignorar
              </button>
            </div>
          )}

          {paso === 'pin' ? (
            <div className="flex flex-col gap-4">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                className="field font-black"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="PIN del Juego"
                autoFocus
              />
              {error && (
                <p className="text-deny font-bold text-center bg-deny/10 py-2 rounded">{error}</p>
              )}
              <button
                onClick={handleValidarPin}
                disabled={cargando || pin.length !== 5}
                className="btn-primary w-full bg-ink"
              >
                {cargando ? 'Buscando...' : 'Ingresar'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <input
                className="field"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu Nombre"
                autoFocus
              />
              <input
                className="field"
                value={grado}
                onChange={(e) => setGrado(e.target.value)}
                placeholder="Curso (Ej: 9A)"
              />
              {error && (
                <p className="text-deny font-bold text-center bg-deny/10 py-2 rounded">{error}</p>
              )}
              <button
                onClick={handleEntrar}
                disabled={cargando}
                className="btn-primary w-full bg-ink"
              >
                {cargando ? 'Entrando...' : '¡Listo, vamos!'}
              </button>
              <button onClick={() => setPaso('pin')} className="text-ink/50 font-bold text-sm underline text-center mt-2">
                Cambiar PIN
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
