import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentStore } from '../../store/parentStore';
import { ArrowLeft, TrendingUp, Calendar, Tag, Sparkles, ChevronRight } from 'lucide-react';

export default function MoodDetail() {
  const navigate = useNavigate();
  const { moodTrend, moodSummary, fetchMoodTrend, fetchMoodSummary, children, currentChildId } = useParentStore();
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('7');

  useEffect(() => {
    const currentChild = children.find(c => c.id === currentChildId);
    if (currentChild) {
      fetchMoodTrend(currentChild.studentId, parseInt(timeRange));
      fetchMoodSummary(currentChild.studentId);
    }
  }, [currentChildId, children, timeRange, fetchMoodTrend, fetchMoodSummary]);

  const currentChild = children.find(c => c.id === currentChildId);

  const getMoodColor = (level: number) => {
    if (level <= 2) return 'bg-red-400';
    if (level <= 3) return 'bg-yellow-400';
    if (level <= 4) return 'bg-blue-400';
    return 'bg-green-400';
  };

  const getMoodEmoji = (level: number) => {
    if (level <= 1) return '😔';
    if (level <= 2) return '😞';
    if (level <= 3) return '😐';
    if (level <= 4) return '😊';
    return '😄';
  };

  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    const daysCount = parseInt(timeRange);
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const moodData = moodTrend.find(m => m.date === dateStr);
      days.push({ 
        date: dateStr, 
        moodLevel: moodData?.moodLevel,
        tags: moodData?.tags || [],
        day: date.getDate(), 
        weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
      });
    }
    return days;
  };

  const maxMood = Math.max(...moodTrend.map(m => m.moodLevel));
  const minMood = Math.min(...moodTrend.map(m => m.moodLevel));
  const moodRange = maxMood - minMood || 1;

  const tagDistribution = moodSummary?.tagDistribution || {};
  const tags = Object.entries(tagDistribution);
  const maxTagCount = Math.max(...tags.map(([, count]) => count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/parent')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800">情绪趋势详情</h1>
              <p className="text-xs text-gray-500">{currentChild?.studentNickname}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              情绪趋势
            </h2>
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button 
                onClick={() => setTimeRange('7')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${timeRange === '7' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                7天
              </button>
              <button 
                onClick={() => setTimeRange('30')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${timeRange === '30' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                30天
              </button>
              <button 
                onClick={() => setTimeRange('90')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${timeRange === '90' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                90天
              </button>
            </div>
          </div>

          <div className="relative h-48">
            <div className="absolute inset-0 flex items-end justify-between gap-1">
              {moodTrend.map((item, index) => {
                const height = moodRange > 0 
                  ? ((item.moodLevel - minMood) / moodRange) * 80 + 20 
                  : 50;
                const date = new Date(item.date);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ${getMoodColor(item.moodLevel)}`}
                      style={{ height: `${height}%` }}
                    />
                    {index % 5 === 0 && (
                      <span className="text-xs text-gray-400 mt-1">{date.getMonth() + 1}/{date.getDate()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {moodSummary && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
              <p className="text-gray-700">{moodSummary.description}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" />
            情绪标签分布
          </h2>
          
          {tags.length > 0 ? (
            <div className="space-y-3">
              {tags.map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-gray-600">{tag}</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${(count / maxTagCount) * 100}%` }}
                    >
                      <span className="text-white text-sm font-medium">{count}次</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无标签数据
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            打卡日历
          </h2>
          
          <div className="grid grid-cols-7 gap-2">
            {generateCalendarDays().map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                {index % 7 === 0 && <span className="text-xs text-gray-400 mb-1">{day.weekday}</span>}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  day.moodLevel 
                    ? getMoodColor(day.moodLevel) + ' text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {day.moodLevel ? getMoodEmoji(day.moodLevel) : day.day}
                </div>
              </div>
            ))}
          </div>
        </div>

        {moodSummary && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-1">AI 关怀建议</h3>
                <p className="text-sm text-indigo-100 leading-relaxed">{moodSummary.aiSuggestion}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <button 
            onClick={() => navigate('/parent')}
            className="flex flex-col items-center gap-1 p-2 text-indigo-600"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button 
            onClick={() => navigate('/parent/chat')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs font-medium">聊一聊</span>
          </button>
          <button 
            onClick={() => navigate('/parent/profile')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs font-medium">我的</span>
          </button>
        </div>
      </nav>

      <div className="h-20"></div>
    </div>
  );
}
