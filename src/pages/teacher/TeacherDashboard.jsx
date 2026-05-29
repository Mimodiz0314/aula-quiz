import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { obtenerHistorialDocente, eliminarHistorial, crearSesion, obtenerSesion } from '../../services/sessionService.js';
import { listarSalasGuardadas, quitarSala, reemplazarSalas } from '../../utils/savedRooms.js';
import WorksheetPrint from '../../components/WorksheetPrint.jsx';
import StudentPreview from '../../components/StudentPreview.jsx';

export default function TeacherDashboard() {
  const { user, userData, logout, cambiarMiPassword } = useAuth();
  const navigate = useNavigate();

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [salasActivas, setSalasActivas] = useState([]);
  const [preview, setPreview] = useState(null);   // sesión a previsualizar (vista estudiante)
  const [imprimir, setImprimir] = useState(null);  // sesión a imprimir (guía PDF)
  const [modalPassword, setModalPassword] = useState(false);
  const [sesionDetalle, setSesionDetalle] = useState(null); // sesión seleccionada para ver notas
  const [reutilizando, setReutilizando] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);

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
        try {
          const s = await obtenerSesion(sala.pin);
          if (s) verificadas.push({ pin: sala.pin, tema: s.tema || sala.tema || '', estado: s.estado_actual, grado: s.grado || '', dificultad: s.dificultad || '' });
        } catch { /* ignore */ }
      }
      if (!activo) return;
      // Auto-limpieza: deja en memoria solo las salas que siguen vivas.
      reemplazarSalas(uid, verificadas.map(v => ({ pin: v.pin, tema: v.tema, guardada_en: Date.now() })));
      setSalasActivas(verificadas);
    })();
    return () => { activo = false; };
  }, [user?.uid]);

  function quitarDeActivas(pin) {
    quitarSala(user?.uid, pin);
    setSalasActivas(prev => prev.filter(s => s.pin !== pin));
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
          <StatCard
            label="Promedio general"
            value={historial.length > 0
              ? (historial.reduce((s, h) => s + (h.promedio_grupo || 0), 0) / historial.length).toFixed(1)
              : '—'}
            color="text-kahootGreen"
          />
          <StatCard
            label="Estudiantes evaluados"
            value={historial.reduce((s, h) => s + (h.total_estudiantes || 0), 0)}
            color="text-kahootBlue"
          />
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

        {/* Salas activas (guardadas para más tarde) */}
        {salasActivas.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-mist/50 overflow-hidden mb-10">
            <div className="px-8 py-6 border-b border-mist flex items-center justify-between">
              <h2 className="font-black text-xl">Salas activas</h2>
              <span className="text-sm font-bold text-ink/40">
                {salasActivas.length} guardada{salasActivas.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-mist/50">
              {salasActivas.map((s) => (
                <div key={s.pin} className="px-8 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5 min-w-0">
                    <span className="font-black text-2xl text-kahootBlue tracking-wider shrink-0">{s.pin}</span>
                    <div className="min-w-0">
                      {s.tema && <div className="font-black text-base text-ink truncate">{s.tema}</div>}
                      <div className="font-bold text-xs text-ink/40 capitalize mb-1">
                        {(s.estado || '').replace(/_/g, ' ') || 'Guardada'}
                      </div>
                      <MetaBadges grado={s.grado} dificultad={s.dificultad} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/docente/sesion/${s.pin}`)}
                      className="btn-primary bg-kahootGreen text-white"
                    >
                      Abrir sala
                    </button>
                    <button
                      onClick={() => quitarDeActivas(s.pin)}
                      title="Quitar de la lista (no borra la sala)"
                      className="p-2 text-ink/30 hover:text-deny hover:bg-deny/10 rounded-xl transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de sesiones */}
        <div className="bg-white rounded-3xl shadow-sm border border-mist/50 overflow-hidden">
          <div className="px-8 py-6 border-b border-mist flex items-center justify-between">
            <h2 className="font-black text-xl">Sesiones anteriores</h2>
            <span className="text-sm font-bold text-ink/40">{historial.length} registros</span>
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
                  key={s.key}
                  sesion={s}
                  onClick={() => setSesionDetalle(s)}
                  onDelete={handleEliminar}
                  onEdit={handleEdit}
                  onReuse={handleReuse}
                  onPreview={() => setPreview(s)}
                  onPrint={() => setImprimir(s)}
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
          onPrint={() => { setImprimir(sesionDetalle); setSesionDetalle(null); }}
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
function SesionFila({ sesion, onClick, onDelete, onEdit, onReuse, onPreview, onPrint }) {
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
        <span className="font-black text-2xl text-kahootBlue tracking-wider shrink-0">
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
            promedio >= 3.0 ? 'text-kahootGreen' : 'text-kahootRed'
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
              onPrint(sesion);
            }}
            className="p-1.5 md:p-2 text-ink/60 hover:bg-ink/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Imprimir / PDF"
          >
            🖨️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(sesion);
            }}
            className="p-1.5 md:p-2 text-kahootBlue hover:bg-kahootBlue/10 rounded-xl transition-all md:opacity-0 group-hover:opacity-100 focus:opacity-100"
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
function ModalNotas({ sesion, onClose, onDelete, onPreview, onPrint }) {
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
            <div className="font-black text-3xl text-kahootBlue">{sesion.pin}</div>
            {sesion.tema && (
              <div className="font-black text-lg text-ink mt-1">
                Tema: {sesion.tema}
              </div>
            )}
            <div className="mt-1.5"><MetaBadges grado={sesion.grado} dificultad={sesion.dificultad} /></div>
            <div className="font-bold text-sm text-ink/50 mt-1">
              {sesion.total_preguntas ?? 0} preguntas · {resultados.length} estudiantes ·
              Prom. <span className={sesion.promedio_grupo >= 3.0 ? 'text-kahootGreen' : 'text-kahootRed'}>
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
                        r.nota >= 3.0 ? 'text-kahootGreen' : 'text-kahootRed'
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
              onClick={onPrint}
              className="btn-secondary flex items-center gap-2 text-ink/75 hover:bg-mist/10"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={exportarCSV}
              className="btn-secondary flex items-center gap-2 text-kahootGreen border-kahootGreen/30 hover:bg-kahootGreen/5"
            >
              📊 Exportar CSV
            </button>
            <button
              onClick={republicarCuestionario}
              className="btn-secondary flex items-center gap-2 text-kahootBlue border-kahootBlue/30 hover:bg-kahootBlue/5"
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

// Insignias de grado y nivel de dificultad (para reconocer y, a futuro, medir progreso).
function MetaBadges({ grado, dificultad }) {
  if (!grado && !dificultad) return null;
  return (
    <span className="inline-flex gap-1.5 flex-wrap align-middle">
      {grado && (
        <span className="px-2 py-0.5 rounded-full bg-kahootBlue/10 text-kahootBlue text-[11px] font-black">
          {grado}
        </span>
      )}
      {dificultad && (
        <span className="px-2 py-0.5 rounded-full bg-kahootGreen/10 text-kahootGreen text-[11px] font-black">
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
