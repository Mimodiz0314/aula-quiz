import { useState, useEffect, useCallback } from 'react';
import { ref, get, set, update, remove } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, app } from '../../firebase/config.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const { userData, logout, user, impersonate } = useAuth();
  const navigate = useNavigate();
  const [docentes, setDocentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const [modalPassword, setModalPassword] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [accion, setAccion] = useState({ tipo: null, uid: null });
  const [mensaje, setMensaje] = useState('');

  function handleImpersonate(docente) {
    impersonate(docente);
    navigate('/docente');
  }

  const cargarDocentes = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const snap = await get(ref(db, 'usuarios'));
      if (!snap.exists()) {
        setDocentes([]);
        return;
      }
      const lista = Object.entries(snap.val())
        .map(([uid, data]) => ({ uid, ...data }))
        .filter(u => u.rol === 'docente' || u.rol === 'admin');
      lista.sort((a, b) => {
        if (a.rol === 'admin' && b.rol !== 'admin') return -1;
        if (b.rol === 'admin' && a.rol !== 'admin') return 1;
        return (b.creado_en || 0) - (a.creado_en || 0);
      });
      setDocentes(lista);
    } catch (e) {
      console.error('Error cargando docentes:', e);
      setErrorCarga(`Error al cargar: ${e.message}`);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDocentes(); }, [cargarDocentes]);

  async function toggleActivo(docente) {
    setAccion({ tipo: 'toggle', uid: docente.uid });
    try {
      await update(ref(db, `usuarios/${docente.uid}`), { activo: !docente.activo });
      await cargarDocentes();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setAccion({ tipo: null, uid: null });
    }
  }

  async function handleEliminar(docente) {
    setAccion({ tipo: 'eliminar', uid: docente.uid });
    try {
      await remove(ref(db, `usuarios/${docente.uid}`));
      setConfirmarEliminar(null);
      await cargarDocentes();
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      setAccion({ tipo: null, uid: null });
    }
  }

  const soloDocentes = docentes.filter(d => d.rol === 'docente');
  const activos = soloDocentes.filter(d => d.activo).length;

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
        {mensaje && (
          <div className="mb-6 bg-kahootGreen/10 border-l-4 border-kahootGreen p-4 rounded-r-xl font-bold text-sm text-kahootGreen">
            {mensaje}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <StatCard label="Total Docentes" value={soloDocentes.length} />
          <StatCard label="Activos" value={activos} color="text-kahootGreen" />
          <StatCard label="Inactivos" value={soloDocentes.length - activos} color="text-deny" />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-mist/50">
          <div className="flex items-center justify-between px-8 py-6 border-b border-mist">
            <h2 className="font-black text-2xl">Usuarios</h2>
            <div className="flex gap-3">
              <button
                onClick={cargarDocentes}
                disabled={cargando}
                className="font-bold text-sm text-ink/50 hover:text-ink border-2 border-mist px-4 py-2.5 rounded-xl hover:bg-gameBg transition-colors disabled:opacity-40"
              >
                {cargando ? '…' : '↺ Recargar'}
              </button>
              <button
                onClick={() => setModalCrear(true)}
                className="btn-primary bg-kahootBlue text-sm px-6 py-3"
              >
                + Agregar Docente
              </button>
            </div>
          </div>

          {cargando ? (
            <div className="py-16 text-center font-bold text-ink/40 animate-pulse">
              Cargando…
            </div>
          ) : errorCarga ? (
            <div className="py-10 px-8 text-center">
              <p className="font-bold text-deny mb-4">{errorCarga}</p>
              <button onClick={cargarDocentes} className="btn-primary bg-kahootBlue px-6 py-3 text-sm">
                Reintentar
              </button>
            </div>
          ) : docentes.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-black text-xl text-ink/30 mb-2">Sin usuarios registrados</p>
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
                  {docentes.map((d) => {
                    const esAdmin = d.rol === 'admin';
                    const esPropioUsuario = d.uid === user?.uid;
                    return (
                      <tr key={d.uid} className="hover:bg-gameBg/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="font-black text-sm">{d.nombre}</div>
                          {esAdmin && (
                            <span className="text-xs font-bold text-kahootBlue/60 uppercase tracking-wider">
                              Administrador
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-bold text-sm text-ink/60">{d.email}</td>
                        <td className="px-4 py-4">
                          {esAdmin ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-kahootBlue/10 text-kahootBlue">
                              Admin
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              d.activo
                                ? 'bg-kahootGreen/10 text-kahootGreen'
                                : 'bg-deny/10 text-deny'
                            }`}>
                              {d.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-bold text-xs text-ink/40">
                          {d.creado_en ? new Date(d.creado_en).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 justify-end flex-wrap">
                            {!esAdmin && (
                              <AccionBtn
                                onClick={() => handleImpersonate(d)}
                                color="text-purple-600"
                              >
                                Ingresar 👁️
                              </AccionBtn>
                            )}
                            {!esAdmin && (
                              <AccionBtn
                                onClick={() => toggleActivo(d)}
                                disabled={accion.uid === d.uid}
                                color={d.activo ? 'text-deny' : 'text-kahootGreen'}
                              >
                                {accion.uid === d.uid && accion.tipo === 'toggle'
                                  ? '…'
                                  : d.activo ? 'Desactivar' : 'Activar'}
                              </AccionBtn>
                            )}
                            <AccionBtn onClick={() => setModalPassword(d)} color="text-kahootBlue">
                              Contraseña
                            </AccionBtn>
                            {!esAdmin && (
                              <AccionBtn
                                onClick={() => setConfirmarEliminar(d)}
                                disabled={accion.uid === d.uid}
                                color="text-deny"
                              >
                                {accion.uid === d.uid && accion.tipo === 'eliminar' ? '…' : 'Eliminar'}
                              </AccionBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalCrear && (
        <ModalCrearDocente
          onClose={() => setModalCrear(false)}
          onCreado={cargarDocentes}
        />
      )}

      {modalPassword && (
        <ModalEnviarPassword
          docente={modalPassword}
          onClose={() => setModalPassword(null)}
          onExito={(msg) => { setMensaje(msg); setTimeout(() => setMensaje(''), 6000); }}
        />
      )}

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
              Esta acción no se puede deshacer. El docente perderá acceso a la plataforma.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarEliminar(null)}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmarEliminar)}
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
// Modal: Crear Docente (usando segunda instancia de Firebase para no cerrar sesión del admin)
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

    // Usamos una segunda instancia de Firebase para crear el usuario
    // sin cerrar la sesión del admin.
    const appName = `secondary-${Date.now()}`;
    const secondaryApp = initializeApp(app.options, appName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim().toLowerCase(),
        password
      );
      const uid = cred.user.uid;

      await authSignOut(secondaryAuth);

      await set(ref(db, `usuarios/${uid}`), {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol: 'docente',
        activo: true,
        creado_en: Date.now(),
      });

      setExito(`Docente "${nombre.trim()}" creado exitosamente.`);
      await onCreado();
      setTimeout(onClose, 1500);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        setError('Ya existe una cuenta con ese correo.');
      } else {
        setError(e.message || 'Error al crear el docente.');
      }
    } finally {
      setCargando(false);
      await deleteApp(secondaryApp);
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
// Modal: Enviar link de restablecimiento de contraseña al docente
// ---------------------------------------------------------------------------
function ModalEnviarPassword({ docente, onClose, onExito }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function handleEnviar() {
    setError('');
    setCargando(true);
    try {
      await sendPasswordResetEmail(getAuth(), docente.email);
      onExito(`Se envió un link de restablecimiento de contraseña a ${docente.email}.`);
      onClose();
    } catch (e) {
      setError(e.message || 'Error al enviar el correo.');
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
        <h3 className="font-black text-2xl mb-1">Restablecer Contraseña</h3>
        <p className="font-bold text-ink/50 text-sm mb-6">{docente.nombre}</p>
        <p className="text-sm font-bold text-ink/60 mb-6">
          Se enviará un link a <span className="text-ink">{docente.email}</span> para que el docente establezca una nueva contraseña.
        </p>
        {error && <p className="text-deny font-bold text-sm mb-4">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold border-2 border-mist hover:bg-gameBg transition-colors">
            Cancelar
          </button>
          <button onClick={handleEnviar} disabled={cargando}
            className="flex-1 btn-primary bg-kahootBlue py-3">
            {cargando ? 'Enviando…' : 'Enviar link al correo'}
          </button>
        </div>
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
