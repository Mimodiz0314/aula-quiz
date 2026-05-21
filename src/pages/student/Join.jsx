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
    if (!/^\d{5}$/.test(pin)) return setError('Debe tener exactamente 5 dígitos.');
    setCargando(true);
    try {
      const r = await validarPin(pin);
      if (!r.ok) {
        setError(
          r.reason === 'no_existe'
            ? 'No existe una sesión con ese código.'
            : 'Esa sesión ya terminó.'
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
    if (!grado.trim()) return setError('Indica tu grado.');
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
      // Re-registra (la función detecta nombre coincidente y reutiliza ID).
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
    <main className="min-h-screen flex flex-col p-6">
      <header className="flex justify-between items-baseline mb-12">
        <div className="font-display text-xl">Aula<span className="text-ink/40">.</span></div>
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
          Estudiante
        </div>
      </header>

      <section className="flex-1 flex items-center">
        <div className="w-full max-w-md mx-auto">
          {reconectable && paso === 'pin' && (
            <div className="mb-10 p-5 rounded-2xl border border-ink/15 bg-mist/40">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
                Sesión anterior detectada
              </p>
              <p className="font-display text-2xl mt-2">
                {reconectable.nombre} · PIN {reconectable.pin}
              </p>
              <button
                onClick={handleReconectar}
                disabled={cargando}
                className="btn-primary mt-4"
              >
                Reconectar →
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(`quiz_student_${reconectable.pin}`);
                  sessionStorage.removeItem('last_pin');
                  setReconectable(null);
                }}
                className="ml-2 text-xs text-ink/50 underline"
              >
                Ignorar
              </button>
            </div>
          )}

          {paso === 'pin' ? (
            <>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
                Paso 01 — Código
              </p>
              <h1 className="font-display text-5xl md:text-6xl mt-2 leading-none">
                Ingresa el PIN
              </h1>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                className="field mt-8 text-center tracking-[0.4em] tabular-nums"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="•••••"
                autoFocus
              />
              {error && (
                <p className="text-deny text-sm mt-3 border-l-2 border-deny pl-3">{error}</p>
              )}
              <button
                onClick={handleValidarPin}
                disabled={cargando || pin.length !== 5}
                className="btn-primary mt-10 w-full"
              >
                {cargando ? 'Verificando…' : 'Continuar →'}
              </button>
            </>
          ) : (
            <>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
                Paso 02 — Tus datos
              </p>
              <h1 className="font-display text-5xl md:text-6xl mt-2 leading-none">
                ¿Quién eres?
              </h1>

              <div className="mt-10 space-y-8">
                <div>
                  <label className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
                    Nombre
                  </label>
                  <input
                    className="field"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre y apellido"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/60">
                    Grado
                  </label>
                  <input
                    className="field"
                    value={grado}
                    onChange={(e) => setGrado(e.target.value)}
                    placeholder="Ej. 9°B"
                  />
                </div>
              </div>

              {error && (
                <p className="text-deny text-sm mt-6 border-l-2 border-deny pl-3">{error}</p>
              )}

              <div className="mt-10 flex gap-3">
                <button onClick={() => setPaso('pin')} className="btn-ghost">
                  ← Atrás
                </button>
                <button
                  onClick={handleEntrar}
                  disabled={cargando}
                  className="btn-primary flex-1"
                >
                  {cargando ? 'Uniéndome…' : 'Unirme →'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
