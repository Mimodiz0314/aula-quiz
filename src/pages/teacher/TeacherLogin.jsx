import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth.js';
import { db } from '../../firebase/config.js';

export default function TeacherLogin() {
  const { user, role, loading, login, registrar, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const desactivado = searchParams.get('desactivado') === '1';

  useEffect(() => {
    if (desactivado) setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
  }, [desactivado]);

  if (!loading && user && !user.isAnonymous && role === 'docente') {
    return <Navigate to="/docente" replace />;
  }

  function cambiarTab(t) {
    setTab(t);
    setError('');
    setExito('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email.trim(), password);
      navigate('/docente', { replace: true });
    } catch (err) {
      setError(mensajeError(err.code));
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistro(e) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('Ingresa tu nombre completo.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirmar) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      const cred = await registrar(email.trim().toLowerCase(), password);
      const uid = cred.user.uid;

      await set(ref(db, `usuarios/${uid}`), {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol: 'docente',
        activo: true,
        creado_en: Date.now(),
      });

      await refreshUserData();
      setExito('¡Cuenta creada! Ingresando a tu panel…');
      setTimeout(() => navigate('/docente', { replace: true }), 1200);
    } catch (err) {
      setError(mensajeError(err.code) || err.message || 'Error al crear la cuenta.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gameBg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-black text-4xl italic tracking-tighter mb-1">
            Aula<span className="text-kahootBlue">!</span>
          </div>
          <p className="font-bold text-sm tracking-widest uppercase text-ink/40">
            Acceso Docente
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border-t-8 border-kahootBlue p-8 md:p-10">
          {/* Pestañas */}
          <div className="flex gap-1 bg-ink/5 p-1 rounded-xl mb-8">
            <TabBtn active={tab === 'login'} onClick={() => cambiarTab('login')}>
              Iniciar Sesión
            </TabBtn>
            <TabBtn active={tab === 'registro'} onClick={() => cambiarTab('registro')}>
              Nuevo Docente
            </TabBtn>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <Campo label="Correo electrónico">
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="docente@ejemplo.com"
                  required
                  disabled={cargando}
                  autoFocus
                />
              </Campo>
              <Campo label="Contraseña">
                <div className="relative">
                  <input
                    type={verPass ? 'text' : 'password'}
                    className="field pr-16"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={cargando}
                  />
                  <button type="button" onClick={() => setVerPass(!verPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-sm font-bold">
                    {verPass ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </Campo>
              {error && <Alerta>{error}</Alerta>}
              <button type="submit" disabled={cargando} className="btn-primary w-full bg-kahootBlue">
                {cargando ? 'Verificando…' : 'Entrar'}
              </button>
              <p className="text-center font-bold text-xs text-ink/30">
                Si olvidaste tu contraseña, contacta al administrador.
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="space-y-5">
              <p className="text-sm font-bold text-ink/50 -mt-2 mb-2">
                Crea tu cuenta de docente para empezar a crear juegos.
              </p>
              <Campo label="Nombre completo">
                <input
                  type="text"
                  className="field"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Ana González"
                  required
                  disabled={cargando}
                  autoFocus
                />
              </Campo>
              <Campo label="Correo electrónico">
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  disabled={cargando}
                />
              </Campo>
              <Campo label="Contraseña (mínimo 6 caracteres)">
                <div className="relative">
                  <input
                    type={verPass ? 'text' : 'password'}
                    className="field pr-16"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={cargando}
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
                  placeholder="••••••••"
                  required
                  disabled={cargando}
                />
              </Campo>
              {error && <Alerta>{error}</Alerta>}
              {exito && <Exito>{exito}</Exito>}
              <button type="submit" disabled={cargando} className="btn-primary w-full bg-kahootBlue">
                {cargando ? 'Creando cuenta…' : 'Crear Cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
        active ? 'bg-white shadow-sm text-ink' : 'text-ink/50 hover:text-ink'
      }`}>
      {children}
    </button>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function Alerta({ children }) {
  return (
    <div className="bg-deny/10 border-l-4 border-deny p-4 rounded-r-lg text-deny font-bold text-sm">
      {children}
    </div>
  );
}

function Exito({ children }) {
  return (
    <div className="bg-green-50 border-l-4 border-kahootGreen p-4 rounded-r-lg text-kahootGreen font-bold text-sm">
      {children}
    </div>
  );
}

function mensajeError(code) {
  const mapa = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Usa "Iniciar Sesión".',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/user-disabled': 'Tu cuenta ha sido desactivada. Contacta al administrador.',
    'auth/operation-not-allowed': 'Registro no habilitado. Contacta al administrador.',
    'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
  };
  return mapa[code] || 'Error inesperado. Intenta de nuevo.';
}
