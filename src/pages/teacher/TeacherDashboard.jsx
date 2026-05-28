import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { obtenerHistorialDocente, ESTADOS } from '../../services/sessionService.js';

export default function TeacherDashboard() {
  const { userData, logout, cambiarMiPassword } = useAuth();
  const navigate = useNavigate();

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [modalPassword, setModalPassword] = useState(false);

  useEffect(() => {
    obtenerHistorialDocente()
      .then(setHistorial)
      .catch(console.error)
      .finally(() => setCargandoHistorial(false));
  }, []);

  const sesionesFinalizadas = historial.filter(s => s.estado_actual === ESTADOS.RESULTADOS_FINALES).length;
  const sesionesActivas = historial.filter(s => s.estado_actual !== ESTADOS.RESULTADOS_FINALES).length;

  return (
    <main className="min-h-screen bg-gameBg">
      {/* Header */}
      <header className="bg-white border-b border-mist px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-black text-2xl italic tracking-tighter">
            Aula<span className="text-kahootBlue">!</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setModalPassword(true)}
            className="hidden md:inline font-bold text-sm text-ink/50 hover:text-ink transition-colors"
          >
            {userData?.nombre}
          </button>
          <button
            onClick={logout}
            className="font-bold text-sm tracking-widest uppercase text-deny hover:text-deny/70 transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 md:px-12 py-10">
        {/* Bienvenida */}
        <div className="mb-10">
          <h1 className="font-black text-3xl md:text-4xl leading-tight">
            Hola, {userData?.nombre?.split(' ')[0] ?? 'Docente'}
          </h1>
          <p className="font-bold text-ink/50 mt-1">¿Qué hacemos hoy?</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <StatCard label="Total Sesiones" value={historial.length} />
          <StatCard label="Finalizadas" value={sesionesFinalizadas} color="text-kahootGreen" />
          <StatCard label="Activas" value={sesionesActivas} color="text-kahootBlue" />
        </div>

        {/* Acción principal */}
        <button
          onClick={() => navigate('/docente/nueva')}
          className="w-full p-8 mb-10 bg-kahootBlue text-white rounded-3xl border-b-8 border-kahootBlue/30 hover:-translate-y-1 transition-all shadow-lg text-left group"
        >
          <div className="font-bold text-sm tracking-widest uppercase opacity-70 mb-1">
            Nueva evaluación
          </div>
          <div className="font-black text-3xl md:text-4xl">
            Crear Juego con IA
          </div>
        </button>

        {/* Historial de sesiones */}
        <div className="bg-white rounded-3xl shadow-sm border border-mist/50 overflow-hidden">
          <div className="px-8 py-6 border-b border-mist flex items-center justify-between">
            <h2 className="font-black text-xl">Sesiones recientes</h2>
          </div>

          {cargandoHistorial ? (
            <div className="py-12 text-center font-bold text-ink/40 animate-pulse">
              Cargando…
            </div>
          ) : historial.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-black text-lg text-ink/30 mb-1">Sin sesiones aún</p>
              <p className="font-bold text-sm text-ink/40">Crea tu primera evaluación con el botón de arriba.</p>
            </div>
          ) : (
            <div className="divide-y divide-mist/50">
              {historial.map((s) => (
                <SesionFila
                  key={s.pin}
                  sesion={s}
                  onClick={() => navigate(`/docente/sesion/${s.pin}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Cambiar mi contraseña */}
      {modalPassword && (
        <ModalMiPassword
          onClose={() => setModalPassword(false)}
          cambiarMiPassword={cambiarMiPassword}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Fila de sesión
// ---------------------------------------------------------------------------
function SesionFila({ sesion, onClick }) {
  const finalizada = sesion.estado_actual === ESTADOS.RESULTADOS_FINALES;
  const nEstudiantes = Object.keys(sesion.estudiantes || {}).length;
  const fecha = sesion.creada_en ? new Date(sesion.creada_en).toLocaleDateString('es', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : '—';

  return (
    <button
      onClick={onClick}
      className="w-full px-8 py-5 flex items-center justify-between gap-4 hover:bg-gameBg/50 transition-colors text-left"
    >
      <div className="flex items-center gap-5 min-w-0">
        <span className="font-black text-2xl text-kahootBlue tracking-wider shrink-0">
          {sesion.pin}
        </span>
        <div className="min-w-0">
          <div className="font-bold text-sm text-ink truncate">
            {sesion.preguntas?.length ?? 0} preguntas · {nEstudiantes} estudiante{nEstudiantes !== 1 ? 's' : ''}
          </div>
          <div className="font-bold text-xs text-ink/40">{fecha}</div>
        </div>
      </div>
      <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
        finalizada
          ? 'bg-kahootGreen/10 text-kahootGreen'
          : 'bg-kahootYellow/20 text-ink'
      }`}>
        {finalizada ? 'Finalizado' : 'Activo'}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal: Cambiar mi propia contraseña
// ---------------------------------------------------------------------------
function ModalMiPassword({ onClose, cambiarMiPassword }) {
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirmar) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      await cambiarMiPassword(password);
      setExito('Contraseña actualizada correctamente.');
      setTimeout(onClose, 1500);
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setError('Por seguridad, cierra sesión, vuelve a ingresar y luego cambia tu contraseña.');
      } else {
        setError(err.message || 'Error al cambiar la contraseña.');
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-black text-2xl mb-6">Cambiar mi contraseña</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Campo label="Nueva contraseña">
            <div className="relative">
              <input
                type={verPass ? 'text' : 'password'}
                className="field pr-12"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={cargando}
                autoFocus
                required
              />
              <button type="button" onClick={() => setVerPass(!verPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-sm font-bold">
                {verPass ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </Campo>
          <Campo label="Confirmar contraseña">
            <input
              type={verPass ? 'text' : 'password'}
              className="field"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              disabled={cargando}
              required
            />
          </Campo>
          {error && <p className="text-deny font-bold text-sm">{error}</p>}
          {exito && <p className="text-kahootGreen font-bold text-sm">{exito}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              className="flex-1 btn-primary bg-ink py-3">
              {cargando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-ink' }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-mist/50">
      <div className={`font-black text-4xl ${color}`}>{value}</div>
      <div className="font-bold text-xs tracking-widest uppercase text-ink/40 mt-1">{label}</div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}
