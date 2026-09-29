/**
 * @file StudentKnowledge.tsx
 * @description 学生端知识库页：心理文章搜索、量表测评，与 App 端知识库功能对齐
 * @module web-frontend/pages/student
 */
import { useState } from 'react';
import { Header } from '../../components/common/Header';
import { knowledgeApi, assessmentApi } from '../../services/api';
import { Search, BookOpen, ClipboardList, Loader2, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui';
import { Modal } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

/** 知识库搜索结果项 */
interface KnowledgeResult {
  title: string;
  source: string;
  category: string;
  content_preview: string;
  techniques: string[];
  score: number;
}

/** 测评题目（兼容 text/question 字段） */
interface AssessmentQuestion {
  id: string;
  text?: string;
  question?: string;
  options: string[];
}

/** 测评结果 */
interface AssessmentResultData {
  total_score?: number;
  score?: number;
  risk_level?: string;
  level?: string;
  description?: string;
  suggestion?: string;
  suggestions?: string[];
}

// 内置测评量表列表（与 App 端保持一致）
const assessmentList = [
  { type: 'mood', title: '情绪探索', desc: '了解最近的情绪状态' },
  { type: 'phq9', title: 'PHQ-9 抑郁筛查', desc: '9 题快速抑郁自评' },
  { type: 'gad7', title: 'GAD-7 焦虑筛查', desc: '7 题焦虑程度评估' },
  { type: 'stress', title: '压力知觉量表', desc: '评估近期压力水平' },
];

// 热门搜索关键词
const hotKeywords = ['考前焦虑', '人际关系', '睡眠改善', '情绪调节', '自我接纳', '学习压力'];

// Mock 文章数据（API 不可用时降级展示）
const mockArticles: KnowledgeResult[] = [
  {
    title: '如何缓解考前焦虑',
    source: '心理健康科普',
    category: '焦虑',
    content_preview: '考前焦虑是学生常见的心理困扰。本文介绍了腹式呼吸、积极自我暗示、合理作息等多种实用方法……',
    techniques: ['腹式呼吸', '认知重构'],
    score: 0.92,
  },
  {
    title: '改善人际关系的五个技巧',
    source: '心理成长手册',
    category: '人际关系',
    content_preview: '良好的人际关系是心理健康的重要支柱。学会倾听、表达感受、设定边界，能让你的社交更加轻松……',
    techniques: ['主动倾听', '非暴力沟通'],
    score: 0.88,
  },
  {
    title: '睡眠不好？试试这些方法',
    source: '健康生活指南',
    category: '睡眠',
    content_preview: '睡眠质量直接影响情绪和学习效率。建立规律作息、营造睡眠环境、避免睡前使用电子设备……',
    techniques: ['睡眠卫生', '渐进式放松'],
    score: 0.85,
  },
];

/**
 * 学生端知识库组件
 * @returns JSX 元素
 */
export default function StudentKnowledge() {
  const toast = useToast();

  // ====== 文章搜索 ======
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchSource, setSearchSource] = useState<'api' | 'mock'>('mock');

  /**
   * 执行知识库搜索：调用 API，失败时降级到 mock 数据
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.info('请输入搜索关键词');
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const data = (await knowledgeApi.search(searchQuery, undefined, 10)) as unknown as {
        results?: KnowledgeResult[];
      };
      const results = data.results || [];
      if (results.length > 0) {
        setSearchResults(results);
        setSearchSource('api');
      } else {
        // API 返回空，使用 mock 匹配
        setSearchResults(mockArticles.filter((a) =>
          a.title.includes(searchQuery) || a.content_preview.includes(searchQuery)
        ));
        setSearchSource('mock');
      }
    } catch {
      // 降级到 mock
      setSearchResults(mockArticles.filter((a) =>
        a.title.includes(searchQuery) || a.content_preview.includes(searchQuery) || a.category.includes(searchQuery)
      ));
      setSearchSource('mock');
    } finally {
      setSearching(false);
    }
  };

  // ====== 量表测评 ======
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState('mood');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AssessmentResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'api' | 'mock'>('mock');

  /**
   * 打开指定量表并加载题目
   */
  const startAssessment = async (type: string, title: string) => {
    setAssessmentType(type);
    setAssessmentTitle(title);
    setAssessmentOpen(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    try {
      const data = (await assessmentApi.getQuestions(type)) as unknown as {
        title?: string;
        questions?: AssessmentQuestion[];
      };
      const qs = data.questions || [];
      if (qs.length > 0) {
        setQuestions(qs);
        setSource('api');
      } else {
        throw new Error('无题目');
      }
    } catch {
      // 降级 mock 题目
      setSource('mock');
      setQuestions([
        { id: 'q1', text: '最近两周，你感到心情低落、沮丧或绝望的频率是？', options: ['完全没有', '有几天', '超过一半的时间', '几乎每天'] },
        { id: 'q2', text: '最近两周，你对平时感兴趣的事情失去兴趣的频率是？', options: ['完全没有', '有几天', '超过一半的时间', '几乎每天'] },
        { id: 'q3', text: '最近两周，你感到入睡困难或睡眠过多的频率是？', options: ['完全没有', '有几天', '超过一半的时间', '几乎每天'] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 提交测评答案并展示结果
   */
  const submitAssessment = async () => {
    const allAnswered = questions.every((q) => answers[q.id] !== undefined);
    if (!allAnswered) {
      setError('请完成所有题目后再提交');
      return;
    }
    setLoading(true);
    setError(null);
    const ansArr = questions.map((q) => answers[q.id]);
    try {
      const submitRes = (await assessmentApi.submit({
        userId: 'student',
        type: assessmentType,
        answers: ansArr,
      })) as unknown as { result_id?: string };
      const resultId = submitRes.result_id;
      if (resultId) {
        const res = (await assessmentApi.getResult(resultId)) as unknown as AssessmentResultData;
        setResult(res);
        setSource('api');
      } else {
        throw new Error('无结果ID');
      }
    } catch {
      // 降级 mock 结果
      setSource('mock');
      const total = ansArr.reduce((a, b) => a + b, 0);
      const level = total <= 2 ? 'green' : total <= 4 ? 'yellow' : total <= 6 ? 'orange' : 'red';
      setResult({
        total_score: total,
        risk_level: level,
        description: '（示例结果）根据你的作答，为你生成了初步评估。',
        suggestions: ['继续每天的心情打卡', '试试呼吸练习保持放松', '必要时寻求专业帮助'],
      });
    } finally {
      setLoading(false);
    }
  };

  const levelLabel = (lv?: string) => {
    switch (lv) {
      case 'green': return '正常';
      case 'yellow': return '低风险';
      case 'orange': return '中风险';
      case 'red': return '高风险';
      default: return '正常';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Header role="student" />

      <main id="main" className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary-600" />
            知识库
          </h1>
          <p className="text-gray-500 mt-2">探索心理科普文章，完成专业量表测评</p>
        </div>

        {/* ====== 搜索区 ====== */}
        <section className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索心理知识，如：考前焦虑、人际关系..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="bg-gradient-to-r from-primary-500 to-secondary-600 px-6"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              搜索
            </Button>
          </div>

          {/* 热门关键词 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 py-1">热门：</span>
            {hotKeywords.map((kw) => (
              <button
                key={kw}
                onClick={() => { setSearchQuery(kw); }}
                className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm hover:bg-primary-100 transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </section>

        {/* ====== 搜索结果 ====== */}
        {hasSearched && (
          <section className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                搜索结果 <span className="text-sm font-normal text-gray-500">({searchResults.length})</span>
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${searchSource === 'api' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {searchSource === 'api' ? 'API 数据' : '示例数据'}
              </span>
            </div>

            {searching ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> 搜索中...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <AlertCircle className="w-10 h-10 mb-3" />
                <p>未找到相关内容，换个关键词试试</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((article, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-gray-50 rounded-2xl hover:bg-primary-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.content_preview}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="px-2 py-0.5 bg-white text-gray-500 rounded text-xs">{article.category}</span>
                          {article.techniques?.map((t) => (
                            <span key={t} className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded text-xs">{t}</span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ====== 量表测评 ====== */}
        <section className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" />
            心理量表
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assessmentList.map((a) => (
              <div
                key={a.type}
                className="p-5 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <ClipboardList className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{a.title}</p>
                  <p className="text-sm text-gray-500 truncate">{a.desc}</p>
                </div>
                <Button
                  onClick={() => startAssessment(a.type, a.title)}
                  size="sm"
                  className="bg-gradient-to-r from-primary-500 to-secondary-600 flex-shrink-0"
                >
                  开始
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 科普推荐 ====== */}
        {!hasSearched && (
          <section className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              精选文章
            </h2>
            <div className="space-y-4">
              {mockArticles.map((article, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-gray-50 rounded-2xl hover:bg-primary-50 transition-colors cursor-pointer group"
                >
                  <h3 className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors">{article.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.content_preview}</p>
                  <div className="flex gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-white text-gray-500 rounded text-xs">{article.category}</span>
                    {article.techniques?.map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 测评弹窗 */}
      <Modal isOpen={assessmentOpen} onClose={() => !loading && setAssessmentOpen(false)} title={assessmentTitle} size="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-0.5 rounded-full ${source === 'api' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              {source === 'api' ? 'API 数据' : '示例数据'}
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
            </div>
          )}

          {!loading && !result && (
            <>
              <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.id}>
                    <p className="font-medium text-gray-800 mb-2">{idx + 1}. {q.text || q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <button
                          key={oi}
                          role="radio"
                          aria-checked={answers[q.id] === oi}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                          className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-all ${
                            answers[q.id] === oi
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-primary-200 text-gray-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-danger-600">{error}</p>}
              <Button onClick={submitAssessment} className="w-full bg-gradient-to-r from-primary-500 to-secondary-600">
                提交测评
              </Button>
            </>
          )}

          {!loading && result && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">测评得分</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {result.total_score ?? result.score ?? 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">风险等级</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    (result.risk_level || result.level) === 'green' ? 'bg-green-100 text-green-600' :
                    (result.risk_level || result.level) === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                    (result.risk_level || result.level) === 'red' ? 'bg-red-100 text-red-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {levelLabel(result.risk_level || result.level)}
                  </span>
                </div>
              </div>
              {result.description && <p className="text-sm text-gray-600">{result.description}</p>}
              {result.suggestions && result.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">建议</p>
                  <ul className="space-y-1.5">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button onClick={() => setAssessmentOpen(false)} className="w-full bg-gradient-to-r from-primary-500 to-secondary-600">
                完成
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
