import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import TeacherView from './pages/teacher/TeacherView.jsx';
import StudentView from './pages/student/StudentView.jsx';

export default function App() {
  return (
    <div className="min-h-screen grain">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docente" element={<TeacherView />} />
        <Route path="/docente/:sessionId" element={<TeacherView />} />
        <Route path="/jugar" element={<StudentView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
