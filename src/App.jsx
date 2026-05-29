import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import TeacherView from './pages/teacher/TeacherView.jsx';
import TeacherLogin from './pages/teacher/TeacherLogin.jsx';
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import StudentView from './pages/student/StudentView.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { useAuth } from './hooks/useAuth.js';

export default function App() {
  const { impersonatedTeacher, detenerImpersonacion } = useAuth();

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
        <Routes>
          {/* Página de inicio (estudiantes entran aquí) */}
          <Route path="/" element={<Home />} />

          {/* Flujo del estudiante — sin cambios */}
          <Route path="/jugar" element={<StudentView />} />

          {/* Rutas del docente */}
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
      </div>
    </div>
  );
}
