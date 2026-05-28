import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth.js';
import { functions } from '../../firebase/config.js';

export default function AdminLogin() {
  const { user, role, loading, login, registrar } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login'); // 'login' | 'setup'
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
      await registrar(email.trim(), password);
      const configurarAdmin = httpsCallable(functions, 'configurarAdmin');
      await configurarAdmin({ nombre: nombre.trim() });
      setExito('¡Administrador configurado! Ya puedes iniciar sesión.');
      setTab('login');
    } catch (err) {
      if (err.code === 'already-exists' || err?.details?.code === 'already-exists') {
        setError('Ya existe un administrador. Usa el formulario de inicio de sesión.');
      } else {
        setError(mensajeError(err.code) || err.message);
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
            <TabBtn active={tab === 'login'} onClick={() => { setTab('login'); setError(''); }}>
              Iniciar Sesión
            </TabBtn>
            <TabBtn active={tab === 'setup'} onClick={() => { setTab('setup'); setError(''); }}>
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
              {exito && <div className="bg-green-50 border-l-4 border-kahootGreen p-4 rounded-r-lg text-kahootGreen font-bold text-sm">{exito}</div>}
              <button type="submit" disabled={cargando} className="btn-primary w-full bg-ink">
                {cargando ? 'Verificando…' : 'Entrar al Panel'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetup} className="space-y-6">
              <p className="text-sm font-bold text-ink/50 -mt-2 mb-4">
                Solo funciona si no existe ningún administrador aún. Completa este formulario para configurar la primera cuenta de admin.
              </p>
              <Campo label="Tu nombre completo">
                <input
                  type="text"
                  className="field"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Carlos Martínez"
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
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
        active ? 'bg-white shadow-sm text-ink' : 'text-ink/50 hover:text-ink'
      }`}
    >
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

function mensajeError(code) {
  const mapa = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/weak-password': 'La contraseña es muy débil.',
    'auth/invalid-email': 'El correo no es válido.',
  };
  return mapa[code] || 'Ocurrió un error. Intenta de nuevo.';
}
