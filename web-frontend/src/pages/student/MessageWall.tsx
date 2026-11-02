/**
 * @file MessageWall.tsx
 * @description 学生端「树苗的轻语」页签：以全屏 iframe 嵌入匿名留言墙页面（保留原页面全部配置与星空特效）。
 *              该页为公开页，未登录游客也可访问；已登录学生保留顶部导航。
 * @module web-frontend/pages/student
 */
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { Header } from '../../components/common/Header';
import { useAuthStore } from '../../store/authStore';

/**
 * 树苗的轻语留言墙页面组件
 * @returns 留言墙 iframe（登录态学生附加顶部导航，游客附加返回入口）
 */
export default function MessageWall() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const role = useAuthStore((state) => state.user?.role);
  const showHeader = isLoggedIn && role === 'student';

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {showHeader && <Header role="student" />}
      {/* 页签内容区：占满除去顶部导航外的全部空间 */}
      <main id="main" className={`flex-1 min-h-0 ${showHeader ? 'pt-16' : ''}`}>
        <iframe
          src="message-wall/index.html"
          title="树苗的轻语"
          className="w-full h-full border-0"
          allow="clipboard-write"
        />
      </main>

      {/* 游客访问时提供返回登录入口 */}
      {!isLoggedIn && (
        <Link
          to="/"
          className="fixed top-4 left-4 z-50 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/85 backdrop-blur border border-white/60 text-primary-600 text-sm font-medium shadow-lg hover:bg-white transition-colors"
        >
          <Sprout className="w-4 h-4" />
          返回星屿登录
        </Link>
      )}
    </div>
  );
}