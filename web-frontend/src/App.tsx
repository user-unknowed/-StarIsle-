import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import StudentHome from './pages/student/StudentHome';
import StudentChat from './pages/student/StudentChat';
import StudentRelax from './pages/student/StudentRelax';
import StudentProfile from './pages/student/StudentProfile';
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherChat from './pages/teacher/TeacherChat';
import TeacherRelax from './pages/teacher/TeacherRelax';
import TeacherProfile from './pages/teacher/TeacherProfile';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole: 'student' | 'teacher' }) {
  const { isLoggedIn, user } = useAuthStore();

  if (!isLoggedIn) {
    return <Navigate to="/" />;
  }

  if (user?.role !== requiredRole) {
    if (user.role === 'student') {
      return <Navigate to="/student" />;
    } else {
      return <Navigate to="/teacher" />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  const { isLoggedIn, user } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route path="/" element={isLoggedIn ? (user?.role === 'student' ? <Navigate to="/student" /> : <Navigate to="/teacher" />) : <Login />} />
        
        <Route path="/student" element={
          <ProtectedRoute requiredRole="student">
            <StudentHome />
          </ProtectedRoute>
        } />
        <Route path="/student/chat" element={
          <ProtectedRoute requiredRole="student">
            <StudentChat />
          </ProtectedRoute>
        } />
        <Route path="/student/relax" element={
          <ProtectedRoute requiredRole="student">
            <StudentRelax />
          </ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute requiredRole="student">
            <StudentProfile />
          </ProtectedRoute>
        } />
        
        <Route path="/teacher" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherHome />
          </ProtectedRoute>
        } />
        <Route path="/teacher/chat" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherChat />
          </ProtectedRoute>
        } />
        <Route path="/teacher/relax" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherRelax />
          </ProtectedRoute>
        } />
        <Route path="/teacher/profile" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherProfile />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}