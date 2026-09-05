/**
 * @file ParentHome.tsx
 * @description 家长端首页，展示孩子情绪状态、趋势图、风险等级及紧急告警/AI 顾问/孩子管理入口
 * @module web-frontend/pages/parent
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentStore } from '../../store/parentStore';
import { Header } from '../../components/common/Header';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Sparkles,
  Siren,
  ChevronDown,
  CheckCircle,
  Activity,
  Users,
} from 'lucide-react';

// 心情等级到 emoji 的映射表（1~5 级，越高级越正向）
const moodEmojis: Record<number, string> = {
  1: '😔',
  2: '😞',
  3: '😐',
  4: '😊',
  5: '😄',
};

/**
 * 根据心情等级返回对应 emoji
 * @param level - 心情等级（1~5），未打卡时为 undefined
 * @returns 对应 emoji，未打卡返回问号
 */
const getMoodEmoji = (level: number | undefined) =>
  level ? moodEmojis[level] || '😐' : '❓';

/**
 * 根据风险等级返回对应 Tailwind 类名（背景/文字/边框配色）
 * @param level - 风险等级：red/orange/yellow/green
 * @returns Tailwind 类名字符串
 */
const getRiskColor = (level: string | undefined) => {
  switch (level) {
    case 'red':
      return 'bg-red-100 text-red-600 border-red-200';
    case 'orange':
      return 'bg-orange-100 text-orange-600 border-orange-200';
    case 'yellow':
      return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    default:
      return 'bg-green-100 text-green-600 border-green-200';
  }
};

/**
 * 根据风险等级返回中文标签
 * @param level - 风险等级
 * @returns 高风险/中风险/低风险/正常
 */
const getRiskLabel = (level: string | undefined) => {
  switch (level) {
    case 'red':
      return '高风险';
    case 'orange':
      return '中风险';
    case 'yellow':
      return '低风险';
    default:
      return '正常';
  }
};

// 趋势图时间范围类型：7天/30天/90天
type RangeKey = 7 | 30 | 90;

/**
 * 家长端首页组件
 * @returns JSX 元素
 */
