import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ApiDebugOverlay } from './components/dev/ApiDebugOverlay';
import Login from './pages/Login';
import StudentHome from './pages/student/StudentHome';
import StudentChat from './pages/student/StudentChat';
import StudentRelax from './pages/student/StudentRelax';
import StudentProfile from './pages/student/StudentProfile';
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherChat from './pages/teacher/TeacherChat';
import TeacherRelax from './pages/teacher/TeacherRelax';
import TeacherProfile from './pages/teacher/TeacherProfile';
import ParentHome from './pages/parent/ParentHome';
import ParentChat from './pages/parent/ParentChat';
import ParentChildren from './pages/parent/ParentChildren';
import ParentEmergency from './pages/parent/ParentEmergency';
import ParentProfile from './pages/parent/ParentProfile';
import type { UserRole } from './types';

const homePathByRole: Record<UserRole, string> = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
};

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: UserRole;
}) {
  const { isLoggedIn, user } = useAuthStore();

  if (!isLoggedIn) {
    return <Navigate to="/" />;
  }

  if (user?.role !== requiredRole) {
    return <Navigate to={user ? homePathByRole[user.role] : '/'} />;
  }

  return <>{children}</>;
}

export default function App() {
  const { isLoggedIn, user } = useAuthStore();
  const homePath = user ? homePathByRole[user.role] : '/';

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to={homePath} /> : <Login />}
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/chat"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/relax"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentRelax />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/chat"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/relax"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherRelax />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/profile"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/parent"
          element={
            <ProtectedRoute requiredRole="parent">
              <ParentHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent/chat"
          element={
            <ProtectedRoute requiredRole="parent">
              <ParentChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent/children"
          element={
            <ProtectedRoute requiredRole="parent">
              <ParentChildren />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent/emergency"
          element={
            <ProtectedRoute requiredRole="parent">
              <ParentEmergency />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parent/profile"
          element={
            <ProtectedRoute requiredRole="parent">
              <ParentProfile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <ApiDebugOverlay />
    </Router>
  );
}
