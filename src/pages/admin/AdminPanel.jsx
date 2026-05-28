import { useState, useEffect, useCallback } from 'react';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function AdminPanel() {
  const { userData, logout } = useAuth();
  const [docentes, setDocentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalPassword, setModalPassword] = useState(null); // uid del docente
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // uid
  const [accion, setAccion] = useState({ tipo: null, uid: null });

  const cargarDocentes = useCallback(async () => {
    setCargando(true);
    try {
      const q = query(ref(db, 'usuarios'), orderByChild('rol'), equalTo('docente'));
      const snap = await get(q);
      if (!snap.exists()) {
        setDocentes([]);
        return;
      }
      const lista = Object.entries(snap.val()).map(([uid, data]) => ({ uid, ...data }));
      lista.sort((a, b) => b.creado_en - a.creado_en);
      setDocentes(lista);
    } catch (e) {
      console.error('Error cargando docentes:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDocentes(); }, [cargarDocentes]);

  async function toggleActivo(docente) {
    const fn = docente.activo ? 'desactivarDocente' : 'reactivarDocente';
    setAccion({ tipo: fn, uid: docente.uid });
    try {
      await httpsCallable(functions, fn)({ uid: docente.uid });
      await cargarDocentes();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setAccion({ tipo: null, uid: null });
    }
  }

  async function handleEliminar(uid) {
    setAccion({ tipo: 'eliminar', uid });
    try {
      await httpsCallable(functions, 'eliminarDocente')({ uid });
      setConfirmarEliminar(null);
      await cargarDocentes();
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      setAccion({ tipo: null, uid: null });
    }
  }

  const activos = docentes.filter(d => d.activo).length;

  return (
    <main className="min-h-screen bg-gameBg">
      {/* Header */}
      <header className="bg-white border-b border-mist px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-black text-2xl italic tracking-tighter">
            Aula<span className="text-kahootBlue">!</span>
          </div>
          <span className="hidden md:inline font-bold text-xs tracking-widest uppercase text-ink/40 bg-ink/5 px-3 py-1 rounded-full">
            Panel Administrador
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline font-bold text-sm text-ink/60">
            {userData?.nombre}
          </span>
          <button onClick={logout} className="font-bold text-sm tracking-widest uppercase text-deny hover:text-deny/70 transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <StatCard label="Total Docentes" value={docentes.length} />
          <StatCard label="Activos" value={activos} color="text-kahootGreen" />
          <StatCard label="Inactivos" value={docentes.length - activos} color="text-deny" />
        </div>

        {/* Tabla de docentes */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-mist/50">
          <div className="flex items-center justify-between px-8 py-6 border-b border-mist">
            <h2 className="font-black text-2xl">Docentes</h2>
            <button
              onClick={() => setModalCrear(true)}
              className="btn-primary bg-kahootBlue text-sm px-6 py-3"
            >
              + Agregar Docente
            </button>
          </div>

          {cargando ? (
            <div className="py-16 text-center font-bold text-ink/40 animate-pulse">
              Cargando docentes…
            </div>
          ) : docentes.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-black text-xl text-ink/30 mb-2">Sin docentes registrados</p>
              <p className="font-bold text-sm text-ink/40">Agrega el primer docente con el botón de arriba.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-bold tracking-widest uppercase text-ink/40 border-b border-mist">
                    <th className="px-8 py-4">Nombre</th>
                    <th className="px-4 py-4">Correo</th>
                    <th className="px-4 py-4">Estado</th>
                    <th className="px-4 py-4">Registro</th>
                    <th className="px-4 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist/50">
                  {docentes.map((d) => (
                    <tr key={d.uid} className="hover:bg-gameBg/50 transition-colors">
                      <td className="px-8 py-4 font-black text-sm">{d.nombre}</td>
                      <td className="px-4 py-4 font-bold text-sm text-ink/60">{d.email}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          d.activo
                            ? 'bg-kahootGreen/10 text-kahootGreen'
                            : 'bg-deny/10 text-deny'
                        }`}>
                          {d.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-xs text-ink/40">
                        {d.creado_en ? new Date(d.creado_en).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          <AccionBtn
                            onClick={() => toggleActivo(d)}
                            disabled={accion.uid === d.uid}
                            color={d.activo ? 'text-deny' : 'text-kahootGreen'}
                          >
                            {accion.uid === d.uid && accion.tipo !== 'eliminar'
                              ? '…'
                              : d.activo ? 'Desactivar' : 'Activar'}
                          </AccionBtn>
                          <AccionBtn onClick={() => setModalPassword(d)} color="text-kahootBlue">
                            Contraseña
                          </AccionBtn>
                          <AccionBtn
                            onClick={() => setConfirmarEliminar(d)}
                            disabled={accion.uid === d.uid}
                            color="text-deny"
                          >
                            {accion.uid === d.uid && accion.tipo === 'eliminar' ? '…' : 'Eliminar'}
                          </AccionBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Crear Docente */}
      {modalCrear && (
        <ModalCrearDocente
          onClose={() => setModalCrear(false)}
          onCreado={cargarDocentes}
        />
      )}

      {/* Modal: Cambiar Contraseña */}
      {modalPassword && (
        <ModalCambiarPassword
          docente={modalPassword}
          onClose={() => setModalPassword(null)}
        />
      )}

      {/* Modal: Confirmar Eliminación */}
      {confirmarEliminar && (
        <Backdrop onClick={() => setConfirmarEliminar(null)}>
          <div
            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-black text-2xl mb-2">¿Eliminar docente?</h3>
            <p className="font-bold text-ink/60 mb-1">
              <span className="text-ink">{confirmarEliminar.nombre}</span>
            </p>
            <p className="text-sm font-bold text-deny mb-8">
              Esta acción no se puede deshacer. Las sesiones del docente permanecerán en la base de datos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarEliminar(null)}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmarEliminar.uid)}
                disabled={accion.uid === confirmarEliminar.uid}
                className="flex-1 py-3 rounded-xl font-bold bg-deny text-white hover:bg-deny/80 transition-colors"
              >
                {accion.uid === confirmarEliminar.uid ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </Backdrop>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Modal: Crear Docente
// ---------------------------------------------------------------------------
function ModalCrearDocente({ onClose, onCreado }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!nombre.trim() || !email.trim() || !password) {
      return setError('Todos los campos son requeridos.');
    }
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setCargando(true);
    try {
      await httpsCallable(functions, 'crearDocente')({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setExito(`Docente "${nombre.trim()}" creado exitosamente.`);
      await onCreado();
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.message || 'Error al crear el docente.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Backdrop onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-black text-2xl mb-6">Agregar Docente</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <CampoModal label="Nombre completo">
            <input className="field" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Ana González" disabled={cargando} autoFocus required />
          </CampoModal>
          <CampoModal label="Correo electrónico">
            <input type="email" className="field" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="docente@ejemplo.com" disabled={cargando} required />
          </CampoModal>
          <CampoModal label="Contraseña temporal">
            <div className="relative">
              <input
                type={verPass ? 'text' : 'password'}
                className="field pr-12"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={cargando}
                required
              />
              <button type="button" onClick={() => setVerPass(!verPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-sm font-bold">
                {verPass ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </CampoModal>
          {error && <p className="text-deny font-bold text-sm">{error}</p>}
          {exito && <p className="text-kahootGreen font-bold text-sm">{exito}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              className="flex-1 btn-primary bg-kahootBlue py-3">
              {cargando ? 'Creando…' : 'Crear Docente'}
            </button>
          </div>
        </form>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Modal: Cambiar Contraseña
// ---------------------------------------------------------------------------
function ModalCambiarPassword({ docente, onClose }) {
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
      await httpsCallable(functions, 'cambiarPasswordDocente')({ uid: docente.uid, password });
      setExito('Contraseña actualizada exitosamente.');
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.message || 'Error al cambiar la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Backdrop onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-black text-2xl mb-1">Cambiar Contraseña</h3>
        <p className="font-bold text-ink/50 text-sm mb-6">{docente.nombre}</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <CampoModal label="Nueva contraseña">
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
          </CampoModal>
          <CampoModal label="Confirmar contraseña">
            <input
              type={verPass ? 'text' : 'password'}
              className="field"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              disabled={cargando}
              required
            />
          </CampoModal>
          {error && <p className="text-deny font-bold text-sm">{error}</p>}
          {exito && <p className="text-kahootGreen font-bold text-sm">{exito}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              className="flex-1 btn-primary bg-ink py-3">
              {cargando ? 'Guardando…' : 'Guardar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------
function StatCard({ label, value, color = 'text-ink' }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-mist/50">
      <div className={`font-black text-4xl ${color}`}>{value}</div>
      <div className="font-bold text-xs tracking-widest uppercase text-ink/40 mt-1">{label}</div>
    </div>
  );
}

function AccionBtn({ children, onClick, disabled, color = 'text-ink' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-bold text-xs tracking-wider uppercase px-3 py-1.5 rounded-lg border border-current hover:bg-current/10 transition-colors disabled:opacity-40 ${color}`}
    >
      {children}
    </button>
  );
}

function CampoModal({ label, children }) {
  return (
    <div>
      <label className="font-bold text-xs tracking-widest uppercase text-ink/50 mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function Backdrop({ children, onClick }) {
  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClick}
    >
      {children}
    </div>
  );
}