export default function ParentHome() {
  // 路由跳转
  const navigate = useNavigate();
  // 从家长 store 取出孩子列表、当前孩子、心情记录、告警、加载/错误状态及各 action
  const {
    children,
    selectedChildId,
    childMood,
    emergencyAlerts,
    isLoading,
    error,
    isUsingMockData,
    fetchChildren,
    selectChild,
    fetchChildMood,
    fetchAlerts,
  } = useParentStore();

  // 趋势图当前查看的时间范围
  const [range, setRange] = useState<RangeKey>(7);

  // 进入页面即拉取孩子列表与紧急告警
  useEffect(() => {
    fetchChildren();
    fetchAlerts();
  }, [fetchChildren, fetchAlerts]);

  // 当选中的孩子或时间范围变化时，拉取对应心情记录
  useEffect(() => {
    if (selectedChildId) {
      fetchChildMood(range);
    }
  }, [selectedChildId, range, fetchChildMood]);

  // 当前选中的孩子对象
  const selectedChild = children.find((c) => c.bindingId === selectedChildId);
  // 最近一次心情等级
  const currentMood = childMood[childMood.length - 1]?.moodLevel;
  // 连续打卡天数（即心情记录条数）
  const continuousDays = childMood.length;
  // 第一条未确认告警作为活跃告警
  const activeAlert = emergencyAlerts.find((a) => !a.confirmed);
  // 风险等级：取活跃告警等级，无则默认正常
  const riskLevel = activeAlert?.level || 'green';

  /**
   * 选择某个孩子作为当前查看对象
   * @param bindingId - 绑定关系 ID
   */
  const handleSelectChild = (bindingId: string) => {
    selectChild(bindingId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header role="parent" />

      <main id="main" className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* 顶部孩子情绪状态卡片 */}
        <div className="bg-gradient-to-r from-accent-400 to-accent-600 rounded-3xl p-6 sm:p-8 mb-6 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4" />
                <p className="text-orange-100 text-sm">孩子情绪状态</p>
              </div>
              {/* 孩子选择器 */}
              <div className="relative inline-block">
                <select
                  value={selectedChildId || ''}
                  onChange={(e) => handleSelectChild(e.target.value)}
                  className="appearance-none bg-white/20 backdrop-blur text-white font-bold text-xl sm:text-2xl rounded-xl px-4 py-2 pr-10 outline-none cursor-pointer border border-white/30"
                >
                  {children.length === 0 && <option value="">暂无孩子</option>}
                  {children.map((c) => (
                    <option key={c.bindingId} value={c.bindingId} className="text-gray-800">
                      {c.studentNickname}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
              </div>
              <p className="text-orange-100 mt-2">
                {selectedChild
                  ? `当前心情 ${getMoodEmoji(currentMood)} · 关注孩子每一天`
                  : '请先绑定孩子以查看状态'}
              </p>
              {isUsingMockData && (
                <p className="text-orange-200 text-xs mt-1">（后端未连接，展示示例数据）</p>
              )}
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">
              {getMoodEmoji(currentMood)}
            </div>
          </div>
        </div>

        {/* 三项核心指标 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">当前心情</p>
                <p className="text-2xl font-bold text-gray-800">
                  {getMoodEmoji(currentMood)}{' '}
                  <span className="text-base font-normal text-gray-500">
                    {currentMood ? `${currentMood}/5` : '未打卡'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">连续打卡</p>
                <p className="text-2xl font-bold text-gray-800">{continuousDays}天</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-5 shadow-lg border-2 ${getRiskColor(riskLevel)}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">风险等级</p>
                <p className="text-2xl font-bold">{getRiskLabel(riskLevel)}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
            {error}
          </div>
        )}

        {/* 情绪趋势图 */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              情绪趋势
            </h2>
            <div className="flex bg-orange-50 rounded-xl p-1">
              {([7, 30, 90] as RangeKey[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-fast ${
                    range === r
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r}天
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-400">加载中...</div>
          ) : childMood.length === 0 ? (
            // 无心情记录的空状态
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <CheckCircle className="w-10 h-10 mb-2 text-gray-300" />
              <p>暂无心情记录</p>
            </div>
          ) : (
            // 柱状图：按心情等级映射高度
            <div className="flex items-end justify-between h-40 gap-2">
              {childMood.slice(-Math.min(range, childMood.length)).map((record) => {
                // 柱高 = 心情等级 / 5 * 100%
                const height = (record.moodLevel / 5) * 100;
                return (
                  <div key={record.id} className="flex-1 flex flex-col items-center min-w-0">
                    <div
                      className="w-full bg-gradient-to-t from-accent-400 to-accent-300 rounded-t-lg transition-all duration-fast"
                      style={{ height: `${height}%`, minHeight: '8px' }}
                    />
                    <span className="text-xs text-gray-500 mt-2 truncate">
                      {record.checkinDate.split('-').slice(1).join('/')}
                    </span>
                    <span className="text-lg mt-1">{getMoodEmoji(record.moodLevel)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 底部入口卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/parent/emergency')}
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Siren className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">紧急告警</h3>
            <p className="text-sm text-gray-500 truncate" title={activeAlert?.reason}>
              {activeAlert ? activeAlert.reason : '暂无告警，点击查看'}
            </p>
            {activeAlert && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">
                待确认
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/parent/chat')}
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">AI心理顾问</h3>
            <p className="text-sm text-gray-500">与「大星」聊聊孩子的近况</p>
          </button>

          <button
            onClick={() => navigate('/parent/children')}
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">我的孩子</h3>
            <p className="text-sm text-gray-500">管理绑定与数据授权</p>
          </button>
        </div>
      </main>
    </div>
  );
}
