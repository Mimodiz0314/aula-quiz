import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import Home from './pages/Home.jsx';
import StudentView from './pages/student/StudentView.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { useAuth } from './hooks/useAuth.js';

// Code-splitting (R-3.2): Home y StudentView quedan en el bundle inicial (cargas
// rápidas, críticas para el alumno en hardware de gama baja). El resto se carga
// bajo demanda, sacando del arranque las librerías pesadas (Excel/Word) que solo
// usa el panel del docente.
const TeacherView = lazy(() => import('./pages/teacher/TeacherView.jsx'));
const TeacherLogin = lazy(() => import('./pages/teacher/TeacherLogin.jsx'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard.jsx'));
const Bank = lazy(() => import('./pages/teacher/Bank.jsx'));
const Forums = lazy(() => import('./pages/teacher/Forums.jsx'));
const ForumTopic = lazy(() => import('./pages/teacher/ForumTopic.jsx'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));

function CargandoPantalla() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="font-display text-xl text-ink/50">Cargando…</div>
    </div>
  );
}

export default function App() {
  const { impersonatedTeacher, detenerImpersonacion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async ({ canGoBack }) => {
      // If we are at the root (Home) or Login, we shouldn't go back, we should exit the app
      if (location.pathname === '/' || location.pathname === '/docente/login') {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    };

    let backListener;
    CapacitorApp.addListener('backButton', handleBackButton).then(listener => {
      backListener = listener;
    }).catch(e => console.warn('Not running natively', e));

    return () => {
      if (backListener) backListener.remove();
    };
  }, [navigate, location]);

  return (
    <div className="min-h-screen grain flex flex-col">
      {impersonatedTeacher && (
        <div className="bg-purple-700 text-white px-6 py-2.5 flex items-center justify-between font-black text-sm z-50 shadow-md shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className="text-base">👁️</span>
            <span>Vista de Administrador: Panel de {impersonatedTeacher.nombre} ({impersonatedTeacher.email})</span>
          </div>
          <button
            onClick={() => {
              detenerImpersonacion();
              window.location.href = '/admin';
            }}
            className="bg-white text-purple-700 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-all font-black text-xs uppercase tracking-wider"
          >
            Volver a Admin
          </button>
        </div>
      )}
      <div className="flex-1">
        <Suspense fallback={<CargandoPantalla />}>
        <Routes>
          {/* Página de inicio (estudiantes entran aquí) */}
          <Route path="/" element={<Home />} />

          {/* Flujo del estudiante — sin cambios */}
          <Route path="/jugar" element={<StudentView />} />

          {/* Rutas del docente */}
          <Route path="/privacidad" element={<PrivacyPolicy />} />
          <Route path="/docente/login" element={<TeacherLogin />} />
          <Route
            path="/docente"
            element={
              <ProtectedRoute requiredRole="docente">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/banco"
            element={
              <ProtectedRoute requiredRole="docente">
                <Bank />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/foro"
            element={
              <ProtectedRoute requiredRole="docente">
                <Forums />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/foro/:hiloId"
            element={
              <ProtectedRoute requiredRole="docente">
                <ForumTopic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/nueva"
            element={
              <ProtectedRoute requiredRole="docente">
                <TeacherView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/sesion/:sessionId"
            element={
              <ProtectedRoute requiredRole="docente">
                <TeacherView />
              </ProtectedRoute>
            }
          />

          {/* Rutas del administrador */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>
    </div>
  );
}
