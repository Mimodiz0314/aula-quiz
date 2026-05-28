import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function TeacherLogin() {
  const { user, role, loading, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const desactivado = searchParams.get('desactivado') === '1';

  useEffect(() => {
    if (desactivado) {
      setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
    }
  }, [desactivado]);

  if (!loading && user && !user.isAnonymous) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'docente') return <Navigate to="/docente" replace />;
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
          <h2 className="font-black text-2xl mb-1">Bienvenido</h2>
          <p className="font-bold text-sm text-ink/50 mb-8">
            Ingresa con tus credenciales para acceder a tu panel.
          </p>

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
                  className="field pr-12"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={cargando}
                />
                <button
                  type="button"
                  onClick={() => setVerPass(!verPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-sm font-bold"
                >
                  {verPass ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </Campo>

            {error && (
              <div className="bg-deny/10 border-l-4 border-deny p-4 rounded-r-lg text-deny font-bold text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="btn-primary w-full bg-kahootBlue"
            >
              {cargando ? 'Verificando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-center font-bold text-xs text-ink/30 mt-8">
            Si olvidaste tu contraseña, contacta al administrador de la plataforma.
          </p>
        </div>
      </div>
    </main>
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

function mensajeError(code) {
  const mapa = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/user-disabled': 'Tu cuenta ha sido desactivada. Contacta al administrador.',
    'auth/invalid-email': 'El correo no es válido.',
  };
  return mapa[code] || 'Error al iniciar sesión. Intenta de nuevo.';
}
