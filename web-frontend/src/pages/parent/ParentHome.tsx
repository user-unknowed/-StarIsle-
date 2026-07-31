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
  LifeBuoy,
  ChevronDown,
  CheckCircle,
  Activity,
} from 'lucide-react';

const moodEmojis: Record<number, string> = {
  1: '😔',
  2: '😞',
  3: '😐',
  4: '😊',
  5: '😄',
};

const getMoodEmoji = (level: number | undefined) =>
  level ? moodEmojis[level] || '😐' : '❓';

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

type RangeKey = 7 | 30 | 90;

export default function ParentHome() {
  const navigate = useNavigate();
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

  const [range, setRange] = useState<RangeKey>(7);

  useEffect(() => {
    fetchChildren();
    fetchAlerts();
  }, [fetchChildren, fetchAlerts]);

  useEffect(() => {
    if (selectedChildId) {
      fetchChildMood(range);
    }
  }, [selectedChildId, range, fetchChildMood]);

  const selectedChild = children.find((c) => c.bindingId === selectedChildId);
  const currentMood = childMood[childMood.length - 1]?.moodLevel;
  const continuousDays = childMood.length;
  const activeAlert = emergencyAlerts.find((a) => !a.confirmed);
  const riskLevel = activeAlert?.level || 'green';

  const handleSelectChild = (bindingId: string) => {
    selectChild(bindingId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header role="parent" />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* 顶部孩子情绪状态卡片 */}
        <div className="bg-gradient-to-r from-[#F4A261] to-[#E76F51] rounded-3xl p-6 sm:p-8 mb-6 text-white shadow-xl">
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
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <CheckCircle className="w-10 h-10 mb-2 text-gray-300" />
              <p>暂无心情记录</p>
            </div>
          ) : (
            <div className="flex items-end justify-between h-40 gap-2">
              {childMood.slice(-Math.min(range, childMood.length)).map((record) => {
                const height = (record.moodLevel / 5) * 100;
                return (
                  <div key={record.id} className="flex-1 flex flex-col items-center min-w-0">
                    <div
                      className="w-full bg-gradient-to-t from-[#F4A261] to-[#F9C784] rounded-t-lg transition-all duration-fast"
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
            <p className="text-sm text-gray-500">
              {activeAlert ? `${activeAlert.reason.slice(0, 12)}...` : '暂无告警，点击查看'}
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
            onClick={() => navigate('/parent/emergency')}
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <LifeBuoy className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">应急资源</h3>
            <p className="text-sm text-gray-500">热线 · 医院 · 社区支持</p>
          </button>
        </div>
      </main>
    </div>
  );
}
