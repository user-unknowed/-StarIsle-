/**
 * @file ChatDisabledPlaceholder.tsx
 * @description AI 对话功能被屏蔽时的占位页面，在三端 Chat 页面未启用 AI 时渲染，避免用户直接访问
 * @module web-frontend/components/common
 */
import { Header } from './Header';
import { Sparkles, Clock } from 'lucide-react';

/**
 * 占位组件的属性
 */
interface ChatDisabledPlaceholderProps {
  role: 'student' | 'teacher' | 'parent'; // 当前端角色，用于决定配色与助手名称
}

// 各端 AI 助手配色（统一走 token 体系：学生/教师用 primary/secondary，家长用 accent）
const accentByRole = {
  // 学生端配色：主色与次色渐变
  student: {
    gradient: 'from-primary-500 to-secondary-500',
    soft: 'from-primary-100 to-secondary-100',
    iconText: 'text-secondary-600',
    bg: 'from-primary-50 via-white to-secondary-50',
  },
  // 教师端配色：与学生端一致
  teacher: {
    gradient: 'from-primary-500 to-secondary-500',
    soft: 'from-primary-100 to-secondary-100',
    iconText: 'text-secondary-600',
    bg: 'from-primary-50 via-white to-secondary-50',
  },
  // 家长端配色：使用 accent 暖色系
  parent: {
    gradient: 'from-accent-400 to-accent-600',
    soft: 'from-accent-100 to-accent-200',
    iconText: 'text-accent-600',
    bg: 'from-accent-50 via-white to-accent-50',
  },
} as const;

// AI 助手名称（与原 Chat 页面一致）
const assistantNameByRole = {
  student: '小星', // 学生端 AI 助手
  teacher: '专业心理咨询助手', // 教师端 AI 助手
  parent: '大星', // 家长端 AI 助手
} as const;

/**
 * AI 对话功能被屏蔽时的占位页面组件
 *
 * 在功能开关 VITE_AI_CHAT_ENABLED !== 'true' 时由三端 Chat 页面渲染，
 * 防止用户通过 URL 直接访问聊天页。仍保留 Header。
 * 紧急帮助按钮已由 App.tsx 全局渲染，此处不再重复挂载。
 * @param props - 组件属性
 * @returns JSX 元素
 */
export function ChatDisabledPlaceholder({ role }: ChatDisabledPlaceholderProps) {
  // 根据角色取出配色与助手名称
  const accent = accentByRole[role];
  const assistantName = assistantNameByRole[role];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${accent.bg}`}>
      <Header role={role} />

      <main id="main" className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* 顶部渐变条（与原 Chat 页面头部风格一致） */}
          <div className={`bg-gradient-to-r ${accent.gradient} p-5 text-white`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{assistantName}</h2>
                <p className="text-sm text-white/80">AI心理咨询助手</p>
              </div>
            </div>
          </div>

          {/* 占位内容 */}
          <div className="flex flex-col items-center justify-center p-10 sm:p-16 text-center">
            <div className={`w-24 h-24 bg-gradient-to-br ${accent.soft} rounded-full flex items-center justify-center mb-6`}>
              <Clock className={`w-12 h-12 ${accent.iconText}`} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
              AI 对话功能暂未开放
            </h3>
            <p className="text-gray-500 max-w-md mb-2">
              {assistantName}正在精心筹备中，功能即将上线，敬请期待。
            </p>
            <p className="text-sm text-gray-400">
              如遇紧急情况，请点击右下角悬浮按钮获取心理危机援助热线。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
