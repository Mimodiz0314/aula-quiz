import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth.js';
import { auth, db } from '../../firebase/config.js';

export default function AdminLogin() {
  const { user, role, loading, login, registrar, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  if (!loading && user && !user.isAnonymous && role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  async function handleGoogle() {
    setError('');
    setCargando(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      // Verificar que este usuario tenga rol admin en RTDB
      const snap = await get(ref(db, `usuarios/${cred.user.uid}`));
      if (!snap.exists() || snap.val().rol !== 'admin') {
        await auth.signOut();
        setError('Esta cuenta de Google no tiene acceso de administrador.');
        return;
      }
      await refreshUserData();
      navigate('/admin', { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mensajeError(err.code) || err.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setCargando(false);
    }
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
    if (!email.trim()) return setError('Ingresa tu correo.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setCargando(true);

    try {
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

      await set(ref(db, `usuarios/${uid}`), {
        nombre: email.trim().split('@')[0],
        email: email.trim().toLowerCase(),
        rol: 'admin',
        activo: true,
        creado_en: Date.now(),
      });

      await refreshUserData();
      setExito('¡Administrador configurado! Ingresando al panel…');
      setTimeout(() => navigate('/admin', { replace: true }), 1200);
    } catch (err) {
      console.error('Error en setup:', err);
      if (err.code === 'PERMISSION_DENIED' || err.message?.includes('PERMISSION_DENIED')) {
        setError('Ya existe un administrador configurado. Usa "Iniciar Sesión".');
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

        <div className="bg-white rounded-3xl shadow-sm border-t-8 border-ink p-8 md:p-10 space-y-6">

          {/* Botón Google — método principal */}
          <div>
            <p className="font-bold text-xs tracking-widest uppercase text-ink/40 text-center mb-4">
              Acceso rápido
            </p>
            <button
              onClick={handleGoogle}
              disabled={cargando}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl border-2 border-mist font-bold text-ink hover:bg-gameBg transition-colors disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {cargando ? 'Verificando…' : 'Ingresar con Google'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-mist flex-1" />
            <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">o con correo</span>
            <div className="h-px bg-mist flex-1" />
          </div>

          {/* Pestañas email/contraseña */}
          <div>
            <div className="flex gap-1 bg-ink/5 p-1 rounded-xl mb-6">
              <TabBtn active={!exito} onClick={() => { setError(''); setExito(''); }}>
                Iniciar Sesión
              </TabBtn>
              <TabBtn active={false} onClick={() => {}}>
                Primera Configuración
              </TabBtn>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <Campo label="Correo electrónico">
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ejemplo.com"
                  required
                  disabled={cargando}
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
          </div>

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
    'auth/user-not-found': 'No existe cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/operation-not-allowed': 'Método no habilitado en Firebase Console.',
    'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
    'auth/popup-blocked': 'El navegador bloqueó el popup. Permite popups para este sitio.',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese correo en otro proveedor.',
  };
  return mapa[code] || `Error (${code}).`;
}
