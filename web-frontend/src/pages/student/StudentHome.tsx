import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useMoodStore } from '../../store/moodStore';
import { Header } from '../../components/common/Header';
import { Calendar, TrendingUp, Award, Sparkles, Check } from 'lucide-react';
import { Button } from '../../components/ui';

const moodOptions = [
  { level: 1, emoji: '😔', label: '很低落', color: 'bg-red-100 text-red-600 border-red-200' },
  { level: 2, emoji: '😞', label: '有点低落', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { level: 3, emoji: '😐', label: '一般般', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
  { level: 4, emoji: '😊', label: '还不错', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { level: 5, emoji: '😄', label: '很开心', color: 'bg-green-100 text-green-600 border-green-200' },
];

const tagOptions = ['学习压力', '考试焦虑', '人际关系', '家庭', '睡眠', '身体不适', '其他'];

export default function StudentHome() {
  const user = useAuthStore((state) => state.user);
  const {
    moodHistory,
    selectedMood,
    checkinStatus,
    checkinMessage,
    fetchMoodHistory,
    checkinMood,
    selectMood,
  } = useMoodStore();
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMoodHistory(user.id);
    }
  }, [user, fetchMoodHistory]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleCheckin = async () => {
    if (selectedMood && user) {
      await checkinMood(user.id, selectedMood, selectedTags);
      setSelectedTags([]);
      setShowTags(false);
    }
  };

  const getMoodEmoji = (level: number) => {
    return moodOptions.find(m => m.level === level)?.emoji || '😐';
  };

  const today = new Date();
  const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][today.getDay()];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Header role="student" />
      
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-3xl p-6 sm:p-8 mb-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-primary-200 text-sm mb-1">{today.toLocaleDateString('zh-CN')} {dayOfWeek}</p>
              <h1 className="text-xl sm:text-2xl font-bold">你好，{user?.nickname}</h1>
              <p className="text-primary-200 mt-1">今天感觉怎么样？</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
        </div>

        <section className="bg-white rounded-3xl p-6 sm:p-8 mb-8 shadow-lg">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            今日心情
          </h2>
          
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
            {moodOptions.map((mood) => (
              <button
                key={mood.level}
                onClick={() => {
                  selectMood(mood.level);
                  setShowTags(true);
                }}
                className={`flex flex-col items-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-fast touch-target ${
                  selectedMood === mood.level
                    ? `${mood.color} border-current scale-110 shadow-lg`
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="text-3xl sm:text-4xl mb-2">{mood.emoji}</span>
                <span className="text-sm font-medium">{mood.label}</span>
              </button>
            ))}
          </div>

          {showTags && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">选择相关标签（可多选）：</p>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full text-sm transition-all duration-fast ${
                      selectedTags.includes(tag)
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {checkinStatus === 'success' && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-2 text-success-700">
              <Check className="w-5 h-5" />
              {checkinMessage}
            </div>
          )}

          <Button
            onClick={handleCheckin}
            disabled={!selectedMood || checkinStatus === 'checking'}
            size="lg"
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700"
          >
            {checkinStatus === 'checking' ? '提交中...' : '记录心情'}
          </Button>
        </section>

        <section className="bg-white rounded-3xl p-6 sm:p-8 mb-8 shadow-lg">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            心情趋势
          </h2>
          
          <div className="flex items-end justify-between h-32 gap-2">
            {moodHistory.slice(-7).map((record, index) => {
              const height = (record.moodLevel / 5) * 100;
              return (
                <div key={record.id} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-primary-400 to-secondary-500 rounded-t-lg transition-all duration-fast"
                    style={{ height: `${height}%`, minHeight: '8px' }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{record.checkinDate.split('-').slice(1).join('/')}</span>
                  <span className="text-lg mt-1">{getMoodEmoji(record.moodLevel)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">连续打卡</p>
                <p className="text-2xl font-bold text-gray-800">5天</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">本周心情</p>
                <p className="text-2xl font-bold text-gray-800">😊</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}