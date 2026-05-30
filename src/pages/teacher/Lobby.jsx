import { useState, useEffect } from 'react';
import { iniciarSesion, setDuracion, cerrarSesion, obtenerClaves } from '../../services/sessionService.js';
import { useNavigate } from 'react-router-dom';
import WorksheetPrint from '../../components/WorksheetPrint.jsx';
import LanHostPanel from '../../components/LanHostPanel.jsx';
import { guardarSala, guardarContenidoSala } from '../../utils/savedRooms.js';
import { fusionarLista } from '../../utils/clave.js';

export default function Lobby({ pin, sesion }) {
  const navigate = useNavigate();
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [imprimir, setImprimir] = useState(false);
  // Claves (respuestas) para que la guía impresa muestre la clave correcta.
  const [claves, setClaves] = useState(null);
  useEffect(() => {
    obtenerClaves(pin).then(setClaves).catch(() => {});
  }, [pin]);

  function handleGuardarYSalir() {
    // La sala sigue viva en Firebase; solo guardamos un puntero para reabrirla.
    guardarSala(sesion.docente_uid, { pin, tema: sesion.tema });
    guardarContenidoSala(sesion.docente_uid, { 
      pin, 
      preguntas: fusionarLista(sesion.preguntas || [], claves), 
      tema: sesion.tema, 
      grado: sesion.grado, 
      dificultad: sesion.dificultad 
    }).catch(console.error);
    navigate('/docente');
  }
  const estudiantes = Object.entries(sesion.estudiantes || {});
  const duracion = sesion.pregunta_duracion ?? 30;

  const [timerMode, setTimerMode] = useState(() => {
    if (duracion === 0) return 'sin_limite';
    if (duracion >= 60 && duracion % 60 === 0) return 'minutos';
    return 'segundos';
  });

  const [timerValue, setTimerValue] = useState(() => {
    if (duracion === 0) return 30;
    if (duracion >= 60 && duracion % 60 === 0) return duracion / 60;
    return duracion;
  });

  // Mantener sincronizado el estado local si la sesión en Firebase cambia.
  useEffect(() => {
    if (duracion === 0) {
      setTimerMode('sin_limite');
    } else if (duracion >= 60 && duracion % 60 === 0) {
      setTimerMode('minutos');
      setTimerValue(duracion / 60);
    } else {
      setTimerMode('segundos');
      setTimerValue(duracion);
    }
  }, [duracion]);

  const handleModeChange = (mode) => {
    setTimerMode(mode);
    if (mode === 'sin_limite') {
      setDuracion(pin, 0);
    } else {
      const val = timerValue;
      const seconds = mode === 'minutos' ? val * 60 : val;
      setDuracion(pin, seconds);
    }
  };

  const handleValueChange = (val) => {
    if (val < 1) val = 1;
    setTimerValue(val);
    const seconds = timerMode === 'minutos' ? val * 60 : val;
    setDuracion(pin, seconds);
  };

  function handleCerrar() {
    setMostrarConfirm(true);
  }

  async function executeCerrar() {
    setConfirmando(true);
    try {
      await cerrarSesion(pin);
      setMostrarConfirm(false);
      navigate('/docente');
    } catch (e) {
      console.error(e);
      alert('Error al cerrar la sesión: ' + e.message);
    } finally {
      setConfirmando(false);
    }
  }

  if (imprimir) {
    return (
      <WorksheetPrint
        actividades={fusionarLista(sesion.preguntas || [], claves)}
        tema={sesion.tema || ''}
        grado={sesion.grado || ''}
        dificultad={sesion.dificultad || ''}
        onClose={() => setImprimir(false)}
      />
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-12 bg-gameBg flex flex-col">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="btn-ghost"
          >
            ⌂ Inicio
          </button>
          <div className="font-black text-xl italic tracking-tighter">
            Aula<span className="text-brandDanger">!</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setImprimir(true)} className="btn-ghost">🖨️ Imprimir guía</button>
          <button onClick={handleGuardarYSalir} className="btn-ghost text-brandPrimary hover:bg-brandPrimary/10">
            💾 Guardar y volver a Mi Panel
          </button>
          <button onClick={handleCerrar} className="btn-ghost text-deny hover:bg-deny/10">Cerrar sala</button>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_300px] gap-8">
        
        {/* Proyector PIN Central */}
        <section className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm p-8 text-center border-t-8 border-brandPrimary relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brandAccent/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <p className="font-bold text-ink/50 uppercase tracking-widest mb-4">
            Únete en <span className="text-ink">aula-b1e1b.web.app/jugar</span>
          </p>
          
          <div className="bg-gameBg px-12 py-6 rounded-3xl shadow-inner mb-8">
            <p className="font-bold text-ink/40 uppercase tracking-widest text-sm mb-2">PIN del Juego</p>
            <div className="font-black text-7xl md:text-9xl tracking-[0.1em] text-ink">
              {pin}
            </div>
          </div>

          {/* Red local (solo en el APK del docente): QR + código para entrar sin internet */}
          <LanHostPanel pin={pin} />

          {/* Selector de Límite de Tiempo Avanzado */}
          <div className="flex flex-col items-center gap-3 mb-8 bg-mist/20 p-4 rounded-2xl w-full max-w-md border border-mist/50">
            <span className="font-bold text-sm text-ink/60 uppercase tracking-widest text-center">
              Límite de tiempo por pregunta
            </span>
            
            <div className="flex w-full gap-2 p-1 bg-mist/40 rounded-xl">
              <button
                type="button"
                onClick={() => handleModeChange('segundos')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  timerMode === 'segundos'
                    ? 'bg-white text-brandPrimary shadow-sm'
                    : 'text-ink/60 hover:text-ink hover:bg-white/30'
                }`}
              >
                Segundos
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('minutos')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  timerMode === 'minutos'
                    ? 'bg-white text-brandPrimary shadow-sm'
                    : 'text-ink/60 hover:text-ink hover:bg-white/30'
                }`}
              >
                Minutos
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('sin_limite')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  timerMode === 'sin_limite'
                    ? 'bg-white text-brandPrimary shadow-sm'
                    : 'text-ink/60 hover:text-ink hover:bg-white/30'
                }`}
              >
                Sin límite
              </button>
            </div>

            {timerMode !== 'sin_limite' && (
              <div className="flex items-center gap-3 mt-2">
                <span className="font-bold text-sm text-ink/50">Duración:</span>
                <input
                  type="number"
                  min={timerMode === 'minutos' ? 1 : 5}
                  max={timerMode === 'minutos' ? 60 : 3600}
                  value={timerValue}
                  onChange={(e) => handleValueChange(Number(e.target.value))}
                  className="w-24 bg-white rounded-lg font-black text-xl py-2 text-center shadow-sm border border-mist focus:outline-none focus:border-brandPrimary"
                />
                <span className="font-bold text-sm text-ink/50">
                  {timerMode === 'minutos' ? 'min' : 'seg'}
                </span>
              </div>
            )}
            
            {timerMode === 'sin_limite' && (
              <p className="text-sm font-bold text-ink/40 mt-2 text-center">
                Las preguntas no tendrán tiempo límite. El docente avanza manualmente.
              </p>
            )}
          </div>

          <button
            onClick={() => iniciarSesion(pin)}
            disabled={estudiantes.length === 0}
            className="btn-primary text-xl px-12 py-6 bg-brandSuccess w-full max-w-sm"
          >
            ¡Empezar!
          </button>
        </section>

        {/* Panel lateral Estudiantes */}
        <section className="bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden border-t-8 border-brandDanger">
          <div className="p-6 border-b border-mist bg-mist/10 flex justify-between items-center">
            <h2 className="font-black text-xl">Jugadores</h2>
            <div className="bg-ink text-white font-black text-xl px-4 py-1 rounded-full">
              {estudiantes.length}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-wrap content-start gap-2">
            {estudiantes.length === 0 ? (
              <p className="text-ink/40 font-bold text-center w-full mt-10">Esperando jugadores...</p>
            ) : (
              estudiantes.map(([id, est], i) => (
                <div
                  key={id}
                  className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm animate-bounce-in flex items-center gap-2 ${
                    est.conectado ? 'bg-ink text-white' : 'bg-mist text-ink/50 line-through'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {est.nombre}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal de Confirmación Premium */}
      {mostrarConfirm && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center text-center animate-scale-in">
            <div className="w-16 h-16 bg-brandDanger/10 rounded-full flex items-center justify-center text-3xl mb-6">
              ⚠️
            </div>
            <h3 className="font-black text-2xl mb-3 text-ink">¿Cerrar y borrar sala?</h3>
            <p className="font-bold text-ink/50 text-sm mb-8 leading-relaxed">
              Los estudiantes conectados serán desconectados inmediatamente y la sala activa se eliminará.
            </p>
            
            {confirmando ? (
              <div className="flex flex-col items-center gap-3 py-2 w-full">
                <div className="w-8 h-8 border-4 border-brandDanger border-t-transparent rounded-full animate-spin" />
                <span className="font-bold text-sm text-brandDanger">Cerrando sala…</span>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setMostrarConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeCerrar}
                  className="flex-1 btn-primary bg-brandDanger hover:bg-brandDanger/90 py-3 text-white font-black"
                >
                  Sí, Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
