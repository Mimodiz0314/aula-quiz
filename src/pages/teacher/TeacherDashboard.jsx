import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { obtenerHistorialDocente, eliminarHistorial, crearSesion, obtenerSesion, obtenerClaves, eliminarSesion } from '../../services/sessionService.js';
import { fusionarLista } from '../../utils/clave.js';
import { listarSalasGuardadas, quitarSala, reemplazarSalas, obtenerContenidoSala } from '../../utils/savedRooms.js';
import { isOfflineEnabled } from '../../services/featureFlag.js';
import { isOnline } from '../../services/connectivity.js';
import WorksheetPrint from '../../components/WorksheetPrint.jsx';
import StudentPreview from '../../components/StudentPreview.jsx';
import { exportToWord } from '../../utils/exportWorksheet.js';

export default function TeacherDashboard() {
  const { user, userData, logout, cambiarMiPassword } = useAuth();
  const navigate = useNavigate();

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [salasActivas, setSalasActivas] = useState([]);
  const [preview, setPreview] = useState(null);   // sesión a previsualizar (vista estudiante)
  const [imprimir, setImprimir] = useState(null);  // sesión a imprimir (guía PDF)
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(null); // sala activa a borrar
  const [modalPassword, setModalPassword] = useState(false);
  const [sesionDetalle, setSesionDetalle] = useState(null); // sesión seleccionada para ver notas
  const [reutilizando, setReutilizando] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);
  const [modalDescargar, setModalDescargar] = useState(null); // sesión seleccionada para descargar
  const [filtroGrado, setFiltroGrado] = useState(''); // Filtro por grado/nivel historial
  const [filtroGradoActivas, setFiltroGradoActivas] = useState(''); // Filtro para salas activas

  useEffect(() => {
    obtenerHistorialDocente()
      .then(setHistorial)
      .catch(console.error)
      .finally(() => setCargandoHistorial(false));
  }, []);

  // Carga las salas guardadas (puntero local) y descarta las que ya no existen.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let activo = true;
    (async () => {
      const guardadas = listarSalasGuardadas(uid);
      const verificadas = [];
      for (const sala of guardadas) {
        let s = null;
        try { s = await obtenerSesion(sala.pin); } catch { /* ignore */ }
        
        if (!s && isOfflineEnabled() && !isOnline()) {
          s = await obtenerContenidoSala(uid, sala.pin);
        }

        if (s) {
          verificadas.push({ 
            pin: sala.pin, 
            tema: s.tema || sala.tema || '', 
            estado: s.estado_actual || 'Guardada local', 
            grado: s.grado || '', 
            dificultad: s.dificultad || '' 
          });
        }
      }
      if (!activo) return;
      // Auto-limpieza: solo podamos cuando estamos seguros (online o modo
      // offline desactivado). Estando offline, una sala de nube no se puede
      // verificar y NO debemos borrar su puntero: se mostrará al reconectar.
      const puedePodar = !isOfflineEnabled() || isOnline();
      if (puedePodar) {
        reemplazarSalas(uid, verificadas.map(v => ({ pin: v.pin, tema: v.tema, guardada_en: Date.now() })));
      }
      setSalasActivas(verificadas);
    })();
    return () => { activo = false; };
  }, [user?.uid]);

  const historialFiltrado = useMemo(() => {
    if (!filtroGrado) return historial;
    return historial.filter(h => h.grado?.trim() === filtroGrado);
  }, [historial, filtroGrado]);

  const salasActivasFiltradas = useMemo(() => {
    if (!filtroGradoActivas) return salasActivas;
    return salasActivas.filter(s => s.grado?.trim() === filtroGradoActivas);
  }, [salasActivas, filtroGradoActivas]);

  function quitarDeActivas(pin) {
    quitarSala(user?.uid, pin);
    setSalasActivas(prev => prev.filter(s => s.pin !== pin));
  }

  // Carga la sala completa (preguntas fusionadas con su clave) para previsualizar,
  // imprimir, editar o reutilizar una SALA ACTIVA.
  async function cargarSalaCompleta(pin) {
    let s = null;
    try { s = await obtenerSesion(pin); } catch {}

    if (!s && isOfflineEnabled() && !isOnline()) {
      const offline = await obtenerContenidoSala(user?.uid, pin);
      if (offline) {
        return {
          pin,
          preguntas: offline.preguntas || [],
          tema: offline.tema || '',
          grado: offline.grado || '',
          dificultad: offline.dificultad || '',
        };
      }
    }

    if (!s) { 
      alert('Esta sala ya no existe.'); 
      setSalasActivas(prev => prev.filter(x => x.pin !== pin)); 
      return null; 
    }

    let claves = null;
    try { claves = await obtenerClaves(pin); } catch {}

    return {
      pin,
      preguntas: fusionarLista(s.preguntas || [], claves),
      tema: s.tema || '',
      grado: s.grado || '',
      dificultad: s.dificultad || '',
    };
  }

  async function previewSala(pin) {
    const full = await cargarSalaCompleta(pin);
    if (full) setPreview(full);
  }
  async function downloadSala(pin) {
    const full = await cargarSalaCompleta(pin);
    if (full) setModalDescargar(full);
  }
  async function editSala(pin) {
    const full = await cargarSalaCompleta(pin);
    if (full) navigate('/docente/nueva', {
      state: { actividades: full.preguntas, tema: full.tema, grado: full.grado, dificultad: full.dificultad }
    });
  }
  async function reuseSala(pin) {
    setReutilizando(true);
    try {
      const full = await cargarSalaCompleta(pin);
      if (!full) return;
      const newPin = await crearSesion(full.preguntas, full.tema, { grado: full.grado, dificultad: full.dificultad });
      navigate(`/docente/sesion/${newPin}`);
    } catch (e) {
      console.error(e);
      alert('Error al reutilizar la sala: ' + e.message);
    } finally {
      setReutilizando(false);
    }
  }
  async function executeDeleteRoom(pin) {
    try {
      await eliminarSesion(pin);
      quitarSala(user?.uid, pin);
      setSalasActivas(prev => prev.filter(s => s.pin !== pin));
    } catch (e) {
      console.error(e);
      alert('Error al borrar la sala: ' + e.message);
    } finally {
      setConfirmDeleteRoom(null);
    }
  }

  function handleEliminar(key) {
    setConfirmDeleteKey(key);
  }

  async function executeEliminar(key) {
    try {
      await eliminarHistorial(key);
      setHistorial(prev => prev.filter(s => s.key !== key));
      if (sesionDetalle?.key === key) {
        setSesionDetalle(null);
      }
    } catch (e) {
      console.error(e);
      alert('Error al eliminar: ' + e.message);
    } finally {
      setConfirmDeleteKey(null);
    }
  }

  function handleEdit(sesion) {
    navigate('/docente/nueva', {
      state: {
        actividades: sesion.preguntas || [],
        tema: sesion.tema || '',
        grado: sesion.grado || '',
        dificultad: sesion.dificultad || ''
      }
    });
  }

  async function handleReuse(sesion) {
    setReutilizando(true);
    try {
      const newPin = await crearSesion(sesion.preguntas || [], sesion.tema || '', {
        grado: sesion.grado || '',
        dificultad: sesion.dificultad || ''
      });
      navigate(`/docente/sesion/${newPin}`);
    } catch (e) {
      console.error(e);
      alert('Error al reutilizar la sesión: ' + e.message);
    } finally {
      setReutilizando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gameBg">
      {/* Header */}
      <header className="bg-white border-b border-mist px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-black text-2xl italic tracking-tighter">
            Aula<span className="text-brandPrimary">!</span>
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
          <StatCard
            label="Promedio general"
            value={historial.length > 0
              ? (historial.reduce((s, h) => s + (h.promedio_grupo || 0), 0) / historial.length).toFixed(1)
              : '—'}
            color="text-brandSuccess"
          />
          <StatCard
            label="Estudiantes evaluados"
            value={historial.reduce((s, h) => s + (h.total_estudiantes || 0), 0)}
            color="text-brandPrimary"
          />
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <button
            onClick={() => navigate('/docente/nueva')}
            className="w-full p-6 md:p-8 bg-brandPrimary text-white rounded-3xl border-b-8 border-brandPrimary/30 hover:-translate-y-1 transition-all shadow-lg text-left group"
          >
            <div className="font-bold text-sm tracking-widest uppercase opacity-70 mb-1">
              Nueva evaluación
            </div>
            <div className="font-black text-2xl md:text-3xl">
              Crear Juego
            </div>
          </button>

          <button
            onClick={() => navigate('/docente/banco')}
            className="w-full p-6 md:p-8 bg-brandSecondary text-white rounded-3xl border-b-8 border-brandSecondary/30 hover:-translate-y-1 transition-all shadow-lg text-left group"
          >
            <div className="font-bold text-sm tracking-widest uppercase opacity-70 mb-1">
              Comunidad
            </div>
            <div className="font-black text-2xl md:text-3xl">
              Banco de Actividades
            </div>
          </button>

          <button
            onClick={() => navigate('/docente/foro')}
            className="w-full p-6 md:p-8 bg-brandAccent text-white rounded-3xl border-b-8 border-brandAccent/30 hover:-translate-y-1 transition-all shadow-lg text-left group"
          >
            <div className="font-bold text-sm tracking-widest uppercase opacity-70 mb-1">
              Discusión
            </div>
            <div className="font-black text-2xl md:text-3xl">
              Foro Docente
            </div>
          </button>
        </div>

        {/* Salas activas */}
        <div className="bg-white rounded-3xl shadow-sm border border-mist/50 overflow-hidden relative mb-10">
          <div className="px-8 py-6 border-b border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-xl">Salas activas</h2>
              <span className="text-sm font-bold text-ink/40">{salasActivas.length} guardadas</span>
            </div>
            {salasActivas.length > 0 && (
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  className="field py-2 px-4 rounded-xl bg-gameBg border-none text-sm font-bold flex-1 sm:flex-none text-ink/70 focus:text-ink transition-colors"
                  value={filtroGradoActivas}
                  onChange={e => setFiltroGradoActivas(e.target.value)}
                >
                  <option value="">Todos los grados/grupos</option>
                  {[...new Set(salasActivas.map(s => s.grado?.trim()).filter(Boolean))].sort().map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {salasActivasFiltradas.length === 0 ? (
            <div className="py-12 text-center text-ink/40 font-bold">
              {salasActivas.length > 0 ? 'No hay salas activas que coincidan con el filtro.' : 'No tienes salas activas en este momento.'}
            </div>
          ) : (
            <div className="divide-y divide-mist/50">
              {salasActivasFiltradas.map((s) => (
                <div key={s.pin} className="px-8 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5 min-w-0">
                    <span className="font-black text-2xl text-brandPrimary tracking-wider shrink-0">{s.pin}</span>
                    <div className="min-w-0">
                      {s.tema && <div className="font-black text-base text-ink truncate">{s.tema}</div>}
                      <div className="font-bold text-xs text-ink/40 capitalize mb-1">
                        {(s.estado || '').replace(/_/g, ' ') || 'Guardada'}
                      </div>
                      <MetaBadges grado={s.grado} dificultad={s.dificultad} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => navigate(`/docente/sesion/${s.pin}`)}
                      className="btn-primary bg-brandSuccess text-white"
                    >
                      Abrir sala
                    </button>
                    <button onClick={() => previewSala(s.pin)} title="Vista previa" className="p-2 text-ink/60 hover:bg-ink/10 rounded-xl transition-all">👁️</button>
                    <button onClick={() => downloadSala(s.pin)} title="Descargar" className="p-2 text-ink/60 hover:bg-ink/10 rounded-xl transition-all">⬇️</button>
                    <button onClick={() => editSala(s.pin)} title="Editar cuestionario" className="p-2 text-brandPrimary hover:bg-brandPrimary/10 rounded-xl transition-all">✏️</button>
                    <button onClick={() => reuseSala(s.pin)} title="Reutilizar (crear sala nueva)" className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all">🔄</button>
                    <button onClick={() => setConfirmDeleteRoom(s.pin)} title="Borrar sala" className="p-2 text-deny hover:bg-deny/10 rounded-xl transition-all">🗑️</button>
                    <button onClick={() => quitarDeActivas(s.pin)} title="Quitar de la lista (no borra la sala)" className="p-2 text-ink/30 hover:text-ink/60 rounded-xl transition-all">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progreso por grado */}
        {historial.length > 0 && <ProgresoPorGrado historial={historial} />}

        {/* Historial de sesiones */}
        <div className="bg-white rounded-3xl shadow-sm border border-mist/50 overflow-hidden">
          <div className="px-8 py-6 border-b border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-xl">Sesiones anteriores</h2>
              <span className="text-sm font-bold text-ink/40">{historial.length} registros</span>
            </div>
            
            {/* Filtros */}
            {historial.length > 0 && (
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  className="field py-2 px-4 rounded-xl bg-gameBg border-none text-sm font-bold flex-1 sm:flex-none text-ink/70 focus:text-ink transition-colors"
                  value={filtroGrado}
                  onChange={e => setFiltroGrado(e.target.value)}
                >
                  <option value="">Todos los grados/grupos</option>
                  {[...new Set(historial.map(h => h.grado?.trim()).filter(Boolean))].sort().map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {cargandoHistorial ? (
            <div className="py-12 text-center font-bold text-ink/40 animate-pulse">
              Cargando…
            </div>
          ) : historialFiltrado.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-black text-lg text-ink/30 mb-1">
                {historial.length > 0 ? 'No hay sesiones que coincidan con el filtro' : 'Sin sesiones aún'}
              </p>
              {historial.length === 0 && (
                <p className="font-bold text-sm text-ink/40">Crea tu primera evaluación con el botón de arriba.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-mist/50">
              {historialFiltrado.map((s) => (
                  <SesionFila
                    key={s.key}
                    sesion={s}
                    onClick={() => setSesionDetalle(s)}
                    onDelete={handleEliminar}
                    onEdit={handleEdit}
                    onReuse={handleReuse}
                    onPreview={() => setPreview(s)}
                    onDownload={() => setModalDescargar(s)}
                  />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: ver notas de una sesión */}
      {sesionDetalle && (
        <ModalNotas
          sesion={sesionDetalle}
          onClose={() => setSesionDetalle(null)}
          onDelete={handleEliminar}
          onPreview={() => { setPreview(sesionDetalle); setSesionDetalle(null); }}
          onDownload={() => { setModalDescargar(sesionDetalle); setSesionDetalle(null); }}
        />
      )}

      {/* Vista previa (como la ve el estudiante) */}
      {preview && (
        <StudentPreview
          actividades={preview.preguntas || []}
          tema={preview.tema || ''}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Modal: Descargar Actividad */}
      {modalDescargar && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setModalDescargar(null)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-brandPrimary/10 rounded-full flex items-center justify-center text-3xl mb-4">⬇️</div>
            <h3 className="font-black text-2xl mb-1 text-ink">Descargar</h3>
            <p className="font-bold text-ink/50 text-sm mb-6 leading-relaxed">
              Selecciona el formato en el que deseas descargar el cuestionario "{modalDescargar.tema || 'Actividad'}"
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  setImprimir(modalDescargar);
                  setModalDescargar(null);
                }}
                className="w-full py-4 rounded-xl font-black bg-brandPrimary text-white hover:bg-brandPrimary/90 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                📄 Descargar en PDF (Imprimir)
              </button>
              <button
                onClick={() => {
                  exportToWord(modalDescargar.preguntas || [], modalDescargar.tema, modalDescargar.grado);
                  setModalDescargar(null);
                }}
                className="w-full py-4 rounded-xl font-black bg-[#2B579A] text-white hover:bg-[#1E3E6E] transition-colors shadow-md flex items-center justify-center gap-2"
              >
                📝 Descargar en Word (.docx)
              </button>
              <button
                onClick={() => setModalDescargar(null)}
                className="mt-3 w-full py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors text-ink/60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guía imprimible / PDF */}
      {imprimir && (
        <WorksheetPrint
          actividades={imprimir.preguntas || []}
          tema={imprimir.tema || ''}
          grado={imprimir.grado || ''}
          dificultad={imprimir.dificultad || ''}
          onClose={() => setImprimir(null)}
        />
      )}

      {/* Confirmación: borrar sala activa */}
      {confirmDeleteRoom && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center text-center animate-scale-in">
            <div className="w-16 h-16 bg-deny/10 rounded-full flex items-center justify-center text-3xl mb-6">🗑️</div>
            <h3 className="font-black text-2xl mb-3 text-ink">¿Borrar esta sala?</h3>
            <p className="font-bold text-ink/50 text-sm mb-8 leading-relaxed">
              Se eliminará la sala activa (PIN {confirmDeleteRoom}) de forma permanente. Si hay estudiantes conectados, se desconectarán. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmDeleteRoom(null)}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDeleteRoom(confirmDeleteRoom)}
                className="flex-1 btn-primary bg-deny hover:bg-deny/90 py-3 text-white font-black"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar mi contraseña */}
      {modalPassword && (
        <ModalMiPassword
          onClose={() => setModalPassword(false)}
          cambiarMiPassword={cambiarMiPassword}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      {confirmDeleteKey && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center text-center animate-scale-in">
            <div className="w-16 h-16 bg-deny/10 rounded-full flex items-center justify-center text-3xl mb-6">
              🗑️
            </div>
            <h3 className="font-black text-2xl mb-3 text-ink">¿Eliminar del historial?</h3>
            <p className="font-bold text-ink/50 text-sm mb-8 leading-relaxed">
              Esta acción eliminará de forma permanente el registro de esta sesión. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmDeleteKey(null)}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeEliminar(confirmDeleteKey)}
                className="flex-1 btn-primary bg-deny hover:bg-deny/90 py-3 text-white font-black"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de carga para reutilización */}
      {reutilizando && (
        <div className="fixed inset-0 bg-white/80 z-[60] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 border border-mist max-w-xs text-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-black text-lg text-purple-600">Reutilizando cuestionario…</span>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Fila de sesión en el historial
// ---------------------------------------------------------------------------
function SesionFila({ sesion, onClick, onDelete, onEdit, onReuse, onPreview, onDownload }) {
  const nEstudiantes = sesion.total_estudiantes || 0;
  const promedio = sesion.promedio_grupo;
  const fecha = sesion.cerrada_en
    ? new Date(sesion.cerrada_en).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
    : sesion.creada_en
      ? new Date(sesion.creada_en).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

  return (
    <div
      onClick={onClick}
      className="w-full px-8 py-5 flex items-center justify-between gap-4 hover:bg-gameBg/50 transition-colors text-left cursor-pointer group"
    >
      <div className="flex items-center gap-5 min-w-0">
        <span className="font-black text-2xl text-brandPrimary tracking-wider shrink-0">
          {sesion.pin}
        </span>
        <div className="min-w-0">
          {sesion.tema && (
            <div className="font-black text-base text-ink truncate">
              {sesion.tema}
            </div>
          )}
          <div className="font-bold text-sm text-ink/70 truncate">
            {sesion.total_preguntas ?? 0} preguntas · {nEstudiantes} estudiante{nEstudiantes !== 1 ? 's' : ''}
          </div>
          <div className="font-bold text-xs text-ink/40 mb-1">{fecha}</div>
          <MetaBadges grado={sesion.grado} dificultad={sesion.dificultad} />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {promedio !== undefined && (
          <span className={`font-black text-base md:text-xl shrink-0 ${
            promedio >= 3.0 ? 'text-brandSuccess' : 'text-brandDanger'
          }`}>
            Prom. {promedio}
          </span>
        )}
        <div className="flex items-center gap-1 no-print">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(sesion);
            }}
            className="p-1.5 md:p-2 text-ink/60 hover:bg-ink/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Vista previa (como la ve el estudiante)"
          >
            👁️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(sesion);
            }}
            className="p-1.5 md:p-2 text-ink/60 hover:bg-ink/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Descargar"
          >
            ⬇️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(sesion);
            }}
            className="p-1.5 md:p-2 text-brandPrimary hover:bg-brandPrimary/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Editar cuestionario"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReuse(sesion);
            }}
            className="p-1.5 md:p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Reutilizar (Jugar)"
          >
            🔄
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(sesion.key);
            }}
            className="p-1.5 md:p-2 text-deny hover:bg-deny/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Eliminar del historial"
          >
            🗑️
          </button>
        </div>
        <span className="text-ink/30 text-sm font-bold hidden sm:inline group-hover:hidden transition-all shrink-0">
          Ver notas →
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: Tabla de notas de una sesión archivada
// ---------------------------------------------------------------------------
function ModalNotas({ sesion, onClose, onDelete, onPreview, onDownload }) {
  const navigate = useNavigate();
  const [lanzando, setLanzando] = useState(false);
  const resultados = sesion.resultados || [];
  const aprobados = resultados.filter(r => r.nota >= 3.0).length;

  function republicarCuestionario() {
    navigate('/docente/nueva', {
      state: {
        actividades: sesion.preguntas || [],
        tema: sesion.tema || '',
        grado: sesion.grado || '',
        dificultad: sesion.dificultad || ''
      }
    });
  }

  async function publicarDeNuevo() {
    setLanzando(true);
    try {
      const newPin = await crearSesion(sesion.preguntas || [], sesion.tema || '', {
        grado: sesion.grado || '',
        dificultad: sesion.dificultad || ''
      });
      onClose();
      navigate(`/docente/sesion/${newPin}`);
    } catch (e) {
      console.error(e);
      alert('Error al publicar de nuevo: ' + e.message);
    } finally {
      setLanzando(false);
    }
  }

  function exportarCSV() {
    const head = 'Puesto,Nombre,Grado,Nota,Aciertos,Total\n';
    const body = resultados.map((r, i) =>
      `${i + 1},"${r.nombre}","${r.grado || ''}",${r.nota},${r.aciertos},${r.total}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + head + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas-${sesion.pin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header modal */}
        <div className="px-8 py-6 border-b border-mist flex items-start justify-between gap-4">
          <div>
            <div className="font-bold text-xs tracking-widest uppercase text-ink/40 mb-1">Sesión PIN</div>
            <div className="font-black text-3xl text-brandPrimary">{sesion.pin}</div>
            {sesion.tema && (
              <div className="font-black text-lg text-ink mt-1">
                Tema: {sesion.tema}
              </div>
            )}
            <div className="mt-1.5"><MetaBadges grado={sesion.grado} dificultad={sesion.dificultad} /></div>
            <div className="font-bold text-sm text-ink/50 mt-1">
              {sesion.total_preguntas ?? 0} preguntas · {resultados.length} estudiantes ·
              Prom. <span className={sesion.promedio_grupo >= 3.0 ? 'text-brandSuccess' : 'text-brandDanger'}>
                {sesion.promedio_grupo ?? '—'}
              </span>
              · Aprobados {aprobados}/{resultados.length}
            </div>
          </div>
          <button onClick={onClose} className="text-ink/30 hover:text-ink text-2xl font-bold leading-none">✕</button>
        </div>

        {/* Tabla de notas */}
        <div className="overflow-y-auto flex-1 px-8 py-4">
          {resultados.length === 0 ? (
            <p className="text-center text-ink/40 font-bold py-8">No hay estudiantes registrados.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-mist">
                  <th className="py-2 px-2 font-bold text-xs uppercase text-ink/40 w-10">#</th>
                  <th className="py-2 px-2 font-bold text-xs uppercase text-ink/40">Nombre</th>
                  <th className="py-2 px-2 font-bold text-xs uppercase text-ink/40 text-right">Nota</th>
                  <th className="py-2 px-2 font-bold text-xs uppercase text-ink/40 text-right hidden md:table-cell">Aciertos</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r, i) => (
                  <tr key={r.id} className="border-b border-mist/40 hover:bg-gameBg/50 transition-colors">
                    <td className="py-3 px-2 font-bold text-ink/30 text-sm">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-ink">{r.nombre}</div>
                      {r.grado && <div className="text-xs font-bold text-ink/40">{r.grado}</div>}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-black text-xl ${
                        r.nota >= 3.0 ? 'text-brandSuccess' : 'text-brandDanger'
                      }`}>
                        {r.nota.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-ink/50 hidden md:table-cell">
                      {r.aciertos}/{r.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="px-8 py-5 border-t border-mist flex flex-wrap gap-3 justify-between items-center no-print">
          <div>
            <button
              onClick={() => onDelete(sesion.key)}
              className="btn-secondary flex items-center gap-2 text-deny border-deny/30 hover:bg-deny/5"
            >
              🗑️ Borrar
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onPreview}
              className="btn-secondary flex items-center gap-2 text-ink/75 hover:bg-mist/10"
            >
              👁️ Vista previa
            </button>
            <button
              onClick={onDownload}
              className="btn-secondary flex items-center gap-2 text-ink/75 hover:bg-mist/10"
            >
              ⬇️ Descargar
            </button>
            <button
              onClick={exportarCSV}
              className="btn-secondary flex items-center gap-2 text-brandSuccess border-brandSuccess/30 hover:bg-brandSuccess/5"
            >
              📊 Exportar CSV
            </button>
            <button
              onClick={republicarCuestionario}
              className="btn-secondary flex items-center gap-2 text-brandPrimary border-brandPrimary/30 hover:bg-brandPrimary/5"
            >
              ✏️ Editar
            </button>
            <button
              onClick={publicarDeNuevo}
              disabled={lanzando}
              className="btn-primary bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {lanzando ? 'Iniciando…' : '🔄 Reutilizar (Jugar)'}
            </button>
            <button onClick={onClose} className="btn-primary bg-ink">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
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
          {exito && <p className="text-brandSuccess font-bold text-sm">{exito}</p>}
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

// ---------------------------------------------------------------------------
// Tablero de progreso por grado: agrupa el historial por grado y grafica la
// evolución del promedio del grupo a lo largo del tiempo (barras CSS).
// ---------------------------------------------------------------------------
const ORDEN_GRADOS = [
  'Preescolar', '1°', '2°', '3°', '4°', '5°',
  '6°', '7°', '8°', '9°', '10°', '11°',
  'Semestres 1–3', 'Semestres 4–6', 'Semestres 7+', 'Sin grado',
];

function ProgresoPorGrado({ historial }) {
  const grupos = useMemo(() => {
    const map = {};
    historial.forEach((h) => {
      const g = h.grado || 'Sin grado';
      if (!map[g]) map[g] = [];
      map[g].push(h);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.cerrada_en || a.creada_en || 0) - (b.cerrada_en || b.creada_en || 0))
    );
    return Object.keys(map)
      .sort((a, b) => {
        const ia = ORDEN_GRADOS.indexOf(a);
        const ib = ORDEN_GRADOS.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      })
      .map((k) => ({ grado: k, sesiones: map[k] }));
  }, [historial]);

  if (grupos.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-mist/50 overflow-hidden mb-10">
      <div className="px-8 py-6 border-b border-mist flex items-center justify-between">
        <h2 className="font-black text-xl">📈 Progreso por grado</h2>
        <span className="text-sm font-bold text-ink/40">{grupos.length} grado{grupos.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="p-6 space-y-8">
        {grupos.map(({ grado, sesiones }) => (
          <BloqueGrado key={grado} grado={grado} sesiones={sesiones} />
        ))}
      </div>
    </div>
  );
}

function BloqueGrado({ grado, sesiones }) {
  const proms = sesiones.map((s) => s.promedio_grupo || 0);
  const avg = proms.length ? proms.reduce((a, b) => a + b, 0) / proms.length : 0;
  const delta = proms.length > 1 ? +(proms[proms.length - 1] - proms[0]).toFixed(1) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg">{grado}</span>
          <span className="text-xs font-bold text-ink/40">{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''}</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="text-ink/50">
            Promedio: <span className={avg >= 3 ? 'text-brandSuccess' : 'text-brandDanger'}>{avg.toFixed(1)}</span>
          </span>
          {sesiones.length > 1 && (
            <span className={delta > 0 ? 'text-brandSuccess' : delta < 0 ? 'text-brandDanger' : 'text-ink/40'}>
              {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '– 0'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-3 h-36 bg-gameBg rounded-2xl p-4 overflow-x-auto">
        {sesiones.map((s, i) => {
          const p = s.promedio_grupo || 0;
          const altura = Math.max(6, (p / 5) * 85); // % del alto, deja espacio a las etiquetas
          const aprob = p >= 3;
          const fecha = s.cerrada_en || s.creada_en
            ? new Date(s.cerrada_en || s.creada_en).toLocaleDateString('es', { day: 'numeric', month: 'short' })
            : '';
          return (
            <div
              key={s.key || i}
              className="flex flex-col items-center justify-end shrink-0 w-14 h-full"
              title={`${s.tema || '—'}${s.dificultad ? ' · ' + s.dificultad : ''} · Prom. ${p} · ${fecha}`}
            >
              <span className="text-[11px] font-black text-ink/60 mb-1">{p}</span>
              <div
                className={`w-full rounded-t-md transition-all ${aprob ? 'bg-brandSuccess' : 'bg-brandDanger'}`}
                style={{ height: `${altura}%` }}
              />
              <span className="text-[9px] font-bold text-ink/40 mt-1 truncate w-full text-center">
                {s.dificultad ? s.dificultad.slice(0, 4) : fecha}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Insignias de grado y nivel de dificultad (para reconocer y, a futuro, medir progreso).
function MetaBadges({ grado, dificultad }) {
  if (!grado && !dificultad) return null;
  return (
    <span className="inline-flex gap-1.5 flex-wrap align-middle">
      {grado && (
        <span className="px-2 py-0.5 rounded-full bg-brandPrimary/10 text-brandPrimary text-[11px] font-black">
          {grado}
        </span>
      )}
      {dificultad && (
        <span className="px-2 py-0.5 rounded-full bg-brandSuccess/10 text-brandSuccess text-[11px] font-black">
          {dificultad}
        </span>
      )}
    </span>
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
