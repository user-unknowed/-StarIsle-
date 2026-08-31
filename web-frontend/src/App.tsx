/**
 * @file App.tsx
 * @description 应用根组件，负责路由配置、登录态校验、角色路由守卫，并挂载全局错误边界、紧急求助按钮与开发期调试浮层
 * @module web-frontend
 */
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ApiDebugOverlay } from './components/dev/ApiDebugOverlay';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { EmergencyHelpButton } from './components/common/EmergencyHelpButton';
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

/**
 * 各角色对应的首页路由映射表
 * key 为用户角色，value 为该角色登录后应跳转到的首页路径
 */
const homePathByRole: Record<UserRole, string> = {
  student: '/student', // 学生端首页
  teacher: '/teacher', // 教师端首页
  parent: '/parent', // 家长端首页
};

/**
 * 受保护路由守卫组件：根据登录态与角色判断是否放行，未通过则重定向到登录页或对应角色首页
 * @param props.children - 受保护页面内容
 * @param props.requiredRole - 该路由要求的最小角色
 * @returns 通过校验时渲染页面内容并附加紧急求助按钮，否则渲染重定向导航
 */
function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: UserRole;
}) {
  // 从鉴权 store 中读取登录态与当前用户
  const { isLoggedIn, user } = useAuthStore();

  // 未登录则重定向到首页（登录入口）
  if (!isLoggedIn) {
    return <Navigate to="/" />;
  }

  // 已登录但角色不匹配，重定向到该用户自身角色的首页，避免越权访问
  if (user?.role !== requiredRole) {
    return <Navigate to={user ? homePathByRole[user.role] : '/'} />;
  }

  // 通过校验：渲染页面内容，并全局附加紧急求助按钮
  return (
    <>
      {children}
      <EmergencyHelpButton />
    </>
  );
}

/**
 * 应用根组件，负责组装路由、错误边界与开发期调试浮层
 * @returns 应用的根 JSX 结构
 */
export default function App() {
  // 读取登录态与当前用户，用于决定根路径渲染与首页跳转
  const { isLoggedIn, user } = useAuthStore();
  // 根据当前用户角色计算其首页路径（未登录时为登录页）
  const homePath = user ? homePathByRole[user.role] : '/';

  return (
    <Router>
      {/* 无障碍跳转链接：键盘用户可快速跳到主内容区，平时视觉隐藏 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg"
      >
        跳到主内容
      </a>
      {/* 全局错误边界，捕获子组件渲染异常并展示兜底 UI */}
      <ErrorBoundary>
        <Routes>
        {/* 根路径：已登录跳转角色首页，未登录展示登录页 */}
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to={homePath} /> : <Login />}
        />

        {/* ========== 学生端路由（需 student 角色） ========== */}
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

        {/* ========== 教师端路由（需 teacher 角色） ========== */}
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

        {/* ========== 家长端路由（需 parent 角色） ========== */}
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

        {/* 兜底路由：未匹配任何路径时重定向到登录首页 */}
        <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </ErrorBoundary>

      {/* 仅开发环境挂载 API 调试浮层 */}
      {import.meta.env.DEV && <ApiDebugOverlay />}
    </Router>
  );
}
