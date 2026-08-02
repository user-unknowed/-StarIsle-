import { Header } from './Header';
import { EmergencyHelpButton } from './EmergencyHelpButton';
import { Sparkles, Clock } from 'lucide-react';

interface ChatDisabledPlaceholderProps {
  role: 'student' | 'teacher' | 'parent';
}

// 各端 AI 助手配色（与原 Chat 页面头部一致）
const accentByRole = {
  student: {
    gradient: 'from-indigo-600 to-purple-600',
    soft: 'from-indigo-100 to-purple-100',
    iconText: 'text-purple-600',
  },
  teacher: {
    gradient: 'from-indigo-600 to-purple-600',
    soft: 'from-indigo-100 to-purple-100',
    iconText: 'text-purple-600',
  },
  parent: {
    gradient: 'from-[#F4A261] to-[#E76F51]',
    soft: 'from-orange-100 to-red-100',
    iconText: 'text-orange-600',
  },
} as const;

// AI 助手名称（与原 Chat 页面一致）
const assistantNameByRole = {
  student: '小星',
  teacher: '专业心理咨询助手',
  parent: '大星',
} as const;

/**
 * AI 对话功能被屏蔽时的占位页面。
 *
 * 在功能开关 VITE_AI_CHAT_ENABLED !== 'true' 时由三端 Chat 页面渲染，
 * 防止用户通过 URL 直接访问聊天页。仍保留 Header 与紧急帮助按钮，
 * 保证布局一致与危机帮助通道可用。
 */
export function ChatDisabledPlaceholder({ role }: ChatDisabledPlaceholderProps) {
  const accent = accentByRole[role];
  const assistantName = assistantNameByRole[role];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header role={role} />
      <EmergencyHelpButton />

      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
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
