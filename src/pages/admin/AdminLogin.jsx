import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import {
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth.js';
import { auth, db } from '../../firebase/config.js';

export default function AdminLogin() {
  const { user, role, loading, login, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const bloqueandoRedir = useRef(false);

  // 'login' | 'establecer' | 'email'
  const [paso, setPaso] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  if (!loading && user && !user.isAnonymous && role === 'admin' && !bloqueandoRedir.current) {
    return <Navigate to="/admin" replace />;
  }

  function volverAlLogin() {
    bloqueandoRedir.current = false;
    setPaso('login');
    setError('');
    setExito('');
    setPassword('');
    setConfirmar('');
  }

  // ── Ingresar con Google ──────────────────────────────────────────────────
  async function handleGoogle() {
    setError('');
    setCargando(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
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
        setError(mensajeError(err.code) || err.message || 'Error con Google.');
      }
    } finally {
      setCargando(false);
    }
  }

  // ── Login con correo + contraseña ────────────────────────────────────────
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

  // ── Establecer contraseña via Google (sin email) ─────────────────────────
  async function handleEstablecerConGoogle(e) {
    e.preventDefault();
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirmar) return setError('Las contraseñas no coinciden.');
    setError('');
    setCargando(true);
    bloqueandoRedir.current = true;

    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);

      const snap = await get(ref(db, `usuarios/${cred.user.uid}`));
      if (!snap.exists() || snap.val().rol !== 'admin') {
        await auth.signOut();
        bloqueandoRedir.current = false;
        setError('Esta cuenta de Google no tiene acceso de administrador.');
        return;
      }

      const emailCred = EmailAuthProvider.credential(cred.user.email, password);
      await linkWithCredential(cred.user, emailCred);

      await refreshUserData();
      bloqueandoRedir.current = false;
      setExito('¡Contraseña establecida! Ahora puedes ingresar con correo y contraseña.');
      setTimeout(() => navigate('/admin', { replace: true }), 1200);
    } catch (err) {
      bloqueandoRedir.current = false;
      if (err.code === 'auth/provider-already-linked' || err.code === 'auth/credential-already-in-use') {
        setError('Este correo ya tiene contraseña. Úsala directamente en "Iniciar Sesión".');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(mensajeError(err.code) || err.message || 'Error al establecer contraseña.');
      }
    } finally {
      setCargando(false);
    }
  }

  // ── Enviar email de reset (opción secundaria) ────────────────────────────
  async function handleEmailReset(e) {
    e.preventDefault();
    if (!email.trim()) return setError('Ingresa tu correo.');
    setError('');
    setCargando(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setExito(`Link enviado a ${email.trim()}. Revisa también la carpeta de spam.`);
      setPaso('login');
    } catch (err) {
      setError(mensajeError(err.code) || err.message || 'Error al enviar el correo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gameBg px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-black text-4xl italic tracking-tighter mb-1">
            Aula<span className="text-brandPrimary">!</span>
          </div>
          <p className="font-bold text-sm tracking-widest uppercase text-ink/40">
            Panel Administrador
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border-t-8 border-ink p-8 md:p-10 space-y-6">

          {/* ── Botón Google ── */}
          <div>
            <p className="font-bold text-xs tracking-widest uppercase text-ink/40 text-center mb-4">
              Acceso rápido
            </p>
            <button
              onClick={handleGoogle}
              disabled={cargando}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl border-2 border-mist font-bold text-ink hover:bg-gameBg transition-colors disabled:opacity-50"
            >
              <GoogleIcon />
              {cargando ? 'Verificando…' : 'Ingresar con Google'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-mist flex-1" />
            <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">o con correo</span>
            <div className="h-px bg-mist flex-1" />
          </div>

          {/* ── Formularios según paso ── */}
          {paso === 'establecer' ? (
            <form onSubmit={handleEstablecerConGoogle} className="space-y-5">
              <div className="bg-ink/5 border border-ink/10 rounded-2xl p-4">
                <p className="font-bold text-sm text-ink/70 leading-relaxed">
                  Pon tu contraseña y haz clic en el botón. Google verificará tu identidad y la contraseña quedará guardada al instante.
                </p>
              </div>
              <Campo label="Nueva contraseña (mínimo 6 caracteres)">
                <div className="relative">
                  <input
                    type={verPass ? 'text' : 'password'}
                    className="field pr-16"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={cargando}
                    autoFocus
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

              <button type="submit" disabled={cargando}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-ink text-white font-bold hover:bg-ink/80 transition-colors disabled:opacity-50">
                <GoogleIcon white />
                {cargando ? 'Verificando con Google…' : 'Verificar con Google y guardar contraseña'}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px bg-mist flex-1" />
                <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">o</span>
                <div className="h-px bg-mist flex-1" />
              </div>

              <button
                type="button"
                onClick={() => setPaso('email')}
                disabled={cargando}
                className="w-full py-2.5 rounded-xl border-2 border-mist font-bold text-sm text-ink/60 hover:bg-gameBg transition-colors"
              >
                Recibir link en mi correo (puede tardar)
              </button>

              <button type="button" onClick={volverAlLogin}
                className="w-full text-center font-bold text-sm text-ink/40 hover:text-ink">
                ← Volver al inicio de sesión
              </button>
            </form>

          ) : paso === 'email' ? (
            <form onSubmit={handleEmailReset} className="space-y-5">
              <p className="text-sm font-bold text-ink/50">
                Te enviamos un link para establecer tu contraseña. Revisa también la carpeta de <strong>spam</strong>.
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
              {error && <Alerta>{error}</Alerta>}
              {exito && <Exito>{exito}</Exito>}
              <button type="submit" disabled={cargando} className="btn-primary w-full bg-ink">
                {cargando ? 'Enviando…' : 'Enviar link al correo'}
              </button>
              <button type="button" onClick={() => setPaso('establecer')}
                className="w-full text-center font-bold text-sm text-ink/40 hover:text-ink">
                ← Volver a verificar con Google
              </button>
            </form>

          ) : (
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

              <button
                type="button"
                onClick={() => { setPaso('establecer'); setError(''); setExito(''); }}
                className="w-full py-3 rounded-xl border-2 border-ink/20 bg-ink/5 font-bold text-sm text-ink/70 hover:bg-ink/10 transition-colors"
              >
                ¿Primera vez con correo? Establece tu contraseña
              </button>
            </form>
          )}

        </div>
        
        <div className="text-center mt-8">
          <button 
            onClick={() => navigate('/')} 
            className="inline-flex items-center justify-center gap-2 font-black text-sm text-ink/70 bg-white border-2 border-mist/80 px-6 py-3 rounded-2xl shadow-[0_4px_0_0_#E6E2D8] hover:bg-mist/30 hover:text-ink hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#E6E2D8] active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
          >
            ← Volver a Inicio
          </button>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon({ white = false }) {
  if (white) {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="white" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="rgba(255,255,255,0.85)" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="rgba(255,255,255,0.7)" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="rgba(255,255,255,0.9)" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
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
    <div className="bg-green-50 border-l-4 border-brandSuccess p-4 rounded-r-lg text-brandSuccess font-bold text-sm">
      {children}
    </div>
  );
}

function mensajeError(code) {
  const mapa = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos. Si ingresaste antes con Google, usa el botón de Google o "Establece tu contraseña".',
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
