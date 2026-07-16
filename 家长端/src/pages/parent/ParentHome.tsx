import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useParentStore } from '../../store/parentStore';
import { Heart, MessageCircle, BookOpen, TrendingUp, AlertTriangle, Clock, ChevronRight, User, Sparkles } from 'lucide-react';

const getRiskColor = (level: string | undefined) => {
  switch (level) {
    case 'red': return 'bg-red-500';
    case 'orange': return 'bg-orange-500';
    case 'yellow': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
};

const getRiskLabel = (level: string | undefined) => {
  switch (level) {
    case 'red': return '紧急';
    case 'orange': return '需关注';
    case 'yellow': return '注意';
    default: return '正常';
  }
};

const getRiskBgColor = (level: string | undefined) => {
  switch (level) {
    case 'red': return 'bg-red-50 border-red-200';
    case 'orange': return 'bg-orange-50 border-orange-200';
    default: return 'bg-green-50 border-green-200';
  }
};

const getRiskTextColor = (level: string | undefined) => {
  switch (level) {
    case 'red': return 'text-red-600';
    case 'orange': return 'text-orange-600';
    default: return 'text-green-600';
  }
};

const getMoodEmoji = (level: number | undefined) => {
  if (!level) return '❓';
  if (level <= 1) return '😔';
  if (level <= 2) return '😞';
  if (level <= 3) return '😐';
  if (level <= 4) return '😊';
  return '😄';
};

const getMoodLabel = (level: number | undefined) => {
  if (!level) return '未知';
  if (level <= 1) return '很糟';
  if (level <= 2) return '不太好';
  if (level <= 3) return '一般般';
  if (level <= 4) return '还不错';
  return '很开心';
};

export default function ParentHome() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { 
    children, 
    currentChildId, 
    moodTrend, 
    moodSummary, 
    knowledgeArticles,
    fetchChildren, 
    fetchMoodTrend, 
    fetchMoodSummary, 
    isLoading 
  } = useParentStore();

  useEffect(() => {
    if (user?.id) {
      fetchChildren(user.id);
    }
  }, [user?.id, fetchChildren]);

  useEffect(() => {
    const currentChild = children.find(c => c.id === currentChildId);
    if (currentChild) {
      fetchMoodTrend(currentChild.studentId, 7);
      fetchMoodSummary(currentChild.studentId);
    }
  }, [currentChildId, children, fetchMoodTrend, fetchMoodSummary]);

  const currentChild = children.find(c => c.id === currentChildId);

  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const isCheckedIn = moodSummary?.checkinCalendar.includes(dateStr);
      days.push({ date: dateStr, isCheckedIn, day: date.getDate(), weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()] });
    }
    return days;
  };

  const maxMood = Math.max(...moodTrend.map(m => m.moodLevel));
  const minMood = Math.min(...moodTrend.map(m => m.moodLevel));
  const moodRange = maxMood - minMood || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.nickname?.[0] || 'P'}
              </div>
              <div>
                <p className="font-bold text-gray-800">{user?.nickname}</p>
                <p className="text-xs text-gray-500">家长端</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-500">我的孩子</h2>
            <button className="text-indigo-600 text-sm font-medium flex items-center gap-1">
              管理 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {currentChild ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl">
                  {currentChild.studentNickname?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-gray-800">{currentChild.studentNickname}</span>
                    <div className={`w-3 h-3 rounded-full ${getRiskColor(currentChild.riskLevel)} animate-pulse`}></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      最新心情：{getMoodEmoji(currentChild.latestMood)} {getMoodLabel(currentChild.latestMood)}
                    </span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBgColor(currentChild.riskLevel)} ${getRiskTextColor(currentChild.riskLevel)}`}>
                  {getRiskLabel(currentChild.riskLevel)}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {currentChild.authorized ? (
                    <>
                      <Heart className="w-4 h-4 text-green-500" />
                      <span>已授权查看情绪状态</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 text-gray-400" />
                      <span>等待孩子授权</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-gray-400">绑定于 {new Date(currentChild.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">还没有绑定孩子</p>
              <button 
                onClick={() => navigate('/parent/profile')}
                className="mt-3 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-200 transition-colors"
              >
                去绑定
              </button>
            </div>
          )}
        </div>

        {currentChild?.authorized && moodSummary && (
          <>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  情绪概览
                </h2>
                <button 
                  onClick={() => navigate('/parent/mood-detail')}
                  className="text-indigo-600 text-sm font-medium flex items-center gap-1"
                >
                  查看详情 <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">{moodSummary.description}</p>
              </div>

              <div className="relative h-32 mb-4">
                <div className="absolute inset-0 flex items-end justify-between gap-2">
                  {moodTrend.map((item, index) => {
                    const height = moodRange > 0 
                      ? ((item.moodLevel - minMood) / moodRange) * 80 + 20 
                      : 50;
                    const date = new Date(item.date);
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            item.moodLevel <= 2 ? 'bg-red-400' :
                            item.moodLevel <= 3 ? 'bg-yellow-400' :
                            item.moodLevel <= 4 ? 'bg-blue-400' : 'bg-green-400'
                          }`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-gray-400 mt-1">{date.getDate()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>最近打卡：{currentChild.lastCheckinDate === new Date().toISOString().split('T')[0] ? '今天' : currentChild.lastCheckinDate}</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-600">
                  <span>7天趋势</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-3">打卡日历</h2>
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((day, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 mb-1">{day.weekday}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      day.isCheckedIn 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {day.day}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
          </>
        )}

        {!currentChild?.authorized && (
          <div className="bg-yellow-50 rounded-3xl p-5 border border-yellow-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-yellow-800 mb-1">孩子还未授权</h3>
                <p className="text-sm text-yellow-700 mb-3">您可以在家庭中与孩子沟通后开启情绪状态查看权限。</p>
                <button 
                  onClick={() => navigate('/parent/chat')}
                  className="px-4 py-2 bg-yellow-200 text-yellow-800 rounded-xl text-sm font-medium hover:bg-yellow-300 transition-colors"
                >
                  如何跟孩子聊这件事
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/parent/chat')}
            className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-gray-700 text-center">跟大星聊聊</p>
          </button>
          
          <button 
            onClick={() => navigate('/parent/mood-detail')}
            className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-700 text-center">情绪趋势</p>
          </button>
          
          <button 
            onClick={() => navigate('/parent/profile#knowledge')}
            className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-gray-700 text-center">知识库</p>
          </button>
        </div>

        {knowledgeArticles.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">推荐阅读</h2>
              <button className="text-indigo-600 text-sm font-medium">查看全部</button>
            </div>
            <div className="space-y-3">
              {knowledgeArticles.slice(0, 2).map((article) => (
                <div 
                  key={article.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-400">{article.readTime}分钟阅读</span>
                  </div>
                  <h3 className="font-medium text-gray-800">{article.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
                </div>
              ))}
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
            <Heart className="w-6 h-6" />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button 
            onClick={() => navigate('/parent/chat')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-medium">聊一聊</span>
          </button>
          <button 
            onClick={() => navigate('/parent/profile')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">我的</span>
          </button>
        </div>
      </nav>

      <div className="h-20"></div>
    </div>
  );
}