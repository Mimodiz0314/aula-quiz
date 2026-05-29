import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth.js';
import { db } from '../../firebase/config.js';

export default function AdminLogin() {
  const { user, role, loading, login, registrar, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  if (!loading && user && !user.isAnonymous && role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(mensajeError(err.code));
    } finally {
      setCargando(false);
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('Ingresa tu nombre completo.');
    if (!email.trim()) return setError('Ingresa tu correo.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setCargando(true);

    try {
      // Crear cuenta nueva; si ya existe, iniciar sesión con ella
      let uid;
      try {
        const cred = await registrar(email.trim().toLowerCase(), password);
        uid = cred.user.uid;
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          const cred = await login(email.trim().toLowerCase(), password);
          uid = cred.user.uid;
        } else {
          throw err;
        }
      }

      // Guardar rol de admin en RTDB. La regla solo permite esto si no existe
      // ningún usuario aún (!root.child('usuarios').exists()), por lo que es
      // seguro sin verificación previa — si ya hay admin, RTDB lanzará PERMISSION_DENIED.
      await set(ref(db, `usuarios/${uid}`), {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol: 'admin',
        activo: true,
        creado_en: Date.now(),
      });

      // Refrescar el rol en el contexto antes de navegar para evitar la
      // redirección por role=null en ProtectedRoute.
      await refreshUserData();

      setExito('¡Administrador configurado! Ingresando al panel…');
      setTimeout(() => navigate('/admin', { replace: true }), 1200);
    } catch (err) {
      console.error('Error en setup:', err);
      if (err.code === 'PERMISSION_DENIED' || err.message?.includes('PERMISSION_DENIED')) {
        setError('Ya existe un administrador configurado. Usa la pestaña "Iniciar Sesión".');
      } else {
        setError(mensajeError(err.code) || err.message || 'Error inesperado.');
      }
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
            Panel Administrador
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border-t-8 border-ink p-8 md:p-10">
          <div className="flex gap-1 bg-ink/5 p-1 rounded-xl mb-8">
            <TabBtn active={tab === 'login'} onClick={() => { setTab('login'); setError(''); setExito(''); }}>
              Iniciar Sesión
            </TabBtn>
            <TabBtn active={tab === 'setup'} onClick={() => { setTab('setup'); setError(''); setExito(''); }}>
              Primera Configuración
            </TabBtn>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <p className="text-sm font-bold text-ink/50 -mt-2 mb-4">
                Acceso exclusivo para el administrador de la plataforma.
              </p>
              <Campo label="Correo electrónico">
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ejemplo.com"
                  required
                  disabled={cargando}
                  autoFocus
                />
              </Campo>
              <Campo label="Contraseña">
                <div className="relative">
                  <input
                    type={verPass ? 'text' : 'password'}
                    className="field pr-12"
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
              {exito && <Exito>{exito}</Exito>}
              <button type="submit" disabled={cargando} className="btn-primary w-full bg-ink">
                {cargando ? 'Verificando…' : 'Entrar al Panel'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetup} className="space-y-6">
              <p className="text-sm font-bold text-ink/50 -mt-2 mb-4">
                Solo funciona si no existe ningún administrador aún. Si ya tienes cuenta en Google con ese correo, pon la contraseña que quieras usar de ahora en adelante.
              </p>
              <Campo label="Tu nombre completo">
                <input
                  type="text"
                  className="field"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Milton Morales Díaz"
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
                  placeholder="miltonmoralesdiaz@gmail.com"
                  required
                  disabled={cargando}
                />
              </Campo>
              <Campo label="Contraseña (mínimo 6 caracteres)">
                <div className="relative">
                  <input
                    type={verPass ? 'text' : 'password'}
                    className="field pr-12"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
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
              {exito && <Exito>{exito}</Exito>}
              <button type="submit" disabled={cargando} className="btn-primary w-full bg-ink">
                {cargando ? 'Configurando…' : 'Configurar Administrador'}
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
      <label className="font-bold text-sm tracking-widest uppercase text-ink/60 mb-2 block">{label}</label>
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
    'auth/user-not-found': 'No existe cuenta con ese correo. Usa "Primera Configuración".',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/operation-not-allowed': 'Email/Contraseña no habilitado. Ve a Firebase Console → Authentication → Sign-in method → Email/Password → Activar.',
    'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
  };
  return mapa[code] || `Error (${code}).`;
}
