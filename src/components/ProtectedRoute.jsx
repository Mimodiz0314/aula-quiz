import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, role, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gameBg">
        <div className="font-black text-2xl text-ink/40 animate-pulse">Verificando acceso…</div>
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return <Navigate to={requiredRole === 'admin' ? '/admin/login' : '/docente/login'} replace />;
  }

  if (userData?.activo === false) {
    return <Navigate to="/docente/login?desactivado=1" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // El admin puede acceder a rutas de docente (es superusuario)
    if (requiredRole === 'docente' && role === 'admin') return children;
    return <Navigate to={requiredRole === 'admin' ? '/admin/login' : '/docente/login'} replace />;
  }

  return children;
}
