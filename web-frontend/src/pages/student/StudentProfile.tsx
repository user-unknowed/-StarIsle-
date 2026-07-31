import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useMoodStore } from '../../store/moodStore';
import { Header } from '../../components/common/Header';
import { Modal, Button } from '../../components/ui';
import { assessmentApi } from '../../services/api';
import { User, Settings, Bell, BookOpen, Calendar, Edit3, Check, LogOut, Mail, Phone, Globe, ClipboardList, Loader2 } from 'lucide-react';

const menuItems = [
  { icon: Bell, label: '通知中心', badge: 3 },
  { icon: BookOpen, label: '使用记录' },
  { icon: Calendar, label: '打卡日历' },
  { icon: Settings, label: '系统设置' },
];

const settingsItems = [
  { icon: Bell, label: '消息通知', description: '接收系统通知和提醒' },
  { icon: Mail, label: '邮箱设置', description: '配置邮箱通知' },
  { icon: Globe, label: '语言设置', description: '简体中文' },
  { icon: Phone, label: '隐私设置', description: '管理数据隐私和权限' },
];

export default function StudentProfile() {
  const user = useAuthStore((state) => state.user);
  const moodHistory = useMoodStore((state) => state.moodHistory);
  const logout = useAuthStore((state) => state.logout);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState(user?.nickname || '');
  const [editedSignature, setEditedSignature] = useState(user?.signature || '');

  // 心理测评状态
  interface FetchedQuestion {
    id: string;
    text?: string;
    question?: string;
    options: string[];
  }
  interface FetchedResult {
    result_id?: string;
    id?: string;
    total_score?: number;
    score?: number;
    risk_level?: string;
    level?: string;
    description?: string;
    suggestion?: string;
    suggestions?: string[];
  }
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState('情绪探索');
  const [assessmentQuestions, setAssessmentQuestions] = useState<FetchedQuestion[]>([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({});
  const [assessmentResult, setAssessmentResult] = useState<FetchedResult | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessmentSource, setAssessmentSource] = useState<'api' | 'mock'>('mock');

  const startAssessment = async () => {
    setAssessmentOpen(true);
    setAssessmentLoading(true);
    setAssessmentError(null);
    setAssessmentResult(null);
    setAssessmentAnswers({});
    try {
      const data = (await assessmentApi.getQuestions('mood')) as unknown as {
        title?: string;
        questions?: FetchedQuestion[];
      };
      const qs = data.questions || [];
      if (qs.length) {
        setAssessmentQuestions(qs);
        setAssessmentTitle(data.title || '情绪探索');
        setAssessmentSource('api');
      } else {
        throw new Error('无题目');
      }
    } catch {
      // 降级到 mock 题目
      setAssessmentSource('mock');
      setAssessmentTitle('情绪探索（示例）');
      setAssessmentQuestions([
        { id: 'q1', text: '最近两周，你感到心情低落、沮丧或绝望的频率是？', options: ['完全没有', '有几天', '超过一半的时间', '几乎每天'] },
        { id: 'q2', text: '最近两周，你对平时感兴趣的事情失去兴趣的频率是？', options: ['完全没有', '有几天', '超过一半的时间', '几乎每天'] },
        { id: 'q3', text: '最近两周，你感到入睡困难或睡眠过多的频率是？', options: ['完全没有', '有几天', '超过一半的时间', '几乎每天'] },
      ]);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const submitAssessment = async () => {
    if (!user) return;
    const answered = assessmentQuestions.every((q) => assessmentAnswers[q.id] !== undefined);
    if (!answered) {
      setAssessmentError('请完成所有题目后再提交');
      return;
    }
    setAssessmentLoading(true);
    setAssessmentError(null);
    const answers = assessmentQuestions.map((q) => assessmentAnswers[q.id]);
    try {
      const submitRes = (await assessmentApi.submit({
        userId: user.id,
        type: 'mood',
        answers,
      })) as unknown as { result_id?: string };
      const resultId = submitRes.result_id;
      if (resultId) {
        const result = (await assessmentApi.getResult(resultId)) as unknown as FetchedResult;
        setAssessmentResult(result);
        setAssessmentSource('api');
      } else {
        throw new Error('未返回结果ID');
      }
    } catch {
      // 降级到 mock 结果
      setAssessmentSource('mock');
      const total = answers.reduce((a, b) => a + b, 0);
      const level = total <= 2 ? 'green' : total <= 5 ? 'yellow' : 'orange';
      setAssessmentResult({
        total_score: total,
        risk_level: level,
        description: '（示例结果）根据你的作答，大星为你生成了初步评估。',
        suggestions: ['继续每天的心情打卡', '试试呼吸练习保持放松', '和小星聊聊最近的感受'],
      });
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const totalCheckins = moodHistory.length;
  const averageMood = moodHistory.length > 0 
    ? (moodHistory.reduce((sum, m) => sum + m.moodLevel, 0) / moodHistory.length).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header role="student" />
      
      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 mb-8 text-white shadow-xl">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={editedNickname}
                    onChange={(e) => setEditedNickname(e.target.value)}
                    className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 mb-2 w-full"
                    placeholder="昵称"
                  />
                  <textarea
                    value={editedSignature}
                    onChange={(e) => setEditedSignature(e.target.value)}
                    className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 w-full"
                    placeholder="个性签名"
                    rows={2}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold">{user?.nickname}</h2>
                  <p className="text-indigo-200 mt-1">{user?.signature || '暂无个性签名'}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                {user?.ageGroup && <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{user.ageGroup}</span>}
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">学生</span>
              </div>
            </div>
            <button
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{totalCheckins}</p>
            <p className="text-sm text-gray-500 mt-1">总打卡次数</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{averageMood}</p>
            <p className="text-sm text-gray-500 mt-1">平均心情</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">5</p>
            <p className="text-sm text-gray-500 mt-1">连续打卡</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">快捷菜单</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="flex flex-col items-center p-4 rounded-xl hover:bg-purple-50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
                      <Icon className="w-6 h-6 text-purple-600" />
                    </div>
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">心理测评</h3>
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <ClipboardList className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">情绪探索测评</p>
              <p className="text-sm text-gray-500">了解最近的情绪状态，获取个性化建议</p>
            </div>
            <Button
              onClick={startAssessment}
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
              size="sm"
            >
              开始测评
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">设置</h3>
          <div className="space-y-3">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            logout();
          }}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>

        <Modal
          isOpen={assessmentOpen}
          onClose={() => !assessmentLoading && setAssessmentOpen(false)}
          title={assessmentTitle}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full ${assessmentSource === 'api' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {assessmentSource === 'api' ? 'API 数据' : '示例数据'}
              </span>
            </div>

            {assessmentLoading && (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                加载中...
              </div>
            )}

            {!assessmentLoading && !assessmentResult && (
              <>
                <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
                  {assessmentQuestions.map((q, idx) => (
                    <div key={q.id}>
                      <p className="font-medium text-gray-800 mb-2">
                        {idx + 1}. {q.text || q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <button
                            key={oi}
                            onClick={() => setAssessmentAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                            className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-all duration-fast ${
                              assessmentAnswers[q.id] === oi
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-700'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {assessmentError && (
                  <p className="text-sm text-danger-600">{assessmentError}</p>
                )}
                <Button
                  onClick={submitAssessment}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  提交测评
                </Button>
              </>
            )}

            {!assessmentLoading && assessmentResult && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">测评得分</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {assessmentResult.total_score ?? assessmentResult.score ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">风险等级</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      (assessmentResult.risk_level || assessmentResult.level) === 'green' ? 'bg-green-100 text-green-600' :
                      (assessmentResult.risk_level || assessmentResult.level) === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {(assessmentResult.risk_level || assessmentResult.level || 'green') === 'green' ? '正常' :
                       (assessmentResult.risk_level || assessmentResult.level) === 'yellow' ? '低风险' : '中风险'}
                    </span>
                  </div>
                </div>
                {assessmentResult.description && (
                  <p className="text-sm text-gray-600">{assessmentResult.description}</p>
                )}
                {assessmentResult.suggestions && assessmentResult.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">建议</p>
                    <ul className="space-y-1.5">
                      {assessmentResult.suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  onClick={() => setAssessmentOpen(false)}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  完成
                </Button>
              </div>
            )}
          </div>
        </Modal>
      </main>
    </div>
  );
}