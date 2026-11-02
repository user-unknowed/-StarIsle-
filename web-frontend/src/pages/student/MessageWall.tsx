/**
 * @file MessageWall.tsx
 * @description 学生端「树苗的轻语」页签：以全屏 iframe 嵌入匿名留言墙页面（保留原页面全部配置与星空特效）
 * @module web-frontend/pages/student
 */
import { Header } from '../../components/common/Header';

/**
 * 树苗的轻语留言墙页面组件
 * @returns 顶部导航 + 全尺寸留言墙 iframe
 */
export default function MessageWall() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Header role="student" />
      {/* 页签内容区：占满除去顶部导航外的全部空间 */}
      <main id="main" className="flex-1 pt-16 min-h-0">
        <iframe
          src="message-wall/index.html"
          title="树苗的轻语"
          className="w-full h-full border-0"
          allow="clipboard-write"
        />
      </main>
    </div>
  );
}