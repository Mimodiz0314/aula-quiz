import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import TeacherView from './pages/teacher/TeacherView.jsx';
import TeacherLogin from './pages/teacher/TeacherLogin.jsx';
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import StudentView from './pages/student/StudentView.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <div className="min-h-screen grain">
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
  );
}
